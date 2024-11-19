function runScript() {
    const fileInput = document.getElementById('csvFileInput')
    const file = fileInput.files[0];

    const yearInput = document.getElementById('year-input');
    const targetYear = yearInput.value;
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvText = e.target.result;
            const rows = csvText.split('\n').map(row => row.split('","')); // Each values is wrapped in double quotes, since some values contain internal commas
            statistics = calculateRouteTotals(rows, targetYear)
            displayStats(statistics)
        };
        reader.readAsText(file);
    }
}

function displayStats(statistics) {
    // Statistics = [[route numbers], number of taps, [Stop Names], topRoutes, topStops]
    const output = document.getElementById('stats-output');
    output.innerHTML = (
        `<div class="result" id="wrapped-result">
            <div class="result-header">
                <div class="stat-row">
                    <h3>ORCA Wrapped ${statistics[8]}</h3>
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
            <div class="list-container" id="all-routes">
                <div class="stat-row">
                    <h3>All Routes</h3>
                </div>
                <div>
                    <ul>
                        ${statistics[6].map(([key, value]) => `<li>${key} | ${value} trips</li>`).join("")}
                    </ul>
                </div>
            </div>
            <div class="list-container" id="all-stops">
                <div class="stat-row">
                    <h3>All Stops</h3>
                </div>
                <div>
                    <ul>
                        ${statistics[7].map(([key, value]) => `<li>${key} | ${value} taps</li>`).join("")}
                    </ul>
                </div>
            </div>
        </div>`
    )
}

function calculateRouteTotals(rows, targetYear) {
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const locationIndex = headers.indexOf('Location');
    const activityIndex = headers.indexOf('Activity');
    const dateIndex = headers.indexOf('"Date'); // TODO: Figure out how to get rid of the orphaned double-quote

    const filteredRows = dataRows.filter(row => {
        const activity = row[activityIndex].split(', ')[0];
        const date = row[dateIndex];
        const year = date.split("/")[2]; // Extract year from "MM/dd/YYYY" format

        return (
            (activity === "Transfer" || activity === "Boarding") &&
            year === targetYear
        );
    });

    let stopCount = {}
    var routeCount = {}
    var dateCount = {}
    filteredRows.forEach(row => {
        const locationArray = row[locationIndex].split(': ') // ['Line','4 ..., Stop', '23rd...']

        let route = null
        let stop = null
        let date = null
        const split_array = row[locationIndex].split(', Stop: ')
        if (split_array.length === 2) { // Bus Route
            route = split_array[0].split(': ')[1]
            stop = split_array[1]
        } else { // Water taxi
            route = (locationArray[1] + ' ' + locationArray[2])
        }

        date = row[dateIndex].split('"')[1] // TODO: Figure out how to get rid of orphaned quote on date. Comes from row splitting on (",")
        
        const routeLongName = route 
        // const routeShortName = route.split(' ')[0]

        if (routeLongName in routeCount) {
            routeCount[routeLongName] = routeCount[routeLongName] + 1
        } else {
            routeCount[routeLongName] = 1
        }

        if (stop in stopCount) { // Add "and not None"
            stopCount[stop] = stopCount[stop] + 1
        } else {
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

    const topRoutes = sortedRouteCount.slice(0,5);
    const topStops = sortedStopCount.slice(0, 5);
    const topDates = sortedDateCount.slice(0, 1);

    return [routeCount, filteredRows.length, stopCount, topRoutes, topStops, topDates, sortedRouteCount, sortedStopCount, targetYear]
}

function saveAsImage() {
    const fileInput = document.getElementById('csvFileInput')
    const file = fileInput.files[0];

    const yearInput = document.getElementById('year-input');
    const targetYear = yearInput.value;
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvText = e.target.result;
            const rows = csvText.split('\n').map(row => row.split('","')); // Each values is wrapped in double quotes, since some values contain internal commas
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
  
  function printResult(statistics) {
    // Statistics = [[route numbers], number of taps, [Stop Names], topRoutes, topStops]
    const output = document.getElementById('result-printed');
    output.innerHTML = (
        `<div class="result" id="wrapped-result-printed">
            <div class="result-header">
                <div class="stat-row">
                    <h3>ORCA Wrapped ${statistics[8]}</h3>
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