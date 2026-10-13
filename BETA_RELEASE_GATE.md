# Southbound – private Beta: Release-Kriterien (2026-10-13)

## Stand und Sicherheitsgrenze

**Stand 2026-10-13, nach Abschluss der Merge-Reihenfolge:** PRs #15, #16, #17, #18 und #19 sind vollständig nach `main` gemergt (letzter Merge `08f12e0e0befb448f6d325501b852d841a041722`). Der bisherige Code liegt im Sicherheitsbranch `safety/pre-beta-main-20261013`. GitHub Pages verwendet `main`; die tatsächliche Auslieferung an jedes Gerät und der physische Android-Test wurden noch **nicht** unabhängig bestätigt. Der frühere Status als isolierter Featurebranch ist damit abgeschlossen.

- PR #15: Buchungsformulare je Kategorie
- PR #16: mehrteilige Unterkünfte und Host-Wartenächte
- PR #17: individuelle Zahlungen und Fremdwährungen
- PR #18: automatische indikative Tageskurse und wählbare Basiswährung
- Dieser Folge-PR: unabhängiger All-in-Stresstest, maschinenlesbarer Audit, Backup-Validierung und sichtbarer Export/Import in der aktiven Oberfläche

**Die fünf PRs wurden am 2026-10-13 in genau dieser Reihenfolge zusammengeführt.** Vor dem letzten Merge wurden nach dem Retargeting auf `main` nochmals **256/256 Node-Tests und 30/30 Playwright-Browsertests** bestanden (GitHub Actions Run `38400223582`); Routenprüfungen ebenfalls erfolgreich (`38400223753`). Die `quality.yml` läuft jetzt auch bei Pushes auf `main`. Ein nach dem letzten Merge ausgeführter Push-Test bzw. die GitHub-Pages-Auslieferung wurde mit den verfügbaren Connector-Aktionen **nicht gesondert eingesehen**. Für den Nutzer bleiben Android-Test, lokale Backup-Sicherung und kritische echte Buchungsfälle offen.

## Prüfungen vor privater Beta

- [ ] **Sicherung am echten Gerät:** Auf Android und PC jeweils das aktuelle `southbound-v3` als JSON exportieren; separate sichere Kopien anlegen. Backup enthält persönliche Reise-, Kontakt- und Zahlungsreferenzdaten. Nicht öffentlich hochladen.
- [ ] **Backup-Wiederherstellung:** Aktive Oberfläche besitzt Backup-Ein-/Ausgabe. Ungültige Dateien, falsch typisierte Buchungslisten, fremde Versionen und unsichere JSON-Schlüssel werden abgewiesen. Beim Import wird der komplette lokale Zustand durch die geprüfte Datei ersetzt; nichts wird aus dem alten Plan hinzuaddiert. Prüfen, dass ein alter Export tatsächlich wiederhergestellt werden kann.
- [ ] **Kalkulation:** CI erzeugt `beta-budget-audit.json` mit einer vollständig **fiktiven** vier-Städte-Reise. Jede Annahme wird offengelegt; Buchungen, Anzahlungen, Erstattungen, Host-Wartezeit, Rückreise, Reserve sowie 8.000-€/12.000-€-Schwellen werden unabhängig gegengerechnet. Die fiktiven Preise und Verbindungen dürfen **nie** als echte aktuelle Marktdaten ausgegeben werden.
- [ ] **Spezielle Fehler:** Überlappende Hostelbuchungen, falsches Flugdatum, veränderte Route, unbekannte Rückreise, fehlende Transitdauer, unbestätigte Host-Zusage, Rückerstattung und fehlende FX-Quellen müssen die Budgetfreigabe konservativ verhindern.
- [ ] **Währung:** Basiswährung auf EUR, BRL und COP umstellen; Tageskurs-Herkunft/Datum prüfen; gültige Zahlungen in ihrer ursprünglichen EUR-Snapshot-Bewertung unverändert behalten; keine stillschweigende 1:1-Umrechnung bei Kursausfall.
- [ ] **Android-Gerät:** 320–430 px, Hell-/Dunkelmodus, App-Installation, Offline-Betrieb, Wiederladen, Buchung editieren/löschen, Download/Import, Dateiauswahl, Touch- und Tastaturbedienung, Datenbeständigkeit testen.
- [ ] **Provider-Realität:** Keine Live-Buchungsfähigkeit, Zahlungsbestätigung oder geprüfte Hostel-/Transportverfügbarkeit behaupten, solange nur Selbsteinträge und Schätzmodelle vorliegen.

## Synthetische All-in-Gegenrechnung (niemals echte Preise)

Der CI-Datensatz bildet **rechnerisch**, nicht faktisch, vier Etappen ab (Rio, Salvador, Medellín, Cusco): gesplittete Hostelbuchungen, drei Hostel-Wartenächte vor fünf bestätigten Host-Nächten, ein Flug in USD, Teilzahlungen und Erstattung einer stornierten Unterkunft.

| Abrechnung | EUR |
|:--|--:|
| Bereits netto bezahlt (inkl. 10 € nicht erstattete Stornokosten) | 132,60 |
| Künftige Aufenthalte/Transfers/Host-Wartenächte | 913,40 |
| Rückreise, Versicherung, Visa, Ausrüstung | 1.060,00 |
| Reserve | 1.200,00 |
| **Synthetisches rechnerisches All-in** | **3.306,00** |

Das Szenario liegt 4.694 € unter dem beispielhaften Budgetziel und 8.694 € unter der Obergrenze; `allInVerified` bleibt **false**, weil Preis-/Buchungsbelege nicht real geprüft wurden. Mit weiteren 5.200 € Szenariokosten ergäbe sich 8.506 € (über dem Ziel), mit weiteren 9.000 € 12.306 € (über der Obergrenze). Unbekannte Rückreisekosten, Transferdauern oder veränderte Flugtermine dürfen nie als geprüfte Freigabe erscheinen.

## Vor einer späteren breiten Beta weiter offen

- Belastbare Anbieter- und Verfügbarkeitsdaten mit Quellen, Preisalter und rechtlich erlaubtem Zugriff; Buchung direkt innerhalb der App benötigt eine autorisierte Partnerintegration und geschützten Server.
- Tatsächliche Transfers und Ortszeitzonen; vorhandene Routenschätzungen sind **keine** bestätigten Fahrpläne.
- Sichere Anmeldung und geräteübergreifende Synchronisation mit serverseitiger Zugriffstrennung und Konfliktauflösung – **noch nicht integriert**.
- Event-/Saisonoptimierung weltweit einschließlich Karneval in Rio und Salvador, Regenzeiten, Hochsaisonzuschlägen und Erlebniskosten – **nur Roadmap**.
- Menschlicher Abgleich der Buchungs-, Journal- und Anbieterbelege. Unbekannte Positionen kennzeichnen, niemals „alles verifiziert“ vortäuschen.

## Schnellbefehle für andere KI-Assistenten

```bash
node --test tests/*.test.cjs
node scripts/check-inline-scripts.cjs
node scripts/beta-cost-audit.cjs > beta-budget-audit.json
npm run test:browser
```

Die letzte Prüfung des vollständigen GitHub-Actions-Laufs und konkrete Fehlermeldungen gehören als Link/Kommentar in den Folge-PR; **vorher** kein Merge nach `main`.
