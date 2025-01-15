import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { makeMap, addTileLayer, addMapMask } from './MapSetup';
import MapButton from './MapButton';
import ChatbotButton from './ChatbotButton';
import MapInteractions from './MapInteractions';
import ControlPanel from './components/ControlPanel';

const ImageDisplay = ({ appendLog, segmentService, microscopeControlService }) => {
  const map = useRef(null);
  const mapRef = useRef(null); // Reference to the map container
  const [vectorLayer, setVectorLayer] = useState(null);
  const [isControlSectionOpen, setIsControlSectionOpen] = useState(false);
  const [snapshotImage, setSnapshotImage] = useState(null);

  const imageWidth = 2048;
  const imageHeight = 2048;
  const extent = [0, 0, imageWidth, imageHeight];

  useEffect(() => {
    if (!map.current && mapRef.current) {
      map.current = makeMap(mapRef, extent);
      addTileLayer(map.current, extent);
      addMapMask(map.current, setVectorLayer);

      return () => {
        map.current.un('click');
      };
    }
  }, [mapRef]);

  useEffect(() => {
    return () => {
      if (snapshotImage) {
        URL.revokeObjectURL(snapshotImage);
      }
    };
  }, [snapshotImage]);

  const handleResetEmbedding = async () => {
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
    <>
      <div className="relative top-0 left-0 w-full h-screen bg-gray-100 flex items-center justify-center overflow-hidden">
        <div ref={mapRef} className="w-full h-full"></div>
        <MapButton onClick={() => setIsControlSectionOpen(!isControlSectionOpen)} icon="fa-cog" bottom="10" right="10" />
        <MapInteractions segmentService={segmentService} snapshotImage={snapshotImage} map={map} extent={extent} appendLog={appendLog} vectorLayer={vectorLayer} />
        <ChatbotButton microscopeControlService={microscopeControlService} appendLog={appendLog} bottom="10" />
      </div>
      {isControlSectionOpen && (
        <ControlPanel
          setSnapshotImage={setSnapshotImage}
          microscopeControl={microscopeControlService}
          segmentService={segmentService}
          appendLog={appendLog}
          resetEmbedding={handleResetEmbedding}
        />
      )}
    </>
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