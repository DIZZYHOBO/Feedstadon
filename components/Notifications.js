import { apiFetch } from './components/api.js';
import { renderTimeline, renderStatusDetail } from './components/Timeline.js';
import { renderNotificationsPage } from './components/Notifications.js';
import { renderProfilePage, renderEditProfilePage } from './components/Profile.js';
import { renderSettingsPage } from './components/Settings.js';
import { ICONS } from './components/icons.js';
import { showModal, hideModal } from './components/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        accessToken: localStorage.getItem('mastodon_access_token'),
        instanceUrl: localStorage.getItem('mastodon_instance_url'),
        lemmyInstance: localStorage.getItem('lemmy_instance'),
        lemmyToken: localStorage.getItem('lemmy_jwt'),
        currentTimeline: 'home',
        currentProfileId: null,
        wordFilters: JSON.parse(localStorage.getItem('wordFilters')) || []
    };

    const actions = {
        async login(instanceUrl, accessToken) {
            state.instanceUrl = instanceUrl.trim();
            state.accessToken = accessToken.trim();
            localStorage.setItem('mastodon_instance_url', state.instanceUrl);
            localStorage.setItem('mastodon_access_token', state.accessToken);
            window.location.reload();
        },
        async lemmyLogin(instance, username, password) {
            try {
                const response = await apiFetch(instance, null, '/api/v3/user/login', {
                    method: 'POST',
                    body: { username_or_email: username, password: password }
                }, 'lemmy');

                if (response.data.jwt) {
                    state.lemmyInstance = instance;
                    state.lemmyToken = response.data.jwt;
                    localStorage.setItem('lemmy_instance', instance);
                    localStorage.setItem('lemmy_jwt', response.data.jwt);
                    window.location.reload();
                } else {
                    console.error("Lemmy login failed:", response.data.error || "No JWT token received");
                }
            } catch (error) {
                console.error("Error during Lemmy login:", error);
            }
        },
        logoutAll() {
            localStorage.removeItem('mastodon_access_token');
            localStorage.removeItem('mastodon_instance_url');
            localStorage.removeItem('lemmy_jwt');
            localStorage.removeItem('lemmy_instance');
            window.location.reload();
        },
        async showTimeline(timelineType) {
            state.currentTimeline = timelineType;
            this.updateActiveView('timeline-view');
            await renderTimeline(state, actions);
        },
        async showStatusDetail(statusId) {
            this.updateActiveView('status-detail-view');
            await renderStatusDetail(state, actions, statusId);
        },
        async showNotifications() {
            this.updateActiveView('notifications-view');
            await renderNotificationsPage(state, actions);
        },
        async showProfile(accountId) {
            state.currentProfileId = accountId;
            this.updateActiveView('profile-page-view');
            await renderProfilePage(state, actions, accountId);
        },
        async showEditProfile() {
            this.updateActiveView('edit-profile-view');
            await renderEditProfilePage(state, actions);
        },
        async showSettings() {
            this.updateActiveView('settings-view');
            renderSettingsPage(state, actions);
        },
        updateActiveView(viewId) {
            const views = ['timeline-view', 'status-detail-view', 'notifications-view', 'profile-page-view', 'edit-profile-view', 'settings-view'];
            views.forEach(id => {
                const view = document.getElementById(id.replace('-view', ''));
                if (view) {
                    view.style.display = id === viewId ? 'block' : 'none';
                }
            });
        }
    };

    if (!state.accessToken && !state.lemmyToken) {
        // Show login view
        const loginTemplate = document.getElementById('login-prompt-template').content.cloneNode(true);
        document.body.innerHTML = '';
        document.body.appendChild(loginTemplate);
        
        document.querySelector('.mastodon-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const instanceUrl = e.target.querySelector('.instance-url').value;
            const accessToken = e.target.querySelector('.access-token').value;
            actions.login(instanceUrl, accessToken);
        });

        document.querySelector('.lemmy-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = e.target.querySelector('.lemmy-instance-input').value;
            const username = e.target.querySelector('.lemmy-username-input').value;
            const password = e.target.querySelector('.lemmy-password-input').value;
            actions.lemmyLogin(instance, username, password);
        });

    } else {
        // Show main app view
        document.querySelector('.top-nav').style.display = 'flex';
        actions.showTimeline('home');
    }

    // --- Event Listeners for main UI ---
    if (state.accessToken || state.lemmyToken) {
        document.getElementById('notifications-btn').addEventListener('click', () => actions.showNotifications());
        document.getElementById('profile-link').addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: Need a way to get the current user's ID
            // For now, this will be non-functional until we fetch current user data
            console.log("Profile link clicked - functionality to be implemented");
        });
        document.getElementById('settings-link').addEventListener('click', (e) => {
            e.preventDefault();
            actions.showSettings();
        });
        document.getElementById('logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            showModal('logout-modal');
        });
        
        document.getElementById('logout-all-link').addEventListener('click', (e) => {
            e.preventDefault();
            actions.logoutAll();
        });

        document.getElementById('logout-all-btn').addEventListener('click', () => actions.logoutAll());
        document.getElementById('cancel-logout-btn').addEventListener('click', () => hideModal('logout-modal'));

        document.querySelector('.main-feed-link').addEventListener('click', (e) => {
            e.preventDefault();
            actions.showTimeline('home');
        });

        // Initialize icons
        document.getElementById('notifications-btn').innerHTML = ICONS.notifications;
    }
});
