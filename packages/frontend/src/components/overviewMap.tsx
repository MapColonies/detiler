import React, { useState, useMemo } from 'react';
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { MapViewState } from '@deck.gl/core';
import { useTheme } from '@mui/material';
import { Feature } from 'geojson';
import { differenceWith } from 'lodash';
import { INITIAL_VIEW_STATE, ZOOM_OFFEST } from '../utils/constants';
import { Bounds, MapLibreGL } from '../deck-gl/types';
import { CONSTANT_GEOJSON_LAYER_PROPERTIES, OVERVIEW_BASEMAP_LAYER_ID, OVERVIEW_GEOJSON_LAYER_ID } from '../deck-gl/constants';
import { bboxToFeature, bboxToLonLat } from '../utils/helpers';
import { basemapLayerFactory } from '../deck-gl/basemap';
import { DEFAULT_COLORED_ALPHA } from '../utils/style';
import { BACKGROUND_RGBA, LIGHT_MODE_MAIN_RGB, DARK_MODE_MAIN_RGB } from './colorMode';

export interface OverviewMapProps {
  bounds?: Bounds;
  zoom: number;
}

export const OverviewMap: React.FC<OverviewMapProps> = ({ bounds, zoom }) => {
  if (bounds === undefined) {
    return null;
  }

  const theme = useTheme();

  const [west, south, east, north] = bounds;
  const bbox = { west, south, east, north };
  const { lon, lat } = bboxToLonLat(bbox);

  const [viewState] = useState<MapViewState>({ ...INITIAL_VIEW_STATE, longitude: lon, latitude: lat, zoom: zoom - ZOOM_OFFEST });

  const overviewData = useMemo((): Feature[] => {
    return [{ ...bboxToFeature(bbox), id: `${zoom},${bbox.west},${bbox.south},${bbox.east},${bbox.north}` }];
  }, [zoom, bbox.east, bbox.north, bbox.south, bbox.west]);

  const layers = [
    basemapLayerFactory(OVERVIEW_BASEMAP_LAYER_ID),
    new GeoJsonLayer({
      id: OVERVIEW_GEOJSON_LAYER_ID,
      ...CONSTANT_GEOJSON_LAYER_PROPERTIES,
      getFillColor: theme.palette.mode === 'dark' ? [...DARK_MODE_MAIN_RGB, DEFAULT_COLORED_ALPHA] : [...LIGHT_MODE_MAIN_RGB, DEFAULT_COLORED_ALPHA],
      pickable: false,
      getLineWidth: 2,
      getLineColor: BACKGROUND_RGBA,
      data: overviewData,
      dataComparator: (nextData: unknown, prevData: unknown): boolean => {
        const comparator = (geojson1: Feature, geojson2: Feature): boolean => geojson1.id === geojson2.id;
        const difference = differenceWith(nextData as Feature[], prevData as Feature[], comparator);
        const shouldSkipRedering = difference.length === 0;
        return shouldSkipRedering;
      },
    }),
  ];

  return (
    <DeckGL initialViewState={viewState} controller={true} layers={layers}>
      <Map id="overview-map" reuseMaps={true} mapLib={maplibregl as unknown as MapLibreGL} attributionControl={false} />
    </DeckGL>
  );
};
