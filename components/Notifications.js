import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

/**
 * Parses a raw Lemmy notification object into a standardized format.
 * This function now handles multiple notification types.
 * @param {object} notification - The raw notification object from the Lemmy API.
 * @param {string} type - The type of notification (e.g., 'reply', 'mention').
 * @returns {object|null} A standardized object for rendering, or null if the type is unknown.
 */
function parseNotification(notification, type) {
    try {
        switch (type) {
            case 'reply':
                const reply = notification.comment_reply;
                return {
                    id: reply.id,
                    actor: reply.creator,
                    action: 'replied to your comment on',
                    post: reply.post,
                    community: reply.community,
                    content: reply.comment.content,
                    timestamp: reply.comment.published,
                    link: reply.comment.ap_id,
                    icon: ICONS.reply
                };
            case 'mention':
                const mention = notification.person_mention;
                return {
                    id: mention.id,
                    actor: mention.creator,
                    action: 'mentioned you in a comment on',
                    post: mention.post,
                    community: mention.community,
                    content: mention.comment.content,
                    timestamp: mention.comment.published,
                    link: mention.comment.ap_id,
                    icon: ICONS.mention // Assuming you add a mention icon
                };
            case 'like':
                const like = notification.post_like;
                return {
                    id: like.id,
                    actor: like.creator,
                    action: 'liked your post',
                    post: like.post,
                    community: like.community,
                    content: null, // No specific content for a like
                    timestamp: like.post.updated, // Or a more specific timestamp if available
                    link: like.post.ap_id,
                    icon: ICONS.favorite
                };
            // Add other cases for different notification types here
            default:
                console.warn('Unknown notification type:', type, notification);
                return null;
        }
    } catch (error) {
        console.error(`Failed to parse notification of type ${type}:`, error, notification);
        return null;
    }
}

/**
 * Renders a single notification item.
 * @param {object} notificationData - The parsed notification data.
 * @returns {HTMLElement} The rendered notification element.
 */
function renderNotificationItem(notificationData) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `
        <div class="notification-icon">${notificationData.icon}</div>
        <div class="notification-content">
            <p>
                <img src="${notificationData.actor.avatar}" class="notification-avatar" alt="${notificationData.actor.name}'s avatar">
                <strong>${notificationData.actor.name}</strong> ${notificationData.action} <strong>${notificationData.post.name}</strong>
            </p>
            ${notificationData.content ? `<div class="notification-context">${notificationData.content.replace(/<[^>]*>/g, "")}</div>` : ''}
        </div>
        <span class="timestamp">${formatTimestamp(notificationData.timestamp)}</span>
    `;
    item.addEventListener('click', () => {
        // Here you would navigate to the post or comment
        // For example: actions.showLemmyPostDetail({ post: notificationData.post });
        window.open(notificationData.link, '_blank');
    });
    return item;
}


/**
 * Fetches and renders all types of notifications.
 * This is the main function for the notifications view.
 * @param {object} state - The application state.
 * @param {object} actions - The application actions.
 */
export async function renderNotificationsPage(state, actions) {
    const container = document.getElementById('notifications-view');
    if (!container) {
        console.error("Notifications container not found!");
        return;
    }

    container.innerHTML = `
        <div class="timeline-sub-nav notifications-sub-nav">
             <button class="notifications-sub-nav-btn active" data-type="all">All</button>
             <button class="notifications-sub-nav-btn" data-type="replies">Replies</button>
             <button class="notifications-sub-nav-btn" data-type="mentions">Mentions</button>
        </div>
        <div id="notifications-list-container"><p>Loading notifications...</p></div>
    `;

    const listContainer = document.getElementById('notifications-list-container');

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        listContainer.innerHTML = '<p>Please log in to your Lemmy account to see notifications.</p>';
        return;
    }

    try {
        // Fetch all notification types in parallel
        const [repliesRes, mentionsRes] = await Promise.all([
            apiFetch(lemmyInstance, null, '/api/v3/user/replies', { unread_only: true }, 'lemmy'),
            apiFetch(lemmyInstance, null, '/api/v3/user/mentions', { unread_only: true }, 'lemmy'),
            // Add other notification fetches here, e.g., post likes
        ]);

        const allNotifications = [
            ...repliesRes.data.replies.map(n => parseNotification(n, 'reply')),
            ...mentionsRes.data.mentions.map(n => parseNotification(n, 'mention')),
            // ... and so on for other types
        ]
        .filter(Boolean) // Remove any nulls from parsing errors
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by most recent

        listContainer.innerHTML = '';

        if (allNotifications.length === 0) {
            listContainer.innerHTML = '<p>No new notifications.</p>';
            return;
        }

        allNotifications.forEach(notification => {
            listContainer.appendChild(renderNotificationItem(notification));
        });

    } catch (error) {
        console.error("Failed to fetch Lemmy notifications:", error);
        listContainer.innerHTML = `<p>Could not load notifications: ${error.message}</p>`;
    }
}
