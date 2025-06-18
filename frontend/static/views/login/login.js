// filepath: frontend/static/views/login/login.js

// Use IIFE to prevent conflicts
(function() {
    'use strict';
    
    // Prevent redeclaration
    if (window.initializeLoginPage) {
        return;
    }

    function initializeLoginPage() {
        // Hide user controls when on login page
        SessionManager.hideUserControls();
        
        const loginForm = document.getElementById('loginForm');
        const keyInput = document.getElementById('key');

        if (keyInput) { 
            keyInput.focus();
        }

        if (loginForm) {
            // Remove any existing event listeners to prevent duplicates
            const newForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newForm, loginForm);
            
            // Re-get references after cloning
            const freshForm = document.getElementById('loginForm');
            const freshKeyInput = document.getElementById('key');
            
            if (freshKeyInput) {
                freshKeyInput.focus();
            }

            freshForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                
                // Prevent multiple submissions
                if (freshForm.dataset.submitting === 'true') {
                    return;
                }
                
                freshForm.dataset.submitting = 'true';
                
                const key = freshKeyInput.value.trim();
                const loginError = document.getElementById('loginError');

                // Validate input
                if (!key) {
                    if (loginError) {
                        loginError.textContent = 'Por favor, introduce tu clave de acceso.';
                        loginError.style.display = 'block';
                    }
                    freshForm.dataset.submitting = 'false';
                    return;
                }

                if (loginError) loginError.style.display = 'none'; // Hide previous errors

                try {
                    const response = await fetch('/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ key }),
                        credentials: 'include' // Include cookies
                    });
                    
                    if (response.ok) {
                        // Set authentication state
                        SessionManager.setAuthenticated(true, key);
                        
                        // Navigate to chat page
                        window.location.hash = '/';
                    } else {
                        const errorData = await response.json();
                        if (loginError) {
                            let errorMessage = 'Error al iniciar sesión';
                            
                            if (response.status === 401) {
                                errorMessage = 'Clave de acceso incorrecta. Por favor, verifica tu clave e inténtalo de nuevo.';
                            } else if (errorData.detail) {
                                errorMessage = errorData.detail;
                            }
                            
                            loginError.textContent = errorMessage;
                            loginError.style.display = 'block';
                        }
                    }
                } catch (error) {
                    if (loginError) {
                        loginError.textContent = 'Error de conexión. Por favor, verifica tu conexión a internet e inténtalo de nuevo.';
                        loginError.style.display = 'block';
                    }
                } finally {
                    // Always reset the submitting flag
                    freshForm.dataset.submitting = 'false';
                }
            });
        }

        // Handle password visibility toggle
        const toggleButton = document.getElementById('toggleKeyVisibility');
        const keyInputForToggle = document.getElementById('key');
        const eyeOpen = toggleButton ? toggleButton.querySelector('.eye-open') : null;
        const eyeClosed = toggleButton ? toggleButton.querySelector('.eye-closed') : null;

        if (toggleButton && keyInputForToggle && eyeOpen && eyeClosed) {
            toggleButton.addEventListener('click', () => {
                if (keyInputForToggle.type === 'password') {
                    keyInputForToggle.type = 'text';
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'block';
                } else {
                    keyInputForToggle.type = 'password';
                    eyeOpen.style.display = 'block';
                    eyeClosed.style.display = 'none';
                }
            });
        }
    }

    // Export to global scope
    window.initializeLoginPage = initializeLoginPage;

})();