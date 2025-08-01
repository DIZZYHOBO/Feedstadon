import { apiFetch } from './api.js';
import { showModal } from './ui.js';

// --- MODIFIED: This function now renders the list from server objects ---
function renderWordList(listElement, state) {
    listElement.innerHTML = '';
    state.settings.filters.forEach(filter => {
        const li = document.createElement('li');
        li.textContent = filter.phrase;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.cssText = `background: #d9534f; font-size: 0.8em; padding: 4px 8px;`;
        
        // MODIFIED: Onclick now sends a DELETE request to the server
        removeBtn.onclick = async () => {
            try {
                // Optimistically remove from UI
                li.remove(); 
                // Remove from local state
                state.settings.filters = state.settings.filters.filter(f => f.id !== filter.id);
                // Send delete request
                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/filters/${filter.id}`, { method: 'DELETE' });
            } catch (err) {
                alert('Failed to remove filter.');
                // If it failed, re-render the list to add it back
                renderWordList(listElement, state);
            }
        };
        li.appendChild(removeBtn);
        listElement.appendChild(li);
    });
}

// --- MODIFIED: This function now fetches filters from the server ---
export async function loadSettings(state) {
    const savedClientSettings = localStorage.getItem('feedstadon-settings');
    const hideNsfw = savedClientSettings ? JSON.parse(savedClientSettings).hideNsfw : false;
    
    try {
        const filters = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/filters');
        return { hideNsfw, filters };
    } catch (err) {
        console.error("Could not load server filters", err);
        alert("Could not load your server-side filters. The filter feature will be limited.");
        return { hideNsfw, filters: [] };
    }
}

// --- MODIFIED: The modal now interacts with the Mastodon API ---
export function showSettingsModal(state) {
    const settingsContent = document.getElementById('settings-template').content.cloneNode(true);
    const nsfwToggle = settingsContent.querySelector('#nsfw-toggle');
    const wordFilterInput = settingsContent.querySelector('#word-filter-input');
    const addWordBtn = settingsContent.querySelector('#add-filter-word-btn');
    const wordList = settingsContent.querySelector('#word-filter-list');

    nsfwToggle.checked = state.settings.hideNsfw;
    renderWordList(wordList, state);

    nsfwToggle.onchange = () => {
        state.settings.hideNsfw = nsfwToggle.checked;
        // The only setting we save locally now is the NSFW toggle
        localStorage.setItem('feedstadon-settings', JSON.stringify({ hideNsfw: state.settings.hideNsfw }));
    };

    addWordBtn.onclick = async () => {
        const newWord = wordFilterInput.value.trim().toLowerCase();
        if (newWord && !state.settings.filters.some(f => f.phrase === newWord)) {
            const tempId = `temp_${Date.now()}`;
            
            // Optimistically add to UI
            const newFilterData = { id: tempId, phrase: newWord };
            state.settings.filters.push(newFilterData);
            renderWordList(wordList, state);
            wordFilterInput.value = '';

            try {
                const body = {
                    phrase: newWord,
                    context: ['home', 'notifications', 'public'], // Apply filter widely
                    irreversible: false,
                    whole_word: false
                };
                // Send POST request to server
                const createdFilter = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/filters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                // Replace temp data with real data from server
                const optimisticFilter = state.settings.filters.find(f => f.id === tempId);
                if(optimisticFilter) {
                    optimisticFilter.id = createdFilter.id;
                }

            } catch (err) {
                alert('Failed to add filter.');
                // If it failed, remove the optimistic add
                state.settings.filters = state.settings.filters.filter(f => f.id !== tempId);
                renderWordList(wordList, state);
            }
        }
    };
    
    showModal(settingsContent);
}
