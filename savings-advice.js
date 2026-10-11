(function(g){'use strict';
const nature=/Chapada|Lençóis|Salento|Minca|Cusco|Uyuni|Atacama|Bariloche|Chaltén|Torres|Paraty|Huacachina/i;
const priority=/Cusco|Uyuni|Chaltén|Torres|Chapada|Lençóis/i;
function recommend({stops,order,excluded={},days={},vol={},volunteerDetails={},quotes={},current=0,visited={},transport}){
const ids=(order&&order.length?order:stops.map((_,i)=>i)).filter(i=>stops[i]&&!excluded[i]);
const bed=i=>vol[i]?Math.max(0,Number(volunteerDetails[i]?.night)||0):Number(quotes[i]?.night)>0?Number(quotes[i].night):Number(stops[i][5])>0?Number(stops[i][5]):Math.max(9,Math.round(Number(stops[i][6])*1.2));
const daily=i=>bed(i)+stops[i][6]+stops[i][7]+stops[i][8];
const stay=i=>Math.max(1,Number(days[i]??stops[i][4])||1);
const candidates=[];
for(let k=0;k<ids.length;k++){const i=ids[k],s=stops[i],n=stay(i);if(i<current||visited[i])continue;const isNature=nature.test(s[0]),isPriority=priority.test(s[0]);const min=isPriority?5:isNature?4:2;const volunteerCandidate=n>=12&&bed(i)>=9;
if(n>min+2&&!vol[i]){const cut=Math.min(n-min,Math.max(2,Math.ceil(n*.3))),saving=cut*daily(i);if(saving>=25)candidates.push({id:'short-'+i,kind:'short',i,days:n-cut,saving,impact:isPriority?3:isNature?2:1,title:(volunteerCandidate?'Alternative zum Volunteering: ':'')+s[0]+' kürzer besuchen',gain:cut+' Tage weniger laufende Kosten',loss:cut+' Tage weniger Zeit für Erkundungen und spontane Ausflüge; eventuell weniger Zeit für Wetterfenster.',confidence:'rechnerisch',detail:'Neue Dauer '+(n-cut)+' statt '+n+' Tage. '+(volunteerCandidate?'Alternative zum unbestätigten Volunteering; nicht zusätzlich zu dessen voller Unterkunftsersparnis rechnen. ':'')+'Verbindungen und Aktivitätstermine können sich verschieben.'})}
if(k>0&&k<ids.length-1&&!isPriority&&!volunteerCandidate&&n<=8){const prev=ids[k-1],next=ids[k+1],oldA=transport.estimate(stops[prev],s),oldB=transport.estimate(s,stops[next]),direct=transport.estimate(stops[prev],stops[next]);const saved=n*daily(i)+oldA.mid+oldB.mid-direct.mid;if(saved>35)candidates.push({id:'skip-'+i,kind:'skip',i,saving:saved,impact:isNature?3:2,title:s[0]+' auslassen',gain:'Eine Unterkunftsphase und einen Zwischenstopp weniger',loss:'Du verpasst '+s[0]+' und die dortigen Aktivitäten vollständig. Eine direkte Verbindung muss real geprüft werden.',confidence:'Entfernungsmodell, niedrige Sicherheit',detail:'Netto: '+Math.round(n*daily(i))+' € Aufenthalt + '+Math.round(oldA.mid+oldB.mid)+' € bisherige Anreisen − '+Math.round(direct.mid)+' € direkte Verbindung. Neue Strecke '+stops[prev][0]+' → '+stops[next][0]+'. Keine bestätigten Ticketpreise.'})}}
return candidates.filter(x=>x.saving>0).sort((a,b)=>b.saving/(1+b.impact*1.6)-a.saving/(1+a.impact*1.6)).slice(0,7);
}
g.SouthboundSavingsAdvice={recommend};
})(typeof window!=='undefined'?window:globalThis);
