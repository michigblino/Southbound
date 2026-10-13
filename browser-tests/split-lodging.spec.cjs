const {test,expect}=require('@playwright/test');
const field=(page,key)=>page.locator('#sb-bookings-editor [data-bk="'+key+'"]');

test('two confirmed hostels share a stop and only their own nights reprice the budget',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 const original=await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3'));
  const p=window.SouthboundItinerary.plan({stops:STOPS,start:m.tripStart,excluded:m.excluded,days:m.days,order:m.routeOrder,quotes:m.hostelQuotes,transportOffers:m.transportOffers,vol:m.vol,volunteerDetails:m.volunteerDetails});
  const item=p.items.find(x=>x.i===1);
  const middle=new Date(Date.parse(item.start+'T12:00:00Z')+2*86400000).toISOString().slice(0,10);
  return {start:item.start,middle,end:item.end,stay:item.stay,bed:item.bed};
 });
 const save=async(name,from,to,total,paid)=>{
  await page.locator('[data-view="bookings"]').click();
  await field(page,'type').selectOption('lodging');
  await field(page,'stageId').selectOption('1');
  await field(page,'startDate').fill(from);
  await field(page,'endDate').fill(to);
  await field(page,'status').selectOption('confirmed');
  await field(page,'title').fill(name);
  await field(page,'provider').fill('Test hostel');
  await field(page,'reference').fill('TEST-'+name);
  await field(page,'totalEUR').fill(String(total));
  await field(page,'paidEUR').fill(String(paid));
  page.once('dialog',d=>d.accept());
  await page.locator('[data-bk-save]').click();
 };
 await save('Hostel A',original.start,original.middle,35,10);
 await save('Hostel B',original.middle,original.end,45,20);
 const result=await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3'));
  const p=window.SouthboundItinerary.plan({stops:STOPS,start:m.tripStart,excluded:m.excluded,days:m.days,order:m.routeOrder,quotes:m.hostelQuotes,transportOffers:m.transportOffers,vol:m.vol,volunteerDetails:m.volunteerDetails});
  const ledger=window.SouthboundBookingLedger.reconcile({items:p.items,bookings:m.bookingLedger,vol:m.vol,volunteerDetails:m.volunteerDetails});
  return {count:m.bookingLedger.length,integrity:ledger.bookingIntegrity,stay:ledger.items.find(x=>x.i===1).stay,raw:p.items.find(x=>x.i===1).stay,bed:p.items.find(x=>x.i===1).bed,matched:ledger.matched.length,paid:ledger.extraPaid};
 });
 expect(result.count).toBe(2);
 expect(result.integrity).toBe(true);
 expect(result.stay).toBeCloseTo(result.raw-4*result.bed+80,2);
 expect(result.matched).toBe(2);
 expect(result.paid).toBe(30);
 await page.locator('[data-view="stages"]').click();
 const stage=page.locator('#sb-stage-1');
 if(!(await stage.evaluate(el=>el.open)))await stage.locator('summary').first().click();
 await expect(stage.locator('[data-stage-action="lodging"]')).toContainText('Bestätigt');
});

test('two overlapping hostel bookings remain saved but are flagged and do not overwrite costs',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3'));
  const a={id:'first',type:'lodging',status:'confirmed',stageId:1,title:'Hostel A',provider:'Test',startDate:'2026-12-31',endDate:'2027-01-03',totalEUR:50,paidEUR:5,refundedEUR:0,reference:'A'};
  const b={...a,id:'second',title:'Hostel B',startDate:'2027-01-01',endDate:'2027-01-04',reference:'B'};
  m.bookingLedger=[a,b];localStorage.setItem('southbound-v3',JSON.stringify(m));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await expect(page.locator('.sb-booking-card')).toHaveCount(2);
 await expect(page.locator('#sb-bookings-editor')).toHaveCount(1);
 const result=await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3'));
  const p=window.SouthboundItinerary.plan({stops:STOPS,start:m.tripStart,excluded:m.excluded,days:m.days,order:m.routeOrder});
  const ledger=window.SouthboundBookingLedger.reconcile({items:p.items,bookings:m.bookingLedger});
  return {ok:ledger.bookingIntegrity,warnings:ledger.warnings,raw:p.items[1].stay,after:ledger.items[1].stay};
 });
 expect(result.ok).toBe(false);
 expect(result.warnings.some(x=>x.reason==='overlapping-lodging-bookings')).toBe(true);
 expect(result.after).toBe(result.raw);
});
