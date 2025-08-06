import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { ICONS } from './icons.js';

async function renderMastodonProfile(state, actions, container, accountId) {
    container.innerHTML = `<p>Loading Mastodon profile...</p>`;

    try {
        const idToFetch = accountId || state.currentUser?.id;
        if (!idToFetch) {
            container.innerHTML = `<p>Could not find Mastodon user ID.</p>`;
            return;
        }
        
        const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${idToFetch}`);
        const { data: statuses } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${idToFetch}/statuses`);

        const banner = account.header_static || '';
        const displayName = account.display_name;
        const username = account.username;
        const avatar = account.avatar_static;
        const note = account.note;
        const followers = account.followers_count;
        const following = account.following_count;

        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="${banner}" alt="${displayName}'s banner" onerror="this.style.display='none'">
                    <img class="avatar" src="${avatar}" alt="${displayName}'s avatar" onerror="this.src='./images/logo.png'">
                </div>
                <div class="profile-actions">
                    <button class="follow-btn">Follow</button>
                    <button class="block-btn">Block</button>
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${displayName}</h2>
                    <p class="acct">@${username}</p>
                    <div class="note">${note}</div>
                    <div class="stats">
                        <span><strong>${following}</strong> Following</span>
                        <span><strong>${followers}</strong> Followers</span>
                    </div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;

        const feed = container.querySelector('.profile-feed');
        if (statuses.length === 0) {
            feed.innerHTML = '<p>No posts yet.</p>';
        } else {
            statuses.forEach(status => {
                feed.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
        }

    } catch (error) {
        container.innerHTML = `<p>Error loading Mastodon profile: ${error.message}</p>`;
    }
}

async function renderLemmyProfile(state, actions, container, userAcct) {
    container.innerHTML = `<p>Loading Lemmy profile...</p>`;
    
    let username, instance;
    if (userAcct) {
        [username, instance] = userAcct.split('@');
    } else {
        username = localStorage.getItem('lemmy_username');
        instance = localStorage.getItem('lemmy_instance');
    }
    
    if (!username || !instance) {
        container.innerHTML = `<p>Not logged into Lemmy.</p>`;
        return;
    }

    try {
        const { data: userData } = await apiFetch(instance, null, `/api/v3/user?username=${username}`, {}, 'lemmy');
        const { person_view, posts, comments } = userData;

        const combinedFeed = [
            ...posts.map(p => ({ ...p, type: 'post', date: p.post.published })),
            ...comments.map(c => ({ ...c, type: 'comment', date: c.comment.published }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = `
            <div class="profile-card">
                 <div class="profile-header">
                    <img class="banner" src="${person_view.person.banner || ''}" alt="${person_view.person.display_name || person_view.person.name}'s banner" onerror="this.style.display='none'">
                    <img class="avatar" src="${person_view.person.avatar || './images/logo.png'}" alt="${person_view.person.display_name || person_view.person.name}'s avatar" onerror="this.src='./images/logo.png'">
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${person_view.person.display_name || person_view.person.name}</h2>
                    <p class="acct">@${person_view.person.name}@${instance}</p>
                    <div class="note">${person_view.person.bio || ''}</div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;
        
        const feed = container.querySelector('.profile-feed');
        if (combinedFeed.length === 0) {
            feed.innerHTML = '<p>No activity yet.</p>';
            return;
        }

        combinedFeed.forEach(item => {
            if (item.type === 'post') {
                feed.appendChild(renderLemmyCard(item, actions));
            } else {
                const commentCard = document.createElement('div');
                commentCard.className = 'status lemmy-comment-on-profile';
                commentCard.addEventListener('click', () => actions.showLemmyPostDetail(item));

                commentCard.innerHTML = `
                    <div class="status-body-content">
                        <div class="comment-context">
                            <span class="display-name">${item.creator.name}</span> commented on:
                        </div>
                        <h4 class="post-title">${item.post.name}</h4>
                        <div class="status-content">${item.comment.content}</div>
                        <div class="status-footer">
                            <div class="lemmy-vote-cluster">
                                <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                                <span class="lemmy-score">${item.counts.score}</span>
                                <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                            </div>
                        </div>
                    </div>`;
                
                commentCard.querySelectorAll('.lemmy-vote-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const score = parseInt(e.currentTarget.dataset.score, 10);
                        actions.lemmyCommentVote(item.comment.id, score, commentCard);
                    });
                });

                feed.appendChild(commentCard);
            }
        });

    } catch (error) {
        console.error("Failed to load Lemmy profile:", error);
        container.innerHTML = `<p>Error loading Lemmy profile: ${error.message}</p>`;
    }
}

export function renderProfilePage(state, actions, platform, accountId, userAcct) {
    const view = document.getElementById('profile-page-view');
    const tabs = view.querySelectorAll('.profile-tabs .tab-button');
    const mastodonContent = view.querySelector('#mastodon-profile-content');
    const lemmyContent = view.querySelector('#lemmy-profile-content');
    
    function switchTab(targetPlatform) {
        tabs.forEach(t => t.classList.remove('active'));
        mastodonContent.classList.remove('active');
        lemmyContent.classList.remove('active');
        
        const activeTab = view.querySelector(`.tab-button[data-profile-tab="${targetPlatform}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        if (targetPlatform === 'mastodon') {
            mastodonContent.classList.add('active');
            if (state.currentUser) {
                renderMastodonProfile(state, actions, mastodonContent, accountId);
            } else {
                mastodonContent.innerHTML = `<p>Not logged into Mastodon.</p>`;
            }
        } else if (targetPlatform === 'lemmy') {
            lemmyContent.classList.add('active');
            renderLemmyProfile(state, actions, lemmyContent, userAcct);
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetPlatform = e.target.dataset.profileTab;
            switchTab(targetPlatform);
        });
    });

    // Set initial tab
    switchTab(platform);
}
