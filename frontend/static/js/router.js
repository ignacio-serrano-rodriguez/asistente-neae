const routes = {
    '/': 'chat',
    '/login': 'login'
};

const rootDiv = document.getElementById('app');

function navigateTo(path) {
    window.location.hash = path;
}

async function loadPage(page) {
    let content = '';
    let htmlPath = '';
    let viewScriptPath = '';
    let viewInitFunction = null;

    switch (page) {
        case 'login':
            htmlPath = '/static/views/login/login.html';
            viewScriptPath = '/static/views/login/login.js';
            viewInitFunction = 'initializeLoginPage';
            break;
        case 'chat':
            // if (!getCookie('auth_key')) { // Old check
            if (sessionStorage.getItem('isUserLoggedIn') !== 'true') { // New check
                navigateTo('/login');
                return;
            }
            htmlPath = '/static/views/chat/chat.html';
            viewScriptPath = '/static/views/chat/chat.js';
            viewInitFunction = 'initializeChatPage';
            break;
        default:
            content = '<h1>404 - Page Not Found</h1>';
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
    // ...existing code...
}

// Add a global logout function that can be called from chat.js
window.handleLogout = async function() {
    sessionStorage.removeItem('isUserLoggedIn');
    // Optionally, tell the server to clear its session/cookie if necessary
    try {
        // Example: Call a logout endpoint on the server
        // await fetch('/logout', { method: 'POST' }); // Assuming you have a POST /logout endpoint
    } catch (error) {
        console.error('Error during server logout:', error);
    }
    navigateTo('/login');
}

function router() {
    const path = window.location.hash.slice(1) || '/';
    // Ensure the path is valid, otherwise default to login or a known route
    const pageKey = routes[path] ? path : '/login'; 
    const pageName = routes[pageKey] || 'login'; // Default to login if route is unknown
    loadPage(pageName);
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// Initial call to router to load the correct page based on the hash or default
router();