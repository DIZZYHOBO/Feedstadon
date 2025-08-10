import { apiFetch } from './components/api.js';
import { showToast, hideModal } from './components/ui.js';
import { renderStatus } from './components/Post.js';
import { renderLemmyPost } from './components/LemmyPost.js';
import { renderNotification } from './components/Notifications.js';
import { renderProfile, renderLemmyProfile } from './components/Profile.js';

export class AppActions {
    constructor(state, app) {
        this.state = state;
        this.app = app;
    }

    async verifyCredentialsAndLoadApp() {
        try {
            const data = await apiFetch(this.state.instanceUrl, this.state.accessToken, '/api/v1/accounts/verify_credentials');
            this.state.currentUser = data;
            if (!window.location.hash || window.location.hash === '#login') {
                this.app.router.navigateTo('home');
            } else {
                this.app.router.handleRouteChange();
            }
        } catch (error) {
            console.error('Credential verification failed:', error);
            showToast('Login failed. Please check your instance and token.', 'error');
            this.logout();
        }
    }

    handleMastodonLogin() {
        const instanceUrl = document.getElementById('instance_url').value.trim();
        const accessToken = document.getElementById('access_token').value.trim();
        if (!instanceUrl || !accessToken) {
            showToast('Please enter both instance URL and access token.', 'error');
            return;
        }
        this.state.instanceUrl = instanceUrl;
        this.state.accessToken = accessToken;
        localStorage.setItem('feedstadon_instance', instanceUrl);
        localStorage.setItem('feedstadon_token', accessToken);
        this.verifyCredentialsAndLoadApp();
    }

    handleLemmyLogin() {
        showToast("Lemmy login is not yet implemented.", "info");
    }

    logout() {
        localStorage.clear();
        this.state.instanceUrl = null;
        this.state.accessToken = null;
        this.state.currentUser = null;
        this.state.lemmy.jwt = null;
        window.location.hash = '';
        this.app.router.navigateTo('login');
    }

    async fetchTimeline() {
        const container = document.getElementById('timeline');
        container.innerHTML = '<p>Loading timeline...</p>';
        
        let endpoint;
        let isLemmy = false;
        switch (this.state.currentTimeline) {
            case 'local': endpoint = '/api/v1/timelines/public?local=true'; break;
            case 'federated': endpoint = '/api/v1/timelines/public'; break;
            case 'lemmy': 
                isLemmy = true; 
                // A default Lemmy instance for now, this should be configurable
                this.state.instanceUrl = 'lemmy.world'; 
                endpoint = `/api/v3/post/list?sort=${this.state.settings.lemmySort}`; 
                break;
            default: endpoint = '/api/v1/timelines/home'; break;
        }

        try {
            const data = await apiFetch(this.state.instanceUrl, this.state.accessToken, endpoint, {}, isLemmy);
            container.innerHTML = '';
            if (isLemmy) {
                data.posts.forEach(post => container.appendChild(renderLemmyPost(post, this.app)));
            } else {
                data.forEach(status => container.appendChild(renderStatus(status, this.state.currentUser, this.app)));
            }
        } catch (error) {
            console.error('Failed to load timeline:', error);
            container.innerHTML = '<p>Could not load timeline. Check console for details.</p>';
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async fetchNotifications() {
        const container = document.getElementById('notifications-container');
        container.innerHTML = '<p>Loading notifications...</p>';
        try {
            const data = await apiFetch(this.state.instanceUrl, this.state.accessToken, '/api/v1/notifications');
            container.innerHTML = '';
            if (data.length === 0) {
                container.innerHTML = '<p>No notifications.</p>';
                return;
            }
            data.forEach(notification => {
                container.appendChild(renderNotification(notification, this.app));
            });
        } catch (error) {
            console.error('Failed to load notifications:', error);
            container.innerHTML = '<p>Could not load notifications.</p>';
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async postStatus(payload) {
        try {
            await apiFetch(this.state.instanceUrl, this.state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Status posted successfully!', 'success');
            hideModal('compose-modal');
            document.getElementById('compose-textarea').value = ''; // Clear textarea
            this.app.refreshCurrentView();
        } catch (error) {
            console.error("Failed to post status:", error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async toggleAction(action, status, button) {
        const endpoint = `/api/v1/statuses/${status.id}/${action}`;
        const method = status[action.slice(0, -1)+'ed'] ? 'POST' : 'POST'; // Mastodon uses POST for both
        const undoEndpoint = `/api/v1/statuses/${status.id}/un${action.slice(0, -1)}`;

        try {
            const response = await apiFetch(this.state.instanceUrl, this.state.accessToken, status[action.slice(0, -1)+'ed'] ? undoEndpoint : endpoint, { method: 'POST' });
            button.classList.toggle('active');
            // Update counts if available
        } catch (error) {
            console.error(`Failed to ${action} status:`, error);
            showToast(`Error: Could not perform action.`, 'error');
        }
    }

    async showProfilePage(platform, accountId, accountAcct) {
        const container = document.getElementById('profile-page-view');
        container.innerHTML = `<p>Loading profile for @${accountAcct}...</p>`;

        if (platform === 'mastodon') {
            try {
                const [account, statuses] = await Promise.all([
                    apiFetch(this.state.instanceUrl, this.state.accessToken, `/api/v1/accounts/${accountId}`),
                    apiFetch(this.state.instanceUrl, this.state.accessToken, `/api/v1/accounts/${accountId}/statuses`)
                ]);
                container.innerHTML = '';
                container.appendChild(renderProfile(account, statuses, this.app));
            } catch (error) {
                console.error('Failed to load Mastodon profile:', error);
                container.innerHTML = `<p>Could not load profile for @${accountAcct}.</p>`;
            }
        } else if (platform === 'lemmy') {
            // This part needs a proper Lemmy API implementation
            container.innerHTML = `<p>Lemmy profiles are not yet fully supported.</p>`;
        }
    }
}
