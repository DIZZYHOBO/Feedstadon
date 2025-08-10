export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}

export function updateCharacterCount() {
    const textarea = document.getElementById('compose-textarea');
    const charCount = document.getElementById('char-count');
    if (!textarea || !charCount) return;
    const count = textarea.value.length;
    const limit = 500;
    charCount.textContent = `${count} / ${limit}`;
    if (count > limit) {
        charCount.classList.add('over-limit');
    } else {
        charCount.classList.remove('over-limit');
    }
}

export function renderLoginPrompt(container, platform, actions) {
    container.innerHTML = `
        <div class="login-prompt">
            <img src="./images/login.png" alt="Login illustration" class="login-illustration">
            <h3>Connect to ${platform === 'lemmy' ? 'Lemmy' : 'Mastodon'}</h3>
            <p>Log in to see your feed, post, and interact with the community.</p>
            <form id="${platform}-login-form">
                <input type="text" id="${platform}-instance-url" placeholder="${platform === 'lemmy' ? 'lemmy.world' : 'mastodon.social'}" required>
                ${platform === 'lemmy' ? '<input type="text" id="lemmy-username" placeholder="Username" required><input type="password" id="lemmy-password" placeholder="Password" required>' : ''}
                <button type="submit" class="button-primary">${platform === 'lemmy' ? 'Log In' : 'Authorize'}</button>
            </form>
            <p id="${platform}-login-error" class="error-message"></p>
        </div>
    `;

    const form = document.getElementById(`${platform}-login-form`);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const instanceUrlInput = document.getElementById(`${platform}-instance-url`);
        const instanceUrl = (instanceUrlInput.value.trim() || instanceUrlInput.placeholder).replace(/^https?:\/\//, '');

        if (platform === 'lemmy') {
            const username = document.getElementById('lemmy-username').value.trim();
            const password = document.getElementById('lemmy-password').value.trim();
            try {
                const success = await actions.onLemmyLogin(instanceUrl, username, password);
                if (success) {
                    actions.navigateTo('home');
                }
            } catch (error) {
                document.getElementById('lemmy-login-error').textContent = `Login failed: ${error.message}`;
            }
        } else {
            // Mastodon auth flow would go here
        }
    });
}
