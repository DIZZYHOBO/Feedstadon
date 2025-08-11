import { ICONS } from './icons.js';
import { timeAgo, formatTimestamp, getWordFilter, shouldFilterContent, processSpoilers } from './utils.js';
import { showImageModal } from './ui.js';

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

    if (originalStatus.media_attachments.length > 0) {
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
            <button class="status-action" data-action="reply" title="Reply">${ICONS.reply || ''}</button>
            <button class="status-action ${status.reblogged ? 'active' : ''}" data-action="boost" title="Boost">${ICONS.reblog || ''} ${originalStatus.reblogs_count || 0}</button>
            <button class="status-action ${status.favourited ? 'active' : ''}" data-action="favourite" title="Favourite">${ICONS.favourite || ''} ${originalStatus.favourites_count || 0}</button>
            <button class="status-action ${status.bookmarked ? 'active' : ''}" data-action="bookmark" title="Bookmark">${ICONS.bookmark || ''}</button>
            <button class="status-action" data-action="more" title="More">${ICONS.more || ''}</button>
        </div>
        <div class="reply-container" style="display: none;"></div>
    `;

    // Add event listeners
    card.querySelector('.status-header-main').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showProfilePage('mastodon', e.currentTarget.dataset.id);
    });

    card.querySelector('.status-body-content').addEventListener('dblclick', (e) => {
        e.stopPropagation();
        actions.showPostDetail(originalStatus.id);
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
            showImageModal(img.dataset.fullUrl);
        });
    });

    card.querySelectorAll('.status-footer .status-action').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            actions.handleStatusAction(action, originalStatus.id, card, isSelf);
        });
    });

    return card;
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
