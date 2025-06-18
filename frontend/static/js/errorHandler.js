/**
 * Centralized Error Handling for NEAE Assistant
 * Provides consistent error handling and user feedback
 */

class ErrorHandler {
    static ERROR_MESSAGES = {
        NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
        INVALID_API_KEY: 'Clave API inválida. Verifica tu clave e inténtalo de nuevo.',
        SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        CONNECTION_FAILED: 'No se pudo conectar con el servidor. Inténtalo más tarde.',
        MAX_USAGE_REACHED: 'Has alcanzado el límite máximo de uso para tu clave.',
        CHAT_SESSION_NOT_FOUND: 'Sesión de chat no encontrada. Inicia una nueva conversación.',
        EMPTY_MESSAGE: 'El mensaje no puede estar vacío.',
        MODEL_UNAVAILABLE: 'El servicio de chat no está disponible en este momento.',
        UNKNOWN_ERROR: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
    };

    /**
     * Handle API errors and return user-friendly messages
     * @param {Response|Error} error 
     * @param {string} context 
     * @returns {string}
     */
    static async handleAPIError(error, context = '') {
        console.error(`Error in ${context}:`, error);

        if (error instanceof Response) {
            const status = error.status;
            let errorData;
            
            try {
                errorData = await error.json();
            } catch (e) {
                errorData = { detail: 'Error desconocido' };
            }

            // Map HTTP status codes to user-friendly messages
            switch (status) {
                case 400:
                    return errorData.detail || this.ERROR_MESSAGES.EMPTY_MESSAGE;
                case 401:
                    // Session expired, trigger logout
                    SessionManager.logout();
                    return this.ERROR_MESSAGES.SESSION_EXPIRED;
                case 403:
                    return this.ERROR_MESSAGES.MAX_USAGE_REACHED;
                case 404:
                    return this.ERROR_MESSAGES.CHAT_SESSION_NOT_FOUND;
                case 503:
                    return this.ERROR_MESSAGES.MODEL_UNAVAILABLE;
                case 500:
                default:
                    return errorData.detail || this.ERROR_MESSAGES.CONNECTION_FAILED;
            }
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
            return this.ERROR_MESSAGES.NETWORK_ERROR;
        } else {
            return this.ERROR_MESSAGES.UNKNOWN_ERROR;
        }
    }

    /**
     * Display error message to user
     * @param {string} message 
     * @param {string} containerId 
     * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
     */
    static showError(message, containerId = 'errorContainer', duration = 5000) {
        let errorContainer = document.getElementById(containerId);
        
        // Create error container if it doesn't exist
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = containerId;
            errorContainer.className = 'error-message';
            
            // Insert at the top of the app container
            const appContainer = document.getElementById('app');
            if (appContainer && appContainer.firstChild) {
                appContainer.insertBefore(errorContainer, appContainer.firstChild);
            } else if (appContainer) {
                appContainer.appendChild(errorContainer);
            } else {
                document.body.appendChild(errorContainer);
            }
        }

        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        errorContainer.className = 'error-message show';

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hideError(containerId);
            }, duration);
        }
    }

    /**
     * Hide error message
     * @param {string} containerId 
     */
    static hideError(containerId = 'errorContainer') {
        const errorContainer = document.getElementById(containerId);
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.className = 'error-message';
        }
    }

    /**
     * Show loading state
     * @param {string} containerId 
     * @param {string} message 
     */
    static showLoading(containerId = 'loadingContainer', message = 'Cargando...') {
        let loadingContainer = document.getElementById(containerId);
        
        if (!loadingContainer) {
            loadingContainer = document.createElement('div');
            loadingContainer.id = containerId;
            loadingContainer.className = 'loading-message';
            
            const appContainer = document.getElementById('app');
            if (appContainer) {
                appContainer.appendChild(loadingContainer);
            } else {
                document.body.appendChild(loadingContainer);
            }
        }

        loadingContainer.textContent = message;
        loadingContainer.style.display = 'block';
        loadingContainer.className = 'loading-message show';
    }

    /**
     * Hide loading state
     * @param {string} containerId 
     */
    static hideLoading(containerId = 'loadingContainer') {
        const loadingContainer = document.getElementById(containerId);
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
            loadingContainer.className = 'loading-message';
        }
    }

    /**
     * Show success message
     * @param {string} message 
     * @param {string} containerId 
     * @param {number} duration 
     */
    static showSuccess(message, containerId = 'successContainer', duration = 3000) {
        let successContainer = document.getElementById(containerId);
        
        if (!successContainer) {
            successContainer = document.createElement('div');
            successContainer.id = containerId;
            successContainer.className = 'success-message';
            
            const appContainer = document.getElementById('app');
            if (appContainer && appContainer.firstChild) {
                appContainer.insertBefore(successContainer, appContainer.firstChild);
            } else if (appContainer) {
                appContainer.appendChild(successContainer);
            } else {
                document.body.appendChild(successContainer);
            }
        }

        successContainer.textContent = message;
        successContainer.style.display = 'block';
        successContainer.className = 'success-message show';

        if (duration > 0) {
            setTimeout(() => {
                successContainer.style.display = 'none';
                successContainer.className = 'success-message';
            }, duration);
        }
    }
}

// Make ErrorHandler globally available
window.ErrorHandler = ErrorHandler;
