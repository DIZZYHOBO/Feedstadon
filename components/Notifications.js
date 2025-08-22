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

// Render a single notification with click handler
function renderNotification(notification, type, platform = 'lemmy', actions) {
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

    // Add click handler to open the related post
    notifDiv.style.cursor = 'pointer';
    notifDiv.addEventListener('click', async () => {
        if (platform === 'lemmy' && notification.post) {
            // For Lemmy, we need to construct the post view object
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || 'lemmy.world';
                const { data } = await apiFetch(lemmyInstance, null, `/api/v3/post?id=${notification.post.id}`, {}, 'lemmy');
                if (data && data.post_view) {
                    actions.showLemmyPostDetail(data.post_view);
                }
            } catch (error) {
                console.error('Failed to load Lemmy post:', error);
                showToast('Could not open post', 'error');
            }
        } else if (platform === 'mastodon' && notification.status) {
            // For Mastodon, open the status detail
            actions.showStatusDetail(notification.status.id);
        } else if (platform === 'mastodon' && notification.account && notification.type === 'follow') {
            // For follow notifications, open the user's profile
            actions.showProfilePage('mastodon', notification.account.id);
        }
    });

    return notifDiv;
}

// Load Lemmy notifications
async function loadLemmyNotifications(state, updateUI = true) {
    const instance = localStorage.getItem('lemmy_instance');
    const jwt = localStorage.getItem('lemmy_jwt');
    
    if (!instance || !jwt) {
        return [];
    }

    try {
        // Use apiFetch instead of direct fetch to handle CORS and authentication properly
        const [mentionsResponse, repliesResponse] = await Promise.all([
            apiFetch(instance, null, '/api/v3/user/mention', {}, 'lemmy', {
                sort: 'New',
                unread_only: false,
                limit: 50
            }),
            apiFetch(instance, null, '/api/v3/user/replies', {}, 'lemmy', {
                sort: 'New',
                unread_only: false,
                limit: 50
            })
        ]);

        const mentions = mentionsResponse.data?.mentions || [];
        const replies = repliesResponse.data?.replies || [];

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
        // Return empty array instead of throwing to prevent breaking the UI
        return [];
    }
}

// Load Mastodon notifications
async function loadMastodonNotifications(state, updateUI = true) {
    const instance = localStorage.getItem('fediverse-instance');
    const token = localStorage.getItem('fediverse-token');
    
    if (!instance || !token) {
        return [];
    }
    
    try {
        // Use apiFetch for consistency
        const response = await apiFetch(instance, token, '/api/v1/notifications', {}, 'mastodon', {
            limit: 50
        });

        const notifications = response.data || [];
        
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
        // Use apiFetch for proper CORS handling
        const [mentionsResponse, repliesResponse] = await Promise.all([
            apiFetch(lemmyInstance, null, '/api/v3/user/mention', {}, 'lemmy', {
                unread_only: true
            }),
            apiFetch(lemmyInstance, null, '/api/v3/user/replies', {}, 'lemmy', {
                unread_only: true,
                limit: 50
            })
        ]);

        const totalUnread = (mentionsResponse.data?.mentions?.length || 0) + 
                            (repliesResponse.data?.replies?.length || 0);

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
    if (lemmyInstance && jwt && lemmyNotifications.length > 0) {
        try {
            // Filter unread Lemmy notifications
            const unreadMentions = lemmyNotifications.filter(n => 
                n.type === 'mention' && !n.read && n.person_mention
            );
            const unreadReplies = lemmyNotifications.filter(n => 
                n.type === 'reply' && !n.read && n.comment_reply
            );

            // Mark mentions as read using apiFetch
            for (const mention of unreadMentions) {
                try {
                    await apiFetch(lemmyInstance, null, '/api/v3/user/mention/mark_as_read', {
                        method: 'POST',
                        body: {
                            person_mention_id: mention.person_mention.id,
                            read: true
                        }
                    }, 'lemmy');
                    successCount++;
                } catch (err) {
                    console.error('Failed to mark mention as read:', err);
                    errorCount++;
                }
            }

            // Mark replies as read using apiFetch
            for (const reply of unreadReplies) {
                try {
                    await apiFetch(lemmyInstance, null, '/api/v3/comment/mark_as_read', {
                        method: 'POST',
                        body: {
                            comment_reply_id: reply.comment_reply.id,
                            read: true
                        }
                    }, 'lemmy');
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
            // Use apiFetch for Mastodon as well
            await apiFetch(mastodonInstance, mastodonToken, '/api/v1/notifications/clear', {
                method: 'POST'
            }, 'mastodon');
            successCount += mastodonNotifications.length;
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
    
    // Check which platforms are logged in
    const lemmyLoggedIn = !!(localStorage.getItem('lemmy_instance') && localStorage.getItem('lemmy_jwt'));
    const mastodonLoggedIn = !!(localStorage.getItem('fediverse-instance') && localStorage.getItem('fediverse-token'));
    
    // Determine which tab should be active by default
    let defaultTab = '';
    if (lemmyLoggedIn) {
        defaultTab = 'lemmy';
    } else if (mastodonLoggedIn) {
        defaultTab = 'mastodon';
    }
    
    // Create the notifications structure with improved header
    container.innerHTML = `
        <div class="notifications-stats-header">
            ${lemmyLoggedIn ? `
                <div class="notification-stat-card lemmy-stat">
                    <div class="stat-icon">${ICONS.lemmy}</div>
                    <div class="stat-info">
                        <div class="stat-number" id="lemmy-unread-count">0</div>
                        <div class="stat-label">Lemmy unread</div>
                    </div>
                </div>
            ` : ''}
            ${mastodonLoggedIn ? `
                <div class="notification-stat-card mastodon-stat">
                    <div class="stat-icon">${ICONS.mastodon}</div>
                    <div class="stat-info">
                        <div class="stat-number" id="mastodon-notif-count">0</div>
                        <div class="stat-label">Mastodon new</div>
                    </div>
                </div>
            ` : ''}
            <button id="mark-all-read-btn" class="mark-all-btn" style="display: none;">
                <span class="mark-all-icon">✓</span>
                Mark All Read
            </button>
        </div>
        ${(lemmyLoggedIn || mastodonLoggedIn) ? `
            <div class="notification-tabs">
                ${lemmyLoggedIn ? `
                    <button class="notification-tab-btn ${defaultTab === 'lemmy' ? 'active' : ''}" data-notif-tab="lemmy">
                        <span class="tab-icon">${ICONS.lemmy}</span>
                        Lemmy
                    </button>
                ` : ''}
                ${mastodonLoggedIn ? `
                    <button class="notification-tab-btn ${defaultTab === 'mastodon' ? 'active' : ''}" data-notif-tab="mastodon">
                        <span class="tab-icon">${ICONS.mastodon}</span>
                        Mastodon
                    </button>
                ` : ''}
            </div>
        ` : ''}
        ${lemmyLoggedIn ? `
            <div id="lemmy-notifications-content" class="notification-tab-content ${defaultTab === 'lemmy' ? 'active' : ''}">
                <div class="loading-spinner"><p>Loading Lemmy notifications...</p></div>
            </div>
        ` : ''}
        ${mastodonLoggedIn ? `
            <div id="mastodon-notifications-content" class="notification-tab-content ${defaultTab === 'mastodon' ? 'active' : ''}">
                <div class="loading-spinner"><p>Loading Mastodon notifications...</p></div>
            </div>
        ` : ''}
        ${!lemmyLoggedIn && !mastodonLoggedIn ? `
            <div class="no-notifications">
                <p>Please log in to Lemmy or Mastodon to view notifications.</p>
                <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">You can log in from the Settings page.</p>
            </div>
        ` : ''}
    `;

    // Only load notifications if at least one platform is logged in
    if (lemmyLoggedIn || mastodonLoggedIn) {
        // Load notifications for logged-in platforms
        const lemmyNotifs = lemmyLoggedIn ? await loadLemmyNotifications(state) : [];
        const mastodonNotifs = mastodonLoggedIn ? await loadMastodonNotifications(state) : [];

        // Update counts
        const lemmyUnread = lemmyNotifs.filter(n => !n.read).length;
        const mastodonUnread = mastodonNotifs.filter(n => !n.read).length;
        const markAllBtn = document.getElementById('mark-all-read-btn');
        
        // Update the stat cards
        if (lemmyLoggedIn) {
            document.getElementById('lemmy-unread-count').textContent = lemmyUnread;
        }
        if (mastodonLoggedIn) {
            document.getElementById('mastodon-notif-count').textContent = mastodonNotifs.length;
        }
        
        // Show mark all read button if there are any unread notifications
        if (lemmyUnread > 0 || mastodonUnread > 0) {
            markAllBtn.style.display = 'flex';
        }

        // Render Lemmy notifications
        if (lemmyLoggedIn) {
            const lemmyContainer = document.getElementById('lemmy-notifications-content');
            lemmyContainer.innerHTML = '';
            if (lemmyNotifs.length === 0) {
                lemmyContainer.innerHTML = '<div class="no-notifications"><p>No Lemmy notifications found.</p></div>';
            } else {
                lemmyNotifs.forEach(notification => {
                    const notifElement = renderNotification(notification, notification.type, 'lemmy', actions);
                    if (notifElement) {
                        lemmyContainer.appendChild(notifElement);
                    }
                });
            }
        }

        // Render Mastodon notifications
        if (mastodonLoggedIn) {
            const mastodonContainer = document.getElementById('mastodon-notifications-content');
            mastodonContainer.innerHTML = '';
            if (mastodonNotifs.length === 0) {
                mastodonContainer.innerHTML = '<div class="no-notifications"><p>No Mastodon notifications found.</p></div>';
            } else {
                mastodonNotifs.forEach(notification => {
                    const notifElement = renderNotification(notification, notification.type, 'mastodon', actions);
                    if (notifElement) {
                        mastodonContainer.appendChild(notifElement);
                    }
                });
            }
        }

        // Tab switching (only if there are multiple tabs)
        const tabs = container.querySelectorAll('.notification-tab-btn');
        const contents = container.querySelectorAll('.notification-tab-content');
        
        if (tabs.length > 1) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const targetTab = tab.dataset.notifTab;
                    
                    tabs.forEach(t => t.classList.remove('active'));
                    contents.forEach(c => c.classList.remove('active'));
                    
                    tab.classList.add('active');
                    document.getElementById(`${targetTab}-notifications-content`).classList.add('active');
                });
            });
        }

        // Mark all read button - now marks both Lemmy and Mastodon
        if (markAllBtn) {
            markAllBtn.addEventListener('click', async () => {
                await markAllAsRead(lemmyNotifs, mastodonNotifs);
                // Refresh the page
                await renderNotificationsPage(state, actions);
            });
        }
    }
}
