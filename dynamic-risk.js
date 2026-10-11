/* Explainable heuristic uncertainty. Lead time never reduces uncertainty by itself. */
(function(g){'use strict';
const DAY=86400000;
const base={lodging:0.24,food:0.16,activities:0.28,transport:0.38,other:0.22};
function risk({kind='other',travelDate,now=Date.now(),quotes=[],source='estimate',confirmed=false}){
 if(confirmed)return {down:0,up:0,quality:'bezahlt/bestätigt',daysAhead:0,count:quotes.length};
 const date=Date.parse(String(travelDate).slice(0,10)+'T12:00:00Z');
 const ahead=Number.isFinite(date)?Math.max(0,Math.ceil((date-now)/DAY)):365;
 const recent=quotes.filter(q=>Number.isFinite(Number(q.price))&&Number(q.price)>=0&&Number.isFinite(Date.parse(q.checkedAt))&&Date.parse(q.checkedAt)<=now&&now-Date.parse(q.checkedAt)<=30*DAY);
 const distinct=[...new Set(recent.map(q=>q.source+'|'+q.price))];
 const count=distinct.length;
 const current=count>=3&&recent.some(q=>now-Date.parse(q.checkedAt)<=7*DAY);
 const sourceFactor=source==='bookable'?.65:source==='city-reference'?.9:1.3;
 const evidenceFactor=current?.5:count>=2?.78:count===1?.95:1.15;
 const leadFactor=ahead>180?1.28:ahead>90?1.15:ahead>30?1.07:1;
 const risk=base[kind]||base.other;
 const up=Math.min(.95,Math.max(.08,risk*sourceFactor*evidenceFactor*leadFactor));
 const down=Math.min(.65,Math.max(.05,up*.72));
 return {down,up,quality:current?'mehrere aktuelle Preisstände':count?'wenige/ältere Preisstände':'unbestätigte Schätzung',daysAhead:ahead,count};
}
function total(parts){let mid=0,low=0,high=0;for(const p of parts){const value=Math.max(0,Number(p.amount)||0),r=risk(p);mid+=value;low+=value*(1-r.down);high+=value*(1+r.up)}return {mid,low,high}}
g.SouthboundDynamicRisk={risk,total};
})(typeof window!=='undefined'?window:globalThis);
