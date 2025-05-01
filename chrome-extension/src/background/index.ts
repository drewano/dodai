import 'webextension-polyfill';
import { aiAgentStorage } from '@extension/storage';
import { aiAgent } from '@extension/shared/lib/services/ai-agent';

// Initialize AI Agent settings
aiAgentStorage.get().then(settings => {
  console.log('AI Agent settings loaded:', settings);
});

// Initialize the AI Agent
const initAIAgent = async () => {
  try {
    const isReady = await aiAgent.isReady();
    console.log('AI Agent initialized, is ready:', isReady);
  } catch (error) {
    console.error('Failed to initialize AI Agent:', error);
  }
};

initAIAgent();

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'QUERY_AI_AGENT') {
    aiAgent
      .ask(message.query)
      .then(response => {
        sendResponse({ success: true, response });
      })
      .catch(error => {
        console.error('Error querying AI Agent:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

console.log('Background script loaded');
