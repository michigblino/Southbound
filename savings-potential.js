/* Transparent, hypothetical accommodation-only volunteering upper bound.
 * Not an actual host match, route optimum or bookable/net saving.
 * The calculation NEVER mutates trip data or assumes food/fees/transport free.
 */
(function(root){'use strict';
const value=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
const round=x=>Math.round((x+Number.EPSILON)*100)/100;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T12:00:00Z'));
function analyze({items=[],vol={},volunteerDetails={},bookings=[],completed={},visited={},preferences={}}={}){
 const requiredDays=21;
 const chosenWeeks=value(preferences.maxVolunteerWeeks);
 const maxSingleHostDays=chosenWeeks===null?28:Math.min(28,Math.floor(chosenWeeks*7));
 const hourLimit=Math.min(30,value(preferences.maxVolunteerHours)??30);
 const all=Array.isArray(items)?items:[],records=Array.isArray(bookings)?bookings:[];
 const candidates=[],reasons=[],totalTravelDays=all.filter(x=>!x?.isReturn).reduce((s,x)=>s+(value(x.days)||0),0);
 for(const item of all){
  if(!item||item.isReturn||!Number.isInteger(item.i)||completed[item.i]||visited[item.i])continue;
  const i=item.i,days=Math.floor(value(item.days)??0);
  if(vol[i]===true&&volunteerDetails[i]?.confirmed===true){reasons.push({i,name:item.name,reason:'Bereits eingeplantes Volunteering: nicht nochmals sparen'});continue}
  if(days<requiredDays||maxSingleHostDays<requiredDays){reasons.push({i,name:item.name,reason:'Weniger als 21 zulässige Aufenthaltstage – keine Host-Termine erfunden'});continue}
  const knownHours=volunteerDetails[i]?.hoursPerWeek??volunteerDetails[i]?.hours;
  const hours=value(knownHours);
  if(knownHours!==null&&knownHours!==undefined&&knownHours!==''&&hours===null){
   reasons.push({i,name:item.name,reason:'Arbeitsstunden nicht gültig'});continue
  }
  if(hours!==null&&hours>hourLimit){reasons.push({i,name:item.name,reason:'Bekannte Arbeitsstunden über '+hourLimit+' h/Woche'});continue}
  const bed=value(item.regularBed);
  if(bed===null){reasons.push({i,name:item.name,reason:'Regulärer Übernachtungspreis unbekannt'});continue}
  // Confirmed lodging commitments cannot be replaced speculatively.
  const commitment=records.some(b=>b?.type==='lodging'&&b.stageId===i&&b.status==='confirmed');
  if(commitment){reasons.push({i,name:item.name,reason:'Bestätigte Unterkunft nicht als vermeidbare Ausgabe behandelt'});continue}
  const nights=Math.min(days,maxSingleHostDays);
  candidates.push({i,name:item.name||('Etappe '+i),days,nights,bedPerNight:bed,
   gross:round(nights*bed),hoursKnown:hours!==null,hoursWithinLimit:hours===null?null:hours<=hourLimit,
   status:'hypothetical-unverified'});
 }
 candidates.sort((a,b)=>b.gross-a.gross||a.i-b.i);
 const gross=round(candidates.reduce((sum,x)=>sum+x.gross,0));
 const nights=candidates.reduce((sum,x)=>sum+x.nights,0);
 // Range between mid and lower bound is a price spread, not an optimized reroute.
 const ticketSpread=round(all.reduce((sum,x)=>{
  const leg=value(x?.leg),low=value(x?.legMin);
  return sum+(x?.transportOffer||leg===null||low===null?0:Math.max(0,leg-low));
 },0));
 return {grossAccommodationCeiling:gross,eligibleNights:nights,averagedPerVolunteerNight:nights?round(gross/nights):0,
  averagedPerTravelDay:totalTravelDays?round(gross/totalTravelDays):0,travelDays:totalTravelDays,
  candidateCount:candidates.length,candidates,reasons,priceSpreadIndicator:ticketSpread,
  verifiedAdditionalSaving:null,routeReoptimizationSaving:null,assumptions:{
   minStayDays:requiredDays,maxSingleHostDays,hourLimit,needsVerifiedHours:true,
   extraDaysAdded:0,foodSavingsIncluded:false,hostFeesIncluded:false,transfersRepriced:false
  },warning:'Brutto-Unterkunftsobergrenze unter hypothetischen Host-Zusagen. Kein Netto- oder All-in-Budget; Host-Gebühren, Mahlzeiten, Extras, Anreise, Sicherheit und Verfügbarkeit sind unbestätigt.'};
}
root.SouthboundSavingsPotential={analyze};
if(typeof module!=='undefined'&&module.exports)module.exports=root.SouthboundSavingsPotential;
})(typeof globalThis!=='undefined'?globalThis:this);
