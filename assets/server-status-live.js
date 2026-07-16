
(() => {
  "use strict";

  const root = document.querySelector("[data-minecraft-server]");
  if (!root) return;

  const address = root.dataset.minecraftServer;
  const statusPill = root.querySelector("[data-server-status-pill]");
  const refreshButton = root.querySelector("[data-server-refresh]");
  const icon = root.querySelector("[data-server-icon]");
  const heading = root.querySelector("[data-server-heading]");
  const motd = root.querySelector("[data-server-motd]");
  const extra = root.querySelector("[data-server-extra-info]");
  const extraLines = root.querySelector("[data-server-extra-lines]");
  const addressElement = root.querySelector("[data-server-address]");
  const copyButton = root.querySelector("[data-copy-server]");
  const checked = root.querySelector("[data-server-checked]");
  const playerCount = root.querySelector("[data-server-players]");
  const capacity = root.querySelector("[data-server-capacity]");
  const version = root.querySelector("[data-server-version]");
  const state = root.querySelector("[data-server-state]");
  const software = root.querySelector("[data-server-software]");

  const fallbackIcon = "assets/favicon.svg";

  function text(value, fallback = "—") {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
  }

  function cleanMotd(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join("\n");
    return text(value, "");
  }

  function setPill(kind, label) {
    statusPill.classList.remove("is-loading", "is-online", "is-offline");
    statusPill.classList.add(kind);
    const dot = statusPill.querySelector("i");
    statusPill.replaceChildren(dot, document.createTextNode(` ${label}`));
  }

  function showLoading() {
    setPill("is-loading", "Checking server…");
    refreshButton.disabled = true;
    state.textContent = "Checking";
    checked.textContent = "Contacting the public Java status service…";
  }

  function normaliseMcsrvstat(data) {
    return {
      online: Boolean(data.online),
      icon: data.icon || null,
      motd: cleanMotd(data.motd?.clean || data.motd?.raw),
      extra: Array.isArray(data.info?.clean) ? data.info.clean : [],
      players: Number(data.players?.online ?? 0),
      maximum: Number(data.players?.max ?? 0),
      version: data.version || data.protocol?.name || "Unknown",
      software: data.software || "Java server",
    };
  }

  function normaliseMcstatus(data) {
    return {
      online: Boolean(data.online),
      icon: data.icon || data.favicon || null,
      motd: cleanMotd(data.motd?.clean || data.motd?.raw),
      extra: [],
      players: Number(data.players?.online ?? 0),
      maximum: Number(data.players?.max ?? 0),
      version: data.version?.name_clean || data.version?.name_raw || data.version || "Unknown",
      software: data.software || "Java server",
    };
  }

  async function requestJson(url, timeoutMs = 9000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function fetchStatus() {
    const encoded = encodeURIComponent(address);
    try {
      const first = await requestJson(`https://api.mcsrvstat.us/3/${encoded}?t=${Date.now()}`);
      return normaliseMcsrvstat(first);
    } catch (firstError) {
      const second = await requestJson(
        `https://api.mcstatus.io/v2/status/java/${encoded}?query=${Date.now()}`
      );
      return normaliseMcstatus(second);
    }
  }

  function applyStatus(result) {
    const now = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date());

    if (!result.online) {
      setPill("is-offline", "Server offline");
      icon.src = fallbackIcon;
      heading.textContent = "GhoulCraft is currently offline.";
      motd.textContent = "The public server ping did not report an active Java server.";
      playerCount.textContent = "0";
      capacity.textContent = "of — slots";
      version.textContent = "—";
      state.textContent = "Offline";
      software.textContent = "Public Java ping";
      checked.textContent = `Last checked at ${now}.`;
      extra.hidden = true;
      return;
    }

    setPill("is-online", "Server online");
    icon.src = result.icon || fallbackIcon;
    heading.textContent = "GhoulCraft is online.";
    motd.textContent = result.motd || "GhoulCraft RPG Survival";
    playerCount.textContent = result.players.toLocaleString("en-GB");
    capacity.textContent = `of ${result.maximum.toLocaleString("en-GB")} slots`;
    version.textContent = text(result.version);
    state.textContent = "Online";
    software.textContent = text(result.software, "Java server");
    checked.textContent = `Last checked at ${now}.`;

    extraLines.replaceChildren();
    const lines = (result.extra || []).filter(Boolean);
    if (lines.length) {
      for (const line of lines) {
        const item = document.createElement("p");
        item.textContent = line;
        extraLines.append(item);
      }
      extra.hidden = false;
    } else {
      extra.hidden = true;
    }
  }

  function showUnavailable() {
    setPill("is-offline", "Status unavailable");
    icon.src = fallbackIcon;
    heading.textContent = "Live status could not be reached.";
    motd.textContent =
      "The website is working, but both public Minecraft status services failed to respond.";
    playerCount.textContent = "—";
    capacity.textContent = "of — slots";
    version.textContent = "—";
    state.textContent = "Unavailable";
    software.textContent = "Try refreshing shortly";
    checked.textContent = "The live check failed; no server state was assumed.";
    extra.hidden = true;
  }

  async function update() {
    showLoading();
    try {
      const result = await fetchStatus();
      applyStatus(result);
    } catch (error) {
      console.warn("GhoulCraft status check failed:", error);
      showUnavailable();
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", update);

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address);
      const original = copyButton.textContent;
      copyButton.textContent = "Copied!";
      window.setTimeout(() => {
        copyButton.textContent = original;
      }, 1600);
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(addressElement);
      selection.removeAllRanges();
      selection.addRange(range);
      copyButton.textContent = "Select and copy";
    }
  });

  update();
  window.setInterval(update, 60000);
})();
