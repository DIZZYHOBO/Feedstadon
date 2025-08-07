import { ICONS } from './icons.js';
import { apiFetch, apiUpdateCredentials } from './api.js';

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('visible');
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('visible');
    }
}

export function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast-notification');
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
        toast.classList.remove('visible');
    }, duration);
}

export function createContextMenu(items) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';
    items.forEach(item => {
        const button = document.createElement('button');
        button.innerHTML = `${item.icon} ${item.label}`;
        button.onclick = (e) => {
            e.stopPropagation();
            item.action();
            hideContextMenu();
        };
        menu.appendChild(button);
    });
}

export function showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';

    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, { once: true });
    }, 0);
}

export function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    menu.style.display = 'none';
    document.removeEventListener('click', hideContextMenu);
}
