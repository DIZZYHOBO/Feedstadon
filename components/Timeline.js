// components/alpine-components.js - All Alpine component definitions
import { store } from './store.js';
import { actions } from './actions.js';
import { ICONS } from './icons.js';
import { timeAgo, formatTimestamp, processSpoilers } from './utils.js';
import { showImageModal, showToast } from './ui.js';

// Timeline Component
window.timelineComponent = function() {
    return {
        needsLogin: false,

        init() {
            // Auto-load feed when timeline becomes active
            Alpine.effect(() => {
                if (store.ui.currentView === 'timeline') {
                    this.loadCurrentFeed();
                }
            });

            // Check if we need to show login prompt
            this.checkLoginStatus();
        },

        checkLoginStatus() {
            const hasAuth = store.auth.mastodon.accessToken || store.auth.lemmy.jwt;
            this.needsLogin = !hasAuth && store.posts.length === 0;
        },

        loadCurrentFeed() {
            if (store.ui.currentTimeline) {
                actions.loadTimeline(store.ui.currentTimeline);
            } else if (store.ui.currentLemmyFeed) {
                actions.loadLemmyFeed(store.ui.currentLemmyFeed, store.ui.currentLemmySort);
            } else if (!store.ui.currentTimeline && !store.ui.currentLemmyFeed) {
                // This is the merged feed case
                actions.loadMergedFeed();
            }
        },

        loadMore() {
            if (store.ui.loadingMore || !store.ui.hasMore) return;
            
            if (store.ui.currentTimeline) {
                actions.loadTimeline(store.ui.currentTimeline, true);
            } else if (store.ui.currentLemmyFeed) {
                actions.loadLemmyFeed(store.ui.currentLemmyFeed, store.ui.currentLemmySort, true);
            } else {
                actions.loadMergedFeed(true);
            }
        },

        getPostKey(post) {
            return post.platform === 'lemmy' ? `lemmy-${post.post.id}` : `mastodon-${post.id}`;
        }
    };
};

// Post Component
window.postComponent = function(post, index) {
    return {
        post,
        index,
        showingReply: false,
        replyText: '',

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
            
            let mediaHTML = '';
            const url = post.post.url;
            if (url) {
                const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
                const youtubeMatch = url.match(youtubeRegex);

                if (youtubeMatch) {
                    mediaHTML = `
                        <div class="video-embed-container">
                            <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>
                        </div>
                    `;
                } else if (/\.(mp4|webm)$/i.test(url)) {
                    mediaHTML = `<div class="status-media"><video src="${url}" controls></video></div>`;
                } else if (post.post.thumbnail_url) {
                    mediaHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy" onclick="showImageModal('${url}')" style="cursor: pointer;"></div>`;
                }
            }

            const processedBody = processSpoilers(post.post.body || '');
            const bodyHTML = post.post.body ? converter.makeHtml(processedBody) : '';

            return `
                <div class="status lemmy-card" data-id="${post.post.id}">
                    <div class="status-body-content">
                        <div class="status-header">
                            <a href="#" class="status-header-main" onclick="actions.showLemmyCommunity('${post.community.name}@${new URL(post.community.actor_id).hostname}')">
                                <img src="${post.community.icon || './images/php.png'}" alt="${post.community.name} icon" class="avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                                <div>
                                    <span class="display-name">${post.community.name}</span>
                                    <span class="acct">posted by <span onclick="actions.showLemmyProfile('${post.creator.name}@${new URL(post.creator.actor_id).hostname}')" style="cursor: pointer;">${post.creator.name}</span> · ${formatTimestamp(post.post.published)}</span>
                                </div>
                            </a>
                            <div class="status-header-side">
                                <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                            </div>
                        </div>
                        <div class="status-content">
                            <h3 class="lemmy-title" ondblclick="actions.showLemmyPostDetail(${JSON.stringify(post).replace(/"/g, '&quot;')})">${post.post.name}</h3>
                            ${mediaHTML}
                            <div class="lemmy-post-body">${bodyHTML}</div>
                        </div>
                    </div>
                    <div class="status-footer">
                        <div class="lemmy-vote-cluster">
                            <button class="status-action lemmy-vote-btn ${post.my_vote === 1 ? 'active' : ''}" 
                                    onclick="this.closest('[x-data]').__x.$data.vote(1)">${ICONS.lemmyUpvote}</button>
                            <span class="lemmy-score">${post.counts.score}</span>
                            <button class="status-action lemmy-vote-btn ${post.my_vote === -1 ? 'active' : ''}" 
                                    onclick="this.closest('[x-data]').__x.$data.vote(-1)">${ICONS.lemmyDownvote}</button>
                        </div>
                        <button class="status-action" onclick="this.closest('[x-data]').__x.$data.toggleReply()">${ICONS.reply}</button>
                        <button class="status-action" onclick="actions.showLemmyPostDetail(${JSON.stringify(post).replace(/"/g, '&quot;')})">${ICONS.comments} ${post.counts.comments}</button>
                        <button class="status-action ${post.saved ? 'active' : ''}" onclick="this.closest('[x-data]').__x.$data.savePost()">${ICONS.bookmark}</button>
                    </div>
                    ${this.showingReply ? `
                        <div class="quick-reply-container" style="display: block;">
                            <div class="quick-reply-box">
                                <textarea placeholder="Add a comment..." onchange="this.closest('[x-data]').__x.$data.replyText = this.value">${this.replyText}</textarea>
                                <button class="button-primary" onclick="this.closest('[x-data]').__x.$data.postReply()">Post</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        renderMastodonPost() {
            const post = this.post;
            const originalStatus = post.reblog || post;
            
            const reblogHeader = post.reblog ? `
                <div class="reblog-header">
                    ${ICONS.boost} ${post.account.display_name || post.account.username} boosted
                </div>
            ` : '';

            let mediaHTML = '';
            if (originalStatus.media_attachments.length > 0) {
                mediaHTML = '<div class="status-media">';
                originalStatus.media_attachments.forEach(media => {
                    if (media.type === 'image') {
                        mediaHTML += `<img src="${media.preview_url}" alt="${media.description || 'Status media'}" loading="lazy" onclick="showImageModal('${media.url}')" style="cursor: pointer;">`;
                    } else if (media.type === 'video' || media.type === 'gifv') {
                        mediaHTML += `<video src="${media.url}" controls ${media.type === 'gifv' ? 'autoplay loop muted' : ''}></video>`;
                    }
                });
                mediaHTML += '</div>';
            }

            const spoilerText = originalStatus.spoiler_text;
            const hasSpoiler = spoilerText && spoilerText.trim().length > 0;

            return `
                <div class="status" data-id="${originalStatus.id}">
                    ${reblogHeader}
                    <div class="status-body-content">
                        <div class="status-header">
                            <a href="#" class="status-header-main" onclick="actions.showProfilePage('mastodon', '${originalStatus.account.id}', '${originalStatus.account.acct}')">
                                <img src="${originalStatus.account.avatar_static}" alt="${originalStatus.account.display_name}'s avatar" class="avatar">
                                <div>
                                    <span class="display-name">${originalStatus.account.display_name}</span>
                                    <span class="acct">@${originalStatus.account.acct}</span>
                                </div>
                            </a>
                            <div class="status-header-side">
                                <a href="${originalStatus.url}" target="_blank" class="timestamp" title="${formatTimestamp(originalStatus.created_at)}">${timeAgo(originalStatus.created_at)}</a>
                                <div class="mastodon-icon-indicator">${ICONS.mastodon}</div>
                            </div>
                        </div>
                        <div class="status-content" ondblclick="actions.showStatusDetail('${originalStatus.id}')">
                            ${hasSpoiler ? `<p class="spoiler-text">${spoilerText} <button class="spoiler-toggle" onclick="this.closest('[x-data]').__x.$data.toggleSpoiler(this)">Show</button></p>` : ''}
                            <div class="status-text ${hasSpoiler ? 'spoiler' : ''}">${originalStatus.content}</div>
                        </div>
                        ${mediaHTML}
                    </div>
                    <div class="status-footer">
                        <button class="status-action" onclick="this.closest('[x-data]').__x.$data.toggleReply()">${ICONS.reply}</button>
                        <button class="status-action ${post.reblogged ? 'active' : ''}" onclick="this.closest('[x-data]').__x.$data.boost()">
                            ${ICONS.boost}<span>${originalStatus.reblogs_count || 0}</span>
                        </button>
                        <button class="status-action ${post.favourited ? 'active' : ''}" onclick="this.closest('[x-data]').__x.$data.favorite()">
                            ${ICONS.favorite}<span>${originalStatus.favourites_count || 0}</span>
                        </button>
                        <button class="status-action ${post.bookmarked ? 'active' : ''}" onclick="this.closest('[x-data]').__x.$data.bookmark()">${ICONS.bookmark}</button>
                    </div>
                    ${this.showingReply ? `
                        <div class="reply-container" style="display: block;">
                            <div class="quick-reply-box">
                                <textarea placeholder="Reply..." onchange="this.closest('[x-data]').__x.$data.replyText = this.value">@${originalStatus.account.acct} ${this.replyText}</textarea>
                                <button class="button-primary" onclick="this.closest('[x-data]').__x.$data.postReply()">Reply</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        async vote(score) {
            if (this.post.platform !== 'lemmy') return;
            
            try {
                await actions.lemmyVote(this.post.post.id, score);
                
                // Update local state immediately for responsive UI
                const currentVote = this.post.my_vote || 0;
                const scoreDiff = score - currentVote;
                this.post.my_vote = score;
                this.post.counts.score += scoreDiff;
                
                // Update the post in the store
                const storePost = store.posts.find(p => p.post?.id === this.post.post.id);
                if (storePost) {
                    storePost.my_vote = score;
                    storePost.counts.score = this.post.counts.score;
                }
            } catch (error) {
                showToast('Failed to vote on post');
            }
        },

        async savePost() {
            if (this.post.platform !== 'lemmy') return;
            
            try {
                await actions.lemmySave(this.post.post.id, !this.post.saved);
                this.post.saved = !this.post.saved;
                
                // Update the post in the store
                const storePost = store.posts.find(p => p.post?.id === this.post.post.id);
                if (storePost) {
                    storePost.saved = this.post.saved;
                }
            } catch (error) {
                showToast('Failed to save post');
            }
        },

        async favorite() {
            if (this.post.platform !== 'mastodon') return;
            
            try {
                await actions.toggleMastodonAction('favorite', this.post.id, !this.post.favourited);
                this.post.favourited = !this.post.favourited;
                this.post.favourites_count += this.post.favourited ? 1 : -1;
                
                // Update the post in the store
                const storePost = store.posts.find(p => p.id === this.post.id);
                if (storePost) {
                    storePost.favourited = this.post.favourited;
                    storePost.favourites_count = this.post.favourites_count;
                }
            } catch (error) {
                showToast('Failed to favorite post');
            }
        },

        async boost() {
            if (this.post.platform !== 'mastodon') return;
            
            try {
                await actions.toggleMastodonAction('reblog', this.post.id, !this.post.reblogged);
                this.post.reblogged = !this.post.reblogged;
                this.post.reblogs_count += this.post.reblogged ? 1 : -1;
                
                // Update the post in the store
                const storePost = store.posts.find(p => p.id === this.post.id);
                if (storePost) {
                    storePost.reblogged = this.post.reblogged;
                    storePost.reblogs_count = this.post.reblogs_count;
                }
            } catch (error) {
                showToast('Failed to boost post');
            }
        },

        async bookmark() {
            if (this.post.platform !== 'mastodon') return;
            
            try {
                await actions.toggleMastodonAction('bookmark', this.post.id, !this.post.bookmarked);
                this.post.bookmarked = !this.post.bookmarked;
                
                // Update the post in the store
                const storePost = store.posts.find(p => p.id === this.post.id);
                if (storePost) {
                    storePost.bookmarked = this.post.bookmarked;
                }
            } catch (error) {
                showToast('Failed to bookmark post');
            }
        },

        toggleReply() {
            this.showingReply = !this.showingReply;
            if (this.showingReply && this.post.platform === 'mastodon') {
                this.replyText = `@${this.post.account.acct} `;
            }
        },

        async postReply() {
            if (!this.replyText.trim()) return;
            
            try {
                if (this.post.platform === 'lemmy') {
                    await actions.lemmyPostComment({
                        content: this.replyText,
                        post_id: this.post.post.id
                    });
                } else {
                    await actions.postMastodonStatus({
                        status: this.replyText,
                        in_reply_to_id: this.post.id
                    });
                }
                
                this.replyText = '';
                this.showingReply = false;
                showToast('Reply posted!');
            } catch (error) {
                showToast('Failed to post reply');
            }
        },

        toggleSpoiler(button) {
            const content = button.closest('.status-content').querySelector('.status-text');
            content.classList.toggle('spoiler');
            button.textContent = content.classList.contains('spoiler') ? 'Show' : 'Hide';
        }
    };
};

// Login Prompt Component
window.loginPromptComponent = function() {
    return {
        showingMastodonLogin: false,
        showingLemmyLogin: false,
        
        mastodonInstance: '',
        mastodonToken: '',
        
        lemmyInstance: '',
        lemmyUsername: '',
        lemmyPassword: '',

        showMastodonLogin() {
            this.showingMastodonLogin = true;
            this.showingLemmyLogin = false;
        },

        showLemmyLogin() {
            this.showingLemmyLogin = true;
            this.showingMastodonLogin = false;
        },

        async loginMastodon() {
            if (!this.mastodonInstance || !this.mastodonToken) {
                showToast('Please fill in all fields');
                return;
            }

            const success = await actions.loginMastodon(this.mastodonInstance, this.mastodonToken);
            if (success) {
                this.showingMastodonLogin = false;
                showToast('Mastodon login successful!');
                // Refresh timeline
                if (store.ui.currentTimeline) {
                    actions.loadTimeline(store.ui.currentTimeline);
                }
            } else {
                showToast('Mastodon login failed');
            }
        },

        async loginLemmy() {
            if (!this.lemmyInstance || !this.lemmyUsername || !this.lemmyPassword) {
                showToast('Please fill in all fields');
                return;
            }

            const success = await actions.loginLemmy(this.lemmyInstance, this.lemmyUsername, this.lemmyPassword);
            if (success) {
                this.showingLemmyLogin = false;
                showToast('Lemmy login successful!');
                // Refresh timeline
                if (store.ui.currentLemmyFeed) {
                    actions.loadLemmyFeed(store.ui.currentLemmyFeed, store.ui.currentLemmySort);
                }
            } else {
                showToast('Lemmy login failed');
            }
        }
    };
};

// Global functions for inline onclick handlers
window.showImageModal = showImageModal;
window.showToast = showToast;
