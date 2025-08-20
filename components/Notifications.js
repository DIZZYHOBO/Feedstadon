/* Enhanced Notifications Header Styles */
.notifications-stats-header {
    display: flex;
    gap: 15px;
    padding: 20px 15px;
    background: linear-gradient(135deg, var(--card-color) 0%, var(--bg-color) 100%);
    border-bottom: 2px solid var(--border-color);
    align-items: center;
}

.notification-stat-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    background-color: var(--card-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    transition: transform 0.2s, box-shadow 0.2s;
}

.notification-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.notification-stat-card.lemmy-stat {
    border-left: 3px solid #00a846;
}

.notification-stat-card.mastodon-stat {
    border-left: 3px solid #595aff;
}

.stat-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-color);
    border-radius: 50%;
    padding: 8px;
}

.stat-icon svg {
    width: 100%;
    height: 100%;
}

.lemmy-stat .stat-icon svg {
    fill: #00a846;
}

.mastodon-stat .stat-icon svg {
    fill: #595aff;
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-number {
    font-size: 24px;
    font-weight: bold;
    color: var(--font-color);
    line-height: 1;
}

.stat-label {
    font-size: 12px;
    color: var(--font-color-muted);
    margin-top: 4px;
}

.mark-all-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: linear-gradient(135deg, var(--accent-color), var(--accent-color) 80%);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    margin-left: auto;
}

.mark-all-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(89, 90, 255, 0.3);
}

.mark-all-icon {
    width: 20px;
    height: 20px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Enhanced Notification Tabs */
.notification-tabs {
    display: flex;
    gap: 0;
    background-color: var(--card-color);
    padding: 5px;
    border-radius: var(--border-radius);
    margin: 15px;
}

.notification-tab-btn {
    flex: 1;
    padding: 12px;
    background: transparent;
    border: none;
    color: var(--font-color-muted);
    border-radius: calc(var(--border-radius) - 2px);
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.notification-tab-btn:hover {
    background-color: var(--hover-color);
}

.notification-tab-btn.active {
    background-color: var(--accent-color);
    color: white;
}

.tab-icon {
    width: 16px;
    height: 16px;
    display: inline-flex;
}

.tab-icon svg {
    width: 100%;
    height: 100%;
    fill: currentColor;
}

/* Notification Items - Enhanced hover effect */
.notification-item {
    cursor: pointer;
    transition: all 0.2s;
}

.notification-item:hover {
    background-color: var(--hover-color);
    transform: translateX(5px);
}

.notification-item.unread:hover {
    background-color: rgba(89, 90, 255, 0.1);
}

/* Platform icon styles for notifications */
.platform-icon {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-color);
    padding: 4px;
    border-radius: var(--border-radius);
}

.platform-icon svg {
    width: 100%;
    height: 100%;
}

.platform-icon.lemmy svg {
    fill: #00a846;
}

.platform-icon.mastodon svg {
    fill: #595aff;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .notifications-stats-header {
        flex-direction: column;
        gap: 10px;
    }
    
    .notification-stat-card {
        width: 100%;
    }
    
    .mark-all-btn {
        width: 100%;
        justify-content: center;
    }
    
    .notification-tabs {
        margin: 10px;
    }
    
    .notification-tab-btn {
        font-size: 13px;
        padding: 10px;
    }
    
    .tab-icon {
        width: 14px;
        height: 14px;
    }
}

@media (max-width: 480px) {
    .stat-number {
        font-size: 20px;
    }
    
    .notification-tab-btn .tab-icon {
        display: none;
    }
}
