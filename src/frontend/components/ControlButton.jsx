import React from 'react';
import PropTypes from 'prop-types';

const LogSection = ({ onClick, disbled }) => {
  return (
    <button
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 hover:shadow-lg transition-all"
        onClick={toggleLight}
        disabled={!microscopeControlService}
    >
        <i className="fas fa-lightbulb icon mr-2"></i>
        {isLightOn ? 'Turn Light Off' : 'Turn Light On'}
    </button>
  );
};



LogSection.propTypes = {
  log: PropTypes.string.isRequired,
};

export default LogSection;