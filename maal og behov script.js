// Remove all imports and use global variables
const { useState, useMemo, useCallback, useEffect, useLayoutEffect } = React;
const { createRoot } = ReactDOM;

// Chart.js is already loaded globally
const {
  Chart: ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend: ChartJsLegend,
  PointElement,
  LineElement,
  Filler,
} = Chart;

// Custom Chart components using Chart.js directly
const Bar = ({ data, options }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (canvasRef.current && typeof Chart !== 'undefined') {
            // Destroy existing chart
            if (chartRef.current) {
                chartRef.current.destroy();
            }

            // Create new chart
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options
            });
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, options]);

    return React.createElement('canvas', { ref: canvasRef });
};

// Avrunding kun på oversiden av hele stolpen (øverste synlige segment i stacken)
const STACKED_BAR_TOP_RADIUS = 8;
function withStackedTopBorderRadius(datasets) {
    return datasets.map((ds, datasetIndex) => ({
        ...ds,
        borderRadius: (ds.data || []).map((_, dataIndex) => {
            let topDatasetIndex = -1;
            for (let i = datasets.length - 1; i >= 0; i--) {
                const candidate = datasets[i];
                if (candidate.stack !== ds.stack) continue;
                const value = Number(candidate.data?.[dataIndex]);
                if (Number.isFinite(value) && value > 0.01) {
                    topDatasetIndex = i;
                    break;
                }
            }
            return datasetIndex === topDatasetIndex ? STACKED_BAR_TOP_RADIUS : 0;
        }),
        borderSkipped: 'bottom',
    }));
}

const Line = ({ data, options }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (canvasRef.current && typeof Chart !== 'undefined') {
            // Destroy existing chart
            if (chartRef.current) {
                chartRef.current.destroy();
            }

            // Create new chart
            const ctx = canvasRef.current.getContext('2d');
            
            // Process data to add gradients if needed
            const processedData = {
                ...data,
                datasets: data.datasets.map((dataset) => {
                    if (dataset.gradientFill) {
                        // Create gradient function that will be called by Chart.js after layout
                        const baseColor = dataset.borderColor || dataset.backgroundColor || '#66CCDD';
                        const rgb = hexToRgb(baseColor);
                        
                        return {
                            ...dataset,
                            backgroundColor: (context) => {
                                if (!context.chart.chartArea) {
                                    return baseColor;
                                }
                                const chart = context.chart;
                                const { top, bottom } = chart.chartArea;
                                const gradient = ctx.createLinearGradient(0, top, 0, bottom);
                                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
                                gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
                                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
                                return gradient;
                            }
                        };
                    }
                    return dataset;
                })
            };
            
            chartRef.current = new Chart(ctx, {
                type: 'line',
                data: processedData,
                options: options
            });
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, options]);

    return React.createElement('canvas', { ref: canvasRef });
};

// Simple Doughnut/Pie using Chart.js directly
const Doughnut = ({ data, options, type = 'pie' }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (canvasRef.current && typeof Chart !== 'undefined') {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, { type, data, options });
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [data, options, type]);

    return React.createElement('canvas', { ref: canvasRef });
};

// --- From constants.ts ---
const START_YEAR = 2026;

// Farger for Forutsetning «Vis grafikk» — SPWM blåskala
const FORUTSETNING_AKSJE_P1 = '#405A82';
const FORUTSETNING_AKSJE_P2 = '#6096E8';
const FORUTSETNING_RENTEPORTEFOLJE = '#EEF5FF';

const CHART_COLORS = {
    hovedstol: '#002359',
    avkastning: '#99BEF5',
    sparing: '#405A82',
    utbetaling_netto: '#0A5EDC',
    utbetaling_skatt: '#D92D20',
    total_utbetaling: '#6941C6',
    event_total_color: '#EEF5FF',
    renteskatt: '#B42318',
    skatt2: '#D92D20',
    aksjeandel: '#99BEF5',
    renteandel: '#EEF5FF',
    innskutt_kapital: '#0A5EDC',
    aksjer_principal: '#99BEF5',
    aksjer_avkastning: '#EEF5FF',
    renter_principal: '#A0AEC4',
    renter_avkastning: '#CCD3DE'
};

const SPWM_INK = '#344054';
const SPWM_NAVY = '#002359';
const SPWM_BLUE = '#0A5EDC';
const SPWM_GRID = 'rgba(234, 236, 240, 0.8)';

// Helper function to adjust color brightness
const adjustColorBrightness = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + percent));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
    const num = parseInt(hex.replace('#', ''), 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
};

// Helper function to create sophisticated gradients with multiple stops
const createPremiumGradient = (baseColor, direction = '180deg') => {
    const rgb = hexToRgb(baseColor);
    const lighter = adjustColorBrightness(baseColor, 20);
    const darker = adjustColorBrightness(baseColor, -25);
    return `linear-gradient(${direction},
        ${baseColor} 0%,
        ${lighter} 20%,
        ${baseColor} 40%,
        ${darker} 70%,
        ${adjustColorBrightness(baseColor, -35)} 100%)`;
};

// Helper function to create glow color
const createGlowColor = (baseColor, opacity = 0.6) => {
    const rgb = hexToRgb(baseColor);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

// Maks antall hendelser som kan legges til
const MAX_EVENTS = 10;

function parseLoanAmount(raw) {
    let s = String(raw || '').trim();
    s = s.replace(/kr\.?/gi, '').replace(/nok/gi, '').trim();
    s = s.replace(/,-\s*$/, '');
    s = s.replace(/[\s\u00a0\u202f]/g, '');
    s = s.replace(/\u2212/g, '-');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    s = s.replace(/[^\d.\-]/g, '');
    if (!s || s === '-' || s === '.') return NaN;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
}

// Linjer fra lånekalkulator: «2026  kr 1 041 526,-» eller «2027–2035  kr 730 296,-».
// Ett år eller ett årsspenn blir én hendelse. Beløpet lagres negativt (uttak).
function parseLoanCalculatorInput(text) {
    const lines = String(text || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\u202f/g, ' ')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) return { events: [], error: '' };

    const yearRe = /^(\d{4})\s*(?:[\u2010\u2011\u2012\u2013\u2014\u2212\-]\s*(\d{4}))?(?:\s+|[;:|]+)(.+)$/;
    const events = [];
    const bad = [];
    lines.forEach((line) => {
        const match = line.match(yearRe);
        if (!match) {
            bad.push(line);
            return;
        }
        let startAar = parseInt(match[1], 10);
        let sluttAar = match[2] ? parseInt(match[2], 10) : startAar;
        if (sluttAar < startAar) {
            const swap = startAar;
            startAar = sluttAar;
            sluttAar = swap;
        }
        const amount = parseLoanAmount(match[3]);
        if (!Number.isFinite(amount)) {
            bad.push(line);
            return;
        }
        events.push({
            startAar,
            sluttAar,
            belop: -Math.abs(Math.round(amount)),
        });
    });

    if (bad.length) {
        return { events: [], error: 'Kunne ikke lese: ' + bad.slice(0, 3).join(' · ') };
    }
    if (events.length > MAX_EVENTS) {
        return {
            events: [],
            error: `Du kan importere maks ${MAX_EVENTS} hendelser. Innlimingen har ${events.length}. Slå sammen år med samme beløp, for eksempel 2027–2035.`,
        };
    }
    return { events, error: '' };
}

const LEGEND_DATA = [
    { label: 'Hovedstol', color: CHART_COLORS.hovedstol },
    { label: 'Avkastning', color: CHART_COLORS.avkastning },
    { label: 'Årlig sparing', color: CHART_COLORS.sparing },
    { label: 'Hendelser', color: CHART_COLORS.event_total_color },
    { label: 'Netto utbetaling', color: CHART_COLORS.utbetaling_netto },
    { label: 'Skatt på hendelser', color: CHART_COLORS.skatt2 },
    { label: 'Løpende renteskatt', color: CHART_COLORS.renteskatt }
];

const INITIAL_APP_STATE = {
    initialPortfolioSize: 10000000,
    portfolio1Name: PORTFOLIO1_NAME_DEFAULT,
    pensionPortfolioSize: 0,
    portfolio2Name: PORTFOLIO2_NAME_DEFAULT,
    additionalPensionAmount: 0,
    investedCapital: 0,
    investmentYears: 10,
    payoutYears: 0,
    desiredAnnualPayoutAfterTax: 0,
    initialStockAllocation: 0,
    stockReturnRate: 8.0,
    bondReturnRate: 5.0,
    bankDepositRate: 3.0, // Forventet rente bankinnskudd (UI; ikke brukt i beregninger ennå)
    shieldingRate: 3.9,
    taxRate: 37.84,
    annualSavings: 0,
    events: [],
    investorType: 'Privat', // Ny state for AS eller Privat
    taxCalculationEnabled: true, // Skatteberegning på/av
    manualBondTaxRate: 22.0, // Ny state for manuell kapitalskatt
    manualStockTaxRate: 37.84, // Ny state for manuell aksjebeskatning
    desiredAnnualConsumptionPayout: 0, // Ny state for ønsket årlig uttak til forbruk
    desiredAnnualWealthTaxPayout: 0, // Ny state for ønsket årlig uttak til formuesskatt
    wealthTaxFromTKonto: false, // Om formuesskatt-uttak hentes fra T-konto
    goalSeekPayoutResult: 0, // Resultat fra målsøk utbetaling
    goalSeekPayoutDrainFinalYear: false, // Tøm porteføljen i siste utbetalingsår ved målsøk utbetaling
    goalSeekPortfolio1Result: 0, // Resultat fra målsøk Portefølje I
    kpiRate: 0.0, // Ny slider for forventet KPI
    deferredInterestTax: true, // Utsatt skatt på renter (kun Privat); standard Ja
    advisoryFeeRate: 0.0, // Rådgivningshonorar (prosentpoeng)
    // Uavhengige valg for aksjeandel per rad (UI)
    row1StockAllocation: 0,
    row2StockAllocation: 0,
    row3StockAllocation: 0,
    // Standardavvik for Monte Carlo simulering
    stockStdDev: 12.0, // Standardavvik aksjer (%)
    bondStdDev: 3.0, // Standardavvik renter (%)
};

// Global state holder for "Mål og behov"-fanen (eksponeres på window for Risikosimulering-iframe)
const MaalOgBehovState = {
    appState: null, // Lagrer hovedstate
    showDistributionGraphic: false,
    showStockPortionGraphic: false,
    showInvestedCapitalGraphic: false,
    showGoalSeek: false,
    showOutputModal: false,
    outputText: '',
    copied: false,
    showInputModal: false,
    inputText: '',
    showAssumptionsGraphic: false,
    showSimulation: false,
    showAccumulatedReturn: false,
    showMonteCarlo: false,
    monteCarloKey: 0,
    showMonteCarloPortfolio: false,
    monteCarloPortfolioKey: 0,
    showMonteCarloStockAllocation: false,
    monteCarloStockAllocationKey: 0,
    simButtonActive: false,
    simulationKey: 0,
    savedSimulatedReturns: { stockReturns: [], bondReturns: [] },
    advisoryInputValue: INITIAL_APP_STATE.advisoryFeeRate.toFixed(2).replace('.', ','),
    waterfallMode: false,
    spToolButtonMarked: false,
    utbToolButtonMarked: false,
    portToolButtonMarked: false
};
if (typeof window !== 'undefined') { window.MaalOgBehovState = MaalOgBehovState; }

/** Samme som h1 i Mål og behov; brukes også som overskrift på første panel i Fremtidige verdier. */
const MAAL_PANEL_TITLE_DEFAULT = 'Samlet forvaltning - fremtidige verdier';

function getMaalPanelTitle() {
    const t = MaalOgBehovState.panelTitle;
    const trimmed = t != null ? String(t).trim() : '';
    return trimmed || MAAL_PANEL_TITLE_DEFAULT;
}

function notifyMaalPanelTitleChanged(title) {
    const next = (title != null && String(title).trim()) ? String(title).trim() : MAAL_PANEL_TITLE_DEFAULT;
    MaalOgBehovState.panelTitle = next;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('maal-og-behov-panel-title-changed', { detail: { title: next } }));
    }
    return next;
}
const PORTFOLIO1_NAME_DEFAULT = 'Portefølje I';
const PORTFOLIO2_NAME_DEFAULT = 'Portefølje II';

function resolvePortfolio1Name(name) {
    const n = String(name ?? '').trim();
    return n || PORTFOLIO1_NAME_DEFAULT;
}

function resolvePortfolio2Name(name) {
    const n = String(name ?? '').trim();
    return n || PORTFOLIO2_NAME_DEFAULT;
}

const STOCK_ALLOCATION_OPTIONS = [
    { label: '100% Renter', value: 0 },
    { label: '20% Aksjer', value: 20 },
    { label: '45% Aksjer', value: 45 },
    { label: '55% Aksjer', value: 55 },
    { label: '65% Aksjer', value: 65 },
    { label: '85% Aksjer', value: 85 },
    { label: '100% Aksjer', value: 100 }
];


// --- From services/prognosisCalculator.ts ---
const populateAnnualStockPercentages = (state) => {
    const extraDisplayYear = (state.payoutYears > 0) ? 1 : 0;
    const totalSimulatedYears = state.investmentYears + state.payoutYears + extraDisplayYear;
    const annualStockPercentages = [];

    for (let index = 0; index < totalSimulatedYears; index++) {
        const isInvestmentYear = index < state.investmentYears;
        const isPayoutYear = index >= state.investmentYears;
        let currentPercentage = 0;

        if (isInvestmentYear) {
            // Use initialStockAllocation which is already calculated based on the three portfolios
            // (computeInitialStockPct handles the case when portfolios are 0)
            currentPercentage = state.initialStockAllocation;
        } else if (isPayoutYear) {
            currentPercentage = state.investmentYears > 0 ? annualStockPercentages[state.investmentYears - 1] : state.initialStockAllocation;
        }
        annualStockPercentages.push(currentPercentage);
    }
    return annualStockPercentages;
};

const calculatePrognosis = (state, simButtonActive = false, simulatedReturns = null) => {
    const labels = [];
    const data = {
        hovedstol: [], avkastning: [], sparing: [], nettoUtbetaling: [],
        renteskatt: [], event_total: [], eventNegativeOutflow: [], skatt2: [],
        annualStockPercentages: [], annualBondPercentages: [], investedCapitalHistory: []
    };

    let currentPortfolioValue = state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
    // Track individual portfolio values (savings go to Portefølje I)
    let portfolio1Value = state.initialPortfolioSize || 0;
    let portfolio2Value = state.pensionPortfolioSize || 0;
    let portfolio3Value = state.additionalPensionAmount || 0;
    let taxFreeCapitalRemaining = state.investedCapital;
    let deferredEventTax = 0; // Tax from an event to be paid NEXT year.
    let deferredBondTax = 0; // Bond tax to be paid NEXT year (when using deferred mode)
    let untaxedBondReturnPool = 0; // Akkumulerte ubeskattede rentegevinster (Privat + utsatt rente-skatt)

    const taxesEnabled = state.taxCalculationEnabled !== false;
    // Bruk simulerte avkastninger hvis sim-knappen er aktiv, ellers bruk forventet avkastning
    const useSimulatedReturns = simButtonActive && simulatedReturns && simulatedReturns.stockReturns.length > 0;
    const shieldingRate = state.shieldingRate / 100;
    const taxRate = state.manualStockTaxRate / 100; // Bruker manuell aksjebeskatning
    const bondTaxRate = state.manualBondTaxRate / 100; // Bruker manuell kapitalskatt
    const kpiRate = state.kpiRate / 100; // KPI som skal fordeles proporsjonalt
    const advisoryFeeRate = state.advisoryFeeRate / 100; // Rådgivningshonorar som skal fordeles proporsjonalt
    const realizeDeferredBondReturn = (bondWithdrawalAmount) => {
        if (!(taxesEnabled && state.deferredInterestTax === true) || bondWithdrawalAmount <= 0) return 0;
        // Ved utsatt skatt selges opparbeidet renteavkastning før hovedstol.
        const realizedUntaxedBondReturn = Math.min(untaxedBondReturnPool, bondWithdrawalAmount);
        untaxedBondReturnPool -= realizedUntaxedBondReturn;
        return realizedUntaxedBondReturn;
    };
    // AS: rentedel av ethvert bruttouttak kan realisere ubeskattet rentegevinster,
    // også når utbyttet dekkes av innskutt kapital (kun utbytteskatt unngås).
    const asBondRealizationTaxOnWithdrawal = (grossWithdrawalAmount, bondShare) => {
        if (!(taxesEnabled && state.investorType === 'AS' && state.deferredInterestTax === true) ||
            grossWithdrawalAmount <= 0 || bondShare <= 0) {
            return 0;
        }
        return realizeDeferredBondReturn(grossWithdrawalAmount * bondShare) * bondTaxRate;
    };

    const annualStockPercentages = populateAnnualStockPercentages(state);
    const extraDisplayYear = (state.payoutYears > 0) ? 1 : 0;
    const totalSimulatedYears = state.investmentYears + state.payoutYears + extraDisplayYear;

    // --- START ROW ("start") BEFORE FIRST YEAR ---
    labels.push('start');
    // "Start" skal vise total investeringssum i hovedstol
    data.hovedstol.push(Math.round(state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0)));
    data.avkastning.push(0);
    data.sparing.push(0);
    data.event_total.push(0);
    data.eventNegativeOutflow.push(0);
    data.nettoUtbetaling.push(0);
    data.skatt2.push(0);
    data.renteskatt.push(0);
    data.annualStockPercentages.push(Math.round(state.initialStockAllocation));
    data.annualBondPercentages.push(Math.round(100 - state.initialStockAllocation));
    data.investedCapitalHistory.push(Math.round(state.investedCapital));

    for (let i = 0; i < totalSimulatedYears; i++) {
        const year = START_YEAR + i;
        labels.push(year.toString());

        const startOfYearPortfolioValue = currentPortfolioValue;
        const isLastPayoutYear = i === (state.investmentYears + state.payoutYears - 1);
        const isExtraDisplayYear = i === (state.investmentYears + state.payoutYears);
        // Ved utsatt renteskatt skal målsøk utbetaling fordeles jevnt over utbetalingsårene.
        // Da må vi IKKE tømme hele porteføljen i siste utbetalingsår.
        const useGoalSeekPayoutDrainFinalYear = taxesEnabled &&
            state.goalSeekPayoutDrainFinalYear === true &&
            (state.payoutYears || 0) > 0 &&
            state.deferredInterestTax !== true;
        const taxesPaidOutsidePortfolioThisYear = useGoalSeekPayoutDrainFinalYear && isExtraDisplayYear;
       
        // --- START OF YEAR ---

        // 1. Lagre utsatt skatt fra forrige år (betales ETTER avkastning er beregnet)
        const eventTaxToPayThisYear = taxesEnabled ? deferredEventTax : 0;
        const bondTaxToPayThisYear = taxesEnabled ? deferredBondTax : 0;
        deferredEventTax = 0;
        deferredBondTax = 0;

        // Tilgjengelig skattefri kvote ved uttak = inngående innskutt kapital × (1 + skjermingsrente).
        // Samme «IB + skjerming» som brukes i årsavslutning av innskutt kapital (prev × (1+skjerming) − uttak).
        const prevYearInvestedCapital = taxFreeCapitalRemaining;
        let availableForWithdrawal = taxFreeCapitalRemaining * (1 + shieldingRate);

        // 2. (Skjerming inngår nå i availableForWithdrawal over; årsslutt bruker fortsatt prev × (1+skjerming) − uttak.)

        // 3. Handle inflows (savings and positive events)
        const isInvestmentYear = i < state.investmentYears;
        let totalInflow = isInvestmentYear ? state.annualSavings : 0;
        let eventWithdrawal = 0;
        let netEventAmountForChart = 0;
        let negativeEventBelopSum = 0; // Kun negative hendelser (utbetaling fra portefølje)

        state.events.forEach(event => {
            if (year >= event.startAar && year <= event.sluttAar) {
                netEventAmountForChart += event.belop;
                if (event.belop < 0) {
                    negativeEventBelopSum += event.belop;
                }
                if (event.belop > 0) {
                    totalInflow += event.belop;
                } else {
                    eventWithdrawal += event.belop; // Negative value
                }
            }
        });
        // Add savings to Portefølje I (annual savings go to Portefølje I)
        if (isInvestmentYear && state.annualSavings > 0) {
            portfolio1Value += state.annualSavings;
        }
       
        // Add event inflows (assume they go to Portefølje I for now, or could be distributed)
        // For simplicity, positive events also go to Portefølje I
        let eventInflowToPortfolio1 = 0;
        state.events.forEach(event => {
            if (year >= event.startAar && year <= event.sluttAar && event.belop > 0) {
                eventInflowToPortfolio1 += event.belop;
            }
        });
        portfolio1Value += eventInflowToPortfolio1;
       
        currentPortfolioValue += totalInflow;
       
        // Calculate stock percentage dynamically based on actual portfolio composition
        // This accounts for savings being added to Portefølje I
        const totalPortfolioValue = portfolio1Value + portfolio2Value + portfolio3Value;
        let annualStockPercentage = 0;
        if (totalPortfolioValue > 0) {
            const weightedStock = (portfolio1Value * (state.row1StockAllocation || 0)) +
                                  (portfolio2Value * (state.row2StockAllocation || 0)) +
                                  (portfolio3Value * 0); // Likviditetsfond is always 0% stocks
            annualStockPercentage = Math.round(weightedStock / totalPortfolioValue);
        } else {
            // Fallback to initial allocation if portfolios are empty
            annualStockPercentage = annualStockPercentages[i];
        }
       
        // Calculate savings part to add to invested capital (always check, regardless of totalInflow)
        // For Privat: Use stock percentage from Portefølje I only (where savings are placed)
        let savingsPart = 0;
        if (isInvestmentYear && state.annualSavings > 0) {
            if (state.investorType === 'Privat') {
                const portfolio1StockPercentage = state.row1StockAllocation || 0;
                savingsPart = state.annualSavings * (portfolio1StockPercentage / 100);
            } else {
                savingsPart = state.annualSavings;
            }
        }
       
        // Sum only positive event amounts flagged to increase invested capital
        let addToInvestedFromEvents = 0;
        state.events.forEach(event => {
            if (year >= event.startAar && year <= event.sluttAar) {
                if (event.belop > 0 && event.addToInvestedCapital !== false) {
                    addToInvestedFromEvents += event.belop;
                }
            }
        });
       
        // Innskudd legges til på slutten av året etter skjermingsrente (se slutten av år)
        const stockShareForCap = (annualStockPercentage || 0) / 100;
        const portfolio1StockPctForCap = (state.row1StockAllocation || 0) / 100;

        // 4. Calculate investment growth FIRST (FØR skatt trekkes fra)
        const annualBondPercentage = 100 - annualStockPercentage;
        let totalGrossReturn = 0;
        let totalNetReturnBeforeTax = 0;
        let annualBondTaxAmount = 0;
        let realizedBondTaxThisYear = 0;

        if (currentPortfolioValue > 0) {
            const stockValue = currentPortfolioValue * (annualStockPercentage / 100);
            const bondValue = currentPortfolioValue * (annualBondPercentage / 100);
            
            let stockReturnRateForYear, bondReturnRateForYear;
            if (useSimulatedReturns && i < simulatedReturns.stockReturns.length) {
                stockReturnRateForYear = simulatedReturns.stockReturns[i] / 100;
                bondReturnRateForYear = simulatedReturns.bondReturns[i] / 100;
            } else {
                stockReturnRateForYear = state.stockReturnRate / 100;
                bondReturnRateForYear = state.bondReturnRate / 100;
            }
            const bankDepositRateForYear = state.bankDepositRate / 100;
            
            const grossStockReturn = stockValue * stockReturnRateForYear;
            const p1StockPct = state.row1StockAllocation || 0;
            const p2StockPct = state.row2StockAllocation || 0;
            const p1bVal = portfolio1Value * ((100 - p1StockPct) / 100);
            const p2bVal = portfolio2Value * ((100 - p2StockPct) / 100);
            const grossBondReturn = p1bVal * bondReturnRateForYear + p2bVal * bondReturnRateForYear + portfolio3Value * bankDepositRateForYear;
            totalGrossReturn = grossStockReturn + grossBondReturn;

            const stockKpiReduction = stockValue * kpiRate;
            const bondKpiReduction = bondValue * kpiRate;
            const stockFeeReduction = stockValue * advisoryFeeRate;
            const bondFeeReduction = bondValue * advisoryFeeRate;
            const netStockReturn = grossStockReturn - stockKpiReduction - stockFeeReduction;
            const netBondReturnBeforeTax = grossBondReturn - bondKpiReduction - bondFeeReduction;
            totalNetReturnBeforeTax = netStockReturn + netBondReturnBeforeTax;

            const useDeferredBondTax = taxesEnabled && state.deferredInterestTax === true;
            let portfolioReturn = 0;
            if (useDeferredBondTax) {
                untaxedBondReturnPool += grossBondReturn;
                annualBondTaxAmount = 0;
                portfolioReturn = netStockReturn + netBondReturnBeforeTax;
                currentPortfolioValue += portfolioReturn;
            } else {
                annualBondTaxAmount = taxesEnabled ? (grossBondReturn * bondTaxRate) : 0;
                portfolioReturn = netStockReturn + (netBondReturnBeforeTax - annualBondTaxAmount);
                currentPortfolioValue += portfolioReturn;
            }
           
            if (totalPortfolioValue > 0) {
                const useDef = useDeferredBondTax;
               
                const p1Return = portfolio1Value * ((p1StockPct / 100) * stockReturnRateForYear + ((100 - p1StockPct) / 100) * bondReturnRateForYear) -
                                 portfolio1Value * kpiRate - portfolio1Value * advisoryFeeRate -
                                 (portfolio1Value * ((100 - p1StockPct) / 100) * bondReturnRateForYear * (useDef ? 0 : (taxesEnabled ? bondTaxRate : 0)));
                const p2Return = portfolio2Value * ((p2StockPct / 100) * stockReturnRateForYear + ((100 - p2StockPct) / 100) * bondReturnRateForYear) -
                                 portfolio2Value * kpiRate - portfolio2Value * advisoryFeeRate -
                                 (portfolio2Value * ((100 - p2StockPct) / 100) * bondReturnRateForYear * (useDef ? 0 : (taxesEnabled ? bondTaxRate : 0)));
                const p3Return = portfolio3Value * bankDepositRateForYear - portfolio3Value * kpiRate - portfolio3Value * advisoryFeeRate -
                                 (portfolio3Value * bankDepositRateForYear * (useDef ? 0 : (taxesEnabled ? bondTaxRate : 0)));
               
                portfolio1Value += p1Return;
                portfolio2Value += p2Return;
                portfolio3Value += p3Return;
            }
        }

        // 5. Betal utsatt skatt fra forrige år ETTER avkastning er beregnet
        // Skattebetalingen er et uttak som selv er skattepliktig (kaskade mot utsett kø påfølgende år —
        // i siste simuleringsår / ekstra visningsår finnes ikke neste kolonne — kaskaden betales kontant samme år).
        /** Aksjekaskade tatt kontant ved siste år (graf/sum — ikke ny utsatt kø). */
        let aksjeSkatteKaskadeKontantSisteÅr = 0;

        if (taxesEnabled) {
            if (!taxesPaidOutsidePortfolioThisYear) {
                currentPortfolioValue -= eventTaxToPayThisYear + bondTaxToPayThisYear;

                const eventCascade = eventTaxToPayThisYear * taxRate;

                if (isExtraDisplayYear && eventTaxToPayThisYear > 0) {
                    aksjeSkatteKaskadeKontantSisteÅr = eventCascade;
                    currentPortfolioValue -= eventCascade;
                } else {
                    deferredEventTax += eventCascade;
                }

                deferredBondTax += realizeDeferredBondReturn(bondTaxToPayThisYear) * bondTaxRate;
            }
        }

        // Uttak som reduserer innskutt kapital = (fullt årlig nettouttak) + hendelser + målsøk-tømming + skatt på hendelser.
        // Note: Portefølje/skatteflyt bruker fortsatt fromTaxFree mot skattefri kvote; innskutt-kapital-kontoen følger
        // regnestykket IB × (1+skjerming) − (forbruk + formuesskatt) slik det gjøres i Excel.
        let uttakFromNetto = 0;
        let investedCapitalAnnualNetUttak = 0; // Ønsket netto uttak (samme som desiredNet i utbetalingsår)
        let uttakFromHendelser = 0;
        let uttakFromGoalSeekFinalDrain = 0;
        const uttakFromSkattHendelser = taxesEnabled ? eventTaxToPayThisYear : 0;
        let totalUttakThisYear = 0;

        // 5. Handle outflows and calculate taxes
        let annualNetWithdrawalAmountForChart = 0;
       
        // 5a. Regular annual payouts (taxed in the same year) - exclude extra display year
        const isOrdinaryPayoutYear = (i >= state.investmentYears) && (i < state.investmentYears + state.payoutYears);
        const totalDesiredPayout = state.desiredAnnualConsumptionPayout + state.desiredAnnualWealthTaxPayout;
            if (isOrdinaryPayoutYear && totalDesiredPayout > 0) {
            let desiredNet = totalDesiredPayout;
            investedCapitalAnnualNetUttak = desiredNet;
            const stockShare = (annualStockPercentage / 100);
            const bondShare = 1 - stockShare;
            
            let fromTaxFree;
            let remainingDesiredNet;
            let grossWithdrawal = 0;
            
            if (state.investorType === 'AS') {
                // AS: Full withdrawal amount reduces contributed capital first
                fromTaxFree = Math.min(desiredNet, availableForWithdrawal);
                remainingDesiredNet = desiredNet - fromTaxFree;
                grossWithdrawal = fromTaxFree;
            } else {
                // Privat: Only the stock portion of the withdrawal reduces invested capital
                const stockPortionOfNet = desiredNet * stockShare;
                fromTaxFree = Math.min(stockPortionOfNet, availableForWithdrawal);
                remainingDesiredNet = desiredNet - fromTaxFree;
                grossWithdrawal = fromTaxFree;
            }
            // Reduser tilgjengelig skattefri kvote for ev. event-uttak i samme år
            availableForWithdrawal -= fromTaxFree;
            uttakFromNetto = fromTaxFree;

            if (remainingDesiredNet > 0) {
                let grossNeededFromTaxable;
               
                if (taxesEnabled) {
                    if (state.investorType === 'AS') {
                        // AS: Hele skattepliktig uttak beskattes som utbytte, uavhengig av aksje-/renteandel.
                        const dividendTax = remainingDesiredNet * taxRate;
                        grossNeededFromTaxable = remainingDesiredNet;
                        deferredEventTax += dividendTax;
                    } else {
                        // Privat: Skatt = skattepliktig beløp × rate. Aksjedel og rentedel separert.
                        const totalStockPortionNet = desiredNet * stockShare;
                        const stockLeftoverNet = Math.max(0, totalStockPortionNet - fromTaxFree);
                        const stockTax = stockLeftoverNet * taxRate;
                        let bondRealizationTax = 0;
                        if (state.deferredInterestTax === true && bondShare > 0) {
                            const bondPortionOfWithdrawal = remainingDesiredNet * bondShare;
                            bondRealizationTax = realizeDeferredBondReturn(bondPortionOfWithdrawal) * bondTaxRate;
                        }
                        grossNeededFromTaxable = remainingDesiredNet;
                        deferredEventTax += stockTax;
                        realizedBondTaxThisYear += bondRealizationTax;
                    }
                } else {
                    grossNeededFromTaxable = remainingDesiredNet;
                }
               
                grossWithdrawal += grossNeededFromTaxable;
            }
            realizedBondTaxThisYear += asBondRealizationTaxOnWithdrawal(grossWithdrawal, bondShare);
            currentPortfolioValue -= grossWithdrawal;
            annualNetWithdrawalAmountForChart += desiredNet;
            totalUttakThisYear += grossWithdrawal;
        }

        // Ved målsøk utbetaling: tøm resten av porteføljen i siste utbetalingsår slik at skatten i ekstraåret kan betales utenfor porteføljen.
        if (useGoalSeekPayoutDrainFinalYear && isLastPayoutYear && currentPortfolioValue > 0) {
            const finalYearDrain = currentPortfolioValue;
            const stockShare = (annualStockPercentage / 100);
            const bondShare = 1 - stockShare;

            let coveredAmount;
            if (state.investorType === 'AS') {
                coveredAmount = Math.min(finalYearDrain, availableForWithdrawal);
            } else {
                const stockPortionGross = finalYearDrain * stockShare;
                coveredAmount = Math.min(stockPortionGross, availableForWithdrawal);
            }

            availableForWithdrawal -= coveredAmount;
            uttakFromGoalSeekFinalDrain = coveredAmount;

            if (taxesEnabled) {
                if (state.investorType === 'Privat') {
                    const taxableFromStock = Math.max(0, finalYearDrain * stockShare - coveredAmount);
                    const taxableFromBond = finalYearDrain * bondShare;
                    deferredEventTax += taxableFromStock * taxRate;

                    if (state.deferredInterestTax === true && bondShare > 0) {
                        realizedBondTaxThisYear += realizeDeferredBondReturn(taxableFromBond) * bondTaxRate;
                    }
                } else {
                    const taxableWithdrawal = finalYearDrain - coveredAmount;
                    if (taxableWithdrawal > 0) {
                        deferredEventTax += taxableWithdrawal * taxRate;
                    }
                    realizedBondTaxThisYear += asBondRealizationTaxOnWithdrawal(finalYearDrain, bondShare);
                }
            }

            currentPortfolioValue = 0;
            annualNetWithdrawalAmountForChart += finalYearDrain;
            totalUttakThisYear += finalYearDrain;
        }

        // 5b. Event withdrawals (tax is DEFERRED to next year)
        // Hendelsesbeløp = bruttouttak (totalt som tas ut). Skatt = (uttak - innskutt) × rate. Kaskade på skattebetaling.
        if (eventWithdrawal < 0) {
            const withdrawalAmount = Math.abs(eventWithdrawal);
            totalUttakThisYear += withdrawalAmount;
            const preWithdrawalPortfolioValue = currentPortfolioValue;
            const stockShare = (annualStockPercentage / 100);
            const bondShare = 1 - stockShare;
            
            let coveredAmount;
            let taxableFromStock;
            let taxableFromBond;
            
            if (state.investorType === 'AS') {
                coveredAmount = Math.min(withdrawalAmount, availableForWithdrawal);
                taxableFromStock = 0;
                taxableFromBond = 0;
            } else {
                const stockPortionGross = withdrawalAmount * stockShare;
                coveredAmount = Math.min(stockPortionGross, availableForWithdrawal);
                taxableFromStock = Math.max(0, stockPortionGross - coveredAmount);
                taxableFromBond = withdrawalAmount * bondShare;
            }
            availableForWithdrawal -= coveredAmount;
            uttakFromHendelser = coveredAmount;
           
            if (taxesEnabled) {
                if (state.investorType === 'Privat') {
                    const stockTax = taxableFromStock * taxRate;
                    let bondRealizationTax = 0;
                    if (state.deferredInterestTax === true && bondShare > 0) {
                        bondRealizationTax = realizeDeferredBondReturn(taxableFromBond) * bondTaxRate;
                    }
                    deferredEventTax += stockTax;
                    realizedBondTaxThisYear += bondRealizationTax;
                } else {
                    const taxableWithdrawal = withdrawalAmount - coveredAmount;
                    if (taxableWithdrawal > 0) {
                        deferredEventTax += taxableWithdrawal * taxRate;
                    }
                    realizedBondTaxThisYear += asBondRealizationTaxOnWithdrawal(withdrawalAmount, bondShare);
                }
            }
            currentPortfolioValue = preWithdrawalPortfolioValue - withdrawalAmount;
        }

        if (realizedBondTaxThisYear > 0) {
            currentPortfolioValue -= realizedBondTaxThisYear;
        }

        // Innskutt kapital: (forrige år × (1 + skjermingsrente) - uttak) + innskudd
        // Uttak (netto årlig) = fullt ønsket forbruk + formuesskatt-uttak, ikke kun skattefri andel (fromTaxFree).
        const totalUttak = investedCapitalAnnualNetUttak + uttakFromHendelser + uttakFromGoalSeekFinalDrain + uttakFromSkattHendelser;
        taxFreeCapitalRemaining = Math.max(0, (prevYearInvestedCapital * (1 + shieldingRate)) - totalUttak);
        if (state.investorType === 'Privat') {
            taxFreeCapitalRemaining += savingsPart + addToInvestedFromEvents * portfolio1StockPctForCap;
        } else {
            taxFreeCapitalRemaining += (isInvestmentYear ? state.annualSavings : 0) + addToInvestedFromEvents;
        }
       
        // --- END OF YEAR ---
       
        // Update individual portfolio values to match final total portfolio value
        // This ensures portfolio values are always correct
        const finalTotalPortfolioValue = currentPortfolioValue;
        const currentSum = portfolio1Value + portfolio2Value + portfolio3Value;
       
        // Only scale if there's a meaningful difference (due to withdrawals, taxes, etc.)
        // When there's no return and no withdrawals/taxes, portfolio values should already be correct
        if (Math.abs(finalTotalPortfolioValue - currentSum) > 0.01) {
            // There's a difference, scale proportionally (due to withdrawals, taxes, etc.)
            if (currentSum > 0) {
                const scaleFactor = finalTotalPortfolioValue / currentSum;
                portfolio1Value *= scaleFactor;
                portfolio2Value *= scaleFactor;
                portfolio3Value *= scaleFactor;
            } else if (finalTotalPortfolioValue > 0) {
                // If portfolios were empty but now have value (from savings), all goes to Portefølje I
                portfolio1Value = finalTotalPortfolioValue;
                portfolio2Value = 0;
                portfolio3Value = 0;
            }
        }
        // If no difference (or difference is negligible), portfolio values are already correct

        // 6. Push data to arrays for charting
        data.hovedstol.push(Math.round(startOfYearPortfolioValue));
        // Vis avkastning NETTO for KPI og honorar i "Mål og behov"-grafen
        data.avkastning.push(Math.round(totalNetReturnBeforeTax));
        data.sparing.push(Math.round(isInvestmentYear ? state.annualSavings : 0));
        data.event_total.push(Math.round(netEventAmountForChart));
        data.eventNegativeOutflow.push(Math.round(negativeEventBelopSum));
        data.nettoUtbetaling.push(Math.round(-annualNetWithdrawalAmountForChart));
        {
            let skattPaidEventForChart = taxesEnabled ? eventTaxToPayThisYear : 0;
            if (taxesEnabled) {
                skattPaidEventForChart += aksjeSkatteKaskadeKontantSisteÅr;
            }
            data.skatt2.push(Math.round(-skattPaidEventForChart));
        }
        const bondTaxPaidThisYear = taxesEnabled ? (bondTaxToPayThisYear + annualBondTaxAmount + realizedBondTaxThisYear) : 0; // Løpende skatt på årets renter + realisert renteavkastning
        data.renteskatt.push(Math.round(-bondTaxPaidThisYear));
        data.annualStockPercentages.push(Math.round(annualStockPercentage));
        data.annualBondPercentages.push(Math.round(annualBondPercentage));
        // Innskutt kapital sluttsum: (forrige × (1+skjerming) - uttak) + innskudd
        data.investedCapitalHistory.push(Math.round(taxFreeCapitalRemaining));
    }

    return { labels, data, finalPortfolioValue: currentPortfolioValue };
};

// --- From App.tsx ---
ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, ChartJsLegend, PointElement, LineElement, Filler
);

const formatCurrency = (value) => new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const formatNumberRaw = (value) => new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
/** Beløp med tusenskilletegn, uten «kr» (samme som T-konto). */
const formatNOKPlain = (value) => formatNumberRaw(value);

// --- HELPER & CHILD COMPONENTS --- //
const SliderInput = ({ id, label, value, min, max, step, onChange, unit, isCurrency, noKrSuffix, displayValue, allowDirectInput, inline, hideLabel, thumbColor, editableLabel, labelValue, onLabelChange, labelPlaceholder }) => {
const formatSliderAmount = (v) => {
  if (!isCurrency) return `${formatNumberRaw(v)}${unit ? ` ${unit}` : ''}`;
  return noKrSuffix ? formatNOKPlain(v) : formatCurrency(v);
};
const [textValue, setTextValue] = React.useState(() => formatSliderAmount(value));

React.useEffect(() => {
setTextValue(formatSliderAmount(value));
}, [value, isCurrency, unit, noKrSuffix]);

const renderLabel = () => {
    if (editableLabel) {
        return (
            <input
                type="text"
                value={labelValue ?? ''}
                onChange={(e) => onLabelChange && onLabelChange(e.target.value)}
                placeholder={labelPlaceholder || label}
                className="typo-label text-[#333333]/80 bg-transparent border-none outline-none w-full p-0 m-0"
                aria-label={`Navn på ${labelPlaceholder || label}`}
            />
        );
    }
    if (inline) {
        return <label htmlFor={id} className="typo-label text-[#333333]/80 whitespace-nowrap normal-case min-w-[90px]">{label}</label>;
    }
    return <label htmlFor={id} className="typo-label text-[#333333]/80">{label}</label>;
};

const parseCurrencyInput = (raw) => {
const digitsOnly = String(raw).replace(/[^0-9]/g, '');
const num = parseInt(digitsOnly, 10);
return isNaN(num) ? 0 : num;
};

const handleBlur = () => {
if (!allowDirectInput) return;
let parsed = isCurrency ? parseCurrencyInput(textValue) : parseFloat(String(textValue).replace(/[^0-9.\-]/g, '')) || 0;
parsed = Math.min(max, Math.max(min, parsed));
onChange(id, parsed);
setTextValue(formatSliderAmount(parsed));
};

    return (
        <div>
            {inline ? (
                <div className="relative flex items-center gap-4 mt-1 pr-36">
                    {!hideLabel && renderLabel()}
                    <input
                        type="range"
                        id={id}
                        name={id}
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-[#DDDDDD] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[var(--thumb-color,#66CCDD)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                        style={thumbColor ? { '--thumb-color': thumbColor } : undefined}
                    />
                    {allowDirectInput ? (
                    <input
                            type="text"
                            value={textValue}
                            onChange={(e) => setTextValue(e.target.value)}
                            onBlur={handleBlur}
                            onFocus={(e) => e.target.select()}
                        className="bg-white border border-[#DDDDDD] rounded-md pl-3 pr-0 py-1.5 text-[#333333] text-right w-32 absolute right-2 shadow-md"
                        />
                    ) : (
                    <span className="typo-paragraph text-[#333333] w-32 text-right pr-1 absolute right-2">
                            {displayValue ?? formatSliderAmount(value)}
                        </span>
                    )}
                </div>
            ) : (
                <>
                    {!hideLabel && renderLabel()}
                    <div className={`flex items-center gap-4 ${hideLabel ? '' : 'mt-1'}`}>
                        <input
                            type="range"
                            id={id}
                            name={id}
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            onChange={(e) => onChange(id, parseFloat(e.target.value))}
                            className="w-full h-2 bg-[#DDDDDD] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[var(--thumb-color,#66CCDD)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                            style={thumbColor ? { '--thumb-color': thumbColor } : undefined}
                        />
                        {allowDirectInput ? (
                            <input
                                type="text"
                                value={textValue}
                                onChange={(e) => setTextValue(e.target.value)}
                                onBlur={handleBlur}
                                onFocus={(e) => e.target.select()}
                                className="bg-white border border-[#DDDDDD] rounded-md px-3 py-1.5 text-[#333333] text-right w-32 shadow-md"
                            />
                        ) : (
                        <span className="typo-paragraph text-[#333333] w-32 text-right pr-1">
                                {displayValue ?? formatSliderAmount(value)}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Fjernet UI for 'Utsatt skatt på renter'

const InvestorTypeToggle = ({ value, onChange }) => (
    <div>
        <label className="typo-label text-[#333333]/80">Investor type</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button
                onClick={() => onChange('investorType', 'AS')}
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value === 'AS' ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>AS</span>
            </button>
            <button
                onClick={() => onChange('investorType', 'Privat')}
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value === 'Privat' ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>Privat</span>
            </button>
        </div>
    </div>
);

const TaxCalculationToggle = ({ value, onChange }) => (
    <div>
        <label className="typo-label text-[#333333]/80">Skatteberegning</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button
                onClick={() => onChange('taxCalculationEnabled', true)}
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>På</span>
            </button>
            <button
                onClick={() => onChange('taxCalculationEnabled', false)}
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${!value ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>Av</span>
            </button>
        </div>
    </div>
);

// Koble UI-toggle til app-state: "Utsatt skatt på renter"
const DeferredInterestTaxToggle = ({ value, onChange }) => {
    const selected = value ? 'Ja' : 'Nei';
    return (
        <div>
            <label className="typo-label text-[#333333]/80">Utsatt skatt på renter</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                    onClick={() => onChange('deferredInterestTax', true)}
                    className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${selected === 'Ja' ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
                >
                    <span>Ja</span>
                </button>
                <button
                    onClick={() => onChange('deferredInterestTax', false)}
                    className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${selected === 'Nei' ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
                >
                    <span>Nei</span>
                </button>
            </div>
        </div>
    );
};

const ResetAllButton = ({ onReset }) => (
    <div>
        <label className="typo-label text-[#333333]/80">Nullstill alt</label>
        <div className="mt-2">
            <button
                onClick={onReset}
                className="w-full p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100"
            >
                <span>Nullstill alt</span>
            </button>
        </div>
    </div>
);

const ManualTaxInput = ({ id, label, value, onChange }) => (
    <div>
        <label htmlFor={id} className="typo-label text-[#333333]/80">{label}</label>
        <div className="flex items-center gap-2 mt-1">
            <input
                type="number"
                id={id}
                name={id}
                min="0"
                max="100"
                step="0.01"
                value={value}
                onChange={(e) => onChange(id, parseFloat(e.target.value) || 0)}
                className="flex-1 bg-white border border-[#DDDDDD] rounded-md px-3 py-2 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent"
                placeholder="0.0"
            />
            <span className="typo-paragraph text-[#333333] w-8">%</span>
        </div>
    </div>
);

const EventRow = ({ event, onUpdate, onRemove, maxYear }) => {
    const [amount, setAmount] = useState(() => formatNumberRaw(event.belop));

    useEffect(() => {
        setAmount(formatNumberRaw(event.belop));
    }, [event.belop]);

    const handleAmountChange = (e) => {
        setAmount(e.target.value);
    };

    const handleAmountBlur = () => {
        let num = parseFloat(amount.replace(/\s/g, '').replace(/,/g, '.'));
        if (isNaN(num)) num = 0;
        onUpdate(event.id, 'belop', num);
    };

    const handleStartChange = (e) => {
        const newStart = parseInt(e.target.value, 10);
        onUpdate(event.id, 'startAar', newStart);
        if (newStart > event.sluttAar) {
            onUpdate(event.id, 'sluttAar', newStart);
        }
    };

    const handleEndChange = (e) => {
        const newEnd = parseInt(e.target.value, 10);
        onUpdate(event.id, 'sluttAar', newEnd);
        if (newEnd < event.startAar) {
            onUpdate(event.id, 'startAar', newEnd);
        }
    };

    const range = maxYear - START_YEAR;
    const leftPercent = range > 0 ? ((event.startAar - START_YEAR) / range) * 100 : 0;
    const widthPercent = range > 0 ? ((event.sluttAar - event.startAar) / range) * 100 : 0;

    return (
        <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-3">
            <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3">
                <input type="text" value={event.type} onChange={(e) => onUpdate(event.id, 'type', e.target.value)} className="w-full bg-white border border-[#DDDDDD] rounded-md px-3 py-1.5 text-[#333333]" placeholder="Navn på hendelse" />
                </div>
                <div className="col-span-5 relative h-10 flex items-center">
                <div className="relative w-full">
                    {/* Track background */}
                    <div className="absolute w-full h-1.5 bg-[#DDDDDD] rounded-full top-1/2 -translate-y-1/2"></div>
                    {/* Highlighted track */}
                    <div className="absolute h-1.5 bg-[#66CCDD] rounded-full top-1/2 -translate-y-1/2" style={{ left: `${leftPercent}%`, width: `${Math.max(0, widthPercent)}%` }}></div>
                   
                                         {/* Start Year Label */}
                     <span className="absolute text-sm text-gray-500 -bottom-8" style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}>{event.startAar}</span>
                     {/* End Year Label */}
                     <span className="absolute text-sm text-gray-500 -bottom-8" style={{ left: `${leftPercent + widthPercent}%`, transform: 'translateX(-50%)' }}>{event.sluttAar}</span>

                    {/* Start slider (bottom layer) */}
                    <input
                        type="range" min={START_YEAR} max={maxYear} value={event.startAar} onChange={handleStartChange}
                        className="absolute w-full h-1.5 appearance-none bg-transparent m-0 z-10 top-1/2 -translate-y-1/2 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#66CCDD] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
                    />
                   
                    {/* End slider (top layer, track is non-interactive) */}
                    <input
                        type="range" min={START_YEAR} max={maxYear} value={event.sluttAar} onChange={handleEndChange}
                        className="absolute w-full h-1.5 appearance-none bg-transparent m-0 z-20 pointer-events-none top-1/2 -translate-y-1/2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#66CCDD] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
                    />
                </div>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                <input type="text" value={amount} onChange={handleAmountChange} onBlur={handleAmountBlur} className="bg-white border border-[#DDDDDD] rounded-md px-3 py-1.5 text-[#333333] text-right w-full" placeholder="Beløp" />
                </div>
                <div className="col-span-1 flex justify-end">
                <button onClick={() => onRemove(event.id)} className="text-gray-400 hover:text-[#CC0000] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                </div>
            </div>
            {/* Ja/Nei toggle – own row below, label on the left */}
            <div className="flex items-center justify-end mt-2 gap-3">
                <span className="typo-label text-[#333333]/80">Skal påvirke innskutt kapital:</span>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => onUpdate(event.id, 'addToInvestedCapital', true)}
                        className={`${event.addToInvestedCapital ? 'bg-[#66CCDD] text-white border-[#66CCDD]' : 'bg-white text-[#333333] border-[#DDDDDD]'} px-3 py-1 text-xs font-medium rounded-full border transition-colors`}
                    >
                        Ja
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate(event.id, 'addToInvestedCapital', false)}
                        className={`${!event.addToInvestedCapital ? 'bg-[#66CCDD] text-white border-[#66CCDD]' : 'bg-white text-[#333333] border-[#DDDDDD]'} px-3 py-1 text-xs font-medium rounded-full border transition-colors`}
                    >
                        Nei
                    </button>
                </div>
            </div>
        </div>
    );
};

const CustomLegend = ({ items }) => (
    <div className="flex justify-center flex-wrap gap-x-12 gap-y-2 mt-4 text-[#333333]/90 text-sm">
        {items.map(item => (
            <div key={item.label} className="flex items-center">
                <div className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: item.color }}></div>
                <span>{item.label}</span>
            </div>
        ))}
    </div>
);

// Eye icon toggle for show/hide panels
const EyeToggle = ({ visible, onToggle, className, title }) => (
    <button
        onClick={onToggle}
        title={title || (visible ? 'Skjul' : 'Vis')}
        className={`absolute -top-4 -left-4 bg-white border border-[#DDDDDD] rounded-full p-1.5 shadow hover:bg-gray-50 text-[#002359] ${className || ''}`}
        aria-label={visible ? 'Skjul' : 'Vis'}
    >
        {visible ? (
            // Open eye
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        ) : (
            // Slashed eye
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94"></path>
                <path d="M1 1l22 22"></path>
                <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24"></path>
                <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.06 4.02"></path>
            </svg>
        )}
    </button>
);

// --- MAIN APP COMPONENT --- //
// TKontoDashboard component - wraps the standalone t-konto dashboard
function TKontoDashboard() {
    const containerRef = React.useRef(null);
    const scriptLoadedRef = React.useRef(false);
    const [showTKontoExportModal, setShowTKontoExportModal] = React.useState(false);
    const [tkontoExportImageUrl, setTKontoExportImageUrl] = React.useState(null);
    const [tkontoExportCopied, setTKontoExportCopied] = React.useState(false);
    const tkontoExportCanvasRef = React.useRef(null);

    // Ikke fang i useEffect når modal åpnes – fang i klikk-handler slik at layout er uendret

    const handleTKontoCopyImage = React.useCallback(() => {
        const canvas = tkontoExportCanvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => setTKontoExportCopied(true)).catch(() => {});
        }, 'image/png');
    }, []);

    React.useEffect(() => {
        if (!showTKontoExportModal) return;
        const onKey = (e) => { if (e.key === 'Escape') { setShowTKontoExportModal(false); setTKontoExportCopied(false); setTKontoExportImageUrl(null); } };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showTKontoExportModal]);

    React.useEffect(() => {
        const onExport = () => {
            setTKontoExportCopied(false);
            setTKontoExportImageUrl(null);
            // Bruk canvas-tegning med eksakte farger (PNG) – enklest å lime inn andre steder
            if (typeof window.renderTKontoChartToCanvas !== 'function') {
                setTKontoExportImageUrl('');
                setShowTKontoExportModal(true);
                return;
            }
            try {
                var canvas = window.renderTKontoChartToCanvas(1000, 520);
                tkontoExportCanvasRef.current = canvas;
                setTKontoExportImageUrl(canvas.toDataURL('image/png'));
                setShowTKontoExportModal(true);
            } catch (e) {
                setTKontoExportImageUrl('');
                setShowTKontoExportModal(true);
            }
        };
        document.addEventListener('tkonto-export-click', onExport);
        return () => document.removeEventListener('tkonto-export-click', onExport);
    }, []);

    React.useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        
        // Check if script is already loaded globally
        const isScriptAlreadyLoaded = window.initTKontoDashboard !== undefined || 
                                      document.querySelector('script[src="t-konto script.js"]') !== null;
        
        if (!isScriptAlreadyLoaded && !scriptLoadedRef.current) {
            // Create and append the script
            const script = document.createElement('script');
            script.src = 't-konto script.js';
            script.async = true;
            
            script.onload = () => {
                scriptLoadedRef.current = true;
                // Initialize immediately after script loads
                if (typeof window.initTKontoDashboard === 'function') {
                    window.initTKontoDashboard();
                }
            };

            script.onerror = () => {
                console.error('Failed to load t-konto script');
            };

            document.body.appendChild(script);
            scriptLoadedRef.current = true;
        } else {
            // Script is already loaded, just re-initialize
            // Use setTimeout to ensure DOM is ready and React has finished rendering
            setTimeout(() => {
                if (typeof window.initTKontoDashboard === 'function') {
                    window.initTKontoDashboard();
                }
            }, 100);
        }

        // No cleanup needed - we want to keep the script loaded for performance
    }, []);

    return (
        <div ref={containerRef} id="tkonto-dashboard-root" style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <div className="app" style={{ height: '100%', minHeight: '100%' }}>
                <aside className="sidebar" aria-label="Hovednavigasjon">
                    <nav className="nav" role="navigation">
                        <button className="nav-item is-active" data-section="Forside">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            <span className="nav-label">Forside</span>
                        </button>
                        <button className="nav-item" data-section="Struktur">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/><path d="M12 10v4M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </span>
                            <span className="nav-label">Familieforhold - organisering</span>
                        </button>
                        <button className="nav-item" data-section="Eiendeler">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
                            </span>
                            <span className="nav-label">Eiendeler</span>
                        </button>
                        <button className="nav-item" data-section="Gjeld">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M3 10H21" stroke="currentColor" strokeWidth="2"/></svg>
                            </span>
                            <span className="nav-label">Gjeld</span>
                        </button>
                        <button className="nav-item" data-section="Inntekter">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M8 13c1.2 1.8 3.2 3 5.5 3 1.9 0 3.5-1 3.5-2.5S15.4 11 13 11 9 9.9 9 8.5 10.6 6 12.5 6c1.8 0 3.3.8 4.3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </span>
                            <span className="nav-label">Inntekter</span>
                        </button>
                        <button className="nav-item" data-section="Kontantstrøm">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 7h8M8 12h8M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </span>
                            <span className="nav-label">Kontantstrøm</span>
                        </button>
                        <button className="nav-item" data-section="T-Konto">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 19V5" stroke="currentColor" strokeWidth="2"/><path d="M3 19h18" stroke="currentColor" strokeWidth="2"/><path d="M7 15l3-3 3 2 4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            <span className="nav-label">T-Konto</span>
                        </button>
                        <button className="nav-item" data-section="Tapsbærende evne">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l8 3v6c0 4.4-3 8.4-8 9-5-0.6-8-4.6-8-9V6l8-3Z" stroke="currentColor" strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            <span className="nav-label">Risikoevne</span>
                        </button>
                        <div className="nav-sep" aria-hidden="true"></div>
                        <button className="nav-item" data-section="Forventet avkastning">
                            <span className="nav-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 14l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            <span className="nav-label">Forventet avkastning</span>
                        </button>
                    </nav>
                </aside>

                <main className="content" role="main">
                    <div className="stepper" aria-label="Fremdrift">
                        <span id="sectionTitle" hidden>Eiendeler</span>
                        <ul id="stepper-list" className="stepper-list" role="list">
                            {/* Populeres av script.js */}
                        </ul>
                    </div>

                    <div className="panel panel-empty" aria-hidden="true">
                        <div className="pe-grid">
                            <div className="pe-item summary-card summary-assets" id="summary-assets-button" role="button" tabIndex="0">
                                <div className="summary-title">Eiendeler</div>
                                <div id="sum-assets" className="summary-value">0</div>
                            </div>
                            <div className="pe-item summary-card summary-debts" id="summary-development-button" role="button" tabIndex="0">
                                <div className="summary-title danger">Gjeld</div>
                                <div id="sum-debts" className="summary-value">0</div>
                            </div>
                            <div className="pe-item summary-card summary-equity" id="summary-financing-button" role="button" tabIndex="0">
                                <div className="summary-title success">Egenkapital</div>
                                <div id="sum-equity" className="summary-value">0</div>
                            </div>
                            <div className="pe-item summary-card summary-cash" id="summary-equity-return-button" role="button" tabIndex="0">
                                <div className="summary-title success-dark">Kontantstrøm</div>
                                <div id="sum-cashflow" className="summary-value">0</div>
                            </div>
                        </div>
                    </div>

                    <section className="content-body" aria-live="polite">
                        <div id="module-root"></div>
                    </section>
                </main>
            </div>

            <div id="gi-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="gi-title" hidden>
                <div className="modal-backdrop" data-close="true"></div>
                <div className="modal-panel gi-wide" role="document">
                    <button className="modal-close" aria-label="Lukk" data-close="true">×</button>
                    <div id="gi-chart" className="gi-chart" aria-live="polite"></div>
                </div>
            </div>

            <div id="financing-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="financing-title" hidden>
                <div className="modal-backdrop" data-close="true"></div>
                <div className="modal-panel gi-wide" role="document">
                    <button className="modal-close" aria-label="Lukk" data-close="true">×</button>
                    <div id="financing-chart" className="gi-chart" aria-live="polite"></div>
                </div>
            </div>

            <div id="equity-return-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="equity-return-title" hidden>
                <div className="modal-backdrop" data-close="true"></div>
                <div className="modal-panel gi-wide" role="document">
                    <button className="modal-close" aria-label="Lukk" data-close="true">×</button>
                    <div id="equity-return-chart" className="gi-chart" aria-live="polite"></div>
                </div>
            </div>

            <div id="total-capital-return-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="total-capital-return-title" hidden>
                <div className="modal-backdrop" data-close="true"></div>
                <div className="modal-panel gi-wide" role="document">
                    <button className="modal-close" aria-label="Lukk" data-close="true">×</button>
                    <h3 id="total-capital-return-title">Totalkapitalavkastning</h3>
                    <div id="total-capital-return-chart" className="gi-chart" aria-live="polite"></div>
                </div>
            </div>

            <div id="cashflow-forecast-modal" className="modal" role="dialog" aria-modal="true" aria-label="Kontantstrøm fremover" hidden>
                <div className="modal-backdrop" data-close="true"></div>
                <div className="modal-panel gi-wide" role="document">
                    <button className="modal-close" aria-label="Lukk" data-close="true">×</button>
                    <div id="cashflow-forecast-chart" className="gi-chart" aria-live="polite"></div>
                </div>
            </div>

            {showTKontoExportModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => { setShowTKontoExportModal(false); setTKontoExportCopied(false); setTKontoExportImageUrl(null); }}
                    style={{ zIndex: 9999 }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full p-6 relative flex flex-col items-center overflow-hidden"
                        style={{ maxWidth: '95vw', maxHeight: '90vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            aria-label="Lukk"
                            onClick={() => { setShowTKontoExportModal(false); setTKontoExportCopied(false); setTKontoExportImageUrl(null); }}
                            className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333] text-xl"
                        >
                            ✕
                        </button>
                        <h3 className="typo-h3 text-[#4A6D8C] mb-1">Grafikk for dokument</h3>
                        {tkontoExportImageUrl === null || tkontoExportImageUrl === undefined ? (
                            <p className="text-sm text-[#666] mb-4 text-center">Laster bilde…</p>
                        ) : tkontoExportImageUrl === '' ? (
                            <p className="text-sm text-[#666] mb-4 text-center">Åpne T-Konto-visningen i menyen til venstre (klikk på «T-Konto») for å eksportere grafikken.</p>
                        ) : (
                            <>
                                <p className="text-sm text-[#666] mb-4 text-center">
                                    Høyoppløst bilde for A4 Word. Klikk «Kopier bilde» og lim inn i dokumentet (Ctrl+V).
                                </p>
                                <div
                                    className="bg-[#f5f5f5] rounded-lg flex justify-center items-center overflow-hidden shrink-0"
                                    style={{
                                        maxHeight: 'min(65vh, calc((100vw - 4rem) * 1450 / 1880))',
                                        maxWidth: 'min(calc(100vw - 4rem), calc(65vh * 1880 / 1450))',
                                        aspectRatio: '1880/1450'
                                    }}
                                >
                                    <img
                                        src={tkontoExportImageUrl}
                                        alt="T-konto grafikken"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                    />
                                </div>
                                <div className="flex gap-3 mt-4 flex-wrap justify-center">
                                    <button
                                        type="button"
                                        onClick={handleTKontoCopyImage}
                                        className={tkontoExportCopied ? 'px-4 py-2 rounded-lg font-medium bg-green-600 text-white' : 'px-4 py-2 rounded-lg font-medium bg-[#4A6D8C] hover:opacity-90 text-white'}
                                    >
                                        {tkontoExportCopied ? '✓ Kopiert!' : 'Kopier bilde'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowTKontoExportModal(false); setTKontoExportCopied(false); setTKontoExportImageUrl(null); }}
                                        className="px-4 py-2 rounded-lg font-medium border border-[#DDDDDD] bg-white text-[#333333] hover:bg-gray-50"
                                    >
                                        Lukk
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Oppsummeringsrapport: fire containere – Mål og behov, Eiendeler år for år, Finansiering år for år, Kontantstrøm år for år
// Kontantstrøm år for år hentes alltid fra T-konto (fasit) – identisk med «Årlig kontantstrøm» i T-konto.
function OppsummeringsrapportContent({ activeTab = 0, oppsummeringsrapportTabIndex = 3 }) {
    const appState = MaalOgBehovState.appState || {};
    const investmentYears = Math.max(0, Number(appState.investmentYears ?? 10));
    const payoutYears = Math.max(0, Number(appState.payoutYears) || 0);
    const extraDisplayYear = payoutYears > 0 ? 1 : 0;
    const totalYears = investmentYears + payoutYears + extraDisplayYear;
    // T-konto sin tidslogikk:
    // - "start" skal være 1.jan 2026 (tilsvarer yearVal=2025 i T-konto beregninger)
    // - "2026" skal være ett år etter (yearVal=2026 i T-konto beregninger)
    const numericYearLabels = Array.from({ length: totalYears }, (_, i) => START_YEAR + i);
    const yearLabels = ["start", ...numericYearLabels];
    const yearVals = [START_YEAR - 1, ...numericYearLabels];

    const [tkontoLoaded, setTkontoLoaded] = useState(!!(typeof window !== 'undefined' && window.getTKontoAssetSegments));
    const [tkontoDataRefreshKey, setTkontoDataRefreshKey] = useState(0);
    const [reportMaalPanelTitle, setReportMaalPanelTitle] = useState(getMaalPanelTitle);

    useEffect(() => {
        const syncMaalPanelTitle = (e) => {
            const fromEvent = e && e.detail && e.detail.title != null ? String(e.detail.title).trim() : '';
            setReportMaalPanelTitle(fromEvent || getMaalPanelTitle());
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('maal-og-behov-panel-title-changed', syncMaalPanelTitle);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('maal-og-behov-panel-title-changed', syncMaalPanelTitle);
            }
        };
    }, []);

    useEffect(() => {
        if (activeTab === oppsummeringsrapportTabIndex) {
            setReportMaalPanelTitle(getMaalPanelTitle());
        }
    }, [activeTab, oppsummeringsrapportTabIndex]);

    useEffect(() => {
        if (tkontoLoaded || typeof window === 'undefined') return;
        if (window.getTKontoAssetSegments) {
            setTkontoLoaded(true);
            return;
        }
        if (document.querySelector('script[src*="t-konto"]')) {
            setTkontoLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 't-konto script.js';
        script.onload = () => setTkontoLoaded(true);
        script.onerror = () => setTkontoLoaded(false);
        document.body.appendChild(script);
    }, [tkontoLoaded]);

    // Oppdater når brukeren bytter til Oppsummeringsrapport-fanen (les da fra T-konto)
    useEffect(() => {
        if (activeTab === oppsummeringsrapportTabIndex) {
            setTkontoDataRefreshKey((k) => k + 1);
        }
    }, [activeTab, oppsummeringsrapportTabIndex]);

    // Oppdater når T-konto-data endres (f.eks. etter Input-paste eller redigering i T-konto)
    useEffect(() => {
        const handler = () => setTkontoDataRefreshKey((k) => k + 1);
        window.addEventListener('tkonto-data-changed', handler);
        return () => window.removeEventListener('tkonto-data-changed', handler);
    }, []);

    const chartOptionsBase = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false } },
        scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: SPWM_INK, font: { size: 12 } } },
            y: {
                stacked: true,
                grid: { color: SPWM_GRID },
                ticks: {
                    color: SPWM_INK,
                    callback: (value) => `${(value / 1000000).toLocaleString('nb-NO')} MNOK`,
                    font: { size: 12 }
                }
            }
        }
    }), []);

    // Tooltip-sum: legg alltid til et siste felt "sum" nederst i tooltipen
    const tooltipSumFooterCallback = useMemo(() => {
        return {
            callbacks: {
                footer: (tooltipItems) => {
                    const items = tooltipItems || [];
                    if (items.length === 0) return '';
                    const sum = items.reduce((acc, it) => {
                        const v = (typeof it.parsed?.y === 'number')
                            ? it.parsed.y
                            : Number(it.raw ?? it.parsed?.y ?? 0);
                        return acc + (isFinite(v) ? v : 0);
                    }, 0);
                    return `sum: ${formatCurrency(sum)}`;
                }
            }
        };
    }, []);

    const assetsAndFinancingOptions = useMemo(() => ({
        ...chartOptionsBase,
        plugins: {
            ...(chartOptionsBase.plugins || {}),
            tooltip: tooltipSumFooterCallback
        }
    }), [chartOptionsBase, tooltipSumFooterCallback]);

    const latestData = MaalOgBehovState.latestInvestmentChartData;
    const latestOptions = MaalOgBehovState.latestChartOptions;

    // Behold "start" på x-aksen i Oppsummeringsrapport (nå matcher vi også T-konto sin x-akse).
    const maalOgBehovChartDataForReport = useMemo(() => {
        if (!latestData || !latestData.labels || latestData.labels.length === 0) return latestData;
        return latestData;
    }, [latestData]);

    const assetsChartData = useMemo(() => {
        if (!tkontoLoaded || typeof window.getTKontoAssetSegments !== 'function') return null;
        const keys = [];
        const keyColors = {};
        yearVals.forEach((y) => {
            try {
                const segs = window.getTKontoAssetSegments(y);
                (segs || []).forEach((seg) => {
                    if (seg.key && keys.indexOf(seg.key) === -1) {
                        keys.push(seg.key);
                        keyColors[seg.key] = seg.color || '#999';
                    }
                });
            } catch (e) {}
        });
        const datasets = keys.map((key) => ({
            label: key,
            data: yearVals.map((y) => {
                try {
                    const segs = window.getTKontoAssetSegments(y);
                    const s = (segs || []).find((x) => x.key === key);
                    return s ? s.value : 0;
                } catch (e) {
                    return 0;
                }
            }),
            backgroundColor: keyColors[key],
            stack: 'stack',
            borderRadius: 4,
            borderSkipped: false
        }));
        return { labels: yearLabels, datasets };
    }, [tkontoLoaded, yearVals.join(','), tkontoDataRefreshKey]);

    const financingChartData = useMemo(() => {
        if (!tkontoLoaded || typeof window.getTKontoFinancingSegments !== 'function') return null;
        const keys = [];
        const keyColors = {};
        yearVals.forEach((y) => {
            try {
                const res = window.getTKontoFinancingSegments(y);
                (res.segments || []).forEach((seg) => {
                    if (seg.key && keys.indexOf(seg.key) === -1) {
                        keys.push(seg.key);
                        keyColors[seg.key] = seg.color || '#999';
                    }
                });
            } catch (e) {}
        });
        const datasets = keys.map((key) => ({
            label: key,
            data: yearVals.map((y) => {
                try {
                    const res = window.getTKontoFinancingSegments(y);
                    const s = (res.segments || []).find((x) => x.key === key);
                    return s ? s.value : 0;
                } catch (e) {
                    return 0;
                }
            }),
            backgroundColor: keyColors[key],
            stack: 'stack',
            borderRadius: 4,
            borderSkipped: false
        }));
        return { labels: yearLabels, datasets };
    }, [tkontoLoaded, yearVals.join(','), tkontoDataRefreshKey]);

    // Kontantstrøm år for år: alltid fra T-konto (getTKontoCashflowForYear) – identisk med T-konto «Årlig kontantstrøm»
    const cashflowChartData = useMemo(() => {
        if (!tkontoLoaded || typeof window.getTKontoCashflowForYear !== 'function') return null;
        let data = [];
        // Foretrukket: hent hele serien fra samme globale T-konto-kilde som waterfall bruker.
        if (typeof window.getTKontoCashflowSeriesForYears === 'function') {
            try {
                const series = window.getTKontoCashflowSeriesForYears(yearVals);
                if (Array.isArray(series) && series.length === yearVals.length) {
                    data = series.map((v) => Number(v) || 0);
                }
            } catch (e) {}
        }
        if (data.length !== yearVals.length) {
            data = yearVals.map((y) => {
                try {
                    if (typeof window.getTKontoCashflowBreakdownForYear === 'function') {
                        const breakdown = window.getTKontoCashflowBreakdownForYear(y);
                        return (breakdown && Number(breakdown.net)) || 0;
                    }
                    return window.getTKontoCashflowForYear(y) || 0;
                } catch (e) {
                    return 0;
                }
            });
        }
        return {
            labels: yearLabels,
            datasets: [{
                label: 'Kontantstrøm',
                data,
                backgroundColor: data.map((v) => v >= 0 ? 'rgba(10, 94, 220, 0.85)' : 'rgba(217, 45, 32, 0.85)'),
                borderRadius: 4,
                borderSkipped: false
            }]
        };
    }, [tkontoLoaded, yearVals.join(','), tkontoDataRefreshKey]);

    const cashflowOptions = useMemo(() => ({
        ...chartOptionsBase,
        scales: {
            ...chartOptionsBase.scales,
            y: {
                ...chartOptionsBase.scales.y,
                stacked: false,
                ticks: {
                    ...chartOptionsBase.scales.y.ticks,
                    callback: (value) => `${(value / 1000000).toLocaleString('nb-NO')} MNOK`
                }
            }
        }
    }), [chartOptionsBase]);

    return (
        <div className="fremtidige-verdier-tab w-full h-full min-h-0 overflow-auto box-border">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-6" style={{ paddingRight: '2rem' }}>
            <div className="relative">
                <div className="panel flex flex-col overflow-hidden w-full min-h-[368px]">
                    <h3 className="fv-panel-heading">{reportMaalPanelTitle}</h3>
                    <div className="relative h-[280px]">
                        {maalOgBehovChartDataForReport && latestOptions ? (
                            <Bar data={maalOgBehovChartDataForReport} options={{ ...latestOptions, maintainAspectRatio: false }} />
                        ) : (
                            <div className="flex items-center justify-center h-full fv-empty">Ingen data. Åpne Mål og behov først.</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative">
                <div className="panel flex flex-col overflow-hidden w-full min-h-[368px]">
                    <h3 className="fv-panel-heading">Eiendeler - fremtidige verdier</h3>
                    <div className="relative h-[280px]">
                        {assetsChartData ? (
                            <Bar data={assetsChartData} options={{ ...assetsAndFinancingOptions, maintainAspectRatio: false }} />
                        ) : (
                            <div className="flex items-center justify-center h-full fv-empty">{tkontoLoaded ? 'Ingen eiendeler' : 'Last T-konto for data'}</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative">
                <div className="panel flex flex-col overflow-hidden w-full min-h-[368px]">
                    <h3 className="fv-panel-heading">Finansiering - fremtidige verdier</h3>
                    <div className="relative h-[280px]">
                        {financingChartData ? (
                            <Bar data={financingChartData} options={{ ...assetsAndFinancingOptions, maintainAspectRatio: false }} />
                        ) : (
                            <div className="flex items-center justify-center h-full fv-empty">{tkontoLoaded ? 'Ingen finansiering' : 'Last T-konto for data'}</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative">
                <div className="panel flex flex-col overflow-hidden w-full min-h-[368px]">
                    <h3 className="fv-panel-heading">Kontantstrøm - fremtidige verdier</h3>
                    <div className="relative h-[280px]">
                        {cashflowChartData ? (
                            <Bar data={cashflowChartData} options={{ ...cashflowOptions, maintainAspectRatio: false }} />
                        ) : (
                            <div className="flex items-center justify-center h-full fv-empty">{tkontoLoaded ? 'Ingen kontantstrøm' : 'Last T-konto for data'}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}

/** Ikoner som speiler Lucide-målkortene i malsetninger (viewBox 24×24). */
function MalsetningerGoalIconSvg({ goalId }) {
    const p = {
        width: 14,
        height: 14,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
    };
    switch (goalId) {
        case 'bevare_formuen':
            return (
                <svg {...p}>
                    <circle cx="12" cy="5" r="3" />
                    <line x1="12" y1="22" x2="12" y2="8" />
                    <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
                </svg>
            );
        case 'pensjon':
            return (
                <svg {...p}>
                    <line x1="3" y1="22" x2="21" y2="22" />
                    <line x1="6" y1="18" x2="6" y2="11" />
                    <line x1="10" y1="18" x2="10" y2="11" />
                    <line x1="14" y1="18" x2="14" y2="11" />
                    <line x1="18" y1="18" x2="18" y2="11" />
                    <polygon points="12 2 20 7 4 7" />
                </svg>
            );
        case 'hjelpe_barn':
            return (
                <svg {...p}>
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
            );
        case 'generesjonsskifte':
            return (
                <svg {...p}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case 'okonomisk_trygghet':
            return (
                <svg {...p}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                </svg>
            );
        case 'formuesvekst':
            return (
                <svg {...p}>
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                </svg>
            );
        case 'fremtidige_investeringer':
            return (
                <svg {...p}>
                    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
            );
        case 'annet':
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                </svg>
            );
        default:
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="10" />
                </svg>
            );
    }
}

function StrategiGoalChip({ goal, index }) {
    const imp = Math.min(3, Math.max(1, Number(goal.importance) || 1));
    const delayMs = Math.min((index || 0) * 48, 320);
    return (
        <div
            className={`strategi-goal-chip strategi-goal-chip--i${imp}`}
            role="status"
            style={{ animationDelay: `${delayMs}ms` }}
        >
            <span className="strategi-goal-chip__icon">
                <MalsetningerGoalIconSvg goalId={goal.id} />
            </span>
            <span className="strategi-goal-chip__title">{goal.title}</span>
            <span className="strategi-goal-chip__sub">{goal.importanceLabel}</span>
        </div>
    );
}

function StrategiMalsetningerStrip({ goals }) {
    return (
        <div className="strategi-malsetninger-strip-outer">
            <div className="strategi-malsetninger-strip-card">
                <div className="strategi-malsetninger-strip__label">Målsetninger</div>
                <div className="strategi-malsetninger-strip__inner">
                    {goals.length === 0 ? (
                        <p className="strategi-malsetninger-strip__empty">
                            Ingen mål er markert ennå. Åpne fanen «Målsetninger» og trykk på målkortene du vil prioritere – de vises her automatisk.
                        </p>
                    ) : (
                        goals.map((g, i) => <StrategiGoalChip key={g.id} goal={g} index={i} />)
                    )}
                </div>
            </div>
        </div>
    );
}

// TabBar component for browser-like tabs
function TabBar({ tabs, activeTab, onTabClick, panelTitleLabel }) {
    const titleText = String(panelTitleLabel || '').trim();
    const tabBarRef = React.useRef(null);

    useEffect(() => {
        const el = tabBarRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (el.scrollWidth <= el.clientWidth) return;
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (!delta) return;
            e.preventDefault();
            el.scrollLeft += delta;
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    return (
        <div className="tab-bar-header">
            <div className="tab-bar-brand" aria-hidden="true">
                <img
                    className="tab-bar-brand-logo"
                    src="SPWM mal/assets/spwm-logo.svg"
                    alt=""
                    width="178"
                    height="34"
                />
            </div>
            <div className="tab-bar" ref={tabBarRef}>
                {tabs.map((tab, index) => (
                    <div
                        key={index}
                        className={`tab ${activeTab === index ? 'active' : ''}`}
                        title={tab.name}
                        onClick={() => onTabClick(index)}
                    >
                        <span>{tab.name}</span>
                    </div>
                ))}
            </div>
            {titleText ? (
                <div className="tab-bar-panel-title-slot">
                    <div
                        className="tab tab-bar-panel-title"
                        title={titleText}
                        aria-label={`Paneltittel: ${titleText}`}
                    >
                        <span>{titleText}</span>
                    </div>
                </div>
            ) : (
                <div className="tab-bar-panel-title-slot" aria-hidden="true" />
            )}
            <div className="tab-bar-header-end-spacer" aria-hidden="true" />
        </div>
    );
}

/**
 * Trekker ut første komplette JSON-objekt etter markør (balanserte { }; strengar og \" escapes).
 * Brukes når JSON ikkje ligg på éi linje, eller når «første linje»-klipping ville ha ødelagt parse.
 */
function extractJsonObjectAfterMarker(text, marker) {
    const raw = String(text || '');
    const idx = raw.indexOf(marker);
    if (idx < 0) return null;
    const braceStart = raw.indexOf('{', idx + marker.length);
    if (braceStart < 0) return null;
    let depth = 0;
    let inString = false;
    let esc = false;
    for (let i = braceStart; i < raw.length; i++) {
        const c = raw[i];
        if (inString) {
            if (esc) {
                esc = false;
                continue;
            }
            if (c === '\\') {
                esc = true;
                continue;
            }
            if (c === '"') inString = false;
            continue;
        }
        if (c === '"') {
            inString = true;
            continue;
        }
        if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) return raw.slice(braceStart, i + 1);
        }
    }
    return null;
}

/** Tom seksjon eller «ingen data» = alle felt på standardverdi. */
function isIngenDataText(text) {
    const t = String(text || '').replace(/^\uFEFF/, '').trim().toLowerCase();
    return !t || t === 'ingen data';
}

/**
 * Deler felles Output inn i seksjoner. Linjebasert parsing (kun linjer som heile er `--- Tittel ---`)
 * slik at innhold i T-konto, Malsetninger JSON osv. ikkje tilfeldig avkortar regex (lookahead).
 */
function splitStrategiExportIntoSections(fullRaw) {
    const text = String(fullRaw || '')
        .replace(/^\uFEFF/, '')
        .replace(/\u2028/g, '\n')
        .replace(/\u2029/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    const lines = text.split('\n');
    const buckets = {
        malsetninger: [],
        maal: [],
        tkonto: [],
        risiko: [],
        pensjonsgapet: [],
        formuesskatt: [],
        fremtidigeVerdier: []
    };
    const resolveSectionKey = (innerRaw) => {
        const inner = String(innerRaw || '').replace(/[\u00a0\u202f]/g, ' ').trim();
        const n = inner.replace(/[\u2013\u2014\u2212]/g, '-').trim();
        const lower = n.toLowerCase();
        if (lower === 'malsetninger') return 'malsetninger';
        if (lower === 't-konto') return 'tkonto';
        if (lower === 'mål og behov' || lower === 'maal og behov') return 'maal';
        if (lower === 'risikosimulering') return 'risiko';
        if (lower === 'pensjonsgapet' || lower === 'pensjon') return 'pensjonsgapet';
        if (lower === 'formuesskatt') return 'formuesskatt';
        if (lower === 'fremtidige verdier' || lower === 'gradvis implementering' || lower === 'oppsummeringsrapport') {
            return 'fremtidigeVerdier';
        }
        return null;
    };
    let current = null;
    let sawDelimiter = false;
    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();
        const dashNorm = trimmed.replace(/[\u2013\u2014\u2212]/g, '-');
        // Støtt både «--- Tittel ---» og typografiske enkle strekar etter normalisering: «- Tittel -»
        let m = dashNorm.match(/^-{3,}\s*(.+?)\s*-{3,}$/);
        if (!m) m = dashNorm.match(/^-+\s*(.+?)\s*-+$/);
        if (m) {
            const key = resolveSectionKey(m[1]);
            if (key) {
                current = key;
                sawDelimiter = true;
                continue;
            }
        }
        if (current) buckets[current].push(rawLine);
    }
    return {
        malsetninger: buckets.malsetninger.join('\n').trim(),
        maal: buckets.maal.join('\n').trim(),
        tkonto: buckets.tkonto.join('\n').trim(),
        risiko: buckets.risiko.join('\n').trim(),
        pensjonsgapet: buckets.pensjonsgapet.join('\n').trim(),
        formuesskatt: buckets.formuesskatt.join('\n').trim(),
        fremtidigeVerdier: buckets.fremtidigeVerdier.join('\n').trim(),
        hadDelimiter: sawDelimiter
    };
}

const DASHBOARD_ZOOM_STORAGE_KEY = 'dashboardManualZoom';
const DASHBOARD_ZOOM_MIN = 0.5;
const DASHBOARD_ZOOM_MAX = 2;

function clampDashboardZoom(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.min(DASHBOARD_ZOOM_MAX, Math.max(DASHBOARD_ZOOM_MIN, Math.round(n * 100) / 100));
}

function readStoredDashboardZoom() {
    try {
        return clampDashboardZoom(localStorage.getItem(DASHBOARD_ZOOM_STORAGE_KEY));
    } catch (_) {
        return 1;
    }
}

function persistDashboardZoom(zoom) {
    try {
        localStorage.setItem(DASHBOARD_ZOOM_STORAGE_KEY, String(clampDashboardZoom(zoom)));
    } catch (_) {}
}

function requestDashboardFullscreen(el) {
    if (!el) return Promise.reject(new Error('no element'));
    try {
        let result;
        if (typeof el.requestFullscreen === 'function') result = el.requestFullscreen();
        else if (typeof el.webkitRequestFullscreen === 'function') result = el.webkitRequestFullscreen();
        else if (typeof el.msRequestFullscreen === 'function') result = el.msRequestFullscreen();
        else return Promise.reject(new Error('fullscreen unsupported'));
        return result && typeof result.then === 'function' ? result : Promise.resolve(result);
    } catch (err) {
        return Promise.reject(err);
    }
}

function exitDashboardFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (typeof document.exitFullscreen === 'function') return document.exitFullscreen();
        if (typeof document.webkitExitFullscreen === 'function') return document.webkitExitFullscreen();
    }
    return Promise.resolve();
}

function getDashboardFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}

// TabContainer component that manages tabs and content – felles Input/Output for alle faner
function TabContainer() {
    // Fanerekkefolge: 0 malsetninger, 1 T-konto, 2 Maal og behov, 3 Fremtidige verdier, 4 Risikoprofil, 5 Formuesskatt, 6 Strategi
    const STRATEGI_TAB_INDEX = 6;
    const [activeTab, setActiveTab] = useState(1);
    const [showOutputModal, setShowOutputModal] = useState(false);
    const [outputText, setOutputText] = useState('');
    const [showInputModal, setShowInputModal] = useState(false);
    const [inputText, setInputText] = useState('');
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [manualZoom, setManualZoom] = useState(readStoredDashboardZoom);
    const malsetningerIframeRef = React.useRef(null);
    /** Når bruker limer Input før Målsetninger-iframe har mountet API-et, lagres payload her og brukes ved onLoad / retry. */
    const pendingMalsetningerPayloadRef = React.useRef(null);
    const risikoIframeRef = React.useRef(null);
    const formuesskattIframeRef = React.useRef(null);
    const [strategiMalsetningerGoals, setStrategiMalsetningerGoals] = useState([]);
    const [panelTitle, setPanelTitle] = useState(getMaalPanelTitle);

    useEffect(() => {
        notifyMaalPanelTitleChanged(panelTitle);
    }, [panelTitle]);

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!getDashboardFullscreenElement());
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
        };
    }, []);

    useLayoutEffect(() => {
        document.documentElement.style.setProperty('--dashboard-zoom', String(manualZoom));
        window.dispatchEvent(new Event('resize'));
    }, [manualZoom]);

    const setManualZoomAndPersist = useCallback((next) => {
        const zoom = clampDashboardZoom(next);
        setManualZoom(zoom);
        persistDashboardZoom(zoom);
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
                e.preventDefault();
                setManualZoomAndPersist(manualZoom + 0.05);
            } else if (e.key === '-' || e.code === 'NumpadSubtract') {
                e.preventDefault();
                setManualZoomAndPersist(manualZoom - 0.05);
            } else if (e.key === '0' || e.code === 'Numpad0') {
                e.preventDefault();
                setManualZoomAndPersist(1);
            }
        };
        const onWheel = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            const step = e.deltaY < 0 ? 0.05 : -0.05;
            setManualZoomAndPersist(manualZoom + step);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('wheel', onWheel);
        };
    }, [manualZoom, setManualZoomAndPersist]);

    const toggleFullscreen = useCallback(() => {
        if (!getDashboardFullscreenElement()) {
            requestDashboardFullscreen(document.documentElement).catch(() => {});
        } else {
            exitDashboardFullscreen().catch(() => {});
        }
    }, []);

    const tryApplyPendingMalsetninger = React.useCallback(() => {
        const p = pendingMalsetningerPayloadRef.current;
        if (!p || !String(p).trim()) {
            pendingMalsetningerPayloadRef.current = null;
            return 'empty';
        }
        const win = malsetningerIframeRef.current && malsetningerIframeRef.current.contentWindow;
        if (!win || typeof win.MalsetningerApplyExportText !== 'function') {
            return 'retry';
        }
        try {
            const ok = win.MalsetningerApplyExportText(p);
            pendingMalsetningerPayloadRef.current = null;
            return ok ? 'ok' : 'bad';
        } catch (_) {
            pendingMalsetningerPayloadRef.current = null;
            return 'bad';
        }
    }, []);

    const schedulePendingMalsetningerFlush = React.useCallback(() => {
        let attempts = 0;
        const maxAttempts = 50;
        const delayMs = 80;
        const tick = () => {
            const r = tryApplyPendingMalsetninger();
            if (r !== 'retry' || attempts >= maxAttempts) return;
            attempts += 1;
            window.setTimeout(tick, delayMs);
        };
        tick();
    }, [tryApplyPendingMalsetninger]);

    const refreshStrategiGoalsFromMalsetninger = useCallback(() => {
        try {
            const win = malsetningerIframeRef.current && malsetningerIframeRef.current.contentWindow;
            if (!win || typeof win.MalsetningerGetSelectedGoalsForDashboard !== 'function') {
                setStrategiMalsetningerGoals([]);
                return;
            }
            const raw = win.MalsetningerGetSelectedGoalsForDashboard();
            setStrategiMalsetningerGoals(Array.isArray(raw) ? raw : []);
        } catch (_) {
            setStrategiMalsetningerGoals([]);
        }
    }, []);

    const onMalsetningerIframeLoad = useCallback(() => {
        schedulePendingMalsetningerFlush();
        refreshStrategiGoalsFromMalsetninger();
    }, [schedulePendingMalsetningerFlush, refreshStrategiGoalsFromMalsetninger]);

    useEffect(() => {
        window.MaalOgBehovOnMalsetningerGoalsChanged = refreshStrategiGoalsFromMalsetninger;
        return () => {
            if (window.MaalOgBehovOnMalsetningerGoalsChanged === refreshStrategiGoalsFromMalsetninger) {
                delete window.MaalOgBehovOnMalsetningerGoalsChanged;
            }
        };
    }, [refreshStrategiGoalsFromMalsetninger]);

    useEffect(() => {
        if (activeTab === STRATEGI_TAB_INDEX) {
            refreshStrategiGoalsFromMalsetninger();
        }
    }, [activeTab, refreshStrategiGoalsFromMalsetninger]);

    const tabs = [
        {
            name: 'Målsetninger',
            content: (
                <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
                    <iframe
                        ref={malsetningerIframeRef}
                        onLoad={onMalsetningerIframeLoad}
                        src="malsetninger%20index.html"
                        title="Målsetninger, kunnskap og erfaring"
                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    />
                </div>
            ),
        },
        { name: 'T-konto', content: <TKontoDashboard /> },
        { name: 'Mål og behov', content: <App panelTitle={panelTitle} onPanelTitleChange={setPanelTitle} /> },
        { name: 'Fremtidige verdier', content: <OppsummeringsrapportContent activeTab={activeTab} oppsummeringsrapportTabIndex={3} /> },
        { name: 'Risikoprofil', content: <div style={{ width: '100%', height: '100%', minHeight: 0 }}><iframe ref={risikoIframeRef} src="risikosimulering%20index.html" title="Risikoprofil" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} /></div> },
        { name: 'Formuesskatt', content: <div style={{ width: '100%', height: '100%', minHeight: 0 }}><iframe ref={formuesskattIframeRef} src="formuesskatt%20index.html?v=primar-innslag-14mnok" title="Formuesskatt" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} /></div> },
        {
            name: 'Strategi',
            content: (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--gray-50)',
                    }}
                >
                    <StrategiMalsetningerStrip goals={strategiMalsetningerGoals} />
                    <iframe
                        src="Strategi%20index.html"
                        title="Strategi"
                        style={{
                            flex: 1,
                            minHeight: 0,
                            width: '100%',
                            border: 'none',
                            display: 'block',
                        }}
                    />
                </div>
            ),
        },
    ];

    const INGEN_DATA = 'ingen data';
    const buildCombinedOutput = React.useCallback(() => {
        let malsetninger = INGEN_DATA;
        try {
            const win = malsetningerIframeRef.current && malsetningerIframeRef.current.contentWindow;
            if (win && typeof win.MalsetningerGetExportText === 'function') {
                const txt = win.MalsetningerGetExportText();
                malsetninger = (txt && String(txt).trim()) ? txt : INGEN_DATA;
            }
        } catch (_) {}
        const maalRaw = (MaalOgBehovState.getOutputText && MaalOgBehovState.getOutputText()) || '';
        const tkontoRaw = (typeof window.TKontoGenerateOutputText === 'function' && window.TKontoGenerateOutputText()) || '';
        const maal = (maalRaw && String(maalRaw).trim()) ? maalRaw : INGEN_DATA;
        const tkonto = (tkontoRaw && String(tkontoRaw).trim()) ? tkontoRaw : INGEN_DATA;
        let risiko = INGEN_DATA;
        try {
            const win = risikoIframeRef.current && risikoIframeRef.current.contentWindow;
            if (win && typeof win.RisikoSimuleringGetExportText === 'function') {
                const t = win.RisikoSimuleringGetExportText();
                risiko = (t && String(t).trim()) ? t.trim() : INGEN_DATA;
            } else if (win && typeof win.RisikoSimuleringGetOutputData === 'function') {
                const data = win.RisikoSimuleringGetOutputData();
                if (data && typeof data.exportText === 'string' && data.exportText.trim()) {
                    risiko = data.exportText.trim();
                }
            }
        } catch (_) {}
        let formuesskatt = INGEN_DATA;
        try {
            const win = formuesskattIframeRef.current && formuesskattIframeRef.current.contentWindow;
            if (win && typeof win.FormuesskattGetOutputText === 'function') {
                const txt = win.FormuesskattGetOutputText();
                formuesskatt = (txt && String(txt).trim()) ? txt : INGEN_DATA;
            }
        } catch (_) {}
        const fremtidigeVerdier = '1 : Merknad : Utledet fra Mål og behov + T-konto (ingen egen lagring i denne fanen).';
        // Pensjonsfanen er fjernet: ikke skriv --- Pensjon --- / --- Pensjonsgapet ---.
        // Input parserer fortsatt de seksjonene i gamle eksporter (ignoreres, uten feil).
        return [
            '--- Malsetninger ---',
            malsetninger,
            '',
            '--- T-konto ---',
            tkonto,
            '',
            '--- Mål og behov ---',
            maal,
            '',
            '--- Fremtidige verdier ---',
            fremtidigeVerdier,
            '',
            '--- Risikosimulering ---',
            risiko,
            '',
            '--- Formuesskatt ---',
            formuesskatt
        ].join('\n');
    }, []);

    const handleOpenOutput = React.useCallback(() => {
        setOutputText(buildCombinedOutput());
        setShowOutputModal(true);
    }, [buildCombinedOutput]);

    const handleCopyOutput = React.useCallback(async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(outputText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                const ta = document.createElement('textarea');
                ta.value = outputText;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
            }
        } catch (_) {
            alert('Kunne ikke kopiere til utklippstavlen.');
        }
    }, [outputText]);

    const handleOpenInput = React.useCallback(() => {
        setInputText('');
        setShowInputModal(true);
    }, []);

    const handleLoadInput = React.useCallback(() => {
        if (!inputText.trim()) {
            alert('Vennligst lim inn informasjon fra Output.');
            return;
        }
        const full = String(inputText.trim())
            .replace(/^\uFEFF/, '')
            .replace(/\u2028/g, '\n')
            .replace(/\u2029/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        const split = splitStrategiExportIntoSections(full);
        const sections = {
            malsetninger: split.malsetninger,
            maal: split.maal,
            tkonto: split.tkonto,
            risiko: split.risiko,
            pensjonsgapet: split.pensjonsgapet,
            formuesskatt: split.formuesskatt,
            fremtidigeVerdier: split.fremtidigeVerdier
        };
        if (!split.hadDelimiter) {
            sections.maal = full;
        } else if (!sections.maal && !sections.tkonto && !sections.risiko && !sections.pensjonsgapet && !sections.formuesskatt && !sections.fremtidigeVerdier && !sections.malsetninger) {
            sections.maal = full;
        }
        const warnings = [];
        const waitForTkontoParse = () => new Promise((resolve) => {
            const text = sections.tkonto;
            if (!text) {
                if (split.hadDelimiter && typeof window.TKontoParseInputText === 'function') {
                    try { window.TKontoParseInputText('ingen data'); } catch (_) {}
                }
                resolve();
                return;
            }
            let attempts = 0;
            const maxAttempts = 50;
            const tick = () => {
                if (typeof window.TKontoParseInputText === 'function') {
                    try {
                        const ok = window.TKontoParseInputText(text);
                        if (!ok) warnings.push('T-konto: ingen gyldige nummererte feltlinjer — kopier på nytt fra Output (eldre lim kan inneholde «T-konto state (json):»).');
                        if (ok && typeof window.TKontoRefreshAfterInputLoad === 'function') {
                            try { window.TKontoRefreshAfterInputLoad(); } catch (e2) { console.warn('TKontoRefreshAfterInputLoad', e2); }
                        }
                    } catch (e) {
                        console.error(e);
                        warnings.push('T-konto: feil ved import – ' + (e && e.message ? e.message : String(e)));
                    }
                    resolve();
                    return;
                }
                attempts++;
                if (attempts >= maxAttempts) {
                    warnings.push('T-konto: skript ikke ferdig lastet. Åpne T-konto-fanen, vent ett sekund, og trykk «Last inn» igjen.');
                    resolve();
                    return;
                }
                setTimeout(tick, 60);
            };
            tick();
        });

        (async () => {
            try {
                const malsetningerPayload = sections.malsetninger || (split.hadDelimiter ? 'ingen data' : '');
                if (malsetningerPayload) {
                    pendingMalsetningerPayloadRef.current = malsetningerPayload;
                    const mr = tryApplyPendingMalsetninger();
                    if (mr === 'retry') schedulePendingMalsetningerFlush();
                    if (mr === 'bad') {
                        warnings.push('Målsetninger: innlimingen ble ikke gjenkjent (sjekk nummererte linjer eller eldre «Malsetninger state (json):»).');
                    }
                }
                const maalPayload = sections.maal || (split.hadDelimiter ? 'ingen data' : '');
                if (maalPayload) {
                    if (typeof MaalOgBehovState.applyInputText !== 'function') {
                        warnings.push('Mål og behov: intern import er ikke klar – oppdater siden og prøv igjen.');
                    } else {
                        const maalOk = MaalOgBehovState.applyInputText(maalPayload);
                        if (!maalOk) {
                            warnings.push('Mål og behov: ingen felt ble oppdatert (ugyldig format eller tom seksjon — forvent linjer 1–37 eller eldre «Maal og behov state (json):»).');
                        }
                    }
                }
                await waitForTkontoParse();
                if (malsetningerPayload && pendingMalsetningerPayloadRef.current) {
                    const mr2 = tryApplyPendingMalsetninger();
                    if (mr2 === 'retry') {
                        warnings.push('Målsetninger: fanen svarer ikke ennå – vent litt, åpne Målsetninger-fanen og prøv «Last inn» igjen.');
                    }
                    if (mr2 === 'bad') {
                        warnings.push('Målsetninger: innlimingen ble ikke gjenkjent (sjekk nummererte linjer eller eldre «Malsetninger state (json):»).');
                    }
                }
                const risikoPayload = sections.risiko || (split.hadDelimiter ? 'ingen data' : '');
                if (risikoPayload && risikoIframeRef.current && risikoIframeRef.current.contentWindow) {
                    try { risikoIframeRef.current.contentWindow.postMessage({ type: 'LOAD_INPUT', payload: risikoPayload }, '*'); } catch (_) {}
                }
                const formuesskattPayload = sections.formuesskatt || (split.hadDelimiter ? 'ingen data' : '');
                if (formuesskattPayload && formuesskattIframeRef.current && formuesskattIframeRef.current.contentWindow) {
                    try {
                        const win = formuesskattIframeRef.current.contentWindow;
                        if (typeof win.FormuesskattApplyInputText === 'function') win.FormuesskattApplyInputText(formuesskattPayload);
                    } catch (_) {}
                }
                if (warnings.length) {
                    alert(warnings.join('\n'));
                }
                setShowInputModal(false);
                setInputText('');
            } catch (e) {
                alert('Kunne ikke lese inn data. Sjekk at formatet er riktig.');
                console.error(e);
            }
        })();
    }, [inputText, tryApplyPendingMalsetninger, schedulePendingMalsetningerFlush]);

    React.useEffect(() => {
        if (!showOutputModal) return;
        const onKey = (e) => { if (e.key === 'Escape') setShowOutputModal(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showOutputModal]);
    React.useEffect(() => {
        if (!showInputModal) return;
        const onKey = (e) => { if (e.key === 'Escape') setShowInputModal(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showInputModal]);

    return (
        <div className="tab-container">
            <div className="dashboard-zoom-viewport">
                <div className="dashboard-zoom-inner">
                    <TabBar
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabClick={setActiveTab}
                        panelTitleLabel={panelTitle}
                    />
                    <div className="tab-content" style={{ position: 'relative' }}>
                        {tabs.map((tab, index) => (
                            <div key={index} style={{ display: activeTab === index ? 'block' : 'none', width: '100%', height: '100%', minHeight: 0, overflow: 'auto' }}>
                                {tab.content}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Felles Input/Output – synlige på alle faner */}
            <button
                type="button"
                className="fixed bottom-4 z-[100] px-3 py-1.5 text-xs font-medium rounded-full bg-slate-700/70 hover:bg-slate-700 text-slate-200 border border-slate-600/70 shadow-sm transition-colors"
                style={{ left: '1rem' }}
                onClick={handleOpenInput}
                aria-label="Input"
            >
                Input
            </button>
            <button
                type="button"
                className="fixed bottom-4 z-[100] px-3 py-1.5 text-xs font-medium rounded-full bg-slate-700/70 hover:bg-slate-700 text-slate-200 border border-slate-600/70 shadow-sm transition-colors"
                style={{ right: '4rem' }}
                onClick={handleOpenOutput}
                aria-label="Output"
            >
                Output
            </button>
            <button
                type="button"
                className="dashboard-chrome-fullscreen fixed z-[100] flex items-center justify-center rounded-md bg-slate-700/70 hover:bg-slate-700 text-slate-200 border border-slate-600/70 shadow-sm transition-colors"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
                title={isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
            >
                {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                )}
            </button>
            {showInputModal && (
                <div className="fixed inset-0 z-[101] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowInputModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <button type="button" aria-label="Lukk" onClick={() => setShowInputModal(false)} className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]">✕</button>
                        <h3 className="typo-h3 text-[#4A6D8C] mb-4">Input – gjelder alle faner</h3>
                        <p className="text-sm text-[#666] mb-2">Lim inn tekst fra Output. Seksjoner skilles med <code className="text-xs bg-slate-100 px-1 rounded">--- Malsetninger ---</code> osv. T-konto består av nummererte linjer (<code className="text-xs bg-slate-100 px-1 rounded">1: Feltnavn: verdi</code>). Gamle eksporter kan også inneholde <code className="text-xs bg-slate-100 px-1 rounded">T-konto state (json):</code> — den lastes fortsatt inn om den finnes.</p>
                        <textarea
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            placeholder="Lim inn output-teksten her..."
                            className="output-textarea w-full min-h-[22rem] h-96 max-h-[70vh] bg-white border border-[#DDDDDD] rounded-md p-3 text-[#333333] whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent"
                        />
                        <button type="button" onClick={handleLoadInput} className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Last inn</button>
                    </div>
                </div>
            )}
            {showOutputModal && (
                <div className="fixed inset-0 z-[101] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowOutputModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <button type="button" aria-label="Lukk" onClick={() => setShowOutputModal(false)} className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]">✕</button>
                        <h3 className="typo-h3 text-[#4A6D8C] mb-4">Output – alle faner</h3>
                        <p className="text-sm text-[#666] mb-2">Nummererte feltlinjer per fane. Tom linje mellom seksjoner. Gamle eksporter med <code className="text-xs bg-slate-100 px-1 rounded">Maal og behov state (json):</code> / <code className="text-xs bg-slate-100 px-1 rounded">state (json)</code> for enkelte faner lastes fortsatt inn. Kopier og bruk «Input» for å laste inn.</p>
                        <div className="relative">
                            <textarea readOnly value={outputText} className="output-textarea w-full h-64 bg-white border border-[#DDDDDD] rounded-md p-3 text-[#333333] whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent pr-24" />
                            <button type="button" onClick={handleCopyOutput} className={`copy-btn absolute bottom-3 right-3 inline-flex gap-2 px-3 py-1.5 text-xs font-medium rounded-full border shadow-sm ${copied ? 'bg-green-600 hover:bg-green-700 text-white border-green-500/80' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500/80'}`}>
                                {copied ? '✓ Kopiert!' : 'Kopier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function App({ panelTitle, onPanelTitleChange }) {
    const resolvedPanelTitle = panelTitle != null ? panelTitle : getMaalPanelTitle();
    const setPanelTitle = (next) => {
        if (typeof onPanelTitleChange === 'function') {
            onPanelTitleChange(next);
        }
    };
    // Bruk lagret state hvis den finnes, ellers bruk initial state
    const [state, setState] = useState(() => {
        return MaalOgBehovState.appState ? { ...INITIAL_APP_STATE, ...MaalOgBehovState.appState } : INITIAL_APP_STATE;
    });
    const [showDistributionGraphic, setShowDistributionGraphic] = useState(MaalOgBehovState.showDistributionGraphic);
    const [showStockPortionGraphic, setShowStockPortionGraphic] = useState(MaalOgBehovState.showStockPortionGraphic);
    const [showInvestedCapitalGraphic, setShowInvestedCapitalGraphic] = useState(MaalOgBehovState.showInvestedCapitalGraphic);
    const [showGoalSeek, setShowGoalSeek] = useState(MaalOgBehovState.showGoalSeek);
    // Disclaimer er fjernet fra UI. Vi holder den alltid av for å hindre modal-rendering.
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const titleInputRef = React.useRef(null);
    const titleBeforeEditRef = React.useRef(resolvedPanelTitle);
    const [showOutputModal, setShowOutputModal] = useState(MaalOgBehovState.showOutputModal);
    const [outputText, setOutputText] = useState(MaalOgBehovState.outputText);
    const [copied, setCopied] = useState(MaalOgBehovState.copied);
    const [showInputModal, setShowInputModal] = useState(MaalOgBehovState.showInputModal);
    const [inputText, setInputText] = useState(MaalOgBehovState.inputText);
    const [showLoanImportModal, setShowLoanImportModal] = useState(false);
    const [loanImportText, setLoanImportText] = useState('');
    const [showAssumptionsGraphic, setShowAssumptionsGraphic] = useState(MaalOgBehovState.showAssumptionsGraphic);
    const [showSimulation, setShowSimulation] = useState(MaalOgBehovState.showSimulation);
    const [showAccumulatedReturn, setShowAccumulatedReturn] = useState(MaalOgBehovState.showAccumulatedReturn);
    const [showMonteCarlo, setShowMonteCarlo] = useState(MaalOgBehovState.showMonteCarlo);
    const [monteCarloKey, setMonteCarloKey] = useState(MaalOgBehovState.monteCarloKey);
    const [showMonteCarloPortfolio, setShowMonteCarloPortfolio] = useState(MaalOgBehovState.showMonteCarloPortfolio);
    const [monteCarloPortfolioKey, setMonteCarloPortfolioKey] = useState(MaalOgBehovState.monteCarloPortfolioKey);
    const [showMonteCarloStockAllocation, setShowMonteCarloStockAllocation] = useState(MaalOgBehovState.showMonteCarloStockAllocation);
    const [monteCarloStockAllocationKey, setMonteCarloStockAllocationKey] = useState(MaalOgBehovState.monteCarloStockAllocationKey);
    const [simButtonActive, setSimButtonActive] = useState(MaalOgBehovState.simButtonActive);
    const [spToolButtonMarked, setSpToolButtonMarked] = useState(false);
    const [utbToolButtonMarked, setUtbToolButtonMarked] = useState(false);
    const [portToolButtonMarked, setPortToolButtonMarked] = useState(false);
    const [simulationKey, setSimulationKey] = useState(MaalOgBehovState.simulationKey);
    const [savedSimulatedReturns, setSavedSimulatedReturns] = useState(MaalOgBehovState.savedSimulatedReturns);
    const [advisoryInputValue, setAdvisoryInputValue] = useState(MaalOgBehovState.advisoryInputValue);
    const [waterfallMode, setWaterfallMode] = useState(MaalOgBehovState.waterfallMode);
    const portBeforeGoalSeekRef = React.useRef(null);
    /** Lagrer uttak/målsøk-felt før første «Utb.»-trykk; gjenopprettes ved av. */
    const utbBeforeGoalSeekRef = React.useRef(null);
    const [showChartImageModal, setShowChartImageModal] = useState(false);
    const [chartImageCopied, setChartImageCopied] = useState(false);
    const chartExportCanvasRef = React.useRef(null);

    // Last t-konto-script tidlig slik at getTKontoDagensÅrslønn m.m. finnes for Formuesskatt
    useEffect(() => {
        if (document.querySelector('script[src*="t-konto"]')) return;
        if (typeof window.getTKontoDagensÅrslønn === 'function') return;
        const script = document.createElement('script');
        script.src = 't-konto script.js';
        script.async = true;
        document.body.appendChild(script);
    }, []);

    // Lagre state til global state holder når den endres
    useEffect(() => {
        MaalOgBehovState.appState = { ...state };
        // Summen Portefølje I + Portefølje II + Likviditetsfond (2026) – brukes av T-konto Eiendeler «Investeringer Mål og behov» og Risikosimulering
        const sum2026 = (state.initialPortfolioSize || 0) + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        try {
            sessionStorage.setItem('maalOgBehovSum2026', String(Math.round(sum2026)));
            sessionStorage.setItem('maalOgBehovAksjeandelP1', String(state.row1StockAllocation ?? 0));
        } catch (e) {}
    }, [state]);


    useEffect(() => {
        MaalOgBehovState.showDistributionGraphic = showDistributionGraphic;
    }, [showDistributionGraphic]);

    useEffect(() => {
        MaalOgBehovState.showStockPortionGraphic = showStockPortionGraphic;
    }, [showStockPortionGraphic]);

    useEffect(() => {
        MaalOgBehovState.showInvestedCapitalGraphic = showInvestedCapitalGraphic;
    }, [showInvestedCapitalGraphic]);

    useEffect(() => {
        MaalOgBehovState.showGoalSeek = showGoalSeek;
    }, [showGoalSeek]);

    useEffect(() => {
        titleBeforeEditRef.current = resolvedPanelTitle;
    }, [resolvedPanelTitle]);

    useEffect(() => {
        if (editingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [editingTitle]);

    useEffect(() => {
        MaalOgBehovState.showOutputModal = showOutputModal;
    }, [showOutputModal]);

    useEffect(() => {
        MaalOgBehovState.outputText = outputText;
    }, [outputText]);

    useEffect(() => {
        MaalOgBehovState.copied = copied;
    }, [copied]);

    useEffect(() => {
        MaalOgBehovState.showInputModal = showInputModal;
    }, [showInputModal]);

    useEffect(() => {
        MaalOgBehovState.inputText = inputText;
    }, [inputText]);

    useEffect(() => {
        MaalOgBehovState.showAssumptionsGraphic = showAssumptionsGraphic;
    }, [showAssumptionsGraphic]);

    useEffect(() => {
        MaalOgBehovState.showSimulation = showSimulation;
    }, [showSimulation]);

    useEffect(() => {
        MaalOgBehovState.showAccumulatedReturn = showAccumulatedReturn;
    }, [showAccumulatedReturn]);

    useEffect(() => {
        MaalOgBehovState.showMonteCarlo = showMonteCarlo;
    }, [showMonteCarlo]);

    useEffect(() => {
        MaalOgBehovState.monteCarloKey = monteCarloKey;
    }, [monteCarloKey]);

    useEffect(() => {
        MaalOgBehovState.showMonteCarloPortfolio = showMonteCarloPortfolio;
    }, [showMonteCarloPortfolio]);

    useEffect(() => {
        MaalOgBehovState.monteCarloPortfolioKey = monteCarloPortfolioKey;
    }, [monteCarloPortfolioKey]);

    useEffect(() => {
        MaalOgBehovState.showMonteCarloStockAllocation = showMonteCarloStockAllocation;
    }, [showMonteCarloStockAllocation]);

    useEffect(() => {
        MaalOgBehovState.monteCarloStockAllocationKey = monteCarloStockAllocationKey;
    }, [monteCarloStockAllocationKey]);

    useEffect(() => {
        MaalOgBehovState.simButtonActive = simButtonActive;
    }, [simButtonActive]);

    useEffect(() => {
        MaalOgBehovState.simulationKey = simulationKey;
    }, [simulationKey]);

    useEffect(() => {
        MaalOgBehovState.savedSimulatedReturns = savedSimulatedReturns;
    }, [savedSimulatedReturns]);

    useEffect(() => {
        MaalOgBehovState.advisoryInputValue = advisoryInputValue;
    }, [advisoryInputValue]);

    useEffect(() => {
        MaalOgBehovState.waterfallMode = waterfallMode;
    }, [waterfallMode]);

    useEffect(() => {
        MaalOgBehovState.spToolButtonMarked = spToolButtonMarked;
    }, [spToolButtonMarked]);

    useEffect(() => {
        MaalOgBehovState.utbToolButtonMarked = utbToolButtonMarked;
    }, [utbToolButtonMarked]);

    useEffect(() => {
        MaalOgBehovState.portToolButtonMarked = portToolButtonMarked;
    }, [portToolButtonMarked]);

    // Beregn vektet aksjeandel ved start basert på tre porteføljer
    const computeInitialStockPct = useCallback((s) => {
        const p1 = Math.max(0, s.initialPortfolioSize || 0); // Portefølje I
        const p2 = Math.max(0, s.pensionPortfolioSize || 0); // Portefølje II
        const lf = Math.max(0, s.additionalPensionAmount || 0); // Likviditetsfond (100% renter)
        const total = p1 + p2 + lf;
       
        // Hvis alle porteføljene er 0, men det er sparing, beregn vektet gjennomsnitt basert på aksjeandelene
        // Vi antar at sparingen skal plasseres iht. de tre porteføljenes aksjeandeler
        if (total <= 0) {
            // Hvis alle porteføljene er 0, bruk vektet gjennomsnitt av aksjeandelene
            // Vektet basert på hvor sparingen skal plasseres (antar jevn fordeling mellom de tre)
            // Men siden alle er 0, bruker vi bare gjennomsnittet av aksjeandelene
            const r1 = s.row1StockAllocation || 0;
            const r2 = s.row2StockAllocation || 0;
            const r3 = 0; // Likviditetsfond er alltid 0% aksjer
           
            // Hvis det er sparing, beregn vektet gjennomsnitt basert på aksjeandelene
            // Antar at sparingen skal plasseres iht. de tre porteføljenes aksjeandeler
            // Siden alle porteføljene er 0, bruker vi gjennomsnittet av aksjeandelene
            // (antar at sparingen skal plasseres jevnt mellom de tre porteføljene)
            return Math.round((r1 + r2 + r3) / 3);
        }
       
        const wStock = (p1 * (s.row1StockAllocation || 0)) + (p2 * (s.row2StockAllocation || 0)) + (lf * 0);
        return Math.round(wStock / total);
    }, []);

    const handleStateChange = useCallback((id, value) => {
        setState(prevState => {
            const newState = { ...prevState, [id]: value };
            newState.goalSeekPayoutDrainFinalYear = false;
            // Vektet aksjeandel ved start fra Portefølje I, Portefølje II og Likviditetsfond (0% aksjer)
            newState.initialStockAllocation = computeInitialStockPct(newState);
            const combinedPortfolio = (id === 'initialPortfolioSize' ? value : newState.initialPortfolioSize) +
                                      (id === 'pensionPortfolioSize' ? value : newState.pensionPortfolioSize) +
                                      (id === 'additionalPensionAmount' ? value : newState.additionalPensionAmount);

            if ((id === 'initialPortfolioSize' || id === 'pensionPortfolioSize') && newState.investedCapital > combinedPortfolio) {
                newState.investedCapital = combinedPortfolio;
            }
            if (id === 'additionalPensionAmount' && newState.investedCapital > combinedPortfolio) {
                newState.investedCapital = combinedPortfolio;
            }
            if (id === 'investedCapital' && value > combinedPortfolio) {
                newState.investedCapital = combinedPortfolio;
            }
            return newState;
        });
    }, [computeInitialStockPct]);

    const handleResetAll = useCallback(() => {
        setSpToolButtonMarked(false);
        setUtbToolButtonMarked(false);
        utbBeforeGoalSeekRef.current = null;
        setPortToolButtonMarked(false);
        setState({
            ...INITIAL_APP_STATE,
            initialPortfolioSize: 0,
            investedCapital: 0,
            desiredAnnualPayoutAfterTax: 0,
            annualSavings: 0,
            initialStockAllocation: 0, // 100% renter
            row1StockAllocation: 0,
            row2StockAllocation: 0,
            row3StockAllocation: 0,
            events: [],
            investorType: 'Privat', // Beholder Privat som standard
            manualBondTaxRate: 22.0, // Beholder standard kapitalskatt
            manualStockTaxRate: 37.84, // Beholder standard aksjebeskatning
            desiredAnnualConsumptionPayout: 0, // Nullstiller forbruksutbetaling
            desiredAnnualWealthTaxPayout: 0, // Nullstiller formuesskatt utbetaling
            goalSeekPayoutResult: null, // Nullstiller målsøk resultat
            goalSeekPortfolio1Result: null, // Nullstiller målsøk Portefølje I resultat
        });
    }, []);

    const handleAddEvent = useCallback(() => {
        setState(s => {
            const currentCount = s.events ? s.events.length : 0;
            if (currentCount >= MAX_EVENTS) return s;
            const newEvent = {
                id: `event-${Date.now()}`,
                type: 'Uttak',
                belop: 0,
                startAar: START_YEAR, // Default to current year
                sluttAar: START_YEAR, // Default to current year
                // By default, positive inflows from this event increase invested capital
                addToInvestedCapital: true,
            };
            return { ...s, goalSeekPayoutDrainFinalYear: false, events: [...s.events, newEvent] };
        });
    }, []);

    const handleUpdateEvent = useCallback((id, key, value) => {
        setState(s => ({
            ...s,
            goalSeekPayoutDrainFinalYear: false,
            events: s.events.map(e => e.id === id ? { ...e, [key]: value } : e)
        }));
    }, []);

    const handleRemoveEvent = useCallback((id) => {
        setState(s => ({ ...s, goalSeekPayoutDrainFinalYear: false, events: s.events.filter(e => e.id !== id) }));
    }, []);

    const handleImportLoanEvents = useCallback(() => {
        const parsed = parseLoanCalculatorInput(loanImportText);
        if (parsed.error || parsed.events.length === 0) return;
        const ts = Date.now();
        setState(s => ({
            ...s,
            events: parsed.events.map((ev, i) => ({
                id: `loan-${ts}-${i}`,
                type: 'Lån',
                belop: ev.belop,
                startAar: ev.startAar,
                sluttAar: ev.sluttAar,
                addToInvestedCapital: true,
            })),
        }));
        setShowLoanImportModal(false);
        setLoanImportText('');
    }, [loanImportText]);

    // Beregn simulerte årlige avkastninger basert på aksjeandel
    // Må beregnes før prognosis for å unngå sirkulær avhengighet
    const generateNormalRandom = (mean, stdDev) => {
        // Box-Muller transformasjon for å generere normalfordelte tall
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z0 * stdDev;
    };

    // Beregn aksjeandel basert på state (uten å avhenge av prognosis)
    const annualStockPercentagesForSim = useMemo(() => {
        return populateAnnualStockPercentages(state);
    }, [state]);

    // Generer ny simulering kun når simulationKey endres (når Sim-knappen aktiveres)
    // Viktig: Kun simulationKey er avhengighet, ikke state-verdier
    const simulatedReturns = useMemo(() => {
        // Hvis simulationKey er 0, returner tom array (ingen simulering gjort ennå)
        if (simulationKey === 0) return { stockReturns: [], bondReturns: [] };
        
        // Bruk state-verdiene på tidspunktet når simuleringen genereres
        const extraDisplayYear = ((state.payoutYears || 0) > 0) ? 1 : 0;
        const totalYears = (state.investmentYears || 0) + (state.payoutYears || 0) + extraDisplayYear;
        if (totalYears === 0) return { stockReturns: [], bondReturns: [] };
        
        const stockReturns = [];
        const bondReturns = [];
        const stockStdDev = state.stockStdDev; // Standardavvik for aksjer fra slider
        const bondStdDev = state.bondStdDev; // Standardavvik for renter fra slider
        const stockMean = state.stockReturnRate || 8.0; // Forventet avkastning aksjer
        const bondMean = state.bondReturnRate || 5.0; // Forventet avkastning renter
        
        // Simuler for nøyaktig totalYears antall år (inkl. ekstra visningsår)
        for (let i = 0; i < totalYears; i++) {
            // Simuler avkastning for aksjer og renter
            const simulatedStockReturn = generateNormalRandom(stockMean, stockStdDev);
            const simulatedBondReturn = generateNormalRandom(bondMean, bondStdDev);
            
            stockReturns.push(Math.round(simulatedStockReturn * 100) / 100); // Rund av til 2 desimaler
            bondReturns.push(Math.round(simulatedBondReturn * 100) / 100); // Rund av til 2 desimaler
        }
        
        return { stockReturns, bondReturns };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simulationKey]); // Kun simulationKey som avhengighet - state-verdiene leses direkte inne i useMemo

    // Lagre simulerte verdier når de genereres
    useEffect(() => {
        if (simulationKey > 0 && simulatedReturns.stockReturns.length > 0) {
            setSavedSimulatedReturns(simulatedReturns);
        }
    }, [simulatedReturns, simulationKey]);

    // Bruk lagrede simulerte verdier hvis Sim-knappen er aktiv, ellers bruk de nye
    const activeSimulatedReturns = simButtonActive && savedSimulatedReturns.stockReturns.length > 0 
        ? savedSimulatedReturns 
        : simulatedReturns;

    // Hjelpefunksjon: netto hendelsesbeløp for et gitt simuleringår (år-indeks 0 = første år).
    // Sikrer at beløp og år er tall (unngår streng-konkatenasjon og feil sammenligning).
    const getEventAmountForYear = (stateObj, yearIndex) => {
        const year = START_YEAR + yearIndex;
        let net = 0;
        (stateObj.events || []).forEach(event => {
            const startAar = Number(event.startAar) || START_YEAR;
            const sluttAarNum = Number(event.sluttAar);
            const sluttAar = (event.sluttAar != null && !isNaN(sluttAarNum)) ? sluttAarNum : startAar;
            if (year >= startAar && year <= sluttAar) {
                net += Number(event.belop) || 0;
            }
        });
        return net;
    };
    
    // Monte Carlo simulering: Beregn maksimal utbetaling gitt en simulert avkastningsserie
    const calculateMaxPayout = useCallback((stockReturns, bondReturns, state) => {
        const totalYears = state.investmentYears + state.payoutYears;
        if (totalYears === 0 || state.payoutYears === 0) return 0;
        
        const annualStockPercentages = populateAnnualStockPercentages(state);
        const initialValue = state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        
        // Først sjekk om porteføljen går negativ selv med 0 utbetaling
        // Dette kan skje hvis avkastningene er svært negative
        let testValueZeroPayout = initialValue;
        for (let i = 0; i < totalYears; i++) {
            const isInvestmentYear = i < state.investmentYears;
            const stockPct = annualStockPercentages[i] / 100;
            const bondPct = 1 - stockPct;
            
            // Legg til sparing og positive hendelser (før avkastning), som i prognosen
            if (isInvestmentYear && state.annualSavings > 0) {
                testValueZeroPayout += state.annualSavings;
            }
            if (isInvestmentYear) {
                const eventAmt = getEventAmountForYear(state, i);
                if (eventAmt > 0) testValueZeroPayout += eventAmt;
            }
            // Beregn avkastning
            const stockReturn = stockReturns[i] / 100;
            const bondReturn = bondReturns[i] / 100;
            const portfolioReturn = (stockPct * stockReturn) + (bondPct * bondReturn);
            testValueZeroPayout *= (1 + portfolioReturn);
            // Negative hendelser (uttak) etter avkastning for året, som i prognosen
            if (isInvestmentYear) {
                const eventAmt = getEventAmountForYear(state, i);
                if (eventAmt < 0) testValueZeroPayout += eventAmt;
            }
            // Hvis porteføljen går negativ selv uten utbetaling, kan vi ikke utbetale noe
            if (testValueZeroPayout <= 0) {
                return 0;
            }
        }
        
        // Finn maksimal konstant årlig utbetaling som gjør at porteføljen går i null siste år
        // Bruk binærsøk for å finne maksimal utbetaling
        let low = 0;
        let high = Math.max(initialValue * 2, testValueZeroPayout); // Start med høy verdi basert på faktisk sluttverdi
        let maxPayout = 0;
        const tolerance = 100; // Toleranse i kroner
        const maxIterations = 100; // Begrens antall iterasjoner for å unngå uendelig løkke
        let iterations = 0;
        
        while (high - low > tolerance && iterations < maxIterations) {
            iterations++;
            const testPayout = (low + high) / 2;
            let testValue = initialValue;
            let wentNegative = false;
            
            // Simuler med test utbetaling
            for (let i = 0; i < totalYears; i++) {
                const isInvestmentYear = i < state.investmentYears;
                const stockPct = annualStockPercentages[i] / 100;
                const bondPct = 1 - stockPct;
                
                // Legg til sparing og positive hendelser (før avkastning)
                if (isInvestmentYear && state.annualSavings > 0) {
                    testValue += state.annualSavings;
                }
                if (isInvestmentYear) {
                    const eventAmt = getEventAmountForYear(state, i);
                    if (eventAmt > 0) testValue += eventAmt;
                }
                // Beregn avkastning
                const stockReturn = stockReturns[i] / 100;
                const bondReturn = bondReturns[i] / 100;
                const portfolioReturn = (stockPct * stockReturn) + (bondPct * bondReturn);
                testValue *= (1 + portfolioReturn);
                // Negative hendelser (uttak) etter avkastning for året
                if (isInvestmentYear) {
                    const eventAmt = getEventAmountForYear(state, i);
                    if (eventAmt < 0) testValue += eventAmt;
                }
                // Trekk fra utbetaling i utbetalingsårene
                if (!isInvestmentYear) {
                    testValue -= testPayout;
                    if (testValue < 0) {
                        wentNegative = true;
                        break;
                    }
                }
            }
            
            if (wentNegative || testValue < 0) {
                // Porteføljen går i null for tidlig, reduser utbetaling
                high = testPayout;
            } else if (testValue <= tolerance) {
                // Porteføljen går i null eller er veldig nær null siste år - perfekt!
                maxPayout = testPayout;
                low = testPayout;
            } else {
                // Porteføljen har fortsatt verdi, kan øke utbetaling
                maxPayout = testPayout; // Oppdater maksimal utbetaling
                low = testPayout;
            }
        }
        
        // Sikre at maxPayout aldri er negativ
        maxPayout = Math.max(0, maxPayout);
        
        // Beregn total sum av utbetalinger
        const payoutYears = state.payoutYears;
        const totalPayout = maxPayout * payoutYears;
        
        // Sikre at total utbetaling aldri er negativ
        return Math.max(0, totalPayout);
    }, []);
    
    // Monte Carlo Portefølje simulering: Beregn porteføljens verdi ved slutten av investeringsperioden
    const calculatePortfolioValue = useCallback((stockReturns, bondReturns, state) => {
        if (state.investmentYears === 0) {
            return state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        }
        
        const annualStockPercentages = populateAnnualStockPercentages(state);
        let portfolioValue = state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        
        // Simuler porteføljevekst gjennom investeringsperioden
        for (let i = 0; i < state.investmentYears; i++) {
            const stockPct = annualStockPercentages[i] / 100;
            const bondPct = 1 - stockPct;
            
            // Legg til sparing og positive hendelser (før avkastning), som i prognosen
            if (state.annualSavings > 0) {
                portfolioValue += state.annualSavings;
            }
            const eventAmt = getEventAmountForYear(state, i);
            if (eventAmt > 0) portfolioValue += eventAmt;
            // Beregn avkastning
            const stockReturn = stockReturns[i] / 100;
            const bondReturn = bondReturns[i] / 100;
            const portfolioReturn = (stockPct * stockReturn) + (bondPct * bondReturn);
            portfolioValue *= (1 + portfolioReturn);
            // Negative hendelser (uttak) etter avkastning for året, som i prognosen
            if (eventAmt < 0) portfolioValue += eventAmt;
        }
        
        return portfolioValue;
    }, []);
    
    // Monte Carlo simulering: Gjør 10 simuleringer
    const monteCarloResults = useMemo(() => {
        // Hvis monteCarloKey er 0, returner tom array (ingen simulering gjort ennå)
        if (monteCarloKey === 0) return [];
        
        const totalYears = state.investmentYears + state.payoutYears;
        if (totalYears === 0 || state.payoutYears === 0) return [];
        
        const stockStdDev = state.stockStdDev; // Standardavvik for aksjer fra slider
        const bondStdDev = state.bondStdDev; // Standardavvik for renter fra slider
        const stockMean = state.stockReturnRate || 8.0;
        const bondMean = state.bondReturnRate || 5.0;
        
        const results = [];
        
        for (let sim = 0; sim < 2000; sim++) {
            // Generer tilfeldig avkastning for alle årene
            const stockReturns = [];
            const bondReturns = [];
            
            for (let i = 0; i < totalYears; i++) {
                const simulatedStockReturn = generateNormalRandom(stockMean, stockStdDev);
                const simulatedBondReturn = generateNormalRandom(bondMean, bondStdDev);
                stockReturns.push(simulatedStockReturn);
                bondReturns.push(simulatedBondReturn);
            }
            
            // Beregn maksimal utbetaling for denne simuleringen
            const totalPayout = calculateMaxPayout(stockReturns, bondReturns, state);
            results.push(totalPayout);
        }
        
        return results.sort((a, b) => a - b); // Sorter for å lage normalfordeling
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monteCarloKey, state.stockStdDev, state.bondStdDev, state.stockReturnRate, state.bondReturnRate, state.investmentYears, state.payoutYears, state.events]); // Regenerer når standardavvik, hendelser eller andre relevante verdier endres
    
    // Beregn normalfordelingsdata for grafikken
    const monteCarloChartData = useMemo(() => {
        if (monteCarloResults.length === 0) return null;
        
        const mean = monteCarloResults.reduce((a, b) => a + b, 0) / monteCarloResults.length;
        const variance = monteCarloResults.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monteCarloResults.length;
        const stdDev = Math.sqrt(variance);
        
        // Beregn x-aksen basert på faktisk min og max fra simuleringene
        // X-aksen skal gå fra dårligste til beste resultat (som vist i frekvenstabellen)
        const meanPlus2StdDev = mean + (2 * stdDev);
        const meanMinus2StdDev = mean - (2 * stdDev);
        
        // Finn faktisk min og max fra simuleringene (dette er samme som beste/dårligste i frekvenstabellen)
        const actualMin = Math.min(...monteCarloResults);
        const actualMax = Math.max(...monteCarloResults);
        
        // Bruk faktisk min og max (dårligste og beste resultat)
        const requiredMin = actualMin;
        const requiredMax = actualMax;
        
        // Ingen padding - x-aksen skal gå nøyaktig fra dårligste til beste resultat
        const padding = 0;
        const range = requiredMax - requiredMin;
        const numPoints = 200;
        const step = range / numPoints;
        const startX = requiredMin;
        
        const labels = [];
        const normalCurve = [];
        const histogram = new Array(numPoints).fill(0);
        
        // Beregn normalfordelingskurve
        for (let i = 0; i < numPoints; i++) {
            const x = startX + i * step;
            // Formater til millioner med komma (f.eks. "1,2 M")
            if (x >= 1000000) {
                labels.push(`${(x / 1000000).toFixed(1).replace('.', ',')} M`);
            } else if (x >= 1000) {
                labels.push(`${(x / 1000).toFixed(1).replace('.', ',')} k`);
            } else {
                labels.push(Math.round(x).toString());
            }
            
            // Normalfordelingsformel
            if (stdDev > 0) {
                const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
                const density = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
                // Skaler for å matche histogrammet visuelt (antall simuleringer)
                // Multipliser med antall simuleringer og bin-bredde for å konvertere sannsynlighetstetthet til antall
                const binWidth = step;
                // Skaleringsfaktor for å få kurven til å matche histogrammet visuelt
                normalCurve.push(density * monteCarloResults.length * binWidth * 50);
            } else {
                normalCurve.push(0);
            }
        }
        
        // Lag histogram
        monteCarloResults.forEach(val => {
            const index = Math.min(Math.floor(((val - startX) / range) * numPoints), numPoints - 1);
            if (index >= 0 && index < numPoints) {
                histogram[index]++;
            }
        });
        
        // Lag vertikal linje for gjennomsnittet som starter fra x-aksen (y=0) og går oppover
        // Bruker en bar chart med en veldig smal bar for å få en vertikal linje
        const meanLineIndex = Math.round(((mean - startX) / range) * numPoints);
        const meanLine = new Array(numPoints).fill(0);
        // Beregn maksverdien for gjennomsnittslinjen
        const maxNormalCurveValueForMeanLine = normalCurve.length > 0 ? Math.max(...normalCurve) : 0;
        if (meanLineIndex >= 0 && meanLineIndex < numPoints && maxNormalCurveValueForMeanLine > 0) {
            // Sett verdien på gjennomsnittet til maksverdien, starter fra 0 (x-aksen)
            meanLine[meanLineIndex] = maxNormalCurveValueForMeanLine;
        }
        
        // Lag vertikale linjer for gjennomsnitt ± ett standardavvik
        const meanPlusStdDev = mean + stdDev;
        const meanMinusStdDev = mean - stdDev;
        const meanPlusStdDevIndex = Math.round(((meanPlusStdDev - startX) / range) * numPoints);
        const meanMinusStdDevIndex = Math.round(((meanMinusStdDev - startX) / range) * numPoints);
        
        // Beregn høyden på bell-kurven ved disse x-verdiene
        let meanPlusStdDevHeight = 0;
        let meanMinusStdDevHeight = 0;
        
        if (stdDev > 0) {
            // Beregn normalfordelingshøyde ved mean + stdDev
            const exponentPlus = -0.5 * Math.pow((meanPlusStdDev - mean) / stdDev, 2);
            const densityPlus = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentPlus);
            const binWidth = step;
            meanPlusStdDevHeight = densityPlus * monteCarloResults.length * binWidth * 50;
            
            // Beregn normalfordelingshøyde ved mean - stdDev
            const exponentMinus = -0.5 * Math.pow((meanMinusStdDev - mean) / stdDev, 2);
            const densityMinus = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentMinus);
            meanMinusStdDevHeight = densityMinus * monteCarloResults.length * binWidth * 50;
        }
        
        const meanPlusStdDevLine = new Array(numPoints).fill(0);
        const meanMinusStdDevLine = new Array(numPoints).fill(0);
        
        if (meanPlusStdDevIndex >= 0 && meanPlusStdDevIndex < numPoints && meanPlusStdDevHeight > 0) {
            meanPlusStdDevLine[meanPlusStdDevIndex] = meanPlusStdDevHeight;
        }
        if (meanMinusStdDevIndex >= 0 && meanMinusStdDevIndex < numPoints && meanMinusStdDevHeight > 0) {
            meanMinusStdDevLine[meanMinusStdDevIndex] = meanMinusStdDevHeight;
        }
        
        // Lag vertikale linjer for gjennomsnitt ± to standardavvik
        const meanPlus2StdDevCalc = mean + (2 * stdDev);
        const meanMinus2StdDevCalc = mean - (2 * stdDev);
        const meanPlus2StdDevIndex = Math.round(((meanPlus2StdDevCalc - startX) / range) * numPoints);
        const meanMinus2StdDevIndex = Math.round(((meanMinus2StdDevCalc - startX) / range) * numPoints);
        
        // Beregn høyden på bell-kurven ved disse x-verdiene
        let meanPlus2StdDevHeight = 0;
        let meanMinus2StdDevHeight = 0;
        
        if (stdDev > 0) {
            // Beregn normalfordelingshøyde ved mean + 2*stdDev
            const exponentPlus2 = -0.5 * Math.pow((meanPlus2StdDevCalc - mean) / stdDev, 2);
            const densityPlus2 = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentPlus2);
            const binWidth2 = step;
            meanPlus2StdDevHeight = densityPlus2 * monteCarloResults.length * binWidth2 * 50;
            
            // Beregn normalfordelingshøyde ved mean - 2*stdDev
            const exponentMinus2 = -0.5 * Math.pow((meanMinus2StdDevCalc - mean) / stdDev, 2);
            const densityMinus2 = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentMinus2);
            meanMinus2StdDevHeight = densityMinus2 * monteCarloResults.length * binWidth2 * 50;
        }
        
        const meanPlus2StdDevLine = new Array(numPoints).fill(0);
        const meanMinus2StdDevLine = new Array(numPoints).fill(0);
        
        if (meanPlus2StdDevIndex >= 0 && meanPlus2StdDevIndex < numPoints && meanPlus2StdDevHeight > 0) {
            meanPlus2StdDevLine[meanPlus2StdDevIndex] = meanPlus2StdDevHeight;
        }
        if (meanMinus2StdDevIndex >= 0 && meanMinus2StdDevIndex < numPoints && meanMinus2StdDevHeight > 0) {
            meanMinus2StdDevLine[meanMinus2StdDevIndex] = meanMinus2StdDevHeight;
        }
        
        // Finn maksverdien av normalfordelingskurven
        const maxNormalCurveValue = normalCurve.length > 0 ? Math.max(...normalCurve) : 0;
        
        // Beregn frekvenstabell: 10 linjer basert på faktisk min og max (samme som x-aksen)
        let frequencyTable = [];
        
        if (isNaN(mean) || isNaN(stdDev) || stdDev <= 0 || !isFinite(mean) || !isFinite(stdDev) || monteCarloResults.length === 0) {
            // Hvis mean eller stdDev ikke er gyldig, returner tom tabell
            frequencyTable = [];
        } else {
            const numBins = 10; // 10 linjer i tabellen
            // Bruk samme range som x-aksen: faktisk min til faktisk max
            const actualMin = Math.min(...monteCarloResults);
            const actualMax = Math.max(...monteCarloResults);
            const totalRange = actualMax - actualMin;
            const binWidth = totalRange / numBins;
            
            // Opprett 10 intervaller fra actualMin til actualMax
            const bins = [];
            for (let i = 0; i < numBins; i++) {
                const binStart = actualMin + (i * binWidth);
                const binEnd = actualMin + ((i + 1) * binWidth);
                const binCenter = binStart + (binWidth / 2);
                bins.push({
                    start: binStart,
                    end: binEnd,
                    center: binCenter,
                    count: 0
                });
            }
            
            // Tell simuleringer i hvert intervall
            monteCarloResults.forEach(val => {
                // Finn hvilket intervall verdien tilhører
                for (let i = 0; i < bins.length; i++) {
                    const bin = bins[i];
                    // Siste intervall inkluderer også endepunktet
                    if (i === bins.length - 1) {
                        if (val >= bin.start && val <= bin.end) {
                            bin.count++;
                            break;
                        }
                    } else {
                        if (val >= bin.start && val < bin.end) {
                            bin.count++;
                            break;
                        }
                    }
                }
            });
            
            // Konverter til frequencyTable format
            frequencyTable = bins.map(bin => ({
                value: bin.center,
                count: bin.count
            }));
            
            // Sorter slik at høyeste er øverst
            frequencyTable.sort((a, b) => b.value - a.value);
            
            // Legg til beste resultat øverst og dårligste nederst
            if (monteCarloResults.length > 0) {
                const bestResult = Math.max(...monteCarloResults);
                const worstResult = Math.min(...monteCarloResults);
                
                // Finn om beste/dårligste allerede finnes i tabellen
                const bestIndex = frequencyTable.findIndex(item => Math.abs(item.value - bestResult) < binWidth / 2);
                const worstIndex = frequencyTable.findIndex(item => Math.abs(item.value - worstResult) < binWidth / 2);
                
                // Håndter tilfelle der beste og dårligste er samme verdi
                if (Math.abs(bestResult - worstResult) < binWidth / 2 && bestIndex !== -1) {
                    // Hvis de er samme verdi, fjern den én gang og legg til både øverst og nederst
                    frequencyTable.splice(bestIndex, 1);
                    frequencyTable.unshift({
                        value: bestResult,
                        count: 1
                    });
                    frequencyTable.push({
                        value: worstResult,
                        count: 1
                    });
                } else {
                    // Fjern beste fra sin posisjon hvis den finnes (vi legger den til øverst i stedet)
                    if (bestIndex !== -1) {
                        frequencyTable.splice(bestIndex, 1);
                        // Juster worstIndex hvis den var etter bestIndex
                        const adjustedWorstIndex = worstIndex !== -1 && worstIndex > bestIndex ? worstIndex - 1 : worstIndex;
                        // Fjern dårligste fra sin posisjon hvis den finnes (vi legger den til nederst i stedet)
                        if (adjustedWorstIndex !== -1 && adjustedWorstIndex >= 0) {
                            frequencyTable.splice(adjustedWorstIndex, 1);
                        }
                    } else if (worstIndex !== -1) {
                        // Hvis bare dårligste finnes, fjern den
                        frequencyTable.splice(worstIndex, 1);
                    }
                    
                    // Legg til beste resultat øverst
                    frequencyTable.unshift({
                        value: bestResult,
                        count: 1
                    });
                    
                    // Legg til dårligste resultat nederst
                    frequencyTable.push({
                        value: worstResult,
                        count: 1
                    });
                }
                
                // Sorter på nytt for å sikre riktig rekkefølge
                frequencyTable.sort((a, b) => b.value - a.value);
            }
        }
        
        return {
            labels,
            normalCurve,
            histogram,
            meanLine,
            meanPlusStdDevLine,
            meanMinusStdDevLine,
            meanPlus2StdDevLine,
            meanMinus2StdDevLine,
            mean,
            stdDev,
            maxNormalCurveValue,
            frequencyTable
        };
    }, [monteCarloResults]);
    
    // Monte Carlo Portefølje simulering: Beregn porteføljens verdi ved slutten av investeringsperioden
    const monteCarloPortfolioResults = useMemo(() => {
        // Hvis monteCarloPortfolioKey er 0, returner tom array (ingen simulering gjort ennå)
        if (monteCarloPortfolioKey === 0) return [];
        
        if (state.investmentYears === 0) return [];
        
        const stockStdDev = state.stockStdDev; // Standardavvik for aksjer fra slider
        const bondStdDev = state.bondStdDev; // Standardavvik for renter fra slider
        const stockMean = state.stockReturnRate || 8.0;
        const bondMean = state.bondReturnRate || 5.0;
        
        const results = [];
        
        for (let sim = 0; sim < 2000; sim++) {
            // Generer tilfeldig avkastning for investeringsperioden
            const stockReturns = [];
            const bondReturns = [];
            
            for (let i = 0; i < state.investmentYears; i++) {
                const simulatedStockReturn = generateNormalRandom(stockMean, stockStdDev);
                const simulatedBondReturn = generateNormalRandom(bondMean, bondStdDev);
                stockReturns.push(simulatedStockReturn);
                bondReturns.push(simulatedBondReturn);
            }
            
            // Beregn porteføljens verdi ved slutten av investeringsperioden
            const portfolioValue = calculatePortfolioValue(stockReturns, bondReturns, state);
            results.push(portfolioValue);
        }
        
        return results.sort((a, b) => a - b); // Sorter for å lage normalfordeling
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monteCarloPortfolioKey, calculatePortfolioValue, state.stockStdDev, state.bondStdDev, state.stockReturnRate, state.bondReturnRate, state.investmentYears, state.events]);
    
    // Monte Carlo fra 0- til 100% aksjer: Beregn porteføljens verdi med spesifikk aksjeandel
    const calculatePortfolioValueWithStockAllocation = useCallback((stockReturns, bondReturns, state, stockAllocationPercent) => {
        if (state.investmentYears === 0) {
            return state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        }
        
        const stockPct = stockAllocationPercent / 100;
        const bondPct = 1 - stockPct;
        let portfolioValue = state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        
        // Simuler porteføljevekst gjennom investeringsperioden med fast aksjeandel
        for (let i = 0; i < state.investmentYears; i++) {
            // Legg til sparing og positive hendelser (før avkastning)
            if (state.annualSavings > 0) {
                portfolioValue += state.annualSavings;
            }
            const eventAmt = getEventAmountForYear(state, i);
            if (eventAmt > 0) portfolioValue += eventAmt;
            // Beregn avkastning med spesifikk aksjeandel
            const stockReturn = stockReturns[i] / 100;
            const bondReturn = bondReturns[i] / 100;
            const portfolioReturn = (stockPct * stockReturn) + (bondPct * bondReturn);
            portfolioValue *= (1 + portfolioReturn);
            // Negative hendelser (uttak) etter avkastning for året
            if (eventAmt < 0) portfolioValue += eventAmt;
        }
        
        return portfolioValue;
    }, []);
    
    // Monte Carlo fra 0- til 100% aksjer: Kjør simuleringer for 6 forskjellige aksjeandeler
    const monteCarloStockAllocationResults = useMemo(() => {
        // Hvis monteCarloStockAllocationKey er 0, returner tom objekt (ingen simulering gjort ennå)
        if (monteCarloStockAllocationKey === 0) return {};
        
        if (state.investmentYears === 0) return {};
        
        const stockStdDev = state.stockStdDev; // Standardavvik for aksjer fra slider
        const bondStdDev = state.bondStdDev; // Standardavvik for renter fra slider
        const stockMean = state.stockReturnRate || 8.0;
        const bondMean = state.bondReturnRate || 5.0;
        
        const stockAllocations = [0, 20, 45, 55, 65, 85, 100]; // 0%, 20%, 45%, 55%, 65%, 85%, 100%
        const results = {};
        
        // Kjør simuleringer for hver aksjeandel
        stockAllocations.forEach(stockAllocation => {
            const allocationResults = [];
            
            for (let sim = 0; sim < 1000; sim++) {
                // Generer tilfeldig avkastning for investeringsperioden
                const stockReturns = [];
                const bondReturns = [];
                
                for (let i = 0; i < state.investmentYears; i++) {
                    const simulatedStockReturn = generateNormalRandom(stockMean, stockStdDev);
                    const simulatedBondReturn = generateNormalRandom(bondMean, bondStdDev);
                    stockReturns.push(simulatedStockReturn);
                    bondReturns.push(simulatedBondReturn);
                }
                
                // Beregn porteføljens verdi ved slutten av investeringsperioden med denne aksjeandelen
                const portfolioValue = calculatePortfolioValueWithStockAllocation(stockReturns, bondReturns, state, stockAllocation);
                allocationResults.push(portfolioValue);
            }
            
            results[stockAllocation] = allocationResults.sort((a, b) => a - b);
        });
        
        return results;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monteCarloStockAllocationKey, calculatePortfolioValueWithStockAllocation, state.stockStdDev, state.bondStdDev, state.stockReturnRate, state.bondReturnRate, state.investmentYears, state.initialPortfolioSize, state.pensionPortfolioSize, state.additionalPensionAmount, state.annualSavings, state.events]);
    
    // Beregn frekvenstabeller for hver aksjeandel
    const monteCarloStockAllocationFrequencyTables = useMemo(() => {
        if (!monteCarloStockAllocationResults || Object.keys(monteCarloStockAllocationResults).length === 0) return {};
        
        const stockAllocations = [0, 20, 45, 55, 65, 85, 100];
        const frequencyTables = {};
        
        stockAllocations.forEach(stockAllocation => {
            const results = monteCarloStockAllocationResults[stockAllocation];
            if (!results || results.length === 0) {
                frequencyTables[stockAllocation] = [];
                return;
            }
            
            const numBins = 10; // 10 linjer i tabellen
            const actualMin = Math.min(...results);
            const actualMax = Math.max(...results);
            const totalRange = actualMax - actualMin;
            const binWidth = totalRange / numBins;
            
            // Opprett 10 intervaller fra actualMin til actualMax
            const bins = [];
            for (let i = 0; i < numBins; i++) {
                const binStart = actualMin + (i * binWidth);
                const binEnd = actualMin + ((i + 1) * binWidth);
                const binCenter = binStart + (binWidth / 2);
                bins.push({
                    start: binStart,
                    end: binEnd,
                    center: binCenter,
                    count: 0
                });
            }
            
            // Tell simuleringer i hvert intervall
            results.forEach(val => {
                for (let i = 0; i < bins.length; i++) {
                    const bin = bins[i];
                    if (i === bins.length - 1) {
                        if (val >= bin.start && val <= bin.end) {
                            bin.count++;
                            break;
                        }
                    } else {
                        if (val >= bin.start && val < bin.end) {
                            bin.count++;
                            break;
                        }
                    }
                }
            });
            
            // Konverter til frequencyTable format
            let frequencyTable = bins.map(bin => ({
                value: bin.center,
                count: bin.count
            }));
            
            // Sorter slik at høyeste er øverst
            frequencyTable.sort((a, b) => b.value - a.value);
            
            // Legg til beste resultat øverst og dårligste nederst
            if (results.length > 0) {
                const bestResult = Math.max(...results);
                const worstResult = Math.min(...results);
                
                const bestIndex = frequencyTable.findIndex(item => Math.abs(item.value - bestResult) < binWidth / 2);
                const worstIndex = frequencyTable.findIndex(item => Math.abs(item.value - worstResult) < binWidth / 2);
                
                if (Math.abs(bestResult - worstResult) < binWidth / 2 && bestIndex !== -1) {
                    frequencyTable.splice(bestIndex, 1);
                    frequencyTable.unshift({
                        value: bestResult,
                        count: 1
                    });
                    frequencyTable.push({
                        value: worstResult,
                        count: 1
                    });
                } else {
                    if (bestIndex !== -1) {
                        frequencyTable.splice(bestIndex, 1);
                        const adjustedWorstIndex = worstIndex !== -1 && worstIndex > bestIndex ? worstIndex - 1 : worstIndex;
                        if (adjustedWorstIndex !== -1 && adjustedWorstIndex >= 0) {
                            frequencyTable.splice(adjustedWorstIndex, 1);
                        }
                    } else if (worstIndex !== -1) {
                        frequencyTable.splice(worstIndex, 1);
                    }
                    
                    frequencyTable.unshift({
                        value: bestResult,
                        count: 1
                    });
                    
                    frequencyTable.push({
                        value: worstResult,
                        count: 1
                    });
                }
                
                frequencyTable.sort((a, b) => b.value - a.value);
            }
            
            frequencyTables[stockAllocation] = frequencyTable;
        });
        
        return frequencyTables;
    }, [monteCarloStockAllocationResults]);
    
    // Beregn normalfordelingsdata for Portefølje-grafikken
    const monteCarloPortfolioChartData = useMemo(() => {
        if (monteCarloPortfolioResults.length === 0) return null;
        
        const mean = monteCarloPortfolioResults.reduce((a, b) => a + b, 0) / monteCarloPortfolioResults.length;
        const variance = monteCarloPortfolioResults.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monteCarloPortfolioResults.length;
        const stdDev = Math.sqrt(variance);
        
        // Beregn x-aksen basert på faktisk min og max fra simuleringene
        // X-aksen skal gå fra dårligste til beste resultat (som vist i frekvenstabellen)
        const meanPlus2StdDev = mean + (2 * stdDev);
        const meanMinus2StdDev = mean - (2 * stdDev);
        
        // Finn faktisk min og max fra simuleringene (dette er samme som beste/dårligste i frekvenstabellen)
        const actualMin = Math.min(...monteCarloPortfolioResults);
        const actualMax = Math.max(...monteCarloPortfolioResults);
        
        // Bruk faktisk min og max (dårligste og beste resultat)
        const requiredMin = actualMin;
        const requiredMax = actualMax;
        
        // Ingen padding - x-aksen skal gå nøyaktig fra dårligste til beste resultat
        const padding = 0;
        const range = requiredMax - requiredMin;
        const numPoints = 200;
        const step = range / numPoints;
        const startX = requiredMin;
        
        const labels = [];
        const normalCurve = [];
        const histogram = new Array(numPoints).fill(0);
        
        // Beregn normalfordelingskurve
        for (let i = 0; i < numPoints; i++) {
            const x = startX + i * step;
            // Formater til millioner med komma (f.eks. "1,2 M")
            if (x >= 1000000) {
                labels.push(`${(x / 1000000).toFixed(1).replace('.', ',')} M`);
            } else if (x >= 1000) {
                labels.push(`${(x / 1000).toFixed(1).replace('.', ',')} k`);
            } else {
                labels.push(Math.round(x).toString());
            }
            
            // Normalfordelingsformel
            if (stdDev > 0) {
                const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
                const density = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
                // Skaler for å matche histogrammet visuelt (antall simuleringer)
                // Multipliser med antall simuleringer og bin-bredde for å konvertere sannsynlighetstetthet til antall
                const binWidth = step;
                // Skaleringsfaktor for å få kurven til å matche histogrammet visuelt
                normalCurve.push(density * monteCarloPortfolioResults.length * binWidth * 50);
            } else {
                normalCurve.push(0);
            }
        }
        
        // Lag histogram
        monteCarloPortfolioResults.forEach(val => {
            const index = Math.min(Math.floor(((val - startX) / range) * numPoints), numPoints - 1);
            if (index >= 0 && index < numPoints) {
                histogram[index]++;
            }
        });
        
        // Lag vertikal linje for gjennomsnittet som starter fra x-aksen (y=0) og går oppover
        // Bruker en bar chart med en veldig smal bar for å få en vertikal linje
        const meanLineIndex = Math.round(((mean - startX) / range) * numPoints);
        const meanLine = new Array(numPoints).fill(0);
        // Beregn maksverdien for gjennomsnittslinjen
        const maxNormalCurveValueForMeanLine = normalCurve.length > 0 ? Math.max(...normalCurve) : 0;
        if (meanLineIndex >= 0 && meanLineIndex < numPoints && maxNormalCurveValueForMeanLine > 0) {
            // Sett verdien på gjennomsnittet til maksverdien, starter fra 0 (x-aksen)
            meanLine[meanLineIndex] = maxNormalCurveValueForMeanLine;
        }
        
        // Lag vertikale linjer for gjennomsnitt ± ett standardavvik
        const meanPlusStdDev = mean + stdDev;
        const meanMinusStdDev = mean - stdDev;
        const meanPlusStdDevIndex = Math.round(((meanPlusStdDev - startX) / range) * numPoints);
        const meanMinusStdDevIndex = Math.round(((meanMinusStdDev - startX) / range) * numPoints);
        
        // Beregn høyden på bell-kurven ved disse x-verdiene
        let meanPlusStdDevHeight = 0;
        let meanMinusStdDevHeight = 0;
        
        if (stdDev > 0) {
            // Beregn normalfordelingshøyde ved mean + stdDev
            const exponentPlus = -0.5 * Math.pow((meanPlusStdDev - mean) / stdDev, 2);
            const densityPlus = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentPlus);
            const binWidth = step;
            meanPlusStdDevHeight = densityPlus * monteCarloPortfolioResults.length * binWidth * 50;
            
            // Beregn normalfordelingshøyde ved mean - stdDev
            const exponentMinus = -0.5 * Math.pow((meanMinusStdDev - mean) / stdDev, 2);
            const densityMinus = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentMinus);
            meanMinusStdDevHeight = densityMinus * monteCarloPortfolioResults.length * binWidth * 50;
        }
        
        const meanPlusStdDevLine = new Array(numPoints).fill(0);
        const meanMinusStdDevLine = new Array(numPoints).fill(0);
        
        if (meanPlusStdDevIndex >= 0 && meanPlusStdDevIndex < numPoints && meanPlusStdDevHeight > 0) {
            meanPlusStdDevLine[meanPlusStdDevIndex] = meanPlusStdDevHeight;
        }
        if (meanMinusStdDevIndex >= 0 && meanMinusStdDevIndex < numPoints && meanMinusStdDevHeight > 0) {
            meanMinusStdDevLine[meanMinusStdDevIndex] = meanMinusStdDevHeight;
        }
        
        // Lag vertikale linjer for gjennomsnitt ± to standardavvik
        const meanPlus2StdDevCalc = mean + (2 * stdDev);
        const meanMinus2StdDevCalc = mean - (2 * stdDev);
        const meanPlus2StdDevIndex = Math.round(((meanPlus2StdDevCalc - startX) / range) * numPoints);
        const meanMinus2StdDevIndex = Math.round(((meanMinus2StdDevCalc - startX) / range) * numPoints);
        
        // Beregn høyden på bell-kurven ved disse x-verdiene
        let meanPlus2StdDevHeight = 0;
        let meanMinus2StdDevHeight = 0;
        
        if (stdDev > 0) {
            // Beregn normalfordelingshøyde ved mean + 2*stdDev
            const exponentPlus2 = -0.5 * Math.pow((meanPlus2StdDevCalc - mean) / stdDev, 2);
            const densityPlus2 = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentPlus2);
            const binWidth2 = step;
            meanPlus2StdDevHeight = densityPlus2 * monteCarloPortfolioResults.length * binWidth2 * 50;
            
            // Beregn normalfordelingshøyde ved mean - 2*stdDev
            const exponentMinus2 = -0.5 * Math.pow((meanMinus2StdDevCalc - mean) / stdDev, 2);
            const densityMinus2 = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponentMinus2);
            meanMinus2StdDevHeight = densityMinus2 * monteCarloPortfolioResults.length * binWidth2 * 50;
        }
        
        const meanPlus2StdDevLine = new Array(numPoints).fill(0);
        const meanMinus2StdDevLine = new Array(numPoints).fill(0);
        
        if (meanPlus2StdDevIndex >= 0 && meanPlus2StdDevIndex < numPoints && meanPlus2StdDevHeight > 0) {
            meanPlus2StdDevLine[meanPlus2StdDevIndex] = meanPlus2StdDevHeight;
        }
        if (meanMinus2StdDevIndex >= 0 && meanMinus2StdDevIndex < numPoints && meanMinus2StdDevHeight > 0) {
            meanMinus2StdDevLine[meanMinus2StdDevIndex] = meanMinus2StdDevHeight;
        }
        
        // Finn maksverdien av normalfordelingskurven
        const maxNormalCurveValue = normalCurve.length > 0 ? Math.max(...normalCurve) : 0;
        
        // Beregn frekvenstabell: 10 linjer basert på faktisk min og max (samme som x-aksen)
        let frequencyTable = [];
        
        if (isNaN(mean) || isNaN(stdDev) || stdDev <= 0 || !isFinite(mean) || !isFinite(stdDev) || monteCarloPortfolioResults.length === 0) {
            // Hvis mean eller stdDev ikke er gyldig, returner tom tabell
            frequencyTable = [];
        } else {
            const numBins = 10; // 10 linjer i tabellen
            // Bruk samme range som x-aksen: faktisk min til faktisk max
            const actualMin = Math.min(...monteCarloPortfolioResults);
            const actualMax = Math.max(...monteCarloPortfolioResults);
            const totalRange = actualMax - actualMin;
            const binWidth = totalRange / numBins;
            
            // Opprett 10 intervaller fra actualMin til actualMax
            const bins = [];
            for (let i = 0; i < numBins; i++) {
                const binStart = actualMin + (i * binWidth);
                const binEnd = actualMin + ((i + 1) * binWidth);
                const binCenter = binStart + (binWidth / 2);
                bins.push({
                    start: binStart,
                    end: binEnd,
                    center: binCenter,
                    count: 0
                });
            }
            
            // Tell simuleringer i hvert intervall
            monteCarloPortfolioResults.forEach(val => {
                // Finn hvilket intervall verdien tilhører
                for (let i = 0; i < bins.length; i++) {
                    const bin = bins[i];
                    // Siste intervall inkluderer også endepunktet
                    if (i === bins.length - 1) {
                        if (val >= bin.start && val <= bin.end) {
                            bin.count++;
                            break;
                        }
                    } else {
                        if (val >= bin.start && val < bin.end) {
                            bin.count++;
                            break;
                        }
                    }
                }
            });
            
            // Konverter til frequencyTable format
            frequencyTable = bins.map(bin => ({
                value: bin.center,
                count: bin.count
            }));
            
            // Sorter slik at høyeste er øverst
            frequencyTable.sort((a, b) => b.value - a.value);
            
            // Legg til beste resultat øverst og dårligste nederst
            if (monteCarloPortfolioResults.length > 0) {
                const bestResult = Math.max(...monteCarloPortfolioResults);
                const worstResult = Math.min(...monteCarloPortfolioResults);
                
                // Finn om beste/dårligste allerede finnes i tabellen
                const bestIndex = frequencyTable.findIndex(item => Math.abs(item.value - bestResult) < binWidth / 2);
                const worstIndex = frequencyTable.findIndex(item => Math.abs(item.value - worstResult) < binWidth / 2);
                
                // Håndter tilfelle der beste og dårligste er samme verdi
                if (Math.abs(bestResult - worstResult) < binWidth / 2 && bestIndex !== -1) {
                    // Hvis de er samme verdi, fjern den én gang og legg til både øverst og nederst
                    frequencyTable.splice(bestIndex, 1);
                    frequencyTable.unshift({
                        value: bestResult,
                        count: 1
                    });
                    frequencyTable.push({
                        value: worstResult,
                        count: 1
                    });
                } else {
                    // Fjern beste fra sin posisjon hvis den finnes (vi legger den til øverst i stedet)
                    if (bestIndex !== -1) {
                        frequencyTable.splice(bestIndex, 1);
                        // Juster worstIndex hvis den var etter bestIndex
                        const adjustedWorstIndex = worstIndex !== -1 && worstIndex > bestIndex ? worstIndex - 1 : worstIndex;
                        // Fjern dårligste fra sin posisjon hvis den finnes (vi legger den til nederst i stedet)
                        if (adjustedWorstIndex !== -1 && adjustedWorstIndex >= 0) {
                            frequencyTable.splice(adjustedWorstIndex, 1);
                        }
                    } else if (worstIndex !== -1) {
                        // Hvis bare dårligste finnes, fjern den
                        frequencyTable.splice(worstIndex, 1);
                    }
                    
                    // Legg til beste resultat øverst
                    frequencyTable.unshift({
                        value: bestResult,
                        count: 1
                    });
                    
                    // Legg til dårligste resultat nederst
                    frequencyTable.push({
                        value: worstResult,
                        count: 1
                    });
                }
                
                // Sorter på nytt for å sikre riktig rekkefølge
                frequencyTable.sort((a, b) => b.value - a.value);
            }
        }
        
        return {
            labels,
            normalCurve,
            histogram,
            meanLine,
            meanPlusStdDevLine,
            meanMinusStdDevLine,
            meanPlus2StdDevLine,
            meanMinus2StdDevLine,
            mean,
            stdDev,
            maxNormalCurveValue,
            frequencyTable
        };
    }, [monteCarloPortfolioResults]);
    
    const prognosis = useMemo(() => calculatePrognosis(state, simButtonActive, activeSimulatedReturns), [state, simButtonActive, activeSimulatedReturns]);

    // Lagre total porteføljeverdi per år til T-konto – sum av alle komponenter (hovedstol, avkastning, sparing, hendelser, netto utbetaling, skatt på hendelser, løpende renteskatt)
    useEffect(() => {
        const d = (prognosis && prognosis.data) ? prognosis.data : {};
        const hovedstol = d.hovedstol || [];
        const avkastning = d.avkastning || [];
        const sparing = d.sparing || [];
        const event_total = d.event_total || [];
        const nettoUtbetaling = d.nettoUtbetaling || [];
        const eventNegativeOutflow = d.eventNegativeOutflow || [];
        const skatt2 = d.skatt2 || [];
        const renteskatt = d.renteskatt || [];
        const totalPerYear = hovedstol.map((h, i) =>
            Math.round((h || 0) + (avkastning[i] || 0) + (sparing[i] || 0) + (event_total[i] || 0) + (nettoUtbetaling[i] || 0) + (skatt2[i] || 0) + (renteskatt[i] || 0))
        );
        // T-konto: netto utbetaling + kun negative hendelser (utbetaling), som positive beløp – samme indeks [start, 2026, …]
        const nettoTilTKontoPerYear = hovedstol.map((_, i) => {
            const n = Number(nettoUtbetaling[i]) || 0;
            const en = Number(eventNegativeOutflow[i]) || 0; // sum(belop < 0), alltid ≤ 0
            return Math.round(-n + (-en));
        });
        try {
            sessionStorage.setItem('maalOgBehovHovedstolPerYear', JSON.stringify(totalPerYear));
            sessionStorage.setItem('maalOgBehovNettoUtbetalingTilTKontoPerYear', JSON.stringify(nettoTilTKontoPerYear));
        } catch (e) {}
        try {
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('maal-og-behov-prognosis-exported'));
            }
        } catch (e) {}
    }, [prognosis]);

// --- Output generation & clipboard helpers --- //
const generateOutputText = useCallback(() => {
const lines = [];
const INGEN_DATA_OUTPUT = 'ingen data';
const orIngenData = (v) => (v === undefined || v === null || (typeof v === 'string' && !String(v).trim())) ? INGEN_DATA_OUTPUT : v;
const formatCurrencyValue = (value) => formatNumberRaw(value ?? 0);
const D = INITIAL_APP_STATE;
const sameNum = (a, b) => Number(a) === Number(b);
const pushIf = (changed, line) => { if (changed) lines.push(line); };

pushIf(!sameNum(state.initialPortfolioSize, D.initialPortfolioSize), `1 Portefølje I : ${formatCurrencyValue(state.initialPortfolioSize)}`);
pushIf(!sameNum(state.row1StockAllocation, D.row1StockAllocation), `2 Aksjeandel Portefølje I : ${formatNumberRaw(state.row1StockAllocation)}`);
pushIf(!sameNum(state.pensionPortfolioSize, D.pensionPortfolioSize), `3 Portefølje II : ${formatCurrencyValue(state.pensionPortfolioSize)}`);
pushIf(!sameNum(state.row2StockAllocation, D.row2StockAllocation), `4 Aksjeandel Portefølje II : ${formatNumberRaw(state.row2StockAllocation)}`);
pushIf(!sameNum(state.additionalPensionAmount, D.additionalPensionAmount), `5 Bankinnskudd/Likviditetsfond : ${formatCurrencyValue(state.additionalPensionAmount)}`);
pushIf(!sameNum(state.annualSavings, D.annualSavings), `6 Årlig sparing : ${formatCurrencyValue(state.annualSavings)}`);
pushIf(!sameNum(state.investedCapital, D.investedCapital), `7 Innskutt kapital : ${formatCurrencyValue(state.investedCapital)}`);
pushIf(!sameNum(state.investmentYears, D.investmentYears), `8 Antall år investeringsperiode : ${formatNumberRaw(state.investmentYears)}`);
pushIf(!sameNum(state.payoutYears, D.payoutYears), `9 Antall år med utbetaling : ${formatNumberRaw(state.payoutYears)}`);
pushIf(!sameNum(state.desiredAnnualConsumptionPayout, D.desiredAnnualConsumptionPayout), `10 Ønsket årlig uttak til Forbruk : ${formatCurrencyValue(state.desiredAnnualConsumptionPayout)}`);
pushIf(!sameNum(state.desiredAnnualWealthTaxPayout, D.desiredAnnualWealthTaxPayout), `11 Ønsket årlig uttak til Formuesskatt : ${formatCurrencyValue(state.desiredAnnualWealthTaxPayout)}`);
pushIf(!sameNum(state.stockReturnRate, D.stockReturnRate), `12 Forventet avkastning aksjeportefølje : ${Number(state.stockReturnRate).toFixed(1)}`);
pushIf(!sameNum(state.bondReturnRate, D.bondReturnRate), `13 Forventet avkastning renteportefølje : ${Number(state.bondReturnRate).toFixed(1)}`);
pushIf(!sameNum(state.kpiRate, D.kpiRate), `14 Forventet KPI : ${Number(state.kpiRate).toFixed(1)}`);
pushIf(!sameNum(state.advisoryFeeRate, D.advisoryFeeRate), `15 Rådgivningshonorar : ${Number(state.advisoryFeeRate).toFixed(2)}`);
pushIf(!sameNum(state.shieldingRate, D.shieldingRate), `16 Skjermingsrente : ${Number(state.shieldingRate).toFixed(2)}`);
pushIf(!sameNum(state.manualStockTaxRate, D.manualStockTaxRate), `17 Utbytteskatt : ${Number(state.manualStockTaxRate).toFixed(2)}`);
pushIf(!sameNum(state.manualBondTaxRate, D.manualBondTaxRate), `18 Kapitalskatt : ${Number(state.manualBondTaxRate).toFixed(2)}`);
const eventsToExport = (state.events || []).filter((e) =>
    e && e.id && (e.belop !== 0 || e.startAar !== START_YEAR || e.sluttAar !== START_YEAR || (e.type && e.type !== 'Hendelse'))
);
eventsToExport.slice(0, MAX_EVENTS).forEach((ev, i) => {
    const num = i < 5 ? 19 + i : 40 + (i - 5);
    const label = `Hendelse ${i + 1}`;
    lines.push(`${num} ${label} beløp : ${formatCurrencyValue(ev.belop || 0)}`);
    lines.push(`${num}a ${label} startår : ${ev.startAar || START_YEAR}`);
    lines.push(`${num}b ${label} sluttår : ${ev.sluttAar || START_YEAR}`);
    lines.push(`${num}c ${label} påvirker innskutt kapital : ${ev.addToInvestedCapital !== false ? 'Ja' : 'Nei'}`);
    lines.push(`${num}d ${label} type : ${orIngenData(ev.type) || 'Hendelse'}`);
});
pushIf(!sameNum(state.goalSeekPayoutResult || 0, D.goalSeekPayoutResult || 0), `24 Målsøk utbetaling resultat : ${formatCurrencyValue(state.goalSeekPayoutResult || 0)}`);
pushIf(!sameNum(state.goalSeekPortfolio1Result || 0, D.goalSeekPortfolio1Result || 0), `25 Målsøk Portefølje I resultat : ${formatCurrencyValue(state.goalSeekPortfolio1Result || 0)}`);
pushIf(String(state.investorType || '') !== String(D.investorType || ''), `26 Investortype : ${orIngenData(state.investorType)}`);
pushIf(!!state.deferredInterestTax !== !!D.deferredInterestTax, `27 utsatt skatt på renter : ${state.deferredInterestTax ? 'Ja' : 'Nei'}`);
pushIf(!!state.taxCalculationEnabled !== !!D.taxCalculationEnabled, `28 Skatteberegning : ${state.taxCalculationEnabled ? 'På' : 'Av'}`);
pushIf(String(resolvedPanelTitle || MAAL_PANEL_TITLE_DEFAULT) !== MAAL_PANEL_TITLE_DEFAULT, `29 Overskrift : ${resolvedPanelTitle || MAAL_PANEL_TITLE_DEFAULT}`);
pushIf(!sameNum(state.row3StockAllocation, D.row3StockAllocation), `30 Aksjeandel likviditetsfond/rad 3 : ${formatNumberRaw(state.row3StockAllocation)}`);
pushIf(!sameNum(state.stockStdDev, D.stockStdDev), `31 Standardavvik aksjer : ${Number(state.stockStdDev).toFixed(1)}`);
pushIf(!sameNum(state.bondStdDev, D.bondStdDev), `32 Standardavvik renter : ${Number(state.bondStdDev).toFixed(1)}`);
pushIf(!sameNum(state.desiredAnnualPayoutAfterTax, D.desiredAnnualPayoutAfterTax), `33 Ønsket årlig uttak etter skatt : ${formatCurrencyValue(state.desiredAnnualPayoutAfterTax)}`);
pushIf(!sameNum(state.taxRate, D.taxRate), `34 Skattesats hoved (%) : ${Number(state.taxRate).toFixed(2)}`);
pushIf(!sameNum(state.bankDepositRate, D.bankDepositRate), `35 Forventet rente bankinnskudd (%) : ${Number(state.bankDepositRate).toFixed(1)}`);
pushIf(!!state.wealthTaxFromTKonto !== !!D.wealthTaxFromTKonto, `36 Formuesskatt fra T-konto : ${state.wealthTaxFromTKonto ? 'Ja' : 'Nei'}`);
pushIf(!!state.goalSeekPayoutDrainFinalYear !== !!D.goalSeekPayoutDrainFinalYear, `37 Målsøk utbetaling tøm siste år : ${state.goalSeekPayoutDrainFinalYear ? 'Ja' : 'Nei'}`);
pushIf(resolvePortfolio1Name(state.portfolio1Name) !== PORTFOLIO1_NAME_DEFAULT, `38 Portefølje I navn : ${orIngenData(resolvePortfolio1Name(state.portfolio1Name))}`);
pushIf(resolvePortfolio2Name(state.portfolio2Name) !== PORTFOLIO2_NAME_DEFAULT, `39 Portefølje II navn : ${orIngenData(resolvePortfolio2Name(state.portfolio2Name))}`);
return lines.join('\n');
}, [state, prognosis, resolvedPanelTitle]);

const copyTextToClipboard = useCallback(async (text) => {
try {
if (navigator?.clipboard?.writeText) {
await navigator.clipboard.writeText(text);
return true;
}
throw new Error('Navigator clipboard not available');
} catch (_) {
try {
const textarea = document.createElement('textarea');
textarea.value = text;
textarea.setAttribute('readonly', '');
textarea.style.position = 'fixed';
textarea.style.opacity = '0';
document.body.appendChild(textarea);
textarea.focus();
textarea.select();
const successful = document.execCommand('copy');
document.body.removeChild(textarea);
return successful;
} catch (err) {
console.error('Kopiering feilet:', err);
return false;
}
}
}, []);

const handleOpenOutput = useCallback(() => {
setOutputText(generateOutputText());
setShowOutputModal(true);
}, [generateOutputText]);

const handleCopyOutput = useCallback(async () => {
const ok = await copyTextToClipboard(outputText);
if (ok) {
setCopied(true);
setTimeout(() => setCopied(false), 2000);
} else {
alert('Kunne ikke kopiere teksten til utklippstavlen.');
}
}, [copyTextToClipboard, outputText]);

const handleOpenInput = useCallback(() => {
setInputText('');
setShowInputModal(true);
}, []);

const parseInputText = useCallback((text) => {
const MB_JSON = 'Maal og behov state (json):';
const raw = String(text || '').replace(/^\uFEFF/, '').replace(/\u2028/g, '\n').replace(/\u2029/g, '\n');
const ji = raw.indexOf(MB_JSON);
if (ji >= 0) {
const jsonStr = extractJsonObjectAfterMarker(raw, MB_JSON);
if (jsonStr) {
try {
const snap = JSON.parse(jsonStr);
if (snap && snap.state && typeof snap.state === 'object') {
const updates = { ...snap.state, __fromFullJson: true };
if (snap.panelTitle != null && String(snap.panelTitle).trim() !== '') updates._panelTitle = String(snap.panelTitle).trim();
if (snap.ui && typeof snap.ui === 'object') updates.__maalUi = snap.ui;
if (updates.events) {
delete updates._eventParseTs;
updates.events = updates.events.filter((e) =>
e && e.id && (e.belop !== 0 || e.startAar !== START_YEAR || e.sluttAar !== START_YEAR || (e.type && e.type !== 'Hendelse'))
);
}
return updates;
}
} catch (err) { console.warn('Maal og behov state (json) parse:', err); }
}
}

const lines = text.split('\n').map((line) =>
line.trim().replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ')).filter((line) => line.length > 0);
const updates = {};
const LABEL_VALUE_SEP = ' : ';

// Helper to parse number (mellomrom, komma, "kr", minus – robust for eksport/import)
const parseNumber = (str) => {
const s = String(str).replace(/\s/g, '').replace(/\u202F/g, '').replace(',', '.')
  .replace(/\u2212/g, '-').replace(/\u2013/g, '-'); // Unicode minus/en-dash → ASCII minus
const cleaned = s.replace(/[^\d.-]/g, '');
return parseFloat(cleaned) || 0;
};

// Helper to parse boolean from "Ja"/"Nei"
const parseBoolean = (str) => str.toLowerCase() === 'ja' || str.toLowerCase() === 'på';

lines.forEach((line) => {
// Parse format: "num[Suffix] Label : value" — første forekomst av " : " skil label frå verdi (verdi kan innehalde kolon)
const head = line.match(/^(\d+)([a-z]?)\s+(.*)$/);
if (!head) return;
const num = parseInt(head[1], 10);
const suffix = head[2] || '';
const bodyRaw = head[3];
const bodyNorm = bodyRaw.replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ');
const sepPos = bodyNorm.indexOf(LABEL_VALUE_SEP);
if (sepPos === -1) return;
const label = bodyNorm.slice(0, sepPos).trim();
const value = bodyNorm.slice(sepPos + LABEL_VALUE_SEP.length).trim();
if (label.length === 0) return;

switch(num) {
case 1: // Portefølje I
updates.initialPortfolioSize = parseNumber(value);
break;
case 2: // Aksjeandel Portefølje I
updates.row1StockAllocation = parseNumber(value);
break;
case 3: // Portefølje II
updates.pensionPortfolioSize = parseNumber(value);
break;
case 4: // Aksjeandel Portefølje II
updates.row2StockAllocation = parseNumber(value);
break;
case 5: // Bankinnskudd/Likviditetsfond
updates.additionalPensionAmount = parseNumber(value);
break;
case 6: // Årlig sparing
updates.annualSavings = parseNumber(value);
break;
case 7: // Innskutt kapital
updates.investedCapital = parseNumber(value);
break;
case 8: // Antall år investeringsperiode
updates.investmentYears = parseNumber(value);
break;
case 9: // Antall år med utbetaling
updates.payoutYears = parseNumber(value);
break;
case 10: // Ønsket årlig uttak til Forbruk
updates.desiredAnnualConsumptionPayout = parseNumber(value);
break;
case 11: // Ønsket årlig uttak til Formuesskatt
updates.desiredAnnualWealthTaxPayout = parseNumber(value);
break;
case 12: // Forventet avkastning aksjeportefølje
updates.stockReturnRate = parseNumber(value);
break;
case 13: // Forventet avkastning renteportefølje
updates.bondReturnRate = parseNumber(value);
break;
case 14: // Forventet KPI
updates.kpiRate = parseNumber(value);
break;
case 15: // Rådgivningshonorar
updates.advisoryFeeRate = parseNumber(value);
break;
case 16: // Skjermingsrente
updates.shieldingRate = parseNumber(value);
break;
case 17: // Utbytteskatt
updates.manualStockTaxRate = parseNumber(value);
break;
case 18: // Kapitalskatt
updates.manualBondTaxRate = parseNumber(value);
break;
case 19: // Hendelse 1
case 20: // Hendelse 2
case 21: // Hendelse 3
case 22: // Hendelse 4
case 23: // Hendelse 5 (eller gammel 23 = Målsøk utbetaling ved bakoverkompatibilitet)
case 40: // Hendelse 6
case 41: // Hendelse 7
case 42: // Hendelse 8
case 43: // Hendelse 9
case 44: { // Hendelse 10
if (num === 23 && suffix === '' && label.indexOf('Målsøk utbetaling') !== -1) {
    updates.goalSeekPayoutResult = parseNumber(value);
    break;
}
const evtIdx = num >= 40 ? 5 + (num - 40) : num - 19;
if (!updates.events) {
    updates.events = [];
}
const evtTs = updates._eventParseTs || (updates._eventParseTs = Date.now());
while (updates.events.length <= evtIdx) {
    updates.events.push({ id: `event-${evtTs}-${updates.events.length}`, type: 'Hendelse', belop: 0, startAar: START_YEAR, sluttAar: START_YEAR, addToInvestedCapital: true });
}
if (!updates.events[evtIdx] || !updates.events[evtIdx].id) {
    updates.events[evtIdx] = { id: `event-${evtTs}-${evtIdx}`, type: 'Hendelse', belop: 0, startAar: START_YEAR, sluttAar: START_YEAR, addToInvestedCapital: true, ...(updates.events[evtIdx] || {}) };
}
if (suffix === 'a') {
    updates.events[evtIdx] = { ...updates.events[evtIdx], startAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'b') {
    updates.events[evtIdx] = { ...updates.events[evtIdx], sluttAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'c') {
    updates.events[evtIdx] = { ...updates.events[evtIdx], addToInvestedCapital: parseBoolean(value) };
} else if (suffix === 'd') {
    updates.events[evtIdx] = { ...updates.events[evtIdx], type: value || 'Hendelse' };
} else {
    updates.events[evtIdx] = { ...updates.events[evtIdx], belop: parseNumber(value) };
}
break;
}
case 24: // Målsøk utbetaling resultat (gammel 23) eller Målsøk Portefølje I (gammel 24)
if (label.indexOf('utbetaling') !== -1) {
updates.goalSeekPayoutResult = parseNumber(value);
} else {
updates.goalSeekPortfolio1Result = parseNumber(value);
}
break;
case 25: // Målsøk Portefølje I resultat (gammel 24) eller Investortype (gammel 25)
if (label.indexOf('Portefølje I') !== -1) {
updates.goalSeekPortfolio1Result = parseNumber(value);
} else {
updates.investorType = value;
}
break;
case 26: // Investortype (gammel 25 = samme) eller utsatt skatt (gammel 26)
if (label.indexOf('Investortype') !== -1) {
updates.investorType = value;
} else {
updates.deferredInterestTax = parseBoolean(value);
}
break;
case 27: // utsatt skatt på renter (gammel 26) eller Skatteberegning (gammel 27)
if (label.indexOf('Skatteberegning') !== -1) {
updates.taxCalculationEnabled = parseBoolean(value);
} else {
updates.deferredInterestTax = parseBoolean(value);
}
break;
case 28: // Skatteberegning
updates.taxCalculationEnabled = parseBoolean(value);
break;
case 29: // Overskrift
updates._panelTitle = value || MAAL_PANEL_TITLE_DEFAULT;
break;
case 30: // Aksjeandel likviditetsfond / rad 3
updates.row3StockAllocation = parseNumber(value);
break;
case 31: // Standardavvik aksjer
updates.stockStdDev = parseNumber(value);
break;
case 32: // Standardavvik renter
updates.bondStdDev = parseNumber(value);
break;
case 33: // Ønsket årlig uttak etter skatt
updates.desiredAnnualPayoutAfterTax = parseNumber(value);
break;
case 34: // Skattesats hoved (tabell/beregning)
updates.taxRate = parseNumber(value);
break;
case 35: // Forventet avkastning bankinnskudd
updates.bankDepositRate = parseNumber(value);
break;
case 36: // Formuesskatt fra T-konto
updates.wealthTaxFromTKonto = parseBoolean(value);
break;
case 37: // Målsøk utbetaling tøm siste år
updates.goalSeekPayoutDrainFinalYear = parseBoolean(value);
break;
case 38: // Portefølje I navn
updates.portfolio1Name = value.trim() || PORTFOLIO1_NAME_DEFAULT;
break;
case 39: // Portefølje II navn
updates.portfolio2Name = value.trim() || PORTFOLIO2_NAME_DEFAULT;
break;
}

});

// Remove empty/placeholder events and clean up temporary parse properties
if (updates.events) {
delete updates._eventParseTs;
updates.events = updates.events.filter(e =>
    e && e.id && (e.belop !== 0 || e.startAar !== START_YEAR || e.sluttAar !== START_YEAR || (e.type && e.type !== 'Hendelse'))
);
}

return updates;
}, []);

const applyMaalUiSnapshot = useCallback((ui) => {
if (!ui || typeof ui !== 'object') return;
const b = (x) => x === true || x === 'true' || x === 1;
if (ui.showDistributionGraphic !== undefined) setShowDistributionGraphic(b(ui.showDistributionGraphic));
if (ui.showStockPortionGraphic !== undefined) setShowStockPortionGraphic(b(ui.showStockPortionGraphic));
if (ui.showInvestedCapitalGraphic !== undefined) setShowInvestedCapitalGraphic(b(ui.showInvestedCapitalGraphic));
if (ui.showGoalSeek !== undefined) setShowGoalSeek(b(ui.showGoalSeek));
if (ui.showAssumptionsGraphic !== undefined) setShowAssumptionsGraphic(b(ui.showAssumptionsGraphic));
if (ui.showSimulation !== undefined) setShowSimulation(b(ui.showSimulation));
if (ui.showAccumulatedReturn !== undefined) setShowAccumulatedReturn(b(ui.showAccumulatedReturn));
if (ui.showMonteCarlo !== undefined) setShowMonteCarlo(b(ui.showMonteCarlo));
if (ui.monteCarloKey !== undefined) setMonteCarloKey(Number(ui.monteCarloKey) || 0);
if (ui.showMonteCarloPortfolio !== undefined) setShowMonteCarloPortfolio(b(ui.showMonteCarloPortfolio));
if (ui.monteCarloPortfolioKey !== undefined) setMonteCarloPortfolioKey(Number(ui.monteCarloPortfolioKey) || 0);
if (ui.showMonteCarloStockAllocation !== undefined) setShowMonteCarloStockAllocation(b(ui.showMonteCarloStockAllocation));
if (ui.monteCarloStockAllocationKey !== undefined) setMonteCarloStockAllocationKey(Number(ui.monteCarloStockAllocationKey) || 0);
if (ui.simButtonActive !== undefined) setSimButtonActive(b(ui.simButtonActive));
if (ui.simulationKey !== undefined) setSimulationKey(Number(ui.simulationKey) || 0);
if (ui.savedSimulatedReturns && typeof ui.savedSimulatedReturns === 'object') {
setSavedSimulatedReturns({
stockReturns: Array.isArray(ui.savedSimulatedReturns.stockReturns) ? ui.savedSimulatedReturns.stockReturns : [],
bondReturns: Array.isArray(ui.savedSimulatedReturns.bondReturns) ? ui.savedSimulatedReturns.bondReturns : []
});
}
if (ui.waterfallMode !== undefined) setWaterfallMode(b(ui.waterfallMode));
if (ui.spToolButtonMarked !== undefined) setSpToolButtonMarked(b(ui.spToolButtonMarked));
if (ui.utbToolButtonMarked !== undefined) setUtbToolButtonMarked(b(ui.utbToolButtonMarked));
if (ui.portToolButtonMarked !== undefined) setPortToolButtonMarked(b(ui.portToolButtonMarked));
if (ui.advisoryInputValue != null && ui.advisoryInputValue !== undefined) setAdvisoryInputValue(String(ui.advisoryInputValue));
}, []);

const applyParsedMaalUpdates = useCallback((updates, text) => {
const fromJson = updates.__fromFullJson;
delete updates.__fromFullJson;
const uiSnap = updates.__maalUi;
delete updates.__maalUi;
const hasFields = fromJson || Object.keys(updates).length > 0;
if (!hasFields) {
    if (!isIngenDataText(text)) return false;
    setState({ ...INITIAL_APP_STATE, events: [] });
    setPanelTitle(MAAL_PANEL_TITLE_DEFAULT);
    setAdvisoryInputValue(INITIAL_APP_STATE.advisoryFeeRate.toFixed(2).replace('.', ','));
    return true;
}
if (updates._panelTitle) {
    setPanelTitle(updates._panelTitle);
    delete updates._panelTitle;
} else {
    setPanelTitle(MAAL_PANEL_TITLE_DEFAULT);
}
const merged = { ...INITIAL_APP_STATE, ...updates, events: [...(updates.events || INITIAL_APP_STATE.events || [])].slice(0, MAX_EVENTS) };
merged.initialStockAllocation = computeInitialStockPct(merged);
setState(merged);
const fee = updates.advisoryFeeRate !== undefined ? updates.advisoryFeeRate : INITIAL_APP_STATE.advisoryFeeRate;
setAdvisoryInputValue(Number(fee).toFixed(2).replace('.', ','));
applyMaalUiSnapshot(uiSnap);
return true;
}, [applyMaalUiSnapshot, computeInitialStockPct]);

const handleLoadInput = useCallback(() => {
if (!inputText.trim()) {
alert('Vennligst lim inn informasjon fra output.');
return;
}

try {
const updates = parseInputText(inputText);
if (!applyParsedMaalUpdates(updates, inputText)) {
alert('Kunne ikke lese inn data. Sjekk at formatet er riktig.');
return;
}
setShowInputModal(false);
setInputText('');
} catch (error) {
alert('Kunne ikke lese inn data. Sjekk at formatet er riktig.');
console.error('Parse error:', error);
}
}, [inputText, parseInputText, applyParsedMaalUpdates]);

// Registrer for felles Input/Output på tvers av alle faner (TabContainer kaller disse).
// useLayoutEffect: sikrar at applyInputText finst før brukar kan trykkje «Last inn» etter første teikning.
useLayoutEffect(() => {
    MaalOgBehovState.getOutputText = () => generateOutputText();
    MaalOgBehovState.applyInputText = (text) => {
        try {
            const updates = parseInputText(text);
            return applyParsedMaalUpdates(updates, text);
        } catch (e) {
            console.error('MaalOgBehovState.applyInputText:', e);
            return false;
        }
    };
    return () => {
        delete MaalOgBehovState.getOutputText;
        delete MaalOgBehovState.applyInputText;
    };
}, [generateOutputText, parseInputText, applyParsedMaalUpdates]);

useEffect(() => {
if (!showOutputModal) return;
const onKey = (e) => {
if (e.key === 'Escape') setShowOutputModal(false);
};
document.addEventListener('keydown', onKey);
return () => document.removeEventListener('keydown', onKey);
}, [showOutputModal]);

useEffect(() => {
if (!showInputModal) return;
const onKey = (e) => {
if (e.key === 'Escape') setShowInputModal(false);
};
document.addEventListener('keydown', onKey);
return () => document.removeEventListener('keydown', onKey);
}, [showInputModal]);

    // Målsøk: finn årlig sparing slik at porteføljen går akkurat i null i siste utbetalingsår
    const goalSeekAnnualSavings = useCallback(() => {
        // Hvis ingen utbetalingsår, gjør ingenting
        const hasPayoutYears = (state.payoutYears || 0) > 0;
        if (!hasPayoutYears) return;

        const simulateFinalPortfolio = (annualSavingsValue) => {
            const p = calculatePrognosis({ ...state, annualSavings: annualSavingsValue }, false, null);
            // Bruk sluttverdien etter avkastning og uttak i siste utbetalingsår
            // Dette sikrer at porteføljen går til null etter det spesifiserte antall år
            return p.finalPortfolioValue;
        };

        // Finn øvre grense med dobling
        let low = 0;
        let high = Math.max(state.annualSavings || 0, 10000);
        let last = simulateFinalPortfolio(high);
        let attempts = 0;
        while (last < 0 && high < 100000000 && attempts < 20) { // maks 100MNOK og 20 forsøk
            high *= 2;
            last = simulateFinalPortfolio(high);
            attempts++;
        }

        // Hvis selv enorme verdier ikke holder, avbryt
        if (last < 0) return;

        // Binærsøk etter minste årlige sparing som gir finalPortfolioValue = 0 i siste år
        for (let i = 0; i < 100; i++) {
            const mid = Math.round((low + high) / 2);
            if (mid === low || mid === high) break;
            const v = simulateFinalPortfolio(mid);
            if (v >= 0) {
                high = mid;
            } else {
                low = mid;
            }
        }
        // high er minste heltall som gir finalPortfolioValue >= 0
        setState(s => ({ ...s, annualSavings: Math.round(high) }));
    }, [state, prognosis.data.hovedstol]);

    /** Samme logikk som sideknappen «Sp.»: veksler på/av, kjører målsøk ved på, nullstiller årlig sparing ved av. */
    const toggleGoalSeekAnnualSavings = useCallback(() => {
        setSpToolButtonMarked((prev) => {
            const next = !prev;
            if (next) {
                goalSeekAnnualSavings();
            } else {
                setState((s) => ({ ...s, annualSavings: 0 }));
            }
            return next;
        });
    }, [goalSeekAnnualSavings, setState]);

    // Målsøk: finn årlig utbetaling som får porteføljen til å gå akkurat i null i siste utbetalingsår (inkl. ekstra visningsår med skatt)
    const goalSeekAnnualPayout = useCallback(() => {
        // Hvis ingen utbetalingsår, gjør ingenting
        const hasPayoutYears = (state.payoutYears || 0) > 0;
        if (!hasPayoutYears) return;
        const shouldDrainFinalYear = state.deferredInterestTax !== true;

        const simulateLastPrincipal = (consumptionPayoutValue) => {
            const p = calculatePrognosis({
                ...state,
                desiredAnnualConsumptionPayout: consumptionPayoutValue,
                desiredAnnualWealthTaxPayout: 0,
                goalSeekPayoutDrainFinalYear: shouldDrainFinalYear
            }, false, null);
            const v = p.finalPortfolioValue;
            return Number.isFinite(v) ? v : NaN;
        };

        const applyResult = (result) => {
            const rounded = Math.round(Math.max(0, result) * 100) / 100;
            setState((s) => ({
                ...s,
                desiredAnnualConsumptionPayout: rounded,
                desiredAnnualWealthTaxPayout: 0,
                goalSeekPayoutResult: rounded,
                goalSeekPayoutDrainFinalYear: shouldDrainFinalYear
            }));
        };

        const f0 = simulateLastPrincipal(0);
        if (!Number.isFinite(f0) || f0 < 0) {
            applyResult(0);
            return;
        }

        const w0 = Math.max(state.desiredAnnualConsumptionPayout || 0, 10000);
        const fW0 = simulateLastPrincipal(w0);
        const MAX_ABS_PAYOUT = 1e15;
        const MAX_DOUBLING = 55;

        let bracketLo;
        let bracketHi;

        if (fW0 < 0) {
            // Sluttverdi er allerede negativ ved utgangspunktet — søk mellom 0 og w0
            bracketLo = 0;
            bracketHi = w0;
        } else {
            let attempts = 0;
            bracketLo = w0;
            bracketHi = w0;
            while (simulateLastPrincipal(bracketHi) >= 0 && bracketHi < MAX_ABS_PAYOUT && attempts < MAX_DOUBLING) {
                bracketLo = bracketHi;
                bracketHi *= 2;
                attempts++;
            }
            const fTop = simulateLastPrincipal(bracketHi);
            if (fTop >= 0) {
                applyResult(Math.min(bracketHi, MAX_ABS_PAYOUT));
                return;
            }
        }

        let low = bracketLo;
        let high = bracketHi;
        const tolerance = 0.01;
        for (let i = 0; i < 150; i++) {
            if (high - low <= tolerance) break;
            const mid = (low + high) / 2;
            const v = simulateLastPrincipal(mid);
            if (!Number.isFinite(v)) {
                high = mid;
            } else if (v >= 0) {
                low = mid;
            } else {
                high = mid;
            }
        }
        applyResult(low);
    }, [state, prognosis.data.hovedstol]);

    /** Samme logikk som sideknappen «Utb.»: ved på lagres utgangspunkt, målsøk kjøres; ved av gjenopprettes verdier før målsøk og ringen fjernes. */
    const toggleGoalSeekAnnualPayout = useCallback(() => {
        setUtbToolButtonMarked((prev) => {
            const next = !prev;
            if (next) {
                utbBeforeGoalSeekRef.current = {
                    desiredAnnualConsumptionPayout: state.desiredAnnualConsumptionPayout,
                    desiredAnnualWealthTaxPayout: state.desiredAnnualWealthTaxPayout,
                    goalSeekPayoutResult: state.goalSeekPayoutResult,
                    goalSeekPayoutDrainFinalYear: state.goalSeekPayoutDrainFinalYear
                };
                goalSeekAnnualPayout();
            } else {
                const snap = utbBeforeGoalSeekRef.current;
                utbBeforeGoalSeekRef.current = null;
                if (snap) {
                    setState((s) => ({
                        ...s,
                        desiredAnnualConsumptionPayout: snap.desiredAnnualConsumptionPayout,
                        desiredAnnualWealthTaxPayout: snap.desiredAnnualWealthTaxPayout,
                        goalSeekPayoutResult: snap.goalSeekPayoutResult,
                        goalSeekPayoutDrainFinalYear: snap.goalSeekPayoutDrainFinalYear
                    }));
                }
            }
            return next;
        });
    }, [
        goalSeekAnnualPayout,
        setState,
        state.desiredAnnualConsumptionPayout,
        state.desiredAnnualWealthTaxPayout,
        state.goalSeekPayoutResult,
        state.goalSeekPayoutDrainFinalYear
    ]);

    // Målsøk: finn størrelse på Portefølje I som får porteføljen til å gå akkurat i null i siste utbetalingsår
    const goalSeekPortfolio1 = useCallback(() => {
        // Hvis ingen utbetalingsår, gjør ingenting
        const hasPayoutYears = (state.payoutYears || 0) > 0;
        if (!hasPayoutYears) return;

        const simulateLastPrincipal = (portfolio1Size) => {
            const p = calculatePrognosis({ 
                ...state, 
                initialPortfolioSize: portfolio1Size
            }, false, null);
            // Bruk sluttverdien etter avkastning og uttak i siste utbetalingsår
            // Dette sikrer at porteføljen går til null etter det spesifiserte antall år
            return p.finalPortfolioValue;
        };

        // Finn øvre grense med dobling
        let low = 0;
        let high = Math.max(state.initialPortfolioSize || 0, 1000000);
        let last = simulateLastPrincipal(high);
        let attempts = 0;
        while (last < 0 && high < 1000000000 && attempts < 20) {
            high *= 2;
            last = simulateLastPrincipal(high);
            attempts++;
        }

        // Hvis selv enorme verdier ikke holder, bruk det som øvre grense
        if (last < 0) {
            high = 1000000000; // Maks 1 mrd
        } else {
            // Binærsøk etter minste Portefølje I størrelse som gir ikke-negativ hovedstol i siste år
            for (let i = 0; i < 100; i++) {
                const mid = Math.round((low + high) / 2);
                if (mid === low || mid === high) break;
                const v = simulateLastPrincipal(mid);
                if (v >= 0) {
                    high = mid;
                } else {
                    low = mid;
                }
            }
        }
        // high er minste heltall som gir finalPortfolioValue >= 0
        const rounded = Math.round(high);
        const gref = portBeforeGoalSeekRef.current;
        if (gref && gref.pre && gref.post == null) {
            gref.post = {
                initialPortfolioSize: rounded,
                goalSeekPortfolio1Result: rounded,
            };
        }
        setState(s => ({ 
            ...s, 
            initialPortfolioSize: rounded,
            goalSeekPortfolio1Result: rounded,
            goalSeekPayoutDrainFinalYear: false
        }));
    }, [state, prognosis.data.hovedstol]);

    /** Samme logikk som sideknappen «Port.»: veksler på/av, kjører målsøk Portefølje I ved på, gjenoppretter ved av når uendret. */
    const toggleGoalSeekPortfolio1 = useCallback(() => {
        setPortToolButtonMarked((prev) => {
            const next = !prev;
            if (next) {
                portBeforeGoalSeekRef.current = {
                    pre: {
                        initialPortfolioSize: state.initialPortfolioSize,
                        goalSeekPortfolio1Result: state.goalSeekPortfolio1Result,
                    },
                    post: null,
                };
                goalSeekPortfolio1();
            } else {
                const snap = portBeforeGoalSeekRef.current;
                if (snap && snap.pre) {
                    const post = snap.post;
                    const resultEq = (a, b) =>
                        (Number(a) || 0) === (Number(b) || 0);
                    const unchangedSinceGoalSeek =
                        post != null &&
                        state.initialPortfolioSize === post.initialPortfolioSize &&
                        resultEq(state.goalSeekPortfolio1Result, post.goalSeekPortfolio1Result);
                    if (unchangedSinceGoalSeek) {
                        setState((s) => ({
                            ...s,
                            initialPortfolioSize: snap.pre.initialPortfolioSize,
                            goalSeekPortfolio1Result: snap.pre.goalSeekPortfolio1Result,
                        }));
                    }
                }
                portBeforeGoalSeekRef.current = null;
            }
            return next;
        });
    }, [goalSeekPortfolio1, setState, state.initialPortfolioSize, state.goalSeekPortfolio1Result]);

    const chartOptions = {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        elements: { bar: { borderSkipped: 'bottom' } },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => `År ${items[0].label}`,
                    label: (context) => {
                        const label = context.dataset.label || '';
                        if (label === 'Total utbetaling') {
                            const yearIdx = context.dataIndex ?? 0;
                            const nettoUtbetaling = prognosis?.data?.nettoUtbetaling?.[yearIdx] ?? 0;
                            const skattPaHendelser = prognosis?.data?.skatt2?.[yearIdx] ?? 0;
                            return `Total utbetaling: ${formatCurrency(nettoUtbetaling + skattPaHendelser)}`;
                        }
                        return `${label}: ${formatCurrency(context.raw)}`;
                    },
                    labelColor: (context) => {
                        if (context.dataset.label === 'Total utbetaling') {
                            return {
                                borderColor: CHART_COLORS.total_utbetaling,
                                backgroundColor: CHART_COLORS.total_utbetaling,
                            };
                        }
                    },
                    footer: (tooltipItems) => {
                        const yearIdx = tooltipItems?.[0]?.dataIndex ?? 0;
                        const hovedstol = (prognosis?.data?.hovedstol?.[yearIdx] ?? 0);
                        const avkastning = (prognosis?.data?.avkastning?.[yearIdx] ?? 0);
                        const sparing = (prognosis?.data?.sparing?.[yearIdx] ?? 0);
                        const hendelser = (prognosis?.data?.event_total?.[yearIdx] ?? 0);
                        const nettoUtbetaling = (prognosis?.data?.nettoUtbetaling?.[yearIdx] ?? 0);
                        const skattPaHendelser = (prognosis?.data?.skatt2?.[yearIdx] ?? 0);
                        const lopendeRenteskatt = (prognosis?.data?.renteskatt?.[yearIdx] ?? 0);

                        const sum = hovedstol + avkastning + sparing + hendelser + nettoUtbetaling + (state.taxCalculationEnabled ? (skattPaHendelser + lopendeRenteskatt) : 0);
                        return [`sum: ${formatCurrency(sum)}`];
                    },
                }
            }
        },
        scales: {
            x: { 
                stacked: true, 
                grid: { display: false }, 
                ticks: { 
                    color: SPWM_INK,
                    font: {
                        size: 12 // Økt med 20% fra 10 (10 * 1.2 = 12)
                    }
                } 
            },
            y: {
                stacked: true, 
                grid: { color: SPWM_GRID },
                ticks: { 
                    color: SPWM_INK, 
                    callback: (value) => `${(value / 1000000).toLocaleString('nb-NO')} MNOK`,
                    font: {
                        size: 12 // Økt med 20% fra 10 (10 * 1.2 = 12)
                    }
                }
            }
        }
    };
   
    const totalUtbetalingTooltipData = prognosis.labels.map(() => 0);

    const investmentChartData = {
        labels: prognosis.labels,
        datasets: withStackedTopBorderRadius([
            { label: 'Avkastning', data: prognosis.data.avkastning, backgroundColor: CHART_COLORS.avkastning, stack: 'portfolio' },
            { label: 'Årlig sparing', data: prognosis.data.sparing, backgroundColor: CHART_COLORS.sparing, stack: 'portfolio' },
            { label: 'Hovedstol', data: prognosis.data.hovedstol, backgroundColor: CHART_COLORS.hovedstol, stack: 'portfolio' },
            { label: 'Hendelser', data: prognosis.data.event_total, backgroundColor: CHART_COLORS.event_total_color, stack: 'portfolio' },
            { label: 'Netto utbetaling', data: prognosis.data.nettoUtbetaling, backgroundColor: CHART_COLORS.utbetaling_netto, stack: 'portfolio' },
            ...(state.taxCalculationEnabled ? [
                { label: 'Skatt på hendelser', data: prognosis.data.skatt2, backgroundColor: CHART_COLORS.skatt2, stack: 'portfolio' },
                { label: 'Total utbetaling', data: totalUtbetalingTooltipData, backgroundColor: CHART_COLORS.total_utbetaling, stack: 'portfolio' },
                { label: 'Løpende renteskatt', data: prognosis.data.renteskatt, backgroundColor: CHART_COLORS.renteskatt, stack: 'portfolio' },
            ] : [
                { label: 'Total utbetaling', data: totalUtbetalingTooltipData, backgroundColor: CHART_COLORS.total_utbetaling, stack: 'portfolio' },
            ])
        ]),
    };

    // Persist for Oppsummeringsrapport-fanen (samme tidsakse og søylediagram)
    if (prognosis && prognosis.labels && prognosis.labels.length) {
        MaalOgBehovState.latestPrognosisLabels = prognosis.labels;
        MaalOgBehovState.latestInvestmentChartData = investmentChartData;
        MaalOgBehovState.latestChartOptions = chartOptions;
    }

    // Høyoppløst eksport (1880×1450, 4:3) for PDF-modal – opprett chart når modal åpnes
    useEffect(() => {
        if (!showChartImageModal) return;
        const canvas = chartExportCanvasRef.current;
        if (!canvas || typeof Chart === 'undefined') return;
        let chartInstance = null;
        const raf = requestAnimationFrame(() => {
            const exportOptions = {
                ...chartOptions,
                responsive: false,
                maintainAspectRatio: false,
                interaction: { mode: null, intersect: false },
                plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false },
                    tooltip: { enabled: false },
                    title: {
                        display: true,
                        text: resolvedPanelTitle,
                        font: { size: 48, weight: 'bold' },
                        color: SPWM_NAVY,
                        padding: { top: 10, bottom: 20 }
                    }
                },
                scales: {
                    x: {
                        ...chartOptions.scales.x,
                        ticks: { ...chartOptions.scales.x.ticks, font: { size: 36 } }
                    },
                    y: {
                        ...chartOptions.scales.y,
                        ticks: { ...chartOptions.scales.y.ticks, font: { size: 36 } }
                    }
                }
            };
            chartInstance = new Chart(canvas, { type: 'bar', data: investmentChartData, options: exportOptions });
        });
        return () => {
            cancelAnimationFrame(raf);
            if (chartInstance) chartInstance.destroy();
        };
    }, [showChartImageModal]);

    const handleCopyChartImage = useCallback(() => {
        const canvas = chartExportCanvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => setChartImageCopied(true)).catch(() => {});
        }, 'image/png');
    }, []);

    useEffect(() => {
        if (!showChartImageModal) return;
        const onKey = (e) => { if (e.key === 'Escape') { setShowChartImageModal(false); setChartImageCopied(false); } };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showChartImageModal]);

    const investedCapitalChartData = {
        labels: prognosis.labels,
        datasets: [{ label: 'Innskutt kapital', data: prognosis.data.investedCapitalHistory, backgroundColor: CHART_COLORS.innskutt_kapital, borderColor: CHART_COLORS.innskutt_kapital, borderRadius: 4, borderSkipped: false }],
    };

    const capitalChartOptions = {
        ...chartOptions,
        scales: {
            ...chartOptions.scales,
            y: { ...chartOptions.scales.y, stacked: false }
        },
        plugins: {
            ...chartOptions.plugins,
            legend: { display: true, labels: { color: SPWM_INK } },
            tooltip: {
                ...chartOptions.plugins.tooltip,
                callbacks: {
                    title: () => '',
                    label: (context) => formatCurrency(context.parsed?.y ?? context.raw ?? 0),
                    footer: () => ''
                }
            }
        }
    };
   
    // --- Stacked bar for ALL years: Aksjer, Aksjeavkastning, Renter, Renteavkastning ---
    const labelsAllYears = useMemo(() => prognosis.labels, [prognosis.labels]); // Include 'start'
    const startValuesAllYears = useMemo(() => prognosis.data.hovedstol, [prognosis.data.hovedstol]);
    const stockPctAllYears = useMemo(() => prognosis.data.annualStockPercentages, [prognosis.data.annualStockPercentages]);

    // Start-of-year values (used only for computing returns)
    const startOfYearStockValues = useMemo(
        () => startValuesAllYears.map((startValue, i) => Math.round(startValue * (stockPctAllYears[i] / 100))),
        [startValuesAllYears, stockPctAllYears]
    );
    const startOfYearBondValues = useMemo(
        () => startValuesAllYears.map((startValue, i) => Math.round(startValue * (1 - stockPctAllYears[i] / 100))),
        [startValuesAllYears, stockPctAllYears]
    );

    // Fordeling: Uttak skal først redusere hovedstol (aksjer/renter), deretter avkastning. Avkastningen utbetales til slutt.
    const {
        principalStockSeries,
        principalBondSeries,
        stockReturnSeries,
        bondReturnSeries,
    } = useMemo(() => {
        const len = startValuesAllYears.length;
        const stockShareArr = stockPctAllYears.map(p => (p || 0) / 100);
        const bondShareArr = stockShareArr.map(s => 1 - s);

        // Inflow/outflow pr år (index matcher labelsAllYears)
        const sparing = prognosis.data.sparing;
        const events = prognosis.data.event_total;
        const netPayout = prognosis.data.nettoUtbetaling; // negative when outflow happens
        const eventTax = prognosis.data.skatt2 || [];   // negativ (skatt på hendelser)
        const bondTax = prognosis.data.renteskatt || []; // negativ (løpende renteskatt)

        const inflowArr = new Array(len).fill(0);
        const outflowArr = new Array(len).fill(0);
        for (let i = 0; i < len; i++) {
            inflowArr[i] = Math.max(0, (sparing[i] || 0)) + Math.max(0, (events[i] || 0));
            outflowArr[i] = (-Math.min(0, (events[i] || 0))) + (-Math.min(0, (netPayout[i] || 0)));
        }
        // Skatt betales ved årets start (som i Mål og behov). Kun uttak (hendelser + netto utbetaling) trekkes ved årets slutt.

        // Årlig bruttoavkastning pr aktivaklasse
        // Beregn avkastning individuelt for hver portefølje basert på deres faktiske verdi og aksjeandel
        const kpi = state.kpiRate / 100;
        const fee = state.advisoryFeeRate / 100;
        
        // Bruk simulerte avkastninger hvis Sim-knappen er aktiv
        const useSimulated = simButtonActive && activeSimulatedReturns && activeSimulatedReturns.stockReturns.length > 0;
       
        // Track portfolio values at start of each year (before returns) to calculate returns correctly
        let portfolio1Val = state.initialPortfolioSize || 0;
        let portfolio2Val = state.pensionPortfolioSize || 0;
        let portfolio3Val = state.additionalPensionAmount || 0;
       
        const aksjeAvkastningAnnual = new Array(len).fill(0);
        const renteAvkastningAnnual = new Array(len).fill(0);
       
        for (let i = 1; i < len; i++) {
            // Add savings to Portefølje I (if investment year)
            const isInvestmentYear = (i - 1) < (state.investmentYears || 0);
            if (isInvestmentYear && sparing[i] > 0) {
                portfolio1Val += sparing[i];
            }
           
            // Add event inflows to Portefølje I
            const eventInflow = Math.max(0, (events[i] || 0));
            if (eventInflow > 0) {
                portfolio1Val += eventInflow;
            }
           
            // Beregn avkastning FØR skatt (som i hovedprognosen)
            let stockRetRateForYear, bondRetRateForYear;
            if (useSimulated && (i - 1) < activeSimulatedReturns.stockReturns.length) {
                stockRetRateForYear = activeSimulatedReturns.stockReturns[i - 1] / 100;
                bondRetRateForYear = activeSimulatedReturns.bondReturns[i - 1] / 100;
            } else {
                stockRetRateForYear = state.stockReturnRate / 100;
                bondRetRateForYear = state.bondReturnRate / 100;
            }
            const bankRetRateForYear = state.bankDepositRate / 100;
           
            const p1StockPct = state.row1StockAllocation || 0;
            const p2StockPct = state.row2StockAllocation || 0;
           
            const p1StockValue = portfolio1Val * (p1StockPct / 100);
            const p1BondValue = portfolio1Val * ((100 - p1StockPct) / 100);
            const p1StockReturn = p1StockValue * (stockRetRateForYear - kpi - fee);
            const p1BondReturn = p1BondValue * (bondRetRateForYear - kpi - fee);
           
            const p2StockValue = portfolio2Val * (p2StockPct / 100);
            const p2BondValue = portfolio2Val * ((100 - p2StockPct) / 100);
            const p2StockReturn = p2StockValue * (stockRetRateForYear - kpi - fee);
            const p2BondReturn = p2BondValue * (bondRetRateForYear - kpi - fee);
           
            const p3BondReturn = portfolio3Val * (bankRetRateForYear - kpi - fee);
           
            aksjeAvkastningAnnual[i] = Math.round(p1StockReturn + p2StockReturn);
            renteAvkastningAnnual[i] = Math.round(p1BondReturn + p2BondReturn + p3BondReturn);
           
            // Oppdater porteføljeverdier med avkastning
            portfolio1Val += p1StockReturn + p1BondReturn;
            portfolio2Val += p2StockReturn + p2BondReturn;
            portfolio3Val += p3BondReturn;
           
            // Betal skatt ETTER avkastning (som i hovedprognosen)
            const taxThisYear = Math.abs(eventTax[i] || 0) + Math.abs(bondTax[i] || 0);
            if (taxThisYear > 0 && (portfolio1Val + portfolio2Val + portfolio3Val) > 0) {
                const tot = portfolio1Val + portfolio2Val + portfolio3Val;
                portfolio1Val = Math.max(0, portfolio1Val - taxThisYear * (portfolio1Val / tot));
                portfolio2Val = Math.max(0, portfolio2Val - taxThisYear * (portfolio2Val / tot));
                portfolio3Val = Math.max(0, portfolio3Val - taxThisYear * (portfolio3Val / tot));
            }
           
            // Handle withdrawals etter skatt
            const totalOut = outflowArr[i];
            if (totalOut > 0 && (portfolio1Val + portfolio2Val + portfolio3Val) > 0) {
                const totalPortfolio = portfolio1Val + portfolio2Val + portfolio3Val;
                const p1Share = portfolio1Val / totalPortfolio;
                const p2Share = portfolio2Val / totalPortfolio;
                const p3Share = portfolio3Val / totalPortfolio;
                portfolio1Val = Math.max(0, portfolio1Val - totalOut * p1Share);
                portfolio2Val = Math.max(0, portfolio2Val - totalOut * p2Share);
                portfolio3Val = Math.max(0, portfolio3Val - totalOut * p3Share);
            }
        }

        // Tilstand over tid
        const stockPrincipal = new Array(len).fill(0);
        const bondPrincipal = new Array(len).fill(0);
        const stockReturn = new Array(len).fill(0);
        const bondReturn = new Array(len).fill(0);

        // Startverdier (første rad = 'start')
        // Calculate individually for each portfolio
        const p1Start = state.initialPortfolioSize || 0;
        const p2Start = state.pensionPortfolioSize || 0;
        const p3Start = state.additionalPensionAmount || 0;
        const p1StockPct = state.row1StockAllocation || 0;
        const p2StockPct = state.row2StockAllocation || 0;
        const p3StockPct = 0; // Likviditetsfond is always 0% stocks
       
        stockPrincipal[0] = Math.round(p1Start * (p1StockPct / 100) + p2Start * (p2StockPct / 100) + p3Start * (p3StockPct / 100));
        bondPrincipal[0] = Math.round(p1Start * ((100 - p1StockPct) / 100) + p2Start * ((100 - p2StockPct) / 100) + p3Start * ((100 - p3StockPct) / 100));
        stockReturn[0] = 0;
        bondReturn[0] = 0;

        // Hjelper for proporsjonal fordeling fra to "bøtter"
        const allocateFromTwo = (amount, aAvail, bAvail) => {
            const totalAvail = aAvail + bAvail;
            if (amount <= 0 || totalAvail <= 0) return [0, 0];
            if (amount >= totalAvail) return [aAvail, bAvail];
            let aTake = (aAvail / totalAvail) * amount;
            if (aTake > aAvail) aTake = aAvail;
            let bTake = amount - aTake;
            if (bTake > bAvail) {
                bTake = bAvail;
                aTake = amount - bTake;
            }
            return [aTake, bTake];
        };

        const deductPrincipalThenReturn = (amount, principal, ret) => {
            const takePrincipal = Math.min(principal, amount);
            const takeReturn = Math.min(ret, amount - takePrincipal);
            return [principal - takePrincipal, ret - takeReturn];
        };

        const deductReturnThenPrincipal = (amount, principal, ret) => {
            const takeReturn = Math.min(ret, amount);
            const takePrincipal = Math.min(principal, amount - takeReturn);
            return [principal - takePrincipal, ret - takeReturn];
        };

        for (let i = 1; i < len; i++) {
            let sPrin = Math.max(0, stockPrincipal[i - 1]);
            let bPrin = Math.max(0, bondPrincipal[i - 1]);
            let sRet = Math.max(0, stockReturn[i - 1]);
            let bRet = Math.max(0, bondReturn[i - 1]);

            // 1) Legg til innskudd (inflow) i hovedstol
            const savingsAmount = sparing[i] || 0;
            const eventInflow = Math.max(0, (events[i] || 0));
            const portfolio1StockPct = state.row1StockAllocation || 0;
            const savingsToStocks = savingsAmount * (portfolio1StockPct / 100);
            const savingsToBonds = savingsAmount - savingsToStocks;
            const eventToStocks = eventInflow * (portfolio1StockPct / 100);
            const eventToBonds = eventInflow * ((100 - portfolio1StockPct) / 100);
            sPrin += savingsToStocks + eventToStocks;
            bPrin += savingsToBonds + eventToBonds;

            // 2) Legg til årlig bruttoavkastning FØR skatt (som i hovedprognosen)
            sRet += (aksjeAvkastningAnnual[i] || 0);
            bRet += (renteAvkastningAnnual[i] || 0);

            // 3) Betal skatt ETTER avkastning.
            // Løpende renteskatt skal først redusere renteavkastning, slik at allerede beskattet
            // avkastning ikke blir liggende igjen som egen bøtte i fordelingsgrafen.
            const eventTaxAmt = Math.abs(eventTax[i] || 0);
            const bondTaxAmt = Math.abs(bondTax[i] || 0);
            if (eventTaxAmt > 0) {
                if (state.investorType === 'AS') {
                    const [taxFromStock, taxFromBond] = allocateFromTwo(eventTaxAmt, sPrin + sRet, bPrin + bRet);
                    [sPrin, sRet] = deductReturnThenPrincipal(taxFromStock, sPrin, sRet);
                    [bPrin, bRet] = deductReturnThenPrincipal(taxFromBond, bPrin, bRet);
                } else {
                    [sPrin, sRet] = deductReturnThenPrincipal(eventTaxAmt, sPrin, sRet);
                }
            }
            if (bondTaxAmt > 0) {
                const takeFromBondReturn = Math.min(bRet, bondTaxAmt);
                const takeFromBondPrincipal = Math.min(bPrin, bondTaxAmt - takeFromBondReturn);
                bRet -= takeFromBondReturn;
                bPrin -= takeFromBondPrincipal;
            }

            // 4) Trekk ut uttak (hendelser + netto utbetaling) – etter skatt
            const totalOut = outflowArr[i];
            const [takeFromStockTotal, takeFromBondTotal] = allocateFromTwo(totalOut, sPrin + sRet, bPrin + bRet);
            [sPrin, sRet] = deductReturnThenPrincipal(takeFromStockTotal, sPrin, sRet);
            [bPrin, bRet] = deductReturnThenPrincipal(takeFromBondTotal, bPrin, bRet);

            stockReturn[i] = Math.round(sRet);
            bondReturn[i] = Math.round(bRet);
            stockPrincipal[i] = Math.round(sPrin);
            bondPrincipal[i] = Math.round(bPrin);
        }

        return {
            principalStockSeries: stockPrincipal,
            principalBondSeries: bondPrincipal,
            stockReturnSeries: stockReturn,
            bondReturnSeries: bondReturn,
        };
    }, [startValuesAllYears.length, stockPctAllYears, prognosis.data.sparing, prognosis.data.event_total, prognosis.data.nettoUtbetaling, prognosis.data.skatt2, prognosis.data.renteskatt, startOfYearStockValues, startOfYearBondValues, state.stockReturnRate, state.bondReturnRate, state.bankDepositRate, state.initialPortfolioSize, state.investorType, state.deferredInterestTax, simButtonActive, activeSimulatedReturns]);

    // Beregn akkumulert avkastning basert på simulerte avkastninger og aksjeandel
    const accumulatedReturnData = useMemo(() => {
        if (!savedSimulatedReturns.stockReturns.length || !prognosis.data.annualStockPercentages.length) {
            return { labels: [], indexValues: [], percentValues: [], krValues: [] };
        }

        const extraDisplayYear = (state.payoutYears > 0) ? 1 : 0;
        const totalYears = state.investmentYears + state.payoutYears + extraDisplayYear;
        const labels = ['start', ...Array.from({ length: totalYears }, (_, i) => START_YEAR + i)];
        const indexValues = [];
        const percentValues = [];
        const krValues = [];
        let accumulatedIndex = 100; // Start med indeks 100

        // Legg til startverdiene
        indexValues.push(accumulatedIndex);
        percentValues.push(0); // 0% ved start
        krValues.push(0); // 0 kr ved start

        for (let i = 0; i < totalYears; i++) {
            if (i < savedSimulatedReturns.stockReturns.length && i < savedSimulatedReturns.bondReturns.length) {
                // annualStockPercentages har "start" verdi på indeks 0, så bruk i+1 for årlige verdier
                const stockPercentageIndex = i + 1;
                const stockReturn = savedSimulatedReturns.stockReturns[i] / 100; // Konverter fra prosent til desimal
                const bondReturn = savedSimulatedReturns.bondReturns[i] / 100;
                const stockPercentage = stockPercentageIndex < prognosis.data.annualStockPercentages.length 
                    ? (prognosis.data.annualStockPercentages[stockPercentageIndex] || 0) / 100
                    : (prognosis.data.annualStockPercentages[prognosis.data.annualStockPercentages.length - 1] || 0) / 100;
                const bondPercentage = 1 - stockPercentage;

                // Vektet avkastning basert på aksjeandel
                const weightedReturn = (stockReturn * stockPercentage) + (bondReturn * bondPercentage);
                
                // Akkumuler: multipliser med (1 + avkastning)
                accumulatedIndex = accumulatedIndex * (1 + weightedReturn);
            }
            
            // Beregn prosentvis akkumulert avkastning (fra startverdi 100)
            const percentAccumulated = ((accumulatedIndex / 100) - 1) * 100;
            
            // Hent årlig avkastning i kr fra stockReturnSeries og bondReturnSeries
            // Disse arrays starter med indeks 0 ("start"), så vi bruker i+1 for årene
            const yearIndex = i + 1;
            let annualReturnKr = 0;
            if (yearIndex < stockReturnSeries.length && yearIndex < bondReturnSeries.length) {
                annualReturnKr = (stockReturnSeries[yearIndex] || 0) + (bondReturnSeries[yearIndex] || 0);
            }
            
            indexValues.push(accumulatedIndex);
            percentValues.push(percentAccumulated);
            krValues.push(annualReturnKr);
        }

        return { labels, indexValues, percentValues, krValues };
    }, [savedSimulatedReturns, prognosis.data.annualStockPercentages, state.investmentYears, state.payoutYears, stockReturnSeries, bondReturnSeries]);

    const stackedAllYearsData = useMemo(() => ({
        labels: labelsAllYears,
        datasets: withStackedTopBorderRadius([
            { label: 'Aksjer', data: principalStockSeries, backgroundColor: CHART_COLORS.aksjer_principal, stack: 'allYears' },
            { label: 'Aksjeavkastning', data: stockReturnSeries, backgroundColor: CHART_COLORS.aksjer_avkastning, stack: 'allYears' },
            { label: 'Renter', data: principalBondSeries, backgroundColor: CHART_COLORS.renter_principal, stack: 'allYears' },
            { label: 'Renteavkastning', data: bondReturnSeries, backgroundColor: CHART_COLORS.renter_avkastning, stack: 'allYears' },
        ]),
    }), [labelsAllYears, principalStockSeries, stockReturnSeries, principalBondSeries, bondReturnSeries]);

    const stackedAllYearsOptions = useMemo(() => ({
        ...chartOptions,
        plugins: { ...chartOptions.plugins, legend: { display: true, labels: { color: SPWM_INK } } },
        scales: {
            x: { ...chartOptions.scales.x, stacked: true },
            y: { ...chartOptions.scales.y, stacked: true },
        },
    }), [chartOptions]);

    // Kontroll: Sum Mål og behov = Sum Fordeling (Aksjer + Aksjeavkastning + Renter + Renteavkastning) per år
    const sumControl2028 = useMemo(() => {
        const yearStr = '2028';
        const idx = prognosis.labels ? prognosis.labels.indexOf(yearStr) : -1;
        if (idx < 0) return null;
        const d = prognosis.data;
        const sumMaal = (d.hovedstol[idx] || 0) + (d.avkastning[idx] || 0) + (d.sparing[idx] || 0) + (d.event_total[idx] || 0) + (d.nettoUtbetaling[idx] || 0) + (d.skatt2[idx] || 0) + (d.renteskatt[idx] || 0);
        const sumFordeling = (principalStockSeries[idx] || 0) + (stockReturnSeries[idx] || 0) + (principalBondSeries[idx] || 0) + (bondReturnSeries[idx] || 0);
        const aksjerPlusAvk = (principalStockSeries[idx] || 0) + (stockReturnSeries[idx] || 0);
        return { year: yearStr, sumMaal, sumFordeling, aksjerPlusAvk, match: Math.abs(sumMaal - sumFordeling) < 1 };
    }, [prognosis.labels, prognosis.data, principalStockSeries, stockReturnSeries, principalBondSeries, bondReturnSeries]);

    // Calculate stock portion percentage year by year
    const stockPortionPercentageData = useMemo(() => {
        const len = principalStockSeries.length;
        const percentages = [];
        
        for (let i = 0; i < len; i++) {
            const stockTotal = principalStockSeries[i] + stockReturnSeries[i];
            const bondTotal = principalBondSeries[i] + bondReturnSeries[i];
            const totalPortfolio = stockTotal + bondTotal;
            
            if (totalPortfolio > 0) {
                percentages.push(Math.round((stockTotal / totalPortfolio) * 100));
            } else {
                percentages.push(0);
            }
        }
        
        return percentages;
    }, [principalStockSeries, stockReturnSeries, principalBondSeries, bondReturnSeries]);

    const stockPortionChartData = useMemo(() => ({
        labels: labelsAllYears,
        datasets: [{
            label: 'Aksjeandel',
            data: stockPortionPercentageData,
            borderColor: CHART_COLORS.aksjer_principal,
            backgroundColor: CHART_COLORS.aksjer_principal,
            borderWidth: 3,
            fill: true,
            gradientFill: true,
            tension: 0.5,
            pointRadius: 0,
            pointHoverRadius: 7,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: CHART_COLORS.aksjer_principal,
            pointBorderWidth: 3,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: CHART_COLORS.aksjer_principal,
            pointHoverBorderWidth: 3,
            cubicInterpolationMode: 'monotone',
            shadowOffsetX: 0,
            shadowOffsetY: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(102, 204, 221, 0.3)',
        }],
    }), [labelsAllYears, stockPortionPercentageData]);

    const stockPortionChartOptions = useMemo(() => ({
        ...chartOptions,
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 1500,
            easing: 'easeInOutQuart',
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            ...chartOptions.plugins,
            title: {
                display: true,
                text: 'Aksjeandel av totalportefølje',
                color: '#4A6D8C',
                font: {
                    size: 18,
                    weight: '900',
                    family: 'Whitney, sans-serif'
                },
                padding: {
                    top: 8,
                    bottom: 16
                },
                position: 'top'
            },
            legend: { 
                display: true, 
                labels: { 
                    color: SPWM_INK,
                    font: {
                        size: 13,
                        weight: '500'
                    },
                    padding: 10,
                    usePointStyle: true,
                    pointStyle: 'circle'
                } 
            },
            tooltip: {
                ...chartOptions.plugins.tooltip,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#4A6D8C',
                bodyColor: '#333333',
                borderColor: '#DDDDDD',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    title: (items) => `År ${items[0].label}`,
                    label: (context) => `Aksjeandel: ${context.raw}%`,
                    labelColor: () => ({
                        borderColor: CHART_COLORS.aksjer_principal,
                        backgroundColor: CHART_COLORS.aksjer_principal,
                    }),
                }
            }
        },
        scales: {
            x: { 
                ...chartOptions.scales.x,
                stacked: false,
                offset: true,
                ticks: {
                    ...chartOptions.scales.x.ticks,
                    align: 'center',
                    maxRotation: 0,
                    minRotation: 0
                }
            },
            y: {
                ...chartOptions.scales.y,
                stacked: false,
                min: 0,
                max: 100,
                grid: {
                    display: true,
                    color: 'rgba(221, 221, 221, 0.3)',
                    drawBorder: false,
                },
                ticks: {
                    ...chartOptions.scales.y.ticks,
                    color: '#666666',
                    font: {
                        size: 11
                    },
                    callback: (value) => `${value}%`,
                    stepSize: 20,
                },
                padding: {
                    top: 0,
                    bottom: 0
                }
            },
        },
        elements: {
            line: {
                borderCapStyle: 'round',
                borderJoinStyle: 'round',
                shadowColor: 'rgba(102, 204, 221, 0.4)',
                shadowBlur: 6,
                shadowOffsetY: 2,
            },
            point: {
                hoverRadius: 8,
                hoverBorderWidth: 3,
            }
        },
    }), [chartOptions]);
   
    const totalYears = state.investmentYears + state.payoutYears;
    const maxEventYear = START_YEAR + totalYears - 1;

    // --- Assumptions modal: four columns with stock/rente share ---
    const assumptionsBars = React.useMemo(() => {
        const p1 = Math.max(0, state.initialPortfolioSize || 0);
        const p2 = Math.max(0, state.pensionPortfolioSize || 0);
        const lf = Math.max(0, state.additionalPensionAmount || 0);
        const total = p1 + p2 + lf;

        const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

        const p1Stock = pct(state.row1StockAllocation, 100); // row values already in %
        const p2Stock = pct(state.row2StockAllocation, 100);
        const lfStock = 0; // Likviditetsfond = 100% renter

        const totalStock = (total > 0)
            ? Math.round(((p1 * p1Stock) + (p2 * p2Stock) + (lf * lfStock)) / total)
            : 0;

        const bars = [];
        if (p1 > 0) bars.push({ key: 'p1', label: resolvePortfolio1Name(state.portfolio1Name), stockPct: p1Stock, color: FORUTSETNING_AKSJE_P1 });
        if (p2 > 0) bars.push({ key: 'p2', label: resolvePortfolio2Name(state.portfolio2Name), stockPct: p2Stock, color: FORUTSETNING_AKSJE_P2 });
        if (lf > 0) bars.push({ key: 'lf', label: 'Likviditetsfond', stockPct: lfStock, color: FORUTSETNING_RENTEPORTEFOLJE });
        // Totalportefølje vises alltid
        bars.push({ key: 'tot', label: 'Totalportefølje', stockPct: totalStock, color: CHART_COLORS.hovedstol });
        return bars;
    }, [state.initialPortfolioSize, state.pensionPortfolioSize, state.additionalPensionAmount, state.row1StockAllocation, state.row2StockAllocation, state.portfolio1Name, state.portfolio2Name]);

    // Fixed-order slots for original view, keep positions even if some portfolios are zero
    const assumptionSlots = React.useMemo(() => {
        const p1 = Math.max(0, state.initialPortfolioSize || 0);
        const p2 = Math.max(0, state.pensionPortfolioSize || 0);
        const lf = Math.max(0, state.additionalPensionAmount || 0);
        const total = p1 + p2 + lf;
        const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);
        const p1Stock = pct(state.row1StockAllocation, 100);
        const p2Stock = pct(state.row2StockAllocation, 100);
        const lfStock = 0;
        const totalStock = (total > 0)
            ? Math.round(((p1 * p1Stock) + (p2 * p2Stock) + (lf * lfStock)) / total)
            : 0;

        return [
            { key: 'p1', label: resolvePortfolio1Name(state.portfolio1Name), stockPct: p1Stock, color: FORUTSETNING_AKSJE_P1, present: p1 > 0 },
            { key: 'p2', label: resolvePortfolio2Name(state.portfolio2Name), stockPct: p2Stock, color: FORUTSETNING_AKSJE_P2, present: p2 > 0 },
            { key: 'lf', label: 'Likviditetsfond', stockPct: lfStock, color: FORUTSETNING_RENTEPORTEFOLJE, present: lf > 0 },
            { key: 'tot', label: 'Totalportefølje', stockPct: totalStock, color: CHART_COLORS.hovedstol, present: true },
        ];
    }, [state.initialPortfolioSize, state.pensionPortfolioSize, state.additionalPensionAmount, state.row1StockAllocation, state.row2StockAllocation, state.portfolio1Name, state.portfolio2Name]);

    const loanImportParsed = parseLoanCalculatorInput(loanImportText);

    useEffect(() => {
        if (!showLoanImportModal) return;
        const onKey = (e) => { if (e.key === 'Escape') setShowLoanImportModal(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showLoanImportModal]);

    return (
        <div className="maal-og-behov-tab font-sans min-h-full w-full box-border">
            <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-6" style={{ paddingRight: '2rem' }}>

                <div className="relative">
                    <div className="panel bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col overflow-hidden w-full">
                    {editingTitle ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={resolvedPanelTitle}
                            onChange={e => setPanelTitle(e.target.value)}
                            onBlur={() => setEditingTitle(false)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') setEditingTitle(false);
                                if (e.key === 'Escape') {
                                    setPanelTitle(titleBeforeEditRef.current || MAAL_PANEL_TITLE_DEFAULT);
                                    setEditingTitle(false);
                                }
                            }}
                            className="typo-h1 text-center maal-panel-title maal-panel-title-editable mb-4 w-full bg-transparent border-b-2 outline-none"
                        />
                    ) : (
                        <h1
                            className="typo-h1 text-center maal-panel-title mb-4 cursor-pointer hover:opacity-70 transition-opacity"
                            onDoubleClick={() => {
                                titleBeforeEditRef.current = resolvedPanelTitle;
                                setEditingTitle(true);
                            }}
                            title="Dobbelklikk for å endre tittel"
                        >{resolvedPanelTitle}</h1>
                    )}
                    <div className="relative h-[500px]" style={{ paddingRight: '0.5rem' }}>
                        <Bar options={chartOptions} data={investmentChartData} />
                    </div>
                    <CustomLegend items={state.taxCalculationEnabled ? LEGEND_DATA : LEGEND_DATA.filter(i => !['Skatt på hendelser','Løpende renteskatt'].includes(i.label))} />
                    </div>
                    
                    {/* Tre knapper til høyre - utenfor rammen */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center" style={{ transform: 'translateX(calc(100% + 1rem)) translateY(-50%)' }}>
                        {/* Sim */}
                        <button
                            type="button"
                            title="Trykk her og aktiver en simulering knyttet til avkastning i hele perioden. Trykk en gang til og simuleringen skrus av"
                            onClick={() => {
                                const newActive = !simButtonActive;
                                setSimButtonActive(newActive);
                                if (newActive) {
                                    setSimulationKey(prev => prev + 1);
                                }
                            }}
                            className={`${simButtonActive ? 'bg-[#66CC99] text-white mbh-side-tool-active' : 'bg-white border border-[#DDDDDD] text-[#333333]'} shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-[opacity,box-shadow] relative outline-none`}
                        >
                            <span className={`text-sm font-bold ${!simButtonActive ? 'line-through opacity-70' : ''}`}>sim</span>
                        </button>
                        
                        {/* Målsøk sparing */}
                        <button
                            type="button"
                            title="Aktiverer målsøk sparing. Denne funksjonen beregner hvor mye du må spare årlig i investeringsperioden for at porteføljen skal gå i null i siste år av utbetalingsperioden"
                            onClick={toggleGoalSeekAnnualSavings}
                            className={`bg-[#999999] text-white shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-[opacity,box-shadow] outline-none ${spToolButtonMarked ? 'mbh-side-tool-active' : ''}`}
                        >
                            <span className="text-sm font-bold">Sp.</span>
                        </button>
                        
                        {/* Målsøk utbetaling */}
                        <button
                            type="button"
                            title="Aktiverer Målsøk utbetaling. Har du valgt antall år utbetaling, vil denne funksjonen beregne hvor mye du maksimalt kan ta ut hvert år i denne perioden før porteføljen er tømt. Trykk igjen for å gå tilbake til verdiene før målsøk."
                            onClick={toggleGoalSeekAnnualPayout}
                            className={`bg-[#66CC99] text-white shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-[opacity,box-shadow] outline-none ${utbToolButtonMarked ? 'mbh-side-tool-active' : ''}`}
                        >
                            <span className="text-xs font-bold">Utb.</span>
                        </button>
                        
                        {/* Målsøk Portefølje I */}
                        <button
                            type="button"
                            title="Denne funksjonen beregner hvor stor Portefølje I må være for å tilfredstille det du har lagt inn av utbetalinger i utbetalingsperioden."
                            onClick={toggleGoalSeekPortfolio1}
                            className={`bg-[#4A6D8C] text-white shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-[opacity,box-shadow] outline-none ${portToolButtonMarked ? 'mbh-side-tool-active' : ''}`}
                        >
                            <span className="text-xs font-bold">Port.</span>
                        </button>
                    </div>
                </div>

                {/* Inputfelt for porteføljestørrelse, årlig sparing og aksjeandel */}
                <div className="relative w-full" style={{ marginTop: '-24px' }}>
                    <div className="absolute inset-0 z-0 bg-white border border-[#DDDDDD] rounded-xl pointer-events-none"></div>
                    <div className="mbh-forvaltning-grid relative z-10">
                        <div className="mbh-fv-head-l">
                            <h2 className="typo-h2 text-[#4A6D8C]">Samlet forvaltning</h2>
                            <button
                                onClick={() => setShowAssumptionsGraphic(true)}
                                className="absolute top-0 right-0 bg-white hover:bg-gray-50 text-[#4A6D8C] rounded-xl p-2.5 shadow-sm border border-[#DDDDDD]"
                                title="Vis grafikk"
                                aria-label="Vis grafikk"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h6v6H4z"></path>
                                    <path d="M14 4h6v6h-6z"></path>
                                    <path d="M4 14h6v6H4z"></path>
                                    <path d="M14 14h6v6h-6z"></path>
                                </svg>
                            </button>
                        </div>
                        <h2 className="mbh-fv-head-r typo-h2 text-[#4A6D8C]">Aksjeandel</h2>

                        <input
                            type="text"
                            className="mbh-fv-lab1 typo-label text-[#333333]/80 bg-transparent border-none outline-none w-full p-0 m-0"
                            value={state.portfolio1Name}
                            onChange={(e) => handleStateChange('portfolio1Name', e.target.value)}
                            placeholder={PORTFOLIO1_NAME_DEFAULT}
                            aria-label={`Navn på ${PORTFOLIO1_NAME_DEFAULT}`}
                        />
                        <div className="mbh-fv-sld1">
                            <SliderInput hideLabel id="initialPortfolioSize" label="Portefølje I" value={state.initialPortfolioSize} min={0} max={1000000000} step={250000} onChange={handleStateChange} isCurrency noKrSuffix allowDirectInput thumbColor="#0A5EDC" />
                        </div>
                        <div className="mbh-fv-btn1">
                            <div className="mbh-fv-btn-row">
                                {STOCK_ALLOCATION_OPTIONS.map(opt => (
                                    <button key={`row1-${opt.value}`} onClick={() => handleStateChange('row1StockAllocation', opt.value)} className={`${state.row1StockAllocation === opt.value ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100 shadow-md'} rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5`} style={{ height: '41.76px' }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input
                            type="text"
                            className="mbh-fv-lab2 typo-label text-[#333333]/80 bg-transparent border-none outline-none w-full p-0 m-0"
                            value={state.portfolio2Name}
                            onChange={(e) => handleStateChange('portfolio2Name', e.target.value)}
                            placeholder={PORTFOLIO2_NAME_DEFAULT}
                            aria-label={`Navn på ${PORTFOLIO2_NAME_DEFAULT}`}
                        />
                        <div className="mbh-fv-sld2">
                            <SliderInput hideLabel id="pensionPortfolioSize" label="Portefølje II" value={state.pensionPortfolioSize} min={0} max={1000000000} step={500000} onChange={handleStateChange} isCurrency noKrSuffix allowDirectInput thumbColor="#3B7EE3" />
                        </div>
                        <div className="mbh-fv-btn2">
                            <div className="mbh-fv-btn-row">
                                {STOCK_ALLOCATION_OPTIONS.map(opt => (
                                    <button key={`row2-${opt.value}`} onClick={() => handleStateChange('row2StockAllocation', opt.value)} className={`${state.row2StockAllocation === opt.value ? 'bg-[#3388CC] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100 shadow-md'} rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5`} style={{ height: '41.76px' }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label htmlFor="additionalPensionAmount" className="mbh-fv-lab3 typo-label text-[#333333]/80">Bankinnskudd / Likviditetsfond</label>
                        <div className="mbh-fv-sld3">
                            <SliderInput hideLabel id="additionalPensionAmount" label="Bankinnskudd / Likviditetsfond" value={state.additionalPensionAmount} min={0} max={1000000000} step={250000} onChange={handleStateChange} isCurrency noKrSuffix allowDirectInput thumbColor="#99BEF5" />
                        </div>
                        <div className="mbh-fv-btn3">
                            <div className="mbh-fv-btn-row">
                                <button type="button" disabled className="bg-[#88CCEE] text-white shadow-lg rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium cursor-default" style={{ height: '41.76px' }}>
                                    100% Renter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Målsøk seksjon - utenfor den ytre rammen */}
                <div className="relative" style={{ marginTop: '0.445875rem' }}>
                    <EyeToggle visible={showGoalSeek} onToggle={() => setShowGoalSeek(v => !v)} title="Skjul/vis Målsøk" />
                    {showGoalSeek && (
                        <div className="bg-white border border-[#DDDDDD] rounded-lg" style={{ paddingTop: '1.5rem', paddingRight: '1rem', paddingBottom: '1rem', paddingLeft: '1.5rem' }}>
                            <div className="hidden xl:flex items-center gap-3 w-full mb-4">
                                <h2 className="typo-h2 text-[#4A6D8C] flex-shrink-0" style={{ width: '112px' }}>Målsøk</h2>
                                <div style={{ width: '25%', flex: '0 0 auto' }}></div>
                                <div style={{ width: '112px', flex: '0 0 auto' }}></div>
                                <div style={{ minWidth: '98px', flex: '0 0 auto' }}></div>
                                <div style={{ width: '112px', flex: '0 0 auto' }}></div>
                                <div style={{ minWidth: '98px', flex: '0 0 auto' }}></div>
                                <h2 className="typo-h2 text-[#4A6D8C] flex-shrink-0" style={{ width: '112px', marginLeft: '10px' }}>Simuleringer/grafikk</h2>
                            </div>
                            <h2 className="xl:hidden typo-h2 text-[#4A6D8C] mb-4">Målsøk</h2>
                    <button
                        type="button"
                        onClick={toggleGoalSeekAnnualSavings}
                        title="Ved å trykke på denne vil modellen automatisk beregne hvilken årlig sparing du trenger for at porteføljen ikke skal gå i minus det siste året av perioden. Om mål og behov ikke går i minus, vil denne knappen ikke ha en funksjon."
                        aria-label="Ved å trykke på denne vil modellen automatisk beregne hvilken årlig sparing du trenger for at porteføljen ikke skal gå i minus det siste året av perioden. Om mål og behov ikke går i minus, vil denne knappen ikke ha en funksjon."
                        className={`xl:hidden h-20 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5 ${spToolButtonMarked ? 'bg-[#888888] text-white border border-[#888888] mbh-side-tool-active shadow-md' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100 shadow-md'}`}
                    >
                        Målsøk sparing
                    </button>
                    <div className="hidden xl:flex items-center gap-3 w-full">
                    <button
                        type="button"
                        onClick={toggleGoalSeekAnnualSavings}
                        title="Ved å trykke på denne vil modellen automatisk beregne hvilken årlig sparing du trenger for at porteføljen ikke skal gå i minus det siste året av perioden. Om mål og behov ikke går i minus, vil denne knappen ikke ha en funksjon."
                        aria-label="Ved å trykke på denne vil modellen automatisk beregne hvilken årlig sparing du trenger for at porteføljen ikke skal gå i minus det siste året av perioden. Om mål og behov ikke går i minus, vil denne knappen ikke ha en funksjon."
                        className={`bg-[#888888] border border-[#DDDDDD] text-white hover:bg-[#777777] h-16 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md flex-shrink-0 ${spToolButtonMarked ? 'mbh-side-tool-active' : ''}`}
                        style={{ width: '112px', height: '64px', flex: '0 0 auto' }}
                    >
                        Målsøk<br />sparing
                    </button>
                    <div className="bg-white border border-[#DDDDDD] rounded-lg h-20 flex items-center justify-center shadow-md" style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem', width: '17.5%', flex: '0 0 auto' }}>
                        <div style={{ width: '100%' }}>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="annualSavings" className="typo-label text-[#333333]/80 whitespace-nowrap normal-case">Årlig sparing</label>
                                <div className="relative flex items-center gap-2">
                                    <input
                                        type="range"
                                        id="annualSavings"
                                        name="annualSavings"
                                        min={0}
                                        max={5000000}
                                        step={10000}
                                        value={state.annualSavings}
                                        onChange={(e) => handleStateChange('annualSavings', parseFloat(e.target.value))}
                                        className="flex-1 h-2 bg-[#DDDDDD] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#888888] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                                        style={{ '--thumb-color': '#888888' }}
                                    />
                                    <span className="typo-paragraph text-[#333333] text-right whitespace-nowrap" style={{ minWidth: '80px' }}>
                                        {formatCurrency(state.annualSavings)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={toggleGoalSeekAnnualPayout}
                        title="Ved å trykke på denne, vil modellen beregne hva du maksimalt kan ta ut netto hvert år i hele utbetalingsperioden. Trykk igjen for å gjenopprette verdiene fra før målsøk."
                        aria-label="Ved å trykke på denne, vil modellen beregne hva du maksimalt kan ta ut netto hvert år i hele utbetalingsperioden. Dette forutsetter at antall år med utbetaling er mer enn 0. Husk at det er netto utbetalinger og at modellen automatisk beregner skatteregningen som et tillegg. Skatteberegningen kan du også skru av, da vil netto og brutto være identisk. Trykk igjen for å gå tilbake til verdiene før målsøk."
                        className={`bg-[#66CCDD] border border-[#DDDDDD] text-white hover:bg-[#3388CC] h-16 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md flex-shrink-0 ${utbToolButtonMarked ? 'mbh-side-tool-active' : ''}`}
                        style={{ width: '112px', height: '64px', flex: '0 0 auto' }}
                    >
                        Målsøk<br />utbetaling
                    </button>
                    <div className="bg-white border border-[#DDDDDD] rounded-lg h-14 flex items-center justify-center px-4 flex-shrink-0 shadow-md" style={{ minWidth: '98px' }}>
                        <span className="typo-paragraph text-[#333333] whitespace-nowrap text-center text-sm">
                            {formatCurrency(state.goalSeekPayoutResult || 0)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={toggleGoalSeekPortfolio1}
                        title="Ved å trykke på denne vil modellen beregne hvor stor Portefølje I må være, for at porteføljen totalt sett ikke skal gå i minus siste år av utbetalingsperioden. Om porteføljen ikke går i minus siste år, vil denne knappen ikke ha en funksjon."
                        aria-label="Ved å trykke på denne vil modellen beregne hvor stor Portefølje I må være, for at porteføljen totalt sett ikke skal gå i minus siste år av utbetalingsperioden. Om porteføljen ikke går i minus siste år, vil denne knappen ikke ha en funksjon."
                        className={`bg-[#4A6D8C] border border-[#DDDDDD] text-white hover:bg-[#3A5D7C] h-16 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md flex-shrink-0 ${portToolButtonMarked ? 'mbh-side-tool-active' : ''}`}
                        style={{ width: '112px', height: '64px', flex: '0 0 auto' }}
                    >
                        Målsøk<br />Portefølje I
                    </button>
                    <div className="bg-white border border-[#DDDDDD] rounded-lg h-14 flex items-center justify-center px-4 flex-shrink-0 shadow-md" style={{ minWidth: '98px' }}>
                        <span className="typo-paragraph text-[#333333] whitespace-nowrap text-center text-sm">
                            {formatCurrency(state.goalSeekPortfolio1Result || 0)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            // Vis kun modalen hvis det finnes en simulering
                            if (savedSimulatedReturns.stockReturns.length > 0) {
                                setShowSimulation(true);
                            }
                        }}
                        title="Hvis knappen &quot;Sim&quot; er aktivert,  så vil du her få se en simulert avkastning i alle årene som ligger i Mål og behov. Simuleringen er basert på forventet avkastning i hhv aksjer og renter, og gitt hvilket standardavvik som legges inn på aksjer og renter. Hver gang du trykker på knappen &quot;Sim&quot;, vil denne simuleringen gjøres på nytt. Dette er kun en simulering"
                        aria-label="Hvis knappen &quot;Sim&quot; er aktivert,  så vil du her få se en simulert avkastning i alle årene som ligger i Mål og behov. Simuleringen er basert på forventet avkastning i hhv aksjer og renter, og gitt hvilket standardavvik som legges inn på aksjer og renter. Hver gang du trykker på knappen &quot;Sim&quot;, vil denne simuleringen gjøres på nytt. Dette er kun en simulering"
                        className="bg-[#999999] border border-[#DDDDDD] text-white hover:bg-[#888888] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%', marginRight: '10px' }}
                    >
                        Sim.<br />år for år
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // Vis kun modalen hvis det finnes en simulering
                            if (savedSimulatedReturns.stockReturns.length > 0) {
                                setShowAccumulatedReturn(true);
                            }
                        }}
                        title="Gitt av &quot;Sim&quot; er aktivert, vil du her få se et estimat på akkumulert avkastning i både % og i kr i hele perioden. Utbetalinger vil redusere den Årlige avkastningen (kr). Dette fordi modellen utbetaler avkastningen. Til slutt er kassen tom."
                        aria-label="Gitt av &quot;Sim&quot; er aktivert, vil du her få se et estimat på akkumulert avkastning i både % og i kr i hele perioden. Utbetalinger vil redusere den Årlige avkastningen (kr). Dette fordi modellen utbetaler avkastningen. Til slutt er kassen tom."
                        className="bg-[#3498DB] border border-[#DDDDDD] text-white hover:bg-[#2980B9] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%', marginRight: '10px' }}
                    >
                        Sim.<br />kr og %
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // Generer ny Monte Carlo simulering hver gang knappen klikkes
                            setMonteCarloKey(k => k + 1);
                            setShowMonteCarlo(true);
                        }}
                        title="Ved å trykke her vil modellen gjøre 2000 simuleringer av hvor mye porteføljen totalt vil utbetale i alle utbetalingsårene. Dette gitt at antall år med utbetaling er større enn 0. Frekvenstabellen viser hvor de ulike simuleringene hoper seg opp, hvilke simuleringer det er flest av. Den viser også beste og dårligste simulering."
                        aria-label="Ved å trykke her vil modellen gjøre 2000 simuleringer av hvor mye porteføljen totalt vil utbetale i alle utbetalingsårene. Dette gitt at antall år med utbetaling er større enn 0. Frekvenstabellen viser hvor de ulike simuleringene hoper seg opp, hvilke simuleringer det er flest av. Den viser også beste og dårligste simulering."
                        className="bg-[#CCCCCC] border border-[#DDDDDD] text-white hover:bg-[#BBBBBB] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%', marginRight: '10px' }}
                    >
                        Monte Carlo<br />Utbetalinger
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // Generer ny Monte Carlo Portefølje simulering hver gang knappen klikkes
                            setMonteCarloPortfolioKey(k => k + 1);
                            setShowMonteCarloPortfolio(true);
                        }}
                        title="Ved å trykke her vil modellen gjøre 2000 simuleringer som viser hvor stor porteføljen vil være siste året før utbetalingene starter. Det vises også en frekvenstabell som viser hvor simuleringene hoper seg opp. Den viser også beste og dårligste simulering."
                        aria-label="Ved å trykke her vil modellen gjøre 2000 simuleringer som viser hvor stor porteføljen vil være siste året før utbetalingene starter. Det vises også en frekvenstabell som viser hvor simuleringene hoper seg opp. Den viser også beste og dårligste simulering."
                        className="bg-[#2980B9] border border-[#DDDDDD] text-white hover:bg-[#21618C] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%', marginRight: '10px' }}
                    >
                        Monte Carlo<br />Portefølje
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // Generer ny Monte Carlo fra 0- til 100% aksjer simulering hver gang knappen klikkes
                            setMonteCarloStockAllocationKey(k => k + 1);
                            setShowMonteCarloStockAllocation(true);
                        }}
                        title="Ved å trykke her, vil modellen gjøre 1000 simuleringer av hvor stor porteføljen vil være siste år før utebetalingene starter i 7 ulike porteføljer. Fra 100% renter til 100% aksjer."
                        aria-label="Ved å trykke her, vil modellen gjøre 1000 simuleringer av hvor stor porteføljen vil være siste år før utebetalingene starter i 7 ulike porteføljer. Fra 100% renter til 100% aksjer."
                        className="bg-[#2980B9] border border-[#DDDDDD] text-white hover:bg-[#21618C] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%' }}
                    >
                        Monte Carlo<br />fra 0- til 100% aksjer
                    </button>
                    </div>
                    {/* Fallback for mindre skjermer: plasser slider under */}
                    <div className="xl:hidden mt-2">
                        <div className="w-[740px] max-w-full mx-auto">
                            <SliderInput id="annualSavings" label="Sparing" value={state.annualSavings} min={0} max={5000000} step={10000} onChange={handleStateChange} isCurrency allowDirectInput inline />
                        </div>
                    </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <EyeToggle visible={showDistributionGraphic} onToggle={() => setShowDistributionGraphic(v => !v)} />
                    {showDistributionGraphic && (
                        <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col w-full">
                            <h2 className="typo-h2 text-center text-[#4A6D8C] mb-4">Fordeling mellom aksjer og renter</h2>
                            <div className={`relative h-[260px]`}>
                                <Bar options={stackedAllYearsOptions} data={stackedAllYearsData} />
                            </div>
                            {sumControl2028 != null && (
                                <div className="mt-4 pt-4 border-t border-[#DDDDDD] text-sm text-[#333333]">
                                    <div className="font-medium text-[#4A6D8C] mb-1">Kontroll {sumControl2028.year}</div>
                                    <div>Sum Mål og behov (Hovedstol + Avkastning + Sparing + Hendelser + Netto utbetaling + Skatt på hendelser + Løpende renteskatt) = {new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(sumControl2028.sumMaal)} kr</div>
                                    <div>Sum Fordeling (Aksjer + Aksjeavkastning + Renter + Renteavkastning) = {new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(sumControl2028.sumFordeling)} kr</div>
                                    <div>Aksjer + Aksjeavkastning = {new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(sumControl2028.aksjerPlusAvk)} kr</div>
                                    {sumControl2028.match ? <div className="text-[#66CC99] font-medium mt-1">✓ Summene er like</div> : <div className="text-[#E06B6B] mt-1">Summene avviker</div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <EyeToggle visible={showStockPortionGraphic} onToggle={() => setShowStockPortionGraphic(v => !v)} />
                    {showStockPortionGraphic && (
                        <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex flex-col w-full">
                            <div className="relative h-[280px]">
                                <Line options={stockPortionChartOptions} data={stockPortionChartData} />
                            </div>
                        </div>
                    )}
                </div>

                {showChartImageModal && (
                    <div
                        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                        onClick={() => { setShowChartImageModal(false); setChartImageCopied(false); }}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl w-full p-6 relative flex flex-col items-center overflow-hidden"
                            style={{ maxWidth: '95vw', maxHeight: '90vh' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                aria-label="Lukk"
                                onClick={() => { setShowChartImageModal(false); setChartImageCopied(false); }}
                                className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333] text-xl"
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-1">Grafikk for dokument</h3>
                            <p className="text-sm text-[#666] mb-4 text-center">
                                Høyoppløst bilde (1880×1450 px, 4:3) for A4 Word. Klikk «Kopier bilde» og lim inn i dokumentet (Ctrl+V).
                            </p>
                            <div
                                className="bg-[#f5f5f5] rounded-lg flex justify-center items-center overflow-hidden shrink-0"
                                style={{
                                    maxHeight: 'min(65vh, calc((100vw - 4rem) * 1450 / 1880))',
                                    maxWidth: 'min(calc(100vw - 4rem), calc(65vh * 1880 / 1450))',
                                    aspectRatio: '1880/1450'
                                }}
                            >
                                <canvas
                                    ref={chartExportCanvasRef}
                                    width={1880}
                                    height={1450}
                                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                                />
                            </div>
                            <div className="flex gap-3 mt-4 flex-wrap justify-center">
                                <button
                                    type="button"
                                    onClick={handleCopyChartImage}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${chartImageCopied ? 'bg-green-600 text-white' : 'bg-[#4A6D8C] hover:opacity-90 text-white'}`}
                                >
                                    {chartImageCopied ? '✓ Kopiert!' : 'Kopier bilde'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowChartImageModal(false); setChartImageCopied(false); }}
                                    className="px-4 py-2 rounded-lg font-medium border border-[#DDDDDD] bg-white text-[#333333] hover:bg-gray-50"
                                >
                                    Lukk
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showDisclaimer && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => setShowDisclaimer(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 relative max-h-[80vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                aria-label="Lukk"
                                onClick={() => setShowDisclaimer(false)}
                                className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-3">Disclaimer/forutsetninger</h3>
                            <div className="typo-paragraph text-[#333333]/90 leading-8 whitespace-pre-wrap break-words px-1">
                                {(() => {
                                    const t = `Disclaimer / forutsetninger
                               



Resultatet av de beregninger som gjøres i kalkulatoren vil variere ut ifra hvilke tall som legges til grunn. Tallene som legges til grunn bestemmes i samtale mellom rådgiver og deltaker i møtet. Resultatet vil dermed kunne variere fra de tallene som fremkommer offisielle dokumenter i tilknytning til ytelse av investeringsrådgivning.

Beregningene i kalkulatoren må ansees som statiske og er kun ment for illustrasjonsformål. For konkrete fremstillinger, vises det til offisielle dokumenter knyttet til rådgivningen.

Forklaring:

Simuleringen skiller mellom privatpersoner og AS. Forskjellen ligger i beskatning av uttak.
I hovedsak vil all skatt alltid defineres som betalbar skatt i påfølgende år. Ett uttak i f.eks år 2026, vil derfor føre til en skatteregning i år 2027 osv.
Privat: For en privatperson vil innskutt kapital kun være knyttet til aksjedelen av porteføljen. Uttak vil derfor fordeles mellom aksjer og renter iht aksjeandelen. Om det er innskutt kapital i porteføljen, vil alle aksjeuttak fortrinnsvis hentes ut skattefritt. Når innskutt kapital er gått til null, vil alle aksjeuttak beskattes med 37,8%.
Uttak fra renteporteføljen beskattes årlig, og uttak fra renteporteføljen er derfor ferdig beskattede midler det året de tas ut. Modellen forutsetter ingen utsatt skatt på renter. Løpende renteavkastning beskattes fortløpende hvert år, for både privat og AS. AS:
Hendelser:
Alle innskudd vil i utgangspunktet øke den innskutte kapitalen tilsvarende.
Om dette ikke er tilfellet velger du alternativet : nei, i selve hendelsen.
Eksempel: Et AS har solgt en eiendel som øker likviditeten i selskapet, men den innskutte kapitalen i selskapet har ikke endret seg.

Alle uttak fra et as vil i modellen ansees som et utbytte. Om det er innskutt kapital i porteføljen, vil alle uttak hentes ut skattefritt. Alle uttak utover innskutt kapital vil beskattes med 37,8% i påfølgende år (se eksempel over).
Ønsket årlig utbetaling: Summen som legges inn her er et nettobeløp. I den grad det er mulig vil modellen alltid utbetale dette beløpet etter skatt. Beløpet vil derfor med tiden øke. Dette fordi modellen tar hensyn til at det årlige uttaket må være større grunnet skatteregningen knyttet til uttaket.`;
                                    return t;
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {showAssumptionsGraphic && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => setShowAssumptionsGraphic(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-[1200px] w-full p-10 relative max-h-[90vh] overflow-auto text-[1.25rem]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                aria-label="Lukk"
                                onClick={() => setShowAssumptionsGraphic(false)}
                                className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-6 text-[2rem]">Totalfordeling mellom alle porteføljer</h3>
                            <div className="h-[360px] sm:h-[420px] bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 rounded-xl border border-gray-200/50 p-8 shadow-inner flex items-end relative overflow-hidden backdrop-blur-sm" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(102, 204, 221, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(74, 109, 140, 0.06) 0%, transparent 50%)' }}>
                                <button
                                    type="button"
                                    onClick={() => setWaterfallMode(v => !v)}
                                    className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md border border-[#4A6D8C]/40 bg-white/80 text-[#4A6D8C] hover:bg-gray-100"
                                    title="Waterfall"
                                >
                                    Waterfall
                                </button>

                                {!waterfallMode && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 w-full">
                                    {assumptionSlots.map((bar) => {
                                        const bondPct = Math.max(0, 100 - (bar.stockPct || 0));
                                        const labelText = (bar.stockPct === 0)
                                            ? '100% renter'
                                            : `${bar.stockPct}% aksjer`;
                                        const bondLabelText = `${bondPct}% renter`;
                                       
                                        // For Totalportefølje, use a lighter variant of the base color
                                        const stockColor = bar.key === 'tot' 
                                            ? adjustColorBrightness('#5F7E9B', 25) // Lighter variant of the blue-grey from image
                                            : bar.color;
                                       
                                        return (
                                            <div key={bar.key} className="flex flex-col items-center justify-end" style={{ height: '352px' }}>
                                                <div
                                                    className={`relative w-40 sm:w-44 h-full rounded-2xl overflow-hidden ${
                                                        bar.present ? '' : 'opacity-40'
                                                    }`}
                                                >
                                                    {bar.present && (
                                                        <>
                                                            <div className="absolute inset-0 flex flex-col-reverse rounded-2xl overflow-hidden">
                                                                {/* Bond section – Renteportefølje (Likviditetsfond) får egen farge; renteandelen i P1/P2 uendret */}
                                                                <div
                                                                    style={{
                                                                        height: `${bondPct}%`,
                                                                        backgroundColor: bar.key === 'lf' ? FORUTSETNING_RENTEPORTEFOLJE : '#D1DCE7',
                                                                    }}
                                                                >
                                                                </div>
                                                               
                                                                {/* Stock section */}
                                                                {bar.stockPct > 0 && (
                                                                    <div
                                                                        style={{
                                                                            height: `${bar.stockPct}%`,
                                                                            backgroundColor: stockColor,
                                                                        }}
                                                                    >
                                                                    </div>
                                                                )}
                                                            </div>
                                                           
                                                            {/* Percentage labels */}
                                                            {bar.stockPct > 0 ? (
                                                                <div
                                                                    className="absolute left-0 right-0 flex items-center justify-center text-center px-3 z-20"
                                                                    style={{
                                                                        top: `calc(${bar.stockPct / 2}% )`,
                                                                        transform: 'translateY(-50%)',
                                                                    }}
                                                                >
                                                                    <span className="text-white font-bold text-xl select-none leading-tight whitespace-nowrap">
                                                                        {labelText}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center text-center px-3 z-20">
                                                                    <span className={`font-bold text-xl select-none leading-tight ${bar.key === 'lf' ? 'text-[#475569]' : 'text-white'}`}>
                                                                        {labelText}
                                                                    </span>
                                                                </div>
                                                            )}
                                                           
                                                            {bondPct > 0 && bar.stockPct > 0 && (
                                                                <div
                                                                    className="absolute left-0 right-0 flex items-center justify-center text-center px-3 z-20"
                                                                    style={{
                                                                        top: `calc(100% - ${bondPct / 2}% )`,
                                                                        transform: 'translateY(-50%)',
                                                                    }}
                                                                >
                                                                    <span className="text-white font-bold text-xl select-none leading-tight whitespace-nowrap">
                                                                        {bondLabelText}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-5 text-center text-[#333333] text-lg font-bold leading-tight">
                                                    {bar.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                )}

                                {waterfallMode && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
                                    {(() => {
                                        const p1 = Math.max(0, state.initialPortfolioSize || 0);
                                        const p2 = Math.max(0, state.pensionPortfolioSize || 0);
                                        const lf = Math.max(0, state.additionalPensionAmount || 0);
                                        const total = p1 + p2 + lf;
                                        const maxHeight = 322;
                                        const heightFor = (v) => (total > 0 ? Math.max(8, Math.round((v / total) * maxHeight)) : 8);

                                        const items = [];
                                        if (p1 > 0) items.push({ key: 'p1w', label: resolvePortfolio1Name(state.portfolio1Name), value: p1, color: CHART_COLORS.hovedstol });
                                        if (p2 > 0) items.push({ key: 'p2w', label: resolvePortfolio2Name(state.portfolio2Name), value: p2, color: CHART_COLORS.sparing });
                                        if (lf > 0) items.push({ key: 'lfw', label: 'Likviditetsfond', value: lf, color: CHART_COLORS.avkastning });

                                        // Calculate pixel heights with per-item minimums (LF + P2), then scale to fit container if needed
                                        const MIN_STEP_PX = 56;
                                        const rawHeights = items.map((it) => {
                                            const proportional = total > 0 ? Math.round((it.value / total) * maxHeight) : 0;
                                            const needsMin = (it.key === 'p2w' || it.key === 'lfw');
                                            return Math.max(proportional, needsMin ? MIN_STEP_PX : 8);
                                        });
                                        const sumRaw = rawHeights.reduce((a,b)=>a+b,0);
                                        const scale = sumRaw > maxHeight ? (maxHeight / sumRaw) : 1;
                                        const heights = rawHeights.map(h => Math.round(h * scale));

                                        let offsetPx = 0;
                                        const stepBars = items.map((it, idx) => {
                                            const h = heights[idx];
                                           
                                            const comp = (
                                                <div key={it.key} className="flex flex-col items-center justify-end h-[322px]">
                                                    <div className="relative w-40 sm:w-44 rounded-2xl overflow-visible" style={{ height: `${maxHeight}px` }}>
                                                        <div
                                                            className="absolute left-0 right-0 rounded-2xl"
                                                            style={{
                                                                height: `${h}px`,
                                                                bottom: `${offsetPx}px`,
                                                                backgroundColor: it.color,
                                                            }}
                                                        >
                                                            <div className="w-full h-full flex items-center justify-center relative">
                                                                <span className="text-white font-bold text-base sm:text-xl select-none px-2 whitespace-nowrap relative z-20">
                                                                    {formatCurrency(it.value)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-5 text-center text-[#333333] text-lg font-bold leading-tight">
                                                        {it.label}
                                                    </div>
                                                </div>
                                            );
                                            offsetPx += h;
                                            return comp;
                                        });

                                        const placeholders = Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
                                            <div key={`ph-${i}`} className="hidden md:block"></div>
                                        ));

                                        const totalColor = CHART_COLORS.hovedstol;
                                       
                                        const totalBar = (
                                            <div key="total-w" className="flex flex-col items-center justify-end h-[322px]">
                                                <div className="relative w-40 sm:w-44 rounded-2xl overflow-visible" style={{ height: `${maxHeight}px` }}>
                                                    <div
                                                        className="absolute left-0 right-0 bottom-0 rounded-2xl"
                                                        style={{
                                                            height: `${maxHeight}px`,
                                                            backgroundColor: totalColor,
                                                        }}
                                                    >
                                                        <div className="w-full h-full flex items-center justify-center relative">
                                                            <span className="text-white font-bold text-base sm:text-xl select-none px-2 whitespace-nowrap relative z-20">
                                                                {formatCurrency(total)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-5 text-center text-[#333333] text-lg font-bold leading-tight">
                                                    Totalportefølje
                                                </div>
                                            </div>
                                        );

                                        return [...stepBars, ...placeholders, totalBar];
                                    })()}
                                </div>
                                )}
                                {/* Legend intentionally hidden per request */}
                            </div>
                        </div>
                    </div>
                )}

                {/* Simulering modal */}
                {showSimulation && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => setShowSimulation(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-[1200px] w-full p-10 relative max-h-[90vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                aria-label="Lukk"
                                onClick={() => setShowSimulation(false)}
                                className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-6 text-[2rem]">Simulering</h3>
                            <div className="chart-container">
                                <Bar 
                                    data={{
                                        labels: Array.from({ length: (state.investmentYears || 0) + (state.payoutYears || 0) + ((state.payoutYears || 0) > 0 ? 1 : 0) }, (_, i) => START_YEAR + i),
                                        datasets: [
                                            {
                                                label: 'Aksjer (Std.avv 12%)',
                                                data: savedSimulatedReturns.stockReturns,
                                                backgroundColor: savedSimulatedReturns.stockReturns.map(value => value < 0 ? '#B14444' : '#4A6D8C'),
                                                borderRadius: 4,
                                                borderSkipped: false
                                            },
                                            {
                                                label: 'Renter (Std.avv 3%)',
                                                data: savedSimulatedReturns.bondReturns,
                                                backgroundColor: savedSimulatedReturns.bondReturns.map(value => value < 0 ? '#E06B6B' : CHART_COLORS.avkastning),
                                                borderRadius: 4,
                                                borderSkipped: false
                                            }
                                        ]
                                    }}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            tooltip: {
                                                ...chartOptions.plugins.tooltip,
                                                callbacks: {
                                                    title: (items) => `${items[0].label}`,
                                                    label: (context) => `${context.dataset.label}: ${context.raw.toFixed(2)}%`,
                                                }
                                            },
                                            legend: {
                                                display: true,
                                                labels: {
                                                    color: SPWM_INK,
                                                    font: {
                                                        size: 13,
                                                        weight: '500'
                                                    }
                                                }
                                            }
                                        },
                                        scales: {
                                            ...chartOptions.scales,
                                            x: {
                                                ...chartOptions.scales.x,
                                                stacked: false,
                                                ticks: {
                                                    ...chartOptions.scales.x.ticks,
                                                    maxRotation: 45,
                                                    minRotation: 45
                                                }
                                            },
                                            y: {
                                                ...chartOptions.scales.y,
                                                stacked: false,
                                                ticks: {
                                                    ...chartOptions.scales.y.ticks,
                                                    callback: (value) => `${value.toFixed(1)}%`
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Akkumulert avkastning modal */}
                {showAccumulatedReturn && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => setShowAccumulatedReturn(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-[1200px] w-full p-10 relative max-h-[90vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                aria-label="Lukk"
                                onClick={() => setShowAccumulatedReturn(false)}
                                className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-6 text-[2rem]">Akkumulert avkastning Sim.</h3>
                            {(() => {
                                // Beregn min/max verdier for skalaene for å gjøre grafene mindre parallelle
                                const percentValues = accumulatedReturnData.percentValues || [];
                                const krValues = accumulatedReturnData.krValues || [];
                                const percentMin = percentValues.length > 0 ? Math.floor(Math.min(...percentValues) / 10) * 10 - 10 : -10;
                                const percentMax = percentValues.length > 0 ? Math.ceil(Math.max(...percentValues) / 10) * 10 + 10 : 50;
                                const krMax = krValues.length > 0 ? Math.ceil(Math.max(...krValues) * 1.4 / 5000000) * 5000000 : 30000000;
                                
                                return (
                            <div className="chart-container">
                                <Line 
                                    data={{
                                        labels: accumulatedReturnData.labels,
                                        datasets: [
                                            {
                                                label: 'Akkumulert avkastning (%)',
                                                data: accumulatedReturnData.percentValues,
                                                borderColor: '#4A6D8C',
                                                backgroundColor: 'rgba(74, 109, 140, 0.15)',
                                                borderWidth: 4,
                                                fill: true,
                                                gradientFill: true,
                                                tension: 0.5,
                                                pointRadius: 0,
                                                pointHoverRadius: 8,
                                                pointBackgroundColor: '#ffffff',
                                                pointBorderColor: '#4A6D8C',
                                                pointBorderWidth: 3,
                                                pointHoverBackgroundColor: '#ffffff',
                                                pointHoverBorderColor: '#4A6D8C',
                                                pointHoverBorderWidth: 4,
                                                cubicInterpolationMode: 'monotone',
                                                shadowOffsetX: 0,
                                                shadowOffsetY: 3,
                                                shadowBlur: 10,
                                                shadowColor: 'rgba(74, 109, 140, 0.4)',
                                                yAxisID: 'y',
                                            },
                                            {
                                                label: 'Årlig avkastning (kr)',
                                                data: accumulatedReturnData.krValues,
                                                borderColor: '#66CCDD',
                                                backgroundColor: 'rgba(102, 204, 221, 0.2)',
                                                borderWidth: 3,
                                                borderDash: [5, 5],
                                                fill: false,
                                                tension: 0.4,
                                                pointRadius: 4,
                                                pointHoverRadius: 7,
                                                pointBackgroundColor: '#ffffff',
                                                pointBorderColor: '#66CCDD',
                                                pointBorderWidth: 2,
                                                pointHoverBackgroundColor: '#66CCDD',
                                                pointHoverBorderColor: '#ffffff',
                                                pointHoverBorderWidth: 3,
                                                yAxisID: 'y1',
                                            }
                                        ]
                                    }}
                                    options={{
                                        ...chartOptions,
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        animation: {
                                            duration: 2000,
                                            easing: 'easeInOutQuart',
                                            delay: (context) => {
                                                if (context.type === 'data' && context.mode === 'default') {
                                                    return context.dataIndex * 50;
                                                }
                                                return 0;
                                            },
                                        },
                                        interaction: {
                                            mode: 'index',
                                            intersect: false,
                                        },
                                        plugins: {
                                            ...chartOptions.plugins,
                                            legend: {
                                                display: true,
                                                labels: {
                                                    color: SPWM_INK,
                                                    font: {
                                                        size: 14,
                                                        weight: '600'
                                                    },
                                                    padding: 12,
                                                    usePointStyle: true,
                                                    pointStyle: 'circle',
                                                    boxWidth: 8,
                                                    boxHeight: 8,
                                                }
                                            },
                                            tooltip: {
                                                ...chartOptions.plugins.tooltip,
                                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                titleColor: '#4A6D8C',
                                                bodyColor: '#333333',
                                                borderColor: '#4A6D8C',
                                                borderWidth: 2,
                                                padding: 14,
                                                cornerRadius: 8,
                                                displayColors: true,
                                                boxPadding: 6,
                                                callbacks: {
                                                    title: (items) => `${items[0].label}`,
                                                    label: (context) => {
                                                        const datasetLabel = context.dataset.label || '';
                                                        const value = context.raw;
                                                        if (datasetLabel.includes('%')) {
                                                            return `Akkumulert avkastning: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
                                                        } else {
                                                            return `Årlig avkastning: ${formatCurrency(value)}`;
                                                        }
                                                    },
                                                    labelColor: (context) => ({
                                                        borderColor: context.dataset.borderColor,
                                                        backgroundColor: context.dataset.borderColor,
                                                    }),
                                                }
                                            }
                                        },
                                        scales: {
                                            ...chartOptions.scales,
                                            x: {
                                                ...chartOptions.scales.x,
                                                title: {
                                                    display: false
                                                },
                                                grid: {
                                                    ...chartOptions.scales.x.grid,
                                                    color: 'rgba(221, 221, 221, 0.3)',
                                                    lineWidth: 1,
                                                },
                                                ticks: {
                                                    ...chartOptions.scales.x.ticks,
                                                    maxRotation: 0,
                                                    minRotation: 0,
                                                    color: '#666666',
                                                    font: {
                                                        size: 12,
                                                        weight: '500'
                                                    },
                                                    padding: 8,
                                                }
                                            },
                                            y: {
                                                position: 'left',
                                                title: { display: false },
                                                grid: {
                                                    ...chartOptions.scales.y.grid,
                                                    color: 'rgba(221, 221, 221, 0.3)',
                                                    lineWidth: 1,
                                                    drawBorder: false,
                                                },
                                                ticks: {
                                                    ...chartOptions.scales.y.ticks,
                                                    callback: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`,
                                                    color: SPWM_NAVY,
                                                    font: {
                                                        size: 14.4,
                                                        weight: '500'
                                                    },
                                                    padding: 8,
                                                    maxRotation: 0,
                                                    minRotation: 0,
                                                },
                                                beginAtZero: false,
                                                suggestedMin: percentMin,
                                                suggestedMax: percentMax
                                            },
                                            y1: {
                                                type: 'linear',
                                                position: 'right',
                                                title: { display: false },
                                                grid: {
                                                    drawOnChartArea: false,
                                                },
                                                ticks: {
                                                    callback: (value) => {
                                                        if (value >= 1000000) {
                                                            return `${(value / 1000000).toFixed(1)}M`;
                                                        } else if (value >= 1000) {
                                                            return `${(value / 1000).toFixed(0)}k`;
                                                        }
                                                        return value.toFixed(0);
                                                    },
                                                    color: '#66CCDD',
                                                    font: {
                                                        size: 14.4,
                                                        weight: '500'
                                                    },
                                                    padding: 8,
                                                    maxRotation: 0,
                                                    minRotation: 0,
                                                },
                                                beginAtZero: true,
                                                suggestedMin: 0,
                                                suggestedMax: krMax
                                            }
                                        }
                                    }}
                                />
                            </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Monte Carlo simulering modal */}
                {showMonteCarlo && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => setShowMonteCarlo(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-[1400px] w-full relative max-h-[95vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                            style={{ margin: '2vh auto 6vh auto', padding: '40px 50px 100px 50px' }}
                        >
                            <button
                                aria-label="Lukk"
                                onClick={() => setShowMonteCarlo(false)}
                                className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-6 text-[2rem]">Estimert sum utbetalinger alle år</h3>
                            {monteCarloChartData ? (
                                <div>
                                    <div className="chart-container" style={{ height: '600px', marginTop: '20px', marginBottom: '20px', position: 'relative', clear: 'both' }}>
                                        {/* Frekvenstabell i nederste høyre hjørne - plassert over grafikken */}
                                        {monteCarloChartData.frequencyTable && Array.isArray(monteCarloChartData.frequencyTable) && monteCarloChartData.frequencyTable.length > 0 && (() => {
                                            const mostFrequentValue = monteCarloChartData.frequencyTable.length > 0 
                                                ? monteCarloChartData.frequencyTable.reduce((max, curr) => curr.count > max.count ? curr : max, monteCarloChartData.frequencyTable[0]).value
                                                : 0;
                                            const totalSum = monteCarloChartData.frequencyTable.reduce((sum, item) => sum + item.count, 0);
                                            return (
                                                <div style={{ position: 'absolute', bottom: '150px', right: '20px', backgroundColor: 'white', border: '2px solid #4A6D8C', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '12px', minWidth: '200px', zIndex: 10 }}>
                                                    <div className="text-xs font-bold text-[#4A6D8C] mb-2 text-center">Frekvenstabell</div>
                                                    <div className="text-xs text-[#333333] space-y-1">
                                                        {monteCarloChartData.frequencyTable.map((item, idx) => {
                                                            const valueInM = (item.value / 1000000).toFixed(1).replace('.', ',');
                                                            const isMostFrequent = item.value === mostFrequentValue;
                                                            return (
                                                                <div key={idx} className={`flex justify-between items-center px-2 py-1 ${isMostFrequent ? 'bg-[#66CCDD]/20 rounded font-semibold' : ''}`}>
                                                                    <span className={isMostFrequent ? 'font-bold' : 'font-medium'}>{valueInM} M</span>
                                                                    <span className={`${isMostFrequent ? 'font-bold' : ''} text-[#666666]`}>{item.count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="border-t border-[#DDDDDD] mt-2 pt-2 flex justify-between items-center px-2 font-bold">
                                                            <span>Sum:</span>
                                                            <span>{totalSum}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <Line 
                                        data={{
                                            labels: monteCarloChartData.labels,
                                            datasets: [
                                                {
                                                    label: 'Normalfordeling',
                                                    data: monteCarloChartData.normalCurve,
                                                    borderColor: '#4A6D8C',
                                                    backgroundColor: 'rgba(74, 109, 140, 0.1)',
                                                    borderWidth: 3,
                                                    fill: true,
                                                    tension: 0.4,
                                                    pointRadius: 0,
                                                    pointHoverRadius: 5,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: 'Simulerte resultater',
                                                    data: monteCarloChartData.histogram,
                                                    type: 'bar',
                                                    backgroundColor: 'rgba(102, 204, 221, 0.6)',
                                                    borderColor: '#66CCDD',
                                                    borderWidth: 1,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: 'Gjennomsnitt',
                                                    data: monteCarloChartData.meanLine,
                                                    type: 'bar',
                                                    backgroundColor: '#FF6B6B',
                                                    borderColor: '#FF6B6B',
                                                    borderWidth: 2,
                                                    barThickness: 3,
                                                    categoryPercentage: 0.1,
                                                    barPercentage: 0.1,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: '1 std.avv',
                                                    data: monteCarloChartData.meanPlusStdDevLine.map((val, idx) => 
                                                        val > 0 || monteCarloChartData.meanMinusStdDevLine[idx] > 0 ? 
                                                        Math.max(val, monteCarloChartData.meanMinusStdDevLine[idx]) : 0
                                                    ),
                                                    type: 'bar',
                                                    backgroundColor: '#3498DB',
                                                    borderColor: '#3498DB',
                                                    borderWidth: 2,
                                                    barThickness: 3,
                                                    categoryPercentage: 0.1,
                                                    barPercentage: 0.1,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: '2 std.avv',
                                                    data: monteCarloChartData.meanPlus2StdDevLine.map((val, idx) => 
                                                        val > 0 || monteCarloChartData.meanMinus2StdDevLine[idx] > 0 ? 
                                                        Math.max(val, monteCarloChartData.meanMinus2StdDevLine[idx]) : 0
                                                    ),
                                                    type: 'bar',
                                                    backgroundColor: '#999999',
                                                    borderColor: '#999999',
                                                    borderWidth: 2,
                                                    barThickness: 3,
                                                    categoryPercentage: 0.1,
                                                    barPercentage: 0.1,
                                                    yAxisID: 'y'
                                                }
                                            ]
                                        }}
                                        options={{
                                            ...chartOptions,
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                ...chartOptions.plugins,
                                                legend: {
                                                    display: true,
                                                    labels: {
                                                        color: SPWM_INK,
                                                        font: {
                                                            size: 14,
                                                            weight: '600'
                                                        },
                                                        padding: 12,
                                                        usePointStyle: true
                                                    }
                                                },
                                                tooltip: {
                                                    ...chartOptions.plugins.tooltip,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                    titleColor: '#000000',
                                                    bodyColor: '#000000',
                                                    borderColor: '#DDDDDD',
                                                    borderWidth: 1,
                                                    position: 'nearest',
                                                    intersect: false,
                                                    callbacks: {
                                                        title: (items) => {
                                                            return `Total utbetaling: ${items[0].label}`;
                                                        },
                                                        label: () => {
                                                            // Ikke vis noen labels, bare tittel
                                                            return null;
                                                        },
                                                        filter: () => {
                                                            // Vis tooltip for alle elementer
                                                            return true;
                                                        }
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    ...chartOptions.scales.x,
                                                    title: {
                                                        display: true,
                                                        text: 'Total sum av utbetalinger (kr)',
                                                        color: SPWM_INK,
                                                        font: {
                                                            size: 14,
                                                            weight: '600'
                                                        }
                                                    },
                                                    stacked: false
                                                },
                                                y: {
                                                    ...chartOptions.scales.y,
                                                    title: {
                                                        display: true,
                                                        text: 'Antall simuleringer',
                                                        color: SPWM_INK,
                                                        font: {
                                                            size: 14,
                                                            weight: '600'
                                                        }
                                                    },
                                                    stacked: false,
                                                    beginAtZero: true,
                                                    max: monteCarloChartData.maxNormalCurveValue ? monteCarloChartData.maxNormalCurveValue + 10 : 100,
                                                    ticks: {
                                                        ...chartOptions.scales.y.ticks,
                                                        stepSize: monteCarloChartData.maxNormalCurveValue ? Math.max(1, Math.ceil((monteCarloChartData.maxNormalCurveValue + 10) / 10)) : 10,
                                                        callback: (value) => {
                                                            if (value >= 1000000) {
                                                                return `${(value / 1000000).toFixed(1).replace('.', ',')} M`;
                                                            } else if (value >= 1000) {
                                                                return `${(value / 1000).toFixed(1).replace('.', ',')} k`;
                                                            }
                                                            return Math.round(value).toString();
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                    </div>
                                    <div className="mt-4 mb-4 text-center text-[#333333]" style={{ marginTop: '30px', marginBottom: '20px' }}>
                                        <p className="text-sm">
                                            Gjennomsnitt: {formatCurrency(monteCarloChartData.mean)}
                                        </p>
                                        <p className="text-sm">
                                            Standardavvik: {formatCurrency(monteCarloChartData.stdDev)}
                                        </p>
                                        <p className="text-xs text-[#666666] mt-2">
                                            Basert på {monteCarloResults.length} simuleringer
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-[#666666] py-8">
                                    Ingen simulering tilgjengelig. Sørg for at utbetalingsperiode er satt til mer enn 0 år.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Monte Carlo Portefølje simulering modal */}
                {showMonteCarloPortfolio && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => setShowMonteCarloPortfolio(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-[1400px] w-full relative max-h-[95vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                            style={{ margin: '2vh auto 6vh auto', padding: '40px 50px 100px 50px' }}
                        >
                            <button
                                aria-label="Lukk"
                                onClick={() => setShowMonteCarloPortfolio(false)}
                                className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-6 text-[2rem]">Estimert verdi på porteføljen siste år før utbetalinger starter</h3>
                            {monteCarloPortfolioChartData ? (
                                <div>
                                    <div className="chart-container" style={{ height: '600px', marginTop: '20px', marginBottom: '20px', position: 'relative', clear: 'both' }}>
                                        {/* Frekvenstabell i nederste høyre hjørne - plassert over grafikken */}
                                        {monteCarloPortfolioChartData.frequencyTable && Array.isArray(monteCarloPortfolioChartData.frequencyTable) && monteCarloPortfolioChartData.frequencyTable.length > 0 && (() => {
                                            const mostFrequentValue = monteCarloPortfolioChartData.frequencyTable.length > 0 
                                                ? monteCarloPortfolioChartData.frequencyTable.reduce((max, curr) => curr.count > max.count ? curr : max, monteCarloPortfolioChartData.frequencyTable[0]).value
                                                : 0;
                                            const totalSum = monteCarloPortfolioChartData.frequencyTable.reduce((sum, item) => sum + item.count, 0);
                                            return (
                                                <div style={{ position: 'absolute', bottom: '150px', right: '20px', backgroundColor: 'white', border: '2px solid #4A6D8C', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '12px', minWidth: '200px', zIndex: 10 }}>
                                                    <div className="text-xs font-bold text-[#4A6D8C] mb-2 text-center">Frekvenstabell</div>
                                                    <div className="text-xs text-[#333333] space-y-1">
                                                        {monteCarloPortfolioChartData.frequencyTable.map((item, idx) => {
                                                            const valueInM = (item.value / 1000000).toFixed(1).replace('.', ',');
                                                            const isMostFrequent = item.value === mostFrequentValue;
                                                            return (
                                                                <div key={idx} className={`flex justify-between items-center px-2 py-1 ${isMostFrequent ? 'bg-[#66CCDD]/20 rounded font-semibold' : ''}`}>
                                                                    <span className={isMostFrequent ? 'font-bold' : 'font-medium'}>{valueInM} M</span>
                                                                    <span className={`${isMostFrequent ? 'font-bold' : ''} text-[#666666]`}>{item.count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="border-t border-[#DDDDDD] mt-2 pt-2 flex justify-between items-center px-2 font-bold">
                                                            <span>Sum:</span>
                                                            <span>{totalSum}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <Line 
                                        data={{
                                            labels: monteCarloPortfolioChartData.labels,
                                            datasets: [
                                                {
                                                    label: 'Normalfordeling',
                                                    data: monteCarloPortfolioChartData.normalCurve,
                                                    borderColor: '#4A6D8C',
                                                    backgroundColor: 'rgba(74, 109, 140, 0.1)',
                                                    borderWidth: 3,
                                                    fill: true,
                                                    tension: 0.4,
                                                    pointRadius: 0,
                                                    pointHoverRadius: 5,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: 'Simulerte resultater',
                                                    data: monteCarloPortfolioChartData.histogram,
                                                    type: 'bar',
                                                    backgroundColor: 'rgba(102, 204, 221, 0.6)',
                                                    borderColor: '#66CCDD',
                                                    borderWidth: 1,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: 'Gjennomsnitt',
                                                    data: monteCarloPortfolioChartData.meanLine,
                                                    type: 'bar',
                                                    backgroundColor: '#FF6B6B',
                                                    borderColor: '#FF6B6B',
                                                    borderWidth: 2,
                                                    barThickness: 3,
                                                    categoryPercentage: 0.1,
                                                    barPercentage: 0.1,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: '1 std.avv',
                                                    data: monteCarloPortfolioChartData.meanPlusStdDevLine.map((val, idx) => 
                                                        val > 0 || monteCarloPortfolioChartData.meanMinusStdDevLine[idx] > 0 ? 
                                                        Math.max(val, monteCarloPortfolioChartData.meanMinusStdDevLine[idx]) : 0
                                                    ),
                                                    type: 'bar',
                                                    backgroundColor: '#3498DB',
                                                    borderColor: '#3498DB',
                                                    borderWidth: 2,
                                                    barThickness: 3,
                                                    categoryPercentage: 0.1,
                                                    barPercentage: 0.1,
                                                    yAxisID: 'y'
                                                },
                                                {
                                                    label: '2 std.avv',
                                                    data: monteCarloPortfolioChartData.meanPlus2StdDevLine.map((val, idx) => 
                                                        val > 0 || monteCarloPortfolioChartData.meanMinus2StdDevLine[idx] > 0 ? 
                                                        Math.max(val, monteCarloPortfolioChartData.meanMinus2StdDevLine[idx]) : 0
                                                    ),
                                                    type: 'bar',
                                                    backgroundColor: '#999999',
                                                    borderColor: '#999999',
                                                    borderWidth: 2,
                                                    barThickness: 3,
                                                    categoryPercentage: 0.1,
                                                    barPercentage: 0.1,
                                                    yAxisID: 'y'
                                                }
                                            ]
                                        }}
                                        options={{
                                            ...chartOptions,
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                ...chartOptions.plugins,
                                                legend: {
                                                    display: true,
                                                    labels: {
                                                        color: SPWM_INK,
                                                        font: {
                                                            size: 14,
                                                            weight: '600'
                                                        },
                                                        padding: 12,
                                                        usePointStyle: true
                                                    }
                                                },
                                                tooltip: {
                                                    ...chartOptions.plugins.tooltip,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                    titleColor: '#000000',
                                                    bodyColor: '#000000',
                                                    borderColor: '#DDDDDD',
                                                    borderWidth: 1,
                                                    position: 'nearest',
                                                    intersect: false,
                                                    callbacks: {
                                                        title: (items) => {
                                                            return `Porteføljeverdi: ${items[0].label}`;
                                                        },
                                                        label: () => {
                                                            // Ikke vis noen labels, bare tittel
                                                            return null;
                                                        },
                                                        filter: () => {
                                                            // Vis tooltip for alle elementer
                                                            return true;
                                                        }
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    ...chartOptions.scales.x,
                                                    title: {
                                                        display: true,
                                                        text: 'Porteføljens totale verdi (kr)',
                                                        color: SPWM_INK,
                                                        font: {
                                                            size: 14,
                                                            weight: '600'
                                                        }
                                                    },
                                                    stacked: false
                                                },
                                                y: {
                                                    ...chartOptions.scales.y,
                                                    title: {
                                                        display: true,
                                                        text: 'Antall simuleringer',
                                                        color: SPWM_INK,
                                                        font: {
                                                            size: 14,
                                                            weight: '600'
                                                        }
                                                    },
                                                    stacked: false,
                                                    beginAtZero: true,
                                                    max: monteCarloPortfolioChartData.maxNormalCurveValue ? monteCarloPortfolioChartData.maxNormalCurveValue + 10 : 100,
                                                    ticks: {
                                                        ...chartOptions.scales.y.ticks,
                                                        stepSize: monteCarloPortfolioChartData.maxNormalCurveValue ? Math.max(1, Math.ceil((monteCarloPortfolioChartData.maxNormalCurveValue + 10) / 10)) : 10,
                                                        callback: (value) => {
                                                            if (value >= 1000000) {
                                                                return `${(value / 1000000).toFixed(1).replace('.', ',')} M`;
                                                            } else if (value >= 1000) {
                                                                return `${(value / 1000).toFixed(1).replace('.', ',')} k`;
                                                            }
                                                            return Math.round(value).toString();
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                    </div>
                                    <div className="mt-4 mb-4 text-center text-[#333333]" style={{ marginTop: '30px', marginBottom: '20px' }}>
                                        <p className="text-sm">
                                            Gjennomsnitt: {formatCurrency(monteCarloPortfolioChartData.mean)}
                                        </p>
                                        <p className="text-sm">
                                            Standardavvik: {formatCurrency(monteCarloPortfolioChartData.stdDev)}
                                        </p>
                                        <p className="text-xs text-[#666666] mt-2">
                                            Basert på {monteCarloPortfolioResults.length} simuleringer
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-[#666666] py-8">
                                    Ingen simulering tilgjengelig. Sørg for at investeringsperiode er satt til mer enn 0 år.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Monte Carlo fra 0- til 100% aksjer simulering modal */}
                {showMonteCarloStockAllocation && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => setShowMonteCarloStockAllocation(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-[1600px] w-full relative max-h-[95vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                            style={{ margin: '2vh auto 6vh auto', padding: '52px 65px 130px 65px' }}
                        >
                            <button
                                aria-label="Lukk"
                                onClick={() => setShowMonteCarloStockAllocation(false)}
                                className="absolute top-4 right-4 text-[#333333]/70 hover:text-[#333333]"
                                style={{ fontSize: '1.3rem' }}
                            >
                                ✕
                            </button>
                            <h3 className="typo-h3 text-[#4A6D8C] mb-8" style={{ fontSize: '2.6rem' }}>Simulerte verdier siste år med ulik aksjevekting</h3>
                            {Object.keys(monteCarloStockAllocationFrequencyTables).length > 0 ? (
                                <div>
                                    <div className="grid grid-cols-7 gap-4 mt-10" style={{ alignItems: 'stretch' }}>
                                        {[0, 20, 45, 55, 65, 85, 100].map((stockAllocation) => {
                                            const frequencyTable = monteCarloStockAllocationFrequencyTables[stockAllocation];
                                            if (!frequencyTable || frequencyTable.length === 0) return null;
                                            
                                            // Beregn gjennomsnittet for denne tabellen
                                            const results = monteCarloStockAllocationResults[stockAllocation] || [];
                                            const mean = results.length > 0 
                                                ? results.reduce((a, b) => a + b, 0) / results.length 
                                                : 0;
                                            
                                            // Finn linjen nærmest gjennomsnittet
                                            let closestToMean = frequencyTable[0];
                                            let minDistance = Math.abs(frequencyTable[0].value - mean);
                                            frequencyTable.forEach(item => {
                                                const distance = Math.abs(item.value - mean);
                                                if (distance < minDistance) {
                                                    minDistance = distance;
                                                    closestToMean = item;
                                                }
                                            });
                                            
                                            const totalSum = frequencyTable.reduce((sum, item) => sum + item.count, 0);
                                            
                                            return (
                                                <div key={stockAllocation} className="bg-white border-2 border-[#4A6D8C] rounded-xl shadow-lg flex flex-col" style={{ padding: '13px' }}>
                                                    <div className="font-bold text-[#4A6D8C] mb-1.3 text-center border-b border-[#4A6D8C] pb-0.65" style={{ fontSize: '0.91rem' }}>
                                                        {stockAllocation === 0 ? '100% Renter' : stockAllocation === 100 ? '100% Aksjer' : `${stockAllocation}% Aksjer`}
                                                    </div>
                                                    <div className="text-[#333333] flex-1 flex flex-col" style={{ fontSize: '0.91rem' }}>
                                                        <div>
                                                            {frequencyTable.map((item, idx) => {
                                                                const valueInM = (item.value / 1000000).toFixed(1).replace('.', ',');
                                                                const isClosestToMean = Math.abs(item.value - closestToMean.value) < 0.01;
                                                                return (
                                                                    <div key={idx} className={`flex justify-between items-center py-0 ${isClosestToMean ? 'bg-[#66CCDD]/30 rounded font-semibold border border-[#66CCDD]' : ''}`} style={{ paddingLeft: '13px', paddingRight: '13px' }}>
                                                                        <span className={isClosestToMean ? 'font-bold text-[#4A6D8C]' : 'font-medium'}>{valueInM} M</span>
                                                                        <span className={`${isClosestToMean ? 'font-bold text-[#4A6D8C]' : ''} text-[#666666]`}>{item.count}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="border-t border-[#DDDDDD] flex justify-between items-center font-bold bg-white mt-auto" style={{ paddingTop: '1.3px', paddingBottom: '1.3px', paddingLeft: '13px', paddingRight: '13px', fontSize: '0.91rem' }}>
                                                            <span>Sum:</span>
                                                            <span>{totalSum}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-8 p-5 bg-[#f9f9f9] border border-[#DDDDDD] rounded-lg">
                                        <p className="text-[#333333] leading-relaxed" style={{ fontSize: '1.04rem' }}>
                                            <span className="inline-block bg-[#66CCDD]/30 border border-[#66CCDD] rounded align-middle" style={{ width: '20px', height: '20px', marginRight: '10px' }}></span>
                                            Den markerte raden i hver tabell viser gjennomsnittet (mean) for den gitte aksjeandelen. Hver tabell viser også det laveste og høyeste resultatet fra simuleringene.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-[#666666] py-8">
                                    Ingen simulering tilgjengelig. Sørg for at investeringsperiode er satt til mer enn 0 år.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="relative">
                    <EyeToggle visible={showInvestedCapitalGraphic} onToggle={() => setShowInvestedCapitalGraphic(v => !v)} />
                    {showInvestedCapitalGraphic && (
                        <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col w-full">
                            <h2 className="typo-h2 text-center text-[#4A6D8C] mb-4">Innskutt kapital over tid</h2>
                            <div className="relative h-[300px]">
                                <Bar options={capitalChartOptions} data={investedCapitalChartData} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Assumptions Panel */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                        <h2 className="typo-h2 text-[#4A6D8C]">Forutsetninger</h2>
                        <SliderInput id="investedCapital" label="Innskutt kapital (skattefri) (NOK)" value={state.investedCapital} min={0} max={state.initialPortfolioSize + state.pensionPortfolioSize + state.additionalPensionAmount} step={100000} onChange={handleStateChange} isCurrency allowDirectInput thumbColor="#4A6D8C" />
                        <SliderInput id="investmentYears" label="Tidshorisont" value={state.investmentYears} min={0} max={30} step={1} onChange={handleStateChange} unit="år" thumbColor="#4A6D8C" />
                        <SliderInput id="payoutYears" label="Antall år med utbetaling" value={state.payoutYears} min={0} max={30} step={1} onChange={handleStateChange} unit="år" thumbColor="#4A6D8C" />
                         
                         {/* Ønsket årlig utbetaling */}
                         <div>
                             <h3 className="typo-h2 text-[#4A6D8C] mb-4">Ønsket årlig utbetaling</h3>
                             <div className="mt-4 space-y-4">
                                 <SliderInput
                                     id="desiredAnnualConsumptionPayout"
                                     label="Ønsket årlig uttak til forbruk (NOK)"
                                     value={state.desiredAnnualConsumptionPayout}
                                     min={0}
                                     max={10000000}
                                     step={100000}
                                     onChange={handleStateChange}
                                     isCurrency
                                     allowDirectInput
                                     thumbColor="#4A6D8C"
                                 />
                                <SliderInput
                                    id="desiredAnnualWealthTaxPayout"
                                    label="Ønsket årlig uttak til formuesskatt (NOK)"
                                    value={state.desiredAnnualWealthTaxPayout}
                                    min={0}
                                    max={7000000}
                                    step={50000}
                                    onChange={handleStateChange}
                                    isCurrency
                                    allowDirectInput
                                    thumbColor="#4A6D8C"
                                />
                                 <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-3">
                                     <div className="typo-label text-[#333333]/70 mb-1">Sum ønsket årlig utbetaling (etter skatt):</div>
                                     <div className="text-lg font-semibold text-[#4A6D8C]">
                                         {formatCurrency(state.desiredAnnualConsumptionPayout + state.desiredAnnualWealthTaxPayout)}
                                     </div>
                                 </div>
                                 <InvestorTypeToggle value={state.investorType} onChange={handleStateChange} />
                                 <DeferredInterestTaxToggle value={state.deferredInterestTax} onChange={handleStateChange} investorType={state.investorType} />
                                 <TaxCalculationToggle value={state.taxCalculationEnabled} onChange={handleStateChange} />
                                 <ResetAllButton onReset={handleResetAll} />
                             </div>
                         </div>
                    </div>

                    {/* Parameters Panel */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                       
                       

                       

                        <div>
                            <h3 className="typo-h2 text-[#4A6D8C] mb-4">Forventet avkastning</h3>
                            <SliderInput
                                id="stockReturnRate"
                                label="Forventet avkastning aksjeportefølje"
                                value={state.stockReturnRate}
                                min={5}
                                max={10}
                                step={0.1}
                                onChange={handleStateChange}
                                displayValue={`${state.stockReturnRate.toFixed(1)}%`}
                                thumbColor="#4A6D8C"
                            />
                            <SliderInput
                                id="bondReturnRate"
                                label="Forventet avkastning renteportefølje"
                                value={state.bondReturnRate}
                                min={3}
                                max={9}
                                step={0.1}
                                onChange={handleStateChange}
                                displayValue={`${state.bondReturnRate.toFixed(1)}%`}
                                thumbColor="#4A6D8C"
                            />
                            <SliderInput
                                id="bankDepositRate"
                                label="Forventet rente Bankinnskudd"
                                value={state.bankDepositRate}
                                min={3}
                                max={9}
                                step={0.1}
                                onChange={handleStateChange}
                                displayValue={`${state.bankDepositRate.toFixed(1)}%`}
                                thumbColor="#4A6D8C"
                            />
                            <SliderInput
                                id="kpiRate"
                                label="Forventet KPI"
                                value={state.kpiRate}
                                min={0}
                                max={5}
                                step={0.1}
                                onChange={handleStateChange}
                                displayValue={`${state.kpiRate.toFixed(1)}%`}
                                thumbColor="#4A6D8C"
                            />

                            {/* Rådgivningshonorar knapper */}
                            <div className="mt-4">
                                <div className="typo-label text-[#333333]/80 mb-2">Rådgivningshonorar</div>
                                <div className="grid grid-cols-6 gap-2 items-center">
                                    {/* Fritekstfelt (venstre) */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={advisoryInputValue}
                                            onChange={(e) => {
                                                const raw = (e.target.value || '').replace(/\s/g, '').replace(',', '.');
                                                if (raw === '') { setAdvisoryInputValue(''); return; }
                                                if (/^\d*\.?\d{0,2}$/.test(raw)) {
                                                    setAdvisoryInputValue(raw.replace('.', ','));
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const raw = (e.target.value || '').replace(/\s/g, '').replace(',', '.');
                                                let num = parseFloat(raw);
                                                if (isNaN(num)) num = 0;
                                                if (num < 0) num = 0;
                                                if (num > 5) num = 5;
                                                handleStateChange('advisoryFeeRate', num);
                                                setAdvisoryInputValue(num.toFixed(2).replace('.', ','));
                                            }}
                                            className="w-full h-12 bg-white border border-[#DDDDDD] rounded-lg text-center text-base text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent pr-8"
                                        />
                                        <span className="absolute inset-y-0 right-2 flex items-center text-[#333333]/80">%</span>
                                    </div>
                                    {/* Forhåndsvalg */}
                                    {[
                                        { label: '1,37%', value: 1.37 },
                                        { label: '0,93%', value: 0.93 },
                                        { label: '0,81%', value: 0.81 },
                                        { label: '0,69%', value: 0.69 },
                                        { label: '0,57%', value: 0.57 },
                                    ].map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => {
                                                handleStateChange('advisoryFeeRate', opt.value);
                                                setAdvisoryInputValue((v) => v); // behold brukerens manuelle verdi i feltet
                                            }}
                                            className={`${state.advisoryFeeRate === opt.value ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'} h-12 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Forventet avkastning felt */}
                            <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-3 mt-4">
                                <div className="typo-label text-[#333333]/70 mb-1">Forventet avkastning:</div>
                                <div className="text-lg font-semibold text-[#4A6D8C]">
                                    {(() => {
                                        const stockAllocation = state.initialStockAllocation / 100;
                                        const bondAllocation = (100 - state.initialStockAllocation) / 100;
                                        const netStock = (state.stockReturnRate - state.kpiRate - state.advisoryFeeRate) * stockAllocation;
                                        const netBond = (state.bondReturnRate - state.kpiRate - state.advisoryFeeRate) * bondAllocation;
                                        const weightedReturn = netStock + netBond;
                                        return `${weightedReturn.toFixed(1)}%`;
                                    })()}
                                </div>
                            </div>
                        </div>
                       
                        {/* Skatt seksjon */}
                        <div className="mt-4">
                            <h3 className="typo-h2 text-[#4A6D8C] mb-4">Skatt</h3>
                            <div className="space-y-4">
                                <SliderInput id="shieldingRate" label="Skjermingsrente" value={state.shieldingRate} min={2} max={7} step={0.01} onChange={handleStateChange} displayValue={`${state.shieldingRate.toFixed(2)}%`} thumbColor="#4A6D8C" />
                                <ManualTaxInput id="manualStockTaxRate" label="Utbytteskatt / skatt aksjer (%)" value={state.manualStockTaxRate} onChange={handleStateChange} />
                                <ManualTaxInput id="manualBondTaxRate" label="Kapitalskatt (%)" value={state.manualBondTaxRate} onChange={handleStateChange} />
                                <SliderInput id="stockStdDev" label="Standardavvik aksjer" value={state.stockStdDev} min={5} max={20} step={0.1} onChange={handleStateChange} displayValue={`${state.stockStdDev.toFixed(1)}%`} thumbColor="#4A6D8C" />
                                <SliderInput id="bondStdDev" label="Standardavvik renter" value={state.bondStdDev} min={1} max={8} step={0.1} onChange={handleStateChange} displayValue={`${state.bondStdDev.toFixed(1)}%`} thumbColor="#4A6D8C" />
                            </div>
                        </div>
                    </div>

                    {/* Events Panel */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <h2 className="typo-h2 text-[#4A6D8C]">Hendelser</h2>
                            <button onClick={handleAddEvent} disabled={(state.events?.length || 0) >= MAX_EVENTS} className={`flex items-center gap-2 font-medium py-2 px-4 rounded-lg transition-all transform hover:-translate-y-0.5 shadow-md ${((state.events?.length || 0) >= MAX_EVENTS) ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-[#4A6D8C] hover:bg-[#3A5D7C] text-white'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                <span>Legg til hendelse</span>
                            </button>
                        </div>
                       
                        <div className="space-y-3 mt-4">
                            {(state.events.slice(0, MAX_EVENTS)).map(event => (
                                <EventRow key={event.id} event={event} onUpdate={handleUpdateEvent} onRemove={handleRemoveEvent} maxYear={maxEventYear} />
                            ))}
                            {Array.from({ length: Math.max(0, MAX_EVENTS - (state.events?.length || 0)) }).map((_, idx) => (
                                <div key={`placeholder-${idx}`} className="bg-white border border-dashed border-[#DDDDDD] rounded-lg p-4 flex items-center justify-between">
                                    <div className="text-[#333333]/60">Tom plass for hendelse</div>
                                    <button onClick={handleAddEvent} disabled={(state.events?.length || 0) >= MAX_EVENTS} className={`px-3 py-1 rounded-md text-sm font-medium ${((state.events?.length || 0) >= MAX_EVENTS) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#4A6D8C] text-white hover:bg-[#3A5D7C]'}`}>
                                        Legg til
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setShowLoanImportModal(true)} className="w-full text-xs font-medium py-1.5 px-2.5 rounded-lg border border-[#DDDDDD] bg-white text-[#333333]">
                                Importer hendelser fra lånekalkulator
                            </button>
                        </div>

                    </div>
                </div>
            </div>
            {showLoanImportModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowLoanImportModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 relative max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <button type="button" aria-label="Lukk" onClick={() => setShowLoanImportModal(false)} className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]">✕</button>
                        <h3 className="typo-h3 text-[#4A6D8C] mb-2">Importer hendelser fra lånekalkulator</h3>
                        <p className="text-sm text-[#666] mb-3 whitespace-pre-line">Her limer du inn output fra dashboardet: Lånekalkulator
Input her er begrenset til de 10 første årene av lånet.
Det bruker skal betale årlig i renter og avdrag blir da lagt inn som en hendelse, med riktig år, og navnet: Lån
Som default står det at denne hendelsen vil påvirke innskutt kapital</p>
                        <textarea
                            autoFocus
                            value={loanImportText}
                            onChange={(e) => setLoanImportText(e.target.value)}
                            placeholder={'2026\tkr 1 041 526,-\n2027–2035\tkr 730 296,-'}
                            className="w-full min-h-[12rem] bg-white border border-[#DDDDDD] rounded-md p-3 text-[#333333] whitespace-pre font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent"
                        />
                        {loanImportText.trim() && loanImportParsed.error && (
                            <p className="text-sm text-[#CC0000] mt-2">{loanImportParsed.error}</p>
                        )}
                        {loanImportParsed.events.length > 0 && (
                            <ul className="mt-3 space-y-1 text-sm text-[#333333] max-h-40 overflow-auto">
                                {loanImportParsed.events.map((ev, i) => (
                                    <li key={i}>
                                        {ev.startAar === ev.sluttAar ? ev.startAar : `${ev.startAar}–${ev.sluttAar}`} · Lån · {formatCurrency(ev.belop)}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setShowLoanImportModal(false)} className="px-4 py-2 rounded-lg border border-[#DDDDDD] bg-white text-[#333333] font-medium">Avbryt</button>
                            <button type="button" onClick={handleImportLoanEvents} disabled={loanImportParsed.events.length === 0} className={`px-4 py-2 rounded-lg font-medium text-white ${loanImportParsed.events.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#4A6D8C] hover:bg-[#3A5D7C]'}`}>Importer</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}

// --- From index.tsx (Mounting logic) ---
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
    <React.StrictMode>
        <TabContainer />
    </React.StrictMode>
); 