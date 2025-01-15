import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';

export const handleImageClick = async (coordinate, isPenActive, segmentService, snapshotImage, selectedModel, setIsFirstClick, isFirstClick, appendLog, overlaySegmentationMask) => {
  if (!isPenActive || !segmentService || !snapshotImage) return;

  // Since the projection is in pixels, coordinates correspond to image pixels
  const pointCoordinates = coordinate;

  appendLog(`Clicked at coordinates: (${pointCoordinates[0]}, ${pointCoordinates[1]})`);

  try {
    // Fetch the image data as a Blob
    const response = await fetch(snapshotImage);
    const blob = await response.blob();

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await new Response(blob).arrayBuffer();

    // Convert ArrayBuffer to Uint8Array
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

    // Ensure mask data is not empty or malformed
    const maskData = segmentedResult.mask;
    if (!maskData) {
      appendLog("Received empty mask data from the server.");
      return;
    }

    // Overlay the segmentation mask onto the map
    overlaySegmentationMask(maskData, map, extent);
    appendLog('Segmentation completed and displayed.');

  } catch (error) {
    appendLog(`Error in segmentation: ${error.message}`);
  }
};

export const overlaySegmentationMask = (maskData, map, extent) => {
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

export const handleSegmentAllCells = async (segmentService, snapshotImage, map, selectedModel, appendLog, overlaySegmentationMask) => {
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
      overlaySegmentationMask(maskData, map, [0, 0, 2048, 2048]);
    });

    appendLog('All cells segmented and displayed.');
  } catch (error) {
    appendLog(`Error in segmenting all cells: ${error.message}`);
  }
};

export const openChatbot = async (microscopeControlService, appendLog) => {
  try {
    // Ensure HyphaCore is initialized
    if (!window.hyphaCore || !window.hyphaApi) {
      appendLog('HyphaCore is not initialized.');
      return;
    }

    if (window.chatbotWindow && !window.chatbotWindow.closed) {
      // If the window is minimized, restore it
      if (window.chatbotWindow.minimized) {
        window.chatbotWindow.restore();
      } else {
        // Bring the window to front
        window.chatbotWindow.focus();
      }
    } else {
      appendLog('Opening chatbot window...');
      const url = await microscopeControlService.get_chatbot_url();
      window.chatbotWindow = await window.hyphaApi.createWindow({
        src: url,
        name: 'Chatbot',
      });
    }
  } catch (error) {
    appendLog(`Failed to open chatbot window: ${error.message}`);
  }
};