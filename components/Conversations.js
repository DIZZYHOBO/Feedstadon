import { apiFetch } from './api.js';
import { renderStatus } from './Post.js'; // We can reuse some parts if needed, but we'll mostly use custom rendering

function renderMessage(status, currentUser) {
    const messageDiv = document.createElement('div');
    const isSent = status.account.id === currentUser.id;
    messageDiv.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
    
    // Simple rendering, avoiding the complex `renderStatus` layout
    messageDiv.innerHTML = `
        <div class="message-content">${status.content}</div>
        <div class="message-timestamp">${new Date(status.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    
    return messageDiv;
}

export async function renderConversationDetail(state, conversationId, participants) {
    const container = document.getElementById('conversations-view');
    const conversation = state.conversations.find(c => c.id === conversationId);
    if (!conversation) {
        container.innerHTML = `<p>Conversation not found.</p>`;
        return;
    }
    
    const participantNames = participants.map(p => `@${p.acct}`).join(' ');

    container.innerHTML = `
        <div class="view-header conversation-header">
            <button id="back-to-conversations" class="nav-button">&larr; Back</button>
            <div class="participant-info">
                <img src="${participants[0].avatar}" class="participant-avatar" />
                <span>${participants[0].display_name}</span>
            </div>
        </div>
        <div class="message-list"></div>
        <form class="message-reply-form">
            <input type="text" placeholder="Type a message..." required>
            <button type="submit">Send</button>
        </form>
    `;

    const messageList = container.querySelector('.message-list');
    messageList.innerHTML = `<p>Loading messages...</p>`;

    document.getElementById('back-to-conversations').addEventListener('click', () => {
        state.actions.showConversations();
    });

    try {
        const context = (await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${conversation.last_status.id}/context`)).data;
        const messages = [...context.ancestors, conversation.last_status, ...context.descendants];
        
        messageList.innerHTML = '';
        messages.forEach(msg => {
            if (msg.visibility === 'direct') {
                messageList.appendChild(renderMessage(msg, state.currentUser));
            }
        });
        messageList.scrollTop = messageList.scrollHeight; // Scroll to the bottom

    } catch (error) {
        console.error('Failed to load conversation details:', error);
        messageList.innerHTML = `<p>Could not load messages.</p>`;
    }

    container.querySelector('.message-reply-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const content = input.value.trim();
        if (!content) return;

        const fullContent = `${participantNames} ${content}`;

        try {
            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: fullContent,
                    visibility: 'direct'
                })
            });
            input.value = '';
            // Refresh conversation view
            renderConversationDetail(state, conversationId, participants);
        } catch (error) {
            console.error('Failed to send direct message:', error);
            alert('Could not send message.');
        }
    });
}

export async function renderConversationsList(state) {
    const container = document.getElementById('conversations-view');
    container.innerHTML = `<div class="view-header">Messages</div><div class="conversation-list-container">Loading...</div>`;

    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/conversations');
        const conversations = response.data;
        state.conversations = conversations; // Cache for later use
        
        const listContainer = container.querySelector('.conversation-list-container');
        listContainer.innerHTML = '';

        if (conversations.length === 0) {
            listContainer.innerHTML = `<p>You have no messages.</p>`;
            return;
        }

        conversations.forEach(convo => {
            if (!convo.last_status) return;
            
            // Filter out the current user to get the other participant(s)
            const otherParticipants = convo.accounts.filter(acc => acc.id !== state.currentUser.id);
            if (otherParticipants.length === 0) return; // Should not happen in a DM

            const mainParticipant = otherParticipants[0];

            const convoItem = document.createElement('div');
            convoItem.className = 'conversation-list-item';
            convoItem.dataset.id = convo.id;
            
            const lastStatusContent = convo.last_status.content.replace(/<[^>]*>/g, "");

            convoItem.innerHTML = `
                <img src="${mainParticipant.avatar_static}" alt="${mainParticipant.display_name}" class="conversation-avatar">
                <div class="conversation-summary">
                    <div class="conversation-name">${mainParticipant.display_name} <span class="acct">@${mainParticipant.acct}</span></div>
                    <div class="conversation-last-message">${lastStatusContent}</div>
                </div>
                ${convo.unread ? '<div class="unread-dot"></div>' : ''}
            `;

            convoItem.addEventListener('click', () => {
                renderConversationDetail(state, convo.id, otherParticipants);
            });

            listContainer.appendChild(convoItem);
        });

    } catch (error) {
        console.error("Failed to fetch conversations:", error);
        container.innerHTML = `<p>Could not load messages.</p>`;
    }
}
