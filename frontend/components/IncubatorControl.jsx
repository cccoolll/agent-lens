import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const IncubatorControl = ({ incubatorControlService, appendLog }) => {
  // Example state for incubator parameters; adjust as needed.
  const [temperature, setTemperature] = useState(37);
  const [CO2, setCO2] = useState(5);
  const [isUpdating, setIsUpdating] = useState(false);
  const [slotsInfo, setSlotsInfo] = useState(Array(42).fill({}));
  // New state for selected slot details
  const [selectedSlot, setSelectedSlot] = useState(null);

  const updateSettings = async () => {
    if (incubatorControlService) {
      try {
        const temp = await incubatorControlService.get_temperature();
        const co2 = await incubatorControlService.get_co2_level();
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

  const fetchSlotInformation = async () => {
    if (incubatorControlService) {
      try {
        const updatedSlotsInfo = [];
        for (let i = 1; i <= 42; i++) {
          const slotInfo = await incubatorControlService.get_slot_information(i);
          updatedSlotsInfo.push(slotInfo);
        }
        setSlotsInfo(updatedSlotsInfo);
        appendLog(`Slots information updated`);
      } catch (error) {
        appendLog(`Failed to update slots information: ${error.message}`);
      }
    }
  };

  useEffect(() => {
    // Call updateSettings and fetchSlotInformation once when the component mounts
    updateSettings();
    fetchSlotInformation();

    // Set an interval to update slots information every 10 seconds
    const interval = setInterval(fetchSlotInformation, 10000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleOpen = () => {
    setIsUpdating(true);
  };

  const handleClose = () => {
    setIsUpdating(false);
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
  };

  const renderSlots = () => {
    return slotsInfo.map((slot, index) => {
      const isOrange = slot.name && slot.name.trim();
      const bgColor = isOrange ? '#f97316' : '#22c55e'; // orange vs green
      return (
        <button
          key={index + 1}
          style={{ backgroundColor: bgColor }}
          className="w-8 h-8 m-1 rounded"
          onClick={isOrange ? () => handleSlotClick(slot) : undefined}
        >
          {index + 1}
        </button>
      );
    });
  };

  return (
    <div className="bg-white bg-opacity-95 p-6 rounded-lg shadow-lg border-l border-gray-300 box-border overflow-y-auto">
      <h3 className="text-xl font-medium mb-4">Incubator Control</h3>
      <div id="incubator-control-content">
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
          {/* New container for Microplate Racks */}
          <div className="rounded-lg border border-gray-300 p-4 mt-4">
            <h4 className="text-lg font-bold mb-2 text-center">Microplate Slots</h4>
            <div className="grid grid-cols-2 gap-x-1 gap-y-1">
              <div className="grid grid-cols-1">
                {renderSlots().slice(0, 21).reverse()}
              </div>
              <div className="grid grid-cols-1">
                {renderSlots().slice(21).reverse()}
              </div>
            </div>
          </div>
        </div>
        {/* New small window for slot details */}
        {selectedSlot && (
          <div
            className="absolute bg-white border border-gray-300 shadow-md p-4 rounded m-4"
            style={{ zIndex: 60 }}
          >
            <button onClick={() => setSelectedSlot(null)} className="text-red-500 float-right">
              X
            </button>
            <h4 className="font-bold mb-2">
              Slot {selectedSlot.incubator_slot || '?'} Details
            </h4>
            <p>Name: {selectedSlot.name}</p>
            <p>Date to Incubator: {selectedSlot.date_to_incubator}</p>
            <p>Start Imaging: {selectedSlot.start_imaging}</p>
            <p>End Imaging: {selectedSlot.end_imaging}</p>
            <p>Time Lapse Hours: {selectedSlot.time_lapse_hours}</p>
            <p>Allocated Microscope: {selectedSlot.allocated_microscope}</p>
          </div>
        )}
      </div>
    </div>
  );
};

IncubatorControl.propTypes = {
  incubatorControlService: PropTypes.object,
  appendLog: PropTypes.func.isRequired,
};

export default IncubatorControl;
