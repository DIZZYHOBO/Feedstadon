/**
 * Formats a timestamp into a human-readable string (e.g., "5m", "2h", "3d").
 * @param {string} timestamp - The ISO 8601 timestamp string.
 * @returns {string} - The formatted, relative time string.
 */
export function formatTimestamp(timestamp) {
    const now = new Date();
    const postDate = new Date(timestamp);
    const seconds = Math.floor((now - postDate) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + "y";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + "mo";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + "d";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + "h";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + "m";
    }
    return Math.floor(seconds) + "s";
}
