import React, { useState } from 'react';
import { Backdrop, Box, Modal, Fade, Button, Typography, TextField, Stack } from '@mui/material';
import { TILEGRID_WORLD_CRS84, validateLonlat, tileToBoundingBox, validateTile } from '@map-colonies/tile-calc';
import { enqueueSnackbar } from 'notistack';
import { bboxToLonLat } from '../utils/helpers';
import { ZOOM_OFFEST } from '../utils/constants';

const METATILE_SIZE = 8;
const INVALID_TILE_MESSAGE = 'Given tile is invalid.';
const INVALID_COORDINATES_MESSAGE = 'Given coordinates are invalid.';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  color: 'text.primary',
  boxShadow: 24,
  p: 4,
};

interface GoToModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToClicked: (longitude: number, latitude: number, zoom?: number) => void;
}

export const GoToModal: React.FC<GoToModalProps> = ({ isOpen, onClose, onGoToClicked }) => {
  if (!isOpen) {
    return null;
  }

  const [longitude, setLongitude] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [z, setZ] = useState<string>('');
  const [x, setX] = useState<string>('');
  const [y, setY] = useState<string>('');

  const handleGoToTileClick = () => {
    try {
      const zValue = parseInt(z, 10);
      const xValue = parseInt(x, 10);
      const yValue = parseInt(y, 10);

      if (Number.isNaN(zValue) || Number.isNaN(xValue) || Number.isNaN(yValue)) {
        throw Error('could not parse tile');
      }

      const tile = { z: zValue, x: xValue, y: yValue, metatile: METATILE_SIZE };
      validateTile(tile, TILEGRID_WORLD_CRS84);
      const bbox = tileToBoundingBox(tile, TILEGRID_WORLD_CRS84, true);

      const { lon, lat } = bboxToLonLat(bbox);

      validateLonlat({ lon, lat }, TILEGRID_WORLD_CRS84);

      onGoToClicked(lon, lat, zValue - ZOOM_OFFEST);
      onClose();
    } catch (err) {
      enqueueSnackbar(INVALID_TILE_MESSAGE, { variant: 'error' });
    }
  };

  const handleGoToCoordinatesClick = () => {
    try {
      const lon = parseFloat(longitude);
      const lat = parseFloat(latitude);

      if (Number.isNaN(lon) || Number.isNaN(lat)) {
        throw Error('could not parse coordinates');
      }

      validateLonlat({ lon, lat }, TILEGRID_WORLD_CRS84);

      onGoToClicked(lon, lat);
      onClose();
    } catch (err) {
      enqueueSnackbar(INVALID_COORDINATES_MESSAGE, { variant: 'error' });
    }
  };

  return (
    <div>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={isOpen}
        onClose={onClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={isOpen}>
          <Box sx={style}>
            <Typography id="transition-modal-title" variant="h6" component="h2">
              Go To Tile / Coordinates
            </Typography>
            <br />
            <Stack direction="column" spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <TextField id="zTextField" label="z" variant="outlined" value={z} onChange={(e) => setZ(e.target.value)} />
                <TextField id="xTextField" label="x" variant="outlined" value={x} onChange={(e) => setX(e.target.value)} />
                <TextField id="yTextField" label="y" variant="outlined" value={y} onChange={(e) => setY(e.target.value)} />
                <Button variant="contained" onClick={handleGoToTileClick}>
                  Go
                </Button>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <TextField
                  id="longitudeTextField"
                  label="longitude"
                  variant="outlined"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
                <TextField
                  id="latitudeTextField"
                  label="latitude"
                  variant="outlined"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
                <Button variant="contained" onClick={handleGoToCoordinatesClick}>
                  Go
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
};
