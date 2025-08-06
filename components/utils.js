// A collection of utility functions used across the app

export function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds}s`;
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}h`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
}

export function getWordFilter() {
    return JSON.parse(localStorage.getItem('word-filter') || '[]');
}

export function saveWordFilter(words) {
    localStorage.setItem('word-filter', JSON.stringify(words));
}

export function shouldFilterContent(content, filterList) {
    if (filterList.length === 0 || !content) return false;
    const lowerCaseContent = content.toLowerCase();
    return filterList.some(filterWord => lowerCaseContent.includes(filterWord));
}
