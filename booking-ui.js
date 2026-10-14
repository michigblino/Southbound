/* User-entered booking register. No provider API, checkout, or automatic booking confirmation. */
(function(g){'use strict';
const euro=n=>g.SouthboundCurrencyDisplay?.(Number(n))||'€'+Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const fixedLabels={insurance:'Versicherung',equipment:'Ausrüstung',visas:'Visa / Einreise'};
const labels={transport:'Transfer',lodging:'Unterkunft',volunteering:'Volunteering',activity:'Erlebnis',fixed:'Fixkosten'};
const statuses={planned:'Vorgemerkt',requested:'Angefragt',confirmed:'Bestätigt',cancelled:'Storniert'};
const icons={transport:'↗',lodging:'⌂',volunteering:'♡',activity:'◇',fixed:'▣'};
const shortcutPaths={
 inbound:'<path d="m21 3-8 18-3-8-8-3 19-7Z"/><path d="m10 13 4-4"/>',
 return:'<path d="m20 4-6 12-3-5-7-1 16-6Z"/><path d="M18 20H7m0 0 4-4m-4 4 4 3"/>',
 transport:'<rect x="4" y="3" width="16" height="17" rx="2"/><path d="M4 12h16M8 20v2m8-2v2M8 7h.01M16 7h.01"/>',
 lodging:'<path d="M3 4v17M3 16h18v5M3 10h15a3 3 0 0 1 3 3v3"/><path d="M7 10V7h5v3"/>',
 volunteering:'<path d="M20.8 8.6c0 4.2-8.8 10.1-8.8 10.1S3.2 12.8 3.2 8.6a4.3 4.3 0 0 1 8.8-1 4.3 4.3 0 0 1 8.8 1Z"/>',
 activity:'<path d="m2 20 7-13 4 7 3-5 6 11H2Z"/>',
 insurance:'<path d="M12 2 4 5v6c0 6 3 9 8 11 5-2 8-5 8-11V5l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
 equipment:'<rect x="5" y="4" width="14" height="18" rx="3"/><path d="M9 4V2h6v2M5 11h14M10 16h4"/>',
 visas:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 17h4"/>'
};
const bookingGroups=[
 {key:'inbound',title:'Anreise',subtitle:'Flüge zum Reisebeginn'},
 {key:'return',title:'Rückflug',subtitle:'Heimreise und Zwischenstopps'},
 {key:'transport',title:'Transfers',subtitle:'Verbindungen zwischen Etappen'},
 {key:'lodging',title:'Unterkünfte',subtitle:'Hostels und Hotels'},
 {key:'volunteering',title:'Volunteering',subtitle:'Hosts und Zusagen'},
 {key:'activity',title:'Erlebnisse',subtitle:'Touren und Tickets'},
 {key:'insurance',title:'Versicherung',subtitle:'Reise- und Auslandsschutz'},
 {key:'equipment',title:'Ausrüstung',subtitle:'Rucksack und Reisebedarf'},
 {key:'visas',title:'Visa / Einreise',subtitle:'Einreiseunterlagen und Gebühren'}
];
const bookingCategory=b=>b?.type==='fixed'?(b.fixedKind||'visas'):b?.type==='transport'?(b.journeyOrigin?'inbound':b.journeyReturn?'return':'transport'):b?.type==='lodging'?'lodging':b?.type==='volunteering'?'volunteering':'activity';
const shortcutIcon=kind=>'<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'+''+'>'+shortcutPaths[kind]+'</svg>';

const typeCopy={
 transport:{hint:'Transfer: Startort, Ziel und Abfahrt müssen mit deiner Route übereinstimmen. Nur eine bestätigte passende Verbindung ersetzt den geschätzten Fahrpreis.',captions:{stageId:'Ziel / Etappe',title:'Verbindung / Ticket',provider:'Verkehrsanbieter',startDate:'Abfahrt / Reisetag',reference:'Ticket- oder Buchungsnummer'},placeholders:{title:'z. B. Bus Medellín → Salento',provider:'z. B. Busunternehmen',reference:'Ticket- oder Buchungsnummer'}},
 lodging:{hint:'Unterkunft: Auch einzelne oder mehrere nicht überlappende Nächte sind möglich. Bestätigte Teilbuchungen ersetzen nur ihre Nächte; der Rest bleibt eine Schätzung. Vor Host-Beginn zählen Hostelbuchungen zu den Wartekosten.',captions:{stageId:'Ort / Etappe',title:'Unterkunft / Zimmer',provider:'Hostel / Unterkunftsanbieter',startDate:'Check-in',endDate:'Check-out',reference:'Reservierungs- oder Buchungsnummer'},placeholders:{title:'z. B. Hostel Paraty',provider:'Name des Hostels',reference:'Reservierungscode'}},
 volunteering:{hint:'Volunteering: Hier erfasst du Bewerbung, Host und gegebenenfalls Gebühren. Kostenlose Unterkunft entsteht erst durch die separat erfasste Host-Zusage in der Etappe.',captions:{stageId:'Ort / Etappe',title:'Host / Projekt',provider:'Plattform / Host',startDate:'Geplanter Beginn',endDate:'Geplantes Ende',reference:'Bewerbungs- oder Bestätigungsreferenz'},placeholders:{title:'z. B. Farmstay in Salento',provider:'z. B. Workaway / Gastgeber',reference:'Bewerbungs-ID oder Nachricht'}},
 fixed:{hint:'Versicherung, Ausrüstung und Visa mit Anbieter, Beleg und Zahlung erfassen. Bestätigte Beträge ersetzen die bisherigen Fixkostenschätzungen.',captions:{stageId:'Reise',title:'Leistung / Produkt',provider:'Anbieter / Händler',startDate:'Kauf- oder Buchungsdatum',reference:'Bestell-/Policennummer'},placeholders:{title:'z. B. Auslandskrankenversicherung',provider:'Anbieter oder Händler',reference:'Bestätigung oder Rechnung'}},
 activity:{hint:'Erlebnis: Erfasse den Veranstaltungstag und wähle, ob der Preis in der Aktivitätenpauschale enthalten oder zusätzlich einzuplanen ist.',captions:{stageId:'Ort / Etappe',title:'Erlebnis / Ausflug',provider:'Veranstalter',startDate:'Datum des Erlebnisses',reference:'Ticket- oder Buchungsnummer'},placeholders:{title:'z. B. Wanderung mit Guide',provider:'Name des Veranstalters',reference:'Ticketcode'}}
};
const baseCaptions={stageId:'Ziel / Etappe',title:'Bezeichnung',provider:'Anbieter / Host',startDate:'Beginn / Abfahrt',endDate:'Ende / Check-out',reference:'Referenz / Bestätigung'};
function render({route=[],bookings=[],ledger,baseCurrency='EUR',fxQuotes=null,tripOrigin='München (MUC)',fromStage=false}={}){
 const available=route.filter(x=>x&&x.i!==undefined),defaultId=available[0]?.i??0;
 const lastTravel=[...available].reverse().find(x=>!x.isReturn&&Number(x.days)>0)||available.at(-1);
 const opts=available.map(x=>'<option value="'+x.i+'">'+esc(x.name)+'</option>').join('');
 const warnings=ledger?.warnings||[];
 const records=Array.isArray(bookings)?bookings:[];
 const total=ledger?.recordedPayment||0,real=ledger?.extraPaid||0;
 const firstSavedGroup=bookingGroups.find(group=>records.some(b=>bookingCategory(b)===group.key))?.key;
 const chooser=(fromStage?'':'<div class="panel sb-booking-choose"><div class="eyebrow">BUCHUNGEN / SCHNELLSTART</div><h2>Was möchtest du buchen?</h2><p class="small">Wähle eine Kategorie – die passenden Felder öffnen sich direkt. Bestätigungen und Preise trägst du selbst ein.</p><div class="sb-booking-shortcuts">'+
 '<button type="button" data-bk-preset="inbound">'+shortcutIcon('inbound')+'<b>Anreiseflug</b><small>Ab Heimatflughafen</small></button>'+
 '<button type="button" data-bk-preset="return">'+shortcutIcon('return')+'<b>Rückflug</b><small>Zurück nach Hause</small></button>'+
 '<button type="button" data-bk-preset="transport">'+shortcutIcon('transport')+'<b>Transfer</b><small>Bus, Bahn, Flug</small></button>'+
 '<button type="button" data-bk-preset="lodging">'+shortcutIcon('lodging')+'<b>Unterkunft</b><small>Hostel oder Hotel</small></button>'+
 '<button type="button" data-bk-preset="volunteering">'+shortcutIcon('volunteering')+'<b>Volunteering</b><small>Host und Zusage</small></button>'+
 '<button type="button" data-bk-preset="activity">'+shortcutIcon('activity')+'<b>Erlebnis</b><small>Tour oder Ticket</small></button>'+
 '</div><details class="sb-booking-extra-shortcuts"><summary>Versicherung, Ausrüstung & Einreise</summary><div class="sb-booking-shortcuts">'+
 ['insurance','equipment','visas'].map(k=>'<button type="button" data-bk-fixed-preset="'+k+'">'+shortcutIcon(k)+'<b>'+fixedLabels[k]+'</b><small>Fixkosten erfassen</small></button>').join('')+
 '</div></details></div>');
 return chooser+'<div class="panel"><div class="eyebrow">Buchungen · Beta</div><h2>Deine Buchungszentrale</h2>'+
 '<p class="small">Tickets, Host-Anfragen, Unterkünfte und Ausflüge festhalten. Noch <b>keine Buchung und keine Zahlung innerhalb von The Worn Road</b>. Bestätigt bedeutet hier: von dir als bestätigt eingetragen, nicht unabhängig vom Anbieter verifiziert. Aktuelle Kurse sind Tages-Referenzwerte, nicht automatisch dein tatsächlicher Bankkurs.</p>'+
 '<div class="sb-booking-stats"><div><small>Gespeicherte Einträge</small><b>'+records.length+'</b></div><div><small>Als bestätigt erfasst</small><b>'+Number(ledger?.confirmed||0)+'</b></div><div><small>Zahlungen (netto) in Buchungen</small><b>'+euro(total)+'</b></div></div>'+
 '<p class="small">Davon '+euro(real)+' noch nicht im Reisejournal verbucht – nur dieser Teil wird zusätzlich als bereits bezahlt gezählt. Bereits anderswo erfasste Beträge werden nicht erneut addiert. Wechselkurse, Zahlungen und Journal-Referenzen sind von dir eingetragen und nicht automatisch überprüft.</p>'+
 (warnings.length?'<div class="note"><b>'+warnings.length+' Buchung(en) prüfen</b><p class="small">Unpassende Buchungen ändern deine Reisekosten nicht stillschweigend.</p>'+warnings.slice(0,8).map(w=>'<p class="small">'+esc(w.id)+': '+esc(w.reason)+'</p>').join('')+'</div>':'')+
 '</div><div class="panel"><h2>Gespeicherte Buchungen</h2>'+
 (records.length?'<div class="sb-booking-groups">'+bookingGroups.map(group=>{
  const subset=records.filter(b=>bookingCategory(b)===group.key).sort((a,b)=>String(a.startDate||'9999-99-99').localeCompare(String(b.startDate||'9999-99-99')));
  if(!subset.length)return '';
  return '<details class="sb-booking-group" data-bk-group="'+group.key+'"'+(firstSavedGroup===group.key?' open':'')+'><summary class="sb-booking-group__heading"><span class="sb-booking-group__icon" aria-hidden="true">'+shortcutIcon(group.key)+'</span><div><h3>'+group.title+'</h3><p class="small">'+group.subtitle+'</p></div><span class="sb-booking-group__count" aria-label="'+subset.length+' Einträge">'+subset.length+'</span><span class="sb-booking-group__chevron" aria-hidden="true">⌄</span></summary><div class="sb-booking-list">'+subset.map(b=>{
  const place=available.find(x=>x.i===b.stageId)?.name||'Etappe '+b.stageId;
  const description=b.type==='transport'&&b.journeyOrigin?(b.originPlace||tripOrigin)+' → '+place:b.type==='transport'&&b.journeyReturn?(b.originPlace||place)+' → '+(b.destinationPlace||tripOrigin):place;
  const stopoverLabel=Array.isArray(b.stopovers)&&b.stopovers.length?' · via '+b.stopovers.map(x=>x.place+(x.departureDate>x.arrivalDate?' (Übernachtung)':'')).join(', '):'';
  const paid=Number(b.paidEUR||0)-Number(b.refundedEUR||0);
  const converted=String(b.currency||'EUR')!=='EUR'&&b.totalAmount!==null&&b.totalAmount!==undefined?
   esc(b.totalAmount)+' '+esc(b.currency)+' ≈ '+euro(b.totalEUR):b.totalEUR===null?'Preis unbekannt':euro(b.totalEUR);
  return '<div class="sb-booking-card"><span class="sb-booking-symbol" aria-hidden="true">'+esc(icons[b.type]||'·')+'</span><div class="sb-booking-info"><b>'+esc(b.title||'Eintrag')+'</b><small>'+esc(b.type==='transport'&&b.journeyOrigin?'Anreiseflug':b.type==='transport'&&b.journeyReturn?'Rückflug':b.type==='fixed'?fixedLabels[b.fixedKind]||'Fixkosten':labels[b.type]||b.type)+' · '+esc(description)+esc(stopoverLabel)+' · '+esc(b.startDate||'ohne Datum')+'</small><small>'+esc(b.provider||'')+' · '+esc(statuses[b.status]||'Unbekannt')+' · '+converted+' · '+euro(paid)+' netto bezahlt</small></div><button type="button" data-bk-edit="'+esc(b.id)+'" class="sb-booking-edit">Bearbeiten</button></div>'
 }).join('')+'</div></details>';
 }).join('')+'</div>':'<p class="small">Noch keine Buchungen hinterlegt. Du kannst jetzt die erste Reiseleistung erfassen.</p>')+
 '</div>'+'<details class="panel" id="sb-bookings-editor"'+(fromStage?' open':'')+'><summary><b data-bk-editor-title>Buchung erfassen oder bearbeiten</b></summary>'+
 '<p class="small">Nur tatsächlich erhaltene Buchungsbestätigungen als „Bestätigt“ markieren. Bei Volunteering erfolgt die eigentliche Host-Zusage weiterhin über „Etappen“.</p>'+
 '<p class="small" data-bk-context role="note"></p><div class="sb-booking-wizard" data-bk-wizard hidden aria-label="Buchung in drei Schritten">'+
 '<button type="button" data-bk-step-go="1"><span>1</span> Reiseleistung</button>'+
 '<button type="button" data-bk-step-go="2"><span>2</span> Preis & Zahlung</button>'+
 '<button type="button" data-bk-step-go="3"><span>3</span> Bestätigung</button></div>'+
 '<div class="sb-booking-form" role="group" aria-label="Buchungseintrag">'+
 '<label>Art<select data-bk="type"><option value="transport">Transfer</option><option value="lodging">Unterkunft</option><option value="volunteering">Volunteering</option><option value="activity">Erlebnis</option><option value="fixed">Fixkosten</option></select></label>'+
 '<label>Status<select data-bk="status"><option value="planned">Vorgemerkt</option><option value="requested">Angefragt / reserviert</option><option value="confirmed">Bestätigt (selbst eingetragen)</option><option value="cancelled">Storniert</option></select></label>'+
 '<label data-bk-stage><span data-bk-caption="stageId">Ziel / Etappe</span><select data-bk="stageId">'+opts+'</select></label>'+
 '<label data-bk-for="fixed" hidden style="display:none">Fixkostenkategorie<select data-bk="fixedKind"><option value="insurance">Versicherung</option><option value="equipment">Ausrüstung</option><option value="visas">Visa / Einreise</option></select></label>'+
 '<label data-bk-for="transport">Verbindung<select data-bk="journeyOrigin"><option value="route">Zwischen Reiseetappen</option><option value="inbound">Anreise von außerhalb der Route</option><option value="return">Rückreise zum Heimatort</option></select></label>'+
 '<label data-bk-for="transport" data-bk-conditional="route-origin">Startetappe<select data-bk="fromStageId"><option value="">Noch auswählen</option>'+opts+'</select></label>'+
 '<label data-bk-for="transport" data-bk-conditional="inbound-origin" hidden style="display:none"><span data-bk-origin-caption>Startflughafen / Startort</span><input data-bk="originPlace" maxlength="160" value="'+esc(tripOrigin)+'" placeholder="z. B. München (MUC)"></label>'+
 '<label data-bk-for="transport" data-bk-conditional="return-destination" hidden style="display:none">Heimatflughafen / Rückkehrort<input data-bk="destinationPlace" maxlength="160" value="'+esc(tripOrigin)+'" placeholder="z. B. München (MUC)"></label>'+
 '<label data-bk-for="transport">Transportmittel<select data-bk="travelMode"><option value="ground">Bus / Bahn / Sonstiges</option><option value="flight">Flug</option></select></label>'+
 '<label><span data-bk-caption="title">Bezeichnung</span><input data-bk="title" maxlength="160" placeholder="z. B. Bus Medellín → Salento"></label>'+
 '<label><span data-bk-caption="provider">Anbieter / Host</span><input data-bk="provider" maxlength="160" placeholder="Betreiber oder Hostel"></label>'+
 '<label><span data-bk-caption="startDate">Beginn / Abfahrt</span><input type="date" data-bk="startDate"></label>'+
 '<label data-bk-for="lodging volunteering" hidden style="display:none"><span data-bk-caption="endDate">Ende / Check-out</span><input type="date" data-bk="endDate"></label>'+
 '<label data-bk-for="transport" data-bk-conditional="flight" hidden style="display:none">Ankunftstag am Ziel<input type="date" data-bk="arrivalDate"></label>'+
 '<label data-bk-for="transport" data-bk-conditional="flight" hidden style="display:none">Zielflughafen (optional)<input data-bk="destinationAirport" maxlength="120" placeholder="z. B. São Paulo GRU"></label>'+
 '<div class="sb-booking-stopovers" data-bk-for="transport" data-bk-conditional="flight" hidden style="display:none"><h3>Zwischenstopps / Layover</h3><p class="small">Übernachtungen im Ticket sind abgedeckt; separate oder unbekannte Hotelkosten bleiben im All-in-Budget offen, bis sie separat erfasst sind.</p><div data-bk-stopover-list></div><button type="button" data-bk-add-stopover>+ Zwischenstopp hinzufügen</button></div>'+
 '<label>Preiswährung (ISO-Code)<input data-bk="currency" maxlength="3" value="'+esc(baseCurrency)+'" placeholder="EUR, BRL, COP, USD ..."></label>'+
 '<label>Gesamtpreis inkl. Gebühren (gewählte Währung)<input type="number" min="0" step="any" data-bk="totalEUR" placeholder="Leer = unbekannt"></label>'+
 '<div data-bk-fx hidden style="display:none"><p class="small">The Worn Road trägt den letzten verfügbaren Tages-Referenzkurs automatisch ein. <b>1 Einheit der Preiswährung = wie viele EUR?</b> Für tatsächlich gezahlte Beträge den Bank-/Kartenauszug bevorzugen. Kurs, Quelle und Datum bleiben editierbar.</p>'+
 '<label>EUR je Währungseinheit<input type="number" data-bk="rateEUR" min="0" step="any" placeholder="z. B. 0.16 (nur Beispiel)"></label>'+
 '<label>Kursdatum<input type="date" data-bk="rateCheckedAt"></label>'+
 '<label>Quelle des Kurses<input data-bk="rateSource" maxlength="160" placeholder="z. B. Bankabrechnung"></label></div>'+
 '<label>Davon bezahlt €<input type="number" min="0" step="0.01" data-bk="paidEUR" value="0"></label>'+
 '<label>Davon erstattet €<input type="number" min="0" step="0.01" data-bk="refundedEUR" value="0"></label>'+
 '<label><span data-bk-caption="reference">Referenz / Bestätigung</span><input data-bk="reference" maxlength="200" placeholder="z. B. Buchungsnummer oder bestätigter Chat"></label>'+
 '<label>HTTPS-Buchungslink<input type="url" data-bk="url" placeholder="https://..."></label>'+
 '<label data-bk-for="activity" hidden style="display:none">Aktivitäten im Budget<select data-bk="activityMode"><option value="allowance">Mit bestehendem Ausflugsbudget verrechnen</option><option value="extra">Zusätzliche Ausgabe</option></select></label>'+
 '<label class="sb-booking-check"><input type="checkbox" data-bk="recordedElsewhere"> Bisherige pauschale Zahlung bereits im Reisejournal erfasst</label>'+
 '<details class="sb-booking-notes" data-bk-payment-details><summary><b>Einzelzahlungen & Erstattungen (optional)</b></summary><h3>Zahlungen & Erstattungen</h3><p class="small">Für Fremdwährungen wird ein Tages-Referenzkurs automatisch vorgeschlagen. Der tatsächlich belastete Kartenkurs kann abweichen; überschreibe den Vorschlag mit dem Bankwert, falls vorhanden. Neue Einträge werden erst mit „Eintrag speichern“ übernommen.</p><div data-bk-payment-list></div>'+
 '<div class="sb-booking-form" role="group" aria-label="Zahlung hinzufügen">'+
 '<label>Art<select data-bk-tx="kind"><option value="payment">Zahlung</option><option value="refund">Erstattung</option></select></label>'+
 '<label>Buchungstag der Zahlung<input type="date" data-bk-tx="date"></label>'+
 '<label>Betrag<input type="number" min="0.01" step="any" data-bk-tx="amount" placeholder="Betrag eingeben"></label>'+
 '<label>Währung<input data-bk-tx="currency" maxlength="3" placeholder="EUR, BRL, USD ..."></label>'+
 '<div data-bk-tx-fx hidden style="display:none"><label>EUR je Währungseinheit<input type="number" step="any" min="0" data-bk-tx="rateEUR" placeholder="Tatsächlicher Kurs"></label><label>Datum des Zahlungskurses<input type="date" data-bk-tx="rateCheckedAt"></label><label>Quelle der Umrechnung<input data-bk-tx="rateSource" maxlength="160" placeholder="Bank / Kartenabrechnung"></label></div>'+
 '<label class="sb-booking-check"><input type="checkbox" data-bk-tx="recordedElsewhere"> Bereits im Reisejournal erfasst</label>'+
 '<label data-bk-journal hidden style="display:none">Journal-Referenz zur manuellen Zuordnung<input data-bk-tx="journalReference" maxlength="160" placeholder="z. B. Kartenzahlung im Reisejournal"></label>'+
 '</div><button type="button" data-bk-add-payment>Zahlung / Erstattung vormerken</button><p data-bk-payment-feedback class="small" role="status"></p></details>'+
 '<label class="sb-booking-notes">Notiz<textarea data-bk="notes" rows="2" maxlength="500" placeholder="Gepäck, Stornierung, enthaltene Leistungen ..."></textarea></label>'+
 '</div><div class="sb-booking-wizard__footer" data-bk-wizard-footer hidden>'+
 '<button type="button" data-bk-prev>Zurück</button><button type="button" data-bk-next class="primary">Weiter</button>'+
 '<button type="button" data-bk-all aria-label="Zur vollständigen Buchungsmaske wechseln">Alle Felder anzeigen</button></div>'+
 '<p id="sb-booking-feedback" class="small" role="status"></p>'+
 '<div class="controls"><button type="button" data-bk-save>Eintrag speichern</button><button type="button" data-bk-reset>Neue Buchung</button><button type="button" data-bk-delete hidden>Eintrag löschen</button></div>'+
 '<p class="small">Unterkünfte können pro Etappe auf mehrere Buchungen mit unterschiedlichen Check-in/Check-out-Daten aufgeteilt werden. Bestätigte, nicht überlappende Nächte ersetzen nur die zugehörigen Unterkunftsschätzungen. Vor einer Host-Zusage liegende Hostel-Nächte werden als Wartekosten angerechnet, nicht als kostenlose Host-Nächte. Aktivitäten werden nach ihrer Budgetart verrechnet; Bewerbungen sind keine Host-Zusagen.</p>'+
 '</details>';
}
function bind(root,{route=[],getBookings,storeBookings,onSaved,getFxQuotes=()=>null,getBaseCurrency=()=> 'EUR',initialStageId=null,prefill=null,tripOrigin='München (MUC)',fromStage=false}={}){
 const form=root.querySelector('#sb-bookings-editor');if(!form)return;
 const field=k=>form.querySelector('[data-bk="'+k+'"]'),feedback=form.querySelector('#sb-booking-feedback');
 let editing=null,events=[],legacyPaid=0,legacyRefunded=0,legacyJournal=false,stopovers=[];
 const lastTravel=[...route].reverse().find(x=>!x.isReturn&&Number(x.days)>0)||route.at(-1);
 const deleteButton=root.querySelector('[data-bk-delete]');
 // Progressive disclosure is opt-in from the six cards. Existing edits and
 // stage context actions retain the full editor (and legacy data semantics).
 const formFields=form.querySelector('.sb-booking-form[aria-label="Buchungseintrag"]');
 const wizardBar=form.querySelector('[data-bk-wizard]'),wizardFoot=form.querySelector('[data-bk-wizard-footer]');
 const backButton=form.querySelector('[data-bk-prev]'),nextButton=form.querySelector('[data-bk-next]');
 let wizardStep=1,wizardEnabled=false;
 const paymentKeys=new Set(['currency','totalEUR','rateEUR','rateCheckedAt','rateSource','paidEUR','refundedEUR','recordedElsewhere','notes']);
 const reviewKeys=new Set(['status','reference','url']);
 for(const el of formFields.children){
  const entry=el.querySelector('[data-bk]'),key=entry?.dataset.bk||'';
  const step=el.matches('[data-bk-fx],[data-bk-payment-details]')||paymentKeys.has(key)?2:reviewKeys.has(key)?3:1;
  el.dataset.bkStep=String(step);
 }
 formFields.setAttribute('data-bk-wizard-fields','');
 const setWizard=(enabled,step=1)=>{
  wizardEnabled=!!enabled;wizardStep=Math.min(3,Math.max(1,step));form.dataset.bkGuided=String(wizardEnabled);
  wizardBar.hidden=!wizardEnabled;wizardFoot.hidden=!wizardEnabled;
  for(const el of formFields.children){el.toggleAttribute('data-bk-current',!wizardEnabled||Number(el.dataset.bkStep)===wizardStep);}
  for(const btn of wizardBar.querySelectorAll('[data-bk-step-go]')){
   const selected=Number(btn.dataset.bkStepGo)===wizardStep;
   btn.setAttribute('aria-current',selected?'step':'false');btn.classList.toggle('active',selected);
  }
  backButton.disabled=wizardStep===1;nextButton.hidden=wizardStep===3;
  form.querySelector('[data-bk-save]').hidden=wizardEnabled&&wizardStep!==3;
 };
 for(const btn of wizardBar.querySelectorAll('[data-bk-step-go]'))btn.addEventListener('click',()=>setWizard(true,Number(btn.dataset.bkStepGo)));
 backButton.addEventListener('click',()=>setWizard(true,wizardStep-1));
 nextButton.addEventListener('click',()=>setWizard(true,wizardStep+1));
 form.querySelector('[data-bk-all]').addEventListener('click',()=>setWizard(false));
 const tx=k=>form.querySelector('[data-bk-tx="'+k+'"]');
 const fxPanel=form.querySelector('[data-bk-fx]'),txFx=form.querySelector('[data-bk-tx-fx]');
 const journalRow=form.querySelector('[data-bk-journal]'),legacyControls=['paidEUR','refundedEUR','recordedElsewhere'];
 const autoRate=(code,prefix,{overwrite=false}={})=>{
  const ccy=(code||'EUR').trim().toUpperCase();
  if(ccy==='EUR')return;
  const q=g.SouthboundFX?.eurPerUnit(getFxQuotes(),ccy);
  if(!q)return;
  const find=name=>prefix==='booking'?field(name):tx(name);
  if(!overwrite&&find('rateEUR').value.trim()!=='')return; // respect bank-entered or earlier manually confirmed values
  find('rateEUR').value=String(Number(q.rate.toPrecision(12)));
  find('rateCheckedAt').value=q.date;
  find('rateSource').value=q.source+' (täglicher Referenzkurs, keine Bankabrechnung)';
 };
 const autoBoth=()=>{
  autoRate(field('currency').value,'booking');
  autoRate(tx('currency').value,'tx');
 };
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
   esc(p.amount)+' '+esc(p.currency)+' · '+(p.recordedElsewhere?'im Reisejournal erfasst':'in The Worn Road erfasst')+'</small></div>'+
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
 const layoversRoot=form.querySelector('[data-bk-stopover-list]');
 const readStopovers=()=>field('type').value!=='transport'||field('travelMode').value!=='flight'?[]:
  [...layoversRoot.querySelectorAll('[data-bk-layover-row]')].map(row=>({
   place:row.querySelector('[data-bk-layover-place]').value.trim(),
   arrivalDate:row.querySelector('[data-bk-layover-arrival]').value,
   departureDate:row.querySelector('[data-bk-layover-departure]').value,
   overnight:row.querySelector('[data-bk-layover-overnight]').value
  }));
 const showStopovers=()=>{
  layoversRoot.innerHTML=stopovers.map((x,i)=>'<div class="sb-booking-layover" data-bk-layover-row>'+
  '<div class="sb-booking-layover-title"><b>Zwischenstopp '+(i+1)+'</b><button type="button" data-bk-remove-stopover="'+i+'">Entfernen</button></div>'+
  '<label>Flughafen / Ort<input data-bk-layover-place maxlength="160" value="'+esc(x.place||'')+'" placeholder="z. B. Casablanca (CMN)"></label>'+
  '<label>Ankunft (Ortsdatum)<input type="date" data-bk-layover-arrival value="'+esc(x.arrivalDate||'')+'"></label>'+
  '<label>Weiterflug (Ortsdatum)<input type="date" data-bk-layover-departure value="'+esc(x.departureDate||'')+'"></label>'+
  '<label>Übernachtungskosten<select data-bk-layover-overnight>'+
  [['unknown','Noch unbekannt'],['included','Hotel im Ticket enthalten'],['none','Kein Hotel benötigt (z. B. Flughafen)'],['separate','Hotel separat zu zahlen']].map(([v,l])=>'<option value="'+v+'"'+(x.overnight===v?' selected':'')+'>'+l+'</option>').join('')+
  '</select></label></div>').join('');
  layoversRoot.querySelectorAll('[data-bk-remove-stopover]').forEach(btn=>btn.onclick=()=>{
   stopovers=readStopovers();stopovers.splice(Number(btn.dataset.bkRemoveStopover),1);showStopovers();
  });
 };
 const showTransportFields=()=>{
  const type=field('type').value,transport=type==='transport',inbound=transport&&field('journeyOrigin').value==='inbound',outbound=transport&&field('journeyOrigin').value==='return';
  if(inbound||outbound)field('travelMode').value='flight';
  for(const el of form.querySelectorAll('[data-bk-conditional]')){
   const code=el.dataset.bkConditional;
   const shown=transport&&(code==='inbound-origin'?(inbound||outbound):code==='return-destination'?outbound:code==='route-origin'?!inbound&&!outbound:field('travelMode').value==='flight');
   el.hidden=!shown;el.style.display=shown?'':'none';
   for(const control of el.querySelectorAll('input,select,textarea'))control.disabled=!shown;
  }
  form.querySelector('[data-bk-origin-caption]').textContent=outbound?'Abflughafen / Startort':'Startflughafen / Startort';
  form.querySelector('[data-bk-caption="stageId"]').textContent=outbound?'Letzte Reiseetappe':inbound?'Ankunftsetappe':(typeCopy[type]||typeCopy.transport).captions.stageId||'Ziel / Etappe';
  const header=form.querySelector('[data-bk-editor-title]');if(header)header.textContent=editing?'Buchung bearbeiten':outbound?'Rückflug erfassen':inbound?'Anreiseflug erfassen':type==='fixed'?fixedLabels[field('fixedKind').value]+' erfassen':(labels[type]||'Buchung')+' erfassen';
  const note=form.querySelector('[data-bk-context]');
  if(type==='fixed'&&note)note.textContent=(fixedLabels[field('fixedKind').value]||'Fixkosten')+': Anbieter, Betrag und Zahlungsstand eintragen. Vertrag oder Kauf erfolgt weiterhin extern.';
  if(outbound&&note)note.textContent='Rückreise von der letzten Etappe nach '+(field('destinationPlace').value||tripOrigin)+'. Abflug am Ende der Etappe, mit optionalen Zwischenstopps und eigenem Ankunftsdatum. Ein gebuchtes Ticket ersetzt die alte Rückreiseschätzung.';
  if(inbound&&note)note.textContent='Anreiseflug ab '+(field('originPlace').value||tripOrigin)+' zur ersten Etappe. Abflug kann vor Ankunft liegen. Zwischenstopps direkt am Ticket erfassen. Keine automatische Routenänderung.';
 };
 const syncType=()=>{
  const type=field('type').value,info=typeCopy[type]||typeCopy.transport;
   const stageField=form.querySelector('[data-bk-stage]');if(stageField){stageField.hidden=type==='fixed';stageField.style.display=type==='fixed'?'none':'';}
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
  showTransportFields();
 };
 const reset=()=>{
  editing=null;events=[];legacyPaid=0;legacyRefunded=0;legacyJournal=false;stopovers=[];showStopovers();
  if(deleteButton)deleteButton.hidden=true;for(const k of ['title','provider','reference','url','endDate','notes','totalEUR','rateEUR','rateCheckedAt','rateSource','arrivalDate','destinationAirport','destinationPlace'])field(k).value='';
  for(const k of ['paidEUR','refundedEUR'])field(k).value='0';
  field('type').value='transport';field('status').value='planned';field('activityMode').value='allowance';field('currency').value=getBaseCurrency();
  field('fixedKind').value='insurance';field('journeyOrigin').value='route';field('travelMode').value='ground';field('originPlace').value=tripOrigin;field('destinationPlace').value=tripOrigin;
  for(const k of ['date','amount','rateEUR','rateCheckedAt','rateSource','journalReference'])tx(k).value='';
  tx('kind').value='payment';tx('currency').value=getBaseCurrency();tx('recordedElsewhere').checked=false;
  field('recordedElsewhere').checked=false;
  field('stageId').value=String(route.some(x=>x.i===initialStageId)?initialStageId:route[1]?.i??route[0]?.i??0);
  dates();syncType();changeFx();autoBoth();showEvents();feedback.textContent='Neuer Eintrag – noch nicht gespeichert.';
 };
 const dates=()=>{
  const id=Number(field('stageId').value),at=route.findIndex(x=>x.i===id),item=routeLookup(id);
  // Pre-fill a host's waiting days for lodging, not nights already allocated to the host.
  const waitingLodging=field('type').value==='lodging'&&Number(item?.waitingDays)>0;
  field('startDate').value=waitingLodging?(item?.arrival||''):(item?.arrival||item?.start||'');
  field('endDate').value=waitingLodging?(item?.start||''):(item?.end||'');
  field('fromStageId').value=at>0?String(route[at-1].i):'';
  field('arrivalDate').value=item?.arrival||item?.start||'';
 };
 const fill=b=>{
  editing=b.id;if(deleteButton)deleteButton.hidden=false;
  for(const k of ['type','status','stageId','fixedKind','fromStageId','title','provider','reference','url','startDate','endDate','totalEUR','paidEUR','refundedEUR','activityMode','notes']){
   if(field(k))field(k).value=b[k]??'';
  }
  field('journeyOrigin').value=b.journeyOrigin===true?'inbound':b.journeyReturn===true?'return':'route';
  field('travelMode').value=b.travelMode==='flight'?'flight':'ground';
  field('originPlace').value=b.originPlace||tripOrigin;field('destinationPlace').value=b.destinationPlace||tripOrigin;
  field('arrivalDate').value=b.arrivalDate||'';
  field('destinationAirport').value=b.destinationAirport||'';
  stopovers=Array.isArray(b.stopovers)?b.stopovers.map(x=>({...x})):[];
  showStopovers();
  field('currency').value=b.currency||'EUR';
  field('totalEUR').value=b.totalAmount??b.totalEUR??'';
  for(const k of ['rateEUR','rateCheckedAt','rateSource'])field(k).value=b[k]??'';
  events=Array.isArray(b.transactions)?b.transactions.map(x=>({...x})):[];
  legacyPaid=events.length?Number(b.legacyPaidEUR||0):Number(b.paidEUR||0);
  legacyRefunded=events.length?Number(b.legacyRefundedEUR||0):Number(b.refundedEUR||0);
  legacyJournal=events.length?b.legacyRecordedElsewhere===true:b.recordedElsewhere===true;
  field('recordedElsewhere').checked=legacyJournal;
  tx('currency').value=b.currency||'EUR';
  syncType();changeFx();showEvents();if(events.length)form.querySelector('[data-bk-payment-details]').open=true;
  feedback.textContent='Du bearbeitest einen vorhandenen Eintrag. Änderungen werden erst mit „Eintrag speichern“ übernommen.';
  setWizard(false);form.open=true;form.scrollIntoView({behavior:'smooth',block:'start'});
 };
 root.querySelectorAll('[data-bk-edit]').forEach(button=>button.addEventListener('click',()=>{
  const b=(getBookings()||[]).find(x=>x.id===button.dataset.bkEdit);if(b)fill(b);
 }));
 field('stageId').addEventListener('change',()=>{dates();showTransportFields()});
 field('journeyOrigin').addEventListener('change',()=>{
  const direction=field('journeyOrigin').value;
  if(direction==='inbound'){
   field('stageId').value=String(route[0]?.i??0);dates();field('startDate').value='';
   if(!field('originPlace').value.trim())field('originPlace').value=tripOrigin;
  }else if(direction==='return'){
   field('stageId').value=String(lastTravel?.i??route[0]?.i??0);dates();
   field('startDate').value=lastTravel?.end||'';
   field('arrivalDate').value=lastTravel?.end||'';
   field('originPlace').value=lastTravel?.name||'';
   field('destinationPlace').value=tripOrigin;
  }else dates();
  showTransportFields();
 });
 field('travelMode').addEventListener('change',showTransportFields);
 field('originPlace').addEventListener('input',showTransportFields);
 form.querySelector('[data-bk-add-stopover]').addEventListener('click',()=>{
  stopovers=readStopovers();
  if(stopovers.length>=8){feedback.textContent='Maximal acht Zwischenstopps pro Flugbuchung.';return;}
  stopovers.push({place:'',arrivalDate:'',departureDate:'',overnight:'unknown'});showStopovers();
 });
 root.querySelectorAll('[data-bk-fixed-preset]').forEach(btn=>btn.addEventListener('click',()=>{
  reset();field('type').value='fixed';field('fixedKind').value=btn.dataset.bkFixedPreset;
  field('stageId').value=String(route[0]?.i??0);dates();
  field('title').value=fixedLabels[btn.dataset.bkFixedPreset]||'Fixkosten';
  syncType();setWizard(true,1);form.open=true;form.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 field('fixedKind').addEventListener('change',()=>{if(field('type').value==='fixed')showTransportFields()});
 root.querySelectorAll('[data-bk-preset]').forEach(btn=>btn.addEventListener('click',()=>{
  reset();const preset=btn.dataset.bkPreset;
  field('type').value=preset==='inbound'||preset==='return'?'transport':preset;
  if(preset==='inbound'){
   field('journeyOrigin').value='inbound';field('travelMode').value='flight';
   field('stageId').value=String(route[0]?.i??0);dates();field('startDate').value='';
   field('title').value='Flug '+tripOrigin+' → '+(route[0]?.name||'Reiseziel');
  }else if(preset==='return'){
   field('journeyOrigin').value='return';field('travelMode').value='flight';
   field('stageId').value=String(lastTravel?.i??route[0]?.i??0);dates();
   field('startDate').value=lastTravel?.end||'';
   field('arrivalDate').value=lastTravel?.end||'';
   field('originPlace').value=lastTravel?.name||'';
   field('destinationPlace').value=tripOrigin;
   field('title').value='Rückflug '+(lastTravel?.name||'Reiseziel')+' → '+tripOrigin;
  }
  syncType();setWizard(true,1);form.open=true;form.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 field('currency').addEventListener('input',changeFx);
 field('currency').addEventListener('change',()=>{
  if(!tx('amount').value){
   tx('currency').value=field('currency').value.toUpperCase();
   for(const k of ['rateEUR','rateCheckedAt','rateSource'])tx(k).value='';
  }
  for(const k of ['rateEUR','rateCheckedAt','rateSource'])field(k).value='';
  changeFx();autoBoth();
 });
 tx('currency').addEventListener('change',()=>{
  for(const k of ['rateEUR','rateCheckedAt','rateSource'])tx(k).value='';
  changeFx();autoBoth();
 });
 root.addEventListener('southbound:fx-loaded',autoBoth);
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
 root.querySelector('[data-bk-reset]').addEventListener('click',()=>{reset();setWizard(false);form.open=true;});
 if(deleteButton)deleteButton.addEventListener('click',()=>{
  const record=(getBookings()||[]).find(x=>x.id===editing);if(!record)return;
  const paid=Math.max(0,Number(record.paidEUR||0)-Number(record.refundedEUR||0));
  const message=paid>0?'Achtung: Für diese Buchung sind '+euro(paid)+' netto bezahlt erfasst. Der Eintrag und seine Zahlung würden aus The Worn Road verschwinden. Bitte einen tatsächlichen Storno/Refund stattdessen bearbeiten, sofern die Zahlung weiterhin besteht. Wirklich löschen?':'Eintrag „'+record.title+'“ dauerhaft aus The Worn Road entfernen?';
  if(!confirm(message))return;
  storeBookings((getBookings()||[]).filter(x=>x.id!==record.id));onSaved();
 });
 root.querySelector('[data-bk-save]').addEventListener('click',()=>{
  const value=k=>field(k)?.value??'';
  const type=value('type');
  const raw={
   fixedKind:type==='fixed'?value('fixedKind'):'',
   id:editing||'booking-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),
   type,status:value('status'),stageId:Number(value('stageId')),
   fromStageId:type==='transport'&&value('journeyOrigin')==='route'&&value('fromStageId')!==''?Number(value('fromStageId')):null,
   journeyOrigin:type==='transport'&&value('journeyOrigin')==='inbound',
   journeyReturn:type==='transport'&&value('journeyOrigin')==='return',
   travelMode:type==='transport'?value('travelMode'):'ground',
   originPlace:type==='transport'&&value('journeyOrigin')!=='route'?value('originPlace').trim():'',
   destinationPlace:type==='transport'&&value('journeyOrigin')==='return'?value('destinationPlace').trim():'',
   arrivalDate:type==='transport'&&value('travelMode')==='flight'?value('arrivalDate'):'',
   destinationAirport:type==='transport'&&value('travelMode')==='flight'?value('destinationAirport').trim():'',
   stopovers:readStopovers(),
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
 reset();setWizard(false);
 if(fromStage)form.open=true;
 if(prefill&&routeLookup(prefill.stageId)&&['transport','lodging','volunteering','activity','fixed'].includes(prefill.type)){
  const existing=(getBookings()||[]).find(x=>prefill.editId?x.id===prefill.editId&&x.type===prefill.type:(prefill.type==='fixed'&&x.type==='fixed'&&x.fixedKind===prefill.fixedKind));
  if(existing)fill(existing);
  else{
   field('type').value=prefill.type;
   field('fixedKind').value=prefill.fixedKind||'insurance';
   field('stageId').value=String(prefill.stageId);
   dates();
   if(prefill.type==='fixed')field('title').value=fixedLabels[prefill.fixedKind]||'Fixkosten';
   if(prefill.type==='transport'&&prefill.journeyPreset==='return'){
    field('stageId').value=String(lastTravel?.i??prefill.stageId);
    field('journeyOrigin').value='return';field('travelMode').value='flight';
    field('originPlace').value=lastTravel?.name||'';
    field('destinationPlace').value=tripOrigin;
    field('startDate').value=lastTravel?.end||'';
    field('arrivalDate').value=lastTravel?.end||'';
    field('title').value='Rückflug '+(lastTravel?.name||'Reiseziel')+' → '+tripOrigin;
   }else if(prefill.type==='transport'&&prefill.journeyPreset==='inbound'){
    field('stageId').value=String(route[0]?.i??prefill.stageId);
    field('journeyOrigin').value='inbound';field('travelMode').value='flight';
    field('originPlace').value=tripOrigin;field('startDate').value='';
    field('title').value='Anreiseflug '+tripOrigin+' → '+(route[0]?.name||'Reiseziel');
   }else if(prefill.type==='transport'&&route.at(-1)?.isReturn&&prefill.stageId===route.at(-1)?.i){
    field('stageId').value=String(lastTravel?.i??prefill.stageId);
    field('journeyOrigin').value='return';field('travelMode').value='flight';
    field('originPlace').value=lastTravel?.name||'';
    field('destinationPlace').value=tripOrigin;
    field('startDate').value=lastTravel?.end||'';
    field('arrivalDate').value=lastTravel?.end||'';
   }else if(prefill.type==='transport'&&prefill.stageId===route[0]?.i){
    field('journeyOrigin').value='inbound';field('travelMode').value='flight';
    field('originPlace').value=tripOrigin;field('startDate').value='';
   }
   syncType();
   form.open=true;
   feedback.textContent='Eintrag für '+(labels[prefill.type]||prefill.type)+' und die ausgewählte Etappe vorbereiten. Noch nichts gespeichert.';
  }
 }
}
g.SouthboundBookingUI={render,bind};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundBookingUI;
})(typeof globalThis!=='undefined'?globalThis:this);
