import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderSingleNotification(notification) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `
        <div class="notification-platform-icon">
            ${notification.platform === 'lemmy' ? ICONS.lemmy : ICONS.mastodon}
        </div>
        <div class="notification-icon">${notification.icon}</div>
        <img class="notification-avatar" src="${notification.authorAvatar}" alt="avatar" onerror="this.onerror=null;this.src='./images/php.png';">
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
    }

    try {
        // *** FIX: Removed private message (pms) fetching ***
        const [mentions, replies] = await Promise.all([
            apiFetch(lemmyInstance, null, '/api/v3/user/mention', { unread_only: true }, 'lemmy'),
            apiFetch(lemmyInstance, null, '/api/v3/user/replies', { sort: 'New', unread_only: true, limit: 50 }, 'lemmy')
        ]);
        
        const totalUnread = (mentions.data?.mentions?.length || 0) + 
                              (replies.data?.replies?.length || 0);

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

async function markItemsAsRead(lemmyInstance, unreadMentions) {
    // This function now runs independently and won't block rendering.
    try {
        for(const mention of unreadMentions) {
            try {
                await apiFetch(lemmyInstance, null, '/api/v3/user/mention/mark_as_read', {
                     method: 'POST',
                     body: { person_mention_id: mention.person_mention.id, read: true }
                }, 'lemmy');
            } catch (err) {
                console.error(`Failed to mark mention ${mention.person_mention.id} as read`, err);
            }
        }
        
        // *** FIX: Removed logic for marking private messages as read ***
        
        // Update the bell's status after attempting to mark items as read.
        updateNotificationBell();
    } catch (error) {
        console.error("An error occurred while marking items as read:", error);
    }
}

export async function renderNotificationsPage(state, actions) {
    const container = document.getElementById('notifications-view');
    const subNav = container.querySelector('.notifications-sub-nav');
    const listContainer = container.querySelector('#notifications-list');

    subNav.innerHTML = `
        <div class="notifications-sub-nav-tabs">
            <button class="notifications-sub-nav-btn" data-filter="all">All</button>
            <button class="notifications-sub-nav-btn" data-filter="lemmy">Lemmy</button>
            <button class="notifications-sub-nav-btn" data-filter="mastodon">Mastodon</button>
        </div>
    `;
    listContainer.innerHTML = '';
    
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');

        // --- Fetch Mastodon Notifications ---
        let mastodonNotifs = [];
        if (state.instanceUrl && state.accessToken) {
            const response = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/notifications');
            mastodonNotifs = response.data || [];
        }

        // --- Fetch Lemmy Notifications ---
        let lemmyReplyNotifs = [];
        let lemmyMentionNotifs = [];
        // *** FIX: Removed private message fetching ***
        if (lemmyInstance) {
            const [repliesResponse, mentionsResponse] = await Promise.all([
                apiFetch(lemmyInstance, null, '/api/v3/user/replies', { sort: 'New', unread_only: false }, 'lemmy'),
                apiFetch(lemmyInstance, null, '/api/v3/user/mention', { sort: 'New', unread_only: false }, 'lemmy')
            ]);
            lemmyReplyNotifs = repliesResponse.data.replies || [];
            lemmyMentionNotifs = mentionsResponse.data.mentions || [];
        }

        // --- Combine and Process All Notifications ---
        const allNotifications = [
            ...mastodonNotifs.map(n => {
                let icon = ICONS.mention;
                let actionText = `${n.type}d`;
                if (n.type === 'favourite') {
                    icon = ICONS.favorite;
                    actionText = 'favorited';
                } else if (n.type === 'reblog') {
                    icon = ICONS.boost;
                    actionText = 'boosted';
                }
                return {
                    platform: 'mastodon',
                    date: n.created_at,
                    icon: icon,
                    content: `<strong>${n.account.display_name}</strong> ${actionText} your post.`,
                    contextHTML: n.status ? `<div class="notification-context">${n.status.content.replace(/<[^>]*>/g, "")}</div>` : '',
                    authorAvatar: n.account.avatar_static,
                    timestamp: n.created_at,
                }
            }),
            ...lemmyReplyNotifs.map(n => {
                if (!n?.comment_reply?.creator || !n?.comment_reply?.comment) return null;
                return {
                    platform: 'lemmy',
                    date: n.comment_reply.comment.published,
                    icon: ICONS.reply,
                    content: `<strong>${n.comment_reply.creator.name}</strong> replied to your comment.`,
                    contextHTML: `<div class="notification-context">${n.comment_reply.comment.content}</div>`,
                    authorAvatar: n.comment_reply.creator.avatar,
                    timestamp: n.comment_reply.comment.published,
                };
            }),
            ...lemmyMentionNotifs.map(n => {
                 if (!n?.person_mention?.creator || !n?.person_mention?.comment) return null;
                return {
                    platform: 'lemmy',
                    date: n.person_mention.comment.published,
                    icon: ICONS.mention,
                    content: `<strong>${n.person_mention.creator.name}</strong> mentioned you in a comment.`,
                    contextHTML: `<div class="notification-context">${n.person_mention.comment.content}</div>`,
                    authorAvatar: n.person_mention.creator.avatar,
                    timestamp: n.person_mention.comment.published,
                }
            })
            // *** FIX: Removed private message processing ***
        ].filter(Boolean);

        allNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // --- Render Logic ---
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
        
        const defaultTab = 'all';
        subNav.querySelector(`.notifications-sub-nav-btn[data-filter="${defaultTab}"]`).classList.add('active');
        renderFilteredNotifications(defaultTab);
        
        // --- Mark As Read (Post-Render) ---
        if (lemmyInstance) {
            const unreadMentions = lemmyMentionNotifs.filter(m => !m.person_mention.read);
            markItemsAsRead(lemmyInstance, unreadMentions);
        }

    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        listContainer.innerHTML = `<p>Could not load notifications. ${error.message}</p>`;
    }
}