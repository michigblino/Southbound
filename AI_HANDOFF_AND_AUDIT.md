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

## Confirmed traveler constraints (2026-10-11)

- **Total target: €8,000 ALL-IN**: includes emergency reserve, return trip, insurance, visas, transport, lodging, food, activities, all remaining and already-paid trip expenses. The previously stated €12,000 is the upper spending cap, not the target.
- **Pace: balanced**, budget-conscious with realistic rest/recovery and transfer buffers; do not blindly minimize stay days.
- **Volunteering: maximum 30 hours/week.** Exclude known offers above 30 hours; unknown hours must be flagged for verification, not silently treated as compliant.
- Persisted app-side in `m.travelPreferences` with `budgetIncludesAll:true`, `pace:'balanced'`, `maxVolunteerHours:30`. Currently the itinerary still needs a proper preference-driven pacing model and a unified all-in budget. These constraints are confirmed, not requests for more clarification.

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

- Budget semantics are settled: €8,000 all-in including reserve; €12,000 upper cap. Still request only the **actual amount already paid** and any unknown fixed costs when necessary.
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

## 2026-10-11 preference update

- User confirmed €8,000 **all-in**, balanced travel with recovery buffers, and **30 h/week** volunteer limit.
- App persists these settings; known over-limit stage hours are excluded from volunteer candidates, unknown hours explicitly require checking.
- This is **not** a complete offer-level filter or full all-in budget engine. Prioritize implementing those before declaring any plan budget-compliant.

## 2026-10-11 follow-up: user-configurable profile

- Overview now starts with collapsible **Reiseprofil & Volunteering-Einstellungen**. Persisted under `m.travelPreferences` in existing `southbound-v3` localStorage, with budget goal/cap/reserve still in `m.goal/m.cap/m.reserve`.
- Fields: budget includes reserve/fixed costs, pace, maximum weekly volunteering hours, buffer days, desired/max volunteering weeks, weekly travel-day comfort, optional latest return, must-visit places, preferred volunteer platforms.
- The previous hard-coded reset of `m.travelPreferences` on each page load was removed. Profile changes recalculate suggestions on save.
- Current calculation use: budget definition controls *volunteer scenario gap only*, pace changes heuristic minimum stay, must-visit names protect stops from auto-shortening, volunteer hours filter known hours, desired/max weeks affect scenario potential, buffer affects earliest search start, platform changes external search site.
- **Not fully wired**: latest return date, travel days/week, full-budget treatment of exclusions, actual availability. Workaway/Worldpackers platform selection is external search only, not an API integration. Budget overview still displays reserve-inclusive totals; do not interpret budget-definition toggle as having rewritten the whole budget model.
- Test real Android and inspect save/persist/reload. The patch was JS-syntax-validated but no end-to-end UI automation run.

## 2026-10-11 global product direction and implementation branch

- **Worldwide product**: Southbound must support arbitrary world regions, currencies and custom routes; South America is the initial test trip, not a fixed scope.
- **Volunteer onboarding**: collect user-defined hard constraints (e.g. max 30 hours/week), stay length, activities, food, radius and date flexibility before recommending regions. The 30 h/week limit is a user-specific default, **not** a universal cap.
- **MVP**: recommend route-compatible volunteering regions and provide honest external Worldpackers/Workaway search links. User confirms actual host acceptance and conditions manually. **No scraping, fabricated host counts or claims of live availability.** Later explore licensed APIs/partnerships.
- **Feature branch**: `feat/global-trip-foundations`; leave `main` deployed and `southbound-v3` browser state untouched.
- Added `budget-engine.js`, `volunteer-matching.js`, tests, `ARCHITECTURE.md`, `TEST_PLAN.md`, `CHANGELOG.md`. These are independent foundation modules **not yet wired to the UI**.
- New budget engine distinguishes zero from unknown, paid from future and target from spending cap. Its `complete` flag only validates supplied line items: before claiming true all-in coverage, require all mandatory expense categories.
- New volunteer engine returns `eligible` / `needs-verification` / `excluded`; unknown host hours and unconfirmed availability cannot be called eligible.
- **Execution status**: files were committed through GitHub API. Full `node --test tests/*.test.cjs` and browser tests have **not** been run. No production UI change.
- **Next task**: run tests in a checkout, inventory the existing budget display paths, wire the engine only after reconciliation, then host-date itinerary constraints and onboarding. Read this handoff, then only relevant files; record test evidence after each change.

## 2026-10-11 continuation — explicit calendar foundation
- Added `trip-calendar.js` with transfer-day reservation, waiting days, confirmed-host start/end constraints and explicit conflict results. Added `tests/trip-calendar.test.cjs` for transfer, wait, arrival conflict, host end, two-host propagation and invalid date.
- **Not yet wired to visible UI**; waiting-night accommodation/food costs and cross-time-zone overnight transfers still need integration. Existing itinerary dates remain unchanged.
- No end-to-end/browser verification; full test suite pending. Next: wire calendar and all-in budget into existing UI carefully, without duplicate charges or resetting `southbound-v3`.

## 2026-10-11 integration update
- Feature branch `index.html` now loads `budget-engine.js`, `trip-calendar.js`, `volunteer-matching.js` and renders `sbBudgetIntegrityPanel(p)` before the existing overview budget. This is a **diagnostic**, not a replacement of the production all-in budget.
- Diagnostic shows paid + remaining estimated route costs + reserve, missing transport legs, confirmed-host date conflicts, and waiting-day count. Waiting-day food/lodging **not yet priced**; travel-day durations are currently passed as zero because no verified schedule is available. No all-in clearance is claimed.
- Main branch remains unchanged. Browser E2E and Node suite still not run. Next: check syntax/tests and add missing fixed-cost input and priced wait nights before using this figure for volunteer optimization.

## 2026-10-11 beta fixed-cost / waiting-cost integration
- Feature branch overview now offers optional **remaining** fixed-cost inputs (return trip, insurance, visas, equipment), saved in `m.fixedCosts` inside existing `southbound-v3`. Blank means unknown, numeric zero is explicitly free; paid amounts already in `m.actuals` should not be entered again.
- Added `wait-costs.js` and `tests/wait-costs.test.cjs`: waiting days before confirmed host start are priced with non-host lodging, food and other daily cost. Missing lodging is **unknown**, not free. The diagnostic shows missing categories and conflicts.
- **Critical limitations**: this remains a beta diagnostic; the existing overview and volunteer optimizer still use their legacy budget paths. Waiting days are not integrated into the main itinerary, transfer-day duration is still zero absent verified schedules, and fixed-cost coverage is user-entered (not independently verified). The beta budget engine's `complete` only means supplied inputs were populated; do not call this final all-in accuracy.
- Main remains untouched. Node test suite, JS syntax validation and mobile E2E are still pending. Next: execute tests, reconcile fixed costs and waiting costs into a single authoritative model, then fix `sbVolunteerScenario` to use it.

## 2026-10-11 budget fixes and automated checks
- Fixed beta budget diagnostic phantom transfers: stage balances now use explicit cost lines, with separate unknown-transfer flags.
- Volunteer scenario gap includes already-paid spending and known manually entered remaining fixed expenses. It still excludes unknown transfers and some waiting-night costs, so it is NOT an all-in verified target.
- Service worker cache bumped to v52 and new modules added to offline precache.
- GitHub Actions quality workflow added for JavaScript syntax and Node regression tests; results NOT yet verified.
- Main unchanged. Next: inspect CI, integrate one shared route-budget snapshot, price transfer days, test Android/mobile and storage persistence.

## 2026-10-11 shared route budget integration
- New `route-budget.js` exports `SouthboundRouteBudget.snapshot`. Both beta overview diagnostics and `sbVolunteerScenario` gap now call it. It reconciles paid spending, future stage costs minus per-stop paid amounts, reserve, remaining return/insurance/visa/equipment costs, and waiting costs when known. Missing transfers and missing fixed costs remain unknown. It never claims verified all-in completeness.
- **Important limitation:** volunteer scenario passes waiting cost as unknown until its revised route calendar is reconciled. Thus the displayed gap is a **known-cost lower bound**, not a verified total. Legacy main headline budget still uses dynamic-risk calculation; do not claim complete unification yet.
- Added six route-budget tests, offline precache update v53 and CI syntax check. Tests/CI outcomes not yet inspected; main remains unchanged.
- Next: inspect actual CI status, replace legacy main headline after reconciling price bands and fixed categories; calculate waiting and transfer-day costs for hypothetical volunteer scenarios; test mobile and persistence.

## 2026-10-11 follow-up: shared headline and completeness
- Beta budget panel now displays the shared `SouthboundRouteBudget.snapshot` total as a prominent provisional all-in subtotal. The old dynamic-risk headline is relabeled **separate legacy risk corridor**, not the authoritative all-in total.
- `route-budget.js` now marks `complete=false` and `goalStatus=unverified` when historical completed-stop expenses are unrecorded, waiting costs are unknown, or any required amounts are missing. Two additional regression tests added.
- **Outstanding:** actual GitHub CI status and browser/E2E are not verified. A provisional subtotal is not a full all-in forecast. Hypothetical volunteering route still lacks waiting-day repricing and transfer-day schedule integration. Production main unchanged.

## 2026-10-11 shared route timing
- Added `route-timing.js` and three Node tests. Both current budget panel and hypothetical volunteer sparroute now call `SouthboundRouteTiming.evaluate` to calculate calendar conflicts and waiting-night cost estimates from the same inputs. Previously the scenario forced waiting cost to unknown.
- Candidate route UI now warns on confirmed host date collisions. New module precached in service worker v54 and included in CI syntax checks.
- **Limitations:** transfer durations still zero, waiting accommodation uses existing normal nightly quote or original stop fallback (not a verified booking), and no real host API. Main untouched; CI/browser results unverified. Do not implement social route-sharing or RealGuessr integration without explicit later request.

## Product backlog — future collaborative travel (2026-10-12)
Decision: DOCUMENT ONLY, DO NOT IMPLEMENT YET.
- Private route sharing: owner can share only selected future stops or a date range via a revocable, expiring link. Never expose the full private itinerary by default.
- Invite existing friends to co-plan a trip, with explicit roles (view/comment/edit) and owner approval.
- Hostel acquaintances can request to join selected future legs without access to unrelated private plans; joining is not automatic. Support partial overlapping journeys and independent departure dates.
- Privacy/security requirements before implementation: opt-in location visibility, no public live tracking by default, revocation, access controls, abuse reporting, and protection of personal spending/host details.
- Suggested staged rollout: (1) read-only limited route sharing; (2) invitations and permissioned co-planning; (3) optional join-a-leg requests. Validate demand and data model before social discovery.
- RealGuessr/BeGuessr integration: explicitly deferred; do not plan or implement for now.
- Near-term priority remains unified all-in budget, realistic transfer/calendar constraints, honest volunteering net savings, automated tests and Android QA. Do not implement collaborative features without a later explicit user request.

## 2026-10-12 transfer-duration integrity
- `route-timing.js` now accepts optional `transferDaysByStop` (destination stop index -> integer travel days) and emits `unknownTransferDays`, `transferDaysVerified`. A missing duration is **not** a verified zero; schedule still uses provisional zero solely to render dates, and marks feasibility false.
- Overview and hypothetical volunteer scenario pass `m.transferDaysByStop||{}` without migrating or clearing stored data. UI warns on unknown durations and does not present optimized itinerary as date-verified.
- Added two route-timing tests for unknown duration and explicit 2-day downstream shift. No provider travel-time integration yet; durations are optional user/state input only, no invented metrics.
- Workflow status not confirmed: commit workflow query returned no PR-triggered runs; that endpoint does not cover push-triggered runs. Do not report CI green. Main unchanged.

## 2026-10-12 CI hardening
- `.github/workflows/quality.yml` now syntax-checks new route-budget/route-timing/integration tests and runs a dedicated `scripts/check-inline-scripts.cjs` using `vm.Script` rather than fragile shell-escaped inline regex. All `tests/*.test.cjs` are still executed via Node test runner.
- `tests/integration-assets.test.cjs` checks that budget/timing modules are present in HTML and PWA cache, cache version is present, and original localStorage key is preserved.
- **Status:** commits are in feature branch only. GitHub Actions push-run success has NOT been independently confirmed, and Android browser/E2E remain untested. Next action: inspect Actions run, fix any failures, then verify mobile UI, persistence and volunteer budgets.

## 2026-10-12 independent runtime smoke checks
- Retrieved current `budget-engine.js`, `route-budget.js`, `trip-calendar.js`, `wait-costs.js`, `route-timing.js` and `volunteer-matching.js` directly from the feature branch and evaluated their browser-global modules in an isolated V8 runtime.
- **9/9 smoke assertions passed**: missing transfer, blank fixed cost, paid offset, completed stop, unrecorded history, unknown waiting cost, priced host waiting, waiting-day count, and unknown transfer duration. Additional baseline checks passed for €540 total, explicit two-day transfer shifting arrival to 2027-01-05, and no missing duration with explicit value.
- This does **not** execute Node's `node:test` suite or prove GitHub Actions green; it also does not test HTML rendering, offline service worker, persistence in a real browser, or Android. Do not label these verified until tested in their environments.
