/* One calendar/wait-cost adapter for current and hypothetical routes. */
(function(g){'use strict';
function evaluate({items=[],start,stops=[],quotes={},volunteerDetails={},isVolunteer=()=>false,transferDaysByStop={}}={}){
 const calendar=g.SouthboundTripCalendar,wait=g.SouthboundWaitCosts;
 if(!calendar||!wait)throw Error('Timing dependencies unavailable');
 const unknownTransferDays=[],unverifiedHostDates=[];
 const stages=items.map((x,index)=>{
  const i=x.i,stop=stops[i]||[],host=volunteerDetails[i]||{},q=quotes[i]||{};
  if(isVolunteer(i)&&(!host.from||!host.to))unverifiedHostDates.push(i);
  const quoted=Number(q.night),fallback=Number(stop[5]);
  const normalBed=q.night!==null&&q.night!==undefined&&q.night!==''&&Number.isFinite(quoted)&&quoted>0?quoted:Number.isFinite(fallback)&&fallback>0?fallback:null;
  const raw=transferDaysByStop[i];const explicit=raw!==null&&raw!==undefined&&raw!==''&&Number.isInteger(Number(raw))&&Number(raw)>=0;
  if(index>0&&!explicit)unknownTransferDays.push(i);
  return {name:x.name||stop[0]||'',days:x.days,transferDays:index===0?0:explicit?Number(raw):0,waitBed:normalBed,waitFood:x.food,waitOther:x.other,confirmedHost:isVolunteer(i)&&host.from&&host.to?{from:host.from,to:host.to}:null};
 });
 const schedule=calendar.schedule({start,stops:stages});
 const waiting=wait.estimate({calendarItems:schedule.items,stages});
 return {schedule,waiting,stages,unknownTransferDays,unverifiedHostDates,transferDaysVerified:unknownTransferDays.length===0,hostDatesVerified:unverifiedHostDates.length===0,feasible:schedule.feasible&&waiting.complete&&unknownTransferDays.length===0&&unverifiedHostDates.length===0};
}
g.SouthboundRouteTiming={evaluate};
})(typeof window!=='undefined'?window:globalThis);
