import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const DataManagement = ({ appendLog }) => {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        // Assume getArtifactManager is a function that returns the artifact manager
        const { artifact_manager } = await getArtifactManager();
        const datasets = await artifact_manager.list(artifact_id="dataset-gallery");
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