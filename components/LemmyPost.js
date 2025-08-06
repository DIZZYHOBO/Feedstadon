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
        const [mentions, pms, replies] = await Promise.all([
            apiFetch(lemmyInstance, null, '/api/v3/user/mention', { unread_only: true }, 'lemmy'),
            apiFetch(lemmyInstance, null, '/api/v3/private_message/list', { unread_only: true }, 'lemmy'),
            apiFetch(lemmyInstance, null, '/api/v3/user/replies', { sort: 'New', unread_only: true, limit: 50 }, 'lemmy')
        ]);
        
        const totalUnread = (mentions.data?.mentions?.length || 0) + 
                              (pms.data?.private_messages?.length || 0) + 
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

async function markItemsAsRead(lemmyInstance, unreadMentions, unreadPms) {
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

        for(const pm of unreadPms) {
            try {
                 await apiFetch(lemmyInstance, null, '/api/v3/private_message/mark_as_read', {
                     method: 'POST',
                     body: { private_message_id: pm.private_message.id, read: true }
                }, 'lemmy');
            } catch (err) {
                 console.error(`Failed to mark private message ${pm.private_message.id} as read`, err);
            }
        }
        
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
    listContainer.innerHTML = 'Loading...';
    
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
            }),
            ...lemmyPrivateMessages.map(n => {
                 if (!n?.private_message?.creator) return null;
                return {
                    platform: 'lemmy',
                    date: n.private_message.published,
                    icon: ICONS.message,
                    content: `<strong>${n.private_message.creator.name}</strong> sent you a private message.`,
                    contextHTML: `<div class="notification-context">${n.private_message.content}</div>`,
                    authorAvatar: n.private_message.creator.avatar,
                    timestamp: n.private_message.published,
                }
            })
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
            constimport { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLemmyCard } from './Lemmy.js'; // We can reuse the card from the timeline

function showReplyBox(commentWrapper, comment, actions) {
    const existingReplyBox = commentWrapper.querySelector('.lemmy-reply-box');
    if (existingReplyBox) {
        existingReplyBox.remove();
        return;
    }

    const replyBox = document.createElement('div');
    replyBox.className = 'lemmy-reply-box';
    replyBox.innerHTML = `
        <textarea class="reply-textarea" placeholder="Write your reply..."></textarea>
        <div class="reply-actions">
            <button class="cancel-reply-btn button-secondary">Cancel</button>
            <button class="submit-reply-btn">Reply</button>
        </div>
    `;

    commentWrapper.querySelector('.status-body-content').appendChild(replyBox);

    replyBox.querySelector('.cancel-reply-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        replyBox.remove();
    });

    replyBox.querySelector('.submit-reply-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const textarea = replyBox.querySelector('.reply-textarea');
        const content = textarea.value.trim();
        if (!content) return;

        try {
            const newComment = await actions.lemmyPostComment({
                content: content,
                post_id: comment.post.id,
                parent_id: comment.comment.id
            });

            const newCommentEl = renderCommentNode(newComment.comment_view, actions);
            let repliesContainer = commentWrapper.querySelector('.comment-replies-container');
            if (!repliesContainer) {
                repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-replies-container';
                commentWrapper.appendChild(repliesContainer);
            }
            repliesContainer.prepend(newCommentEl);
            replyBox.remove();

        } catch (err) {
            alert('Failed to post reply.');
        }
    });
}

function buildCommentTree(comments) {
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach(commentView => {
        commentView.children = [];
        commentMap.set(commentView.comment.id, commentView);
    });

    comments.forEach(commentView => {
        const pathParts = commentView.comment.path.split('.');
        if (pathParts.length === 2) {
            rootComments.push(commentView);
        } else {
            const parentId = parseInt(pathParts[pathParts.length - 2], 10);
            if (commentMap.has(parentId)) {
                const parent = commentMap.get(parentId);
                parent.children.push(commentView);
            }
        }
    });
    return rootComments;
}

function renderCommentTree(comments, container, actions) {
    comments.forEach(commentView => {
        const commentElement = renderCommentNode(commentView, actions);
        container.appendChild(commentElement);

        if (commentView.children && commentView.children.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'comment-replies-container';
            const body = commentElement.querySelector('.status-body-content');
            if (body) {
                body.appendChild(repliesContainer);
                renderCommentTree(commentView.children, repliesContainer, actions);
            }
        }
    });
}

async function fetchAndRenderComments(state, postId, container, actions) {
    container.innerHTML = `<p>Loading comments...</p>`;
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const params = { post_id: postId, max_depth: 15, sort: 'New', type_: 'All' };
        const response = await apiFetch(lemmyInstance, null, '/api/v3/comment/list', {}, 'lemmy', params);
        const commentsData = response.data.comments;

        container.innerHTML = '';
        if (commentsData && commentsData.length > 0) {
            const commentTree = buildCommentTree(commentsData);
            renderCommentTree(commentTree, container, actions);
        } else {
            container.innerHTML = '<div class="status-body-content"><p>No comments yet.</p></div>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        container.innerHTML = `<p>Could not load comments. ${err.message}</p>`;
    }
}

function renderCommentNode(commentView, actions) {
    const comment = commentView.comment;
    const creator = commentView.creator;
    const counts = commentView.counts;

    const commentWrapper = document.createElement('div');
    commentWrapper.className = 'status lemmy-comment';
    commentWrapper.id = `comment-wrapper-${comment.id}`;
    
    if (comment.path.split('.').length === 2) {
        commentWrapper.classList.add('top-level-comment');
    }

    let optionsMenuHTML = `
        <div class="post-options-container">
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="edit-comment">${ICONS.edit} Edit</button>
                <button data-action="delete-comment">${ICONS.delete} Delete</button>
            </div>
        </div>
    `;

    commentWrapper.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img class="avatar" src="${creator.avatar}" alt="${creator.name} avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                    <div>
                        <span class="display-name">${creator.display_name || creator.name}</span>
                        <span class="acct">@${creator.name}</span>
                        <span class="timestamp">· ${formatTimestamp(comment.published)}</span>
                    </div>
                </div>
                <div class="status-header-side">
                    ${optionsMenuHTML}
                </div>
            </div>
            <div class="status-content">${comment.content}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action" data-action="reply">${ICONS.reply}</button>
            </div>
        </div>
    `;
    
    // Event listeners
    commentWrapper.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote': case 'downvote':
                    const score = parseInt(e.currentTarget.dataset.score, 10);
                    actions.lemmyCommentVote(comment.id, score, commentWrapper);
                    break;
                case 'reply':
                    showReplyBox(commentWrapper, commentView, actions);
                    break;
            }
        });
    });

    const optionsBtn = commentWrapper.querySelector('.post-options-btn');
    if (optionsBtn) {
        const menu = commentWrapper.querySelector('.post-options-menu');
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
        menu.addEventListener('click', (e) => e.stopPropagation());
    }

    return commentWrapper;
}

export async function renderLemmyPostPage(state, post, actions) {
    const container = document.getElementById('lemmy-post-view');
    container.innerHTML = '<p>Loading post...</p>';

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const { data } = await apiFetch(lemmyInstance, null, `/api/v3/post?id=${post.post.id}`, {}, 'lemmy');
        const postView = data.post_view;

        container.innerHTML = ''; // Clear loading message

        // Render the main post using the standard Lemmy card
        const mainPostCard = renderLemmyCard(postView, actions);
        mainPostCard.classList.add('main-thread-post');
        container.appendChild(mainPostCard);

        // Add a dedicated container for the comments
        const threadContainer = document.createElement('div');
        threadContainer.className = 'lemmy-comment-thread';
        container.appendChild(threadContainer);
        
        fetchAndRenderComments(state, postView.post.id, threadContainer, actions);
        
    } catch (error) {
        console.error("Failed to load Lemmy post detail:", error);
        container.innerHTML = `<p>Could not load post. ${error.message}</p>`;
    }
}
