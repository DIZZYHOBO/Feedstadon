// components/Timeline.js - Simplified for backward compatibility
// Most functionality moved to Alpine components

import { apiFetch } from './api.js';
import { renderLoginPrompt } from './ui.js';

// Keep this function for any legacy code that might still call it
export async function fetchTimeline(state, actions, loadMore = false, onLoginSuccess, mastodonOnly = false) {
    console.warn('Legacy fetchTimeline called - consider using actions.loadTimeline instead');
    
    if (!state.accessToken && !loadMore) {
        renderLoginPrompt(state.timelineDiv, 'mastodon', onLoginSuccess);
        return;
    }
    
    if (state.isLoadingMore) return;

    if (!loadMore) {
        window.scrollTo(0, 0);
        state.nextPageUrl = null;
    }

    state.isLoadingMore = true;
    
    try {
        const timelineUrl = loadMore && state.nextPageUrl ? state.nextPageUrl : `/api/v1/timelines/${state.currentTimeline}`;
        const { data, next } = await apiFetch(state.instanceUrl, state.accessToken, timelineUrl);
        
        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }
        
        // This is now handled by Alpine components
        console.log('Timeline data loaded:', data.length, 'posts');
        
        state.nextPageUrl = next;
        
    } catch (error) {
        console.error('Failed to fetch timeline:', error);
        if (state.timelineDiv) {
            state.timelineDiv.innerHTML = `<p>Could not load timeline. ${error.message}</p>`;
        }
    } finally {
        state.isLoadingMore = false;
    }
}
