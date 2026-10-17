import {supabase,createAccountVerifier} from './supabase-client.js';
import {siteUrl,onSessionChange} from './auth.js';
import {createAccountSecurity} from './account-security-service.js';
const mounted=new WeakMap();
let stylesAdded=false;
export function mountAccountSecurity(container,account){
  if(mounted.has(container))return mounted.get(container);
  let user=account.user,revoked=false,busy=false,refreshing=false;
  const owner=user.id;
  const wrapper=document.createElement('section');
  wrapper.className='ws-account-security';
  const suffix=crypto.randomUUID();
  const field=(name,label,type,autocomplete,extra='')=>
    '<div class="ws-security-field"><label for="'+suffix+'-'+name+'">'+label+'</label><input id="'+suffix+'-'+name+'" name="'+name+'" type="'+type+'" autocomplete="'+autocomplete+'" '+extra+'></div>';
  wrapper.innerHTML=
    '<section class="ws-security-card"><h2>Your account</h2><dl class="ws-security-details"><div><dt>Name</dt><dd data-security-name></dd></div><div><dt>Sign-in email</dt><dd data-security-email></dd></div></dl><p data-security-pending class="ws-security-note" hidden></p></section>'+
    '<section class="ws-security-card"><h2>Change email address</h2><p>Confirm your new address through the emails we send you.</p><form data-security-form="email">'+
    field('email','New email address','email','email','required maxlength="254"')+
    field('emailPassword','Current password','password','current-password','required')+
    '<button type="submit" class="ws-security-primary">Change email address</button><p data-security-status="email" role="status" aria-live="polite"></p></form></section>'+
    '<section class="ws-security-card"><h2>Change password</h2><form data-security-form="password">'+
    field('currentPassword','Current password','password','current-password','required')+
    field('password','New password','password','new-password','required minlength="10" maxlength="128" aria-describedby="'+suffix+'-password-help"')+
    '<p id="'+suffix+'-password-help" class="ws-security-note">Use at least 10 characters.</p>'+
    field('confirmPassword','Confirm new password','password','new-password','required minlength="10" maxlength="128"')+
    '<label class="ws-security-show"><input type="checkbox" data-security-show> Show passwords</label>'+
    '<div data-security-code hidden>'+field('nonce','Email verification code','text','one-time-code','inputmode="numeric" maxlength="20"')+
    '<button type="button" data-security-send-code class="ws-security-link">Send verification code</button><p data-security-code-status role="status"></p></div>'+
    '<button type="submit" class="ws-security-primary">Save new password</button><p data-security-status="password" role="status" aria-live="polite"></p></form><a data-security-forgot>Forgot your password?</a></section>';
  container.append(wrapper);
  const find=selector=>wrapper.querySelector(selector);
  const emailForm=find('[data-security-form="email"]');
  const passwordForm=find('[data-security-form="password"]');
  const elements=name=>find('[name="'+name+'"]');
  const callback=new URL(siteUrl('auth/callback/'));
  callback.searchParams.set('returnTo',new URL(siteUrl(document.body.dataset.account==='supplier'
    ?'supplier-account/profile/':'dashboard/profile/')).pathname);
  const service=createAccountSecurity({
    client:supabase,createVerifier:createAccountVerifier,ownerId:owner,
    returnUrl:callback.href,isActive:()=>!revoked
  });
  find('[data-security-forgot]').href=siteUrl('forgot-password/');
  find('[data-security-name]').textContent=[account.profile.first_name,account.profile.last_name].filter(Boolean).join(' ')||'Your account';
  function displayUser(next){
    user=next;
    find('[data-security-email]').textContent=user.email||'';
    const pending=find('[data-security-pending]');
    pending.hidden=!user.new_email;
    pending.textContent=user.new_email?'A change to '+user.new_email+' is awaiting email confirmation.':'';
  }
  displayUser(user);
  function status(which,text,error=false){
    const el=find('[data-security-status="'+which+'"]');
    el.textContent=text;el.classList.toggle('is-error',error);
  }
  function lock(value){
    busy=value;
    wrapper.querySelectorAll('input,button').forEach(el=>{el.disabled=value||revoked;});
  }
  function visible(){return !revoked&&wrapper.isConnected&&!wrapper.closest('main')?.hidden&&!document.hidden;}
  async function refreshUser(){
    if(!visible()||busy||refreshing)return;
    refreshing=true;
    try{
      const fresh=await service.currentUser();
      if(!revoked)displayUser(fresh);
    }catch(error){
      if(error.code==='session_changed')revoke();
    }finally{refreshing=false;}
  }
  function revoke(){
    revoked=true;lock(true);
    wrapper.querySelectorAll('input').forEach(input=>{input.value='';});
    wrapper.replaceChildren();
  }
  emailForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||revoked||!emailForm.reportValidity())return;
    const email=elements('email').value;
    const password=elements('emailPassword').value;
    lock(true);status('email','Updating your email request…');
    try{
      const result=await service.changeEmail(email,password);
      if(revoked)return;
      displayUser(result.user);
      elements('emailPassword').value='';
      status('email',result.pending
        ?'Check your inboxes and follow the confirmation links to finish changing your email. Your sign-in email stays the same until confirmation is complete.'
        :'Your email address has been updated.');
    }catch(error){
      if(!revoked){elements('emailPassword').value='';status('email',error.message,true);}
    }finally{if(!revoked)lock(false);}
  });
  passwordForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||revoked||!passwordForm.reportValidity())return;
    const values=['currentPassword','password','confirmPassword','nonce'].map(name=>elements(name).value);
    lock(true);status('password','Saving your new password…');
    try{
      await service.changePassword(...values);
      if(revoked)return;
      passwordForm.reset();
      ['currentPassword','password','confirmPassword'].forEach(name=>{elements(name).type='password';});
      find('[data-security-code]').hidden=true;
      elements('nonce').required=false;
      find('[data-security-code-status]').textContent='';
      status('password','Your password has been updated.');
    }catch(error){
      if(!revoked){
        if(error.code==='verification_required'){
          find('[data-security-code]').hidden=false;
          elements('nonce').required=true;
        }else{
          ['currentPassword','password','confirmPassword'].forEach(name=>{elements(name).value='';});
        }
        status('password',error.message,true);
      }
    }finally{if(!revoked)lock(false);}
  });
  find('[data-security-send-code]').addEventListener('click',async()=>{
    if(busy||revoked)return;
    lock(true);
    const notice=find('[data-security-code-status]');notice.textContent='Sending your code…';
    try{await service.sendVerificationCode();if(!revoked)notice.textContent='A verification code has been sent to your email.';}
    catch(error){if(!revoked)notice.textContent=error.message;}
    finally{if(!revoked)lock(false);}
  });
  find('[data-security-show]').addEventListener('change',event=>{
    for(const name of ['currentPassword','password','confirmPassword'])elements(name).type=event.target.checked?'text':'password';
  });
  let unsubscribe=()=>{};
  unsubscribe=onSessionChange(({event,user:next})=>{
    if(next?.id!==owner){revoke();unsubscribe();return;}
    if(event==='USER_UPDATED'&&!revoked)displayUser(next);
  });
  const clearPasswords=()=>{
    if(revoked)return;
    wrapper.querySelectorAll('input').forEach(input=>{
      if(input.autocomplete==='current-password'||input.autocomplete==='new-password'||input.name==='nonce'){
        input.value='';
        if(input.name!=='nonce')input.type='password';
      }
    });
    find('[data-security-show]').checked=false;
  };
  window.addEventListener('wedsparks:section-open',event=>{
    if(!visible()||!['profile'].includes(event.detail))clearPasswords();
    else void refreshUser();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearPasswords();
    else void refreshUser();
  });
  window.addEventListener('pagehide',clearPasswords);
  window.addEventListener('focus',()=>void refreshUser());
  const result={refresh:refreshUser};
  mounted.set(container,result);
  if(!stylesAdded){
    stylesAdded=true;
    const style=document.createElement('style');
    style.textContent=[
      '.ws-account-security{display:grid;gap:22px;margin-top:28px;font:15px/1.6 var(--sans);color:var(--ink)}',
      '.ws-security-card{padding:25px;border:1px solid var(--line);border-radius:14px;background:white}',
      '.ws-security-card h2{font:400 27px/1.25 var(--serif);margin:0 0 14px;color:var(--green)}',
      '.ws-security-card p{color:#59645d}',
      '.ws-security-details{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:0}',
      '.ws-security-details dt{font-size:13px;color:#59645d}.ws-security-details dd{margin:4px 0 0;overflow-wrap:anywhere}',
      '.ws-security-field{margin-bottom:17px;max-width:540px}',
      '.ws-security-field label{display:block;margin-bottom:6px}',
      '.ws-security-field input{box-sizing:border-box;width:100%;padding:11px 13px;border:1px solid #bdc8be;border-radius:8px;background:white;color:#172a24;font:16px/1.5 var(--sans)}',
      '.ws-security-note{font-size:13px}.ws-security-show{display:flex;align-items:center;gap:9px;margin:0 0 18px}',
      '.ws-security-show input{width:18px;height:18px;accent-color:#213e34}',
      '.ws-account-security .ws-security-primary{width:auto;min-height:46px;padding:12px 19px;background:#213e34;color:white;border:0;border-radius:8px;font:600 14px/1.4 var(--sans);cursor:pointer}',
      '.ws-account-security .ws-security-primary:disabled{opacity:.5;cursor:wait}',
      '.ws-security-link{background:transparent;border:0;padding:5px 0;color:#213e34;text-decoration:underline;font:inherit;cursor:pointer}',
      '.ws-account-security a{color:#213e34}.ws-account-security [hidden]{display:none!important}',
      '.ws-account-security .is-error{color:#9c322c}',
      '.ws-account-security input:focus-visible,.ws-account-security button:focus-visible{outline:3px solid #ad7542;outline-offset:3px}',
      '@media(max-width:550px){.ws-security-details{grid-template-columns:1fr}.ws-security-card{padding:21px}}'
    ].join('\n');
    document.head.append(style);
  }
  return result;
}
