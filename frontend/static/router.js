// Simple hash-based router
const routes = {
    '/': 'chat',
    '/login': 'login'
};

const rootDiv = document.getElementById('app'); // We'll need an <div id="app"></div> in index.html

function navigateTo(path) {
    window.location.hash = path;
}

function router() {
    const path = window.location.hash.slice(1) || '/';
    const page = routes[path] || 'chat'; // Default to chat page

    loadPage(page);
}

async function loadPage(page) {
    let content = '';
    switch (page) {
        case 'login':
            content = await fetch('/static/parts/login.html').then(res => res.text());
            rootDiv.innerHTML = content;
            initializeLoginPage();
            break;
        case 'chat':
            // Check auth before loading chat
            if (!getCookie('auth_key')) {
                navigateTo('/login');
                return;
            }
            content = await fetch('/static/parts/chat.html').then(res => res.text());
            rootDiv.innerHTML = content;
            initializeChatPage();
            break;
        default:
            content = '<h1>404 - Page Not Found</h1>';
            rootDiv.innerHTML = content;
    }
}

// Listen on hash change
window.addEventListener('hashchange', router);

// Listen on page load
window.addEventListener('load', router);

// Utility to get cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Functions to initialize page-specific JS (will be called by router)
// These will be expanded in app.js or new specific JS files
function initializeLoginPage() {
    console.log("Login page loaded");
    // Add event listeners for login form, toggle visibility etc.
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = document.getElementById('key').value;
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ key })
                });
                if (response.ok) {
                    // const data = await response.json(); // Contains success message
                    // console.log(data.message);
                    navigateTo('/'); // Navigate to chat on successful login
                } else {
                    const errorData = await response.json();
                    const errorElement = document.getElementById('loginError');
                    if (errorElement) {
                        errorElement.textContent = errorData.detail || 'Login failed';
                        errorElement.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                const errorElement = document.getElementById('loginError');
                if (errorElement) {
                    errorElement.textContent = 'An unexpected error occurred.';
                    errorElement.style.display = 'block';
                }
            }
        });
    }

    const toggleButton = document.getElementById('toggleKeyVisibility');
    const keyInput = document.getElementById('key');
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
            }
        });
    }
}

async function initializeChatPage() {
    console.log("Chat page loaded");
    // Initialize chat interface (NEAEChatInterface from app.js)
    // This might need adjustment if NEAEChatInterface expects elements to be present immediately
    // Ensure chat.html is fully loaded into rootDiv before calling this
    if (typeof NEAEChatInterface !== 'undefined') {
        // Fetch user data before initializing chat
        try {
            const userDataResponse = await fetch('/api/user-data');
            if (!userDataResponse.ok) {
                if (userDataResponse.status === 401) { // Unauthorized
                    navigateTo('/login');
                    return;
                }
                // Display a more generic error if user data fails for other reasons
                const errorElement = document.getElementById('connectionStatus'); // Or a dedicated error display area
                if (errorElement) {
                    errorElement.textContent = 'Error: No se pudieron cargar los datos del usuario.';
                    errorElement.className = 'connection-status error';
                }
                // console.error('Failed to fetch user data:', await userDataResponse.text());
                return; // Stop further chat initialization if user data fails
            }
            const userData = await userDataResponse.json();
            
            // Update usage info if elements exist
            const usageInfoEl = document.getElementById('usageInfo');
            if (usageInfoEl) {
                usageInfoEl.textContent = `Uso: ${userData.usage_count} / ${userData.max_uses}`;
            }

            // Now initialize the chat interface
            const chatApp = new NEAEChatInterface();
            chatApp.init(); // Call the new init method

        } catch (error) {
            console.error("Error initializing chat page:", error);
            const errorElement = document.getElementById('connectionStatus');
            if (errorElement) {
                errorElement.textContent = 'Error crítico al cargar la página de chat.';
                errorElement.className = 'connection-status error';
            }
            // Fallback to login might be too aggressive here if it's a network blip
            // Consider a retry mechanism or just displaying an error.
            // For now, we'll display error and user might need to refresh or try login again.
        }
    } else {
        console.error("NEAEChatInterface not defined. Ensure app.js is loaded and correct.");
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/logout');
                if (response.ok) {
                    // const data = await response.json();
                    // console.log(data.message);
                    navigateTo('/login');
                } else {
                    console.error('Logout failed');
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

// Initial call to router
router();
