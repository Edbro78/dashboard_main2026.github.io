// Global app state
let __nextId = 1;
function genId() { return __nextId++; }

const AppState = {
  assets: [
    { id: genId(), name: "BANK", amount: 2000000 },
    { id: genId(), name: "FAST EIENDOM", amount: 15000000 },
    { id: genId(), name: "Investeringer Mål og behov", amount: 8000000, assetType: "investeringer", noDelete: true }
  ],
  debts: [
    { id: genId(), name: "BOLIGLÅN", amount: 10000000, debtParams: { type: "Annuitetslån", years: 25, rate: 0.04 } }
  ],
  incomes: [
    { id: genId(), name: "LØNNSINNTEKT", amount: 1500000 },
    { id: genId(), name: "UTBYTTER", amount: 0 },
    { id: genId(), name: "Skattefrie inntekter", amount: 0 },
    { id: genId(), name: "Inntektsskatt", amount: 0 },
    { id: genId(), name: "Utbytteskatt", amount: 0 },
    { id: genId(), name: "Formuesskatt", amount: 0 },
    { id: genId(), name: "ÅRLIGE KOSTNADER", amount: 0 }
  ],
  debtParams: { type: "Annuitetslån", years: 25, rate: 0.04 }, // Fallback for bakoverkompatibilitet
  expectations: { likvider: 4, fastEiendom: 5, investeringer: 8, andreEiendeler: 0, bilbat: -5, kpi: 2.5 },
  cashflowRouting: { mode: "forbruk", customAmount: 0 },
  structure: {
    privat: [{ active: true, name: "Privat" }], // Array for å støtte flere privat-bokser
    holding1: { active: false, name: "Holding AS" },
    holding2: { active: false, name: "Holding II AS" }
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

// Oppdater skatt hvis auto-beregning er aktiv
function updateAutoTax() {
  // Oppdater Inntektsskatt
  const taxItem = AppState.incomes.find(i => i.name === "Inntektsskatt");
  if (taxItem && taxItem._autoTaxEnabled) {
    const wageIncome = AppState.incomes.find(i => i.name === "LØNNSINNTEKT");
    if (wageIncome) {
      const calculatedTax = calculateTax(wageIncome.amount);
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
  const dividendTaxItem = AppState.incomes.find(i => i.name === "Utbytteskatt");
  if (dividendTaxItem && dividendTaxItem._autoTaxEnabled) {
    const dividends = AppState.incomes.find(i => i.name === "UTBYTTER");
    if (dividends) {
      const calculatedTax = Math.round(dividends.amount * 0.3784); // 37.84% utbytteskatt
      dividendTaxItem.amount = calculatedTax;
      
      // Oppdater UI hvis elementet eksisterer
      const taxRow = document.querySelector(`.asset-name[value="Utbytteskatt"]`)?.closest('.asset-row');
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

  // Oppdater Formuesskatt
  const wealthTaxItem = AppState.incomes.find(i => i.name === "Formuesskatt");
  if (wealthTaxItem && wealthTaxItem._autoTaxEnabled) {
    // Beregn sum av alle eiendeler
    const assets = AppState.assets || [];
    const sumAssets = assets.reduce((s, x) => s + (x.amount || 0), 0);
    
    // Formuesskatt = sum eiendeler × 0.5%
    const calculatedTax = Math.round(sumAssets * 0.005);
    wealthTaxItem.amount = calculatedTax;
    
    // Oppdater UI hvis elementet eksisterer
    const taxRow = document.querySelector(`.asset-name[value="Formuesskatt"]`)?.closest('.asset-row');
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

  // Oppdater Årlige kostnader
  const annualCostsItem = AppState.incomes.find(i => i.name === "ÅRLIGE KOSTNADER");
  if (annualCostsItem && annualCostsItem._autoTaxEnabled) {
    // Beregn sum av alle eiendeler
    const assets = AppState.assets || [];
    const sumAssets = assets.reduce((s, x) => s + (x.amount || 0), 0);
    
    // Eierkostnader = sum eiendeler × 4%
    const calculatedCosts = Math.round(sumAssets * 0.04);
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
      "Tapsbærende evne": "TBE",
      "T-Konto": "T-Konto"
    };
    
    // Render basert på lagret seksjon
    if (savedSection === "Forside") {
      if (typeof renderForsideModule === 'function') renderForsideModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Forside";
    } else if (savedSection === "Struktur") {
      if (typeof renderStrukturModule === 'function') renderStrukturModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Struktur";
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
      if (sectionTitle) sectionTitle.textContent = "Tapsbærende evne";
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
    } else if (savedSection === "Treemap") {
      if (typeof renderFutureModule === 'function') {
        renderFutureModule(moduleRoot);
        if (typeof updateCardsForTreemap === 'function') updateCardsForTreemap();
      }
      if (sectionTitle) sectionTitle.textContent = "Treemap";
    } else {
      // Default to Forside if no active section
      if (typeof renderForsideModule === 'function') renderForsideModule(moduleRoot);
      if (sectionTitle) sectionTitle.textContent = "Forside";
    }
    
    if (typeof updateTopSummaries === 'function') updateTopSummaries();
    if (typeof renderStepper === 'function') {
      const displayTitle = sectionDisplayMap[savedSection] || savedSection;
      const stepperKey = savedSection === "Tapsbærende evne" ? "TBE" : (displayTitle || "Forside");
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
        else if (section === "Treemap") {
          renderFutureModule(moduleRoot);
          updateCardsForTreemap();
        }
        else if (section === "Kontantstrøm") renderWaterfallModule(moduleRoot);
        else if (section === "Fremtidig utvikling") renderFutureModule(moduleRoot);
        else moduleRoot.innerHTML = "";
      }
      // Oppdater summer, men ikke hvis vi er i T-Konto (der skal de være tomme)
      if (section !== "T-Konto" && section !== "Treemap") {
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
    { key: "Treemap" },
    { key: "TBE" },
    { key: "Analyse" }
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
    "Tapsbærende evne": "TBE",  // I stepperen skal det stå "TBE"
    "T-Konto": "T-Konto"
  };

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const currentlyActive = document.querySelector(".nav-item.is-active");
      const wasTKonto = currentlyActive && (currentlyActive.getAttribute("data-section") === "T-Konto" || currentlyActive.getAttribute("data-section") === "Treemap");
      
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
        if (sectionTitle) sectionTitle.textContent = "Struktur";
      } else {
        if (sectionTitle) sectionTitle.textContent = title === "Tapsbærende evne" ? "Tapsbærende evne" : displayTitle;
      }

      renderStepper(stepperKey);

      // Gjenopprett kortene hvis vi forlater T-Konto eller Treemap
      if (wasTKonto && title !== "T-Konto" && title !== "Treemap") {
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
      } else if (title === "Treemap") {
        renderFutureModule(moduleRoot);
        updateCardsForTreemap();
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
      if (sectionTitle) sectionTitle.textContent = "Struktur";
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
      if (sectionTitle) sectionTitle.textContent = "Tapsbærende evne";
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
    } else if (activeSection === "Treemap") {
      renderFutureModule(moduleRoot);
      updateCardsForTreemap();
      if (sectionTitle) sectionTitle.textContent = "Treemap";
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
    income: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="9" cy="9" rx="4" ry="2" stroke="currentColor" stroke-width="2"/><path d="M5 9v3c0 1.1 1.8 2 4 2s4-.9 4-2V9" stroke="currentColor" stroke-width="2"/><path d="M5 12v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" stroke="currentColor" stroke-width="2"/><ellipse cx="15" cy="13" rx="4" ry="2" stroke="currentColor" stroke-width="2"/><path d="M11 13v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" stroke="currentColor" stroke-width="2"/><path d="M11 16v1.5c0 1.1 1.8 2 4 2s4-.9 4-2V16" stroke="currentColor" stroke-width="2"/><path d="M9 7.5c.5.3 1.1.5 2 .5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 11.5c.5.3 1.1.5 2 .5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cashflow: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 9H4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 9c2.2-3 5.3-5 9-5 4.5 0 7.5 3 7.5 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 15h3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 15c-2.2 3-5.3 5-9 5-4.5 0-7.5-3-7.5-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.5 12c.4-.5 1-.8 1.5-.8.8 0 1.5.6 1.5 1.4s-.7 1.4-1.5 1.4c-.5 0-1.1-.3-1.5-.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    tbe: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l8 3v6c0 4.4-3 8.4-8 9-5-0.6-8-4.6-8-9V6l8-3Z" stroke="currentColor" stroke-width="2"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    analysis: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 20V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 20v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 20v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  const cards = [
    { key: "assets", title: "Eiendeler", subtitle: "Totaloversikt over alle eiendeler" },
    { key: "debt", title: "Gjeld", subtitle: "Total gjeld, avdragsprofil og rentekostnader" },
    { key: "income", title: "Inntekter", subtitle: "Inntekter, utbytter, forbruk og skatt" },
    { key: "cashflow", title: "Kontantstrøm", subtitle: "Netto årlig kontantstrøm" },
    { key: "tbe", title: "Tapsbærende evne", subtitle: "Evnen til å bære tap" },
    { key: "analysis", title: "Analyse", subtitle: "Nøkkeltall og anbefalinger" }
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

    if (key === "tbe") {
      const subScore = document.createElement("div");
      subScore.className = "forside-card-text";
      subScore.id = "forside-card-score-tbe";
      subScore.hidden = true;
      card.appendChild(subScore);
    }

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
  updateForsideCards(getFinancialSnapshot(), true);
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

// --- Struktur modul ---
function renderStrukturModule(root) {
  root.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "panel panel-struktur";

  const grid = document.createElement("div");
  grid.className = "struktur-grid";

  // Initialiser struktur hvis den ikke finnes
  if (!AppState.structure) {
    AppState.structure = {
      privat: [{ active: true, name: "Privat" }],
      holding1: { active: false, name: "Holding AS" },
      holding2: { active: false, name: "Holding II AS" }
    };
  }
  
  // Migrer gammel struktur til ny array-struktur hvis nødvendig
  if (!Array.isArray(AppState.structure.privat)) {
    AppState.structure.privat = [AppState.structure.privat];
  }

  // Opprett container for privat-bokser
  const privatContainer = document.createElement("div");
  privatContainer.className = "struktur-privat-container";
  privatContainer.style.display = "flex";
  privatContainer.style.gap = "16px";
  privatContainer.style.alignItems = "center";
  privatContainer.style.justifyContent = "center";
  privatContainer.style.flexWrap = "wrap";

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
  privatArray.forEach((privatEntity, index) => {
    const card = document.createElement("div");
    card.className = "struktur-card struktur-card-privat";
    card.classList.add("is-active");
    card.dataset.privatIndex = index; // Lagre indeks for å kunne fjerne riktig boks

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
        const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"], .nav-item[data-section="Treemap"]');
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

    // Klikk-håndtering for å fjerne boksen (men ikke den første)
    card.addEventListener("click", (e) => {
      // Ikke fjern hvis brukeren klikker på input-feltet
      if (e.target.classList.contains("struktur-card-name-input")) {
        return;
      }
      
      // Ikke tillat å fjerne den første Privat-boksen
      if (index === 0) {
        return;
      }
      
      // Oppdater alle eiendeler som var tilknyttet denne Privat-boksen til å gå tilbake til første privat
      const entityValueToRemove = `privat-${index}`;
      const assets = AppState.assets || [];
      assets.forEach(asset => {
        if (asset.entity === entityValueToRemove) {
          asset.entity = "privat"; // Gå tilbake til første privat
        } else if (asset.entity && asset.entity.startsWith("privat-")) {
          // Hvis indeks var høyere enn den som fjernes, juster ned
          const assetIndex = parseInt(asset.entity.replace("privat-", ""), 10);
          if (assetIndex > index) {
            asset.entity = assetIndex === 1 ? "privat" : `privat-${assetIndex - 1}`;
          }
        }
      });
      
      // Fjern denne Privat-boksen
      privatArray.splice(index, 1);
      
      // Oppdater visningen
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
  privatContainer.appendChild(addButton);

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
          const tKontoNavItem = document.querySelector('.nav-item[data-section="T-Konto"], .nav-item[data-section="Treemap"]');
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

    // Klikk-håndtering
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("struktur-card-name-input")) {
        return;
      }
      
      // Toggle aktiv status
      AppState.structure[key].active = !AppState.structure[key].active;
      
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

  // Legg til privat-container øverst
  grid.appendChild(privatContainer);

  // Legg til holdings-container i grid
  grid.appendChild(holdingsContainer);

  // Legg til linjer mellom Privat og aktive Holding-bokser
  const activeHoldings = holdingsEntities.filter(e => 
    AppState.structure[e.key].active
  );
  
  if (activeHoldings.length > 0) {
    // Opprett SVG-container for linjer
    const svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgContainer.className = "struktur-connection-lines";
    svgContainer.style.position = "absolute";
    svgContainer.style.top = "0";
    svgContainer.style.left = "0";
    svgContainer.style.width = "100%";
    svgContainer.style.height = "100%";
    svgContainer.style.pointerEvents = "none";
    svgContainer.style.zIndex = "0";
    
    // Sett viewBox basert på grid-størrelse
    svgContainer.setAttribute("viewBox", "0 0 1200 600");
    svgContainer.setAttribute("preserveAspectRatio", "none");
    
    // Finn posisjoner etter at elementene er lagt til DOM
    setTimeout(() => {
      const privatCards = Array.from(privatContainer.querySelectorAll(".struktur-card-privat"));
      
      if (privatCards.length > 0 && activeHoldings.length > 0) {
        const panelRect = panel.getBoundingClientRect();
        
        // Beregn posisjoner for alle privat-bokser som en gruppe
        const privatRects = privatCards.map(card => card.getBoundingClientRect());
        const privatLeft = Math.min(...privatRects.map(r => r.left));
        const privatRight = Math.max(...privatRects.map(r => r.right));
        const privatCenterX = (privatLeft + privatRight) / 2 - panelRect.left;
        const privatBottomY = Math.max(...privatRects.map(r => r.bottom)) - panelRect.top;
        
        // Beregn koordinater i SVG viewBox basert på panel-størrelse
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;
        
        // Tegn horisontal linje som forbinder alle privat-bokser som en gruppe
        // Linjen plasseres rett under privat-boksene
        const yHorizontalLine = (privatBottomY / panelHeight) * 600;
        const xHorizontalLeft = ((privatLeft - panelRect.left) / panelWidth) * 1200;
        const xHorizontalRight = ((privatRight - panelRect.left) / panelWidth) * 1200;
        const xHorizontalCenter = (privatCenterX / panelWidth) * 1200;
        
        // Tegn horisontal linje som går gjennom alle privat-bokser
        const horizontalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        horizontalLine.setAttribute("x1", String(xHorizontalLeft));
        horizontalLine.setAttribute("y1", String(yHorizontalLine));
        horizontalLine.setAttribute("x2", String(xHorizontalRight));
        horizontalLine.setAttribute("y2", String(yHorizontalLine));
        horizontalLine.setAttribute("stroke", "#0C8F4A");
        horizontalLine.setAttribute("stroke-width", "2");
        horizontalLine.setAttribute("stroke-dasharray", "4,4");
        svgContainer.appendChild(horizontalLine);
        
        // Tegn linjer fra senteret av den horisontale linjen ned til hvert holdingselskap
        activeHoldings.forEach((holding) => {
          const holdingCard = holdingsContainer.querySelector(`.struktur-card-${holding.key}`);
          if (holdingCard) {
            const holdingRect = holdingCard.getBoundingClientRect();
            const holdingCenterX = holdingRect.left + holdingRect.width / 2 - panelRect.left;
            const holdingTopY = holdingRect.top - panelRect.top;
            
            const x2 = (holdingCenterX / panelWidth) * 1200;
            const y2 = (holdingTopY / panelHeight) * 600;
            
            // Tegn linje fra senteret av horisontal linje ned til holdingselskapet
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", String(xHorizontalCenter));
            line.setAttribute("y1", String(yHorizontalLine));
            line.setAttribute("x2", String(x2));
            line.setAttribute("y2", String(y2));
            line.setAttribute("stroke", "#0C8F4A");
            line.setAttribute("stroke-width", "2");
            line.setAttribute("stroke-dasharray", "4,4");
            svgContainer.appendChild(line);
          }
        });
      }
    }, 10);
    
    panel.style.position = "relative";
    panel.appendChild(svgContainer);
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

// --- Eiendeler modul ---
function renderAssetsModule(root) {
  root.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel panel-assets";

  const heading = document.createElement("h3");
  heading.textContent = "Eiendeler";
  panel.appendChild(heading);

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
      // Sett inn etter "FAST EIENDOM"
      const fastEiendomIndex = assets.findIndex(a => 
        /FAST\s*EIENDOM/i.test(a.name || "")
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

  // Knapp 1: Legg til Fast eiendom
  const btn1 = document.createElement("button");
  btn1.textContent = "Legg til Fast eiendom";
  setupButton(btn1, "EIENDOM", "eiendom", "EIENDOM");
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
    { key: "likvider", label: "BANK", min: 0, max: 12, step: 0.1 },
    { key: "fastEiendom", label: "FAST EIENDOM", min: 0, max: 12, step: 0.1 },
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
// Dette sikrer konsistent fargebruk i både T-konto og Treemap
function getAssetColorByName(name, assetType) {
  const U = String(name || "").toUpperCase();
  
  // Sjekk først assetType (for eiendeler opprettet via knapper)
  if (assetType === "eiendom") return "#7FAAF6"; // Medium blå for Fast eiendom
  if (assetType === "investeringer") return "#A9C6FF"; // Lys cyan-blå for Investeringer
  if (assetType === "bilbat") return "#00A9E0"; // Vibrant cyan-blå for Bil/Båt
  if (assetType === "andre") return "#294269"; // Mørk dødset blå for Andre eiendeler
  
  // Deretter sjekk navn (for bakoverkompatibilitet)
  if (/^BANK$/i.test(U)) return "#5A94D0"; // Standard blå for BANK
  if (/^FAST\s*EIENDOM$/i.test(U)) return "#7FAAF6"; // Medium blå for FAST EIENDOM
  if (/^EIENDOM$/i.test(U) && !/FAST/i.test(U)) return "#7FAAF6"; // Medium blå for EIENDOM
  if (/^INVESTERINGER$/i.test(U)) return "#A9C6FF"; // Lys cyan-blå for INVESTERINGER
  if (/^BIL\/BÅT$/i.test(U) || /^BIL\s*BÅT$/i.test(U)) return "#00A9E0"; // Vibrant cyan-blå for BIL/BÅT
  if (/^ANDRE\s*EIENDELER$/i.test(U)) return "#294269"; // Mørk dødset blå for ANDRE EIENDELER
  
  // Fallback
  return "#7FAAF6";
}

function computeAssetProjection(yearVal) {
  const assets = AppState.assets || [];
  const exp = AppState.expectations || { likvider: 0, fastEiendom: 0, investeringer: 0, andreEiendeler: 0, bilbat: 0, kpi: 0 };
  const yearsFromStart = Math.max(0, Number(yearVal) - 2026);
  const rLikv = (exp.likvider || 0) / 100;
  const rEiend = (exp.fastEiendom || 0) / 100;
  const rInv = (exp.investeringer || 0) / 100;
  const rBilBat = (exp.bilbat || 0) / 100;
  const rOther = (exp.andreEiendeler || 0) / 100;
  const routing = ensureCashflowRoutingState();
  const cashflow = computeAnnualCashflowBreakdown();
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
    const isMaalOgBehov = a.noDelete || /investeringer\s*mål\s*og\s*behov/i.test(name);
    if (isMaalOgBehov) {
      const value = getMaalOgBehovHovedstolForYear(yearVal);
      return { key: name, value, color: getAssetColorByName(name, a.assetType) };
    }
    let rate = rOther;
    const isLiquidity = /LIKVID|BANK|KONTANT|CASH/.test(U);
    const isBank = /^BANK$/i.test(name);
    const isInvestment = /INVEST/.test(U);
    const isBilBat = /BIL|BÅT/.test(U);
    // Fast eiendom og eiendom skal bruke eksakt samme avkastning
    // Sjekk først assetType (for eiendeler opprettet via knapper), deretter navn (for bakoverkompatibilitet)
    const isFastEiendom = /^FAST\s*EIENDOM$/i.test(name);
    const isEiendom = /^EIENDOM$/i.test(name);
    const isEiendomByType = a.assetType === "eiendom";
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
    return { key: name, value, color: getAssetColorByName(name, a.assetType) };
  });
}

function remainingDebtTotalForYear(yearVal) {
  const debts = AppState.debts || [];
  const elapsed = Math.max(0, Number(yearVal) - 2026);
  return debts.reduce((total, debt) => total + remainingBalanceAfterYears(debt, elapsed), 0);
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
      privat: { active: true, name: "Privat" },
      holding1: { active: false, name: "Holding AS" },
      holding2: { active: false, name: "Holding II AS" }
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
      
      // Sett navn basert på struktur
      if (isPrivatEntity(entity)) {
        const privatArray = Array.isArray(AppState.structure.privat) ? AppState.structure.privat : [AppState.structure.privat];
        const privatIndex = getPrivatIndexFromEntity(entity);
        const privatEntity = privatArray[privatIndex];
        groupedByEntity[entity].name = (privatEntity && privatEntity.name) || (privatIndex === 0 ? "Privat" : `Privat ${getRomanNumeral(privatIndex + 1)}`);
      } else if (entity === "holding1") {
        groupedByEntity[entity].name = AppState.structure.holding1.name || "Holding AS";
      } else if (entity === "holding2") {
        groupedByEntity[entity].name = AppState.structure.holding2.name || "Holding AS 2";
      }
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
    assetCategories = assets.map((a, idx) => {
      const projected = projectedAssets[idx];
      const value = projected ? projected.value : (a.amount || 0);
      const name = String(a.name || `Eiendel ${idx + 1}`);
      return {
        key: name,
        value,
        color: getAssetColorByName(name, a.assetType) // Bruk standardfarger basert på navn/type
      };
    });
    
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

  // Lekker skygge for søyler
  const barShadow = document.createElementNS(svgNS, "filter");
  barShadow.setAttribute("id", "barShadow");
  barShadow.setAttribute("x", "-30%"); barShadow.setAttribute("y", "-30%");
  barShadow.setAttribute("width", "160%"); barShadow.setAttribute("height", "160%");
  const feDropBar = document.createElementNS(svgNS, "feDropShadow");
  feDropBar.setAttribute("dx", "0"); feDropBar.setAttribute("dy", "4");
  feDropBar.setAttribute("stdDeviation", "8");
  feDropBar.setAttribute("flood-color", "#000000");
  feDropBar.setAttribute("flood-opacity", "0.25");
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
  const yearsFromStart = Math.max(0, Number(yearVal) - 2026);
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
    if (/SKATT|KOSTNAD/.test(name)) {
      expenseItems.push({
        id: item.id || String(Math.random()),
        label: item.name,
        value: adjustedAmount,
        type: 'expense'
      });
      totalCosts += adjustedAmount;
    } else {
      incomeItems.push({
        id: item.id || String(Math.random()),
        label: item.name,
        value: adjustedAmount,
        type: 'income'
      });
      totalIncome += adjustedAmount;
    }
  });
  
  // Beregn årlig gjeldsbetaling for det valgte året
  const debts = AppState.debts || [];
  let annualDebtPayment = 0;
  
  debts.forEach((debt) => {
    const elapsed = Math.max(0, Number(yearVal) - 2026);
    const debtProjection = projectDebtYear(debt, elapsed);
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
        color: projection.color || getAssetColorByName(projection.key, asset?.assetType) // Bruk standardfarger basert på navn/type
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
        const elapsed = Math.max(0, Number(yearVal) - 2026);
        const remForDebt = remainingBalanceAfterYears(debt, elapsed);
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

// --- Waterfall (Grafikk III) ---
function renderWaterfallModule(root) {
  root.innerHTML = "";

  // Sample period selector (Month/Quarter/Year)
  const controls = document.createElement("div");
  controls.style.display = "none"; // make invisible as requested
  const select = document.createElement("select");
  ["Måned", "Kvartal", "År"].forEach((t) => { const o = document.createElement("option"); o.value = t; o.textContent = t; select.appendChild(o); });
  controls.appendChild(select);
  root.appendChild(controls);

  const svgNS = "http://www.w3.org/2000/svg";
  const vbW = 1200, vbH = 560;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
  svg.style.width = "100%"; svg.style.height = "auto"; svg.style.display = "block";

  const style = document.createElementNS(svgNS, "style");
  style.textContent = `
    .wf-title { font: 900 24px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
    .wf-label { font: 600 13px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #677788; }
    .wf-value { font: 700 13px Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; fill: #1C2A3A; }
  `;
  svg.appendChild(style);

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(vbW)); bg.setAttribute("height", String(vbH));
  bg.setAttribute("fill", "#F2F4F7");
  svg.appendChild(bg);

  const panel = document.createElementNS(svgNS, "rect");
  panel.setAttribute("x", "12"); panel.setAttribute("y", "12");
  panel.setAttribute("width", String(vbW - 24)); panel.setAttribute("height", String(vbH - 24));
  panel.setAttribute("rx", "12"); panel.setAttribute("fill", "#FFFFFF"); panel.setAttribute("stroke", "#E8EBF3");
  svg.appendChild(panel);

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

  const strip = document.createElement("div");
  strip.className = "waterfall-base-strip";

  const sliderStep = 10_000;

  const actions = document.createElement("div");
  actions.className = "waterfall-strip-actions";
  const stripLabel = document.createElement("div");
  stripLabel.className = "waterfall-strip-label";
  stripLabel.textContent = "Plassering av Årlig kontantstrøm:";

  let customSlider = null;
  let customSliderValue = null;
  const routingState = ensureCashflowRoutingState();
  const buttonRefs = new Map();
  let currentNet = 0;

  function updateButtonStates() {
    const state = ensureCashflowRoutingState();
    buttonRefs.forEach((el, key) => {
      if (!el) return;
      if (key === state.mode) el.classList.add("is-active");
      else el.classList.remove("is-active");
    });
  }

  function selectMode(mode, options = {}) {
    const state = ensureCashflowRoutingState();
    const netPositive = Math.max(0, Math.round(currentNet || 0));
    let changed = false;

  if (mode === "custom") {
      const raw = options && Object.prototype.hasOwnProperty.call(options, "customAmount")
        ? Number(options.customAmount)
        : state.customAmount;
    const snapped = sliderStep > 0
      ? Math.round((raw || 0) / sliderStep) * sliderStep
      : Math.round(raw || 0);
    const value = Math.max(0, Math.min(netPositive, snapped));
      if (state.customAmount !== value) {
        state.customAmount = value;
        changed = true;
      }
    } else {
      if (state.customAmount !== netPositive) {
        state.customAmount = netPositive;
        changed = true;
      }
    }

    if (state.mode !== mode) {
      state.mode = mode;
      changed = true;
    }

    updateButtonStates();
    syncSliderToNet(currentNet);
    writeSparingForMaalOgBehov();

    if (!options.silent && changed) {
      notifyCashflowRoutingChange("Kontantstrøm");
    }
  }

  const actionItems = [
    {
      key: "forbruk",
      label: "Forbruk",
      className: "is-forbruk",
      icon: `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7h16a2 2 0 012 2v7a3 3 0 01-3 3H6a3 3 0 01-3-3V8a1 1 0 011-1h14" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M16 11h5v4h-5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="13.5" cy="13" r="1.2" fill="currentColor" />
        </svg>
      `
    },
    {
      key: "bank",
      label: "Bank",
      className: "is-bank",
      icon: `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 10h16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5 20V10m5 10V10m4 10V10m5 10V10" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M3 10l9-6 9 6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 20h6" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      key: "investeringer",
      label: "Årlig sparing",
      className: "is-investeringer",
      icon: `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 17l4.5-5 3.5 3 5-7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M15 8h4v4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    },
    {
      key: "custom",
      label: "Alt:",
      className: "is-custom",
      icon: `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15.5l-3.09 1.63.59-3.43-2.5-2.44 3.45-.5L12 7.5l1.55 3.26 3.45.5-2.5 2.44.59 3.43L12 15.5z" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M19 19c0-1.66-1.79-3-4-3H9c-2.21 0-4 1.34-4 3" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      `
    }
  ];

  actionItems.forEach((item) => {
    const isCustom = item.key === "custom";
    const wrapper = document.createElement(isCustom ? "div" : "button");
    wrapper.className = `waterfall-strip-button ${item.className}${isCustom ? " has-slider" : ""}`;
    wrapper.setAttribute("data-action", item.key);
    wrapper.setAttribute("aria-label", item.label);

    if (!isCustom) {
      wrapper.type = "button";
    }

    const iconHolder = document.createElement("span");
    iconHolder.className = "wsb-icon";
    iconHolder.innerHTML = item.icon.trim();
    iconHolder.querySelectorAll("svg").forEach((svgEl) => {
      svgEl.setAttribute("stroke", "currentColor");
    });

    const label = document.createElement("span");
    label.className = "wsb-label";
    label.textContent = item.label;

    wrapper.appendChild(iconHolder);
    wrapper.appendChild(label);

    if (isCustom) {
      const sliderWrapper = document.createElement("div");
      sliderWrapper.className = "wsb-slider-wrap";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.className = "wsb-slider";
      slider.min = "0";
      slider.max = "0";
      slider.step = String(sliderStep);
      slider.value = "0";
      slider.setAttribute("aria-label", "Fordel årlig kontantstrøm");

      const valueLabel = document.createElement("span");
      valueLabel.className = "wsb-slider-value";
      valueLabel.textContent = "0 kr";

      slider.addEventListener("input", () => {
        const raw = Number(slider.value) || 0;
        const maxVal = Number(slider.max) || 0;
        let snapped = sliderStep > 0 ? Math.round(raw / sliderStep) * sliderStep : Math.round(raw);
        if (snapped > maxVal) snapped = maxVal;
        if (snapped < 0) snapped = 0;
        if (snapped !== raw) slider.value = String(snapped);
        valueLabel.textContent = formatNOK(snapped);
        selectMode("custom", { customAmount: snapped });
      });

      sliderWrapper.appendChild(slider);
      sliderWrapper.appendChild(valueLabel);
      wrapper.appendChild(sliderWrapper);

      customSlider = slider;
      customSliderValue = valueLabel;
      wrapper.setAttribute("role", "group");
      wrapper.tabIndex = 0;
      wrapper.addEventListener("click", () => {
        selectMode("custom", { customAmount: routingState.customAmount });
      });
      wrapper.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          selectMode("custom", { customAmount: routingState.customAmount });
        }
      });
    } else {
      wrapper.addEventListener("click", () => selectMode(item.key));
      wrapper.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          selectMode(item.key);
        }
      });
    }

    buttonRefs.set(item.key, wrapper);
    actions.appendChild(wrapper);
  });

  strip.appendChild(stripLabel);
  strip.appendChild(actions);

  const wrapper = document.createElement("div");
  wrapper.className = "waterfall-wrapper";
  wrapper.appendChild(container);
  wrapper.appendChild(strip);

  const panelWidthRatio = (vbW - 24) / vbW;
  const syncStripWidth = () => {
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width) return;
    strip.style.width = `${Math.round(bounds.width * panelWidthRatio)}px`;
  };

  function syncSliderToNet(netValue) {
    if (!customSlider || !customSliderValue) return;
    const state = ensureCashflowRoutingState();
    const max = Math.max(0, Math.round(netValue || 0));
    customSlider.max = String(max);
    if (max === 0) {
      customSlider.value = "0";
      customSlider.disabled = true;
      customSliderValue.textContent = formatNOK(0);
      if (state.mode === "custom") state.customAmount = 0;
      return;
    }
    customSlider.disabled = false;
    let sliderValue;
    if (state.mode === "custom") {
      let desired = Math.max(0, Math.min(max, Math.round(state.customAmount || 0)));
      if (sliderStep > 0) desired = Math.max(0, Math.min(max, Math.round(desired / sliderStep) * sliderStep));
      sliderValue = desired;
      state.customAmount = sliderValue;
    } else {
      let desired = max;
      if (sliderStep > 0 && desired > 0) {
        desired = Math.min(max, Math.round(desired / sliderStep) * sliderStep);
        if (desired === 0 && max > 0) desired = Math.min(max, sliderStep);
      }
      sliderValue = desired;
      state.customAmount = sliderValue;
    }
    customSlider.value = String(sliderValue);
    customSliderValue.textContent = formatNOK(sliderValue);
    writeSparingForMaalOgBehov();
  }

  function draw() {
    // Clear dynamic content except styles/panel (first three nodes: style, bg, panel)
    while (svg.childNodes.length > 3) svg.removeChild(svg.lastChild);

    const state = ensureCashflowRoutingState();
    const previousAllocated = Math.round(state.customAmount || 0);
    const { totalIncome, costs, net, wage, dividends, otherIncome } = computeAnnualCashflowBreakdown();
    currentNet = net;

    const padX = 80; const padTop = 70; const padBottom = net < 0 ? 96 : 64; // ekstra plass under baseline ved negativ netto
    const chartW = vbW - padX * 2; const chartH = vbH - padTop - padBottom;

    // Bygg trinn, utelat nullverdier
    const steps = [];
    if (wage > 0) steps.push({ type: "up", key: "Lønnsinntekt", value: wage });
    if (dividends > 0) steps.push({ type: "up", key: "Utbytter", value: dividends });
    if (otherIncome > 0) steps.push({ type: "up", key: "Skattefrie inntekter", value: otherIncome });
    costs.forEach(c => { if (c.value > 0) steps.push({ type: "down", key: c.key, value: -c.value }); });
    steps.push({ type: "end", key: "Årlig kontantstrøm", value: net });

    // Skaler etter hele spennvidden i den kumulative serien (topp til bunn)
    const tempSteps = [];
    if (wage > 0) tempSteps.push({ type: "up", value: wage, key: "Lønnsinntekt" });
    if (dividends > 0) tempSteps.push({ type: "up", value: dividends, key: "Utbytter" });
    if (otherIncome > 0) tempSteps.push({ type: "up", value: otherIncome, key: "Skattefrie inntekter" });
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

    // Farger
    const cashflowPositive = (getComputedStyle(document.documentElement).getPropertyValue('--BLUE_200') || '#E0EDFF').trim();
    const blue = "#0A5EDC";
    // Rødfarger for kostnadssøyler i lys tema
    const redPalette = ["#F5B5B1", "#F1998F", "#EC7E73", "#E36258", "#D84F47"]; // lys -> dyp
    const redEnd = "#D84F47"; // sluttstolpe ved negativ kontantstrøm
    // Grønnpalett for inntekter
    const greenPalette = ["#B5ECD0", "#7AD9A9", "#34C185", "#0C8F4A"]; // varierte grønntoner
    // Egen farge for Årlig kontantstrøm (uavhengig av tegn)
    const netBarColor = (getComputedStyle(document.documentElement).getPropertyValue('--WF_NET_COLOR') || '#DBEAFE').trim();

    const colW = Math.max(60, Math.floor(chartW / steps.length) - 10);
    let cursorX = padX;
    let running = 0;
    let downIndex = 0; let upIndex = 0;
    steps.forEach((s, idx) => {
      if (!s || !isFinite(s.value)) return; // hopp over nulltrinn, men behold 0 for Avdrag
      let h, y, fill;
      let labelText;
      if (s.type === "up") {
        const from = running;
        const to = running + s.value;
        const geom = barGeom(from, to);
        h = geom.h; y = geom.yTop;
        running = to;
        fill = greenPalette[upIndex % greenPalette.length];
        upIndex++;
        labelText = formatNOK(Math.round(Math.abs(s.value)));
      } else if (s.type === "down") {
        const from = running;
        const to = running + s.value; // s.value is negative
        const geom = barGeom(from, to);
        h = geom.h; y = geom.yTop;
        running = to;
        fill = redPalette[downIndex % redPalette.length];
        downIndex++;
        labelText = formatNOK(Math.round(s.value)); // vis alltid minus for kostnader
      } else { // end (netto)
        const from = 0;
        const to = s.value;
        const geom = barGeom(from, to);
        h = geom.h; y = geom.yTop;
        // Fast definert farge for netto-kolonnen
        fill = netBarColor;
        labelText = formatNOK(Math.round(s.value)); // signert
      }

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", String(cursorX));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(colW));
      rect.setAttribute("height", String(Math.max(2, h)));
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", fill);
      rect.setAttribute("fill-opacity", "0.9");
      rect.setAttribute("stroke", "#E8EBF3");
      rect.setAttribute("stroke-opacity", "1");
      svg.appendChild(rect);

      const lab = document.createElementNS(svgNS, "text");
      lab.setAttribute("class", "wf-label");
      lab.setAttribute("x", String(cursorX + colW / 2));
      const labelY = Math.min(vbH - 8, y + Math.max(2, h) + 14); // plasser under nederste kant
      lab.setAttribute("y", String(labelY));
      lab.setAttribute("text-anchor", "middle");
      lab.textContent = s.key;
      svg.appendChild(lab);

      const val = document.createElementNS(svgNS, "text");
      val.setAttribute("class", "wf-value");
      val.setAttribute("x", String(cursorX + colW / 2));
      val.setAttribute("y", String(y - 8));
      val.setAttribute("text-anchor", "middle");
      val.textContent = labelText;
      svg.appendChild(val);

      cursorX += colW + 10;
    });

    syncStripWidth();
    syncSliderToNet(net);
    updateButtonStates();
    writeSparingForMaalOgBehov();
    const updatedAllocated = Math.round(state.customAmount || 0);
    if (state.mode !== "forbruk" && updatedAllocated !== previousAllocated) {
      notifyCashflowRoutingChange("Kontantstrøm");
    }
  }

  select.addEventListener("change", draw);
  draw();
  root.appendChild(wrapper);
  syncStripWidth();

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(syncStripWidth);
    resizeObserver.observe(svg);
    strip._resizeObserver = resizeObserver;
  } else {
    window.addEventListener("resize", syncStripWidth, { passive: true });
  }
}

function notifyCashflowRoutingChange(sourceSection) {
  const moduleRoot = document.getElementById("module-root");
  if (!moduleRoot) return;
  const currentNav = document.querySelector(".nav-item.is-active");
  if (!currentNav) return;
  const section = currentNav.getAttribute("data-section") || currentNav.textContent || "";
  if (section === sourceSection) return;
  if (section === "T-Konto" || section === "Treemap") {
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

  let incomeTotal = 0;
  let wage = 0;
  let dividends = 0;
  let otherIncome = 0;
  let annualTax = 0;
  let annualCosts = 0;
  const individualTaxes = [];
  const individualCosts = [];

  incomeItems.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const name = upper(item.name);
    if (/SKATT/.test(name)) {
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
        if (/L[ØO]NN/.test(name)) wage += amount;
        else if (/UTBYT/.test(name)) dividends += amount;
        else otherIncome += amount;
      }
    }
  });

  return {
    wage,
    dividends,
    otherIncome,
    incomeTotal,
    annualTax,
    annualCosts,
    individualTaxes,
    individualCosts,
    costTotal: annualTax + annualCosts
  };
}

function computeAnnualCashflowBreakdown() {
  const base = aggregateCashflowBase();
  const debts = AppState.debts || [];
  const annualPayment = calculateTotalAnnualDebtPayment(debts);
  const interestCost = calculateTotalAnnualInterest(debts);
  const principalCost = Math.max(0, annualPayment - interestCost);
  // Hvis det finnes individuelle kostnader, vis dem individuelt, ellers vis samlet "Årlige kostnader"
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
    dividends: base.dividends,
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

function projectDebtYear(debt, yearIndex) {
  const amount = Number(debt && debt.amount) || 0;
  if (amount <= 0) {
    return { interest: 0, principal: 0, payment: 0, remaining: 0 };
  }
  const params = debt.debtParams || AppState.debtParams || {};
  const type = params.type || "Annuitetslån";
  const rate = Number(params.rate) || 0;
  const years = Math.max(1, Number(params.years) || 1);
  const idx = Math.max(0, Math.floor(yearIndex));

  if (/Avdragsfrihet/.test(type)) {
    const years = Math.max(1, Number(params.years) || 1);
    const match = /(\d+)\s*år/i.exec(type);
    const graceYears = match ? Number(match[1]) : years;
    const interestOnlyYears = type === "Avdragsfrihet" ? years : Math.min(graceYears, years);
    const amortYears = type === "Avdragsfrihet" ? 0 : years;
    const totalDuration = interestOnlyYears + amortYears;

    if (idx >= totalDuration) {
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
      if (n >= amortYears) return { interest: 0, principal: 0, payment: 0, remaining: 0 };
      const remainingBefore = Math.max(0, amount - principal * n);
      const remaining = Math.max(0, remainingBefore - principal);
      return { interest: 0, principal, payment: principal, remaining };
    }

    if (n >= amortYears) return { interest: 0, principal: 0, payment: 0, remaining: 0 };
    const annuity = amount * (rate / (1 - Math.pow(1 + rate, -amortYears)));
    const remainingBefore = amount * Math.pow(1 + rate, n) - annuity * ((Math.pow(1 + rate, n) - 1) / rate);
    const interest = remainingBefore * rate;
    const rawPrincipal = annuity - interest;
    const principal = Math.min(Math.max(0, rawPrincipal), Math.max(0, remainingBefore));
    const remaining = Math.max(0, remainingBefore - principal);
    return { interest, principal, payment: annuity, remaining };
  }

  if (idx >= years) {
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
  if (rate === 0) {
    const principal = amount / years;
    const remainingBefore = Math.max(0, amount - principal * idx);
    const remaining = Math.max(0, remainingBefore - principal);
    return { interest: 0, principal, payment: principal, remaining };
  }

  const annuity = amount * (rate / (1 - Math.pow(1 + rate, -years)));
  const remainingBefore = amount * Math.pow(1 + rate, idx) - annuity * ((Math.pow(1 + rate, idx) - 1) / rate);
  const interest = remainingBefore * rate;
  const rawPrincipal = annuity - interest;
  const principal = Math.min(Math.max(0, rawPrincipal), Math.max(0, remainingBefore));
  const remaining = Math.max(0, remainingBefore - principal);
  return { interest, principal, payment: annuity, remaining };
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
    const debtAgg = debts.reduce(
      (acc, debt) => {
        const detail = projectDebtYear(debt, i);
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

function buildCashflowForecastSVG(startYear, yearsCount) {
  const { series, inflation } = computeCashflowForecastSeries(startYear, yearsCount);
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
  BANK: "#A2C5EE",
  "FAST EIENDOM": "#7FAFE6",
  "INVESTERINGER MÅL OG BEHOV": "#DAE8F9",
  EGENKAPITAL: "#A7EDBD",
  GJELD: "#F2BFB8"
};

function getTKontoColorForAsset(name) {
  var k = String(name || "").toUpperCase();
  if (/^BANK$/i.test(k)) return TKONTO_CHART_COLORS.BANK;
  if (/^FAST\s*EIENDOM$/i.test(k)) return TKONTO_CHART_COLORS["FAST EIENDOM"];
  if (/INVESTERINGER|MÅL\s*OG\s*BEHOV/i.test(k)) return TKONTO_CHART_COLORS["INVESTERINGER MÅL OG BEHOV"];
  return "#DAE8F9";
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
      if (!grouped[entity].name) {
        if (isPrivatEntity(entity)) {
          var privatArr = Array.isArray(AppState.structure.privat) ? AppState.structure.privat : [AppState.structure.privat];
          var idx = getPrivatIndexFromEntity(entity);
          var pe = privatArr[idx];
          grouped[entity].name = (pe && pe.name) || (idx === 0 ? "Privat" : "Privat " + (idx + 1));
        } else if (entity === "holding1") {
          grouped[entity].name = (AppState.structure.holding1 && AppState.structure.holding1.name) || "Holding AS";
        } else if (entity === "holding2") {
          grouped[entity].name = (AppState.structure.holding2 && AppState.structure.holding2.name) || "Holding II AS";
        } else {
          grouped[entity].name = entity;
        }
      }
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

  return projected.map(function (item) {
    return {
      key: item.key,
      value: item.value || 0,
      color: getTKontoColorForAsset(item.key)
    };
  });
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
    segs.push({ key: "GJELD", value: debtVal, color: TKONTO_CHART_COLORS.GJELD });
  } else {
    var debtScale = ["#F2BFB8", "#F1999C", "#EF4444", "#DC2626", "#B91C1C"];
    var elapsed = Math.max(0, Number(yearVal) - 2026);
    var totalRem = remDebt || 1;
    debts.forEach(function (debt, idx) {
      var remForDebt = remainingBalanceAfterYears(debt, elapsed);
      var proportion = totalRem > 0 ? remForDebt / totalRem : 0;
      var amount = Math.round(debtVal * proportion);
      segs.push({
        key: String(debt.name || "Gjeld " + (idx + 1)),
        value: amount,
        color: debtScale[idx % debtScale.length]
      });
    });
  }
  return { segments: segs, total: totalAssets || 1 };
}

function buildTKontoBarChart(container, yearVal) {
  container.innerHTML = "";
  container.style.background = "#F8F8F8";
  var assetSegs = getTKontoAssetSegments(yearVal);
  var fin = getTKontoFinancingSegments(yearVal);
  var financingSegs = fin.segments;
  var total = fin.total || 1;
  function pct(v) { return total ? Math.round((v / total) * 100) : 0; }
  function labelRight(v) { return formatNOK(v) + " - " + pct(v) + "%"; }

  var wrap = document.createElement("div");
  wrap.className = "tkonto-chart-wrap";

  function formatTKontoLabel(key) {
    var k = String(key || "").trim();
    var u = k.toUpperCase();
    if (/INVESTERINGER\s*MÅL\s*OG\s*BEHOV/i.test(u)) return "Investeringer<br>mål og behov";
    if (/^FAST\s*EIENDOM$/i.test(u)) return "Fast eiendom";
    if (/^BANK$/i.test(u)) return "Bank";
    if (/^EGENKAPITAL$/i.test(u)) return "Egenkapital";
    if (/^GJELD$/i.test(u)) return "Gjeld";
    if (/^PRIVAT$/i.test(k)) return "Privat";
    if (/AS$/i.test(k) || /HOLDING/i.test(u)) return k; // Behold AS-navn som i Struktur
    if (!k) return "";
    return k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
  }
  function addCard(segs, cardEl) {
    segs.forEach(function (seg) {
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
  leftCard.style.background = "#FFFFFF";
  leftCard.style.backgroundColor = "#FFFFFF";
  addCard(assetSegs, leftCard);

  var eqBtn = document.createElement("div");
  eqBtn.className = "tkonto-equals";
  eqBtn.setAttribute("aria-hidden", "true");
  eqBtn.textContent = "=";
  eqBtn.style.background = "#ECECEC";
  eqBtn.style.backgroundColor = "#ECECEC";
  eqBtn.style.color = "#666666";

  var rightCard = document.createElement("div");
  rightCard.className = "tkonto-chart-card";
  rightCard.style.position = "relative";
  rightCard.style.background = "#FFFFFF";
  rightCard.style.backgroundColor = "#FFFFFF";
  addCard(financingSegs, rightCard);

  var expBtn = document.createElement("button");
  expBtn.type = "button";
  expBtn.className = "tkonto-exp-btn";
  expBtn.textContent = "Exp.";
  expBtn.setAttribute("aria-label", "Eksporter grafikken");
  expBtn.style.cssText = "position:absolute;top:6px;right:6px;z-index:5;padding:4px 8px;font-size:11px;font-weight:600;color:#4A6D8C;background:#fff;border:1px solid #DDDDDD;border-radius:6px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.06);";
  expBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent("tkonto-export-click"));
  });
  rightCard.appendChild(expBtn);

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
    if (/^FAST\s*EIENDOM$/i.test(u)) return ["Fast eiendom"];
    if (/^BANK$/i.test(u)) return ["Bank"];
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

  /* Ingen ytre ramme – kun grafikken (kort + likhetstegn), transparent bakgrunn */
  ctx.fillStyle = "#FFFFFF";
  roundRect(leftX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(rightX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.stroke();

  var eqCenterX = leftX + cardW + 22;
  var eqCenterY = cardY + cardH / 2;
  ctx.fillStyle = "#ECECEC";
  ctx.beginPath();
  ctx.arc(eqCenterX, eqCenterY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#DDDDDD";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#666666";
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
    ctx.fillStyle = "#1C2A3A";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var segH = totalVal > 0 ? Math.max(2, (seg.value / totalVal) * contentH) : contentH / segs.length;
      var segTop = y;
      y += segH;

      ctx.fillStyle = seg.color || "#E5E7EB";
      var r = 8;
      ctx.beginPath();
      if (segs.length === 1) {
        roundRect(cardX + innerPad + barLeft, segTop, barWidth, segH, r);
      } else if (i === 0) {
        ctx.moveTo(cardX + innerPad + barLeft + r, segTop);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth - r, segTop);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft + barWidth, segTop, cardX + innerPad + barLeft + barWidth, segTop + r);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth, segTop + segH);
        ctx.lineTo(cardX + innerPad + barLeft, segTop + segH);
        ctx.lineTo(cardX + innerPad + barLeft, segTop + r);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft, segTop, cardX + innerPad + barLeft + r, segTop);
      } else if (i === segs.length - 1) {
        ctx.moveTo(cardX + innerPad + barLeft + r, segTop + segH);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth - r, segTop + segH);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft + barWidth, segTop + segH, cardX + innerPad + barLeft + barWidth, segTop + segH - r);
        ctx.lineTo(cardX + innerPad + barLeft + barWidth, segTop);
        ctx.lineTo(cardX + innerPad + barLeft, segTop);
        ctx.lineTo(cardX + innerPad + barLeft, segTop + segH - r);
        ctx.quadraticCurveTo(cardX + innerPad + barLeft, segTop + segH, cardX + innerPad + barLeft + r, segTop + segH);
      } else {
        ctx.rect(cardX + innerPad + barLeft, segTop, barWidth, segH);
      }
      ctx.closePath();
      ctx.fill();

      var cy = segTop + segH / 2;
      if (segH >= 18) {
        ctx.fillStyle = "#1C2A3A";
        ctx.textAlign = "left";
        var lines = labelLines(seg.key);
        var lineHeight = 16;
        var totalLabelH = lines.length * lineHeight;
        var startY = cy - (totalLabelH - lineHeight) / 2 - lineHeight / 2;
        for (var L = 0; L < lines.length; L++) {
          ctx.fillText(lines[L], cardX + innerPad + 4, startY + L * lineHeight + lineHeight / 2);
        }
        ctx.textAlign = "right";
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

    buildTKontoBarChart(placeholder, 2026);

    const yearStrip = document.createElement("div");
    yearStrip.className = "t-konto-year-strip";
    yearStrip.setAttribute("aria-label", "Velg år");
    const yearInner = document.createElement("div");
    yearInner.className = "t-konto-year-buttons";
    for (let year = 2026; year <= 2040; year++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "t-konto-year-btn";
      btn.textContent = String(year);
      btn.setAttribute("data-year", String(year));
      btn.setAttribute("aria-label", "Velg år " + year);
      if (year === 2026) btn.classList.add("is-active");
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

  // Sjekk om vi er i Treemap-seksjonen
  const isTreemap = currentSection === "Treemap";

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

  let selectedYear = 2026; // Definer selectedYear før draw-funksjonen
  
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
        
        // Sett navn basert på struktur
        if (isPrivatEntity(entity)) {
          const privatArray = Array.isArray(AppState.structure.privat) ? AppState.structure.privat : [AppState.structure.privat];
          const privatIndex = getPrivatIndexFromEntity(entity);
          const privatEntity = privatArray[privatIndex];
          groupedByEntity[entity].name = (privatEntity && privatEntity.name) || (privatIndex === 0 ? "Privat" : `Privat ${getRomanNumeral(privatIndex + 1)}`);
        } else if (entity === "holding1") {
          groupedByEntity[entity].name = AppState.structure.holding1.name || "Holding AS";
        } else if (entity === "holding2") {
          groupedByEntity[entity].name = AppState.structure.holding2.name || "Holding II AS";
        }
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
      // Hvis kun én gjeldspost, bruk samme struktur som før
      financingParts.push({ key: "Gjeld", value: debtVal, color: "#FCA5A5" });
    } else if (debts.length > 1) {
      // Hvis flere gjeldsposter, beregn andel for hver gjeldspost basert på gjeldende år
      const debtScale = ["#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C"]; // Mildere rødskala
      const totalRemDebt = remDebt;
      debts.forEach((debt, idx) => {
        if (totalRemDebt > 0) {
          const elapsed = Math.max(0, Number(yearVal) - 2026);
          const remForDebt = remainingBalanceAfterYears(debt, elapsed);
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
    
    const svgElement = buildFinanceSVG(assetCategories, financingParts, totalAssets, yearVal, null, isTreemap);
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

  // Initial draw at 2026
  draw(selectedYear);

  // År-knapper under grafikken (erstatter slider)
  const wrap = document.createElement("div");
  wrap.className = "year-buttons-card";

  // Toggle-knapp for å skjule/vise år-knappene
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
  
  // Opprett 15 knapper for årene 2026-2040
  for (let year = 2026; year <= 2040; year++) {
    const yearBtn = document.createElement("button");
    yearBtn.className = "year-button";
    yearBtn.textContent = String(year);
    yearBtn.setAttribute("data-year", String(year));
    yearBtn.setAttribute("aria-label", `Velg år ${year}`);
    
    // Marker 2026 som aktiv ved start
    if (year === 2026) {
      yearBtn.classList.add("is-active");
    }
    
    yearBtn.addEventListener("click", () => {
      // Fjern aktiv klasse fra alle knapper
      buttonContainer.querySelectorAll(".year-button").forEach(btn => {
        btn.classList.remove("is-active");
      });
      // Legg til aktiv klasse på valgt knapp
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
    return debts.reduce((total, debt) => {
      const elapsed = Math.max(0, Number(yearVal) - 2026);
      return total + remainingBalanceAfterYears(debt, elapsed);
    }, 0);
  }

  // Hjelpefunksjon for å beregne gjenværende gjeld for en spesifikk gjeldspost
  function remainingDebtForDebt(debt, yearVal) {
    const elapsed = Math.max(0, Number(yearVal) - 2026);
    return remainingBalanceAfterYears(debt, elapsed);
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
      // Hvis kun én gjeldspost, bruk samme struktur som før
      segments.push({ key: "Gjeld", value: totalDebtVal, color: "#FCA5A5" });
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
  // Legg til alle gjeldsposter i legend
  if (debts.length === 1) {
    legendItems.push({ key: "Gjeld", color: "#FCA5A5" });
  } else if (debts.length > 1) {
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

/** Hovedstolen for et gitt år fra Mål og behov-fanen (Hovedstolen i mål og behov). Array: [start/2026, start 2026, start 2027, ...]. Hvis året er utenfor prognosen, returneres 0. */
function getMaalOgBehovHovedstolForYear(yearVal) {
  try {
    const raw = localStorage.getItem("maalOgBehovHovedstolPerYear");
    if (raw == null) return getMaalOgBehovSum2026();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return getMaalOgBehovSum2026();
    const year = Number(yearVal);
    const idx = year === 2026 ? 0 : (year - 2026 + 1);
    if (idx < 0) return arr[0];
    if (idx >= arr.length) return 0;
    return Number(arr[idx]) || 0;
  } catch (e) {
    return getMaalOgBehovSum2026();
  }
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

/** Skriv sparing-beløp til Mål og behov: ved «Årlig sparing» = netto kontantstrøm, ved «Alt» = tilpasset beløp. */
function writeSparingForMaalOgBehov() {
  try {
    const routing = ensureCashflowRoutingState();
    const { net } = computeAnnualCashflowBreakdown();
    const netPositive = Math.max(0, Math.round(net || 0));
    const amount = routing.mode === "investeringer" ? netPositive : routing.mode === "custom" ? Math.round(routing.customAmount || 0) : 0;
    localStorage.setItem("tKontoSparingForMaalOgBehov", String(amount));
  } catch (e) {}
}

function createItemRow(collectionName, item) {
  const row = document.createElement("div");
  row.className = "asset-row";

  // Lagre originalnavn for å identifisere investeringer
  const originalName = item.name || "";

  const isMaalOgBehovRow = collectionName === "assets" && (item.noDelete || /investeringer\s*mål\s*og\s*behov/i.test(String(item.name || "")));
  const isMaalOgBehovReadOnly = isMaalOgBehovRow;
  if (isMaalOgBehovRow) item.noDelete = true; // sikre at lagret state beholder flagget
  if (isMaalOgBehovReadOnly) item.amount = getMaalOgBehovSum2026();

  let range = null; // brukes i name-listener og kun satt når !isMaalOgBehovReadOnly
  let setRangeBounds = function () {}; // satt i range-blokken, brukes av name-listener

  // Sett assetType basert på navn hvis det ikke allerede er satt (for bakoverkompatibilitet)
  if (collectionName === "assets" && !item.assetType) {
    const nameUpper = String(item.name || "").toUpperCase();
    if (/^EIENDOM$/i.test(item.name) && !/FAST/i.test(nameUpper)) {
      item.assetType = "eiendom";
    } else if (/^INVESTERINGER$/i.test(nameUpper) || /INVESTERINGER\s*MÅL\s*OG\s*BEHOV/i.test(nameUpper)) {
      item.assetType = "investeringer";
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

  const col = document.createElement("div");
  col.className = "asset-col";

  const top = document.createElement("div");
  top.className = "asset-top";

  const name = document.createElement("input");
  name.className = "asset-name";
  name.type = "text";
  name.value = item.name || "";
  name.setAttribute("aria-label", `Navn på ${collectionName.slice(0, -1)}`);
  name.addEventListener("input", () => { 
    item.name = name.value; 
    markCostIfNeeded(name.value); 
    if (range) setRangeBounds(); 
    // Bevar assetType når navnet endres - ikke endre det basert på nytt navn
  });

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
          privat: { active: true, name: "Privat" },
          holding1: { active: false, name: "Holding AS" },
          holding2: { active: false, name: "Holding II AS" }
        };
      }
      
      // Legg til alle Privat-bokser i nedtrekksmenyen
      const privatArray = Array.isArray(AppState.structure.privat) ? AppState.structure.privat : [AppState.structure.privat];
      privatArray.forEach((privatEntity, index) => {
        const privatOption = document.createElement("option");
        privatOption.value = index === 0 ? "privat" : `privat-${index}`;
        privatOption.textContent = privatEntity.name || (index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`);
        
        // Sjekk om dette er valgt entity (støtt både "privat" og "privat-0" for første, "privat-1", "privat-2" osv. for resten)
        const currentValue = item.entity || "privat";
        if (index === 0 && (currentValue === "privat" || currentValue === "privat-0")) {
          privatOption.selected = true;
        } else if (index > 0 && currentValue === `privat-${index}`) {
          privatOption.selected = true;
        }
        
        entitySelect.appendChild(privatOption);
      });
      
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
  if (!(collectionName === "assets" && (item.noDelete || /investeringer\s*mål\s*og\s*behov/i.test(String(item.name || ""))))) {
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

  if (!isMaalOgBehovReadOnly) {
    range = document.createElement("input");
    range.className = "asset-range";
    range.type = "range";
    range.min = "0";
    range.max = "50000000";
    range.step = "50000";

    setRangeBounds = function () {
      if (collectionName === "incomes") {
        const label = String(item.name || name.value || "").toUpperCase();
        if (/L[ØO]NN|SKATT|UTBYT|SKATTEFRIE\s*INNTEKTER|KOSTNAD/.test(label)) range.max = "10000000";
        else range.max = "50000000";
        if (Number(range.value) > Number(range.max)) {
          range.value = range.max;
          if (amount) amount.textContent = formatNOK(Number(range.value));
        }
      } else if (collectionName === "assets") {
        const label = String(item.name || name.value || "").toUpperCase();
        const originalLabel = String(originalName || "").toUpperCase();
        const assetType = item.assetType;
        const isInvestment = assetType === "investeringer" || /^INVESTERINGER$/i.test(label) || /^INVESTERINGER$/i.test(originalLabel);
        const isEiendom = assetType === "eiendom" || /^EIENDOM$/i.test(label) && !/FAST/i.test(label);
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
          if (amount) amount.textContent = formatNOK(Number(range.value));
        }
      }
    };

    setRangeBounds();
    range.value = String(item.amount || 0);
    if (Number(range.value) > Number(range.max)) range.value = range.max;
    amount.textContent = formatNOK(Number(range.value));

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
      if (collectionName === "incomes" && (item.name === "LØNNSINNTEKT" || item.name === "UTBYTTER")) updateAutoTax();
      if (collectionName === "assets") updateAutoTax();
      updateTopSummaries();
    });
  }

  col.appendChild(top);
  if (range) col.appendChild(range);

  // For inntekter: legg til wrapper med toggle-knapp, ellers bare legg til amount direkte
  if (collectionName === "incomes") {
    const itemNameUpper = String(item.name || "").toUpperCase();
    const shouldShowToggle = !["LØNNSINNTEKT", "UTBYTTER", "SKATTEFRIE INNTEKTER"].includes(itemNameUpper);
    
    if (shouldShowToggle) {
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
            // Beregn skatt basert på lønnsinntekt
            const wageIncome = AppState.incomes.find(i => i.name === "LØNNSINNTEKT");
            if (wageIncome) {
              const calculatedTax = calculateTax(wageIncome.amount);
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
            // Beregn formuesskatt basert på sum av alle eiendeler (0.5%)
            const assets = AppState.assets || [];
            const sumAssets = assets.reduce((s, x) => s + (x.amount || 0), 0);
            const calculatedTax = Math.round(sumAssets * 0.005);
            item.amount = calculatedTax;
            item._autoTaxEnabled = true;
            
            // Oppdater slider og visning
            range.value = String(calculatedTax);
            amount.textContent = formatNOK(calculatedTax);
            // Eksporter beløpet til Mål og behov (tallet helt til høyre)
            setFormuesskattForMaalOgBehov(item.amount);
            updateTopSummaries();
          } else {
            // Deaktiver auto-beregning
            item._autoTaxEnabled = false;
          }
        });
      } else if (item.name === "ÅRLIGE KOSTNADER") {
        toggleInput.addEventListener("change", () => {
          if (toggleInput.checked) {
            // Beregn eierkostnader basert på sum av alle eiendeler (4%)
            const assets = AppState.assets || [];
            const sumAssets = assets.reduce((s, x) => s + (x.amount || 0), 0);
            const calculatedCosts = Math.round(sumAssets * 0.04);
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
    // Annuitetslån
    if (r === 0) return P / n;
    return P * (r / (1 - Math.pow(1 + r, -n)));
  }
}

function calculateTotalAnnualDebtPayment(debts) {
  return (debts || AppState.debts || []).reduce((sum, debt) => sum + calculateAnnualDebtPayment(debt), 0);
}

function calculateTotalAnnualInterest(debts) {
  return (debts || AppState.debts || []).reduce((sum, debt) => {
    const P = debt.amount || 0;
    if (P <= 0) return sum;
    const debtParams = debt.debtParams || AppState.debtParams;
    return sum + (P * (debtParams.rate || 0));
  }, 0);
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
  ["Annuitetslån", "Serielån", "Avdragsfrihet", "Avdragsfrihet 3 år", "Avdragsfrihet 5 år", "Avdragsfrihet 10 år"].forEach((t) => {
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

  const heading = document.createElement("h3");
  heading.textContent = "Gjeld";
  panel.appendChild(heading);

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

// --- Inntekter modul ---
function renderIncomeModule(root) {
  root.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel panel-income";

  const heading = document.createElement("h3");
  heading.textContent = "Inntekt";
  panel.appendChild(heading);

  const list = document.createElement("div");
  list.className = "assets";
  panel.appendChild(list);

  AppState.incomes.forEach((item) => list.appendChild(createItemRow("incomes", item)));

  // Wrapper for knappene
  const buttonWrapper = document.createElement("div");
  buttonWrapper.style.display = "flex";
  buttonWrapper.style.gap = "12px";
  buttonWrapper.style.marginTop = "10px";

  // Knapp for å legge til inntekt (grønn)
  const addIncomeBtn = document.createElement("button");
  addIncomeBtn.className = "btn-add";
  addIncomeBtn.style.width = "calc(50% - 6px)";
  addIncomeBtn.style.backgroundColor = "#7AD9A9"; // Grønn farge som inntekter i kontantstrøm
  addIncomeBtn.style.borderColor = "#7AD9A9";
  addIncomeBtn.style.boxShadow = "0 2px 8px rgba(122, 217, 169, 0.3)"; // Skygge
  addIncomeBtn.textContent = "Legg til inntekt";
  addIncomeBtn.addEventListener("click", () => {
    const newItem = { id: genId(), name: "NY INNTEKT", amount: 0 };
    AppState.incomes.push(newItem);
    list.appendChild(createItemRow("incomes", newItem));
    updateTopSummaries();
    // Oppdater Kontantstrøm hvis den er åpen
    const moduleRoot = document.getElementById("module-root");
    const currentNav = document.querySelector(".nav-item.is-active");
    if (moduleRoot && currentNav) {
      const section = currentNav.getAttribute("data-section") || currentNav.textContent || "";
      if (section === "Kontantstrøm") {
        renderWaterfallModule(moduleRoot);
      }
    }
  });
  addIncomeBtn.addEventListener("mouseenter", () => {
    addIncomeBtn.style.filter = "brightness(1.05)";
    addIncomeBtn.style.boxShadow = "0 4px 12px rgba(122, 217, 169, 0.4)";
  });
  addIncomeBtn.addEventListener("mouseleave", () => {
    addIncomeBtn.style.filter = "none";
    addIncomeBtn.style.boxShadow = "0 2px 8px rgba(122, 217, 169, 0.3)";
  });
  buttonWrapper.appendChild(addIncomeBtn);

  // Knapp for å legge til kostnader (rød)
  const addCostBtn = document.createElement("button");
  addCostBtn.className = "btn-add";
  addCostBtn.style.width = "calc(50% - 6px)";
  addCostBtn.style.backgroundColor = "#F1998F"; // Rød farge som kostnader i kontantstrøm
  addCostBtn.style.borderColor = "#F1998F";
  addCostBtn.style.boxShadow = "0 2px 8px rgba(241, 153, 143, 0.3)"; // Skygge
  addCostBtn.textContent = "Legg til kostnader";
  addCostBtn.addEventListener("click", () => {
    const newItem = { id: genId(), name: "Ny årlig kostnad", amount: 0 };
    AppState.incomes.push(newItem);
    list.appendChild(createItemRow("incomes", newItem));
    updateTopSummaries();
    // Oppdater Kontantstrøm hvis den er åpen
    const moduleRoot = document.getElementById("module-root");
    const currentNav = document.querySelector(".nav-item.is-active");
    if (moduleRoot && currentNav) {
      const section = currentNav.getAttribute("data-section") || currentNav.textContent || "";
      if (section === "Kontantstrøm") {
        renderWaterfallModule(moduleRoot);
      }
    }
  });
  addCostBtn.addEventListener("mouseenter", () => {
    addCostBtn.style.filter = "brightness(1.05)";
    addCostBtn.style.boxShadow = "0 4px 12px rgba(241, 153, 143, 0.4)";
  });
  addCostBtn.addEventListener("mouseleave", () => {
    addCostBtn.style.filter = "none";
    addCostBtn.style.boxShadow = "0 2px 8px rgba(241, 153, 143, 0.3)";
  });
  buttonWrapper.appendChild(addCostBtn);

  panel.appendChild(buttonWrapper);

  root.appendChild(panel);
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
  const annualCosts = incomeItems
    .filter((x) => /SKATT|KOSTNAD/.test(upper(x.name)))
    .reduce((s, x) => s + (x.amount || 0), 0);
  const totalIncome = incomeItems
    .filter((x) => !/SKATT|KOSTNAD/.test(upper(x.name)))
    .reduce((s, x) => s + (x.amount || 0), 0);

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

// --- Tapsbærende Evne (TBE) ---
function renderTbeModule(root) {
  root.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel";

  const heading = document.createElement("h3");
  heading.textContent = "Tapsbærende evne (TBE)";
  panel.appendChild(heading);

  // Hent grunnlag
  const totalAssets = (AppState.assets || []).reduce((s, x) => s + (x.amount || 0), 0);
  const totalDebt = (AppState.debts || []).reduce((s, x) => s + (x.amount || 0), 0);

  const incomeItems = AppState.incomes || [];
  const upper = (s) => String(s || "").toUpperCase();
  const annualCosts = incomeItems.filter((x) => /SKATT|KOSTNAD/.test(upper(x.name))).reduce((s, x) => s + (x.amount || 0), 0);
  const totalIncome = incomeItems.filter((x) => !/SKATT|KOSTNAD/.test(upper(x.name))).reduce((s, x) => s + (x.amount || 0), 0);

  // Gjeldsforpliktelser (per år) - beregnet per gjeldspost
  const annualDebtPayment = calculateTotalAnnualDebtPayment(AppState.debts);

  // Nøkler
  const equity = totalAssets - totalDebt;
  const disposableCashflow = totalIncome - annualCosts; // etter skatt/utgifter, før renter/avdrag

  const debtToIncome = totalIncome > 0 ? totalDebt / totalIncome : 0; // Gjeldsgrad
  const equityPct = totalAssets > 0 ? (equity / totalAssets) * 100 : 0; // EK%
  const cashToDebt = totalDebt > 0 ? (disposableCashflow + annualDebtPayment) / totalDebt : 0; // (Kontantstrøm + renter og avdrag) / Gjeld

  // Klassifisering iht. kriterier
  // Justert terskler (mindre strenge) iht. spesifikasjonen
  // Gjeld/inntekt: Bra < 3x, Ok 3–5x, Dårlig > 5x
  function scoreDebtToIncome(v) { if (v < 3.0) return "high"; if (v <= 5.0) return "mid"; return "low"; }
  // EK-andel: Bra >= 35%, Ok 20–35%, Dårlig < 20%
  function scoreEquityPct(v) { if (v >= 35) return "high"; if (v >= 20) return "mid"; return "low"; }
  // Kontantstrøm/gjeld: Bra >= 25%, Ok 10–25%, Dårlig < 10%
  function scoreCashToDebt(v) { if (v >= 0.25) return "high"; if (v >= 0.10) return "mid"; return "low"; }

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

  function trRow(name, resultText, score, formula, measure) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td"); td1.textContent = name; td1.className = "muted";
    const td2 = document.createElement("td"); td2.textContent = resultText;
    const td3 = document.createElement("td"); const wrap = document.createElement("span"); wrap.className = `status ${statusClass(score)}`; wrap.textContent = statusLabel(score); td3.appendChild(wrap);
    const td4 = document.createElement("td"); td4.textContent = formula; td4.className = "muted";
    const td5 = document.createElement("td"); td5.textContent = measure; td5.className = "muted";
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(td5);
    return tr;
  }

  tbody.appendChild(trRow("Gjeldsgrad", fmtXDecimal(debtToIncome), s1, "Total gjeld / Årlig inntekt", "Gjeldskapasitet"));
  tbody.appendChild(trRow("Egenkapitalandel (EK%)", fmtPct(equityPct), s2, "(Total EK / Totale eiendeler) × 100", "Soliditet"));
  tbody.appendChild(trRow("Kontantstrøm/Gjeld", fmtXDecimal(cashToDebt), s3, "(Årlig kontantstrøm + renter og avdrag) / Gjeld", "Likviditet"));

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
    
    // Fylt sirkel (farge basert på poeng: rødt=1, gult=2, grønt=3)
    const fillCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    fillCircle.setAttribute("cx", centerX);
    fillCircle.setAttribute("cy", centerY);
    fillCircle.setAttribute("r", radius);
    fillCircle.setAttribute("fill", "none");
    let fillColor;
    if (cat.score === 1) {
      fillColor = "#EF4444"; // Rødt
    } else if (cat.score === 2) {
      fillColor = "#FBBF24"; // Gult (mer tydelig gul)
    } else if (cat.score === 3) {
      fillColor = "#22C55E"; // Grønt
    } else {
      fillColor = "#E5E7EB"; // Grå fallback
    }
    fillCircle.setAttribute("stroke", fillColor);
    fillCircle.setAttribute("stroke-width", strokeWidth);
    fillCircle.setAttribute("stroke-dasharray", `${(cat.score / cat.maxScore) * circumference} ${circumference}`);
    fillCircle.setAttribute("stroke-dashoffset", circumference / 4);
    fillCircle.setAttribute("stroke-linecap", "round");
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
  
  // Fylt sirkel (farge basert på total score)
  const totalFillCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  totalFillCircle.setAttribute("cx", totalCenterX);
  totalFillCircle.setAttribute("cy", totalCenterY);
  totalFillCircle.setAttribute("r", totalRadius);
  totalFillCircle.setAttribute("fill", "none");
  // Bestem farge basert på total score: 7 eller høyere = grønt
  let totalFillColor;
  if (totalScore >= 7) {
    totalFillColor = "#22C55E"; // Grønt
  } else if (totalScore >= 5) {
    totalFillColor = "#FBBF24"; // Gult
  } else {
    totalFillColor = "#EF4444"; // Rødt
  }
  totalFillCircle.setAttribute("stroke", totalFillColor);
  totalFillCircle.setAttribute("stroke-width", totalStrokeWidth);
  totalFillCircle.setAttribute("stroke-dasharray", `${(totalScore / maxTotalScore) * totalCircumference} ${totalCircumference}`);
  totalFillCircle.setAttribute("stroke-dashoffset", totalCircumference / 4);
  totalFillCircle.setAttribute("stroke-linecap", "round");
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
    reason = `Din Tapsbærende Evne er Lav med ${totalScore} poeng. Løft indikatorene (bl.a. ${worst}) for å nå minst 5 poeng. Lav betyr 1 poeng, Middels betyr 2 poeng og Høy betyr 3 poeng.`;
  } else if (overall === "mid") {
    reason = `Din Tapsbærende Evne er Middels med ${totalScore} poeng. For å nå Høy må du få minst 7 poeng totalt. Lav betyr 1 poeng, Middels betyr 2 poeng og Høy betyr 3 poeng.`;
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
  const annualCosts = incomeItems
    .filter((x) => /SKATT|KOSTNAD/.test(upper(x.name)))
    .reduce((s, x) => s + (x.amount || 0), 0);
  const totalIncome = incomeItems
    .filter((x) => !/SKATT|KOSTNAD/.test(upper(x.name)))
    .reduce((s, x) => s + (x.amount || 0), 0);
  const disposableIncome = totalIncome - annualCosts;
  const annualDebtPayment = calculateTotalAnnualDebtPayment(debts);
  const cashflow = Math.round(totalIncome - annualCosts - annualDebtPayment);

  return {
    sumAssets,
    sumDebts,
    equity,
    totalIncome,
    annualCosts,
    annualDebtPayment,
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
  const equity = snapshot.equity;

  const debtToIncome = totalIncome > 0 ? totalDebt / totalIncome : 0;
  const equityPct = totalAssets > 0 ? (equity / totalAssets) * 100 : 0;
  const cashToDebt = totalDebt > 0 ? (disposableIncome + annualDebtPayment) / totalDebt : 0;

  const scoreDebtToIncome = (v) => (v < 3.0 ? "high" : v <= 5.0 ? "mid" : "low");
  const scoreEquityPct = (v) => (v >= 35 ? "high" : v >= 20 ? "mid" : "low");
  const scoreCashToDebt = (v) => (v >= 0.25 ? "high" : v >= 0.10 ? "mid" : "low");

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

function updateForsideCards(snapshot, forceActive = false) {
  const forsideIsActive = forceActive || !!document.querySelector('.nav-item[data-section="Forside"].is-active');
  const summaryCards = document.querySelectorAll(".summary-card");
  summaryCards.forEach(card => {
    card.classList.toggle("is-forside", forsideIsActive);
  });

  const tbe = calculateTbeSummary(snapshot);
  const tbeSub = document.getElementById("forside-card-subtitle-tbe");
  if (tbeSub) {
    tbeSub.textContent = "Evnen til å bære tap";
  }
  const tbeScore = document.getElementById("forside-card-score-tbe");
  if (tbeScore) {
    tbeScore.hidden = true;
    tbeScore.textContent = "";
    tbeScore.classList.remove("status-high", "status-mid", "status-low");
  }
}

function updateTopSummaries() {
  const snapshot = getFinancialSnapshot();
  const el = document.getElementById("sum-assets");
  if (el) el.textContent = formatNOKSummary(snapshot.sumAssets);

  const elD = document.getElementById("sum-debts");
  if (elD) elD.textContent = formatNOKSummary(snapshot.sumDebts);

  const elE = document.getElementById("sum-equity");
  if (elE) elE.textContent = formatNOKSummary(snapshot.equity);

  // Kontantstrøm per år fra Analyse-beregningen
  const elC = document.getElementById("sum-cashflow");
  if (elC) elC.textContent = formatNOKSummary(snapshot.cashflow);

  updateForsideCards(snapshot);

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
    card2.classList.add("danger"); // Gjeld skal ha rød farge
  }
  if (card3) {
    card3.textContent = "Egenkapital og gjeld";
    card3.classList.remove("danger", "success-dark");
    card3.classList.add("success"); // Egenkapital skal ha grønn farge
  }
  if (card4) {
    card4.textContent = "Ek avkastning";
    card4.classList.remove("danger", "success");
    card4.classList.add("success-dark"); // Årlig kontantstrøm skal ha mørk grønn farge
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
    card4.textContent = "Årlig kontantstrøm";
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
    card4.textContent = "Årlig kontantstrøm";
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
        const displayName = privat.name || defaultName;
        const label = index === 0 ? "Privat" : `Privat ${getRomanNumeral(index + 1)}`;
        lines.push(`${counter}: Struktur - ${label} navn: ${displayName}`);
        counter++;
      }
    });
    
    // Inkluder alle Holdingselskaper med aktiv status og navn
    if (structure.holding1) {
      lines.push(`${counter}: Struktur - Holding AS 1 aktiv: ${structure.holding1.active ? "ja" : "nei"}`);
      counter++;
      const holding1Name = structure.holding1.name || "Holding AS";
      lines.push(`${counter}: Struktur - Holding AS 1 navn: ${holding1Name}`);
      counter++;
    }
    
    if (structure.holding2) {
      lines.push(`${counter}: Struktur - Holding AS 2 aktiv: ${structure.holding2.active ? "ja" : "nei"}`);
      counter++;
      const holding2Name = structure.holding2.name || "Holding II AS";
      lines.push(`${counter}: Struktur - Holding AS 2 navn: ${holding2Name}`);
      counter++;
    }
  }
  
  // Eiendeler (Assets) - inkluder alle eiendeler uavhengig av navn eller type
  const allAssets = AppState.assets || [];
  allAssets.forEach((asset) => {
    // Inkluder alle eiendeler - ingen filtrering basert på navn eller type
    if (asset && asset.name !== undefined) {
      lines.push(`${counter}: ${asset.name}: ${formatValue(asset.amount || 0)}`);
      counter++;
      // Lagre assetType hvis den er satt (for å bevare type når navn endres)
      if (asset.assetType) {
        lines.push(`${counter}: ${asset.name} - AssetType: ${asset.assetType}`);
        counter++;
      }
      // Lagre entity-tilordning (privat, holding1, holding2)
      if (asset.entity) {
        lines.push(`${counter}: ${asset.name} - Entity: ${asset.entity}`);
        counter++;
      }
    }
  });
  
  // Gjeld (Debts) - navn og beløp
  (AppState.debts || []).forEach((debt) => {
    lines.push(`${counter}: ${debt.name}: ${formatValue(debt.amount)}`);
    counter++;
    
    // Lånetype (select)
    const debtParams = debt.debtParams || AppState.debtParams;
    lines.push(`${counter}: ${debt.name} - Lånetype: ${debtParams.type || "Annuitetslån"}`);
    counter++;
    
    // Lånetid (år) - slider
    lines.push(`${counter}: ${debt.name} - Lånetid: ${debtParams.years || 25} år`);
    counter++;
    
    // Rentekostnader (%) - slider
    const rate = (debtParams.rate || 0) * 100;
    lines.push(`${counter}: ${debt.name} - Rentekostnader: ${formatPercent(rate)}`);
    counter++;
  });
  
  // Inntekter (Incomes)
  (AppState.incomes || []).forEach((income) => {
    lines.push(`${counter}: ${income.name}: ${formatValue(income.amount)}`);
    counter++;
  });
  
  // Forventet avkastning (Expectations) - slider
  const exp = AppState.expectations || {};
  const expLabels = {
    likvider: "BANK",
    fastEiendom: "FAST EIENDOM",
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
          else if (section === "Treemap") renderGraphicsModule(moduleRoot);
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
  const structureData = {}; // Struktur-data fra input
  
  for (const line of lines) {
    // Format: "1: BANK: 2 MNOK" eller "1: BANK: 2 000 000 kr"
    const match = line.match(/^\d+:\s*(.+?):\s*(.+)$/);
    if (!match) continue;
    
    const [, name, valueStr] = match;
    
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
        } else if (/L[ØO]NN|UTBYT|SKATTEFRIE\s*INNTEKTER|SKATT|KOSTNAD/i.test(upperName)) {
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
      if (!debtMap.has(debtName)) {
        debtMap.set(debtName, {
          name: debtName,
          amount: 0,
          debtParams: { type: valueStr.trim(), years: 25, rate: 0.04 }
        });
      } else {
        debtMap.get(debtName).debtParams.type = valueStr.trim();
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
      if (expKey === "BANK") expectations.likvider = percent;
      else if (expKey === "FAST EIENDOM") expectations.fastEiendom = percent;
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
      } else if (name.includes("Privat navn") && !name.includes("II") && !name.includes("III") && !name.includes("IV") && !name.includes("V")) {
        // Første Privat (uten romertall)
        if (!structureData.privatNames) {
          structureData.privatNames = {};
        }
        structureData.privatNames[0] = valueStr.trim();
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
      const asset = {
        id: genId(),
        name: a.name,
        amount: a.amount
      };
      // Bruk assetType fra output hvis den er lagret, ellers sett basert på navn
      if (assetTypeMap.has(a.name)) {
        asset.assetType = assetTypeMap.get(a.name);
      } else {
        // Fallback: Sett assetType basert på navn (for bakoverkompatibilitet)
        if (/^EIENDOM$/i.test(a.name) && !/FAST/i.test(a.name)) {
          asset.assetType = "eiendom";
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
        privat: [{ active: true, name: "Privat" }],
        holding1: { active: false, name: "Holding AS" },
        holding2: { active: false, name: "Holding II AS" }
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
    
    // Oppdater Holdingselskaper
    if (structureData.holding1Active !== undefined) {
      if (!AppState.structure.holding1) {
        AppState.structure.holding1 = { active: false, name: "Holding AS" };
      }
      AppState.structure.holding1.active = structureData.holding1Active;
      if (structureData.holding1Name) {
        AppState.structure.holding1.name = structureData.holding1Name;
      }
    }
    
    if (structureData.holding2Active !== undefined) {
      if (!AppState.structure.holding2) {
        AppState.structure.holding2 = { active: false, name: "Holding II AS" };
      }
      AppState.structure.holding2.active = structureData.holding2Active;
      if (structureData.holding2Name) {
        AppState.structure.holding2.name = structureData.holding2Name;
      }
    }
  }
  
  return true;
}

window.TKontoParseInputText = parseInputText;

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

