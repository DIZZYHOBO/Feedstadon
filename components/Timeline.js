import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';

export function renderLoginPrompt(container, platform, onLoginSuccess, onSecondarySuccess) {
    container.innerHTML = '';
    const template = document.getElementById('login-prompt-template');
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);
    
    const mastodonSection = container.querySelector('#mastodon-login-section');
    const lemmySection = container.querySelector('#lemmy-login-section');

    if (platform === 'mastodon') {
        lemmySection.style.display = 'none';
        container.querySelector('.mastodon-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = e.target.querySelector('.instance-url').value;
            const token = e.target.querySelector('.access-token').value;
            onLoginSuccess(instance, token);
        });
    } else if (platform === 'lemmy') {
        mastodonSection.style.display = 'none';
        container.querySelector('.lemmy-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const instance = e.target.querySelector('.lemmy-instance-input').value;
            const username = e.target.querySelector('.lemmy-username-input').value;
            const password = e.target.querySelector('.lemmy-password-input').value;
            onSecondarySuccess(instance, username, password);
        });
    }
}

export async function fetchTimeline(state, actions, loadMore = false, onLoginSuccess) {
    if (!state.accessToken && !localStorage.getItem('lemmy_jwt')) {
        renderLoginPrompt(state.timelineDiv, 'mastodon', onLoginSuccess);
        return;
    }
    
    if (state.isLoadingMore) return;
    
    if (!loadMore) {
        window.scrollTo(0, 0);
        state.timelineDiv.innerHTML = '';
    }
    
    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');
    
    try {
        let allPosts = [];

        // Fetch Mastodon posts
        const mastodonPromise = state.accessToken 
            ? apiFetch(state.instanceUrl, state.accessToken, '/api/v1/timelines/home')
            : Promise.resolve({ data: [] });

        // Fetch Lemmy posts for merged feed
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const lemmyPromise = lemmyInstance 
            ? apiFetch(lemmyInstance, null, '/api/v3/post/list', { type_: 'Subscribed' }, 'lemmy')
            : Promise.resolve({ data: { posts: [] } });

        const [mastodonResponse, lemmyResponse] = await Promise.all([mastodonPromise, lemmyPromise]);
        
        const mastodonPosts = mastodonResponse.data.map(p => ({ ...p, platform: 'mastodon', date: p.created_at }));
        const lemmyPosts = (lemmyResponse.data.posts || []).map(p => ({ ...p, platform: 'lemmy', date: p.post.published }));

        allPosts = [...mastodonPosts, ...lemmyPosts].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allPosts.length > 0) {
            allPosts.forEach(post => {
                let postCard;
                if (post.platform === 'mastodon') {
                    postCard = renderStatus(post, state.currentUser, actions, state.settings);
                } else {
                    postCard = renderLemmyCard(post, actions);
                }
                state.timelineDiv.appendChild(postCard);
            });
        } else {
            state.timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
        }

    } catch (error) {
        console.error('Failed to fetch timeline:', error);
        state.timelineDiv.innerHTML = `<p>Error loading feed. ${error.message}</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
    }
}
