import React, { useState, useEffect } from 'react';
import { Map } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { WebMercatorViewport } from '@deck.gl/core';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { ViewStateChangeParameters } from '@deck.gl/core/src/controllers/controller';
import { PickingInfo } from '@deck.gl/core/src/lib/picking/pick-info';
import { Feature, Geometry } from 'geojson';
import pino from 'pino';
import { differenceWith } from 'lodash';
import { DetilerClient, DetilerClientConfig } from '@map-colonies/detiler-client';
import { TileDetails, TileParams, TileQueryParams } from '@map-colonies/detiler-common';
import { LoggerOptions } from '@map-colonies/js-logger';
import { ToastContainer, toast } from 'react-toastify';
import { setIntervalAsync } from 'set-interval-async';
import { compareQueries, parseDataToFeatures, timerify, querifyBounds, removeDummyFeature } from './utils/helpers';
import { ZOOM_OFFEST, FETCH_KITS_INTERVAL, INITIAL_VIEW_STATE, TOAST_AUTO_CLOSE_MS } from './utils/constants';
import { colorFactory, ColorScale, colorScaleParser, ColorScaleFunc, DEFAULT_TILE_COLOR } from './utils/style';
import { METRICS, findMinMax, updateMinMax, INITIAL_MIN_MAX, Metric } from './utils/metric';
import { INIT_STATS, calcHttpStat, Stats } from './utils/stats';
import { Preferences, Sidebar, StatsTable, Tooltip, ColorMode } from './components';
import { filterRangeFuncWrapper, transformFuncWrapper } from './deck-gl';
import { CONSTANT_GEOJSON_LAYER_PROPERTIES } from './deck-gl/constants';
import { basemapLayer } from './deck-gl/basemap';
import { config } from './config';
import { MapLibreGL, TargetetEvent } from './deck-gl/types';

const detilerConfig = config.get<DetilerClientConfig>('client');
const loggerConfig = config.get<LoggerOptions>('telemetry.logger');

const logger = pino({ ...loggerConfig, browser: { asObject: true } });
let kits: string[] = [];
let currentZoomLevel = ZOOM_OFFEST;
let currentBounds: [number, number, number, number] | undefined = undefined;
let lastDetilerQueryParams: TileQueryParams;
let overrideComparator = false;

const client = new DetilerClient({ ...detilerConfig, logger: logger.child({ subComponent: 'detilerClient' }) });

export const App: React.FC = () => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [hoverInfo, setHoverInfo] = useState<PickingInfo>();
  const [selectedKit, setSelectedKit] = useState<string | undefined>();
  const [selectedMetric, setSelectedMetric] = useState<Metric | undefined>();
  const [selectedColorScale, setSelectedColorScale] = useState<{ key: ColorScale; value: ColorScaleFunc }>({
    key: 'virdis',
    value: colorScaleParser('virdis'),
  });
  const [statsTable, setStatsTable] = useState<Stats>(INIT_STATS);
  const [sidebarData, setSidebarData] = useState<TileDetails[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const handleKitChange = (event: TargetetEvent<string>): void => {
    setSelectedKit(event.target.value);
    if (statsTable.metric) {
      setStatsTable((prevStatsTable) => {
        const nextMetric = prevStatsTable.metric ? { ...prevStatsTable.metric, range: { ...INITIAL_MIN_MAX } } : undefined;
        return { ...prevStatsTable, metric: nextMetric };
      });
    }
    overrideComparator = true;
  };

  const handleMetricChange = (event: TargetetEvent<string>): void => {
    const index = METRICS.findIndex((metric) => metric.name === event.target.value);
    const metric = METRICS[index];
    setSelectedMetric(metric);
    overrideComparator = true;
  };

  const handleColorScaleChange = (event: TargetetEvent<string>): void => {
    const colorScale = event.target.value as ColorScale;
    setSelectedColorScale({ key: colorScale, value: colorScaleParser(colorScale) });
    overrideComparator = true;
  };

  const handleViewportChange = (nextViewState: ViewStateChangeParameters<{ zoom: number }>): void => {
    setViewState({ ...viewState, ...nextViewState });
    // for higher zoom levels lower the viewport's zoom level by 1 to have a buffer around the query bounds
    const viewportZoom = nextViewState.viewState.zoom <= ZOOM_OFFEST + 1 ? nextViewState.viewState.zoom : nextViewState.viewState.zoom - 1;
    const webMercatorViewport = new WebMercatorViewport({ ...nextViewState.viewState, zoom: viewportZoom });
    currentBounds = webMercatorViewport.getBounds();
    overrideComparator = true;

    const nextZoom = Math.floor(nextViewState.viewState.zoom);
    if (currentZoomLevel === nextZoom) {
      return;
    }

    currentZoomLevel = nextZoom;
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
    if (selectedMetric === undefined) {
      return;
    }
    setStatsTable((prevStatsTable) => {
      const nextMetric = { ...selectedMetric, range: { ...INITIAL_MIN_MAX } };
      return { ...prevStatsTable, metric: nextMetric };
    });
    overrideComparator = true;
  }, [selectedMetric]);

  useEffect(() => {
    async function kitsFetch(): Promise<void> {
      try {
        const [result, duration] = await timerify<Awaited<ReturnType<typeof client.getKits>>, never[]>(client.getKits.bind(client));
        kits = result;
        setStatsTable((prevStatsTable) => {
          const nextHttpStat = calcHttpStat(prevStatsTable.httpInvokes.kits, duration);
          return { ...prevStatsTable, httpInvokes: { ...prevStatsTable.httpInvokes, kits: nextHttpStat } };
        });
      } catch (err) {
        logger.error({ msg: 'error fetching kits', err });
        // const theme = useTheme();
        // toast.error(JSON.stringify(err), { style: toastStyle(theme.palette.mode)});
        toast.error(JSON.stringify(err));
      }
    }
    void kitsFetch();
    setIntervalAsync(kitsFetch, FETCH_KITS_INTERVAL);
  }, []);

  const fetchData = async (): Promise<Feature[] | undefined> => {
    try {
      if (currentBounds === undefined || selectedKit === undefined) {
        return;
      }

      const nextDetilerQueryParams: TileQueryParams = {
        minZoom: currentZoomLevel + ZOOM_OFFEST,
        maxZoom: currentZoomLevel + ZOOM_OFFEST,
        kits: [selectedKit],
        bbox: querifyBounds(currentBounds),
      };

      const areQueriesEqual = compareQueries(lastDetilerQueryParams, nextDetilerQueryParams);
      if (areQueriesEqual) {
        return;
      }

      lastDetilerQueryParams = nextDetilerQueryParams;

      let data: TileDetails[] = [];
      const queryGenerator = client.queryTilesDetailsAsyncGenerator(nextDetilerQueryParams);
      const [, duration] = await timerify(async () => {
        for await (const pageData of queryGenerator) {
          data = [...data, ...pageData];
        }
      });

      setStatsTable((prevStatsTable) => {
        const nextHttpStat = calcHttpStat(prevStatsTable.httpInvokes.query, duration);
        return { ...prevStatsTable, httpInvokes: { ...prevStatsTable.httpInvokes, query: nextHttpStat } };
      });

      const features = parseDataToFeatures(data);

      if (statsTable.metric !== undefined) {
        const currentMinMax = findMinMax(data, statsTable.metric.property);
        if (currentMinMax !== null) {
          updateMinMax(currentMinMax, statsTable.metric);
        }
      }

      return features;
    } catch (err) {
      logger.error({ msg: 'error fetching data', err });
      // const theme = useTheme();
      // toast.error(JSON.stringify(err), { style: toastStyle(theme.palette.mode)});
      toast.error(JSON.stringify(err));
    }
  };

  const layer = new GeoJsonLayer({
    ...CONSTANT_GEOJSON_LAYER_PROPERTIES,
    data: fetchData(),
    dataTransform: transformFuncWrapper(statsTable.metric),
    dataComparator: (nextData: Feature[], prevData: Feature[]): boolean => {
      let shouldSkipRedering = false;
      // render if override flag is enabled or next data is greater than prev
      if (overrideComparator || prevData.length < nextData.length) {
        overrideComparator = false;
      } else {
        // render if new data is not contained in prev data
        const comparator = (tile1: Feature, tile2: Feature): boolean => tile1.properties?.id === tile2.properties?.id;
        const difference = differenceWith(nextData, prevData, comparator);
        shouldSkipRedering = difference.length === 0;
      }

      if (!shouldSkipRedering) {
        removeDummyFeature(nextData);

        setStatsTable((prevStatsTable) => {
          const nextMapRendersCount = prevStatsTable.mapRendersCount + 1;
          const nextRenderedTiles = (prevStatsTable.currentlyRenderedTiles = nextData.length);
          const nextTotalTilesRendered = (prevStatsTable.totalTilesRendered += nextData.length);
          const nextUniqueTilesRendered = new Set(prevStatsTable.uniqueTilesRendered);
          const newIds: string[] = nextData.map((tile) => tile.properties?.id as string);
          newIds.forEach((id) => nextUniqueTilesRendered.add(id));
          return {
            ...prevStatsTable,
            currentlyRenderedTiles: nextRenderedTiles,
            mapRendersCount: nextMapRendersCount,
            totalTilesRendered: nextTotalTilesRendered,
            uniqueTilesRendered: nextUniqueTilesRendered,
          };
        });
      }

      return shouldSkipRedering;
    },
    filterRange: filterRangeFuncWrapper(currentZoomLevel),
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
      try {
        const [result, duration] = await timerify<Awaited<ReturnType<typeof client.getTilesDetails>>, [TileParams]>(
          client.getTilesDetails.bind(client),
          {
            z,
            x,
            y,
          }
        );
        setStatsTable((prevStatsTable) => {
          const nextHttpStat = calcHttpStat(prevStatsTable.httpInvokes.tile, duration);
          return { ...prevStatsTable, httpInvokes: { ...prevStatsTable.httpInvokes, tile: nextHttpStat } };
        });
        handleOpenSidebar(result);
      } catch (err) {
        logger.error({ msg: 'error getting tile details', err });
        // const theme = useTheme();
        // toast.error(JSON.stringify(err), { style: toastStyle(theme.palette.mode)});
        toast.error(JSON.stringify(err));
      }
    },
  });

  return (
    <ColorMode>
      <div>
        <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={[basemapLayer, layer]} onViewStateChange={handleViewportChange}>
          <Map id="map" reuseMaps mapLib={maplibregl as unknown as MapLibreGL} />
          <Tooltip hoverInfo={hoverInfo} />
        </DeckGL>
        <Preferences
          kits={kits}
          zoomLevel={currentZoomLevel}
          selectedKit={selectedKit}
          selectedMetric={selectedMetric}
          selectedColorScale={selectedColorScale}
          onKitChange={handleKitChange}
          onMetricChange={handleMetricChange}
          onColorScaleChange={handleColorScaleChange}
        />
        <StatsTable stats={statsTable} />
        <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} data={sidebarData} />
        <ToastContainer position="bottom-center" autoClose={TOAST_AUTO_CLOSE_MS} />
      </div>
    </ColorMode>
  );
};
