# KC Markt-Mini-PC – Notfallzugriff

## Ziel
Bei Problemen am Weihnachtsmarkt muss der Mini-PC auch dann als Diagnose- und Eingriffsplatz funktionieren, wenn einzelne KC-Programme oder das Internet gestört sind.

## Reihenfolge
1. **KC Startcenter** öffnen: http://127.0.0.1:8700/
2. **KC System Check** für Datenbank-, Geräte- und Programmzustand.
3. **KC Leitstand** für Netzwerk und Gesamtsicht.
4. **KC PC Manager** für Kassen-/Stammdaten und Tagesbetrieb.
5. **PC Backup Vault** nur für Sicherung/Wiederherstellung.
6. **AnyDesk** als Haupt-Fernzugriff.
7. **TeamViewer** als unabhängige Reserve.

## Fernzugriff
AnyDesk und TeamViewer werden vom Startcenter nur gestartet. Unbeaufsichtigter Zugriff und Kennwörter werden absichtlich **nicht** im Repository gespeichert oder automatisch gesetzt.

## Offline
Die lokalen KC-Webprogramme laufen über 127.0.0.1 und benötigen dafür kein Internet. Cloud-Funktionen (Supabase, Push, E-Mail, GitHub-Updatecheck) benötigen Internet. Lokale Warteschlangen bleiben erhalten und dürfen nicht blind über Supabase geschrieben werden.

## Sicherheit
Die KC-Webserver lauschen ausschließlich auf 127.0.0.1 und sind nicht direkt aus dem Markt-WLAN erreichbar.
