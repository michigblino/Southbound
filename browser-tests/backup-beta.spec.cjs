const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
test('active beta cockpit exports a complete, versioned backup of saved bookings and FX preferences',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await expect(page.locator('#sb-beta-backup')).toHaveCount(1);
 await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3')||'{}');
  m.goal=8100;m.cap=12000;m.baseCurrency='EUR';
  m.bookingLedger=[{id:'backup-booking',type:'lodging',stageId:1,title:'Test hostel',startDate:'2027-01-01',endDate:'2027-01-03',
   provider:'Test',status:'confirmed',reference:'BOOK-123',totalEUR:40,paidEUR:20,refundedEUR:0}];
  localStorage.setItem('southbound-v3',JSON.stringify(m));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#sb-beta-backup summary').click();
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#sb-export').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('southbound-backup.json');
 const body=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
 expect(body.version).toBe(4);
 expect(body.state.goal).toBe(8100);
 expect(body.state.bookingLedger[0].id).toBe('backup-booking');
 expect(body.state.bookingLedger[0].paidEUR).toBe(20);
});
test('replacing a trip with a version 3 backup clears stale bookings instead of secretly merging them',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3')||'{}');
  m.goal=9000;m.cap=12000;m.bookingLedger=[{id:'old-payment',type:'transport',stageId:1}];
  localStorage.setItem('southbound-v3',JSON.stringify(m));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#sb-beta-backup summary').click();
 page.on('dialog',d=>d.accept());
 const restored={version:3,state:{goal:7400,cap:12000,reserve:1100,days:{1:5},actuals:{},vol:{},visited:{},excluded:{}}};
 await Promise.all([
  page.waitForEvent('load'), // successful import triggers an intentional full reload
  page.locator('#sb-import').setInputFiles({name:'southbound-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restored))})
 ]);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')||'{}').goal)).toBe(7400);
 const local=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')||'{}'));
 expect(local.days['1']).toBe(5);expect(local.reserve).toBe(1100);
 expect(local.bookingLedger||[]).toHaveLength(0);
});
test('corrupt user uploads leave existing booking/payment data untouched',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('southbound-v3'))).toBe(true);
 await page.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('southbound-v3')||'{}');
  m.goal=8000;m.bookingLedger=[{id:'keep-this-booking',type:'lodging'}];
  localStorage.setItem('southbound-v3',JSON.stringify(m));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#sb-beta-backup summary').click();
 page.on('dialog',d=>d.accept());
 const corrupt=JSON.stringify({version:4,state:{goal:7500,cap:12000,bookingLedger:{id:'corrupt-not-an-array'}}});
 await page.locator('#sb-import').setInputFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from(corrupt)});
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('southbound-v3')||'{}'));
 expect(after.goal).toBe(8000);
 expect(after.bookingLedger[0].id).toBe('keep-this-booking');
});
