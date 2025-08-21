chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    switch (message.type) {
        case 'CALL_DOBBY_API':
            handleDobbyAPI(message.data, sendResponse);
            return true; // Keep the message channel open for async response
            
        case 'ANALYZE_PAGE':
            handleAnalyzePage(message.data, sendResponse);
            return true;
            
        case 'SEARCH_WEB':
            handleWebSearch(message.data, sendResponse);
            return true;
            
        case 'GET_SETTINGS':
            handleGetSettings(sendResponse);
            return true;
            
        case 'UPDATE_SETTINGS':
            handleUpdateSettings(message.data, sendResponse);
            return true;
            
        default:
            sendResponse({ success: false, error: 'Unknown message type' });
    }
});

async function handleDobbyAPI(data, sendResponse) {
    try {
        
        const response = await callFireworksAPI(data.message);
        
        sendResponse({ 
            success: true, 
            data: response 
        });
    } catch (error) {
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

async function callFireworksAPI(message) {
    try {
        const serverResponse = await fetch('http://localhost:3000/api/dobby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Extension-ID': chrome.runtime.id
            },
            body: JSON.stringify({
                message: message,
                context: 'content_script',
                timestamp: new Date().toISOString()
            })
        });

        if (serverResponse.ok) {
            const data = await serverResponse.json();
            return data.response || data.message || 'Server response received';
        }
        
        throw new Error('Server not available');
        
    } catch (error) {
        
        const fallbackResponses = [
            "Hello! I'm Dobby, your AI assistant. I'm currently running in offline mode since the server isn't available.",
            "I'm here to help! While my full capabilities require the server to be running, I can still assist you with basic tasks.",
            "Hi there! I notice the server connection isn't available right now, but I'm still here to help in any way I can.",
            "Greetings! I'm operating in limited mode since the API server isn't running, but I'm ready to assist you.",
            "Hello! I'm your AI assistant Dobby. For full functionality, please make sure the server is running on localhost:3000."
        ];
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
}

async function handleAnalyzePage(data, sendResponse) {
    try {
        const analysis = await analyzePage(data);
        sendResponse({ success: true, data: analysis });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handleWebSearch(data, sendResponse) {
    try {
        const results = await performWebSearch(data.query);
        sendResponse({ success: true, data: results });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handleGetSettings(sendResponse) {
    try {
        const result = await chrome.storage.local.get(['sentientSettings']);
        const settings = result.sentientSettings || {
            sidebarEnabled: true,
            autoRespond: false,
            theme: 'light'
        };
        sendResponse({ success: true, data: settings });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handleUpdateSettings(data, sendResponse) {
    try {
        await chrome.storage.local.set({ sentientSettings: data });
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function analyzePage(data) {
    return "Page analysis complete. This feature provides insights about the current webpage content.";
}

async function performWebSearch(query) {
    return `Search results for: "${query}". This feature would provide relevant web search results.`;
}

chrome.runtime.onInstalled.addListener((details) => {
    
    if (details.reason === 'install') {
        chrome.storage.local.set({
            sentientSettings: {
                sidebarEnabled: true,
                autoRespond: false,
                theme: 'light'
            },
            isFirstRun: true
        });
    }
});

chrome.action.onClicked.addListener(async (tab) => {
});

const injectedTabs = new Set();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('moz-extension://') &&
        !injectedTabs.has(tabId)) {
        
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
        }).then(() => {
            injectedTabs.add(tabId);
        }).catch(() => {
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
});
