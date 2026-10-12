/* Shared, conservative route budget snapshot for UI and volunteer scenarios. */
(function(g){'use strict';
const amount=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function snapshot({items=[],paid=0,reserve=0,goal=0,cap=null,fixedCosts={},completed={},paidByStop={},waitingCost=0,waitingComplete=true,unrecorded=0,timingFeasible=true,additionalCosts=0}={}){
 const engine=g.SouthboundBudgetEngine;if(!engine)throw Error('Budget engine unavailable');
 const lines=[],unknownTransfers=[],unknownPrepayments=[],invalidPrepayments=[];
 for(const item of items){
  const i=item.i,rawPaid=paidByStop[i],parsedPaid=amount(rawPaid),already=parsedPaid||0;
  if(rawPaid!==undefined&&rawPaid!==null&&rawPaid!==''&&parsedPaid===null)invalidPrepayments.push(i);
  const isCompleted=!!completed[i],stay=amount(item.stay),leg=amount(item.leg);
  if(isCompleted){continue;}
  // Track the two independent liabilities separately: an unknown stay must not hide a priced transfer.
  // Apply stop-level prepayments to lodging first, then to transport, without making a missing amount look known.
  const stayRemainder=stay===null?null:Math.max(0,stay-already);
  const remainingPrepayment=stay===null?0:Math.max(0,already-stay);
  const transferRemainder=leg===null?null:Math.max(0,leg-remainingPrepayment);
  lines.push({label:'Aufenthalt '+i,amount:stayRemainder,status:'estimate'});
  lines.push({label:'Transfer '+i,amount:transferRemainder,status:leg===null?'unknown':'estimate'});
  if(leg===null)unknownTransfers.push(i);
  if(stay===null&&already>0)unknownPrepayments.push(i);
 }
 const categories=[['return','Rückreise'],['insurance','Versicherung'],['visas','Visa'],['equipment','Ausrüstung']];
 for(const [key,label] of categories)lines.push({label,amount:amount(fixedCosts[key]),status:'estimate'});
 lines.push({label:'Wartekosten',amount:waitingComplete?amount(waitingCost):null,status:'estimate'});
 lines.push({label:'Zusätzliche Szenariokosten',amount:amount(additionalCosts),status:'estimate'});
 const budget=engine.calculate({paid,reserve,goal,cap,items:[],fixedCosts:lines});
 const incompleteReasons=[];
 if(unknownTransfers.length)incompleteReasons.push('unknown-transfers');
 if(unknownPrepayments.length)incompleteReasons.push('unallocated-prepayments');
 if(invalidPrepayments.length)incompleteReasons.push('invalid-stop-prepayments');
 if(categories.some(([key])=>amount(fixedCosts[key])===null))incompleteReasons.push('missing-fixed-costs');
 if(!waitingComplete)incompleteReasons.push('unknown-waiting-costs');
 if(unrecorded>0)incompleteReasons.push('unrecorded-completed-stops');
 if(!timingFeasible)incompleteReasons.push('unverified-route-dates');
 if(budget.missingCount>0)incompleteReasons.push('missing-amounts');
 if(budget.errors.length)incompleteReasons.push('invalid-input');
 return {...budget,unknownTransfers,unknownPrepayments,invalidPrepayments,incompleteReasons,complete:budget.complete&&incompleteReasons.length===0,goalStatus:budget.complete&&incompleteReasons.length===0?budget.goalStatus:'unverified',allInVerified:false};
}
g.SouthboundRouteBudget={snapshot};
})(typeof window!=='undefined'?window:globalThis);
