
(() => {
  const section = document.querySelector("[data-minecraft-server]");
  if (!section) return;

  const address = section.dataset.minecraftServer;
  const endpoint =
    "https://api.mcsrvstat.us/3/" + encodeURIComponent(address);
  const fallbackIcon = "assets/favicon.svg";
  const refreshInterval = 90 * 1000;

  const elements = {
    pill: section.querySelector("[data-server-status-pill]"),
    refresh: section.querySelector("[data-server-refresh]"),
    icon: section.querySelector("[data-server-icon]"),
    heading: section.querySelector("[data-server-heading]"),
    motd: section.querySelector("[data-server-motd]"),
    address: section.querySelector("[data-server-address]"),
    copy: section.querySelector("[data-copy-server]"),
    checked: section.querySelector("[data-server-checked]"),
    players: section.querySelector("[data-server-players]"),
    capacity: section.querySelector("[data-server-capacity]"),
    version: section.querySelector("[data-server-version]"),
    state: section.querySelector("[data-server-state]"),
    software: section.querySelector("[data-server-software]")
  };

  let checking = false;

  function setStatus(mode, label) {
    elements.pill.classList.remove(
      "is-loading",
      "is-online",
      "is-offline"
    );
    elements.pill.classList.add(`is-${mode}`);

    const dot = elements.pill.querySelector("i");
    elements.pill.textContent = "";
    elements.pill.append(dot, document.createTextNode(label));
  }

  function cleanMotd(motd) {
    const value = motd?.clean;

    if (Array.isArray(value)) {
      return value.filter(Boolean).join("\n").trim();
    }

    if (typeof value === "string") {
      return value.trim();
    }

    const raw = motd?.raw;
    if (Array.isArray(raw)) {
      return raw
        .join("\n")
        .replace(/§[0-9A-FK-OR]/gi, "")
        .trim();
    }

    return "";
  }

  function formatCheckedTime() {
    return "Checked " + new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
  }

  function renderOnline(data) {
    setStatus("online", "Server online");
    elements.heading.textContent = "GhoulCraft is online.";
    elements.motd.textContent =
      cleanMotd(data.motd) ||
      "A living RPG survival world powered by MythicSuite.";

    elements.icon.src = data.icon || fallbackIcon;
    elements.players.textContent =
      Number.isFinite(Number(data.players?.online))
        ? String(data.players.online)
        : "—";
    elements.capacity.textContent =
      Number.isFinite(Number(data.players?.max))
        ? `of ${data.players.max} slots`
        : "Live player count";

    elements.version.textContent =
      data.version ||
      data.protocol?.name ||
      "Minecraft Java";

    elements.state.textContent = "Online";
    elements.software.textContent =
      data.software
        ? `${data.software} · Live Java ping`
        : "Live Java ping";
    elements.checked.textContent = formatCheckedTime();
  }

  function renderOffline(message = "") {
    setStatus("offline", "Server offline");
    elements.heading.textContent = "GhoulCraft is currently resting.";
    elements.motd.textContent =
      message ||
      "The server may be restarting, undergoing maintenance, or temporarily unavailable.";
    elements.icon.src = fallbackIcon;
    elements.players.textContent = "0";
    elements.capacity.textContent = "No active connection";
    elements.version.textContent = "Unavailable";
    elements.state.textContent = "Offline";
    elements.software.textContent = "Next check scheduled";
    elements.checked.textContent = formatCheckedTime();
  }

  async function checkServer() {
    if (checking) return;
    checking = true;
    elements.refresh.disabled = true;
    elements.refresh.textContent = "Checking…";
    setStatus("loading", "Checking server…");

    try {
      const response = await fetch(
        endpoint + "?refresh=" + Date.now(),
        {
          cache: "no-store",
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Status service returned ${response.status}`);
      }

      const data = await response.json();

      if (data?.online) {
        renderOnline(data);
      } else {
        renderOffline();
      }
    } catch (_) {
      renderOffline(
        "The live status service could not reach the server. The server itself may still be available."
      );
    } finally {
      checking = false;
      elements.refresh.disabled = false;
      elements.refresh.textContent = "Refresh";
    }
  }

  async function copyAddress() {
    const original = elements.copy.textContent;

    try {
      await navigator.clipboard.writeText(address);
      elements.copy.textContent = "Address copied";
    } catch (_) {
      const input = document.createElement("textarea");
      input.value = address;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      elements.copy.textContent = "Address copied";
    }

    window.setTimeout(() => {
      elements.copy.textContent = original;
    }, 1800);
  }

  elements.address.textContent = address;
  elements.copy.addEventListener("click", copyAddress);
  elements.refresh.addEventListener("click", checkServer);

  checkServer();
  window.setInterval(checkServer, refreshInterval);
})();
