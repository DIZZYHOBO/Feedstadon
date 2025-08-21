// components/LemmyCommunity.js

import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js'; // Import the proper rendering function

// Simple toast notification function
function showToast(message, type = 'info') {
    // Check if there's a global showToast function
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Otherwise, create a simple toast
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 3000;
        background-color: ${type === 'error' ? '#ea0027' : type === 'success' ? '#46d160' : '#0084ff'};
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export async function renderLemmyCommunityPage(view, communityNameWithInstance) {
    try {
        // Check if we accidentally received the actions object
        if (communityNameWithInstance && typeof communityNameWithInstance === 'object' && 
            'showLemmyCommunity' in communityNameWithInstance) {
            console.error('Error: Received actions object instead of community name. Check the calling code.');
            throw new Error('Invalid parameter: received actions object instead of community identifier');
        }
        
        // Debug: log what we're receiving
        console.log('renderLemmyCommunityPage received:', communityNameWithInstance, 'Type:', typeof communityNameWithInstance);
        
        // Ensure we have a valid string input
        let communityString = '';
        
        // Handle different input types
        if (typeof communityNameWithInstance === 'string') {
            communityString = communityNameWithInstance;
        } else if (communityNameWithInstance && typeof communityNameWithInstance === 'object') {
            // If it's an object, try to extract community name and instance
            console.log('Object properties:', Object.keys(communityNameWithInstance));
            
            // Check for various possible property names
            if (communityNameWithInstance.name) {
                communityString = communityNameWithInstance.name;
                if (communityNameWithInstance.instance) {
                    communityString += '@' + communityNameWithInstance.instance;
                } else if (communityNameWithInstance.actor_id) {
                    // Extract instance from actor_id URL
                    const url = new URL(communityNameWithInstance.actor_id);
                    communityString += '@' + url.hostname;
                }
            } else if (communityNameWithInstance.community) {
                // Handle community_view objects
                if (typeof communityNameWithInstance.community === 'object') {
                    const comm = communityNameWithInstance.community;
                    communityString = comm.name;
                    if (comm.actor_id) {
                        const url = new URL(comm.actor_id);
                        communityString += '@' + url.hostname;
                    }
                } else {
                    communityString = communityNameWithInstance.community;
                }
            }
        } else if (communityNameWithInstance === undefined || communityNameWithInstance === null) {
            throw new Error('No community specified');
        }
        
        // Clean up the community string
        if (communityString) {
            communityString = communityString.trim();
            // Remove any leading '!' if present
            if (communityString.startsWith('!')) {
                communityString = communityString.substring(1);
            }
        }
        
        // Validate we have something to work with
        if (!communityString) {
            console.error('No valid community identifier could be extracted from:', communityNameWithInstance);
            throw new Error('No community specified. Please provide a community name.');
        }
        
        console.log('Processing community string:', communityString);
        
        // Parse the community name and instance
        const [name, instance] = communityString.includes('@') 
            ? communityString.split('@') 
            : [communityString, localStorage.getItem('lemmy_instance')];
        
        const lemmyInstance = instance || localStorage.getItem('lemmy_instance');
        
        if (!lemmyInstance) {
            throw new Error('No Lemmy instance configured. Please log in to a Lemmy instance first.');
        }
        
        console.log('Fetching community:', name, 'from instance:', lemmyInstance);
        
        view.innerHTML = '<div class="loading-spinner">Loading community...</div>';
        
        // Fetch community data
        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/community', {}, 'lemmy', { name: name });
        const communityView = data.community_view;
        const community = communityView.community;
        
        // Check subscription status if logged in
        let actualSubscriptionStatus = communityView.subscribed;
        const isLoggedIn = localStorage.getItem('lemmy_jwt');
        
        if (isLoggedIn) {
            const userInstance = localStorage.getItem('lemmy_instance');
            
            // If viewing a remote community, check subscription status on user's instance
            const communityInstance = new URL(community.actor_id).hostname;
            if (communityInstance !== userInstance) {
                try {
                    // Try to resolve the community on the user's instance to get accurate subscription status
                    const resolveResponse = await apiFetch(userInstance, null, '/api/v3/resolve_object', {}, 'lemmy', {
                        q: community.actor_id
                    });
                    
                    if (resolveResponse.data && resolveResponse.data.community) {
                        actualSubscriptionStatus = resolveResponse.data.community.subscribed;
                        // Update the communityView with the correct subscription status
                        communityView.subscribed = actualSubscriptionStatus;
                    }
                } catch (error) {
                    console.log('Could not check subscription status on home instance, using remote status');
                }
            }
        }
        
        // Fetch posts
        const postsResponse = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', { 
            community_name: name, 
            sort: localStorage.getItem('lemmySortType') || 'New' 
        });
        const posts = postsResponse.data.posts;
        
        // Create the buttons - Subscribe and New Post
        let actionButtons = '';
        
        if (isLoggedIn) {
            const isSubscribed = actualSubscriptionStatus === 'Subscribed' || actualSubscriptionStatus === 'Pending';
            actionButtons = `
                <div class="community-action-buttons" style="display: flex; gap: 10px;">
                    <button class="button subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                            data-community-id="${community.id}"
                            data-subscription-status="${actualSubscriptionStatus || 'NotSubscribed'}">
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
                    <!-- Posts will be added here -->
                </div>
            </div>
        `;
        
        // Add event listeners for the buttons
        setupCommunityEventListeners(view, communityView);
        
        // Now render the posts into the container
        const postsContainer = view.querySelector('#community-posts');
        if (postsContainer && posts.length > 0) {
            postsContainer.innerHTML = ''; // Clear the container
            
            posts.forEach(post => {
                if (typeof renderLemmyCard === 'function') {
                    // renderLemmyCard returns a DOM element, so append it directly
                    const postElement = renderLemmyCard(post);
                    if (postElement) {
                        postsContainer.appendChild(postElement);
                    }
                } else {
                    // Fallback: create a simple post card as HTML
                    const postHtml = renderLemmyPostCard(post);
                    postsContainer.insertAdjacentHTML('beforeend', postHtml);
                }
            });
        } else if (postsContainer && posts.length === 0) {
            postsContainer.innerHTML = '<div class="empty-feed-message">No posts yet</div>';
        }
        
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
                
                const userInstance = localStorage.getItem('lemmy_instance');
                const community = communityView.community;
                
                // If this is a remote community, we need to resolve it on the user's instance first
                let localCommunityId = communityId;
                
                // Check if this community is from a different instance
                const communityInstance = new URL(community.actor_id).hostname;
                if (communityInstance !== userInstance) {
                    try {
                        // First, try to resolve the community on the user's instance
                        const resolveResponse = await apiFetch(userInstance, null, '/api/v3/resolve_object', {}, 'lemmy', {
                            q: community.actor_id
                        });
                        
                        if (resolveResponse.data && resolveResponse.data.community) {
                            localCommunityId = resolveResponse.data.community.community.id;
                        } else {
                            throw new Error('Could not resolve community on your instance');
                        }
                    } catch (resolveError) {
                        console.error('Failed to resolve community:', resolveError);
                        // Try alternative: search for the community
                        try {
                            const searchResponse = await apiFetch(userInstance, null, '/api/v3/search', {}, 'lemmy', {
                                q: `!${community.name}@${communityInstance}`,
                                type_: 'Communities',
                                limit: 1
                            });
                            
                            if (searchResponse.data && searchResponse.data.communities && searchResponse.data.communities.length > 0) {
                                localCommunityId = searchResponse.data.communities[0].community.id;
                            } else {
                                throw new Error('Community not found on your instance. It may need to be fetched first.');
                            }
                        } catch (searchError) {
                            throw new Error('Could not find community on your instance. Try searching for it first to federate it.');
                        }
                    }
                }
                
                // Now subscribe/unsubscribe using the correct community ID
                const response = await apiFetch(userInstance, null, '/api/v3/community/follow', {
                    method: 'POST',
                    body: { 
                        community_id: localCommunityId, 
                        follow: !isCurrentlySubscribed 
                    }
                }, 'lemmy');
                
                if (response.data) {
                    const newSubscribedState = response.data.community_view.subscribed === 'Subscribed' || response.data.community_view.subscribed === 'Pending';
                    subscribeBtn.classList.toggle('subscribed', newSubscribedState);
                    subscribeBtn.textContent = newSubscribedState ? 'Unsubscribe' : 'Subscribe';
                    subscribeBtn.dataset.subscriptionStatus = response.data.community_view.subscribed || 'NotSubscribed';
                    
                    // Update stats if needed
                    const statsElement = view.querySelector('.stats span:first-child strong');
                    if (statsElement && response.data.community_view.counts) {
                        statsElement.textContent = response.data.community_view.counts.subscribers;
                    }
                    
                    showToast(newSubscribedState ? 'Subscribed to community!' : 'Unsubscribed from community');
                }
            } catch (error) {
                console.error('Failed to update subscription:', error);
                showToast(error.message || 'Failed to update subscription');
                // Reset button text based on current state
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

// No need to export again - already exported at the top with the function declaration
