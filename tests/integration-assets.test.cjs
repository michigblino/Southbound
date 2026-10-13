const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const modules=['budget-engine.js','route-budget.js','trip-calendar.js','wait-costs.js','route-timing.js','volunteer-matching.js','volunteer-scenario.js','volunteer-economics.js','booking-ledger.js','booking-ui.js','stage-card.js'];
test('all budgeting and scheduling modules are referenced in HTML',()=>{for(const name of modules)assert.ok(html.includes('src="./'+name+'"'),name+' missing from index.html')});
test('offline cache includes all critical calculation modules',()=>{for(const name of modules)assert.ok(sw.includes(name),name+' missing from sw.js')});
test('offline cache has a versioned cache identifier',()=>assert.match(sw,/southbound-v\d+/));
test('legacy traveler storage key preserved',()=>assert.ok(html.includes('southbound-v3')));

test('budget integrity panel passes keyed fixed costs to shared snapshot',()=>{assert.match(html,/const fixedCosts=Object\.fromEntries\(keys\.map/);assert.match(html,/fixedCosts:fixed,paidByStop:/);assert.doesNotMatch(html,/const fixedCosts=keys\.map\(\(\[k,label\]\)=>\(\{label,amount:/)});

test('overview distinguishes primary all-in subtotal from optional risk simulation',()=>{assert.match(html,/data-sb-all-in-total/);assert.match(html,/Zusätzliche Preisrisiko-Simulation \(kein All-in-Budget\)/);assert.match(html,/<details class="panel"><summary><b>Zusätzliche Preisrisiko-Simulation/);assert.doesNotMatch(html,/budgetGap=t\.mid/)});

test('STH/BND app icon is used by favicon and PWA manifest',()=>{const icon=fs.readFileSync(path.join(root,'icon.svg'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));assert.match(icon,/>STH<\/text>/);assert.match(icon,/>BND<\/text>/);assert.match(icon,/M95 116H417M95 394H417/);assert.ok(html.includes('href="./icon.svg"'));assert.ok(manifest.icons.some(x=>x.src==='./icon.svg'))});

test('volunteer recommendations do not stop when gross savings seem to cover budget gap',()=>{assert.match(html,/if\(selected\.length>=5\)break/);assert.doesNotMatch(html,/if\(gap>0&&covered>=gap\)break/);assert.match(html,/zusätzliche Tage mit noch zu kalkulierenden Kosten/);assert.match(html,/nicht<\/b> von der Budgetlücke abgezogen/)});

test('STH/BND visual theme supports persistent dark and light modes',()=>{assert.match(html,/data-sb-theme/);assert.match(html,/southbound-theme/);assert.match(html,/prefers-color-scheme: light/);assert.match(html,/sb-theme-toggle/);assert.match(html,/--bg:#f4f1e9/);assert.match(html,/--bg:#111310/)});

test('stage card CSS and icon-based status UI are available offline',()=>{
 assert.ok(html.includes('href="./stage-card.css"'));
 assert.ok(sw.includes('stage-card.css'));
 assert.ok(html.includes('SouthboundStageCard.summarize'));
 assert.ok(html.includes('data-stage-action'));
});
