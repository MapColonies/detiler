import { TileDetails } from '@map-colonies/detiler-common';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import FileCopy from '@mui/icons-material/FileCopy';
import Drawer from '@mui/material/Drawer';
import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { parse as WktToGeojson } from 'wellknown';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import { presentifyValue } from '../utils/metric';
import { TOAST_AUTO_CLOSE_MS } from '../utils/constants';
import { toastStyle } from './colorMode';

const SUCCESS_COPY_MESSAGE = 'Copied to Clipboard';

const drawerWidth = 330;

interface SidebarProps {
  isOpen: boolean;
  data: TileDetails[];
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, data, onClose }) => {
  const theme = useTheme();

  if (!isOpen) {
    return null;
  }

  const onCopy = (_: string, result: boolean): void => {
    if (!result) {
      return;
    }
    toast.success(SUCCESS_COPY_MESSAGE, {
      style: toastStyle(theme.palette.mode),
    });
  };

  /* eslint-disable @typescript-eslint/naming-convention */
  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      variant="persistent"
      anchor="left"
      open={isOpen}
      onClose={onClose}
    >
      <IconButton aria-label="close" onClick={onClose} sx={{ ml: 'auto' }}>
        <CloseIcon />
      </IconButton>
      <Box sx={{ padding: '20px' }}>
        <Typography variant="h5" gutterBottom>
          Tile: {data[0].z}/{data[0].x}/{data[0].y}
        </Typography>
        <Typography gutterBottom>{data[0].geoshape}</Typography>
        <Typography gutterBottom sx={{ color: 'text.secondary' }}>
          ({data.length} result{data.length === 1 ? '' : 's'})
        </Typography>
        {data.map((tile) => (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent key={`${tile.kit}/${tile.z}/${tile.x}/${tile.y}`}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="body2">
                  Kit: {tile.kit}
                  <br />
                  State: {tile.state}
                  <br />
                  Created At: {presentifyValue(tile.createdAt, 'date')}
                  <br />
                  Updated At: {presentifyValue(tile.updatedAt, 'date')}
                  <br />
                  Update Count: {tile.updateCount}
                  <br />
                  Skip Count: {tile.skipCount}
                </Typography>
                <CopyToClipboard text={JSON.stringify({ ...tile, geojson: WktToGeojson(tile.geoshape) })} onCopy={onCopy}>
                  <IconButton aria-label="copy">
                    <FileCopy fontSize="small" />
                  </IconButton>
                </CopyToClipboard>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
      <ToastContainer position="bottom-center" autoClose={TOAST_AUTO_CLOSE_MS} />
    </Drawer>
  );
};
/* eslint-enable @typescript-eslint/naming-convention */
