const routes = {
    '/': { page: 'chat', requiresAuth: true },
    '/login': { page: 'login', requiresAuth: false }
};

const rootDiv = document.getElementById('app');

function navigateTo(path) {
    window.location.hash = path;
}

async function loadPage(pageName) {
    let content = '';
    let htmlPath = '';
    let viewScriptPath = '';
    let viewInitFunction = null;

    switch (pageName) {
        case 'login':
            htmlPath = '/static/views/login/login.html';
            viewScriptPath = '/static/views/login/login.js';
            viewInitFunction = 'initializeLoginPage';
            // Hide user controls on login page
            SessionManager.hideUserControls();
            break;        case 'chat':
            htmlPath = '/static/views/chat/chat.html';
            viewScriptPath = '/static/views/chat/chat-new.js';
            viewInitFunction = 'initializeChatPage';
            // Update user controls for authenticated user
            const userData = await SessionManager.fetchUserData();
            if (userData) {
                SessionManager.updateUsageDisplay(userData);
            }
            break;        default:
            content = '<h1>404 - Página No Encontrada</h1>';
            try {
                if (rootDiv) rootDiv.innerHTML = content;
            } catch (domError) {
                // Silently handle extension-related DOM errors
            }
            removeViewScript();
            return;
    }    try {
        const response = await fetch(htmlPath);
        if (!response.ok) throw new Error(`Failed to load HTML: ${htmlPath} (${response.status})`);
        content = await response.text();
        
        // Safely update DOM content with protection against extension interference
        try {
            if (rootDiv) {
                rootDiv.innerHTML = content;
            }
        } catch (domError) {
            // If DOM manipulation fails (likely due to extension interference), retry
            setTimeout(() => {
                try {
                    if (rootDiv) rootDiv.innerHTML = content;
                } catch (retryError) {
                    // Silently handle extension-related errors
                }
            }, 10);
        }
        
        await loadAndExecuteViewScript(viewScriptPath, viewInitFunction);
    } catch (error) {
        console.error("Error loading page:", error);
        try {
            if (rootDiv) rootDiv.innerHTML = '<h1>Error loading page content.</h1>';
        } catch (domError) {
            // Silently handle DOM errors during error display
        }
        removeViewScript();
    }
}

function removeViewScript() {    const existingScript = document.getElementById('view-script');
    if (existingScript) {
        existingScript.remove();
    }
    
    // Clear any globals to prevent redeclaration errors
    try {        if (window.initializeChatPage) {
            delete window.initializeChatPage;
        }
        if (window.initializeLoginPage) {
            delete window.initializeLoginPage;
        }
        if (window.NEAEChatInterface) {
            delete window.NEAEChatInterface;
        }
        if (window.NEAE_CHAT_LOADED) {
            delete window.NEAE_CHAT_LOADED;
        }
    } catch (e) {
        console.warn('Error clearing globals:', e);
    }
}

async function loadAndExecuteViewScript(scriptPath, initFunctionName) {
    removeViewScript();

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'view-script';
        // Add cache busting to force fresh load
        script.src = scriptPath + '?v=' + Date.now();
        script.onload = async () => {
            // Wait a bit for the script to fully load and parse
            setTimeout(async () => {
                if (typeof window[initFunctionName] === 'function') {                    try {
                        await window[initFunctionName](); 
                        resolve();
                    } catch (e) {
                        console.error(`Error executing ${initFunctionName}:`, e);
                        reject(e);
                    }
                } else {
                    console.error(`${initFunctionName} not found after loading ${scriptPath}`);
                    reject(new Error(`${initFunctionName} not found`));
                }
            }, 50); // Small delay to ensure script is fully parsed
        };
        script.onerror = () => {
            console.error(`Failed to load script: ${scriptPath}`);
            reject(new Error(`Failed to load script: ${scriptPath}`));
        };
        document.body.appendChild(script);
    });
}

function getCookie(name) {
    return SessionManager.getCookie(name);
}

function router() {
    const path = window.location.hash.slice(1) || '/';
    const route = routes[path] || routes['/login']; // Default to login if route is unknown
    
    // Check authentication requirements
    if (route.requiresAuth && !SessionManager.isAuthenticated()) {
        navigateTo('/login');
        return;
    }
    
    // If user is authenticated and trying to access login, redirect to chat
    if (route.page === 'login' && SessionManager.isAuthenticated()) {
        navigateTo('/');
        return;
    }
    
    loadPage(route.page);
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// Initial call to router to load the correct page based on the hash or default
router();