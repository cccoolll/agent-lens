import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Rnd } from 'react-rnd';

const IncubatorControl = ({ onClose, appendLog, incubatorService }) => {
  // Example state for incubator parameters; adjust as needed.
  const [temperature, setTemperature] = useState(37);
  const [CO2, setCO2] = useState(5);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let interval;
    if (isUpdating) {
      interval = setInterval(async () => {
        if (incubatorService) {
          try {
            const temp = await incubatorService.get_temperature();
            const co2 = await incubatorService.get_co2_level();
            setTemperature(temp);
            setCO2(co2);
            appendLog(`Incubator information updated: Temp ${temp}°C, CO2 ${co2}%`);
          } catch (error) {
            appendLog(`Failed to update incubator information: ${error.message}`);
          }
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isUpdating, incubatorService, appendLog]);

  const handleOpen = () => {
    setIsUpdating(true);
  };

  const handleClose = () => {
    setIsUpdating(false);
    onClose();
  };

  const updateSettings = async () => {
    // Replace this with your actual incubator service call if available.
    if (incubatorService) {
      try {
        const temp = await incubatorService.get_temperature();
        const co2 = await incubatorService.get_co2_level();
        setTemperature(temp);
        setCO2(co2);
        appendLog(`Incubator information updated: Temp ${temp}°C, CO2 ${co2}%`);
      } catch (error) {
        appendLog(`Failed to update incubator information: ${error.message}`);
      }
    } else {
      appendLog(`Updated incubator information locally: Temp ${temperature}°C, CO2 ${CO2}%`);
    }
  };

  const renderSlots = () => {
    const slots = [];
    for (let i = 1; i <= 42; i++) {
      slots.push(
        <button
          key={i}
          className="w-8 h-8 bg-green-500 m-1 rounded"
        >
          {i}
        </button>
      );
    }
    return slots;
  };

  return (
    <Rnd
      default={{
        x: window.innerWidth - 1500,
        y: 100,
        width: 900,
        height: 600,
      }}
      minWidth={750}
      minHeight={450}
      bounds="window"
      className="bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-50 border border-gray-300 overflow-y-auto"
      onDragStart={handleOpen}
      onResizeStart={handleOpen}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium">Incubator Control</h3>
        <button onClick={handleClose} className="text-red-500 hover:text-red-700">
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
            readOnly
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">CO2 (%):</label>
          <input
            type="number"
            className="mt-1 block w-full border border-gray-300 rounded p-2"
            value={CO2}
            readOnly
          />
        </div>
        <button
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
          onClick={updateSettings}
        >
          Update Settings
        </button>
        <div className="grid grid-cols-2 gap-1 mt-4">
          <div className="grid grid-cols-1">
            {renderSlots().slice(0, 21).reverse()}
          </div>
          <div className="grid grid-cols-1">
            {renderSlots().slice(21).reverse()}
          </div>
        </div>
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
