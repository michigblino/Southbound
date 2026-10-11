# Southbound test plan

## Automated
- Existing itinerary regression tests (unconfirmed beds, return-home, reordered routes, changed days).
- New budget tests: paid + remaining + reserve counted once, goal vs cap, zero cost vs unknown, missing transfer blocks confident budget status.
- New volunteer tests: 30 h hard maximum, unknown hours flagged, 20 km boundary, host deduplication, food requirement.
- Command: `node --test tests/*.test.cjs`.

## Pending integration / browser QA
- Mobile Android viewport and globe gestures; service worker update and offline fallback.
- Persistence of `southbound-v3` through upgrade and refresh.
- Confirmed host starts and ends after transfer and arrival buffers.
- Worldwide custom city pricing, FX staleness, international return, insurance and visa coverage.
- External volunteer links and truthful unknown host counts.
- Reconcile legacy UI and new UI totals against one engine.

**Status:** Tests have been added but not yet executed in this environment. Do not mark as passing until executed.

- Calendar tests: travel-day shift, confirmed host waiting, late-arrival conflict, host-end conflict, chained host commitments and invalid dates. Added, not yet executed.
