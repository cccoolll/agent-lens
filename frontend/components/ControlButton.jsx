import React from 'react';
import PropTypes from 'prop-types';

const ControlButton = ({ onClick, disabled = false, className = '', iconClass = '', children }) => (
  <button
    className={`w-full py-2 rounded-lg hover:shadow-lg transition-all ${className}`}
    onClick={onClick}
    disabled={disabled}
  >
    <i className={`${iconClass} icon mr-2`}></i>
    {children}
  </button>
);

ControlButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  iconClass: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default ControlButton;