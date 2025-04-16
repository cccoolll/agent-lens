import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DrawButton from './DrawButton';
import PenButton from './PenButton';
import SegmentControls from './SegmentControls';
import { getSnapshotArray, overlaySegmentationMask } from './Segment';
import MapButton from './MapButton';

const MapInteractions = ({ 
  segmentService, 
  snapshotImage, 
  map, 
  extent, 
  appendLog, 
  vectorLayer, 
  channelNames, 
  addTileLayer,
  isMapViewEnabled,
  selectedTimepoint,
  loadTimepointMap,
  currentChannel,
  setCurrentChannel,
  toggleChannelSelector,
  isChannelSelectorOpen,
  selectedChannels,
  handleChannelToggle,
  applyChannelSelection,
  isMergeMode,
  loadTimepointMapMerged,
  addMergedTileLayer,
  channelColors,
  openChannelSettings
}) => {
  const [isFirstClick, setIsFirstClick] = useState(true); // Track if it's the first click for segmentation
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [selectedModel, setSelectedModel] = useState('vit_b_lm');
  const [segmentActive, setSegmentActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let clickListener;
    
    if (map) {
      clickListener = async (event) => {
        if (isDrawingActive) {
          return;
        }
        await handleImageClick(event.coordinate);
      };
      
      map.on('click', clickListener);
    }

    return () => {
      if (map && clickListener) {
        map.un('click', clickListener);
      }
    };
  }, [map, isDrawingActive]);

  const getSegmentedResult = async (pointCoordinates, snapshotArray) => {
    if (isFirstClick) {
        return await segmentService.compute_embedding_with_initial_segment(
            selectedModel,
            snapshotArray,
            [pointCoordinates],
            [1]
        );
    } else {
        return await segmentService.segment_with_existing_embedding(
            snapshotArray,
            [pointCoordinates],
            [1]
        );
    }
  };

  const handleImageClick = async (pointCoordinates) => {
    appendLog(`Clicked at coordinates: (${pointCoordinates[0]}, ${pointCoordinates[1]})`);

    const snapshotArray = await getSnapshotArray(snapshotImage)
    const segmentedResult = await getSegmentedResult(pointCoordinates, snapshotArray);

    if (segmentedResult.error) {
        appendLog(`Segmentation error: ${segmentedResult.error}`);
        return;
    }

    overlaySegmentationMask(segmentedResult.mask, map, extent);
    appendLog('Segmentation completed and displayed.');
  };

  const handleSegmentClick = async () => {
    if (!segmentService) {
      appendLog('Segmentation service not available.');
      return;
    }

    if (segmentActive) {
      // Deactivate segmentation mode
      setSegmentActive(false);
    } else {
      // Activate segmentation mode
      setSegmentActive(true);
    }
  };

  const channelLabels = {
    0: 'Brightfield',
    11: '405nm (Violet)',
    12: '488nm (Green)',
    14: '561nm (Red-Orange)',
    13: '638nm (Deep Red)'
  };

  return (
    <>
      {map && ( // Only render controls if map is available
        <>
          <PenButton appendLog={appendLog} setIsFirstClick={setIsFirstClick} />
          <SegmentControls 
            segmentService={segmentService} 
            snapshotImage={snapshotImage} 
            selectedModel={selectedModel} 
            setSelectedModel={setSelectedModel} 
            map={map} 
            extent={extent} 
            appendLog={appendLog} 
          />
          <DrawButton 
            drawType="Point" 
            icon="fa-map-marker-alt" 
            top="520" 
            map={map} 
            vectorLayer={vectorLayer} 
            setIsDrawingActive={setIsDrawingActive} 
          />
          <DrawButton 
            drawType="Polygon" 
            icon="fa-draw-polygon" 
            top="570" 
            map={map} 
            vectorLayer={vectorLayer} 
            setIsDrawingActive={setIsDrawingActive} 
          />
        </>
      )}
      
      {/* Bottom control buttons */}
      <div className="absolute bottom-4 left-4 flex space-x-2">
        {/* Segmentation Button */}
        <button
          className={`rounded-full p-3 shadow-lg ${segmentActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
          onClick={handleSegmentClick}
          title={segmentActive ? 'Deactivate Segmentation' : 'Activate Segmentation'}
          disabled={isProcessing}
        >
          <i className={`fas ${segmentActive ? 'fa-stop' : 'fa-cut'}`}></i>
        </button>

        {/* Channel Selector Button */}
        <div className="relative">
          <button
            className={`rounded-full p-3 shadow-lg ${isMergeMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-500 hover:bg-green-600'} text-white`}
            onClick={toggleChannelSelector}
            title={isMergeMode ? "Edit merged channels" : "Select channels"}
          >
            <i className="fas fa-layer-group"></i>
          </button>

          {/* Channel Selection Dropdown */}
          {isChannelSelectorOpen && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded shadow-lg p-3 z-10 w-60">
              <h5 className="font-medium text-gray-800 mb-2">Select Channels</h5>
              <div className="space-y-2 mb-3">
                {Object.entries(channelLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`channel-${key}`}
                      checked={selectedChannels.includes(parseInt(key))}
                      onChange={() => handleChannelToggle(parseInt(key))}
                      className="mr-2"
                    />
                    <label 
                      htmlFor={`channel-${key}`}
                      className="flex-1 cursor-pointer"
                      style={{
                        color: key !== '0' ? channelColors[parseInt(key)] : 'inherit'
                      }}
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              {/* Apply Selection Button */}
              <div className="flex justify-between">
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-2 rounded text-sm"
                  onClick={toggleChannelSelector}
                >
                  Cancel
                </button>
                <button
                  className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm"
                  onClick={applyChannelSelection}
                >
                  Apply Selection
                </button>
              </div>

              {/* Processing Settings Button */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded text-sm flex items-center justify-center"
                  onClick={() => {
                    toggleChannelSelector();
                    openChannelSettings();
                  }}
                >
                  <i className="fas fa-sliders-h mr-2"></i>
                  Image Processing Settings
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Image Processing Button */}
        <button
          className="rounded-full p-3 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
          onClick={openChannelSettings}
          title="Image Processing Settings"
        >
          <i className="fas fa-sliders-h"></i>
        </button>
      </div>

      {/* Legend showing active channels in merge mode - positioned above the buttons */}
      {isMergeMode && selectedChannels.length > 1 && (
        <div className="absolute bottom-16 left-4 bg-white rounded shadow-lg p-2 w-48">
          <h6 className="text-xs font-medium text-gray-700 mb-1">Active Channels</h6>
          <div className="space-y-1">
            {selectedChannels.map(channelKey => (
              <div key={channelKey} className="flex items-center text-xs">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{
                    backgroundColor: channelKey === 0 ? '#ffffff' : channelColors[channelKey],
                    border: channelKey === 0 ? '1px solid #ccc' : 'none'
                  }}
                ></div>
                <span style={{ color: channelKey === 0 ? 'inherit' : channelColors[channelKey] }}>
                  {channelLabels[channelKey]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

MapInteractions.propTypes = {
  segmentService: PropTypes.object,
  snapshotImage: PropTypes.string,
  map: PropTypes.object,
  extent: PropTypes.array.isRequired,
  appendLog: PropTypes.func.isRequired,
  vectorLayer: PropTypes.object,
  channelNames: PropTypes.object.isRequired,
  addTileLayer: PropTypes.func.isRequired,
  isMapViewEnabled: PropTypes.bool,
  selectedTimepoint: PropTypes.string,
  loadTimepointMap: PropTypes.func,
  currentChannel: PropTypes.number,
  setCurrentChannel: PropTypes.func,
  toggleChannelSelector: PropTypes.func,
  isChannelSelectorOpen: PropTypes.bool,
  selectedChannels: PropTypes.array,
  handleChannelToggle: PropTypes.func,
  applyChannelSelection: PropTypes.func,
  isMergeMode: PropTypes.bool,
  loadTimepointMapMerged: PropTypes.func,
  addMergedTileLayer: PropTypes.func,
  channelColors: PropTypes.object,
  openChannelSettings: PropTypes.func.isRequired
};

MapInteractions.defaultProps = {
  isMapViewEnabled: false,
  selectedTimepoint: null,
  loadTimepointMap: () => {},
  currentChannel: 0,
  setCurrentChannel: () => {},
  toggleChannelSelector: () => {},
  isChannelSelectorOpen: false,
  selectedChannels: [0],
  handleChannelToggle: () => {},
  applyChannelSelection: () => {},
  isMergeMode: false,
  loadTimepointMapMerged: () => {},
  addMergedTileLayer: () => {},
  channelColors: {},
  openChannelSettings: () => {}
};

export default MapInteractions;