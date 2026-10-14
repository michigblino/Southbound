const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
test('volunteer dialog exposes food, fees and non-persisting before-after preview',()=>{for(const id of ['sb-vol-food','sb-vol-extra','sb-vol-preview','sb-vol-preview-result'])assert.ok(html.includes(id),id);assert.match(html,/SouthboundVolunteerScenario\.compare\(/);assert.match(html,/Noch nichts gespeichert/);assert.match(html,/foodPerDay:foodRaw/);assert.match(html,/extraCosts:extraRaw/)});

test('host dialog warns above preferred hours, validates explicit costs and permits revoking a confirmation',()=>{
 assert.match(html,/hours>Number\(m\.travelPreferences\.maxVolunteerHours\)&&!confirm/);
 assert.match(html,/sb-vol-revoke/);
 assert.match(html,/m\.vol\[selected\]=false/);
 assert.match(html,/hoursPerWeek:hours/);
 assert.match(html,/nightRaw===''|nightRaw===\x27\x27/);
 assert.doesNotMatch(html,/if\(night>0\)m\.hostelQuotes\[selected\]/);
});
test('transfer entry uses single itinerary amount and external booking handoff, not a duplicate manual ticket form',()=>{
 assert.match(html,/data-transfer-book/);
 assert.match(html,/data-transfer-price/);
 assert.match(html,/x\.leg===null\?'Preis offen':E\(x\.leg\)/);
 assert.doesNotMatch(html,/data-ticket-save/);
 assert.doesNotMatch(html,/data-ticket-price/);
});
