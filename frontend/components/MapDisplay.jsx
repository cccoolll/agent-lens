import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addMapMask, getTileGrid } from './MapSetup';
import MapInteractions from './MapInteractions';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';
import MicroscopeControlPanel from './MicroscopeControlPanel';

const MapDisplay = ({ appendLog, segmentService, microscopeControlService, incubatorControlService, setCurrentMap }) => {
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
  const [currentChannel, setCurrentChannel] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState([0]); // Array to store multiple selected channels
  const [isChannelSelectorOpen, setIsChannelSelectorOpen] = useState(false);
  const [isMergeMode, setIsMergeMode] = useState(false); // Track if merge mode is active

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
      // When timepoints are loaded and we should show the map, load the first timepoint with current channel
      if (isMergeMode) {
        loadTimepointMapMerged(timepoints[0].name, selectedChannels);
      } else {
        loadTimepointMap(timepoints[0].name, currentChannel);
      }
    }
  }, [map, shouldShowMap, timepoints, currentChannel, selectedChannels, isMergeMode]);

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

  const loadTimepointMap = (timepoint, channelKey = 0) => {
    if (!timepoint || !mapDatasetId || !map) return;
    
    // Convert channelKey to number if it's a string
    const channelKeyNum = typeof channelKey === 'string' ? parseInt(channelKey) : channelKey;
    
    // If channelKey is provided, update the current channel
    if (channelKeyNum !== undefined && channelKeyNum !== currentChannel) {
      setCurrentChannel(channelKeyNum);
    }
    
    // Always use the current channel unless explicitly specified
    const channelToUse = channelKeyNum !== undefined ? channelKeyNum : currentChannel;
    const channelName = channelNames[channelToUse] || 'BF_LED_matrix_full';
    
    appendLog(`Loading map for timepoint: ${timepoint}, channel: ${channelName}`);
    setSelectedTimepoint(timepoint);
    
    // Remove any existing layers
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }
    
    // Create a new tile layer for the selected timepoint
    const newTileLayer = new TileLayer({
      source: new XYZ({
        url: `tile-for-timepoint?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channel_name=${channelName}&z={z}&x={x}&y={y}`,
        crossOrigin: 'anonymous',
        tileSize: 2048,
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = `tile-for-timepoint?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channel_name=${channelName}&z=${transformedZ}&x=${tileCoord[1]}&y=${tileCoord[2]}`;
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
    setIsMergeMode(false);
  };

  // New function to load merged channels
  const loadTimepointMapMerged = (timepoint, channelKeys) => {
    if (!timepoint || !mapDatasetId || !map || !channelKeys.length) return;
    
    const channelNamesStr = channelKeys.map(key => channelNames[key]).join(',');
    
    appendLog(`Loading merged map for timepoint: ${timepoint}, channels: ${channelNamesStr}`);
    setSelectedTimepoint(timepoint);
    
    // Remove any existing layers
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }
    
    // Create a new tile layer for the merged channels
    const newTileLayer = new TileLayer({
      source: new XYZ({
        url: `merged-tiles?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channels=${channelKeys.join(',')}&z={z}&x={x}&y={y}`,
        crossOrigin: 'anonymous',
        tileSize: 2048,
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = `merged-tiles?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channels=${channelKeys.join(',')}&z=${transformedZ}&x=${tileCoord[1]}&y=${tileCoord[2]}`;
          fetch(newSrc)
            .then(response => response.text())
            .then(data => {
              const trimmed = data.replace(/^"|"$/g, '');
              tile.getImage().src = `data:image/png;base64,${trimmed}`;
              console.log(`Loaded merged timepoint tile at: ${newSrc}`);
            })
            .catch(error => {
              console.log(`Failed to load merged timepoint tile: ${newSrc}`, error);
            });
        }
      }),
    });
  
    map.addLayer(newTileLayer);
    setImageLayer(newTileLayer);
    setIsMergeMode(true);
  };

  // Add merged channels support for regular tile view (not timepoint specific)
  const addMergedTileLayer = (map, channelKeys) => {
    if (!map || !channelKeys.length) return;
    
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }

    const channelKeysStr = channelKeys.join(',');
    
    const tileLayer = new TileLayer({
      source: new XYZ({
        url: `merged-tiles?channels=${channelKeysStr}&z={z}&x={x}&y={y}`,
        crossOrigin: 'anonymous',
        tileSize: 2048,
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = `merged-tiles?channels=${channelKeysStr}&z=${transformedZ}&x=${tileCoord[1]}&y=${tileCoord[2]}`;
          fetch(newSrc)
            .then(response => response.text())
            .then(data => {
              const trimmed = data.replace(/^"|"$/g, '');
              tile.getImage().src = `data:image/png;base64,${trimmed}`;
              console.log(`Loaded merged tile at location: ${newSrc}`);
            })
            .catch(error => {
              console.log(`Failed to load merged tile: ${newSrc}`, error);
            });
        }
      }),
    });
  
    map.addLayer(tileLayer);
    setImageLayer(tileLayer);
    setIsMergeMode(true);
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
    setIsMergeMode(false);
  };

  const toggleTimepointSelector = () => {
    // If this is the first time showing the selector and we haven't loaded timepoints yet
    if (!showTimepointSelector && timepoints.length === 0 && mapDatasetId) {
      loadTimepoints(mapDatasetId);
    }
    
    setShowTimepointSelector(!showTimepointSelector);
  };

  const toggleChannelSelector = () => {
    setIsChannelSelectorOpen(!isChannelSelectorOpen);
  };

  const handleChannelToggle = (channelKey) => {
    if (selectedChannels.includes(channelKey)) {
      // Remove channel if already selected (unless it's the last one)
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter(key => key !== channelKey));
      }
    } else {
      // Add channel if not already selected
      setSelectedChannels([...selectedChannels, channelKey]);
    }
  };

  const applyChannelSelection = () => {
    if (selectedChannels.length === 1) {
      // If only one channel is selected, use the regular channel display
      setCurrentChannel(selectedChannels[0]);
      if (selectedTimepoint) {
        loadTimepointMap(selectedTimepoint, selectedChannels[0]);
      } else {
        addTileLayer(map, selectedChannels[0]);
      }
    } else if (selectedChannels.length > 1) {
      // If multiple channels are selected, merge them
      if (selectedTimepoint) {
        loadTimepointMapMerged(selectedTimepoint, selectedChannels);
      } else {
        addMergedTileLayer(map, selectedChannels);
      }
    }
    setIsChannelSelectorOpen(false);
  };

  const channelColors = {
    0: '#ffffff', // Brightfield - white
    11: '#9955ff', // 405nm - violet
    12: '#22ff22', // 488nm - green
    14: '#ff5555', // 561nm - red-orange 
    13: '#ff0000'  // 638nm - deep red
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
          isMapViewEnabled={isMapViewEnabled}
          selectedTimepoint={selectedTimepoint}
          loadTimepointMap={loadTimepointMap}
          currentChannel={currentChannel}
          setCurrentChannel={setCurrentChannel}
          // Pass new merged channel functions and state
          toggleChannelSelector={toggleChannelSelector}
          isChannelSelectorOpen={isChannelSelectorOpen}
          selectedChannels={selectedChannels}
          handleChannelToggle={handleChannelToggle}
          applyChannelSelection={applyChannelSelection}
          isMergeMode={isMergeMode}
          loadTimepointMapMerged={loadTimepointMapMerged}
          addMergedTileLayer={addMergedTileLayer}
          channelColors={channelColors}
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
                    onClick={() => isMergeMode ? loadTimepointMapMerged(timepoint.name, selectedChannels) : loadTimepointMap(timepoint.name, currentChannel)}
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

MapDisplay.propTypes = {
  appendLog: PropTypes.func.isRequired,
  segmentService: PropTypes.object,
  microscopeControlService: PropTypes.object,
  incubatorControlService: PropTypes.object,
  setCurrentMap: PropTypes.func.isRequired,
};

export default MapDisplay;
