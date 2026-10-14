# The Worn Road — Provider-Suche V1 (2026-10-14)

## Was jetzt funktioniert
- Unter **Buchungen → Angebote vergleichen → Angebote finden** werden Unterkunfts- und Transfer-Suchanfragen aus tatsächlichen Reiseetappen generiert, mit Abreisedatum, ggf. Check-in/out, Personenzahl und bei Transfer der vorangehenden Etappe.
- Booking.com öffnet eine nutzerseitige Suche mit Ziel, Datum und Personenzahl. Hostelworld, Busbud und Omio werden aus Vorsicht derzeit auf ihre offiziellen Startseiten geleitet; dort sind Ort/Daten selbst einzutragen.
- Klick auf **Live-Angebote abfragen** fragt ausschließlich denselben Origin unter `POST /api/offers/v1/search` ab. Ohne konfigurierten, zugelassenen Backend-Provider lautet die Antwort „Anbieter-API nicht verbunden“; **keine Fantasie-Preise, kein Scraping**.
- Eingehende Provider-JSON-Antworten müssen Anfrage, Ziel/Zeitraum, Reisende, Route, EUR-Gesamtpreis inkl. Gebühren, HTTPS-Quellenlink, Prüfdatum, `sourceMethod:'provider-api'`, `providerRequestId` und `availabilityConfirmed:true` erfüllen. Sonst erscheinen sie nicht. Selbst zugelassene API-Preise vor Buchung aktualisieren.
- Das Ergebnis wird nur temporär angezeigt, weder im lokalen Reise-Status gespeichert noch automatisch als bestätigt/bezahlt ins Budget übernommen; die bestehende manuelle Angebotsliste und das Buchungsregister bleiben unverändert.

## Partner- und Datenrealität
| Anbieter | Möglich | Voraussetzung |
|---|---|---|
| Hostelworld | hostelbezogene Verfügbarkeit/Preis | Partner-API-Vertrag, Zugangsdaten |
| Booking.com | Unterkünfte/Verfügbarkeit | Managed Affiliate Partner, Affiliate ID + API Token |
| Expedia Rapid | Unterkünfte/Verfügbarkeit | freigeschalteter Partner-Account + API-Zugang |
| Busbud | Bus-/Bahnverbindungen in vielen Ländern | B2B-Distribution-Partnerschaft |
| Omio | Fahrten / Metasearch / Partner-Links | B2B/API oder Affiliate-Zugang |
| Amadeus | Hotels/Flüge | inzwischen Enterprise-Zugang; Self-service ist eingestellt |

Quellen:
- https://partner-api.hostelworld.com/
- https://developers.booking.com/demand/docs/getting-started/prerequisites
- https://developers.expediagroup.com/rapid/setup
- https://www.busbud.com/en/distribution
- https://www.omio.com/corporate/omio-b2b/
- https://developers.amadeus.com/

## Serverseitiger Anschlussvertrag
```http
POST /api/offers/v1/search
Content-Type: application/json

{"type":"lodging","stageId":2,"fromStageId":null,"fromName":"","destination":"Salvador","startDate":"2027-01-08","endDate":"2027-01-18","people":1}
```

Nur ein **lizenzierter Serveradapter**, nicht das öffentliche GitHub-Pages-JavaScript, darf Provider-Token besitzen. Er muss erlaubte Provider-Domains serverseitig fixieren (SSRF-Schutz), Anfragen authentisieren und drosseln, von/an den Anbieter stammende Zeiten/Gebühren/Erstattungsregeln und Rate-ID prüfen, Antworten auf den passenden Nutzer-Request binden, und erst nach echter Verfügbarkeitsprüfung folgendes Format liefern:
```json
{"status":"ok","verifiedByServer":true,
 "query":{"type":"lodging","stageId":2,"fromStageId":null,"destination":"Salvador","startDate":"2027-01-08","endDate":"2027-01-18","people":1},
 "offers":[{"type":"lodging","stageId":2,"fromStageId":null,"startDate":"2027-01-08","endDate":"2027-01-18","people":1,
 "title":"Anbieterangebot","provider":"Lizenzierter Partner","baseEUR":100,"feesEUR":20,"totalEUR":120,"currency":"EUR",
 "sourceUrl":"https://example.org/property","checkedAt":"2026-10-14","providerRequestId":"real-provider-request-id",
 "sourceMethod":"provider-api","availabilityConfirmed":true}]}
```
**Achtung:** Das JSON ist ein **rein synthetisches Schnittstellenbeispiel** und darf niemals als echter Preis/aktuelle Verfügbarkeit angezeigt werden. Der öffentliche Client prüft die Form, aber die Authentizität und Berechtigung muss der Backend-Adapter sichern. Der Server soll `Cache-Control: no-store` setzen; nicht erforderliche private Reisedaten nie übertragen. Fehler: `503` oder `404`, keine Scheinangebote.

## Qualitäts- und Rollout-Grenzen
- Node- und Chromium-Tests prüfen Suchanfragen, fehlende APIs, abgeänderte/überalterte Quotes, XSS, Etappen-Kontext, mobiles Layout und keine Budget-/Buchungsänderung.
- Offline-Cache `southbound-v83`; öffentliche Assets mit Backend-unabhängigen Suchlinks. Der Cloudflare-Worker bleibt deaktiviert. GitHub Pages liefert aktuell **keine API**.
- Spätere Aufgabe nach explizitem Partnerzugang: lizenzierte serverseitige Adapter für Hotels und Südamerika-Busse umsetzen; keine Secrets in git, keine externen Preis-Websites scrapen.
