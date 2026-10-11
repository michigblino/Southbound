// Run: node --test tests/budget.test.cjs
const test=require('node:test');const assert=require('node:assert/strict');
function budget({stops,actuals={},excluded={},visited={},current=0,reserve=0,extras=[]}){
 const paid=i=>{const a=actuals[i]||{};return ['lodging','transport','food','other'].reduce((n,k)=>n+(Number(a[k])||0),0)+(a.activities||[]).reduce((n,x)=>n+(Number(x.cost)||0),0)};
 const spent=stops.reduce((n,s,i)=>n+paid(i),0)+extras.reduce((n,x)=>n+(Number(x.cost)||0),0);
 const future=stops.reduce((n,s,i)=>n+(excluded[i]||visited[i]||i<current?0:Math.max(0,s.estimate-paid(i))),0);
 const missing=stops.map((_,i)=>i).filter(i=>!excluded[i]&&(visited[i]||i<current)&&paid(i)===0);
 return {spent,future,total:spent+future+reserve,missing};
}
test('untouched trip includes forecasts and reserve',()=>{assert.deepEqual(budget({stops:[{estimate:100},{estimate:200}],reserve:50}),{spent:0,future:300,total:350,missing:[]})});
test('partial payment replaces forecast, not adds to it',()=>{const x=budget({stops:[{estimate:100}],actuals:{0:{lodging:40}}});assert.equal(x.total,100);assert.equal(x.future,60)});
test('over-budget actual payment is counted fully',()=>{const x=budget({stops:[{estimate:100}],actuals:{0:{transport:130}}});assert.equal(x.total,130)});
test('completed stop uses actual spending',()=>{const x=budget({stops:[{estimate:100}],visited:{0:true},actuals:{0:{lodging:35}}});assert.equal(x.total,35)});
test('completed stop without actual spending raises warning',()=>{const x=budget({stops:[{estimate:100}],visited:{0:true}});assert.deepEqual(x.missing,[0])});
test('skipped stop loses forecast but retains already paid costs',()=>{const x=budget({stops:[{estimate:100}],excluded:{0:true},actuals:{0:{transport:20}}});assert.equal(x.total,20)});
test('current position closes earlier stops only',()=>{const x=budget({stops:[{estimate:100},{estimate:200},{estimate:300}],current:1,actuals:{0:{food:45}}});assert.equal(x.total,545)});
test('activity and unplanned stop count once',()=>{const x=budget({stops:[{estimate:100}],actuals:{0:{activities:[{cost:20}]}},extras:[{cost:40}]});assert.equal(x.total,140)});
test('reserve is included exactly once',()=>{const x=budget({stops:[{estimate:100}],reserve:2200});assert.equal(x.total,2300)});
