
(() => {
  const panel = document.querySelector("[data-bstats-panel]");
  const pluginId = document.body.dataset.pluginId;
  if (!panel || !pluginId) return;

  const catalogueUrl = "../../assets/plugins.json";
  const API_ROOT = "https://bstats.org/api/v1";
  const CACHE_AGE = 15 * 60 * 1000;
  const CACHE_KEY = `mythicsuite-bstats-v1:${pluginId}`;

  const elements = {
    title: panel.querySelector("[data-bstats-title]"),
    description: panel.querySelector("[data-bstats-description]"),
    link: panel.querySelector("[data-bstats-link]"),
    currentServers: panel.querySelector("[data-bstats-current-servers]"),
    currentPlayers: panel.querySelector("[data-bstats-current-players]"),
    recordServers: panel.querySelector("[data-bstats-record-servers]"),
    recordPlayers: panel.querySelector("[data-bstats-record-players]"),
    serverChange: panel.querySelector("[data-bstats-server-change]"),
    playerChange: panel.querySelector("[data-bstats-player-change]"),
    serverLatest: panel.querySelector("[data-bstats-server-latest]"),
    playerLatest: panel.querySelector("[data-bstats-player-latest]"),
    serverChart: panel.querySelector("[data-bstats-server-chart]"),
    playerChart: panel.querySelector("[data-bstats-player-chart]"),
    status: panel.querySelector("[data-bstats-status]")
  };

  const numberFormat = new Intl.NumberFormat("en-GB");

  function getBstatsId(plugin) {
    const value = plugin?.bstatsId ?? plugin?.bstats?.id;
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : 0;
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (!cached?.payload) return null;
      return cached;
    } catch (_) {
      return null;
    }
  }

  function saveCache(payload) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), payload })
      );
    } catch (_) {}
  }

  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`bStats returned ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function chartIdByMeaning(charts, meaning) {
    if (!charts || typeof charts !== "object") return "";

    const exact = charts[meaning];
    if (exact) return meaning;

    const patterns = meaning === "servers"
      ? [/servers/i, /server count/i, /install/i]
      : [/players/i, /player count/i];

    return Object.entries(charts).find(([id, chart]) => {
      const haystack = `${id} ${chart?.title || ""} ${chart?.data?.lineName || ""}`;
      return patterns.some(pattern => pattern.test(haystack));
    })?.[0] || "";
  }

  function normaliseLineData(data) {
    if (!Array.isArray(data)) return [];

    return data
      .filter(entry =>
        Array.isArray(entry) &&
        Number.isFinite(Number(entry[0])) &&
        Number.isFinite(Number(entry[1]))
      )
      .map(entry => [Number(entry[0]), Number(entry[1])])
      .sort((left, right) => left[0] - right[0]);
  }

  function latestValue(points) {
    return points.length ? points[points.length - 1][1] : 0;
  }

  function recordValue(points) {
    return points.length
      ? Math.max(...points.map(point => point[1]))
      : 0;
  }

  function percentageChange(points) {
    if (points.length < 2) return null;
    const first = points[0][1];
    const last = points[points.length - 1][1];

    if (first === 0) return last === 0 ? 0 : null;
    return ((last - first) / first) * 100;
  }

  function describeChange(points, noun) {
    const change = percentageChange(points);
    if (change === null) return `Current reported ${noun}`;
    if (Math.abs(change) < .05) return `No change across loaded period`;

    const direction = change > 0 ? "up" : "down";
    return `${direction} ${Math.abs(change).toFixed(1)}% across loaded period`;
  }

  function renderChart(svg, points, purple = false) {
    svg.textContent = "";
    svg.classList.toggle("is-purple", purple);

    const namespace = "http://www.w3.org/2000/svg";
    const width = 600;
    const height = 190;
    const padding = { top: 14, right: 14, bottom: 16, left: 14 };

    const defs = document.createElementNS(namespace, "defs");
    const gradient = document.createElementNS(namespace, "linearGradient");
    const gradientId = purple
      ? `bstatsGradientPurple-${pluginId}`
      : `bstatsGradientCyan-${pluginId}`;

    gradient.id = gradientId;
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y2", "1");

    const topStop = document.createElementNS(namespace, "stop");
    topStop.setAttribute("offset", "0%");
    topStop.setAttribute("stop-color", purple ? "#b47cff" : "#00e5ff");
    topStop.setAttribute("stop-opacity", ".48");

    const bottomStop = document.createElementNS(namespace, "stop");
    bottomStop.setAttribute("offset", "100%");
    bottomStop.setAttribute("stop-color", purple ? "#b47cff" : "#00e5ff");
    bottomStop.setAttribute("stop-opacity", "0");

    gradient.append(topStop, bottomStop);
    defs.append(gradient);
    svg.append(defs);

    for (let index = 1; index <= 4; index += 1) {
      const line = document.createElementNS(namespace, "line");
      const y = padding.top +
        ((height - padding.top - padding.bottom) / 4) * index;
      line.setAttribute("x1", String(padding.left));
      line.setAttribute("x2", String(width - padding.right));
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
      line.setAttribute("class", "chart-grid-line");
      svg.append(line);
    }

    if (!points.length) {
      const empty = document.createElementNS(namespace, "text");
      empty.setAttribute("x", String(width / 2));
      empty.setAttribute("y", String(height / 2));
      empty.setAttribute("class", "chart-empty");
      empty.textContent = "No bStats chart data available";
      svg.append(empty);
      return;
    }

    const minimum = Math.min(...points.map(point => point[1]));
    const maximum = Math.max(...points.map(point => point[1]));
    const range = maximum - minimum || 1;

    const plotted = points.map((point, index) => {
      const x = padding.left +
        (index / Math.max(1, points.length - 1)) *
        (width - padding.left - padding.right);
      const y = padding.top +
        (1 - ((point[1] - minimum) / range)) *
        (height - padding.top - padding.bottom);
      return [x, y];
    });

    const linePoints = plotted
      .map(point => `${point[0].toFixed(2)},${point[1].toFixed(2)}`)
      .join(" ");

    const area = document.createElementNS(namespace, "path");
    const first = plotted[0];
    const last = plotted[plotted.length - 1];
    area.setAttribute(
      "d",
      `M ${first[0]} ${height - padding.bottom} ` +
      `L ${linePoints.replaceAll(",", " ")} ` +
      `L ${last[0]} ${height - padding.bottom} Z`
    );
    area.setAttribute("class", "chart-area");
    area.style.fill = `url(#${gradientId})`;
    svg.append(area);

    const line = document.createElementNS(namespace, "polyline");
    line.setAttribute("points", linePoints);
    line.setAttribute("class", "chart-line");
    svg.append(line);

    const latest = document.createElementNS(namespace, "circle");
    latest.setAttribute("cx", String(last[0]));
    latest.setAttribute("cy", String(last[1]));
    latest.setAttribute("r", "6");
    latest.setAttribute("class", "chart-latest");
    svg.append(latest);
  }

  function bstatsPageUrl(details, id) {
    const software = details?.software?.url || "bukkit";
    const name = encodeURIComponent(details?.name || pluginId);
    return `https://bstats.org/plugin/${software}/${name}/${id}`;
  }

  function render(payload, cached = false) {
    const {
      details,
      serverPoints,
      playerPoints,
      bstatsId
    } = payload;

    panel.hidden = false;

    const currentServers = latestValue(serverPoints);
    const currentPlayers = latestValue(playerPoints);
    const recordServers = recordValue(serverPoints);
    const recordPlayers = recordValue(playerPoints);

    elements.title.textContent =
      `${details?.name || pluginId} usage on bStats`;
    elements.description.textContent =
      "Aggregated server installations and player activity reported by servers using this plugin.";

    elements.currentServers.textContent = numberFormat.format(currentServers);
    elements.currentPlayers.textContent = numberFormat.format(currentPlayers);
    elements.recordServers.textContent = numberFormat.format(recordServers);
    elements.recordPlayers.textContent = numberFormat.format(recordPlayers);
    elements.serverLatest.textContent = numberFormat.format(currentServers);
    elements.playerLatest.textContent = numberFormat.format(currentPlayers);
    elements.serverChange.textContent =
      describeChange(serverPoints, "server usage");
    elements.playerChange.textContent =
      describeChange(playerPoints, "player activity");

    elements.link.href = bstatsPageUrl(details, bstatsId);
    renderChart(elements.serverChart, serverPoints, false);
    renderChart(elements.playerChart, playerPoints, true);

    elements.status.textContent = cached
      ? "Showing recently cached bStats data"
      : "Live bStats data loaded";
  }

  async function load() {
    try {
      const catalogueResponse = await fetch(
        `${catalogueUrl}?bstats=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!catalogueResponse.ok) return;

      const plugins = await catalogueResponse.json();
      const plugin = plugins.find(entry => entry.id === pluginId);
      const bstatsId = getBstatsId(plugin);

      if (!bstatsId) return;

      const cached = readCache();
      if (cached?.payload) {
        render(cached.payload, true);

        if (Date.now() - cached.savedAt < CACHE_AGE) {
          return;
        }
      }

      panel.hidden = false;
      elements.status.textContent = "Loading current bStats metrics…";

      const details = await fetchJSON(
        `${API_ROOT}/plugins/${bstatsId}`
      );

      const serverChartId =
        chartIdByMeaning(details.charts, "servers");
      const playerChartId =
        chartIdByMeaning(details.charts, "players");

      const [serverData, playerData] = await Promise.all([
        serverChartId
          ? fetchJSON(
              `${API_ROOT}/plugins/${bstatsId}/charts/` +
              `${encodeURIComponent(serverChartId)}/data?maxElements=336`
            ).catch(() => [])
          : [],
        playerChartId
          ? fetchJSON(
              `${API_ROOT}/plugins/${bstatsId}/charts/` +
              `${encodeURIComponent(playerChartId)}/data?maxElements=336`
            ).catch(() => [])
          : []
      ]);

      const payload = {
        bstatsId,
        details,
        serverPoints: normaliseLineData(serverData),
        playerPoints: normaliseLineData(playerData)
      };

      saveCache(payload);
      render(payload, false);
    } catch (_) {
      panel.hidden = false;
      elements.status.textContent =
        "bStats could not be reached. The public plugin page is still available.";
    }
  }

  load();
})();
