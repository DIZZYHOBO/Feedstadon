import { apiFetch } from './api.js';

/**
 * Fetches and renders search results into the search view.
 * @param {object} state - The global app state.
 * @param {string} query - The search query.
 */
export async function renderSearchResults(state, query) {
    const container = document.getElementById('search-results-view');
    container.innerHTML = `<p>Searching for "${query}"...</p>`;

    try {
        // Use the Mastodon API v2 search endpoint. It's simpler.
        // We'll search for accounts and resolve results (to follow them from your instance).
        const results = await apiFetch(state.instanceUrl, state.accessToken, `/api/v2/search?q=${query}&type=accounts&resolve=true`);
        
        container.innerHTML = ''; // Clear the "Searching..." message

        if (results.accounts.length === 0) {
            container.innerHTML = `<p>No accounts found for "${query}".</p>`;
            return;
        }

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
            
            // Add click listener to show the user's profile
            resultDiv.addEventListener('click', () => {
                state.actions.showProfile(account.id);
            });

            container.appendChild(resultDiv);
        });

    } catch (err) {
        console.error("Search failed:", err);
        container.innerHTML = `<p>Could not perform search. Please try again later.</p>`;
    }
}
