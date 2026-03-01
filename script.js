/**
 * Calculates statistics about ORCA card usage from a CSV file and displays the
 * results on a webpage.
 */
function parseCSV(csvText) {
    // Handle CSV with multi-line quoted fields
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
            if (char === '\r') i++; // Skip \n in \r\n
            currentRow.push(currentField);
            if (currentRow.length > 1 || currentRow[0] !== '') {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }

    // Don't forget the last field/row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.length > 1 || currentRow[0] !== '') {
            rows.push(currentRow);
        }
    }

    return rows;
}

function runScript(exampleFile = false, year = null) {
    const yearInput = document.getElementById('year-input');
    const targetYear = String(year ?? yearInput?.value ?? '');
    const fileInput = document.getElementById('csvFileInput');
    const file = exampleFile
        ? "test-file.csv"
        : fileInput?.files?.[0] ?? null;

    if (!file) {
        console.error('No file selected.');
        return;
    }

    if (typeof file === 'string') {
        fetch(file)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch ${file}: ${response.statusText}`);
                return response.text();
            })
            .then(csvText => {
                const rows = parseCSV(csvText);
                const statistics = calculateRouteTotals(rows, targetYear);
                displayStats(statistics);
            })
            .catch(err => console.error(err));
    } else {
        const reader = new FileReader();
        reader.onload = function (e) {
            const csvText = e.target.result;
            const rows = parseCSV(csvText);
            const statistics = calculateRouteTotals(rows, targetYear);
            displayStats(statistics);
        };
        reader.readAsText(file);
    }
}

/**
 * Takes in statistics about ORCA card usage and updates the webpage to display the results.
 * @param {Object} statistics 
 */
function displayStats(statistics) {
    // Statistics = [[route numbers], number of taps, topRoutes, topStops, topDates, sortedRouteCount, sortedStopCount, sortedBusCount, topBuses, targetYear]
    const output = document.getElementById('stats-output');

    // Check to see if statistics are valid before trying to display them
    if (!statistics || statistics.length === 0 || Object.entries(statistics[0]).length === 0) {
        console.error(`No data available for ${statistics[10]}.`);
        output.innerHTML = (
            `<div class="dialog dialog--error">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <p>No data available for ${statistics[10]}.</p>
            </div>`
        )
        return;
    }

    output.innerHTML = (
        `<div class="result" id="wrapped-result">
            <div class="result-header">
                <div class="stat-row">
                    <h3>ORCA Wrapped ${statistics[10]}</h3>
                </div>
            </div>
            <div class="headline-stats">
                <div class="stat-row">
                    <h2 class="number-stat">${Object.entries(statistics[0]).length}</h2><h2> transit routes ridden</h2>
                </div>
                <div class="stat-row">
                    <h2 class="number-stat">${statistics[1]}</h2><h2>card taps</h2>
                </div>
                <div class="stat-row">
                    <h2 class="number-stat">${Object.entries(statistics[2]).length}</h2><h2> stops visited</h2>
                </div>
                <div class="stat-row">
                    <h3>Busiest day: </h3><h3 class="number-stat">${statistics[5][0][0]} (${statistics[5][0][1]} trips)</h3>
                </div>
            </div>
            <div class="details-container">
                <div class="list-container">
                    <div class="stat-row">
                        <p>Top 5 Routes:</p>
                    </div>
                    <div>
                        <ul>
                            ${statistics[3].map(([key, value]) => `<li>${key} | ${value} trips</li>`).join("")}
                        </ul>
                    </div>
                </div>
                <div class="list-container">
                    <div class="stat-row">
                        <p>Top 5 Stops:</p>
                    </div>
                    <div>
                        <ul>
                            ${statistics[4].map(([key, value]) => `<li>${key} | ${value} taps</li>`).join("")}
                        </ul>
                    </div>
                </div>
            </div>
            <div class="result-footer">
                <p>Created on moshobo.github.io/orca-wrapped</p>
            </div>
        </div>
        <div>
            <button onClick="saveAsImage()">Download</button>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="script.js"></script>
        <div>
            <div class="list-container list-container-no-background">
                <div class="stat-row">
                    <h3>All Routes</h3>
                </div>
                <div>
                    <ul>
                        ${statistics[6].map(([key, value]) => `<li>${key} | ${value} trips</li>`).join("")}
                    </ul>
                </div>
            </div>
            <div class="list-container list-container-no-background">
                <div class="stat-row">
                    <h3>All Stops</h3>
                </div>
                <div>
                    <ul>
                        ${statistics[7].map(([key, value]) => `<li>${key} | ${value} taps</li>`).join("")}
                    </ul>
                </div>
            </div>
            <div class="list-container list-container-no-background">
                <div class="stat-row">
                    <h3>All Busses</h3>
                </div>
                <div>
                    <ul>
                        ${statistics[8].map(([key, value]) => `<li>#${key} | ${value} trips</li>`).join("")}
                    </ul>
                </div>
            </div>
        </div>`
    )
}

/**
 * Takes rows of data and the target year of interest and calculates key statistics
 * @param {Array<Array<string>>} rows 
 * @param {string} targetYear 
 * @returns {Object}
 */
function calculateRouteTotals(rows, targetYear) {
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const locationIndex = headers.indexOf('Location');
    const activityIndex = headers.indexOf('Activity');
    const dateIndex = headers.indexOf('Date');

    const filteredRows = dataRows.filter(row => {
        // Guard against malformed/empty rows in the CSV
        if (!row || row.length === 0) return false;

        const activityCell = row[activityIndex];
        const dateCell = row[dateIndex];

        // Skip rows where required cells are missing
        if (!activityCell || !dateCell) return false;

        const activity = activityCell.split(', ')[0];
        const date = dateCell;
        const year = date.split("/")[2]; // Extract year from "MM/dd/YYYY" format

        return (
            (activity === "Transfer" || activity === "Boarding" || activity === "ClientFare") &&
            year === targetYear
        );
    });

    let stopCount = {}
    var routeCount = {}
    var dateCount = {}
    var busCount = {}
    var paymentTerminalsWSF = ['Seattle', 'Edmonds', 'Fauntleroy', 'Southworth', 'Point Defiance', 'Mukilteo', 'Port Townsend', 'Anacortes']

    filteredRows.forEach(row => {
        const locationArray = row[locationIndex].split(': ') // ['Line','4 ..., Stop', '23rd...']

        let routeLongName = null
        let stop = null
        let date = null

        // Parse data out of Location column
        const split_array = row[locationIndex].split(', Stop: ')
        if (split_array.length === 2) { // Bus, Light Rail, or Washington State Ferry (WSF)
            routeLongName = split_array[0].split(': ')[1]
            stop = split_array[1]

            if (stop === "WSF") {
                // This is the only route that charges both directions, so the stop can't be determined from the route
                if (routeLongName === 'Point Townsend - Coupeville' || routeLongName === 'Coupeville - Point Townsend') {
                    stop = 'Point Townsend or Coupeville'
                }
                // Other routes only charge on one end of the route, so the stop can be determined from the route name
                else {
                    let stops = routeLongName.split(' - ')
                    stops = stops.map(s => s.trim());
                    const terminal = stops.find(s => paymentTerminalsWSF.includes(s));
                    if (terminal) {
                        stop = terminal;
                    }
                }

            }

            // Get bus number from activity column, if possible
            activity = row[activityIndex]
            const busMatch = activity.match(/Bus number:\s*(\d+)/i)
            if (busMatch) {
                const busNumber = busMatch[1]
                if (busNumber in busCount) {
                    busCount[busNumber] = busCount[busNumber] + 1
                } else {
                    busCount[busNumber] = 1
                }
            }

        } else if (locationArray.length === 2) { // Bus without Stop or Fast Ferry
            routeLongName = (locationArray[1])
        } else if (locationArray.length === 3) { // KCM Water taxi
            routeLongName = (locationArray[1] + ' ' + locationArray[2])
        } else { // Washington State Ferry or other
            routeLongName = locationArray
            if (locationArray[0] === "Washington State Ferry (WSF)") {
                routeLongName = "Washington State Ferry (WSF), undefined route"
            }
        }

        date = row[dateIndex]

        if (routeLongName in routeCount) {
            routeCount[routeLongName] = routeCount[routeLongName] + 1
        } else {
            routeCount[routeLongName] = 1
        }

        if (stop != null && stop in stopCount) {
            stopCount[stop] = stopCount[stop] + 1
        } else if (stop != null) {
            stopCount[stop] = 1
        }

        if (date in dateCount) {
            dateCount[date] = dateCount[date] + 1
        } else {
            dateCount[date] = 1
        }
    });

    const sortedRouteCount = Object.entries(routeCount).sort(([, valueA], [, valueB]) => valueB - valueA);
    const sortedStopCount = Object.entries(stopCount).sort(([, valueA], [, valueB]) => valueB - valueA); // Maybe sort this to not include "None"
    const sortedDateCount = Object.entries(dateCount).sort(([, valueA], [, valueB]) => valueB - valueA);
    const sortedBusCount = Object.entries(busCount).sort(([, valueA], [, valueB]) => valueB - valueA);

    const topRoutes = sortedRouteCount.slice(0, 5);
    const topStops = sortedStopCount.slice(0, 5);
    const topDates = sortedDateCount.slice(0, 1);
    const topBuses = sortedBusCount.slice(0, 1);

    return [
        routeCount,
        filteredRows.length,
        stopCount,
        topRoutes,
        topStops,
        topDates,
        sortedRouteCount,
        sortedStopCount,
        sortedBusCount,
        topBuses,
        targetYear
    ]
}

/**
 * Saves the statistics HTML as an PNG image file.
 */
function saveAsImage() {
    const fileInput = document.getElementById('csvFileInput')
    const file = fileInput.files[0];

    const yearInput = document.getElementById('year-input');
    const targetYear = yearInput.value;
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const csvText = e.target.result;
            const rows = parseCSV(csvText);
            statistics = calculateRouteTotals(rows, targetYear)
            printResult(statistics)
        };
        reader.readAsText(file);
    }

    setTimeout(() => {
        const element = document.getElementById("wrapped-result-printed");
        element.style.visibility = "visible";

        html2canvas(element).then((canvas) => {
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = "wrapped-result.png";
            link.click();
        });

        element.style.visibility = "hidden";
    }, 500);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates the HTML for the statistics in a print-friendly format that isn't 
 * dependent on the user's current viewport size. Inserts result into the DOM
 * @param {Object} statistics 
 */
function printResult(statistics) {
    // Statistics = [[route numbers], number of taps, [Stop Names], topRoutes, topStops]
    const output = document.getElementById('result-printed');
    output.innerHTML = (
        `<div class="result" id="wrapped-result-printed">
            <div class="result-header">
                <div class="stat-row">
                    <h3>ORCA Wrapped ${statistics[10]}</h3>
                </div>
            </div>
            <div class="headline-stats">
                <div class="stat-row">
                    <h2 class="number-stat">${Object.entries(statistics[0]).length}</h2><h2> transit routes ridden</h2>
                </div>
                <div class="stat-row">
                    <h2 class="number-stat">${statistics[1]}</h2><h2>card taps</h2>
                </div>
                <div class="stat-row">
                    <h2 class="number-stat">${Object.entries(statistics[2]).length}</h2><h2> stops visited</h2>
                </div>
                <div class="stat-row">
                    <h3>Busiest day: </h3><h3 class="number-stat">${statistics[5][0][0]} (${statistics[5][0][1]} trips)</h3>
                </div>
            </div>
            <div class="details-container">
                <div class="list-container">
                    <div class="stat-row">
                        <p>Top 5 Routes:</p>
                    </div>
                    <div>
                        <ul>
                            ${statistics[3].map(([key, value]) => `<li>${key} | ${value} trips</li>`).join("")}
                        </ul>
                    </div>
                </div>
                <div class="list-container">
                    <div class="stat-row">
                        <p>Top 5 Stops:</p>
                    </div>
                    <div>
                        <ul>
                            ${statistics[4].map(([key, value]) => `<li>${key} | ${value} taps</li>`).join("")}
                        </ul>
                    </div>
                </div>
            </div>
            <div class="result-footer">
                <p>Created on moshobo.github.io/orca-wrapped</p>
            </div>
        </div>`
    )
}