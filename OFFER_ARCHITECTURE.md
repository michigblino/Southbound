# Unified offer architecture — phase 1

This module is **not** a live-price integration. `offer-engine.js` provides a shared, deterministic offer contract for transport, lodging, volunteering and activities. It currently has no UI connection and does not change existing budget calculations or browser localStorage.

## Contract
`SouthboundOffers.normalize(input, todayISO)` accepts `type`, `id`, `status`, `price`, `currency`, `source: {name,url}`, `checkedAt`, optional `availableOn`, `providerAvailability`, `booked`, and `details`. `compare(offers,todayISO)` sorts by evidence quality, then price. `priceKind` distinguishes `sourced`, `estimate`, `unknown`.

No manual entry can claim live provider availability. A source URL and price alone do not establish availability. Dates are validated. Currently, evidence becomes stale the next day (conservative default); real providers may need different TTLs. `booked` must only be set from an actual user confirmation or provider booking evidence, not from an offer search.

## Next engineering tasks
1. Evaluate legal provider APIs and regional coverage **before** committing to providers or presenting live data. Do not scrape against terms. Keep API keys server-side (not GitHub Pages).
2. Define typed adapters per category, date-specific availability, all-in pricing (tax, baggage, transfers, cleaning, fees, host membership), currency conversion with timestamp, and provenance.
3. Transport: match origin/destination/date; compare total journey costs. Existing index-keyed `transportOffers` can become invalid after route reorder; migrate to stable leg identifiers before using live prices.
4. Lodging: occupancy, check-in/out, tax, cancellation, total nights. Preserve existing `hostelQuotes` and confirmed volunteer-night precedence.
5. Volunteering: public host listings are **not confirmed placement**. Respect <=30 h/week, host date availability, food, fees, transfer and net savings; require explicit host confirmation before free nights.
6. Activities: departure date, inclusions, operator, cancellation, optional vs planned spend.
7. Integrate offer UI and itinerary budgeting only after category adapters and regression tests; preserve `localStorage['southbound-v3']` and existing route data. Keep missing data explicitly unknown.
8. Run `node --test tests/*.test.cjs`, JavaScript syntax checker, Playwright and mobile QA before merging.
