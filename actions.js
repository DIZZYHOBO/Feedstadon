import { apiFetch } from './components/api.js';
import { showModal, hideModal, showImageModal, showToast } from './components/ui.js';
import { renderStatus } from './components/Post.js';

export class AppActions {
    constructor(state, app) {
        this.state = state;
        this.app = app;
    }

    // --- Generic Helpers ---
    apiFetch(endpoint, options = {}) {
        // Centralized API fetcher using the app's current state
        return apiFetch(this.state.instanceUrl, this.state.accessToken, endpoint, options);
    }
    
    // --- UI Actions ---
    showToast(message, type = 'info') { showToast(message, type); }
    showModal(modalId) { showModal(modalId); }
    hideModal(modalId) { hideModal(modalId); }
    showImageModal(src) { showImageModal(src); }
    
    // --- Status/Post Actions ---
    async postStatus(payload) {
        try {
            const { data } = await this.apiFetch('/api/v1/statuses', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            this.showToast('Status posted successfully!', 'success');
            this.hideModal('compose-modal');
            this.app.refreshCurrentView(); // Tell the main app to refresh
            return data;
        } catch (error) {
            console.error("Failed to post status:", error);
            this.showToast(`Error: ${error.message}`, 'error');
            return null;
        }
    }

    async toggleAction(action, status, button) {
        const endpoint = `/api/v1/statuses/${status.id}/${action}`;
        const isCurrentlyActive = button.classList.contains('active');
        
        try {
            // Use the endpointOverride for un-actions, a clever Mastodon API feature
            const { data: updatedStatus } = await this.apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({}),
                endpointOverride: isCurrentlyActive ? `/api/v1/statuses/${status.id}/un${action}` : endpoint
            });
            
            button.classList.toggle('active');
            
            const countSpan = button.querySelector('span');
            if (countSpan) {
                // Update counts dynamically
                const countMap = {
                    'favorite': 'favourites_count',
                    'reblog': 'reblogs_count'
                };
                if (countMap[action]) {
                    countSpan.textContent = updatedStatus[countMap[action]];
                }
            }
            if (action === 'bookmark') {
                this.showToast(isCurrentlyActive ? 'Bookmark removed' : 'Bookmarked!', 'success');
            }
        } catch (error) {
            console.error(`Failed to ${action} status:`, error);
            this.showToast('Action failed', 'error');
        }
    }
    
    async replyToStatus(status, card) {
        let replyContainer = card.querySelector('.quick-reply-container');
        let conversationContainer = card.querySelector('.conversation-container');
    
        const isVisible = replyContainer && replyContainer.style.display === 'block';
    
        if (isVisible) {
            // Hide if already open
            replyContainer.style.display = 'none';
            if (conversationContainer) conversationContainer.style.display = 'none';
        } else {
            // Create and show if hidden
            if (!replyContainer) {
                replyContainer = this.app.createQuickReplyBox(status, card); // Delegate UI creation to app.js
            }
    
            if (!conversationContainer) {
                conversationContainer = document.createElement('div');
                conversationContainer.className = 'conversation-container';
                card.appendChild(conversationContainer);
            }
    
            // Show everything
            replyContainer.style.display = 'block';
            conversationContainer.style.display = 'block';
            replyContainer.querySelector('textarea').focus();
    
            conversationContainer.innerHTML = '<p class="loading-notice">Loading recent replies...</p>';
    
            // Fetch and render the recent replies
            try {
                const { data: context } = await this.apiFetch(`/api/v1/statuses/${status.id}/context`);
                
                conversationContainer.innerHTML = ''; // Clear loading
    
                if (context.descendants && context.descendants.length > 0) {
                    const recentReplies = context.descendants.slice(-3); // Get the last 3 replies
                    
                    recentReplies.forEach(reply => {
                        const replyCard = renderStatus(reply, this.state.currentUser, this.app.actions, this.state.settings);
                        replyCard.classList.add('nested-reply');
                        conversationContainer.appendChild(replyCard);
                    });
                } else {
                    conversationContainer.innerHTML = '<p class="no-replies-notice">No replies yet.</p>';
                }
            } catch (error) {
                console.error('Failed to fetch conversation:', error);
                conversationContainer.innerHTML = '<p class="no-replies-notice">Could not load replies.</p>';
            }
        }
    }

    deleteStatus(statusId) {
        if (confirm('Are you sure you want to delete this status?')) {
            this.apiFetch(`/api/v1/statuses/${statusId}`, { method: 'DELETE' })
                .then(() => {
                    this.showToast('Status deleted', 'success');
                    const statusElement = document.querySelector(`.status[data-id="${statusId}"]`);
                    if (statusElement) statusElement.remove();
                })
                .catch(err => {
                    console.error('Failed to delete status:', err);
                    this.showToast('Failed to delete status', 'error');
                });
        }
    }
    
    // --- Profile Actions ---
    async showProfilePage(platform, accountId, accountAcct) {
        this.state.currentProfile = { platform, accountId, accountAcct };
        this.app.router.navigateTo('profile');
        
        const view = document.getElementById('profile-page-view');
        view.innerHTML = 'Loading profile...';

        try {
            if (platform === 'mastodon') {
                const { data: account } = await this.apiFetch(`/api/v1/accounts/${accountId}`);
                const { data: statuses } = await this.apiFetch(`/api/v1/accounts/${accountId}/statuses`);
                this.app.renderProfilePage(account, statuses); // Delegate rendering back to app.js
            } else if (platform === 'lemmy') {
                const { data: personView } = await this.apiFetch(`/api/v3/user?username=${accountAcct}`);
                const { data: posts } = await this.apiFetch(`/api/v3/user?username=${accountAcct}&sort=New&page=1&limit=20&saved_only=false`);
                this.app.renderLemmyProfilePage(personView, posts.posts, posts.comments); // Delegate rendering
            }
        } catch(error) {
            console.error('Error loading profile:', error);
            view.innerHTML = '<p>Could not load profile.</p>'
        }
    }
}
