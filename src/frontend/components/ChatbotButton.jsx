import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import MapButton from './MapButton';
import WinBox from 'winbox/src/js/winbox';

const ChatbotButton = ({ microscopeControlService, appendLog, bottom }) => {
    const hyphaCoreInitialized = React.useRef(false);

    const createChatWindow = async (config) => {
        const wb = new WinBox(config.name || config.src.slice(0, 128), {
            id: 'chatbot-window', // Assign an ID to the window
            background: '#448aff',
            x: 'center',
            y: 'center',
            width: '40%',
            height: '70%',
            movable: true,
            resizable: true,
            minimizable: true, // Allow the window to be minimized
            index: 9999, // Ensure it appears above other elements
            onclose: function () {
                window.chatbotWindow = null; // Reset the reference when closed
            },
            buttons: ['min', 'max', 'close'],
        });
        
        // Set the iframe's id to config.window_id
        wb.body.innerHTML = `<iframe id="${config.window_id}" src="${config.src}" style="width: 100%; height: 100%; border: none;"></iframe>`;
        
        return wb;
    };

    useEffect(() => {
        const initializeHyphaCore = async () => {
            if (!hyphaCoreInitialized.current) {
                hyphaCoreInitialized.current = true;
            
                // Dynamically import HyphaCore
                const module = await import('https://cdn.jsdelivr.net/npm/hypha-core@0.20.38/dist/hypha-core.mjs');
                const { HyphaCore } = module;
            
                window.hyphaCore = new HyphaCore();
                window.chatbotWindow = null;
            
                window.hyphaCore.on('add_window', createChatWindow);
            
                await window.hyphaCore.start();
                window.hyphaApi = window.hyphaCore.api;
            }
        };
        
        initializeHyphaCore();
    }, []);

    const openChatbot = async (microscopeControlService, appendLog) => {
        try {
        // Ensure HyphaCore is initialized
        if (!window.hyphaCore || !window.hyphaApi) {
            appendLog('HyphaCore is not initialized.');
            return;
        }
    
        if (window.chatbotWindow && !window.chatbotWindow.closed) {
            // If the window is minimized, restore it
            if (window.chatbotWindow.minimized) {
            window.chatbotWindow.restore();
            } else {
            // Bring the window to front
            window.chatbotWindow.focus();
            }
        } else {
            appendLog('Opening chatbot window...');
            const url = await microscopeControlService.get_chatbot_url();
            window.chatbotWindow = await window.hyphaApi.createWindow({
            src: url,
            name: 'Chatbot',
            });
        }
        } catch (error) {
        appendLog(`Failed to open chatbot window: ${error.message}`);
        }
    };

    return (
        <MapButton onClick={() => openChatbot(microscopeControlService, appendLog)} icon="fa-comments" bottom={bottom} />
    );
}

ChatbotButton.propTypes = {
    microscopeControlService: PropTypes.object,
    appendLog: PropTypes.func.isRequired,
    bottom: PropTypes.string,
};

export default ChatbotButton;