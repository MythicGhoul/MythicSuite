
(() => {
  const MODRINTH_API = "https://api.modrinth.com/v2";
  const SPIGET_API = "https://api.spiget.org/v2";
  const REQUEST_TIMEOUT = 12000;

  const SECTION_ALIASES = {
    commands: [
      "command", "commands", "command list", "commands list",
      "command usage", "commands usage", "available commands",
      "player commands", "admin commands", "commands and permissions",
      "commands permissions", "usage commands"
    ],
    permissions: [
      "permission", "permissions", "permission node",
      "permission nodes", "permissions nodes", "nodes"
    ],
    placeholders: [
      "placeholder", "placeholders", "placeholderapi",
      "placeholder api", "papi", "papi placeholders",
      "placeholderapi placeholders"
    ],
    installation: [
      "installation", "install", "setup", "getting started",
      "how to install", "installation guide"
    ],
    configuration: [
      "configuration", "config", "configuration guide",
      "config options", "configuration options", "settings"
    ],
    integrations: [
      "integration", "integrations", "dependencies",
      "dependency", "soft dependencies", "soft dependency",
      "hooks", "supported plugins", "requirements"
    ],
    troubleshooting: [
      "troubleshooting", "common issues", "known issues",
      "faq", "support", "frequently asked questions"
    ],
    apiHooks: [
      "api", "developer api", "developers", "api hooks",
      "api and hooks", "developer hooks"
    ]
  };

  function normaliseHeading(value) {
    return String(value || "")
      .replace(/§[0-9A-FK-ORX]/gi, "")
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
      .replace(/[`*_~>#()[\]{}|:;.!?=+\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function sectionName(line) {
    const value = normaliseHeading(line.text);
    if (!value || value.length > 62) return "";

    for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
      if (aliases.includes(value)) return section;

      if (
        line.heading &&
        aliases.some(alias =>
          value === alias ||
          value.startsWith(`${alias} `) ||
          value.endsWith(` ${alias}`)
        )
      ) {
        return section;
      }
    }

    return "";
  }

  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Platform request returned ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function decodeMaybeBase64(value) {
    const input = String(value || "").trim();
    if (!input) return "";

    const compact = input.replace(/\s+/g, "");
    if (
      compact.length < 16 ||
      compact.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+=*$/.test(compact)
    ) {
      return input;
    }

    try {
      const binary = atob(compact);
      const bytes = Uint8Array.from(
        binary,
        character => character.charCodeAt(0)
      );
      const decoded = new TextDecoder("utf-8").decode(bytes);
      const printable = [...decoded].filter(character =>
        character === "\n" ||
        character === "\r" ||
        character === "\t" ||
        character.charCodeAt(0) >= 32
      ).length;

      return printable / Math.max(1, decoded.length) > .92
        ? decoded
        : input;
    } catch (_) {
      return input;
    }
  }

  function stripInlineMarkup(value) {
    return String(value || "")
      .replace(/\[url=[^\]]+]/gi, "")
      .replace(/\[\/url]/gi, "")
      .replace(/\[img][\s\S]*?\[\/img]/gi, " ")
      .replace(/\[(?:b|i|u|s|center|left|right|color|size|font)(?:=[^\]]+)?]/gi, "")
      .replace(/\[\/(?:b|i|u|s|center|left|right|color|size|font)]/gi, "")
      .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*_~]+/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function htmlLines(value) {
    const documentValue = new DOMParser().parseFromString(
      String(value || ""),
      "text/html"
    );

    const lines = [];
    const elements = [
      ...documentValue.body.querySelectorAll(
        "h1,h2,h3,h4,h5,h6,p,li,pre,tr"
      )
    ];

    elements.forEach(element => {
      if (
        element.tagName !== "TR" &&
        element.closest("tr")
      ) {
        return;
      }

      if (
        ["P", "LI"].includes(element.tagName) &&
        element.querySelector("p,li,pre,tr")
      ) {
        return;
      }

      if (element.tagName === "TR") {
        const cells = [...element.querySelectorAll(":scope > th,:scope > td")]
          .map(cell => stripInlineMarkup(cell.textContent))
          .filter(Boolean);

        if (cells.length) {
          lines.push({
            text: cells.join(" | "),
            cells,
            heading: false
          });
        }
        return;
      }

      const text = stripInlineMarkup(element.textContent);
      if (!text) return;

      lines.push({
        text,
        heading: /^H[1-6]$/.test(element.tagName)
      });
    });

    return lines;
  }

  function textLines(value) {
    let source = String(value || "")
      .replace(/\r/g, "")
      .replace(/\[br\s*\/?]/gi, "\n")
      .replace(/\[\/?(?:table|tbody|thead)]/gi, "\n")
      .replace(/\[\/?tr]/gi, "\n")
      .replace(/\[\/td]\s*\[td(?:=[^\]]+)?]/gi, " | ")
      .replace(/\[\/th]\s*\[th(?:=[^\]]+)?]/gi, " | ")
      .replace(/\[(?:td|th)(?:=[^\]]+)?]/gi, "")
      .replace(/\[\/(?:td|th)]/gi, "")
      .replace(/\[code(?:=[^\]]+)?]([\s\S]*?)\[\/code]/gi, "\n$1\n")
      .replace(/\[spoiler(?:=[^\]]+)?]/gi, "\n")
      .replace(/\[\/spoiler]/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n");

    const lines = [];

    source.split("\n").forEach(rawLine => {
      let line = rawLine.trim();
      if (!line) return;

      let heading = false;

      const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
      if (markdownHeading) {
        heading = true;
        line = markdownHeading[1];
      }

      const bbHeading = line.match(
        /^\[(?:b|size(?:=[^\]]+)?|center)]*(.+?)\[\/(?:b|size|center)]*$/i
      );
      if (bbHeading && bbHeading[1]) {
        const candidate = stripInlineMarkup(bbHeading[1]);
        if (candidate.length <= 62) {
          heading = true;
          line = candidate;
        }
      }

      const boldHeading = line.match(/^\*\*(.+?)\*\*\s*:?\s*$/);
      if (boldHeading) {
        heading = true;
        line = boldHeading[1];
      }

      line = stripInlineMarkup(line)
        .replace(/^[-*•]\s+/, "")
        .trim();

      if (!line || /^[-|:\s]+$/.test(line)) return;

      const cells =
        line.includes("|")
          ? line
              .split("|")
              .map(cell => stripInlineMarkup(cell))
              .filter(Boolean)
          : null;

      lines.push({
        text: line,
        cells: cells && cells.length > 1 ? cells : null,
        heading
      });
    });

    return lines;
  }

  function toLines(value) {
    const source = String(value || "");
    if (!source.trim()) return [];

    return /<(?:h[1-6]|p|li|pre|table|tr|td|th)\b/i.test(source)
      ? htmlLines(source)
      : textLines(source);
  }

  function sectionBuckets(lines) {
    const buckets = Object.fromEntries(
      Object.keys(SECTION_ALIASES).map(key => [key, []])
    );

    let active = "";

    lines.forEach(line => {
      const section = sectionName(line);
      if (section) {
        active = section;
        return;
      }

      if (active) buckets[active].push(line);
    });

    return buckets;
  }

  function cleanDescription(value) {
    return stripInlineMarkup(
      String(value || "")
        .replace(/^[-–—:|\s]+/, "")
        .replace(/\s+/g, " ")
    );
  }

  function permissionToken(value) {
    const matches = String(value || "").match(
      /\b[a-z][a-z0-9_-]*(?:\.[a-z0-9_*:-]+)+\b/gi
    ) || [];

    return matches.find(token => {
      const lower = token.toLowerCase();
      return !(
        lower.startsWith("http.") ||
        lower.startsWith("https.") ||
        lower.startsWith("www.") ||
        /\.(?:com|org|net|io|co|uk|gg|jar|yml|yaml|json|png|jpg|webp)$/i.test(lower) ||
        /^\d+(?:\.\d+)+$/.test(lower)
      );
    }) || "";
  }

  function commandToken(value) {
    const match = String(value || "").match(
      /(?:^|[\s`|•*-])(\/[A-Za-z0-9:_-]+(?:\s+(?:<[^>\n]+>|\[[^\]\n]+]|--?[A-Za-z0-9_-]+|[A-Za-z0-9:_-]+)){0,7})/
    );

    if (!match) return "";

    let command = match[1]
      .replace(/\s+(?:permission|perm|description|usage)\b.*$/i, "")
      .trim();

    const separator = command.search(/\s(?:-|–|—|\|)\s/);
    if (separator >= 0) command = command.slice(0, separator).trim();

    return command;
  }

  function placeholderTokens(value) {
    return [
      ...new Set(
        String(value || "").match(
          /%[A-Za-z0-9_.:\-]+%/g
        ) || []
      )
    ];
  }

  function tableHeaders(lines) {
    const row = lines.find(line =>
      Array.isArray(line.cells) &&
      line.cells.some(cell =>
        /command|permission|description|placeholder|usage/i.test(cell)
      )
    );

    if (!row) return null;

    const headers = row.cells.map(cell =>
      normaliseHeading(cell)
    );

    return {
      row,
      command: headers.findIndex(value => value.includes("command")),
      permission: headers.findIndex(value => value.includes("permission")),
      placeholder: headers.findIndex(value => value.includes("placeholder")),
      description: headers.findIndex(value =>
        /description|usage|purpose|details|explanation/.test(value)
      )
    };
  }

  function dedupeRows(rows, key) {
    const seen = new Set();

    return rows.filter(row => {
      const value = String(row[key] || "").trim().toLowerCase();
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function parseCommands(lines) {
    const rows = [];
    const headers = tableHeaders(lines);

    lines.forEach(line => {
      if (line === headers?.row) return;

      if (line.cells && headers && headers.command >= 0) {
        const command = commandToken(
          line.cells[headers.command] || ""
        );
        if (!command) return;

        rows.push({
          command,
          permission:
            headers.permission >= 0
              ? permissionToken(line.cells[headers.permission] || "")
              : permissionToken(line.text),
          description:
            headers.description >= 0
              ? cleanDescription(line.cells[headers.description] || "")
              : cleanDescription(
                  line.text.replace(command, "")
                )
        });
        return;
      }

      const command = commandToken(line.text);
      if (!command) return;

      const permission = permissionToken(line.text);
      let description = line.text
        .replace(command, "")
        .replace(permission, "")
        .replace(/\b(?:permission|perm(?:ission)? node)\s*[:=-]?/gi, "")
        .replace(/^[-–—:|\s]+/, "");

      rows.push({
        command,
        permission,
        description: cleanDescription(description)
      });
    });

    return dedupeRows(rows, "command");
  }

  function parsePermissions(lines) {
    const rows = [];
    const headers = tableHeaders(lines);

    lines.forEach(line => {
      if (line === headers?.row) return;

      if (line.cells && headers && headers.permission >= 0) {
        const permission = permissionToken(
          line.cells[headers.permission] || ""
        );
        if (!permission) return;

        rows.push({
          permission,
          description:
            headers.description >= 0
              ? cleanDescription(line.cells[headers.description] || "")
              : cleanDescription(
                  line.text.replace(permission, "")
                )
        });
        return;
      }

      const permission = permissionToken(line.text);
      if (!permission) return;

      rows.push({
        permission,
        description: cleanDescription(
          line.text
            .replace(permission, "")
            .replace(/\b(?:permission|perm(?:ission)? node)\s*[:=-]?/gi, "")
        )
      });
    });

    return dedupeRows(rows, "permission");
  }

  function parsePlaceholders(lines) {
    const rows = [];
    const headers = tableHeaders(lines);

    lines.forEach(line => {
      if (line === headers?.row) return;

      if (line.cells && headers && headers.placeholder >= 0) {
        const tokens = placeholderTokens(
          line.cells[headers.placeholder] || ""
        );

        tokens.forEach(placeholder => {
          rows.push({
            placeholder,
            description:
              headers.description >= 0
                ? cleanDescription(line.cells[headers.description] || "")
                : cleanDescription(
                    line.text.replace(placeholder, "")
                  )
          });
        });
        return;
      }

      placeholderTokens(line.text).forEach(placeholder => {
        rows.push({
          placeholder,
          description: cleanDescription(
            line.text.replace(placeholder, "")
          )
        });
      });
    });

    return dedupeRows(rows, "placeholder");
  }

  function parseSimpleCards(lines, key) {
    const rows = [];

    lines.forEach(line => {
      if (!line.text) return;

      const split = line.text.split(/\s(?:\||-|–|—|:)\s/, 2);
      const heading = cleanDescription(split[0]);
      const description = cleanDescription(
        split.length > 1
          ? line.text.slice(line.text.indexOf(split[1]))
          : line.text
      );

      if (!heading) return;
      rows.push({
        [key]: heading.slice(0, 90),
        description:
          split.length > 1
            ? description
            : heading
      });
    });

    return dedupeRows(rows, key).slice(0, 24);
  }

  function parseSteps(lines) {
    return [
      ...new Set(
        lines
          .map(line => cleanDescription(line.text))
          .filter(value => value.length > 5)
      )
    ].slice(0, 20);
  }

  function parseDescription(raw) {
    const lines = toLines(raw);
    const buckets = sectionBuckets(lines);

    let commands = parseCommands(buckets.commands);
    let permissions = parsePermissions(buckets.permissions);
    let placeholders = parsePlaceholders(buckets.placeholders);

    // Combined command tables often include permission nodes.
    if (!permissions.length && buckets.commands.length) {
      permissions = parsePermissions(buckets.commands);
    }

    // Safe global fallbacks: slash commands and %placeholders% are distinctive.
    if (!commands.length) {
      commands = parseCommands(
        lines.filter(line => /(^|\s|`)\//.test(line.text))
      );
    }

    if (!placeholders.length) {
      placeholders = parsePlaceholders(
        lines.filter(line => /%[A-Za-z0-9_.:\-]+%/.test(line.text))
      );
    }

    // Global permission fallback only when the line explicitly says permission.
    if (!permissions.length) {
      permissions = parsePermissions(
        lines.filter(line =>
          /\bpermission(?:s| node| nodes)?\b/i.test(line.text)
        )
      );
    }

    return {
      commands,
      permissions,
      placeholders,
      installation: parseSteps(buckets.installation),
      configuration: parseSimpleCards(
        buckets.configuration,
        "section"
      ),
      integrations: parseSimpleCards(
        buckets.integrations,
        "name"
      ),
      troubleshooting:
        parseSimpleCards(
          buckets.troubleshooting,
          "problem"
        ).map(item => ({
          problem: item.problem,
          solution: item.description
        })),
      apiHooks: parseSimpleCards(
        buckets.apiHooks,
        "name"
      )
    };
  }

  function mergeUnique(left, right, key) {
    const result = [];
    const seen = new Set();

    [...(left || []), ...(right || [])].forEach(item => {
      const value = String(
        typeof item === "string" ? item : item?.[key]
      ).trim().toLowerCase();

      if (!value || seen.has(value)) return;
      seen.add(value);
      result.push(item);
    });

    return result;
  }

  function mergeParsed(target, parsed, replace = false) {
    const output = structuredClone(target || {});

    const arrayFields = {
      commands: "command",
      permissions: "permission",
      placeholders: "placeholder",
      installation: "",
      configuration: "section",
      integrations: "name",
      troubleshooting: "problem",
      apiHooks: "name"
    };

    Object.entries(arrayFields).forEach(([field, key]) => {
      const incoming = parsed[field] || [];
      const existing = output[field] || [];

      if (!incoming.length) return;

      if (replace) {
        output[field] = incoming;
      } else if (key) {
        output[field] = mergeUnique(existing, incoming, key);
      } else {
        output[field] = mergeUnique(existing, incoming, "");
      }
    });

    return output;
  }

  async function platformDescriptions(plugin) {
    const requests = [];

    if (plugin?.modrinth?.id) {
      requests.push(
        fetchJSON(
          `${MODRINTH_API}/project/${encodeURIComponent(plugin.modrinth.id)}`
        ).then(project => ({
          platform: "Modrinth",
          text: project.body || ""
        }))
      );
    }

    if (plugin?.spigot?.id) {
      requests.push(
        fetchJSON(
          `${SPIGET_API}/resources/${encodeURIComponent(plugin.spigot.id)}`
        ).then(resource => ({
          platform: "SpigotMC",
          text: decodeMaybeBase64(resource.description || "")
        }))
      );
    }

    const results = await Promise.allSettled(requests);

    return results
      .filter(result => result.status === "fulfilled")
      .map(result => result.value)
      .filter(source => source.text.trim());
  }

  async function extract(plugin) {
    const sources = await platformDescriptions(plugin);
    let parsed = {
      commands: [],
      permissions: [],
      placeholders: [],
      installation: [],
      configuration: [],
      integrations: [],
      troubleshooting: [],
      apiHooks: []
    };

    sources.forEach(source => {
      const next = parseDescription(source.text);
      parsed = mergeParsed(parsed, next, false);
    });

    return {
      parsed,
      platforms: sources.map(source => source.platform)
    };
  }

  async function enrich(plugin, documentation, options = {}) {
    const { parsed, platforms } = await extract(plugin);
    const output = mergeParsed(
      documentation,
      parsed,
      Boolean(options.replace)
    );

    const added =
      Object.keys(parsed).reduce(
        (total, field) =>
          total + Math.max(
            0,
            (output[field]?.length || 0) -
            (documentation?.[field]?.length || 0)
          ),
        0
      );

    if (added > 0) {
      output.platformSynced = true;
      output.platformSources = platforms;
    }

    return {
      documentation: output,
      parsed,
      platforms,
      added
    };
  }

  window.MythicDocsPlatform = {
    extract,
    enrich,
    parseDescription,
    mergeParsed
  };
})();
