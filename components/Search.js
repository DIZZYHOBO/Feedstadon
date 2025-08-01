import { apiFetch } from './api.js';
import { showProfile } from './Profile.js';

export async function performSearch(state, query) {
    if (!query || query.length < 2) {
        state.searchResults.style.display = 'none';
        return;
    }
    try {
        const results = await apiFetch(state.instanceUrl, state.accessToken, `/api/v2/search?q=${encodeURIComponent(query)}&resolve=false&limit=10`);
        state.searchResults.innerHTML = '';
        if (results.accounts.length > 0) {
            results.accounts.slice(0, 4).forEach(acc => {
                const item = document.createElement('a');
                item.href = '#';
                item.innerHTML = `<strong>${acc.display_name}</strong><br><small>@${acc.acct}</small>`;
                item.onclick = (e) => { e.preventDefault(); showProfile(state, acc.id); };
                state.searchResults.appendChild(item);
            });
        }
        state.searchResults.style.display = 'block';
    } catch(err) {
        state.searchResults.style.display = 'none';
    }
}
