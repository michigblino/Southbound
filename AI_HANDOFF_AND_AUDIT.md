# Southbound — AI handoff & audit (2026-10-11)

> **Read this file first.** This is a code review and handoff, **not** a claim of complete browser/E2E verification. No API credentials are stored in the repository. Do not publish personal trip data.

## One-minute orientation

- Repository: `michigblino/Southbound`, branch `main`; GitHub Pages: https://michigblino.github.io/Southbound/.
- Front end: one large `index.html`, with legacy UI hidden and the newer IIFE `sb2` driving the visible interface. Browser persistence: `localStorage['southbound-v3']`. Do not reset it during migrations.
- `STOPS` tuples: `[name,country,lat,lon,days,bed,food,activities,other,inboundLow,inboundHigh,mode,safety,wikiTitle,optionalReturnMarker]`. Original 26 stops plus `m.customStops`; active order via `m.routeOrder` and `m.excluded`.
- Pure-ish model: `SouthboundItinerary.plan` in `itinerary.js`; route transport model `transport-estimate.js`; city price references `cost-references.js`; route risk `dynamic-risk.js`; savings `savings-advice.js`.
- The 3D globe is shared by overview and add-stop; `sbInitWorldGlobe(elementId,selectable)` in `index.html`, Globe.gl CDN. Globe pins, arcs, and HTML overlays have distinct altitudes. Two-finger zoom uses native OrbitControls.
- PWA: bump `CACHE` version in `sw.js` after changes.
- Tests: `node --test tests/*.test.cjs`. Run tests and mobile browser QA after every change. This audit did **not** execute full repo tests: GitHub clone was unavailable in the analysis environment; a small isolated itinerary runtime smoke test passed.

## Product intent / acceptance criteria

1. Route budget should **never count unconfirmed volunteer lodging as free**. Confirmed host nightly cost is used only if `m.vol[i] === true && m.volunteerDetails[i].confirmed === true`. The 2026-10-11 fix in `itinerary.js` and `savings-advice.js` corrects this for their calculations.
2. A return-home stop (`s[14] === 'return'`) has **zero days and zero stay**, but inbound travel still costs money. User may mark the last stop as return.
3. Show route on interactive globe. Surface overlays at low altitude; transfer price and transport symbol only when zoomed in; photos even closer. Keep flight arcs above surface. Avoid overlapping labels; cluster/declutter for dense legs. Mobile pinch zoom must be tested on real Android.
4. With no confirmed volunteering, prefer a compact, **not exhausting** baseline itinerary. Do not shorten confirmed bookings, visited stages, or nature highlights without approval.
5. Volunteering recommendation should prioritize **verified counts of matching hosts within 20 km** and the earliest feasible start date (+2–3 day buffer), then potential lodging savings, travel time, sightseeing, and work hours. **Display selected recommendations chronologically**, even if selection is ranked by opportunity density. Show enough stops to close the *real* budget gap; no made-up host counts.
6. Every host confirmation must shift downstream itinerary dates; date conflicts, buffer nights, and waiting costs must be accounted for. Host availability and booking status must remain explicit.
7. Keep recommendation cards short: city, start date, number of qualifying hosts (or 'unknown'), potential, one external search link, confirm action. No individual listings in overview.

## What was actually verified

- Worldpackers public search https://www.worldpackers.com/de/search/ shows month availability filters and individual offers; https://help.worldpackers.com/en/hc/help-with-applying-and-confirming-trips-at-worldpackers describes applications/approvals and host response signals.
- Workaway public hostlist https://www.workaway.info/en/hostlist has availability-from/to and monthly calendar statuses. Search results do not equal guaranteed acceptance.
- Brokepackr https://brokepackr.com/cost-index/latam is a publicly accessible **city-average index**, not a quote for the travel dates. Its transport column is **local** transport, not intercity tickets.
- `transport-estimate.js` uses distance and heuristics, **not actual prices, routes, schedules, or availability**. Flight arcs do not prove a flight exists. Airport/bus/rail operator checks are still required.
- FX module `cost-references.js` uses Frankfurter API, but freshness depends on successful fetch and persisted `m.fx`. Audit stale FX and missing rate handling.
- Two-stage isolated runtime smoke test on 2026-10-11: unconfirmed stop with legacy `bed=0` now receives positive lodging estimate; confirmed free host receives zero; shortening stop shifts following start date.

## Audit findings and priorities

| Priority | Finding | Why it matters | Next action |
|---|---|---|---|
| P0 | **Budget gap uses partial model**: `sbVolunteerScenario` compares `after.known + reserve` with goal. `known` omits unknown-leg placeholders, user actuals, uncertain ranges, visas, insurance and return flight. | Can recommend too few hosts or wrongly say budget achieved. | Derive from same full, reconciled budget computation as overview; show gap range and missing costs; add regression tests. |
| P0 | **No verified host counts**: `m.volunteerCounts` is optional manual data; without it rankings use city-size heuristics. | Not a ranking by real number of available opportunities. | Obtain permitted Worldpackers/Workaway integration or user-imported structured search results; count distinct hosts (dedupe cross-platform), filter by 20 km coordinates, date overlap, minimum stay, response status, and data timestamp. Never fake counts. |
| P0 | **Confirmed host date is not authoritative**: confirmation saves `from/to` and sets duration, but `itinerary.js` only accumulates days from previous stop; it does not align the arrival with confirmed host start. | Confirmed host may be scheduled before arrival or after planned start without buffer costs. | Build explicit travel days, waiting nights and host start/end constraints; flag impossible overlaps; test chain of 2 confirmed hosts. |
| P0 | **Legacy default free beds**: Salvador, Medellín, Cusco, Sucre, Valparaíso have original `STOPS[][5]=0` even without a host. | Underestimated budget in older calculators. | Itinerary/savings fix applied; audit *all* other cost paths and migrate defaults to explicit nullable 'unknown' lodging. |
| P1 | **Intercity transport is synthetic**: great-circle km × multipliers, route/mode guesses; no checked operator, fare date, luggage or departure date. | Can significantly distort route and budget; country-border crossings may not be feasible. | Add per-leg `verifiedOffer` with operator, URL, departure date/time, currency, luggage, checkedAt, cancellation policy; retain heuristic as clearly labeled fallback. |
| P1 | **Travel time omitted from itinerary calendar**: `itinerary.js` advances by nights only; transfer hours are not reserved. | Overoptimistic dates and volunteer earliest starts. | Reserve realistic transfer/arrival buffer and handle overnight departures/time zones. |
| P1 | **Cost reference index keyed to original stop IDs**: `cost-references.js` uses hardcoded indices. | Custom stops cannot get proper location-based references, reordered/custom location may mismatch. | Match by canonical city/country/coordinates, use provenance + date; include seasonality (Carnival, Patagonia, peak dates). |
| P1 | **Budget semantics**: `known`, `t.mid`, reserve, paid spending, unknown-leg placeholders and cap are different figures. | User may think a recommendation closes the entire gap when only partial costs were compared. | Centralize budget calculation and invariants: total = paid + future verified/estimated costs + reserve + missing-cost allowance, without double-counting. |
| P1 | **Globe overlays**: transfer labels are midpoint lat/lng and small surface altitude; flight arc is elevated. | Badge may not follow exact curved arc and may overlap at high density. | Compute arc midpoint geometry, declutter by screen-space and test at 320–430 px mobile widths. |
| P1 | **Host opportunity economics**: displayed 'potential' = bed/night × proposed volunteer duration, not **incremental net savings**. | If volunteer stay adds days, food, local travel, fees, hours and displaced sightseeing, gross lodging value exaggerates savings. | Compare baseline vs volunteer route at same itinerary constraints: extra days, meals, transport, platform fees, seasonality, risk; report net savings range. |
| P1 | **Sparroute minima heuristic**: normal city 3d, nature 4–6d, special city 5d. | Does not validate attraction opening days, transit fatigue, weather, permits, traveler priorities. | Introduce user-configurable minimum stay, max travel days/week, recovery buffer and hard commitments. |
| P2 | **No true mobile/E2E QA**. | Syntax checks do not catch broken touch interactions, render order, stale service-worker cache or layout. | Playwright mobile viewport + real Android pinch QA, offline/refresh/restore tests, screenshot regression. |
| P2 | **Public CDN dependencies**: globe/tiles/photos depend on network and third-party hosts. | Offline travel usage may break. | Graceful fallback, explicit data use, cache policy and licensing checks. |

## Specific workflow to implement next

1. Build `volunteer-opportunities.js` as a pure module taking itinerary dates, 20-km radius, host records and date buffer; return eligible counts, unknown counts, freshness, best minimum stay and source URLs. Do not count individual job listings twice for one host.
2. Connect a **licensed/permitted** API or explicit user import. Search-site URLs are *not* a substitute for a verified host count. External site date filters may need manual input; do not pretend a Google search query sets site filters.
3. Centralize one budget calculation. Compare base itinerary and each hypothetical volunteer itinerary, including accommodation, food, extra days, transport, paid costs, reserve and missing-leg uncertainty. Recommend only enough hosts to close the **conservative** target; if insufficient, state gap.
4. Select cities by qualifying-host count first, then incremental savings and attractions; show selected cities **in chronological route order**. Host confirmation locks actual dates and recomputes all later stages.
5. Add fixtures for no host, zero-host city, two nearby hosts (dedupe), radius 19.9/20.1 km, stale counts, 2-day buffer, sequential confirmations, changed route order, return-home and cap/goal differences.
6. Confirm behavior on mobile; do not label estimates as checked fares.

## Data needed from user (ask compactly)

- Budget: is €8,000 target **including** €2,200 reserve, insurance, return flight, visas and pre-paid travel? Is €12,000 a hard cap? What has already been paid?
- Travel constraints: hard latest return date, must-visit places, minimum stay for highlights, comfortable number of travel days per week.
- Volunteer preferences: acceptable work hours/week, minimum/maximum commitment, shared/private accommodation, food inclusion, languages, platforms and willingness to use an account/API/export.
- Actual fare evidence: booked flight tickets and verified transport/hostel quotes, if available.

## Efficient AI working protocol

1. **Read this file and the user's current issue first**, then fetch only relevant files; avoid re-reading all of `index.html` unless needed. Use exact symbol searches and small excerpts.
2. Keep a short changelog in this file after each substantial update: change, evidence, tests run, remaining risk.
3. Change one module at a time; run `node --test tests/*.test.cjs`, JS syntax validation, and targeted UI test. Only claim a test was run if it really ran.
4. Commit with meaningful message; bump `sw.js` cache on deployed code changes. Avoid speculative broad regex replacements without checking exact matches.
5. Preserve `southbound-v3` localStorage and user commitments; add migration tests before changing data schema.
6. Prefer honest labels: **confirmed**, **operator-verified on date**, **public reference average**, **distance estimate**, **unknown**.
7. Summarize changes and blockers in 3–6 lines for the user; never overstate a live integration.

## 2026-10-11 changelog

- Globe transfer/photo overlays moved close to the surface; volunteer proposals displayed in chronological order.
- `itinerary.js`: unconfirmed host with legacy zero lodging no longer gets free accommodation.
- `savings-advice.js`: same confirmed-host rule; ignore return stops.
- Added regression tests for unconfirmed host lodging, confirmed free lodging, and return-home stay.
- Verified Worldpackers and Workaway public search/filter capabilities, but **not** live host counts, bookability, or ticket prices.
- Remaining top blockers: true host data feed, full-budget gap reconciliation, confirmed host date alignment, real transport quote integration, mobile E2E.
