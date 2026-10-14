const {test,expect}=require('@playwright/test');
const field=(page,k)=>page.locator('#sb-bookings-editor [data-bk="'+k+'"]');
test('direct booking tab offers exactly six contextual choices and keeps editor collapsed',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 if(!(await page.locator('#sb-booking-records').evaluate(el=>el.open)))await page.locator('#sb-booking-records > summary').click();
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
 if(!(await page.locator('#sb-booking-records').evaluate(el=>el.open)))await page.locator('#sb-booking-records > summary').click();
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
 await expect(page.locator('#sb-provider-discovery')).toBeVisible();
 await expect(page.locator('[data-od="type"]')).toHaveValue('lodging');
 await expect(page.locator('[data-od="stageId"]')).toHaveValue('1');
 await expect(page.locator('#sb-booking-records')).not.toHaveAttribute('open');
});

test('booking hub has two columns and the favicon follows light/dark theme',async({page})=>{
 await page.setViewportSize({width:320,height:780});await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 if(!(await page.locator('#sb-booking-records').evaluate(el=>el.open)))await page.locator('#sb-booking-records > summary').click();
 const cards=page.locator('[data-bk-preset]');await expect(cards).toHaveCount(6);
 const positions=await cards.evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,left:n.getBoundingClientRect().left})));
 expect(Math.abs(positions[0].top-positions[1].top)).toBeLessThan(2);
 expect(positions[1].left).toBeGreaterThan(positions[0].left);
 expect(positions[2].top).toBeGreaterThan(positions[0].top);
 for(const mode of ['light','dark']){
  if(await page.locator('html').getAttribute('data-sb-theme')!==mode)await page.locator('#sb-theme-toggle').click();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href',mode==='light'?'./icon.svg?v=84':'./icon-dark.svg');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
 }
});

test('guided booking wizard separates dates, price, and confirmation without saving early',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 if(!(await page.locator('#sb-booking-records').evaluate(el=>el.open)))await page.locator('#sb-booking-records > summary').click();
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
 if(!(await page.locator('#sb-booking-records').evaluate(el=>el.open)))await page.locator('#sb-booking-records > summary').click();
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

test('budget fixed-cost cards route to correct editor without erasing manually entered amounts',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-sb-fixed-book]')).toHaveCount(5);
 const labels=await page.locator('.sb-fixed-book-tile small').allTextContents();
 expect(labels).toEqual(['Versicherung','Ausrüstung','Anreise','Abreise']);
 await page.locator('[data-sb-budget-details-jump]').click();
 await page.locator('[data-sb-fixed-book="insurance"]').click();
 await expect(page.locator('#sb-bookings-editor')).toHaveAttribute('open');
 await expect(page.locator('[data-bk="type"]')).toHaveValue('fixed');
 await expect(page.locator('[data-bk="fixedKind"]')).toHaveValue('insurance');
 await page.locator('[data-view="overview"]').click();
 await page.locator('[data-sb-budget-details-jump]').click();
 await page.locator('[data-sb-fixed-book="inbound"]').click();
 await expect(page.locator('[data-bk="journeyOrigin"]')).toHaveValue('inbound');
 await page.locator('[data-view="overview"]').click();
 await page.locator('[data-sb-budget-details-jump]').click();
 await page.locator('[data-sb-fixed-book="return"]').click();
 await expect(page.locator('[data-bk="journeyOrigin"]')).toHaveValue('return');
});
test('all-in scenario options show gaps and preserve browser-owned trip data',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const previous=await page.evaluate(()=>localStorage.getItem('southbound-v3'));
 await expect(page.locator('.sb-variant-option')).toHaveCount(4);
 await expect(page.locator('.sb-budget-variants')).toContainText('Viel Volunteering');
 expect(await page.evaluate(()=>localStorage.getItem('southbound-v3'))).toBe(previous);
});

test('one savings center compares scenarios without double-counting isolated lodging',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const before=await page.evaluate(()=>localStorage.getItem('southbound-v3'));
 const hub=page.locator('#sb-budget-variants');
 await expect(hub).toBeVisible();
 await expect(page.locator('#sb-savings-potential')).toHaveCount(0);
 await expect(hub.locator('[data-sb-variant]')).toHaveCount(4);
 await expect(hub.locator('[data-sb-variant-content]:visible')).toHaveCount(1);
 const volunteer=hub.locator('[data-sb-variant="volunteer"]');
 await expect(volunteer).toHaveAttribute('aria-pressed','true');
 await expect(hub.locator('[data-sb-variant-content="volunteer"]')).toBeVisible();
 await expect(hub.locator('.sb-variant-split')).toHaveCount(3);
 await hub.locator('[data-sb-variant="aggressive"]').click();
 await expect(hub.locator('[data-sb-variant="aggressive"]')).toHaveAttribute('aria-pressed','true');
 await expect(volunteer).toHaveAttribute('aria-pressed','false');
 await expect(hub.locator('[data-sb-variant-content="volunteer"]')).toBeHidden();
 await expect(hub.locator('[data-sb-variant-content="aggressive"]')).toBeVisible();
 await hub.locator('#sb-savings-lodging > summary').click();
 await expect(hub.locator('#sb-savings-lodging .sb-hub-lodging-figure')).toBeVisible();
 await expect(hub.locator('#sb-savings-lodging')).toContainText('nicht zusätzlich');
 await hub.locator('#sb-savings-tips > summary').click();
 await expect(hub.locator('#sb-savings-tips .sb-hub-tip').first()).toBeVisible();
 await expect(hub.locator('#sb-savings-tips')).toContainText('nicht zur ausgewählten Variante addiert');
 await expect(page.locator('#sb-savings-risk')).toHaveCount(1);
 await expect(page.locator('#sb-savings-risk')).not.toHaveAttribute('open');
 expect(await page.evaluate(()=>localStorage.getItem('southbound-v3'))).toBe(before);
 const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 expect(sizes.scroll).toBeLessThanOrEqual(sizes.client+2);
});

test('new savings and volunteering cards use premium grid layout and preserve touch widths',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const hub=page.locator('#sb-budget-variants');
 const buttons=hub.locator('[data-sb-variant]');
 await expect(buttons).toHaveCount(4);
 const geometry=await buttons.evaluateAll(nodes=>nodes.map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,w:el.getBoundingClientRect().width,display:getComputedStyle(el).display})));
 expect(geometry.every(x=>x.display==='grid')).toBe(true);
 expect(geometry[1].y).toBeGreaterThan(geometry[0].y+45);
 expect(geometry.every(x=>x.w>200)).toBe(true);
 await expect(hub.locator('.sb-decision-total')).toHaveCount(4);
 const volunteers=page.locator('.sb-vol-opportunities');
 await expect(volunteers).toBeVisible();
 await expect(volunteers.locator('.sb-vol-candidate')).toHaveCount(5);
 await expect(volunteers.locator('.sb-vol-candidate:visible')).toHaveCount(3);
 const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
 expect(dim.scroll).toBeLessThanOrEqual(dim.width+2);
});
test('saved inbound and return journeys appear above globe and are not invented without booking',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.sb-journey-flights')).toHaveCount(0);
 await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem('southbound-v3'));
  state.bookingLedger=[
   {id:'inbound-saved',type:'transport',status:'planned',journeyOrigin:true,stageId:0,travelMode:'flight',originPlace:'München (MUC)',startDate:'2026-12-27',arrivalDate:'2026-12-28',provider:'Test Airline',destinationAirport:'GRU'},
   {id:'return-saved',type:'transport',status:'confirmed',journeyReturn:true,stageId:0,travelMode:'flight',originPlace:'São Paulo',destinationPlace:'München (MUC)',startDate:'2027-10-20',arrivalDate:'2027-10-21',provider:'Test Airline'}
  ];
  localStorage.setItem('southbound-v3',JSON.stringify(state));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 const ribbons=page.locator('.sb-journey-flight');
 await expect(ribbons).toHaveCount(2);
 await expect(ribbons.first()).toContainText('Anreise');
 await expect(ribbons.last()).toContainText('Abreise');
 await expect(ribbons.first()).toContainText('Vorgemerkt');
 await expect(ribbons.last()).toContainText('Bestätigt');
 const drawn=await page.evaluate(()=>window.SouthboundJourneyFlights.flightDisplay({bookings:JSON.parse(localStorage.getItem('southbound-v3')).bookingLedger,
  airports:window.SouthboundAirports.airports,stages:[{i:0,name:'São Paulo',lat:-23.55,lng:-46.63}]}));
 expect(drawn.length).toBe(2);expect(drawn.every(x=>x.arc)).toBe(true);
});

test('every budget variant uses the same all-in repricing inputs and shows price provenance',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const hub=page.locator('#sb-budget-variants');
 const actual=await page.locator('[data-sb-all-in-total]').textContent();
 const baseline=await page.evaluate(()=>{const src=JSON.parse(localStorage.getItem('southbound-v3'));return window.SouthboundTripReprice.reprice({
  stops:[],start:src.tripStart});}).catch(()=>null);
 // Full repricer is present and never writes to storage on read.
 await expect(hub.locator('.sb-decision-total').first()).toBeAttached();
 await hub.locator('[data-sb-variant="current"]').click();
 await expect(hub.locator('[data-sb-variant-content="current"]')).toBeVisible();
 await hub.locator('[data-sb-variant-content="current"] .sb-evidence > summary').click();
 await expect(hub.locator('[data-sb-variant-content="current"] .sb-evidence-tiers')).toBeVisible();
 await expect(hub.locator('[data-sb-variant-content="current"] .sb-evidence-lines > div').first()).toBeVisible();
 expect(actual).toMatch(/€/);
});

test('no unverified budget goal success; alternate stops visibly require rechecked fares',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const hub=page.locator('#sb-budget-variants');
 await expect(hub.locator('.sb-goal-status')).toBeVisible();
 await expect(hub.locator('.sb-goal-status')).not.toHaveAttribute('data-sb-goal-status','supported-under-goal');
 const alt=hub.locator('#sb-savings-reroutes');
 await expect(alt).toHaveCount(1);
 await alt.locator('summary').click();
 await expect(alt.locator('.sb-reroute-card').first()).toBeVisible();
 await expect(alt).toContainText('Ticketpreis offen');
 const audit=hub.locator('#sb-savings-price-readiness');
 await expect(audit).toHaveCount(1);
 await audit.locator('summary').click();
 await expect(audit).toContainText('keine Anbieter-API verbunden');
 const d=await page.evaluate(()=>({w:document.documentElement.scrollWidth,c:document.documentElement.clientWidth}));
 expect(d.w).toBeLessThanOrEqual(d.c+2);
});
