import React from 'react';

const LogSection = ({ log }) => {
  return (
    <div id="log-section" className="mt-4 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Log</h3>
      <div className="log-content max-h-52 overflow-y-auto bg-gray-200 p-2 rounded-lg">
        <pre id="log-text" className="text-sm">{log}</pre>
      </div>
    </div>
  );
};

export default LogSection;