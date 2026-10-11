/* 2026 publicly visible backpacker cost examples, USD. Not bookable quotes. */
(function(g){'use strict';
const url='https://brokepackr.com/cost-index/latam';
const rows={
0:[19,20,6,21],2:[27,16,5,9],8:[20,15,6,8],9:[14,15,5,6],11:[10,12,6,11],13:[15,13,5,2],14:[14,11,5,11],15:[9,12,5,34],16:[19,9,6,50],17:[10,8,5,5],18:[14,12,5,24],19:[17,28,5,29],20:[13,24,6,8],21:[13,28,5,9],22:[20,44,8,19],23:[22,27,5,3]};
/* columns lodging, food, activities, local transport; local transport is NOT intercity fares */
const indexMap={0:'São Paulo',2:'Rio de Janeiro',8:'Medellín',9:'Salento',11:'Lima',13:'Huacachina',14:'Cusco',15:'Arequipa',16:'La Paz',17:'Sucre',18:'Uyuni',19:'San Pedro de Atacama',20:'Valparaíso',21:'Mendoza',22:'Buenos Aires',23:'Bariloche'};
function sample(i){const v=rows[i];return v?{name:indexMap[i],lodging:v[0],food:v[1],activities:v[2],localTransport:v[3],currency:'USD',source:url,year:2026,level:'city-average-not-bookable'}:null}
function compare(stops,{usdEur,rateDate}={}){const valid=Number.isFinite(usdEur)&&usdEur>0,items=stops.filter(x=>x.active!==false).map(s=>{const a=sample(s.id),daily=a&&valid?(s.volunteering?0:a.lodging)*usdEur+a.food*usdEur+a.activities*usdEur+a.localTransport*usdEur:null;return {...s,sample:a,daily,quality:a&&valid?'city-reference':'app-estimate',rateDate}});return {items,matched:items.filter(x=>x.daily!==null).length,fxReady:valid}}
async function refreshFx(fetcher=fetch){const res=await fetcher('https://api.frankfurter.dev/v2/rate/USD/EUR');if(!res.ok)throw Error('FX-Daten nicht verfügbar');const data=await res.json();if(!Number.isFinite(Number(data.rate))||Number(data.rate)<=0)throw Error('Ungültiger Wechselkurs');return {usdEur:Number(data.rate),date:data.date,checkedAt:new Date().toISOString(),source:'https://frankfurter.dev/'}}
g.SouthboundCostReferences={sample,compare,refreshFx,url};
})(typeof window!=='undefined'?window:globalThis);
