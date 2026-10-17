import { supabase } from './supabase-client.js';

export const siteBase = new URL('../', import.meta.url);

export function siteUrl(path = '') {
  return new URL(path.replace(/^\/+/, ''), siteBase).href;
}

export function safeReturnPath(value) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020]/.test(value) ||
    /%(?:2f|5c|0[0-9a-f]|1[0-9a-f])/i.test(value)
  ) {
    return null;
  }

  try {
    const target = new URL(value, siteBase);

    if (
      target.origin !== siteBase.origin ||
      !target.pathname.startsWith(siteBase.pathname)
    ) {
      return null;
    }

    const relative = target.pathname.slice(siteBase.pathname.length);
    const allowed = [
      'dashboard/profile','dashboard/profile/','dashboard/profile/index.html',
      'dashboard/messages', 'dashboard/messages/',
      'dashboard/messages/index.html',
      'supplier-account/messages', 'supplier-account/messages/',
      'supplier-account/messages/index.html',
      '', 'index.html',
      'supplier','supplier/','supplier/index.html',
      'marketplace-search', 'marketplace-search/',
      'marketplace-search/index.html',
      'supplier-category', 'supplier-category/',
      'supplier-category/index.html'
    ];

    return (allowed.includes(relative) || /^supplier-account(?:\/(?:messages|bookings|availability|storefront|reviews|pricing-packages|account-settings|profile-health|settings|profile|leads))?(?:\/(?:index\.html)?)?$/.test(relative) || /^wedding-suppliers(?:\/[a-z0-9-]+){0,2}\/?$/.test(relative))
      ? target.pathname + target.search + target.hash
      : null;
  } catch {
    return null;
  }
}

export async function verifiedUser() {
  const { data, error } = await supabase.auth.getUser();

  return !error && data.user?.email_confirmed_at
    ? data.user
    : null;
}

export async function requireUser(returnPath) {
  const user = await verifiedUser();
  if (user) return user;

  const login = new URL(siteUrl('login/'));
  const safePath = safeReturnPath(returnPath);
  if (safePath) login.searchParams.set('returnTo', safePath);

  window.location.replace(login.href);
  return null;
}

export async function loadAccount(user) {
  if (!user) throw new Error('Please log in to continue.');

  const { error: setupError } = await supabase.rpc('initialize_account');

  if (setupError) {
    throw new Error('We couldn’t prepare your account. Please try again.');
  }

  const [profile, roles, couple] = await Promise.all([
    supabase.from('profiles')
      .select('user_id, first_name, last_name, initial_experience')
      .eq('user_id', user.id).single(),

    supabase.from('user_roles')
      .select('role').eq('user_id', user.id),

    supabase.from('couple_profiles')
      .select('*').eq('user_id', user.id).maybeSingle()
  ]);

  if (profile.error || roles.error || couple.error) {
    throw new Error('We couldn’t load your account. Please try again.');
  }

  return {
    user,
    profile: profile.data,
    roles: roles.data.map(record => record.role),
    couple: couple.data
  };
}

export function accountDestination(account) {
  if (
    account.profile.initial_experience === 'couple' &&
    account.roles.includes('couple')
  ) {
    const finished = account.couple?.onboarding_finished_at;
    const skipped = account.couple?.onboarding_skipped_at;

    return siteUrl(
      finished || skipped ? 'dashboard/' : 'onboarding/'
    );
  }

  return siteUrl('supplier-account/');
}

export function profileCompletion(account) {
  const questions = [
    ['wedding_date', 'Wedding date'],
    ['wedding_location', 'Wedding location'],
    ['wedding_budget', 'Wedding budget'],
    ['guest_count', 'Guest estimate']
  ];

  const items = [
    {
      key: 'account',
      label: 'Your account details',
      complete: Boolean(
        account.profile.first_name?.trim() &&
        account.profile.last_name?.trim()
      )
    },
    ...questions.map(([key, label]) => {
      const status = account.couple?.[`${key}_status`] ?? 'unanswered';

      return {
        key,
        label,
        status,
        complete: status === 'provided' || status === 'unknown'
      };
    })
  ];

  return {
    percentage: Math.round(
      items.filter(item => item.complete).length / items.length * 100
    ),
    items,
    missing: items.filter(item => !item.complete)
  };
}

export function onSessionChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback({ event, user: session?.user ?? null });
  });

  return () => data.subscription.unsubscribe();
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error('We couldn’t log you out. Please try again.');
  }

  window.location.replace(siteBase.href);
}
