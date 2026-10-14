# Angebotvergleich V1 — The Worn Road

Implementiert: ausschließlich vom Reisenden selbst gefundene **Unterkunfts- und Transferpreisnotizen** mit Anbieter-HTTPS-Link, genauen Reisedaten, Personenanzahl, Preis in EUR + separaten Gebühren, Prüfdatum und Etappenbindung. Eine Notiz ist keine API-Abfrage, keine bestätigte Verfügbarkeit, keine Buchung und keine Zahlung. Preisnotizen werden nicht direkt in `bookingLedger` oder in die All-in-Rechnung übertragen.

Vergleich nur für übereinstimmende Art / Etappe / Herkunft / Beginn-Ende / Personenzahl; veraltete (>1 Kalendertag) und nach Umplanung ungültige Preise sind ausgeschlossen. Transportpreise sind an die vorherige Etappe gebunden, und die erste Flug-Anreise bleibt im vorhandenen Flugeditor.

`m.offerWatchlist` wird optional unter demselben bestehenden lokalen `southbound-v3`-Datensatz gespeichert und in v4-JSON-Backups einbezogen. Beim Import wird die Form als Liste validiert. Maximal 100 Einträge; HTML wird escaped, externe Anbieterlinks müssen HTTPS sein, keine automatischen Anfragen und keine Zugangsdaten.

Dieser Schritt schafft echte **Vergleichbarkeit von eingegebenen Anbieterangeboten**, aber **keine automatische Anbieterrecherche**. Nächster Schritt: rechtmäßig nutzbare Provider-Integrationen mit serverseitiger Authentifizierung, belegbarer Verfügbarkeit, Gebühren-/Währungslogik und realem Zeitfenster. Anbieter-Links niemals als bestätigte Verfügbarkeit ausgeben. Erforderliche externe Partnerberechtigungen sind noch nicht vorhanden.

CI-Prüfung: neue Unit-Tests, Integrationstests, Playwright-Mobilansichten. Kein Cloudflare-Deployment in diesem PR.
