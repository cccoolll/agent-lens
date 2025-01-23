import React from 'react';
import PropTypes from 'prop-types';

const LoginPrompt = ({ onLogin }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className="mb-4 text-lg font-normal">Please log in to access the application.</p>
      <button
        onClick={onLogin}
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-md text-lg font-medium shadow-lg transition-all duration-300 ease-in-out hover:bg-gradient-to-r hover:from-sky-400 hover:to-blue-500 hover:shadow-lg hover:translate-y-[-2px]"
      >
        Log in to Hypha
      </button>
    </div>
  );
};

LoginPrompt.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default LoginPrompt;