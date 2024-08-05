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
import { appHelper, compareQueries, parseDataToFeatures, timerify, querifyBounds } from './utils/helpers';
import { ZOOM_OFFEST, FETCH_KITS_INTERVAL, INITIAL_VIEW_STATE, DEFAULT_MIN_STATE, DEFAULT_MAX_STATE, MAX_KIT_STATE_KEY } from './utils/constants';
import { colorFactory, ColorScale, colorScaleParser, ColorScaleFunc, DEFAULT_TILE_COLOR } from './utils/style';
import { METRICS, findMinMax, updateMinMax, INITIAL_MIN_MAX, Metric } from './utils/metric';
import { INIT_STATS, calcHttpStat, Stats } from './utils/stats';
import { Preferences, Sidebar, Tooltip, CornerTabs } from './components';
import { comparatorFuncWrapper, filterRangeFuncWrapper, transformFuncWrapper } from './deck-gl';
import { CONSTANT_GEOJSON_LAYER_PROPERTIES, GEOJSON_LAYER_ID, BASEMAP_LAYER_ID } from './deck-gl/constants';
import { basemapLayerFactory } from './deck-gl/basemap';
import { logger } from './logger';
import { client } from './client';
import { MapLibreGL, TargetetEvent } from './deck-gl/types';

export const App: React.FC = () => {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE);
  const [hoverInfo, setHoverInfo] = useState<PickingInfo>();
  const [selectedKit, setSelectedKit] = useState<KitMetadata | undefined>();
  const [stateRange, setStateRange] = useState<number[]>([DEFAULT_MIN_STATE, DEFAULT_MAX_STATE]);
  const [selectedMetric, setSelectedMetric] = useState<Metric | undefined>();
  const [selectedColorScale, setSelectedColorScale] = useState<{ key: ColorScale; value: ColorScaleFunc }>({
    key: 'heat',
    value: colorScaleParser('heat'),
  });
  const [statsTable, setStatsTable] = useState<Stats>(INIT_STATS);
  const [sidebarData, setSidebarData] = useState<TileDetails[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleKitChange = (event: TargetetEvent<string>): void => {
    const kitMetadata = appHelper.kits.find((kit) => kit.name === event.target.value);
    setSelectedKit(kitMetadata);
    if (statsTable.metric) {
      setStatsTable((prevStatsTable) => {
        const nextMetric = prevStatsTable.metric ? { ...prevStatsTable.metric, range: { ...INITIAL_MIN_MAX } } : undefined;
        return { ...prevStatsTable, metric: nextMetric };
      });
    }
    appHelper.shouldOverrideComarator = true;
    setStateRange([DEFAULT_MIN_STATE, kitMetadata ? +kitMetadata[MAX_KIT_STATE_KEY] : DEFAULT_MAX_STATE]);
  };

  const handleKitStateChange = (event: Event, range: number | number[]): void => {
    setStateRange(range as number[]);
  };

  const handleMetricChange = (event: TargetetEvent<string>): void => {
    const index = METRICS.findIndex((metric) => metric.name === event.target.value);
    const metric = METRICS[index];
    setSelectedMetric(metric);
    appHelper.shouldOverrideComarator = true;
  };

  const handleColorScaleChange = (event: TargetetEvent<string>): void => {
    const colorScale = event.target.value as ColorScale;
    setSelectedColorScale({ key: colorScale, value: colorScaleParser(colorScale) });
    appHelper.shouldOverrideComarator = true;
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
    setViewState({ ...viewState, ...nextViewState.viewState });
    // for higher zoom levels lower the viewport's zoom level by 1 to have a buffer around the query bounds
    const viewportZoom = nextViewState.viewState.zoom <= ZOOM_OFFEST + 1 ? nextViewState.viewState.zoom : nextViewState.viewState.zoom - 1;
    appHelper.bounds.query = new WebMercatorViewport({ ...nextViewState.viewState, zoom: viewportZoom }).getBounds();
    appHelper.bounds.actual = new WebMercatorViewport(nextViewState.viewState).getBounds();
    appHelper.shouldOverrideComarator = true;

    const nextZoom = Math.floor(nextViewState.viewState.zoom);
    if (appHelper.currentZoomLevel === nextZoom) {
      return;
    }

    appHelper.currentZoomLevel = nextZoom;
    // reset min-max values between zoom changes
    if (statsTable.metric) {
      setStatsTable((prevStatsTable) => {
        const nextMetric = prevStatsTable.metric ? { ...prevStatsTable.metric, range: { ...INITIAL_MIN_MAX } } : undefined;
        return { ...prevStatsTable, metric: nextMetric };
      });
    }
  };

  const handleOpenSidebar = (data: TileDetails[]): void => {
    setSidebarData(data);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = (): void => {
    setSidebarData([]);
    setIsSidebarOpen(false);
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
    if (selectedMetric === undefined) {
      return;
    }
    setStatsTable((prevStatsTable) => {
      const nextMetric = { ...selectedMetric, range: { ...INITIAL_MIN_MAX } };
      return { ...prevStatsTable, metric: nextMetric };
    });
    appHelper.shouldOverrideComarator = true;
  }, [selectedMetric]);

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

    const timer = setIntervalAsync(kitsFetch, FETCH_KITS_INTERVAL);
    return () => {
      void clearIntervalAsync(timer).then(() => logger.info(`fetch timer cleared`));
    };
  }, []);

  const fetchData = async (): Promise<Feature[] | undefined> => {
    try {
      if (appHelper.bounds.query === undefined || selectedKit === undefined) {
        return;
      }

      const nextDetilerQueryParams: TileQueryParams = {
        minZoom: appHelper.currentZoomLevel + ZOOM_OFFEST,
        maxZoom: appHelper.currentZoomLevel + ZOOM_OFFEST,
        minState: stateRange[0],
        maxState: stateRange[1],
        kits: [selectedKit.name],
        bbox: querifyBounds(appHelper.bounds.query),
      };

      const areQueriesEqual = compareQueries(appHelper.lastDetilerQueryParams, nextDetilerQueryParams);
      if (areQueriesEqual) {
        return;
      }

      appHelper.lastDetilerQueryParams = nextDetilerQueryParams;

      let data: TileDetails[] = [];
      const queryGenerator = client.queryTilesDetailsAsyncGenerator(nextDetilerQueryParams);
      const [, duration] = await timerify(async () => {
        for await (const pageData of queryGenerator) {
          data = [...data, ...pageData];
        }
      });

      const features = parseDataToFeatures(data);

      setStatsTable((prevStatsTable) => {
        const nextHttpStat = calcHttpStat(prevStatsTable.httpInvokes.query, duration);
        return { ...prevStatsTable, httpInvokes: { ...prevStatsTable.httpInvokes, query: nextHttpStat } };
      });

      if (statsTable.metric !== undefined) {
        const currentMinMax = findMinMax(data, statsTable.metric.property);
        if (currentMinMax !== null) {
          updateMinMax(currentMinMax, statsTable.metric);
        }
      }

      return features;
    } catch (err) {
      logger.error({ msg: 'error fetching data', err });
      enqueueSnackbar(JSON.stringify(err), { variant: 'error' });
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
    data: fetchData(),
    dataTransform: transformFuncWrapper(statsTable.metric),
    dataComparator: comparatorFuncWrapper(appHelper, setStatsTable),
    filterRange: filterRangeFuncWrapper(appHelper.currentZoomLevel),
    getFillColor: (tile: Feature<Geometry, { score: number }>): [number, number, number, number] => {
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
        <Map id="map" reuseMaps={true} mapLib={maplibregl as unknown as MapLibreGL} />
        <Tooltip hoverInfo={hoverInfo} />
      </DeckGL>
      <Preferences
        kits={appHelper.kits}
        zoomLevel={appHelper.currentZoomLevel}
        selectedKit={selectedKit}
        stateRange={stateRange}
        selectedMetric={selectedMetric}
        selectedColorScale={selectedColorScale}
        onKitChange={handleKitChange}
        onStateRangeChange={handleKitStateChange}
        onMetricChange={handleMetricChange}
        onColorScaleChange={handleColorScaleChange}
        onGoToClicked={goToCoordinates}
      />
      <CornerTabs statsTableProps={{ stats: statsTable }} overviewMapProps={{ bounds: appHelper.bounds.actual, zoom: appHelper.currentZoomLevel }} />
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} data={sidebarData} onGoToClicked={goToCoordinates} onRefreshClicked={fetchTile} />
    </div>
  );
};
