---
name: soderberg-wm-design
description: Use this skill to generate well-branded interfaces and assets for Söderberg & Partners Wealth Management, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the wealth-management client portal.
user-invocable: true
---

# Söderberg & Partners — Wealth Management design

Read `README.md` first — it covers company/product context, content
fundamentals (Norwegian Bokmål, tone, casing, number formatting), visual
foundations (color, type, spacing, motion, states), and iconography. Then
explore the other files as needed.

## Key files
- `colors_and_type.css` — all design tokens (color ramps, semantic roles, type
  scale, spacing, radius, elevation) + `@font-face` and the Google Fonts import.
  **Import this in every artifact you build.**
- `assets/` — logos (navy + white lockups, logomark).
- `fonts/` — SoderbergSans italic OTFs (client-supplied).
- `preview/` — design-system spec cards.
- `ui_kits/wealth-portal/` — high-fidelity, reusable React (Babel) components
  recreating the client portal (sidebar, KPI cards, charts, tables, login).

## How to work
- For **visual artifacts** (slides, mocks, throwaway prototypes): copy the
  assets you need out of `assets/`, link `colors_and_type.css` and Boxicons,
  and produce static/standalone HTML for the user to view.
- For **production code**: copy assets and apply the rules here to design
  on-brand; reuse the `ui_kits/wealth-portal/` components as cosmetic references.

## Non-negotiables
- Söderberg navy `#002359` is the ink; blue `#0A5EDC` is the one action color.
- Whitney type (substituted by **Hanken Grotesk** — the real Whitney /
  upright SoderbergSans should replace it for production).
- Norwegian Bokmål, sentence case, space-grouped thousands + "kr", signed %.
- Icons via **Boxicons** (`bx bx-*`). No emoji. No gradients on surfaces.
- Calm, precise, advisory tone — exclusive, modern, clean.

If invoked without guidance, ask the user what they want to build, ask a few
focused questions, then act as an expert designer who outputs HTML artifacts or
production code as appropriate.
