import { ICONS } from './icons.js';
import { formatTimestamp, timeAgo, getWordFilter, shouldFilterContent, processSpoilers } from './utils.js';
import { showToast, renderLoginPrompt, showImageModal } from './ui.js';
import { apiFetch } from './api.js';

export function renderLemmyCard(post, actions) {
    const filterList = getWordFilter();
    const combinedContent = `${post.post.name} ${post.post.body || ''}`;
    if (shouldFilterContent(combinedContent, filterList)) {
        return document.createDocumentFragment(); // Return an empty element to hide the post
    }
    
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.post.id;

    let mediaHTML = '';
    const url = post.post.url;
    if (url) {
        // YouTube embed logic
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
        } else if (post.post.thumbnail_url) {
            mediaHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy" onerror="this.onerror=null;this.style.display='none';"></div>`;
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

    card.innerHTML = `
        ${crosspostTag}
        <div class="status-body-content">
            <div class="status-header">
                <a href="#" class="status-header-main" data-action="view-community">
                    <img src="${post.community.icon || './images/php.png'}" alt="${post.community.name} icon" class="avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                    <div>
                        <span class="display-name">${post.community.name}</span>
                        <span class="acct">posted by <span class="creator-link" data-action="view-creator">${post.creator.name}</span> · ${timeAgo(post.post.published)}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                </div>
            </div>
            <div class="status-content">
                <h3 class="lemmy-title">${post.post.name}</h3>
                ${mediaHTML}
                <div class="lemmy-post-body">${bodyHTML}</div>
            </div>
        </div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${post.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${post.counts.score}</span>
                <button class="status-action lemmy-vote-btn ${post.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="view-post">${ICONS.comments} ${post.counts.comments}</button>
            <button class="status-action ${post.saved ? 'active' : ''}" data-action="save">${ICONS.bookmark}</button>
             <button class="status-action more-options-btn" title="More">${ICONS.more}</button>
        </div>
    `;
    
    if (wordCount > 30) {
        const bodyContainer = card.querySelector('.lemmy-post-body');
        const readMoreLink = bodyContainer.querySelector('.read-more-link');
        readMoreLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            bodyContainer.innerHTML = fullBodyHtml;
        });
    }

    const mediaImg = card.querySelector('.status-media img');
    if (mediaImg) {
        mediaImg.style.cursor = 'pointer';
        mediaImg.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageModal(post.post.url || mediaImg.src);
        });
    }
    
    card.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) return;
         if (post.cross_post) {
            actions.showMergedPost(post);
        } else {
            actions.showLemmyPostDetail(post);
        }
    });

    card.querySelector('[data-action="view-community"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunity(post.community.name);
    });
    
    card.querySelector('[data-action="view-creator"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyProfile(post.creator.id, post.creator.name);
    });
    
    card.querySelectorAll('.status-footer .status-action').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote':
                case 'downvote':
                    const score = parseInt(e.currentTarget.dataset.score, 10);
                    actions.lemmyVote(post.post.id, score, card);
                    break;
                case 'save':
                    actions.lemmySave(post.post.id, e.currentTarget);
                    break;
                case 'view-post':
                    if (post.cross_post) {
                        actions.showMergedPost(post);
                    } else {
                        actions.showLemmyPostDetail(post);
                    }
                    break;
            }
        });
    });

    return card;
}

export async function fetchLemmyFeed(state, actions, loadMore = false, onLemmySuccess) {
    if (!localStorage.getItem('lemmy_auth_token') && !loadMore && state.currentLemmyFeed === 'Subscribed') {
        renderLoginPrompt(state.timelineDiv, 'lemmy', onLemmySuccess);
        return;
    }

    if (state.isLoadingMore) return;
    state.isLoadingMore = true;

    if (loadMore) {
        state.scrollLoader.classList.add('loading');
    } else {
        window.scrollTo(0, 0);
        document.getElementById('refresh-btn').classList.add('loading');
        
        // Set default feed and sort types if not already set
        state.currentLemmyFeed = state.currentLemmyFeed || 'Subscribed';
        state.currentLemmySort = state.currentLemmySort || 'Hot';
        state.lemmyPage = 1;

        state.timelineDiv.innerHTML = `
            <div class="lemmy-header">
                <div class="lemmy-feed-tabs">
                    <button class="tab-button" data-feed="Subscribed">Subscribed</button>
                    <button class="tab-button" data-feed="All">All</button>
                    <button class="tab-button" data-feed="Local">Local</button>
                </div>
                <div class="custom-dropdown">
                    <button class="dropdown-toggle">
                        <span class="dropdown-label">Hot</span>
                        <span class="icon">${ICONS.lemmyDownvote}</span>
                    </button>
                    <div class="dropdown-menu" style="display: none;">
                        <a href="#" data-value="Hot">Hot</a>
                        <a href="#" data-value="New">New</a>
                        <a href="#" data-value="TopDay">Top Day</a>
                        <a href="#" data-value="TopWeek">Top Week</a>
                        <a href="#" data-value="TopMonth">Top Month</a>
                        <a href="#" data-value="TopYear">Top Year</a>
                        <a href="#" data-value="TopAll">Top All</a>
                    </div>
                </div>
            </div>
            <div id="lemmy-feed-container" class="feed-container"></div>
        `;

        const feedContainer = state.timelineDiv.querySelector('#lemmy-feed-container');
        const feedTabs = state.timelineDiv.querySelectorAll('.lemmy-feed-tabs .tab-button');
        const dropdown = state.timelineDiv.querySelector('.custom-dropdown');
        const toggleBtn = dropdown.querySelector('.dropdown-toggle');
        const dropdownLabel = dropdown.querySelector('.dropdown-label');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');

        function updateActiveUI() {
            feedTabs.forEach(t => t.classList.remove('active'));
            state.timelineDiv.querySelector(`.tab-button[data-feed="${state.currentLemmyFeed}"]`).classList.add('active');
            const currentSortOption = dropdownMenu.querySelector(`a[data-value="${state.currentLemmySort}"]`);
            dropdownLabel.textContent = currentSortOption ? currentSortOption.textContent : state.currentLemmySort;
        }

        feedTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                state.currentLemmyFeed = tab.dataset.feed;
                updateActiveUI();
                fetchLemmyFeed(state, actions, false); // Trigger a reload
            });
        });

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });

        dropdownMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                state.currentLemmySort = e.target.dataset.value;
                dropdownMenu.style.display = 'none';
                updateActiveUI();
                fetchLemmyFeed(state, actions, false); // Trigger a reload
            });
        });
        
        updateActiveUI();
    }

    const feedContainer = state.timelineDiv.querySelector('#lemmy-feed-container');

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) throw new Error("Lemmy instance not found. Please log in.");

        const params = {
            sort: state.currentLemmySort,
            page: loadMore ? state.lemmyPage + 1 : 1,
            limit: 20,
            type_: state.currentLemmyFeed
        };
        
        const response = await apiFetch(lemmyInstance, state.lemmyAuthToken, '/api/v3/post/list', { params }, 'lemmy');
        const posts = response.data.posts;

        if (!loadMore) {
            feedContainer.innerHTML = '';
        }

        if (posts && posts.length > 0) {
            if (loadMore) {
                state.lemmyPage++;
            } else {
                state.lemmyPage = 1;
            }
            posts.forEach(post_view => {
                feedContainer.appendChild(renderLemmyCard(post_view, actions));
            });
            state.lemmyHasMore = true;
        } else {
            if (!loadMore) {
                feedContainer.innerHTML = '<p>Nothing to see here.</p>';
            }
            state.lemmyHasMore = false;
        }

        if (!state.lemmyHasMore) {
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
            state.scrollLoader.innerHTML = '';
        }

    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        showToast(`Could not load Lemmy feed: ${error.message}`);
        if (!loadMore) {
            feedContainer.innerHTML = `<p>Error loading feed.</p>`;
        }
    } finally {
        state.isLoadingMore = false;
        if (loadMore) {
            state.scrollLoader.classList.remove('loading');
        } else {
            document.getElementById('refresh-btn').classList.remove('loading');
        }
    }
}
