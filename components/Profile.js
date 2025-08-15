// This is an excerpt showing the key changes needed in Profile.js
// Add this function to handle rendering user's own Lemmy posts with edit/delete

function renderUserLemmyPost(post, actions, isOwnProfile) {
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.post.id;

    const converter = new showdown.Converter();
    let bodyHtml = '';
    if (post.post.body) {
        bodyHtml = converter.makeHtml(post.post.body);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = bodyHtml;
        tempDiv.querySelectorAll('img').forEach(img => {
            img.onerror = function() {
                this.onerror = null;
                this.src = 'images/404.png';
            };
        });
        bodyHtml = tempDiv.innerHTML;
    }

    const instanceName = new URL(post.community.actor_id).hostname;

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img src="${post.community.icon || 'images/php.png'}" 
                         alt="${post.community.name}" 
                         class="avatar">
                    <div>
                        <div class="community-name">c/${post.community.name}@${instanceName}</div>
                        <div class="timestamp">${timeAgo(post.post.published)}</div>
                    </div>
                </div>
                ${isOwnProfile ? `
                <div class="status-header-side">
                    <button class="status-action more-options-btn" title="More options">${ICONS.more}</button>
                </div>
                ` : ''}
            </div>
            
            <div class="lemmy-title">${post.post.name}</div>
            ${bodyHtml ? `<div class="lemmy-post-body">${bodyHtml}</div>` : ''}
            
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <span class="lemmy-score">${post.counts.score}</span>
                </div>
                <span>${post.counts.comments} comments</span>
            </div>
        </div>
    `;

    if (isOwnProfile) {
        const moreBtn = card.querySelector('.more-options-btn');
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const existingMenu = document.querySelector('.post-dropdown-menu');
            if (existingMenu) existingMenu.remove();
            
            const menu = document.createElement('div');
            menu.className = 'post-dropdown-menu';
            menu.style.position = 'absolute';
            menu.style.zIndex = '1000';
            
            const menuItems = [
                { label: 'Edit Post', action: () => showEditPostUI(card, post, actions) },
                { label: 'Delete Post', action: () => {
                    if (confirm('Are you sure you want to delete this post?')) {
                        actions.lemmyDeletePost(post.post.id);
                        card.remove();
                    }
                }},
                { label: 'View Post', action: () => actions.showLemmyPostDetail(post) },
                { label: 'Share Post', action: () => actions.sharePost(post) }
            ];

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
            
            const rect = moreBtn.getBoundingClientRect();
            menu.style.top = `${rect.bottom}px`;
            menu.style.left = `${rect.left}px`;
            
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

    card.addEventListener('click', () => {
        actions.showLemmyPostDetail(post);
    });

    return card;
}

function renderUserLemmyComment(comment, actions, isOwnProfile) {
    const card = document.createElement('div');
    card.className = 'status lemmy-comment';
    card.dataset.commentId = comment.comment.id;

    const converter = new showdown.Converter();
    let htmlContent = converter.makeHtml(comment.comment.content);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror = null;
            this.src = 'images/404.png';
        };
    });
    htmlContent = tempDiv.innerHTML;

    card.innerHTML = `
        <div class="comment-context">
            <span>Replying to</span>
            <a href="#" class="post-link">${comment.post.name}</a>
            <span class="context-timestamp">${timeAgo(comment.comment.published)}</span>
        </div>
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <span>in c/${comment.community.name}</span>
                </div>
                ${isOwnProfile ? `
                <div class="status-header-side">
                    <button class="status-action more-options-btn" title="More options">${ICONS.more}</button>
                </div>
                ` : ''}
            </div>
            
            <div class="status-content">${htmlContent}</div>
            
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <span class="lemmy-score">${comment.counts.score}</span>
                </div>
            </div>
        </div>
    `;

    if (isOwnProfile) {
        const moreBtn = card.querySelector('.more-options-btn');
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const existingMenu = document.querySelector('.comment-dropdown-menu');
            if (existingMenu) existingMenu.remove();
            
            const menu = document.createElement('div');
            menu.className = 'comment-dropdown-menu';
            menu.style.position = 'absolute';
            menu.style.zIndex = '1000';
            
            const menuItems = [
                { label: 'Edit Comment', action: () => showEditCommentUI(card, comment, actions) },
                { label: 'Delete Comment', action: () => {
                    if (confirm('Are you sure you want to delete this comment?')) {
                        actions.lemmyDeleteComment(comment.comment.id);
                        card.remove();
                    }
                }},
                { label: 'View Thread', action: () => actions.showLemmyPostDetail(comment) },
                { label: 'Share Comment', action: () => actions.shareComment(comment) }
            ];

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
            
            const rect = moreBtn.getBoundingClientRect();
            menu.style.top = `${rect.bottom}px`;
            menu.style.left = `${rect.left}px`;
            
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

    const postLink = card.querySelector('.post-link');
    postLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyPostDetail(comment);
    });

    return card;
}

function showEditCommentUI(card, commentView, actions) {
    const contentDiv = card.querySelector('.status-content');
    const originalContent = commentView.comment.content;
    const originalHtml = contentDiv.innerHTML;

    const editContainer = document.createElement('div');
    editContainer.className = 'edit-comment-container';
    editContainer.innerHTML = `
        <textarea class="edit-comment-textarea" 
                  style="width: 100%; min-height: 100px; padding: 10px; 
                         border: 1px solid var(--border-color); border-radius: 4px; 
                         background-color: var(--bg-color); color: var(--font-color); 
                         resize: vertical; font-family: inherit; font-size: 14px; 
                         line-height: 1.4;">${originalContent}</textarea>
        <div class="edit-comment-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button class="button-secondary cancel-edit-btn" style="padding: 8px 16px;">Cancel</button>
            <button class="button-primary save-edit-btn" 
                    style="padding: 8px 16px; background-color: var(--accent-color); 
                           color: white; border: none;">Save</button>
        </div>
    `;

    contentDiv.innerHTML = '';
    contentDiv.appendChild(editContainer);

    const textarea = editContainer.querySelector('.edit-comment-textarea');
    const saveBtn = editContainer.querySelector('.save-edit-btn');
    const cancelBtn = editContainer.querySelector('.cancel-edit-btn');

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    cancelBtn.addEventListener('click', () => {
        contentDiv.innerHTML = originalHtml;
    });

    saveBtn.addEventListener('click', async () => {
        const newContent = textarea.value.trim();
        
        if (!newContent) {
            alert('Comment cannot be empty');
            return;
        }

        if (newContent === originalContent) {
            contentDiv.innerHTML = originalHtml;
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await actions.lemmyEditComment(commentView.comment.id, newContent);
            
            commentView.comment.content = newContent;
            
            const converter = new showdown.Converter();
            let newHtmlContent = converter.makeHtml(newContent);
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtmlContent;
            tempDiv.querySelectorAll('img').forEach(img => {
                img.onerror = function() {
                    this.onerror = null;
                    this.src = 'images/404.png';
                };
            });
            
            contentDiv.innerHTML = tempDiv.innerHTML;
            showToast('Comment updated successfully!');
            
        } catch (error) {
            console.error("Failed to save comment:", error);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            alert("Failed to save comment. Please try again.");
        }
    });
}

function showEditPostUI(card, post, actions) {
    const bodyDiv = card.querySelector('.lemmy-post-body');
    const titleDiv = card.querySelector('.lemmy-title');
    
    const originalTitle = post.post.name;
    const originalBody = post.post.body || '';
    const originalTitleHtml = titleDiv.innerHTML;
    const originalBodyHtml = bodyDiv ? bodyDiv.innerHTML : '';

    titleDiv.innerHTML = `
        <input type="text" class="edit-post-title" value="${originalTitle.replace(/"/g, '&quot;')}" 
               style="width: 100%; padding: 8px; border: 1px solid var(--border-color); 
                      border-radius: 4px; background-color: var(--bg-color); 
                      color: var(--font-color); font-size: 18px; font-weight: 600;">
    `;

    const editContainer = document.createElement('div');
    editContainer.className = 'edit-post-container';
    editContainer.innerHTML = `
        <textarea class="edit-post-textarea" 
                  style="width: 100%; min-height: 150px; padding: 10px; 
                         border: 1px solid var(--border-color); border-radius: 4px; 
                         background-color: var(--bg-color); color: var(--font-color); 
                         resize: vertical; font-family: inherit; font-size: 14px; 
                         line-height: 1.4; margin-top: 10px;">${originalBody}</textarea>
        <div class="edit-post-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button class="button-secondary cancel-edit-btn" style="padding: 8px 16px;">Cancel</button>
            <button class="button-primary save-edit-btn" 
                    style="padding: 8px 16px; background-color: var(--accent-color); 
                           color: white; border: none;">Save</button>
        </div>
    `;
    
    if (bodyDiv) {
        bodyDiv.innerHTML = '';
        bodyDiv.appendChild(editContainer);
    } else {
        titleDiv.insertAdjacentElement('afterend', editContainer);
    }

    const titleInput = card.querySelector('.edit-post-title');
    const textarea = editContainer.querySelector('.edit-post-textarea');
    const saveBtn = editContainer.querySelector('.save-edit-btn');
    const cancelBtn = editContainer.querySelector('.cancel-edit-btn');

    titleInput.focus();

    cancelBtn.addEventListener('click', () => {
        titleDiv.innerHTML = originalTitleHtml;
        if (bodyDiv) {
            bodyDiv.innerHTML = originalBodyHtml;
        } else {
            editContainer.remove();
        }
    });

    saveBtn.addEventListener('click', async () => {
        const newTitle = titleInput.value.trim();
        const newBody = textarea.value.trim();
        
        if (!newTitle) {
            alert('Title cannot be empty');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await actions.lemmyEditPost(post.post.id, newBody, newTitle);
            
            post.post.name = newTitle;
            post.post.body = newBody;
            
            titleDiv.innerHTML = newTitle;
            
            if (newBody) {
                const converter = new showdown.Converter();
                let newHtmlContent = converter.makeHtml(newBody);
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newHtmlContent;
                tempDiv.querySelectorAll('img').forEach(img => {
                    img.onerror = function() {
                        this.onerror = null;
                        this.src = 'images/404.png';
                    };
                });
                
                if (bodyDiv) {
                    bodyDiv.innerHTML = tempDiv.innerHTML;
                } else {
                    const newBodyDiv = document.createElement('div');
                    newBodyDiv.className = 'lemmy-post-body';
                    newBodyDiv.innerHTML = tempDiv.innerHTML;
                    titleDiv.insertAdjacentElement('afterend', newBodyDiv);
                    editContainer.remove();
                }
            } else if (bodyDiv) {
                bodyDiv.remove();
            }
            
            showToast('Post updated successfully!');
            
        } catch (error) {
            console.error("Failed to save post:", error);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            alert("Failed to save post. Please try again.");
        }
    });
}
