class SentientContentScript {
    constructor() {
        this.floatingButton = null;
        this.sidebar = null;
        this.isInjected = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }

    init() {
        if (this.isInjected) return;
        if (window.location.href.startsWith('chrome://') || 
            window.location.href.startsWith('chrome-extension://') ||
            window.location.href.startsWith('moz-extension://')) {
            return;
        }
        this.createFloatingButton();
        this.createSidebar();
        this.isInjected = true;
    }

    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.id = 'sentient-floating-btn';
        this.floatingButton.innerHTML = `
            <div class="sentient-btn-icon">
                <img src="${chrome.runtime.getURL('assets/dobby-character.png')}" alt="Dobby" class="dobby-avatar">
            </div>
            <div class="sentient-btn-tooltip">Ask Dobby</div>
        `;
        this.floatingButton.addEventListener('click', () => this.toggleSidebar());
        document.body.appendChild(this.floatingButton);
    }

    createSidebar() {
        // Create sidebar container
        this.sidebar = document.createElement('div');
        this.sidebar.id = 'sentient-sidebar';
        this.sidebar.innerHTML = `
            <div class="sentient-sidebar-header">
                <div class="sidebar-header-content">
                    <img src="${chrome.runtime.getURL('assets/dobby-character.png')}" alt="Dobby" class="dobby-sidebar-avatar">
                    <h3>Ask Dobby</h3>
                </div>
                <button class="sentient-close-btn" id="sentient-close-btn">×</button>
            </div>
            <div class="sentient-sidebar-content">
                <div id="sentient-chat-history" class="sentient-chat-history">
                    <div class="sentient-message sentient-dobby-message">
                        <div class="message-content">
                            <strong>Dobby:</strong> Hello! I'm here to help you with anything on this page. What can I do for you?
                        </div>
                    </div>
                </div>
                <div class="sentient-input-container">
                    <input type="text" id="sentient-message-input" placeholder="Ask Dobby about this page..." maxlength="500">
                    <button id="sentient-send-btn" class="sentient-send-btn">Send</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.sidebar.querySelector('#sentient-close-btn').addEventListener('click', () => this.closeSidebar());
        this.sidebar.querySelector('#sentient-send-btn').addEventListener('click', () => this.sendMessage());
        
        const messageInput = this.sidebar.querySelector('#sentient-message-input');
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.body.appendChild(this.sidebar);
    }


    toggleSidebar() {
        console.log('Toggle sidebar called, current state:', this.sidebar.classList.contains('sentient-sidebar-open'));
        
        if (this.sidebar.classList.contains('sentient-sidebar-open')) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        this.sidebar.classList.add('sentient-sidebar-open');
        this.floatingButton.style.opacity = '0.7';
        this.sidebarOpen = true;
        
        // Load chat history for this specific page
        this.loadChatHistory();
        
        // Focus input
        setTimeout(() => {
            const input = this.sidebar.querySelector('#sentient-message-input');
            if (input) input.focus();
        }, 300);
    }

    closeSidebar() {
        this.sidebar.classList.remove('sentient-sidebar-open');
        this.floatingButton.style.opacity = '1';
        this.sidebarOpen = false;
        
        // Clear chat when closing (as requested)
        this.clearChatHistory();
    }

    clearChatHistory() {
        const chatHistory = this.sidebar.querySelector('#sentient-chat-history');
        chatHistory.innerHTML = '';
        // Add welcome message
        this.addMessageToSidebar("Hello! I'm here to help you with anything on this page. What can I do for you?", 'dobby');
    }

    async loadChatHistory() {
        try {
            // Use page-specific storage key for isolated chat history
            const pageKey = `sentientChatHistory_${window.location.hostname}_${window.location.pathname}`;
            const result = await chrome.storage.local.get([pageKey]);
            const history = result[pageKey] || [];
            
            const chatHistory = this.sidebar.querySelector('#sentient-chat-history');
            chatHistory.innerHTML = '';
            
            if (history.length === 0) {
                this.addMessageToSidebar("Hello! I'm here to help you with anything on this page. What can I do for you?", 'dobby');
            } else {
                history.forEach(msg => {
                    this.addMessageToSidebar(msg.content, msg.sender);
                });
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.addMessageToSidebar("Hello! I'm here to help you with anything on this page. What can I do for you?", 'dobby');
        }
    }

    async saveChatHistory() {
        try {
            const chatHistory = this.sidebar.querySelector('#sentient-chat-history');
            const messages = Array.from(chatHistory.children).map(msg => {
                const content = msg.querySelector('.message-content');
                const sender = msg.classList.contains('sentient-user-message') ? 'user' : 'dobby';
                return {
                    content: content.textContent.replace(/^(You:|Dobby:)\s*/, ''),
                    sender: sender
                };
            });
            
            // Use page-specific storage key for isolated chat history
            const pageKey = `sentientChatHistory_${window.location.hostname}_${window.location.pathname}`;
            await chrome.storage.local.set({ [pageKey]: messages });
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    openSidebar() {
        this.sidebar.classList.add('sentient-sidebar-open');
        this.floatingButton.style.opacity = '0.7';
        this.sidebarOpen = true;
        
        // Focus input
        setTimeout(() => {
            const input = this.sidebar.querySelector('#sentient-message-input');
            if (input) input.focus();
        }, 300);
    }

    closeSidebar() {
        this.sidebar.classList.remove('sentient-sidebar-open');
        this.floatingButton.style.opacity = '1';
        this.sidebarOpen = false;
    }

    async sendMessage() {
        const input = this.sidebar.querySelector('#sentient-message-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message
        this.addMessageToSidebar(message, 'user');
        
        // Clear input
        input.value = '';

        // Show typing indicator
        this.showTypingIndicator();
        
        // Save chat after adding user message
        await this.saveChatHistory();

        try {
            // Get page context
            const pageContext = this.getPageContext();
            const contextualMessage = `${message}\n\nPage context: ${pageContext}`;

            // SECURE: Use background script proxy instead of direct fetch
            const response = await chrome.runtime.sendMessage({
                type: 'CALL_DOBBY_API',
                data: { 
                    message: contextualMessage,
                    context: 'floating_button'
                }
            });

            this.hideTypingIndicator();

            if (response && response.success) {
                await this.addMessageWithTypewriter(response.data, 'dobby');
            } else {
                const errorMsg = response?.error || 'Sorry, I encountered an error.';
                await this.addMessageWithTypewriter(errorMsg, 'dobby');
            }
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Background script communication error:', error);
            
            // Check if it's a server connection issue vs extension issue
            if (error.message && error.message.includes('Extension context invalidated')) {
                await this.addMessageWithTypewriter('Extension needs to be reloaded. Please refresh the page and reload the extension.', 'dobby');
            } else {
                // Try to detect if server is running
                try {
                    const healthCheck = await fetch('http://localhost:3000/health');
                    if (healthCheck.ok) {
                        await this.addMessageWithTypewriter('Server is running but background script communication failed. Please reload the extension.', 'dobby');
                    } else {
                        await this.addMessageWithTypewriter('Please start the server by running "npm start" in the server directory.', 'dobby');
                    }
                } catch {
                    await this.addMessageWithTypewriter('Please start the server by running "npm start" in the server directory.', 'dobby');
                }
            }
        }
        
        // Save chat even on error
        await this.saveChatHistory();
    }

    addMessageToSidebar(content, sender) {
        const chatHistory = this.sidebar.querySelector('#sentient-chat-history');
        const messageDiv = document.createElement('div');
        messageDiv.className = `sentient-message sentient-${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        let formattedContent = this.escapeHtml(content);
        formattedContent = formattedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/, '<p>$1</p>');
        
        if (sender === 'user') {
            messageContent.innerHTML = `<strong>You:</strong> ${formattedContent}`;
        } else {
            messageContent.innerHTML = `<strong>Dobby:</strong> ${formattedContent}`;
        }
        
        messageDiv.appendChild(messageContent);
        chatHistory.appendChild(messageDiv);
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async addMessageWithTypewriter(content, sender) {
        const chatHistory = this.sidebar.querySelector('#sentient-chat-history');
        const messageDiv = document.createElement('div');
        messageDiv.className = `sentient-message sentient-${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (sender === 'user') {
            let formattedContent = this.escapeHtml(content);
            formattedContent = formattedContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/^(.*)$/, '<p>$1</p>');
            
            messageContent.innerHTML = `<strong>You:</strong> ${formattedContent}`;
            messageDiv.appendChild(messageContent);
            chatHistory.appendChild(messageDiv);
        } else {
            messageContent.innerHTML = '<strong>Dobby:</strong> ';
            messageDiv.appendChild(messageContent);
            chatHistory.appendChild(messageDiv);
            
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const contentSpan = document.createElement('span');
            messageContent.appendChild(contentSpan);
            
            const plainText = this.escapeHtml(content);
            await this.typewriterEffect(contentSpan, plainText, 20);
            
            let formattedContent = this.escapeHtml(content);
            formattedContent = formattedContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/^(.*)$/, '<p>$1</p>');
            
            contentSpan.innerHTML = formattedContent;
        }
    }

    typewriterEffect(element, text, speed = 30) {
        return new Promise((resolve) => {
            element.textContent = '';
            let i = 0;
            
            const typeChar = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    resolve();
                }
            };
            
            typeChar();
        });
    }

    showTypingIndicator() {
        const chatHistory = this.sidebar.querySelector('#sentient-chat-history');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'sentient-message sentient-dobby-message sentient-typing';
        typingDiv.id = 'sentient-typing-indicator';
        typingDiv.innerHTML = '<strong>Dobby:</strong> <span class="sentient-typing-dots">typing...</span>';
        
        chatHistory.appendChild(typingDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = this.sidebar.querySelector('#sentient-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    getPageContext() {
        // Extract relevant page information for context
        const title = document.title || '';
        const url = window.location.href;
        const domain = window.location.hostname;
        
        // Get main content (simplified)
        const mainContent = document.querySelector('main, article, .content, #content, .main');
        let textContent = '';
        
        if (mainContent) {
            textContent = mainContent.textContent.slice(0, 500);
        } else {
            textContent = document.body.textContent.slice(0, 500);
        }
        
        return `Title: ${title}, URL: ${url}, Domain: ${domain}, Content preview: ${textContent.replace(/\s+/g, ' ').trim()}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Check if extension is enabled/disabled
    checkExtensionState() {
        return chrome.management ? 
            chrome.management.getSelf().then(info => info.enabled) : 
            Promise.resolve(true);
    }

    // Clean up when extension is disabled
    async cleanupOnDisable() {
        const isEnabled = await this.checkExtensionState();
        if (!isEnabled && this.floatingButton) {
            this.floatingButton.remove();
            this.floatingButton = null;
        }
        if (!isEnabled && this.sidebar) {
            this.sidebar.remove();
            this.sidebar = null;
        }
    }

    handleMessage(message, sender, sendResponse) {
        switch (message.type) {
            case 'TOGGLE_SIDEBAR':
                this.toggleSidebar();
                sendResponse({ success: true });
                break;
            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SentientContentScript();
    });
} else {
    new SentientContentScript();
}
