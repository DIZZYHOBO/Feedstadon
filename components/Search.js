import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { renderStatus } from './Post.js';

export async function renderHashtagSuggestions(state, query) {
    const container = document.getElementById('search-results-view');
    const suggestionBar = document.createElement('div');
    suggestionBar.className = 'hashtag-suggestion-bar';
    
    // Clear previous suggestions
    const existingBar = container.querySelector('.hashtag-suggestion-bar');
    if (existingBar) {
        existingBar.remove();
    }

    if (!query.startsWith('#') || query.length < 2) {
        return; // Only show for hashtags with at least one character after #
    }

    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/trends`);
        const suggestions = response.data;
        
        if (suggestions.length === 0) return;

        const filteredSuggestions = suggestions
            .filter(tag => tag.name.toLowerCase().includes(query.substring(1).toLowerCase()))
            .slice(0, 4);

        if (filteredSuggestions.length > 0) {
            filteredSuggestions.forEach(tag => {
                const button = document.createElement('button');
                button.className = 'hashtag-suggestion-btn';
                button.textContent = `#${tag.name}`;
                button.onclick = () => {
                    document.getElementById('search-input').value = `#${tag.name}`;
                    renderSearchResults(state, `#${tag.name}`);
                };
                suggestionBar.appendChild(button);
            });
            container.prepend(suggestionBar);
        }

    } catch (err) {
        console.error("Hashtag suggestion failed:", err);
    }
}


export async function renderSearchResults(state, query) {
    const container = document.getElementById('search-results-view');
    container.innerHTML = `<p>Searching for "${query}"...</p>`;

    try {
        // If the query is a hashtag, fetch the tag timeline directly.
        if (query.startsWith('#')) {
            const tagName = query.substring(1);
            const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/timelines/tag/${tagName}`);
            const statuses = response.data;

            container.innerHTML = `<div class="view-header">#${tagName}</div>`;

            if (statuses.length === 0) {
                container.innerHTML += `<p>No posts found for "${query}".</p>`;
                return;
            }

            statuses.forEach(status => {
                const statusElement = renderStatus(status, state, state.actions);
                if (statusElement) container.appendChild(statusElement);
            });
            return; // Stop execution here for hashtag search
        }

        // Otherwise, perform a general search.
        const results = (await apiFetch(state.instanceUrl, state.accessToken, `/api/v2/search?q=${query}&resolve=true`)).data;
        
        container.innerHTML = '';

        if (results.accounts.length === 0 && results.hashtags.length === 0 && results.statuses.length === 0) {
            container.innerHTML = `<p>No results found for "${query}".</p>`;
            return;
        }

        if (results.accounts.length > 0) {
            const accountsHeader = document.createElement('div');
            accountsHeader.className = 'view-header';
            accountsHeader.textContent = 'Accounts';
            container.appendChild(accountsHeader);
            results.accounts.forEach(account => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'search-result-item';
                resultDiv.innerHTML = `
                    <img src="${account.avatar_static}" alt="${account.acct} avatar">
                    <div>
                        <div class="display-name">${account.display_name}</div>
                        <div class="acct">@${account.acct}</div>
                    </div>
                `;
                resultDiv.addEventListener('click', () => {
                    state.actions.showProfile(account.id);
                });
                container.appendChild(resultDiv);
            });
        }

        if (results.hashtags.length > 0) {
            const hashtagsHeader = document.createElement('div');
            hashtagsHeader.className = 'view-header';
            hashtagsHeader.textContent = 'Hashtags';
            container.appendChild(hashtagsHeader);
            results.hashtags.forEach(tag => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'search-result-item';
                resultDiv.innerHTML = `
                    <div class="hashtag-icon">#</div>
                    <div>
                        <div class="display-name">${tag.name}</div>
                        <div class="acct">${tag.history[0].uses} posts this week</div>
                    </div>
                `;
                resultDiv.addEventListener('click', () => {
                    state.actions.showHashtagTimeline(tag.name);
                });
                container.appendChild(resultDiv);
            });
        }

        if (results.statuses.length > 0) {
            const postsHeader = document.createElement('div');
            postsHeader.className = 'view-header';
            postsHeader.textContent = 'Posts';
            container.appendChild(postsHeader);
            results.statuses.forEach(status => {
                const statusElement = renderStatus(status, state, state.actions);
                if (statusElement) container.appendChild(statusElement);
            });
        }

    } catch (err) {
        console.error("Search failed:", err);
        container.innerHTML = `<p>Could not perform search. Please try again later.</p>`;
    }
}
