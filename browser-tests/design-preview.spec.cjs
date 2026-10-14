const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
test('capture isolated 390px light and dark Southbound UI for physical Android review',async({page})=>{
 const output=path.join('test-results','design-preview');fs.mkdirSync(output,{recursive:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#sb-theme-toggle')).toBeVisible();
 for(const mode of ['light','dark']){
  if(await page.locator('html').getAttribute('data-sb-theme')!==mode)
    await page.locator('#sb-theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-sb-theme',mode);
  await expect(page.locator('#sb2 .topnav button')).toHaveCount(4);
  for(const section of ['overview','stages','bookings']){
   await page.locator('[data-view="'+section+'"]').click();
   if(section==='bookings'){await expect(page.locator('#sb-provider-discovery')).toBeVisible();await expect(page.locator('#sb-booking-records')).not.toHaveAttribute('open');}
   await page.locator('#sb2 .topnav').screenshot({path:path.join(output,section+'-'+mode+'-nav.png'),animations:'disabled'});
   await page.screenshot({path:path.join(output,section+'-'+mode+'.png'),animations:'disabled'});
  }
 }
});
