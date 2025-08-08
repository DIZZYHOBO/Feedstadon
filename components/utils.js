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

export function shouldFilterContent(content, filterList) {
    if (!content) return false;
    const lowerCaseContent = content.toLowerCase();
    return filterList.some(word => lowerCaseContent.includes(word.toLowerCase()));
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
