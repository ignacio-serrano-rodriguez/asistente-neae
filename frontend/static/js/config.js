const CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://127.0.0.1:8000', // Or window.location.origin
    API_KEY: '', 
    
    // UI Configuration
    MAX_MESSAGE_LENGTH: 1000,
    AUTO_SCROLL: true,
    SHOW_TYPING_INDICATOR: true,
    
    // Error Messages
    ERRORS: {
        CONNECTION_FAILED: 'No se pudo conectar con el asistente. Verifica que el servidor esté ejecutándose.',
        INVALID_API_KEY: 'API key inválida. Verifica tu clave de acceso.',
        SESSION_EXPIRED: 'Sesión expirada. Recarga la página para crear una nueva sesión.',
        MESSAGE_TOO_LONG: 'El mensaje es demasiado largo. Máximo 1000 caracteres.',
        EMPTY_MESSAGE: 'No puedes enviar un mensaje vacío.'
    }
};
