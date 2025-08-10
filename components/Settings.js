import { apiFetch } from './api.js';
import { showToast } from './ui.js';

export function renderSettingsPage(state, actions, onMastodonLoginSuccess, onLemmyLoginSuccess) {
    const view = document.getElementById('settings-view');

    // --- Full HTML with ALL settings sections ---
    view.innerHTML = `
        <div class="settings-container">
            <h2>Settings</h2>

            <div class="settings-section">
                <h3>Mastodon Account</h3>
                <div id="mastodon-login-form">
                    <p>Log in to your Mastodon account to see your home timeline, post, and interact.</p>
                    <input type="text" id="mastodon-instance" placeholder="your.instance.social">
                    <button id="connect-mastodon-btn" class="button">Connect</button>
                </div>
                <div id="mastodon-user-info" style="display: none;"></div>
            </div>

            <div class="settings-section">
                <h3>Lemmy Account</h3>
                <div id="lemmy-login-form">
                    <p>Log in to your Lemmy account to see your subscribed communities, vote, and comment.</p>
                    <select id="lemmy-instance-select"></select>
                    <input type="text" id="lemmy-username" placeholder="Username">
                    <input type="password" id="lemmy-password" placeholder="Password">
                    <button id="connect-lemmy-btn" class="button">Login</button>
                </div>
                <div id="lemmy-user-info" style="display: none;"></div>
            </div>

            <div class="settings-section">
                <h3>Appearance</h3>
                <label for="theme-select">Theme</label>
                <select id="theme-select">
                    <option value="feedstodon">Feedstodon (Default)</option>
                    <option value="readit">Readit</option>
                    <option value="git">Git</option>
                    <option value="voyage">Voyage</option>
                </select>
            </div>

            <div class="settings-section">
                <h3>Content Filtering</h3>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="hide-nsfw-checkbox">
                        Hide NSFW (Not Safe For Work) Content
                    </label>
                </div>
            </div>
        </div>
    `;

    // --- All Event Listeners and Logic ---

    const mastodonInstanceInput = document.getElementById('mastodon-instance');
    const connectMastodonBtn = document.getElementById('connect-mastodon-btn');
    const mastodonUserInfo = document.getElementById('mastodon-user-info');
    const mastodonLoginForm = document.getElementById('mastodon-login-form');

    const lemmyInstanceSelect = document.getElementById('lemmy-instance-select');
    const lemmyUsernameInput = document.getElementById('lemmy-username');
    const lemmyPasswordInput = document.getElementById('lemmy-password');
    const connectLemmyBtn = document.getElementById('connect-lemmy-btn');
    const lemmyUserInfo = document.getElementById('lemmy-user-info');
    const lemmyLoginForm = document.getElementById('lemmy-login-form');
    
    const themeSelect = document.getElementById('theme-select');
    const hideNsfwCheckbox = document.getElementById('hide-nsfw-checkbox');

    // Populate Lemmy instances
    state.lemmyInstances.forEach(instance => {
        const option = document.createElement('option');
        option.value = instance;
        option.textContent = instance;
        lemmyInstanceSelect.appendChild(option);
    });
    lemmyInstanceSelect.value = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];

    // Check Mastodon login status
    if (state.currentUser) {
        mastodonLoginForm.style.display = 'none';
        mastodonUserInfo.style.display = 'block';
        mastodonUserInfo.innerHTML = `<p>Logged in as <strong>${state.currentUser.acct}</strong></p><button id="logout-mastodon-btn" class="button-danger">Logout</button>`;
        document.getElementById('logout-mastodon-btn').addEventListener('click', () => {
            localStorage.removeItem('fediverse-instance');
            localStorage.removeItem('fediverse-token');
            state.currentUser = null;
            state.instanceUrl = null;
            state.accessToken = null;
            renderSettingsPage(state, actions, onMastodonLoginSuccess, onLemmyLoginSuccess); // Re-render
        });
    }

    // Check Lemmy login status
    if (localStorage.getItem('lemmy_jwt')) {
        lemmyLoginForm.style.display = 'none';
        lemmyUserInfo.style.display = 'block';
        lemmyUserInfo.innerHTML = `<p>Logged in as <strong>${localStorage.getItem('lemmy_username')}</strong> on ${localStorage.getItem('lemmy_instance')}</p><button id="logout-lemmy-btn" class="button-danger">Logout</button>`;
        document.getElementById('logout-lemmy-btn').addEventListener('click', () => {
            localStorage.removeItem('lemmy_jwt');
            localStorage.removeItem('lemmy_username');
            localStorage.removeItem('lemmy_instance');
            renderSettingsPage(state, actions, onMastodonLoginSuccess, onLemmyLoginSuccess); // Re-render
        });
    }

    // Mastodon Connect Logic
    connectMastodonBtn.addEventListener('click', () => {
        const instanceUrl = `https://${mastodonInstanceInput.value}`;
        // Redirect user to Mastodon's auth page
        window.location.href = `${instanceUrl}/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=read write follow`;
        // Note: You need a proper OAuth flow for this to work, which is beyond a simple client-side app.
        // This is a placeholder for where that logic would go. A real implementation
        // would require a server or a different OAuth grant type.
        showToast("Redirecting to your instance for authorization...");
    });

    // Lemmy Connect Logic
    connectLemmyBtn.addEventListener('click', () => {
        const instance = lemmyInstanceSelect.value;
        const username = lemmyUsernameInput.value;
        const password = lemmyPasswordInput.value;
        if (onLemmyLoginSuccess) {
            onLemmyLoginSuccess(instance, username, password);
        }
    });

    // Theme Selector Logic
    themeSelect.value = document.body.dataset.theme || 'feedstodon';
    themeSelect.addEventListener('change', () => {
        const selectedTheme = themeSelect.value;
        document.body.dataset.theme = selectedTheme;
        localStorage.setItem('feedstodon-theme', selectedTheme);
    });

    // NSFW Toggle Logic
    hideNsfwCheckbox.checked = state.settings.hideNsfw;
    hideNsfwCheckbox.addEventListener('change', () => {
        state.settings.hideNsfw = hideNsfwCheckbox.checked;
        localStorage.setItem('settings-hideNsfw', JSON.stringify(state.settings.hideNsfw));
        
        // Refresh the current view to apply the filter
        if (state.currentView === 'timeline') {
            if (state.currentTimeline) {
                actions.showMastodonTimeline(state.currentTimeline);
            } else if (state.currentLemmyFeed) {
                actions.showLemmyFeed(state.currentLemmyFeed);
            }
        }
    });
}
