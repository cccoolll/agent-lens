import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Rnd } from 'react-rnd';
import ControlButton from './ControlButton';
import CameraSettings from './CameraSettings';

const ControlPanel = ({
  microscopeControlService,
  setSnapshotImage,
  snapshotImage,
  map,
  appendLog,
  addTileLayer,
  channelNames,
  onClose,
}) => {
  const [isLightOn, setIsLightOn] = useState(false);
  const [move, setMove] = useState({ x: 0, y: 0, z: 0 });
  const canvasRef = useRef(null);

  const moveMicroscope = (axis, direction) => {
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
      appendLog('Light turned on.');
    } else {
      appendLog('Light turned off.');
    }
    setIsLightOn(!isLightOn);
  };

  const startLiveView = () => {
    appendLog('Starting live view...');
    // Implement live view logic
  };

  return (
    <Rnd
      default={{
        x: window.innerWidth - 500,
        y: 20,
        width: 500,
        height: 600,
      }}
      minWidth={300}
      minHeight={400}
      bounds="window"
      className="bg-white bg-opacity-95 p-6 rounded-lg shadow-lg z-50 border-l border-gray-300 box-border overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium">Manual Control</h3>
        <button onClick={onClose} className="text-red-500 hover:text-red-700">
          <i className="fas fa-times"></i> Close
        </button>
      </div>
      <div id="manual-control-content">
        <div
          id="image-display"
          className={`mb-4 w-full h-64 border ${
            snapshotImage ? 'border-gray-300' : 'border-dotted border-gray-400'
          } rounded flex items-center justify-center`}
        >
          {snapshotImage ? (
            <canvas
              ref={canvasRef}
              width={500}
              height={400}
              className="border border-gray-300 rounded"
            ></canvas>
          ) : (
            <p className="placeholder-text text-center">Image Display</p>
          )}
        </div>

        <div className="control-group mb-4">
          <div className="horizontal-buttons flex justify-between space-x-2">
            <ControlButton
              className="control-button bg-blue-500 text-white hover:bg-blue-600 w-1/4 p-2 rounded"
              onClick={toggleLight}
              disabled={!microscopeControlService}
              iconClass="fas fa-lightbulb"
            >
              {isLightOn ? 'Turn Light Off' : 'Turn Light On'}
            </ControlButton>
            <ControlButton
              className="bg-blue-500 text-white hover:bg-blue-600 w-1/4 p-2 rounded"
              onClick={autoFocus}
              disabled={!microscopeControlService}
              iconClass="fas fa-crosshairs"
            >
              Autofocus
            </ControlButton>
            <ControlButton
              className="control-button snap-button bg-green-500 text-white hover:bg-green-600 w-1/4 p-2 rounded"
              onClick={snapImage}
              disabled={!microscopeControlService}
              iconClass="fas fa-camera"
            >
              Snap Image
            </ControlButton>
            <ControlButton
              className="control-button live-button bg-purple-500 text-white hover:bg-purple-600 w-1/4 p-2 rounded"
              onClick={startLiveView}
              disabled={!microscopeControlService}
              iconClass="fas fa-video"
            >
              Live
            </ControlButton>
          </div>
        </div>

        <div className="coordinate-container mb-4 flex justify-between">
          {['x', 'y', 'z'].map((axis) => (
            <div key={axis} className="coordinate-group p-2 border border-gray-300 rounded-lg w-1/3">
              <div className="flex justify-between mb-2">
                <input
                  type="text"
                  className="control-input w-1/2 p-2 border border-gray-300 rounded"
                  placeholder={`${axis.toUpperCase()}(mm)`}
                  value={0}
                  readOnly
                />
                <input
                  type="number"
                  className="control-input w-1/2 p-2 border border-gray-300 rounded"
                  placeholder={`d${axis.toUpperCase()}(mm)`}
                  value={move[axis]}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setMove(prev => ({ ...prev, [axis]: value }));
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
        <CameraSettings
          map={map}
          microscopeControlService={microscopeControlService}
          addTileLayer={addTileLayer}
          channelNames={channelNames}
        />
      </div>
    </Rnd>
  );
};

ControlPanel.propTypes = {
  microscopeControlService: PropTypes.object,
  segmentService: PropTypes.object,
  setSnapshotImage: PropTypes.func.isRequired,
  snapshotImage: PropTypes.string,
  appendLog: PropTypes.func.isRequired,
  map: PropTypes.object,
  vectorLayer: PropTypes.object,
  addTileLayer: PropTypes.func,
  channelNames: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default ControlPanel;