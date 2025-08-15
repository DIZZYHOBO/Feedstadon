// components/Lemmy.js
import { showLoadingBar, hideLoadingBar, showToast, showErrorToast, showInfoToast, showWarningToast } from './ui.js';
import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

export async function fetchLemmyFeed(state, actions, loadMore = false, onLoginSuccess = null) {
    if (state.isLoadingMore && loadMore) return;
    
    if (!loadMore) {
        state.lemmyPage = 1;
        state.lemmyHasMore = true;
        state.timelineDiv.innerHTML = '';
    } else if (!state.lemmyHasMore) {
        return;
    }
    
    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.style.display = 'block';
    
    const lemmyInstance = localStorage.getItem('lemmy_instance') || 'https://lemmy.world';
    const cleanInstance = lemmyInstance.replace(/^https?:\/\//, '');
    const feedType = state.currentLemmyFeed || 'All';
    const sortType = state.currentLemmySort || 'Hot';
    
    try {
        const jwt = localStorage.getItem('lemmy_jwt');
        let url = `https://${cleanInstance}/api/v3/post/list?type_=${feedType}&sort=${sortType}&limit=20&page=${state.lemmyPage}`;
        
        // Add auth if available and needed
        if (jwt && feedType === 'Subscribed') {
            url += `&auth=${encodeURIComponent(jwt)}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            // If subscribed feed fails, user might not be logged in
            if (feedType === 'Subscribed' && response.status === 401) {
                console.log('Not authenticated, switching to All feed');
                state.currentLemmyFeed = 'All';
                url = `https://${cleanInstance}/api/v3/post/list?type_=All&sort=${sortType}&limit=20&page=${state.lemmyPage}`;
                const retryResponse = await fetch(url);
                if (!retryResponse.ok) throw new Error('Failed to fetch feed');
                const data = await retryResponse.json();
                renderLemmyPosts(data.posts, state, actions, cleanInstance);
            } else {
                throw new Error('Failed to fetch feed');
            }
        } else {
            const data = await response.json();
            renderLemmyPosts(data.posts, state, actions, cleanInstance);
        }
        
        state.lemmyPage++;
        
    } catch (error) {
        console.error('Error fetching Lemmy feed:', error);
        
        if (!loadMore) {
            // Show login prompt for first load if needed
            if (feedType === 'Subscribed' && !localStorage.getItem('lemmy_jwt')) {
                const loginPrompt = document.createElement('div');
                loginPrompt.className = 'login-prompt-container';
                loginPrompt.innerHTML = `
                    <div class="login-prompt">
                        <h3>Login to Lemmy to see your subscribed communities</h3>
                        <button class="button-primary" onclick="document.getElementById('settings-view').style.display='flex';document.getElementById('timeline').style.display='none';">
                            Go to Settings
                        </button>
                    </div>
                `;
                state.timelineDiv.appendChild(loginPrompt);
            } else {
                showErrorToast('Failed to load Lemmy feed');
            }
        }
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.style.display = 'none';
    }
}

function renderLemmyPosts(posts, state, actions, sourceInstance) {
    if (!posts || posts.length === 0) {
        state.lemmyHasMore = false;
        if (state.lemmyPage === 1) {
            state.timelineDiv.innerHTML = '<div class="no-posts">No posts found</div>';
        }
        return;
    }
    
    posts.forEach(post => {
        // Add source instance to each post for tracking
        post._sourceInstance = sourceInstance;
        const card = renderLemmyCard(post, state.lemmyUsername, actions, state.settings, state);
        state.timelineDiv.appendChild(card);
    });
    
    if (posts.length < 20) {
        state.lemmyHasMore = false;
    }
}

export function renderLemmyCard(post, currentUser, actions, settings, state) {
    const card = document.createElement('div');
    card.className = 'status lemmy-post';
    card.dataset.id = post.post.id;
    
    // Determine the correct instance for this post
    let postInstance = 'lemmy.world'; // fallback
    
    // Priority 1: Use the source instance if available (from feed fetch)
    if (post._sourceInstance) {
        postInstance = post._sourceInstance;
    }
    // Priority 2: Extract from ap_id (ActivityPub ID)
    else if (post.post.ap_id) {
        try {
            const url = new URL(post.post.ap_id);
            postInstance = url.hostname;
        } catch (e) {
            console.warn('Could not parse ap_id:', post.post.ap_id);
        }
    }
    // Priority 3: Extract from community actor_id
    else if (post.community.actor_id) {
        try {
            const url = new URL(post.community.actor_id);
            postInstance = url.hostname;
        } catch (e) {
            console.warn('Could not parse community actor_id:', post.community.actor_id);
        }
    }
    
    // Store instance on the card for debugging
    card.dataset.instance = postInstance;
    
    const isNsfw = post.post.nsfw || post.community.nsfw;
    const isOwnPost = currentUser && post.creator.name === currentUser;
    
    // Build the card HTML
    let cardHTML = `
        <div class="status-header">
            <div class="status-avatar">
                ${post.creator.avatar ? 
                    `<img src="${post.creator.avatar}" alt="${post.creator.name}" onerror="this.src='/images/default-avatar.png'">` : 
                    `<div class="avatar-placeholder">${post.creator.name[0].toUpperCase()}</div>`
                }
            </div>
            <div class="status-meta">
                <a href="#" class="status-author lemmy-user-link" data-username="${post.creator.name}" data-instance="${post.creator.actor_id ? new URL(post.creator.actor_id).hostname : postInstance}">
                    ${post.creator.display_name || post.creator.name}
                </a>
                <span class="status-username">@${post.creator.name}</span>
                <span class="status-community">
                    in <a href="#" class="lemmy-community-link" data-community="${post.community.name}@${postInstance}">
                        ${post.community.title || post.community.name}
                    </a>
                </span>
                <div class="status-time">${formatTime(post.post.published)}</div>
            </div>
        </div>
        
        <div class="status-content">
            <h3 class="lemmy-post-title">${escapeHtml(post.post.name)}</h3>
    `;
    
    // Handle NSFW content
    if (isNsfw && settings?.hideNsfw) {
        cardHTML += `
            <div class="nsfw-warning">
                <p>NSFW Content Hidden</p>
                <button class="button-secondary show-nsfw-btn">Show</button>
            </div>
        `;
    } else {
        // Add post body if exists
        if (post.post.body) {
            const converter = new showdown.Converter();
            cardHTML += `<div class="lemmy-post-body">${converter.makeHtml(post.post.body)}</div>`;
        }
        
        // Add URL preview if exists
        if (post.post.url) {
            if (post.post.thumbnail_url) {
                cardHTML += `
                    <div class="lemmy-link-preview">
                        <img src="${post.post.thumbnail_url}" alt="Preview" onerror="this.style.display='none'">
                        <a href="${post.post.url}" target="_blank" rel="noopener">${new URL(post.post.url).hostname}</a>
                    </div>
                `;
            } else {
                cardHTML += `
                    <div class="lemmy-link-preview">
                        <a href="${post.post.url}" target="_blank" rel="noopener">${post.post.url}</a>
                    </div>
                `;
            }
        }
    }
    
    cardHTML += `
        </div>
        
        <div class="status-actions">
            <button class="icon-button" data-action="upvote" ${post.my_vote === 1 ? 'class="active"' : ''}>
                ${ICONS.upvote}
            </button>
            <span class="lemmy-score">${post.counts.score}</span>
            <button class="icon-button" data-action="downvote" ${post.my_vote === -1 ? 'class="active"' : ''}>
                ${ICONS.downvote}
            </button>
            <button class="icon-button" data-action="reply">
                ${ICONS.reply}
                <span class="action-count">${post.counts.comments}</span>
            </button>
            <button class="icon-button" data-action="save" ${post.saved ? 'class="active"' : ''}>
                ${post.saved ? ICONS.bookmarkFilled : ICONS.bookmark}
            </button>
            <button class="icon-button" data-action="share">
                ${ICONS.share}
            </button>
            <button class="icon-button" data-action="more">
                ${ICONS.more}
            </button>
        </div>
    `;
    
    card.innerHTML = cardHTML;
    
    // Add event listeners
    
    // Click on the card to view the post
    card.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons or links
        if (e.target.closest('button') || e.target.closest('a')) return;
        
        // Create a complete post object with instance info
        const completePost = {
            ...post,
            _instance: postInstance // Pass the instance info
        };
        
        console.log('Opening post from instance:', postInstance, 'Post ID:', post.post.id);
        actions.showLemmyPostDetail(completePost);
    });
    
    // Community link
    const communityLink = card.querySelector('.lemmy-community-link');
    if (communityLink) {
        communityLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.showLemmyCommunity(communityLink.dataset.community);
        });
    }
    
    // User link
    const userLink = card.querySelector('.lemmy-user-link');
    if (userLink) {
        userLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const username = userLink.dataset.username;
            const instance = userLink.dataset.instance;
            actions.showLemmyProfile(`${username}@${instance}`);
        });
    }
    
    // Action buttons
    card.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            
            switch(action) {
                case 'upvote':
                    if (!currentUser) {
                        showWarningToast('Please login to vote');
                        return;
                    }
                    actions.lemmyVote(post.post.id, post.my_vote === 1 ? 0 : 1, card);
                    break;
                    
                case 'downvote':
                    if (!currentUser) {
                        showWarningToast('Please login to vote');
                        return;
                    }
                    actions.lemmyVote(post.post.id, post.my_vote === -1 ? 0 : -1, card);
                    break;
                    
                case 'reply':
                    actions.showLemmyPostDetail({...post, _instance: postInstance});
                    break;
                    
                case 'save':
                    if (!currentUser) {
                        showWarningToast('Please login to save posts');
                        return;
                    }
                    actions.lemmySave(post.post.id, btn);
                    break;
                    
                case 'share':
                    actions.sharePost({...post, _instance: postInstance});
                    break;
                    
                case 'more':
                    showPostMenu(e, post, isOwnPost, actions, postInstance);
                    break;
            }
        });
    });
    
    // NSFW show button
    const nsfwBtn = card.querySelector('.show-nsfw-btn');
    if (nsfwBtn) {
        nsfwBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const warning = card.querySelector('.nsfw-warning');
            warning.style.display = 'none';
            
            // Re-render the content
            const contentDiv = card.querySelector('.status-content');
            let newContent = `<h3 class="lemmy-post-title">${escapeHtml(post.post.name)}</h3>`;
            
            if (post.post.body) {
                const converter = new showdown.Converter();
                newContent += `<div class="lemmy-post-body">${converter.makeHtml(post.post.body)}</div>`;
            }
            
            if (post.post.url) {
                if (post.post.thumbnail_url) {
                    newContent += `
                        <div class="lemmy-link-preview">
                            <img src="${post.post.thumbnail_url}" alt="Preview">
                            <a href="${post.post.url}" target="_blank" rel="noopener">${new URL(post.post.url).hostname}</a>
                        </div>
                    `;
                } else {
                    newContent += `
                        <div class="lemmy-link-preview">
                            <a href="${post.post.url}" target="_blank" rel="noopener">${post.post.url}</a>
                        </div>
                    `;
                }
            }
            
            contentDiv.innerHTML = newContent;
        });
    }
    
    return card;
}

function showPostMenu(event, post, isOwnPost, actions, postInstance) {
    const items = [];
    
    if (isOwnPost) {
        items.push(
            { label: 'Edit Post', action: () => editPost(post, actions) },
            { label: 'Delete Post', action: () => actions.lemmyDeletePost(post.post.id) }
        );
    } else {
        items.push(
            { label: 'Block User', action: () => actions.lemmyBlockUser(post.creator.id, true) },
            { label: 'Block Community', action: () => actions.lemmyBlockCommunity(post.community.id, true) }
        );
    }
    
    items.push(
        { label: `Open on ${postInstance}`, action: () => window.open(`https://${postInstance}/post/${post.post.id}`, '_blank') },
        { label: 'Copy Link', action: () => {
            navigator.clipboard.writeText(`https://${postInstance}/post/${post.post.id}`);
            showInfoToast('Link copied!');
        }}
    );
    
    actions.showContextMenu(event, items);
}

function editPost(post, actions) {
    const newBody = prompt('Edit post body:', post.post.body || '');
    if (newBody !== null) {
        actions.lemmyEditPost(post.post.id, newBody);
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
