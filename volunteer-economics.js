/* Conservative gross accommodation-only volunteering opportunity, not net savings. */
(function(g){'use strict';
const valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
function estimate({plannedDays,proposedDays,nightlyBed,hostNightlyBed=0,hostConfirmed=false,extraCostsKnown=false,extraCosts=0}={}){
 const days=valid(plannedDays)?Math.floor(Number(plannedDays)):0;
 const proposed=valid(proposedDays)?Math.floor(Number(proposedDays)):0;
 const overlap=Math.min(days,proposed);
 const extraDays=Math.max(0,proposed-days);
 const bed=valid(nightlyBed)?Number(nightlyBed):null;
 const grossUpperBound=bed===null?null:Math.round(overlap*bed*100)/100;
 const confirmedNet=hostConfirmed&&valid(hostNightlyBed)&&extraCostsKnown&&valid(extraCosts)&&bed!==null
   ?Math.round((overlap*(bed-Number(hostNightlyBed))-extraDays*Number(hostNightlyBed)-Number(extraCosts))*100)/100:null;
 return {overlapDays:overlap,extraDays,grossUpperBound,confirmedNet,netVerified:confirmedNet!==null,warning:'Gross lodging opportunity only; unconfirmed host, additional days, meals, travel, fees and waiting costs can reduce or eliminate savings.'};
}
g.SouthboundVolunteerEconomics={estimate};
})(typeof window!=='undefined'?window:globalThis);
