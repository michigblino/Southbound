/* Free World Bank annual CPI data: macro context, never a verified ticket price. */
(function(g){'use strict';
const countries={Brasilien:'BRA',Kolumbien:'COL',Peru:'PER',Bolivien:'BOL',Chile:'CHL',Argentinien:'ARG'};
const aliases={'Brazil':'BRA','Colombia':'COL','Bolivia':'BOL','Argentina':'ARG','Brasil':'BRA','Chile':'CHL','Perú':'PER'};
const code=s=>countries[s]||aliases[s]||null;
function latest(rows){if(!Array.isArray(rows))return null;const found=rows.filter(x=>x&&Number.isFinite(Number(x.value))&&x.value!==null&&/^\d{4}$/.test(x.date)).sort((a,b)=>Number(b.date)-Number(a.date))[0];return found?{year:Number(found.date),rate:Number(found.value)}:null}
function estimate({price,observedYear,targetYear,annualRate,category='other'}){if(!Number.isFinite(price)||price<0||!Number.isInteger(observedYear)||!Number.isInteger(targetYear)||targetYear<observedYear||targetYear-observedYear>5||!Number.isFinite(annualRate))return null;const years=targetYear-observedYear;const adjusted=price*Math.pow(1+Math.max(-30,Math.min(100,annualRate))/100,years);return {price:adjusted,years,category,method:'country-cpi-proxy',verified:false,warning:'Landesweite Inflation ist kein Ticket-, Unterkunfts- oder Wechselkursindex.'}}
async function fetchRates(fetcher=fetch){const ids=['BRA','COL','PER','BOL','CHL','ARG'];const url='https://api.worldbank.org/v2/country/'+ids.join(';')+'/indicator/FP.CPI.TOTL.ZG?format=json&mrv=5&per_page=100';const response=await fetcher(url);if(!response.ok)throw Error('Weltbank-Anfrage fehlgeschlagen');const data=await response.json();if(!Array.isArray(data)||!Array.isArray(data[1]))throw Error('Ungültige Weltbank-Antwort');const result={};for(const id of ids){const v=latest(data[1].filter(x=>x.countryiso3code===id));if(v)result[id]=v}return {result,source:url,checkedAt:new Date().toISOString()}}
g.SouthboundInflation={code,latest,estimate,fetchRates};
})(typeof window!=='undefined'?window:globalThis);
