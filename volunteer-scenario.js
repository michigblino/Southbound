/* Date-aware, conservative comparison of a proposed volunteer stay against the current route. */
(function(g){'use strict';
const amount=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function compare({stops=[],start,stopId,proposedDays,host={},options={},budget={}}={}){
 const itinerary=g.SouthboundItinerary,timing=g.SouthboundRouteTiming,snapshot=g.SouthboundRouteBudget?.snapshot;
 if(!itinerary||!timing||!snapshot)throw Error('Volunteer scenario dependencies unavailable');
 const opts={...options,stops,start};
 const baseline=itinerary.plan(opts);
 const target=baseline.items.find(x=>x.i===stopId);
 if(!target||stops[stopId]?.[14]==='return')return {valid:false,reasons:['missing-or-return-stop']};
 const n=Number(proposedDays);
 if(!Number.isInteger(n)||n<1||n>180)return {valid:false,reasons:['invalid-proposed-days']};
 const nightly=amount(host.night);
 const hostConfirmed=host.confirmed===true&&nightly!==null;
 const volunteerDetails={...(options.volunteerDetails||{}),[stopId]:{...host}};
 const vol={...(options.vol||{}),[stopId]:hostConfirmed};
 const days={...(options.days||{}),[stopId]:n};
 const candidate=itinerary.plan({...opts,days,vol,volunteerDetails});
 // Host meals are not assumed free: require an explicit daily amount for a priced comparison.
 const hostFood=amount(host.foodPerDay);
 if(hostConfirmed&&hostFood!==null){const stage=candidate.items.find(x=>x.i===stopId);if(stage){stage.stay=Math.round((stage.stay+stage.days*(hostFood-stage.food))*100)/100;stage.daily=Math.round((stage.daily+hostFood-stage.food)*100)/100;stage.food=hostFood;}}
 const timingOpts={start,stops,quotes:options.quotes||{},transferDaysByStop:options.transferDaysByStop||{}};
 const beforeTiming=timing.evaluate({...timingOpts,items:baseline.items,volunteerDetails:options.volunteerDetails||{},isVolunteer:i=>options.vol?.[i]===true&&options.volunteerDetails?.[i]?.confirmed===true});
 const afterTiming=timing.evaluate({...timingOpts,items:candidate.items,volunteerDetails,isVolunteer:i=>vol[i]===true&&volunteerDetails[i]?.confirmed===true});
 const shared={...budget};
 const beforeBudget=snapshot({...shared,items:baseline.items,waitingCost:beforeTiming.waiting.total,waitingComplete:beforeTiming.waiting.complete,timingFeasible:beforeTiming.feasible});
 const afterBudget=snapshot({...shared,items:candidate.items,waitingCost:afterTiming.waiting.total,waitingComplete:afterTiming.waiting.complete,timingFeasible:afterTiming.feasible,additionalCosts:amount(host.extraCosts)});
 const extraDays=Math.max(0,n-target.days);
 const dateShift=afterTiming.schedule.finish!==beforeTiming.schedule.finish;
 const extraCosts=amount(host.extraCosts);
 const knownExtras=extraCosts!==null;
 const netImpactCalculable=beforeBudget.complete&&afterBudget.complete&&hostConfirmed&&hostFood!==null&&knownExtras&&beforeTiming.feasible&&afterTiming.feasible;
 const costDelta=netImpactCalculable?Math.round((afterBudget.totalEstimate-beforeBudget.totalEstimate)*100)/100:null;
 const reasons=[];
 if(!hostConfirmed)reasons.push('unconfirmed-host-or-price');
 if(!host.from||!host.to)reasons.push('missing-host-dates');
 if(!knownExtras)reasons.push('unknown-host-extra-costs');
 if(hostConfirmed&&hostFood===null)reasons.push('unknown-host-meals');
 if(!beforeTiming.feasible||!afterTiming.feasible)reasons.push('unverified-route-timing');
 if(!beforeBudget.complete||!afterBudget.complete)reasons.push('incomplete-all-in-budget');
 return {valid:true,stopId,extraDays,dateShift,baseline:{itinerary:baseline,timing:beforeTiming,budget:beforeBudget},proposed:{itinerary:candidate,timing:afterTiming,budget:afterBudget},netImpactCalculable,costDelta,reasons};
}
g.SouthboundVolunteerScenario={compare};
})(typeof window!=='undefined'?window:globalThis);
