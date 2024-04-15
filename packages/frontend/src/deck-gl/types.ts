import type { Map as MapboxMap } from 'mapbox-gl';

export type MapLibreGL = import('react-map-gl/dist/esm/types/lib').MapLib<MapboxMap>;

export interface TargetetEvent<T> {
  target: {
    value: T;
  };
}
