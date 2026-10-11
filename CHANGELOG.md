# Southbound changelog

## 2026-10-11 — global foundations (feature branch)
- Product scope changed from South America-specific to worldwide, user-configurable travel planning.
- Added pure all-in budget engine, explicitly distinguishing missing amounts from zero.
- Added source-neutral volunteer profile matching; max 30 h/week is the default, unknown data is flagged.
- Added automated test fixtures and compact AI architecture/test documentation.
- Existing production UI and browser data are unchanged. Integration, execution of tests and real-host sourcing are still pending.

- Added `trip-calendar.js` and six calendar regression tests for transfers and confirmed volunteering commitments. No production UI wiring yet.

- Connected the new budget/calendar modules to a clearly marked beta diagnostic panel in the overview on the feature branch. No production deployment; costs and waiting nights remain incomplete.

- Added `wait-costs.js`, waiting-cost tests, and beta overview inputs for remaining return/insurance/visa/equipment expenses. Waiting days now have a priced estimate where normal lodging is known; missing costs remain flagged.

- Fixed phantom transfer placeholders in beta diagnostics and counted paid and known remaining fixed expenses in preliminary volunteering gap.
- Updated offline cache to v52; added GitHub Actions syntax and Node test workflow. CI results not yet verified.

- Added `route-budget.js` as the shared calculation path for beta overview and volunteering budget gaps, with six regression tests; offline cache v53 and CI syntax coverage.

- Promoted shared provisional budget subtotal in beta overview; relabeled legacy risk headline; strengthened incomplete-budget flags and added two tests.

- Shared current/candidate route timing and waiting-night calculation through `route-timing.js`, added three tests, host conflict warning and offline cache v54.

- Added explicit unknown-transfer-duration tracking and date-verification warnings; two new route-timing regression tests. No fabricated transfer-day estimates.
