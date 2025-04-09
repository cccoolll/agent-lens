import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const DataManagement = ({ appendLog }) => {
  const [datasets, setDatasets] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('reef-imaging/20250328-treatment-out-of-incubator');

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
        const response = await fetch(`/public/apps/agent-lens/subfolders?dataset_id=${selectedDataset}`);
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

    if (selectedDataset) {
      fetchSubfolders();
    }
  }, [selectedDataset]);

  const handleDatasetClick = (datasetId) => {
    setSelectedDataset(datasetId);
  };

  return (
    <div className="data-management-view">
      <h3 className="text-xl font-medium mb-4">Data Management</h3>
      <div className="grid grid-cols-1 gap-4">
        <div className="border rounded p-4">
          <h4 className="text-lg font-medium mb-2">Datasets</h4>
          <ul className="cursor-pointer">
            {datasets.map((dataset, index) => (
              <li 
                key={index} 
                className={`py-1 hover:bg-gray-100 ${selectedDataset === dataset.id ? 'bg-blue-100 font-medium' : ''}`}
                onClick={() => handleDatasetClick(dataset.id)}
              >
                {dataset.name}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="border rounded p-4">
          <h4 className="text-lg font-medium mb-2">
            Subfolders {selectedDataset && `(${selectedDataset.split('/').pop()})`}
          </h4>
          {subfolders.length > 0 ? (
            <ul>
              {subfolders.map((folder, index) => (
                <li key={index} className="py-1">
                  <i className="fas fa-folder mr-2 text-yellow-500"></i>
                  {folder.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No subfolders found</p>
          )}
        </div>
      </div>
    </div>
  );
};

DataManagement.propTypes = {
  appendLog: PropTypes.func.isRequired,
};

export default DataManagement; 