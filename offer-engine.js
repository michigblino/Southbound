/* Southbound offer normalization: no network access, no implied booking or verification. */
(function(root){'use strict';
const TYPES=['transport','lodging','volunteering','activity'];
const STATUSES=['live','manually-checked','stale','estimate','unknown'];
const ISO=/^\d{4}-\d{2}-\d{2}$/;
function day(s){if(typeof s!=='string'||!ISO.test(s))return false;const t=Date.parse(s+'T12:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s}
function https(s){try{const u=new URL(s);return u.protocol==='https:'&&!!u.hostname}catch{return false}}
function normalize(input,now){
 if(!input||typeof input!=='object'||!TYPES.includes(input.type))return null;
 const type=input.type,source=input.source||{},checkedAt=input.checkedAt,availableOn=input.availableOn;
 const status=STATUSES.includes(input.status)?input.status:'unknown';
 const price=Number(input.price),priced=input.price!==''&&input.price!==null&&input.price!==undefined&&Number.isFinite(price)&&price>=0;
 const validSource=typeof source.name==='string'&&!!source.name.trim()&&https(source.url);
 const verifiedStatus=status==='live'||status==='manually-checked';
 const validDate=day(checkedAt)&&(!availableOn||day(availableOn));
 const current=day(now)?now:new Date().toISOString().slice(0,10);
 const future=validDate&&checkedAt<=current;
 // A manually entered price cannot assert a real-time live feed.
 const reliable=priced&&input.currency==='EUR'&&validSource&&validDate&&future&&verifiedStatus&&!(status==='live'&&input.sourceMethod!=='provider-api');
 const expired=validDate&&checkedAt<current;
 const effectiveStatus=verifiedStatus&&!reliable?'unknown':status==='live'&&expired?'stale':status;
 return {type,id:String(input.id||''),status:effectiveStatus,price:priced?price:null,currency:input.currency==='EUR'?'EUR':null,source:validSource?{name:source.name.trim(),url:source.url}:null,checkedAt:day(checkedAt)?checkedAt:null,availableOn:day(availableOn)?availableOn:null,providerAvailability:input.providerAvailability===true&&status==='live'&&reliable&&!expired,priceKind:reliable&&!expired?'sourced':priced?'estimate':'unknown',booked:input.booked===true,details:input.details&&typeof input.details==='object'?input.details:{},warning:reliable&&!expired?null:'Kein aktuell nachgewiesener Buchungspreis'};
}
function compare(offers,now){return (offers||[]).map(x=>normalize(x,now)).filter(Boolean).sort((a,b)=>{const rank=x=>x.priceKind==='sourced'?0:x.priceKind==='estimate'?1:2;return rank(a)-rank(b)||(a.price??Infinity)-(b.price??Infinity)})}
const api={normalize,compare,types:TYPES.slice()};
root.SouthboundOffers=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
