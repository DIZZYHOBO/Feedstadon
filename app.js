import { renderTimeline } from './components/Timeline.js';
import { renderCompose } from './components/Compose.js';
import { renderFullPost } from './components/Post.js';
import { renderNotifications } from './components/Notifications.js';
import { renderSearch } from './components/Search.js';
import { fetchLemmyFeed } from './components/Lemmy.js';
import { renderDiscoverPage } from './components/Discover.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderProfilePage } from './components/Profile.js';
import { renderLemmyCommunityPage } from './components/LemmyCommunity.js';
import { renderLemmyPostDetail } from './components/LemmyPost.js';
import { showContextMenu, showToast, renderLoginPrompt } from './components/ui.js';
import * as actions from './actions.js';

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        // ... state properties
    };

    const boundActions = {};
    for (const key in actions) {
        boundActions[key] = actions[key].bind(null, state, boundActions);
    }
    
    function init() {
        // ... init logic
        boundActions.initApp();
    }

    init();
});
