# Southbound architecture — global travel foundations

## Goal
World-wide, user-configurable travel planning. South America is one example trip, **not** a fixed product boundary.

## Existing production app
`index.html` and its `sb2` interface remain live on `main`. User state is in `localStorage['southbound-v3']`; do not clear, replace, or silently migrate it. Existing itinerary and transport models still run the production UI.

## New independent modules (feature branch only)
- `budget-engine.js`: pure all-in expense reconciliation. Inputs: paid costs, emergency reserve, itinerary stays and transfers, fixed costs (insurance/visa/return if not already a leg), unknown-cost allowance, target and cap. Outputs include unknown line count and a budget status that cannot say 'within' if inputs are incomplete. **Not connected to the production UI yet.**
- `volunteer-matching.js`: source-neutral filter logic with user-configurable max hours, stay length, radius, activity interests and meal preference. Three states: `eligible`, `needs-verification`, `excluded`. Unknown host hours or availability never imply a confirmed match. **Not connected to a live host feed.**

## Data provenance and integrity
- Host records must carry platform, stable host ID, listing URL, hours/week, accommodation/meals, minimum stay, coordinates, availability evidence and checked-at date when available.
- Public search links are discovery links, **not verified counts, dates or offers**.
- Future geographic data must use canonical place IDs/coordinates, not indexes into a South America stop array.
- A confirmed free bed must only affect the budget when host acceptance is explicitly confirmed.
- The budget module does not infer unlisted fixed costs. `complete` means all **provided** lines have values, not that every real-world expense has been supplied. Production UI must require a checklist of fixed costs before claiming a fully reconciled trip.

## Next integration steps
1. Inventory all existing budget UI paths; replace partial goal comparisons only when all categories are reconciled, with regression fixtures.
2. Implement explicit travel-day and confirmed-host date constraints; propagate shifts through route.
3. Connect volunteer onboarding to persisted travel preferences, with backward-compatible defaults and no storage reset.
4. Build route-region suggestions with external Worldpackers/Workaway searches; allow users to enter confirmed host details.
5. Later assess permitted API/partner data integration and actual verified transport quotes.

## Tests
`node --test tests/*.test.cjs`. This branch was authored through GitHub API; full Node test execution and browser E2E still need to be performed in a checked-out repository.

## Explicit calendar foundation
`trip-calendar.js` provides pure date-only scheduling. Each stage has `days`, optional `transferDays` and optional `confirmedHost:{from,to}` (end exclusive). The module reports arrival, waiting days, actual stage dates and conflicts. It does **not** price waiting nights or convert between time zones; callers must price and validate these before presenting a final budget.

## Beta integration: fixed costs and waiting nights
The feature-branch overview contains `sbBudgetIntegrityPanel` and `bindSbFixedCosts`. Four *remaining* cost fields are persisted in `m.fixedCosts` under the existing localStorage key; empty is unknown, 0 is a user-asserted zero. `wait-costs.js` multiplies calendar waiting days by normal (non-host) lodging, food and other daily costs, flagging missing inputs. These amounts currently appear only in the diagnostic, **not** the authoritative trip total or volunteer optimization.

## Shared route budget snapshot
`route-budget.js` is the common adapter from itinerary `items` and browser state into `SouthboundBudgetEngine.calculate`. It is called by the beta overview and volunteer gap calculation. `snapshot` returns unknown-transfer IDs and incomplete reasons; `allInVerified` deliberately remains false pending full real-world validation. `waitingCost` is supplied by `wait-costs.js` for the current itinerary; volunteer scenarios currently flag waiting as unknown. Legacy risk-band headline is not migrated yet.
