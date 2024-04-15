import React from 'react';
import { ZOOM_OFFEST } from '../utils/constants';
import './css/common.css';
import { TargetetEvent } from '../deck-gl/types';
import { Metric, METRICS } from '../utils/metric';
import { ColorScale, COLOR_SCALES, ColorScaleFunc } from '../utils/style';

interface PreferencesProps {
  kits: string[];
  zoomLevel: number;
  selectedKit?: string;
  selectedMetric?: Metric;
  selectedColorScale: { key: ColorScale; value: ColorScaleFunc };
  onKitChange: (event: TargetetEvent<string>) => void;
  onMetricChange: (event: TargetetEvent<string>) => void;
  onColorScaleChange: (event: TargetetEvent<ColorScale>) => void;
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
  return (
    <div className="common preferences">
      <p>zoom: {currentZoomLevel + ZOOM_OFFEST}</p>
      <p>kit:</p>
      {kits.map((kit) => (
        <label key={kit}>
          <input type="radio" value={kit} checked={selectedKit === kit} onChange={onKitChange} />
          {kit}
        </label>
      ))}
      <p>metric:</p>
      {METRICS.map((metric) => (
        <label key={metric.name}>
          <input type="radio" value={metric.name} checked={selectedMetric === metric} onChange={onMetricChange} />
          {metric.name}
        </label>
      ))}
      <p>color scale:</p>
      {COLOR_SCALES.map((colorScale) => (
        <label key={colorScale}>
          <input type="radio" value={colorScale} checked={selectedColorScale.key === colorScale} onChange={onColorScaleChange} />
          {colorScale.toString()}
        </label>
      ))}
    </div>
  );
};
