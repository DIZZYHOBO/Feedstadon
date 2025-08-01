import { showModal } from './ui.js';

function saveSettings(settings) {
    localStorage.setItem('feedstadon-settings', JSON.stringify(settings));
}

function renderWordList(listElement, state) {
    listElement.innerHTML = '';
    state.settings.filteredWords.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.cssText = `background: #d9534f; font-size: 0.8em; padding: 4px 8px;`;
        removeBtn.onclick = () => {
            state.settings.filteredWords = state.settings.filteredWords.filter(w => w !== word);
            saveSettings(state.settings);
            renderWordList(listElement, state);
        };
        li.appendChild(removeBtn);
        listElement.appendChild(li);
    });
}

export function loadSettings() {
    const saved = localStorage.getItem('feedstadon-settings');
    const defaults = {
        hideNsfw: false,
        filteredWords: []
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

export function showSettingsModal(state) {
    const settingsContent = document.getElementById('settings-template').content.cloneNode(true);
    const nsfwToggle = settingsContent.querySelector('#nsfw-toggle');
    const wordFilterInput = settingsContent.querySelector('#word-filter-input');
    const addWordBtn = settingsContent.querySelector('#add-filter-word-btn');
    const wordList = settingsContent.querySelector('#word-filter-list');

    // Set initial values from state
    nsfwToggle.checked = state.settings.hideNsfw;
    renderWordList(wordList, state);

    // Add event listeners
    nsfwToggle.onchange = () => {
        state.settings.hideNsfw = nsfwToggle.checked;
        saveSettings(state.settings);
    };

    addWordBtn.onclick = () => {
        const newWord = wordFilterInput.value.trim().toLowerCase();
        if (newWord && !state.settings.filteredWords.includes(newWord)) {
            state.settings.filteredWords.push(newWord);
            saveSettings(state.settings);
            renderWordList(wordList, state);
            wordFilterInput.value = '';
        }
    };
    
    showModal(settingsContent);
}
