import { ICONS } from './icons.js';
import { formatTimestamp, getWordFilter, shouldFilterContent } from './utils.js';
import { apiFetch } from './api.js';
import { showImageModal } from './ui.js';

function renderPoll(poll, statusId, actions) {
    const container = document.createElement('div');
    container.className = 'poll-container';

    if (poll.voted) {
        // Render results
        poll.options.forEach((option, index) => {
            const percentage = poll.votes_count > 0 ? (option.votes_count / poll.votes_count * 100).toFixed(1) : 0;
            const result = document.createElement('div');
            result.className = 'poll-result';
            if (poll.own_votes.includes(index)) {
                result.classList.add('voted');
            }
            result.innerHTML = `
                <div class="poll-result-bar" style="width: ${percentage}%;"></div>
                <span class="poll-result-label">${option.title}</span>
                <span class="poll-result-percent">${percentage}%</span>
            `;
            container.appendChild(result);
        });
    } else {
        // Render options
        poll.options.forEach((option, index) => {
            const optionEl = document.createElement('button');
            optionEl.className = 'poll-option';
            optionEl.textContent = option.title;
            optionEl.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const updatedPoll = await actions.voteInPoll(poll.id, [index]);
                    const pollContainer = e.target.closest('.poll-container');
                    const newPoll = renderPoll(updatedPoll, statusId, actions);
                    pollContainer.replaceWith(newPoll);
                } catch (error) {
                    console.error('Failed to vote:', error);
                }
            });
            container.appendChild(optionEl);
        });
    }
    
    const info = document.createElement('div');
    info.className = 'poll-info';
    info.textContent = `${poll.votes_count} votes · ${poll.expired ? 'Final results' : 'Poll ends soon'}`;
    container.appendChild(info);

    return container;
}

function renderConversationPost(post, currentUser, actions) {
    const postEl = document.createElement('div');
    postEl.className = 'status conversation-post';
    postEl.innerHTML = `
        <div class="status-header">
             <img class="avatar" src="${post.account.avatar}" alt="${post.account.display_name} avatar">
             <div>
                <span class="display-name">${post.account.display_name}</span>
                <span class="acct">@${post.account.acct}</span>
             </div>
        </div>
        <div class="status-content">${post.content}</div>
        <div class="status-footer">
            <button class="status-action reply-to-comment-btn" data-acct="@${post.account.acct}">Reply</button>
        </div>
    `;
    
    postEl.querySelector('.reply-to-comment-btn').addEventListener('click', (e) => {
        const acct = e.target.dataset.acct;
        const mainReplyTextarea = postEl.closest('.conversation-container').querySelector('.conversation-reply-textarea');
        mainReplyTextarea.value = `${acct} `;
        mainReplyTextarea.focus();
    });

    return postEl;
}

export function renderStatus(status, currentUser, actions, settings, isTimelineContext = false) {
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
        const attachment = post.media_attachments[0];
        if (attachment.type === 'image') {
            mediaHTML = `<div class="status-media"><img src="${attachment.url}" alt="${attachment.description || 'Post media'}" loading="lazy"></div>`;
        } else if (attachment.type === 'video') {
            mediaHTML = `<div class="status-media"><video src="${attachment.url}" controls></video></div>`;
        }
    }
    
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = post.content.match(youtubeRegex);
    if (youtubeMatch) {
        mediaHTML += `
            <div class="video-embed-container">
                <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>
            </div>
        `;
    }
    
    let pollHTML = '';
    if (post.poll) {
        pollHTML = renderPoll(post.poll, post.id, actions).outerHTML;
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
                    <div class="platform-icon-indicator">${ICONS.mastodon}</div>
                </div>
            </div>
            <div class="status-content">${post.content}</div>
            ${mediaHTML}
            ${pollHTML}
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
        actions.showProfilePage('mastodon', author.id);
    });

    const mediaImg = card.querySelector('.status-media img');
    if (mediaImg) {
        mediaImg.style.cursor = 'pointer';
        mediaImg.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageModal(mediaImg.src);
        });
    }

    card.querySelector('.status-body-content').addEventListener('dblclick', () => {
        actions.showStatusDetail(post.id);
    });
    
    card.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.target.closest('.status-action').dataset.action;
            switch(action) {
                case 'reply':
                    if (isTimelineContext) {
                        actions.replyToStatus(post, card);
                    } else {
                        // In detail view, you might want to focus a main reply box, not implemented here.
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


export async function renderStatusDetail(state, statusId, actions) {
    const container = document.getElementById('status-detail-view');
    container.innerHTML = 'Loading post...';

    try {
        const { data: context } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);
        const { data: mainStatus } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
        
        container.innerHTML = '';
        
        if (context.ancestors) {
            context.ancestors.forEach(status => {
                container.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
        }
        
        const mainPost = renderStatus(mainStatus, state.currentUser, actions, state.settings);
        mainPost.classList.add('main-thread-post');
        container.appendChild(mainPost);
        
        if (context.descendants) {
            context.descendants.forEach(status => {
                container.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
        }
        
    } catch (error) {
        container.innerHTML = `<p>Could not load post. ${error.message}</p>`;
    }
}
