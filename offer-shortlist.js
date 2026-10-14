/* The Worn Road – manually sourced offer shortlist, NEVER live availability.
 * No network requests, no automatic booking, no automatic budget amendments.
 */
(function(g){'use strict';
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const amount=x=>x!==''&&x!==null&&x!==undefined&&Number.isFinite(Number(x))&&Number(x)>=0?Math.round((Number(x)+Number.EPSILON)*100)/100:null;
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const days=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
const urlOk=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password}catch{return false}};
const euro=n=>Number(n).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const stageAt=(route,id)=>route.find(x=>x&&x.i===id);
function validate(raw,{route=[],now=today()}={}){
 const issues=[];
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,issues:['Kein gültiger Angebotseintrag'],record:null};
 const type=raw.type,stageId=Number(raw.stageId),stage=stageAt(route,stageId),position=route.findIndex(x=>x?.i===stageId),previous=position>0?route[position-1]:null;
 const startDate=raw.startDate,endDate=raw.endDate,people=Number(raw.people),baseEUR=amount(raw.baseEUR),feesEUR=amount(raw.feesEUR);
 const checkedAt=raw.checkedAt,provider=String(raw.provider||'').trim(),sourceUrl=String(raw.sourceUrl||'').trim();
 if(!['lodging','transport'].includes(type))issues.push('Angebotsart wählen');
 if(!Number.isInteger(stageId)||!stage)issues.push('Passende Reiseetappe wählen');
 if(!iso(startDate)||!iso(endDate)||(iso(startDate)&&iso(endDate)&&endDate<startDate)||(type==='lodging'&&startDate===endDate))issues.push('Gültigen Reisezeitraum eingeben');
 if(!Number.isInteger(people)||people<1||people>12)issues.push('Personenzahl zwischen 1 und 12');
 if(baseEUR===null||feesEUR===null)issues.push('Grundpreis und alle Zusatzgebühren in EUR angeben');
 if(provider.length<2||provider.length>160)issues.push('Anbieter benennen');
 if(!urlOk(sourceUrl)||sourceUrl.length>2000)issues.push('Sicheren HTTPS-Angebotslink angeben');
 if(!iso(checkedAt)||!iso(now)||checkedAt>now)issues.push('Gültiges, nicht zukünftiges Prüfdatum angeben');
 if(type==='lodging'&&stage&&iso(startDate)&&iso(endDate)&&(startDate<stage.start||endDate>stage.end))issues.push('Unterkunftsdaten müssen innerhalb der Etappe liegen');
 if(type==='transport'&&stage&&(position===0||!previous))issues.push('Für die erste Anreise bitte die bestehende Flugbuchung verwenden');
 if(type==='transport'&&stage&&iso(startDate)&&startDate!==stage.start)issues.push('Transferdatum stimmt nicht mit der aktuellen Etappe überein');
 if(type==='transport'&&position>0&&Number(raw.fromStageId)!==previous.i)issues.push('Abfahrtsort passt nicht mehr zur Route');
 if(issues.length)return {ok:false,issues,record:null};
 const record={id:String(raw.id||''),type,stageId,fromStageId:type==='transport'?previous.i:null,
  stageName:String(stage.name||''),fromStageName:type==='transport'?String(previous.name||''):'',
  startDate,endDate,people,provider,sourceUrl,baseEUR,feesEUR,
  totalEUR:Math.round((baseEUR+feesEUR+Number.EPSILON)*100)/100,checkedAt,
  notes:String(raw.notes||'').trim().slice(0,280),sourceMethod:'manual',availabilityConfirmed:false,booked:false};
 return {ok:true,issues:[],record};
}
function evaluate(records,{route=[],now=today()}={}){
 const rows=(Array.isArray(records)?records:[]).map(raw=>{
  const validated=validate(raw,{route,now}),q=validated.record||raw;
  const fresh=validated.ok&&days(raw.checkedAt,now)<=1;
  const status=!validated.ok?'Nicht mehr passend':fresh?'Manuell erfasst':'Preisstand veraltet';
  const group=validated.ok?[q.type,q.stageId,q.fromStageId??'',q.startDate,q.endDate,q.people].join('|'):null;
  return {...q,valid:validated.ok,fresh,status,issues:validated.issues,group,lowest:false};
 });
 const groups=new Map();
 for(const row of rows)if(row.fresh&&row.group){if(!groups.has(row.group))groups.set(row.group,[]);groups.get(row.group).push(row)}
 for(const group of groups.values())if(group.length>=2)group.sort((a,b)=>a.totalEUR-b.totalEUR||String(a.id).localeCompare(String(b.id)))[0].lowest=true;
 return rows.sort((a,b)=>(a.stageId??999)-(b.stageId??999)||(a.startDate||'').localeCompare(b.startDate||'')||(a.totalEUR??Infinity)-(b.totalEUR??Infinity));
}
function render({route=[],offers=[]}={}){
 if(!route.length)return '';
 const now=today(),rows=evaluate(offers,{route,now}),first=route[0];
 const select=route.map(s=>'<option value="'+s.i+'">'+safe(s.name)+' · '+safe(s.start||'')+'</option>').join('');
 const cards=rows.length?rows.map(q=>{
  const badge=q.lowest?'Günstigste Preisnotiz':q.status,context=q.type==='transport'?'Transfer':'Unterkunft';
  const label=q.fromStageName?safe(q.fromStageName)+' → '+safe(q.stageName):safe(q.stageName);
  return '<article class="oq-card"><div class="oq-card-head"><div><strong>'+safe(q.provider||'Unbekannter Anbieter')+'</strong><small>'+safe(context)+' · '+label+'</small></div><span class="oq-chip">'+safe(badge)+'</span></div>'+
   '<div class="oq-card-cost"><strong>'+(Number.isFinite(q.totalEUR)?euro(q.totalEUR):'Preis offen')+'</strong><small>Gesamt inkl. eingetragener Gebühren · '+safe(q.people)+' Pers.</small></div>'+
   '<p class="oq-card-meta">'+safe(q.startDate||'?')+' – '+safe(q.endDate||'?')+' · geprüft '+safe(q.checkedAt||'?')+'</p>'+
   (q.valid?(!q.fresh?'<p class="oq-warn">Preisstand älter als einen Kalendertag. Erneut beim Anbieter prüfen.</p>':''):'<p class="oq-warn">Nicht zur aktuellen Route passend. '+safe((q.issues||[]).join(' · '))+'</p>')+
   '<div class="oq-card-actions">'+(urlOk(q.sourceUrl)?'<a href="'+safe(q.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Angebot beim Anbieter prüfen ↗</a>':'<span>Kein gültiger Anbieterlink</span>')+
   '<button type="button" data-oq-remove="'+safe(q.id)+'" aria-label="Preisnotiz entfernen">Entfernen</button></div></article>';
 }).join(''):'<p class="small oq-empty">Noch keine Angebote vorgemerkt. Trage zwei echte Anbieterpreise für dieselben Daten ein, um sie zu vergleichen.</p>';
 return '<section class="panel oq-wrap" id="sb-offer-compare"><div class="eyebrow">PREISE & ANGEBOTE</div><h2>Angebote vergleichen</h2>'+
  '<p class="small">Unterkünfte und Transfers mit exakten Daten, Personenzahl, Preis inkl. Gebühren und Anbieterlink vergleichen. <b>Nur manuell erfasste Preisnotizen – keine Live-Abfrage, keine Verfügbarkeits- oder Buchungsbestätigung.</b> Dein Reisebudget bleibt unverändert, bis du separat eine tatsächliche Buchung einträgst.</p>'+
  (g.SouthboundOfferDiscovery?.render({route})||'')+
  '<details class="oq-add" id="sb-offer-add"><summary>Neues Angebot vormerken</summary><div class="oq-fields">'+
  '<label>Art<select data-oq="type"><option value="lodging">Unterkunft</option><option value="transport">Transfer</option></select></label>'+
  '<label>Etappe<select data-oq="stageId">'+select+'</select></label>'+
  '<label>Beginn / Abfahrt<input data-oq="startDate" type="date" value="'+safe(first.start||'')+'"></label>'+
  '<label>Ende / Ankunft<input data-oq="endDate" type="date" value="'+safe(first.end||'')+'"></label>'+
  '<label>Reisende<input data-oq="people" type="number" min="1" max="12" value="1"></label>'+
  '<label>Anbieter<input data-oq="provider" maxlength="160" placeholder="Name des tatsächlichen Anbieters"></label>'+
  '<label class="oq-wide">Angebotslink (HTTPS)<input data-oq="sourceUrl" type="url" placeholder="https://..." maxlength="2000"></label>'+
  '<label>Grundpreis gesamt, EUR<input data-oq="baseEUR" type="number" min="0" step=".01" inputmode="decimal"></label>'+
  '<label>Gebühren / Gepäck / Steuern, EUR<input data-oq="feesEUR" type="number" min="0" step=".01" inputmode="decimal" value="0"></label>'+
  '<label>Am Anbieter geprüft<input data-oq="checkedAt" type="date" value="'+now+'"></label>'+
  '<label class="oq-wide">Notiz (optional)<input data-oq="notes" maxlength="280" placeholder="Tarif, Gepäck, Storno, Mahlzeiten ..."></label>'+
  '</div><p class="oq-total" data-oq-total>Gesamtpreis erscheint nach Eingabe.</p>'+
  '<p class="small">Fehlende oder unklare Zuschläge bitte vor einem Vergleich klären. Nur Werte in EUR eintragen; automatische Umrechnung oder Liveverfügbarkeit wird hier nicht behauptet.</p>'+
  '<button type="button" data-oq-save class="primary">Preisnotiz speichern</button><p role="status" aria-live="polite" data-oq-feedback></p></details>'+
  '<div class="oq-list">'+cards+'</div></section>';
}
function bind(root,{route=[],getOffers=()=>[],storeOffers=()=>{},onSaved=()=>{}}={}){
 const panel=root.querySelector('#sb-offer-compare');if(!panel)return;
 g.SouthboundOfferDiscovery?.bind(panel,{route});
 const field=k=>panel.querySelector('[data-oq="'+k+'"]'),feedback=panel.querySelector('[data-oq-feedback]');
 const stage=()=>stageAt(route,Number(field('stageId').value));
 const sync=()=>{
  const s=stage();if(!s)return;
  field('startDate').value=s.start||'';
  field('endDate').value=field('type').value==='transport'?(s.start||''):(s.end||'');
 };
 const updateTotal=()=>{const base=amount(field('baseEUR').value),fees=amount(field('feesEUR').value);
  panel.querySelector('[data-oq-total]').textContent=base===null||fees===null?'Gesamtpreis noch offen':'Gesamtpreis mit Gebühren: '+euro(base+fees)};
 field('stageId').addEventListener('change',sync);field('type').addEventListener('change',sync);
 for(const key of ['baseEUR','feesEUR'])field(key).addEventListener('input',updateTotal);
 panel.querySelector('[data-oq-save]').addEventListener('click',()=>{
  const keys=['type','stageId','startDate','endDate','people','provider','sourceUrl','baseEUR','feesEUR','checkedAt','notes'];
  const input=Object.fromEntries(keys.map(k=>[k,field(k).value]));
  const pos=route.findIndex(x=>x.i===Number(input.stageId));input.fromStageId=pos>0?route[pos-1].i:null;
  input.id='quote-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
  const result=validate(input,{route,now:today()});
  if(!result.ok){feedback.textContent='Bitte prüfen: '+result.issues.join(' · ');return}
  const all=Array.isArray(getOffers())?getOffers():[];
  if(all.length>=100){feedback.textContent='Maximal 100 Preisnotizen pro Reise; alte Einträge vorher entfernen.';return}
  storeOffers([...all,result.record]);onSaved();
 });
 panel.querySelectorAll('[data-oq-remove]').forEach(btn=>btn.addEventListener('click',()=>{
  if(!confirm('Diese Preisnotiz entfernen? Bereits gespeicherte Buchungen bleiben unverändert.'))return;
  storeOffers((getOffers()||[]).filter(q=>q.id!==btn.dataset.oqRemove));onSaved();
 }));
}
const api={validate,evaluate,render,bind};g.SouthboundOfferShortlist=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
