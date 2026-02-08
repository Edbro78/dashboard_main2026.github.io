document.addEventListener('DOMContentLoaded', function() {
    
    const sharedData = {
        taxAsPercentageOfGross: 0,
        inflationRate: 3.0,
    };

    // --- APPLIKASJONSOPPSETT ---
    const WealthTaxApp = {
        // Konfigurasjon for ulike eiendelstyper, inkludert etiketter, startverdier og sliderområder.
        assetsConfig: [
            { id: 'primary-residence', label: 'Primærbolig', value: 0, min: 0, max: 70000000, step: 100000 },
            { id: 'holiday-home', label: 'Fritidseiendom', value: 0, min: 0, max: 40000000, step: 50000 },
            { id: 'land-plot', label: 'Tomt', value: 0, min: 0, max: 10000000, step: 50000 },
            { id: 'car-boat', label: 'Bil / Båt', value: 0, min: 0, max: 10000000, step: 10000 },
            { id: 'limited-company', label: 'Aksjeselskap (AS)', value: 0, min: 0, max: 100000000, step: 100000 },
            { id: 'private-portfolio', label: 'Privat portefølje (ASK)', value: 0, min: 0, max: 100000000, step: 100000 },
            { id: 'secondary-residence', label: 'Sekundærbolig', value: 0, min: 0, max: 30000000, step: 50000 },
            { id: 'bank-deposits', label: 'Bankinnskudd', value: 0, min: 0, max: 50000000, step: 50000 },
            { id: 'operating-assets', label: 'Driftsmidler', value: 0, min: 0, max: 20000000, step: 50000 },
        ],
        // Rabattsatser/verdivurderingsfaktorer for ulike eiendelstyper.
        // Disse representerer hvor mye av eiendelens verdi som medregnes i formuegrunnlaget.
        discounts: {
            // For primærbolig: 25% verdivurdering (dvs. 75% rabatt) opp til terskel på 10M, og 70% verdivurdering (dvs. 30% rabatt) over terskel.
            'primary-residence': { valuation_under_threshold: 0.25, valuation_over_threshold: 0.70 },
            'holiday-home': 0.30, // 30% verdivurdering
            'land-plot': 0.80,    // 80% verdivurdering
            'car-boat': 1,        // 100% verdivurdering (0% rabatt)
            'limited-company': 0.80, // 80% verdivurdering (20% rabatt)
            'private-portfolio': 0.80, // 80% verdivurdering (20% rabatt)
            'secondary-residence': 1, // 100% verdivurdering (0% rabatt)
            'bank-deposits': 1,      // 100% verdivurdering (0% rabatt)
            'operating-assets': 0.70, // 70% verdivurdering (30% rabatt)
        },
        // Applikasjonsstatus, f.eks. antall personer for skatteberegninger.
        state: { personCount: 1 },
        // Skaleringsfaktor for å øke rekkevidden (max) på alle sliders.
        rangeScaleFactor: 3,
        
        // Initialiserer applikasjonen: oppretter eiendelsinput-sliders og fester hendelseslyttere.
        init: function() {
            this.createAssetInputs();
            this.attachEventListeners();
            this.calculateAll(); // Utfører første beregning
            this.setupNavigation(); // Setter opp sidenavigasjon
        },

        // Setter opp sidenavigasjon
        setupNavigation: function() {
            const toPage2 = document.getElementById('goToPage2Btn');
            const toPage1 = document.getElementById('goToPage1Btn');
            if (toPage2) toPage2.addEventListener('click', () => this.showPage('page2'));
            if (toPage1) toPage1.addEventListener('click', () => this.showPage('page1'));
        },

        // Viser en spesifikk side
        showPage: function(pageId) {
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            
            if (pageId === 'page2') {
                this.updatePage2();
            }
        },

        // Oppretter dynamisk input-sliders for hver eiendel definert i assetsConfig.
        createAssetInputs: function() {
            const container = document.getElementById('assets-container');
            container.innerHTML = ''; // Tømmer eksisterende innhold
            const scale = this.rangeScaleFactor || 1;
            this.assetsConfig.forEach(asset => {
                const div = document.createElement('div');
                div.className = 'asset-slider-group';
                div.innerHTML = `
                    <div class="flex justify-between items-baseline mb-0"> 
                        <label for="${asset.id}" class="label-ui text-slate-300">${asset.label}</label>
                        <span id="${asset.id}-value" class="heading-s text-[var(--accent-blue-light)]">${this.formatCurrency(asset.value)}</span> 
                    </div>
                    <input type="range" id="${asset.id}" min="${asset.min}" max="${Math.round(asset.max * scale)}" step="${asset.step}" value="${asset.value}">
                `;
                container.appendChild(div);
            });
        },

        // Fester hendelseslyttere til input-elementer og personantallknapper.
        attachEventListeners: function() {
            // Hendelseslytter for inputendringer på side 1 (sliders og tekstinput).
            document.getElementById('page1').addEventListener('input', (e) => {
                if (e.target.type === 'range') {
                    // Oppdater visningsverdi for sliders
                    const valueSpan = document.getElementById(`${e.target.id}-value`);
                    if (valueSpan) {
                        valueSpan.textContent = this.formatCurrency(parseFloat(e.target.value));
                    }
                    this.calculateAll(); // Beregn på nytt når slider endres
                } else if (e.target.matches('.asset-input, #private-debt')) { 
                    // Formater og beregn på nytt for tekstinput
                    this.formatAndRecalculate(e.target);
                }
            });

            // Hendelseslytter for inflasjonsrate-input på side 2.
            const inflationEl = document.getElementById('inflation-rate');
            if (inflationEl) {
                inflationEl.addEventListener('input', (e) => {
                    this.formatAndRecalculate(e.target);
                    this.updatePage2(); // Oppdater side 2-beregningene når inflasjonsraten endres
                });
            }

            // Hendelseslytter for personantallknapper.
            document.getElementById('person-count').addEventListener('click', (e) => {
                if (e.target.matches('.person-btn')) {
                    this.state.personCount = parseInt(e.target.dataset.value, 10);
                    // Oppdater knappestil for alle knapper
                    document.querySelectorAll('.person-btn').forEach(btn => {
                        if (btn === e.target) {
                            // Aktiv knapp: blå bakgrunn, hvit tekst
                            btn.classList.remove('bg-slate-700', 'text-slate-300');
                            btn.classList.add('bg-blue-600', 'text-white');
                        } else {
                            // Inaktiv knapp: grå bakgrunn, lys grå tekst
                            btn.classList.remove('bg-blue-600', 'text-white');
                            btn.classList.add('bg-slate-700', 'text-slate-300');
                        }
                    });
                    this.calculateAll(); // Beregn på nytt basert på nytt personantall
                }
            });

            // Hendelseslytter for reset-knappen.
            document.getElementById('reset-btn').addEventListener('click', () => {
                this.resetAll();
            });
        },

        // Nullstiller alle verdier til standardverdier.
        resetAll: function() {
            // Reset personantall til 1 person
            this.state.personCount = 1;
            document.querySelectorAll('.person-btn').forEach(btn => {
                if (btn.dataset.value === '1') {
                    // Aktiv knapp: blå bakgrunn, hvit tekst
                    btn.classList.remove('bg-slate-700', 'text-slate-300');
                    btn.classList.add('bg-blue-600', 'text-white');
                } else {
                    // Inaktiv knapp: grå bakgrunn, lys grå tekst
                    btn.classList.remove('bg-blue-600', 'text-white');
                    btn.classList.add('bg-slate-700', 'text-slate-300');
                }
            });

            // Reset gjeld til 0
            document.getElementById('private-debt').value = '0';

            // Reset alle eiendeler til 0
            this.assetsConfig.forEach(asset => {
                const slider = document.getElementById(asset.id);
                if (slider) {
                    slider.value = 0;
                    const valueSpan = document.getElementById(`${asset.id}-value`);
                    if (valueSpan) {
                        valueSpan.textContent = this.formatCurrency(0);
                    }
                }
            });

            // Beregn på nytt med nullstilte verdier
            this.calculateAll();
        },
        
        // Beregner alle formuesskattkomponenter basert på gjeldende inputverdier.
        calculateAll: function() {
            const values = this.getValues();
            // Fast terskel for primærbolig (tidligere input-felt)
            const primaryResidenceFixedThreshold = 10000000; 

            // Bestemmer skattefritt beløp basert på personantall
            const taxFreeAllowance = this.state.personCount === 1 ? 1900000 : 3800000;
            // Bestemmer terskel for høy sats basert på personantall
            const highRateThreshold = this.state.personCount === 1 ? 20000000 : 40000000;
            // Summerer alle eiendelsverdier for å få bruttoformue
            const grossWealth = Object.values(values.assets).reduce((sum, val) => sum + val, 0);

            let totalValuedWealth = 0; // Summen av eiendeler etter verdivurdering (skattemessig formue)

            Object.keys(values.assets).forEach(key => {
                const assetValue = values.assets[key];
                let valuedAmount = assetValue; 

                if (key === 'primary-residence') {
                    // Primærbolig verdivurderes til 25% opp til terskel, og 70% over terskel
                    const valFactors = this.discounts[key];
                    valuedAmount = (Math.min(assetValue, primaryResidenceFixedThreshold) * valFactors.valuation_under_threshold) +
                                   (Math.max(0, assetValue - primaryResidenceFixedThreshold) * valFactors.valuation_over_threshold);
                } else {
                    // For andre eiendeler, bruk den definerte verdivurderingsfaktoren
                    // Sjekk om rabatten er et tall, ellers bruk 1 for 100% verdivurdering
                    valuedAmount = assetValue * (typeof this.discounts[key] === 'number' ? this.discounts[key] : 1); 
                }
                totalValuedWealth += valuedAmount;
            });
            
            // totalDiscount er differansen mellom bruttoformue og skattemessig formue
            const totalDiscount = grossWealth - totalValuedWealth; 
            
            // Nettoformue er den skattemessige formuen
            const netWealth = totalValuedWealth; 

            // Fradragsberettiget gjeld: All gjeld er fradragsberettiget som utgangspunkt
            // Men en del av gjelden kan ikke trekkes fra basert på rabatter (ekskludert primærbolig)
            
            // Beregn total rabatt ekskludert primærbolig
            let totalDiscountExcludingPrimaryResidence = 0;
            Object.keys(values.assets).forEach(key => {
                if (key !== 'primary-residence') {
                    const assetValue = values.assets[key];
                    let discount = 0;
                    
                    if (typeof this.discounts[key] === 'number') {
                        // For eiendeler med enkelt rabatt
                        discount = assetValue * (1 - this.discounts[key]);
                    }
                    
                    totalDiscountExcludingPrimaryResidence += discount;
                }
            });
            
            // Beregn andel av gjeld som ikke er fradragsberettiget
            // Formel: Gjeld × (Total rabatt ekskludert primærbolig) / Total bruttoformue
            const nonDeductibleDebtRatio = grossWealth > 0 ? totalDiscountExcludingPrimaryResidence / grossWealth : 0;
            const nonDeductibleDebt = values.privateDebt * nonDeductibleDebtRatio;
            
            // Fradragsberettiget gjeld = Total gjeld - Gjeld som ikke er fradragsberettiget
            const deductibleDebt = values.privateDebt - nonDeductibleDebt;

            // Skattegrunnlaget er nettoformue minus fribeløp og fradragsberettiget gjeld
            const taxableBase = Math.max(0, netWealth - taxFreeAllowance - deductibleDebt);
            // Total formuesskatt beregnes basert på progressive satser
            const totalWealthTax = (Math.min(taxableBase, highRateThreshold) * 0.01) + (Math.max(0, taxableBase - highRateThreshold) * 0.011);
            
            sharedData.taxAsPercentageOfGross = grossWealth > 0 ? (totalWealthTax / grossWealth) : 0;
            sharedData.inflationRate = values.inflationRate;

            const results = {grossWealth, totalDiscount, netWealth, deductibleDebt, taxFreeAllowance, taxableBase, totalWealthTax};
            this.lastResults = results;
            this.updatePage1UI(results);
        },
        
        // Oppdaterer visningselementene på side 1 med beregnede resultater.
        updatePage1UI: function(results) {
            document.getElementById('gross-wealth').textContent = this.formatCurrency(results.grossWealth);
            document.getElementById('total-discount').textContent = this.formatCurrency(results.totalDiscount);
            document.getElementById('net-wealth').textContent = this.formatCurrency(results.netWealth);
            document.getElementById('deductible-debt').textContent = this.formatCurrency(results.deductibleDebt);
            document.getElementById('tax-free-allowance').textContent = this.formatCurrency(results.taxFreeAllowance);
            document.getElementById('taxable-base').textContent = this.formatCurrency(results.taxableBase);
            document.getElementById('total-wealth-tax').textContent = this.formatCurrency(results.totalWealthTax);
            document.getElementById('tax-as-percentage-of-gross').textContent = `${(sharedData.taxAsPercentageOfGross * 100).toFixed(2)} %`;
        },

        // Oppdaterer tabellene på side 2 med kjøpekraftanalyse.
        updatePage2: function() {
            const inflation = sharedData.inflationRate / 100;
            const capitalGainsTax = 0.22;
            const dividendTax = 0.378;

            // Definerer ulike formuesskattscenarier
            const wealthTaxRates = {
                'Ingen': 0, 'Lav': 0.01, 'Høy': 0.011, 'Faktisk': sharedData.taxAsPercentageOfGross
            };

            const privateRates = {}; // Satser for privatpersoner
            const asRates = {}; // Satser for Aksjeselskap (AS)
            
            // Beregn minimum nødvendig bankrente for hvert scenario
            for (const [label, taxRate] of Object.entries(wealthTaxRates)) {
                privateRates[label] = {
                    capital: capitalGainsTax, dividend: 0, wealth: taxRate, inflation: inflation,
                    // Formel for minimum rente for privatpersoner
                    minInterest: ((inflation + taxRate) / (1 - capitalGainsTax)) * 100
                };
                asRates[label] = {
                    capital: capitalGainsTax, dividend: dividendTax, wealth: taxRate, inflation: inflation,
                    // Formel for minimum rente for AS (tar hensyn til både kapitalgevinster og utbytteskatt)
                    minInterest: (((inflation + taxRate) / (1 - dividendTax)) / (1 - capitalGainsTax)) * 100
                };
            }
            
            // Fyller ut tabellene i UI
            const privateTable = document.getElementById('private-person-table');
            const asTable = document.getElementById('as-table');
            
            if (privateTable && asTable) {
                const privateHTML = this.generateRateTable('Privat', privateRates);
                const asHTML = this.generateRateTable('AS', asRates);
                
                privateTable.innerHTML = privateHTML;
                asTable.innerHTML = asHTML;
            }
        },
        
        // Genererer HTML-tabellen for visning av skattesatser og minimum nødvendig rente.
        generateRateTable: function(title, data) {
            const headers = Object.keys(data); 
            let tableHTML = `<h3 class="text-base font-semibold text-white mb-1.5">${title}</h3>`; 
            
            // Tabellhode-rad
            tableHTML += `<div class="rate-table-header"><div></div>${headers.map(h => `<div class="rate-table-cell">${h}</div>`).join('')}</div>`;

            // Data rader for Kapitalskatt, Utbytteskatt, Formuesskatt, Inflasjon
            const rows = [
                { label: 'Kapitalskatt', key: 'capital' },
                { label: 'Utbytteskatt', key: 'dividend' },
                { label: 'Formuesskatt', key: 'wealth' },
                { label: 'Inflasjon', key: 'inflation' },
            ];

            rows.forEach(row => {
                tableHTML += `<div class="rate-table-row">
                    <div class="rate-table-row-label">${row.label}</div>
                    ${headers.map(h => `<div class="rate-table-cell">${(data[h][row.key] * 100).toFixed(2)} %</div>`).join('')}
                </div>`;
            });
            
            // Siste rad for Minimum Bankrente
            tableHTML += `<div class="rate-table-row rate-table-final-row">
                <div class="rate-table-row-label">Minimum bankrente</div>
                ${headers.map(h => `<div class="rate-table-cell">${data[h].minInterest.toFixed(2)} %</div>`).join('')}
            </div>`;

            return tableHTML;
        },

        // Henter alle gjeldende inputverdier fra sliders og tekstfelter.
        getValues: function() {
            const values = { assets: {} };
            // Henter verdier fra sliders for eiendeler
            this.assetsConfig.forEach(asset => {
                const slider = document.getElementById(asset.id);
                if (slider) {
                    values.assets[asset.id] = parseFloat(slider.value);
                }
            });
            // Henter verdier fra tekstinput, parser dem til tall
            const privateDebtEl = document.getElementById('private-debt');
            const inflationEl = document.getElementById('inflation-rate');
            values.privateDebt = this.parseNumber(privateDebtEl ? privateDebtEl.value : '0');
            values.inflationRate = this.parseNumber(inflationEl ? inflationEl.value : '3', true); 
            return values;
        },
        
        // Formaterer et nummerinput (f.eks. legger til tusenskillere) og utløser ny beregning.
        formatAndRecalculate: function(element) {
            const isFloat = element.id === 'inflation-rate';
            const numericValue = this.parseNumber(element.value, isFloat);
            element.value = isFloat ? String(numericValue) : this.formatNumber(numericValue);
            this.calculateAll(); 
        },

        // Parser en streng til et tall, håndterer lokalespesifikke skilletegn.
        parseNumber: (str, isFloat = false) => {
            if (typeof str !== 'string') return isNaN(str) ? 0 : str;
            const cleaned = str.replace(/[^\d,.]/g, '').replace(',', '.');
            const val = isFloat ? parseFloat(cleaned) : parseInt(cleaned, 10);
            return isNaN(val) ? 0 : val;
        },
        
        // Formaterer et tall med norske lokaler tusenskillere.
        formatNumber: (num) => new Intl.NumberFormat('nb-NO').format(isNaN(num) ? 0 : num),
        // Formaterer et tall som norske kroner valuta, uten desimaler.
        formatCurrency: (num) => new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num),
    };
    
    // Initialiserer applikasjonen når DOM er fullastet.
    WealthTaxApp.init();

    // Hent fra T-konto-knapp: henter verdier fra T-konto Eiendeler og Gjeld
    const hentFraTKontoBtn = document.getElementById('hent-fra-tkonto-btn');
    if (hentFraTKontoBtn) {
        hentFraTKontoBtn.addEventListener('click', function() {
            const wasActive = hentFraTKontoBtn.classList.contains('tkonto-active');
            if (wasActive) {
                hentFraTKontoBtn.classList.remove('tkonto-active');
                return;
            }
            hentFraTKontoBtn.classList.add('tkonto-active');
            const getData = (window.parent && window.parent.getTKontoDataForFormuesskatt) || window.getTKontoDataForFormuesskatt;
            if (typeof getData !== 'function') {
                return;
            }
            const data = getData();
            const fmt = WealthTaxApp.formatNumber;
            document.getElementById('private-debt').value = fmt(data.gjeld || 0);
            const primarySlider = document.getElementById('primary-residence');
            if (primarySlider) {
                primarySlider.value = data.primærbolig || 0;
                const primarySpan = document.getElementById('primary-residence-value');
                if (primarySpan) primarySpan.textContent = WealthTaxApp.formatCurrency(data.primærbolig || 0);
            }
            const carBoatSlider = document.getElementById('car-boat');
            if (carBoatSlider) {
                carBoatSlider.value = data.bilBåt || 0;
                const carBoatSpan = document.getElementById('car-boat-value');
                if (carBoatSpan) carBoatSpan.textContent = WealthTaxApp.formatCurrency(data.bilBåt || 0);
            }
            const portfolioSlider = document.getElementById('private-portfolio');
            if (portfolioSlider) {
                portfolioSlider.value = data.privatPorteføljeASK || 0;
                const portfolioSpan = document.getElementById('private-portfolio-value');
                if (portfolioSpan) portfolioSpan.textContent = WealthTaxApp.formatCurrency(data.privatPorteføljeASK || 0);
            }
            const bankSlider = document.getElementById('bank-deposits');
            if (bankSlider) {
                bankSlider.value = data.bankinnskudd || 0;
                const bankSpan = document.getElementById('bank-deposits-value');
                if (bankSpan) bankSpan.textContent = WealthTaxApp.formatCurrency(data.bankinnskudd || 0);
            }
            WealthTaxApp.calculateAll();
        });
    }

    window.FormuesskattGetOutputText = function() {
        const lines = [];
        const personCount = WealthTaxApp.state && WealthTaxApp.state.personCount ? WealthTaxApp.state.personCount : 1;
        lines.push(`Antall personer: ${personCount}`);
        const values = WealthTaxApp.getValues ? WealthTaxApp.getValues() : { assets: {}, privateDebt: 0, inflationRate: 3 };
        lines.push(`Privat gjeld (NOK): ${WealthTaxApp.formatNumber ? WealthTaxApp.formatNumber(values.privateDebt || 0) : values.privateDebt}`);
        (WealthTaxApp.assetsConfig || []).forEach(asset => {
            const val = (values.assets && values.assets[asset.id]) ?? asset.value ?? 0;
            lines.push(`${asset.label}: ${WealthTaxApp.formatNumber ? WealthTaxApp.formatNumber(val) : val}`);
        });
        lines.push(`Forventet inflasjon (%): ${(values.inflationRate || 3).toString().replace('.', ',')}`);
        const totalEl = document.getElementById('total-wealth-tax');
        if (totalEl) lines.push(`Total Formuesskatt: ${totalEl.textContent || '0 kr'}`);
        return lines.join('\n');
    };
    
    window.FormuesskattApplyInputText = function(text) {
        if (!text || !text.trim()) return;
        const parseNum = (s) => {
            const v = String(s).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            return parseFloat(v) || 0;
        };
        const labelToAssetId = {};
        (WealthTaxApp.assetsConfig || []).forEach(a => { labelToAssetId[a.label] = a.id; });
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        lines.forEach(line => {
            const colonIdx = line.indexOf(':');
            if (colonIdx < 0) return;
            const label = line.substring(0, colonIdx).trim();
            const valueStr = line.substring(colonIdx + 1).trim();
            if (label === 'Antall personer') {
                const n = parseInt(valueStr, 10);
                if (n === 1 || n === 2) {
                    WealthTaxApp.state.personCount = n;
                    const btn = document.querySelector(`#person-count .person-btn[data-value="${n}"]`);
                    if (btn) btn.click();
                }
            } else if (label === 'Privat gjeld (NOK)') {
                const el = document.getElementById('private-debt');
                if (el) { el.value = WealthTaxApp.formatNumber ? WealthTaxApp.formatNumber(parseNum(valueStr)) : valueStr; WealthTaxApp.formatAndRecalculate && WealthTaxApp.formatAndRecalculate(el); }
            } else if (label === 'Forventet inflasjon (%)') {
                const el = document.getElementById('inflation-rate');
                if (el) { el.value = valueStr.replace(',', '.'); WealthTaxApp.formatAndRecalculate && WealthTaxApp.formatAndRecalculate(el); }
            } else if (labelToAssetId[label]) {
                const id = labelToAssetId[label];
                const slider = document.getElementById(id);
                if (slider) {
                    const num = parseNum(valueStr);
                    slider.value = num;
                    const span = document.getElementById(id + '-value');
                    if (span) span.textContent = WealthTaxApp.formatCurrency ? WealthTaxApp.formatCurrency(num) : num;
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
        WealthTaxApp.calculateAll && WealthTaxApp.calculateAll();
    };

    // Eksponer Total Formuesskatt for T-konto (hentes når toggle slås på)
    window.getFormuesskattTotal = function() {
        if (WealthTaxApp && WealthTaxApp.lastResults && typeof WealthTaxApp.lastResults.totalWealthTax === 'number') {
            return Math.round(WealthTaxApp.lastResults.totalWealthTax);
        }
        const el = document.getElementById('total-wealth-tax');
        if (el) {
            const text = (el.textContent || '').replace(/\s/g, '');
            const num = parseInt(text.replace(/[^\d]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };

    // Sørg for identisk høyde: Høyre panel matcher venstre panel
    function syncPanelHeights() {
        const panels = document.querySelectorAll('#page1 .card-panel');
        if (!panels || panels.length < 2) return;
        // Reset før måling
        panels[0].style.minHeight = 'auto';
        panels[1].style.minHeight = 'auto';
        const leftHeight = panels[0].offsetHeight;
        // Høyre panel skal ikke være lavere enn venstre
        panels[1].style.minHeight = leftHeight + 'px';
    }
    // Kjør ved start og ved endringer som påvirker layout
    syncPanelHeights();
    window.addEventListener('resize', syncPanelHeights);
    const page1El = document.getElementById('page1');
    if (page1El) {
        page1El.addEventListener('input', syncPanelHeights);
    }

});
