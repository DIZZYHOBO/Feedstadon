import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { ICONS } from './icons.js';

export async function renderLemmyCommunityPage(state, actions, communityName) {
    const view = document.getElementById('lemmy-community-view');
    view.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;

    try {
        const [name, instance] = communityName.split('@');
        const lemmyInstance = instance || localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) throw new Error("Lemmy instance not found.");

        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/community', {}, 'lemmy', { name: name });
        const communityView = data.community_view;
        const postsResponse = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', { community_name: name, sort: 'New' });
        const posts = postsResponse.data.posts;

        const community = communityView.community;

        let followButton = '';
        if (localStorage.getItem('lemmy_jwt')) {
            followButton = `<button class="button follow-btn ${communityView.subscribed === 'Subscribed' ? 'subscribed' : ''}">${communityView.subscribed === 'Subscribed' ? 'Following' : 'Follow'}</button>`;
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
                    <h2 class="display-name">${community.name}</h2>
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
                
                // CRITICAL FIX: Override the double-click handler to pass the full postView
                const bodyContent = postCard.querySelector('.status-body-content');
                if (bodyContent) {
                    // Remove the existing double-click listener
                    const newBodyContent = bodyContent.cloneNode(true);
                    bodyContent.parentNode.replaceChild(newBodyContent, bodyContent);
                    
                    // Add the corrected double-click listener
                    newBodyContent.addEventListener('dblclick', () => {
                        actions.showLemmyPostDetail(postView); // Pass the full postView, not just post
                    });
                }
                
                feedContainer.appendChild(postCard);
            });
        } else {
            feedContainer.innerHTML = '<p>No posts in this community yet.</p>';
        }

        if (isTruncated) {
            const readMoreBtn = view.querySelector('.read-more-bio');
            const bioFull = view.querySelector('.bio-full');
            const bioTruncated = view.querySelector('.bio-truncated');
            
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

        const followBtn = view.querySelector('.follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', async () => {
                const isSubscribed = followBtn.classList.contains('subscribed');
                const success = await actions.lemmyFollowCommunity(community.id, !isSubscribed);
                if (success) {
                    followBtn.classList.toggle('subscribed');
                    followBtn.textContent = isSubscribed ? 'Follow' : 'Following';
                }
            });
        }

    } catch (error) {
        console.error("Failed to load Lemmy community:", error);
        view.innerHTML = `<p>Could not load community. ${error.message}</p>`;
    }
}
