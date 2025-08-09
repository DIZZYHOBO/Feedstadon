import { ICONS } from './icons.js';
import { apiFetch } from './api.js';

function timeSince(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
}

export function renderStatus(status, currentUser, actions, settings, platform = 'mastodon') {
    const card = document.createElement('div');
    card.className = 'status';
    card.dataset.id = status.id;
    card.dataset.platform = platform;

    if (status.reblog) {
        const reblogInfo = document.createElement('div');
        reblogInfo.className = 'reblog-info';
        reblogInfo.innerHTML = `${ICONS.reblog} Reblogged by ${status.account.display_name}`;
        card.appendChild(reblogInfo);
        status = status.reblog; // Show the reblogged status as the main content
    }

    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = status.account.avatar;
    avatar.addEventListener('click', () => {
        if (status.account && status.account.id) {
            actions.showProfilePage(platform, status.account.id);
        }
    });

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';

    const header = document.createElement('div');
    header.className = 'status-header';
    const displayName = document.createElement('span');
    displayName.className = 'display-name';
    displayName.textContent = status.account.display_name;
    displayName.addEventListener('click', () => {
        if (status.account && status.account.id) {
            actions.showProfilePage(platform, status.account.id);
        }
    });

    const acct = document.createElement('span');
    acct.className = 'acct';
    acct.textContent = `@${status.account.acct}`;
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = `· ${timeSince(status.created_at)}`;

    header.append(displayName, acct, time);

    const content = document.createElement('div');
    content.className = 'status-content';
    content.innerHTML = status.content;
    content.querySelectorAll('a').forEach(a => a.target = '_blank');
    
    // Media attachments
    if (status.media_attachments && status.media_attachments.length > 0) {
        const mediaGrid = document.createElement('div');
        mediaGrid.className = `media-grid media-grid-${status.media_attachments.length}`;
        status.media_attachments.forEach(media => {
            if (media.type === 'image') {
                const img = document.createElement('img');
                img.src = media.preview_url || media.url;
                img.className = 'media-attachment';
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    actions.showImageModal(media.url);
                });
                mediaGrid.appendChild(img);
            } else if (media.type === 'video' || media.type === 'gifv') {
                const video = document.createElement('video');
                video.src = media.url;
                video.className = 'media-attachment';
                video.controls = true;
                mediaGrid.appendChild(video);
            }
        });
        content.appendChild(mediaGrid);
    }
    
    // Polls
    if (status.poll) {
        const pollContainer = document.createElement('div');
        pollContainer.className = 'poll-container';
        status.poll.options.forEach(option => {
            const pollOption = document.createElement('div');
            pollOption.className = 'poll-option';
            pollOption.textContent = option.title;
            const voteCount = document.createElement('span');
            voteCount.textContent = ` (${option.votes_count || 0} votes)`;
            pollOption.appendChild(voteCount);
            pollContainer.appendChild(pollOption);
        });
        content.appendChild(pollContainer);
    }

    const actionsBar = document.createElement('div');
    actionsBar.className = 'status-actions';
    const replyBtn = document.createElement('button');
    replyBtn.innerHTML = ICONS.reply;
    replyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actions.replyToStatus(status, card);
    });

    const reblogBtn = document.createElement('button');
    reblogBtn.innerHTML = ICONS.reblog;
    if (status.reblogged) reblogBtn.classList.add('active');
    reblogBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actions.toggleAction('reblog', status, reblogBtn);
    });

    const favoriteBtn = document.createElement('button');
    favoriteBtn.innerHTML = ICONS.favorite;
    if (status.favourited) favoriteBtn.classList.add('active');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actions.toggleAction('favorite', status, favoriteBtn);
    });

    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.innerHTML = ICONS.bookmark;
    if (status.bookmarked) bookmarkBtn.classList.add('active');
    bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actions.toggleAction('bookmark', status, bookmarkBtn);
    });

    const moreBtn = document.createElement('button');
    moreBtn.innerHTML = ICONS.more;
    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuItems = [
            { label: 'Copy Link', action: () => navigator.clipboard.writeText(status.url) },
            { label: 'Screenshot', action: () => actions.showScreenshotPage(null, status) }
        ];
        if (currentUser && currentUser.id === status.account.id) {
            menuItems.push({ label: 'Delete', action: () => actions.deleteStatus(status.id) });
            menuItems.push({ label: 'Edit', action: () => actions.editStatus(status.id, prompt("Enter new content:")) });
        }
        actions.showContextMenu(e, menuItems);
    });
    
    actionsBar.append(replyBtn, reblogBtn, favoriteBtn, bookmarkBtn, moreBtn);

    const conversationContainer = document.createElement('div');
    conversationContainer.className = 'conversation-container';
    conversationContainer.style.display = 'none';

    contentWrapper.append(header, content, actionsBar, conversationContainer);
    card.append(avatar, contentWrapper);
    
    card.addEventListener('click', (e) => {
        // Avoid navigating when clicking on links, buttons, or the interactive part of the card
        if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON' && !e.target.closest('.status-actions')) {
             actions.showStatusDetail(status.id, platform);
        }
    });

    return card;
}

export async function renderStatusDetail(state, statusId, actions, platform = 'mastodon') {
    const view = document.getElementById('status-detail-view');
    view.innerHTML = 'Loading post...';
    
    const instanceUrl = platform === 'pixelfed' ? state.pixelfedInstanceUrl : state.instanceUrl;
    const accessToken = platform === 'pixelfed' ? state.pixelfedAccessToken : state.accessToken;

    try {
        const { data: status } = await apiFetch(instanceUrl, accessToken, `/api/v1/statuses/${statusId}`);
        const { data: context } = await apiFetch(instanceUrl, accessToken, `/api/v1/statuses/${statusId}/context`);
        
        view.innerHTML = '';
        const mainStatusCard = renderStatus(status, state.currentUser, actions, state.settings, platform);
        view.appendChild(mainStatusCard);

        const contextContainer = document.createElement('div');
        contextContainer.className = 'context-container';
        if (context.ancestors && context.ancestors.length > 0) {
            const ancestorsDiv = document.createElement('div');
            ancestorsDiv.className = 'ancestors';
            context.ancestors.forEach(ancestor => {
                ancestorsDiv.appendChild(renderStatus(ancestor, state.currentUser, actions, state.settings, platform));
            });
            contextContainer.appendChild(ancestorsDiv);
        }
        
        if (context.descendants && context.descendants.length > 0) {
            const descendantsDiv = document.createElement('div');
            descendantsDiv.className = 'descendants';
            context.descendants.forEach(descendant => {
                descendantsDiv.appendChild(renderStatus(descendant, state.currentUser, actions, state.settings, platform));
            });
            contextContainer.appendChild(descendantsDiv);
        }
        
        view.appendChild(contextContainer);

    } catch (error) {
        view.innerHTML = `<p>Could not load post details. ${error.message}</p>`;
    }
}
