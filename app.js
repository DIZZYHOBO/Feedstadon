import { apiFetch } from './components/api.js';
import { ICONS } from './components/icons.js';
import { renderStatus } from './components/Post.js';
// ... other imports

document.addEventListener('DOMContentLoaded', () => {
    // ... DOM Elements and State are unchanged ...

    // --- Core Actions ---
    // ... other actions are unchanged ...
    state.actions.voteOnPoll = (pollId, choices, statusElement) => voteOnPoll(pollId, choices, statusElement);

    // --- View Management ---
    // ... switchView is unchanged ...

    // --- Main App Logic ---
    // ... initializeApp, WebSocket functions, fetch functions etc. are unchanged ...
    
    // ADDED: New function to handle voting on a poll
    async function voteOnPoll(pollId, choices, statusElement) {
        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/polls/${pollId}/votes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choices })
            });

            // The API returns the updated poll object after a vote
            const updatedPoll = response.data;
            
            // Find the original status in our state/data to re-render it
            // This is a simplified approach; a more complex app would manage this differently
            const statusId = statusElement.dataset.id;
            const originalStatusResponse = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
            
            const newStatusElement = renderStatus(originalStatusResponse.data, state, state.actions);
            statusElement.replaceWith(newStatusElement);

        } catch (error) {
            console.error('Failed to vote on poll:', error);
            alert('Could not cast vote.');
        }
    }

    // ... other logic functions and event listeners are unchanged ...
});
