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
    
    const loginForm = template.content.cloneNode(true);
    const form = loginForm.querySelector('form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const instance = form.querySelector('.instance-url-input').value.trim();
        
        if (platform === 'mastodon') {
            try {
                const response = await apiFetch(instance, null, '/api/v2/apps', {
                    method: 'POST',
                    body: {
                        client_name: 'Feeds',
                        redirect_uris: 'urn:ietf:wg:oauth:2.0:oob',
                        scopes: 'read write follow'
                    }
                });
                const clientId = response.data.client_id;
                const authUrl = `https://${instance}/oauth/authorize?client_id=${clientId}&scope=read+write+follow&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code`;
                
                const authCode = prompt(`Please authorize this app by visiting the following URL and pasting the code here:\n\n${authUrl}`);
                
                if (authCode) {
                    const tokenResponse = await apiFetch(instance, null, '/oauth/token', {
                        method: 'POST',
                        body: {
                            client_id: clientId,
                            client_secret: response.data.client_secret,
                            redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
                            grant_type: 'authorization_code',
                            code: authCode,
                            scope: 'read write follow'
                        }
                    });
                    
                    if (tokenResponse.data.access_token) {
                        onLoginSuccess(instance, tokenResponse.data.access_token);
                    }
                }
            } catch (error) {
                console.error('Mastodon login error:', error);
                alert('Failed to log in to Mastodon.');
            }
        } else if (platform === 'lemmy') {
            const username = form.querySelector('.username-input').value.trim();
            const password = form.querySelector('.password-input').value.trim();
            onLoginSuccess(instance, username, password);
        }
    });
    
    container.appendChild(loginForm);
}
