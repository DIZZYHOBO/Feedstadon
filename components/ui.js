import { ICONS } from './icons.js';
import { apiFetch } from './api.js';

export function showLoadingBar() {
    document.getElementById('loading-bar').classList.add('loading');
}

export function hideLoadingBar() {
    document.getElementById('loading-bar').classList.remove('loading');
}

// **FIX:** This function now properly shows the modal with a given image source.
export function showImageModal(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    if (modal && img) {
        img.src = src;
        modal.classList.add('visible');
    }
}

export function initImageModal() {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    const saveBtn = document.getElementById('save-image-btn');
    
    if (saveBtn) {
        saveBtn.innerHTML = ICONS.save;
        saveBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = 'image.png';
            link.click();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
            }
        });
    }
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

export const showToast = (message) => {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
};
