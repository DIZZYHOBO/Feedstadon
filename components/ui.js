import { ICONS } from './icons.js';

export function showLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.classList.add('loading');
        // Reset animation
        loadingBar.style.transform = 'scaleX(0)';
        setTimeout(() => {
            loadingBar.style.transform = 'scaleX(0.7)';
        }, 10);
    }
}

export function hideLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.style.transform = 'scaleX(1)';
        setTimeout(() => {
            loadingBar.classList.remove('loading');
            loadingBar.style.transform = 'scaleX(0)';
        }, 300);
    }
}

export function initImageModal() {
    const modal = document.getElementById('image-modal');
    const saveBtn = document.getElementById('save-image-btn');
    saveBtn.innerHTML = ICONS.save;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('visible');
        }
    });

    saveBtn.addEventListener('click', async () => {
        const image = document.getElementById('fullscreen-image');
        const imageUrl = image.src;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // Create a filename
            const filename = imageUrl.split('/').pop().split('#')[0].split('?')[0] || 'image.jpg';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (err) {
            console.error('Failed to save image:', err);
            alert('Could not save image.');
        }
    });
}

export function showImageModal(imageUrl) {
    const modal = document.getElementById('image-modal');
    const image = document.getElementById('fullscreen-image');
    image.src = imageUrl;
    modal.classList.add('visible');
}
