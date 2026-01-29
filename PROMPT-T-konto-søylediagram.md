# Prompt: Gjenskape T-konto søylediagrammet i et annet dashboard

Kopier teksten nedenfor og bruk den som prompt når du bygger det samme søylediagrammet i et annet verktøy (Power BI, Tableau, Excel, eget dashboard, etc.).

---

## Prompt (kopier og lim inn)

**Lag et T-konto-søylediagram med følgende spesifikasjoner:**

### Layout
- **To stablet søylediagram** side ved side.
- **Venstre søyle:** «Eiendeler» (assets) – én vertikal stablet søyle.
- **Høyre søyle:** «Finansieringen» (finansiering) – én vertikal stablet søyle.
- **Mellom søylene:** En liten sirkulær/avrundet «likhetsindikator» med tegnet **=** (balanse: eiendeler = finansiering). Bakgrunn lys grå (ca. `#ECECEC`), diskret skygge.

### Eiendeler (venstre søyle)
Stablet søyle, segmenter **fra topp til bunn** (rekkefølge kan følge størrelse eller fast rekkefølge):

| Kategori | Farge (hex) | Eksempel etikett |
|----------|-------------|-------------------|
| BANK | `#7CA7D0` | BANK |
| FAST EIENDOM | `#9CC0EC` | FAST EIENDOM |
| INVESTERINGER MÅL OG BEHOV | `#C0D8F4` | INVESTERINGER MÅL OG BEHOV |

- **Etiketter:** Til venstre for søylen: kategorinavn (store bokstaver). Til høyre for søylen: beløp + prosent, f.eks. «2 000 000 kr - 7%».
- Søylen skal ha **avrundede hjørner** bare øverst og nederst på hele søylen; innvendige skille er rette.
- Subtil skygge/dybde på hvert segment (valgfritt).

### Finansieringen (høyre søyle)
Stablet søyle, segmenter **fra topp til bunn**:

| Kategori | Farge (hex) | Eksempel etikett |
|----------|-------------|-------------------|
| EGENKAPITAL | `#9FF4BE` | EGENKAPITAL |
| GJELD | `#F4B8BB` | GJELD |

- Samme etikettlogikk: kategorinavn til venstre, «beløp - prosent» til høyre.
- Samme søylestil: avrundede hjørner på hele søylen, flate skille inni, subtil skygge/dybde.

### Farger og bakgrunn
- **Side/canvas-bakgrunn:** Lys grå, ca. `#F8F8F8`.
- **Kort/panel rundt hver søyle:** Hvit `#FFFFFF`, avrundede hjørner (ca. 12px), svak drop shadow.
- **Separator (= -knappen):** Bakgrunn ca. `#ECECEC`, mørkere grå likhetstegn.

### Typografi
- **Skrift:** Enkel, moderne **sans-serif** (f.eks. Inter, Segoe UI, Roboto, Helvetica, Arial).
- **Kategorinavn og verdier:** Samme fontfamilie; etikettene kan ha litt lysere vekt/farge enn overskrifter.
- **Tekstfarge:** Mørk grå / nesten svart (ca. `#333333` eller `#1C2A3A`).

### Data
- Begge søyler representerer **samme total** (f.eks. 27 000 000 kr = 100 %).
- Eiendeler: summen av BANK + FAST EIENDOM + INVESTERINGER MÅL OG BEHOV = total.
- Finansiering: EGENKAPITAL + GJELD = samme total.
- Verdier og prosenter vises eksplisitt ved hvert segment (beløp + prosent).

### Krav oppsummert
1. Eiendeler til **venstre** i ett stablet søylediagram.
2. Finansieringen til **høyre** i ett stablet søylediagram.
3. **Nøyaktig disse hex-fargene:** BANK `#7CA7D0`, FAST EIENDOM `#9CC0EC`, INVESTERINGER MÅL OG BEHOV `#C0D8F4`, EGENKAPITAL `#9FF4BE`, GJELD `#F4B8BB`.
4. Samme fonter (sans-serif) og samme etikettlogikk (navn venstre, beløp og prosent høyre).
5. Lys grå bakgrunn, hvite kort med skygge, og likhetstegn «=» mellom søylene.

---

## Hex-farger (referanse)

| Element | Hex |
|--------|-----|
| BANK | `#7CA7D0` |
| FAST EIENDOM | `#9CC0EC` |
| INVESTERINGER MÅL OG BEHOV | `#C0D8F4` |
| EGENKAPITAL | `#9FF4BE` |
| GJELD | `#F4B8BB` |
| Bakgrunn | `#F8F8F8` |
| Kort/panel | `#FFFFFF` |
| Separator (=) | `#ECECEC` |
