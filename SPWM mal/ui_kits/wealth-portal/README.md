# UI Kit — Wealth Management Client Portal

A high-fidelity, click-through recreation of the **Söderberg & Partners Wealth
Management** client portal, built from the `Designsystem.fig` Foundations,
Navigation, Cards, Page-template and Data-visualization pages.

It is a **cosmetic prototype**, not production code — interactions are faked,
data is sample data — but the visuals, layout and component anatomy match the
source design system.

## Run it

Open `index.html`. You land on the **login** screen → click **Logg inn** (or
**Logg inn med BankID**) to enter the portal. Navigate with the sidebar:
**Hjem · Investeringer · Pensjon · Dokumenter · Rådgiver**. The client-selector,
client dropdown, period chips, and mobile drawer (resize < 900px) are live.

## Screens

| Route | What it shows |
|---|---|
| **Login** | Split navy brand panel (display headline) + email/password + BankID. |
| **Hjem** (Oversikt) | Greeting, Investeringer & Pensjon KPI cards with sparklines, asset-allocation overview, news grid. |
| **Investeringer** | Large performance chart + period chips, asset allocation, full holdings table (Beholdning). |
| **Pensjon** | Pension performance chart, pension-agreements list, estimated-pension highlight card. |
| **Dokumenter** | Document list with type/date/size and download. |
| **Rådgiver** | Advisor cards (Din rådgiver) + "Book et møte" navy CTA card. |

## Files

| File | Contents |
|---|---|
| `index.html` | Entry point — loads React 18 + Babel, Boxicons, tokens, and all `.jsx`. |
| `primitives.jsx` | `Button`, `Badge`, `Avatar`, `Input`, `Card`, `Icon`, plus `nok()` / `pct()` Norwegian formatters. |
| `charts.jsx` | `LineChart` (smooth SVG line + area fill) and `Doughnut` (allocation). |
| `shell.jsx` | `Sidebar`, `NavItem`, `ClientSelector`, `PageHeader`, `MobileTopbar`. |
| `cards.jsx` | `KpiCard`, `NewsCard`, `AdvisorCard`, `SectionTitle`, `DetailLink`. |
| `tables.jsx` | `AssetAllocation`, `HoldingsTable`. |
| `data.jsx` | Sample data (`window.DATA`). |
| `screens.jsx` | Page bodies: `Hjem`, `Investeringer`, `Pensjon`, `Dokumenter`, `Radgiver`. |
| `app.jsx` | `Login`, `Portal` shell + router, `App`. |

Components are plain Babel scripts that publish to `window` (no modules); each
defines uniquely-named style objects to avoid global collisions.

## Notes & known limitations

- **Icons** use the **Boxicons** webfont (`bx bx-*`) from CDN — the same library
  the Figma file is built on. They render live in the browser; some
  screenshot/PDF tools don't rasterize icon-font glyphs, so exported stills may
  show icons missing even though the live UI is correct.
- **Typeface** is Hanken Grotesk (Whitney substitute) — see the root README.
- News thumbnails and advisor photos are **placeholders** (gradient block /
  initial avatars); drop in real imagery for production.
