# StockLab 2.0 — Fas 1–3

Allt befintligt behålls (konton, portföljer, affärer, XP, prestationer, ligor, uppdrag). Bara virtuella pengar. Allt på svenska.

## Fas 1 — Granskning
- Gå igenom sidor, databastabeller, säkerhetsregler och pushnotiser.
- Skriv en kort granskningsrapport i chatten: vad som fungerar, vad som är trasigt eller på engelska.
- Åtgärda blockerande fel som hittas (t.ex. engelska texter kvar i menyer).

## Fas 2 — Ny startsida och navigation
- Spelets designsystem: navy/emerald + guld för prestationer, återanvändbara spelkort, animerade XP-staplar, märken, stora siffror, mjuka sidövergångar (sparsamt).
- Ny inloggad startsida ("Hem") visar: avatar (initialer), nivå, karriärtitel, XP-stapel, portföljvärde, kassa, dagens uppdrag, studiestreak (dagar i rad med aktivitet), senaste prestation, aktiv börsutmaning, ligaplacering, rekommenderad nästa aktivitet.
- Stor knapp **SPELA NU** som öppnar spelarens nästa tillgängliga utmaning (nästa ej klara handledningskapitel, annars nästa börsutmaning).
- Utloggade besökare ser en spelig landningssida med "Börja spela".
- Navigationen får Hem, Handledning och Börsutmaningen; mobil bottenmeny uppdateras.

## Fas 3 — Handledning + första börsutmaningen
**Handledning (7 kapitel):** 100 000 virtuella kronor, Vad är en aktie, Köp din första aktie, Vad är en fond, Bygg en spridd portfölj, Förstå risk, Gör din första börsutmaning.
Varje kapitel: kort förklaring, interaktivt moment, mål, övning, kunskapsfråga, XP och klar-animation. Framsteg sparas efter varje kapitel. Omspelning ger inte XP igen.
- Kapitel 3 kräver ett riktigt virtuellt köp i din portfölj (kontrolleras på servern).
- Kapitel 7 kräver att en börsutmaning är klar.

**Börsutmaningen:** 3 scenarier med fast, förutbestämd data (nybörjare, medel, avancerad). Du får budget, mål, marknadsinfo, val av investeringar och en simulerad tidsperiod uppdelad i rundor med händelser. Resultat visar avkastning, risk, spridning, avgifter, viktiga händelser och lärdomar. Poängen belönar spridning och rimlig risk — inte vågspel. Utmaningar påverkar inte din riktiga virtuella portfölj.

## Utanför denna omgång
Fas 4–8 (karriär, uppdrag, prestationssamling, Akademi, AI-coach, tidsmaskin, ligor, slutlig testning) läggs i färdplanen.

## Tekniska detaljer
- Nya tabeller `tutorial_progress` (user_id, chapter, completed_at) och `challenge_runs` (user_id, scenario_id, choices, score, result, completed_at), RLS: endast läsning av egna rader; skrivning sker via serverfunktioner som validerar svar, beräknar utfall från scenarierna på servern och skriver XP till `player_missions`/`player_achievements` (unikt per kod → ingen dubbel-XP).
- Scenarier som statisk serverdata (`src/lib/challenges.server.ts`), kapitelinnehåll + frågor med facit på servern.
- Rutter: `/` (hem/landning), `/_authenticated/tutorial`, `/_authenticated/tutorial/$chapter`, `/_authenticated/challenge`, `/_authenticated/challenge/$id`.
- Streak beräknas från datum för affärer, uppdrag och kapitel.
- Verifiering: tester för poäng/XP-skydd + Playwright-genomgång inloggad.
