import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';

export function renderLoginPrompt(container, platform, onLoginSuccess, onSecondarySuccess) {
    container.innerHTML = '';
    const template = document.getElementById('login-prompt-template');
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);
    
    const mastodonSection = container.querySelector('#mastodon-login-section');
    const lemmySection = container.querySelector('#lemmy-login-section');

    if (platform === 'mastodon') {
        lemmySection.style.display = 'none';
        container.querySelector('.mastodon-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = e.target.querySelector('.instance-url').value;
            const token = e.target.querySelector('.access-token').value;
            onLoginSuccess(instance, token);
        });
    } else if (platform === 'lemmy') {
        mastodonSection.style.display = 'none';
        container.querySelector('.lemmy-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = e.target.querySelector('.lemmy-instance-input').value;
            const username = e.target.querySelector('.lemmy-username-input').value;
            const password = e.target.querySelector('.lemmy-password-input').value;
            onSecondarySuccess(instance, username, password);
        });
    }
}

export async function fetchTimeline(state, actions, loadMore = false, onLoginSuccess) {
    const timelineType = state.currentTimeline;

    if (timelineType === 'home' && !state.accessToken) {
        renderLoginPrompt(state.timelineDiv, 'mastodon', onLoginSuccess);
        return;
    }

    if (state.isLoadingMore) return;
    
    if (!loadMore) {
        window.scrollTo(0, 0);
        state.timelineDiv.innerHTML = '';
    }
    
    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');
    
    try {
        const endpoint = `/api/v1/timelines/${timelineType}`;
        const response = await apiFetch(state.instanceUrl, state.accessToken, endpoint);
        
        const posts = response.data;

        if (posts.length > 0) {
            posts.forEach(post => {
                const postCard = renderStatus(post, state.currentUser, actions, state.settings);
                state.timelineDiv.appendChild(postCard);
            });
        } else if (!loadMore) {
            state.timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
        }

    } catch (error) {
        console.error('Failed to fetch timeline:', error);
        state.timelineDiv.innerHTML = `<p>Error loading feed. ${error.message}</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
    }
}
