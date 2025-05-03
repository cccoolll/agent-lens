import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addMapMask, getTileGrid } from './MapSetup';
import MapInteractions from './MapInteractions';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';
import MicroscopeControlPanel from './MicroscopeControlPanel';
import ChannelSettings from './ChannelSettings';

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
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [channelSettings, setChannelSettings] = useState({
    contrast: {},
    brightness: {},
    threshold: {},
    color: {}
  });

  const imageWidth = 2048;
  const imageHeight = 2048;
  const extent = [0, 0, imageWidth, imageHeight];

  // Initialize the map when the component mounts
  useEffect(() => {
    // Initialize map only if it doesn't exist yet
    if (!map && mapRef.current && !effectRan.current) {
      appendLog("Initializing map for Image Map view");
      const newMap = makeMap(mapRef, extent);
      setMap(newMap);
      setCurrentMap(newMap);
      
      // Always add map mask regardless
      addMapMask(newMap, setVectorLayer);
      effectRan.current = true;
      
      // Check if an image map dataset has been set up in this session
      const imageMapDataset = localStorage.getItem('imageMapDataset');
      const wasExplicitlySetup = sessionStorage.getItem('mapSetupExplicit') === 'true';
      
      if (imageMapDataset && wasExplicitlySetup) {
        setMapDatasetId(imageMapDataset);
        setIsMapViewEnabled(true);
        setShouldShowMap(true);
        appendLog(`Image map dataset found: ${imageMapDataset}`);
        // Load timepoints on demand when needed
      } else {
        // Add default tile layer only if map exists
        addTileLayer(newMap, currentChannel);
      }
    }

    // Cleanup function
    return () => {
      if (map) {
        // Only target is set to null when the component unmounts
        // This prevents memory leaks but doesn't destroy the map
        map.setTarget(null);
        setCurrentMap(null);
      }
    };
  }, [mapRef.current]);

  // Load timepoints only when we should show the map and user has requested it
  useEffect(() => {
    if (shouldShowMap && mapDatasetId && showTimepointSelector && timepoints.length === 0) {
      loadTimepoints(mapDatasetId);
    }
  }, [shouldShowMap, mapDatasetId, showTimepointSelector]);

  // Cleanup for snapshot image URL
  useEffect(() => {
    return () => {
      if (snapshotImage) {
        URL.revokeObjectURL(snapshotImage);
      }
    };
  }, [snapshotImage]);

  // Apply channel settings when they change
  useEffect(() => {
    if (selectedTimepoint && isMergeMode) {
      loadTimepointMapMerged(selectedTimepoint, selectedChannels);
    } else if (selectedTimepoint) {
      loadTimepointMap(selectedTimepoint, currentChannel);
    } else if (isMergeMode) {
      addMergedTileLayer(map, selectedChannels);
    } else if (map) {
      addTileLayer(map, currentChannel);
    }
  }, [channelSettings]);

  const loadTimepoints = async (datasetId) => {
    if (!datasetId) return;
    
    setIsLoadingTimepoints(true);
    appendLog(`Loading timepoints for dataset ${datasetId}`);
    
    try {
      const response = await fetch(`/public/apps/agent-lens/list-timepoints?dataset_id=${datasetId}`);
      const data = await response.json();
      
      if (data.success && data.timepoints.length > 0) {
        setTimepoints(data.timepoints);
        appendLog(`Loaded ${data.timepoints.length} timepoints for dataset ${datasetId}`);
        
        // If we have timepoints and none is selected, select the first one
        if (!selectedTimepoint) {
          const firstTimepoint = data.timepoints[0].name;
          if (isMergeMode) {
            loadTimepointMapMerged(firstTimepoint, selectedChannels);
          } else {
            loadTimepointMap(firstTimepoint, currentChannel);
          }
        }
      } else {
        appendLog(`No timepoints found for dataset ${datasetId}`);
      }
    } catch (error) {
      appendLog(`Error loading timepoints: ${error.message}`);
    } finally {
      setIsLoadingTimepoints(false);
    }
  };

  // Helper to serialize settings for URL params
  const getProcessingSettingsParams = () => {
    return {
      contrast_settings: JSON.stringify(channelSettings.contrast),
      brightness_settings: JSON.stringify(channelSettings.brightness),
      threshold_settings: JSON.stringify(channelSettings.threshold),
      color_settings: JSON.stringify(channelSettings.color)
    };
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
    
    // Get processing settings as URL params
    const processingParams = getProcessingSettingsParams();
    
    // Create a URL with processing settings parameters
    const createTileUrl = (z, x, y) => {
      const baseUrl = `tile-for-timepoint?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channel_name=${channelName}&z=${z}&x=${x}&y=${y}`;
      const params = new URLSearchParams(processingParams).toString();
      return params ? `${baseUrl}&${params}` : baseUrl;
    };
    
    // Create a new tile layer for the selected timepoint
    const newTileLayer = new TileLayer({
      source: new XYZ({
        url: createTileUrl('{z}', '{x}', '{y}'),
        crossOrigin: 'anonymous',
        tileSize: 256, // Update to match Zarr chunk size
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = createTileUrl(transformedZ, tileCoord[1], tileCoord[2]);
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

  // Updated function to load merged channels with processing settings
  const loadTimepointMapMerged = (timepoint, channelKeys) => {
    if (!timepoint || !mapDatasetId || !map || !channelKeys.length) return;
    
    const channelNamesStr = channelKeys.map(key => channelNames[key]).join(',');
    
    appendLog(`Loading merged map for timepoint: ${timepoint}, channels: ${channelNamesStr}`);
    setSelectedTimepoint(timepoint);
    
    // Remove any existing layers
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }
    
    // Get processing settings as URL params
    const processingParams = getProcessingSettingsParams();
    
    // Create a URL with processing settings parameters
    const createTileUrl = (z, x, y) => {
      const baseUrl = `merged-tiles?dataset_id=${mapDatasetId}&timepoint=${timepoint}&channels=${channelKeys.join(',')}&z=${z}&x=${x}&y=${y}`;
      const params = new URLSearchParams(processingParams).toString();
      return params ? `${baseUrl}&${params}` : baseUrl;
    };
    
    // Create a new tile layer for the merged channels
    const newTileLayer = new TileLayer({
      source: new XYZ({
        url: createTileUrl('{z}', '{x}', '{y}'),
        crossOrigin: 'anonymous',
        tileSize: 256, // Update to match Zarr chunk size
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = createTileUrl(transformedZ, tileCoord[1], tileCoord[2]);
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

  // Updated merged channels support for regular tile view with processing settings
  const addMergedTileLayer = (map, channelKeys) => {
    if (!map || !channelKeys.length) return;
    
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }

    const channelKeysStr = channelKeys.join(',');
    
    // Get processing settings as URL params
    const processingParams = getProcessingSettingsParams();
    
    // Create a URL with processing settings parameters - now include default dataset_id and timestamp
    const createTileUrl = (z, x, y) => {
      // Use the gallery default dataset ID if mapDatasetId isn't available
      const datasetId = mapDatasetId || 'agent-lens/image-map-20250429-treatment-zip';
      const baseUrl = `merged-tiles?dataset_id=${datasetId}&channels=${channelKeysStr}&z=${z}&x=${x}&y=${y}`;
      const params = new URLSearchParams(processingParams).toString();
      return params ? `${baseUrl}&${params}` : baseUrl;
    };
    
    const tileLayer = new TileLayer({
      source: new XYZ({
        url: createTileUrl('{z}', '{x}', '{y}'),
        crossOrigin: 'anonymous',
        tileSize: 256, // Update to match Zarr chunk size
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = createTileUrl(transformedZ, tileCoord[1], tileCoord[2]);
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
  
  // Updated to support processing parameters
  const addTileLayer = (map, channelKey) => {
    if (!map) return;
    
    const channelName = channelNames[channelKey];
  
    if (imageLayer) {
      map.removeLayer(imageLayer);
    }
    
    // Get processing settings as URL params
    const processingParams = getProcessingSettingsParams();
    
    // Create a URL with processing settings parameters - now include default dataset_id and timestamp
    const createTileUrl = (z, x, y) => {
      // Use the gallery default dataset ID if mapDatasetId isn't available
      const datasetId = mapDatasetId || 'agent-lens/image-map-20250429-treatment-zip';
      const baseUrl = `tile?dataset_id=${datasetId}&timestamp=2025-04-29_16-38-27&channel_name=${channelName}&z=${z}&x=${x}&y=${y}`;
      const params = new URLSearchParams(processingParams).toString();
      return params ? `${baseUrl}&${params}` : baseUrl;
    };

    const tileLayer = new TileLayer({
      source: new XYZ({
        url: createTileUrl('{z}', '{x}', '{y}'),
        crossOrigin: 'anonymous',
        tileSize: 256, // Update to match Zarr chunk size
        maxZoom: 4,
        tileGrid: getTileGrid(),
        tileLoadFunction: function(tile, src) {
          const tileCoord = tile.getTileCoord(); // [z, x, y]
          const transformedZ = 3 - tileCoord[0];
          const newSrc = createTileUrl(transformedZ, tileCoord[1], tileCoord[2]);
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

  // Handle showing the channel settings dialog
  const openChannelSettings = () => {
    setShowChannelSettings(true);
  };

  // Handle channel settings changes
  const handleChannelSettingsChange = (newSettings) => {
    setChannelSettings(newSettings);
    
    // Log the changes
    console.log('Applied new channel settings:', newSettings);
    appendLog('Applied new channel processing settings');
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
          // Pass merged channel functions and state
          toggleChannelSelector={toggleChannelSelector}
          isChannelSelectorOpen={isChannelSelectorOpen}
          selectedChannels={selectedChannels}
          handleChannelToggle={handleChannelToggle}
          applyChannelSelection={applyChannelSelection}
          isMergeMode={isMergeMode}
          loadTimepointMapMerged={loadTimepointMapMerged}
          addMergedTileLayer={addMergedTileLayer}
          channelColors={channelColors}
          // Add new image processing props
          openChannelSettings={openChannelSettings}
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
        
        {/* Channel Settings Modal */}
        {showChannelSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <ChannelSettings
              selectedChannels={selectedChannels}
              channelColors={channelColors}
              onSettingsChange={handleChannelSettingsChange}
              onClose={() => setShowChannelSettings(false)}
              initialSettings={channelSettings}
            />
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
