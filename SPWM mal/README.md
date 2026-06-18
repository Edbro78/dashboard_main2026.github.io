# Söderberg & Partners — Wealth Management Design System

A design system for **Söderberg & Partners Wealth Management** — the digital
client portal and product surfaces of one of the Nordics' leading independent
advisory and wealth-management groups. The system serves an exclusive,
modern and clean expression aimed at high-net-worth private clients and their
advisors.

This system was reconstructed from the client's **"Designsystem.fig"** Figma
file (a full UI-kit / foundations file) plus brand assets supplied directly.
It is written in **Norwegian (Bokmål)** — the product's primary market.

> **Note for the reader:** the sources below were available to the author at
> build time. You may not have access to them — they are listed for provenance.

## Sources

- **Figma:** `Designsystem.fig` — mounted as a read-only virtual filesystem.
  Pages of note: `Foundations`, `Colors` (Farger), `Spacing`, `Typography`,
  `Brand-assets`, `Buttons-and-links`, `Cards`, `Inputs`, `Navigation`,
  `Page-template`, `Page-header`, `Data-visualization`, `Tables`, `Badge`,
  `Banner`, `Modals`, `Tabs`, `Dropdown`, `Stepper`, `Switch-toggle`,
  `Radio-checkbox`, `Tooltip`, `Datepicker`.
- **Brand assets (uploaded):**
  - `spwm-logo 1.svg` — primary horizontal logo (logomark + "söderberg & partners" wordmark), navy `#002359`.
  - `SoderbergSans-*Italic.otf` — five italic weights (Light, Regular, Medium, Bold, Black). **Only italics were supplied.**

## What's the product?

A **client portal for wealth management**. The signature screens are:

- **Hjem / Oversikt** (Home / Overview) — dashboard of the client's holdings.
- **Investeringer** (Investments) — total value, return since inception,
  performance chart, asset allocation.
- **Pensjon** (Pension) — pension capital, return, projection chart.
- **Beholdning** (Holdings) — detailed fund/equity table with market value and
  return per position.
- **Dokumenter** (Documents) — reports and statements.
- **Rådgiver** (Advisor) — the client's named advisors with contact cards.
- **Tilbakemelding** (Feedback).

Layout shell: a **280px white left sidebar** (logo lockup → nav items →
client-selector + "Min side" / "Logg ut" at the bottom) and a **main area on a
light-gray canvas (`#F9FAFB`) with a 24px rounded top-left corner**. The page
header pairs a 30px navy title with a soft-blue "Rapporteringsdato" (reporting
date) badge. A mobile layout swaps the sidebar for a top navbar with logomark,
client-selector dropdown, and hamburger.

---

## CONTENT FUNDAMENTALS

**Language.** Norwegian Bokmål, throughout. Translate UI labels rather than
leaving them in English. Core vocabulary seen in-product:

| Norwegian | English |
|---|---|
| Hjem / Oversikt | Home / Overview |
| Investeringer | Investments |
| Pensjon | Pension |
| Dokumenter | Documents |
| Beholdning | Holdings |
| Rådgiver / Rådgivere | Advisor / Advisors |
| Tilbakemelding | Feedback |
| Klientvelger | Client selector |
| Min side | My page |
| Logg ut | Log out |
| Totalverdi | Total value |
| Avkastning siden start | Return since inception |
| Markedsverdi | Market value |
| Fordeling | Allocation |
| Aktivklasser | Asset classes |
| Rapporteringsdato | Reporting date |
| Avbryt / Lagre / Slett | Cancel / Save / Delete |
| Se detaljer | See details |

**Tone.** Calm, precise, advisory — never salesy or playful. The product
speaks to clients about *their* money, so copy is **factual and quietly
confident**. Reassuring under losses (negative returns are stated plainly,
not hidden), specific with numbers.

**Person.** Addresses the client directly but discreetly — possessive framing
("Dine rådgivere" = *your* advisors, "Din rådgiver"). Avoids the casual "du"
imperative where a neutral noun phrase reads more professional.

**Casing.** **Sentence case everywhere** — headings, buttons, labels, nav.
Never Title Case, never ALL-CAPS for UI (only tiny eyebrow/category labels like
"NYHETER" may be set in caps as a typographic device). Button labels are short
verbs: *Lagre*, *Avbryt*, *Slett*, *Se detaljer*.

**Numbers & money.** Norwegian formatting: **space as the thousands separator**
("6 002 474 kr"), currency suffix "kr" with a space. Percentages with a sign and
two decimals where precise ("+26,12 %", "−14,51 %"). Use a real minus/comma in
production; the figma mixes both.

**Emoji:** none. This is a regulated financial product — no emoji, no slang.

**Examples (verbatim from the file):**
- "Totalverdi — 6 002 474 kr"
- "Avkastning siden start +1 928 156 kr +26,12 %"
- "Rapporteringsdato: 02.06.2024"
- "Se detaljer om investeringer →"

---

## VISUAL FOUNDATIONS

**Overall vibe.** Institutional Nordic fintech: airy, restrained, trustworthy.
Lots of white space, a confident navy, a single decisive blue for action, and
hairline gray structure. Nothing decorative competes with the data.

**Color.**
- **Söderberg navy `#002359`** is the soul of the brand — by far the most-used
  color (logo, headings, body ink, icons, active nav text). When in doubt, ink
  is navy, not black.
- **Blue `#0A5EDC`** ("blue-800 / Main") is the one true action color: primary
  buttons, links, focus, selected states, chart lines. A 25→800 blue ramp
  supports it.
- A **secondary navy-gray** ramp (`#264472`→`#F6F7F9`) and a neutral **gray**
  ramp (Untitled-UI-style `#101828`→`#FCFCFD`) carry surfaces, borders and
  muted text.
- **Semantic**: error red `#B42318/#D92D20`, warning amber `#DC6803`, success
  green `#079455` — each with a tinted background (`#FEF3F2`, `#FFFAEB`,
  `#ECFDF3`) and border. Positive returns are green, negative are red.
- **Canvas** is `#F9FAFB`; cards and the sidebar are pure white.

**Type.** **Whitney** (Hoefler&Co) is the product typeface across all weights
(Book 400 / Medium 500 / Semibold 600 / Bold 700), with **Inter** as a
secondary/fallback. A two-track scale: **Display** xs–xl (24→60px, −2% tracking
on md and up) for headings, and **Text** xs–xl (12→20px) for UI/body. Headings
are Medium-weight navy; numbers and totals lean Semibold. *Whitney is not a free
font — this system substitutes **Hanken Grotesk** (Google Fonts). See Caveats.*

**Spacing.** 4px base grid (4/8/12/16/24/32/40/64/80). Generous: 24–40px page
padding, 24px between cards, 12px between nav items.

**Radius.** 8px on buttons & inputs, 12px on cards, **24px on the app's main
container (top-left only)**, 5px on grouped-button containers, full pills (100px)
for icon buttons, badges and avatars.

**Backgrounds.** Flat color only — **no gradients** on surfaces. Imagery appears
only inside content cards (news/podcast thumbnails) — natural, editorial
photography (landscapes, people), warm but realistic, never stocky-blue or
duotone. No repeating patterns, no textures, no hand-drawn illustration.

**Borders.** Hairline `1px` in `--gray-200/300`. Structure is communicated with
borders + whitespace far more than with shadow.

**Elevation.** Soft, low, Untitled-UI-style shadows (`--shadow-xs`…`xl`),
multi-layer and subtle. Cards mostly use a hairline border or `--shadow-sm`;
popovers/menus/modals use `--shadow-lg`/`xl`. No hard or colored shadows.

**Cards.** White, 12px radius, hairline `--gray-200` border (sometimes a faint
`shadow-sm`), 16–24px internal padding. Header = small title + optional action
link top-right. KPI cards stack a label, a big Semibold number, a signed return,
then a sparkline.

**Charts.** Clean line charts (blue `#0A5EDC` for pension, violet `#9747FF` for
investments), thin strokes, soft area fill, minimal axes, light grid
`#EAECF0`. Allocation shown as a doughnut/pie in the blue family plus a table.

**Interaction & states.**
- *Hover*: primary buttons darken (toward `#074EB9`); ghost/nav items pick up a
  soft `--gray-50/--blue-100` fill; links stay blue and may underline.
- *Active/pressed*: a deeper navy-blue; no scale/bounce.
- *Selected nav*: `--blue-100` background with navy text and icon.
- *Focus*: 2px blue ring using `--ring` (no glow).
- *Disabled*: lighter tint of the same color, ~38–50% legibility.

**Motion.** Reserved and functional — short fades and slides (~150–250ms,
ease-out). No bounce, no parallax, no looping/decorative animation. Respect
`prefers-reduced-motion`.

**Transparency / blur.** Used sparingly — overlay scrims behind modals, light
translucency on sticky headers. Not a decorative motif.

---

## ICONOGRAPHY

The Figma `Brand-assets` page ships a **very large, single-weight outline icon
set** — hundreds of glyphs whose names match **Boxicons** exactly
(`IconHome`, `IconUser`, `IconLogOut`, `IconGroup`, `IconInfoCircle`,
`IconPieChartAlt`/pie, `IconBookmark`, `IconDonateHeart`, `IconHappyBeaming`,
`IconBomb`, `IconDizzy`, …). The set is consistent stroke-outline style at small
sizes, navy or gray, used for nav, table affordances, badges and inline hints.

**Approach in this system:** load **Boxicons** from CDN
(`https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css`) — it is the same
library the file is built on, so coverage and visual weight match 1:1. Use
`bx bx-*` (outline) by default and `bxs-*` (solid) only where the file does.
Product nav mapping observed:

| Nav item | Boxicon |
|---|---|
| Hjem | `bx-home-alt-2` |
| Investeringer | `bx-pie-chart-alt-2` |
| Pensjon | `bx-wallet` / piggy-bank |
| Dokumenter | `bx-file` |
| Tilbakemelding | `bx-edit-alt` |
| Klientvelger | `bx-group` |
| Min side | `bx-user` |
| Logg ut | `bx-log-out` |
| Rapporteringsdato | `bx-info-circle` |

No emoji, ever. No unicode-glyph icons. Arrows in links use a real "→" (e.g.
"Se detaljer →"). Logos and the logomark are vector SVG (see `assets/`).

---

## VISUAL ASSETS (`assets/`)

- `spwm-logo.svg` — primary horizontal **product lockup**, navy `#002359`:
  logomark + "söderberg & partners" wordmark + thin divider + "Wealth
  Management" descriptor, all in one SVG.
- `spwm-logo-white.svg` — white knockout of the same lockup for dark/navy
  backgrounds.
- Clear space = the wordmark's cap height on every side; never recolor or
  distort. Minimum height ~20px.

---

## INDEX — what's in this folder

| Path | What |
|---|---|
| `README.md` | This file — context, content & visual foundations, iconography. |
| `colors_and_type.css` | All design tokens: color ramps, semantic roles, type scale, spacing, radius, elevation, plus `@font-face` + Google Fonts import. **Import this in every artifact.** |
| `SKILL.md` | Agent-Skills front-matter wrapper so this system works in Claude Code. |
| `assets/` | Logos (navy + white) and brand vector assets. |
| `fonts/` | SoderbergSans italic OTFs (client-supplied). |
| `preview/` | Design-system spec cards (the Design System tab). |
| `ui_kits/wealth-portal/` | High-fidelity, click-through recreation of the client portal (sidebar, dashboard, holdings, advisor, login). See its own README. |

---

## CAVEATS & OPEN QUESTIONS

See the end of the build summary — fonts are the main one. The real **Whitney**
and complete upright **SoderbergSans** weights should replace the substitutes
for production fidelity.
