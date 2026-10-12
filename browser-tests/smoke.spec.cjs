const {test,expect}=require('@playwright/test');
test('Southbound loads without fatal page errors and retains storage key',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page).toHaveTitle(/Southbound/);
 await expect(page.locator('body')).toContainText(/Southbound/i);
 await expect.poll(()=>page.evaluate(()=>typeof window.SouthboundRouteBudget?.snapshot)).toBe('function');
 await expect.poll(()=>page.evaluate(()=>typeof window.SouthboundVolunteerEconomics?.estimate)).toBe('function');
 expect(errors).toEqual([]);
});
test('reload preserves user-owned local storage without reset',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const key='southbound-qa-marker';
 await page.evaluate(([k,v])=>localStorage.setItem(k,v),[key,'persisted']);
 await page.reload({waitUntil:'domcontentloaded'});
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe('persisted');
 await page.evaluate(k=>localStorage.removeItem(k),key);
});
test('mobile viewport renders app without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).toBeVisible();
 const metrics=await page.evaluate(()=>{const width=document.documentElement.clientWidth;const offenders=[...document.querySelectorAll('body *')].map(el=>({el,rect:el.getBoundingClientRect()})).filter(({el,rect})=>{const css=getComputedStyle(el);return css.display!=='none'&&css.visibility!=='hidden'&&rect.width>0&&(rect.right>width+2||rect.left< -2)}).slice(0,15).map(({el,rect})=>({tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className.slice(0,100):'',left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}));return {scroll:document.documentElement.scrollWidth,width,offenders}});
 expect(metrics.scroll,JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.width+2);
});


test('confirmed host is saved with fees and may be revoked without erasing details',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
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
