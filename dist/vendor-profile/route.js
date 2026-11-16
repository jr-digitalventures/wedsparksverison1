const params = new URLSearchParams(location.search);
const pathSlug = location.pathname.match(/\/vendor-profile\/([^/]+)\/?$/)?.[1];
let id = params.get('id');
if (pathSlug && pathSlug !== 'index.html') {
  try {
    const response = await fetch(new URL('../shared/published-supplier-routes.json', import.meta.url));
    if (!response.ok) throw new Error();
    const routes = await response.json();
    id = Object.keys(routes).find(key => routes[key] === decodeURIComponent(pathSlug));
  } catch { id = null; }
}
if (id || params.get('draft') === '1' || (pathSlug && pathSlug !== 'index.html')) {
  const root = document.querySelector('#vendor-profile-root');
  root.replaceChildren();
  root.dataset.supplierProfile = '';
  // Keep the slug in the address bar; the legacy renderer reads the resolved ID.
  if (id && !params.get('id')) {
    const resolved = new URL(location.href); resolved.searchParams.set('id', id);
    history.replaceState(history.state, '', resolved);
  }
  for (const file of ['../auth.css', '../supplier-account/supplier-dashboard.css', '../shared/supplier-workspace.css']) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL(file, import.meta.url); document.head.append(link);
  }
  await import('../shared/supplier-profile-page.js?v=2');
} else {
  await import('./vendor-profile.js?v=3');
}
