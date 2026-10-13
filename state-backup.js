/* Southbound private-beta backup integrity guard.
 * Import creates a NEW persisted state; it never mixes omitted backup fields
 * with records from the currently loaded trip.
 */
(function(g){'use strict';
const MAX_BYTES=8*1024*1024;
const DANGEROUS=new Set(['__proto__','constructor','prototype']);
const OBJECT_FIELDS=['days','vol','visited','excluded','actuals','volunteerDetails','hostelQuotes','transportOffers','fixedCosts','travelPreferences','priceRanges','fx','dailyRatesCache','transferDaysByStop','volunteerCounts'];
const ARRAY_FIELDS=['bookingLedger','customStops','extraStops','routeOrder','routeOffers','priceHistory','departures'];
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function inspect(obj,depth=0){
 if(depth>22)throw Error('Backup ist zu tief verschachtelt');
 if(!obj||typeof obj!=='object')return;
 for(const [k,v] of Object.entries(obj)){
  if(DANGEROUS.has(k))throw Error('Unsicheres Feld im Backup: '+k);
  if(typeof v==='object'&&v!==null)inspect(v,depth+1);
 }
}
function validateState(state){
 if(!isPlain(state))throw Error('Kein gültiger Southbound-Reiseplan');
 inspect(state);
 for(const field of OBJECT_FIELDS){
  if(state[field]!==undefined&&state[field]!==null&&!isPlain(state[field]))
   throw Error('Ungültiges Objekt: '+field);
 }
 for(const field of ARRAY_FIELDS){
  if(state[field]!==undefined&&state[field]!==null&&!Array.isArray(state[field]))
   throw Error('Ungültige Liste: '+field);
 }
 for(const key of ['goal','cap','reserve']){
  if(state[key]!==undefined&&(!Number.isFinite(Number(state[key]))||Number(state[key])<0))
   throw Error('Ungültiger Budgetbetrag: '+key);
 }
 if(state.goal!==undefined&&state.cap!==undefined&&Number(state.cap)<Number(state.goal))
  throw Error('Budgetobergrenze kleiner als Ziel');
 if(state.baseCurrency!==undefined&&!/^[A-Z]{3}$/.test(String(state.baseCurrency)))
  throw Error('Ungültige Basiswährung');
 if(state.bookingLedger!==undefined&&state.bookingLedger!==null){
  for(const record of state.bookingLedger){
   if(!isPlain(record)||typeof record.id!=='string'||!record.id.trim()||!['transport','lodging','volunteering','activity'].includes(record.type))
    throw Error('Ungültige Buchungsakte im Backup');
  }
 }
 return state;
}
function parse(text){
 if(typeof text!=='string'||!text.trim())throw Error('Die Datei ist leer');
 if(text.length>MAX_BYTES)throw Error('Backup zu groß: maximal 8 MB');
 let doc;
 try{doc=JSON.parse(text)}catch{throw Error('Kein gültiges JSON-Backup')}
 if(!isPlain(doc)||!Number.isInteger(doc.version)||doc.version<3||doc.version>4)
  throw Error('Unbekannte Southbound-Backupversion');
 return validateState(doc.state);
}
function serialize(state){
 validateState(state);
 const out=JSON.stringify({version:4,state},null,2);
 if(out.length>MAX_BYTES)throw Error('Backup zu groß: maximal 8 MB');
 return out;
}
g.SouthboundStateBackup={parse,serialize,validateState,MAX_BYTES};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundStateBackup;
})(typeof globalThis!=='undefined'?globalThis:this);
