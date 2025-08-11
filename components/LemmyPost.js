import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { timeAgo } from './utils.js';
import { showToast } from './ui.js';

// Function to inject styles for Lemmy components, ensuring mobile optimization
function injectLemmyStyles() {
    const styleId = 'lemmy-post-styles';
    if (document.getElementById(styleId)) {
        return; // Styles already injected
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .lemmy-content, .lemmy-post-body {
            word-wrap: break-word;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            max-width: 100%;
            overflow-x: auto; /* Handle code blocks gracefully */
        }
        .lemmy-content pre, .lemmy-content code {
            white-space: pre-wrap;
            word-break: break-all;
        }
        .status-body, .user-info {
            display: flex;
            flex-direction: column;
            min-width: 0; /* Crucial for flexbox truncation */
            width: 100%;
        }
        .comment-wrapper {
            padding-top: 12px;
            border-bottom: 1px solid var(--border-color, #444);
        }
        .comment-wrapper:last-of-type {
            border-bottom: none;
        }
        .status-header {
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            gap: 0.5rem;
        }
        .display-name {
           font-weight: bold;
        }
        .acct, .user-link {
            color: var(--text-secondary-color, #aaa);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-shrink: 1;
        }
        .time-ago {
            margin-left: auto;
            color: var(--text-secondary-color, #aaa);
            padding-left: 0.5rem;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .user-info-line2 {
             display: flex;
             align-items: center;
             gap: 0.25rem;
             flex-wrap: wrap;
        }
        .status-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 8px;
            color: var(--text-secondary-color, #aaa);
        }
        .status-actions-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .view-replies-btn {
            background-color: transparent;
            border: none;
            color: var(--accent-color, #5a99e0);
            cursor: pointer;
            display: block;
            width: 100%;
            text-align: center;
            padding: 12px 0;
            margin-top: 8px;
            border-top: 1px solid var(--border-color, #444);
            font-weight: 500;
        }
        .view-replies-btn:hover {
            text-decoration: underline;
        }
        .view-replies-btn:disabled {
            color: var(--text-secondary-color, #aaa);
            cursor: default;
            text-decoration: none;
        }
        @media (max-width: 480px) {
            .status.lemmy-comment, .status.lemmy-post {
                padding: 10px 5px;
                gap: 8px;
            }
            .display-name, .community-link {
               font-size: 0.9rem;
            }
            .acct, .user-link, .user-info-line2 {
                font-size: 0.8rem;
            }
            .view-replies-btn {
                font-size: 0.9rem;
                padding: 10px 0;
            }
        }
    `;
    document.head.appendChild(style);
}

injectLemmyStyles();

export function renderLemmyComment(commentView, state, actions, postAuthorId = null) {
    const commentWrapper = document.createElement('div');
    commentWrapper.className = 'comment-wrapper';
    commentWrapper.id = `comment-wrapper-${commentView.comment.id}`;

    const commentDiv = document.createElement('div');
    commentDiv.className = 'status lemmy-comment';
    commentDiv.dataset.commentId = commentView.comment.id;

    const converter = new showdown.Converter();
    let htmlContent = converter.makeHtml(commentView.comment.content);
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror=null;
            this.src='images/404.png';
            this.classList.add('broken-image-fallback');
        };
    });
    htmlContent = tempDiv.innerHTML;


    const isOP = postAuthorId && commentView.creator.id === postAuthorId;
    const isCreator = state.lemmyUsername && state.lemmyUsername === commentView.creator.name;

    commentDiv.innerHTML = `
        <div class="status-avatar">
            <img src="${commentView.creator.avatar || 'images/php.png'}" alt="${commentView.creator.name}'s avatar" class="avatar" onerror="this.onerror=null;this.src='images/php.png';">
        </div>
        <div class="status-body">
            <div class="status-header">
                <span class="display-name">${commentView.creator.display_name || commentView.creator.name}</span>
                <span class="acct">@${commentView.creator.name}@${new URL(commentView.creator.actor_id).hostname}</span>
                ${isOP ? '<span class="op-badge">OP</span>' : ''}
                <span class="time-ago">${timeAgo(commentView.comment.published)}</span>
            </div>
            <div class="status-content lemmy-content">${htmlContent}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                     <button class="status-action lemmy-vote-btn" data-action="upvote" title="Upvote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${commentView.counts.score}</span>
                     <button class="status-action lemmy-vote-btn" data-action="downvote" title="Downvote">${ICONS.lemmyDownvote}</button>
                </div>
                <div class="status-actions-right">
                    <button class="status-action reply-btn" title="Reply">${ICONS.comments}</button>
                    <button class="status-action more-options-btn" title="More">${ICONS.more}</button>
                </div>
            </div>
            <div class="lemmy-reply-box-container" style="display: none;"></div>
        </div>
    `;
    
    commentWrapper.appendChild(commentDiv);
    
    const repliesContainer = document.createElement('div');
    repliesContainer.className = 'lemmy-replies-container';
    repliesContainer.style.display = 'none';

    if (commentView.counts.child_count > 0) {
        const viewRepliesBtn = document.createElement('button');
        viewRepliesBtn.className = 'view-replies-btn';
        viewRepliesBtn.textContent = `View ${commentView.counts.child_count} replies`;
        viewRepliesBtn.addEventListener('click', () => toggleLemmyReplies(commentView.comment.id, commentView.post.id, repliesContainer, state, actions, postAuthorId, viewRepliesBtn));
        commentWrapper.appendChild(viewRepliesBtn);
    }

    commentWrapper.appendChild(repliesContainer);

    const upvoteBtn = commentDiv.querySelector('.lemmy-vote-btn[data-action="upvote"]');
    const downvoteBtn = commentDiv.querySelector('.lemmy-vote-btn[data-action="downvote"]');
    if (commentView.my_vote === 1) upvoteBtn.classList.add('active');
    if (commentView.my_vote === -1) downvoteBtn.classList.add('active');

    upvoteBtn.addEventListener('click', () => actions.lemmyCommentVote(commentView.comment.id, 1, commentDiv));
    downvoteBtn.addEventListener('click', () => actions.lemmyCommentVote(commentView.comment.id, -1, commentDiv));

    const replyBtn = commentDiv.querySelector('.reply-btn');
    const replyBoxContainer = commentDiv.querySelector('.lemmy-reply-box-container');
    replyBtn.addEventListener('click', () => {
        toggleReplyBox(replyBoxContainer, commentView.post.id, commentView.comment.id, actions);
    });

    const moreOptionsBtn = commentDiv.querySelector('.more-options-btn');
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuItems = [
            { label: 'Share Comment', action: () => {
                 navigator.clipboard.writeText(commentView.comment.ap_id);
                 showToast('Comment URL copied to clipboard!');
            }},
            { label: 'Take Screenshot', action: () => actions.showScreenshotPage(commentView, null) }
        ];

        if (isCreator) {
            menuItems.push({
                label: 'Edit Comment',
                action: () => showEditUI(commentDiv, commentView, actions)
            });
            menuItems.push({
                label: 'Delete Comment',
                action: () => {
                    if (window.confirm('Are you sure you want to delete this comment?')) {
                        actions.lemmyDeleteComment(commentView.comment.id);
                    }
                }
            });
        }

        if (state.lemmyUsername) {
             menuItems.push({
                label: `Block @${commentView.creator.name}`,
                action: () => actions.lemmyBlockUser(commentView.creator.id, true)
            });
        }

        actions.showContextMenu(e, menuItems);
    });

    return commentWrapper;
}


function showEditUI(commentDiv, commentView, actions) {
    const contentDiv = commentDiv.querySelector('.status-content');
    const originalContent = commentView.comment.content;
    const originalHtml = contentDiv.innerHTML;

    contentDiv.innerHTML = `
        <div class="edit-comment-container">
            <textarea class="edit-comment-textarea">${originalContent}</textarea>
            <div class="edit-comment-actions">
                <button class="button-secondary cancel-edit-btn">Cancel</button>
                <button class="button-primary save-edit-btn">Save</button>
            </div>
        </div>
    `;

    const textarea = contentDiv.querySelector('.edit-comment-textarea');
    const saveBtn = contentDiv.querySelector('.save-edit-btn');
    const cancelBtn = contentDiv.querySelector('.cancel-edit-btn');

    textarea.focus();

    saveBtn.addEventListener('click', async () => {
        const newContent = textarea.value.trim();
        if (newContent && newContent !== originalContent) {
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
                await actions.lemmyEditComment(commentView.comment.id, newContent);
            } catch (error) {
                console.error("Failed to save comment:", error);
                contentDiv.innerHTML = originalHtml;
                showToast("Failed to save comment. Please try again.");
            }
        } else {
            contentDiv.innerHTML = originalHtml;
        }
    });

    cancelBtn.addEventListener('click', () => {
        contentDiv.innerHTML = originalHtml;
    });
}


async function toggleLemmyReplies(commentId, postId, container, state, actions, postAuthorId, button) {
    button.textContent = 'Loading...';
    button.disabled = true;

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        container.innerHTML = 'Could not load replies.';
        button.textContent = 'Error';
        return;
    }

    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&parent_id=${commentId}&max_depth=8&sort=New`, { method: 'GET' }, 'lemmy');
        const replies = response?.data?.comments;
        
        const filteredReplies = replies.filter(reply => reply.comment.id !== commentId);

        container.innerHTML = '';
        container.style.display = 'block';
        
        if (filteredReplies && filteredReplies.length > 0) {
            filteredReplies.forEach(replyView => {
                container.appendChild(renderLemmyComment(replyView, state, actions, postAuthorId));
            });
        } else {
            container.innerHTML = 'No replies found.';
        }
        button.style.display = 'none';
    } catch (error) {
        console.error('Failed to fetch replies:', error);
        container.innerHTML = 'Failed to load replies.';
        button.textContent = 'Failed to load';
        button.disabled = false;
    }
}

function toggleReplyBox(container, postId, parentCommentId, actions) {
    const isVisible = container.style.display === 'block';
    if (isVisible) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <textarea class="lemmy-reply-textarea" placeholder="Write a reply..."></textarea>
        <div class="reply-box-actions">
            <button class="button-secondary cancel-reply-btn">Cancel</button>
            <button class="button-primary send-reply-btn">Reply</button>
        </div>
    `;

    const textarea = container.querySelector('.lemmy-reply-textarea');
    const sendBtn = container.querySelector('.send-reply-btn');
    const cancelBtn = container.querySelector('.cancel-reply-btn');

    sendBtn.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (!content) return;

        try {
            await actions.lemmyPostComment({
                content: content,
                post_id: postId,
                parent_id: parentCommentId
            });
            showToast('Reply posted!');
            container.style.display = 'none';
        } catch (error) {
            showToast('Failed to post reply.');
        }
    });

    cancelBtn.addEventListener('click', () => {
        container.style.display = 'none';
    });
}

export async function renderLemmyPostPage(state, postData, actions) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = '<div class="loading">Loading post...</div>';

    let postView = postData;

    // If we only received a post object (or just an ID), fetch the full post view
    if (!postData || !postData.post || !postData.community) {
        const postId = postData.id || postData.post?.id;
        if (postId) {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                const response = await apiFetch(lemmyInstance, null, `/api/v3/post?id=${postId}`, { method: 'GET' }, 'lemmy');
                postView = response?.data?.post_view;
                if (!postView) throw new Error('Post not found.');
            } catch (error) {
                console.error("Failed to fetch full post view:", error);
                view.innerHTML = `<div class="error">Failed to load post.</div>`;
                return;
            }
        } else {
            console.error("renderLemmyPostPage called with invalid data", postData);
            view.innerHTML = `<div class="error">Failed to load post: Invalid data.</div>`;
            return;
        }
    }

    view.innerHTML = `
        <div class="lemmy-post-view-container">
            <div class="lemmy-post-full"></div>
            <div class="lemmy-comments-section">
                <h3>Comments</h3>
                <div class="lemmy-post-reply-box">
                     <textarea class="lemmy-main-reply-textarea" placeholder="Write a comment..."></textarea>
                     <button class="button-primary send-main-reply-btn">Comment</button>
                </div>
                <div class="lemmy-comments-container">Loading comments...</div>
            </div>
        </div>
    `;

    const postContainer = view.querySelector('.lemmy-post-full');
    const commentsContainer = view.querySelector('.lemmy-comments-container');
    
    const postCard = document.createElement('div');
    const post = postView.post;
    const isImageUrl = post.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url);
    
    const converter = new showdown.Converter();
    let bodyHtml = post.body ? converter.makeHtml(post.body) : '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = bodyHtml;
    tempDiv.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror=null;
            this.src='images/404.png';
            this.classList.add('broken-image-fallback');
        };
    });
    bodyHtml = tempDiv.innerHTML;

    postCard.innerHTML = `
        <div class="status lemmy-post" data-id="${post.id}">
            <div class="status-header">
                <img src="${postView.community.icon || 'images/pfp.png'}" class="avatar" alt="${postView.community.name}" onerror="this.onerror=null;this.src='images/pfp.png';">
                <div class="user-info">
                    <a href="#/lemmy/community/${postView.community.name}" class="community-link user-info-line1">${postView.community.name}</a>
                    <div class="user-info-line2">
                        <span>posted by </span>
                        <a href="#/lemmy/user/${postView.creator.id}" class="user-link">${postView.creator.name}</a>
                        <span class="time-ago">${timeAgo(post.published)}</span>
                    </div>
                </div>
            </div>
            <h3>${post.name}</h3>
            <div class="lemmy-post-body lemmy-content">
                ${bodyHtml}
                ${isImageUrl 
                    ? `<div class="lemmy-card-image-container"><img src="${post.url}" alt="${post.name}" class="lemmy-card-image" onerror="this.onerror=null;this.src='images/404.png';"></div>` 
                    : (post.url ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link-preview">${post.url}</a>` : '')
                }
            </div>
             <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn" data-action="upvote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${postView.counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action">
                    ${ICONS.comments}
                    <span>${postView.counts.comments}</span>
                </button>
                <button class="status-action lemmy-save-btn">${ICONS.bookmark}</button>
            </div>
        </div>
    `;
    postContainer.appendChild(postCard);

    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${post.id}&max_depth=8&sort=New`, { method: 'GET' }, 'lemmy');
        const comments = response?.data?.comments;
        commentsContainer.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(commentView => {
                commentsContainer.appendChild(renderLemmyComment(commentView, state, actions, postView.creator.id));
            });
        } else {
            commentsContainer.innerHTML = 'No comments yet.';
        }
    } catch (error) {
        commentsContainer.innerHTML = 'Failed to load comments.';
    }

    const mainReplyTextarea = view.querySelector('.lemmy-main-reply-textarea');
    const mainReplyBtn = view.querySelector('.send-main-reply-btn');
    mainReplyBtn.addEventListener('click', async () => {
        const content = mainReplyTextarea.value.trim();
        if (!content) return;
        try {
            await actions.lemmyPostComment({
                content: content,
                post_id: post.id
            });
            showToast('Comment posted! Refreshing...');
            actions.showLemmyPostDetail(postView);
        } catch (error) {
            showToast('Failed to post comment.');
        }
    });
}
