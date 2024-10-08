import { useContext, useState } from 'react';
import {
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tooltip,
  Typography,
  Slider,
  Input,
  Switch,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionActions,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import { KitMetadata } from '@map-colonies/detiler-common';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import { DEFAULT_MAX_STATE, DEFAULT_MIN_STATE, MAX_KIT_STATE_KEY, MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL, ZOOM_OFFEST } from '../utils/constants';
import './css/styles.css';
import { TargetetEvent } from '../deck-gl/types';
import { Metric, METRICS } from '../utils/metric';
import { ColorScale, COLOR_SCALES, ColorScaleFunc } from '../utils/style';
import { colorModeContext } from './colorMode';
import { ColorModeSwitch } from './colorModeSwitch';
import { GoToModal } from './goToModal';

const StyledCardContent = styled(CardContent)(`
  padding: 30px;
  &:last-child {
    padding-bottom: 0px;
  }
`);

const ZOOM_MARKS = [
  {
    value: MIN_ZOOM_LEVEL,
    label: MIN_ZOOM_LEVEL,
  },
  {
    value: MAX_ZOOM_LEVEL,
    label: MAX_ZOOM_LEVEL,
  },
];

interface PreferencesProps {
  kits: KitMetadata[];
  selectedKit?: KitMetadata;
  zoomLevel: number;
  queryZoom: number;
  shouldFollowZoom: boolean;
  shouldQueryCurrentState: boolean;
  stateRange?: number[];
  selectedMetric?: Metric;
  selectedColorScale: { key: ColorScale; value: ColorScaleFunc };
  isPaused: boolean;
  isLoading: boolean;
  onKitChange: (event: TargetetEvent<string>) => void;
  onStateRangeChange: (event: Event, range: number | number[]) => void;
  onQueryZoomChange: (event: Event, range: number | number[]) => void;
  onMetricChange: (event: TargetetEvent<string>) => void;
  onColorScaleChange: (event: TargetetEvent<string>) => void;
  onGoToClicked: (longitude: number, latitude: number, zoom?: number) => void;
  onShouldFollowZoomChange: (event: React.ChangeEvent<HTMLInputElement>, shouldFollow: boolean) => void;
  onShouldQueryCurrentStateChange: (event: React.ChangeEvent<HTMLInputElement>, shouldQueryCurrentState: boolean) => void;
  onActionClicked: () => void;
}

export const Preferences: React.FC<PreferencesProps> = ({
  kits,
  zoomLevel: currentZoomLevel,
  queryZoom,
  selectedKit,
  stateRange,
  selectedMetric,
  selectedColorScale,
  shouldFollowZoom,
  shouldQueryCurrentState,
  isPaused,
  isLoading,
  onKitChange,
  onStateRangeChange,
  onQueryZoomChange,
  onMetricChange,
  onColorScaleChange,
  onGoToClicked,
  onShouldFollowZoomChange,
  onShouldQueryCurrentStateChange,
  onActionClicked,
}) => {
  const colorMode = useContext(colorModeContext);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOpenModal = (): void => {
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };

  const handleMinInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onStateRangeChange(event as unknown as Event, [+event.target.value, stateRange ? stateRange[1] : 0]);
  };

  const handleMaxInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onStateRangeChange(event as unknown as Event, [stateRange ? stateRange[0] : 0, +event.target.value]);
  };

  const maxState = selectedKit ? +selectedKit[MAX_KIT_STATE_KEY] : DEFAULT_MAX_STATE;

  const marks = [
    {
      value: DEFAULT_MIN_STATE,
      label: DEFAULT_MIN_STATE,
    },
    {
      value: maxState,
      label: maxState,
    },
  ];

  const minStateValue = marks[0].value;
  const maxStateValue = marks[marks.length - 1].value;

  return (
    <div className="common top-right-corner" style={{ width: '16vw' }}>
      <Card>
        <StyledCardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Tooltip title="resume / pause">
              <IconButton onClick={onActionClicked}>{isPaused ? <PlayCircleFilledWhiteIcon /> : <PauseCircleIcon />}</IconButton>
            </Tooltip>
            <Typography variant="h6">Zoom: {currentZoomLevel + ZOOM_OFFEST}</Typography>
            <Tooltip title="go to tile / coordinates">
              <IconButton onClick={handleOpenModal}>
                <LocationOnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <ColorModeSwitch sx={{ m: 1 }} defaultChecked onClick={colorMode.toggleColorMode} />
          </Stack>
          <Box display="flex" justifyContent="center" alignItems="center">
            <Typography>custom</Typography>
            <Switch checked={shouldFollowZoom} onChange={onShouldFollowZoomChange} size="small" />
            <Typography>viewer</Typography>
          </Box>
          <Slider
            getAriaLabel={(): string => 'Query Zoom'}
            marks={ZOOM_MARKS}
            min={MIN_ZOOM_LEVEL}
            max={MAX_ZOOM_LEVEL}
            value={shouldFollowZoom ? currentZoomLevel + ZOOM_OFFEST : queryZoom}
            onChange={onQueryZoomChange}
            valueLabelDisplay="auto"
            disabled={shouldFollowZoom}
            track={false}
          />
          <Stack direction="column" spacing={2}>
            <FormControl size="small" variant="filled" sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id="select-kit-label" size="small">
                Kit
              </InputLabel>
              <Select
                labelId="select-kit-label"
                id="kit-select"
                size="small"
                value={selectedKit?.name}
                onChange={onKitChange}
                label="Kit"
                sx={{ maxHeight: '50px' }}
              >
                {kits
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((kit, index) => (
                    <MenuItem key={index} value={kit.name} sx={{ maxHeight: '40px' }}>
                      {kit.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl size="small" variant="filled" sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id="select-metric-label" size="small">
                Metric
              </InputLabel>
              <Select
                labelId="select-metric-label"
                id="metric-select"
                size="small"
                value={selectedMetric?.name}
                onChange={onMetricChange}
                label="Metric"
                sx={{ maxHeight: '50px' }}
              >
                {METRICS.map((metric, index) => (
                  <MenuItem key={index} value={metric.name} sx={{ maxHeight: '40px' }}>
                    {metric.name}
                    <Tooltip title={metric.info}>
                      <IconButton>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <FormLabel id="color-scale-radio-buttons-group-label">Color Scale</FormLabel>
              <RadioGroup
                row
                aria-labelledby="color-scale-radio-buttons-group-label"
                name="row-radio-buttons-group"
                defaultValue={selectedColorScale.key}
                onChange={onColorScaleChange}
              >
                {COLOR_SCALES.map((colorScale) => (
                  <FormControlLabel value={colorScale.toString()} control={<Radio />} label={colorScale.toString()} />
                ))}
              </RadioGroup>
            </FormControl>
          </Stack>
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel3-content" id="panel3-header">
              <FormLabel id="state-input-label">State Range</FormLabel>
            </AccordionSummary>
            <AccordionActions>
              <Stack direction="column" spacing={3}>
                <Box display="flex" justifyContent="center" alignItems="center">
                  <Typography>all</Typography>
                  <Switch checked={shouldQueryCurrentState} onChange={onShouldQueryCurrentStateChange} size="small" />
                  <Typography>current</Typography>
                </Box>
                <Slider
                  getAriaLabel={(): string => 'State range'}
                  marks={marks}
                  min={minStateValue}
                  max={maxStateValue}
                  value={stateRange}
                  onChange={onStateRangeChange}
                  valueLabelDisplay="auto"
                  size="small"
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <FormLabel id="stateslider-min-label">Min:</FormLabel>
                  <Input
                    value={stateRange !== undefined ? stateRange[0] : minStateValue}
                    size="small"
                    onChange={handleMinInputChange}
                    inputProps={{
                      step: 1,
                      min: minStateValue,
                      max: maxStateValue,
                      type: 'number',
                    }}
                  />
                  <FormLabel id="stateslider-max-label">Max:</FormLabel>
                  <Input
                    value={stateRange !== undefined ? stateRange[1] : maxStateValue}
                    size="small"
                    onChange={handleMaxInputChange}
                    inputProps={{
                      step: 1,
                      min: minStateValue,
                      max: maxStateValue,
                      type: 'number',
                    }}
                  />
                </Stack>
              </Stack>
            </AccordionActions>
          </Accordion>
          <br />
          {isLoading ? <LinearProgress /> : null}
        </StyledCardContent>
      </Card>
      <GoToModal isOpen={isModalOpen} onClose={handleCloseModal} onGoToClicked={onGoToClicked} />
    </div>
  );
};
