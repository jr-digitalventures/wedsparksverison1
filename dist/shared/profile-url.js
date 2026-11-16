export function vendorProfileUrl(value, base = location.href) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(String(value || ''), base);
    if (!/^https?:$/.test(url.protocol)) return '';
    const local = new URL(base);
    if (url.origin === local.origin || url.origin === 'https://jr-digitalventures.github.io') {
      url.pathname = url.pathname.replace(/\/supplier(?=\/|$)/, '/vendor-profile');
      if (url.origin === 'https://jr-digitalventures.github.io' && url.pathname.startsWith('/wedsparksverison1/vendor-profile')) {
        const route = url.pathname.slice('/wedsparksverison1/'.length);
        return new URL(route + url.search + url.hash, base).href;
      }
    }
    return url.href;
  } catch { return ''; }
}
