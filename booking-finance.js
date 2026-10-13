/* User-entered booking prices and individual payment/refund events.
 * FX is manually supplied; no live quote, receipt validation or provider confirmation.
 */
(function(g){'use strict';
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const validDate=s=>typeof s==='string'&&ISO.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(Date.parse(s+'T12:00:00Z')).toISOString().slice(0,10)===s;
const value=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
const rate=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):null;
const eur=x=>Math.round((x+Number.EPSILON)*100)/100;
const CURRENCY=/^[A-Z]{3}$/;
function normalize(raw){
 const errors=[];
 const currency=String(raw.currency||'EUR').trim().toUpperCase();
 if(!CURRENCY.test(currency))errors.push('invalid-currency');
 const foreign=currency!=='EUR';
 const amount=value(raw.totalAmount??raw.totalEUR);
 const conversion=foreign?rate(raw.rateEUR):1;
 const source=String(raw.rateSource||'').trim().slice(0,160);
 const checkedAt=String(raw.rateCheckedAt||'');
 if(foreign&&(conversion===null||!validDate(checkedAt)||!source))errors.push('fx-source-and-date-required');
 if((raw.totalAmount??raw.totalEUR)!==null&&(raw.totalAmount??raw.totalEUR)!==undefined&&(raw.totalAmount??raw.totalEUR)!==''&&amount===null)errors.push('invalid-original-amount');
 const totalEUR=amount===null||conversion===null?null:eur(amount*conversion);
 if(totalEUR!==null&&!Number.isFinite(totalEUR))errors.push('invalid-converted-price');
 const txRaw=raw.transactions;
 if(txRaw!==undefined&&!Array.isArray(txRaw))errors.push('invalid-transactions');
 const transactions=[],ids=new Set();
 let totalPaid=0,totalRefunded=0,freshNet=0,journalNet=0;
 for(const p of Array.isArray(txRaw)?txRaw:[]){
  if(!p||typeof p!=='object'){errors.push('invalid-payment-event');continue}
  const id=String(p.id||'').trim(),kind=p.kind,at=String(p.date||'');
  const ccy=String(p.currency||currency).trim().toUpperCase(),amt=value(p.amount);
  const r=ccy==='EUR'?1:rate(p.rateEUR);
  const when=String(p.rateCheckedAt||'');
  const src=String(p.rateSource||'').trim().slice(0,160);
  if(!id||id.length>100||ids.has(id)){errors.push('invalid-or-duplicate-payment-id');continue}
  ids.add(id);
  if(!['payment','refund'].includes(kind)||!validDate(at)||!CURRENCY.test(ccy)||amt===null){
   errors.push('invalid-payment-event');continue;
  }
  if(ccy!=='EUR'&&(r===null||!validDate(when)||!src)){
   errors.push('payment-fx-source-and-date-required');continue;
  }
  const converted=r===null?null:eur(amt*r);
  if(converted===null||!Number.isFinite(converted)){
   errors.push('invalid-payment-conversion');continue;
  }
  const sign=kind==='refund'?-1:1,recordedElsewhere=p.recordedElsewhere===true;
  const journalReference=String(p.journalReference||'').trim().slice(0,160);
  if(recordedElsewhere&&!journalReference)errors.push('journal-reference-required');
  transactions.push({id,kind,date:at,currency:ccy,amount:amt,rateEUR:r,rateCheckedAt:ccy==='EUR'?'':when,rateSource:ccy==='EUR'?'':src,amountEUR:converted,recordedElsewhere,journalReference});
  if(kind==='payment')totalPaid=eur(totalPaid+converted);
  else totalRefunded=eur(totalRefunded+converted);
  if(recordedElsewhere)journalNet=eur(journalNet+sign*converted);
  else freshNet=eur(freshNet+sign*converted);
 }
 if(transactions.length){
  const previousPaid=value(raw.legacyPaidEUR??0),previousRefunded=value(raw.legacyRefundedEUR??0);
  if(previousPaid===null||previousRefunded===null||previousRefunded>previousPaid)errors.push('invalid-legacy-payment');
  const previousNet=eur((previousPaid||0)-(previousRefunded||0));
  totalPaid=eur(totalPaid+(previousPaid||0));
  totalRefunded=eur(totalRefunded+(previousRefunded||0));
  if(raw.legacyRecordedElsewhere===true)journalNet=eur(journalNet+previousNet);
  else freshNet=eur(freshNet+previousNet);
  if(totalRefunded>totalPaid+0.005)errors.push('refund-exceeds-payments');
  if(totalEUR!==null&&totalPaid-totalRefunded>totalEUR+0.01)errors.push('payments-exceed-converted-total');
 }else{
  const paid=value(raw.paidEUR),refunded=value(raw.refundedEUR);
  if(paid===null||refunded===null||refunded>paid||(totalEUR!==null&&paid>totalEUR+0.005))errors.push('invalid-payment');
  totalPaid=paid===null?0:eur(paid);totalRefunded=refunded===null?0:eur(refunded);
  if(raw.recordedElsewhere===true)journalNet=eur(totalPaid-totalRefunded);
  else freshNet=eur(totalPaid-totalRefunded);
 }
 return {ok:errors.length===0,errors,currency,totalAmount:amount,rateEUR:conversion,rateCheckedAt:foreign?checkedAt:'',rateSource:foreign?source:'',totalEUR,transactions,paidEUR:totalPaid,refundedEUR:totalRefunded,freshNet,journalNet,legacyPaidEUR:transactions.length?(value(raw.legacyPaidEUR??0)||0):null,legacyRefundedEUR:transactions.length?(value(raw.legacyRefundedEUR??0)||0):null,legacyRecordedElsewhere:transactions.length?raw.legacyRecordedElsewhere===true:false};
}
g.SouthboundBookingFinance={normalize,validDate};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundBookingFinance;
})(typeof globalThis!=='undefined'?globalThis:this);
