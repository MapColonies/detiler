export const ZOOM_OFFEST = 3;
export const MIN_ZOOM_LEVEL = 0;
export const MAX_ZOOM_LEVEL = 18;
export const FETCH_KITS_INTERVAL = 60000;
export const MILLISECONDS_IN_SECOND = 1000;

export const MIN_LONGITUDE = -179.99999;
export const MAX_LONGITUDE = 180;
export const MIN_LATITUDE = -85.05112877980659;
export const MAX_LATITUDE = 85.05112877980659;

export const INITIAL_VIEW_STATE = {
  longitude: 32,
  latitude: 32,
  pitch: 0,
  bearing: 0,
  zoom: ZOOM_OFFEST,
  maxZoom: MAX_ZOOM_LEVEL - ZOOM_OFFEST,
};

export const FEATURE_ID_DUMMY = 'dummy';

export const NOT_FOUND_INDEX = -1;

export const LOAD_TIMEOUT_MS = 1000;
export const POPUP_AUTO_CLOSE_MS = 3000;
export const POPUP_MAX_AMOUNT = 3;

export const METATILE_SIZE = 8;

export const DEFAULT_MIN_STATE = -1;
export const DEFAULT_MAX_STATE = 1;

export const MAX_KIT_STATE_KEY = 'maxState';
