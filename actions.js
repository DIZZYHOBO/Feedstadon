import { apiFetch } from './components/api.js';
import { showToast, hideModal } from './components/ui.js';
import { renderStatus } from './components/Post.js';
import { renderLemmyPost } from './components/LemmyPost.js';
import { timeSince } from './components/utils.js';

export class AppActions {
    constructor(state, app) {
        this.state = state;
        this.app = app;
    }

    async verifyCredentialsAndLoadApp() {
        try {
            const { data } = await apiFetch(this.state.instanceUrl, this.state.accessToken, '/api/v1/accounts/verify_credentials');
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
        const instanceUrl = document.getElementById('instance_url').value;
        const accessToken = document.getElementById('access_token').value;
        this.state.instanceUrl = instanceUrl;
        this.state.accessToken = accessToken;
        localStorage.setItem('feedstadon_instance', instanceUrl);
        localStorage.setItem('feedstadon_token', accessToken);
        this.verifyCredentialsAndLoadApp();
    }

    handleLemmyLogin() {
        showToast("Lemmy login coming soon!", "info");
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
        container.innerHTML = 'Loading timeline...';
        
        let endpoint;
        let isLemmy = false;
        switch (this.state.currentTimeline) {
            case 'local': endpoint = '/api/v1/timelines/public?local=true'; break;
            case 'federated': endpoint = '/api/v1/timelines/public'; break;
            case 'lemmy': isLemmy = true; endpoint = `/api/v3/post/list?sort=${this.state.settings.lemmySort}`; break;
            default: endpoint = '/api/v1/timelines/home'; break;
        }

        try {
            const { data } = await apiFetch(this.state.instanceUrl, this.state.accessToken, endpoint);
            container.innerHTML = '';
            if (isLemmy) {
                data.posts.forEach(post => container.appendChild(renderLemmyPost(post, this, this.state.settings)));
            } else {
                data.forEach(status => container.appendChild(renderStatus(status, this.state.currentUser, this, this.state.settings)));
            }
        } catch (error) {
            console.error('Failed to load timeline:', error);
            container.innerHTML = '<p>Could not load timeline.</p>';
        }
    }

    async fetchNotifications() {
        // ... Logic for fetching and rendering notifications
    }

    async postStatus(payload) {
        try {
            await apiFetch(this.state.instanceUrl, this.state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Status posted successfully!', 'success');
            hideModal('compose-modal');
            this.app.refreshCurrentView();
        } catch (error) {
            console.error("Failed to post status:", error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async toggleAction(action, status, button) {
        // ... Logic for favoriting, bookmarking, etc.
    }

    async replyToStatus(status, card) {
        // ... Logic for handling the reply UI and posting a reply
    }
    
    async showProfilePage(platform, accountId, accountAcct) {
        // ... Logic for fetching and rendering a user's profile
    }
}
