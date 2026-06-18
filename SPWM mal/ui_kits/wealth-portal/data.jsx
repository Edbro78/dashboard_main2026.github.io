// ============================================================================
// Sample data — realistic Norwegian wealth-management figures
// ============================================================================
const DATA = {
  invest: {
    total: 6002474, ret: 1928156, retPct: 26.12,
    series: [4.0,4.05,4.12,4.02,4.2,4.35,4.28,4.5,4.62,4.55,4.7,4.85,4.78,4.95,5.1,5.05,5.25,5.4,5.35,5.55,5.7,5.8,5.92,6.0],
  },
  pensjon: {
    total: 1200234, ret: -142928, retPct: -14.51,
    series: [1.42,1.40,1.41,1.38,1.36,1.37,1.34,1.32,1.33,1.30,1.28,1.29,1.27,1.25,1.26,1.24,1.23,1.22,1.21,1.215,1.205,1.20,1.20,1.20],
  },
  allocation: [
    { label: "Kontantbeholdning", value: 305081, color: "#002359" },
    { label: "Likviditetsfond", value: 1322441, color: "#0A5EDC" },
    { label: "Aksjer", value: 3140858, color: "#6096E8" },
    { label: "Alternative strategier", value: 768256, color: "#9747FF" },
    { label: "Renter", value: 465838, color: "#A0AEC4" },
  ],
  holdings: [
    { name: "Arctic Norwegian Value Creation", value: 612277, share: 7.97, ret: 9.41 },
    { name: " AMSA Emerging Markets Equity Fund", value: 421629, share: 5.49, ret: 4.08 },
    { name: "Storebrand Global Indeks", value: 538709, share: 7.01, ret: 11.74 },
    { name: "Holberg Norge", value: 391033, share: 5.09, ret: -3.79 },
    { name: "Nordea Global Equity Opportunities", value: 663172, share: 8.63, ret: 14.22 },
    { name: "DNB Teknologi", value: 1067364, share: 13.90, ret: 22.06 },
    { name: "KLP AksjeGlobal Indeks", value: 620494, share: 8.08, ret: 6.91 },
    { name: "Skagen Global", value: 1088197, share: 14.16, ret: 10.20 },
    { name: "SSGA Global Bond NOK H", value: 1082617, share: 14.09, ret: 0.84 },
  ],
  news: [
    { category: "Markedssyn", title: "Et sterkt kvartal for globale aksjer", excerpt: "Verdens børser leverte bredt i andre kvartal, drevet av lavere inflasjon og forventninger om rentekutt." },
    { category: "Pensjon", title: "Slik påvirker rentebanen pensjonen din", excerpt: "Langsiktige renter har falt — vi ser på hva det betyr for fremtidig pensjonskapital." },
    { category: "Bærekraft", title: "Nye krav til bærekraftsrapportering", excerpt: "Fra 2025 stilles strengere krav. Her er hva det betyr for porteføljen din." },
  ],
  advisors: [
    { name: "André Lund Walker", role: "Senior rådgiver · Wealth Management", phone: "+47 922 14 087", email: "andre.walker@soderbergpartners.no", primary: true },
    { name: "Michael V. Sivertsen", role: "Administrerende direktør", phone: "+47 951 33 210", email: "michael.sivertsen@soderbergpartners.no" },
  ],
};
window.DATA = DATA;
