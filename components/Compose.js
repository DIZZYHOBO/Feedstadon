import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { showToast } from './ui.js';

let composeState = {
    in_reply_to_id: null,
    visibility: 'public',
    sensitive: false,
    spoiler_text: ''
};

const getComposeModal = () => document.getElementById('compose-modal');

export function showComposeModal(state) {
    const modal = getComposeModal();
    if (!modal) return;
    
    composeState = {
        in_reply_to_id: null,
        visibility: 'public',
        sensitive: false,
        spoiler_text: ''
    };
    
    modal.querySelector('.compose-textarea').value = '';
    modal.querySelector('.replying-to-container').style.display = 'none';
    modal.classList.add('visible');
    modal.querySelector('.compose-textarea').focus();
}

export function showComposeModalWithReply(state, post) {
    const modal = getComposeModal();
    if (!modal) return;

    composeState = {
        in_reply_to_id: post.id,
        visibility: 'public',
        sensitive: false,
        spoiler_text: ''
    };

    const replyingToContainer = modal.querySelector('.replying-to-container');
    replyingToContainer.innerHTML = `Replying to @${post.account.acct}`;
    replyingToContainer.style.display = 'block';
    
    modal.querySelector('.compose-textarea').value = '';
    modal.classList.add('visible');
    modal.querySelector('.compose-textarea').focus();
}

export function initComposeModal(state, onPostSuccess) {
    const modal = getComposeModal();
    if (!modal) return;
    
    // **FIX:** Safely inject icons into the compose modal buttons
    const addMediaBtn = document.getElementById('compose-add-media');
    if (addMediaBtn) addMediaBtn.innerHTML = ICONS.media;

    const addPollBtn = document.getElementById('compose-add-poll');
    if (addPollBtn) addPollBtn.innerHTML = ICONS.poll;
    
    const cwBtn = document.getElementById('compose-cw');
    if (cwBtn) cwBtn.innerHTML = ICONS.warning;

    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.classList.remove('visible');
    });

    modal.querySelector('.compose-submit-btn').addEventListener('click', async () => {
        const textarea = modal.querySelector('.compose-textarea');
        const status = textarea.value.trim();
        if (!status) return;

        try {
            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                body: {
                    status: status,
                    in_reply_to_id: composeState.in_reply_to_id,
                    visibility: composeState.visibility,
                    sensitive: composeState.sensitive,
                    spoiler_text: composeState.spoiler_text
                }
            });
            modal.classList.remove('visible');
            showToast('Post sent!');
            if (onPostSuccess) onPostSuccess();
        } catch (error) {
            console.error('Failed to post status:', error);
            showToast('Failed to send post.');
        }
    });
}
