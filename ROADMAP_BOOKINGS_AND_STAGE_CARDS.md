# Southbound – priorisierte Weiterentwicklung (2026-10-12)

## Entscheidung des Nutzers

**Zuerst Zuverlässigkeit der Reise- und Budgetberechnung beheben.** Die neue, auf dem Screenshot gewünschte Etappenansicht mit kleinen Icons und Status-Chips soll ausdrücklich erhalten bleiben, aber erst nach den P0-Korrekturen in die App integriert werden. Nicht als Bild, sondern als echte interaktive Komponente. Den bestehenden Reiseplan nie ohne Zustimmung verändern.

## P0 – aktueller Featurebranch `fix/booking-budget-integrity-20261012`

1. Tickets sind an **fromId, toId und Ankunft-/Transferdatum** gebunden. Vorherige Tickets, die nur nach Ziel-Index gespeichert waren, **bleiben im lokalen Speicher**, dürfen aber aus Sicherheitsgründen nicht mehr als gültige Preise für eine andere Route gelten. Der Nutzer kann sie mit aktuellem Datum und Ursprungsort erneut bestätigen.
2. Bestätigte Host-Aufenthalte verschieben die sichtbare Reiseetappe auf den bestätigten Beginn und die folgenden Etappen mit; Ankunft und Host-Beginn sind getrennt.
3. Tage vor dem Host werden mit normalen Hostel- und Essenskosten bewertet, **nicht** mit vergünstigter Host-Verpflegung.
4. Host-Zusatzgebühren sind Bestandteil von `item.stay` und werden im All-in-Adapter nicht doppelt angesetzt. Unbekannte Zusatzgebühren oder Mahlzeiten werden als **unvollständig** markiert.
5. Host-Bestätigung erzwingt das persönlich eingestellte maximale Stundenlimit und explizite valide Preise; Zusagen können zurückgenommen werden. Eine Host-Nacht darf nicht als Hostel-Angebot gespeichert werden.
6. Backend-/API-Zugang, echte Buchungen und Live-Preise sind **nicht Teil dieses PRs**.

## Als nächstes – Buchungsgrundlage vor einer automatischen Angebotsintegration

- Eine einzige, datenquellenbewusste Buchungsakte für Transfer, Unterkunft, Volunteering und Erlebnis: **pro Angebot** stabile IDs, Terminfenster, Anbieter, Quelle, Währung, Gesamtpreis inkl. Steuern/Gepäck/Transfers/Gebühren, Zahlungsstatus, Stornierung und Beleg. Kein `verified:true` als gleichbedeutend mit gebucht.
- Strikte Zustände: `estimate` → `found` → `selected` → `requested` → `confirmed` → `paid` → ggf. `cancelled/refunded`; Volunteering benötigt Host-Bewerbung und Host-Zusage, nicht automatisches „gebucht“.
- Ein **gemeinsames** Reisedatum-/Budgetmodell: bestätigte Host-Daten, Warte- und Transferdauer, Hotel-Check-in/out, Zahlung und Anzahlung, Refunds, unvermeidbare Fixkosten, Notreserve und echte Restverpflichtungen. Nur noch diese Quelle speist Empfehlungen und All-in-Summe; keine alten Parallel-Gesamtrechnungen.
- Echte Transferstunden/Übernachtfahrten und Zeitzonen sind bisher nicht vollständig integriert. Ein Preis mit passender Datum- und Streckenbindung garantiert noch keine buchbare Verbindung.
- Manuell eingegebene Hostelpreise aktuell ohne Verfallsdatum; als Nächstes Preisquellen, Zeitstempel, benötigte Nächte und Verfügbarkeit berücksichtigen.
- Datenschutz und Synchronisation zwischen PC und Smartphone inkl. backupsicherer Migration; Supabase oder anderes Backend erst mit angemessener Authentifizierung, row-level policies, Datenschutz und Nutzerfreigabe.
- Provider-Schnittstellen ausschließlich nach gesonderter Partnerberechtigung und legalem API-Zugang. API-Schlüssel nie in GitHub Pages.

## Geplante Etappenkarte – präzise Design-Vorgabe des Nutzers

Referenz: kompakte, dunkle Karte mit abgerundetem Rand; schlichte **kleine Linien-Icons**, Überschrift z. B. „Medellín → Salento“, darunter kompakte Zeilen mit sekundärem Text und neutralen Status-Chips auf der rechten Seite:

- 🚌 **Transfer** – Ticket auswählen und buchen – `Offen`, `Vorgemerkt`, `Bestätigt`, `Bezahlt`
- 🛏 **Unterkunft** – Verfügbare Nächte vergleichen – `Offen`, `Reserviert`, `Gebucht`, `Bezahlt`
- 🤝 **Volunteering** – Hosts suchen und Bewerbung verfolgen – `Optional`, `Beworben`, `Zusage`
- ⛰ **Erlebnisse** – Ausflüge prüfen und vormerken – `Optional`, `Geplant`, `Gebucht`

Die Icons sind als echte SVGs oder Icon-Library einzubinden (nicht als unzuverlässige Font-Glyphen); dieselbe Semantik muss im Dark- und Light-Theme und mobil bei 320–430 px funktionieren. Jede Zeile ist **klickbar** und öffnet die bereits korrekte Detailaktion: Transportangebote, Unterkunftsvergleich, Host-Bewerbungsstatus bzw. Erlebnisse. Kein `Gebucht` ohne echte Buchungsbestätigung, kein `Bezahlt` ohne Zahlungsbeleg. Auch ohne externe Anbieter muss die Karte mit manuellen Daten sinnvoll sein.

**Akzeptanzkriterien**: Bestehende Route, lokale Daten, Backups und Statusänderungen bleiben erhalten; keine falschen Buchungszustände; visuelle Konsistenz zur Screenshot-Vorlage; Tastatur/Screenreader und Mobile-Playwright; zeilenweises Budget-Update nach echter Buchungsänderung.

## Testprotokoll

Neue/angepasste Tests: Ticket-Routen-/Datumsbindung; Host-Kalender; Host-Gebühren; Wartefood; Stundenlimits und Widerruf in UI; bestehende Budget- und Volunteering-Regressionssuite.

`node --test --test-reporter=spec tests/*.test.cjs` sowie `node scripts/check-inline-scripts.cjs` und Playwright müssen in GitHub Actions für diesen Branch erfolgreich sein, bevor nach `main` gemergt wird. Grün bedeutet **nicht**, dass Live-Preise oder echte Buchungen verifiziert wurden.
