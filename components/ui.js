function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function updateCharacterCount() {
    const textarea = document.getElementById('compose-textarea');
    const charCount = document.getElementById('char-count');
    const count = textarea.value.length;
    charCount.textContent = `${count} / 500`;
    if (count > 500) {
        charCount.classList.add('over-limit');
    } else {
        charCount.classList.remove('over-limit');
    }
}

// FIX: Added 'hideModal' to the export list.
export { showModal, hideModal, showToast, updateCharacterCount };
