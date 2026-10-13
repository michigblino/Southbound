/* User-entered booking register. No provider API, checkout, or automatic booking confirmation. */
(function(g){'use strict';
const euro=n=>'€'+Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const labels={transport:'Transfer',lodging:'Unterkunft',volunteering:'Volunteering',activity:'Erlebnis'};
const statuses={planned:'Vorgemerkt',requested:'Angefragt',confirmed:'Bestätigt',cancelled:'Storniert'};
const icons={transport:'↗',lodging:'⌂',volunteering:'♡',activity:'◇'};

const typeCopy={
 transport:{hint:'Transfer: Startort, Ziel und Abfahrt müssen mit deiner Route übereinstimmen. Nur eine bestätigte passende Verbindung ersetzt den geschätzten Fahrpreis.',captions:{stageId:'Ziel / Etappe',title:'Verbindung / Ticket',provider:'Verkehrsanbieter',startDate:'Abfahrt / Reisetag',reference:'Ticket- oder Buchungsnummer'},placeholders:{title:'z. B. Bus Medellín → Salento',provider:'z. B. Busunternehmen',reference:'Ticket- oder Buchungsnummer'}},
 lodging:{hint:'Unterkunft: Auch einzelne oder mehrere nicht überlappende Nächte sind möglich. Bestätigte Teilbuchungen ersetzen nur ihre Nächte; der Rest bleibt eine Schätzung. Vor Host-Beginn zählen Hostelbuchungen zu den Wartekosten.',captions:{stageId:'Ort / Etappe',title:'Unterkunft / Zimmer',provider:'Hostel / Unterkunftsanbieter',startDate:'Check-in',endDate:'Check-out',reference:'Reservierungs- oder Buchungsnummer'},placeholders:{title:'z. B. Hostel Paraty',provider:'Name des Hostels',reference:'Reservierungscode'}},
 volunteering:{hint:'Volunteering: Hier erfasst du Bewerbung, Host und gegebenenfalls Gebühren. Kostenlose Unterkunft entsteht erst durch die separat erfasste Host-Zusage in der Etappe.',captions:{stageId:'Ort / Etappe',title:'Host / Projekt',provider:'Plattform / Host',startDate:'Geplanter Beginn',endDate:'Geplantes Ende',reference:'Bewerbungs- oder Bestätigungsreferenz'},placeholders:{title:'z. B. Farmstay in Salento',provider:'z. B. Workaway / Gastgeber',reference:'Bewerbungs-ID oder Nachricht'}},
 activity:{hint:'Erlebnis: Erfasse den Veranstaltungstag und wähle, ob der Preis in der Aktivitätenpauschale enthalten oder zusätzlich einzuplanen ist.',captions:{stageId:'Ort / Etappe',title:'Erlebnis / Ausflug',provider:'Veranstalter',startDate:'Datum des Erlebnisses',reference:'Ticket- oder Buchungsnummer'},placeholders:{title:'z. B. Wanderung mit Guide',provider:'Name des Veranstalters',reference:'Ticketcode'}}
};
const baseCaptions={stageId:'Ziel / Etappe',title:'Bezeichnung',provider:'Anbieter / Host',startDate:'Beginn / Abfahrt',endDate:'Ende / Check-out',reference:'Referenz / Bestätigung'};
function render({route=[],bookings=[],ledger}={}){
 const available=route.filter(x=>x&&x.i!==undefined),defaultId=available[0]?.i??0;
 const opts=available.map(x=>'<option value="'+x.i+'">'+esc(x.name)+'</option>').join('');
 const warnings=ledger?.warnings||[];
 const records=Array.isArray(bookings)?bookings:[];
 const total=ledger?.recordedPayment||0,real=ledger?.extraPaid||0;
 return '<div class="panel"><div class="eyebrow">Buchungen · Beta</div><h2>Deine Buchungszentrale</h2>'+
 '<p class="small">Tickets, Host-Anfragen, Unterkünfte und Ausflüge festhalten. Noch <b>keine Buchung und keine Zahlung innerhalb von Southbound</b>. Bestätigt bedeutet hier: von dir als bestätigt eingetragen, nicht unabhängig vom Anbieter verifiziert.</p>'+
 '<div class="sb-booking-stats"><div><small>Gespeicherte Einträge</small><b>'+records.length+'</b></div><div><small>Als bestätigt erfasst</small><b>'+Number(ledger?.confirmed||0)+'</b></div><div><small>Zahlungen (netto) in Buchungen</small><b>'+euro(total)+'</b></div></div>'+
 '<p class="small">Davon '+euro(real)+' noch nicht im Reisejournal verbucht – nur dieser Teil wird zusätzlich als bereits bezahlt gezählt. Bereits anderswo erfasste Beträge werden nicht erneut addiert. Wechselkurse, Zahlungen und Journal-Referenzen sind von dir eingetragen und nicht automatisch überprüft.</p>'+
 (warnings.length?'<div class="note"><b>'+warnings.length+' Buchung(en) prüfen</b><p class="small">Unpassende Buchungen ändern deine Reisekosten nicht stillschweigend.</p>'+warnings.slice(0,8).map(w=>'<p class="small">'+esc(w.id)+': '+esc(w.reason)+'</p>').join('')+'</div>':'')+
 '</div><div class="panel"><h2>Gespeicherte Buchungen</h2>'+
 (records.length?'<div class="sb-booking-list">'+records.map(b=>{
  const place=available.find(x=>x.i===b.stageId)?.name||'Etappe '+b.stageId;
  const paid=Number(b.paidEUR||0)-Number(b.refundedEUR||0);
  const converted=String(b.currency||'EUR')!=='EUR'&&b.totalAmount!==null&&b.totalAmount!==undefined?
   esc(b.totalAmount)+' '+esc(b.currency)+' ≈ '+euro(b.totalEUR):b.totalEUR===null?'Preis unbekannt':euro(b.totalEUR);
  return '<div class="sb-booking-card"><span class="sb-booking-symbol" aria-hidden="true">'+esc(icons[b.type]||'·')+'</span><div class="sb-booking-info"><b>'+esc(b.title||'Eintrag')+'</b><small>'+esc(labels[b.type]||b.type)+' · '+esc(place)+' · '+esc(b.startDate||'ohne Datum')+'</small><small>'+esc(b.provider||'')+' · '+esc(statuses[b.status]||'Unbekannt')+' · '+converted+' · '+euro(paid)+' netto bezahlt</small></div><button type="button" data-bk-edit="'+esc(b.id)+'" class="sb-booking-edit">Bearbeiten</button></div>'
 }).join('')+'</div>':'<p class="small">Noch keine Buchungen hinterlegt. Du kannst jetzt die erste Reiseleistung erfassen.</p>')+
 '</div><details class="panel" id="sb-bookings-editor"'+(records.length?'':' open')+'><summary><b>Buchung erfassen oder bearbeiten</b></summary>'+
 '<p class="small">Nur tatsächlich erhaltene Buchungsbestätigungen als „Bestätigt“ markieren. Bei Volunteering erfolgt die eigentliche Host-Zusage weiterhin über „Etappen“.</p>'+
 '<p class="small" data-bk-context role="note"></p><div class="sb-booking-form" role="group" aria-label="Buchungseintrag">'+
 '<label>Art<select data-bk="type"><option value="transport">Transfer</option><option value="lodging">Unterkunft</option><option value="volunteering">Volunteering</option><option value="activity">Erlebnis</option></select></label>'+
 '<label>Status<select data-bk="status"><option value="planned">Vorgemerkt</option><option value="requested">Angefragt / reserviert</option><option value="confirmed">Bestätigt (selbst eingetragen)</option><option value="cancelled">Storniert</option></select></label>'+
 '<label><span data-bk-caption="stageId">Ziel / Etappe</span><select data-bk="stageId">'+opts+'</select></label>'+
 '<label data-bk-for="transport">Startort<select data-bk="fromStageId"><option value="">Noch auswählen</option>'+opts+'</select></label>'+
 '<label><span data-bk-caption="title">Bezeichnung</span><input data-bk="title" maxlength="160" placeholder="z. B. Bus Medellín → Salento"></label>'+
 '<label><span data-bk-caption="provider">Anbieter / Host</span><input data-bk="provider" maxlength="160" placeholder="Betreiber oder Hostel"></label>'+
 '<label><span data-bk-caption="startDate">Beginn / Abfahrt</span><input type="date" data-bk="startDate"></label>'+
 '<label data-bk-for="lodging volunteering" hidden style="display:none"><span data-bk-caption="endDate">Ende / Check-out</span><input type="date" data-bk="endDate"></label>'+
 '<label>Währung (ISO-Code)<input data-bk="currency" maxlength="3" value="EUR" placeholder="EUR, BRL, COP, USD ..."></label>'+
 '<label>Gesamtpreis inkl. Gebühren (gewählte Währung)<input type="number" min="0" step="any" data-bk="totalEUR" placeholder="Leer = unbekannt"></label>'+
 '<div data-bk-fx hidden style="display:none"><p class="small">Manueller Kurs: <b>1 Einheit der Währung = wie viele EUR?</b> Quelle und Datum selbst prüfen; kein Live-Wechselkurs.</p>'+
 '<label>EUR je Währungseinheit<input type="number" data-bk="rateEUR" min="0" step="any" placeholder="z. B. 0.16 (nur Beispiel)"></label>'+
 '<label>Kursdatum<input type="date" data-bk="rateCheckedAt"></label>'+
 '<label>Quelle des Kurses<input data-bk="rateSource" maxlength="160" placeholder="z. B. Bankabrechnung"></label></div>'+
 '<label>Davon bezahlt €<input type="number" min="0" step="0.01" data-bk="paidEUR" value="0"></label>'+
 '<label>Davon erstattet €<input type="number" min="0" step="0.01" data-bk="refundedEUR" value="0"></label>'+
 '<label><span data-bk-caption="reference">Referenz / Bestätigung</span><input data-bk="reference" maxlength="200" placeholder="z. B. Buchungsnummer oder bestätigter Chat"></label>'+
 '<label>HTTPS-Buchungslink<input type="url" data-bk="url" placeholder="https://..."></label>'+
 '<label data-bk-for="activity" hidden style="display:none">Aktivitäten im Budget<select data-bk="activityMode"><option value="allowance">Mit bestehendem Ausflugsbudget verrechnen</option><option value="extra">Zusätzliche Ausgabe</option></select></label>'+
 '<label class="sb-booking-check"><input type="checkbox" data-bk="recordedElsewhere"> Bisherige pauschale Zahlung bereits im Reisejournal erfasst</label>'+
 '<div class="sb-booking-notes"><h3>Zahlungen & Erstattungen</h3><p class="small">Jede neue Zahlung hat ein eigenes Datum, eine eigene Währung und einen zugeordneten Buchungseintrag. Bei Fremdwährungen den tatsächlichen Kurs je Zahlung eingeben. Neue Einträge werden erst mit „Eintrag speichern“ übernommen.</p><div data-bk-payment-list></div>'+
 '<div class="sb-booking-form" role="group" aria-label="Zahlung hinzufügen">'+
 '<label>Art<select data-bk-tx="kind"><option value="payment">Zahlung</option><option value="refund">Erstattung</option></select></label>'+
 '<label>Buchungstag der Zahlung<input type="date" data-bk-tx="date"></label>'+
 '<label>Betrag<input type="number" min="0.01" step="any" data-bk-tx="amount" placeholder="Betrag eingeben"></label>'+
 '<label>Währung<input data-bk-tx="currency" maxlength="3" placeholder="EUR, BRL, USD ..."></label>'+
 '<div data-bk-tx-fx hidden style="display:none"><label>EUR je Währungseinheit<input type="number" step="any" min="0" data-bk-tx="rateEUR" placeholder="Tatsächlicher Kurs"></label><label>Datum des Zahlungskurses<input type="date" data-bk-tx="rateCheckedAt"></label><label>Quelle der Umrechnung<input data-bk-tx="rateSource" maxlength="160" placeholder="Bank / Kartenabrechnung"></label></div>'+
 '<label class="sb-booking-check"><input type="checkbox" data-bk-tx="recordedElsewhere"> Bereits im Reisejournal erfasst</label>'+
 '<label data-bk-journal hidden style="display:none">Journal-Referenz zur manuellen Zuordnung<input data-bk-tx="journalReference" maxlength="160" placeholder="z. B. Kartenzahlung im Reisejournal"></label>'+
 '</div><button type="button" data-bk-add-payment>Zahlung / Erstattung vormerken</button><p data-bk-payment-feedback class="small" role="status"></p></div>'+
 '<label class="sb-booking-notes">Notiz<textarea data-bk="notes" rows="2" maxlength="500" placeholder="Gepäck, Stornierung, enthaltene Leistungen ..."></textarea></label>'+
 '</div><p id="sb-booking-feedback" class="small" role="status"></p>'+
 '<div class="controls"><button type="button" data-bk-save>Eintrag speichern</button><button type="button" data-bk-reset>Neue Buchung</button><button type="button" data-bk-delete hidden>Eintrag löschen</button></div>'+
 '<p class="small">Unterkünfte können pro Etappe auf mehrere Buchungen mit unterschiedlichen Check-in/Check-out-Daten aufgeteilt werden. Bestätigte, nicht überlappende Nächte ersetzen nur die zugehörigen Unterkunftsschätzungen. Vor einer Host-Zusage liegende Hostel-Nächte werden als Wartekosten angerechnet, nicht als kostenlose Host-Nächte. Aktivitäten werden nach ihrer Budgetart verrechnet; Bewerbungen sind keine Host-Zusagen.</p>'+
 '</details>';
}
function bind(root,{route=[],getBookings,storeBookings,onSaved,initialStageId=null,prefill=null}={}){
 const form=root.querySelector('#sb-bookings-editor');if(!form)return;
 const field=k=>form.querySelector('[data-bk="'+k+'"]'),feedback=form.querySelector('#sb-booking-feedback');
 let editing=null,events=[],legacyPaid=0,legacyRefunded=0,legacyJournal=false;
 const deleteButton=root.querySelector('[data-bk-delete]');
 const tx=k=>form.querySelector('[data-bk-tx="'+k+'"]');
 const fxPanel=form.querySelector('[data-bk-fx]'),txFx=form.querySelector('[data-bk-tx-fx]');
 const journalRow=form.querySelector('[data-bk-journal]'),legacyControls=['paidEUR','refundedEUR','recordedElsewhere'];
 const changeFx=()=>{
  const foreign=field('currency').value.trim().toUpperCase()!=='EUR';
  fxPanel.hidden=!foreign;fxPanel.style.display=foreign?'':'none';
  const paymentCurrency=(tx('currency').value||field('currency').value).trim().toUpperCase();
  const transactionForeign=paymentCurrency!=='EUR';
  txFx.hidden=!transactionForeign;txFx.style.display=transactionForeign?'':'none';
  journalRow.hidden=!tx('recordedElsewhere').checked;journalRow.style.display=journalRow.hidden?'none':'';
 };
 const showEvents=()=>{
  const out=form.querySelector('[data-bk-payment-list]');
  out.innerHTML=events.length?events.map((p,i)=>'<div class="sb-booking-card"><div class="sb-booking-info"><b>'+
   esc(p.kind==='refund'?'Erstattung':'Zahlung')+' · '+esc(p.date)+'</b><small>'+
   esc(p.amount)+' '+esc(p.currency)+' · '+(p.recordedElsewhere?'im Reisejournal erfasst':'in Southbound erfasst')+'</small></div>'+
   '<button type="button" data-bk-remove-payment="'+i+'">Entfernen</button></div>').join(''):
   '<p class="small">Keine Einzelzahlungen hinterlegt. Bestehende pauschale Beträge bleiben erhalten.</p>';
  out.querySelectorAll('[data-bk-remove-payment]').forEach(button=>button.addEventListener('click',()=>{
   if(!confirm('Diese Zahlungszeile aus dem Eintrag entfernen? Eine echte Rückzahlung stattdessen als Erstattung erfassen.'))return;
   events.splice(Number(button.dataset.bkRemovePayment),1);showEvents();
   form.querySelector('[data-bk-payment-feedback]').textContent='Änderung vorgemerkt. Noch nicht gespeichert.';
  }));
  const has=events.length>0;
  for(const key of legacyControls){field(key).disabled=has;}
 };

 const routeLookup=i=>route.find(x=>x.i===i);
 const syncType=()=>{
  const type=field('type').value,info=typeCopy[type]||typeCopy.transport;
  const note=form.querySelector('[data-bk-context]');if(note)note.textContent=info.hint;
  form.querySelectorAll('[data-bk-for]').forEach(label=>{
   const shown=label.dataset.bkFor.split(' ').includes(type);
   label.hidden=!shown;label.style.display=shown?'':'none';
   const control=label.querySelector('[data-bk]');if(control)control.disabled=!shown;
  });
  form.querySelectorAll('[data-bk-caption]').forEach(label=>{
   const key=label.dataset.bkCaption;
   label.textContent=info.captions[key]||baseCaptions[key]||key;
  });
  for(const key of ['title','provider','reference']){
   const input=field(key);if(input)input.placeholder=info.placeholders[key]||'';
  }
 };
 const reset=()=>{
  editing=null;events=[];legacyPaid=0;legacyRefunded=0;legacyJournal=false;
  if(deleteButton)deleteButton.hidden=true;for(const k of ['title','provider','reference','url','endDate','notes','totalEUR','rateEUR','rateCheckedAt','rateSource'])field(k).value='';
  for(const k of ['paidEUR','refundedEUR'])field(k).value='0';
  field('type').value='transport';field('status').value='planned';field('activityMode').value='allowance';field('currency').value='EUR';
  for(const k of ['date','amount','rateEUR','rateCheckedAt','rateSource','journalReference'])tx(k).value='';
  tx('kind').value='payment';tx('currency').value='EUR';tx('recordedElsewhere').checked=false;
  field('recordedElsewhere').checked=false;
  field('stageId').value=String(route.some(x=>x.i===initialStageId)?initialStageId:route[1]?.i??route[0]?.i??0);
  dates();syncType();changeFx();showEvents();feedback.textContent='Neuer Eintrag – noch nicht gespeichert.';
 };
 const dates=()=>{
  const id=Number(field('stageId').value),at=route.findIndex(x=>x.i===id),item=routeLookup(id);
  // Pre-fill a host's waiting days for lodging, not nights already allocated to the host.
  const waitingLodging=field('type').value==='lodging'&&Number(item?.waitingDays)>0;
  field('startDate').value=waitingLodging?(item?.arrival||''):(item?.arrival||item?.start||'');
  field('endDate').value=waitingLodging?(item?.start||''):(item?.end||'');
  field('fromStageId').value=at>0?String(route[at-1].i):'';
 };
 const fill=b=>{
  editing=b.id;if(deleteButton)deleteButton.hidden=false;
  for(const k of ['type','status','stageId','fromStageId','title','provider','reference','url','startDate','endDate','totalEUR','paidEUR','refundedEUR','activityMode','notes']){
   if(field(k))field(k).value=b[k]??'';
  }
  field('currency').value=b.currency||'EUR';
  field('totalEUR').value=b.totalAmount??b.totalEUR??'';
  for(const k of ['rateEUR','rateCheckedAt','rateSource'])field(k).value=b[k]??'';
  events=Array.isArray(b.transactions)?b.transactions.map(x=>({...x})):[];
  legacyPaid=events.length?Number(b.legacyPaidEUR||0):Number(b.paidEUR||0);
  legacyRefunded=events.length?Number(b.legacyRefundedEUR||0):Number(b.refundedEUR||0);
  legacyJournal=events.length?b.legacyRecordedElsewhere===true:b.recordedElsewhere===true;
  field('recordedElsewhere').checked=legacyJournal;
  tx('currency').value=b.currency||'EUR';
  syncType();changeFx();showEvents();
  feedback.textContent='Du bearbeitest einen vorhandenen Eintrag. Änderungen werden erst mit „Eintrag speichern“ übernommen.';
  form.open=true;form.scrollIntoView({behavior:'smooth',block:'start'});
 };
 root.querySelectorAll('[data-bk-edit]').forEach(button=>button.addEventListener('click',()=>{
  const b=(getBookings()||[]).find(x=>x.id===button.dataset.bkEdit);if(b)fill(b);
 }));
 field('stageId').addEventListener('change',dates);
 field('currency').addEventListener('input',()=>{
  if(!tx('amount').value)tx('currency').value=field('currency').value.toUpperCase();
  changeFx();
 });
 tx('currency').addEventListener('input',changeFx);
 tx('recordedElsewhere').addEventListener('change',changeFx);
 root.querySelector('[data-bk-add-payment]').addEventListener('click',()=>{
  const value=k=>tx(k).value,amt=Number(value('amount'));
  if(!value('date')||!Number.isFinite(amt)||amt<=0){
   form.querySelector('[data-bk-payment-feedback]').textContent='Bitte Datum und positiven Betrag der Zahlung eingeben.';return;
  }
  const p={id:'payment-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),kind:value('kind'),
   date:value('date'),amount:value('amount'),currency:(value('currency')||field('currency').value).trim().toUpperCase(),
   rateEUR:value('rateEUR'),rateCheckedAt:value('rateCheckedAt'),rateSource:value('rateSource'),
   recordedElsewhere:tx('recordedElsewhere').checked,journalReference:value('journalReference')};
  const check=g.SouthboundBookingFinance.normalize({
   currency:field('currency').value||'EUR',totalAmount:field('totalEUR').value,
   rateEUR:field('rateEUR').value,rateCheckedAt:field('rateCheckedAt').value,rateSource:field('rateSource').value,
   transactions:events.concat(p),legacyPaidEUR:events.length?legacyPaid:Number(field('paidEUR').value||0),
   legacyRefundedEUR:events.length?legacyRefunded:Number(field('refundedEUR').value||0),
   legacyRecordedElsewhere:events.length?legacyJournal:field('recordedElsewhere').checked
  });
  if(!check.ok){form.querySelector('[data-bk-payment-feedback]').textContent='Zahlung prüfen: '+check.errors.join(', ');return;}
  if(!events.length){legacyPaid=Number(field('paidEUR').value||0);legacyRefunded=Number(field('refundedEUR').value||0);legacyJournal=field('recordedElsewhere').checked;}
  events.push(p);showEvents();
  for(const k of ['amount','journalReference'])tx(k).value='';
  form.querySelector('[data-bk-payment-feedback]').textContent='Zahlungszeile vorgemerkt – Buchung bitte speichern.';
 });
 field('type').addEventListener('change',()=>{if(editing===null)dates();syncType()});
 root.querySelector('[data-bk-reset]').addEventListener('click',reset);
 if(deleteButton)deleteButton.addEventListener('click',()=>{
  const record=(getBookings()||[]).find(x=>x.id===editing);if(!record)return;
  const paid=Math.max(0,Number(record.paidEUR||0)-Number(record.refundedEUR||0));
  const message=paid>0?'Achtung: Für diese Buchung sind '+euro(paid)+' netto bezahlt erfasst. Der Eintrag und seine Zahlung würden aus Southbound verschwinden. Bitte einen tatsächlichen Storno/Refund stattdessen bearbeiten, sofern die Zahlung weiterhin besteht. Wirklich löschen?':'Eintrag „'+record.title+'“ dauerhaft aus Southbound entfernen?';
  if(!confirm(message))return;
  storeBookings((getBookings()||[]).filter(x=>x.id!==record.id));onSaved();
 });
 root.querySelector('[data-bk-save]').addEventListener('click',()=>{
  const value=k=>field(k)?.value??'';
  const type=value('type');
  const raw={
   id:editing||'booking-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),
   type,status:value('status'),stageId:Number(value('stageId')),
   fromStageId:type==='transport'&&value('fromStageId')!==''?Number(value('fromStageId')):null,
   title:value('title'),provider:value('provider'),url:value('url').trim(),reference:value('reference'),
   startDate:value('startDate'),endDate:type==='lodging'||type==='volunteering'?value('endDate'):'',
   currency:value('currency').toUpperCase(),totalAmount:value('totalEUR'),totalEUR:value('currency').toUpperCase()==='EUR'?value('totalEUR'):'',
   rateEUR:value('rateEUR'),rateCheckedAt:value('rateCheckedAt'),rateSource:value('rateSource'),
   paidEUR:events.length?legacyPaid:value('paidEUR'),refundedEUR:events.length?legacyRefunded:value('refundedEUR'),
   transactions:events,legacyPaidEUR:events.length?legacyPaid:undefined,legacyRefundedEUR:events.length?legacyRefunded:undefined,legacyRecordedElsewhere:events.length?legacyJournal:undefined,
   activityMode:type==='activity'?value('activityMode'):'allowance',recordedElsewhere:events.length?legacyJournal:field('recordedElsewhere').checked,notes:value('notes')
  };
  const result=g.SouthboundBookingLedger.validate(raw);
  if(!result.ok){feedback.textContent='Bitte Eingaben prüfen: '+result.errors.join(', ');return}
  const entry=result.record,others=(getBookings()||[]).filter(x=>x.id!==entry.id);
  if(entry.status==='confirmed'&&!confirm('Bestätigung für „'+entry.title+'“ vom Anbieter/Host tatsächlich erhalten und selbst überprüft?'))return;
  storeBookings(others.concat(entry));onSaved();
 });
 reset();
 if(prefill&&routeLookup(prefill.stageId)&&['transport','lodging','volunteering','activity'].includes(prefill.type)){
  const existing=prefill.editId&&(getBookings()||[]).find(x=>x.id===prefill.editId&&x.type===prefill.type&&x.stageId===prefill.stageId);
  if(existing)fill(existing);
  else{
   field('type').value=prefill.type;
   field('stageId').value=String(prefill.stageId);
   dates();syncType();
   form.open=true;
   feedback.textContent='Eintrag für '+(labels[prefill.type]||prefill.type)+' und die ausgewählte Etappe vorbereiten. Noch nichts gespeichert.';
  }
 }
}
g.SouthboundBookingUI={render,bind};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundBookingUI;
})(typeof globalThis!=='undefined'?globalThis:this);
