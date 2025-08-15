import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { showToast } from './ui.js';
import { timeAgo } from './utils.js';

export async function fetchLemmyFeed(state, actions, append = false, onLoginPrompt = null) {
    if (!append) {
        state.lemmyPage = 1;
        state.lemmyHasMore = true;
        state.timelineDiv.innerHTML = '';
    }

    if (!state.lemmyHasMore) return;

    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    const feedType = state.currentLemmyFeed;
    const sortType = state.currentLemmySort;

    state.scrollLoader.classList.add('loading');
    state.isLoadingMore = true;

    try {
        const params = new URLSearchParams({
            type_: feedType,
            sort: sortType,
            page: state.lemmyPage,
            limit: 20
        });

        const response = await apiFetch(lemmyInstance, null, `/api/v3/post/list?${params}`, {}, 'lemmy');
        const posts = response.data.posts;

        if (!posts || posts.length === 0) {
            state.lemmyHasMore = false;
            if (!append) {
                state.timelineDiv.innerHTML = '<p>No posts found.</p>';
            }
            return;
        }

        posts.forEach(post => {
            const card = renderLemmyCard(post, actions);
            state.timelineDiv.appendChild(card);
        });

        state.lemmyPage++;
        state.lemmyHasMore = posts.length === 20;
    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        if (!append) {
            state.timelineDiv.innerHTML = '<p>Failed to load feed.</p>';
        }
    } finally {
        state.scrollLoader.classList.remove('loading');
        state.isLoadingMore = false;
    }
}

export function renderLemmyCard(post, actions) {
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.post.id;

    const currentUsername = localStorage.getItem('lemmy_username');
    const isCreator = currentUsername && post.creator.name === currentUsername;
    const isLoggedIn = localStorage.getItem('lemmy_jwt');

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
                this.classList.add('broken-image-fallback');
            };
        });
        bodyHtml = tempDiv.innerHTML;
    }

    const instanceName = new URL(post.community.actor_id).hostname;
    const creatorInstance = new URL(post.creator.actor_id).hostname;

    let thumbnailHtml = '';
    if (post.post.thumbnail_url) {
        thumbnailHtml = `
            <div class="status-media link-thumbnail">
                <div class="link-thumbnail-wrapper">
                    <img src="${post.post.thumbnail_url}" 
                         alt="Thumbnail" 
                         onerror="this.onerror=null; this.src='images/404.png'; this.classList.add('broken-image-fallback');">
                    <div class="link-overlay">
                        <svg class="link-overlay-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }

    let videoEmbedHtml = '';
    const urlStr = post.post.url || '';
    const youtubeMatch = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    const invidMatch = urlStr.match(/(?:invidio\.us|yewtu\.be|inv\.riverside\.rocks|invidious\.snopyta\.org)\/watch\?v=([^&\n?#]+)/);
    
    if (youtubeMatch || invidMatch) {
        const videoId = youtubeMatch ? youtubeMatch[1] : invidMatch[1];
        videoEmbedHtml = `
            <div class="video-embed-container">
                <iframe src="https://www.youtube-nocookie.com/embed/${videoId}" 
                        allowfullscreen 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                </iframe>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img src="${post.community.icon || 'images/php.png'}" 
                         alt="${post.community.name}" 
                         class="avatar" 
                         onclick="event.stopPropagation();"
                         onerror="this.onerror=null; this.src='images/php.png';">
                    <div class="header-text">
                        <div class="community-name">
                            <a href="#" class="community-link">c/${post.community.name}@${instanceName}</a>
                        </div>
                        <div class="post-meta">
                            <span class="author">by <a href="#" class="author-link">@${post.creator.name}@${creatorInstance}</a></span>
                            <span class="timestamp">${timeAgo(post.post.published)}</span>
                        </div>
                    </div>
                </div>
                <div class="status-header-side">
                    <button class="status-action more-options-btn" title="More options">${ICONS.more}</button>
                </div>
            </div>
            
            <div class="lemmy-title">${post.post.name}</div>
            
            ${post.post.nsfw ? '<div class="nsfw-tag">NSFW</div>' : ''}
            
            ${bodyHtml ? `<div class="lemmy-post-body">${bodyHtml}</div>` : ''}
            ${thumbnailHtml}
            ${videoEmbedHtml}
            
            ${post.post.url && !thumbnailHtml && !videoEmbedHtml ? 
                `<a href="${post.post.url}" target="_blank" class="external-link">${post.post.url}</a>` : ''}
        </div>
        
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn" data-action="upvote" title="${!isLoggedIn ? 'Login to vote' : 'Upvote'}">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${post.counts.score}</span>
                <button class="status-action lemmy-vote-btn" data-action="downvote" title="${!isLoggedIn ? 'Login to vote' : 'Downvote'}">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" title="Comments">
                ${ICONS.comments}
                <span>${post.counts.comments}</span>
            </button>
            <button class="status-action save-btn" title="${!isLoggedIn ? 'Login to save' : 'Save post'}">${ICONS.save}</button>
            <button class="status-action share-btn" title="Share">${ICONS.share}</button>
        </div>
    `;

    // Community link handler
    const communityLink = card.querySelector('.community-link');
    communityLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunity(post.community.name);
    });

    // Author link handler
    const authorLink = card.querySelector('.author-link');
    authorLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyProfile(`${post.creator.name}@${creatorInstance}`);
    });

    // More options menu
    const moreOptionsBtn = card.querySelector('.more-options-btn');
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const existingMenu = document.querySelector('.post-dropdown-menu');
        if (existingMenu) existingMenu.remove();
        
        const menu = document.createElement('div');
        menu.className = 'post-dropdown-menu';
        menu.style.position = 'absolute';
        menu.style.zIndex = '1000';
        
        const menuItems = [];
        
        // Always available options
        menuItems.push(
            { label: 'Share Post', action: () => actions.sharePost(post) },
            { label: 'Copy Post URL', action: () => {
                navigator.clipboard.writeText(post.post.ap_id);
                showToast('Post URL copied!');
            }},
            { label: 'Open Original', action: () => window.open(post.post.ap_id, '_blank') }
        );

        // Options for logged-in users
        if (isLoggedIn) {
            menuItems.push(
                { label: `Block c/${post.community.name}`, action: () => {
                    if (confirm(`Block community ${post.community.name}?`)) {
                        actions.lemmyBlockCommunity(post.community.id, true);
                    }
                }}
            );

            if (!isCreator) {
                menuItems.push(
                    { label: `Block @${post.creator.name}`, action: () => {
                        if (confirm(`Block user ${post.creator.name}?`)) {
                            actions.lemmyBlockUser(post.creator.id, true);
                        }
                    }}
                );
            }
        }

        // Options for post creator
        if (isCreator && isLoggedIn) {
            menuItems.push(
                { label: 'Edit Post', action: () => showEditPostUI(card, post, actions) },
                { label: 'Delete Post', action: () => {
                    if (confirm('Are you sure you want to delete this post?')) {
                        actions.lemmyDeletePost(post.post.id);
                    }
                }}
            );
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
        
        if (rect.bottom + menuHeight > window.innerHeight) {
            menu.style.top = `${rect.top - menuHeight}px`;
        } else {
            menu.style.top = `${rect.bottom}px`;
        }
        
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

    // Voting handlers
    const upvoteBtn = card.querySelector('[data-action="upvote"]');
    const downvoteBtn = card.querySelector('[data-action="downvote"]');
    
    if (post.my_vote === 1) upvoteBtn.classList.add('active');
    if (post.my_vote === -1) downvoteBtn.classList.add('active');

    upvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn) {
            showToast('Please log in to vote');
            return;
        }
        const newScore = post.my_vote === 1 ? 0 : 1;
        actions.lemmyVote(post.post.id, newScore, card);
    });

    downvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn) {
            showToast('Please log in to vote');
            return;
        }
        const newScore = post.my_vote === -1 ? 0 : -1;
        actions.lemmyVote(post.post.id, newScore, card);
    });

    // Save button
    const saveBtn = card.querySelector('.save-btn');
    if (post.saved) saveBtn.classList.add('active');
    
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn) {
            showToast('Please log in to save posts');
            return;
        }
        actions.lemmySave(post.post.id, saveBtn);
    });

    // Share button
    const shareBtn = card.querySelector('.share-btn');
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actions.sharePost(post);
    });

    // Thumbnail click handler
    if (thumbnailHtml) {
        const thumbnail = card.querySelector('.link-thumbnail');
        thumbnail.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(post.post.url, '_blank');
        });
    }

    // Card click handler for post detail
    card.addEventListener('click', () => {
        actions.showLemmyPostDetail(post);
    });

    return card;
}

function showEditPostUI(card, post, actions) {
    const bodyDiv = card.querySelector('.lemmy-post-body');
    const titleDiv = card.querySelector('.lemmy-title');
    
    const originalTitle = post.post.name;
    const originalBody = post.post.body || '';
    const originalTitleHtml = titleDiv.innerHTML;
    const originalBodyHtml = bodyDiv ? bodyDiv.innerHTML : '';

    // Create edit UI for title
    titleDiv.innerHTML = `
        <input type="text" class="edit-post-title" value="${originalTitle.replace(/"/g, '&quot;')}" 
               style="width: 100%; padding: 8px; border: 1px solid var(--border-color); 
                      border-radius: 4px; background-color: var(--bg-color); 
                      color: var(--font-color); font-size: 18px; font-weight: 600;">
    `;

    // Create edit UI for body
    if (bodyDiv || originalBody) {
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
                
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                const response = await apiFetch(lemmyInstance, null, '/api/v3/post', {
                    method: 'PUT',
                    body: { 
                        post_id: post.post.id, 
                        name: newTitle,
                        body: newBody || undefined
                    }
                }, 'lemmy');
                
                // Update the post object
                post.post.name = newTitle;
                post.post.body = newBody;
                
                // Update the display
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
                            this.classList.add('broken-image-fallback');
                        };
                    });
                    newHtmlContent = tempDiv.innerHTML;
                    
                    if (bodyDiv) {
                        bodyDiv.innerHTML = newHtmlContent;
                    } else {
                        const newBodyDiv = document.createElement('div');
                        newBodyDiv.className = 'lemmy-post-body';
                        newBodyDiv.innerHTML = newHtmlContent;
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
}
