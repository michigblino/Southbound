/* Historical snapshots for the same service and departure. No live provider feed. */
(function(g){'use strict';
const valid=n=>n!==''&&n!==null&&n!==undefined&&Number.isFinite(Number(n))&&Number(n)>=0;
function add(history,entry){if(!entry||typeof entry.key!=='string'||!entry.key.trim()||!valid(entry.price)||!/^https:\/\//i.test(entry.source||'')||!Number.isFinite(Date.parse(entry.checkedAt)))return history.slice();const x={key:entry.key.trim(),price:Number(entry.price),source:entry.source,checkedAt:entry.checkedAt,currency:'EUR',origin:entry.origin||'manual'};return history.concat([x]).sort((a,b)=>Date.parse(a.checkedAt)-Date.parse(b.checkedAt)).slice(-1000)}
function summary(history,key){const a=history.filter(x=>x.key===key&&valid(x.price)).sort((a,b)=>Date.parse(a.checkedAt)-Date.parse(b.checkedAt));if(!a.length)return {count:0};const prices=a.map(x=>Number(x.price)),first=prices[0],last=prices.at(-1),min=Math.min(...prices),max=Math.max(...prices),changes=prices.slice(1).map((p,i)=>prices[i]>0?(p-prices[i])/prices[i]*100:null).filter(Number.isFinite);return {count:a.length,first,last,min,max,delta:last-first,deltaPercent:first>0?(last-first)/first*100:null,observedDown:Math.max(0,(last-min)/Math.max(last,0.01)*100),observedUp:Math.max(0,(max-last)/Math.max(last,0.01)*100),changes}}
function byKey(history){return [...new Set(history.map(x=>x.key))].map(key=>({key,...summary(history,key)})).sort((a,b)=>b.count-a.count)}
g.SouthboundPriceHistory={add,summary,byKey};
})(typeof window!=='undefined'?window:globalThis);
