# Testläufe

Stats aus manuellen Testläufen, damit wir das Balancing über mehrere Läufe vergleichen können.

**So geht's:** Am Ende jedes Levels zeigt das Spiel einen Dialog mit den Zahlen (Launch-Dialog nach Level 1,
„You fixed the world“ nach Level 2, „Utopia achieved“ nach Level 3). Die Werte abschreiben, neuen Lauf oben einfügen.
Was der Dialog nicht zeigt (Budget, Raten pro Sekunde), steht in der Stats-Leiste des Levels.

Rohdaten des aktuellen Spielstands bekommst du in der Browser-Konsole mit:

```js
JSON.parse(localStorage.getItem('sprint-game'))
```

## Übersicht

| Lauf | Datum | Version / Commit | Level 1 | Level 2 | Level 3 | Gesamt | Notiz |
|---|---|---|---|---|---|---|---|
| 1 | 2026-11-11 | `03bdf2e` | 49 min | – | – | – | Level 1 komplett, alle 14 Perks |

---

## Lauf 1 · 2026-11-11

**Version / Commit:** `03bdf2e` · **Config:** Level 1 ✓ · Level 2 ✓ · Level 3 ✗ · **Start:** normal

### Level 1 · Building the platform (Launch-Dialog)

| Stat | Wert |
|---|---|
| Time | 49 min (2,960 s) |
| App version at launch | 11.1.0 |
| Deployments | 102 |
| Bugs that showed up | 440 |
| Perks activated | 14 (alle) |
| Coding actions | 42,047 |
| Budget beim Launch | 2,871 |
| Assistants (Performance-Upgrades) | 13 (15) |
| Coverage-Upgrades manuell / automatisch | 16 / 29 |
| Tasks angelegt | 1,402 |

### Level 2 · Fixing the world (Victory-Dialog)

| Stat | Wert |
|---|---|
| Time to fix the world | |
| Lawsuits (won / lost / settled) | |
| Talks with protesters | |
| Investor pitches | |
| Time with shady deals | |
| Integrity at the end | |
| Bags of Tegridy | |
| Epics shipped | |
| Servers | |
| Coding actions | |
| Budget am Ende | |
| Ø actions/sec · Ø budget/sec | |
| Verdict (Satz im Dialog) | |

Wann waren welche Anwendungen fertig?

| Anwendung | Release (Spielzeit) | Gelöst (Spielzeit) |
|---|---|---|
| Green World | | |
| Fair Share | | |
| Peace & Integrity | | |

### Level 3 · Building utopia (Utopia-Endauswertung)

Übernommen aus Level 2: TCA, Budget, Credibility, Ø actions/sec, Ø budget/sec.

| Stat | Wert |
|---|---|
| Ergebnis | gewonnen / verloren (Versuche) |
| Time | |
| Battles (won / lost) | |
| Your moves | |
| MegaCorp moves | |
| Initiatives built | |
| Corporations defeated | |
| Credibility at the end | |
| Coding actions | |

### Beobachtungen

- Wo wurde es zäh oder zu schnell?
- Welche Perks / Programme waren zu stark oder zu schwach?
- Bugs, Unklarheiten im UI:
