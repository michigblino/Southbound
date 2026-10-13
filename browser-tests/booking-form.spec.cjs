const {test,expect}=require('@playwright/test');
const field=(page,key)=>page.locator('#sb-bookings-editor [data-bk="'+key+'"]');

test('form only shows the fields relevant to the selected booking category',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await page.locator('#sb-bookings-editor > summary').click();
 await expect(field(page,'fromStageId')).toBeVisible();
 await expect(field(page,'endDate')).toBeHidden();
 await expect(field(page,'activityMode')).toBeHidden();
 await field(page,'type').selectOption('lodging');
 await expect(field(page,'fromStageId')).toBeHidden();
 await expect(field(page,'endDate')).toBeVisible();
 await expect(field(page,'activityMode')).toBeHidden();
 await expect(page.locator('[data-bk-caption="startDate"]')).toHaveText('Check-in');
 await expect(page.locator('[data-bk-caption="endDate"]')).toHaveText('Check-out');
 await field(page,'type').selectOption('volunteering');
 await expect(field(page,'endDate')).toBeVisible();
 await expect(field(page,'fromStageId')).toBeHidden();
 await expect(page.locator('[data-bk-context]')).toContainText('separat erfasste Host-Zusage');
 await field(page,'type').selectOption('activity');
 await expect(field(page,'activityMode')).toBeVisible();
 await expect(field(page,'endDate')).toBeHidden();
 await expect(field(page,'fromStageId')).toBeHidden();
 await expect(page.locator('[data-bk-caption="startDate"]')).toHaveText('Datum des Erlebnisses');
});

test('switching to lodging does not save hidden transport or activity-specific values',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await page.locator('#sb-bookings-editor > summary').click();
 await field(page,'type').selectOption('transport');
 await field(page,'stageId').selectOption('1');
 await expect(field(page,'fromStageId')).toHaveValue('0');
 await field(page,'type').selectOption('activity');
 await field(page,'activityMode').selectOption('extra');
 await field(page,'type').selectOption('lodging');
 const checkout=await field(page,'endDate').inputValue();
 expect(checkout).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 await field(page,'title').fill('Test Hostel');
 await field(page,'provider').fill('Hostel Testanbieter');
 await field(page,'totalEUR').fill('65');
 await page.locator('[data-bk-save]').click();
 const entries=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')).bookingLedger);
 expect(entries).toHaveLength(1);
 expect(entries[0]).toMatchObject({type:'lodging',stageId:1,fromStageId:null,activityMode:'allowance',totalEUR:65});
 expect(entries[0].endDate).toBe(checkout);
 await page.locator('[data-bk-edit]').first().click();
 await expect(field(page,'endDate')).toBeVisible();
 await expect(field(page,'fromStageId')).toBeHidden();
 await expect(field(page,'title')).toHaveValue('Test Hostel');
});

test('stage booking shortcut keeps category and stage-specific inputs',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="stages"]').click();
 await page.locator('#sb-stage-1 summary').first().click();
 await page.locator('#sb-stage-1 [data-stage-action="activity"]').click();
 await expect(field(page,'type')).toHaveValue('activity');
 await expect(field(page,'stageId')).toHaveValue('1');
 await expect(field(page,'activityMode')).toBeVisible();
 await expect(field(page,'fromStageId')).toBeHidden();
 await expect(field(page,'endDate')).toBeHidden();
});

test('contextual booking form fits 360px mobile width',async({page})=>{
 await page.setViewportSize({width:360,height:740});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-view="bookings"]').click();
 await page.locator('#sb-bookings-editor > summary').click();
 await field(page,'type').selectOption('volunteering');
 await expect(field(page,'endDate')).toBeVisible();
 const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
 expect(size.scroll,JSON.stringify(size)).toBeLessThanOrEqual(size.width+2);
});
