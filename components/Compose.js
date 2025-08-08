import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

let currentReplyToId = null;

export function showComposeModal(state, inReplyToId = null) {
    const modal = document.getElementById('compose-modal');
    modal.classList.add('visible');
    document.getElementById('compose-textarea').focus();
    currentReplyToId = inReplyToId;

    // Reset view
    document.getElementById('reply-to-info').innerHTML = '';
    document.getElementById('compose-textarea').value = '';
    document.getElementById('poll-creator-container').innerHTML = '';
    document.getElementById('cw-creator-container').innerHTML = '';
    document.getElementById('media-filename-preview').textContent = '';
    document.getElementById('media-upload-input').value = '';
}

export function showComposeModalWithReply(state, post) {
    const replyToInfo = document.getElementById('reply-to-info');
    if (replyToInfo) {
        replyToInfo.innerHTML = `Replying to ${post.account.display_name}`;
    }
    showComposeModal(state, post.id);
}

export function initComposeModal(state, onPostSuccess) {
    const modal = document.getElementById('compose-modal');
    const textarea = document.getElementById('compose-textarea');
    const mediaUploadBtn = document.getElementById('media-upload-btn');
    const mediaUploadInput = document.getElementById('media-upload-input');
    const mediaPreview = document.getElementById('media-filename-preview');
    const pollBtn = document.getElementById('poll-btn');
    const cwBtn = document.getElementById('cw-btn');
    const cancelBtn = document.getElementById('cancel-compose-btn');
    const submitBtn = document.getElementById('submit-compose-btn');

    mediaUploadBtn.innerHTML = ICONS.media;
    pollBtn.innerHTML = ICONS.poll;
    cwBtn.innerHTML = ICONS.warning;

    // Tab switching logic
    const mastodonTabBtn = document.querySelector('[data-tab="mastodon-compose"]');
    const lemmyTabBtn = document.querySelector('[data-tab="lemmy-compose"]');
    const mastodonTab = document.getElementById('mastodon-compose-tab');
    const lemmyTab = document.getElementById('lemmy-compose-tab');
    
    mastodonTabBtn.addEventListener('click', () => {
        mastodonTabBtn.classList.add('active');
        lemmyTabBtn.classList.remove('active');
        mastodonTab.classList.add('active');
        lemmyTab.classList.remove('active');
    });

    lemmyTabBtn.addEventListener('click', () => {
        lemmyTabBtn.classList.add('active');
        mastodonTabBtn.classList.remove('active');
        lemmyTab.classList.add('active');
        mastodonTab.classList.remove('active');
    });


    mediaUploadBtn.addEventListener('click', () => mediaUploadInput.click());
    mediaUploadInput.addEventListener('change', () => {
        if (mediaUploadInput.files.length > 0) {
            mediaPreview.textContent = mediaUploadInput.files[0].name;
        }
    });

    cancelBtn.addEventListener('click', () => modal.classList.remove('visible'));

    submitBtn.addEventListener('click', async () => {
        const status = textarea.value.trim();
        if (!status && !mediaUploadInput.files.length) return;

        try {
            const body = {
                status: status,
                in_reply_to_id: currentReplyToId
            };
            
            if (mediaUploadInput.files.length > 0) {
                const attachment = await uploadMedia(state, mediaUploadInput.files[0]);
                if (attachment && attachment.id) {
                    body.media_ids = [attachment.id];
                }
            }

            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                body: body
            });
            
            modal.classList.remove('visible');
            onPostSuccess();

        } catch (error) {
            alert('Failed to post status.');
        }
    });

    // Lemmy Compose Logic
    const lemmySubmitBtn = document.getElementById('submit-lemmy-compose-btn');
    lemmySubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const title = document.getElementById('lemmy-title-input').value;
        const communityName = document.getElementById('lemmy-community-input').value;
        const body = document.getElementById('lemmy-body-textarea').value;
        const url = document.getElementById('lemmy-url-input').value;
        
        if (!title || !communityName) {
            alert('Title and community are required.');
            return;
        }

        try {
            const lemmyInstance = localStorage.getItem('lemmy_instance');
            const communityRes = await apiFetch(lemmyInstance, null, '/api/v3/community', {}, 'lemmy', { name: communityName });
            const communityId = communityRes.data.community_view.community.id;

            const postBody = {
                auth: localStorage.getItem('lemmy_jwt'),
                community_id: communityId,
                name: title,
                body: body,
                url: url || null
            };

            await apiFetch(lemmyInstance, null, '/api/v3/post', { method: 'POST', body: postBody }, 'lemmy');
            
            modal.classList.remove('visible');
            // Consider a specific callback for lemmy post success
            
        } catch (err) {
            alert('Failed to create Lemmy post. Make sure the community exists.');
        }
    });
}

async function uploadMedia(state, file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, '/api/v2/media', {
            method: 'POST',
            body: formData,
            isForm: true
        });
        return response.data;
    } catch (error) {
        alert('Failed to upload media.');
        return null;
    }
}
