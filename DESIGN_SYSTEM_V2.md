# Southbound · Designsystem 2.0 (Beta-Vorschau)

## Zielbild

Die Benutzeroberfläche soll sich wie ein moderner, ruhiger Reisebegleiter anfühlen – nicht wie eine technische Eingabemaske. Die bestehenden warmen, hellen Farbtöne werden weiterentwickelt. Die Dunkelansicht bekommt statt grauer/teal-farbener Mischflächen ein **durchgängiges Graphit-/Waldgrünsystem**. Typografie, Oberflächen, Kontraste, Abstände und interaktive Zustände sollen in beiden Modi zusammenpassen.

### Farbskala

| Designrolle | Tag | Nacht |
|---|---|---|
| Hintergrund | `#F3F0E9` warmes Sandweiß | `#171D19` dunkles Waldgraphit |
| Hauptkarte | `#FFFEFA` | `#232B25` |
| Unterkarte / Eingabefeld | `#F1EDE4` / `#F8F5EE` | `#2C362E` / `#29342D` |
| Grenze | `#DAD5CA` | `#415044` |
| Haupttext | `#26322A` | `#EDF3EB` |
| Nebentext | `#667469` | `#B6C6B8` |
| Markenakzent | `#365D49` tiefes Grün | `#B8D8BD` ruhiges Salbeigrün |
| Vorsicht / Hinweis | `#926D43` | `#E1BD83` |

Der aktive Navigations- und Primärbutton verwendet den Markenakzent. **Grün allein ist keine Statusinformation**: Beschriftungen wie „Bestätigt“, „Offen“ oder „Prüfen“ bleiben notwendig.

### Komponenten

- **Header:** verkürzte Begrüßung, klarere Wortmarke, STH/BND-Icon, kompakter Farbschema-Knopf *innerhalb* des Headers, kein frei über der Seite schwebender Button. Browser-/PWA-Statusleiste folgt dem jeweiligen Theme.
- **Navigation:** Vier ikonbasierte, einzeilige Segmente (Budget, Etappen, Unterwegs, Buchungen), sticky mit ausreichend Rand und Safe-Area; auf 320px–430px passt sie ohne umbrechende Wortteile oder horizontales Scrollen.
- **Karten:** Hell auf warmem Hintergrund, nachts gestaffelte Graphitflächen, überwiegend 17–23px Radius, zurückhaltende Schatten, klare Höhenstaffelung.
- **Buchungskarten:** sechs typisierte Einstiege, große und konsistente Outlined-Symbole, angenehmer Abstand für Fingerbedienung. Über Etappen wie bisher direkter Editor statt Vorauswahl; Datenmodell bleibt unberührt.
- **Formulare:** heller bzw. nachts kontrastreicher Untergrund, mindestens 43px Kontrollhöhe, sichtbar markierter Fokus, mobile Einzelspalte, getrennte fortgeschrittene Zahlungssektion.
- **Mikrointeraktion:** leises Anheben von Karten, sanfte Active-States, keine dekorative Daueranimation. `prefers-reduced-motion` respektiert.

### Architektur

`design-system.css` enthält Tokens und komponierte visuelle Regeln. Es wird **nach den bestehenden Inline-Legacy-Styles** geladen, damit das alte Design nicht versehentlich darüber liegt. Mittelfristig alte Styles aufräumen statt weitere `!important`-Schichten aufbauen. Referenz-PWA-Cache `southbound-v71`. Kein Webfont-Download, keine Tracking-CSS-Bibliothek.

Separater Entwicklungsbranch `feat/modern-visual-system-20261013` basiert auf der ungemergten Buchungs-/Anreise-/Rückreiseversion aus PR #20. **Keine unverifizierte Produktionsänderung**, kein Eingriff in Geldbeträge oder gespeicherte Reiseeinträge.

### Abnahmekriterien

- [ ] Sichtprüfung auf realem Android bei 320/360/390/430px; Light und Dark auf Übersicht, Etappen, Buchungsauswahl, Editor, Unterwegs
- [ ] Eingabefeld / Kalender / Tastatur öffnen; keine verdeckten Texte oder Buttons durch Sticky-Navigation
- [ ] Hell-/Dunkelwechsel bleibt nach Reload gespeichert und erhält Budget und alle Buchungen
- [ ] Dunkler Modus: Text und kleine Beschriftungen lesbar, keine hellen Fremdflächen in Karte, Datum, Zahlungsdetails oder Dialogen
- [ ] Alle Buttons über Tastatur bedienbar und Fokus sichtbar; bei reduzierter Bewegung keine große Animation
- [ ] Bestehende Node-, Browser- und Route-Engine-Prüfungen alle grün
- [ ] Erneute Prüfung der Leinwand-/Kartenansicht (Leaflet, Globus) und echter Geräteperformance

**Technischer Hinweis:** Die Browser-Tests für Theme-Persistenz und schmale Geräte sind kein Ersatz für ein vollständiges manuelles mobiles UX-Audit. Screenshots und gezielte Kritik aus dem echten Android-Gerät sind für den nächsten Iterationsschritt entscheidend.
