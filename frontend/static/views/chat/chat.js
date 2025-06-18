// filepath: frontend/static/views/chat/chat.js
// Assumes CONFIG is globally available from config.js

class NEAEChatInterface {
    constructor() {
        this.apiBaseUrl = CONFIG.API_BASE_URL;
        this.sessionId = null;
        this.isLoading = false;
    }

    init() {
        this.initializeElements();
        this.attachEventListeners();
        this.initializeSession();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.connectionStatus = document.getElementById('connectionStatus');
    }
    
    attachEventListeners() {
         if (this.sendButton) this.sendButton.addEventListener('click', () => this.sendMessage());
         if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            this.chatInput.addEventListener('input', (e) => {                if (e.target.value.length > CONFIG.MAX_MESSAGE_LENGTH) {
                    e.target.value = e.target.value.substring(0, CONFIG.MAX_MESSAGE_LENGTH);
                    ErrorHandler.showError(CONFIG.ERRORS.MESSAGE_TOO_LONG);
                }
            });
        }
    }    async initializeSession() {
        if (!this.connectionStatus || !this.chatInput) {
            console.warn("Chat elements not found during session initialization.");
            return; 
        }
        this.updateConnectionStatus('connecting', 'Conectando con el asistente...');
        ErrorHandler.showLoading('chatLoading', 'Inicializando chat...');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/chat/start`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Include cookies for auth
            });
            
            if (!response.ok) {
                const errorMessage = await ErrorHandler.handleAPIError(response, 'session initialization');
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            this.sessionId = data.session_id;
            this.updateConnectionStatus('connected', '✅ Conectado al asistente');
            this.chatInput.focus();
            ErrorHandler.hideLoading('chatLoading');
        } catch (error) {
            console.error('Error initializing session:', error);
            this.updateConnectionStatus('error', '❌ Error de conexión.');
            ErrorHandler.hideLoading('chatLoading');
            ErrorHandler.showError(error.message || CONFIG.ERRORS.CONNECTION_FAILED);
        }
    }

    updateConnectionStatus(type, message) {
        if (!this.connectionStatus) return;
        this.connectionStatus.className = `connection-status ${type}`;
        this.connectionStatus.textContent = message;
    }    async sendMessage() {
        if (!this.chatInput || !this.sessionId) return;
        const message = this.chatInput.value.trim();
        if (!message || this.isLoading) return;
        
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.setLoading(true);
        const loadingMessage = this.addMessage('El asistente está pensando', 'assistant', true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/chat/send`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Include cookies for auth
                body: JSON.stringify({ session_id: this.sessionId, pregunta: message })
            });
            
            if(loadingMessage && loadingMessage.remove) loadingMessage.remove();
            
            if (!response.ok) { 
                const errorMessage = await ErrorHandler.handleAPIError(response, 'sending message');
                throw new Error(errorMessage);
            }
            
            const data = await response.json();            this.addMessage(data.respuesta, 'assistant');
        } catch (error) {
            console.error('Error sending message:', error);
            if(loadingMessage && loadingMessage.remove) loadingMessage.remove();
            ErrorHandler.showError(error.message || 'Error al enviar el mensaje');
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(content, sender, isLoading = false) {
        if (!this.chatMessages) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        if (isLoading) {
            contentDiv.innerHTML = '<div class="loading">🤖 <span class="loading-dots"></span></div>';
        } else {
            contentDiv.innerHTML = this.processMessageContent(content);
        }
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return messageDiv;
    }

    processMessageContent(content) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let processedContent = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedContent = processedContent.replace(/^(📘|🧠|🏫|🧩|💡|🌐|✅|🧑‍🏫|🗂️|⚙️|🎯|🔍|⚠️|🔗|🎥|📋|🚫|📝|🚨|📄|🌍|🔧|📚|📱|🎵|🎤|🎧)([^\n]+)/gm, '<h4>$1$2</h4>');
        processedContent = processedContent.replace(/^(🔧|📝|🎥|📚|📱|🌍|💙|👥|🎨|🧑‍💻|📖|🎮|🔊|📊|📑|🎯|✨)([^\n]+)/gm, '<h5 style="margin-top: 10px; color: #555;">$1$2</h5>');
        processedContent = processedContent.replace(/^[•·-]\s+(.+)$/gm, '<li style="margin-left: 20px; list-style-type: disc;">$1</li>');
        processedContent = processedContent.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left: 20px; list-style-type: decimal;">$1</li>');        return processedContent;
    }

    setLoading(loading) {
        if (!this.sendButton || !this.chatInput) return;
        this.isLoading = loading;
        this.sendButton.disabled = loading;
        this.chatInput.disabled = loading;
        this.sendButton.textContent = loading ? '...' : 'Enviar';
        if (!loading) this.chatInput.focus();
    }
}

async function initializeChatPage() {
    console.log("Chat page loaded from chat.js");
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (typeof window.handleLogout === 'function') {
                await window.handleLogout();
            } else {
                console.error('handleLogout function not found on window.');
                // Fallback or direct implementation if needed
                sessionStorage.removeItem('isUserLoggedIn');
                if (typeof navigateTo === 'function') {
                    navigateTo('/login');
                } else {
                    console.error("navigateTo function is not defined. Cannot redirect after logout fallback.");
                }
            }
        });
    }

    if (typeof NEAEChatInterface !== 'undefined') {
        try {
            const userDataResponse = await fetch('/api/user-data');
            if (!userDataResponse.ok) {
                if (userDataResponse.status === 401) { 
                    sessionStorage.removeItem('isUserLoggedIn'); // Clear flag
                    if (typeof navigateTo === 'function') navigateTo('/login'); 
                    return; 
                }
                const errorElement = document.getElementById('connectionStatus');
                if (errorElement) {
                    errorElement.textContent = 'Error: No se pudieron cargar los datos del usuario.';
                    errorElement.className = 'connection-status error';
                }
                return;
            }
            const userData = await userDataResponse.json();
            const usageInfoEl = document.getElementById('usageInfo');
            if (usageInfoEl) {
                usageInfoEl.textContent = `Uso: ${userData.usage_count} / ${userData.max_uses}`;
            }
            
            const chatApp = new NEAEChatInterface();
            chatApp.init();

        } catch (error) {
            console.error("Error initializing chat page:", error);
            const errorElement = document.getElementById('connectionStatus');
            if (errorElement) {
                errorElement.textContent = 'Error crítico al cargar la página de chat.';
                errorElement.className = 'connection-status error';
            }
        }
    } else {
        console.error("NEAEChatInterface not defined.");
    }
}
