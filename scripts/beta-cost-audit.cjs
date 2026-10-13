/* Generate a machine-readable, entirely synthetic beta calculation audit.
 * CI assertions are independent of source price arithmetic.
 */
'use strict';
const assert=require('node:assert/strict');
const {makeReport}=require('../tests/beta-journey-fixture.cjs');
const result=makeReport();
assert.equal(result.fixture,'synthetic-test-only');
assert.equal(result.providerDataVerified,false);
assert.equal(result.sums.forecastAllInEUR,3306);
assert.equal(result.sums.bookingWarnings.length,0);
assert.ok(result.unverifiedVariants.unknownTransportDays.includes('unverified-route-dates'));
assert.ok(result.unverifiedVariants.unknownReturnFare.includes('missing-fixed-costs'));
assert.ok(result.unverifiedVariants.staleRouteTicket.includes('booking-records-need-review'));
process.stdout.write(JSON.stringify(result,null,2)+'\n');
