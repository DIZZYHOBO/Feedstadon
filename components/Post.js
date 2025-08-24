import { ICONS } from './icons.js';
import { timeAgo, formatTimestamp, getWordFilter, shouldFilterContent, processSpoilers } from './utils.js';
import { showImageModal, showToast } from './ui.js';
import { apiFetch } from './api.js';

function renderPoll(poll, actions, statusId) {
    const options = poll.options.map((option, index) => `
        <div class="poll-option">
            <button class="button-secondary" data-action="vote-poll" data-index="${index}">${option.title}</button>
            <span class="poll-votes">${option.votes_count || 0} votes</span>
        </div>
    `).join('');

    return `
        <div class="poll-container" data-status-id="${statusId}">
            ${options}
            <div class="poll-footer">
                <span>${poll.votes_count} votes · ${poll.expired ? 'Final results' : 'Poll ends soon'}</span>
            </div>
        </div>
    `;
}

export function renderStatus(status, currentUser, actions, settings, isReply = false) {
    if (!status || !status.account) {
        return document.createDocumentFragment();
    }

    const filterList = getWordFilter();
    const combinedContent = `${status.content} ${status.spoiler_text}`;
    if (shouldFilterContent(combinedContent, filterList)) {
        return document.createDocumentFragment();
    }

    const originalStatus = status.reblog || status;
    const isSelf = currentUser && currentUser.id === originalStatus.account.id;

    const card = document.createElement('div');
    card.className = `status ${isReply ? 'reply-status' : ''}`;
    card.dataset.id = originalStatus.id;

    const reblogHeader = status.reblog ? `
        <div class="reblog-header">
            ${ICONS.reblog || ''} ${status.account.display_name || status.account.username || status.account.acct} boosted
        </div>
    ` : '';

    let contentHTML = originalStatus.content;
    let mediaHTML = '';

    if (originalStatus.media_attachments && originalStatus.media_attachments.length > 0) {
        mediaHTML = '<div class="status-media">';
        originalStatus.media_attachments.forEach(media => {
            if (media.type === 'image') {
                mediaHTML += `<img src="${media.preview_url}" alt="${media.description || 'Status media'}" loading="lazy" data-full-url="${media.url}">`;
            } else if (media.type === 'video' || media.type === 'gifv') {
                mediaHTML += `<video src="${media.url}" controls ${media.type === 'gifv' ? 'autoplay loop muted' : ''}></video>`;
            }
        });
        mediaHTML += '</div>';
    } else if (originalStatus.card) {
        const cardData = originalStatus.card;
        mediaHTML = `
            <a href="${cardData.url}" target="_blank" rel="noopener noreferrer" class="status-card-link">
                <div class="status-card">
                    ${cardData.image ? `<img src="${cardData.image}" alt="${cardData.title}" class="status-card-image">` : ''}
                    <div class="status-card-info">
                        <span class="status-card-title">${cardData.title}</span>
                        <span class="status-card-description">${cardData.description}</span>
                        <span class="status-card-url">${cardData.provider_name || new URL(cardData.url).hostname}</span>
                    </div>
                </div>
            </a>
        `;
    }

    if (originalStatus.poll) {
        contentHTML = renderPoll(originalStatus.poll, actions, originalStatus.id);
    }

    const spoilerText = originalStatus.spoiler_text;
    const hasSpoiler = spoilerText && spoilerText.trim().length > 0;

    card.innerHTML = `
        ${reblogHeader}
        <div class="status-body-content" ${hasSpoiler ? 'tabindex="0"' : ''}>
            <div class="status-header">
                <a href="#" class="status-header-main" data-id="${originalStatus.account.id}">
                    <img src="${originalStatus.account.avatar_static}" alt="${originalStatus.account.display_name}'s avatar" class="avatar">
                    <div>
                        <span class="display-name">${originalStatus.account.display_name}</span>
                        <span class="acct">@${originalStatus.account.acct}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    <a href="${originalStatus.url}" target="_blank" class="timestamp" title="${formatTimestamp(originalStatus.created_at)}">${timeAgo(originalStatus.created_at)}</a>
                    <div class="mastodon-icon-indicator">${ICONS.mastodon || ''}</div>
                </div>
            </div>
            <div class="status-content">
                ${hasSpoiler ? `<p class="spoiler-text">${spoilerText} <button class="spoiler-toggle">Show</button></p>` : ''}
                <div class="status-text ${hasSpoiler ? 'spoiler' : ''}">${contentHTML}</div>
            </div>
            ${mediaHTML}
        </div>
        <div class="status-footer">
            <button class="status-action" data-action="reply" title="Reply">
                ${ICONS.reply || ''}
            </button>
            <button class="status-action ${originalStatus.reblogged ? 'active' : ''}" data-action="reblog" title="Boost">
                ${ICONS.reblog || ''}
                <span>${originalStatus.reblogs_count || 0}</span>
            </button>
            <button class="status-action ${originalStatus.favourited ? 'active' : ''}" data-action="favorite" title="Favourite">
                ${ICONS.favourite || ''}
                <span>${originalStatus.favourites_count || 0}</span>
            </button>
            <button class="status-action ${originalStatus.bookmarked ? 'active' : ''}" data-action="bookmark" title="Bookmark">
                ${ICONS.bookmark || ''}
            </button>
            <button class="status-action" data-action="more" title="More">
                ${ICONS.more || ''}
            </button>
        </div>
        <div class="conversation-container" style="display: none;"></div>
    `;

    // Add event listeners
    card.querySelector('.status-header-main').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showProfilePage('mastodon', e.currentTarget.dataset.id);
    });

    card.querySelector('.status-body-content').addEventListener('dblclick', (e) => {
        e.stopPropagation();
        actions.showStatusDetail(originalStatus.id);
    });

    if (hasSpoiler) {
        const content = card.querySelector('.status-text');
        const toggle = card.querySelector('.spoiler-toggle');
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('spoiler');
            toggle.textContent = content.classList.contains('spoiler') ? 'Show' : 'Hide';
        });
    }

    card.querySelectorAll('.status-media img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageModal(img.dataset.fullUrl || img.src);
        });
    });

    // Handle all status actions
    card.querySelectorAll('.status-footer .status-action').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            
            switch(action) {
                case 'reply':
                    showReplyBox(card, originalStatus, actions);
                    break;
                    
                case 'reblog':
                    try {
                        const endpoint = originalStatus.reblogged ? 'unreblog' : 'reblog';
                        const response = await apiFetch(
                            actions.state.instanceUrl, 
                            actions.state.accessToken,
                            `/api/v1/statuses/${originalStatus.id}/${endpoint}`,
                            { method: 'POST' }
                        );
                        
                        originalStatus.reblogged = !originalStatus.reblogged;
                        originalStatus.reblogs_count = response.data.reblogs_count;
                        button.classList.toggle('active');
                        button.querySelector('span').textContent = originalStatus.reblogs_count;
                        showToast(originalStatus.reblogged ? 'Boosted!' : 'Unboosted');
                    } catch (error) {
                        showToast('Failed to boost', 'error');
                    }
                    break;
                    
                case 'favorite':
                    try {
                        const endpoint = originalStatus.favourited ? 'unfavourite' : 'favourite';
                        const response = await apiFetch(
                            actions.state.instanceUrl,
                            actions.state.accessToken,
                            `/api/v1/statuses/${originalStatus.id}/${endpoint}`,
                            { method: 'POST' }
                        );
                        
                        originalStatus.favourited = !originalStatus.favourited;
                        originalStatus.favourites_count = response.data.favourites_count;
                        button.classList.toggle('active');
                        button.querySelector('span').textContent = originalStatus.favourites_count;
                        showToast(originalStatus.favourited ? 'Favorited!' : 'Unfavorited');
                    } catch (error) {
                        showToast('Failed to favorite', 'error');
                    }
                    break;
                    
                case 'bookmark':
                    try {
                        const endpoint = originalStatus.bookmarked ? 'unbookmark' : 'bookmark';
                        await apiFetch(
                            actions.state.instanceUrl,
                            actions.state.accessToken,
                            `/api/v1/statuses/${originalStatus.id}/${endpoint}`,
                            { method: 'POST' }
                        );
                        
                        originalStatus.bookmarked = !originalStatus.bookmarked;
                        button.classList.toggle('active');
                        showToast(originalStatus.bookmarked ? 'Bookmarked!' : 'Removed from bookmarks');
                    } catch (error) {
                        showToast('Failed to bookmark', 'error');
                    }
                    break;
                    
                case 'more':
                    showStatusMenu(button, originalStatus, isSelf, actions);
                    break;
            }
        });
    });

    return card;
}

function showReplyBox(card, status, actions) {
    let conversationContainer = card.querySelector('.conversation-container');
    
    const isVisible = conversationContainer.style.display === 'flex';
    
    if (isVisible) {
        conversationContainer.style.display = 'none';
        return;
    }
    
    // Hide all other conversation containers
    document.querySelectorAll('.conversation-container').forEach(c => {
        c.style.display = 'none';
    });
    
    conversationContainer.innerHTML = `
        <div class="conversation-reply-box">
            <textarea class="conversation-reply-textarea" placeholder="Reply to @${status.account.acct}..."></textarea>
            <div class="reply-actions">
                <button class="button-secondary cancel-reply">Cancel</button>
                <button class="button-primary send-reply-btn">Reply</button>
            </div>
        </div>
    `;
    
    conversationContainer.style.display = 'flex';
    
    const textarea = conversationContainer.querySelector('.conversation-reply-textarea');
    textarea.value = `@${status.account.acct} `;
    textarea.focus();
    
    // Position cursor after the mention
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    
    // Cancel button
    conversationContainer.querySelector('.cancel-reply').addEventListener('click', () => {
        conversationContainer.style.display = 'none';
    });
    
    // Send reply button
    conversationContainer.querySelector('.send-reply-btn').addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (!content) return;
        
        try {
            await apiFetch(
                actions.state.instanceUrl,
                actions.state.accessToken,
                '/api/v1/statuses',
                {
                    method: 'POST',
                    body: {
                        status: content,
                        in_reply_to_id: status.id
                    }
                }
            );
            
            showToast('Reply posted!', 'success');
            conversationContainer.style.display = 'none';
            
            // Optionally refresh the timeline
            if (actions.showHomeTimeline) {
                actions.showHomeTimeline();
            }
        } catch (error) {
            console.error('Failed to post reply:', error);
            showToast('Failed to post reply', 'error');
        }
    });
}

function showStatusMenu(button, status, isSelf, actions) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.status-dropdown-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'status-dropdown-menu';
    menu.style.position = 'absolute';
    menu.style.zIndex = '1000';
    
    const menuItems = [];
    
    // Common options
    menuItems.push({
        label: 'Copy link',
        action: () => {
            navigator.clipboard.writeText(status.url);
            showToast('Link copied!', 'success');
        }
    });
    
    if (isSelf) {
        menuItems.push({
            label: 'Delete',
            action: () => {
                if (confirm('Are you sure you want to delete this post?')) {
                    actions.deleteStatus(status.id);
                }
            }
        });
    }
    
    menuItems.forEach(item => {
        const menuButton = document.createElement('button');
        menuButton.textContent = item.label;
        menuButton.onclick = () => {
            item.action();
            menu.remove();
        };
        menu.appendChild(menuButton);
    });
    
    document.body.appendChild(menu);
    
    // Position the menu
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom}px`;
    menu.style.left = `${rect.left}px`;
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

export function renderStatusDetail(status, allReplies, currentUser, actions, settings) {
    const detailView = document.createElement('div');
    detailView.className = 'post-detail-view';

    const mainPost = renderStatus(status, currentUser, actions, settings);
    detailView.appendChild(mainPost);

    const repliesContainer = document.createElement('div');
    repliesContainer.className = 'replies-container';
    
    allReplies.forEach(reply => {
        const replyCard = renderStatus(reply, currentUser, actions, settings, true);
        repliesContainer.appendChild(replyCard);
    });

    detailView.appendChild(repliesContainer);

    return detailView;
}
