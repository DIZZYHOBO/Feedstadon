import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';

export function renderLoginPrompt(container, service, state, actions) {
    container.innerHTML = '';
    const template = document.getElementById('login-prompt-template');
    const prompt = template.content.cloneNode(true);
    const promptContainer = prompt.querySelector('.login-prompt-container');
    const loginBtn = prompt.querySelector('.login-prompt-button');
    const formContainer = prompt.querySelector('.login-prompt-form-container');
    
    const mastodonForm = prompt.querySelector('#mastodon-login-section');
    const lemmyForm = prompt.querySelector('#lemmy-login-section');

    if (service === 'mastodon') {
        lemmyForm.remove();
    } else {
        mastodonForm.remove();
    }

    loginBtn.addEventListener('click', () => {
        formContainer.style.display = 'block';
        loginBtn.style.display = 'none';
    });

    prompt.querySelector('.cancel-login-btn').addEventListener('click', () => {
        formContainer.style.display = 'none';
        loginBtn.style.display = 'block';
    });

    container.appendChild(prompt);
}


export async function fetchTimeline(state, timelineType, loadMore = false) {
    // ** THE FIX IS HERE **: Check for login first.
    if (!state.accessToken) {
        renderLoginPrompt(state.timelineDiv, 'mastodon', state, state.actions);
        return;
    }
    
    // ... (rest of fetchTimeline logic remains the same)
}
