import { apiFetch } from './api.js';
import { showModal, hideModal } from './ui.js';
import { fetchTimeline } from './Timeline.js';

export function showComposeModal(state) {
    const composeContent = document.getElementById('compose-template').content.cloneNode(true);
    const form = composeContent.querySelector('form');
    const textarea = composeContent.querySelector('textarea');
    const mediaBtn = composeContent.querySelector('#media-btn');
    const mediaInput = composeContent.querySelector('#media-input');
    const mediaPreview = composeContent.querySelector('#media-preview');
    const nsfwCheckbox = composeContent.querySelector('#nsfw-checkbox');
    
    mediaBtn.onclick = () => mediaInput.click();
    mediaInput.onchange = async () => {
        const file = mediaInput.files[0];
        if (!file) return;
        mediaPreview.textContent = 'Uploading...';
        const formData = new FormData();
        formData.append('file', file);
        try {
            const result = await apiFetch(state.instanceUrl, state.accessToken, '/api/v2/media', { method: 'POST', body: formData });
            state.attachedMediaId = result.id;
            mediaPreview.textContent = `✅ Attached`;
        } catch (err) { mediaPreview.textContent = 'Upload failed!'; }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        if (!textarea.value.trim() && !state.attachedMediaId) return;
        try {
            const body = { 
                status: textarea.value,
                sensitive: nsfwCheckbox.checked 
            };
            if (state.attachedMediaId) body.media_ids = [state.attachedMediaId];
            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            hideModal();
            state.attachedMediaId = null;
            fetchTimeline(state, 'home');
        } catch(err) { alert('Failed to post.'); }
    };
    showModal(composeContent);
    textarea.focus();
}
