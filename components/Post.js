import { ICONS } from './icons.js';
import { formatTimestamp, getWordFilter, shouldFilterContent } from './utils.js';
import { apiFetch } from './api.js';
import { showImageModal } from './ui.js';

export function renderStatus(status, currentUser, actions, settings, platform = 'mastodon', isTimelineContext = true) {
    const post = status.reblog || status;
    const author = post.account;
    const isOwnPost = currentUser && currentUser.id === author.id;
    
    if (settings && settings.hideNsfw && post.sensitive) {
        return document.createDocumentFragment();
    }
    
    const filterList = getWordFilter();
    if (shouldFilterContent(post.content, filterList)) {
        return document.createDocumentFragment();
    }

    const card = document.createElement('div');
    card.className = 'status';
    card.dataset.id = post.id;
    card.dataset.platform = platform;

    let boosterInfo = '';
    if (status.reblog) {
        boosterInfo = `<div class="booster-info">${ICONS.boost} Boosted by ${status.account.display_name}</div>`;
    }
    
    let inReplyToInfo = '';
    if (post.in_reply_to_account_id) {
        inReplyToInfo = `<div class="reply-info" data-action="view-thread">${ICONS.reply} Replying to some folks...</div>`;
    }

    let mediaHTML = '';
    if (post.media_attachments.length > 0) {
        mediaHTML = `<div class="media-grid media-grid-${post.media_attachments.length}">`;
        post.media_attachments.forEach(attachment => {
            if (attachment.type === 'image') {
                mediaHTML += `<img src="${attachment.url}" alt="${attachment.description || 'Post media'}" class="media-attachment" data-full-url="${attachment.url}" loading="lazy">`;
            } else if (attachment.type === 'video') {
                mediaHTML += `<video src="${attachment.url}" class="media-attachment" controls></video>`;
            }
        });
        mediaHTML += `</div>`;
    }
    
    let optionsMenuHTML = `
        <div class="post-options-container">
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="mention">Mention @${author.acct}</button>
                ${isOwnPost ? `<button data-action="edit">${ICONS.edit} Edit</button><button data-action="delete">${ICONS.delete} Delete</button>` : ''}
                <button data-action="mute">Mute @${author.acct}</button>
                <button data-action="block">Block @${author.acct}</button>
            </div>
        </div>
    `;

    card.innerHTML = `
        ${boosterInfo}
        <div class="status-body-content">
            ${inReplyToInfo}
            <div class="status-header">
                <div class="status-header-main" data-action="view-profile">
                    <img class="avatar" src="${author.avatar}" alt="${author.display_name} avatar">
                    <div>
                        <span class="display-name">${author.display_name}</span>
                        <span class="acct">@${author.acct}</span>
                        <span class="timestamp">· ${formatTimestamp(post.created_at)}</span>
                    </div>
                </div>
                <div class="status-header-side">
                    ${optionsMenuHTML}
                    <div class="platform-icon-indicator">${platform === 'pixelfed' ? ICONS.pixelfed : ICONS.mastodon}</div>
                </div>
            </div>
            <div class="status-content">${post.content}</div>
            ${mediaHTML}
            <div class="status-footer">
                <button class="status-action" data-action="reply">${ICONS.reply} ${post.replies_count}</button>
                <button class="status-action ${status.reblogged ? 'active' : ''}" data-action="reblog">${ICONS.boost} ${post.reblogs_count}</button>
                <button class="status-action ${status.favourited ? 'active' : ''}" data-action="favorite">${ICONS.favorite} ${post.favourites_count}</button>
                <button class="status-action ${status.bookmarked ? 'active' : ''}" data-action="bookmark">${ICONS.bookmark}</button>
            </div>
        </div>
        <div class="edit-post-container"></div>
        <div class="conversation-container"></div>
    `;
    
    card.querySelector('[data-action="view-profile"]').addEventListener('click', e => {
        e.stopPropagation();
        actions.showProfilePage(platform, author.id);
    });

    card.querySelectorAll('.media-attachment').forEach(mediaEl => {
        if (mediaEl.tagName === 'IMG') {
            mediaEl.addEventListener('click', (e) => {
                e.stopPropagation();
                showImageModal(e.target.dataset.fullUrl);
            });
        }
    });

    card.querySelector('.status-body-content').addEventListener('dblclick', (e) => {
        if (!e.target.closest('a, button, input, textarea')) {
            actions.showStatusDetail(post.id, platform);
        }
    });
    
    card.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.target.closest('.status-action').dataset.action;
            switch(action) {
                case 'reply':
                    if (isTimelineContext) {
                        actions.replyToStatus(post, card);
                    }
                    break;
                case 'reblog':
                case 'favorite':
                case 'bookmark':
                    actions.toggleAction(action, status, e.target.closest('.status-action'));
                    break;
            }
        });
    });
    
    return card;
}


export async function renderStatusDetail(state, statusId, actions, platform = 'mastodon') {
    const container = document.getElementById('status-detail-view');
    container.innerHTML = 'Loading post...';

    const instanceUrl = platform === 'pixelfed' ? state.pixelfedInstanceUrl : state.instanceUrl;
    const accessToken = platform === 'pixelfed' ? state.pixelfedAccessToken : state.accessToken;

    try {
        const { data: context } = await apiFetch(instanceUrl, accessToken, `/api/v1/statuses/${statusId}/context`);
        const { data: mainStatus } = await apiFetch(instanceUrl, accessToken, `/api/v1/statuses/${statusId}`);
        
        container.innerHTML = '';
        
        if (context.ancestors) {
            context.ancestors.forEach(status => {
                container.appendChild(renderStatus(status, state.currentUser, actions, state.settings, platform, false));
            });
        }
        
        const mainPost = renderStatus(mainStatus, state.currentUser, actions, state.settings, platform, false);
        mainPost.classList.add('main-thread-post');
        container.appendChild(mainPost);
        
        if (context.descendants) {
            context.descendants.forEach(status => {
                container.appendChild(renderStatus(status, state.currentUser, actions, state.settings, platform, false));
            });
        }
        
    } catch (error) {
        container.innerHTML = `<p>Could not load post. ${error.message}</p>`;
    }
}
