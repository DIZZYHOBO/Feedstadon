import { apiFetch, apiUploadMedia } from './api.js';
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
    const charCount = document.getElementById('character-count');

    mediaUploadBtn.innerHTML = ICONS.media;
    pollBtn.innerHTML = ICONS.poll;
    cwBtn.innerHTML = ICONS.warning;

    // Tab switching logic
    const mastodonTabBtn = document.querySelector('[data-tab="mastodon-compose"]');
    const lemmyTabBtn = document.querySelector('[data-tab="lemmy-compose"]');
    const mastodonTab = document.getElementById('mastodon-compose-tab');
    const lemmyTab = document.getElementById('lemmy-compose-tab');

    // Poll functionality
let pollCreated = false;
let pollOptions = [];

pollBtn.addEventListener('click', () => {
    const pollContainer = document.getElementById('poll-creator-container');
    
    if (!pollCreated) {
        pollContainer.innerHTML = `
            <div class="poll-creator">
                <div class="poll-options-container">
                    <input type="text" class="poll-option-input" placeholder="Option 1" data-index="0">
                    <input type="text" class="poll-option-input" placeholder="Option 2" data-index="1">
                </div>
                <button class="add-poll-option-btn" type="button">+ Add Option</button>
                <div class="poll-settings">
                    <label>Poll duration: 
                        <select id="poll-duration">
                            <option value="300">5 minutes</option>
                            <option value="1800">30 minutes</option>
                            <option value="3600">1 hour</option>
                            <option value="21600">6 hours</option>
                            <option value="86400" selected>1 day</option>
                            <option value="259200">3 days</option>
                            <option value="604800">7 days</option>
                        </select>
                    </label>
                </div>
                <button class="remove-poll-btn" type="button">Remove Poll</button>
            </div>
        `;
        
        pollCreated = true;
        pollOptions = ['', '']; // Start with 2 empty options
        
        // Add option button handler
        const addOptionBtn = pollContainer.querySelector('.add-poll-option-btn');
        addOptionBtn.addEventListener('click', () => {
            if (pollOptions.length < 4) { // Mastodon allows max 4 options
                const optionsContainer = pollContainer.querySelector('.poll-options-container');
                const newIndex = pollOptions.length;
                const newInput = document.createElement('input');
                newInput.type = 'text';
                newInput.className = 'poll-option-input';
                newInput.placeholder = `Option ${newIndex + 1}`;
                newInput.dataset.index = newIndex;
                optionsContainer.appendChild(newInput);
                pollOptions.push('');
                
                if (pollOptions.length >= 4) {
                    addOptionBtn.style.display = 'none';
                }
            }
        });
        
        // Remove poll button handler
        const removePollBtn = pollContainer.querySelector('.remove-poll-btn');
        removePollBtn.addEventListener('click', () => {
            pollContainer.innerHTML = '';
            pollCreated = false;
            pollOptions = [];
        });
        
        // Track poll option changes
        pollContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('poll-option-input')) {
                const index = parseInt(e.target.dataset.index);
                pollOptions[index] = e.target.value;
            }
        });
    } else {
        pollContainer.innerHTML = '';
        pollCreated = false;
        pollOptions = [];
    }
});

// Update the submit button handler to include poll data
submitBtn.addEventListener('click', async () => {
    const status = textarea.value.trim();
    if (!status && !mediaUploadInput.files.length && !pollCreated) return;

    try {
        const body = {
            status: status,
            in_reply_to_id: currentReplyToId
        };
        
        // Add media if present
        if (mediaUploadInput.files.length > 0) {
            const attachment = await apiUploadMedia(state, mediaUploadInput.files[0]);
            if (attachment && attachment.id) {
                body.media_ids = [attachment.id];
            }
        }
        
        // Add poll if created
        if (pollCreated) {
            const validOptions = pollOptions.filter(opt => opt.trim().length > 0);
            if (validOptions.length >= 2) {
                const pollDuration = document.getElementById('poll-duration').value;
                body.poll = {
                    options: validOptions,
                    expires_in: parseInt(pollDuration),
                    multiple: false // You could add a checkbox for this
                };
            }
        }

        await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
            method: 'POST',
            body: body
        });
        
        modal.classList.remove('visible');
        onPostSuccess();

    } catch (error) {
        alert('Failed to post status: ' + error.message);
    }
});
    
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
    document.getElementById('cancel-lemmy-compose-btn').addEventListener('click', () => modal.classList.remove('visible'));


    submitBtn.addEventListener('click', async () => {
    const status = textarea.value.trim();
    if (!status && !mediaUploadInput.files.length) return;

    try {
        const body = {
            status: status,
            in_reply_to_id: currentReplyToId
        };
        
        if (mediaUploadInput.files.length > 0) {
            const attachment = await apiUploadMedia(state, mediaUploadInput.files[0]);
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
        alert('Failed to post status: ' + error.message);
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

    textarea.addEventListener('input', () => {
        const remaining = 500 - textarea.value.length;
        charCount.textContent = remaining;
    });
}
