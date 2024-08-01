import React, { useState } from 'react';
import { Tabs, Tab, Paper } from '@mui/material';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import MapIcon from '@mui/icons-material/Map';
import { StatsTable, OverviewMap } from '.';
import './css/styles.css';

/* eslint-disable @typescript-eslint/no-magic-numbers */
interface CornerTabsProps {
  statsTableProps: Parameters<typeof StatsTable>[0];
  overviewMapProps: Parameters<typeof OverviewMap>[0];
}
/* eslint-enable @typescript-eslint/no-magic-numbers */

export const CornerTabs: React.FC<CornerTabsProps> = ({ statsTableProps: { stats }, overviewMapProps: { bounds, zoom } }) => {
  const [tabId, setTabId] = useState<number>(0);

  const handleTabChange = (_: React.SyntheticEvent, newTabId: number): void => {
    setTabId(newTabId);
  };

  return (
    <div className="common bottom-right-corner">
      <Paper sx={{ p: 0.25, bgcolor: 'background.paper', borderRadius: '4px' }}>
        <Tabs value={tabId} onChange={handleTabChange} aria-label="icon-tabs" centered variant="fullWidth">
          <Tab icon={<QueryStatsIcon fontSize="small" />} aria-label="stats" />
          <Tab icon={<MapIcon fontSize="small" />} aria-label="map" />
        </Tabs>
        <div style={{ height: '32vh', width: '20vw', position: 'relative' }}>
          {tabId === 0 ? <StatsTable stats={stats} /> : <OverviewMap bounds={bounds} zoom={zoom} />}
        </div>
      </Paper>
    </div>
  );
};
