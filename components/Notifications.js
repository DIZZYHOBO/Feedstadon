import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

export async function fetchNotifications(state) {
    const container = document.getElementById('notifications-list');
    container.innerHTML = '<div class="notification-item">Loading...</div>';

    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/notifications');
        const notifications = response.data;
        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = '<div class="notification-item">You have no new notifications.</div>';
            return;
        }

        const recentNotifications = notifications.slice(0, 10);

        recentNotifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            let icon = '';
            let content = '';

            switch (notification.type) {
                case 'favourite':
                case 'reblog':
                case 'mention':
                    icon = ICONS[notification.type === 'favourite' ? 'favorite' : notification.type === 'reblog' ? 'boost' : 'reply'];
                    content = `<strong>${notification.account.display_name}</strong> ${notification.type}d your post.`;
                    item.addEventListener('click', () => {
                        state.actions.showStatusDetail(notification.status.id);
                        document.getElementById('notifications-dropdown').classList.remove('active');
                    });
                    break;
                case 'follow':
                    icon = '👤';
                    content = `<strong>${notification.account.display_name}</strong> followed you.`;
                    item.addEventListener('click', () => {
                        state.actions.showProfile(notification.account.id);
                        document.getElementById('notifications-dropdown').classList.remove('active');
                    });
                    break;
                default:
                    return;
            }
            
            item.innerHTML = `
                <div class="notification-icon">${icon}</div>
                <img class="notification-avatar" src="${notification.account.avatar_static}" alt="${notification.account.display_name}">
                <div class="notification-content">${content}</div>
            `;
            container.appendChild(item);
        });

        if (notifications.length > 10) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'view-all-button';
            viewAllBtn.textContent = 'View All';
            viewAllBtn.onclick = () => {
                state.actions.showAllNotifications();
                document.getElementById('notifications-dropdown').classList.remove('active');
            };
            container.appendChild(viewAllBtn);
        }

    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        container.innerHTML = '<div class="notification-item">Could not load notifications.</div>';
    }
}
