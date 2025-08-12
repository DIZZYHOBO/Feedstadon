// components/components.js - Complete Alpine.js components

// Icons
const icons = {
    refresh: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" /></svg>`,
    notifications: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M6,14A5,5 0 0,0 11,9V15H13V9A5,5 0 0,0 18,14V17H6V14M10,21A2,2 0 0,0 12,23A2,2 0 0,0 14,21H10Z" /></svg>`,
    heart: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.04L12,21.35Z" /></svg>`,
    boost: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6,3A3,3 0 0,1 9,6V10A1,1 0 0,1 8,11H6A1,1 0 0,1 5,10V6A1,1 0 0,1 6,5A1,1 0 0,0 6,3M6,21A3,3 0 0,1 3,18V14A1,1 0 0,1 4,13H6A1,1 0 0,1 7,14V18A1,1 0 0,1 6,19A1,1 0 0,0 6,21M18,3A3,3 0 0,0 15,6V10A1,1 0 0,0 16,11H18A1,1 0 0,0 19,10V6A1,1 0 0,0 18,5A1,1 0 0,1 18,3M18,21A3,3 0 0,0 21,18V14A1,1 0 0,0 20,13H18A1,1 0 0,0 17,14V18A1,1 0 0,0 18,19A1,1 0 0,1 18,21Z" /></svg>`,
    bookmark: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" /></svg>`,
    reply: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M10,9V5L3,12L10,19V14.9C15,14.9 18.5,16.5 21,20C20,15 17,10 10,9Z" /></svg>`,
    more: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>`,
    upvote: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" /></svg>`,
    downvote: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></svg>`,
    comment: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" /></svg>`,
    lemmy: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" /></svg>`,
    mastodon: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21.327 8.566c0-4.339-2.843-5.61-2.843-5.61-1.433-.658-3.894-.935-6.451-.956h-.063c-2.557.021-5.016.298-6.45.956 0 0-2.843 1.272-2.843 5.61 0 .993-.019 2.181.012 3.441.103 4.243.778 8.425 4.701 9.463 1.809.479 3.362.579 4.612.51 2.268-.126 3.541-.809 3.541-.809l-.075-1.646s-1.621.511-3.441.449c-1.804-.062-3.707-.194-3.999-2.409a4.523 4.523 0 0 1-.04-.621s1.77.433 4.014.536c1.372.063 2.658-.08 3.965-.236 2.506-.299 4.688-1.843 4.962-3.254.434-2.223.398-5.424.398-5.424zm-3.353 5.59h-2.081V9.057c0-1.075-.452-1.62-1.357-1.62-1 0-1.501.647-1.501 1.927v2.791h-2.069V9.364c0-1.28-.501-1.927-1.502-1.927-.905 0-1.357.546-1.357 1.62v5.099H6.026V8.903c0-1.074.273-1.927.823-2.558.566-.631 1.307-.955 2.228-.955 1.065 0 1.872.409 2.405 1.228l.518.869.519-.869c.533-.819 1.34-1.228 2.405-1.228.92 0 1.662.324 2.228.955.549.631.822 1.484.822 2.558v5.253z"/></svg>`
};

// Time formatting utility
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

// Main app component
window.app = function() {
    return {
        get $store() {
            return Alpine.store('app');
        },

        init() {
            console.log('App initializing...');
            this.setupRouting();
            this.loadInitialContent();
        },

        setupRouting() {
            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.view) {
                    this.$store.ui.currentView = event.state.view;
                }
            });

            const initialView = location.hash.substring(1) || 'timeline';
            this.$store.ui.currentView = initialView;
            history.replaceState({ view: initialView }, '', `#${initialView}`);
        },

        async loadInitialContent() {
            if (this.$store.isLoggedInToLemmy()) {
                this.$store.ui.currentLemmyFeed = this.$store.settings.defaultFeedType;
                await window.actions.loadLemmyFeed(this.$store.settings.defaultFeedType, this.$store.ui.currentLemmySort);
            } else if (this.$store.isLoggedInToMastodon()) {
                this.$store.ui.currentTimeline = 'home';
                await window.actions.loadMastodonTimeline('home');
            }
        }
    };
};

// Navigation component
window.navigation = function() {
    return {
        icons,

        get $store() {
            return Alpine.store('app');
        },

        get hasUnreadNotifications() {
            return this.$store.notifications.length > 0;
        },

        refresh() {
            if (this.$store.ui.currentLemmyFeed) {
                window.actions.loadLemmyFeed(this.$store.ui.currentLemmyFeed, this.$store.ui.currentLemmySort);
            } else if (this.$store.ui.currentTimeline) {
                window.actions.loadMastodonTimeline(this.$store.ui.currentTimeline);
            } else {
                window.actions.loadMergedFeed();
            }
        },

        setFeed(feedType) {
            this.$store.ui.currentView = 'timeline';
            
            switch (feedType) {
                case 'home':
                    if (this.$store.isLoggedInToLemmy()) {
                        this.$store.ui.currentLemmyFeed = 'Subscribed';
                        this.$store.ui.currentTimeline = null;
                        window.actions.loadLemmyFeed('Subscribed', this.$store.ui.currentLemmySort);
                    } else if (this.$store.isLoggedInToMastodon()) {
                        this.$store.ui.currentTimeline = 'home';
                        this.$store.ui.currentLemmyFeed = null;
                        window.actions.loadMastodonTimeline('home');
                    }
                    break;
                case 'merged':
                    this.$store.ui.currentTimeline = null;
                    this.$store.ui.currentLemmyFeed = null;
                    window.actions.loadMergedFeed();
                    break;
                case 'lemmy':
                    this.$store.ui.currentTimeline = null;
                    this.$store.ui.currentLemmyFeed = 'Subscribed';
                    window.actions.loadLemmyFeed('Subscribed', this.$store.ui.currentLemmySort);
                    break;
                case 'mastodon':
                    this.$store.ui.currentTimeline = 'home';
                    this.$store.ui.currentLemmyFeed = null;
                    window.actions.loadMastodonTimeline('home');
                    break;
            }
        },

        showCompose() {
            window.dispatchEvent(new CustomEvent('compose-modal'));
        },

        showProfile() {
            window.dispatchEvent(new CustomEvent('toast', { detail: 'Profile coming soon!' }));
        },

        showHelp() {
            window.dispatchEvent(new CustomEvent('help-modal'));
        }
    };
};

// Timeline sub-navigation component
window.timelineSubNav = function() {
    return {
        get $store() {
            return Alpine.store('app');
        },

        setLemmyFeed(feedType, sortType = this.$store.ui.currentLemmySort) {
            this.$store.ui.currentLemmyFeed = feedType;
            this.$store.ui.currentLemmySort = sortType;
            window.actions.loadLemmyFeed(feedType, sortType);
        },

        setMastodonTimeline(timelineType) {
            this.$store.ui.currentTimeline = timelineType;
            window.actions.loadMastodonTimeline(timelineType);
        }
    };
};

// Timeline component
window.timeline = function() {
    return {
        icons,

        get $store() {
            return Alpine.store('app');
        },

        get needsLogin() {
            return !this.$store.isLoggedInToAny() && this.$store.posts.length === 0;
        },

        init() {
            console.log('Timeline component initialized');
        },

        getPostKey(post) {
            return post.platform === 'lemmy' ? `lemmy-${post.post.id}` : `mastodon-${post.id}`;
        },

        loadMore() {
            if (this.$store.ui.loadingMore || !this.$store.ui.hasMore) return;
            
            if (this.$store.ui.currentLemmyFeed) {
                window.actions.loadLemmyFeed(this.$store.ui.currentLemmyFeed, this.$store.ui.currentLemmySort, true);
            } else if (this.$store.ui.currentTimeline) {
                window.actions.loadMastodonTimeline(this.$store.ui.currentTimeline, true);
            } else {
                window.actions.loadMergedFeed(true);
            }
        }
    };
};

// Login prompt component
window.loginPrompt = function() {
    return {
        showingLemmyLogin: false,
        showingMastodonLogin: false,
        loggingIn: false,

        lemmy: {
            instance: 'lemmy.world',
            username: '',
            password: ''
        },

        mastodon: {
            instance: '',
            token: ''
        },

        async loginLemmy() {
            if (!this.lemmy.instance || !this.lemmy.username || !this.lemmy.password) {
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Please fill in all fields' }));
                return;
            }

            this.loggingIn = true;
            const success = await window.actions.loginLemmy(this.lemmy.instance, this.lemmy.username, this.lemmy.password);
            
            if (success) {
                this.showingLemmyLogin = false;
                await window.actions.loadLemmyFeed('Subscribed', 'Hot');
            }
            
            this.loggingIn = false;
        },

        async loginMastodon() {
            if (!this.mastodon.instance || !this.mastodon.token) {
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Please fill in all fields' }));
                return;
            }

            this.loggingIn = true;
            const success = await window.actions.loginMastodon(this.mastodon.instance, this.mastodon.token);
            
            if (success) {
                this.showingMastodonLogin = false;
                await window.actions.loadMastodonTimeline('home');
            }
            
            this.loggingIn = false;
        }
    };
};

// Post card component
window.postCard = function(post) {
    return {
        post,
        icons,

        get $store() {
            return Alpine.store('app');
        },

        renderPost() {
            if (this.post.platform === 'lemmy') {
                return this.renderLemmyPost();
            } else {
                return this.renderMastodonPost();
            }
        },

        renderLemmyPost() {
            const post = this.post;
            const converter = new showdown.Converter();
            
            // Process media
            let mediaHTML = '';
            if (post.post.url) {
                if (post.post.thumbnail_url) {
                    mediaHTML = `
                        <div class="status-media">
                            <img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy" style="max-width: 100%; border-radius: 8px;">
                        </div>
                    `;
                }
            }

            // Process body
            const bodyHTML = post.post.body ? converter.makeHtml(post.post.body) : '';

            return `
                <div class="status lemmy-card" data-id="${post.post.id}">
                    <div class="status-body-content">
                        <div class="status-header">
                            <img src="${post.community.icon || './images/php.png'}" 
                                 alt="${post.community.name}" 
                                 class="avatar" 
                                 style="border-radius: 8px; width: 44px; height: 44px;"
                                 onerror="this.src='./images/php.png'">
                            <div style="flex-grow: 1; min-width: 0;">
                                <div class="display-name">${post.community.name}</div>
                                <div class="acct">by ${post.creator.name} · ${timeAgo(post.post.published)}</div>
                            </div>
                            <div class="lemmy-icon">${icons.lemmy}</div>
                        </div>
                        <div class="status-content">
                            <h3 class="lemmy-title" style="margin: 0 0 10px 0; font-size: 1.1em;">${post.post.name}</h3>
                            ${mediaHTML}
                            ${bodyHTML ? `<div class="lemmy-post-body">${bodyHTML}</div>` : ''}
                        </div>
                    </div>
                    <div class="status-footer">
                        <div class="lemmy-vote-cluster" style="display: flex; align-items: center; gap: 8px;">
                            <button class="status-action ${post.my_vote === 1 ? 'active' : ''}" 
                                    onclick="window.postActions.vote('${post.post.id}', 1, this)"
                                    style="color: ${post.my_vote === 1 ? 'var(--accent-color)' : 'inherit'}">
                                ${icons.upvote}
                            </button>
                            <span class="lemmy-score" style="font-weight: bold;">${post.counts.score}</span>
                            <button class="status-action ${post.my_vote === -1 ? 'active' : ''}" 
                                    onclick="window.postActions.vote('${post.post.id}', -1, this)"
                                    style="color: ${post.my_vote === -1 ? 'var(--accent-color)' : 'inherit'}">
                                ${icons.downvote}
                            </button>
                        </div>
                        <button class="status-action" onclick="window.postActions.comment('${post.post.id}')">
                            ${icons.comment} ${post.counts.comments}
                        </button>
                        <button class="status-action ${post.saved ? 'active' : ''}" 
                                onclick="window.postActions.save('${post.post.id}', this)"
                                style="color: ${post.saved ? 'var(--accent-color)' : 'inherit'}">
                            ${icons.bookmark}
                        </button>
                    </div>
                </div>
            `;
        },

        renderMastodonPost() {
            const post = this.post;
            const originalStatus = post.reblog || post;
            
            const reblogHeader = post.reblog ? `
                <div class="reblog-header" style="padding: 10px 20px; color: var(--font-color-muted); font-size: 0.9em;">
                    ${icons.boost} ${post.account.display_name} boosted
                </div>
            ` : '';

            let mediaHTML = '';
            if (originalStatus.media_attachments && originalStatus.media_attachments.length > 0) {
                mediaHTML = '<div class="status-media" style="margin-top: 10px;">';
                originalStatus.media_attachments.forEach(media => {
                    if (media.type === 'image') {
                        mediaHTML += `<img src="${media.preview_url}" alt="${media.description || 'Media'}" loading="lazy" style="max-width: 100%; border-radius: 8px;">`;
                    }
                });
                mediaHTML += '</div>';
            }

            return `
                <div class="status mastodon-card" data-id="${originalStatus.id}">
                    ${reblogHeader}
                    <div class="status-body-content">
                        <div class="status-header">
                            <img src="${originalStatus.account.avatar_static}" 
                                 alt="${originalStatus.account.display_name}" 
                                 class="avatar" 
                                 style="border-radius: 50%; width: 44px; height: 44px;">
                            <div style="flex-grow: 1; min-width: 0;">
                                <div class="display-name">${originalStatus.account.display_name}</div>
                                <div class="acct">@${originalStatus.account.acct} · ${timeAgo(originalStatus.created_at)}</div>
                            </div>
                            <div class="mastodon-icon">${icons.mastodon}</div>
                        </div>
                        <div class="status-content">
                            ${originalStatus.content}
                            ${mediaHTML}
                        </div>
                    </div>
                    <div class="status-footer">
                        <button class="status-action" onclick="window.postActions.reply('${originalStatus.id}')">
                            ${icons.reply}
                        </button>
                        <button class="status-action ${post.reblogged ? 'active' : ''}" 
                                onclick="window.postActions.boost('${originalStatus.id}', this)"
                                style="color: ${post.reblogged ? 'var(--accent-color)' : 'inherit'}">
                            ${icons.boost} ${originalStatus.reblogs_count || 0}
                        </button>
                        <button class="status-action ${post.favourited ? 'active' : ''}" 
                                onclick="window.postActions.favorite('${originalStatus.id}', this)"
                                style="color: ${post.favourited ? 'var(--accent-color)' : 'inherit'}">
                            ${icons.heart} ${originalStatus.favourites_count || 0}
                        </button>
                        <button class="status-action ${post.bookmarked ? 'active' : ''}" 
                                onclick="window.postActions.bookmark('${originalStatus.id}', this)"
                                style="color: ${post.bookmarked ? 'var(--accent-color)' : 'inherit'}">
                            ${icons.bookmark}
                        </button>
                    </div>
                </div>
            `;
        }
    };
};

// Settings component
window.settings = function() {
    return {
        get $store() {
            return Alpine.store('app');
        },

        init() {
            console.log('Settings component initialized');
        },

        setTheme(theme) {
            this.$store.setTheme(theme);
        },

        isLoggedInToLemmy() {
            return this.$store.isLoggedInToLemmy();
        },

        isLoggedInToMastodon() {
            return this.$store.isLoggedInToMastodon();
        },

        logoutLemmy() {
            window.actions.logoutLemmy();
        },

        logoutMastodon() {
            window.actions.logoutMastodon();
        }
    };
};

// Discover component
window.discover = function() {
    return {
        get $store() {
            return Alpine.store('app');
        },

        init() {
            console.log('Discover component initialized');
        }
    };
};

// Global post actions
window.postActions = {
    async vote(postId, score, button) {
        const success = await window.actions.lemmyVote(parseInt(postId), score);
        if (success) {
            // Update UI immediately
            const post = Alpine.store('app').findPost('lemmy', parseInt(postId));
            if (post) {
                // Update vote buttons
                const card = button.closest('.status');
                const upBtn = card.querySelector('[onclick*="1,"]');
                const downBtn = card.querySelector('[onclick*="-1,"]');
                const scoreSpan = card.querySelector('.lemmy-score');
                
                upBtn.classList.toggle('active', post.my_vote === 1);
                downBtn.classList.toggle('active', post.my_vote === -1);
                upBtn.style.color = post.my_vote === 1 ? 'var(--accent-color)' : 'inherit';
                downBtn.style.color = post.my_vote === -1 ? 'var(--accent-color)' : 'inherit';
                scoreSpan.textContent = post.counts.score;
            }
        }
    },

    async save(postId, button) {
        const post = Alpine.store('app').findPost('lemmy', parseInt(postId));
        const currentlySaved = post?.saved || false;
        
        const success = await window.actions.lemmySave(parseInt(postId), !currentlySaved);
        if (success && post) {
            button.classList.toggle('active', post.saved);
            button.style.color = post.saved ? 'var(--accent-color)' : 'inherit';
        }
    },

    async favorite(statusId, button) {
        const post = Alpine.store('app').findPost('mastodon', statusId);
        const currentlyFavorited = post?.favourited || false;
        
        const success = await window.actions.mastodonFavorite(statusId, !currentlyFavorited);
        if (success && post) {
            button.classList.toggle('active', post.favourited);
            button.style.color = post.favourited ? 'var(--accent-color)' : 'inherit';
            const countSpan = button.querySelector('span') || button.lastChild;
            if (countSpan && countSpan.nodeType === Node.TEXT_NODE) {
                countSpan.textContent = ` ${post.favourites_count || 0}`;
            }
        }
    },

    async boost(statusId, button) {
        const post = Alpine.store('app').findPost('mastodon', statusId);
        const currentlyBoosted = post?.reblogged || false;
        
        const success = await window.actions.mastodonBoost(statusId, !currentlyBoosted);
        if (success && post) {
            button.classList.toggle('active', post.reblogged);
            button.style.color = post.reblogged ? 'var(--accent-color)' : 'inherit';
            const countSpan = button.querySelector('span') || button.lastChild;
            if (countSpan && countSpan.nodeType === Node.TEXT_NODE) {
                countSpan.textContent = ` ${post.reblogs_count || 0}`;
            }
        }
    },

    comment(postId) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Comments coming soon!' }));
    },

    reply(statusId) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Replies coming soon!' }));
    },

    bookmark(statusId, button) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Bookmarks coming soon!' }));
    }
};

console.log('Components loaded successfully');
