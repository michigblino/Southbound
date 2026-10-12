/* Southbound all-in budget core. Pure calculations; no browser storage or network. */
(function(g){'use strict';
const num=(v)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;};
function calculate({paid=0,reserve=0,goal=0,cap=null,items=[],fixedCosts=[],unknownCosts=0}={}){
 const errors=[],lines=[];let known=0,estimated=0,missing=0;
 function add(label,amount,status='estimate'){
  if(status==='unknown'||num(amount)===null){missing++;lines.push({label,amount:null,status:'unknown'});return;}
  const value=num(amount);lines.push({label,amount:value,status});
  if(status==='verified')known+=value;else estimated+=value;
 }
 for(const [i,item] of items.entries()){
  if(item?.stay!==undefined)add('stay '+i,item.stay,item.stayStatus||'estimate');
  if(i>0)add('transfer '+i,item?.leg,item?.legStatus||'estimate');
 }
 for(const [i,c] of fixedCosts.entries())add(c.label||'fixed '+i,c.amount,c.status||'estimate');
 const spent=num(paid),buffer=num(reserve),target=num(goal),ceiling=cap===null?null:num(cap);
 if(spent===null||buffer===null||target===null||(cap!==null&&ceiling===null))errors.push('Invalid paid, reserve, goal or cap');
 const allowance=num(unknownCosts);if(allowance===null)errors.push('Invalid unknownCosts');
 const base=(spent||0)+(buffer||0)+known+estimated+(allowance||0);
 const complete=missing===0&&errors.length===0;
 return {paid:spent,reserve:buffer,verifiedFuture:known,estimatedFuture:estimated,unknownAllowance:allowance,missingCount:missing,lines,totalEstimate:base,goal:target,cap:ceiling,goalGap:target===null?null:Math.max(0,base-target),capGap:ceiling===null?null:Math.max(0,base-ceiling),complete,goalStatus:!complete?'unverified':base<=target?'within':'over',errors};
}
g.SouthboundBudgetEngine={calculate};
})(typeof window!=='undefined'?window:globalThis);
