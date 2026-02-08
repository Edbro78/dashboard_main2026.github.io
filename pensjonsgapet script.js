document.addEventListener('DOMContentLoaded', function() {

        // --- GLOBAL APP STATE ---

        // Disclaimer modal wiring
        const disclaimerBtn = document.getElementById('disclaimerBtn');
        const disclaimerModal = document.getElementById('disclaimerModal');
        const disclaimerClose = document.getElementById('disclaimerClose');
        const openDisclaimer = () => {
            if (!disclaimerModal) return;
            disclaimerModal.classList.remove('hidden');
            disclaimerModal.classList.add('flex');
        };
        const closeDisclaimer = () => {
            if (!disclaimerModal) return;
            disclaimerModal.classList.add('hidden');
            disclaimerModal.classList.remove('flex');
        };
        if (disclaimerBtn) disclaimerBtn.addEventListener('click', openDisclaimer);
        if (disclaimerClose) disclaimerClose.addEventListener('click', closeDisclaimer);
        if (disclaimerModal) {
            disclaimerModal.addEventListener('click', (e) => {
                const target = e.target;
                if (target && target.getAttribute('data-close') === 'true') closeDisclaimer();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeDisclaimer();
            });
        }

        // Output modal wiring
        const outputBtn = document.getElementById('outputBtn');
        const outputModal = document.getElementById('outputModal');
        const outputClose = document.getElementById('outputClose');
        const outputTextArea = document.getElementById('outputTextArea');
        const copyButton = document.getElementById('copyButton');
        
        const generateOutputText = () => {
            let outputText = '';
            
            // Input fields (16 stk)
            const inputLabels = {
                'age': 'Din alder',
                'retirementAge': 'Pensjonsalder', 
                'currentSalary': 'Dagens årslønn',
                'currentOTPSaldo': 'OTP Saldo i dag',
                'otpRate': 'OTP-sats',
                'currentIPSBalance': 'IPS saldo i dag',
                'ipsAnnualSaving': 'Årlig sparing IPS',
                'annualFripoliserPayout': 'Årlig utbetaling fra fripoliser',
                'expectedReturn': 'Aksjeandel',
                'payoutYears': 'Utbetalingsperiode OTP',
                'socialSecurityEstimate': 'Årlig utbetaling fra folketrygden',
                'desiredPensionLevel': 'Ønsket pensjonsnivå',
                'cpiRate': 'Forventet årlig KPI'
            };
            
            outputText += 'INPUTFELTER:\n';
            outputText += '================\n\n';
            
            // Add input values
            Object.keys(inputLabels).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    const value = element.value;
                    const label = inputLabels[id];
                    let displayValue = value;
                    
                    // Format based on field type
                    if (id === 'age' || id === 'retirementAge') {
                        displayValue = `${value} år`;
                    } else if (id === 'currentSalary' || id === 'currentOTPSaldo' || id === 'currentIPSBalance' || id === 'ipsAnnualSaving' || id === 'annualFripoliserPayout' || id === 'socialSecurityEstimate') {
                        displayValue = `${parseFloat(value).toLocaleString('nb-NO')} kr`;
                    } else if (id === 'otpRate' || id === 'desiredPensionLevel' || id === 'cpiRate') {
                        displayValue = `${parseFloat(value).toFixed(1)} %`;
                    } else if (id === 'expectedReturn') {
                        const returnToStock = { 5: 0, 5.6: 20, 6.3: 45, 6.7: 55, 7: 65, 7.5: 85, 8: 100 };
                        const ret = parseFloat(value);
                        const stock = returnToStock[ret] !== undefined ? returnToStock[ret] : ret;
                        displayValue = `${stock}% aksjer (${ret}% avkastning)`;
                    } else if (id === 'payoutYears') {
                        displayValue = `${value} år`;
                    }
                    
                    outputText += `${label}: ${displayValue}\n`;
                }
            });
            
            // Add combination solution values
            const comboLumpSum = document.getElementById('combo-lump-sum');
            const comboMonthly = document.getElementById('combo-monthly');
            const customComboInput = document.getElementById('customComboPercent');
            if (comboLumpSum && comboMonthly) {
                let comboPercent = '';
                if (customComboInput && customComboInput.value) {
                    comboPercent = ` (${customComboInput.value}%)`;
                } else {
                    // Check which button is selected
                    const selectedButton = document.querySelector('.combo-btn.bg-\\[var\\(--accent-blue-light\\)\\]');
                    if (selectedButton) {
                        comboPercent = ` (${selectedButton.getAttribute('data-percent')}%)`;
                    }
                }
                outputText += `Kombinasjonsløsning - Engangsinnskudd${comboPercent}: ${comboLumpSum.textContent}\n`;
                outputText += `Kombinasjonsløsning - Månedlig sparing${comboPercent}: ${comboMonthly.textContent}\n`;
            }
            
            outputText += '\n\nRESULTATER:\n';
            outputText += '===========\n\n';
            
            // Results (4 stk)
            const totalAnnualPension = document.getElementById('total-annual-pension');
            const pensionPercentage = document.getElementById('pension-percentage');
            const lumpSumToday = document.getElementById('lump-sum-today');
            const monthlySavingNeeded = document.getElementById('monthly-saving-needed');
            
            if (totalAnnualPension) {
                outputText += `Årlig pensjon (estimat): ${totalAnnualPension.textContent}\n`;
            }
            if (pensionPercentage) {
                outputText += `% av sluttlønn: ${pensionPercentage.textContent}\n`;
            }
            if (lumpSumToday) {
                outputText += `Nødvendig engangsinnskudd i dag: ${lumpSumToday.textContent}\n`;
            }
            if (monthlySavingNeeded) {
                outputText += `Alternativ månedlig sparing: ${monthlySavingNeeded.textContent}\n`;
            }
            
            return outputText;
        };
        
        window.PensjonsgapetGetOutputText = function() { return generateOutputText(); };
        
        window.PensjonsgapetApplyInputText = function(text) {
            if (!text || !text.trim()) return;
            const labelToId = {
                'Din alder': 'age', 'Pensjonsalder': 'retirementAge', 'Grunnbeløp (1G)': 'grunnbelop',
                'Dagens årslønn': 'currentSalary', 'OTP Saldo i dag': 'currentOTPSaldo', 'OTP-sats': 'otpRate',
                'IPS Saldo i dag': 'currentIPSBalance', 'Årlig sparing IPS': 'ipsAnnualSaving',
                'Årlig utbetaling fra Fripoliser': 'annualFripoliserPayout', 'Aksjeandel': 'expectedReturn',
                'Utbetalingsperiode OTP': 'payoutYears', 'Forventet årlig KPI': 'cpiRate',
                'Årlig utbetaling Folketrygden': 'socialSecurityEstimate', 'Ønsket pensjonsnivå': 'desiredPensionLevel'
            };
            const stockToReturn = { 0: 5, 20: 5.6, 45: 6.3, 55: 6.7, 65: 7, 85: 7.5, 100: 8 };
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            lines.forEach(line => {
                const colonIdx = line.indexOf(':');
                if (colonIdx < 0) return;
                const label = line.substring(0, colonIdx).trim();
                const valueStr = line.substring(colonIdx + 1).trim();
                const id = labelToId[label];
                if (!id) return;
                const el = document.getElementById(id);
                if (!el) return;
                let num = parseFloat(valueStr.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                if (id === 'expectedReturn' && valueStr.includes('%')) {
                    const stockMatch = valueStr.match(/(\d+)\s*%\s*aksjer/);
                    if (stockMatch) num = stockToReturn[parseInt(stockMatch[1], 10)] ?? num;
                }
                el.value = String(num);
                const valSpan = document.getElementById(id + '-value');
                if (valSpan && id !== 'grunnbelop') valSpan.textContent = valueStr.includes('kr') ? new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num) : valueStr;
                if (el.type === 'range') el.dispatchEvent(new Event('input', { bubbles: true }));
            });
            if (typeof DashboardApp !== 'undefined' && DashboardApp.calculatePension) DashboardApp.calculatePension();
        };
        
        const openOutput = () => {
            if (!outputModal) return;
            
            // Generate and populate the text
            const outputText = generateOutputText();
            if (outputTextArea) {
                outputTextArea.value = outputText;
            }
            
            outputModal.classList.remove('hidden');
            outputModal.classList.add('flex');
        };
        const closeOutput = () => {
            if (!outputModal) return;
            outputModal.classList.add('hidden');
            outputModal.classList.remove('flex');
        };
        // Copy functionality
        const copyToClipboard = async () => {
            if (!outputTextArea) return;
            
            try {
                await navigator.clipboard.writeText(outputTextArea.value);
                
                // Visual feedback
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    Kopiert!
                `;
                copyButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                copyButton.classList.add('bg-green-600', 'hover:bg-green-700');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.classList.remove('bg-green-600', 'hover:bg-green-700');
                    copyButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
                }, 2000);
                
            } catch (err) {
                console.error('Failed to copy text: ', err);
                // Fallback for older browsers
                outputTextArea.select();
                document.execCommand('copy');
            }
        };
        
        if (outputBtn) outputBtn.addEventListener('click', openOutput);
        if (outputClose) outputClose.addEventListener('click', closeOutput);
        if (copyButton) copyButton.addEventListener('click', copyToClipboard);
        if (outputModal) {
            outputModal.addEventListener('click', (e) => {
                const target = e.target;
                if (target && target.getAttribute('data-close') === 'true') closeOutput();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeOutput();
            });
        }

        // No multi-page navigation or shared data needed


        // ==================================================================
        // --- SCRIPT FOR PART 1: PENSION DASHBOARD ---
        // ==================================================================
        const DashboardApp = {
            inputsConfig: [
                { id: 'age', label: 'Din alder', type: 'range', min: 18, max: 70, step: 1, value: 45, unit: 'år' },
                { id: 'retirementAge', label: 'Pensjonsalder', type: 'range', min: 62, max: 72, step: 1, value: 67, unit: 'år' },
                { id: 'grunnbelop', label: 'Grunnbeløp (1G)', type: 'number', value: 130160, unit: 'kr' },
                { id: 'currentSalary', label: 'Dagens årslønn', type: 'range', min: 0, max: 10000000, step: 10000, value: 1000000, unit: 'kr' },
                { id: 'currentOTPSaldo', label: 'OTP Saldo i dag', type: 'range', min: 0, max: 3000000, step: 10000, value: 500000, unit: 'kr' },
                { id: 'otpRate', label: 'OTP-sats', type: 'range', min: 2, max: 8, step: 0.1, value: 5, unit: '%' },
                { id: 'currentIPSBalance', label: 'IPS Saldo i dag', type: 'range', min: 0, max: 1000000, step: 10000, value: 0, unit: 'kr' },
                { id: 'ipsAnnualSaving', label: 'Årlig sparing IPS', type: 'range', min: 0, max: 40000, step: 1000, value: 0, unit: 'kr' },
                { id: 'annualFripoliserPayout', label: 'Årlig utbetaling fra Fripoliser', type: 'range', min: 0, max: 500000, step: 5000, value: 0, unit: 'kr' },
                { id: 'expectedReturn', label: 'Aksjeandel', type: 'range', min: 3, max: 10, step: 0.1, value: 7, unit: '%' },
                { id: 'payoutYears', label: 'Utbetalingsperiode OTP', type: 'range', min: 10, max: 20, step: 1, value: 15, unit: 'år' },
                { id: 'cpiRate', label: 'Forventet årlig KPI', type: 'range', min: 0, max: 10, step: 0.1, value: 3, unit: '%' },
                { id: 'socialSecurityEstimate', label: 'Årlig utbetaling Folketrygden', type: 'range', min: 150000, max: 600000, step: 5000, value: 250000, unit: 'kr' },
                { id: 'desiredPensionLevel', label: 'Ønsket pensjonsnivå', type: 'range', min: 40, max: 100, step: 1, value: 80, unit: '%' }
            ],
            
            init: function() {
                const inputContainer = document.getElementById('input-container');
                if (inputContainer.childElementCount > 0) return; // Prevent re-initialization
                
                // IDs of fields to hide/show with toggle button (excluding currentOTPSaldo itself)
                const toggleableFieldIds = ['otpRate', 'currentIPSBalance', 'ipsAnnualSaving', 'annualFripoliserPayout', 'expectedReturn', 'payoutYears', 'socialSecurityEstimate'];
                
                this.inputsConfig.forEach(config => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'input-group';
                    
                    // Mark toggleable fields
                    if (toggleableFieldIds.includes(config.id)) {
                        wrapper.classList.add('toggleable-input');
                    }
                    
                    const label = document.createElement('label');
                    label.htmlFor = config.id;
                    label.className = 'text-sm font-medium text-slate-300';
                    label.textContent = config.label;
                    const input = document.createElement('input');
                    input.id = config.id;
                    input.type = config.type;
                    input.value = config.value;

                    if (config.type === 'range') {
                        const labelWrapper = document.createElement('div');
                        labelWrapper.className = 'flex justify-between items-baseline mb-2';
                        const valueSpan = document.createElement('span');
                        valueSpan.id = `${config.id}-value`;
                        valueSpan.className = 'text-base font-semibold text-[var(--accent-blue-light)]';
                        
                        // Add toggle button to the left of label for OTP Saldo field
                        if (config.id === 'currentOTPSaldo') {
                            const toggleBtn = document.createElement('button');
                            toggleBtn.id = 'toggleInputsBtn';
                            toggleBtn.className = 'text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50 mr-2';
                            toggleBtn.setAttribute('aria-label', 'Vis/skjul inputs');
                            toggleBtn.setAttribute('type', 'button');
                            toggleBtn.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                    <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" />
                                </svg>
                            `;
                            
                            // Create a container for all content (label, value, slider) that can be toggled
                            const otpContent = document.createElement('div');
                            otpContent.className = 'toggleable-otp-content';
                            
                            labelWrapper.appendChild(label);
                            labelWrapper.appendChild(valueSpan);
                            otpContent.appendChild(labelWrapper);
                            
                            input.className = 'w-full';
                            input.min = config.min;
                            input.max = config.max;
                            input.step = config.step;
                            otpContent.appendChild(input);
                            
                            wrapper.appendChild(toggleBtn);
                            wrapper.appendChild(otpContent);
                            inputContainer.appendChild(wrapper);
                            return; // Skip the normal append logic
                        }
                        
                        labelWrapper.appendChild(label);
                        labelWrapper.appendChild(valueSpan);
                        wrapper.appendChild(labelWrapper);
                        input.className = 'w-full';
                        input.min = config.min;
                        input.max = config.max;
                        input.step = config.step;
                    } else {
                        wrapper.appendChild(label);
                        input.className = 'asset-input w-full mt-2 bg-slate-800 border border-[var(--border-color)] rounded-md px-3 py-2 text-white focus:ring-[var(--accent-blue-light)] focus:border-[var(--accent-blue-light)]';
                    }
                    wrapper.appendChild(input);
                    inputContainer.appendChild(wrapper);
                });

                this.inputsConfig.forEach(config => {
                    document.getElementById(config.id).addEventListener('input', this.calculatePension.bind(this));
                });
                
                // Removed navigation to prognosis page
                
                // Relocate selected sliders under combo boxes to save space on the left
                const comboSlidersContainer = document.getElementById('combo-sliders-container');
                if (comboSlidersContainer) {
                    ['desiredPensionLevel', 'cpiRate'].forEach((moveId) => {
                        const inputEl = document.getElementById(moveId);
                        if (inputEl) {
                            const group = inputEl.closest('.input-group');
                            if (group) comboSlidersContainer.appendChild(group);
                        }
                    });
                    // Stock allocation -> expected return mapping
                    const stockToReturn = { 0: 5, 20: 5.6, 45: 6.3, 55: 6.7, 65: 7, 85: 7.5, 100: 8 };
                    const transformToStockAllocation = (id, stockOptions, defaultStock) => {
                        const input = document.getElementById(id);
                        if (!input) return;
                        const wrapper = input.closest('.input-group');
                        const valueSpan = wrapper ? wrapper.querySelector(`#${id}-value`) : null;
                        const headerRow = wrapper ? wrapper.firstElementChild : null;
                        if (headerRow) headerRow.className = 'mb-2';
                        if (valueSpan) valueSpan.classList.add('hidden');
                        input.classList.add('hidden');
                        const btnRow = document.createElement('div');
                        btnRow.className = 'grid grid-cols-7 gap-2';
                        stockOptions.forEach((stock) => {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'choice-btn aksjeandel-btn w-full py-1.5 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition border border-slate-600';
                            btn.textContent = `${stock}%`;
                            btn.addEventListener('click', () => {
                                input.value = stockToReturn[stock];
                                btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                    b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    b.removeAttribute('data-selected');
                                });
                                btn.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                btn.setAttribute('data-selected', 'true');
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            });
                            btnRow.appendChild(btn);
                        });
                        if (wrapper) wrapper.appendChild(btnRow);
                        const defaultBtn = Array.from(btnRow.children).find(b => b.textContent === `${defaultStock}%`);
                        if (defaultBtn) defaultBtn.click();
                    };
                    // Transform the two relocated sliders into fixed option button groups
                    const transformToChoices = (id, options, defaultValue) => {
                        const input = document.getElementById(id);
                        if (!input) return;
                        const wrapper = input.closest('.input-group');
                        const valueSpan = wrapper ? wrapper.querySelector(`#${id}-value`) : null;
                        const headerRow = wrapper ? wrapper.firstElementChild : null; // label row
                        if (headerRow) headerRow.className = 'mb-2';
                        if (valueSpan) valueSpan.classList.add('hidden');
                        // hide the slider input but keep it for value/state and events
                        input.classList.add('hidden');
                        // build buttons
                        const btnRow = document.createElement('div');
                        btnRow.className = 'grid grid-cols-6 gap-3';
                        
                        // Special handling for desiredPensionLevel - replace 0% with custom input
                        if (id === 'desiredPensionLevel') {
                            // Create custom input for first position
                            const customInputDiv = document.createElement('div');
                            customInputDiv.className = 'relative';
                            const customInput = document.createElement('input');
                            customInput.type = 'number';
                            customInput.id = 'customDesiredPensionLevel';
                            customInput.className = 'w-full py-1 text-sm rounded-full bg-slate-700 text-white border border-slate-600 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
                            customInput.placeholder = '';
                            customInput.min = '0';
                            customInput.max = '100';
                            customInput.step = '1';
                            customInput.value = '';
                            
                            // Add % symbol overlay
                            const percentSymbol = document.createElement('div');
                            percentSymbol.className = 'absolute inset-0 pointer-events-none flex items-center justify-center';
                            percentSymbol.innerHTML = '<span class="text-xs text-slate-400">%</span>';
                            
                            customInputDiv.appendChild(customInput);
                            customInputDiv.appendChild(percentSymbol);
                            btnRow.appendChild(customInputDiv);
                            
                            // Add event listener for custom input
                            customInput.addEventListener('input', (e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value >= 0 && value <= 100) {
                                    input.value = value;
                                    // Clear button selections when custom input is used
                                    btnRow.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900'));
                                    // update label value immediately
                                    if (valueSpan) valueSpan.textContent = `${value} %`;
                                    // trigger recalculation
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            });
                            
                            // Skip the first option (0) and create buttons for the rest
                            options.slice(1).forEach((val) => {
                                const btn = document.createElement('button');
                                btn.type = 'button';
                                btn.className = 'choice-btn w-full py-1 text-sm rounded-full bg-slate-700 text-white hover:bg-slate-600 transition';
                                btn.textContent = `${val}%`;
                                btn.addEventListener('click', () => {
                                    input.value = val;
                                    // visual state - remove from all buttons
                                    btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                        b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                        b.removeAttribute('data-selected');
                                    });
                                    // add to clicked button
                                    btn.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    btn.setAttribute('data-selected', 'true');
                                    // Clear custom input when button is selected
                                    customInput.value = '';
                                    // update label value immediately
                                    if (valueSpan) valueSpan.textContent = `${val} %`;
                                    // trigger recalculation
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                });
                                btnRow.appendChild(btn);
                            });
                        } else {
                            // Original behavior for other fields
                            options.forEach((val) => {
                                const btn = document.createElement('button');
                                btn.type = 'button';
                                btn.className = 'choice-btn w-full py-1 text-sm rounded-full bg-slate-700 text-white hover:bg-slate-600 transition';
                                btn.textContent = `${val}%`;
                                btn.addEventListener('click', () => {
                                    input.value = val;
                                    // visual state - remove from all buttons
                                    btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                        b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                        b.removeAttribute('data-selected');
                                    });
                                    // add to clicked button
                                    btn.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    btn.setAttribute('data-selected', 'true');
                                    // update label value immediately
                                    if (valueSpan) valueSpan.textContent = `${val} %`;
                                    // trigger recalculation
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                });
                                btnRow.appendChild(btn);
                            });
                        }
                        
                        if (wrapper) wrapper.appendChild(btnRow);
                        // set default
                        const defaultBtn = Array.from(btnRow.children).find(b => b.textContent === `${defaultValue}%`);
                        if (defaultBtn) defaultBtn.click();
                    };
                    // Desired pension: 0,20,40,60,80,100 with default 80
                    transformToChoices('desiredPensionLevel', [0, 20, 40, 60, 80, 100], 80);
                    // KPI: 0–5 with default 3
                    transformToChoices('cpiRate', [0, 1, 2, 3, 4, 5], 3);
                    // Aksjeandel: 0,20,45,55,65,85,100 -> forventet avkastning 5,5.6,6.3,6.7,7,7.5,8 % (default 65%)
                    // Aksjeandel boxes stay in Input column
                    transformToStockAllocation('expectedReturn', [0, 20, 45, 55, 65, 85, 100], 65);
                }
                
                // Combination buttons handlers
                const comboButtons = document.querySelectorAll('.combo-btn');
                if (comboButtons && comboButtons.length > 0) {
                    comboButtons.forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const percent = parseFloat(e.currentTarget.getAttribute('data-percent'));
                            this.updateCombination(percent);
                            this.calculatePension();
                            // visual selection state
                            comboButtons.forEach(b => {
                                b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                b.removeAttribute('data-combo-selected');
                            });
                            e.currentTarget.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900');
                            e.currentTarget.setAttribute('data-combo-selected', 'true');
                            // Clear custom input when button is selected
                            const customInput = document.getElementById('customComboPercent');
                            if (customInput) customInput.value = '';
                        });
                    });
                }
                
                // Custom input handler
                const customComboInput = document.getElementById('customComboPercent');
                if (customComboInput) {
                    customComboInput.addEventListener('input', (e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                            this.updateCombination(value);
                            this.calculatePension();
                            // Clear button selections when custom input is used
                            comboButtons.forEach(b => {
                                b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                b.removeAttribute('data-combo-selected');
                            });
                        }
                    });
                }

                this.calculatePension();
            },

            formatCurrency: (value) => new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value),
            formatNumber: (value) => new Intl.NumberFormat('nb-NO').format(value),
            formatPercent: (value) => `${value.toFixed(1)} %`,

            // Store last required capital and parameters for combo calculations
            lastCalc: null,
            selectedComboPercent: 100, /* Default: 100% engangsinnskudd */
            updateCombination: function(percent) {
                const comboSection = document.getElementById('combo-section');
                if (!comboSection || comboSection.classList.contains('hidden')) return;
                if (!this.lastCalc) return;
                const { r, n, requiredCapitalAtRetirement } = this.lastCalc;
                const p = percent / 100;
                let lump = 0;
                let annualSaving = 0;
                if (r > 0) {
                    lump = (p * requiredCapitalAtRetirement) / Math.pow(1 + r, n);
                    annualSaving = ((1 - p) * requiredCapitalAtRetirement) / ((Math.pow(1 + r, n) - 1) / r);
                } else {
                    lump = (p * requiredCapitalAtRetirement); // no discounting when r = 0
                    annualSaving = ((1 - p) * requiredCapitalAtRetirement) / n;
                }
                const monthly = annualSaving / 12;
                const lumpEl = document.getElementById('combo-lump-sum');
                const monthlyEl = document.getElementById('combo-monthly');
                if (lumpEl) lumpEl.textContent = this.formatCurrency(lump);
                if (monthlyEl) monthlyEl.textContent = this.formatCurrency(monthly);
                this.selectedComboPercent = percent;
            },

            calculatePension: function() {
                const values = {};
                this.inputsConfig.forEach(config => {
                    const element = document.getElementById(config.id);
                    values[config.id] = parseFloat(element.value);
                    if (config.type === 'range') {
                        let displayValue = this.formatNumber(values[config.id]);
                        if (config.unit === 'kr') displayValue = this.formatCurrency(values[config.id]);
                        if (config.unit === '%') displayValue = `${values[config.id].toFixed(config.step < 1 ? 1 : 0)} %`;
                        if (config.unit === 'år') displayValue = `${values[config.id]} år`;
                        document.getElementById(`${config.id}-value`).textContent = displayValue;
                    }
                });
                
                const G = values.grunnbelop;
                const maxContributionBaseSalary = 12 * G;
                if (values.age >= values.retirementAge) {
                    values.age = values.retirementAge - 1;
                    document.getElementById('age').value = values.age;
                }

                const n = values.retirementAge - values.age;
                const g = values.cpiRate / 100;
                const r = values.expectedReturn / 100;
                const cpiFactor = 1 + g;
                const futureSocialSecurity = values.socialSecurityEstimate * Math.pow(cpiFactor, n);
                const futureSalary = values.currentSalary * Math.pow(cpiFactor, n);
                const contributionBase = Math.min(values.currentSalary, maxContributionBaseSalary);
                const pmt = contributionBase * (values.otpRate / 100);
                const pv = values.currentOTPSaldo;
                const pvComponent = pv * Math.pow(1 + r, n);
                let pmtComponent;
                if (r.toFixed(5) === g.toFixed(5)) {
                    pmtComponent = pmt * n * Math.pow(1 + r, n - 1);
                } else {
                    pmtComponent = pmt * ((Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g));
                }
                const futureOTPSaldo = pvComponent + pmtComponent;
                let annualOTPPayout = 0;
                const n_payout = values.payoutYears;
                if (r > 0) {
                    annualOTPPayout = (futureOTPSaldo * r) / (1 - Math.pow(1 + r, -n_payout));
                } else {
                    annualOTPPayout = futureOTPSaldo / n_payout;
                }
                if (isNaN(annualOTPPayout)) annualOTPPayout = 0;

                // IPS: accumulation until retirement, then payout over same period as OTP
                const ipsPV = values.currentIPSBalance || 0;
                const ipsAnnual = values.ipsAnnualSaving || 0;
                const futureIPSFromPV = ipsPV * Math.pow(1 + r, n);
                const futureIPSFromSaving = r > 0 ? (ipsAnnual * ((Math.pow(1 + r, n) - 1) / r)) : (ipsAnnual * n);
                const futureIPSSaldo = futureIPSFromPV + futureIPSFromSaving;
                let annualIPSPayout = 0;
                if (r > 0) {
                    annualIPSPayout = (futureIPSSaldo * r) / (1 - Math.pow(1 + r, -n_payout));
                } else {
                    annualIPSPayout = futureIPSSaldo / n_payout;
                }
                if (isNaN(annualIPSPayout)) annualIPSPayout = 0;

                // Fripoliser: add directly to annual pension without return or CPI adjustments
                const fripoliserPayout = values.annualFripoliserPayout || 0;
                const totalAnnualPension = futureSocialSecurity + annualOTPPayout + annualIPSPayout + fripoliserPayout;
                const pensionPercentage = futureSalary > 0 ? (totalAnnualPension / futureSalary) * 100 : 0;
                
                document.getElementById('years-to-retirement').textContent = this.formatNumber(n);
                document.getElementById('future-salary').textContent = this.formatCurrency(futureSalary);
                document.getElementById('annual-otp-saving').textContent = this.formatCurrency(pmt);
                document.getElementById('future-otp-balance').textContent = this.formatCurrency(futureOTPSaldo);
                document.getElementById('annual-otp-payout').textContent = this.formatCurrency(annualOTPPayout);
                document.getElementById('future-social-security').textContent = this.formatCurrency(futureSocialSecurity);
                const annualIpsSavingEl = document.getElementById('annual-ips-saving');
                const futureIpsBalanceEl = document.getElementById('future-ips-balance');
                const annualIpsPayoutEl = document.getElementById('annual-ips-payout');
                if (annualIpsSavingEl) annualIpsSavingEl.textContent = this.formatCurrency(ipsAnnual);
                if (futureIpsBalanceEl) futureIpsBalanceEl.textContent = this.formatCurrency(futureIPSSaldo);
                if (annualIpsPayoutEl) annualIpsPayoutEl.textContent = this.formatCurrency(annualIPSPayout);
                const fripEl = document.getElementById('annual-fripoliser-payout');
                if (fripEl) fripEl.textContent = this.formatCurrency(fripoliserPayout);
                document.getElementById('total-annual-pension').textContent = this.formatCurrency(totalAnnualPension);
                document.getElementById('pension-percentage').textContent = this.formatPercent(pensionPercentage);

                try {
                    const portfolio = (values.currentOTPSaldo || 0) + (values.currentIPSBalance || 0);
                    const saving = (values.ipsAnnualSaving || 0) + pmt;
                    localStorage.setItem('pensjonsgapetPortefoljeOgSparing', JSON.stringify({ portfolio, saving }));
                } catch (e) {}

                const desiredAnnualPension = futureSalary * (values.desiredPensionLevel / 100);
                const annualPensionGap = desiredAnnualPension - totalAnnualPension;
                const goalMetMessage = document.getElementById('goal-met-message');
                const pensionGapSummary = document.getElementById('pension-gap-summary');
                const goalResults = document.getElementById('goal-results');
                const goalExplainer = document.getElementById('goal-explainer');

                if (annualPensionGap <= 0) {
                    goalMetMessage.classList.remove('hidden');
                    pensionGapSummary.classList.add('hidden');
                    goalResults.classList.add('hidden');
                    goalExplainer.classList.add('hidden');
                    const comboSection = document.getElementById('combo-section');
                    if (comboSection) comboSection.classList.add('hidden');
                } else {
                    goalMetMessage.classList.add('hidden');
                    pensionGapSummary.classList.remove('hidden');
                    goalResults.classList.remove('hidden');
                    goalExplainer.classList.remove('hidden');
                    const percentageGap = values.desiredPensionLevel - pensionPercentage;
                    document.getElementById('pension-gap-details').textContent = `${this.formatPercent(percentageGap)} (${this.formatCurrency(annualPensionGap)} / år)`;
                    let requiredCapitalAtRetirement = 0;
                    if (r > 0) {
                        requiredCapitalAtRetirement = annualPensionGap * ((1 - Math.pow(1 + r, -n_payout)) / r);
                    } else {
                        requiredCapitalAtRetirement = annualPensionGap * n_payout;
                    }
                    const lumpSumToday = requiredCapitalAtRetirement / Math.pow(1 + r, n);
                    let annualSavingNeeded = 0;
                    if (r > 0) {
                        annualSavingNeeded = requiredCapitalAtRetirement / ((Math.pow(1 + r, n) - 1) / r);
                    } else {
                        annualSavingNeeded = requiredCapitalAtRetirement / n;
                    }
                    const monthlySavingNeeded = annualSavingNeeded / 12;
                    document.getElementById('lump-sum-today').textContent = this.formatCurrency(lumpSumToday);
                    document.getElementById('monthly-saving-needed').textContent = this.formatCurrency(monthlySavingNeeded);
                    // expose combo section and save params
                    const comboSection = document.getElementById('combo-section');
                    if (comboSection) {
                        comboSection.classList.remove('hidden');
                        this.lastCalc = { r, n, requiredCapitalAtRetirement };
                        if (this.selectedComboPercent != null) this.updateCombination(this.selectedComboPercent);
                        // Visually select default 100% button if none selected
                        const comboButtons = document.querySelectorAll('.combo-btn');
                        const hasSelected = Array.from(comboButtons).some(b => b.hasAttribute('data-combo-selected'));
                        if (!hasSelected && this.selectedComboPercent === 100) {
                            const btn100 = Array.from(comboButtons).find(b => b.getAttribute('data-percent') === '100');
                            if (btn100) btn100.click();
                        }
                    }
                    // Eksporter data for "Hent alt fra pensjon" – hent oppdaterte verdier fra Kombinasjonsløsning (combo-output)
                    try {
                        if (this.selectedComboPercent != null) this.updateCombination(this.selectedComboPercent);
                        const parseKr = (txt) => {
                            if (!txt) return 0;
                            const s = String(txt).replace(/kr/gi, '').trim();
                            const cleaned = s.replace(/[\s\xa0\u202f]/g, '').replace(',', '.');
                            const num = parseFloat(cleaned);
                            return isNaN(num) ? 0 : Math.round(num);
                        };
                        const lumpEl = document.getElementById('combo-lump-sum');
                        const monthlyEl = document.getElementById('combo-monthly');
                        const engangsinnskudd = lumpEl ? parseKr(lumpEl.textContent) : 0;
                        const manedligSparing = monthlyEl ? parseKr(monthlyEl.textContent) : 0;
                        const aarligSparing = Math.round(manedligSparing * 12);
                        let aksjeandel = 65;
                        const selectedAksjeBtn = document.querySelector('.aksjeandel-btn.choice-btn-selected, .aksjeandel-btn[data-selected="true"]');
                        if (selectedAksjeBtn) {
                            const m = String(selectedAksjeBtn.textContent || '').match(/(\d+)\s*%/);
                            if (m) aksjeandel = parseInt(m[1], 10);
                        } else {
                            const returnToStock = { 5: 0, 5.6: 20, 6.3: 45, 6.7: 55, 7: 65, 7.5: 85, 8: 100 };
                            const expRet = values.expectedReturn;
                            aksjeandel = returnToStock[expRet] !== undefined ? returnToStock[expRet] : 65;
                        }
                        localStorage.setItem('pensjonsgapetHentAltFraPension', JSON.stringify({
                            engangsinnskudd,
                            aarligSparing,
                            yearsToRetirement: n,
                            payoutYears: n_payout,
                            bruttoArligUtbetaling: Math.round(annualPensionGap),
                            aksjeandel
                        }));
                    } catch (e) {}
                }

            }
        };

        // --- INITIALIZE THE APPLICATION ---
        DashboardApp.init();
        
        // --- TOGGLE INPUT VISIBILITY ---
        const toggleInputsBtn = document.getElementById('toggleInputsBtn');
        if (toggleInputsBtn) {
            toggleInputsBtn.addEventListener('click', () => {
                // Toggle OTP Saldo input slider
                const otpContent = document.querySelector('.toggleable-otp-content');
                if (otpContent) {
                    otpContent.classList.toggle('visibility-hidden');
                }
                
                // Toggle all other fields
                const toggleableInputs = document.querySelectorAll('.toggleable-input');
                toggleableInputs.forEach(input => {
                    input.classList.toggle('visibility-hidden');
                });
            });
        }
        
        // --- TOGGLE DETAILED VIEW ---
        const toggleDetailedViewBtn = document.getElementById('toggleDetailedViewBtn');
        const detailedViewContent = document.getElementById('detailedViewContent');
        if (toggleDetailedViewBtn && detailedViewContent) {
            toggleDetailedViewBtn.addEventListener('click', () => {
                detailedViewContent.classList.toggle('visibility-hidden');
            });
        }
        
        // --- TOGGLE PENSION GAP ---
        const togglePensionGapBtn = document.getElementById('togglePensionGapBtn');
        const pensionGapContent = document.getElementById('pensionGapContent');
        if (togglePensionGapBtn && pensionGapContent) {
            togglePensionGapBtn.addEventListener('click', () => {
                pensionGapContent.classList.toggle('visibility-hidden');
            });
        }
    });


