import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

export function showLoadingBar() {
    document.getElementById('loading-bar').classList.add('loading');
}

export function hideLoadingBar() {
    document.getElementById('loading-bar').classList.remove('loading');
}

export function initImageModal() {
    const modal = document.getElementById('image-modal');
    const saveBtn = document.getElementById('save-image-btn');
    saveBtn.innerHTML = ICONS.save;
    
    modal.addEventListener('click', () => {
        modal.classList.remove('visible');
        history.back();
    });

    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const imageUrl = document.getElementById('fullscreen-image').src;
        // This is a simple browser download, might not work on all platforms/browsers without more robust handling
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

export function showImageModal(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    img.src = src;
    modal.classList.add('visible');
    history.pushState({ modal: 'image' }, 'Image View', '#image');
}

export function renderLoginPrompt(container, platform, onLoginSuccess) {
    container.innerHTML = '';
    const templateId = `${platform}-login-template`;
    const template = document.getElementById(templateId);

    if (!template) {
        console.error(`Login template not found for platform: ${platform}`);
        container.innerHTML = `<p>Error: Login form could not be loaded.</p>`;
        return;
    }
    
    const loginPrompt = template.content.cloneNode(true);
    const form = loginPrompt.querySelector('form');

    if (platform === 'mastodon' || platform === 'pixelfed') {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = form.querySelector('.instance-url-input').value.trim();
            const token = form.querySelector('.token-input').value.trim();
            if (instance && token) {
                onLoginSuccess(instance, token);
            } else {
                alert('Please provide both an instance and an access token.');
            }
        });

    } else if (platform === 'lemmy') {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = form.querySelector('.instance-url-input').value.trim();
            const username = form.querySelector('.username-input').value.trim();
            const password = form.querySelector('.password-input').value.trim();
            onLoginSuccess(instance, username, password);
        });
    }
    
    container.appendChild(loginPrompt);
}
