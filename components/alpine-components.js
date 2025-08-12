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
                        <button class="status-action ${post.saved ? 'active' : ''}" onclick="this.closest('[x-data]').__x.$data.savePost()">${ICONS
