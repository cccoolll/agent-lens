import React, { useState } from 'react';
import { Draw } from 'ol/interaction';
import MapButton from './MapButton';
import PropTypes from 'prop-types';

const DrawButton = ({ map, vectorLayer, setIsDrawingActive, icon, drawType, top }) => {
  const [draw, setDraw] = useState(null);

  const addInteraction = (type) => {
    if (!['Point', 'LineString', 'Polygon'].includes(type)) {
      console.error(`Invalid draw type: ${type}`);
      return;
    }

    map.removeInteraction(draw);
  
    const newDraw = new Draw({
      source: vectorLayer.getSource(),
      type: type,
    });
  
    map.addInteraction(newDraw);
    setDraw(newDraw);
    setIsDrawingActive(true);
  
    newDraw.on('drawend', (event) => {
      const feature = event.feature;
      console.log('New feature added:', feature);
  
      map.removeInteraction(newDraw);
      setDraw(null);
      setIsDrawingActive(false);
    });
  };

  return (
    <>
      <MapButton onClick={() => addInteraction(drawType)} icon={icon} top={top} />
    </>
  )
};

// Prop validation
DrawButton.propTypes = {
  map: PropTypes.object,
  vectorLayer: PropTypes.object,
  setIsDrawingActive: PropTypes.func.isRequired,
  icon: PropTypes.string.isRequired,
  drawType: PropTypes.string.isRequired,
  top: PropTypes.string.isRequired,
};

export default DrawButton;