import React from 'react';
import PropTypes from 'prop-types';
import MapButton from './MapButton';

const ChatbotButton = ({ microscopeControlService, appendLog, bottom }) => {

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