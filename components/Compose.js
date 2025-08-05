import { apiFetch, apiUploadMedia } from './api.js';
import { ICONS } from './icons.js';

let isPollActive = false;
let isCwActive = false;
let attachedFile = null;
let currentLemmyPostType = 'Text';

export function showComposeModal(state) {
    const composeModal = document.getElementById('compose-modal');
    
    // Reset Mastodon tab
    document.getElementById('mastodon-compose-form').reset();
    document.getElementById('poll-creator-container').style.display = 'none';
    document.getElementById('cw-creator-container').style.display = 'none';
    document.getElementById('media-filename-preview').textContent = '';
    attachedFile = null;
    isPollActive = false;
    isCwActive = false;

    // Reset Lemmy tab
    document.getElementById('lemmy-compose-form').reset();
    document.getElementById('lemmy-link-input-container').style.display = 'none';
    document.getElementById('lemmy-image-input-container').style.display = 'none';
    document.getElementById('lemmy-body-textarea').style.display = 'block';
    currentLemmyPostType = 'Text';
     document.querySelectorAll('.lemmy-post-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'Text');
    });

    // Set default tab
    document.querySelector('.compose-tabs .tab-button[data-tab="mastodon"]').click();

    composeModal.classList.add('visible');
    document.getElementById('compose-textarea').focus();
}

export function initComposeModal(state, onPostSuccess) {
    const composeModal = document.getElementById('compose-modal');

    // --- Tab Switching ---
    const tabButtons = composeModal.querySelectorAll('.compose-tabs .tab-button');
    const tabContents = composeModal.querySelectorAll('.compose-tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-compose-tab`).classList.add('active');
        });
    });

    // --- Mastodon Form ---
    const mastodonForm = document.getElementById('mastodon-compose-form');
    const addMediaBtn = document.getElementById('add-media-btn');
    const mediaInput = document.getElementById('media-attachment-input');
    const mediaPreview = document.getElementById('media-filename-preview');
    const addPollBtn = document.getElementById('add-poll-btn');
    const addCwBtn = document.getElementById('add-cw-btn');
    const addPollOptionBtn = document.getElementById('add-poll-option-btn');
    
    addMediaBtn.innerHTML = ICONS.media;
    addPollBtn.innerHTML = ICONS.poll;
    addCwBtn.innerHTML = ICONS.warning;
    
    addMediaBtn.addEventListener('click', () => mediaInput.click());
    mediaInput.addEventListener('change', () => {
        if (mediaInput.files.length > 0) {
            attachedFile = mediaInput.files[0];
            mediaPreview.textContent = attachedFile.name;
            addPollBtn.disabled = true;
        }
    });

    addPollBtn.addEventListener('click', () => {
        isPollActive = !isPollActive;
        document.getElementById('poll-creator-container').style.display = isPollActive ? 'block' : 'none';
        addMediaBtn.disabled = isPollActive;
    });

    addCwBtn.addEventListener('click', () => {
        isCwActive = !isCwActive;
        document.getElementById('cw-creator-container').style.display = isCwActive ? 'block' : 'none';
    });

    addPollOptionBtn.addEventListener('click', () => {
        const pollOptionsContainer = document.getElementById('poll-options-container');
        const optionInputs = pollOptionsContainer.querySelectorAll('.poll-option-input');
        if (optionInputs.length < 4) {
            const newInput = document.createElement('input');
            newInput.type = 'text';
            newInput.className = 'poll-option-input';
            newInput.placeholder = `Choice ${optionInputs.length + 1}`;
            newInput.maxLength = 25;
            pollOptionsContainer.appendChild(newInput);
        }
        if (pollOptionsContainer.querySelectorAll('.poll-option-input').length >= 4) {
            addPollOptionBtn.style.display = 'none';
        }
    });
    
    mastodonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('compose-textarea').value.trim();
        const spoilerText = document.getElementById('spoiler-text-input').value.trim();
        if (!content && !attachedFile) return;

        try {
            const postButton = mastodonForm.querySelector('button[type="submit"]');
            postButton.disabled = true;
            postButton.textContent = 'Posting...';

            const postBody = { status: content };
            
            if (isCwActive && spoilerText) postBody.spoiler_text = spoilerText;

            if (attachedFile) {
                const mediaResponse = await apiUploadMedia(state, attachedFile);
                if (mediaResponse.id) postBody.media_ids = [mediaResponse.id];
            }
            
            if (isPollActive) {
                const pollOptionsContainer = document.getElementById('poll-options-container');
                const pollOptions = Array.from(pollOptionsContainer.querySelectorAll('.poll-option-input'))
                                         .map(input => input.value.trim()).filter(Boolean);
                if (pollOptions.length < 2) {
                    alert('Polls must have at least 2 choices.');
                    postButton.disabled = false;
                    postButton.textContent = 'Post';
                    return;
                }
                postBody.poll = {
                    options: pollOptions,
                    expires_in: parseInt(document.getElementById('poll-duration-select').value, 10),
                    multiple: document.getElementById('poll-multiple-choice-check').checked
                };
            }

            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postBody)
            });

            postButton.disabled = false;
            postButton.textContent = 'Post';
            composeModal.classList.remove('visible');
            onPostSuccess();
        } catch (error) {
            console.error('Failed to post to Mastodon:', error);
            alert('Could not create Mastodon post.');
            mastodonForm.querySelector('button[type="submit"]').disabled = false;
            mastodonForm.querySelector('button[type="submit"]').textContent = 'Post';
        }
    });

    // --- Lemmy Form ---
    const lemmyForm = document.getElementById('lemmy-compose-form');
    const lemmyPostTypeBtns = document.querySelectorAll('.lemmy-post-type-btn');
    const lemmyLinkForm = document.getElementById('lemmy-link-input-container');
    const lemmyImageForm = document.getElementById('lemmy-image-input-container');
    const lemmyBodyTextarea = document.getElementById('lemmy-body-textarea');
    
    lemmyPostTypeBtns.forEach(button => {
        button.addEventListener('click', () => {
            currentLemmyPostType = button.dataset.type;
            lemmyPostTypeBtns.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            lemmyLinkForm.style.display = 'none';
            lemmyImageForm.style.display = 'none';
            lemmyBodyTextarea.style.display = 'block'; // Body is available for all types

            if (currentLemmyPostType === 'Link') {
                lemmyLinkForm.style.display = 'block';
            } else if (currentLemmyPostType === 'Image') {
                lemmyImageForm.style.display = 'block';
            }
        });
    });

    lemmyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('lemmy-title-input').value.trim();
        if (!title) {
            alert('A title is required for Lemmy posts.');
            return;
        }

        const postBody = {
            name: title,
            body: document.getElementById('lemmy-body-textarea').value.trim(),
            // You'll need a way to select a community, for now, this is a placeholder
            community_id: 1 // Placeholder - replace with actual community ID
        };

        if (currentLemmyPostType === 'Link') {
            postBody.url = document.getElementById('lemmy-url-input').value.trim();
        } else if (currentLemmyPostType === 'Image') {
            // Lemmy image posting is more complex, often requiring an upload to an image host first
            // This is a simplified placeholder
            alert("Direct image uploads to Lemmy are not supported in this version.");
            return;
        }

        try {
            const postButton = lemmyForm.querySelector('button[type="submit"]');
            postButton.disabled = true;
            postButton.textContent = 'Posting...';

            // You will need to implement the Lemmy post creation API call here
            // e.g., await apiFetch(lemmyInstance, jwt, '/api/v3/post', { method: 'POST', body: JSON.stringify(postBody) }, 'lemmy');
            
            console.log("Lemmy Post Body:", postBody);
            alert("Lemmy posting is not fully implemented yet.");


            postButton.disabled = false;
            postButton.textContent = 'Post';
            // composeModal.classList.remove('visible');
            // onPostSuccess(); // Or a lemmy-specific success function
        } catch(err) {
            console.error("Failed to post to Lemmy:", err);
            alert("Could not create Lemmy post.");
            lemmyForm.querySelector('button[type="submit"]').disabled = false;
            lemmyForm.querySelector('button[type="submit"]').textContent = 'Post';
        }
    });


    // --- General Modal Actions ---
    composeModal.querySelectorAll('.cancel-compose-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            composeModal.classList.remove('visible');
        });
    });
}
