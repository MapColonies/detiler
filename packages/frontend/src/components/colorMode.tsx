import { ThemeProvider } from '@emotion/react';
import { createTheme, PaletteMode, ThemeOptions } from '@mui/material';
import { amber, grey, deepPurple } from '@mui/material/colors';
import { createContext, useMemo, useState } from 'react';

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

export const toastStyle = (colorMode: PaletteMode): { color: string; backgroundColor: string } => {
  return colorMode === 'dark' ? { color: '#fff', backgroundColor: '#000' } : { color: '#000', backgroundColor: '#fff' };
};

export const colorModeContext = createContext({ toggleColorMode: () => {} });

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
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </colorModeContext.Provider>
  );
}
