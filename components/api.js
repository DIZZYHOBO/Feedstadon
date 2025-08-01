/**
 * A helper function to make authenticated API requests to the Mastodon instance.
 * @param {string} instanceUrl - The base URL of the Mastodon instance.
 * @param {string} accessToken - The user's access token.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/v1/statuses').
 * @param {object} options - Optional fetch options (method, body, etc.).
 * @returns {Promise<object>} The JSON response from the API.
 */
export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}) {
    // Sanitize the instance URL to ensure it's clean
    const cleanInstanceUrl = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const url = `https://${cleanInstanceUrl}${endpoint}`;
    
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        // This will throw the 401 error if the token is bad
        throw new Error(`HTTP ${response.status}`);
    }

    // Handle responses that don't have a body (like DELETE)
    if (response.status === 204 || response.status === 202) {
        return {};
    }

    return response.json();
}
