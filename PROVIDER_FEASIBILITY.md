# Provider feasibility and integration gates — 2026-10-12

This is a source-based feasibility assessment, **not** confirmation of partner approval, coverage in every South American city, or access to live quotes. No API credentials are held in this repository.

## Official candidates

| Category | Candidate | Evidence | Access gate | Next validation |
| --- | --- | --- | --- | --- |
| Lodging | Booking.com Demand API | Search and availability endpoints return date/guest-dependent properties, best price and room availability: https://developers.booking.com/demand/docs/accommodations/about-accommodation | Managed Affiliate Partner, contract, API key and affiliate ID: https://developers.booking.com/demand/docs/getting-started/prerequisites | Apply for access; test hostels in 5 representative South American stops with actual dates, taxes and guest counts |
| Activities | Viator Partner API | Product content, pricing, real-time availability for eligible partner tiers: https://docs.viator.com/partner-api/technical/ | Affiliate/Merchant partnership and tier-specific endpoint access | Confirm allowed endpoints and coverage in Cusco, Patagonia, Rio, etc.; test inclusive prices and cancellation |
| Flights | Amadeus Self-Service | Flight Offers Search and Flight Offers Price: https://admin.developers.amadeus.com/self-service/apis-docs/guides/developer-guides/faq/ | Production booking has additional legal and ticket-issuance requirements | Start with non-transactional flight search; confirm coverage and costs |
| Volunteering | Workaway / Worldpackers | Workaway public host calendar: https://www.workaway.info/de/hostlist ; Worldpackers search dates: https://www.worldpackers.com/de/search/ | No public integration API established by this audit | Request written API/data permission; do not scrape or interpret a green calendar as host confirmation |
| Ground transport | No selected provider yet | Fragmented bus/ferry operators; no provider proven | Evaluate legitimate inventory partners and operator APIs | Measure city-pair coverage and fare reliability before selecting |

## Rules for implementation
- GitHub Pages is static. Secrets and provider calls requiring private tokens must run in a server-side proxy with rate limits, caching, minimal logging and clear costs. Never put secrets in index.html or client-side JavaScript.
- Request quotes for **exact dates, party size and route**. Normalize provider currency, taxes, booking fees, baggage, transfers and cancellation terms before comparison.
- Treat price, availability, booking confirmation and host acceptance as separate facts. The shared offer-engine.js is a preliminary contract, **not** a complete provider adapter.
- Never substitute a search-page link or an estimated price for a bookable quote. Label each price with source and checked timestamp. A verified listing does not imply volunteering acceptance.
- Preserve localStorage['southbound-v3']; do not overwrite user trip data. Do not merge API integrations before contract tests, unit tests, browser CI and mobile review.

## Next deliverable (requires access decisions)
1. Provider adapters behind a common server-side interface, initially one provider per category, with fixture-driven tests.
2. Search UI per itinerary stage, showing sourced offers and fallback estimates separately.
3. Net all-in itinerary budget recalculation with confirmed lodging/volunteering precedence and date-dependent transport.
4. Analytics of coverage, staleness, API cost and failure rate; explicit no-offer state.
