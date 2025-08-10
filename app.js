import { apiFetch, getPersistedCredentials } from './components/api.js';
import { showModal, hideModal, showImageModal, showToast, updateCharacterCount } from './components/ui.js';
import { renderStatus } from './components/Post.js';
import { renderLemmyPost } from './components/LemmyPost.js';
import { formatTimestamp, timeSince } from './components/utils.js';
import { AppActions } from './actions.js';

class App {
    constructor() {
        this.state = {
            currentView: 'login',
            instanceUrl: null,
            accessToken: null,
            currentUser: null,
            currentTimeline: 'home',
            currentProfile: null,
            currentStatus: null,
            notifications: [],
            settings: {
                hideNsfw: true,
                lemmySort: 'Hot',
            },
        };
        this.router = new Router(this);
        this.actions = new AppActions(this.state, this); // Instantiate the actions class
        this.init();
    }
    
    // --- Initialization ---
    init() {
        this.loadSettings();
        const credentials = getPersistedCredentials();
        if (credentials.instanceUrl && credentials.accessToken) {
            this.state.instanceUrl = credentials.instanceUrl;
            this.state.accessToken = credentials.accessToken;
            this.verifyCredentialsAndLoadApp();
        } else {
            this.router.navigateTo('login');
        }
        this.setupEventListeners();
    }

    async verifyCredentialsAndLoadApp() {
        try {
            const { data } = await this.actions.apiFetch('/api/v1/accounts/verify_credentials');
            this.state.currentUser = data;
            this.router.navigateTo('home');
        } catch (error) {
            console.error('Credential verification failed:', error);
            this.actions.showToast('Login failed. Please check your instance and token.', 'error');
            this.logout();
        }
    }

    // --- Core App Logic & State Management ---
    loadSettings() {
        const savedSettings = localStorage.getItem('feedstadon_settings');
        if (savedSettings) {
            this.state.settings = JSON.parse(savedSettings);
        }
        document.getElementById('lemmy-sort-select').value = this.state.settings.lemmySort;
    }

    saveSettings() {
        localStorage.setItem('feedstadon_settings', JSON.stringify(this.state.settings));
    }
    
    createQuickReplyBox(status, card) {
        const replyContainer = document.createElement('div');
        replyContainer.className = 'quick-reply-container';
        const box = document.createElement('div');
        box.className = 'quick-reply-box';
        const textarea = document.createElement('textarea');
        textarea.placeholder = `Replying to @${status.account.acct}`;
        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Reply';
        
        sendBtn.onclick = async () => {
            if (textarea.value.trim()) {
                await this.actions.postStatus({ // Use this.actions
                    status: textarea.value,
                    in_reply_to_id: status.id,
                });
                textarea.value = '';
                replyContainer.style.display = 'none';
                const conversationContainer = card.querySelector('.conversation-container');
                if (conversationContainer) {
                   conversationContainer.style.display = 'none';
                }
            }
        };
        
        box.append(textarea, sendBtn);
        replyContainer.appendChild(box);
        card.appendChild(replyContainer);
        return replyContainer;
    }

    // --- Rendering ---
    renderProfilePage(account, statuses) {
        const view = document.getElementById('profile-page-view');
        view.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img src="${account.header}" class="banner">
                    <img src="${account.avatar}" class="avatar">
                </div>
                <div class="profile-actions">
                     ${this.state.currentUser.id === account.id ? '<button id="edit-profile-btn">Edit Profile</button>' : '<button id="follow-btn">Follow</button>'}
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${account.display_name}</h2>
                    <p class="acct">@${account.acct}</p>
                    <div class="note">${account.note}</div>
                    <div class="stats">
                        <span><strong>${account.statuses_count}</strong> Posts</span>
                        <span><strong>${account.following_count}</strong> Following</span>
                        <span><strong>${account.followers_count}</strong> Followers</span>
                    </div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;

        const feedContainer = view.querySelector('.profile-feed');
        statuses.forEach(status => {
            // Pass this.actions to renderStatus
            feedContainer.appendChild(renderStatus(status, this.state.currentUser, this.actions, this.state.settings));
        });

        if (this.state.currentUser.id === account.id) {
            document.getElementById('edit-profile-btn').addEventListener('click', () => this.router.navigateTo('edit-profile'));
        }
    }
    
    renderLemmyProfilePage(personData, posts, comments) {
        const view = document.getElementById('profile-page-view');
        const person = personData.person_view.person;
    
        view.innerHTML = `
            <div class="profile-card">
                 <div class="profile-header">
                    <img src="${person.banner || ''}" class="banner" onerror="this.style.backgroundColor='var(--primary-color)'">
                    <img src="${person.avatar || ''}" class="avatar" onerror="this.style.backgroundColor='var(--primary-color)'">
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${person.display_name || person.name}</h2>
                    <p class="acct">@${person.name}</p>
                    <div class="note">${person.bio || 'No bio provided.'}</div>
                </div>
            </div>
            <div class="profile-tabs">
                <button class="tab-button active" data-tab="posts">Posts</button>
                <button class="tab-button" data-tab="comments">Comments</button>
            </div>
            <div id="profile-posts-tab" class="profile-tab-content active"></div>
            <div id="profile-comments-tab" class="profile-tab-content"></div>
        `;
    
        const postsContainer = view.querySelector('#profile-posts-tab');
        posts.forEach(post => {
            // Pass this.actions to renderLemmyPost
            postsContainer.appendChild(renderLemmyPost(post, this.actions, this.state.settings));
        });
    
        const commentsContainer = view.querySelector('#profile-comments-tab');
        comments.forEach(comment => {
            const commentCard = document.createElement('div');
            commentCard.className = 'lemmy-comment-on-profile';
            commentCard.innerHTML = `
                <div class="comment-context">
                    Comment on <a href="#lemmy-post/${comment.post.id}">${comment.post.name}</a> in ${comment.community.name}
                </div>
                <div class="status-content">${comment.comment.content}</div>
                <div class="status-footer">
                    <span>${comment.counts.score} points</span>
                    <span>${comment.counts.child_count} replies</span>
                    <span>${timeSince(new Date(comment.comment.published))}</span>
                </div>
            `;
            commentsContainer.appendChild(commentCard);
        });
        
        view.querySelectorAll('.profile-tabs .tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;
                view.querySelectorAll('.profile-tabs .tab-button, .profile-tab-content').forEach(el => el.classList.remove('active'));
                button.classList.add('active');
                view.querySelector(`#profile-${tab}-tab`).classList.add('active');
            });
        });
    }

    refreshCurrentView() {
        this.router.navigateTo(this.state.currentView, { forceReload: true });
    }

    // --- Event Listeners ---
    setupEventListeners() {
        document.getElementById('login-form-mastodon').addEventListener('submit', async (e) => {
            e.preventDefault();
            const instanceUrl = document.getElementById('instance_url').value;
            const accessToken = document.getElementById('access_token').value;
            this.state.instanceUrl = instanceUrl;
            this.state.accessToken = accessToken;
            await this.verifyCredentialsAndLoadApp();
        });

        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('compose-btn').addEventListener('click', () => this.actions.showModal('compose-modal'));
        document.querySelector('#compose-modal .close-btn').addEventListener('click', () => this.actions.hideModal('compose-modal'));
        document.getElementById('compose-form').addEventListener('submit', (e) => {
             e.preventDefault();
             this.actions.postStatus({ status: document.getElementById('compose-textarea').value });
        });
        document.getElementById('compose-textarea').addEventListener('input', updateCharacterCount);


        // Timeline navigation
        document.querySelectorAll('.timeline-sub-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.state.currentTimeline = e.target.dataset.timeline;
                this.router.navigateTo('home', { forceReload: true });
            });
        });
        
        // Lemmy Sort Selector
        document.getElementById('lemmy-sort-select').addEventListener('change', (e) => {
            this.state.settings.lemmySort = e.target.value;
            this.saveSettings();
            if (this.state.currentTimeline === 'lemmy') {
                this.refreshCurrentView();
            }
        });
        
        // General nav buttons
        document.getElementById('home-btn').addEventListener('click', () => this.router.navigateTo('home'));
        document.getElementById('notifications-btn').addEventListener('click', () => this.router.navigateTo('notifications'));
    }

    logout() {
        localStorage.removeItem('feedstadon_instance');
        localStorage.removeItem('feedstadon_token');
        this.state.instanceUrl = null;
        this.state.accessToken = null;
        this.state.currentUser = null;
        this.router.navigateTo('login');
    }
}

class Router {
    constructor(app) {
        this.app = app;
        this.routes = {
            'login': this.showLoginView.bind(this),
            'home': this.showHomeTimeline.bind(this),
            'notifications': this.showNotifications.bind(this),
            'profile': this.showProfile.bind(this),
            'edit-profile': this.showEditProfile.bind(this),
            'status': this.showStatusDetail.bind(this),
        };
        window.addEventListener('hashchange', () => this.handleRouteChange());
    }

    handleRouteChange() {
        const hash = window.location.hash.substring(1);
        const [view, param] = hash.split('/');
        this.navigateTo(view || 'home', { param });
    }

    navigateTo(view, options = {}) {
        const { param = null, forceReload = false } = options;

        if (!forceReload && this.app.state.currentView === view && this.app.state.currentParam === param) {
            return;
        }

        document.querySelectorAll('.app-view').forEach(v => v.style.display = 'none');
        
        const routeHandler = this.routes[view];
        if (routeHandler) {
            this.app.state.currentView = view;
            this.app.state.currentParam = param;
            routeHandler(param);
            const viewElement = document.getElementById(`${view}-view`);
            if (viewElement) viewElement.style.display = 'flex';
        } else {
            console.error(`No route found for ${view}`);
            this.navigateTo('home');
        }
    }

    showLoginView() {
        document.getElementById('login-view').style.display = 'flex';
        document.querySelector('.top-nav').style.display = 'none';
    }

    async showHomeTimeline() {
        document.querySelector('.top-nav').style.display = 'flex';
        const timelineView = document.getElementById('timeline-view');
        timelineView.style.display = 'flex';
        const container = document.getElementById('timeline');
        container.innerHTML = 'Loading timeline...';
        
        document.querySelectorAll('.timeline-sub-nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.timeline-sub-nav-btn[data-timeline="${this.app.state.currentTimeline}"]`).classList.add('active');

        let endpoint;
        let isLemmy = false;
        switch (this.app.state.currentTimeline) {
            case 'local':
                endpoint = '/api/v1/timelines/public?local=true';
                break;
            case 'federated':
                endpoint = '/api/v1/timelines/public';
                break;
            case 'lemmy':
                isLemmy = true;
                endpoint = `/api/v3/post/list?sort=${this.app.state.settings.lemmySort}`;
                break;
            case 'home':
            default:
                endpoint = '/api/v1/timelines/home';
                break;
        }

        try {
            const { data } = await this.app.actions.apiFetch(endpoint);
            container.innerHTML = '';
            if (isLemmy) {
                data.posts.forEach(post => {
                    container.appendChild(renderLemmyPost(post, this.app.actions, this.app.state.settings));
                });
            } else {
                data.forEach(status => {
                    container.appendChild(renderStatus(status, this.app.state.currentUser, this.app.actions, this.app.state.settings));
                });
            }
        } catch (error) {
            console.error('Failed to load timeline:', error);
            container.innerHTML = '<p>Could not load timeline.</p>';
        }
    }

    async showNotifications() {
        const container = document.getElementById('notifications-list');
        container.innerHTML = 'Loading notifications...';
        try {
            const { data } = await this.app.actions.apiFetch('/api/v1/notifications');
            this.app.state.notifications = data;
            container.innerHTML = '';
            if (data.length === 0) {
                container.innerHTML = '<p>No new notifications.</p>';
                return;
            }
            data.forEach(notification => {
                const item = document.createElement('div');
                item.className = 'notification-item';
                let content = '';
                if (notification.type === 'mention') {
                    content = `<p><strong>${notification.account.display_name}</strong> mentioned you:</p><div class="notification-context">${notification.status.content}</div>`;
                } else if (notification.type === 'favourite') {
                     content = `<p><strong>${notification.account.display_name}</strong> favorited your post.</p>`;
                } else if (notification.type === 'reblog') {
                    content = `<p><strong>${notification.account.display_name}</strong> boosted your post.</p>`;
                } else {
                    content = `<p>New notification of type: ${notification.type}</p>`;
                }
                item.innerHTML = `
                    <img src="${notification.account.avatar}" class="notification-avatar">
                    <div class="notification-content">
                        ${content}
                        <span class="timestamp">${timeSince(new Date(notification.created_at))}</span>
                    </div>
                `;
                container.appendChild(item);
            });
        } catch (error) {
            console.error('Failed to load notifications:', error);
            container.innerHTML = '<p>Could not load notifications.</p>';
        }
    }

    showProfile() {
        if (this.app.state.currentProfile) {
            const { platform, accountId, accountAcct } = this.app.state.currentProfile;
            this.app.actions.showProfilePage(platform, accountId, accountAcct);
        }
    }
    
    async showStatusDetail(statusId) {
        const view = document.getElementById('status-detail-view');
        view.innerHTML = 'Loading post...';
        try {
            const { data: context } = await this.app.actions.apiFetch(`/api/v1/statuses/${statusId}/context`);
            const { data: status } = await this.app.actions.apiFetch(`/api/v1/statuses/${statusId}`);
            view.innerHTML = '';
            
            context.ancestors.forEach(ancestor => view.appendChild(renderStatus(ancestor, this.app.state.currentUser, this.app.actions, this.app.state.settings)));
            
            const mainStatusCard = renderStatus(status, this.app.state.currentUser, this.app.actions, this.app.state.settings);
            mainStatusCard.classList.add('main-thread-post');
            view.appendChild(mainStatusCard);

            context.descendants.forEach(descendant => view.appendChild(renderStatus(descendant, this.app.state.currentUser, this.app.actions, this.app.state.settings)));
        } catch (error) {
            console.error('Failed to render status detail:', error);
            view.innerHTML = '<p>Could not load post details.</p>';
        }
    }

    showEditProfile() {
        const view = document.getElementById('edit-profile-view');
        const user = this.app.state.currentUser;
        if (!user) return;
        
        view.innerHTML = `
            <h3>Edit Profile</h3>
            <div class="form-group">
                <label for="display_name">Display Name</label>
                <input type="text" id="display_name" value="${user.display_name}">
            </div>
            <div class="form-group">
                <label for="note">Bio</label>
                <textarea id="note">${user.note}</textarea>
            </div>
             <button id="save-profile-btn">Save</button>
        `;

        document.getElementById('save-profile-btn').addEventListener('click', async () => {
            const displayName = document.getElementById('display_name').value;
            const note = document.getElementById('note').value;
            try {
                await this.app.actions.apiFetch('/api/v1/accounts/update_credentials', {
                    method: 'PATCH',
                    body: new URLSearchParams({
                        display_name: displayName,
                        note: note
                    })
                });
                this.app.actions.showToast('Profile updated!', 'success');
                const { data } = await this.app.actions.apiFetch('/api/v1/accounts/verify_credentials');
                this.app.state.currentUser = data;
                this.app.router.navigateTo('profile');
            } catch(error) {
                 this.app.actions.showToast('Failed to update profile.', 'error');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
