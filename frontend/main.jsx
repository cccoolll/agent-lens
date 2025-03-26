import React, { StrictMode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import LogSection from './components/LogSection';
import LoginPrompt from './components/LoginPrompt';
import ImageDisplay from './components/ImageDisplay';
import IncubatorControl from './components/IncubatorControl'; // new import
import { login, initializeServices, getServer } from './utils';
import 'ol/ol.css';

const MicroscopeControl = () => {    
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [microscopeControlService, setMicroscopeControlService] = useState(null);
  const [similarityService, setSimilarityService] = useState(null);
  const [log, setLog] = useState('');
  const [segmentService, setSegmentService] = useState(null);
  const [incubatorControlService, setIncubatorControlService] = useState(null); // new state

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
      setIncubatorControlService, // pass setter for incubator control service
      appendLog);
    appendLog("Logged in.");
    setIsAuthenticated(true);
  };

  const appendLog = (message) => {
      setLog((prevLog) => prevLog + message + '\n');
  };  

  return (
    <StrictMode>
      <div className="main-container relative">
        {!isAuthenticated ? (
          <LoginPrompt onLogin={handleLogin} />
        ) : (
          <>
            <ImageDisplay
              appendLog={appendLog}
              segmentService={segmentService}
              microscopeControlService={microscopeControlService}
              incubatorControlService={incubatorControlService} // pass incubator service
            />
          </>
        )}
        <LogSection log={log} />
      </div>
    </StrictMode>
  );
};

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MicroscopeControl />);
