import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';

export function renderLoginPrompt(container, service, onMastodonSuccess, onLemmySuccess) {
    container.innerHTML = '';
    const template = document.getElementById('login-prompt-template');
    const prompt = template.content.cloneNode(true);
    
    const mastodonSection = prompt.querySelector('#mastodon-login-section');
    const lemmySection = prompt.querySelector('#lemmy-login-section');

    if (service === 'mastodon') {
        lemmySection.remove();
        const mastodonForm = mastodonSection.querySelector('form');
        mastodonForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const instanceUrl = mastodonForm.querySelector('.instance-url').value.trim();
            const accessToken = mastodonForm.querySelector('.access-token').value.trim();
            if (instanceUrl && accessToken) {
                onMastodonSuccess(instanceUrl, accessToken);
            }
        });
    } else {
        mastodonSection.remove();
        const lemmyForm = lemmySection.querySelector('form');
        lemmyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = lemmyForm.querySelector('.lemmy-instance-input').value.trim();
            const username = lemmyForm.querySelector('.lemmy-username-input').value.trim();
            const password = lemmyForm.querySelector('.lemmy-password-input').value.trim();
            if(instance && username && password) {
                onLemmySuccess(instance, username, password);
            }
        });
    }

    container.appendChild(prompt);
}


export async function fetchTimeline(state, actions, loadMore = false, onMastodonSuccess) {
    if (!state.accessToken && !loadMore) {
        renderLoginPrompt(state.timelineDiv, 'mastodon', onMastodonSuccess, null);
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
        const endpoint = loadMore ? state.nextPageUrl : `/api/v1/timelines/${state.currentTimeline}`;
        if (!endpoint) return;

        const { data, linkHeader } = await apiFetch(state.instanceUrl, state.accessToken, endpoint, {}, 'mastodon', null, loadMore);

        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        data.forEach(status => {
            // ** THE FIX IS HERE **: Added 'state' as the fourth argument.
            const statusCard = renderStatus(status, state.currentUser, actions, state);
            state.timelineDiv.appendChild(statusCard);
        });

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
