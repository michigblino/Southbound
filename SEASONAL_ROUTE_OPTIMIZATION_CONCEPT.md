# Seasonal route and stay-length optimization — concept

Status: DOCUMENTATION ONLY. No implementation, UI change or publication authorized.

## Goal
Smartly adapt dates, stop order and stay lengths within the rough trip period to visit season-dependent destinations at suitable times, without significant detours or budget increases. Patagonia is a must-visit example: trekking in austral winter may be difficult, with reduced access and harsh conditions. The app should aim for a better season without breaking the rest of the trip.

## Intended behavior
- Use rough trip start, end/duration and flexibility, plus must-visit destinations and fixed bookings.
- Distinguish seasonal suitability by location AND activity: Patagonia hiking differs from city tourism. Show preferred, acceptable and discouraged windows, provenance and confidence.
- Generate modest route reorderings and stay-duration shifts, preserving geographic continuity and avoiding needless backtracking.
- Recalculate transport legs, transfer days, host volunteering dates, waiting costs and the entire all-in budget for each candidate.
- Respect confirmed host windows, booked dates, visas, return deadlines, travel-hour constraints and user priorities.
- Compare baseline and suggested routes with dated stops, seasonal benefits, added detours/time and cost differences. Unknown costs stay unknown, not zero.
- Do not auto-apply any change. If no good seasonal solution fits the time window, clearly explain why.

## Patagonia illustration
For many Patagonia trekking activities, austral summer (approximately November to March) is generally more suitable than June to August. These are illustrative ranges, not verified destination-specific guidance. Torres del Paine, El Chalten, Bariloche and Ushuaia need separate seasonal and park-access data; even summer weather is variable.

## Technical follow-up
1. Define destination/region/activity seasonal suitability, climate normals, altitude and park-access evidence with source dates. Do not confuse long-term seasons with weather forecasts.
2. Use existing itinerary, trip calendar and route timing models as the baseline.
3. Generate constrained local swaps and limited duration adjustments; reprice every affected connection, including unknowns.
4. Evaluate trade-offs: seasonal suitability, detour, total time, all-in budget, confirmed bookings and volunteering compatibility.
5. Present a few explainable, feasible alternatives with map, calendar and explicit uncertainty.
6. Tests: opposite hemispheres, year boundaries, Patagonia winter, bookings, host windows, unknown fares, budget cap, no feasible solution.

## Acceptance criteria
- Winter trekking in Patagonia is flagged with a season-aware alternative when feasible.
- No silent removal of must-visit stops or changes to booked commitments.
- No invented transport prices or guaranteed climate claims.
- No major detours for marginal seasonal improvements.
- Baseline unchanged unless the user approves.

Priority: after current correctness audit of budget, volunteer savings and route dates. No code changes requested now.
