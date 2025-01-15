import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import LogSection from './components/LogSection';
import LoginPrompt from './components/LoginPrompt';
import ImageDisplay from './components/ImageDisplay';
import { getService } from './utils';
import 'ol/ol.css';

const MicroscopeControl = () => {    
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [microscopeControlService, setMicroscopeControlService] = useState(null);
  // const [similarityService, setSimilarityService] = useState(null);
  const [log, setLog] = useState('');
  const [segmentService, setSegmentService] = useState(null);

  const handleLogin = async () => {
    const token = await login();
    await initializeServices(token);
    appendLog("Logged in.");
    setIsAuthenticated(true);
  };

  const appendLog = (message) => {
      setLog((prevLog) => prevLog + message + '\n');
  };  

  const initializeServices = async (token) => {
    const serverUrl = "https://hypha.aicell.io";
    appendLog('Initializing connection to server...');

    const server = await hyphaWebsocketClient.connectToServer({
      server_url: serverUrl,
      token: token,
      method_timeout: 500,
    });

    const segmentationService = await tryGetService(server, "Acquiring Segmentation", "agent-lens/interactive-segmentation", "interactive-segmentation");
    setSegmentService(segmentationService);
    const microscopeControlService = await tryGetService(server, "Microscope Control", "agent-lens/microscope-control-squid-test");
    setMicroscopeControlService(microscopeControlService);
    // const similarityService = await tryGetService(server, "Similarity Search", "agent-lens/image-embedding-similarity-search", "image-embedding-similarity-search");
    // setSimilarityService(similarityService);
  };
  
  const tryGetService = async(server, name, remoteId, localId = null) => {
    try {
      appendLog(`Acquiring ${name} service...`);
      const svc = await getService(server, remoteId, localId);
      appendLog(`${name} service acquired.`);
      return svc;
    } catch (error) {
      appendLog(`Error acquiring ${name} service: ${error.message}`);
      return null;
    }
  };

  const login_callback = (context) => {
    window.open(context.login_url);
  }
  
  const login = async() => {
    const serverUrl = "https://hypha.aicell.io";
    let token = localStorage.getItem("token");
    if (token) {
      const tokenExpiry = localStorage.getItem("tokenExpiry");
      if (tokenExpiry && new Date(tokenExpiry) > new Date()) {
        console.log("Using saved token:", token);
        return token;
      }
    }
    token = await hyphaWebsocketClient.login({
      server_url: serverUrl,
      login_callback: login_callback,
    });
    localStorage.setItem("token", token);
    localStorage.setItem(
      "tokenExpiry",
      new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    );
    return token;
  }

  return (
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
  );
};

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MicroscopeControl />);
