# Plan i dnevnik promena — astro-sajt

Ovde beležimo **sve značajne promene** na projektu: šta je urađeno, kada, u kojim fajlovima, i šta je sledeće.

> **Napomena:** Ovo nije zamena za git. Kod i dalje živi u fajlovima + git commit-ima. `plan.md` je čitljiv pregled za nas.

---

## Kako da koristimo ovaj fajl

Svaka nova stavka ide na **vrh** liste „Urađeno", u formatu:

```markdown
### YYYY-MM-DD — Kratak naslov
- **Šta:** opis promene
- **Fajlovi:** `putanja/do/fajla.tsx`
- **Status:** urađeno | u toku | planirano
- **Commit:** (hash, ako postoji)
- **Napomena:** (opciono)
```

---

## Trenutno stanje projekta

| Stavka | Vrednost |
|--------|----------|
| **Projekat** | astro-sajt |
| **Framework** | Next.js 16 + React Three Fiber |
| **Lokalni dev** | http://localhost:3456 (ili :3000) |
| **Produkcija** | https://astro-sajt.vercel.app |
| **GitHub** | https://github.com/goranadokmanovic/astro-sajt |
| **Act 1 (3D hero)** | 🔒 LOCKED — commit `7dfc8e8` (ne dirati bez reči **UNLOCK**) |

---

## Urađeno

### 2026-06-16 — Rebrand prezimena: Mladjenović
- **Šta:** Ime **Zvezdana Jovanović** zamenjeno sa **Zvezdana Mladjenović** na celom sajtu (header, footer, `<title>`, About sekcija)
- **Fajlovi:** `components/Header.tsx`, `components/Footer.tsx`, `app/layout.tsx`, `components/sections/About.tsx`, `plan.md`
- **Status:** urađeno
- **Commit:** `5164ac4`

### 2026-06-16 — KRUG: sferna rotacija zodijaka mišem
- **Šta:**
  - U sekciji **KRUG** (Celina finale, `act2Progress` 0.875–0.9375) ceo `ZodiacChart` se rotira po X/Y prati miš
  - Lerp `0.05`, brzina `0.005`, bez vertikalnog clamp-a — puna sferna rotacija
  - Pasivan `mousemove` na kontejneru (`ZODIAC_MOUSE`); ne blokira scroll
  - Uklonjena stara Y-only drag rotacija (`ringRotRef` / `dragRefs` u `SceneContent`)
  - Drag overlay i custom kursor isključeni tokom KRUG-a (`setIsFinale(false)`)
  - **Luxury vizuelni efekti** (strelicе, twinkle, shooting stars, parallax) probani i **vraćeni** — nisu u kodu
- **Fajlovi:** `components/SolarSystem.tsx`, `plan.md`
- **Status:** urađeno
- **Commit:** `9603540`

### 2026-06-14 — Header rebrand, scroll pozadina, plan.md, git push
- **Šta:**
  - Novi transparentni logo (`Logo Astro Zvezda transparent.png`)
  - Ime: **Zvezdana Jovanović** (bez „Astro"), žuta boja (`text-accent`)
  - Hero režim: logo + ime + nav pozicioniranje (`translate-y`)
  - Posle hero sekcije: crno-ljubičasta mat-maglovita pozadina (`backdrop-blur`)
  - Kompaktan header posle scroll-a — bez praznog prostora ispod logoa
  - Footer kredit: **Gorana Dokmanović**
  - Uklonjen neiskorišćen `energy-figure.png`
  - Dodat cursor asset `public/cursors/arrow.png`
  - Kreiran `plan.md` — dnevnik promena
- **Fajlovi:** `components/Header.tsx`, `components/Footer.tsx`, `public/images/Logo Astro Zvezda transparent.png`, `public/cursors/arrow.png`, `plan.md`
- **Status:** urađeno — commit `0f0ae1e`, push na GitHub

### 2026-06-14 — Portfolio verzija (Zvezdana)
- **Šta:**
  - Uklonjen Leo fly-through izlaz i EnergyZone
  - Dodata `PortfolioCTA` sekcija („Vaša karta. Vaša priča.")
  - Kamera ostaje na Celina ring view posle finale-a
  - Rebrending: astrolog i numerolog
- **Fajlovi:** `components/SolarSystem.tsx`, `components/PortfolioCTA.tsx`, `app/page.tsx`, `components/sections/About.tsx`, `app/layout.tsx`
- **Status:** urađeno — commit `2c5f06b`

### 2026-06-14 — Celina finale: drag rotacija i kursor
- **Šta:** Mouse drag rotacija sa inercijom, custom gold glow kursor, overlay za pointer priority
- **Fajlovi:** `components/SolarSystem.tsx`, `public/cursors/`
- **Status:** urađeno — commiti `5977377` → `a8cca66`

### Ranije — Act 1 planetary journey
- **Šta:** Hero 3D scena, stanice, kamera, magla, orbite
- **Status:** 🔒 LOCKED — commit `7dfc8e8`

---

## U toku / nije commit-ovano

*(nema — sve je u commit-u posle push-a 2026-06-16)*

---

## Odbijeno / vraćeno

### 2026-06-16 — Premium luxury vizuelni efekti
- **Šta:** Zlatne scroll strelice, twinkling zvezde, planet glow pulse, shooting stars, depth parallax
- **Status:** implementirano pa **vraćeno** na zahtev — nije u repou
- **Napomena:** Scroll, kamera, tekst i struktura sekcija nisu dirani tokom eksperimenta

---

## Planirano (backlog)

- [ ] Zakazivanje — povezati CTA dugme sa pravim linkom (Cal.com ili drugi)
- [ ] Mobilni meni (hamburger) — trenutno nav vidljiv samo na `md+`
- [ ] (dodaj ovde sledeće zadatke)

---

## Pravila projekta (za agente)

- **Act 1** je zaključan — vidi `CLAUDE.md`
- **AGENTS.md** — Next.js 16 specifična uputstva
- **plan.md** — ažurirati posle svake značajne promene
- Commit samo kad eksplicitno zatražimo

---

## Istorija fajlova za brzu referencu

| Fajl | Uloga |
|------|-------|
| `components/Header.tsx` | Logo, ime, navigacija, scroll pozadina |
| `components/ScrollJourneyHero.tsx` | Scroll wrapper za 3D hero (1000vh) |
| `components/SolarSystem.tsx` | 3D scena, kamera, stanice |
| `components/PortfolioCTA.tsx` | CTA sekcija posle hero-a |
| `app/page.tsx` | Struktura stranice |
| `CLAUDE.md` | Pravila za AI (nije dnevnik promena) |
| `plan.md` | **Ovaj fajl** — dnevnik promena |
