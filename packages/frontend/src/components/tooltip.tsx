import React from 'react';
import './css/styles.css';
import { PickingInfo } from '@deck.gl/core/src/lib/picking/pick-info';
import { Feature } from '@turf/helpers';
import { Divider, List, ListItem, ListItemText } from '@mui/material';
import { CalculatedDetail, Detail, presentifyValue, TIMESTAMP_DETAIL } from '../utils/metric';

const TOOLTIP_PROPERTIES: (Detail | CalculatedDetail)[] = [
  'z',
  'x',
  'y',
  'kit',
  'state',
  'createdAt',
  'updateCount',
  'skipCount',
  'updatedAt',
  'coordinates',
  'score',
];

interface TooltipProps {
  hoverInfo?: PickingInfo<Feature>;
}

export const Tooltip: React.FC<TooltipProps> = ({ hoverInfo }) => {
  if (hoverInfo?.object === undefined) {
    return null;
  }

  return (
    <div
      className="common"
      style={{
        left: hoverInfo.x,
        top: hoverInfo.y,
      }}
    >
      {hoverInfo.object.properties && (
        <List sx={{ bgcolor: 'background.paper', color: 'text.primary', maxWidth: 360, borderRadius: 2, padding: '5px' }}>
          {Object.entries(hoverInfo.object.properties)
            .filter(([key]) => TOOLTIP_PROPERTIES.includes(key as Detail))
            .map(([key, value]) => (
              <div>
                <ListItem key={key} alignItems="flex-start" disablePadding={true} sx={{ padding: '1px' }}>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: '12px' }}
                    primary={
                      typeof value === 'number' || typeof value === 'undefined'
                        ? `${key}: ${presentifyValue(value, TIMESTAMP_DETAIL.includes(key as Detail) ? 'date' : 'string')}`
                        : `${key}: ${value}`
                    }
                  ></ListItemText>
                </ListItem>
                <Divider variant="inset" component="li" />
              </div>
            ))}
        </List>
      )}
    </div>
  );
};
