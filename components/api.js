export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}) {
    const url = new URL(endpoint.startsWith('/api/v3/') ? `https://lemmy.world${endpoint}` : `${instanceUrl}${endpoint}`);

    const headers = {
        'Authorization': `Bearer ${accessToken}`
    };

    if (options.method === 'POST' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    const config = {
        method: options.method || 'GET',
        headers: headers,
        ...options
    };
    
    // The endpointOverride is a special case for Mastodon's un-favorite/un-reblog actions
    const finalUrl = options.endpointOverride ? new URL(`${instanceUrl}${options.endpointOverride}`) : url;

    const response = await fetch(finalUrl, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return { response, data };
}

export function getPersistedCredentials() {
    return {
        instanceUrl: localStorage.getItem('feedstadon_instance'),
        accessToken: localStorage.getItem('feedstadon_token')
    };
}
