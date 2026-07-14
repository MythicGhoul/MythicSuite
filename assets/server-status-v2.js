
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
    extraInfo: section.querySelector("[data-server-extra-info]"),
    extraLines: section.querySelector("[data-server-extra-lines]"),
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

  function normaliseLines(value) {
    if (Array.isArray(value)) return value.map(line => String(line ?? ""));
    if (typeof value === "string") return value.split(/\r?\n/);
    return [];
  }

  /**
   * The status API returns MOTD HTML generated from Minecraft formatting.
   * Only text, spans, line breaks and a tiny allow-list of visual styles are
   * copied into the public page.
   */
  function sanitiseMinecraftHtml(value) {
    const source = document.createElement("template");
    source.innerHTML = String(value ?? "");

    const target = document.createElement("span");

    function copyChildren(from, to) {
      from.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          to.append(document.createTextNode(node.textContent || ""));
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();

        if (tag === "br") {
          to.append(document.createElement("br"));
          return;
        }

        if (tag !== "span") {
          copyChildren(node, to);
          return;
        }

        const cleanSpan = document.createElement("span");
        const style = node.style;

        if (/^#[0-9a-f]{6}$/i.test(style.color || "")) {
          cleanSpan.style.color = style.color;
        }

        if (
          style.fontWeight === "bold" ||
          Number.parseInt(style.fontWeight, 10) >= 600
        ) {
          cleanSpan.style.fontWeight = "700";
        }

        if (style.fontStyle === "italic") {
          cleanSpan.style.fontStyle = "italic";
        }

        const decoration = style.textDecorationLine || style.textDecoration;
        if (decoration.includes("underline")) {
          cleanSpan.style.textDecoration = "underline";
        } else if (decoration.includes("line-through")) {
          cleanSpan.style.textDecoration = "line-through";
        }

        copyChildren(node, cleanSpan);
        to.append(cleanSpan);
      });
    }

    copyChildren(source.content, target);
    return target;
  }

  function legacyColour(code) {
    const colours = {
      "0": "#000000",
      "1": "#0000AA",
      "2": "#00AA00",
      "3": "#00AAAA",
      "4": "#AA0000",
      "5": "#AA00AA",
      "6": "#FFAA00",
      "7": "#AAAAAA",
      "8": "#555555",
      "9": "#5555FF",
      a: "#55FF55",
      b: "#55FFFF",
      c: "#FF5555",
      d: "#FF55FF",
      e: "#FFFF55",
      f: "#FFFFFF"
    };
    return colours[String(code).toLowerCase()] || "";
  }

  /**
   * Fallback renderer for servers/status providers that return only raw § codes.
   * It preserves spacing and all lines instead of trimming the MOTD.
   */
  function renderLegacyLine(rawLine) {
    const line = document.createElement("span");
    const value = String(rawLine ?? "");
    let buffer = "";
    let style = {
      color: "",
      bold: false,
      italic: false,
      underline: false,
      strike: false
    };

    function flush() {
      if (!buffer) return;
      const span = document.createElement("span");
      span.textContent = buffer;
      if (style.color) span.style.color = style.color;
      if (style.bold) span.style.fontWeight = "700";
      if (style.italic) span.style.fontStyle = "italic";
      if (style.underline) span.style.textDecoration = "underline";
      if (style.strike) span.style.textDecoration = "line-through";
      line.append(span);
      buffer = "";
    }

    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== "§" || index + 1 >= value.length) {
        buffer += value[index];
        continue;
      }

      flush();
      const code = value[index + 1].toLowerCase();
      index += 1;

      if (code === "x") {
        let hex = "";
        let validHex = true;

        for (let part = 0; part < 6; part += 1) {
          const marker = value[index + 1];
          const digit = value[index + 2];
          if (
            marker !== "§" ||
            !digit ||
            !/[0-9a-f]/i.test(digit)
          ) {
            validHex = false;
            break;
          }
          hex += digit;
          index += 2;
        }

        if (validHex) {
          style.color = `#${hex}`;
        }
        continue;
      }

      const colour = legacyColour(code);
      if (colour) {
        style = {
          color: colour,
          bold: false,
          italic: false,
          underline: false,
          strike: false
        };
      } else if (code === "l") {
        style.bold = true;
      } else if (code === "o") {
        style.italic = true;
      } else if (code === "n") {
        style.underline = true;
      } else if (code === "m") {
        style.strike = true;
      } else if (code === "r") {
        style = {
          color: "",
          bold: false,
          italic: false,
          underline: false,
          strike: false
        };
      }
    }

    flush();
    return line;
  }

  function buildFormattedLines(group) {
    const htmlLines = normaliseLines(group?.html);
    if (htmlLines.length) {
      return htmlLines.map(sanitiseMinecraftHtml);
    }

    const rawLines = normaliseLines(group?.raw);
    if (rawLines.length) {
      return rawLines.map(renderLegacyLine);
    }

    return normaliseLines(group?.clean).map(line => {
      const span = document.createElement("span");
      span.textContent = line;
      return span;
    });
  }

  function renderLineGroup(container, group) {
    if (!container) return 0;

    const lines = buildFormattedLines(group);
    container.textContent = "";

    lines.forEach(content => {
      const line = document.createElement("div");
      line.className = "server-motd-line";
      line.append(content);
      container.append(line);
    });

    return lines.length;
  }

  function renderMotd(data) {
    const lineCount = renderLineGroup(elements.motd, data.motd);

    if (!lineCount) {
      elements.motd.textContent =
        "A living RPG survival world powered by MythicSuite.";
    }

    const extraCount = renderLineGroup(elements.extraLines, data.info);

    if (elements.extraInfo) {
      elements.extraInfo.hidden = extraCount === 0;
    }
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
    renderMotd(data);

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

    if (elements.extraInfo) elements.extraInfo.hidden = true;

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
