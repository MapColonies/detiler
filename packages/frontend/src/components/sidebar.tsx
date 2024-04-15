import { TileDetails } from '@map-colonies/detiler-common';
import React from 'react';
import './css/sidebar.css';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaRegCopy as CopyIcon } from 'react-icons/fa';
import { parse as WktToGeojson } from 'wellknown';
import { presentifyValue } from '../utils/metric';
import { TOAST_AUTO_CLOSE_MS } from '../utils/constants';

const SUCCESS_COPY_MESSAGE = 'Copied to Clipboard';

interface SidebarProps {
  isOpen: boolean;
  data: TileDetails[];
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, data, onClose }) => {
  if (!isOpen) {
    return null;
  }

  const onCopy = (_: string, result: boolean): void => {
    if (!result) {
      return;
    }
    toast.success(SUCCESS_COPY_MESSAGE);
  };

  return (
    <div className="sidebar">
      <button className="close-button" onClick={onClose}>
        x
      </button>
      <div className="sidebar-content">
        <h2>
          Tile: {data[0].z}/{data[0].x}/{data[0].y}
        </h2>
        <p>
          (present in {data.length} kit{data.length === 1 ? '' : 's'})
        </p>
        <p>{data[0].geoshape}</p>
        {data.map((tile) => (
          <div key={`${tile.kit}/${tile.z}/${tile.x}/${tile.y}`} className="tile-details">
            <p>Kit: {tile.kit}</p>
            <p>State: {tile.state}</p>
            <p>Created At: {presentifyValue(tile.createdAt, 'date')}</p>
            <p>Updated At: {presentifyValue(tile.updatedAt, 'date')}</p>
            <p>Update Count: {tile.updateCount}</p>
            <CopyToClipboard text={JSON.stringify({ ...tile, geojson: WktToGeojson(tile.geoshape) })} onCopy={onCopy}>
              <button>
                <CopyIcon />
              </button>
            </CopyToClipboard>
          </div>
        ))}
      </div>
      <ToastContainer position="bottom-center" autoClose={TOAST_AUTO_CLOSE_MS} />
    </div>
  );
};
