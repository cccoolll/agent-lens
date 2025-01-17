import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, TileLayer, addMapMask } from './MapSetup';
import MapButton from './MapButton';
import ChatbotButton from './ChatbotButton';
import MapInteractions from './MapInteractions';
import ControlPanel from './ControlPanel';
import XYZ from 'ol/source/XYZ';

const ImageDisplay = ({ appendLog, segmentService, microscopeControlService }) => {
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
      addTileLayer(map.current, extent, 0);
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

  const channelKeyMap = {
    0: "BF",
    11: 405,
    12: 488,
    14: 561,
    13: 638,
    15: 730,
  };
  
  const addTileLayer = (mapCurrent, channelKey) => {
    const channelName = channelKeyMap[channelKey];
  
    if (imageLayer) {
      mapCurrent.removeLayer(imageLayer);
    }
  
    // TODO:
    // const tileUrl = isLocal()
    //   ? `${window.location.protocol}//${window.location.hostname}:9000/public/apps/microscope-control/tiles`
    //   : "https://hypha.aicell.io/agent-lens/apps/microscope-control/tiles";
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
          microscopeControl={microscopeControlService}
          segmentService={segmentService}
          appendLog={appendLog}
          addTileLayer={addTileLayer}
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