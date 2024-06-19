import { ThemeProvider } from '@emotion/react';
import { createTheme, PaletteMode, styled, ThemeOptions, useTheme } from '@mui/material';
import { amber, grey, deepPurple } from '@mui/material/colors';
import { MaterialDesignContent } from 'notistack';
import { createContext, useMemo, useState } from 'react';

const WHITE_HEX = '#fff';
const BLACK_HEX = '#000';

const DEFAULT_COLOR_MODE: PaletteMode = 'dark';

const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      ...(mode === 'dark'
        ? {
            ...amber,
            main: DARK_MODE_MAIN,
          }
        : {
            ...deepPurple,
            main: LIGHT_MODE_MAIN,
          }),
    },
    ...(mode === 'dark' && {
      background: {
        default: grey[900],
        paper: grey[900],
      },
    }),
    text: {
      ...(mode === 'light'
        ? {
            primary: grey[900],
            secondary: grey[800],
          }
        : {
            primary: grey[50],
            secondary: grey[500],
          }),
    },
  },
});

interface ColorModeProps {
  children: JSX.Element;
}

export const DARK_MODE_MAIN = amber[300];
export const LIGHT_MODE_MAIN = deepPurple[300];

export const colorModeContext = createContext({ toggleColorMode: () => {} });

export const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => {
  const theme = useTheme();

  const notistackSuccess = '&.notistack-MuiContent-success';
  const notistackError = '&.notistack-MuiContent-error';

  return {
    [notistackSuccess]: {
      backgroundColor: theme.palette.mode === 'dark' ? BLACK_HEX : WHITE_HEX,
      color: '#3cf057',
    },
    [notistackError]: {
      backgroundColor: theme.palette.mode === 'dark' ? BLACK_HEX : WHITE_HEX,
      color: '#d32f2f',
    },
  };
});

/* eslint-disable-next-line @typescript-eslint/naming-convention */
export function ColorMode({ children }: ColorModeProps): JSX.Element {
  const [mode, setMode] = useState<'light' | 'dark'>(DEFAULT_COLOR_MODE);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: (): void => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    []
  );

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <colorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}> {children}</ThemeProvider>
    </colorModeContext.Provider>
  );
}