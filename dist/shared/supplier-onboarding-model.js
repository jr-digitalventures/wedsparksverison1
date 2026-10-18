import {cleanWorkspace,safeWebUrl} from './supplier-workspace-model.js';
export const supplierSetupSteps=['Bring your details','Your business','Your location','Your storefront','Your services','Review your profile'];
export const setupFields=[[],['name','category','website'],['country','city','state','serviceAreas'],['tagline','about','features'],['startingPrice'],[]];
export function setupProgress(value){
 const v=value&&typeof value==='object'?value:{};
 return {step:Number.isInteger(v.step)?Math.min(6,Math.max(0,v.step)):0,startedAt:typeof v.startedAt==='string'?v.startedAt:null,completedAt:typeof v.completedAt==='string'?v.completedAt:null,skippedSteps:Array.isArray(v.skippedSteps)?[...new Set(v.skippedSteps.filter(n=>Number.isInteger(n)&&n>=0&&n<6))]:[],sourceUrl:typeof v.sourceUrl==='string'?v.sourceUrl.slice(0,1500):''};
}
export function setupDestination(workspace,{entry=false,linked=false}={}){
 const progress=setupProgress(workspace.onboarding);
 return entry&&(progress.completedAt||(!progress.startedAt&&linked))?'dashboard':'setup';
}
export function nextSetup(workspace,step,values={},skip=false,now=new Date().toISOString()){
 const next=cleanWorkspace(structuredClone(workspace)),progress=setupProgress(next.onboarding);
 if(!skip)for(const key of setupFields[step]||[]){
   const value=String(values[key]??next.storefront[key]??'').trim();
   if(value.length>(['about','features','serviceAreas'].includes(key)?6000:250))throw new Error('Please shorten '+key+'.');
   if(key==='website'&&value&&!safeWebUrl(value))throw new Error('Use a full website address starting with https:// or http://.');
   if(key==='startingPrice'&&value&&(!/^\d+(?:\.\d{1,2})?$/.test(value)||Number(value)>10000000))throw new Error('Enter a valid starting price, or leave it blank.');
   if(key==='country'&&value&&!['AU','NZ'].includes(value))throw new Error('Choose Australia or New Zealand.');
   next.storefront[key]=value;
 }
 progress.startedAt ||=now;progress.step=Math.min(6,step+1);
 progress.skippedSteps=progress.skippedSteps.filter(n=>n!==step);if(skip)progress.skippedSteps.push(step);
 if(step===5)progress.completedAt=now;
 next.onboarding=progress;return next;
}
