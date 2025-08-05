import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderSingleNotification(notification, platform) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    let icon = '';
    let content = '';
    let contextHTML = '';
    let authorAvatar = './images/php.png'; // default avatar
    let timestamp = new Date().toISOString();

    if (platform === 'mastodon') {
        authorAvatar = notification.account.avatar_static;
        timestamp = notification.created_at;
        switch (notification.type) {
            case 'favourite':
                icon = ICONS.favorite;
                content = `<strong>${notification.account.display_name}</strong> favourited your post.`;
                contextHTML = `<div class="notification-context">${notification.status.content.replace(/<[^>]*>/g, "")}</div>`;
                break;
            case 'reblog':
                icon = ICONS.boost;
                content = `<strong>${notification.account.display_name}</strong> boosted your post.`;
                contextHTML = `<div class="notification-context">${notification.status.content.replace(/<[^>]*>/g, "")}</div>`;
                break;
            case 'mention':
                icon = ICONS.reply;
                content = `<strong>${notification.account.display_name}</strong> mentioned you.`;
                contextHTML = `<div class="notification-context">${notification.status.content.replace(/<[^>]*>/g, "")}</div>`;
                break;
            case 'follow':
                icon = '👤';
                content = `<strong>${notification.account.display_name}</strong> followed you.`;
                break;
            default:
                return null;
        }
    } 
    else if (platform === 'lemmy') {
        if (notification.comment_reply) {
            const reply = notification.comment_reply;
            icon = ICONS.reply;
            content = `<strong>${reply.creator.name}</strong> replied to your comment.`;
            contextHTML = `<div class="notification-context">${reply.comment.content}</div>`;
            authorAvatar = reply.creator.avatar;
            timestamp = reply.comment.published;
        } else if (notification.person_mention) {
            const mention = notification.person_mention;
            icon = ICONS.reply; // Using reply icon for mentions
            content = `<strong>${mention.creator.name}</strong> mentioned you in a comment.`;
            contextHTML = `<div class="notification-context">${mention.comment.content}</div>`;
            authorAvatar = mention.creator.avatar;
            timestamp = mention.comment.published;
        } else {
            return null; // For other Lemmy notification types we don't handle yet
        }
    }

    item.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <img class="notification-avatar" src="${authorAvatar}" alt="avatar">
        <div class="notification-content">
            <p>${content}</p>
            ${contextHTML}
        </div>
        <div class="timestamp">${formatTimestamp(timestamp)}</div>
    `;

    return item;
}

export async function renderNotificationsPage(state, actions) {
    const container = document.getElementById('notifications-view');
    const subNav = container.querySelector('.notifications-sub-nav');
    const listContainer = container.querySelector('#notifications-list');

    subNav.innerHTML = `
        <button class="notifications-sub-nav-btn active" data-filter="all">All</button>
        <button class="notifications-sub-nav-btn" data-filter="lemmy">Lemmy</button>
        <button class="notifications-sub-nav-btn" data-filter="mastodon">Mastodon</button>
    `;
    listContainer.innerHTML = 'Loading...';
    
    try {
        let mastodonNotifs = [];
        if (state.instanceUrl && state.accessToken) {
            const response = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/notifications');
            mastodonNotifs = response.data;
        }

        let lemmyNotifs = [];
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (lemmyInstance) {
            const repliesResponse = await apiFetch(lemmyInstance, null, '/api/v3/user/reply?sort=New&unread_only=false', {}, 'lemmy');
            const mentionsResponse = await apiFetch(lemmyInstance, null, '/api/v3/user/mention?sort=New&unread_only=false', {}, 'lemmy');
            
            lemmyNotifs = [
                ...repliesResponse.data.replies.map(r => ({...r, type: 'reply'})),
                ...mentionsResponse.data.mentions.map(m => ({...m, type: 'mention'}))
            ];
        }

        const allNotifications = [
            ...mastodonNotifs.map(n => ({ ...n, platform: 'mastodon', date: n.created_at })),
            ...lemmyNotifs.map(n => ({ ...n, platform: 'lemmy', date: n.comment_reply ? n.comment_reply.comment.published : n.person_mention.comment.published }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const renderFilteredNotifications = (filter) => {
            listContainer.innerHTML = '';
            const filtered = allNotifications.filter(n => filter === 'all' || n.platform === filter);
            
            if (filtered.length === 0) {
                listContainer.innerHTML = '<p>No notifications to show.</p>';
                return;
            }

            filtered.forEach(notification => {
                const item = renderSingleNotification(notification, notification.platform);
                if (item) listContainer.appendChild(item);
            });
        };

        subNav.querySelectorAll('.notifications-sub-nav-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                subNav.querySelectorAll('.notifications-sub-nav-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                renderFilteredNotifications(e.target.dataset.filter);
            });
        });

        renderFilteredNotifications('all'); // Initial render

    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        listContainer.innerHTML = `<p>Could not load notifications. ${error.message}</p>`;
    }
}
