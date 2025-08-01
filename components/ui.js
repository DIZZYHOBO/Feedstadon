// Get elements after the DOM is loaded
let modal;

/**
 * Initializes UI components and event listeners.
 * This should be called after DOMContentLoaded.
 */
export function initUI() {
    modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            // If the click is on the dark overlay, hide the modal
            if (e.target === modal) {
                hideModal();
            }
        });
    }
}

/**
 * Displays the modal with the provided content.
 * @param {HTMLElement} contentNode - The HTML element to show in the modal.
 */
export function showModal(contentNode) {
    if (!modal) modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    modalBody.innerHTML = '';
    modalBody.appendChild(contentNode);
    modal.classList.add('visible');
}

/**
 * Hides the modal.
 */
export function hideModal() {
    if (!modal) modal = document.getElementById('modal');
    modal.classList.remove('visible');
}
