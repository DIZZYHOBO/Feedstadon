import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { apiFetch } from './api.js';

export function renderPollHTML(poll) {
    const totalVotes = poll.votes_count;
    const canVote = !poll.voted && !poll.expired;

    const optionsHTML = poll.options.map((option, index) => {
        if (canVote) {
            return `<div class="poll-option" data-choice="${index}">${option.title}</div>`;
        } else {
            const percent = totalVotes > 0 ? ((option.votes_count / totalVotes) * 100).toFixed(1) : 0;
            const isVoted = poll.own_votes && poll.own_votes.includes(index);
            return `
                <div class="poll-result ${isVoted ? 'voted' : ''}">
                    <div class="poll-result-bar" style="width: ${percent}%;"></div>
                    <span class="poll-result-label">${option.title}</span>
                    <span class="poll-result-percent">${percent}%</span>
                </div>
            `;
        }
    }).join('');

    const infoText = poll.expired ? `Poll ended · ${totalVotes} votes` : `${totalVotes} votes · Poll ends soon`;

    return `
        <div class="poll-container" data-poll-id="${poll.id}">
            ${optionsHTML}
            <div class="poll-info">${infoText}</div>
        </div>
    `;
}


export function renderStatus(status, state, actions, isThreadContext = false) {
    const originalPost = status.reblog || status;

    if (state.settings.hideNsfw && originalPost.sensitive) {
        return null;
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.dataset.id = originalPost.id;

    let boosterInfo = '';
    if (status.reblog && !isThreadContext) {
        boosterInfo = `<div class="booster-info">${ICONS.boost} Boosted by ${status.account.display_name}</div>`;
    }

    let replyInfo = '';
    if (originalPost.in_reply_to_id && !isThreadContext) {
        replyInfo = `<div class="reply-info" data-action="view-parent" data-parent-id="${originalPost.in_reply_to_id}">
                        ${ICONS.reply} Replying to thread
                     </div>`;
    }

    let optionsMenuHTML = '';
    if (state.currentUser && originalPost.account.id !== state.currentUser.id) {
        optionsMenuHTML = `
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="mute">Mute @${originalPost.account.acct}</button>
            </div>
        `;
    } else if (state.currentUser && originalPost.account.id === state.currentUser.id) {
        optionsMenuHTML = `
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="edit">Edit</button>
                <button data-action="delete">Delete</button>
            </div>
        `;
    }

    let mediaHTML = '';
    if (originalPost.media_attachments && originalPost.media_attachments.length > 0) {
        mediaHTML += '<div class="status-media">';
        originalPost.media_attachments.forEach(attachment => {
            if (attachment.type === 'image') {
                mediaHTML += `<img src="${attachment.url}" alt="${attachment.description || 'Post image'}" loading="lazy">`;
            } else if (attachment.type === 'video' || attachment.type === 'gifv') {
                mediaHTML += `<video src="${attachment.url}" controls loop muted playsinline></video>`;
            }
        });
        mediaHTML += '</div>';
    }

    let pollHTML = '';
    if (originalPost.poll) {
        pollHTML = renderPollHTML(originalPost.poll);
    }

    const timestamp = formatTimestamp(originalPost.created_at);

    statusDiv.innerHTML = `
        ${boosterInfo}
        ${replyInfo}
        <div class="status-body-content">
            <div class="status-header">
                <img class="avatar" src="${originalPost.account.avatar_static}" alt="${originalPost.account.display_name} avatar">
                <div>
                    <span class="display-name">${originalPost.account.display_name}</span>
                    <span class="acct">@${originalPost.account.acct}</span>
                    <span class="timestamp">· ${timestamp}</span>
                </div>
                ${optionsMenuHTML}
            </div>
            <div class="status-content">${originalPost.content}</div>
            ${pollHTML}
            ${mediaHTML}
            <div class="status-footer">
                <button class="status-action" data-action="reply">${ICONS.reply} ${originalPost.replies_count}</button>
                <button class="status-action ${originalPost.reblogged ? 'active' : ''}" data-action="boost">${ICONS.boost} ${originalPost.reblogs_count}</button>
                <button class="status-action ${originalPost.favourited ? 'active' : ''}" data-action="favorite">${ICONS.favorite} ${originalPost.favourites_count}</button>
                <button class="status-action ${originalPost.bookmarked ? 'active' : ''}" data-action="bookmark">${ICONS.bookmark}</button>
            </div>
        </div>
    `;

    // --- Event Listeners ---
    
    statusDiv.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.classList.contains('hashtag')) {
            e.preventDefault();
            const tagName = link.getAttribute('href').split('/tags/')[1];
            if (tagName) actions.showHashtagTimeline(tagName);
            return;
        }

        const pollOption = e.target.closest('.poll-option');
        if (pollOption) {
            e.preventDefault();
            const pollContainer = pollOption.closest('.poll-container');
            const pollId = pollContainer.dataset.pollId;
            const choice = parseInt(pollOption.dataset.choice, 10);
            actions.voteOnPoll(pollId, [choice], statusDiv);
            return;
        }

        const replyBanner = e.target.closest('.reply-info');
        if (replyBanner) {
            e.preventDefault();
            const parentId = replyBanner.dataset.parentId;
            if (parentId) actions.showStatusDetail(parentId);
            return;
        }
    });

    const avatar = statusDiv.querySelector('.avatar');
    const displayName = statusDiv.querySelector('.display-name');
    if (avatar) avatar.onclick = () => actions.showProfile(originalPost.account.id);
    if (displayName) displayName.onclick = () => actions.showProfile(originalPost.account.id);

    statusDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = button.dataset.action;
            actions.toggleAction(action, originalPost, button);
        });
    });

    const optionsBtn = statusDiv.querySelector('.post-options-btn');
    if (optionsBtn) {
        const menu = statusDiv.querySelector('.post-options-menu');
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.post-options-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
        
        const muteBtn = menu.querySelector('[data-action="mute"]');
        if (muteBtn) {
            muteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                actions.muteAccount(originalPost.account.id);
            });
        }

        const editBtn = menu.querySelector('[data-action="edit"]');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                actions.showEditModal(originalPost);
            });
        }

        const deleteBtn = menu.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                actions.showDeleteModal(originalPost.id);
            });
        }
    }

    return statusDiv;
}

export async function renderStatusDetail(state, statusId) {
    const container = document.getElementById('status-detail-view');
    container.innerHTML = '<p>Loading status...</p>';

    try {
        const context = (await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`)).data;
        container.innerHTML = ''; // Clear loading message

        const statusList = document.createElement('div');
        statusList.className = 'status-list';

        // Render ancestors
        if (context.ancestors && context.ancestors.length > 0) {
            context.ancestors.forEach(ancestor => {
                const statusEl = renderStatus(ancestor, state, state.actions, true);
                if (statusEl) {
                    statusList.appendChild(statusEl);
                }
            });
        }

        // Render the main status
        const mainStatusResponse = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
        const mainStatus = mainStatusResponse.data;
        const mainStatusEl = renderStatus(mainStatus, state, state.actions, true);
        if (mainStatusEl) {
            mainStatusEl.classList.add('main-thread-post');
            statusList.appendChild(mainStatusEl);
        }


        // Render descendants
        if (context.descendants && context.descendants.length > 0) {
            context.descendants.forEach(descendant => {
                const statusEl = renderStatus(descendant, state, state.actions, true);
                if (statusEl) {
                    statusList.appendChild(statusEl);
                }
            });
        }
        container.appendChild(statusList);


    } catch (err) {
        console.error('Failed to load status detail:', err);
        container.innerHTML = '<p>Could not load status details.</p>';
    }
}
