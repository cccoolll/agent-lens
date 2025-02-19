import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Rnd } from 'react-rnd';
import ControlButton from './ControlButton';
import CameraSettings from './CameraSettings';

const ControlPanel = ({
  microscopeControlService,
  segmentService,
  setSnapshotImage,
  map,
  vectorLayer,
  appendLog,
  addTileLayer,
  channelNames,
}) => {
  const [isLightOn, setIsLightOn] = useState(false);
  const [xPosition, setXPosition] = useState(0);
  const [yPosition, setYPosition] = useState(0);
  const [zPosition, setZPosition] = useState(0);
  const [xMove, setXMove] = useState(0);
  const [yMove, setYMove] = useState(0);
  const [zMove, setZMove] = useState(0);
  const [illuminationIntensity, setIlluminationIntensity] = useState("50");
  const [illuminationChannel, setIlluminationChannel] = useState("0");
  const [cameraExposure, setCameraExposure] = useState(100);

  const moveMicroscope = (axis, direction) => {
    // Implement the logic to move the microscope
    appendLog(`Moving microscope ${axis} by ${direction}`);
  };

  const snapImage = async () => {
    appendLog('Snapping image...');
    let imageUrl = await microscopeControlService.snap();
    imageUrl = encodeURI(imageUrl);
    const response = await fetch(imageUrl, { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const imageObjectURL = URL.createObjectURL(blob);

    setSnapshotImage(imageObjectURL);
    appendLog('Image snapped and fetched successfully.');
  };

  const autoFocus = async () => {
    await microscopeControlService.auto_focus();
    appendLog('Auto-focusing...');
  };

  const toggleLight = async () => {
    if (!isLightOn) {
      // Implement logic to turn on the light
      appendLog('Light turned on.');
    } else {
      // Implement logic to turn off the light
      appendLog('Light turned off.');
    }
    setIsLightOn(!isLightOn);
  };

  const resetEmbedding = (map, vectorLayer) => {
    map.getLayers()
      .getArray()
      .slice()
      .filter((layer) => layer.get('isSegmentationLayer'))
      .forEach((layer) => {
      map.removeLayer(layer);
    });

    if (vectorLayer && vectorLayer.getSource()) {
        vectorLayer.getSource().clear();
    }
  };

  return (
    <Rnd
      default={{
        x: 0,
        y: 0,
        width: '30%',
        height: '60%',
      }}
      minWidth={300}
      minHeight={400}
      bounds="window"
      className="bg-white bg-opacity-95 p-6 rounded-lg shadow-lg z-50 border-l border-gray-300 box-border overflow-y-auto"
    >
      <h3 className="text-xl font-medium mb-4">Manual Control</h3>
      <div id="manual-control-content">
        <div className="coordinate-container mb-4 flex justify-between">
          {['x', 'y', 'z'].map((axis, index) => (
            <div key={axis} className="coordinate-group p-2 border border-gray-300 rounded-lg w-1/3">
              <div className="flex justify-between mb-2">
                <input
                  type="text"
                  className="control-input w-1/2 p-2 border border-gray-300 rounded"
                  placeholder={`${axis.toUpperCase()}(mm)`}
                  value={axis === 'x' ? xPosition : axis === 'y' ? yPosition : zPosition}
                  readOnly
                />
                <input
                  type="number"
                  className="control-input w-1/2 p-2 border border-gray-300 rounded"
                  placeholder={`d${axis.toUpperCase()}(mm)`}
                  value={axis === 'x' ? xMove : axis === 'y' ? yMove : zMove}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (axis === 'x') setXMove(value);
                    else if (axis === 'y') setYMove(value);
                    else setZMove(value);
                  }}
                />
              </div>
              <div className="aligned-buttons flex justify-between">
                <button
                  className="half-button bg-blue-500 text-white hover:bg-blue-600 w-1/2 mr-1 p-2 rounded"
                  onClick={() => moveMicroscope(axis, -1)}
                  disabled={!microscopeControlService}
                >
                  <i className={`fas fa-arrow-${axis === 'x' ? 'left' : 'down'}`}></i> {axis.toUpperCase()}-
                </button>
                <button
                  className="half-button bg-blue-500 text-white hover:bg-blue-600 w-1/2 ml-1 p-2 rounded"
                  onClick={() => moveMicroscope(axis, 1)}
                  disabled={!microscopeControlService}
                >
                  {axis.toUpperCase()}+ <i className={`fas fa-arrow-${axis === 'x' ? 'right' : 'up'}`}></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="illumination-settings mb-4 p-2 border border-gray-300 rounded-lg">
          <div className="illumination-intensity mb-4">
            <div className="intensity-label-row flex justify-between mb-2">
              <label>Illumination Intensity: </label>
              <span>{illuminationIntensity}%</span>
            </div>
            <input
              type="range"
              className="control-input w-full"
              min="0"
              max="100"
              value={illuminationIntensity}
              onChange={(e) => {
                const newIntensity = parseInt(e.target.value, 10);
                setIlluminationIntensity(newIntensity);
                // Update server with new intensity
              }}
            />
          </div>

          <div className="illumination-channel">
            <label>Illumination Channel:</label>
            <select
              className="control-input w-full mt-2 p-2 border border-gray-300 rounded"
              value={illuminationChannel}
              onChange={(e) => setIlluminationChannel(e.target.value)}
            >
              <option value="0">BF LED matrix full</option>
              <option value="11">Fluorescence 405 nm Ex</option>
              <option value="12">Fluorescence 488 nm Ex</option>
              <option value="14">Fluorescence 561nm Ex</option>
              <option value="13">Fluorescence 638nm Ex</option>
              <option value="15">Fluorescence 730nm Ex</option>
            </select>
          </div>
        </div>

        <div className="camera-exposure-settings mb-4 p-2 border border-gray-300 rounded-lg">
          <label>Camera Exposure:</label>
          <input
            type="number"
            className="control-input w-full mt-2 p-2 border border-gray-300 rounded"
            value={cameraExposure}
            onChange={(e) => setCameraExposure(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="control-group">
          <div className="horizontal-buttons flex justify-between">
            <button
              className="control-button bg-blue-500 text-white hover:bg-blue-600 w-1/4 p-2 rounded"
              onClick={toggleLight}
              disabled={!microscopeControlService}
            >
              <i className="fas fa-lightbulb icon"></i> {isLightOn ? 'Turn Light Off' : 'Turn Light On'}
            </button>
            <button
              className="control-button bg-blue-500 text-white hover:bg-blue-600 w-1/4 p-2 rounded"
              onClick={autoFocus}
              disabled={!microscopeControlService}
            >
              <i className="fas fa-crosshairs icon"></i> Autofocus
            </button>
            <button
              className="control-button snap-button bg-green-500 text-white hover:bg-green-600 w-1/4 p-2 rounded"
              onClick={snapImage}
              disabled={!microscopeControlService}
            >
              <i className="fas fa-camera icon"></i> Snap Image
            </button>
            <button
              className="control-button reset-button bg-yellow-500 text-white hover:bg-yellow-600 w-1/4 p-2 rounded"
              onClick={() => resetEmbedding(map, vectorLayer)}
              disabled={!segmentService}
            >
              <i className="fas fa-sync icon"></i> Reset
            </button>
          </div>
        </div>
      </div>
    </Rnd>
  );
};

ControlPanel.propTypes = {
  microscopeControlService: PropTypes.object,
  segmentService: PropTypes.object,
  setSnapshotImage: PropTypes.func.isRequired,
  appendLog: PropTypes.func.isRequired,
  map: PropTypes.object,
  vectorLayer: PropTypes.object,
  addTileLayer: PropTypes.func,
  channelNames: PropTypes.object,
};

export default ControlPanel;