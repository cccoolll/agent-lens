import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import LogSection from './components/LogSection';
import LoginPrompt from './components/LoginPrompt';
import ImageDisplay from './components/ImageDisplay';
import ControlPanel from './components/ControlPanel';

// Import OpenLayers modules
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';

import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Projection, addProjection } from 'ol/proj';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { defaults as defaultControls, FullScreen, ZoomSlider } from 'ol/control';
import WinBox from 'winbox/src/js/winbox';

const originalWidth = 2048;
const originalHeight = 2048;

const MicroscopeControl = () => {

  const hyphaCoreInitialized = useRef(false);
    
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [server, setServer] = useState(null);
  const [userId, setUserId] = useState(null);
  
  const mapRef = useRef(null); // Reference to the map container
  const [map, setMap] = useState(null);
  const [imageLayer, setImageLayer] = useState(null);
  const [vectorLayer, setVectorLayer] = useState(null);

  const [microscopeControl, setMicroscopeControl] = useState(null);
  const [snapshotImage, setSnapshotImage] = useState(null);

  const [isControlSectionOpen, setIsControlSectionOpen] = useState(false);
  
  const [BrightFieldIntensity, setBrightFieldIntensity] = useState(50);
  const [BrightFieldCameraExposure, setBrightFieldCameraExposure] = useState(100);
  // const [Fluorescence405Intensity, setFluorescence405Intensity] = useState(50);
  // const [Fluorescence405CameraExposure, setFluorescence405CameraExposure] = useState(100);
  // const [Fluorescence488Intensity, setFluorescence488Intensity] = useState(50);
  // const [Fluorescence488CameraExposure, setFluorescence488CameraExposure] = useState(100);
  // const [Fluorescence561Intensity, setFluorescence561Intensity] = useState(50);
  // const [Fluorescence561CameraExposure, setFluorescence561CameraExposure] = useState(100);
  // const [Fluorescence638Intensity, setFluorescence638Intensity] = useState(50);
  // const [Fluorescence638CameraExposure, setFluorescence638CameraExposure] = useState(100);
  // const [Fluorescence730Intensity, setFluorescence730Intensity] = useState(50);
  // const [Fluorescence730CameraExposure, setFluorescence730CameraExposure] = useState(100);
  const [illuminationIntensity, setIlluminationIntensity] = useState(50);
  const [illuminationChannel, setIlluminationChannel] = useState("0");
  const [cameraExposure, setCameraExposure] = useState(100);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [isPenActive, setIsPenActive] = useState(false); // State to track if the pen tool is active
  const [selectedModel, setSelectedModel] = useState('vit_b_lm'); // Default model
  const [similarityService, setSimilarityService] = useState(null);
  const [log, setLog] = useState('');
  const [segmentService, setSegmentService] = useState(null);
  const [isLightOn, setIsLightOn] = useState(false);
  const [isFirstClick, setIsFirstClick] = useState(true); // Track if it's the first click for segmentation

const handleLogin = async () => {
  const token = await login();
  await initializeServices(token);
  appendLog("Logged in.");
  setIsAuthenticated(true);
};

const appendLog = (message) => {
    setLog((prevLog) => prevLog + message + '\n');
};

const initializeServices = async (token) => {
    const server_url = "https://hypha.aicell.io";
    appendLog('Initializing connection to server...');

    const server = await hyphaWebsocketClient.connectToServer({
        name: "js-client",
        server_url,
        method_timeout: 10,
        token,
    });
    setServer(server);

    const segmentationService = await tryGetService(server, "Acquiring Segmentation", "agent-lens/interactive-segmentation", "interactive-segmentation");
    setSegmentService(segmentationService);
    const microscopeControlService = await tryGetService(server, "Microscope Control", "agent-lens/microscope-control-squid-test");
    setMicroscopeControl(microscopeControlService);
    const similarityService = await tryGetService(server, "Similarity Search", "agent-lens/image-embedding-similarity-search", "image-embedding-similarity-search");
    setSimilarityService(similarityService);
};

useEffect(() => {
    const statusInterval = setInterval(async () => {
        try {
            if (microscopeControl) {
                const status = await microscopeControl.get_status();
                updateUIBasedOnStatus(status);
            }
        } catch (statusError) {
            appendLog(`Error fetching status: ${statusError.message}`);
        }
    }, 5000);

    return () => clearInterval(statusInterval); // Cleanup on unmount
}, [microscopeControl]);

useEffect(() => {
  const initializeHyphaCore = async () => {
    if (!hyphaCoreInitialized.current) {
      hyphaCoreInitialized.current = true;

      // Dynamically import HyphaCore
      const module = await import('https://cdn.jsdelivr.net/npm/hypha-core@0.20.38/dist/hypha-core.mjs');
      const { HyphaCore } = module;

      window.hyphaCore = new HyphaCore();
      window.chatbotWindow = null;

      window.hyphaCore.on('add_window', (config) => {
        console.log('Creating window with config:', config); // For debugging
        console.log('config.window_id:', config.window_id);
      
        const wb = new WinBox(config.name || config.src.slice(0, 128), {
          id: 'chatbot-window', // Assign an ID to the window
          background: '#448aff',
          x: 'center',
          y: 'center',
          width: '40%',
          height: '70%',
          movable: true,
          resizable: true,
          minimizable: true, // Allow the window to be minimized
          index: 9999, // Ensure it appears above other elements
          onclose: function () {
            window.chatbotWindow = null; // Reset the reference when closed
          },
          buttons: ['min', 'max', 'close'],
        });
      
        // Set the iframe's id to config.window_id
        wb.body.innerHTML = `<iframe id="${config.window_id}" src="${config.src}" style="width: 100%; height: 100%; border: none;"></iframe>`;
      
        return wb;
      });        

      await window.hyphaCore.start();
      window.hyphaApi = window.hyphaCore.api;
    }
  };

  initializeHyphaCore();
}, [server]); // Empty dependency array ensures this runs once when the component mounts
  

  useEffect(() => {
    if (!map && mapRef.current) {
      // Define the extent of your image
      const imageWidth = 2048;
      const imageHeight = 2048;
      const extent = [0, 0, imageWidth, imageHeight];

      // Create a custom projection for the image
      const projection = new Projection({
        code: 'deepzoom-image',
        units: 'pixels',
        extent: extent,
      });

      addProjection(projection);

      // Initialize the map
      const initialMap = new Map({
        target: "map",
        layers: [],
        view: new View({
          projection: "deepzoom-image",
          center: [imageWidth / 2, imageHeight / 2],
          zoom: 2,
          minZoom: 0,
          maxZoom: 10,
        }),
        controls: defaultControls().extend([new ZoomSlider(), new FullScreen()]),
      });

      setMap(initialMap);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (map && userId) {
      // Remove existing image layer if any
      if (imageLayer) {
        map.removeLayer(imageLayer);
      }
      const extent = [0, 0, 2048, 2048];

      const tileUrl = isLocal()?
      `${window.location.protocol}//${window.location.hostname}:9000/public/apps/microscope-control/tiles`
      : "https://hypha.aicell.io/agent-lens/apps/microscope-control/tiles";


      const tileLayer = new TileLayer({
        source: new XYZ({
          url: `${tileUrl}/{z}/{x}/{y}.jpg`, // Update with your tile server URL
          crossOrigin: 'anonymous',
          tileSize: 256,
          maxZoom: 10, // Adjust based on your generated tiles
          projection: "deepzoom-image",
        }),
      });

      map.addLayer(tileLayer);
      setImageLayer(tileLayer);

      // Fit the map view to the image extent
      map.getView().fit(extent, { size: map.getSize() });
    }
  }, [map, isAuthenticated, userId]);
  
  useEffect(() => {
    return () => {
      if (snapshotImage) {
        URL.revokeObjectURL(snapshotImage);
      }
    };
  }, [snapshotImage]);
  

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
  
      map.addLayer(newVectorLayer);
      setVectorLayer(newVectorLayer);
    }
  }, [map, vectorLayer]); // Added vectorLayer to dependency array
   
  
  useEffect(() => {
    switch (illuminationChannel) {
      case "0":
        setIlluminationIntensity(BrightFieldIntensity);
        setCameraExposure(BrightFieldCameraExposure);
        break;
      case "11":
        setIlluminationIntensity(Fluorescence405Intensity);
        setCameraExposure(Fluorescence405CameraExposure);
        break;
      case "12":
        setIlluminationIntensity(Fluorescence488Intensity);
        setCameraExposure(Fluorescence488CameraExposure);
        break;
      case "14":
        setIlluminationIntensity(Fluorescence561Intensity);
        setCameraExposure(Fluorescence561CameraExposure);
        break;
      case "13":
        setIlluminationIntensity(Fluorescence638Intensity);
        setCameraExposure(Fluorescence638CameraExposure);
        break;
      case "15":
        setIlluminationIntensity(Fluorescence730Intensity);
        setCameraExposure(Fluorescence730CameraExposure);
        break;
      default:
        break;
    }
  }, [illuminationChannel, BrightFieldIntensity, BrightFieldCameraExposure, Fluorescence405Intensity, Fluorescence405CameraExposure, Fluorescence488Intensity, Fluorescence488CameraExposure, Fluorescence561Intensity, Fluorescence561CameraExposure, Fluorescence638Intensity, Fluorescence638CameraExposure, Fluorescence730Intensity, Fluorescence730CameraExposure]);
  
  const tryGetService = async(server, name, remoteId, localId = null) => {
    try {
      appendLog(`Acquiring ${name} service...`);
      const svc = await getService(server, remoteId, localId);
      appendLog(`${name} service acquired.`);
      return svc;
    } catch (error) {
      appendLog(`Error acquiring ${name} service: ${error.message}`);
      return null;
    }
  };

  const login_callback = (context) => {
    window.open(context.login_url);
  }
  
  const login = async() => {
    const serverUrl = "https://hypha.aicell.io";
    let token = localStorage.getItem("token");
    if (token) {
      const tokenExpiry = localStorage.getItem("tokenExpiry");
      if (tokenExpiry && new Date(tokenExpiry) > new Date()) {
        console.log("Using saved token:", token);
        return token;
      }
    }
    token = await hyphaWebsocketClient.login({
      server_url: serverUrl,
      login_callback: login_callback,
    });
    localStorage.setItem("token", token);
    localStorage.setItem(
      "tokenExpiry",
      new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    );
    return token;
  }

  const getServerUrl = () => {
    return getUrlParam("server") || window.location.origin;
  }

  const getUrlParam = (param_name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param_name);
  }

  const isLocal = () => {
    const serverUrl = getServerUrl();
    const localHosts = ["127.0.0.1", "localhost", "0.0.0.0"];
    return localHosts.includes(new URL(serverUrl).hostname);
  }

  const getService = async (server, remoteId, localId = null) => {
    const serviceId = localId && isLocal()? localId : remoteId;
    const svc = await server.getService(serviceId);
    return svc;
  }

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
  
      map.on('click', handleMapClick);
  
      // Clean up on unmount
      return () => {
        map.un('click', handleMapClick);
      };
    }
  }, [map, handleImageClick, isDrawingActive]);

  const updateUIBasedOnStatus = (status) => {
    setIsLightOn(status.is_illumination_on);
    setBrightFieldIntensity(status.BF_intensity_exposure[0]);
    setBrightFieldCameraExposure(status.BF_intensity_exposure[1]);
    setFluorescence405Intensity(status.F405_intensity_exposure[0]);
    setFluorescence405CameraExposure(status.F405_intensity_exposure[1]);
    setFluorescence488Intensity(status.F488_intensity_exposure[0]);
    setFluorescence488CameraExposure(status.F488_intensity_exposure[1]);
    setFluorescence561Intensity(status.F561_intensity_exposure[0]);
    setFluorescence561CameraExposure(status.F561_intensity_exposure[1]);
    setFluorescence638Intensity(status.F638_intensity_exposure[0]);
    setFluorescence638CameraExposure(status.F638_intensity_exposure[1]);
    setFluorescence730Intensity(status.F730_intensity_exposure[0]);
    setFluorescence730CameraExposure(status.F730_intensity_exposure[1]);
    //console.log(status);
  };
  

  const overlaySegmentationMask = (maskData) => {
    const extent = [0, 0, originalWidth, originalHeight];
  
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

  const handleResetEmbedding = async () => {
    if (!segmentService || !map) return;
  
    appendLog('Resetting embedding...');
    try {
      const result = await segmentService.reset_embedding();
      if (result) {
        appendLog('Embedding reset successfully.');
      } else {
        appendLog('No embedding was found to reset.');
      }
  
      // Remove segmentation layers from the map
      map.getLayers().getArray().slice().forEach((layer) => {
        if (layer.get('isSegmentationLayer')) {
          map.removeLayer(layer);
        }
      });
  
      // Also clear any features from the vectorLayer
      if (vectorLayer && vectorLayer.getSource()) {
        vectorLayer.getSource().clear();
      }
  
      appendLog('Segmentation overlays cleared.');
    } catch (error) {
      appendLog(`Error resetting embedding: ${error.message}`);
    }
  };

  const autoFocus = async () => {
    if (!microscopeControl) return;
    try {
      appendLog('Autofocusing...');
      await microscopeControl.auto_focus();
      appendLog('Autofocus completed.');
    } catch (error) {
      appendLog(`Error during autofocus: ${error.message}`);
    }
  };
  
  const snapImage = async () => {
    if (!microscopeControl) {
      appendLog('Microscope control is not initialized.');
      return;
    }
    try {
      appendLog('Snapping image...');
      let imageUrl = await microscopeControl.snap(
        parseInt(cameraExposure),
        parseInt(illuminationChannel),
        parseInt(illuminationIntensity)
      );
      if (!imageUrl) {
        throw new Error('Received empty image URL');
      }
  
      // Encode the URL to handle special characters
      imageUrl = encodeURI(imageUrl);
  
      // Fetch the image data with credentials
      const response = await fetch(imageUrl, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
  
      // Convert response to Blob
      const blob = await response.blob();
  
      // Create a Blob URL
      const imageObjectURL = URL.createObjectURL(blob);
  
      setSnapshotImage(imageObjectURL);
      appendLog('Image snapped and fetched successfully.');
    } catch (error) {
      appendLog(`Error snapping image: ${error.message}`);
      console.error('Error in snapImage:', error);
    }
  };

  const toggleLight = async () => {
      if (!microscopeControl) return;
      try {
          if (!isLightOn) {
              await microscopeControl.on_illumination();
              appendLog('Light turned on.');
          } else {
              await microscopeControl.off_illumination();
              appendLog('Light turned off.');
          }
          setIsLightOn(!isLightOn);
      } catch (error) {
          appendLog(`Error toggling light: ${error.message}`);
      }
  };

  return (
    <div className="main-container">
      {!isAuthenticated ? (
        <LoginPrompt onLogin={handleLogin} />
      ) : (
        <>
          <ImageDisplay
            mapRef={mapRef}
            isAuthenticated={isAuthenticated}
            userId={userId}
            snapshotImage={snapshotImage}
            handleImageClick={handleImageClick}
            toggleControls={() => setIsControlSectionOpen(!isControlSectionOpen)}
          />
          {isControlSectionOpen && (
            <ControlPanel
              illuminationIntensity={illuminationIntensity}
              setIlluminationIntensity={setIlluminationIntensity}
              illuminationChannel={illuminationChannel}
              setIlluminationChannel={setIlluminationChannel}
              cameraExposure={cameraExposure}
              setCameraExposure={setCameraExposure}
              toggleLight={toggleLight}
              autoFocus={autoFocus}
              snapImage={snapImage}
              handleResetEmbedding={handleResetEmbedding}
              isLightOn={isLightOn}
              microscopeControl={microscopeControl}
              segmentService={segmentService}
            />
          )}
        </>
      )}
      <LogSection log={log} />
    </div>
  );
};

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MicroscopeControl />);
