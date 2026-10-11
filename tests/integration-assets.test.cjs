const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const modules=['budget-engine.js','route-budget.js','trip-calendar.js','wait-costs.js','route-timing.js','volunteer-matching.js','volunteer-economics.js'];
test('all budgeting and scheduling modules are referenced in HTML',()=>{for(const name of modules)assert.ok(html.includes('src="./'+name+'"'),name+' missing from index.html')});
test('offline cache includes all critical calculation modules',()=>{for(const name of modules)assert.ok(sw.includes(name),name+' missing from sw.js')});
test('offline cache has a versioned cache identifier',()=>assert.match(sw,/southbound-v\d+/));
test('legacy traveler storage key preserved',()=>assert.ok(html.includes('southbound-v3')));
