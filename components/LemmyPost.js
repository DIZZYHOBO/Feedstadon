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
    const isLoggedIn = localStorage.getItem('lemmy_jwt');

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
        viewRepliesBtn.addEventListener('click', () => toggleLemmyReplies(commentView.comment.id, commentView.post.id, repliesContainer, state, actions, postAuthorId));
    }

    const moreOptionsBtn = commentDiv.querySelector('.more-options-btn');
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuItems = [
            { label: 'Share Comment', action: () => actions.shareComment(commentView) }, // Always available
            { label: 'Copy Comment URL', action: () => {
                 navigator.clipboard.writeText(commentView.comment.ap_id);
                 showToast('Comment URL copied to clipboard!');
            }}, // Always available
            { label: 'Take Screenshot', action: () => actions.showScreenshotPage(commentView, null) } // Always available
        ];

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

        actions.showContextMenu(e, menuItems);
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
    
    // Import the renderLemmyCard function logic to create the same card
    const post = postView.post;
    const converter = new showdown.Converter();
    
    // Use the exact same logic as renderLemmyCard from Lemmy.js
    const filterList = []; // No filtering needed for single post view
    const combinedContent = `${post.name} ${post.body || ''}`;
    
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.id;

    let mediaHTML = '';
    const url = post.url;
    if (url) {
        // YouTube embed logic (same as feed cards)
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const youtubeMatch = url.match(youtubeRegex);

        if (youtubeMatch) {
            mediaHTML = `
                <div class="video-embed-container">
                    <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        } else if (/\.(mp4|webm)$/i.test(url)) {
            mediaHTML = `<div class="status-media"><video src="${url}" controls></video></div>`;
        } else if (post.thumbnail_url) {
            mediaHTML = `<div class="status-media"><img src="${post.thumbnail_url}" alt="${post.name}" loading="lazy"></div>`;
        }
    }
    
    const isLoggedIn = localStorage.getItem('lemmy_jwt');
    let optionsMenuHTML = `
        <div class="post-options-container">
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="share-post">Share Post</button>
                ${isLoggedIn ? `<button data-action="block-community" data-community-id="${postView.community.id}">Block Community</button>` : ''}
            </div>
        </div>
    `;

    // Process spoilers and body content (same as feed cards)
    const processedBody = post.body ? converter.makeHtml(post.body) : '';
    const fullBodyHtml = processedBody;
    let bodyHTML = fullBodyHtml;
    const wordCount = post.body ? post.body.split(/\s+/).length : 0;

    if (wordCount > 30) {
        const truncatedText = post.body.split(/\s+/).slice(0, 30).join(' ');
        bodyHTML = converter.makeHtml(truncatedText) + '... <a href="#" class="read-more-link">Read More</a>';
    }

    // Use exact same HTML structure as feed cards
    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <a href="#" class="status-header-main" data-action="view-community">
                    <img src="${postView.community.icon || './images/php.png'}" alt="${postView.community.name} icon" class="avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                    <div>
                        <span class="display-name">${postView.community.name}</span>
                        <span class="acct">posted by <span class="creator-link" data-action="view-creator">${postView.creator.name}</span> · ${timeAgo(post.published)}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    <button class="share-post-btn" title="Share Post" data-action="share-header">${ICONS.share}</button>
                    ${optionsMenuHTML}
                    <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                </div>
            </div>
            <div class="status-content">
                <h3 class="lemmy-title">${post.name}</h3>
                ${mediaHTML}
                <div class="lemmy-post-body">${bodyHTML}</div>
            </div>
        </div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${postView.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1" ${!isLoggedIn ? 'title="Login to vote"' : 'title="Upvote"'}>${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${postView.counts.score}</span>
                <button class="status-action lemmy-vote-btn ${postView.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1" ${!isLoggedIn ? 'title="Login to vote"' : 'title="Downvote"'}>${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="quick-reply" ${!isLoggedIn ? 'title="Login to reply"' : 'title="Reply"'}>${ICONS.reply}</button>
            <button class="status-action" data-action="view-post">${ICONS.comments} ${postView.counts.comments}</button>
            <button class="status-action" data-action="share">${ICONS.share}</button>
            <button class="status-action ${postView.saved ? 'active' : ''}" data-action="save" ${!isLoggedIn ? 'title="Login to save"' : 'title="Save"'}>${ICONS.bookmark}</button>
        </div>
        <div class="quick-reply-container">
            <div class="quick-reply-box">
                <textarea placeholder="Add a comment..."></textarea>
                <button class="button-primary">Post</button>
            </div>
        </div>
    `;
    
    // Add all the same event listeners as feed cards
    
    // Handle read more functionality
    if (wordCount > 30) {
        const bodyContainer = card.querySelector('.lemmy-post-body');
        const readMoreLink = bodyContainer.querySelector('.read-more-link');
        if (readMoreLink) {
            readMoreLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                bodyContainer.innerHTML = fullBodyHtml;
            });
        }
    }

    // Handle media image clicks
    const mediaImg = card.querySelector('.status-media img');
    if (mediaImg) {
        mediaImg.style.cursor = 'pointer';
        mediaImg.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof showImageModal === 'function') {
                showImageModal(post.url || mediaImg.src);
            }
        });
    }
    
    // Double-click to view post (refresh comments in this case)
    card.querySelector('.status-body-content').addEventListener('dblclick', () => {
        // Refresh the current post page
        actions.showLemmyPostDetail(postView);
    });

    // Header link clicks
    card.querySelector('[data-action="view-community"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunity(`${postView.community.name}@${new URL(postView.community.actor_id).hostname}`);
    });
    
    card.querySelector('[data-action="view-creator"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyProfile(`${postView.creator.name}@${new URL(postView.creator.actor_id).hostname}`);
    });

    // Header share button - FIXED: Only declare this once
    const headerShareBtn = card.querySelector('[data-action="share-header"]');
    if (headerShareBtn) {
        headerShareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.sharePost(postView);
        });
    }
    
    // Context menu (touch and right-click)
    let pressTimer;
    card.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            const isOwn = postView.creator.name === localStorage.getItem('lemmy_username');
            let menuItems = [
                { label: `Share Post`, action: () => actions.sharePost(postView) },
            ];
            
            if (isLoggedIn) {
                menuItems.push(
                    { label: `${ICONS.delete} Block @${postView.creator.name}`, action: () => {
                        if (confirm('Are you sure you want to block this user?')) {
                            actions.lemmyBlockUser(postView.creator.id, true);
                        }
                    }},
                    { label: `${ICONS.delete} Block ${postView.community.name}`, action: () => {
                        if (confirm('Are you sure you want to block this community?')) {
                            actions.lemmyBlockCommunity(postView.community.id, true);
                        }
                    }}
                );
                
                if (isOwn) {
                     menuItems.push(
                        { label: `${ICONS.edit} Edit`, action: () => {
                            const replyContainer = card.querySelector('.quick-reply-container');
                            replyContainer.style.display = 'block';
                            const textarea = replyContainer.querySelector('textarea');
                            textarea.value = post.body;
                            textarea.focus();
                            const button = replyContainer.querySelector('button');
                            button.textContent = 'Save';
                            button.onclick = async (e) => {
                                e.stopPropagation();
                                const newContent = textarea.value.trim();
                                if (newContent) {
                                    await actions.lemmyEditPost(post.id, newContent);
                                    replyContainer.style.display = 'none';
                                    button.textContent = 'Post';
                                }
                            };
                        }},
                        { label: `${ICONS.delete} Delete`, action: () => {
                            if (confirm('Are you sure you want to delete this post?')) {
                                actions.lemmyDeletePost(post.id);
                            }
                        }}
                    );
                }
            }
            actions.showContextMenu(e, menuItems);
        }, 500);
    });

    card.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });

    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const isOwn = postView.creator.name === localStorage.getItem('lemmy_username');
        let menuItems = [
            { label: `Share Post`, action: () => actions.sharePost(postView) },
        ];
        
        if (isLoggedIn) {
            menuItems.push(
                { label: `${ICONS.delete} Block @${postView.creator.name}`, action: () => {
                    if (confirm('Are you sure you want to block this user?')) {
                        actions.lemmyBlockUser(postView.creator.id, true);
                    }
                }},
                { label: `${ICONS.delete} Block ${postView.community.name}`, action: () => {
                    if (confirm('Are you sure you want to block this community?')) {
                        actions.lemmyBlockCommunity(postView.community.id, true);
                    }
                }}
            );
            
            if (isOwn) {
                 menuItems.push(
                    { label: `${ICONS.edit} Edit`, action: () => {
                        const replyContainer = card.querySelector('.quick-reply-container');
                        replyContainer.style.display = 'block';
                        const textarea = replyContainer.querySelector('textarea');
                        textarea.value = post.body;
                        textarea.focus();
                        const button = replyContainer.querySelector('button');
                        button.textContent = 'Save';
                        button.onclick = async (e) => {
                            e.stopPropagation();
                            const newContent = textarea.value.trim();
                            if (newContent) {
                                await actions.lemmyEditPost(post.id, newContent);
                                replyContainer.style.display = 'none';
                                button.textContent = 'Post';
                            }
                        };
                    }},
                    { label: `${ICONS.delete} Delete`, action: () => {
                        if (confirm('Are you sure you want to delete this post?')) {
                            actions.lemmyDeletePost(post.id);
                        }
                    }}
                );
            }
        }
        actions.showContextMenu(e, menuItems);
    });
    
    // Footer action buttons
    card.querySelectorAll('.status-footer .status-action').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote':
                case 'downvote':
                    if (!isLoggedIn) {
                        showToast('Please log in to vote');
                        return;
                    }
                    const score = parseInt(e.currentTarget.dataset.score, 10);
                    actions.lemmyVote(post.id, score, card);
                    break;
                case 'save':
                    if (!isLoggedIn) {
                        showToast('Please log in to save posts');
                        return;
                    }
                    actions.lemmySave(post.id, e.currentTarget);
                    break;
                case 'quick-reply':
                    if (!isLoggedIn) {
                        showToast('Please log in to reply');
                        return;
                    }
                    const replyContainer = card.querySelector('.quick-reply-container');
                    const isVisible = replyContainer.style.display === 'block';

                    document.querySelectorAll('.quick-reply-container').forEach(container => {
                        container.style.display = 'none';
                    });

                    replyContainer.style.display = isVisible ? 'none' : 'block';
                    if (!isVisible) {
                        replyContainer.querySelector('textarea').focus();
                    }
                    break;
                case 'view-post':
                    // Just scroll to comments since we're already on the post page
                    document.querySelector('.lemmy-comments-section').scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'share':
                    actions.sharePost(postView);
                    break;
            }
        });
    });
    
    // Quick reply functionality
    card.querySelector('.quick-reply-box button').addEventListener('click', async (e) => {
        e.stopPropagation();
        const textarea = card.querySelector('.quick-reply-box textarea');
        const content = textarea.value.trim();
        if(!content) return;
        if (!isLoggedIn) {
            showToast('Please log in to comment');
            return;
        }

        try {
            await actions.lemmyPostComment({ content: content, post_id: post.id });
            textarea.value = '';
            card.querySelector('.quick-reply-container').style.display = 'none';
            // Refresh comments
            actions.showLemmyPostDetail(postView);
        } catch(err) {
            alert('Failed to post comment.');
        }
    });
    
    card.querySelector('.quick-reply-box textarea').addEventListener('click', (e) => e.stopPropagation());

    // Options menu functionality
    const optionsBtn = card.querySelector('.post-options-btn');
    if (optionsBtn) {
        const menu = card.querySelector('.post-options-menu');
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });

        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            if (action === 'block-community') {
                const communityId = parseInt(e.target.dataset.communityId, 10);
                if (confirm('Are you sure you want to block this community?')) {
                    actions.lemmyBlockCommunity(communityId, true);
                }
            } else if (action === 'share-post') {
                actions.sharePost(postView);
            }
            menu.style.display = 'none';
        });
    }

    postContainer.appendChild(card);

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
        if (!isLoggedIn) {
            showToast('Please log in to comment');
            return;
        }
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

// Public version of the post page renderer (no voting/commenting)
export async function renderPublicLemmyPostPage(state, postView, actions, instance) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = `
        <div class="lemmy-post-view-container">
            <div class="lemmy-post-full"></div>
            <div class="lemmy-comments-section">
                <h3>Comments</h3>
                <div class="public-viewing-notice">
                    <p>You're viewing this post as a guest. <a href="/" onclick="window.location.reload()">Log in</a> to vote, comment, and see full functionality.</p>
                </div>
                <div class="lemmy-comments-container">Loading comments...</div>
            </div>
        </div>
    `;

    const postContainer = view.querySelector('.lemmy-post-full');
    const commentsContainer = view.querySelector('.lemmy-comments-container');
    
    // Render the main post card (public version)
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
                    <div class="community-link user-info-line1">${postView.community.name}</div>
                    <div class="user-info-line2">
                        <span>posted by </span>
                        <span class="user-link">${postView.creator.name}</span>
                        <span class="time-ago">· ${timeAgo(post.published)}</span>
                    </div>
                </div>
                <div class="status-header-side">
                    <button class="share-post-btn" title="Share Post">${ICONS.share}</button>
                </div>
            </div>
            <h3>${post.name}</h3>
            <div class="lemmy-post-body">
                ${bodyHtml}
                ${isImageUrl 
                    ? `<div class="lemmy-card-image-container"><img src="${post.url}" alt="${post.name}" class="lemmy-card-image" onerror="this.onerror=null;this.src='images/404.png';"></div>` 
                    : (post.url ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link-preview">${post.url}</a>` : '')
                }
            </div>
             <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn disabled" title="Log in to vote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${postView.counts.score}</span>
                    <button class="status-action lemmy-vote-btn disabled" title="Log in to vote">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action">
                    ${ICONS.comments}
                    <span>${postView.counts.comments}</span>
                </button>
                <button class="status-action share-post-footer-btn" title="Share Post">${ICONS.share}</button>
                <button class="status-action disabled" title="Log in to save">${ICONS.bookmark}</button>
            </div>
        </div>
    `;
    postContainer.appendChild(postCard);

    // Add share functionality to header and footer buttons - using already declared buttons
    postCard.querySelector('.share-post-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.sharePost(postView);
    });
    
    postCard.querySelector('.share-post-footer-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.sharePost(postView);
    });

    // Fetch and render comments (public API, no auth required)
    try {
        const response = await fetch(`https://${instance}/api/v3/comment/list?post_id=${post.id}&max_depth=8&sort=New`);
        const data = await response.json();
        const comments = data?.comments;
        
        commentsContainer.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(commentView => {
                commentsContainer.appendChild(renderPublicLemmyComment(commentView, state, actions, postView.creator.id, instance));
            });
        } else {
            commentsContainer.innerHTML = 'No comments yet.';
        }
    } catch (error) {
        commentsContainer.innerHTML = 'Failed to load comments.';
    }
}

// Public version of comment renderer (no voting/replying)
function renderPublicLemmyComment(commentView, state, actions, postAuthorId = null, instance) {
    const commentWrapper = document.createElement('div');
    commentWrapper.className = 'comment-wrapper';
    commentWrapper.id = `comment-wrapper-${commentView.comment.id}`;

    const commentDiv = document.createElement('div');
    commentDiv.className = 'status lemmy-comment';
    commentDiv.dataset.commentId = commentView.comment.id;

    const converter = new showdown.Converter();
    let htmlContent = converter.makeHtml(commentView.comment.content);
    
    // Add error handling for images in comment content
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
            <div class="status-content">${htmlContent}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                     <button class="status-action lemmy-vote-btn disabled" title="Log in to vote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${commentView.counts.score}</span>
                     <button class="status-action lemmy-vote-btn disabled" title="Log in to vote">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action disabled" title="Log in to reply">${ICONS.comments}</button>
                <button class="status-action share-comment-btn" title="Share Comment">${ICONS.share}</button>
            </div>
        </div>
    `;

    // Share comment button
    const shareCommentBtn = commentDiv.querySelector('.share-comment-btn');
    shareCommentBtn.addEventListener('click', () => {
        actions.shareComment(commentView);
    });

    // Show replies if they exist (public viewing)
    if (commentView.counts.child_count > 0) {
        const viewRepliesBtn = document.createElement('button');
        viewRepliesBtn.className = 'view-replies-btn';
        viewRepliesBtn.textContent = `View ${commentView.counts.child_count} replies`;
        commentDiv.querySelector('.status-footer').insertAdjacentElement('afterend', viewRepliesBtn);
        
        viewRepliesBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`https://${instance}/api/v3/comment/list?post_id=${commentView.post.id}&parent_id=${commentView.comment.id}&max_depth=8&sort=New`);
                const data = await response.json();
                const replies = data?.comments?.filter(reply => reply.comment.id !== commentView.comment.id);
                
                let repliesContainer = commentDiv.querySelector('.lemmy-replies-container');
                if (!repliesContainer) {
                    repliesContainer = document.createElement('div');
                    repliesContainer.className = 'lemmy-replies-container';
                    commentDiv.appendChild(repliesContainer);
                }
                
                repliesContainer.innerHTML = '';
                if (replies && replies.length > 0) {
                    replies.forEach(replyView => {
                        repliesContainer.appendChild(renderPublicLemmyComment(replyView, state, actions, postAuthorId, instance));
                    });
                } else {
                    repliesContainer.innerHTML = 'No replies found.';
                }
                repliesContainer.style.display = 'block';
                viewRepliesBtn.style.display = 'none';
            } catch (error) {
                console.error('Failed to fetch replies:', error);
            }
        });
    }

    commentWrapper.appendChild(commentDiv);
    return commentWrapper;
}
