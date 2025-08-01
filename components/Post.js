import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

export async function fetchNotifications(state) {
    const container = document.getElementById('notifications-list');
    container.innerHTML = '<div class="notification-item">Loading...</div>';

    try {
        const notifications = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/notifications');
        container.innerHTML = ''; // Clear loading message

        if (notifications.length === 0) {
            container.innerHTML = '<div class="notification-item">You have no new notifications.</div>';
            return;
        }

        notifications.forEach(notification => {
            const item = document.createElement('a');
            item.className = 'notification-item';
            let icon = '';
            let content = '';

            switch (notification.type) {
                case 'favourite':
                    icon = ICONS.favorite;
                    content = `<strong>${notification.account.display_name}</strong> favorited your post.`;
                    item.href = notification.status.url;
                    break;
                case 'reblog':
                    icon = ICONS.boost;
                    content = `<strong>${notification.account.display_name}</strong> boosted your post.`;
                    item.href = notification.status.url;
                    break;
                case 'mention':
                    icon = ICONS.reply;
                    content = `<strong>${notification.account.display_name}</strong> mentioned you.`;
                    item.href = notification.status.url;
                    break;
                case 'follow':
                    icon = '👤'; // Using an emoji for follow as we don't have an icon
                    content = `<strong>${notification.account.display_name}</strong> followed you.`;
                    item.href = notification.account.url;
                    break;
                default:
                    return; // Skip unknown notification types
            }
            
            item.innerHTML = `
                <div class="notification-icon">${icon}</div>
                <img class="notification-avatar" src="${notification.account.avatar_static}" alt="${notification.account.display_name}">
                <div class="notification-content">${content}</div>
            `;
            item.target = '_blank'; // Open notification context in a new tab
            container.appendChild(item);
        });

    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        container.innerHTML = '<div class="notification-item">Could not load notifications.</div>';
    }
}
