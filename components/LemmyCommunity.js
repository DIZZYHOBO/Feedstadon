// components/LemmyCommunity.js - Updated with PieFed support

import { apiFetch, detectInstanceType } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { ICONS } from './icons.js';

export async function renderLemmyCommunityPage(state, actions, communityName) {
    const view = document.getElementById('lemmy-community-view');
    view.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;

    try {
        const [name, instance] = communityName.split('@');
        const targetInstance = instance || localStorage.getItem('lemmy_instance');
        
        if (!targetInstance) {
            throw new Error("No instance specified and no default Lemmy instance found.");
        }

        // Detect if this is PieFed or Lemmy
        const instanceType = await detectInstanceType(targetInstance);
        console.log(`Detected instance type: ${instanceType} for ${targetInstance}`);

        if (instanceType === 'piefed') {
            await renderPieFedCommunityPage(view, name, targetInstance, actions);
        } else {
            await renderLemmyCommunityPageInternal(view, name, targetInstance, actions);
        }

    } catch (error) {
        console.error("Failed to load community:", error);
        view.innerHTML = `
            <div class="error-container">
                <h3>Could not load community</h3>
                <p>${error.message}</p>
                <p><strong>Debug info:</strong> Attempted to load "${communityName}"</p>
                <button onclick="window.history.back()" class="button-secondary">Go Back</button>
            </div>
        `;
    }
}

async function renderLemmyCommunityPageInternal(view, name, instance, actions) {
    const { data } = await apiFetch(instance, null, '/api/v3/community', {}, 'lemmy', { name: name });
    const communityView = data.community_view;
    const postsResponse = await apiFetch(instance, null, '/api/v3/post/list', {}, 'lemmy', { 
        community_name: name, 
        sort: 'New' 
    });
    const posts = postsResponse.data.posts;

    renderCommunityPage(view, communityView, posts, actions, 'lemmy');
}

async function renderPieFedCommunityPage(view, name, instance, actions) {
    try {
        // PieFed might have different endpoints - adjust as needed
        // This is a placeholder - you'll need to check PieFed's actual API
        const communityResponse = await fetch(`https://${instance}/api/community/${name}`);
        
        if (!communityResponse.ok) {
            throw new Error(`PieFed community not found: ${communityResponse.status}`);
        }
        
        const communityData = await communityResponse.json();
        
        // Try to get posts - this endpoint is also a guess
        const postsResponse = await fetch(`https://${instance}/api/posts?community=${name}&sort=new`);
        const postsData = postsResponse.ok ? await postsResponse.json() : { posts: [] };

        // Convert PieFed data structure to Lemmy-like structure for rendering
        const normalizedCommunity = {
            community: {
                id: communityData.id || 0,
                name: communityData.name || name,
                title: communityData.title || name,
                description: communityData.description || '',
                icon: communityData.icon || null,
                banner: communityData.banner || null,
                actor_id: `https://${instance}/c/${name}`
            },
            counts: {
                subscribers: communityData.subscribers || 0,
                users_active_day: communityData.active_users_day || 0
            },
            subscribed: 'NotSubscribed' // PieFed might not provide this info easily
        };

        const normalizedPosts = (postsData.posts || []).map(post => ({
            post: {
                id: post.id,
                name: post.title || post.name,
                body: post.body || post.content,
                url: post.url,
                published: post.published || post.created_at
            },
            creator: {
                id: post.author?.id || 0,
                name: post.author?.name || 'Unknown',
                actor_id: post.author?.actor_id || `https://${instance}/u/unknown`
            },
            community: normalizedCommunity.community,
            counts: {
                score: post.score || 0,
                comments: post.comment_count || 0
            }
        }));

        renderCommunityPage(view, normalizedCommunity, normalizedPosts, actions, 'piefed');

    } catch (error) {
        console.error('Failed to load PieFed community:', error);
        
        // Fallback: Show a basic error message with suggestion
        view.innerHTML = `
            <div class="error-container">
                <h3>PieFed Community Not Accessible</h3>
                <p>This appears to be a PieFed instance, which uses different APIs than Lemmy.</p>
                <p><strong>Community:</strong> ${name}@${instance}</p>
                <p><strong>Suggestion:</strong> Visit <a href="https://${instance}/c/${name}" target="_blank">https://${instance}/c/${name}</a> directly in your browser.</p>
                <button onclick="window.history.back()" class="button-secondary">Go Back</button>
            </div>
        `;
    }
}

function renderCommunityPage(view, communityView, posts, actions, platform) {
    const community = communityView.community;

    let followButton = '';
    if (localStorage.getItem('lemmy_jwt') && platform === 'lemmy') {
        followButton = `<button class="button follow-btn ${communityView.subscribed === 'Subscribed' ? 'subscribed' : ''}">${communityView.subscribed === 'Subscribed' ? 'Following' : 'Follow'}</button>`;
    } else if (platform === 'piefed') {
        followButton = `<p class="piefed-notice">Follow functionality not available for PieFed communities</p>`;
    }
    
    const converter = new showdown.Converter();
    const fullDescription = community.description || '';
    const fullDescriptionHtml = converter.makeHtml(fullDescription);

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
    if (isTruncated) {
        const truncatedHtml = converter.makeHtml(truncatedDescription);
        descriptionBlock = `
            <div class="community-bio">
                <div class="bio-truncated">${truncatedHtml}</div>
                <div class="bio-full" style="max-height: 0px; overflow: hidden; transition: max-height 0.4s ease-out;">${fullDescriptionHtml}</div>
                <a href="#" class="read-more-bio" style="display: block; text-align: right; font-size: small; cursor: pointer; font-weight: bold; color: var(--accent-color);">read more</a>
            </div>
        `;
    } else {
        descriptionBlock = fullDescriptionHtml;
    }

    const platformBadge = platform === 'piefed' ? 
        `<span class="platform-badge piefed">PieFed</span>` : 
        `<span class="platform-badge lemmy">Lemmy</span>`;

    view.innerHTML = `
        <div class="profile-card lemmy-community-card">
            <div class="profile-header">
                <div class="banner" style="background-image: url('${community.banner || ''}'); background-color: var(--primary-color);"></div>
                <img class="avatar" src="${community.icon || './images/logo.png'}" alt="${community.name} avatar" onerror="this.onerror=null;this.src='./images/logo.png';">
            </div>
            <div class="profile-actions">
                ${followButton}
            </div>
            <div class="profile-info">
                <h2 class="display-name">${community.name} ${platformBadge}</h2>
                <div class="acct">${community.actor_id.split('/')[2]}</div>
                <div class="note">${descriptionBlock}</div>
                <div class="stats">
                    <span><strong>${communityView.counts.subscribers}</strong> Subscribers</span>
                    <span><strong>${communityView.counts.users_active_day}</strong> Active Today</span>
                </div>
            </div>
        </div>
        <div class="profile-feed"></div>
    `;
    
    const feedContainer = view.querySelector('.profile-feed');
    if (posts && posts.length > 0) {
        posts.forEach(postView => {
            // Create the card using renderLemmyCard
            const postCard = renderLemmyCard(postView, actions);
            
            // Override the double-click handler to pass the full postView
            const bodyContent = postCard.querySelector('.status-body-content');
            if (bodyContent) {
                // Remove the existing double-click listener
                const newBodyContent = bodyContent.cloneNode(true);
                bodyContent.parentNode.replaceChild(newBodyContent, bodyContent);
                
                // Add the corrected double-click listener
                newBodyContent.addEventListener('dblclick', () => {
                    if (platform === 'piefed') {
                        // For PieFed, just open in new tab
                        window.open(`https://${postView.community.actor_id.split('/')[2]}/post/${postView.post.id}`, '_blank');
                    } else {
                        actions.showLemmyPostDetail(postView);
                    }
                });
            }
            
            feedContainer.appendChild(postCard);
        });
    } else {
        feedContainer.innerHTML = '<p>No posts in this community yet.</p>';
    }

    // Handle read more functionality
    if (isTruncated) {
        const readMoreBtn = view.querySelector('.read-more-bio');
        const bioFull = view.querySelector('.bio-full');
        const bioTruncated = view.querySelector('.bio-truncated');
        
        if (readMoreBtn && bioFull && bioTruncated) {
            readMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isCollapsed = bioFull.style.maxHeight === '0px';

                if (isCollapsed) {
                    bioTruncated.style.display = 'none';
                    bioFull.style.maxHeight = bioFull.scrollHeight + 'px';
                    readMoreBtn.textContent = 'close';
                } else {
                    bioTruncated.style.display = 'block';
                    bioFull.style.maxHeight = '0px';
                    readMoreBtn.textContent = 'read more';
                }
            });
        }
    }

    // Handle follow button (only for Lemmy)
    const followBtn = view.querySelector('.follow-btn');
    if (followBtn && platform === 'lemmy') {
        followBtn.addEventListener('click', async () => {
            const isSubscribed = followBtn.classList.contains('subscribed');
            const success = await actions.lemmyFollowCommunity(community.id, !isSubscribed);
            if (success) {
                followBtn.classList.toggle('subscribed');
                followBtn.textContent = isSubscribed ? 'Follow' : 'Following';
            }
        });
    }
}
