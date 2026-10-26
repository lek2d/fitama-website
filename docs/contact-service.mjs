export function contactEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' && /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) && !url.search && !url.hash && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export async function sendContact(endpoint, payload, fetcher = fetch) {
  const target = contactEndpoint(endpoint);
  if (!target) throw new Error('unavailable');
  const controller = new AbortController();
  // The first deployed Google execution took 68 seconds; keep the wait bounded.
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetcher(target, {
      method: 'POST', credentials: 'omit', redirect: 'follow',
      headers: {'Content-Type': 'text/plain;charset=UTF-8'},
      body: JSON.stringify(payload), signal: controller.signal,
    });
    if (!response.ok || response.type === 'opaque') throw new Error('unconfirmed');
    const result = await response.json();
    if (result.accepted !== true || result.requestId !== payload.requestId) {
      throw new Error(result.code === 'rate_limited' ? 'rate_limited' : 'unconfirmed');
    }
    return result;
  } finally { clearTimeout(timeout); }
}
