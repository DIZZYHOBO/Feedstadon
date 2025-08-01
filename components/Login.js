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
            onLoginSuccess(instanceUrl, accessToken);
        }
    });

    // --- Initial Page Load Check ---
    const savedInstance = localStorage.getItem('fediverse-instance');
    const savedToken = localStorage.getItem('fediverse-token');
    if (savedInstance && savedToken) {
        instanceUrlInput.value = savedInstance;
        accessTokenInput.value = savedToken;
        onLoginSuccess(savedInstance, savedToken);
    } else {
        document.querySelector('.top-nav').style.display = 'none';
        loginView.style.display = 'block';
    }
}

export function showLogin() {
    document.querySelector('.top-nav').style.display = 'none';
    document.getElementById('app-view').style.display = 'none';
    loginView.style.display = 'block';
}
