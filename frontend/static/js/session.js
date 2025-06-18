/**
 * Centralized Session Management for NEAE Assistant
 * Handles authentication state using cookies (server-side) and localStorage (client-side)
 */

class SessionManager {
    static STORAGE_KEYS = {
        IS_LOGGED_IN: 'isUserLoggedIn',
        API_KEY: 'apiKey',
        USER_DATA: 'userData'
    };

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    static isAuthenticated() {
        // Primary check: cookie exists (server-side auth)
        const authCookie = this.getCookie('auth_key');
        // Secondary check: client-side flag
        const clientFlag = localStorage.getItem(this.STORAGE_KEYS.IS_LOGGED_IN) === 'true';
        
        return !!(authCookie && clientFlag);
    }

    /**
     * Set authentication state
     * @param {boolean} authenticated 
     * @param {string} apiKey 
     */
    static setAuthenticated(authenticated, apiKey = null) {
        if (authenticated && apiKey) {
            localStorage.setItem(this.STORAGE_KEYS.IS_LOGGED_IN, 'true');
            localStorage.setItem(this.STORAGE_KEYS.API_KEY, apiKey);
        } else {
            localStorage.removeItem(this.STORAGE_KEYS.IS_LOGGED_IN);
            localStorage.removeItem(this.STORAGE_KEYS.API_KEY);
            localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        }
    }

    /**
     * Get stored API key
     * @returns {string|null}
     */
    static getApiKey() {
        return localStorage.getItem(this.STORAGE_KEYS.API_KEY);
    }

    /**
     * Fetch and cache user data from server
     * @returns {Promise<Object|null>}
     */
    static async fetchUserData() {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
            const response = await fetch('/api/user-data', {
                method: 'GET',
                credentials: 'include' // Include cookies
            });

            if (response.ok) {
                const userData = await response.json();
                localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
                return userData;
            } else if (response.status === 401) {
                // Session expired
                this.logout();
                return null;
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }

        return null;
    }

    /**
     * Get cached user data
     * @returns {Object|null}
     */
    static getCachedUserData() {
        const data = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    }    /**
     * Perform logout (client and server)
     * @returns {Promise<void>}
     */
    static async logout() {
        try {
            // Clear server session
            const response = await fetch('/logout', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.warn('Server logout returned non-OK status:', response.status);
                // Continue with client cleanup even if server logout fails
            }
        } catch (error) {
            console.error('Error during server logout:', error);
            // Continue with client cleanup even if server request fails
        }

        // Clear client session (always execute)
        this.setAuthenticated(false);
        
        // Hide user controls
        this.hideUserControls();
        
        // Redirect to login
        window.location.hash = '/login';
    }

    /**
     * Utility function to get cookie value
     * @param {string} name 
     * @returns {string|null}
     */
    static getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }    /**
     * Update usage display in UI
     * @param {Object} userData 
     */
    static updateUsageDisplay(userData) {
        console.log('SessionManager.updateUsageDisplay called with:', userData);
        
        const usageInfo = document.getElementById('usageInfo');
        const logoutButton = document.getElementById('logoutButton');
        
        console.log('Found elements:', { 
            usageInfo: usageInfo, 
            logoutButton: logoutButton,
            usageInfoDisplay: usageInfo ? usageInfo.style.display : 'N/A',
            logoutButtonDisplay: logoutButton ? logoutButton.style.display : 'N/A'
        });
        
        if (userData && usageInfo) {
            usageInfo.textContent = `Uso: ${userData.usage_count} / ${userData.max_uses}`;
            usageInfo.style.display = 'inline'; // Use inline instead of block for span
            console.log('Usage info updated and shown');
        }
        
        if (logoutButton) {
            // Reset button state in case it was left in loading state
            this.resetLogoutButtonState(logoutButton);
            
            logoutButton.style.display = 'inline-block'; // Use inline-block for button
            logoutButton.onclick = (e) => {
                e.preventDefault();
                this.handleLogoutClick(logoutButton);
            };
            console.log('Logout button shown and click handler attached');
            console.log('Logout button final display:', logoutButton.style.display);
        } else {
            console.error('Logout button not found in DOM!');
            // Let's also check if it exists anywhere
            const allButtons = document.querySelectorAll('button');
            console.log('All buttons in DOM:', allButtons);
            const logoutLinks = document.querySelectorAll('[id*="logout"], [class*="logout"]');
            console.log('All logout-related elements:', logoutLinks);
        }
    }

    /**
     * Reset logout button to its default state
     */
    static resetLogoutButtonState(logoutButton) {
        if (logoutButton) {
            logoutButton.textContent = 'Cerrar Sesión';
            logoutButton.disabled = false;
            console.log('✅ Logout button state reset to default');
        }
    }

    /**
     * Handle logout button click with loading state
     */
    static async handleLogoutClick(logoutButton) {
        if (!logoutButton) return;
        
        try {
            // Set loading state
            const originalText = logoutButton.textContent;
            logoutButton.textContent = 'Cerrando...';
            logoutButton.disabled = true;
            console.log('🔄 Logout button set to loading state');
            
            // Perform logout
            await this.logout();
            
        } catch (error) {
            console.error('Logout error:', error);
            // Restore button state on error
            this.resetLogoutButtonState(logoutButton);
            if (window.ErrorHandler) {
                ErrorHandler.showError('Error al cerrar sesión. Inténtalo de nuevo.');
            }
        }
    }    /**
     * Hide user controls (for login page)
     */
    static hideUserControls() {
        console.log('🔄 SessionManager.hideUserControls called');
        const usageInfo = document.getElementById('usageInfo');
        const logoutButton = document.getElementById('logoutButton');
        
        console.log('Hiding controls:', { usageInfo, logoutButton });
        
        if (usageInfo) {
            usageInfo.style.display = 'none';
            console.log('✅ Usage info hidden');
        }
        if (logoutButton) {
            // Reset button state before hiding
            this.resetLogoutButtonState(logoutButton);
            logoutButton.style.display = 'none';
            console.log('✅ Logout button hidden and state reset');
        }
    }
}

// Make SessionManager globally available
window.SessionManager = SessionManager;
