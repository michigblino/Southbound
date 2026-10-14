const {test,expect}=require('@playwright/test');

test('stage-specific booking links work without provider access and do not create fake quotes',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 const panel=page.locator('#sb-provider-discovery');
 await expect(panel).toBeVisible();
 await expect(panel).toContainText('noch kein Live-Preispartner verbunden');
 const rows=panel.locator('[data-od="stageId"] option');
 expect(await rows.count()).toBeGreaterThan(1);
 await panel.locator('[data-od="type"]').selectOption('lodging');
 const link=panel.locator('.oq-discovery-links a').first();
 await expect(link).toHaveAttribute('href',/booking\.com\/searchresults\.html\?ss=/);
 const url=new URL(await link.getAttribute('href'));
 const selected=await panel.locator('[data-od="stageId"] option:checked').textContent();
 expect(url.searchParams.get('ss')).toBeTruthy();
 expect(selected).toContain(url.searchParams.get('ss'));
 await page.route('**/api/offers/v1/search',route=>route.fulfill({status:404,body:'Not configured'}));
 const stateBefore=await page.evaluate(()=>{
  const v=JSON.parse(localStorage.getItem('southbound-v3')||'{}');
  return {bookings:v.bookingLedger||[],notes:v.offerWatchlist||[]};
 });
 await panel.locator('[data-od-search]').click();
 await expect(panel.locator('[data-od-results]')).toContainText('Noch keine Anbieter-API');
 await expect(panel.locator('.oq-discovery-card')).toHaveCount(0);
 const stateAfter=await page.evaluate(()=>{
  const v=JSON.parse(localStorage.getItem('southbound-v3')||'{}');
  return {bookings:v.bookingLedger||[],notes:v.offerWatchlist||[]};
 });
 expect(stateAfter).toEqual(stateBefore);
});

test('changing transfer origin follows itinerary; does not claim complete transport coverage',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 const panel=page.locator('#sb-provider-discovery');
 await panel.locator('[data-od="type"]').selectOption('transport');
 await expect(panel.locator('.oq-discovery-links')).toContainText('Busbud');
 await expect(panel.locator('.oq-discovery-links')).toContainText('Omio');
 await panel.locator('[data-od="stageId"]').selectOption({index:0});
 await expect(panel.locator('[data-od-search]')).toBeDisabled();
 await expect(panel.locator('[data-od-context]')).toContainText('Flugeditor');
});

test('discovery layout remains inside 360px Android viewport',async({page})=>{
 await page.setViewportSize({width:360,height:760});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await expect(page.locator('#sb-provider-discovery')).toBeVisible();
 const dims=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
 expect(dims.content).toBeLessThanOrEqual(dims.viewport+2);
});
