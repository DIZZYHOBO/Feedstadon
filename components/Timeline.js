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
    if (!state.accessToken) {
        renderLoginPrompt(state.timelineDiv, 'mastodon', state, state.actions);
        return;
    }
    
    if (state.isLoadingMore) return;

    if (!loadMore) {
        window.scrollTo(0, 0);
        state.timelineDiv.innerHTML = '<p>Loading...</p>';
    }

    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');
    else document.getElementById('refresh-btn').classList.add('loading');

    try {
        const endpoint = loadMore ? state.nextPageUrl : `/api/v1/timelines/${timelineType}`;
        if (!endpoint) return;

        const { data, linkHeader } = await apiFetch(state.instanceUrl, state.accessToken, endpoint, {}, 'mastodon', null, loadMore);

        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        data.forEach(status => {
            const statusCard = renderStatus(status, state.currentUser, actions);
            state.timelineDiv.appendChild(statusCard);
        });

        // Parse the Link header for the next page URL
        if (linkHeader) {
            const links = linkHeader.split(',').map(link => link.trim());
            const nextLink = links.find(link => link.includes('rel="next"'));
            if (nextLink) {
                state.nextPageUrl = nextLink.substring(nextLink.indexOf('<') + 1, nextLink.indexOf('>'));
            } else {
                state.nextPageUrl = null;
                state.scrollLoader.innerHTML = '<p>No more posts.</p>';
            }
        } else {
            state.nextPageUrl = null;
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        }

    } catch (error) {
        console.error('Failed to fetch timeline:', error);
        if (!loadMore) {
            state.timelineDiv.innerHTML = `<p>Could not load timeline. ${error.message}</p>`;
        }
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
        else document.getElementById('refresh-btn').classList.remove('loading');
    }
}
