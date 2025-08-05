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
        const allNotifications = [
            // Mastodon Notifications
            ...mastodonNotifs.map(n => ({
                platform: 'mastodon',
                date: n.created_at,
                icon: ICONS.favorite, // This can be improved to show different icons for different notification types
                content: `<strong>${n.account.display_name}</strong> ${n.type}d your post.`,
                contextHTML: `<div class="notification-context">${n.status.content.replace(/<[^>]*>/g, "")}</div>`,
                authorAvatar: n.account.avatar_static,
                timestamp: n.created_at
            })),
            
            // **FIXED SECTION**: Lemmy Comment Reply Notifications
            ...lemmyReplyNotifs.map(n => {
                // 1. Use optional chaining (?.) to safely access nested properties.
                // This prevents the "Cannot read properties of undefined" error.
                const creator = n?.comment_reply?.creator;
                const comment = n?.comment_reply?.comment;

                // 2. Add a robust check to ensure all necessary data is present before rendering.
                if (!creator || !comment) {
                    Vonsole.log(JSON.stringify(notificationObject, null, 2));
                    console.error("Skipping malformed Lemmy notification:", n);
                    return null; // This will be filtered out later.
                }

                // 3. Construct the unified notification object.
                return {
                    platform: 'lemmy',
                    date: comment.published,
                    icon: ICONS.reply,
                    content: `<strong>${creator.name}</strong> replied to your comment.`,
                    contextHTML: `<div class="notification-context">${comment.content}</div>`,
                    authorAvatar: creator.avatar || './images/logo.png',
                    timestamp: comment.published
                };
            })
        ].filter(Boolean); // 4. Filter out any null entries that resulted from malformed data.

        // Sort all notifications from all platforms by date.
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

        // Set up sub-navigation click handlers
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
// Instead of this:
// let avatarUrl = `https://.../${notification.creator.id}`;

// Do this:
if (notification && notification.creator && notification.creator.id) {
  let avatarUrl = `https://.../${notification.creator.id}`;
  // ... proceed to fetch ...
} else {
  console.error("Cannot construct avatar URL, creator or creator.id is missing.", notification);
  // Use a default avatar or skip rendering this part
}
