import React, { useState, useEffect } from 'react';
import { Cooldown, TileDetails } from '@map-colonies/detiler-common';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import FileCopy from '@mui/icons-material/FileCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Drawer from '@mui/material/Drawer';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { parse as WktToGeojson } from 'wellknown';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Pagination,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  FormLabel,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { TileParams } from '@map-colonies/detiler-common';
import { TILEGRID_WORLD_CRS84, tileToBoundingBox } from '@map-colonies/tile-calc';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { presentifyValue } from '../utils/metric';
import { LOAD_TIMEOUT_MS, METATILE_SIZE, MILLISECONDS_IN_SECOND, ZOOM_OFFEST } from '../utils/constants';
import { bboxToLonLat, promiseWithTimeout } from '../utils/helpers';
import { config } from '../config';
import { AppConfig } from '../utils/interfaces';
import { COOLDOWN_COLOR } from '../utils/style';

const DEFAULT_TILES_PER_PAGE = 4;
const FIRST_PAGE = 1;
const DRAWER_WIDTH = 345;
const SUCCESS_COPY_MESSAGE = 'Copied to Clipboard';

const cardsPerPage = config.get<AppConfig>('app').style.tilesPerPage ?? DEFAULT_TILES_PER_PAGE;

const StyledCardContent = styled(CardContent)(`
  padding: 10px;
  &:last-child {
    padding-bottom: 10px;
  }
`);

interface SidebarProps {
  isOpen: boolean;
  data: { details: TileDetails[]; cooldowns: ExtendedCooldown[] };
  onClose: () => void;
  onGoToClicked: (longitude: number, latitude: number, zoom?: number) => void;
  onRefreshClicked: (tile: TileParams) => Promise<void>;
  onCooldownClicked: (cooldown: ExtendedCooldown) => void;
}

export type ExtendedCooldown = Cooldown & { id?: number; selected?: boolean };

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, data, onClose, onGoToClicked, onRefreshClicked, onCooldownClicked }) => {
  const [selectedCooldowns, setSelectedCooldowns] = useState<number[]>([]);
  const [currentDetailsPage, setCurrentDetailsPage] = useState(FIRST_PAGE);
  const [currentCooldownsPage, setCurrentCooldownsPage] = useState(FIRST_PAGE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTileAccordionExpanded, setTileAccordionExpanded] = useState<boolean>(true);
  const { enqueueSnackbar } = useSnackbar();

  data.details = data.details.sort((a, b) => a.kit.localeCompare(b.kit));
  data.cooldowns = data.cooldowns.map((cooldown, index) => {
    return { ...cooldown, selected: false, id: index };
  });

  useEffect(() => {
    setCurrentDetailsPage(FIRST_PAGE);
    setCurrentCooldownsPage(FIRST_PAGE);
    setSelectedCooldowns([]);
  }, [data]);

  if (!isOpen) {
    return null;
  }

  const startDetailsIndex = (currentDetailsPage - 1) * cardsPerPage;
  const endDetailsIndex = startDetailsIndex + cardsPerPage;
  const currentDetails = data.details.slice(startDetailsIndex, endDetailsIndex);

  const startCooldownsIndex = (currentCooldownsPage - 1) * cardsPerPage;
  const endCooldownsIndex = startCooldownsIndex + cardsPerPage;
  const currentCooldowns = data.cooldowns.slice(startCooldownsIndex, endCooldownsIndex);

  const handleDetailsPageChange = (_: React.ChangeEvent<unknown>, page: number): void => {
    setCurrentDetailsPage(page);
  };

  const handleCooldownsPageChange = (_: React.ChangeEvent<unknown>, page: number): void => {
    setCurrentCooldownsPage(page);
  };

  const onCopy = (_: string, result: boolean): void => {
    if (!result) {
      return;
    }
    enqueueSnackbar(SUCCESS_COPY_MESSAGE, { variant: 'success' });
  };

  const wrappedGoTo = (): void => {
    const { z, x, y } = data.details[0];
    const tile = { z, x, y, metatile: METATILE_SIZE };
    const bbox = tileToBoundingBox(tile, TILEGRID_WORLD_CRS84, true);
    const { lon, lat } = bboxToLonLat(bbox);
    onGoToClicked(lon, lat, z - ZOOM_OFFEST);
  };

  const wrappedRefresh = async (): Promise<void> => {
    setSelectedCooldowns([]);
    setIsLoading(true);

    const { z, x, y } = data.details[0];
    await promiseWithTimeout(LOAD_TIMEOUT_MS, onRefreshClicked({ z, x, y }));

    setIsLoading(false);
  };

  const toggleTileAccordionExpanded = (): void => {
    setTileAccordionExpanded(!isTileAccordionExpanded);
  };

  const handleCooldownClick = (index: number): void => {
    let updatedSelectedCooldowns: number[];

    if (selectedCooldowns.includes(index)) {
      // Remove index if it's already selected
      updatedSelectedCooldowns = selectedCooldowns.filter((i) => i !== index);
    } else {
      // Add index if it's not selected
      updatedSelectedCooldowns = [...selectedCooldowns, index];
    }

    setSelectedCooldowns(updatedSelectedCooldowns);
    onCooldownClicked(data.cooldowns[index]);
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
            Tile: {data.details[0].z}/{data.details[0].x}/{data.details[0].y}
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            {/* <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              ({data.details.length} tile{data.details.length === 1 ? '' : 's'}, {data.cooldowns.length} cooldown
              {data.cooldowns.length === 1 ? '' : 's'})
            </Typography> */}
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
          <Accordion expanded={isTileAccordionExpanded} onChange={toggleTileAccordionExpanded}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel3-content" id="panel3-header">
              <FormLabel id="state-input-label">Tiles ({data.details.length})</FormLabel>
            </AccordionSummary>
            {currentDetails.map((tile) => (
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
                        }}
                      >
                        {tile.skipCount}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          display: 'inline-block',
                          bgcolor: COOLDOWN_COLOR,
                          color: 'white',
                          fontWeight: 'bold',
                          px: 1,
                          borderTopRightRadius: 1,
                          borderBottomRightRadius: 1,
                        }}
                      >
                        {tile.coolCount}
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
            <Box display="flex" justifyContent="center" alignItems="center" margin="auto" marginBottom="10%">
              {data.details.length > cardsPerPage && (
                <Pagination
                  count={Math.ceil(data.details.length / cardsPerPage)}
                  page={currentDetailsPage}
                  onChange={handleDetailsPageChange}
                  color="primary"
                />
              )}
            </Box>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel3-content" id="panel3-header">
              <FormLabel id="state-input-label">Cooldowns ({data.cooldowns.length})</FormLabel>
            </AccordionSummary>
            {currentCooldowns.map((cooldown) => (
              <Card key={cooldown.id} variant="outlined" sx={{ mb: 1 }}>
                <StyledCardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="body2">
                      Kits: {cooldown.kits.join(', ')}
                      <br />
                      Created At: {presentifyValue(cooldown.createdAt / MILLISECONDS_IN_SECOND, 'date')}
                      <br />
                      Duration: {cooldown.duration}
                      <br />
                      TTL: {cooldown.ttl ?? 'No Limit'}
                      <br />
                      Zoom: {cooldown.minZoom} - {cooldown.maxZoom}
                      <br />
                    </Typography>
                    <IconButton aria-label="toggle visibility" onClick={(): void => handleCooldownClick(cooldown.id!)}>
                      {selectedCooldowns.includes(cooldown.id!) ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </Stack>
                </StyledCardContent>
              </Card>
            ))}
            <Box display="flex" justifyContent="center" alignItems="center" margin="auto" marginBottom="10%">
              {data.cooldowns.length > cardsPerPage && (
                <Pagination
                  count={Math.ceil(data.cooldowns.length / cardsPerPage)}
                  page={currentCooldownsPage}
                  onChange={handleCooldownsPageChange}
                  color="primary"
                />
              )}
            </Box>
          </Accordion>
        </Box>
      )}
    </Drawer>
  );
};
/* eslint-enable @typescript-eslint/naming-convention */
/* eslint-enable @typescript-eslint/no-misused-promises */
