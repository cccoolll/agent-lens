import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const DataManagement = ({ appendLog }) => {
  const [datasets, setDatasets] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('reef-imaging/20250328-treatment-out-of-incubator');
  const [currentPath, setCurrentPath] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

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
        const pathParam = currentPath ? `&dir_path=${currentPath}` : '';
        const response = await fetch(`/public/apps/agent-lens/subfolders?dataset_id=${selectedDataset}${pathParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch subfolders');
        }
        const subfolders = await response.json();
        setSubfolders(subfolders);
        appendLog(`Subfolders fetched successfully for path: ${currentPath || 'root'}`);
      } catch (error) {
        appendLog(`Failed to fetch subfolders: ${error.message}`);
      }
    };

    if (selectedDataset) {
      fetchSubfolders();
    }
  }, [selectedDataset, currentPath]);

  const handleDatasetClick = (datasetId) => {
    setSelectedDataset(datasetId);
    setCurrentPath('');
    setBreadcrumbs([]);
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    
    // Update breadcrumbs
    if (currentPath === '') {
      setBreadcrumbs([{ name: folderName, path: folderName }]);
    } else {
      setBreadcrumbs([...breadcrumbs, { name: folderName, path: newPath }]);
    }
    
    appendLog(`Navigating to folder: ${newPath}`);
  };

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      // Navigate to root
      setCurrentPath('');
      setBreadcrumbs([]);
    } else {
      // Navigate to specific breadcrumb
      const breadcrumb = breadcrumbs[index];
      setCurrentPath(breadcrumb.path);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  const handleFileClick = async (file) => {
    setSelectedFile(file);
    
    // For certain file types, we can generate a preview URL
    if (file.name.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
      try {
        const response = await fetch(`/public/apps/agent-lens/file?dataset_id=${selectedDataset}&file_path=${currentPath ? `${currentPath}/` : ''}${file.name}`);
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            setFilePreviewUrl(data.url);
            appendLog(`Generated preview URL for ${file.name}`);
          }
        } else {
          setFilePreviewUrl(null);
          appendLog(`Could not generate preview for ${file.name}`);
        }
      } catch (error) {
        setFilePreviewUrl(null);
        appendLog(`Error generating preview: ${error.message}`);
      }
    } else {
      setFilePreviewUrl(null);
    }
  };

  const closeFileDetails = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
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
            Contents of {selectedDataset && `${selectedDataset.split('/').pop()}`}
          </h4>
          
          {/* Breadcrumb navigation */}
          <div className="flex items-center mb-3 text-sm">
            <span 
              className="text-blue-500 hover:underline cursor-pointer" 
              onClick={() => navigateToBreadcrumb(-1)}
            >
              Root
            </span>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <span className="mx-1">/</span>
                <span 
                  className="text-blue-500 hover:underline cursor-pointer"
                  onClick={() => navigateToBreadcrumb(index)}
                >
                  {crumb.name}
                </span>
              </React.Fragment>
            ))}
          </div>
          
          {subfolders.length > 0 ? (
            <ul>
              {subfolders.map((item, index) => (
                <li 
                  key={index} 
                  className="py-1 cursor-pointer hover:bg-gray-100"
                  onClick={() => item.type === 'directory' 
                    ? handleFolderClick(item.name) 
                    : handleFileClick(item)
                  }
                >
                  {item.type === 'directory' ? (
                    <>
                      <i className="fas fa-folder mr-2 text-yellow-500"></i>
                      {item.name}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file mr-2 text-gray-500"></i>
                      {item.name} 
                      {item.size && <span className="text-xs text-gray-500 ml-2">({formatFileSize(item.size)})</span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No items found</p>
          )}
        </div>
        
        {/* File Details Modal */}
        {selectedFile && (
          <div className="border rounded p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-medium">File Details</h4>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={closeFileDetails}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="font-medium">Name:</div>
              <div>{selectedFile.name}</div>
              
              <div className="font-medium">Type:</div>
              <div>{selectedFile.name.split('.').pop().toUpperCase()}</div>
              
              <div className="font-medium">Size:</div>
              <div>{formatFileSize(selectedFile.size || 0)}</div>
              
              <div className="font-medium">Last Modified:</div>
              <div>{formatDate(selectedFile.last_modified)}</div>
            </div>
            
            {filePreviewUrl && (
              <div className="mt-4">
                <h5 className="text-md font-medium mb-2">Preview</h5>
                <img 
                  src={filePreviewUrl} 
                  alt={selectedFile.name}
                  className="max-w-full h-auto border rounded" 
                />
              </div>
            )}
            
            <div className="mt-4">
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                onClick={() => window.open(`/public/apps/agent-lens/download?dataset_id=${selectedDataset}&file_path=${currentPath ? `${currentPath}/` : ''}${selectedFile.name}`, '_blank')}
              >
                <i className="fas fa-download mr-1"></i> Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

DataManagement.propTypes = {
  appendLog: PropTypes.func.isRequired,
};

export default DataManagement; 