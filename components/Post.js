import { ICONS } from './icons.js';
import { timeAgo } from './utils.js';
// **FIX:** Importing the newly exported showImageModal function.
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

export function renderStatus(post, currentUser, actions, settings) {
    const card = document.createElement('div');
    card.className = 'status';
    card.dataset.id = post.id;
    card.dataset.acct = post.account.acct;

    const htmlContent = post.content;

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <a href="#/profile/mastodon/${post.account.id}" class="status-header-main">
                    <img src="${post.account.avatar}" class="avatar" alt="${post.account.display_name}'s avatar">
                    <div>
                        <span class="display-name">${post.account.display_name}</span>
                        <span class="acct">@${post.account.acct}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    <span class="timestamp">${timeAgo(post.created_at)}</span>
                    <div class="post-options-container"></div>
                </div>
            </div>
            <div class="status-content">${htmlContent}</div>
            ${renderMedia(post.media_attachments)}
            <div class="status-footer">
                <button class="status-action reply-btn">${ICONS.reply}</button>
                <button class="status-action boost-btn ${post.reblogged ? 'active' : ''}">${ICONS.boost} <span>${post.reblogs_count}</span></button>
                <button class="status-action favorite-btn ${post.favourited ? 'active' : ''}">${ICONS.favorite} <span>${post.favourites_count}</span></button>
                <button class="status-action bookmark-btn ${post.bookmarked ? 'active' : ''}">${ICONS.bookmark}</button>
            </div>
            <div class="quick-reply-container" style="display: none;"></div>
            <div class="conversation-container" style="display: none;"></div>
        </div>
    `;

    // **FIX:** Add click listeners to images to open the modal.
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
    
    return card;
}

export async function renderStatusDetail(state, statusId, actions) {
    const view = document.getElementById('status-detail-view');
    view.innerHTML = `<div class="status-list"></div>`;
    const list = view.querySelector('.status-list');

    try {
        const { data: status } = await state.api.v1.statuses.fetch(statusId);
        const { data: context } = await state.api.v1.statuses.fetchContext(statusId);

        context.ancestors.forEach(p => list.appendChild(renderStatus(p, state.currentUser, actions, state.settings)));
        
        const mainPost = renderStatus(status, state.currentUser, actions, state.settings);
        mainPost.classList.add('main-thread-post');
        list.appendChild(mainPost);

        context.descendants.forEach(p => {
            const replyContainer = document.createElement('div');
            replyContainer.className = 'comment-replies-container';
            replyContainer.appendChild(renderStatus(p, state.currentUser, actions, state.settings));
            list.appendChild(replyContainer);
        });
    } catch (error) {
        console.error('Failed to render status detail:', error);
        view.innerHTML = `<p>Could not load post details. It may have been deleted.</p>`;
    }
}
