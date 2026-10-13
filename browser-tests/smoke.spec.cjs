const {test,expect}=require('@playwright/test');
test('Southbound loads without fatal page errors and retains storage key',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await expect(page).toHaveTitle(/Southbound/);
 await expect(page.locator('body')).toContainText(/Southbound/i);
 await expect.poll(()=>page.evaluate(()=>typeof window.SouthboundRouteBudget?.snapshot)).toBe('function');
 await expect.poll(()=>page.evaluate(()=>typeof window.SouthboundVolunteerEconomics?.estimate)).toBe('function');
 expect(errors).toEqual([]);
});
test('reload preserves user-owned local storage without reset',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 const key='southbound-qa-marker';
 await page.evaluate(([k,v])=>localStorage.setItem(k,v),[key,'persisted']);
 await page.reload({waitUntil:'domcontentloaded'});
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe('persisted');
 await page.evaluate(k=>localStorage.removeItem(k),key);
});
test('mobile viewport renders app without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await expect(page.locator('body')).toBeVisible();
 const metrics=await page.evaluate(()=>{const width=document.documentElement.clientWidth;const offenders=[...document.querySelectorAll('body *')].map(el=>({el,rect:el.getBoundingClientRect()})).filter(({el,rect})=>{const css=getComputedStyle(el);return css.display!=='none'&&css.visibility!=='hidden'&&rect.width>0&&(rect.right>width+2||rect.left< -2)}).slice(0,15).map(({el,rect})=>({tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className.slice(0,100):'',left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}));return {scroll:document.documentElement.scrollWidth,width,offenders}});
 expect(metrics.scroll,JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.width+2);
});


test('confirmed host is saved with fees and may be revoked without erasing details',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-0 summary').click();
 await page.locator('#sb-stage-0 [data-vol-confirm="0"]').click();
 await page.locator('#sb-vol-host').fill('Regression test host');
 await page.locator('#sb-vol-from').fill('2027-01-02');
 await page.locator('#sb-vol-to').fill('2027-01-05');
 await page.locator('#sb-vol-night').fill('0');
 await page.locator('#sb-vol-hours').fill('25');
 await page.locator('#sb-vol-food').fill('0');
 await page.locator('#sb-vol-extra').fill('35');
 await page.locator('#sb-vol-save').click();
 let host=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).volunteerDetails[0]);
 expect(host).toMatchObject({confirmed:true,extraCosts:35,hoursPerWeek:25,night:0});
 await expect(page.locator('#sb-stage-0 summary')).toContainText('Host ab');
 const stage=page.locator('#sb-stage-0');
 if(!(await stage.evaluate(el=>el.open)))await stage.locator('summary').click();
 await stage.locator('[data-vol-confirm="0"]').click();
 await expect(page.locator('#sb-vol-revoke')).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#sb-vol-revoke').click();
 host=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).volunteerDetails[0]);
 expect(host.confirmed).toBe(false);
 expect(host.extraCosts).toBe(35);
});
test('ticket save binds route/date and retains old record after trip date changes',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="stages"]').click();
 await page.locator('.sb-link details').first().locator('summary').click();
 await page.locator('[data-ticket-price="1"]').fill('42');
 await page.locator('[data-ticket-operator="1"]').fill('Test Bus');
 await page.locator('[data-ticket-url="1"]').fill('https://example.com/ticket');
 await page.locator('[data-ticket-date="1"]').fill('2026-12-31');
 await page.locator('[data-ticket-checked="1"]').fill('2026-10-12');
 await page.locator('[data-ticket-save="1"]').click();
 let record=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).transportOffers[1]);
 expect(record).toMatchObject({fromId:0,toId:1,price:42,departureDate:'2026-12-31'});
 await page.locator('#sb-trip-start').fill('2027-01-10');
 await page.locator('#sb-trip-start').press('Tab');
 const output=await page.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem('southbound-v3'));
   const p=window.SouthboundItinerary.plan({stops:STOPS,start:s.tripStart,transportOffers:s.transportOffers,days:s.days||{},order:s.routeOrder||[],excluded:s.excluded||{}});
   return {stored:s.transportOffers[1],tripStart:s.tripStart,accepted:p.items.find(x=>x.i===1)?.transportOffer};
 });
 expect(output.tripStart).toBe('2027-01-10');
 expect(output.stored.price).toBe(42);
 expect(output.accepted).toBeNull();
});


test('booking center persists a confirmed transfer, adjusts itinerary and handles refund',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="bookings"]').click();
 await page.locator('#sb-bookings-editor summary').click();
 await expect(page.locator('#sb-bookings-editor')).toBeVisible();
 const field=k=>page.locator('[data-bk="'+k+'"]');
 await field('type').selectOption('transport');
 await field('status').selectOption('confirmed');
 await field('stageId').selectOption('1');
 await field('title').fill('Bus Test A → B');
 await field('provider').fill('Test Operator');
 await field('reference').fill('TEST-123');
 await field('totalEUR').fill('42');
 await field('paidEUR').fill('12');
 expect(await field('startDate').inputValue()).toBe('2026-12-31');
 expect(await field('fromStageId').inputValue()).toBe('0');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('[data-bk-save]').click();
 await expect(page.locator('.sb-booking-card')).toContainText('Bus Test A');
 const snap=await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3'));
  const p=window.SouthboundItinerary.plan({stops:STOPS,start:m.tripStart,fx:Number(m.fx?.usdEur)||0,quotes:m.hostelQuotes,transportOffers:m.transportOffers,vol:m.vol,volunteerDetails:m.volunteerDetails,excluded:m.excluded,days:m.days,order:m.routeOrder});
  const r=window.SouthboundBookingLedger.reconcile({items:p.items,bookings:m.bookingLedger,vol:m.vol,volunteerDetails:m.volunteerDetails});
  return {bookings:m.bookingLedger.length,booking:m.bookingLedger[0],leg:r.items.find(x=>x.i===1).leg,extraPaid:r.extraPaid,payment:r.paidByStop[1]};
 });
 expect(snap.bookings).toBe(1);
 expect(snap.booking.status).toBe('confirmed');
 expect(snap.leg).toBe(42);expect(snap.extraPaid).toBe(12);expect(snap.payment).toBe(12);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await expect(page.locator('.sb-booking-card')).toContainText('Bus Test A');
 await page.locator('[data-bk-edit]').first().click();
 await field('status').selectOption('cancelled');
 await field('refundedEUR').fill('8');
 await page.locator('[data-bk-save]').click();
 const after=await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3'));
  const p=window.SouthboundItinerary.plan({stops:STOPS,start:m.tripStart,transportOffers:m.transportOffers,days:m.days,order:m.routeOrder,excluded:m.excluded});
  const r=window.SouthboundBookingLedger.reconcile({items:p.items,bookings:m.bookingLedger});
  return {booking:m.bookingLedger[0],leg:r.items[1].leg,original:p.items[1].leg,paid:r.extraPaid,integrity:r.bookingIntegrity};
 });
 expect(after.booking.status).toBe('cancelled');expect(after.booking.refundedEUR).toBe(8);
 expect(after.leg).toBe(after.original);expect(after.paid).toBe(4);
 expect(after.integrity).toBe(true);expect(errors).toEqual([]);
});
test('above-preference volunteering is confirmable after a warning',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-0 summary').click();
 await page.locator('#sb-stage-0 [data-vol-confirm="0"]').click();
 await page.locator('#sb-vol-host').fill('Host 35h');
 await page.locator('#sb-vol-from').fill('2027-01-02');
 await page.locator('#sb-vol-to').fill('2027-01-05');
 await page.locator('#sb-vol-night').fill('0');
 await page.locator('#sb-vol-hours').fill('35');
 await page.locator('#sb-vol-food').fill('0');
 await page.locator('#sb-vol-extra').fill('0');
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('über deinem Wunschlimit');dialog.accept()});
 await page.locator('#sb-vol-save').click();
 const hours=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).volunteerDetails[0].hoursPerWeek);
 expect(hours).toBe(35);
});
test('booking center fits mobile viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="bookings"]').click();
 const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 expect(width.scroll).toBeLessThanOrEqual(width.client+2);
});


test('stage shortcut opens booking editor with correct stop and deletion needs confirmation',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-2 summary').click();
 await page.locator('#sb-stage-2 [data-open-booking="2"]').click();
 await expect(page.locator('[data-view="bookings"].active')).toBeVisible();
 await expect(page.locator('[data-bk="stageId"]')).toHaveValue('2');
 await page.locator('[data-bk="title"]').fill('Test booking');
 await page.locator('[data-bk="provider"]').fill('Test provider');
 await page.locator('[data-bk-save]').click();
 await page.locator('[data-bk-edit]').first().click();
 await expect(page.locator('[data-bk-delete]')).toBeVisible();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('[data-bk-delete]').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).bookingLedger.length)).toBe(1);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('[data-bk-delete]').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).bookingLedger.length)).toBe(0);
});
test('deleting a paid booking warns that its payment history would be lost',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="bookings"]').click();
 await page.locator('#sb-bookings-editor summary').click();
 await page.locator('[data-bk="title"]').fill('Deposit');
 await page.locator('[data-bk="provider"]').fill('Test provider');
 await page.locator('[data-bk="paidEUR"]').fill('25');
 await page.locator('[data-bk-save]').click();
 await page.locator('[data-bk-edit]').first().click();
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('25');dialog.dismiss()});
 await page.locator('[data-bk-delete]').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).bookingLedger.length)).toBe(1);
});

test('stage card opens the correct lodging booking editor and reflects confirmation',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-1 summary').first().click();
 const row=page.locator('#sb-stage-1 [data-stage-action="lodging"]');
 await expect(row).toContainText('Offen');
 await expect(page.locator('#sb-stage-1 [data-stage-action="transport"]')).toBeVisible();
 await expect(page.locator('#sb-stage-1 .sb-stage-dashboard__row')).toHaveCount(4);
 await row.click();
 await expect(page.locator('#sb-bookings-editor')).toBeVisible();
 const field=k=>page.locator('#sb-bookings-editor [data-bk="'+k+'"]');
 expect(await field('type').inputValue()).toBe('lodging');
 expect(await field('stageId').inputValue()).toBe('1');
 expect(await field('startDate').inputValue()).toBe('2026-12-31');
 await field('status').selectOption('confirmed');
 await field('title').fill('Hostel Booking Regression');
 await field('provider').fill('Example Hostel');
 await field('reference').fill('HOSTEL-123');
 await field('totalEUR').fill('75');
 await field('paidEUR').fill('20');
 page.once('dialog',d=>d.accept());
 await page.locator('[data-bk-save]').click();
 await page.locator('[data-view="stages"]').click();
 const stage=page.locator('#sb-stage-1');
 if(!(await stage.evaluate(el=>el.open)))await stage.locator('summary').first().click();
 await expect(stage.locator('[data-stage-action="lodging"]')).toContainText('Bestätigt');
 await stage.locator('[data-stage-action="lodging"]').click();
 await expect(field('title')).toHaveValue('Hostel Booking Regression');
 await expect(field('paidEUR')).toHaveValue('20');
});
test('stage card warns when a confirmed booking no longer matches its travel date',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3')||'{}');
  m.bookingLedger=[{id:'mismatch',type:'transport',status:'confirmed',stageId:1,fromStageId:0,title:'Altes Busticket',provider:'Bus Beispiel',startDate:'2027-03-01',endDate:'',totalEUR:42,paidEUR:42,refundedEUR:0,reference:'AB123',recordedElsewhere:false}];
  localStorage.setItem('southbound-v3',JSON.stringify(m));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-1 summary').first().click();
 await expect(page.locator('#sb-stage-1 [data-stage-action="transport"]')).toContainText('Prüfen');
});
test('stage action cards do not overflow a 360px mobile viewport',async({page})=>{
 await page.setViewportSize({width:360,height:740});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-1 summary').first().click();
 const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,card:document.querySelector('#sb-stage-1 .sb-stage-dashboard')?.getBoundingClientRect().width}));
 expect(sizes.card).toBeGreaterThan(0);
 expect(sizes.scroll,JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.width+2);
});
