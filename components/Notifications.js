import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderSingleNotification(notification, platform) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    let icon = '';
    let content = '';
    let contextHTML = '';

    if (platform === 'mastodon') {
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
        
        item.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <img class="notification-avatar" src="${notification.account.avatar_static}" alt="${notification.account.display_name}">
            <div class="notification-content">
                <p>${content}</p>
                ${contextHTML}
            </div>
            <div class="timestamp">${formatTimestamp(notification.created_at)}</div>
        `;
    } 
    // Placeholder for Lemmy notifications
    else if (platform === 'lemmy') {
        // This part needs to be implemented based on Lemmy's notification API structure
        item.innerHTML = `<div class="notification-icon">${ICONS.lemmy}</div><div class="notification-content"><p>Lemmy notification placeholder</p></div>`;
    }

    return item;
}

export async function renderNotificationsPage(state, actions) {
    const container = document.getElementById('notifications-view');
    container.innerHTML = `
        <div class="notifications-sub-nav">
            <div class="notifications-sub-nav-tabs">
                <button class="notifications-sub-nav-btn active" data-filter="all">All</button>
                <button class="notifications-sub-nav-btn" data-filter="lemmy">Lemmy</button>
                <button class="notifications-sub-nav-btn" data-filter="mastodon">Mastodon</button>
            </div>
        </div>
        <div id="notifications-list">Loading...</div>
    `;

    const listContainer = document.getElementById('notifications-list');
    
    try {
        let mastodonNotifs = [];
        // Only fetch if logged into Mastodon
        if (state.instanceUrl && state.accessToken) {
            const response = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/notifications');
            mastodonNotifs = response.data;
        }

        // const lemmyNotifs = await apiFetch(...) // Placeholder for Lemmy API call

        const allNotifications = [
            ...mastodonNotifs.map(n => ({ ...n, platform: 'mastodon' }))
            // ...lemmyNotifs.data.map(n => ({ ...n, platform: 'lemmy' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

        container.querySelectorAll('.notifications-sub-nav-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                container.querySelectorAll('.notifications-sub-nav-btn').forEach(btn => btn.classList.remove('active'));
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
