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
