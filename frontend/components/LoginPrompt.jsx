import React from 'react';
import PropTypes from 'prop-types';

const LoginPrompt = ({ onLogin, error }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className="mb-4 text-lg font-normal">Please log in to access the application.</p>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-lg">
          <p className="font-bold">Connection Error</p>
          <p className="break-words">{error}</p>
        </div>
      )}
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
  error: PropTypes.string,
};

export default LoginPrompt;