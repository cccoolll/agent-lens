import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { Projection, addProjection } from 'ol/proj';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import 'ol/ol.css';
import PropTypes from 'prop-types';
import { Draw } from 'ol/interaction';
import { isLocal } from '../utils';

const ImageDisplay = ({ toggleControls, appendLog, snapshotImage, segmentService, microscopeControlService }) => {
  const map = useRef(null);
  const mapRef = useRef(null); // Reference to the map container
  const [vectorLayer, setVectorLayer] = useState(null);
  const [isFirstClick, setIsFirstClick] = useState(true); // Track if it's the first click for segmentation
  const [draw, setDraw] = useState(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [isPenActive, setIsPenActive] = useState(false); // State to track if the pen tool is active
  const [selectedModel, setSelectedModel] = useState('vit_b_lm'); // Default model

  const imageWidth = 2048;
  const imageHeight = 2048;
  const extent = [0, 0, imageWidth, imageHeight];

  useEffect(() => {
    if (!map.current && mapRef.current) {
      const projection = new Projection({
        code: 'deepzoom-image',
        units: 'pixels',
        extent: extent,
      });

      addProjection(projection);

      map.current = new Map({
        target: mapRef.current,
        layers: [],
        view: new View({
          projection: 'deepzoom-image',
          center: [imageWidth / 2, imageHeight / 2],
          zoom: 2,
          minZoom: 0,
          maxZoom: 10,
        }),
      });
    }
  }, [mapRef]);

  useEffect(() => {
    if (map.current) {
      const tileUrl = isLocal()
        ? `${window.location.protocol}//${window.location.hostname}:9000/public/apps/microscope-control/tiles`
        : "https://hypha.aicell.io/agent-lens/apps/microscope-control/tiles";

      const tileLayer = new TileLayer({
        source: new XYZ({
          url: `${tileUrl}?tile={z}/{x}/{y}.jpg`,
          crossOrigin: 'anonymous',
          tileSize: 256,
          maxZoom: 10,
          projection: 'deepzoom-image',
        }),
      });

      map.current.addLayer(tileLayer);
      map.current.getView().fit(extent, { size: map.current.getSize() });
    }
  }, [map]);

  useEffect(() => {
    if (map.current) {
      const handleMapClick = (event) => {
        const coordinate = event.coordinate;
        handleImageClick(coordinate);
      };

      map.current.on('click', handleMapClick);

      return () => {
        map.current.un('click', handleMapClick);
      };
    }
  }, [map]);

  useEffect(() => {
    if (map && !vectorLayer) {
      const annotationSource = new VectorSource();
  
      const newVectorLayer = new VectorLayer({
        source: annotationSource,
        zIndex: 1000, // Set a high value to show the mask on the the image
        style: new Style({
          stroke: new Stroke({
            color: 'blue',
            width: 2,
          }),
          fill: new Fill({
            color: 'rgba(0, 0, 255, 0.1)',
          }),
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({ color: 'black', width: 1 }),
          }),
        }),
      });
  
      map.current.addLayer(newVectorLayer);
      setVectorLayer(newVectorLayer);
    }
  }, [map, vectorLayer]); // Added vectorLayer to dependency array

  const handleImageClick = async (coordinate) => {
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
        overlaySegmentationMask(maskData);
        appendLog('Segmentation completed and displayed.');

    } catch (error) {
        appendLog(`Error in segmentation: ${error.message}`);
    }
  };

  const overlaySegmentationMask = (maskData) => {
    const maskSource = new ImageStatic({
      url: `data:image/png;base64,${maskData}`,
      imageExtent: extent,
      projection: map.current.getView().getProjection(),
    });
  
    const maskLayer = new ImageLayer({
      source: maskSource,
      opacity: 0.5, // Adjust transparency
    });
    
    // Tag the layer so it can be identified later
    maskLayer.set('isSegmentationLayer', true);

    map.current.addLayer(maskLayer);
  };
  
  useEffect(() => {
    if (map) {
      const handleMapClick = (event) => {
        if (isDrawingActive) {
          // Ignore clicks when drawing
          return;
        }
        const coordinate = event.coordinate;
        handleImageClick(coordinate);
      };
  
      map.current.on('click', handleMapClick);
  
      // Clean up on unmount
      return () => {
        map.current.un('click', handleMapClick);
      };
    }
  }, [map, isDrawingActive]);

  const addInteraction = (type) => {
    if (!map || !vectorLayer) {
      console.log('Map or vectorLayer is not available.');
      return;
    }
  
    // Remove existing interactions
    if (draw) {
      map.current.removeInteraction(draw);
    }
  
    // Create a new draw interaction
    const newDraw = new Draw({
      source: vectorLayer.getSource(),
      type: type, // 'Point', 'LineString', 'Polygon'
    });
  
    map.current.addInteraction(newDraw);
    setDraw(newDraw);
    setIsDrawingActive(true); // Set drawing active
  
    newDraw.on('drawend', (event) => {
      const feature = event.feature;
      console.log('New feature added:', feature);
  
      // After drawing ends, remove the interaction
      map.current.removeInteraction(newDraw);
      setDraw(null);
      setIsDrawingActive(false); // Reset drawing active state
    });
  };

  // Example: Start drawing points
  const startDrawingPoints = () => {
    addInteraction('Point');
  };
  
  // Example: Start drawing polygons
  const startDrawingPolygons = () => {
    addInteraction('Polygon');
  };

  const openChatbot = async () => {
    // if (!microscopeControl) return;

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

  
  const activatePenTool = () => {
    setIsPenActive(!isPenActive);
    setIsFirstClick(true); // Reset to first click whenever the tool is activated
    document.body.style.cursor = isPenActive ? 'default' : 'crosshair';
    appendLog(isPenActive ? 'Pen tool deactivated.' : 'Pen tool activated. Click on the image to segment a cell.');
  };

  const handleSegmentAllCells = async () => {
    if (!segmentService || !snapshotImage || !map) return;
  
    appendLog('Segmenting all cells in the image...');
    try {
      // Fetch the image data as a Blob
      const response = await fetch(snapshotImage);
      const blob = await response.blob();
  
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();
  
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);
  
      // Use the segmentation service to segment all cells
      const segmentedResult = await segmentService.segment_all_cells(selectedModel, uint8Array);
  
      if (segmentedResult.error) {
        appendLog(`Segmentation error: ${segmentedResult.error}`);
        return;
      }
  
      // Process the masks from the segmentation result
      const masks = segmentedResult.masks;
  
      if (!masks || masks.length === 0) {
        appendLog("No cells found for segmentation.");
        return;
      }
  
      // Overlay each mask onto the map
      masks.forEach((maskData) => {
        overlaySegmentationMask(maskData);
      });
  
      appendLog('All cells segmented and displayed.');
    } catch (error) {
      appendLog(`Error in segmenting all cells: ${error.message}`);
    }
  };

    return (
    <div className="relative top-0 left-0 w-full h-screen bg-gray-100 flex items-center justify-center overflow-hidden">
      <div ref={mapRef} className="w-full h-full"></div>
      <button
        className="absolute bottom-2.5 right-2.5 w-10 h-10 z-50 rounded bg-green-600 text-white border-none cursor-pointer flex items-center justify-center"
        onClick={toggleControls}
      >
        <i className="fas fa-cog icon text-sm"></i>
      </button>
      <select
        className="absolute top-[370px] left-2.5 p-1.5 z-40 bg-blue-600 text-white border-none rounded-md text-base font-medium cursor-pointer shadow-inner shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-800 hover:shadow-xl hover:translate-y-[-2px]"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        <option value="vit_b_lm">ViT-B LM</option>
        <option value="vit_l_lm">ViT-L LM</option>
        <option value="vit_b">ViT-B</option>
        <option value="vit_b_em_organelles">ViT-B EM Organelles</option>
      </select>
      <button
        className="absolute top-[420px] left-2.5 p-2.5 z-40 bg-blue-600 text-white border-none rounded-md text-xs font-medium cursor-pointer shadow-inner shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-800 hover:shadow-xl hover:translate-y-[-2px]"
        onClick={activatePenTool}
      >
        <i className={`fas ${isPenActive ? "fa-pencil-alt icon" : "fa-magic icon"} text-sm`}></i>
      </button>
      <button
        className="absolute top-[470px] left-2.5 p-2.5 z-40 bg-blue-600 text-white border-none rounded-md text-xs font-medium cursor-pointer shadow-inner shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-800 hover:shadow-xl hover:translate-y-[-2px]"
        onClick={handleSegmentAllCells}
        disabled={!snapshotImage || !segmentService}
      >
        <i className="fas fa-layer-group icon text-sm"></i>
      </button>
      <button
        className="absolute top-[520px] left-2.5 p-2.5 z-40 bg-blue-600 text-white border-none rounded-md text-xs font-medium cursor-pointer shadow-inner shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-800 hover:shadow-xl hover:translate-y-[-2px]"
        onClick={startDrawingPoints}
      >
        <i className="fas fa-map-marker-alt icon text-sm"></i>
      </button>
      <button
        className="absolute top-[570px] left-2.5 p-2.5 z-40 bg-blue-600 text-white border-none rounded-md text-xs font-medium cursor-pointer shadow-inner shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-800 hover:shadow-xl hover:translate-y-[-2px]"
        onClick={startDrawingPolygons}
      >
        <i className="fas fa-draw-polygon icon text-sm"></i>
      </button>
      <button
        className="absolute bottom-2.5 left-2.5 p-2.5 z-40 bg-green-600 text-white border-none rounded-md text-xs font-medium cursor-pointer shadow-inner shadow-lg transition-all duration-300 ease-in-out hover:bg-green-800 hover:shadow-xl hover:translate-y-[-2px]"
        onClick={openChatbot}
      >
        <i className="fas fa-comments icon text-sm"></i>
      </button>
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