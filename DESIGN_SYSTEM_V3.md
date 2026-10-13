# Southbound — Designsystem 3.0 (Implementierung, nicht Mockup)

## Verbindliche Farbvorgaben aus Nutzer-Screenshot

| Rolle | Wert | Verwendung |
|---|---|---|
| Mist | `#90AFC5` | Helles Ambientlicht, weiche Flächen, Verlauf |
| Stone | `#336B87` | Heller Akzent, primäre Buttons, Navigation, Hero |
| Shadow | `#2A3132` | Dunkler Hintergrund, metallischer Untergrund |
| Autumn Foliage | `#763626` | Dunkler Akzent, aktive Navigation, Hero, Buttons |

Heller Grund `#E4EFF5` und lesbare Mischflächen sind **aus den beiden Light-Farben abgeleitet**, dunkler Grund bleibt exakt Shadow. Keine hellgrüne/sandfarbene Altpalette in den neuen Komponenten verwenden. Nacht-Text hell mit ausreichend Kontrast auf Autumn Foliage, Tags und Eingabefeldern.

## Wirkliche Codeänderungen

- **`design-system.css`**: ersetzt die bisherige 2.0-Farbwelt durch Mist/Stone und Shadow/Autumn. Mit transparenten Glasflächen, dezenten Lichtkanten, weicheren Gradient-Buttons, Glas-Navigation, klaren Kartenhierarchien und zurückhaltenden Schatten. Keine neue Programmbibliothek und kein Download externer Fonts.
- **Hintergründe:** `body::before` und `body::after` sind *reine CSS-Gradienten*, die per `opacity` in etwa 0,8 Sekunden zwischen Hell und Dunkel übergehen. Ebenso hat die Hero-Karte übereinandergelegte Light-/Dark-Gradienten, damit sie nicht abrupt umschaltet. Bei `prefers-reduced-motion` werden Übergänge entfernt.
- **`woodcut-pattern.svg`**: lokal eingebundenes, aus geschlossenen organisch leicht unregelmäßigen Konturlinien bestehendes SVG-Pattern. Nur die Hero- und Budget-Akzentflächen bekommen das Muster, auf 11,5 % beziehungsweise 6,5 % Sichtbarkeit begrenzt. Es enthält **keine** Fotos oder externe Ressourcen.
- **`icon.svg` / `icon-dark.svg`**: vollständig neu gestaltetes, aber dem bestehenden Logo entsprechendes **STH über BND**, mit einem Strich über STH und einem unter BND. Bergsilhouette und dezente Linien unter der Typografie. Das Installations-/PWA-Icon ist die hellere Variante; im Header liegen beide Varianten übereinander, sodass beim Umschalten die Deckkraft weich überblendet wird.
- **`index.html`** bleibt in der Reise- und Buchungslogik unverändert; die beiden Logo-Bilder und der Android-Theme-Meta-Wert wurden an das Design angepasst.
- **`sw.js`** Cache `southbound-v72` enthält beide Markenlogos und das Pattern zusätzlich zu den bisherigen CSS- und Rechenmodulen für den Offlinebetrieb.
- **`manifest.webmanifest`** verwendet Shadow als Installationshintergrund und Theme-Metafarbe.

## QA und offene Freigabe

- `browser-tests/premium-palette.spec.cjs`: exakte vier Farbwerte in realem DOM, Nacht/Tag-Wechsel, Transparenz/Blur, Pattern, markenspezifische Icon-Crossfades, Mobilbreiten 320/360/390/430px, Erhalt aller Reisedaten.
- `browser-tests/visual-system.spec.cjs`: aktualisierte Kontrastmessung auf Gradient-Hintergründen.
- `tests/integration-assets.test.cjs`: Tests für beide Logos, Holzschnitt-Asset und Offline-Cache.
- **Unveröffentlichter Stack:** PR #20 (Buchungen) → PR #21 (Design 2.0) → dieser Design-3.0-PR. Main und reale gespeicherte Reisedaten wurden nicht verändert. Vor Live-Publishing echten Android-Test mit Hell/Dunkel und Rollback-Sicherung durchführen.
- **Performance:** CSS-Blur auf Karten und Navigation sollte auf dem physischen Android-Gerät auf Akkuverbrauch und Scroll-Ruckeln geprüft werden. Bei schwächeren Geräten die Zahl gleichzeitig weichgezeichneter Panels reduzieren; `prefers-reduced-transparency` und fehlender `backdrop-filter` werden berücksichtigt.

## Handoff

Dies ist keine ImageGen-Datei, kein Konzeptbild und kein statisches Rendering: alle beschriebenen Teile sind produktive HTML-/CSS-/SVG-Assets des GitHub-Branches. Branding, Farbschema, Hintergrund und Karten folgen denselben Designtokens.
