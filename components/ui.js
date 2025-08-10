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
