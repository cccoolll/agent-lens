import React, { StrictMode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import LogSection from './components/LogSection';
import LoginPrompt from './components/LoginPrompt';
import ImageDisplay from './components/ImageDisplay';
import IncubatorControl from './components/IncubatorControl';
import MicroscopeControlPanel from './components/MicroscopeControlPanel';
import Sidebar from './components/Sidebar';
import { login, initializeServices, getServer } from './utils';
import 'ol/ol.css';
import './main.css';

const MicroscopeControl = () => {    
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [microscopeControlService, setMicroscopeControlService] = useState(null);
  const [similarityService, setSimilarityService] = useState(null);
  const [log, setLog] = useState('');
  const [segmentService, setSegmentService] = useState(null);
  const [incubatorControlService, setIncubatorControlService] = useState(null);
  const [activeTab, setActiveTab] = useState('main');
  const [currentMap, setCurrentMap] = useState(null);
  const [snapshotImage, setSnapshotImage] = useState(null);
  const [addTileLayer, setAddTileLayer] = useState(null);
  const [channelNames, setChannelNames] = useState(null);
  const [vectorLayer, setVectorLayer] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      if (localStorage.getItem("token")) {
        await handleLogin();
      }
    }

    checkToken();
  }, []);

  const handleLogin = async () => {
    const token = await login();
    const server = await getServer(token);
    await initializeServices(server,
      setMicroscopeControlService, setSimilarityService, setSegmentService,
      setIncubatorControlService,
      appendLog);
    appendLog("Logged in.");
    setIsAuthenticated(true);
  };

  const appendLog = (message) => {
      setLog((prevLog) => prevLog + message + '\n');
  };  

  const renderContent = () => {
    switch (activeTab) {
      case 'main':
        return (
          <ImageDisplay
            appendLog={appendLog}
            segmentService={segmentService}
            microscopeControlService={microscopeControlService}
            incubatorControlService={incubatorControlService}
            setCurrentMap={setCurrentMap}
          />
        );
      case 'microscope':
        return (
          <div className="control-view">
            <MicroscopeControlPanel
              microscopeControlService={microscopeControlService}
              appendLog={appendLog}
              map={currentMap}
              setSnapshotImage={setSnapshotImage}
              snapshotImage={snapshotImage}
              segmentService={segmentService}
              addTileLayer={addTileLayer}
              channelNames={channelNames}
              vectorLayer={vectorLayer}
              onClose={() => {}}
            />
          </div>
        );
      case 'incubator':
        return (
          <div className="control-view">
            <IncubatorControl
              incubatorControlService={incubatorControlService}
              appendLog={appendLog}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <StrictMode>
      <div className="app-container">
        {!isAuthenticated ? (
          <LoginPrompt onLogin={handleLogin} />
        ) : (
          <div className="main-layout">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="content-area">
              {renderContent()}
              <LogSection log={log} />
            </div>
          </div>
        )}
      </div>
    </StrictMode>
  );
};

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MicroscopeControl />);
