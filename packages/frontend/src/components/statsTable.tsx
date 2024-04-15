import React from 'react';
import './css/common.css';
import { presentifyValue, TIMESTAMP_DETAIL } from '../utils/metric';
import { Stats } from '../utils/stats';

const DIGITS_AFTER_DECIMAL = 2;

interface StatsTableProps {
  stats: Stats;
}

export const StatsTable: React.FC<StatsTableProps> = ({ stats }) => {
  const { metric, httpInvokes, ...basicStats } = stats;

  return (
    <div className="common stats">
      <table>
        <tbody>
          <tr>
            <td>Currently Rendered Tiles:</td>
            <td>{basicStats.currentlyRenderedTiles}</td>
          </tr>
          <tr>
            <td>Total Tiles Rendered:</td>
            <td>{basicStats.totalTilesRendered}</td>
          </tr>
          <tr>
            <td>Unique Tiles Rendered:</td>
            <td>{basicStats.uniqueTilesRendered.size}</td>
          </tr>
          <tr>
            <td>Map Renders Count:</td>
            <td>{basicStats.mapRendersCount}</td>
          </tr>
          {metric?.range && (
            <tr>
              <td>Metric Min Value:</td>
              <td>{presentifyValue(metric.range.min, TIMESTAMP_DETAIL.includes(metric.property) ? 'date' : 'string')}</td>
            </tr>
          )}
          {metric?.range && (
            <tr>
              <td>Metric Max Value:</td>
              <td>{presentifyValue(metric.range.max, TIMESTAMP_DETAIL.includes(metric.property) ? 'date' : 'string')}</td>
            </tr>
          )}
          <tr>
            <td>HTTP Invokes - Query:</td>
            <td>{httpInvokes.query.count}</td>
            <td>{httpInvokes.query.average?.toFixed(DIGITS_AFTER_DECIMAL) ?? 0}ms</td>
          </tr>
          <tr>
            <td>HTTP Invokes - Kits:</td>
            <td>{httpInvokes.kits.count}</td>
            <td>{httpInvokes.kits.average?.toFixed(DIGITS_AFTER_DECIMAL) ?? 0}ms</td>
          </tr>
          <tr>
            <td>HTTP Invokes - Tile:</td>
            <td>{httpInvokes.tile.count}</td>
            <td>{httpInvokes.tile.average?.toFixed(DIGITS_AFTER_DECIMAL) ?? 0}ms</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
