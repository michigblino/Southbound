/* One calendar/wait-cost adapter for current and hypothetical routes. */
(function(g){'use strict';
function evaluate({items=[],start,stops=[],quotes={},volunteerDetails={},isVolunteer=()=>false}={}){
 const calendar=g.SouthboundTripCalendar,wait=g.SouthboundWaitCosts;
 if(!calendar||!wait)throw Error('Timing dependencies unavailable');
 const stages=items.map(x=>{
  const i=x.i,stop=stops[i]||[],host=volunteerDetails[i]||{},q=quotes[i]||{};
  const quoted=Number(q.night),fallback=Number(stop[5]);
  const normalBed=q.night!==null&&q.night!==undefined&&q.night!==''&&Number.isFinite(quoted)&&quoted>0?quoted:Number.isFinite(fallback)&&fallback>0?fallback:null;
  return {name:x.name||stop[0]||'',days:x.days,transferDays:0,waitBed:normalBed,waitFood:x.food,waitOther:x.other,confirmedHost:isVolunteer(i)&&host.from&&host.to?{from:host.from,to:host.to}:null};
 });
 const schedule=calendar.schedule({start,stops:stages});
 const waiting=wait.estimate({calendarItems:schedule.items,stages});
 return {schedule,waiting,stages,transferDaysVerified:false,feasible:schedule.feasible&&waiting.complete};
}
g.SouthboundRouteTiming={evaluate};
})(typeof window!=='undefined'?window:globalThis);
