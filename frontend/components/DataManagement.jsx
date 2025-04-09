import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const DataManagement = ({ appendLog }) => {
  const [datasets, setDatasets] = useState([]);
  const [subfolders, setSubfolders] = useState([]);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch('/public/apps/agent-lens/datasets');
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

  useEffect(() => {
    const fetchSubfolders = async () => {
      try {
        const response = await fetch('/public/apps/agent-lens/subfolders?dataset_id=reef-imaging/u2os-fucci-drug-treatment&dir_path=20250328-treatment-out-of-incubator');
        if (!response.ok) {
          throw new Error('Failed to fetch subfolders');
        }
        const subfolders = await response.json();
        setSubfolders(subfolders);
        appendLog('Subfolders fetched successfully.');
      } catch (error) {
        appendLog(`Failed to fetch subfolders: ${error.message}`);
      }
    };

    fetchSubfolders();
  }, []);

  return (
    <div className="data-management-view">
      <h3 className="text-xl font-medium mb-4">Data Management</h3>
      <ul>
        {datasets.map((dataset, index) => (
          <li key={index}>{dataset.name}</li>
        ))}
      </ul>
      <h4 className="text-lg font-medium mt-4">Subfolders</h4>
      <ul>
        {subfolders.map((folder, index) => (
          <li key={index}>{folder.name}</li>
        ))}
      </ul>
    </div>
  );
};

DataManagement.propTypes = {
  appendLog: PropTypes.func.isRequired,
};

export default DataManagement; 