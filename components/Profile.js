// This is the key section from Profile.js that needs updating
// The renderLemmyCommentOnProfile function with fixed dropdown menu

function renderLemmyCommentOnProfile(commentView, state, actions) {
    // Use the base renderer to create the main card
    const commentCard = renderBaseLemmyComment(commentView, state, actions);

    // Remove the username from the header since we're on the user's profile
    const usernameElement = commentCard.querySelector('.username-instance');
    if (usernameElement) {
        usernameElement.style.display = 'none';
    }
    
    // Also remove the OP badge if present
    const opBadge = commentCard.querySelector('.op-badge');
    if (opBadge) {
        opBadge.style.display = 'none';
    }
    
    // Hide the original timestamp in the header
    const originalTimestamp = commentCard.querySelector('.time-ago');
    if (originalTimestamp) {
        originalTimestamp.style.display = 'none';
    }

    // Truncate post title to 4 words
    const postTitle = commentView.post.name;
    const truncatedTitle = postTitle.split(' ').slice(0, 4).join(' ') + (postTitle.split(' ').length > 4 ? '...' : '');

    // Create the context bar HTML with timestamp included
    const contextHTML = `
        <div class="comment-context">
            <span>Commented on:</span>
            <a href="#" class="post-link">${truncatedTitle}</a>
            <span>in</span>
            <a href="#" class="community-link">${commentView.community.name}</a>
            <span class="context-timestamp">· ${timeAgo(commentView.comment.published)}</span>
        </div>
    `;
    
    // Prepend the context bar to the comment's body
    const contentDiv = commentCard.querySelector('.status-body');
    if (contentDiv) {
        contentDiv.insertAdjacentHTML('afterbegin', contextHTML);
    }
    commentCard.classList.add('lemmy-comment-on-profile');

    // Add event listeners for the new links
    const postLink = commentCard.querySelector('.post-link');
    if (postLink) {
        postLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.showLemmyPostDetail(commentView);
        });
    }

    const communityLink = commentCard.querySelector('.community-link');
    if (communityLink) {
        communityLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.showLemmyCommunity(commentView.community.name);
        });
    }
    
    // Add double-click event listener to navigate to the post
    commentCard.addEventListener('dblclick', () => {
        actions.showLemmyPostDetail(commentView);
    });

    // FIX: Override the more options button to use proper dropdown positioning
    const moreOptionsBtn = commentCard.querySelector('.more-options-btn');
    if (moreOptionsBtn) {
        // Remove existing event listeners by cloning the node
        const newMoreOptionsBtn = moreOptionsBtn.cloneNode(true);
        moreOptionsBtn.parentNode.replaceChild(newMoreOptionsBtn, moreOptionsBtn);
        
        // Add the fixed dropdown handler
        newMoreOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Remove any existing menu
            const existingMenu = document.querySelector('.comment-dropdown-menu');
            if (existingMenu) existingMenu.remove();
            
            const menu = document.createElement('div');
            menu.className = 'comment-dropdown-menu';
            menu.style.position = 'absolute';
            menu.style.zIndex = '1000';
            
            const isCreator = state.lemmyUsername && state.lemmyUsername === commentView.creator.name;
            const isLoggedIn = localStorage.getItem('lemmy_jwt');
            
            const menuItems = [];
            menuItems.push(
                { label: 'Share Comment', action: () => actions.shareComment(commentView) },
                { label: 'Copy Comment URL', action: () => {
                    navigator.clipboard.writeText(commentView.comment.ap_id);
                    showToast('Comment URL copied to clipboard!');
                }},
                { label: 'View in Context', action: () => actions.showLemmyPostDetail(commentView) }
            );

            if (isLoggedIn && isCreator) {
                menuItems.push({
                    label: 'Edit Comment',
                    action: () => {
                        // Note: showEditUI function would need to be imported or reimplemented
                        showToast('Edit functionality coming soon');
                    }
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
            const rect = newMoreOptionsBtn.getBoundingClientRect();
            const menuHeight = menu.offsetHeight;
            const menuWidth = menu.offsetWidth;
            
            // Check if menu would go off bottom of screen
            if (rect.bottom + menuHeight > window.innerHeight) {
                menu.style.top = `${rect.top - menuHeight}px`;
            } else {
                menu.style.top = `${rect.bottom}px`;
            }
            
            // Check if menu would go off right side of screen
            if (rect.left + menuWidth > window.innerWidth) {
                menu.style.left = `${rect.right - menuWidth}px`;
            } else {
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
    }

    return commentCard;
}
