import React, { useState } from 'react';
import PropTypes from 'prop-types';
import MapButton from './MapButton';

const PenButton = ({ appendLog, setIsFirstClick }) => {
    const [isPenActive, setIsPenActive] = useState(false);
    
    const activatePenTool = () => {
        setIsPenActive(!isPenActive);
        setIsFirstClick(true); // Reset to first click whenever the tool is activated
        document.body.style.cursor = isPenActive ? 'default' : 'crosshair';
        appendLog(isPenActive ? 'Pen tool deactivated.' : 'Pen tool activated. Click on the image to segment a cell.');
    };
    
    return (
        <MapButton onClick={activatePenTool} icon={isPenActive ? "fa-pencil-alt" : "fa-magic"} top="420" />
    );
}

// Props validation
PenButton.propTypes = {
    appendLog: PropTypes.func.isRequired,
    setIsFirstClick: PropTypes.func.isRequired,
};

export default PenButton;
