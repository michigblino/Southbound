const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const modules=['budget-engine.js','route-budget.js','trip-calendar.js','wait-costs.js','route-timing.js','volunteer-matching.js','volunteer-economics.js'];
test('all budgeting and scheduling modules are referenced in HTML',()=>{for(const name of modules)assert.ok(html.includes('src="./'+name+'"'),name+' missing from index.html')});
test('offline cache includes all critical calculation modules',()=>{for(const name of modules)assert.ok(sw.includes(name),name+' missing from sw.js')});
test('offline cache has a versioned cache identifier',()=>assert.match(sw,/southbound-v\d+/));
test('legacy traveler storage key preserved',()=>assert.ok(html.includes('southbound-v3')));

test('budget integrity panel passes keyed fixed costs to shared snapshot',()=>{assert.match(html,/const fixedCosts=Object\.fromEntries\(keys\.map/);assert.match(html,/fixedCosts:fixed,paidByStop:/);assert.doesNotMatch(html,/const fixedCosts=keys\.map\(\(\[k,label\]\)=>\(\{label,amount:/)});

test('overview distinguishes primary all-in subtotal from optional risk simulation',()=>{assert.match(html,/data-sb-all-in-total/);assert.match(html,/Zusätzliche Preisrisiko-Simulation \(kein All-in-Budget\)/);assert.match(html,/<details class="panel"><summary><b>Zusätzliche Preisrisiko-Simulation/);assert.doesNotMatch(html,/budgetGap=t\.mid/)});
