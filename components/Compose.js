import { apiFetch } from './api.js';

export function showComposeModal(state) {
    const composeModal = document.getElementById('compose-modal');
    composeModal.classList.add('visible');
}

export function initComposeModal(state, onPostSuccess) {
    const composeModal = document.getElementById('compose-modal');
    const composeForm = document.getElementById('compose-form');
    const composeTextarea = document.getElementById('compose-textarea');
    const cancelBtn = composeModal.querySelector('.cancel-compose');

    composeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = composeTextarea.value.trim();
        if (!content) return;

        try {
            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: content })
            });

            composeTextarea.value = '';
            composeModal.classList.remove('visible');
            onPostSuccess(); // Refresh the timeline
        } catch (error) {
            console.error('Failed to post:', error);
            alert('Could not create post.');
        }
    });

    cancelBtn.addEventListener('click', () => {
        composeModal.classList.remove('visible');
    });
}
