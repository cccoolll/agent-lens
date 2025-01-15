import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ControlButton from './ControlButton';
// import WinBox from 'winbox/src/js/winbox';

const ControlPanel = ({
  microscopeControlService,
  segmentService,
  setSnapshotImage,
  appendLog
}) => {
  const [isLightOn, setIsLightOn] = useState(false);
  const [cameraExposure, setCameraExposure] = useState(100);
  const [illuminationIntensity, setIlluminationIntensity] = useState(50);
  const [illuminationChannel, setIlluminationChannel] = useState("0");

  const channelKeyMap = {
    0: "BF",
    11: 405,
    12: 488,
    14: 561,
    13: 638,
    15: 730,
  };

  useEffect(() => {
    async function updateMicroscopeParamters() {
      await microscopeControlService.update_parameters_from_client({
      [channelKeyMap[illuminationChannel]]: [illuminationIntensity, cameraExposure],
      });
    }

    updateMicroscopeParamters();
  }, [illuminationIntensity, cameraExposure, illuminationChannel]);

  const snapImage = async () => {
    appendLog('Snapping image...');
    let imageUrl = await microscopeControlService.snap(
      cameraExposure,
      illuminationChannel,
      illuminationIntensity
    );
    await updateMicroscopeStatus();

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

  const handleResetEmbedding = async () => {
    // map.getLayers()
    //     .getArray()
    //     .slice()
    //     .filter((layer) => layer.get('isSegmentationLayer'))
    //     .forEach((layer) => {
    //       map.removeLayer(layer);
    //     });

    // if (vectorLayer && vectorLayer.getSource()) {
    //   vectorLayer.getSource().clear();
    // }
  };

  const updateMicroscopeStatus = async () => {
    const status = await microscopeControlService.get_status();
    updateUIBasedOnStatus(status);
  };

  const fluorescenceOptions = Object.entries(channelKeyMap).map(([key, value]) => (
    key == 0?
      <option key={key}>BF LED matrix full</option>
      : <option key={key} value={key}>Fluorescence {value} nm Ex</option>
  ));

  const updateUIBasedOnStatus = (status) => {
    setIsLightOn(status.is_illumination_on);
    const channelName = channelKeyMap[illuminationChannel];
    const { intensity, exposure } = status[`${channelName}_intensity_exposure`];
    setIlluminationIntensity(intensity);
    setCameraExposure(exposure);
  };

  const autoFocus = async () => {
    await microscopeControlService.auto_focus();
    await updateMicroscopeStatus();
  };
  
  const toggleLight = async () => {
      if (!isLightOn) {
          await microscopeControlService.on_illumination();
          appendLog('Light turned on.');
      } else {
          await microscopeControlService.off_illumination();
          appendLog('Light turned off.');
      }
      await updateMicroscopeStatus();
      setIsLightOn(!isLightOn);
  };

  return (
    <div className="absolute top-40 right-0 w-[23%] h-[40%] bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-50 border-l border-gray-300 box-border overflow-y-auto">
      <h3 className="text-xl font-medium">Manual Control</h3>
      <div>
        <div className="mb-4 flex flex-col flex-wrap justify-between">
          <div className="mb-4 w-full box-border">
            <div className="flex items-center mb-2">
              <label className="font-medium inline m-2">Illumination Intensity:</label>
              <span className="inline m-2">{illuminationIntensity}%</span>
            </div>
            <input
              type="range"
              className="w-full rounded-lg mt-1"
              min="0"
              max="100"
              value={illuminationIntensity}
              onChange={(e) => { setIlluminationIntensity(parseInt(e.target.value, 10)); }}
            />
          </div>
  
          <div className="w-full box-border">
            <label className="font-medium block mb-2 mt-1">Illumination Channel:</label>
            <select
              className="w-full mt-2 rounded-lg mb-1 p-2"
              value={illuminationChannel}
              onChange={(e) => { setIlluminationChannel(e.target.value); }}
            >
              {fluorescenceOptions}
            </select>
          </div>
        </div>
  
        <div className="flex flex-col items-start">
          <label className="font-medium block mt-1">Camera Exposure:</label>
          <input
            type="number"
            className="w-80 mt-2 rounded-lg border-gray-300 p-2 border-2"
            value={cameraExposure}
            onChange={(e) => { setCameraExposure(parseInt(e.target.value, 10)); }}
          />
        </div>
  
        <div className="flex flex-col items-start mt-4">
          <div className="flex justify-between mb-4 w-full gap-5">
          <ControlButton
              className="bg-blue-500 text-white hover:bg-blue-600"
              onClick={toggleLight}
              disabled={!microscopeControlService}
              iconClass="fas fa-lightbulb"
            >
              {isLightOn ? 'Turn Light Off' : 'Turn Light On'}
            </ControlButton>
            <ControlButton
              className="bg-blue-500 text-white hover:bg-blue-600"
              onClick={autoFocus}
              disabled={!microscopeControlService}
              iconClass="fas fa-crosshairs"
            >
              Autofocus
            </ControlButton>
          </div>
          <div className="flex justify-between w-full gap-5">
            <ControlButton
              className="bg-green-500 text-white hover:bg-green-600"
              onClick={snapImage}
              disabled={!microscopeControlService}
              iconClass="fas fa-camera"
            >
              Snap Image
            </ControlButton>
            <ControlButton
              className="bg-yellow-500 text-white hover:bg-yellow-600"
              onClick={handleResetEmbedding}
              disabled={!segmentService}
              iconClass="fas fa-sync"
            >
              Reset
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
};

ControlPanel.propTypes = {
  microscopeControlService: PropTypes.object,
  segmentService: PropTypes.object,
  setSnapshotImage: PropTypes.func.isRequired,
  appendLog: PropTypes.func.isRequired,
};

export default ControlPanel;