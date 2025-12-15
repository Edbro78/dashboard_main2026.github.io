// Remove all imports and use global variables
const { useState, useMemo, useCallback, useEffect } = React;
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

const CHART_COLORS = {
    hovedstol: '#4A6D8C', // Mørk, dempet blå/grå
    avkastning: '#88CCEE', // Lysere blå
    sparing: '#888888', // Lekker grå
    utbetaling_netto: '#005599', // Mørkere blå for uttak
    utbetaling_skatt: '#CC4B4B', // Behagelig rød for skatt (årlige utbetalinger)
    event_total_color: '#66CC99', // Behagelig grønn for hendelser
    renteskatt: '#B14444', // Behagelig rød nyanse for løpende renteskatt
    skatt2: '#E06B6B', // Behagelig rød nyanse for skatt på hendelser
    aksjeandel: '#66CCDD', // Teal
    renteandel: '#A9BCCD', // Lys grå-blå
    innskutt_kapital: '#3388CC', // Hovedblå
    aksjer_principal: '#66CCDD', // Aksjer (hovedstol) – matchende blå/teal
    aksjer_avkastning: '#88CCEE', // Aksjeavkastning – lys blå
    renter_principal: '#A9BCCD', // Renter (hovedstol) – grå-blå
    renter_avkastning: '#D1DCE7' // Renteavkastning – lys grå-blå
};

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
const MAX_EVENTS = 4;

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
    pensionPortfolioSize: 0,
    additionalPensionAmount: 0,
    investedCapital: 0,
    investmentYears: 10,
    payoutYears: 0,
    desiredAnnualPayoutAfterTax: 0,
    initialStockAllocation: 0,
    stockReturnRate: 8.0,
    bondReturnRate: 5.0,
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
    goalSeekPayoutResult: 0, // Resultat fra målsøk utbetaling
    goalSeekPortfolio1Result: 0, // Resultat fra målsøk Portefølje I
    kpiRate: 0.0, // Ny slider for forventet KPI
    deferredInterestTax: false, // Utsatt skatt på renter (kun Privat)
    advisoryFeeRate: 0.0, // Rådgivningshonorar (prosentpoeng)
    // Uavhengige valg for aksjeandel per rad (UI)
    row1StockAllocation: 0,
    row2StockAllocation: 0,
    row3StockAllocation: 0,
    // Standardavvik for Monte Carlo simulering
    stockStdDev: 12.0, // Standardavvik aksjer (%)
    bondStdDev: 3.0, // Standardavvik renter (%)
};

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
    const totalSimulatedYears = state.investmentYears + state.payoutYears;
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
        renteskatt: [], event_total: [], skatt2: [],
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

    const annualStockPercentages = populateAnnualStockPercentages(state);
    const totalSimulatedYears = state.investmentYears + state.payoutYears;

    // --- START ROW ("start") BEFORE FIRST YEAR ---
    labels.push('start');
    // "Start" skal vise total investeringssum i hovedstol
    data.hovedstol.push(Math.round(state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0)));
    data.avkastning.push(0);
    data.sparing.push(0);
    data.event_total.push(0);
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
       
        // --- START OF YEAR ---

        // 1. Pay deferred tax from LAST year, split between event tax and bond tax (if enabled)
        const eventTaxToPayThisYear = taxesEnabled ? deferredEventTax : 0;
        const bondTaxToPayThisYear = taxesEnabled ? deferredBondTax : 0;
        if (taxesEnabled) {
            currentPortfolioValue -= (eventTaxToPayThisYear + bondTaxToPayThisYear);
        }
        deferredEventTax = 0; // Reset for the current year's calculation.
        deferredBondTax = 0; // Reset for the current year's calculation.

        // 2. Grow tax-free capital with shielding rate
        taxFreeCapitalRemaining *= (1 + shieldingRate);

        // 3. Handle inflows (savings and positive events)
        const isInvestmentYear = i < state.investmentYears;
        let totalInflow = isInvestmentYear ? state.annualSavings : 0;
        let eventWithdrawal = 0;
        let netEventAmountForChart = 0;

        state.events.forEach(event => {
            if (year >= event.startAar && year <= event.sluttAar) {
                netEventAmountForChart += event.belop;
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
                // Privat: Only stock portion of annual savings is added to invested capital
                // Savings are placed in Portefølje I, so use Portefølje I's stock allocation
                const portfolio1StockPercentage = state.row1StockAllocation || 0;
                savingsPart = state.annualSavings * (portfolio1StockPercentage / 100);
            } else {
                // AS: All annual savings are added to invested capital
                savingsPart = state.annualSavings;
            }
        }
       
        // Sum only positive event amounts flagged to increase invested capital
        let addToInvestedFromEvents = 0;
        if (totalInflow > 0) {
            state.events.forEach(event => {
                if (year >= event.startAar && year <= event.sluttAar) {
                    if (event.belop > 0 && event.addToInvestedCapital !== false) {
                        addToInvestedFromEvents += event.belop;
                    }
                }
            });
        }
       
        // Add both savings and events to invested capital
        taxFreeCapitalRemaining += (savingsPart + addToInvestedFromEvents);

        // 4. Calculate investment growth and running bond tax
        const annualBondPercentage = 100 - annualStockPercentage;
        let totalGrossReturn = 0;
        let totalNetReturnBeforeTax = 0; // Brutto avkastning minus KPI og honorar (før skatt)
        let annualBondTaxAmount = 0; // Bond tax paid for the CURRENT year (ikke utsatt)

        if (currentPortfolioValue > 0) {
            const stockValue = currentPortfolioValue * (annualStockPercentage / 100);
            const bondValue = currentPortfolioValue * (annualBondPercentage / 100);
            
            // Bruk simulerte avkastninger hvis aktivert, ellers bruk forventet avkastning
            let stockReturnRateForYear, bondReturnRateForYear;
            if (useSimulatedReturns && i < simulatedReturns.stockReturns.length) {
                stockReturnRateForYear = simulatedReturns.stockReturns[i] / 100;
                bondReturnRateForYear = simulatedReturns.bondReturns[i] / 100;
            } else {
                stockReturnRateForYear = state.stockReturnRate / 100;
                bondReturnRateForYear = state.bondReturnRate / 100;
            }
            
            const grossStockReturn = stockValue * stockReturnRateForYear;
            const grossBondReturn = bondValue * bondReturnRateForYear;
            totalGrossReturn = grossStockReturn + grossBondReturn;

            // Fordel KPI og rådgivningshonorar proporsjonalt mellom aksjer og renter
            const stockKpiReduction = stockValue * kpiRate;
            const bondKpiReduction = bondValue * kpiRate;
            const stockFeeReduction = stockValue * advisoryFeeRate;
            const bondFeeReduction = bondValue * advisoryFeeRate;
            const netStockReturn = grossStockReturn - stockKpiReduction - stockFeeReduction;
            const netBondReturnBeforeTax = grossBondReturn - bondKpiReduction - bondFeeReduction;
            totalNetReturnBeforeTax = netStockReturn + netBondReturnBeforeTax;

            // Utsatt rente-skatt: Ikke betal løpende renteskatt; legg i pool og skatt neste år ved uttak
            const useDeferredBondTax = taxesEnabled && state.deferredInterestTax === true;
            let portfolioReturn = 0;
            if (useDeferredBondTax) {
                untaxedBondReturnPool += grossBondReturn;
                annualBondTaxAmount = 0; // ingen direkte skatt i år
                // Legg til bruttoavkastning fratrukket KPI og honorar
                portfolioReturn = netStockReturn + netBondReturnBeforeTax;
                currentPortfolioValue += portfolioReturn;
            } else {
                // Standard: betal løpende renteskatt samme år (på nominell renteavkastning)
                annualBondTaxAmount = taxesEnabled ? (grossBondReturn * bondTaxRate) : 0;
                portfolioReturn = netStockReturn + (netBondReturnBeforeTax - annualBondTaxAmount);
                currentPortfolioValue += portfolioReturn;
            }
           
            // Update individual portfolio values proportionally based on their share and returns
            // Each portfolio grows based on its stock/bond allocation and return rates
            if (totalPortfolioValue > 0) {
                const p1Share = portfolio1Value / totalPortfolioValue;
                const p2Share = portfolio2Value / totalPortfolioValue;
                const p3Share = portfolio3Value / totalPortfolioValue;
               
                // Calculate return for each portfolio based on its stock allocation
                const p1StockPct = state.row1StockAllocation || 0;
                const p2StockPct = state.row2StockAllocation || 0;
                const p3StockPct = 0; // Likviditetsfond
               
                const p1Return = portfolio1Value * ((p1StockPct / 100) * stockReturnRateForYear + ((100 - p1StockPct) / 100) * bondReturnRateForYear) -
                                 portfolio1Value * kpiRate - portfolio1Value * advisoryFeeRate -
                                 (portfolio1Value * ((100 - p1StockPct) / 100) * bondReturnRateForYear * (useDeferredBondTax ? 0 : (taxesEnabled ? bondTaxRate : 0)));
                const p2Return = portfolio2Value * ((p2StockPct / 100) * stockReturnRateForYear + ((100 - p2StockPct) / 100) * bondReturnRateForYear) -
                                 portfolio2Value * kpiRate - portfolio2Value * advisoryFeeRate -
                                 (portfolio2Value * ((100 - p2StockPct) / 100) * bondReturnRateForYear * (useDeferredBondTax ? 0 : (taxesEnabled ? bondTaxRate : 0)));
                const p3Return = portfolio3Value * bondReturnRateForYear - portfolio3Value * kpiRate - portfolio3Value * advisoryFeeRate -
                                 (portfolio3Value * bondReturnRateForYear * (useDeferredBondTax ? 0 : (taxesEnabled ? bondTaxRate : 0)));
               
                portfolio1Value += p1Return;
                portfolio2Value += p2Return;
                portfolio3Value += p3Return;
            }
        }

        // 5. Handle outflows and calculate taxes
        let annualNetWithdrawalAmountForChart = 0;
       
        // 5a. Regular annual payouts (taxed in the same year)
        const isOrdinaryPayoutYear = (i >= state.investmentYears);
        const totalDesiredPayout = state.desiredAnnualConsumptionPayout + state.desiredAnnualWealthTaxPayout;
            if (isOrdinaryPayoutYear && totalDesiredPayout > 0) {
            let desiredNet = totalDesiredPayout;
            const stockShare = (annualStockPercentage / 100);
            const bondShare = 1 - stockShare;
            
            let fromTaxFree;
            let remainingDesiredNet;
            let grossWithdrawal;
            
            if (state.investorType === 'AS') {
                // AS: Full withdrawal amount reduces contributed capital first
                fromTaxFree = Math.min(desiredNet, taxFreeCapitalRemaining);
                taxFreeCapitalRemaining -= fromTaxFree;
                remainingDesiredNet = desiredNet - fromTaxFree;
                grossWithdrawal = fromTaxFree;
            } else {
                // Privat: Only the stock portion of the withdrawal reduces invested capital
                const stockPortionOfNet = desiredNet * stockShare;
                fromTaxFree = Math.min(stockPortionOfNet, taxFreeCapitalRemaining);
                taxFreeCapitalRemaining -= fromTaxFree;
                remainingDesiredNet = desiredNet - fromTaxFree;
                grossWithdrawal = fromTaxFree;
            }

            if (remainingDesiredNet > 0) {
                let grossNeededFromTaxable;
               
                if (taxesEnabled) {
                    if (state.investorType === 'AS') {
                        // AS: Defer utbytteskatt til neste år
                        const dividendTax = remainingDesiredNet * taxRate;
                        // Utsatt kapitalskatt på renter: Skatt er 22% av rentedelen av uttaksbeløpet
                        let bondDeferredTax = 0;
                        if (state.deferredInterestTax === true && bondShare > 0) {
                            // For AS med utsatt skatt på renter: Skatt er 22% av rentedelen av uttaksbeløpet
                            const bondPortionOfWithdrawal = remainingDesiredNet * bondShare;
                            bondDeferredTax = bondPortionOfWithdrawal * bondTaxRate;
                            // Realiser tilsvarende beløp fra poolen (proporsjonalt med uttaket)
                            const grossFromTaxable = remainingDesiredNet;
                            const grossFromBond = grossFromTaxable * bondShare;
                            const bondValueNow = currentPortfolioValue * bondShare; // etter avkastning, før uttak
                            const fractionOfBondPortfolio = bondValueNow > 0 ? (grossFromBond / bondValueNow) : 0;
                            const realizedUntaxedBondReturn = Math.min(untaxedBondReturnPool, untaxedBondReturnPool * fractionOfBondPortfolio);
                            untaxedBondReturnPool -= realizedUntaxedBondReturn;
                        }
                        grossNeededFromTaxable = remainingDesiredNet;
                        deferredEventTax += dividendTax;
                        deferredBondTax += bondDeferredTax;
                    } else {
                        // Privat: Deferer aksjeskatt + ev. kapitalskatt på ubeskattede renter proporsjonalt
                        const totalStockPortionNet = desiredNet * stockShare;
                        const stockLeftoverNet = Math.max(0, totalStockPortionNet - fromTaxFree);
                        const stockTax = stockLeftoverNet * taxRate;
                        let bondDeferredTax = 0;
                        if (state.deferredInterestTax === true && bondShare > 0) {
                            // For Privat med utsatt skatt på renter: Skatt er 22% av rentedelen av uttaksbeløpet
                            // Rentedel av uttak = remainingDesiredNet * bondShare
                            const bondPortionOfWithdrawal = remainingDesiredNet * bondShare;
                            bondDeferredTax = bondPortionOfWithdrawal * bondTaxRate;
                            // Realiser tilsvarende beløp fra poolen (proporsjonalt med uttaket)
                            const grossFromTaxable = remainingDesiredNet;
                            const grossFromBond = grossFromTaxable * bondShare;
                            const bondValueNow = currentPortfolioValue * bondShare; // etter avkastning, før uttak
                            const fractionOfBondPortfolio = bondValueNow > 0 ? (grossFromBond / bondValueNow) : 0;
                            const realizedUntaxedBondReturn = Math.min(untaxedBondReturnPool, untaxedBondReturnPool * fractionOfBondPortfolio);
                            untaxedBondReturnPool -= realizedUntaxedBondReturn;
                        }
                        const totalTax = stockTax + bondDeferredTax;
                        grossNeededFromTaxable = remainingDesiredNet;
                        deferredEventTax += stockTax; // aksjeskatt
                        deferredBondTax += bondDeferredTax; // kapitalskatt på renter
                    }
                } else {
                    // No taxes: withdraw exactly the remaining desired net
                    grossNeededFromTaxable = remainingDesiredNet;
                }
               
                grossWithdrawal += grossNeededFromTaxable;
            }
            currentPortfolioValue -= grossWithdrawal;
            annualNetWithdrawalAmountForChart += desiredNet;
        }

        // 5b. Event withdrawals (tax is DEFERRED to next year)
        if (eventWithdrawal < 0) {
            const withdrawalAmount = Math.abs(eventWithdrawal);
            // Bruk porteføljeverdi FØR uttaket til å beregne proporsjoner
            const preWithdrawalPortfolioValue = currentPortfolioValue;
            const stockShare = (annualStockPercentage / 100);
            const bondShare = 1 - stockShare;
            
            let coveredAmount;
            let taxableFromStock;
            let taxableFromBond;
            
            if (state.investorType === 'AS') {
                // AS: Full withdrawal amount reduces contributed capital first
                coveredAmount = Math.min(withdrawalAmount, taxFreeCapitalRemaining);
                taxFreeCapitalRemaining -= coveredAmount;
                taxableFromStock = 0; // Not used for AS
                taxableFromBond = 0; // Not used for AS
            } else {
                // Privat: Only the stock portion of the withdrawal reduces invested capital
                const stockPortionGross = withdrawalAmount * stockShare;
                coveredAmount = Math.min(stockPortionGross, taxFreeCapitalRemaining);
                taxFreeCapitalRemaining -= coveredAmount;
                taxableFromStock = Math.max(0, stockPortionGross - coveredAmount);
                taxableFromBond = withdrawalAmount * bondShare;
            }
           
            if (taxesEnabled) {
                if (state.investorType === 'Privat') {
                    const stockTax = taxableFromStock * taxRate;
                    let bondTaxNextYear = 0;
                    if (state.deferredInterestTax === true && bondShare > 0) {
                        // For Privat med utsatt skatt på renter: Skatt er 22% av rentedelen av uttaksbeløpet
                        // taxableFromBond er allerede beregnet som rentedelen av uttaket
                        bondTaxNextYear = taxableFromBond * bondTaxRate;
                        // Realiser tilsvarende beløp fra poolen (proporsjonalt med uttaket)
                        const bondValueNow = preWithdrawalPortfolioValue * bondShare; // før uttak
                        const fractionOfBondPortfolio = bondValueNow > 0 ? (taxableFromBond / bondValueNow) : 0;
                        const realizedUntaxedBondReturn = Math.min(untaxedBondReturnPool, untaxedBondReturnPool * fractionOfBondPortfolio);
                        untaxedBondReturnPool -= realizedUntaxedBondReturn;
                    }
                    deferredEventTax += stockTax;
                    deferredBondTax += bondTaxNextYear;
                } else {
                    // AS: remainder is taxed as dividend
                    const taxableWithdrawal = withdrawalAmount - coveredAmount;
                    if (taxableWithdrawal > 0) {
                        const dividendTax = taxableWithdrawal * taxRate;
                        let bondTaxNextYear = 0;
                        if (state.deferredInterestTax === true && bondShare > 0) {
                            // For AS med utsatt skatt på renter: Skatt er 22% av rentedelen av uttaksbeløpet
                            const bondPortionOfWithdrawal = taxableWithdrawal * bondShare;
                            bondTaxNextYear = bondPortionOfWithdrawal * bondTaxRate;
                            // Realiser tilsvarende beløp fra poolen (proporsjonalt med uttaket)
                            const bondValueNow = preWithdrawalPortfolioValue * bondShare; // før uttak
                            const fractionOfBondPortfolio = bondValueNow > 0 ? (bondPortionOfWithdrawal / bondValueNow) : 0;
                            const realizedUntaxedBondReturn = Math.min(untaxedBondReturnPool, untaxedBondReturnPool * fractionOfBondPortfolio);
                            untaxedBondReturnPool -= realizedUntaxedBondReturn;
                        }
                        deferredEventTax += dividendTax;
                        deferredBondTax += bondTaxNextYear;
                    }
                }
            }
            // Til slutt trekkes selve uttaket fra porteføljen
            currentPortfolioValue = preWithdrawalPortfolioValue - withdrawalAmount;
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
        data.nettoUtbetaling.push(Math.round(-annualNetWithdrawalAmountForChart));
        data.skatt2.push(Math.round(-(taxesEnabled ? eventTaxToPayThisYear : 0))); // Only event tax paid THIS year
        const bondTaxPaidThisYear = taxesEnabled ? (bondTaxToPayThisYear + annualBondTaxAmount) : 0; // Deferred fra i fjor + eventuell løpende i år
        data.renteskatt.push(Math.round(-bondTaxPaidThisYear));
        data.annualStockPercentages.push(Math.round(annualStockPercentage));
        data.annualBondPercentages.push(Math.round(annualBondPercentage));
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

// --- HELPER & CHILD COMPONENTS --- //
const SliderInput = ({ id, label, value, min, max, step, onChange, unit, isCurrency, displayValue, allowDirectInput, inline, thumbColor }) => {
const [textValue, setTextValue] = React.useState(() => (isCurrency ? formatCurrency(value) : `${formatNumberRaw(value)}${unit ? ` ${unit}` : ''}`));

React.useEffect(() => {
setTextValue(isCurrency ? formatCurrency(value) : `${formatNumberRaw(value)}${unit ? ` ${unit}` : ''}`);
}, [value, isCurrency, unit]);

const parseCurrencyInput = (raw) => {
const digitsOnly = String(raw).replace(/[^0-9]/g, '');
const num = parseInt(digitsOnly, 10);
return isNaN(num) ? 0 : num;
};

const handleBlur = () => {
if (!allowDirectInput) return;
const parsed = isCurrency ? parseCurrencyInput(textValue) : parseFloat(String(textValue).replace(/[^0-9.\-]/g, '')) || 0;
onChange(id, parsed);
setTextValue(isCurrency ? formatCurrency(parsed) : `${formatNumberRaw(parsed)}${unit ? ` ${unit}` : ''}`);
};

    return (
        <div>
            {inline ? (
                <div className="relative flex items-center gap-4 mt-1 pr-36">
                    <label htmlFor={id} className="typo-label text-[#333333]/80 whitespace-nowrap normal-case min-w-[90px]">{label}</label>
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
                            {displayValue ?? (isCurrency ? formatCurrency(value) : `${formatNumberRaw(value)} ${unit}`)}
                        </span>
                    )}
                </div>
            ) : (
                <>
                    <label htmlFor={id} className="typo-label text-[#333333]/80">{label}</label>
                    <div className="flex items-center gap-4 mt-1">
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
                                {displayValue ?? (isCurrency ? formatCurrency(value) : `${formatNumberRaw(value)} ${unit}`)}
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
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value === 'AS' ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>AS</span>
            </button>
            <button
                onClick={() => onChange('investorType', 'Privat')}
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value === 'Privat' ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
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
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>På</span>
            </button>
            <button
                onClick={() => onChange('taxCalculationEnabled', false)}
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${!value ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
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
                    className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${selected === 'Ja' ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
                >
                    <span>Ja</span>
                </button>
                <button
                    onClick={() => onChange('deferredInterestTax', false)}
                    className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${selected === 'Nei' ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
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
        className={`absolute -top-4 -left-4 bg-white border border-[#DDDDDD] rounded-full p-1.5 shadow hover:bg-gray-50 ${className || ''}`}
        aria-label={visible ? 'Skjul' : 'Vis'}
    >
        {visible ? (
            // Open eye
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6D8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        ) : (
            // Slashed eye
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6D8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94"></path>
                <path d="M1 1l22 22"></path>
                <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24"></path>
                <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.06 4.02"></path>
            </svg>
        )}
    </button>
);

// --- MAIN APP COMPONENT --- //
function App() {
    const [state, setState] = useState(INITIAL_APP_STATE);
    const [showDistributionGraphic, setShowDistributionGraphic] = useState(false);
    const [showStockPortionGraphic, setShowStockPortionGraphic] = useState(false);
    const [showInvestedCapitalGraphic, setShowInvestedCapitalGraphic] = useState(false);
    const [showGoalSeek, setShowGoalSeek] = useState(true);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
const [showOutputModal, setShowOutputModal] = useState(false);
const [outputText, setOutputText] = useState('');
const [copied, setCopied] = useState(false);
const [showInputModal, setShowInputModal] = useState(false);
const [inputText, setInputText] = useState('');
    const [showAssumptionsGraphic, setShowAssumptionsGraphic] = useState(false);
    const [showSimulation, setShowSimulation] = useState(false);
    const [showAccumulatedReturn, setShowAccumulatedReturn] = useState(false);
    const [showMonteCarlo, setShowMonteCarlo] = useState(false);
    const [monteCarloKey, setMonteCarloKey] = useState(0); // Brukes for å tvinge regenerering av Monte Carlo simulering
    const [showMonteCarloPortfolio, setShowMonteCarloPortfolio] = useState(false);
    const [monteCarloPortfolioKey, setMonteCarloPortfolioKey] = useState(0); // Brukes for å tvinge regenerering av Monte Carlo Portefølje simulering
    const [simButtonActive, setSimButtonActive] = useState(false);
    const [simulationKey, setSimulationKey] = useState(0); // Brukes for å tvinge regenerering av simulering
    const [savedSimulatedReturns, setSavedSimulatedReturns] = useState({ stockReturns: [], bondReturns: [] }); // Lagrer simulerte verdier
    const [advisoryInputValue, setAdvisoryInputValue] = useState(INITIAL_APP_STATE.advisoryFeeRate.toFixed(2).replace('.', ','));
    const [waterfallMode, setWaterfallMode] = useState(false);

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
            return { ...s, events: [...s.events, newEvent] };
        });
    }, []);

    const handleUpdateEvent = useCallback((id, key, value) => {
        setState(s => ({
            ...s,
            events: s.events.map(e => e.id === id ? { ...e, [key]: value } : e)
        }));
    }, []);

    const handleRemoveEvent = useCallback((id) => {
        setState(s => ({ ...s, events: s.events.filter(e => e.id !== id) }));
    }, []);

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
        const totalYears = (state.investmentYears || 0) + (state.payoutYears || 0);
        if (totalYears === 0) return { stockReturns: [], bondReturns: [] };
        
        const stockReturns = [];
        const bondReturns = [];
        const stockStdDev = state.stockStdDev || 12.0; // Standardavvik for aksjer fra state
        const bondStdDev = state.bondStdDev || 3.0; // Standardavvik for renter fra state
        const stockMean = state.stockReturnRate || 8.0; // Forventet avkastning aksjer
        const bondMean = state.bondReturnRate || 5.0; // Forventet avkastning renter
        
        // Simuler for nøyaktig totalYears antall år
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
    
    // Monte Carlo simulering: Beregn maksimal utbetaling gitt en simulert avkastningsserie
    const calculateMaxPayout = useCallback((stockReturns, bondReturns, state) => {
        const totalYears = state.investmentYears + state.payoutYears;
        if (totalYears === 0) return 0;
        
        const annualStockPercentages = populateAnnualStockPercentages(state);
        let portfolioValue = state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        
        // Simuler porteføljevekst gjennom alle årene
        const portfolioValues = [portfolioValue];
        
        for (let i = 0; i < totalYears; i++) {
            const isInvestmentYear = i < state.investmentYears;
            const stockPct = annualStockPercentages[i] / 100;
            const bondPct = 1 - stockPct;
            
            // Legg til sparing i investeringsårene
            if (isInvestmentYear && state.annualSavings > 0) {
                portfolioValue += state.annualSavings;
            }
            
            // Beregn avkastning
            const stockReturn = stockReturns[i] / 100;
            const bondReturn = bondReturns[i] / 100;
            const portfolioReturn = (stockPct * stockReturn) + (bondPct * bondReturn);
            
            portfolioValue *= (1 + portfolioReturn);
            portfolioValues.push(portfolioValue);
        }
        
        // Finn maksimal konstant årlig utbetaling som gjør at porteføljen går i null siste år
        // Bruk binærsøk for å finne maksimal utbetaling
        const initialValue = state.initialPortfolioSize + (state.pensionPortfolioSize || 0) + (state.additionalPensionAmount || 0);
        let low = 0;
        let high = initialValue * 2; // Start med høy verdi
        let maxPayout = 0;
        const tolerance = 100; // Toleranse i kroner
        
        while (high - low > tolerance) {
            const testPayout = (low + high) / 2;
            let testValue = initialValue;
            
            // Simuler med test utbetaling
            for (let i = 0; i < totalYears; i++) {
                const isInvestmentYear = i < state.investmentYears;
                const stockPct = annualStockPercentages[i] / 100;
                const bondPct = 1 - stockPct;
                
                // Legg til sparing i investeringsårene
                if (isInvestmentYear && state.annualSavings > 0) {
                    testValue += state.annualSavings;
                }
                
                // Beregn avkastning
                const stockReturn = stockReturns[i] / 100;
                const bondReturn = bondReturns[i] / 100;
                const portfolioReturn = (stockPct * stockReturn) + (bondPct * bondReturn);
                
                testValue *= (1 + portfolioReturn);
                
                // Trekk fra utbetaling i utbetalingsårene
                if (!isInvestmentYear) {
                    testValue -= testPayout;
                    if (testValue < 0) break;
                }
            }
            
            if (testValue < 0) {
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
        
        // Beregn total sum av utbetalinger
        const payoutYears = state.payoutYears;
        return maxPayout * payoutYears;
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
            
            // Legg til sparing i investeringsårene
            if (state.annualSavings > 0) {
                portfolioValue += state.annualSavings;
            }
            
            // Beregn avkastning
            const stockReturn = stockReturns[i] / 100;
            const bondReturn = bondReturns[i] / 100;
            const portfolioReturn = (stockPct * stockReturn) + (bondPct * bondReturn);
            
            portfolioValue *= (1 + portfolioReturn);
        }
        
        return portfolioValue;
    }, []);
    
    // Monte Carlo simulering: Gjør 10 simuleringer
    const monteCarloResults = useMemo(() => {
        // Hvis monteCarloKey er 0, returner tom array (ingen simulering gjort ennå)
        if (monteCarloKey === 0) return [];
        
        const totalYears = state.investmentYears + state.payoutYears;
        if (totalYears === 0 || state.payoutYears === 0) return [];
        
        const stockStdDev = state.stockStdDev || 12.0; // Standardavvik for aksjer fra state
        const bondStdDev = state.bondStdDev || 3.0; // Standardavvik for renter fra state
        const stockMean = state.stockReturnRate || 8.0;
        const bondMean = state.bondReturnRate || 5.0;
        
        const results = [];
        
        for (let sim = 0; sim < 1000; sim++) {
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
    }, [monteCarloKey, state.stockStdDev, state.bondStdDev, state.stockReturnRate, state.bondReturnRate, state.investmentYears, state.payoutYears]); // Regenerer når standardavvik eller andre relevante verdier endres
    
    // Beregn normalfordelingsdata for grafikken
    const monteCarloChartData = useMemo(() => {
        if (monteCarloResults.length === 0) return null;
        
        const mean = monteCarloResults.reduce((a, b) => a + b, 0) / monteCarloResults.length;
        const variance = monteCarloResults.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monteCarloResults.length;
        const stdDev = Math.sqrt(variance);
        
        // Beregn x-aksen basert på mean ± 2 standardavvik for å alltid vise to standardavvik
        // Sikre at range er minimum gjennomsnittet ± 2 standardavvik
        const meanPlus2StdDev = mean + (2 * stdDev);
        const meanMinus2StdDev = mean - (2 * stdDev);
        
        // Finn faktisk min og max fra simuleringene
        const actualMin = Math.min(...monteCarloResults);
        const actualMax = Math.max(...monteCarloResults);
        
        // Bruk den største av faktisk range eller mean ± 2 stdDev
        const requiredMin = Math.min(meanMinus2StdDev, actualMin);
        const requiredMax = Math.max(meanPlus2StdDev, actualMax);
        
        // Legg til litt padding (10% på hver side) for bedre visuell presentasjon
        const padding = (requiredMax - requiredMin) * 0.1;
        const range = (requiredMax - requiredMin) + (2 * padding);
        const numPoints = 200;
        const step = range / numPoints;
        const startX = requiredMin - padding;
        
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
        
        // Beregn frekvenstabell: 10 linjer basert på gjennomsnittet ± 2 standardavvik
        let frequencyTable = [];
        
        if (isNaN(mean) || isNaN(stdDev) || stdDev <= 0 || !isFinite(mean) || !isFinite(stdDev)) {
            // Hvis mean eller stdDev ikke er gyldig, returner tom tabell
            frequencyTable = [];
        } else {
            const numBins = 10; // 10 linjer i tabellen
            const meanMinus2StdDev = mean - (2 * stdDev);
            const meanPlus2StdDev = mean + (2 * stdDev);
            const totalRange = meanPlus2StdDev - meanMinus2StdDev;
            const binWidth = totalRange / numBins;
            
            // Opprett 10 intervaller
            const bins = [];
            for (let i = 0; i < numBins; i++) {
                const binStart = meanMinus2StdDev + (i * binWidth);
                const binEnd = meanMinus2StdDev + ((i + 1) * binWidth);
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
        
        const stockStdDev = state.stockStdDev || 12.0; // Standardavvik for aksjer fra state
        const bondStdDev = state.bondStdDev || 3.0; // Standardavvik for renter fra state
        const stockMean = state.stockReturnRate || 8.0;
        const bondMean = state.bondReturnRate || 5.0;
        
        const results = [];
        
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
            
            // Beregn porteføljens verdi ved slutten av investeringsperioden
            const portfolioValue = calculatePortfolioValue(stockReturns, bondReturns, state);
            results.push(portfolioValue);
        }
        
        return results.sort((a, b) => a - b); // Sorter for å lage normalfordeling
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monteCarloPortfolioKey, calculatePortfolioValue, state.stockStdDev, state.bondStdDev, state.stockReturnRate, state.bondReturnRate, state.investmentYears]);
    
    // Beregn normalfordelingsdata for Portefølje-grafikken
    const monteCarloPortfolioChartData = useMemo(() => {
        if (monteCarloPortfolioResults.length === 0) return null;
        
        const mean = monteCarloPortfolioResults.reduce((a, b) => a + b, 0) / monteCarloPortfolioResults.length;
        const variance = monteCarloPortfolioResults.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monteCarloPortfolioResults.length;
        const stdDev = Math.sqrt(variance);
        
        // Beregn x-aksen basert på mean ± 2 standardavvik for å alltid vise to standardavvik
        // Sikre at range er minimum gjennomsnittet ± 2 standardavvik
        const meanPlus2StdDev = mean + (2 * stdDev);
        const meanMinus2StdDev = mean - (2 * stdDev);
        
        // Finn faktisk min og max fra simuleringene
        const actualMin = Math.min(...monteCarloPortfolioResults);
        const actualMax = Math.max(...monteCarloPortfolioResults);
        
        // Bruk den største av faktisk range eller mean ± 2 stdDev
        const requiredMin = Math.min(meanMinus2StdDev, actualMin);
        const requiredMax = Math.max(meanPlus2StdDev, actualMax);
        
        // Legg til litt padding (10% på hver side) for bedre visuell presentasjon
        const padding = (requiredMax - requiredMin) * 0.1;
        const range = (requiredMax - requiredMin) + (2 * padding);
        const numPoints = 200;
        const step = range / numPoints;
        const startX = requiredMin - padding;
        
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
        
        // Beregn frekvenstabell: 10 linjer basert på gjennomsnittet ± 2 standardavvik
        let frequencyTable = [];
        
        if (isNaN(mean) || isNaN(stdDev) || stdDev <= 0 || !isFinite(mean) || !isFinite(stdDev)) {
            // Hvis mean eller stdDev ikke er gyldig, returner tom tabell
            frequencyTable = [];
        } else {
            const numBins = 10; // 10 linjer i tabellen
            const meanMinus2StdDev = mean - (2 * stdDev);
            const meanPlus2StdDev = mean + (2 * stdDev);
            const totalRange = meanPlus2StdDev - meanMinus2StdDev;
            const binWidth = totalRange / numBins;
            
            // Opprett 10 intervaller
            const bins = [];
            for (let i = 0; i < numBins; i++) {
                const binStart = meanMinus2StdDev + (i * binWidth);
                const binEnd = meanMinus2StdDev + ((i + 1) * binWidth);
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

// --- Output generation & clipboard helpers --- //
const generateOutputText = useCallback(() => {
const lines = [];
// Helper function to format currency without "kr" prefix
const formatCurrencyValue = (value) => formatNumberRaw(value);

// 1. Portefølje I
lines.push(`1 Portefølje I : ${formatCurrencyValue(state.initialPortfolioSize)}`);
// 2. Aksjeandel Portefølje I
lines.push(`2 Aksjeandel Portefølje I : ${formatNumberRaw(state.row1StockAllocation)}`);
// 3. Portefølje II
lines.push(`3 Portefølje II : ${formatCurrencyValue(state.pensionPortfolioSize)}`);
// 4. Aksjeandel Portefølje II
lines.push(`4 Aksjeandel Portefølje II : ${formatNumberRaw(state.row2StockAllocation)}`);
// 5. Likviditetsfond
lines.push(`5 Likviditetsfond : ${formatCurrencyValue(state.additionalPensionAmount)}`);
// 6. Årlig sparing
lines.push(`6 Årlig sparing : ${formatCurrencyValue(state.annualSavings)}`);
// 7. Innskutt kapital
lines.push(`7 Innskutt kapital : ${formatCurrencyValue(state.investedCapital)}`);
// 8. Antall år investeringsperiode
lines.push(`8 Antall år investeringsperiode : ${formatNumberRaw(state.investmentYears)}`);
// 9. Antall år med utbetaling
lines.push(`9 Antall år med utbetaling : ${formatNumberRaw(state.payoutYears)}`);
// 10. Ønsket årlig uttak til Forbruk
lines.push(`10 Ønsket årlig uttak til Forbruk : ${formatCurrencyValue(state.desiredAnnualConsumptionPayout)}`);
// 11. Ønsket årlig uttak til Formuesskatt
lines.push(`11 Ønsket årlig uttak til Formuesskatt : ${formatCurrencyValue(state.desiredAnnualWealthTaxPayout)}`);
// 12. Forventet avkastning aksjer
lines.push(`12 Forventet avkastning aksjer : ${state.stockReturnRate.toFixed(1)}`);
// 13. Forventet avkastning renter
lines.push(`13 Forventet avkastning renter : ${state.bondReturnRate.toFixed(1)}`);
// 14. Forventet KPI
lines.push(`14 Forventet KPI : ${state.kpiRate.toFixed(1)}`);
// 15. Rådgivningshonorar
lines.push(`15 Rådgivningshonorar : ${state.advisoryFeeRate.toFixed(2)}`);
// 16. Skjermingsrente
lines.push(`16 Skjermingsrente : ${state.shieldingRate.toFixed(2)}`);
// 17. Utbytteskatt
lines.push(`17 Utbytteskatt : ${state.manualStockTaxRate.toFixed(2)}`);
// 18. Kapitalskatt
lines.push(`18 Kapitalskatt : ${state.manualBondTaxRate.toFixed(2)}`);
// 19. Hendelse 1
if (state.events && state.events.length > 0 && state.events[0]) {
    const e1 = state.events[0];
    lines.push(`19 Hendelse 1 beløp : ${formatCurrencyValue(e1.belop || 0)}`);
    lines.push(`19a Hendelse 1 startår : ${e1.startAar || START_YEAR}`);
    lines.push(`19b Hendelse 1 sluttår : ${e1.sluttAar || START_YEAR}`);
    lines.push(`19c Hendelse 1 påvirker innskutt kapital : ${e1.addToInvestedCapital !== false ? 'Ja' : 'Nei'}`);
    lines.push(`19d Hendelse 1 type : ${e1.type || 'Hendelse'}`);
} else {
    lines.push(`19 Hendelse 1 beløp : 0`);
    lines.push(`19a Hendelse 1 startår : ${START_YEAR}`);
    lines.push(`19b Hendelse 1 sluttår : ${START_YEAR}`);
    lines.push(`19c Hendelse 1 påvirker innskutt kapital : Ja`);
    lines.push(`19d Hendelse 1 type : Hendelse`);
}
// 20. Hendelse 2
if (state.events && state.events.length > 1 && state.events[1]) {
    const e2 = state.events[1];
    lines.push(`20 Hendelse 2 beløp : ${formatCurrencyValue(e2.belop || 0)}`);
    lines.push(`20a Hendelse 2 startår : ${e2.startAar || START_YEAR}`);
    lines.push(`20b Hendelse 2 sluttår : ${e2.sluttAar || START_YEAR}`);
    lines.push(`20c Hendelse 2 påvirker innskutt kapital : ${e2.addToInvestedCapital !== false ? 'Ja' : 'Nei'}`);
    lines.push(`20d Hendelse 2 type : ${e2.type || 'Hendelse'}`);
} else {
    lines.push(`20 Hendelse 2 beløp : 0`);
    lines.push(`20a Hendelse 2 startår : ${START_YEAR}`);
    lines.push(`20b Hendelse 2 sluttår : ${START_YEAR}`);
    lines.push(`20c Hendelse 2 påvirker innskutt kapital : Ja`);
    lines.push(`20d Hendelse 2 type : Hendelse`);
}
// 21. Hendelse 3
if (state.events && state.events.length > 2 && state.events[2]) {
    const e3 = state.events[2];
    lines.push(`21 Hendelse 3 beløp : ${formatCurrencyValue(e3.belop || 0)}`);
    lines.push(`21a Hendelse 3 startår : ${e3.startAar || START_YEAR}`);
    lines.push(`21b Hendelse 3 sluttår : ${e3.sluttAar || START_YEAR}`);
    lines.push(`21c Hendelse 3 påvirker innskutt kapital : ${e3.addToInvestedCapital !== false ? 'Ja' : 'Nei'}`);
    lines.push(`21d Hendelse 3 type : ${e3.type || 'Hendelse'}`);
} else {
    lines.push(`21 Hendelse 3 beløp : 0`);
    lines.push(`21a Hendelse 3 startår : ${START_YEAR}`);
    lines.push(`21b Hendelse 3 sluttår : ${START_YEAR}`);
    lines.push(`21c Hendelse 3 påvirker innskutt kapital : Ja`);
    lines.push(`21d Hendelse 3 type : Hendelse`);
}
// 22. Hendelse 4
if (state.events && state.events.length > 3 && state.events[3]) {
    const e4 = state.events[3];
    lines.push(`22 Hendelse 4 beløp : ${formatCurrencyValue(e4.belop || 0)}`);
    lines.push(`22a Hendelse 4 startår : ${e4.startAar || START_YEAR}`);
    lines.push(`22b Hendelse 4 sluttår : ${e4.sluttAar || START_YEAR}`);
    lines.push(`22c Hendelse 4 påvirker innskutt kapital : ${e4.addToInvestedCapital !== false ? 'Ja' : 'Nei'}`);
    lines.push(`22d Hendelse 4 type : ${e4.type || 'Hendelse'}`);
} else {
    lines.push(`22 Hendelse 4 beløp : 0`);
    lines.push(`22a Hendelse 4 startår : ${START_YEAR}`);
    lines.push(`22b Hendelse 4 sluttår : ${START_YEAR}`);
    lines.push(`22c Hendelse 4 påvirker innskutt kapital : Ja`);
    lines.push(`22d Hendelse 4 type : Hendelse`);
}
// 23. Målsøk utbetaling resultat
lines.push(`23 Målsøk utbetaling resultat : ${formatCurrencyValue(state.goalSeekPayoutResult || 0)}`);
// 24. Målsøk Portefølje I resultat
lines.push(`24 Målsøk Portefølje I resultat : ${formatCurrencyValue(state.goalSeekPortfolio1Result || 0)}`);
// 25. Investortype
lines.push(`25 Investortype : ${state.investorType}`);
// 26. utsatt skatt på renter
lines.push(`26 utsatt skatt på renter : ${state.deferredInterestTax ? 'Ja' : 'Nei'}`);
// 27. Skatteberegning
lines.push(`27 Skatteberegning : ${state.taxCalculationEnabled ? 'På' : 'Av'}`);

return lines.join('\n');
}, [state, prognosis]);

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
const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
const updates = {};

lines.forEach(line => {
// Parse format: "number Label : value" or "numbera Label : value" etc.
const match = line.match(/^(\d+)([a-z]?)\s+(.+?)\s*:\s*(.+)$/);
if (match) {
const num = parseInt(match[1], 10);
const suffix = match[2] || '';
const label = match[3].trim();
const value = match[4].trim();
            
// Helper to parse number (remove spaces and parse)
const parseNumber = (str) => {
const cleaned = str.replace(/\s/g, '');
return parseFloat(cleaned) || 0;
};

// Helper to parse boolean from "Ja"/"Nei"
const parseBoolean = (str) => str.toLowerCase() === 'ja' || str.toLowerCase() === 'på';

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
case 5: // Likviditetsfond
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
case 12: // Forventet avkastning aksjer
updates.stockReturnRate = parseNumber(value);
break;
case 13: // Forventet avkastning renter
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
if (!updates.events) {
updates.events = [...(state.events || [])];
}
// Ensure event exists
if (updates.events.length === 0) {
updates.events[0] = { id: `event-${Date.now()}-1`, type: 'Hendelse', belop: 0, startAar: START_YEAR, sluttAar: START_YEAR, addToInvestedCapital: true };
}
if (suffix === 'a') {
// Startår
updates.events[0] = { ...updates.events[0], startAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'b') {
// Sluttår
updates.events[0] = { ...updates.events[0], sluttAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'c') {
// Påvirker innskutt kapital
updates.events[0] = { ...updates.events[0], addToInvestedCapital: parseBoolean(value) };
} else if (suffix === 'd') {
// Type
updates.events[0] = { ...updates.events[0], type: value || 'Hendelse' };
} else {
// Beløp
const event1Amount = parseNumber(value);
if (event1Amount !== 0) {
updates.events[0] = { ...updates.events[0], belop: event1Amount };
} else {
// Remove event if amount is 0 and no other meaningful data exists
const event = updates.events[0];
if (event.belop === 0 && event.startAar === START_YEAR && event.sluttAar === START_YEAR) {
updates.events = updates.events.filter((_, idx) => idx !== 0);
} else {
// Keep event but set amount to 0
updates.events[0] = { ...updates.events[0], belop: 0 };
}
}
}
break;
case 20: // Hendelse 2
if (!updates.events) {
updates.events = [...(state.events || [])];
}
// Ensure event exists
while (updates.events.length < 2) {
updates.events.push({ id: `event-${Date.now()}-${updates.events.length}`, type: 'Hendelse', belop: 0, startAar: START_YEAR, sluttAar: START_YEAR, addToInvestedCapital: true });
}
if (suffix === 'a') {
// Startår
updates.events[1] = { ...updates.events[1], startAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'b') {
// Sluttår
updates.events[1] = { ...updates.events[1], sluttAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'c') {
// Påvirker innskutt kapital
updates.events[1] = { ...updates.events[1], addToInvestedCapital: parseBoolean(value) };
} else if (suffix === 'd') {
// Type
updates.events[1] = { ...updates.events[1], type: value || 'Hendelse' };
} else {
// Beløp
const event2Amount = parseNumber(value);
if (event2Amount !== 0) {
updates.events[1] = { ...updates.events[1], belop: event2Amount };
} else {
// Remove event if amount is 0 and no other meaningful data exists
const event = updates.events[1];
if (event.belop === 0 && event.startAar === START_YEAR && event.sluttAar === START_YEAR) {
updates.events = updates.events.filter((_, idx) => idx !== 1);
} else {
// Keep event but set amount to 0
updates.events[1] = { ...updates.events[1], belop: 0 };
}
}
}
break;
case 21: // Hendelse 3
if (!updates.events) {
updates.events = [...(state.events || [])];
}
// Ensure event exists
while (updates.events.length < 3) {
updates.events.push({ id: `event-${Date.now()}-${updates.events.length}`, type: 'Hendelse', belop: 0, startAar: START_YEAR, sluttAar: START_YEAR, addToInvestedCapital: true });
}
if (suffix === 'a') {
// Startår
updates.events[2] = { ...updates.events[2], startAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'b') {
// Sluttår
updates.events[2] = { ...updates.events[2], sluttAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'c') {
// Påvirker innskutt kapital
updates.events[2] = { ...updates.events[2], addToInvestedCapital: parseBoolean(value) };
} else if (suffix === 'd') {
// Type
updates.events[2] = { ...updates.events[2], type: value || 'Hendelse' };
} else {
// Beløp
const event3Amount = parseNumber(value);
if (event3Amount !== 0) {
updates.events[2] = { ...updates.events[2], belop: event3Amount };
} else {
// Remove event if amount is 0 and no other meaningful data exists
const event = updates.events[2];
if (event.belop === 0 && event.startAar === START_YEAR && event.sluttAar === START_YEAR) {
updates.events = updates.events.filter((_, idx) => idx !== 2);
} else {
// Keep event but set amount to 0
updates.events[2] = { ...updates.events[2], belop: 0 };
}
}
}
break;
case 22: // Hendelse 4
if (!updates.events) {
updates.events = [...(state.events || [])];
}
// Ensure event exists
while (updates.events.length < 4) {
updates.events.push({ id: `event-${Date.now()}-${updates.events.length}`, type: 'Hendelse', belop: 0, startAar: START_YEAR, sluttAar: START_YEAR, addToInvestedCapital: true });
}
if (suffix === 'a') {
// Startår
updates.events[3] = { ...updates.events[3], startAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'b') {
// Sluttår
updates.events[3] = { ...updates.events[3], sluttAar: parseNumber(value) || START_YEAR };
} else if (suffix === 'c') {
// Påvirker innskutt kapital
updates.events[3] = { ...updates.events[3], addToInvestedCapital: parseBoolean(value) };
} else if (suffix === 'd') {
// Type
updates.events[3] = { ...updates.events[3], type: value || 'Hendelse' };
} else {
// Beløp
const event4Amount = parseNumber(value);
if (event4Amount !== 0) {
updates.events[3] = { ...updates.events[3], belop: event4Amount };
} else {
// Remove event if amount is 0 and no other meaningful data exists
const event = updates.events[3];
if (event.belop === 0 && event.startAar === START_YEAR && event.sluttAar === START_YEAR) {
updates.events = updates.events.filter((_, idx) => idx !== 3);
} else {
// Keep event but set amount to 0
updates.events[3] = { ...updates.events[3], belop: 0 };
}
}
}
break;
case 23: // Målsøk utbetaling resultat
updates.goalSeekPayoutResult = parseNumber(value);
break;
case 24: // Målsøk Portefølje I resultat
updates.goalSeekPortfolio1Result = parseNumber(value);
break;
case 25: // Investortype
updates.investorType = value;
break;
case 26: // utsatt skatt på renter
updates.deferredInterestTax = parseBoolean(value);
break;
case 27: // Skatteberegning
updates.taxCalculationEnabled = parseBoolean(value);
break;
}
}
});

// Ensure events array is clean
if (updates.events) {
updates.events = updates.events.filter(e => e !== null && e !== undefined);
}

return updates;
}, [state.events]);

const handleLoadInput = useCallback(() => {
if (!inputText.trim()) {
alert('Vennligst lim inn informasjon fra output.');
return;
}

try {
const updates = parseInputText(inputText);
setState(prevState => {
const newState = { ...prevState, ...updates };
// Update advisoryInputValue if advisoryFeeRate changed
if (updates.advisoryFeeRate !== undefined) {
setAdvisoryInputValue(newState.advisoryFeeRate.toFixed(2).replace('.', ','));
}
return newState;
});
setShowInputModal(false);
setInputText('');
} catch (error) {
alert('Kunne ikke lese inn data. Sjekk at formatet er riktig.');
console.error('Parse error:', error);
}
}, [inputText, parseInputText]);

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
        for (let i = 0; i < 50; i++) {
            const mid = (low + high) / 2;
            const v = simulateFinalPortfolio(mid);
            if (Math.abs(v) < 1000) {
                // Når vi er nær null (innenfor 1000 kr), stopp
                low = mid;
                break;
            }
            if (v >= 0) {
                high = mid;
            } else {
                low = mid;
            }
        }

        // Rund av til nærmeste slider-steg (10 000)
        const step = 10000;
        const rounded = Math.ceil(low / step) * step;
        setState(s => ({ ...s, annualSavings: rounded }));
    }, [state, prognosis.data.hovedstol]);

    // Målsøk: finn årlig utbetaling som får porteføljen til å gå akkurat i null i siste utbetalingsår
    const goalSeekAnnualPayout = useCallback(() => {
        // Hvis ingen utbetalingsår, gjør ingenting
        const hasPayoutYears = (state.payoutYears || 0) > 0;
        if (!hasPayoutYears) return;

        const simulateLastPrincipal = (consumptionPayoutValue) => {
            const p = calculatePrognosis({ 
                ...state, 
                desiredAnnualConsumptionPayout: consumptionPayoutValue,
                desiredAnnualWealthTaxPayout: 0  // Sett hele beløpet i forbruksutbetaling
            }, false, null);
            // Bruk sluttverdien etter avkastning og uttak i siste utbetalingsår
            // Dette sikrer at porteføljen går til null etter det spesifiserte antall år
            return p.finalPortfolioValue;
        };

        // Finn øvre grense med dobling
        let low = 0;
        let high = Math.max(state.desiredAnnualConsumptionPayout || 0, 10000);
        let last = simulateLastPrincipal(high);
        let attempts = 0;
        while (last >= 0 && high < 100000000 && attempts < 20) {
            high *= 2;
            last = simulateLastPrincipal(high);
            attempts++;
        }

        // Hvis selv enorme verdier holder, bruk det som øvre grense
        if (last >= 0) {
            high = 10000000; // Maks 10MNOK
        } else {
            // Binærsøk etter største årlige utbetaling som gir ikke-negativ hovedstol i siste år
            for (let i = 0; i < 50; i++) {
                const mid = (low + high) / 2;
                const v = simulateLastPrincipal(mid);
                if (Math.abs(v) < 1000) {
                    // Når vi er nær null (innenfor 1000 kr), stopp
                    low = mid;
                    break;
                }
                if (v >= 0) {
                    low = mid;
                } else {
                    high = mid;
                }
            }
        }

        // Rund av til nærmeste slider-steg for forbruksutbetaling (100000)
        const step = 100000;
        const rounded = Math.round(low / step) * step;
        setState(s => ({ 
            ...s, 
            desiredAnnualConsumptionPayout: rounded,
            desiredAnnualWealthTaxPayout: 0,  // Overstyr eventuelt eksisterende verdi
            goalSeekPayoutResult: rounded  // Lagre resultatet for visning
        }));
    }, [state, prognosis.data.hovedstol]);

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
            high = 100000000; // Maks 100MNOK
        } else {
            // Binærsøk etter minste Portefølje I størrelse som gir ikke-negativ hovedstol i siste år
            for (let i = 0; i < 50; i++) {
                const mid = (low + high) / 2;
                const v = simulateLastPrincipal(mid);
                if (Math.abs(v) < 1000) {
                    // Når vi er nær null (innenfor 1000 kr), stopp
                    low = mid;
                    break;
                }
                if (v >= 0) {
                    high = mid;
                } else {
                    low = mid;
                }
            }
        }

        // Rund av til nærmeste 10000
        const step = 10000;
        const rounded = Math.round(low / step) * step;
        setState(s => ({ 
            ...s, 
            initialPortfolioSize: rounded,
            goalSeekPortfolio1Result: rounded  // Lagre resultatet for visning
        }));
    }, [state, prognosis.data.hovedstol]);

    // Helper function for rounded corners on stacked bars
    // ALL segments get the EXACT SAME rounded corners on both top and bottom
    // Works the same for both positive and negative values, regardless of segment size
    const getStackedBarRadius = (context) => {
        const chart = context.chart;
        const datasetIndex = context.datasetIndex;
        const dataIndex = context.dataIndex;
        const meta = chart.getDatasetMeta(datasetIndex);
        const stack = meta.stack;
       
        if (!stack) {
            // Not stacked, round all corners
            return 4;
        }
       
        const parsed = meta.data[dataIndex];
        if (!parsed) {
            return { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 };
        }
       
        // Check if this segment has zero or near-zero height
        const segmentHeight = Math.abs(parsed.y - parsed.base);
        if (segmentHeight < 0.01) {
            return 0; // No rounding for zero-height segments
        }
       
        // ALL segments get the EXACT SAME borderRadius value - no exceptions, no proportional scaling
        return { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 };
    };
   
    const chartOptions = {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => `År ${items[0].label}`,
                    label: (context) => `${context.dataset.label || ''}: ${formatCurrency(context.raw)}`,
                }
            }
        },
        scales: {
            x: { 
                stacked: true, 
                grid: { display: false }, 
                ticks: { 
                    color: '#333333',
                    font: {
                        size: 12 // Økt med 20% fra 10 (10 * 1.2 = 12)
                    }
                } 
            },
            y: {
                stacked: true, 
                grid: { color: 'rgba(221, 221, 221, 0.3)' },
                ticks: { 
                    color: '#333333', 
                    callback: (value) => `${(value / 1000000).toLocaleString('nb-NO')} MNOK`,
                    font: {
                        size: 12 // Økt med 20% fra 10 (10 * 1.2 = 12)
                    }
                }
            }
        }
    };
   
    const investmentChartData = {
        labels: prognosis.labels,
        datasets: [
            { label: 'Avkastning', data: prognosis.data.avkastning, backgroundColor: CHART_COLORS.avkastning, stack: 'portfolio', borderRadius: getStackedBarRadius, borderSkipped: false },
            { label: 'Årlig sparing', data: prognosis.data.sparing, backgroundColor: CHART_COLORS.sparing, stack: 'portfolio', borderRadius: getStackedBarRadius, borderSkipped: false },
            { label: 'Hovedstol', data: prognosis.data.hovedstol, backgroundColor: CHART_COLORS.hovedstol, stack: 'portfolio', borderRadius: getStackedBarRadius, borderSkipped: false },
            { label: 'Hendelser', data: prognosis.data.event_total, backgroundColor: CHART_COLORS.event_total_color, stack: 'portfolio', borderRadius: getStackedBarRadius, borderSkipped: false },
            { label: 'Netto utbetaling', data: prognosis.data.nettoUtbetaling, backgroundColor: CHART_COLORS.utbetaling_netto, stack: 'portfolio', borderRadius: getStackedBarRadius, borderSkipped: false },
            ...(state.taxCalculationEnabled ? [
                { label: 'Skatt på hendelser', data: prognosis.data.skatt2, backgroundColor: CHART_COLORS.skatt2, stack: 'portfolio', borderRadius: getStackedBarRadius, borderSkipped: false },
                { label: 'Løpende renteskatt', data: prognosis.data.renteskatt, backgroundColor: CHART_COLORS.renteskatt, stack: 'portfolio', borderRadius: getStackedBarRadius, borderSkipped: false },
            ] : [])
        ],
    };


    const investedCapitalChartData = {
        labels: prognosis.labels,
        datasets: [{ label: 'Innskutt kapital', data: prognosis.data.investedCapitalHistory, backgroundColor: CHART_COLORS.innskutt_kapital, borderColor: CHART_COLORS.innskutt_kapital, borderRadius: 4, borderSkipped: false }],
    };

    const capitalChartOptions = { ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, stacked: false } }, plugins: { ...chartOptions.plugins, legend: { display: true, labels: { color: '#333333' } } } };
   
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

    // Fordeling: Uttak skal først redusere avkastning, deretter hovedstol. Aksjer kan ikke bli negativ.
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

        const inflowArr = new Array(len).fill(0);
        const outflowArr = new Array(len).fill(0);
        for (let i = 0; i < len; i++) {
            inflowArr[i] = Math.max(0, (sparing[i] || 0)) + Math.max(0, (events[i] || 0));
            outflowArr[i] = (-Math.min(0, (events[i] || 0))) + (-Math.min(0, (netPayout[i] || 0)));
        }

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
            // Add savings to Portefølje I (if investment year) - this is the value at start of year
            const isInvestmentYear = (i - 1) < (state.investmentYears || 0);
            if (isInvestmentYear && sparing[i] > 0) {
                portfolio1Val += sparing[i];
            }
           
            // Add event inflows to Portefølje I
            const eventInflow = Math.max(0, (events[i] || 0));
            if (eventInflow > 0) {
                portfolio1Val += eventInflow;
            }
           
            // Bruk simulerte avkastninger for dette året hvis aktivert
            let stockRetRateForYear, bondRetRateForYear;
            if (useSimulated && (i - 1) < activeSimulatedReturns.stockReturns.length) {
                stockRetRateForYear = activeSimulatedReturns.stockReturns[i - 1] / 100;
                bondRetRateForYear = activeSimulatedReturns.bondReturns[i - 1] / 100;
            } else {
                stockRetRateForYear = state.stockReturnRate / 100;
                bondRetRateForYear = state.bondReturnRate / 100;
            }
           
            // Calculate returns individually for each portfolio based on their values at start of year
            const p1StockPct = state.row1StockAllocation || 0;
            const p2StockPct = state.row2StockAllocation || 0;
            const p3StockPct = 0; // Likviditetsfond is always 0% stocks
           
            // Portfolio 1 returns (based on value at start of year)
            const p1StockValue = portfolio1Val * (p1StockPct / 100);
            const p1BondValue = portfolio1Val * ((100 - p1StockPct) / 100);
            const p1StockReturn = p1StockValue * (stockRetRateForYear - kpi - fee);
            const p1BondReturn = p1BondValue * (bondRetRateForYear - kpi - fee);
           
            // Portfolio 2 returns
            const p2StockValue = portfolio2Val * (p2StockPct / 100);
            const p2BondValue = portfolio2Val * ((100 - p2StockPct) / 100);
            const p2StockReturn = p2StockValue * (stockRetRateForYear - kpi - fee);
            const p2BondReturn = p2BondValue * (bondRetRateForYear - kpi - fee);
           
            // Portfolio 3 returns (Likviditetsfond - always bonds)
            const p3BondReturn = portfolio3Val * (bondRetRateForYear - kpi - fee);
           
            // Sum up returns
            aksjeAvkastningAnnual[i] = Math.round(p1StockReturn + p2StockReturn);
            renteAvkastningAnnual[i] = Math.round(p1BondReturn + p2BondReturn + p3BondReturn);
           
            // Update portfolio values with returns for next year's start value
            portfolio1Val += p1StockReturn + p1BondReturn;
            portfolio2Val += p2StockReturn + p2BondReturn;
            portfolio3Val += p3BondReturn;
           
            // Handle withdrawals proportionally
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

        for (let i = 1; i < len; i++) {
            // 1) Legg til årlig bruttoavkastning på eksisterende avkastning
            let sRet = stockReturn[i - 1] + (aksjeAvkastningAnnual[i] || 0);
            let bRet = bondReturn[i - 1] + (renteAvkastningAnnual[i] || 0);

            // 2) Legg til innskudd (inflow) i hovedstol
            // Sparing skal fordeles iht. Portefølje I sin aksjeandel, ikke totalporteføljens
            const savingsAmount = sparing[i] || 0;
            const eventInflow = Math.max(0, (events[i] || 0));
            const totalInflow = inflowArr[i];
           
            // Calculate how much of savings goes to stocks based on Portefølje I allocation
            const portfolio1StockPct = state.row1StockAllocation || 0;
            const savingsToStocks = savingsAmount * (portfolio1StockPct / 100);
            const savingsToBonds = savingsAmount - savingsToStocks;
           
            // Events use Portefølje I allocation (same as savings)
            const eventToStocks = eventInflow * (portfolio1StockPct / 100);
            const eventToBonds = eventInflow * ((100 - portfolio1StockPct) / 100);
           
            let sPrin = stockPrincipal[i - 1] + savingsToStocks + eventToStocks;
            let bPrin = bondPrincipal[i - 1] + savingsToBonds + eventToBonds;

            // 3) Trekk ut uttak: først fra avkastning, deretter fra hovedstol
            const totalOut = outflowArr[i];
            // Fra avkastning først
            const [takeFromSRet, takeFromBRet] = allocateFromTwo(totalOut, sRet, bRet);
            sRet -= takeFromSRet;
            bRet -= takeFromBRet;
            let remainder = totalOut - (takeFromSRet + takeFromBRet);

            if (remainder > 0) {
                // Deretter fra hovedstol (kan ikke bli negativ)
                const [takeFromSPrin, takeFromBPrin] = allocateFromTwo(remainder, sPrin, bPrin);
                sPrin = Math.max(0, sPrin - takeFromSPrin);
                bPrin = Math.max(0, bPrin - takeFromBPrin);
            }

            stockReturn[i] = Math.round(Math.max(0, sRet));
            bondReturn[i] = Math.round(Math.max(0, bRet));
            stockPrincipal[i] = Math.round(Math.max(0, sPrin));
            bondPrincipal[i] = Math.round(Math.max(0, bPrin));
        }

        return {
            principalStockSeries: stockPrincipal,
            principalBondSeries: bondPrincipal,
            stockReturnSeries: stockReturn,
            bondReturnSeries: bondReturn,
        };
    }, [startValuesAllYears.length, stockPctAllYears, prognosis.data.sparing, prognosis.data.event_total, prognosis.data.nettoUtbetaling, startOfYearStockValues, startOfYearBondValues, state.stockReturnRate, state.bondReturnRate, state.initialPortfolioSize, simButtonActive, activeSimulatedReturns]);

    // Beregn akkumulert avkastning basert på simulerte avkastninger og aksjeandel
    const accumulatedReturnData = useMemo(() => {
        if (!savedSimulatedReturns.stockReturns.length || !prognosis.data.annualStockPercentages.length) {
            return { labels: [], indexValues: [], percentValues: [], krValues: [] };
        }

        const totalYears = state.investmentYears + state.payoutYears;
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
        datasets: [
            { label: 'Aksjer', data: principalStockSeries, backgroundColor: CHART_COLORS.aksjer_principal, stack: 'allYears', borderRadius: getStackedBarRadius, borderSkipped: false },
            { label: 'Aksjeavkastning', data: stockReturnSeries, backgroundColor: CHART_COLORS.aksjer_avkastning, stack: 'allYears', borderRadius: getStackedBarRadius, borderSkipped: false },
            { label: 'Renter', data: principalBondSeries, backgroundColor: CHART_COLORS.renter_principal, stack: 'allYears', borderRadius: getStackedBarRadius, borderSkipped: false },
            { label: 'Renteavkastning', data: bondReturnSeries, backgroundColor: CHART_COLORS.renter_avkastning, stack: 'allYears', borderRadius: getStackedBarRadius, borderSkipped: false },
        ],
    }), [labelsAllYears, principalStockSeries, stockReturnSeries, principalBondSeries, bondReturnSeries]);

    const stackedAllYearsOptions = useMemo(() => ({
        ...chartOptions,
        plugins: { ...chartOptions.plugins, legend: { display: true, labels: { color: '#333333' } } },
        scales: {
            x: { ...chartOptions.scales.x, stacked: true },
            y: { ...chartOptions.scales.y, stacked: true },
        },
    }), [chartOptions]);

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
                    color: '#333333',
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
        if (p1 > 0) bars.push({ key: 'p1', label: 'Portefølje I', stockPct: p1Stock, color: CHART_COLORS.hovedstol });
        if (p2 > 0) bars.push({ key: 'p2', label: 'Portefølje II', stockPct: p2Stock, color: CHART_COLORS.sparing });
        if (lf > 0) bars.push({ key: 'lf', label: 'Likviditetsfond', stockPct: lfStock, color: CHART_COLORS.avkastning });
        // Totalportefølje vises alltid
        bars.push({ key: 'tot', label: 'Totalportefølje', stockPct: totalStock, color: CHART_COLORS.hovedstol });
        return bars;
    }, [state.initialPortfolioSize, state.pensionPortfolioSize, state.additionalPensionAmount, state.row1StockAllocation, state.row2StockAllocation]);

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
            { key: 'p1', label: 'Portefølje I', stockPct: p1Stock, color: CHART_COLORS.hovedstol, present: p1 > 0 },
            { key: 'p2', label: 'Portefølje II', stockPct: p2Stock, color: CHART_COLORS.sparing, present: p2 > 0 },
            { key: 'lf', label: 'Likviditetsfond', stockPct: lfStock, color: CHART_COLORS.avkastning, present: lf > 0 },
            { key: 'tot', label: 'Totalportefølje', stockPct: totalStock, color: CHART_COLORS.hovedstol, present: true },
        ];
    }, [state.initialPortfolioSize, state.pensionPortfolioSize, state.additionalPensionAmount, state.row1StockAllocation, state.row2StockAllocation]);

    return (
        <div className="font-sans text-[#333333] bg-white p-4 sm:p-6 pr-8 sm:pr-12 min-h-screen w-full box-border">
            <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-6" style={{ paddingRight: '2rem' }}>

                <div className="relative">
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col overflow-hidden w-full">
                    <h1 className="typo-h1 text-center text-[#4A6D8C] mb-4">Mål og behov</h1>
                    <div className="relative h-[500px]" style={{ paddingRight: '0.5rem' }}>
                        <button
                            onClick={() => setShowDisclaimer(true)}
                            className="absolute -top-12 left-2 z-10 text-xs px-2 py-1 rounded-md border border-[#4A6D8C] bg-white text-[#4A6D8C] hover:bg-gray-100"
                            title="Disclaimer/forutsetninger"
                        >
                            Disclaimer/forutsetninger
                        </button>
                        <Bar options={chartOptions} data={investmentChartData} />
                    </div>
                    <CustomLegend items={state.taxCalculationEnabled ? LEGEND_DATA : LEGEND_DATA.filter(i => !['Skatt på hendelser','Løpende renteskatt'].includes(i.label))} />
                    </div>
                    
                    {/* Tre knapper til høyre - utenfor rammen */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center" style={{ transform: 'translateX(calc(100% + 1rem)) translateY(-50%)' }}>
                        {/* Sim */}
                        <button
                            type="button"
                            onClick={() => {
                                const newActive = !simButtonActive;
                                setSimButtonActive(newActive);
                                // Regenerer simulering når knappen aktiveres (blir grønn)
                                if (newActive) {
                                    setSimulationKey(prev => prev + 1);
                                }
                            }}
                            className={`${simButtonActive ? 'bg-[#66CC99] text-white' : 'bg-white border border-[#DDDDDD] text-[#333333]'} shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity relative`}
                        >
                            <span className={`text-sm font-bold ${!simButtonActive ? 'line-through opacity-70' : ''}`}>sim</span>
                        </button>
                        
                        {/* Målsøk sparing */}
                        <button
                            type="button"
                            onClick={goalSeekAnnualSavings}
                            className="bg-[#999999] text-white shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <span className="text-sm font-bold">Sp.</span>
                        </button>
                        
                        {/* Målsøk utbetaling */}
                        <button
                            type="button"
                            onClick={goalSeekAnnualPayout}
                            className="bg-[#66CC99] text-white shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <span className="text-xs font-bold">Utb.</span>
                        </button>
                        
                        {/* Målsøk Portefølje I */}
                        <button
                            type="button"
                            onClick={goalSeekPortfolio1}
                            className="bg-[#4A6D8C] text-white shadow-lg h-10 w-10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <span className="text-xs font-bold">Port.</span>
                        </button>
                    </div>
                </div>

                {/* Inputfelt for porteføljestørrelse, årlig sparing og aksjeandel */}
                <div className="relative w-full">
                    <div className="absolute inset-0 z-0 bg-white border border-[#DDDDDD] rounded-xl pointer-events-none"></div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
<div className="p-6 flex flex-col gap-6 relative" style={{ minHeight: '350px' }}>
                            <h2 className="typo-h2 text-[#4A6D8C]">Forutsetninger</h2>
                        <button
                            onClick={() => setShowAssumptionsGraphic(true)}
                            className="absolute top-4 right-4 bg-white hover:bg-gray-50 text-[#4A6D8C] rounded-xl p-2.5 shadow-sm border border-[#DDDDDD]"
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
                            <SliderInput id="initialPortfolioSize" label="Portefølje I (NOK)" value={state.initialPortfolioSize} min={1000000} max={100000000} step={250000} onChange={handleStateChange} isCurrency allowDirectInput thumbColor="#4A6D8C" />
                            <div className="mt-3">
                                <SliderInput id="pensionPortfolioSize" label="Portefølje II (NOK)" value={state.pensionPortfolioSize} min={0} max={100000000} step={500000} onChange={handleStateChange} isCurrency thumbColor="#3388CC" />
                            </div>
<div className="mt-3">
<SliderInput id="additionalPensionAmount" label="Likviditetsfond (NOK)" value={state.additionalPensionAmount} min={0} max={50000000} step={250000} onChange={handleStateChange} isCurrency thumbColor="#88CCEE" />
</div>
                    </div>
                    <div className="p-6 flex flex-col gap-6 xl:col-span-2" style={{ minHeight: '250px' }}>
                        <div>
                            <h2 className="typo-h2 text-[#4A6D8C]">Aksjeandel</h2>
                            <div className="flex flex-col gap-3 mt-8">
                                {/* Rad 1 */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2 items-center">
                                    {STOCK_ALLOCATION_OPTIONS.map(opt => (
                                        <button key={`row1-${opt.value}`} onClick={() => handleStateChange('row1StockAllocation', opt.value)} className={`${state.row1StockAllocation === opt.value ? 'bg-[#4A6D8C] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100 shadow-md'} h-20 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {/* Rad 2 */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2 items-center">
                                    {STOCK_ALLOCATION_OPTIONS.map(opt => (
                                        <button key={`row2-${opt.value}`} onClick={() => handleStateChange('row2StockAllocation', opt.value)} className={`${state.row2StockAllocation === opt.value ? 'bg-[#3388CC] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100 shadow-md'} h-20 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {/* Rad 3: Låst til 100% Renter */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2 items-center">
                                    <button type="button" disabled className="bg-[#88CCEE] text-white shadow-lg h-20 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium cursor-default">
                                        100% Renter
                                    </button>
                                </div>
                            </div>
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
                        onClick={goalSeekAnnualSavings}
                        className="xl:hidden bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100 h-20 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5"
                    >
                        Målsøk sparing
                    </button>
                    <div className="hidden xl:flex items-center gap-3 w-full">
                    <button
                        type="button"
                        onClick={goalSeekAnnualSavings}
                        className="bg-[#888888] border border-[#DDDDDD] text-white hover:bg-[#777777] h-16 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md flex-shrink-0"
                        style={{ width: '112px', height: '64px', flex: '0 0 auto' }}
                    >
                        Målsøk<br />sparing
                    </button>
                    <div className="bg-white border border-[#DDDDDD] rounded-lg h-20 flex items-center justify-center shadow-md" style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem', width: '25%', flex: '0 0 auto' }}>
                        <div style={{ width: '100%' }}>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="annualSavings" className="typo-label text-[#333333]/80 whitespace-nowrap normal-case">Årlig sparing</label>
                                <div className="relative flex items-center gap-2">
                                    <input
                                        type="range"
                                        id="annualSavings"
                                        name="annualSavings"
                                        min={0}
                                        max={1200000}
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
                        onClick={goalSeekAnnualPayout}
                        className="bg-[#66CCDD] border border-[#DDDDDD] text-white hover:bg-[#3388CC] h-16 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md flex-shrink-0"
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
                        onClick={goalSeekPortfolio1}
                        className="bg-[#4A6D8C] border border-[#DDDDDD] text-white hover:bg-[#3A5D7C] h-16 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md flex-shrink-0"
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
                        className="bg-[#999999] border border-[#DDDDDD] text-white hover:bg-[#888888] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%', marginRight: '10px' }}
                    >
                        Simulering<br />år for år
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // Vis kun modalen hvis det finnes en simulering
                            if (savedSimulatedReturns.stockReturns.length > 0) {
                                setShowAccumulatedReturn(true);
                            }
                        }}
                        className="bg-[#3498DB] border border-[#DDDDDD] text-white hover:bg-[#2980B9] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%', marginRight: '10px' }}
                    >
                        Simulering,<br />akkumulert avkastning
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // Generer ny Monte Carlo simulering hver gang knappen klikkes
                            setMonteCarloKey(k => k + 1);
                            setShowMonteCarlo(true);
                        }}
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
                        className="bg-[#2980B9] border border-[#DDDDDD] text-white hover:bg-[#21618C] h-16 rounded-2xl flex items-center justify-center text-center p-2 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-md"
                        style={{ flex: '1 1 0', minWidth: '0', maxWidth: '100%' }}
                    >
                        Monte Carlo<br />Portefølje
                    </button>
                    </div>
                    {/* Fallback for mindre skjermer: plasser slider under */}
                    <div className="xl:hidden mt-2">
                        <div className="w-[740px] max-w-full mx-auto">
                            <SliderInput id="annualSavings" label="Sparing" value={state.annualSavings} min={0} max={1200000} step={10000} onChange={handleStateChange} isCurrency inline />
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
                                                                {/* Bond section */}
                                                                <div
                                                                    style={{
                                                                        height: `${bondPct}%`,
                                                                        backgroundColor: '#D1DCE7',
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
                                                                    <span className="text-white font-bold text-xl select-none leading-tight">
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
                                        if (p1 > 0) items.push({ key: 'p1w', label: 'Portefølje I', value: p1, color: CHART_COLORS.hovedstol });
                                        if (p2 > 0) items.push({ key: 'p2w', label: 'Portefølje II', value: p2, color: CHART_COLORS.sparing });
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
                                        labels: Array.from({ length: (state.investmentYears || 0) + (state.payoutYears || 0) }, (_, i) => START_YEAR + i),
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
                                                    color: '#333333',
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
                                                    color: '#333333',
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
                                                title: {
                                                    display: true,
                                                    text: 'Akkumulert avkastning (%)',
                                                    color: '#4A6D8C',
                                                    font: {
                                                        size: 13,
                                                        weight: '600'
                                                    }
                                                },
                                                grid: {
                                                    ...chartOptions.scales.y.grid,
                                                    color: 'rgba(221, 221, 221, 0.3)',
                                                    lineWidth: 1,
                                                    drawBorder: false,
                                                },
                                                ticks: {
                                                    ...chartOptions.scales.y.ticks,
                                                    callback: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`,
                                                    color: '#4A6D8C',
                                                    font: {
                                                        size: 12,
                                                        weight: '500'
                                                    },
                                                    padding: 8,
                                                },
                                                beginAtZero: false
                                            },
                                            y1: {
                                                type: 'linear',
                                                position: 'right',
                                                title: {
                                                    display: true,
                                                    text: 'Årlig avkastning (kr)',
                                                    color: '#66CCDD',
                                                    font: {
                                                        size: 13,
                                                        weight: '600'
                                                    }
                                                },
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
                                                        size: 12,
                                                        weight: '500'
                                                    },
                                                    padding: 8,
                                                },
                                                beginAtZero: true
                                            }
                                        }
                                    }}
                                />
                            </div>
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
                            <h3 className="typo-h3 text-[#4A6D8C] mb-6 text-[2rem]">Monte Carlo Simulering</h3>
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
                                                        color: '#333333',
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
                                                        color: '#333333',
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
                                                        color: '#333333',
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
                            <h3 className="typo-h3 text-[#4A6D8C] mb-6 text-[2rem]">Monte Carlo Simulering</h3>
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
                                                        color: '#333333',
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
                                                        color: '#333333',
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
                                                        color: '#333333',
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
                        <SliderInput id="investedCapital" label="Innskutt kapital (skattefri) (NOK)" value={state.investedCapital} min={0} max={state.initialPortfolioSize + state.pensionPortfolioSize + state.additionalPensionAmount} step={100000} onChange={handleStateChange} isCurrency />
                        <SliderInput id="investmentYears" label="Antall år investeringsperiode" value={state.investmentYears} min={1} max={30} step={1} onChange={handleStateChange} unit="år" />
                        <SliderInput id="payoutYears" label="Antall år med utbetaling" value={state.payoutYears} min={0} max={30} step={1} onChange={handleStateChange} unit="år" />
                         
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
                                 />
                                 <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-3">
                                     <div className="typo-label text-[#333333]/70 mb-1">Sum ønsket årlig utbetaling (etter skatt):</div>
                                     <div className="text-lg font-semibold text-[#4A6D8C]">
                                         {formatCurrency(state.desiredAnnualConsumptionPayout + state.desiredAnnualWealthTaxPayout)}
                                     </div>
                                 </div>
                                 <ResetAllButton onReset={handleResetAll} />
                             </div>
                         </div>
                    </div>

                    {/* Parameters Panel */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                       
                       

                       

                        <div>
                            <h3 className="typo-h2 text-[#4A6D8C] mb-4">Forventet avkastning</h3>
                            <SliderInput id="stockReturnRate" label="Forventet avkastning aksjer" value={state.stockReturnRate} min={5} max={10} step={0.1} onChange={handleStateChange} displayValue={`${state.stockReturnRate.toFixed(1)}%`} />
                            <SliderInput id="bondReturnRate" label="Forventet avkastning renter" value={state.bondReturnRate} min={3} max={9} step={0.1} onChange={handleStateChange} displayValue={`${state.bondReturnRate.toFixed(1)}%`} />
                            <SliderInput id="kpiRate" label="Forventet KPI" value={state.kpiRate} min={0} max={5} step={0.1} onChange={handleStateChange} displayValue={`${state.kpiRate.toFixed(1)}%`} />

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
                                            className={`${state.advisoryFeeRate === opt.value ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'} h-12 rounded-lg flex items-center justify-center text-center p-1 text-sm font-medium transition-all hover:-translate-y-0.5`}
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
                                <SliderInput id="shieldingRate" label="Skjermingsrente" value={state.shieldingRate} min={2} max={7} step={0.01} onChange={handleStateChange} displayValue={`${state.shieldingRate.toFixed(2)}%`} />
                                <ManualTaxInput id="manualStockTaxRate" label="Utbytteskatt / skatt aksjer (%)" value={state.manualStockTaxRate} onChange={handleStateChange} />
                                <ManualTaxInput id="manualBondTaxRate" label="Kapitalskatt (%)" value={state.manualBondTaxRate} onChange={handleStateChange} />
                                <SliderInput id="stockStdDev" label="Standardavvik aksjer" value={state.stockStdDev} min={5} max={20} step={0.1} onChange={handleStateChange} displayValue={`${state.stockStdDev.toFixed(1)}%`} />
                                <SliderInput id="bondStdDev" label="Standardavvik renter" value={state.bondStdDev} min={1} max={8} step={0.1} onChange={handleStateChange} displayValue={`${state.bondStdDev.toFixed(1)}%`} />
                            </div>
                        </div>
                    </div>

                    {/* Events Panel - fixed 4-slot area with controls below */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <h2 className="typo-h2 text-[#4A6D8C]">Hendelser</h2>
                            <button onClick={handleAddEvent} disabled={(state.events?.length || 0) >= MAX_EVENTS} className={`flex items-center gap-2 font-medium py-2 px-4 rounded-lg transition-all transform hover:-translate-y-0.5 shadow-md ${((state.events?.length || 0) >= MAX_EVENTS) ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-[#3388CC] hover:bg-[#005599] text-white'}`}>
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
                                    <button onClick={handleAddEvent} disabled={(state.events?.length || 0) >= MAX_EVENTS} className={`px-3 py-1 rounded-md text-sm font-medium ${((state.events?.length || 0) >= MAX_EVENTS) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#3388CC] text-white hover:bg-[#005599]'}`}>
                                        Legg til
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-[#EEEEEE] space-y-4">
                            <InvestorTypeToggle value={state.investorType} onChange={handleStateChange} />
                            <DeferredInterestTaxToggle value={state.deferredInterestTax} onChange={handleStateChange} investorType={state.investorType} />
                            <TaxCalculationToggle value={state.taxCalculationEnabled} onChange={handleStateChange} />
                        </div>
                    </div>
                </div>
            </div>

{/* Fixed Input button */}
<button
onClick={handleOpenInput}
className="fixed bottom-4 z-50 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-700/70 hover:bg-slate-700 text-slate-200 border border-slate-600/70 shadow-sm transition-colors"
style={{ left: '1rem' }}
aria-label="Input"
>
Input
</button>

{/* Fixed Output button */}
<button
onClick={handleOpenOutput}
className="fixed bottom-4 z-50 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-700/70 hover:bg-slate-700 text-slate-200 border border-slate-600/70 shadow-sm transition-colors"
style={{ right: '4rem' }}
aria-label="Output"
>
Output
</button>

{/* Input Modal */}
{showInputModal && (
<div
className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
onClick={() => setShowInputModal(false)}
>
<div
className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[80vh] overflow-auto"
onClick={(e) => e.stopPropagation()}
>
<button
aria-label="Lukk"
onClick={() => setShowInputModal(false)}
className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
>
✕
</button>
<h3 className="typo-h3 text-[#4A6D8C] mb-4">Input</h3>
<div className="space-y-4">
<div>
<label className="typo-label text-[#333333]/80 mb-2 block">Paste inn informasjon fra output</label>
<textarea
value={inputText}
onChange={(e) => setInputText(e.target.value)}
placeholder="Lim inn output-teksten her..."
className="output-textarea w-full h-64 bg-white border border-[#DDDDDD] rounded-md p-3 text-[#333333] whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent"
/>
</div>
<button
onClick={handleLoadInput}
type="button"
className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
>
Last inn
</button>
</div>
</div>
</div>
)}

{/* Output Modal */}
{showOutputModal && (
<div
className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
onClick={() => setShowOutputModal(false)}
>
<div
className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[80vh] overflow-auto"
onClick={(e) => e.stopPropagation()}
>
<button
aria-label="Lukk"
onClick={() => setShowOutputModal(false)}
className="absolute top-3 right-3 text-[#333333]/70 hover:text-[#333333]"
>
✕
</button>
<h3 className="typo-h3 text-[#4A6D8C] mb-4">Output</h3>
<div className="relative">
<textarea
readOnly
value={outputText}
className="output-textarea w-full h-64 bg-white border border-[#DDDDDD] rounded-md p-3 text-[#333333] whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent pr-24"
/>
<button
onClick={handleCopyOutput}
type="button"
className={`copy-btn absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border shadow-sm transition-all ${copied ? 'bg-green-600 hover:bg-green-700 text-white border-green-500/80' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500/80'}`}
>
{copied ? (
<>
{/* Check icon */}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
<span>Kopiert!</span>
</>
) : (
<>
{/* Copy icon */}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
<span>Kopier</span>
</>
)}
</button>
</div>
</div>
</div>
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
        <App />
    </React.StrictMode>
); 