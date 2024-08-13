import React from 'react';
import { SnackbarProvider } from 'notistack';
import { POPUP_MAX_AMOUNT, POPUP_AUTO_CLOSE_MS } from './utils/constants';
import { App } from './app';
import { ColorMode, StyledMaterialDesignContent } from './components';

export const WrappedApp: React.FC = () => {
  return (
    <ColorMode>
      <SnackbarProvider
        Components={{
          success: StyledMaterialDesignContent,
          error: StyledMaterialDesignContent,
        }}
        maxSnack={POPUP_MAX_AMOUNT}
        autoHideDuration={POPUP_AUTO_CLOSE_MS}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <App />
      </SnackbarProvider>
    </ColorMode>
  );
};
