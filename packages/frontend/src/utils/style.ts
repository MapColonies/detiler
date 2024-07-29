import * as d3 from 'd3';
import { config } from '../config';
import { INITIAL_MIN_MAX, MinMax } from './metric';
import { AppConfig } from './interfaces';

const DEFAULT_EMPTY_TILE_ALPHA = 50;
const DEFAULT_COLORED_TILE_ALPHA = 75;
const HEAT_EXPONENT = 2;

const configuredAlpha = config.get<AppConfig>('app').style.dataAlphaChannel;
export const RGBA_MIN = 0;
export const RGBA_MAX = 255;

export const DEFAULT_TILE_COLOR: [number, number, number, number] = [RGBA_MIN, RGBA_MIN, RGBA_MIN, DEFAULT_EMPTY_TILE_ALPHA];

export type ColorScale = 'heat' | 'r2g' | 'virdis';
export type ColorScaleFunc = ReturnType<typeof colorScaleParser>;
export const COLOR_SCALES: ColorScale[] = ['heat', 'r2g', 'virdis'];

export const colorScaleParser = (colorScale: ColorScale): d3.ScaleSequential<unknown> | d3.ScalePower<unknown, unknown> => {
  switch (colorScale) {
    case 'virdis':
      return d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);
    case 'heat':
      return d3
        .scalePow([d3.rgb(RGBA_MAX, RGBA_MAX, RGBA_MIN), d3.rgb(RGBA_MAX, RGBA_MIN, RGBA_MIN)])
        .exponent(HEAT_EXPONENT)
        .domain([0, 1]);
    case 'r2g':
      return d3.scaleSequential(d3.interpolateRgb(d3.rgb(RGBA_MAX, RGBA_MIN, RGBA_MIN), d3.rgb(RGBA_MIN, RGBA_MAX, RGBA_MIN))).domain([0, 1]);
  }
};

export const normalizeValue = (value: number, minMax: MinMax): number | undefined => {
  if ((minMax.min === INITIAL_MIN_MAX.min && minMax.max === INITIAL_MIN_MAX.max) || minMax.min === minMax.max) {
    return undefined;
  }
  const normalizedValue = Math.min((value - minMax.min) / (minMax.max - minMax.min), 1);
  return normalizedValue;
};

export const colorFactory = (value: number | undefined, colorScaleFunc: ColorScaleFunc): [number, number, number, number] => {
  if (value === undefined) {
    return DEFAULT_TILE_COLOR;
  }
  const scaledColor = colorScaleFunc(value) as d3.ColorSpaceObject;
  const color = d3.color(scaledColor);
  const { r, g, b } = color.rgb();
  return [r, g, b, configuredAlpha ?? DEFAULT_COLORED_TILE_ALPHA];
};
