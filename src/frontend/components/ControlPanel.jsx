import React from 'react';

const ControlPanel = ({
  illuminationIntensity,
  setIlluminationIntensity,
  illuminationChannel,
  setIlluminationChannel,
  cameraExposure,
  setCameraExposure,
  toggleLight,
  autoFocus,
  snapImage,
  handleResetEmbedding,
  isLightOn,
  microscopeControl,
  segmentService,
}) => {
  const channelKeyMap = {
    11: 405,
    12: 488,
    14: 561,
    13: F638,
    15: 730,
  };

  const updateParametersOnServer = async (updatedParams) => {
    if (!microscopeControl) return;
    try {
      await microscopeControl.update_parameters_from_client(updatedParams);
    } catch (error) {
      console.error(`Error updating parameters on server: ${error.message}`);
    }
  };

  const updateIntensity = (newIntensity) => {
    setIlluminationIntensity(newIntensity);
    const key = channelKeyMap[illuminationChannel];
    if (key) {
      updateParametersOnServer({
        [key]: [newIntensity, cameraExposure],
      });
    };
  };

  const updateExposure = (newExposure) => {
    setCameraExposure(newExposure);
    const key = channelKeyMap[illuminationChannel];
    if (key) {
      updateParametersOnServer({
        [key]: [illuminationIntensity, newExposure],
      });
    }
  };

  return (
    <div id="control-chat-section" className="absolute top-0 right-0 w-1/4 h-full bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-50">
      <h3 className="section-title text-xl font-semibold mb-4">Manual Control</h3>
      <div id="manual-control-content">
        <div className="illumination-settings mb-4">
          <div className="illumination-intensity mb-4">
            <div className="intensity-label-row flex justify-between items-center mb-2">
              <label className="font-medium">Illumination Intensity:</label>
              <span>{illuminationIntensity}%</span>
            </div>
            <input
              type="range"
              className="control-input w-full"
              min="0"
              max="100"
              value={illuminationIntensity}
              onChange={(e) => { updateIntensity(parseInt(e.target.value), 10); }}
            />
          </div>

          <div className="illumination-channel mb-4">
            <label className="font-medium">Illumination Channel:</label>
            <select
              className="control-input w-full mt-2"
              value={illuminationChannel}
              onChange={(e) => { setIlluminationChannel(e.target.value); }}
            >
              <option value="0">BF LED matrix full</option>
              <option value="11">Fluorescence 405 nm Ex</option>
              <option value="12">Fluorescence 488 nm Ex</option>
              <option value="13">Fluorescence 638 nm Ex</option>
              <option value="14">Fluorescence 561 nm Ex</option>
              <option value="15">Fluorescence 730 nm Ex</option>
            </select>
          </div>
        </div>

        <div className="camera-exposure-settings mb-4">
          <label className="font-medium">Camera Exposure:</label>
          <input
            type="number"
            className="control-input w-full mt-2"
            value={cameraExposure}
            onChange={(e) => { updateExposure(parseInt(e.target.value, 10)); }}
          />
        </div>

        <div className="control-group">
          <div className="horizontal-buttons flex justify-between mb-4">
            <button
              className="control-button bg-blue-500 text-white px-4 py-2 rounded-lg"
              onClick={toggleLight}
              disabled={!microscopeControl}
            >
              <i className="fas fa-lightbulb icon mr-2"></i>
              {isLightOn ? 'Turn Light Off' : 'Turn Light On'}
            </button>
            <button
              className="control-button bg-blue-500 text-white px-4 py-2 rounded-lg"
              onClick={autoFocus}
              disabled={!microscopeControl}
            >
              <i className="fas fa-crosshairs icon mr-2"></i> Autofocus
            </button>
          </div>

          <div className="horizontal-buttons flex justify-between">
            <button
              className="control-button snap-button bg-green-500 text-white px-4 py-2 rounded-lg"
              onClick={snapImage}
              disabled={!microscopeControl}
            >
              <i className="fas fa-camera icon mr-2"></i> Snap Image
            </button>
            <button
              className="control-button reset-button bg-yellow-500 text-white px-4 py-2 rounded-lg"
              onClick={handleResetEmbedding}
              disabled={!segmentService}
            >
              <i className="fas fa-sync icon mr-2"></i> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;