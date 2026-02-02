/**
 * Portfolio Insight Dashboard
 * Interactive Investment Analysis Application
 * 
 * Pure JavaScript - No frameworks
 */

// ========================================
// Global State
// ========================================
const state = {
    data: [],
    startCapital: 10000000, // 10 MNOK
    currentPortfolio: {
        stocks: 0,    // Likviditet/kontanter – kun ved manuelt valg
        riskFree: 80, // Renter (20% aksjer → 80% renter)
        highYield: 20,// Aksjer
        nordicStocks: 0,    // Alternative strategier – kun ved manuelt valg
        emergingMarkets: 0 // Annet – kun ved manuelt valg
    },
    newPortfolio: {
        stocks: 0,    // Likviditet/kontanter – kun ved manuelt valg
        riskFree: 45, // Renter (55% aksjer → 45% renter)
        highYield: 55,// Aksjer
        nordicStocks: 0,    // Alternative strategier – kun ved manuelt valg
        emergingMarkets: 0 // Annet – kun ved manuelt valg
    },
    charts: {
        overview: null,
        comparison: null,
        equity: null,
        drawdown: null,
        nurse: null,
        nurse1: null,
        nurse2: null,
        nurse3: null,
        nurse4: null,
        allocation: null,
        currentTreemap: null,
        newTreemap: null
    },
    activeNurseTab: 1, // Track which nurse tab is active
    fullscreenChart: null,
    drawdownZoom: {
        isZoomed: false,
        minX: null,
        maxX: null
    },
    selectedDrawdownPortfolio: 'current',
    selectedDrawdownView: 'percent', // 'percent' or 'kr'
    selectedPeriod: 'max', // Options: 'ytd', '12m', '3y', '5y', '10y', 'max'
    portfolioComparisonChartType: 'overview', // 'overview' or 'asset-classes'
    allocationRebalancing: false, // true = med rebalansering, false = uten rebalansering (default)
    selectedAssetClass: null // Selected asset class for filtering (null = no filter)
};

// Make state globally available for testing
window.state = state;

// ========================================
// CSV Data (Embedded for CORS compatibility)
// ========================================
const csvData = `Dato,Risikofri_Rente,High_Yield,Aksjer_Global,Sykepleier_Lonn,Gullprisen,BigMac
1995-01-01,100.00,100.00,100.00,220000,271.42,
1995-04-01,101.25,101.80,105.20,220000,271.42,
1995-07-01,102.51,103.64,112.45,220000,271.42,
1995-10-01,103.78,105.50,108.30,220000,271.42,
1996-01-01,105.07,107.40,115.80,228000,271.42,
1996-04-01,106.37,109.32,122.50,228000,271.42,
1996-07-01,107.68,111.28,128.90,228000,271.42,
1996-10-01,109.01,113.27,135.20,228000,271.42,
1997-01-01,110.35,115.29,142.80,237000,271.42,
1997-04-01,111.71,117.35,155.30,237000,271.42,
1997-07-01,113.08,119.44,168.20,237000,271.42,
1997-10-01,114.47,121.57,162.50,237000,271.42,
1998-01-01,115.87,123.74,175.80,246000,271.42,
1998-04-01,117.29,125.94,182.30,246000,271.42,
1998-07-01,118.72,128.18,170.50,246000,271.42,
1998-10-01,120.17,118.50,155.80,246000,271.42,
1999-01-01,121.63,122.40,168.90,256000,271.42,
1999-04-01,123.11,126.50,185.60,256000,271.42,
1999-07-01,124.61,130.70,195.20,256000,271.42,
1999-10-01,126.12,135.10,215.80,256000,271.42,
2000-01-01,127.65,139.60,238.50,267000,271.42,
2000-04-01,129.19,144.30,225.30,267000,271.42,
2000-07-01,130.75,149.10,210.80,267000,271.42,
2000-10-01,132.33,142.50,195.60,267000,271.42,
2001-01-01,133.92,136.80,185.20,278000,271.42,34.00
2001-04-01,135.53,131.50,175.80,278000,273.15,34.00
2001-07-01,137.16,126.60,165.30,278000,274.88,34.00
2001-10-01,138.80,122.10,148.90,278000,276.62,34.00
2002-01-01,140.46,118.20,142.50,290000,278.35,34.00
2002-04-01,142.14,114.80,138.20,290000,294.31,34.00
2002-07-01,143.84,111.90,125.60,290000,310.27,34.00
2002-10-01,145.56,109.50,118.30,290000,326.24,34.00
2003-01-01,147.29,112.80,115.20,302000,342.20,34.00
2003-04-01,149.05,118.50,125.80,302000,360.45,34.00
2003-07-01,150.82,124.60,138.50,302000,378.70,34.00
2003-10-01,152.61,131.20,152.80,302000,396.95,34.00
2004-01-01,154.42,138.30,165.30,315000,415.20,39.50
2004-04-01,156.25,145.80,172.50,315000,418.10,39.50
2004-07-01,158.10,153.70,178.20,315000,421.00,39.50
2004-10-01,159.97,162.10,188.60,315000,423.90,39.50
2005-01-01,161.86,171.00,198.50,329000,426.80,40.00
2005-04-01,163.77,180.40,205.80,329000,452.60,40.00
2005-07-01,165.70,190.30,215.60,329000,478.40,40.00
2005-10-01,167.66,200.80,228.30,329000,504.20,40.00
2006-01-01,169.63,211.90,245.80,343000,530.00,40.00
2006-04-01,171.63,223.50,258.60,343000,556.42,40.00
2006-07-01,173.65,235.80,268.30,343000,582.85,40.00
2006-10-01,175.69,248.60,282.50,343000,609.28,40.00
2007-01-01,177.76,262.10,298.80,358000,635.70,40.00
2007-04-01,179.84,276.20,315.60,358000,685.90,40.00
2007-07-01,181.95,290.90,328.50,358000,736.10,40.00
2007-10-01,184.08,275.80,312.30,358000,786.30,40.00
2008-01-01,186.24,260.50,285.60,374000,836.50,40.00
2008-04-01,188.42,245.80,268.30,374000,846.00,40.00
2008-07-01,190.63,215.60,242.50,374000,855.50,40.00
2008-10-01,192.86,175.30,178.60,374000,865.00,40.00
2009-01-01,195.12,158.20,155.80,391000,874.50,42.00
2009-04-01,197.40,175.60,178.50,391000,934.12,42.00
2009-07-01,199.71,195.80,205.30,391000,993.75,42.00
2009-10-01,202.04,218.50,232.80,391000,1053.38,42.00
2010-01-01,204.40,242.80,258.60,408000,1113.00,45.00
2010-04-01,206.78,268.50,275.30,408000,1181.88,45.00
2010-07-01,209.19,295.80,268.50,408000,1250.75,45.00
2010-10-01,211.62,324.60,298.60,408000,1319.62,45.00
2011-01-01,214.08,355.20,318.50,426000,1388.50,45.00
2011-04-01,216.57,388.60,335.80,426000,1440.88,45.00
2011-07-01,219.08,378.50,305.60,426000,1493.25,45.00
2011-10-01,221.62,365.80,285.30,426000,1545.62,45.00
2012-01-01,224.19,378.50,315.60,445000,1598.00,42.00
2012-04-01,226.79,392.80,338.50,445000,1612.88,42.00
2012-07-01,229.41,408.50,355.80,445000,1627.75,42.00
2012-10-01,232.06,425.60,378.50,445000,1642.62,42.00
2013-01-01,234.74,445.80,412.30,465000,1657.50,46.00
2013-04-01,237.45,468.50,438.60,465000,1549.38,46.00
2013-07-01,240.18,492.80,465.80,465000,1441.25,46.00
2013-10-01,242.95,518.60,498.50,465000,1333.12,46.00
2014-01-01,245.74,545.80,525.60,486000,1225.00,48.00
2014-04-01,248.56,575.50,548.30,486000,1214.75,48.00
2014-07-01,251.41,608.80,565.80,486000,1204.50,48.00
2014-10-01,254.29,642.50,582.50,486000,1194.25,48.00
2015-01-01,257.20,678.60,598.60,508000,1184.00,46.00
2015-04-01,260.14,718.50,625.30,508000,1158.50,46.00
2015-07-01,263.11,762.80,598.50,508000,1133.00,46.00
2015-10-01,266.11,798.60,615.80,508000,1107.50,46.00
2016-01-01,269.14,825.50,585.60,531000,1082.00,49.00
2016-04-01,272.20,858.80,618.50,531000,1102.00,49.00
2016-07-01,275.30,895.60,645.80,531000,1122.00,49.00
2016-10-01,278.42,935.80,678.30,531000,1142.00,49.00
2017-01-01,281.58,978.50,715.60,555000,1162.00,52.00
2017-04-01,284.77,1025.80,755.80,555000,1207.34,52.00
2017-07-01,287.99,1078.50,798.50,555000,1252.67,52.00
2017-10-01,291.24,1135.80,845.60,555000,1298.01,52.00
2018-01-01,294.53,1198.60,895.80,580000,1343.35,49.00
2018-04-01,297.85,1268.50,925.60,580000,1338.14,49.00
2018-07-01,301.20,1345.80,958.50,580000,1332.92,49.00
2018-10-01,304.59,1285.60,875.30,580000,1327.71,49.00
2019-01-01,308.01,1365.80,915.60,606000,1322.50,53.00
2019-04-01,311.47,1458.50,985.80,606000,1387.09,53.00
2019-07-01,314.96,1565.80,1025.50,606000,1451.67,53.00
2019-10-01,318.49,1685.60,1085.80,606000,1516.26,53.00
2020-01-01,322.05,1815.80,1145.60,633000,1580.85,55.00
2020-04-01,325.65,1525.60,885.30,633000,1648.06,55.00
2020-07-01,329.29,1685.80,1025.50,633000,1715.28,55.00
2020-10-01,332.96,1875.50,1185.80,633000,1782.49,55.00
2021-01-01,336.67,2085.60,1325.60,661000,1849.70,57.00
2021-04-01,340.42,2325.80,1485.80,661000,1836.31,57.00
2021-07-01,344.20,2598.50,1625.60,661000,1822.91,57.00
2021-10-01,348.02,2885.80,1785.30,661000,1809.51,57.00
2022-01-01,351.88,3025.60,1685.80,690000,1796.12,62.00
2022-04-01,355.78,2785.50,1485.60,690000,1829.12,62.00
2022-07-01,359.72,2565.80,1385.30,690000,1862.12,62.00
2022-10-01,363.70,2685.60,1485.80,690000,1895.12,62.00
2023-01-01,367.72,2885.80,1585.60,720000,1928.12,70.00
2023-04-01,371.78,3125.50,1725.80,720000,1955.88,70.00
2023-07-01,375.88,3385.80,1865.50,720000,1983.63,70.00
2023-10-01,380.02,3565.60,1985.30,720000,2011.39,70.00
2024-01-01,384.21,3785.80,2125.60,751000,2039.15,75.00
2024-04-01,388.43,3985.50,2285.80,751000,2228.91,75.00
2024-07-01,392.70,4185.80,2425.60,751000,2418.68,75.00
2024-10-01,397.01,4385.60,2565.30,751000,2608.44,75.00
2024-12-01,400.25,4525.80,2685.50,751000,4336.12,79.00`;

// ========================================
// CSV Parser
// ========================================
function parseCSV(csvString) {
    const lines = csvString.trim().split('\n');
    // Check if using semicolon separator (new format) or comma (old format)
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator);
        const row = {};
        
        headers.forEach((header, index) => {
            let value = values[index];
            if (!value) return; // Skip empty values
            
            value = value.trim();
            const headerLower = header.toLowerCase().trim();
            
            // Handle date parsing - support both DD.MM.YYYY and YYYY-MM-DD formats
            if (headerLower === 'dato') {
                if (value.includes('.')) {
                    // DD.MM.YYYY format
                    const [day, month, year] = value.split('.');
                    row.date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else {
                    // YYYY-MM-DD format
                    row.date = new Date(value);
                }
            } else if (header.toLowerCase().includes('globale aksjer')) {
                // Convert comma to dot for decimal separator, remove spaces
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.stocks = parseFloat(numValue);
            } else if (header.toLowerCase().includes('risikofri rente')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.riskFree = parseFloat(numValue);
            } else if (header.toLowerCase().includes('high yield')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.highYield = parseFloat(numValue);
            } else if (header.toLowerCase().includes('norske aksjer')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.nordicStocks = parseFloat(numValue);
            } else if (header.toLowerCase().includes('emerging markets')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.emergingMarkets = parseFloat(numValue);
            } else if (header.toLowerCase().includes('sykepleierlønn') || header.toLowerCase().includes('sykepleier_lonn')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.nurseSalary = parseFloat(numValue);
            } else if (header.toLowerCase().includes('gullprisen') || header.toLowerCase().includes('gullpris')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.goldPrice = parseFloat(numValue);
            } else if (headerLower === 'kpi') {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                const parsedKpi = parseFloat(numValue);
                row.kpi = isNaN(parsedKpi) ? null : parsedKpi;
                // Debug: Log first few KPI values
                if (data.length < 3 && row.date && row.date.getFullYear() === 1994) {
                    console.log('Parsed KPI:', { header: header, headerLower: headerLower, value: value, numValue: numValue, parsedKpi: parsedKpi, date: row.date });
                }
            } else if (header.toLowerCase().includes('bigmac')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.bigMacPrice = parseFloat(numValue);
            } else if (header.toLowerCase().includes('oljepris brent') || header.toLowerCase().includes('oljepris')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.oilPrice = parseFloat(numValue);
            } else if (header.toLowerCase().includes('m2 oslo')) {
                const numValue = value.replace(/\s/g, '').replace(',', '.');
                row.m2Oslo = parseFloat(numValue);
            }
        });
        
        // Only add row if it has a date
        if (row.date) {
            data.push(row);
        }
    }
    
    return data;
}

// ========================================
// Period Filtering
// ========================================
function getFilteredData() {
    const data = state.data;
    
    if (data.length === 0) return [];
    
    // Get unique years from data (sorted)
    const uniqueYears = new Set();
    data.forEach(row => uniqueYears.add(row.date.getFullYear()));
    const sortedYears = Array.from(uniqueYears).sort((a, b) => a - b);
    
    if (sortedYears.length === 0) return data;
    
    const lastYear = sortedYears[sortedYears.length - 1];
    let startYear;
    
    switch (state.selectedPeriod) {
        case 'ytd':
            // Year to date - from January 1st of last year in data
            startYear = lastYear;
            break;
        case '12m':
            // Last 12 months - use last year in data
            startYear = lastYear;
            break;
        case '3y':
            // Last 3 years - get the last 3 years from data
            startYear = sortedYears.length >= 3 ? sortedYears[sortedYears.length - 3] : sortedYears[0];
            break;
        case '5y':
            // Last 5 years - get the last 5 years from data
            startYear = sortedYears.length >= 5 ? sortedYears[sortedYears.length - 5] : sortedYears[0];
            break;
        case '10y':
            // Last 10 years - get the last 10 years from data
            startYear = sortedYears.length >= 10 ? sortedYears[sortedYears.length - 10] : sortedYears[0];
            break;
        case 'max':
        default:
            // All data
            return data;
    }
    
    // Filter data from January 1st of startYear onwards
    const startDate = new Date(startYear, 0, 1);
    const filteredData = data.filter(row => row.date >= startDate);
    
    // If no data matches, return at least the last data point
    if (filteredData.length === 0) {
        return data.slice(-1);
    }
    
    return filteredData;
}

function getPeriodLabel() {
    const labels = {
        'ytd': 'YTD',
        '12m': 'Siste 12 mnd',
        '3y': 'Siste 3 år',
        '5y': 'Siste 5 år',
        '10y': 'Siste 10 år',
        'max': 'Maks (2001-2025)'
    };
    return labels[state.selectedPeriod] || labels['max'];
}

// ========================================
// Portfolio Calculations
// ========================================
function calculatePortfolioValue(data, allocation, startCapital) {
    const values = [];
    const baseValues = data[0];
    
    // Convert percentages to MNOK amounts
    const stocksAmount = (allocation.stocks / 100) * startCapital;
    const riskFreeAmount = (allocation.riskFree / 100) * startCapital;
    const highYieldAmount = (allocation.highYield / 100) * startCapital;
    const nordicStocksAmount = (allocation.nordicStocks / 100) * startCapital;
    const emergingMarketsAmount = (allocation.emergingMarkets / 100) * startCapital;
    
    let lastKnownValue = null; // Track last known portfolio value for rows with missing data
    
    data.forEach(row => {
        // Check if row has all necessary data for portfolio calculation
        const hasAllData = row.stocks !== undefined && row.riskFree !== undefined && 
                          row.highYield !== undefined && baseValues.stocks && 
                          baseValues.riskFree && baseValues.highYield;
        
        let portfolioValue;
        
        if (hasAllData) {
            // Calculate relative returns from base (CSV: Globale aksjer→row.stocks, Risikofri rente→row.riskFree, High Yield→row.highYield)
            // UI mapping: Likviditet/kontanter→stocksAmount uses Risikofri rente; Renter→riskFreeAmount uses High Yield; Aksjer→highYieldAmount uses Globale aksjer
            const stockReturn = row.stocks / baseValues.stocks;       // Globale aksjer → for Aksjer-andel
            const riskFreeReturn = row.riskFree / baseValues.riskFree; // Risikofri rente → for Likviditet/kontanter-andel
            const highYieldReturn = row.highYield / baseValues.highYield; // High Yield → for Renter-andel
            // Use actual nordic stocks and emerging markets data if available, otherwise use stocks as proxy
            const nordicReturn = (row.nordicStocks && baseValues.nordicStocks) 
                ? row.nordicStocks / baseValues.nordicStocks 
                : row.stocks / baseValues.stocks;
            const emergingReturn = (row.emergingMarkets && baseValues.emergingMarkets) 
                ? row.emergingMarkets / baseValues.emergingMarkets 
                : row.stocks / baseValues.stocks;
            
            // Weighted portfolio value: Likviditet→riskFreeReturn, Renter→highYieldReturn, Aksjer→stockReturn
            portfolioValue = 
                stocksAmount * riskFreeReturn +
                riskFreeAmount * highYieldReturn +
                highYieldAmount * stockReturn +
                nordicStocksAmount * nordicReturn +
                emergingMarketsAmount * emergingReturn;
            
            lastKnownValue = portfolioValue; // Update last known value
        } else {
            // Use last known value if data is missing (e.g., for 2026 with only nurse salary)
            portfolioValue = lastKnownValue || startCapital;
        }
        
        values.push({
            date: row.date,
            value: portfolioValue,
            nurseSalary: row.nurseSalary,
            goldPrice: row.goldPrice,
            bigMacPrice: row.bigMacPrice,
            oilPrice: row.oilPrice,
            m2Oslo: row.m2Oslo
        });
    });
    
    return values;
}

function calculateReturns(portfolioValues) {
    const returns = [];
    for (let i = 1; i < portfolioValues.length; i++) {
        const periodReturn = (portfolioValues[i].value - portfolioValues[i - 1].value) / portfolioValues[i - 1].value;
        returns.push(periodReturn);
    }
    return returns;
}

function calculateVolatility(returns) {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    // Annualize (assuming quarterly data = 4 periods per year)
    return Math.sqrt(variance * 4) * 100;
}

function calculateDrawdown(portfolioValues) {
    const drawdowns = [];
    let peak = portfolioValues[0].value;
    
    portfolioValues.forEach(pv => {
        if (pv.value > peak) {
            peak = pv.value;
        }
        const drawdown = (pv.value - peak) / peak * 100;
        drawdowns.push({
            date: pv.date,
            drawdown: drawdown,
            value: pv.value,
            peak: peak
        });
    });
    
    return drawdowns;
}

function calculateDrawdownInKr(portfolioValues) {
    const drawdowns = [];
    let peak = portfolioValues[0].value;
    
    portfolioValues.forEach(pv => {
        if (pv.value > peak) {
            peak = pv.value;
        }
        const drawdownKr = pv.value - peak; // Loss in kr (negative value)
        drawdowns.push({
            date: pv.date,
            drawdown: drawdownKr,
            value: pv.value,
            peak: peak
        });
    });
    
    return drawdowns;
}

function calculateHighWaterMark(portfolioValues) {
    const hwmValues = [];
    let highWaterMark = portfolioValues[0].value;
    
    portfolioValues.forEach(pv => {
        // Update high water mark if current value is higher
        if (pv.value > highWaterMark) {
            highWaterMark = pv.value;
        }
        // The HWM line stays at the highest value seen so far
        hwmValues.push({
            date: pv.date,
            value: highWaterMark,
            actualValue: pv.value,
            isAtPeak: pv.value >= highWaterMark
        });
    });
    
    return hwmValues;
}

// Count number of All-Time High changes (jumps) in HWM for a given period
function countATHChanges(data, portfolio, years) {
    if (!data || data.length === 0) return 0;
    
    let filteredData;
    
    if (years === null) {
        // Max period - use all data
        filteredData = data;
    } else {
        // Filter data for the specified number of years
        const now = new Date();
        const startDate = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
        filteredData = data.filter(d => d.date >= startDate);
        
        if (filteredData.length === 0) return 0;
    }
    
    // Calculate portfolio values for the filtered period
    const portfolioValues = calculatePortfolioValue(filteredData, portfolio, state.startCapital);
    
    if (portfolioValues.length === 0) return 0;
    
    // Calculate HWM for filtered period
    const hwm = calculateHighWaterMark(portfolioValues);
    
    // Count how many times HWM value increases (new ATH)
    let athCount = 0;
    let previousHWM = hwm[0].value;
    
    for (let i = 1; i < hwm.length; i++) {
        if (hwm[i].value > previousHWM) {
            athCount++;
            previousHWM = hwm[i].value;
        }
    }
    
    return athCount;
}

function findLargestDrawdowns(drawdowns, count = 5) {
    // Find drawdown periods
    const periods = [];
    let inDrawdown = false;
    let startIdx = 0;
    let maxDrawdown = 0;
    let maxDrawdownIdx = 0;
    
    for (let i = 0; i < drawdowns.length; i++) {
        if (drawdowns[i].drawdown < 0 && !inDrawdown) {
            inDrawdown = true;
            startIdx = i;
            maxDrawdown = drawdowns[i].drawdown;
            maxDrawdownIdx = i;
        } else if (drawdowns[i].drawdown < 0 && inDrawdown) {
            if (drawdowns[i].drawdown < maxDrawdown) {
                maxDrawdown = drawdowns[i].drawdown;
                maxDrawdownIdx = i;
            }
        } else if (drawdowns[i].drawdown >= 0 && inDrawdown) {
            inDrawdown = false;
            const recoveryDays = Math.round((drawdowns[i].date - drawdowns[maxDrawdownIdx].date) / (1000 * 60 * 60 * 24));
            periods.push({
                startDate: drawdowns[startIdx].date,
                endDate: drawdowns[i].date,
                maxDrawdown: maxDrawdown,
                recoveryDays: recoveryDays
            });
        }
    }
    
    // If still in drawdown at end
    if (inDrawdown) {
        periods.push({
            startDate: drawdowns[startIdx].date,
            endDate: drawdowns[drawdowns.length - 1].date,
            maxDrawdown: maxDrawdown,
            recoveryDays: null // Not recovered
        });
    }
    
    // Sort by max drawdown and return top N
    return periods
        .sort((a, b) => a.maxDrawdown - b.maxDrawdown)
        .slice(0, count);
}

function findLongestHighWaterMarkPeriods(portfolioValues, count = 5) {
    // Find periods where portfolio was below high water mark
    // Period starts from peak date and ends when we reach a new peak
    const periods = [];
    let highWaterMark = portfolioValues[0].value;
    let peakDate = portfolioValues[0].date;
    let isBelowHWM = false;
    
    for (let i = 1; i < portfolioValues.length; i++) {
        const currentValue = portfolioValues[i].value;
        const currentDate = portfolioValues[i].date;
        
        // If we reach a new high water mark
        if (currentValue > highWaterMark) {
            // If we were below HWM, record the period from peak to recovery
            if (isBelowHWM) {
                const daysBelowHWM = Math.round((currentDate - peakDate) / (1000 * 60 * 60 * 24));
                periods.push({
                    startDate: peakDate,
                    endDate: currentDate,
                    daysBelowHWM: daysBelowHWM
                });
                isBelowHWM = false;
            }
            // Update high water mark
            highWaterMark = currentValue;
            peakDate = currentDate;
        } else if (currentValue < highWaterMark) {
            // Mark that we're below HWM
            if (!isBelowHWM) {
                isBelowHWM = true;
            }
        }
    }
    
    // If still below HWM at end
    if (isBelowHWM) {
        const lastDate = portfolioValues[portfolioValues.length - 1].date;
        const daysBelowHWM = Math.round((lastDate - peakDate) / (1000 * 60 * 60 * 24));
        periods.push({
            startDate: peakDate,
            endDate: lastDate,
            daysBelowHWM: daysBelowHWM
        });
    }
    
    // Sort by duration (longest first) and return top N
    return periods
        .sort((a, b) => b.daysBelowHWM - a.daysBelowHWM)
        .slice(0, count);
}

function calculateYearlyReturns(data) {
    const yearlyReturns = {};
    
    // Group by year
    const byYear = {};
    data.forEach(row => {
        const year = row.date.getFullYear();
        if (!byYear[year]) {
            byYear[year] = [];
        }
        byYear[year].push(row);
    });
    
    // Calculate yearly returns for each asset class
    Object.keys(byYear).forEach(year => {
        const yearData = byYear[year];
        if (yearData.length >= 2) {
            const first = yearData[0];
            const last = yearData[yearData.length - 1];
            
            // Calculate KPI yearly average (average of all monthly KPI values for the year)
            let kpiReturn = 0;
            if (yearData.length > 0) {
                const kpiValues = yearData.filter(row => row.kpi !== undefined && row.kpi !== null).map(row => row.kpi);
                if (kpiValues.length > 0) {
                    const sum = kpiValues.reduce((a, b) => a + b, 0);
                    kpiReturn = sum / kpiValues.length; // Average KPI for the year
                }
            }
            
            yearlyReturns[year] = {
                stocks: ((last.stocks - first.stocks) / first.stocks * 100),
                riskFree: ((last.riskFree - first.riskFree) / first.riskFree * 100),
                highYield: ((last.highYield - first.highYield) / first.highYield * 100),
                nordicStocks: (first.nordicStocks && last.nordicStocks) 
                    ? ((last.nordicStocks - first.nordicStocks) / first.nordicStocks * 100)
                    : ((last.stocks - first.stocks) / first.stocks * 100), // Fallback to stocks if not available
                emergingMarkets: (first.emergingMarkets && last.emergingMarkets)
                    ? ((last.emergingMarkets - first.emergingMarkets) / first.emergingMarkets * 100)
                    : ((last.stocks - first.stocks) / first.stocks * 100), // Fallback to stocks if not available
                kpi: kpiReturn
            };
        } else if (yearData.length === 1) {
            // If only one data point for the year, use it for all values (no change)
            const single = yearData[0];
            yearlyReturns[year] = {
                stocks: 0,
                riskFree: 0,
                highYield: 0,
                nordicStocks: 0,
                emergingMarkets: 0,
                kpi: single.kpi || 0
            };
        }
    });
    
    // Debug: Log years found
    const yearsFound = Object.keys(yearlyReturns).sort();
    if (yearsFound.length > 0) {
        console.log('calculateYearlyReturns - Years found:', {
            count: yearsFound.length,
            firstYear: yearsFound[0],
            lastYear: yearsFound[yearsFound.length - 1],
            allYears: yearsFound
        });
    }
    
    return yearlyReturns;
}

// ========================================
// Format Helpers
// ========================================
function formatCurrency(value) {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000) {
        return sign + (absValue / 1000000).toFixed(2) + ' MNOK';
    } else if (absValue >= 1000) {
        return sign + (absValue / 1000).toFixed(0) + ' KNOK';
    }
    return sign + absValue.toFixed(0) + ' NOK';
}

function formatPercent(value, decimals = 1) {
    const sign = value >= 0 ? '+' : '';
    return sign + value.toFixed(decimals) + '%';
}

function formatDate(date) {
    return date.toLocaleDateString('no-NO', { year: 'numeric', month: 'short' });
}

function openChartFullscreen(chartType) {
    // Determine which chart to show based on chartType
    let chart, title, modalId;
    
    switch(chartType) {
        case 'overview':
            chart = state.charts.overview;
            title = 'Porteføljesammenligning';
            modalId = 'chart-fullscreen-modal-overview';
            break;
        case 'comparison':
            chart = state.charts.comparison;
            title = 'High Water Mark';
            modalId = 'chart-fullscreen-modal-comparison';
            break;
        case 'drawdown':
            chart = state.charts.drawdown;
            title = 'Drawdown (Undervannsanalyse)';
            modalId = 'chart-fullscreen-modal-drawdown';
            break;
        default:
            return;
    }
    
    if (!chart) {
        return;
    }
    
    // Check if fullscreen modal already exists
    let modal = document.getElementById(modalId);
    let existingChart = null;
    
    if (modal) {
        // Modal exists, get existing chart if it exists
        const canvas = modal.querySelector('#fullscreen-chart');
        if (canvas && canvas._chart) {
            existingChart = canvas._chart;
        }
    } else {
        // Create modal overlay
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'chart-fullscreen-modal';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'chart-fullscreen-content';
        
        // Create header with close button
        const header = document.createElement('div');
        header.className = 'chart-fullscreen-header';
        header.innerHTML = `
            <h3>${title}</h3>
            <button class="chart-fullscreen-close" data-modal-id="${modalId}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-fullscreen-container';
        const canvas = document.createElement('canvas');
        canvas.id = 'fullscreen-chart';
        chartContainer.appendChild(canvas);
        
        modalContent.appendChild(header);
        modalContent.appendChild(chartContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Set up close handlers only once
        const closeBtn = header.querySelector('.chart-fullscreen-close');
        closeBtn.addEventListener('click', () => {
            closeChartFullscreen(modalId);
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeChartFullscreen(modalId);
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                closeChartFullscreen(modalId);
            }
        });
    }
    
    // Get fresh chart data and options (always get latest data)
    const chartData = JSON.parse(JSON.stringify(chart.data));
    const chartOptions = JSON.parse(JSON.stringify(chart.options));
    
    // For time-based charts, ensure x-axis shows only the data range
    // Extract all dates from the datasets
    let allDates = [];
    chartData.datasets.forEach(dataset => {
        if (dataset.data && dataset.data.length > 0) {
            dataset.data.forEach(point => {
                if (point.x) {
                    allDates.push(new Date(point.x));
                }
            });
        }
    });
    
    // Set min/max for time scale to match the data range
    if (allDates.length > 0 && chartOptions.scales && chartOptions.scales.x && chartOptions.scales.x.type === 'time') {
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        // Add small padding (1% of total range)
        const dateRange = maxDate.getTime() - minDate.getTime();
        const padding = dateRange * 0.01;
        
        chartOptions.scales.x.min = new Date(minDate.getTime() - padding);
        chartOptions.scales.x.max = new Date(maxDate.getTime() + padding);
    }
    
    // Get plugins if they exist (for drawdown chart)
    const chartPlugins = chart.config.plugins || [];
    
    if (existingChart) {
        // Update existing chart with new data
        existingChart.data = chartData;
        existingChart.options = chartOptions;
        existingChart.update();
    } else {
        // Create new chart in fullscreen modal
        const canvas = modal.querySelector('#fullscreen-chart');
        const ctx = canvas.getContext('2d');
        const fullscreenChartConfig = {
            type: chart.config.type || 'line',
            data: chartData,
            options: chartOptions
        };
        
        // Add plugins if they exist
        if (chartPlugins.length > 0) {
            fullscreenChartConfig.plugins = chartPlugins;
        }
        
        const fullscreenChart = new Chart(ctx, fullscreenChartConfig);
        
        // Store reference on canvas for resize
        canvas._chart = fullscreenChart;
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Resize chart after showing
    setTimeout(() => {
        const canvas = modal.querySelector('#fullscreen-chart');
        if (canvas && canvas._chart) {
            canvas._chart.resize();
        }
    }, 100);
}

function closeChartFullscreen(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}


// ========================================
// Chart Configuration
// ========================================
const chartColors = {
    current: {
        main: 'oklch(0.4562 0.1809 260.1560)', // chart-4
        light: 'oklch(0.9489 0.0188 255.5341)', // accent with opacity
        border: 'oklch(0.4562 0.1809 260.1560)'
    },
    new: {
        main: 'oklch(0.6020 0.1679 258.6201)', // chart-3
        light: 'oklch(0.9489 0.0188 255.5341)', // accent with opacity
        border: 'oklch(0.6020 0.1679 258.6201)'
    },
    drawdown: {
        main: 'oklch(0.4322 0.1500 28.9906)', // destructive
        light: 'oklch(0.9489 0.0188 255.5341)' // accent with opacity
    },
    stocks: 'oklch(0.6020 0.1679 258.6201)', // chart-3
    riskFree: 'oklch(0.7450 0.1024 258.2961)', // chart-2
    highYield: 'oklch(0.8479 0.0603 257.7878)', // chart-1
    nurse: 'oklch(0.55 0.18 145)', // Green color for nurse index line
    gold: 'oklch(0.65 0.15 75)' // Gold color for gold price index line
};

const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        intersect: false,
        mode: 'index'
    },
    plugins: {
        legend: {
            position: 'top',
            labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                    family: "'DM Sans', sans-serif",
                    size: 13
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(26, 32, 44, 0.95)',
            titleFont: {
                family: "'DM Sans', sans-serif",
                size: 14
            },
            bodyFont: {
                family: "'JetBrains Mono', monospace",
                size: 13
            },
            padding: 12,
            cornerRadius: 8,
            displayColors: true
        }
    },
    scales: {
        x: {
            type: 'time',
            time: {
                unit: 'year',
                displayFormats: {
                    year: 'yyyy'
                }
            },
            grid: {
                display: false
            },
            ticks: {
                font: {
                    family: "'DM Sans', sans-serif",
                    size: 11
                }
            }
        },
        y: {
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
                font: {
                    family: "'JetBrains Mono', monospace",
                    size: 11
                }
            }
        }
    }
};

// ========================================
// UI Update Functions
// ========================================
function updateSliderUI(type) {
    const portfolio = type === 'current' ? state.currentPortfolio : state.newPortfolio;
    const prefix = type === 'current' ? 'current' : 'new';
    
    // Update all slider value displays (in % - no decimals)
    document.getElementById(`${prefix}-stocks-value`).textContent = Math.round(portfolio.stocks) + '%';
    document.getElementById(`${prefix}-riskfree-value`).textContent = Math.round(portfolio.riskFree) + '%';
    document.getElementById(`${prefix}-highyield-value`).textContent = Math.round(portfolio.highYield) + '%';
    document.getElementById(`${prefix}-nordic-value`).textContent = Math.round(portfolio.nordicStocks) + '%';
    document.getElementById(`${prefix}-emerging-value`).textContent = Math.round(portfolio.emergingMarkets) + '%';
    
    // Calculate and display total
    const total = portfolio.stocks + portfolio.riskFree + portfolio.highYield + 
                  portfolio.nordicStocks + portfolio.emergingMarkets;
    const totalEl = document.getElementById(`${prefix}-total`);
    const warningEl = document.getElementById(`${prefix}-warning`);
    
    totalEl.textContent = Math.round(total) + '%';
    
    // Show warning if total exceeds 100%
    if (total > 100) {
        totalEl.style.color = 'var(--destructive)';
        if (warningEl) warningEl.style.display = 'block';
        warningEl.textContent = 'Summen overstiger 100%!';
    } else {
        totalEl.style.color = 'var(--primary)';
        if (warningEl) warningEl.style.display = 'none';
    }
    
    // Update slider values
    document.getElementById(`${prefix}-stocks`).value = portfolio.stocks;
    document.getElementById(`${prefix}-riskfree`).value = portfolio.riskFree;
    document.getElementById(`${prefix}-highyield`).value = portfolio.highYield;
    document.getElementById(`${prefix}-nordic`).value = portfolio.nordicStocks;
    document.getElementById(`${prefix}-emerging`).value = portfolio.emergingMarkets;
    
    // Update treemap charts
    updateTreemapChart(type);
}

function updateTreemapChart(type) {
    const portfolio = type === 'current' ? state.currentPortfolio : state.newPortfolio;
    const chartId = type === 'current' ? 'current-treemap-chart' : 'new-treemap-chart';
    const canvas = document.getElementById(chartId);
    
    if (!canvas) return;
    
    // Get device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // If canvas has zero dimensions (tab is hidden), skip rendering
    // This will be retried when the tab becomes visible
    if (displayWidth === 0 || displayHeight === 0) return;
    
    // Set actual size in memory (scaled for DPI)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Scale the canvas back down using CSS
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    
    // Scale the drawing context so everything draws at the correct size
    ctx.scale(dpr, dpr);
    
    const width = displayWidth;
    const height = displayHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Disable image smoothing for crisp edges
    ctx.imageSmoothingEnabled = false;
    
    // Prepare data - filter out zero values
    const data = [
        { name: 'Likviditet/kontanter', value: portfolio.stocks, color: 'oklch(0.6020 0.1679 258.6201)' },
        { name: 'Renter', value: portfolio.riskFree, color: 'oklch(0.7450 0.1024 258.2961)' },
        { name: 'Aksjer', value: portfolio.highYield, color: 'oklch(0.8479 0.0603 257.7878)' },
        { name: 'Alternative strategier', value: portfolio.nordicStocks, color: 'oklch(0.4562 0.1809 260.1560)' },
        { name: 'Annet', value: portfolio.emergingMarkets, color: 'oklch(0.2722 0.1053 258.9631)' }
    ].filter(item => item.value > 0);
    
    if (data.length === 0) return;
    
    // Calculate total for normalization
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return;
    
    // Simple treemap layout using squarified algorithm
    const padding = 4;
    const availableWidth = width - (padding * 2);
    const availableHeight = height - (padding * 2);
    
    // Sort by value descending
    data.sort((a, b) => b.value - a.value);
    
    // Calculate areas
    const totalArea = availableWidth * availableHeight;
    const items = data.map(item => ({
        ...item,
        area: (item.value / total) * totalArea
    }));
    
    // Simple row-based layout
    let y = padding;
    let remainingHeight = availableHeight;
    let remainingWidth = availableWidth;
    let itemIndex = 0;
    
    while (itemIndex < items.length && remainingHeight > 0 && remainingWidth > 0) {
        const row = [];
        let rowArea = 0;
        
        // Build a row
        while (itemIndex < items.length) {
            const item = items[itemIndex];
            const testRow = [...row, item];
            const testRowArea = rowArea + item.area;
            const rowHeight = testRowArea / remainingWidth;
            
            // Check if adding this item makes the row worse (aspect ratio)
            if (row.length > 0) {
                const currentRowHeight = rowArea / remainingWidth;
                const currentAspectRatio = Math.max(remainingWidth / currentRowHeight, currentRowHeight / remainingWidth);
                const newAspectRatio = Math.max(remainingWidth / rowHeight, rowHeight / remainingWidth);
                
                if (newAspectRatio > currentAspectRatio && row.length > 1) {
                    break; // Don't add this item to current row
                }
            }
            
            row.push(item);
            rowArea = testRowArea;
            itemIndex++;
        }
        
        // Draw the row
        const rowHeight = rowArea / remainingWidth;
        let x = padding + (availableWidth - remainingWidth);
        
        row.forEach(cell => {
            const cellWidth = (cell.area / rowHeight);
            drawTreemapCell(ctx, x, y, cellWidth, rowHeight, cell);
            x += cellWidth;
        });
        
        y += rowHeight;
        remainingHeight -= rowHeight;
    }
}

function drawTreemapCell(ctx, x, y, width, height, item) {
    // Draw rectangle
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = 'oklch(1.0000 0 0)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Draw text if space allows
    if (width > 60 && height > 30) {
        ctx.fillStyle = 'oklch(1.0000 0 0)';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textX = x + width / 2;
        
        // Split label by space if it contains multiple words
        const words = item.name.split(' ');
        const lineHeight = 13;
        const totalLabelHeight = words.length * lineHeight;
        const valueHeight = 14;
        const totalTextHeight = totalLabelHeight + valueHeight + 4; // 4px spacing between label and value
        const startY = y + height / 2 - totalTextHeight / 2 + lineHeight / 2;
        
        // Draw label lines
        words.forEach((word, index) => {
            ctx.textBaseline = 'middle';
            ctx.fillText(word, textX, startY + (index * lineHeight));
        });
        
        // Draw value
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(item.value) + '%', textX, startY + totalLabelHeight + 4 + valueHeight / 2);
    }
}

function validateAndAdjustSlider(type, changedSliderId, newValue) {
    const portfolio = type === 'current' ? state.currentPortfolio : state.newPortfolio;
    const prefix = type === 'current' ? 'current' : 'new';
    const maxTotal = 100; // 100%
    
    // Update the changed slider's value
    const newPercent = parseFloat(newValue);
    if (changedSliderId.includes('stocks')) portfolio.stocks = newPercent;
    else if (changedSliderId.includes('riskfree')) portfolio.riskFree = newPercent;
    else if (changedSliderId.includes('highyield')) portfolio.highYield = newPercent;
    else if (changedSliderId.includes('nordic')) portfolio.nordicStocks = newPercent;
    else if (changedSliderId.includes('emerging')) portfolio.emergingMarkets = newPercent;
    
    // Calculate current total
    let total = portfolio.stocks + portfolio.riskFree + portfolio.highYield + 
                portfolio.nordicStocks + portfolio.emergingMarkets;
    
    // If total exceeds max, reduce the changed slider
    if (total > maxTotal) {
        const excess = total - maxTotal;
        if (changedSliderId.includes('stocks')) portfolio.stocks = Math.max(0, portfolio.stocks - excess);
        else if (changedSliderId.includes('riskfree')) portfolio.riskFree = Math.max(0, portfolio.riskFree - excess);
        else if (changedSliderId.includes('highyield')) portfolio.highYield = Math.max(0, portfolio.highYield - excess);
        else if (changedSliderId.includes('nordic')) portfolio.nordicStocks = Math.max(0, portfolio.nordicStocks - excess);
        else if (changedSliderId.includes('emerging')) portfolio.emergingMarkets = Math.max(0, portfolio.emergingMarkets - excess);
    }
    
    // If user manually adjusted sliders, remove active state from allocation buttons for that portfolio
    const portfolioButtons = document.querySelectorAll(`.allocation-btn[data-portfolio="${type}"]`);
    portfolioButtons.forEach(btn => btn.classList.remove('active'));
    
    // Update UI
    updateSliderUI(type);
    updateCharts();
}

function updateMetrics() {
    const filteredData = getFilteredData();
    const currentValues = calculatePortfolioValue(filteredData, state.currentPortfolio, state.startCapital);
    const newValues = calculatePortfolioValue(filteredData, state.newPortfolio, state.startCapital);
    
    const currentEndValue = currentValues[currentValues.length - 1].value;
    const newEndValue = newValues[newValues.length - 1].value;
    
    const currentReturn = ((currentEndValue - state.startCapital) / state.startCapital) * 100;
    const newReturn = ((newEndValue - state.startCapital) / state.startCapital) * 100;
    
    const currentReturns = calculateReturns(currentValues);
    const newReturns = calculateReturns(newValues);
    
    const currentVol = calculateVolatility(currentReturns);
    const newVol = calculateVolatility(newReturns);
    
    // Update current portfolio metrics
    document.getElementById('current-return').textContent = formatPercent(currentReturn);
    document.getElementById('current-endvalue').textContent = formatCurrency(currentEndValue);
    document.getElementById('current-volatility').textContent = currentVol.toFixed(1) + '%';
    
    // Update new portfolio metrics
    document.getElementById('new-return').textContent = formatPercent(newReturn);
    document.getElementById('new-endvalue').textContent = formatCurrency(newEndValue);
    document.getElementById('new-volatility').textContent = newVol.toFixed(1) + '%';
    
    // Update difference
    // Avkastningsforskjell: (sluttverdi ny / sluttverdi dagens) - 1
    const diffReturn = currentEndValue > 0 ? ((newEndValue / currentEndValue) - 1) * 100 : 0;
    const diffValue = newEndValue - currentEndValue;
    const diffVol = newVol - currentVol;
    
    const diffReturnEl = document.getElementById('diff-return');
    const diffValueEl = document.getElementById('diff-endvalue');
    const diffVolEl = document.getElementById('diff-volatility');
    
    diffReturnEl.textContent = formatPercent(diffReturn);
    diffReturnEl.className = `metric-value ${diffReturn < 0 ? 'negative' : ''}`;
    
    diffValueEl.textContent = formatCurrency(diffValue);
    diffValueEl.className = `metric-value ${diffValue < 0 ? 'negative' : ''}`;
    
    diffVolEl.textContent = formatPercent(diffVol);
    diffVolEl.className = `metric-value ${diffVol < 0 ? 'negative' : ''}`;
}

// ========================================
// Chart Functions
// ========================================
function createOverviewChart() {
    // Check which chart type to show
    if (state.portfolioComparisonChartType === 'asset-classes') {
        createAssetClassesChart();
        return;
    }
    
    const ctx = document.getElementById('overview-chart').getContext('2d');
    const filteredData = getFilteredData();
    
    const currentValues = calculatePortfolioValue(filteredData, state.currentPortfolio, state.startCapital);
    const newValues = calculatePortfolioValue(filteredData, state.newPortfolio, state.startCapital);
    
    // Normalize both portfolios to start at exactly 10 MNOK
    if (currentValues.length > 0 && currentValues[0].value !== state.startCapital) {
        const currentNormalizationFactor = state.startCapital / currentValues[0].value;
        currentValues.forEach(v => {
            v.value = v.value * currentNormalizationFactor;
        });
    }
    
    if (newValues.length > 0 && newValues[0].value !== state.startCapital) {
        const newNormalizationFactor = state.startCapital / newValues[0].value;
        newValues.forEach(v => {
            v.value = v.value * newNormalizationFactor;
        });
    }
    
    if (state.charts.overview) {
        state.charts.overview.destroy();
    }
    
    state.charts.overview = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Dagens Portefølje',
                    data: currentValues.map(v => ({ x: v.date, y: v.value })),
                    borderColor: chartColors.current.main,
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Ny Portefølje',
                    data: newValues.map(v => ({ x: v.date, y: v.value })),
                    borderColor: chartColors.new.main,
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                legend: {
                    ...commonChartOptions.plugins.legend,
                    labels: {
                        ...commonChartOptions.plugins.legend.labels,
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            labels.forEach(label => {
                                // Set fillStyle to same color as strokeStyle for filled circles
                                label.fillStyle = label.strokeStyle;
                            });
                            return labels;
                        }
                    }
                },
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    backgroundColor: '#ffffff',
                    titleColor: 'oklch(0.2722 0.1053 258.9631)',
                    bodyColor: 'oklch(0.2722 0.1053 258.9631)',
                    borderColor: 'oklch(0.9324 0.0080 253.8552)',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            // Format date without time, just date
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('no-NO', { year: 'numeric', month: 'short', day: 'numeric' });
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        },
                        labelColor: function(context) {
                            // Make filled circles in tooltip by setting backgroundColor to same as borderColor
                            return {
                                borderColor: context.dataset.borderColor,
                                backgroundColor: context.dataset.borderColor,
                                borderWidth: 0
                            };
                        }
                    }
                }
            },
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: function(value) {
                            return (value / 1000000).toFixed(0) + ' M';
                        }
                    }
                }
            }
        }
    });
    
    // Update overview metrics (only for overview chart, not asset classes)
    updateOverviewMetrics(currentValues, newValues);
    
    // Update fullscreen chart if it exists
    if (state.fullscreenChart) {
        const fullscreenData = JSON.parse(JSON.stringify(state.charts.overview.data));
        state.fullscreenChart.data = fullscreenData;
        state.fullscreenChart.update();
    }
}

// Calculate individual asset class values over time
function calculateAssetClassValue(data, assetClass, allocationPercent, startCapital) {
    const values = [];
    const baseValues = data[0];
    const amount = (allocationPercent / 100) * startCapital;
    
    data.forEach(row => {
        let returnValue;
        switch(assetClass) {
            case 'stocks': // Likviditet/kontanter → Risikofri rente (historiske kurser2.csv)
                returnValue = row.riskFree / baseValues.riskFree;
                break;
            case 'riskFree': // Renter → High Yield (historiske kurser2.csv)
                returnValue = row.highYield / baseValues.highYield;
                break;
            case 'highYield': // Aksjer → Globale aksjer (historiske kurser2.csv)
                returnValue = row.stocks / baseValues.stocks;
                break;
            case 'nordicStocks':
                // Use actual nordic stocks data if available, otherwise use stocks as proxy
                if (row.nordicStocks && baseValues.nordicStocks) {
                    returnValue = row.nordicStocks / baseValues.nordicStocks;
                } else {
                    returnValue = row.stocks / baseValues.stocks;
                }
                break;
            case 'emergingMarkets':
                // Use actual emerging markets data if available, otherwise use stocks as proxy
                if (row.emergingMarkets && baseValues.emergingMarkets) {
                    returnValue = row.emergingMarkets / baseValues.emergingMarkets;
                } else {
                    returnValue = row.stocks / baseValues.stocks;
                }
                break;
            default:
                returnValue = 1;
        }
        
        values.push({
            date: row.date,
            value: amount * returnValue
        });
    });
    
    return values;
}

// Calculate asset class values WITHOUT rebalancing (static initial allocation, grows based on individual returns)
// Each asset class starts with its initial allocation and grows independently based on its own return
function calculateAssetClassValueWithoutRebalancing(data, portfolio, startCapital) {
    const baseValues = data[0];
    const values = [];
    
    // Initialize starting amounts for each asset class (e.g., 20% of 10 MNOK = 2 MNOK each)
    const stocksAmount = (portfolio.stocks / 100) * startCapital;
    const riskFreeAmount = (portfolio.riskFree / 100) * startCapital;
    const highYieldAmount = (portfolio.highYield / 100) * startCapital;
    const nordicStocksAmount = (portfolio.nordicStocks / 100) * startCapital;
    const emergingMarketsAmount = (portfolio.emergingMarkets / 100) * startCapital;
    
    data.forEach(row => {
        // CSV mapping: Likviditet→Risikofri rente, Renter→High Yield, Aksjer→Globale aksjer (historiske kurser2.csv)
        const stocksReturn = row.stocks / baseValues.stocks;       // Globale aksjer (for Aksjer)
        const riskFreeReturn = row.riskFree / baseValues.riskFree; // Risikofri rente (for Likviditet)
        const highYieldReturn = row.highYield / baseValues.highYield; // High Yield (for Renter)
        const nordicReturn = (row.nordicStocks && baseValues.nordicStocks) 
            ? row.nordicStocks / baseValues.nordicStocks 
            : row.stocks / baseValues.stocks;
        const emergingReturn = (row.emergingMarkets && baseValues.emergingMarkets) 
            ? row.emergingMarkets / baseValues.emergingMarkets 
            : row.stocks / baseValues.stocks;
        
        // Each asset class value = initial amount * total return (no rebalancing). Map UI keys to CSV columns.
        values.push({
            date: row.date,
            stocks: stocksAmount * riskFreeReturn,
            riskFree: riskFreeAmount * highYieldReturn,
            highYield: highYieldAmount * stocksReturn,
            nordicStocks: nordicStocksAmount * nordicReturn,
            emergingMarkets: emergingMarketsAmount * emergingReturn
        });
    });
    
    return values;
}

function createAssetClassesChart() {
    const ctx = document.getElementById('overview-chart').getContext('2d');
    const filteredData = getFilteredData();
    
    // Get asset classes with allocation > 0 in new portfolio
    const assetClasses = [
        { key: 'stocks', name: 'Likviditet/kontanter', color: 'oklch(0.6020 0.1679 258.6201)' },
        { key: 'riskFree', name: 'Renter', color: 'oklch(0.7450 0.1024 258.2961)' },
        { key: 'highYield', name: 'Aksjer', color: 'oklch(0.8479 0.0603 257.7878)' },
        { key: 'nordicStocks', name: 'Alternative strategier', color: 'oklch(0.4562 0.1809 260.1560)' },
        { key: 'emergingMarkets', name: 'Annet', color: 'oklch(0.2722 0.1053 258.9631)' }
    ].filter(asset => state.newPortfolio[asset.key] > 0);
    
    if (assetClasses.length === 0) {
        // If no asset classes selected, show empty chart
        if (state.charts.overview) {
            state.charts.overview.destroy();
        }
        state.charts.overview = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: commonChartOptions
        });
        return;
    }
    
    // Calculate values for each asset class
    const datasets = assetClasses.map(asset => {
        const values = calculateAssetClassValue(
            filteredData,
            asset.key,
            state.newPortfolio[asset.key],
            state.startCapital
        );
        
        return {
            label: `${asset.name} (${Math.round(state.newPortfolio[asset.key])}%)`,
            data: values.map(v => ({ x: v.date, y: v.value })),
            borderColor: asset.color,
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 6
        };
    });
    
    if (state.charts.overview) {
        state.charts.overview.destroy();
    }
    
    state.charts.overview = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                legend: {
                    ...commonChartOptions.plugins.legend,
                    labels: {
                        ...commonChartOptions.plugins.legend.labels,
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            labels.forEach(label => {
                                // Set fillStyle to same color as strokeStyle for filled circles
                                label.fillStyle = label.strokeStyle;
                            });
                            return labels;
                        }
                    }
                },
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    backgroundColor: '#ffffff',
                    titleColor: 'oklch(0.2722 0.1053 258.9631)',
                    bodyColor: 'oklch(0.2722 0.1053 258.9631)',
                    borderColor: 'oklch(0.9324 0.0080 253.8552)',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            // Format date without time, just date
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('no-NO', { year: 'numeric', month: 'short', day: 'numeric' });
                        },
                        label: function(context) {
                            return context.dataset.label.split(' (')[0] + ': ' + formatCurrency(context.parsed.y);
                        },
                        labelColor: function(context) {
                            // Make filled circles in tooltip by setting backgroundColor to same as borderColor
                            return {
                                borderColor: context.dataset.borderColor,
                                backgroundColor: context.dataset.borderColor,
                                borderWidth: 0
                            };
                        }
                    }
                }
            },
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: function(value) {
                            return (value / 1000000).toFixed(0) + ' M';
                        }
                    }
                }
            }
        }
    });
    
    // Update fullscreen chart if it exists
    if (state.fullscreenChart) {
        const fullscreenData = JSON.parse(JSON.stringify(state.charts.overview.data));
        state.fullscreenChart.data = fullscreenData;
        state.fullscreenChart.update();
    }
}

function updateOverviewMetrics(currentValues, newValues) {
    const currentEndValue = currentValues[currentValues.length - 1].value;
    const newEndValue = newValues[newValues.length - 1].value;
    
    const currentReturn = ((currentEndValue - state.startCapital) / state.startCapital) * 100;
    const newReturn = ((newEndValue - state.startCapital) / state.startCapital) * 100;
    
    const currentReturns = calculateReturns(currentValues);
    const newReturns = calculateReturns(newValues);
    
    const currentVol = calculateVolatility(currentReturns);
    const newVol = calculateVolatility(newReturns);
    
    // Update current portfolio metrics
    const currentReturnEl = document.getElementById('overview-current-return');
    const currentEndvalueEl = document.getElementById('overview-current-endvalue');
    const currentVolatilityEl = document.getElementById('overview-current-volatility');
    
    if (currentReturnEl) currentReturnEl.textContent = formatPercent(currentReturn);
    if (currentEndvalueEl) currentEndvalueEl.textContent = formatCurrency(currentEndValue);
    if (currentVolatilityEl) currentVolatilityEl.textContent = currentVol.toFixed(1) + '%';
    
    // Update new portfolio metrics
    const newReturnEl = document.getElementById('overview-new-return');
    const newEndvalueEl = document.getElementById('overview-new-endvalue');
    const newVolatilityEl = document.getElementById('overview-new-volatility');
    
    if (newReturnEl) newReturnEl.textContent = formatPercent(newReturn);
    if (newEndvalueEl) newEndvalueEl.textContent = formatCurrency(newEndValue);
    if (newVolatilityEl) newVolatilityEl.textContent = newVol.toFixed(1) + '%';
    
    // Update difference
    // Avkastningsforskjell: (sluttverdi ny / sluttverdi dagens) - 1
    const diffReturn = currentEndValue > 0 ? ((newEndValue / currentEndValue) - 1) * 100 : 0;
    const diffValue = newEndValue - currentEndValue;
    const diffVol = newVol - currentVol;
    
    const diffReturnEl = document.getElementById('overview-diff-return');
    const diffValueEl = document.getElementById('overview-diff-endvalue');
    const diffVolEl = document.getElementById('overview-diff-volatility');
    
    if (diffReturnEl) {
        diffReturnEl.textContent = formatPercent(diffReturn);
        diffReturnEl.className = `metric-value ${diffReturn < 0 ? 'negative' : ''}`;
    }
    
    if (diffValueEl) {
        diffValueEl.textContent = formatCurrency(diffValue);
        diffValueEl.className = `metric-value ${diffValue < 0 ? 'negative' : ''}`;
    }
    
    if (diffVolEl) {
        diffVolEl.textContent = formatPercent(diffVol);
        diffVolEl.className = `metric-value ${diffVol < 0 ? 'negative' : ''}`;
    }
}

function createAllocationChart() {
    const canvas = document.getElementById('allocation-chart');
    if (!canvas) {
        console.warn('Allocation chart canvas not found');
        return;
    }
    
    console.log('=== CREATING ALLOCATION CHART ===');
    console.log('Rebalancing state:', state.allocationRebalancing);
    
    // Destroy existing chart first
    if (state.charts.allocation) {
        try {
            state.charts.allocation.destroy();
        } catch (e) {
            console.warn('Error destroying chart:', e);
        }
        state.charts.allocation = null;
    }
    
    // Get canvas context
    const ctx = canvas.getContext('2d');
    
    // Ensure canvas has proper dimensions - Chart.js will handle responsive sizing
    // but we need dimensions for clearing
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        // Only set if canvas doesn't already have correct dimensions
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
    } else {
        // Fallback dimensions if not visible yet
        canvas.width = 800;
        canvas.height = 400;
    }
    
    // Clear canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const filteredData = getFilteredData();
    
    if (!filteredData || filteredData.length === 0) {
        console.warn('No filtered data available');
        return;
    }
    
    // Get asset classes with allocation > 0 in new portfolio
    const assetClasses = [
        { key: 'stocks', name: 'Likviditet/kontanter', color: 'oklch(0.6020 0.1679 258.6201)' },
        { key: 'riskFree', name: 'Renter', color: 'oklch(0.7450 0.1024 258.2961)' },
        { key: 'highYield', name: 'Aksjer', color: 'oklch(0.8479 0.0603 257.7878)' },
        { key: 'nordicStocks', name: 'Alternative strategier', color: 'oklch(0.4562 0.1809 260.1560)' },
        { key: 'emergingMarkets', name: 'Annet', color: 'oklch(0.2722 0.1053 258.9631)' }
    ].filter(asset => state.newPortfolio[asset.key] > 0);
    
    if (assetClasses.length === 0) {
        // If no asset classes selected, show empty chart
        if (state.charts.allocation) {
            state.charts.allocation.destroy();
        }
        state.charts.allocation = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: commonChartOptions
        });
        return;
    }
    
    let datasets;
    let valuesWithoutRebalancingForTooltip = null; // For tooltip calculation
    
    console.log('state.allocationRebalancing is:', state.allocationRebalancing);
    
    if (state.allocationRebalancing) {
        // WITH rebalancing: Calculate values where each asset class maintains its percentage
        // The portfolio is rebalanced monthly, so each asset class keeps its allocation percentage constant
        console.log('=== CALCULATING WITH REBALANCING ===');
        
        // First, calculate total portfolio value at each point in time
        const portfolioValues = calculatePortfolioValue(filteredData, state.newPortfolio, state.startCapital);
        
        // Then, for each asset class, calculate its value as percentage of total portfolio value
        datasets = assetClasses.map(asset => {
            const allocationPercent = state.newPortfolio[asset.key];
            const values = portfolioValues.map(pv => ({
                date: pv.date,
                value: (allocationPercent / 100) * pv.value
            }));
            
            // Extract oklch values and add opacity for fill
            const colorWithOpacity = asset.color.replace(')', ' / 0.6)');
            
            return {
                label: `${asset.name} (${Math.round(allocationPercent)}%)`,
                data: values.map(v => ({ x: v.date, y: v.value })),
                borderColor: asset.color,
                backgroundColor: colorWithOpacity,
                borderWidth: 1,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 0
            };
        });
    } else {
        // WITHOUT rebalancing: Calculate values where each asset class grows independently
        console.log('=== CALCULATING WITHOUT REBALANCING ===');
        console.log('Portfolio allocation:', state.newPortfolio);
        console.log('Start capital:', state.startCapital);
        console.log('Filtered data length:', filteredData.length);
        
        const valuesWithoutRebalancing = calculateAssetClassValueWithoutRebalancing(
            filteredData,
            state.newPortfolio,
            state.startCapital
        );
        
        // Set this for tooltip calculation
        valuesWithoutRebalancingForTooltip = valuesWithoutRebalancing;
        
        console.log('Values without rebalancing calculated, length:', valuesWithoutRebalancing.length);
        if (valuesWithoutRebalancing.length > 0) {
            const first = valuesWithoutRebalancing[0];
            const last = valuesWithoutRebalancing[valuesWithoutRebalancing.length - 1];
            console.log('First value (start):', {
                stocks: first.stocks,
                riskFree: first.riskFree,
                highYield: first.highYield,
                nordicStocks: first.nordicStocks,
                emergingMarkets: first.emergingMarkets
            });
            console.log('Last value (end):', {
                stocks: last.stocks,
                riskFree: last.riskFree,
                highYield: last.highYield,
                nordicStocks: last.nordicStocks,
                emergingMarkets: last.emergingMarkets
            });
            
            // Calculate percentages
            const totalFirst = first.stocks + first.riskFree + first.highYield + first.nordicStocks + first.emergingMarkets;
            const totalLast = last.stocks + last.riskFree + last.highYield + last.nordicStocks + last.emergingMarkets;
            console.log('First percentages:', {
                stocks: (first.stocks / totalFirst * 100).toFixed(1) + '%',
                riskFree: (first.riskFree / totalFirst * 100).toFixed(1) + '%',
                highYield: (first.highYield / totalFirst * 100).toFixed(1) + '%',
                nordicStocks: (first.nordicStocks / totalFirst * 100).toFixed(1) + '%',
                emergingMarkets: (first.emergingMarkets / totalFirst * 100).toFixed(1) + '%'
            });
            console.log('Last percentages (should be different!):', {
                stocks: (last.stocks / totalLast * 100).toFixed(1) + '%',
                riskFree: (last.riskFree / totalLast * 100).toFixed(1) + '%',
                highYield: (last.highYield / totalLast * 100).toFixed(1) + '%',
                nordicStocks: (last.nordicStocks / totalLast * 100).toFixed(1) + '%',
                emergingMarkets: (last.emergingMarkets / totalLast * 100).toFixed(1) + '%'
            });
        }
        
        datasets = assetClasses.map(asset => {
            // Extract oklch values and add opacity for fill
            const colorWithOpacity = asset.color.replace(')', ' / 0.6)');
            
            // Calculate the actual percentage from the last data point (to match what tooltip shows)
            // Use the last data point with actual values (skip any with 0 values at the end)
            let lastValue = null;
            for (let i = valuesWithoutRebalancing.length - 1; i >= 0; i--) {
                const val = valuesWithoutRebalancing[i];
                const total = (val.stocks || 0) + (val.riskFree || 0) + (val.highYield || 0) + 
                             (val.nordicStocks || 0) + (val.emergingMarkets || 0);
                if (total > 0) {
                    lastValue = val;
                    break;
                }
            }
            
            // Fallback to last element if all are 0
            if (!lastValue && valuesWithoutRebalancing.length > 0) {
                lastValue = valuesWithoutRebalancing[valuesWithoutRebalancing.length - 1];
            }
            
            const totalValue = (lastValue?.stocks || 0) + (lastValue?.riskFree || 0) + (lastValue?.highYield || 0) + 
                              (lastValue?.nordicStocks || 0) + (lastValue?.emergingMarkets || 0);
            const assetValue = lastValue?.[asset.key] || 0;
            const actualPercent = totalValue > 0 
                ? (assetValue / totalValue) * 100 
                : state.newPortfolio[asset.key];
            
            console.log(`Asset ${asset.name}: Start=${state.newPortfolio[asset.key]}%, Last point=${actualPercent.toFixed(1)}%`);
            console.log(`  - lastValue[${asset.key}]:`, assetValue, 'totalValue:', totalValue);
            
            const finalLabel = `${asset.name} (${actualPercent.toFixed(1)}%)`;
            console.log(`  - Final label for ${asset.name}:`, finalLabel);
            
            return {
                label: finalLabel,
                data: valuesWithoutRebalancing.map(v => ({ 
                    x: v.date, 
                    y: v[asset.key] 
                })),
                borderColor: asset.color,
                backgroundColor: colorWithOpacity,
                borderWidth: 1,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 0
            };
        });
    }
    
    // Helper function to get asset key from name (for tooltip)
    function getAssetKeyFromName(name) {
        const nameMap = {
            'Likviditet/kontanter': 'stocks',
            'Renter': 'riskFree',
            'Aksjer': 'highYield',
            'Alternative strategier': 'nordicStocks',
            'Annet': 'emergingMarkets'
        };
        return nameMap[name] || 'stocks';
    }
    
    // valuesWithoutRebalancingForTooltip is already set in the else branch above if needed
    
    // Log datasets labels before creating chart
    console.log('Datasets labels before creating chart:');
    datasets.forEach((ds, idx) => {
        console.log(`  Dataset ${idx}: ${ds.label}`);
    });
    
    // Create new chart immediately
    state.charts.allocation = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            ...commonChartOptions,
            animation: false, // Disable animation for immediate update
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const assetName = context.dataset.label.split(' (')[0];
                            const value = context.parsed.y;
                            
                            // Calculate percentage based on rebalancing mode
                            let percentage;
                            if (state.allocationRebalancing) {
                                // WITH rebalancing: percentage stays constant
                                percentage = state.newPortfolio[getAssetKeyFromName(assetName)];
                            } else {
                                // WITHOUT rebalancing: calculate actual percentage at this point in time
                                // Get all values at this data point index
                                const dataIndex = context.dataIndex;
                                if (valuesWithoutRebalancingForTooltip && valuesWithoutRebalancingForTooltip[dataIndex]) {
                                    const pointValues = valuesWithoutRebalancingForTooltip[dataIndex];
                                    const total = pointValues.stocks + pointValues.riskFree + pointValues.highYield + 
                                                  pointValues.nordicStocks + pointValues.emergingMarkets;
                                    if (total > 0) {
                                        const assetKey = getAssetKeyFromName(assetName);
                                        percentage = (pointValues[assetKey] / total) * 100;
                                    } else {
                                        percentage = state.newPortfolio[getAssetKeyFromName(assetName)];
                                    }
                                } else {
                                    // Fallback: calculate from all datasets at this index
                                    const chart = context.chart;
                                    const allValues = chart.data.datasets.map(ds => ds.data[dataIndex]?.y || 0);
                                    const total = allValues.reduce((sum, val) => sum + val, 0);
                                    percentage = total > 0 ? (value / total) * 100 : 0;
                                }
                            }
                            
                            return `${assetName}: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`;
                        }
                    }
                }
            },
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: function(value) {
                            return (value / 1000000).toFixed(0) + ' M';
                        }
                    }
                }
            }
        }
    });
    console.log('Allocation chart created successfully with', datasets.length, 'datasets, rebalancing:', state.allocationRebalancing);
    
    // Force update of legend to show correct labels
    if (state.charts.allocation) {
        state.charts.allocation.update('none'); // Update without animation
    }
}

// Bubble chart state
let bubbleChartState = {
    animationId: null,
    animationTimeoutId: null,
    isPlaying: false,
    currentYear: 0,
    animationSpeed: 1000, // ms per year (1 second per year)
    simulationData: null,
    controlsInitialized: false
};

function createBubbleChart() {
    const canvas = document.getElementById('bubble-chart');
    if (!canvas) {
        console.warn('Bubble chart canvas not found');
        return;
    }
    
    // Clear any existing animation
    if (bubbleChartState.animationId) {
        cancelAnimationFrame(bubbleChartState.animationId);
        bubbleChartState.animationId = null;
    }
    
    // Make sure canvas is visible before getting dimensions
    canvas.style.display = 'block';
    
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    const width = parent ? parent.clientWidth : 800;
    const height = parent ? parent.clientHeight : 400;
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    console.log('Bubble chart canvas size:', width, 'x', height);
    
    // Get asset classes with allocation > 0 - use EXACT colors from CSS variables
    // Map each asset class to its CSS variable (same as asset-cell uses)
    const cssVarMap = {
        'stocks': '--chart-violet-blue',           // .asset-cell.stocks uses var(--chart-violet-blue)
        'risikofri': '--risikofri-color',          // .asset-cell.risikofri uses var(--risikofri-color) = var(--chart-4)
        'highyield': '--chart-crayola-blue',       // .asset-cell.highyield uses var(--chart-crayola-blue)
        'nordicstocks': '--chart-4',               // .asset-cell.nordicstocks uses var(--chart-4)
        'emergingmarkets': '--chart-5'             // .asset-cell.emergingmarkets uses var(--chart-5)
    };
    
    // Helper to convert CSS variable (oklch) to RGB
    const getRGBFromCSSVar = (varName) => {
        const root = document.documentElement;
        const oklchValue = getComputedStyle(root).getPropertyValue(varName).trim();
        console.log(`getRGBFromCSSVar(${varName}): oklch = ${oklchValue}`);
        
        // Create temp element with oklch color to get RGB
        const temp = document.createElement('div');
        temp.style.backgroundColor = oklchValue;
        temp.style.position = 'absolute';
        temp.style.visibility = 'hidden';
        temp.style.width = '1px';
        temp.style.height = '1px';
        document.body.appendChild(temp);
        let rgbColor = window.getComputedStyle(temp).backgroundColor;
        document.body.removeChild(temp);
        
        // If still in oklch format, try again with explicit oklch() wrapper
        if (rgbColor.includes('oklch') || !rgbColor.match(/rgba?\(/)) {
            console.warn(`getRGBFromCSSVar(${varName}): Still oklch after first attempt: ${rgbColor}`);
            const temp2 = document.createElement('div');
            // Ensure oklch format is correct
            const oklchFormatted = oklchValue.startsWith('oklch') ? oklchValue : `oklch(${oklchValue})`;
            temp2.style.backgroundColor = oklchFormatted;
            temp2.style.position = 'absolute';
            temp2.style.visibility = 'hidden';
            temp2.style.width = '1px';
            temp2.style.height = '1px';
            document.body.appendChild(temp2);
            rgbColor = window.getComputedStyle(temp2).backgroundColor;
            document.body.removeChild(temp2);
            console.log(`getRGBFromCSSVar(${varName}): second attempt rgb = ${rgbColor}`);
        }
        
        console.log(`getRGBFromCSSVar(${varName}): FINAL rgb = ${rgbColor}`);
        return rgbColor;
    };
    
    const allAssetClasses = [
        { key: 'stocks', name: 'Likviditet/kontanter', cssVar: cssVarMap['stocks'], risk: 3 },
        { key: 'riskFree', name: 'Renter', cssVar: cssVarMap['risikofri'], risk: 1 },
        { key: 'highYield', name: 'Aksjer', cssVar: cssVarMap['highyield'], risk: 2 },
        { key: 'nordicStocks', name: 'Alternative strategier', cssVar: cssVarMap['nordicstocks'], risk: 3 },
        { key: 'emergingMarkets', name: 'Annet', cssVar: cssVarMap['emergingmarkets'], risk: 4 }
    ];
    
    // Get colors from CSS variables and convert to RGB (EXACT same as input tab)
    allAssetClasses.forEach(asset => {
        asset.color = getRGBFromCSSVar(asset.cssVar);
        console.log(`Asset ${asset.name} (${asset.key}): final color = ${asset.color}`);
    });
    
    // Filter to only show asset classes that have > 0 allocation in input tab
    // If user selected 4 asset classes, show 4 bubbles with those exact classes
    const assetClasses = allAssetClasses.filter(asset => state.newPortfolio[asset.key] > 0);
    
    if (assetClasses.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'var(--foreground)';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Ingen aktivaklasser valgt', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Use EXACT same calculation as "uten rebalansering" tab
    const filteredData = getFilteredData();
    if (!filteredData || filteredData.length < 2) {
        console.warn('Insufficient data for bubble chart');
        return;
    }
    
    // DEBUG: Log portfolio allocation before calculation
    console.log('=== BUBBLE CHART DEBUG ===');
    console.log('Portfolio allocation from state.newPortfolio:');
    assetClasses.forEach(asset => {
        console.log(`  ${asset.name} (${asset.key}): ${state.newPortfolio[asset.key]}%`);
    });
    console.log('Start capital:', state.startCapital);
    
    // Calculate values without rebalancing - EXACT same as allocation chart
    const valuesWithoutRebalancing = calculateAssetClassValueWithoutRebalancing(
        filteredData,
        state.newPortfolio, // Use % from input tab
        state.startCapital
    );
    
    // DEBUG: Log first and last data points to verify values
    if (valuesWithoutRebalancing.length > 0) {
        console.log('First data point (year 2001):');
        assetClasses.forEach(asset => {
            const value = valuesWithoutRebalancing[0][asset.key] || 0;
            console.log(`  ${asset.name} (${asset.key}): ${value.toFixed(2)} MNOK`);
        });
        const lastIndex = valuesWithoutRebalancing.length - 1;
        console.log(`Last data point (year ${filteredData[lastIndex].date.getFullYear()}):`);
        assetClasses.forEach(asset => {
            const value = valuesWithoutRebalancing[lastIndex][asset.key] || 0;
            console.log(`  ${asset.name} (${asset.key}): ${value.toFixed(2)} MNOK`);
        });
    }
    
    // Get start year from data (should be 2001)
    const startYear = filteredData[0].date.getFullYear();
    const endYear = filteredData[filteredData.length - 1].date.getFullYear();
    const totalYears = endYear - startYear;
    
    // Create simulation data YEAR BY YEAR (not month by month)
    // Group data points by year and use the LAST data point of each year
    const simulationData = [];
    const yearMap = new Map();
    
    // Group all data points by year
    valuesWithoutRebalancing.forEach((dataPoint, index) => {
        const year = filteredData[index].date.getFullYear();
        
        // Store the last data point for each year (overwrites previous months)
        yearMap.set(year, { dataPoint, index });
    });
    
    // Create simulation data for each unique year
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);
    sortedYears.forEach(year => {
        const { dataPoint, index } = yearMap.get(year);
        const yearData = { year, assets: [], yearIndex: index };
        
        // CRITICAL: Calculate totalValue from ALL asset classes (same as "uten rebalansering" graph)
        // This ensures percentages match exactly with the "uten rebalansering" graph
        const totalValue = (dataPoint.stocks || 0) + (dataPoint.riskFree || 0) + (dataPoint.highYield || 0) + 
                          (dataPoint.nordicStocks || 0) + (dataPoint.emergingMarkets || 0);
        
        assetClasses.forEach(asset => {
            // CRITICAL: Check if the key exists in dataPoint
            let currentValue = 0;
            if (dataPoint.hasOwnProperty(asset.key)) {
                currentValue = dataPoint[asset.key] || 0;
            } else {
                console.error(`ERROR: Key '${asset.key}' not found in dataPoint. Available keys:`, Object.keys(dataPoint));
                // Try to find the value anyway
                currentValue = dataPoint[asset.key] || 0;
            }
            
            // DEBUG: Log if value is 0 or missing
            if (currentValue === 0 || !dataPoint[asset.key]) {
                console.warn(`WARNING: ${asset.name} (${asset.key}) has value 0 or missing in year ${year}. Portfolio allocation: ${state.newPortfolio[asset.key]}%`);
                console.warn(`  dataPoint keys:`, Object.keys(dataPoint));
                console.warn(`  dataPoint[${asset.key}]:`, dataPoint[asset.key]);
            }
            
            // Preserve the color from asset class
            yearData.assets.push({
                ...asset,
                value: currentValue,
                color: asset.color // Ensure color is preserved
            });
        });
        
        // Calculate percentages from actual values (same as "uten rebalansering")
        // Use totalValue from ALL asset classes to match "uten rebalansering" graph exactly
        yearData.assets.forEach(asset => {
            asset.percentage = totalValue > 0 ? (asset.value / totalValue) * 100 : state.newPortfolio[asset.key];
        });
        
        yearData.totalValue = totalValue;
        simulationData.push(yearData);
    });
    
    bubbleChartState.simulationData = simulationData;
    bubbleChartState.currentYear = 0; // Index 0 = first year (2001)
    
    // Find max value for scaling
    const maxValue = Math.max(...simulationData.map(d => d.totalValue));
    
    // Setup controls with correct year range
    setupBubbleChartControls(canvas, ctx, assetClasses, maxValue, startYear);
    
    // Draw initial state (year 2001)
    drawBubbleChart(canvas, ctx, simulationData[0], assetClasses, maxValue);
}

// Helper function to convert CSS color (rgb/rgba/oklch) to canvas rgba format
function cssColorToCanvasColor(cssColor) {
    console.log(`cssColorToCanvasColor input: ${cssColor}`);
    
    // If it's already in rgb/rgba format, use it directly
    const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
        const result = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 1.0)`;
        console.log(`cssColorToCanvasColor output (rgb): ${result}`);
        return result;
    }
    
    // If it's in oklch format, convert it using a canvas (browsers support oklch in canvas)
    if (cssColor.includes('oklch')) {
        // Create a temporary canvas to convert oklch to RGB
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1;
        tempCanvas.height = 1;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set fill style to oklch color - canvas supports oklch!
        tempCtx.fillStyle = cssColor;
        tempCtx.fillRect(0, 0, 1, 1);
        
        // Get the pixel data to extract RGB values
        const imageData = tempCtx.getImageData(0, 0, 1, 1);
        const r = imageData.data[0];
        const g = imageData.data[1];
        const b = imageData.data[2];
        
        const result = `rgba(${r}, ${g}, ${b}, 1.0)`;
        console.log(`cssColorToCanvasColor output (oklch->rgb via canvas): ${result}`);
        return result;
    }
    
    console.warn(`cssColorToCanvasColor: Could not parse color ${cssColor}, using fallback`);
    return 'rgba(100, 150, 200, 1.0)'; // Fallback
}

function drawBubbleChart(canvas, ctx, yearData, assetClasses, maxValue) {
    // Clear canvas - use actual canvas dimensions (not scaled)
    const actualWidth = canvas.width / (window.devicePixelRatio || 1);
    const actualHeight = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, actualWidth, actualHeight);
    
    // Fill background with same color as chart-wrapper (--secondary)
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || 'oklch(0.9510 0.0063 255.4756)';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, actualWidth, actualHeight);
    
    // Draw grid lines similar to Chart.js (horizontal lines only, matching y-axis grid)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    
    // Draw horizontal grid lines (similar to Chart.js y-axis grid)
    // Space them evenly - approximately every 50-80px for visual consistency
    const gridLineSpacing = 60; // Approximate spacing
    const startY = 60; // Start below title
    const endY = actualHeight - 40; // Leave some space at bottom
    
    ctx.beginPath();
    for (let y = startY; y <= endY; y += gridLineSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(actualWidth, y);
    }
    ctx.stroke();
    
    const padding = 60;
    const chartWidth = actualWidth - 2 * padding;
    const chartHeight = actualHeight - 2 * padding;
    
    console.log('Drawing bubble chart - year:', yearData.year, 'assets:', yearData.assets.length, 'maxValue:', maxValue);
    
    // Draw year label - show actual year (2001, 2002, etc.)
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--foreground') || '#000';
    ctx.font = 'bold 18px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(yearData.year.toString(), actualWidth / 2, 30);
    
    // Sort assets by VALUE (MNOK) - largest first
    const sortedAssets = [...yearData.assets].sort((a, b) => b.value - a.value);
    
    // DEBUG: Log sorted assets to verify order
    console.log(`=== SORTED ASSETS FOR YEAR ${yearData.year} ===`);
    sortedAssets.forEach((asset, index) => {
        console.log(`${index + 1}. ${asset.name} (${asset.key}): ${asset.value.toFixed(2)} MNOK (${asset.percentage.toFixed(1)}%)`);
    });
    
    // Calculate bubble sizes based on VALUE (MNOK)
    // Requirements:
    // - Minimum size corresponds to 3 MNOK
    // - 10 MNOK should be ~25% larger than 9 MNOK (larger differences for larger values)
    // - Use power scaling to amplify differences
    const MINIMUM_BUBBLE_VALUE = 3000000; // 3 MNOK - minimum size
    
    // Find max value
    const maxAssetValue = Math.max(...sortedAssets.map(a => a.value));
    
    // Calculate max radius - use more of the available space
    // Leave minimal space for controls at top
    const availableHeight = actualHeight - 60; // Minimal space for title
    const maxBubbleDiameter = Math.min(
        (actualWidth - 60) / 2,  // Use more width (only 30px padding each side)
        availableHeight / 2      // Use more height
    );
    const minRadius = 70; // Increased minimum radius for 3 MNOK
    const maxRadius = Math.max(minRadius, maxBubbleDiameter);
    
    // Use quadratic scaling (squared) to amplify differences for larger values
    // This creates larger differences between larger values (like 9 vs 10 MNOK)
    const bubbles = sortedAssets.map(asset => {
        // Clamp value to minimum of 3 MNOK for size calculation
        const clampedValue = Math.max(asset.value, MINIMUM_BUBBLE_VALUE);
        
        // Normalize value: map [3 MNOK, max] to [0, 1]
        const valueRange = maxAssetValue - MINIMUM_BUBBLE_VALUE;
        const normalizedValue = valueRange > 0 
            ? (clampedValue - MINIMUM_BUBBLE_VALUE) / valueRange 
            : 0.5;
        
        // Apply quadratic scaling (squared) to amplify differences for larger values
        // Squaring makes larger values have proportionally larger sizes
        const squaredValue = normalizedValue * normalizedValue;
        
        // Calculate radius: min + squared * (max - min)
        // This gives larger differences for larger values
        const radius = minRadius + squaredValue * (maxRadius - minRadius);
        
        console.log(`Bubble ${asset.name}: value=${(asset.value/1000000).toFixed(2)} MNOK, normalized=${normalizedValue.toFixed(3)}, squared=${squaredValue.toFixed(3)}, radius=${radius.toFixed(1)}`);
        return { ...asset, radius: Math.max(minRadius, radius) };
    });
    
    // Center point for all bubbles
    const centerX = actualWidth / 2;
    const centerY = actualHeight / 2;
    
    // Arrange bubbles side by side horizontally, centered
    // Allow bubbles to overlap slightly (negative spacing) for better size comparison
    // Calculate total width needed
    let totalWidth = 0;
    bubbles.forEach(bubble => {
        totalWidth += bubble.radius * 2;
    });
    // Use negative spacing to allow overlap (but still readable)
    const spacing = -10; // Negative spacing allows overlap
    totalWidth += spacing * (bubbles.length - 1);
    
    // Scale down if bubbles don't fit (but ensure minimum size for 3 MNOK is maintained)
    const maxWidth = actualWidth - 80; // Leave 40px padding on each side
    if (totalWidth > maxWidth && totalWidth > 0) {
        const scale = maxWidth / totalWidth;
        bubbles.forEach(bubble => {
            bubble.radius = Math.max(minRadius, bubble.radius * scale); // Never go below minimum
        });
        totalWidth = maxWidth;
    }
    
    // Ensure all bubbles have valid radius
    bubbles.forEach(bubble => {
        if (bubble.radius <= 0 || isNaN(bubble.radius)) {
            bubble.radius = minRadius; // Fallback to minimum radius
        }
    });
    
    // Start position to center all bubbles
    let currentX = centerX - totalWidth / 2;
    
    // Position bubbles horizontally, centered vertically
    bubbles.forEach((bubble, index) => {
        const x = currentX + bubble.radius;
        const y = centerY;
        
        // Move position for next bubble
        currentX += bubble.radius * 2 + spacing;
        
        bubble.x = x;
        bubble.y = y;
        
        console.log(`Drawing bubble: ${bubble.name}, color: ${bubble.color}, value: ${bubble.value}, radius: ${bubble.radius}`);
        
        // Convert CSS color to rgba for canvas - colors already match input tab exactly
        const fillColor = cssColorToCanvasColor(bubble.color);
        console.log(`  -> fillColor: ${fillColor}`);
        
        // VERIFY: Log each bubble's unique color to prove they're different
        console.log(`✓ BUBBLE COLOR VERIFICATION: ${bubble.name} = ${fillColor}`);
        
        // Draw bubble with solid color (no gradient) to match input tab exactly
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor; // Full opacity to match input tab
        ctx.fill();
        
        // Draw stroke with same color but slightly darker
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw text - use EXACT same fonts as input tab
        // Input tab uses: --font-mono (JetBrains Mono) for values, --font-sans (Inter) for labels
        // Use white text with dark outline for maximum readability
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        
        // Draw asset name at top - use Inter (sans-serif) like input tab labels
        // Smaller text size for readability
        const nameFontSize = Math.max(12, Math.min(18, bubble.radius * 0.12));
        ctx.font = `600 ${nameFontSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 2;
        
        const nameY = bubble.y - bubble.radius * 0.25;
        ctx.strokeText(bubble.name, bubble.x, nameY);
        ctx.fillText(bubble.name, bubble.x, nameY);
        
        // Draw percentage in center - WITH % sign
        // Smaller text size for readability
        const percentFontSize = Math.max(14, Math.min(24, bubble.radius * 0.15));
        ctx.font = `700 ${percentFontSize}px 'JetBrains Mono', monospace`; // Use mono like input tab values
        ctx.lineWidth = 2;
        const percentText = bubble.percentage.toFixed(1) + '%';
        ctx.strokeText(percentText, bubble.x, bubble.y);
        ctx.fillText(percentText, bubble.x, bubble.y);
        
        // Draw value below - use JetBrains Mono like input tab
        // Smaller text size for readability
        const valueFontSize = Math.max(10, Math.min(16, bubble.radius * 0.10));
        ctx.font = `700 ${valueFontSize}px 'JetBrains Mono', monospace`;
        ctx.lineWidth = 2;
        const valueY = bubble.y + bubble.radius * 0.30;
        ctx.strokeText(formatCurrency(bubble.value), bubble.x, valueY);
        ctx.fillText(formatCurrency(bubble.value), bubble.x, valueY);
    });
}

function setupBubbleChartControls(canvas, ctx, assetClasses, maxValue, startYear) {
    const playPauseBtn = document.getElementById('bubble-play-pause');
    const resetBtn = document.getElementById('bubble-reset');
    const yearSlider = document.getElementById('bubble-year-slider');
    const yearDisplay = document.getElementById('bubble-year-display');
    
    if (!playPauseBtn || !resetBtn || !yearSlider || !yearDisplay) return;
    
    // Update slider - min is startYear (2001), max is end year
    yearSlider.min = 0;
    yearSlider.max = bubbleChartState.simulationData.length - 1;
    yearSlider.value = 0;
    
    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        bubbleChartState.isPlaying = !bubbleChartState.isPlaying;
        playPauseBtn.textContent = bubbleChartState.isPlaying ? '⏸ Pause' : '▶ Play';
        
        if (bubbleChartState.isPlaying) {
            animateBubbleChart(canvas, ctx, assetClasses, maxValue);
        } else {
            if (bubbleChartState.animationTimeoutId) {
                clearTimeout(bubbleChartState.animationTimeoutId);
                bubbleChartState.animationTimeoutId = null;
            }
            if (bubbleChartState.animationId) {
                cancelAnimationFrame(bubbleChartState.animationId);
                bubbleChartState.animationId = null;
            }
        }
    });
    
    // Reset button
    resetBtn.addEventListener('click', () => {
        bubbleChartState.isPlaying = false;
        bubbleChartState.currentYear = 0;
        playPauseBtn.textContent = '▶ Play';
        yearSlider.value = 0;
        const currentYearData = bubbleChartState.simulationData[0];
        yearDisplay.textContent = currentYearData ? currentYearData.year.toString() : startYear.toString();
        
        if (bubbleChartState.animationTimeoutId) {
            clearTimeout(bubbleChartState.animationTimeoutId);
            bubbleChartState.animationTimeoutId = null;
        }
        if (bubbleChartState.animationId) {
            cancelAnimationFrame(bubbleChartState.animationId);
            bubbleChartState.animationId = null;
        }
        
        drawBubbleChart(canvas, ctx, bubbleChartState.simulationData[0], assetClasses, maxValue);
    });
    
    // Year slider
    yearSlider.addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        bubbleChartState.currentYear = index;
        const currentYearData = bubbleChartState.simulationData[index];
        yearDisplay.textContent = currentYearData ? currentYearData.year.toString() : (startYear + index).toString();
        
        if (bubbleChartState.simulationData && bubbleChartState.simulationData[index]) {
            drawBubbleChart(canvas, ctx, bubbleChartState.simulationData[index], assetClasses, maxValue);
        }
    });
    
    // Update display - show actual year (2001, 2002, etc.)
    const currentYearData = bubbleChartState.simulationData[bubbleChartState.currentYear];
    yearDisplay.textContent = currentYearData ? currentYearData.year.toString() : startYear.toString();
    
    bubbleChartState.controlsInitialized = true;
}

function animateBubbleChart(canvas, ctx, assetClasses, maxValue) {
    if (!bubbleChartState.isPlaying) return;
    
    // Clear any existing timeout
    if (bubbleChartState.animationTimeoutId) {
        clearTimeout(bubbleChartState.animationTimeoutId);
        bubbleChartState.animationTimeoutId = null;
    }
    
    // Move to next year (year by year, not month by month)
    const nextYearIndex = bubbleChartState.currentYear + 1;
    
    if (nextYearIndex < bubbleChartState.simulationData.length) {
        bubbleChartState.currentYear = nextYearIndex;
        const yearData = bubbleChartState.simulationData[nextYearIndex];
        
        // Update slider and display
        const slider = document.getElementById('bubble-year-slider');
        const display = document.getElementById('bubble-year-display');
        if (slider) slider.value = nextYearIndex;
        if (display && yearData) display.textContent = yearData.year.toString();
        
        // Draw the year
        drawBubbleChart(canvas, ctx, yearData, assetClasses, maxValue);
        
        // Continue to next year after 1 second - save timeout ID so it can be cancelled
        bubbleChartState.animationTimeoutId = setTimeout(() => {
            bubbleChartState.animationTimeoutId = null;
            animateBubbleChart(canvas, ctx, assetClasses, maxValue);
        }, bubbleChartState.animationSpeed);
    } else {
        // Animation complete - loop back to start
        bubbleChartState.currentYear = 0;
        const yearData = bubbleChartState.simulationData[0];
        
        // Update slider and display
        const slider = document.getElementById('bubble-year-slider');
        const display = document.getElementById('bubble-year-display');
        if (slider) slider.value = 0;
        if (display && yearData) display.textContent = yearData.year.toString();
        
        // Draw the first year
        drawBubbleChart(canvas, ctx, yearData, assetClasses, maxValue);
        
        // Continue animation (loop)
        bubbleChartState.animationTimeoutId = setTimeout(() => {
            bubbleChartState.animationTimeoutId = null;
            animateBubbleChart(canvas, ctx, assetClasses, maxValue);
        }, bubbleChartState.animationSpeed);
    }
}

function createComparisonChart() {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    const filteredData = getFilteredData();
    
    const currentValues = calculatePortfolioValue(filteredData, state.currentPortfolio, state.startCapital);
    const newValues = calculatePortfolioValue(filteredData, state.newPortfolio, state.startCapital);
    
    // Calculate High Water Mark for both portfolios
    const currentHWM = calculateHighWaterMark(currentValues);
    const newHWM = calculateHighWaterMark(newValues);
    
    // Find minimum portfolio value from both datasets (use actualValue, not HWM value)
    const allActualValues = [
        ...currentValues.map(v => v.value),
        ...newValues.map(v => v.value)
    ];
    const minValue = Math.min(...allActualValues);
    const yMin = minValue - 1000000; // Subtract 1 MNOK (1000000 NOK)
    
    if (state.charts.comparison) {
        state.charts.comparison.destroy();
    }
    
    state.charts.comparison = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Dagens HWM',
                    data: currentHWM.map(v => ({ x: v.date, y: v.value })),
                    borderColor: chartColors.current.main,
                    backgroundColor: 'oklch(0.9489 0.0188 255.5341 / 0.3)',
                    borderWidth: 3,
                    fill: true,
                    stepped: 'before', // Creates the staircase effect
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Ny HWM',
                    data: newHWM.map(v => ({ x: v.date, y: v.value })),
                    borderColor: chartColors.new.main,
                    backgroundColor: 'oklch(0.9489 0.0188 255.5341 / 0.3)',
                    borderWidth: 3,
                    fill: true,
                    stepped: 'before', // Creates the staircase effect
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                legend: {
                    ...commonChartOptions.plugins.legend,
                    labels: {
                        ...commonChartOptions.plugins.legend.labels,
                        generateLabels: function(chart) {
                            return [
                                {
                                    text: 'Dagens Portefølje (HWM)',
                                    fillStyle: 'oklch(0.9489 0.0188 255.5341 / 0.3)',
                                    strokeStyle: chartColors.current.main,
                                    lineWidth: 3,
                                    hidden: false
                                },
                                {
                                    text: 'Ny Portefølje (HWM)',
                                    fillStyle: 'oklch(0.9489 0.0188 255.5341 / 0.3)',
                                    strokeStyle: chartColors.new.main,
                                    lineWidth: 3,
                                    hidden: false
                                }
                            ];
                        }
                    }
                },
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const datasetIndex = context.datasetIndex;
                            const hwmData = datasetIndex === 0 ? currentHWM : newHWM;
                            const point = hwmData[context.dataIndex];
                            const label = datasetIndex === 0 ? 'Dagens' : 'Ny';
                            return [
                                label + ' HWM: ' + formatCurrency(point.value),
                                label + ' Faktisk: ' + formatCurrency(point.actualValue)
                            ];
                        }
                    }
                }
            },
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    min: yMin,
                    beginAtZero: false,
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: function(value) {
                            return (value / 1000000).toFixed(0) + ' M';
                        }
                    }
                }
            }
        }
    });
    
    // Update HWM specific metrics
    updateHWMMetrics(currentValues, newValues, currentHWM, newHWM);
    
    // Update high water mark table (show for current portfolio)
    updateHighWaterMarkTable(currentValues);
    
    // Update ATH KPI cards (using current portfolio for display)
    updateHWMATHKPIs(currentValues);
}

// Update ATH KPI cards for High Water Mark tab
function updateHWMATHKPIs(portfolioValues) {
    // Use current portfolio for all calculations
    const portfolio = state.currentPortfolio;
    
    // Count ATH changes for each period (using raw data, not filtered portfolioValues)
    const ath3y = countATHChanges(state.data, portfolio, 3);
    const ath5y = countATHChanges(state.data, portfolio, 5);
    const ath10y = countATHChanges(state.data, portfolio, 10);
    const athMax = countATHChanges(state.data, portfolio, null);
    
    // Update KPI elements
    const kpi3y = document.getElementById('hwm-kpi-3y');
    const kpi5y = document.getElementById('hwm-kpi-5y');
    const kpi10y = document.getElementById('hwm-kpi-10y');
    const kpiMax = document.getElementById('hwm-kpi-max');
    
    if (kpi3y) kpi3y.textContent = ath3y;
    if (kpi5y) kpi5y.textContent = ath5y;
    if (kpi10y) kpi10y.textContent = ath10y;
    if (kpiMax) kpiMax.textContent = athMax;
}

function updateHWMMetrics(currentValues, newValues, currentHWM, newHWM) {
    const currentEndValue = currentHWM[currentHWM.length - 1].value;
    const newEndValue = newHWM[newHWM.length - 1].value;
    
    const currentReturn = ((currentEndValue - state.startCapital) / state.startCapital) * 100;
    const newReturn = ((newEndValue - state.startCapital) / state.startCapital) * 100;
    
    // Calculate time spent at HWM (periods where actual = HWM)
    const currentAtPeak = currentHWM.filter(v => v.isAtPeak).length;
    const newAtPeak = newHWM.filter(v => v.isAtPeak).length;
    const currentPeakPercent = (currentAtPeak / currentHWM.length) * 100;
    const newPeakPercent = (newAtPeak / newHWM.length) * 100;
    
    // Update metrics in comparison tab
    const currentReturnEl = document.getElementById('current-return');
    const currentEndvalueEl = document.getElementById('current-endvalue');
    const currentVolatilityEl = document.getElementById('current-volatility');
    
    if (currentReturnEl) currentReturnEl.textContent = formatPercent(currentReturn);
    if (currentEndvalueEl) currentEndvalueEl.textContent = formatCurrency(currentEndValue);
    if (currentVolatilityEl) currentVolatilityEl.textContent = currentPeakPercent.toFixed(0) + '% ved ATH';
    
    const newReturnEl = document.getElementById('new-return');
    const newEndvalueEl = document.getElementById('new-endvalue');
    const newVolatilityEl = document.getElementById('new-volatility');
    
    if (newReturnEl) newReturnEl.textContent = formatPercent(newReturn);
    if (newEndvalueEl) newEndvalueEl.textContent = formatCurrency(newEndValue);
    if (newVolatilityEl) newVolatilityEl.textContent = newPeakPercent.toFixed(0) + '% ved ATH';
    
    // Update difference
    // Avkastningsforskjell: (sluttverdi ny / sluttverdi dagens) - 1
    const diffReturn = currentEndValue > 0 ? ((newEndValue / currentEndValue) - 1) * 100 : 0;
    const diffValue = newEndValue - currentEndValue;
    const diffPeak = newPeakPercent - currentPeakPercent;
    
    const diffReturnEl = document.getElementById('diff-return');
    const diffValueEl = document.getElementById('diff-endvalue');
    const diffVolEl = document.getElementById('diff-volatility');
    
    if (diffReturnEl) {
        diffReturnEl.textContent = formatPercent(diffReturn);
        diffReturnEl.className = `metric-value ${diffReturn < 0 ? 'negative' : ''}`;
    }
    
    if (diffValueEl) {
        diffValueEl.textContent = formatCurrency(diffValue);
        diffValueEl.className = `metric-value ${diffValue < 0 ? 'negative' : ''}`;
    }
    
    if (diffVolEl) {
        diffVolEl.textContent = formatPercent(diffPeak);
        diffVolEl.className = `metric-value ${diffPeak < 0 ? 'negative' : ''}`;
    }
}

function createDrawdownCharts() {
    const filteredData = getFilteredData();
    
    const portfolio = state.selectedDrawdownPortfolio === 'current' 
        ? state.currentPortfolio 
        : state.newPortfolio;
    
    const portfolioValues = calculatePortfolioValue(filteredData, portfolio, state.startCapital);
    
    // Calculate drawdown based on view type
    const drawdowns = state.selectedDrawdownView === 'kr' 
        ? calculateDrawdownInKr(portfolioValues)
        : calculateDrawdown(portfolioValues);
    
    // Calculate KPIs (always use percentage for KPIs, but also need kr for first KPI)
    const drawdownsPercent = calculateDrawdown(portfolioValues);
    const drawdownsKr = calculateDrawdownInKr(portfolioValues);
    updateDrawdownKPIs(portfolioValues, drawdownsPercent, drawdownsKr);
    
    // Create drawdown chart with appropriate view type
    createUnderwaterChart(drawdowns, state.selectedDrawdownView);
    
    // Update recovery table (always use percentage)
    updateRecoveryTable(drawdownsPercent);
}

function updateDrawdownKPIs(portfolioValues, drawdowns, drawdownsKr) {
    // Count number of times loss exceeded 500 000 kr
    let lossOver500kCount = 0;
    let wasBelow500k = false;
    
    for (let i = 0; i < drawdownsKr.length; i++) {
        const lossKr = drawdownsKr[i].drawdown; // This is negative (loss in kr)
        if (lossKr < -500000 && !wasBelow500k) {
            // Entering a period with loss greater than 500 000 kr
            wasBelow500k = true;
            lossOver500kCount++;
        } else if (lossKr >= -500000) {
            // Recovered above -500 000 kr
            wasBelow500k = false;
        }
    }
    
    document.getElementById('kpi-loss-over-500k').textContent = lossOver500kCount + ' ganger';
    
    // Max Drawdown
    const maxDD = Math.min(...drawdowns.map(d => d.drawdown));
    document.getElementById('kpi-max-dd').textContent = maxDD.toFixed(1) + '%';
    
    // Count number of times drawdown exceeded -5%
    let fallOver5Count = 0;
    let wasBelow5Percent = false;
    
    for (let i = 0; i < drawdowns.length; i++) {
        const dd = drawdowns[i].drawdown;
        if (dd < -5 && !wasBelow5Percent) {
            // Entering a period below -5%
            wasBelow5Percent = true;
            fallOver5Count++;
        } else if (dd >= -5) {
            // Recovered above -5%
            wasBelow5Percent = false;
        }
    }
    
    document.getElementById('kpi-fall-over-5').textContent = fallOver5Count + ' ganger';
    
    // Longest Recovery Period
    const largestDrawdowns = findLargestDrawdowns(drawdowns, 10);
    let longestRecovery = 0;
    largestDrawdowns.forEach(dd => {
        if (dd.recoveryDays !== null && dd.recoveryDays > longestRecovery) {
            longestRecovery = dd.recoveryDays;
        }
    });
    document.getElementById('kpi-longest-recovery').textContent = 
        longestRecovery > 0 ? longestRecovery + ' dager' : 'Pågående';
}

function createEquityChart(portfolioValues, drawdowns) {
    const ctx = document.getElementById('equity-chart').getContext('2d');
    
    if (state.charts.equity) {
        state.charts.equity.destroy();
    }
    
    // Find ATH points for highlighting
    const athPoints = [];
    let currentATH = 0;
    drawdowns.forEach((d, i) => {
        if (d.peak > currentATH) {
            currentATH = d.peak;
            athPoints.push({ x: d.date, y: d.peak, isATH: true });
        }
    });
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                bottom: 20
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'oklch(0.2722 0.1053 258.9631 / 0.95)',
                titleFont: { family: "'Inter', sans-serif", size: 11 },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
                padding: 8,
                cornerRadius: 4,
                callbacks: {
                    label: function(context) {
                        if (context.datasetIndex === 0) {
                            return 'Verdi: ' + formatCurrency(context.parsed.y);
                        } else {
                            return 'ATH: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: { unit: 'year', displayFormats: { year: 'yyyy' } },
                grid: { display: false },
                ticks: { font: { family: "'Inter', sans-serif", size: 10 } },
                min: state.drawdownZoom.isZoomed ? state.drawdownZoom.minX : undefined,
                max: state.drawdownZoom.isZoomed ? state.drawdownZoom.maxX : undefined
            },
            y: {
                grid: { color: 'oklch(0.2722 0.1053 258.9631 / 0.05)' },
                ticks: {
                    font: { family: "'JetBrains Mono', monospace", size: 10 },
                    callback: function(value) {
                        return (value / 1000000).toFixed(0) + 'M';
                    }
                }
            }
        }
    };
    
    state.charts.equity = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Porteføljeverdi',
                    data: portfolioValues.map(v => ({ x: v.date, y: v.value })),
                    borderColor: 'oklch(0.6020 0.1679 258.6201)',
                    backgroundColor: 'oklch(0.9489 0.0188 255.5341 / 0.3)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'All-Time High',
                    data: drawdowns.map(d => ({ x: d.date, y: d.peak })),
                    borderColor: 'oklch(0.6020 0.1679 258.6201)',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: chartOptions
    });
    
    // Setup zoom interaction
    setupZoomInteraction(ctx.canvas, 'equity');
}

function createUnderwaterChart(drawdowns, viewType = 'percent') {
    const canvas = document.getElementById('drawdown-chart');
    const ctx = canvas.getContext('2d');
    
    if (state.charts.drawdown) {
        state.charts.drawdown.destroy();
    }
    
    // Y-axis configuration
    let yMin, yMax;
    if (viewType === 'kr') {
        // For kr view: Y-axis should go down to largest fall in MNOK + 0.5 MNOK (dynamic)
        const drawdownValues = drawdowns.map(d => d.drawdown);
        const minDrawdown = Math.min(...drawdownValues);
        // minDrawdown is already negative (loss in kr), so we add 0.5 MNOK (500000) to it
        yMin = minDrawdown - 500000; // Subtract 0.5 MNOK (500000 kr)
        yMax = 0;
    } else {
        // For percent view: Static from 0% to -80%
        yMin = -80; // -80%
        yMax = 0; // 0% at the top
    }
    
    // Define colors based on view type
    const mainColor = viewType === 'kr' ? '#2563eb' : '#f43f5e'; // Blue for kr view, red for percent
    const mainColorRgb = viewType === 'kr' ? '37, 99, 235' : '244, 63, 94'; // RGB values
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                bottom: 20
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        onHover: (event, activeElements) => {
            canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
        },
        plugins: {
            legend: {
                display: false
            },
                tooltip: {
                enabled: true,
                backgroundColor: 'rgba(20, 20, 30, 0.95)', // Standard dark tooltip background
                titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 13 },
                padding: 12,
                cornerRadius: 8,
                borderColor: mainColor,
                borderWidth: 2,
                callbacks: {
                    label: function(context) {
                        const chartViewType = context.chart.options.viewType || 'percent';
                        if (chartViewType === 'kr') {
                            const value = Math.abs(context.parsed.y);
                            return 'Tap: ' + formatCurrency(value);
                        } else {
                            return 'Drawdown: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: { unit: 'year', displayFormats: { year: 'yyyy' } },
                grid: { display: false },
                position: 'bottom',
                ticks: { 
                    font: { family: "'DM Sans', sans-serif", size: 11 },
                    padding: 8
                },
                min: state.drawdownZoom.isZoomed ? state.drawdownZoom.minX : undefined,
                max: state.drawdownZoom.isZoomed ? state.drawdownZoom.maxX : undefined
            },
            y: {
                min: yMin,
                max: yMax,
                beginAtZero: false,
                reverse: false, // 0% at top, negative values going down
                grid: { 
                    color: 'rgba(0, 0, 0, 0.05)' // Same as other charts
                },
                ticks: {
                    font: { family: "'JetBrains Mono', monospace", size: 11 },
                    color: mainColor, // Red color for Y-axis labels (matching the graph)
                    callback: function(value, index, ticks) {
                        const chartViewType = this.chart.options.viewType || 'percent';
                        if (chartViewType === 'kr') {
                            // Format as currency (MNOK) - show absolute value since it's a loss
                            const absValue = Math.abs(value);
                            if (absValue >= 1000000) {
                                return (absValue / 1000000).toFixed(1) + ' MNOK';
                            } else if (absValue >= 1000) {
                                return (absValue / 1000).toFixed(0) + ' KNOK';
                            } else {
                                return absValue.toFixed(0) + ' kr';
                            }
                        } else {
                            // Format to 1 decimal place for cleaner display
                            return value.toFixed(1) + '%';
                        }
                    },
                    stepSize: viewType === 'kr' ? undefined : 5
                }
            }
        },
        elements: {
            line: {
                borderWidth: 3,
                tension: 0.3
            },
            point: {
                radius: 0,
                hoverRadius: 8,
                hoverBorderWidth: 3,
                hoverBorderColor: mainColor,
                hoverBackgroundColor: '#ffffff'
            }
        }
    };
    
    // Custom plugin for gradient fill, glow effect, and reference lines
    const drawdownPlugin = {
        id: 'drawdownGradient',
        beforeDatasetsDraw: (chart) => {
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;
            const yScale = chart.scales.y;
            
            if (!chartArea || !yScale) return;
            
            // Draw reference lines (only for percent view)
            // Access viewType from chart options
            const chartViewType = chart.options.viewType || 'percent';
            const chartMainColorRgb = chartViewType === 'kr' ? '37, 99, 235' : '244, 63, 94';
            if (chartViewType === 'percent') {
                ctx.save();
                ctx.strokeStyle = `rgba(${chartMainColorRgb}, 0.3)`; // Low opacity main color
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]); // Dotted style
                
                // Draw -10% line
                const y10 = yScale.getPixelForValue(-10);
                if (y10 >= chartArea.top && y10 <= chartArea.bottom) {
                    ctx.beginPath();
                    ctx.moveTo(chartArea.left, y10);
                    ctx.lineTo(chartArea.right, y10);
                    ctx.stroke();
                }
                
                // Draw -20% line
                const y20 = yScale.getPixelForValue(-20);
                if (y20 >= chartArea.top && y20 <= chartArea.bottom) {
                    ctx.beginPath();
                    ctx.moveTo(chartArea.left, y20);
                    ctx.lineTo(chartArea.right, y20);
                    ctx.stroke();
                }
                
                ctx.setLineDash([]);
                ctx.restore();
            }
            
            const meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data || meta.data.length === 0) return;
            
            const points = meta.data;
            
            // Draw gradient fill ABOVE the line (from line up to 0% at top)
            // Fill the area from the line upward to chartArea.top (which is at 0%)
            ctx.save();
            ctx.beginPath();
            
            // Start at top-left corner (0% line)
            ctx.moveTo(chartArea.left, chartArea.top);
            
            // Draw along top edge to first point
            ctx.lineTo(points[0].x, chartArea.top);
            
            // Draw smooth curve following the line (the actual drawdown line, going left to right)
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                if (point && point.x !== undefined && point.y !== undefined) {
                    if (i === 0) {
                        ctx.lineTo(point.x, point.y);
                    } else {
                        // Use quadratic curve for smoothness
                        const prevPoint = points[i - 1];
                        if (prevPoint && prevPoint.x !== undefined && prevPoint.y !== undefined) {
                            const cpx = (prevPoint.x + point.x) / 2;
                            ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, (prevPoint.y + point.y) / 2);
                            ctx.quadraticCurveTo(point.x, point.y, point.x, point.y);
                        }
                    }
                }
            }
            
            // Draw from last point back up to top edge, then close
            ctx.lineTo(points[points.length - 1].x, chartArea.top);
            ctx.closePath();
            
            // Create gradient: light at top (0%), dark at line (deep drawdown)
            // chartArea.top is at 0%, the line is at negative values below
            // Gradient goes from top (0%) down to where the line is (where it's darkest)
            const chartMainColorRgbGradient = chart.options.viewType === 'kr' ? '37, 99, 235' : '244, 63, 94';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, `rgba(${chartMainColorRgbGradient}, 0.05)`); // 5% opacity at top (0% - surface)
            gradient.addColorStop(0.3, `rgba(${chartMainColorRgbGradient}, 0.25)`); // Increasing saturation
            gradient.addColorStop(0.6, `rgba(${chartMainColorRgbGradient}, 0.5)`); // Mid-depth
            gradient.addColorStop(0.85, `rgba(${chartMainColorRgbGradient}, 0.75)`); // Deep
            gradient.addColorStop(1, `rgba(${chartMainColorRgbGradient}, 0.95)`); // 95% opacity at line (maximum drawdown)
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        },
        afterDatasetsDraw: (chart) => {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            
            if (!meta || !meta.data || meta.data.length === 0) return;
            
            const points = meta.data;
            
            // Draw line with glow effect (multiple passes for neon glow)
            ctx.save();
            ctx.beginPath();
            
            // Build smooth path function
            const buildPath = () => {
                ctx.beginPath();
                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    if (point && point.x !== undefined && point.y !== undefined) {
                        if (i === 0) {
                            ctx.moveTo(point.x, point.y);
                        } else {
                            const prevPoint = points[i - 1];
                            if (prevPoint && prevPoint.x !== undefined && prevPoint.y !== undefined) {
                                const cpx = (prevPoint.x + point.x) / 2;
                                ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, (prevPoint.y + point.y) / 2);
                            }
                        }
                    }
                }
            };
            
            // Draw neon glow effect first (drop-shadow)
            const chartMainColorRgbGlow = chart.options.viewType === 'kr' ? '37, 99, 235' : '244, 63, 94';
            const chartMainColorHex = chart.options.viewType === 'kr' ? '#2563eb' : '#f43f5e';
            buildPath();
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${chartMainColorRgbGlow}, 0.6)`;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = `rgba(${chartMainColorRgbGlow}, 0.8)`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            
            // Draw main line on top (2px solid, sharp, no blur)
            buildPath();
            ctx.strokeStyle = chartMainColorHex;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
            ctx.stroke();
            ctx.restore();
        }
    };
    
    state.charts.drawdown = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Drawdown',
                data: drawdowns.map(d => ({ x: d.date, y: d.drawdown })),
                borderColor: 'transparent', // Hide default line, we draw it in plugin
                backgroundColor: 'transparent', // We draw gradient manually
                borderWidth: 0,
                fill: false,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#ffffff', // White core (Halo effect)
                pointHoverBorderColor: mainColor, // Main color ring
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            ...chartOptions,
            viewType: viewType // Store viewType in options for plugin access
        },
        plugins: [drawdownPlugin]
    });
    
    // Setup zoom interaction with visual feedback
    setupZoomInteraction(ctx.canvas, 'drawdown');
}

// Zoom functionality
let zoomStart = null;
let zoomCanvas = null;
let zoomOverlay = null;

function setupZoomInteraction(canvas, chartType) {
    // Remove existing listeners if any
    canvas.removeEventListener('mousedown', handleZoomMouseDown);
    canvas.removeEventListener('mousemove', handleZoomMouseMove);
    canvas.removeEventListener('mouseup', handleZoomMouseUp);
    canvas.removeEventListener('mouseleave', handleZoomMouseLeave);
    
    // Create overlay element for zoom selection
    if (!zoomOverlay) {
        zoomOverlay = document.createElement('div');
        zoomOverlay.style.position = 'absolute';
        zoomOverlay.style.pointerEvents = 'none';
        // Colors will be updated dynamically based on view type when zooming
        zoomOverlay.style.backgroundColor = 'rgba(244, 63, 94, 0.2)';
        zoomOverlay.style.border = '2px solid #f43f5e';
        zoomOverlay.style.display = 'none';
        zoomOverlay.style.zIndex = '1000';
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(zoomOverlay);
    }
    
    function handleZoomMouseDown(e) {
        if (chartType !== 'drawdown') return;
        const rect = canvas.getBoundingClientRect();
        zoomStart = {
            x: e.clientX - rect.left,
            chart: chartType
        };
        zoomCanvas = canvas;
        canvas.style.cursor = 'crosshair';
    }
    
    function handleZoomMouseMove(e) {
        if (!zoomStart || zoomCanvas !== canvas || chartType !== 'drawdown') {
            if (zoomOverlay) zoomOverlay.style.display = 'none';
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const parentRect = canvas.parentElement.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const startX = zoomStart.x;
        
        const left = Math.min(startX, currentX);
        const width = Math.abs(currentX - startX);
        
        // Update overlay - use relative positions to parent element
        zoomOverlay.style.left = (rect.left - parentRect.left + left) + 'px';
        zoomOverlay.style.top = (rect.top - parentRect.top) + 'px';
        zoomOverlay.style.width = width + 'px';
        zoomOverlay.style.height = rect.height + 'px';
        zoomOverlay.style.display = 'block';
        
        // Update colors based on view type for drawdown chart
        if (chartType === 'drawdown') {
            const zoomColorRgb = state.selectedDrawdownView === 'kr' ? '201, 31, 61' : '244, 63, 94';
            const zoomColorHex = state.selectedDrawdownView === 'kr' ? '#c91f3d' : '#f43f5e';
            zoomOverlay.style.backgroundColor = `rgba(${zoomColorRgb}, 0.2)`;
            zoomOverlay.style.border = `2px solid ${zoomColorHex}`;
        }
    }
    
    function handleZoomMouseUp(e) {
        if (!zoomStart || zoomCanvas !== canvas || chartType !== 'drawdown') return;
        
        const rect = canvas.getBoundingClientRect();
        const zoomEnd = e.clientX - rect.left;
        
        // Hide overlay
        if (zoomOverlay) zoomOverlay.style.display = 'none';
        canvas.style.cursor = 'default';
        
        // Only zoom if drag distance is significant
        if (Math.abs(zoomEnd - zoomStart.x) > 20) {
            const chart = state.charts.drawdown;
            if (chart) {
                const xScale = chart.scales.x;
                const minPixel = Math.min(zoomStart.x, zoomEnd);
                const maxPixel = Math.max(zoomStart.x, zoomEnd);
                
                const minValue = xScale.getValueForPixel(minPixel);
                const maxValue = xScale.getValueForPixel(maxPixel);
                
                // Apply zoom
                state.drawdownZoom = {
                    isZoomed: true,
                    minX: minValue,
                    maxX: maxValue
                };
                
                // Update chart
                updateDrawdownZoom();
                
                // Show reset button
                document.getElementById('reset-zoom-btn').classList.remove('hidden');
            }
        }
        
        zoomStart = null;
        zoomCanvas = null;
    }
    
    function handleZoomMouseLeave() {
        if (zoomOverlay) zoomOverlay.style.display = 'none';
        if (canvas) canvas.style.cursor = 'default';
        zoomStart = null;
        zoomCanvas = null;
    }
    
    // Add event listeners
    canvas.addEventListener('mousedown', handleZoomMouseDown);
    canvas.addEventListener('mousemove', handleZoomMouseMove);
    canvas.addEventListener('mouseup', handleZoomMouseUp);
    canvas.addEventListener('mouseleave', handleZoomMouseLeave);
}

function updateDrawdownZoom() {
    // Update drawdown chart
    if (state.charts.drawdown) {
        state.charts.drawdown.options.scales.x.min = state.drawdownZoom.minX;
        state.charts.drawdown.options.scales.x.max = state.drawdownZoom.maxX;
        state.charts.drawdown.update('none');
    }
}

function resetDrawdownZoom() {
    state.drawdownZoom = {
        isZoomed: false,
        minX: null,
        maxX: null
    };
    
    // Update drawdown chart
    if (state.charts.drawdown) {
        state.charts.drawdown.options.scales.x.min = undefined;
        state.charts.drawdown.options.scales.x.max = undefined;
        state.charts.drawdown.update('none');
    }
    
    // Hide reset button
    document.getElementById('reset-zoom-btn').classList.add('hidden');
}

// Legacy function for compatibility
function createDrawdownChart() {
    createDrawdownCharts();
}

function updateRecoveryTable(drawdowns) {
    const largestDrawdowns = findLargestDrawdowns(drawdowns);
    const container = document.getElementById('recovery-list');
    
    container.innerHTML = largestDrawdowns.map((dd, index) => `
        <div class="table-row">
            <span class="rank">#${index + 1}</span>
            <span class="period">${formatDate(dd.startDate)} - ${formatDate(dd.endDate)}</span>
            <span class="drawdown">${dd.maxDrawdown.toFixed(1)}%</span>
            <span class="recovery">${dd.recoveryDays !== null ? dd.recoveryDays + ' dager' : 'Ikke gjenvunnet'}</span>
        </div>
    `).join('');
}

function updateHighWaterMarkTable(portfolioValues) {
    const longestPeriods = findLongestHighWaterMarkPeriods(portfolioValues);
    const container = document.getElementById('hwm-list');
    
    if (!container) {
        console.error('HWM container not found');
        return;
    }
    
    if (longestPeriods.length === 0) {
        container.innerHTML = '<div class="table-row"><span style="grid-column: 1 / -1; text-align: center; color: var(--muted-foreground);">Ingen perioder funnet</span></div>';
        return;
    }
    
    container.innerHTML = longestPeriods.map((period, index) => `
        <div class="table-row">
            <span class="rank">#${index + 1}</span>
            <span class="period">${formatDate(period.startDate)} - ${formatDate(period.endDate)}</span>
            <span class="drawdown">${period.daysBelowHWM} dager</span>
        </div>
    `).join('');
}

function createNurseChart(tabNumber = 1) {
    const canvasId = `nurse-chart-${tabNumber}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Nurse chart canvas ${canvasId} not found`);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const filteredData = getFilteredData();
    const isGoldTab = tabNumber === 2;
    const isKPITab = tabNumber === 3;
    const isBigMacTab = tabNumber === 4;
    const isOilTab = tabNumber === 5;
    const isM2OsloTab = tabNumber === 6;
    
    // Ensure canvas is visible before creating chart
    if (canvas) {
        canvas.style.display = 'block';
        // Ensure parent wrapper is visible and has proper overflow settings
        const wrapper = canvas.closest('.chart-wrapper');
        if (wrapper) {
            wrapper.style.overflowX = 'auto';
            wrapper.style.overflowY = 'visible';
            wrapper.style.display = 'block';
            // Ensure wrapper has minimum height, especially for max period
            if (state.selectedPeriod === 'max') {
                wrapper.style.minHeight = '400px';
                wrapper.style.height = 'auto';
            }
            // Force a reflow to ensure layout is calculated
            wrapper.offsetHeight;
        }
        // Force a reflow to ensure canvas is visible
        canvas.offsetHeight;
    }
    
    // For tab 3 (Markedspremie), create stacked bar chart
    if (isKPITab) {
        createKPIStackedBarChart(ctx, tabNumber);
        return;
    }
    
    // Early return check - ensure we have data before proceeding
    if (!filteredData || filteredData.length === 0) {
        console.warn('No filtered data available for nurse chart');
        // Ensure wrapper is still visible even with no data
        if (canvas) {
            const wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.style.visibility = 'visible';
                wrapper.style.opacity = '1';
                wrapper.style.minHeight = '400px';
            }
        }
        return;
    }
    
    // Calculate portfolio value for the filtered period, but normalize so it always starts at 10 MNOK
    const newValues = calculatePortfolioValue(filteredData, state.newPortfolio, state.startCapital);
    
    // Check if we have valid values
    if (!newValues || newValues.length === 0) {
        console.warn('No portfolio values calculated for nurse chart');
        // Ensure wrapper is still visible even with no data
        if (canvas) {
            const wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.style.visibility = 'visible';
                wrapper.style.opacity = '1';
                wrapper.style.minHeight = '400px';
            }
        }
        return;
    }
    
    // Normalize the portfolio values so the first value is always exactly 10 MNOK
    if (newValues.length > 0 && newValues[0].value !== state.startCapital) {
        const normalizationFactor = state.startCapital / newValues[0].value;
        newValues.forEach(v => {
            v.value = v.value * normalizationFactor;
        });
    }
    
    // Calculate index (portfolio value / reference value at each point in time)
    // For tab 1: nurse index (portfolio value / nurse salary)
    // For tab 2: gold index (portfolio value / gold price in NOK per unse)
    // For tab 4: BigMac index (portfolio value / BigMac price)
    // Calculate for all data points for tooltip, but filter display to January 1st for smoother line
    const lastValue = newValues[newValues.length - 1];
    const indexAll = newValues.map(v => {
        let index = 0;
        let referenceValue = 0;
        
        if (isGoldTab) {
            // For gold: portfolio value (NOK) / gold price (NOK per unse) = unser gull
            // For last data point (01.12.2025), use hardcoded gold price 4336
            if (v === lastValue) {
                referenceValue = 4336; // Hardcoded end value for 01.12.2025
            } else {
                referenceValue = v.goldPrice || 0;
            }
            index = referenceValue > 0 ? v.value / referenceValue : 0;
        } else if (isBigMacTab) {
            // For BigMac: portfolio value / BigMac price = antall BigMac
            // Only calculate if BigMac price exists (data starts from 2001)
            referenceValue = v.bigMacPrice || 0;
            if (referenceValue > 0) {
                index = v.value / referenceValue;
            } else {
                // Skip data points without BigMac price (before 2001)
                index = null;
            }
        } else if (isOilTab) {
            // For Oil: portfolio value / oil price = antall fat olje
            // Only calculate if oil price exists (data starts from 2001)
            referenceValue = v.oilPrice || 0;
            if (referenceValue > 0) {
                index = v.value / referenceValue;
            } else {
                // Skip data points without oil price (before 2001)
                index = null;
            }
        } else if (isM2OsloTab) {
            // For M2 Oslo: portfolio value / m2 price = antall m2
            // Only calculate if m2 price exists
            referenceValue = v.m2Oslo || 0;
            if (referenceValue > 0) {
                index = v.value / referenceValue;
            } else {
                // Skip data points without m2 price
                index = null;
            }
        } else {
            // For nurse: portfolio value / nurse salary = årslønner
            referenceValue = v.nurseSalary || 0;
            index = referenceValue > 0 ? v.value / referenceValue : 0;
        }
        
        return {
            date: v.date,
            value: v.value,
            referenceValue: referenceValue,
            nurseSalary: v.nurseSalary,
            goldPrice: isGoldTab && v === lastValue ? 4336 : v.goldPrice,
            bigMacPrice: v.bigMacPrice,
            oilPrice: v.oilPrice,
            m2Oslo: v.m2Oslo,
            index: index
        };
    });
    
    // Filter to only include January 1st of each year for display (smoother line), plus last data point
    // For BigMac, Oil and M2 Oslo tabs, also filter out null values
    const indexYearly = indexAll.filter(v => {
        if ((isBigMacTab || isOilTab || isM2OsloTab) && v.index === null) return false; // Skip null values for BigMac, Oil and M2 Oslo
        const date = v.date;
        const isJan1 = date.getMonth() === 0 && date.getDate() === 1;
        const isLastPoint = v === indexAll[indexAll.length - 1];
        return isJan1 || isLastPoint;
    });
    
    // Portfolio values for all data points (for the blue line)
    const portfolioData = newValues.map(v => ({ x: v.date, y: v.value }));
    
    // Destroy existing chart for this tab
    const chartKey = tabNumber === 1 ? 'nurse1' : (tabNumber === 2 ? 'nurse2' : (tabNumber === 3 ? 'nurse3' : (tabNumber === 4 ? 'nurse4' : (tabNumber === 5 ? 'nurse5' : 'nurse6'))));
    if (state.charts[chartKey]) {
        state.charts[chartKey].destroy();
    }
    
    const indexLabel = isGoldTab ? 'Gullprisindeks (unser)' : (isBigMacTab ? 'BigMac-indeksen (antall)' : (isOilTab ? 'Oljepris Brent-indeksen (antall fat)' : (isM2OsloTab ? 'M2 Oslo-indeksen (antall m²)' : 'Sykepleierindeks (årslønner)')));
    const yAxisLabel = isGoldTab ? 'unser' : (isBigMacTab ? 'antall' : (isOilTab ? 'antall fat' : (isM2OsloTab ? 'antall m²' : 'årslønner')));
    const tooltipUnit = isGoldTab ? 'unser' : (isBigMacTab ? 'antall' : (isOilTab ? 'antall fat' : (isM2OsloTab ? 'antall m²' : 'årslønner')));
    const tooltipReferenceLabel = isGoldTab ? 'Gullpris' : (isBigMacTab ? 'BigMac-pris' : (isOilTab ? 'Oljepris' : (isM2OsloTab ? 'M2-pris' : 'Lønn')));
    
    state.charts[chartKey] = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Porteføljeverdi (MNOK)',
                    data: portfolioData,
                    borderColor: chartColors.new.main,
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    tension: 0.3,
                    pointRadius: 0,
                    yAxisID: 'y'
                },
                {
                    label: indexLabel,
                    data: indexAll.filter(n => n.index !== null && n.index > 0).map(n => ({ x: n.date, y: n.index })),
                    borderColor: isGoldTab ? chartColors.gold : (isBigMacTab ? '#DA291C' : (isOilTab ? '#000000' : (isM2OsloTab ? '#808080' : chartColors.nurse))),
                    backgroundColor: isGoldTab ? 'oklch(0.65 0.15 75 / 0.2)' : (isBigMacTab ? 'rgba(218, 41, 28, 0.2)' : (isOilTab ? 'rgba(0, 0, 0, 0.2)' : (isM2OsloTab ? 'rgba(128, 128, 128, 0.2)' : 'oklch(0.55 0.18 145 / 0.2)'))),
                    borderWidth: 3.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            ...commonChartOptions,
            scales: {
                x: {
                    ...commonChartOptions.scales.x
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 11
                        },
                        callback: function(value) {
                            return (value / 1000000).toFixed(0) + ' M';
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 11
                        },
                        color: isGoldTab ? chartColors.gold : (isBigMacTab ? '#DA291C' : (isOilTab ? '#000000' : (isM2OsloTab ? '#808080' : chartColors.nurse))),
                        callback: function(value) {
                            return value.toFixed(0) + ' ' + yAxisLabel;
                        }
                    },
                    ...(isOilTab ? {
                        // For oil tab: set max to highest value + 5000 fat
                        max: (() => {
                            const validIndices = indexAll.filter(n => n.index !== null && n.index > 0).map(n => n.index);
                            if (validIndices.length > 0) {
                                const maxValue = Math.max(...validIndices);
                                return maxValue + 5000;
                            }
                            return undefined;
                        })()
                    } : (isM2OsloTab ? {
                        // For M2 Oslo tab: set max to highest value + 50 m²
                        max: (() => {
                            const validIndices = indexAll.filter(n => n.index !== null && n.index > 0).map(n => n.index);
                            if (validIndices.length > 0) {
                                const maxValue = Math.max(...validIndices);
                                return maxValue + 50;
                            }
                            return undefined;
                        })()
                    } : {}))
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return 'Portefølje: ' + formatCurrency(context.parsed.y);
                            } else {
                                // For index dataset
                                if (context.parsed && !isNaN(context.parsed.y)) {
                                    const point = indexAll[context.dataIndex];
                                    if (point) {
                                        // Format gold price as USD, nurse salary, BigMac price and oil price as NOK
                                        const referenceLabel = isGoldTab 
                                            ? point.goldPrice.toFixed(0) + ' USD'
                                            : (isBigMacTab 
                                                ? point.bigMacPrice.toFixed(2) + ' NOK'
                                                : (isOilTab
                                                    ? point.oilPrice.toFixed(2) + ' USD'
                                                    : (isM2OsloTab
                                                        ? point.m2Oslo.toFixed(0) + ' kr/m²'
                                                        : formatCurrency(point.referenceValue))));
                                        return [
                                            'Indeks: ' + context.parsed.y.toFixed(1) + ' ' + tooltipUnit,
                                            'Portefølje: ' + formatCurrency(point.value),
                                            tooltipReferenceLabel + ': ' + referenceLabel
                                        ];
                                    }
                                    return 'Indeks: ' + context.parsed.y.toFixed(1) + ' ' + tooltipUnit;
                                }
                                return null;
                            }
                        }
                    }
                }
            }
        }
    });
    
    // Ensure wrapper remains visible after chart creation, especially for max period
    if (canvas) {
        const wrapper = canvas.closest('.chart-wrapper');
        if (wrapper) {
            // Always ensure wrapper is visible
            wrapper.style.display = 'block';
            wrapper.style.visibility = 'visible';
            wrapper.style.opacity = '1';
            wrapper.style.position = 'relative';
            // Ensure wrapper has minimum height, especially for max period
            if (state.selectedPeriod === 'max') {
                wrapper.style.minHeight = '400px';
                wrapper.style.height = 'auto';
            } else {
                // Ensure min-height is set even for other periods
                wrapper.style.minHeight = '400px';
            }
            // Ensure wrapper doesn't collapse
            wrapper.style.flexShrink = '0';
            // Force a reflow to ensure layout is updated
            wrapper.offsetHeight;
            // Double-check visibility after a short delay
            setTimeout(() => {
                if (wrapper) {
                    wrapper.style.display = 'block';
                    wrapper.style.visibility = 'visible';
                    wrapper.style.opacity = '1';
                }
            }, 100);
        }
        // Ensure canvas is visible
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.opacity = '1';
    }
    
    // Update info cards
    if (newValues.length === 0 || filteredData.length === 0) {
        // Even if no data, ensure wrapper is visible
        if (canvas) {
            const wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.style.visibility = 'visible';
                wrapper.style.opacity = '1';
                wrapper.style.minHeight = '400px';
            }
        }
        return;
    }
    
    const startData = filteredData[0];
    let startReferenceValue = 0;
    
    // Get start reference value (salary for tab 1, gold price for tab 2, BigMac price for tab 4, oil price for tab 5)
    if (isGoldTab) {
        // Try filteredData first
        if (startData && startData.goldPrice) {
            startReferenceValue = parseFloat(startData.goldPrice);
        }
        // Try newValues as fallback
        else if (newValues[0] && newValues[0].goldPrice) {
            startReferenceValue = parseFloat(newValues[0].goldPrice);
        }
        // Try state.data as last resort
        else if (state.data && state.data.length > 0) {
            const matchingData = state.data.find(d => d.date && d.date.getTime() === startData.date.getTime());
            if (matchingData && matchingData.goldPrice) {
                startReferenceValue = parseFloat(matchingData.goldPrice);
            }
        }
    } else if (isBigMacTab) {
        // For BigMac, use price from start date of filtered period
        // Try filteredData first
        if (startData && startData.bigMacPrice) {
            startReferenceValue = parseFloat(startData.bigMacPrice);
        }
        // Try newValues as fallback
        else if (newValues[0] && newValues[0].bigMacPrice) {
            startReferenceValue = parseFloat(newValues[0].bigMacPrice);
        }
        // Try state.data as last resort
        else if (state.data && state.data.length > 0) {
            const matchingData = state.data.find(d => d.date && d.date.getTime() === startData.date.getTime());
            if (matchingData && matchingData.bigMacPrice) {
                startReferenceValue = parseFloat(matchingData.bigMacPrice);
            }
        }
        // Fallback to 34.00 if no data found (shouldn't happen for periods with BigMac data)
        if (startReferenceValue === 0) {
            startReferenceValue = 34.00;
        }
    } else if (isOilTab) {
        // For Oil, use price from start date of filtered period
        // Try filteredData first
        if (startData && startData.oilPrice) {
            startReferenceValue = parseFloat(startData.oilPrice);
        }
        // Try newValues as fallback
        else if (newValues[0] && newValues[0].oilPrice) {
            startReferenceValue = parseFloat(newValues[0].oilPrice);
        }
        // Try state.data as last resort
        else if (state.data && state.data.length > 0) {
            const matchingData = state.data.find(d => d.date && d.date.getTime() === startData.date.getTime());
            if (matchingData && matchingData.oilPrice) {
                startReferenceValue = parseFloat(matchingData.oilPrice);
            }
        }
        // Fallback to 26.59 if no data found (shouldn't happen for periods with oil data)
        if (startReferenceValue === 0) {
            startReferenceValue = 26.59;
        }
    } else if (isM2OsloTab) {
        // For M2 Oslo, use price from start date of filtered period
        // Try filteredData first
        if (startData && startData.m2Oslo) {
            startReferenceValue = parseFloat(startData.m2Oslo);
        }
        // Try newValues as fallback
        else if (newValues[0] && newValues[0].m2Oslo) {
            startReferenceValue = parseFloat(newValues[0].m2Oslo);
        }
        // Try state.data as last resort
        else if (state.data && state.data.length > 0) {
            const matchingData = state.data.find(d => d.date && d.date.getTime() === startData.date.getTime());
            if (matchingData && matchingData.m2Oslo) {
                startReferenceValue = parseFloat(matchingData.m2Oslo);
            }
        }
        // Fallback to 7500 if no data found (first year 1994)
        if (startReferenceValue === 0) {
            startReferenceValue = 7500;
        }
    } else {
        // Try filteredData first
        if (startData && startData.nurseSalary) {
            startReferenceValue = parseFloat(startData.nurseSalary);
        }
        // Try newValues as fallback
        else if (newValues[0] && newValues[0].nurseSalary) {
            startReferenceValue = parseFloat(newValues[0].nurseSalary);
        }
        // Try state.data as last resort
        else if (state.data && state.data.length > 0) {
            const matchingData = state.data.find(d => d.date && d.date.getTime() === startData.date.getTime());
            if (matchingData && matchingData.nurseSalary) {
                startReferenceValue = parseFloat(matchingData.nurseSalary);
            }
        }
    }
    
    // Get end reference value
    let endReferenceValue = 0;
    const endData = filteredData[filteredData.length - 1];
    if (isGoldTab) {
        // For gold, use hardcoded end value (01.12.2025)
        endReferenceValue = 4336; // 4336 USD
    } else if (isBigMacTab) {
        // For BigMac, use price from end date of filtered period, or 79.00 as fallback
        if (endData && endData.bigMacPrice) {
            endReferenceValue = parseFloat(endData.bigMacPrice);
        } else if (newValues.length > 0 && newValues[newValues.length - 1].bigMacPrice) {
            endReferenceValue = parseFloat(newValues[newValues.length - 1].bigMacPrice);
        } else {
            endReferenceValue = 79.00; // Fallback to 2025 price
        }
    } else if (isOilTab) {
        // For Oil, use price from end date of filtered period, or 63.10 as fallback
        if (endData && endData.oilPrice) {
            endReferenceValue = parseFloat(endData.oilPrice);
        } else if (newValues.length > 0 && newValues[newValues.length - 1].oilPrice) {
            endReferenceValue = parseFloat(newValues[newValues.length - 1].oilPrice);
        } else {
            endReferenceValue = 63.10; // Fallback to 2025 price
        }
    } else if (isM2OsloTab) {
        // For M2 Oslo, use price from end date of filtered period, or 101000 as fallback
        if (endData && endData.m2Oslo) {
            endReferenceValue = parseFloat(endData.m2Oslo);
        } else if (newValues.length > 0 && newValues[newValues.length - 1].m2Oslo) {
            endReferenceValue = parseFloat(newValues[newValues.length - 1].m2Oslo);
        } else {
            endReferenceValue = 101000; // Fallback to 2025 price
        }
    } else {
        endReferenceValue = 700000; // Hardcoded current salary
    }
    
    const startYear = startData && startData.date ? startData.date.getFullYear() : new Date().getFullYear();
    
    // Calculate number of years in the period
    const endDate = newValues[newValues.length - 1].date;
    const startDate = newValues[0].date;
    const yearsDiff = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    const numYears = Math.max(1, yearsDiff); // At least 1 year
    
    // Calculate annual growth rate (CAGR) for reference value
    let annualGrowth = 0;
    if (startReferenceValue > 0 && endReferenceValue > 0 && numYears > 0) {
        annualGrowth = ((Math.pow(endReferenceValue / startReferenceValue, 1 / numYears) - 1) * 100);
    }
    
    // Update labels based on active tab
    if (isKPITab) {
        // Labels for KPI tab are updated in updateKPIInfoCards
        // Skip label updates here
    } else if (isM2OsloTab) {
        // Update labels for M2 Oslo tab
        const firstLabelEl = document.getElementById('nurse-index-first-label');
        if (firstLabelEl) firstLabelEl.textContent = 'Antall m² i Oslo første år';
        
        const tenYearsLabelEl = document.getElementById('nurse-index-10-years-label');
        if (tenYearsLabelEl) tenYearsLabelEl.textContent = 'Laveste observasjon';
        
        const lastLabelEl = document.getElementById('nurse-index-last-label');
        if (lastLabelEl) lastLabelEl.textContent = 'Antall m² i Oslo siste år';
        
        // Update sublabels
        const firstSublabelEl = document.getElementById('nurse-index-first-sublabel');
        if (firstSublabelEl) firstSublabelEl.textContent = 'm²';
        
        const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
        if (tenYearsSublabelEl) tenYearsSublabelEl.textContent = 'm²';
        
        const lastSublabelEl = document.getElementById('nurse-index-last-sublabel');
        if (lastSublabelEl) lastSublabelEl.textContent = 'm²';
        
        // Update start/end value sublabels
        const startSublabelEl = document.getElementById('nurse-start-sublabel');
        if (startSublabelEl) startSublabelEl.textContent = 'kr/m²';
        
        const endSublabelEl = document.getElementById('nurse-end-sublabel');
        if (endSublabelEl) endSublabelEl.textContent = 'kr/m²';
    } else if (isBigMacTab) {
        // Update labels for BigMac tab
        const firstLabelEl = document.getElementById('nurse-index-first-label');
        if (firstLabelEl) firstLabelEl.textContent = 'Antall BigMac første år';
        
        const tenYearsLabelEl = document.getElementById('nurse-index-10-years-label');
        if (tenYearsLabelEl) tenYearsLabelEl.textContent = 'Laveste observasjon';
        
        const lastLabelEl = document.getElementById('nurse-index-last-label');
        if (lastLabelEl) lastLabelEl.textContent = 'Antall BigMac siste år';
        
        // Update sublabels
        const firstSublabelEl = document.getElementById('nurse-index-first-sublabel');
        if (firstSublabelEl) firstSublabelEl.textContent = 'BigMac';
        
        const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
        if (tenYearsSublabelEl) tenYearsSublabelEl.textContent = 'BigMac';
        
        const lastSublabelEl = document.getElementById('nurse-index-last-sublabel');
        if (lastSublabelEl) lastSublabelEl.textContent = 'BigMac';
        
        // Update start/end value sublabels
        const startSublabelEl = document.getElementById('nurse-start-sublabel');
        if (startSublabelEl) startSublabelEl.textContent = 'kr';
        
        const endSublabelEl = document.getElementById('nurse-end-sublabel');
        if (endSublabelEl) endSublabelEl.textContent = 'kr';
    } else if (isGoldTab) {
        // Update labels for gold tab
        const firstLabelEl = document.getElementById('nurse-index-first-label');
        if (firstLabelEl) firstLabelEl.textContent = 'Antall unser gull første år';
        
        const tenYearsLabelEl = document.getElementById('nurse-index-10-years-label');
        if (tenYearsLabelEl) tenYearsLabelEl.textContent = 'Laveste observasjon';
        
        const lastLabelEl = document.getElementById('nurse-index-last-label');
        if (lastLabelEl) lastLabelEl.textContent = 'Antall unser gull siste år';
        
        // Update sublabels
        const firstSublabelEl = document.getElementById('nurse-index-first-sublabel');
        if (firstSublabelEl) firstSublabelEl.textContent = 'unser';
        
        const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
        if (tenYearsSublabelEl) tenYearsSublabelEl.textContent = 'unser';
        
        const lastSublabelEl = document.getElementById('nurse-index-last-sublabel');
        if (lastSublabelEl) lastSublabelEl.textContent = 'unser';
        
        // Update start/end value sublabels (assuming gold price is in USD)
        const startSublabelEl = document.getElementById('nurse-start-sublabel');
        if (startSublabelEl) startSublabelEl.textContent = 'USD';
        
        const endSublabelEl = document.getElementById('nurse-end-sublabel');
        if (endSublabelEl) endSublabelEl.textContent = 'USD';
    } else if (isOilTab) {
        // Update labels for oil tab
        const firstLabelEl = document.getElementById('nurse-index-first-label');
        if (firstLabelEl) firstLabelEl.textContent = 'Antall fat olje første år';
        
        const tenYearsLabelEl = document.getElementById('nurse-index-10-years-label');
        if (tenYearsLabelEl) tenYearsLabelEl.textContent = 'Laveste og høyeste pris på olje';
        
        const lastLabelEl = document.getElementById('nurse-index-last-label');
        if (lastLabelEl) lastLabelEl.textContent = 'Antall fat olje siste år';
        
        // Update sublabels
        const firstSublabelEl = document.getElementById('nurse-index-first-sublabel');
        if (firstSublabelEl) firstSublabelEl.textContent = 'fat';
        
        const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
        if (tenYearsSublabelEl) tenYearsSublabelEl.textContent = 'USD';
        
        const lastSublabelEl = document.getElementById('nurse-index-last-sublabel');
        if (lastSublabelEl) lastSublabelEl.textContent = 'fat';
        
        // Update start/end value sublabels (assuming oil price is in USD)
        const startSublabelEl = document.getElementById('nurse-start-sublabel');
        if (startSublabelEl) startSublabelEl.textContent = 'USD';
        
        const endSublabelEl = document.getElementById('nurse-end-sublabel');
        if (endSublabelEl) endSublabelEl.textContent = 'USD';
    } else {
        // Update labels for nurse tab
        const firstLabelEl = document.getElementById('nurse-index-first-label');
        if (firstLabelEl) firstLabelEl.textContent = 'Antall sykepleier årslønner første år';
        
        const tenYearsLabelEl = document.getElementById('nurse-index-10-years-label');
        if (tenYearsLabelEl) tenYearsLabelEl.textContent = 'Laveste observasjon';
        
        const lastLabelEl = document.getElementById('nurse-index-last-label');
        if (lastLabelEl) lastLabelEl.textContent = 'Antall sykepleier årslønner siste år';
        
        // Update sublabels
        const firstSublabelEl = document.getElementById('nurse-index-first-sublabel');
        if (firstSublabelEl) firstSublabelEl.textContent = 'årslønner';
        
        const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
        if (tenYearsSublabelEl) tenYearsSublabelEl.textContent = 'årslønner';
        
        const lastSublabelEl = document.getElementById('nurse-index-last-sublabel');
        if (lastSublabelEl) lastSublabelEl.textContent = 'årslønner';
        
        // Update start/end value sublabels
        const startSublabelEl = document.getElementById('nurse-start-sublabel');
        if (startSublabelEl) startSublabelEl.textContent = 'kr';
        
        const endSublabelEl = document.getElementById('nurse-end-sublabel');
        if (endSublabelEl) endSublabelEl.textContent = 'kr';
    }
    
    // Update start value label
    const startLabelEl = document.getElementById('nurse-start-label');
    if (startLabelEl) {
        if (isBigMacTab || isOilTab || isM2OsloTab) {
            // Show the actual start date for the filtered period
            const startDate = startData && startData.date ? startData.date : new Date(startYear, 0, 1);
            const day = String(startDate.getDate()).padStart(2, '0');
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const year = startDate.getFullYear();
            startLabelEl.textContent = `Startverdi (${day}.${month}.${year})`;
        } else {
            startLabelEl.textContent = `Startverdi (${startYear})`;
        }
    }
    
    // Update start value
    const nurseStartEl = document.getElementById('nurse-start');
    if (nurseStartEl) {
        if (startReferenceValue > 0) {
            if (isBigMacTab || isOilTab) {
                // For BigMac and Oil, show with 2 decimals
                nurseStartEl.textContent = startReferenceValue.toFixed(2);
            } else if (isM2OsloTab) {
                // For M2 Oslo, show as integer with space separator
                nurseStartEl.textContent = startReferenceValue.toLocaleString('no-NO', { maximumFractionDigits: 0 });
            } else {
                nurseStartEl.textContent = startReferenceValue.toLocaleString('no-NO', { maximumFractionDigits: 0 });
            }
        } else {
            nurseStartEl.textContent = '-';
        }
    }
    
    // Update end value
    const nurseEndEl = document.getElementById('nurse-end');
    const endLabelEl = document.getElementById('nurse-end-label');
    if (nurseEndEl) {
        if (endReferenceValue > 0) {
            if (isBigMacTab || isOilTab) {
                // For BigMac and Oil, show with 2 decimals
                nurseEndEl.textContent = endReferenceValue.toFixed(2);
                if (endLabelEl) endLabelEl.textContent = 'Sluttverdi (i dag)';
            } else if (isM2OsloTab) {
                // For M2 Oslo, show as integer with space separator
                nurseEndEl.textContent = endReferenceValue.toLocaleString('no-NO', { maximumFractionDigits: 0 });
            } else {
                nurseEndEl.textContent = endReferenceValue.toLocaleString('no-NO', { maximumFractionDigits: 0 });
            }
        } else {
            nurseEndEl.textContent = '-';
        }
    }
    
    // Update annual growth
    const growthEl = document.getElementById('nurse-growth');
    if (growthEl) {
        if (annualGrowth > 0 || annualGrowth < 0) {
            growthEl.textContent = annualGrowth.toFixed(2) + '%';
        } else {
            growthEl.textContent = '-';
        }
    }
    
    // Calculate and update index values (from yearly data - January 1st of each year)
    // First year - use first valid index from indexAll (all data points)
    const validIndices = indexAll.filter(v => v.index !== null && v.index > 0);
    if (validIndices.length > 0) {
        const firstIndexData = validIndices[0];
        const lastIndexData = validIndices[validIndices.length - 1];
        
        const firstYearIndex = firstIndexData.index;
        const lastYearIndex = lastIndexData.index;
        
        const firstYearEl = document.getElementById('nurse-index-first');
        if (firstYearEl) {
            firstYearEl.textContent = firstYearIndex.toFixed(1);
        }
        
        const lastYearEl = document.getElementById('nurse-index-last');
        if (lastYearEl) {
            lastYearEl.textContent = lastYearIndex.toFixed(1);
        }
        
        // Calculate growth percentage and annual growth (CAGR)
        // Use actual first and last dates from all data points, not just yearly filtered
        if (firstYearIndex > 0 && lastYearIndex > 0) {
            const totalGrowth = ((lastYearIndex / firstYearIndex) - 1) * 100;
            // Calculate actual number of years between first and last data point
            const firstDate = firstIndexData.date;
            const lastDate = lastIndexData.date;
            const actualYearsDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25);
            const numYears = Math.max(1, actualYearsDiff); // At least 1 year
            const annualGrowth = numYears > 0 
                ? ((Math.pow(lastYearIndex / firstYearIndex, 1 / numYears) - 1) * 100)
                : 0;
            
            // Update growth display
            const growthContainer = document.getElementById('nurse-index-growth');
            const growthTotalEl = document.getElementById('nurse-growth-total');
            const growthAnnualEl = document.getElementById('nurse-growth-annual');
            
            if (growthContainer && growthTotalEl && growthAnnualEl) {
                growthTotalEl.textContent = `Vekst: ${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(1)}%`;
                growthAnnualEl.textContent = `${annualGrowth >= 0 ? '+' : ''}${annualGrowth.toFixed(2)}% per år`;
                growthContainer.style.display = 'flex';
            }
        } else {
            // Hide growth if we can't calculate it
            const growthContainer = document.getElementById('nurse-index-growth');
            if (growthContainer) {
                growthContainer.style.display = 'none';
            }
        }
    }
    
    // Min and max oil prices in the period (only for oil tab)
    if (isOilTab) {
        const validOilPrices = indexAll.filter(v => v.oilPrice !== null && v.oilPrice > 0).map(v => v.oilPrice);
        if (validOilPrices.length > 0) {
            const minOilPrice = Math.min(...validOilPrices);
            const maxOilPrice = Math.max(...validOilPrices);
            const tenYearsAgoEl = document.getElementById('nurse-index-10-years-ago');
            if (tenYearsAgoEl) {
                // Show min and max oil prices: "X - Y USD"
                tenYearsAgoEl.textContent = `${minOilPrice.toFixed(2)} - ${maxOilPrice.toFixed(2)}`;
            }
        }
    } else if (isM2OsloTab) {
        // For M2 Oslo tab, show lowest observation with year (same format as other tabs)
        const validIndicesForMinMax = indexAll.filter(v => v.index !== null && v.index > 0);
        if (validIndicesForMinMax.length > 0) {
            // Find the entry with the minimum index value
            const minEntry = validIndicesForMinMax.reduce((min, current) => 
                current.index < min.index ? current : min
            );
            const minIndex = minEntry.index;
            const minYear = minEntry.date.getFullYear();
            
            const tenYearsAgoEl = document.getElementById('nurse-index-10-years-ago');
            const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
            if (tenYearsAgoEl) {
                // Format: "355.4 m² 2002"
                tenYearsAgoEl.textContent = `${minIndex.toFixed(1)} m² ${minYear}`;
            }
            if (tenYearsSublabelEl) {
                tenYearsSublabelEl.textContent = ''; // Clear sublabel since year is now in main value
            }
        }
    } else {
        // For other tabs (including nurse and gold), show lowest observation with year
        const validIndicesForMinMax = indexAll.filter(v => v.index !== null && v.index > 0);
        if (validIndicesForMinMax.length > 0) {
            // Find the entry with the minimum index value
            const minEntry = validIndicesForMinMax.reduce((min, current) => 
                current.index < min.index ? current : min
            );
            const minIndex = minEntry.index;
            const minYear = minEntry.date.getFullYear();
            
            // Determine unit based on tab type
            const unit = isGoldTab ? 'unser' : (isBigMacTab ? 'antall' : 'årslønner');
            
            const tenYearsAgoEl = document.getElementById('nurse-index-10-years-ago');
            const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
            if (tenYearsAgoEl) {
                // Format: "28 årslønner 2013" or "10961 unser 2025" etc.
                tenYearsAgoEl.textContent = `${minIndex.toFixed(0)} ${unit} ${minYear}`;
            }
            if (tenYearsSublabelEl) {
                tenYearsSublabelEl.textContent = ''; // Clear sublabel since year is now in main value
            }
        }
    }
}

// ========================================
// Pyramid Chart (Return Distribution)
// ========================================

// Calculate yearly returns for a portfolio
// Uses same logic as "År for år" table
function calculateYearlyPortfolioReturns(portfolio) {
    const yearlyData = [];
    
    // Generate years exactly like populateYearByYearTable does
    // populateYearByYearTable always generates years from 1994 to 2025
    let minYear = 1994;
    let maxYear = 2025;
    if (state.data.length > 0) {
        const firstYear = state.data[0].date.getFullYear();
        const lastYear = state.data[state.data.length - 1].date.getFullYear();
        minYear = Math.min(1994, firstYear);
        // Always use 2025 as maxYear, same as populateYearByYearTable
        maxYear = 2025;
    }
    
    // Generate all years from minYear to maxYear (same as populateYearByYearTable)
    const allYears = [];
    for (let year = minYear; year <= maxYear; year++) {
        allYears.push(year);
    }
    
    // Determine which years to include based on selected period
    let targetYears = allYears;
    if (state.selectedPeriod === '3y') {
        // For "siste 3 år", get the last 3 years: 2023, 2024, 2025
        targetYears = allYears.slice(-3);
    } else if (state.selectedPeriod === '5y') {
        targetYears = allYears.slice(-5);
    } else if (state.selectedPeriod === '10y') {
        targetYears = allYears.slice(-10);
    } else if (state.selectedPeriod === '12m' || state.selectedPeriod === 'ytd') {
        targetYears = allYears.slice(-1);
    }
    // For 'max', use all years
    
    // Calculate yearly return for each target year using same function as "År for år" table
    targetYears.forEach(year => {
        const metrics = calculateYearlyPortfolioMetrics(year, portfolio);
        // Include year even if return is null (will show as 0% or handle in chart)
        if (metrics.return !== null) {
            yearlyData.push({
                year: year,
                return: metrics.return
            });
        } else {
            // If return is null, still include the year with 0% return
            yearlyData.push({
                year: year,
                return: 0
            });
        }
    });
    
    return yearlyData;
}

// Calculate half-year returns for a portfolio (all half-years in the period)
// Uses same logic as "År for år" table
function calculateHalfYearPortfolioReturns(portfolio) {
    const halfYearData = [];
    
    // Generate years exactly like populateYearByYearTable does
    // populateYearByYearTable always generates years from 1994 to 2025
    let minYear = 1994;
    let maxYear = 2025;
    if (state.data.length > 0) {
        const firstYear = state.data[0].date.getFullYear();
        minYear = Math.min(1994, firstYear);
        // Always use 2025 as maxYear, same as populateYearByYearTable
        maxYear = 2025;
    }
    
    // Generate all years from minYear to maxYear (same as populateYearByYearTable)
    const allYears = [];
    for (let year = minYear; year <= maxYear; year++) {
        allYears.push(year);
    }
    
    // Determine which years to include based on selected period
    let targetYears = allYears;
    if (state.selectedPeriod === '3y') {
        targetYears = allYears.slice(-3);
    } else if (state.selectedPeriod === '5y') {
        targetYears = allYears.slice(-5);
    } else if (state.selectedPeriod === '10y') {
        targetYears = allYears.slice(-10);
    } else if (state.selectedPeriod === '12m' || state.selectedPeriod === 'ytd') {
        targetYears = allYears.slice(-1);
    }
    // For 'max', use all years
    
    // Calculate half-year returns for each target year using same function as "År for år" table
    targetYears.forEach(year => {
        const halfYearReturns = calculateHalfYearReturns(year, portfolio);
        if (halfYearReturns.firstHalf !== null) {
            halfYearData.push({
                year: year,
                half: 1,
                label: `${year} H1`,
                return: halfYearReturns.firstHalf
            });
        }
        if (halfYearReturns.secondHalf !== null) {
            halfYearData.push({
                year: year,
                half: 2,
                label: `${year} H2`,
                return: halfYearReturns.secondHalf
            });
        }
    });
    
    return halfYearData;
}

// Calculate quarterly returns for a portfolio (all quarters in the period)
// Uses same logic as "År for år" table
function calculateQuarterlyPortfolioReturns(portfolio) {
    const quarterlyData = [];
    
    // Generate years exactly like populateYearByYearTable does
    // populateYearByYearTable always generates years from 1994 to 2025
    let minYear = 1994;
    let maxYear = 2025;
    if (state.data.length > 0) {
        const firstYear = state.data[0].date.getFullYear();
        minYear = Math.min(1994, firstYear);
        // Always use 2025 as maxYear, same as populateYearByYearTable
        maxYear = 2025;
    }
    
    // Generate all years from minYear to maxYear (same as populateYearByYearTable)
    const allYears = [];
    for (let year = minYear; year <= maxYear; year++) {
        allYears.push(year);
    }
    
    // Determine which years to include based on selected period
    let targetYears = allYears;
    if (state.selectedPeriod === '3y') {
        targetYears = allYears.slice(-3);
    } else if (state.selectedPeriod === '5y') {
        targetYears = allYears.slice(-5);
    } else if (state.selectedPeriod === '10y') {
        targetYears = allYears.slice(-10);
    } else if (state.selectedPeriod === '12m' || state.selectedPeriod === 'ytd') {
        targetYears = allYears.slice(-1);
    }
    // For 'max', use all years
    
    // Calculate quarterly returns for each target year using EXACT same function and portfolio as "År for år" table
    // "År for år" table ALWAYS uses: calculateQuarterlyReturns(year, state.newPortfolio)
    // We must use state.newPortfolio, NOT the selected portfolio, to match the table exactly
    targetYears.forEach(year => {
        // Use EXACT same call as "År for år" table uses - ALWAYS use state.newPortfolio
        const quarterlyReturns = calculateQuarterlyReturns(year, state.newPortfolio);
        
        // Always include all 4 quarters - use same values as table shows
        // If null, use 0 (table shows "-" but we need a number for the chart)
        // MUST include all 4 quarters for every year, no exceptions
        quarterlyData.push({
            year: year,
            quarter: 1,
            label: `${year} Q1`,
            return: quarterlyReturns.q1 !== null ? quarterlyReturns.q1 : 0
        });
        quarterlyData.push({
            year: year,
            quarter: 2,
            label: `${year} Q2`,
            return: quarterlyReturns.q2 !== null ? quarterlyReturns.q2 : 0
        });
        quarterlyData.push({
            year: year,
            quarter: 3,
            label: `${year} Q3`,
            return: quarterlyReturns.q3 !== null ? quarterlyReturns.q3 : 0
        });
        quarterlyData.push({
            year: year,
            quarter: 4,
            label: `${year} Q4`,
            return: quarterlyReturns.q4 !== null ? quarterlyReturns.q4 : 0
        });
    });
    
    // Debug: Verify we have correct count
    if (state.selectedPeriod === '3y') {
        console.log('calculateQuarterlyPortfolioReturns - 3y:', {
            targetYears: targetYears,
            targetYearsCount: targetYears.length,
            quarterlyDataCount: quarterlyData.length,
            expectedQuarters: targetYears.length * 4,
            quarters: quarterlyData.map(q => q.label)
        });
    }
    
    return quarterlyData;
}

// Calculate mean and standard deviation
function calculateStats(data) {
    if (data.length === 0) return { mean: 0, stddev: 0 };
    
    const returns = data.map(d => d.return);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stddev = Math.sqrt(variance);
    
    return { mean, stddev };
}

// Get color style based on return interval (using oklch colors similar to Tailwind rose/emerald)
function getReturnColorStyle(returnValue) {
    if (returnValue < -35) return 'background-color: oklch(0.35 0.15 15);'; // Dark red (rose-700)
    if (returnValue < -25) return 'background-color: oklch(0.42 0.15 15);'; // Red (rose-600)
    if (returnValue < -5) return 'background-color: oklch(0.65 0.15 15);'; // Light red (rose-400)
    if (returnValue < 5) return 'background-color: oklch(0.80 0.12 150);'; // Light emerald (emerald-300)
    if (returnValue < 15) return 'background-color: oklch(0.70 0.15 150);'; // Emerald (emerald-400)
    if (returnValue < 25) return 'background-color: oklch(0.60 0.18 150);'; // Strong emerald (emerald-500)
    if (returnValue < 35) return 'background-color: oklch(0.50 0.18 150);'; // Dark emerald (emerald-600)
    return 'background-color: oklch(0.40 0.18 150);'; // Very dark emerald (emerald-700)
}

// Create pyramid chart
function createPyramidChart() {
    const container = document.getElementById('pyramid-chart-container');
    if (!container) return;
    
    // Get selected portfolio
    const portfolioBtn = document.querySelector('.pyramid-controls .selector-btn.active');
    const portfolioType = portfolioBtn ? portfolioBtn.dataset.pyramidPortfolio : 'new';
    const portfolio = portfolioType === 'new' ? state.newPortfolio : state.currentPortfolio;
    
    // Check which period mode is enabled
    const periodToggleFull = document.getElementById('period-toggle-full');
    const periodToggleHalf = document.getElementById('period-toggle-half');
    const periodToggleQuarter = document.getElementById('period-toggle-quarter');
    const useHalfYears = periodToggleHalf ? periodToggleHalf.classList.contains('active') : false;
    const useQuarters = periodToggleQuarter ? periodToggleQuarter.classList.contains('active') : false;
    
    // Calculate returns based on selected period type
    let returnData;
    if (useQuarters) {
        returnData = calculateQuarterlyPortfolioReturns(portfolio);
    } else if (useHalfYears) {
        returnData = calculateHalfYearPortfolioReturns(portfolio);
    } else {
        returnData = calculateYearlyPortfolioReturns(portfolio);
    }
    
    
    if (returnData.length === 0) {
        container.innerHTML = '<p>Ingen data tilgjengelig</p>';
        return;
    }
    
    // Calculate statistics
    const stats = calculateStats(returnData);
    
    // Find best and worst period
    const bestPeriod = returnData.reduce((best, current) => current.return > best.return ? current : best, returnData[0]);
    const worstPeriod = returnData.reduce((worst, current) => current.return < worst.return ? current : worst, returnData[0]);
    
    // Create bins based on period type
    const bins = {};
    let minBin, maxBin, binWidth;
    
    if (useQuarters || useHalfYears) {
        // For quarters and half years: -22% to +18% with 1% intervals
        minBin = -22;
        maxBin = 18;
        binWidth = 1;
        
        // Initialize bins
        for (let binStart = minBin; binStart < maxBin; binStart += binWidth) {
            const binEnd = binStart + binWidth;
            const binKey = `${binStart}-${binEnd}`;
            bins[binKey] = {
                start: binStart,
                end: binEnd,
                items: [],
                count: 0
            };
        }
        
        // Handle the last bin to include maxBin value
        const lastBinKey = `${maxBin - binWidth}-${maxBin}`;
        if (!bins[lastBinKey]) {
            bins[lastBinKey] = {
                start: maxBin - binWidth,
                end: maxBin,
                items: [],
                count: 0
            };
        }
        
        // Assign data points to bins and count
        returnData.forEach(item => {
            const returnValue = item.return;
            // Find which bin this return belongs to
            for (let binStart = minBin; binStart < maxBin; binStart += binWidth) {
                const binEnd = binStart + binWidth;
                // For the last bin, include values equal to maxBin
                if (binStart === maxBin - binWidth && returnValue >= binStart && returnValue <= maxBin) {
                    const binKey = `${binStart}-${binEnd}`;
                    bins[binKey].items.push(item);
                    bins[binKey].count++;
                    break;
                } else if (returnValue >= binStart && returnValue < binEnd) {
                    const binKey = `${binStart}-${binEnd}`;
                    bins[binKey].items.push(item);
                    bins[binKey].count++;
                    break;
                }
            }
        });
    } else {
        // For full year: -50% to +50% with 10% intervals, EXCEPT 0-10% which is split into 0-5% and 5-10%
        minBin = -50;
        maxBin = 50;
        binWidth = 10;
        
        // Initialize bins with special handling for 0-10% interval
        for (let binStart = minBin; binStart < maxBin; binStart += binWidth) {
            if (binStart === 0) {
                // Split 0-10% into 0-5% and 5-10%
                const binKey1 = `0-5`;
                bins[binKey1] = {
                    start: 0,
                    end: 5,
                    items: [],
                    count: 0
                };
                const binKey2 = `5-10`;
                bins[binKey2] = {
                    start: 5,
                    end: 10,
                    items: [],
                    count: 0
                };
            } else {
                const binEnd = binStart + binWidth;
                const binKey = `${binStart}-${binEnd}`;
                bins[binKey] = {
                    start: binStart,
                    end: binEnd,
                    items: [],
                    count: 0
                };
            }
        }
        
        // Assign data points to bins and count
        returnData.forEach(item => {
            const returnValue = item.return;
            // Find which bin this return belongs to
            let assigned = false;
            
            // Check special bins first (0-5% and 5-10%)
            if (returnValue >= 0 && returnValue < 5) {
                bins['0-5'].items.push(item);
                bins['0-5'].count++;
                assigned = true;
            } else if (returnValue >= 5 && returnValue < 10) {
                bins['5-10'].items.push(item);
                bins['5-10'].count++;
                assigned = true;
            } else {
                // Check regular bins
                for (let binStart = minBin; binStart < maxBin; binStart += binWidth) {
                    if (binStart === 0) continue; // Skip 0, already handled above
                    
                    const binEnd = binStart + binWidth;
                    // For the last bin, include values equal to maxBin
                    if (binStart === maxBin - binWidth && returnValue >= binStart && returnValue <= maxBin) {
                        const binKey = `${binStart}-${binEnd}`;
                        bins[binKey].items.push(item);
                        bins[binKey].count++;
                        assigned = true;
                        break;
                    } else if (returnValue >= binStart && returnValue < binEnd) {
                        const binKey = `${binStart}-${binEnd}`;
                        bins[binKey].items.push(item);
                        bins[binKey].count++;
                        assigned = true;
                        break;
                    }
                }
            }
        });
    }
    
    // Find bin with most items
    const mostFrequentBin = Object.values(bins).reduce((max, bin) => bin.count > max.count ? bin : max, bins[Object.keys(bins)[0]]);
    
    // Update stats display
    const meanEl = document.getElementById('pyramid-mean');
    const stddevEl = document.getElementById('pyramid-stddev');
    const mostFrequentEl = document.getElementById('pyramid-most-frequent');
    const worstYearEl = document.getElementById('pyramid-worst-year');
    const bestYearEl = document.getElementById('pyramid-best-year');
    
    if (meanEl) meanEl.textContent = stats.mean.toFixed(2) + '%';
    if (stddevEl) stddevEl.textContent = stats.stddev.toFixed(2) + '%';
    if (mostFrequentEl) mostFrequentEl.textContent = `${mostFrequentBin.start}% - ${mostFrequentBin.end}%`;
    if (worstYearEl) {
        const worstLabel = (useQuarters || useHalfYears) ? worstPeriod.label : worstPeriod.year.toString();
        worstYearEl.textContent = `${worstLabel} (${worstPeriod.return.toFixed(2)}%)`;
    }
    if (bestYearEl) {
        const bestLabel = (useQuarters || useHalfYears) ? bestPeriod.label : bestPeriod.year.toString();
        bestYearEl.textContent = `${bestLabel} (${bestPeriod.return.toFixed(2)}%)`;
    }
    
    // Update modal stats as well
    const meanModalEl = document.getElementById('pyramid-mean-modal');
    const stddevModalEl = document.getElementById('pyramid-stddev-modal');
    const mostFrequentModalEl = document.getElementById('pyramid-most-frequent-modal');
    const worstYearModalEl = document.getElementById('pyramid-worst-year-modal');
    const bestYearModalEl = document.getElementById('pyramid-best-year-modal');
    
    if (meanModalEl) meanModalEl.textContent = stats.mean.toFixed(2) + '%';
    if (stddevModalEl) stddevModalEl.textContent = stats.stddev.toFixed(2) + '%';
    if (mostFrequentModalEl) mostFrequentModalEl.textContent = `${mostFrequentBin.start}% - ${mostFrequentBin.end}%`;
    if (worstYearModalEl) {
        const worstLabel = (useQuarters || useHalfYears) ? worstPeriod.label : worstPeriod.year.toString();
        worstYearModalEl.textContent = `${worstLabel} (${worstPeriod.return.toFixed(2)}%)`;
    }
    if (bestYearModalEl) {
        const bestLabel = (useQuarters || useHalfYears) ? bestPeriod.label : bestPeriod.year.toString();
        bestYearModalEl.textContent = `${bestLabel} (${bestPeriod.return.toFixed(2)}%)`;
    }
    
    // Sort items within each bin by return (highest first)
    Object.keys(bins).forEach(binKey => {
        bins[binKey].items.sort((a, b) => b.return - a.return);
    });
    
    // Calculate static height based on maximum possible periods in dataset
    // Use all data (not filtered) to ensure consistent height regardless of period selection
    const allYears = new Set();
    state.data.forEach(row => {
        allYears.add(row.date.getFullYear());
    });
    // If using quarters, we have approximately 4x the number of periods
    // If using half-years, we have approximately 2x the number of periods
    const maxPossiblePeriods = useQuarters ? allYears.size * 4 : (useHalfYears ? allYears.size * 2 : allYears.size);
    
    // Find current max height for this portfolio
    const currentMaxHeight = Math.max(...Object.values(bins).map(bin => bin.items.length));
    
    // Calculate available container height (accounting for header, stats, padding, etc.)
    // Get actual container dimensions instead of viewport
    const containerRect = container.getBoundingClientRect();
    const containerHeight = containerRect.height || container.offsetHeight;
    
    // Calculate optimal box height to fit all possible years within available space
    const boxMargin = 1;
    const xAxisLabelHeight = 20; // Space for x-axis labels (reduced to minimize white area below)
    const topPadding = 20;
    const bottomPadding = -50; // Negative to move graphic down and minimize white area below chart
    const containerPadding = 24; // var(--space-lg) typically 24px
    
    // Use container height minus padding and labels
    const usableHeight = containerHeight - topPadding - bottomPadding - xAxisLabelHeight - (containerPadding * 2); // Account for container padding
    
    // Calculate box height: (usable height) / (max possible periods + some margin)
    const baseBoxHeight = Math.max(16, Math.min(22.8, Math.floor(usableHeight / (maxPossiblePeriods + 2))));
    let boxHeight = baseBoxHeight * 1.1 * 1.1 * 1.2; // Increase height by 45.2% total (10% + 10% + 20%)
    
    // Adjust box height based on period type (only for pyramid tab)
    if (useHalfYears) {
        // For half years: reduce by 50% then additional 30%, then increase by 30% twice, then 15%, then additional 20% twice
        boxHeight = boxHeight * 0.5 * 0.7 * 1.3 * 1.3 * 1.15 * 1.2 * 1.2;
    } else if (useQuarters) {
        // For quarters: reduce by 50% then additional 30%, then increase by 30% twice, then 15%
        boxHeight = boxHeight * 0.5 * 0.7 * 1.3 * 1.3 * 1.15;
    } else {
        // Full year (hele kalenderår)
        boxHeight = boxHeight * 0.85 * 0.9; // Reduce by 15% then additional 10% (total 23.5% reduction) for full year
    }
    
    const totalBoxHeight = boxHeight + (boxMargin * 2);
    
    // Calculate static chart height to fit container without scrolling
    // Use container height minus container padding
    const staticChartHeight = Math.max(400, containerHeight - (containerPadding * 2));
    
    // Render chart with static height, x-axis at bottom
    // Calculate the actual content height (chart height minus x-axis label space)
    // Ensure x-axis is always visible by reserving space at the bottom
    // Distance between x-axis and boxes (reduced to minimize white area below graphic)
    const xAxisSpace = boxHeight * 0.5; // Half box height – enough for readability, less empty space
    const contentHeight = staticChartHeight - xAxisSpace - xAxisLabelHeight - bottomPadding;
    
    // Sort bins by start value to ensure correct order
    const sortedBinKeys = Object.keys(bins).sort((a, b) => {
        const binA = bins[a];
        const binB = bins[b];
        return binA.start - binB.start;
    });
    
    container.innerHTML = `
        <div class="pyramid-chart" style="display: flex; align-items: flex-end; gap: 2px; height: ${staticChartHeight}px; padding: ${topPadding}px 20px ${xAxisSpace + xAxisLabelHeight + bottomPadding}px 20px; border-bottom: 2px solid var(--border); position: relative; box-sizing: border-box; background: var(--secondary);">
            ${sortedBinKeys.map(binKey => {
                const bin = bins[binKey];
                
                return `
                    <div class="pyramid-bin" style="flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; height: 100%; justify-content: flex-end;">
                        <!-- Boxes container - positioned above x-axis with clear separation (one box height) -->
                        <div class="pyramid-stack" style="width: 100%; display: flex; flex-direction: column-reverse; align-items: center; justify-content: flex-end; min-height: 0; max-height: ${contentHeight}px; margin-bottom: ${xAxisSpace}px; overflow: hidden;">
                            ${bin.items.map(item => {
                                let colorStyle = getReturnColorStyle(item.return);
                                // Special case: if in middle bin (-5 to 5) and return is negative, use red
                                if (bin.start === -5 && item.return < 0) {
                                    colorStyle = 'background-color: oklch(0.65 0.15 15);'; // Light red (rose-400)
                                }
                                // For half years and quarters: all negative values should be red
                                if ((useHalfYears || useQuarters) && item.return < 0) {
                                    if (item.return < -20) {
                                        colorStyle = 'background-color: oklch(0.35 0.15 15);'; // Dark red (rose-700)
                                    } else if (item.return < -10) {
                                        colorStyle = 'background-color: oklch(0.42 0.15 15);'; // Red (rose-600)
                                    } else {
                                        colorStyle = 'background-color: oklch(0.65 0.15 15);'; // Light red (rose-400)
                                    }
                                }
                                // For full year: all negative values should be red
                                if (!useHalfYears && !useQuarters && item.return < 0) {
                                    if (item.return < -35) {
                                        colorStyle = 'background-color: oklch(0.35 0.15 15);'; // Dark red (rose-700)
                                    } else if (item.return < -25) {
                                        colorStyle = 'background-color: oklch(0.42 0.15 15);'; // Red (rose-600)
                                    } else {
                                        colorStyle = 'background-color: oklch(0.65 0.15 15);'; // Light red (rose-400)
                                    }
                                }
                                
                                const displayLabel = (useQuarters || useHalfYears) ? item.label : item.year.toString();
                                const tooltipLabel = (useQuarters || useHalfYears) ? `${item.label}` : `År: ${item.year}`;
                                
                                // Calculate font size based on period type
                                let fontSize = Math.max(8, boxHeight * 0.4 * 1.1 * 1.1 * 1.2);
                                if (useHalfYears || useQuarters) {
                                    fontSize = 0; // No text for half years and quarters
                                }
                                
                                // Box content - empty for half years and quarters
                                const boxContent = (useHalfYears || useQuarters) ? '' : displayLabel;
                                
                                return `
                                    <div 
                                        class="pyramid-box" 
                                        style="width: 90%; height: ${boxHeight}px; margin: ${boxMargin}px 0; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; font-weight: 500; color: white; cursor: pointer; position: relative; flex-shrink: 0; ${colorStyle}"
                                        data-year="${item.year}"
                                        data-return="${item.return.toFixed(2)}"
                                        title="${tooltipLabel}, Avkastning: ${item.return.toFixed(2)}%"
                                    >
                                        ${boxContent}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <!-- X-axis label - always at the bottom, fully visible -->
                        <div class="pyramid-bin-label" style="position: absolute; bottom: ${bottomPadding}px; left: 0; right: 0; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-secondary); white-space: nowrap; text-align: center; width: 100%; height: ${xAxisLabelHeight}px; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            ${useQuarters ? `${bin.start}%` : (useHalfYears ? `${bin.start}%` : `${bin.start}% - ${bin.end}%`)}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Add hover functionality to show text and enlarge box
    container.querySelectorAll('.pyramid-box').forEach(box => {
        const originalFontSize = box.style.fontSize;
        const originalHeight = box.style.height;
        // Get content from data attributes or text content
        const year = box.dataset.year || '';
        const returnValue = box.dataset.return || '';
        const tooltipTitle = box.getAttribute('title') || '';
        // Extract label from tooltip if available
        let originalContent = box.textContent.trim();
        if (!originalContent && tooltipTitle) {
            // Try to extract from tooltip (format: "År: 1995, Avkastning: 5.60%" or "H1 1995, Avkastning: 5.60%")
            const match = tooltipTitle.match(/^(?:År:|)([^,]+)/);
            if (match) {
                originalContent = match[1].trim();
            } else if (year) {
                originalContent = year;
            }
        }
        const shouldHideText = useHalfYears || useQuarters;
        const isHalfYearOrQuarter = useHalfYears || useQuarters;
        
        box.addEventListener('mouseenter', function(e) {
            if (isHalfYearOrQuarter) {
                // For half years and quarters: scale box but don't show text
                const currentHeight = parseFloat(this.style.height) || parseFloat(originalHeight) || 20;
                const currentWidth = parseFloat(this.style.width) || 90; // 90% is default
                
                const scaleFactor = 2.5; // Scale factor for box enlargement
                
                // Increase box size by scaleFactor in both height and width
                this.style.height = (currentHeight * scaleFactor) + 'px';
                this.style.width = (currentWidth * scaleFactor) + '%';
                
                // Keep text hidden (don't show text on hover)
                this.style.fontSize = '0px';
                this.textContent = '';
            } else {
                // For full year: show text if needed
                const currentFontSize = parseFloat(this.style.fontSize) || 0;
                if (currentFontSize === 0 || this.style.fontSize === '0px') {
                    const boxHeight = parseFloat(this.style.height) || 20;
                    this.style.fontSize = Math.max(10, boxHeight * 0.6) + 'px';
                    if (!this.textContent.trim() && originalContent) {
                        this.textContent = originalContent;
                    }
                }
            }
        });
        
        box.addEventListener('mouseleave', function(e) {
            // Restore original font size
            this.style.fontSize = originalFontSize;
            // Restore original box size
            if (isHalfYearOrQuarter) {
                this.style.height = originalHeight;
                this.style.width = '90%'; // Restore default width
            }
            // Restore content if needed
            if (shouldHideText) {
                this.textContent = '';
            }
        });
    });
}

function createKPIStackedBarChart(ctx, tabNumber) {
    const chartKey = 'nurse3';
    if (state.charts[chartKey]) {
        state.charts[chartKey].destroy();
        state.charts[chartKey] = null;
    }
    
    // Ensure canvas is visible before creating chart
    const canvas = ctx.canvas;
    if (canvas) {
        canvas.style.display = 'block';
        // Ensure parent wrapper is visible and has overflow auto
        const wrapper = canvas.closest('.chart-wrapper');
        if (wrapper) {
            wrapper.style.overflowX = 'auto';
            wrapper.style.overflowY = 'visible';
            // Force a reflow to ensure layout is calculated
            wrapper.offsetHeight;
        }
        // Force a reflow to ensure canvas is visible
        canvas.offsetHeight;
    }
    
    // Use ALL data (not filtered) to show KPI for all years
    const allData = state.data;
    
    // Determine year range from ALL data
    // For KPI chart, we want to show all history from 1994
    let minYear = 1994;
    let maxYear = 2025;
    if (allData.length > 0) {
        // Find the first year with data (but always start from 1994 for KPI chart)
        const firstDataYear = allData[0].date.getFullYear();
        minYear = 1994; // Always start from 1994 for KPI chart
        maxYear = allData[allData.length - 1].date.getFullYear();
    }
    
    // Get all years in the full period
    const years = [];
    for (let year = minYear; year <= maxYear; year++) {
        years.push(year);
    }
    
    // Calculate average KPI per year
    const yearlyKPIs = {};
    // Process all years in range
    for (let year = minYear; year <= maxYear; year++) {
        const yearKey = year.toString();
        // Always check allData directly for this year
        const yearData = allData.filter(row => {
            if (!row.date) return false;
            const rowYear = row.date.getFullYear();
            if (rowYear !== year) return false;
            if (row.kpi === undefined || row.kpi === null || isNaN(row.kpi)) return false;
            return true;
        });
        
        if (yearData.length > 0) {
            const kpiValues = yearData.map(r => r.kpi);
            const sum = kpiValues.reduce((a, b) => a + b, 0);
            yearlyKPIs[yearKey] = sum / kpiValues.length;
        } else {
            yearlyKPIs[yearKey] = 0;
        }
    }
    
    // Prepare data for chart - KPI and market premium per year
    // First, collect all years with KPI data and calculate portfolio returns
    const allYearsWithData = [];
    years.forEach(year => {
        const yearKey = year.toString();
        const kpi = yearlyKPIs[yearKey] !== undefined ? yearlyKPIs[yearKey] : null;
        
        // Only process years that have KPI data
        if (kpi !== null && kpi !== 0) {
            // Calculate portfolio return for this year
            const portfolioMetrics = calculateYearlyPortfolioMetrics(year, state.newPortfolio);
            // For years before 2001, portfolio return might be null, but we still want to show KPI
            // Set to 0 if null so we can still show the KPI bar
            const portfolioReturn = portfolioMetrics.return !== null ? portfolioMetrics.return : 0;
            
            // Calculate market premium (portfolio return - KPI)
            // For years without portfolio data, market premium will just be -KPI
            const marketPremium = portfolioReturn - kpi;
            
            // Always include years with KPI data, even if portfolio return is 0
            allYearsWithData.push({
                year: year,
                kpi: kpi,
                portfolioReturn: portfolioReturn,
                marketPremium: marketPremium
            });
        }
    });
    
    // Filter based on selected period
    let filteredYears = allYearsWithData;
    if (state.selectedPeriod === '10y' && allYearsWithData.length > 0) {
        // Show only the last 10 years
        filteredYears = allYearsWithData.slice(-10);
    } else if (state.selectedPeriod === '5y' && allYearsWithData.length > 0) {
        // Show only the last 5 years
        filteredYears = allYearsWithData.slice(-5);
    } else if (state.selectedPeriod === '3y' && allYearsWithData.length > 0) {
        // Show only the last 3 years
        filteredYears = allYearsWithData.slice(-3);
    } else if (state.selectedPeriod === '12m' && allYearsWithData.length > 0) {
        // Show only the last year
        filteredYears = allYearsWithData.slice(-1);
    } else if (state.selectedPeriod === 'ytd' && allYearsWithData.length > 0) {
        // Show only the current year
        const currentYear = new Date().getFullYear();
        filteredYears = allYearsWithData.filter(y => y.year === currentYear);
        if (filteredYears.length === 0) {
            // If current year not available, show last year
            filteredYears = allYearsWithData.slice(-1);
        }
    } else if (state.selectedPeriod === 'year-by-year') {
        // For 'year-by-year', show all history from 1994 onwards
        filteredYears = allYearsWithData.filter(y => y.year >= 1994);
    } else if (state.selectedPeriod === 'max') {
        // For Max period, show all years from 1994 onwards
        filteredYears = allYearsWithData.filter(y => y.year >= 1994);
    }
    // Note: If no period matches, filteredYears will remain as allYearsWithData (showing all years)
    
    // Safety check: ensure we have data to display
    if (!filteredYears || filteredYears.length === 0) {
        console.warn('No data to display for KPI chart with period:', state.selectedPeriod);
        return;
    }
    
    // Ensure canvas and wrapper are properly sized for many years
    if (canvas) {
        const wrapper = canvas.closest('.chart-wrapper');
        if (wrapper) {
            // Always ensure wrapper can scroll horizontally if needed
            wrapper.style.overflowX = 'auto';
            wrapper.style.overflowY = 'visible';
            wrapper.style.display = 'block';
            wrapper.style.visibility = 'visible';
            wrapper.style.opacity = '1';
            wrapper.style.minHeight = '400px';
            
            // Get wrapper dimensions to ensure proper sizing
            const wrapperRect = wrapper.getBoundingClientRect();
            const wrapperWidth = wrapperRect.width || wrapper.offsetWidth;
            const wrapperHeight = wrapperRect.height || wrapper.offsetHeight;
            
            // Ensure canvas has proper dimensions before creating chart
            // Chart.js needs the container to have dimensions
            if (wrapperWidth > 0 && wrapperHeight > 0) {
                // Set explicit height on wrapper to help Chart.js calculate size
                wrapper.style.height = `${Math.max(wrapperHeight, 400)}px`;
            }
            
            // Force a reflow to ensure layout is calculated
            wrapper.offsetHeight;
        }
        // Ensure canvas is visible and has proper dimensions
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.opacity = '1';
        
        // Get canvas container dimensions
        const canvasRect = canvas.getBoundingClientRect();
        const containerWidth = canvasRect.width || canvas.offsetWidth || 800;
        const containerHeight = canvasRect.height || canvas.offsetHeight || 400;
        
        // Ensure canvas has dimensions (Chart.js will handle responsive sizing)
        if (containerWidth > 0 && containerHeight > 0) {
            // Don't set canvas.width/height directly - let Chart.js handle it
            // But ensure the parent has dimensions
            const parent = canvas.parentElement;
            if (parent && parent === wrapper) {
                if (!parent.style.height || parent.style.height === 'auto') {
                    parent.style.height = `${Math.max(containerHeight, 400)}px`;
                }
            }
        }
        
        canvas.offsetHeight;
    }
    
    // Extract labels and values for chart
    // For proper stacking: KPI always from 0, market premium stacks on top
    // To handle negative market premium correctly, we need to adjust the data structure
    
    // FIX 2: Filter out any invalid data (NaN, null, undefined) before creating arrays
    const validYears = filteredYears.filter(y => {
        const kpiValid = y.kpi !== null && y.kpi !== undefined && !isNaN(y.kpi);
        const premiumValid = y.marketPremium !== null && y.marketPremium !== undefined && !isNaN(y.marketPremium);
        return kpiValid && premiumValid;
    });
    
    // Safety check: if we filtered out data, log a warning
    if (validYears.length !== filteredYears.length) {
        console.warn(`⚠️ Filtered out ${filteredYears.length - validYears.length} invalid data points`);
    }
    
    // If no valid data, return early
    if (validYears.length === 0) {
        console.error('❌ No valid data to display for KPI chart');
        return;
    }
    
    const chartLabels = validYears.map(y => y.year.toString());
    
    // KPI values - always positive, starts from 0
    // FIX 2: Ensure all values are numbers (convert to 0 if somehow invalid)
    const kpiValues = validYears.map(y => {
        const val = y.kpi;
        return (val !== null && val !== undefined && !isNaN(val)) ? Number(val) : 0;
    });
    
    // Market premium values - can be positive or negative
    // In Chart.js stacked bars, negative values go down from 0, not from the top of KPI
    // FIX 2: Ensure all values are numbers (convert to 0 if somehow invalid)
    const marketPremiumValues = validYears.map(y => {
        const val = y.marketPremium;
        return (val !== null && val !== undefined && !isNaN(val)) ? Number(val) : 0;
    });
    
    // DEBUG: Check data for Max period
    if (state.selectedPeriod === 'max') {
        console.log('=== DEBUG: Markedspremie Max Period Data ===');
        console.log('Array length (filteredYears):', filteredYears.length);
        console.log('Array length (kpiValues):', kpiValues.length);
        console.log('Array length (marketPremiumValues):', marketPremiumValues.length);
        console.log('Array length (chartLabels):', chartLabels.length);
        
        // Check for null, undefined, or NaN in kpiValues
        const kpiInvalid = kpiValues.filter((val, idx) => val === null || val === undefined || isNaN(val));
        if (kpiInvalid.length > 0) {
            console.warn('⚠️ KPI values with null/undefined/NaN:', kpiInvalid.length, 'out of', kpiValues.length);
            console.warn('Invalid KPI indices:', kpiValues.map((val, idx) => 
                (val === null || val === undefined || isNaN(val)) ? idx : null
            ).filter(idx => idx !== null));
        } else {
            console.log('✅ All KPI values are valid');
        }
        
        // Check for null, undefined, or NaN in marketPremiumValues
        const premiumInvalid = marketPremiumValues.filter((val, idx) => val === null || val === undefined || isNaN(val));
        if (premiumInvalid.length > 0) {
            console.warn('⚠️ Market premium values with null/undefined/NaN:', premiumInvalid.length, 'out of', marketPremiumValues.length);
            console.warn('Invalid premium indices:', marketPremiumValues.map((val, idx) => 
                (val === null || val === undefined || isNaN(val)) ? idx : null
            ).filter(idx => idx !== null));
        } else {
            console.log('✅ All market premium values are valid');
        }
        
        // Calculate min/max for kpiValues
        const kpiNumbers = kpiValues.filter(val => val !== null && val !== undefined && !isNaN(val));
        if (kpiNumbers.length > 0) {
            const kpiMin = Math.min(...kpiNumbers);
            const kpiMax = Math.max(...kpiNumbers);
            console.log('KPI min value:', kpiMin);
            console.log('KPI max value:', kpiMax);
            console.log('KPI range:', kpiMax - kpiMin);
        } else {
            console.warn('⚠️ No valid KPI numbers found!');
        }
        
        // Calculate min/max for marketPremiumValues
        const premiumNumbers = marketPremiumValues.filter(val => val !== null && val !== undefined && !isNaN(val));
        if (premiumNumbers.length > 0) {
            const premiumMin = Math.min(...premiumNumbers);
            const premiumMax = Math.max(...premiumNumbers);
            console.log('Market premium min value:', premiumMin);
            console.log('Market premium max value:', premiumMax);
            console.log('Market premium range:', premiumMax - premiumMin);
        } else {
            console.warn('⚠️ No valid market premium numbers found!');
        }
        
        // Show sample of data
        console.log('Sample of first 5 years:', filteredYears.slice(0, 5).map(y => ({
            year: y.year,
            kpi: y.kpi,
            portfolioReturn: y.portfolioReturn,
            marketPremium: y.marketPremium
        })));
        console.log('Sample of last 5 years:', filteredYears.slice(-5).map(y => ({
            year: y.year,
            kpi: y.kpi,
            portfolioReturn: y.portfolioReturn,
            marketPremium: y.marketPremium
        })));
        console.log('=== END DEBUG ===');
    }
    
    // Create stacked bar chart showing KPI and market premium
    state.charts[chartKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'KPI',
                    data: kpiValues,
                    backgroundColor: 'oklch(0.65 0.02 0)', // Pleasant gray (same as before)
                    borderColor: 'oklch(0.55 0.02 0)', // Slightly darker gray for border
                    borderWidth: 1.5,
                    borderRadius: {
                        topLeft: 4,
                        topRight: 4,
                        bottomLeft: 4,
                        bottomRight: 4
                    },
                    borderSkipped: false,
                    // FIX: Use maxBarThickness for Max period instead of barThickness
                    // maxBarThickness is more flexible and allows Chart.js to calculate minimum
                    maxBarThickness: state.selectedPeriod === 'max' ? 20 : 50
                },
                {
                    label: 'Markedspremie',
                    data: marketPremiumValues,
                    backgroundColor: 'oklch(0.4322 0.1500 28.9906)', // Red color (destructive from design system)
                    borderColor: 'oklch(0.35 0.15 28)', // Darker red for border
                    borderWidth: 1.5,
                    borderRadius: {
                        topLeft: 4,
                        topRight: 4,
                        bottomLeft: 4,
                        bottomRight: 4
                    },
                    borderSkipped: false,
                    // FIX: Use maxBarThickness for Max period instead of barThickness
                    // maxBarThickness is more flexible and allows Chart.js to calculate minimum
                    maxBarThickness: state.selectedPeriod === 'max' ? 20 : 50
                }
            ]
        },
            options: {
            ...commonChartOptions,
            // Keep vertical bars (indexAxis: 'x') for all periods
            indexAxis: 'x',
            responsive: true,
            maintainAspectRatio: false,
            // FIX 3: Animasjons-konflikt - Disable all animations to prevent race conditions with many bars
            animation: {
                duration: 0,
                animateRotate: false,
                animateScale: false
            },
            transitions: {
                active: {
                    animation: {
                        duration: 0
                    }
                }
            },
            // Match sykepleierindeksen layout padding - bar charts have different default padding than line charts
            // Set explicit padding to match sykepleierindeksen x-axis position
            layout: {
                padding: {
                    bottom: 0  // Match sykepleierindeksen - no extra bottom padding
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false  // Match sykepleierindeksen
                    },
                    ticks: {
                        // Match sykepleierindeksen x-axis formatting exactly - minimal config
                        font: {
                            family: "'DM Sans', sans-serif",
                            size: 11  // Same size as sykepleierindeksen
                        },
                        // Match sykepleierindeksen ticks padding (no explicit padding in commonChartOptions)
                        // Only add rotation for Max period when needed, otherwise use defaults like sykepleierindeksen
                        ...(state.selectedPeriod === 'max' || state.selectedPeriod === 'year-by-year' ? {
                            maxRotation: 90,
                            minRotation: 90,
                            maxTicksLimit: undefined,
                            stepSize: 1,
                            autoSkip: false
                        } : {})
                        // For normal periods, don't override anything - use Chart.js defaults like sykepleierindeksen
                    },
                    // FIX: For Max period, use high barPercentage to ensure bars are visible
                    // Chart.js needs explicit percentages to render many bars
                    ...(state.selectedPeriod === 'max' ? {
                        barPercentage: 0.9,  // High percentage to maximize bar width
                        categoryPercentage: 0.95  // High category percentage to maximize space
                    } : {
                        barPercentage: 0.75,
                        categoryPercentage: 0.85
                    })
                },
                y: {
                    stacked: true,
                    // FIX: For Max period with negative values, don't force beginAtZero
                    // Chart.js may have issues rendering stacked bars with negative values when beginAtZero is true
                    beginAtZero: state.selectedPeriod === 'max' ? false : true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 11
                        },
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (label === 'KPI') {
                                return 'KPI: ' + value.toFixed(2) + '%';
                            } else if (label === 'Markedspremie') {
                                return 'Markedspremie: ' + value.toFixed(2) + '%';
                            }
                            return label + ': ' + value.toFixed(2) + '%';
                        },
                        footer: function(tooltipItems) {
                            if (tooltipItems.length === 2) {
                                const kpiValue = tooltipItems[0].parsed.y;
                                const premiumValue = tooltipItems[1].parsed.y;
                                const total = kpiValue + premiumValue;
                                return 'Total avkastning: ' + total.toFixed(2) + '%';
                            }
                            return '';
                        }
                    }
                },
                legend: {
                    ...commonChartOptions.plugins.legend,
                    display: true
                }
            },
        }
    });
    
    // FIX: Force chart update immediately and multiple times to ensure rendering
    if (state.charts[chartKey]) {
        // Ensure canvas is visible
        const canvas = ctx.canvas;
        if (canvas) {
            canvas.style.display = 'block';
            canvas.style.visibility = 'visible';
            canvas.style.opacity = '1';
            
            // Ensure parent wrapper is visible and has overflow auto
            const wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.style.overflowX = 'auto';
                wrapper.style.overflowY = 'visible';
                wrapper.style.display = 'block';
                wrapper.style.visibility = 'visible';
                wrapper.style.opacity = '1';
                
                // Ensure wrapper has explicit dimensions
                const wrapperRect = wrapper.getBoundingClientRect();
                if (wrapperRect.width > 0 && wrapperRect.height > 0) {
                    // Set explicit height to help Chart.js calculate size
                    if (!wrapper.style.height || wrapper.style.height === 'auto') {
                        wrapper.style.height = `${Math.max(wrapperRect.height, 400)}px`;
                    }
                }
            }
        }
        
        // FIX: Immediate update for Max period to force rendering
        if (state.selectedPeriod === 'max') {
            try {
                // Force immediate update
                state.charts[chartKey].update('none');
                // Force resize to recalculate layout
                state.charts[chartKey].resize();
                // Update again after resize
                state.charts[chartKey].update('none');
            } catch (e) {
                console.warn('Error in immediate chart update:', e);
            }
        }
        
        // Force chart resize multiple times to handle different viewport sizes
        // First resize after a short delay
        setTimeout(() => {
            if (state.charts[chartKey]) {
                try {
                    state.charts[chartKey].resize();
                    state.charts[chartKey].update('none');
                } catch (e) {
                    console.warn('Error resizing chart:', e);
                }
            }
        }, 50);
        
        // Second resize after layout has fully stabilized
        setTimeout(() => {
            if (state.charts[chartKey]) {
                try {
                    state.charts[chartKey].resize();
                    state.charts[chartKey].update('none');
                } catch (e) {
                    console.warn('Error resizing chart (delayed):', e);
                }
            }
        }, 200);
        
        // Third resize to catch any late layout changes
        setTimeout(() => {
            if (state.charts[chartKey]) {
                try {
                    state.charts[chartKey].resize();
                    state.charts[chartKey].update('none');
                } catch (e) {
                    console.warn('Error resizing chart (final):', e);
                }
            }
        }, 500);
    }
    
    // Update info cards for KPI tab
    if (validYears.length > 0) {
        // Card 1: KPI første året
        const firstYear = validYears[0];
        const startValueEl = document.getElementById('nurse-start');
        const startLabelEl = document.getElementById('nurse-start-label');
        const startSublabelEl = document.getElementById('nurse-start-sublabel');
        if (startValueEl) startValueEl.textContent = firstYear.kpi.toFixed(1);
        if (startLabelEl) startLabelEl.textContent = `KPI første året`;
        if (startSublabelEl) startSublabelEl.textContent = '%';
        
        // Card 2: KPI siste året
        const lastYear = validYears[validYears.length - 1];
        const endValueEl = document.getElementById('nurse-end');
        const endLabelEl = document.getElementById('nurse-end-label');
        const endSublabelEl = document.getElementById('nurse-end-sublabel');
        if (endValueEl) endValueEl.textContent = lastYear.kpi.toFixed(1);
        if (endLabelEl) endLabelEl.textContent = 'KPI siste år';
        if (endSublabelEl) endSublabelEl.textContent = '%';
        
        // Card 3: Markedspremie første år (first card in second row)
        const firstPremium = firstYear.marketPremium;
        const firstCardEl = document.getElementById('nurse-index-first');
        const firstLabelEl = document.getElementById('nurse-index-first-label');
        const firstSublabelEl = document.getElementById('nurse-index-first-sublabel');
        if (firstCardEl) firstCardEl.textContent = `${firstPremium >= 0 ? '+' : ''}${firstPremium.toFixed(1)}%`;
        if (firstLabelEl) firstLabelEl.textContent = 'Markedspremie første år';
        if (firstSublabelEl) firstSublabelEl.textContent = '';
        
        // Card 4: Laveste markedspremie
        const minPremiumEntry = validYears.reduce((min, current) => 
            current.marketPremium < min.marketPremium ? current : min
        );
        const tenYearsAgoEl = document.getElementById('nurse-index-10-years-ago');
        const tenYearsLabelEl = document.getElementById('nurse-index-10-years-label');
        const tenYearsSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
        if (tenYearsAgoEl) tenYearsAgoEl.textContent = `${minPremiumEntry.marketPremium.toFixed(1)}% ${minPremiumEntry.year}`;
        if (tenYearsLabelEl) tenYearsLabelEl.textContent = 'Laveste observasjon';
        if (tenYearsSublabelEl) tenYearsSublabelEl.textContent = '';
        
        // Card 4: Markedspremien siste år
        const lastPremium = lastYear.marketPremium;
        const lastCardEl = document.getElementById('nurse-index-last');
        const lastLabelEl = document.getElementById('nurse-index-last-label');
        const lastSublabelEl = document.getElementById('nurse-index-last-sublabel');
        const growthContainer = document.getElementById('nurse-index-growth');
        if (lastCardEl) lastCardEl.textContent = `${lastPremium >= 0 ? '+' : ''}${lastPremium.toFixed(1)}%`;
        if (lastLabelEl) lastLabelEl.textContent = 'Markedspremien siste år';
        if (lastSublabelEl) lastSublabelEl.textContent = '';
        if (growthContainer) growthContainer.style.display = 'none';
    }
}

function updateKPIInfoCards(yearlyData, startYear) {
    // Card 1: Antall år med avkastning utover KPI
    const yearsWithExcessReturn = yearlyData.filter(d => d.excessReturn > 0).length;
    const firstCardEl = document.getElementById('nurse-index-first');
    const firstLabelEl = document.getElementById('nurse-index-first-label');
    const firstSublabelEl = document.getElementById('nurse-index-first-sublabel');
    if (firstCardEl) firstCardEl.textContent = yearsWithExcessReturn;
    if (firstLabelEl) firstLabelEl.textContent = 'Antall år med avkastning utover KPI';
    if (firstSublabelEl) firstSublabelEl.textContent = 'år';
    
    // Card 2: Året med høyest avkastning utover KPI
    let maxExcessReturn = -Infinity;
    let maxExcessReturnYear = null;
    yearlyData.forEach(d => {
        if (d.excessReturn > maxExcessReturn) {
            maxExcessReturn = d.excessReturn;
            maxExcessReturnYear = d.year;
        }
    });
    const secondCardEl = document.getElementById('nurse-index-10-years-ago');
    const secondLabelEl = document.getElementById('nurse-index-10-years-label');
    const secondSublabelEl = document.getElementById('nurse-index-10-years-sublabel');
    if (secondCardEl) secondCardEl.textContent = maxExcessReturnYear || '-';
    if (secondLabelEl) secondLabelEl.textContent = 'Året med høyest avkastning utover KPI';
    if (secondSublabelEl) secondSublabelEl.textContent = '';
    
    // Card 3: Total vekst i porteføljen og annualisert avkastning utover KPI
    const startKpiIndex = 100;
    const endKpiIndex = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].kpiIndex : 100;
    const totalKpiGrowth = ((endKpiIndex / startKpiIndex) - 1) * 100;
    
    const startPortfolioIndex = 100;
    const endPortfolioIndex = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].portfolioIndex : 100;
    const totalPortfolioGrowth = ((endPortfolioIndex / startPortfolioIndex) - 1) * 100;
    
    const totalExcessGrowth = totalPortfolioGrowth - totalKpiGrowth;
    const numYears = yearlyData.length;
    const annualizedExcessReturn = numYears > 0 
        ? ((Math.pow(endPortfolioIndex / endKpiIndex, 1 / numYears) - 1) * 100)
        : 0;
    
    const thirdCardEl = document.getElementById('nurse-index-last');
    const thirdLabelEl = document.getElementById('nurse-index-last-label');
    const thirdSublabelEl = document.getElementById('nurse-index-last-sublabel');
    const growthContainer = document.getElementById('nurse-index-growth');
    const growthTotalEl = document.getElementById('nurse-growth-total');
    const growthAnnualEl = document.getElementById('nurse-growth-annual');
    
    // Show Markedspremie - annualized return over KPI
    if (thirdCardEl) thirdCardEl.textContent = `${annualizedExcessReturn >= 0 ? '+' : ''}${annualizedExcessReturn.toFixed(2)}%`;
    if (thirdLabelEl) thirdLabelEl.textContent = 'Markedspremie';
    if (thirdSublabelEl) thirdSublabelEl.textContent = 'per år';
    
    // Hide the growth container as we're showing the value directly in the main card
    if (growthContainer) {
        growthContainer.style.display = 'none';
    }
    
    // Update start value card to show indexed start value (100) with actual start year
    const startValueEl = document.getElementById('nurse-start');
    const startLabelEl = document.getElementById('nurse-start-label');
    const startSublabelEl = document.getElementById('nurse-start-sublabel');
    if (startValueEl) startValueEl.textContent = '100';
    if (startLabelEl) {
        // Show the actual start year instead of always "indeksert"
        if (startYear) {
            startLabelEl.textContent = `Startverdi (${startYear})`;
        } else {
            startLabelEl.textContent = 'Startverdi (indeksert)';
        }
    }
    if (startSublabelEl) startSublabelEl.textContent = '';
    
    // Update end value card to show KPI index end value (182.5) - 100 adjusted for KPI in all years
    const endValueEl = document.getElementById('nurse-end');
    const endLabelEl = document.getElementById('nurse-end-label');
    const endSublabelEl = document.getElementById('nurse-end-sublabel');
    if (endValueEl) endValueEl.textContent = endKpiIndex.toFixed(1);
    if (endLabelEl) endLabelEl.textContent = 'Sluttverdi (indeksert)';
    if (endSublabelEl) endSublabelEl.textContent = '';
    
    // Update growth card - show KPI growth
    const growthEl = document.getElementById('nurse-growth');
    if (growthEl) {
        const annualGrowth = numYears > 0 
            ? ((Math.pow(endKpiIndex / startKpiIndex, 1 / numYears) - 1) * 100)
            : 0;
        growthEl.textContent = annualGrowth.toFixed(2) + '%';
    }
}

function createAssetsGrid() {
    const container = document.getElementById('assets-grid');
    const filteredData = getFilteredData();
    
    // Debug: Log data range
    if (filteredData.length > 0) {
        const firstDate = filteredData[0].date;
        const lastDate = filteredData[filteredData.length - 1].date;
        console.log('createAssetsGrid - Data range:', {
            firstYear: firstDate.getFullYear(),
            lastYear: lastDate.getFullYear(),
            totalDataPoints: filteredData.length,
            period: state.selectedPeriod
        });
    }
    
    const yearlyReturns = calculateYearlyReturns(filteredData);
    
    // Debug: Log years found
    const years = Object.keys(yearlyReturns).sort();
    console.log('createAssetsGrid - Years found:', {
        years: years,
        count: years.length,
        firstYear: years[0],
        lastYear: years[years.length - 1]
    });
    
    const numYears = years.length;
    
    // Get the actual container width (more accurate than viewport)
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width || container.offsetWidth || window.innerWidth - 200;
    
    // Calculate gap size (var(--space-xs) is typically 8px)
    const gapSize = 8;
    const totalGaps = (numYears - 1) * gapSize;
    const availableWidth = containerWidth - totalGaps;
    
    let gridTemplateColumns;
    
    if (state.selectedPeriod === 'max') {
        // For "max" period: Fit all years without scrolling but fill width and height
        // Use minmax with lower minimum width to ensure all years fit while still filling space
        const minColumnWidth = 25; // Lower minimum for max period (reduced from 40 to fit more years)
        const calculatedWidth = Math.floor(availableWidth / numYears);
        const optimalColumnWidth = Math.max(minColumnWidth, calculatedWidth);
        gridTemplateColumns = `repeat(${numYears}, minmax(${optimalColumnWidth}px, 1fr))`;
        
        // Add class to container for max period styling
        container.classList.add('max-period');
    } else {
        container.classList.remove('max-period');
        // For other periods (like "10y"): Fill screen with flexible larger columns
        const minColumnWidth = 65;
        const maxColumnWidth = 250;
        const optimalColumnWidth = Math.max(
            minColumnWidth,
            Math.min(
                maxColumnWidth,
                Math.floor(availableWidth / numYears)
            )
        );
        gridTemplateColumns = `repeat(${numYears}, minmax(${optimalColumnWidth}px, 1fr))`;
    }
    
    // Set dynamic grid template columns
    container.style.gridTemplateColumns = gridTemplateColumns;
    
    container.innerHTML = years.map(year => {
        const returns = yearlyReturns[year];
        
        // Rank assets - map UI labels to CSV columns: Likviditet→riskFree, Renter→highYield, Aksjer→stocks (historiske kurser2.csv)
        const assets = [
            { name: 'Likviditet/kontanter', return: returns.riskFree, class: 'stocks' },
            { name: 'Renter', return: returns.highYield, class: 'risikofri' },
            { name: 'Aksjer', return: returns.stocks, class: 'highyield' },
            { name: 'Alternative strategier', return: returns.nordicStocks, class: 'nordicstocks' },
            { name: 'Annet', return: returns.emergingMarkets, class: 'emergingmarkets' },
            { name: 'KPI', return: returns.kpi || 0, class: 'kpi' }
        ].sort((a, b) => b.return - a.return);
        
        return `
            <div class="asset-column animate-in">
                <div class="year-label">${year}</div>
                ${assets.map(asset => `
                    <div class="asset-cell ${asset.class} ${asset.return < 0 ? 'negative' : ''} ${state.selectedAssetClass === asset.class ? 'marked' : ''}" 
                         data-asset-class="${asset.class}">
                        <span class="asset-name">${asset.name}</span>
                        <span class="asset-return">${formatPercent(asset.return, 0)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    
    // Add click event listeners to asset cells
    const assetCells = container.querySelectorAll('.asset-cell');
    const assetsGrid = container;
    
    assetCells.forEach(cell => {
        cell.addEventListener('click', () => {
            const assetClass = cell.dataset.assetClass;
            
            // If clicking the same asset class, deselect it
            if (state.selectedAssetClass === assetClass) {
                state.selectedAssetClass = null;
                assetsGrid.classList.remove('filtered');
                assetCells.forEach(c => c.classList.remove('marked'));
            } else {
                // Select new asset class
                state.selectedAssetClass = assetClass;
                assetsGrid.classList.add('filtered');
                
                // Mark all cells with the same asset class
                assetCells.forEach(c => {
                    if (c.dataset.assetClass === assetClass) {
                        c.classList.add('marked');
                    } else {
                        c.classList.remove('marked');
                    }
                });
            }
        });
    });
    
    // Apply current filter state if one exists
    if (state.selectedAssetClass) {
        assetsGrid.classList.add('filtered');
    }
}

// ========================================
// Tab Navigation
// ========================================
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            // Initialize charts for the active tab
            switch (tabId) {
                case 'input':
                    // Re-render treemap charts when navigating back to input tab
                    // Small delay to ensure tab is visible before rendering
                    setTimeout(() => {
                        updateTreemapChart('current');
                        updateTreemapChart('new');
                    }, 100);
                    break;
                case 'portfolio-comparison':
                    createOverviewChart();
                    break;
                case 'allocation':
                    // Small delay to ensure tab is visible before creating chart
                    setTimeout(() => {
                        createAllocationChart();
                    }, 100);
                    break;
                case 'comparison':
                    createComparisonChart();
                    updateMetrics();
                    break;
                case 'drawdown':
                    createDrawdownCharts();
                    break;
                case 'nurse':
                    createNurseChart(state.activeNurseTab);
                    break;
                case 'pyramid':
                    createPyramidChart();
                    break;
                case 'assets':
                    createAssetsGrid();
                    break;
                case 'money':
                    initializeMoneyValueCalculations();
                    break;
            }
        });
    });
}

// ========================================
// Event Listeners Setup
// ========================================
function setupEventListeners() {
    // Current portfolio sliders
    const currentSliders = ['stocks', 'riskfree', 'highyield', 'nordic', 'emerging'];
    currentSliders.forEach(sliderName => {
        const slider = document.getElementById(`current-${sliderName}`);
        if (slider) {
            slider.addEventListener('input', (e) => {
                validateAndAdjustSlider('current', slider.id, parseFloat(e.target.value));
            });
        }
    });
    
    // New portfolio sliders
    const newSliders = ['stocks', 'riskfree', 'highyield', 'nordic', 'emerging'];
    newSliders.forEach(sliderName => {
        const slider = document.getElementById(`new-${sliderName}`);
        if (slider) {
            slider.addEventListener('input', (e) => {
                validateAndAdjustSlider('new', slider.id, parseFloat(e.target.value));
            });
        }
    });
    
    // Allocation shortcut buttons for both portfolios
    // Kun Renter og Aksjer – ingen Likviditet, Alternative strategier eller Annet med mindre bruker velger det manuelt.
    const allocationButtons = document.querySelectorAll('.allocation-btn');
    allocationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const allocationPercent = parseFloat(btn.dataset.allocation); // % aksjer (0, 20, 45, 55, 65, 85, 100)
            const portfolioType = btn.dataset.portfolio; // 'current' or 'new'
            
            const portfolio = portfolioType === 'current' ? state.currentPortfolio : state.newPortfolio;
            
            // Fordeling: kun Renter + Aksjer. 0% aksjer = 100% renter; 100% aksjer = 100% aksjer.
            portfolio.stocks = 0;           // Likviditet/kontanter – ikke inkludert i preset
            portfolio.riskFree = 100 - allocationPercent;  // Renter
            portfolio.highYield = allocationPercent;       // Aksjer
            portfolio.nordicStocks = 0;     // Alternative strategier – ikke inkludert
            portfolio.emergingMarkets = 0;  // Annet – ikke inkludert
            
            const portfolioButtons = document.querySelectorAll(`.allocation-btn[data-portfolio="${portfolioType}"]`);
            portfolioButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            updateSliderUI(portfolioType);
            updateCharts();
        });
    });
    
    // Initialize UI
    updateSliderUI('current');
    updateSliderUI('new');
    
    // Initialize treemap charts
    updateTreemapChart('current');
    updateTreemapChart('new');
    
    // Resize handler for treemap charts and assets grid
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Update bubble chart if active
        const bubbleBtn = document.getElementById('bubble-chart-btn');
        if (bubbleBtn && bubbleBtn.classList.contains('active')) {
            const bubbleCanvas = document.getElementById('bubble-chart');
            if (bubbleCanvas && bubbleCanvas.style.display !== 'none') {
                setTimeout(() => {
                    createBubbleChart();
                }, 100);
            }
        }
        
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateTreemapChart('current');
            updateTreemapChart('new');
            // Update assets grid if it's the active tab
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
            if (activeTab === 'assets') {
                createAssetsGrid();
            }
            // Update pyramid chart if it's the active tab
            if (activeTab === 'pyramid') {
                createPyramidChart();
            }
        }, 250);
    });
    
    // Fullscreen button for overview chart
    const overviewFullscreenBtn = document.getElementById('overview-fullscreen-btn');
    if (overviewFullscreenBtn) {
        overviewFullscreenBtn.addEventListener('click', () => {
            openChartFullscreen('overview');
        });
    }
    
    // Fullscreen button for comparison chart
    const comparisonFullscreenBtn = document.getElementById('comparison-fullscreen-btn');
    if (comparisonFullscreenBtn) {
        comparisonFullscreenBtn.addEventListener('click', () => {
            openChartFullscreen('comparison');
        });
    }
    
    // Fullscreen button for drawdown chart
    const drawdownFullscreenBtn = document.getElementById('drawdown-fullscreen-btn');
    if (drawdownFullscreenBtn) {
        drawdownFullscreenBtn.addEventListener('click', () => {
            openChartFullscreen('drawdown');
        });
    }
    
    // Chart selector buttons for portfolio comparison tab
    const chartSelectorBtns = document.querySelectorAll('.chart-selector-btn');
    chartSelectorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const chartType = btn.dataset.chartType;
            
            // Update active state
            chartSelectorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update state and recreate chart
            state.portfolioComparisonChartType = chartType;
            createOverviewChart();
        });
    });
    
    // Toggle switches (removed from UI, keeping for backwards compatibility)
    const toggleCurrent = document.getElementById('toggle-current');
    const toggleNew = document.getElementById('toggle-new');
    
    if (toggleCurrent) {
        toggleCurrent.addEventListener('change', (e) => {
            if (state.charts.overview) {
                state.charts.overview.data.datasets[0].hidden = !e.target.checked;
                state.charts.overview.update();
            }
        });
    }
    
    if (toggleNew) {
        toggleNew.addEventListener('change', (e) => {
            if (state.charts.overview) {
                state.charts.overview.data.datasets[1].hidden = !e.target.checked;
                state.charts.overview.update();
            }
        });
    }
    
    // Drawdown portfolio selector
    const selectorButtons = document.querySelectorAll('.portfolio-selector .selector-btn');
    selectorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedDrawdownPortfolio = btn.dataset.portfolio;
            state.selectedDrawdownView = btn.dataset.view || 'percent';
            // Reset zoom when switching portfolios
            state.drawdownZoom = { isZoomed: false, minX: null, maxX: null };
            document.getElementById('reset-zoom-btn').classList.add('hidden');
            createDrawdownCharts();
        });
    });
    
    // Reset zoom button
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', resetDrawdownZoom);
    }
    
    // Period selector
    const periodButtons = document.querySelectorAll('.period-btn');
    const yearByYearBtn = document.getElementById('year-by-year-btn');
    
    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Skip if it's the year-by-year button (handled separately)
            if (btn.id === 'year-by-year-btn') {
                return;
            }
            
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedPeriod = btn.dataset.period;
            updatePeriodDisplay();
            
            // Ensure nurse chart wrapper is visible before updating charts
            const nurseWrapper = document.querySelector('#tab-nurse .chart-wrapper.large');
            if (nurseWrapper) {
                nurseWrapper.style.display = 'block';
                nurseWrapper.style.visibility = 'visible';
                nurseWrapper.style.opacity = '1';
                nurseWrapper.style.minHeight = '400px';
                nurseWrapper.style.height = 'auto';
                nurseWrapper.style.flexShrink = '0';
            }
            
            updateCharts();
            
            // If on assets tab, update grid too
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            if (activeTab === 'assets') {
                createAssetsGrid();
            }
        });
    });
    
    // Year-by-year button - shows all history from 1994
    if (yearByYearBtn) {
        yearByYearBtn.addEventListener('click', () => {
            // Set all other period buttons to inactive
            periodButtons.forEach(b => {
                if (b.id !== 'year-by-year-btn') {
                    b.classList.remove('active');
                }
            });
            
            // Activate year-by-year button
            yearByYearBtn.classList.add('active');
            
            // Set a special period state for year-by-year
            state.selectedPeriod = 'year-by-year';
            
            // Update charts to show all history from 1994
            updateCharts();
            
            // If on assets tab, update grid too
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            if (activeTab === 'assets') {
                createAssetsGrid();
            }
        });
    }
    
    // Nurse tab selector buttons
    const nurseTabButtons = document.querySelectorAll('.nurse-tab-selector .selector-btn');
    nurseTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            nurseTabButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Get tab number from data attribute
            const tabNumber = parseInt(btn.dataset.nurseTab) || 1;
            state.activeNurseTab = tabNumber;
            
            // Show/hide appropriate canvas
            const canvas1 = document.getElementById('nurse-chart-1');
            const canvas2 = document.getElementById('nurse-chart-2');
            const canvas3 = document.getElementById('nurse-chart-3');
            const canvas4 = document.getElementById('nurse-chart-4');
            const canvas5 = document.getElementById('nurse-chart-5');
            const canvas6 = document.getElementById('nurse-chart-6');
            if (canvas1 && canvas2 && canvas3 && canvas4 && canvas5 && canvas6) {
                canvas1.style.display = tabNumber === 1 ? 'block' : 'none';
                canvas2.style.display = tabNumber === 2 ? 'block' : 'none';
                canvas3.style.display = tabNumber === 3 ? 'block' : 'none';
                canvas4.style.display = tabNumber === 4 ? 'block' : 'none';
                canvas5.style.display = tabNumber === 5 ? 'block' : 'none';
                canvas6.style.display = tabNumber === 6 ? 'block' : 'none';
            }
            
            // Create/update chart for selected tab
            createNurseChart(tabNumber);
        });
    });
    
    // Pyramid portfolio selector buttons
    const pyramidPortfolioButtons = document.querySelectorAll('.pyramid-controls .selector-btn');
    pyramidPortfolioButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            pyramidPortfolioButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            createPyramidChart();
        });
    });
    
    // Pyramid period toggle buttons (whole year vs half year)
    const periodToggleButtons = document.querySelectorAll('#period-toggle-full, #period-toggle-half, #period-toggle-quarter');
    periodToggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodToggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            createPyramidChart();
        });
    });
    
    // Rebalancing selector buttons for allocation chart
    const rebalancingButtons = document.querySelectorAll('.rebalancing-selector .selector-btn');
    rebalancingButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            rebalancingButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Check if bubble chart button was clicked
            if (btn.dataset.view === 'bubble') {
                // Show bubble chart, hide allocation chart
                const allocationCanvas = document.getElementById('allocation-chart');
                const bubbleCanvas = document.getElementById('bubble-chart');
                const bubbleControls = document.getElementById('bubble-chart-controls');
                
                if (allocationCanvas) allocationCanvas.style.display = 'none';
                if (bubbleCanvas) {
                    bubbleCanvas.style.display = 'block';
                    // Force a reflow to ensure canvas is visible
                    bubbleCanvas.offsetHeight;
                }
                if (bubbleControls) bubbleControls.style.display = 'block';
                
                // Create bubble chart with delay to ensure canvas is visible
                setTimeout(() => {
                    createBubbleChart();
                }, 200);
                return;
            }
            
            // Show allocation chart, hide bubble chart
            const allocationCanvas = document.getElementById('allocation-chart');
            const bubbleCanvas = document.getElementById('bubble-chart');
            const bubbleControls = document.getElementById('bubble-chart-controls');
            
            if (allocationCanvas) allocationCanvas.style.display = 'block';
            if (bubbleCanvas) bubbleCanvas.style.display = 'none';
            if (bubbleControls) bubbleControls.style.display = 'none';
            
            // Update state based on data attribute
            const shouldRebalance = btn.dataset.rebalancing === 'true';
            state.allocationRebalancing = shouldRebalance;
            
            console.log('Rebalancing changed to:', state.allocationRebalancing);
            
            // Update chart - destroy completely
            if (state.charts.allocation) {
                try {
                    state.charts.allocation.destroy();
                } catch(e) {
                    console.warn('Error destroying chart:', e);
                }
                state.charts.allocation = null;
            }
            
            // Clear canvas
            if (allocationCanvas) {
                const ctx = allocationCanvas.getContext('2d');
                ctx.clearRect(0, 0, allocationCanvas.width, allocationCanvas.height);
            }
            
            // Force a small delay to ensure chart is fully destroyed
            setTimeout(() => {
                createAllocationChart();
            }, 10);
        });
    });
    
    // Set initial active state
    const initialActiveBtn = state.allocationRebalancing 
        ? document.getElementById('rebalancing-btn-yes')
        : document.getElementById('rebalancing-btn-no');
    if (initialActiveBtn) {
        rebalancingButtons.forEach(b => b.classList.remove('active'));
        initialActiveBtn.classList.add('active');
    }
    
    // Setup start capital editor
    setupStartCapitalEditor();
}

function updatePeriodDisplay() {
    // Update the period badge in header
    const periodBadge = document.getElementById('period-display');
    if (periodBadge) {
        const filteredData = getFilteredData();
        if (filteredData.length > 0) {
            const startYear = filteredData[0].date.getFullYear();
            const endYear = filteredData[filteredData.length - 1].date.getFullYear();
            const startMonth = filteredData[0].date.toLocaleDateString('no-NO', { month: 'short' });
            const endMonth = filteredData[filteredData.length - 1].date.toLocaleDateString('no-NO', { month: 'short' });
            
            if (state.selectedPeriod === 'ytd' || state.selectedPeriod === '12m') {
                // For short periods, show month and year
                periodBadge.textContent = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
            } else if (startYear === endYear) {
                periodBadge.textContent = startYear.toString();
            } else {
                periodBadge.textContent = `${startYear} - ${endYear}`;
            }
        }
    }
}

function updateStartCapitalDisplay() {
    // Update the start capital badge in header
    const startCapitalDisplay = document.getElementById('start-capital-display');
    if (startCapitalDisplay) {
        const capitalInMNOK = state.startCapital / 1000000;
        startCapitalDisplay.textContent = `${capitalInMNOK} MNOK`;
    }
}

/** Return period label for output (same logic as period-display badge). */
function getPeriodLabel() {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return '';
    const startYear = filteredData[0].date.getFullYear();
    const endYear = filteredData[filteredData.length - 1].date.getFullYear();
    const startMonth = filteredData[0].date.toLocaleDateString('no-NO', { month: 'short' });
    const endMonth = filteredData[filteredData.length - 1].date.toLocaleDateString('no-NO', { month: 'short' });
    if (state.selectedPeriod === 'ytd' || state.selectedPeriod === '12m') {
        return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
    if (startYear === endYear) return startYear.toString();
    return `${startYear} - ${endYear}`;
}

/** Expose for parent (Mål og behov) Output: startkapital, periode, aksjekapital dagens/ny. */
window.RisikoSimuleringGetOutputData = function () {
    const capitalInMNOK = state.startCapital / 1000000;
    return {
        startkapital: capitalInMNOK + ' MNOK',
        periode: getPeriodLabel(),
        aksjekapitalDagens: state.currentPortfolio.highYield,
        aksjekapitalNy: state.newPortfolio.highYield
    };
};

function setupStartCapitalEditor() {
    // Setup double-click to edit start capital
    const startCapitalDisplay = document.getElementById('start-capital-display');
    if (!startCapitalDisplay) return;
    
    startCapitalDisplay.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        
        const currentValue = state.startCapital / 1000000; // Convert to MNOK
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.min = '0.1';
        input.step = '0.1';
        input.style.width = '80px';
        input.style.fontFamily = 'var(--font-mono)';
        input.style.fontSize = 'var(--text-sm)';
        input.style.fontWeight = '600';
        input.style.textAlign = 'center';
        input.style.border = '2px solid var(--primary)';
        input.style.borderRadius = 'var(--radius-sm)';
        input.style.padding = '2px 4px';
        input.style.background = 'var(--card)';
        
        // Replace text with input
        const originalText = startCapitalDisplay.textContent;
        startCapitalDisplay.textContent = '';
        startCapitalDisplay.appendChild(input);
        input.focus();
        input.select();
        
        const finishEditing = () => {
            const newValue = parseFloat(input.value);
            if (!isNaN(newValue) && newValue > 0) {
                // Update start capital (convert from MNOK to NOK)
                state.startCapital = newValue * 1000000;
                updateStartCapitalDisplay();
                
                // Update all charts that depend on start capital
                updateCharts();
                
                // Update treemap charts
                updateTreemapChart('current');
                updateTreemapChart('new');
            } else {
                // Restore original value if invalid
                updateStartCapitalDisplay();
            }
        };
        
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing();
            } else if (e.key === 'Escape') {
                updateStartCapitalDisplay();
            }
        });
    });
}

function updateCharts() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    switch (activeTab) {
        case 'input':
            // Update treemap charts on input tab
            updateTreemapChart('current');
            updateTreemapChart('new');
            break;
        case 'portfolio-comparison':
            createOverviewChart();
            break;
        case 'allocation':
            // Check if bubble chart is active
            const bubbleBtn = document.getElementById('bubble-chart-btn');
            if (bubbleBtn && bubbleBtn.classList.contains('active')) {
                createBubbleChart();
            } else {
                createAllocationChart();
            }
            break;
        case 'comparison':
            createComparisonChart();
            updateMetrics();
            break;
        case 'drawdown':
            createDrawdownCharts();
            break;
        case 'nurse':
            createNurseChart(state.activeNurseTab);
            // Ensure chart wrapper is visible after chart creation, especially for max period
            setTimeout(() => {
                const wrapper = document.querySelector('#tab-nurse .chart-wrapper.large');
                if (wrapper) {
                    wrapper.style.display = 'block';
                    wrapper.style.visibility = 'visible';
                    wrapper.style.opacity = '1';
                    wrapper.style.minHeight = '400px';
                    wrapper.style.height = 'auto';
                    wrapper.style.flexShrink = '0';
                    // Force reflow
                    wrapper.offsetHeight;
                }
            }, 150);
            break;
        case 'pyramid':
            createPyramidChart();
            break;
        case 'assets':
            createAssetsGrid();
            break;
        case 'money':
            initializeMoneyValueCalculations();
            break;
    }
}

// ========================================
// Money Value Calculations (from Fremtidspenger)
// ========================================

// KPI data for historical calculations
const kpiData = {
    2001: 3.0,
    2002: 1.3,
    2003: 2.5,
    2004: 0.4,
    2005: 1.6,
    2006: 2.3,
    2007: 0.8,
    2008: 3.8,
    2009: 2.1,
    2010: 2.5,
    2011: 1.2,
    2012: 0.8,
    2013: 2.1,
    2014: 2.0,
    2015: 2.1,
    2016: 3.6,
    2017: 1.8,
    2018: 2.7,
    2019: 2.2,
    2020: 1.3,
    2021: 3.5,
    2022: 5.8,
    2023: 5.5,
    2024: 3.1,
    2025: 3.1
};

// Global variables for money value
let currentAmount = 700000;
let selectedHistoricalYear = 2025;
let selectedFutureYear = 2025;
let selectedKPI = 3;

// Initialize money value calculations
function initializeMoneyValueCalculations() {
    // Get DOM elements
    const amountSlider = document.getElementById('amount-slider');
    const amountDisplay = document.getElementById('amount-display');
    const presentAmount = document.getElementById('present-amount');
    const historicalYearSlider = document.getElementById('historical-year-slider');
    const historicalYearDisplay = document.getElementById('historical-year-display');
    const historicalAmount = document.getElementById('historical-amount');
    const futureYearSlider = document.getElementById('future-year-slider');
    const futureYearDisplay = document.getElementById('future-year-display');
    const futureAmount = document.getElementById('future-amount');

    if (!amountSlider || !historicalYearSlider || !futureYearSlider) {
        return; // Elements not found, skip initialization
    }

    // Initialize sliders
    initializeMoneySliders(amountSlider, amountDisplay, presentAmount, historicalYearSlider, historicalYearDisplay, historicalAmount, futureYearSlider, futureYearDisplay, futureAmount);
    
    // Initialize KPI buttons
    initializeKPIButtons();
    
    // Initialize modals
    initializeHistoricalKPIModal();
    initializeDisclaimerModal();
    
    // Update all calculations
    updateAllMoneyCalculations(historicalAmount, futureAmount, presentAmount, amountDisplay);
}

// Initialize sliders for money value
function initializeMoneySliders(amountSlider, amountDisplay, presentAmount, historicalYearSlider, historicalYearDisplay, historicalAmount, futureYearSlider, futureYearDisplay, futureAmount) {
    if (amountSlider) {
        const min = parseInt(amountSlider.min);
        const max = parseInt(amountSlider.max);
        updateSliderProgress(amountSlider, min, max);
        
        amountSlider.addEventListener('input', function() {
            currentAmount = parseInt(this.value);
            updateAmountDisplay(amountDisplay, presentAmount);
            updateAllMoneyCalculations(historicalAmount, futureAmount, presentAmount, amountDisplay);
            updateSliderProgress(this, min, max);
        });
    }

    if (historicalYearSlider) {
        const min = parseInt(historicalYearSlider.min);
        const max = parseInt(historicalYearSlider.max);
        updateSliderProgress(historicalYearSlider, min, max);
        
        historicalYearSlider.addEventListener('input', function() {
            selectedHistoricalYear = parseInt(this.value);
            updateHistoricalYearDisplay(historicalYearDisplay);
            updateAllMoneyCalculations(historicalAmount, futureAmount, presentAmount, amountDisplay);
            updateSliderProgress(this, min, max);
        });
    }

    if (futureYearSlider) {
        const min = parseInt(futureYearSlider.min);
        const max = parseInt(futureYearSlider.max);
        updateSliderProgress(futureYearSlider, min, max);
        
        futureYearSlider.addEventListener('input', function() {
            selectedFutureYear = parseInt(this.value);
            updateFutureYearDisplay(futureYearDisplay);
            updateAllMoneyCalculations(historicalAmount, futureAmount, presentAmount, amountDisplay);
            updateSliderProgress(this, min, max);
        });
    }
}

// Update slider progress fill
function updateSliderProgress(slider, min, max) {
    const value = parseInt(slider.value);
    const percentage = ((value - min) / (max - min)) * 100;
    const root = getComputedStyle(document.documentElement);
    const primaryColor = root.getPropertyValue('--primary').trim();
    const borderColor = root.getPropertyValue('--border').trim();
    slider.style.background = `linear-gradient(to right, ${primaryColor} 0%, ${primaryColor} ${percentage}%, ${borderColor} ${percentage}%, ${borderColor} 100%)`;
}

// Initialize KPI buttons
function initializeKPIButtons() {
    const kpiButtons = document.querySelectorAll('.kpi-btn');
    
    kpiButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            kpiButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update selected KPI
            selectedKPI = parseFloat(this.dataset.kpi);
            
            // Update calculations
            const historicalAmount = document.getElementById('historical-amount');
            const futureAmount = document.getElementById('future-amount');
            const presentAmount = document.getElementById('present-amount');
            const amountDisplay = document.getElementById('amount-display');
            updateAllMoneyCalculations(historicalAmount, futureAmount, presentAmount, amountDisplay);
        });
    });

    // Set default active button (3%)
    const defaultButton = document.querySelector('[data-kpi="3"]');
    if (defaultButton) {
        defaultButton.classList.add('active');
    }
}

// Update amount display
function updateAmountDisplay(amountDisplay, presentAmount) {
    const formattedAmount = formatMoneyNumber(currentAmount);
    if (amountDisplay) amountDisplay.textContent = '2025';
    if (presentAmount) presentAmount.textContent = formattedAmount + ',-';
}

// Update historical year display
function updateHistoricalYearDisplay(historicalYearDisplay) {
    if (historicalYearDisplay) historicalYearDisplay.textContent = selectedHistoricalYear;
}

// Update future year display
function updateFutureYearDisplay(futureYearDisplay) {
    if (futureYearDisplay) futureYearDisplay.textContent = selectedFutureYear;
}

// Calculate historical value (inflation adjustment)
function calculateHistoricalValue() {
    const referenceYear = 2025;
    
    if (selectedHistoricalYear === referenceYear) {
        return currentAmount;
    }

    let cumulativeInflation = 1;
    
    // Calculate cumulative inflation from historical year to 2025
    for (let year = selectedHistoricalYear; year < referenceYear; year++) {
        if (kpiData[year]) {
            cumulativeInflation *= (1 + kpiData[year] / 100);
        }
    }
    
    // Adjust current amount back to historical year
    return Math.round(currentAmount / cumulativeInflation);
}

// Calculate future value (discounting)
function calculateFutureValue() {
    const referenceYear = 2025;
    
    if (selectedFutureYear === referenceYear) {
        return currentAmount;
    }

    const yearsDifference = selectedFutureYear - referenceYear;
    const discountFactor = Math.pow(1 + selectedKPI / 100, yearsDifference);
    
    return Math.round(currentAmount * discountFactor);
}

// Update all calculations
function updateAllMoneyCalculations(historicalAmount, futureAmount, presentAmount, amountDisplay) {
    // Update historical value
    const historicalValue = calculateHistoricalValue();
    if (historicalAmount) historicalAmount.textContent = formatMoneyNumber(historicalValue) + ',-';
    
    // Update future value
    const futureValue = calculateFutureValue();
    if (futureAmount) futureAmount.textContent = formatMoneyNumber(futureValue) + ',-';
    
    // Update present amount
    updateAmountDisplay(amountDisplay, presentAmount);
}

// Format number with spaces as thousand separators
function formatMoneyNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Initialize Historical KPI Modal
let historicalKPIModalInitialized = false;
function initializeHistoricalKPIModal() {
    // Prevent duplicate initialization
    if (historicalKPIModalInitialized) {
        return;
    }
    
    const modal = document.getElementById('historical-kpi-modal');
    const openBtn = document.getElementById('historical-kpi-btn');
    const closeBtn = document.getElementById('close-modal');
    const tableBody = document.getElementById('kpi-table-body');

    if (!modal || !openBtn || !closeBtn || !tableBody) {
        return; // Elements not found
    }
    
    // Populate the table with KPI data (clear first to avoid duplicates)
    populateKPITable(tableBody);

    // Open modal
    openBtn.addEventListener('click', function() {
        // Re-populate table each time modal opens to ensure it has latest data
        populateKPITable(tableBody);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    historicalKPIModalInitialized = true;
}

// Populate KPI table with data
function populateKPITable(tableBody) {
    // Clear table first
    tableBody.innerHTML = '';
    
    // Get KPI data from state.data (CSV data) instead of hardcoded kpiData
    // This ensures we get all history from 1994
    const allData = state.data;
    
    // Group KPI data by year and calculate average per year
    const yearlyKPIs = {};
    
    allData.forEach(row => {
        if (row.date && row.kpi !== undefined && row.kpi !== null && !isNaN(row.kpi)) {
            const year = row.date.getFullYear();
            if (!yearlyKPIs[year]) {
                yearlyKPIs[year] = [];
            }
            yearlyKPIs[year].push(row.kpi);
        }
    });
    
    // Calculate average KPI per year and sort by year
    const sortedKPIData = Object.entries(yearlyKPIs)
        .map(([year, kpiValues]) => {
            const avgKPI = kpiValues.reduce((a, b) => a + b, 0) / kpiValues.length;
            return [parseInt(year), avgKPI];
        })
        .sort((a, b) => a[0] - b[0]); // Sort by year
    
    // Only show years from 1994 onwards
    const filteredKPIData = sortedKPIData.filter(([year]) => year >= 1994);
    
    filteredKPIData.forEach(([year, kpi]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${year}</td>
            <td>${kpi.toFixed(2)}%</td>
        `;
        tableBody.appendChild(row);
    });
}

// Initialize Disclaimer Modal
let disclaimerModalInitialized = false;
function initializeDisclaimerModal() {
    // Prevent duplicate initialization
    if (disclaimerModalInitialized) {
        return;
    }
    
    const modal = document.getElementById('disclaimer-modal');
    const openBtn = document.getElementById('disclaimer-btn');
    const closeBtn = document.getElementById('close-disclaimer-modal');

    if (!modal || !openBtn || !closeBtn) {
        return; // Elements not found
    }

    // Open modal
    openBtn.addEventListener('click', function() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    disclaimerModalInitialized = true;
}

// ========================================
// Pyramid Statistics Modal
// ========================================
let pyramidStatsModalInitialized = false;
function initializePyramidStatsModal() {
    // Prevent duplicate initialization
    if (pyramidStatsModalInitialized) {
        return;
    }
    
    const modal = document.getElementById('pyramid-stats-modal');
    const openBtn = document.getElementById('pyramid-stats-btn');
    const closeBtn = document.getElementById('close-pyramid-stats-modal');

    if (!modal || !openBtn || !closeBtn) {
        return; // Elements not found
    }

    // Open modal
    openBtn.addEventListener('click', function() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    pyramidStatsModalInitialized = true;
}

// ========================================
// Year by Year Modal
// ========================================
let yearByYearModalInitialized = false;
function initializeYearByYearModal() {
    if (yearByYearModalInitialized) {
        return;
    }
    
    const modal = document.getElementById('year-by-year-modal');
    const openBtn = document.getElementById('year-by-year-btn');
    const closeBtn = document.getElementById('close-year-by-year-modal');
    const fullscreenBtn = document.getElementById('year-by-year-fullscreen-btn');
    const tableBody = document.getElementById('year-by-year-table-body');
    const modalContent = modal?.querySelector('.modal-content');
    
    if (!modal || !openBtn || !closeBtn || !tableBody || !modalContent) {
        return;
    }
    
    // Open modal
    openBtn.addEventListener('click', function() {
        populateYearByYearTable(tableBody);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
        modalContent.classList.remove('fullscreen');
        document.body.style.overflow = '';
    });
    
    // Fullscreen toggle
    fullscreenBtn.addEventListener('click', function() {
        modalContent.classList.toggle('fullscreen');
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
            modalContent.classList.remove('fullscreen');
            document.body.style.overflow = '';
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            modalContent.classList.remove('fullscreen');
            document.body.style.overflow = '';
        }
    });
    
    yearByYearModalInitialized = true;
}

// Calculate yearly return and cumulative return for a portfolio
function calculateYearlyPortfolioMetrics(year, portfolio) {
    // Get all data for the year
    const yearData = state.data.filter(row => {
        const rowYear = row.date.getFullYear();
        return rowYear === year;
    });
    
    if (yearData.length < 2) {
        return { return: null, cumulativeReturn: null };
    }
    
    // Calculate portfolio values for each data point in the year
    const portfolioValues = calculatePortfolioValue(yearData, portfolio, state.startCapital);
    
    // Calculate yearly return (from first to last value of the year)
    const startValue = portfolioValues[0].value;
    const endValue = portfolioValues[portfolioValues.length - 1].value;
    const yearlyReturn = ((endValue - startValue) / startValue) * 100;
    
    // Calculate cumulative return from 1994 to this year
    // Get data from 1994 to the end of this year
    const dataFromStart = state.data.filter(row => {
        const rowYear = row.date.getFullYear();
        return rowYear >= 1994 && rowYear <= year;
    });
    
    let cumulativeReturn = null;
    if (dataFromStart.length >= 2) {
        const allPortfolioValues = calculatePortfolioValue(dataFromStart, portfolio, state.startCapital);
        const firstValue = allPortfolioValues[0].value;
        const lastValue = allPortfolioValues[allPortfolioValues.length - 1].value;
        cumulativeReturn = ((lastValue - firstValue) / firstValue) * 100;
    }
    
    return { return: yearlyReturn, cumulativeReturn: cumulativeReturn };
}

// Calculate half-year returns for a portfolio
function calculateHalfYearReturns(year, portfolio) {
    // Get all data for the year
    const yearData = state.data.filter(row => {
        const rowYear = row.date.getFullYear();
        return rowYear === year;
    });
    
    if (yearData.length < 2) {
        return { firstHalf: null, secondHalf: null };
    }
    
    // Calculate portfolio values for the entire year
    const yearPortfolioValues = calculatePortfolioValue(yearData, portfolio, state.startCapital);
    
    if (yearPortfolioValues.length < 2) {
        return { firstHalf: null, secondHalf: null };
    }
    
    // Find the midpoint of the year (end of June / start of July)
    // We'll use the data point closest to June 30
    const midYearDate = new Date(year, 5, 30); // Month 5 = June, day 30
    
    // Find the index closest to mid-year
    let midYearIndex = 0;
    let minDiff = Infinity;
    yearPortfolioValues.forEach((pv, index) => {
        const diff = Math.abs(pv.date - midYearDate);
        if (diff < minDiff) {
            minDiff = diff;
            midYearIndex = index;
        }
    });
    
    let firstHalfReturn = null;
    let secondHalfReturn = null;
    
    // Calculate first half return (start of year to mid-year)
    if (midYearIndex > 0) {
        const firstHalfStart = yearPortfolioValues[0].value;
        const firstHalfEnd = yearPortfolioValues[midYearIndex].value;
        firstHalfReturn = ((firstHalfEnd - firstHalfStart) / firstHalfStart) * 100;
    }
    
    // Calculate second half return (mid-year to end of year)
    if (midYearIndex < yearPortfolioValues.length - 1) {
        const secondHalfStart = yearPortfolioValues[midYearIndex].value;
        const secondHalfEnd = yearPortfolioValues[yearPortfolioValues.length - 1].value;
        secondHalfReturn = ((secondHalfEnd - secondHalfStart) / secondHalfStart) * 100;
    }
    
    return { firstHalf: firstHalfReturn, secondHalf: secondHalfReturn };
}

// Calculate quarterly returns for a portfolio
function calculateQuarterlyReturns(year, portfolio) {
    // Get all data for the year
    const yearData = state.data.filter(row => {
        const rowYear = row.date.getFullYear();
        return rowYear === year;
    });
    
    if (yearData.length < 2) {
        return { q1: null, q2: null, q3: null, q4: null };
    }
    
    // Calculate portfolio values for the entire year
    const yearPortfolioValues = calculatePortfolioValue(yearData, portfolio, state.startCapital);
    
    if (yearPortfolioValues.length < 2) {
        return { q1: null, q2: null, q3: null, q4: null };
    }
    
    // Define quarter boundaries
    const q1EndDate = new Date(year, 2, 31); // End of March (month 2 = March)
    const q2EndDate = new Date(year, 5, 30); // End of June (month 5 = June)
    const q3EndDate = new Date(year, 8, 30); // End of September (month 8 = September)
    
    // Find indices closest to quarter boundaries
    let q1Index = 0;
    let q2Index = 0;
    let q3Index = 0;
    let minDiffQ1 = Infinity;
    let minDiffQ2 = Infinity;
    let minDiffQ3 = Infinity;
    
    yearPortfolioValues.forEach((pv, index) => {
        const diffQ1 = Math.abs(pv.date - q1EndDate);
        const diffQ2 = Math.abs(pv.date - q2EndDate);
        const diffQ3 = Math.abs(pv.date - q3EndDate);
        
        if (diffQ1 < minDiffQ1) {
            minDiffQ1 = diffQ1;
            q1Index = index;
        }
        if (diffQ2 < minDiffQ2) {
            minDiffQ2 = diffQ2;
            q2Index = index;
        }
        if (diffQ3 < minDiffQ3) {
            minDiffQ3 = diffQ3;
            q3Index = index;
        }
    });
    
    let q1Return = null;
    let q2Return = null;
    let q3Return = null;
    let q4Return = null;
    
    // Calculate Q1 return (start of year to end of Q1)
    // EXACT same logic as "År for år" table - must match exactly
    // Q1 is calculated from start of year to the data point closest to Q1 end (March 31)
    // For 2023: Q1 end is March 31, closest data point is April 1 (index 1)
    // Q1 should be calculated from January 1 (index 0) to April 1 (index 1)
    if (yearPortfolioValues.length >= 2) {
        const q1Start = yearPortfolioValues[0].value;
        // q1Index should be 1 for 2023 (April is closest to March 31)
        // But if q1Index is 0, it means January is closest (shouldn't happen for 2023)
        const q1End = yearPortfolioValues[q1Index].value;
        // Calculate return from start of year to Q1 end
        q1Return = ((q1End - q1Start) / q1Start) * 100;
    }
    
    // Debug logging for 2023
    if (year === 2023) {
        const q1EndDate = new Date(year, 2, 31); // March 31
        console.log('calculateQuarterlyReturns - 2023:', {
            yearDataLength: yearData.length,
            portfolioValuesLength: yearPortfolioValues.length,
            q1EndDate: q1EndDate.toISOString().split('T')[0],
            q1Index: q1Index,
            q1Date: yearPortfolioValues[q1Index]?.date.toISOString().split('T')[0],
            q1StartValue: yearPortfolioValues[0]?.value,
            q1EndValue: yearPortfolioValues[q1Index]?.value,
            q1Return: q1Return,
            q2Index: q2Index,
            q3Index: q3Index,
            dates: yearPortfolioValues.map((pv, idx) => ({
                index: idx,
                date: pv.date.toISOString().split('T')[0],
                value: pv.value,
                diffToQ1End: Math.abs(pv.date - q1EndDate)
            }))
        });
    }
    
    // Calculate Q2 return (end of Q1 to end of Q2)
    // Q2 should be calculated if we have Q1 end and Q2 end
    if (q1Index < q2Index && q2Index < yearPortfolioValues.length) {
        const q2Start = yearPortfolioValues[q1Index].value;
        const q2End = yearPortfolioValues[q2Index].value;
        q2Return = ((q2End - q2Start) / q2Start) * 100;
    } else if (q1Index === q2Index && q2Index < yearPortfolioValues.length - 1) {
        // If Q1 and Q2 fall on same point, Q2 is 0% (no change)
        q2Return = 0;
    }
    
    // Calculate Q3 return (end of Q2 to end of Q3)
    // Q3 should be calculated if we have Q2 end and Q3 end
    const q2EndIndex = q2Index;
    if (q2EndIndex < q3Index && q3Index < yearPortfolioValues.length) {
        const q3Start = yearPortfolioValues[q2EndIndex].value;
        const q3End = yearPortfolioValues[q3Index].value;
        q3Return = ((q3End - q3Start) / q3Start) * 100;
    } else if (q2EndIndex === q3Index && q3Index < yearPortfolioValues.length - 1) {
        // If Q2 and Q3 fall on same point, Q3 is 0% (no change)
        q3Return = 0;
    }
    
    // Calculate Q4 return (end of Q3 to end of year)
    // Q4 should ALWAYS be calculated if we have data
    const q3EndIndex = q3Index;
    if (q3EndIndex < yearPortfolioValues.length - 1) {
        const q4Start = yearPortfolioValues[q3EndIndex].value;
        const q4End = yearPortfolioValues[yearPortfolioValues.length - 1].value;
        q4Return = ((q4End - q4Start) / q4Start) * 100;
    } else if (q3EndIndex === yearPortfolioValues.length - 1 && yearPortfolioValues.length > 1) {
        // If Q3 is the last point, Q4 is 0% (no change)
        q4Return = 0;
    }
    
    return { q1: q1Return, q2: q2Return, q3: q3Return, q4: q4Return };
}

// Populate year by year table
function populateYearByYearTable(tableBody) {
    tableBody.innerHTML = '';
    
    // Generate years from 1994 to 2025 (all available history)
    const years = [];
    // Get the actual year range from data
    let minYear = 1994;
    let maxYear = 2025;
    if (state.data.length > 0) {
        const firstYear = state.data[0].date.getFullYear();
        const lastYear = state.data[state.data.length - 1].date.getFullYear();
        minYear = Math.min(1994, firstYear);
        maxYear = lastYear;
    }
    
    for (let year = minYear; year <= maxYear; year++) {
        years.push(year);
    }
    
    years.forEach(year => {
        const currentMetrics = calculateYearlyPortfolioMetrics(year, state.currentPortfolio);
        const newMetrics = calculateYearlyPortfolioMetrics(year, state.newPortfolio);
        const halfYearReturns = calculateHalfYearReturns(year, state.newPortfolio);
        const quarterlyReturns = calculateQuarterlyReturns(year, state.newPortfolio);
        
        const row = document.createElement('tr');
        
        // Check if either portfolio has negative return
        const hasNegativeReturn = (currentMetrics.return !== null && currentMetrics.return < 0) ||
                                 (newMetrics.return !== null && newMetrics.return < 0);
        
        if (hasNegativeReturn) {
            row.classList.add('negative-year-row');
        }
        
        const yearCell = document.createElement('td');
        yearCell.textContent = year;
        
        const currentReturnCell = document.createElement('td');
        currentReturnCell.textContent = currentMetrics.return !== null 
            ? formatPercent(currentMetrics.return) 
            : '-';
        
        const currentCumulativeCell = document.createElement('td');
        currentCumulativeCell.textContent = currentMetrics.cumulativeReturn !== null 
            ? formatPercent(currentMetrics.cumulativeReturn) 
            : '-';
        
        const newReturnCell = document.createElement('td');
        newReturnCell.textContent = newMetrics.return !== null 
            ? formatPercent(newMetrics.return) 
            : '-';
        
        const newCumulativeCell = document.createElement('td');
        newCumulativeCell.textContent = newMetrics.cumulativeReturn !== null 
            ? formatPercent(newMetrics.cumulativeReturn) 
            : '-';
        
        const firstHalfCell = document.createElement('td');
        firstHalfCell.textContent = halfYearReturns.firstHalf !== null 
            ? formatPercent(halfYearReturns.firstHalf) 
            : '-';
        
        const secondHalfCell = document.createElement('td');
        secondHalfCell.textContent = halfYearReturns.secondHalf !== null 
            ? formatPercent(halfYearReturns.secondHalf) 
            : '-';
        
        const q1Cell = document.createElement('td');
        q1Cell.textContent = quarterlyReturns.q1 !== null 
            ? formatPercent(quarterlyReturns.q1) 
            : '-';
        
        const q2Cell = document.createElement('td');
        q2Cell.textContent = quarterlyReturns.q2 !== null 
            ? formatPercent(quarterlyReturns.q2) 
            : '-';
        
        const q3Cell = document.createElement('td');
        q3Cell.textContent = quarterlyReturns.q3 !== null 
            ? formatPercent(quarterlyReturns.q3) 
            : '-';
        
        const q4Cell = document.createElement('td');
        q4Cell.textContent = quarterlyReturns.q4 !== null 
            ? formatPercent(quarterlyReturns.q4) 
            : '-';
        
        row.appendChild(yearCell);
        row.appendChild(currentReturnCell);
        row.appendChild(currentCumulativeCell);
        row.appendChild(newReturnCell);
        row.appendChild(newCumulativeCell);
        row.appendChild(firstHalfCell);
        row.appendChild(secondHalfCell);
        row.appendChild(q1Cell);
        row.appendChild(q2Cell);
        row.appendChild(q3Cell);
        row.appendChild(q4Cell);
        
        tableBody.appendChild(row);
    });
}

// ========================================
// Initialization
// ========================================
async function init() {
    // Try to fetch the new CSV file (historiske kurser2.csv)
    try {
        const response = await fetch('historiske kurser2.csv');
        if (response.ok) {
            const csv = await response.text();
            state.data = parseCSV(csv);
            console.log('Loaded data from historiske kurser2.csv');
            
            // Debug: Log data range
            if (state.data.length > 0) {
                const firstDate = state.data[0].date;
                const lastDate = state.data[state.data.length - 1].date;
                console.log('CSV Data range:', {
                    firstYear: firstDate.getFullYear(),
                    lastYear: lastDate.getFullYear(),
                    totalDataPoints: state.data.length
                });
            }
        } else {
            throw new Error('Could not load CSV');
        }
    } catch (error) {
        console.log('Could not load historiske kurser2.csv, using embedded CSV data');
        state.data = parseCSV(csvData);
        
        // Debug: Log embedded data range
        if (state.data.length > 0) {
            const firstDate = state.data[0].date;
            const lastDate = state.data[state.data.length - 1].date;
            console.log('Embedded CSV Data range:', {
                firstYear: firstDate.getFullYear(),
                lastYear: lastDate.getFullYear(),
                totalDataPoints: state.data.length
            });
        }
    }
    
    // Setup UI
    updateSliderUI('current');
    updateSliderUI('new');
    
    // Set default active allocation buttons
    // 20% for current portfolio
    const current20Btn = document.querySelector('.allocation-btn[data-allocation="20"][data-portfolio="current"]');
    if (current20Btn) {
        // Remove active from all current portfolio buttons
        document.querySelectorAll('.allocation-btn[data-portfolio="current"]').forEach(btn => btn.classList.remove('active'));
        current20Btn.classList.add('active');
    }
    
    // 55% for new portfolio
    const new55Btn = document.querySelector('.allocation-btn[data-allocation="55"][data-portfolio="new"]');
    if (new55Btn) {
        // Remove active from all new portfolio buttons
        document.querySelectorAll('.allocation-btn[data-portfolio="new"]').forEach(btn => btn.classList.remove('active'));
        new55Btn.classList.add('active');
    }
    
    // Update period display
    updatePeriodDisplay();
    
    // Update start capital display
    updateStartCapitalDisplay();
    
    // Initialize treemap charts
    updateTreemapChart('current');
    updateTreemapChart('new');
    
    // Setup navigation and events
    setupTabNavigation();
    setupEventListeners();
    
    // Initialize modals (should work from start, not just when money tab is opened)
    initializeHistoricalKPIModal();
    initializeDisclaimerModal();
    initializeYearByYearModal();
    initializePyramidStatsModal();
    
    // Hent portefølje-knapp: hent Portefølje I+II+Likviditetsfond (2026) og aksjeandel Portefølje I fra Mål og behov
    const hentPortefoljeBtn = document.getElementById('hent-portefolje-btn');
    if (hentPortefoljeBtn) {
        hentPortefoljeBtn.addEventListener('click', function() {
            this.classList.add('active');
            let sum2026 = 0;
            let aksjeandelP1 = 0;
            try {
                // Prøv først å lese fra parent (Mål og behov) hvis vi er i iframe
                const parentState = (typeof window.parent !== 'undefined' && window.parent.MaalOgBehovState && window.parent.MaalOgBehovState.appState) ? window.parent.MaalOgBehovState.appState : null;
                if (parentState) {
                    sum2026 = Math.round((parentState.initialPortfolioSize || 0) + (parentState.pensionPortfolioSize || 0) + (parentState.additionalPensionAmount || 0));
                    aksjeandelP1 = parseFloat(parentState.row1StockAllocation) || 0;
                } else {
                    sum2026 = parseInt(localStorage.getItem('maalOgBehovSum2026') || '0', 10);
                    aksjeandelP1 = parseFloat(localStorage.getItem('maalOgBehovAksjeandelP1') || '0') || 0;
                }
            } catch (e) {
                sum2026 = parseInt(localStorage.getItem('maalOgBehovSum2026') || '0', 10);
                aksjeandelP1 = parseFloat(localStorage.getItem('maalOgBehovAksjeandelP1') || '0') || 0;
            }
            aksjeandelP1 = Math.max(0, Math.min(100, aksjeandelP1));
            if (sum2026 > 0) {
                state.startCapital = sum2026;
                updateStartCapitalDisplay();
            }
            // Sett Ny portefølje til aksjeandelen fra Portefølje I (kun Renter + Aksjer, som allokasjonsknappene)
            const stockAllocation = aksjeandelP1;
            state.newPortfolio.stocks = 0;
            state.newPortfolio.riskFree = 100 - stockAllocation;
            state.newPortfolio.highYield = stockAllocation;
            state.newPortfolio.nordicStocks = 0;
            state.newPortfolio.emergingMarkets = 0;
            updateSliderUI('new');
            // Aktiver den preset-knappen som matcher (0, 20, 45, 55, 65, 85, 100)
            const presets = [0, 20, 45, 55, 65, 85, 100];
            const closest = presets.reduce((prev, curr) => Math.abs(curr - aksjeandelP1) < Math.abs(prev - aksjeandelP1) ? curr : prev);
            const newPortfolioButtons = document.querySelectorAll('.allocation-btn[data-portfolio="new"]');
            newPortfolioButtons.forEach(b => b.classList.remove('active'));
            const matchBtn = document.querySelector(`.allocation-btn[data-portfolio="new"][data-allocation="${closest}"]`);
            if (matchBtn) matchBtn.classList.add('active');
            updateCharts();
            updateTreemapChart('current');
            updateTreemapChart('new');
        });
    }

    // Input fra Mål og behov (Output som ble limt inn og Last inn): oppdater state fra Risikosimulering-seksjonen
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'LOAD_INPUT' && typeof event.data.payload === 'string') {
            const text = event.data.payload.trim();
            const lines = text.split('\n').map(function (s) { return s.trim(); });
            let changed = false;
            lines.forEach(function (line) {
                const mStart = line.match(/^Startkapital:\s*(.+)$/i);
                if (mStart) {
                    const val = parseFloat(String(mStart[1]).replace(/\s*MNOK/i, '').replace(',', '.').trim());
                    if (!isNaN(val) && val > 0) {
                        state.startCapital = val * 1000000;
                        changed = true;
                    }
                }
                const mDagens = line.match(/^Aksjekapital i dagens portefølje:\s*([\d,.-]+)\s*%?$/i);
                if (mDagens) {
                    const val = parseFloat(String(mDagens[1]).replace(',', '.'));
                    if (!isNaN(val) && val >= 0 && val <= 100) {
                        state.currentPortfolio.highYield = val;
                        changed = true;
                    }
                }
                const mNy = line.match(/^Aksjekapital i ny portefølje:\s*([\d,.-]+)\s*%?$/i);
                if (mNy) {
                    const val = parseFloat(String(mNy[1]).replace(',', '.'));
                    if (!isNaN(val) && val >= 0 && val <= 100) {
                        state.newPortfolio.highYield = val;
                        changed = true;
                    }
                }
            });
            if (changed) {
                updateStartCapitalDisplay();
                updateSliderUI('current');
                updateSliderUI('new');
                updateCharts();
                updateTreemapChart('current');
                updateTreemapChart('new');
            }
        }
    });
    
    // Initialize first chart
    createOverviewChart();
    
    console.log('Portfolio Insight Dashboard initialized');
    console.log(`Loaded ${state.data.length} data points from ${state.data[0].date.getFullYear()} to ${state.data[state.data.length - 1].date.getFullYear()}`);
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
