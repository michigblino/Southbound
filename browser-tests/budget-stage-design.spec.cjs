const {test,expect}=require('@playwright/test');
test('home budget displays key decision information before accounting inputs',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const hero=page.locator('.sb-overview-hero');
 const budget=page.locator('.sb-budget-summary');
 const details=page.locator('#sb-budget-details');
 await expect(hero).toBeVisible();
 await expect(budget).toBeVisible();
 await expect(page.locator('[data-sb-all-in-total]')).toBeVisible();
 await expect(details).not.toHaveAttribute('open');
 const order=await page.evaluate(()=>({
  hero:document.querySelector('.sb-overview-hero').getBoundingClientRect().top,
  budget:document.querySelector('.sb-budget-summary').getBoundingClientRect().top,
  details:document.querySelector('#sb-budget-details').getBoundingClientRect().top,
  preferences:document.querySelector('#sb-travel-settings').getBoundingClientRect().top,
  docWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth
 }));
 expect(order.hero).toBeLessThan(order.budget);
 expect(order.budget).toBeLessThan(order.details);
 expect(order.details).toBeLessThan(order.preferences);
 expect(order.docWidth).toBeLessThanOrEqual(order.viewport+2);
 await budget.locator('[data-sb-budget-details-jump]').click();
 await expect(details).toHaveAttribute('open');
 await expect(details.locator('.sb-fixed-book-grid')).toBeVisible();
 await expect(details.locator('[data-sb-fixed="insurance"]')).toBeHidden();
 await details.locator('.sb-fixed-manual > summary').click();
 await expect(details.locator('[data-sb-fixed="insurance"]')).toBeVisible();
});
test('modern stages show card photograph, dates and honest transfer status',async({page})=>{
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-view="stages"]').click();
  const stage=page.locator('#sb-stage-0');
  await expect(stage).toBeVisible();
  const optimizer=page.locator('#sb-route-optimizer');
  await expect(optimizer).not.toHaveAttribute('open');
  const positions=await page.evaluate(()=>({
   heading:document.querySelector('.sb-route-heading').getBoundingClientRect().top,
   stage:document.querySelector('#sb-stage-0').getBoundingClientRect().top,
   optimizer:document.querySelector('#sb-route-optimizer').getBoundingClientRect().top
  }));
  expect(positions.heading).toBeLessThan(positions.stage);
  expect(positions.stage).toBeLessThan(positions.optimizer);
  await expect(stage.locator('.sb-stage-cover img')).toHaveCount(1);
  await expect(stage.locator('.sb-stage-index')).toContainText('ETAPPE 1');
  await expect(stage.locator('.sb-stage-total')).toBeVisible();
  await expect(stage.locator('.sb-stage-dates')).toContainText('Ankunft');
  const dims=await page.evaluate(()=>({width:document.documentElement.scrollWidth,
   available:document.documentElement.clientWidth,card:document.querySelector('#sb-stage-0').getBoundingClientRect().width}));
  expect(dims.width,JSON.stringify(dims)).toBeLessThanOrEqual(dims.available+2);
  expect(dims.card).toBeLessThanOrEqual(dims.available);
  await stage.locator('summary').first().click();
  await expect(stage).toHaveAttribute('open');
  await expect(stage.locator('[data-stage-action="transport"]')).toBeVisible();
  await page.locator('[data-sb-route-optimizer-jump]').click();
  await expect(optimizer).toHaveAttribute('open');
 }
});
test('budget data and route order do not change when opening design disclosures',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.sb-overview-hero')).toBeVisible();
 const before=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('southbound-v3')||'{}')));
 await page.locator('[data-sb-budget-details-jump]').click();
 await page.locator('#sb-budget-details > summary').click();
 await page.locator('#sb-travel-settings summary').click();
 await page.locator('#sb-travel-settings summary').click();
 const after=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('southbound-v3')||'{}')));
 expect(after).toBe(before);
});
