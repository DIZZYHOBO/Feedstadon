/**
 * A generic fetch wrapper for making API requests. It automatically handles
 * adding the authorization token for Mastodon requests.
 *
 * @param {string} instanceUrl - The base URL of the Mastodon or Lemmy instance.
 * @param {string|null} token - The user's access token (for Mastodon).
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/v1/timelines/home').
 * @param {object} options - Standard Fetch API options (method, body, etc.).
 * @returns {Promise<object>} - The JSON response from the API.
 */
export async function apiFetch(instanceUrl, token, endpoint, options = {}) {
    const defaultHeaders = {};
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${instanceUrl}${endpoint}`, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.error || error.message || 'API request failed');
    }

    // For HEAD requests or responses with no content
    if (response.status === 204) {
        return;
    }

    // Extract pagination link from headers for Mastodon
    const linkHeader = response.headers.get('Link');
    const nextUrl = linkHeader ? linkHeader.match(/<([^>]+)>; rel="next"/) : null;

    return {
        data: await response.json(),
        next: nextUrl ? nextUrl[1] : null,
    };
}


/**
 * A specialized fetch wrapper for the Lemmy API. It handles GraphQL-style queries.
 *
 * @param {string} instanceUrl - The base URL of the Lemmy instance.
 * @param {object} graphqlQuery - The GraphQL query to send.
 * @returns {Promise<object>} - The JSON response from the Lemmy API.
 */
export async function lemmyFetch(instanceUrl, graphqlQuery) {
    const jwt = localStorage.getItem('lemmy_jwt');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (jwt) {
        headers['Authorization'] = `Bearer ${jwt}`;
    }

    const response = await fetch(`${instanceUrl}/api/v3/post/list`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Lemmy API request failed');
    }

    return response.json();
}
