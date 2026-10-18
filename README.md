# The Worn Road

Budgetorientierter Reiseplaner mit lokal gespeicherten persönlichen Reise- und Budgetdaten. Die Anwendung wird über GitHub Pages aus dem main-Branch bereitgestellt.

## Route Discovery V1

Ein global ausgelegter, quellenbasierter Routen-Discovery-Kern liegt in route-discovery.js. Er erzeugt aus einem strukturierten Reisebrief und einem quellennachgewiesenen Orts-/Transportgraphen vergleichbare Kandidaten für Budgetfokus, ausgewogene Reise und Abenteuer. Fehlende Fahrpreise bleiben unbekannt; unvollständige All-in-Kosten werden niemals als budgetbestätigt dargestellt.

Die Engine führt selbst keine Live-Abfragen durch und enthält keine hardcodierte Weltkarte. Das aktuelle GitHub-Pages-Deployment verfügt noch nicht über einen globalen Provider-Graphen oder live verbundene Transport-APIs. Details stehen in ROUTE_DISCOVERY_V1.md.

## Qualitätsprüfung

- Unit-Tests: npm run test:unit
- Browser-Regressionen: npm run test:browser

Die vorhandene Reiseroute, Buchungen und lokale Nutzerdaten bleiben getrennt von der Discovery-Engine. Cloudflare wird nicht verändert.
