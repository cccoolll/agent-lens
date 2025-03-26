import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addMapMask, getTileGrid } from './MapSetup';
import ChatbotButton from './ChatbotButton';
import MapInteractions from './MapInteractions';
import ControlPanel from './ControlPanel';
import IncubatorControl from './IncubatorControl'; // New import
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';

const ImageDisplay = ({ appendLog, segmentService, microscopeControlService, incubatorControlService }) => {
  const [map, setMap] = useState(null);
  const mapRef = useRef(null); // Reference to the map container
  const effectRan = useRef(false);
  const [vectorLayer, setVectorLayer] = useState(null);
  const [isControlSectionOpen, setIsControlSectionOpen] = useState(false);
  const [isIncubatorControlOpen, setIsIncubatorControlOpen] = useState(false); // New state for incubator control
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
        url: `tile?channel_name=${channelName}&z={z}&x={x}&y={y}`,
        crossOrigin: 'anonymous',
        tileSize: 2048,
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = `tile?channel_name=${channelName}&z=${transformedZ}&x=${tileCoord[1]}&y=${tileCoord[2]}`;
          fetch(newSrc)
            .then(response => response.text())
            .then(data => {
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

  const handleIncubatorControlOpen = async () => {
    setIsIncubatorControlOpen(true);
    if (incubatorControlService) {
      try {
        const temp = await incubatorControlService.get_temperature();
        const co2 = await incubatorControlService.get_co2_level();
        appendLog(`Incubator information updated: Temp ${temp}°C, CO2 ${co2}%`);
      } catch (error) {
        appendLog(`Failed to update incubator information: ${error.message}`);
      }
    }
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
        {/* Incubator Control Button (positioned above the microscope control button) */}
        <button
          onClick={handleIncubatorControlOpen}
          className="absolute bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600"
          style={{ bottom: '70px', right: '10px', fontSize: '24px', width: '30px', height: '30px' }}
        >
          <i className="fas fa-thermometer-half"></i>
        </button>
        <button
          onClick={() => setIsControlSectionOpen(!isControlSectionOpen)}
          className="absolute bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
          style={{ bottom: '10px', right: '10px', fontSize: '24px', width: '30px', height: '30px' }}
        >
          <i className="fas fa-microscope"></i>
        </button>
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
      {isIncubatorControlOpen && (
        <IncubatorControl
          appendLog={appendLog}
          incubatorService={incubatorControlService} // pass incubator service
          onClose={() => setIsIncubatorControlOpen(false)}
        />
      )}
    </>
  );
};

ImageDisplay.propTypes = {
  appendLog: PropTypes.func.isRequired,
  segmentService: PropTypes.object,
  microscopeControlService: PropTypes.object,
  incubatorControlService: PropTypes.object,
};

export default ImageDisplay;
