class NEAEChatInterface {
    constructor() {
        this.apiBaseUrl = CONFIG.API_BASE_URL;
        this.apiKey = CONFIG.API_KEY;
        this.sessionId = null;
        this.isLoading = false;
        
        // Validate API key
        if (this.apiKey === 'YOUR_API_KEY_HERE') {
            this.showError('⚠️ Configuración requerida: Abre el archivo static/config.js y reemplaza YOUR_API_KEY_HERE con tu clave API real del archivo api_keys.json');
            return;
        }
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeSession();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.connectionStatus = document.getElementById('connectionStatus');
    }    attachEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Add input validation
        this.chatInput.addEventListener('input', (e) => {
            if (e.target.value.length > CONFIG.MAX_MESSAGE_LENGTH) {
                e.target.value = e.target.value.substring(0, CONFIG.MAX_MESSAGE_LENGTH);
                this.showError(CONFIG.ERRORS.MESSAGE_TOO_LONG);
            }
        });
    }

    async initializeSession() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/chat/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.sessionId = data.session_id;
            
            this.updateConnectionStatus('connected', '✅ Conectado al asistente');
            this.chatInput.focus();
              } catch (error) {
            console.error('Error initializing session:', error);
            this.updateConnectionStatus('error', '❌ Error de conexión. Verifica que el servidor esté ejecutándose.');
            this.showError(CONFIG.ERRORS.CONNECTION_FAILED + '\n• El servidor esté ejecutándose en http://127.0.0.1:8000\n• Tu API key sea válida\n• Tengas conexión a internet');
        }
    }

    updateConnectionStatus(type, message) {
        this.connectionStatus.className = `connection-status ${type}`;
        this.connectionStatus.textContent = message;
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message || this.isLoading || !this.sessionId) {
            return;
        }

        // Add user message to chat
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        
        // Show loading state
        this.setLoading(true);
        const loadingMessage = this.addMessage('El asistente está pensando', 'assistant', true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    pregunta: message
                })
            });

            // Remove loading message
            loadingMessage.remove();            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error(CONFIG.ERRORS.INVALID_API_KEY);
                } else if (response.status === 404) {
                    throw new Error(CONFIG.ERRORS.SESSION_EXPIRED);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const data = await response.json();
            
            // Add assistant response
            this.addMessage(data.respuesta, 'assistant');
            
        } catch (error) {
            console.error('Error sending message:', error);
            loadingMessage.remove();
            this.showError(`Error al enviar el mensaje: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(content, sender, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isLoading) {
            contentDiv.innerHTML = '<div class="loading">🤖 <span class="loading-dots"></span></div>';
        } else {
            // Process the content to preserve formatting and convert URLs to links
            contentDiv.innerHTML = this.processMessageContent(content);
        }
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        return messageDiv;
    }

    processMessageContent(content) {
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let processedContent = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert **bold** markdown to HTML
        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert section headers (lines starting with emojis and text)
        processedContent = processedContent.replace(/^(📘|🧠|🏫|🧩|💡|🌐|✅|🧑‍🏫|🗂️|⚙️|🎯|🔍|⚠️|🔗|🎥|📋|🚫|📝|🚨|📄|🌍|🔧|📚|📱|🎵|🎤|🎧)([^\n]+)/gm, '<h4>$1$2</h4>');
        
        // Convert subsection headers (lines starting with specific emojis)
        processedContent = processedContent.replace(/^(🔧|📝|🎥|📚|📱|🌍|💙|👥|🎨|🧑‍💻|📖|🎮|🔊|📊|📑|🎯|✨)([^\n]+)/gm, '<h5 style="margin-top: 10px; color: #555;">$1$2</h5>');
        
        // Convert bullet points
        processedContent = processedContent.replace(/^[•·-]\s+(.+)$/gm, '<li style="margin-left: 20px; list-style-type: disc;">$1</li>');
        
        // Convert numbered lists
        processedContent = processedContent.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left: 20px; list-style-type: decimal;">$1</li>');
        
        return processedContent;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message assistant';
        messageContainer.appendChild(errorDiv);
        
        this.chatMessages.appendChild(messageContainer);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.sendButton.disabled = loading;
        this.chatInput.disabled = loading;
        
        if (loading) {
            this.sendButton.textContent = '...';
        } else {
            this.sendButton.textContent = 'Enviar';
            this.chatInput.focus();
        }
    }
}

// Initialize the chat interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NEAEChatInterface();
});
