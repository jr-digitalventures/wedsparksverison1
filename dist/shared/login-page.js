import { createLoginForm, loginDestination } from './login-ui.js';
import { verifiedUser, safeReturnPath } from './auth.js';

const main = document.querySelector('#login-content');
const returnTo = safeReturnPath(
  new URLSearchParams(location.search).get('returnTo')
);

async function start() {
  try {
    if (await verifiedUser()) {
      location.replace(await loginDestination(returnTo));
      return;
    }
  } catch {}

  main.replaceChildren(createLoginForm({ returnTo }));
}

start();
