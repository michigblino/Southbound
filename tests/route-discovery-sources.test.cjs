const test=require('node:test'),assert=require('node:assert/strict');
const sources=require('../route-discovery-sources.js');
const discovery=require('../route-discovery.js');
const edgeSource={url:'https://example.org/fixture',title:'Synthetic test fixture',checkedAt:'2026-10-18',kind:'fixture'};
const fixedNow=()=>Date.parse('2026-10-18T12:00:00.000Z');
function response(elements,status=200){return {ok:status>=200&&status<300,status,json:async()=>({elements})};}
function fixtureElements(){return [
 {type:'node',id:101,lat:-3.1,lon:-60.0,tags:{name:'Manaus',place:'city','addr:country':'BR','addr:state':'Amazonas'}},
 {type:'way',id:202,center:{lat:-3.2,lon:-60.1},tags:{name:'Teatro Amazonas',tourism:'attraction'}},
 {type:'node',id:303,lat:-3.3,lon:-60.2,tags:{place:'town'}},
 {type:'node',id:101,lat:-3.1,lon:-60.0,tags:{name:'Manaus',place:'city','addr:country':'BR'}}
];}
test('builds a bounded Overpass query and normalizes nodes and ways',async()=>{
 let call;
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async(url,opts)=>{call={url,opts};return response(fixtureElements());},now:fixedNow});
 const result=await adapter.searchPlaces({bbox:[-4,-61,-2,-59],categories:['settlements','attractions'],limit:20});
 assert.equal(result.status,'ok');assert.equal(result.places.length,2);
 assert.equal(result.places[0].id,'osm-node-101');assert.equal(result.places[0].countryCode,'BR');
 assert.equal(result.places[1].id,'osm-way-202');assert.equal(result.places[1].lat,-3.2);
 assert.equal(call.url,'https://overpass-api.de/api/interpreter');
 assert.equal(call.opts.method,'POST');
 const query=new URLSearchParams(call.opts.body).get('data');
 assert.match(query,/\(-4,-61,-2,-59\)/);assert.match(query,/timeout:20/);assert.match(query,/out center tags qt 20/);
 assert.equal(result.diagnostics.faresAdded,false);assert.equal(result.diagnostics.schedulesAdded,false);
});
test('attaches explicit OpenStreetMap attribution, licence and retrieval date',async()=>{
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>response(fixtureElements()),now:fixedNow});
 const result=await adapter.searchPlaces({bbox:[-4,-61,-2,-59]});
 assert.equal(result.source.kind,'licensed-dataset');
 assert.equal(result.source.url,'https://www.openstreetmap.org/copyright');
 assert.match(result.source.attribution,/OpenStreetMap contributors/);
 assert.match(result.source.license,/ODbL/);
 assert.equal(result.source.checkedAt,'2026-10-18');
 assert.equal(result.places[0].source.endpoint,'https://overpass-api.de/api/interpreter');
});
test('returns graceful unavailable result for HTTP errors and rate limiting',async()=>{
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>response([],429),now:fixedNow});
 const result=await adapter.searchPlaces({bbox:[-4,-61,-2,-59]});
 assert.equal(result.status,'unavailable');assert.equal(result.diagnostics.reason,'rate-limited');assert.equal(result.diagnostics.retryable,true);assert.equal(result.places.length,0);
});
test('returns graceful unavailable result for malformed provider JSON',async()=>{
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>({ok:true,status:200,json:async()=>({remark:'query failed'})}),now:fixedNow});
 const result=await adapter.searchPlaces({bbox:[-4,-61,-2,-59]});
 assert.equal(result.status,'unavailable');assert.equal(result.diagnostics.reason,'invalid-response');assert.deepEqual(result.graph,{nodes:[],edges:[]});
});
test('returns graceful unavailable result for network failures without caching the failure',async()=>{
 let calls=0;
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>{calls++;if(calls===1)throw Error('offline');return response(fixtureElements());},now:fixedNow});
 const first=await adapter.searchPlaces({bbox:[-4,-61,-2,-59]});
 const second=await adapter.searchPlaces({bbox:[-4,-61,-2,-59]});
 assert.equal(first.status,'unavailable');assert.equal(first.diagnostics.reason,'network-error');
 assert.equal(second.status,'ok');assert.equal(calls,2);
});
test('caches successful regional queries and avoids duplicate provider calls',async()=>{
 let calls=0;
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>{calls++;return response(fixtureElements());},now:fixedNow,cacheTtlMs:60000});
 const query={bbox:[-4,-61,-2,-59],categories:['settlements']};
 const first=await adapter.searchPlaces(query),second=await adapter.searchPlaces(query);
 assert.equal(calls,1);assert.equal(first.diagnostics.cache,'miss');assert.equal(second.diagnostics.cache,'hit');
});
test('rejects invalid bounding boxes and unknown categories before network calls',async()=>{
 let calls=0;
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>{calls++;return response(fixtureElements());},now:fixedNow});
 const badBox=await adapter.searchPlaces({bbox:[10,170,-10,-170]});
 const badCategory=await adapter.searchPlaces({bbox:[-4,-61,-2,-59],categories:['flights']});
 assert.equal(badBox.status,'invalid-query');assert.equal(badCategory.status,'invalid-query');assert.equal(calls,0);
});
test('does not fabricate daily costs; route engine keeps all-in budget unverified without fares',async()=>{
 const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>response(fixtureElements().slice(0,2)),now:fixedNow});
 const places=(await adapter.searchPlaces({bbox:[-4,-61,-2,-59]})).places;
 assert.equal(places.every(p=>p.dailyCost===undefined),true);
 const result=discovery.discover({brief:{originId:places[0].id,startDate:'2027-02-01',budgetTarget:500,budgetCap:1000,budgetCurrency:'EUR',minDays:1,maxDays:30,geography:{scope:'any',value:''},mustSee:[],avoid:[],maxStops:2,maxCandidates:3},graph:{nodes:places,edges:[{id:'unknown-link',from:places[0].id,to:places[1].id,mode:'other',durationDays:{min:1,max:1},fare:{quality:'unknown',currency:'EUR'},source:edgeSource}]}});
 assert.equal(result.status,'ok');assert.equal(result.candidates[0].cost.complete,false);
 assert.equal(result.candidates[0].cost.totalMin,null);assert.ok(result.candidates[0].cost.unknownComponents.length>=3);
});
test('does not call a public endpoint when query validation fails',async()=>{
 let calls=0;const adapter=sources.createOpenStreetMapPlaceAdapter({fetchImpl:async()=>{calls++;return response([]);},now:fixedNow});
 const result=await adapter.searchPlaces({bbox:[0,0,0,0]});
 assert.equal(result.status,'invalid-query');assert.equal(calls,0);
});