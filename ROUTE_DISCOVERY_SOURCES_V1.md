# The Worn Road — OpenStreetMap Place Adapter V1

## Purpose and boundaries

route-discovery-sources.js adds an explicit, optional regional place-discovery adapter using OpenStreetMap data through the Overpass API. It is a source adapter, not a global route engine or a booking integration.

- Call TheWornRoadRouteSources.createOpenStreetMapPlaceAdapter().searchPlaces({ bbox: [south, west, north, east], categories, limit }) only in response to a user action or an explicit route-search workflow.
- Bounding boxes must be valid and may not cross the antimeridian. No whole-world query, automatic grid tiling, background polling, or automatic retry loop is implemented.
- The default request is limited to 250 results, has a bounded server/client timeout, and successful results are cached in memory for 15 minutes per adapter instance. HTTP/rate-limit, malformed-response and network failures return an unavailable result; failures are not cached.
- The returned nodes carry OpenStreetMap source metadata, attribution, ODbL licence and retrieval date. Unnamed or malformed elements are discarded. OSM place names and administrative tags can be incomplete; country codes are not silently converted to country names.
- The adapter returns no transport edges, timetables, fare data, accommodation availability, safety advisories, or volunteering offers. It does not add dailyCost or fare values. When these are missing, route-discovery.js must keep the all-in budget unverified.

## Use and licensing

OpenStreetMap data is available under the Open Database License (ODbL). Display an appropriate, legible attribution such as “© OpenStreetMap contributors” and link it to https://www.openstreetmap.org/copyright. The source metadata is not a substitute for displaying the attribution in any user-facing map or result.

Official references:
- OpenStreetMap copyright and licence: https://www.openstreetmap.org/copyright
- OpenStreetMap Foundation attribution guidelines: https://osmfoundation.org/wiki/Attribution_Guidelines
- Overpass public-instance guidance: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html

## Production warning

The public Overpass service is shared infrastructure and explicitly discourages using its public instances as the backend for a broadly used app. This adapter is a bounded development/prototype integration, not a promise of production-scale availability. Before public beta, move queries to a managed/licensed provider or an appropriately operated instance with usage controls, caching, monitoring, and an attribution review. Do not route requests through a public proxy or add an API key to browser code. This change does not configure Cloudflare or any backend.

## Validation

tests/route-discovery-sources.test.cjs covers successful response normalization, attribution, HTTP 429, malformed responses, network failure recovery, bounded-query caching, invalid query handling, and the rule that missing prices remain unknown. Tests use mocked provider responses and do not make live requests.
