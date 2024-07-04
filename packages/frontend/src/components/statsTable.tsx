import React from 'react';
import './css/styles.css';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { presentifyValue, TIMESTAMP_DETAIL } from '../utils/metric';
import { Stats } from '../utils/stats';

const DIGITS_AFTER_DECIMAL = 2;

const TABLE_ROW_SX = '&:last-child td, &:last-child th';

interface StatsTableProps {
  stats: Stats;
}

function createData(stat: string, value: string, average?: number): { prop: string; value: string; average: string } {
  const averageResult = average !== undefined ? average.toFixed(DIGITS_AFTER_DECIMAL).toString() : '';
  return { prop: stat, value, average: averageResult };
}

export const StatsTable: React.FC<StatsTableProps> = ({ stats }) => {
  const { metric, httpInvokes, ...basicStats } = stats;

  const rows = [
    createData('Currently Rendered Tiles', basicStats.currentlyRenderedTiles.toString()),
    createData('Total Tiles Rendered', basicStats.totalTilesRendered.toString()),
    createData('Unique Tiles Rendered', basicStats.uniqueTilesRendered.size.toString()),
    createData('Map Renders Count', basicStats.mapRendersCount.toString()),
    createData('Metric Min Value', metric ? presentifyValue(metric.range.min, TIMESTAMP_DETAIL.includes(metric.property) ? 'date' : 'string') : ''),
    createData('Metric Max Value', metric ? presentifyValue(metric.range.max, TIMESTAMP_DETAIL.includes(metric.property) ? 'date' : 'string') : ''),
    createData('HTTP Invokes - Query', httpInvokes.query.count.toString(), httpInvokes.query.average),
    createData('HTTP Invokes - Kits', httpInvokes.kits.count.toString(), httpInvokes.kits.average),
    createData('HTTP Invokes - Tile', httpInvokes.tile.count.toString(), httpInvokes.tile.average),
  ];

  return (
    <div className="common stats">
      <TableContainer component={Paper}>
        <Table size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>Stat</TableCell>
              <TableCell align="right">Avg(ms)</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.prop} sx={{ [TABLE_ROW_SX]: { border: 0 } }}>
                <TableCell component="th" scope="row">
                  {row.prop}
                </TableCell>
                <TableCell align="right">{row.average}</TableCell>
                <TableCell align="right">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
