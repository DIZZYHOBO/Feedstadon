import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderSingleNotification(notification) {
    const item = document.createElement('div');
    item.className = 'notification-item';

    item.innerHTML = `
        <div class="notification-icon">${notification.icon}</div>
        <img class="notification-avatar" src="${notification.authorAvatar}" alt="avatar">
        <div class="notification-content">
            <p>${notification.content}</p>
            ${notification.contextHTML}
        </div>
        <div class="timestamp">${formatTimestamp(notification.timestamp)}</div>
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

        let lemmyReplyNotifs = [];
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (lemmyInstance) {
            const repliesResponse = await apiFetch(lemmyInstance, null, '/api/v3/user/replies?sort=New&unread_only=false', {}, 'lemmy');
            lemmyReplyNotifs = repliesResponse.data.replies || [];
        }

        // --- Data Transformation Step ---
        // Transform the raw API data into a simple, consistent format.
        const allNotifications = [
            // Mastodon Notifications
            ...mastodonNotifs.map(n => ({
                platform: 'mastodon',
                date: n.created_at,
                icon: ICONS.favorite, // Placeholder, can be improved
                content: `<strong>${n.account.display_name}</strong> ${n.type}d your post.`,
                contextHTML: `<div class="notification-context">${n.status.content.replace(/<[^>]*>/g, "")}</div>`,
                authorAvatar: n.account.avatar_static,
                timestamp: n.created_at
            })),
            // Lemmy Comment Reply Notifications
            ...lemmyReplyNotifs.map(n => {
                // Defensive check to ensure data exists before creating the object
                if (!n.comment_reply || !n.comment_reply.creator || !n.comment_reply.comment) {
                    return null;
                }
                const reply = n.comment_reply;
                return {
                    platform: 'lemmy',
                    date: reply.comment.published,
                    icon: ICONS.reply,
                    content: `<strong>${reply.creator.name}</strong> replied to your comment.`,
                    contextHTML: `<div class="notification-context">${reply.comment.content}</div>`,
                    authorAvatar: reply.creator.avatar || './images/logo.png',
                    timestamp: reply.comment.published
                };
            })
        ].filter(Boolean); // Filter out any null entries from failed transformations

        allNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));

        const renderFilteredNotifications = (filter) => {
            listContainer.innerHTML = '';
            const filtered = allNotifications.filter(n => filter === 'all' || n.platform === filter);
            
            if (filtered.length === 0) {
                listContainer.innerHTML = '<p>No notifications to show.</p>';
                return;
            }

            filtered.forEach(notification => {
                const item = renderSingleNotification(notification);
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
