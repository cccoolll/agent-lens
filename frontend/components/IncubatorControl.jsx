import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Rnd } from 'react-rnd';

const IncubatorControl = ({ onClose, appendLog, incubatorService }) => {
  // Example state for incubator parameters; adjust as needed.
  const [temperature, setTemperature] = useState(37);
  const [CO2, setCO2] = useState(5);

  const updateSettings = async () => {
    // Replace this with your actual incubator service call if available.
    if (incubatorService) {
      try {
        const result = await incubatorService.updateSettings({ temperature, CO2 });
        appendLog(`Incubator settings updated: Temp ${temperature}°C, CO2 ${CO2}%`);
      } catch (error) {
        appendLog(`Failed to update incubator settings: ${error.message}`);
      }
    } else {
      appendLog(`Updated incubator settings locally: Temp ${temperature}°C, CO2 ${CO2}%`);
    }
  };

  return (
    <Rnd
      default={{
        x: window.innerWidth - 500,
        y: 100,
        width: 300,
        height: 200,
      }}
      minWidth={250}
      minHeight={150}
      bounds="window"
      className="bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-50 border border-gray-300 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium">Incubator Control</h3>
        <button onClick={onClose} className="text-red-500 hover:text-red-700">
          <i className="fas fa-times"></i> Close
        </button>
      </div>
      <div className="incubator-settings">
        <div className="mb-4">
          <label className="block text-sm font-medium">Temperature (°C):</label>
          <input
            type="number"
            className="mt-1 block w-full border border-gray-300 rounded p-2"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">CO2 (%):</label>
          <input
            type="number"
            className="mt-1 block w-full border border-gray-300 rounded p-2"
            value={CO2}
            onChange={(e) => setCO2(parseFloat(e.target.value))}
          />
        </div>
        <button
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
          onClick={updateSettings}
        >
          Update Settings
        </button>
      </div>
    </Rnd>
  );
};

IncubatorControl.propTypes = {
  onClose: PropTypes.func.isRequired,
  appendLog: PropTypes.func.isRequired,
  incubatorService: PropTypes.object,
};

export default IncubatorControl;
