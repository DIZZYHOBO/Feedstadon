export function formatTimestamp(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    const secondsInMinute = 60;
    const secondsInHour = 3600;
    const secondsInDay = 86400;

    if (diffInSeconds < secondsInMinute) {
        return `${diffInSeconds}s`;
    } else if (diffInSeconds < secondsInHour) {
        return `${Math.floor(diffInSeconds / secondsInMinute)}m`;
    } else if (diffInSeconds < secondsInDay) {
        return `${Math.floor(diffInSeconds / secondsInHour)}h`;
    } else {
        return `${Math.floor(diffInSeconds / secondsInDay)}d`;
    }
}


export function getWordFilter() {
    return JSON.parse(localStorage.getItem('wordFilter') || '[]');
}

export function saveWordFilter(filterList) {
    localStorage.setItem('wordFilter', JSON.stringify(filterList));
}

export function shouldFilterContent(content, filterList) {
    if (!content) return false;
    const lowerCaseContent = content.toLowerCase();
    return filterList.some(word => lowerCaseContent.includes(word.toLowerCase()));
}
// **FIX:** Added 'export' keyword to make this function available for import.
export function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

export function processSpoilers(content) {
    if (!content) return '';
    const spoilerRegex = />!([\s\S]*?)!</g;
    return content.replace(spoilerRegex, (match, spoilerText) => {
        return `
            <div class="spoiler-tag">
                <button class="spoiler-toggle-btn">
                    Spoiler
                    <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="m192 384 320 384 320-384z"/></svg>
                </button>
                <div class="spoiler-content">
                    ${spoilerText}
                </div>
            </div>
        `;
    });
}
