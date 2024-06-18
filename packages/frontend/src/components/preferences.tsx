import React, { useContext } from 'react';
import {
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { ZOOM_OFFEST } from '../utils/constants';
import './css/common.css';
import { TargetetEvent } from '../deck-gl/types';
import { Metric, METRICS } from '../utils/metric';
import { ColorScale, COLOR_SCALES, ColorScaleFunc } from '../utils/style';
import { colorModeContext } from './colorMode';
import { ColorModeSwitch } from './colorModeSwitch';

interface PreferencesProps {
  kits: string[];
  zoomLevel: number;
  selectedKit?: string;
  selectedMetric?: Metric;
  selectedColorScale: { key: ColorScale; value: ColorScaleFunc };
  onKitChange: (event: TargetetEvent<string>) => void;
  onMetricChange: (event: TargetetEvent<string>) => void;
  onColorScaleChange: (event: TargetetEvent<string>) => void;
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
}) => {
  const colorMode = useContext(colorModeContext);

  return (
    <div className="common preferences">
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography gutterBottom>Zoom: {currentZoomLevel + ZOOM_OFFEST}</Typography>
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
    </div>
  );
};
