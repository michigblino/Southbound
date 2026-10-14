/* Southbound stage card v1: view-only status derived from the existing itinerary/booking ledger.
 * It never claims a provider-confirmed booking unless the traveler has recorded a confirmation.
 */
(function(g){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 transport:'<rect x="5" y="3" width="14" height="16" rx="2"/><path d="M5 11h14M8 19v2m8-2v2M8 7h.01M16 7h.01"/>',
 lodging:'<path d="M3 3v18M3 10h16a2 2 0 0 1 2 2v9M3 17h18M7 10v7"/>',
 volunteering:'<path d="M20.8 8.6c0 4.2-8.8 10.1-8.8 10.1S3.2 12.8 3.2 8.6a4.3 4.3 0 0 1 8.8-1 4.3 4.3 0 0 1 8.8 1Z"/>',
 activity:'<path d="m2 20 7-13 4 7 3-5 6 11H2Z"/>'
};
const titles={transport:'Transfer',lodging:'Unterkunft',volunteering:'Volunteering',activity:'Erlebnisse'};
const subs={transport:'Ticket prüfen, erfassen oder bearbeiten',lodging:'Buchung und Übernachtungskosten verwalten',volunteering:'Host-Zusage oder Bewerbung verwalten',activity:'Ausflug vormerken und Kosten erfassen'};
const rank={confirmed:4,requested:3,planned:2,cancelled:1};
function summarize({item,previous=null,bookings=[],ledger={},hostConfirmed=false,hostHours=null,maxVolunteerHours=30,manualTicket=false,hostelQuote=false,formatPrice=n=>Number(n).toLocaleString('de-DE',{style:'currency',currency:'EUR'})}={}){
 if(!item||!Number.isInteger(item.i))return null;
 const valid=Array.isArray(bookings)?bookings.filter(b=>b&&(
  (b.stageId===item.i&&!(b.journeyReturn&&!item.isReturn))||
  (item.isReturn&&b.type==='transport'&&b.journeyReturn===true)
 )):[];
 const matched=new Set(ledger?.matched||[]),warnings=new Set((ledger?.warnings||[]).map(w=>w.id));
 const result={stageId:item.i,title:previous?previous.name+' → '+item.name:'Ankunft in '+item.name,rows:[]};
 for(const type of ['transport','lodging','volunteering','activity']){
  const options=valid.filter(b=>b.type===type&&(!item.isReturn||type!=='transport'||b.journeyReturn===true)).sort((a,b)=>(rank[b.status]||0)-(rank[a.status]||0));
  const warning=options.find(b=>b.status==='confirmed'&&(warnings.has(b.id)||!matched.has(b.id)));
  const confirmed=options.find(b=>b.status==='confirmed'&&matched.has(b.id));
  const requested=options.find(b=>b.status==='requested');
  const planned=options.find(b=>b.status==='planned');
  const cancelled=options.find(b=>b.status==='cancelled');
  let label=type==='volunteering'||type==='activity'?'Optional':'Offen';
  let kind='neutral',selected=confirmed||requested||planned||cancelled||null;
  const disabled=item.days===0&&type!=='transport';
  if(disabled){label='Entfällt';kind='muted'}
  else if(warning){label='Prüfen';kind='warning';selected=warning}
  else if(type==='volunteering'&&hostConfirmed){label='Host bestätigt';kind='positive'}
  else if(confirmed){
   if(type==='lodging'){
    const assigned=options.filter(b=>b.status==='confirmed'&&matched.has(b.id));
    const nights=assigned.reduce((sum,b)=>{
     const start=Date.parse(b.startDate+'T12:00:00Z'),end=Date.parse(b.endDate+'T12:00:00Z');
     return sum+(Number.isFinite(start)&&Number.isFinite(end)&&end>start?Math.round((end-start)/86400000):0);
    },0);
    const total=hostConfirmed?Math.max(0,Number(item.waitingDays)||0):Math.max(0,Number(item.days)||0);
    const fullyCovered=total>0&&nights>=total;
    const paid=fullyCovered&&assigned.every(b=>b.totalEUR!==null&&Number(b.totalEUR)>0&&
     Number(b.paidEUR||0)-Number(b.refundedEUR||0)>=Number(b.totalEUR)&&Number(b.refundedEUR||0)===0);
    label=hostConfirmed?'Vor Host gebucht':!fullyCovered?'Teilweise gebucht':paid?'Bezahlt':'Bestätigt';
   }else{
    const net=Number(confirmed.paidEUR||0)-Number(confirmed.refundedEUR||0);
    const paid=confirmed.totalEUR!==null&&Number(confirmed.totalEUR)>0&&Number.isFinite(Number(confirmed.totalEUR))&&net>=Number(confirmed.totalEUR)&&Number(confirmed.refundedEUR||0)===0;
    label=paid?'Bezahlt':'Bestätigt';
   }
   kind='positive';
  }else if(requested){label='Angefragt';kind='neutral'}
  else if(planned){label='Vorgemerkt';kind='neutral'}
  else if(cancelled){label='Storniert';kind='muted'}
  else if(type==='transport'&&(manualTicket||item.transportOffer)){label='Preis geprüft';kind='neutral'}
  else if(type==='lodging'&&hostelQuote){label='Preis notiert';kind='neutral'}
  const exceed=type==='volunteering'&&Number.isFinite(Number(hostHours))&&hostHours!==null&&Number(hostHours)>Number(maxVolunteerHours);
  const lodgingConfirmed=type==='lodging'?options.filter(b=>b.status==='confirmed'&&matched.has(b.id)):[];
  const lodgingNights=lodgingConfirmed.reduce((sum,b)=>{
   const from=Date.parse(b.startDate+'T12:00:00Z'),to=Date.parse(b.endDate+'T12:00:00Z');
   return sum+(Number.isFinite(from)&&Number.isFinite(to)&&to>from?Math.round((to-from)/86400000):0);
  },0);
  const lodgingTotal=hostConfirmed?Number(item.waitingDays)||0:Number(item.days)||0;
  const lodgingSubtitle=lodgingConfirmed.length?hostConfirmed?
   lodgingNights+' Wartetage vor Host gebucht':lodgingNights+' von '+lodgingTotal+' Nächten bestätigt; Rest geschätzt':subs[type];
  const transferCost=type==='transport'?(item.leg===null||item.leg===undefined?'Preis offen':formatPrice(item.leg)):null;
  const transferSource=type==='transport'?(warning?'Verbindung prüfen':confirmed?'Bestätigung selbst eingetragen':item.transportOffer||manualTicket?'Anbieterpreis selbst notiert':'Modellschätzung · kein Ticket'):'';
  const subtitle=exceed?'Achtung: '+hostHours+' Std./Woche über Wunschlimit ('+maxVolunteerHours+')':type==='transport'&&!previous?'Anreiseflug zum ersten Reiseziel verwalten':type==='transport'?'Transferpreis '+transferCost+' · '+transferSource+' · Details in Transferkarte':type==='lodging'?lodgingSubtitle:subs[type];
  result.rows.push({type,title:type==='transport'&&item.isReturn?'Rückreise':type==='transport'&&!previous?'Anreise':titles[type],
   subtitle:type==='transport'&&item.isReturn?'Rückflug und Buchung zum Heimatort verwalten':subtitle,
   label,kind,disabled,editId:selected?.id||'',exceedsHourPreference:exceed});
 }
 return result;
}
function render(data){
 if(!data)return '';
 const label='Organisation für '+data.title;
 return '<section class="sb-stage-dashboard" aria-label="'+esc(label)+'">'+
 '<div class="sb-stage-dashboard__head"><span class="sb-stage-dashboard__eyebrow">DEINE REISEETAPPE</span><b>'+esc(data.title)+'</b><small>Verbindungen, Unterkünfte und Erlebnisse gemeinsam planen</small></div>'+
 '<div class="sb-stage-dashboard__rows">'+data.rows.map(row=>{
  const icon='<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[row.type]+'</svg>';
  return '<button type="button" class="sb-stage-dashboard__row" data-stage-action="'+row.type+'" data-stage-id="'+data.stageId+'" data-stage-edit="'+esc(row.editId)+'"'+(row.disabled?' disabled':'')+' aria-label="'+esc(row.title+': '+row.label+'. '+row.subtitle)+'">'+
  '<span class="sb-stage-dashboard__icon">'+icon+'</span><span class="sb-stage-dashboard__description"><b>'+esc(row.title)+'</b><small>'+esc(row.subtitle)+'</small></span>'+
  '<span class="sb-stage-dashboard__status sb-stage-dashboard__status--'+esc(row.kind)+'">'+esc(row.label)+'</span></button>';
 }).join('')+'</div><p class="sb-stage-dashboard__foot">Status aus deinen gespeicherten Angaben · keine automatische Anbieterprüfung oder Buchung</p></section>';
}
const api={summarize,render};
g.SouthboundStageCard=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
