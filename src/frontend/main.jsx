import React, { StrictMode, useState } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import LogSection from './components/LogSection';
import LoginPrompt from './components/LoginPrompt';
import ImageDisplay from './components/ImageDisplay';
import { login, initializeServices } from './utils';
import 'ol/ol.css';

const MicroscopeControl = () => {    
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [microscopeControlService, setMicroscopeControlService] = useState(null);
  const [similarityService, setSimilarityService] = useState(null);
  const [log, setLog] = useState('');
  const [segmentService, setSegmentService] = useState(null);

  const handleLogin = async () => {
    const serverUrl = "https://hypha.aicell.io";
    const token = await login(serverUrl);
    await initializeServices(serverUrl, token, setMicroscopeControlService, setSimilarityService, setSegmentService, appendLog);
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
          <ImageDisplay
            appendLog={appendLog}
            segmentService={segmentService}
            microscopeControlService={microscopeControlService}
          />
        )}
        <LogSection log={log} />
      </div>
    </StrictMode>
  );
};

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MicroscopeControl />);
