class SentientPopup {
    constructor() {
        this.chatHistory = null;
        this.messageInput = null;
        this.sendButton = null;
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUI());
        } else {
            this.setupUI();
        }
    }

    setupUI() {
        this.chatHistory = document.getElementById('chatHistory');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');

        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => this.updateSendButtonState());

        document.getElementById('analyzePageBtn').addEventListener('click', () => this.handleQuickAction('analyze'));
        document.getElementById('summarizeBtn').addEventListener('click', () => this.handleQuickAction('summarize'));
        document.getElementById('searchBtn').addEventListener('click', () => this.handleQuickAction('search'));
        document.getElementById('extractDataBtn').addEventListener('click', () => this.handleQuickAction('extract-data'));

        this.messageInput.focus();
        this.loadChatHistory();
    }

    async handleQuickAction(action) {
        const button = document.getElementById(action === 'analyze' ? 'analyzePageBtn' : 
                                           action === 'summarize' ? 'summarizeBtn' :
                                           action === 'search' ? 'searchBtn' : 'extractDataBtn');
        
        button.classList.add('loading');
        
        try {
            if (action === 'search') {
                const query = this.showSearchDialog();
                if (!query) {
                    button.classList.remove('loading');
                    return;
                }
                const result = await this.performWebSearch(query);
                if (result) {
                    await this.addMessageWithTypewriter(result, 'dobby');
                }
            } else {
                const result = await this.analyzeCurrentPage(action);
                if (result) {
                    await this.addMessageWithTypewriter(result, 'dobby');
                }
            }
        } catch (error) {
                await this.addMessageWithTypewriter(`❌ ${action} failed: ${error.message}`, 'dobby');
        } finally {
            button.classList.remove('loading');
        }
    }

    async analyzeCurrentPage(action) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            let pageContent = '';
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        const title = document.title || '';
                        const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
                        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim()).filter(t => t).slice(0, 10);
                        const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim()).filter(t => t && t.length > 50).slice(0, 5);
                        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.textContent.trim(), href: a.href })).filter(l => l.text && l.text.length > 5).slice(0, 10);
                        
                        return {
                            title,
                            metaDescription,
                            headings,
                            paragraphs,
                            links,
                            url: window.location.href
                        };
                    }
                });
                
                if (results && results[0] && results[0].result) {
                    pageContent = JSON.stringify(results[0].result);
                }
            } catch (scriptError) {
                pageContent = `Page title: ${tab.title}, URL: ${tab.url}`;
            }
            
            const response = await fetch('http://localhost:3000/api/analyze-page', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Extension-ID': chrome.runtime.id
                },
                body: JSON.stringify({
                    url: tab.url,
                    action: action,
                    content: pageContent
                })
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.status}`);
            }

            const data = await response.json();
            return data.analysis || 'Analysis completed successfully.';
        } catch (error) {
            throw error;
        }
    }

    async performWebSearch(query) {
        try {
            const response = await fetch('http://localhost:3000/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Extension-ID': chrome.runtime.id
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            return data.result || 'Search completed successfully.';
        } catch (error) {
            throw error;
        }
    }

    async callDobbyAPI(message) {
        try {
            const response = await fetch('http://localhost:3000/api/dobby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Extension-ID': chrome.runtime.id
                },
                body: JSON.stringify({
                    message: message,
                    context: 'popup',
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data: data.response || 'No response available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;

        this.isProcessing = true;
        
        this.setInputState(false);
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        await this.saveChatHistory();
        this.showTypingIndicator();
        
        try {
            const response = await this.callDobbyAPI(message);
            this.hideTypingIndicator();
            
            if (response.success) {
                await this.addMessageWithTypewriter(response.data, 'dobby');
            } else {
                await this.addMessageWithTypewriter('Sorry, I encountered an error. Please try again.', 'dobby');
            }
            
            await this.saveChatHistory();
        } catch (error) {
                this.hideTypingIndicator();
            await this.addMessageWithTypewriter('Sorry, I encountered an error. Please try again.', 'dobby');
        }
        
        this.isProcessing = false;
        this.setInputState(true);
        this.messageInput.focus();
    }

    showSearchDialog() {
        const searchQuery = window.prompt('What would you like to search for?');
        return searchQuery;
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
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
        this.chatHistory.appendChild(messageDiv);
        
        this.saveChatHistory();
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async addMessageWithTypewriter(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
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
            this.chatHistory.appendChild(messageDiv);
        } else {
            // For Dobby messages, start with just the label
            messageContent.innerHTML = '<strong>Dobby:</strong> ';
            messageDiv.appendChild(messageContent);
            this.chatHistory.appendChild(messageDiv);
            
            // Scroll to show the start of the message
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Wait a moment before starting typewriter
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Create span for typed content
            const contentSpan = document.createElement('span');
            messageContent.appendChild(contentSpan);
            
            // Apply typewriter effect with plain text (no HTML formatting during typing)
            const plainText = this.escapeHtml(content);
            await this.typewriterEffect(contentSpan, plainText, 20);
            
            // After typing is complete, apply formatting
            let formattedContent = this.escapeHtml(content);
            formattedContent = formattedContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/^(.*)$/, '<p>$1</p>');
            
            contentSpan.innerHTML = formattedContent;
        }
        
        this.saveChatHistory();
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
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message dobby-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <strong>Dobby:</strong> <span class="typing-dots">thinking...</span>
            </div>
        `;
        
        this.chatHistory.appendChild(typingDiv);
        
        // Scroll to show the typing indicator at the start
        typingDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
        this.updateSendButtonState();
    }

    updateSendButtonState() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.messageInput.disabled;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearChatHistory() {
        this.chatHistory.innerHTML = '';
        this.addMessage('Hello! I\'m Dobby, your AI assistant. How can I help you today?', 'dobby');
        chrome.storage.local.set({ sentientPopupChatHistory: [] });
    }

    async loadChatHistory() {
        try {
            this.chatHistory.innerHTML = '';
            this.addMessage('Hello! I\'m Dobby, your AI assistant. How can I help you today?', 'dobby');
        } catch (error) {
            this.addMessage('Hello! I\'m Dobby, your AI assistant. How can I help you today?', 'dobby');
        }
    }

    async saveChatHistory() {
        return;
    }
}

new SentientPopup();
