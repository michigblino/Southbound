/* Origin of entered prices, not independent verification or a guarantee. */
(function(g){'use strict';
const valid=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0;
function evaluate({items=[],ledger={},snapshot={},quotes={},fixedCosts={}}={}){
 const matched=new Set(ledger.matched||[]),bookings=(ledger.records||[]).filter(b=>b.status==='confirmed'&&matched.has(b.id)),byId=id=>bookings.find(b=>b.id===id),stages=new Map(items.map(x=>[x.i,x]));
 const classify=line=>{
  const match=/^(Aufenthalt|Transfer) (\d+)$/.exec(line.label||'');
  let kind='model',source='Modell/Pauschale',provider='',checkedAt='',url='',notes='';
  if(!valid(line.amount)){kind='unknown';source='Preis unbekannt';}
  else if(match){
   const item=stages.get(Number(match[2]));
   if(match[1]==='Transfer'){
    const record=byId(item?.bookingTransport?.id||item?.bookingInbound?.id);
    if(record){kind='booked';source='Nutzerbuchung';provider=record.provider;url=record.url||'';}
    else if(item?.transportOffer){kind='dated-offer';source='Manuell geprüftes datumsgebundenes Angebot';provider=item.transportOffer.operator;checkedAt=item.transportOffer.checkedAt;url=item.transportOffer.url||'';}
   }else {
    const lodgings=item?.bookingLodgings||[],confirmed=lodgings.map(x=>byId(x.id)).filter(Boolean);
    if(confirmed.length){
     const nights=lodgings.reduce((n,x)=>n+Math.max(0,(Date.parse(x.endDate)-Date.parse(x.startDate))/86400000),0);
     kind=confirmed.length===lodgings.length&&nights>=item.days?'booked':'manual';
     source=kind==='booked'?'Nutzerbuchung':'Teils gebucht, Rest modelliert';provider=confirmed.map(x=>x.provider).join(', ');
    }else if(valid(quotes[item?.i]?.night)){kind='manual';source='Eigene Hostelpreisangabe';}
    if(item?.hypotheticalHostNights){kind='model';source='Hypothetischer Host-Aufenthalt';notes='Host nicht bestätigt';}
   }
  }else if(/^(Rückreise|Versicherung|Visa|Ausrüstung)$/.test(line.label||'')){
   const k={Rückreise:'return',Versicherung:'insurance',Visa:'visas',Ausrüstung:'equipment'}[line.label];
   const b=bookings.find(x=>k==='return'?x.type==='transport'&&x.journeyReturn:x.type==='fixed'&&x.fixedKind===k);
   if(b){kind='booked';source='Nutzerbuchung';provider=b.provider;url=b.url||'';}
   else if(valid(fixedCosts[k])){kind='manual';source='Manueller Fixkostenansatz';}
  }
  return {label:line.label,amount:valid(line.amount)?Number(line.amount):null,kind,source,provider,checkedAt,url,notes};
 };
 const rows=(snapshot.lines||[]).map(classify),totals=Object.fromEntries(['booked','dated-offer','manual','model','unknown'].map(k=>[k,rows.filter(x=>x.kind===k).length]));
 return {rows,totals,missing:rows.filter(x=>x.kind==='unknown').map(x=>x.label),providerVerified:false};
}
g.SouthboundPriceEvidence={evaluate};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundPriceEvidence;
})(typeof window!=='undefined'?window:globalThis);