/* Waiting-night costs: confirmed host waiting is never assumed free. */
(function(g){'use strict';
const DAY=86400000;
const validDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const t=Date.parse(s+'T12:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s;};
const days=(from,to)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/DAY);
function estimate({calendarItems=[],stages=[]}={}){
 const lines=[],issues=[];let total=0;
 for(const item of calendarItems){
  const count=Number(item.waitingDays)||0;if(count<=0)continue;
  const stage=stages[item.index]||{};
  const bed=stage.waitBed==null?null:Number(stage.waitBed);
  const food=stage.waitFood==null?null:Number(stage.waitFood);
  const other=stage.waitOther==null?0:Number(stage.waitOther);
  const bookings=Array.isArray(stage.waitBookings)?stage.waitBookings:[];
  let bookedNights=0,bookedCost=0,valid=true;
  const records=[];
  for(const record of bookings){
   const price=record.totalEUR;
   const amount=price==null||price===''?null:Number(price);
   if(!validDate(record.startDate)||!validDate(record.endDate)||!validDate(item.arrival)||!validDate(item.start)||
      record.startDate<item.arrival||record.endDate>item.start||record.endDate<=record.start||
      amount===null||!Number.isFinite(amount)||amount<0){
    issues.push({index:item.index,reason:'invalid-wait-booking',id:record.id});valid=false;continue;
   }
   records.push({...record,amount});
  }
  records.sort((a,b)=>a.startDate.localeCompare(b.startDate));
  for(let i=1;i<records.length;i++){
   if(records[i].startDate<records[i-1].endDate){
    issues.push({index:item.index,reason:'overlapping-wait-bookings',id:records[i].id});valid=false;
   }
  }
  if(valid)for(const b of records){bookedNights+=days(b.startDate,b.endDate);bookedCost+=b.amount;}
  const unbookedNights=count-bookedNights;
  if(!valid||unbookedNights<0||!Number.isFinite(food)||food<0||!Number.isFinite(other)||other<0||
     (unbookedNights>0&&(bed===null||!Number.isFinite(bed)||bed<0))){
   issues.push({index:item.index,reason:'missing-wait-cost'});
   lines.push({index:item.index,days:count,bookedNights:valid?bookedNights:0,amount:null});continue;
  }
  const amount=Math.round((bookedCost+unbookedNights*(bed??0)+count*(food+other))*100)/100;
  total+=amount;
  lines.push({index:item.index,days:count,bookedNights,bookedCost,amount});
 }
 return {total:Math.round(total*100)/100,lines,issues,complete:issues.length===0};
}
g.SouthboundWaitCosts={estimate};
})(typeof window!=='undefined'?window:globalThis);
