/* Cost of pre-host waiting days; does not assume free accommodation. */
(function(g){'use strict';
function estimate({calendarItems=[],stages=[]}={}){
 const lines=[],issues=[];let total=0;
 for(const item of calendarItems){
  const days=Number(item.waitingDays)||0;if(days<=0)continue;
  const stage=stages[item.index]||{};
  const bed=stage.waitBed==null?NaN:Number(stage.waitBed),food=stage.waitFood==null?NaN:Number(stage.waitFood),other=Number(stage.waitOther??0);
  if(!Number.isFinite(bed)||bed<0||!Number.isFinite(food)||food<0||!Number.isFinite(other)||other<0){
   issues.push({index:item.index,reason:'missing-wait-cost'});lines.push({index:item.index,days,amount:null});continue;
  }
  const amount=days*(bed+food+other);total+=amount;lines.push({index:item.index,days,amount});
 }
 return {total,lines,issues,complete:issues.length===0};
}
g.SouthboundWaitCosts={estimate};
})(typeof window!=='undefined'?window:globalThis);
