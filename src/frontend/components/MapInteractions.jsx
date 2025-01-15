import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import { MapButton } from './MapButton';
import { InteractionButton } from './InteractionButton';
import { PenButton } from './PenButton';

const MapInteractions = ({ segmentService, snapshotImage, map, extent, appendLog, vectorLayer }) => {
  const [isFirstClick, setIsFirstClick] = useState(true); // Track if it's the first click for segmentation
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [selectedModel, setSelectedModel] = useState('vit_b_lm'); // Default model

  useEffect(() => {
      map.current.on('click', async (event) => {
          if (isDrawingActive) {
              return;
          }
          await handleImageClick(event.coordinate)
      });
  }, [map]);

  const handleImageClick = async (pointCoordinates) => {
    appendLog(`Clicked at coordinates: (${pointCoordinates[0]}, ${pointCoordinates[1]})`);

    try {
      const response = await fetch(snapshotImage);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let segmentedResult;
      if (isFirstClick) {
        // First click: Use compute_embedding_with_initial_segment with the selected model
        segmentedResult = await segmentService.compute_embedding_with_initial_segment(
          selectedModel,
          uint8Array,
          [pointCoordinates],
          [1]
        );
        setIsFirstClick(false);
      } else {
        // Subsequent clicks: Use segment_with_existing_embedding
        segmentedResult = await segmentService.segment_with_existing_embedding(
          uint8Array,
          [pointCoordinates],
          [1]
        );
      }

      if (segmentedResult.error) {
        appendLog(`Segmentation error: ${segmentedResult.error}`);
        return;
      }

      const maskData = segmentedResult.mask;
      if (!maskData) {
        appendLog("Received empty mask data from the server.");
        return;
      }

      overlaySegmentationMask(maskData, map, extent);
      appendLog('Segmentation completed and displayed.');

    } catch (error) {
      appendLog(`Error in segmentation: ${error.message}`);
    }
  };

  const overlaySegmentationMask = (maskData) => {
    const maskSource = new ImageStatic({
      url: `data:image/png;base64,${maskData}`,
      imageExtent: extent,
      projection: map.getView().getProjection(),
    });

    const maskLayer = new ImageLayer({
      source: maskSource,
      opacity: 0.5, // Adjust transparency
    });

    // Tag the layer so it can be identified later
    maskLayer.set('isSegmentationLayer', true);

    map.addLayer(maskLayer);
  };

  const handleSegmentAllCells = async (segmentService) => {
    if (!segmentService || !snapshotImage || !map) return;

    appendLog('Segmenting all cells in the image...');
    try {
      const response = await fetch(snapshotImage);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const segmentedResult = await segmentService.segment_all_cells(selectedModel, uint8Array);

      if (segmentedResult.error) {
        appendLog(`Segmentation error: ${segmentedResult.error}`);
        return;
      }

      const masks = segmentedResult.masks;

      if (!masks || masks.length === 0) {
        appendLog("No cells found for segmentation.");
        return;
      }

      masks.forEach((maskData) => {
        overlaySegmentationMask(maskData, map, extent);
      });

      appendLog('All cells segmented and displayed.');
    } catch (error) {
      appendLog(`Error in segmenting all cells: ${error.message}`);
    }
  };

  return (
    <>
      <select
        className="absolute left-2.5 p-1.5 z-40 bg-blue-600 text-white border-none rounded-md text-base font-medium cursor-pointer shadow-inner transition-all duration-300 ease-in-out hover:bg-blue-800 hover:shadow-xl hover:translate-y-[-2px]"
        style={{ top: '370px' }}
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        <option value="vit_b_lm">ViT-B LM</option>
        <option value="vit_l_lm">ViT-L LM</option>
        <option value="vit_b">ViT-B</option>
        <option value="vit_b_em_organelles">ViT-B EM Organelles</option>
      </select>
      <PenButton appendLog={appendLog} setIsFirstClick={setIsFirstClick} />
      <MapButton onClick={() => handleSegmentAllCells(segmentService, snapshotImage, map.current, extent, selectedModel, appendLog) } icon="fa-layer-group" top="470" disabled={!snapshotImage || !segmentService}/>
      <InteractionButton type="Point" icon="fa-map-marker-alt" top="520" map={map.current} vectorLayer={vectorLayer} setIsDrawingActive={setIsDrawingActive} />
      <InteractionButton type="Polygon" icon="fa-draw-polygon" top="570" map={map.current} vectorLayer={vectorLayer} setIsDrawingActive={setIsDrawingActive} />
    </>
  );
}

MapInteractions.propTypes = {
  segmentService: PropTypes.object.isRequired,
  snapshotImage: PropTypes.string,
  map: PropTypes.object.isRequired,
  extent: PropTypes.array.isRequired,
  appendLog: PropTypes.func.isRequired,
  vectorLayer: PropTypes.object.isRequired,
};

export default MapInteractions;