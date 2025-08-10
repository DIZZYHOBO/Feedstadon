import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { timeAgo } from './utils.js';
import { showToast } from './ui.js';

// --- Helper Functions to Fetch Profile Data ---
async function getMastodonProfile(state, accountId) {
    try {
        const [account, statuses] = await Promise.all([
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`),
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses`)
        ]);
        return { account: account.data, statuses: statuses.data };
    } catch (error) {
        console.error("Failed to fetch Mastodon profile:", error);
        return null;
    }
}

async function getLemmyProfile(userAcct) {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) return null;
    try {
        const [name] = userAcct.split('@');
        // Fetch user details, posts, and comments in parallel
        const response = await apiFetch(lemmyInstance, null, `/api/v3/user?username=${name}&sort=New&limit=50`, {}, 'lemmy');
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch Lemmy profile for ${userAcct}:`, error);
        return null;
    }
}

function renderLemmyComment(commentView, state, actions) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'status lemmy-comment-on-profile';
    const converter = new showdown.Converter();
    const htmlContent = converter.makeHtml(commentView.comment.content);

    commentDiv.innerHTML = `
        <div class="status-body-content">
            <div class="comment-context">
                <span>Commented on:</span>
                <a href="#" class="post-title">${commentView.post.name}</a>
                <span>in</span>
                <a href="#" class="community-link">${commentView.community.name}</a>
            </div>
            <div class="status-content">${htmlContent}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn" data-action="upvote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${commentView.counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action view-replies-btn">
                    ${ICONS.comments}
                    <span class="reply-count">${commentView.counts.child_count}</span>
                </button>
            </div>
            <div class="lemmy-replies-container" style="display: none;"></div>
        </div>
    `;

    commentDiv.addEventListener('dblclick', () => {
        actions.showLemmyPostDetail(commentView.post);
    });

    const repliesContainer = commentDiv.querySelector('.lemmy-replies-container');
    const viewRepliesBtn = commentDiv.querySelector('.view-replies-btn');

    // Pass both the comment ID and the post ID to the toggle function
    viewRepliesBtn.addEventListener('click', () => {
        toggleLemmyReplies(commentView.comment.id, commentView.post.id, repliesContainer, state, actions);
    });

    return commentDiv;
}

async function toggleLemmyReplies(commentId, postId, container, state, actions) {
    const isVisible = container.style.display === 'block';
    if (isVisible) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = 'Loading replies...';

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        container.innerHTML = 'Could not load replies.';
        return;
    }

    try {
        // --- The Definitive Root-Cause Fix ---
        // 1. Fetch ALL comments for the entire post using the post_id.
        //    This gives us the complete, raw data for the whole conversation.
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&max_depth=8&sort=New`, { method: 'GET' }, 'lemmy');
        
        const allCommentsFlat = response?.data?.comments;

        if (!Array.isArray(allCommentsFlat)) {
            console.error("Could not retrieve a valid comment list for the post.", response.data);
            container.innerHTML = 'Failed to load conversation.';
            return;
        }

        // 2. Build the comment tree on the client-side to ensure accuracy.
        const commentsById = new Map(allCommentsFlat.map(c => [c.comment.id, c]));
        const commentTree = [];

        allCommentsFlat.forEach(c => {
            // Initialize a replies array for every comment
            c.replies = []; 
            if (c.comment.path.split('.').length > 1) {
                const parentId = c.comment.path.split('.').slice(-2, -1)[0];
                const parent = commentsById.get(parseInt(parentId));
                if (parent) {
                    // This is a nested array, but it's for our own tree structure
                    if (!parent.replies) {
                        parent.replies = [];
                    }
                    parent.replies.push(c);
                } else {
                    // It's a top-level comment
                    commentTree.push(c);
                }
            } else {
                // It's a top-level comment
                commentTree.push(c);
            }
        });

        // 3. Find the specific comment the user clicked on within our newly built tree.
        const targetCommentView = commentsById.get(commentId);
        const replies = targetCommentView ? targetCommentView.replies : [];
        
        container.innerHTML = '';

        // 4. Render the replies, which are now guaranteed to be correct.
        if (replies.length > 0) {
            replies.forEach(replyView => {
                if (replyView) {
                    container.appendChild(renderLemmyComment(replyView, state, actions));
                }
            });
        } else {
            container.innerHTML = 'No replies found.';
        }
    } catch (error) {
        console.error('Failed to fetch and process replies:', error);
        container.innerHTML = 'Failed to load replies.';
    }
}

export async function loadMoreLemmyProfile(state, actions) {
    if (state.isLoadingMore || !state.lemmyProfileHasMore) return;
    state.isLoadingMore = true;
    state.scrollLoader.style.display = 'block';

    state.lemmyProfilePage++;
    const lemmyProfile = await getLemmyProfile(state.currentProfileUserAcct);
    const content = await fetchLemmyProfileContent(state, actions, lemmyProfile.person_view.person.id, state.lemmyProfilePage);
    
    const profileFeed = document.getElementById('lemmy-profile-feed');

    if (content.comments.length > 0) {
        content.comments.forEach(comment => {
            profileFeed.appendChild(renderLemmyComment(comment, state, actions));
        });
    } else {
        state.lemmyProfileHasMore = false;
    }

    state.isLoadingMore = false;
    state.scrollLoader.style.display = 'none';
}


// --- Main Page Rendering ---
export async function renderProfilePage(state, actions, platform, accountId, userAcct) {
    const view = document.getElementById('profile-page-view');
    view.innerHTML = `
        <div class="profile-page-header">
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="" alt="Profile banner">
                    <img class="avatar" src="" alt="Profile avatar">
                </div>
                <div class="profile-info">
                    <h2 class="display-name">Loading...</h2>
                    <p class="acct"></p>
                    <div class="note"></div>
                    <div class="stats"></div>
                </div>
            </div>
            <div class="profile-tabs">
                <button class="tab-button" data-tab="lemmy">Lemmy</button>
                <button class="tab-button" data-tab="mastodon">Mastodon</button>
            </div>
            <div id="lemmy-profile-controls" style="display: none;">
                <select id="lemmy-content-filter">
                    <option value="posts">Posts</option>
                    <option value="comments">Comments</option>
                </select>
            </div>
        </div>
        <div class="profile-feed-content"></div>
    `;

    const bannerImg = view.querySelector('.banner');
    const avatarImg = view.querySelector('.avatar');
    const displayNameEl = view.querySelector('.display-name');
    const acctEl = view.querySelector('.acct');
    const noteEl = view.querySelector('.note');
    const statsEl = view.querySelector('.stats');
    const feedContainer = view.querySelector('.profile-feed-content');
    const lemmyControls = view.querySelector('#lemmy-profile-controls');
    const lemmyFilter = view.querySelector('#lemmy-content-filter');

    let currentLemmyProfile = null;

    const renderLemmyFeed = (filter) => {
        feedContainer.innerHTML = '';
        if (!currentLemmyProfile) return;

        if (filter === 'comments') {
            if (currentLemmyProfile.comments && currentLemmyProfile.comments.length > 0) {
                currentLemmyProfile.comments.forEach(comment => {
                    feedContainer.appendChild(renderLemmyComment(comment, state, actions));
                });
            } else {
                feedContainer.innerHTML = '<p class="empty-feed-message">No comments to display.</p>';
            }
        } else if (filter === 'posts') {
            if (currentLemmyProfile.posts && currentLemmyProfile.posts.length > 0) {
                currentLemmyProfile.posts.forEach(post => {
                    feedContainer.appendChild(renderLemmyCard(post, actions));
                });
            } else {
                feedContainer.innerHTML = '<p class="empty-feed-message">No posts to display.</p>';
            }
        }
    };

    lemmyFilter.addEventListener('change', (e) => {
        renderLemmyFeed(e.target.value);
    });

    const switchTab = async (targetTab) => {
        view.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        view.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
        feedContainer.innerHTML = 'Loading feed...';
        lemmyControls.style.display = 'none';

        if (targetTab === 'mastodon') {
            const mastodonProfile = await getMastodonProfile(state, accountId);
            if (mastodonProfile) {
                const account = mastodonProfile.account;
                bannerImg.src = account.header_static || '';
                avatarImg.src = account.avatar_static || '';
                displayNameEl.textContent = account.display_name;
                acctEl.textContent = `@${account.acct}`;
                noteEl.innerHTML = account.note;
                statsEl.innerHTML = `<span><strong>${account.followers_count}</strong> Followers</span><span><strong>${account.following_count}</strong> Following</span>`;

                feedContainer.innerHTML = '';
                mastodonProfile.statuses.forEach(status => {
                    feedContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
                });
            } else {
                feedContainer.innerHTML = '<p>Could not load Mastodon feed.</p>';
            }
        } else if (targetTab === 'lemmy') {
            currentLemmyProfile = await getLemmyProfile(userAcct);
            if (currentLemmyProfile) {
                const person = currentLemmyProfile.person_view.person;
                const counts = currentLemmyProfile.person_view.counts;
                
                bannerImg.src = person.banner || '';
                avatarImg.src = person.avatar || '';
                displayNameEl.textContent = person.display_name || person.name;
                acctEl.textContent = `@${person.name}@${new URL(person.actor_id).hostname}`;
                noteEl.innerHTML = new showdown.Converter().makeHtml(person.bio || '');
                statsEl.innerHTML = `<span><strong>${counts.post_count}</strong> Posts</span><span><strong>${counts.comment_count}</strong> Comments</span>`;

                lemmyControls.style.display = 'flex';
                lemmyFilter.value = 'posts'; // Default to posts
                renderLemmyFeed('posts');
            } else {
                feedContainer.innerHTML = '<p>Could not load Lemmy feed.</p>';
            }
        }
    };

    view.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    // Set initial state based on the entry platform
    if (platform === 'mastodon') {
        await switchTab('mastodon');
    } else {
        await switchTab('lemmy');
    }
}

export function renderEditProfilePage(state, actions) {
    const view = document.getElementById('edit-profile-view');
    view.innerHTML = `
        <div class="edit-profile-container">
            <h2>Edit Profile</h2>
            <p>This feature is not yet implemented.</p>
        </div>
    `;
}
