import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeTab, onTabChange }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab ${activeTab === 'main' ? 'active' : ''}`}
          onClick={() => onTabChange('main')}
        >
          <i className="fas fa-home"></i>
          <span>Main</span>
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'microscope' ? 'active' : ''}`}
          onClick={() => onTabChange('microscope')}
        >
          <i className="fas fa-microscope"></i>
          <span>Microscope</span>
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'incubator' ? 'active' : ''}`}
          onClick={() => onTabChange('incubator')}
        >
          <i className="fas fa-temperature-high"></i>
          <span>Incubator</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 