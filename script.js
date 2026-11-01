"use strict";

/* =========================================================
   AERONEXIS SKYROUTE
   15 airports | Dijkstra | Interactive canvas | Fuel calculator
   Weather and airport operations use simulated sample data.
   ========================================================= */

/* ---------- AIRPORT DATA ---------- */

const airports = [
  { name: "Chandigarh", code: "IXC", x: 0.12, y: 0.18 },
  { name: "Delhi", code: "DEL", x: 0.32, y: 0.27 },
  { name: "Amritsar", code: "ATQ", x: 0.08, y: 0.39 },
  { name: "Jaipur", code: "JAI", x: 0.23, y: 0.48 },
  { name: "Lucknow", code: "LKO", x: 0.48, y: 0.38 },
  { name: "Ahmedabad", code: "AMD", x: 0.26, y: 0.70 },
  { name: "Mumbai", code: "BOM", x: 0.38, y: 0.84 },
  { name: "Pune", code: "PNQ", x: 0.49, y: 0.75 },
  { name: "Goa", code: "GOI", x: 0.47, y: 0.96 },
  { name: "Hyderabad", code: "HYD", x: 0.63, y: 0.72 },
  { name: "Bengaluru", code: "BLR", x: 0.61, y: 0.91 },
  { name: "Chennai", code: "MAA", x: 0.79, y: 0.88 },
  { name: "Kolkata", code: "CCU", x: 0.83, y: 0.39 },
  { name: "Kochi", code: "COK", x: 0.56, y: 0.98 },
  { name: "Guwahati", code: "GAU", x: 0.96, y: 0.30 }
];

/* Connections are bidirectional; distances are sample kilometres. */

const connections = [
  ["Chandigarh", "Delhi", 250],
  ["Chandigarh", "Amritsar", 230],
  ["Chandigarh", "Jaipur", 510],
  ["Delhi", "Amritsar", 450],
  ["Delhi", "Jaipur", 280],
  ["Delhi", "Lucknow", 420],
  ["Delhi", "Ahmedabad", 775],
  ["Delhi", "Mumbai", 1150],
  ["Delhi", "Kolkata", 1300],
  ["Delhi", "Guwahati", 1450],
  ["Amritsar", "Jaipur", 650],
  ["Jaipur", "Ahmedabad", 540],
  ["Jaipur", "Mumbai", 920],
  ["Lucknow", "Kolkata", 800],
  ["Lucknow", "Mumbai", 1200],
  ["Lucknow", "Hyderabad", 1080],
  ["Ahmedabad", "Mumbai", 440],
  ["Ahmedabad", "Pune", 520],
  ["Mumbai", "Pune", 120],
  ["Mumbai", "Goa", 590],
  ["Mumbai", "Hyderabad", 620],
  ["Pune", "Hyderabad", 500],
  ["Pune", "Bengaluru", 840],
  ["Goa", "Bengaluru", 560],
  ["Goa", "Kochi", 610],
  ["Hyderabad", "Bengaluru", 500],
  ["Hyderabad", "Chennai", 520],
  ["Bengaluru", "Chennai", 350],
  ["Bengaluru", "Kochi", 500],
  ["Chennai", "Kochi", 530],
  ["Kolkata", "Guwahati", 520],
  ["Kolkata", "Chennai", 1360]
];

/* ---------- GLOBAL STATE ---------- */

const graph = Object.create(null);
const restrictedRoutes = new Set();

let selectedRoute = [];
let lastSource = "";
let lastDestination = "";
let lastRouteDistance = 0;
let lastRouteFound = false;
let airportClickSelection = [];

let canvas = null;
let context = null;
let canvasWidth = 900;
let canvasHeight = 560;
let resizeObserver = null;

const $ = id => document.getElementById(id);

airports.forEach(airport => {
  graph[airport.name] = [];
});

connections.forEach(([from, to, distance]) => {
  graph[from].push({ airport: to, distance });
  graph[to].push({ airport: from, distance });
});

function formatNumber(value) {
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function routeKey(a, b) {
  return [a, b].sort().join("|");
}

function isRouteRestricted(a, b) {
  return restrictedRoutes.has(routeKey(a, b));
}

function getAirport(name) {
  return airports.find(airport => airport.name === name);
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function getConnectionCount() {
  return connections.length - restrictedRoutes.size;
}

/* ---------- AIRPORT DROPDOWNS ---------- */

function initialiseAirportMenus() {
  const source = $("source");
  const destination = $("destination");

  if (!source || !destination) {
    console.error("SkyRoute: airport dropdowns are missing.");
    return;
  }

  source.replaceChildren();
  destination.replaceChildren();

  airports.forEach(airport => {
    source.add(new Option(
      `${airport.name} (${airport.code})`,
      airport.name
    ));

    destination.add(new Option(
      `${airport.name} (${airport.code})`,
      airport.name
    ));
  });

  source.value = "Chandigarh";
  destination.value = "Bengaluru";

  setText("airportCount", airports.length);
}

/* ---------- DIJKSTRA SHORTEST-PATH ALGORITHM ---------- */

function findShortestPath(source, destination) {
  if (!graph[source] || !graph[destination]) return null;

  const distances = Object.create(null);
  const previous = Object.create(null);
  const unvisited = new Set(airports.map(a => a.name));

  airports.forEach(airport => {
    distances[airport.name] = Infinity;
    previous[airport.name] = null;
  });

  distances[source] = 0;

  while (unvisited.size > 0) {
    let current = null;
    let minimum = Infinity;

    for (const name of unvisited) {
      if (distances[name] < minimum) {
        minimum = distances[name];
        current = name;
      }
    }

    if (current === null) break;
    if (current === destination) break;

    unvisited.delete(current);

    graph[current].forEach(edge => {
      if (!unvisited.has(edge.airport)) return;
      if (isRouteRestricted(current, edge.airport)) return;

      const newDistance = distances[current] + edge.distance;

      if (newDistance < distances[edge.airport]) {
        distances[edge.airport] = newDistance;
        previous[edge.airport] = current;
      }
    });
  }

  if (distances[destination] === Infinity) return null;

  const path = [];
  let current = destination;

  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  if (path[0] !== source) return null;

  return {
    path,
    distance: distances[destination]
  };
}

/* ---------- ROUTE CALCULATION ---------- */

function handleFindRoute(event) {
  if (event) event.preventDefault();

  const source = $("source")?.value;
  const destination = $("destination")?.value;

  if (!source || !destination) return;

  lastSource = source;
  lastDestination = destination;

  if (source === destination) {
    selectedRoute = [];
    lastRouteFound = false;
    lastRouteDistance = 0;

    $("result").innerHTML = `
      <div class="empty-state">
        <h3>Choose two different airports</h3>
        <p>Departure and destination cannot be the same.</p>
      </div>`;

    $("steps").innerHTML =
      "<li>Choose two different airports.</li>";

    setText("mapSelectionStatus",
      "Choose two different airports.");

    updateOverview();
    drawGraph();
    updateOperationsRecommendation();
    return;
  }

  const result = findShortestPath(source, destination);

  if (!result) {
    selectedRoute = [];
    lastRouteFound = false;
    lastRouteDistance = 0;

    $("result").innerHTML = `
      <div class="empty-state">
        <h3>No available route</h3>
        <p>
          No complete route was found. Reopen some restricted
          connections and try again.
        </p>
      </div>`;

    $("steps").innerHTML = `
      <li>Checked the network from ${source}.</li>
      <li>Ignored closed connections.</li>
      <li>No complete route to ${destination} was available.</li>`;

    setText("mapSelectionStatus",
      `No available route: ${source} → ${destination}.`);

    updateOverview();
    drawGraph();
    updateOperationsRecommendation();
    return;
  }

  selectedRoute = result.path;
  lastRouteDistance = result.distance;
  lastRouteFound = true;

  displayRouteResult(result);

  setText("mapSelectionStatus",
    `Route selected: ${source} → ${destination}`);

  updateOverview();
  drawGraph();
  updateOperationsRecommendation();
}

/* ---------- DISPLAY ROUTE RESULTS ---------- */

function displayRouteResult(result) {
  const stops = Math.max(0, result.path.length - 2);

  const routeMarkup = result.path.map((name, index) => {
    const airport = getAirport(name);

    return `
      <div class="route-stop">
        <span class="route-stop-number">${index + 1}</span>
        <div>
          <strong>${airport.name}</strong>
          <small>${airport.code}</small>
        </div>
      </div>
      ${index < result.path.length - 1
        ? '<div class="route-connector"></div>'
        : ""}`;
  }).join("");

  $("result").innerHTML = `
    <div class="result-header">
      <span class="pill green-pill">ROUTE FOUND</span>
      <span class="muted small">Dijkstra's algorithm</span>
    </div>

    <div class="route-summary">
      <div>
        <span class="summary-label">DISTANCE</span>
        <strong>${formatNumber(result.distance)} km</strong>
      </div>
      <div>
        <span class="summary-label">FLIGHT LEGS</span>
        <strong>${result.path.length - 1}</strong>
      </div>
      <div>
        <span class="summary-label">INTERMEDIATE STOPS</span>
        <strong>${stops}</strong>
      </div>
    </div>

    <h3 class="route-list-heading">Recommended route</h3>
    <div class="route-list">${routeMarkup}</div>`;

  $("steps").innerHTML = [
    `Start at ${result.path[0]}.`,
    "Dijkstra evaluates available connections.",
    `Shortest route: ${result.path.join(" → ")}.`,
    `Total distance: ${formatNumber(result.distance)} km.`
  ].map(step => `<li>${step}</li>`).join("");

  const fuelButton = $("useRouteFuel");
  if (fuelButton) fuelButton.disabled = false;
}

/* ---------- OVERVIEW METRICS ---------- */

function updateOverview() {
  setText("overviewAirports", airports.length);
  setText("overviewConnections", getConnectionCount());

  setText(
    "overviewDistance",
    lastRouteFound ? `${formatNumber(lastRouteDistance)} km` : "—"
  );

  setText(
    "overviewStatus",
    lastRouteFound ? "Available" : "Check route"
  );
}

/* ---------- CANVAS POSITION AND DRAWING ---------- */

function getCanvasPosition(airport) {
  const paddingX = 48;
  const paddingY = 40;

  return {
    x: paddingX + airport.x * (canvasWidth - paddingX * 2),
    y: paddingY + airport.y * (canvasHeight - paddingY * 2)
  };
}

function resizeCanvas() {
  if (!canvas || !context) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0) return;

  canvasWidth = rect.width;
  canvasHeight = canvasWidth * 560 / 900;

  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(canvasWidth * pixelRatio);
  canvas.height = Math.round(canvasHeight * pixelRatio);
  canvas.style.height = `${canvasHeight}px`;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  drawGraph();
}

function drawGraph() {
  if (!canvas || !context) return;

  const width = canvasWidth;
  const height = canvasHeight;

  if (width <= 0 || height <= 0) return;

  context.clearRect(0, 0, width, height);

  // Draw background grid.
  context.strokeStyle = "rgba(112,239,173,0.055)";
  context.lineWidth = 1;

  for (let x = 0; x < width; x += 28) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y < height; y += 28) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const routeEdges = new Set();

  for (let i = 0; i < selectedRoute.length - 1; i++) {
    routeEdges.add(routeKey(
      selectedRoute[i],
      selectedRoute[i + 1]
    ));
  }

  // Draw connections.
  connections.forEach(([from, to, distance]) => {
    const p1 = getCanvasPosition(getAirport(from));
    const p2 = getCanvasPosition(getAirport(to));

    const key = routeKey(from, to);
    const closed = restrictedRoutes.has(key);
    const highlighted = routeEdges.has(key);

    context.beginPath();
    context.moveTo(p1.x, p1.y);
    context.lineTo(p2.x, p2.y);

    context.lineWidth = highlighted ? 3 : 1;

    context.strokeStyle = closed
      ? "#ff8088"
      : highlighted
        ? "#70efad"
        : "rgba(151,178,162,0.23)";

    context.setLineDash(closed ? [5, 5] : []);
    context.stroke();
    context.setLineDash([]);

    if (highlighted) {
      context.font = "10px sans-serif";
      context.textAlign = "center";
      context.fillStyle = "#b7ffd6";

      context.fillText(
        `${distance} km`,
        (p1.x + p2.x) / 2,
        (p1.y + p2.y) / 2 - 6
      );
    }
  });

  // Draw airports.
  airports.forEach(airport => {
    const { x, y } = getCanvasPosition(airport);

    const onRoute = selectedRoute.includes(airport.name);
    const beingSelected =
      airportClickSelection.includes(airport.name);

    const active = onRoute || beingSelected;

    if (active) {
      context.beginPath();
      context.arc(x, y, 13, 0, Math.PI * 2);
      context.fillStyle = "rgba(112,239,173,0.13)";
      context.fill();

      context.beginPath();
      context.arc(x, y, 9, 0, Math.PI * 2);
      context.strokeStyle = "#70efad";
      context.lineWidth = 1.5;
      context.stroke();
    }

    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fillStyle = active ? "#70efad" : "#d6e9dd";
    context.fill();

    context.textAlign = "center";
    context.textBaseline = "top";
    context.font = "600 10px sans-serif";
    context.fillStyle = active ? "#a6ffce" : "#edf6ef";
    context.fillText(airport.code, x, y + 8);

    context.font = "9px sans-serif";
    context.fillStyle = "#9bb0a3";
    context.fillText(airport.name, x, y + 20);
  });
}

/* ---------- CLICKABLE AIRPORT NODES ---------- */

function handleAirportCanvasClick(event) {
  if (!canvas || !context) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  // Map browser click coordinates to the canvas drawing coordinates.
  const clickX =
    (event.clientX - rect.left) * canvasWidth / rect.width;

  const clickY =
    (event.clientY - rect.top) * canvasHeight / rect.height;

  let nearest = null;
  let nearestDistance = Infinity;

  airports.forEach(airport => {
    const pos = getCanvasPosition(airport);

    const distance = Math.hypot(
      clickX - pos.x,
      clickY - pos.y
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = airport;
    }
  });

  // Only accept clicks close to a node.
  if (!nearest || nearestDistance > 20) {
    setText(
      "mapSelectionStatus",
      "Click directly on an airport node to select it."
    );
    return;
  }

  const source = $("source");
  const destination = $("destination");

  if (!source || !destination) return;

  // First click chooses departure.
  if (airportClickSelection.length === 0) {
    airportClickSelection = [nearest.name];

    source.value = nearest.name;

    selectedRoute = [];
    lastRouteFound = false;
    lastRouteDistance = 0;

    updateOverview();

    setText(
      "mapSelectionStatus",
      `Departure: ${nearest.name}. Now click a different airport for destination.`
    );

    drawGraph();
    return;
  }

  // Clicking the same departure again does not finish selection.
  if (nearest.name === airportClickSelection[0]) {
    setText(
      "mapSelectionStatus",
      `Departure is ${nearest.name}. Click a different airport for destination.`
    );
    return;
  }

  // Second click chooses destination.
  destination.value = nearest.name;
  airportClickSelection = [];

  setText(
    "mapSelectionStatus",
    `Calculating route: ${source.value} → ${destination.value}`
  );

  handleFindRoute();
}

/* ---------- CONNECTION RESTRICTIONS ---------- */

function initialiseRestrictions() {
  const container = $("airspaceButtons");
  if (!container) return;

  container.replaceChildren();

  connections.forEach(([from, to, distance]) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "restriction-button";
    button.dataset.route = routeKey(from, to);

    button.innerHTML = `
      <span>
        <strong>${from} ↔ ${to}</strong>
        <small>${distance} km</small>
      </span>
      <span class="restriction-state">OPEN</span>`;

    button.addEventListener("click", () => {
      const key = routeKey(from, to);

      if (restrictedRoutes.has(key)) {
        restrictedRoutes.delete(key);
      } else {
        restrictedRoutes.add(key);
      }

      const closed = restrictedRoutes.has(key);

      button.classList.toggle("is-restricted", closed);

      button.querySelector(".restriction-state").textContent =
        closed ? "CLOSED" : "OPEN";

      setText(
        "airspaceStatus",
        `${from} ↔ ${to} is now ${closed ? "closed" : "open"}.`
      );

      updateOverview();
      drawGraph();

      if (lastSource && lastDestination &&
          lastSource !== lastDestination) {
        handleFindRoute();
      }
    });

    container.appendChild(button);
  });
}

/* ---------- FUEL CALCULATOR ---------- */

function handleFuelCalculation(event) {
  event.preventDefault();

  const distance = Number($("fuelDistance").value);
  const rate = Number($("fuelRate").value);
  const price = Number($("fuelPrice").value);

  if (
    !Number.isFinite(distance) || distance <= 0 ||
    !Number.isFinite(rate) || rate <= 0 ||
    !Number.isFinite(price) || price < 0
  ) {
    setText(
      "fuelResult",
      "Enter a positive distance, positive fuel consumption, and a non-negative fuel price."
    );
    return;
  }

  const litres = distance * rate / 100;
  const cost = litres * price;

  $("fuelResult").innerHTML = `
    <div class="fuel-stat">
      <span>Estimated fuel required</span>
      <strong>${formatNumber(litres)} litres</strong>
    </div>
    <div class="fuel-stat">
      <span>Fuel price per litre</span>
      <strong>₹${formatNumber(price)}</strong>
    </div>
    <div class="fuel-stat total-cost">
      <span>Estimated fuel cost</span>
      <strong>₹${formatNumber(cost)}</strong>
    </div>`;
}

function useRouteDistanceForFuel() {
  if (!lastRouteFound) {
    setText(
      "fuelResult",
      "Calculate a valid route first, then use its distance here."
    );
    return;
  }

  $("fuelDistance").value = lastRouteDistance;

  $("fuelForm").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  $("fuelDistance").focus();
}

/* ---------- SIMULATED AIRPORT OPERATIONS ---------- */

const operationsData = [
  { airport: "Delhi", code: "DEL", congestion: "High", delay: 24, status: "Busy" },
  { airport: "Mumbai", code: "BOM", congestion: "Medium", delay: 12, status: "Moderate" },
  { airport: "Bengaluru", code: "BLR", congestion: "Low", delay: 5, status: "Normal" },
  { airport: "Kolkata", code: "CCU", congestion: "Medium", delay: 10, status: "Moderate" }
];

function initialiseOperations() {
  const container = $("operationsCards");
  if (!container) return;

  container.innerHTML = operationsData.map(item => `
    <div class="operation-card">
      <div class="operation-top">
        <strong>${item.airport}</strong>
        <span class="operation-code">${item.code}</span>
      </div>
      <p class="muted small">Sample congestion</p>
      <div class="congestion-row">
        <span class="congestion-dot ${item.congestion.toLowerCase()}"></span>
        <strong>${item.congestion}</strong>
      </div>
      <div class="operation-divider"></div>
      <div class="operation-detail">
        <span>Estimated delay</span><strong>${item.delay} min</strong>
      </div>
      <div class="operation-detail">
        <span>Status</span><strong>${item.status}</strong>
      </div>
    </div>`).join("");
}

function updateOperationsRecommendation() {
  const container = $("operationsRecommendation");
  if (!container) return;

  if (!lastRouteFound) {
    container.innerHTML = `
      <strong>Route advisory</strong>
      <p>Calculate a route to see whether it includes airports marked as busy in the sample data.</p>`;
    return;
  }

  const busy = operationsData.filter(item =>
    selectedRoute.includes(item.airport) &&
    item.congestion === "High"
  );

  if (busy.length) {
    container.innerHTML = `
      <strong>Operations advisory</strong>
      <p>
        Your route includes ${busy.map(item => item.airport).join(", ")},
        marked high congestion in this sample. Review alternative
        connections if available.
      </p>`;
  } else {
    container.innerHTML = `
      <strong>Route advisory</strong>
      <p>
        No airport marked high congestion in the sample operations list
        appears on this route. This is not a live operational assessment.
      </p>`;
  }
}

/* ---------- SIMULATED WEATHER ---------- */

const weatherData = [
  { airport: "Chandigarh", code: "IXC", temp: 27, condition: "Clear", wind: 9 },
  { airport: "Delhi", code: "DEL", temp: 31, condition: "Hazy", wind: 14 },
  { airport: "Mumbai", code: "BOM", temp: 29, condition: "Cloudy", wind: 18 },
  { airport: "Bengaluru", code: "BLR", temp: 24, condition: "Clear", wind: 8 },
  { airport: "Kolkata", code: "CCU", temp: 30, condition: "Cloudy", wind: 12 },
  { airport: "Chennai", code: "MAA", temp: 32, condition: "Sunny", wind: 11 }
];

function initialiseWeather() {
  const container = $("weatherResults");
  if (!container) return;

  container.innerHTML = weatherData.map(item => {
    const symbol = ["Clear", "Sunny"].includes(item.condition)
      ? "☀"
      : item.condition === "Hazy" ? "≋" : "☁";

    return `
      <div class="weather-card">
        <div class="weather-card-top">
          <div>
            <strong>${item.airport}</strong>
            <small>${item.code}</small>
          </div>
          <span class="weather-symbol">${symbol}</span>
        </div>
        <div class="weather-temperature">${item.temp}°C</div>
        <div class="weather-condition">${item.condition}</div>
        <div class="weather-wind">Wind: ${item.wind} km/h</div>
      </div>`;
  }).join("");
}

/* ---------- SWAP AIRPORTS ---------- */

function swapAirports() {
  const source = $("source");
  const destination = $("destination");

  if (!source || !destination) return;

  const oldSource = source.value;
  source.value = destination.value;
  destination.value = oldSource;

  airportClickSelection = [];
  handleFindRoute();
}

/* ---------- INITIALISE APPLICATION ---------- */

function initialiseApplication() {
  canvas = $("graphCanvas");

  if (canvas) {
    context = canvas.getContext("2d");
  }

  initialiseAirportMenus();
  initialiseRestrictions();
  initialiseOperations();
  initialiseWeather();

  $("routeForm")?.addEventListener(
    "submit",
    handleFindRoute
  );

  $("fuelForm")?.addEventListener(
    "submit",
    handleFuelCalculation
  );

  $("swapButton")?.addEventListener(
    "click",
    swapAirports
  );

  $("useRouteFuel")?.addEventListener(
    "click",
    useRouteDistanceForFuel
  );

  if (canvas && context) {
    canvas.addEventListener(
      "click",
      handleAirportCanvasClick
    );

    // Keep the drawing aligned when the map changes size.
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resizeCanvas);
    }

    resizeCanvas();
  } else {
    console.error(
      "SkyRoute: canvas or its 2D drawing context is missing."
    );
  }

  updateOverview();
  updateOperationsRecommendation();

  // Display the initial Chandigarh-to-Bengaluru route.
  handleFindRoute();

  console.info(
    "AeroNexis SkyRoute ready:",
    airports.length,
    "airports and",
    connections.length,
    "connections."
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseApplication,
    { once: true }
  );
} else {
  initialiseApplication();
}