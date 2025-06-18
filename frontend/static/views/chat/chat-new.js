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
            this.setupInitialState();
            this.initializeSession();
        },

        initializeElements: function() {
            this.chatMessages = document.getElementById('chatMessages');
            this.chatInput = document.getElementById('chatInput');
            this.sendButton = document.getElementById('sendButton');
            this.connectionStatus = document.getElementById('connectionStatus');
        },
        
        setupInitialState: function() {
            // Initialize loading state
            this.isLoading = false;
            
            // Set initial send button state
            this.updateSendButtonState();
            
            // Focus on input if available
            if (this.chatInput) {
                this.chatInput.focus();
            }        },
        
        attachEventListeners: function() {
            const self = this;
            if (this.sendButton) {
                this.sendButton.addEventListener('click', function() {
                    self.sendMessage();
                });
            }
            if (this.chatInput) {
                // Handle Enter key (send message, Shift+Enter for new line)
                this.chatInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        self.sendMessage();
                    }
                });
                
                // Handle input changes
                this.chatInput.addEventListener('input', function(e) {
                    // Auto-resize textarea
                    self.autoResizeTextarea(e.target);
                    
                    // Update send button state
                    self.updateSendButtonState();
                    
                    // Enforce max length
                    if (e.target.value.length > CONFIG.MAX_MESSAGE_LENGTH) {
                        e.target.value = e.target.value.substring(0, CONFIG.MAX_MESSAGE_LENGTH);
                        ErrorHandler.showError(CONFIG.ERRORS.MESSAGE_TOO_LONG);
                    }
                });
                
                // Initial send button state
                this.updateSendButtonState();
            }
        },
        
        autoResizeTextarea: function(textarea) {
            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = 'auto';
            // Set height based on scroll height, with min and max constraints
            const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 200);
            textarea.style.height = newHeight + 'px';
        },        updateSendButtonState: function() {
            if (this.sendButton && this.chatInput) {
                const hasText = this.chatInput.value.trim().length > 0;
                const isNotLoading = !this.isLoading;
                const shouldEnable = hasText && isNotLoading;
                
                console.log('🔘 Send button state:', {
                    hasText: hasText,
                    isNotLoading: isNotLoading,
                    shouldEnable: shouldEnable,
                    currentlyDisabled: this.sendButton.disabled
                });
                
                this.sendButton.disabled = !shouldEnable;
            }
        },

        initializeSession: function() {
            const self = this;
            if (!this.connectionStatus || !this.chatInput) {
                console.warn("Chat elements not found during session initialization.");
                return; 
            }            this.updateConnectionStatus('connecting', 'Conectando...');
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
                self.updateConnectionStatus('connected', 'Conectado');
                self.chatInput.focus();
                ErrorHandler.hideLoading('chatLoading');
            }).catch(function(error) {
                console.error('Error initializing session:', error);
                self.updateConnectionStatus('error', 'Error de conexión');
                ErrorHandler.hideLoading('chatLoading');
                ErrorHandler.showError(error.message || CONFIG.ERRORS.CONNECTION_FAILED);
            });
        },        updateConnectionStatus: function(type, message) {
            if (!this.connectionStatus) return;
            
            // Update the status indicator class and text
            const statusIndicator = this.connectionStatus.querySelector('.status-indicator');
            const statusText = this.connectionStatus.querySelector('span');
            
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${type}`;
            }
            
            if (statusText) {
                statusText.textContent = message;
            } else {
                // Fallback for simple text update
                this.connectionStatus.textContent = message;
            }
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
        },        addMessage: function(content, sender, isLoading) {
            if (!this.chatMessages) return;
            
            // Create message wrapper
            const messageWrapper = document.createElement('div');
            messageWrapper.className = `message-wrapper ${sender}-message`;
            
            // Create avatar
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar';
            const avatarIcon = document.createElement('div');
            avatarIcon.className = 'avatar-icon';
            
            if (sender === 'user') {
                avatarIcon.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                `;
            } else {
                avatarIcon.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                `;
            }
            
            avatarDiv.appendChild(avatarIcon);
            
            // Create message content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            
            if (isLoading) {
                textDiv.innerHTML = `
                    <div class="typing-indicator">
                        <span>El asistente está escribiendo</span>
                        <div class="typing-dots">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                `;
            } else {
                textDiv.innerHTML = this.processMessageContent(content);
            }
            
            contentDiv.appendChild(textDiv);
            
            // Assemble message
            messageWrapper.appendChild(avatarDiv);
            messageWrapper.appendChild(contentDiv);
            
            this.chatMessages.appendChild(messageWrapper);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            
            return messageWrapper;
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
        },        setLoading: function(loading) {
            if (!this.sendButton || !this.chatInput) return;
            this.isLoading = loading;
            this.sendButton.disabled = loading;
            this.chatInput.disabled = loading;
            
            // Update send button icon based on loading state
            if (loading) {
                this.sendButton.innerHTML = `
                    <div class="spinner"></div>
                `;
            } else {
                this.sendButton.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                    </svg>
                `;
                this.chatInput.focus();
                this.updateSendButtonState();
            }
        },
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
