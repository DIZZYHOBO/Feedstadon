// components/Lemmy.js - Simplified for backward compatibility
// Most functionality moved to Alpine components and actions

import { ICONS } from './icons.js';
import { formatTimestamp, processSpoilers } from './utils.js';
import { renderLoginPrompt } from './ui.js';
import { apiFetch } from './api.js';

// Keep this function for any legacy code that might still call it
export function renderLemmyCard(post, actions) {
    console.warn('Legacy renderLemmyCard called - this is now handled by Alpine postComponent');
    
    // Return a simple placeholder - the real rendering is in Alpine
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.innerHTML = `
        <div class="legacy-post-notice">
            <p>Legacy post rendering - please refresh to see the new Alpine version</p>
            <h3>${post.post.name}</h3>
        </div>
    `;
    return card;
}

// Keep this function for backward compatibility
export async function fetchLemmyFeed(state, actions, loadMore = false, onLemmySuccess) {
    console.warn('Legacy fetchLemmyFeed called - consider using actions.loadLemmyFeed instead');
    
    if (!localStorage.getItem('lemmy_jwt') && !loadMore) {
        if (state.timelineDiv) {
            renderLoginPrompt(state.timelineDiv, 'lemmy', onLemmySuccess);
        }
        return;
    }

    if (state.isLoadingMore) return;

    if (!loadMore) {
        window.scrollTo(0, 0);
    }
    
    state.isLoadingMore = true;

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) {
            throw new Error("Lemmy instance not found. Please log in.");
        }

        const params = {
            sort: state.currentLemmySort,
            page: loadMore ? state.lemmyPage + 1 : 1,
            limit: 20,
            type_: state.currentLemmyFeed 
        };
        
        const response = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', params);
        const posts = response.data.posts;

        console.log('Legacy Lemmy feed loaded:', posts.length, 'posts');

        if (posts && posts.length > 0) {
            if (loadMore) {
                state.lemmyPage++;
            } else {
                state.lemmyPage = 1;
            }
            state.lemmyHasMore = true;
        } else {
            state.lemmyHasMore = false;
        }

    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        if (state.timelineDiv) {
            state.timelineDiv.innerHTML = `<p>Error loading feed.</p>`;
        }
    } finally {
        state.isLoadingMore = false;
    }
}
