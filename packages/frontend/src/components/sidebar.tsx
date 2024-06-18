import React, { useState, useEffect } from 'react';
import { TileDetails } from '@map-colonies/detiler-common';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import FileCopy from '@mui/icons-material/FileCopy';
import Drawer from '@mui/material/Drawer';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { parse as WktToGeojson } from 'wellknown';
import { Card, CardContent, Typography, Box, Stack, Pagination } from '@mui/material';
import { useSnackbar } from 'notistack';
import { presentifyValue } from '../utils/metric';

const TILES_PER_PAGE = 5;
const FIRST_PAGE = 1;
const DRAWER_WIDTH = 345;
const SUCCESS_COPY_MESSAGE = 'Copied to Clipboard';

interface SidebarProps {
  isOpen: boolean;
  data: TileDetails[];
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, data, onClose }) => {
  const [currentPage, setCurrentPage] = useState(FIRST_PAGE);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setCurrentPage(FIRST_PAGE);
  }, [data]);

  if (!isOpen) {
    return null;
  }

  const startIndex = (currentPage - 1) * TILES_PER_PAGE;
  const endIndex = startIndex + TILES_PER_PAGE;
  const currentData = data.slice(startIndex, endIndex);

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number): void => {
    setCurrentPage(page);
  };

  const onCopy = (_: string, result: boolean): void => {
    if (!result) {
      return;
    }
    enqueueSnackbar(SUCCESS_COPY_MESSAGE, { variant: 'success' });
  };

  /* eslint-disable @typescript-eslint/naming-convention */
  return (
    <Drawer
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
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
        <Typography gutterBottom sx={{ color: 'text.secondary' }}>
          ({data.length} result{data.length === 1 ? '' : 's'})
        </Typography>
        {currentData.map((tile) => (
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
      <Box display="flex" justifyContent="center" alignItems="center">
        {data.length > TILES_PER_PAGE && (
          <Pagination count={Math.ceil(data.length / TILES_PER_PAGE)} page={currentPage} onChange={handlePageChange} color="primary" />
        )}
      </Box>
    </Drawer>
  );
};
/* eslint-enable @typescript-eslint/naming-convention */
