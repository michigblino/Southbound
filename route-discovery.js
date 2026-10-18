/* Global source-aware route discovery. Pure functions; no network, storage, or credentials. */
(function(root){'use strict';
const DAY=86400000, QUALITIES=['provider-live','official-tariff','historical-reference','model-estimate','unknown'], MODES=['bus','flight','train','ferry','boat','walk','drive','shuttle','other'], SEVERITIES=['low','moderate','high','unknown'];
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x), num=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null, integer=x=>Number.isInteger(Number(x))?Number(x):null;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T12:00:00Z'))&&new Date(Date.parse(x+'T12:00:00Z')).toISOString().slice(0,10)===x;
const https=x=>typeof x==='string'&&/^https:\/\/[^\s]+$/i.test(x);
const sourceOk=s=>obj(s)&&https(s.url)&&typeof s.title==='string'&&!!s.title.trim()&&date(s.checkedAt)&&['official','provider','licensed-dataset','user-supplied','fixture','other'].includes(s.kind||'other');
const same=(a,b)=>String(a||'').trim().toLocaleLowerCase()===String(b||'').trim().toLocaleLowerCase();
const round=x=>Math.round((x+Number.EPSILON)*100)/100;
function validBand(b){
 if(!obj(b)||!QUALITIES.includes(b.quality)||!/^[A-Z]{3}$/.test(String(b.currency||'')))return false;
 if(b.quality==='unknown')return b.min===undefined&&b.max===undefined;
 if(num(b.min)===null||num(b.max)===null||Number(b.max)<Number(b.min))return false;
 return b.quality==='model-estimate'?typeof b.method==='string'&&!!b.method.trim():sourceOk(b.evidence);
}
function validateBrief(r={}){
 const errors=[],warnings=[],origin=String(r.originId||r.origin||'').trim();
 if(!origin)errors.push('Startort fehlt.');if(!date(r.startDate))errors.push('Startdatum muss YYYY-MM-DD sein.');
 const currency=String(r.budgetCurrency||'EUR').toUpperCase(),target=num(r.budgetTarget),cap=num(r.budgetCap),min=integer(r.minDays),max=integer(r.maxDays);
 if(!/^[A-Z]{3}$/.test(currency))errors.push('Ungültige Budgetwährung.');
 if(target===null)errors.push('Budgetziel fehlt oder ist ungültig.');if(cap===null)errors.push('Budgetobergrenze fehlt oder ist ungültig.');
 if(target!==null&&cap!==null&&target>cap)errors.push('Budgetziel darf nicht über der Obergrenze liegen.');
 if(min===null||min<1||min>365)errors.push('Mindestdauer muss 1–365 Tage betragen.');if(max===null||max<1||max>365)errors.push('Höchstdauer muss 1–365 Tage betragen.');
 if(min!==null&&max!==null&&min>max)errors.push('Mindestdauer darf nicht über der Höchstdauer liegen.');
 const geo=obj(r.geography)?r.geography:{scope:'any',value:''};
 if(!['any','region','country','continent'].includes(geo.scope||'any'))errors.push('Ungültiger geografischer Suchbereich.');
 if(geo.scope&&geo.scope!=='any'&&!String(geo.value||'').trim())errors.push('Zielwert für Region, Land oder Kontinent fehlt.');
 const vol=obj(r.volunteering)?r.volunteering:{},hours=num(vol.maxHoursPerWeek);
 if(vol.enabled===true&&(hours===null||hours>168))errors.push('Ungültige maximale Volunteering-Stunden.');
 const pace=['slow','balanced','fast'].includes(r.pace)?r.pace:'balanced',adventureStyle=['relaxed','balanced','adventurous'].includes(r.adventureStyle)?r.adventureStyle:'balanced',safetyTolerance=['conservative','standard','adventurous'].includes(r.safetyTolerance)?r.safetyTolerance:'standard';
 if(r.pace&&!['slow','balanced','fast'].includes(r.pace))warnings.push('Reisetempo unbekannt; balanced verwendet.');
 if(r.adventureStyle&&!['relaxed','balanced','adventurous'].includes(r.adventureStyle))warnings.push('Abenteuerstil unbekannt; balanced verwendet.');
 const brief={origin,startDate:r.startDate,budgetCurrency:currency,budgetTarget:target,budgetCap:cap,minDays:min,maxDays:max,geography:{scope:geo.scope||'any',value:String(geo.value||'').trim()},mustSee:Array.isArray(r.mustSee)?[...new Set(r.mustSee.map(String).map(x=>x.trim()).filter(Boolean))]:[],avoid:Array.isArray(r.avoid)?[...new Set(r.avoid.map(String).map(x=>x.trim()).filter(Boolean))]:[],pace,adventureStyle,safetyTolerance,maxStops:Math.max(2,Math.min(12,integer(r.maxStops)||8)),maxCandidates:Math.max(3,Math.min(30,integer(r.maxCandidates)||12)),reserve:num(r.reserve)||0,volunteering:{enabled:vol.enabled===true,maxHoursPerWeek:hours??30,minStayDays:Math.max(1,integer(vol.minStayDays)||7),maxStayDays:Math.max(1,integer(vol.maxStayDays)||28)}};
 return {ok:!errors.length,errors,warnings,brief};
}
function validateGraph(g){
 const errors=[],warnings=[],nodes=Array.isArray(g?.nodes)?g.nodes:[],edges=Array.isArray(g?.edges)?g.edges:[];
 if(!nodes.length)errors.push('Graph enthält keine Orte.');const ids=new Set(),edgeIds=new Set();
 for(const n of nodes){if(!obj(n)||!String(n.id||'').trim()||!String(n.name||'').trim()){errors.push('Ort ohne ID oder Namen.');continue;}if(ids.has(n.id))errors.push('Doppelte Orts-ID: '+n.id);ids.add(n.id);if(!sourceOk(n.source))errors.push('Quellenprovenienz für Ort '+n.id+' fehlt.');if(n.dailyCost&&!validBand(n.dailyCost))warnings.push('Tageskosten für '+n.id+' werden als unbekannt behandelt.');if(n.stayDays&&(!Number.isInteger(n.stayDays.min)||!Number.isInteger(n.stayDays.max)||n.stayDays.min<1||n.stayDays.max<n.stayDays.min))warnings.push('Ungültige Aufenthaltsdauer für '+n.id+'.');}
 for(const e of edges){if(!obj(e)||!String(e.id||'').trim()||!ids.has(e.from)||!ids.has(e.to)||e.from===e.to){errors.push('Verbindung mit ungültiger ID oder Endpunkten.');continue;}if(edgeIds.has(e.id))errors.push('Doppelte Verbindungs-ID: '+e.id);edgeIds.add(e.id);if(!MODES.includes(e.mode))errors.push('Ungültiges Verkehrsmittel: '+e.id);if(!sourceOk(e.source))errors.push('Quellenprovenienz für Verbindung '+e.id+' fehlt.');if(!obj(e.durationDays)||num(e.durationDays.min)===null||num(e.durationDays.max)===null||Number(e.durationDays.max)<Number(e.durationDays.min))errors.push('Ungültige Dauer für Verbindung '+e.id);if(e.fare&&!validBand(e.fare))warnings.push('Preis für '+e.id+' wird als unbekannt behandelt.');for(const s of (Array.isArray(e.safetyEvidence)?e.safetyEvidence:[]))if(!sourceOk(s.source)||!SEVERITIES.includes(s.severity))warnings.push('Unvollständige Sicherheitsevidenz auf '+e.id);}
 return {ok:!errors.length,errors,warnings,nodeCount:nodes.length,edgeCount:edges.length};
}
function bandFor(b,currency,now){
 if(!validBand(b)||b.quality==='unknown'||b.currency!==currency)return null;
 if(b.quality==='provider-live'){const checked=Date.parse(b.evidence.checkedAt+'T12:00:00Z');if(!Number.isFinite(checked)||now-checked>86400000||checked>now+86400000)return null;}
 return {min:Number(b.min),max:Number(b.max),quality:b.quality,currency,evidence:b.evidence||{method:b.method}};
}
function monthAt(start,offset){return new Date(Date.parse(start+'T12:00:00Z')+Math.max(0,offset)*DAY).getUTCMonth()+1;}
function geoMatch(n,g){if(!g||g.scope==='any')return true;return same(n[g.scope==='continent'?'continent':g.scope==='country'?'country':'region'],g.value);}
function stayFor(n,pace){const s=n.stayDays;if(!s||!Number.isInteger(s.min)||!Number.isInteger(s.max)||s.min<1||s.max<s.min)return {days:pace==='slow'?4:pace==='fast'?2:3,estimated:true};const t=Number.isInteger(s.typical)?Math.max(s.min,Math.min(s.max,s.typical)):Math.round((s.min+s.max)/2);return {days:pace==='slow'?s.max:pace==='fast'?s.min:t,estimated:false};}
function volunteerFor(n,days,b,now){
 if(!b.volunteering.enabled)return {eligible:[],potential:[],lodging:null};
 const eligible=[],potential=[];for(const o of (Array.isArray(n.volunteering)?n.volunteering:[])){if(!sourceOk(o.source))continue;const h=num(o.hoursPerWeek),min=integer(o.minStayDays),max=integer(o.maxStayDays),fits=h!==null&&h<=b.volunteering.maxHoursPerWeek&&min!==null&&max!==null&&days>=Math.max(min,b.volunteering.minStayDays)&&days<=Math.min(max,b.volunteering.maxStayDays);if(!fits)continue;if(o.status==='confirmed'&&o.lodgingIncluded===true)eligible.push(o);else if(o.status!=='unavailable')potential.push(o);}
 let lodging=null;const raw=n.dailyCost?.components?.lodging;if(eligible.length&&validBand(raw)&&raw.quality!=='unknown'&&raw.currency===b.budgetCurrency)lodging=bandFor(raw,b.budgetCurrency,now);
 return {eligible,potential,lodging};
}
function buildCandidate(path,edges,g,b,now){
 const byId=new Map(g.nodes.map(n=>[n.id,n])),stay=path.map(id=>({node:byId.get(id),...stayFor(byId.get(id),b.pace)}));
 const edgeMin=edges.reduce((s,e)=>s+Number(e.durationDays.min),0),edgeMax=edges.reduce((s,e)=>s+Number(e.durationDays.max),0);
 let stayTotal=stay.reduce((s,x)=>s+x.days,0);if(stayTotal+edgeMin>b.maxDays)return null;
 if(stayTotal+edgeMin<b.minDays){let needed=Math.ceil(b.minDays-(stayTotal+edgeMin));for(const x of stay){const max=x.node.stayDays&&Number.isInteger(x.node.stayDays.max)?x.node.stayDays.max:x.days+Math.min(3,needed),add=Math.min(needed,Math.max(0,max-x.days));x.days+=add;needed-=add;if(!needed)break;}stayTotal=stay.reduce((s,x)=>s+x.days,0);if(needed>0)return null;}
 const duration={min:Math.round(stayTotal+edgeMin),max:Math.round(stayTotal+edgeMax),typical:Math.round(stayTotal+(edgeMin+edgeMax)/2)};if(duration.min>b.maxDays||duration.max<b.minDays)return null;
 const cost={knownMin:0,knownMax:0,unknownComponents:[],evidence:[],qualityCounts:{'provider-live':0,'official-tariff':0,'historical-reference':0,'model-estimate':0,unknown:0}},seasonFlags=[],safety=[],volunteering=[];let elapsed=0,adventure=0;
 for(let i=0;i<stay.length;i++){const x=stay[i],n=x.node,days=x.days,v=volunteerFor(n,days,b,now),daily=bandFor(n.dailyCost,b.budgetCurrency,now);
  if(v.eligible.length||v.potential.length)volunteering.push({place:n.name,status:v.eligible.length?'confirmed':'needs-confirmation',offers:[...v.eligible,...v.potential].map(o=>({name:o.name||o.platform||'Host',source:o.source})),lodgingSavingsCounted:!!(v.eligible.length&&v.lodging)});
  if(daily){let lo=daily.min*days,hi=daily.max*days;if(v.eligible.length&&v.lodging){lo=Math.max(0,lo-v.lodging.max*days);hi=Math.max(0,hi-v.lodging.min*days);cost.evidence.push({type:'volunteer-lodging-adjustment',place:n.name,source:v.eligible[0].source});}cost.knownMin+=lo;cost.knownMax+=hi;cost.qualityCounts[daily.quality]++;cost.evidence.push({type:'daily-cost',place:n.name,quality:daily.quality,evidence:daily.evidence});}else{cost.unknownComponents.push({type:'stay',place:n.name,reason:n.dailyCost?'currency-or-stale-evidence':'daily-cost-missing'});cost.qualityCounts.unknown++;}
  if(x.estimated)seasonFlags.push({type:'duration-estimate',place:n.name,message:'Aufenthaltsdauer aus Reisetempo abgeleitet; keine verifizierte Aufenthaltsdauer.'});
  for(const m of (n.season?.avoidMonths||[]))if(monthAt(b.startDate,elapsed)===Number(m))seasonFlags.push({type:'destination-season',place:n.name,month:Number(m),message:'Reisedatum liegt in einem als ungünstig markierten Monat.',source:n.season.source||n.source});
  adventure+=(Array.isArray(n.tags)?n.tags.filter(t=>['hiking','wildlife','remote','expedition','diving','mountaineering','river','camping','overland','volunteering'].includes(String(t).toLowerCase())).length:0);elapsed+=days;
  if(i<edges.length){const e=edges[i],next=byId.get(e.to),fare=bandFor(e.fare,b.budgetCurrency,now);if(fare){cost.knownMin+=fare.min;cost.knownMax+=fare.max;cost.qualityCounts[fare.quality]++;cost.evidence.push({type:'transport',from:n.name,to:next.name,mode:e.mode,quality:fare.quality,evidence:fare.evidence});}else{cost.unknownComponents.push({type:'transport',from:n.name,to:next.name,mode:e.mode,reason:e.fare?'price-evidence-or-currency-not-usable':'fare-unknown'});cost.qualityCounts.unknown++;}
   const month=monthAt(b.startDate,elapsed);if(Array.isArray(e.seasonality?.availableMonths)&&e.seasonality.availableMonths.length&&!e.seasonality.availableMonths.includes(month)){seasonFlags.push({type:'transport-season',edgeId:e.id,month,message:'Verbindung ist im berechneten Monat nicht als regulär verfügbar markiert.',source:e.source});if(e.seasonality.hardConstraint===true)return null;}
   const evidence=Array.isArray(e.safetyEvidence)?e.safetyEvidence:[];if(!evidence.length)safety.push({edgeId:e.id,from:n.name,to:next.name,severity:'unknown',message:'Keine route-spezifische Sicherheitsquelle im gelieferten Datensatz.'});for(const s of evidence)if(sourceOk(s.source)&&SEVERITIES.includes(s.severity))safety.push({edgeId:e.id,from:n.name,to:next.name,severity:s.severity,scope:s.scope||'unspecified',summary:s.summary||'',source:s.source});
   adventure+=['boat','walk','drive'].includes(e.mode)?1:0;elapsed+=Number(e.durationDays.min);
  }
 }
 cost.knownMin=round(cost.knownMin);cost.knownMax=round(cost.knownMax);cost.complete=!cost.unknownComponents.length;cost.totalMin=cost.complete?round(cost.knownMin+b.reserve):null;cost.totalMax=cost.complete?round(cost.knownMax+b.reserve):null;cost.reserve=b.reserve;cost.currency=b.budgetCurrency;
 cost.capStatus=!cost.complete?'unknown':cost.totalMin>b.budgetCap?'over-cap':cost.totalMax<=b.budgetTarget?'target-met':cost.totalMax<=b.budgetCap?'within-cap':'uncertain-against-cap';
 cost.confidence=cost.complete?(cost.qualityCounts['provider-live']?'mixed-with-live-offer':cost.qualityCounts['official-tariff']?'source-backed-mixed':'estimated-only'):'incomplete';
 const severe=safety.some(s=>s.severity==='high'),unknown=safety.some(s=>s.severity==='unknown');if(severe&&b.safetyTolerance==='conservative')return null;
 if(severe&&b.safetyTolerance==='standard')seasonFlags.push({type:'safety-review',message:'Route enthält eine hoch eingestufte Warnung; aktuelle Behördenhinweise prüfen.'});
 const names=path.map(id=>byId.get(id).name);
 return {id:path.join('>'),profile:null,label:null,placeIds:path,routeName:names.join(' → '),places:stay.map(x=>({id:x.node.id,name:x.node.name,country:x.node.country,region:x.node.region,continent:x.node.continent,stayDays:x.days,source:x.node.source})),legs:edges.map(e=>({id:e.id,from:e.from,to:e.to,mode:e.mode,durationDays:e.durationDays,source:e.source,fare:e.fare||{quality:'unknown'},seasonality:e.seasonality||null})),duration,cost,safety:{status:severe?'high-alert':unknown?'unknown':'evidence-available',items:safety,notGuarantee:true},season:{status:seasonFlags.length?'review-needed':'no-flag-in-supplied-data',items:seasonFlags},volunteering:{enabled:b.volunteering.enabled,opportunities:volunteering,savingsIncluded:volunteering.some(v=>v.lodgingSavingsCounted),note:'Unbestätigte Hosts sparen im Budget nichts; Gebühren, Verpflegung und Verfügbarkeit separat prüfen.'},adventureScore:adventure,sourceCoverage:{placeSources:stay.map(x=>x.node.source),transportSources:edges.map(e=>e.source),priceEvidenceCount:cost.evidence.length,unknownCostCount:cost.unknownComponents.length},explanation:{mustSeeSatisfied:b.mustSee.every(x=>path.includes(x)||path.some(id=>same(byId.get(id).name,x))),geographySatisfied:geoMatch(byId.get(path[path.length-1]),b.geography),budgetTarget:b.budgetTarget,budgetCap:b.budgetCap,why:[]}};
}
function score(c,b,p){
 const mid=c.duration.typical,duration=mid<b.minDays||mid>b.maxDays?0:1-Math.abs(mid-(b.minDays+b.maxDays)/2)/Math.max(1,(b.maxDays-b.minDays)/2+1);
 const budget=c.cost.complete?Math.max(0,1-c.cost.totalMax/(b.budgetCap||1)):0.15/(1+c.cost.unknownComponents.length),safety=c.safety.status==='high-alert'?0:c.safety.status==='unknown'?0.3:0.8,season=c.season.status==='review-needed'?Math.max(0,.7-c.season.items.length*.12):.9,adventure=Math.min(1,c.adventureScore/Math.max(3,c.places.length*2));
 const style=b.adventureStyle==='adventurous'?.12:b.adventureStyle==='relaxed'?-.12:0;
 if(p==='budget')return budget*.6+duration*.15+safety*.15+season*.1+style*adventure;
 if(p==='adventure')return adventure*.5+duration*.15+budget*.15+safety*.1+season*.1+style;
 return budget*.3+duration*.25+safety*.25+season*.15+adventure*(.05+style);
}
function discover({brief:raw,graph,now=Date.now()}={}){
 const v=validateBrief(raw),gv=validateGraph(graph);if(!v.ok)return {status:'invalid-brief',errors:v.errors,warnings:v.warnings,candidates:[]};if(!gv.ok)return {status:'invalid-graph',errors:gv.errors,warnings:gv.warnings,candidates:[]};
 const b=v.brief,byId=new Map(graph.nodes.map(n=>[n.id,n])),origin=graph.nodes.find(n=>n.id===b.origin||same(n.name,b.origin));if(!origin)return {status:'origin-not-found',errors:['Startort fehlt im gelieferten Graph.'],warnings:gv.warnings,candidates:[]};
 const avoid=new Set(b.avoid.map(x=>x.toLowerCase())),allowed=new Set(graph.nodes.filter(n=>n.id===origin.id||(!avoid.has(String(n.id).toLowerCase())&&!avoid.has(String(n.name).toLowerCase()))).map(n=>n.id)),adj=new Map();
 for(const e of graph.edges)if(allowed.has(e.from)&&allowed.has(e.to)){if(!adj.has(e.from))adj.set(e.from,[]);adj.get(e.from).push(e);}for(const list of adj.values())list.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const candidates=[],seen=new Set(),searchLimit=Math.max(1000,b.maxCandidates*100);let pathsVisited=0,truncated=false;
 function visit(path,edges){if(pathsVisited++>=searchLimit){truncated=true;return;}const n=byId.get(path[path.length-1]);
  if(path.length>=2&&geoMatch(n,b.geography)&&b.mustSee.every(x=>path.includes(x)||path.some(id=>same(byId.get(id).name,x)))){const c=buildCandidate(path,edges,graph,b,now);if(c&&!seen.has(c.id)){seen.add(c.id);candidates.push(c);}}
  if(path.length>=b.maxStops)return;for(const e of (adj.get(path[path.length-1])||[])){if(path.includes(e.to)||truncated)continue;visit(path.concat(e.to),edges.concat(e));}
 }
 visit([origin.id],[]);
 const feasible=candidates.filter(c=>c.duration.min<=b.maxDays&&c.duration.max>=b.minDays);if(!feasible.length)return {status:'no-feasible-routes',errors:[],warnings:gv.warnings,diagnostics:{nodes:graph.nodes.length,edges:graph.edges.length,origin:origin.id,pathsVisited,truncated,reason:'Keine Route erfüllt Zielgeografie, Pflichtziele, Dauer, Saison-Hard-Constraints und Sicherheitsfilter im gelieferten Graph.'},candidates:[]};
 const profiles=[{id:'budget',label:'Budgetfokus'},{id:'balanced',label:'Ausgewogen'},{id:'adventure',label:'Abenteuer'}],chosen=[],used=new Set();
 for(const p of profiles){const ranked=feasible.map(c=>({c,score:score(c,b,p.id)})).sort((a,z)=>z.score-a.score||a.c.duration.typical-z.c.duration.typical||a.c.id.localeCompare(z.c.id));const pick=ranked.find(x=>!used.has(x.c.id))||ranked[0];if(!pick)continue;used.add(pick.c.id);const c=JSON.parse(JSON.stringify(pick.c));c.profile=p.id;c.label=p.label;c.score=round(pick.score);
  c.explanation.why.push(p.id==='budget'?'Priorisiert bekannte Kosten und vermeidet preislich unbekannte Verbindungen.':p.id==='adventure'?'Priorisiert als Abenteuer markierte Orte und Boot-/Überlandverbindungen, ohne bekannte hohe Warnungen zu ignorieren.':'Balanciert Kosten, Dauer, Saison und Stand der Sicherheitsquellen.');
  if(!c.cost.complete)c.explanation.why.push('All-in-Budget unvollständig: '+c.cost.unknownComponents.length+' Kostenposition(en) ohne verwendbaren Preis. Kein Budgetnachweis.');
  if(c.safety.status==='unknown')c.explanation.why.push('Sicherheitslage aus gelieferten Quellen nicht ausreichend belegt; unbekannt bedeutet nicht sicher.');
  if(c.season.status==='review-needed')c.explanation.why.push('Saisonhinweise vor Buchung anhand aktueller Betreiber-/Behördeninformationen prüfen.');
  if(c.cost.complete&&c.cost.capStatus==='over-cap')c.explanation.why.push('Kostenobergrenze wird voraussichtlich überschritten.');
  if(c.cost.complete&&c.cost.capStatus==='target-met')c.explanation.why.push('Obere Kostenbandbreite liegt im Budgetziel; Quellen und Aktualität bleiben maßgeblich.');
  chosen.push(c);
 }
 return {status:'ok',brief:{origin:b.origin,startDate:b.startDate,geography:b.geography,minDays:b.minDays,maxDays:b.maxDays,budgetTarget:b.budgetTarget,budgetCap:b.budgetCap,budgetCurrency:b.budgetCurrency},warnings:v.warnings.concat(gv.warnings),diagnostics:{nodes:graph.nodes.length,edges:graph.edges.length,feasibleRoutes:feasible.length,pathsVisited,truncated,sourceGraphOnly:true,liveProviderConnected:false,pricesAreLiveOnlyWhenExplicitlyMarked:true},candidates:chosen};
}
const api={validateBrief,validateGraph,validBand,discover};root.TheWornRoadRouteDiscovery=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);