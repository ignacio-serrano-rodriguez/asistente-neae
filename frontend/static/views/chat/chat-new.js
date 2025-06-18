// filepath: frontend/static/views/chat/chat-new.js
// NEAE Chat Interface - Namespace Safe Implementation
// VERSION: 2.0 - Object Literal Pattern

console.log('🚀 Loading chat-new.js version 2.0');

// Check if already loaded - if so, skip everything
if (window.NEAE_CHAT_LOADED) {
    console.log('Chat script already loaded, skipping...');
    // Don't parse anything else
} else {
    // Mark as loaded immediately
    window.NEAE_CHAT_LOADED = true;
    console.log('✅ Chat script loading for first time');
    
    // Create chat interface using object literal pattern
    window.NEAEChatInterface = {
        // Properties
        apiBaseUrl: null,
        sessionId: null,
        isLoading: false,
        chatMessages: null,
        chatInput: null,
        sendButton: null,
        connectionStatus: null,
        
        // Constructor-like init
        create: function() {
            const instance = Object.create(this);
            instance.apiBaseUrl = CONFIG.API_BASE_URL;
            instance.sessionId = null;
            instance.isLoading = false;
            return instance;
        },
        
        init: function() {
            this.initializeElements();
            this.attachEventListeners();
            this.initializeSession();
        },

        initializeElements: function() {
            this.chatMessages = document.getElementById('chatMessages');
            this.chatInput = document.getElementById('chatInput');
            this.sendButton = document.getElementById('sendButton');
            this.connectionStatus = document.getElementById('connectionStatus');
        },
        
        attachEventListeners: function() {
            const self = this;
             if (this.sendButton) {
                 this.sendButton.addEventListener('click', function() {
                     self.sendMessage();
                 });
             }
             if (this.chatInput) {
                this.chatInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        self.sendMessage();
                    }
                });
                this.chatInput.addEventListener('input', function(e) {
                    if (e.target.value.length > CONFIG.MAX_MESSAGE_LENGTH) {
                        e.target.value = e.target.value.substring(0, CONFIG.MAX_MESSAGE_LENGTH);
                        ErrorHandler.showError(CONFIG.ERRORS.MESSAGE_TOO_LONG);
                    }
                });
            }
        },

        initializeSession: function() {
            const self = this;
            if (!this.connectionStatus || !this.chatInput) {
                console.warn("Chat elements not found during session initialization.");
                return; 
            }
            this.updateConnectionStatus('connecting', 'Conectando con el asistente...');
            ErrorHandler.showLoading('chatLoading', 'Inicializando chat...');
            
            fetch(this.apiBaseUrl + '/chat/start', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            }).then(function(response) {
                if (!response.ok) {
                    return ErrorHandler.handleAPIError(response, 'session initialization').then(function(errorMessage) {
                        throw new Error(errorMessage);
                    });
                }
                return response.json();
            }).then(function(data) {
                self.sessionId = data.session_id;
                self.updateConnectionStatus('connected', '✅ Conectado al asistente');
                self.chatInput.focus();
                ErrorHandler.hideLoading('chatLoading');
            }).catch(function(error) {
                console.error('Error initializing session:', error);
                self.updateConnectionStatus('error', '❌ Error de conexión.');
                ErrorHandler.hideLoading('chatLoading');
                ErrorHandler.showError(error.message || CONFIG.ERRORS.CONNECTION_FAILED);
            });
        },

        updateConnectionStatus: function(type, message) {
            if (!this.connectionStatus) return;
            this.connectionStatus.className = 'connection-status ' + type;
            this.connectionStatus.textContent = message;
        },

        sendMessage: function() {
            const self = this;
            if (!this.chatInput || !this.sessionId) return;
            const message = this.chatInput.value.trim();
            if (!message || this.isLoading) return;
            
            this.addMessage(message, 'user');
            this.chatInput.value = '';
            this.setLoading(true);
            const loadingMessage = this.addMessage('El asistente está pensando', 'assistant', true);
            
            fetch(this.apiBaseUrl + '/chat/send', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ session_id: this.sessionId, pregunta: message })
            }).then(function(response) {
                if(loadingMessage && loadingMessage.remove) loadingMessage.remove();
                
                if (!response.ok) {
                    return ErrorHandler.handleAPIError(response, 'sending message').then(function(errorMessage) {
                        throw new Error(errorMessage);
                    });
                }
                return response.json();            }).then(function(data) {
                self.addMessage(data.respuesta, 'assistant');
                
                // Increment usage counter in real-time
                if (window.SessionManager && window.SessionManager.incrementUsageCounter) {
                    window.SessionManager.incrementUsageCounter();
                    console.log('✅ Usage counter incremented after successful message');
                }
            }).catch(function(error) {
                console.error('Error sending message:', error);
                if(loadingMessage && loadingMessage.remove) loadingMessage.remove();
                ErrorHandler.showError(error.message || 'Error al enviar el mensaje');
            }).finally(function() {
                self.setLoading(false);
            });
        },

        addMessage: function(content, sender, isLoading) {
            if (!this.chatMessages) return;
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + sender;
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
        },

        processMessageContent: function(content) {
            let processedContent = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
            
            processedContent = processedContent.replace(/^[•·-]\s+(.+)$/gm, '<li style="margin-left: 20px; list-style-type: disc;">$1</li>');
            processedContent = processedContent.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left: 20px; list-style-type: decimal;">$1</li>');
            return processedContent;
        },

        setLoading: function(loading) {
            if (!this.sendButton || !this.chatInput) return;
            this.isLoading = loading;
            this.sendButton.disabled = loading;
            this.chatInput.disabled = loading;
            this.sendButton.textContent = loading ? '...' : 'Enviar';
            if (!loading) this.chatInput.focus();
        }
    };

    // Initialize function
    window.initializeChatPage = function() {
        console.log("Chat page loaded from chat.js");
          // Logout handling is now managed by SessionManager in updateUsageDisplay()
        // No need for separate logout handler here

        // Load user data and initialize chat
        fetch('/api/user-data', {
            credentials: 'include'
        }).then(function(response) {
            if (!response.ok) {
                if (response.status === 401) { 
                    SessionManager.logout();
                    return; 
                }
                const errorElement = document.getElementById('connectionStatus');
                if (errorElement) {
                    errorElement.textContent = 'Error: No se pudieron cargar los datos del usuario.';
                    errorElement.className = 'connection-status error';
                }
                return;
            }
            
            return response.json();
        }).then(function(userData) {
            if (userData) {
                // This should show the logout button
                console.log('Calling SessionManager.updateUsageDisplay with:', userData);
                SessionManager.updateUsageDisplay(userData);
                
                // Create and initialize chat
                const chatApp = window.NEAEChatInterface.create();
                chatApp.init();
            }
        }).catch(function(error) {
            console.error("Error initializing chat page:", error);
            const errorElement = document.getElementById('connectionStatus');
            if (errorElement) {
                errorElement.textContent = 'Error crítico al cargar la página de chat.';
                errorElement.className = 'connection-status error';
            }
        });
    };
    
    console.log('Chat script loaded successfully');
}
