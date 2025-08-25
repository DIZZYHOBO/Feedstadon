import { fetchTimeline } from './components/Timeline.js';
import { renderProfilePage, renderEditProfilePage, loadMoreLemmyProfile } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail, renderStatus } from './components/Post.js';
import { initComposeModal, showComposeModal, showComposeModalWithReply } from './components/Compose.js';
import { fetchLemmyFeed, renderLemmyCard } from './components/Lemmy.js';
import { renderLemmyPostPage, renderPublicLemmyPostPage } from './components/LemmyPost.js';
import { renderLemmyCommentThreadPage } from './components/LemmyComments.js';
import { renderLemmyCommunityPage } from './components/LemmyCommunity.js';
import { renderMergedPostPage, fetchMergedTimeline } from './components/MergedPost.js';
import { renderNotificationsPage, updateNotificationBell } from './components/Notifications.js';
import { renderDiscoverPage, loadMoreLemmyCommunities, loadMoreMastodonTrendingPosts } from './components/Discover.js';
import { renderScreenshotPage } from './components/Screenshot.js';
import { ICONS } from './components/icons.js';
import { apiFetch, lemmyImageUpload, apiUploadMedia, detectInstanceType } from './components/api.js';
import { showLoadingBar, hideLoadingBar, initImageModal, renderLoginPrompt, showToast, showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from './components/ui.js';
import { renderLoopsProfilePage } from './components/Loops.js';
import { shareService } from './components/ShareService.js';
import { renderShareView } from './components/ShareView.js';
import { renderBlogFeed, renderBlogPostPage, renderCreateBlogPostPage, renderEditBlogPostPage } from './components/Blog.js';

function initDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('button');
        if (button) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown.active').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                dropdown.classList.toggle('active');
            });
        }
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.active').forEach(d => {
            d.classList.remove('active');
        });
    });
}

function initPullToRefresh(state, actions) {
    const ptrIndicator = document.getElementById('pull-to-refresh-indicator');
    let startY = 0;
    let isPulling = false;

    document.body.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].pageY;
            isPulling = true;
        }
    });

    document.body.addEventListener('touchmove', (e) => {
        if (!isPulling) return;

        const currentY = e.touches[0].pageY;
        const diffY = currentY - startY;

        if (diffY > 0) {
            e.preventDefault();
            ptrIndicator.style.transform = `translateY(${Math.min(diffY, 100) - 50}px)`;
        }
    });

    document.body.addEventListener('touchend', (e) => {
        if (!isPulling) return;
        isPulling = false;
        
        const currentY = e.changedTouches[0].pageY;
        const diffY = currentY - startY;

        ptrIndicator.style.transform = 'translateY(-150%)';

        if (diffY > 80) { // Threshold to trigger refresh
            if (state.currentView === 'timeline') {
                if (state.currentTimeline) {
                    actions.showHomeTimeline();
                } else if (state.currentLemmyFeed) {
                    actions.showLemmyFeed(state.currentLemmyFeed);
                }
            } else if (state.currentView === 'notifications') {
                actions.showNotifications();
            } else if (state.currentView === 'blog') {
                actions.showBlogFeed();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Handle short URLs for sharing - check both pathname and hash
    const path = window.location.pathname;
    const hash = window.location.hash;
    const shortUrlPattern = /^\/f\/([a-zA-Z0-9]+)$/;
    const hashPattern = /^#f\/([a-zA-Z0-9]+)$/;
    
    let shortId = null;
    let match = path.match(shortUrlPattern);
    if (match) {
        shortId = match[1];
    } else {
        // Also check hash for client-side routing
        match = hash.match(hashPattern);
        if (match) {
            shortId = match[1];
        }
    }
    
    if (shortId) {
        const mapping = shareService.resolveShortId(shortId);
        
        if (mapping) {
            // Hide the main app completely
            const appView = document.getElementById('app-view');
            if (appView) appView.style.display = 'none';
            
            // Hide navigation
            const topNav = document.querySelector('.top-nav');
            if (topNav) topNav.style.display = 'none';
            
            // Clear body and add share view mode
            document.body.classList.add('share-view-mode');
            
            // Create and render share view
            try {
                const shareView = await renderShareView(shortId, mapping);
                document.body.innerHTML = ''; // Clear everything
                document.body.appendChild(shareView);
            } catch (error) {
                console.error('Error rendering share view:', error);
                document.body.innerHTML = `
                    <div class="share-error-view" style="padding: 40px; text-align: center;">
                        <h2>Error Loading Content</h2>
                        <p>There was an error loading this shared content.</p>
                        <button onclick="window.location.href='/'">Visit Feedstodon</button>
                    </div>
                `;
            }
            
            // Don't initialize the rest of the app
            return;
        } else {
            // Short URL not found
            document.body.innerHTML = `
                <div class="share-error-view" style="padding: 40px; text-align: center;">
                    <h2>Link Not Found</h2>
                    <p>This share link may have expired or is invalid.</p>
                    <button onclick="window.location.href='/'">Visit Feedstodon</button>
                </div>
            `;
            return;
        }
    }

    // Apply saved theme on startup
    const savedTheme = localStorage.getItem('feedstodon-theme') || 'feedstodon';
    document.body.dataset.theme = savedTheme;

    // Setup UI Elements
    const notificationsBtn = document.getElementById('notifications-btn');
    notificationsBtn.innerHTML = ICONS.notifications + '<div class="notification-dot"></div>';
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.innerHTML = ICONS.refresh;
    const refreshSpinner = document.getElementById('refresh-spinner');
    refreshSpinner.innerHTML = ICONS.refresh;

    const state = {
        history: [],
        instanceUrl: localStorage.getItem('fediverse-instance') || null,
        accessToken: localStorage.getItem('fediverse-token') || null,
        currentUser: null,
        lemmyUsername: localStorage.getItem('lemmy_username') || null,
        currentView: null,
        currentProfileTab: 'lemmy',
        currentTimeline: 'home',
        currentLemmyFeed: null,
        currentLemmySort: localStorage.getItem('lemmySortType') || 'New',
        currentDiscoverTab: 'lemmy',
        timelineDiv: document.getElementById('timeline'),
        scrollLoader: document.getElementById('scroll-loader'),
        isLoadingMore: false,
        nextPageUrl: null,
        lemmyPage: 1,
        lemmyHasMore: true,
        lemmyProfilePage: 1,
        lemmyProfileHasMore: true,
        mastodonTrendingPage: 1,
        mastodonTrendingHasMore: true,
        conversations: [],
        lemmyInstances: ['lemmy.world', 'lemmy.ml', 'sh.itjust.works', 'leminal.space'],
        settings: {
            hideNsfw: false,
        },
        actions: {},
        currentPostView: null,
        // Blog state
        blogPage: 1,
        blogHasMore: true,
        currentBlogFeed: null,
        blogAuth: localStorage.getItem('blog-auth') || null,
        blogUsername: localStorage.getItem('blog-username') || null,
        currentBlogPost: null
    };

    const views = {
        app: document.getElementById('app-view'),
        timeline: document.getElementById('timeline'),
        notifications: document.getElementById('notifications-view'),
        discover: document.getElementById('discover-view'),
        screenshot: document.getElementById('screenshot-view'),
        mergedPost: document.getElementById('merged-post-view'),
        profile: document.getElementById('profile-page-view'),
        editProfile: document.getElementById('edit-profile-view'),
        search: document.getElementById('search-results-view'),
        settings: document.getElementById('settings-view'),
        statusDetail: document.getElementById('status-detail-view'),
        lemmyPost: document.getElementById('lemmy-post-view'),
        lemmyComments: document.getElementById('lemmy-comments-view'),
        lemmyCommunity: document.getElementById('lemmy-community-view'),
        blog: document.getElementById('blog-feed-view'),
        blogPost: document.getElementById('blog-post-view'),
        createBlogPost: document.getElementById('blog-composer-view'),
        editBlogPost: document.getElementById('blog-composer-view')
    };
    
    // --- Global Context Menu ---
    const contextMenu = document.getElementById('context-menu');
    const showContextMenu = (e, items) => {
        e.preventDefault();
        e.stopPropagation();
        contextMenu.innerHTML = '';
        items.forEach(item => {
            const button = document.createElement('button');
            button.innerHTML = item.label;
            button.onclick = (event) => {
                event.stopPropagation();
                item.action();
                hideContextMenu();
            };
            contextMenu.appendChild(button);
        });
        contextMenu.style.display = 'block';
        const pageX = e.touches ? e.touches[0].pageX : e.pageX;
        const pageY = e.touches ? e.touches[0].pageY : e.pageY;
        contextMenu.style.left = `${pageX}px`;
        contextMenu.style.top = `${pageY}px`;
    };
    const hideContextMenu = () => {
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    };
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', (e) => {
        // Hide if clicking outside a valid target
        if (!e.target.closest('.status')) {
            hideContextMenu();
        }
    });

    async function verifyUserCredentials() {
        if (state.instanceUrl && state.accessToken) {
            try {
                const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
                state.currentUser = account;
            } catch (error) {
                console.error("Token verification failed:", error);
                // Clear invalid token
                localStorage.removeItem('fediverse-instance');
                localStorage.removeItem('fediverse-token');
                state.instanceUrl = null;
                state.accessToken = null;
            }
        }
    }

    const switchView = (viewName, pushToHistory = true) => {
        if (state.currentView === viewName && viewName !== 'notifications') return;

        if (pushToHistory) {
            history.pushState({view: viewName}, '', `#${viewName}`);
        }
        state.currentView = viewName;
        window.scrollTo(0, 0);

        Object.keys(views).forEach(key => {
            if (views[key] && views[key].style) {
                views[key].style.display = 'none';
            }
        });
        
        // Hide sub-nav by default on every view change
        document.getElementById('timeline-sub-nav').style.display = 'none';
        
        document.querySelector('.top-nav').style.display = 'flex';
        views.app.style.display = 'block';
        if (views[viewName]) {
            views[viewName].style.display = 'flex';
        }
    };
    
    const renderTimelineSubNav = (platform) => {
        const subNavContainer = document.getElementById('timeline-sub-nav');
        subNavContainer.innerHTML = '';
        if (!platform) {
            subNavContainer.style.display = 'none';
            return;
        }

        let items = [];
        let currentFeed = '';
        const tabs = document.createElement('div');
        tabs.className = 'timeline-sub-nav-tabs';

        if (platform === 'lemmy') {
            items = [
                { label: 'Subbed', feed: 'Subscribed' },
                { label: 'All', feed: 'All' },
                { label: 'Local', feed: 'Local' }
            ];
            currentFeed = state.currentLemmyFeed;
        } else if (platform === 'mastodon') {
             items = [
                { label: 'Subbed', feed: 'home' },
                { label: 'All', feed: 'public' },
                { label: 'Local', feed: 'public?local=true' }
            ];
            currentFeed = state.currentTimeline;
        }

        items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'timeline-sub-nav-btn';
            button.textContent = item.label;
            if (item.feed === currentFeed) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                if (platform === 'lemmy') {
                    actions.showLemmyFeed(item.feed);
                } else {
                    actions.showMastodonTimeline(item.feed);
                }
            });
            tabs.appendChild(button);
        });
        
        subNavContainer.appendChild(tabs);

        if (platform === 'lemmy') {
            const filterContainer = document.createElement('div');
            filterContainer.id = 'lemmy-filter-container';
            filterContainer.innerHTML = `
                 <select id="lemmy-sort-select">
                    <option value="New">New</option>
                    <option value="Active">Active</option>
                    <option value="Hot">Hot</option>
                    <option value="TopHour">Top Hour</option>
                    <option value="TopSixHour">Top Six Hour</option>
                    <option value="TopTwelveHour">Top Twelve Hour</option>
                    <option value="TopDay">Top Day</option>
                </select>
            `;
            filterContainer.querySelector('#lemmy-sort-select').value = state.currentLemmySort;
            filterContainer.querySelector('#lemmy-sort-select').addEventListener('change', (e) => {
                actions.showLemmyFeed(state.currentLemmyFeed, e.target.value);
            });
            subNavContainer.appendChild(filterContainer);
        }
        
        subNavContainer.style.display = 'flex';
    };

    const actions = {
        showProfilePage: (platform, accountId = null, userAcct = null) => {
            showLoadingBar();
            switchView('profile');
            renderProfilePage(state, actions, platform, accountId, userAcct);
            hideLoadingBar();
        },
        showLemmyProfile: (userAcct) => {
             actions.showProfilePage('lemmy', null, userAcct);
        },
        showEditProfile: () => {
            switchView('editProfile');
            renderEditProfilePage(state, actions);
        },
        showStatusDetail: async (statusId) => {
            showLoadingBar();
            switchView('statusDetail');
            await renderStatusDetail(state, statusId, actions);
            hideLoadingBar();
        },
        showHashtagTimeline: async (tagName) => {
            showLoadingBar();
            switchView('search');
            await renderSearchResults(state, `#${tagName}`);
            hideLoadingBar();
        },
      showSettings: async () => {
            switchView('settings');
            await renderSettingsPage(state);
        },
        showNotifications: async () => {
            showLoadingBar();
            switchView('notifications');
            await renderNotificationsPage(state, actions);
            hideLoadingBar();
        },
         showDiscoverPage: async () => {
            showLoadingBar();
            switchView('discover');
            await renderDiscoverPage(state, actions);
            hideLoadingBar();
        },
         showScreenshotPage: async (commentView, postView) => {
            showLoadingBar();
            switchView('screenshot');
            await renderScreenshotPage(state, commentView, postView, actions);
            hideLoadingBar();
        },
        showLemmyPostDetail: async (post) => {
            showLoadingBar();
            switchView('lemmyPost');
            await renderLemmyPostPage(state, post, actions);
            hideLoadingBar();
        },
        showLemmyCommentThread: async (postView, rootCommentId, viewType = 'replies') => {
            console.log('showLemmyCommentThread action called with:', postView, rootCommentId, viewType);
            showLoadingBar();
            switchView('lemmyComments');
            await renderLemmyCommentThreadPage(state, actions, postView, rootCommentId, viewType);
            hideLoadingBar();
        },
        showPublicLemmyPost: async (postView, instance) => {
            showLoadingBar();
            switchView('lemmyPost');
            await renderPublicLemmyPostPage(state, postView, actions, instance);
            hideLoadingBar();
        },
       showLemmyCommunity: async (communityName) => {
            const view = document.getElementById('app-view');
            await renderLemmyCommunityPage(view, communityName); // Pass communityName, not actions!
        },
        showMergedPost: async (post) => {
            showLoadingBar();
            switchView('mergedPost');
            await renderMergedPostPage(state, post, actions);
            hideLoadingBar();
        },
         showLemmyFeed: async (feedType, sortType = state.currentLemmySort) => {
            showLoadingBar();
            refreshSpinner.style.display = 'block';
            state.currentLemmyFeed = feedType;
            state.currentTimeline = null;
            state.currentLemmySort = sortType;
            switchView('timeline');
            renderTimelineSubNav('lemmy');
            await fetchLemmyFeed(state, actions, false, onLemmyLoginSuccess);
            hideLoadingBar();
            refreshSpinner.style.display = 'none';
        },
        showMastodonTimeline: async (timelineType) => {
            showLoadingBar();
            refreshSpinner.style.display = 'block';
            state.currentLemmyFeed = null;
            state.currentTimeline = timelineType;
            switchView('timeline');
            renderTimelineSubNav('mastodon');
            await fetchTimeline(state, actions, false, onMastodonLoginSuccess, true); // Added mastodonOnly flag
            hideLoadingBar();
            refreshSpinner.style.display = 'none';
        },
        showLoopsProfile: async (username, instance = 'loops.video') => {
            showLoadingBar();
            switchView('profile');
            await renderLoopsProfilePage(state, actions, username, instance);
            hideLoadingBar();
        },
        showMergedTimeline: async () => {
            showLoadingBar();
            refreshSpinner.style.display = 'block';
            state.currentLemmyFeed = null; // Clear other feed types
            state.currentTimeline = null;
            switchView('timeline');
            renderTimelineSubNav(null); // Hide the sub-nav for the merged feed
            await fetchMergedTimeline(state, actions, false, onMastodonLoginSuccess);
            hideLoadingBar();
            refreshSpinner.style.display = 'none';
        },
         
        showHomeTimeline: async () => {
            showLoadingBar();
            refreshSpinner.style.display = 'block';

            const defaultStartPage = localStorage.getItem('defaultStartPage') || 'lemmy';
            const defaultFeedType = localStorage.getItem('defaultFeedType') || 'Subscribed';
            const defaultLemmySort = localStorage.getItem('lemmySortType') || 'Hot';

            if (defaultStartPage === 'lemmy') {
                actions.showLemmyFeed(defaultFeedType, defaultLemmySort);
            } else {
                let timeline = 'home';
                if (defaultFeedType === 'All') timeline = 'public';
                if (defaultFeedType === 'Local') timeline = 'public?local=true';
                actions.showMastodonTimeline(timeline);
            }

            hideLoadingBar();
            refreshSpinner.style.display = 'none';
        },
        replyToStatus: (post, card) => {
            actions.showConversation(post, card);
        },
        showConversation: async (post, card) => {
            const container = card.querySelector('.conversation-container');
            const isVisible = container.style.display === 'flex';
            
            document.querySelectorAll('.conversation-container').forEach(c => c.style.display = 'none');

            if (isVisible) {
                container.style.display = 'none';
            } else {
                container.innerHTML = 'Loading conversation...';
                container.style.display = 'flex';
                
                const { data: context } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${post.id}/context`);

                container.innerHTML = `
                    <div class="conversation-thread"></div>
                    <div class="conversation-reply-box">
                        <textarea class="conversation-reply-textarea" placeholder="Reply..."></textarea>
                        <button class="button-primary send-reply-btn">Reply</button>
                    </div>
                `;

                const threadContainer = container.querySelector('.conversation-thread');
                if (context.descendants) {
                    context.descendants.forEach(reply => {
                        threadContainer.appendChild(renderStatus(reply, state.currentUser, actions, state.settings));
                    });
                }
                
                const textarea = container.querySelector('.conversation-reply-textarea');
                textarea.value = `@${post.account.acct} `;
                textarea.focus();

                container.querySelector('.send-reply-btn').addEventListener('click', async () => {
                    const status = textarea.value.trim();
                    if (!status) return;

                    await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                        method: 'POST',
                        body: { status: status, in_reply_to_id: post.id }
                    });
                    
                    container.style.display = 'none';
                });
            }
        },
        navigateToLoopsProfile: (username, instance) => {
            actions.showLoopsProfile(username, instance);
        },
        handleSearchResultClick: (account) => {
            const acct = account.acct || '';
            
            if (acct.includes('loops.video') || acct.includes('loops.') || 
                account.url?.includes('loops.video') || account.url?.includes('loops.')) {
                const parts = acct.split('@');
                const username = parts[0] || account.username;
                const instance = parts[1] || 'loops.video';
                actions.showLoopsProfile(username, instance);
            } else if (acct.includes('@')) {
                actions.showProfilePage('mastodon', account.id);
            } else {
                actions.showLemmyCommunity(account.acct);
            }
        },
        deleteStatus: async (statusId) => {
            try {
                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`, { method: 'DELETE' });
                document.querySelector(`.status[data-id="${statusId}"]`)?.remove();
                showSuccessToast("Post deleted successfully.");
            } catch (err) {
                showErrorToast("Failed to delete post.");
            }
        },
        editStatus: async (statusId, newContent) => {
            try {
                const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`, {
                    method: 'PUT',
                    body: { status: newContent }
                });
                const postCard = document.querySelector(`.status[data-id="${statusId}"]`);
                if (postCard) {
                    const contentDiv = postCard.querySelector('.status-content');
                    contentDiv.innerHTML = response.data.content;
                }
                showSuccessToast("Post updated successfully.");
            } catch (err) {
                showErrorToast("Failed to update post.");
            }
        },
        toggleAction: async (action, status, button) => {
            const isToggled = button.classList.contains('active');
            const newAction = isToggled ? action.replace('reblog', 'unreblog').replace('favorite', 'unfavorite').replace('bookmark', 'unbookmark') : action;
            try {
                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${status.id}/${newAction}`, { method: 'POST' });
                button.classList.toggle('active');
            } catch (err) {
                showErrorToast(`Failed to ${action} post.`);
            }
        },
        mastodonFollow: async (accountId, follow = true) => {
            try {
                const endpoint = follow ? 'follow' : 'unfollow';
                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/${endpoint}`, { method: 'POST' });
                showSuccessToast(`User ${follow ? 'followed' : 'unfollowed'}.`);
                return true;
            } catch (err) {
                showErrorToast(`Failed to ${follow ? 'follow' : 'unfollow'} user.`);
                return false;
            }
        },
        lemmyVote: async (postId, score, card) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const response = await apiFetch(lemmyInstance, null, '/api/v3/post/like', {
                    method: 'POST',
                    body: { post_id: postId, score: score }
                }, 'lemmy');
                
                const postView = response.data.post_view;
                const scoreSpan = card.querySelector('.lemmy-score');
                scoreSpan.textContent = postView.counts.score;

                const upvoteBtn = card.querySelector('[data-action="upvote"]');
                const downvoteBtn = card.querySelector('[data-action="downvote"]');
                upvoteBtn.classList.remove('active');
                downvoteBtn.classList.remove('active');
                if (postView.my_vote === 1) {
                    upvoteBtn.classList.add('active');
                } else if (postView.my_vote === -1) {
                    downvoteBtn.classList.add('active');
                }
            } catch (err) {
                showErrorToast('Failed to vote on post.');
            }
        },
        lemmySave: async (postId, button) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const response = await apiFetch(lemmyInstance, null, '/api/v3/post/save', {
                    method: 'POST',
                    body: { post_id: postId, save: !button.classList.contains('active') }
                }, 'lemmy');
                button.classList.toggle('active', response.data.post_view.saved);
                showInfoToast(response.data.post_view.saved ? 'Post saved' : 'Post unsaved');
            } catch (err) {
                showErrorToast('Failed to save post.');
            }
        },
        lemmyCommentVote: async (commentId, score, commentDiv) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const response = await apiFetch(lemmyInstance, null, '/api/v3/comment/like', {
                    method: 'POST',
                    body: { comment_id: commentId, score: score }
                }, 'lemmy');

                const commentView = response.data.comment_view;
                const scoreSpan = commentDiv.querySelector('.lemmy-score');
                scoreSpan.textContent = commentView.counts.score;

                const upvoteBtn = commentDiv.querySelector('[data-action="upvote"]');
                const downvoteBtn = commentDiv.querySelector('[data-action="downvote"]');
                upvoteBtn.classList.remove('active');
                downvoteBtn.classList.remove('active');
                if (commentView.my_vote === 1) {
                    upvoteBtn.classList.add('active');
                } else if (commentView.my_vote === -1) {
                    downvoteBtn.classList.add('active');
                }
            } catch (err) {
                showErrorToast('Failed to vote on comment.');
            }
        },
        lemmyPostComment: async (commentData) => {
            const lemmyInstance = localStorage.getItem('lemmy_instance');
            if (!lemmyInstance) {
                showWarningToast('You must be logged in to comment.');
                throw new Error('Not logged in');
            }
            const response = await apiFetch(lemmyInstance, null, '/api/v3/comment', {
                method: 'POST',
                body: commentData
            }, 'lemmy');
            return response.data;
        },
         lemmyFollowCommunity: async (communityId, follow = true) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                await apiFetch(lemmyInstance, null, '/api/v3/community/follow', {
                    method: 'POST',
                    body: { community_id: communityId, follow: follow }
                }, 'lemmy');
                showSuccessToast(`Community ${follow ? 'followed' : 'unfollowed'}.`);
                return true;
            } catch (err) {
                showErrorToast('Failed to follow community.');
                return false;
            }
        },
        lemmyBlockCommunity: async (communityId, block) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                await apiFetch(lemmyInstance, null, '/api/v3/community/block', {
                    method: 'POST',
                    body: { community_id: communityId, block: block }
                }, 'lemmy');
                showSuccessToast(`Community ${block ? 'blocked' : 'unblocked'}. Refreshing feed...`);
                if (state.currentView === 'timeline' && state.currentLemmyFeed) {
                    actions.showLemmyFeed(state.currentLemmyFeed);
                } else {
                     actions.showHomeTimeline();
                }
            } catch (err) {
                showErrorToast('Failed to block community.');
            }
        },
        lemmyBlockUser: async (personId, block) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                await apiFetch(lemmyInstance, null, '/api/v3/user/block', {
                    method: 'POST',
                    body: { person_id: personId, block: block }
                }, 'lemmy');
                showSuccessToast(`User ${block ? 'blocked' : 'unblocked'}. Refreshing feed...`);
                if (state.currentView === 'timeline' && state.currentLemmyFeed) {
                    actions.showLemmyFeed(state.currentLemmyFeed);
                } else {
                     actions.showHomeTimeline();
                }
            } catch (err) {
                showErrorToast('Failed to block user.');
            }
        },
        lemmyDeletePost: async (postId) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                await apiFetch(lemmyInstance, null, '/api/v3/post/delete', {
                    method: 'POST',
                    body: { post_id: postId, deleted: true }
                }, 'lemmy');
                showSuccessToast('Post deleted.');
                document.querySelector(`.status[data-id="${postId}"]`)?.remove();
            } catch (err) {
                showErrorToast('Failed to delete post.');
            }
        },
        lemmyDeleteComment: async (commentId) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                await apiFetch(lemmyInstance, null, '/api/v3/comment/delete', {
                    method: 'POST',
                    body: { comment_id: commentId, deleted: true }
                }, 'lemmy');
                showSuccessToast('Comment deleted.');
                document.getElementById(`comment-wrapper-${commentId}`)?.remove();
            } catch (err) {
                showErrorToast('Failed to delete comment.');
            }
        },
        lemmyEditPost: async (postId, content) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                const response = await apiFetch(lemmyInstance, null, '/api/v3/post', {
                    method: 'PUT',
                    body: { post_id: postId, body: content }
                }, 'lemmy');
                showSuccessToast('Post edited.');
                const postCard = document.querySelector(`.status[data-id="${postId}"]`);
                if (postCard) {
                    const contentDiv = postCard.querySelector('.lemmy-post-body');
                    if (contentDiv) {
                        contentDiv.innerHTML = new showdown.Converter().makeHtml(response.data.post_view.post.body);
                    }
                }
            } catch (err) {
                showErrorToast('Failed to edit post.');
            }
        },
        lemmyEditComment: async (commentId, content) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                const response = await apiFetch(lemmyInstance, null, '/api/v3/comment', {
                    method: 'PUT',
                    body: { comment_id: commentId, content: content }
                }, 'lemmy');
                showSuccessToast('Comment edited.');
                const commentWrapper = document.getElementById(`comment-wrapper-${commentId}`);
                if (commentWrapper) {
                    const contentDiv = commentWrapper.querySelector('.status-content');
                    if (contentDiv) {
                        contentDiv.innerHTML = new showdown.Converter().makeHtml(response.data.comment_view.comment.content);
                    }
                }
            } catch (err) {
                showErrorToast('Failed to edit comment.');
                throw err;
            }
        },
        saveLemmyProfile: async (profileData) => {
            showLoadingBar();
            const lemmyInstance = localStorage.getItem('lemmy_instance');
            const updatePayload = {
                bio: profileData.bio,
                auth: localStorage.getItem('lemmy_jwt')
            };

            try {
                if (profileData.avatar) {
                    const avatarUrl = await lemmyImageUpload(profileData.avatar);
                    if (avatarUrl) updatePayload.avatar = avatarUrl;
                }
                if (profileData.banner) {
                    const bannerUrl = await lemmyImageUpload(profileData.banner);
                    if (bannerUrl) updatePayload.banner = bannerUrl;
                }

                await apiFetch(lemmyInstance, null, '/api/v3/user/save_user_settings', {
                    method: 'PUT',
                    body: updatePayload
                }, 'lemmy');

                showSuccessToast('Profile saved successfully!');
                // Refresh the profile page
                actions.showLemmyProfile(state.currentProfileUserAcct);

            } catch (error) {
                showErrorToast('Failed to save profile.');
            } finally {
                hideLoadingBar();
            }
        },
        sharePost: (postView) => {
            const shortUrl = shareService.createShareUrl('lemmy-post', postView);
            // Extract just the path part (e.g., "/f/abc123" or "f/abc123")
            const shortPath = shortUrl.replace(/^https?:\/\/[^\/]+\//, '').replace(/^\//, '');
            // Create the full URL with hash routing
            const fullUrl = `${window.location.origin}/#${shortPath}`;
            
            if (navigator.share) {
                navigator.share({ 
                    title: postView.post.name,
                    text: `Check out this post: ${postView.post.name}`,
                    url: fullUrl 
                });
            } else {
                navigator.clipboard.writeText(fullUrl);
                showSuccessToast(`Link copied!`);
            }
        },
        shareComment: (commentView) => {
            const shortUrl = shareService.createShareUrl('lemmy-comment', commentView);
            // Extract just the path part (e.g., "/f/abc123" or "f/abc123")
            const shortPath = shortUrl.replace(/^https?:\/\/[^\/]+\//, '').replace(/^\//, '');
            // Create the full URL with hash routing
            const fullUrl = `${window.location.origin}/#${shortPath}`;
            
            if (navigator.share) {
                navigator.share({ 
                    title: `Comment by ${commentView.creator.name}`,
                    url: fullUrl 
                });
            } else {
                navigator.clipboard.writeText(fullUrl);
                showSuccessToast(`Link copied!`);
            }
        },
        showContextMenu: showContextMenu,
        
        // Blog actions
        showBlogFeed: async () => {
            showLoadingBar();
            switchView('blog');
            await renderBlogFeed(state, actions);
            hideLoadingBar();
        },
        showBlogPost: async (postId) => {
            showLoadingBar();
            switchView('blogPost');
            await renderBlogPostPage(state, actions, postId);
            hideLoadingBar();
        },
        showCreateBlogPost: async () => {
            switchView('createBlogPost');
            await renderCreateBlogPostPage(state, actions);
        },
        showEditBlogPost: async (postId) => {
            showLoadingBar();
            switchView('editBlogPost');
            await renderEditBlogPostPage(state, actions, postId);
            hideLoadingBar();
        },
        blogLogin: async (username, password) => {
            try {
                const response = await fetch('https://b.afsapp.lol/login', {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    state.blogAuth = data.token || data.auth;
                    state.blogUsername = username;
                    localStorage.setItem('blog-auth', state.blogAuth);
                    localStorage.setItem('blog-username', username);
                    showSuccessToast('Blog login successful!');
                    return true;
                } else {
                    showErrorToast('Blog login failed');
                    return false;
                }
            } catch (error) {
                console.error('Blog login error:', error);
                showErrorToast('Unable to connect to blog service');
                return false;
            }
        },
        blogRegister: async (username, password, email) => {
            try {
                const response = await fetch('https://b.afsapp.lol/register', {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password, email })
                });
                
                if (response.ok) {
                    showSuccessToast('Registration successful! Please login.');
                    return true;
                } else {
                    showErrorToast('Registration failed');
                    return false;
                }
            } catch (error) {
                console.error('Blog register error:', error);
                showErrorToast('Unable to connect to blog service');
                return false;
            }
        },
        blogLogout: () => {
            state.blogAuth = null;
            state.blogUsername = null;
            localStorage.removeItem('blog-auth');
            localStorage.removeItem('blog-username');
            showInfoToast('Logged out from blog');
            actions.showBlogFeed();
        },
        blogCreatePost: async (title, content, summary) => {
            try {
                const response = await fetch('https://b.afsapp.lol/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.blogAuth}`
                    },
                    body: JSON.stringify({ title, content, summary })
                });
                
                if (response.ok) {
                    showSuccessToast('Post created successfully!');
                    actions.showBlogFeed();
                    return true;
                } else {
                    showErrorToast('Failed to create post');
                    return false;
                }
            } catch (error) {
                showErrorToast('Error creating post');
                return false;
            }
        },
        blogUpdatePost: async (postId, title, content, summary) => {
            try {
                const response = await fetch(`https://b.afsapp.lol/posts/${postId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.blogAuth}`
                    },
                    body: JSON.stringify({ title, content, summary })
                });
                
                if (response.ok) {
                    showSuccessToast('Post updated successfully!');
                    actions.showBlogPost(postId);
                    return true;
                } else {
                    showErrorToast('Failed to update post');
                    return false;
                }
            } catch (error) {
                showErrorToast('Error updating post');
                return false;
            }
        },
        blogDeletePost: async (postId) => {
            if (!confirm('Are you sure you want to delete this post?')) return false;
            
            try {
                const response = await fetch(`https://b.afsapp.lol/posts/${postId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${state.blogAuth}`
                    }
                });
                
                if (response.ok) {
                    showSuccessToast('Post deleted successfully!');
                    actions.showBlogFeed();
                    return true;
                } else {
                    showErrorToast('Failed to delete post');
                    return false;
                }
            } catch (error) {
                showErrorToast('Error deleting post');
                return false;
            }
        }
    };
    state.actions = actions;

    const onMastodonLoginSuccess = async (instanceUrl, accessToken) => {
        try {
            const { data: account } = await apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials');
            if (!account || !account.id) {
                showErrorToast('Mastodon login failed.'); 
                return false;
            }
            state.instanceUrl = instanceUrl;
            state.accessToken = accessToken;
            state.currentUser = account;
            localStorage.setItem('fediverse-instance', instanceUrl);
            localStorage.setItem('fediverse-token', accessToken);
            showSuccessToast('Mastodon login successful!');
            actions.showHomeTimeline();
            return true;
        } catch (error) {
            showErrorToast('Mastodon login failed.');
            return false;
        }
    };

    const onLemmyLoginSuccess = (instance, username, password) => {
        apiFetch(instance, null, '/api/v3/user/login', {
            method: 'POST',
            body: { username_or_email: username, password: password }
        }, 'none')
        .then(response => {
            if (response.data.jwt) {
                localStorage.setItem('lemmy_jwt', response.data.jwt);
                localStorage.setItem('lemmy_username', username);
                localStorage.setItem('lemmy_instance', instance);
                state.lemmyUsername = username;
                showSuccessToast('Lemmy login successful!');
                updateNotificationBell();
                actions.showLemmyFeed('Subscribed');
            } else {
                showErrorToast('Lemmy login failed.');
            }
        })
        .catch(err => {
             showErrorToast('Lemmy login error.');
        });
    };
    
    initDropdowns();
    initPullToRefresh(state, actions);
    initComposeModal(state, () => actions.showHomeTimeline());
    initImageModal();
    
    refreshBtn.addEventListener('click', () => {
        if (state.currentView === 'timeline') {
            if (state.currentTimeline) {
                actions.showHomeTimeline();
            } else if (state.currentLemmyFeed) {
                actions.showLemmyFeed(state.currentLemmyFeed);
            }
        } else if (state.currentView === 'notifications') {
            actions.showNotifications();
        } else if (state.currentView === 'blog') {
            actions.showBlogFeed();
        }
    });

    notificationsBtn.addEventListener('click', () => {
        actions.showNotifications();
    });
    
    document.getElementById('discover-btn').addEventListener('click', () => {
        actions.showDiscoverPage();
    });

    // --- Initial Load ---
    await verifyUserCredentials();
    const initialView = location.hash.substring(1) || 'timeline';
    
    if (state.accessToken || localStorage.getItem('lemmy_jwt')) {
        updateNotificationBell();
    }
    
    // Check for standard app initialization
    if (initialView === 'timeline') {
        if (state.accessToken || localStorage.getItem('lemmy_jwt')) {
            actions.showHomeTimeline();
        } else {
            switchView('timeline');
            state.timelineDiv.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2>Welcome to Feedstodon</h2>
                    <p>Connect to Lemmy or Mastodon to see your feeds.</p>
                    <p>Use the menu above to get started.</p>
                </div>
            `;
        }
    } else if (initialView === 'blog') {
        actions.showBlogFeed();
    } else {
        switchView(initialView, false);
    }

    const lemmyLogoContainer = document.getElementById('lemmy-logo-container');
    if (lemmyLogoContainer) {
        lemmyLogoContainer.innerHTML = ICONS.lemmy;
    }
    const mastodonLogoContainer = document.getElementById('mastodon-logo-container');
    if (mastodonLogoContainer) {
        mastodonLogoContainer.innerHTML = ICONS.mastodon;
    }

    document.getElementById('feeds-dropdown').querySelector('.dropdown-content').addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('a');
        if (!target) return;

        if (target.id === 'lemmy-main-link') {
            actions.showLemmyFeed('Subscribed');
        } else if (target.id === 'mastodon-main-link') {
            actions.showMastodonTimeline('home');
        } else if (target.dataset.timeline === 'home') {
            actions.showHomeTimeline();
        } else if (target.dataset.timeline === 'merged') {
            actions.showMergedTimeline();
        } else if (target.id === 'blog-link') {
            actions.showBlogFeed();
        }
        document.getElementById('feeds-dropdown').classList.remove('active');
    });

    document.getElementById('user-dropdown').querySelector('.dropdown-content').addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('a');
        if (!target) return;
        
        switch (target.id) {
            case 'new-post-link':
                showComposeModal(state);
                break;
            case 'notifications-link':
                actions.showNotifications();
                break;
            case 'profile-link':
                if (state.currentUser) {
                    actions.showProfilePage('mastodon', state.currentUser.id, state.currentUser.acct);
                } else if (localStorage.getItem('lemmy_jwt')) {
                    const lemmyUsername = localStorage.getItem('lemmy_username');
                    const lemmyInstance = localStorage.getItem('lemmy_instance');
                    if (lemmyUsername && lemmyInstance) {
                        const userAcct = `${lemmyUsername}@${lemmyInstance}`;
                        actions.showLemmyProfile(userAcct);
                    } else {
                        showWarningToast("Could not determine Lemmy user profile.");
                    }
                } else {
                    showWarningToast("Please log in to view your profile.");
                }
                break;
            case 'settings-link':
                actions.showSettings();
                break;
            case 'help-link':
                document.getElementById('help-modal').classList.add('visible');
                break;
            case 'new-blog-post-link':
                if (state.blogAuth) {
                    actions.showCreateBlogPost();
                } else {
                    showWarningToast("Please login to the blog first.");
                    actions.showBlogFeed();
                }
                break;
        }
        document.getElementById('user-dropdown').classList.remove('active');
    });

    document.getElementById('close-help-btn').addEventListener('click', () => {
        document.getElementById('help-modal').classList.remove('visible');
    });
    
    window.addEventListener('scroll', () => {
        if (state.isLoadingMore) return;

        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            if (state.currentView === 'timeline') {
                if (state.currentLemmyFeed && state.lemmyHasMore) {
                    fetchLemmyFeed(state, actions, true);
                } else if (state.currentTimeline && state.nextPageUrl) {
                    fetchTimeline(state, state.currentTimeline, true);
                }
            } else if (state.currentView === 'discover') {
                if (state.currentDiscoverTab === 'lemmy' && state.lemmyDiscoverHasMore) {
                    loadMoreLemmyCommunities(state, actions);
                } else if (state.currentDiscoverTab === 'mastodon-trending' && state.mastodonTrendingHasMore) {
                    loadMoreMastodonTrendingPosts(state, actions);
                }
            } else if (state.currentView === 'profile' && state.currentProfileTab === 'lemmy' && state.lemmyProfileHasMore) {
                loadMoreLemmyProfile(state, actions);
            } else if (state.currentView === 'blog' && state.blogHasMore) {
                // Load more blog posts
                renderBlogFeed(state, actions, true);
            }
        }
    });

    window.addEventListener('popstate', (event) => {
        const imageModal = document.getElementById('image-modal');
        if (imageModal && imageModal.classList.contains('visible')) {
            imageModal.classList.remove('visible');
            history.pushState({ view: state.currentView }, '', `#${state.currentView}`);
        } else if (event.state && event.state.view) {
            switchView(event.state.view, false);
        } else {
            switchView('timeline', false);
        }
    });

    history.replaceState({view: state.currentView}, '', `#${state.currentView}`);
    
    // Check for notifications every 5 minutes
    setInterval(() => {
        if (state.accessToken || localStorage.getItem('lemmy_jwt')) {
            updateNotificationBell();
        }
    }, 5 * 60 * 1000);
});
