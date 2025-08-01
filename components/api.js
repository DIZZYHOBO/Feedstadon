export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}) {
    const url = `https://${instanceUrl}${endpoint}`;
    const headers = { 'Authorization': `Bearer ${accessToken}`, ...options.headers };
    if (options.body instanceof FormData) delete headers['Content-Type'];
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}
