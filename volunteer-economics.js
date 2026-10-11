/* Conservative gross accommodation-only volunteering opportunity, not net savings. */
(function(g){'use strict';
const valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
function estimate({plannedDays,proposedDays,nightlyBed,hostNightlyBed=0,hostConfirmed=false,extraCostsKnown=false,extraCosts=0,extraDayDailyCost=null}={}){
 const days=valid(plannedDays)?Math.floor(Number(plannedDays)):0;
 const proposed=valid(proposedDays)?Math.floor(Number(proposedDays)):0;
 const overlap=Math.min(days,proposed);
 const extraDays=Math.max(0,proposed-days);
 const bed=valid(nightlyBed)?Number(nightlyBed):null;
 const grossUpperBound=bed===null?null:Math.round(overlap*bed*100)/100;
 const extraDaysPriced=extraDays===0||valid(extraDayDailyCost);
 const confirmedNet=hostConfirmed&&valid(hostNightlyBed)&&extraCostsKnown&&valid(extraCosts)&&extraDaysPriced&&bed!==null
   ?Math.round((overlap*(bed-Number(hostNightlyBed))-extraDays*(Number(hostNightlyBed)+Number(extraDayDailyCost||0))-Number(extraCosts))*100)/100:null;
 return {overlapDays:overlap,extraDays,grossUpperBound,confirmedNet,netVerified:confirmedNet!==null,warning:'Gross lodging opportunity only; unconfirmed host, additional days require explicitly priced meals and daily costs; travel, fees and waiting costs can reduce or eliminate savings.'};
}
g.SouthboundVolunteerEconomics={estimate};
})(typeof window!=='undefined'?window:globalThis);
