import { siteUrl } from './auth.js';

const main = document.querySelector('main');
if (main && !document.querySelector('.ws-dashboard-shell')) {
  const shell = document.createElement('div');
  shell.className = 'ws-dashboard-shell';

  const details = document.createElement('details');
  details.className = 'ws-dashboard-navigation';

  const summary = document.createElement('summary');
  const profilePage = document.body.dataset.page === 'profile';
  summary.textContent =
    `${document.body.dataset.page === 'messages' ? 'Messages' : document.body.dataset.page === 'budget' ? 'Budget & payments' : document.body.dataset.page === 'guests' ? 'Guests & RSVPs' : document.body.dataset.page === 'checklist' ? 'Checklist & calendar' : profilePage ? 'Profile Settings' : document.body.dataset.page === 'shortlist' ? 'Supplier shortlist' : document.body.dataset.page === 'documents' ? 'Documents' : document.body.dataset.page === 'wedding-day' ? 'Wedding day' : 'Overview'} · Change section`;

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Wedding dashboard');

  const sections = [
    ['Overview', 'dashboard/', !profilePage && !['shortlist','checklist','guests','budget','documents','wedding-day','messages'].includes(document.body.dataset.page)],
    ['Supplier shortlist', 'dashboard/shortlist/', document.body.dataset.page === 'shortlist'],
    ['Messages', 'dashboard/messages/', document.body.dataset.page === 'messages'],
    ['Checklist & calendar', 'dashboard/checklist/', document.body.dataset.page === 'checklist'],
    ['Guests & RSVPs', 'dashboard/guests/', document.body.dataset.page === 'guests'],
    ['Budget & payments', 'dashboard/budget/', document.body.dataset.page === 'budget'],
    ['Documents', 'dashboard/documents/', document.body.dataset.page === 'documents'],
    ['Wedding day', 'dashboard/wedding-day/', document.body.dataset.page === 'wedding-day'],
    ['Profile Settings', 'dashboard/profile/', profilePage]
  ];

  for (const [label, path, active] of sections) {
    const item = document.createElement(path ? 'a' : 'button');
    item.textContent = label;

    if (path) {
      item.href = siteUrl(path);
      if (active) item.setAttribute('aria-current', 'page');
    } else {
      item.type = 'button';
      item.disabled = true;
    }

    nav.append(item);
  }

  details.append(summary, nav);
  main.before(shell);
  shell.append(details, main);

  const mobile = window.matchMedia('(max-width:700px)');
  const updateMenu = () => { details.open = !mobile.matches; };
  updateMenu();
  mobile.addEventListener('change', updateMenu);
}

// Shared banner for every couple dashboard section.
{
  const shell = document.querySelector('.ws-dashboard-shell');
  const heading = shell?.querySelector('main h1');

  if (shell && heading &&
      !document.querySelector('.ws-profile-photo-banner')) {
    const banner = document.createElement('section');
    banner.className = 'ws-profile-photo-banner';
    banner.setAttribute('aria-labelledby', 'dashboard-page-title');

    const image = document.createElement('img');
    image.src = siteUrl('assets/background.jpg');
    image.alt = '';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      image.hidden = true;
    });

    const copy = document.createElement('div');
    copy.className = 'ws-profile-photo-copy';

    const eyebrow = document.createElement('p');
    eyebrow.textContent = 'Your wedding, your way';

    heading.id = 'dashboard-page-title';
    copy.append(eyebrow, heading);
    banner.append(image, copy);
    shell.before(banner);

    shell.querySelector('main .auth-eyebrow')?.remove();

    const intro = shell.querySelector('.ws-profile-intro');
    if (intro) {
      intro.textContent =
        'Your details together, ready to update as plans take shape.';
    }
  }
}

// Persistent dashboard content navigation
{
  const shell = document.querySelector('.ws-dashboard-shell');
  const firstMain = shell?.querySelector('main');
  const bannerTitle = document.querySelector('#dashboard-page-title');

  if (shell && firstMain && bannerTitle) {
    const routes = new Map([
      [new URL(siteUrl('dashboard/messages/')).pathname, {
        key: 'messages',
        url: siteUrl('dashboard/messages/'),
        module: siteUrl('shared/messages.js')
      }],
      [new URL(siteUrl('dashboard/budget/')).pathname, {
        key:'budget',url:siteUrl('dashboard/budget/'),
        module:siteUrl('shared/budget.js')
      }],
      [new URL(siteUrl('dashboard/guests/')).pathname, {
        key: 'guests',
        url: siteUrl('dashboard/guests/'),
        module: siteUrl('shared/guests.js')
      }],
      [new URL(siteUrl('dashboard/checklist/')).pathname, {
        key: 'checklist', url: siteUrl('dashboard/checklist/'),
        module: siteUrl('shared/checklist.js')
      }],
      [new URL(siteUrl('dashboard/wedding-day/')).pathname, {
        key: 'wedding-day',
        url: siteUrl('dashboard/wedding-day/'),
        module: siteUrl('shared/wedding-day.js')
      }],
      [new URL(siteUrl('dashboard/documents/')).pathname, {
        key: 'documents',
        url: siteUrl('dashboard/documents/'),
        module: siteUrl('shared/documents.js')
      }],
      [new URL(siteUrl('dashboard/shortlist/')).pathname, {
        key: 'shortlist',
        url: siteUrl('dashboard/shortlist/'),
        module: siteUrl('shared/shortlist.js')
      }],
      [new URL(siteUrl('dashboard/')).pathname, {
        key: 'overview',
        url: siteUrl('dashboard/'),
        module: siteUrl('shared/account-page.js')
      }],
      [new URL(siteUrl('dashboard/profile/')).pathname, {
        key: 'profile',
        url: siteUrl('dashboard/profile/'),
        module: siteUrl('shared/profile-settings.js')
      }]
    ]);

    function routeFor(value) {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return null;
      let path = url.pathname.replace(/index\.html$/, '');
      if (!path.endsWith('/')) path += '/';
      return routes.get(path) || null;
    }

    const initialRoute = routeFor(location.href);
    const pages = new Map();
    let activeMain = firstMain;
    let busy = false;

    const notice = document.createElement('p');
    notice.className = 'ws-profile-status';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.hidden = true;
    shell.querySelector('.ws-dashboard-navigation').append(notice);

    pages.set(initialRoute.key, {
      main: firstMain,
      heading: bannerTitle.textContent,
      title: document.title
    });

    function updateNavigation(route) {
      const navigation = shell.querySelector('.ws-dashboard-navigation');

      navigation.querySelectorAll('a').forEach(link => {
        if (routeFor(link.href)?.key === route.key) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      navigation.querySelector('summary').textContent =
        `${route.key === 'messages' ? 'Messages' : route.key === 'budget' ? 'Budget & payments' : route.key === 'guests' ? 'Guests & RSVPs' : route.key === 'checklist' ? 'Checklist & calendar' : route.key === 'profile' ? 'Profile Settings' : route.key === 'shortlist' ? 'Supplier shortlist' : route.key === 'documents' ? 'Documents' : route.key === 'wedding-day' ? 'Wedding day' : 'Overview'} · Change section`;

      if (matchMedia('(max-width:700px)').matches) {
        navigation.open = false;
      }
    }

    async function showSection(route, pushHistory) {
      if (busy) return;
      busy = true;
      notice.hidden = true;
      shell.setAttribute('aria-busy', 'true');

      const previousPage = document.body.dataset.page;
      let insertedMain = null;

      try {
        let page = pages.get(route.key);

        if (!page) {
          const response = await fetch(route.url, {
            credentials: 'same-origin'
          });

          if (!response.ok) throw new Error();

          const documentCopy = new DOMParser().parseFromString(
            await response.text(), 'text/html'
          );

          const nextMain = documentCopy.querySelector('main');
          const nextHeading = nextMain?.querySelector('h1');

          if (!nextMain || !nextHeading) throw new Error();

          page = {
            main: document.importNode(nextMain, true),
            heading: nextHeading.textContent,
            title: documentCopy.title
          };

          page.main.querySelectorAll('script').forEach(script => script.remove());
          page.main.querySelector('h1')?.remove();
          page.main.querySelector('.auth-eyebrow')?.remove();

          const intro = page.main.querySelector('.ws-profile-intro');
          if (intro) {
            intro.textContent =
              'Your details together, ready to update as plans take shape.';
          }

          page.main.hidden = true;
          shell.append(page.main);
          insertedMain = page.main;

          document.body.dataset.page =
            route.key;

          await import(route.module);

          if (route.key === 'overview') {

          }

          pages.set(route.key, page);
          insertedMain = null;
        } else if (route.key === 'overview' &&
                   page.main !== activeMain) {
          const accountModule = await import(route.module);
          await accountModule.refreshDashboardPage();

        }

        activeMain.hidden = true;
        page.main.hidden = false;
        activeMain = page.main;

        document.body.dataset.page =
          route.key;

        // Keep the header, banner image and sidebar untouched.
        bannerTitle.textContent = page.heading;
        document.title = page.title;
        updateNavigation(route);
        window.dispatchEvent(new CustomEvent('wedsparks:section-open', { detail: route.key }));

        if (pushHistory) {
          history.pushState({ dashboard: route.key }, '', route.url);
        }
      } catch {
        insertedMain?.remove();
        document.body.dataset.page = previousPage;
        notice.textContent =
          'Couldn’t open that section. Please try again.';

        notice.hidden = false;

        if (!pushHistory) {
          const current = [...pages.entries()].find(
            ([, page]) => page.main === activeMain
          );
          const currentRoute = [...routes.values()].find(
            item => item.key === current?.[0]
          );
          if (currentRoute) {
            history.replaceState({}, '', currentRoute.url);
          }
        }
      } finally {
        busy = false;
        shell.removeAttribute('aria-busy');
      }
    }

    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 ||
          event.ctrlKey || event.metaKey ||
          event.shiftKey || event.altKey) return;

      const link = event.target.closest('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;

      const route = routeFor(link.href);
      if (!route) return;

      event.preventDefault();

      const page = pages.get(route.key);
      if (page?.main === activeMain || busy) return;

      void showSection(route, true);
    });

    window.addEventListener('popstate', () => {
      const route = routeFor(location.href);
      if (route && !busy) {
        void showSection(route, false);
      } else if (route && busy) {
        location.reload();
      }
    });
  }
}

// Close dashboard dialogs on backdrop click
{
  let backdropDialog = null;

  function outside(dialog,event) {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  }

  document.addEventListener('pointerdown',event => {
    const target = event.target;
    backdropDialog = event.button === 0 &&
      target instanceof HTMLDialogElement &&
      target.open && outside(target,event) ? target : null;
  },true);

  document.addEventListener('pointercancel',() => {
    backdropDialog = null;
  },true);

  document.addEventListener('click',event => {
    const dialog = backdropDialog;
    backdropDialog = null;
    if (!dialog || !dialog.open || event.target !== dialog ||
        !outside(dialog,event)) return;

    // Use the same cancellation checks as pressing Escape.
    const cancel = new Event('cancel',{cancelable:true});
    if (dialog.dispatchEvent(cancel) && dialog.open) dialog.close();
  });
}
// Consistent dashboard headings, edit icons and visual budget.
{
  const style=document.createElement('style');
  style.textContent=`
    #bu-content > .ct-heading,
    #shortlist-content > .ws-shortlist-heading {
      background:#103e33;color:white;border-radius:14px;
      padding:20px 24px;margin-bottom:24px;
    }
    #bu-content > .ct-heading h2,
    #shortlist-content > .ws-shortlist-heading h2 {
      color:white;font:normal 28px/1.2 Georgia,serif;margin:0 0 6px;
    }
    #bu-content > .ct-heading p,
    #shortlist-content > .ws-shortlist-heading p {
      color:#e0ebe2;margin:0;font-size:15px;
    }
    #bu-content > .ct-heading .ct-primary {
      background:#fffaf0;color:#103e33;border-color:#fffaf0;
    }
    #bu-content > .ct-heading .ct-primary:hover {
      background:#eee8d8;color:#103e33;
    }
    #bu-content div.bu-target {
      background:#fffaf0;color:#173e33;border:1px solid #e0d9cb;
    }
    #bu-content div.bu-target h2,
    #bu-content div.bu-target a {color:#173e33}
    .bu-visual {
      background:white;border:1px solid #dedbd6;border-radius:14px;
      padding:20px;margin:18px 0;
    }
    .bu-visual-heading {display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .bu-visual-heading h3 {margin:0;font:normal 22px Georgia,serif}
    .bu-spending-bar {
      display:flex;position:relative;height:22px;border:1px solid #bfc8c0;
      border-radius:20px;margin-top:18px;overflow:hidden;background:white;
    }
    #bu-bar-paid{background:#214c3e}
    #bu-bar-unpaid{background:#d8d0c2}
    #bu-bar-room{background:white}
    #bu-budget-marker{position:absolute;top:0;bottom:0;width:3px;background:#922d26}
    .bu-bar-labels{display:flex;justify-content:space-between;font-size:12px;margin:6px 0 14px}
    .bu-legend{display:flex;flex-wrap:wrap;gap:12px 20px;font-size:12px}
    .bu-legend span{display:flex;align-items:center;gap:7px}
    .bu-legend i{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}
    #bu-chart-note{margin:14px 0 0}
    .ws-dashboard-shell .ws-edit-icon {
      display:inline-flex;align-items:center;justify-content:center;
      min-width:44px;min-height:44px;padding:9px;
    }
    .ws-edit-with-label {display:inline-flex;align-items:center;gap:6px}
  `;
  document.head.append(style);

  const pencil='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5M4 20l4-1 13-13a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/></svg>';

  function refreshDashboardVisuals(){
    const shortlist=document.getElementById('shortlist-content');
    const intro=shortlist?.querySelector(':scope > p.auth-intro');
    if(intro && !shortlist.querySelector('.ws-shortlist-heading')){
      const panel=document.createElement('div');
      panel.className='ws-shortlist-heading';
      const heading=document.createElement('h2');
      heading.textContent='Your favourite finds, together';
      intro.before(panel);
      panel.append(heading,intro);
    }

    for(const control of document.querySelectorAll('.ws-dashboard-shell button,.ws-dashboard-shell a')){
      if(control.dataset.wsEditIcon)continue;
      const label=control.textContent.trim();
      if(!/^Edit(?:\s|$)/i.test(label))continue;
      control.dataset.wsEditIcon='true';
      const icon=document.createElement('span');
      icon.innerHTML=pencil;
      icon.style.display='inline-flex';
      if(/^Edit$/i.test(label) || control.id==='bu-profile'){
        control.setAttribute('aria-label',control.getAttribute('aria-label') || label);
        control.title=control.getAttribute('aria-label');
        control.replaceChildren(icon);
        control.classList.add('ws-edit-icon');
      }else{
        control.prepend(icon);
        control.classList.add('ws-edit-with-label');
      }
    }
  }
  refreshDashboardVisuals();
  const shell=document.querySelector('.ws-dashboard-shell');
  if(shell)new MutationObserver(refreshDashboardVisuals)
    .observe(shell,{childList:true,subtree:true});
}