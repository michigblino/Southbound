const test=require('node:test'),assert=require('node:assert/strict');
const {optimize}=require('../route-budget-variants.js');
const s=(i,n,b=20,other=10,name='City '+i)=>({i,name,days:n,regularBed:b,bed:b,food:other,leisure:0,other:0,leg:20});
test('variants are immutable and show conditional price gap, not a bookable route',()=>{
 const items=[s(0,2),s(1,35),s(2,8),s(3,4)];
 const original=JSON.stringify(items),result=optimize({items,goal:8000,baselineTotal:16609});
 assert.equal(JSON.stringify(items),original);
 assert.equal(result.options.length,3);
 for(const o of result.options){assert.equal(o.complete,false);assert.equal(o.verifiedSavings,null);assert.equal(o.forecast,Math.round((16609-o.modelSaving)*100)/100);assert.equal(o.remainingToGoal,Math.max(0,o.forecast-8000))}
});
test('confirmed bookings and confirmed hosts are locked',()=>{
 const r=optimize({items:[s(0,2),s(1,35),s(2,35),s(3,3)],bookings:[{status:'confirmed',stageId:1,type:'lodging'}],vol:{2:true},volunteerDetails:{2:{confirmed:true}},baselineTotal:4000});
 for(const option of r.options)assert.equal(option.actions.some(x=>x.i===1||x.i===2),false);
});
test('volunteer simulation uses existing travel days and 21-28 night stays with 30h cap',()=>{
 const r=optimize({items:[s(0,2),s(1,35,35),s(2,10,14),s(3,45,30),s(4,3)],
  volunteerDetails:{1:{hoursPerWeek:35}},preferences:{maxVolunteerHours:40,maxVolunteerWeeks:8},baselineTotal:12000});
 const v=r.options[2];assert.equal(r.constraints.allowedHours,30);
 assert.ok(v.hostNights<=28*6);assert.equal(v.actions.some(x=>x.i===1&&x.hostNights>0),false);
 assert.ok(v.actions.every(x=>x.hostNights===0||x.hostNights>=21));
});
test('missing lodging estimate is not treated as free savings',()=>{
 const r=optimize({items:[s(0,2),{...s(1,40),regularBed:null,bed:null},s(2,5)],baselineTotal:1800});
 assert.equal(r.options[2].actions.some(x=>x.i===1&&x.hostNights>0),false);
});
