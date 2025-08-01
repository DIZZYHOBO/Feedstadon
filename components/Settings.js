import { showModal } from './ui.js';
import { fetchTimeline } from './Timeline.js';

export function showSettingsModal(state) {
    const settingsContent = document.getElementById('settings-template').content.cloneNode(true);
    const nsfwToggle = settingsContent.querySelector('#nsfw-toggle');
    const filterInput = settingsContent.querySelector('#word-filter-input');
    const addFilterBtn = settingsContent.querySelector('#add-filter-word-btn');
    const filterList = settingsContent.querySelector('#word-filter-list');
    
    nsfwToggle.checked = state.settings.hideNsfw;
    const renderFilterList = () => {
        filterList.innerHTML = '';
        state.settings.filteredWords.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.style.padding = '2px 8px';
            removeBtn.onclick = () => {
                state.settings.filteredWords = state.settings.filteredWords.filter(w => w !== word);
                saveSettings(state);
                renderFilterList();
            };
            li.appendChild(removeBtn);
            filterList.appendChild(li);
        });
    };
    renderFilterList();

    nsfwToggle.onchange = () => {
        state.settings.hideNsfw = nsfwToggle.checked;
        saveSettings(state);
    };
    addFilterBtn.onclick = () => {
        const word = filterInput.value.trim();
        if (word && !state.settings.filteredWords.includes(word)) {
            state.settings.filteredWords.push(word);
            filterInput.value = '';
            saveSettings(state);
            renderFilterList();
        }
    };
    showModal(settingsContent);
}

function saveSettings(state) {
    localStorage.setItem('fediverse-settings', JSON.stringify(state.settings));
    fetchTimeline(state, state.currentTimeline);
}

export function loadSettings() {
    const saved = localStorage.getItem('fediverse-settings');
    if (saved) return JSON.parse(saved);
    return { hideNsfw: false, filteredWords: [] };
}
