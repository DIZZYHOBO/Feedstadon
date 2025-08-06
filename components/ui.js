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
            // If the modal was opened via history, go back
            if (history.state && history.state.imageModal) {
                history.back();
            }
        }
    });

    saveBtn.addEventListener('click', () => {
        const image = document.getElementById('fullscreen-image');
        const imageUrl = image.src;
        
        // Create a temporary anchor element to trigger the download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = imageUrl;
        
        // Suggest a filename for the download
        const filename = imageUrl.split('/').pop().split('#')[0].split('?')[0] || 'image.jpg';
        a.download = filename;
        
        // Append to the body, click, and then remove
        document.body.appendChild(a);
        a.click();
        a.remove();
    });
}

export function showImageModal(imageUrl) {
    const modal = document.getElementById('image-modal');
    const image = document.getElementById('fullscreen-image');
    image.src = imageUrl;
    modal.classList.add('visible');
    history.pushState({ imageModal: true }, "Image View");
}
