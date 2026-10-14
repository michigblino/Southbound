# Southbound unter southbound.realguesser.app (Cloudflare)

## Architektur
- **RealGuesser** bleibt bei `realguesser-web` und seinem bisherigen Worker (`/r/*`). An dem Repository wird nichts verändert.
- **Southbound** erhält einen eigenen Cloudflare Worker `southbound-web`, ausschließlich für `southbound.realguesser.app`.
- Die App bleibt auch unter der bisherigen GitHub-Pages-Adresse verfügbar, bis der neue Host geprüft und vom Nutzer freigegeben wurde.
- Es wird **keine neue Domain gekauft**. Subdomain und Worker erfordern aber eine bereits vorhandene, aktive Cloudflare-Zone für `realguesser.app`.
- `wrangler.jsonc` ist für einen Cloudflare-Workers-Custom-Domain-Host konfiguriert. Die Domain muss von Cloudflare verwaltet werden und darf nicht bereits auf einen anderen Worker zeigen.

## Einmalige Voraussetzungen für Livebetrieb
Diese Schritte kann nur ein autorisierter Cloudflare-/GitHub-Administrator ausführen:
1. In Cloudflare überprüfen, dass `realguesser.app` im richtigen Konto liegt und `southbound.realguesser.app` noch nicht anderweitig vergeben ist.
2. Einen API-Token mit minimal erforderlichen Worker- und Zone-Rechten (Workers Scripts Edit, Workers Routes Edit bzw. Domain-/DNS-Berechtigung soweit angefordert) erstellen. **Keinen Global API Key verwenden.**
3. Ausschließlich im GitHub-Repository `michigblino/Southbound` unter **Settings → Secrets and variables → Actions** zwei Secrets hinterlegen: `SOUTHBOUND_CF_API_TOKEN`, `SOUTHBOUND_CF_ACCOUNT_ID`. Niemals in Commits, Chat oder öffentliche Logs schreiben.
4. Unter den Repository-`Actions variables` `SOUTHBOUND_CF_DEPLOY_ENABLED=true` setzen. Erst dann läuft die separate Veröffentlichung. GitHub → Actions → **Southbound → Cloudflare** → **Run workflow** startet die erste Bereitstellung.
5. Nach erfolgreichem Deployment `https://southbound.realguesser.app/`, `/sw.js`, `/manifest.webmanifest`, Hell-/Dunkelmodus, Smartphone-PWA und Buchungen überprüfen.

## Datenschutz / Migration
- Der öffentliche Build kopiert **nur** die in `sw.js` gelisteten Browserdateien sowie `index.html`, `manifest.webmanifest` und `sw.js`.
- Keine privaten Reiseexporte, Test-Fixtures oder `.env`-Dateien werden in Cloudflare-Assets hochgeladen.
- Daten im Browser sind **pro Origin getrennt**. Die Daten unter `https://michigblino.github.io` sind auf `https://southbound.realguesser.app` nicht automatisch sichtbar. Vor dem Umstieg im alten Host **JSON-Backup exportieren**, dann im neuen Host **importieren** und prüfen. Vorher die alte URL nicht deaktivieren.
- Eine PWA muss auf dem neuen Host separat installiert werden; bestehende Icon-/App-Installationen bleiben an ihre ursprüngliche Adresse gebunden.
- Vor einer langfristigen Markenentscheidung eine Markenrecherche in DPMA/EUIPO durchführen; die Chile-Reisemarke `southbound.travel` existiert bereits.
- Ohne konfigurierte Secrets/Cloudflare-Konto-Zugriff ist der neue Host **noch nicht live**. Fehlende Autorisierung wird nicht durch Rateversuche oder offene Credentials umgangen.

## Public Build lokal prüfen
```bash
node scripts/build-cloudflare.cjs
node --test tests/cloudflare-build.test.cjs
```
