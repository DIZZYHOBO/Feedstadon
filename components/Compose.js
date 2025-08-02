import { apiFetch, apiUploadMedia } from './api.js';
import { ICONS } from './icons.js';

let isPollActive = false;
let isCwActive = false;
let attachedFile = null;

export function showComposeModal(state) {
    const composeModal = document.getElementById('compose-modal');
    const composeTextarea = document.getElementById('compose-textarea');
    const mediaPreview = document.getElementById('media-filename-preview');
    const pollCreator = document.getElementById('poll-creator-container');
    const cwCreator = document.getElementById('cw-creator-container');
    const addMediaBtn = document.getElementById('add-media-btn');
    const addPollBtn = document.getElementById('add-poll-btn');

    // Reset state variables
    isPollActive = false;
    isCwActive = false;
    attachedFile = null;

    // Reset form fields
    composeTextarea.value = '';
    document.getElementById('spoiler-text-input').value = '';
    mediaPreview.textContent = '';
    document.getElementById('media-attachment-input').value = '';
    pollCreator.style.display = 'none';
    cwCreator.style.display = 'none';
    
    addMediaBtn.disabled = false;
    addPollBtn.disabled = false;
    
    const pollOptionsContainer = document.getElementById('poll-options-container');
    pollOptionsContainer.innerHTML = `
        <input type="text" class="poll-option-input" placeholder="Choice 1" maxlength="25">
        <input type="text" class="poll-option-input" placeholder="Choice 2" maxlength="25">
    `;
    document.getElementById('add-poll-option-btn').style.display = 'block';

    composeModal.classList.add('visible');
    composeTextarea.focus();
}

export function initComposeModal(state, onPostSuccess) {
    const composeModal = document.getElementById('compose-modal');
    const composeForm = document.getElementById('compose-form');
    const composeTextarea = document.getElementById('compose-textarea');
    const cancelBtn = composeModal.querySelector('.cancel-compose');
    
    const mediaInput = document.getElementById('media-attachment-input');
    const addMediaBtn = document.getElementById('add-media-btn');
    addMediaBtn.innerHTML = ICONS.media; // Set media icon
    const mediaPreview = document.getElementById('media-filename-preview');
    
    const addPollBtn = document.getElementById('add-poll-btn');
    addPollBtn.innerHTML = ICONS.poll;
    const pollCreator = document.getElementById('poll-creator-container');
    const pollOptionsContainer = document.getElementById('poll-options-container');
    const addPollOptionBtn = document.getElementById('add-poll-option-btn');

    const addCwBtn = document.getElementById('add-cw-btn');
    addCwBtn.innerHTML = ICONS.warning; // Set warning icon
    const cwCreator = document.getElementById('cw-creator-container');
    
    addMediaBtn.addEventListener('click', () => mediaInput.click());

    mediaInput.addEventListener('change', () => {
        if (mediaInput.files.length > 0) {
            attachedFile = mediaInput.files[0];
            mediaPreview.textContent = attachedFile.name;
            addPollBtn.disabled = true;
        } else {
            attachedFile = null;
            mediaPreview.textContent = '';
            addPollBtn.disabled = false;
        }
    });
    
    addPollBtn.addEventListener('click', () => {
        isPollActive = !isPollActive;
        pollCreator.style.display = isPollActive ? 'block' : 'none';
        addMediaBtn.disabled = isPollActive;
    });
    
    addCwBtn.addEventListener('click', () => {
        isCwActive = !isCwActive;
        cwCreator.style.display = isCwActive ? 'block' : 'none';
    });
    
    addPollOptionBtn.addEventListener('click', () => {
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

    composeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = composeTextarea.value.trim();
        const spoilerText = document.getElementById('spoiler-text-input').value.trim();
        if (!content) return;

        try {
            const postButton = composeForm.querySelector('button[type="submit"]');
            postButton.disabled = true;
            postButton.textContent = 'Posting...';

            const postBody = { 
                status: content
            };
            
            if (isCwActive && spoilerText) {
                postBody.spoiler_text = spoilerText;
            }

            if (attachedFile) {
                const mediaResponse = await apiUploadMedia(state, attachedFile);
                if (mediaResponse.id) {
                    postBody.media_ids = [mediaResponse.id];
                }
            }
            
            if (isPollActive) {
                const pollOptions = Array.from(pollOptionsContainer.querySelectorAll('.poll-option-input'))
                                         .map(input => input.value.trim())
                                         .filter(option => option !== '');
                
                if (pollOptions.length < 2) {
                    alert('Polls must have at least 2 choices.');
                    postButton.disabled = false;
                    postButton.textContent = 'Post';
                    return;
                }

                const uniqueOptions = new Set(pollOptions);
                if (uniqueOptions.size !== pollOptions.length) {
                    alert('Poll options must be unique.');
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
