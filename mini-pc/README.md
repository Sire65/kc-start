# KC Mini-PC Zentrale

Der Markt-Mini-PC ist TV-Rechner, KC-Programmzentrale, Diagnoseplatz und Fernzugriffsrechner.

## Lokale Dienste

- Startcenter: 8700
- Kasse / PC Manager / Money Butler / TV: 8765
- KC Verwaltung: 8766
- KC DP2: 8767
- KC Communication: 8768
- KC System Check: 8769
- KC Leitstand: 8770

Alle Server binden nur an 127.0.0.1. Sie sind deshalb nicht direkt aus dem Markt-WLAN erreichbar.

## Erwartete Ordner

- C:\KC_Programme\Kasse
- C:\KC_Programme\KC-Verwaltung
- C:\KC_Programme\dp3
- C:\KC_Programme\KC-Communication
- C:\KC_Programme\KC-System-Check
- C:\KC_Programme\KC-Leitstand
- C:\KC_Programme\kc-start

PC Backup Vault ist eine native Windows-Anwendung und wird aus dem Startcenter nur über eine feste Allowlist gestartet.

## Einrichtung

Auf dem Mini-PC einmal `mini-pc\KC_MINI_PC_EINRICHTEN.cmd` doppelklicken.

Das richtet Benutzer-Autostart und einen Desktop-Link `KC Programme` ein. Es verändert keine Supabase-Daten und keine KC-Nutzdaten.

Fernzugriff: AnyDesk ist Hauptweg, TeamViewer Reserve. Zugangsdaten werden bewusst nicht vom Setup gesetzt.
