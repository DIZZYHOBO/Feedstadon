import { ICONS } from './icons.js';
import { apiFetch } from './api.js';

export function showLoadingBar() {
    document.getElementById('loading-bar').classList.add('loading');
}

export function hideLoadingBar() {
    document.getElementById('loading-bar').classList.remove('loading');
}

export function initImageModal() {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    const saveBtn = document.getElementById('save-image-btn');
    saveBtn.innerHTML = ICONS.save;

    document.addEventListener('click', (e) => {
        if (e.target.matches('.status-media img')) {
            img.src = e.target.src;
            modal.classList.add('visible');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('visible');
        }
    });

    saveBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'image.png';
        link.click();
    });
}

export function renderLoginPrompt(container, platform, onLoginSuccess) {
    const templateId = platform === 'mastodon' ? 'mastodon-login-template' : 'lemmy-login-template';
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Login template not found for ${platform}`);
        return;
    }
    const loginPrompt = template.content.cloneNode(true);
    const form = loginPrompt.querySelector('.login-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const instanceUrl = form.querySelector('.instance-url-input').value.trim();
        
        if (platform === 'mastodon') {
            const accessToken = form.querySelector('.token-input').value.trim();
            if (instanceUrl && accessToken) {
                onLoginSuccess(instanceUrl, accessToken);
            }
        } else { // Lemmy
            const username = form.querySelector('.username-input').value.trim();
            const password = form.querySelector('.password-input').value.trim();
            if (instanceUrl && username && password) {
                onLoginSuccess(instanceUrl, username, password);
            }
        }
    });
    
    container.innerHTML = '';
    container.appendChild(loginPrompt);
}

// **FIX:** Added 'export' to make this function available in other modules.
export const showToast = (message) => {
    const toast = document.getElementById('toast-notification');
    if (!toast) {
        const newToast = document.createElement('div');
        newToast.id = 'toast-notification';
        document.body.appendChild(newToast);
        showToast(message); // Retry after creating
        return;
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
};
