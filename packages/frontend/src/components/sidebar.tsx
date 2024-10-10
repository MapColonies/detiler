import React, { useState, useEffect } from 'react';
import { TileDetails } from '@map-colonies/detiler-common';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import FileCopy from '@mui/icons-material/FileCopy';
import Drawer from '@mui/material/Drawer';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { parse as WktToGeojson } from 'wellknown';
import { Card, CardContent, Typography, Box, Stack, Pagination, Tooltip, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { TileParams } from '@map-colonies/detiler-common';
import { TILEGRID_WORLD_CRS84, tileToBoundingBox } from '@map-colonies/tile-calc';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RefreshIcon from '@mui/icons-material/Refresh';
import { presentifyValue } from '../utils/metric';
import { LOAD_TIMEOUT_MS, METATILE_SIZE, ZOOM_OFFEST } from '../utils/constants';
import { bboxToLonLat, promiseWithTimeout } from '../utils/helpers';
import { config } from '../config';
import { AppConfig } from '../utils/interfaces';

const DEFAULT_TILES_PER_PAGE = 4;
const FIRST_PAGE = 1;
const DRAWER_WIDTH = 345;
const SUCCESS_COPY_MESSAGE = 'Copied to Clipboard';

const tilesPerPage = config.get<AppConfig>('app').style.tilesPerPage ?? DEFAULT_TILES_PER_PAGE;

const StyledCardContent = styled(CardContent)(`
  padding: 10px;
  &:last-child {
    padding-bottom: 10px;
  }
`);

interface SidebarProps {
  isOpen: boolean;
  data: TileDetails[];
  onClose: () => void;
  onGoToClicked: (longitude: number, latitude: number, zoom?: number) => void;
  onRefreshClicked: (tile: TileParams) => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, data, onClose, onGoToClicked, onRefreshClicked }) => {
  const [currentPage, setCurrentPage] = useState(FIRST_PAGE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { enqueueSnackbar } = useSnackbar();

  data = data.sort((a, b) => a.kit.localeCompare(b.kit));

  useEffect(() => {
    setCurrentPage(FIRST_PAGE);
  }, [data]);

  if (!isOpen) {
    return null;
  }

  const startIndex = (currentPage - 1) * tilesPerPage;
  const endIndex = startIndex + tilesPerPage;
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

  const wrappedGoTo = (): void => {
    const { z, x, y } = data[0];
    const tile = { z, x, y, metatile: METATILE_SIZE };
    const bbox = tileToBoundingBox(tile, TILEGRID_WORLD_CRS84, true);
    const { lon, lat } = bboxToLonLat(bbox);
    onGoToClicked(lon, lat, z - ZOOM_OFFEST);
  };

  const wrappedRefresh = async (): Promise<void> => {
    setIsLoading(true);

    const { z, x, y } = data[0];
    await promiseWithTimeout(LOAD_TIMEOUT_MS, onRefreshClicked({ z, x, y }));

    setIsLoading(false);
  };

  /* eslint-disable @typescript-eslint/no-misused-promises */
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
      {isLoading ? (
        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ width: 1, height: '100vh' }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Box sx={{ padding: '10px' }}>
          <Typography variant="h5">
            Tile: {data[0].z}/{data[0].x}/{data[0].y}
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              ({data.length} result{data.length === 1 ? '' : 's'})
            </Typography>
            <Tooltip title="refresh">
              <IconButton onClick={wrappedRefresh}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="go to tile">
              <IconButton onClick={wrappedGoTo}>
                <LocationOnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          {currentData.map((tile) => (
            <Card variant="outlined" sx={{ mb: 1 }}>
              <StyledCardContent key={`${tile.kit}/${tile.z}/${tile.x}/${tile.y}`}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="body2">
                    Kit: {tile.kit}
                    <br />
                    State: {tile.state}
                    <br />
                    States: {presentifyValue(tile.states)}
                    <br />
                    Created At: {presentifyValue(tile.createdAt, 'date')}
                    <br />
                    Updated At: {presentifyValue(tile.updatedAt, 'date')}
                    <br />
                    Rendered At: {presentifyValue(tile.renderedAt, 'date')}
                    <br />
                    Counts:{' '}
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'inline-block',
                        bgcolor: '#37b581',
                        color: 'white',
                        fontWeight: 'bold',
                        px: 1,
                        borderTopLeftRadius: 1,
                        borderBottomLeftRadius: 1,
                      }}
                    >
                      {tile.updateCount}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'inline-block',
                        bgcolor: '#b87cdd',
                        color: 'white',
                        fontWeight: 'bold',
                        px: 1,
                      }}
                    >
                      {tile.renderCount}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'inline-block',
                        bgcolor: '#e19017',
                        color: 'white',
                        fontWeight: 'bold',
                        px: 1,
                        borderTopRightRadius: 1,
                        borderBottomRightRadius: 1,
                      }}
                    >
                      {tile.skipCount}
                    </Typography>
                  </Typography>
                  <CopyToClipboard text={JSON.stringify({ ...tile, geojson: WktToGeojson(tile.geoshape) })} onCopy={onCopy}>
                    <IconButton aria-label="copy">
                      <FileCopy fontSize="small" />
                    </IconButton>
                  </CopyToClipboard>
                </Stack>
              </StyledCardContent>
            </Card>
          ))}
        </Box>
      )}
      <Box display="flex" justifyContent="center" alignItems="center" margin="auto" marginBottom="10%">
        {data.length > tilesPerPage && (
          <Pagination count={Math.ceil(data.length / tilesPerPage)} page={currentPage} onChange={handlePageChange} color="primary" />
        )}
      </Box>
    </Drawer>
  );
};
/* eslint-enable @typescript-eslint/naming-convention */
/* eslint-enable @typescript-eslint/no-misused-promises */
