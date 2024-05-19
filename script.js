document.getElementById('generate-events').addEventListener('click', generateEvents);
document.getElementById('generate-plot').addEventListener('click', generatePlot);

function generateEvents() {
    const inputText = document.getElementById('activities').value.trim();
    const extractedEvents = extractEvents(inputText);

    let eventsDict = {};
    extractedEvents.forEach(event => {
        let eventDatetime = new Date(event[0]);
        let eventDescription = event[1];
        if (!eventsDict[eventDatetime] || eventDescription.length > eventsDict[eventDatetime].length) {
            eventsDict[eventDatetime] = eventDescription;
        }
    });

    let uniqueEvents = Object.entries(eventsDict).map(([dt, desc]) => [new Date(dt), desc]);
    uniqueEvents.sort((a, b) => a[0] - b[0]);

    let data = uniqueEvents.map(event => `${formatDate(event[0])} ${event[1]}`).join('\n');
    document.getElementById('events').value = data;
}

function generatePlot() {
    const events = document.getElementById('events').value.trim().split('\n');
    let eventList = events.map(event => {
        let parts = event.split(' ', 2);
        let dateTimeStr = `${parts[0]} ${parts[1]}`;
        return [new Date(dateTimeStr), event.slice(parts[0].length + parts[1].length + 2)];
    });

    eventList.sort((a, b) => a[0] - b[0]);
    const outputTable = document.getElementById('output-table');
    const outputPlot = document.getElementById('output-plot');
    
    outputTable.innerHTML = generateTable(eventList);
    generateTimeline(eventList);
}

function generateTable(eventList) {
    let table = `<table border="1" style="width: 100%; border-collapse: collapse;">
        <tr>
            <th>Time</th>
            <th>Event</th>
        </tr>`;
    eventList.reverse().forEach(event => {
        let color = event[1].includes('Project Rework') ? 'red' : 'black';
        table += `<tr>
            <td>${formatDate(event[0])}</td>
            <td style="color: ${color};">${event[1]}</td>
        </tr>`;
    });
    table += '</table>';
    return table;
}

function generateTimeline(eventList) {
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    d3.select("#output-plot").html('');

    const svg = d3.select("#output-plot").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    x.domain(d3.extent(eventList, d => d[0]));
    y.domain([0, eventList.length - 1]);

    const line = d3.line()
        .x(d => x(d[0]))
        .y((d, i) => y(i));

    svg.append("path")
        .data([eventList])
        .attr("class", "line")
        .attr("d", line)
        .attr("stroke", "green")
        .attr("fill", "none");

    svg.selectAll("dot")
        .data(eventList)
        .enter().append("circle")
        .attr("r", 5)
        .attr("cx", d => x(d[0]))
        .attr("cy", (d, i) => y(i))
        .attr("fill", "green");

    svg.selectAll("text")
        .data(eventList)
        .enter().append("text")
        .attr("x", d => x(d[0]) + 5)
        .attr("y", (d, i) => y(i))
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .text(d => d[1]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat('').tickSize(0));
}

function extractEvents(inputText) {
    const lines = inputText.trim().split('\n');
    const events = [];
    let currentDate = null;
    let currentTime = null;

    const datePattern = /\d{2}\/\d{2}\/\d{4}/;
    const timePattern = /\d{1,2}:\d{2} (?:AM|PM)/;

    for (let index = 0; index < lines.length; index++) {
        let line = lines[index].trim();

        if (datePattern.test(line)) {
            currentDate = line;
            continue;
        }

        if (timePattern.test(line)) {
            currentTime = line;
            continue;
        }

        if (currentDate && currentTime) {
            const dateTimeStr = new Date(`${currentDate} ${currentTime}`);
            
            if (line.toLowerCase().includes('created project')) {
                events.push([dateTimeStr, 'Project created']);
            } else if (line.toLowerCase().includes('changed the status to')) {
                const status = line.split('changed the status to')[1].trim();
                events.push([dateTimeStr, status]);
            } else if (line.toLowerCase().includes('assigned pilot to')) {
                let pilotName = extractPilotName(lines, index);
                events.push([dateTimeStr, `Assigned to Pilot${pilotName ? ` (${pilotName})` : ''}`]);
            } else if (line.toLowerCase().includes('changed the status to project rework')) {
                let reason = extractReworkReason(lines, index);
                events.push([dateTimeStr, `Project Rework${reason ? `: ${reason}` : ''}`]);
            }
        }
    }

    return events;
}

function extractPilotName(lines, currentIndex) {
    for (let i = currentIndex + 1; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('assigned pilot to')) {
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].trim()) {
                    return lines[j].trim();
                }
            }
        }
    }
    return null;
}

function extractReworkReason(lines, currentIndex) {
    for (let i = currentIndex + 1; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('title:')) {
            return lines[i].split('Title:')[1].trim();
        } else if (/\d{1,2}:\d{2} (?:AM|PM)|\d{2}\/\d{2}\/\d{4}/.test(lines[i])) {
            break;
        }
    }
    return null;
}

function formatDate(date) {
    return date.toLocaleString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
}
