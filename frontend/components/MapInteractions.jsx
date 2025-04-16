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
  channelColors
}) => {
  const [isFirstClick, setIsFirstClick] = useState(true); // Track if it's the first click for segmentation
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [selectedModel, setSelectedModel] = useState('vit_b_lm');

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
          <MapButton
            onClick={toggleChannelSelector}
            icon="fa-layer-group"
            top="620"
            left="10"
            title={isMergeMode ? "Edit merged channels" : "Select channels for tiles"}
            className={isMergeMode ? "bg-indigo-600" : ""}
          />
          
          {isChannelSelectorOpen && (
            <div className="absolute z-50 bg-white p-4 rounded shadow-lg" style={{ top: '550px', left: '60px', width: '280px' }}>
              <h4 className="text-sm font-medium mb-2">Select Channels</h4>
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {Object.entries(channelNames).map(([key, name]) => (
                  <div 
                    key={key} 
                    className="flex items-center"
                  >
                    <input
                      type="checkbox"
                      id={`channel-${key}`}
                      checked={selectedChannels.includes(parseInt(key))}
                      onChange={() => handleChannelToggle(parseInt(key))}
                      className="mr-2"
                    />
                    <label 
                      htmlFor={`channel-${key}`}
                      className="flex items-center text-sm"
                    >
                      <span 
                        className="w-3 h-3 inline-block mr-2 rounded-full"
                        style={{ backgroundColor: channelColors[key] }}
                      ></span>
                      {name.replace('_', ' ').replace('nm_Ex', ' nm')}
                    </label>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-600 mb-2">
                {selectedChannels.length === 1 ? 
                  "Single channel mode" : 
                  `Merge mode: ${selectedChannels.length} channels selected`}
              </div>
              <button
                className="w-full bg-blue-600 text-white p-2 rounded text-sm"
                onClick={applyChannelSelection}
                disabled={selectedChannels.length === 0}
              >
                Apply
              </button>
            </div>
          )}
        </>
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
  channelColors: PropTypes.object
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
  channelColors: {}
};

export default MapInteractions;