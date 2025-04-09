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
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

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
        const paginationParams = `&offset=${offset}&limit=${limit}`;
        const response = await fetch(`/public/apps/agent-lens/subfolders?dataset_id=${selectedDataset}${pathParam}${paginationParams}`);
        if (!response.ok) {
          throw new Error('Failed to fetch subfolders');
        }
        const data = await response.json();
        setSubfolders(data.items || []);
        setTotalItems(data.total || data.items?.length || 0);
        appendLog(`Fetched ${data.items?.length} of ${data.total} items (offset: ${offset}, limit: ${limit})`);
      } catch (error) {
        appendLog(`Failed to fetch subfolders: ${error.message}`);
      }
    };

    if (selectedDataset) {
      fetchSubfolders();
    }
  }, [selectedDataset, currentPath, offset, limit]);

  const handleDatasetClick = (datasetId) => {
    setSelectedDataset(datasetId);
    setCurrentPath('');
    setBreadcrumbs([]);
    setOffset(0); // Reset pagination when changing dataset
  };

  const handleFolderClick = (folderName) => {
    // Prevent clicking on non-directory items or empty folder names
    if (!folderName || typeof folderName !== 'string') {
      appendLog('Invalid folder name');
      return;
    }
    
    // Check if we're already in this folder to prevent duplicates
    if (currentPath.split('/').pop() === folderName) {
      appendLog(`Already in folder: ${folderName}`);
      return;
    }
    
    // Create new path, ensuring no duplicate slashes
    const newPath = currentPath 
      ? (currentPath.endsWith('/') ? `${currentPath}${folderName}` : `${currentPath}/${folderName}`)
      : folderName;
    
    setCurrentPath(newPath);
    
    // Update breadcrumbs
    if (currentPath === '') {
      setBreadcrumbs([{ name: folderName, path: folderName }]);
    } else {
      // Ensure we're not creating duplicate breadcrumbs
      if (!breadcrumbs.some(b => b.path === newPath)) {
        setBreadcrumbs([...breadcrumbs, { name: folderName, path: newPath }]);
      }
    }
    
    setOffset(0); // Reset pagination when navigating to a new folder
    appendLog(`Navigating to folder: ${newPath}`);
  };

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      // Navigate to root
      setCurrentPath('');
      setBreadcrumbs([]);
      appendLog('Navigated to root directory');
    } else if (index >= 0 && index < breadcrumbs.length) {
      // Navigate to specific breadcrumb
      const breadcrumb = breadcrumbs[index];
      setCurrentPath(breadcrumb.path);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      appendLog(`Navigated to: ${breadcrumb.path}`);
    } else {
      appendLog('Invalid breadcrumb navigation');
    }
    setOffset(0); // Reset pagination when navigating with breadcrumbs
  };

  const handlePrevPage = () => {
    if (offset - limit >= 0) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < totalItems) {
      setOffset(offset + limit);
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    if (!isNaN(newLimit) && newLimit > 0) {
      setLimit(newLimit);
      setOffset(0); // Reset offset when changing limit
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

  // Function to format the total count, showing "999+" when the count is exactly 1000
  const formatTotalCount = (count) => {
    return count === 1000 ? "999+" : count;
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
          
          {/* Pagination controls */}
          <div className="flex items-center justify-between mb-3 text-sm bg-gray-50 p-2 rounded">
            <div className="flex items-center space-x-2">
              <button 
                onClick={handlePrevPage} 
                disabled={offset === 0}
                className={`px-2 py-1 border rounded ${offset === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
              >
                Previous
              </button>
              <span>
                Showing {offset + 1} - {Math.min(offset + limit, totalItems)} of {formatTotalCount(totalItems)}
              </span>
              <button 
                onClick={handleNextPage}
                disabled={offset + limit >= totalItems}
                className={`px-2 py-1 border rounded ${offset + limit >= totalItems ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
              >
                Next
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="limit">Items per page:</label>
              <input
                id="limit"
                type="number"
                min="1"
                value={limit}
                onChange={handleLimitChange}
                className="border rounded w-16 px-2 py-1"
              />
            </div>
          </div>
          
          {subfolders.length > 0 ? (
            <ul>
              {subfolders.map((item, index) => (
                <li 
                  key={index} 
                  className={`py-1 cursor-pointer hover:bg-gray-100 ${
                    item.type === 'directory' && currentPath.split('/').pop() === item.name 
                      ? 'bg-blue-50 border-l-4 border-blue-500 pl-1' 
                      : ''
                  }`}
                  onClick={() => item.type === 'directory' 
                    ? handleFolderClick(item.name) 
                    : handleFileClick(item)
                  }
                >
                  {item.type === 'directory' ? (
                    <>
                      <i className={`fas fa-folder mr-2 ${
                        currentPath.split('/').pop() === item.name 
                          ? 'text-blue-500' 
                          : 'text-yellow-500'
                      }`}></i>
                      {item.name}
                      {currentPath.split('/').pop() === item.name && 
                        <span className="ml-2 text-xs text-blue-500">(current)</span>
                      }
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