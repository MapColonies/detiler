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
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { ZOOM_OFFEST } from '../utils/constants';
import './css/styles.css';
import { TargetetEvent } from '../deck-gl/types';
import { Metric, METRICS } from '../utils/metric';
import { ColorScale, COLOR_SCALES, ColorScaleFunc } from '../utils/style';
import { colorModeContext } from './colorMode';
import { ColorModeSwitch } from './colorModeSwitch';
import { GoToModal } from './goToModal';

interface PreferencesProps {
  kits: string[];
  zoomLevel: number;
  selectedKit?: string;
  selectedMetric?: Metric;
  selectedColorScale: { key: ColorScale; value: ColorScaleFunc };
  onKitChange: (event: TargetetEvent<string>) => void;
  onMetricChange: (event: TargetetEvent<string>) => void;
  onColorScaleChange: (event: TargetetEvent<string>) => void;
  onGoToClicked: (longitude: number, latitude: number, zoom?: number) => void;
}

export const Preferences: React.FC<PreferencesProps> = ({
  kits,
  zoomLevel: currentZoomLevel,
  selectedKit,
  selectedMetric,
  selectedColorScale,
  onKitChange,
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

  return (
    <div className="common preferences">
      <Card>
        <CardContent>
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
              <Select labelId="select-kit-label" id="kit-select" value={selectedKit} onChange={onKitChange} label="Kit">
                {kits.map((kit, index) => (
                  <MenuItem key={index} value={kit}>
                    {kit}
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
        </CardContent>
      </Card>
      <GoToModal isOpen={isModalOpen} onClose={handleCloseModal} onGoToClicked={onGoToClicked} />
    </div>
  );
};
