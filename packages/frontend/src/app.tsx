import React, { useState, useEffect, useCallback } from 'react';
import { Map } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { MapViewState, WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { ViewStateChangeParameters } from '@deck.gl/core/src/controllers/controller';
import { PickingInfo } from '@deck.gl/core/src/lib/picking/pick-info';
import { Feature, Geometry } from 'geojson';
import { KitMetadata, TileDetails, TileParams, TileQueryParams } from '@map-colonies/detiler-common';
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async';
import { useSnackbar } from 'notistack';
import pTimeout from 'p-timeout';
import { uniqBy } from 'lodash';
import { AxiosError } from 'axios';
import { appHelper, compareQueries, parseDataToFeatures, timerify, querifyBounds } from './utils/helpers';
import {
  ZOOM_OFFEST,
  INITIAL_VIEW_STATE,
  DEFAULT_MIN_STATE,
  DEFAULT_MAX_STATE,
  MAX_KIT_STATE_KEY,
  CLIENT_ABORTED_ERROR_CODE,
  DEFAULT_KITS_FETCH_INTERVAL,
  DEFAULT_TILES_FETCH_INTERVAL,
  DEFAULT_TILES_FETCH_TIMEOUT,
  DEFAULT_TILES_BATCH_SIZE,
  MIN_ZOOM_LEVEL,
  MAX_ZOOM_LEVEL,
} from './utils/constants';
import { colorFactory, ColorScale, colorScaleParser, ColorScaleFunc, DEFAULT_TILE_COLOR } from './utils/style';
import { METRICS, INITIAL_MIN_MAX, Metric } from './utils/metric';
import { INIT_STATS, calcHttpStat, Stats } from './utils/stats';
import { Preferences, Sidebar, Tooltip, CornerTabs } from './components';
import { comparatorFuncWrapper, filterRangeFuncWrapper, transformFuncWrapper } from './deck-gl';
import { CONSTANT_GEOJSON_LAYER_PROPERTIES, GEOJSON_LAYER_ID, BASEMAP_LAYER_ID } from './deck-gl/constants';
import { basemapLayerFactory } from './deck-gl/basemap';
import { logger } from './logger';
import { config } from './config';
import { client } from './client';
import { MapLibreGL, TargetetEvent } from './deck-gl/types';
import { AppConfig } from './utils/interfaces';

const appConfig = config.get<AppConfig>('app');

export const App: React.FC = () => {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE);
  const [loadedData, setLoadedData] = useState<Feature[]>([]);
  const [hoverInfo, setHoverInfo] = useState<PickingInfo>();
  const [selectedKit, setSelectedKit] = useState<KitMetadata | undefined>();
  const [stateRange, setStateRange] = useState<number[]>([DEFAULT_MIN_STATE, DEFAULT_MAX_STATE]);
  const [queryZoom, setQueryZoom] = useState<number>(INITIAL_VIEW_STATE.zoom + ZOOM_OFFEST);
  const [selectedMetric, setSelectedMetric] = useState<Metric | undefined>();
  const [selectedColorScale, setSelectedColorScale] = useState<{ key: ColorScale; value: ColorScaleFunc }>({
    key: 'heat',
    value: colorScaleParser('heat'),
  });
  const [statsTable, setStatsTable] = useState<Stats>(INIT_STATS);
  const [sidebarData, setSidebarData] = useState<TileDetails[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [shouldFollowZoom, setShouldFollowZoom] = useState<boolean>(true);
  const [shouldQueryCurrentState, setShouldQueryCurrentState] = useState<boolean>(true);
  const { enqueueSnackbar } = useSnackbar();

  const handleKitChange = (event: TargetetEvent<string>): void => {
    const kitMetadata = appHelper.kits.find((kit) => kit.name === event.target.value);
    appHelper.shouldOverrideComarator = true;
    setSelectedKit(kitMetadata);
    if (statsTable.metric) {
      setStatsTable((prevStatsTable) => {
        const nextMetric = prevStatsTable.metric ? { ...prevStatsTable.metric, range: { ...INITIAL_MIN_MAX } } : undefined;
        return { ...prevStatsTable, metric: nextMetric };
      });
    }
    setStateRange([DEFAULT_MIN_STATE, kitMetadata ? +kitMetadata[MAX_KIT_STATE_KEY] : DEFAULT_MAX_STATE]);
  };

  const handleKitStateChange = (event: Event, range: number | number[]): void => {
    setStateRange(range as number[]);
  };

  const handleQueryZoomChange = (event: Event, zoom: number | number[]): void => {
    if (!shouldFollowZoom) {
      setQueryZoom(zoom as number);
    }
  };

  const handleShouldFollowZoomChange = (event: React.ChangeEvent<HTMLInputElement>, shouldFollow: boolean): void => {
    if (shouldFollow) {
      setQueryZoom(appHelper.currentZoomLevel + ZOOM_OFFEST);
    }
    setShouldFollowZoom(shouldFollow);
  };

  const handleQueryZoomChangeByViewport = (zoom: number): void => {
    if (shouldFollowZoom) {
      setQueryZoom(zoom + ZOOM_OFFEST);
    }
  };

  const handleShouldQueryCurrentStateChange = (event: React.ChangeEvent<HTMLInputElement>, shouldQueryCurrentState: boolean): void => {
    setShouldQueryCurrentState(shouldQueryCurrentState);
  };

  const handleMetricChange = (event: TargetetEvent<string>): void => {
    const index = METRICS.findIndex((metric) => metric.name === event.target.value);
    const metric = METRICS[index];
    appHelper.shouldOverrideComarator = true;
    setSelectedMetric(metric);
  };

  const handleColorScaleChange = (event: TargetetEvent<string>): void => {
    const colorScale = event.target.value as ColorScale;
    appHelper.shouldOverrideComarator = true;
    setSelectedColorScale({ key: colorScale, value: colorScaleParser(colorScale) });
  };

  const goToCoordinates = useCallback((longitude: number, latitude: number, zoom?: number) => {
    setViewState({
      ...viewState,
      longitude,
      latitude,
      zoom: zoom ?? appHelper.currentZoomLevel,
      transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
      transitionDuration: 'auto',
    });
  }, []);

  const handleViewportChange = (nextViewState: ViewStateChangeParameters<{ zoom: number }>): void => {
    appHelper.shouldFetch = true;

    setViewState({ ...viewState, ...nextViewState.viewState });

    // for higher zoom levels lower the viewport's zoom level by 1 to have a buffer around the query bounds
    const viewportZoom = nextViewState.viewState.zoom <= ZOOM_OFFEST + 1 ? nextViewState.viewState.zoom : nextViewState.viewState.zoom - 1;
    appHelper.bounds.query = new WebMercatorViewport({ ...nextViewState.viewState, zoom: viewportZoom }).getBounds();
    appHelper.bounds.actual = new WebMercatorViewport(nextViewState.viewState).getBounds();

    const nextZoom = Math.floor(nextViewState.viewState.zoom);
    appHelper.currentZoomLevel = nextZoom;
    handleQueryZoomChangeByViewport(nextZoom);
  };

  const handleOpenSidebar = (data: TileDetails[]): void => {
    setSidebarData(data);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = (): void => {
    setSidebarData([]);
    setIsSidebarOpen(false);
  };

  const handleActionClicked = (): void => {
    setIsPaused(!isPaused);
  };

  useEffect(() => {
    if (selectedKit === undefined) {
      return;
    }
    const prevMaxStateRange = selectedKit[MAX_KIT_STATE_KEY];
    const kitMetadata = appHelper.kits.find((kit) => kit.name === selectedKit.name);
    setSelectedKit(kitMetadata);

    if (+prevMaxStateRange !== stateRange[1]) {
      return;
    }
    setStateRange([stateRange[0], kitMetadata ? +kitMetadata[MAX_KIT_STATE_KEY] : DEFAULT_MAX_STATE]);
  }, [appHelper.kits]);

  useEffect(() => {
    appHelper.lastDetilerQueryParams = undefined;
    appHelper.shouldOverrideComarator = true;

    if (selectedMetric === undefined) {
      return;
    }

    setStatsTable((prevStatsTable) => {
      const nextMetric = { ...selectedMetric, range: { ...INITIAL_MIN_MAX } };
      return { ...prevStatsTable, metric: nextMetric };
    });
  }, [selectedMetric, queryZoom, shouldQueryCurrentState]);

  useEffect(() => {
    async function kitsFetch(): Promise<void> {
      try {
        const [result, duration] = await timerify<Awaited<ReturnType<typeof client.getKits>>, never[]>(client.getKits.bind(client));
        appHelper.kits = result;
        setStatsTable((prevStatsTable) => {
          const nextHttpStat = calcHttpStat(prevStatsTable.httpInvokes.kits, duration);
          return { ...prevStatsTable, httpInvokes: { ...prevStatsTable.httpInvokes, kits: nextHttpStat } };
        });
      } catch (err) {
        logger.error({ msg: 'error fetching kits', err });
        enqueueSnackbar(JSON.stringify(err), { variant: 'error' });
      }
    }

    void kitsFetch();

    const timer = setIntervalAsync(kitsFetch, appConfig.kits.fetchInterval ?? DEFAULT_KITS_FETCH_INTERVAL);
    return () => {
      void clearIntervalAsync(timer).then(() => logger.info(`kits-fetch-timer cleared`));
    };
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const timeoutMs = appConfig.tiles.fetchTimeout ?? DEFAULT_TILES_FETCH_TIMEOUT;

    if (isPaused) {
      return;
    }

    // flush data
    setLoadedData([]);

    // fetch data immediately
    pTimeout(fetchData(abortController), { milliseconds: timeoutMs, signal: abortController.signal }).catch(() => {
      appHelper.lastDetilerQueryParams = undefined;
      appHelper.shouldFetch = true;
    });

    // fetch data in interval only if should
    async function fetchDataFn(): Promise<void> {
      if (!appHelper.shouldFetch) {
        return;
      }

      appHelper.shouldFetch = false;

      try {
        await pTimeout(fetchData(abortController), { milliseconds: timeoutMs, signal: abortController.signal });
      } catch (err) {
        appHelper.lastDetilerQueryParams = undefined;
        appHelper.shouldFetch = true;
      }
    }

    // init timer
    const dataFetchTimer = setIntervalAsync(fetchDataFn, appConfig.tiles.fetchInterval ?? DEFAULT_TILES_FETCH_INTERVAL);

    return () => {
      // aborts any previous intervals with previous dependencies
      logger.info({ msg: 'aborting previous data fetches' });
      abortController.abort();
      void clearIntervalAsync(dataFetchTimer).then(() => logger.info(`data-fetch-timer cleared`));
    };
  }, [isPaused, selectedKit?.name, statsTable.metric?.name, queryZoom, shouldQueryCurrentState, ...stateRange]);

  const fetchData = async (abortController?: AbortController): Promise<void> => {
    try {
      if (appHelper.bounds.query === undefined || selectedKit === undefined) {
        return;
      }

      const nextDetilerQueryParams: TileQueryParams = {
        minZoom: queryZoom,
        maxZoom: queryZoom,
        currentState: shouldQueryCurrentState,
        minState: stateRange[0],
        maxState: stateRange[1],
        kits: [selectedKit.name],
        bbox: querifyBounds(appHelper.bounds.query),
        size: appConfig.tiles.batchSize ?? DEFAULT_TILES_BATCH_SIZE,
      };

      const areQueriesEqual = compareQueries(appHelper.lastDetilerQueryParams, nextDetilerQueryParams);

      if (areQueriesEqual) {
        return;
      }

      setIsLoading(true);

      appHelper.lastDetilerQueryParams = nextDetilerQueryParams;

      const queryGenerator = client.queryTilesDetailsAsyncGenerator(nextDetilerQueryParams, abortController);
      const [, duration] = await timerify(async () => {
        for await (const pageData of queryGenerator) {
          const features = parseDataToFeatures(pageData);
          setLoadedData((prev) => {
            const next = [...prev, ...features];
            return uniqBy(next, 'properties.id');
          });
        }
      });

      setStatsTable((prevStatsTable) => {
        const nextHttpStat = calcHttpStat(prevStatsTable.httpInvokes.query, duration);
        return { ...prevStatsTable, httpInvokes: { ...prevStatsTable.httpInvokes, query: nextHttpStat } };
      });
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.code === CLIENT_ABORTED_ERROR_CODE) {
          logger.error({ msg: 'aborted data fetch', err });
          setIsLoading(false);
          throw err;
        }
      } else {
        logger.error({ msg: 'error fetching data', err });
        enqueueSnackbar(JSON.stringify(err), { variant: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTile = async (tile: TileParams): Promise<void> => {
    try {
      const [result, duration] = await timerify<Awaited<ReturnType<typeof client.getTilesDetails>>, [TileParams]>(
        client.getTilesDetails.bind(client),
        tile
      );
      setStatsTable((prevStatsTable) => {
        const nextHttpStat = calcHttpStat(prevStatsTable.httpInvokes.tile, duration);
        return { ...prevStatsTable, httpInvokes: { ...prevStatsTable.httpInvokes, tile: nextHttpStat } };
      });

      handleOpenSidebar(result);
    } catch (err) {
      logger.error({ msg: 'error getting tile details', err, tile });
      enqueueSnackbar(JSON.stringify(err), { variant: 'error' });
    }
  };

  const basemapLayer = basemapLayerFactory(BASEMAP_LAYER_ID);

  const layer = new GeoJsonLayer({
    id: GEOJSON_LAYER_ID,
    ...CONSTANT_GEOJSON_LAYER_PROPERTIES,
    data: loadedData,
    dataTransform: transformFuncWrapper(statsTable.metric),
    dataComparator: comparatorFuncWrapper(setStatsTable),
    filterRange: isPaused ? [MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL] : filterRangeFuncWrapper(queryZoom),
    getFillColor: (tile: Feature<Geometry, { z: number; score: number }>): [number, number, number, number] => {
      if (!statsTable.metric) {
        return DEFAULT_TILE_COLOR;
      }
      const value = tile.properties.score;
      return colorFactory(value, selectedColorScale.value);
    },
    onHover: (info) => setHoverInfo(info as PickingInfo),
    onClick: async (info: PickingInfo<Feature<Geometry | null, Partial<TileDetails>>>): Promise<void> => {
      if (info.object === undefined) {
        return;
      }

      const { z, x, y } = info.object.properties;
      if (z === undefined || x === undefined || y === undefined) {
        return;
      }

      await fetchTile({ z, x, y });
    },
  });

  return (
    <div>
      <DeckGL initialViewState={viewState} controller={true} layers={[basemapLayer, layer]} onViewStateChange={handleViewportChange}>
        <Map id="map" reuseMaps={true} mapLib={maplibregl as unknown as MapLibreGL} attributionControl={false} />
        <Tooltip hoverInfo={hoverInfo} />
      </DeckGL>
      <Preferences
        kits={appHelper.kits}
        zoomLevel={appHelper.currentZoomLevel}
        selectedKit={selectedKit}
        stateRange={stateRange}
        queryZoom={queryZoom}
        selectedMetric={selectedMetric}
        selectedColorScale={selectedColorScale}
        shouldFollowZoom={shouldFollowZoom}
        shouldQueryCurrentState={shouldQueryCurrentState}
        isPaused={isPaused}
        isLoading={isLoading}
        onKitChange={handleKitChange}
        onStateRangeChange={handleKitStateChange}
        onQueryZoomChange={handleQueryZoomChange}
        onMetricChange={handleMetricChange}
        onColorScaleChange={handleColorScaleChange}
        onGoToClicked={goToCoordinates}
        onShouldFollowZoomChange={handleShouldFollowZoomChange}
        onShouldQueryCurrentStateChange={handleShouldQueryCurrentStateChange}
        onActionClicked={handleActionClicked}
      />
      <CornerTabs statsTableProps={{ stats: statsTable }} overviewMapProps={{ bounds: appHelper.bounds.actual, zoom: appHelper.currentZoomLevel }} />
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} data={sidebarData} onGoToClicked={goToCoordinates} onRefreshClicked={fetchTile} />
    </div>
  );
};
