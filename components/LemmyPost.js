import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { timeAgo } from './utils.js';
import { showToast } from './ui.js';

export function renderLemmyComment(commentView, state, actions, postAuthorId = null) {
    const commentWrapper = document.createElement('div');
    commentWrapper.className = 'comment-wrapper';
    commentWrapper.id = `comment-wrapper-${commentView.comment.id}`;

    const commentDiv = document.createElement('div');
    commentDiv.className = 'status lemmy-comment';
    commentDiv.dataset.commentId = commentView.comment.id;

    const converter = new showdown.Converter();
    let htmlContent = converter.makeHtml(commentView.comment.content);
    
    // Add error handling for images in post body
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
                <span class="time-ago">· ${timeAgo(commentView.comment.published)}</span>
            </div>
            <div class="status-content" style="word-wrap: break-word; white-space: pre-wrap; overflow-wrap: break-word;">${htmlContent}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                     <button class="status-action lemmy-vote-btn" data-action="upvote" title="Upvote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${commentView.counts.score}</span>
                     <button class="status-action lemmy-vote-btn" data-action="downvote" title="Downvote">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action reply-btn" title="Reply">${ICONS.comments}</button>
                <button class="status-action more-options-btn" title="More">${ICONS.more}</button>
            </div>
            <div class="lemmy-replies-container" style="display: none;"></div>
            <div class="lemmy-reply-box-container" style="display: none;"></div>
        </div>
    `;

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

    const repliesContainer = commentDiv.querySelector('.lemmy-replies-container');
    if (commentView.counts.child_count > 0) {
        const viewRepliesBtn = document.createElement('button');
        viewRepliesBtn.className = 'view-replies-btn';
        viewRepliesBtn.textContent = `View ${commentView.counts.child_count} replies`;
        commentDiv.querySelector('.status-footer').insertAdjacentElement('afterend', viewRepliesBtn);
        viewRepliesBtn.addEventListener('click', () => toggleLemmyReplies(commentView.comment.id, commentView.post.id, repliesContainer, state, actions, postAuthorId));
    }

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
                    // This should be replaced with a custom modal in the future
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

    commentWrapper.appendChild(commentDiv);
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
                // The action in app.js handles the UI update on success.
            } catch (error) {
                console.error("Failed to save comment:", error);
                contentDiv.innerHTML = originalHtml; // Restore original content on failure
                showToast("Failed to save comment. Please try again.");
            }
        } else {
            contentDiv.innerHTML = originalHtml; // Restore if no changes were made
        }
    });

    cancelBtn.addEventListener('click', () => {
        contentDiv.innerHTML = originalHtml;
    });
}


async function toggleLemmyReplies(commentId, postId, container, state, actions, postAuthorId) {
    const isVisible = container.style.display === 'block';
    if (isVisible) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = 'Loading replies...';

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        container.innerHTML = 'Could not load replies.';
        return;
    }

    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&parent_id=${commentId}&max_depth=8&sort=New`, { method: 'GET' }, 'lemmy');
        const replies = response?.data?.comments;
        
        // Filter out the parent comment itself, as we only want to show its children.
        const filteredReplies = replies.filter(reply => reply.comment.id !== commentId);

        container.innerHTML = '';
        if (filteredReplies && filteredReplies.length > 0) {
            filteredReplies.forEach(replyView => {
                container.appendChild(renderLemmyComment(replyView, state, actions, postAuthorId));
            });
        } else {
            container.innerHTML = 'No replies found.';
        }
    } catch (error) {
        console.error('Failed to fetch replies:', error);
        container.innerHTML = 'Failed to load replies.';
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
            const newComment = await actions.lemmyPostComment({
                content: content,
                post_id: postId,
                parent_id: parentCommentId
            });
            showToast('Reply posted!');
            // Optionally, render the new comment immediately
            container.style.display = 'none';
        } catch (error) {
            showToast('Failed to post reply.');
        }
    });

    cancelBtn.addEventListener('click', () => {
        container.style.display = 'none';
    });
}

export async function renderLemmyPostPage(state, postView, actions) {
    const view = document.getElementById('lemmy-post-view');
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
    
    // Render the main post card
    const postCard = document.createElement('div');
    const post = postView.post;
    const isImageUrl = post.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url);
    
    const converter = new showdown.Converter();
    let bodyHtml = post.body ? converter.makeHtml(post.body) : '';

    // Add error handling for images in post body
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
                    <a href="#" class="community-link user-info-line1">${postView.community.name}</a>
                    <div class="user-info-line2">
                        <span>posted by </span>
                        <a href="#" class="user-link">${postView.creator.name}</a>
                        <span class="time-ago">· ${timeAgo(post.published)}</span>
                    </div>
                </div>
            </div>
            <h3>${post.name}</h3>
            <div class="lemmy-post-body" style="word-wrap: break-word; white-space: pre-wrap; overflow-wrap: break-word;">
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

    // Fetch and render comments
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

    // Main reply box logic
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
            // Refresh comments after posting
            actions.showLemmyPostDetail(postView);
        } catch (error) {
            showToast('Failed to post comment.');
        }
    });
}
