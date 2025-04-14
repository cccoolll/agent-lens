import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addMapMask, getTileGrid } from './MapSetup';
import MapInteractions from './MapInteractions';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';
import MicroscopeControlPanel from './MicroscopeControlPanel';

const ImageDisplay = ({ appendLog, segmentService, microscopeControlService, incubatorControlService, setCurrentMap }) => {
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const effectRan = useRef(false);
  const [vectorLayer, setVectorLayer] = useState(null);
  const [snapshotImage, setSnapshotImage] = useState(null);
  const [imageLayer, setImageLayer] = useState(null);
  const [isMapViewEnabled, setIsMapViewEnabled] = useState(false);
  const [mapDatasetId, setMapDatasetId] = useState(null);
  const [timepoints, setTimepoints] = useState([]);
  const [selectedTimepoint, setSelectedTimepoint] = useState(null);
  const [isLoadingTimepoints, setIsLoadingTimepoints] = useState(false);
  const [showTimepointSelector, setShowTimepointSelector] = useState(false);
  const [shouldShowMap, setShouldShowMap] = useState(false);

  const imageWidth = 2048;
  const imageHeight = 2048;
  const extent = [0, 0, imageWidth, imageHeight];

  useEffect(() => {
    // Check if an image map dataset has been set up in this session
    const imageMapDataset = localStorage.getItem('imageMapDataset');
    const wasExplicitlySetup = sessionStorage.getItem('mapSetupExplicit') === 'true';
    
    if (imageMapDataset && wasExplicitlySetup) {
      setMapDatasetId(imageMapDataset);
      setIsMapViewEnabled(true);
      setShouldShowMap(true);
      appendLog(`Image map dataset found: ${imageMapDataset}`);
    }
  }, []);

  // Effect to load timepoints when we should show the map
  useEffect(() => {
    if (shouldShowMap && mapDatasetId && !timepoints.length) {
      loadTimepoints(mapDatasetId);
    }
  }, [shouldShowMap, mapDatasetId]);

  useEffect(() => {
    if (!map && mapRef.current && !effectRan.current) {
      const newMap = makeMap(mapRef, extent);
      setMap(newMap);
      setCurrentMap(newMap);
      
      // Always add map mask regardless
      addMapMask(newMap, setVectorLayer);
      effectRan.current = true;
      
      // Load the default tile layer initially
      // We'll replace it with the map view if needed
      addTileLayer(newMap, 0);
    }

    return () => {
      if (map) {
        map.setTarget(null);
        setCurrentMap(null);
      }
    };
  }, [mapRef.current]);

  // Effect to update the map when timepoints are loaded
  useEffect(() => {
    if (map && shouldShowMap && timepoints.length > 0 && !selectedTimepoint) {
      // When timepoints are loaded and we should show the map, load the first timepoint
      loadTimepointMap(timepoints[0].name);
    }
  }, [map, shouldShowMap, timepoints]);

  useEffect(() => {
    return () => {
      if (snapshotImage) {
        URL.revokeObjectURL(snapshotImage);
      }
    };
  }, [snapshotImage]);

  const loadTimepoints = async (datasetId) => {
    if (!datasetId) return;
    
    setIsLoadingTimepoints(true);
    try {
      const response = await fetch(`/public/apps/agent-lens/list-timepoints?dataset_id=${datasetId}`);
      const data = await response.json();
      
      if (data.success && data.timepoints.length > 0) {
        setTimepoints(data.timepoints);
        appendLog(`Loaded ${data.timepoints.length} timepoints for dataset ${datasetId}`);
      } else {
        appendLog(`No timepoints found for dataset ${datasetId}`);
      }
    } catch (error) {
      appendLog(`Error loading timepoints: ${error.message}`);
    } finally {
      setIsLoadingTimepoints(false);
    }
  };

  const loadTimepointMap = (timepoint) => {
    if (!timepoint || !mapDatasetId || !map) return;
    
    appendLog(`Loading map for timepoint: ${timepoint}`);
    setSelectedTimepoint(timepoint);
    
    // Remove any existing layers
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }
    
    // Create a new tile layer for the selected timepoint
    const newTileLayer = new TileLayer({
      source: new XYZ({
        url: `tile-for-timepoint?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channel_name=BF_LED_matrix_full&z={z}&x={x}&y={y}`,
        crossOrigin: 'anonymous',
        tileSize: 2048,
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = `tile-for-timepoint?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channel_name=BF_LED_matrix_full&z=${transformedZ}&x=${tileCoord[1]}&y=${tileCoord[2]}`;
          fetch(newSrc)
            .then(response => response.text())
            .then(data => {
              const trimmed = data.replace(/^"|"$/g, '');
              tile.getImage().src = `data:image/png;base64,${trimmed}`;
              console.log(`Loaded timepoint tile at: ${newSrc}`);
            })
            .catch(error => {
              console.log(`Failed to load timepoint tile: ${newSrc}`, error);
            });
        }
      }),
    });
  
    map.addLayer(newTileLayer);
    setImageLayer(newTileLayer);
  };

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

  const toggleTimepointSelector = () => {
    // If this is the first time showing the selector and we haven't loaded timepoints yet
    if (!showTimepointSelector && timepoints.length === 0 && mapDatasetId) {
      loadTimepoints(mapDatasetId);
    }
    
    setShowTimepointSelector(!showTimepointSelector);
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
        
        {/* Image Map Time Point Selector */}
        {isMapViewEnabled && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center">
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-l text-sm flex items-center" 
              onClick={toggleTimepointSelector}
              disabled={isLoadingTimepoints}
            >
              {isLoadingTimepoints ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i> Loading...
                </>
              ) : (
                <>
                  <i className="fas fa-clock mr-2"></i>
                  {showTimepointSelector ? 'Hide Timepoints' : 'Select Timepoint'}
                </>
              )}
            </button>
            {selectedTimepoint && (
              <div className="bg-white px-4 py-2 rounded-r border-l border-blue-300 text-sm">
                Current: {selectedTimepoint}
              </div>
            )}
          </div>
        )}
        
        {/* Time Point Selection Dropdown */}
        {isMapViewEnabled && showTimepointSelector && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-white rounded shadow-lg p-4 max-h-60 overflow-y-auto z-10 w-96">
            <h4 className="text-lg font-medium mb-2">Select Timepoint</h4>
            {isLoadingTimepoints ? (
              <div className="flex items-center justify-center p-4">
                <i className="fas fa-spinner fa-spin mr-2"></i> Loading timepoints...
              </div>
            ) : timepoints.length > 0 ? (
              <ul className="space-y-1">
                {timepoints.map((timepoint, index) => (
                  <li 
                    key={index}
                    className={`p-2 cursor-pointer hover:bg-blue-50 rounded ${selectedTimepoint === timepoint.name ? 'bg-blue-100 font-medium' : ''}`}
                    onClick={() => loadTimepointMap(timepoint.name)}
                  >
                    <i className={`fas fa-clock mr-2 ${selectedTimepoint === timepoint.name ? 'text-blue-500' : 'text-gray-500'}`}></i>
                    {timepoint.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No timepoints available</p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

ImageDisplay.propTypes = {
  appendLog: PropTypes.func.isRequired,
  segmentService: PropTypes.object,
  microscopeControlService: PropTypes.object,
  incubatorControlService: PropTypes.object,
  setCurrentMap: PropTypes.func.isRequired,
};

export default ImageDisplay;
