# The Worn Road — Route Discovery V1

## Scope

V1 adds a global, data-driven discovery core in route-discovery.js. It accepts a source-attributed graph of places and directed transport connections plus a structured travel brief, then returns comparable budget-focused, balanced and adventure-focused candidates. The Manaus–Tabatinga–Santa Rosa–Iquitos corridor exists only in the synthetic unit-test fixture; there is no corridor-specific engine logic.

It does not ship a fabricated global destination database, scrape travel sites, claim that GitHub Pages has live provider access, or infer that a route is safe.

## Inputs and evidence contract

The travel brief includes origin, start date, budget target and cap, currency, minimum/maximum duration, region/country/continent, must-see/avoid places, pace, adventure style, safety tolerance, and volunteering limits.

Every graph place and transport edge must include source provenance: HTTPS URL, title, checked date and source kind. Costs are classified as provider-live, official-tariff, historical-reference, model-estimate or unknown. Model estimates require an explicit method. Provider-live evidence older than one day is not used as a live price. Different currencies without a verified conversion are treated as unknown. Unknown fares never become zero.

Places may provide daily-cost bands, stay-duration guidance, season flags and volunteer listings. Transport edges are directed and include mode, duration range, fare evidence, seasonality and route-specific safety evidence.

## Output and safeguards

Each candidate carries place and leg sources, duration range, known cost subtotal, unknown cost lines, quality counts, season flags, safety evidence, volunteer matches and an explanation. If any required cost is unknown, all-in minimum/maximum remain null and budget status remains unknown. Target and cap are distinct. The lack of a warning is not a safety guarantee; conservative preferences can exclude routes with high-severity warnings in the supplied evidence.

Volunteering is not assumed to be free. Only a source-backed host marked confirmed, matching work hours and stay length, with lodging included and a source-backed lodging cost component, can reduce estimated accommodation cost. Food, platform fees, work conditions, availability and operator legitimacy need independent confirmation.

## Not yet connected to production sources

This is the discovery core, not a connected worldwide provider service or replacement UI. The current GitHub Pages app has no live global route graph. The engine has no embedded world dataset; production adapters must populate it from permitted sources.

Next steps: (1) license-reviewed destination data with required attribution, (2) official transport schedules/tariffs and licensed provider APIs, (3) official geo-scoped travel advisories with date and affected area, (4) licensed volunteering data or direct platform links, and (5) discovery UI and data-quality display that preserves existing local itinerary and booking state. No scraping or model training on restricted review content.

## Verification

Run node --test tests/route-discovery.test.cjs, npm run test:unit and npm run test:browser. Existing local-storage keys, route state and bookings are not changed. Cloudflare workflow/configuration is not changed.
