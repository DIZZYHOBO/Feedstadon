import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { ICONS } from './icons.js';
import showdown from 'showdown';

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
        let descriptionBlock = '';

        if (words.length > 30) {
            truncatedDescription = words.slice(0, 30).join(' ') + '...';
            isTruncated = true;
        } else if (firstPeriodIndex !== -1 && firstPeriodIndex < fullDescription.length - 1) {
            truncatedDescription = fullDescription.substring(0, firstPeriodIndex + 1);
            isTruncated = true;
        }

        if (isTruncated) {
            const truncatedHtml = converter.makeHtml(truncatedDescription);
            descriptionBlock = `
                <div class="community-bio">
                    <div class="bio-content">${truncatedHtml}</div>
                    <a href="#" class="read-more-bio">read more</a>
                </div>
            `;
        } else {
            descriptionBlock = `<div class="community-bio">${fullDescriptionHtml}</div>`;
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
            posts.forEach(post => {
                feedContainer.appendChild(renderLemmyCard(post, actions));
            });
        } else {
            feedContainer.innerHTML = '<p>No posts in this community yet.</p>';
        }

        if (isTruncated) {
            const readMoreBtn = view.querySelector('.read-more-bio');
            const bioContent = view.querySelector('.bio-content');
            const bioContainer = view.querySelector('.community-bio');
            let isExpanded = false;

            const truncatedHtml = converter.makeHtml(truncatedDescription);

            readMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                isExpanded = !isExpanded;
                bioContainer.style.maxHeight = 'none'; // Allow container to resize

                if (isExpanded) {
                    bioContent.innerHTML = fullDescriptionHtml;
                    readMoreBtn.textContent = 'close';
                    // Animate the expansion
                    const initialHeight = bioContent.clientHeight;
                    bioContent.style.maxHeight = '0px';
                    bioContent.style.overflow = 'hidden';
                    bioContent.style.transition = 'max-height 0.4s ease-in-out';
                    
                    // Use a timeout to allow the DOM to update before animating
                    setTimeout(() => {
                        bioContent.style.maxHeight = initialHeight + 'px';
                    }, 0);

                } else {
                    bioContent.innerHTML = truncatedHtml;
                    readMoreBtn.textContent = 'read more';
                     bioContent.style.maxHeight = '100%'; // Reset to default
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
                    // Optimistically update subscriber count
                    const subscriberCountEl = view.querySelector('.stats span:first-child strong');
                    let currentCount = parseInt(subscriberCountEl.textContent);
                    subscriberCountEl.textContent = isSubscribed ? currentCount - 1 : currentCount + 1;
                }
            });
        }

    } catch (error) {
        console.error("Failed to load Lemmy community:", error);
        view.innerHTML = `<p>Could not load community. ${error.message}</p>`;
    }
}
