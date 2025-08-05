import { fetchTimeline, renderLoginPrompt } from './components/Timeline.js';
import { renderProfilePage, renderLemmyProfilePage } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail } from './components/Post.js';
import { initComposeModal, showComposeModal } from './components/Compose.js';
import { fetchLemmyFeed, renderLemmyCard } from './components/Lemmy.js';
import { renderLemmyPostPage } from './components/LemmyPost.js';
import { ICONS } from './components/icons.js';
import { apiFetch } from './components/api.js';

function initDropdowns() {
    // ... (same as before)
}

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        // ... (same as before)
    };

    const views = {
        app: document.getElementById('app-view'),
        timeline: document.getElementById('timeline'),
        profile: document.getElementById('profile-page-view'),
        search: document.getElementById('search-results-view'),
        settings: document.getElementById('settings-view'),
        statusDetail: document.getElementById('status-detail-view'),
        lemmyPost: document.getElementById('lemmy-post-view'),
    };

    const switchView = (viewName, pushToHistory = true) => {
        // ... (logic now handles showing/hiding app view)
        document.body.style.paddingTop = '50px';
        views.app.style.display = 'block';
        document.querySelector('.top-nav').style.display = 'flex';
        // ...
    };

    // ... (showToast remains the same)

    const actions = {
        // ... (most actions remain the same)
         showLemmyFeed: (feedType, sortType = 'New') => {
            state.currentLemmyFeed = feedType;
            state.currentTimeline = null;
            state.currentLemmySort = sortType;
            switchView('timeline');
            document.getElementById('lemmy-sort-select').value = sortType;
            fetchLemmyFeed(state, actions);
        },
        showMastodonTimeline: (timelineType) => {
            state.currentLemmyFeed = null;
            state.currentTimeline = timelineType;
            switchView('timeline');
            fetchTimeline(state, actions);
        },
    };
    state.actions = actions;

    const onMastodonLoginSuccess = async (instanceUrl, accessToken, callback) => {
        const success = await apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials')
            .then(response => {
                if (!response || !response.data || !response.data.id) {
                    showToast('Mastodon login failed.'); return false;
                }
                // ... (rest of success logic)
                if (callback) callback();
                else actions.showMastodonTimeline('home'); // Refresh view on success
                return true;
            })
            // ... (rest of error logic)
        return success;
    };

    const onLemmyLoginSuccess = (instance, username, password, callback) => {
        // ... (same logic, but calls showLemmyFeed on success)
        .then(response => {
            if (response.data.jwt) {
                // ...
                if (callback) callback();
                else actions.showLemmyFeed(state.currentLemmyFeed || 'All'); // Refresh view
            } // ...
        })
    };
    
    // ** THE FIX IS HERE ** : New initial startup logic
    initDropdowns();
    initComposeModal(state, () => actions.showMastodonTimeline('home'));
    
    // Start the app immediately
    switchView('timeline');
    // Decide initial feed based on login status
    if (localStorage.getItem('lemmy_jwt')) {
        actions.showLemmyFeed('All');
    } else if (localStorage.getItem('fediverse-token')) {
        actions.showMastodonTimeline('home');
    } else {
        // If logged out of both, default to showing a Lemmy login prompt
        actions.showLemmyFeed('All');
    }

    // --- Logout Modal Logic ---
    // ... (remains the same)

    // --- Other Event Listeners ---
    // ... (remains the same)

    window.addEventListener('scroll', () => {
        if (state.isLoadingMore) return;
        // ... (rest of scroll logic)
    });
});
