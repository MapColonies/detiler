import React from 'react';
import './css/common.css';
import { PickingInfo } from '@deck.gl/core/src/lib/picking/pick-info';
import { Feature } from '@turf/helpers';
import { CalculatedDetail, Detail, presentifyValue, TIMESTAMP_DETAIL } from '../utils/metric';

const TOOLTIP_PROPERTIES: (Detail | CalculatedDetail)[] = [
  'z',
  'x',
  'y',
  'kit',
  'state',
  'createdAt',
  'updateCount',
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
      className="common tooltip"
      style={{
        left: hoverInfo.x,
        top: hoverInfo.y,
      }}
    >
      {hoverInfo.object.properties && (
        <ul>
          {Object.entries(hoverInfo.object.properties)
            .filter(([key]) => TOOLTIP_PROPERTIES.includes(key as Detail))
            .map(([key, value]) => (
              <li key={key}>
                {`${key}: `}
                {typeof value === 'number' || typeof value === 'undefined'
                  ? presentifyValue(value, TIMESTAMP_DETAIL.includes(key as Detail) ? 'date' : 'string')
                  : value}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};
