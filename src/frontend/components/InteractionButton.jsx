import React, { useState } from 'react';
import { Draw } from 'ol/interaction';
import MapButton from './MapButton';
import PropTypes from 'prop-types';

const InteractionButton = ({ map, vectorLayer, setIsDrawingActive, icon, drawType, top }) => {
  const [draw, setDraw] = useState(null);

  const addInteraction = (type) => {

    if (draw) {
      map.removeInteraction(draw);
    }
  
    const newDraw = new Draw({
      source: vectorLayer.getSource(),
      type: type, // 'Point', 'LineString', 'Polygon'
    });
  
    map.addInteraction(newDraw);
    setDraw(newDraw);
    setIsDrawingActive(true); // Set drawing active
  
    newDraw.on('drawend', (event) => {
      const feature = event.feature;
      console.log('New feature added:', feature);
  
      // After drawing ends, remove the interaction
      map.removeInteraction(newDraw);
      setDraw(null);
      setIsDrawingActive(false); // Reset drawing active state
    });
  };

  return (
    <>
      <MapButton onClick={() => addInteraction(drawType)} icon={icon} top={top} />
    </>
  )
};

// Prop validation
InteractionButton.propTypes = {
  map: PropTypes.object.isRequired,
  vectorLayer: PropTypes.object.isRequired,
  setIsDrawingActive: PropTypes.func.isRequired,
  icon: PropTypes.string.isRequired,
  drawType: PropTypes.string.isRequired,
  top: PropTypes.string.isRequired,
};

export default InteractionButton;