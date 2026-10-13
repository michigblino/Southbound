/* Shared, conservative route budget snapshot for UI and volunteer scenarios. */
(function(g){'use strict';
const amount=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function snapshot({items=[],paid=0,reserve=0,goal=0,cap=null,fixedCosts={},completed={},paidByStop={},paymentAllocationsByStop={},waitingCost=0,waitingComplete=true,waitingPaid=0,returnPaymentEUR=0,unrecorded=0,timingFeasible=true,bookingIntegrity=true,additionalCosts=0}={}){
 const engine=g.SouthboundBudgetEngine;if(!engine)throw Error('Budget engine unavailable');
 const lines=[],unknownTransfers=[],unknownPrepayments=[],invalidPrepayments=[],invalidTypedPayments=[],unknownHostCosts=[],unknownHostMeals=[];
 for(const item of items){
  const i=item.i,rawPaid=paidByStop[i],parsedPaid=amount(rawPaid),already=parsedPaid||0,typed=paymentAllocationsByStop[i]||{};
  const paidStay=amount(typed.stay??0),paidTransfer=amount(typed.transfer??0);
  if(paidStay===null||paidTransfer===null)invalidTypedPayments.push(i);
  if(rawPaid!==undefined&&rawPaid!==null&&rawPaid!==''&&parsedPaid===null)invalidPrepayments.push(i);
  const isCompleted=!!completed[i],stay=amount(item.stay),leg=amount(item.leg);
  if(isCompleted){continue;}
  // Track the two independent liabilities separately: an unknown stay must not hide a priced transfer.
  // Apply stop-level prepayments to lodging first, then to transport, without making a missing amount look known.
  const stayClaim=stay===null?0:(paidStay??0);
  const legClaim=leg===null?0:(paidTransfer??0);
  if(stay!==null&&paidStay>stay+0.005||leg!==null&&paidTransfer>leg+0.005)invalidTypedPayments.push(i);
  if(stay===null&&paidStay>0||leg===null&&paidTransfer>0)unknownPrepayments.push(i);
  const stayAfterTyped=stay===null?null:Math.max(0,stay-stayClaim);
  const legAfterTyped=leg===null?null:Math.max(0,leg-legClaim);
  const stayRemainder=stayAfterTyped===null?null:Math.max(0,stayAfterTyped-already);
  const remainingPrepayment=stayAfterTyped===null?0:Math.max(0,already-stayAfterTyped);
  const transferRemainder=legAfterTyped===null?null:Math.max(0,legAfterTyped-remainingPrepayment);
  lines.push({label:'Aufenthalt '+i,amount:stayRemainder,status:'estimate'});
  lines.push({label:'Transfer '+i,amount:transferRemainder,status:leg===null?'unknown':'estimate'});
  // Host fees are already part of item.stay when priced. Missing fees/meals block all-in verification.
  if(item.hostExtras===null){unknownHostCosts.push(i);lines.push({label:'Host-Zusatzkosten '+i,amount:null,status:'unknown'});}
  if(item.hostFoodKnown===false){unknownHostMeals.push(i);lines.push({label:'Host-Verpflegung '+i,amount:null,status:'unknown'});}
  if(leg===null)unknownTransfers.push(i);
  if(stay===null&&already>0)unknownPrepayments.push(i);
 }
 const categories=[['return','Rückreise'],['insurance','Versicherung'],['visas','Visa'],['equipment','Ausrüstung']];
 const paidReturn=amount(returnPaymentEUR),quotedReturn=amount(fixedCosts.return);
 const invalidReturnPayment=paidReturn===null||(quotedReturn!==null&&paidReturn>quotedReturn+0.005);
 for(const [key,label] of categories){
  const value=amount(fixedCosts[key]);
  lines.push({label,amount:key==='return'&&value!==null&&paidReturn!==null&&!invalidReturnPayment?
   Math.max(0,Math.round((value-paidReturn)*100)/100):value,status:'estimate'});
 }
 const parsedWaitCost=amount(waitingCost),parsedWaitPaid=amount(waitingPaid);
 const invalidWaitPayment=parsedWaitPaid===null||(waitingComplete&&parsedWaitCost!==null&&parsedWaitPaid>parsedWaitCost+0.005);
 const waitRemainder=waitingComplete&&parsedWaitCost!==null&&!invalidWaitPayment?
  Math.max(0,Math.round((parsedWaitCost-parsedWaitPaid)*100)/100):null;
 lines.push({label:'Wartekosten',amount:waitRemainder,status:waitRemainder===null?'unknown':'estimate'});
 lines.push({label:'Zusätzliche Szenariokosten',amount:amount(additionalCosts),status:'estimate'});
 const budget=engine.calculate({paid,reserve,goal,cap,items:[],fixedCosts:lines});
 const incompleteReasons=[];
 if(unknownTransfers.length)incompleteReasons.push('unknown-transfers');
 if(unknownHostCosts.length)incompleteReasons.push('unknown-host-extra-costs');
 if(unknownHostMeals.length)incompleteReasons.push('unknown-host-meals');
 if(unknownPrepayments.length)incompleteReasons.push('unallocated-prepayments');
 if(invalidPrepayments.length)incompleteReasons.push('invalid-stop-prepayments');
 if(invalidTypedPayments.length)incompleteReasons.push('invalid-booking-allocations');
 if(categories.some(([key])=>amount(fixedCosts[key])===null))incompleteReasons.push('missing-fixed-costs');
 if(!waitingComplete||waitRemainder===null)incompleteReasons.push('unknown-waiting-costs');
 if(invalidWaitPayment)incompleteReasons.push('unallocated-wait-prepayments');
 if(invalidReturnPayment)incompleteReasons.push('invalid-return-prepayments');
 if(unrecorded>0)incompleteReasons.push('unrecorded-completed-stops');
 if(!timingFeasible)incompleteReasons.push('unverified-route-dates');
 if(!bookingIntegrity)incompleteReasons.push('booking-records-need-review');
 if(budget.missingCount>0)incompleteReasons.push('missing-amounts');
 if(budget.errors.length)incompleteReasons.push('invalid-input');
 const complete=budget.complete&&incompleteReasons.length===0;
 const minimumKnownEstimate=budget.totalEstimate;
 const budgetHeadroom=budget.goal===null?null:budget.goal-minimumKnownEstimate;
 const capHeadroom=budget.cap===null?null:budget.cap-minimumKnownEstimate;
 return {...budget,unknownTransfers,unknownHostCosts,unknownHostMeals,unknownPrepayments,invalidPrepayments,invalidTypedPayments,incompleteReasons,complete,goalStatus:complete?budget.goalStatus:'unverified',allInVerified:false,minimumKnownEstimate,budgetHeadroom,capHeadroom,minimumGoalOverrun:budgetHeadroom===null?null:Math.max(0,-budgetHeadroom),minimumCapOverrun:capHeadroom===null?null:Math.max(0,-capHeadroom),budgetVerdict:complete?(budget.goalStatus==='within'?'within-estimate':'over-estimate'):'incomplete'};
}
g.SouthboundRouteBudget={snapshot};
})(typeof window!=='undefined'?window:globalThis);
