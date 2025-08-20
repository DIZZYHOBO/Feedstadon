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
    commentWrapper.style.cssText = 'max-width: 100%; overflow-x: hidden;';

    const commentDiv = document.createElement('div');
    commentDiv.className = 'status lemmy-comment';
    commentDiv.dataset.commentId = commentView.comment.id;
    commentDiv.style.cssText = 'max-width: 100%; word-wrap: break-word; overflow-wrap: break-word;';

    const converter = new showdown.Converter();
    let rawContent = commentView.comment.content;
    
    // Process spoiler tags first
    const processedContent = processSpoilerTags(rawContent);
    let htmlContent = converter.makeHtml(processedContent);
    
    // Add error handling for images in post body and constrain them
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Handle images - wrap them in proper containers and style them
    tempDiv.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror=null;
            this.src='images/404.png';
            this.classList.add('broken-image-fallback');
        };
        
        // Create a wrapper div for the image
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'comment-image-wrapper';
        imageWrapper.style.cssText = `
            display: block;
            margin: 15px 0;
            max-width: 100%;
            text-align: center;
            overflow: hidden;
            border-radius: var(--border-radius);
            background-color: var(--bg-color);
        `;
        
        // Style the image
        img.style.cssText = `
            max-width: 100%;
            max-height: 400px;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: var(--border-radius);
            display: block;
            margin: 0 auto;
            cursor: pointer;
            transition: opacity 0.2s ease;
        `;
        
        // Add hover effect
        img.addEventListener('mouseenter', () => {
            img.style.opacity = '0.9';
        });
        img.addEventListener('mouseleave', () => {
            img.style.opacity = '1';
        });
        
        // Add click handler to open in modal
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.showImageModal) {
                window.showImageModal(img.src);
            }
        });
        
        // Add class for consistent styling
        img.classList.add('comment-image');
        
        // Wrap the image
        img.parentNode.insertBefore(imageWrapper, img);
        imageWrapper.appendChild(img);
    });
    
    // Get the processed HTML back
    htmlContent = tempDiv.innerHTML;
    // Ensure all content wraps properly
    tempDiv.querySelectorAll('p, div, span, pre, code').forEach(el => {
        el.style.wordWrap = 'break-word';
        el.style.overflowWrap = 'break-word';
        el.style.maxWidth = '100%';
    });
    // Special handling for code blocks
    tempDiv.querySelectorAll('pre').forEach(pre => {
        pre.style.overflowX = 'auto';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.maxWidth = '100%';
    });
    htmlContent = tempDiv.innerHTML;

    const isOP = postAuthorId && commentView.creator.id === postAuthorId;
    const currentUsername = localStorage.getItem('lemmy_username');
    const isCreator = currentUsername && currentUsername === commentView.creator.name;
    const isLoggedIn = localStorage.getItem('lemmy_jwt');

    commentDiv.innerHTML = `
        <div class="status-avatar" style="flex-shrink: 0;">
            <img src="${commentView.creator.avatar || 'images/php.png'}" alt="${commentView.creator.name}'s avatar" class="avatar" onerror="this.onerror=null;this.src='images/php.png';">
        </div>
        <div class="status-body" style="min-width: 0; flex: 1; max-width: calc(100% - 60px); overflow: hidden;">
            <div class="status-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; max-width: 100%;">
                <div class="comment-user-info" style="flex: 1; min-width: 0; word-wrap: break-word; max-width: 100%;">
                   <span class="username-instance" style="font-size: 1.2em; font-weight: bold; word-break: break-all; max-width: 100%; display: inline-block;">@${commentView.creator.name}@${new URL(commentView.creator.actor_id).hostname}</span>
                    ${isOP ? '<span class="op-badge">OP</span>' : ''}
                </div>
                <span class="time-ago" style="flex-shrink: 0;">${timeAgo(commentView.comment.published)}</span>
            </div>
            <div class="status-content" style="max-width: 100%; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; overflow: hidden;">${htmlContent}</div>
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
            <div class="lemmy-replies-container" style="display: none; max-width: 100%; overflow: hidden;"></div>
            <div class="lemmy-reply-box-container" style="display: none; max-width: 100%; overflow: hidden;"></div>
        </div>
    `;

    // Add spoiler functionality after the content is added to the DOM
    addSpoilerFunctionality(commentDiv);

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
            console.log('View replies button clicked');
            console.log('Available actions:', Object.keys(actions));
            console.log('Current post view:', state.currentPostView);
            console.log('Comment ID for thread:', commentView.comment.id);
            
            // Navigate to the comment thread page
            if (actions.showLemmyCommentThread && typeof actions.showLemmyCommentThread === 'function') {
                actions.showLemmyCommentThread(state.currentPostView, commentView.comment.id);
            } else {
                console.error('showLemmyCommentThread action not available, falling back to inline expansion');
                // Fallback: use the old inline expansion method
                toggleLemmyReplies(commentView.comment.id, commentView.post.id, repliesContainer, state, actions, postAuthorId);
            }
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
        
        // Always available options
        menuItems.push(
            { label: 'Share Comment', action: () => actions.shareComment(commentView) },
            { label: 'Copy Comment URL', action: () => {
                navigator.clipboard.writeText(commentView.comment.ap_id);
                showToast('Comment URL copied to clipboard!');
            }},
            { label: 'Take Screenshot', action: () => {
                // This is the key addition - the screenshot action
                actions.showScreenshotPage(commentView, state.currentPostView);
            }}
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

        if (isLoggedIn && !isCreator) {
            menuItems.push({
                label: `Block @${commentView.creator.name}`,
                action: () => {
                    if (window.confirm(`Are you sure you want to block ${commentView.creator.name}?`)) {
                        actions.lemmyBlockUser(commentView.creator.id, true);
                    }
                }
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

// Function to process spoiler tags in markdown content
function processSpoilerTags(content) {
    if (!content) return '';
    
    // Match spoiler tags like ::: spoiler Title ... :::
    const spoilerRegex = /:::\s*spoiler\s*(.*?)\n([\s\S]*?):::/gi;
    
    return content.replace(spoilerRegex, (match, title, spoilerContent) => {
        const spoilerId = `spoiler-${Math.random().toString(36).substr(2, 9)}`;
        const cleanTitle = title.trim() || 'Spoiler';
        const cleanContent = spoilerContent.trim();
        
        return `<div class="spoiler-container" data-spoiler-id="${spoilerId}">
            <button class="spoiler-toggle-btn" data-target="${spoilerId}">
                <span class="spoiler-title">${cleanTitle}</span>
                <svg class="spoiler-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-left: 8px; transition: transform 0.3s ease;">
                    <path fill="currentColor" d="M7,10L12,15L17,10H7Z"/>
                </svg>
            </button>
            <div class="spoiler-content" id="${spoilerId}" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                <div class="spoiler-inner">
                    ${cleanContent}
                </div>
            </div>
        </div>`;
    });
}

// Function to add spoiler functionality after DOM is ready
function addSpoilerFunctionality(container) {
    const spoilerContainers = container.querySelectorAll('.spoiler-container');
    
    spoilerContainers.forEach(spoilerContainer => {
        const toggleBtn = spoilerContainer.querySelector('.spoiler-toggle-btn');
        const spoilerContent = spoilerContainer.querySelector('.spoiler-content');
        const spoilerIcon = spoilerContainer.querySelector('.spoiler-icon');
        
        if (toggleBtn && spoilerContent && spoilerIcon) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isExpanded = spoilerContent.style.maxHeight !== '0px' && spoilerContent.style.maxHeight !== '';
                
                if (isExpanded) {
                    // Collapse
                    spoilerContent.style.maxHeight = '0px';
                    spoilerIcon.style.transform = 'rotate(0deg)';
                    spoilerContainer.classList.remove('expanded');
                } else {
                    // Expand
                    spoilerContent.style.maxHeight = spoilerContent.scrollHeight + 'px';
                    spoilerIcon.style.transform = 'rotate(180deg)';
                    spoilerContainer.classList.add('expanded');
                }
            });
        }
    });
}

function showEditUI(commentDiv, commentView, actions) {
    const contentDiv = commentDiv.querySelector('.status-content');
    const originalContent = commentView.comment.content;
    const originalHtml = contentDiv.innerHTML;

    // Create edit container
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-comment-container';
    editContainer.style.maxWidth = '100%';
    editContainer.innerHTML = `
        <textarea class="edit-comment-textarea" style="width: 100%; max-width: 100%; min-height: 100px; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--bg-color); color: var(--font-color); resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.4; box-sizing: border-box;">${originalContent}</textarea>
        <div class="edit-comment-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; max-width: 100%;">
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
        // Re-add spoiler functionality
        addSpoilerFunctionality(contentDiv);
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
            addSpoilerFunctionality(contentDiv);
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
            const processedContent = processSpoilerTags(newContent);
            let newHtmlContent = converter.makeHtml(processedContent);
            
            // Add error handling for images in the new content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtmlContent;
            
            // Handle images - wrap them in proper containers and style them
            tempDiv.querySelectorAll('img').forEach(img => {
                img.onerror = function() {
                    this.onerror = null;
                    this.src = 'images/404.png';
                    this.classList.add('broken-image-fallback');
                };
                
                // Create a wrapper div for the image
                const imageWrapper = document.createElement('div');
                imageWrapper.className = 'comment-image-wrapper';
                imageWrapper.style.cssText = `
                    display: block;
                    margin: 15px 0;
                    max-width: 100%;
                    text-align: center;
                    overflow: hidden;
                    border-radius: var(--border-radius);
                    background-color: var(--bg-color);
                `;
                
                // Style the image
                img.style.cssText = `
                    max-width: 100%;
                    max-height: 400px;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    border-radius: var(--border-radius);
                    display: block;
                    margin: 0 auto;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                `;
                
                // Add hover effect
                img.addEventListener('mouseenter', () => {
                    img.style.opacity = '0.9';
                });
                img.addEventListener('mouseleave', () => {
                    img.style.opacity = '1';
                });
                
                // Add click handler to open in modal
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.showImageModal) {
                        window.showImageModal(img.src);
                    }
                });
                
                img.classList.add('comment-image');
                
                // Wrap the image
                img.parentNode.insertBefore(imageWrapper, img);
                imageWrapper.appendChild(img);
            });
            
            // Get the processed HTML back
            newHtmlContent = tempDiv.innerHTML;
            // Ensure all content wraps properly
            tempDiv.querySelectorAll('p, div, span, pre, code').forEach(el => {
                el.style.wordWrap = 'break-word';
                el.style.overflowWrap = 'break-word';
                el.style.maxWidth = '100%';
            });
            tempDiv.querySelectorAll('pre').forEach(pre => {
                pre.style.overflowX = 'auto';
                pre.style.whiteSpace = 'pre-wrap';
                pre.style.maxWidth = '100%';
            });
            newHtmlContent = tempDiv.innerHTML;
            
            // Update the content div with new HTML
            contentDiv.innerHTML = newHtmlContent;
            
            // Re-add spoiler functionality
            addSpoilerFunctionality(contentDiv);
            
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
            let isChildByPath = false;
            if (targetPath && reply.comment.path) {
                const replyPath = reply.comment.path;
                const pathParts = replyPath.split('.');
                const targetPathParts = targetPath.split('.');
                
                // Direct child should have one more level than parent
                isChildByPath = pathParts.length === targetPathParts.length + 1 && 
                               replyPath.startsWith(targetPath + '.');
            }
            
            return hasMatchingParentId || isChildByPath;
        });

        container.innerHTML = '';
        if (directReplies && directReplies.length > 0) {
            // Sort replies by creation time (oldest first)
            directReplies.sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));
            
            directReplies.forEach(replyView => {
                const replyElement = renderLemmyComment(replyView, state, actions, postAuthorId);
                // Ensure replies container also respects screen width
                replyElement.style.maxWidth = '100%';
                replyElement.style.overflow = 'hidden';
                container.appendChild(replyElement);
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
        <textarea class="lemmy-reply-textarea" placeholder="Write a reply..." style="width: 100%; max-width: 100%; min-height: 80px; word-wrap: break-word; box-sizing: border-box; resize: vertical; font-family: inherit;"></textarea>
        <div class="reply-box-actions" style="max-width: 100%;">
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
    // Store the current post view for use in comment threads
    state.currentPostView = post;
    
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
        
        console.log('All comments loaded:', comments.length);
        console.log('Comments with parent_id:', comments.filter(c => c.comment.parent_id).length);
        console.log('Comments without parent_id (should be top-level):', comments.filter(c => !c.comment.parent_id).length);
        
        if (comments && comments.length > 0) {
            // Only show top-level comments (no parent_id)
            const topLevelComments = comments.filter(c => !c.comment.parent_id);
            console.log('Top-level comments filtered:', topLevelComments.length);
            
            if (topLevelComments.length > 0) {
                topLevelComments.forEach(commentView => {
                    const commentElement = renderLemmyComment(commentView, state, actions, post.creator.id);
                    commentsContainer.appendChild(commentElement);
                });
            } else {
                commentsContainer.innerHTML = '<p>No top-level comments yet. Be the first to comment!</p>';
            }
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
            // Only show top-level comments (no parent_id)
            const topLevelComments = comments.filter(c => !c.comment.parent_id);
            
            if (topLevelComments.length > 0) {
                topLevelComments.forEach(commentView => {
                    const commentElement = renderLemmyComment(commentView, state, actions, postView.creator.id);
                    commentsContainer.appendChild(commentElement);
                });
            } else {
                commentsContainer.innerHTML = '<p>No top-level comments.</p>';
            }
        } else {
            commentsContainer.innerHTML = '<p>No comments yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        commentsContainer.innerHTML = '<p>Failed to load comments from this instance.</p>';
    }
}
