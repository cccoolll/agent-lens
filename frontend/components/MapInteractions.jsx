import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DrawButton from './DrawButton';
import PenButton from './PenButton';
import SegmentControls from './SegmentControls';
import { getSnapshotArray, overlaySegmentationMask } from './Segment';
import MapButton from './MapButton';

const MapInteractions = ({ segmentService, snapshotImage, map, extent, appendLog, vectorLayer, channelNames, addTileLayer }) => {
  const [isFirstClick, setIsFirstClick] = useState(true); // Track if it's the first click for segmentation
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [selectedModel, setSelectedModel] = useState('vit_b_lm');
  const [isChannelSelectorOpen, setIsChannelSelectorOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(Object.keys(channelNames)[0]);

  useEffect(() => {
    if (map) {
      map.on('click', async (event) => {
          if (isDrawingActive) {
              return;
          }
          await handleImageClick(event.coordinate)
      });

      return () => {
        map.un('click');
      };
    }
  }, [map]);

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

  const handleChannelChange = (event) => {
    setSelectedChannel(event.target.value);
  };

  const handleApplyChannel = () => {
    addTileLayer(map, selectedChannel);
    setIsChannelSelectorOpen(false);
  };

  return (
    <>
      <PenButton appendLog={appendLog} setIsFirstClick={setIsFirstClick} />
      <SegmentControls segmentService={segmentService} snapshotImage={snapshotImage} selectedModel={selectedModel} setSelectedModel={setSelectedModel} map={map} extent={extent} appendLog={appendLog} />
      <DrawButton drawType="Point" icon="fa-map-marker-alt" top="520" map={map} vectorLayer={vectorLayer} setIsDrawingActive={setIsDrawingActive} />
      <DrawButton drawType="Polygon" icon="fa-draw-polygon" top="570" map={map} vectorLayer={vectorLayer} setIsDrawingActive={setIsDrawingActive} />
      <MapButton
        onClick={() => setIsChannelSelectorOpen(!isChannelSelectorOpen)}
        icon="fa-layer-group"
        top="620"
        left="10"
        title="Select channels for tiles"
      />
      {isChannelSelectorOpen && (
        <div className="absolute z-50 bg-white p-4 rounded shadow-md" style={{ top: '550px', left: '20px' }}>
          <h4 className="text-sm font-medium mb-2">Select Channel</h4>
          <select
            className="w-full p-2 border rounded"
            value={selectedChannel}
            onChange={handleChannelChange}
          >
            {Object.entries(channelNames).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
          <button
            className="mt-2 w-full bg-blue-600 text-white p-2 rounded"
            onClick={handleApplyChannel}
          >
            Apply
          </button>
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
};

export default MapInteractions;