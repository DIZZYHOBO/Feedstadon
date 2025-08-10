import { getPersistedCredentials, apiFetch } from './components/api.js';
import { showModal, hideModal, showToast, updateCharacterCount } from './components/ui.js';
import { renderStatus } from './components/Post.js';
import { renderNotification } from './components/Notifications.js';
import { renderProfile } from './components/Profile.js';
import { renderLemmyPost } from './components/LemmyPost.js';
import { AppActions } from './actions.js';
import { ICONS } from './components/icons.js';

class App {
    constructor() {
        this.state = {
            currentView: 'login',
            currentParam: null,
            instanceUrl: null,
            accessToken: null,
            currentUser: null,
            currentTimeline: 'home',
            lemmy: { jwt: null, person_id: null },
            settings: {
                lemmySort: 'Hot',
            },
            currentProfile: null, // To store profile data for the router
        };

        document.addEventListener('DOMContentLoaded', () => {
            this.router = new Router(this);
            this.actions = new AppActions(this.state, this);
            this.init();
        });
    }

    init() {
        this.setupDynamicContent();
        this.setupEventListeners();
        this.loadSettings();

        const credentials = getPersistedCredentials();
        if (credentials.instanceUrl && credentials.accessToken) {
            this.state.instanceUrl = credentials.instanceUrl;
            this.state.accessToken = credentials.accessToken;
            this.actions.verifyCredentialsAndLoadApp();
        } else {
            this.router.navigateTo('login');
        }
    }

    setupDynamicContent() {
        document.getElementById('mastodon-login-logo').innerHTML = ICONS.mastodonLogo;
        document.getElementById('lemmy-login-logo').innerHTML = ICONS.lemmyLogo;
        document.getElementById('compose-btn').innerHTML = ICONS.edit;
        document.getElementById('notifications-btn').insertAdjacentHTML('beforeend', ICONS.notifications);
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('feedstadon_settings');
        if (savedSettings) {
            this.state.settings = { ...this.state.settings, ...JSON.parse(savedSettings) };
        }
    }

    saveSettings() {
        localStorage.setItem('feedstadon_settings', JSON.stringify(this.state.settings));
    }
    
    refreshCurrentView() {
        if (this.router) {
            this.router.navigateTo(this.state.currentView, { param: this.state.currentParam, forceReload: true });
        }
    }

    setupEventListeners() {
        document.getElementById('login-form-mastodon').addEventListener('submit', (e) => {
            e.preventDefault();
            this.actions.handleMastodonLogin();
        });

        document.getElementById('login-form-lemmy').addEventListener('submit', (e) => {
            e.preventDefault();
            this.actions.handleLemmyLogin();
        });

        document.getElementById('logout-btn').addEventListener('click', () => this.actions.logout());
        document.getElementById('compose-btn').addEventListener('click', () => showModal('compose-modal'));
        document.querySelector('#compose-modal .close-btn').addEventListener('click', () => hideModal('compose-modal'));
        
        document.getElementById('compose-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.actions.postStatus({ status: document.getElementById('compose-textarea').value });
        });
        
        document.getElementById('compose-textarea').addEventListener('input', updateCharacterCount);
        
        document.querySelectorAll('.timeline-sub-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.state.currentTimeline = e.target.dataset.timeline;
                this.router.navigateTo('home', { forceReload: true });
            });
        });
        
        document.getElementById('lemmy-sort-select').addEventListener('change', (e) => {
            this.state.settings.lemmySort = e.target.value;
            this.saveSettings();
            if (this.state.currentTimeline === 'lemmy') {
                this.refreshCurrentView();
            }
        });
        
        document.getElementById('home-btn').addEventListener('click', () => this.router.navigateTo('home'));
        document.getElementById('notifications-btn').addEventListener('click', () => this.router.navigateTo('notifications'));
    }
}

class Router {
    constructor(app) {
        this.app = app;
        this.routes = {
            'login': this.showLoginView.bind(this),
            'home': this.showHomeTimeline.bind(this),
            'notifications': this.showNotifications.bind(this),
            'profile': this.showProfile.bind(this)
        };
        window.addEventListener('hashchange', () => this.handleRouteChange());
    }

    handleRouteChange() {
        const hash = window.location.hash.substring(1) || 'login';
        const [view, ...params] = hash.split('/');

        if (!this.app.state.accessToken && view !== 'login') {
            this.navigateTo('login');
            return;
        }
        
        this.navigateTo(view, { params });
    }

    navigateTo(view, options = {}) {
        const { params = [], forceReload = false } = options;
        const param = params.join('/'); // Rejoin params for simplicity if needed
        
        if (!forceReload && this.app.state.currentView === view && this.app.state.currentParam === param) {
            return; // Avoid reloading the same view
        }

        document.querySelectorAll('.app-view').forEach(v => v.style.display = 'none');
        document.querySelector('.top-nav').style.display = (view === 'login') ? 'none' : 'flex';

        const routeHandler = this.routes[view];
        if (routeHandler) {
            this.app.state.currentView = view;
            this.app.state.currentParam = param;
            routeHandler(param);
            const viewElement = document.getElementById(`${view}-view`);
            if (viewElement) viewElement.style.display = 'flex';
        } else {
            this.navigateTo('home'); // Fallback to home
        }
    }

    showLoginView() {
        document.getElementById('login-view').style.display = 'flex';
    }

    async showHomeTimeline() {
        document.getElementById('home-view').style.display = 'flex';
        document.getElementById('lemmy-sort-select').value = this.app.state.settings.lemmySort;
        await this.app.actions.fetchTimeline();
    }

    async showNotifications() {
        document.getElementById('notifications-view').style.display = 'flex';
        await this.app.actions.fetchNotifications();
    }

    async showProfile(profileId) {
        document.getElementById('profile-view').style.display = 'flex';
        // The profileId is expected to be in the format 'platform-accountId-accountAcct'
        const [platform, accountId, accountAcct] = profileId.split('-');
        this.app.state.currentProfile = { platform, accountId, accountAcct };
        await this.app.actions.showProfilePage(platform, accountId, accountAcct);
    }
}

new App();
