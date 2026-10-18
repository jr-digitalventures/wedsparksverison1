export const creditMilestone=(spend,credits=0)=>Math.floor(Math.max(0,(Number(spend)||0)-Math.max(0,Number(credits)||0))/10000)*1000;
export const planningTasks=[
 ['The first decisions',['Agree your wedding priorities','Choose a comfortable budget','Sketch your guest list','Explore dates and venues','Enquire with essential suppliers']],
 ['Bring the plans together',['Compare and confirm supplier quotes','Plan outfits and accessories','Think through guest travel and accommodation','Create your guest groups','Prepare invitations and RSVP instructions']],
 ['The details that make it yours',['Confirm menu and styling choices','Build a wedding-day run sheet','Check supplier access and requirements','Review payment dates','Follow up outstanding RSVPs']],
 ['The wedding week',['Confirm final guest and dietary details','Share the current run sheet','Confirm key contacts and responsibilities','Pack essential items','Leave some room to enjoy it']]
];
export const timelineMoments=[[-360,'Hair & makeup begins'],[-180,'Getting dressed'],[-120,'First look · if you choose one'],[-30,'Guests arrive'],[0,'Ceremony begins'],[30,'Family and wedding-party photos'],[75,'Canapés and drinks'],[150,'Reception begins'],[210,'Dinner is served'],[285,'Speeches'],[330,'Cake cutting'],[345,'First dance']];
export function timelineTime(ceremony,offset){if(!/^\d{2}:\d{2}$/.test(ceremony))return '';const [h,m]=ceremony.split(':').map(Number);if(h>23||m>59)return '';const total=h*60+m+offset,day=Math.floor(total/1440),minute=((total%1440)+1440)%1440;return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}${day<0?' · previous day':day>0?' · next day':''}`;}
export function budgetAllocation(total,percentages){const n=Number(total);if(!Number.isFinite(n)||n<0)return null;return percentages.map(p=>n*Math.max(0,Number(p)||0)/100);}
