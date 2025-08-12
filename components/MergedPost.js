import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { renderLemmyComment } from './LemmyPost.js'; // Corrected import path
import { renderStatus } from './Post.js';
import { timeAgo } from './utils.js';
import { renderLoginPrompt } from './ui.js';

/**
 * Fetches, merges, and renders a timeline of subscribed posts from both Lemmy and Mastodon.
 * @param {object} state - The application's current state object.
 * @param {object} actions - The available user actions.
 * @param {boolean} loadMore - Flag to indicate if we are loading more posts.
 * @param {function} onLoginSuccess - Callback after a successful login.
 */
export async function fetchMergedTimeline(state, actions, loadMore = false, onLoginSuccess) {
    if ((!localStorage.getItem('lemmy_jwt') || !localStorage.getItem('mastodon_token')) && !loadMore) {
        renderLoginPrompt(state.timelineDiv, 'lemmy', onLoginSuccess);
        renderLoginPrompt(state.timelineDiv, 'mastodon', onLoginSuccess);
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
        let allPosts = [];

        // --- MERGED FEED LOGIC ---
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const mastodonInstance = localStorage.getItem('mastodon_instance');
        const mastodonToken = localStorage.getItem('mastodon_token');

        const lemmyParams = {
            sort: 'Hot', // or state.currentSort if you have one for merged
            page: loadMore ? state.lemmyPage + 1 : 1,
            limit: 20,
            type_: 'Subscribed'
        };

        const mastodonParams = {};
        if (loadMore && state.mastodonNextMaxId) {
            mastodonParams.max_id = state.mastodonNextMaxId;
        }
        
        // Fetch both feeds in parallel
        const [lemmyResponse, mastodonResponse] = await Promise.all([
            lemmyInstance && localStorage.getItem('lemmy_jwt') ? apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', lemmyParams) : Promise.resolve({ data: { posts: [] } }),
            mastodonInstance && mastodonToken ? apiFetch(mastodonInstance, mastodonToken, '/api/v1/timelines/home', {}, 'mastodon', mastodonParams) : Promise.resolve({ data: [] })
        ]);

        const lemmyPosts = (lemmyResponse.data.posts || []).map(p => ({ ...p, platform: 'lemmy' }));
        const mastodonPosts = (mastodonResponse.data || []).map(p => ({ ...p, platform: 'mastodon' }));
        
        allPosts = [...lemmyPosts, ...mastodonPosts];
        
        // Sort all posts by creation date
        allPosts.sort((a, b) => {
            const dateA = new Date(a.platform === 'lemmy' ? a.post.published : a.created_at);
            const dateB = new Date(b.platform === 'lemmy' ? b.post.published : b.created_at);
            return dateB - dateA;
        });

        // --- RENDER ALL POSTS ---
        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        if (allPosts.length > 0) {
            if (loadMore) {
                state.lemmyPage++; // You might want separate pagination logic
            } else {
                state.lemmyPage = 1;
            }
            
            allPosts.forEach(post => {
                let postCard;
                if (post.platform === 'lemmy') {
                    postCard = renderLemmyCard(post, actions);
                } else {
                    postCard = renderStatus(post, actions);
                }
                state.timelineDiv.appendChild(postCard);
            });
            state.hasMore = allPosts.length > 0;
        } else {
            if (!loadMore) {
                state.timelineDiv.innerHTML = '<p>Nothing to see in your merged feed.</p>';
            }
            state.hasMore = false;
        }

        if (!state.hasMore) {
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
             state.scrollLoader.innerHTML = '';
        }

    } catch (error) {
        console.error('Failed to fetch merged feed:', error);
        actions.showToast(`Could not load feed: ${error.message}`);
        state.timelineDiv.innerHTML = `<p>Error loading feed.</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
        else document.getElementById('refresh-btn').classList.remove('loading');
    }
}


export async function renderMergedPostPage(state, post, actions) {
    const view = document.getElementById('merged-post-view');
    view.innerHTML = `
        <div class="merged-post-container">
            <div class="main-post-area"></div>
            <div class="comments-area">
                <h3>Comments</h3>
                <div class="comments-tabs">
                    <button class="tab-button active" data-platform="lemmy">Lemmy</button>
                    <button class="tab-button" data-platform="mastodon">Mastodon</button>
                </div>
                <div id="lemmy-comments" class="comments-feed"></div>
                <div id="mastodon-comments" class="comments-feed" style="display:none;"></div>
            </div>
        </div>
    `;

    const mainPostArea = view.querySelector('.main-post-area');
    const lemmyCommentsContainer = view.querySelector('#lemmy-comments');
    const mastodonCommentsContainer = view.querySelector('#mastodon-comments');

    // This logic needs to be more robust to handle both post types
    if (post.platform === 'lemmy') {
        const lemmyCard = renderLemmyCard(post, actions);
        mainPostArea.appendChild(lemmyCard);

        // Fetch and render Lemmy comments
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        try {
            const lemmyComments = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${post.post.id}&sort=New`, {}, 'lemmy');
            lemmyCommentsContainer.innerHTML = '';
            lemmyComments.data.comments.forEach(comment => {
                lemmyCommentsContainer.appendChild(renderLemmyComment(comment, state, actions, post.creator.id));
            });
        } catch (err) {
            lemmyCommentsContainer.innerHTML = 'Could not load Lemmy comments.';
        }
        mastodonCommentsContainer.innerHTML = 'Mastodon comments not applicable for this post.';

    } else if (post.platform === 'mastodon') {
        const mastodonCard = renderStatus(post, actions);
        mainPostArea.appendChild(mastodonCard);
        // Fetch and render Mastodon comments (replies)
        // You would need to implement this part
        mastodonCommentsContainer.innerHTML = 'Loading Mastodon comments...';
        lemmyCommentsContainer.innerHTML = 'Lemmy comments not applicable for this post.';
    }
    
    // Tab switching logic
    view.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const platform = button.dataset.platform;
            view.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (platform === 'lemmy') {
                lemmyCommentsContainer.style.display = 'block';
                mastodonCommentsContainer.style.display = 'none';
            } else {
                lemmyCommentsContainer.style.display = 'none';
                mastodonCommentsContainer.style.display = 'block';
            }
        });
    });
}
