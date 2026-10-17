import { createClient } from './vendor/supabase.js';

const projectUrl = 'https://vfdtyxcfrqnqdyuimtho.supabase.co';
const publishableKey = 'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd';

export function createAccountVerifier(){
  return createClient(projectUrl,publishableKey,{auth:{
    persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,
    flowType:'implicit',storageKey:'wedsparks.account-check.'+crypto.randomUUID()
  }});
}

export const supabase = createClient(
  projectUrl,
  publishableKey,
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
