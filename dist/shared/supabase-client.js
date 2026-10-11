import { createClient } from './vendor/supabase.js';

export const supabase = createClient(
  'https://vfdtyxcfrqnqdyuimtho.supabase.co',
  'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storageKey: 'wedsparks.auth'
    }
  }
);
