import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

async function renderHashtagSuggestions(state, query) {
    const container = document.getElementById('search-results-view');
    if (!query.startsWith('#') || query.length < 2) {
        container.innerHTML = '';
        return;
    }

    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/trends/tags`);
        const suggestions = response.data;
        
        container.innerHTML = '';

        if (suggestions.length === 0) return;

        const filteredSuggestions = suggestions.filter(tag => tag.name.toLowerCase().includes(query.substring(1).toLowerCase()));

        filteredSuggestions.slice(0, 10).forEach(tag => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'search-suggestion-item';
            suggestionDiv.innerHTML = `<span>#${tag.name}</span>`;
            suggestionDiv.addEventListener('click', () => {
                state.actions.showHashtagTimeline(tag.name);
                document.getElementById('search-input').value = '';
                container.innerHTML = '';
            });
            container.appendChild(suggestionDiv);
        });

    } catch (err) {
        console.error("Hashtag suggestion failed:", err);
    }
}


export async function renderSearchResults(state, query) {
    const container = document.getElementById('search-results-view');
    container.innerHTML = `<p>Searching for "${query}"...</p>`;

    try {
        const endpoint = query.startsWith('#') ? 
            `/api/v1/timelines/tag/${query.substring(1)}` : 
            `/api/v2/search?q=${query}&resolve=true`;

        const response = await apiFetch(state.instanceUrl, state.accessToken, endpoint);
        
        container.innerHTML = '';

        if (query.startsWith('#')) {
            const statuses = response.data;
            if (statuses.length === 0) {
                container.innerHTML = `<p>No posts found for "${query}".</p>`;
                return;
            }
            statuses.forEach(status => {
                const statusElement = renderStatus(status, state, state.actions);
                if (statusElement) container.appendChild(statusElement);
            });
        } else {
            const results = response.data;
            if (results.accounts.length === 0 && results.hashtags.length === 0) {
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
        }
    } catch (err) {
        console.error("Search failed:", err);
        container.innerHTML = `<p>Could not perform search. Please try again later.</p>`;
    }
}
