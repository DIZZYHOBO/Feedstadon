import { apiFetch } from './api.js';

export async function renderSearchResults(state, query) {
    const container = document.getElementById('search-results-view');
    container.innerHTML = `<p>Searching for "${query}"...</p>`;

    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v2/search?q=${query}&type=accounts&resolve=true`);
        const results = response.data; // MODIFIED: Get data from response object
        
        container.innerHTML = '';

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
