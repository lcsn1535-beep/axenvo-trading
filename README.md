# Hühnerjagd — Browser Arcade Shooter

Ein eigenständiges, Moorhuhn-inspiriertes Browsergame mit eigener Grafik und eigenem Code.

## Lokal starten
Öffne `index.html` im Browser. Keine Build-Tools nötig.

## GitHub Pages veröffentlichen
1. Erstelle ein Repository auf GitHub.
2. Lade alle Dateien aus diesem Ordner hoch: `index.html`, `style.css`, `game.js`, `config.js`, `supabase-setup.sql` und `README.md`.
3. Richte die Online-Rangliste wie unten beschrieben ein.
4. Öffne **Settings → Pages**.
5. Wähle **Deploy from a branch**, Branch `main` und Ordner `/ (root)`.
6. Speichere. GitHub zeigt dir danach die öffentliche Pages-Adresse.

## Online-Leaderboard einrichten (Supabase)

Die globale Rangliste braucht ein kostenloses Supabase-Projekt. Ohne diese Einrichtung läuft das Spiel weiter, aber die gemeinsame Online-Rangliste ist deaktiviert.

1. Erstelle ein Projekt auf https://supabase.com/.
2. Öffne in Supabase **SQL Editor → New query**.
3. Kopiere den gesamten Inhalt von `supabase-setup.sql` hinein und führe ihn aus.
4. Öffne **Project Settings → API** (je nach Dashboard auch **Connect**) und kopiere die Project URL sowie den `anon`/`publishable` public key.
5. Öffne `config.js` und ersetze die beiden Platzhalter:

   ```js
   window.HUEHNERJAGD_CONFIG = {
     SUPABASE_URL: "https://DEIN-PROJEKT.supabase.co",
     SUPABASE_ANON_KEY: "DEIN_SUPABASE_ANON_KEY"
   };
   ```

6. Committe `config.js` und lade die Dateien auf GitHub hoch. Warte, bis GitHub Pages neu veröffentlicht wurde.

**Wichtig:** Nur den öffentlichen `anon`/publishable key verwenden. Niemals den `service_role`-Key in Frontend-Dateien eintragen.

## Steuerung
- Namen vor dem Spielen eingeben und speichern
- Maus bewegen: zielen
- Linksklick: schießen
- `R`: nachladen
- `Esc`: pausieren/fortsetzen
- 60 Sekunden pro Runde
- Persönlicher Bestwert wird lokal im Browser gespeichert
- Nach einer Runde wird das Ergebnis zur globalen Rangliste gesendet

## Funktionen
- Arcade-Startseite und responsive Layout
- Canvas-Spiel mit beweglichen Cartoon-Zielen
- Punkte, Trefferquote, Timer und Munition
- Nachladen, Pause, Neustart und Ergebnisanzeige
- Soundeffekte, Bonusziele und Partikeleffekte
- Spielername und globale Top-10-Rangliste mit Gold/Silber/Bronze-Markierung

## Sicherheitshinweis
Diese Variante ist ein öffentliches Demo-Leaderboard: Mit den öffentlichen Einfüge-Rechten können Besucher technisch gesehen gefälschte Punktzahlen eintragen. Die Rangliste sollte nicht als manipulationssicher betrachtet werden. Für eine ernsthafte Rangliste braucht es serverseitige Score-Prüfung, Rate-Limits und gegebenenfalls Benutzerkonten. Es werden keine Passwörter gesammelt.

Das Projekt ist ein eigenständiges, fan-inspiriertes Spiel und ist nicht mit Spielaffe oder den Rechteinhabern des originalen Moorhuhn-Spiels verbunden. Es verwendet keine Original-Assets.
\n\n## Eigenes Zielbild\nDie Datei `spieler-ziel.jpg` wird als Zielbild im Spiel verwendet. Wenn du das Bild austauschen möchtest, lade ein anderes Bild unter demselben Dateinamen hoch.\n