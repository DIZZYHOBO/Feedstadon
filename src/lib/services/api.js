// This file will contain all functions to interact with the Mastodon API
// For example:
export async function fetchPublicTimeline(fetch) {
    const defaultInstance = 'mastodon.social';
    const url = `https://${defaultInstance}/api/v1/timelines/public?limit=20`;
    try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Failed to fetch public timeline');
        const { data } = await res.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
}
// You would add functions like fetchHomeTimeline, postStatus, favoriteStatus, etc. here
