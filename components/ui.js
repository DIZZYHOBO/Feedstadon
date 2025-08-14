// components/ui.js (Updated with enhanced toast system)

import { ICONS } from './icons.js';

export function showLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.classList.add('loading');
    }
}

export function hideLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.classList.remove('loading');
    }
}

// Enhanced toast notification system
export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    // Remove any existing type classes
    toast.className = 'toast-notification';
    
    // Add the appropriate type class
    toast.classList.add(`toast-${type}`);
    
    // Set the message
    toast.textContent = message;
    
    // Add the visible class to trigger slide-up animation
    toast.classList.add('visible');
    
    // Remove after specified duration
    setTimeout(() => {
        toast.classList.remove('visible');
    }, duration);
}

// Convenience methods for different toast types
export function showSuccessToast(message, duration = 3000) {
    showToast(message, 'success', duration);
}

export function showErrorToast(message, duration = 4000) {
    showToast(message, 'error', duration);
}

export function showWarningToast(message, duration = 3500) {
    showToast(message, 'warning', duration);
}

export function showInfoToast(message, duration = 3000) {
    showToast(message, 'info', duration);
}

export function initImageModal() {
    const modal = document.getElementById('image-modal');
    const modalContent = modal.querySelector('.image-modal-content');
    const img = document.getElementById('fullscreen-image');
    const saveBtn = document.getElementById('save-image-btn');

    if (!modal || !img || !saveBtn) return;

    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let start = { x: 0, y: 0 };

    function setTransform() {
        img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }

    img.addEventListener('mousedown', (e) => {
        e.preventDefault();
        start = { x: e.clientX - pointX, y: e.clientY - pointY };
        panning = true;
    });

    img.addEventListener('mouseup', () => {
        panning = false;
    });

    modalContent.addEventListener('mousemove', (e) => {
        if (!panning) return;
        pointX = e.clientX - start.x;
        pointY = e.clientY - start.y;
        setTransform();
    });

    modalContent.addEventListener('wheel', (e) => {
        e.preventDefault();
        const xs = (e.clientX - pointX) / scale;
        const ys = (e.clientY - pointY) / scale;
        const delta = -e.deltaY;

        (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);
        scale = Math.min(Math.max(1, scale), 10); // Clamp scale between 1x and 10x

        pointX = e.clientX - xs * scale;
        pointY = e.clientY - ys * scale;

        setTransform();
    });
    
    // Close modal when clicking the background, but not the image or save button
    modal.addEventListener('click', (e) => {
        if (e.target !== img && e.target !== saveBtn) {
            modal.classList.remove('visible');
            // Reset image transform on close
            scale = 1;
            pointX = 0;
            pointY = 0;
            setTransform();
        }
    });

    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

export function showImageModal(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    if (modal && img) {
        img.src = src;
        modal.classList.add('visible');
    }
}

export function renderLoginPrompt(container, platform, onLoginSuccess) {
    // This function now correctly adds the Mastodon token input field
    container.innerHTML = `
        <div class="login-prompt">
            <h3>Connect to ${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
            <p>Please log in to see this content.</p>
            <div class="login-fields">
                <input type="text" id="${platform}-instance-input" placeholder="${platform === 'mastodon' ? 'your.instance.com' : 'lemmy.world'}">
                ${platform === 'mastodon' ? `
                    <input type="text" id="mastodon-token-input" placeholder="Paste your Access Token">
                ` : ''}
                ${platform === 'lemmy' ? `
                    <input type="text" id="lemmy-username-input" placeholder="Username">
                    <input type="password" id="lemmy-password-input" placeholder="Password">
                ` : ''}
            </div>
            <button class="button-primary connect-btn" id="connect-${platform}-btn">Connect</button>
             ${platform === 'mastodon' ? `
                <p style="font-size: 0.8em; text-align: center; margin-top: 15px;">
                    First, you need an Access Token from your instance. <a href="#" id="get-token-link">Click here to get one.</a>
                </p>
            ` : ''}
        </div>
    `;

    const connectBtn = document.getElementById(`connect-${platform}-btn`);
    if (platform === 'mastodon') {
        const getTokenLink = document.getElementById('get-token-link');
        getTokenLink.addEventListener('click', (e) => {
            e.preventDefault();
            const instanceUrl = document.getElementById('mastodon-instance-input').value.trim();
            if (!instanceUrl) {
                showErrorToast("Please enter your Mastodon instance URL first.");
                return;
            }
            // Redirect user to get their token
            const tokenUrl = `https://${instanceUrl}/settings/applications/new`;
            window.open(tokenUrl, '_blank');
        });

        connectBtn.addEventListener('click', async () => {
            const instanceUrl = document.getElementById('mastodon-instance-input').value.trim();
            const accessToken = document.getElementById('mastodon-token-input').value.trim();
            if (!instanceUrl || !accessToken) {
                showErrorToast("Please enter both instance and access token.");
                return;
            }
            onLoginSuccess(instanceUrl, accessToken);
        });
    } else { // Lemmy
        connectBtn.addEventListener('click', () => {
            const instance = document.getElementById('lemmy-instance-input').value.trim();
            const username = document.getElementById('lemmy-username-input').value.trim();
            const password = document.getElementById('lemmy-password-input').value.trim();
            if (!instance || !username || !password) {
                showErrorToast("Please fill in all Lemmy login fields.");
                return;
            }
            onLoginSuccess(instance, username, password);
        });
    }
}
