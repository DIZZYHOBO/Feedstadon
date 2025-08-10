import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp, getWordFilter, shouldFilterContent, processSpoilers } from './utils.js';
import { renderLoginPrompt } from './ui.js';
import { showImageModal } from './ui.js';

function renderMedia(attachments) {
    if (!attachments || attachments.length === 0) return '';
    return attachments.map(att => {
        if (att.type === 'image') {
            return `<div class="status-media"><img src="${att.url}" alt="${att.description || 'Status media'}" loading="lazy"></div>`;
        } else if (att.type === 'video') {
            return `<div class="status-media"><video src="${att.url}" controls loop playsinline></video></div>`;
        } else if (att.type === 'gifv') {
            return `<div class="status-media"><video src="${att.url}" autoplay muted loop playsinline></video></div>`;
        }
        return '';
    }).join('');
}

export function renderStatus(post, state, actions, settings) {
    if (settings && settings.hideNsfw && post.sensitive) {
        return null;
    }

    const filterList = getWordFilter();
    const combinedContent = `${post.content || ''}`;
    if (shouldFilterContent(combinedContent, filterList)) {
        return document.createDocumentFragment(); // Return an empty element to hide the post
    }

    const card = document.createElement('div');
    card.className = 'status';
    card.dataset.id = post.id;
    card.dataset.acct = post.account.acct;

    const htmlContent = processSpoilers(post.content);

    let optionsMenuHTML = `
        <div class="post-options-container">
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                 <button data-action="block-user" data-user-id="${post.account.id}">Block @${post.account.acct}</button>
            </div>
        </div>
    `;

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <a href="#/profile/mastodon/${post.account.id}" class="status-header-main">
                    <img src="${post.account.avatar}" class="avatar" alt="${post.account.display_name}'s avatar">
                    <div>
                        <span class="display-name">${post.account.display_name}</span>
                        <span class="acct">@${post.account.acct} · ${formatTimestamp(post.created_at)}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    ${optionsMenuHTML}
                    <div class="mastodon-icon-indicator">${ICONS.mastodon}</div>
                </div>
            </div>
            <div class="status-content">${htmlContent}</div>
            ${renderMedia(post.media_attachments)}
        </div>
        <div class="status-footer">
            <button class="status-action reply-btn">${ICONS.reply}</button>
            <button class="status-action boost-btn ${post.reblogged ? 'active' : ''}">${ICONS.boost} <span>${post.reblogs_count}</span></button>
            <button class="status-action favorite-btn ${post.favourited ? 'active' : ''}">${ICONS.favorite} <span>${post.favourites_count}</span></button>
            <button class="status-action bookmark-btn ${post.bookmarked ? 'active' : ''}">${ICONS.bookmark}</button>
        </div>
        <div class="quick-reply-container" style="display: none;"></div>
        <div class="conversation-container" style="display: none;"></div>
    `;

    card.querySelectorAll('.status-media img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageModal(img.src);
        });
    });

    card.querySelector('.reply-btn').addEventListener('click', () => actions.replyToStatus(post, card));
    card.querySelector('.boost-btn').addEventListener('click', (e) => actions.toggleAction('reblog', post, e.currentTarget));
    card.querySelector('.favorite-btn').addEventListener('click', (e) => actions.toggleAction('favorite', post, e.currentTarget));
    card.querySelector('.bookmark-btn').addEventListener('click', (e) => actions.toggleAction('bookmark', post, e.currentTarget));
    
    let pressTimer;
    card.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            const isOwn = post.account.id === state.currentUser.id;
            let menuItems = [
                { label: `${ICONS.delete} Block @${post.account.acct}`, action: () => {
                    if (confirm('Are you sure you want to block this user?')) {
                        actions.mastodonBlock(post.account.id, true);
                    }
                }},
            ];
            if (isOwn) {
                 menuItems.push(
                    { label: `${ICONS.edit} Edit`, action: () => {
                        actions.showComposeModalWithReply(post);
                    }},
                    { label: `${ICONS.delete} Delete`, action: () => {
                        if (confirm('Are you sure you want to delete this post?')) {
                            actions.deleteStatus(post.id);
                        }
                    }}
                );
            }
            actions.showContextMenu(e, menuItems);
        }, 500);
    });
    card.addEventListener('touchend', () => clearTimeout(pressTimer));
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const isOwn = post.account.id === state.currentUser.id;
        let menuItems = [
            { label: `${ICONS.delete} Block @${post.account.acct}`, action: () => {
                if (confirm('Are you sure you want to block this user?')) {
                    actions.mastodonBlock(post.account.id, true);
                }
            }},
        ];
        if (isOwn) {
             menuItems.push(
                { label: `${ICONS.edit} Edit`, action: () => {
                    actions.showComposeModalWithReply(post);
                }},
                { label: `${ICONS.delete} Delete`, action: () => {
                    if (confirm('Are you sure you want to delete this post?')) {
                        actions.deleteStatus(post.id);
                    }
                }}
            );
        }
        actions.showContextMenu(e, menuItems);
    });

    return card;
}

export async function renderStatusDetail(state, statusId, actions) {
    const detailView = document.getElementById('status-detail-view');
    detailView.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        const status = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
        const context = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);

        detailView.innerHTML = ''; 

        if (context.ancestors && context.ancestors.length > 0) {
            context.ancestors.forEach(ancestor => {
                const ancestorCard = renderStatus(ancestor, state, actions, state.settings);
                if(ancestorCard) detailView.appendChild(ancestorCard);
            });
        }
        
        const mainStatusCard = renderStatus(status, state, actions, state.settings);
        if (mainStatusCard) {
            mainStatusCard.classList.add('status-detail-main');
            detailView.appendChild(mainStatusCard);
        }

        if (context.descendants && context.descendants.length > 0) {
            context.descendants.forEach(descendant => {
                const descendantCard = renderStatus(descendant, state, actions, state.settings);
                if (descendantCard) detailView.appendChild(descendantCard);
            });
        }

    } catch (error) {
        console.error('Error fetching status detail:', error);
        detailView.innerHTML = `<p>Error loading status. ${error.message}</p>`;
    }
}
