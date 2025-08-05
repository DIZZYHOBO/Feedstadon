import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLoginPrompt } from './Timeline.js'; // Re-using the same prompt renderer

export function renderLemmyCard(post, actions) {
    // ... (remains the same)
}

export async function fetchLemmyFeed(state, actions, loadMore = false) {
    // ** THE FIX IS HERE **: Check for login first.
    if (!localStorage.getItem('lemmy_jwt')) {
        renderLoginPrompt(state.timelineDiv, 'lemmy', state, state.actions);
        return;
    }
    
    // ... (rest of fetchLemmyFeed logic remains the same)
}
