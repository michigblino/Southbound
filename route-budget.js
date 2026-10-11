/* Shared, conservative route budget snapshot for UI and volunteer scenarios. */
(function(g){'use strict';
const amount=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function snapshot({items=[],paid=0,reserve=0,goal=0,cap=null,fixedCosts={},completed={},paidByStop={},waitingCost=0,waitingComplete=true,unrecorded=0}={}){
 const engine=g.SouthboundBudgetEngine;if(!engine)throw Error('Budget engine unavailable');
 const lines=[],unknownTransfers=[];
 for(const item of items){
  const i=item.i,already=amount(paidByStop[i])||0;
  const isCompleted=!!completed[i],stay=amount(item.stay),leg=amount(item.leg);
  if(isCompleted){continue;}
  const knownPart=(stay||0)+(leg||0);
  lines.push({label:'Etappe '+i,amount:stay===null?null:Math.max(0,knownPart-already),status:'estimate'});
  if(leg===null){unknownTransfers.push(i);lines.push({label:'Unbekannter Transfer '+i,amount:null,status:'unknown'});}
 }
 const categories=[['return','Rückreise'],['insurance','Versicherung'],['visas','Visa'],['equipment','Ausrüstung']];
 for(const [key,label] of categories)lines.push({label,amount:amount(fixedCosts[key]),status:'estimate'});
 lines.push({label:'Wartekosten',amount:waitingComplete?amount(waitingCost):null,status:'estimate'});
 const budget=engine.calculate({paid,reserve,goal,cap,items:[],fixedCosts:lines});
 const incompleteReasons=[];
 if(unknownTransfers.length)incompleteReasons.push('unknown-transfers');
 if(categories.some(([key])=>amount(fixedCosts[key])===null))incompleteReasons.push('missing-fixed-costs');
 if(!waitingComplete)incompleteReasons.push('unknown-waiting-costs');
 if(unrecorded>0)incompleteReasons.push('unrecorded-completed-stops');
 if(budget.errors.length)incompleteReasons.push('invalid-input');
 return {...budget,unknownTransfers,incompleteReasons,allInVerified:false};
}
g.SouthboundRouteBudget={snapshot};
})(typeof window!=='undefined'?window:globalThis);
