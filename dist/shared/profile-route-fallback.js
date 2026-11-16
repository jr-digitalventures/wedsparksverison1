const url = new URL(location.href);
const match = url.pathname.match(/^(.*?)\/(supplier|vendor-profile)(?:\/(.*))?$/);
if (match) {
  const base = match[1] + '/';
  const tail = match[3] || '';
  if (match[2] === 'supplier') {
    const target = new URL(base + 'vendor-profile/' + tail, url.origin);
    target.search = url.search; target.hash = url.hash;
    // The old private preview flag is distinct from prototype preview controls.
    if (target.searchParams.get('preview') === '1') { target.searchParams.delete('preview'); target.searchParams.set('draft', '1'); }
    location.replace(target.href);
  } else {
    try {
      const response = await fetch(base + 'vendor-profile/index.html');
      if (!response.ok) throw new Error();
      const html = (await response.text()).replace('<head>', '<head><base href="' + new URL(base + 'vendor-profile/', url.origin).href + '">');
      document.open(); document.write(html); document.close();
    } catch { document.querySelector('main').textContent = 'This vendor profile could not be loaded. Please try again.'; }
  }
}
