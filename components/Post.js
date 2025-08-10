import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { formatTimestamp } from './utils.js';

export function renderStatus(status, currentUser, actions, settings) {
    const card = document.createElement('div');
    card.className = 'status';
    card.dataset.id = status.id;

    const isNsfw = status.sensitive;
    const shouldBlur = isNsfw && settings.hideNsfw;

    let mediaAttachmentsHTML = '';
    if (status.media_attachments && status.media_attachments.length > 0) {
        const gridClass = `media-grid-${status.media_attachments.length}`;
        mediaAttachmentsHTML += `<div class="media-grid ${gridClass}">`;
        status.media_attachments.forEach(attachment => {
            if (attachment.type === 'image') {
                mediaAttachmentsHTML += `<img src="${attachment.url}" alt="${attachment.description || 'Status media'}" class="media-attachment" loading="lazy">`;
            }
        });
        mediaAttachmentsHTML += `</div>`;
    }

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main" data-account-id="${status.account.id}">
                    <img src="${status.account.avatar}" alt="${status.account.display_name}'s avatar" class="avatar">
                    <div>
                        <div class="display-name">${status.account.display_name}</div>
                        <div class="acct">@${status.account.acct}</div>
                    </div>
                </div>
                <div class="status-header-side">
                    <a href="#status/${status.id}" class="timestamp">${formatTimestamp(status.created_at)}</a>
                </div>
            </div>
            <div class="status-content">${status.content}</div>
            ${mediaAttachmentsHTML}
        </div>
        <div class="status-footer">
            <button class="status-action reply-btn">${ICONS.comments} <span>${status.replies_count}</span></button>
            <button class="status-action reblog-btn ${status.reblogged ? 'active' : ''}">${ICONS.boost} <span>${status.reblogs_count}</span></button>
            <button class="status-action favorite-btn ${status.favourited ? 'active' : ''}">${ICONS.favorite} <span>${status.favourites_count}</span></button>
            <button class="status-action bookmark-btn ${status.bookmarked ? 'active' : ''}">${ICONS.bookmark}</button>
        </div>
    `;

    if (shouldBlur) {
        card.classList.add('nsfw-post');
        const contentToBlur = card.querySelector('.status-content');
        const mediaToBlur = card.querySelector('.media-grid');
        const bodyContent = card.querySelector('.status-body-content');

        if (contentToBlur) contentToBlur.remove();
        if (mediaToBlur) mediaToBlur.remove();

        const spoilerContainer = document.createElement('div');
        spoilerContainer.className = 'nsfw-spoiler';

        const showButton = document.createElement('button');
        showButton.className = 'nsfw-show-button';
        showButton.textContent = 'Show Potentially Sensitive Content';
        
        spoilerContainer.appendChild(showButton);
        
        if (contentToBlur) spoilerContainer.appendChild(contentToBlur);
        if (mediaToBlur) spoilerContainer.appendChild(mediaToBlur);

        bodyContent.appendChild(spoilerContainer);

        showButton.addEventListener('click', (e) => {
            e.stopPropagation();
            spoilerContainer.classList.add('revealed');
        });
    }

    card.querySelector('.status-header-main').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showProfilePage('mastodon', status.account.id, status.account.acct);
    });

    card.querySelector('.reply-btn').addEventListener('click', () => actions.replyToStatus(status, card));
    card.querySelector('.reblog-btn').addEventListener('click', (e) => actions.toggleAction('reblog', status, e.currentTarget));
    card.querySelector('.favorite-btn').addEventListener('click', (e) => actions.toggleAction('favorite', status, e.currentTarget));
    card.querySelector('.bookmark-btn').addEventListener('click', (e) => actions.toggleAction('bookmark', status, e.currentTarget));

    return card;
}

export async function renderStatusDetail(state, statusId, actions) {
    const view = document.getElementById('status-detail-view');
    view.innerHTML = 'Loading post...';
    
    try {
        const { data: context } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);
        const { data: status } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
        
        view.innerHTML = '';
        
        if (context.ancestors) {
            context.ancestors.forEach(ancestor => {
                view.appendChild(renderStatus(ancestor, state.currentUser, actions, state.settings));
            });
        }
        
        const mainStatusCard = renderStatus(status, state.currentUser, actions, state.settings);
        mainStatusCard.classList.add('main-thread-post');
        view.appendChild(mainStatusCard);

        if (context.descendants) {
            context.descendants.forEach(descendant => {
                view.appendChild(renderStatus(descendant, state.currentUser, actions, state.settings));
            });
        }
    } catch (error) {
        console.error('Failed to render status detail:', error);
        view.innerHTML = '<p>Could not load post details.</p>';
    }
}
