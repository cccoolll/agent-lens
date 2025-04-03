import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const DataManagement = ({ appendLog }) => {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch('/datasets');
        if (!response.ok) {
          throw new Error('Failed to fetch datasets');
        }
        const datasets = await response.json();
        setDatasets(datasets);
        appendLog('Datasets fetched successfully.');
      } catch (error) {
        appendLog(`Failed to fetch datasets: ${error.message}`);
      }
    };

    fetchDatasets();
  }, []);

  return (
    <div className="data-management-view">
      <h3 className="text-xl font-medium mb-4">Data Management</h3>
      <ul>
        {datasets.map((dataset, index) => (
          <li key={index}>{dataset.name}</li>
        ))}
      </ul>
    </div>
  );
};

DataManagement.propTypes = {
  appendLog: PropTypes.func.isRequired,
};

export default DataManagement; 