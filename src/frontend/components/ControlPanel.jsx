import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ControlButton from './ControlButton';
import CameraSettings from './CameraSettings';

const ControlPanel = ({
  microscopeControlService,
  segmentService,
  setSnapshotImage,
  mapCurrent,
  vectorLayer,
  appendLog,
  addTileLayer,
  channelNames,
}) => {
  const [isLightOn, setIsLightOn] = useState(false);

  const snapImage = async () => {
    appendLog('Snapping image...');
    let imageUrl = await microscopeControlService.snap();
    // TODO: Are these options necessary?
    // cameraExposure,
    // illuminationChannel,
    // illuminationIntensity

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
  };
  
  const toggleLight = async () => {
      if (!isLightOn) {
          await microscopeControlService.on_illumination();
          appendLog('Light turned on.');
      } else {
          await microscopeControlService.off_illumination();
          appendLog('Light turned off.');
      }
      setIsLightOn(!isLightOn);
  };

  const resetEmbedding = (mapCurrent, vectorLayer) => {
    mapCurrent.getLayers()
      .getArray()
      .slice()
      .filter((layer) => layer.get('isSegmentationLayer'))
      .forEach((layer) => {
      mapCurrent.removeLayer(layer);
    });

    if (vectorLayer && vectorLayer.getSource()) {
        vectorLayer.getSource().clear();
    }
  };

  return (
    <div className="absolute top-40 right-0 w-[23%] h-[40%] bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-50 border-l border-gray-300 box-border overflow-y-auto">
      <h3 className="text-xl font-medium">Manual Control</h3>
      <CameraSettings mapCurrent={mapCurrent} microscopeControlService={microscopeControlService} addTileLayer={addTileLayer} channelNames={channelNames} />
      <div>
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
              onClick={() => resetEmbedding(mapCurrent, vectorLayer)}
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
  mapCurrent: PropTypes.object,
  vectorLayer: PropTypes.object,
  addTileLayer: PropTypes.func,
  channelNames: PropTypes.object,
};

export default ControlPanel;