export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('visible');
        modal.style.display = 'flex';
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('visible');
        modal.style.display = 'none';
    }
}

export function showImageModal(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    if (modal && img) {
        img.src = src;
        showModal('image-modal');
    }
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = document.body;
    // Remove any existing toasts to prevent overlap
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

export function updateCharacterCount() {
    const textarea = document.getElementById('compose-textarea');
    const counter = document.getElementById('char-counter');
    const maxLength = textarea.maxLength;
    const currentLength = textarea.value.length;
    counter.textContent = maxLength - currentLength;
}

/**
 * NEW: Renders a prompt for the user to log into their Lemmy account.
 * This is called when an action requires Lemmy credentials that are missing.
 */
export function renderLoginPrompt() {
    showToast('Please add your Lemmy account in Settings to vote or comment.', 'warning', 5000);
}
