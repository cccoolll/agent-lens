// import { get as getProjection, Projection } from 'ol/proj';

const [xMove, setXMove] = useState(1);
  const [yMove, setYMove] = useState(1);
  const [zMove, setZMove] = useState(0.1);
  const [isPlateScanRunning, setIsPlateScanRunning] = useState(false);
  // const [numSimilarResults, setNumSimilarResults] = useState(5);
  // const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

const overlaySegmentationFeature = (coordinates) => {
  const feature = new ol.Feature({
    geometry: new ol.geom.Polygon([coordinates]),
  });

  vectorLayer.getSource().addFeature(feature);
};

const updateParameters = async (updatedParams) => {
    if (!microscopeControl) return;
    try {
        appendLog('Updating parameters on the server...');
        const response = await microscopeControl.update_parameters_from_client(updatedParams);
        if (response.success) {
            appendLog('Parameters updated successfully.');
        } else {
            appendLog('Failed to update parameters.');
        }
    } catch (error) {
        appendLog(`Error updating parameters: ${error.message}`);
    }
};

const handleSimilaritySearch = async () => {
  console.log(
    snapshotImage,
    similarityService,
    numSimilarResults
  );

  if (!snapshotImage || !similarityService) {
    appendLog('No image or service available for similarity search.');
    return;
  }
  setIsLoading(true);
  appendLog('Starting similarity search...');
  try {
      // Fetch the image data as a Blob
      const response = await fetch(snapshotImage);
      const blob = await response.blob();
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);
      const imageData = {
          name: 'snapshot'
      };
      const results = await similarityService.find_similar_images(uint8Array, imageData, parseInt(numSimilarResults));
      appendLog(`Found ${results.length} similar images.`);
      // Save the results to the state
      setSearchResults(results);
  } catch (error) {
      appendLog(`Error searching for similar images: ${error.message}`);
  } finally {
      setIsLoading(false);
  }
};

 // Add this above the return statement in MicroscopeControl
 const isDraggingRef = useRef(false);
 const startXRef = useRef(0);
 const startYRef = useRef(0);

 const handleMouseDown = (event) => {
   isDraggingRef.current = true;
   startXRef.current = event.clientX;
   startYRef.current = event.clientY;
 };

 const handleMouseMove = (event) => {
   if (!isDraggingRef.current) return;

   const deltaX = event.clientX - startXRef.current;
   const deltaY = event.clientY - startYRef.current;

   if (deltaX !== 0) moveMicroscope('x', deltaX / 10); // Adjust sensitivity
   if (deltaY !== 0) moveMicroscope('y', deltaY / 10); // Adjust sensitivity

   startXRef.current = event.clientX;
   startYRef.current = event.clientY;
 };

 const handleMouseUp = () => {
   if (isDraggingRef.current) {
     isDraggingRef.current = false;
     snapImage(); // Snap the image when dragging stops
   }
 };

 const moveToPosition = async () => {
     if (!microscopeControl) return;
     try {
         appendLog(`Attempting to move to position: (${xMove}, ${yMove}, ${zMove})`);
         const result = await microscopeControl.move_to_position(xMove, yMove, zMove);
         if (result.success) {
             appendLog(result.message);
             appendLog(`Moved from (${result.initial_position.x}, ${result.initial_position.y}, ${result.initial_position.z}) to (${result.final_position.x}, ${result.final_position.y}, ${result.final_position.z})`);
         } else {
             appendLog(`Move failed: ${result.message}`);
         }
     } catch (error) {
         appendLog(`Error in moveToPosition: ${error.message}`);
     }
 };

 const startPlateScan = async () => {
    if (!microscopeControl) return;
    try {
        if (!isPlateScanRunning) {
            await microscopeControl.scan_well_plate();
            appendLog('Plate scan started.');
        } else {
            await microscopeControl.stop_scan();
            appendLog('Plate scan stopped.');
        }
        setIsPlateScanRunning(!isPlateScanRunning);
    } catch (error) {
        appendLog(`Error in plate scan: ${error.message}`);
    }
};

const setIllumination = async () => {
    if (!microscopeControl) return;
    try {
        await microscopeControl.set_illumination(
            parseInt(illuminationChannel),
            parseInt(illuminationIntensity)
        );
        appendLog(`Illumination set: Channel ${illuminationChannel}, Intensity ${illuminationIntensity}%`);
    } catch (error) {
        appendLog(`Error setting illumination: ${error.message}`);
    }
};

const setCameraExposureTime = async () => {
    if (!microscopeControl) return;
    try {
        await microscopeControl.set_camera_exposure(parseInt(cameraExposure));
        appendLog(`Camera exposure set to ${cameraExposure}ms`);
    } catch (error) {
        appendLog(`Error setting camera exposure: ${error.message}`);
    }
};

const moveMicroscope = useCallback(
async (direction, multiplier) => {
    if (!microscopeControl) {
    appendLog('microscopeControl is null in moveMicroscope');
    return;
    }
    try {
    let moveX = 0,
        moveY = 0,
        moveZ = 0;
    if (direction === 'x') moveX = xMove * multiplier;
    else if (direction === 'y') moveY = yMove * multiplier;
    else if (direction === 'z') moveZ = zMove * multiplier;

    appendLog(`Attempting to move by: ${moveX}, ${moveY}, ${moveZ}`);
    const result = await microscopeControl.move_by_distance(
        moveX,
        moveY,
        moveZ
    );
    if (result.success) {
        appendLog(result.message);
        appendLog(
        `Moved from (${result.initial_position.x}, ${result.initial_position.y}, ${result.initial_position.z}) to (${result.final_position.x}, ${result.final_position.y}, ${result.final_position.z})`
        );
    } else {
        appendLog(`Move failed: ${result.message}`);
    }
    } catch (error) {
    appendLog(`Error in moveMicroscope: ${error.message}`);
    }
},
[microscopeControl, xMove, yMove, zMove]
);