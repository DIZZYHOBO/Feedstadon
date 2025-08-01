export function formatTimestamp(isoDate) {
    const now = new Date();
    const postDate = new Date(isoDate);
    const seconds = Math.floor((now - postDate) / 1000);

    let interval = seconds / 31536000; // years
    if (interval > 1) {
        return postDate.toLocaleDateString('en-us', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    interval = seconds / 2592000; // months
    if (interval > 1) {
        return postDate.toLocaleDateString('en-us', { month: 'short', day: 'numeric' });
    }
    interval = seconds / 86400; // days
    if (interval > 1) {
        return `${Math.floor(interval)}d`;
    }
    interval = seconds / 3600; // hours
    if (interval > 1) {
        return `${Math.floor(interval)}h`;
    }
    interval = seconds / 60; // minutes
    if (interval > 1) {
        return `${Math.floor(interval)}m`;
    }
    return `${Math.floor(seconds)}s`;
}
