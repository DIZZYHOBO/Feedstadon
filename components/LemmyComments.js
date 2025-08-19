import { apiFetch } from './api.js';
import { renderLemmyComment } from './LemmyPost.js';
import { ICONS } from './icons.js';

// Enhanced breadcrumb navigation to show the conversation path
function createCommentBreadcrumb(commentChain, currentCommentId, actions, postView) {
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'comment-breadcrumb';
    breadcrumb.innerHTML = `
        <div class="breadcrumb-title">Comment Thread:</div>
        <div class="breadcrumb-path"></div>
    `;
    
    const pathContainer = breadcrumb.querySelector('.breadcrumb-path');
    
    commentChain.forEach((comment, index) => {
        const isActive = comment.comment.id === parseInt(currentCommentId);
        const isCurrent = index === commentChain.length - 1;
        
        const breadcrumbItem = document.createElement('div');
        breadcrumbItem.className = `breadcrumb-item ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`;
        
        const author = comment.creator.name;
        const truncatedContent = comment.comment.content.length > 30 
            ? comment.comment.content.substring(0, 30) + '...' 
            : comment.comment.content;
            
        breadcrumbItem.innerHTML = `
            <span class="breadcrumb-author">@${author}</span>
            <span class="breadcrumb-preview">${truncatedContent}</span>
        `;
        
        if (!isCurrent) {
            breadcrumbItem.addEventListener('click', () => {
                actions.showLemmyCommentThread(postView, comment.comment.id, 'chain');
            });
        }
        
        pathContainer.appendChild(breadcrumbItem);
        
        if (index < commentChain.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'breadcrumb-arrow';
            arrow.innerHTML = '→';
            pathContainer.appendChild(arrow);
        }
    });
    
    return breadcrumb;
}

// Enhanced comment chain builder with better relationship detection
function buildEnhancedCommentChain(allComments, startCommentId) {
    const chain = [];
    const commentMap = {};
    
    // Create lookup map
    allComments.forEach(comment => {
        commentMap[comment.comment.id] = comment;
    });
    
    // Start with the target comment
    let current = commentMap[startCommentId];
    if (!current) {
        console.log('Start comment not found:', startCommentId);
        return [];
    }
    
    // Build upward chain (parents) first
    const parents = [];
    let parentCurrent = current;
    
    while (parentCurrent && parentCurrent.comment.parent_id) {
        const parent = commentMap[parentCurrent.comment.parent_id];
        if (parent) {
            parents.unshift(parent); // Add to beginning to maintain order
            parentCurrent = parent;
        } else {
            break;
        }
    }
    
    // Build the complete chain: parents + target + children
    chain.push(...parents);
    chain.push(current); // Add the target comment
    
    // Build downward chain (follow the most engaging path)
    function getNextInChain(comment) {
        const directReplies = allComments.filter(c => 
            c.comment.parent_id === comment.comment.id
        ).sort((a, b) => {
            // Sort by engagement score (upvotes + replies)
            const scoreA = a.counts.score + a.counts.child_count;
            const scoreB = b.counts.score + b.counts.child_count;
            return scoreB - scoreA;
        });
        
        return directReplies[0]; // Take the most engaging reply
    }
    
    let nextComment = getNextInChain(current);
    while (nextComment && chain.length < 20) { // Limit chain length
        chain.push(nextComment);
        nextComment = getNextInChain(nextComment);
    }
    
    console.log('Built chain with', chain.length, 'comments');
    return chain;
}

// Enhanced comment renderer with better visual hierarchy
function renderCommentWithHierarchy(commentView, state, actions, postAuthorId, depth = 0, isInChain = false) {
    const commentElement = renderLemmyComment(commentView, state, actions, postAuthorId);
    
    // Add chain-specific styling
    if (isInChain) {
        commentElement.classList.add('chain-comment');
        commentElement.style.setProperty('--chain-depth', depth);
    }
    
    // Add depth indicator
    if (depth > 0) {
        const depthIndicator = document.createElement('div');
        depthIndicator.className = 'depth-indicator';
        depthIndicator.style.width = `${Math.min(depth * 2, 10)}px`;
        commentElement.prepend(depthIndicator);
    }
    
    // Add engagement score
    const engagementScore = commentView.counts.score + commentView.counts.child_count;
    const scoreIndicator = document.createElement('div');
    scoreIndicator.className = 'engagement-score';
    scoreIndicator.innerHTML = `<span title="Engagement Score">${engagementScore}</span>`;
    commentElement.querySelector('.status-header').appendChild(scoreIndicator);
    
    return commentElement;
}

// Enhanced navigation controls
function createChainNavigationControls(commentChain, currentIndex, actions, postView) {
    const controls = document.createElement('div');
    controls.className = 'chain-navigation-controls';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'chain-nav-btn prev-btn';
    prevBtn.innerHTML = '← Previous';
    prevBtn.disabled = currentIndex === 0;
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'chain-nav-btn next-btn';
    nextBtn.innerHTML = 'Next →';
    nextBtn.disabled = currentIndex === commentChain.length - 1;
    
    const positionIndicator = document.createElement('div');
    positionIndicator.className = 'chain-position';
    positionIndicator.innerHTML = `${currentIndex + 1} of ${commentChain.length}`;
    
    if (currentIndex > 0) {
        prevBtn.addEventListener('click', () => {
            const prevComment = commentChain[currentIndex - 1];
            actions.showLemmyCommentThread(postView, prevComment.comment.id, 'chain');
        });
    }
    
    if (currentIndex < commentChain.length - 1) {
        nextBtn.addEventListener('click', () => {
            const nextComment = commentChain[currentIndex + 1];
            actions.showLemmyCommentThread(postView, nextComment.comment.id, 'chain');
        });
    }
    
    controls.appendChild(prevBtn);
    controls.appendChild(positionIndicator);
    controls.appendChild(nextBtn);
    
    return controls;
}

// Mini-map for long chains
function createChainMinimap(commentChain, currentCommentId, actions, postView) {
    const minimap = document.createElement('div');
    minimap.className = 'chain-minimap';
    minimap.innerHTML = '<div class="minimap-title">Thread Overview</div>';
    
    const minimapTrack = document.createElement('div');
    minimapTrack.className = 'minimap-track';
    
    commentChain.forEach((comment, index) => {
        const isActive = comment.comment.id === parseInt(currentCommentId);
        
        const minimapItem = document.createElement('div');
        minimapItem.className = `minimap-item ${isActive ? 'active' : ''}`;
        minimapItem.title = `${comment.creator.name}: ${comment.comment.content.substring(0, 50)}...`;
        
        // Visual indicator of comment engagement
        const engagement = comment.counts.score + comment.counts.child_count;
        minimapItem.style.height = `${Math.max(8, Math.min(20, engagement))}px`;
        
        minimapItem.addEventListener('click', () => {
            actions.showLemmyCommentThread(postView, comment.comment.id, 'chain');
        });
        
        minimapTrack.appendChild(minimapItem);
    });
    
    minimap.appendChild(minimapTrack);
    return minimap;
}

// Load enhanced comment chain with all features
async function loadEnhancedCommentChain(state, actions, postId, rootCommentId, container, 
    minimapContainer, breadcrumbContainer, navigationContainer, postAuthorId, postView) {
    
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    
    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&max_depth=8&sort=Old`, {}, 'lemmy');
        const allComments = response?.data?.comments || [];
        
        if (allComments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments found.</p>';
            return;
        }

        // Build enhanced comment chain
        const commentChain = buildEnhancedCommentChain(allComments, parseInt(rootCommentId));
        const currentIndex = commentChain.findIndex(c => c.comment.id === parseInt(rootCommentId));
        
        container.innerHTML = '';
        
        if (commentChain.length > 0) {
            // Add breadcrumb navigation
            if (commentChain.length > 1) {
                const breadcrumb = createCommentBreadcrumb(commentChain, rootCommentId, actions, postView);
                breadcrumbContainer.appendChild(breadcrumb);
            }
            
            // Add minimap for longer chains
            if (commentChain.length > 3) {
                const minimap = createChainMinimap(commentChain, rootCommentId, actions, postView);
                minimapContainer.appendChild(minimap);
            }
            
            // Add navigation controls
            if (commentChain.length > 1) {
                const navControls = createChainNavigationControls(commentChain, currentIndex, actions, postView);
                navigationContainer.appendChild(navControls);
            }
            
            // Render comments with enhanced hierarchy
            commentChain.forEach((commentView, index) => {
                const commentElement = renderCommentWithHierarchy(
                    commentView, state, actions, postAuthorId, index, true
                );
                
                // Highlight current comment
                if (commentView.comment.id === parseInt(rootCommentId)) {
                    commentElement.classList.add('current-comment');
                }
                
                container.appendChild(commentElement);
            });
        } else {
            container.innerHTML = '<p class="no-comments">No comment chain found.</p>';
        }
        
    } catch (error) {
        console.error('Error loading enhanced comment chain:', error);
        throw error;
    }
}

// Original comment chain function (kept for compatibility)
async function loadCommentChain(state, actions, postId, rootCommentId, container, postAuthorId, postView) {
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    
    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&max_depth=8&sort=Old`, {}, 'lemmy');
        const allComments = response?.data?.comments || [];
        
        if (allComments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments found.</p>';
            return;
        }

        // Build the comment chain - following the longest linear path
        const commentChain = buildCommentChain(allComments, parseInt(rootCommentId));
        
        container.innerHTML = '';
        
        if (commentChain.length > 0) {
            const separator = document.createElement('div');
            separator.className = 'chain-separator';
            separator.innerHTML = `<h4>Comment Chain (${commentChain.length} comments)</h4>`;
            container.appendChild(separator);

            commentChain.forEach((commentView, index) => {
                const commentElement = renderLemmyComment(commentView, state, actions, postAuthorId);
                commentElement.classList.add('chain-comment');
                
                // Only show view options on comments that have branches (other replies not in this chain)
                const hasOtherReplies = hasRepliesNotInChain(commentView, allComments, commentChain);
                if (!hasOtherReplies) {
                    // Remove view replies button since this comment doesn't branch
                    removeViewButtons(commentElement);
                } else {
                    // Override buttons for comments that do have branches
                    overrideViewRepliesButtons(commentElement, commentView, actions, postView);
                }
                
                // Add chain position indicator
                if (index === 0) {
                    commentElement.classList.add('chain-start');
                }
                if (index === commentChain.length - 1) {
                    commentElement.classList.add('chain-end');
                }
                
                container.appendChild(commentElement);
            });
        } else {
            container.innerHTML = '<p class="no-comments">No comment chain found.</p>';
        }
        
    } catch (error) {
        console.error('Error loading comment chain:', error);
        throw error;
    }
}

function buildCommentChain(allComments, startCommentId) {
    const chain = [];
    const commentMap = {};
    
    // Create a map for quick lookup
    allComments.forEach(comment => {
        commentMap[comment.comment.id] = comment;
    });
    
    // Start with the clicked comment
    let currentComment = commentMap[startCommentId];
    if (!currentComment) return [];
    
    chain.push(currentComment);
    
    // Follow the chain down - pick the first reply if there are multiple
    // This creates a linear conversation thread
    while (currentComment) {
        const directReplies = allComments.filter(c => 
            c.comment.parent_id === currentComment.comment.id
        ).sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));
        
        if (directReplies.length > 0) {
            // Take the first (earliest) reply to continue the chain
            currentComment = directReplies[0];
            chain.push(currentComment);
        } else {
            // End of chain
            break;
        }
    }
    
    return chain;
}

function hasRepliesNotInChain(comment, allComments, chain) {
    const chainIds = new Set(chain.map(c => c.comment.id));
    const directReplies = allComments.filter(c => 
        c.comment.parent_id === comment.comment.id
    );
    
    // Check if there are replies that aren't part of the current chain
    return directReplies.some(reply => !chainIds.has(reply.comment.id));
}

function removeViewButtons(commentElement) {
    // Remove view replies button
    const viewRepliesBtn = commentElement.querySelector('.view-replies-btn');
    if (viewRepliesBtn) {
        viewRepliesBtn.remove();
    }
    
    // Remove read more comments buttons
    const readMoreBtns = commentElement.querySelectorAll('.read-more-comments');
    readMoreBtns.forEach(btn => btn.remove());
}

async function loadCommentThread(state, actions, postId, rootCommentId, container, postAuthorId, postView) {
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    
    try {
        // Get all comments for the post
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&max_depth=8&sort=Old`, {}, 'lemmy');
        const allComments = response?.data?.comments || [];
        
        if (allComments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments found.</p>';
            return;
        }

        // Find the root comment (the one that was clicked)
        const rootComment = allComments.find(c => c.comment.id === parseInt(rootCommentId));
        
        if (!rootComment) {
            container.innerHTML = '<p class="error-message">Root comment not found.</p>';
            return;
        }

        console.log('Root comment:', rootComment);
        console.log('Looking for replies to comment ID:', parseInt(rootCommentId));

        // Find direct replies using multiple methods for better compatibility
        let directReplies = [];
        
        // Method 1: Check parent_id directly
        const repliesByParentId = allComments.filter(comment => 
            comment.comment.parent_id === parseInt(rootCommentId)
        );
        
        // Method 2: Check by path if available
        let repliesByPath = [];
        if (rootComment.comment.path) {
            const rootPath = rootComment.comment.path;
            repliesByPath = allComments.filter(comment => {
                if (!comment.comment.path) return false;
                // Check if this comment's path indicates it's a direct child
                const commentPath = comment.comment.path;
                const pathParts = commentPath.split('.');
                const rootPathParts = rootPath.split('.');
                
                // Direct child should have one more level than parent
                return pathParts.length === rootPathParts.length + 1 && 
                       commentPath.startsWith(rootPath + '.');
            });
        }
        
        // Combine both methods and remove duplicates
        const combinedReplies = [...repliesByParentId, ...repliesByPath];
        directReplies = combinedReplies.filter((comment, index, self) => 
            index === self.findIndex(c => c.comment.id === comment.comment.id)
        );
        
        console.log('Found direct replies by parent_id:', repliesByParentId.length);
        console.log('Found direct replies by path:', repliesByPath.length);
        console.log('Total unique direct replies:', directReplies.length);

        // Sort replies by creation time
        directReplies.sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));

        container.innerHTML = '';
        
        // First, render the root comment (the one that was clicked)
        const rootCommentElement = renderLemmyComment(rootComment, state, actions, postAuthorId);
        rootCommentElement.classList.add('thread-root-comment');
        
        // Override the "View replies" button functionality for this context
        overrideViewRepliesButtons(rootCommentElement, rootComment, actions, postView, allComments);
        
        container.appendChild(rootCommentElement);

        // Add a separator and replies
        if (directReplies.length > 0) {
            const separator = document.createElement('div');
            separator.className = 'replies-separator';
            separator.innerHTML = `<h4>Direct Replies (${directReplies.length})</h4>`;
            container.appendChild(separator);

            // Then render all direct replies (no indentation, full width)
            directReplies.forEach(replyComment => {
                const replyElement = renderLemmyComment(replyComment, state, actions, postAuthorId);
                replyElement.classList.add('direct-reply-comment');
                
                // Override the "View replies" button for replies too
                overrideViewRepliesButtons(replyElement, replyComment, actions, postView, allComments);
                
                container.appendChild(replyElement);
            });
        } else {
            const noReplies = document.createElement('div');
            noReplies.className = 'no-replies';
            noReplies.innerHTML = '<p class="no-comments">No direct replies to this comment.</p>';
            container.appendChild(noReplies);
        }
        
    } catch (error) {
        console.error('Error loading comment thread:', error);
        throw error;
    }
}

function overrideViewRepliesButtons(commentElement, commentView, actions, postView, allComments = null) {
    // Find and override any "View X replies" buttons in this comment
    const viewRepliesBtn = commentElement.querySelector('.view-replies-btn');
    if (viewRepliesBtn) {
        // Remove the old event listener by cloning the node
        const newBtn = viewRepliesBtn.cloneNode(true);
        viewRepliesBtn.parentNode.replaceChild(newBtn, viewRepliesBtn);
        
        // Check if this comment has multiple replies (making it worth showing chain option)
        const hasMultipleReplies = allComments ? 
            allComments.filter(c => c.comment.parent_id === commentView.comment.id).length > 1 : 
            commentView.counts.child_count > 1;
        
        if (hasMultipleReplies) {
            // Replace single button with two buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'view-options-container';
            buttonContainer.innerHTML = `
                <button class="view-replies-btn">View ${commentView.counts.child_count} Replies</button>
                <button class="view-chain-btn">View Chain</button>
            `;
            
            newBtn.parentNode.replaceChild(buttonContainer, newBtn);
            
            // Add event listeners
            buttonContainer.querySelector('.view-replies-btn').addEventListener('click', () => {
                console.log('Opening replies thread for comment:', commentView.comment.id);
                actions.showLemmyCommentThread(postView, commentView.comment.id, 'replies');
            });
            
            buttonContainer.querySelector('.view-chain-btn').addEventListener('click', () => {
                console.log('Opening comment chain for comment:', commentView.comment.id);
                actions.showLemmyCommentThread(postView, commentView.comment.id, 'chain');
            });
        } else {
            // Single reply - just show chain option
            newBtn.textContent = 'View Chain';
            newBtn.addEventListener('click', () => {
                console.log('Opening comment chain for comment:', commentView.comment.id);
                actions.showLemmyCommentThread(postView, commentView.comment.id, 'chain');
            });
        }
    }
    
    // Also override any "Read more comments" buttons that might exist
    const readMoreBtns = commentElement.querySelectorAll('.read-more-comments');
    readMoreBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            console.log('Opening replies thread for comment:', commentView.comment.id);
            actions.showLemmyCommentThread(postView, commentView.comment.id, 'replies');
        });
    });
}

// Main export function - Enhanced comment thread page with all improvements
export async function renderLemmyCommentThreadPage(state, actions, postView, rootCommentId, viewType = 'replies') {
    console.log('renderLemmyCommentThreadPage called with:', postView, rootCommentId, viewType);
    
    const view = document.getElementById('lemmy-comments-view');
    
    // Use enhanced layout for chain view, simpler layout for replies view
    if (viewType === 'chain') {
        view.innerHTML = `
            <div class="enhanced-comment-thread-header">
                <button id="back-to-post-btn" class="nav-button">
                    ${ICONS.reply} Back to Post
                </button>
                <div class="thread-header-info">
                    <h3>Comment Chain</h3>
                    <div class="thread-controls">
                        <button id="toggle-view-btn" class="button-secondary">
                            Switch to Thread View
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="enhanced-comment-container">
                <div class="comment-sidebar">
                    <div id="comment-minimap"></div>
                    <div id="comment-breadcrumb"></div>
                </div>
                
                <div class="comment-main-content">
                    <div class="original-post-preview">
                        <div class="post-preview-header">
                            <img src="${postView.community.icon || './images/php.png'}" alt="Community icon" class="avatar">
                            <div>
                                <div class="post-title">${postView.post.name}</div>
                                <div class="post-meta">by ${postView.creator.name} in ${postView.community.name}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="chain-navigation-controls"></div>
                    <div class="comment-thread-list">
                        <div class="loading-comments">Loading enhanced comment chain...</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        view.innerHTML = `
            <div class="comment-thread-header">
                <button id="back-to-post-btn" class="nav-button">
                    ${ICONS.reply} Back to Post
                </button>
                <h3>Comment Thread</h3>
                <button id="toggle-view-btn" class="button-secondary">
                    Switch to Chain View
                </button>
            </div>
            <div class="comment-thread-container">
                <div class="original-post-preview">
                    <div class="post-preview-header">
                        <img src="${postView.community.icon || './images/php.png'}" alt="Community icon" class="avatar">
                        <div>
                            <div class="post-title">${postView.post.name}</div>
                            <div class="post-meta">by ${postView.creator.name} in ${postView.community.name}</div>
                        </div>
                    </div>
                </div>
                <div class="comment-thread-list">
                    <div class="loading-comments">Loading comment thread...</div>
                </div>
            </div>
        `;
    }

    // Back button functionality
    document.getElementById('back-to-post-btn').addEventListener('click', () => {
        actions.showLemmyPostDetail(postView);
    });
    
    // Toggle view button
    document.getElementById('toggle-view-btn').addEventListener('click', () => {
        const newViewType = viewType === 'chain' ? 'replies' : 'chain';
        actions.showLemmyCommentThread(postView, rootCommentId, newViewType);
    });

    const threadListContainer = view.querySelector('.comment-thread-list');
    
    try {
        if (viewType === 'chain') {
            const minimapContainer = view.querySelector('#comment-minimap');
            const breadcrumbContainer = view.querySelector('#comment-breadcrumb');
            const navigationContainer = view.querySelector('#chain-navigation-controls');
            
            await loadEnhancedCommentChain(state, actions, postView.post.id, rootCommentId, 
                threadListContainer, minimapContainer, breadcrumbContainer, navigationContainer, 
                postView.creator.id, postView);
        } else {
            await loadCommentThread(state, actions, postView.post.id, rootCommentId, 
                threadListContainer, postView.creator.id, postView);
        }
    } catch (error) {
        console.error('Failed to load comment thread:', error);
        threadListContainer.innerHTML = '<p class="error-message">Failed to load comment thread.</p>';
    }
}
