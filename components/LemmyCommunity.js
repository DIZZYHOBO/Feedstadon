// components/LemmyCommunity.js

import { apiFetch } from './api.js';
import { renderLemmyPost } from './LemmyPost.js';
import { showToast } from './utils.js';

export async function renderLemmyCommunityPage(view, communityNameWithInstance) {
    try {
        // Parse the community name and instance
        const [name, instance] = communityNameWithInstance.includes('@') 
            ? communityNameWithInstance.split('@') 
            : [communityNameWithInstance, localStorage.getItem('lemmy_instance')];
        
        const lemmyInstance = instance || localStorage.getItem('lemmy_instance');
        
        view.innerHTML = '<div class="loading-spinner">Loading community...</div>';
        
        // Fetch community data
        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/community', {}, 'lemmy', { name: name });
        const communityView = data.community_view;
        const community = communityView.community;
        
        // Fetch posts
        const postsResponse = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', { 
            community_name: name, 
            sort: localStorage.getItem('lemmySortType') || 'New' 
        });
        const posts = postsResponse.data.posts;
        
        // Create the buttons - Subscribe and New Post
        let actionButtons = '';
        const isLoggedIn = localStorage.getItem('lemmy_jwt');
        
        if (isLoggedIn) {
            const isSubscribed = communityView.subscribed === 'Subscribed';
            actionButtons = `
                <div class="community-action-buttons" style="display: flex; gap: 10px;">
                    <button class="button subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                            data-community-id="${community.id}">
                        ${isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                    </button>
                    <button class="button new-post-btn" 
                            data-community="${community.name}@${new URL(community.actor_id).hostname}">
                        📝 New Post
                    </button>
                </div>
            `;
        } else {
            actionButtons = `
                <div class="community-action-buttons" style="padding: 0 20px 20px;">
                    <p style="color: var(--font-color-muted); font-size: 14px;">
                        Log in to subscribe or post
                    </p>
                </div>
            `;
        }
        
        // Handle description truncation
        const converter = typeof showdown !== 'undefined' ? new showdown.Converter() : null;
        const fullDescription = community.description || '';
        let fullDescriptionHtml = fullDescription;
        
        if (converter) {
            fullDescriptionHtml = converter.makeHtml(fullDescription);
        }
        
        const words = fullDescription.split(/\s+/);
        const firstPeriodIndex = fullDescription.indexOf('.');
        
        let isTruncated = false;
        let truncatedDescription = '';
        
        if (words.length > 30) {
            truncatedDescription = words.slice(0, 30).join(' ') + '...';
            isTruncated = true;
        } else if (firstPeriodIndex > 0 && fullDescription.substring(firstPeriodIndex + 1).trim().length > 0) {
            truncatedDescription = fullDescription.substring(0, firstPeriodIndex + 1);
            isTruncated = true;
        }
        
        let descriptionBlock;
        if (isTruncated && converter) {
            const truncatedHtml = converter.makeHtml(truncatedDescription);
            descriptionBlock = `
                <div class="community-bio">
                    <div class="bio-truncated">${truncatedHtml}</div>
                    <div class="bio-full" style="max-height: 0px; overflow: hidden; transition: max-height 0.4s ease-out;">
                        ${fullDescriptionHtml}
                    </div>
                    <a href="#" class="read-more-bio" style="display: block; text-align: right; font-size: small; cursor: pointer; font-weight: bold; color: var(--accent-color);">read more</a>
                </div>
            `;
        } else {
            descriptionBlock = `<div class="community-bio">${fullDescriptionHtml}</div>`;
        }
        
        // Build the community page HTML
        view.innerHTML = `
            <div class="profile-card lemmy-community-card">
                <div class="profile-header">
                    <div class="banner" style="background-image: url('${community.banner || ''}'); background-color: var(--primary-color); background-size: cover; background-position: center;"></div>
                    <img class="avatar" src="${community.icon || './images/logo.png'}" alt="${community.name} avatar" onerror="this.onerror=null;this.src='./images/logo.png';">
                </div>
                <div class="profile-info">
                    <h2>${community.title || community.name}</h2>
                    <p class="acct">!${community.name}@${new URL(community.actor_id).hostname}</p>
                    ${descriptionBlock}
                    <div class="stats">
                        <span><strong>${communityView.counts.subscribers}</strong> subscribers</span>
                        <span><strong>${communityView.counts.posts}</strong> posts</span>
                        <span><strong>${communityView.counts.comments}</strong> comments</span>
                    </div>
                </div>
                <div class="profile-actions">
                    ${actionButtons}
                </div>
            </div>
            <div class="profile-feed">
                <div class="profile-feed-content" id="community-posts">
                    ${posts.length > 0 ? 
                        posts.map(post => renderLemmyPost(post)).join('') : 
                        '<div class="empty-feed-message">No posts yet</div>'
                    }
                </div>
            </div>
        `;
        
        // Add event listeners for the buttons
        setupCommunityEventListeners(view, communityView);
        
        // Handle "read more" for description
        const readMoreLink = view.querySelector('.read-more-bio');
        if (readMoreLink) {
            readMoreLink.addEventListener('click', (e) => {
                e.preventDefault();
                const bioFull = view.querySelector('.bio-full');
                const bioTruncated = view.querySelector('.bio-truncated');
                
                if (bioFull.style.maxHeight === '0px') {
                    bioFull.style.maxHeight = bioFull.scrollHeight + 'px';
                    bioTruncated.style.display = 'none';
                    readMoreLink.textContent = 'read less';
                } else {
                    bioFull.style.maxHeight = '0px';
                    bioTruncated.style.display = 'block';
                    readMoreLink.textContent = 'read more';
                }
            });
        }
        
        // Setup event handlers for post interactions
        setupPostEventHandlers(view);
        
    } catch (error) {
        console.error('Failed to load Lemmy community:', error);
        view.innerHTML = `
            <div class="error-container">
                <h3>Failed to load community</h3>
                <p>${error.message}</p>
                <button class="button" onclick="history.back()">Go Back</button>
            </div>
        `;
    }
}

// Function to handle community page event listeners
function setupCommunityEventListeners(view, communityView) {
    // Subscribe/Unsubscribe button
    const subscribeBtn = view.querySelector('.subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', async () => {
            try {
                subscribeBtn.disabled = true;
                subscribeBtn.textContent = 'Loading...';
                
                const isCurrentlySubscribed = subscribeBtn.classList.contains('subscribed');
                const communityId = parseInt(subscribeBtn.dataset.communityId);
                
                const lemmyInstance = localStorage.getItem('lemmy_instance');
                const response = await apiFetch(lemmyInstance, null, '/api/v3/community/follow', {
                    method: 'POST',
                    body: { 
                        community_id: communityId, 
                        follow: !isCurrentlySubscribed 
                    }
                }, 'lemmy');
                
                if (response.data) {
                    const newSubscribedState = response.data.community_view.subscribed === 'Subscribed';
                    subscribeBtn.classList.toggle('subscribed', newSubscribedState);
                    subscribeBtn.textContent = newSubscribedState ? 'Unsubscribe' : 'Subscribe';
                    
                    // Update stats if needed
                    const statsElement = view.querySelector('.stats span:first-child strong');
                    if (statsElement) {
                        statsElement.textContent = response.data.community_view.counts.subscribers;
                    }
                    
                    showToast(newSubscribedState ? 'Subscribed to community!' : 'Unsubscribed from community');
                }
            } catch (error) {
                console.error('Failed to update subscription:', error);
                showToast('Failed to update subscription');
                // Reset button text
                const isSubscribed = subscribeBtn.classList.contains('subscribed');
                subscribeBtn.textContent = isSubscribed ? 'Unsubscribe' : 'Subscribe';
            } finally {
                subscribeBtn.disabled = false;
            }
        });
    }
    
    // New Post button
    const newPostBtn = view.querySelector('.new-post-btn');
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            const communityName = newPostBtn.dataset.community;
            openLemmyComposeModal(communityName);
        });
    }
}

// Function to open the compose modal with pre-filled community
function openLemmyComposeModal(communityName) {
    // Show the compose modal
    const modal = document.getElementById('compose-modal');
    if (!modal) {
        console.error('Compose modal not found');
        return;
    }
    modal.classList.add('visible');
    
    // Switch to Lemmy tab
    const lemmyTab = document.querySelector('[data-tab="lemmy"]');
    const mastodonTab = document.querySelector('[data-tab="mastodon"]');
    const lemmyContent = document.getElementById('lemmy-compose-tab');
    const mastodonContent = document.getElementById('mastodon-compose-tab');
    
    if (lemmyTab && mastodonTab && lemmyContent && mastodonContent) {
        lemmyTab.classList.add('active');
        mastodonTab.classList.remove('active');
        lemmyContent.classList.add('active');
        mastodonContent.classList.remove('active');
    }
    
    // Pre-fill the community field
    const communityInput = document.getElementById('lemmy-community-input');
    if (communityInput) {
        communityInput.value = communityName;
    }
    
    // Clear other fields
    const titleInput = document.getElementById('lemmy-title-input');
    const bodyTextarea = document.getElementById('lemmy-body-textarea');
    const urlInput = document.getElementById('lemmy-url-input');
    
    if (titleInput) titleInput.value = '';
    if (bodyTextarea) bodyTextarea.value = '';
    if (urlInput) urlInput.value = '';
    
    // Focus on the title field
    if (titleInput) {
        setTimeout(() => titleInput.focus(), 100);
    }
}

// Function to setup post event handlers
function setupPostEventHandlers(view) {
    // Handle all post interactions within the community feed
    view.querySelectorAll('.lemmy-card').forEach(card => {
        // These handlers should be set up by renderLemmyPost, but we can add additional ones here if needed
        
        // Handle clicking on the post to view details
        const bodyContent = card.querySelector('.status-body-content');
        if (bodyContent) {
            bodyContent.style.cursor = 'pointer';
            bodyContent.addEventListener('dblclick', () => {
                // Double-click to view post - this should be handled by the main app
                const postId = card.dataset.postId;
                if (postId && window.actions && window.actions.showLemmyPostDetail) {
                    // Trigger navigation to post detail
                    const postData = JSON.parse(card.dataset.postData || '{}');
                    window.actions.showLemmyPostDetail(postData);
                }
            });
        }
    });
}
