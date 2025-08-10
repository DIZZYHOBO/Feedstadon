import { apiFetch, lemmyFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderUser } from './Profile.js';
import { ICONS } from './icons.js';
import { navigate } from './routing.js';
import { renderLemmyCard } from './Lemmy.js';

function renderHashtagSuggestions(hashtags, container, state) {
    container.innerHTML = '<h4>Trending Tags</h4>';
    const list = document.createElement('ul');
    list.className = 'hashtag-list';
    hashtags.forEach(tag => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#/search?q=%23${tag.name}">#${tag.name} <span>${tag.history[0].uses} posts</span></a>`;
        list.appendChild(li);
    });
    container.appendChild(list);
}

export async function renderSearchResults(state, query) {
    const container = document.getElementById('search-results');
    container.innerHTML = `<div class="loading">Searching for "${query}"...</div>`;

    try {
        if (state.currentDiscoverTab === 'mastodon') {
            const results = await apiFetch(state.instanceUrl, state.accessToken, `/api/v2/search?q=${encodeURIComponent(query)}&resolve=true`);
            container.innerHTML = '';

            if (results.accounts.length > 0) {
                const accountsHeader = document.createElement('div');
                accountsHeader.className = 'view-header';
                accountsHeader.textContent = 'Accounts';
                container.appendChild(accountsHeader);
                results.accounts.forEach(account => {
                    container.appendChild(renderUser(account, state, true));
                });
            }

            if (results.statuses.length > 0) {
                const postsHeader = document.createElement('div');
                postsHeader.className = 'view-header';
                postsHeader.textContent = 'Posts';
                container.appendChild(postsHeader);
                results.statuses.forEach(status => {
                    const statusElement = renderStatus(status, state, state.actions, true);
                    if (statusElement) container.appendChild(statusElement);
                });
            }

            if (results.hashtags.length > 0) {
                const hashtagsHeader = document.createElement('div');
                hashtagsHeader.className = 'view-header';
                hashtagsHeader.textContent = 'Hashtags';
                container.appendChild(hashtagsHeader);
                const list = document.createElement('ul');
                list.className = 'hashtag-list';
                results.hashtags.forEach(tag => {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="#/search?q=%23${tag.name}">#${tag.name}</a>`;
                    list.appendChild(li);
                });
                container.appendChild(list);
            }

            if (results.accounts.length === 0 && results.statuses.length === 0 && results.hashtags.length === 0) {
                container.innerHTML = `<p>No results found for "${query}" on Mastodon.</p>`;
            }

        } else { // Lemmy Search
            const response = await lemmyFetch(state.instanceUrl, {
                query: `
                    query {
                      search(q: "${query}", sort: "TopAll", type_: "All", listingType: "All") {
                        posts {
                          post { id, name, url, body, published, nsfw, thumbnail_url }
                          creator { id, name, avatar }
                          community { id, name, icon }
                          counts { score, comments }
                        }
                      }
                    }
                `
            });
            container.innerHTML = '';
            const posts = response.data.search.posts;
            if (posts.length > 0) {
                posts.forEach(post_view => {
                    container.appendChild(renderLemmyCard(post_view, state.actions, state.settings));
                });
            } else {
                container.innerHTML = `<p>No results found for "${query}" on Lemmy.</p>`;
            }
        }
    } catch (error) {
        console.error('Search failed:', error);
        container.innerHTML = `<p>Search failed. ${error.message}</p>`;
    }
}


async function fetchHashtagTimeline(state, hashtag) {
    const container = document.getElementById('search-results');
    container.innerHTML = `<div class="loading">Loading timeline for #${hashtag}...</div>`;
    try {
        const timeline = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/timelines/tag/${hashtag}`);
        container.innerHTML = `<h3>#${hashtag}</h3>`;
        if (timeline.length > 0) {
            timeline.forEach(status => {
                 const statusElement = renderStatus(status, state, state.actions, true);
                 if (statusElement) container.appendChild(statusElement);
            });
        } else {
            container.innerHTML += `<p>No posts found for this hashtag.</p>`;
        }
    } catch (error) {
        console.error(`Failed to fetch timeline for #${hashtag}:`, error);
        container.innerHTML = `<p>Could not load timeline for #${hashtag}.</p>`;
    }
}


export function renderSearchPage(state, showView) {
    showView('search-view');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');
    const searchSuggestions = document.getElementById('search-suggestions');

    // Handle query from URL
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const queryFromUrl = urlParams.get('q');

    if (queryFromUrl) {
        searchInput.value = queryFromUrl;
        if (queryFromUrl.startsWith('#')) {
             fetchHashtagTimeline(state, queryFromUrl.substring(1));
        } else {
             renderSearchResults(state, queryFromUrl);
        }
        searchSuggestions.style.display = 'none';
    } else {
        searchResultsContainer.innerHTML = '';
        searchSuggestions.style.display = 'block';
        
        // Fetch and display trending tags only if logged into Mastodon
        if (state.currentDiscoverTab === 'mastodon' && state.accessToken) {
             apiFetch(state.instanceUrl, state.accessToken, '/api/v1/trends/tags')
                .then(tags => renderHashtagSuggestions(tags, searchSuggestions, state))
                .catch(err => {
                    console.
