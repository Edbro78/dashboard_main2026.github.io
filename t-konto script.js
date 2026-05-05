// Global app state
let __nextId = 1;
function genId() { return __nextId++; }

/** Standardraden som henter verdier fra Mål og behov; skal gjenkjennes uavhengig av visningsnavn (farge #002359, ikke slettes). */
function isMaalOgBehovPortfolioAsset(a) {
  if (!a || typeof a !== "object") return false;
  if (a.maalOgBehovPortfolio === true) return true;
  return /investeringer\s*mål\s*og\s*behov/i.test(String(a.name || "").trim());
}

// Default eiendeler: navn er låst (noRename) og kan ikke slettes.
// Unntak: «Investeringer Mål og behov»-raden henter beløp fra Mål og behov og er også låst mot sletting (stabil flagg `maalOgBehovPortfolio`).
const DEFAULT_ASSET_NAMES = ["Bankinnskudd", "Primærbolig", "Fritidseiendom", "Sekundærbolig", "Tomt"];

const AppState = {
  assets: [
    { id: genId(), name: "Bankinnskudd", amount: 2000000, noRename: true, noDelete: true },
    { id: genId(), name: "Primærbolig", amount: 10000000, noRename: true, noDelete: true },
    { id: genId(), name: "Fritidseiendom", amount: 2000000, assetType: "fritidseiendom", noRename: true, noDelete: true },
    { id: genId(), name: "Sekundærbolig", amount: 3000000, assetType: "sekundaereiendom", noRename: true, noDelete: true },
    { id: genId(), name: "Tomt", amount: 3000000, assetType: "tomt", noRename: true, noDelete: true },
    {
      id: genId(),
      name: "Investeringer Mål og behov",
      amount: 0,
      assetType: "investeringer",
      maalOgBehovPortfolio: true,
      noDelete: true
    }
  ],
  debts: [
    { id: genId(), name: "BOLIGLÅN", amount: 10000000, debtParams: { type: "Annuitetslån", years: 25, rate: 0.04 } }
  ],
  incomes: [
    { id: genId(), name: "LØNNSINNTEKT", amount: 1500000 },
    { id: genId(), name: "UTBYTTER", amount: 0 },
    { id: genId(), name: "Skattefrie inntekter", amount: 0 },
    { id: genId(), name: "PENSJONSINNTEKT", amount: 0 },
    { id: genId(), name: "Utbetalinger fra Mål og behov", amount: 0, _isMoBUtbetalingRow: true, _maalOgBehovUtbetalingToggleUI: true },
    { id: genId(), name: "Inntektsskatt", amount: 0 },
    { id: genId(), name: "Utbytteskatt", amount: 0 },
    { id: genId(), name: "Formuesskatt", amount: 0 },
    { id: genId(), name: "ÅRLIGE KOSTNADER", amount: 0 }
  ],
  debtParams: { type: "Annuitetslån", years: 25, rate: 0.04 }, // Fallback for bakoverkompatibilitet
  expectations: { likvider: 4, fastEiendom: 4, investeringer: 6, andreEiendeler: 0, bilbat: -5, kpi: 2.5 },
  cashflowRouting: { mode: "forbruk", customAmount: 0 },
  structure: {
    privat: [
      { active: true, name: "Ektefelle I" },
      { active: true, name: "Ektefelle II" }
    ], // Array for å støtte flere privat-bokser; index > 0 kan være aktiv/inaktiv
    // ownershipPct: heltall per privat-indeks, sum 100. Mangler/ugyldig lengde → lik fordeling (50/50 ved 2 privat, 100 % ved 1).
    holding1: { active: false, name: "Holding AS", ownershipPct: null },
    holding2: { active: false, name: "Holding II AS", ownershipPct: null }
  },
  tKontoViewMode: "individual", // "individual" eller "grouped"
  treemapValues: { // Lagre verdier fra treemap-diagrammene
    assets: 0,
    debts: 0,
    equity: 0,
    cashflow: 0
  },
  taxRates: [], // Skattesatser lastes fra JSON-fil
  lastActiveSection: "Forside" // Lagre siste aktive seksjon i T-konto dashboardet
};

function ensureCashflowRoutingState() {
  if (!AppState.cashflowRouting) {
    AppState.cashflowRouting = { mode: "forbruk", customAmount: 0 };
  }
  const state = AppState.cashflowRouting;
  if (typeof state.mode !== "string") state.mode = "forbruk";
  if (!isFinite(state.customAmount)) state.customAmount = 0;
  return state;
}

function getPensjonForecastData() {
  try {
    const raw = localStorage.getItem("pensjonsgapetTKontoAarligPensjon");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const annualPension = Math.max(0, Number(data.annualPension) || 0);
    const age = Math.max(0, Number(data.age) || 0);
    const retirementAge = Math.max(0, Number(data.retirementAge) || 0);
    const yearsToRetirement = Number.isFinite(data.yearsToRetirement)
      ? Math.max(0, Number(data.yearsToRetirement))
      : Math.max(0, retirementAge - age);
    return { annualPension, age, retirementAge, yearsToRetirement };
  } catch (e) {
    return null;
  }
}

/** Felles parametre når «årlig pensjon i kontantstrøm» er på: år fra 2026 bestemmer lønn vs pensjon. */
function getPensionCashflowModeParams() {
  const incomes = AppState.incomes || [];
  const upper = (s) => String(s || "").toUpperCase();
  const pensionIncomeItem = incomes.find((i) => /PENSJON/.test(upper(i.name)));
  const pensionModeEnabled = !!(pensionIncomeItem && pensionIncomeItem._annualPensionEnabled);
  const pensjonData = pensionModeEnabled ? getPensjonForecastData() : null;
  const pensionModeActive = pensionModeEnabled && !!pensjonData;
  const yearsToRetirement = pensjonData ? Math.max(0, Number(pensjonData.yearsToRetirement) || 0) : 0;
  const annualPensionFromPensjon = pensjonData ? Math.max(0, Number(pensjonData.annualPension) || 0) : 0;
  const pensionFromTKonto = Math.max(0, Number(pensionIncomeItem && pensionIncomeItem.amount) || 0);
  const activeAnnualPension = annualPensionFromPensjon > 0 ? annualPensionFromPensjon : pensionFromTKonto;
  return {
    pensionModeActive,
    yearsToRetirement,
    activeAnnualPension,
    pensionIncomeItem
  };
}

/** Flat inntektsskatt på pensjonsinntekt i kontantstrøm fra og med året pensjon erstatter lønn (år fra 2026 ≥ år til pensjon). */
const PENSION_POST_RETIREMENT_INCOME_TAX_RATE = 0.3;

/** Pensjon i skattegrunnlag (auto inntektsskatt) kun etter pensjonsstart — samme akse som kontantstrøm (år fra 2026). */
function pensionAmountForIncomeTaxEstimate() {
  const pensionIncome = AppState.incomes.find((i) => i.name === "PENSJONSINNTEKT");
  if (!pensionIncome) return 0;
  const raw = Math.max(0, Number(pensionIncome.amount) || 0);
  if (!pensionIncome._annualPensionEnabled) return raw;
  const pd = getPensjonForecastData();
  if (!pd) return 0;
  const ytr = Math.max(0, Number(pd.yearsToRetirement) || 0);
  const annualPension = Math.max(0, Number(pd.annualPension) || 0);
  const activeAnnualPension = annualPension > 0 ? annualPension : raw;
  const refYear = 2026;
  const yearsFrom2026 = Math.max(0, refYear - 2026);
  if (yearsFrom2026 >= ytr) return activeAnnualPension;
  return 0;
}

// Last skattesatser fra JSON-fil
async function loadTaxRates() {
  try {
    const response = await fetch('skattesatser.json');
    const data = await response.json();
    AppState.taxRates = data;
  } catch (error) {
    console.error('Kunne ikke laste skattesatser:', error);
    AppState.taxRates = [];
  }
}

// Beregn skatt basert på lønn/inntekt
function calculateTax(income) {
  if (!AppState.taxRates || AppState.taxRates.length === 0) {
    return 0;
  }

  // Hvis inntekt er over 10 MNOK, bruk 46.2% sats
  if (income > 10000000) {
    return Math.round(income * 0.462);
  }

  // Finn nærmeste match i skattesatser
  // Sorter etter lønn for å finne riktig intervall
  const sortedRates = [...AppState.taxRates].sort((a, b) => a.lønn - b.lønn);
  
  // Hvis inntekt er lavere enn laveste i tabellen, returner 0
  if (income < sortedRates[0].lønn) {
    return 0;
  }

  // Finn nærmeste match (interpolasjon eller eksakt match)
  for (let i = 0; i < sortedRates.length; i++) {
    if (income === sortedRates[i].lønn) {
      return sortedRates[i].skatt;
    }
    if (i < sortedRates.length - 1 && income > sortedRates[i].lønn && income < sortedRates[i + 1].lønn) {
      // Interpoler mellom to punkter
      const lower = sortedRates[i];
      const upper = sortedRates[i + 1];
      const ratio = (income - lower.lønn) / (upper.lønn - lower.lønn);
      return Math.round(lower.skatt + (upper.skatt - lower.skatt) * ratio);
    }
  }

  // Hvis inntekt er høyere enn høyeste i tabellen (men under 10 MNOK), bruk siste sats
  const lastRate = sortedRates[sortedRates.length - 1];
  if (income > lastRate.lønn) {
    // Estimer basert på siste sats
    const taxRate = lastRate.skatt / lastRate.lønn;
    return Math.round(income * taxRate);
  }

  return 0;
}

function updateAutoDividendTax() {
  const dividendTaxItem = AppState.incomes.find(i => i.name === "Utbytteskatt");
  if (dividendTaxItem && dividendTaxItem._autoTaxEnabled) {
    const dividends = AppState.incomes.find(i => i.name === "UTBYTTER");
    if (dividends) {
      const calculatedTax = Math.round(dividends.amount * 0.3784); // 37.84% utbytteskatt
      dividendTaxItem.amount = calculatedTax;

      // Oppdater UI hvis elementet eksisterer (re-render kan gi midlertidig feil tall)
      const taxRow = document.querySelector(`.asset-name[value="Utbytteskatt"]`)?.closest('.asset-row');
      if (taxRow) {
        const taxRange = taxRow.querySelector('.asset-range');
        const taxAmount = taxRow.querySelector('.asset-amount');
        if (taxRange) taxRange.value = String(calculatedTax);
        if (taxAmount) taxAmount.textContent = formatNOK(calculatedTax);
      }
    }
  }
}

// Oppdater skatt hvis auto-beregning er aktiv
function updateAutoTax() {
  // Oppdater Inntektsskatt
  const taxItem = AppState.incomes.find(i => i.name === "Inntektsskatt");
  if (taxItem && taxItem._autoTaxEnabled) {
    const wageIncome = AppState.incomes.find(i => i.name === "LØNNSINNTEKT");
    const taxableIncome =
      (wageIncome ? wageIncome.amount : 0) + pensionAmountForIncomeTaxEstimate();
    if (taxableIncome > 0) {
      const calculatedTax = calculateTax(taxableIncome);
      taxItem.amount = calculatedTax;
      
      // Oppdater UI hvis elementet eksisterer
      const taxRow = document.querySelector(`.asset-name[value="Inntektsskatt"]`)?.closest('.asset-row');
      if (taxRow) {
        const taxRange = taxRow.querySelector('.asset-range');
        const taxAmount = taxRow.querySelector('.asset-amount');
        if (taxRange) {
          taxRange.value = String(calculatedTax);
        }
        if (taxAmount) {
          taxAmount.textContent = formatNOK(calculatedTax);
        }
      }
    }
  }

  // Oppdater Utbytteskatt
  updateAutoDividendTax();

  // Formuesskatt hentes kun fra Formuesskatt-fanen ved toggle-klikk (ikke beregnet her)

  // Oppdater Årlige kostnader
  const annualCostsItem = AppState.incomes.find(i => i.name === "ÅRLIGE KOSTNADER");
  if (annualCostsItem && annualCostsItem._autoTaxEnabled) {
    // Beregn sum av alle eiendeler
    const assets = AppState.assets || [];
    const sumAssets = assets.reduce((s, x) => s + (x.amount || 0), 0);
    
    // Eierkostnader = sum eiendeler × 2%
    const calculatedCosts = Math.round(sumAssets * 0.02);
    annualCostsItem.amount = calculatedCosts;
    
    // Oppdater UI hvis elementet eksisterer
    const costRow = document.querySelector(`.asset-name[value="ÅRLIGE KOSTNADER"]`)?.closest('.asset-row');
    if (costRow) {
      const costRange = costRow.querySelector('.asset-range');
      const costAmount = costRow.querySelector('.asset-amount');
      if (costRange) {
        costRange.value = String(calculatedCosts);
      }
      if (costAmount) {
        costAmount.textContent = formatNOK(calculatedCosts);
      }
    }
  }
}

// Initialize function that can be called directly or on DOMContentLoaded
function initTKontoDashboard() {
  // Check if DOM elements exist - if not, this is first initialization
  const moduleRoot = document.getElementById("module-root");
  const navItems = document.querySelectorAll(".nav-item");
  
  // If elements don't exist, this might be called before React has rendered
  // In that case, just return and wait for next call
  if (!moduleRoot || navItems.length === 0) {
    return;
  }

  if (AppState.lastActiveSection === "Treemap") {
    AppState.lastActiveSection = "T-Konto";
  }

  // Check if this is a re-initialization by checking if nav items already have click handlers
  // We'll use a data attribute to track this
  const isReinit = navItems[0] && navItems[0].hasAttribute('data-tkonto-initialized');
  
  // If re-initializing, just re-render the current view
  if (isReinit) {
    // Bruk lagret seksjon i stedet for å sjekke DOM (som kan være feil etter unmount)
    const savedSection = AppState.lastActiveSection || "Forside";
    
    // Finn og aktiver riktig nav-item basert på lagret seksjon
    const savedNavItem = Array.from(navItems).find(item => {
      const itemSection = item.getAttribute("data-section") || item.textContent || "";
      return itemSection === savedSection;
    });
    
    if (savedNavItem) {
      // Fjern active fra alle items
      navItems.forEach(item => item.classList.remove("is-active"));
      // Aktiver lagret seksjon
      savedNavItem.classList.add("is-active");
    }
    
    // Hent sectionTitle element
    const sectionTitle = document.getElementById("sectionTitle");
    const sectionDisplayMap = {
      "Tapsbærende evne": "Risikoevne",
      TBE: "Risikoevne",
      "T-Konto": "T-Konto"
    };
    
    // Render basert på lagret seksjon
    if (savedSection === "Forside") {
      if (typeof renderForsideModule === 'function') renderForsideModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Forside";
    } else if (savedSection === "Struktur") {
      if (typeof renderStrukturModule === 'function') renderStrukturModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Familieforhold - organisering";
    } else if (savedSection === "Eiendeler") {
      if (typeof renderAssetsModule === 'function') renderAssetsModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Eiendeler";
    } else if (savedSection === "Gjeld") {
      if (typeof renderDebtModule === 'function') renderDebtModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Gjeld";
    } else if (savedSection === "Inntekter") {
      if (typeof renderIncomeModule === 'function') renderIncomeModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Inntekter";
    } else if (savedSection === "Analyse") {
      if (typeof renderAnalysisModule === 'function') renderAnalysisModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Analyse";
    } else if (savedSection === "TBE" || savedSection === "Tapsbærende evne") {
      if (typeof renderTbeModule === 'function') renderTbeModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Risikoevne";
    } else if (savedSection === "Forventet avkastning") {
      if (typeof renderExpectationsModule === 'function') renderExpectationsModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Forventet avkastning";
    } else if (savedSection === "Kontantstrøm") {
      if (typeof renderWaterfallModule === 'function') renderWaterfallModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Kontantstrøm";
    } else if (savedSection === "T-Konto") {
      if (typeof renderFutureModule === 'function') {
        renderFutureModule(moduleRoot);
        if (typeof updateCardsForTKonto === 'function') updateCardsForTKonto();
      }
      if (sectionTitle) sectionTitle.textContent = "T-Konto";
    } else {
      // Default to Forside if no active section
      if (typeof renderForsideModule === 'function') renderForsideModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Forside";
    }
    
    if (typeof updateTopSummaries === 'function') updateTopSummaries();
    if (typeof renderStepper === 'function') {
      const displayTitle = sectionDisplayMap[savedSection] || savedSection;
      const stepperKey = displayTitle || "Forside";
      renderStepper(stepperKey);
    }
    return; // Skip setting up event listeners again
  }
  
  // Last skattesatser ved oppstart
  loadTaxRates();
  const sectionTitle = document.getElementById("sectionTitle");
  const stepperList = document.getElementById("stepper-list");
  // Output UI
  initOutputUI();
  // Input UI
  initInputUI();

  // Synkroniser gjeldende formuesskatt til Mål og behov (så «Hent fra T-konto» får riktig verdi, også 0)
  const wealthTaxItemInit = AppState.incomes.find(i => i.name === "Formuesskatt");
  if (wealthTaxItemInit) setFormuesskattForMaalOgBehov(wealthTaxItemInit.amount);

  // Nullstill-knapp
  const resetBtn = document.getElementById("reset-all");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      // Nullstill alle beløp i app-state
      (AppState.assets || []).forEach(a => a.amount = 0);
      (AppState.debts || []).forEach(d => d.amount = 0);
      (AppState.incomes || []).forEach(i => i.amount = 0);
      AppState.cashflowRouting = { mode: "forbruk", customAmount: 0 };
      setFormuesskattForMaalOgBehov(0);
      // Re-render gjeldende fane
      const current = document.querySelector(".nav-item.is-active");
      const section = current && (current.getAttribute("data-section") || current.textContent || "");
      if (moduleRoot) {
        if (section === "Forside") renderForsideModule(moduleRoot);
        else if (section === "Struktur") renderStrukturModule(moduleRoot);
        else if (section === "Eiendeler") renderAssetsModule(moduleRoot);
        else if (section === "Gjeld") renderDebtModule(moduleRoot);
        else if (section === "Inntekter") renderIncomeModule(moduleRoot);
        else if (section === "Analyse") renderAnalysisModule(moduleRoot);
        else if (section === "TBE" || section === "Tapsbærende evne") renderTbeModule(moduleRoot);
        else if (section === "Forventet avkastning") renderExpectationsModule(moduleRoot);
        else if (section === "T-Konto") {
          renderFutureModule(moduleRoot);
          updateCardsForTKonto();
        }
        else if (section === "Kontantstrøm") renderWaterfallModule(moduleRoot);
        else if (section === "Fremtidig utvikling") renderFutureModule(moduleRoot);
        else moduleRoot.innerHTML = "";
      }
      // Oppdater summer, men ikke hvis vi er i T-Konto (der skal de være tomme)
      if (section !== "T-Konto") {
        updateTopSummaries();
      }
    });
  }

  // Bygg stepper
  const steps = [
    { key: "Forside" },
    { key: "Struktur" },
    { key: "Eiendeler" },
    { key: "Gjeld" },
    { key: "Inntekter" },
    { key: "Kontantstrøm" },
    { key: "T-Konto" },
    { key: "Risikoevne" }
  ];
  function renderStepper(currentKey) {
    if (!stepperList) return;
    stepperList.innerHTML = "";
    // Sett dynamisk kolonneantall
    stepperList.style.setProperty("--step-count", String(steps.length));
    steps.forEach((s, idx) => {
      const li = document.createElement("li");
      li.className = "step";
      const dot = document.createElement("span");
      dot.className = "step-dot";
      const label = document.createElement("span");
      label.className = "step-label";
      label.textContent = s.key;
      li.appendChild(dot); li.appendChild(label);
      const currentIndex = steps.findIndex(x => x.key === currentKey);
      if (idx <= currentIndex) li.classList.add("is-reached");
      if (idx === currentIndex) li.classList.add("is-current");
      stepperList.appendChild(li);
    });
  }

  // Mapping mellom data-section og display navn for stepper/sectionTitle
  const sectionDisplayMap = {
    "Tapsbærende evne": "Risikoevne",
    TBE: "Risikoevne",
    "T-Konto": "T-Konto"
  };

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const currentlyActive = document.querySelector(".nav-item.is-active");
      const wasTKonto = currentlyActive && currentlyActive.getAttribute("data-section") === "T-Konto";
      
      if (currentlyActive) currentlyActive.classList.remove("is-active");

      item.classList.add("is-active");

      const title = item.getAttribute("data-section") || item.textContent || "";
      
      // Lagre den aktive seksjonen i AppState
      AppState.lastActiveSection = title;
      
      const displayTitle = sectionDisplayMap[title] || title;
      let stepperKey = displayTitle;

      if (title === "Forside") {
        stepperKey = "Forside";
        if (sectionTitle) sectionTitle.textContent = "Forside";
      } else if (title === "Struktur") {
        stepperKey = "Struktur";
        if (sectionTitle) sectionTitle.textContent = "Familieforhold - organisering";
      } else {
        if (sectionTitle) sectionTitle.textContent = title === "Tapsbærende evne" ? "Risikoevne" : displayTitle;
      }

      renderStepper(stepperKey);

      // Gjenopprett kortene hvis vi forlater T-Konto
      if (wasTKonto && title !== "T-Konto") {
        restoreCardsFromTKonto();
      }

      if (!moduleRoot) return;
      if (title === "Forside") {
        renderForsideModule(moduleRoot);
      } else if (title === "Struktur") {
        renderStrukturModule(moduleRoot);
      } else if (title === "Eiendeler") {
        renderAssetsModule(moduleRoot);
      } else if (title === "Gjeld") {
        renderDebtModule(moduleRoot);
      } else if (title === "Inntekter") {
        renderIncomeModule(moduleRoot);
      } else if (title === "Analyse") {
        renderAnalysisModule(moduleRoot);
      } else if (title === "TBE" || title === "Tapsbærende evne") {
        renderTbeModule(moduleRoot);
      } else if (title === "Forventet avkastning") {
        renderExpectationsModule(moduleRoot);
      } else if (title === "Kontantstrøm") {
        renderWaterfallModule(moduleRoot);
      } else if (title === "T-Konto") {
        renderFutureModule(moduleRoot);
        updateCardsForTKonto();
      } else {
        moduleRoot.innerHTML = "";
      }
    });
  });

  // Gjenopprett siste aktive seksjon eller bruk Forside som standard
  const savedSection = AppState.lastActiveSection || "Forside";
  
  // Finn og aktiver riktig nav-item
  const savedNavItem = Array.from(navItems).find(item => {
    const itemSection = item.getAttribute("data-section") || item.textContent || "";
    return itemSection === savedSection;
  });
  
  if (savedNavItem) {
    // Fjern active fra alle items
    navItems.forEach(item => item.classList.remove("is-active"));
    // Aktiver lagret seksjon
    savedNavItem.classList.add("is-active");
  } else {
    // Hvis lagret seksjon ikke finnes, bruk Forside
    const forsideItem = Array.from(navItems).find(item => {
      const itemSection = item.getAttribute("data-section") || item.textContent || "";
      return itemSection === "Forside";
    });
    if (forsideItem) {
      navItems.forEach(item => item.classList.remove("is-active"));
      forsideItem.classList.add("is-active");
    }
  }
  
  // Render riktig modul basert på lagret seksjon
  const activeSection = savedNavItem ? savedSection : "Forside";
  const displayTitle = sectionDisplayMap[activeSection] || activeSection;
  let stepperKey = displayTitle;
  
  if (moduleRoot) {
    if (activeSection === "Forside") {
      renderForsideModule(moduleRoot);
      stepperKey = "Forside";
      if (sectionTitle) sectionTitle.textContent = "Forside";
    } else if (activeSection === "Struktur") {
      renderStrukturModule(moduleRoot);
      stepperKey = "Struktur";
      if (sectionTitle) sectionTitle.textContent = "Familieforhold - organisering";
    } else if (activeSection === "Eiendeler") {
      renderAssetsModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Eiendeler";
    } else if (activeSection === "Gjeld") {
      renderDebtModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Gjeld";
    } else if (activeSection === "Inntekter") {
      renderIncomeModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Inntekter";
    } else if (activeSection === "Analyse") {
      renderAnalysisModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Analyse";
    } else if (activeSection === "TBE" || activeSection === "Tapsbærende evne") {
      renderTbeModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Risikoevne";
    } else if (activeSection === "Forventet avkastning") {
      renderExpectationsModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Forventet avkastning";
    } else if (activeSection === "Kontantstrøm") {
      renderWaterfallModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Kontantstrøm";
    } else if (activeSection === "T-Konto") {
      renderFutureModule(moduleRoot);
      updateCardsForTKonto();
      if (sectionTitle) sectionTitle.textContent = "T-Konto";
    } else {
      // Fallback til Forside
      renderForsideModule(moduleRoot);
      stepperKey = "Forside";
      if (sectionTitle) sectionTitle.textContent = "Forside";
    }
  }
  
  // Oppdater summer i topp-boksene
  updateTopSummaries();
  // Init stepper med riktig seksjon
  renderStepper(stepperKey);
  
  // Privat-knappen (Eiendeler-kortet) håndteres av event delegation ovenfor – ingen direkte listener her
  const summaryAssetsButton = document.getElementById("summary-assets-button");
  if (summaryAssetsButton) {
    summaryAssetsButton.style.cursor = "pointer";
  }
  
  // Legg til klikk-handler på Utvikling eiendeler-knappen (kun i T-Konto-fanen)
  const summaryDevelopmentButton = document.getElementById("summary-development-button");
  if (summaryDevelopmentButton) {
    summaryDevelopmentButton.addEventListener("click", () => {
      // Sjekk om vi er i T-Konto-fanen
      const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"]');
      if (tKontoNavItem && tKontoNavItem.classList.contains("is-active")) {
        // Åpne eiendelsutvikling-modalen
        openGiModal();
      }
    });
    
    // Legg til keyboard support
    summaryDevelopmentButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        summaryDevelopmentButton.click();
      }
    });
  }
  
  // Legg til klikk-handler på Egenkapital og gjeld-knappen (kun i T-Konto-fanen)
  const summaryFinancingButton = document.getElementById("summary-financing-button");
  if (summaryFinancingButton) {
    summaryFinancingButton.addEventListener("click", () => {
      // Sjekk om vi er i T-Konto-fanen
      const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"]');
      if (tKontoNavItem && tKontoNavItem.classList.contains("is-active")) {
        // Åpne finansieringsutvikling-modalen
        openFinancingModal();
      }
    });
    
    // Legg til keyboard support
    summaryFinancingButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        summaryFinancingButton.click();
      }
    });
  }
  
  // Legg til klikk-handler på Ek avkastning-knappen (kun i T-Konto-fanen)
  const summaryEquityReturnButton = document.getElementById("summary-equity-return-button");
  if (summaryEquityReturnButton) {
    summaryEquityReturnButton.addEventListener("click", () => {
      // Sjekk om vi er i T-Konto-fanen
      const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"]');
      if (tKontoNavItem && tKontoNavItem.classList.contains("is-active")) {
        // Åpne EK Avkastning-modalen
        openEquityReturnModal();
      }
    });
    
    // Legg til keyboard support
    summaryEquityReturnButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        summaryEquityReturnButton.click();
      }
    });
  }
  
  // Mark that initialization is complete (after all event listeners are set up)
  const allNavItems = document.querySelectorAll(".nav-item");
  allNavItems.forEach(item => item.setAttribute('data-tkonto-initialized', 'true'));
}

// Expose initTKontoDashboard globally so it can be called from React component
window.initTKontoDashboard = initTKontoDashboard;
// For Oppsummeringsrapport: eiendeler og finansiering per år
window.getTKontoAssetSegments = getTKontoAssetSegments;
window.getTKontoFinancingSegments = getTKontoFinancingSegments;
/** Returnerer full kontantstrøm-breakdown per år (samme grunnlag som waterfall i Kontantstrøm-fanen). */
window.getTKontoCashflowBreakdownForYear = function (yearVal) {
  try {
    return computeAnnualCashflowBreakdownForYear(yearVal, {
      kontantstromStartAlignsDebtWith2026: true
    });
  } catch (e) {
    return null;
  }
};
/** Returnerer kontantstrøm-serie for flere år (samme kilde som waterfall). */
window.getTKontoCashflowSeriesForYears = function (years) {
  try {
    if (!Array.isArray(years)) return [];
    return years.map(function (yearVal) {
      var breakdown = window.getTKontoCashflowBreakdownForYear(yearVal);
      return Math.round((breakdown && Number(breakdown.net)) || 0);
    });
  } catch (e) {
    return [];
  }
};
/** Returnerer årlig kontantstrøm for et gitt år (brukes i Oppsummeringsrapport). */
window.getTKontoCashflowForYear = function (yearVal) {
  try {
    // Bruk eksakt samme beregningsløp som Kontantstrøm-fanen (waterfall),
    // inkl. spesialregel for "start" (2025) som aligner gjeld med 2026.
    const res = window.getTKontoCashflowBreakdownForYear(yearVal);
    return Math.round((res && Number(res.net)) || 0);
  } catch (e) {
    return 0;
  }
};

/** Returnerer det konkrete tallet som står til høyre for Formuesskatt i T-konto (aldri finn på eget tall). */
window.getTKontoFormuesskatt = function () {
  try {
    var w = AppState.incomes.find(function (i) { return i.name === "Formuesskatt"; });
    var amount = w && typeof w.amount === "number" ? w.amount : 0;
    return Math.max(0, Math.round(amount));
  } catch (e) {
    return 0;
  }
};

/** Returnerer navn til Strategi-fanen:
 *  prioriter aktivt AS-navn fra Familieforhold-organisering,
 *  ellers bruk navn på Ektefelle I og Ektefelle II.
 */
window.getTKontoStrategiDisplayName = function () {
  try {
    var structure = (AppState && AppState.structure) || {};
    var h1 = structure.holding1 || {};
    var h2 = structure.holding2 || {};
    var h1Name = String(h1.name || "").trim();
    var h2Name = String(h2.name || "").trim();

    function isAsName(name) {
      return /\bAS\b/i.test(String(name || "").trim());
    }

    // 1) Bedrifter lagt til i Familieforhold-organisering (struktur-dashboard)
    // Prioriter alltid faktisk bedriftsnavn herfra (ikke krev "AS").
    var companies = Array.isArray(AppState && AppState.structureDashboardCompanies)
      ? AppState.structureDashboardCompanies
      : [];
    for (var i = 0; i < companies.length; i++) {
      var c = companies[i] || {};
      var companyName = String(c.name || "").trim();
      if (companyName) return companyName;
    }

    // 2) Aktive holdingselskaper
    if (h1.active && h1Name && isAsName(h1Name)) return h1Name;
    if (h2.active && h2Name && isAsName(h2Name)) return h2Name;

    // 3) Hvis ikke AS-navn finnes, vis personnavn
    var privat = Array.isArray(structure.privat) ? structure.privat : [];
    var p1 = (privat[0] && String(privat[0].name || "").trim()) || "Ektefelle I";
    var p2 = (privat[1] && String(privat[1].name || "").trim()) || "Ektefelle II";
    return p1 + " og " + p2;
  } catch (e) {
    return "Invest Holding AS";
  }
};

/** Returnerer data fra T-konto Eiendeler og Gjeld for Formuesskatt-fanen.
 *  Mapping: Primærbolig (fast eiendom) → primærbolig, Fritidseiendom → Fritidseiendom, Tomt → Tomt,
 *  Bil/båt → bilBåt,
 *  Investeringer → Privat portefølje (ASK) / Aksjeselskap (AS) (summert per entity),
 *  Sekundærbolig → sekundærbolig, Bankinnskudd → bankinnskudd, Andre eiendeler → andreEiendeler,
 *  sum gjeld → gjeld.
 */
window.getTKontoDataForFormuesskatt = function () {
  try {
    var assets = AppState.assets || [];
    var debts = AppState.debts || [];

    var gjeld = debts.reduce(function (s, d) { return s + (Number(d.amount) || 0); }, 0);

    function nameOf(a) { return String(a && a.name != null ? a.name : "").trim(); }
    function sumAssets(predicate, amountFn) {
      return assets.reduce(function (s, a) {
        if (!predicate(a)) return s;
        var amt = amountFn ? amountFn(a) : (Number(a.amount) || 0);
        return s + (Number(amt) || 0);
      }, 0);
    }

    // Primærbolig: støtt både nye og gamle navn ("Primærbolig", "Fast eiendom", "EIENDOM")
    var primærbolig = sumAssets(function (a) {
      return /^(Fast\s*eiendom|Primærbolig|EIENDOM)$/i.test(nameOf(a));
    });
    var fritidseiendom = sumAssets(function (a) {
      return /^Fritidseiendom$/i.test(nameOf(a));
    });
    var tomt = sumAssets(function (a) {
      return /^Tomt$/i.test(nameOf(a));
    });

    // Bil/båt: unngå dobbelttelling (både via navn og assetType).
    var bilBåt = sumAssets(function (a) {
      var n = nameOf(a);
      return a.assetType === "bilbat" || /^Bil\s*\/\s*Båt$/i.test(n) || /^Bil\s*Båt$/i.test(n);
    });

    // Investeringer: summer alle "investeringer"-linjer, og fordel per entity.
    var totalMaalOgBehov = getMaalOgBehovSum2026();
    function isInvesteringerAsset(a) {
      var n = nameOf(a);
      return (
        isMaalOgBehovPortfolioAsset(a) ||
        a.assetType === "investeringer" ||
        /^INVESTERINGER$/i.test(n) ||
        /INVESTERINGER\s*m[åa]l\s*og\s*behov/i.test(n)
      );
    }

    var privatPorteføljeASK = 0;
    var aksjeselskapAS = 0;
    assets.forEach(function (a) {
      if (!isInvesteringerAsset(a)) return;
      var entity = a.entity || "privat";
      var amt = isMaalOgBehovPortfolioAsset(a) ? totalMaalOgBehov : (Number(a.amount) || 0);
      if (isPrivatEntity(entity)) privatPorteføljeASK += amt;
      else aksjeselskapAS += amt;
    });

    // Sekundærbolig: støtt både nye og gamle navn ("Sekundærbolig", "Sekundæreiendom")
    var sekundærbolig = sumAssets(function (a) {
      return /^(Sekundæreiendom|Sekundærbolig)$/i.test(nameOf(a));
    });
    // Bankinnskudd: støtt både nye og gamle navn ("Bankinnskudd", "Bank")
    var bankinnskudd = sumAssets(function (a) {
      return /^(Bankinnskudd|Bank)$/i.test(nameOf(a));
    });

    // Andre eiendeler
    var andreEiendeler = sumAssets(function (a) {
      var n = nameOf(a);
      return a.assetType === "andre" || /^ANDRE\s*EIENDELER$/i.test(n);
    });

    return {
      gjeld: Math.round(gjeld),
      primærbolig: Math.round(primærbolig),
      fritidseiendom: Math.round(fritidseiendom),
      tomt: Math.round(tomt),
      bilBåt: Math.round(bilBåt),
      privatPorteføljeASK: Math.round(privatPorteføljeASK),
      aksjeselskapAS: Math.round(aksjeselskapAS),
      sekundærbolig: Math.round(sekundærbolig),
      bankinnskudd: Math.round(bankinnskudd),
      andreEiendeler: Math.round(andreEiendeler)
    };
  } catch (e) {
    return {
      gjeld: 0,
      primærbolig: 0,
      fritidseiendom: 0,
      tomt: 0,
      bilBåt: 0,
      privatPorteføljeASK: 0,
      aksjeselskapAS: 0,
      sekundærbolig: 0,
      bankinnskudd: 0,
      andreEiendeler: 0
    };
  }
};

/** Returnerer dagens årslønn (Lønnsinntekt) fra T-konto for Pensjonsgapet-fanen. */
window.getTKontoDagensÅrslønn = function () {
  try {
    var incomes = AppState.incomes || [];
    function isLonn(item) {
      var n = String(item.name || "").trim().replace(/\s/g, "");
      if (!n) return false;
      var u = n.toUpperCase();
      return u === "LØNNSINNTEKT" || u === "LONNSINNTEKT" || /^L[OØÖ]NNSINNTEKT$/i.test(n);
    }
    var item = incomes.find(isLonn);
    return item && item.amount != null ? Number(item.amount) : 0;
  } catch (e) {
    return 0;
  }
};

// Call initialization either on DOMContentLoaded or immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initTKontoDashboard);
} else {
  // DOM is already loaded, run initialization immediately
  initTKontoDashboard();
}

// T-Konto «Privat»-knapp: bytte fordeling privat/AS – settes opp uavhengig av init
function bindTKontoPrivatButton() {
  if (window.__tkontoPrivatBound) return;
  window.__tkontoPrivatBound = true;
  var handler = function (e) {
    var el = e.target && e.target.closest ? e.target.closest("#summary-assets-button") : null;
    if (!el) return;
    var nav = document.querySelector(".nav-item.is-active");
    var section = nav && (nav.getAttribute("data-section") || "");
    if (section !== "T-Konto") return;
    e.preventDefault();
    AppState.tKontoViewMode = AppState.tKontoViewMode === "grouped" ? "individual" : "grouped";
    var root = document.getElementById("module-root");
    if (root && typeof renderFutureModule === "function") {
      renderFutureModule(root);
      if (typeof updateCardsForTKonto === "function") updateCardsForTKonto();
    }
  };
  document.body.addEventListener("click", handler, true);
  document.body.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var el = e.target && e.target.closest ? e.target.closest("#summary-assets-button") : null;
    if (!el) return;
    var nav = document.querySelector(".nav-item.is-active");
    var section = nav && (nav.getAttribute("data-section") || "");
    if (section !== "T-Konto") return;
    e.preventDefault();
    AppState.tKontoViewMode = AppState.tKontoViewMode === "grouped" ? "individual" : "grouped";
    var root = document.getElementById("module-root");
    if (root && typeof renderFutureModule === "function") {
      renderFutureModule(root);
      if (typeof updateCardsForTKonto === "function") updateCardsForTKonto();
    }
  }, true);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindTKontoPrivatButton);
} else {
  bindTKontoPrivatButton();
}

// --- Forside modul (blank panel) ---
function renderForsideModule(root) {
  root.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "panel panel-forside";

  const grid = document.createElement("div");
  grid.className = "forside-grid";

  const iconMarkup = {
    assets: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11.5L12 4l8 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 11v9h11v-9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20v-4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    debt: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3h10l4 4v14H6V3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 3v5h4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 15h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 19h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    equity: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="9" cy="9" rx="4" ry="2" stroke="currentColor" stroke-width="2"/><path d="M5 9v3c0 1.1 1.8 2 4 2s4-.9 4-2V9" stroke="currentColor" stroke-width="2"/><path d="M5 12v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" stroke="currentColor" stroke-width="2"/><ellipse cx="15" cy="13" rx="4" ry="2" stroke="currentColor" stroke-width="2"/><path d="M11 13v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" stroke="currentColor" stroke-width="2"/><path d="M11 16v1.5c0 1.1 1.8 2 4 2s4-.9 4-2V16" stroke="currentColor" stroke-width="2"/><path d="M9 7.5c.5.3 1.1.5 2 .5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 11.5c.5.3 1.1.5 2 .5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cashflow: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 9H4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 9c2.2-3 5.3-5 9-5 4.5 0 7.5 3 7.5 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 15h3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 15c-2.2 3-5.3 5-9 5-4.5 0-7.5-3-7.5-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.5 12c.4-.5 1-.8 1.5-.8.8 0 1.5.6 1.5 1.4s-.7 1.4-1.5 1.4c-.5 0-1.1-.3-1.5-.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  const cards = [
    { key: "assets", title: "Eiendeler", subtitle: "Oversikt over dagens finansielle verdier" },
    { key: "debt", title: "Gjeld", subtitle: "Totale forpliktelser, avdragsprofil og rentekostnader" },
    { key: "equity", title: "Egenkapital", subtitle: "Eiendeler minus gjeld" },
    { key: "cashflow", title: "Kontantstrøm", subtitle: "Innbetalinger minus utbetalinger. Netto årlig kontantstrøm" }
  ];

  cards.forEach(({ key, title, subtitle }) => {
    const card = document.createElement("div");
    card.className = `forside-card forside-card-${key}`;

    const icon = document.createElement("div");
    icon.className = "forside-card-illustration";
    icon.innerHTML = iconMarkup[key] || "";
    card.appendChild(icon);

    const label = document.createElement("div");
    label.className = "forside-card-title";
    label.textContent = title;
    card.appendChild(label);

    const sub = document.createElement("div");
    sub.className = "forside-card-text";
    sub.id = `forside-card-subtitle-${key}`;
    sub.textContent = subtitle;
    card.appendChild(sub);

    grid.appendChild(card);
  });

  panel.appendChild(grid);

  const ctaWrap = document.createElement("div");
  ctaWrap.className = "forside-cta-wrap";
  const ctaBtn = document.createElement("button");
  ctaBtn.type = "button";
  ctaBtn.className = "forside-cta";
  ctaBtn.textContent = "Start kartlegging";
  ctaBtn.addEventListener("click", () => {
    const target = document.querySelector('.nav-item[data-section="Struktur"]');
    if (target) target.click();
  });
  ctaWrap.appendChild(ctaBtn);
  panel.appendChild(ctaWrap);

  root.appendChild(panel);
  updateTopSummaries();
  updateForsideCards(true);
}

// Hjelpefunksjon for å konvertere tall til romertall
function getRomanNumeral(num) {
  const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  if (num <= 10) {
    return romanNumerals[num];
  }
  // For tall over 10, bruk enkel nummerering
  return String(num);
}

/** Eiendel knyttet til begge ektefeller (felles / særeie som vises samlet). */
const ENTITY_PRIVAT_BEGGE = "privat-begge";

function isPrivatBeggeEntity(entity) {
  return entity === ENTITY_PRIVAT_BEGGE;
}

function getPrivatBeggeOptionLabel(privatArray) {
  const p0 = privatArray && privatArray[0];
  const p1 = privatArray && privatArray[1];
  const n0 = (p0 && String(p0.name || "").trim()) || "Ektefelle I";
  const n1 = (p1 && String(p1.name || "").trim()) || "Ektefelle II";
  return `${n0} + ${n1}`;
}

// Hjelpefunksjon for å få privat-indeks fra entity-verdi
function getPrivatIndexFromEntity(entity) {
  if (!entity || entity === "privat" || entity === "privat-0") {
    return 0;
  }
  const match = entity.match(/^privat-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Hjelpefunksjon for å sjekke om en entity er privat (uansett hvilken indeks)
function isPrivatEntity(entity) {
  return entity && (entity === "privat" || entity.startsWith("privat-"));
}

function getDashboardCompanyName(entity) {
  if (!entity || !String(entity).startsWith("dashboard-company:")) return "";
  const companyId = String(entity).slice("dashboard-company:".length);
  const companies = Array.isArray(AppState.structureDashboardCompanies) ? AppState.structureDashboardCompanies : [];
  const company = companies.find((c) => c && String(c.id) === companyId);
  return company && company.name ? String(company.name) : "";
}

function getEntityDisplayName(entity) {
  if (isPrivatBeggeEntity(entity)) {
    const privatArray = Array.isArray(AppState.structure.privat) ? AppState.structure.privat : [AppState.structure.privat];
    return getPrivatBeggeOptionLabel(privatArray);
  }
  if (isPrivatEntity(entity)) {
    const privatArray = Array.isArray(AppState.structure.privat) ? AppState.structure.privat : [AppState.structure.privat];
    const privatIndex = getPrivatIndexFromEntity(entity);
    const privatEntity = privatArray[privatIndex];
    return (privatEntity && privatEntity.name) || (privatIndex === 0 ? "Ektefelle I" : "Ektefelle II");
  }
  if (entity === "holding1") {
    return (AppState.structure.holding1 && AppState.structure.holding1.name) || "Holding AS";
  }
  if (entity === "holding2") {
    return (AppState.structure.holding2 && AppState.structure.holding2.name) || "Holding II AS";
  }
  const dashboardCompanyName = getDashboardCompanyName(entity);
  if (dashboardCompanyName) return dashboardCompanyName;
  return String(entity || "Ukjent");
}

/** Lik fordeling av eierskap (heltall, sum 100). */
function equalOwnershipSplit(n) {
  if (n <= 0) return [];
  const base = Math.floor(100 / n);
  let remainder = 100 - base * n;
  const arr = Array(n).fill(base);
  for (let i = 0; i < remainder; i++) arr[i]++;
  return arr;
}

/** Index 0 er alltid aktiv; index > 0 er aktiv kun ved active === true (mangler → aktiv for bakoverkompatibilitet). */
function isPrivatEntryActive(privatEntity, index) {
  if (index === 0) return true;
  if (!privatEntity) return false;
  if (privatEntity.active === false) return false;
  return true;
}

function distributeOwnershipForPrivatArray(privatArray) {
  const activeIndices = [];
  privatArray.forEach((p, i) => {
    if (isPrivatEntryActive(p, i)) activeIndices.push(i);
  });
  const split = equalOwnershipSplit(activeIndices.length);
  const full = privatArray.map(() => 0);
  activeIndices.forEach((idx, j) => {
    full[idx] = split[j];
  });
  return full;
}

/** Flere aktive privat, men kun én har > 0 % (typisk etter 100/0 før Privat II ble skrudd på) → bruk lik fordeling (50/50). */
function ownershipNeedsEqualDefault(activeIndices, activeValues) {
  if (activeIndices.length < 2) return false;
  const nPos = activeValues.filter((x) => (Number(x) || 0) > 0).length;
  return nPos <= 1;
}

function syncAllHoldingOwnershipLengths(privatArray) {
  const n = privatArray.length;
  ["holding1", "holding2"].forEach((k) => {
    const h = AppState.structure[k];
    if (!h) return;
    const needFull = !Array.isArray(h.ownershipPct) || h.ownershipPct.length !== n;
    if (needFull) {
      h.ownershipPct = distributeOwnershipForPrivatArray(privatArray);
      return;
    }
    const row = h.ownershipPct.slice();
    const activeIndices = [];
    privatArray.forEach((p, i) => {
      if (isPrivatEntryActive(p, i)) activeIndices.push(i);
      else row[i] = 0;
    });
    const rawActive = activeIndices.map((i) => row[i] ?? 0);
    const sum = rawActive.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      h.ownershipPct = distributeOwnershipForPrivatArray(privatArray);
      return;
    }
    if (ownershipNeedsEqualDefault(activeIndices, rawActive)) {
      h.ownershipPct = distributeOwnershipForPrivatArray(privatArray);
      return;
    }
    const nextActive = normalizeOwnershipPctInputs(rawActive);
    activeIndices.forEach((idx, j) => {
      row[idx] = nextActive[j];
    });
    h.ownershipPct = row;
  });
}

/** Normaliserer til heltall som summerer til 100. */
function normalizeOwnershipPctInputs(rawValues) {
  const n = rawValues.length;
  const nums = rawValues.map((x) => {
    const v = parseFloat(String(x).replace(",", "."));
    return isNaN(v) ? 0 : Math.max(0, v);
  });
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum <= 0) return equalOwnershipSplit(n);
  const scaled = nums.map((x) => Math.round((x / sum) * 100));
  let s = scaled.reduce((a, b) => a + b, 0);
  if (s !== 100) scaled[scaled.length - 1] += 100 - s;
  return scaled;
}

function redrawStrukturConnectionLines(panel, privatContainer, holdingsContainer) {
  const svg = panel.querySelector(".struktur-connection-lines");
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const privatCards = Array.from(privatContainer.querySelectorAll(".struktur-card-privat"));
  const holdingsMeta = [
    { key: "holding1" },
    { key: "holding2" }
  ];
  const activeHoldings = holdingsMeta.filter((e) => AppState.structure[e.key] && AppState.structure[e.key].active);

  if (privatCards.length === 0 || activeHoldings.length === 0) return;

  const grid = panel.querySelector(".struktur-grid");
  if (!grid) return;

  /* Absolutt SVG i flex får ofte 0×0 med auto-bredde/høyde – tving eksplisitte px fra grid. */
  const gw = Math.max(0, Math.round(grid.offsetWidth || grid.getBoundingClientRect().width));
  const gh = Math.max(0, Math.round(grid.offsetHeight || grid.getBoundingClientRect().height));
  if (gw < 8 || gh < 8) return;

  svg.style.width = gw + "px";
  svg.style.height = gh + "px";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.right = "auto";
  svg.style.bottom = "auto";
  svg.setAttribute("width", String(gw));
  svg.setAttribute("height", String(gh));
  void svg.offsetWidth;

  const sRect = svg.getBoundingClientRect();
  const iw = Math.max(4, Math.round(sRect.width) || gw);
  const ih = Math.max(4, Math.round(sRect.height) || gh);
  const originX = sRect.left;
  const originY = sRect.top;

  svg.setAttribute("viewBox", "0 0 " + String(iw) + " " + String(ih));
  svg.setAttribute("preserveAspectRatio", "none");

  const pArr = Array.isArray(AppState.structure.privat) ? AppState.structure.privat : [AppState.structure.privat];
  syncAllHoldingOwnershipLengths(pArr);

  activeHoldings.forEach((holding) => {
    const holdingCard = holdingsContainer.querySelector(`.struktur-card-${holding.key}`);
    if (!holdingCard) return;
    const rawRow = AppState.structure[holding.key].ownershipPct;
    const ownership =
      Array.isArray(rawRow) && rawRow.length === pArr.length
        ? rawRow
        : distributeOwnershipForPrivatArray(pArr);
    const hRect = holdingCard.getBoundingClientRect();
    const x2 = hRect.left + hRect.width / 2 - originX;
    const y2 = hRect.top - originY;

    privatCards.forEach((privatCard, i) => {
      if (i >= pArr.length || !isPrivatEntryActive(pArr[i], i)) return;
      const pct = Number(ownership[i]);
        const hasPct = Number.isFinite(pct) && pct > 0;
      const pRect = privatCard.getBoundingClientRect();
      const x1 = pRect.left + pRect.width / 2 - originX;
      const y1 = pRect.bottom - originY;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "struktur-connection-line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
        line.setAttribute("stroke", hasPct ? "rgba(107, 157, 201, 0.95)" : "rgba(107, 157, 201, 0.55)");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-dasharray", "7 6");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);

        if (hasPct) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2 - 6;
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("class", "struktur-connection-pct");
          text.setAttribute("x", String(midX));
          text.setAttribute("y", String(midY));
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("fill", "#5888B8");
          text.setAttribute("font-size", "12");
          text.setAttribute("font-weight", "600");
          text.textContent = `${Math.round(pct)}%`;
          svg.appendChild(text);
        }
    });
  });

  // Ekstra "privat I <-> privat II" strek når Holding AS er aktiv.
  // Match ønsket: connector mellom Privat I og Privat II vises selv om Privat II ikke er skrudd på.
  const activeHoldingKeys = new Set(activeHoldings.map((h) => h.key));
  if (activeHoldingKeys.has("holding1") && privatCards.length >= 2) {
    const p0 = privatCards.find((c) => String(c.dataset.privatIndex) === "0") || privatCards[0];
    const p1 = privatCards.find((c) => String(c.dataset.privatIndex) === "1") || privatCards[1];
    if (!p0 || !p1) return;
    const p0Rect = p0.getBoundingClientRect();
    const p1Rect = p1.getBoundingClientRect();
    const topCard = p0Rect.top <= p1Rect.top ? p0 : p1;
    const bottomCard = topCard === p0 ? p1 : p0;
    const topRect = topCard.getBoundingClientRect();
    const bottomRect = bottomCard.getBoundingClientRect();

    const x1 = topRect.left + topRect.width / 2 - originX;
    const y1 = topRect.bottom - originY;
    const x2 = bottomRect.left + bottomRect.width / 2 - originX;
    const y2 = bottomRect.top - originY;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    // Unngå at kurvepunkt havner utenfor viewBox (kan klippes).
    const controlY = Math.max(0, midY - 26);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // Bruk egen class så vi ikke blir "overstyrt" av CSS for vanlige linjer.
    path.setAttribute("class", "struktur-connection-privat-privat-line");
    path.setAttribute("fill", "none");
    path.setAttribute("d", `M ${x1} ${y1} Q ${midX} ${controlY} ${x2} ${y2}`);
    path.setAttribute("stroke", "rgba(107, 157, 201, 0.95)");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-dasharray", "7 6");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
  }
}

/** Én global resize: tegn struktur-linjer på nytt når vinduet endrer seg (aktive holding + privat-kort). */
(function initStrukturConnectionLinesResize() {
  if (typeof window === "undefined") return;
  let resizeTimer = null;
  function redrawFromDom() {
    const panel = document.querySelector(".panel.panel-struktur");
    if (!panel || !panel.querySelector(".struktur-connection-lines")) return;
    const privatContainer = panel.querySelector(".struktur-privat-container");
    const holdingsContainer = panel.querySelector(".struktur-holdings-container");
    if (!privatContainer || !holdingsContainer) return;
    redrawStrukturConnectionLines(panel, privatContainer, holdingsContainer);
  }
  window.addEventListener(
    "resize",
    function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(redrawFromDom, 80);
    },
    { passive: true }
  );
  var contentEl = document.querySelector("main.content");
  if (contentEl) {
    contentEl.addEventListener(
      "scroll",
      function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(redrawFromDom, 32);
      },
      { passive: true }
    );
  }
})();

function buildStrukturOwnershipEditor(holdingKey, privatArray, onApplied) {
  syncAllHoldingOwnershipLengths(privatArray);
  const pct = AppState.structure[holdingKey].ownershipPct;

  const wrap = document.createElement("div");
  wrap.className = "struktur-ownership";

  const title = document.createElement("div");
  title.className = "struktur-ownership-title";
  title.textContent = "Eierskap (sum 100 %)";
  wrap.appendChild(title);

  privatArray.forEach((privatEntity, index) => {
    const row = document.createElement("div");
    row.className = "struktur-ownership-row";
    const activeRow = isPrivatEntryActive(privatEntity, index);
    if (!activeRow) row.classList.add("struktur-ownership-row--inactive");
    const lab = document.createElement("label");
    lab.className = "struktur-ownership-label";
    lab.textContent =
      (privatEntity.name || (index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`)) + ":";
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.max = "100";
    inp.step = "1";
    inp.className = "struktur-ownership-input";
    inp.value = String(pct[index] ?? 0);
    inp.disabled = !activeRow;
    inp.addEventListener("click", (e) => e.stopPropagation());
    inp.addEventListener("keydown", (e) => e.stopPropagation());
    inp.addEventListener("blur", () => {
      const inputs = wrap.querySelectorAll(".struktur-ownership-input");
      const activeIndices = [];
      privatArray.forEach((p, i) => {
        if (isPrivatEntryActive(p, i)) activeIndices.push(i);
      });
      const rawActive = activeIndices.map((i) => inputs[i].value);
      const nextActive = normalizeOwnershipPctInputs(rawActive);
      const nextFull = privatArray.map(() => 0);
      activeIndices.forEach((idx, j) => {
        nextFull[idx] = nextActive[j];
      });
      AppState.structure[holdingKey].ownershipPct = nextFull;
      inputs.forEach((el, i) => {
        el.value = String(nextFull[i]);
      });
      if (typeof onApplied === "function") onApplied();
    });
    row.appendChild(lab);
    row.appendChild(inp);
    const unit = document.createElement("span");
    unit.className = "struktur-ownership-unit";
    unit.textContent = "%";
    row.appendChild(unit);
    wrap.appendChild(row);
  });

  return wrap;
}

/** Fullt strukturdashboard-dokument (iframe srcdoc). UTF-8 innhold kodet som base64 — samme HTML/JS som tidligere lå i _struktur_decoded.html. */
const __STRUKTUR_DASHBOARD_HTML_B64 = "77u/PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9Im5iIj4KPGhlYWQ+CiAgICA8bWV0YSBjaGFyc2V0PSJVVEYtOCI+CiAgICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgICA8dGl0bGU+UyZhbXA7UCBXZWFsdGggJmFtcDsgT3duZXJzaGlwIERhc2hib2FyZDwvdGl0bGU+CiAgICA8c2NyaXB0IHNyYz0iaHR0cHM6Ly9jZG4udGFpbHdpbmRjc3MuY29tIj48L3NjcmlwdD4KICAgIDxzY3JpcHQgc3JjPSJodHRwczovL3VucGtnLmNvbS9sdWNpZGVAbGF0ZXN0Ij48L3NjcmlwdD4KICAgIDxzdHlsZT4KICAgICAgICA6cm9vdCB7CiAgICAgICAgICAgIC0tc3AtZGFyay1ibHVlOiBva2xjaCgwLjI0IDAuMDggMjczLjEpOwogICAgICAgICAgICAtLXNwLWJsdWU6IG9rbGNoKDAuMjkgMC4xMiAyNzQuNik7CiAgICAgICAgICAgIC0tc3AtY3lhbi00MDogb2tsY2goMC44NSAwLjA4IDIzNS4zKTsKICAgICAgICAgICAgLS1zcC1jeWFuLTIwOiBva2xjaCgwLjkyIDAuMDUgMjM0LjEpOwogICAgICAgICAgICAtLXNwLWxpZ2h0LWdyZXk6IG9rbGNoKDAuOTYgMC4wMCAwLjApOwogICAgICAgICAgICAtLXNwLWNvYWw6IG9rbGNoKDAuMjcgMC4wMCAwLjApOwogICAgICAgICAgICAtLXdoaXRlOiAjZmZmZmZmOwogICAgICAgICAgICAtLWZvbnQtYnJhbmQ6ICJXaGl0bmV5IiwgIldoaXRuZXkgQm9vayIsICJXaGl0bmV5IE1lZGl1bSIsICJXaGl0bmV5IEJvbGQiLCAiQXZlbmlyIE5leHQiLCAiU2Vnb2UgVUkiLCBBcmlhbCwgc2Fucy1zZXJpZjsKICAgICAgICB9CgogICAgICAgIGJvZHkgewogICAgICAgICAgICBmb250LWZhbWlseTogdmFyKC0tZm9udC1icmFuZCk7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNGNUYzRjM7CiAgICAgICAgICAgIGNvbG9yOiB2YXIoLS13aGl0ZSk7CiAgICAgICAgICAgIG92ZXJmbG93OiBoaWRkZW47CiAgICAgICAgICAgIG1pbi1oZWlnaHQ6IDEwMHZoOwogICAgICAgICAgICBtYXJnaW46IDA7CiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA0MDA7CiAgICAgICAgfQoKICAgICAgICAubGFiZWwtc3R5bGUgewogICAgICAgICAgICBmb250LWZhbWlseTogdmFyKC0tZm9udC1icmFuZCk7CiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7CiAgICAgICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7CiAgICAgICAgICAgIGxldHRlci1zcGFjaW5nOiAwLjFlbTsKICAgICAgICAgICAgZm9udC1zaXplOiAwLjY1cmVtOwogICAgICAgICAgICBjb2xvcjogdmFyKC0tc3AtY3lhbi00MCk7CiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDAuMjVyZW07CiAgICAgICAgICAgIGRpc3BsYXk6IGJsb2NrOwogICAgICAgIH0KCiAgICAgICAgLmgtYmxhY2sgeyBmb250LWZhbWlseTogdmFyKC0tZm9udC1icmFuZCk7IGZvbnQtd2VpZ2h0OiA5MDA7IH0KICAgICAgICAuaC1ib2xkIHsgZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtYnJhbmQpOyBmb250LXdlaWdodDogNzAwOyB9CgogICAgICAgIGgxLCBoMiwgaDMgewogICAgICAgICAgICBmb250LWZhbWlseTogdmFyKC0tZm9udC1icmFuZCk7CiAgICAgICAgICAgIGxldHRlci1zcGFjaW5nOiAwLjAxZW07CiAgICAgICAgfQoKICAgICAgICBwLCBzcGFuLCBpbnB1dCwgc2VsZWN0LCBvcHRpb24sIGxhYmVsIHsKICAgICAgICAgICAgZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtYnJhbmQpOwogICAgICAgICAgICBmb250LXdlaWdodDogNDAwOwogICAgICAgIH0KCiAgICAgICAgYnV0dG9uIHsKICAgICAgICAgICAgZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtYnJhbmQpOwogICAgICAgICAgICBmb250LXdlaWdodDogNzAwOwogICAgICAgICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOwogICAgICAgICAgICBsZXR0ZXItc3BhY2luZzogMC4xZW07CiAgICAgICAgfQoKICAgICAgICAuZ2xhc3MtY2FyZCB7CiAgICAgICAgICAgIGJhY2tncm91bmQ6ICMwRjJGNzM7CiAgICAgICAgICAgIGJhY2tkcm9wLWZpbHRlcjogYmx1cigxNXB4KTsKICAgICAgICAgICAgLXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6IGJsdXIoMTVweCk7CiAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMTUzLCAyMTcsIDI0MiwgMC4xNSk7CiAgICAgICAgICAgIGJveC1zaGFkb3c6CiAgICAgICAgICAgICAgICAwIDE0cHggMzBweCByZ2JhKDIsIDEyLCAzNCwgMC4yOCksCiAgICAgICAgICAgICAgICAwIDI4cHggNjBweCByZ2JhKDIsIDEyLCAzNCwgMC4yNCksCiAgICAgICAgICAgICAgICAwIDNweCAxMHB4IHJnYmEoMCwgMCwgMCwgMC4yKTsKICAgICAgICAgICAgdHJhbnNpdGlvbjogYWxsIDAuNHMgY3ViaWMtYmV6aWVyKDAuMTYsIDEsIDAuMywgMSk7CiAgICAgICAgfQoKICAgICAgICAuZ2xhc3MtY2FyZDpob3ZlciB7CiAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tc3AtY3lhbi00MCk7CiAgICAgICAgICAgIGJhY2tncm91bmQ6ICMxMTM3N0Y7CiAgICAgICAgICAgIGJveC1zaGFkb3c6CiAgICAgICAgICAgICAgICAwIDE4cHggMzZweCByZ2JhKDIsIDEyLCAzNCwgMC4zMiksCiAgICAgICAgICAgICAgICAwIDM0cHggNzJweCByZ2JhKDIsIDEyLCAzNCwgMC4yOCksCiAgICAgICAgICAgICAgICAwIDRweCAxNHB4IHJnYmEoMCwgMCwgMCwgMC4yNCk7CiAgICAgICAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgtNXB4KTsKICAgICAgICB9CgogICAgICAgIC5vd25lci1ub2RlIHsKICAgICAgICAgICAgYm9yZGVyLXRvcDogNHB4IHNvbGlkIHZhcigtLXNwLWN5YW4tNDApOwogICAgICAgIH0KCiAgICAgICAgLmZhbWlseS1saW5lIHsKICAgICAgICAgICAgc3Ryb2tlOiAjRDFENURCOwogICAgICAgICAgICBzdHJva2Utd2lkdGg6IDIuNTsKICAgICAgICAgICAgZmlsbDogbm9uZTsKICAgICAgICAgICAgb3BhY2l0eTogMC42OwogICAgICAgIH0KCiAgICAgICAgLm93bmVyc2hpcC1saW5lIHsKICAgICAgICAgICAgc3Ryb2tlOiB2YXIoLS1zcC1jeWFuLTQwKTsKICAgICAgICAgICAgc3Ryb2tlLW9wYWNpdHk6IDAuNzsKICAgICAgICAgICAgZmlsbDogbm9uZTsKICAgICAgICAgICAgc3Ryb2tlLWRhc2hhcnJheTogNjsKICAgICAgICAgICAgYW5pbWF0aW9uOiBkYXNoIDQwcyBsaW5lYXIgaW5maW5pdGU7CiAgICAgICAgfQoKICAgICAgICBAa2V5ZnJhbWVzIGRhc2ggewogICAgICAgICAgICB0byB7IHN0cm9rZS1kYXNob2Zmc2V0OiAtMTAwMDsgfQogICAgICAgIH0KCiAgICAgICAgLm1vZGFsLW92ZXJsYXkgewogICAgICAgICAgICBkaXNwbGF5OiBub25lOwogICAgICAgICAgICBwb3NpdGlvbjogZml4ZWQ7CiAgICAgICAgICAgIGluc2V0OiAwOwogICAgICAgICAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDM1LCA4OSwgMC45KTsKICAgICAgICAgICAgYmFja2Ryb3AtZmlsdGVyOiBibHVyKDEwcHgpOwogICAgICAgICAgICB6LWluZGV4OiAxMDA7CiAgICAgICAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgICAgICAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyOwogICAgICAgIH0KCiAgICAgICAgLm1vZGFsLW92ZXJsYXkuYWN0aXZlIHsgZGlzcGxheTogZmxleDsgfQoKICAgICAgICAudHJlZS1jb250YWluZXIgewogICAgICAgICAgICBkaXNwbGF5OiBmbGV4OwogICAgICAgICAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uOwogICAgICAgICAgICBhbGlnbi1pdGVtczogY2VudGVyOwogICAgICAgICAgICBwYWRkaW5nOiA4cmVtIDJyZW0gMTJyZW07CiAgICAgICAgICAgIG1pbi13aWR0aDogbWF4LWNvbnRlbnQ7CiAgICAgICAgICAgIGdhcDogNy42NXJlbTsKICAgICAgICB9CgogICAgICAgIC5sZXZlbC1yb3cgewogICAgICAgICAgICBkaXNwbGF5OiBmbGV4OwogICAgICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICAgICAgICAgICAgZ2FwOiAyLjdyZW07CiAgICAgICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsKICAgICAgICAgICAgei1pbmRleDogMTA7CiAgICAgICAgfQoKICAgICAgICAvKiBSZWR1c2VyIGF2c3RhbmQgbWVsbG9tIGJhcm4tIG9nIHBhcnRuZXItcmFkIG1lZCAyMCAlIChmcmEgMTByZW0gdGlsIDhyZW0pLiAqLwogICAgICAgICNyb3ctY2hpbGRyZW4gewogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAtMnJlbTsKICAgICAgICB9CgogICAgICAgICNjb21wYW55LWhpZXJhcmNoeS1yb290IHsKICAgICAgICAgICAgZGlzcGxheTogZmxleDsKICAgICAgICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsKICAgICAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICAgICAgICAgICAgZ2FwOiA3LjY1cmVtOwogICAgICAgICAgICB3aWR0aDogMTAwJTsKICAgICAgICB9CgogICAgICAgIC5lZGl0LWNvbnRyb2xzIHsgZGlzcGxheTogbm9uZTsgfQogICAgICAgIGJvZHkuZWRpdC1tb2RlIC5lZGl0LWNvbnRyb2xzIHsgZGlzcGxheTogZmxleDsgfQoKICAgICAgICAuaGVhZGVyLWFjdGlvbi1idG4gewogICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjQ0VDQ0NDOwogICAgICAgICAgICBiYWNrZ3JvdW5kOiAjMTIzQjg1OwogICAgICAgICAgICBjb2xvcjogI0UyRThGMDsKICAgICAgICAgICAgZm9udC13ZWlnaHQ6IDcwMDsKICAgICAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsKICAgICAgICAgICAgbGV0dGVyLXNwYWNpbmc6IDAuMWVtOwogICAgICAgICAgICBwYWRkaW5nOiAwLjYyNXJlbSAxLjVyZW07CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMC43NXJlbTsKICAgICAgICAgICAgdHJhbnNpdGlvbjogYWxsIDAuMnM7CiAgICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjsKICAgICAgICB9CgogICAgICAgIC5oZWFkZXItYWN0aW9uLWJ0bjpob3ZlciB7CiAgICAgICAgICAgIGZpbHRlcjogYnJpZ2h0bmVzcygxLjA4KTsKICAgICAgICAgICAgYmFja2dyb3VuZDogIzBGMzI3MzsKICAgICAgICB9CgogICAgICAgIC8qIE1lciBpbmRyZSBsdWZ0IGkgYWxsZSBrb3J0LiAqLwogICAgICAgIC5zdHJ1a3R1ci1jYXJkIHsKICAgICAgICAgICAgcGFkZGluZzogMS43NXJlbTsKICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogMjRweCAhaW1wb3J0YW50OwogICAgICAgIH0KCiAgICAgICAgLyogS29tcHJpbWVyIGt1biBiYXJuLWtvcnQgdmVydGlrYWx0ICh+MTUgJSBsYXZlcmUpLiAqLwogICAgICAgIC5jaGlsZC1jYXJkIHsKICAgICAgICAgICAgcGFkZGluZy10b3A6IDEuMjc1cmVtICFpbXBvcnRhbnQ7CiAgICAgICAgICAgIHBhZGRpbmctYm90dG9tOiAxLjI3NXJlbSAhaW1wb3J0YW50OwogICAgICAgIH0KCiAgICAgICAgLmNoaWxkLWNhcmQgLmVkaXQtY29udHJvbHMgewogICAgICAgICAgICBwYWRkaW5nLXRvcDogMXJlbSAhaW1wb3J0YW50OwogICAgICAgICAgICBtYXJnaW4tdG9wOiAxcmVtICFpbXBvcnRhbnQ7CiAgICAgICAgfQoKICAgICAgICAvKiBCYXJuLWtvcnQ6IHR5ZGVsaWcgbHlzZXJlIGJsw6UgZW5uIMO4dnJpZ2UgZ2xhc3Mta29ydCAqLwogICAgICAgIC5jaGlsZC1jYXJkLmdsYXNzLWNhcmQgewogICAgICAgICAgICBiYWNrZ3JvdW5kOiAjMWU0YTk2OwogICAgICAgICAgICBib3JkZXItY29sb3I6IHJnYmEoMTUzLCAyMTcsIDI0MiwgMC4yMik7CiAgICAgICAgfQoKICAgICAgICAuY2hpbGQtY2FyZC5nbGFzcy1jYXJkOmhvdmVyIHsKICAgICAgICAgICAgYmFja2dyb3VuZDogIzI0NTdhYjsKICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1zcC1jeWFuLTQwKTsKICAgICAgICB9CgogICAgICAgIC5zdHJ1a3R1ci10b3BiYXIgewogICAgICAgICAgICBiYWNrZ3JvdW5kOiAjRjVGM0YzOwogICAgICAgIH0KCiAgICAgICAgLnN0cnVrdHVyLXRvcGJhcjpob3ZlciB7CiAgICAgICAgICAgIGJhY2tncm91bmQ6ICNGNUYzRjM7CiAgICAgICAgICAgIGJvcmRlci1jb2xvcjogcmdiYSgxNTMsIDIxNywgMjQyLCAwLjE1KTsKICAgICAgICAgICAgdHJhbnNmb3JtOiBub25lOwogICAgICAgIH0KICAgIDwvc3R5bGU+CjwvaGVhZD4KPGJvZHkgY2xhc3M9ImVkaXQtbW9kZSI+CiAgICA8aGVhZGVyIGNsYXNzPSJzdHJ1a3R1ci10b3BiYXIgZml4ZWQgdG9wLTAgbGVmdC0wIHctZnVsbCB6LTUwIHB4LTEwIHB5LTUgZ2xhc3MtY2FyZCBib3JkZXItYiBib3JkZXItd2hpdGUvMTAgZmxleCBqdXN0aWZ5LWNlbnRlciBpdGVtcy1jZW50ZXIiPgogICAgICAgIDxkaXYgY2xhc3M9ImZsZXggZ2FwLTMgZWRpdC1jb250cm9scyI+CiAgICAgICAgICAgIDxidXR0b24gaWQ9ImFkZC1wYXJ0bmVyLWJ0biIgb25jbGljaz0iYWRkUGFydG5lcigpIiBjbGFzcz0iaGVhZGVyLWFjdGlvbi1idG4gZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiPgogICAgICAgICAgICAgICAgPGkgZGF0YS1sdWNpZGU9InVzZXJzIiBjbGFzcz0idy00IGgtNCI+PC9pPgogICAgICAgICAgICAgICAgPHNwYW4+TGVnZyB0aWwgUGFydG5lcjwvc3Bhbj4KICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgIDxidXR0b24gb25jbGljaz0iYWRkQ2hpbGQoKSIgY2xhc3M9ImhlYWRlci1hY3Rpb24tYnRuIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIj4KICAgICAgICAgICAgICAgIDxpIGRhdGEtbHVjaWRlPSJ1c2VyLXBsdXMiIGNsYXNzPSJ3LTQgaC00Ij48L2k+CiAgICAgICAgICAgICAgICA8c3Bhbj5MZWdnIHRpbCBCYXJuPC9zcGFuPgogICAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSJhZGRUb3BMZXZlbENvbXBhbnkoKSIgY2xhc3M9ImhlYWRlci1hY3Rpb24tYnRuIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIj4KICAgICAgICAgICAgICAgIDxpIGRhdGEtbHVjaWRlPSJidWlsZGluZy0yIiBjbGFzcz0idy00IGgtNCI+PC9pPgogICAgICAgICAgICAgICAgPHNwYW4+TGVnZyB0aWwgQmVkcmlmdDwvc3Bhbj4KICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgPC9kaXY+CiAgICA8L2hlYWRlcj4KCiAgICA8bWFpbiBjbGFzcz0ibWluLWgtc2NyZWVuIj4KICAgICAgICA8ZGl2IGlkPSJkYXNoYm9hcmQtdHJlZSIgY2xhc3M9InRyZWUtY29udGFpbmVyIj4KICAgICAgICAgICAgPGRpdiBpZD0icm93LWNoaWxkcmVuIiBjbGFzcz0ibGV2ZWwtcm93Ij48L2Rpdj4KICAgICAgICAgICAgPGRpdiBpZD0icm93LXBhcnRuZXJzIiBjbGFzcz0ibGV2ZWwtcm93Ij48L2Rpdj4KICAgICAgICAgICAgPGRpdiBpZD0iY29tcGFueS1oaWVyYXJjaHktcm9vdCI+PC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICA8L21haW4+CgogICAgPHN2ZyBpZD0ic3ZnLWxheWVyIiBjbGFzcz0iYWJzb2x1dGUgdG9wLTAgbGVmdC0wIHctZnVsbCBoLWZ1bGwgcG9pbnRlci1ldmVudHMtbm9uZSB6LTAiPjwvc3ZnPgoKICAgIDxkaXYgaWQ9ImVkaXQtbW9kYWwiIGNsYXNzPSJtb2RhbC1vdmVybGF5Ij4KICAgICAgICA8ZGl2IGNsYXNzPSJiZy1bIzAwMjM1OV0gcC0xMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHctZnVsbCBtYXgtdy1sZyBteC00IG92ZXJmbG93LXktYXV0byBtYXgtaC1bOTB2aF0gc2hhZG93LTJ4bCI+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJsYWJlbC1zdHlsZSB0ZXh0LWNlbnRlciBtYi0yIj5Lb25maWd1cmFzam9uPC9zcGFuPgogICAgICAgICAgICA8aDIgaWQ9Im1vZGFsLXRpdGxlIiBjbGFzcz0idGV4dC0yeGwgaC1ib2xkIG1iLTggdGV4dC13aGl0ZSB0ZXh0LWNlbnRlciB1cHBlcmNhc2UgdHJhY2tpbmctdGlnaHQiPlJlZGlnZXIgRW5oZXQ8L2gyPgoKICAgICAgICAgICAgPGZvcm0gaWQ9ImVkaXQtZm9ybSIgY2xhc3M9InNwYWNlLXktNiI+CiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0iaGlkZGVuIiBpZD0iZWRpdC1pZCI+CiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0iaGlkZGVuIiBpZD0iZWRpdC1wYXJlbnQtaWQiPgogICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9ImhpZGRlbiIgaWQ9ImVkaXQtdHlwZSI+CiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0iaGlkZGVuIiBpZD0iZWRpdC1zdWItdHlwZSI+CgogICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0ic3BhY2UteS0xIj4KICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9ImxhYmVsLXN0eWxlIj5OYXZuPC9sYWJlbD4KICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImZpZWxkLW5hbWUiIHJlcXVpcmVkIGNsYXNzPSJ3LWZ1bGwgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtc20gcC00IHRleHQtd2hpdGUgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1bIzk5RDlGMl0iPgogICAgICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICAgICAgPGRpdiBpZD0iY2hpbGQtc3BlY2lmaWMtZmllbGRzIiBjbGFzcz0iaGlkZGVuIHNwYWNlLXktNCBwdC00IGJvcmRlci10IGJvcmRlci13aGl0ZS8xMCI+CiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0ic3BhY2UteS0xIj4KICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYWJlbC1zdHlsZSI+VHlwZSBCYXJuPC9sYWJlbD4KICAgICAgICAgICAgICAgICAgICAgICAgPHNlbGVjdCBpZD0iZmllbGQtY2hpbGQtdHlwZSIgb25jaGFuZ2U9InRvZ2dsZVBhcmVudFNlbGVjdGlvbigpIiBjbGFzcz0idy1mdWxsIGJnLVsjMDAyRDcyXSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtc20gcC00IHRleHQtd2hpdGUgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1bIzk5RDlGMl0iPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0iam9pbnQiPkZlbGxlc2Jhcm48L29wdGlvbj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9InN0ZXAiPlPDpnJrdWxsc2Jhcm48L29wdGlvbj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD0icGFyZW50LXNlbGVjdGlvbi1jb250YWluZXIiIGNsYXNzPSJoaWRkZW4gc3BhY2UteS0xIj4KICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYWJlbC1zdHlsZSI+QmlvbG9naXNrIEZvcmVsZGVyPC9sYWJlbD4KICAgICAgICAgICAgICAgICAgICAgICAgPHNlbGVjdCBpZD0iZmllbGQtYmlvLXBhcmVudCIgY2xhc3M9InctZnVsbCBiZy1bIzAwMkQ3Ml0gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByb3VuZGVkLXNtIHAtNCB0ZXh0LXdoaXRlIGZvY3VzOm91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItWyM5OUQ5RjJdIj48L3NlbGVjdD4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgICAgIDxkaXYgaWQ9InBhcnRuZXItc3BlY2lmaWMtZmllbGRzIiBjbGFzcz0iaGlkZGVuIHNwYWNlLXktMSBwdC00IGJvcmRlci10IGJvcmRlci13aGl0ZS8xMCI+CiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYWJlbC1zdHlsZSI+UmVsYXNqb248L2xhYmVsPgogICAgICAgICAgICAgICAgICAgIDxzZWxlY3QgaWQ9ImZpZWxkLXBhcnRuZXItdHlwZSIgY2xhc3M9InctZnVsbCBiZy1bIzAwMkQ3Ml0gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByb3VuZGVkLXNtIHAtNCB0ZXh0LXdoaXRlIGZvY3VzOm91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItWyM5OUQ5RjJdIj4KICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0iZWt0ZWZlbGxlIj5Fa3RlZmVsbGU8L29wdGlvbj4KICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT0ic2FtYm9lciI+U2FtYm9lcjwvb3B0aW9uPgogICAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPSJhbm5ldCI+QW5uZXQ8L29wdGlvbj4KICAgICAgICAgICAgICAgICAgICA8L3NlbGVjdD4KICAgICAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgICAgIDxkaXYgaWQ9Im93bmVyc2hpcC1kaXN0cmlidXRpb24tc2VjdGlvbiIgY2xhc3M9ImhpZGRlbiBzcGFjZS15LTMgcHQtNCBib3JkZXItdCBib3JkZXItd2hpdGUvMTAiPgogICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ibGFiZWwtc3R5bGUiPkVpZXJmb3JkZWxpbmcgKCUpPC9sYWJlbD4KICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPSJvd25lcnNoaXAtbGlzdCIgY2xhc3M9InNwYWNlLXktMiBtYXgtaC00OCBvdmVyZmxvdy15LWF1dG8gcHItMiI+PC9kaXY+CiAgICAgICAgICAgICAgICA8L2Rpdj4KCiAgICAgICAgICAgICAgICA8ZGl2IGlkPSJwZXJzb24tZmllbGRzIiBjbGFzcz0iZ3JpZCBncmlkLWNvbHMtMiBnYXAtNSI+CiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0ic3BhY2UteS0xIj4KICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYWJlbC1zdHlsZSI+Um9sbGU8L2xhYmVsPgogICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImZpZWxkLWluZm8iIGNsYXNzPSJ3LWZ1bGwgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtc20gcC00IHRleHQtd2hpdGUgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1bIzk5RDlGMl0iPgogICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9InNwYWNlLXktMSI+CiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ibGFiZWwtc3R5bGUiPlNla3RvcjwvbGFiZWw+CiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iZmllbGQtc2VjdG9yIiBjbGFzcz0idy1mdWxsIGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByb3VuZGVkLXNtIHAtNCB0ZXh0LXdoaXRlIGZvY3VzOm91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItWyM5OUQ5RjJdIj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9ImZsZXggZ2FwLTQgcHQtOCI+CiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPSJidXR0b24iIG9uY2xpY2s9ImNsb3NlTW9kYWwoKSIgY2xhc3M9ImZsZXgtMSBweC02IHB5LTQgcm91bmRlZC1zbSBiZy13aGl0ZS81IGhvdmVyOmJnLXdoaXRlLzEwIHRyYW5zaXRpb24tY29sb3JzIHRleHQtWzExcHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHRleHQtc2xhdGUtNDAwIj5BdmJyeXQ8L2J1dHRvbj4KICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9InN1Ym1pdCIgY2xhc3M9ImJ0bi1zcCBmbGV4LTEiPkxhZ3JlIEVuZHJpbmdlcjwvYnV0dG9uPgogICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgIDwvZm9ybT4KICAgICAgICA8L2Rpdj4KICAgIDwvZGl2PgoKICAgIDxzY3JpcHQ+CiAgICAgICAgbGV0IGZhbWlseURhdGEgPSB7CiAgICAgICAgICAgIHBhcnRuZXJzOiBbCiAgICAgICAgICAgICAgICB7IGlkOiAicDEiLCBuYW1lOiAiRWt0ZWZlbGxlIDEiLCBpbmZvOiAiRWllciIsIHNlY3RvcjogIldlYWx0aCBNZ210IiB9LAogICAgICAgICAgICAgICAgeyBpZDogInAyIiwgbmFtZTogIkVrdGVmZWxsZSAyIiwgaW5mbzogIkVpZXIiLCBzZWN0b3I6ICJXZWFsdGggTWdtdCIgfQogICAgICAgICAgICBdLAogICAgICAgICAgICBjaGlsZHJlbjogWwogICAgICAgICAgICAgICAgeyBpZDogImMxIiwgbmFtZTogIkJhcm4gQSIsIGluZm86ICJBcnZpbmciLCBwYXJlbnRUeXBlOiAiam9pbnQiLCBwYXJlbnRJZHM6IFsicDEiLCAicDIiXSB9CiAgICAgICAgICAgIF0sCiAgICAgICAgICAgIGNvbXBhbmllczogWwogICAgICAgICAgICAgICAgewogICAgICAgICAgICAgICAgICAgIGlkOiAiY29tcDEiLAogICAgICAgICAgICAgICAgICAgIG5hbWU6ICJJbnZlc3QgSG9sZGluZyBBUyIsCiAgICAgICAgICAgICAgICAgICAgc2hhcmVzOiB7IHAxOiA1MCwgcDI6IDUwIH0sCiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIF0KICAgICAgICB9OwoKICAgICAgICBjb25zdCBtb2RhbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJlZGl0LW1vZGFsIik7CiAgICAgICAgY29uc3QgZWRpdEZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiZWRpdC1mb3JtIik7CiAgICAgICAgY29uc3Qgc3ZnTGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic3ZnLWxheWVyIik7CgogICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUVkaXRNb2RlKCkgewogICAgICAgICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoImVkaXQtbW9kZSIpOwogICAgICAgICAgICBsdWNpZGUuY3JlYXRlSWNvbnMoKTsKICAgICAgICB9CgogICAgICAgIGZ1bmN0aW9uIHRvZ2dsZVBhcmVudFNlbGVjdGlvbigpIHsKICAgICAgICAgICAgY29uc3QgdHlwZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJmaWVsZC1jaGlsZC10eXBlIikudmFsdWU7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYXJlbnQtc2VsZWN0aW9uLWNvbnRhaW5lciIpLmNsYXNzTGlzdC50b2dnbGUoImhpZGRlbiIsIHR5cGUgIT09ICJzdGVwIik7CiAgICAgICAgfQoKICAgICAgICBmdW5jdGlvbiBjcmVhdGVDYXJkKG5vZGUsIHR5cGUsIHN1YlR5cGUgPSAiIikgewogICAgICAgICAgICBjb25zdCBpc1BlcnNvbiA9IHR5cGUgPT09ICJwZXJzb24iOwogICAgICAgICAgICBjb25zdCBjYXJkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiZGl2Iik7CiAgICAgICAgICAgIGNhcmQuaWQgPSBgY2FyZC0ke25vZGUuaWR9YDsKICAgICAgICAgICAgY29uc3Qgc2l6ZUNsYXNzID0gc3ViVHlwZSA9PT0gImNoaWxkIiA/ICJjaGlsZC1jYXJkIiA6ICIiOwogICAgICAgICAgICBjYXJkLmNsYXNzTmFtZSA9IGBnbGFzcy1jYXJkIHN0cnVrdHVyLWNhcmQgdy03MiByZWxhdGl2ZSB6LTEwICR7aXNQZXJzb24gPyAib3duZXItbm9kZSIgOiAiYm9yZGVyLWwtNCBib3JkZXItWyM5OUQ5RjJdIn0gJHtzaXplQ2xhc3N9YDsKCiAgICAgICAgICAgIGNvbnN0IGljb24gPSBpc1BlcnNvbiA/ICJ1c2VyIiA6ICJidWlsZGluZy0yIjsKICAgICAgICAgICAgLyogU2FtbWUgaWtvbnN0aWwgc29tIGVrdGVmZWxsZS1rb3J0IChjeWFuLCAxNnB4LCBvcGFjaXR5LTQwKTsgYmVkcmlmdCBicnVrZXIgYnVpbGRpbmctMiAqLwogICAgICAgICAgICBjb25zdCBpY29uU2l6ZSA9ICJ3LTQgaC00IjsKICAgICAgICAgICAgY29uc3QgaWNvbldyYXBPcGFjaXR5ID0gIm9wYWNpdHktNDAiOwogICAgICAgICAgICBjb25zdCBjb2xvckNsYXNzID0gInRleHQtWyM5OUQ5RjJdIjsKICAgICAgICAgICAgY29uc3QgbWV0YVRleHQgPSAoIWlzUGVyc29uIHx8IHN1YlR5cGUgPT09ICJjaGlsZCIpID8gIiIgOiAobm9kZS5pbmZvIHx8IG5vZGUuc2VjdG9yIHx8ICIiKTsKCiAgICAgICAgICAgIGxldCBvd25lcnNoaXBTdW1tYXJ5ID0gIiI7CiAgICAgICAgICAgIGlmICghaXNQZXJzb24gJiYgbm9kZS5zaGFyZXMpIHsKICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2ZU93bmVycyA9IE9iamVjdC5lbnRyaWVzKG5vZGUuc2hhcmVzKQogICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKFssIHZhbF0pID0+IHZhbCA+IDApCiAgICAgICAgICAgICAgICAgICAgLm1hcCgoW2lkLCB2YWxdKSA9PiB7CiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG93bmVyID0gZmluZE5vZGUoaWQpOwogICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPSJiZy13aGl0ZS81IHB4LTIgcHktMSByb3VuZGVkLXNtIHRleHQtWzhweF0gdGV4dC1zbGF0ZS0zMDAgYm9yZGVyIGJvcmRlci13aGl0ZS81IGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctdGlnaHRlciI+JHtvd25lciA/IG93bmVyLm5hbWUgOiBpZH06ICR7dmFsfSU8L3NwYW4+YDsKICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCIgIik7CiAgICAgICAgICAgICAgICBvd25lcnNoaXBTdW1tYXJ5ID0gYDxkaXYgY2xhc3M9ImZsZXggZmxleC13cmFwIGdhcC0xLjUgbXQtNCI+JHthY3RpdmVPd25lcnN9PC9kaXY+YDsKICAgICAgICAgICAgfQoKICAgICAgICAgICAgY29uc3QgbGFiZWxUeHQgPSBpc1BlcnNvbiA/IChzdWJUeXBlID09PSAicGFydG5lciIgPyAiRWllciAvIFBhcnRuZXIiIDogc3ViVHlwZSA9PT0gImNoaWxkIiA/ICJCYXJuIiA6ICIiKSA6ICJTZWxza2FwIjsKCiAgICAgICAgICAgIGNhcmQuaW5uZXJIVE1MID0gYAogICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9ImxhYmVsLXN0eWxlIj4ke2xhYmVsVHh0fTwvc3Bhbj4KICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9ImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLXN0YXJ0IG1iLTMiPgogICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzcz0iaC1ib2xkIHRleHQtbGcgbGVhZGluZy10aWdodCB0ZXh0LXdoaXRlIj4ke25vZGUubmFtZX08L2gzPgogICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9IiR7aWNvbldyYXBPcGFjaXR5fSI+PGkgZGF0YS1sdWNpZGU9IiR7aWNvbn0iIGNsYXNzPSIke2NvbG9yQ2xhc3N9ICR7aWNvblNpemV9Ij48L2k+PC9kaXY+CiAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDxwIGNsYXNzPSJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LW1lZGl1bSB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0Ij4ke21ldGFUZXh0fTwvcD4KICAgICAgICAgICAgICAgICR7b3duZXJzaGlwU3VtbWFyeX0KCiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSJlZGl0LWNvbnRyb2xzIGZsZXggZ2FwLTIgcHQtNSBtdC01IGJvcmRlci10IGJvcmRlci13aGl0ZS8xMCI+CiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSJvcGVuRWRpdE1vZGFsKCcke25vZGUuaWR9JywgJyR7dHlwZX0nLCAnJHtzdWJUeXBlfScpIiBjbGFzcz0icC0yIGJnLXdoaXRlLzUgaG92ZXI6Ymctd2hpdGUvMTAgcm91bmRlZC1zbSB0cmFuc2l0aW9uLWNvbG9ycyI+CiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGRhdGEtbHVjaWRlPSJlZGl0LTMiIGNsYXNzPSJ3LTMuNSBoLTMuNSB0ZXh0LXNsYXRlLTMwMCI+PC9pPgogICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICAgICAgICAgICR7c3ViVHlwZSA9PT0gInBhcnRuZXIiID8gYDxidXR0b24gb25jbGljaz0iYWRkQ2hpbGQoKSIgY2xhc3M9InAtMiBiZy13aGl0ZS81IGhvdmVyOmJnLWN5YW4tNTAwLzEwIHJvdW5kZWQtc20gdHJhbnNpdGlvbi1jb2xvcnMgdGV4dC1bIzk5RDlGMl0iPjxpIGRhdGEtbHVjaWRlPSJ1c2VyLXBsdXMiIGNsYXNzPSJ3LTMuNSBoLTMuNSI+PC9pPjwvYnV0dG9uPmAgOiAiIn0KICAgICAgICAgICAgICAgICAgICAke3R5cGUgPT09ICJjb21wYW55IiA/IGA8YnV0dG9uIG9uY2xpY2s9ImFkZFN1YkNvbXBhbnkoJyR7bm9kZS5pZH0nKSIgY2xhc3M9InAtMiBiZy13aGl0ZS81IGhvdmVyOmJnLWN5YW4tNTAwLzEwIHJvdW5kZWQtc20gdHJhbnNpdGlvbi1jb2xvcnMgdGV4dC1bIzk5RDlGMl0iPjxpIGRhdGEtbHVjaWRlPSJwbHVzLXNxdWFyZSIgY2xhc3M9InctMy41IGgtMy41Ij48L2k+PC9idXR0b24+YCA6ICIifQogICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25jbGljaz0iZGVsZXRlTm9kZSgnJHtub2RlLmlkfScsICcke3R5cGV9JykiIGNsYXNzPSJwLTIgYmctd2hpdGUvNSBob3ZlcjpiZy1yZWQtNTAwLzEwIHJvdW5kZWQtc20gdHJhbnNpdGlvbi1jb2xvcnMgbWwtYXV0byB0ZXh0LXJlZC00MDAvNTAiPgogICAgICAgICAgICAgICAgICAgICAgICA8aSBkYXRhLWx1Y2lkZT0idHJhc2gtMiIgY2xhc3M9InctMy41IGgtMy41Ij48L2k+CiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgYDsKICAgICAgICAgICAgcmV0dXJuIGNhcmQ7CiAgICAgICAgfQoKICAgICAgICBmdW5jdGlvbiByZW5kZXJUcmVlKCkgewogICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicm93LXBhcnRuZXJzIikuaW5uZXJIVE1MID0gIiI7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJyb3ctY2hpbGRyZW4iKS5pbm5lckhUTUwgPSAiIjsKICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbXBhbnktaGllcmFyY2h5LXJvb3QiKS5pbm5lckhUTUwgPSAiIjsKCiAgICAgICAgICAgIGZhbWlseURhdGEucGFydG5lcnMuZm9yRWFjaCgocCkgPT4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInJvdy1wYXJ0bmVycyIpLmFwcGVuZENoaWxkKGNyZWF0ZUNhcmQocCwgInBlcnNvbiIsICJwYXJ0bmVyIikpKTsKICAgICAgICAgICAgZmFtaWx5RGF0YS5jaGlsZHJlbi5mb3JFYWNoKChjKSA9PiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicm93LWNoaWxkcmVuIikuYXBwZW5kQ2hpbGQoY3JlYXRlQ2FyZChjLCAicGVyc29uIiwgImNoaWxkIikpKTsKICAgICAgICAgICAgcmVuZGVyQ29tcGFuaWVzUmVjdXJzaXZlKGZhbWlseURhdGEuY29tcGFuaWVzLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29tcGFueS1oaWVyYXJjaHktcm9vdCIpKTsKCiAgICAgICAgICAgIGNvbnN0IGFkZFBhcnRuZXJCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYWRkLXBhcnRuZXItYnRuIik7CiAgICAgICAgICAgIGlmIChmYW1pbHlEYXRhLnBhcnRuZXJzLmxlbmd0aCA+PSA0KSB7CiAgICAgICAgICAgICAgICBhZGRQYXJ0bmVyQnRuLnN0eWxlLm9wYWNpdHkgPSAiMC4zIjsKICAgICAgICAgICAgICAgIGFkZFBhcnRuZXJCdG4uc3R5bGUucG9pbnRlckV2ZW50cyA9ICJub25lIjsKICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgIGFkZFBhcnRuZXJCdG4uc3R5bGUub3BhY2l0eSA9ICIxIjsKICAgICAgICAgICAgICAgIGFkZFBhcnRuZXJCdG4uc3R5bGUucG9pbnRlckV2ZW50cyA9ICJhdXRvIjsKICAgICAgICAgICAgfQoKICAgICAgICAgICAgbHVjaWRlLmNyZWF0ZUljb25zKCk7CiAgICAgICAgICAgIHN5bmNTdHJ1a3R1clRvUGFyZW50KCk7CiAgICAgICAgICAgIHNldFRpbWVvdXQoZHJhd0xpbmVzLCA1MCk7CiAgICAgICAgfQoKICAgICAgICBmdW5jdGlvbiBjbG9uZUZhbWlseURhdGFGb3JQYXJlbnQoKSB7CiAgICAgICAgICAgIHRyeSB7CiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShmYW1pbHlEYXRhKSk7CiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsKICAgICAgICAgICAgICAgIHJldHVybiBudWxsOwogICAgICAgICAgICB9CiAgICAgICAgfQoKICAgICAgICBmdW5jdGlvbiBhcHBseUZhbWlseURhdGFGcm9tUGFyZW50KGRhdGEpIHsKICAgICAgICAgICAgaWYgKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSAib2JqZWN0IikgcmV0dXJuIGZhbHNlOwogICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wYXJ0bmVycykgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5jaGlsZHJlbikgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5jb21wYW5pZXMpKSByZXR1cm4gZmFsc2U7CiAgICAgICAgICAgIGZhbWlseURhdGEgPSB7CiAgICAgICAgICAgICAgICBwYXJ0bmVyczogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhLnBhcnRuZXJzKSksCiAgICAgICAgICAgICAgICBjaGlsZHJlbjogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhLmNoaWxkcmVuKSksCiAgICAgICAgICAgICAgICBjb21wYW5pZXM6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YS5jb21wYW5pZXMpKQogICAgICAgICAgICB9OwogICAgICAgICAgICByZXR1cm4gdHJ1ZTsKICAgICAgICB9CgogICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJtZXNzYWdlIiwgZnVuY3Rpb24gKGV2ZW50KSB7CiAgICAgICAgICAgIGNvbnN0IGQgPSBldmVudCAmJiBldmVudC5kYXRhOwogICAgICAgICAgICBpZiAoIWQgfHwgZC50eXBlICE9PSAic3RydWt0dXItZGFzaGJvYXJkLWluaXQiKSByZXR1cm47CiAgICAgICAgICAgIGlmICh3aW5kb3cucGFyZW50ID09PSB3aW5kb3cpIHJldHVybjsKICAgICAgICAgICAgYXBwbHlGYW1pbHlEYXRhRnJvbVBhcmVudChkLmZhbWlseURhdGEpOwogICAgICAgICAgICByZW5kZXJUcmVlKCk7CiAgICAgICAgfSk7CgogICAgICAgIGZ1bmN0aW9uIHN5bmNTdHJ1a3R1clRvUGFyZW50KCkgewogICAgICAgICAgICBpZiAod2luZG93LnBhcmVudCA9PT0gd2luZG93KSByZXR1cm47CiAgICAgICAgICAgIGNvbnN0IHBhcnRuZXJMYWJlbEJ5SW5kZXggPSBbIkkiLCAiSUkiLCAiSUlJIiwgIklWIl07CiAgICAgICAgICAgIGNvbnN0IHBhcnRuZXJzID0gKGZhbWlseURhdGEucGFydG5lcnMgfHwgW10pLnNsaWNlKDAsIDQpLm1hcCgocCwgaW5kZXgpID0+ICh7CiAgICAgICAgICAgICAgICBpZDogcC5pZCwKICAgICAgICAgICAgICAgIG5hbWU6IFN0cmluZyhwLm5hbWUgfHwgIiIpLnRyaW0oKSB8fCBgRWt0ZWZlbGxlICR7cGFydG5lckxhYmVsQnlJbmRleFtpbmRleF0gfHwgU3RyaW5nKGluZGV4ICsgMSl9YAogICAgICAgICAgICB9KSk7CiAgICAgICAgICAgIGNvbnN0IGNvbXBhbmllcyA9IFtdOwogICAgICAgICAgICBjb25zdCBjb2xsZWN0Q29tcGFuaWVzID0gKGFycikgPT4gewogICAgICAgICAgICAgICAgKGFyciB8fCBbXSkuZm9yRWFjaCgoYykgPT4gewogICAgICAgICAgICAgICAgICAgIGNvbXBhbmllcy5wdXNoKHsKICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IGMuaWQsCiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFN0cmluZyhjLm5hbWUgfHwgIiIpLnRyaW0oKSB8fCAiU2Vsc2thcCIKICAgICAgICAgICAgICAgICAgICB9KTsKICAgICAgICAgICAgICAgICAgICBpZiAoYy5jaGlsZHJlbiAmJiBjLmNoaWxkcmVuLmxlbmd0aCkgY29sbGVjdENvbXBhbmllcyhjLmNoaWxkcmVuKTsKICAgICAgICAgICAgICAgIH0pOwogICAgICAgICAgICB9OwogICAgICAgICAgICBjb2xsZWN0Q29tcGFuaWVzKGZhbWlseURhdGEuY29tcGFuaWVzIHx8IFtdKTsKICAgICAgICAgICAgd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7CiAgICAgICAgICAgICAgICB0eXBlOiAic3RydWt0dXItZGFzaGJvYXJkLXN5bmMiLAogICAgICAgICAgICAgICAgcGFydG5lcnMsCiAgICAgICAgICAgICAgICBjb21wYW5pZXMsCiAgICAgICAgICAgICAgICBmYW1pbHlEYXRhOiBjbG9uZUZhbWlseURhdGFGb3JQYXJlbnQoKQogICAgICAgICAgICB9LCAiKiIpOwogICAgICAgIH0KCiAgICAgICAgZnVuY3Rpb24gcmVuZGVyQ29tcGFuaWVzUmVjdXJzaXZlKGNvbXBhbmllcywgY29udGFpbmVyKSB7CiAgICAgICAgICAgIGlmICghY29tcGFuaWVzIHx8IGNvbXBhbmllcy5sZW5ndGggPT09IDApIHJldHVybjsKICAgICAgICAgICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiZGl2Iik7CiAgICAgICAgICAgIHJvdy5jbGFzc05hbWUgPSAibGV2ZWwtcm93IjsKICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJvdyk7CiAgICAgICAgICAgIGNvbXBhbmllcy5mb3JFYWNoKChjb21wKSA9PiB7CiAgICAgICAgICAgICAgICBjb25zdCBjb2wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCJkaXYiKTsKICAgICAgICAgICAgICAgIGNvbC5jbGFzc05hbWUgPSAiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTE0IjsKICAgICAgICAgICAgICAgIGNvbC5hcHBlbmRDaGlsZChjcmVhdGVDYXJkKGNvbXAsICJjb21wYW55IikpOwogICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKGNvbCk7CiAgICAgICAgICAgICAgICBpZiAoY29tcC5jaGlsZHJlbiAmJiBjb21wLmNoaWxkcmVuLmxlbmd0aCA+IDApIHJlbmRlckNvbXBhbmllc1JlY3Vyc2l2ZShjb21wLmNoaWxkcmVuLCBjb2wpOwogICAgICAgICAgICB9KTsKICAgICAgICB9CgogICAgICAgIGZ1bmN0aW9uIG9wZW5FZGl0TW9kYWwoaWQsIHR5cGUsIHN1YlR5cGUgPSAiIiwgcGFyZW50SWQgPSAiIikgewogICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGUoaWQpOwogICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiZWRpdC1pZCIpLnZhbHVlID0gaWQgfHwgIiI7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJlZGl0LXBhcmVudC1pZCIpLnZhbHVlID0gcGFyZW50SWQgfHwgIiI7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJlZGl0LXR5cGUiKS52YWx1ZSA9IHR5cGU7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJlZGl0LXN1Yi10eXBlIikudmFsdWUgPSBzdWJUeXBlOwoKICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLW5hbWUiKS52YWx1ZSA9IG5vZGUgPyBub2RlLm5hbWUgOiAiIjsKICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLWluZm8iKS52YWx1ZSA9IG5vZGUgPyAobm9kZS5pbmZvIHx8ICIiKSA6ICIiOwogICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiZmllbGQtc2VjdG9yIikudmFsdWUgPSBub2RlID8gKG5vZGUuc2VjdG9yIHx8ICIiKSA6ICIiOwoKICAgICAgICAgICAgY29uc3QgaXNDaGlsZCA9IHN1YlR5cGUgPT09ICJjaGlsZCIgfHwgKHR5cGUgPT09ICJwZXJzb24iICYmICFpZCAmJiBzdWJUeXBlICE9PSAicGFydG5lciIpOwogICAgICAgICAgICBjb25zdCBpc1BhcnRuZXIgPSB0eXBlID09PSAicGVyc29uIiAmJiBzdWJUeXBlID09PSAicGFydG5lciI7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjaGlsZC1zcGVjaWZpYy1maWVsZHMiKS5jbGFzc0xpc3QudG9nZ2xlKCJoaWRkZW4iLCAhaXNDaGlsZCk7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYXJ0bmVyLXNwZWNpZmljLWZpZWxkcyIpLmNsYXNzTGlzdC50b2dnbGUoImhpZGRlbiIsICFpc1BhcnRuZXIpOwogICAgICAgICAgICBpZiAoaXNDaGlsZCkgewogICAgICAgICAgICAgICAgY29uc3QgdHlwZUZpZWxkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLWNoaWxkLXR5cGUiKTsKICAgICAgICAgICAgICAgIGNvbnN0IGJpb0ZpZWxkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLWJpby1wYXJlbnQiKTsKICAgICAgICAgICAgICAgIHR5cGVGaWVsZC52YWx1ZSA9IG5vZGU/LnBhcmVudFR5cGUgfHwgImpvaW50IjsKICAgICAgICAgICAgICAgIGJpb0ZpZWxkLmlubmVySFRNTCA9ICIiOwogICAgICAgICAgICAgICAgZmFtaWx5RGF0YS5wYXJ0bmVycy5mb3JFYWNoKChwKSA9PiBiaW9GaWVsZC5pbm5lckhUTUwgKz0gYDxvcHRpb24gdmFsdWU9IiR7cC5pZH0iPiR7cC5uYW1lfTwvb3B0aW9uPmApOwogICAgICAgICAgICAgICAgaWYgKG5vZGU/LnBhcmVudElkcz8ubGVuZ3RoID09PSAxKSBiaW9GaWVsZC52YWx1ZSA9IG5vZGUucGFyZW50SWRzWzBdOwogICAgICAgICAgICAgICAgdG9nZ2xlUGFyZW50U2VsZWN0aW9uKCk7CiAgICAgICAgICAgIH0KICAgICAgICAgICAgaWYgKGlzUGFydG5lcikgewogICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLXBhcnRuZXItdHlwZSIpLnZhbHVlID0gbm9kZT8ucmVsYXRpb25UeXBlIHx8ICJla3RlZmVsbGUiOwogICAgICAgICAgICB9CgogICAgICAgICAgICBjb25zdCBzaG93UGVyc29uRmllbGRzID0gdHlwZSA9PT0gInBlcnNvbiIgJiYgc3ViVHlwZSAhPT0gInBhcnRuZXIiICYmIHN1YlR5cGUgIT09ICJjaGlsZCI7CiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwZXJzb24tZmllbGRzIikuY2xhc3NMaXN0LnRvZ2dsZSgiaGlkZGVuIiwgIXNob3dQZXJzb25GaWVsZHMpOwogICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgib3duZXJzaGlwLWRpc3RyaWJ1dGlvbi1zZWN0aW9uIikuY2xhc3NMaXN0LnRvZ2dsZSgiaGlkZGVuIiwgdHlwZSAhPT0gImNvbXBhbnkiKTsKCiAgICAgICAgICAgIGlmICh0eXBlID09PSAiY29tcGFueSIpIHBvcHVsYXRlT3duZXJzaGlwTGlzdChub2RlID8gbm9kZS5zaGFyZXMgOiBudWxsLCBwYXJlbnRJZCk7CiAgICAgICAgICAgIG1vZGFsLmNsYXNzTGlzdC5hZGQoImFjdGl2ZSIpOwogICAgICAgIH0KCiAgICAgICAgZnVuY3Rpb24gcG9wdWxhdGVPd25lcnNoaXBMaXN0KGV4aXN0aW5nU2hhcmVzLCBwYXJlbnRJZCkgewogICAgICAgICAgICBjb25zdCBsaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm93bmVyc2hpcC1saXN0Iik7CiAgICAgICAgICAgIGxpc3QuaW5uZXJIVE1MID0gIiI7CiAgICAgICAgICAgIGNvbnN0IGFsbE93bmVycyA9IFsuLi5mYW1pbHlEYXRhLnBhcnRuZXJzLCAuLi5mYW1pbHlEYXRhLmNoaWxkcmVuXTsKICAgICAgICAgICAgY29uc3QgY29sbGVjdENvbXBhbmllcyA9IChhcnIpID0+IGFyci5mb3JFYWNoKChjKSA9PiB7IGFsbE93bmVycy5wdXNoKGMpOyBpZiAoYy5jaGlsZHJlbikgY29sbGVjdENvbXBhbmllcyhjLmNoaWxkcmVuLCBhbGxPd25lcnMpOyB9KTsKICAgICAgICAgICAgY29sbGVjdENvbXBhbmllcyhmYW1pbHlEYXRhLmNvbXBhbmllcyk7CgogICAgICAgICAgICBhbGxPd25lcnMuZm9yRWFjaCgocCkgPT4gewogICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJlZGl0LWlkIikudmFsdWUgPT09IHAuaWQpIHJldHVybjsKICAgICAgICAgICAgICAgIGxldCB2YWwgPSAwOwogICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nU2hhcmVzPy5bcC5pZF0gIT09IHVuZGVmaW5lZCkgdmFsID0gZXhpc3RpbmdTaGFyZXNbcC5pZF07CiAgICAgICAgICAgICAgICBlbHNlIGlmICghZXhpc3RpbmdTaGFyZXMpIHsKICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50SWQgJiYgcC5pZCA9PT0gcGFyZW50SWQpIHZhbCA9IDEwMDsKICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICghcGFyZW50SWQpIHsKICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZhbWlseURhdGEucGFydG5lcnMubGVuZ3RoID09PSAxICYmIHAuaWQgPT09IGZhbWlseURhdGEucGFydG5lcnNbMF0uaWQpIHZhbCA9IDEwMDsKICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZmFtaWx5RGF0YS5wYXJ0bmVycy5sZW5ndGggPT09IDIgJiYgZmFtaWx5RGF0YS5wYXJ0bmVycy5zb21lKChwYXJ0KSA9PiBwYXJ0LmlkID09PSBwLmlkKSkgdmFsID0gNTA7CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgbGlzdC5pbm5lckhUTUwgKz0gYDxkaXYgY2xhc3M9ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBwLTMgYmctd2hpdGUvNSByb3VuZGVkLXNtIGJvcmRlciBib3JkZXItd2hpdGUvNSBtYi0yIj4KICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz0idGV4dC1bMTBweF0gdGV4dC13aGl0ZSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCI+JHtwLm5hbWV9PC9zcGFuPgogICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIj4KICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9Im51bWJlciIgZGF0YS1vd25lci1pZD0iJHtwLmlkfSIgdmFsdWU9IiR7dmFsfSIgY2xhc3M9InNoYXJlLWlucHV0IHctMTYgYmctWyMwMDJENzJdIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcm91bmRlZC1zbSBweC0yIHB5LTEgdGV4dC1yaWdodCB0ZXh0LXhzIHRleHQtWyM5OUQ5RjJdIj4KICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9InRleHQtWzEwcHhdIHRleHQtc2xhdGUtNTAwIGZvbnQtYm9sZCI+JTwvc3Bhbj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZGl2PmA7CiAgICAgICAgICAgIH0pOwogICAgICAgIH0KCiAgICAgICAgZnVuY3Rpb24gYWRkUGFydG5lcigpIHsgaWYgKGZhbWlseURhdGEucGFydG5lcnMubGVuZ3RoIDwgNCkgb3BlbkVkaXRNb2RhbCgiIiwgInBlcnNvbiIsICJwYXJ0bmVyIik7IH0KICAgICAgICBmdW5jdGlvbiBhZGRDaGlsZCgpIHsgb3BlbkVkaXRNb2RhbCgiIiwgInBlcnNvbiIsICJjaGlsZCIpOyB9CiAgICAgICAgZnVuY3Rpb24gYWRkVG9wTGV2ZWxDb21wYW55KCkgeyBvcGVuRWRpdE1vZGFsKCIiLCAiY29tcGFueSIpOyB9CiAgICAgICAgZnVuY3Rpb24gYWRkU3ViQ29tcGFueShpZCkgeyBvcGVuRWRpdE1vZGFsKCIiLCAiY29tcGFueSIsICIiLCBpZCk7IH0KICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkgeyBtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCJhY3RpdmUiKTsgfQoKICAgICAgICBlZGl0Rm9ybS5vbnN1Ym1pdCA9IChlKSA9PiB7CiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsKICAgICAgICAgICAgY29uc3QgaWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiZWRpdC1pZCIpLnZhbHVlOwogICAgICAgICAgICBjb25zdCBwYXJlbnRJZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJlZGl0LXBhcmVudC1pZCIpLnZhbHVlOwogICAgICAgICAgICBjb25zdCB0eXBlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImVkaXQtdHlwZSIpLnZhbHVlOwogICAgICAgICAgICBjb25zdCBzdWJUeXBlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImVkaXQtc3ViLXR5cGUiKS52YWx1ZTsKCiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7CiAgICAgICAgICAgICAgICBuYW1lOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiZmllbGQtbmFtZSIpLnZhbHVlLAogICAgICAgICAgICAgICAgaW5mbzogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLWluZm8iKS52YWx1ZSwKICAgICAgICAgICAgICAgIHNlY3RvcjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLXNlY3RvciIpLnZhbHVlCiAgICAgICAgICAgIH07CgogICAgICAgICAgICBpZiAoc3ViVHlwZSA9PT0gImNoaWxkIiB8fCAodHlwZSA9PT0gInBlcnNvbiIgJiYgIWlkICYmIHN1YlR5cGUgIT09ICJwYXJ0bmVyIikpIHsKICAgICAgICAgICAgICAgIGNvbnN0IGNUeXBlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImZpZWxkLWNoaWxkLXR5cGUiKS52YWx1ZTsKICAgICAgICAgICAgICAgIGRhdGEucGFyZW50VHlwZSA9IGNUeXBlOwogICAgICAgICAgICAgICAgZGF0YS5wYXJlbnRJZHMgPSBjVHlwZSA9PT0gImpvaW50IiA/IGZhbWlseURhdGEucGFydG5lcnMubWFwKChwKSA9PiBwLmlkKSA6IFtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiZmllbGQtYmlvLXBhcmVudCIpLnZhbHVlXTsKICAgICAgICAgICAgfQogICAgICAgICAgICBpZiAodHlwZSA9PT0gInBlcnNvbiIgJiYgc3ViVHlwZSA9PT0gInBhcnRuZXIiKSB7CiAgICAgICAgICAgICAgICBkYXRhLnJlbGF0aW9uVHlwZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJmaWVsZC1wYXJ0bmVyLXR5cGUiKS52YWx1ZSB8fCAiZWt0ZWZlbGxlIjsKICAgICAgICAgICAgfQoKICAgICAgICAgICAgaWYgKHR5cGUgPT09ICJjb21wYW55IikgewogICAgICAgICAgICAgICAgZGF0YS5zaGFyZXMgPSB7fTsKICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIi5zaGFyZS1pbnB1dCIpLmZvckVhY2goKGlucHV0KSA9PiB7CiAgICAgICAgICAgICAgICAgICAgY29uc3QgdiA9IHBhcnNlSW50KGlucHV0LnZhbHVlLCAxMCkgfHwgMDsKICAgICAgICAgICAgICAgICAgICBpZiAodiA+IDApIGRhdGEuc2hhcmVzW2lucHV0LmRhdGFzZXQub3duZXJJZF0gPSB2OwogICAgICAgICAgICAgICAgfSk7CiAgICAgICAgICAgIH0KCiAgICAgICAgICAgIGlmIChpZCkgewogICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihmaW5kTm9kZShpZCksIGRhdGEpOwogICAgICAgICAgICB9IGVsc2UgewogICAgICAgICAgICAgICAgY29uc3QgbmV3SWQgPSAodHlwZSA9PT0gInBlcnNvbiIgPyAoc3ViVHlwZSA9PT0gInBhcnRuZXIiID8gInAiICsgRGF0ZS5ub3coKSA6ICJjIiArIERhdGUubm93KCkpIDogImNvbXAiICsgRGF0ZS5ub3coKSk7CiAgICAgICAgICAgICAgICBjb25zdCBuZXdOb2RlID0geyBpZDogbmV3SWQsIC4uLmRhdGEsIGNoaWxkcmVuOiBbXSB9OwogICAgICAgICAgICAgICAgaWYgKHN1YlR5cGUgPT09ICJwYXJ0bmVyIikgZmFtaWx5RGF0YS5wYXJ0bmVycy5wdXNoKG5ld05vZGUpOwogICAgICAgICAgICAgICAgZWxzZSBpZiAoc3ViVHlwZSA9PT0gImNoaWxkIiB8fCB0eXBlID09PSAicGVyc29uIikgZmFtaWx5RGF0YS5jaGlsZHJlbi5wdXNoKG5ld05vZGUpOwogICAgICAgICAgICAgICAgZWxzZSBpZiAocGFyZW50SWQpIGZpbmROb2RlKHBhcmVudElkKS5jaGlsZHJlbi5wdXNoKG5ld05vZGUpOwogICAgICAgICAgICAgICAgZWxzZSBmYW1pbHlEYXRhLmNvbXBhbmllcy5wdXNoKG5ld05vZGUpOwogICAgICAgICAgICB9CgogICAgICAgICAgICBjbG9zZU1vZGFsKCk7CiAgICAgICAgICAgIHJlbmRlclRyZWUoKTsKICAgICAgICB9OwoKICAgICAgICBmdW5jdGlvbiBmaW5kTm9kZShpZCwgYXJyID0gbnVsbCkgewogICAgICAgICAgICBpZiAoIWlkKSByZXR1cm4gbnVsbDsKICAgICAgICAgICAgaWYgKCFhcnIpIHJldHVybiBmaW5kTm9kZShpZCwgZmFtaWx5RGF0YS5wYXJ0bmVycykgfHwgZmluZE5vZGUoaWQsIGZhbWlseURhdGEuY2hpbGRyZW4pIHx8IGZpbmROb2RlKGlkLCBmYW1pbHlEYXRhLmNvbXBhbmllcyk7CiAgICAgICAgICAgIGZvciAoY29uc3QgbiBvZiBhcnIpIHsKICAgICAgICAgICAgICAgIGlmIChuLmlkID09PSBpZCkgcmV0dXJuIG47CiAgICAgICAgICAgICAgICBpZiAobi5jaGlsZHJlbikgewogICAgICAgICAgICAgICAgICAgIGNvbnN0IGYgPSBmaW5kTm9kZShpZCwgbi5jaGlsZHJlbik7CiAgICAgICAgICAgICAgICAgICAgaWYgKGYpIHJldHVybiBmOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAgICAgIHJldHVybiBudWxsOwogICAgICAgIH0KCiAgICAgICAgZnVuY3Rpb24gZGVsZXRlTm9kZShpZCwgdHlwZSkgewogICAgICAgICAgICBpZiAodHlwZSA9PT0gInBlcnNvbiIpIHsKICAgICAgICAgICAgICAgIGNvbnN0IGlzUGFydG5lciA9IGZhbWlseURhdGEucGFydG5lcnMuc29tZSgocCkgPT4gcC5pZCA9PT0gaWQpOwogICAgICAgICAgICAgICAgZmFtaWx5RGF0YS5wYXJ0bmVycyA9IGZhbWlseURhdGEucGFydG5lcnMuZmlsdGVyKChwKSA9PiBwLmlkICE9PSBpZCk7CiAgICAgICAgICAgICAgICBmYW1pbHlEYXRhLmNoaWxkcmVuID0gZmFtaWx5RGF0YS5jaGlsZHJlbi5maWx0ZXIoKGMpID0+IGMuaWQgIT09IGlkKTsKICAgICAgICAgICAgICAgIGlmIChpc1BhcnRuZXIgJiYgZmFtaWx5RGF0YS5wYXJ0bmVycy5sZW5ndGggPT09IDEpIHsKICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdJZCA9IGZhbWlseURhdGEucGFydG5lcnNbMF0uaWQ7CiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlU2hhcmVzID0gKGFycikgPT4gYXJyLmZvckVhY2goKGMpID0+IHsKICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGMuc2hhcmVzPy5baWRdKSB7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBjLnNoYXJlc1tpZF07CiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgYy5zaGFyZXNbaWRdOwogICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5zaGFyZXNbcmVtYWluaW5nSWRdID0gKGMuc2hhcmVzW3JlbWFpbmluZ0lkXSB8fCAwKSArIHZhbDsKICAgICAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgICAgICBpZiAoYy5jaGlsZHJlbikgdXBkYXRlU2hhcmVzKGMuY2hpbGRyZW4pOwogICAgICAgICAgICAgICAgICAgIH0pOwogICAgICAgICAgICAgICAgICAgIHVwZGF0ZVNoYXJlcyhmYW1pbHlEYXRhLmNvbXBhbmllcyk7CiAgICAgICAgICAgICAgICB9IGVsc2UgewogICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuID0gKGFycikgPT4gYXJyLmZvckVhY2goKGMpID0+IHsKICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGMuc2hhcmVzKSBkZWxldGUgYy5zaGFyZXNbaWRdOwogICAgICAgICAgICAgICAgICAgICAgICBpZiAoYy5jaGlsZHJlbikgY2xlYW4oYy5jaGlsZHJlbik7CiAgICAgICAgICAgICAgICAgICAgfSk7CiAgICAgICAgICAgICAgICAgICAgY2xlYW4oZmFtaWx5RGF0YS5jb21wYW5pZXMpOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9IGVsc2UgewogICAgICAgICAgICAgICAgY29uc3QgcmVjUmVtID0gKGFycikgPT4gewogICAgICAgICAgICAgICAgICAgIGNvbnN0IGkgPSBhcnIuZmluZEluZGV4KChjKSA9PiBjLmlkID09PSBpZCk7CiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09IC0xKSB7CiAgICAgICAgICAgICAgICAgICAgICAgIGFyci5zcGxpY2UoaSwgMSk7CiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlOwogICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGMgb2YgYXJyKSBpZiAoYy5jaGlsZHJlbiAmJiByZWNSZW0oYy5jaGlsZHJlbikpIHJldHVybiB0cnVlOwogICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsKICAgICAgICAgICAgICAgIH07CiAgICAgICAgICAgICAgICByZWNSZW0oZmFtaWx5RGF0YS5jb21wYW5pZXMpOwogICAgICAgICAgICB9CiAgICAgICAgICAgIHJlbmRlclRyZWUoKTsKICAgICAgICB9CgogICAgICAgIGZ1bmN0aW9uIGRyYXdMaW5lcygpIHsKICAgICAgICAgICAgc3ZnTGF5ZXIuaW5uZXJIVE1MID0gIiI7CiAgICAgICAgICAgIGNvbnN0IHNjcm9sbFggPSB3aW5kb3cuc2Nyb2xsWDsKICAgICAgICAgICAgY29uc3Qgc2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZOwoKICAgICAgICAgICAgZmFtaWx5RGF0YS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZCkgPT4gewogICAgICAgICAgICAgICAgY29uc3QgY2hpbGRFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBjYXJkLSR7Y2hpbGQuaWR9YCk7CiAgICAgICAgICAgICAgICBpZiAoIWNoaWxkRWwpIHJldHVybjsKICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkQ2FyZCA9IGNoaWxkRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7CiAgICAgICAgICAgICAgICBjb25zdCBjWCA9IGNoaWxkQ2FyZC5sZWZ0ICsgY2hpbGRDYXJkLndpZHRoIC8gMiArIHNjcm9sbFg7CiAgICAgICAgICAgICAgICBjb25zdCBjWSA9IGNoaWxkQ2FyZC5ib3R0b20gKyBzY3JvbGxZOwoKICAgICAgICAgICAgICAgIGlmIChjaGlsZC5wYXJlbnRUeXBlID09PSAiam9pbnQiICYmIGZhbWlseURhdGEucGFydG5lcnMubGVuZ3RoID49IDIpIHsKICAgICAgICAgICAgICAgICAgICBjb25zdCBwQSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBjYXJkLSR7ZmFtaWx5RGF0YS5wYXJ0bmVyc1swXS5pZH1gKTsKICAgICAgICAgICAgICAgICAgICBjb25zdCBwQiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBjYXJkLSR7ZmFtaWx5RGF0YS5wYXJ0bmVyc1sxXS5pZH1gKTsKICAgICAgICAgICAgICAgICAgICBpZiAoIXBBIHx8ICFwQikgcmV0dXJuOwogICAgICAgICAgICAgICAgICAgIGNvbnN0IHIxID0gcEEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7CiAgICAgICAgICAgICAgICAgICAgY29uc3QgcjIgPSBwQi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsKICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydFggPSAocjEubGVmdCArIHIyLnJpZ2h0KSAvIDIgKyBzY3JvbGxYOwogICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0WSA9IHIxLnRvcCArIHIxLmhlaWdodCAvIDIgKyBzY3JvbGxZOwogICAgICAgICAgICAgICAgICAgIGRyYXdGYW1pbHlDdXJ2ZShzdGFydFgsIHN0YXJ0WSwgY1gsIGNZKTsKICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hpbGQucGFyZW50SWRzPy5sZW5ndGggPiAwKSB7CiAgICAgICAgICAgICAgICAgICAgY29uc3QgcEMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgY2FyZC0ke2NoaWxkLnBhcmVudElkc1swXX1gKTsKICAgICAgICAgICAgICAgICAgICBpZiAocEMpIHsKICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgciA9IHBDLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOwogICAgICAgICAgICAgICAgICAgICAgICBkcmF3RmFtaWx5Q3VydmUoci5sZWZ0ICsgci53aWR0aCAvIDIgKyBzY3JvbGxYLCByLnRvcCArIHNjcm9sbFksIGNYLCBjWSk7CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9KTsKCiAgICAgICAgICAgIGlmIChmYW1pbHlEYXRhLnBhcnRuZXJzLmxlbmd0aCA+IDEpIHsKICAgICAgICAgICAgICAgIGNvbnN0IHBBID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGNhcmQtJHtmYW1pbHlEYXRhLnBhcnRuZXJzWzBdLmlkfWApOwogICAgICAgICAgICAgICAgY29uc3QgcEIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgY2FyZC0ke2ZhbWlseURhdGEucGFydG5lcnNbMV0uaWR9YCk7CiAgICAgICAgICAgICAgICBpZiAocEEgJiYgcEIpIHsKICAgICAgICAgICAgICAgICAgICBjb25zdCByMSA9IHBBLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOwogICAgICAgICAgICAgICAgICAgIGNvbnN0IHIyID0gcEIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7CiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLCAibGluZSIpOwogICAgICAgICAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCJ4MSIsIHIxLnJpZ2h0ICsgc2Nyb2xsWCk7CiAgICAgICAgICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoInkxIiwgcjEudG9wICsgcjEuaGVpZ2h0IC8gMiArIHNjcm9sbFkpOwogICAgICAgICAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCJ4MiIsIHIyLmxlZnQgKyBzY3JvbGxYKTsKICAgICAgICAgICAgICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgieTIiLCByMi50b3AgKyByMi5oZWlnaHQgLyAyICsgc2Nyb2xsWSk7CiAgICAgICAgICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoImNsYXNzIiwgImZhbWlseS1saW5lIik7CiAgICAgICAgICAgICAgICAgICAgc3ZnTGF5ZXIuYXBwZW5kQ2hpbGQobGluZSk7CiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KCiAgICAgICAgICAgIGNvbnN0IGNvbGxlY3QgPSAoYXJyLCBsaXN0KSA9PiBhcnIuZm9yRWFjaCgoYykgPT4geyBsaXN0LnB1c2goYyk7IGlmIChjLmNoaWxkcmVuKSBjb2xsZWN0KGMuY2hpbGRyZW4sIGxpc3QpOyB9KTsKICAgICAgICAgICAgY29uc3QgYWxsQyA9IFtdOwogICAgICAgICAgICBjb2xsZWN0KGZhbWlseURhdGEuY29tcGFuaWVzLCBhbGxDKTsKCiAgICAgICAgICAgIGFsbEMuZm9yRWFjaCgoY29tcCkgPT4gewogICAgICAgICAgICAgICAgY29uc3QgY29tcEVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGNhcmQtJHtjb21wLmlkfWApOwogICAgICAgICAgICAgICAgaWYgKCFjb21wRWwpIHJldHVybjsKICAgICAgICAgICAgICAgIGNvbnN0IHJDID0gY29tcEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOwogICAgICAgICAgICAgICAgY29uc3QgY1ggPSByQy5sZWZ0ICsgckMud2lkdGggLyAyICsgc2Nyb2xsWDsKICAgICAgICAgICAgICAgIGNvbnN0IGNZID0gckMudG9wICsgc2Nyb2xsWTsKICAgICAgICAgICAgICAgIGlmIChjb21wLnNoYXJlcykgewogICAgICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKGNvbXAuc2hhcmVzKS5mb3JFYWNoKChbb2lkLCBwY3RdKSA9PiB7CiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9DID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGNhcmQtJHtvaWR9YCk7CiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvQykgewogICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgck8gPSBvQy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsKICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiwgInBhdGgiKTsKICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNYID0gck8ubGVmdCArIHJPLndpZHRoIC8gMiArIHNjcm9sbFg7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzWSA9IHJPLmJvdHRvbSArIHNjcm9sbFk7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtWSA9IHNZICsgKGNZIC0gc1kpICogMC41OwogICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aC5zZXRBdHRyaWJ1dGUoImQiLCBgTSAke3NYfSAke3NZfSBDICR7c1h9ICR7bVl9LCAke2NYfSAke21ZfSwgJHtjWH0gJHtjWX1gKTsKICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGguc2V0QXR0cmlidXRlKCJjbGFzcyIsICJvd25lcnNoaXAtbGluZSIpOwogICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IDEgKyAocGN0IC8gMzMpOwogICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnTGF5ZXIuYXBwZW5kQ2hpbGQocGF0aCk7CiAgICAgICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgICB9KTsKICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgIGlmIChjb21wLmNoaWxkcmVuKSBjb21wLmNoaWxkcmVuLmZvckVhY2goKHN1YikgPT4gewogICAgICAgICAgICAgICAgICAgIGNvbnN0IHNFbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGNhcmQtJHtzdWIuaWR9YCk7CiAgICAgICAgICAgICAgICAgICAgaWYgKHNFbGVtKSB7CiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJTdWIgPSBzRWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsKICAgICAgICAgICAgICAgICAgICAgICAgZHJhd0ZhbWlseUN1cnZlKGNYLCByQy5ib3R0b20gKyBzY3JvbGxZLCByU3ViLmxlZnQgKyByU3ViLndpZHRoIC8gMiArIHNjcm9sbFgsIHJTdWIudG9wICsgc2Nyb2xsWSk7CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgfSk7CiAgICAgICAgICAgIH0pOwoKICAgICAgICAgICAgc3ZnTGF5ZXIuc2V0QXR0cmlidXRlKCJ3aWR0aCIsIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxXaWR0aCk7CiAgICAgICAgICAgIHN2Z0xheWVyLnNldEF0dHJpYnV0ZSgiaGVpZ2h0IiwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCk7CiAgICAgICAgfQoKICAgICAgICBmdW5jdGlvbiBkcmF3RmFtaWx5Q3VydmUoc3gsIHN5LCBleCwgZXkpIHsKICAgICAgICAgICAgY29uc3QgcGF0aCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLCAicGF0aCIpOwogICAgICAgICAgICBjb25zdCBteSA9IHN5ICsgKGV5IC0gc3kpIC8gMjsKICAgICAgICAgICAgcGF0aC5zZXRBdHRyaWJ1dGUoImQiLCBgTSAke3N4fSAke3N5fSBDICR7c3h9ICR7bXl9LCAke2V4fSAke215fSwgJHtleH0gJHtleX1gKTsKICAgICAgICAgICAgcGF0aC5zZXRBdHRyaWJ1dGUoImNsYXNzIiwgImZhbWlseS1saW5lIik7CiAgICAgICAgICAgIHN2Z0xheWVyLmFwcGVuZENoaWxkKHBhdGgpOwogICAgICAgIH0KCiAgICAgICAgd2luZG93Lm9ubG9hZCA9ICgpID0+IHsKICAgICAgICAgICAgd2luZG93Lm9ucmVzaXplID0gZHJhd0xpbmVzOwogICAgICAgICAgICBpZiAod2luZG93LnBhcmVudCA9PT0gd2luZG93KSB7CiAgICAgICAgICAgICAgICByZW5kZXJUcmVlKCk7CiAgICAgICAgICAgIH0KICAgICAgICB9OwogICAgPC9zY3JpcHQ+CjwvYm9keT4KPC9odG1sPgoKCg==";
function decodeUtf8Base64ToString(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function getStrukturDashboardEmbeddedHtml() {
  try {
    return decodeUtf8Base64ToString(__STRUKTUR_DASHBOARD_HTML_B64);
  } catch (e) {
    console.warn("Struktur: kunne ikke dekode innebygd HTML", e);
    return "";
  }
}

// --- Struktur modul ---
function renderStrukturModule(root) {
  root.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "panel panel-struktur";
  panel.style.position = "relative";
  panel.style.padding = "0";
  panel.style.overflow = "hidden";

  const fullscreenBtn = document.createElement("button");
  fullscreenBtn.type = "button";
  fullscreenBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
  fullscreenBtn.setAttribute("aria-label", "Vis struktur i fullskjerm");
  fullscreenBtn.title = "Fullskjerm";
  fullscreenBtn.style.position = "absolute";
  fullscreenBtn.style.top = "12px";
  fullscreenBtn.style.right = "16px";
  fullscreenBtn.style.zIndex = "80";
  fullscreenBtn.style.width = "32px";
  fullscreenBtn.style.height = "32px";
  fullscreenBtn.style.display = "flex";
  fullscreenBtn.style.alignItems = "center";
  fullscreenBtn.style.justifyContent = "center";
  fullscreenBtn.style.padding = "0";
  fullscreenBtn.style.borderRadius = "6px";
  fullscreenBtn.style.border = "1px solid rgba(71, 85, 105, 0.7)";
  fullscreenBtn.style.background = "rgba(51, 65, 85, 0.7)";
  fullscreenBtn.style.color = "#E2E8F0";
  fullscreenBtn.style.cursor = "pointer";
  fullscreenBtn.style.transition = "background-color 150ms ease";

  function isPanelFullscreen() {
    return document.fullscreenElement === panel || document.webkitFullscreenElement === panel;
  }

  function updateFullscreenBtnLabel() {
    const isFullscreen = isPanelFullscreen();
    fullscreenBtn.setAttribute("aria-label", isFullscreen ? "Avslutt fullskjerm" : "Fullskjerm");
    fullscreenBtn.title = isFullscreen ? "Avslutt fullskjerm" : "Fullskjerm";
  }

  const onFullscreenChange = function () {
    if (!panel.isConnected) {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      return;
    }
    updateFullscreenBtnLabel();
  };
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  fullscreenBtn.addEventListener("click", async function () {
    try {
      if (!isPanelFullscreen()) {
        if (panel.requestFullscreen) {
          await panel.requestFullscreen();
        } else if (panel.webkitRequestFullscreen) {
          panel.webkitRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch (err) {
      console.warn("Kunne ikke bytte fullskjerm for strukturpanel:", err);
    } finally {
      updateFullscreenBtnLabel();
    }
  });

  fullscreenBtn.addEventListener("mouseenter", function () {
    fullscreenBtn.style.background = "rgb(51, 65, 85)";
  });
  fullscreenBtn.addEventListener("mouseleave", function () {
    fullscreenBtn.style.background = "rgba(51, 65, 85, 0.7)";
  });

  const iframe = document.createElement("iframe");
  iframe.removeAttribute("src");
  const embeddedStrukturHtml = getStrukturDashboardEmbeddedHtml();
  if (embeddedStrukturHtml) {
    iframe.srcdoc = embeddedStrukturHtml;
  } else {
    console.error("Struktur: mangler innebygd dashboard-HTML.");
    iframe.srcdoc =
      "<!DOCTYPE html><html lang=\"nb\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>body{font-family:system-ui,sans-serif;padding:2rem;background:#0f172a;color:#e2e8f0;margin:0;}</style></head><body><p>Kunne ikke laste strukturdashboard (dekoding feilet).</p></body></html>";
  }
  iframe.title = "Strukturdashboard";
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.minHeight = "700px";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.addEventListener("load", function () {
    try {
      const w = iframe.contentWindow;
      if (!w) return;
      w.postMessage(
        {
          type: "struktur-dashboard-init",
          familyData: AppState.strukturDashboardFamilyData || null
        },
        "*"
      );
    } catch (e) {}
  });
  panel.appendChild(fullscreenBtn);
  panel.appendChild(iframe);

  root.appendChild(panel);
  return;

  const grid = document.createElement("div");
  grid.className = "struktur-grid";

  // Initialiser struktur hvis den ikke finnes
  if (!AppState.structure) {
    AppState.structure = {
      privat: [
        { active: true, name: "Privat" },
        { active: false, name: "Privat II" }
      ],
      holding1: { active: false, name: "Holding AS", ownershipPct: null },
      holding2: { active: false, name: "Holding II AS", ownershipPct: null }
    };
  }
  ["holding1", "holding2"].forEach(function (k) {
    var hh = AppState.structure[k];
    if (hh && hh.ownershipPct === undefined) hh.ownershipPct = null;
  });
  
  // Migrer gammel struktur til ny array-struktur hvis nødvendig
  if (!Array.isArray(AppState.structure.privat)) {
    AppState.structure.privat = [AppState.structure.privat];
  }
  // Vis alltid to privat-kort: ved gammel lagring med én rad legges Privat II (ikke aktiv) til
  if (AppState.structure.privat.length === 1) {
    AppState.structure.privat.push({ active: false, name: "Privat II" });
  }

  // Opprett container for privat-bokser (2 kolonner = samme bredde som holding-raden; + ligger utenfor)
  const privatContainer = document.createElement("div");
  privatContainer.className = "struktur-privat-container";

  const privatRow = document.createElement("div");
  privatRow.className = "struktur-privat-row";

  // Opprett container for holdingselskaper
  const holdingsContainer = document.createElement("div");
  holdingsContainer.className = "struktur-holdings-container";

  const iconMarkup = {
    privat: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    holding1: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3h10l4 4v14H6V3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 3v5h4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 15h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 19h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    holding2: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3h10l4 4v14H6V3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 3v5h4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 15h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 19h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  // Render alle privat-bokser
  const privatArray = AppState.structure.privat || [];
  privatContainer.dataset.privatCount = String(privatArray.length);
  if (privatArray.length === 1) {
    privatContainer.classList.add("struktur-privat-container--single");
  } else {
    privatContainer.classList.remove("struktur-privat-container--single");
  }
  syncAllHoldingOwnershipLengths(privatArray);
  privatArray.forEach((privatEntity, index) => {
    const card = document.createElement("div");
    card.className = "struktur-card struktur-card-privat";
    const privActive = isPrivatEntryActive(privatEntity, index);
    if (privActive) {
      card.classList.add("is-active");
    } else {
      card.classList.add("struktur-card-privat--inactive");
    }
    card.dataset.privatIndex = index;

    // Legg til ikon
    const icon = document.createElement("div");
    icon.className = "struktur-card-illustration";
    icon.innerHTML = iconMarkup.privat;
    card.appendChild(icon);

    const nameContainer = document.createElement("div");
    nameContainer.className = "struktur-card-name-container";
    
    // Redigerbart navn-felt
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "struktur-card-name-input";
    nameInput.value = privatEntity.name || (index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`);
    nameInput.addEventListener("blur", () => {
      if (nameInput.value.trim()) {
        privatEntity.name = nameInput.value.trim();
        updateAllEntitySelects();
        // Oppdater T-Konto-knappen hvis vi er i T-Konto-fanen
        const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"]');
        if (tKontoNavItem && tKontoNavItem.classList.contains("is-active")) {
          updateCardsForTKonto();
        }
      } else {
        nameInput.value = privatEntity.name || (index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`);
      }
    });
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        nameInput.blur();
      }
      e.stopPropagation();
    });
    nameInput.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    nameContainer.appendChild(nameInput);
    card.appendChild(nameContainer);

    if (index > 0 && !privActive) {
      const inactiveStatus = document.createElement("div");
      inactiveStatus.className = "struktur-card-privat-inactive-status";
      inactiveStatus.textContent = "(ikke aktiv)";
      card.appendChild(inactiveStatus);
    }

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("struktur-card-name-input")) {
        return;
      }
      if (index === 0) {
        return;
      }

      const activeNow = isPrivatEntryActive(privatEntity, index);

      if (index === 1) {
        if (!activeNow) {
          privatEntity.active = true;
        } else {
          privatEntity.active = false;
          const assets = AppState.assets || [];
          assets.forEach((asset) => {
            if (asset.entity === `privat-${index}`) {
              asset.entity = "privat";
            }
            if (asset.entity === ENTITY_PRIVAT_BEGGE) {
              asset.entity = "privat";
            }
          });
        }
        syncAllHoldingOwnershipLengths(privatArray);
        renderStrukturModule(root);
        updateAllEntitySelects();
        return;
      }

      if (!activeNow) {
        privatEntity.active = true;
        syncAllHoldingOwnershipLengths(privatArray);
        renderStrukturModule(root);
        updateAllEntitySelects();
        return;
      }

      const entityValueToRemove = `privat-${index}`;
      const assets = AppState.assets || [];
      assets.forEach(asset => {
        if (asset.entity === entityValueToRemove) {
          asset.entity = "privat";
        } else if (asset.entity && asset.entity.startsWith("privat-")) {
          const assetIndex = parseInt(asset.entity.replace("privat-", ""), 10);
          if (assetIndex > index) {
            asset.entity = assetIndex === 1 ? "privat" : `privat-${assetIndex - 1}`;
          }
        }
      });

      privatArray.splice(index, 1);
      renderStrukturModule(root);
      updateAllEntitySelects();
    });

    privatContainer.appendChild(card);
  });

  // Legg til "+" knapp for å legge til ny privat-boks (maks 4 bokser)
  const addButton = document.createElement("button");
  addButton.className = "struktur-add-privat-button";
  addButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  addButton.setAttribute("aria-label", "Legg til privat person");
  
  // Skjul "+" knapp hvis vi allerede har 4 bokser
  if (privatArray.length >= 4) {
    addButton.style.display = "none";
  }
  
  addButton.addEventListener("click", (e) => {
    e.stopPropagation();
    // Begrens til maks 4 privat-bokser
    if (privatArray.length >= 4) {
      return;
    }
    const newIndex = privatArray.length;
    const newName = newIndex === 0 ? "Privat" : `Privat ${getRomanNumeral(newIndex + 1)}`;
    privatArray.push({ active: true, name: newName });
    renderStrukturModule(root);
    updateAllEntitySelects();
  });

  privatRow.appendChild(privatContainer);
  privatRow.appendChild(addButton);

  // Render holdingselskaper
  const holdingsEntities = [
    { key: "holding1", defaultName: "Holding AS", isEditable: true },
    { key: "holding2", defaultName: "Holding II AS", isEditable: true }
  ];

  holdingsEntities.forEach(({ key, defaultName, isEditable }) => {
    const entity = AppState.structure[key];
    const isActive = entity.active;
    
    const card = document.createElement("div");
    card.className = `struktur-card struktur-card-${key}`;
    if (isActive) {
      card.classList.add("is-active");
    }

    // Legg til ikon
    const icon = document.createElement("div");
    icon.className = "struktur-card-illustration";
    icon.innerHTML = iconMarkup[key] || "";
    card.appendChild(icon);

    const nameContainer = document.createElement("div");
    nameContainer.className = "struktur-card-name-container";
    
    // For holding-bokser: vis "Ingen AS er aktiv" når inaktiv, ellers vis navn
    let displayText;
    if (isActive) {
      displayText = entity.name || defaultName;
    } else {
      displayText = "Ingen AS er aktiv";
    }
    
    if (isEditable && isActive) {
      // Redigerbart navn-felt
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "struktur-card-name-input";
      nameInput.value = entity.name || defaultName;
      nameInput.addEventListener("blur", () => {
        if (nameInput.value.trim()) {
          AppState.structure[key].name = nameInput.value.trim();
          updateAllEntitySelects();
          // Oppdater T-Konto-knappen hvis vi er i T-Konto-fanen
          const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"]');
          if (tKontoNavItem && tKontoNavItem.classList.contains("is-active")) {
            updateCardsForTKonto();
          }
        } else {
          nameInput.value = entity.name || defaultName;
        }
      });
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          nameInput.blur();
        }
        e.stopPropagation();
      });
      nameInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      nameContainer.appendChild(nameInput);
    } else {
      // Ikke-redigerbart navn
      const nameLabel = document.createElement("div");
      nameLabel.className = "struktur-card-name";
      nameLabel.textContent = displayText;
      nameContainer.appendChild(nameLabel);
    }

    card.appendChild(nameContainer);

    if (isActive) {
      const ownEl = buildStrukturOwnershipEditor(key, privatArray, function () {
        redrawStrukturConnectionLines(panel, privatContainer, holdingsContainer);
      });
      card.appendChild(ownEl);
    }

    // Klikk-håndtering
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("struktur-card-name-input")) {
        return;
      }
      if (e.target.closest && e.target.closest(".struktur-ownership")) {
        return;
      }

      // Toggle aktiv status
      AppState.structure[key].active = !AppState.structure[key].active;
      if (AppState.structure[key].active) {
        AppState.structure[key].ownershipPct = distributeOwnershipForPrivatArray(privatArray);
      }

      renderStrukturModule(root);
      updateAllEntitySelects();
      // Oppdater T-Konto-knappen hvis vi er i T-Konto-fanen
      const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"]');
      if (tKontoNavItem && tKontoNavItem.classList.contains("is-active")) {
        updateCardsForTKonto();
      }
    });

    holdingsContainer.appendChild(card);
  });

  // Legg til privat-rad (+ utenfor kolonnebredden) øverst
  grid.appendChild(privatRow);

  // Legg til holdings-container i grid
  grid.appendChild(holdingsContainer);

  panel.style.position = "relative";

  const activeHoldings = holdingsEntities.filter(e => AppState.structure[e.key].active);

  if (activeHoldings.length > 0) {
    const svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgContainer.className = "struktur-connection-lines";
    svgContainer.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgContainer.setAttribute("aria-hidden", "true");
    svgContainer.style.position = "absolute";
    svgContainer.style.top = "0";
    svgContainer.style.left = "0";
    svgContainer.style.pointerEvents = "none";
    svgContainer.style.overflow = "visible";
    svgContainer.setAttribute("focusable", "false");

    grid.appendChild(svgContainer);

    function scheduleStrukturLinesRedraw() {
      redrawStrukturConnectionLines(panel, privatContainer, holdingsContainer);
      requestAnimationFrame(function () {
        redrawStrukturConnectionLines(panel, privatContainer, holdingsContainer);
      });
    }

    setTimeout(scheduleStrukturLinesRedraw, 0);
    setTimeout(scheduleStrukturLinesRedraw, 32);
    setTimeout(scheduleStrukturLinesRedraw, 120);
    setTimeout(scheduleStrukturLinesRedraw, 400);

    if (typeof ResizeObserver !== "undefined") {
      var strukturLinesRO = new ResizeObserver(function () {
        requestAnimationFrame(function () {
          redrawStrukturConnectionLines(panel, privatContainer, holdingsContainer);
        });
      });
      strukturLinesRO.observe(grid);
    }
  }

  panel.appendChild(grid);
  root.appendChild(panel);
}

// Funksjon for å oppdatere alle nedtrekksmenyer i Eiendeler-modulen
function updateAllEntitySelects() {
  AppState.assets.forEach((item) => {
    if (item._updateEntitySelect) {
      item._updateEntitySelect();
    }
  });
}

/** Synk partnernavn fra struktur-iframe til AppState.structure (brukes av Eiendeler-dropdown). */
function syncStructurePartnersFromDashboard(partners) {
  if (!Array.isArray(partners)) return;
  if (!AppState.structure) {
    AppState.structure = {
      privat: [],
      holding1: { active: false, name: "Holding AS", ownershipPct: null },
      holding2: { active: false, name: "Holding II AS", ownershipPct: null }
    };
  }
  if (!Array.isArray(AppState.structure.privat)) {
    AppState.structure.privat = [AppState.structure.privat].filter(Boolean);
  }
  while (AppState.structure.privat.length < 4) {
    AppState.structure.privat.push({ active: false, name: "" });
  }

  const fallbackNames = ["Ektefelle I", "Ektefelle II", "Ektefelle III", "Ektefelle IV"];
  for (let i = 0; i < 4; i += 1) {
    const partner = partners[i] || null;
    AppState.structure.privat[i].active = !!partner;
    AppState.structure.privat[i].name = (partner && String(partner.name || "").trim()) || fallbackNames[i];
  }

  updateAllEntitySelects();
}

function syncStructureCompaniesFromDashboard(companies) {
  if (!Array.isArray(companies)) {
    AppState.structureDashboardCompanies = [];
    updateAllEntitySelects();
    return;
  }
  AppState.structureDashboardCompanies = companies
    .map((c) => ({
      id: String(c.id || "").trim(),
      name: String(c.name || "").trim()
    }))
    .filter((c) => c.id && c.name);
  updateAllEntitySelects();
}

window.addEventListener("message", function (event) {
  const data = event && event.data;
  if (!data || data.type !== "struktur-dashboard-sync") return;
  if (
    data.familyData &&
    typeof data.familyData === "object" &&
    Array.isArray(data.familyData.partners) &&
    Array.isArray(data.familyData.children) &&
    Array.isArray(data.familyData.companies)
  ) {
    try {
      AppState.strukturDashboardFamilyData = JSON.parse(JSON.stringify(data.familyData));
    } catch (e) {}
  }
  syncStructurePartnersFromDashboard(data.partners);
  syncStructureCompaniesFromDashboard(data.companies);
});

// --- Eiendeler modul ---
function renderAssetsModule(root) {
  root.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel panel-assets";

  const list = document.createElement("div");
  list.className = "assets";
  panel.appendChild(list);

  // Funksjon for å oppdatere visningen av eiendeler
  function updateAssetsList() {
    list.innerHTML = "";
    AppState.assets.forEach((item) => list.appendChild(createItemRow("assets", item)));
  }

  updateAssetsList();

  // Wrapper for knappene
  const buttonWrapper = document.createElement("div");
  buttonWrapper.style.display = "flex";
  buttonWrapper.style.gap = "12px";
  buttonWrapper.style.marginTop = "16px";

  // Funksjon for å finne indeks der ny eiendel skal settes inn
  function findInsertIndex(category) {
    const assets = AppState.assets;
    if (category === "eiendom") {
      // Sett inn etter primærbolig
      const fastEiendomIndex = assets.findIndex(a => 
        /^(FAST\s*EIENDOM|PRIMÆRBOLIG)$/i.test(a.name || "")
      );
      return fastEiendomIndex >= 0 ? fastEiendomIndex + 1 : assets.length;
    } else if (category === "investeringer") {
      // Sett inn etter "INVESTERINGER"
      const investeringerIndex = assets.findIndex(a => 
        /INVESTERINGER/i.test(a.name || "")
      );
      return investeringerIndex >= 0 ? investeringerIndex + 1 : assets.length;
    } else {
      // Bil/Båt og Andre eiendeler settes nederst
      return assets.length;
    }
  }

  // Funksjon for å legge til ny eiendel
  function addAsset(category, defaultName) {
    const insertIndex = findInsertIndex(category);
    const newItem = { id: genId(), name: defaultName, amount: 0 };
    // Lagre kategori for å kunne identifisere eiendelstype uavhengig av navn
    if (category === "eiendom") {
      newItem.assetType = "eiendom";
    } else if (category === "investeringer") {
      newItem.assetType = "investeringer";
    } else if (category === "bilbat") {
      newItem.assetType = "bilbat";
    } else if (category === "andre") {
      newItem.assetType = "andre";
    }
    AppState.assets.splice(insertIndex, 0, newItem);
    updateAssetsList();
    updateTopSummaries();
  }

  // Bruk felles funksjon for farge-mapping (samme som i T-konto og Treemap)
  const getAssetColor = (name, assetType) => {
    return getAssetColorByName(name, assetType);
  };

  // Funksjon for å bestemme tekstfarge basert på bakgrunnsfarge
  const getTextColor = (bgColor) => {
    // Konverter hex til RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Beregn luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Returner hvit tekst for mørke farger, mørk tekst for lyse farger
    return luminance > 0.5 ? "#1C2A3A" : "#ffffff";
  };

  // Helper-funksjon for å sette opp knapp med farge og skygge
  const setupButton = (btn, assetName, category, defaultName) => {
    const bgColor = getAssetColor(assetName, category); // Send med category som assetType
    btn.className = "btn-add";
    btn.style.flex = "1";
    btn.style.background = bgColor;
    btn.style.color = "#ffffff";
    btn.style.borderColor = bgColor;
    btn.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)";
    btn.style.transition = "all 0.2s ease";
    // Hover-effekt med litt mørkere farge og større skygge
    btn.addEventListener("mouseenter", () => {
      btn.style.filter = "brightness(0.95)";
      btn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)";
      btn.style.transform = "translateY(-1px)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.filter = "brightness(1)";
      btn.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)";
      btn.style.transform = "translateY(0)";
    });
    btn.addEventListener("click", () => addAsset(category, defaultName));
  };

  // Knapp 1: Legg til Primærbolig
  const btn1 = document.createElement("button");
  btn1.textContent = "Legg til Primærbolig";
  setupButton(btn1, "Primærbolig", "eiendom", "Primærbolig");
  buttonWrapper.appendChild(btn1);

  // Knapp 2: Legg til Investeringer
  const btn2 = document.createElement("button");
  btn2.textContent = "Legg til Investeringer";
  setupButton(btn2, "INVESTERINGER", "investeringer", "INVESTERINGER");
  buttonWrapper.appendChild(btn2);

  // Knapp 3: Legg til Bil/Båt
  const btn3 = document.createElement("button");
  btn3.textContent = "Legg til Bil/Båt";
  setupButton(btn3, "BIL/BÅT", "bilbat", "BIL/BÅT");
  buttonWrapper.appendChild(btn3);

  // Knapp 4: Legg til Andre eiendeler
  const btn4 = document.createElement("button");
  btn4.textContent = "Legg til Andre eiendeler";
  setupButton(btn4, "ANDRE EIENDELER", "andre", "ANDRE EIENDELER");
  buttonWrapper.appendChild(btn4);

  panel.appendChild(buttonWrapper);

  root.appendChild(panel);
  updateTopSummaries();
}
// --- Forventninger modul ---
function renderExpectationsModule(root) {
  root.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "panel";
  const heading = document.createElement("h3");
  heading.textContent = "Forventet avkastning";
  panel.appendChild(heading);

  const list = document.createElement("div");
  list.className = "assets";
  panel.appendChild(list);

  const items = [
    { key: "likvider", label: "BANKINNSKUDD", min: 0, max: 12, step: 0.1 },
    { key: "fastEiendom", label: "PRIMÆRBOLIG", min: 0, max: 12, step: 0.1 },
    { key: "investeringer", label: "INVESTERINGER", min: 0, max: 12, step: 0.1 },
    { key: "bilbat", label: "Bil/båt", min: -5, max: 10, step: 0.1 },
    { key: "andreEiendeler", label: "ANDRE EIENDELER", min: -5, max: 15, step: 0.1 },
    { key: "kpi", label: "KPI", min: 0, max: 5, step: 0.1 }
  ];

  items.forEach(({ key, label, min, max, step }) => {
    const row = document.createElement("div");
    row.className = "asset-row";

    const col = document.createElement("div");
    col.className = "asset-col";

    const top = document.createElement("div");
    top.className = "asset-top";

    const name = document.createElement("input");
    name.className = "asset-name";
    name.type = "text";
    name.value = label;
    name.addEventListener("input", () => { /* kan redigeres ved behov */ });

    const spacer = document.createElement("div");
    spacer.style.width = "28px"; // plassholder der delete-knapp pleier å være

    top.appendChild(name);
    top.appendChild(spacer);

    const range = document.createElement("input");
    range.className = "asset-range";
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    // Sørg for at startverdien er innenfor range
    // Bruk nullish coalescing (??) i stedet for || for å håndtere negative verdier korrekt
    const currentValue = AppState.expectations[key] ?? (key === "bilbat" ? -5 : 0);
    const clampedValue = Math.max(min, Math.min(max, currentValue));
    range.value = String(clampedValue);

    const out = document.createElement("div");
    out.className = "asset-amount";
    out.textContent = `${Number(range.value).toFixed(2).replace('.', ',')} %`;

    range.addEventListener("input", () => {
      const v = Number(range.value);
      AppState.expectations[key] = v;
      out.textContent = `${v.toFixed(2).replace('.', ',')} %`;
    });

    col.appendChild(top);
    col.appendChild(range);
    row.appendChild(col);
    row.appendChild(out);
    list.appendChild(row);
  });
  root.appendChild(panel);
  updateTopSummaries();
}

// --- Felles hjelpefunksjoner for projeksjon av eiendeler ---

// Felles funksjon for å få standardfarge basert på eiendelsnavn/type
// Dette sikrer konsistent fargebruk i både T-konto og Treemap (samme som TKONTO_CHART_COLORS)
function getAssetColorByName(name, assetType, asset) {
  const U = String(name || "").toUpperCase();
  const nameStr = String(name || "").trim();

  // Mål og behov-porteføljen (standardrad) → match Hovedstol-fargen i Mål og behov, uavhengig av visningsnavn
  if (asset && asset.maalOgBehovPortfolio === true) return "#002359";
  if (/investeringer\s*mål\s*og\s*behov/i.test(nameStr)) return "#002359";

  // Sjekk assetType (kategori lagres og brukes også etter navnendring, farger fra S&P-palett)
  if (assetType === "fritidseiendom") return "#99D9F2";   // Cyan 40
  if (assetType === "sekundaereiendom") return "#334F7A"; // Lysnet variant av Hovedstol-blå (#002359)
  if (assetType === "tomt") return "#CCECF9";             // Cyan 20
  if (assetType === "eiendom") return "#85ACED";          // Primærbolig (fast eiendom)
  if (assetType === "investeringer") return "#B4C6F4";     // Investeringer (øvrige)
  if (assetType === "bilbat") return "#00ACEC";            // Bil/Båt
  if (assetType === "andre") return "#2C405B";             // Andre eiendeler

  // Deretter sjekk navn (for bakoverkompatibilitet når assetType mangler)
  if (/^BANKINNSKUDD$/i.test(U)) return "#5A8BA2"; // Bankinnskudd
  if (/^PRIMÆRBOLIG$/i.test(U)) return "#85ACED"; // Primærbolig
  if (/^BANK$/i.test(U)) return "#5A8BA2"; // Bank
  if (/^FAST\s*EIENDOM$/i.test(U)) return "#85ACED"; // Fast eiendom
  if (/^FRITIDSEIENDOM$/i.test(U)) return "#99D9F2";  // Fritidseiendom
  if (/^SEKUNDÆRBOLIG$/i.test(U)) return "#334F7A"; // Sekundærbolig
  if (/^SEKUNDÆREIENDOM$/i.test(U)) return "#334F7A"; // Sekundæreiendom
  if (/^TOMT$/i.test(U)) return "#CCECF9";             // Tomt
  if (/^EIENDOM$/i.test(U) && !/FAST/i.test(U)) return "#85ACED";
  if (/^INVESTERINGER$/i.test(U)) return "#B4C6F4"; // Andre investeringslinjer
  if (/^BIL\/BÅT$/i.test(U) || /^BIL\s*BÅT$/i.test(U)) return "#00ACEC"; // Bil/Båt
  if (/^ANDRE\s*EIENDELER$/i.test(U)) return "#2C405B"; // Andre eiendeler

  // Fallback
  return "#2C405B";
}

function computeAssetProjection(yearVal) {
  const assets = AppState.assets || [];
  const exp = AppState.expectations || { likvider: 0, fastEiendom: 0, investeringer: 0, andreEiendeler: 0, bilbat: 0, kpi: 0 };
  const yearsFromStart = Math.max(0, Number(yearVal) - 2025);
  const rLikv = (exp.likvider || 0) / 100;
  const rEiend = (exp.fastEiendom || 0) / 100;
  const rInv = (exp.investeringer || 0) / 100;
  const rBilBat = (exp.bilbat || 0) / 100;
  const rOther = (exp.andreEiendeler || 0) / 100;
  const routing = ensureCashflowRoutingState();
  const cashflow = computeAnnualCashflowBreakdownForYear(Number(yearVal) || 2026, {
    kontantstromStartAlignsDebtWith2026: true
  });
  const netPositive = Math.max(0, Math.round(cashflow.net || 0));
  const customAllocation = Math.max(0, Math.min(netPositive, Math.round(routing.customAmount || 0)));

  function projectWithContribution(base, rate, years, contribution) {
  let value = base;
  for (let year = 0; year < years; year++) {
    if (contribution > 0) value += contribution;
    value = value * (1 + rate);
  }
  return value;
  }

  return assets.map((a, idx) => {
    const name = String(a.name || `Eiendel ${idx + 1}`);
    const base = a.amount || 0;
    const U = name.toUpperCase();
    // "Investeringer mål og behov" skal kun gjenkjennes på navn (ikke på `noDelete`).
    // Vi bruker `noDelete` også på standard eiendeler for å skjule sletteknappen, så den må ikke styre beregningen.
    const isMaalOgBehov = isMaalOgBehovPortfolioAsset(a);
    if (isMaalOgBehov) {
      const value = getMaalOgBehovHovedstolForYear(yearVal);
      return { key: name, value, color: getAssetColorByName(name, a.assetType, a) };
    }
    let rate = rOther;
    const isLiquidity = /LIKVID|BANK|KONTANT|CASH/.test(U);
    const isBank = /^BANK$/i.test(name) || /^BANKINNSKUDD$/i.test(name);
    const isInvestment = /INVEST/.test(U);
    const isBilBat = /BIL|BÅT/.test(U);
    // Fast eiendom og eiendom skal bruke eksakt samme avkastning
    // Sjekk først assetType (for eiendeler opprettet via knapper), deretter navn (for bakoverkompatibilitet)
    const isFastEiendom = /^FAST\s*EIENDOM$/i.test(name) || /^PRIMÆRBOLIG$/i.test(name);
    const isEiendom = /^EIENDOM$/i.test(name);
    const isEiendomByType = ["eiendom", "fritidseiendom", "sekundaereiendom", "tomt"].indexOf(a.assetType) >= 0;
    if (isLiquidity) rate = rLikv;
    else if (isFastEiendom || isEiendom || isEiendomByType) rate = rEiend;
    else if (isInvestment || a.assetType === "investeringer") rate = rInv;
    else if (isBilBat || a.assetType === "bilbat") rate = rBilBat;
    let contribution = 0;
    if (isLiquidity && routing.mode === "bank") {
      contribution = netPositive;
    } else if (isInvestment) {
      if (routing.mode === "investeringer") contribution = netPositive;
      else if (routing.mode === "custom") contribution = customAllocation;
    }
    const value = projectWithContribution(base, rate, yearsFromStart, contribution);
    return { key: name, value, color: getAssetColorByName(name, a.assetType, a) };
  });
}

function remainingDebtTotalForYear(yearVal) {
  const debts = AppState.debts || [];
  const Y = Number(yearVal);
  return debts.reduce((total, debt) => total + remainingBalanceForDebtInYear(debt, Y), 0);
}

function computeEquityValue(yearVal) {
  const assetCategories = computeAssetProjection(yearVal);
  const totalAssets = assetCategories.reduce((sum, item) => sum + (item.value || 0), 0);
  const debtVal = Math.min(remainingDebtTotalForYear(yearVal), totalAssets);
  return Math.max(0, totalAssets - debtVal);
}

const GiTriggerIcons = {
  coin: '<ellipse cx="12" cy="7" rx="7" ry="4" fill="#335D9E"/><ellipse cx="12" cy="12" rx="7" ry="4" fill="#335D9E" fill-opacity="0.85"/><ellipse cx="12" cy="17" rx="7" ry="4" fill="#335D9E" fill-opacity="0.7"/>',
  percent: '<circle cx="7" cy="7" r="2.5" fill="#335D9E"/><circle cx="17" cy="17" r="2.5" fill="#335D9E"/><rect x="11" y="5" width="2" height="14" rx="1" transform="rotate(45 12 12)" fill="#335D9E"/>'
};

// --- Grafikk modul ---
function renderGraphicsModule(root) {
  root.innerHTML = "";

  // T-Konto-fanen: grafikken er fjernet – tom plassholder for at du skal sette inn ny grafik
  const currentNav = document.querySelector(".nav-item.is-active");
  const section = currentNav ? (currentNav.getAttribute("data-section") || "") : "";
  if (section === "T-Konto") {
    const placeholder = document.createElement("div");
    placeholder.id = "t-konto-graphic-placeholder";
    placeholder.className = "t-konto-graphic-placeholder";
    root.appendChild(placeholder);
    return;
  }

  // Initialiser struktur hvis den ikke finnes
  if (!AppState.structure) {
    AppState.structure = {
      privat: [
        { active: true, name: "Privat" },
        { active: false, name: "Privat II" }
      ],
      holding1: { active: false, name: "Holding AS", ownershipPct: null },
      holding2: { active: false, name: "Holding II AS", ownershipPct: null }
    };
  }

  // Toggle state for visning (individuell vs struktur-gruppert)
  if (AppState.graphicsViewMode === undefined) {
    AppState.graphicsViewMode = "individual"; // "individual" eller "structure"
  }

  // Bruk faktiske eiendelsnavn (identiske med Eiendeler-fanen)
  const assets = AppState.assets || [];
  const debts = AppState.debts || [];
  
  let assetCategories;
  let totalAssets;
  
  if (AppState.graphicsViewMode === "structure") {
    // Grupper eiendeler etter struktur-entitet
    const projectedAssets = computeAssetProjection(2026);
    const groupedByEntity = {};
    
    assets.forEach((a, idx) => {
      const projected = projectedAssets[idx];
      const value = projected ? projected.value : (a.amount || 0);
      const entity = a.entity || "privat";
      
      if (!groupedByEntity[entity]) {
        groupedByEntity[entity] = { value: 0, name: "" };
      }
      groupedByEntity[entity].value += value;
      
      groupedByEntity[entity].name = getEntityDisplayName(entity);
    });
    
    // Konverter til array med farger
    assetCategories = [];
    Object.keys(groupedByEntity).forEach((entity) => {
      const group = groupedByEntity[entity];
      if (group.value > 0) {
        let color;
        if (isPrivatEntity(entity)) {
          color = "#60A5FA"; // Mild blå for Privat
        } else {
          color = "#93C5FD"; // Mildere blå for AS (samme palett)
        }
        assetCategories.push({
          key: group.name,
          value: group.value,
          color: color
        });
      }
    });
    
    totalAssets = assetCategories.reduce((s, x) => s + x.value, 0);
  } else {
    // Individuell visning (original)
    const projectedAssets = computeAssetProjection(2026);

    // I grafikken ønsker vi samme kategorisering som i Formuesskatt:
    // - Investeringer summeres og splittes på privat vs AS (Holding)
    // - Øvrige eiendeler vises som egne rader (Bankinnskudd, Primærbolig, Bil/båt, osv.)
    function nameOf(a) { return String(a && a.name != null ? a.name : "").trim(); }
    function isInvesteringerAsset(a) {
      var n = nameOf(a);
      return (
        a &&
        (isMaalOgBehovPortfolioAsset(a) ||
          a.assetType === "investeringer" ||
          /^INVESTERINGER$/i.test(n) ||
          /INVESTERINGER\s*m[åa]l\s*og\s*behov/i.test(n))
      );
    }

    var categories = [];
    var privatInv = 0;
    var aksjeselskapInv = 0;
    var insertIndexForInvesteringer = null;

    assets.forEach((a, idx) => {
      const projected = projectedAssets[idx];
      const value = projected ? projected.value : (a.amount || 0);
      const name = String(a.name || `Eiendel ${idx + 1}`);

      if (isInvesteringerAsset(a)) {
        if (insertIndexForInvesteringer === null) insertIndexForInvesteringer = categories.length;
        const entity = a.entity || "privat";
        if (isPrivatEntity(entity)) privatInv += value;
        else aksjeselskapInv += value;
        return;
      }

      categories.push({
        key: name,
        value: value,
        color: getAssetColorByName(name, a.assetType, a) // Bruk standardfarger basert på navn/type
      });
    });

    if (insertIndexForInvesteringer === null) insertIndexForInvesteringer = categories.length;
    // Legg inn splitt for investeringer i riktig posisjon
    var offset = 0;
    if (privatInv > 0) {
      categories.splice(insertIndexForInvesteringer + offset, 0, {
        key: "Privat portefølje (ASK)",
        value: privatInv,
        color: "#60A5FA"
      });
      offset += 1;
    }
    if (aksjeselskapInv > 0) {
      categories.splice(insertIndexForInvesteringer + offset, 0, {
        key: "Aksjeselskap (AS)",
        value: aksjeselskapInv,
        color: "#93C5FD"
      });
    }

    assetCategories = categories;
    totalAssets = assetCategories.reduce((s, x) => s + x.value, 0);
  }
  
  const totalDebtRaw = debts.reduce((s, d) => s + (d.amount || 0), 0);
  const debtVal = Math.min(totalDebtRaw, totalAssets);
  const equityVal = Math.max(0, totalAssets - debtVal);

  // Del opp gjeld i separate segmenter hvis det er flere gjeldsposter
  const financingParts = [];
  if (debts.length === 1) {
    // Hvis kun én gjeldspost, bruk samme struktur som før
    financingParts.push({ key: "Gjeld", value: debtVal, color: "#FCA5A5" });
  } else if (debts.length > 1) {
    // Hvis flere gjeldsposter, lag et segment for hver
    const debtScale = ["#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C"]; // Mildere rødskala
    debts.forEach((debt, idx) => {
      const debtAmount = Math.min(debt.amount || 0, debtVal);
      if (debtAmount > 0) {
        financingParts.push({
          key: String(debt.name || `Gjeld ${idx + 1}`),
          value: debtAmount,
          color: debtScale[idx % debtScale.length]
        });
      }
    });
  }
  financingParts.push({ key: "Egenkapital", value: equityVal, color: "#86EFAC" });

  // Bygg SVG først - samme struktur som waterfall
  const svg = buildFinanceSVG(assetCategories, financingParts, totalAssets, 2026, null, false);
  
  // Wrapper for å kunne legge til knapp - samme struktur som waterfall
  const graphWrap = document.createElement("div");
  graphWrap.style.position = "relative";
  graphWrap.style.width = "100%";
  
  // Toggle-knapp FØRST - legg den til før container
  const toggleViewBtn = document.createElement("button");
  toggleViewBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#335D9E"/><path d="M8 8l4-4 4 4M8 16l4 4 4-4" stroke="#335D9E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  toggleViewBtn.className = "gi-trigger toggle-view-btn";
  toggleViewBtn.style.cssText = "position: absolute !important; left: 12px !important; top: 12px !important; width: 40px !important; height: 40px !important; border-radius: 12px !important; border: 1px solid rgba(15, 23, 42, 0.08) !important; background: rgba(255, 255, 255, 0.95) !important; box-shadow: 0 8px 20px rgba(2, 6, 23, 0.15) !important; backdrop-filter: blur(6px) !important; -webkit-backdrop-filter: blur(6px) !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; z-index: 9999 !important;";
  toggleViewBtn.setAttribute("title", AppState.graphicsViewMode === "structure" ? "Vis individuelle eiendeler" : "Vis gruppert etter struktur");
  toggleViewBtn.setAttribute("aria-label", AppState.graphicsViewMode === "structure" ? "Vis individuelle eiendeler" : "Vis gruppert etter struktur");
  toggleViewBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    AppState.graphicsViewMode = AppState.graphicsViewMode === "structure" ? "individual" : "structure";
    renderGraphicsModule(root);
  });
  graphWrap.appendChild(toggleViewBtn);
  
  const container = document.createElement("div");
  container.className = "t-konto-canvas";
  container.style.position = "relative";
  container.appendChild(svg);
  graphWrap.appendChild(container);
  
  root.appendChild(graphWrap);

  function createTriggerButton({ left, right, top, controls, title, ariaLabel, onClick, iconMarkup }) {
    const btn = document.createElement("button");
    btn.className = "gi-trigger";
    if (typeof top === "string") btn.style.top = top;
    if (typeof left === "string") {
      btn.style.left = left;
      btn.style.right = "auto";
    }
    if (typeof right === "string") {
      btn.style.right = right;
      btn.style.left = "auto";
    }
    btn.setAttribute("aria-haspopup", "dialog");
    if (controls) btn.setAttribute("aria-controls", controls);
    if (title) btn.setAttribute("title", title);
    if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.innerHTML = iconMarkup || GiTriggerIcons.coin;
    btn.appendChild(icon);
    if (typeof onClick === "function") {
      btn.addEventListener("click", onClick);
    }
    return btn;
  }


  const assetsTrigger = createTriggerButton({
    left: "calc(50% - 52px)",
    top: "12px",
    controls: "gi-modal",
    title: "Åpne eiendelsutvikling",
    ariaLabel: "Åpne eiendelsutvikling",
    onClick: openGiModal,
    iconMarkup: GiTriggerIcons.coin
  });
  graphWrap.appendChild(assetsTrigger);

  const assetsTriggerSecondary = createTriggerButton({
    left: "calc(50% - 52px)",
    top: "60px",
    controls: "total-capital-return-modal",
    title: "Åpne totalkapitalavkastning",
    ariaLabel: "Åpne totalkapitalavkastning",
    onClick: openTotalCapitalReturnModal,
    iconMarkup: GiTriggerIcons.percent
  });
  graphWrap.appendChild(assetsTriggerSecondary);

  const financingTrigger = createTriggerButton({
    right: "200px",
    top: "12px",
    controls: "financing-modal",
    title: "Åpne finansieringsutvikling",
    ariaLabel: "Åpne finansieringsutvikling",
    onClick: openFinancingModal,
    iconMarkup: GiTriggerIcons.coin
  });
  graphWrap.appendChild(financingTrigger);

  const financingTriggerSecondary = createTriggerButton({
    right: "200px",
    top: "60px",
    controls: "equity-return-modal",
    title: "Åpne EK-avkastning",
    ariaLabel: "Åpne EK-avkastning",
    onClick: openEquityReturnModal,
    iconMarkup: GiTriggerIcons.percent
  });
  graphWrap.appendChild(financingTriggerSecondary);

  // Rerender ved resize for å holde tooltip-posisjonering korrekt
  const onResize = () => {
    const current = document.getElementById("sectionTitle");
    if (current && current.textContent === "Grafikk") {
      renderGraphicsModule(root);
    } else {
      window.removeEventListener("resize", onResize);
    }
  };
  window.addEventListener("resize", onResize);
}

function buildFinanceSVG(assetCategories, financingParts, totalAssets, yearVal, unused, hideBars) {
  const vbW = 1200; const vbH = 840; // Økt med 20% (700 * 1.2 = 840)
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  // Eksakt samme stil som waterfall - linje for linje identisk
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";

  // Styles inside SVG
  const style = document.createElementNS(svgNS, "style");
  style.textContent = `
    .t-title { font: 900 28px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
    .t-sub { font: 500 14px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #8A98A7; }
    .t-panel { font: 700 20px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
    /* Hovedkategorier (BANK, FAST EIENDOM, INVESTERINGER MÅL OG BEHOV osv.) – redusert 20 % */
    .t-label { font: 500 11.2px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
    .t-value { font: 700 13px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #677788; }
    .t-legend { font: 500 13px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #677788; }
    .sum-text { font: 700 14px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #677788; display: none; }
  `;
  svg.appendChild(style);

  // Background removed - let page background show through

  // Defs: shadow and clip
  const defs = document.createElementNS(svgNS, "defs");
  const shadow = document.createElementNS(svgNS, "filter");
  shadow.setAttribute("id", "cardShadow");
  shadow.setAttribute("x", "-10%"); shadow.setAttribute("y", "-10%");
  shadow.setAttribute("width", "120%"); shadow.setAttribute("height", "120%");
  const feDrop = document.createElementNS(svgNS, "feDropShadow");
  feDrop.setAttribute("dx", "0"); feDrop.setAttribute("dy", "1");
  feDrop.setAttribute("stdDeviation", "4");
  feDrop.setAttribute("flood-color", "#000000");
  feDrop.setAttribute("flood-opacity", "0.08");
  shadow.appendChild(feDrop);
  defs.appendChild(shadow);

  // Lekker skygge for søyler – tydeligere skygge
  const barShadow = document.createElementNS(svgNS, "filter");
  barShadow.setAttribute("id", "barShadow");
  barShadow.setAttribute("x", "-30%"); barShadow.setAttribute("y", "-30%");
  barShadow.setAttribute("width", "160%"); barShadow.setAttribute("height", "160%");
  const feDropBar = document.createElementNS(svgNS, "feDropShadow");
  feDropBar.setAttribute("dx", "0"); feDropBar.setAttribute("dy", "6");
  feDropBar.setAttribute("stdDeviation", "12");
  feDropBar.setAttribute("flood-color", "#000000");
  feDropBar.setAttribute("flood-opacity", "0.32");
  barShadow.appendChild(feDropBar);
  defs.appendChild(barShadow);

  const clipBarLeft = document.createElementNS(svgNS, "clipPath");
  clipBarLeft.setAttribute("id", "clipBarLeft");
  const clipRectL = document.createElementNS(svgNS, "rect");
  clipRectL.setAttribute("rx", "8"); clipRectL.setAttribute("ry", "8");
  const clipBarRight = document.createElementNS(svgNS, "clipPath");
  clipBarRight.setAttribute("id", "clipBarRight");
  const clipRectR = document.createElementNS(svgNS, "rect");
  clipRectR.setAttribute("rx", "8"); clipRectR.setAttribute("ry", "8");
  clipBarLeft.appendChild(clipRectL);
  clipBarRight.appendChild(clipRectR);
  defs.appendChild(clipBarLeft);
  defs.appendChild(clipBarRight);

  svg.appendChild(defs);

  // Grid and panels
  // pad = 0 for å la de to hvite containerne fylle hele bredden (samme som stepper-kortet)
  const pad = 0; const gutter = 24;
  const innerW = vbW - pad * 2;
  
  // For Treemap (hideBars = true), bruk tre bokser. Ellers to bokser.
  const numPanels = hideBars ? 3 : 2;
  const numGutters = numPanels - 1; // Antall mellomrom mellom boksene
  const panelW = (innerW - (gutter * numGutters)) / numPanels;
  
  // Calculate X positions for panels
  const panelX = [];
  for (let i = 0; i < numPanels; i++) {
    panelX.push(pad + i * (panelW + gutter));
  }
  
  // Keep old variables for backwards compatibility with bar chart code
  const leftX = panelX[0];
  const rightX = numPanels === 2 ? panelX[1] : (pad + panelW + gutter); // For bar chart positioning

  // Title removed per design preference
  // Fjernet undertekst for et renere uttrykk

  // Panels top Y (bring content closer to match spacing under tom ramme)
  const panelsTopY = 0;

  // Card sizes
  const cardR = 12;
  const cardStroke = "#E8EBF3";

  // Estimate card height to fit bar and texts (may approach bottom)
  const cardHeight = Math.min(vbH - panelsTopY - 32 - 24, 672); // Økt med 20% (560 * 1.2 = 672)

  // Cards
  const panelLabels = hideBars ? ["Boks 1", "Boks 2", "Boks 3"] : ["Eiendeler", "Finansiering"];
  
  for (let i = 0; i < numPanels; i++) {
    const card = document.createElementNS(svgNS, "rect");
    card.setAttribute("x", String(panelX[i]));
    card.setAttribute("y", String(panelsTopY));
    card.setAttribute("width", String(panelW));
    card.setAttribute("height", String(cardHeight));
    card.setAttribute("rx", String(cardR));
    card.setAttribute("ry", String(cardR));
    card.setAttribute("fill", "#FFFFFF");
    card.setAttribute("stroke", cardStroke);
    card.setAttribute("filter", "url(#cardShadow)");
    card.setAttribute("aria-label", panelLabels[i]);
    card.setAttribute("role", "img");
    svg.appendChild(card);
  }
  
  // Keep old card variables for backwards compatibility (only for two-panel layout)
  const leftCard = hideBars ? null : svg.querySelector(`rect[aria-label="${panelLabels[0]}"]`);
  const rightCard = hideBars ? null : svg.querySelector(`rect[aria-label="${panelLabels[1]}"]`);

  // Hvis hideBars er true (Treemap-fanen), legg til treemap i boksene
  if (hideBars) {
    renderAssetsTreemap(svg, panelX[0], panelsTopY, panelW, cardHeight, svgNS, yearVal);
    renderDebtEquityTreemap(svg, panelX[1], panelsTopY, panelW, cardHeight, svgNS, yearVal);
    renderCashflowTreemap(svg, panelX[2], panelsTopY, panelW, cardHeight, svgNS, yearVal);
    
    // Oppdater kortene med verdier fra treemap-diagrammene
    updateCardsFromTreemapValues();
  }

  // Panel headings - fjernet for å spare plass

  // Bars placement og dynamisk høyde slik at bunnmarg == toppmarg
  const barWidth = 187; // stolpebredde (+20%)
  const gapHeadToBar = 24;
  const barTopY = Math.round(panelsTopY + 24); // Redusert avstand siden overskrifter er fjernet
  const topSpace = barTopY - panelsTopY;
  const bottomMargin = topSpace; // Bunnmarg lik toppmarg (24px)
  const barHeight = Math.max(200, cardHeight - barTopY - bottomMargin); // Bunnmarg lik toppmarg
  const barCenterLX = Math.round(leftX + panelW / 2);
  const barCenterRX = Math.round(rightX + panelW / 2);
  const barLeftX = barCenterLX - Math.round(barWidth / 2);
  const barRightX = barCenterRX - Math.round(barWidth / 2);

  // Update clip rects
  clipRectL.setAttribute("x", String(barLeftX));
  clipRectL.setAttribute("y", String(barTopY));
  clipRectL.setAttribute("width", String(barWidth));
  clipRectL.setAttribute("height", String(barHeight));
  clipRectR.setAttribute("x", String(barRightX));
  clipRectR.setAttribute("y", String(barTopY));
  clipRectR.setAttribute("width", String(barWidth));
  clipRectR.setAttribute("height", String(barHeight));

  // Groups to hold segments
  const gLeft = document.createElementNS(svgNS, "g");
  gLeft.setAttribute("clip-path", "url(#clipBarLeft)");
  const gRight = document.createElementNS(svgNS, "g");
  gRight.setAttribute("clip-path", "url(#clipBarRight)");
  svg.appendChild(gLeft); svg.appendChild(gRight);

  // Helpers
  function darken(hex, factor = 0.8) {
    const v = hex.replace('#','');
    const r = parseInt(v.substring(0,2),16);
    const g = parseInt(v.substring(2,4),16);
    const b = parseInt(v.substring(4,6),16);
    const d = (x)=> Math.max(0, Math.min(255, Math.round(x*factor)));
    return `#${d(r).toString(16).padStart(2,'0')}${d(g).toString(16).padStart(2,'0')}${d(b).toString(16).padStart(2,'0')}`;
  }

  function pct(value, total) {
    if (total <= 0) return "0 %";
    const p = (value * 100) / total;
    return `${Math.round(p)} %`;
  }

  // Hvis hideBars er true (Treemap-fanen), hopp over all kode som lager søylediagrammene
  if (!hideBars) {
  // Left stacked segments (bottom-up): Anleggsmidler, Varelager, Fordringer, Kontanter
  const minSegmentHeight = 35; // Minimumshøyde for lesbarhet
  const validLeftSegs = assetCategories.filter(seg => seg.value > 0).reverse();
  
  // Første pass: beregn normale høyder
  const leftHeights = validLeftSegs.map(seg => 
    Math.max(0, Math.round((seg.value / (totalAssets || 1)) * barHeight))
  );
  
  // Identifiser segmenter under minimumshøyde og beregn ekstra plass
  let extraSpaceNeeded = 0;
  const needsMinHeight = leftHeights.map(h => {
    if (h > 0 && h < minSegmentHeight) {
      extraSpaceNeeded += (minSegmentHeight - h);
      return true;
    }
    return false;
  });
  
  // Skaler ned andre segmenter proporsjonalt hvis nødvendig
  let totalScaledHeight = 0;
  const scaledHeights = leftHeights.map((h, idx) => {
    if (needsMinHeight[idx]) {
      return minSegmentHeight;
    } else if (extraSpaceNeeded > 0 && h > 0) {
      // Skaler ned proporsjonalt
      const totalOtherHeight = leftHeights.reduce((sum, height, i) => 
        sum + (needsMinHeight[i] ? 0 : height), 0
      );
      if (totalOtherHeight > 0) {
        const scaleFactor = (totalOtherHeight - extraSpaceNeeded) / totalOtherHeight;
        return Math.max(1, Math.round(h * scaleFactor));
      }
    }
    return h;
  });
  
  // Sjekk at total høyde matcher barHeight, juster hvis nødvendig
  totalScaledHeight = scaledHeights.reduce((sum, h) => sum + h, 0);
  if (totalScaledHeight !== barHeight && totalScaledHeight > 0) {
    const adjustment = barHeight - totalScaledHeight;
    // Legg til justering på største segmentet som ikke har minimumshøyde
    let largestIdx = -1;
    let largestH = 0;
    scaledHeights.forEach((h, idx) => {
      if (!needsMinHeight[idx] && h > largestH) {
        largestH = h;
        largestIdx = idx;
      }
    });
    if (largestIdx >= 0) {
      scaledHeights[largestIdx] += adjustment;
    }
  }
  
  let cursorY = barTopY + barHeight;
  const leftSeparators = [];
  validLeftSegs.forEach((seg, idx) => {
    const h = scaledHeights[idx];
    if (h <= 0) return;
    const y = cursorY - h;
    cursorY = y;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", String(barLeftX));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(h));
    rect.setAttribute("fill", seg.color);
    rect.setAttribute("fill-opacity", "0.9");
    rect.setAttribute("stroke", darken(seg.color, 0.8));
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("filter", "url(#barShadow)");
    rect.setAttribute("role", "img");
    rect.setAttribute("aria-label", `${String(seg.key || "").toUpperCase()}: ${formatNOK(seg.value)}, ${pct(seg.value, totalAssets)}`);
    gLeft.appendChild(rect);

    // Separator (overlay) except at very top
    if (idx < validLeftSegs.length - 1) {
      leftSeparators.push(Math.round(y));
    }

    // Labels: always show, clamp within bar for very small segment heights
    {
      let cy = y + Math.round(h / 2);
      if (h < 24) {
        cy = Math.min(Math.max(y + 12, barTopY + 12), barTopY + barHeight - 12);
      }
      const labL = document.createElementNS(svgNS, "text");
      labL.setAttribute("x", String(barLeftX - 12));
      labL.setAttribute("y", String(cy + 4));
      labL.setAttribute("text-anchor", "end");
      labL.setAttribute("class", "t-label");
      labL.textContent = String(seg.key || "").toUpperCase();
      svg.appendChild(labL);

      const labR = document.createElementNS(svgNS, "text");
      labR.setAttribute("x", String(barLeftX + barWidth + 12));
      labR.setAttribute("y", String(cy + 4));
      labR.setAttribute("text-anchor", "start");
      labR.setAttribute("class", "t-value");
      labR.textContent = `${formatNOK(seg.value)} · ${pct(seg.value, totalAssets)}`;
      svg.appendChild(labR);
    }

    attachTooltip(svg, rect, String(seg.key || "").toUpperCase(), seg.value, pct(seg.value, totalAssets));
  });

  // Draw separators over the bar
  leftSeparators.forEach((y) => {
    const sep = document.createElementNS(svgNS, "rect");
    sep.setAttribute("x", String(barLeftX));
    sep.setAttribute("y", String(Math.max(barTopY, y - 1)));
    sep.setAttribute("width", String(barWidth));
    sep.setAttribute("height", "2");
    sep.setAttribute("fill", "#FFFFFF");
    sep.setAttribute("fill-opacity", "0.6");
    gLeft.appendChild(sep);
  });

  // Outline of full left bar
  const leftOutline = document.createElementNS(svgNS, "rect");
  leftOutline.setAttribute("x", String(barLeftX));
  leftOutline.setAttribute("y", String(barTopY));
  leftOutline.setAttribute("width", String(barWidth));
  leftOutline.setAttribute("height", String(barHeight));
  leftOutline.setAttribute("rx", "8"); leftOutline.setAttribute("ry", "8");
  leftOutline.setAttribute("fill", "none");
  leftOutline.setAttribute("stroke", "#E8EBF3");
  leftOutline.setAttribute("stroke-width", "1.5");
  svg.appendChild(leftOutline);

  // Right financing bar (gjeld-segmenter nederst, Egenkapital øverst)
  const totalFin = financingParts.reduce((s, x) => s + x.value, 0);
  
  // Sorter slik at alle gjeld-segmenter kommer først (nederst), deretter Egenkapital (øverst)
  const debtParts = financingParts.filter(x => x.key !== "Egenkapital");
  const equityPart = financingParts.find(x => x.key === "Egenkapital") || { key: "Egenkapital", value: 0, color: "#86EFAC" };
  const orderRight = [...debtParts, equityPart].filter(seg => seg.value > 0);
  
  // Første pass: beregn normale høyder
  const rightHeights = orderRight.map(seg => 
    totalFin > 0 ? Math.max(0, Math.round((seg.value / totalFin) * barHeight)) : 0
  );
  
  // Identifiser segmenter under minimumshøyde og beregn ekstra plass
  let extraSpaceNeededR = 0;
  const needsMinHeightR = rightHeights.map(h => {
    if (h > 0 && h < minSegmentHeight) {
      extraSpaceNeededR += (minSegmentHeight - h);
      return true;
    }
    return false;
  });
  
  // Skaler ned andre segmenter proporsjonalt hvis nødvendig
  let totalScaledHeightR = 0;
  const scaledHeightsR = rightHeights.map((h, idx) => {
    if (needsMinHeightR[idx]) {
      return minSegmentHeight;
    } else if (extraSpaceNeededR > 0 && h > 0) {
      // Skaler ned proporsjonalt
      const totalOtherHeight = rightHeights.reduce((sum, height, i) => 
        sum + (needsMinHeightR[i] ? 0 : height), 0
      );
      if (totalOtherHeight > 0) {
        const scaleFactor = (totalOtherHeight - extraSpaceNeededR) / totalOtherHeight;
        return Math.max(1, Math.round(h * scaleFactor));
      }
    }
    return h;
  });
  
  // Sjekk at total høyde matcher barHeight, juster hvis nødvendig
  totalScaledHeightR = scaledHeightsR.reduce((sum, h) => sum + h, 0);
  if (totalScaledHeightR !== barHeight && totalScaledHeightR > 0) {
    const adjustment = barHeight - totalScaledHeightR;
    // Legg til justering på største segmentet som ikke har minimumshøyde
    let largestIdx = -1;
    let largestH = 0;
    scaledHeightsR.forEach((h, idx) => {
      if (!needsMinHeightR[idx] && h > largestH) {
        largestH = h;
        largestIdx = idx;
      }
    });
    if (largestIdx >= 0) {
      scaledHeightsR[largestIdx] += adjustment;
    }
  }
  
  let cursorYR = barTopY + barHeight;
  const rightSeparators = [];
  
  orderRight.forEach((seg, idx) => {
    const h = scaledHeightsR[idx];
    if (h <= 0) return; // ikke tegn eller label segmenter uten høyde (unngå overlapp ved 0)
    const y = cursorYR - h;
    cursorYR = y;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", String(barRightX));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(h));
    rect.setAttribute("fill", seg.color);
    rect.setAttribute("fill-opacity", "0.9");
    rect.setAttribute("stroke", darken(seg.color, 0.8));
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("filter", "url(#barShadow)");
    rect.setAttribute("role", "img");
    rect.setAttribute("aria-label", `${String(seg.key || "").toUpperCase()}: ${formatNOK(seg.value)}, ${pct(seg.value, totalFin)}`);
    gRight.appendChild(rect);

    // Separator mellom gjeld-segmenter (ikke etter siste gjeld eller før Egenkapital)
    if (seg.key !== "Egenkapital" && idx < debtParts.length - 1) {
      rightSeparators.push(Math.round(y));
    }

    // Konverter alle navn til store bokstaver
    const displayKey = String(seg.key || "").toUpperCase();
    
    if (h >= 24) {
      const cy = y + Math.round(h / 2);
      const labL = document.createElementNS(svgNS, "text");
      labL.setAttribute("x", String(barRightX - 12));
      labL.setAttribute("y", String(cy + 4));
      labL.setAttribute("text-anchor", "end");
      labL.setAttribute("class", "t-label");
      labL.textContent = displayKey;
      svg.appendChild(labL);

      const labR = document.createElementNS(svgNS, "text");
      labR.setAttribute("x", String(barRightX + barWidth + 12));
      labR.setAttribute("y", String(cy + 4));
      labR.setAttribute("text-anchor", "start");
      labR.setAttribute("class", "t-value");
      labR.textContent = `${formatNOK(seg.value)} · ${pct(seg.value, totalFin)}`;
      svg.appendChild(labR);
    } else if (h > 0) {
      // For svært små segmenter: plasser label utenfor, men på segmentets midtpunkt for å unngå overlapp
      const cy = y + Math.round(h / 2);
      const labL = document.createElementNS(svgNS, "text");
      labL.setAttribute("x", String(barRightX - 12));
      labL.setAttribute("y", String(cy + 4));
      labL.setAttribute("text-anchor", "end");
      labL.setAttribute("class", "t-label");
      labL.textContent = displayKey;
      svg.appendChild(labL);

      const labR = document.createElementNS(svgNS, "text");
      labR.setAttribute("x", String(barRightX + barWidth + 12));
      labR.setAttribute("y", String(cy + 4));
      labR.setAttribute("text-anchor", "start");
      labR.setAttribute("class", "t-value");
      labR.textContent = `${formatNOK(seg.value)} · ${pct(seg.value, totalFin)}`;
      svg.appendChild(labR);
    }

    attachTooltip(svg, rect, String(seg.key || "").toUpperCase(), seg.value, pct(seg.value, totalFin));
  });

  // Draw separators over the right bar (mellom gjeld-segmenter)
  rightSeparators.forEach((y) => {
    const sep = document.createElementNS(svgNS, "rect");
    sep.setAttribute("x", String(barRightX));
    sep.setAttribute("y", String(Math.max(barTopY, y - 1)));
    sep.setAttribute("width", String(barWidth));
    sep.setAttribute("height", "2");
    sep.setAttribute("fill", "#FFFFFF");
    sep.setAttribute("fill-opacity", "0.6");
    gRight.appendChild(sep);
  });

  const rightOutline = document.createElementNS(svgNS, "rect");
  rightOutline.setAttribute("x", String(barRightX));
  rightOutline.setAttribute("y", String(barTopY));
  rightOutline.setAttribute("width", String(barWidth));
  rightOutline.setAttribute("height", String(barHeight));
  rightOutline.setAttribute("rx", "8"); rightOutline.setAttribute("ry", "8");
  rightOutline.setAttribute("fill", "none");
  rightOutline.setAttribute("stroke", "#E8EBF3"); // subtle contour
  rightOutline.setAttribute("stroke-width", "1");
  svg.appendChild(rightOutline);
  }

  // Sum texts (kun vist hvis søylene er synlige)
  if (!hideBars) {
  const sumY = Math.round(barTopY + barHeight + 16 + 12);
  const sumL = document.createElementNS(svgNS, "text");
  sumL.setAttribute("x", String(Math.round(leftX + panelW / 2)));
  sumL.setAttribute("y", String(sumY));
  sumL.setAttribute("text-anchor", "middle");
  sumL.setAttribute("class", "sum-text");
  sumL.textContent = `Sum eiendeler: ${formatNOK(totalAssets)}`;
  svg.appendChild(sumL);

  const sumR = document.createElementNS(svgNS, "text");
  sumR.setAttribute("x", String(Math.round(rightX + panelW / 2)));
  sumR.setAttribute("y", String(sumY));
  sumR.setAttribute("text-anchor", "middle");
  sumR.setAttribute("class", "sum-text");
  sumR.textContent = `Sum finansiering: ${formatNOK(totalAssets)}`;
  svg.appendChild(sumR);

  // Equality indicator between bars
  const eqX = Math.round((leftX + panelW + rightX) / 2);
  const eqY = Math.round(barTopY + barHeight / 2);
  const eqPlate = document.createElementNS(svgNS, "rect");
  eqPlate.setAttribute("x", String(eqX - 16));
  eqPlate.setAttribute("y", String(eqY - 16));
  eqPlate.setAttribute("width", "32");
  eqPlate.setAttribute("height", "32");
  eqPlate.setAttribute("rx", "8");
  eqPlate.setAttribute("fill", "#FFFFFF");
  eqPlate.setAttribute("stroke", "#E8EBF3");
  eqPlate.setAttribute("filter", "url(#cardShadow)");
  svg.appendChild(eqPlate);

  const eqText = document.createElementNS(svgNS, "text");
  eqText.setAttribute("x", String(eqX));
  eqText.setAttribute("y", String(eqY + 8));
  eqText.setAttribute("text-anchor", "middle");
  eqText.setAttribute("class", "t-label");
  eqText.setAttribute("fill", "#0A5EDC");
  eqText.textContent = "=";
  svg.appendChild(eqText);

  // Legend (approximate centering, computed after items are appended)
  const legendItems = [
    { key: "Anleggsmidler", color: "#8CB2FF" },
    { key: "Varelager", color: "#5A94FF" },
    { key: "Fordringer", color: "#0A5EDC" },
    { key: "Kontanter", color: "#B6CCFF" },
    { key: "Egenkapital", color: "#0C8F4A" },
    { key: "Gjeld", color: "#912018" }
  ];
  const legendGroup = document.createElementNS(svgNS, "g");
  const legendY = Math.min(vbH - 32, sumY + 24 + 16); // place under sums
  svg.appendChild(legendGroup);
  // Hide legend/categories under the graphic per request
  legendGroup.setAttribute("display", "none");

  let xCursor = pad; const spacing = 16; const mark = 12; const gap = 4;
  const tempItems = [];
  legendItems.forEach((li) => {
    const g = document.createElementNS(svgNS, "g");
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", "0"); rect.setAttribute("y", String(legendY - mark + 2));
    rect.setAttribute("width", String(mark)); rect.setAttribute("height", String(mark));
    rect.setAttribute("rx", "3"); rect.setAttribute("fill", li.color);
    rect.setAttribute("fill-opacity", "0.9");
    rect.setAttribute("stroke", darken(li.color, 0.8)); rect.setAttribute("stroke-width", "1.5");
    g.appendChild(rect);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", String(mark + gap));
    text.setAttribute("y", String(legendY + 2));
    text.setAttribute("class", "t-legend");
    text.textContent = li.key;
    g.appendChild(text);
    legendGroup.appendChild(g);
    tempItems.push({ g, text });
  });

  // Measure and center
  const widths = tempItems.map(({ g, text }) => {
    const bb = text.getBBox();
    return mark + gap + bb.width;
  });
  const totalLegendWidth = widths.reduce((s, w) => s + w, 0) + spacing * (legendItems.length - 1);
  let startX = Math.round((vbW - totalLegendWidth) / 2);
  tempItems.forEach((item, idx) => {
    const g = item.g; const w = widths[idx];
    g.setAttribute("transform", `translate(${startX},0)`);
    startX += w + spacing;
  });
  }

  return svg;
}

// --- Treemap for Kontantstrøm (Treemap-fanen) ---
function renderCashflowTreemap(svg, x, y, width, height, svgNS, yearVal = 2026) {
  // Hent inntekter og utgifter fra AppState
  const incomes = AppState.incomes || [];
  
  // Beregn inflasjonsjustering basert på KPI og år
  const kpiRate = Number(AppState.expectations && AppState.expectations.kpi) || 0;
  const inflation = Math.max(0, kpiRate) / 100; // Konverter fra prosent til desimal
  const yearsFromStart = Math.max(0, Number(yearVal) - 2025);
  const inflationFactor = Math.pow(1 + inflation, yearsFromStart);
  
  // Separer inntekter og utgifter
  const incomeItems = [];
  const expenseItems = [];
  
  const upper = (s) => String(s || "").toUpperCase();
  
  let totalIncome = 0;
  let totalCosts = 0;
  
  incomes.forEach((item) => {
    const baseAmount = Number(item.amount) || 0;
    if (baseAmount <= 0) return;
    
    // Juster beløpet med KPI for det valgte året
    const adjustedAmount = baseAmount * inflationFactor;
    
    const name = upper(item.name);
    // Skattefrie inntekter er inntekt, ikke utgift – inkluder i inntekter i kontantstrømmen
    if ((/SKATT|KOSTNAD/.test(name)) && !/SKATTEFRIE\s*INNTEKTER/.test(name)) {
      expenseItems.push({
        id: item.id || String(Math.random()),
        label: item.name,
        value: adjustedAmount,
        type: 'expense'
      });
      totalCosts += adjustedAmount;
    } else {
      const isSkattefrieMoBRad = isMoBUtbetalingIncomeRow(item);
      incomeItems.push({
        id: item.id || String(Math.random()),
        label: isSkattefrieMoBRad
          ? (item._maalOgBehovUtbetalingToggleUI ? "Utbetalinger fra mål og behov" : "Annen inntekt")
          : item.name,
        value: adjustedAmount,
        type: 'income'
      });
      totalIncome += adjustedAmount;
    }
  });
  
  // Beregn årlig gjeldsbetaling for det valgte året (samme «start»-regel som Kontantstrøm-waterfall)
  const debts = AppState.debts || [];
  let annualDebtPayment = 0;
  const Ycf = Number(yearVal);
  const alignStart =
    Number.isFinite(Ycf) && Ycf === 2025;

  debts.forEach((debt) => {
    const calYear = alignStart ? getDebtScheduleStartYear(debt) : Ycf;
    const eff = getDebtScheduleElapsed(debt, calYear);
    const debtProjection = projectDebtYear(debt, eff);
    annualDebtPayment += debtProjection.payment || 0;
  });
  
  // Kontantstrøm = inntekter - kostnader - gjeldsbetalinger
  const cashflow = Math.round(totalIncome - totalCosts - annualDebtPayment);
  
  // Lagre kontantstrøm-verdi i AppState
  AppState.treemapValues.cashflow = cashflow;
  
  // Kombiner inntekter og utgifter for treemap
  const allItems = [...incomeItems.map(item => ({ ...item, type: 'income' })), ...expenseItems.map(item => ({ ...item, type: 'expense' }))];
  
  // Beregn total for å normalisere størrelser
  const total = allItems.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0 || allItems.length === 0) {
    // Vis tomt tilbud hvis ingen data
    const emptyText = document.createElementNS(svgNS, "text");
    emptyText.setAttribute("x", String(x + width / 2));
    emptyText.setAttribute("y", String(y + height / 2));
    emptyText.setAttribute("text-anchor", "middle");
    emptyText.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    emptyText.setAttribute("font-size", "14");
    emptyText.setAttribute("fill", "#8A98A7");
    emptyText.textContent = "Ingen kontantstrømdata";
    svg.appendChild(emptyText);
    return;
  }
  
  // Padding for treemap - Outer: 6px, Inner: 2px (handled in createTreemapRect)
  const outerPadding = 6;
  const treemapX = x + outerPadding;
  const treemapY = y + outerPadding;
  const treemapW = width - outerPadding * 2;
  const treemapH = height - outerPadding * 2;
  
  // VIKTIG: Minimum Rule - LayoutVerdi = MAX(FaktiskVerdi, 130)
  // For å garantere at ingen bokser blir for små til å vise innhold
  const transformedItems = allItems.map(item => ({
    ...item,
    originalValue: item.value, // Faktisk verdi fra datagrunnlaget
    layoutValue: Math.max(item.value, 130), // Layout-verdi med minimum 130
    weight: Math.pow(Math.max(item.value, 130), 0.5) // Square root scaling på layout-verdi
  }));
  
  // Sorter items etter størrelse (største først) - "Puzzle Effect"
  const sortedItems = [...transformedItems].sort((a, b) => b.originalValue - a.originalValue);
  
  // Beregn total weight (ikke original value) for layout
  const totalWeight = sortedItems.reduce((sum, item) => sum + item.weight, 0);
  
  // Farger basert på type - matcher 100% fargene fra Kontantstrøm-fanen
  const greenPalette = ["#B5ECD0", "#7AD9A9", "#34C185", "#0C8F4A"]; // varierte grønntoner (inntekter)
  const redPalette = ["#F5B5B1", "#F1998F", "#EC7E73", "#E36258", "#D84F47"]; // lys -> dyp (utgifter)
  
  // Tell indekser separat for hver type
  let incomeIndex = 0;
  let expenseIndex = 0;
  
  const getColor = (type, item) => {
    if (type === 'income') {
      const color = greenPalette[incomeIndex % greenPalette.length];
      incomeIndex++;
      return color;
    } else if (type === 'expense') {
      const color = redPalette[expenseIndex % redPalette.length];
      expenseIndex++;
      return color;
    }
    return '#94a3b8';
  };
  
  // Hjelpefunksjon for å beregne minimum størrelse basert på tekst (for kontantstrøm)
  function calculateMinSizeForItem(item, isWidth) {
    const label = item.label || "";
    const value = formatNOK(item.originalValue || item.value);
    
    if (isWidth) {
      // For bredde: beregn faktisk tekstbredde + venstre- og høyremarg
      // Bold tekst med font-size 14px: ca 0.7 * font-size per tegn for uppercase/tall
      // Normal tekst med font-size 13px: ca 0.6 * font-size per tegn
      const labelWidth = label.length * 14 * 0.7; // Bold tekst
      const valueWidth = value.length * 13 * 0.6; // Normal tekst
      const maxTextWidth = Math.max(labelWidth, valueWidth);
      
      // Venstre- og høyremarg: minimum 12px på hver side (totalt 24px)
      const horizontalMargin = 24;
      
      // Minimum størrelse: tekstbredde + marger, minimum 150px
      return Math.max(150, maxTextWidth + horizontalMargin);
    } else {
      // For høyde: label (14px) + spacing (10px) + value (13px) + top/bottom margin (12px hver = 24px)
      return Math.max(60, 14 + 10 + 13 + 24);
    }
  }
  
  // Forbedret treemap layout som håndterer ulike størrelser bedre
  const totalAllItems = totalWeight; // Bruk totalWeight i stedet
  if (totalAllItems === 0) return;
  
  // Spesialhåndtering for få elementer (3 eller færre)
  if (sortedItems.length <= 3) {
    // Beregn minimum størrelser for alle elementer
    const minWidths = sortedItems.map(item => calculateMinSizeForItem(item, true));
    const minHeights = sortedItems.map(item => calculateMinSizeForItem(item, false));
    const maxMinWidth = Math.max(...minWidths);
    const maxMinHeight = Math.max(...minHeights);
    
    // Minimum størrelse basert på tekst eller 15% av minste side
    const minSize = Math.max(
      Math.min(treemapW, treemapH) * 0.15,
      Math.max(maxMinWidth, maxMinHeight)
    );
    
    if (sortedItems.length === 1) {
      createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
    } else if (sortedItems.length === 2) {
      const ratio1 = sortedItems[0].weight / totalAllItems;
      const ratio2 = sortedItems[1].weight / totalAllItems;
      const isHorizontal = treemapW >= treemapH;
      const innerPadding = 2; // Inner padding mellom bokser
      
      // Beregn minimum størrelser for begge elementer
      const minWidth1 = calculateMinSizeForItem(sortedItems[0], true);
      const minWidth2 = calculateMinSizeForItem(sortedItems[1], true);
      const minHeight1 = calculateMinSizeForItem(sortedItems[0], false);
      const minHeight2 = calculateMinSizeForItem(sortedItems[1], false);
      
      if (isHorizontal) {
        const availableWidth = treemapW - innerPadding;
        let w1 = Math.max(minWidth1, availableWidth * ratio1);
        let w2 = availableWidth - w1;
        
        // Sørg for at begge har minimum bredde
        if (w1 < minWidth1) {
          w1 = minWidth1;
          w2 = availableWidth - w1;
        }
        if (w2 < minWidth2) {
          w2 = minWidth2;
          w1 = availableWidth - w2;
        }
        
        createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, w1, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
        createTreemapRect(svg, svgNS, sortedItems[1], treemapX + w1 + innerPadding, treemapY, w2, treemapH, getColor(sortedItems[1].type, sortedItems[1]));
      } else {
        const availableHeight = treemapH - innerPadding;
        let h1 = Math.max(minHeight1, availableHeight * ratio1);
        let h2 = availableHeight - h1;
        
        // Sørg for at begge har minimum høyde
        if (h1 < minHeight1) {
          h1 = minHeight1;
          h2 = availableHeight - h1;
        }
        if (h2 < minHeight2) {
          h2 = minHeight2;
          h1 = availableHeight - h2;
        }
        
        createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, h1, getColor(sortedItems[0].type, sortedItems[0]));
        createTreemapRect(svg, svgNS, sortedItems[1], treemapX, treemapY + h1 + innerPadding, treemapW, h2, getColor(sortedItems[1].type, sortedItems[1]));
      }
    } else if (sortedItems.length === 3) {
      // For 3 elementer: stor øverst (tar hele bredden), to mindre nederst ved siden av hverandre
      const ratio1 = sortedItems[0].weight / totalAllItems;
      const ratio2 = sortedItems[1].weight / totalAllItems;
      const ratio3 = sortedItems[2].weight / totalAllItems;
      const innerPadding = 2; // Inner padding mellom bokser
      
      // Sjekk om det minste elementet er mye mindre (mindre enn 30% av summen av de to andre)
      const minRatio = Math.min(ratio1, ratio2, ratio3);
      const maxTwoRatio = Math.max(ratio1 + ratio2, ratio1 + ratio3, ratio2 + ratio3);
      const isOneMuchSmaller = minRatio < maxTwoRatio * 0.3;
      
      if (isOneMuchSmaller) {
        // Layout: stor øverst, to mindre nederst
        // Identifiser hvilken som er minst
        const ratios = [ratio1, ratio2, ratio3];
        const minIndex = ratios.indexOf(minRatio);
        const topIndex = minIndex === 0 ? (ratio2 > ratio3 ? 1 : 2) : (minIndex === 1 ? (ratio1 > ratio3 ? 0 : 2) : (ratio1 > ratio2 ? 0 : 1));
        const bottomLeftIndex = topIndex === 0 ? (minIndex === 1 ? 2 : 1) : (topIndex === 1 ? (minIndex === 0 ? 2 : 0) : (minIndex === 0 ? 1 : 0));
        const bottomRightIndex = minIndex;
        
        // Toppboks tar ca 60-70% av høyden
        const topRatio = sortedItems[topIndex].weight / (sortedItems[topIndex].weight + sortedItems[bottomLeftIndex].weight + sortedItems[bottomRightIndex].weight);
        const availableHeight = treemapH - innerPadding; // Reserver plass for spacing
        const topHeight = Math.max(availableHeight * 0.6, availableHeight * topRatio);
        const bottomHeight = availableHeight - topHeight;
        
        // Toppboks - tar hele bredden
        createTreemapRect(svg, svgNS, sortedItems[topIndex], treemapX, treemapY, treemapW, topHeight, getColor(sortedItems[topIndex].type, sortedItems[topIndex]));
        
        // To nederste bokser - deler bredden basert på proporsjoner, men sørg for minimum størrelse
        const bottomTotal = sortedItems[bottomLeftIndex].weight + sortedItems[bottomRightIndex].weight;
        const bottomLeftMinWidth = calculateMinSizeForItem(sortedItems[bottomLeftIndex], true);
        const bottomRightMinWidth = calculateMinSizeForItem(sortedItems[bottomRightIndex], true);
        const totalMinWidth = bottomLeftMinWidth + bottomRightMinWidth;
        const availableBottomWidth = treemapW - innerPadding; // Reserver plass for spacing
        
        let bottomLeftWidth = availableBottomWidth * (sortedItems[bottomLeftIndex].weight / bottomTotal);
        let bottomRightWidth = availableBottomWidth - bottomLeftWidth;
        
        // Juster hvis noen blir for smale
        if (bottomLeftWidth < bottomLeftMinWidth) {
          bottomLeftWidth = bottomLeftMinWidth;
          bottomRightWidth = availableBottomWidth - bottomLeftWidth;
        }
        if (bottomRightWidth < bottomRightMinWidth) {
          bottomRightWidth = bottomRightMinWidth;
          bottomLeftWidth = availableBottomWidth - bottomRightWidth;
        }
        
        // Hvis total min-width er større enn tilgjengelig bredde, skaler proporsjonalt
        if (totalMinWidth > availableBottomWidth) {
          const scale = availableBottomWidth / totalMinWidth;
          bottomLeftWidth = bottomLeftMinWidth * scale;
          bottomRightWidth = bottomRightMinWidth * scale;
        }
        
        const bottomY = treemapY + topHeight + innerPadding;
        createTreemapRect(svg, svgNS, sortedItems[bottomLeftIndex], treemapX, bottomY, bottomLeftWidth, bottomHeight, getColor(sortedItems[bottomLeftIndex].type, sortedItems[bottomLeftIndex]));
        createTreemapRect(svg, svgNS, sortedItems[bottomRightIndex], treemapX + bottomLeftWidth + innerPadding, bottomY, bottomRightWidth, bottomHeight, getColor(sortedItems[bottomRightIndex].type, sortedItems[bottomRightIndex]));
      } else {
        // Alle tre er omtrent like store - bruk standard layout
        const isHorizontal = treemapW >= treemapH;
        
        // Beregn minimum størrelser for alle tre elementer
        const minWidth1 = calculateMinSizeForItem(sortedItems[0], true);
        const minWidth2 = calculateMinSizeForItem(sortedItems[1], true);
        const minWidth3 = calculateMinSizeForItem(sortedItems[2], true);
        const minHeight1 = calculateMinSizeForItem(sortedItems[0], false);
        const minHeight2 = calculateMinSizeForItem(sortedItems[1], false);
        const minHeight3 = calculateMinSizeForItem(sortedItems[2], false);
        
        if (isHorizontal) {
          const availableWidth = treemapW - (innerPadding * 2); // To gaps mellom tre bokser
          let w1 = Math.max(minWidth1, availableWidth * ratio1);
          let w2 = Math.max(minWidth2, availableWidth * ratio2);
          let w3 = availableWidth - w1 - w2;
          
          // Juster hvis noen blir for smale
          if (w1 < minWidth1) {
            w1 = minWidth1;
            w3 = availableWidth - w1 - w2;
          }
          if (w2 < minWidth2) {
            w2 = minWidth2;
            w3 = availableWidth - w1 - w2;
          }
          if (w3 < minWidth3) {
            w3 = minWidth3;
            // Omfordel de to første proporsjonalt
            const remaining = availableWidth - w3;
            w1 = remaining * ratio1 / (ratio1 + ratio2);
            w2 = remaining * ratio2 / (ratio1 + ratio2);
          }
          
          createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, w1, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
          createTreemapRect(svg, svgNS, sortedItems[1], treemapX + w1 + innerPadding, treemapY, w2, treemapH, getColor(sortedItems[1].type, sortedItems[1]));
          createTreemapRect(svg, svgNS, sortedItems[2], treemapX + w1 + w2 + (innerPadding * 2), treemapY, w3, treemapH, getColor(sortedItems[2].type, sortedItems[2]));
        } else {
          const availableHeight = treemapH - (innerPadding * 2); // To gaps mellom tre bokser
          let h1 = Math.max(minHeight1, availableHeight * ratio1);
          let h2 = Math.max(minHeight2, availableHeight * ratio2);
          let h3 = availableHeight - h1 - h2;
          
          // Juster hvis noen blir for smale
          if (h1 < minHeight1) {
            h1 = minHeight1;
            h3 = availableHeight - h1 - h2;
          }
          if (h2 < minHeight2) {
            h2 = minHeight2;
            h3 = availableHeight - h1 - h2;
          }
          if (h3 < minHeight3) {
            h3 = minHeight3;
            // Omfordel de to første proporsjonalt
            const remaining = availableHeight - h3;
            h1 = remaining * ratio1 / (ratio1 + ratio2);
            h2 = remaining * ratio2 / (ratio1 + ratio2);
          }
          
          createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, h1, getColor(sortedItems[0].type, sortedItems[0]));
          createTreemapRect(svg, svgNS, sortedItems[1], treemapX, treemapY + h1 + innerPadding, treemapW, h2, getColor(sortedItems[1].type, sortedItems[1]));
          createTreemapRect(svg, svgNS, sortedItems[2], treemapX, treemapY + h1 + h2 + (innerPadding * 2), treemapW, h3, getColor(sortedItems[2].type, sortedItems[2]));
        }
      }
    }
    return;
  }
  
  // For flere elementer, bruk forbedret squarified algoritme med mer variasjon
  function squarify(items, row, x, y, w, h) {
    if (items.length === 0) {
      if (row.length > 0) {
        layoutRow(row, x, y, w, h);
      }
      return;
    }
    
    const item = items[0];
    const newRow = [...row, item];
    const remainingItems = items.slice(1);
    
    // Bruk weight (square root scaled) i stedet for original value
    const totalWeight = newRow.reduce((sum, item) => sum + item.weight, 0);
    // ALWAYS split along longest axis (squarified rule)
    const isHorizontal = w >= h; // Split vertically if width > height, horizontally if height > width
    const totalArea = w * h;
    const newRowArea = (totalWeight / totalAllItems) * totalArea;
    
    // Beregn worst aspect ratio - men tillat mer variasjon
    let worstRatio;
    if (isHorizontal) {
      const rowHeight = newRowArea / w;
      const maxW = Math.max(...newRow.map(item => (item.weight / totalWeight) * w));
      const minW = Math.min(...newRow.map(item => (item.weight / totalWeight) * w));
      worstRatio = Math.max(maxW / rowHeight, rowHeight / minW);
    } else {
      const rowWidth = newRowArea / h;
      const maxH = Math.max(...newRow.map(item => (item.weight / totalWeight) * h));
      const minH = Math.min(...newRow.map(item => (item.weight / totalWeight) * h));
      worstRatio = Math.max(maxH / rowWidth, rowWidth / minH);
    }
    
    // Beregn worst ratio for eksisterende rad
    let oldWorstRatio = Infinity;
    if (row.length > 0) {
      const oldTotalWeight = row.reduce((sum, item) => sum + item.weight, 0);
      const oldRowArea = (oldTotalWeight / totalAllItems) * totalArea;
      
      if (isHorizontal) {
        const oldRowHeight = oldRowArea / w;
        const oldMaxW = Math.max(...row.map(item => (item.weight / oldTotalWeight) * w));
        const oldMinW = Math.min(...row.map(item => (item.weight / oldTotalWeight) * w));
        oldWorstRatio = Math.max(oldMaxW / oldRowHeight, oldRowHeight / oldMinW);
      } else {
        const oldRowWidth = oldRowArea / h;
        const oldMaxH = Math.max(...row.map(item => (item.weight / oldTotalWeight) * h));
        const oldMinH = Math.min(...row.map(item => (item.weight / oldTotalWeight) * h));
        oldWorstRatio = Math.max(oldMaxH / oldRowWidth, oldRowWidth / oldMinH);
      }
    }
    
    // Forbedret logikk: Legg ut rad tidligere for å få mer variasjon
    // Bruk en mer tolerant threshold - tillat litt dårligere aspect ratio for mer variasjon
    const tolerance = 1.3; // Tillat opp til 30% dårligere aspect ratio før vi legger ut rad
    
    if (worstRatio <= oldWorstRatio * tolerance || row.length === 0) {
      // Fortsett å bygge opp raden hvis aspect ratio er akseptabel
      squarify(remainingItems, newRow, x, y, w, h);
    } else {
      // Layout eksisterende rad først - dette skaper mer variasjon
      const oldTotalWeight = row.reduce((sum, item) => sum + item.weight, 0);
      const oldRowArea = (oldTotalWeight / totalAllItems) * totalArea;
      
      if (w >= h) {
        const rowHeight = oldRowArea / w;
        layoutRow(row, x, y, w, rowHeight);
        squarify(items, [], x, y + rowHeight, w, h - rowHeight);
      } else {
        const rowWidth = oldRowArea / h;
        layoutRow(row, x, y, rowWidth, h);
        squarify(items, [], x + rowWidth, y, w - rowWidth, h);
      }
    }
  }
  
  // Hjelpefunksjon for å beregne minimum størrelse basert på tekst
  function calculateMinSizeForItem(item, isWidth) {
    const label = item.label || "";
    const value = formatNOK(item.value);
    
    if (isWidth) {
      // For bredde: beregn faktisk tekstbredde + venstre- og høyremarg
      const labelWidth = label.length * 14 * 0.7; // Bold tekst
      const valueWidth = value.length * 13 * 0.6; // Normal tekst
      const maxTextWidth = Math.max(labelWidth, valueWidth);
      
      // Venstre- og høyremarg: minimum 12px på hver side (totalt 24px)
      const horizontalMargin = 24;
      
      // Minimum størrelse: tekstbredde + marger, minimum 150px
      return Math.max(150, maxTextWidth + horizontalMargin);
    } else {
      // For høyde: label (14px) + spacing (10px) + value (13px) + top/bottom margin (12px hver = 24px)
      return Math.max(60, 14 + 10 + 13 + 24);
    }
  }
  
  function layoutRow(row, x, y, w, h) {
    // Bruk layoutValue for beregninger, ikke originalValue
    const totalLayoutValue = row.reduce((sum, item) => sum + (item.layoutValue || item.value), 0);
    if (totalLayoutValue === 0) return;
    
    const isHorizontal = w >= h;
    const totalSize = isHorizontal ? w : h;
    
    // Beregn minimum størrelser for alle elementer i raden (basert på tekstlengde)
    const minSizes = row.map(item => calculateMinSizeForItem(item, isHorizontal));
    
    // START MED PROPORSJONELLE STØRRELser basert på layoutValue
    const propSizes = row.map(item => {
      const layoutVal = item.layoutValue || item.value;
      return totalSize * (layoutVal / totalLayoutValue);
    });
    
    // Start med proporsjonelle størrelser
    let sizes = [...propSizes];
    
    // Sørg for at alle har minimum størrelse, men behold proporsjonell variasjon
    sizes = sizes.map((size, i) => Math.max(size, minSizes[i]));
    
    // Identifiser små vs store bokser (små = mindre enn 40% av gjennomsnittlig størrelse)
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    const smallThreshold = avgSize * 0.4;
    const isSmall = sizes.map(size => size < smallThreshold);
    
    // Beregn total størrelse uten overlapping
    let totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
    
    // Hvis totalen overstiger tilgjengelig plass, juster ned proporsjonelt
    // MEN: Minimum størrelser skal ALDRI skaleres ned
    if (totalWithoutOverlap > totalSize) {
      const overflow = totalWithoutOverlap - totalSize;
      const excessPerItem = sizes.map((size, i) => Math.max(0, size - minSizes[i]));
      const totalExcess = excessPerItem.reduce((sum, s) => sum + s, 0);
      
      if (totalExcess > 0) {
        // Reduser proporsjonelt fra elementer som har mer enn minimum
        const reductionFactor = Math.min(1, overflow / totalExcess);
        sizes = sizes.map((size, i) => {
          const excess = excessPerItem[i];
          return Math.max(minSizes[i], size - (excess * reductionFactor));
        });
        totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
      } else {
        // Alle er på minimum - aksepter overlapping
        sizes = [...minSizes];
        totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
      }
    }
    
    // ABSOLUTT FINAL SJEKK: Aldri la noen boks være mindre enn minimum
    sizes = sizes.map((size, i) => Math.max(size, minSizes[i]));
    
    // Strategi: Store bokser får spacing, små bokser kan overlappe
    const innerPadding = 2;
    const largeBoxes = [];
    const smallBoxes = [];
    
    row.forEach((item, index) => {
      if (isSmall[index]) {
        smallBoxes.push({ item, index, size: sizes[index] });
      } else {
        largeBoxes.push({ item, index, size: sizes[index] });
      }
    });
    
    // Legg ut store bokser først - de skal fylle hele området
    const largeBoxesPositions = [];
    let currentPos = isHorizontal ? x : y;
    const numLargeGaps = Math.max(0, largeBoxes.length - 1);
    const totalLargeSize = largeBoxes.reduce((sum, box) => sum + box.size, 0);
    const totalLargePadding = numLargeGaps * innerPadding;
    const availableForLarge = totalSize - totalLargePadding;
    
    // Beregn proporsjonell fordeling av store bokser for å fylle hele området
    // Store bokser skal alltid fylle hele tilgjengelig plass
    const scaleFactor = availableForLarge > 0 ? availableForLarge / totalLargeSize : 1;
    
    largeBoxes.forEach((box, boxIndex) => {
      const scaledSize = box.size * scaleFactor;
      const pos = {
        item: box.item,
        x: isHorizontal ? currentPos : x,
        y: isHorizontal ? y : currentPos,
        width: isHorizontal ? scaledSize : w,
        height: isHorizontal ? h : scaledSize,
        size: scaledSize
      };
      largeBoxesPositions.push(pos);
      currentPos += scaledSize + (boxIndex < largeBoxes.length - 1 ? innerPadding : 0);
    });
    
    // Sørg for at siste stor boks fyller resten av området (hvis det er plass igjen)
    if (largeBoxesPositions.length > 0) {
      const lastLarge = largeBoxesPositions[largeBoxesPositions.length - 1];
      const endPos = isHorizontal ? (x + totalSize) : (y + totalSize);
      const currentEnd = isHorizontal ? (lastLarge.x + lastLarge.width) : (lastLarge.y + lastLarge.height);
      const remaining = endPos - currentEnd;
      
      if (remaining > 0) {
        // Utvid siste stor boks for å fylle resten
      if (isHorizontal) {
          lastLarge.width += remaining;
      } else {
          lastLarge.height += remaining;
        }
      }
    }
    
    // Legg ut store bokser (de legges til SVG først, så de er under små bokser)
    largeBoxesPositions.forEach(pos => {
      createTreemapRect(svg, svgNS, pos.item, pos.x, pos.y, pos.width, pos.height, getColor(pos.item.type, pos.item));
    });
    
    // Først: Plasser små bokser i resterende ledig plass (ikke overlapp)
    // Deretter: Plasser små bokser som overlapper store bokser
    const unplacedSmallBoxes = [];
    let currentSmallPos = isHorizontal ? x : y;
    
    // Beregn hvor store bokser slutter
    const lastLargePos = largeBoxesPositions.length > 0 ? largeBoxesPositions[largeBoxesPositions.length - 1] : null;
    const largeBoxesEnd = lastLargePos ? (isHorizontal ? (lastLargePos.x + lastLargePos.width) : (lastLargePos.y + lastLargePos.height)) : (isHorizontal ? x : y);
    const totalEnd = isHorizontal ? (x + totalSize) : (y + totalSize);
    const remainingSpace = totalEnd - largeBoxesEnd;
    
    // Plasser små bokser i resterende ledig plass først
    smallBoxes.forEach((smallBox) => {
      const smallSize = smallBox.size;
      let placed = false;
      
      // Prøv å plassere i resterende ledig plass
      if (remainingSpace > 0 && currentSmallPos + smallSize <= totalEnd) {
        const availableSpace = totalEnd - currentSmallPos;
        if (availableSpace >= smallSize) {
          if (isHorizontal) {
            createTreemapRect(svg, svgNS, smallBox.item, currentSmallPos, y, smallSize, h, getColor(smallBox.item.type, smallBox.item));
            currentSmallPos += smallSize + innerPadding;
            placed = true;
          } else {
            createTreemapRect(svg, svgNS, smallBox.item, x, currentSmallPos, w, smallSize, getColor(smallBox.item.type, smallBox.item));
            currentSmallPos += smallSize + innerPadding;
            placed = true;
          }
        }
      }
      
      if (!placed) {
        unplacedSmallBoxes.push(smallBox);
      }
    });
    
    // Plasser gjenværende små bokser som overlapper store bokser
    unplacedSmallBoxes.forEach((smallBox) => {
      const smallSize = smallBox.size;
      let placed = false;
      
      // Prøv å plassere små bokser på store bokser
      for (let i = 0; i < largeBoxesPositions.length && !placed; i++) {
        const largePos = largeBoxesPositions[i];
        const largeArea = largePos.width * largePos.height;
        const smallArea = isHorizontal ? (smallSize * h) : (w * smallSize);
        
        // Bare overlapp hvis liten boks er betydelig mindre enn stor boks
        if (smallArea < largeArea * 0.3) {
          // Plasser i hjørne eller langs kant av stor boks
          let smallX, smallY;
          
          if (isHorizontal) {
            // Horisontal layout: plasser i høyre hjørne eller langs høyre kant
            const margin = 4;
            const smallHeight = Math.min(h * 0.6, largePos.height - margin * 2);
            smallX = largePos.x + largePos.width - smallSize - margin;
            smallY = largePos.y + margin;
            // Sjekk om det passer
            if (smallX >= largePos.x && smallY + smallHeight <= largePos.y + largePos.height) {
              createTreemapRect(svg, svgNS, smallBox.item, smallX, smallY, smallSize, smallHeight, getColor(smallBox.item.type, smallBox.item));
              placed = true;
            }
          } else {
            // Vertikal layout: plasser i bunnhjørne eller langs bunnkant
            const margin = 4;
            const smallWidth = Math.min(w * 0.6, largePos.width - margin * 2);
            smallX = largePos.x + margin;
            smallY = largePos.y + largePos.height - smallSize - margin;
            // Sjekk om det passer
            if (smallY >= largePos.y && smallX + smallWidth <= largePos.x + largePos.width) {
              createTreemapRect(svg, svgNS, smallBox.item, smallX, smallY, smallWidth, smallSize, getColor(smallBox.item.type, smallBox.item));
              placed = true;
            }
          }
        }
      }
      
      // Hvis fortsatt ikke plassert, overlapp første stor boks
      if (!placed && largeBoxesPositions.length > 0) {
        const firstLarge = largeBoxesPositions[0];
        const margin = 4;
        if (isHorizontal) {
          const smallHeight = Math.min(h * 0.6, firstLarge.height - margin * 2);
          createTreemapRect(svg, svgNS, smallBox.item, firstLarge.x + firstLarge.width - smallSize - margin, firstLarge.y + margin, smallSize, smallHeight, getColor(smallBox.item.type, smallBox.item));
        } else {
          const smallWidth = Math.min(w * 0.6, firstLarge.width - margin * 2);
          createTreemapRect(svg, svgNS, smallBox.item, firstLarge.x + margin, firstLarge.y + firstLarge.height - smallSize - margin, smallWidth, smallSize, getColor(smallBox.item.type, smallBox.item));
        }
      }
    });
  }
  
  squarify(sortedItems, [], treemapX, treemapY, treemapW, treemapH);
}

// Hjelpefunksjon for å lage et treemap rektangel
function createTreemapRect(svg, svgNS, item, x, y, width, height, color) {
  // Lag rektangel med avrundede hjørner (radius ~4px)
  const rect = document.createElementNS(svgNS, "rect");
  rect.setAttribute("x", String(Math.round(x)));
  rect.setAttribute("y", String(Math.round(y)));
  rect.setAttribute("width", String(Math.round(width)));
  rect.setAttribute("height", String(Math.round(height)));
  rect.setAttribute("rx", "4");
  rect.setAttribute("ry", "4");
  rect.setAttribute("fill", color);
  rect.setAttribute("stroke", "#FFFFFF");
  rect.setAttribute("stroke-width", "1"); // Tynn kantlinje
  rect.setAttribute("opacity", "0.9");
  svg.appendChild(rect);
  
  // Adaptiv innholdsplassering basert på boksens fysiske dimensjoner
  // All innhold skal være sentrert
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  // Bruk originalValue (faktisk verdi) for visning, ikke layoutValue
  const displayValue = item.originalValue !== undefined ? item.originalValue : item.value;
  const formattedValue = formatNOK(displayValue);
  const label = item.label || "";
  
  // Scenario A: Standard (Stor nok boks) - høyde ≥ 45px OG bredde ≥ 40px
  // Layout: To linjer (Kategorinavn + Verdi)
  const isScenarioA = height >= 45 && width >= 40;
  
  // Scenario B: Liggende stripe (Lav men bred) - bredde > 50px, men ikke Scenario A
  // Layout: Én linje ("Kategorinavn: Verdi")
  const isScenarioB = width > 50 && !isScenarioA;
  
  // Scenario C: Minimal boks (Fallback) - alle andre tilfeller
  // Layout: Én linje (Vis kun navn, hvis navnet er for langt vis kun verdi)
  
  let labelFontSize, valueFontSize, labelY, valueY, displayText;
  
  if (isScenarioA) {
    // Scenario A: To linjer
    labelFontSize = "14";
    valueFontSize = "13";
    labelY = centerY - 12; // Label over sentrum
    valueY = centerY + 12; // Verdi under sentrum
    displayText = null; // Bruk separate label og value
  } else if (isScenarioB) {
    // Scenario B: Én linje "Kategorinavn: Verdi"
    labelFontSize = "12";
    valueFontSize = "12";
    labelY = centerY;
    valueY = centerY;
    displayText = `${label}: ${formattedValue}`;
  } else {
    // Scenario C: Én linje (navn eller verdi)
    labelFontSize = "10";
    valueFontSize = "10";
    labelY = centerY;
    valueY = centerY;
    
    // Sjekk om navnet passer i bredden
    const horizontalMargin = 12; // 12px på hver side
    const availableWidth = width - (horizontalMargin * 2);
    const charWidth = parseFloat(labelFontSize) * 0.7; // Estimert tegnbredde
    const maxChars = Math.floor(availableWidth / charWidth);
    
    if (label.length <= maxChars && maxChars > 3) {
      displayText = label; // Vis kun navn
    } else {
      displayText = formattedValue; // Vis kun verdi
    }
  }
  
  // Render tekst basert på scenario
  const horizontalMargin = 12; // 12px på hver side
  const availableWidth = width - (horizontalMargin * 2);
  
  if (isScenarioA) {
    // Scenario A: To separate linjer (Kategorinavn + Verdi)
    // Trunker label hvis nødvendig
    let displayLabel = label;
    const labelCharWidth = parseFloat(labelFontSize) * 0.7;
  const maxLabelChars = Math.floor(availableWidth / labelCharWidth);
  if (displayLabel.length > maxLabelChars && maxLabelChars > 3) {
    displayLabel = displayLabel.substring(0, maxLabelChars - 3) + "...";
  }
  
    // Trunker verdi hvis nødvendig
    let displayValueText = formattedValue;
    const valueCharWidth = parseFloat(valueFontSize) * 0.6;
  const maxValueChars = Math.floor(availableWidth / valueCharWidth);
    if (displayValueText.length > maxValueChars && maxValueChars > 3) {
    // Prøv kortere format først
      const numValue = displayValue; // Bruk nummerisk verdi
    if (numValue >= 1000000) {
        displayValueText = (numValue / 1000000).toFixed(1) + " MNOK";
        if (displayValueText.length > maxValueChars && maxValueChars > 3) {
          displayValueText = displayValueText.substring(0, maxValueChars - 3) + "...";
      }
    } else if (numValue >= 1000) {
        displayValueText = (numValue / 1000).toFixed(0) + " kNOK";
        if (displayValueText.length > maxValueChars && maxValueChars > 3) {
          displayValueText = displayValueText.substring(0, maxValueChars - 3) + "...";
        }
      } else if (displayValueText.length > maxValueChars && maxValueChars > 3) {
        displayValueText = displayValueText.substring(0, maxValueChars - 3) + "...";
      }
    }
    
    // Render label med svart/grå tekst
    const labelText = document.createElementNS(svgNS, "text");
    labelText.setAttribute("x", String(Math.round(centerX)));
    labelText.setAttribute("y", String(Math.round(labelY)));
    labelText.setAttribute("text-anchor", "middle");
    labelText.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    labelText.setAttribute("font-size", labelFontSize);
    labelText.setAttribute("font-weight", "700");
    labelText.setAttribute("fill", "#1C2A3A"); // Mørk grå/svart for bedre kontrast
    labelText.textContent = displayLabel;
    svg.appendChild(labelText);
    
    // Render verdi med svart/grå tekst
    const valueText = document.createElementNS(svgNS, "text");
    valueText.setAttribute("x", String(Math.round(centerX)));
    valueText.setAttribute("y", String(Math.round(valueY)));
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    valueText.setAttribute("font-size", valueFontSize);
    valueText.setAttribute("font-weight", "600");
    valueText.setAttribute("fill", "#334155"); // Mørk grå for verditekst
    valueText.textContent = displayValueText;
    svg.appendChild(valueText);
  } else if (isScenarioB || displayText !== null) {
    // Scenario B eller C: Én linje
    // Trunker tekst hvis nødvendig
    let finalDisplayText = displayText;
    const charWidth = parseFloat(labelFontSize) * 0.7;
    const maxChars = Math.floor(availableWidth / charWidth);
    if (finalDisplayText.length > maxChars && maxChars > 3) {
      finalDisplayText = finalDisplayText.substring(0, maxChars - 3) + "...";
    }
    
    const singleText = document.createElementNS(svgNS, "text");
    singleText.setAttribute("x", String(Math.round(centerX)));
    singleText.setAttribute("y", String(Math.round(centerY)));
    singleText.setAttribute("text-anchor", "middle");
    singleText.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    singleText.setAttribute("font-size", labelFontSize);
    singleText.setAttribute("font-weight", isScenarioB ? "600" : "600");
    singleText.setAttribute("fill", "#334155"); // Mørk grå for bedre kontrast
    singleText.textContent = finalDisplayText;
    svg.appendChild(singleText);
  }
  
  return rect;
}

// --- Treemap for Eiendeler (Treemap-fanen) ---
function renderAssetsTreemap(svg, x, y, width, height, svgNS, yearVal = 2026) {
  // Beregn eiendeler for det valgte året (samme som T-Konto-fanen)
  const assetProjections = computeAssetProjection(yearVal);
  const assets = AppState.assets || [];
  
  // Beregn total eiendeler
  const totalAssets = assetProjections.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Lagre eiendeler-verdi i AppState
  AppState.treemapValues.assets = totalAssets;
  
  // Bruk samme standardfarger som T-konto-fanen
  // Konverter eiendeler til treemap items med farge basert på navn/type
  // Bruk projiserte verdier for det valgte året
  const allItems = assetProjections
    .map((projection, idx) => {
      const asset = assets[idx];
      return {
        id: asset?.id || String(idx),
        label: projection.key || asset?.name || `Eiendel ${idx + 1}`,
        value: projection.value || 0,
      type: 'asset',
        color: projection.color || getAssetColorByName(projection.key, asset?.assetType, asset) // Bruk standardfarger basert på navn/type
      };
    })
    .filter(item => item.value > 0); // Filtrer etter at vi har laget items med farge
  
  // Beregn total for å normalisere størrelser
  const total = allItems.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0 || allItems.length === 0) {
    // Vis tomt tilbud hvis ingen data
    const emptyText = document.createElementNS(svgNS, "text");
    emptyText.setAttribute("x", String(x + width / 2));
    emptyText.setAttribute("y", String(y + height / 2));
    emptyText.setAttribute("text-anchor", "middle");
    emptyText.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    emptyText.setAttribute("font-size", "14");
    emptyText.setAttribute("fill", "#8A98A7");
    emptyText.textContent = "Ingen eiendeler";
    svg.appendChild(emptyText);
    return;
  }
  
  // Padding for treemap - Outer: 6px, Inner: 2px (handled in createTreemapRect)
  const outerPadding = 6;
  const treemapX = x + outerPadding;
  const treemapY = y + outerPadding;
  const treemapW = width - outerPadding * 2;
  const treemapH = height - outerPadding * 2;
  
  // VIKTIG: Minimum Rule - LayoutVerdi = MAX(FaktiskVerdi, 130)
  // For å garantere at ingen bokser blir for små til å vise innhold
  const transformedItems = allItems.map(item => ({
    ...item,
    originalValue: item.value, // Faktisk verdi fra datagrunnlaget
    layoutValue: Math.max(item.value, 130), // Layout-verdi med minimum 130
    weight: Math.pow(Math.max(item.value, 130), 0.5) // Square root scaling på layout-verdi
  }));
  
  // Sorter items etter størrelse (største først) - "Puzzle Effect"
  const sortedItems = [...transformedItems].sort((a, b) => b.originalValue - a.originalValue);
  
  // Beregn total weight (ikke original value) for layout
  const totalWeight = sortedItems.reduce((sum, item) => sum + item.weight, 0);
  
  // Farge-funksjon som bruker fargene direkte fra item
  const getColor = (type, item) => {
    if (type === 'asset') {
      // Bruk farge som allerede er satt på item (basert på navn/type)
      return item.color || "#7FAAF6";
    }
    return '#94a3b8';
  };
  
  // Hjelpefunksjon for å beregne minimum størrelse basert på tekst (for eiendeler)
  function calculateMinSizeForItem(item, isWidth) {
    const label = item.label || "";
    const value = formatNOK(item.originalValue || item.value);
    
    if (isWidth) {
      // For bredde: beregn faktisk tekstbredde + venstre- og høyremarg
      // Bold tekst med font-size 14px: ca 0.7 * font-size per tegn for uppercase/tall
      // Normal tekst med font-size 13px: ca 0.6 * font-size per tegn
      const labelWidth = label.length * 14 * 0.7; // Bold tekst
      const valueWidth = value.length * 13 * 0.6; // Normal tekst
      const maxTextWidth = Math.max(labelWidth, valueWidth);
      
      // Venstre- og høyremarg: minimum 12px på hver side (totalt 24px)
      const horizontalMargin = 24;
      
      // Minimum størrelse: tekstbredde + marger, minimum 150px
      return Math.max(150, maxTextWidth + horizontalMargin);
    } else {
      // For høyde: label (14px) + spacing (10px) + value (13px) + top/bottom margin (12px hver = 24px)
      return Math.max(60, 14 + 10 + 13 + 24);
    }
  }
  
  // Forbedret treemap layout som håndterer ulike størrelser bedre
  const totalAllItems = totalWeight; // Bruk totalWeight i stedet
  if (totalAllItems === 0) return;
  
  // Spesialhåndtering for få elementer (3 eller færre) - bruk weight for proporsjoner
  if (sortedItems.length <= 3) {
    // Beregn minimum størrelser for alle elementer
    const minWidths = sortedItems.map(item => calculateMinSizeForItem(item, true));
    const minHeights = sortedItems.map(item => calculateMinSizeForItem(item, false));
    const maxMinWidth = Math.max(...minWidths);
    const maxMinHeight = Math.max(...minHeights);
    
    // Minimum størrelse basert på tekst eller 15% av minste side
    const minSize = Math.max(
      Math.min(treemapW, treemapH) * 0.15,
      Math.max(maxMinWidth, maxMinHeight)
    );
    
    if (sortedItems.length === 1) {
      createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
    } else if (sortedItems.length === 2) {
      const ratio1 = sortedItems[0].weight / totalAllItems;
      const ratio2 = sortedItems[1].weight / totalAllItems;
      const isHorizontal = treemapW >= treemapH;
      const innerPadding = 2; // Inner padding mellom bokser
      
      // Beregn minimum størrelser for begge elementer
      const minWidth1 = calculateMinSizeForItem(sortedItems[0], true);
      const minWidth2 = calculateMinSizeForItem(sortedItems[1], true);
      const minHeight1 = calculateMinSizeForItem(sortedItems[0], false);
      const minHeight2 = calculateMinSizeForItem(sortedItems[1], false);
      
      if (isHorizontal) {
        const availableWidth = treemapW - innerPadding;
        let w1 = Math.max(minWidth1, availableWidth * ratio1);
        let w2 = availableWidth - w1;
        
        // Sørg for at begge har minimum bredde
        if (w1 < minWidth1) {
          w1 = minWidth1;
          w2 = availableWidth - w1;
        }
        if (w2 < minWidth2) {
          w2 = minWidth2;
          w1 = availableWidth - w2;
        }
        
        createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, w1, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
        createTreemapRect(svg, svgNS, sortedItems[1], treemapX + w1 + innerPadding, treemapY, w2, treemapH, getColor(sortedItems[1].type, sortedItems[1]));
      } else {
        const availableHeight = treemapH - innerPadding;
        let h1 = Math.max(minHeight1, availableHeight * ratio1);
        let h2 = availableHeight - h1;
        
        // Sørg for at begge har minimum høyde
        if (h1 < minHeight1) {
          h1 = minHeight1;
          h2 = availableHeight - h1;
        }
        if (h2 < minHeight2) {
          h2 = minHeight2;
          h1 = availableHeight - h2;
        }
        
        createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, h1, getColor(sortedItems[0].type, sortedItems[0]));
        createTreemapRect(svg, svgNS, sortedItems[1], treemapX, treemapY + h1 + innerPadding, treemapW, h2, getColor(sortedItems[1].type, sortedItems[1]));
      }
    } else if (sortedItems.length === 3) {
      // For 3 elementer: stor øverst (tar hele bredden), to mindre nederst ved siden av hverandre
      const ratio1 = sortedItems[0].weight / totalAllItems;
      const ratio2 = sortedItems[1].weight / totalAllItems;
      const ratio3 = sortedItems[2].weight / totalAllItems;
      const innerPadding = 2; // Inner padding mellom bokser
      
      // Sjekk om det minste elementet er mye mindre (mindre enn 30% av summen av de to andre)
      const minRatio = Math.min(ratio1, ratio2, ratio3);
      const maxTwoRatio = Math.max(ratio1 + ratio2, ratio1 + ratio3, ratio2 + ratio3);
      const isOneMuchSmaller = minRatio < maxTwoRatio * 0.3;
      
      if (isOneMuchSmaller) {
        // Layout: stor øverst, to mindre nederst
        // Identifiser hvilken som er minst
        const ratios = [ratio1, ratio2, ratio3];
        const minIndex = ratios.indexOf(minRatio);
        const topIndex = minIndex === 0 ? (ratio2 > ratio3 ? 1 : 2) : (minIndex === 1 ? (ratio1 > ratio3 ? 0 : 2) : (ratio1 > ratio2 ? 0 : 1));
        const bottomLeftIndex = topIndex === 0 ? (minIndex === 1 ? 2 : 1) : (topIndex === 1 ? (minIndex === 0 ? 2 : 0) : (minIndex === 0 ? 1 : 0));
        const bottomRightIndex = minIndex;
        
        // Toppboks tar ca 60-70% av høyden
        const topRatio = sortedItems[topIndex].weight / (sortedItems[topIndex].weight + sortedItems[bottomLeftIndex].weight + sortedItems[bottomRightIndex].weight);
        const availableHeight = treemapH - innerPadding; // Reserver plass for spacing
        const topHeight = Math.max(availableHeight * 0.6, availableHeight * topRatio);
        const bottomHeight = availableHeight - topHeight;
        
        // Toppboks - tar hele bredden
        createTreemapRect(svg, svgNS, sortedItems[topIndex], treemapX, treemapY, treemapW, topHeight, getColor(sortedItems[topIndex].type, sortedItems[topIndex]));
        
        // To nederste bokser - deler bredden basert på proporsjoner, men sørg for minimum størrelse
        const bottomTotal = sortedItems[bottomLeftIndex].weight + sortedItems[bottomRightIndex].weight;
        const bottomLeftMinWidth = calculateMinSizeForItem(sortedItems[bottomLeftIndex], true);
        const bottomRightMinWidth = calculateMinSizeForItem(sortedItems[bottomRightIndex], true);
        const totalMinWidth = bottomLeftMinWidth + bottomRightMinWidth;
        const availableBottomWidth = treemapW - innerPadding; // Reserver plass for spacing
        
        let bottomLeftWidth = availableBottomWidth * (sortedItems[bottomLeftIndex].weight / bottomTotal);
        let bottomRightWidth = availableBottomWidth - bottomLeftWidth;
        
        // Juster hvis noen blir for smale
        if (bottomLeftWidth < bottomLeftMinWidth) {
          bottomLeftWidth = bottomLeftMinWidth;
          bottomRightWidth = availableBottomWidth - bottomLeftWidth;
        }
        if (bottomRightWidth < bottomRightMinWidth) {
          bottomRightWidth = bottomRightMinWidth;
          bottomLeftWidth = availableBottomWidth - bottomRightWidth;
        }
        
        // Hvis total min-width er større enn tilgjengelig bredde, skaler proporsjonalt
        if (totalMinWidth > availableBottomWidth) {
          const scale = availableBottomWidth / totalMinWidth;
          bottomLeftWidth = bottomLeftMinWidth * scale;
          bottomRightWidth = bottomRightMinWidth * scale;
        }
        
        const bottomY = treemapY + topHeight + innerPadding;
        createTreemapRect(svg, svgNS, sortedItems[bottomLeftIndex], treemapX, bottomY, bottomLeftWidth, bottomHeight, getColor(sortedItems[bottomLeftIndex].type, sortedItems[bottomLeftIndex]));
        createTreemapRect(svg, svgNS, sortedItems[bottomRightIndex], treemapX + bottomLeftWidth + innerPadding, bottomY, bottomRightWidth, bottomHeight, getColor(sortedItems[bottomRightIndex].type, sortedItems[bottomRightIndex]));
      } else {
        // Alle tre er omtrent like store - bruk standard layout
        const isHorizontal = treemapW >= treemapH;
        
        // Beregn minimum størrelser for alle tre elementer
        const minWidth1 = calculateMinSizeForItem(sortedItems[0], true);
        const minWidth2 = calculateMinSizeForItem(sortedItems[1], true);
        const minWidth3 = calculateMinSizeForItem(sortedItems[2], true);
        const minHeight1 = calculateMinSizeForItem(sortedItems[0], false);
        const minHeight2 = calculateMinSizeForItem(sortedItems[1], false);
        const minHeight3 = calculateMinSizeForItem(sortedItems[2], false);
        
        if (isHorizontal) {
          const availableWidth = treemapW - (innerPadding * 2); // To gaps mellom tre bokser
          let w1 = Math.max(minWidth1, availableWidth * ratio1);
          let w2 = Math.max(minWidth2, availableWidth * ratio2);
          let w3 = availableWidth - w1 - w2;
          
          // Juster hvis noen blir for smale
          if (w1 < minWidth1) {
            w1 = minWidth1;
            w3 = availableWidth - w1 - w2;
          }
          if (w2 < minWidth2) {
            w2 = minWidth2;
            w3 = availableWidth - w1 - w2;
          }
          if (w3 < minWidth3) {
            w3 = minWidth3;
            // Omfordel de to første proporsjonalt
            const remaining = availableWidth - w3;
            w1 = remaining * ratio1 / (ratio1 + ratio2);
            w2 = remaining * ratio2 / (ratio1 + ratio2);
          }
          
          createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, w1, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
          createTreemapRect(svg, svgNS, sortedItems[1], treemapX + w1 + innerPadding, treemapY, w2, treemapH, getColor(sortedItems[1].type, sortedItems[1]));
          createTreemapRect(svg, svgNS, sortedItems[2], treemapX + w1 + w2 + (innerPadding * 2), treemapY, w3, treemapH, getColor(sortedItems[2].type, sortedItems[2]));
        } else {
          const availableHeight = treemapH - (innerPadding * 2); // To gaps mellom tre bokser
          let h1 = Math.max(minHeight1, availableHeight * ratio1);
          let h2 = Math.max(minHeight2, availableHeight * ratio2);
          let h3 = availableHeight - h1 - h2;
          
          // Juster hvis noen blir for smale
          if (h1 < minHeight1) {
            h1 = minHeight1;
            h3 = availableHeight - h1 - h2;
          }
          if (h2 < minHeight2) {
            h2 = minHeight2;
            h3 = availableHeight - h1 - h2;
          }
          if (h3 < minHeight3) {
            h3 = minHeight3;
            // Omfordel de to første proporsjonalt
            const remaining = availableHeight - h3;
            h1 = remaining * ratio1 / (ratio1 + ratio2);
            h2 = remaining * ratio2 / (ratio1 + ratio2);
          }
          
          createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, h1, getColor(sortedItems[0].type, sortedItems[0]));
          createTreemapRect(svg, svgNS, sortedItems[1], treemapX, treemapY + h1 + innerPadding, treemapW, h2, getColor(sortedItems[1].type, sortedItems[1]));
          createTreemapRect(svg, svgNS, sortedItems[2], treemapX, treemapY + h1 + h2 + (innerPadding * 2), treemapW, h3, getColor(sortedItems[2].type, sortedItems[2]));
        }
      }
    }
    return;
  }
  
  // For flere elementer, bruk forbedret squarified algoritme med mer variasjon
  function squarify(items, row, x, y, w, h) {
    if (items.length === 0) {
      if (row.length > 0) {
        layoutRow(row, x, y, w, h);
      }
      return;
    }
    
    const item = items[0];
    const newRow = [...row, item];
    const remainingItems = items.slice(1);
    
    // Bruk weight (square root scaled) i stedet for original value
    const totalWeight = newRow.reduce((sum, item) => sum + item.weight, 0);
    // ALWAYS split along longest axis (squarified rule)
    const isHorizontal = w >= h; // Split vertically if width > height, horizontally if height > width
    const totalArea = w * h;
    const newRowArea = (totalWeight / totalAllItems) * totalArea;
    
    // Beregn worst aspect ratio - men tillat mer variasjon
    let worstRatio;
    if (isHorizontal) {
      const rowHeight = newRowArea / w;
      const maxW = Math.max(...newRow.map(item => (item.weight / totalWeight) * w));
      const minW = Math.min(...newRow.map(item => (item.weight / totalWeight) * w));
      worstRatio = Math.max(maxW / rowHeight, rowHeight / minW);
    } else {
      const rowWidth = newRowArea / h;
      const maxH = Math.max(...newRow.map(item => (item.weight / totalWeight) * h));
      const minH = Math.min(...newRow.map(item => (item.weight / totalWeight) * h));
      worstRatio = Math.max(maxH / rowWidth, rowWidth / minH);
    }
    
    // Beregn worst ratio for eksisterende rad
    let oldWorstRatio = Infinity;
    if (row.length > 0) {
      const oldTotalWeight = row.reduce((sum, item) => sum + item.weight, 0);
      const oldRowArea = (oldTotalWeight / totalAllItems) * totalArea;
      
      if (isHorizontal) {
        const oldRowHeight = oldRowArea / w;
        const oldMaxW = Math.max(...row.map(item => (item.weight / oldTotalWeight) * w));
        const oldMinW = Math.min(...row.map(item => (item.weight / oldTotalWeight) * w));
        oldWorstRatio = Math.max(oldMaxW / oldRowHeight, oldRowHeight / oldMinW);
      } else {
        const oldRowWidth = oldRowArea / h;
        const oldMaxH = Math.max(...row.map(item => (item.weight / oldTotalWeight) * h));
        const oldMinH = Math.min(...row.map(item => (item.weight / oldTotalWeight) * h));
        oldWorstRatio = Math.max(oldMaxH / oldRowWidth, oldRowWidth / oldMinH);
      }
    }
    
    // Forbedret logikk: Legg ut rad tidligere for å få mer variasjon
    // Bruk en mer tolerant threshold - tillat litt dårligere aspect ratio for mer variasjon
    const tolerance = 1.3; // Tillat opp til 30% dårligere aspect ratio før vi legger ut rad
    
    if (worstRatio <= oldWorstRatio * tolerance || row.length === 0) {
      // Fortsett å bygge opp raden hvis aspect ratio er akseptabel
      squarify(remainingItems, newRow, x, y, w, h);
    } else {
      // Layout eksisterende rad først - dette skaper mer variasjon
      const oldTotalWeight = row.reduce((sum, item) => sum + item.weight, 0);
      const oldRowArea = (oldTotalWeight / totalAllItems) * totalArea;
      
      if (w >= h) {
        const rowHeight = oldRowArea / w;
        layoutRow(row, x, y, w, rowHeight);
        squarify(items, [], x, y + rowHeight, w, h - rowHeight);
      } else {
        const rowWidth = oldRowArea / h;
        layoutRow(row, x, y, rowWidth, h);
        squarify(items, [], x + rowWidth, y, w - rowWidth, h);
      }
    }
  }
  
  // Hjelpefunksjon for å beregne minimum størrelse basert på tekst (for eiendeler)
  function calculateMinSizeForItem(item, isWidth) {
    const label = item.label || "";
    const value = formatNOK(item.originalValue || item.value);
    
    if (isWidth) {
      // For bredde: beregn faktisk tekstbredde + venstre- og høyremarg
      // Bold tekst med font-size 14px: ca 0.7 * font-size per tegn for uppercase/tall
      // Normal tekst med font-size 13px: ca 0.6 * font-size per tegn
      const labelWidth = label.length * 14 * 0.7; // Bold tekst
      const valueWidth = value.length * 13 * 0.6; // Normal tekst
      const maxTextWidth = Math.max(labelWidth, valueWidth);
      
      // Venstre- og høyremarg: minimum 12px på hver side (totalt 24px)
      const horizontalMargin = 24;
      
      // Minimum størrelse: tekstbredde + marger, minimum 150px
      return Math.max(150, maxTextWidth + horizontalMargin);
    } else {
      // For høyde: label (14px) + spacing (10px) + value (13px) + top/bottom margin (12px hver = 24px)
      return Math.max(60, 14 + 10 + 13 + 24);
    }
  }
  
  function layoutRow(row, x, y, w, h) {
    // Bruk layoutValue for beregninger, ikke originalValue
    const totalLayoutValue = row.reduce((sum, item) => sum + (item.layoutValue || item.value), 0);
    if (totalLayoutValue === 0) return;
    
    const isHorizontal = w >= h;
    const totalSize = isHorizontal ? w : h;
    
    // Beregn minimum størrelser for alle elementer i raden (basert på tekstlengde)
    const minSizes = row.map(item => calculateMinSizeForItem(item, isHorizontal));
    
    // START MED PROPORSJONELLE STØRRELser basert på layoutValue
    const propSizes = row.map(item => {
      const layoutVal = item.layoutValue || item.value;
      return totalSize * (layoutVal / totalLayoutValue);
    });
    
    // Start med proporsjonelle størrelser
    let sizes = [...propSizes];
    
    // Sørg for at alle har minimum størrelse, men behold proporsjonell variasjon
    sizes = sizes.map((size, i) => Math.max(size, minSizes[i]));
    
    // Identifiser små vs store bokser (små = mindre enn 40% av gjennomsnittlig størrelse)
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    const smallThreshold = avgSize * 0.4;
    const isSmall = sizes.map(size => size < smallThreshold);
    
    // Beregn total størrelse uten overlapping
    let totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
    
    // Hvis totalen overstiger tilgjengelig plass, juster ned proporsjonelt
    // MEN: Minimum størrelser skal ALDRI skaleres ned
    if (totalWithoutOverlap > totalSize) {
      const overflow = totalWithoutOverlap - totalSize;
      const excessPerItem = sizes.map((size, i) => Math.max(0, size - minSizes[i]));
      const totalExcess = excessPerItem.reduce((sum, s) => sum + s, 0);
      
      if (totalExcess > 0) {
        // Reduser proporsjonelt fra elementer som har mer enn minimum
        const reductionFactor = Math.min(1, overflow / totalExcess);
        sizes = sizes.map((size, i) => {
          const excess = excessPerItem[i];
          return Math.max(minSizes[i], size - (excess * reductionFactor));
        });
        totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
      } else {
        // Alle er på minimum - aksepter overlapping
        sizes = [...minSizes];
        totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
      }
    }
    
    // ABSOLUTT FINAL SJEKK: Aldri la noen boks være mindre enn minimum
    sizes = sizes.map((size, i) => Math.max(size, minSizes[i]));
    
    // Strategi: Store bokser får spacing, små bokser kan overlappe
    const innerPadding = 2;
    const largeBoxes = [];
    const smallBoxes = [];
    
    row.forEach((item, index) => {
      if (isSmall[index]) {
        smallBoxes.push({ item, index, size: sizes[index] });
      } else {
        largeBoxes.push({ item, index, size: sizes[index] });
      }
    });
    
    // Legg ut store bokser først - de skal fylle hele området
    const largeBoxesPositions = [];
    let currentPos = isHorizontal ? x : y;
    const numLargeGaps = Math.max(0, largeBoxes.length - 1);
    const totalLargeSize = largeBoxes.reduce((sum, box) => sum + box.size, 0);
    const totalLargePadding = numLargeGaps * innerPadding;
    const availableForLarge = totalSize - totalLargePadding;
    
    // Beregn proporsjonell fordeling av store bokser for å fylle hele området
    // Store bokser skal alltid fylle hele tilgjengelig plass
    const scaleFactor = availableForLarge > 0 ? availableForLarge / totalLargeSize : 1;
    
    largeBoxes.forEach((box, boxIndex) => {
      const scaledSize = box.size * scaleFactor;
      const pos = {
        item: box.item,
        x: isHorizontal ? currentPos : x,
        y: isHorizontal ? y : currentPos,
        width: isHorizontal ? scaledSize : w,
        height: isHorizontal ? h : scaledSize,
        size: scaledSize
      };
      largeBoxesPositions.push(pos);
      currentPos += scaledSize + (boxIndex < largeBoxes.length - 1 ? innerPadding : 0);
    });
    
    // Sørg for at siste stor boks fyller resten av området (hvis det er plass igjen)
    if (largeBoxesPositions.length > 0) {
      const lastLarge = largeBoxesPositions[largeBoxesPositions.length - 1];
      const endPos = isHorizontal ? (x + totalSize) : (y + totalSize);
      const currentEnd = isHorizontal ? (lastLarge.x + lastLarge.width) : (lastLarge.y + lastLarge.height);
      const remaining = endPos - currentEnd;
      
      if (remaining > 0) {
        // Utvid siste stor boks for å fylle resten
        if (isHorizontal) {
          lastLarge.width += remaining;
        } else {
          lastLarge.height += remaining;
        }
      }
    }
    
    // Legg ut store bokser (de legges til SVG først, så de er under små bokser)
    largeBoxesPositions.forEach(pos => {
      createTreemapRect(svg, svgNS, pos.item, pos.x, pos.y, pos.width, pos.height, getColor(pos.item.type, pos.item));
    });
    
    // Først: Plasser små bokser i resterende ledig plass (ikke overlapp)
    // Deretter: Plasser små bokser som overlapper store bokser
    const unplacedSmallBoxes = [];
    let currentSmallPos = isHorizontal ? x : y;
    
    // Beregn hvor store bokser slutter
    const lastLargePos = largeBoxesPositions.length > 0 ? largeBoxesPositions[largeBoxesPositions.length - 1] : null;
    const largeBoxesEnd = lastLargePos ? (isHorizontal ? (lastLargePos.x + lastLargePos.width) : (lastLargePos.y + lastLargePos.height)) : (isHorizontal ? x : y);
    const totalEnd = isHorizontal ? (x + totalSize) : (y + totalSize);
    const remainingSpace = totalEnd - largeBoxesEnd;
    
    // Plasser små bokser i resterende ledig plass først
    smallBoxes.forEach((smallBox) => {
      const smallSize = smallBox.size;
      let placed = false;
      
      // Prøv å plassere i resterende ledig plass
      if (remainingSpace > 0 && currentSmallPos + smallSize <= totalEnd) {
        const availableSpace = totalEnd - currentSmallPos;
        if (availableSpace >= smallSize) {
          if (isHorizontal) {
            createTreemapRect(svg, svgNS, smallBox.item, currentSmallPos, y, smallSize, h, getColor(smallBox.item.type, smallBox.item));
            currentSmallPos += smallSize + innerPadding;
            placed = true;
          } else {
            createTreemapRect(svg, svgNS, smallBox.item, x, currentSmallPos, w, smallSize, getColor(smallBox.item.type, smallBox.item));
            currentSmallPos += smallSize + innerPadding;
            placed = true;
          }
        }
      }
      
      if (!placed) {
        unplacedSmallBoxes.push(smallBox);
      }
    });
    
    // Plasser gjenværende små bokser som overlapper store bokser
    unplacedSmallBoxes.forEach((smallBox) => {
      const smallSize = smallBox.size;
      let placed = false;
      
      // Prøv å plassere små bokser på store bokser
      for (let i = 0; i < largeBoxesPositions.length && !placed; i++) {
        const largePos = largeBoxesPositions[i];
        const largeArea = largePos.width * largePos.height;
        const smallArea = isHorizontal ? (smallSize * h) : (w * smallSize);
        
        // Bare overlapp hvis liten boks er betydelig mindre enn stor boks
        if (smallArea < largeArea * 0.3) {
          // Plasser i hjørne eller langs kant av stor boks
          let smallX, smallY;
          
          if (isHorizontal) {
            // Horisontal layout: plasser i høyre hjørne eller langs høyre kant
            const margin = 4;
            const smallHeight = Math.min(h * 0.6, largePos.height - margin * 2);
            smallX = largePos.x + largePos.width - smallSize - margin;
            smallY = largePos.y + margin;
            // Sjekk om det passer
            if (smallX >= largePos.x && smallY + smallHeight <= largePos.y + largePos.height) {
              createTreemapRect(svg, svgNS, smallBox.item, smallX, smallY, smallSize, smallHeight, getColor(smallBox.item.type, smallBox.item));
              placed = true;
            }
          } else {
            // Vertikal layout: plasser i bunnhjørne eller langs bunnkant
            const margin = 4;
            const smallWidth = Math.min(w * 0.6, largePos.width - margin * 2);
            smallX = largePos.x + margin;
            smallY = largePos.y + largePos.height - smallSize - margin;
            // Sjekk om det passer
            if (smallY >= largePos.y && smallX + smallWidth <= largePos.x + largePos.width) {
              createTreemapRect(svg, svgNS, smallBox.item, smallX, smallY, smallWidth, smallSize, getColor(smallBox.item.type, smallBox.item));
              placed = true;
            }
          }
        }
      }
      
      // Hvis fortsatt ikke plassert, overlapp første stor boks
      if (!placed && largeBoxesPositions.length > 0) {
        const firstLarge = largeBoxesPositions[0];
        const margin = 4;
        if (isHorizontal) {
          const smallHeight = Math.min(h * 0.6, firstLarge.height - margin * 2);
          createTreemapRect(svg, svgNS, smallBox.item, firstLarge.x + firstLarge.width - smallSize - margin, firstLarge.y + margin, smallSize, smallHeight, getColor(smallBox.item.type, smallBox.item));
        } else {
          const smallWidth = Math.min(w * 0.6, firstLarge.width - margin * 2);
          createTreemapRect(svg, svgNS, smallBox.item, firstLarge.x + margin, firstLarge.y + firstLarge.height - smallSize - margin, smallWidth, smallSize, getColor(smallBox.item.type, smallBox.item));
        }
      }
    });
  }
  
  squarify(sortedItems, [], treemapX, treemapY, treemapW, treemapH);
}

// --- Treemap for Gjeld og Egenkapital (Treemap-fanen) ---
function renderDebtEquityTreemap(svg, x, y, width, height, svgNS, yearVal = 2026) {
  // Beregn gjeld og egenkapital for det valgte året (samme som T-Konto-fanen)
  const debts = AppState.debts || [];
  
  // Beregn total eiendeler for det valgte året
  const assetProjections = computeAssetProjection(yearVal);
  const totalAssets = assetProjections.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Beregn gjenværende gjeld for det valgte året
  const remDebt = remainingDebtTotalForYear(yearVal);
  const debtVal = Math.min(remDebt, totalAssets);
  const equityVal = Math.max(0, totalAssets - debtVal);
  
  // Lagre gjeld og egenkapital-verdier i AppState
  AppState.treemapValues.debts = debtVal;
  AppState.treemapValues.equity = equityVal;
  
  // Konverter gjeld til treemap items
  const debtItems = [];
  if (debts.length === 1) {
    // Hvis kun én gjeldspost
    if (debtVal > 0) {
      debtItems.push({
        id: debts[0].id || String(Math.random()),
        label: "Gjeld",
        value: debtVal,
        type: 'debt',
        color: "#FCA5A5"
      });
    }
  } else if (debts.length > 1) {
    // Hvis flere gjeldsposter, beregn andel for hver gjeldspost basert på gjeldende år (samme som T-Konto)
    const debtScale = ["#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C"]; // Rødskala
    const totalRemDebt = remDebt;
    debts.forEach((debt, idx) => {
      if (totalRemDebt > 0) {
        const remForDebt = remainingBalanceForDebtInYear(debt, yearVal);
        const debtProportion = remForDebt / totalRemDebt;
        const debtAmount = Math.min(debtVal * debtProportion, debtVal);
        if (debtAmount > 0) {
          debtItems.push({
            id: debt.id || String(Math.random()),
            label: String(debt.name || `Gjeld ${idx + 1}`),
            value: debtAmount,
            type: 'debt',
            color: debtScale[idx % debtScale.length]
          });
        }
      }
    });
  }
  
  // Legg til egenkapital
  const equityItem = equityVal > 0 ? [{
    id: "equity",
    label: "Egenkapital",
    value: equityVal,
    type: 'equity',
    color: "#86EFAC" // Grønn farge for egenkapital
  }] : [];
  
  // Kombiner gjeld og egenkapital
  const allItems = [...debtItems, ...equityItem];
  
  // Beregn total for å normalisere størrelser
  const total = allItems.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0 || allItems.length === 0) {
    // Vis tomt tilbud hvis ingen data
    const emptyText = document.createElementNS(svgNS, "text");
    emptyText.setAttribute("x", String(x + width / 2));
    emptyText.setAttribute("y", String(y + height / 2));
    emptyText.setAttribute("text-anchor", "middle");
    emptyText.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    emptyText.setAttribute("font-size", "14");
    emptyText.setAttribute("fill", "#8A98A7");
    emptyText.textContent = "Ingen gjeld eller egenkapital";
    svg.appendChild(emptyText);
    return;
  }
  
  // Padding for treemap - Outer: 6px, Inner: 2px (handled in createTreemapRect)
  const outerPadding = 6;
  const treemapX = x + outerPadding;
  const treemapY = y + outerPadding;
  const treemapW = width - outerPadding * 2;
  const treemapH = height - outerPadding * 2;
  
  // VIKTIG: Minimum Rule - LayoutVerdi = MAX(FaktiskVerdi, 130)
  // For å garantere at ingen bokser blir for små til å vise innhold
  const transformedItems = allItems.map(item => ({
    ...item,
    originalValue: item.value, // Faktisk verdi fra datagrunnlaget
    layoutValue: Math.max(item.value, 130), // Layout-verdi med minimum 130
    weight: Math.pow(Math.max(item.value, 130), 0.5) // Square root scaling på layout-verdi
  }));
  
  // Sorter items etter størrelse (største først) - "Puzzle Effect"
  const sortedItems = [...transformedItems].sort((a, b) => b.originalValue - a.originalValue);
  
  // Beregn total weight (ikke original value) for layout
  const totalWeight = sortedItems.reduce((sum, item) => sum + item.weight, 0);
  
  // Farge-funksjon som bruker fargene direkte fra item
  const getColor = (type, item) => {
    if (type === 'debt') {
      return item.color || "#FCA5A5";
    } else if (type === 'equity') {
      return item.color || "#86EFAC";
    }
    return '#94a3b8';
  };
  
  // Hjelpefunksjon for å beregne minimum størrelse basert på tekst (for gjeld/egenkapital)
  function calculateMinSizeForItem(item, isWidth) {
    const label = item.label || "";
    const value = formatNOK(item.originalValue || item.value);
    
    if (isWidth) {
      // For bredde: beregn faktisk tekstbredde + venstre- og høyremarg
      const labelWidth = label.length * 14 * 0.7; // Bold tekst
      const valueWidth = value.length * 13 * 0.6; // Normal tekst
      const maxTextWidth = Math.max(labelWidth, valueWidth);
      
      // Venstre- og høyremarg: minimum 12px på hver side (totalt 24px)
      const horizontalMargin = 24;
      
      // Minimum størrelse: tekstbredde + marger, minimum 150px
      return Math.max(150, maxTextWidth + horizontalMargin);
    } else {
      // For høyde: label (14px) + spacing (10px) + value (13px) + top/bottom margin (12px hver = 24px)
      return Math.max(60, 14 + 10 + 13 + 24);
    }
  }
  
  // Forbedret treemap layout som håndterer ulike størrelser bedre
  const totalAllItems = totalWeight; // Bruk totalWeight i stedet
  if (totalAllItems === 0) return;
  
  // Spesialhåndtering for få elementer (3 eller færre) - bruk weight for proporsjoner
  if (sortedItems.length <= 3) {
    // Beregn minimum størrelser for alle elementer
    const minWidths = sortedItems.map(item => calculateMinSizeForItem(item, true));
    const minHeights = sortedItems.map(item => calculateMinSizeForItem(item, false));
    const maxMinWidth = Math.max(...minWidths);
    const maxMinHeight = Math.max(...minHeights);
    
    // Minimum størrelse basert på tekst eller 15% av minste side
    const minSize = Math.max(
      Math.min(treemapW, treemapH) * 0.15,
      Math.max(maxMinWidth, maxMinHeight)
    );
    
    if (sortedItems.length === 1) {
      createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
    } else if (sortedItems.length === 2) {
      const ratio1 = sortedItems[0].weight / totalAllItems;
      const ratio2 = sortedItems[1].weight / totalAllItems;
      const isHorizontal = treemapW >= treemapH;
      const innerPadding = 2; // Inner padding mellom bokser
      
      // Beregn minimum størrelser for begge elementer
      const minWidth1 = calculateMinSizeForItem(sortedItems[0], true);
      const minWidth2 = calculateMinSizeForItem(sortedItems[1], true);
      const minHeight1 = calculateMinSizeForItem(sortedItems[0], false);
      const minHeight2 = calculateMinSizeForItem(sortedItems[1], false);
      
      if (isHorizontal) {
        const availableWidth = treemapW - innerPadding;
        let w1 = Math.max(minWidth1, availableWidth * ratio1);
        let w2 = availableWidth - w1;
        
        // Sørg for at begge har minimum bredde
        if (w1 < minWidth1) {
          w1 = minWidth1;
          w2 = availableWidth - w1;
        }
        if (w2 < minWidth2) {
          w2 = minWidth2;
          w1 = availableWidth - w2;
        }
        
        createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, w1, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
        createTreemapRect(svg, svgNS, sortedItems[1], treemapX + w1 + innerPadding, treemapY, w2, treemapH, getColor(sortedItems[1].type, sortedItems[1]));
      } else {
        const availableHeight = treemapH - innerPadding;
        let h1 = Math.max(minHeight1, availableHeight * ratio1);
        let h2 = availableHeight - h1;
        
        // Sørg for at begge har minimum høyde
        if (h1 < minHeight1) {
          h1 = minHeight1;
          h2 = availableHeight - h1;
        }
        if (h2 < minHeight2) {
          h2 = minHeight2;
          h1 = availableHeight - h2;
        }
        
        createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, h1, getColor(sortedItems[0].type, sortedItems[0]));
        createTreemapRect(svg, svgNS, sortedItems[1], treemapX, treemapY + h1 + innerPadding, treemapW, h2, getColor(sortedItems[1].type, sortedItems[1]));
      }
    } else if (sortedItems.length === 3) {
      // For 3 elementer: stor øverst (tar hele bredden), to mindre nederst ved siden av hverandre
      const ratio1 = sortedItems[0].weight / totalAllItems;
      const ratio2 = sortedItems[1].weight / totalAllItems;
      const ratio3 = sortedItems[2].weight / totalAllItems;
      const innerPadding = 2; // Inner padding mellom bokser
      
      // Sjekk om det minste elementet er mye mindre (mindre enn 30% av summen av de to andre)
      const minRatio = Math.min(ratio1, ratio2, ratio3);
      const maxTwoRatio = Math.max(ratio1 + ratio2, ratio1 + ratio3, ratio2 + ratio3);
      const isOneMuchSmaller = minRatio < maxTwoRatio * 0.3;
      
      if (isOneMuchSmaller) {
        // Layout: stor øverst, to mindre nederst
        // Identifiser hvilken som er minst
        const ratios = [ratio1, ratio2, ratio3];
        const minIndex = ratios.indexOf(minRatio);
        const topIndex = minIndex === 0 ? (ratio2 > ratio3 ? 1 : 2) : (minIndex === 1 ? (ratio1 > ratio3 ? 0 : 2) : (ratio1 > ratio2 ? 0 : 1));
        const bottomLeftIndex = topIndex === 0 ? (minIndex === 1 ? 2 : 1) : (topIndex === 1 ? (minIndex === 0 ? 2 : 0) : (minIndex === 0 ? 1 : 0));
        const bottomRightIndex = minIndex;
        
        // Toppboks tar ca 60-70% av høyden
        const availableHeight = treemapH - innerPadding; // Reserver plass for spacing
        const topRatio = sortedItems[topIndex].weight / (sortedItems[topIndex].weight + sortedItems[bottomLeftIndex].weight + sortedItems[bottomRightIndex].weight);
        const topHeight = Math.max(availableHeight * 0.6, availableHeight * topRatio);
        const bottomHeight = availableHeight - topHeight;
        
        // Toppboks - tar hele bredden
        createTreemapRect(svg, svgNS, sortedItems[topIndex], treemapX, treemapY, treemapW, topHeight, getColor(sortedItems[topIndex].type, sortedItems[topIndex]));
        
        // To nederste bokser - deler bredden basert på proporsjoner, men sørg for minimum størrelse
        const bottomTotal = sortedItems[bottomLeftIndex].weight + sortedItems[bottomRightIndex].weight;
        const bottomLeftMinWidth = calculateMinSizeForItem(sortedItems[bottomLeftIndex], true);
        const bottomRightMinWidth = calculateMinSizeForItem(sortedItems[bottomRightIndex], true);
        const totalMinWidth = bottomLeftMinWidth + bottomRightMinWidth;
        const availableBottomWidth = treemapW - innerPadding; // Reserver plass for spacing
        
        let bottomLeftWidth = availableBottomWidth * (sortedItems[bottomLeftIndex].weight / bottomTotal);
        let bottomRightWidth = availableBottomWidth - bottomLeftWidth;
        
        // Juster hvis noen blir for smale
        if (bottomLeftWidth < bottomLeftMinWidth) {
          bottomLeftWidth = bottomLeftMinWidth;
          bottomRightWidth = availableBottomWidth - bottomLeftWidth;
        }
        if (bottomRightWidth < bottomRightMinWidth) {
          bottomRightWidth = bottomRightMinWidth;
          bottomLeftWidth = availableBottomWidth - bottomRightWidth;
        }
        
        // Hvis total min-width er større enn tilgjengelig bredde, skaler proporsjonalt
        if (totalMinWidth > availableBottomWidth) {
          const scale = availableBottomWidth / totalMinWidth;
          bottomLeftWidth = bottomLeftMinWidth * scale;
          bottomRightWidth = bottomRightMinWidth * scale;
        }
        
        const bottomY = treemapY + topHeight + innerPadding;
        createTreemapRect(svg, svgNS, sortedItems[bottomLeftIndex], treemapX, bottomY, bottomLeftWidth, bottomHeight, getColor(sortedItems[bottomLeftIndex].type, sortedItems[bottomLeftIndex]));
        createTreemapRect(svg, svgNS, sortedItems[bottomRightIndex], treemapX + bottomLeftWidth + innerPadding, bottomY, bottomRightWidth, bottomHeight, getColor(sortedItems[bottomRightIndex].type, sortedItems[bottomRightIndex]));
      } else {
        // Alle tre er omtrent like store - bruk standard layout
        const isHorizontal = treemapW >= treemapH;
        
        // Beregn minimum størrelser for alle tre elementer
        const minWidth1 = calculateMinSizeForItem(sortedItems[0], true);
        const minWidth2 = calculateMinSizeForItem(sortedItems[1], true);
        const minWidth3 = calculateMinSizeForItem(sortedItems[2], true);
        const minHeight1 = calculateMinSizeForItem(sortedItems[0], false);
        const minHeight2 = calculateMinSizeForItem(sortedItems[1], false);
        const minHeight3 = calculateMinSizeForItem(sortedItems[2], false);
        
        if (isHorizontal) {
          const availableWidth = treemapW - (innerPadding * 2); // To gaps mellom tre bokser
          let w1 = Math.max(minWidth1, availableWidth * ratio1);
          let w2 = Math.max(minWidth2, availableWidth * ratio2);
          let w3 = availableWidth - w1 - w2;
          
          // Juster hvis noen blir for smale
          if (w1 < minWidth1) {
            w1 = minWidth1;
            w3 = availableWidth - w1 - w2;
          }
          if (w2 < minWidth2) {
            w2 = minWidth2;
            w3 = availableWidth - w1 - w2;
          }
          if (w3 < minWidth3) {
            w3 = minWidth3;
            // Omfordel de to første proporsjonalt
            const remaining = availableWidth - w3;
            w1 = remaining * ratio1 / (ratio1 + ratio2);
            w2 = remaining * ratio2 / (ratio1 + ratio2);
          }
          
          createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, w1, treemapH, getColor(sortedItems[0].type, sortedItems[0]));
          createTreemapRect(svg, svgNS, sortedItems[1], treemapX + w1 + innerPadding, treemapY, w2, treemapH, getColor(sortedItems[1].type, sortedItems[1]));
          createTreemapRect(svg, svgNS, sortedItems[2], treemapX + w1 + w2 + (innerPadding * 2), treemapY, w3, treemapH, getColor(sortedItems[2].type, sortedItems[2]));
        } else {
          const availableHeight = treemapH - (innerPadding * 2); // To gaps mellom tre bokser
          let h1 = Math.max(minHeight1, availableHeight * ratio1);
          let h2 = Math.max(minHeight2, availableHeight * ratio2);
          let h3 = availableHeight - h1 - h2;
          
          // Juster hvis noen blir for smale
          if (h1 < minHeight1) {
            h1 = minHeight1;
            h3 = availableHeight - h1 - h2;
          }
          if (h2 < minHeight2) {
            h2 = minHeight2;
            h3 = availableHeight - h1 - h2;
          }
          if (h3 < minHeight3) {
            h3 = minHeight3;
            // Omfordel de to første proporsjonalt
            const remaining = availableHeight - h3;
            h1 = remaining * ratio1 / (ratio1 + ratio2);
            h2 = remaining * ratio2 / (ratio1 + ratio2);
          }
          
          createTreemapRect(svg, svgNS, sortedItems[0], treemapX, treemapY, treemapW, h1, getColor(sortedItems[0].type, sortedItems[0]));
          createTreemapRect(svg, svgNS, sortedItems[1], treemapX, treemapY + h1 + innerPadding, treemapW, h2, getColor(sortedItems[1].type, sortedItems[1]));
          createTreemapRect(svg, svgNS, sortedItems[2], treemapX, treemapY + h1 + h2 + (innerPadding * 2), treemapW, h3, getColor(sortedItems[2].type, sortedItems[2]));
        }
      }
    }
    return;
  }
  
  // For flere elementer, bruk forbedret squarified algoritme med mer variasjon
  function squarify(items, row, x, y, w, h) {
    if (items.length === 0) {
      if (row.length > 0) {
        layoutRow(row, x, y, w, h);
      }
      return;
    }
    
    const item = items[0];
    const newRow = [...row, item];
    const remainingItems = items.slice(1);
    
    // Bruk weight (square root scaled) i stedet for original value
    const totalWeight = newRow.reduce((sum, item) => sum + item.weight, 0);
    // ALWAYS split along longest axis (squarified rule)
    const isHorizontal = w >= h; // Split vertically if width > height, horizontally if height > width
    const totalArea = w * h;
    const newRowArea = (totalWeight / totalAllItems) * totalArea;
    
    // Beregn worst aspect ratio - men tillat mer variasjon
    let worstRatio;
    if (isHorizontal) {
      const rowHeight = newRowArea / w;
      const maxW = Math.max(...newRow.map(item => (item.weight / totalWeight) * w));
      const minW = Math.min(...newRow.map(item => (item.weight / totalWeight) * w));
      worstRatio = Math.max(maxW / rowHeight, rowHeight / minW);
    } else {
      const rowWidth = newRowArea / h;
      const maxH = Math.max(...newRow.map(item => (item.weight / totalWeight) * h));
      const minH = Math.min(...newRow.map(item => (item.weight / totalWeight) * h));
      worstRatio = Math.max(maxH / rowWidth, rowWidth / minH);
    }
    
    // Beregn worst ratio for eksisterende rad
    let oldWorstRatio = Infinity;
    if (row.length > 0) {
      const oldTotalWeight = row.reduce((sum, item) => sum + item.weight, 0);
      const oldRowArea = (oldTotalWeight / totalAllItems) * totalArea;
      
      if (isHorizontal) {
        const oldRowHeight = oldRowArea / w;
        const oldMaxW = Math.max(...row.map(item => (item.weight / oldTotalWeight) * w));
        const oldMinW = Math.min(...row.map(item => (item.weight / oldTotalWeight) * w));
        oldWorstRatio = Math.max(oldMaxW / oldRowHeight, oldRowHeight / oldMinW);
      } else {
        const oldRowWidth = oldRowArea / h;
        const oldMaxH = Math.max(...row.map(item => (item.weight / oldTotalWeight) * h));
        const oldMinH = Math.min(...row.map(item => (item.weight / oldTotalWeight) * h));
        oldWorstRatio = Math.max(oldMaxH / oldRowWidth, oldRowWidth / oldMinH);
      }
    }
    
    // Forbedret logikk: Legg ut rad tidligere for å få mer variasjon
    // Bruk en mer tolerant threshold - tillat litt dårligere aspect ratio for mer variasjon
    const tolerance = 1.3; // Tillat opp til 30% dårligere aspect ratio før vi legger ut rad
    
    if (worstRatio <= oldWorstRatio * tolerance || row.length === 0) {
      // Fortsett å bygge opp raden hvis aspect ratio er akseptabel
      squarify(remainingItems, newRow, x, y, w, h);
    } else {
      // Layout eksisterende rad først - dette skaper mer variasjon
      const oldTotalWeight = row.reduce((sum, item) => sum + item.weight, 0);
      const oldRowArea = (oldTotalWeight / totalAllItems) * totalArea;
      
      if (w >= h) {
        const rowHeight = oldRowArea / w;
        layoutRow(row, x, y, w, rowHeight);
        squarify(items, [], x, y + rowHeight, w, h - rowHeight);
      } else {
        const rowWidth = oldRowArea / h;
        layoutRow(row, x, y, rowWidth, h);
        squarify(items, [], x + rowWidth, y, w - rowWidth, h);
      }
    }
  }
  
  // Hjelpefunksjon for å beregne minimum størrelse basert på tekst (for gjeld/egenkapital)
  function calculateMinSizeForItem(item, isWidth) {
    const label = item.label || "";
    const value = formatNOK(item.originalValue || item.value);
    
    if (isWidth) {
      // For bredde: beregn faktisk tekstbredde + venstre- og høyremarg
      const labelWidth = label.length * 14 * 0.7; // Bold tekst
      const valueWidth = value.length * 13 * 0.6; // Normal tekst
      const maxTextWidth = Math.max(labelWidth, valueWidth);
      
      // Venstre- og høyremarg: minimum 12px på hver side (totalt 24px)
      const horizontalMargin = 24;
      
      // Minimum størrelse: tekstbredde + marger, minimum 150px
      return Math.max(150, maxTextWidth + horizontalMargin);
    } else {
      // For høyde: label (14px) + spacing (10px) + value (13px) + top/bottom margin (12px hver = 24px)
      return Math.max(60, 14 + 10 + 13 + 24);
    }
  }
  
  function layoutRow(row, x, y, w, h) {
    // Bruk layoutValue for beregninger, ikke originalValue
    const totalLayoutValue = row.reduce((sum, item) => sum + (item.layoutValue || item.value), 0);
    if (totalLayoutValue === 0) return;
    
    const isHorizontal = w >= h;
    const totalSize = isHorizontal ? w : h;
    
    // Beregn minimum størrelser for alle elementer i raden (basert på tekstlengde)
    const minSizes = row.map(item => calculateMinSizeForItem(item, isHorizontal));
    
    // START MED PROPORSJONELLE STØRRELser basert på layoutValue
    const propSizes = row.map(item => {
      const layoutVal = item.layoutValue || item.value;
      return totalSize * (layoutVal / totalLayoutValue);
    });
    
    // Start med proporsjonelle størrelser
    let sizes = [...propSizes];
    
    // Sørg for at alle har minimum størrelse, men behold proporsjonell variasjon
    sizes = sizes.map((size, i) => Math.max(size, minSizes[i]));
    
    // Identifiser små vs store bokser (små = mindre enn 40% av gjennomsnittlig størrelse)
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    const smallThreshold = avgSize * 0.4;
    const isSmall = sizes.map(size => size < smallThreshold);
    
    // Beregn total størrelse uten overlapping
    let totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
    
    // Hvis totalen overstiger tilgjengelig plass, juster ned proporsjonelt
    // MEN: Minimum størrelser skal ALDRI skaleres ned
    if (totalWithoutOverlap > totalSize) {
      const overflow = totalWithoutOverlap - totalSize;
      const excessPerItem = sizes.map((size, i) => Math.max(0, size - minSizes[i]));
      const totalExcess = excessPerItem.reduce((sum, s) => sum + s, 0);
      
      if (totalExcess > 0) {
        // Reduser proporsjonelt fra elementer som har mer enn minimum
        const reductionFactor = Math.min(1, overflow / totalExcess);
      sizes = sizes.map((size, i) => {
          const excess = excessPerItem[i];
          return Math.max(minSizes[i], size - (excess * reductionFactor));
        });
        totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
      } else {
        // Alle er på minimum - aksepter overlapping
        sizes = [...minSizes];
        totalWithoutOverlap = sizes.reduce((sum, s) => sum + s, 0);
      }
    }
    
    // ABSOLUTT FINAL SJEKK: Aldri la noen boks være mindre enn minimum
    sizes = sizes.map((size, i) => Math.max(size, minSizes[i]));
    
    // Strategi: Store bokser får spacing, små bokser kan overlappe
    const innerPadding = 2;
    const largeBoxes = [];
    const smallBoxes = [];
    
    row.forEach((item, index) => {
      if (isSmall[index]) {
        smallBoxes.push({ item, index, size: sizes[index] });
      } else {
        largeBoxes.push({ item, index, size: sizes[index] });
      }
    });
    
    // Legg ut store bokser først - de skal fylle hele området
    const largeBoxesPositions = [];
    let currentPos = isHorizontal ? x : y;
    const numLargeGaps = Math.max(0, largeBoxes.length - 1);
    const totalLargeSize = largeBoxes.reduce((sum, box) => sum + box.size, 0);
    const totalLargePadding = numLargeGaps * innerPadding;
    const availableForLarge = totalSize - totalLargePadding;
    
    // Beregn proporsjonell fordeling av store bokser for å fylle hele området
    // Store bokser skal alltid fylle hele tilgjengelig plass
    const scaleFactor = availableForLarge > 0 ? availableForLarge / totalLargeSize : 1;
    
    largeBoxes.forEach((box, boxIndex) => {
      const scaledSize = box.size * scaleFactor;
      const pos = {
        item: box.item,
        x: isHorizontal ? currentPos : x,
        y: isHorizontal ? y : currentPos,
        width: isHorizontal ? scaledSize : w,
        height: isHorizontal ? h : scaledSize,
        size: scaledSize
      };
      largeBoxesPositions.push(pos);
      currentPos += scaledSize + (boxIndex < largeBoxes.length - 1 ? innerPadding : 0);
    });
    
    // Sørg for at siste stor boks fyller resten av området (hvis det er plass igjen)
    if (largeBoxesPositions.length > 0) {
      const lastLarge = largeBoxesPositions[largeBoxesPositions.length - 1];
      const endPos = isHorizontal ? (x + totalSize) : (y + totalSize);
      const currentEnd = isHorizontal ? (lastLarge.x + lastLarge.width) : (lastLarge.y + lastLarge.height);
      const remaining = endPos - currentEnd;
      
      if (remaining > 0) {
        // Utvid siste stor boks for å fylle resten
      if (isHorizontal) {
          lastLarge.width += remaining;
      } else {
          lastLarge.height += remaining;
        }
      }
    }
    
    // Legg ut store bokser (de legges til SVG først, så de er under små bokser)
    largeBoxesPositions.forEach(pos => {
      createTreemapRect(svg, svgNS, pos.item, pos.x, pos.y, pos.width, pos.height, getColor(pos.item.type, pos.item));
    });
    
    // Først: Plasser små bokser i resterende ledig plass (ikke overlapp)
    // Deretter: Plasser små bokser som overlapper store bokser
    const unplacedSmallBoxes = [];
    let currentSmallPos = isHorizontal ? x : y;
    
    // Beregn hvor store bokser slutter
    const lastLargePos = largeBoxesPositions.length > 0 ? largeBoxesPositions[largeBoxesPositions.length - 1] : null;
    const largeBoxesEnd = lastLargePos ? (isHorizontal ? (lastLargePos.x + lastLargePos.width) : (lastLargePos.y + lastLargePos.height)) : (isHorizontal ? x : y);
    const totalEnd = isHorizontal ? (x + totalSize) : (y + totalSize);
    const remainingSpace = totalEnd - largeBoxesEnd;
    
    // Plasser små bokser i resterende ledig plass først
    smallBoxes.forEach((smallBox) => {
      const smallSize = smallBox.size;
      let placed = false;
      
      // Prøv å plassere i resterende ledig plass
      if (remainingSpace > 0 && currentSmallPos + smallSize <= totalEnd) {
        const availableSpace = totalEnd - currentSmallPos;
        if (availableSpace >= smallSize) {
          if (isHorizontal) {
            createTreemapRect(svg, svgNS, smallBox.item, currentSmallPos, y, smallSize, h, getColor(smallBox.item.type, smallBox.item));
            currentSmallPos += smallSize + innerPadding;
            placed = true;
          } else {
            createTreemapRect(svg, svgNS, smallBox.item, x, currentSmallPos, w, smallSize, getColor(smallBox.item.type, smallBox.item));
            currentSmallPos += smallSize + innerPadding;
            placed = true;
          }
        }
      }
      
      if (!placed) {
        unplacedSmallBoxes.push(smallBox);
      }
    });
    
    // Plasser gjenværende små bokser som overlapper store bokser
    unplacedSmallBoxes.forEach((smallBox) => {
      const smallSize = smallBox.size;
      let placed = false;
      
      // Prøv å plassere små bokser på store bokser
      for (let i = 0; i < largeBoxesPositions.length && !placed; i++) {
        const largePos = largeBoxesPositions[i];
        const largeArea = largePos.width * largePos.height;
        const smallArea = isHorizontal ? (smallSize * h) : (w * smallSize);
        
        // Bare overlapp hvis liten boks er betydelig mindre enn stor boks
        if (smallArea < largeArea * 0.3) {
          // Plasser i hjørne eller langs kant av stor boks
          let smallX, smallY;
          
          if (isHorizontal) {
            // Horisontal layout: plasser i høyre hjørne eller langs høyre kant
            const margin = 4;
            const smallHeight = Math.min(h * 0.6, largePos.height - margin * 2);
            smallX = largePos.x + largePos.width - smallSize - margin;
            smallY = largePos.y + margin;
            // Sjekk om det passer
            if (smallX >= largePos.x && smallY + smallHeight <= largePos.y + largePos.height) {
              createTreemapRect(svg, svgNS, smallBox.item, smallX, smallY, smallSize, smallHeight, getColor(smallBox.item.type, smallBox.item));
              placed = true;
            }
          } else {
            // Vertikal layout: plasser i bunnhjørne eller langs bunnkant
            const margin = 4;
            const smallWidth = Math.min(w * 0.6, largePos.width - margin * 2);
            smallX = largePos.x + margin;
            smallY = largePos.y + largePos.height - smallSize - margin;
            // Sjekk om det passer
            if (smallY >= largePos.y && smallX + smallWidth <= largePos.x + largePos.width) {
              createTreemapRect(svg, svgNS, smallBox.item, smallX, smallY, smallWidth, smallSize, getColor(smallBox.item.type, smallBox.item));
              placed = true;
            }
          }
        }
      }
      
      // Hvis fortsatt ikke plassert, overlapp første stor boks
      if (!placed && largeBoxesPositions.length > 0) {
        const firstLarge = largeBoxesPositions[0];
        const margin = 4;
        if (isHorizontal) {
          const smallHeight = Math.min(h * 0.6, firstLarge.height - margin * 2);
          createTreemapRect(svg, svgNS, smallBox.item, firstLarge.x + firstLarge.width - smallSize - margin, firstLarge.y + margin, smallSize, smallHeight, getColor(smallBox.item.type, smallBox.item));
        } else {
          const smallWidth = Math.min(w * 0.6, firstLarge.width - margin * 2);
          createTreemapRect(svg, svgNS, smallBox.item, firstLarge.x + margin, firstLarge.y + firstLarge.height - smallSize - margin, smallWidth, smallSize, getColor(smallBox.item.type, smallBox.item));
        }
      }
    });
  }
  
  squarify(sortedItems, [], treemapX, treemapY, treemapW, treemapH);
}

// Kalenderår for waterfall under Kontantstrøm (2025 = «start», samme logikk som T-konto/Treemap år-strip)
var waterfallChartSelectedYear = 2025;

// --- Waterfall (Grafikk III) ---
function renderWaterfallModule(root) {
  root.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const vbW = 1200, vbH = 560;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  svg.style.width = "100%"; svg.style.height = "auto"; svg.style.display = "block";

  const style = document.createElementNS(svgNS, "style");
  style.textContent = `
    .wf-title { font: 900 24px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
    .wf-label { font: 600 12px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #64748B; letter-spacing: 0.02em; }
    .wf-value { font: 700 13px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #0F172A; }
  `;
  svg.appendChild(style);

  const defs = document.createElementNS(svgNS, "defs");

  function addLinearGradient(id, stops) {
    const lg = document.createElementNS(svgNS, "linearGradient");
    lg.setAttribute("id", id);
    lg.setAttribute("x1", "0%"); lg.setAttribute("y1", "0%");
    lg.setAttribute("x2", "0%"); lg.setAttribute("y2", "100%");
    stops.forEach(([offset, color, op]) => {
      const st = document.createElementNS(svgNS, "stop");
      st.setAttribute("offset", offset);
      st.setAttribute("stop-color", color);
      if (op != null) st.setAttribute("stop-opacity", String(op));
      lg.appendChild(st);
    });
    defs.appendChild(lg);
  }
  addLinearGradient("wfGradUp", [
    ["0%", "#ECFDF3"],
    ["52%", "#CCF5DF"],
    ["100%", "#9BE7C0"]
  ]);
  addLinearGradient("wfGradDown", [
    ["0%", "#FFF3F4"],
    ["52%", "#FFD9DD"],
    ["100%", "#FFB7C0"]
  ]);
  const wfBarShadow = document.createElementNS(svgNS, "filter");
  wfBarShadow.setAttribute("id", "wfBarShadow");
  wfBarShadow.setAttribute("x", "-15%"); wfBarShadow.setAttribute("y", "-15%");
  wfBarShadow.setAttribute("width", "130%"); wfBarShadow.setAttribute("height", "135%");
  wfBarShadow.setAttribute("color-interpolation-filters", "sRGB");
  const feSh = document.createElementNS(svgNS, "feDropShadow");
  feSh.setAttribute("dx", "0"); feSh.setAttribute("dy", "5");
  feSh.setAttribute("stdDeviation", "2.2");
  feSh.setAttribute("flood-color", "#0F172A"); feSh.setAttribute("flood-opacity", "0.078");
  wfBarShadow.appendChild(feSh);
  defs.appendChild(wfBarShadow);

  svg.appendChild(defs);

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(vbW)); bg.setAttribute("height", String(vbH));
  bg.setAttribute("fill", "#ffffff");
  svg.appendChild(bg);

  const container = document.createElement("div");
  container.className = "waterfall-canvas";
  container.appendChild(svg);

  const quickBtn = document.createElement("button");
  quickBtn.type = "button";
  quickBtn.className = "waterfall-quick-action";
  quickBtn.setAttribute("aria-label", "Åpne hurtigmeny for kontantstrøm");
  quickBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="4" height="4" rx="1.2" /><rect x="15" y="5" width="4" height="4" rx="1.2" /><rect x="5" y="15" width="4" height="4" rx="1.2" /><rect x="15" y="15" width="4" height="4" rx="1.2" /></svg>';
  quickBtn.addEventListener("click", openCashflowForecastModal);
  container.appendChild(quickBtn);

  const yearStrip = document.createElement("div");
  yearStrip.className = "t-konto-year-strip";
  yearStrip.setAttribute("aria-label", "Velg år for kontantstrøm");
  const yearInner = document.createElement("div");
  yearInner.className = "t-konto-year-buttons";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "t-konto-year-btn";
  startBtn.textContent = "start";
  startBtn.setAttribute("data-year", "2025");
  startBtn.setAttribute("aria-label", "Velg start");
  if (waterfallChartSelectedYear === 2025) startBtn.classList.add("is-active");
  yearInner.appendChild(startBtn);

  for (let y = 2026; y <= 2040; y++) {
    const yBtn = document.createElement("button");
    yBtn.type = "button";
    yBtn.className = "t-konto-year-btn";
    yBtn.textContent = String(y);
    yBtn.setAttribute("data-year", String(y));
    yBtn.setAttribute("aria-label", "Velg år " + y);
    if (waterfallChartSelectedYear === y) yBtn.classList.add("is-active");
    yearInner.appendChild(yBtn);
  }

  yearStrip.appendChild(yearInner);
  const scrollHint = document.createElement("span");
  scrollHint.className = "t-konto-year-strip-scroll-hint";
  scrollHint.setAttribute("aria-hidden", "true");
  scrollHint.innerHTML = "&#9660;";
  yearStrip.appendChild(scrollHint);

  yearInner.querySelectorAll(".t-konto-year-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      yearInner.querySelectorAll(".t-konto-year-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const yy = parseInt(btn.getAttribute("data-year"), 10);
      if (!Number.isNaN(yy)) waterfallChartSelectedYear = yy;
      draw();
    });
  });

  const card = document.createElement("div");
  card.className = "panel panel-assets waterfall-chart-card";

  const wrapper = document.createElement("div");
  wrapper.className = "waterfall-wrapper";
  card.appendChild(container);
  card.appendChild(yearStrip);
  wrapper.appendChild(card);

  function draw() {
    while (svg.childNodes.length > 3) svg.removeChild(svg.lastChild);

    const { costs, net, wage, pension, dividends, skattefrieIncome, moBUtbetalingIncome, otherIncome } = computeAnnualCashflowBreakdownForYear(
      waterfallChartSelectedYear,
      { kontantstromStartAlignsDebtWith2026: true }
    );

    const padX = 80; const padTop = 70; const padBottom = net < 0 ? 96 : 64;
    const chartW = vbW - padX * 2; const chartH = vbH - padTop - padBottom;

    const steps = [];
    if (wage > 0) steps.push({ type: "up", key: "Lønnsinntekt", value: wage });
    if (pension > 0) steps.push({ type: "up", key: "Pensjonsinntekt", value: pension });
    if (dividends > 0) steps.push({ type: "up", key: "Utbytter", value: dividends });
    if (skattefrieIncome > 0) steps.push({ type: "up", key: "Skattefrie inntekter", value: skattefrieIncome });
    if (moBUtbetalingIncome > 0) {
      steps.push({
        type: "up",
        key: "Utbetalinger fra mål og behov",
        labelLines: CASHFLOW_MOB_NETTO_LABEL_LINES,
        value: moBUtbetalingIncome
      });
    }
    if (otherIncome > 0) {
      steps.push({ type: "up", key: "Annen inntekt", value: otherIncome });
    }
    costs.forEach(c => { if (c.value > 0) steps.push({ type: "down", key: c.key, value: -c.value }); });
    steps.push({ type: "end", key: "Årlig kontantstrøm", value: net });

    const tempSteps = [];
    if (wage > 0) tempSteps.push({ type: "up", value: wage, key: "Lønnsinntekt" });
    if (pension > 0) tempSteps.push({ type: "up", value: pension, key: "Pensjonsinntekt" });
    if (dividends > 0) tempSteps.push({ type: "up", value: dividends, key: "Utbytter" });
    if (skattefrieIncome > 0) tempSteps.push({ type: "up", value: skattefrieIncome, key: "Skattefrie inntekter" });
    if (moBUtbetalingIncome > 0) {
      tempSteps.push({ type: "up", value: moBUtbetalingIncome, key: "Utbetalinger fra mål og behov" });
    }
    if (otherIncome > 0) {
      tempSteps.push({ type: "up", value: otherIncome, key: "Annen inntekt" });
    }
    (costs || []).forEach(c => { if (c.value > 0) tempSteps.push({ type: "down", value: -c.value, key: c.key }); });
    let lvl = 0; const levels = [0];
    tempSteps.forEach(s => { lvl += s.value; levels.push(lvl); });
    levels.push(net); // inkluder netto nivå
    const minLevel = Math.min(0, ...levels);
    const maxLevel = Math.max(0, ...levels);
    const levelRange = Math.max(1, maxLevel - minLevel);
    const levelToY = (L) => padTop + chartH - ((L - minLevel) / levelRange) * chartH;
    const barGeom = (fromLevel, toLevel) => {
      const y1 = levelToY(fromLevel); const y2 = levelToY(toLevel);
      const yTop = Math.min(y1, y2);
      const hRaw = Math.abs(y2 - y1);
      return { yTop, h: Math.max(2, hRaw) };
    };

    const colW = Math.max(60, Math.floor(chartW / steps.length) - 10);
    let cursorX = padX;
    let running = 0;
    steps.forEach((s, idx) => {
      if (!s || !isFinite(s.value)) return; // hopp over nulltrinn, men behold 0 for Avdrag
      let h, y, fill, stroke, valueColor;
      let labelText;
      if (s.type === "up") {
        const from = running;
        const to = running + s.value;
        const geom = barGeom(from, to);
        h = geom.h; y = geom.yTop;
        running = to;
        fill = "url(#wfGradUp)";
        stroke = "rgba(5, 150, 105, 0.26)";
        valueColor = "#047857";
        labelText = formatNOK(Math.round(Math.abs(s.value)));
      } else if (s.type === "down") {
        const from = running;
        const to = running + s.value; // s.value is negative
        const geom = barGeom(from, to);
        h = geom.h; y = geom.yTop;
        running = to;
        fill = "url(#wfGradDown)";
        stroke = "rgba(225, 29, 72, 0.26)";
        valueColor = "#BE123C";
        labelText = formatNOK(Math.round(s.value)); // vis alltid minus for kostnader
      } else { // end (netto)
        const from = 0;
        const to = s.value;
        const geom = barGeom(from, to);
        h = geom.h; y = geom.yTop;
        /* Samme mørkeblå som .summary-cash / kontantstrøm-boksen øverst (--sp-dark-blue) */
        fill = "#002359";
        stroke = "rgba(153, 217, 242, 0.25)";
        valueColor = "#002359";
        labelText = formatNOK(Math.round(s.value)); // signert
      }

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", String(cursorX));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(colW));
      rect.setAttribute("height", String(Math.max(2, h)));
      rect.setAttribute("rx", "9");
      rect.setAttribute("fill", fill);
      rect.setAttribute("stroke", stroke);
      rect.setAttribute("stroke-width", "0.75");
      rect.setAttribute("filter", "url(#wfBarShadow)");
      svg.appendChild(rect);

      const lab = document.createElementNS(svgNS, "text");
      lab.setAttribute("class", "wf-label");
      const cxLab = cursorX + colW / 2;
      lab.setAttribute("x", String(cxLab));
      const lineCount = Array.isArray(s.labelLines) && s.labelLines.length ? s.labelLines.length : 1;
      const bottomPad = 8 + (lineCount > 1 ? (lineCount - 1) * 13 : 0);
      const labelY = Math.min(vbH - bottomPad, y + Math.max(2, h) + 14);
      lab.setAttribute("y", String(labelY));
      lab.setAttribute("text-anchor", "middle");
      if (Array.isArray(s.labelLines) && s.labelLines.length) {
        s.labelLines.forEach((line, i) => {
          const tsp = document.createElementNS(svgNS, "tspan");
          tsp.setAttribute("x", String(cxLab));
          if (i > 0) tsp.setAttribute("dy", "1.05em");
          tsp.textContent = line;
          lab.appendChild(tsp);
        });
      } else {
        lab.textContent = s.key;
      }
      svg.appendChild(lab);

      const val = document.createElementNS(svgNS, "text");
      val.setAttribute("class", "wf-value");
      val.setAttribute("x", String(cursorX + colW / 2));
      val.setAttribute("y", String(y - 8));
      val.setAttribute("text-anchor", "middle");
      val.setAttribute("fill", valueColor || "#0F172A");
      val.textContent = labelText;
      svg.appendChild(val);

      cursorX += colW + 10;
    });
  }

  draw();
  root.appendChild(wrapper);
}

function notifyCashflowRoutingChange(sourceSection) {
  const moduleRoot = document.getElementById("module-root");
  if (!moduleRoot) return;
  const currentNav = document.querySelector(".nav-item.is-active");
  if (!currentNav) return;
  const section = currentNav.getAttribute("data-section") || currentNav.textContent || "";
  if (section === sourceSection) return;
  if (section === "T-Konto") {
    renderGraphicsModule(moduleRoot);
  } else if (section === "Fremtidig utvikling") {
    renderFutureModule(moduleRoot);
  } else if (section === "Analyse") {
    renderAnalysisModule(moduleRoot);
  }
}

function aggregateCashflowBase() {
  const incomeItems = AppState.incomes || [];
  const upper = (s) => String(s || "").toUpperCase();
  const pen = getPensionCashflowModeParams();
  const yearsFrom2026 = 0;

  let incomeTotal = 0;
  let wage = 0;
  let pension = 0;
  let dividends = 0;
  let skattefrieIncome = 0;
  let moBUtbetalingIncome = 0;
  let otherIncome = 0;
  let annualTax = 0;
  let annualCosts = 0;
  const individualTaxes = [];
  const individualCosts = [];

  incomeItems.forEach((item) => {
    const name = upper(item.name);
    let raw = Number(item.amount) || 0;
    if (isMoBUtbetalingIncomeRow(item) && item._maalOgBehovUtbetalingToggleUI === true) {
      raw = getMaalOgBehovNettoUtbetalingForYear(2026);
    }
    if (pen.pensionModeActive) {
      if (/L[ØO]NN/.test(name)) {
        if (yearsFrom2026 >= pen.yearsToRetirement) raw = 0;
      } else if (/PENSJON/.test(name)) {
        if (yearsFrom2026 < pen.yearsToRetirement) raw = 0;
        else raw = pen.activeAnnualPension;
      }
    }
    const amount = raw;
    if (/SKATT/.test(name) && !/SKATTEFRIE\s*INNTEKTER/.test(name)) {
      annualTax += amount;
      if (amount > 0) {
        individualTaxes.push({ key: item.name, value: amount });
      }
    } else if (/KOSTNAD/.test(name)) {
      annualCosts += amount;
      if (amount > 0) {
        individualCosts.push({ key: item.name, value: amount });
      }
    } else {
      if (amount > 0) {
        incomeTotal += amount;
        if (/PENSJON/.test(name)) pension += amount;
        else if (/L[ØO]NN/.test(name)) wage += amount;
        else if (/UTBYT/.test(name)) dividends += amount;
        else if (isMoBUtbetalingIncomeRow(item)) moBUtbetalingIncome += amount;
        else if (/^SKATTEFRIE\s*INNTEKTER$/.test(name)) skattefrieIncome += amount;
        else otherIncome += amount;
      }
    }
  });

  return {
    wage,
    pension,
    dividends,
    skattefrieIncome,
    moBUtbetalingIncome,
    otherIncome,
    incomeTotal,
    annualTax,
    annualCosts,
    individualTaxes,
    individualCosts,
    costTotal: annualTax + annualCosts
  };
}

/** Samme KPI-justering som Treemap kontantstrøm: «start» (2025) = faktor 1, deretter (1+KPI)^(år−2025). */
function aggregateCashflowBaseForYear(calendarYear) {
  const incomeItems = AppState.incomes || [];
  const upper = (s) => String(s || "").toUpperCase();
  const Y = Number(calendarYear);
  const year = Number.isFinite(Y) ? Y : 2026;
  const kpiRate = Number(AppState.expectations && AppState.expectations.kpi) || 0;
  const inflation = Math.max(0, kpiRate) / 100;
  const yearsFromStart = Math.max(0, year - 2025);
  const inflationFactor = Math.pow(1 + inflation, yearsFromStart);
  const pen = getPensionCashflowModeParams();
  const yearsFrom2026 = Math.max(0, year - 2026);
  const postRetirementPen = pen.pensionModeActive && yearsFrom2026 >= pen.yearsToRetirement;

  let incomeTotal = 0;
  let wage = 0;
  let pension = 0;
  let dividends = 0;
  let skattefrieIncome = 0;
  let moBUtbetalingIncome = 0;
  let otherIncome = 0;
  let annualTax = 0;
  let annualCosts = 0;
  const individualTaxes = [];
  const individualCosts = [];

  incomeItems.forEach((item) => {
    const name = upper(item.name);
    let raw = Math.max(0, Number(item.amount) || 0);
    if (isMoBUtbetalingIncomeRow(item) && item._maalOgBehovUtbetalingToggleUI === true) {
      raw = getMaalOgBehovNettoUtbetalingForYear(year);
    }
    if (pen.pensionModeActive) {
      if (/L[ØO]NN/.test(name)) {
        if (yearsFrom2026 >= pen.yearsToRetirement) raw = 0;
      } else if (/PENSJON/.test(name)) {
        if (yearsFrom2026 < pen.yearsToRetirement) raw = 0;
        else raw = pen.activeAnnualPension;
      }
    }
    const useMoBNettoSkattefrie = isMoBUtbetalingIncomeRow(item) && item._maalOgBehovUtbetalingToggleUI === true;
    const shouldKeepNominal = postRetirementPen && /PENSJON/.test(name);
    const amount = shouldKeepNominal || useMoBNettoSkattefrie ? raw : raw * inflationFactor;
    if (/SKATT/.test(name) && !/SKATTEFRIE\s*INNTEKTER/.test(name)) {
      // Fra pensjonsstart: tabellbasert inntektsskatt på lønn erstattes med flat skatt på årlig pensjon (synlig i kontantstrøm per år).
      if (postRetirementPen && pen.pensionModeActive && /INNTEKTSSKATT/.test(name)) {
        const flatIncomeTax = Math.round(pen.activeAnnualPension * PENSION_POST_RETIREMENT_INCOME_TAX_RATE);
        annualTax += flatIncomeTax;
        if (flatIncomeTax > 0) {
          individualTaxes.push({ key: item.name, value: flatIncomeTax });
        }
        return;
      }
      annualTax += amount;
      if (amount > 0) {
        individualTaxes.push({ key: item.name, value: amount });
      }
    } else if (/KOSTNAD/.test(name)) {
      annualCosts += amount;
      if (amount > 0) {
        individualCosts.push({ key: item.name, value: amount });
      }
    } else {
      if (amount > 0) {
        incomeTotal += amount;
        if (/PENSJON/.test(name)) pension += amount;
        else if (/L[ØO]NN/.test(name)) wage += amount;
        else if (/UTBYT/.test(name)) dividends += amount;
        else if (isMoBUtbetalingIncomeRow(item)) moBUtbetalingIncome += amount;
        else if (/^SKATTEFRIE\s*INNTEKTER$/.test(name)) skattefrieIncome += amount;
        else otherIncome += amount;
      }
    }
  });

  return {
    wage,
    pension,
    dividends,
    skattefrieIncome,
    moBUtbetalingIncome,
    otherIncome,
    incomeTotal,
    annualTax,
    annualCosts,
    individualTaxes,
    individualCosts,
    costTotal: annualTax + annualCosts
  };
}

/**
 * @param {number} calendarYear
 * @param {{ kontantstromStartAlignsDebtWith2026?: boolean }} [options]
 *   Kontantstrøm-waterfall: ved «start» (2025) skal renter/avdrag per gjeldspost være like som i det årets første nedbetalingsår (typisk 2026).
 */
function computeAnnualCashflowBreakdownForYear(calendarYear, options) {
  const o = options && typeof options === "object" ? options : {};
  const Y = Number(calendarYear);
  const year = Number.isFinite(Y) ? Y : 2026;
  const base = aggregateCashflowBaseForYear(year);
  const debts = AppState.debts || [];
  const debtOpts =
    o.kontantstromStartAlignsDebtWith2026 === true && year === 2025
      ? { kontantstromStartAlignsDebtWith2026: true }
      : undefined;
  const annualPayment = calculateTotalAnnualDebtPaymentForYear(debts, year, debtOpts);
  const interestCost = calculateTotalAnnualInterestForYear(debts, year, debtOpts);
  const principalCost = Math.max(0, annualPayment - interestCost);
  const costItems = base.individualCosts && base.individualCosts.length > 0
    ? base.individualCosts
    : (base.annualCosts > 0 ? [{ key: "Årlige kostnader", value: base.annualCosts }] : []);

  const costs = [
    ...base.individualTaxes,
    ...costItems,
    { key: "Rentekostnader", value: interestCost },
    { key: "Avdrag", value: principalCost }
  ].filter((c) => c.value > 0 || c.key === "Avdrag");
  const totalCosts = costs.reduce((sum, c) => sum + (c.value || 0), 0);
  const net = base.incomeTotal - totalCosts;
  return {
    wage: base.wage,
    pension: base.pension,
    dividends: base.dividends,
    skattefrieIncome: base.skattefrieIncome || 0,
    moBUtbetalingIncome: base.moBUtbetalingIncome || 0,
    otherIncome: base.otherIncome,
    totalIncome: base.incomeTotal,
    annualTax: base.annualTax,
    annualCosts: base.annualCosts,
    interestCost,
    principalCost,
    costs,
    net
  };
}

function computeAnnualCashflowBreakdown() {
  return computeAnnualCashflowBreakdownForYear(2026);
}

/** Første år lånet er aktivt i modellen (default 2026). */
function getDebtScheduleStartYear(debt) {
  const params = (debt && debt.debtParams) || AppState.debtParams || {};
  if (params.startYear == null || params.startYear === "") return 2026;
  const S = Number(params.startYear);
  return Number.isFinite(S) ? S : 2026;
}

/**
 * Kalenderår → indeks i gjeldsamortisering (samme som tidligere «år − 2025» når startår er 2026 og Y ≥ 2026).
 * Uten lagret startår antas 2026. Før startår: ingen gjeld (indeks −1).
 */
function getDebtScheduleElapsed(debt, calendarYear) {
  const Y = Number(calendarYear);
  if (!Number.isFinite(Y)) return 0;
  const S = getDebtScheduleStartYear(debt);
  if (Y < S) return -1;
  return Y - S + 1;
}

/**
 * Ett års annuitetsprosjeksjon (samme indeksering som projectDebtYear: idx 1..scheduleYears).
 */
function projectAnnuitetYear(amount, rate, scheduleYears, idx) {
  const P = Number(amount) || 0;
  if (P <= 0) {
    return { interest: 0, principal: 0, payment: 0, remaining: 0 };
  }
  const nYears = Math.max(1, Number(scheduleYears) || 1);
  const rawIdx = Math.floor(Number(idx));
  if (rawIdx < 1 || rawIdx > nYears) {
    return { interest: 0, principal: 0, payment: 0, remaining: 0 };
  }
  const r = Number(rate) || 0;
  if (r === 0) {
    const principal = P / nYears;
    const remainingBefore = Math.max(0, P - principal * rawIdx);
    const remaining = Math.max(0, remainingBefore - principal);
    return { interest: 0, principal, payment: principal, remaining };
  }
  const annuity = P * (r / (1 - Math.pow(1 + r, -nYears)));
  const remainingBefore =
    P * Math.pow(1 + r, rawIdx) - annuity * ((Math.pow(1 + r, rawIdx) - 1) / r);
  const interest = remainingBefore * r;
  const rawPrincipal = annuity - interest;
  const principal = Math.min(Math.max(0, rawPrincipal), Math.max(0, remainingBefore));
  const remaining = Math.max(0, remainingBefore - principal);
  return { interest, principal, payment: annuity, remaining };
}

function projectDebtYear(debt, yearIndex) {
  const amount = Number(debt && debt.amount) || 0;
  if (amount <= 0) {
    return { interest: 0, principal: 0, payment: 0, remaining: 0 };
  }
  const rawIdx = Math.floor(Number(yearIndex));
  if (rawIdx < 0) {
    return { interest: 0, principal: 0, payment: 0, remaining: 0 };
  }
  const params = debt.debtParams || AppState.debtParams || {};
  const type = params.type || "Annuitetslån";
  const rate = Number(params.rate) || 0;
  const years = Math.max(1, Number(params.years) || 1);
  const idx = rawIdx;

  if (/Avdragsfrihet/.test(type)) {
    const years = Math.max(1, Number(params.years) || 1);
    const match = /(\d+)\s*år/i.exec(type);
    const graceYears = match ? Number(match[1]) : years;
    const interestOnlyYears = type === "Avdragsfrihet" ? years : Math.min(graceYears, years);
    const amortYears = type === "Avdragsfrihet" ? 0 : years;
    const totalDuration = interestOnlyYears + amortYears;

    if (idx > totalDuration) {
      return { interest: 0, principal: 0, payment: 0, remaining: 0 };
    }

    if (idx < interestOnlyYears) {
      const interest = amount * rate;
      return { interest, principal: 0, payment: interest, remaining: amount };
    }

    if (amortYears <= 0) {
      return { interest: 0, principal: 0, payment: 0, remaining: amount };
    }

    const n = idx - interestOnlyYears;

    if (rate === 0) {
      const principal = amount / amortYears;
      if (n > amortYears) return { interest: 0, principal: 0, payment: 0, remaining: 0 };
      const remainingBefore = Math.max(0, amount - principal * n);
      const remaining = Math.max(0, remainingBefore - principal);
      return { interest: 0, principal, payment: principal, remaining };
    }

    if (n > amortYears) return { interest: 0, principal: 0, payment: 0, remaining: 0 };
    const annuity = amount * (rate / (1 - Math.pow(1 + rate, -amortYears)));
    const remainingBefore = amount * Math.pow(1 + rate, n) - annuity * ((Math.pow(1 + rate, n) - 1) / rate);
    const interest = remainingBefore * rate;
    const rawPrincipal = annuity - interest;
    const principal = Math.min(Math.max(0, rawPrincipal), Math.max(0, remainingBefore));
    const remaining = Math.max(0, remainingBefore - principal);
    return { interest, principal, payment: annuity, remaining };
  }

  if (/Ballonglån/.test(type)) {
    const match = /Ballonglån\s+(\d+)/i.exec(type);
    const balloonYears = match ? Math.max(1, Number(match[1])) : 1;

    if (idx > balloonYears) {
      return { interest: 0, principal: 0, payment: 0, remaining: 0 };
    }

    if (idx === balloonYears) {
      let opening = amount;
      if (balloonYears > 1) {
        const prev = projectAnnuitetYear(amount, rate, years, balloonYears - 1);
        opening = prev.remaining;
      }
      if (opening <= 0) {
        return { interest: 0, principal: 0, payment: 0, remaining: 0 };
      }
      return {
        interest: 0,
        principal: opening,
        payment: opening,
        remaining: 0
      };
    }

    return projectAnnuitetYear(amount, rate, years, idx);
  }

  if (idx > years) {
    return { interest: 0, principal: 0, payment: 0, remaining: 0 };
  }

  if (type === "Serielån") {
    const principalPortion = amount / years;
    const remainingBefore = Math.max(0, amount - principalPortion * idx);
    const interest = remainingBefore * rate;
    const principal = Math.min(principalPortion, remainingBefore);
    const payment = interest + principal;
    const remaining = Math.max(0, remainingBefore - principal);
    return { interest, principal, payment, remaining };
  }

  // Annuitetslån (default)
  return projectAnnuitetYear(amount, rate, years, idx);
}

function computeCashflowForecastSeries(startYear, yearsCount) {
  const { incomeTotal, costTotal } = aggregateCashflowBase();
  const debts = AppState.debts || [];
  const kpiRate = Number(AppState.expectations && AppState.expectations.kpi) || 0;
  const inflation = Math.max(0, kpiRate) / 100;

  const series = [];
  for (let i = 0; i < yearsCount; i++) {
    const factor = Math.pow(1 + inflation, i);
    const income = incomeTotal * factor;
    const costs = costTotal * factor;
    const calendarYear = startYear + i;
    const alignStart = calendarYear === 2025;
    const debtAgg = debts.reduce(
      (acc, debt) => {
        const calYear = alignStart ? getDebtScheduleStartYear(debt) : calendarYear;
        const eff = getDebtScheduleElapsed(debt, calYear);
        const detail = projectDebtYear(debt, eff);
        acc.interest += detail.interest;
        acc.principal += detail.principal;
        return acc;
      },
      { interest: 0, principal: 0 }
    );
    const net = income - costs - debtAgg.interest - debtAgg.principal;
    series.push({
      year: startYear + i,
      net,
      income,
      costs,
      interest: debtAgg.interest,
      principal: debtAgg.principal
    });
  }

  return { series, inflation };
}

function getCashflowForecastNetForYear(yearVal) {
  try {
    const incomes = AppState.incomes || [];
    const debts = AppState.debts || [];
    const kpiRate = Number(AppState.expectations && AppState.expectations.kpi) || 0;
    const inflation = Math.max(0, kpiRate) / 100;
    const yearsFromStart = Math.max(0, Number(yearVal) - 2025);
    const inflationFactor = Math.pow(1 + inflation, yearsFromStart);
    const yearsFrom2026 = Math.max(0, Number(yearVal) - 2026);
    const upper = (s) => String(s || "").toUpperCase();

    const pen = getPensionCashflowModeParams();
    const pensionModeActive = pen.pensionModeActive;
    const yearsToRetirement = pen.yearsToRetirement;
    const activeAnnualPension = pen.activeAnnualPension;
    const postRetirement = pensionModeActive && yearsFrom2026 >= yearsToRetirement;

    let totalIncome = 0;
    let totalCosts = 0;

    incomes.forEach((item) => {
      const name = upper(item.name);
      let baseAmount = Math.max(0, Number(item.amount) || 0);
      if (isMoBUtbetalingIncomeRow(item) && item._maalOgBehovUtbetalingToggleUI === true) {
        baseAmount = getMaalOgBehovNettoUtbetalingForYear(Number(yearVal) || 2026);
      }

      // I pensjonsårene skal inntektsskatt være eksakt flat sats av aktiv pensjon (nominelt).
      // Håndteres eksplisitt her for å unngå at gamle verdier lekker inn.
      if (postRetirement && /INNTEKTSSKATT/.test(name)) {
        totalCosts += Math.round(activeAnnualPension * PENSION_POST_RETIREMENT_INCOME_TAX_RATE);
        return;
      }

      if (pensionModeActive) {
        if (/L[ØO]NN/.test(name)) {
          if (yearsFrom2026 >= yearsToRetirement) baseAmount = 0;
        } else if (/PENSJON/.test(name)) {
          if (yearsFrom2026 >= yearsToRetirement) {
            baseAmount = activeAnnualPension;
          } else {
            baseAmount = 0;
          }
        } else if (/INNTEKTSSKATT/.test(name)) {
          // Før pensjon: behold brukerens inntektsskatt. Fra pensjonsår: 30% flat skatt av årlig pensjon.
          if (yearsFrom2026 >= yearsToRetirement) {
            baseAmount = 0;
          }
        }
      }

      if (baseAmount <= 0) return;
      // Når pensjonsmodus er aktiv etter pensjonsalder skal pensjon vises nominelt
      // (og skatt er allerede håndtert nominelt i blokken over).
      const useMoBNettoSkattefrie = isMoBUtbetalingIncomeRow(item) && item._maalOgBehovUtbetalingToggleUI === true;
      const shouldKeepNominal = postRetirement && /PENSJON/.test(name);
      const adjustedAmount = shouldKeepNominal || useMoBNettoSkattefrie ? baseAmount : (baseAmount * inflationFactor);
      if ((/SKATT|KOSTNAD/.test(name)) && !/SKATTEFRIE\s*INNTEKTER/.test(name)) {
        totalCosts += adjustedAmount;
      } else {
        totalIncome += adjustedAmount;
      }
    });

    let annualDebtPayment = 0;
    const Ynet = Number(yearVal);
    const alignStart = Number.isFinite(Ynet) && Ynet === 2025;
    debts.forEach((debt) => {
      const calYear = alignStart ? getDebtScheduleStartYear(debt) : Ynet;
      const eff = getDebtScheduleElapsed(debt, calYear);
      const debtProjection = projectDebtYear(debt, eff);
      annualDebtPayment += debtProjection.payment || 0;
    });

    return Math.round(totalIncome - totalCosts - annualDebtPayment);
  } catch (e) {
    return 0;
  }
}

function buildCashflowForecastSVG(startYear, yearsCount) {
  // Egen prognoseserie: pensjons-toggle skal kun påvirke denne grafikken.
  const series = [];
  for (let y = startYear; y < startYear + yearsCount; y++) {
    const net = getCashflowForecastNetForYear(y);
    series.push({ year: y, net });
  }
  const svgNS = "http://www.w3.org/2000/svg";
  const vbW = 1180;
  const vbH = 540;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";

  const style = document.createElementNS(svgNS, "style");
  style.textContent = `
    .cf-title { font: 900 24px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
    .cf-meta { font: 500 13px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #64748B; }
    .cf-label { font: 600 10.4px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
    .cf-year { font: 600 13px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #475569; }
  `;
  svg.appendChild(style);

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(vbW));
  bg.setAttribute("height", String(vbH));
  bg.setAttribute("fill", "#F2F4F7");
  svg.appendChild(bg);

  const padL = 80;
  const padR = 24;
  const padT = 72;
  const padB = 96;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  const maxVal = Math.max(0, ...series.map((d) => d.net));
  const minVal = Math.min(0, ...series.map((d) => d.net));
  const range = Math.max(1, maxVal - minVal);

  const scale = (value) => padT + ((maxVal - value) / range) * plotH;
  const zeroY = scale(0);

  const gridTicks = 5;
  for (let i = 0; i <= gridTicks; i++) {
    const ratio = i / gridTicks;
    const val = maxVal - ratio * range;
    const y = padT + ratio * plotH;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(padL));
    line.setAttribute("x2", String(padL + plotW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", i === gridTicks ? "#CBD5F1" : "#E8EBF3");
    svg.appendChild(line);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(padL - 10));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("fill", "#64748B");
    label.setAttribute("font-size", "14");
    label.textContent = formatAxisValue(val);
    svg.appendChild(label);
  }

  const zeroLine = document.createElementNS(svgNS, "line");
  zeroLine.setAttribute("x1", String(padL));
  zeroLine.setAttribute("x2", String(padL + plotW));
  zeroLine.setAttribute("y1", String(zeroY));
  zeroLine.setAttribute("y2", String(zeroY));
  zeroLine.setAttribute("stroke", "#CBD5F1");
  zeroLine.setAttribute("stroke-width", "1.5");
  svg.appendChild(zeroLine);

  const netBarColor = (getComputedStyle(document.documentElement).getPropertyValue("--WF_NET_COLOR") || "#DBEAFE").trim() || "#DBEAFE";
  const barGap = 12;
  const barCount = series.length;
  const barWidth = Math.max(26, Math.floor((plotW - barGap * (barCount - 1)) / barCount));
  let cursorX = padL;

  series.forEach((entry) => {
    const value = entry.net;
    const scaled = scale(value);
    const height = Math.abs(zeroY - scaled);
    const barHeight = Math.max(2, height);
    const y = value >= 0 ? scaled : zeroY;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", String(cursorX));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(barHeight));
    rect.setAttribute("rx", "8");
    rect.setAttribute("fill", netBarColor || "#DBEAFE");
    rect.setAttribute("stroke", "rgba(37, 99, 235, 0.25)");
    rect.setAttribute("stroke-width", "1");
    svg.appendChild(rect);

    const valueLabel = document.createElementNS(svgNS, "text");
    valueLabel.setAttribute("class", "cf-label");
    valueLabel.setAttribute("x", String(cursorX + barWidth / 2));
    if (value >= 0) {
      valueLabel.setAttribute("y", String(y - 10));
    } else {
      valueLabel.setAttribute("y", String(y + barHeight + 18));
    }
    valueLabel.setAttribute("text-anchor", "middle");
    valueLabel.textContent = formatNOKPlain(Math.round(value));
    svg.appendChild(valueLabel);

    const yearLabel = document.createElementNS(svgNS, "text");
    yearLabel.setAttribute("class", "cf-year");
    yearLabel.setAttribute("x", String(cursorX + barWidth / 2));
    yearLabel.setAttribute("y", String(padT + plotH + 32));
    yearLabel.setAttribute("text-anchor", "middle");
    yearLabel.textContent = String(entry.year);
    svg.appendChild(yearLabel);

    cursorX += barWidth + barGap;
  });

  const title = document.createElementNS(svgNS, "text");
  title.setAttribute("class", "cf-title");
  title.setAttribute("x", String(vbW / 2));
  title.setAttribute("y", "44");
  title.setAttribute("text-anchor", "middle");
  title.textContent = "Årlig kontantstrøm";
  svg.appendChild(title);

  return svg;
}

function openCashflowForecastModal() {
  const modal = document.getElementById("cashflow-forecast-modal");
  const chartRoot = document.getElementById("cashflow-forecast-chart");
  if (!modal || !chartRoot) return;
  chartRoot.innerHTML = "";
  try {
    chartRoot.appendChild(buildCashflowForecastSVG(2026, 15));
  } catch (e) {
    const p = document.createElement("p");
    p.textContent = `Kunne ikke bygge kontantstrømsgraf: ${String((e && e.message) || e)}`;
    chartRoot.appendChild(p);
  }
  modal.removeAttribute("hidden");
  const onKey = (ev) => {
    if (ev.key === "Escape") {
      closeCashflowForecastModal();
    }
  };
  document.addEventListener("keydown", onKey, { once: true });
  modal.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-close") === "true") {
        closeCashflowForecastModal();
      }
    },
    { once: true }
  );
}

function closeCashflowForecastModal() {
  const modal = document.getElementById("cashflow-forecast-modal");
  if (modal) modal.setAttribute("hidden", "");
}

// --- T-konto søylediagram (PROMPT-T-konto-søylediagram.md) ---
// Farger som i referansebildet for korrekt gjengivelse på skjerm og i eksport
var TKONTO_CHART_COLORS = {
  BANK: "#5A8BA2",
  "BANKINNSKUDD": "#5A8BA2",
  "FAST EIENDOM": "#85ACED",
  "PRIMÆRBOLIG": "#85ACED",
  FRITIDSEIENDOM: "#99D9F2",   // S&P Cyan 40
  // "Investeringer mål og behov" skal matche nøyaktig Hovedstol-fargen (#002359) i "Mål og behov".
  // "Sekundæreiendom" får en litt lysere variant av samme farge.
  SEKUNDÆREIENDOM: "#334F7A",
  "SEKUNDÆRBOLIG": "#334F7A",
  TOMT: "#CCECF9",             // S&P Cyan 20
  "INVESTERINGER MÅL OG BEHOV": "#002359",  // Match Hovedstol-fargen i Mål og behov
  "INVESTERINGER": "#B4C6F4",                // Øvrige investeringslinjer
  "BIL/BÅT": "#00ACEC",
  "ANDRE EIENDELER": "#2C405B",
  EGENKAPITAL: "#A7EDBD",
  GJELD: "#F2BFB8"
};

function getTKontoColorForAsset(name, asset) {
  var k = String(name || "").toUpperCase();
  var nameStr = String(name || "").trim();
  if (asset && asset.maalOgBehovPortfolio === true) return TKONTO_CHART_COLORS["INVESTERINGER MÅL OG BEHOV"];
  if (/^BANKINNSKUDD$/i.test(k)) return TKONTO_CHART_COLORS["BANKINNSKUDD"];
  if (/^BANK$/i.test(k)) return TKONTO_CHART_COLORS.BANK;
  if (/^PRIMÆRBOLIG$/i.test(k)) return TKONTO_CHART_COLORS["PRIMÆRBOLIG"];
  if (/^FAST\s*EIENDOM$/i.test(k)) return TKONTO_CHART_COLORS["FAST EIENDOM"];
  if (/^FRITIDSEIENDOM$/i.test(k)) return TKONTO_CHART_COLORS.FRITIDSEIENDOM;
  if (/^SEKUNDÆRBOLIG$/i.test(k)) return TKONTO_CHART_COLORS["SEKUNDÆRBOLIG"];
  if (/^SEKUNDÆREIENDOM$/i.test(k)) return TKONTO_CHART_COLORS.SEKUNDÆREIENDOM;
  if (/^TOMT$/i.test(k)) return TKONTO_CHART_COLORS.TOMT;
  if (/investeringer\s*mål\s*og\s*behov/i.test(nameStr)) return TKONTO_CHART_COLORS["INVESTERINGER MÅL OG BEHOV"];
  if (/INVESTERINGER/i.test(k)) return TKONTO_CHART_COLORS["INVESTERINGER"];
  if (/^BIL\/BÅT$/i.test(k) || /^BIL\s*BÅT$/i.test(k)) return TKONTO_CHART_COLORS["BIL/BÅT"];
  if (/^ANDRE\s*EIENDELER$/i.test(k)) return TKONTO_CHART_COLORS["ANDRE EIENDELER"];
  return TKONTO_CHART_COLORS["ANDRE EIENDELER"];
}

function getTKontoAssetSegments(yearVal) {
  var projected = computeAssetProjection(yearVal);
  var assets = AppState.assets || [];

  // Gruppert visning: eiendeler fordelt på Privat vs AS (fra Eiendeler-fanen)
  if (AppState.tKontoViewMode === "grouped") {
    var grouped = {};
    for (var i = 0; i < projected.length; i++) {
      var entity = (assets[i] && assets[i].entity) ? assets[i].entity : "privat";
      var val = projected[i].value || 0;
      if (val <= 0) continue;
      if (!grouped[entity]) grouped[entity] = { value: 0, name: "" };
      grouped[entity].value += val;
      if (!grouped[entity].name) grouped[entity].name = getEntityDisplayName(entity);
    }
    var segs = [];
    Object.keys(grouped).forEach(function (entity) {
      var g = grouped[entity];
      if (g.value > 0) {
        segs.push({
          key: g.name,
          value: g.value,
          color: isPrivatEntity(entity) ? "#60A5FA" : "#93C5FD"
        });
      }
    });
    return segs.length ? segs : [{ key: "Ingen eiendeler", value: 0.001, color: "#E5E7EB" }];
  }

  var individualSegs = projected
    .map(function (item, i) {
      return {
        key: item.key,
        value: item.value || 0,
        color: item.color || getTKontoColorForAsset(item.key, assets[i])
      };
    })
    .filter(function (seg) { return (seg.value || 0) > 0; });

  return individualSegs.length ? individualSegs : [{ key: "Ingen eiendeler", value: 0.001, color: "#E5E7EB" }];
}

function getTKontoFinancingSegments(yearVal) {
  var totalAssets = 0;
  var projected = computeAssetProjection(yearVal);
  projected.forEach(function (item) { totalAssets += item.value || 0; });
  var remDebt = remainingDebtTotalForYear(yearVal);
  var debtVal = Math.min(remDebt, totalAssets);
  var equityVal = Math.max(0, totalAssets - debtVal);
  var debts = AppState.debts || [];
  var segs = [];
  segs.push({ key: "EGENKAPITAL", value: equityVal, color: TKONTO_CHART_COLORS.EGENKAPITAL });
  if (debts.length === 0) {
    if (debtVal > 0) {
      segs.push({ key: "GJELD", value: debtVal, color: TKONTO_CHART_COLORS.GJELD });
    }
  } else {
    var debtScale = ["#F2BFB8", "#F1999C", "#EF4444", "#DC2626", "#B91C1C"];
    var Yc = Number(yearVal);
    var totalRem = remDebt || 1;
    debts.forEach(function (debt, idx) {
      var remForDebt = remainingBalanceForDebtInYear(debt, Yc);
      var proportion = totalRem > 0 ? remForDebt / totalRem : 0;
      var amount = Math.round(debtVal * proportion);
      if (amount > 0) {
        segs.push({
          key: String(debt.name || "Gjeld " + (idx + 1)),
          value: amount,
          color: debtScale[idx % debtScale.length]
        });
      }
    });
  }
  return { segments: segs, total: totalAssets || 1 };
}

function buildTKontoBarChart(container, yearVal) {
  container.innerHTML = "";
  /* Bakgrunn styres av CSS (#t-konto-graphic-placeholder) — ikke grå flat farge */
  container.style.background = "transparent";
  var assetSegs = getTKontoAssetSegments(yearVal);
  var fin = getTKontoFinancingSegments(yearVal);
  var financingSegs = fin.segments;
  var total = fin.total || 1;
  function pct(v) { return total ? Math.round((v / total) * 100) : 0; }
  function labelRight(v) { return formatNOK(v) + " - " + pct(v) + "%"; }

  var wrap = document.createElement("div");
  wrap.className = "tkonto-chart-wrap";

  var shy = "\u00AD"; // myk bindestrek – bryt som "Sekundær-eiendom", ikke midt i ordet
  function formatTKontoLabel(key) {
    var k = String(key || "").trim();
    var u = k.toUpperCase();
    if (/INVESTERINGER\s*MÅL\s*OG\s*BEHOV/i.test(u)) return "Investeringer<br>mål og behov";
    if (/^(FAST\s*EIENDOM|PRIMÆRBOLIG|EIENDOM)$/i.test(u)) return "Primærbolig";
    if (/^(BANK|BANKINNSKUDD)$/i.test(u)) return "Bankinnskudd";
    if (/^FRITIDSEIENDOM$/i.test(u)) return "Fritids" + shy + "eiendom";
    if (/^(SEKUNDÆREIENDOM|SEKUNDÆRBOLIG)$/i.test(u)) return "Sekundærbolig";
    if (/^EGENKAPITAL$/i.test(u)) return "Egenkapital";
    if (/^GJELD$/i.test(u)) return "Gjeld";
    if (/^PRIVAT$/i.test(k)) return "Privat";
    if (/AS$/i.test(k) || /HOLDING/i.test(u)) return k; // Behold AS-navn som i Struktur
    if (!k) return "";
    return k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
  }
  function addCard(segs, cardEl) {
    segs.forEach(function (seg, idx) {
      var row = document.createElement("div");
      row.className = "tkonto-segment-row";
      row.style.flex = String(Math.max(seg.value, 0.001));
      var lab = document.createElement("div");
      lab.className = "tkonto-label";
      lab.innerHTML = formatTKontoLabel(seg.key);
      var segEl = document.createElement("div");
      segEl.className = "tkonto-bar-segment";
      segEl.style.background = seg.color;
      segEl.style.backgroundColor = seg.color;
      if (segs.length === 1) {
        segEl.style.borderRadius = "12px";
      } else if (idx === 0) {
        segEl.style.borderRadius = "12px 12px 0 0";
      } else if (idx === segs.length - 1) {
        segEl.style.borderRadius = "0 0 12px 12px";
      } else {
        segEl.style.borderRadius = "0";
      }
      segEl.setAttribute("aria-label", seg.key + " " + labelRight(seg.value));
      var val = document.createElement("div");
      val.className = "tkonto-value";
      val.textContent = labelRight(seg.value);
      row.appendChild(lab);
      row.appendChild(segEl);
      row.appendChild(val);
      cardEl.appendChild(row);
    });
  }

  var leftCard = document.createElement("div");
  leftCard.className = "tkonto-chart-card";
  addCard(assetSegs, leftCard);

  var eqBtn = document.createElement("div");
  eqBtn.className = "tkonto-equals";
  eqBtn.setAttribute("aria-hidden", "true");
  eqBtn.textContent = "=";

  var rightCard = document.createElement("div");
  rightCard.className = "tkonto-chart-card";
  addCard(financingSegs, rightCard);

  wrap.appendChild(leftCard);
  wrap.appendChild(eqBtn);
  wrap.appendChild(rightCard);
  container.appendChild(wrap);
}

function refreshTKontoChart() {
  var currentNav = document.querySelector(".nav-item.is-active");
  var section = currentNav ? (currentNav.getAttribute("data-section") || "") : "";
  if (section !== "T-Konto") return;
  var placeholder = document.getElementById("t-konto-graphic-placeholder");
  if (!placeholder) return;
  var activeBtn = document.querySelector(".t-konto-year-btn.is-active");
  var year = activeBtn ? parseInt(activeBtn.getAttribute("data-year"), 10) : 2026;
  if (!isFinite(year)) year = 2026;
  buildTKontoBarChart(placeholder, year);
}

/** Tegner T-konto-grafikken til en canvas med eksakte farger – for eksport/kopiering. */
function renderTKontoChartToCanvas(outWidth, outHeight) {
  var yearVal = 2026;
  var activeBtn = document.querySelector(".t-konto-year-btn.is-active");
  if (activeBtn) {
    var y = parseInt(activeBtn.getAttribute("data-year"), 10);
    if (isFinite(y)) yearVal = y;
  }
  var assetSegs = getTKontoAssetSegments(yearVal);
  var fin = getTKontoFinancingSegments(yearVal);
  var financingSegs = fin.segments;
  var total = fin.total || 1;
  function pct(v) { return total ? Math.round((v / total) * 100) : 0; }
  function valueLabel(v) { return (typeof formatNOK === "function" ? formatNOK(v) : String(v)) + " - " + pct(v) + "%"; }
  /* Samme linjebrytning som i grafikken (formatTKontoLabel med <br>) */
  function labelLines(key) {
    var k = String(key || "").trim(), u = k.toUpperCase();
    if (/INVESTERINGER\s*MÅL\s*OG\s*BEHOV/i.test(u)) return ["Investeringer", "mål og behov"];
    if (/^(FAST\s*EIENDOM|PRIMÆRBOLIG|EIENDOM)$/i.test(u)) return ["Primærbolig"];
    if (/^(BANK|BANKINNSKUDD)$/i.test(u)) return ["Bankinnskudd"];
    if (/^(SEKUNDÆREIENDOM|SEKUNDÆRBOLIG)$/i.test(u)) return ["Sekundærbolig"];
    if (/^EGENKAPITAL$/i.test(u)) return ["Egenkapital"];
    if (/^GJELD$/i.test(u)) return ["Gjeld"];
    return [k.charAt(0).toUpperCase() + k.slice(1).toLowerCase()];
  }

  var canvas = document.createElement("canvas");
  canvas.width = outWidth || 1000;
  canvas.height = outHeight || 520;
  var ctx = canvas.getContext("2d");
  var w = canvas.width, h = canvas.height;
  var pad = 24, cardW = (w - pad * 2 - 44) / 2, cardH = h - pad * 2;
  var leftX = pad, rightX = pad + cardW + 44;
  var cardY = pad;
  var radius = 12;

  var bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, "#002359");
  bgGrad.addColorStop(0.42, "#002D72");
  bgGrad.addColorStop(0.78, "#CCECF9");
  bgGrad.addColorStop(1, "#ffffff");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  function roundRect(x, y, width, height, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* Hvite kort på gradientbakgrunn (samme uttrykk som på skjerm) */
  ctx.fillStyle = "#FFFFFF";
  roundRect(leftX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 45, 114, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(rightX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.stroke();

  var eqCenterX = leftX + cardW + 22;
  var eqCenterY = cardY + cardH / 2;
  ctx.fillStyle = "#002D72";
  ctx.beginPath();
  ctx.arc(eqCenterX, eqCenterY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#99D9F2";
  ctx.font = "700 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("=", eqCenterX, eqCenterY);

  var innerPad = 20;
  var barLeft = 120;
  var barWidth = 140;
  var valueLeft = barLeft + barWidth + 12;
  var contentH = cardH - innerPad * 2;

  function drawCard(segs, cardX) {
    var totalVal = segs.reduce(function (s, seg) { return s + (seg.value || 0); }, 0) || 1;
    var y = cardY + innerPad;
    ctx.font = "500 14px sans-serif";
    ctx.fillStyle = "#002D72";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var segH = totalVal > 0 ? Math.max(2, (seg.value / totalVal) * contentH) : contentH / segs.length;
      var segTop = y;
      y += segH;

      ctx.fillStyle = seg.color || "#E5E7EB";
      var r = 12;
      var segR = segH < r * 2 ? Math.max(0, segH / 2 - 0.5) : r;
      ctx.beginPath();
      if (segs.length === 1) {
        roundRect(cardX + innerPad + barLeft, segTop, barWidth, segH, segR);
      } else if (i === 0) {
        ctx.moveTo(cardX + innerPad + barLeft + r, segTop);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth - r, segTop);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft + barWidth, segTop, cardX + innerPad + barLeft + barWidth, segTop + r);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth, segTop + segH);
        ctx.lineTo(cardX + innerPad + barLeft, segTop + segH);
        ctx.lineTo(cardX + innerPad + barLeft, segTop + r);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft, segTop, cardX + innerPad + barLeft + r, segTop);
      } else if (i === segs.length - 1) {
        ctx.moveTo(cardX + innerPad + barLeft + segR, segTop + segH);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth - segR, segTop + segH);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft + barWidth, segTop + segH, cardX + innerPad + barLeft + barWidth, segTop + segH - segR);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth, segTop);
        ctx.lineTo(cardX + innerPad + barLeft, segTop);
        ctx.lineTo(cardX + innerPad + barLeft, segTop + segH - segR);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft, segTop + segH, cardX + innerPad + barLeft + segR, segTop + segH);
      } else {
        ctx.rect(cardX + innerPad + barLeft, segTop, barWidth, segH);
      }
      ctx.closePath();
      ctx.fill();

      var cy = segTop + segH / 2;
      if (segH >= 18) {
        ctx.fillStyle = "#002D72";
        ctx.textAlign = "left";
        var lines = labelLines(seg.key);
        var lineHeight = 16;
        var totalLabelH = lines.length * lineHeight;
        var startY = cy - (totalLabelH - lineHeight) / 2 - lineHeight / 2;
        for (var L = 0; L < lines.length; L++) {
          ctx.fillText(lines[L], cardX + innerPad + 4, startY + L * lineHeight + lineHeight / 2);
        }
        ctx.textAlign = "right";
        ctx.fillStyle = "#333333";
        ctx.fillText(valueLabel(seg.value), cardX + innerPad + valueLeft + barWidth - 4, cy);
      }
    }
  }

  drawCard(assetSegs, leftX);
  drawCard(financingSegs, rightX);

  return canvas;
}

if (typeof window !== "undefined") {
  window.renderTKontoChartToCanvas = renderTKontoChartToCanvas;
}

// --- Fremtiden modul ---
function renderFutureModule(root) {
  root.innerHTML = "";
  const currentNav = document.querySelector(".nav-item.is-active");
  const currentSection = currentNav ? (currentNav.getAttribute("data-section") || currentNav.textContent || "") : "";

  // T-Konto-fanen: søylediagram i plassholder + horisontal år-boks
  if (currentSection === "T-Konto") {
    const placeholder = document.createElement("div");
    placeholder.id = "t-konto-graphic-placeholder";
    placeholder.className = "t-konto-graphic-placeholder";
    root.appendChild(placeholder);

    buildTKontoBarChart(placeholder, 2025);

    const yearStrip = document.createElement("div");
    yearStrip.className = "t-konto-year-strip";
    yearStrip.setAttribute("aria-label", "Velg år");
    const yearInner = document.createElement("div");
    yearInner.className = "t-konto-year-buttons";
    // Knapp "start" før første år (tilsvarer start-indeksen i Mål og behov sine arrays)
    // Bruker yearVal = 2025 slik at år-avstand (year - 2025) blir 0.
    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "t-konto-year-btn";
    startBtn.textContent = "start";
    startBtn.setAttribute("data-year", "2025");
    startBtn.setAttribute("aria-label", "Velg start");
    startBtn.classList.add("is-active"); // default: vis "start"
    yearInner.appendChild(startBtn);

    for (let year = 2026; year <= 2040; year++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "t-konto-year-btn";
      btn.textContent = String(year);
      btn.setAttribute("data-year", String(year));
      btn.setAttribute("aria-label", "Velg år " + year);
      // Ikke marker 2026 som aktiv ved start (start er default)
      yearInner.appendChild(btn);
    }
    yearStrip.appendChild(yearInner);
    const scrollHint = document.createElement("span");
    scrollHint.className = "t-konto-year-strip-scroll-hint";
    scrollHint.setAttribute("aria-hidden", "true");
    scrollHint.innerHTML = "&#9660;";
    yearStrip.appendChild(scrollHint);
    root.appendChild(yearStrip);

    yearInner.querySelectorAll(".t-konto-year-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        yearInner.querySelectorAll(".t-konto-year-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const y = parseInt(btn.getAttribute("data-year"), 10);
        buildTKontoBarChart(placeholder, y);
      });
    });
    return;
  }

  const assets = AppState.assets || [];
  const debts = AppState.debts || [];
  const blueScale = ["#2A4D80", "#355F9E", "#60A5FA", "#00A9E0", "#294269", "#203554"];

  const graphWrap = document.createElement("div");
  graphWrap.style.position = "relative";
  graphWrap.style.width = "100%";
  graphWrap.style.maxWidth = "1180px";
  graphWrap.style.margin = "0 auto";
  root.appendChild(graphWrap);

  // Trigger-knapper er skjult siden boksene nå har knappfunksjonalitet
  // Opprett knappene men skjul dem
  const btn = document.createElement("button");
  btn.className = "gi-trigger";
  btn.style.cssText = "display: none !important;";
  btn.setAttribute("aria-hidden", "true");

  const btnSecondary = document.createElement("button");
  btnSecondary.className = "gi-trigger";
  btnSecondary.style.cssText = "display: none !important;";
  btnSecondary.setAttribute("aria-hidden", "true");

  const financingBtn = document.createElement("button");
  financingBtn.className = "gi-trigger";
  financingBtn.style.cssText = "display: none !important;";
  financingBtn.setAttribute("aria-hidden", "true");

  const financingBtnSecondary = document.createElement("button");
  financingBtnSecondary.className = "gi-trigger";
  financingBtnSecondary.style.cssText = "display: none !important;";
  financingBtnSecondary.setAttribute("aria-hidden", "true");

  let selectedYear = 2026;
  
  function draw(yearVal) {
    let assetCategories = computeAssetProjection(yearVal);
    
    // Hvis gruppert visning er aktivert, grupper eiendeler etter entitet
    if (AppState.tKontoViewMode === "grouped") {
      const groupedByEntity = {};
      
      assets.forEach((a, idx) => {
        const projected = assetCategories[idx];
        const value = projected ? projected.value : (a.amount || 0);
        const entity = a.entity || "privat";
        
        if (!groupedByEntity[entity]) {
          groupedByEntity[entity] = { value: 0, name: "" };
        }
        groupedByEntity[entity].value += value;
        
        groupedByEntity[entity].name = getEntityDisplayName(entity);
      });
      
      // Konverter til array med farger
      assetCategories = [];
      Object.keys(groupedByEntity).forEach((entity) => {
        const group = groupedByEntity[entity];
        if (group.value > 0) {
          let color;
          if (isPrivatEntity(entity)) {
            color = "#60A5FA"; // Mild blå for Privat
          } else {
            color = "#93C5FD"; // Mildere blå for AS (samme palett)
          }
          assetCategories.push({
            key: group.name,
            value: group.value,
            color: color
          });
        }
      });
    }
    
    const totalAssets = assetCategories.reduce((s, x) => s + x.value, 0);
    const remDebt = remainingDebtTotalForYear(yearVal);
    const debtVal = Math.min(remDebt, totalAssets);
    const equityVal = Math.max(0, totalAssets - remDebt);
    
    // Del opp gjeld i separate segmenter hvis det er flere gjeldsposter
    const financingParts = [];
    if (debts.length === 1) {
      if (debtVal > 0) {
        financingParts.push({ key: "Gjeld", value: debtVal, color: "#FCA5A5" });
      }
    } else if (debts.length > 1) {
      // Hvis flere gjeldsposter, beregn andel for hver gjeldspost basert på gjeldende år
      const debtScale = ["#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C"]; // Mildere rødskala
      const totalRemDebt = remDebt;
      debts.forEach((debt, idx) => {
        if (totalRemDebt > 0) {
          const remForDebt = remainingBalanceForDebtInYear(debt, yearVal);
          const debtProportion = remForDebt / totalRemDebt;
          const debtAmount = Math.min(debtVal * debtProportion, debtVal);
          if (debtAmount > 0) {
            financingParts.push({
              key: String(debt.name || `Gjeld ${idx + 1}`),
              value: debtAmount,
              color: debtScale[idx % debtScale.length]
            });
          }
        }
      });
    }
    financingParts.push({ key: "Egenkapital", value: equityVal, color: "#86EFAC" });
    graphWrap.innerHTML = "";
    
    // Resize container for grafikken
    const resizeContainer = document.createElement("div");
    resizeContainer.className = "t-konto-resize-container";
    
    // Hent lagret størrelse eller bruk standard
    const savedWidth = AppState.tKontoGraphWidth || null;
    const savedHeight = AppState.tKontoGraphHeight || null;
    if (savedWidth) {
      resizeContainer.style.width = savedWidth;
    } else {
      resizeContainer.style.width = "100%";
    }
    if (savedHeight) {
      resizeContainer.style.height = savedHeight;
    } else {
      // Standard høyde basert på aspect ratio (1200:840)
      resizeContainer.style.height = "auto";
      resizeContainer.style.aspectRatio = "1200 / 840";
    }
    
    const svgElement = buildFinanceSVG(assetCategories, financingParts, totalAssets, yearVal, null, false);
    // Sett høyde til 100% for å fylle containeren
    svgElement.style.height = "100%";
    resizeContainer.appendChild(svgElement);
    
    // Resize handle (drahåndtak) i nedre høyre hjørne
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "t-konto-resize-handle";
    resizeHandle.setAttribute("aria-label", "Dra for å endre størrelse");
    resizeHandle.setAttribute("title", "Dra for å endre størrelse");
    
    // SVG-ikon for resize handle (tre diagonale linjer)
    const resizeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    resizeIcon.setAttribute("width", "16");
    resizeIcon.setAttribute("height", "16");
    resizeIcon.setAttribute("viewBox", "0 0 16 16");
    resizeIcon.style.display = "block";
    // Tre diagonale linjer som danner et resize-ikon
    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", "2");
    line1.setAttribute("y1", "14");
    line1.setAttribute("x2", "14");
    line1.setAttribute("y2", "2");
    line1.setAttribute("stroke", "#94a3b8");
    line1.setAttribute("stroke-width", "1.5");
    line1.setAttribute("stroke-linecap", "round");
    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "6");
    line2.setAttribute("y1", "14");
    line2.setAttribute("x2", "14");
    line2.setAttribute("y2", "6");
    line2.setAttribute("stroke", "#94a3b8");
    line2.setAttribute("stroke-width", "1.5");
    line2.setAttribute("stroke-linecap", "round");
    const line3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line3.setAttribute("x1", "10");
    line3.setAttribute("y1", "14");
    line3.setAttribute("x2", "14");
    line3.setAttribute("y2", "10");
    line3.setAttribute("stroke", "#94a3b8");
    line3.setAttribute("stroke-width", "1.5");
    line3.setAttribute("stroke-linecap", "round");
    resizeIcon.appendChild(line1);
    resizeIcon.appendChild(line2);
    resizeIcon.appendChild(line3);
    resizeHandle.appendChild(resizeIcon);
    
    resizeContainer.appendChild(resizeHandle);
    graphWrap.appendChild(resizeContainer);
    
    // Resize funksjonalitet
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = resizeContainer.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      document.body.style.cursor = "nwse-resize";
      document.body.style.userSelect = "none";
    });
    
    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      e.preventDefault();
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const newWidth = Math.max(400, Math.min(1180, startWidth + deltaX)); // Minimum 400px, maksimum 1180px
      const newHeight = Math.max(300, startHeight + deltaY); // Minimum 300px
      resizeContainer.style.width = `${newWidth}px`;
      resizeContainer.style.height = `${newHeight}px`;
      resizeContainer.style.aspectRatio = "none"; // Tillat uavhengig endring av bredde og høyde
      // Lagre størrelse
      AppState.tKontoGraphWidth = `${newWidth}px`;
      AppState.tKontoGraphHeight = `${newHeight}px`;
    });
    
    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    });
    
    // Knappene er skjult siden boksene nå har knappfunksjonalitet
    // graphWrap.appendChild(btn);
    // graphWrap.appendChild(btnSecondary);
    // graphWrap.appendChild(financingBtn);
    // graphWrap.appendChild(financingBtnSecondary);

    // Ikke oppdater verdiene i T-Konto visning - kortene skal være tomme
    // Verdiene blir håndtert av updateCardsForTKonto()
  }

  // Initial draw
  draw(selectedYear);

  // År-knapper under grafikken (Fremtidig utvikling m.fl.)
  {
    const wrap = document.createElement("div");
    wrap.className = "year-buttons-card";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "year-toggle-btn";
    toggleBtn.setAttribute("aria-label", "Skjul/vise år-knapper");
    toggleBtn.innerHTML = "▼";
    toggleBtn.title = "Skjul år-knapper";

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "year-buttons-container";
    
    let isVisible = true;
    toggleBtn.addEventListener("click", () => {
      isVisible = !isVisible;
      buttonContainer.style.display = isVisible ? "flex" : "none";
      toggleBtn.innerHTML = isVisible ? "▼" : "▲";
      toggleBtn.title = isVisible ? "Skjul år-knapper" : "Vis år-knapper";
    });
    
    for (let year = 2026; year <= 2040; year++) {
      const yearBtn = document.createElement("button");
      yearBtn.className = "year-button";
      yearBtn.textContent = String(year);
      yearBtn.setAttribute("data-year", String(year));
      yearBtn.setAttribute("aria-label", `Velg år ${year}`);
      
      // Marker 2026 som aktiv ved start (ikke-treemap)
      if (year === 2026) {
        yearBtn.classList.add("is-active");
      }
      
      yearBtn.addEventListener("click", () => {
        buttonContainer.querySelectorAll(".year-button").forEach(btn => {
          btn.classList.remove("is-active");
        });
        yearBtn.classList.add("is-active");
        selectedYear = year;
        draw(year);
      });
      
      buttonContainer.appendChild(yearBtn);
    }
    
    wrap.appendChild(toggleBtn);
    wrap.appendChild(buttonContainer);
    root.appendChild(wrap);
  }
}

function attachTooltip(svg, target, title, value, percentText, options) {
  const svgNS = "http://www.w3.org/2000/svg";
  const opts = options || {};
  let tip;
  function ensureTip() {
    if (tip) return tip;
    tip = document.createElementNS(svgNS, "g");
    tip.setAttribute("visibility", "hidden");
    tip.setAttribute("pointer-events", "none");
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("rx", "12"); bg.setAttribute("ry", "12");
    bg.setAttribute("fill", "#FFFFFF");
    bg.setAttribute("stroke", "#E2E8F0");
    bg.setAttribute("filter", "url(#cardShadow)");
    const t1 = document.createElementNS(svgNS, "text"); 
    t1.setAttribute("fill", "#334155"); 
    t1.setAttribute("font-size", "14");
    t1.setAttribute("font-weight", "400");
    t1.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    const t2 = document.createElementNS(svgNS, "text"); 
    t2.setAttribute("fill", "#677788");
    t2.setAttribute("font-size", "14");
    t2.setAttribute("font-weight", "400");
    t2.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    const t3 = document.createElementNS(svgNS, "text"); 
    t3.setAttribute("fill", "#677788");
    t3.setAttribute("font-size", "14");
    t3.setAttribute("font-weight", "400");
    t3.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    tip.appendChild(bg); tip.appendChild(t1); tip.appendChild(t2); tip.appendChild(t3);
    svg.appendChild(tip);
    tip.bg = bg; tip.t1 = t1; tip.t2 = t2; tip.t3 = t3;
    return tip;
  }
  function show(e) {
    const t = ensureTip();
    const valueText = typeof opts.valueLabel === "string"
      ? opts.valueLabel
      : typeof opts.valueFormatter === "function"
        ? opts.valueFormatter(value, percentText)
        : `Verdi: ${formatNOK(value)}`;
    const percentLine = opts.percentLabel !== undefined
      ? opts.percentLabel
      : `Andel: ${percentText} av total`;
    const titleText = typeof opts.titleLabel === "string" ? opts.titleLabel : title;
    t.t1.textContent = titleText;
    t.t2.textContent = valueText;
    t.t3.textContent = percentLine || "";
    t.t3.setAttribute("display", percentLine ? "inline" : "none");
    t.setAttribute("visibility", "visible");
    position(e);
  }
  function hide() { if (tip) tip.setAttribute("visibility", "hidden"); }
  function position(e) {
    const rect = svg.getBoundingClientRect();
    const vb = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
    const vbW = vb.length === 4 ? vb[2] : 1200;
    const vbH = vb.length === 4 ? vb[3] : 700;
    const scaleX = vbW / rect.width;
    const scaleY = vbH / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const padding = 12;
    const t = ensureTip();
    // layout texts
    const baseY = y - 8;
    t.t1.setAttribute("x", String(x + padding)); t.t1.setAttribute("y", String(baseY));
    t.t2.setAttribute("x", String(x + padding)); t.t2.setAttribute("y", String(baseY + 18));
    t.t3.setAttribute("x", String(x + padding)); t.t3.setAttribute("y", String(baseY + 34));
    // measure
    const w = Math.max(t.t1.getBBox().width, t.t2.getBBox().width, t.t3.getBBox().width) + padding * 2;
    const h = 12 + 34 + padding; // approx
    t.bg.setAttribute("x", String(x));
    t.bg.setAttribute("y", String(baseY - 22));
    t.bg.setAttribute("width", String(w));
    t.bg.setAttribute("height", String(44));
  }
  target.addEventListener("mouseenter", show);
  target.addEventListener("mousemove", position);
  target.addEventListener("mouseleave", hide);
}

// --- Totalkapitalavkastning Modal ---
function openTotalCapitalReturnModal() {
  const modal = document.getElementById("total-capital-return-modal");
  const chartRoot = document.getElementById("total-capital-return-chart");
  if (!modal || !chartRoot) {
    console.error("Modal or chartRoot not found", { modal, chartRoot });
    return;
  }
  chartRoot.innerHTML = "";
  try {
    const svg = buildTotalCapitalReturnSVG(2027, 10);
    if (svg) {
      chartRoot.appendChild(svg);
    } else {
      throw new Error("buildTotalCapitalReturnSVG returned null/undefined");
    }
  } catch (e) {
    console.error("Error building total capital return SVG:", e);
    const p = document.createElement("p");
    p.textContent = `Kunne ikke bygge graf: ${String((e && e.message) || e)}`;
    chartRoot.appendChild(p);
  }
  modal.removeAttribute("hidden");
  const onKey = (ev) => { if (ev.key === "Escape") { closeTotalCapitalReturnModal(); } };
  document.addEventListener("keydown", onKey, { once: true });
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "true") {
      closeTotalCapitalReturnModal();
    }
  }, { once: true });
}
function closeTotalCapitalReturnModal() {
  const modal = document.getElementById("total-capital-return-modal");
  if (modal) modal.setAttribute("hidden", "");
}

// --- Grafikk I: Modal og utviklingsdiagram ---
function openGiModal() {
  const modal = document.getElementById("gi-modal");
  const chartRoot = document.getElementById("gi-chart");
  if (!modal || !chartRoot) return;
  chartRoot.innerHTML = "";
  try {
    chartRoot.appendChild(buildAssetsGrowthSVG(2026, 10));
  } catch (e) {
    const p = document.createElement("p");
    p.textContent = `Kunne ikke bygge graf: ${String(e && e.message || e)}`;
    chartRoot.appendChild(p);
  }
  modal.removeAttribute("hidden");
  const onKey = (ev) => { if (ev.key === "Escape") { closeGiModal(); } };
  document.addEventListener("keydown", onKey, { once: true });
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "true") {
      closeGiModal();
    }
  }, { once: true });
}
function closeGiModal() {
  const modal = document.getElementById("gi-modal");
  if (modal) modal.setAttribute("hidden", "");
}

// --- Finansiering Modal ---
function openFinancingModal() {
  const modal = document.getElementById("financing-modal");
  const chartRoot = document.getElementById("financing-chart");
  if (!modal || !chartRoot) return;
  chartRoot.innerHTML = "";
  try {
    chartRoot.appendChild(buildFinancingGrowthSVG(2026, 10));
  } catch (e) {
    const p = document.createElement("p");
    p.textContent = `Kunne ikke bygge graf: ${String(e && e.message || e)}`;
    chartRoot.appendChild(p);
  }
  modal.removeAttribute("hidden");
  const onKey = (ev) => { if (ev.key === "Escape") { closeFinancingModal(); } };
  document.addEventListener("keydown", onKey, { once: true });
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "true") {
      closeFinancingModal();
    }
  }, { once: true });
}
function closeFinancingModal() {
  const modal = document.getElementById("financing-modal");
  if (modal) modal.setAttribute("hidden", "");
}

// --- Egenkapitalavkastning Modal ---
function openEquityReturnModal() {
  const modal = document.getElementById("equity-return-modal");
  const chartRoot = document.getElementById("equity-return-chart");
  if (!modal || !chartRoot) return;
  chartRoot.innerHTML = "";
  try {
    chartRoot.appendChild(buildEquityReturnSVG(2027, 10));
  } catch (e) {
    const p = document.createElement("p");
    p.textContent = `Kunne ikke bygge graf: ${String((e && e.message) || e)}`;
    chartRoot.appendChild(p);
  }
  modal.removeAttribute("hidden");
  const onKey = (ev) => { if (ev.key === "Escape") { closeEquityReturnModal(); } };
  document.addEventListener("keydown", onKey, { once: true });
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "true") {
      closeEquityReturnModal();
    }
  }, { once: true });
}
function closeEquityReturnModal() {
  const modal = document.getElementById("equity-return-modal");
  if (modal) modal.setAttribute("hidden", "");
}
function buildAssetsGrowthSVG(startYear, yearsCount) {
  const years = Array.from({ length: yearsCount }, (_, i) => startYear + i);
  const svgNS = "http://www.w3.org/2000/svg";
  const vbW = 1180, vbH = 520;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";

  // Styles for tooltip and other text elements
  const style = document.createElementNS(svgNS, "style");
  style.textContent = `
    .t-label { font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 500; font-size: 14px; fill: #334155; }
    .t-value { font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 700; font-size: 13px; fill: #677788; }
  `;
  svg.appendChild(style);

  // Bg
  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(vbW)); bg.setAttribute("height", String(vbH));
  bg.setAttribute("fill", "#F2F4F7");
  svg.appendChild(bg);

  // Padding/plot area
  const padL = 80, padR = 24, padT = 24, padB = 84; // ekstra bunnplass til forklaring
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  // Gather data
  const perYear = years.map((y) => computeAssetProjection(y));
  const totals = perYear.map((arr) => arr.reduce((s, x) => s + (x.value || 0), 0));
  const maxTotal = Math.max(1, ...totals);

  // Axis grid (5 ticks)
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const y = padT + plotH - (i / ticks) * plotH;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(padL));
    line.setAttribute("x2", String(padL + plotW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "#E8EBF3");
    svg.appendChild(line);
    const val = (maxTotal * (i / ticks));
    const lab = document.createElementNS(svgNS, "text");
    lab.setAttribute("x", String(padL - 10));
    lab.setAttribute("y", String(y + 4));
    lab.setAttribute("text-anchor", "end");
    lab.setAttribute("fill", "#677788");
    lab.setAttribute("font-size", "16");
    lab.textContent = formatAxisValue(val);
    svg.appendChild(lab);
  }
  // Fjernet y-aksenheten (MNOK) for å gi mer plass øverst

  // Bars
  const count = years.length;
  const gap = 12;
  const barW = Math.max(24, Math.floor((plotW - gap * (count - 1)) / count));
  const xAt = (i) => padL + i * (barW + gap);
  const isDark = (hex) => {
    const v = hex.replace('#','');
    const r = parseInt(v.substring(0,2),16);
    const g = parseInt(v.substring(2,4),16);
    const b = parseInt(v.substring(4,6),16);
    // relative luminance
    const L = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return L < 0.5;
  };
  const shortName = (s) => {
    const t = String(s || "").toUpperCase();
    if (t.length <= 10) return t;
    return t.slice(0, 9) + "…";
  };
  perYear.forEach((segments, i) => {
    const total = totals[i] || 1;
    let cursorY = padT + plotH;
    
    // Beregn prosentandeler først for å kunne justere høyder
    const segmentsWithPct = segments.map(seg => ({
      ...seg,
      pct: total > 0 ? (seg.value / total) * 100 : 0
    }));
    
    // Minimumshøyde for alle kategorier (ikke bare de under 3%)
    const minHeightPx = 24; // Minimumshøyde i piksler for lesbarhet
    
    // Beregn base-høyder først
    const baseHeights = segmentsWithPct.map(seg => {
      return total > 0 ? Math.max(1, Math.round((seg.value / maxTotal) * plotH)) : 1;
    });
    
    // Bruk minimumshøyde for alle segmenter som har verdi > 0
    const adjustedHeights = segmentsWithPct.map((seg, idx) => {
      if (seg.value > 0) {
        return Math.max(minHeightPx, baseHeights[idx]);
      }
      return baseHeights[idx];
    });
    
    // Beregn total justert høyde
    const totalAdjustedHeight = adjustedHeights.reduce((sum, h) => sum + h, 0);
    
    // Skaler ned hvis totalen overstiger plotH
    let scaleFactor = 1;
    if (totalAdjustedHeight > plotH) {
      scaleFactor = plotH / totalAdjustedHeight;
    }
    
    // draw each asset segment bottom-up, keep same order as assets array
    segmentsWithPct.forEach((seg, segIdx) => {
      let h = adjustedHeights[segIdx];
      
      // Skaler hvis nødvendig, men beholde minimumshøyde
      if (scaleFactor < 1) {
        const scaledH = Math.round(h * scaleFactor);
        // Hvis segmentet har verdi, sikre minimumshøyde selv etter skalering
        if (seg.value > 0) {
          h = Math.max(minHeightPx, scaledH);
        } else {
          h = Math.max(1, scaledH);
        }
      }
      
      const y = cursorY - h;
      cursorY = y;
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", String(xAt(i)));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(barW));
      rect.setAttribute("height", String(h));
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", seg.color);
      rect.setAttribute("fill-opacity", "0.9");
      rect.setAttribute("stroke", "#E8EBF3");
      rect.setAttribute("stroke-width", "1");
      svg.appendChild(rect);
      const pct = `${Math.round(seg.pct)} %`;
      attachTooltip(svg, rect, String(seg.key || "").toUpperCase(), Math.round(seg.value), pct);

      // Tekst inne i søyle-segmentet: kun prosent - alltid midtstilt i søylen
      const textColor = isDark(seg.color) ? "#ffffff" : "#0f172a";
      const cx = xAt(i) + barW / 2;
      const cyMid = y + Math.round(h / 2);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", String(cx));
      t.setAttribute("y", String(cyMid + 4));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", textColor);
      
      // Juster skriftstørrelse basert på antall eiendeler og segmenthøyde
      const numAssets = segments.length;
      let fontSize = 11;
      if (numAssets > 4 || h < 15) {
        fontSize = 9; // Mindre skrift når det er mange eiendeler eller liten høyde
      } else if (h < 22) {
        fontSize = 10; // Litt mindre for mellomstore segmenter
      }
      
      t.setAttribute("font-size", String(fontSize));
      t.setAttribute("font-weight", "700");
      t.textContent = pct.replace(' %','%');
      svg.appendChild(t);
    });
    // x-axis year label - midtstilt
    const xl = document.createElementNS(svgNS, "text");
    xl.setAttribute("x", String(xAt(i) + barW / 2));
    xl.setAttribute("y", String(padT + plotH + 18));
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("fill", "#677788");
    xl.setAttribute("font-size", "16");
    xl.textContent = String(years[i]);
    svg.appendChild(xl);
  });

  // Forklaringsvariabler (legend) horisontalt under grafikken
  const legendItems = (perYear[0] || []).map(s => ({ key: s.key, color: s.color }));
  if (legendItems.length > 0) {
    const g = document.createElementNS(svgNS, "g");
    svg.appendChild(g);
    const mark = 12, gapInner = 10;
    // Pre-build items
    const temp = legendItems.map(li => {
      const group = document.createElementNS(svgNS, "g");
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", "0"); r.setAttribute("y", String(vbH - 30));
      r.setAttribute("width", String(mark)); r.setAttribute("height", String(mark));
      r.setAttribute("rx", "3");
      r.setAttribute("fill", li.color);
      r.setAttribute("fill-opacity", "0.9");
      r.setAttribute("stroke", "#E8EBF3");
      group.appendChild(r);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", String(mark + gapInner));
      t.setAttribute("y", String(vbH - 20));
      t.setAttribute("fill", "#334155");
      t.setAttribute("font-size", "12");
      t.setAttribute("font-weight", "600");
      t.textContent = li.key;
      group.appendChild(t);
      g.appendChild(group);
      const width = group.getBBox().width;
      return { group, width };
    });
    // Grid layout with centered cells and tighter spacing
    const availW = vbW - padL - padR;
    const maxItemW = Math.max(...temp.map(it => it.width));
    // compute a compact column width that still fits the widest item + padding
    const minColW = Math.max(90, Math.ceil(maxItemW + 16)); // roughly half the previous spacing
    let cols = Math.max(1, Math.floor(availW / minColW));
    cols = Math.min(cols, legendItems.length);
    const rowsCount = Math.ceil(legendItems.length / cols);
    const colW = availW / cols;
    const rowHeight = 26; // slightly tighter vertically
    // position the entire grid area under the plot, shifted left
    const centerOffset = Math.round((availW - Math.floor(colW) * cols) / 2);
    const gridLeft = padL + centerOffset - 40; // flytt 40px til venstre
    // Position items in a grid centered within each cell
    temp.forEach((it, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const cellX = gridLeft + Math.round(col * colW);
      const tx = cellX + Math.round((colW - it.width) / 2);
      const dy = -((rowsCount - 1 - row) * rowHeight);
      it.group.setAttribute("transform", `translate(${tx},${dy})`);
    });
  }
  return svg;
}

function buildEquityReturnSVG(startYear, yearsCount) {
  const years = Array.from({ length: yearsCount }, (_, i) => startYear + i);
  const svgNS = "http://www.w3.org/2000/svg";
  const vbW = 1180, vbH = 520;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(vbW));
  bg.setAttribute("height", String(vbH));
  bg.setAttribute("fill", "#F2F4F7");
  svg.appendChild(bg);

  const padL = 80;
  const padR = 24;
  const padT = 40;
  const padB = 84;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  // Beregn equityValues for startYear-1 også (for å kunne beregne første årets avkastning)
  const prevYearValue = computeEquityValue(startYear - 1);
  const equityValues = years.map((year) => computeEquityValue(year));
  const returns = years.map((year, idx) => {
    const prev = idx === 0 ? prevYearValue : equityValues[idx - 1];
    if (prev <= 0) return 0;
    return ((equityValues[idx] / prev) - 1) * 100;
  });

  const firstYearReturn = returns[0] || 0;
  let domainMax = Math.max(0, ...returns);
  // Sørg for at domainMax er minst 2 prosentpoeng høyere enn første årets verdi
  domainMax = Math.max(domainMax, firstYearReturn + 2);
  let domainMin = Math.min(0, ...returns);
  if (domainMax - domainMin < 5) {
    const pad = 5 - (domainMax - domainMin);
    domainMax += pad / 2;
    domainMin -= pad / 2;
  }
  if (!Number.isFinite(domainMax)) domainMax = 10;
  if (!Number.isFinite(domainMin)) domainMin = 0;
  const domainRange = Math.max(1, domainMax - domainMin);
  const scaleY = plotH / domainRange;
  const yFor = (value) => padT + (domainMax - value) * scaleY;
  const zeroY = yFor(0);


  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const value = domainMin + (domainRange * (i / ticks));
    const y = yFor(value);
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(padL));
    line.setAttribute("x2", String(padL + plotW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", value === 0 ? "#CBD5F5" : "#E2E8F0");
    line.setAttribute("stroke-dasharray", value === 0 ? "4 2" : "2 4");
    svg.appendChild(line);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(padL - 12));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "14");
    label.setAttribute("fill", "#475569");
    label.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    label.textContent = formatPercent(value);
    svg.appendChild(label);
  }

  const xAxis = document.createElementNS(svgNS, "line");
  xAxis.setAttribute("x1", String(padL));
  xAxis.setAttribute("x2", String(padL + plotW));
  xAxis.setAttribute("y1", String(zeroY));
  xAxis.setAttribute("y2", String(zeroY));
  xAxis.setAttribute("stroke", "#94A3B8");
  xAxis.setAttribute("stroke-width", "1.5");
  svg.appendChild(xAxis);

  const gap = 16;
  const count = years.length;
  const barWidth = Math.max(30, Math.floor((plotW - gap * (count - 1)) / count));
  const xAt = (idx) => padL + idx * (barWidth + gap);

  years.forEach((year, idx) => {
    const ret = returns[idx];
    const equity = equityValues[idx];
    const barColor = ret >= 0 ? "#3B82F6" : "#EF4444";
    const yValue = yFor(ret);
    const height = Math.max(1, Math.abs(zeroY - yValue));
    const topY = ret >= 0 ? yValue : zeroY;
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", String(xAt(idx)));
    rect.setAttribute("y", String(topY));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(height));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", barColor);
    rect.setAttribute("opacity", "0.9");
    rect.setAttribute("stroke", ret >= 0 ? "#2563EB" : "#DC2626");
    rect.setAttribute("stroke-width", "1");
    svg.appendChild(rect);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(xAt(idx) + barWidth / 2));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "13");
    label.setAttribute("font-weight", "600");
    label.setAttribute("fill", "#1E293B");
    label.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    label.textContent = formatPercent(ret);
    const labelOffset = height < 16 ? 18 : 10;
    if (ret >= 0) {
      label.setAttribute("y", String(Math.max(padT + 12, topY - labelOffset)));
    } else {
      label.setAttribute("y", String(Math.min(padT + plotH + 40, topY + height + labelOffset)));
    }
    svg.appendChild(label);

    const yearLabel = document.createElementNS(svgNS, "text");
    yearLabel.setAttribute("x", String(xAt(idx) + barWidth / 2));
    yearLabel.setAttribute("y", String(padT + plotH + 32));
    yearLabel.setAttribute("text-anchor", "middle");
    yearLabel.setAttribute("font-size", "14");
    yearLabel.setAttribute("fill", "#334155");
    yearLabel.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    yearLabel.textContent = String(year);
    svg.appendChild(yearLabel);

    attachTooltip(svg, rect, `År ${year}`, equity, formatPercent(ret), {
      valueLabel: `Avkastning: ${formatPercent(ret)}`,
      percentLabel: `Egenkapital: ${formatNOK(Math.round(equity))}`
    });
  });
  return svg;
}

// Hjelpefunksjon for å beregne totale eiendeler for et år
function computeTotalAssets(yearVal) {
  const assetCategories = computeAssetProjection(yearVal);
  return assetCategories.reduce((sum, item) => sum + (item.value || 0), 0);
}

function buildTotalCapitalReturnSVG(startYear, yearsCount) {
  const years = Array.from({ length: yearsCount }, (_, i) => startYear + i);
  const svgNS = "http://www.w3.org/2000/svg";
  const vbW = 1180, vbH = 520;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(vbW));
  bg.setAttribute("height", String(vbH));
  bg.setAttribute("fill", "#F2F4F7");
  svg.appendChild(bg);

  const padL = 80;
  const padR = 24;
  const padT = 40;
  const padB = 84;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  // Beregn totale eiendeler for startYear-1 også (for å kunne beregne første årets avkastning)
  const prevYearTotalAssets = computeTotalAssets(startYear - 1);
  const totalAssetsValues = years.map((year) => computeTotalAssets(year));
  const returns = years.map((year, idx) => {
    const prev = idx === 0 ? prevYearTotalAssets : totalAssetsValues[idx - 1];
    if (prev <= 0) return 0;
    return ((totalAssetsValues[idx] / prev) - 1) * 100;
  });

  const firstYearReturn = returns[0] || 0;
  let domainMax = Math.max(0, ...returns);
  // Sørg for at domainMax er minst 2 prosentpoeng høyere enn første årets verdi
  domainMax = Math.max(domainMax, firstYearReturn + 2);
  let domainMin = Math.min(0, ...returns);
  if (domainMax - domainMin < 5) {
    const pad = 5 - (domainMax - domainMin);
    domainMax += pad / 2;
    domainMin -= pad / 2;
  }
  if (!Number.isFinite(domainMax)) domainMax = 10;
  if (!Number.isFinite(domainMin)) domainMin = 0;
  const domainRange = Math.max(1, domainMax - domainMin);
  const scaleY = plotH / domainRange;
  const yFor = (value) => padT + (domainMax - value) * scaleY;
  const zeroY = yFor(0);

  const title = document.createElementNS(svgNS, "text");
  title.setAttribute("x", String(padL + plotW / 2));
  title.setAttribute("y", String(padT - 12));
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "26");
  title.setAttribute("font-weight", "700");
  title.setAttribute("fill", "#1E293B");
  title.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
  title.textContent = "Totalkapitalavkastning % år for år";
  svg.appendChild(title);

  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const value = domainMin + (domainRange * (i / ticks));
    const y = yFor(value);
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(padL));
    line.setAttribute("x2", String(padL + plotW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", value === 0 ? "#CBD5F5" : "#E2E8F0");
    line.setAttribute("stroke-dasharray", value === 0 ? "4 2" : "2 4");
    svg.appendChild(line);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(padL - 12));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "14");
    label.setAttribute("fill", "#475569");
    label.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    label.textContent = formatPercent(value);
    svg.appendChild(label);
  }

  const xAxis = document.createElementNS(svgNS, "line");
  xAxis.setAttribute("x1", String(padL));
  xAxis.setAttribute("x2", String(padL + plotW));
  xAxis.setAttribute("y1", String(zeroY));
  xAxis.setAttribute("y2", String(zeroY));
  xAxis.setAttribute("stroke", "#94A3B8");
  xAxis.setAttribute("stroke-width", "1.5");
  svg.appendChild(xAxis);

  const gap = 16;
  const count = years.length;
  const barWidth = Math.max(30, Math.floor((plotW - gap * (count - 1)) / count));
  const xAt = (idx) => padL + idx * (barWidth + gap);

  years.forEach((year, idx) => {
    const ret = returns[idx];
    const totalAssets = totalAssetsValues[idx];
    const barColor = ret >= 0 ? "#3B82F6" : "#EF4444";
    const yValue = yFor(ret);
    const height = Math.max(1, Math.abs(zeroY - yValue));
    const topY = ret >= 0 ? yValue : zeroY;
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", String(xAt(idx)));
    rect.setAttribute("y", String(topY));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(height));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", barColor);
    rect.setAttribute("opacity", "0.9");
    rect.setAttribute("stroke", ret >= 0 ? "#2563EB" : "#DC2626");
    rect.setAttribute("stroke-width", "1");
    svg.appendChild(rect);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(xAt(idx) + barWidth / 2));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "13");
    label.setAttribute("font-weight", "600");
    label.setAttribute("fill", "#1E293B");
    label.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    label.textContent = formatPercent(ret);
    const labelOffset = height < 16 ? 18 : 10;
    if (ret >= 0) {
      label.setAttribute("y", String(Math.max(padT + 12, topY - labelOffset)));
    } else {
      label.setAttribute("y", String(Math.min(padT + plotH + 40, topY + height + labelOffset)));
    }
    svg.appendChild(label);

    const yearLabel = document.createElementNS(svgNS, "text");
    yearLabel.setAttribute("x", String(xAt(idx) + barWidth / 2));
    yearLabel.setAttribute("y", String(padT + plotH + 32));
    yearLabel.setAttribute("text-anchor", "middle");
    yearLabel.setAttribute("font-size", "14");
    yearLabel.setAttribute("fill", "#334155");
    yearLabel.setAttribute("font-family", "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    yearLabel.textContent = String(year);
    svg.appendChild(yearLabel);

    attachTooltip(svg, rect, `År ${year}`, totalAssets, formatPercent(ret), {
      valueLabel: `Avkastning: ${formatPercent(ret)}`,
      percentLabel: `Totale eiendeler: ${formatNOK(Math.round(totalAssets))}`
    });
  });
  return svg;
}

function formatAxisValue(v) {
  const mnok = v / 1_000_000;
  if (Math.abs(mnok) < 1e-4) return "0 M";
  const opts = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  };
  const formatted = new Intl.NumberFormat("nb-NO", opts).format(mnok);
  return `${formatted} M`;
}

// --- Finansiering utvikling grafikk ---
function buildFinancingGrowthSVG(startYear, yearsCount) {
  const years = Array.from({ length: yearsCount }, (_, i) => startYear + i);
  const svgNS = "http://www.w3.org/2000/svg";
  const vbW = 1180, vbH = 520;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";

  // Styles for tooltip and other text elements
  const style = document.createElementNS(svgNS, "style");
  style.textContent = `
    .t-label { font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 500; font-size: 14px; fill: #334155; }
    .t-value { font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 700; font-size: 13px; fill: #677788; }
  `;
  svg.appendChild(style);

  // Bg
  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(vbW)); bg.setAttribute("height", String(vbH));
  bg.setAttribute("fill", "#F2F4F7");
  svg.appendChild(bg);

  // Padding/plot area
  const padL = 80, padR = 24, padT = 24, padB = 84;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  // Gather data - beregn Egenkapital og Gjeld for hvert år
  const assets = AppState.assets || [];
  const debts = AppState.debts || [];
  
  function remainingDebtForYear(yearVal) {
    return debts.reduce((total, debt) => total + remainingBalanceForDebtInYear(debt, yearVal), 0);
  }

  // Hjelpefunksjon for å beregne gjenværende gjeld for en spesifikk gjeldspost
  function remainingDebtForDebt(debt, yearVal) {
    return remainingBalanceForDebtInYear(debt, yearVal);
  }

  const perYear = years.map((y) => {
    const assetCategories = computeAssetProjection(y);
    const totalAssets = assetCategories.reduce((s, x) => s + (x.value || 0), 0);
    const totalRemDebt = remainingDebtForYear(y);
    const totalDebtVal = Math.min(totalRemDebt, totalAssets);
    const equityVal = Math.max(0, totalAssets - totalDebtVal);
    
    // Del opp gjeld i separate segmenter hvis det er flere gjeldsposter
    const segments = [];
    if (debts.length === 1) {
      if (totalDebtVal > 0) {
        segments.push({ key: "Gjeld", value: totalDebtVal, color: "#FCA5A5" });
      }
    } else if (debts.length > 1) {
      // Hvis flere gjeldsposter, beregn andel for hver gjeldspost basert på gjeldende år
      const debtScale = ["#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C"]; // Mildere rødskala
      debts.forEach((debt, idx) => {
        const remDebtForThisDebt = remainingDebtForDebt(debt, y);
        if (totalRemDebt > 0) {
          const debtProportion = remDebtForThisDebt / totalRemDebt;
          const debtAmount = Math.min(totalDebtVal * debtProportion, totalDebtVal);
          if (debtAmount > 0) {
            segments.push({
              key: String(debt.name || `Gjeld ${idx + 1}`),
              value: debtAmount,
              color: debtScale[idx % debtScale.length]
            });
          }
        }
      });
    }
    segments.push({ key: "Egenkapital", value: equityVal, color: "#86EFAC" });
    return segments;
  });
  
  const totals = perYear.map((arr) => arr.reduce((s, x) => s + (x.value || 0), 0));
  const maxTotal = Math.max(1, ...totals);

  // Axis grid (5 ticks)
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const y = padT + plotH - (i / ticks) * plotH;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(padL));
    line.setAttribute("x2", String(padL + plotW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "#E8EBF3");
    svg.appendChild(line);
    const val = (maxTotal * (i / ticks));
    const lab = document.createElementNS(svgNS, "text");
    lab.setAttribute("x", String(padL - 10));
    lab.setAttribute("y", String(y + 4));
    lab.setAttribute("text-anchor", "end");
    lab.setAttribute("fill", "#677788");
    lab.setAttribute("font-size", "16");
    lab.textContent = formatAxisValue(val);
    svg.appendChild(lab);
  }

  // Bars
  const count = years.length;
  const gap = 12;
  const barW = Math.max(24, Math.floor((plotW - gap * (count - 1)) / count));
  const xAt = (i) => padL + i * (barW + gap);
  const isDark = (hex) => {
    const v = hex.replace('#','');
    const r = parseInt(v.substring(0,2),16);
    const g = parseInt(v.substring(2,4),16);
    const b = parseInt(v.substring(4,6),16);
    const L = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return L < 0.5;
  };

  perYear.forEach((segments, i) => {
    const total = totals[i] || 1;
    let cursorY = padT + plotH;
    
    // Beregn prosentandeler først for å kunne justere høyder
    const segmentsWithPct = segments.map(seg => ({
      ...seg,
      pct: total > 0 ? (seg.value / total) * 100 : 0
    }));
    
    // Minimumshøyde for alle kategorier (ikke bare de under 3%)
    const minHeightPx = 18; // Minimumshøyde i piksler for lesbarhet
    
    // Beregn base-høyder først
    const baseHeights = segmentsWithPct.map(seg => {
      return total > 0 ? Math.max(1, Math.round((seg.value / maxTotal) * plotH)) : 1;
    });
    
    // Bruk minimumshøyde for alle segmenter som har verdi > 0
    const adjustedHeights = segmentsWithPct.map((seg, idx) => {
      if (seg.value > 0) {
        return Math.max(minHeightPx, baseHeights[idx]);
      }
      return baseHeights[idx];
    });
    
    // Beregn total justert høyde
    const totalAdjustedHeight = adjustedHeights.reduce((sum, h) => sum + h, 0);
    
    // Skaler ned hvis totalen overstiger plotH
    let scaleFactor = 1;
    if (totalAdjustedHeight > plotH) {
      scaleFactor = plotH / totalAdjustedHeight;
    }
    
    // Tegn segmenter fra bunn til topp: Gjeld nederst, Egenkapital øverst
    segmentsWithPct.forEach((seg, segIdx) => {
      let h = adjustedHeights[segIdx];
      
      // Skaler hvis nødvendig, men beholde minimumshøyde
      if (scaleFactor < 1) {
        const scaledH = Math.round(h * scaleFactor);
        // Hvis segmentet har verdi, sikre minimumshøyde selv etter skalering
        if (seg.value > 0) {
          h = Math.max(minHeightPx, scaledH);
        } else {
          h = Math.max(1, scaledH);
        }
      }
      
      const y = cursorY - h;
      cursorY = y;
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", String(xAt(i)));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(barW));
      rect.setAttribute("height", String(h));
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", seg.color);
      rect.setAttribute("fill-opacity", "0.9");
      rect.setAttribute("stroke", "#E8EBF3");
      rect.setAttribute("stroke-width", "1");
      svg.appendChild(rect);
      const pct = `${Math.round(seg.pct)} %`;
      attachTooltip(svg, rect, String(seg.key || "").toUpperCase(), Math.round(seg.value), pct);

      // Tekst inne i søyle-segmentet: kun prosent - alltid midtstilt i søylen
      const textColor = isDark(seg.color) ? "#ffffff" : "#0f172a";
      const cx = xAt(i) + barW / 2;
      const cyMid = y + Math.round(h / 2);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", String(cx));
      t.setAttribute("y", String(cyMid + 4));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", textColor);
      
      // Juster skriftstørrelse basert på segmenthøyde
      let fontSize = 11;
      if (h < 15) {
        fontSize = 9;
      } else if (h < 22) {
        fontSize = 10;
      }
      
      t.setAttribute("font-size", String(fontSize));
      t.setAttribute("font-weight", "700");
      t.textContent = pct.replace(' %','%');
      svg.appendChild(t);
    });
    // x-axis year label - midtstilt
    const xl = document.createElementNS(svgNS, "text");
    xl.setAttribute("x", String(xAt(i) + barW / 2));
    xl.setAttribute("y", String(padT + plotH + 18));
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("fill", "#677788");
    xl.setAttribute("font-size", "16");
    xl.textContent = String(years[i]);
    svg.appendChild(xl);
  });

  // Forklaringsvariabler (legend) horisontalt under grafikken
  const legendItems = [];
  const hasAnyDebtInSeries = years.some((yy) => remainingDebtForYear(yy) > 0);
  if (debts.length === 1) {
    if (hasAnyDebtInSeries) legendItems.push({ key: "Gjeld", color: "#FCA5A5" });
  } else if (debts.length > 1 && hasAnyDebtInSeries) {
    const debtScale = ["#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C"];
    debts.forEach((debt, idx) => {
      legendItems.push({
        key: String(debt.name || `Gjeld ${idx + 1}`),
        color: debtScale[idx % debtScale.length]
      });
    });
  }
  legendItems.push({ key: "Egenkapital", color: "#86EFAC" });
  if (legendItems.length > 0) {
    const g = document.createElementNS(svgNS, "g");
    svg.appendChild(g);
    const mark = 12, gapInner = 10;
    const temp = legendItems.map(li => {
      const group = document.createElementNS(svgNS, "g");
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", "0"); r.setAttribute("y", String(vbH - 30));
      r.setAttribute("width", String(mark)); r.setAttribute("height", String(mark));
      r.setAttribute("rx", "3");
      r.setAttribute("fill", li.color);
      r.setAttribute("fill-opacity", "0.9");
      r.setAttribute("stroke", "#E8EBF3");
      group.appendChild(r);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", String(mark + gapInner));
      t.setAttribute("y", String(vbH - 20));
      t.setAttribute("fill", "#334155");
      t.setAttribute("font-size", "12");
      t.setAttribute("font-weight", "600");
      t.textContent = li.key;
      group.appendChild(t);
      g.appendChild(group);
      const width = group.getBBox().width;
      return { group, width };
    });
    const availW = vbW - padL - padR;
    const maxItemW = Math.max(...temp.map(it => it.width));
    const minColW = Math.max(90, Math.ceil(maxItemW + 16));
    let cols = Math.max(1, Math.floor(availW / minColW));
    cols = Math.min(cols, legendItems.length);
    const rowsCount = Math.ceil(legendItems.length / cols);
    const colW = availW / cols;
    const rowHeight = 26;
    const gridLeft = padL + Math.round((availW - Math.floor(colW) * cols) / 2);
    temp.forEach((it, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const cellX = gridLeft + Math.round(col * colW);
      const tx = cellX + Math.round((colW - it.width) / 2);
      const dy = -((rowsCount - 1 - row) * rowHeight);
      it.group.setAttribute("transform", `translate(${tx},${dy})`);
    });
  }
  return svg;
}

function makeBlock(title, amountText, variant, grow, heightPx) {
  const b = document.createElement("div");
  b.className = `viz-block ${variant || ''}`.trim();
  if (heightPx !== undefined) {
    b.style.height = `${Math.max(56, Math.round(heightPx))}px`;
  }
  const t = document.createElement("div");
  t.style.fontWeight = "700";
  t.style.marginBottom = "8px";
  t.textContent = title;
  const a = document.createElement("div");
  a.className = "value";
  a.textContent = amountText;
  b.appendChild(t);
  b.appendChild(a);
  return b;
}

/** Sum Portefølje I + Portefølje II + Likviditetsfond (2026) fra Mål og behov-fanen (localStorage). */
function getMaalOgBehovSum2026() {
  try {
    const v = localStorage.getItem("maalOgBehovSum2026");
    return v != null ? Number(v) : 0;
  } catch (e) {
    return 0;
  }
}

/** Total porteføljeverdi for et gitt år fra Mål og behov-fanen (sum av hovedstol, avkastning, sparing, hendelser, netto utbetaling, skatt på hendelser, løpende renteskatt). Array: [start, 2026, 2027, ...]. */
function getMaalOgBehovHovedstolForYear(yearVal) {
  try {
    const raw = localStorage.getItem("maalOgBehovHovedstolPerYear");
    if (raw == null) return getMaalOgBehovSum2026();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return getMaalOgBehovSum2026();
    const year = Number(yearVal);
    const idx = year - 2026 + 1;
    if (idx < 1) return arr[0];
    if (idx >= arr.length) return 0;
    return Number(arr[idx]) || 0;
  } catch (e) {
    return getMaalOgBehovSum2026();
  }
}

/**
 * Beløp fra Mål og behov til T-konto per kalenderår (positivt): netto utbetaling + summen av negative hendelser
 * (positive hendelser inngår ikke). Indeks som maalOgBehovHovedstolPerYear.
 */
function getMaalOgBehovNettoUtbetalingForYear(calendarYear) {
  const Y = Number(calendarYear);
  if (!Number.isFinite(Y)) return 0;
  const idx = Y - 2026 + 1;
  try {
    const raw = localStorage.getItem("maalOgBehovNettoUtbetalingTilTKontoPerYear");
    if (raw == null) return 0;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    if (idx < 1) return Math.max(0, Math.round(Number(arr[0]) || 0));
    if (idx >= arr.length) return 0;
    return Math.max(0, Math.round(Number(arr[idx]) || 0));
  } catch (e) {
    return 0;
  }
}

/** Vannrett etikett under søyler i Kontantstrøm-waterfall (to linjer, ikke «Skattefrie inntekter»). */
const CASHFLOW_MOB_NETTO_LABEL_LINES = ["Utbetalinger fra", "mål og behov"];

function isMoBUtbetalingIncomeRow(item) {
  if (!item || typeof item !== "object") return false;
  if (item._isMoBUtbetalingRow === true) return true;
  const name = String(item.name || "").normalize("NFC").trim();
  // Bakoverkompatibilitet: eldre data brukte "Skattefrie inntekter" for denne raden.
  return /^SKATTEFRIE\s*INNTEKTER$/i.test(name) && typeof item._maalOgBehovUtbetalingToggleUI === "boolean";
}

function ensureIncomeRows() {
  if (!Array.isArray(AppState.incomes)) AppState.incomes = [];
  const incomes = AppState.incomes;

  let moBRow = incomes.find(isMoBUtbetalingIncomeRow);
  if (!moBRow) {
    moBRow = {
      id: genId(),
      name: "Utbetalinger fra Mål og behov",
      amount: 0,
      _isMoBUtbetalingRow: true,
      _maalOgBehovUtbetalingToggleUI: true
    };
    incomes.push(moBRow);
  } else {
    moBRow._isMoBUtbetalingRow = true;
    moBRow.name = "Utbetalinger fra Mål og behov";
    if (typeof moBRow._maalOgBehovUtbetalingToggleUI !== "boolean") {
      moBRow._maalOgBehovUtbetalingToggleUI = true;
    }
  }

  const hasManualSkattefrie = incomes.some((x) =>
    !isMoBUtbetalingIncomeRow(x) &&
    /^SKATTEFRIE\s*INNTEKTER$/i.test(String(x && x.name ? x.name : "").normalize("NFC").trim())
  );
  if (!hasManualSkattefrie) {
    const manualRow = { id: genId(), name: "Skattefrie inntekter", amount: 0 };
    const utbytterIndex = incomes.findIndex((x) => /^UTBYTTER$/i.test(String(x && x.name ? x.name : "").trim()));
    if (utbytterIndex >= 0) incomes.splice(utbytterIndex + 1, 0, manualRow);
    else incomes.push(manualRow);
  }
}

function syncSkattefrieMoBAmountFromToggle() {
  const item = (AppState.incomes || []).find((x) => isMoBUtbetalingIncomeRow(x));
  if (!item) return;
  if (item._maalOgBehovUtbetalingToggleUI === true) {
    item.amount = getMaalOgBehovNettoUtbetalingForYear(2026);
  } else {
    item.amount = 0;
  }
}

function refreshTkontoViewsAfterMoBPrognosis() {
  const moduleRoot = document.getElementById("module-root");
  const currentNav = document.querySelector(".nav-item.is-active");
  if (!moduleRoot || !currentNav) return;
  const section = currentNav.getAttribute("data-section") || currentNav.textContent || "";
  if (section === "Kontantstrøm" && typeof renderWaterfallModule === "function") renderWaterfallModule(moduleRoot);
  else if (section === "Fremtidig utvikling" && typeof renderFutureModule === "function") renderFutureModule(moduleRoot);
  else if (section === "T-Konto" && typeof renderGraphicsModule === "function") renderGraphicsModule(moduleRoot);
  else if (section === "Inntekter" && typeof renderIncomeModule === "function") renderIncomeModule(moduleRoot);
}

/** Eksporter årlig formuesskatt (inntekter-fanen) til Mål og behov via localStorage. */
function setFormuesskattForMaalOgBehov(value) {
  try {
    const v = Math.max(0, Math.round(Number(value) || 0));
    localStorage.setItem("tKontoFormuesskatt", String(v));
  } catch (e) {
    // Ignorer lagringsfeil (for eksempel hvis localStorage er deaktivert)
  }
}

/**
 * Inntekter: skatt- og kostnadsrader skal bruke slider-steg 1 kr (ikke 50 000).
 * Matcher eksplisitte navn + generelle skattelinjer (unntatt skattefrie inntekter).
 */
function incomeSliderUseFineStep(itemName, nameInputValue) {
  const label = String(itemName != null ? itemName : nameInputValue || "")
    .trim()
    .normalize("NFC")
    .toUpperCase();
  if (
    label === "INNTEKTSSKATT" ||
    label === "UTBYTTESKATT" ||
    label === "FORMUESSKATT" ||
    label === "ÅRLIGE KOSTNADER"
  ) {
    return true;
  }
  if (/^(INNTEKTSSKATT|UTBYTTESKATT|FORMUESSKATT)$/.test(label)) return true;
  if (/^ÅRLIGE\s*KOSTNADER$/.test(label)) return true;
  if (/SKATTEFRIE\s*INNTEKTER/.test(label)) return false;
  if (/SKATT/.test(label)) return true;
  if (/KOSTNAD/.test(label)) return true;
  return false;
}

function createItemRow(collectionName, item) {
  const row = document.createElement("div");
  row.className = "asset-row";

  // Lagre originalnavn for å identifisere investeringer
  const originalName = item.name || "";

  // «Investeringer Mål og behov»-porteføljen er spesialrad (read-only beløp fra Mål og behov).
  // `noDelete` skal kun skjule sletteknappen, ikke stoppe sliderne.
  const isMaalOgBehovRow = collectionName === "assets" && isMaalOgBehovPortfolioAsset(item);
  const isMaalOgBehovReadOnly = isMaalOgBehovRow;
  if (isMaalOgBehovRow) {
    item.maalOgBehovPortfolio = true; // stabilt etter navneendring (farge / T-konto / eksport)
    item.noDelete = true; // sikre at lagret state beholder flagget
    item.amount = getMaalOgBehovSum2026();
  }

  let range = null; // brukes i name-listener og kun satt når !isMaalOgBehovReadOnly
  let setRangeBounds = function () {}; // satt i range-blokken, brukes av name-listener

  // Sett assetType basert på navn hvis det ikke allerede er satt (for bakoverkompatibilitet)
  if (collectionName === "assets" && !item.assetType) {
    const nameUpper = String(item.name || "").toUpperCase();
    if (/^FAST\s*EIENDOM$/i.test(nameUpper)) {
      item.assetType = "eiendom";
    } else if (/^FRITIDSEIENDOM$/i.test(nameUpper)) {
      item.assetType = "fritidseiendom";
    } else if (/^SEKUNDÆREIENDOM$/i.test(nameUpper)) {
      item.assetType = "sekundaereiendom";
    } else if (/^TOMT$/i.test(nameUpper)) {
      item.assetType = "tomt";
    } else if (/^EIENDOM$/i.test(item.name) && !/FAST/i.test(nameUpper)) {
      item.assetType = "eiendom";
    } else if (/^INVESTERINGER$/i.test(nameUpper) || /INVESTERINGER\s*MÅL\s*OG\s*BEHOV/i.test(nameUpper)) {
      item.assetType = "investeringer";
      if (/INVESTERINGER\s*MÅL\s*OG\s*BEHOV/i.test(nameUpper)) item.maalOgBehovPortfolio = true;
    } else if (/^BIL\/BÅT$/i.test(nameUpper)) {
      item.assetType = "bilbat";
    } else if (/^ANDRE\s*EIENDELER$/i.test(nameUpper)) {
      item.assetType = "andre";
    }
  }

  // Kostnadsrader (inntekter med SKATT/KOSTNAD) markeres, men ikke "Skattefrie inntekter"
  const markCostIfNeeded = (label) => {
    if (collectionName === "incomes") {
      const U = String(label || "").toUpperCase();
      // Ikke marker "Skattefrie inntekter" som kostnad
      if (/SKATT|KOSTNAD/.test(U) && !/SKATTEFRIE\s*INNTEKTER/.test(U)) {
        row.classList.add("is-cost");
      } else {
        row.classList.remove("is-cost");
      }
    }
  };
  markCostIfNeeded(item && item.name);

  const isPensionIncomeRow =
    collectionName === "incomes" &&
    String(item.name || "").normalize("NFC").toUpperCase() === "PENSJONSINNTEKT";
  const isMoBUtbetalingDisplayNavnRow =
    collectionName === "incomes" && isMoBUtbetalingIncomeRow(item);
  const incomeNameKey = collectionName === "incomes" ? normalizeIncomeNameKey(item.name) : "";
  const isIncomeStandardReadonly =
    collectionName === "incomes" &&
    (incomeNameKey === "LØNNSINNTEKT" ||
      incomeNameKey === "UTBYTTER" ||
      incomeNameKey === "PENSJONSINNTEKT" ||
      /^SKATTEFRIE\s*INNTEKTER$/.test(incomeNameKey) ||
      incomeNameKey === "UTBETALINGER FRA MÅL OG BEHOV" ||
      incomeNameKey === "INNTEKTSSKATT" ||
      incomeNameKey === "UTBYTTESKATT" ||
      incomeNameKey === "FORMUESSKATT" ||
      incomeNameKey === "ÅRLIGE KOSTNADER");

  const col = document.createElement("div");
  col.className = "asset-col";

  const top = document.createElement("div");
  top.className = "asset-top";

  const name = document.createElement("input");
  name.className = "asset-name";
  name.type = "text";
  name.value = item.name || "";
  name.setAttribute("aria-label", `Navn på ${collectionName.slice(0, -1)}`);
  const isNameLocked = collectionName === "assets" && item.noRename;
  if (isNameLocked || isIncomeStandardReadonly) {
    name.readOnly = true;
    name.title = isPensionIncomeRow
      ? "Årlig pensjon i prognose hentes fra Pensjon-fanen når bryteren er på"
      : isMoBUtbetalingDisplayNavnRow
      ? "Visningsnavn for raden Skattefrie inntekter. Logisk rad er uendret i modellen."
      : collectionName === "incomes"
      ? "Standard inntekt: navn kan ikke endres"
      : "Default-eiendel: navn kan ikke endres";
    name.classList.add("asset-name-readonly");
    if (isMoBUtbetalingDisplayNavnRow) {
      name.value = "Utbetalinger fra Mål og behov";
      name.setAttribute("aria-label", "Utbetalinger fra Mål og behov");
    }
  } else {
    name.addEventListener("input", () => { 
      item.name = name.value; 
      markCostIfNeeded(name.value); 
      if (range) setRangeBounds(); 
      // Bevar assetType når navnet endres - ikke endre det basert på nytt navn
    });
  }

  // Legg til nedtrekksmeny for assets
  let entitySelect = null;
  if (collectionName === "assets") {
    entitySelect = document.createElement("select");
    entitySelect.className = "asset-entity-select";
    entitySelect.setAttribute("aria-label", "Velg struktur");
    
    // Funksjon for å oppdatere nedtrekksmenyen med aktiverte strukturer
    const updateEntitySelect = () => {
      entitySelect.innerHTML = "";
      
      // Initialiser struktur hvis den ikke finnes
      if (!AppState.structure) {
        AppState.structure = {
          privat: [
            { active: true, name: "Ektefelle I" },
            { active: true, name: "Ektefelle II" }
          ],
          holding1: { active: false, name: "Holding AS", ownershipPct: null },
          holding2: { active: false, name: "Holding II AS", ownershipPct: null }
        };
      }
      if (!Array.isArray(AppState.structure.privat)) {
        AppState.structure.privat = [AppState.structure.privat];
      }
      if (AppState.structure.privat.length === 1) {
        AppState.structure.privat.push({ active: true, name: "Ektefelle II" });
      }
      
      // Legg til alle Privat-bokser i nedtrekksmenyen
      const privatArray = AppState.structure.privat;
      if (item.entity === ENTITY_PRIVAT_BEGGE) {
        if (!isPrivatEntryActive(privatArray[1], 1)) {
          item.entity = "privat";
        }
      }
      if (item.entity && item.entity.startsWith("privat-")) {
        const pi = getPrivatIndexFromEntity(item.entity);
        if (pi > 0 && !isPrivatEntryActive(privatArray[pi], pi)) {
          item.entity = "privat";
        }
      }
      privatArray.forEach((privatEntity, index) => {
        if (index > 0 && !isPrivatEntryActive(privatEntity, index)) {
          return;
        }
        const privatOption = document.createElement("option");
        privatOption.value = index === 0 ? "privat" : `privat-${index}`;
        privatOption.textContent = privatEntity.name || (index === 0 ? "Ektefelle I" : "Ektefelle II");
        
        // Sjekk om dette er valgt entity (støtt både "privat" og "privat-0" for første, "privat-1", "privat-2" osv. for resten)
        const currentValue = item.entity || "privat";
        if (index === 0 && (currentValue === "privat" || currentValue === "privat-0")) {
          privatOption.selected = true;
        } else if (index > 0 && currentValue === `privat-${index}`) {
          privatOption.selected = true;
        }
        
        entitySelect.appendChild(privatOption);
      });

      if (isPrivatEntryActive(privatArray[0], 0) && isPrivatEntryActive(privatArray[1], 1)) {
        const beggeOption = document.createElement("option");
        beggeOption.value = ENTITY_PRIVAT_BEGGE;
        beggeOption.textContent = getPrivatBeggeOptionLabel(privatArray);
        const currentValue = item.entity || "privat";
        if (currentValue === ENTITY_PRIVAT_BEGGE) {
          beggeOption.selected = true;
        }
        entitySelect.appendChild(beggeOption);
      }
      
      // Hvis ingen er valgt, sett default til første privat
      if (!entitySelect.value) {
        entitySelect.value = "privat";
      }
      
      // Legg til aktiverte holdingselskaper
      if (AppState.structure.holding1 && AppState.structure.holding1.active) {
        const holding1Option = document.createElement("option");
        holding1Option.value = "holding1";
        holding1Option.textContent = AppState.structure.holding1.name || "Holding AS";
        if (item.entity === "holding1") {
          holding1Option.selected = true;
        }
        entitySelect.appendChild(holding1Option);
      }
      
      if (AppState.structure.holding2 && AppState.structure.holding2.active) {
        const holding2Option = document.createElement("option");
        holding2Option.value = "holding2";
        holding2Option.textContent = AppState.structure.holding2.name || "Holding II AS";
        if (item.entity === "holding2") {
          holding2Option.selected = true;
        }
        entitySelect.appendChild(holding2Option);
      }

      // Legg til selskaper fra nytt struktur-dashboard
      const dashboardCompanies = Array.isArray(AppState.structureDashboardCompanies)
        ? AppState.structureDashboardCompanies
        : [];
      dashboardCompanies.forEach((company) => {
        const option = document.createElement("option");
        option.value = `dashboard-company:${company.id}`;
        option.textContent = company.name;
        if (item.entity === option.value) {
          option.selected = true;
        }
        entitySelect.appendChild(option);
      });
      
      // Hvis ingen er valgt, sett default til privat
      if (!item.entity) {
        item.entity = "privat";
      }
    };
    
    updateEntitySelect();
    
    // Oppdater når brukeren velger noe
    entitySelect.addEventListener("change", () => {
      item.entity = entitySelect.value;
    });
    
    // Lagre referanse for å kunne oppdatere senere
    item._updateEntitySelect = updateEntitySelect;
  }

  top.appendChild(name);
  if (entitySelect) {
    top.appendChild(entitySelect);
  }
  // "Investeringer Mål og behov"-linjen skal ikke kunne slettes
  // Inntekter/kostnader kan ikke slettes i T-konto-fanen
  if (collectionName !== "incomes" && !(collectionName === "assets" && (item.noDelete || isMaalOgBehovPortfolioAsset(item)))) {
    const del = document.createElement("button");
    del.className = "asset-delete";
    del.setAttribute("aria-label", `Slett ${collectionName.slice(0, -1)}`);
    del.textContent = "×";
    del.addEventListener("click", () => {
      const list = AppState[collectionName];
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) list.splice(idx, 1);
      row.remove();
      updateTopSummaries();
    });
    top.appendChild(del);
  }

  const amount = document.createElement("div");
  amount.className = "asset-amount";
  amount.textContent = formatNOK(Number(isMaalOgBehovReadOnly ? (item.amount || 0) : 0));

  if (!isMaalOgBehovReadOnly && !isPensionIncomeRow && !isMoBUtbetalingDisplayNavnRow) {
    range = document.createElement("input");
    range.className = "asset-range";
    range.type = "range";
    range.min = "0";
    range.max = "50000000";
    range.step = "50000";
    if (collectionName === "incomes") {
      range.step = isIncomeStandardReadonly
        ? "10000"
        : incomeSliderUseFineStep(item.name, name.value)
        ? "1"
        : "50000";
    }

    setRangeBounds = function () {
      if (collectionName === "incomes") {
        const label = String(item.name || name.value || "").normalize("NFC").toUpperCase();
        const incomeKey = normalizeIncomeNameKey(item.name || name.value || "");
        if (incomeKey === "LØNNSINNTEKT" || incomeKey === "UTBYTTER") {
          range.max = "20000000";
        } else if (/L[ØO]NN|PENSJON|SKATT|UTBYT|SKATTEFRIE\s*INNTEKTER|KOSTNAD/.test(label)) {
          range.max = "10000000";
        } else {
          range.max = "50000000";
        }

        // Standard inntektsrader (read-only navn) dras i 10 000-intervaler.
        // Andre rader beholder fin/grov step-logikken.
        range.step = isIncomeStandardReadonly
          ? "10000"
          : incomeSliderUseFineStep(item.name, name.value)
          ? "1"
          : "50000";

        if (Number(range.value) > Number(range.max)) {
          range.value = range.max;
          // Hold AppState synkronisert når verdi må clamps til max.
          item.amount = Number(range.max);
          if (amount) amount.textContent = formatNOK(item.amount);
        }
      } else if (collectionName === "assets") {
        const label = String(item.name || name.value || "").toUpperCase();
        const originalLabel = String(originalName || "").toUpperCase();
        const assetType = item.assetType;
        const isInvestment =
          item.maalOgBehovPortfolio === true ||
          assetType === "investeringer" ||
          /^INVESTERINGER$/i.test(label) ||
          /^INVESTERINGER$/i.test(originalLabel);
        const isEiendom = assetType === "eiendom" || assetType === "fritidseiendom" || assetType === "sekundaereiendom" || assetType === "tomt" || (/^EIENDOM$/i.test(label) && !/FAST/i.test(label));
        const isFastEiendom = /^FAST\s*EIENDOM$/i.test(label);
        const isAndreEiendeler = assetType === "andre" || /^ANDRE\s*EIENDELER$/i.test(label);
        if (/^BANK$/i.test(label)) range.max = "100000000";
        else if (isFastEiendom) range.max = "100000000";
        else if (isEiendom) range.max = "100000000";
        else if (isInvestment) range.max = "100000000";
        else if (isAndreEiendeler) range.max = "250000000";
        else range.max = "50000000";
        if (Number(range.value) > Number(range.max)) {
          range.value = range.max;
          // Hold AppState synkronisert når verdi må clamps til max.
          item.amount = Number(range.max);
          if (amount) amount.textContent = formatNOK(item.amount);
        }
      }
    };

    setRangeBounds();
    range.value = String(item.amount || 0);
    if (Number(range.value) > Number(range.max)) range.value = range.max;
    if (collectionName === "incomes") setRangeBounds();
    // For eiendeler skal manuelt tastet beløp vises eksakt ved re-render.
    // Slideren kan fortsatt være grov og overstyre ved dragging.
    amount.textContent = formatNOK(
      collectionName === "assets" ? Number(item.amount || 0) : Number(range.value)
    );

    range.addEventListener("input", () => {
      const v = Number(range.value);
      item.amount = v;
      amount.textContent = formatNOK(v);
      if (collectionName === "incomes" && (item.name === "Inntektsskatt" || item.name === "Utbytteskatt" || item.name === "Formuesskatt" || item.name === "ÅRLIGE KOSTNADER") && item._autoTaxEnabled) {
        item._autoTaxEnabled = false;
        const toggleInput = row.querySelector('.asset-toggle-switch input[type="checkbox"]');
        if (toggleInput) toggleInput.checked = false;
      }
      if (collectionName === "incomes" && item.name === "Formuesskatt") {
        // Eksporter manuell justering til Mål og behov (tallet helt til høyre)
        setFormuesskattForMaalOgBehov(item.amount);
      }
      if (collectionName === "incomes" && (item.name === "LØNNSINNTEKT" || item.name === "PENSJONSINNTEKT" || item.name === "UTBYTTER")) updateAutoTax();
      if (collectionName === "assets") updateAutoTax();
      updateTopSummaries();
    });

    // Eiendeler: dobbelklikk i beløpscelle for å taste inn eksakt beløp manuelt (slider overstyrer ved dra)
    if (collectionName === "assets") {
      amount.setAttribute("title", "Dobbelklikk for å taste inn beløp");
      amount.style.cursor = "text";
      amount.addEventListener("dblclick", function startAmountEdit() {
        const currentVal = Number(range.value) || 0;
        const maxVal = Number(range.max) || 50000000;
        const input = document.createElement("input");
        input.type = "text";
        input.className = "asset-amount";
        input.value = String(Math.round(currentVal));
        input.style.width = amount.offsetWidth + "px";
        input.style.textAlign = "right";
        input.setAttribute("aria-label", "Beløp i kroner");
        amount.replaceWith(input);
        input.focus();
        input.select();

        function commitAmount() {
          const raw = input.value.replace(/\s/g, "").replace(/kr/gi, "").replace(",", ".");
          let num = Number(raw);
          if (!isFinite(num) || num < 0) num = 0;
          num = Math.min(Math.round(num), maxVal);
          item.amount = num;
          range.value = String(num);
          input.replaceWith(amount);
          amount.textContent = formatNOK(num);
          updateTopSummaries();
          if (collectionName === "assets") updateAutoTax();
        }

        input.addEventListener("blur", commitAmount);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.removeEventListener("blur", commitAmount);
            commitAmount();
          }
          if (e.key === "Escape") {
            input.replaceWith(amount);
            amount.textContent = formatNOK(Number(range.value));
          }
        });
      });
    }
  }

  col.appendChild(top);
  if (range) col.appendChild(range);

  // For inntekter: legg til wrapper med toggle-knapp, ellers bare legg til amount direkte
  if (collectionName === "incomes") {
    const itemNameUpper = String(item.name || "").toUpperCase();
    const shouldShowToggle = !["LØNNSINNTEKT", "PENSJONSINNTEKT", "UTBYTTER", "SKATTEFRIE INNTEKTER"].includes(itemNameUpper);

    if (isPensionIncomeRow) {
      row.classList.add("asset-row--pension-toggle-only");

      function syncPensionAmountFromToggle() {
        if (item._annualPensionEnabled) {
          const pd = getPensjonForecastData();
          item.amount = pd ? Math.max(0, Number(pd.annualPension) || 0) : 0;
        } else {
          item.amount = 0;
        }
      }
      syncPensionAmountFromToggle();

      const amountWrapper = document.createElement("div");
      amountWrapper.className = "asset-amount-wrapper income-pension-amount-wrapper";

      const pensionToggleGroup = document.createElement("div");
      pensionToggleGroup.className = "income-pension-toggle-group";

      const pensionToggleLabel = document.createElement("span");
      pensionToggleLabel.className =
        "income-pension-toggle-label income-pension-toggle-label--has-tooltip";
      pensionToggleLabel.textContent = "Aktivere årlig pensjon i kontanstrøm?";
      pensionToggleLabel.title =
        "Ved å aktivere denne, vil Lønnsinntekten bli byttet ut med pensjonsinntekt det året personen går av med pensjon. Dette året definerer du i fanen : Pensjon\n\n" +
        "Dette vil påvirke kontantstrømmen fra det året pensjon overtar for lønn. Inntektsskatt blir også fra dette tidspunktet satt til 30% på pensjonsinntekt.";

      const toggleSwitch = document.createElement("label");
      toggleSwitch.className = "asset-toggle-switch";
      toggleSwitch.setAttribute("aria-label", "Aktivere årlig pensjon");

      const toggleInput = document.createElement("input");
      toggleInput.type = "checkbox";
      toggleInput.checked = item._annualPensionEnabled === true; // Default: nei

      const toggleSlider = document.createElement("span");
      toggleSlider.className = "asset-toggle-slider";

      const pensionToggleState = document.createElement("span");
      pensionToggleState.className = "income-pension-toggle-state";
      pensionToggleState.textContent = toggleInput.checked ? "Ja" : "Nei";

      toggleInput.addEventListener("change", () => {
        item._annualPensionEnabled = toggleInput.checked;
        pensionToggleState.textContent = toggleInput.checked ? "Ja" : "Nei";
        syncPensionAmountFromToggle();
        notifyCashflowRoutingChange("Inntekter");
        updateAutoTax();
        updateTopSummaries();
      });

      toggleSwitch.appendChild(toggleInput);
      toggleSwitch.appendChild(toggleSlider);
      pensionToggleGroup.appendChild(pensionToggleLabel);
      pensionToggleGroup.appendChild(toggleSwitch);
      pensionToggleGroup.appendChild(pensionToggleState);

      amountWrapper.appendChild(pensionToggleGroup);

      row.appendChild(col);
      row.appendChild(amountWrapper);
    } else if (isMoBUtbetalingDisplayNavnRow) {
      // Skattefrie inntekter vises som «Utbetalinger fra Mål og behov» – henter netto utbetaling per år fra Mål og behov når på.
      row.classList.add("asset-row--pension-toggle-only");

      // Default skal være "Ja" med mindre bruker eksplisitt har slått den av.
      if (typeof item._maalOgBehovUtbetalingToggleUI !== "boolean") {
        item._maalOgBehovUtbetalingToggleUI = true;
      }

      if (item._maalOgBehovUtbetalingToggleUI === true) {
        item.amount = getMaalOgBehovNettoUtbetalingForYear(2026);
      } else {
        item.amount = 0;
      }

      const amountWrapper = document.createElement("div");
      amountWrapper.className = "asset-amount-wrapper income-pension-amount-wrapper";

      const moBToggleGroup = document.createElement("div");
      moBToggleGroup.className = "income-pension-toggle-group";

      const moBToggleLabel = document.createElement("span");
      moBToggleLabel.className =
        "income-pension-toggle-label income-pension-toggle-label--has-tooltip";
      moBToggleLabel.textContent = "Aktivere utbetalinger fra Mål og behov?";
      moBToggleLabel.title =
        "ved å aktivere denne, vil netto utbetalinger og Hendelser (utbetalinger) fra Mål og behov bli en del av den årlige kontantstrømmen.\n\n" +
        "En netto utbetaling i f.eks år 2030 vil da påvirke kontantstrømmen i år 2030.";

      const toggleSwitch = document.createElement("label");
      toggleSwitch.className = "asset-toggle-switch";
      toggleSwitch.setAttribute("aria-label", "Aktivere utbetalinger fra Mål og behov");

      const toggleInput = document.createElement("input");
      toggleInput.type = "checkbox";
      toggleInput.checked = item._maalOgBehovUtbetalingToggleUI === true;

      const toggleSlider = document.createElement("span");
      toggleSlider.className = "asset-toggle-slider";

      const moBToggleState = document.createElement("span");
      moBToggleState.className = "income-pension-toggle-state";
      moBToggleState.textContent = toggleInput.checked ? "Ja" : "Nei";

      toggleInput.addEventListener("change", () => {
        item._maalOgBehovUtbetalingToggleUI = toggleInput.checked;
        moBToggleState.textContent = toggleInput.checked ? "Ja" : "Nei";
        if (item._maalOgBehovUtbetalingToggleUI === true) {
          item.amount = getMaalOgBehovNettoUtbetalingForYear(2026);
        } else {
          item.amount = 0;
        }
        notifyCashflowRoutingChange("Inntekter");
        updateTopSummaries();
      });

      toggleSwitch.appendChild(toggleInput);
      toggleSwitch.appendChild(toggleSlider);
      moBToggleGroup.appendChild(moBToggleLabel);
      moBToggleGroup.appendChild(toggleSwitch);
      moBToggleGroup.appendChild(moBToggleState);

      amountWrapper.appendChild(moBToggleGroup);

      row.appendChild(col);
      row.appendChild(amountWrapper);
    } else if (shouldShowToggle) {
      // Wrapper for amount og toggle-knapp
      const amountWrapper = document.createElement("div");
      amountWrapper.className = "asset-amount-wrapper";

      // Toggle switch knapp
      const toggleSwitch = document.createElement("label");
      toggleSwitch.className = "asset-toggle-switch";
      toggleSwitch.setAttribute("aria-label", "Toggle");
      
      const toggleInput = document.createElement("input");
      toggleInput.type = "checkbox";
      toggleInput.checked = item._autoTaxEnabled || false; // Start basert på lagret state
      
      const toggleSlider = document.createElement("span");
      toggleSlider.className = "asset-toggle-slider";
      
      toggleSwitch.appendChild(toggleInput);
      toggleSwitch.appendChild(toggleSlider);

      // Legg til funksjonalitet for toggle-knapper
      if (item.name === "Inntektsskatt") {
        toggleInput.addEventListener("change", () => {
          if (toggleInput.checked) {
            const wageIncome = AppState.incomes.find(i => i.name === "LØNNSINNTEKT");
            const taxableIncome =
              (wageIncome ? wageIncome.amount : 0) + pensionAmountForIncomeTaxEstimate();
            if (taxableIncome > 0) {
              const calculatedTax = calculateTax(taxableIncome);
              item.amount = calculatedTax;
              item._autoTaxEnabled = true;
              
              // Oppdater slider og visning
              range.value = String(calculatedTax);
              amount.textContent = formatNOK(calculatedTax);
              updateTopSummaries();
            }
          } else {
            // Deaktiver auto-beregning
            item._autoTaxEnabled = false;
          }
        });
      } else if (item.name === "Utbytteskatt") {
        toggleInput.addEventListener("change", () => {
          if (toggleInput.checked) {
            // Beregn utbytteskatt basert på utbytter (37.84%)
            const dividends = AppState.incomes.find(i => i.name === "UTBYTTER");
            if (dividends) {
              const calculatedTax = Math.round(dividends.amount * 0.3784);
              item.amount = calculatedTax;
              item._autoTaxEnabled = true;
              
              // Oppdater slider og visning
              range.value = String(calculatedTax);
              amount.textContent = formatNOK(calculatedTax);
              updateTopSummaries();
            }
          } else {
            // Deaktiver auto-beregning
            item._autoTaxEnabled = false;
          }
        });
      } else if (item.name === "Formuesskatt") {
        toggleInput.addEventListener("change", () => {
          if (toggleInput.checked) {
            // Hent Total Formuesskatt fra Formuesskatt-fanen (ikke beregn 0.5%)
            let valueFromFormuesskatt = 0;
            const iframe = document.querySelector('iframe[src*="formuesskatt"]');
            if (iframe && iframe.contentWindow && typeof iframe.contentWindow.getFormuesskattTotal === 'function') {
              try {
                valueFromFormuesskatt = iframe.contentWindow.getFormuesskattTotal();
              } catch (e) { valueFromFormuesskatt = 0; }
            }
            item.amount = valueFromFormuesskatt;
            item._autoTaxEnabled = true;
            
            // Oppdater slider og visning
            range.value = String(valueFromFormuesskatt);
            amount.textContent = formatNOK(valueFromFormuesskatt);
            setFormuesskattForMaalOgBehov(item.amount);
            updateTopSummaries();
          } else {
            // Toggle av: sett verdi til 0
            item._autoTaxEnabled = false;
            toggleInput.checked = false;
            item.amount = 0;
            range.value = "0";
            amount.textContent = formatNOK(0);
            setFormuesskattForMaalOgBehov(0);
            updateTopSummaries();
          }
        });
      } else if (item.name === "ÅRLIGE KOSTNADER") {
        toggleInput.addEventListener("change", () => {
          if (toggleInput.checked) {
            const assets = AppState.assets || [];
            const sumAssets = assets.reduce((s, x) => s + (x.amount || 0), 0);
            const calculatedCosts = Math.round(sumAssets * 0.02);
            item.amount = calculatedCosts;
            item._autoTaxEnabled = true;
            
            // Oppdater slider og visning
            range.value = String(calculatedCosts);
            amount.textContent = formatNOK(calculatedCosts);
            updateTopSummaries();
          } else {
            // Deaktiver auto-beregning
            item._autoTaxEnabled = false;
          }
        });
      }

      amountWrapper.appendChild(toggleSwitch);
      amountWrapper.appendChild(amount);

      row.appendChild(col);
      row.appendChild(amountWrapper);
    } else {
      // Ingen toggle-knapp for lønnsinntekt, utbytter og skattefrie inntekter
      row.appendChild(col);
      row.appendChild(amount);
    }
  } else {
    row.appendChild(col);
    row.appendChild(amount);
  }

  return row;
}

function formatNOK(value) {
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatNOKSummary(value) {
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatNOKPlain(value) {
  return new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value, fractionDigits = 0) {
  const formatter = new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
  return `${formatter.format(value)} %`;
}

function remainingBalanceAfterYears(debt, elapsedYears) {
  if (elapsedYears < 0) return 0;
  const amount = Number(debt && debt.amount) || 0;
  if (amount <= 0) return 0;
  const params = debt.debtParams || AppState.debtParams || {};
  const type = params.type || "Annuitetslån";
  const rate = Number(params.rate) || 0;
  const years = Math.max(1, Number(params.years) || 1);
  const t = Math.max(0, elapsedYears);

  if (/Avdragsfrihet/.test(type)) {
    const match = /(\d+)\s*år/i.exec(type);
    const interestOnlyYears = type === "Avdragsfrihet" ? years : Math.min(match ? Number(match[1]) : years, years);
    const amortYears = type === "Avdragsfrihet" ? 0 : years;
    const totalDuration = interestOnlyYears + amortYears;
    const clampedT = Math.min(t, totalDuration);
    if (clampedT <= interestOnlyYears) return amount;
    if (amortYears <= 0) return amount;
    const n = Math.min(amortYears, clampedT - interestOnlyYears);
    if (rate === 0) {
      const principal = amount / amortYears;
      return Math.max(0, amount - principal * n);
    }
    const annuity = amount * (rate / (1 - Math.pow(1 + rate, -amortYears)));
    const balance = amount * Math.pow(1 + rate, n) - annuity * ((Math.pow(1 + rate, n) - 1) / rate);
    return Math.max(0, balance);
  }

  if (/Ballonglån/.test(type)) {
    const match = /Ballonglån\s+(\d+)/i.exec(type);
    const balloonYears = match ? Math.max(1, Number(match[1])) : 1;
    const scheduleYears = years;
    const clampedT = Math.min(Math.max(0, t), balloonYears);
    if (clampedT >= balloonYears) {
      return 0;
    }
    const annuitetT = Math.min(clampedT, scheduleYears);
    if (annuitetT === 0) {
      return amount;
    }
    if (rate === 0) {
      return Math.max(0, amount * (1 - annuitetT / scheduleYears));
    }
    const annuity = amount * (rate / (1 - Math.pow(1 + rate, -scheduleYears)));
    const balance =
      amount * Math.pow(1 + rate, annuitetT) -
      annuity * ((Math.pow(1 + rate, annuitetT) - 1) / rate);
    return Math.max(0, balance);
  }

  if (type === "Serielån") {
    const clampedT = Math.min(t, years);
    const principalPortion = amount / years;
    return Math.max(0, amount - principalPortion * clampedT);
  }

  const clampedT = Math.min(t, years);
  if (rate === 0) {
    return Math.max(0, amount * (1 - clampedT / years));
  }
  const annuity = amount * (rate / (1 - Math.pow(1 + rate, -years)));
  const balance = amount * Math.pow(1 + rate, clampedT) - annuity * ((Math.pow(1 + rate, clampedT) - 1) / rate);
  return Math.max(0, balance);
}

/**
 * Gjenværende hovedstol for én gjeldspost i et kalenderår (T-konto-grafikk m.m.).
 * Før lånets startår (år < startYear): 0 — unntak: ved «start» (2025) og startår 2026 vises full hovedstol
 * (boliglån m.m. skal synes i T-konto selv om årsvelgeren er «start»). Fremtidig gjeld (startår etter 2026) vises ikke før startåret.
 * Fra og med startår: saldo etter eff år med betalinger.
 */
function remainingBalanceForDebtInYear(debt, calendarYear) {
  const eff = getDebtScheduleElapsed(debt, calendarYear);
  if (eff < 0) {
    const Y = Number(calendarYear);
    const S = getDebtScheduleStartYear(debt);
    if (S === 2026 && Y === 2025) {
      return remainingBalanceAfterYears(debt, 0);
    }
    return 0;
  }
  return remainingBalanceAfterYears(debt, eff);
}

// Hjelpefunksjoner for gjeld-beregninger med individuelle debtParams
function calculateAnnualDebtPayment(debt) {
  const P = debt.amount || 0;
  if (P <= 0) return 0;
  
  const debtParams = debt.debtParams || AppState.debtParams;
  const r = debtParams.rate || 0;
  const n = Math.max(1, debtParams.years || 1);
  const type = debtParams.type || "Annuitetslån";
  
  if (/Avdragsfrihet/.test(type)) {
    return P * r; // Kun renter
  } else if (type === "Serielån") {
    return P / n + (P * r) / 2; // Gjennomsnittlig avdrag + gjennomsnittlig renter
  } else {
    // Annuitetslån, Ballonglån (ordinære år) m.m.
    if (r === 0) return P / n;
    return P * (r / (1 - Math.pow(1 + r, -n)));
  }
}

function calculateTotalAnnualDebtPaymentForYear(debts, yearVal, debtAlignOptions) {
  const Y = Number(yearVal) || 2026;
  const align =
    debtAlignOptions &&
    debtAlignOptions.kontantstromStartAlignsDebtWith2026 === true;
  return (debts || AppState.debts || []).reduce((sum, debt) => {
    const calYear = align && Y === 2025 ? getDebtScheduleStartYear(debt) : Y;
    const eff = getDebtScheduleElapsed(debt, calYear);
    if (eff < 0) return sum;
    return sum + (projectDebtYear(debt, eff).payment || 0);
  }, 0);
}

function calculateTotalAnnualDebtPayment(debts) {
  return calculateTotalAnnualDebtPaymentForYear(debts, 2026);
}

function calculateTotalAnnualInterestForYear(debts, yearVal, debtAlignOptions) {
  const Y = Number(yearVal) || 2026;
  const align =
    debtAlignOptions &&
    debtAlignOptions.kontantstromStartAlignsDebtWith2026 === true;
  return (debts || AppState.debts || []).reduce((sum, debt) => {
    const calYear = align && Y === 2025 ? getDebtScheduleStartYear(debt) : Y;
    const eff = getDebtScheduleElapsed(debt, calYear);
    if (eff < 0) return sum;
    return sum + (projectDebtYear(debt, eff).interest || 0);
  }, 0);
}

function calculateTotalAnnualInterest(debts) {
  return calculateTotalAnnualInterestForYear(debts, 2026);
}

// --- Gjeld modul ---
function createDebtRow(debt) {
  // Sørg for at gjeldsposten har debtParams
  if (!debt.debtParams) {
    debt.debtParams = {
      type: AppState.debtParams.type || "Annuitetslån",
      years: AppState.debtParams.years || 25,
      rate: AppState.debtParams.rate || 0.04
    };
  }

  const container = document.createElement("div");
  container.style.marginBottom = "32px";

  // Navn og beløp-rad
  const nameRow = createItemRow("debts", debt);
  container.appendChild(nameRow);

  // Lånetype for denne gjeldsposten
  const typeLabel = document.createElement("div");
  typeLabel.className = "section-label";
  typeLabel.textContent = "Lånetype";
  typeLabel.style.marginTop = "16px";
  container.appendChild(typeLabel);

  const typeWrap = document.createElement("div");
  typeWrap.className = "select";
  const select = document.createElement("select");
  [
    "Annuitetslån",
    "Serielån",
    "Avdragsfrihet",
    "Avdragsfrihet 3 år",
    "Avdragsfrihet 5 år",
    "Avdragsfrihet 10 år",
    "Ballonglån 3 år",
    "Ballonglån 5 år",
    "Ballonglån 10 år"
  ].forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t.toUpperCase();
    select.appendChild(opt);
  });
  select.value = debt.debtParams.type;
  select.addEventListener("change", () => {
    debt.debtParams.type = select.value;
    updateTopSummaries();
  });
  typeWrap.appendChild(select);
  container.appendChild(typeWrap);

  const startYearLabel = document.createElement("div");
  startYearLabel.className = "section-label";
  startYearLabel.appendChild(document.createTextNode("Startår "));
  const startYearHint = document.createElement("span");
  startYearHint.className = "debt-startyear-hint";
  startYearHint.textContent =
    "(husk å sette inn en motpost til fremtidig gjeld i mål og behov)";
  startYearHint.title =
    "Setter du inn et annet startår enn 2026, betyr det at gjelden vil oppstå på et senere tidspunkt.\n\n" +
    "Om gjelden f.eks skal starte i 2029, må denne gjelden ha en motpost. Pengene du låner må ende opp et sted.\n\n" +
    "I modellen må denne kapitalen ende opp i mål og behov. Tar du opp et lån på 5 MNOK med start 2029, må du legge inn en hendelse i 2029 der det kommer inn 5 MNOK i porteføljen.";
  startYearLabel.appendChild(startYearHint);
  startYearLabel.style.marginTop = "16px";
  container.appendChild(startYearLabel);

  const startYearWrap = document.createElement("div");
  startYearWrap.className = "select";
  const startYearSelect = document.createElement("select");
  startYearSelect.setAttribute("aria-label", "Startår");
  for (let y = 2026; y <= 2035; y++) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    startYearSelect.appendChild(opt);
  }
  let startY = debt.debtParams.startYear;
  if (startY == null || startY === "" || !Number.isFinite(Number(startY))) {
    startY = 2026;
  } else {
    startY = Math.min(2035, Math.max(2026, Number(startY)));
  }
  startYearSelect.value = String(startY);
  if (debt.debtParams.startYear != null && debt.debtParams.startYear !== "") {
    debt.debtParams.startYear = startY;
  }
  startYearSelect.addEventListener("change", () => {
    debt.debtParams.startYear = Number(startYearSelect.value);
    updateTopSummaries();
    if (typeof refreshTKontoChart === "function") refreshTKontoChart();
  });
  startYearWrap.appendChild(startYearSelect);
  container.appendChild(startYearWrap);

  // Lånetid (år) for denne gjeldsposten
  const yearsLabel = document.createElement("div");
  yearsLabel.className = "section-label";
  yearsLabel.textContent = "Lånetid (år)";
  yearsLabel.style.marginTop = "16px";
  container.appendChild(yearsLabel);

  const yearsRow = document.createElement("div");
  yearsRow.className = "asset-row";
  const yearsCol = document.createElement("div");
  yearsCol.className = "asset-col";
  const yearsRange = document.createElement("input");
  yearsRange.type = "range";
  yearsRange.className = "asset-range";
  yearsRange.min = "1"; yearsRange.max = "30"; yearsRange.step = "1";
  if (debt.debtParams.years > 30) debt.debtParams.years = 30;
  yearsRange.value = String(debt.debtParams.years);
  const yearsOut = document.createElement("div");
  yearsOut.className = "asset-amount";
  yearsOut.textContent = `${debt.debtParams.years} år`;
  yearsRange.addEventListener("input", () => {
    debt.debtParams.years = Number(yearsRange.value);
    yearsOut.textContent = `${yearsRange.value} år`;
    updateTopSummaries();
  });
  yearsCol.appendChild(yearsRange);
  yearsRow.appendChild(yearsCol);
  yearsRow.appendChild(yearsOut);
  container.appendChild(yearsRow);

  // Rentekostnader (%) for denne gjeldsposten
  const rateLabel = document.createElement("div");
  rateLabel.className = "section-label";
  rateLabel.textContent = "Rentekostnader (%)";
  rateLabel.style.marginTop = "16px";
  container.appendChild(rateLabel);

  const rateRow = document.createElement("div");
  rateRow.className = "asset-row";
  const rateCol = document.createElement("div");
  rateCol.className = "asset-col";
  const rateRange = document.createElement("input");
  rateRange.type = "range";
  rateRange.className = "asset-range";
  rateRange.min = "0"; rateRange.max = "20"; rateRange.step = "0.1";
  rateRange.value = String(debt.debtParams.rate * 100);
  const rateOut = document.createElement("div");
  rateOut.className = "asset-amount";
  rateOut.textContent = `${(debt.debtParams.rate * 100).toFixed(2)} %`;
  rateRange.addEventListener("input", () => {
    debt.debtParams.rate = Number(rateRange.value) / 100;
    rateOut.textContent = `${Number(rateRange.value).toFixed(2)} %`;
    updateTopSummaries();
  });
  rateCol.appendChild(rateRange);
  rateRow.appendChild(rateCol);
  rateRow.appendChild(rateOut);
  container.appendChild(rateRow);

  // Override X-knappens event listener for å fjerne hele containeren (inkludert de tre linjene)
  const deleteButton = nameRow.querySelector(".asset-delete");
  if (deleteButton) {
    // Fjern eksisterende event listeners ved å erstatte knappen
    const newDeleteButton = deleteButton.cloneNode(true);
    deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
    
    newDeleteButton.addEventListener("click", () => {
      const list = AppState.debts;
      const idx = list.findIndex((x) => x.id === debt.id);
      if (idx >= 0) list.splice(idx, 1);
      container.remove(); // Fjern hele containeren (inkludert alle tre linjene)
      updateTopSummaries();
    });
  }

  return container;
}

function renderDebtModule(root) {
  root.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel debt panel-debt";

  const list = document.createElement("div");
  list.className = "assets";
  panel.appendChild(list);

  AppState.debts.forEach((item) => list.appendChild(createDebtRow(item)));

  const addBtn = document.createElement("button");
  addBtn.className = "btn-add";
  addBtn.textContent = "Legg til gjeld";
  addBtn.addEventListener("click", () => {
    const newItem = {
      id: genId(),
      name: "NY GJELD",
      amount: 0,
      debtParams: {
        type: AppState.debtParams.type || "Annuitetslån",
        years: AppState.debtParams.years || 25,
        rate: AppState.debtParams.rate || 0.04
      }
    };
    AppState.debts.push(newItem);
    list.appendChild(createDebtRow(newItem));
  });
  panel.appendChild(addBtn);

  root.appendChild(panel);
  updateTopSummaries();
}

/** Fast visningsrekkefølge for standard inntektslinjer (øvrige sorteres til slutt, alfabetisk). */
function normalizeIncomeNameKey(name) {
  return String(name || "").trim().normalize("NFC").toUpperCase();
}

const INCOME_DISPLAY_ORDER = new Map([
  ["LØNNSINNTEKT", 0],
  ["UTBYTTER", 1],
  ["SKATTEFRIE INNTEKTER", 2],
  ["PENSJONSINNTEKT", 3],
  ["UTBETALINGER FRA MÅL OG BEHOV", 4],
  ["INNTEKTSSKATT", 5],
  ["UTBYTTESKATT", 6],
  ["FORMUESSKATT", 7],
  ["ÅRLIGE KOSTNADER", 8]
]);

function reorderIncomesForDisplay() {
  const list = AppState.incomes;
  if (!Array.isArray(list) || list.length < 2) return;
  list.sort((a, b) => {
    const oa = INCOME_DISPLAY_ORDER.get(normalizeIncomeNameKey(a.name)) ?? 100;
    const ob = INCOME_DISPLAY_ORDER.get(normalizeIncomeNameKey(b.name)) ?? 100;
    if (oa !== ob) return oa - ob;
    return normalizeIncomeNameKey(a.name).localeCompare(normalizeIncomeNameKey(b.name), "nb");
  });
}

// --- Inntekter modul ---
function renderIncomeModule(root) {
  root.innerHTML = "";
  ensureIncomeRows();
  reorderIncomesForDisplay();

  const panel = document.createElement("div");
  panel.className = "panel panel-income";

  const heading = document.createElement("h3");
  heading.textContent = "Inntekt";
  panel.appendChild(heading);

  const list = document.createElement("div");
  list.className = "assets";
  panel.appendChild(list);

  AppState.incomes.forEach((item) => list.appendChild(createItemRow("incomes", item)));

  root.appendChild(panel);
  // Sikre at utbytteskatt matcher UTBYTTER når fanen re-renderes (f.eks. etter tab-switch)
  updateAutoDividendTax();
  updateTopSummaries();
}

// --- Analyse modul ---
function renderAnalysisModule(root) {
  root.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel";

  const heading = document.createElement("h3");
  heading.textContent = "Nøkkeltall og anbefalinger";
  panel.appendChild(heading);

  // Aggregates
  const totalAssets = AppState.assets.reduce((s, x) => s + (x.amount || 0), 0);
  const totalDebt = AppState.debts.reduce((s, x) => s + (x.amount || 0), 0);
  const upper = (s) => String(s || "").toUpperCase();
  const incomeItems = AppState.incomes;
  const isCost = (x) => /SKATT|KOSTNAD/.test(upper(x.name)) && !/SKATTEFRIE\s*INNTEKTER/.test(upper(x.name));
  const isIncome = (x) => !/SKATT|KOSTNAD/.test(upper(x.name)) || /SKATTEFRIE\s*INNTEKTER/.test(upper(x.name));
  const annualCosts = incomeItems.filter(isCost).reduce((s, x) => s + (x.amount || 0), 0);
  const totalIncome = incomeItems.filter(isIncome).reduce((s, x) => s + (x.amount || 0), 0);

  // Debt service per year (beregnet per gjeldspost)
  const annualDebtPayment = calculateTotalAnnualDebtPayment(AppState.debts);

  const cashflow = totalIncome - annualCosts - annualDebtPayment;
  // Hent bankinnskudd fra eiendeler
  const bankAsset = AppState.assets.find(a => /^BANK$/i.test(a.name || ""));
  const bufferCurrent = bankAsset ? (bankAsset.amount || 0) : 0;
  // Anbefalt buffer: (årlig total inntekt / 12) x 3
  const bufferRecommended = (totalIncome / 12) * 3; // 3 mnd av inntekt

  // Ratios
  const incomeToDebt = totalDebt > 0 ? totalIncome / totalDebt : 0;
  const debtServiceToIncome = totalIncome > 0 ? annualDebtPayment / totalIncome : 0;
  const debtToIncome = totalIncome > 0 ? totalDebt / totalIncome : 0;
  const equity = totalAssets - totalDebt;
  const leverage = equity > 0 ? totalDebt / equity : Infinity;

  function statusSpan(ok) {
    const span = document.createElement("span");
    span.className = `status ${ok ? "ok" : "warn"}`;
    span.textContent = ok ? "OK" : "SJEKK";
    return span;
  }

  function recCell(text, ok) {
    const wrap = document.createElement("span");
    const rec = document.createElement("span");
    rec.textContent = text;
    rec.style.marginRight = "8px";
    wrap.appendChild(rec);
    wrap.appendChild(statusSpan(ok));
    return wrap;
  }

  function tr(label, valueEl, recEl) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td"); td1.textContent = label; td1.className = "muted";
    const td2 = document.createElement("td"); td2.appendChild(valueEl);
    const td3 = document.createElement("td"); if (recEl) td3.appendChild(recEl); else td3.textContent = "-"; td3.className = recEl ? "" : "muted";
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    return tr;
  }

  function textNode(txt) { const s = document.createElement("span"); s.textContent = txt; return s; }

  const table = document.createElement("table");
  table.className = "kpi-table";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Indikator</th><th>Din verdi</th><th>Anbefaling</th></tr>";
  const tbody = document.createElement("tbody");

  tbody.appendChild(tr("Sum inntekter", textNode(formatNOK(totalIncome))));
  const costsRow = tr("Årlige kostnader", textNode(formatNOK(annualCosts)));
  costsRow.classList.add("is-cost");
  tbody.appendChild(costsRow);
  const debtSvcRow = tr("Renter og avdrag per år", textNode(formatNOK(Math.round(annualDebtPayment))));
  debtSvcRow.classList.add("is-cost");
  tbody.appendChild(debtSvcRow);

  const recommendedCashflowToDebt = totalIncome * 0.20; // 20% av inntekter
  const cashflowOk = cashflow >= recommendedCashflowToDebt; // OK hvis faktisk kontantstrøm er høyere eller lik anbefalt
  const cashRow = tr("Kontantstrøm per år", textNode(formatNOK(Math.round(cashflow))), recCell(formatNOK(Math.round(recommendedCashflowToDebt)), cashflowOk));
  if (cashflow < 0) cashRow.classList.add("is-cost");
  tbody.appendChild(cashRow);
  const bufferOk = bufferCurrent >= bufferRecommended; // OK hvis bankinnskudd er høyere eller lik anbefalt
  tbody.appendChild(tr(
    "Anbefalt bufferkonto / Likviditetsfond",
    textNode(formatNOK(Math.round(bufferCurrent))),
    recCell(formatNOK(Math.round(bufferRecommended)), bufferOk)
  ));

  // Thresholds
  const incomeDebtOk = incomeToDebt >= 0.2; // >=20%
  const dsIncomeOk = debtServiceToIncome <= 0.3; // <=30%
  const debtIncomeOk = debtToIncome <= 5; // <=5x
  const leverageOk = leverage <= 2.5; // <=2.5x

  tbody.appendChild(
    tr("Sum Inntekter / Gjeld", textNode(`${Math.round(incomeToDebt)}x`), recCell("> 20%", incomeDebtOk))
  );

  tbody.appendChild(
    tr("Renter og avdrag / Sum inntekter", textNode(`${Math.round(debtServiceToIncome*100)}%`), recCell("< 30%", dsIncomeOk))
  );

  tbody.appendChild(
    tr("Gjeld / Sum inntekter", textNode(`${Math.round(debtToIncome)}x`), recCell("< 5x", debtIncomeOk))
  );

  tbody.appendChild(
    tr(
      "Gjeldsgrad (gjeld / egenkapital)",
      textNode(`${isFinite(leverage) ? Math.round(leverage) + 'x' : '∞'}`),
      recCell("< 2.5x", leverageOk)
    )
  );

  table.appendChild(thead);
  table.appendChild(tbody);
  panel.appendChild(table);
  root.appendChild(panel);
  updateTopSummaries();
}

// --- Risikoevne (TBE) ---
function renderTbeModule(root) {
  root.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel";

  const heading = document.createElement("h3");
  heading.textContent = "Risikoevne (TBE)";
  panel.appendChild(heading);

  // Hent grunnlag
  const totalAssets = (AppState.assets || []).reduce((s, x) => s + (x.amount || 0), 0);
  const totalDebt = (AppState.debts || []).reduce((s, x) => s + (x.amount || 0), 0);

  const incomeItems = AppState.incomes || [];
  const upper = (s) => String(s || "").toUpperCase();
  const isCost = (x) => /SKATT|KOSTNAD/.test(upper(x.name)) && !/SKATTEFRIE\s*INNTEKTER/.test(upper(x.name));
  const isIncome = (x) => !/SKATT|KOSTNAD/.test(upper(x.name)) || /SKATTEFRIE\s*INNTEKTER/.test(upper(x.name));
  const annualCosts = incomeItems.filter(isCost).reduce((s, x) => s + (x.amount || 0), 0);
  const totalIncome = incomeItems.filter(isIncome).reduce((s, x) => s + (x.amount || 0), 0);

  // Gjeldsforpliktelser (per år) - beregnet per gjeldspost
  const annualDebtPayment = calculateTotalAnnualDebtPayment(AppState.debts);
  const annualInterest = calculateTotalAnnualInterest(AppState.debts);

  // Nøkler
  const equity = totalAssets - totalDebt;
  const netAnnualCashflow = totalIncome - annualCosts - annualDebtPayment; // netto etter renter og avdrag
  const annualPrincipal = Math.max(0, annualDebtPayment - annualInterest);

  const debtToIncome = totalIncome > 0 ? totalDebt / totalIncome : 0; // Gjeldsgrad
  const equityPct = totalAssets > 0 ? (equity / totalAssets) * 100 : 0; // EK%
  const cashToDebt =
    totalDebt > 0 ? (netAnnualCashflow + annualPrincipal) / totalDebt : 0; // (Netto årlig kontantstrøm + avdrag) / total gjeld (= (inntekt − kostnader − renter) / gjeld)

  // Klassifisering iht. kriterier
  // Justert terskler (mindre strenge) iht. spesifikasjonen
  // Gjeld/inntekt: Bra < 3x, Ok 3–5x, Dårlig > 5x
  function scoreDebtToIncome(v) { if (v < 3.0) return "high"; if (v <= 5.0) return "mid"; return "low"; }
  // EK-andel: Bra >= 35%, Ok 20–35%, Dårlig < 20%
  function scoreEquityPct(v) { if (v >= 35) return "high"; if (v >= 20) return "mid"; return "low"; }
  // Kontantstrøm/gjeld (Likviditet): 3 (Best) >0,15 · 2 (Middels) 0,05–0,15 · 1 (Dårlig) <0,05
  function scoreCashToDebt(v) {
    if (v > 0.15) return "high";
    if (v >= 0.05) return "mid";
    return "low";
  }

  const s1 = scoreDebtToIncome(debtToIncome);
  const s2 = scoreEquityPct(equityPct);
  const s3 = totalDebt <= 0 ? "high" : scoreCashToDebt(cashToDebt);

  const scoreMap = { low: 1, mid: 2, high: 3 };
  const totalScore = (scoreMap[s1] || 0) + (scoreMap[s2] || 0) + (scoreMap[s3] || 0);
  let overall = totalScore <= 4 ? "low" : totalScore <= 6 ? "mid" : "high";

  function statusLabel(s) { return s === "high" ? "HØY" : s === "mid" ? "MIDDELS" : "LAV"; }
  function statusClass(s) { return s === "high" ? "ok" : s === "mid" ? "mid" : "warn"; }
  function fmtX(x) { return `${Math.round(x)}x`; }
  function fmtXDecimal(x) { return `${x.toFixed(1)}x`; }
  function fmtPct(p) { return `${Math.round(p)} %`; }

  // Tabell
  const table = document.createElement("table");
  table.className = "kpi-table";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Nøkkeltall</th><th>Resultat</th><th>Vurdering</th><th>Formel</th><th>Måler</th></tr>";
  const tbody = document.createElement("tbody");

  function trRow(name, resultText, score, formula, measure, vurderingDetail) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td"); td1.textContent = name; td1.className = "muted";
    const td2 = document.createElement("td"); td2.textContent = resultText;
    const td3 = document.createElement("td");
    const wrap = document.createElement("span");
    wrap.className = `status ${statusClass(score)}`;
    wrap.textContent = statusLabel(score);
    if (vurderingDetail) {
      const stack = document.createElement("div");
      stack.appendChild(wrap);
      const det = document.createElement("div");
      det.className = "muted";
      det.style.cssText = "font-size:12px;margin-top:6px;line-height:1.35;max-width:320px;";
      det.textContent = vurderingDetail;
      stack.appendChild(det);
      td3.appendChild(stack);
    } else {
      td3.appendChild(wrap);
    }
    const td4 = document.createElement("td"); td4.textContent = formula; td4.className = "muted";
    const td5 = document.createElement("td"); td5.textContent = measure; td5.className = "muted";
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(td5);
    return tr;
  }

  function cashToDebtVurderingDetail(scoreKey) {
    if (totalDebt <= 0) return "Ingen gjeld registrert.";
    if (scoreKey === "low") {
      return "1 (Dårlig), under 0,05: Sårbar. Svært lav evne til å håndtere gjelden. Typisk over 20 år til nedbetaling.";
    }
    if (scoreKey === "mid") {
      return "2 (Middels), 0,05–0,15: Moderat. Grei kontroll, men tåler lite uforutsette utgifter. Omtrent 7–20 år.";
    }
    return "3 (Best), over 0,15: Solid. Meget god evne til å kvitte seg med gjeld raskt.";
  }

  tbody.appendChild(trRow("Gjeldsgrad", fmtXDecimal(debtToIncome), s1, "Total gjeld / Årlig inntekt", "Gjeldskapasitet"));
  tbody.appendChild(trRow("Egenkapitalandel (EK%)", fmtPct(equityPct), s2, "(Total EK / Totale eiendeler) × 100", "Soliditet"));
  tbody.appendChild(
    trRow(
      "Kontantstrøm/Gjeld",
      fmtXDecimal(cashToDebt),
      s3,
      "(Netto årlig kontantstrøm + avdrag) / Total gjeld",
      "Likviditet",
      cashToDebtVurderingDetail(s3)
    )
  );

  table.appendChild(thead);
  table.appendChild(tbody);
  panel.appendChild(table);

  // Grafikk for poengvisning
  const chartContainer = document.createElement("div");
  chartContainer.className = "tbe-chart-container";
  
  const chartRow = document.createElement("div");
  chartRow.className = "tbe-chart-row";
  
  // Kategorier med poeng
  const categories = [
    { name: "Gjeldsgrad", score: scoreMap[s1], maxScore: 3, status: s1 },
    { name: "Egenkapitalandel", score: scoreMap[s2], maxScore: 3, status: s2 },
    { name: "Kontantstrøm/Gjeld", score: scoreMap[s3], maxScore: 3, status: s3 }
  ];

  function getScoreRingColor(score, maxScore) {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    if (ratio <= (1 / 3)) return "#EF4444"; // 0-33%: rød
    if (ratio <= (2 / 3)) return "#F97316"; // 34-66%: oransje
    return "#22C55E"; // 67-100%: grønn
  }
  
  categories.forEach((cat) => {
    const chartCard = document.createElement("div");
    chartCard.className = "tbe-chart-card";
    
    const chartTitle = document.createElement("div");
    chartTitle.className = "tbe-chart-title";
    chartTitle.textContent = cat.name;
    chartCard.appendChild(chartTitle);
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 120 120");
    svg.setAttribute("width", "120");
    svg.setAttribute("height", "120");
    svg.className = "tbe-donut-chart";
    
    const centerX = 60;
    const centerY = 60;
    const radius = 45;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    
    // Bakgrunnssirkel (grå)
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", centerX);
    bgCircle.setAttribute("cy", centerY);
    bgCircle.setAttribute("r", radius);
    bgCircle.setAttribute("fill", "none");
    bgCircle.setAttribute("stroke", "#E5E7EB");
    bgCircle.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(bgCircle);
    
    // Fylt sirkel (1/3=rød, 2/3=oransje, 3/3=grønn)
    const fillCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    fillCircle.setAttribute("cx", centerX);
    fillCircle.setAttribute("cy", centerY);
    fillCircle.setAttribute("r", radius);
    fillCircle.setAttribute("fill", "none");
    const fillColor = getScoreRingColor(cat.score, cat.maxScore);
    fillCircle.setAttribute("stroke", fillColor);
    fillCircle.setAttribute("stroke-width", strokeWidth);
    const catRatio = cat.maxScore > 0 ? (cat.score / cat.maxScore) : 0;
    if (catRatio >= 1) {
      // 100 % skal være helt lukket ring uten visuelt gap.
      fillCircle.setAttribute("stroke-dasharray", `${circumference} 0`);
      fillCircle.setAttribute("stroke-dashoffset", "0");
      fillCircle.setAttribute("stroke-linecap", "butt");
    } else {
      const arcLen = catRatio * circumference;
      const gapLen = Math.max(0, circumference - arcLen);
      fillCircle.setAttribute("stroke-dasharray", `${arcLen} ${gapLen}`);
      fillCircle.setAttribute("stroke-dashoffset", circumference / 4);
      fillCircle.setAttribute("stroke-linecap", "round");
    }
    svg.appendChild(fillCircle);
    
    // Tekst i midten
    const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    scoreText.setAttribute("x", centerX);
    scoreText.setAttribute("y", centerY - 8);
    scoreText.setAttribute("text-anchor", "middle");
    scoreText.setAttribute("font-size", "28");
    scoreText.setAttribute("font-weight", "700");
    scoreText.setAttribute("fill", "#1C2A3A");
    scoreText.textContent = cat.score;
    svg.appendChild(scoreText);
    
    const maxText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    maxText.setAttribute("x", centerX);
    maxText.setAttribute("y", centerY + 12);
    maxText.setAttribute("text-anchor", "middle");
    maxText.setAttribute("font-size", "14");
    maxText.setAttribute("font-weight", "500");
    maxText.setAttribute("fill", "#677788");
    maxText.textContent = `/ ${cat.maxScore}`;
    svg.appendChild(maxText);
    
    chartCard.appendChild(svg);
    chartRow.appendChild(chartCard);
  });
  
  // Total score chart (samme størrelse som de andre)
  const totalChartCard = document.createElement("div");
  totalChartCard.className = "tbe-chart-card";
  
  const totalChartTitle = document.createElement("div");
  totalChartTitle.className = "tbe-chart-title";
  totalChartTitle.textContent = "Total score";
  totalChartCard.appendChild(totalChartTitle);
  
  const totalSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  totalSvg.setAttribute("viewBox", "0 0 120 120");
  totalSvg.setAttribute("width", "120");
  totalSvg.setAttribute("height", "120");
  totalSvg.className = "tbe-donut-chart";
  
  const totalCenterX = 60;
  const totalCenterY = 60;
  const totalRadius = 45;
  const totalStrokeWidth = 12;
  const totalCircumference = 2 * Math.PI * totalRadius;
  const maxTotalScore = 9;
  
  // Bakgrunnssirkel
  const totalBgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  totalBgCircle.setAttribute("cx", totalCenterX);
  totalBgCircle.setAttribute("cy", totalCenterY);
  totalBgCircle.setAttribute("r", totalRadius);
  totalBgCircle.setAttribute("fill", "none");
  totalBgCircle.setAttribute("stroke", "#E5E7EB");
  totalBgCircle.setAttribute("stroke-width", totalStrokeWidth);
  totalSvg.appendChild(totalBgCircle);
  
  // Fylt sirkel (samme logikk: 1/3=rød, 2/3=oransje, 3/3=grønn)
  const totalFillCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  totalFillCircle.setAttribute("cx", totalCenterX);
  totalFillCircle.setAttribute("cy", totalCenterY);
  totalFillCircle.setAttribute("r", totalRadius);
  totalFillCircle.setAttribute("fill", "none");
  const totalFillColor = getScoreRingColor(totalScore, maxTotalScore);
  totalFillCircle.setAttribute("stroke", totalFillColor);
  totalFillCircle.setAttribute("stroke-width", totalStrokeWidth);
  const totalRatio = maxTotalScore > 0 ? (totalScore / maxTotalScore) : 0;
  if (totalRatio >= 1) {
    // 100 % skal være helt lukket ring uten visuelt gap.
    totalFillCircle.setAttribute("stroke-dasharray", `${totalCircumference} 0`);
    totalFillCircle.setAttribute("stroke-dashoffset", "0");
    totalFillCircle.setAttribute("stroke-linecap", "butt");
  } else {
    const totalArcLen = totalRatio * totalCircumference;
    const totalGapLen = Math.max(0, totalCircumference - totalArcLen);
    totalFillCircle.setAttribute("stroke-dasharray", `${totalArcLen} ${totalGapLen}`);
    totalFillCircle.setAttribute("stroke-dashoffset", totalCircumference / 4);
    totalFillCircle.setAttribute("stroke-linecap", "round");
  }
  totalSvg.appendChild(totalFillCircle);
  
  // Tekst i midten
  const totalScoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  totalScoreText.setAttribute("x", totalCenterX);
  totalScoreText.setAttribute("y", totalCenterY - 8);
  totalScoreText.setAttribute("text-anchor", "middle");
  totalScoreText.setAttribute("font-size", "28");
  totalScoreText.setAttribute("font-weight", "700");
  totalScoreText.setAttribute("fill", "#1C2A3A");
  totalScoreText.textContent = totalScore;
  totalSvg.appendChild(totalScoreText);
  
  const totalMaxText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  totalMaxText.setAttribute("x", totalCenterX);
  totalMaxText.setAttribute("y", totalCenterY + 12);
  totalMaxText.setAttribute("text-anchor", "middle");
  totalMaxText.setAttribute("font-size", "14");
  totalMaxText.setAttribute("font-weight", "500");
  totalMaxText.setAttribute("fill", "#677788");
  totalMaxText.textContent = `/ ${maxTotalScore}`;
  totalSvg.appendChild(totalMaxText);
  
  totalChartCard.appendChild(totalSvg);
  chartRow.appendChild(totalChartCard);
  
  chartContainer.appendChild(chartRow);
  panel.appendChild(chartContainer);

  // Konklusjon
  const concl = document.createElement("div");
  concl.className = `tbe-conclusion ${overall}`;
  const title = document.createElement("div");
  title.className = "tbe-title";
  title.textContent = `Samlet TBE: ${statusLabel(overall)} (${totalScore} poeng)`;
  const expl = document.createElement("p");
  let reason = "";
  if (overall === "low") {
    const worst = s1 === "low" ? `høy Gjeldsgrad (${fmtX(debtToIncome)})` : s2 === "low" ? `lav EK% (${fmtPct(equityPct)})` : `lav Kontantstrøm/Gjeld (${fmtX(cashToDebt)})`;
    reason = `Din risikoevne er lav med ${totalScore} poeng. Løft indikatorene (bl.a. ${worst}) for å nå minst 5 poeng. Lav betyr 1 poeng, Middels betyr 2 poeng og Høy betyr 3 poeng.`;
  } else if (overall === "mid") {
    reason = `Din risikoevne er middels med ${totalScore} poeng. For å nå Høy må du få minst 7 poeng totalt. Lav betyr 1 poeng, Middels betyr 2 poeng og Høy betyr 3 poeng.`;
  } else {
    reason = `Alle tre nøkkeltall gir samlet ${totalScore} poeng. Økonomien fremstår robust. Lav betyr 1 poeng, Middels betyr 2 poeng og Høy betyr 3 poeng.`;
  }
  expl.textContent = reason;
  concl.appendChild(title);
  concl.appendChild(expl);
  panel.appendChild(concl);

  // Grunnlagsblokk bevisst utelatt i TBE-visningen

  root.appendChild(panel);
  updateTopSummaries();
}

function getFinancialSnapshot() {
  const assets = AppState.assets || [];
  const debts = AppState.debts || [];
  const incomes = AppState.incomes || [];
  const sumAssets = assets.reduce((s, x) => s + (x.amount || 0), 0);
  const sumDebts = debts.reduce((s, x) => s + (x.amount || 0), 0);
  const equity = sumAssets - sumDebts;

  const upper = (s) => String(s || "").toUpperCase();
  const incomeItems = incomes || [];
  const isCost = (x) => /SKATT|KOSTNAD/.test(upper(x.name)) && !/SKATTEFRIE\s*INNTEKTER/.test(upper(x.name));
  const isIncome = (x) => !/SKATT|KOSTNAD/.test(upper(x.name)) || /SKATTEFRIE\s*INNTEKTER/.test(upper(x.name));
  const annualCosts = incomeItems.filter(isCost).reduce((s, x) => s + (x.amount || 0), 0);
  const totalIncome = incomeItems.filter(isIncome).reduce((s, x) => s + (x.amount || 0), 0);
  const disposableIncome = totalIncome - annualCosts;
  const annualDebtPayment = calculateTotalAnnualDebtPaymentForYear(debts, 2026);
  const annualInterest = calculateTotalAnnualInterestForYear(debts, 2026);
  // Toppsammendrag «Kontantstrøm»: samme år og gjeldsspesialregel som «start» i Kontantstrøm-fanen / T-konto
  let cashflow = 0;
  try {
    const cfStart = computeAnnualCashflowBreakdownForYear(2025, {
      kontantstromStartAlignsDebtWith2026: true
    });
    cashflow = Math.round(Number(cfStart && cfStart.net) || 0);
  } catch (e) {
    cashflow = Math.round(getCashflowForecastNetForYear(2025));
  }

  return {
    sumAssets,
    sumDebts,
    equity,
    totalIncome,
    annualCosts,
    annualDebtPayment,
    annualInterest,
    cashflow,
    disposableIncome
  };
}

function calculateTbeSummary(snapshot) {
  const totalAssets = snapshot.sumAssets;
  const totalDebt = snapshot.sumDebts;
  const totalIncome = snapshot.totalIncome;
  const disposableIncome = snapshot.disposableIncome;
  const annualDebtPayment = snapshot.annualDebtPayment;
  const annualInterest = Number(snapshot.annualInterest) || 0;
  const equity = snapshot.equity;

  const debtToIncome = totalIncome > 0 ? totalDebt / totalIncome : 0;
  const equityPct = totalAssets > 0 ? (equity / totalAssets) * 100 : 0;
  const netAnnualCashflow = disposableIncome - annualDebtPayment;
  const annualPrincipal = Math.max(0, annualDebtPayment - annualInterest);
  const cashToDebt =
    totalDebt > 0 ? (netAnnualCashflow + annualPrincipal) / totalDebt : 0;

  const scoreDebtToIncome = (v) => (v < 3.0 ? "high" : v <= 5.0 ? "mid" : "low");
  const scoreEquityPct = (v) => (v >= 35 ? "high" : v >= 20 ? "mid" : "low");
  const scoreCashToDebt = (v) => {
    if (v > 0.15) return "high";
    if (v >= 0.05) return "mid";
    return "low";
  };

  const s1 = scoreDebtToIncome(debtToIncome);
  const s2 = scoreEquityPct(equityPct);
  const s3 = totalDebt <= 0 ? "high" : scoreCashToDebt(cashToDebt);

  const breakdown = { debtToIncome: s1, equityPct: s2, cashToDebt: s3 };

  const scoreMap = { low: 1, mid: 2, high: 3 };
  const totalScore = (scoreMap[s1] || 0) + (scoreMap[s2] || 0) + (scoreMap[s3] || 0);

  const overall = totalScore <= 4 ? "low" : totalScore <= 6 ? "mid" : "high";

  const statusLabel = overall === "high" ? "Høy" : overall === "mid" ? "Middels" : "Lav";
  const statusClass = overall === "high" ? "status-high" : overall === "mid" ? "status-mid" : "status-low";

  return {
    label: statusLabel,
    cssClass: statusClass,
    totalScore,
    breakdown
  };
}

function updateForsideCards(forceActive = false) {
  const forsideIsActive = forceActive || !!document.querySelector('.nav-item[data-section="Forside"].is-active');
  const summaryCards = document.querySelectorAll(".summary-card");
  summaryCards.forEach(card => {
    card.classList.toggle("is-forside", forsideIsActive);
  });
}

function updateTopSummaries() {
  const snapshot = getFinancialSnapshot();
  const el = document.getElementById("sum-assets");
  if (el) el.textContent = formatNOKSummary(snapshot.sumAssets);

  const elD = document.getElementById("sum-debts");
  if (elD) elD.textContent = formatNOKSummary(snapshot.sumDebts);

  const elE = document.getElementById("sum-equity");
  if (elE) elE.textContent = formatNOKSummary(snapshot.equity);

  // Kontantstrøm: år «start» (2025), samme grunnlag som getFinancialSnapshot
  const elC = document.getElementById("sum-cashflow");
  if (elC) elC.textContent = formatNOKSummary(snapshot.cashflow);

  updateForsideCards();

  if (typeof refreshTKontoChart === "function") refreshTKontoChart();
}

// Oppdater kortene for T-Konto visning
function updateCardsForTKonto() {
  const card1 = document.querySelector(".summary-assets .summary-title");
  const card2 = document.querySelector(".summary-debts .summary-title");
  const card3 = document.querySelector(".summary-equity .summary-title");
  const card4 = document.querySelector(".summary-cash .summary-title");
  
  const card1Element = document.querySelector(".summary-assets");
  const card2Element = document.querySelector(".summary-debts");
  const card3Element = document.querySelector(".summary-equity");
  const card4Element = document.querySelector(".summary-cash");
  
  const val1 = document.getElementById("sum-assets");
  const val2 = document.getElementById("sum-debts");
  const val3 = document.getElementById("sum-equity");
  const val4 = document.getElementById("sum-cashflow");
  
  // Legg til is-tkonto klasse for å midtstille teksten
  if (card1Element) card1Element.classList.add("is-tkonto");
  if (card2Element) card2Element.classList.add("is-tkonto");
  if (card3Element) card3Element.classList.add("is-tkonto");
  if (card4Element) card4Element.classList.add("is-tkonto");
  
  if (card1) {
    // Hent faktiske navn fra struktur
    let privatName = "Privat";
    let holdingName = null;
    
    // Hent første Privat-navn
    if (AppState.structure && AppState.structure.privat) {
      const privatArray = Array.isArray(AppState.structure.privat) 
        ? AppState.structure.privat 
        : [AppState.structure.privat];
      if (privatArray.length > 0 && privatArray[0]) {
        privatName = privatArray[0].name || "Privat";
      }
    }
    
    // Hent første aktive Holding AS-navn
    if (AppState.structure && AppState.structure.holding1 && AppState.structure.holding1.active) {
      holdingName = AppState.structure.holding1.name || "Holding AS";
    }
    
    // Sett tekst med linjeskift hvis det er holding
    if (holdingName) {
      card1.innerHTML = `${privatName}<br>${holdingName}`;
    } else {
      card1.textContent = privatName;
    }
    
    card1.classList.remove("danger", "success", "success-dark");
    // Eiendeler beholder standard farge (var(--GRAY_TEXT_DARK))
  }
  if (card2) {
    card2.textContent = "Utvikling eiendeler";
    card2.classList.remove("success", "success-dark");
    card2.classList.add("danger"); // Gjeld: merkevare-blå (se --ERROR_DEBT i CSS)
  }
  if (card3) {
    card3.textContent = "Egenkapital og gjeld";
    card3.classList.remove("danger", "success-dark");
    card3.classList.add("success"); // Egenkapital skal ha grønn farge
  }
  if (card4) {
    card4.textContent = "Ek avkastning";
    card4.classList.remove("danger", "success");
    card4.classList.add("success-dark"); /* tittel på mørkeblå boks — farge fra .summary-cash */
  }
  
  // Skjul verdiene
  if (val1) val1.textContent = "";
  if (val2) val2.textContent = "";
  if (val3) val3.textContent = "";
  if (val4) val4.textContent = "";
  
  // Legg til cursor pointer og klikkbar styling for T-Konto-fanen
  const summaryAssetsButton = document.getElementById("summary-assets-button");
  const summaryDevelopmentButton = document.getElementById("summary-development-button");
  const summaryFinancingButton = document.getElementById("summary-financing-button");
  const summaryEquityReturnButton = document.getElementById("summary-equity-return-button");
  
  if (summaryAssetsButton) {
    summaryAssetsButton.style.cursor = "pointer";
  }
  if (summaryDevelopmentButton) {
    summaryDevelopmentButton.style.cursor = "pointer";
  }
  if (summaryFinancingButton) {
    summaryFinancingButton.style.cursor = "pointer";
  }
  if (summaryEquityReturnButton) {
    summaryEquityReturnButton.style.cursor = "pointer";
  }
}

// Oppdater kortene for Treemap visning - vis verdier i stedet for knapper
function updateCardsForTreemap() {
  const card1 = document.querySelector(".summary-assets .summary-title");
  const card2 = document.querySelector(".summary-debts .summary-title");
  const card3 = document.querySelector(".summary-equity .summary-title");
  const card4 = document.querySelector(".summary-cash .summary-title");
  
  const card1Element = document.querySelector(".summary-assets");
  const card2Element = document.querySelector(".summary-debts");
  const card3Element = document.querySelector(".summary-equity");
  const card4Element = document.querySelector(".summary-cash");
  
  // Fjern is-tkonto klasse hvis den finnes
  if (card1Element) card1Element.classList.remove("is-tkonto");
  if (card2Element) card2Element.classList.remove("is-tkonto");
  if (card3Element) card3Element.classList.remove("is-tkonto");
  if (card4Element) card4Element.classList.remove("is-tkonto");
  
  // Fjern cursor pointer og klikkbar styling for Treemap-fanen
  const summaryAssetsButton = document.getElementById("summary-assets-button");
  const summaryDevelopmentButton = document.getElementById("summary-development-button");
  const summaryFinancingButton = document.getElementById("summary-financing-button");
  const summaryEquityReturnButton = document.getElementById("summary-equity-return-button");
  
  if (summaryAssetsButton) {
    summaryAssetsButton.style.cursor = "default";
  }
  if (summaryDevelopmentButton) {
    summaryDevelopmentButton.style.cursor = "default";
  }
  if (summaryFinancingButton) {
    summaryFinancingButton.style.cursor = "default";
  }
  if (summaryEquityReturnButton) {
    summaryEquityReturnButton.style.cursor = "default";
  }
  
  // Sett tilbake til originale tekster
  if (card1) {
    card1.textContent = "Eiendeler";
    card1.classList.remove("danger", "success", "success-dark");
  }
  if (card2) {
    card2.textContent = "Gjeld";
    card2.classList.remove("success", "success-dark");
    card2.classList.add("danger");
  }
  if (card3) {
    card3.textContent = "Egenkapital";
    card3.classList.remove("danger", "success-dark");
    card3.classList.add("success");
  }
  if (card4) {
    card4.textContent = "Kontantstrøm";
    card4.classList.remove("danger", "success");
    card4.classList.add("success-dark");
  }
  
  // Oppdater verdiene fra treemap-diagrammene (verdiene er allerede lagret i AppState.treemapValues)
  updateCardsFromTreemapValues();
}

// Oppdater kortene med verdier fra treemap-diagrammene
function updateCardsFromTreemapValues() {
  const values = AppState.treemapValues || {};
  
  const elAssets = document.getElementById("sum-assets");
  if (elAssets) elAssets.textContent = formatNOKSummary(values.assets || 0);
  
  const elDebts = document.getElementById("sum-debts");
  if (elDebts) elDebts.textContent = formatNOKSummary(values.debts || 0);
  
  const elEquity = document.getElementById("sum-equity");
  if (elEquity) elEquity.textContent = formatNOKSummary(values.equity || 0);
  
  const elCashflow = document.getElementById("sum-cashflow");
  if (elCashflow) elCashflow.textContent = formatNOKSummary(values.cashflow || 0);
}

// Gjenopprett originale kortene når man forlater T-Konto
function restoreCardsFromTKonto() {
  const card1 = document.querySelector(".summary-assets .summary-title");
  const card2 = document.querySelector(".summary-debts .summary-title");
  const card3 = document.querySelector(".summary-equity .summary-title");
  const card4 = document.querySelector(".summary-cash .summary-title");
  
  const card1Element = document.querySelector(".summary-assets");
  const card2Element = document.querySelector(".summary-debts");
  const card3Element = document.querySelector(".summary-equity");
  const card4Element = document.querySelector(".summary-cash");
  
  // Fjern is-tkonto klasse for å gjenopprette standard justering
  if (card1Element) card1Element.classList.remove("is-tkonto");
  if (card2Element) card2Element.classList.remove("is-tkonto");
  if (card3Element) card3Element.classList.remove("is-tkonto");
  if (card4Element) card4Element.classList.remove("is-tkonto");
  
  if (card1) {
    card1.textContent = "Eiendeler";
    card1.classList.remove("danger", "success", "success-dark");
  }
  if (card2) {
    card2.textContent = "Gjeld";
    card2.classList.add("danger");
  }
  if (card3) {
    card3.textContent = "Egenkapital";
    card3.classList.add("success");
  }
  if (card4) {
    card4.textContent = "Kontantstrøm";
    card4.classList.add("success-dark");
  }
  
  // Oppdater verdiene igjen
  updateTopSummaries();
}



// --- Output modal, copy, and generation ---
function initOutputUI() {
  const fab = document.getElementById("output-fab");
  const modal = document.getElementById("output-modal");
  const textArea = document.getElementById("output-text");
  const copyBtn = document.getElementById("copy-output");

  if (!fab || !modal || !textArea || !copyBtn) return;

  function openModal() {
    // Generate fresh output every time
    try {
      textArea.value = generateOutputText();
    } catch (e) {
      textArea.value = `Kunne ikke generere output.\n${String(e && e.message || e)}`;
    }
    modal.removeAttribute("hidden");
    // Focus for accessibility
    setTimeout(() => { textArea.focus(); textArea.select(); }, 0);
    document.addEventListener("keydown", onKeyDown);
  }

  function closeModal() {
    modal.setAttribute("hidden", "");
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  }

  fab.addEventListener("click", openModal);
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && (t.getAttribute && t.getAttribute("data-close") === "true")) {
      closeModal();
    }
  });

  copyBtn.addEventListener("click", async () => {
    const reset = () => {
      copyBtn.classList.remove("is-success");
      const icon = copyBtn.querySelector(".copy-icon");
      const label = copyBtn.querySelector(".copy-label");
      if (icon) icon.textContent = "📋";
      if (label) label.textContent = "Kopier";
    };

    try {
      const txt = textArea.value || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
      } else {
        // Fallback method
        textArea.focus();
        textArea.select();
        const ok = document.execCommand && document.execCommand("copy");
        if (!ok) throw new Error("Clipboard API ikke tilgjengelig");
      }
      copyBtn.classList.add("is-success");
      const icon = copyBtn.querySelector(".copy-icon");
      const label = copyBtn.querySelector(".copy-label");
      if (icon) icon.textContent = "✔"; // hake-ikon
      if (label) label.textContent = "Kopiert!";
      setTimeout(reset, 2000);
    } catch (err) {
      // Error state visual
      const label = copyBtn.querySelector(".copy-label");
      if (label) label.textContent = "Feil ved kopiering";
      setTimeout(() => { const l = copyBtn.querySelector(".copy-label"); if (l) l.textContent = "Kopier"; }, 2000);
      console.error("Kopiering feilet:", err);
    }
  });
}

function generateOutputText() {
  const INGEN_DATA = "ingen data";
  const orIngenData = (v) => (v === undefined || v === null || (typeof v === "string" && !String(v).trim())) ? INGEN_DATA : v;
  // Formatering
  const formatValue = (v) => {
    const value = Number(v) || 0;
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2).replace('.', ',')} MNOK`;
    }
    return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };
  const formatPercent = (v) => `${Number(v).toFixed(2).replace('.', ',')} %`;
  
  const lines = [];
  let counter = 1;
  
  // Struktur (Structure) - alle bokser med navn
  if (AppState.structure) {
    const structure = AppState.structure;
    
    // Inkluder alle Privat-bokser med navnene deres
    const privatArray = Array.isArray(structure.privat) ? structure.privat : (structure.privat ? [structure.privat] : []);
    privatArray.forEach((privat, index) => {
      if (privat) {
        const defaultName = index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`;
        const displayName = orIngenData(privat.name) || defaultName;
        const label = index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`;
        lines.push(`${counter}: Struktur - ${label} navn: ${displayName}`);
        counter++;
        lines.push(`${counter}: Struktur - ${label} aktiv: ${isPrivatEntryActive(privat, index) ? "ja" : "nei"}`);
        counter++;
      }
    });
    
    // Inkluder alle Holdingselskaper med aktiv status og navn
    if (structure.holding1) {
      lines.push(`${counter}: Struktur - Holding AS 1 aktiv: ${structure.holding1.active ? "ja" : "nei"}`);
      counter++;
      const holding1Name = orIngenData(structure.holding1.name) || "Holding AS";
      lines.push(`${counter}: Struktur - Holding AS 1 navn: ${holding1Name}`);
      counter++;
      const holding1Ownership = Array.isArray(structure.holding1.ownershipPct) && structure.holding1.ownershipPct.length === privatArray.length
        ? structure.holding1.ownershipPct
        : distributeOwnershipForPrivatArray(privatArray);
      privatArray.forEach((privat, index) => {
        const label = index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`;
        const pct = Number(holding1Ownership[index]) || 0;
        lines.push(`${counter}: Struktur - Holding AS 1 eierskap ${label}: ${formatPercent(pct)}`);
        counter++;
      });
    }
    
    if (structure.holding2) {
      lines.push(`${counter}: Struktur - Holding AS 2 aktiv: ${structure.holding2.active ? "ja" : "nei"}`);
      counter++;
      const holding2Name = orIngenData(structure.holding2.name) || "Holding II AS";
      lines.push(`${counter}: Struktur - Holding AS 2 navn: ${holding2Name}`);
      counter++;
      const holding2Ownership = Array.isArray(structure.holding2.ownershipPct) && structure.holding2.ownershipPct.length === privatArray.length
        ? structure.holding2.ownershipPct
        : distributeOwnershipForPrivatArray(privatArray);
      privatArray.forEach((privat, index) => {
        const label = index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`;
        const pct = Number(holding2Ownership[index]) || 0;
        lines.push(`${counter}: Struktur - Holding AS 2 eierskap ${label}: ${formatPercent(pct)}`);
        counter++;
      });
    }

    // Hele familie-/selskapstreet fra «Familieforhold – organisering» (iframe), for Output/Input
    const fd = AppState.strukturDashboardFamilyData;
    if (
      fd &&
      typeof fd === "object" &&
      Array.isArray(fd.partners) &&
      Array.isArray(fd.children) &&
      Array.isArray(fd.companies)
    ) {
      try {
        counter = appendFamiliediagramExportLines(fd, lines, counter);
      } catch (e) {
        console.warn("Struktur: kunne ikke serialisere familiediagram til output", e);
      }
    }
  }
  
  // Eiendeler (Assets) - inkluder alle eiendeler uavhengig av navn eller type
  const allAssets = AppState.assets || [];
  allAssets.forEach((asset) => {
    // Inkluder alle eiendeler - ingen filtrering basert på navn eller type
    if (asset && asset.name !== undefined) {
      const assetName = orIngenData(asset.name) || "Eiendel";
      lines.push(`${counter}: ${assetName}: ${formatValue(asset.amount || 0)}`);
      counter++;
      // Lagre assetType hvis den er satt (for å bevare type når navn endres)
      if (asset.assetType) {
        lines.push(`${counter}: ${assetName} - AssetType: ${orIngenData(asset.assetType)}`);
        counter++;
      }
      // Lagre entity-tilordning (privat, holding1, holding2)
      if (asset.entity) {
        lines.push(`${counter}: ${assetName} - Entity: ${orIngenData(asset.entity)}`);
        counter++;
      }
      if (asset.maalOgBehovPortfolio === true) {
        lines.push(`${counter}: ${assetName} - MaalOgBehovPortefølje: ja`);
        counter++;
      }
    }
  });
  
  // Gjeld (Debts) - navn og beløp
  (AppState.debts || []).forEach((debt) => {
    const debtName = orIngenData(debt.name) || "Gjeld";
    lines.push(`${counter}: ${debtName}: ${formatValue(debt.amount)}`);
    counter++;
    
    // Lånetype (select)
    const debtParams = debt.debtParams || AppState.debtParams;
    lines.push(`${counter}: ${debtName} - Lånetype: ${orIngenData(debtParams.type) || "Annuitetslån"}`);
    counter++;

    let exportStartY = debtParams.startYear;
    if (exportStartY == null || exportStartY === "" || !Number.isFinite(Number(exportStartY))) {
      exportStartY = 2026;
    } else {
      exportStartY = Math.min(2035, Math.max(2026, Number(exportStartY)));
    }
    lines.push(`${counter}: ${debtName} - Startår: ${exportStartY}`);
    counter++;

    // Lånetid (år) - slider
    lines.push(`${counter}: ${debtName} - Lånetid: ${debtParams.years || 25} år`);
    counter++;
    
    // Rentekostnader (%) - slider
    const rate = (debtParams.rate || 0) * 100;
    lines.push(`${counter}: ${debtName} - Rentekostnader: ${formatPercent(rate)}`);
    counter++;
  });
  
  // Inntekter (Incomes)
  (AppState.incomes || []).forEach((income) => {
    const incomeName = orIngenData(income.name) || "Inntekt";
    lines.push(`${counter}: ${incomeName}: ${formatValue(income.amount)}`);
    counter++;
  });
  
  // Forventet avkastning (Expectations) - slider
  const exp = AppState.expectations || {};
  const expLabels = {
    likvider: "BANKINNSKUDD",
    fastEiendom: "PRIMÆRBOLIG",
    investeringer: "INVESTERINGER",
    andreEiendeler: "ANDRE EIENDELER",
    bilbat: "Bil/båt",
    kpi: "KPI"
  };
  Object.keys(expLabels).forEach((key) => {
    if (exp.hasOwnProperty(key)) {
      lines.push(`${counter}: ${expLabels[key]} - Forventet avkastning: ${formatPercent(exp[key])}`);
      counter++;
    }
  });
  
  // Kontantstrøm routing - custom slider (hvis aktiv)
  const routing = AppState.cashflowRouting || {};
  if (routing.mode === "custom" && routing.customAmount !== undefined) {
    lines.push(`${counter}: Kontantstrøm - Tilpasset beløp: ${formatValue(routing.customAmount)}`);
    counter++;
  }
  
  return lines.join("\n");
}

// Eksponer for felles Input/Output på tvers av alle faner (kalles fra TabContainer)
window.TKontoGenerateOutputText = generateOutputText;

// --- Input modal, parse, and apply ---
function initInputUI() {
  const fab = document.getElementById("input-fab");
  const modal = document.getElementById("input-modal");
  const textArea = document.getElementById("input-text");
  const applyBtn = document.getElementById("apply-input");

  if (!fab || !modal || !textArea || !applyBtn) return;

  function openModal() {
    textArea.value = "";
    modal.removeAttribute("hidden");
    setTimeout(() => { textArea.focus(); }, 0);
    document.addEventListener("keydown", onKeyDown);
  }

  function closeModal() {
    modal.setAttribute("hidden", "");
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  }

  fab.addEventListener("click", openModal);
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && (t.getAttribute && t.getAttribute("data-close") === "true")) {
      closeModal();
    }
  });

  applyBtn.addEventListener("click", () => {
    try {
      const txt = textArea.value || "";
      if (parseInputText(txt)) {
        // Oppdater visningen - re-render alle moduler som kan være påvirket
        const moduleRoot = document.getElementById("module-root");
        const currentNav = document.querySelector(".nav-item.is-active");
        if (moduleRoot && currentNav) {
          const section = currentNav.getAttribute("data-section") || currentNav.textContent || "";
          if (section === "Forside") renderForsideModule(moduleRoot);
          else if (section === "Struktur") renderStrukturModule(moduleRoot);
          else if (section === "Eiendeler") renderAssetsModule(moduleRoot);
          else if (section === "Gjeld") renderDebtModule(moduleRoot);
          else if (section === "Inntekter") renderIncomeModule(moduleRoot);
          else if (section === "Analyse") renderAnalysisModule(moduleRoot);
          else if (section === "TBE" || section === "Tapsbærende evne") renderTbeModule(moduleRoot);
          else if (section === "Forventet avkastning") renderExpectationsModule(moduleRoot);
          else if (section === "T-Konto") renderGraphicsModule(moduleRoot);
          else if (section === "Kontantstrøm") renderWaterfallModule(moduleRoot);
          else if (section === "Fremtidig utvikling") renderFutureModule(moduleRoot);
        }
        updateTopSummaries();
        
        // Oppdater også andre modaler som kan være åpne
        notifyCashflowRoutingChange("Input");
        
        // Vis suksess
        applyBtn.classList.add("is-success");
        const icon = applyBtn.querySelector(".copy-icon");
        const label = applyBtn.querySelector(".copy-label");
        if (icon) icon.textContent = "✔";
        if (label) label.textContent = "Oppdatert!";
        setTimeout(() => {
          applyBtn.classList.remove("is-success");
          if (icon) icon.textContent = "✓";
          if (label) label.textContent = "Bruk";
          closeModal();
        }, 1500);
      } else {
        throw new Error("Kunne ikke parse input. Sjekk formatet.");
      }
    } catch (err) {
      const label = applyBtn.querySelector(".copy-label");
      if (label) label.textContent = "Feil!";
      setTimeout(() => {
        const l = applyBtn.querySelector(".copy-label");
        if (l) l.textContent = "Bruk";
      }, 2000);
      console.error("Input parsing feilet:", err);
      alert("Kunne ikke parse input. Sjekk at formatet matcher Output-listen.");
    }
  });
}

/** Tab-separerte felt i Output/Input (unngår rot i én lang JSON-linje). */
function escapeFamiliediagramCell(v) {
  return String(v ?? "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

function countStrukturCompaniesNested(arr) {
  let n = 0;
  (arr || []).forEach((co) => {
    n += 1;
    n += countStrukturCompaniesNested(co.children);
  });
  return n;
}

function appendFamiliediagramExportLines(fd, lines, counterStart) {
  let c = counterStart;
  const esc = escapeFamiliediagramCell;
  const np = (fd.partners && fd.partners.length) || 0;
  const nch = (fd.children && fd.children.length) || 0;
  const nco = countStrukturCompaniesNested(fd.companies);
  lines.push(
    `${c}: Struktur - Familiediagram: ${np} partnere · ${nch} barn · ${nco} selskap`
  );
  c += 1;
  (fd.partners || []).forEach((p) => {
    lines.push(
      `${c}: Struktur - Familiediagram partner: ${esc(p.id)}\t${esc(p.name)}\t${esc(p.info)}\t${esc(p.sector)}\t${esc(p.relationType)}`
    );
    c += 1;
  });
  (fd.children || []).forEach((ch) => {
    const ids = Array.isArray(ch.parentIds) ? ch.parentIds.join(",") : "";
    lines.push(
      `${c}: Struktur - Familiediagram barn: ${esc(ch.id)}\t${esc(ch.name)}\t${esc(ch.info)}\t${esc(ch.sector)}\t${esc(ch.parentType)}\t${ids}`
    );
    c += 1;
  });
  function walkCo(arr, parentRef) {
    (arr || []).forEach((co) => {
      const sh =
        co.shares && typeof co.shares === "object"
          ? Object.keys(co.shares)
              .sort()
              .map((k) => `${k}=${co.shares[k]}`)
              .join(",")
          : "";
      lines.push(
        `${c}: Struktur - Familiediagram selskap: ${esc(co.id)}\t${esc(co.name)}\t${esc(co.info)}\t${esc(co.sector)}\t${sh}\t${parentRef}`
      );
      c += 1;
      if (co.children && co.children.length) walkCo(co.children, esc(co.id));
    });
  }
  walkCo(fd.companies, "-");
  return c;
}

function parseSharesFamiliediagramExport(s) {
  const shares = {};
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const eq = pair.indexOf("=");
      if (eq <= 0) return;
      const k = pair.slice(0, eq).trim();
      const v = pair.slice(eq + 1).trim();
      if (k) shares[k] = Number(v) || 0;
    });
  return shares;
}

function buildCompanyTreeFromFamiliediagramExportRows(rows) {
  if (!rows.length) return [];
  const nodes = new Map();
  rows.forEach((r) => {
    nodes.set(r.id, {
      id: r.id,
      name: r.name,
      info: r.info || "",
      sector: r.sector || "",
      shares: r.shares && typeof r.shares === "object" ? r.shares : {},
      children: []
    });
  });
  const roots = [];
  rows.forEach((r) => {
    const node = nodes.get(r.id);
    const p = r.parentId;
    if (!p || p === "-") roots.push(node);
    else {
      const parent = nodes.get(p);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });
  return roots;
}

/** Bruker parsed familiediagram fra Output/Input (json eller legacy base64). */
function applyParsedStrukturFamiliediagram(data) {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.partners) ||
    !Array.isArray(data.children) ||
    !Array.isArray(data.companies)
  ) {
    return false;
  }
  try {
    AppState.strukturDashboardFamilyData = JSON.parse(JSON.stringify(data));
    const partnerLabelByIndex = ["I", "II", "III", "IV"];
    const partners = (data.partners || []).slice(0, 4).map((p, index) => ({
      id: p.id,
      name: String(p.name || "").trim() || `Ektefelle ${partnerLabelByIndex[index] || String(index + 1)}`
    }));
    const companiesFlat = [];
    const collectCompanies = (arr) => {
      (arr || []).forEach((c) => {
        companiesFlat.push({
          id: c.id,
          name: String(c.name || "").trim() || "Selskap"
        });
        if (c.children && c.children.length) collectCompanies(c.children);
      });
    };
    collectCompanies(data.companies || []);
    syncStructurePartnersFromDashboard(partners);
    syncStructureCompaniesFromDashboard(companiesFlat);
    return true;
  } catch (e) {
    console.warn("Struktur: kunne ikke bruke familiediagram-data", e);
    return false;
  }
}

/** Samme verdier som i gjeld-modulens lånetype-nedtrekk (case-insensitiv ved import). */
function normalizeDebtLanetypeFromInput(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "Annuitetslån";
  const canon = [
    "Annuitetslån",
    "Serielån",
    "Avdragsfrihet",
    "Avdragsfrihet 3 år",
    "Avdragsfrihet 5 år",
    "Avdragsfrihet 10 år",
    "Ballonglån 3 år",
    "Ballonglån 5 år",
    "Ballonglån 10 år"
  ];
  const lower = t.toLowerCase();
  const hit = canon.find((c) => c.toLowerCase() === lower);
  return hit || t;
}

function parseInputText(text) {
  if (!text || !text.trim()) return false;
  
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  // Parse hver linje
  const assets = [];
  const debts = [];
  const incomes = [];
  const expectations = {};
  let cashflowCustomAmount = null;
  
  const debtMap = new Map(); // Map for å holde styr på gjeldsposter
  const assetTypeMap = new Map(); // Map for å holde styr på assetType for hver eiendel
  const entityMap = new Map(); // Map for å holde styr på entity-tilordning for hver eiendel
  const maalOgBehovPortfolioMap = new Map(); // Mål og behov-portefølje-rad (uavhengig av visningsnavn)
  const structureData = {}; // Struktur-data fra input
  const fdPartnersIn = [];
  const fdChildrenIn = [];
  const fdCompaniesIn = [];

  for (const line of lines) {
    // Format: "1: BANK: 2 MNOK" eller "1: BANK: 2 000 000 kr"
    const match = line.match(/^\d+:\s*(.+?):\s*(.+)$/);
    if (!match) continue;
    
    const [, name, valueStr] = match;

    if (name === "Struktur - Familiediagram (base64)") {
      try {
        const jsonStr = decodeURIComponent(escape(atob(String(valueStr).trim())));
        const data = JSON.parse(jsonStr);
        applyParsedStrukturFamiliediagram(data);
      } catch (e) {
        console.warn("Struktur: kunne ikke lese familiediagram (base64) fra input", e);
      }
      continue;
    }
    if (name === "Struktur - Familiediagram (json)") {
      try {
        const data = JSON.parse(String(valueStr).trim());
        applyParsedStrukturFamiliediagram(data);
      } catch (e) {
        console.warn("Struktur: kunne ikke lese familiediagram (json) fra input", e);
      }
      continue;
    }
    if (name === "Struktur - Familiediagram") {
      continue;
    }
    if (name === "Struktur - Familiediagram partner") {
      const cols = String(valueStr).split("\t");
      if (cols.length >= 5) {
        fdPartnersIn.push({
          id: cols[0].trim(),
          name: cols[1] || "",
          info: cols[2] || "",
          sector: cols[3] || "",
          relationType: cols[4] || ""
        });
      }
      continue;
    }
    if (name === "Struktur - Familiediagram barn") {
      const cols = String(valueStr).split("\t");
      if (cols.length >= 6) {
        const parentIds = String(cols[5] || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        fdChildrenIn.push({
          id: cols[0].trim(),
          name: cols[1] || "",
          info: cols[2] || "",
          sector: cols[3] || "",
          parentType: cols[4] || "",
          parentIds
        });
      }
      continue;
    }
    if (name === "Struktur - Familiediagram selskap") {
      const cols = String(valueStr).split("\t");
      if (cols.length >= 6) {
        fdCompaniesIn.push({
          id: cols[0].trim(),
          name: cols[1] || "",
          info: cols[2] || "",
          sector: cols[3] || "",
          shares: parseSharesFamiliediagramExport(cols[4]),
          parentId: String(cols[5] || "").trim()
        });
      }
      continue;
    }

      // Gjeld med navn og beløp (før låneparametere)
      if (!name.includes(" - ") && !name.includes("Forventet avkastning") && name !== "Kontantstrøm - Tilpasset beløp") {
        const upperName = name.toUpperCase();
        // Sjekk om det er en gjeld (kommer før inntekter i listen)
        // Vi må sjekke om neste linje er en lånetype for å vite om det er gjeld
        const lineIndex = lines.indexOf(line);
        const nextLine = lines[lineIndex + 1];
        if (nextLine && nextLine.includes(" - Lånetype")) {
          const value = parseValue(valueStr);
          const debtName = name;
          debtMap.set(debtName, {
            name: debtName,
            amount: value,
            debtParams: { type: "Annuitetslån", years: 25, rate: 0.04 }
          });
        } else if (/L[ØO]NN|PENSJON|UTBYT|SKATTEFRIE\s*INNTEKTER|UTBETALINGER?\s*FRA\s*M[ÅA]L\s*OG\s*BEHOV|SKATT|KOSTNAD/i.test(upperName)) {
          // Inntekt - sjekk først for å unngå feilklassifisering
          const value = parseValue(valueStr);
          incomes.push({ name: name, amount: value });
        } else {
          // Alle andre linjer som ikke er gjeld eller inntekt er eiendeler
          // Dette sikrer at alle eiendeler med egendefinerte navn også blir gjenkjent
          const value = parseValue(valueStr);
          assets.push({ name: name, amount: value });
        }
      }
    
    // Gjeld parametere
    if (name.includes(" - Lånetype")) {
      const debtName = name.replace(" - Lånetype", "");
      const normalizedType = normalizeDebtLanetypeFromInput(valueStr);
      if (!debtMap.has(debtName)) {
        debtMap.set(debtName, {
          name: debtName,
          amount: 0,
          debtParams: { type: normalizedType, years: 25, rate: 0.04 }
        });
      } else {
        debtMap.get(debtName).debtParams.type = normalizedType;
      }
    } else if (name.includes(" - Startår")) {
      const debtName = name.replace(" - Startår", "");
      const startY = parseInt(String(valueStr).trim(), 10);
      if (!isNaN(startY)) {
        const clamped = Math.min(2035, Math.max(2026, startY));
        if (!debtMap.has(debtName)) {
          debtMap.set(debtName, {
            name: debtName,
            amount: 0,
            debtParams: { type: "Annuitetslån", years: 25, rate: 0.04, startYear: clamped }
          });
        } else {
          debtMap.get(debtName).debtParams.startYear = clamped;
        }
      }
    } else if (name.includes(" - Lånetid")) {
      const debtName = name.replace(" - Lånetid", "");
      const years = parseInt(valueStr.replace(" år", "").trim());
      if (!isNaN(years)) {
        if (!debtMap.has(debtName)) {
          debtMap.set(debtName, {
            name: debtName,
            amount: 0,
            debtParams: { type: "Annuitetslån", years: years, rate: 0.04 }
          });
        } else {
          debtMap.get(debtName).debtParams.years = years;
        }
      }
    } else if (name.includes(" - Rentekostnader")) {
      const debtName = name.replace(" - Rentekostnader", "");
      const rate = parsePercent(valueStr) / 100;
      if (!isNaN(rate)) {
        if (!debtMap.has(debtName)) {
          debtMap.set(debtName, {
            name: debtName,
            amount: 0,
            debtParams: { type: "Annuitetslån", years: 25, rate: rate }
          });
        } else {
          debtMap.get(debtName).debtParams.rate = rate;
        }
      }
    } else if (name.includes("Forventet avkastning")) {
      const expKey = name.replace(" - Forventet avkastning", "").trim();
      const percent = parsePercent(valueStr);
      if (expKey === "BANK" || expKey === "BANKINNSKUDD") expectations.likvider = percent;
      else if (expKey === "FAST EIENDOM" || expKey === "PRIMÆRBOLIG") expectations.fastEiendom = percent;
      else if (expKey === "INVESTERINGER") expectations.investeringer = percent;
      else if (expKey === "ANDRE EIENDELER") expectations.andreEiendeler = percent;
      else if (expKey === "Bil/båt") expectations.bilbat = percent;
      else if (expKey === "KPI") expectations.kpi = percent;
    } else if (name === "Kontantstrøm - Tilpasset beløp") {
      cashflowCustomAmount = parseValue(valueStr);
    } else if (name.includes(" - AssetType")) {
      // Lagre assetType for eiendel
      const assetName = name.replace(" - AssetType", "");
      assetTypeMap.set(assetName, valueStr.trim());
    } else if (name.includes(" - Entity")) {
      // Lagre entity-tilordning for eiendel
      const assetName = name.replace(" - Entity", "");
      entityMap.set(assetName, valueStr.trim());
    } else if (name.includes(" - MaalOgBehovPortefølje")) {
      const assetName = name.replace(" - MaalOgBehovPortefølje", "");
      maalOgBehovPortfolioMap.set(assetName, /^(ja|yes|true|1)$/i.test(String(valueStr).trim()));
    } else if (name.startsWith("Struktur - ")) {
      // Parse struktur-data
      // Håndter alle Privat-bokser (Privat navn, Privat II navn, Privat III navn, osv.)
      const privatNavnMatch = name.match(/Privat\s+(II|III|IV|V|VI|VII|VIII|IX|X|\d+)?\s+navn/);
      if (privatNavnMatch) {
        const romanNumeral = privatNavnMatch[1] || "";
        // Konverter romertall til indeks (II = 1, III = 2, osv.)
        let index = 0;
        if (romanNumeral) {
          const romanMap = { "II": 1, "III": 2, "IV": 3, "V": 4, "VI": 5, "VII": 6, "VIII": 7, "IX": 8, "X": 9 };
          index = romanMap[romanNumeral] !== undefined ? romanMap[romanNumeral] : (parseInt(romanNumeral, 10) - 1 || 0);
        }
        if (!structureData.privatNames) {
          structureData.privatNames = {};
        }
        structureData.privatNames[index] = valueStr.trim();
      } else if (name.match(/Privat\s+(II|III|IV|V|VI|VII|VIII|IX|X|\d+)?\s+aktiv/)) {
        const privActiveMatch = name.match(/Privat\s+(II|III|IV|V|VI|VII|VIII|IX|X|\d+)?\s+aktiv/);
        const romanNumeral = (privActiveMatch && privActiveMatch[1]) || "";
        let index = 0;
        if (romanNumeral) {
          const romanMap = { "II": 1, "III": 2, "IV": 3, "V": 4, "VI": 5, "VII": 6, "VIII": 7, "IX": 8, "X": 9 };
          index = romanMap[romanNumeral] !== undefined ? romanMap[romanNumeral] : (parseInt(romanNumeral, 10) - 1 || 0);
        }
        if (!structureData.privatActive) {
          structureData.privatActive = {};
        }
        structureData.privatActive[index] = valueStr.trim().toLowerCase() === "ja";
      } else if (name.includes("Privat aktiv") && !name.includes("II") && !name.includes("III") && !name.includes("IV") && !name.includes("V")) {
        if (!structureData.privatActive) {
          structureData.privatActive = {};
        }
        structureData.privatActive[0] = valueStr.trim().toLowerCase() === "ja";
      } else if (name.includes("Privat navn") && !name.includes("II") && !name.includes("III") && !name.includes("IV") && !name.includes("V")) {
        // Første Privat (uten romertall)
        if (!structureData.privatNames) {
          structureData.privatNames = {};
        }
        structureData.privatNames[0] = valueStr.trim();
      } else if (name.includes("Holding AS 1 eierskap ")) {
        const ownershipMatch = name.match(/Holding AS 1 eierskap Privat\s*(II|III|IV|V|VI|VII|VIII|IX|X|\d+)?$/);
        let index = 0;
        if (ownershipMatch && ownershipMatch[1]) {
          const romanNumeral = ownershipMatch[1];
          const romanMap = { "II": 1, "III": 2, "IV": 3, "V": 4, "VI": 5, "VII": 6, "VIII": 7, "IX": 8, "X": 9 };
          index = romanMap[romanNumeral] !== undefined ? romanMap[romanNumeral] : (parseInt(romanNumeral, 10) - 1 || 0);
        }
        if (!structureData.holding1Ownership) structureData.holding1Ownership = {};
        structureData.holding1Ownership[index] = parsePercent(valueStr);
      } else if (name.includes("Holding AS 2 eierskap ")) {
        const ownershipMatch = name.match(/Holding AS 2 eierskap Privat\s*(II|III|IV|V|VI|VII|VIII|IX|X|\d+)?$/);
        let index = 0;
        if (ownershipMatch && ownershipMatch[1]) {
          const romanNumeral = ownershipMatch[1];
          const romanMap = { "II": 1, "III": 2, "IV": 3, "V": 4, "VI": 5, "VII": 6, "VIII": 7, "IX": 8, "X": 9 };
          index = romanMap[romanNumeral] !== undefined ? romanMap[romanNumeral] : (parseInt(romanNumeral, 10) - 1 || 0);
        }
        if (!structureData.holding2Ownership) structureData.holding2Ownership = {};
        structureData.holding2Ownership[index] = parsePercent(valueStr);
      } else if (name.includes("Holding AS 1 aktiv")) {
        structureData.holding1Active = valueStr.trim().toLowerCase() === "ja";
      } else if (name.includes("Holding AS 1 navn")) {
        structureData.holding1Name = valueStr.trim();
      } else if (name.includes("Holding AS 2 aktiv")) {
        structureData.holding2Active = valueStr.trim().toLowerCase() === "ja";
      } else if (name.includes("Holding AS 2 navn")) {
        structureData.holding2Name = valueStr.trim();
      }
    }
  }
  
  // Konverter gjeld Map til array
  debts.push(...Array.from(debtMap.values()));
  
  // Oppdater AppState
  if (assets.length > 0) {
    AppState.assets = assets.map((a) => {
      const upperName = a.name.toUpperCase();
      // Migrer gamle asset-navn til nye betegnelser for å få konsistent UI.
      // (Bruk original `a.name` for assetType/entity-mapping, men oppdater asset.name i AppState.)
      let migratedName = a.name;
      if (/^BANK$/i.test(upperName)) migratedName = "Bankinnskudd";
      else if (/^FAST\s*EIENDOM$/i.test(upperName) || /^EIENDOM$/i.test(upperName)) migratedName = "Primærbolig";
      else if (/^SEKUNDÆREIENDOM$/i.test(upperName) || /^SEKUNDÆRBOLIG$/i.test(upperName)) migratedName = "Sekundærbolig";
      const asset = {
        id: genId(),
        name: migratedName,
        amount: a.amount
      };
      // Default-eiendeler: navn skal ikke kunne endres
      const isLegacyDefaultAsset =
        /^BANK$/i.test(a.name) ||
        /^FAST\s*EIENDOM$/i.test(a.name) ||
        /^SEKUNDÆREIENDOM$/i.test(a.name);
      if (DEFAULT_ASSET_NAMES.includes(a.name) || isLegacyDefaultAsset) {
        asset.noRename = true;
      }
      // Bruk assetType fra output hvis den er lagret, ellers sett basert på navn
      if (assetTypeMap.has(a.name)) {
        asset.assetType = assetTypeMap.get(a.name);
      } else {
        // Fallback: Sett assetType basert på navn (for bakoverkompatibilitet)
        if (/^(FAST\s*EIENDOM|PRIMÆRBOLIG)$/i.test(upperName)) {
          asset.assetType = "eiendom";
        } else if (/^FRITIDSEIENDOM$/i.test(upperName)) {
          asset.assetType = "fritidseiendom";
        } else if (/^(SEKUNDÆREIENDOM|SEKUNDÆRBOLIG)$/i.test(upperName)) {
          asset.assetType = "sekundaereiendom";
        } else if (/^TOMT$/i.test(upperName)) {
          asset.assetType = "tomt";
        } else if (/^EIENDOM$/i.test(a.name) && !/FAST/i.test(a.name)) {
          asset.assetType = "eiendom";
        } else if (/INVESTERINGER\s*MÅL\s*OG\s*BEHOV/i.test(upperName)) {
          asset.assetType = "investeringer";
          asset.maalOgBehovPortfolio = true;
        } else if (/^INVESTERINGER$/i.test(upperName)) {
          asset.assetType = "investeringer";
        } else if (/^BIL\/BÅT$/i.test(upperName)) {
          asset.assetType = "bilbat";
        } else if (/^ANDRE\s*EIENDELER$/i.test(upperName)) {
          asset.assetType = "andre";
        }
      }
      // Legg til entity-tilordning hvis den er satt
      if (entityMap.has(a.name)) {
        asset.entity = entityMap.get(a.name);
      }
      if (maalOgBehovPortfolioMap.has(a.name)) {
        asset.maalOgBehovPortfolio = maalOgBehovPortfolioMap.get(a.name) === true;
      } else if (/investeringer\s*mål\s*og\s*behov/i.test(String(asset.name || ""))) {
        asset.maalOgBehovPortfolio = true;
      }
      return asset;
    });
  }
  
  if (debts.length > 0) {
    AppState.debts = debts.map((d) => ({
      id: genId(),
      name: d.name,
      amount: d.amount,
      debtParams: d.debtParams || AppState.debtParams
    }));
  }
  
  if (incomes.length > 0) {
    AppState.incomes = incomes.map((i) => ({
      id: genId(),
      name: i.name,
      amount: i.amount
    }));
    reorderIncomesForDisplay();
    const wealthTaxAfterRestore = AppState.incomes.find(i => i.name === "Formuesskatt");
    if (wealthTaxAfterRestore) setFormuesskattForMaalOgBehov(wealthTaxAfterRestore.amount);
  }
  
  if (Object.keys(expectations).length > 0) {
    AppState.expectations = { ...AppState.expectations, ...expectations };
  }
  
  if (cashflowCustomAmount !== null) {
    if (!AppState.cashflowRouting) AppState.cashflowRouting = { mode: "custom", customAmount: 0 };
    AppState.cashflowRouting.mode = "custom";
    AppState.cashflowRouting.customAmount = cashflowCustomAmount;
  }
  
  // Oppdater struktur-data hvis det finnes i input
  if (Object.keys(structureData).length > 0) {
    if (!AppState.structure) {
      AppState.structure = {
        privat: [
          { active: true, name: "Privat" },
          { active: false, name: "Privat II" }
        ],
        holding1: { active: false, name: "Holding AS", ownershipPct: null },
        holding2: { active: false, name: "Holding II AS", ownershipPct: null }
      };
    }
    
    // Migrer gammel struktur hvis nødvendig
    if (!Array.isArray(AppState.structure.privat)) {
      AppState.structure.privat = [AppState.structure.privat];
    }
    
    // Oppdater alle Privat-bokser fra input
    if (structureData.privatNames && Object.keys(structureData.privatNames).length > 0) {
      const privatNames = structureData.privatNames;
      const maxIndex = Math.max(...Object.keys(privatNames).map(k => parseInt(k, 10)));
      
      // Sørg for at vi har nok Privat-bokser
      while (AppState.structure.privat.length <= maxIndex) {
        const newIndex = AppState.structure.privat.length;
        const defaultName = newIndex === 0 ? "Privat" : `Privat ${getRomanNumeral(newIndex + 1)}`;
        AppState.structure.privat.push({ active: true, name: defaultName });
      }
      
      // Oppdater navnene
      Object.keys(privatNames).forEach(indexStr => {
        const index = parseInt(indexStr, 10);
        if (AppState.structure.privat[index]) {
          AppState.structure.privat[index].name = privatNames[index];
        }
      });
    }

    if (structureData.privatActive && Object.keys(structureData.privatActive).length > 0) {
      const privatActive = structureData.privatActive;
      const maxIndex = Math.max(...Object.keys(privatActive).map(k => parseInt(k, 10)));
      while (AppState.structure.privat.length <= maxIndex) {
        const newIndex = AppState.structure.privat.length;
        const defaultName = newIndex === 0 ? "Privat" : `Privat ${getRomanNumeral(newIndex + 1)}`;
        AppState.structure.privat.push({ active: true, name: defaultName });
      }
      Object.keys(privatActive).forEach(indexStr => {
        const index = parseInt(indexStr, 10);
        if (AppState.structure.privat[index]) {
          if (index === 0) {
            AppState.structure.privat[index].active = true;
          } else {
            AppState.structure.privat[index].active = !!privatActive[index];
          }
        }
      });
    }
    
    // Oppdater Holdingselskaper (aktiv-status og/eller navn)
    if (structureData.holding1Active !== undefined || structureData.holding1Name) {
      if (!AppState.structure.holding1) {
        AppState.structure.holding1 = { active: false, name: "Holding AS" };
      }
      if (structureData.holding1Active !== undefined) AppState.structure.holding1.active = structureData.holding1Active;
      if (structureData.holding1Name) AppState.structure.holding1.name = structureData.holding1Name;
    }
    
    if (structureData.holding2Active !== undefined || structureData.holding2Name) {
      if (!AppState.structure.holding2) {
        AppState.structure.holding2 = { active: false, name: "Holding II AS" };
      }
      if (structureData.holding2Active !== undefined) AppState.structure.holding2.active = structureData.holding2Active;
      if (structureData.holding2Name) AppState.structure.holding2.name = structureData.holding2Name;
    }

    if (!AppState.structure.holding1 || AppState.structure.holding1.ownershipPct === undefined) {
      if (!AppState.structure.holding1) AppState.structure.holding1 = { active: false, name: "Holding AS", ownershipPct: null };
      if (AppState.structure.holding1.ownershipPct === undefined) AppState.structure.holding1.ownershipPct = null;
    }
    if (!AppState.structure.holding2 || AppState.structure.holding2.ownershipPct === undefined) {
      if (!AppState.structure.holding2) AppState.structure.holding2 = { active: false, name: "Holding II AS", ownershipPct: null };
      if (AppState.structure.holding2.ownershipPct === undefined) AppState.structure.holding2.ownershipPct = null;
    }

    const privatArray = AppState.structure.privat || [];
    syncAllHoldingOwnershipLengths(privatArray);

    if (structureData.holding1Ownership && Object.keys(structureData.holding1Ownership).length > 0) {
      const row = privatArray.map(() => 0);
      Object.keys(structureData.holding1Ownership).forEach((indexStr) => {
        const idx = parseInt(indexStr, 10);
        if (idx >= 0 && idx < row.length) row[idx] = Number(structureData.holding1Ownership[idx]) || 0;
      });
      AppState.structure.holding1.ownershipPct = row;
    }

    if (structureData.holding2Ownership && Object.keys(structureData.holding2Ownership).length > 0) {
      const row = privatArray.map(() => 0);
      Object.keys(structureData.holding2Ownership).forEach((indexStr) => {
        const idx = parseInt(indexStr, 10);
        if (idx >= 0 && idx < row.length) row[idx] = Number(structureData.holding2Ownership[idx]) || 0;
      });
      AppState.structure.holding2.ownershipPct = row;
    }

    syncAllHoldingOwnershipLengths(privatArray);
  }

  if (fdPartnersIn.length || fdChildrenIn.length || fdCompaniesIn.length) {
    applyParsedStrukturFamiliediagram({
      partners: fdPartnersIn,
      children: fdChildrenIn,
      companies: buildCompanyTreeFromFamiliediagramExportRows(fdCompaniesIn)
    });
  }

  // Signaliser at T-konto-data er oppdatert (Oppsummeringsrapport leser kontantstrøm herfra)
  try {
    if (typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("tkonto-data-changed"));
    }
  } catch (e) {}
  return true;
}

window.TKontoParseInputText = parseInputText;

// Kalles etter Input lastes inn fra felles Input-modal (TabContainer) – oppdaterer T-konto UI
window.TKontoRefreshAfterInputLoad = function () {
  const moduleRoot = document.getElementById("module-root");
  const currentNav = document.querySelector(".nav-item.is-active");
  if (moduleRoot && currentNav) {
    const section = currentNav.getAttribute("data-section") || currentNav.textContent || "";
    if (section === "Forside" && typeof renderForsideModule === "function") renderForsideModule(moduleRoot);
    else if (section === "Struktur" && typeof renderStrukturModule === "function") renderStrukturModule(moduleRoot);
    else if (section === "Eiendeler" && typeof renderAssetsModule === "function") renderAssetsModule(moduleRoot);
    else if (section === "Gjeld" && typeof renderDebtModule === "function") renderDebtModule(moduleRoot);
    else if (section === "Inntekter" && typeof renderIncomeModule === "function") renderIncomeModule(moduleRoot);
    else if (section === "Analyse" && typeof renderAnalysisModule === "function") renderAnalysisModule(moduleRoot);
    else if ((section === "TBE" || section === "Tapsbærende evne") && typeof renderTbeModule === "function") renderTbeModule(moduleRoot);
    else if (section === "Forventet avkastning" && typeof renderExpectationsModule === "function") renderExpectationsModule(moduleRoot);
    else if (section === "T-Konto" && typeof renderGraphicsModule === "function") renderGraphicsModule(moduleRoot);
    else if (section === "Kontantstrøm" && typeof renderWaterfallModule === "function") renderWaterfallModule(moduleRoot);
    else if (section === "Fremtidig utvikling" && typeof renderFutureModule === "function") renderFutureModule(moduleRoot);
    else if (typeof renderStrukturModule === "function") renderStrukturModule(moduleRoot);
  }
  if (typeof updateTopSummaries === "function") updateTopSummaries();
  if (typeof notifyCashflowRoutingChange === "function") notifyCashflowRoutingChange("Input");
  try {
    if (typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("tkonto-data-changed"));
    }
  } catch (e) {}
};

(function initMaalOgBehovNettoPrognosisListener() {
  if (typeof window === "undefined" || window.__tkontoMoBNettoPrognosisListener) return;
  window.__tkontoMoBNettoPrognosisListener = true;
  window.addEventListener("maal-og-behov-prognosis-exported", function () {
    try {
      syncSkattefrieMoBAmountFromToggle();
      if (typeof updateTopSummaries === "function") updateTopSummaries();
      refreshTkontoViewsAfterMoBPrognosis();
    } catch (e) {}
  });
})();

function parseValue(str) {
  if (!str) return 0;
  str = str.trim();
  
  // Helper function to parse Norwegian number format
  // Handles: "2 000 000,50" (spaces = thousands, comma = decimal)
  // or: "2000000.50" (international format)
  const parseNumber = (numStr) => {
    // Remove spaces (Norwegian thousands separator)
    numStr = numStr.replace(/\s/g, '');
    
    // Check if there's a comma (Norwegian decimal separator)
    if (numStr.includes(',')) {
      // Replace comma with dot for parsing
      numStr = numStr.replace(',', '.');
    }
    
    const value = parseFloat(numStr) || 0;
    return Math.round(value * 100) / 100; // Round to 2 decimal places
  };
  
  // MNOK format: "2 MNOK" eller "2,5 MNOK" eller "2,50 MNOK"
  const mnokMatch = str.match(/([\d\s,\.]+)\s*MNOK/i);
  if (mnokMatch) {
    const value = parseNumber(mnokMatch[1]) * 1000000;
    return Math.round(value * 100) / 100; // Round to 2 decimal places
  }
  
  // Standard kr format: "2 000 000 kr" eller "2000000 kr" eller "2 000 000,50 kr"
  const krMatch = str.match(/([\d\s,\.]+)\s*kr/i);
  if (krMatch) {
    return parseNumber(krMatch[1]);
  }
  
  // Bare tall (kan ha desimaler)
  const numMatch = str.match(/([\d\s,\.]+)/);
  if (numMatch) {
    return parseNumber(numMatch[1]);
  }
  
  return 0;
}

function parsePercent(str) {
  if (!str) return 0;
  str = str.trim();
  
  // Format: "4,0 %" eller "4.0%" eller "4,50 %"
  const match = str.match(/([\d,.-]+)\s*%/);
  if (match) {
    const value = parseFloat(match[1].replace(',', '.')) || 0;
    return Math.round(value * 100) / 100; // Round to 2 decimal places
  }
  
  return 0;
}

