// filepath: frontend/static/views/login/login.js
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginPage();
});

function initializeLoginPage() {
    console.log("Login page loaded from login.js");
    const loginForm = document.getElementById('loginForm');
    const keyInput = document.getElementById('key'); 

    if (keyInput) { 
        keyInput.focus();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const key = keyInput.value; // Use the keyInput defined earlier
            const loginError = document.getElementById('loginError');

            if (loginError) loginError.style.display = 'none'; // Hide previous errors

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ key })
                });
                if (response.ok) {
                    sessionStorage.setItem('isUserLoggedIn', 'true'); // Set login flag
                    // Store the key and redirect to chat page
                    localStorage.setItem('apiKey', key);
                    // No need to pass the key in the URL anymore if it's in localStorage
                    window.location.href = '/chat'; 
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
            }
        });
    }
}
