// filepath: frontend/static/views/login/login.js

// Use IIFE to prevent conflicts
(function() {
    'use strict';
    
    // Prevent redeclaration
    if (window.initializeLoginPage) {
        console.log('Login script already loaded');
        return;
    }

    function initializeLoginPage() {
        console.log("Login page loaded from login.js");
        
        // Hide user controls when on login page
        SessionManager.hideUserControls();
        
        const loginForm = document.getElementById('loginForm');
        const keyInput = document.getElementById('key');

    if (keyInput) { 
        keyInput.focus();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const key = keyInput.value;
            const loginError = document.getElementById('loginError');

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
                        loginError.textContent = errorData.detail || 'Login failed';
                        loginError.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                if (loginError) {
                    loginError.textContent = 'An unexpected error occurred during login.';
                    loginError.style.display = 'block';
                }
            }
        });
    }

    const toggleButton = document.getElementById('toggleKeyVisibility');
    const eyeOpen = toggleButton ? toggleButton.querySelector('.eye-open') : null;
    const eyeClosed = toggleButton ? toggleButton.querySelector('.eye-closed') : null;

    if (toggleButton && keyInput && eyeOpen && eyeClosed) {
        toggleButton.addEventListener('click', () => {
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
            } else {
                keyInput.type = 'password';
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
            }        });
    }
    }

    // Export to global scope
    window.initializeLoginPage = initializeLoginPage;

})();