import React, { useContext, useState } from 'react';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import { KitMetadata } from '@map-colonies/detiler-common';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { DEFAULT_MAX_STATE, DEFAULT_MIN_STATE, MAX_KIT_STATE_KEY, ZOOM_OFFEST } from '../utils/constants';
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
    padding-bottom: 24px;
  }
`);

interface PreferencesProps {
  kits: KitMetadata[];
  zoomLevel: number;
  selectedKit?: KitMetadata;
  stateRange?: number[];
  selectedMetric?: Metric;
  selectedColorScale: { key: ColorScale; value: ColorScaleFunc };
  onKitChange: (event: TargetetEvent<string>) => void;
  onStateRangeChange: (event: Event, range: number | number[]) => void;
  onMetricChange: (event: TargetetEvent<string>) => void;
  onColorScaleChange: (event: TargetetEvent<string>) => void;
  onGoToClicked: (longitude: number, latitude: number, zoom?: number) => void;
}

export const Preferences: React.FC<PreferencesProps> = ({
  kits,
  zoomLevel: currentZoomLevel,
  selectedKit,
  stateRange,
  selectedMetric,
  selectedColorScale,
  onKitChange,
  onStateRangeChange,
  onMetricChange,
  onColorScaleChange,
  onGoToClicked,
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
            <Typography variant="h6">Zoom: {currentZoomLevel + ZOOM_OFFEST}</Typography>
            <Tooltip title="go to tile / coordinates">
              <IconButton onClick={handleOpenModal}>
                <LocationOnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <ColorModeSwitch sx={{ m: 1 }} defaultChecked onClick={colorMode.toggleColorMode} />
          </Stack>
          <br />
          <Stack direction="column" spacing={2}>
            <FormControl variant="filled" sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id="select-kit-label">Kit</InputLabel>
              <Select labelId="select-kit-label" id="kit-select" value={selectedKit?.name} onChange={onKitChange} label="Kit">
                {kits
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((kit, index) => (
                    <MenuItem key={index} value={kit.name}>
                      {kit.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl variant="filled" sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id="select-metric-label">Metric</InputLabel>
              <Select labelId="select-metric-label" id="metric-select" value={selectedMetric?.name} onChange={onMetricChange} label="Metric">
                {METRICS.map((metric, index) => (
                  <MenuItem key={index} value={metric.name}>
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
            <FormControl>
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
          <FormLabel id="stateslider-label">State Range</FormLabel>
          <Slider
            getAriaLabel={(): string => 'State range'}
            marks={marks}
            min={minStateValue}
            max={maxStateValue}
            value={stateRange}
            onChange={onStateRangeChange}
            valueLabelDisplay="auto"
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
        </StyledCardContent>
      </Card>
      <GoToModal isOpen={isModalOpen} onClose={handleCloseModal} onGoToClicked={onGoToClicked} />
    </div>
  );
};
