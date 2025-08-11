// components/Piefed.js

import { state } from '../app.js';
import { apiFetch } from './api.js';
import { renderLemmyPost } from './LemmyPost.js'; // We will adapt this or create a PiefedPost renderer
import { showToast } from './ui.js';

// NOTE: This is a placeholder. You will need to adapt this to the actual Piefed API structure.
function renderPiefedPost(post) {
    // This is a temporary solution. Ideally, you would create a renderPiefedPost function
    // similar to renderLemmyPost but tailored for the Piefed post object structure.
    return renderLemmyPost(post);
}

export async function fetchPiefedFeed(feedType = 'Subscribed', communityName = null, sort = 'Hot') {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '<div class="loading-spinner"></div>';

    const instance = localStorage.getItem('piefed_instance');
    const jwt = localStorage.getItem('piefed_jwt');

    if (!instance || !jwt) {
        timeline.innerHTML = '<p>Not logged into Piefed.</p>';
        return;
    }

    // NOTE: This endpoint is a placeholder based on Lemmy's API.
    // You MUST replace '/api/v3/post/list' and the params with the correct Piefed API endpoint and parameters.
    const path = '/api/v3/post/list'; 
    const params = {
        sort: sort,
        limit: 20,
        type_: feedType
    };

    if (communityName) {
        params.community_name = communityName;
    }

    try {
        const response = await apiFetch(instance, jwt, path, { method: 'GET', params: params }, 'piefed');
        
        // NOTE: Adjust 'response.data.posts' to match the actual structure of the Piefed API response.
        const posts = response.data.posts;

        if (posts && posts.length > 0) {
            timeline.innerHTML = posts.map(renderPiefedPost).join('');
        } else {
            timeline.innerHTML = '<p>No posts found on Piefed.</p>';
        }
    } catch (error) {
        console.error('Error fetching Piefed feed:', error);
        showToast('Failed to fetch Piefed feed.');
        timeline.innerHTML = '<p>Error fetching Piefed feed.</p>';
    }
}
