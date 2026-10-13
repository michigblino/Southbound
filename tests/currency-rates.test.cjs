const test=require('node:test'),assert=require('node:assert/strict');
const FX=require('../currency-rates.js');
const date='2026-10-13',codes=['eur','usd','brl','cop','pen','ars','clp','uyu','gbp','aud','cad','jpy','inr','chf','zar','mxn','thb','idr','nzd','bob','pyg','nok','sek','dkk','pln','czk','try','cny','krw','huf','sgd','aed'];
const eur=Object.fromEntries(codes.map((code,i)=>[code,i+1]));
eur.eur=1;eur.usd=1.2;eur.brl=6;eur.cop=4800;
const fixture=(patch={})=>({date,eur,...patch});
test('currency feed accepts EUR-based latest reference with broad South American coverage',()=>{
 const q=FX.parse(fixture(),{now:date});
 assert.equal(q.source,'fawazahmed0/exchange-api');
 assert.equal(q.rates.BRL,6);assert.equal(q.rates.COP,4800);
 assert.equal(q.fresh,true);
 assert.equal(FX.quoted(q,'BRL','EUR').rate,1/6);
 assert.equal(FX.quoted(q,'BRL','COP').rate,800);
 assert.equal(FX.convert(120,'BRL','EUR',q),20);
 assert.equal(FX.display(100,'BRL',q).includes('600'),true);
});
test('user base currency can be EUR, BRL, COP and back without mutating canonical EUR',()=>{
 const q=FX.parse(fixture(),{now:date});
 const canonical=400;
 for(const base of ['EUR','BRL','COP','USD']){
  const view=FX.convert(canonical,'EUR',base,q);
  assert.ok(Number.isFinite(view));
  assert.ok(Math.abs(FX.convert(view,base,'EUR',q)-canonical)<1e-6);
 }
});
test('unavailable currency is never silently treated as EUR',()=>{
 const q=FX.parse(fixture(),{now:date});
 assert.equal(FX.quoted(q,'ZZZ','EUR'),null);
 assert.equal(FX.convert(50,'EUR','ZZZ',q),null);
 assert.equal(FX.display(50,'ZZZ',q),null);
});
test('stale and future-dated feeds are not fresh/accepted',()=>{
 const stale=FX.parse(fixture(),{now:'2026-10-19'});
 assert.equal(stale.fresh,false);
 assert.equal(FX.eurPerUnit(stale,'BRL'),null);
 assert.equal(FX.parse(fixture({date:'2026-10-14'}),{now:date}),null);
});
test('fetch uses cloudflare fallback when primary CDN fails',async()=>{
 const urls=[];
 const q=await FX.load({now:date,fetcher:async url=>{
  urls.push(url);
  if(url.includes('cdn.jsdelivr.net'))throw Error('CDN unavailable');
  return {ok:true,json:async()=>fixture()};
 }});
 assert.ok(urls[0].includes('cdn.jsdelivr.net'));
 assert.ok(urls[1].includes('currency-api.pages.dev'));
 assert.equal(q.rates.COP,4800);
 assert.equal(q.cached,false);
});
test('same-day cached FX avoids any network call',async()=>{
 const x=await FX.load({now:date,cache:fixture(),fetcher:async()=>{throw Error('must not fetch')}});
 assert.equal(x.cached,true);assert.equal(x.fresh,true);
});
test('if provider is offline, return cached quote and mark stale rather than inventing rates',async()=>{
 const x=await FX.load({now:'2026-10-19',cache:fixture(),fetcher:async()=>{throw Error('offline')}});
 assert.equal(x.cached,true);assert.equal(x.fresh,false);
 assert.equal(FX.eurPerUnit(x,'BRL'),null);
});
test('invalid rates and dates are conservatively rejected',()=>{
 assert.equal(FX.parse({date:'yesterday',eur},{now:date}),null);
 assert.equal(FX.parse(fixture({eur:{eur:1,usd:1,brl:6,cop:4800}}),{now:date}),null);
 const q=FX.parse(fixture({eur:{...eur,brl:0,cop:-2}}),{now:date});
 assert.equal(q,null);
});
