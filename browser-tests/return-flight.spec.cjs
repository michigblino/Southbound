const {test,expect}=require('@playwright/test');
const field=(page,k)=>page.locator('#sb-bookings-editor [data-bk="'+k+'"]');
test('direct booking tab offers exactly six contextual choices and keeps editor collapsed',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await expect(page.locator('[data-bk-preset]')).toHaveCount(6);
 await expect(page.locator('[data-bk-preset="return"]')).toBeVisible();await expect(page.locator('[data-bk-preset="return"]')).toContainText('Rückflug');
 await expect(page.locator('[data-bk-preset="inbound"]')).toBeVisible();
 await expect(page.locator('#sb-bookings-editor')).not.toHaveAttribute('open');
 await page.locator('[data-bk-preset="return"]').click();await page.locator('[data-bk-all]').click();
 await expect(page.locator('#sb-bookings-editor')).toHaveAttribute('open');
 await expect(field(page,'journeyOrigin')).toHaveValue('return');
 await expect(field(page,'travelMode')).toHaveValue('flight');
 await expect(field(page,'destinationPlace')).toHaveValue('München (MUC)');
 await expect(field(page,'fromStageId')).toBeHidden();
 const widths=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,expected:document.documentElement.clientWidth}));
 expect(widths.actual,JSON.stringify(widths)).toBeLessThanOrEqual(widths.expected+2);
});
test('return flight can be saved with a layover, edited and reconciled without counting twice',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await page.locator('[data-bk-preset="return"]').click();await page.locator('[data-bk-all]').click();
 const date=await field(page,'startDate').inputValue();
 expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 await field(page,'arrivalDate').fill(date);
 await field(page,'status').selectOption('confirmed');
 await field(page,'title').fill('Rückflug mit Zwischenstopp');
 await field(page,'provider').fill('Testfluggesellschaft');
 await field(page,'reference').fill('RETURN-TEST');
 await field(page,'totalEUR').fill('550');
 await field(page,'paidEUR').fill('200');
 await page.locator('[data-bk-add-stopover]').click();
 const stop=page.locator('[data-bk-layover-row]').first();
 await stop.locator('[data-bk-layover-place]').fill('Casablanca (CMN)');
 await stop.locator('[data-bk-layover-arrival]').fill(date);
 await stop.locator('[data-bk-layover-departure]').fill(date);
 await stop.locator('[data-bk-layover-overnight]').selectOption('included');
 page.once('dialog',d=>d.accept());
 await page.locator('[data-bk-save]').click();
 await expect(page.locator('[data-bk-group="return"]')).toContainText('Rückflug');
 const snap=await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3'));
  const p=window.SouthboundItinerary.plan({stops:STOPS,start:m.tripStart,days:m.days,order:m.routeOrder,excluded:m.excluded});
  const ledger=window.SouthboundBookingLedger.reconcile({items:p.items,bookings:m.bookingLedger});
  const result=window.SouthboundRouteBudget.snapshot({
   items:ledger.items,paid:ledger.extraPaid,fixedCosts:{return:ledger.returnBooking.totalEUR,insurance:0,visas:0,equipment:0},
   returnPaymentEUR:ledger.returnPaymentEUR,waitingCost:0,paidByStop:ledger.accountedPaidByStop,
   paymentAllocationsByStop:ledger.typedPaidByStop});
  return {b:m.bookingLedger[0],r:ledger.returnBooking,paid:ledger.returnPaymentEUR,
    returnLine:result.lines.find(x=>x.label==='Rückreise').amount};
 });
 expect(snap.b.journeyReturn).toBe(true);
 expect(snap.b.stopovers[0].place).toBe('Casablanca (CMN)');
 expect(snap.r.totalEUR).toBe(550);
 expect(snap.paid).toBe(200);
 expect(snap.returnLine).toBe(350);
 await page.locator('[data-bk-edit]').first().click();
 await expect(field(page,'journeyOrigin')).toHaveValue('return');
 await expect(field(page,'destinationPlace')).toHaveValue('München (MUC)');
 await expect(page.locator('[data-bk-layover-row]')).toHaveCount(1);
});
test('coming from an itinerary stage bypasses category chooser and opens matching editor',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-1 summary').first().click();
 await page.locator('#sb-stage-1 [data-stage-action="lodging"]').click();
 await expect(page.locator('[data-bk-preset]')).toHaveCount(0);
 await expect(page.locator('#sb-bookings-editor')).toHaveAttribute('open');
 await expect(field(page,'type')).toHaveValue('lodging');
 await expect(field(page,'stageId')).toHaveValue('1');
});

test('booking hub has two columns and the favicon follows light/dark theme',async({page})=>{
 await page.setViewportSize({width:320,height:780});await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 const cards=page.locator('[data-bk-preset]');await expect(cards).toHaveCount(6);
 const positions=await cards.evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,left:n.getBoundingClientRect().left})));
 expect(Math.abs(positions[0].top-positions[1].top)).toBeLessThan(2);
 expect(positions[1].left).toBeGreaterThan(positions[0].left);
 expect(positions[2].top).toBeGreaterThan(positions[0].top);
 for(const mode of ['light','dark']){
  if(await page.locator('html').getAttribute('data-sb-theme')!==mode)await page.locator('#sb-theme-toggle').click();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href',mode==='light'?'./icon.svg':'./icon-dark.svg');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
 }
});

test('guided booking wizard separates dates, price, and confirmation without saving early',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await page.locator('[data-bk-preset="inbound"]').click();
 const editor=page.locator('#sb-bookings-editor');
 await expect(editor).toHaveAttribute('data-bk-guided','true');
 await expect(page.locator('[data-bk="startDate"]')).toBeVisible();
 await expect(page.locator('[data-bk="totalEUR"]')).toBeHidden();
 await expect(page.locator('[data-bk-save]')).toBeHidden();
 await page.locator('[data-bk-next]').click();
 await expect(page.locator('[data-bk="totalEUR"]')).toBeVisible();
 await expect(page.locator('[data-bk="status"]')).toBeHidden();
 await page.locator('[data-bk-next]').click();
 await expect(page.locator('[data-bk="status"]')).toBeVisible();
 await expect(page.locator('[data-bk="reference"]')).toBeVisible();
 await expect(page.locator('[data-bk-save]')).toBeVisible();
 await page.locator('[data-bk-prev]').click();
 await expect(page.locator('[data-bk="totalEUR"]')).toBeVisible();
 await page.locator('[data-bk-all]').click();
 await expect(editor).toHaveAttribute('data-bk-guided','false');
 await expect(page.locator('[data-bk="startDate"]')).toBeVisible();
 await expect(page.locator('[data-bk="totalEUR"]')).toBeVisible();
 await expect(page.locator('[data-bk="status"]')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).bookingLedger.length)).toBe(0);
});

test('guided inbound booking saves a real local record only after the confirmation step',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await page.locator('[data-bk-preset="inbound"]').click();
 const k=name=>page.locator('#sb-bookings-editor [data-bk="'+name+'"]');
 await k('startDate').fill('2026-12-26');
 await k('provider').fill('Test provider');
 await k('title').fill('Guided MUC → GRU');
 await page.locator('[data-bk-next]').click();
 await k('totalEUR').fill('200');
 await page.locator('[data-bk-next]').click();
 await k('status').selectOption('confirmed');
 await k('reference').fill('GUIDED-2026');
 page.once('dialog',d=>d.accept());
 await page.locator('[data-bk-save]').click();
 await expect(page.locator('[data-bk-group="inbound"]')).toContainText('Guided MUC');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).bookingLedger);
 expect(saved).toHaveLength(1);expect(saved[0].journeyOrigin).toBe(true);
 expect(saved[0].totalEUR).toBe(200);
});
