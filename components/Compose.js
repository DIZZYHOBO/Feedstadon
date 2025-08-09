import { apiFetch } from './api.js';

let currentReplyToId = null;

export function showComposeModal(state) {
    const modal = document.getElementById('compose-modal');
    const inReplyToContainer = document.getElementById('in-reply-to-container');
    const textarea = document.getElementById('compose-textarea');

    currentReplyToId = null;
    inReplyToContainer.style.display = 'none';
    textarea.value = '';
    textarea.placeholder = "What's on your mind?";
    modal.style.display = 'block';
    textarea.focus();
}

export function showComposeModalWithReply(state, post) {
    const modal = document.getElementById('compose-modal');
    const inReplyToContainer = document.getElementById('in-reply-to-container');
    const replyToUser = document.getElementById('reply-to-user');
    const textarea = document.getElementById('compose-textarea');

    currentReplyToId = post.id;
    replyToUser.textContent = `@${post.account.acct}`;
    inReplyToContainer.style.display = 'block';
    
    textarea.value = `@${post.account.acct} `;
    textarea.placeholder = '';
    modal.style.display = 'block';
    textarea.focus();
}

export function initComposeModal(state, onPostSuccess) {
    const modal = document.getElementById('compose-modal');
    const closeBtn = modal.querySelector('.close-btn');
    const postBtn = document.getElementById('post-btn');
    const textarea = document.getElementById('compose-textarea');
    const charCount = document.getElementById('char-count');
    const inReplyToContainer = document.getElementById('in-reply-to-container');

    // Make sure all elements exist before adding listeners
    if (!modal || !closeBtn || !postBtn || !textarea || !charCount || !inReplyToContainer) {
        console.error("Compose modal elements not found! Check your index.html.");
        return;
    }

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    textarea.addEventListener('input', () => {
        const remaining = 500 - textarea.value.length;
        charCount.textContent = remaining;
        charCount.style.color = remaining < 0 ? 'var(--error-color)' : '';
    });

    postBtn.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (!content) return;

        postBtn.disabled = true;
        postBtn.textContent = 'Posting...';

        try {
            const postData = {
                status: content,
            };
            if (currentReplyToId) {
                postData.in_reply_to_id = currentReplyToId;
            }

            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                body: postData
            });
            
            modal.style.display = 'none';
            textarea.value = '';
            onPostSuccess();

        } catch (error) {
            alert('Failed to post. Please try again.');
        } finally {
            postBtn.disabled = false;
            postBtn.textContent = 'Post';
        }
    });
}
