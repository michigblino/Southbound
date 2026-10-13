const {test,expect}=require('@playwright/test');
const ACCENT={light:{primary:'#336B87',background:'#E4EFF5'},dark:{primary:'#763626',background:'#2A3132'}};
async function mode(page,next){
 if(await page.locator('html').getAttribute('data-sb-theme')!==next){
  await page.locator('#sb-theme-toggle').click();
 }
 await expect(page.locator('html')).toHaveAttribute('data-sb-theme',next);
 await expect.poll(async()=>page.locator('#sb2 .sb-overview-hero').evaluate(x=>
   Number(getComputedStyle(x,'::after').opacity)),{timeout:2500}).toBe(next==='light'?0:1);
}
test('the four requested brand swatches power actual UI tokens, not an unrelated mockup',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#sb-theme-toggle')).toBeVisible();
 for(const selected of ['light','dark']){
  await mode(page,selected);
  const computed=await page.evaluate(()=>{
   const sheet=getComputedStyle(document.documentElement);
   const surface=document.querySelector('.sb-budget-summary');
   const nav=document.querySelector('#sb2 .topnav');
   return {
    mist:sheet.getPropertyValue('--sb-mist').trim(),
    stone:sheet.getPropertyValue('--sb-stone').trim(),
    shadow:sheet.getPropertyValue('--sb-shadow-color').trim(),
    autumn:sheet.getPropertyValue('--sb-autumn').trim(),
    accent:sheet.getPropertyValue('--accent').trim(),
    bg:sheet.getPropertyValue('--bg').trim(),
    glass:getComputedStyle(surface).backdropFilter,
    navGlass:getComputedStyle(nav).backdropFilter,
    heroWoodcut:getComputedStyle(document.querySelector('.sb-overview-hero'),'::before').backgroundImage,
    woodcutOpacity:Number(getComputedStyle(document.querySelector('.sb-overview-hero'),'::before').opacity),
    visibleIcon:Number(getComputedStyle(document.querySelector('.sb-brand-icon--'+selected)).opacity),
    hiddenIcon:Number(getComputedStyle(document.querySelector('.sb-brand-icon--'+(selected==='light'?'dark':'light'))).opacity)
   };
  });
  expect(computed.mist).toBe('#90AFC5');expect(computed.stone).toBe('#336B87');
  expect(computed.shadow).toBe('#2A3132');expect(computed.autumn).toBe('#763626');
  expect(computed.accent).toBe(ACCENT[selected].primary);
  expect(computed.bg).toBe(ACCENT[selected].background);
  expect(computed.glass).toContain('blur');
  expect(computed.navGlass).toContain('blur');
  expect(computed.heroWoodcut).toContain('woodcut-pattern.svg');
  expect(computed.woodcutOpacity).toBeLessThan(.16);
  expect(computed.visibleIcon).toBe(1);expect(computed.hiddenIcon).toBe(0);
 }
});
test('accent background and theme-aware STH/BND brand crossfade smoothly without changing stored trip',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await mode(page,'light');
 const initial=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('southbound-v3')||'{}')));
 const first=await page.evaluate(()=>Number(getComputedStyle(document.body,'::before').opacity));
 expect(first).toBe(1);
 await page.locator('#sb-theme-toggle').click();
 await expect(page.locator('html')).toHaveAttribute('data-sb-theme','dark');
 const css=await page.locator('#sb2 .sb-overview-hero').evaluate(el=>({
  hero:getComputedStyle(el,'::after').transitionDuration,
  image:getComputedStyle(document.querySelector('.sb-brand-icon--light')).transitionDuration,
  backdrop:getComputedStyle(document.querySelector('.topnav')).backdropFilter,
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches
 }));
 expect(css.hero).not.toBe('0s');expect(css.image).not.toBe('0s');
 await mode(page,'dark');
 const state=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('southbound-v3')||'{}')));
 expect(state).toEqual(initial);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('html')).toHaveAttribute('data-sb-theme','dark');
});
test('frosted controls and patterned hero stay responsive on narrow Android widths',async({page})=>{
 for(const width of [320,360,390,430]){
  await page.setViewportSize({width,height:844});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-view="bookings"]').click();
  await expect(page.locator('[data-bk-preset]')).toHaveCount(6);
  const dims=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth,
   width:document.documentElement.clientWidth,
   nav:document.querySelector('.topnav').getBoundingClientRect().width,
   shell:document.querySelector('#sb2').getBoundingClientRect().width
  }));
  expect(dims.scroll,JSON.stringify({width,dims})).toBeLessThanOrEqual(dims.width+2);
  expect(dims.nav).toBeLessThanOrEqual(dims.shell);
 }
});
