// --- DOM Elements specific to Login ---
const loginView = document.getElementById('login-view');
const instanceUrlInput = document.getElementById('instance-url');
const accessTokenInput = document.getElementById('access-token');
const connectBtn = document.getElementById('connect-btn');

/**
 * Initializes the login component.
 * @param {function} onLoginSuccess - A callback function to execute upon successful login. It receives the instance and token.
 */
export function initLogin(onLoginSuccess) {
    // --- Event Listener ---
    connectBtn.addEventListener('click', () => {
        const instanceUrl = instanceUrlInput.value.trim();
        const accessToken = accessTokenInput.value.trim();
        if (instanceUrl && accessToken) {
            localStorage.setItem('fediverse-instance', instanceUrl);
            localStorage.setItem('fediverse-token', accessToken);
            // Call the callback provided by app.js
            onLoginSuccess(instanceUrl, accessToken);
        }
    });

    // --- Initial Page Load Check ---
    const savedInstance = localStorage.getItem('fediverse-instance');
    const savedToken = localStorage.getItem('fediverse-token');
    if (savedInstance && savedToken) {
        instanceUrlInput.value = savedInstance;
        accessTokenInput.value = savedToken;
        // If we have saved data, call the callback immediately
        onLoginSuccess(savedInstance, savedToken);
    } else {
        // Otherwise, show the login form
        document.querySelector('.top-nav').style.display = 'none';
        loginView.style.display = 'block';
    }
}

export function showLogin() {
    document.querySelector('.top-nav').style.display = 'none';
    document.getElementById('app-view').style.display = 'none';
    loginView.style.display = 'block';
}
