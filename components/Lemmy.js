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
        
        if (jwt && feedType === 'Subscribed') {
            url += `&auth=${encodeURIComponent(jwt)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.posts) {
            data.posts.forEach(post => {
                post._sourceInstance = cleanInstance;
                const card = renderLemmyCard(post, state.lemmyUsername, actions, state.settings, state);
                state.timelineDiv.appendChild(card);
            });
            
            if (data.posts.length < 20) {
                state.lemmyHasMore = false;
            }
            
            state.lemmyPage++;
        }
        
    } catch (error) {
        console.error('Error fetching Lemmy feed:', error);
        if (!loadMore) {
            showErrorToast('Failed to load Lemmy feed');
        }
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.style.display = 'none';
    }
}

export function renderLemmyCard(post, currentUser, actions, settings, state) {
    const card = document.createElement('div');
    card.className = 'status lemmy-post';
    card.dataset.id = post.post.id;
    
    // Determine instance
    let postInstance = post._sourceInstance || 'lemmy.world';
    if (post.post.ap_id) {
        try {
            postInstance = new URL(post.post.ap_id).hostname;
        } catch (e) {}
    }
    
    const isNsfw = post.post.nsfw || post.community.nsfw;
    const isOwnPost = currentUser && post.creator.name === currentUser;
    
    // Create basic HTML structure
    const headerHTML = `
        <div class="status-header">
            <div class="status-avatar">
                <div class="avatar-placeholder">${post.creator.name[0].toUpperCase()}</div>
            </div>
            <div class="status-meta">
                <span class="status-author">${post.creator.display_name || post.creator.name}</span>
                <span class="status-username">@${post.creator.name}</span>
                <span class="status-community">in ${post.community.title || post.community.name}</span>
                <div class="status-time">${formatTime(post.post.published)}</div>
            </div>
        </div>
    `;
    
    let contentHTML = `
        <div class="status-content">
            <h3 class="lemmy-post-title">${escapeHtml(post.post.name)}</h3>
    `;
    
    if (post.post.body) {
        // Simple markdown to HTML conversion
        const bodyHtml = convertMarkdown(post.post.body);
        contentHTML += `<div class="lemmy-post-body">${bodyHtml}</div>`;
    }
    
    if (post.post.url) {
        contentHTML += `
            <div class="lemmy-link-preview">
                ${post.post.thumbnail_url ? `<img src="${post.post.thumbnail_url}" alt="Preview" onerror="this.style.display='none'">` : ''}
                <a href="${post.post.url}" target="_blank" rel="noopener">${post.post.url}</a>
            </div>
        `;
    }
    
    contentHTML += '</div>';
    
    const actionsHTML = `
        <div class="status-actions">
            <button class="icon-button" data-action="upvote">${ICONS.upvote || '⬆️'}</button>
            <span class="lemmy-score">${post.counts.score}</span>
            <button class="icon-button" data-action="downvote">${ICONS.downvote || '⬇️'}</button>
            <button class="icon-button" data-action="reply">
                ${ICONS.reply || '💬'}
                <span class="action-count">${post.counts.comments}</span>
            </button>
            <button class="icon-button" data-action="share">${ICONS.share || '🔗'}</button>
        </div>
    `;
    
    card.innerHTML = headerHTML + contentHTML + actionsHTML;
    
    // Add click handler
    card.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('a')) {
            const completePost = {...post, _instance: postInstance};
            actions.showLemmyPostDetail(completePost);
        }
    });
    
    // Add button handlers
    card.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            
            if (action === 'reply') {
                actions.showLemmyPostDetail({...post, _instance: postInstance});
            } else if (action === 'share') {
                actions.sharePost({...post, _instance: postInstance});
            }
            // Add other action handlers as needed
        });
    });
    
    return card;
}

function convertMarkdown(text) {
    // Basic markdown to HTML conversion
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
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
