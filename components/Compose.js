import { apiFetch } from './api.js';

let state, onPostSuccess;
let currentReplyToId = null;

const MAX_CHARS = 500;

function updateCharacterCount() {
    const textarea = document.getElementById('compose-textarea');
    const charCount = document.getElementById('character-count');
    if (textarea && charCount) {
        const remaining = MAX_CHARS - textarea.value.length;
        charCount.textContent = remaining;
        charCount.classList.toggle('over-limit', remaining < 0);
    }
}

async function submitPost() {
    const textarea = document.getElementById('compose-textarea');
    const status = textarea.value.trim();

    if (!status || status.length > MAX_CHARS) return;

    try {
        const payload = { status: status };
        if (currentReplyToId) {
            payload.in_reply_to_id = currentReplyToId;
        }
        
        await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
            method: 'POST',
            body: payload
        });
        
        hideComposeModal();
        if (onPostSuccess) onPostSuccess();
        
    } catch (err) {
        alert('Failed to post. Please try again.');
    }
}

export function initComposeModal(appState, successCallback) {
    state = appState;
    onPostSuccess = successCallback;
    
    const modal = document.getElementById('compose-modal');
    const textarea = document.getElementById('compose-textarea');
    const charCount = document.getElementById('character-count');
    const postBtn = document.getElementById('post-btn');
    const cancelBtn = document.getElementById('cancel-compose-btn');

    if (!modal || !textarea || !charCount || !postBtn || !cancelBtn) {
        console.error('Compose modal elements not found');
        return;
    }

    charCount.innerHTML = MAX_CHARS;

    textarea.addEventListener('input', updateCharacterCount);
    postBtn.addEventListener('click', submitPost);
    cancelBtn.addEventListener('click', hideComposeModal);
}

export function showComposeModal(appState, post = null) {
    state = appState;
    const modal = document.getElementById('compose-modal');
    const textarea = document.getElementById('compose-textarea');
    
    textarea.value = '';
    currentReplyToId = null;

    if (post) {
        // This is a quote post or similar, prefill if needed
    }
    
    updateCharacterCount();
    modal.classList.add('visible');
    textarea.focus();
}

export function showComposeModalWithReply(appState, postToReply) {
    state = appState;
    const modal = document.getElementById('compose-modal');
    const textarea = document.getElementById('compose-textarea');

    currentReplyToId = postToReply.id;
    textarea.value = `@${postToReply.account.acct} `;
    
    updateCharacterCount();
    modal.classList.add('visible');
    textarea.focus();
}

export function hideComposeModal() {
    const modal = document.getElementById('compose-modal');
    modal.classList.remove('visible');
}
