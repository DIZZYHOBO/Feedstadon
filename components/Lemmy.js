import { ICONS } from './icons.js';
import { formatTimestamp, timeAgo, getWordFilter, shouldFilterContent, processSpoilers } from './utils.js';
import { showToast, renderLoginPrompt, showImageModal } from './ui.js';
import { apiFetch } from './api.js';

export function renderLemmyCard(post, actions) {
    const filterList = getWordFilter();
    const combinedContent = `${post.post.name} ${post.post.body || ''}`;
    if (shouldFilterContent(combinedContent, filterList)) {
        return document.createDocumentFragment();
    }
    
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.post.id;

    const currentUsername = localStorage.getItem('lemmy_username');
    const isCreator = currentUsername && post.creator.name === currentUsername;
    const isLoggedIn = localStorage.getItem('lemmy_jwt');

    let mediaHTML = '';
    const url = post.post.url;
    const isImagePost = url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const isLinkPost = url && !post.post.body && !isImagePost;
    
    if (url) {
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
        } else if (isImagePost) {
            mediaHTML = `<div class="status-media"><img src="${url}" alt="${post.post.name}" loading="lazy"></div>`;
        } else if (post.post.thumbnail_url) {
            if (isLinkPost) {
                mediaHTML = `
                    <div class="status-media link-thumbnail">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-thumbnail-wrapper">
                            <img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy">
                            <div class="link-overlay">
                                <svg class="link-overlay-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" /></svg>
                            </div>
                        </a>
                    </div>
                `;
            } else {
                mediaHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
            }
        }
    }
    
    let crosspostTag = '';
    if (post.cross_post) {
        crosspostTag = `<div class="crosspost-tag">Merged</div>`;
    }

    const processedBody = processSpoilers(post.post.body || '');
    const fullBodyHtml = new showdown.Converter().makeHtml(processedBody);
    let bodyHTML = fullBodyHtml;
    const wordCount = post.post.body ? post.post.body.split(/\s+/).length : 0;

    if (wordCount > 30) {
        const truncatedText = post.post.body.split(/\s+/).slice(0, 30).join(' ');
        bodyHTML = new showdown.Converter().makeHtml(processSpoilers(truncatedText)) + '... <a href="#" class="read-more-link">Read More</a>';
    }

    let titleHTML;
    if (isLinkPost) {
        const domain = new URL(url).hostname.replace('www.', '');
        titleHTML = `
            <div class="lemmy-title-container">
                <h3 class="lemmy-title">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="lemmy-link-title">${post.post.name}</a>
                </h3>
                <div class="link-domain-indicator">
                    <svg class="icon link-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" /></svg>
                    <span class="domain-text">${domain}</span>
                </div>
            </div>
        `;
    } else {
        titleHTML = `<h3 class="lemmy-title">${post.post.name}</h3>`;
    }

    card.innerHTML = `
        ${crosspostTag}
        <div class="status-body-content">
            <div class="status-header">
                <a href="#" class="status-header-main" data-action="view-community">
                    <img src="${post.community.icon || './images/php.png'}" alt="${post.community.name} icon" class="avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                    <div>
                        <span class="display-name">${post.community.name}</span>
                        <span class="acct">posted by <span class="creator-link" data-action="view-creator">${post.creator.name}</span> · ${formatTimestamp(post.post.published)}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    <button class="post-options-btn" title="More options">${ICONS.more}</button>
                    <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                </div>
            </div>
            <div class="status-content">
                ${titleHTML}
                ${mediaHTML}
                <div class="lemmy-post-body">${bodyHTML}</div>
            </div>
        </div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${post.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1" ${!isLoggedIn ? 'title="Login to vote"' : 'title="Upvote"'}>${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${post.counts.score}</span>
                <button class="status-action lemmy-vote-btn ${post.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1" ${!isLoggedIn ? 'title="Login to vote"' : 'title="Downvote"'}>${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="quick-reply" ${!isLoggedIn ? 'title="Login to reply"' : 'title="Reply"'}>${ICONS.reply}</button>
            <button class="status-action" data-action="view-post">${ICONS.comments} ${post.counts.comments}</button>
            <button class="status-action" data-action="share">${ICONS.share}</button>
            <button class="status-action ${post.saved ? 'active' : ''}" data-action="save" ${!isLoggedIn ? 'title="Login to save"' : 'title="Save"'}>${ICONS.bookmark}</button>
        </div>
        <div class="quick-reply-container">
            <div class="quick-reply-box">
                <textarea placeholder="Add a comment..."></textarea>
                <button class="button-primary">Post</button>
            </div>
        </div>
    `;

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

    const mediaImg = card.querySelector('.status-media img');
    if (mediaImg && !isLinkPost) {
        mediaImg.style.cursor = 'pointer';
        mediaImg.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageModal(post.post.url || mediaImg.src);
        });
    }
    
    card.querySelector('.status-body-content').addEventListener('dblclick', () => {
        if (post.cross_post) {
            actions.showMergedPost(post);
        } else {
            actions.showLemmyPostDetail(post);
        }
    });

    card.querySelector('[data-action="view-community"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunity(`${post.community.name}@${new URL(post.community.actor_id).hostname}`);
    });
    
    card.querySelector('[data-action="view-creator"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyProfile(`${post.creator.name}@${new URL(post.creator.actor_id).hostname}`);
    });

    const optionsBtn = card.querySelector('.post-options-btn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
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
                { label: 'Copy Link', action: () => {
                    navigator.clipboard.writeText(post.post.ap_id);
                    showToast('Post link copied to clipboard!', 'success');
                }}
            );
            
            // Logged-in user options
            if (isLoggedIn) {
                menuItems.push(
                    { label: `Block c/${post.community.name}`, action: () => {
                        if (confirm(`Are you sure you want to block ${post.community.name}?`)) {
                            actions.lemmyBlockCommunity(post.community.id, true);
                        }
                    }}
                );
                
                if (!isCreator) {
                    menuItems.push(
                        { label: `Block @${post.creator.name}`, action: () => {
                            if (confirm(`Are you sure you want to block ${post.creator.name}?`)) {
                                actions.lemmyBlockUser(post.creator.id, true);
                            }
                        }}
                    );
                }
                
                // Post owner options
                if (isCreator) {
                    menuItems.push(
                        { label: 'Edit Post', action: () => {
                            showEditPostUI(card, post, actions);
                        }},
                        { label: 'Delete Post', action: () => {
                            if (confirm('Are you sure you want to delete this post?')) {
                                actions.lemmyDeletePost(post.post.id);
                            }
                        }}
                    );
                }
            }
            
            menuItems.forEach(item => {
                const button = document.createElement('button');
                button.innerHTML = item.label;
                button.onclick = (event) => {
                    event.stopPropagation();
                    item.action();
                    menu.remove();
                };
                menu.appendChild(button);
            });
            
            document.body.appendChild(menu);
            
            const rect = optionsBtn.getBoundingClientRect();
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
                    actions.lemmyVote(post.post.id, score, card);
                    break;
                case 'save':
                    if (!isLoggedIn) {
                        showToast('Please log in to save posts');
                        return;
                    }
                    actions.lemmySave(post.post.id, e.currentTarget);
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
                    if (post.cross_post) {
                        actions.showMergedPost(post);
                    } else {
                        actions.showLemmyPostDetail(post);
                    }
                    break;
                case 'share':
                    actions.sharePost(post);
                    break;
            }
        });
    });
    
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
            await actions.lemmyPostComment({ content: content, post_id: post.post.id });
            textarea.value = '';
            card.querySelector('.quick-reply-container').style.display = 'none';
            showToast('Comment posted!', 'success');
        } catch(err) {
            showToast('Failed to post comment', 'error');
        }
    });
    
    card.querySelector('.quick-reply-box textarea').addEventListener('click', (e) => e.stopPropagation());

    return card;
}

function showEditPostUI(card, post, actions) {
    const bodyContainer = card.querySelector('.lemmy-post-body');
    const titleElement = card.querySelector('.lemmy-title');
    
    const originalTitle = post.post.name;
    const originalBody = post.post.body || '';
    
    // Save original HTML
    const originalTitleHTML = titleElement.innerHTML;
    const originalBodyHTML = bodyContainer ? bodyContainer.innerHTML : '';
    
    // Replace title with input
    titleElement.innerHTML = `
        <input type="text" class="edit-title-input" value="${originalTitle.replace(/"/g, '&quot;')}" 
               style="width: 100%; padding: 8px; background-color: var(--bg-color); 
                      color: var(--font-color); border: 1px solid var(--border-color); 
                      border-radius: 4px; font-size: 18px; font-weight: 600;">
    `;
    
    // Create edit container for body
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    editContainer.innerHTML = `
        <textarea class="edit-body-textarea" 
                  style="width: 100%; min-height: 150px; padding: 10px; 
                         background-color: var(--bg-color); color: var(--font-color); 
                         border: 1px solid var(--border-color); border-radius: 4px; 
                         resize: vertical; font-family: inherit; margin-top: 10px;">${originalBody}</textarea>
        <div class="edit-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button class="button-secondary cancel-btn">Cancel</button>
            <button class="button-primary save-btn">Save</button>
        </div>
    `;
    
    if (bodyContainer) {
        bodyContainer.innerHTML = '';
        bodyContainer.appendChild(editContainer);
    } else {
        titleElement.insertAdjacentElement('afterend', editContainer);
    }
    
    const titleInput = card.querySelector('.edit-title-input');
    const bodyTextarea = editContainer.querySelector('.edit-body-textarea');
    const saveBtn = editContainer.querySelector('.save-btn');
    const cancelBtn = editContainer.querySelector('.cancel-btn');
    
    titleInput.focus();
    
    cancelBtn.addEventListener('click', () => {
        titleElement.innerHTML = originalTitleHTML;
        if (bodyContainer) {
            bodyContainer.innerHTML = originalBodyHTML;
        } else {
            editContainer.remove();
        }
    });
    
    saveBtn.addEventListener('click', async () => {
        const newTitle = titleInput.value.trim();
        const newBody = bodyTextarea.value.trim();
        
        if (!newTitle) {
            showToast('Title cannot be empty', 'error');
            return;
        }
        
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await actions.lemmyEditPost(post.post.id, newBody, newTitle);
            
            // Update the post object
            post.post.name = newTitle;
            post.post.body = newBody;
            
            // Update display
            titleElement.innerHTML = newTitle;
            
            if (newBody) {
                const converter = new showdown.Converter();
                const processedBody = processSpoilers(newBody);
                const newBodyHTML = converter.makeHtml(processedBody);
                
                if (!bodyContainer) {
                    const newBodyDiv = document.createElement('div');
                    newBodyDiv.className = 'lemmy-post-body';
                    newBodyDiv.innerHTML = newBodyHTML;
                    titleElement.insertAdjacentElement('afterend', newBodyDiv);
                    editContainer.remove();
                } else {
                    bodyContainer.innerHTML = newBodyHTML;
                }
            } else if (bodyContainer) {
                bodyContainer.remove();
            }
            
            showToast('Post updated successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to update post:', error);
            showToast('Failed to update post', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
}

export async function fetchLemmyFeed(state, actions, loadMore = false, onLemmySuccess) {
    if (!localStorage.getItem('lemmy_jwt') && !loadMore) {
        renderLoginPrompt(state.timelineDiv, 'lemmy', onLemmySuccess);
        return;
    }

    if (state.isLoadingMore) return;

    if (!loadMore) {
        window.scrollTo(0, 0);
    }
    
    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');
    else document.getElementById('refresh-btn').classList.add('loading');

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) {
            throw new Error("Lemmy instance not found. Please log in.");
        }

        const params = {
            sort: state.currentLemmySort,
            page: loadMore ? state.lemmyPage + 1 : 1,
            limit: 20,
            type_: state.currentLemmyFeed
        };
        
        const response = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', params);
        const posts = response.data.posts;

        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        if (posts && posts.length > 0) {
            if (loadMore) {
                state.lemmyPage++;
            } else {
                state.lemmyPage = 1;
            }
            posts.forEach(post_view => {
                const postCard = renderLemmyCard(post_view, actions);
                state.timelineDiv.appendChild(postCard);
            });
            state.lemmyHasMore = true;
        } else {
            if (!loadMore) {
                state.timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
            }
            state.lemmyHasMore = false;
        }

        if (!state.lemmyHasMore) {
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
             state.scrollLoader.innerHTML = '<p></p>';
        }

    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        showToast(`Could not load Lemmy feed: ${error.message}`, 'error');
        state.timelineDiv.innerHTML = `<p>Error loading feed.</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
        else document.getElementById('refresh-btn').classList.remove('loading');
    }
}
