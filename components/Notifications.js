import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderSingleNotification(notification) {
    const item = document.createElement('div');
    item.className = `notification-item ${notification.read ? '' : 'unread'}`;
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
        <div class="notification-actions">
            <div class="timestamp">${formatTimestamp(notification.timestamp)}</div>
            ${!notification.read && notification.markAsReadAction ? 
                `<button class="mark-read-btn" onclick="${notification.markAsReadAction}">Mark Read</button>` : ''}
        </div>
    `;
    
    // Add click handler to navigate to the source
    if (notification.clickAction) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', notification.clickAction);
    }
    
    return item;
}

export async function updateNotificationBell() {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    const mastodonInstance = localStorage.getItem('fediverse-instance');
    const mastodonToken = localStorage.getItem('fediverse-token');
    const notifBtn = document.getElementById('notifications-btn');
    
    if (!notifBtn) return;

    let totalUnread = 0;
    
    try {
        // Check Lemmy notifications
        if (lemmyInstance && localStorage.getItem('lemmy_jwt')) {
            const [mentions, replies] = await Promise.all([
                apiFetch(lemmyInstance, null, '/api/v3/user/mention', {}, 'lemmy', { unread_only: true, limit: 50 }).catch(() => ({ data: { mentions: [] } })),
                apiFetch(lemmyInstance, null, '/api/v3/user/replies', {}, 'lemmy', { unread_only: true, limit: 50 }).catch(() => ({ data: { replies: [] } }))
            ]);
            
            totalUnread += (mentions.data?.mentions?.length || 0) + (replies.data?.replies?.length || 0);
        }
        
        // Check Mastodon notifications  
        if (mastodonInstance && mastodonToken) {
            const notifications = await apiFetch(mastodonInstance, mastodonToken, '/api/v1/notifications', {}, 'mastodon', { limit: 40 }).catch(() => ({ data: [] }));
            // Mastodon doesn't have a simple unread count, so we'll count recent notifications
            const recentNotifications = notifications.data?.filter(n => {
                const notifDate = new Date(n.created_at);
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return notifDate > dayAgo;
            }) || [];
            totalUnread += recentNotifications.length;
        }

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

async function markLemmyItemsAsRead(lemmyInstance, unreadMentions, unreadReplies) {
    // Mark mentions as read
    for (const mention of unreadMentions) {
        try {
            await apiFetch(lemmyInstance, null, '/api/v3/user/mention/mark_as_read', {
                method: 'POST',
                body: { person_mention_id: mention.person_mention.id, read: true }
            }, 'lemmy');
        } catch (err) {
            console.error(`Failed to mark mention ${mention.person_mention.id} as read:`, err);
        }
    }
    
    // Mark replies as read
    for (const reply of unreadReplies) {
        try {
            await apiFetch(lemmyInstance, null, '/api/v3/user/replies/mark_as_read', {
                method: 'POST', 
                body: { comment_reply_id: reply.comment_reply.id, read: true }
            }, 'lemmy');
        } catch (err) {
            console.error(`Failed to mark reply ${reply.comment_reply.id} as read:`, err);
        }
    }
    
    // Update the bell status after marking items as read
    updateNotificationBell();
}

export async function renderNotificationsPage(state, actions) {
    const container = document.getElementById('notifications-view');
    
    // Clear any existing content and add proper structure
    container.innerHTML = `
        <div class="view-header">
            <h2>Notifications</h2>
            <div class="notifications-actions">
                <button id="mark-all-read-btn" class="button-secondary">Mark All Read</button>
                <button id="refresh-notifications-btn" class="button-secondary">${ICONS.refresh}</button>
            </div>
        </div>
        <div class="notifications-sub-nav">
            <div class="notifications-sub-nav-tabs">
                <button class="notifications-sub-nav-btn active" data-filter="all">All</button>
                <button class="notifications-sub-nav-btn" data-filter="lemmy">Lemmy</button>
                <button class="notifications-sub-nav-btn" data-filter="mastodon">Mastodon</button>
            </div>
        </div>
        <div id="notifications-list"></div>
    `;
    
    const subNav = container.querySelector('.notifications-sub-nav');
    const listContainer = container.querySelector('#notifications-list');
    const markAllReadBtn = container.querySelector('#mark-all-read-btn');
    const refreshBtn = container.querySelector('#refresh-notifications-btn');

    // Loading state
    listContainer.innerHTML = '<div class="loading-spinner">Loading notifications...</div>';
    
    let allNotifications = [];
    let currentFilter = 'all';
    
    const loadNotifications = async () => {
        allNotifications = [];
        listContainer.innerHTML = '<div class="loading-spinner">Loading notifications...</div>';
        
        try {
            const lemmyInstance = localStorage.getItem('lemmy_instance');
            const mastodonInstance = localStorage.getItem('fediverse-instance');
            const mastodonToken = localStorage.getItem('fediverse-token');

            // Fetch Mastodon Notifications
            let mastodonNotifs = [];
            if (mastodonInstance && mastodonToken) {
                try {
                    const response = await apiFetch(mastodonInstance, mastodonToken, '/api/v1/notifications', {}, 'mastodon', { limit: 50 });
                    mastodonNotifs = response.data || [];
                } catch (error) {
                    console.error('Failed to fetch Mastodon notifications:', error);
                }
            }

            // Fetch Lemmy Notifications
            let lemmyReplyNotifs = [];
            let lemmyMentionNotifs = [];
            
            if (lemmyInstance && localStorage.getItem('lemmy_jwt')) {
                try {
                    const [repliesResponse, mentionsResponse] = await Promise.all([
                        apiFetch(lemmyInstance, null, '/api/v3/user/replies', {}, 'lemmy', { sort: 'New', unread_only: false, limit: 50 }),
                        apiFetch(lemmyInstance, null, '/api/v3/user/mention', {}, 'lemmy', { sort: 'New', unread_only: false, limit: 50 })
                    ]);
                    lemmyReplyNotifs = repliesResponse.data?.replies || [];
                    lemmyMentionNotifs = mentionsResponse.data?.mentions || [];
                } catch (error) {
                    console.error('Failed to fetch Lemmy notifications:', error);
                }
            }

            // Process and combine all notifications
            allNotifications = [
                // Mastodon notifications
                ...mastodonNotifs.map(n => {
                    let icon = ICONS.mention;
                    let actionText = `${n.type}d`;
                    
                    if (n.type === 'favourite') {
                        icon = ICONS.favorite;
                        actionText = 'favorited';
                    } else if (n.type === 'reblog') {
                        icon = ICONS.boost;
                        actionText = 'boosted';
                    } else if (n.type === 'follow') {
                        icon = ICONS.notifications;
                        actionText = 'followed';
                    } else if (n.type === 'mention') {
                        icon = ICONS.mention;
                        actionText = 'mentioned you in';
                    }
                    
                    return {
                        platform: 'mastodon',
                        date: n.created_at,
                        icon: icon,
                        content: `<strong>${n.account.display_name}</strong> ${actionText} ${n.status ? 'your post' : 'you'}.`,
                        contextHTML: n.status ? `<div class="notification-context">${n.status.content.replace(/<[^>]*>/g, "")}</div>` : '',
                        authorAvatar: n.account.avatar_static,
                        timestamp: n.created_at,
                        read: true, // Mastodon doesn't track read state the same way
                        clickAction: n.status ? () => actions.showStatusDetail(n.status.id) : null
                    };
                }),
                
                // Lemmy reply notifications
                ...lemmyReplyNotifs.map(n => {
                    if (!n?.comment_reply?.creator || !n?.comment_reply?.comment) return null;
                    
                    return {
                        platform: 'lemmy',
                        date: n.comment_reply.comment.published,
                        icon: ICONS.reply,
                        content: `<strong>${n.comment_reply.creator.name}</strong> replied to your comment.`,
                        contextHTML: `<div class="notification-context">${n.comment_reply.comment.content}</div>`,
                        authorAvatar: n.comment_reply.creator.avatar || './images/php.png',
                        timestamp: n.comment_reply.comment.published,
                        read: n.comment_reply.read,
                        markAsReadAction: !n.comment_reply.read ? `markReplyAsRead(${n.comment_reply.id})` : null,
                        clickAction: () => {
                            // Navigate to the post with the comment
                            actions.showLemmyPostDetail({
                                post: n.post,
                                creator: n.creator,
                                community: n.community,
                                counts: n.counts
                            });
                        }
                    };
                }),
                
                // Lemmy mention notifications
                ...lemmyMentionNotifs.map(n => {
                    if (!n?.person_mention?.creator || !n?.person_mention?.comment) return null;
                    
                    return {
                        platform: 'lemmy',
                        date: n.person_mention.comment.published,
                        icon: ICONS.mention,
                        content: `<strong>${n.person_mention.creator.name}</strong> mentioned you in a comment.`,
                        contextHTML: `<div class="notification-context">${n.person_mention.comment.content}</div>`,
                        authorAvatar: n.person_mention.creator.avatar || './images/php.png',
                        timestamp: n.person_mention.comment.published,
                        read: n.person_mention.read,
                        markAsReadAction: !n.person_mention.read ? `markMentionAsRead(${n.person_mention.id})` : null,
                        clickAction: () => {
                            // Navigate to the post with the comment
                            actions.showLemmyPostDetail({
                                post: n.post,
                                creator: n.creator,
                                community: n.community,
                                counts: n.counts
                            });
                        }
                    };
                })
            ].filter(Boolean);

            // Sort by date (newest first)
            allNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Render the notifications
            renderFilteredNotifications(currentFilter);
            
            // Mark unread Lemmy notifications as read after a delay
            if (lemmyInstance) {
                const unreadMentions = lemmyMentionNotifs.filter(m => !m.person_mention.read);
                const unreadReplies = lemmyReplyNotifs.filter(r => !r.comment_reply.read);
                
                if (unreadMentions.length > 0 || unreadReplies.length > 0) {
                    // Mark as read after 3 seconds (so user can see what was unread)
                    setTimeout(() => {
                        markLemmyItemsAsRead(lemmyInstance, unreadMentions, unreadReplies);
                    }, 3000);
                }
            }

        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            listContainer.innerHTML = `<div class="error-message">Failed to load notifications: ${error.message}</div>`;
        }
    };
    
    const renderFilteredNotifications = (filter) => {
        currentFilter = filter;
        listContainer.innerHTML = '';
        
        const filtered = allNotifications.filter(n => filter === 'all' || n.platform === filter);
        
        if (filtered.length === 0) {
            listContainer.innerHTML = '<div class="empty-message">No notifications to show.</div>';
            return;
        }

        filtered.forEach(notification => {
            const item = renderSingleNotification(notification);
            if (item) listContainer.appendChild(item);
        });
    };

    // Tab switching
    subNav.querySelectorAll('.notifications-sub-nav-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            subNav.querySelectorAll('.notifications-sub-nav-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderFilteredNotifications(e.target.dataset.filter);
        });
    });
    
    // Mark all read functionality
    markAllReadBtn.addEventListener('click', async () => {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (lemmyInstance && localStorage.getItem('lemmy_jwt')) {
            try {
                // Mark all replies as read
                await apiFetch(lemmyInstance, null, '/api/v3/user/mark_all_as_read', {
                    method: 'POST',
                    body: {}
                }, 'lemmy');
                
                // Refresh notifications
                await loadNotifications();
                updateNotificationBell();
            } catch (error) {
                console.error('Failed to mark all as read:', error);
            }
        }
    });
    
    // Refresh functionality
    refreshBtn.addEventListener('click', () => {
        loadNotifications();
    });
    
    // Global functions for mark as read actions
    window.markReplyAsRead = async (replyId) => {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        try {
            await apiFetch(lemmyInstance, null, '/api/v3/user/replies/mark_as_read', {
                method: 'POST',
                body: { comment_reply_id: replyId, read: true }
            }, 'lemmy');
            loadNotifications(); // Refresh the list
        } catch (error) {
            console.error('Failed to mark reply as read:', error);
        }
    };
    
    window.markMentionAsRead = async (mentionId) => {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        try {
            await apiFetch(lemmyInstance, null, '/api/v3/user/mention/mark_as_read', {
                method: 'POST',
                body: { person_mention_id: mentionId, read: true }
            }, 'lemmy');
            loadNotifications(); // Refresh the list
        } catch (error) {
            console.error('Failed to mark mention as read:', error);
        }
    };
    
    // Initial load
    await loadNotifications();
}
