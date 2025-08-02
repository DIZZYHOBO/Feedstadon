import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

// Helper function to render a poll
function renderPollHTML(poll, state) {
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

    const info = poll.expired ? `Poll ended · ${totalVotes} votes` : `${totalVotes} votes · Poll ends soon`;

    return `
        <div class="poll-container" data-poll-id="${poll.id}">
            ${optionsHTML}
            <div class="poll-info">${info}</div>
        </div>
    `;
}


export function renderStatus(status, state, actions) {
    const originalPost = status.reblog || status;

    if (state.settings.hideNsfw && originalPost.sensitive) {
        return null;
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.dataset.id = originalPost.id;

    const boosterInfo = status.reblog ? `<div class="booster-info">Boosted by ${status.account.display_name}</div>` : '';

    let optionsMenuHTML = '';
    if (state.currentUser && originalPost.account.id === state.currentUser.id) {
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
        mediaHTML = '...'; // Media rendering logic here
    }

    // ADDED: Check for and render a poll
    let pollHTML = '';
    if (originalPost.poll) {
        pollHTML = renderPollHTML(originalPost.poll, state);
    }

    const timestamp = formatTimestamp(originalPost.created_at);

    statusDiv.innerHTML = `
        <div class="status-header">
            </div>
        <div class="status-content">${originalPost.content}</div>
        ${pollHTML}
        ${mediaHTML}
        <div class="status-footer">
            </div>
    `;

    // --- Event Listeners ---
    
    statusDiv.addEventListener('click', (e) => {
        // Handle hashtag clicks
        const hashtagLink = e.target.closest('a.hashtag');
        if (hashtagLink) {
            e.preventDefault();
            const tagName = hashtagLink.getAttribute('href').split('/tags/')[1];
            if (tagName) actions.showHashtagTimeline(tagName);
            return;
        }

        // ADDED: Handle poll voting clicks
        const pollOption = e.target.closest('.poll-option');
        if (pollOption) {
            e.preventDefault();
            const pollContainer = pollOption.closest('.poll-container');
            const pollId = pollContainer.dataset.pollId;
            const choice = parseInt(pollOption.dataset.choice, 10);
            actions.voteOnPoll(pollId, [choice], statusDiv);
        }
    });

    // ... other event listeners (avatar, display name, footer buttons, options menu) are unchanged ...

    return statusDiv;
}
