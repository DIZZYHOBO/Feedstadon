import { ICONS } from './icons.js';
import { timeSince } from './utils.js';

export function renderNotification(notification, app) {
    const item = document.createElement('div');
    item.className = `notification-item notification-${notification.type}`;

    let icon = '';
    let content = '';

    switch (notification.type) {
        case 'mention':
            icon = ICONS.reply;
            content = `<strong>${notification.account.display_name}</strong> mentioned you:`;
            break;
        case 'favourite':
            icon = ICONS.favourite;
            content = `<strong>${notification.account.display_name}</strong> favourited your post.`;
            break;
        case 'reblog':
            icon = ICONS.reblog;
            content = `<strong>${notification.account.display_name}</strong> reblogged your post.`;
            break;
        case 'follow':
            icon = ICONS.follow;
            content = `<strong>${notification.account.display_name}</strong> followed you.`;
            break;
        default:
            content = `New notification: ${notification.type}`;
    }

    item.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <p>${content}</p>
            ${notification.status ? `<div class="notification-status-context">${notification.status.content}</div>` : ''}
            <small>${timeSince(new Date(notification.created_at))}</small>
        </div>
    `;

    item.addEventListener('click', () => {
        if (notification.status) {
            // This would ideally navigate to the specific post view
            console.log("Navigate to status:", notification.status.id);
        } else if (notification.account) {
            const profileId = `mastodon-${notification.account.id}-${notification.account.acct}`;
            window.location.hash = `profile/${profileId}`;
        }
    });

    return item;
}
