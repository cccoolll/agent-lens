import React from 'react';

const LoginPrompt = ({ onLogin }) => {
  return (
    <div className="login-prompt flex flex-col items-center justify-center h-screen">
      <p className="mb-4 text-lg">Please log in to access the application.</p>
      <button onClick={onLogin} className="btn btn-primary bg-blue-500 text-white px-4 py-2 rounded-lg">
        Log in to Hypha
      </button>
    </div>
  );
};

export default LoginPrompt;