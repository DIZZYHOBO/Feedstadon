import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { timeAgo } from './utils.js';
import { showToast } from './ui.js';
import { renderLemmyCard } from './Lemmy.js';

// Make sure this export is at the top level
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
    const isLoggedIn = localStorage.getItem('lemmy_jwt');

    commentDiv.innerHTML = `
        <div class="status-avatar">
            <img src="${commentView.creator.avatar || 'images/php.png'}" alt="${commentView.creator.name}'s avatar" class="avatar" onerror="this.onerror=null;this.src='images/php.png';">
        </div>
        <div class="status-body">
            <div class="status-header">
                <div class="comment-user-info">
                   <span class="username-instance" style="font-size: 1.2em; font-weight: bold;">@${commentView.creator.name}@${new URL(commentView.creator.actor_id).hostname}</span>
                    ${isOP ? '<span class="op-badge">OP</span>' : ''}
                </div>
                <span class="time-ago">${timeAgo(commentView.comment.published)}</span>
            </div>
            <div class="status-content">${htmlContent}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                     <button class="status-action lemmy-vote-btn" data-action="upvote" title="${!isLoggedIn ? 'Login to vote' : 'Upvote'}">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${commentView.counts.score}</span>
                     <button class="status-action lemmy-vote-btn" data-action="downvote" title="${!isLoggedIn ? 'Login to vote' : 'Downvote'}">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action reply-btn" title="${!isLoggedIn ? 'Login to reply' : 'Reply'}">${ICONS.comments}</button>
                <button class="status-action share-comment-btn" title="Share Comment">${ICONS.share}</button>
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

    upvoteBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            showToast('Please log in to vote');
            return;
        }
        actions.lemmyCommentVote(commentView.comment.id, 1, commentDiv);
    });
    downvoteBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            showToast('Please log in to vote');
            return;
        }
        actions.lemmyCommentVote(commentView.comment.id, -1, commentDiv);
    });

    const replyBtn = commentDiv.querySelector('.reply-btn');
    const replyBoxContainer = commentDiv.querySelector('.lemmy-reply-box-container');
    replyBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            showToast('Please log in to reply');
            return;
        }
        toggleReplyBox(replyBoxContainer, commentView.post.id, commentView.comment.id, actions);
    });

    // Share comment button
    const shareCommentBtn = commentDiv.querySelector('.share-comment-btn');
    shareCommentBtn.addEventListener('click', () => {
        actions.shareComment(commentView);
    });

    const repliesContainer = commentDiv.querySelector('.lemmy-replies-container');
    if (commentView.counts.child_count > 0) {
        const viewRepliesBtn = document.createElement('button');
        viewRepliesBtn.className = 'view-replies-btn';
        viewRepliesBtn.textContent = `View ${commentView.counts.child_count} replies`;
        commentDiv.querySelector('.status-footer').insertAdjacentElement('afterend', viewRepliesBtn);
        viewRepliesBtn.addEventListener('click', () => {
            toggleLemmyReplies(commentView.comment.id, commentView.post.id, repliesContainer, state, actions, postAuthorId);
        });
    }

    const moreOptionsBtn = commentDiv.querySelector('.more-options-btn');
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Create a dropdown menu instead of using context menu
        const existingMenu = document.querySelector('.comment-dropdown-menu');
        if (existingMenu) existingMenu.remove();
        
        const menu = document.createElement('div');
        menu.className = 'comment-dropdown-menu';
        menu.style.position = 'absolute';
        menu.style.zIndex = '1000';
        
        const menuItems = [];
        menuItems.push(
            { label: 'Share Comment', action: () => actions.shareComment(commentView) },
            { label: 'Copy Comment URL', action: () => {
                navigator.clipboard.writeText(commentView.comment.ap_id);
                showToast('Comment URL copied to clipboard!');
            }},
            { label: 'Take Screenshot', action: () => actions.showScreenshotPage(commentView, null) }
        );

        if (isLoggedIn && isCreator) {
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

        if (isLoggedIn) {
            menuItems.push({
                label: `Block @${commentView.creator.name}`,
                action: () => actions.lemmyBlockUser(commentView.creator.id, true)
            });
        }

        menuItems.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.label;
            button.onclick = () => {
                item.action();
                menu.remove();
            };
            menu.appendChild(button);
        });
        
        document.body.appendChild(menu);
        
        // Position the menu
        const rect = moreOptionsBtn.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;
        
        // Check if menu would go off bottom of screen
        if (rect.bottom + menuHeight > window.innerHeight) {
            // Position above the button
            menu.style.top = `${rect.top - menuHeight}px`;
        } else {
            // Position below the button
            menu.style.top = `${rect.bottom}px`;
        }
        
        // Check if menu would go off right side of screen
        if (rect.left + menuWidth > window.innerWidth) {
            // Align to right edge of button
            menu.style.left = `${rect.right - menuWidth}px`;
        } else {
            // Align to left edge of button
            menu.style.left = `${rect.left}px`;
        }
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    });

    commentWrapper.appendChild(commentDiv);
    return commentWrapper;
}

function showEditUI(commentDiv, commentView, actions) {
    const contentDiv = commentDiv.querySelector('.status-content');
    const originalContent = commentView.comment.content;
    const originalHtml = contentDiv.innerHTML;

    // Create edit container
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-comment-container';
    editContainer.innerHTML = `
        <textarea class="edit-comment-textarea" style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--bg-color); color: var(--font-color); resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.4;">${originalContent}</textarea>
        <div class="edit-comment-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button class="button-secondary cancel-edit-btn" style="padding: 8px 16px;">Cancel</button>
            <button class="button-primary save-edit-btn" style="padding: 8px 16px; background-color: var(--accent-color); color: white; border: none;">Save</button>
        </div>
    `;

    // Replace content with edit container
    contentDiv.innerHTML = '';
    contentDiv.appendChild(editContainer);

    const textarea = editContainer.querySelector('.edit-comment-textarea');
    const saveBtn = editContainer.querySelector('.save-edit-btn');
    const cancelBtn = editContainer.querySelector('.cancel-edit-btn');

    // Focus the textarea and position cursor at end
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // Cancel button functionality
    cancelBtn.addEventListener('click', () => {
        contentDiv.innerHTML = originalHtml;
    });

    // Save button functionality
    saveBtn.addEventListener('click', async () => {
        const newContent = textarea.value.trim();
        
        if (!newContent) {
            alert('Comment cannot be empty');
            return;
        }

        if (newContent === originalContent) {
            // No changes made, just restore original
            contentDiv.innerHTML = originalHtml;
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            // Call the edit action
            await actions.lemmyEditComment(commentView.comment.id, newContent);
            
            // Update the comment view object with new content
            commentView.comment.content = newContent;
            
            // Convert markdown to HTML and update the display
            const converter = new showdown.Converter();
            let newHtmlContent = converter.makeHtml(newContent);
            
            // Add error handling for images in the new content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtmlContent;
            tempDiv.querySelectorAll('img').forEach(img => {
                img.onerror = function() {
                    this.onerror = null;
                    this.src = 'images/404.png';
                    this.classList.add('broken-image-fallback');
                };
            });
            newHtmlContent = tempDiv.innerHTML;
            
            // Update the content div with new HTML
            contentDiv.innerHTML = newHtmlContent;
            
        } catch (error) {
            console.error("Failed to save comment:", error);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            alert("Failed to save comment. Please try again.");
        }
    });

    // Handle Enter key (optional - save on Ctrl+Enter)
    textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            saveBtn.click();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelBtn.click();
        }
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
        // Get all comments for the post
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&max_depth=8&sort=New`, { method: 'GET' }, 'lemmy');
        const allComments = response?.data?.comments;
        
        if (!allComments || allComments.length === 0) {
            container.innerHTML = 'No replies found.';
            return;
        }
        
        // Convert commentId to number for comparison (Lemmy uses numeric IDs)
        const targetCommentId = Number(commentId);
        
        // Find only the direct children of this specific comment
        // Check the comment's path to determine parent-child relationships
        const targetComment = allComments.find(c => Number(c.comment.id) === targetCommentId);
        const targetPath = targetComment?.comment?.path || '';
        
        const directReplies = allComments.filter(reply => {
            // A reply is a direct child if:
            // 1. It has a parent_id that matches our target comment
            const hasMatchingParentId = reply.comment.parent_id && Number(reply.comment.parent_id) === targetCommentId;
            
            // 2. OR its path starts with the target comment's path and is one level deeper
            const replyPath = reply.comment.path || '';
            const isChildByPath = targetPath && replyPath.startsWith(targetPath + '.') && 
                                  (replyPath.split('.').length === targetPath.split('.').length + 1);
            
            return hasMatchingParentId || isChildByPath;
        });

        container.innerHTML = '';
        if (directReplies && directReplies.length > 0) {
            // Sort replies by creation time (oldest first)
            directReplies.sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));
            
            directReplies.forEach(replyView => {
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

export async function renderLemmyPostPage(state, post, actions) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = `
        <div class="lemmy-post-detail">
            <div class="main-post-area"></div>
            <div class="comments-area">
                <h3>Comments</h3>
                <div id="lemmy-comments-list"></div>
            </div>
        </div>
    `;

    const mainPostArea = view.querySelector('.main-post-area');
    const commentsContainer = view.querySelector('#lemmy-comments-list');

    // Render the main post
    const postCard = renderLemmyCard(post, actions);
    mainPostArea.appendChild(postCard);

    // Load comments
    commentsContainer.innerHTML = 'Loading comments...';
    
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${post.post.id}&max_depth=8&sort=Top`, {}, 'lemmy');
        
        const comments = response.data.comments;
        commentsContainer.innerHTML = '';
        
        if (comments && comments.length > 0) {
            // Build comment tree structure
            const commentTree = buildCommentTree(comments);
            renderCommentTree(commentTree, commentsContainer, state, actions, post.creator.id);
        } else {
            commentsContainer.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        commentsContainer.innerHTML = '<p>Failed to load comments.</p>';
    }
}

export async function renderPublicLemmyPostPage(state, postView, actions, instance) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = `
        <div class="lemmy-post-detail">
            <div class="main-post-area"></div>
            <div class="comments-area">
                <h3>Comments</h3>
                <div id="lemmy-comments-list"></div>
            </div>
        </div>
    `;

    const mainPostArea = view.querySelector('.main-post-area');
    const commentsContainer = view.querySelector('#lemmy-comments-list');

    // Render the main post
    const postCard = renderLemmyCard(postView, actions);
    mainPostArea.appendChild(postCard);

    // Load comments from the public instance
    commentsContainer.innerHTML = 'Loading comments...';
    
    try {
        const apiUrl = `https://${instance}/api/v3/comment/list?post_id=${postView.post.id}&max_depth=8&sort=Top`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const comments = data.comments;
        
        commentsContainer.innerHTML = '';
        
        if (comments && comments.length > 0) {
            const commentTree = buildCommentTree(comments);
            renderCommentTree(commentTree, commentsContainer, state, actions, postView.creator.id);
        } else {
            commentsContainer.innerHTML = '<p>No comments yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        commentsContainer.innerHTML = '<p>Failed to load comments from this instance.</p>';
    }
}

function buildCommentTree(comments) {
    const commentMap = {};
    const rootComments = [];

    // First pass: create a map of all comments
    comments.forEach(commentView => {
        commentMap[commentView.comment.id] = {
            ...commentView,
            children: []
        };
    });

    // Second pass: build the tree structure
    comments.forEach(commentView => {
        const comment = commentMap[commentView.comment.id];
        const parentId = commentView.comment.parent_id;
        
        if (parentId && commentMap[parentId]) {
            commentMap[parentId].children.push(comment);
        } else {
            rootComments.push(comment);
        }
    });

    return rootComments;
}

function renderCommentTree(comments, container, state, actions, postAuthorId, depth = 0) {
    comments.forEach(commentView => {
        const commentElement = renderLemmyComment(commentView, state, actions, postAuthorId);
        
        // Add indentation based on depth
        if (depth > 0) {
            commentElement.style.marginLeft = `${Math.min(depth * 20, 100)}px`;
        }
        
        container.appendChild(commentElement);
        
        // Render children recursively
        if (commentView.children && commentView.children.length > 0) {
            renderCommentTree(commentView.children, container, state, actions, postAuthorId, depth + 1);
        }
    });
}
