export async function loadWaitlistConfig({fetcher = fetch, signal} = {}) {
  const response = await fetcher(new URL('./waitlist-config.json', import.meta.url), {
    cache: 'no-store', credentials: 'omit', signal,
  });
  if (!response.ok) throw new Error('Waitlist configuration unavailable.');
  return response.json();
}

export async function submitWaitlist(endpoint, email, {fetcher = fetch, signal, website = ''} = {}) {
  const address = email.trim();
  if (address.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(address)) {
    throw new Error('Enter a valid email address.');
  }
  if (!endpoint) throw new Error('The waitlist is not connected yet. Please try again later.');
  const response = await fetcher(endpoint, {
    method: 'POST',
    // Apps Script accepts a simple POST; JSON content-type would require a CORS preflight.
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    credentials: 'omit', redirect: 'follow', cache: 'no-store', signal,
    body: JSON.stringify({email: address, website}),
  });
  if (!response.ok) throw new Error('Signup could not be confirmed.');
  const receipt = await response.json();
  if (receipt.accepted !== true) throw new Error('Signup could not be confirmed.');
  return true;
}
