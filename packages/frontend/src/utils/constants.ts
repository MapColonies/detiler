export const ZOOM_OFFEST = 3;
export const MIN_ZOOM_LEVEL = 0;
export const MAX_ZOOM_LEVEL = 21;
export const MILLISECONDS_IN_SECOND = 1000;

export const MIN_LONGITUDE = -179.99999;
export const MAX_LONGITUDE = 180;
// the true CRS84 pole bounds - was web mercator's max latitude (85.05112877980659) before the move to CRS84
export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;

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

export const DEFAULT_KITS_FETCH_INTERVAL = 60000;

export const DEFAULT_TILES_FETCH_INTERVAL = 2000;
export const DEFAULT_TILES_BATCH_SIZE = 1000;
export const DEFAULT_TILES_FETCH_TIMEOUT = 1500;
