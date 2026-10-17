export const MIN_PASSWORD_LENGTH = 10;
export class AccountSecurityError extends Error {
  constructor(message,code=''){super(message);this.code=code;}
}
export function createAccountSecurity({client,createVerifier,ownerId,returnUrl,isActive=()=>true}){
  const fail=(message,code)=>{throw new AccountSecurityError(message,code);};
  const active=()=>{if(!isActive())fail('Your sign-in has changed. Please log in again.','session_changed');};
  async function currentUser(){
    active();
    const {data,error}=await client.auth.getUser();
    active();
    if(error||!data?.user||data.user.id!==ownerId)
      fail('Please log in again before changing your account.','session_changed');
    return data.user;
  }
  function authError(error){
    if(error?.status===429)fail('Please wait a few minutes before trying again.','rate_limit');
    if(['reauthentication_needed','reauthentication_not_valid'].includes(error?.code))
      fail('Enter a fresh verification code from your email to finish changing your password.','verification_required');
    if(error?.code==='same_password')fail('Choose a password different from your current one.');
    if(error?.code==='weak_password')fail('Please choose a stronger password with at least 10 characters.');
    if(error?.code==='email_exists'||error?.code==='user_already_exists')
      fail('That email address cannot be used. Try another address.');
    if(error?.code==='invalid_credentials'||error?.code==='invalid_current_password')
      fail('Your current password was not accepted. Please try again.');
    fail('Could not save this change. Please try again.');
  }
  async function withVerifiedPassword(user,password,action){
    if(!password)fail('Enter your current password.');
    active();
    const verifier=createVerifier();
    try{
      const {data,error}=await verifier.auth.signInWithPassword({email:user.email,password});
      active();
      if(error){if(error.status===429)authError(error);fail('Your current password was not accepted. Please try again.');}
      if(data?.user?.id!==ownerId)fail('Your sign-in has changed. Please log in again.','session_changed');
      await currentUser();
      active();
      return await action(verifier);
    }finally{
      try{await verifier.auth.signOut({scope:'local'});}catch{}
    }
  }
  return {
    currentUser,
    async changeEmail(email,password){
      const next=String(email||'').trim();
      if(next.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next))fail('Enter a valid email address.');
      const user=await currentUser();
      if(next.toLowerCase()===String(user.email||'').toLowerCase())fail('This is already your sign-in email.');
      return withVerifiedPassword(user,password,async verifier=>{
        const fresh=await currentUser();
        if(next.toLowerCase()===String(fresh.new_email||'').toLowerCase())
          return {user:fresh,pending:true,reused:true};
        active();
        const {data,error}=await verifier.auth.updateUser({email:next},{emailRedirectTo:returnUrl});
        active();
        if(error)authError(error);
        if(data?.user?.id!==ownerId)fail('Please log in again.','session_changed');
        return {user:data.user,pending:String(data.user.email).toLowerCase()!==next.toLowerCase(),requestedEmail:next};
      });
    },
    async changePassword(currentPassword,password,confirmation,nonce=''){
      if(typeof password!=='string'||password.length<MIN_PASSWORD_LENGTH||password.length>128)
        fail('Use a new password with 10 to 128 characters.');
      if(password!==confirmation)fail('Your new passwords do not match.');
      if(password===currentPassword)fail('Choose a password different from your current one.');
      const user=await currentUser();
      return withVerifiedPassword(user,currentPassword,async verifier=>{
        const attributes={password,current_password:currentPassword};
        if(nonce.trim())attributes.nonce=nonce.trim();
        active();
        const {data,error}=await verifier.auth.updateUser(attributes);
        active();
        if(error)authError(error);
        if(data?.user?.id!==ownerId)fail('Please log in again.','session_changed');
        return data.user;
      });
    },
    async sendVerificationCode(){
      await currentUser();
      const {error}=await client.auth.reauthenticate();
      active();
      if(error)authError(error);
    }
  };
}
