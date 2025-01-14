import React from 'react';
import PropTypes from 'prop-types';

const MapButton = ({ onClick, icon, top, disabled }) => {
    return (
        <button
            className={`absolute left-2.5 p-2.5 z-40 bg-blue-600 text-white border-none rounded-md text-xs font-medium cursor-pointer shadow-inner transition-all duration-300 ease-in-out hover:bg-blue-800 hover:shadow-xl hover:translate-y-[-2px]`}
            style={{ top: `${top}px` }}
            onClick={onClick}
            disabled={disabled? disabled : false}
        >
            <i className={`fas ${icon} icon`}></i>
        </button>
    )
}

MapButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    icon: PropTypes.string.isRequired,
    top: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
};

export default MapButton;
