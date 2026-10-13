const test=require('node:test'),assert=require('node:assert/strict');
const {render}=require('../booking-ui.js');
const html=render({route:[{i:0,name:'Medellín'},{i:1,name:'Salento'}],bookings:[]});

test('booking form has type-dependent transfer, lodging, volunteering and activity inputs',()=>{
 assert.match(html,/data-bk-for="transport"[^>]*>Verbindung/);
 assert.match(html,/data-bk="journeyOrigin"/);
 assert.match(html,/data-bk="travelMode"/);
 assert.match(html,/data-bk-preset="inbound"/);
 assert.match(html,/data-bk-add-stopover/);
 assert.match(html,/data-bk-for="lodging volunteering" hidden style="display:none"/);
 assert.match(html,/data-bk-for="activity" hidden style="display:none"/);
 assert.match(html,/data-bk-context role="note"/);
});
test('booking form preserves common financial and evidence inputs across all types',()=>{
 for(const key of ['type','status','stageId','startDate','title','provider','totalEUR','paidEUR','refundedEUR','reference','recordedElsewhere','notes'])
  assert.ok(html.includes('data-bk="'+key+'"'),key+' should stay available');
});
