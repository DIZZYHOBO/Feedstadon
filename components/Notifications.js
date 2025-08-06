import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderSingleNotification(notification) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `
        <div class="notification-icon">${notification.icon}</div>
        <img class="notification-avatar" src="${notification.authorAvatar}" alt="avatar" onerror="this.onerror=null;this.src='./images/logo.png';">
        <div class="notification-content">
            <p>${notification.content}</p>
            ${notification.contextHTML}
        </div>
        <div class="timestamp">${formatTimestamp(notification.timestamp)}</div>
    `;
    return item;
}

export async function updateNotificationBell() {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    const notifBtn = document.getElementById('notifications-btn');
    if (!lemmyInstance) {
        notifBtn.classList.remove('unread');
        return;
    };

    try {
        const [mentionCount, pmCount, replyCount] = await Promise.all([
            apiFetch(lemmyInstance, null, '/api/v3/user/mention/count', {}, 'lemmy'),
            apiFetch(lemmyInstance, null, '/api/v3/private_message/count', {}, 'lemmy'),
            apiFetch(lemmyInstance, null, '/api/v3/user/replies', { sort: 'New', unread_only: 'true', limit: 1 }, 'lemmy')
        ]);
        
        const totalUnread = (mentionCount.data?.mentions || 0) + 
                              (pmCount.data?.private_messages || 0) + 
                              (replyCount.data?.replies?.length > 0 ? 1 : 0);

        if (totalUnread > 0) {
            notifBtn.classList.add('unread');
        } else {
            notifBtn.classList.remove('unread');
        }
    } catch (error) {
        console.error('Failed to check for unread notifications:', error);
        notifBtn.classList.remove('unread');
    }
}


export async function renderNotificationsPage(state, actions) {
    const container = document.getElementById('notifications-view');
    const subNav = container.querySelector('.notifications-sub-nav');
    const listContainer = container.querySelector('#notifications-list');

    subNav.innerHTML = `
        <div class="notifications-sub-nav-tabs">
            <button class="notifications-sub-nav-btn active" data-filter="all">All</button>
            <button class="notifications-sub-nav-btn" data-filter="lemmy">Lemmy</button>
            <button class="notifications-sub-nav-btn" data-filter="mastodon">Mastodon</button>
        </div>
    `;
    listContainer.innerHTML = 'Loading...';
    
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (lemmyInstance) {
            apiFetch(lemmyInstance, null, '/api/v3/user/mention/mark_as_read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ person_mention_id: -1, read: true })
            }, 'lemmy').then(() => updateNotificationBell());
        }

        let lemmyReplyNotifs = [];
        let lemmyMentionNotifs = [];
        let lemmyPrivateMessages = [];
        if (lemmyInstance) {
            const [repliesResponse, mentionsResponse, messagesResponse] = await Promise.all([
                apiFetch(lemmyInstance, null, '/api/v3/user/replies', { sort: 'New', unread_only: false }, 'lemmy'),
                apiFetch(lemmyInstance, null, '/api/v3/user/mention', { sort: 'New', unread_only: false }, 'lemmy'),
                apiFetch(lemmyInstance, null, '/api/v3/private_message/list', { unread_only: false }, 'lemmy')
            ]);
            lemmyReplyNotifs = repliesResponse.data.replies || [];
            lemmyMentionNotifs = mentionsResponse.data.mentions || [];
            lemmyPrivateMessages = messagesResponse.data.private_messages || [];
        }

        const allNotifications = [
            ...lemmyReplyNotifs.map(n => {
                if (!n?.comment_reply?.creator || !n?.comment_reply?.comment) return null;
                return {
                    platform: 'lemmy',
                    date: n.comment_reply.comment.published,
                    icon: ICONS.reply,
                    content: `<strong>${n.comment_reply.creator.name}</strong> replied to your comment.`,
                    contextHTML: `<div class="notification-context">${n.comment_reply.comment.content}</div>`,
                    authorAvatar: n.comment_reply.creator.avatar || './images/logo.png',
                    timestamp: n.comment_reply.comment.published,
                };
            }),
            ...lemmyMentionNotifs.map(n => {
                 if (!n?.person_mention?.creator || !n?.person_mention?.comment) return null;
                return {
                    platform: 'lemmy',
                    date: n.person_mention.comment.published,
                    icon: ICONS.reply,
                    content: `<strong>${n.person_mention.creator.name}</strong> mentioned you in a comment.`,
                    contextHTML: `<div class="notification-context">${n.person_mention.comment.content}</div>`,
                    authorAvatar: n.person_mention.creator.avatar || './images/logo.png',
                    timestamp: n.person_mention.comment.published,
                }
            }),
            ...lemmyPrivateMessages.map(n => {
                 if (!n?.private_message?.creator) return null;
                return {
                    platform: 'lemmy',
                    date: n.private_message.published,
                    icon: ICONS.message,
                    content: `<strong>${n.private_message.creator.name}</strong> sent you a private message.`,
                    contextHTML: `<div class="notification-context">${n.private_message.content}</div>`,
                    authorAvatar: n.private_message.creator.avatar || './images/logo.png',
                    timestamp: n.private_message.published,
                }
            })
        ].filter(Boolean);

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
        
        // Show the lemmy tab by default if there's a lemmy user
        const defaultTab = lemmyInstance ? 'lemmy' : 'all';
        subNav.querySelector(`.notifications-sub-nav-btn[data-filter="${defaultTab}"]`).classList.add('active');
        renderFilteredNotifications(defaultTab);

    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        listContainer.innerHTML = `<p>Could not load notifications. ${error.message}</p>`;
    }
}
