import { supabase } from './supabase-client.js';
import { verifiedUser, loadAccount, onSessionChange } from './auth.js';

const panel = document.createElement('section');
panel.style.cssText = 'margin-top:40px;padding-top:28px;border-top:1px solid #dedbd6';
panel.innerHTML = `
  <h2 style="font:400 30px Georgia,serif">Try saving suppliers</h2>
  <p>These are real suppliers from WedSparks.</p>
  <p role="status" aria-live="polite">Loading suppliers...</p>
  <ul style="list-style:none;padding:0"></ul>
`;
const container = document.querySelector('#private-content');
container?.append(panel);

const status = panel.querySelector('[role="status"]');
const list = panel.querySelector('ul');
let revision = 0;

onSessionChange(() => {
  revision++;
  list.replaceChildren();
  status.textContent = 'Loading suppliers...';
  // Keep database calls outside the authentication callback.
  setTimeout(() => start(), 0);
});

async function start() {
  const current = ++revision;
  list.replaceChildren();

  try {
    const user = await verifiedUser();
    if (current !== revision) return;

    if (!user) {
      status.textContent = 'Log in to see your favourites.';
      return;
    }

    const account = await loadAccount(user);
    if (current !== revision) return;

    if (!account.roles.includes('couple')) {
      status.textContent = 'Favourites are available with a wedding planning account.';
      return;
    }

    const [vendors, favourites] = await Promise.all([
      supabase.from('Vendor Public Profiles')
        .select('vendor_id,"Name of Wedding Vendor"')
        .eq('Profile Active', true)
        .order('Name of Wedding Vendor')
        .limit(5),
      supabase.from('saved_suppliers')
        .select('vendor_id')
        .eq('user_id', user.id)
    ]);

    if (current !== revision) return;
    if (vendors.error || favourites.error) throw new Error();

    const saved = new Set(favourites.data.map(row => row.vendor_id));
    status.textContent = vendors.data.length
      ? 'Save a supplier, then refresh to check it stays saved.'
      : 'No active suppliers found.';

    for (const vendor of vendors.data) {
      const item = document.createElement('li');
      item.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 0;border-bottom:1px solid #dedbd6';

      const name = document.createElement('span');
      name.textContent = vendor['Name of Wedding Vendor'];

      const button = document.createElement('button');
      button.type = 'button';
      button.style.cssText =
        'min-height:44px;padding:10px 18px;border:1px solid #103e33;border-radius:7px;cursor:pointer';

      function render() {
        const selected = saved.has(vendor.vendor_id);
        button.textContent = selected ? 'Saved — remove' : 'Save supplier';
        button.setAttribute('aria-pressed', String(selected));
        button.setAttribute('aria-label',
          `${selected ? 'Remove' : 'Save'} ${name.textContent}`);
        button.style.background = selected ? '#103e33' : '#fff';
        button.style.color = selected ? '#fff' : '#103e33';
      }

      button.addEventListener('click', async () => {
        if (button.disabled || current !== revision) return;
        button.disabled = true;
        status.textContent = '';

        try {
          const removing = saved.has(vendor.vendor_id);
          let result;

          if (removing) {
            result = await supabase.from('saved_suppliers')
              .delete()
              .eq('user_id', user.id)
              .eq('vendor_id', vendor.vendor_id)
              .select('vendor_id');
          } else {
            result = await supabase.from('saved_suppliers')
              .insert({ user_id: user.id, vendor_id: vendor.vendor_id })
              .select('vendor_id');
          }

          if (current !== revision) return;
          if (result.error || result.data?.length !== 1) throw new Error();

          if (removing) saved.delete(vendor.vendor_id);
          else saved.add(vendor.vendor_id);

          render();
          status.textContent = removing
            ? `${name.textContent} removed from favourites.`
            : `${name.textContent} saved to favourites.`;
        } catch {
          if (current === revision) {
            status.textContent =
              'Could not confirm the change. Refresh and try again.';
          }
        } finally {
          button.disabled = false;
        }
      });

      render();
      item.append(name, button);
      list.append(item);
    }
  } catch {
    if (current === revision) {
      status.textContent = 'Could not load favourites. Please refresh.';
    }
  }
}

if (container) start();
