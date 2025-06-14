// filepath: frontend/static/views/login/login.js
function initializeLoginPage() {
    console.log("Login page loaded from login.js");
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const keyInput = document.getElementById('key');
            if (!keyInput) {
                console.error("Key input not found");
                return;
            }
            const key = keyInput.value;
            const errorElement = document.getElementById('loginError');
            if (errorElement) errorElement.style.display = 'none'; // Hide previous errors

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ key })
                });
                if (response.ok) {
                    sessionStorage.setItem('isUserLoggedIn', 'true'); // Set login flag
                    if (typeof navigateTo === 'function') {
                        navigateTo('/'); 
                    } else {
                        console.error("navigateTo function is not defined. Cannot redirect.");
                    }
                } else {
                    const errorData = await response.json();
                    if (errorElement) {
                        errorElement.textContent = errorData.detail || 'Login failed';
                        errorElement.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                if (errorElement) {
                    errorElement.textContent = 'An unexpected error occurred during login.';
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
