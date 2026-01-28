# dashboard_main2026.github.io

Dashboard med **Mål og behov**, **T-konto** og **Risikosimulering** (faner øverst).

## Slik starter du dashboardet

### Fra GitHub (publisert side)
- Aktiver **GitHub Pages** for dette repoet: Settings → Pages → Source: Deploy from branch → branch `main` → Save.
- Åpne: **https://edbro78.github.io/dashboard_main2026.github.io/**  
  Da lastes `index.html` automatisk – samme opplevelse som i preview.

### Lokalt etter clone
1. Klon repoet:  
   `git clone https://github.com/Edbro78/dashboard_main2026.github.io.git`  
   og åpne mappen.
2. Start dashboardet på én av måtene:
   - **Dobbelklikk** på `index.html` (åpnes i nettleser), eller
   - **Lokal server** (anbefalt, færre begrensninger):  
     `npx serve`  
     og gå til adressen som vises (f.eks. http://localhost:3000).  
     Da får du samme oppførsel som i Live Server / preview.

### Filer som inngang
- **index.html** (rot) = hovedinngang: faner Mål og behov, T-konto, Risikosimulering (som i preview).
- **maal og behov index.html** = samme innhold som index.html.
- **t-konto index.html** = kun T-konto-dashboard uten faner.