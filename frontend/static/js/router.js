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
            break;
        case 'chat':
            htmlPath = '/static/views/chat/chat.html';
            viewScriptPath = '/static/views/chat/chat.js';
            viewInitFunction = 'initializeChatPage';
            // Update user controls for authenticated user
            const userData = await SessionManager.fetchUserData();
            if (userData) {
                SessionManager.updateUsageDisplay(userData);
            }
            break;
        default:
            content = '<h1>404 - Página No Encontrada</h1>';
            if (rootDiv) rootDiv.innerHTML = content;
            removeViewScript();
            return;
    }

    try {
        const response = await fetch(htmlPath);
        if (!response.ok) throw new Error(`Failed to load HTML: ${htmlPath} (${response.status})`);
        content = await response.text();
        if (rootDiv) rootDiv.innerHTML = content;
        await loadAndExecuteViewScript(viewScriptPath, viewInitFunction);
    } catch (error) {
        console.error("Error loading page:", error);
        if (rootDiv) rootDiv.innerHTML = '<h1>Error loading page content.</h1>';
        removeViewScript();
    }
}

function removeViewScript() {
    const existingScript = document.getElementById('view-script');
    if (existingScript) {
        existingScript.remove();
    }
}

async function loadAndExecuteViewScript(scriptPath, initFunctionName) {
    removeViewScript();

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'view-script';
        script.src = scriptPath;
        script.onload = async () => {
            if (typeof window[initFunctionName] === 'function') {
                try {
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

// Global logout function
window.handleLogout = function() {
    SessionManager.logout();
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