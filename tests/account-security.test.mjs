import assert from 'node:assert/strict';
import {createAccountSecurity} from '../dist/shared/account-security-service.js';
function setup(options={}){
 const calls=[];let active=true,current={id:'owner',email:'old@example.test'};
 const verifier={auth:{
  signInWithPassword:async args=>{calls.push(['verify',args]);if(options.afterVerify)options.afterVerify();return options.loginError?{error:options.loginError}:{data:{user:{id:options.verifierId||'owner'}}};},
  signOut:async args=>{calls.push(['cleanup',args]);return{};},
  updateUser:async(attributes,settings)=>{calls.push(['update',attributes,settings]);return options.updateError?{error:options.updateError}:{data:{user:attributes.email?{...current,new_email:attributes.email}:current}};}
 }};
 const client={auth:{
  getUser:async()=>({data:{user:current}}),
  updateUser:async()=>{throw Error('The main login must not be used for a verified update.');},
  reauthenticate:async()=>{calls.push(['code']);return{};}
 }};
 const service=createAccountSecurity({client,createVerifier:()=>verifier,ownerId:'owner',returnUrl:'https://example.test/auth/callback/',isActive:()=>active});
 return{service,calls,client,verifier,setActive:value=>{active=value;},setCurrent:value=>{current=value;}};
}
let app=setup();
const result=await app.service.changeEmail(' new@example.test ','current-pass');
assert.equal(result.pending,true);
assert.equal(result.user.email,'old@example.test');
assert.equal(result.user.new_email,'new@example.test');
assert.deepEqual(app.calls.map(item=>item[0]),['verify','update','cleanup']);
assert.deepEqual(app.calls[0][1],{email:'old@example.test',password:'current-pass'});
assert.equal(app.calls[1][2].emailRedirectTo,'https://example.test/auth/callback/');
assert.deepEqual(app.calls[2][1],{scope:'local'});
console.log('PASS: email changes stay pending, use a password-verified isolated session and clean up only that session.');

app=setup();
await app.service.changePassword('old-password',' new-password-123 ',' new-password-123 ',' 123456 ');
const update=app.calls.find(item=>item[0]==='update')[1];
assert.equal(update.password,' new-password-123 ');
assert.equal(update.current_password,'old-password');
assert.equal(update.nonce,'123456');
assert.equal(app.calls.at(-1)[0],'cleanup');
for(const [password,confirmation] of [['short','short'],['new-password-one','new-password-two'],['old-password','old-password']]){
 const bad=setup();
 await assert.rejects(bad.service.changePassword('old-password',password,confirmation));
 assert.equal(bad.calls.length,0);
}
console.log('PASS: password length, confirmation, password reuse and verification codes are validated without trimming passwords.');

app=setup({loginError:{code:'invalid_credentials'}});
await assert.rejects(app.service.changeEmail('new@example.test','wrong'),/current password was not accepted/);
assert(!app.calls.some(item=>item[0]==='update'));
assert.equal(app.calls.at(-1)[0],'cleanup');
app=setup({verifierId:'different'});
await assert.rejects(app.service.changePassword('old-password','new-password-123','new-password-123'),error=>error.code==='session_changed');
assert(!app.calls.some(item=>item[0]==='update'));
app=setup();
app.setCurrent({id:'different',email:'other@example.test'});
await assert.rejects(app.service.changeEmail('new@example.test','pass'),error=>error.code==='session_changed');
assert.equal(app.calls.length,0);
app=setup({afterVerify:()=>app.setActive(false)});
await assert.rejects(app.service.changePassword('old-password','new-password-123','new-password-123'),error=>error.code==='session_changed');
assert(!app.calls.some(item=>item[0]==='update'));
console.log('PASS: incorrect passwords, mismatched accounts and logout during verification prevent updates.');

for(const code of ['reauthentication_needed','reauthentication_not_valid']){
 app=setup({updateError:{code}});
 await assert.rejects(app.service.changePassword('old-password','new-password-123','new-password-123'),error=>error.code==='verification_required');
 assert.equal(app.calls.at(-1)[0],'cleanup');
}
app=setup({updateError:{status:429}});
await assert.rejects(app.service.changeEmail('new@example.test','pass'),error=>error.code==='rate_limit');
app=setup();await app.service.sendVerificationCode();assert.equal(app.calls[0][0],'code');
app.setActive(false);
await assert.rejects(app.service.sendVerificationCode(),error=>error.code==='session_changed');
assert.equal(app.calls.length,1);
app=setup();
app.setCurrent({id:'owner',email:'old@example.test',new_email:'new@example.test'});
const pending=await app.service.changeEmail('new@example.test','pass');
assert.equal(pending.reused,true);assert(!app.calls.some(item=>item[0]==='update'));
console.log('PASS: verification requirements/rate limits are handled, codes require the current account and pending email requests are not resent.');
