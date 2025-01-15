import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addTileLayer, addMapMask } from './MapSetup';
import { handleImageClick, overlaySegmentationMask, handleSegmentAllCells, openChatbot } from './SegmentationLogic';
import InteractionButton from './InteractionButton';
import MapButton from './MapButton';

const ImageDisplay = ({ toggleControls, appendLog, snapshotImage, segmentService, microscopeControlService }) => {
  const map = useRef(null);
  const mapRef = useRef(null); // Reference to the map container
  const [vectorLayer, setVectorLayer] = useState(null);
  const [isFirstClick, setIsFirstClick] = useState(true); // Track if it's the first click for segmentation
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [isPenActive, setIsPenActive] = useState(false); // State to track if the pen tool is active
  const [selectedModel, setSelectedModel] = useState('vit_b_lm'); // Default model

  const imageWidth = 2048;
  const imageHeight = 2048;
  const extent = [0, 0, imageWidth, imageHeight];

  useEffect(() => {
    if (!map.current && mapRef.current) {
      map.current = makeMap(mapRef, extent);
      addTileLayer(map.current, extent);
      addMapMask(map.current, setVectorLayer);

      map.current.on('click', (event) => {
        if (isDrawingActive) {
          return;
        }
        handleImageClick(event.coordinate, isPenActive, segmentService, snapshotImage, selectedModel, setIsFirstClick, isFirstClick, appendLog, (maskData) => overlaySegmentationMask(maskData, map.current, extent))
      });

      return () => {
        map.current.un('click');
      };
    }
  }, [mapRef]);

  const activatePenTool = () => {
    setIsPenActive(!isPenActive);
    setIsFirstClick(true); // Reset to first click whenever the tool is activated
    document.body.style.cursor = isPenActive ? 'default' : 'crosshair';
    appendLog(isPenActive ? 'Pen tool deactivated.' : 'Pen tool activated. Click on the image to segment a cell.');
  };

  return (
    <div className="relative top-0 left-0 w-full h-screen bg-gray-100 flex items-center justify-center overflow-hidden">
      <div ref={mapRef} className="w-full h-full"></div>
      <MapButton onClick={toggleControls} icon="fa-cog" bottom="10" right="10" />
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
      <MapButton onClick={activatePenTool} icon={isPenActive ? "fa-pencil-alt" : "fa-magic"} top="420" />
      <MapButton onClick={() => handleSegmentAllCells(segmentService, snapshotImage, map.current, selectedModel, appendLog, (maskData) => overlaySegmentationMask(maskData, map.current, extent))} icon="fa-layer-group" top="470" disabled={!snapshotImage || !segmentService}/>
      <InteractionButton type="Point" icon="fa-map-marker-alt" top="520" map={map.current} vectorLayer={vectorLayer} setIsDrawingActive={setIsDrawingActive} />
      <InteractionButton type="Polygon" icon="fa-draw-polygon" top="570" map={map.current} vectorLayer={vectorLayer} setIsDrawingActive={setIsDrawingActive} />
      <MapButton onClick={() => openChatbot(microscopeControlService, appendLog)} icon="fa-comments" bottom="10" />
    </div>
  );
};

ImageDisplay.propTypes = {
  toggleControls: PropTypes.func.isRequired,
  appendLog: PropTypes.func.isRequired,
  snapshotImage: PropTypes.string,
  segmentService: PropTypes.object,
  microscopeControlService: PropTypes.object,
};

export default ImageDisplay;