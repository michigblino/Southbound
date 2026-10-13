/* Scenario exploration for the current local itinerary; NEVER a booking or a verified route quote.
 * Exact calculations only for the static daily-rate assumptions; transfers and season
 * must be rechecked when dates or stages change.
 */
(function(root){'use strict';
const nonneg=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
const money=x=>Math.round((x+Number.EPSILON)*100)/100;
const day=x=>Math.max(0,Math.floor(nonneg(x)||0));
const nature=/Chapada|Lençóis|Salento|Minca|Cusco|Uyuni|Atacama|Bariloche|Chaltén|Torres|Paraty|Huacachina|Iguaçu|Tayrona|Machu|Amazon|Pantanal|Galápagos|Patagon/i;
function optimize({items=[],bookings=[],vol={},volunteerDetails={},completed={},preferences={},goal=8000,baselineTotal=null}={}){
 const all=Array.isArray(items)?items:[],records=Array.isArray(bookings)?bookings:[],
 confirmed=records.filter(b=>b?.status==='confirmed'),
 committed=records.filter(b=>b?.status==='confirmed'||(nonneg(b?.paidEUR)||0)>(nonneg(b?.refundedEUR)||0));
 const allowedHours=Math.min(30,nonneg(preferences.maxVolunteerHours)??30);
 const maxHostDays=Math.min(28,Math.floor((nonneg(preferences.maxVolunteerWeeks)??4)*7));
 const mustVisit=String(preferences.mustVisit||'').split(',').map(x=>x.trim().toLocaleLowerCase('de')).filter(Boolean);
 const stages=all.filter(x=>x&&!x.isReturn&&Number.isInteger(x.i)&&x.i>=0);
 const first=stages.at(0)?.i,last=stages.at(-1)?.i;
 const locked=new Set(committed.filter(b=>b&&Number.isInteger(b.stageId)).map(b=>b.stageId));
 const usable=stages.filter(s=>!completed[s.i]&&!locked.has(s.i)&&!(vol[s.i]===true&&volunteerDetails[s.i]?.confirmed===true));
 const minutes=x=>({i:x.i,name:x.name,from:day(x.days),to:day(x.days),hostNights:0,regularBed:nonneg(x.regularBed)??nonneg(x.bed),dailyOther:(nonneg(x.food)||0)+(nonneg(x.leisure)||0)+(nonneg(x.other)||0)});
 const source=new Map(stages.map(x=>[x.i,minutes(x)]));
 const amount=x=>{const bed=nonneg(x.regularBed),other=nonneg(x.dailyOther);return bed===null?null:money((x.to-x.hostNights)*bed+x.to*other)};
 const hoursValid=s=>{
  const raw=volunteerDetails[s.i]?.hoursPerWeek??volunteerDetails[s.i]?.hours;
  const hours=nonneg(raw);
  return raw===null||raw===undefined||raw===''||hours!==null&&hours<=allowedHours;
 };
 const hostPossible=s=>maxHostDays>=21&&hoursValid(s)&&!committed.some(b=>b.type==='lodging'&&b.stageId===s.i);
 const safeName=s=>mustVisit.some(k=>String(s.name).toLocaleLowerCase('de').includes(k));
 const safeMin=(s,mode)=>{
  const n=day(s.days),important=nature.test(s.name)||safeName(s),base=mode==='aggressive'?(important?3:2):(important?5:3);
  return Math.min(n,base);
 };
 const calculate=(name,mode)=>{
  const entries=stages.map(s=>({...source.get(s.i)}));
  const map=new Map(entries.map(x=>[x.i,x]));
  let removed=0;
  for(const s of usable){
   if(s.i===first||s.i===last)continue;
   const x=map.get(s.i),target=safeMin(s,mode==='aggressive'?'aggressive':'balanced');
   if(mode==='volunteer'&&x.to>=21)continue;
   removed+=Math.max(0,x.to-target);x.to=target;
  }
  if(mode==='volunteer'){
   // Use a fixed-duration pool for longer host stays, never silently extend travel.
   const choices=usable.filter(s=>hostPossible(s))
     .map(s=>({s,x:map.get(s.i),bed:source.get(s.i)?.regularBed}))
     .filter(c=>nonneg(c.bed)!==null)
     .sort((a,b)=>((b.bed||0)-(a.bed||0))||(a.s.i-b.s.i));
   let hostCount=0;
   for(const c of choices){
    const {x,s}=c;const from=x.to;
    let to=from>=21?from:21;
    const extra=Math.max(0,to-from);
    if(extra>removed||hostCount>=6)continue;
    // Do not simulate zero-price beds for already-confirmed host services.
    const nights=Math.min(to,maxHostDays);
    if(nights<21)continue;
    const prev=amount(x);
    const after=money((to-nights)*x.regularBed+to*x.dailyOther);
    if(prev===null||after>=prev+removed*0) {
      // If extending a short stage, admit only if the new host stay improves
      // the end-to-end rate model, including all additional day costs.
      if(extra||prev===null||after>=prev)continue;
    }
    if(after>=prev&&extra===0)continue;
    x.to=to;x.hostNights=nights;removed-=extra;hostCount++;
   }
  }
  const rows=[],blocked=[];
  let old=0,next=0,daysDelta=0,hostNights=0;
  for(const s of stages){
   const x=map.get(s.i),before=source.get(s.i),base=amount(before),after=amount(x);
   if(base===null||after===null){blocked.push(s.i);continue;}
   old+=base;next+=after;daysDelta+=x.to-before.from;hostNights+=x.hostNights;
   if(x.to!==before.from||x.hostNights)rows.push({
    i:x.i,name:x.name,from:before.from,to:x.to,hostNights:x.hostNights,
    delta:money(base-after)
   });
  }
  const gross=money(old-next),forecast=nonneg(baselineTotal)===null?null:money(Number(baselineTotal)-gross);
  return {name,mode,actions:rows,modelSaving:gross,forecast,remainingToGoal:forecast===null?null:money(Math.max(0,forecast-(nonneg(goal)||0))),
   daysDelta,hostNights,affectedStops:rows.length,blocked,
   complete:false,verifiedSavings:null,
   warning:'Bedingtes Rechenmodell ohne bestätigte Host-Zusage, neue Transfers, Buchungsänderungen, saisonale Preise oder Sicherheitsprüfung. Die Ersparnis darf nicht als verfügbarer Reisepreis ausgegeben werden.'};
 };
 return {goal:nonneg(goal)||0,baselineTotal:nonneg(baselineTotal),options:[
   calculate('Kürzere Route','balanced'),calculate('Intensiv sparen','aggressive'),calculate('Viel Volunteering','volunteer')],
  constraints:{maxHostDays,allowedHours,confirmedStages:[...locked],unknownFareCount:all.filter(x=>x.leg===null).length}};
}
root.SouthboundBudgetVariants={optimize};
if(typeof module!=='undefined'&&module.exports)module.exports=root.SouthboundBudgetVariants;
})(typeof globalThis!=='undefined'?globalThis:this);
