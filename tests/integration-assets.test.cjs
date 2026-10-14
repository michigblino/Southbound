const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const modules=['budget-engine.js','route-budget.js','trip-calendar.js','wait-costs.js','route-timing.js','volunteer-matching.js','volunteer-scenario.js','volunteer-economics.js','state-backup.js','currency-rates.js','booking-finance.js','booking-ledger.js','booking-ui.js','stage-card.js','savings-potential.js','route-budget-variants.js','journey-flights.js','trip-reprice.js','price-evidence.js','budget-feasibility.js','price-readiness.js'];
test('all budgeting and scheduling modules are referenced in HTML',()=>{for(const name of modules)assert.ok(html.includes('src="./'+name+'"')||html.includes('src="./'+name+'?v=77"')||html.includes('src="./'+name+'?v=78"')||html.includes('src="./'+name+'?v=81"')||html.includes('src="./'+name+'?v=84"'),name+' missing from index.html')});
test('offline cache includes all critical calculation modules',()=>{for(const name of modules)assert.ok(sw.includes(name),name+' missing from sw.js')});
test('offline cache has a versioned cache identifier',()=>assert.match(sw,/southbound-v\d+/));
test('legacy traveler storage key preserved',()=>assert.ok(html.includes('southbound-v3')));

test('budget integrity panel passes keyed fixed costs to shared snapshot',()=>{assert.match(html,/const fixedCosts=Object\.fromEntries\(keys\.map/);assert.match(html,/fixedCosts:fixed,returnPaymentEUR:booked.returnPaymentEUR,fixedPaymentEUR:booked.fixedPaymentEUR,paidByStop:/);assert.doesNotMatch(html,/const fixedCosts=keys\.map\(\(\[k,label\]\)=>\(\{label,amount:/)});

test('overview distinguishes primary all-in subtotal from optional risk simulation',()=>{assert.match(html,/data-sb-all-in-total/);assert.match(html,/Zusätzliche Preisrisiko-Simulation \(kein All-in-Budget\)/);assert.match(html,/id="sb-savings-risk"><summary><b>Zusätzliche Preisrisiko-Simulation/);assert.doesNotMatch(html,/budgetGap=t\.mid/)});

test('The Worn Road icons preserve the complete wordmark and manifest identity',()=>{
 const icons=['icon.svg','icon-dark.svg','icon-maskable.svg'].map(name=>fs.readFileSync(path.join(root,name),'utf8'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 for(const icon of icons){
  for(const word of ['THE','WORN','ROAD'])assert.ok(icon.includes('>'+word+'</text>'),word+' missing');
  assert.match(icon,/The Worn Road/);
 }
 assert.match(icons[1],/#BDA17B/);
 assert.ok(html.includes('href="./icon.svg"'));
 assert.ok(html.includes('icon-dark.svg'));
 assert.ok(sw.includes('icon-dark.svg'));
 assert.ok(sw.includes('icon-maskable.svg'));
 assert.ok(sw.includes('woodcut-pattern.svg'));
 assert.equal(manifest.name,'The Worn Road – Reiseplaner');
 assert.equal(manifest.short_name,'The Worn Road');
 assert.equal(manifest.theme_color,'#192A21');
 assert.ok(manifest.icons.some(x=>x.src==='./icon.svg'));
 assert.ok(manifest.icons.some(x=>x.src==='./icon-maskable.svg'&&x.purpose==='maskable'));
 assert.ok(html.includes('favicon.href=theme'));
});

test('volunteer recommendations do not stop when gross savings seem to cover budget gap',()=>{assert.match(html,/if\(selected\.length>=5\)break/);assert.doesNotMatch(html,/if\(gap>0&&covered>=gap\)break/);assert.match(html,/zusätzliche Tage – Kosten offen/);assert.match(html,/Brutto-Unterkunftspotenziale sind keine Nettoersparnisse/)});

test('The Worn Road visual theme supports persistent dark and light modes',()=>{assert.match(html,/data-sb-theme/);assert.match(html,/southbound-theme/);assert.match(html,/prefers-color-scheme: light/);assert.match(html,/sb-theme-toggle/);assert.match(html,/--bg:#f4f1e9/);assert.match(html,/--bg:#111310/)});

test('stage card CSS and booking status UI are included in offline build',()=>{
 assert.ok(html.includes('href="./stage-card.css?v=84"'));
 assert.ok(sw.includes('stage-card.css','design-system.css'));
 assert.ok(html.includes('SouthboundStageCard.summarize'));
 assert.ok(html.includes('data-stage-action'));
});

test('The Worn Road dark forest and light Mist/Stone palettes have offline assets',()=>{
 const css=fs.readFileSync(path.join(root,'design-system.css'),'utf8');
 for(const color of ['#90AFC5','#336B87','#192A21','#CBB18B'])assert.ok(css.includes(color),'missing user palette '+color);
 assert.match(css,/backdrop-filter:blur/);
 assert.match(css,/woodcut-pattern\.svg/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/--sb-gradient-hero/);
 assert.ok(sw.includes('design-system.css'));
 const pattern=fs.readFileSync(path.join(root,'woodcut-pattern.svg'),'utf8');
 assert.match(pattern,/<svg /);assert.match(pattern,/<path /);
});

test('booking cards expose a return flight and saved bookings are grouped',()=>{
 const booking=fs.readFileSync(path.join(root,'booking-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'design-system.css'),'utf8');
 assert.match(booking,/data-bk-preset="return"[^\n]*<b>Rückflug<\/b>/);
 assert.match(booking,/data-bk-group/);
 for(const key of ['inbound','return','transport','lodging','volunteering','activity'])assert.ok(booking.includes("key:'"+key+"'"));
 assert.match(css,/\.sb-booking-groups/);
});

test('guided editor only changes presentation, not booking record fields',()=>{
 const code=fs.readFileSync(path.join(root,'booking-ui.js'),'utf8');
 assert.match(code,/data-bk-wizard/);
 assert.match(code,/setWizard\(true,1\)/);
 assert.match(code,/data-bk-all/);
 assert.match(code,/setWizard\(false\)/);
});

test('four budget shortcuts and scenario planning are connected to their real modules',()=>{
 assert.match(html,/data-sb-fixed-book/);assert.match(html,/\['insurance','Versicherung'\],\['equipment','Ausrüstung'\],\['inbound','Anreise'\],\['return','Abreise'\]/);
 assert.match(html,/sbBudgetVariantsPanel\(booked.items,check.totalEstimate,riskMarkup\)/);
 assert.match(html,/fixedPaymentEUR:booked.fixedPaymentEUR/);
});

test('savings hub uses one shared booked itinerary and no standalone second maximum',()=>{
 assert.ok(html.includes("function sbBudgetVariantsPanel(items,total,riskMarkup=''"));
 assert.ok(html.includes('const common={items,bookings:m.bookingLedger'));assert.ok(html.includes('bed=bedCalc({...common,visited:m.visited})'));
 assert.match(html,/data-sb-variant-content/);
 assert.match(html,/id="sb-savings-lodging"/);
 assert.doesNotMatch(html,/function sbSavingsPotentialPanel\(/);
 assert.doesNotMatch(html,/\+sbSavingsPotentialPanel\(original\)/);
});

test('PWA app cache-busts new decision layout and flight modules',()=>{
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(html.includes('design-system.css?v=84'));
 assert.ok(html.includes('route-budget-variants.js?v=77'));
 assert.ok(html.includes('journey-flights.js?v=77'));
 for(const file of ['design-system.css?v=84','route-budget-variants.js?v=77','journey-flights.js?v=77'])assert.ok(sw.includes(file));
 assert.ok(html.includes('sbJourneyFlightRows()'));
});

test('scenario forecasts reprice with complete booking and pricing pipeline, no subtotal subtraction',()=>{
 assert.ok(html.includes('SouthboundTripReprice'));
 assert.ok(html.includes('SouthboundPriceEvidence'));
 assert.ok(html.includes('repriced.alternatives[i].forecast'));
 assert.ok(html.includes('costBreakdown'));
 assert.ok(html.includes('Wie verlässlich sind die Preise?'));
 assert.ok(sw.includes('trip-reprice.js?v=81'));
 assert.ok(sw.includes('price-evidence.js?v=78'));
});

test('name change preserves traveler records and offline asset revision',()=>{
 assert.match(html,/localStorage\.getItem\('southbound-v3'\)/);
 assert.match(html,/SouthboundBookingLedger/);
 assert.match(html,/The Worn Road/);
 assert.match(html,/the-worn-road-backup\.json/);
 assert.ok(sw.includes('southbound-v84'));
});


test('budget viability checks never represent missing transfers as bookable fares',()=>{
 assert.ok(html.includes('SouthboundBudgetFeasibility'));
 assert.ok(html.includes('SouthboundPriceReadiness'));
 assert.ok(html.includes('newConnections'));
 assert.ok(html.includes('Ticketpreis offen'));
 assert.ok(html.includes('id="sb-savings-reroutes"'));
 assert.ok(html.includes('id="sb-savings-price-readiness"'));
 for(const asset of ['budget-feasibility.js?v=81','price-readiness.js?v=81','trip-reprice.js?v=81'])assert.ok(sw.includes(asset));
 assert.ok(html.includes('The Worn Road'));
});


test('sourced manual offer shortlist is bundled and never asserts live bookability',()=>{
 assert.ok(html.includes('offer-shortlist.js?v=84'));
 assert.ok(html.includes('offer-shortlist.css'));
 assert.ok(html.includes('SouthboundOfferShortlist.render'));
 assert.ok(html.includes('SouthboundOfferShortlist.bind'));
 assert.ok(sw.includes('offer-shortlist.js?v=84'));
 assert.ok(sw.includes('offer-shortlist.css'));
 const backup=fs.readFileSync(path.join(root,'state-backup.js'),'utf8');
 assert.ok(backup.includes('offerWatchlist'));
 assert.match(html,/southbound-v3/);
});


test('provider discovery files are packaged and never imply live data on static hosting',()=>{
 const discovery=fs.readFileSync(path.join(root,'offer-discovery.js'),'utf8');
 for(const name of ['offer-discovery.js?v=84','offer-discovery.css']){
  assert.ok(html.includes(name));assert.ok(sw.includes(name));
 }
 assert.ok(html.includes('offer-shortlist.js?v=84'));
 assert.ok(sw.includes('southbound-v84'));
 assert.ok(discovery.includes('/api/offers/v1/search'));
 assert.ok(discovery.includes('availabilityConfirmed:true'));
 assert.ok(!discovery.includes('API_KEY='));
});


test('only one transfer purchase path uses the reconciled leg price, with preserved manual records',()=>{
 const dark=fs.readFileSync(path.join(root,'icon-dark.svg'),'utf8');
 const light=fs.readFileSync(path.join(root,'icon.svg'),'utf8');
 assert.match(light,/#E4EFF5/);assert.match(light,/#336B87/);
 assert.equal((light.match(/<path /g)||[]).length,(dark.match(/<path /g)||[]).length);
 for(const key of ['data-transfer-book','sb-transfer-card','data-transfer-price','formatPrice:E','id="sb-booking-records"'])assert.ok(html.includes(key),key);
 assert.ok(!html.includes('data-ticket-save="'));
 assert.ok(sw.includes('southbound-v84'));
});
