import { apiFetch } from './api.js';

export async function fetchNotifications(state) {
    try {
        const notifications = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/notifications?limit=5');
        state.notificationsList.innerHTML = '';
        if (notifications.length === 0) {
            state.notificationsList.innerHTML = '<a href="#">No new notifications</a>';
            return;
        }
        notifications.forEach(n => {
            const notifLink = document.createElement('a');
            notifLink.href = '#';
            let text = n.type;
            if (n.type === 'mention') text = `mentioned you`;
            else if (n.type === 'reblog') text = `boosted your post`;
            else if (n.type === 'favourite') text = `favorited your post`;
            else if (n.type === 'follow') text = `followed you`;
            notifLink.innerHTML = `<strong>${n.account.display_name}</strong> ${text}`;
            state.notificationsList.appendChild(notifLink);
        });
    } catch (error) {
        state.notificationsList.innerHTML = '<a href="#">Error loading notifications</a>';
    }
}

