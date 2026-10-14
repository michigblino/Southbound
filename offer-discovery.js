/* The Worn Road — provider offer discovery with explicit unsupported/offline states.
 * Public app sends only a chosen route/date/party request to a same-origin backend.
 * No provider credentials, scraping, inferred availability or automatic booking.
 */
(function(g){'use strict';
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const iso=s=>typeof s==='string'&&ISO.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const amount=x=>x!==''&&x!==undefined&&x!==null&&Number.isFinite(Number(x))&&Number(x)>=0?Math.round((Number(x)+Number.EPSILON)*100)/100:null;
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password}catch{return false}};
const money=n=>Number(n).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const today=()=>new Date().toISOString().slice(0,10);
const maxAge=(checked,now)=>iso(checked)&&iso(now)&&(Date.parse(now+'T12:00:00Z')-Date.parse(checked+'T12:00:00Z'))/86400000<=1&&checked<=now;
function context(route,{type='lodging',stageId,people=1}={}){
 const issues=[],list=Array.isArray(route)?route:[],id=Number(stageId),number=Number(people),i=list.findIndex(x=>x?.i===id),s=list[i],prev=i>0?list[i-1]:null;
 if(!['lodging','transport'].includes(type))issues.push('Unbekannte Angebotsart');
 if(!s||!Number.isInteger(id))issues.push('Gültige Etappe auswählen');
 if(!Number.isInteger(number)||number<1||number>12)issues.push('1 bis 12 Reisende wählen');
 if(type==='transport'&&!prev)issues.push('Für die Anreise bitte den bestehenden Flugeditor verwenden');
 if(s&&(!iso(s.start)||(type==='lodging'&&(!iso(s.end)||s.end<=s.start))))issues.push('Etappendaten unvollständig');
 if(issues.length)return {ok:false,issues};
 return {ok:true,query:{
  type,stageId:id,fromStageId:type==='transport'?prev.i:null,
  fromName:type==='transport'?String(prev.name||'').slice(0,140):'',
  destination:String(s.name||'').slice(0,140),
  startDate:s.start,endDate:type==='lodging'?s.end:s.start,people:number
 }};
}
function searchLinks(q){
 if(!q)return [];
 if(q.type==='lodging'){
  const u=new URL('https://www.booking.com/searchresults.html');
  for(const [k,v] of Object.entries({ss:q.destination,checkin:q.startDate,checkout:q.endDate,group_adults:String(q.people),no_rooms:'1',group_children:'0',selected_currency:'EUR'}))u.searchParams.set(k,v);
  return [{name:'Booking.com',url:u.toString(),note:'Suchformular mit Ort und Datum; Preis erst beim Anbieter prüfen'},
   {name:'Hostelworld',url:'https://www.hostelworld.com/',note:'Hostels separat suchen; keine Datumsübertragung'}];
 }
 return [{name:'Busbud',url:'https://www.busbud.com/',note:'Abfahrt, Ziel und Datum im Anbieterformular prüfen'},
  {name:'Omio',url:'https://www.omio.com/',note:'Regionale Abdeckung und Verbindung beim Anbieter prüfen'}];
}
function validateProviderOffer(o,q,now=today()){
 const reasons=[];
 if(!o||typeof o!=='object'||Array.isArray(o))return null;
 if(o.type!==q.type||Number(o.stageId)!==q.stageId||Number(o.fromStageId??-1)!==(q.fromStageId??-1)||
  o.startDate!==q.startDate||o.endDate!==q.endDate||Number(o.people)!==q.people)reasons.push('query-mismatch');
 const base=amount(o.baseEUR),fees=amount(o.feesEUR),total=amount(o.totalEUR);
 if(base===null||fees===null||total===null||Math.abs(base+fees-total)>.01||o.currency!=='EUR')reasons.push('price');
 if(!https(o.sourceUrl)||String(o.sourceUrl).length>2000||!String(o.provider||'').trim())reasons.push('source');
 if(o.sourceMethod!=='provider-api'||o.availabilityConfirmed!==true||!String(o.providerRequestId||'').trim())reasons.push('evidence');
 if(!maxAge(o.checkedAt,now))reasons.push('stale');
 if(reasons.length)return null;
 return {type:q.type,stageId:q.stageId,fromStageId:q.fromStageId,startDate:q.startDate,endDate:q.endDate,
  people:q.people,provider:String(o.provider).slice(0,130),title:String(o.title||o.provider).slice(0,160),
  baseEUR:base,feesEUR:fees,totalEUR:total,currency:'EUR',sourceUrl:o.sourceUrl,checkedAt:o.checkedAt,
  providerRequestId:String(o.providerRequestId).slice(0,160),availabilityConfirmed:true,sourceMethod:'provider-api',
  notes:String(o.notes||'').slice(0,180)};
}
async function search(q,{fetchFn=typeof g.fetch==='function'?g.fetch.bind(g):null,now=today()}={}){
 if(!q||!['lodging','transport'].includes(q.type)||!iso(q.startDate)||!iso(q.endDate)||!Number.isInteger(q.stageId)||
 !Number.isInteger(q.people)||q.people<1||q.people>12||typeof q.destination!=='string'||(q.type==='transport'&&!Number.isInteger(q.fromStageId)))
 return {status:'invalid',offers:[],message:'Ungültige Suchdaten. Etappe erneut auswählen.'};
 if(typeof fetchFn!=='function')return {status:'unavailable',offers:[],message:'Keine Anbieteranbindung verfügbar. Anbieterlinks verwenden.'};
 let response;
 try{
  response=await fetchFn('/api/offers/v1/search',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify(q),cache:'no-store',credentials:'same-origin'});
 }catch{return {status:'unavailable',offers:[],message:'Anbieterabfrage nicht erreichbar. Anbieterlinks bleiben verfügbar.'}}
 if(!response||!response.ok){
  return {status:'unavailable',offers:[],message:response?.status===404||response?.status===405?'Noch keine Anbieter-API mit dieser App verbunden. Über die Suchlinks selbst prüfen.':'Anbieterabfrage derzeit nicht verfügbar; bitte später erneut versuchen.'};
 }
 try{
  if(!String(response.headers?.get('content-type')||'').includes('application/json'))throw Error('Not JSON');
  const length=Number(response.headers?.get('content-length')||0);if(length>180000)throw Error('Oversized');
  const text=await response.text();if(text.length>180000)throw Error('Oversized');
  const data=JSON.parse(text);
  if(data?.status!=='ok'||data?.verifiedByServer!==true||!data.query||
   data.query.type!==q.type||data.query.stageId!==q.stageId||
   (data.query.fromStageId??null)!==(q.fromStageId??null)||
   data.query.startDate!==q.startDate||data.query.endDate!==q.endDate||data.query.people!==q.people||
   data.query.destination!==q.destination||!Array.isArray(data.offers))throw Error('Query mismatch');
  const offers=data.offers.slice(0,40).map(x=>validateProviderOffer(x,q,now)).filter(Boolean).slice(0,20);
  return {status:'ok',offers:offers.sort((a,b)=>a.totalEUR-b.totalEUR),rejected:data.offers.length-offers.length,
   message:offers.length?offers.length+' passende Anbieterangebote gefunden. Preise und Verfügbarkeit vor Buchung erneut kontrollieren.':
   'Für diese Suche liegen keine belastbaren Anbieterangebote vor. Das bedeutet nicht, dass die Strecke oder Unterkunft unmöglich ist.'};
 }catch{return {status:'unavailable',offers:[],message:'Anbieterantwort nicht verlässlich. Es werden keine ungeprüften Preise angezeigt.'}}
}
function resultMarkup(result){
 if(!result)return '';
 if(result.status!=='ok')return '<p class="oq-discovery-message" role="status">'+safe(result.message)+'</p>';
 return '<p class="oq-discovery-message" role="status">'+safe(result.message)+'</p>'+
  (result.rejected?'<p class="oq-warn">'+result.rejected+' unvollständige oder veraltete Angebote ausgeblendet.</p>':'')+
  '<div class="oq-discovery-results">'+result.offers.map(x=>'<article class="oq-discovery-card"><strong>'+safe(x.title)+'</strong>'+
  '<span>'+money(x.totalEUR)+' <small>inkl. gemeldeter Gebühren · '+x.people+' Pers.</small></span>'+
  '<small>'+safe(x.provider)+' · Anbieterabfrage '+safe(x.checkedAt)+' · Verfügbarkeit erneut prüfen</small>'+
  '<a href="'+safe(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Beim Anbieter prüfen ↗</a></article>').join('')+'</div>';
}
function render({route=[]}={}){
 if(!route.length)return '';
 const active=route.find((x,i)=>i>0)||route[0];
 const options=route.map(s=>'<option value="'+s.i+'"'+(s.i===active.i?' selected':'')+'>'+safe(s.name)+' · '+safe(s.start)+'</option>').join('');
 return '<section class="oq-discovery" id="sb-provider-discovery"><div class="eyebrow">ANGEBOTE FINDEN</div><h3>Passende Anbieter durchsuchen</h3>'+
 '<p class="small">Suchdaten aus deiner Reiseetappe übernehmen. <b>Es ist noch kein Live-Preispartner verbunden.</b> Anbieterlinks funktionieren trotzdem. Preise werden nicht automatisch in dein Budget übernommen.</p>'+
 '<div class="oq-discovery-fields"><label>Suche nach<select data-od="type"><option value="lodging">Unterkünften</option><option value="transport">Bussen / Transfers</option></select></label>'+
 '<label>Etappe<select data-od="stageId">'+options+'</select></label>'+
 '<label>Reisende<input data-od="people" type="number" min="1" max="12" value="1"></label></div>'+
 '<p class="oq-discovery-context" data-od-context></p><div class="oq-discovery-links" data-od-links></div>'+
 '<button type="button" data-od-search class="primary">Live-Angebote abfragen</button>'+
 '<div data-od-results aria-live="polite"><p class="small">Bei nicht verbundener API zeigt die App ausdrücklich „nicht verfügbar“ statt erfundener Preise.</p></div></section>';
}
function bind(root,{route=[]}={}){
 const panel=root.querySelector('#sb-provider-discovery');if(!panel)return;
 const field=k=>panel.querySelector('[data-od="'+k+'"]'),contextText=panel.querySelector('[data-od-context]'),
  linkBox=panel.querySelector('[data-od-links]'),output=panel.querySelector('[data-od-results]'),button=panel.querySelector('[data-od-search]');
 let running=false;
 function update(){
  const c=context(route,{type:field('type').value,stageId:field('stageId').value,people:field('people').value});
  button.disabled=!c.ok||running;
  contextText.textContent=c.ok?(c.query.type==='transport'?c.query.fromName+' → ':'')+c.query.destination+
   ' · '+c.query.startDate+(c.query.type==='lodging'?' bis '+c.query.endDate:'')+' · '+c.query.people+' Pers.':c.issues.join(' · ');
  linkBox.innerHTML=c.ok?searchLinks(c.query).map(x=>'<a href="'+safe(x.url)+'" target="_blank" rel="noopener noreferrer" title="'+safe(x.note)+'">'+safe(x.name)+' ↗</a>').join(''):'';
  output.innerHTML='<p class="small">Anbieterlinks führen direkt zum jeweiligen Suchportal. Die API-Abfrage läuft nur nach Klick und ohne gespeicherte Buchungsdaten.</p>';
 }
 for(const key of ['type','stageId','people'])field(key).addEventListener('change',update);
 button.addEventListener('click',async()=>{
  if(running)return;
  const c=context(route,{type:field('type').value,stageId:field('stageId').value,people:field('people').value});if(!c.ok){update();return}
  running=true;button.disabled=true;output.textContent='Prüfe verfügbare Anbieteranbindung …';
  const result=await search(c.query);
  // No changes to booking or itinerary state on lookup.
  if(!panel.isConnected)return;
  output.innerHTML=resultMarkup(result);running=false;button.disabled=false;
 });
 update();
}
const api={context,searchLinks,validateProviderOffer,search,render,resultMarkup,bind};
g.SouthboundOfferDiscovery=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
