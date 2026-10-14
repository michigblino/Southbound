const {test,expect}=require('@playwright/test');
const ACCENT={light:{primary:'#336B87',background:'#E4EFF5'},dark:{primary:'#E0C59C',background:'#192A21'}};
async function mode(page,next){
 if(await page.locator('html').getAttribute('data-sb-theme')!==next){
  await page.locator('#sb-theme-toggle').click();
 }
 await expect(page.locator('html')).toHaveAttribute('data-sb-theme',next);
 await expect(page.locator('.sb-budget-summary')).toBeVisible();
 await expect(page.locator('.sb-brand-icon--light')).toHaveCount(1);
 await expect(page.locator('.sb-brand-icon--dark')).toHaveCount(1);
 await expect.poll(async()=>page.locator('#sb2 .sb-overview-hero').evaluate(x=>
   Number(getComputedStyle(x,'::after').opacity)),{timeout:2500}).toBe(next==='light'?0:1);
}
test('the rebranded forest-and-sand palette powers actual UI tokens, not an unrelated mockup',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#sb-theme-toggle')).toBeVisible();
 for(const selected of ['light','dark']){
  await mode(page,selected);
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.body).color),{timeout:3000})
   .toBe(selected==='light'?'rgb(23, 56, 76)':'rgb(245, 235, 221)');
  const base=await page.evaluate(()=>{
   const sheet=getComputedStyle(document.documentElement);
   return {
    mist:sheet.getPropertyValue('--sb-mist').trim(),stone:sheet.getPropertyValue('--sb-stone').trim(),
    shadow:sheet.getPropertyValue('--sb-shadow-color').trim(),autumn:sheet.getPropertyValue('--sb-autumn').trim(),
    accent:sheet.getPropertyValue('--accent').trim(),bg:sheet.getPropertyValue('--bg').trim()
   };
  });
  const [glass,navGlass,hero,visibleIcon,hiddenIcon]=await Promise.all([
   page.locator('.sb-budget-summary').evaluate(el=>getComputedStyle(el).backdropFilter),
   page.locator('#sb2 .topnav').evaluate(el=>getComputedStyle(el).backdropFilter),
   page.locator('#sb2 .sb-overview-hero').evaluate(el=>({
    woodcut:getComputedStyle(el,'::before').backgroundImage,
    opacity:Number(getComputedStyle(el,'::before').opacity)
   })),
   page.locator('.sb-brand-icon--'+selected).evaluate(el=>Number(getComputedStyle(el).opacity)),
   page.locator('.sb-brand-icon--'+(selected==='light'?'dark':'light')).evaluate(el=>Number(getComputedStyle(el).opacity))
  ]);
  const computed={...base,glass,navGlass,heroWoodcut:hero.woodcut,woodcutOpacity:hero.opacity,visibleIcon,hiddenIcon};
  expect(computed.mist).toBe('#90AFC5');expect(computed.stone).toBe('#336B87');
  expect(computed.shadow).toBe('#192A21');expect(computed.autumn).toBe('#CBB18B');
  expect(computed.accent).toBe(ACCENT[selected].primary);
  expect(computed.bg).toBe(ACCENT[selected].background);
  expect(computed.glass).toContain('blur');
  expect(computed.navGlass).toContain('blur');
  expect(computed.heroWoodcut).toContain('woodcut-pattern.svg');
  expect(computed.woodcutOpacity).toBeLessThan(.16);
  expect(computed.visibleIcon).toBe(1);expect(computed.hiddenIcon).toBe(0);
 }
});
test('accent background and theme-aware The Worn Road wordmark crossfade smoothly without changing stored trip',async({page})=>{
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
