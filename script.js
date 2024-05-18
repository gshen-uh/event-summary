document.getElementById('generateEvents').addEventListener('click', generateEvents);
document.getElementById('generatePlot').addEventListener('click', generatePlot);

function generateEvents() {
    const inputText = document.getElementById('activities').value.trim();
    const eventsBox = document.getElementById('events');
    const extractedEvents = extractEvents(inputText);

    const data = extractedEvents.map(event => {
        const date = new Date(event[0]);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} ${event[1]}`;
    }).join('\n');

    eventsBox.value = data;
}

function generatePlot() {
    const eventsBox = document.getElementById('events');
    const events = eventsBox.value.trim().split('\n');
    const eventList = events.map(event => {
        const [dateStr, timeStr, ...descriptionParts] = event.split(' ');
        const dateTimeStr = `${dateStr} ${timeStr}`;
        const dateTime = new Date(dateTimeStr);
        const description = descriptionParts.join(' ');
        return { date: dateTime, description: description };
    });

    eventList.sort((a, b) => a.date - b.date);

    const outputTable = document.getElementById('outputTable');
    outputTable.innerHTML = generateEventTable(eventList.reverse());

    generateEventPlot(eventList.reverse());
}

function extractEvents(inputText) {
    const lines = inputText.split('\n').map(line => line.trim());
    const events = [];
    let currentDate = null;
    let currentTime = null;

    const datePattern = /\d{2}\/\d{2}\/\d{4}/;
    const timePattern = /\d{1,2}:\d{2} (?:AM|PM)/;

    lines.forEach(line => {
        if (datePattern.test(line)) {
            currentDate = line;
        } else if (timePattern.test(line)) {
            currentTime = line;
        } else if (line.toLowerCase().includes('created project')) {
            const eventTime = `${currentDate} ${currentTime}`;
            events.push([eventTime, 'Project created']);
        } else if (line.toLowerCase().includes('changed the status to assigned to pilot')) {
            const eventTime = `${currentDate} ${currentTime}`;
            const pilotName = lines.slice(lines.indexOf(line) + 1).find(l => l.trim());
            events.push([eventTime, `Assigned to Pilot (${pilotName})`]);
        } else if (line.toLowerCase().includes('changed the status to project rework')) {
            const eventTime = `${currentDate} ${currentTime}`;
            const reasonTitle = lines.slice(lines.indexOf(line) + 1).find(l => l.toLowerCase().includes('title:')).split('Title:')[1].trim();
            events.push([eventTime, `Project Rework: ${reasonTitle}`]);
        } else if (line.toLowerCase().includes('changed the status to')) {
            const eventTime = `${currentDate} ${currentTime}`;
            const status = line.split('changed the status to').pop().trim();
            events.push([eventTime, status]);
        }
    });

    return events;
}

function generateEventTable(events) {
    const tableHeader = `
        <table style='width:100%; border:1px solid black; border-collapse:collapse;'>
            <tr style='border:1px solid black;'>
                <th style='border:1px solid black; padding:4px; text-align:left;'>Time</th>
                <th style='border:1px solid black; padding:4px; text-align:right;'>Event</th>
            </tr>
    `;

    const tableRows = events.map(event => {
        const color = event.description.includes('Project Rework') ? 'red' : 'black';
        return `
            <tr style='border:1px solid black;'>
                <td style='border:1px solid black; padding:4px; text-align:left;'>${event.date.toISOString().slice(0, 19).replace('T', ' ')}</td>
                <td style='border:1px solid black; padding:4px; text-align:right; color:${color};'>${event.description}</td>
            </tr>
        `;
    }).join('');

    return tableHeader + tableRows + '</table>';
}

function generateEventPlot(events) {
    const outputPlot = document.getElementById('outputPlot');
    outputPlot.innerHTML = '';

    const width = 800;
    const height = 400;

    const svg = d3.select('#outputPlot')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const x = d3.scaleTime()
        .domain(d3.extent(events, d => d.date))
        .range([0, plotWidth]);

    const y = d3.scaleLinear()
        .domain([0, events.length - 1])
        .range([0, plotHeight]);

    const line = d3.line()
        .x(d => x(d.date))
        .y((d, i) => y(i));

    svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .append('path')
        .datum(events)
        .attr('fill', 'none')
        .attr('stroke', 'green')
        .attr('stroke-width', 1.5)
        .attr('d', line);

    svg.append('g')
        .attr('transform', `translate(${margin.left},${plotHeight + margin.top})`)
        .call(d3.axisBottom(x).ticks(d3.timeDay.every(1)).tickFormat(d3.timeFormat('%b %d')))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .selectAll('.dot')
        .data(events)
        .enter().append('circle')
        .attr('cx', d => x(d.date))
        .attr('cy', (d, i) => y(i))
        .attr('r', 5)
        .attr('fill', 'green');

    svg.append('text')
        .attr('transform', `translate(${width / 2},${margin.top / 2})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text(document.getElementById('projectId').value);
}
