import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLoginPrompt } from './ui.js';

export async function fetchTimeline(state, actions, loadMore = false, onLoginSuccess, platform = 'mastodon') {
    const instanceUrl = platform === 'pixelfed' ? state.pixelfedInstanceUrl : state.instanceUrl;
    const accessToken = platform === 'pixelfed' ? state.pixelfedAccessToken : state.accessToken;

    if (!accessToken && !loadMore) {
        renderLoginPrompt(state.timelineDiv, platform, onLoginSuccess);
        return;
    }
    
    if (state.isLoadingMore) return;

    if (!loadMore) {
        window.scrollTo(0, 0);
        state.nextPageUrl = null;
    }

    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');
    else document.getElementById('refresh-btn').classList.add('loading');
    
    try {
        const timelineUrl = loadMore && state.nextPageUrl ? state.nextPageUrl : `/api/v1/timelines/${state.currentTimeline}`;
        const { data, next } = await apiFetch(instanceUrl, accessToken, timelineUrl);
        
        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }
        
        data.forEach(status => {
            const statusCard = renderStatus(status, state.currentUser, actions, state.settings, true);
            state.timelineDiv.appendChild(statusCard);
        });

        state.nextPageUrl = next;
        
        if (!state.nextPageUrl) {
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
            state.scrollLoader.innerHTML = '<p></p>';
        }
        
    } catch (error) {
        console.error('Failed to fetch timeline:', error);
        state.timelineDiv.innerHTML = `<p>Could not load timeline. ${error.message}</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
        else document.getElementById('refresh-btn').classList.remove('loading');
    }
}
