import { apiFetch, apiUploadMedia } from './api.js';

export function showComposeModal(state) {
    const composeModal = document.getElementById('compose-modal');
    composeModal.classList.add('visible');
}

export function initComposeModal(state, onPostSuccess) {
    const composeModal = document.getElementById('compose-modal');
    const composeForm = document.getElementById('compose-form');
    const composeTextarea = document.getElementById('compose-textarea');
    const cancelBtn = composeModal.querySelector('.cancel-compose');
    
    const mediaInput = document.getElementById('media-attachment-input');
    const addMediaBtn = document.getElementById('add-media-btn');
    const mediaPreview = document.getElementById('media-filename-preview');
    
    let attachedFile = null;

    addMediaBtn.addEventListener('click', () => {
        mediaInput.click();
    });

    mediaInput.addEventListener('change', () => {
        if (mediaInput.files.length > 0) {
            attachedFile = mediaInput.files[0];
            mediaPreview.textContent = attachedFile.name;
        } else {
            attachedFile = null;
            mediaPreview.textContent = '';
        }
    });

    composeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = composeTextarea.value.trim();
        if (!content && !attachedFile) return; // Must have content or a file

        try {
            const postButton = composeForm.querySelector('button[type="submit"]');
            postButton.disabled = true;
            postButton.textContent = 'Posting...';

            let mediaIds = [];
            if (attachedFile) {
                const mediaResponse = await apiUploadMedia(state, attachedFile);
                if (mediaResponse.id) {
                    mediaIds.push(mediaResponse.id);
                }
            }

            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: content,
                    media_ids: mediaIds
                })
            });

            // Reset form
            composeTextarea.value = '';
            mediaInput.value = '';
            attachedFile = null;
            mediaPreview.textContent = '';
            postButton.disabled = false;
            postButton.textContent = 'Post';

            composeModal.classList.remove('visible');
            onPostSuccess(); // Refresh the timeline
        } catch (error) {
            console.error('Failed to post:', error);
            alert('Could not create post.');
            const postButton = composeForm.querySelector('button[type="submit"]');
            postButton.disabled = false;
            postButton.textContent = 'Post';
        }
    });

    cancelBtn.addEventListener('click', () => {
        composeModal.classList.remove('visible');
    });
}
