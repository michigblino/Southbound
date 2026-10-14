/* Date-specific evidence gate and missing-price priorities for future provider adapters.
   No web scraping, booking, API authentication or automatic provider claims. */
(function(g){'use strict';
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const price=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
const web=s=>typeof s==='string'&&/^https:\/\/[^\s/]+/i.test(s);
function auditOffer(offer,{type,start,end,people=1,today}={}){
 const q=offer||{},missing=[];
 const a=price(q.totalEUR),base=price(q.baseEUR),fees=price(q.feesEUR),kind=q.type||type;
 if(!['lodging','transport','activity'].includes(kind)||kind!==type)missing.push('Kategorie');
 if(!isDate(start)||!isDate(end)||start>=end)missing.push('Gültige Reisedaten');
 if(q.startDate!==start||q.endDate!==end)missing.push('Passende Reisedaten');
 if(!Number.isInteger(q.people)||q.people!==people||people<1)missing.push('Passende Personenzahl');
 if(a===null||base===null||fees===null||Math.abs(a-(base+fees))>.01)missing.push('Gesamtpreis einschließlich Gebühren');
 if(q.currency!=='EUR')missing.push('EUR-Preis inklusive Wechselkurs');
 if(!web(q.url)||typeof q.provider!=='string'||!q.provider.trim())missing.push('Anbieter mit HTTPS-Quellenlink');
 if(!isDate(q.checkedAt)||!isDate(today)||q.checkedAt>today)missing.push('Gültiges Prüfdatum');
 const age=isDate(q.checkedAt)&&isDate(today)?(Date.parse(today+'T12:00:00Z')-Date.parse(q.checkedAt+'T12:00:00Z'))/86400000:null;
 if(age!==null&&age>1)missing.push('Frische Preisprüfung');
 const sourced=missing.length===0;
 const providerConfirmed=sourced&&q.sourceMethod==='provider-api'&&q.availabilityConfirmed===true&&!!q.providerRequestId;
 return {sourced,providerConfirmed,priceEUR:a,status:providerConfirmed?'live-confirmed':sourced?'documented-manual':missing.includes('Frische Preisprüfung')?'stale':'incomplete',
  missing,warning:providerConfirmed?null:'Ein eingetragener Quellenlink ist keine bestätigte Anbieter-Verfügbarkeit oder Buchung.'};
}
function readiness({items=[],snapshot={},ledger={},quotes={},fixedCosts={},today}={}){
 const noQuote=[],noTransfer=[],highExposure=[],checkTasks=[];
 const v=(snapshot.lines||[]);
 for(const item of items||[]){
  if(item.isReturn)continue;
  const stages=(snapshot.lines||[]).filter(l=>l.label==='Aufenthalt '+item.i||l.label==='Transfer '+item.i);
  if(!item.bookingLodgings?.length){
   const q=quotes[item.i];
   const nights=Number(item.days)||0;
   const info=q?auditOffer({type:'lodging',totalEUR:q.totalEUR,baseEUR:q.baseEUR,feesEUR:q.feesEUR,currency:'EUR',
       startDate:q.startDate,endDate:q.endDate,people:q.people,provider:q.provider,url:q.url,checkedAt:q.checkedAt},
      {type:'lodging',start:item.start,end:item.end,people:1,today}):null;
   if(!info?.providerConfirmed){
    noQuote.push(item.i);
    checkTasks.push({type:'lodging',id:item.i,name:item.name,estimate:Math.max(0,(Number(item.bed)||0)*nights),
     note:q?.night?'Dein bisheriger Hostelpreis ist nur eine eigene Schätzung, keine verifizierte Verfügbarkeit.':'Konkretes Hostelangebot für die geplanten Übernachtungen fehlt.'});
   }
  }
  if(item.leg===null||(!item.transportOffer&&!item.bookingTransport&&!item.bookingInbound&&item.i!==items[0]?.i)){
    noTransfer.push(item.i);
    checkTasks.push({type:'transport',id:item.i,name:item.name,estimate:Math.max(0,Number(item.leg)||0),
     note:item.leg===null?'Ticketpreis offen: kein kostenfreier Transfer.':'Nur modellierter Transferpreis, kein datiertes Ticket.'});
  }
 }
 for(const k of ['return','insurance','equipment','visas']){
  if(price(fixedCosts[k])===null)checkTasks.push({type:'fixed',id:k,name:{return:'Rückreise',insurance:'Versicherung',equipment:'Ausrüstung',visas:'Visa/Einreise'}[k],estimate:0,note:'Fixkostenpreis offen – 0 € bedeutet nur kostenlos, nicht unbekannt.'});
 }
 checkTasks.sort((a,b)=>b.estimate-a.estimate||a.type.localeCompare(b.type));
 return {tasks:checkTasks.slice(0,12),quoteGap:noQuote.length,transferGap:noTransfer.length,
  providerCoverage:0,bookingStatus:'user-recorded-not-provider-verified',
  disclaimer:'Keine Live-API verbunden. Ohne Anbieter- und Datumsnachweis können Angebote nur als Schätzung in die Planung eingehen.'};
}
g.SouthboundPriceReadiness={auditOffer,readiness};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundPriceReadiness;
})(typeof window!=='undefined'?window:globalThis);
