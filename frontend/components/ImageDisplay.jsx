import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addMapMask, getTileGrid } from './MapSetup';
import MapButton from './MapButton';
import ChatbotButton from './ChatbotButton';
import MapInteractions from './MapInteractions';
import ControlPanel from './ControlPanel';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';

const ImageDisplay = ({ appendLog, segmentService, microscopeControlService }) => {
  const [map, setMap] = useState(null);
  const mapRef = useRef(null); // Reference to the map container
  const effectRan = useRef(false);
  const [vectorLayer, setVectorLayer] = useState(null);
  const [isControlSectionOpen, setIsControlSectionOpen] = useState(false);
  const [snapshotImage, setSnapshotImage] = useState(null);
  const [imageLayer, setImageLayer] = useState(null);

  const imageWidth = 2048;
  const imageHeight = 2048;
  const extent = [0, 0, imageWidth, imageHeight];

  useEffect(() => {
    if (!map && mapRef.current && !effectRan.current) {
      const newMap = makeMap(mapRef, extent);
      setMap(newMap);
      addTileLayer(newMap, 0);
      addMapMask(newMap, setVectorLayer);
      effectRan.current = true;
    }

    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, [mapRef.current]);

  useEffect(() => {
    return () => {
      if (snapshotImage) {
        URL.revokeObjectURL(snapshotImage);
      }
    };
  }, [snapshotImage]);

  const channelNames = {
    0: 'BF_LED_matrix_full',
    11: 'Fluorescence_405_nm_Ex',
    12: 'Fluorescence_488_nm_Ex',
    14: 'Fluorescence_561_nm_Ex',
    13: 'Fluorescence_638_nm_Ex'
  };
  
  const addTileLayer = (map, channelKey) => {
    const channelName = channelNames[channelKey];
    console.log(map);
  
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }

    const tileLayer = new TileLayer({
      source: new XYZ({
        // Use a relative URL (without initial slash) so that the endpoint is resolved
        // relative to the current mount path of the frontend service.
        url: `tile?channel_name=${channelName}&z={z}&x={x}&y={y}`,
        crossOrigin: 'anonymous',
        tileSize: 2048,
        maxZoom: 4,
        tileGrid: getTileGrid(), // new: use custom tile grid
        tileLoadFunction: function(tile, src) {
          // Modified: Invert z before fetching
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = `tile?channel_name=${channelName}&z=${transformedZ}&x=${tileCoord[1]}&y=${tileCoord[2]}`;
          fetch(newSrc)
            .then(response => response.text())
            .then(data => {
              // Trim any surrounding quotes from the data before setting it as an image src.
              const trimmed = data.replace(/^"|"$/g, '');
              tile.getImage().src = `data:image/png;base64,${trimmed}`;
              console.log(`Loaded tile at location: ${newSrc}`);
            })
            .catch(error => {
              console.log(`Failed to load tile: ${newSrc}`, error);
            });
        }
      }),
    });
  
    map.addLayer(tileLayer);
    setImageLayer(tileLayer);
  };

  return (
    <>
      <div className="relative top-0 left-0 w-full h-screen bg-gray-100 flex items-center justify-center overflow-hidden">
        <div ref={mapRef} className="w-full h-full"></div>
        <MapInteractions
          segmentService={segmentService}
          snapshotImage={snapshotImage}
          map={map}
          extent={extent}
          appendLog={appendLog}
          vectorLayer={vectorLayer}
          channelNames={channelNames}
          addTileLayer={addTileLayer}
        />
        <MapButton onClick={() => setIsControlSectionOpen(!isControlSectionOpen)} icon="fa-cog" bottom="10" right="10" />
        <ChatbotButton microscopeControlService={microscopeControlService} appendLog={appendLog} bottom="10" />
      </div>
      {isControlSectionOpen && (
        <ControlPanel
          map={map}
          setSnapshotImage={setSnapshotImage}
          snapshotImage={snapshotImage}
          microscopeControlService={microscopeControlService}
          segmentService={segmentService}
          appendLog={appendLog}
          addTileLayer={addTileLayer}
          channelNames={channelNames}
          vectorLayer={vectorLayer}
          onClose={() => setIsControlSectionOpen(false)}
        />
      )}
    </>
  );
};

ImageDisplay.propTypes = {
  appendLog: PropTypes.func.isRequired,
  segmentService: PropTypes.object,
  microscopeControlService: PropTypes.object,
};

export default ImageDisplay;