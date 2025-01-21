import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addMapMask } from './MapSetup';
import MapButton from './MapButton';
import ChatbotButton from './ChatbotButton';
import MapInteractions from './MapInteractions';
import ControlPanel from './ControlPanel';
import { createXYZ } from 'ol/tilegrid';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';

const ImageDisplay = ({ appendLog, segmentService, microscopeControlService, tileService }) => {
  const map = useRef(null);
  const mapRef = useRef(null); // Reference to the map container
  const [vectorLayer, setVectorLayer] = useState(null);
  const [isControlSectionOpen, setIsControlSectionOpen] = useState(false);
  const [snapshotImage, setSnapshotImage] = useState(null);
  const [imageLayer, setImageLayer] = useState(null);

  const imageWidth = 2048;
  const imageHeight = 2048;
  const extent = [0, 0, imageWidth, imageHeight];

  useEffect(() => {
    if (!map.current && mapRef.current) {
      map.current = makeMap(mapRef, extent);
      addTileLayer(map.current, 0);
      addMapMask(map.current, setVectorLayer);
    }
  }, [mapRef]);

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
  }

  // const getTile = async (channelName, z, x, y) => {
  //   const tileBytes = await tileService.get_tile(channelName, z, x, y);
  //   return new Blob([tileBytes]);
  // };
  
  const createTileLoader = (channelName) => async (z, x, y) => {
    const tileBytes = await tileService.get_tile(channelName, z, x, y);
    const blob = new Blob([tileBytes], { type: 'image/png' });
    return blob;
  };
  
  const addTileLayer = (mapCurrent, channelKey) => {
    const channelName = channelNames[channelKey];
  
    if (imageLayer) {
      mapCurrent.removeLayer(imageLayer);
    }
    const tileLayer = new TileLayer({
      source: new XYZ({
        url: `https://hypha.aicell.io/squid-control/services/tile-streaming-whole-view/get_tile?channel_name=${channelName}&z={z}&x={x}&y={y}`,
        crossOrigin: 'anonymous',
        tileSize: 256,
        maxZoom: 10,
        imageLoadFunction: function(image, src) {
          image.getImage().src = src;
          image.getImage().onerror = function() {
            console.log(`Failed to load tile: ${src}`);
          };
        }
      }),
    });
  
    mapCurrent.addLayer(tileLayer);
    setImageLayer(tileLayer);
  };

  return (
    <>
      <div className="relative top-0 left-0 w-full h-screen bg-gray-100 flex items-center justify-center overflow-hidden">
        <div ref={mapRef} className="w-full h-full"></div>
        <MapInteractions segmentService={segmentService} snapshotImage={snapshotImage} mapCurrent={map.current} extent={extent} appendLog={appendLog} vectorLayer={vectorLayer} />
        <MapButton onClick={() => setIsControlSectionOpen(!isControlSectionOpen)} icon="fa-cog" bottom="10" right="10" />
        <ChatbotButton microscopeControlService={microscopeControlService} appendLog={appendLog} bottom="10" />
      </div>
      {isControlSectionOpen && (
        <ControlPanel
          mapCurrent={map.current}
          setSnapshotImage={setSnapshotImage}
          microscopeControlService={microscopeControlService}
          segmentService={segmentService}
          appendLog={appendLog}
          addTileLayer={addTileLayer}
          channelNames={channelNames}
          vectorLayer={vectorLayer}
        />
      )}
    </>
  );
};

ImageDisplay.propTypes = {
  appendLog: PropTypes.func.isRequired,
  segmentService: PropTypes.object,
  microscopeControlService: PropTypes.object,
  tileService: PropTypes.object,
};

export default ImageDisplay;