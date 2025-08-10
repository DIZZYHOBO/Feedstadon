import { ICONS } from './icons.js';
import { formatTimestamp, timeAgo, getWordFilter, shouldFilterContent, processSpoilers } from './utils.js';
import { showToast, renderLoginPrompt, showImageModal } from './ui.js';
import { apiFetch } from './api.js';

export function renderLemmyCard(post, actions, settings) {
    if (settings && settings.hideNsfw && post.post.nsfw) {
        return document.createDocumentFragment();
    }
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
            mediaHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
        }
    }
    
    let crosspostTag = '';
    if (post.cross_post) {
        crosspostTag = `<div class="crosspost-tag">Merged</div>`;
    }

    let optionsMenuHTML = `
        <div class="post-options-container">
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="block-community" data-community-id="${post.community.id}">Block Community</button>
            </div>
        </div>
    `;

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
                        <span class="acct">posted by <span class="creator-link" data-action="view-creator">${post.creator.name}</span> · ${formatTimestamp(post.post.published)}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    ${optionsMenuHTML}
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
            <button class="status-action" data-action="quick-reply">${ICONS.reply}</button>
            <button class="status-action" data-action="view-post">${ICONS.comments} ${post.counts.comments}</button>
            <button class="status-action ${post.saved ? 'active' : ''}" data-action="save">${ICONS.bookmark}</button>
        </div>
        <div class="quick-reply-container">
            <div class="quick-reply-box">
                <textarea placeholder="Add a comment..."></textarea>
                <button class="button-primary">Post</button>
            </div>
        </div>
    `;
    
    card.querySelectorAll('.spoiler-toggle-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = button.nextElementSibling;
            const icon = button.querySelector('.icon');
            content.classList.toggle('visible');
            if (content.classList.contains('visible')) {
                icon.innerHTML = ICONS.lemmyUpvote.match(/<path.*>/)[0];
            } else {
                icon.innerHTML = ICONS.lemmyDownvote.match(/<path.*>/)[0];
            }
        });
    });

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
    
    card.querySelector('.status-body-content').addEventListener('dblclick', () => {
        if (post.cross_post) {
            actions.showMergedPost(post);
        } else {
            actions.showLemmyPostDetail(post);
        }
    });

    card.querySelector('[data-action="view-community"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunity(`${post.community.name}@${new URL(post.community.actor_id).hostname}`);
    });
    
    card.querySelector('[data-action="view-creator"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyProfile(`${post.creator.name}@${new URL(post.creator.actor_id).hostname}`);
    });
    
    let pressTimer;
    card.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            const isOwn = post.creator.name === localStorage.getItem('lemmy_username');
            let menuItems = [
                { label: `${ICONS.delete} Block @${post.creator.name}`, action: () => {
                    if (confirm('Are you sure you want to block this user?')) {
                        actions.lemmyBlockUser(post.creator.id, true);
                    }
                }},
                { label: `${ICONS.delete} Block ${post.community.name}`, action: () => {
                    if (confirm('Are you sure you want to block this community?')) {
                        actions.lemmyBlockCommunity(post.community.id, true);
                    }
                }},
            ];
            if (isOwn) {
                menuItems.push(
                    { label: `${ICONS.edit} Edit`, action: () => {
                        const replyContainer = card.querySelector('.quick-reply-container');
                        replyContainer.style.display = 'block';
                        const textarea = replyContainer.querySelector('textarea');
                        textarea.value = post.post.body;
                        textarea.focus();
                        const button = replyContainer.querySelector('button');
                        button.textContent = 'Save';
                        button.onclick = async (e) => {
                            e.stopPropagation();
                            const newContent = textarea.value.trim();
                            if (newContent) {
                                await actions.lemmyEditPost(post.post.id, newContent);
                                replyContainer.style.display = 'none';
                                button.textContent = 'Post';
                            }
                        };
                    }},
                    { label: `${ICONS.delete} Delete`, action: () => {
                        if (confirm('Are you sure you want to delete this post?')) {
                            actions.lemmyDeletePost(post.post.id);
                        }
                    }}
                );
            }
            actions.showContextMenu(e, menuItems);
        }, 500);
    });

    card.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });

    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const isOwn = post.creator.name === localStorage.getItem('lemmy_username');
        let menuItems = [
            { label: `${ICONS.delete} Block @${post.creator.name}`, action: () => {
                if (confirm('Are you sure you want to block this user?')) {
                    actions.lemmyBlockUser(post.creator.id, true);
                }
            }},
            { label: `${ICONS.delete} Block ${post.community.name}`, action: () => {
                if (confirm('Are you sure you want to block this community?')) {
                    actions.lemmyBlockCommunity(post.community.id, true);
                }
            }},
        ];
        if (isOwn) {
             menuItems.push(
                { label: `${ICONS.edit} Edit`, action: () => {
                    const replyContainer = card.querySelector('.quick-reply-container');
                    replyContainer.style.display = 'block';
                    const textarea = replyContainer.querySelector('textarea');
                    textarea.value = post.post.body;
                    textarea.focus();
                    const button = replyContainer.querySelector('button');
                    button.textContent = 'Save';
                    button.onclick = async (e) => {
                        e.stopPropagation();
                        const newContent = textarea.value.trim();
                        if (newContent) {
                            await actions.lemmyEditPost(post.post.id, newContent);
                            replyContainer.style.display = 'none';
                            button.textContent = 'Post';
                        }
                    };
                }},
                { label: `${ICONS.delete} Delete`, action: () => {
                    if (confirm('Are you sure you want to delete this post?')) {
                        actions.lemmyDeletePost(post.post.id);
                    }
                }}
            );
        }
        actions.showContextMenu(e, menuItems);
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
                case 'quick-reply':
                    const replyContainer = card.querySelector('.quick-reply-container');
                    const isVisible = replyContainer.style.display === 'block';

                    document.querySelectorAll('.quick-reply-container').forEach(container => {
                        container.style.display = 'none';
                    });

                    replyContainer.style.display = isVisible ? 'none' : 'block';
                    if (!isVisible) {
                        replyContainer.querySelector('textarea').focus();
                    }
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
    
    card.querySelector('.quick-reply-box button').addEventListener('click', async (e) => {
        e.stopPropagation();
        const textarea = card.querySelector('.quick-reply-box textarea');
        const content = textarea.value.trim();
        if(!content) return;

        try {
            await actions.lemmyPostComment({ content: content, post_id: post.post.id });
            textarea.value = '';
            card.querySelector('.quick-reply-container').style.display = 'none';
        } catch(err) {
            alert('Failed to post comment.');
        }
    });
    
    card.querySelector('.quick-reply-box textarea').addEventListener('click', (e) => e.stopPropagation());


    const optionsBtn = card.querySelector('.post-options-btn');
    if (optionsBtn) {
        const menu = card.querySelector('.post-options-menu');
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });

        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            if (action === 'block-community') {
                const communityId = parseInt(e.target.dataset.communityId, 10);
                if (confirm('Are you sure you want to block this community?')) {
                    actions.lemmyBlockCommunity(communityId, true);
                }
            }
            menu.style.display = 'none';
        });
    }

    return card;
}

export async function fetchLemmyFeed(state, actions, loadMore = false, onLemmySuccess) {
    if (!localStorage.getItem('lemmy_jwt') && !loadMore) {
        renderLoginPrompt(state.timelineDiv, 'lemmy', onLemmySuccess);
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
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) {
            throw new Error("Lemmy instance not found. Please log in.");
        }

        const params = {
            sort: state.currentLemmySort,
            page: loadMore ? state.lemmyPage + 1 : 1,
            limit: 3
        };
        if (state.currentLemmyFeed !== 'All') {
            params.type_ = state.currentLemmyFeed;
        }
        
        const response = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', params);
        const posts = response.data.posts;

        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        if (posts && posts.length > 0) {
            if (loadMore) {
                state.lemmyPage++;
            } else {
                state.lemmyPage = 1;
            }
            posts.forEach(post_view => {
                const postCard = renderLemmyCard(post_view, actions, state.settings);
                state.timelineDiv.appendChild(postCard);
            });
            state.lemmyHasMore = true;
        } else {
            if (!loadMore) {
                state.timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
            }
            state.lemmyHasMore = false;
        }

        if (!state.lemmyHasMore) {
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
             state.scrollLoader.innerHTML = '<p></p>';
        }

    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        actions.showToast(`Could not load Lemmy feed: ${error.message}`);
        state.timelineDiv.innerHTML = `<p>Error loading feed.</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
        else document.getElementById('refresh-btn').classList.remove('loading');
    }
}
