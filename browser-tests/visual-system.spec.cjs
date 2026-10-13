const {test,expect}=require('@playwright/test');
function contrast(a,b){
 const rgb=c=>{const vals=(c.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);
  if(vals.length!==3)throw Error('Unparseable computed color: '+c);
  return vals.map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4})};
 const luminance=c=>{const [r,g,b]=rgb(c);return r*.2126+g*.7152+b*.0722};
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
async function metrics(page){
 return page.evaluate(()=>{
  const root=document.getElementById('sb2'),nav=root.querySelector('.topnav'),buttons=[...nav.querySelectorAll('button')];
  const theme=getComputedStyle(document.documentElement),style=getComputedStyle(document.body);
  const r=nav.getBoundingClientRect(),card=root.querySelector('.panel')||nav;
  return {
   shellWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
   mode:document.documentElement.getAttribute('data-sb-theme'),
   rootBackground:theme.getPropertyValue('--bg').trim(),
   surface:theme.getPropertyValue('--panel').trim(),
   color:theme.getPropertyValue('--text').trim(),
   textComputed:style.color,bgComputed:style.backgroundColor,
   navWidth:r.width,navViewport:r.right<=innerWidth+2&&r.left>=-2,
   navButtons:buttons.length,buttonPositions:buttons.map(b=>{const x=b.getBoundingClientRect();return {width:x.width,height:x.height,left:x.left,right:x.right,top:x.top}}),
   cardBackground:getComputedStyle(card).backgroundColor
  };
 });
}
test('daylight and graphite palettes keep visible text and surfaces readable',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#sb-theme-toggle')).toBeVisible();
 for(const mode of ['light','dark']){
  if(await page.locator('html').getAttribute('data-sb-theme')!==mode)await page.locator('#sb-theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-sb-theme',mode);
  const m=await metrics(page);
  expect(m.rootBackground,mode+' body token').toBe(mode==='light'?'#E4EFF5':'#2A3132');
  expect(m.surface).not.toBe(m.rootBackground);
  expect(contrast(m.textComputed,mode==='light'?'rgb(228,239,245)':'rgb(42,49,50)'),mode+' body contrast').toBeGreaterThan(7);
  const button=page.locator('#sb2 .topnav button.active');
  const css=await button.evaluate(b=>({font:getComputedStyle(b).color,bg:getComputedStyle(b).backgroundColor}));
  expect(contrast(css.font,mode==='light'?'rgb(51,107,135)':'rgb(118,54,38)')).toBeGreaterThan(4.5);
  await page.locator('[data-view="bookings"]').click();
  const shortcut=page.locator('[data-bk-preset="return"]');
  await expect(shortcut).toBeVisible();
  const data=await shortcut.evaluate(el=>({font:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
  expect(contrast(data.font,mode==='light'?'rgb(235,246,251)':'rgb(53,57,57)'),mode+' shortcut contrast').toBeGreaterThan(4.5);
 }
});
test('mobile header theme toggle stays inside brand, navigation does not overflow 320-430px',async({page})=>{
 for(const width of [320,360,390,430]){
  await page.setViewportSize({width,height:785});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const toggle=page.locator('#sb2 .sb-brand-actions #sb-theme-toggle');
  await expect(toggle).toBeVisible();
  const m=await metrics(page);
  expect(m.shellWidth,JSON.stringify({width,m})).toBeLessThanOrEqual(m.viewport+2);
  expect(m.navButtons).toBe(4);
  expect(m.navViewport,JSON.stringify({width,m})).toBe(true);
  const tops=new Set(m.buttonPositions.map(x=>Math.round(x.top)));
  expect(tops.size,'Navigation should be one single row').toBe(1);
  for(const position of m.buttonPositions){expect(position.width).toBeGreaterThan(49);expect(position.height).toBeGreaterThan(43);}
  await page.locator('[data-view="bookings"]').click();
  await expect(page.locator('[data-bk-preset]')).toHaveCount(6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  const card=page.locator('[data-bk-preset="inbound"]');
  const colors=await card.evaluate(x=>({background:getComputedStyle(x).backgroundColor,radius:getComputedStyle(x).borderRadius}));
  expect(colors.radius).toBe('20px');
 }
});
test('theme choice persists after refresh and does not reset budget or saved bookings',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#sb-theme-toggle')).toBeVisible();
 const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')||'{}'));
 const old=await page.locator('html').getAttribute('data-sb-theme'),wanted=old==='light'?'dark':'light';
 await page.locator('#sb-theme-toggle').click();
 await expect(page.locator('html')).toHaveAttribute('data-sb-theme',wanted);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('html')).toHaveAttribute('data-sb-theme',wanted);
 await expect(page.locator('#sb2 .sb-brand-actions #sb-theme-toggle')).toBeVisible();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')||'{}'));
 expect(after.goal).toBe(initial.goal);expect(after.cap).toBe(initial.cap);
 expect(after.bookingLedger||[]).toEqual(initial.bookingLedger||[]);
});

test('overview opens with a meaningful real-trip summary before technical forms',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const hero=page.locator('#sb2 .sb-overview-hero');
 await expect(hero).toBeVisible();
 await expect(hero).toContainText('Zielbudget');
 await expect(hero).toContainText('Reisetage');
 const positions=await page.evaluate(()=>({
  hero:document.querySelector('.sb-overview-hero').getBoundingClientRect().top,
  preferences:document.querySelector('#sb-travel-settings').getBoundingClientRect().top,
  scroll:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth
 }));
 expect(positions.hero).toBeLessThan(positions.preferences);
 expect(positions.scroll).toBeLessThanOrEqual(positions.viewport+2);
 await hero.locator('[data-sb-hero-open-stages]').click();
 await expect(page.locator('#sb2 .topnav [data-view="stages"]')).toHaveAttribute('aria-current','page');
});
