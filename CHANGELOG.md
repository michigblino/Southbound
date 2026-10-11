# Southbound changelog

## 2026-10-11 — global foundations (feature branch)
- Product scope changed from South America-specific to worldwide, user-configurable travel planning.
- Added pure all-in budget engine, explicitly distinguishing missing amounts from zero.
- Added source-neutral volunteer profile matching; max 30 h/week is the default, unknown data is flagged.
- Added automated test fixtures and compact AI architecture/test documentation.
- Existing production UI and browser data are unchanged. Integration, execution of tests and real-host sourcing are still pending.

- Added `trip-calendar.js` and six calendar regression tests for transfers and confirmed volunteering commitments. No production UI wiring yet.

- Connected the new budget/calendar modules to a clearly marked beta diagnostic panel in the overview on the feature branch. No production deployment; costs and waiting nights remain incomplete.
