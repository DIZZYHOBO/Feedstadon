import { apiFetch } from './api.js';
import { formatTimestamp, timeAgo } from './utils.js';
import { showToast } from './ui.js';
import { ICONS } from './icons.js';

// Helper function to truncate text
function truncateWords(text, wordCount) {
    if (!text) return '';
    const words = text.split(/\s+/);
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(' ') + '...';
}

// Render a single notification
function renderNotification(notification, type, platform = 'lemmy') {
    const notifDiv = document.createElement('div');
    notifDiv.className = `notification-item ${!notification.read ? 'unread' : 'read'} ${platform}-notification`;
    
    let content = '';
    let avatar = '';
    let timestamp = '';
    let context = '';

    try {
        if (platform === 'lemmy') {
            // Lemmy notification structure
            avatar = (notification.creator && notification.creator.avatar) || '';
            timestamp = (notification.comment && notification.comment.published) || '';
            
            const fullContent = (notification.comment && notification.comment.content) || '';
            const truncatedContent = truncateWords(fullContent, 10);
            context = truncatedContent ? `<div class="notification-context">${truncatedContent}</div>` : '';

            if (type === 'mention') {
                content = `<strong>${notification.creator ? notification.creator.name : 'Unknown'}</strong> mentioned you in a comment`;
            } else if (type === 'reply') {
                content = `<strong>${notification.creator ? notification.creator.name : 'Unknown'}</strong> replied to your comment`;
            }
        } else if (platform === 'mastodon') {
            // Mastodon notification structure
            avatar = (notification.account && notification.account.avatar_static) || '';
            timestamp = notification.created_at || '';
            
            const fullContent = notification.status ? (notification.status.content || '').replace(/<[^>]*>/g, "") : '';
            const truncatedContent = truncateWords(fullContent, 10);
            context = truncatedContent ? `<div class="notification-context">${truncatedContent}</div>` : '';

            const accountName = notification.account ? (notification.account.display_name || notification.account.username) : 'Unknown';
            
            if (notification.type === 'mention') {
                content = `<strong>${accountName}</strong> mentioned you`;
            } else if (notification.type === 'favourite') {
                content = `<strong>${accountName}</strong> favorited your post`;
            } else if (notification.type === 'reblog') {
                content = `<strong>${accountName}</strong> boosted your post`;
            } else if (notification.type === 'follow') {
                content = `<strong>${accountName}</strong> followed you`;
            } else if (notification.type === 'poll') {
                content = `A poll you voted in has ended`;
            } else if (notification.type === 'status') {
                content = `<strong>${accountName}</strong> posted a new status`;
            } else {
                content = `<strong>${accountName}</strong> ${notification.type}`;
            }
        }

    } catch (error) {
        console.error('Error rendering notification:', error, notification);
        return null;
    }

    // Use platform logos instead of text badges
    const platformIcon = platform === 'lemmy' ? ICONS.lemmy : ICONS.mastodon;

    notifDiv.innerHTML = `
        <div class="notification-avatar">
            <img src="${avatar}" alt="avatar" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><text y=\\'.9em\\' font-size=\\'90\\'>👤</text></svg>';">
        </div>
        <div class="notification-content">
            <div class="notification-header">
                <span class="notification-text">${content}</span>
                <span class="notification-time">${timeAgo(timestamp)}</span>
            </div>
            ${context}
            ${!notification.read ? '<div class="unread-indicator"></div>' : ''}
        </div>
        <div class="platform-indicator">
            <div class="platform-icon ${platform}">${platformIcon}</div>
        </div>
    `;

    return notifDiv;
}

// Load Lemmy notifications
async function loadLemmyNotifications(state, updateUI = true) {
    const instance = localStorage.getItem('lemmy_instance');
    const jwt = localStorage.getItem('lemmy_jwt');
    
    if (!instance || !jwt) {
        if (updateUI) {
            return { notifications: [], element: '<div class="no-notifications"><p>Please log in to Lemmy first.</p></div>' };
        }
        return [];
    }

    try {
        // Fetch mentions and replies with Bearer token auth
        const mentionsUrl = `https://${instance}/api/v3/user/mention?sort=New&unread_only=false&limit=50`;
        const repliesUrl = `https://${instance}/api/v3/user/replies?sort=New&unread_only=false&limit=50`;
        
        const [mentionsResponse, repliesResponse] = await Promise.all([
            fetch(mentionsUrl, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(repliesUrl, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                }
            })
        ]);

        if (!mentionsResponse.ok || !repliesResponse.ok) {
            throw new Error('Failed to fetch Lemmy notifications');
        }

        const mentionsData = await mentionsResponse.json();
        const repliesData = await repliesResponse.json();

        const mentions = mentionsData.mentions || [];
        const replies = repliesData.replies || [];

        // Combine and sort by date
        const allNotifications = [];
        
        // Process mentions
        mentions.forEach((m) => {
            if (m.person_mention && m.comment && m.comment.published && m.creator) {
                allNotifications.push({
                    ...m, 
                    type: 'mention', 
                    date: m.comment.published, 
                    read: m.person_mention.read,
                    platform: 'lemmy'
                });
            }
        });

        // Process replies
        replies.forEach((r) => {
            if (r.comment_reply && r.comment && r.comment.published && r.creator) {
                allNotifications.push({
                    ...r, 
                    type: 'reply', 
                    date: r.comment.published, 
                    read: r.comment_reply.read,
                    platform: 'lemmy'
                });
            }
        });

        allNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));

        return allNotifications;

    } catch (error) {
        console.error('Failed to load Lemmy notifications:', error);
        return [];
    }
}

// Load Mastodon notifications
async function loadMastodonNotifications(state, updateUI = true) {
    const instance = localStorage.getItem('fediverse-instance');
    const token = localStorage.getItem('fediverse-token');
    
    if (!instance || !token) {
        if (updateUI) {
            return { notifications: [], element: '<div class="no-notifications"><p>Please log in to Mastodon first.</p></div>' };
        }
        return [];
    }
    
    try {
        const url = `https://${instance}/api/v1/notifications?limit=50`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Mastodon notifications');
        }

        const notifications = await response.json();
        
        // Process notifications
        const processedNotifications = notifications.map((n) => ({
            ...n,
            date: n.created_at,
            read: false, // Mastodon doesn't have read/unread status, so we'll treat them as unread for marking
            platform: 'mastodon'
        }));

        return processedNotifications;

    } catch (error) {
        console.error('Failed to load Mastodon notifications:', error);
        return [];
    }
}

// Update notification bell in the UI
export async function updateNotificationBell() {
    const notifBtn = document.getElementById('notifications-btn');
    if (!notifBtn) return;

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    const jwt = localStorage.getItem('lemmy_jwt');
    
    if (!lemmyInstance || !jwt) {
        notifBtn.classList.remove('unread');
        return;
    }

    try {
        // Check for unread Lemmy notifications
        const mentionsUrl = `https://${lemmyInstance}/api/v3/user/mention?unread_only=true`;
        const repliesUrl = `https://${lemmyInstance}/api/v3/user/replies?unread_only=true&limit=50`;
        
        const [mentionsResponse, repliesResponse] = await Promise.all([
            fetch(mentionsUrl, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(repliesUrl, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                }
            })
        ]);

        if (!mentionsResponse.ok || !repliesResponse.ok) {
            notifBtn.classList.remove('unread');
            return;
        }

        const mentionsData = await mentionsResponse.json();
        const repliesData = await repliesResponse.json();
        
        const totalUnread = (mentionsData.mentions?.length || 0) + 
                            (repliesData.replies?.length || 0);

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

// Mark all notifications as read (both Lemmy and Mastodon)
async function markAllAsRead(lemmyNotifications = [], mastodonNotifications = []) {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    const jwt = localStorage.getItem('lemmy_jwt');
    const mastodonInstance = localStorage.getItem('fediverse-instance');
    const mastodonToken = localStorage.getItem('fediverse-token');
    
    showToast('Marking all as read...', 'info');
    let successCount = 0;
    let errorCount = 0;

    // Mark Lemmy notifications as read
    if (lemmyInstance && jwt) {
        try {
            // Filter unread Lemmy notifications
            const unreadMentions = lemmyNotifications.filter(n => 
                n.type === 'mention' && !n.read && n.person_mention
            );
            const unreadReplies = lemmyNotifications.filter(n => 
                n.type === 'reply' && !n.read && n.comment_reply
            );

            // Mark mentions as read
            for (const mention of unreadMentions) {
                try {
                    await fetch(`https://${lemmyInstance}/api/v3/user/mention/mark_as_read`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            person_mention_id: mention.person_mention.id,
                            read: true
                        })
                    });
                    successCount++;
                } catch (err) {
                    console.error('Failed to mark mention as read:', err);
                    errorCount++;
                }
            }

            // Mark replies as read
            for (const reply of unreadReplies) {
                try {
                    await fetch(`https://${lemmyInstance}/api/v3/comment/mark_as_read`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            comment_reply_id: reply.comment_reply.id,
                            read: true
                        })
                    });
                    successCount++;
                } catch (err) {
                    console.error('Failed to mark reply as read:', err);
                    errorCount++;
                }
            }
        } catch (error) {
            console.error('Failed to mark Lemmy notifications as read:', error);
        }
    }

    // Mark Mastodon notifications as read
    if (mastodonInstance && mastodonToken && mastodonNotifications.length > 0) {
        try {
            // Mastodon has a single endpoint to mark all as read
            const response = await fetch(`https://${mastodonInstance}/api/v1/notifications/clear`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mastodonToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                successCount += mastodonNotifications.length;
            } else {
                errorCount += mastodonNotifications.length;
            }
        } catch (error) {
            console.error('Failed to mark Mastodon notifications as read:', error);
            errorCount += mastodonNotifications.length;
        }
    }

    if (successCount > 0 && errorCount === 0) {
        showToast('All notifications marked as read', 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showToast(`Marked ${successCount} as read, ${errorCount} failed`, 'warning');
    } else if (errorCount > 0) {
        showToast('Failed to mark notifications as read', 'error');
    } else {
        showToast('No unread notifications to mark', 'info');
    }

    await updateNotificationBell();
}

// Main render function for notifications page
export async function renderNotificationsPage(state, actions) {
    const container = document.getElementById('notifications-view');
    
    // Create the notifications structure
    container.innerHTML = `
        <div class="notifications-header">
            <div class="notifications-header-content">
                <h3>Your Notifications</h3>
                <div class="notifications-header-actions">
                    <div class="notification-counts">
                        <span id="lemmy-count" style="display: none;">
                            <span class="platform-icon-small lemmy">${ICONS.lemmy}</span>
                            <span id="lemmy-unread-count">0</span> unread
                        </span>
                        <span id="mastodon-count" style="display: none;">
                            <span class="platform-icon-small mastodon">${ICONS.mastodon}</span>
                            <span id="mastodon-notif-count">0</span> notifications
                        </span>
                    </div>
                    <button id="mark-all-read-btn" class="button-secondary" style="display: none;">Mark All Read</button>
                </div>
            </div>
        </div>
        <div class="notification-tabs">
            <button class="notification-tab-btn active" data-notif-tab="all">All</button>
            <button class="notification-tab-btn" data-notif-tab="lemmy">Lemmy</button>
            <button class="notification-tab-btn" data-notif-tab="mastodon">Mastodon</button>
        </div>
        <div id="all-notifications-content" class="notification-tab-content active">
            <div class="loading-spinner"><p>Loading all notifications...</p></div>
        </div>
        <div id="lemmy-notifications-content" class="notification-tab-content">
            <div class="loading-spinner"><p>Loading Lemmy notifications...</p></div>
        </div>
        <div id="mastodon-notifications-content" class="notification-tab-content">
            <div class="loading-spinner"><p>Loading Mastodon notifications...</p></div>
        </div>
    `;

    // Load notifications
    const [lemmyNotifs, mastodonNotifs] = await Promise.all([
        loadLemmyNotifications(state),
        loadMastodonNotifications(state)
    ]);

    // Update counts
    const lemmyUnread = lemmyNotifs.filter(n => !n.read).length;
    const mastodonUnread = mastodonNotifs.filter(n => !n.read).length;
    const lemmyCountEl = document.getElementById('lemmy-count');
    const mastodonCountEl = document.getElementById('mastodon-count');
    const markAllBtn = document.getElementById('mark-all-read-btn');
    
    if (localStorage.getItem('lemmy_jwt')) {
        lemmyCountEl.style.display = 'inline-flex';
        document.getElementById('lemmy-unread-count').textContent = lemmyUnread;
    }
    
    if (localStorage.getItem('fediverse-token')) {
        mastodonCountEl.style.display = 'inline-flex';
        document.getElementById('mastodon-notif-count').textContent = mastodonNotifs.length;
    }
    
    // Show mark all read button if there are any unread notifications
    if (lemmyUnread > 0 || mastodonUnread > 0) {
        markAllBtn.style.display = 'block';
    }

    // Render all notifications combined
    const allContainer = document.getElementById('all-notifications-content');
    const allNotifs = [
        ...lemmyNotifs.map(n => ({ ...n, platform: 'lemmy' })),
        ...mastodonNotifs.map(n => ({ ...n, platform: 'mastodon' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    allContainer.innerHTML = '';
    if (allNotifs.length === 0) {
        allContainer.innerHTML = '<div class="no-notifications"><p>No notifications found.</p></div>';
    } else {
        allNotifs.forEach(notification => {
            const notifElement = renderNotification(notification, notification.type, notification.platform);
            if (notifElement) {
                allContainer.appendChild(notifElement);
            }
        });
    }

    // Render Lemmy notifications
    const lemmyContainer = document.getElementById('lemmy-notifications-content');
    lemmyContainer.innerHTML = '';
    if (lemmyNotifs.length === 0) {
        lemmyContainer.innerHTML = '<div class="no-notifications"><p>No Lemmy notifications found.</p></div>';
    } else {
        lemmyNotifs.forEach(notification => {
            const notifElement = renderNotification(notification, notification.type, 'lemmy');
            if (notifElement) {
                lemmyContainer.appendChild(notifElement);
            }
        });
    }

    // Render Mastodon notifications
    const mastodonContainer = document.getElementById('mastodon-notifications-content');
    mastodonContainer.innerHTML = '';
    if (mastodonNotifs.length === 0) {
        mastodonContainer.innerHTML = '<div class="no-notifications"><p>No Mastodon notifications found.</p></div>';
    } else {
        mastodonNotifs.forEach(notification => {
            const notifElement = renderNotification(notification, notification.type, 'mastodon');
            if (notifElement) {
                mastodonContainer.appendChild(notifElement);
            }
        });
    }

    // Tab switching
    const tabs = container.querySelectorAll('.notification-tab-btn');
    const contents = container.querySelectorAll('.notification-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.notifTab;
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${targetTab}-notifications-content`).classList.add('active');
        });
    });

    // Mark all read button - now marks both Lemmy and Mastodon
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            await markAllAsRead(lemmyNotifs, mastodonNotifs);
            // Refresh the page
            await renderNotificationsPage(state, actions);
        });
    }
}
