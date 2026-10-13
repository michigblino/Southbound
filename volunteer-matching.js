/* Source-neutral volunteer profile and host filtering. No live host feed. */
(function(g){'use strict';
const defaults=Object.freeze({maxHoursPerWeek:30,minStayDays:7,maxStayDays:28,radiusKm:20,flexibilityDays:3,activities:[],food:'preferred'});
const number=(v,fallback)=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):fallback;
function normalizeProfile(raw={}){
 return {maxHoursPerWeek:number(raw.maxHoursPerWeek,defaults.maxHoursPerWeek),minStayDays:number(raw.minStayDays,defaults.minStayDays),maxStayDays:number(raw.maxStayDays,defaults.maxStayDays),radiusKm:number(raw.radiusKm,defaults.radiusKm),flexibilityDays:number(raw.flexibilityDays,defaults.flexibilityDays),activities:Array.isArray(raw.activities)?raw.activities.filter(x=>typeof x==='string'):[],food:['required','preferred','any'].includes(raw.food)?raw.food:defaults.food};
}
function evaluate(host,profileInput={}){
 const p=normalizeProfile(profileInput),reasons=[],unknown=[];
 if(!host||typeof host!=='object')return {status:'excluded',reasons:['invalid-host'],unknown:[]};
 const h=host.hoursPerWeek;
 if(h===null||h===undefined||h==='')unknown.push('hours');else if(!Number.isFinite(Number(h)))unknown.push('hours');else if(Number(h)>p.maxHoursPerWeek)unknown.push('hours-over-preference');
 if(host.distanceKm!==undefined&&host.distanceKm!==null&&Number.isFinite(Number(host.distanceKm))){if(Number(host.distanceKm)>p.radiusKm)reasons.push('outside-radius');}else unknown.push('distance');
 if(host.minStayDays!==undefined&&host.minStayDays!==null){if(Number(host.minStayDays)>p.maxStayDays)reasons.push('minimum-stay-too-long');}else unknown.push('minimum-stay');
 if(host.maxStayDays!==undefined&&host.maxStayDays!==null){if(Number(host.maxStayDays)<p.minStayDays)reasons.push('maximum-stay-too-short');}
 if(p.food==='required'){if(host.mealsIncluded===false)reasons.push('meals-not-included');else if(host.mealsIncluded!==true)unknown.push('meals');}
 if(p.activities.length){if(!Array.isArray(host.activities))unknown.push('activities');else if(!host.activities.some(a=>p.activities.includes(a)))reasons.push('activity-mismatch');}
 if(host.availabilityConfirmed!==true)unknown.push('availability');
 return {status:reasons.length?'excluded':unknown.length?'needs-verification':'eligible',reasons,unknown};
}
function match(hosts,profile){
 const seen=new Set(),results=[];
 for(const host of hosts||[]){
  const key=host?.canonicalHostId||[host?.platform,host?.id].join(':');
  if(key&&key!==':'&&seen.has(key))continue;
  if(key&&key!==':')seen.add(key);
  results.push({...host,assessment:evaluate(host,profile)});
 }
 return results;
}
g.SouthboundVolunteerMatching={defaults,normalizeProfile,evaluate,match};
})(typeof window!=='undefined'?window:globalThis);
