/* Indicative daily FX reference rates. Internal Southbound budgets stay EUR.
 * Source: https://github.com/fawazahmed0/exchange-api
 * No key, no bank settlement rates, no silent free or 1:1 fallback.
 */
(function(g){'use strict';
const SOURCE='fawazahmed0/exchange-api',PRIMARY='https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json';
const FALLBACK='https://latest.currency-api.pages.dev/v1/currencies/eur.min.json';
const ISO=/^[A-Z]{3}$/;
const DAY=86400000;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(Date.parse(s+'T12:00:00Z')).toISOString().slice(0,10)===s;
const normalizedCode=value=>String(value||'EUR').trim().toUpperCase();
function parse(data,{now=new Date().toISOString().slice(0,10)}={}){
 if(!data||!validDate(data.date)||!validDate(now)||data.date>now||!data.eur||typeof data.eur!=='object')return null;
 const rates={EUR:1};
 for(const [k,v] of Object.entries(data.eur)){
  const code=k.toUpperCase(),n=Number(v);
  if(ISO.test(code)&&Number.isFinite(n)&&n>0&&n<1e16)rates[code]=n;
 }
 if(!rates.USD||!rates.BRL||!rates.COP||Object.keys(rates).length<25)return null;
 const age=Math.round((Date.parse(now+'T12:00:00Z')-Date.parse(data.date+'T12:00:00Z'))/DAY);
 return {date:data.date,source:SOURCE,rates,fresh:age>=0&&age<=3,ageDays:age};
}
function quoted(quotes,from,to){
 const source=normalizedCode(from),target=normalizedCode(to),list=quotes?.rates;
 if(!ISO.test(source)||!ISO.test(target))return null;
 if(source===target)return {rate:1,source:'Identische Währung',date:quotes?.date||'',fresh:true};
 if(!list||!Number.isFinite(list[source])||!Number.isFinite(list[target])||list[source]<=0||list[target]<=0)return null;
 return {rate:list[target]/list[source],source:quotes.source,date:quotes.date,fresh:quotes.fresh===true};
}
function convert(amount,from,to,quotes){
 const value=Number(amount);if(!Number.isFinite(value))return null;
 const q=quoted(quotes,from,to);return q?value*q.rate:null;
}
function eurPerUnit(quotes,code){const q=quoted(quotes,code,'EUR');return q&&q.fresh?q:null}
function display(eur,base,quotes){
 const code=normalizedCode(base),value=code==='EUR'?Number(eur):convert(eur,'EUR',code,quotes);
 if(!Number.isFinite(value))return null;
 try{return new Intl.NumberFormat('de-DE',{style:'currency',currency:code,maximumFractionDigits:0}).format(value)}
 catch{return null}
}
async function load({fetcher,cache=null,now=new Date().toISOString().slice(0,10)}={}){
 const old=parse(cache,{now});
 if(old?.fresh&&old.date===now)return {...old,cached:true};
 const requester=fetcher||(typeof fetch==='function'?fetch:null);
 if(requester){
  for(const url of [PRIMARY,FALLBACK]){
   try{
    const response=await requester(url,{mode:'cors',cache:'no-store'});
    if(!response||response.ok!==true)continue;
    const data=await response.json();
    const parsed=parse(data,{now});
    if(parsed&&parsed.fresh)return {...parsed,url,cached:false};
   }catch{}
  }
 }
 return old?{...old,cached:true}:null;
}
g.SouthboundFX={parse,quoted,convert,eurPerUnit,display,load,normalizedCode,source:SOURCE,urls:[PRIMARY,FALLBACK]};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundFX;
})(typeof globalThis!=='undefined'?globalThis:this);
