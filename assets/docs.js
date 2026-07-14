
(() => {
  const hub = document.body.matches("[data-docs-hub]");
  const detail = document.body.matches("[data-docs-page]");
  if (!hub && !detail) return;

  const prefix = detail ? "../../" : "../";
  const pluginId = document.body.dataset.pluginId || "";
  const lifecycleLabels = {
    current: "Public",
    exclusive: "Exclusive",
    development: "Development",
    planned: "Planned",
    legacy: "Legacy"
  };

  const accentFor = id => {
    const colours = [
      "#c084fc", "#22d3ee", "#f97316", "#fb7185",
      "#65e0a3", "#38bdf8", "#f59e0b", "#a78bfa",
      "#e879f9", "#34d399", "#f4c95d", "#60a5fa"
    ];
    let hash = 0;
    for (const character of String(id)) {
      hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    }
    return colours[Math.abs(hash) % colours.length];
  };

  const pluginIcon = plugin =>
    plugin.icon
      ? `${prefix}${plugin.icon}`
      : `${prefix}assets/icons/${plugin.id}.png`;

  const empty = message => {
    const element = document.createElement("div");
    element.className = "docs-empty-inline";
    element.textContent = message;
    return element;
  };

  async function loadData() {
    const [pluginsResponse, docsResponse] = await Promise.all([
      fetch(`${prefix}assets/plugins.json?docs=${Date.now()}`, {
        cache: "no-store"
      }),
      fetch(`${prefix}assets/docs.json?docs=${Date.now()}`, {
        cache: "no-store"
      })
    ]);

    if (!pluginsResponse.ok || !docsResponse.ok) {
      throw new Error("The documentation data could not be loaded.");
    }

    return {
      plugins: await pluginsResponse.json(),
      docs: await docsResponse.json()
    };
  }

  function docsFor(plugin, entries) {
    return entries.find(entry => entry.pluginId === plugin.id) || {
      pluginId: plugin.id,
      status: "starter",
      lastUpdated: "Not yet published",
      overview: [plugin.description || plugin.tagline],
      installation: [],
      commands: [],
      permissions: [],
      configuration: [],
      placeholders: [],
      integrations: [],
      troubleshooting: [],
      apiHooks: [],
      changelog: []
    };
  }

  function coverage(documentation) {
    const fields = [
      documentation.overview,
      documentation.installation,
      documentation.commands,
      documentation.permissions,
      documentation.configuration,
      documentation.integrations,
      documentation.troubleshooting,
      documentation.apiHooks,
      documentation.changelog
    ];

    const populated = fields.filter(value =>
      Array.isArray(value) && value.length
    ).length;

    return Math.round((populated / fields.length) * 100);
  }

  function commandCount(documentation) {
    return Array.isArray(documentation.commands)
      ? documentation.commands.length
      : 0;
  }

  function permissionCount(documentation) {
    return Array.isArray(documentation.permissions)
      ? documentation.permissions.length
      : 0;
  }

  function searchableText(plugin, documentation) {
    return JSON.stringify({
      name: plugin.name,
      category: plugin.category,
      tags: plugin.tags,
      features: plugin.features,
      docs: documentation
    }).toLowerCase();
  }

  function renderHub(plugins, docsEntries) {
    const grid = document.querySelector("[data-docs-card-grid]");
    const search = document.querySelector("[data-docs-search]");
    const summary = document.querySelector("[data-docs-result-summary]");
    const emptyState = document.querySelector("[data-docs-empty]");
    const filters = [...document.querySelectorAll("[data-docs-filter]")];
    let activeFilter = "all";

    const records = plugins
      .filter(plugin => plugin.listed !== false)
      .map(plugin => {
        const documentation = docsFor(plugin, docsEntries);
        return {
          plugin,
          documentation,
          search: searchableText(plugin, documentation)
        };
      })
      .sort((left, right) =>
        left.plugin.name.localeCompare(
          right.plugin.name,
          "en",
          { sensitivity: "base" }
        )
      );

    document.querySelector("[data-docs-total]").textContent =
      new Intl.NumberFormat("en-GB").format(records.length);
    document.querySelector("[data-docs-command-count]").textContent =
      new Intl.NumberFormat("en-GB").format(
        records.reduce(
          (total, record) =>
            total + commandCount(record.documentation),
          0
        )
      );
    document.querySelector("[data-docs-permission-count]").textContent =
      new Intl.NumberFormat("en-GB").format(
        records.reduce(
          (total, record) =>
            total + permissionCount(record.documentation),
          0
        )
      );
    document.querySelector("[data-docs-complete-count]").textContent =
      new Intl.NumberFormat("en-GB").format(
        records.filter(record =>
          String(record.documentation.status).toLowerCase() === "complete"
        ).length
      );

    function createCard(record) {
      const { plugin, documentation } = record;
      const article = document.createElement("article");
      article.className = "docs-library-card";
      article.style.setProperty(
        "--docs-accent",
        plugin.accent || accentFor(plugin.id)
      );

      const head = document.createElement("div");
      head.className = "docs-card-head";

      const icon = document.createElement("img");
      icon.src = pluginIcon(plugin);
      icon.alt = "";

      const level = document.createElement("span");
      const isComplete =
        String(documentation.status).toLowerCase() === "complete";
      level.className =
        `docs-level-badge ${isComplete ? "complete" : ""}`;
      level.textContent = isComplete ? "Complete guide" : "Starter guide";
      head.append(icon, level);

      const category = document.createElement("p");
      category.className = "card-category";
      category.textContent = plugin.category || "Minecraft Plugin";

      const heading = document.createElement("h3");
      const link = document.createElement("a");
      link.href = `./${plugin.id}/`;
      link.textContent = plugin.name;
      heading.append(link);

      const description = document.createElement("p");
      description.textContent =
        plugin.tagline ||
        plugin.description ||
        "Installation and configuration documentation.";

      const coverageRow = document.createElement("div");
      coverageRow.className = "docs-card-coverage";

      const coverageMetric = document.createElement("span");
      coverageMetric.innerHTML =
        `<b>${coverage(documentation)}%</b>coverage`;

      const commandsMetric = document.createElement("span");
      commandsMetric.innerHTML =
        `<b>${commandCount(documentation)}</b>commands`;

      const permissionsMetric = document.createElement("span");
      permissionsMetric.innerHTML =
        `<b>${permissionCount(documentation)}</b>permissions`;

      coverageRow.append(
        coverageMetric,
        commandsMetric,
        permissionsMetric
      );

      const cardLink = document.createElement("a");
      cardLink.className = "docs-card-link";
      cardLink.href = `./${plugin.id}/`;
      cardLink.innerHTML =
        `Open documentation <span>→</span>`;

      article.append(
        head,
        category,
        heading,
        description,
        coverageRow,
        cardLink
      );
      return article;
    }

    function apply() {
      const query = search.value.trim().toLowerCase();
      const visible = records.filter(record => {
        const matchesQuery =
          !query || record.search.includes(query);
        const matchesFilter =
          activeFilter === "all" ||
          String(record.plugin.lifecycle || "current") === activeFilter;
        return matchesQuery && matchesFilter;
      });

      grid.textContent = "";
      visible.forEach(record => grid.append(createCard(record)));

      summary.textContent =
        `${visible.length} of ${records.length} plugin guides shown`;
      emptyState.hidden = visible.length !== 0;
    }

    search.addEventListener("input", apply);

    filters.forEach(button => {
      button.addEventListener("click", () => {
        filters.forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        activeFilter = button.dataset.docsFilter;
        apply();
      });
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        search.focus();
      }
    });

    apply();
  }

  function renderParagraphs(container, values) {
    container.textContent = "";
    if (!Array.isArray(values) || !values.length) {
      container.append(empty("No overview has been published yet."));
      return;
    }

    values.forEach(value => {
      const paragraph = document.createElement("p");
      paragraph.textContent = value;
      container.append(paragraph);
    });
  }

  function renderSteps(container, values) {
    container.textContent = "";
    if (!Array.isArray(values) || !values.length) {
      container.replaceWith(empty("No installation steps have been published yet."));
      return;
    }

    values.forEach(value => {
      const item = document.createElement("li");
      item.textContent = value;
      container.append(item);
    });
  }

  function copyable(value) {
    const wrapper = document.createElement("span");
    wrapper.className = "docs-code";

    const code = document.createElement("code");
    code.textContent = value;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "docs-copy-button";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "Copied";
      } catch (_) {
        button.textContent = "Select";
      }
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1500);
    });

    wrapper.append(code, button);
    return wrapper;
  }

  function renderReferenceTable(container, rows, columns, emptyMessage) {
    container.textContent = "";

    if (!Array.isArray(rows) || !rows.length) {
      container.append(empty(emptyMessage));
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "docs-table-wrap";

    const table = document.createElement("table");
    table.className = "docs-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    columns.forEach(column => {
      const th = document.createElement("th");
      th.textContent = column.label;
      headRow.append(th);
    });
    thead.append(headRow);

    const tbody = document.createElement("tbody");
    rows.forEach(row => {
      const tr = document.createElement("tr");
      columns.forEach(column => {
        const td = document.createElement("td");
        const value = row[column.key] || "—";
        if (column.code && value !== "—") {
          td.append(copyable(value));
        } else {
          td.textContent = value;
        }
        tr.append(td);
      });
      tbody.append(tr);
    });

    table.append(thead, tbody);
    wrap.append(table);
    container.append(wrap);
  }

  function renderCards(container, values, keyField, textField, emptyMessage) {
    container.textContent = "";

    if (!Array.isArray(values) || !values.length) {
      container.append(empty(emptyMessage));
      return;
    }

    values.forEach(value => {
      const article = document.createElement("article");
      article.className = "docs-info-card";

      const heading = document.createElement("h3");
      heading.textContent = value[keyField] || "Reference";

      const paragraph = document.createElement("p");
      paragraph.textContent = value[textField] || "";

      article.append(heading, paragraph);
      container.append(article);
    });
  }

  function renderTroubleshooting(container, values) {
    container.textContent = "";

    if (!Array.isArray(values) || !values.length) {
      container.append(empty("No troubleshooting entries have been published yet."));
      return;
    }

    values.forEach((value, index) => {
      const article = document.createElement("article");
      article.className = "docs-accordion";

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-expanded", index === 0 ? "true" : "false");

      const title = document.createElement("span");
      title.textContent = value.problem || "Troubleshooting";

      const marker = document.createElement("span");
      marker.textContent = index === 0 ? "−" : "+";
      button.append(title, marker);

      const paragraph = document.createElement("p");
      paragraph.textContent = value.solution || "";
      paragraph.hidden = index !== 0;

      button.addEventListener("click", () => {
        const expanded =
          button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        marker.textContent = expanded ? "+" : "−";
        paragraph.hidden = expanded;
      });

      article.append(button, paragraph);
      container.append(article);
    });
  }

  function renderChangelog(container, values) {
    container.textContent = "";

    if (!Array.isArray(values) || !values.length) {
      container.append(empty("No changelog entries have been published yet."));
      return;
    }

    values.forEach(value => {
      const article = document.createElement("article");
      article.className = "docs-release";

      const meta = document.createElement("div");
      const version = document.createElement("strong");
      version.textContent = value.version || "Release";
      const date = document.createElement("small");
      date.textContent = value.date || "";
      meta.append(version, date);

      const notes = document.createElement("p");
      notes.textContent = value.notes || "";

      article.append(meta, notes);
      container.append(article);
    });
  }

  function renderDetail(plugin, documentation) {
    document.title = `${plugin.name} Documentation — MythicSuite`;

    document.querySelector("[data-docs-plugin-name]").textContent =
      plugin.name;
    document.querySelector("[data-docs-tagline]").textContent =
      plugin.tagline || plugin.description || "";
    document.querySelector("[data-docs-version]").textContent =
      plugin.version || "Current";
    document.querySelector("[data-docs-compatibility]").textContent =
      plugin.compatibility || "See release page";
    document.querySelector("[data-docs-updated]").textContent =
      documentation.lastUpdated || "Not yet published";
    document.querySelector("[data-docs-category]").textContent =
      plugin.category || "Minecraft Plugin";
    document.querySelector("[data-docs-status]").textContent =
      plugin.statusLabel ||
      lifecycleLabels[plugin.lifecycle] ||
      "Current";
    document.querySelector("[data-docs-level]").textContent =
      documentation.platformSynced
        ? "Platform-enriched guide"
        : String(documentation.status || "starter").toLowerCase() === "complete"
          ? "Complete guide"
          : "Starter guide";

    const platform = document.querySelector("[data-docs-primary-platform]");
    const platformUrl = plugin.spigot_url || plugin.modrinth_url;
    if (platformUrl) {
      platform.href = platformUrl;
      platform.textContent =
        plugin.spigot_url
          ? "Open on SpigotMC ↗"
          : "Open on Modrinth ↗";
      platform.hidden = false;
    }

    renderParagraphs(
      document.querySelector("[data-docs-overview]"),
      documentation.overview
    );

    renderSteps(
      document.querySelector("[data-docs-installation]"),
      documentation.installation
    );

    renderReferenceTable(
      document.querySelector("[data-docs-commands]"),
      documentation.commands,
      [
        { key: "command", label: "Command", code: true },
        { key: "permission", label: "Permission", code: true },
        { key: "description", label: "Description" }
      ],
      "No command reference has been published yet."
    );

    renderReferenceTable(
      document.querySelector("[data-docs-permissions]"),
      documentation.permissions,
      [
        { key: "permission", label: "Permission", code: true },
        { key: "description", label: "Description" }
      ],
      "No permission reference has been published yet."
    );

    renderCards(
      document.querySelector("[data-docs-configuration]"),
      documentation.configuration,
      "section",
      "description",
      "No configuration reference has been published yet."
    );

    renderCards(
      document.querySelector("[data-docs-integrations]"),
      documentation.integrations,
      "name",
      "description",
      "This plugin has no documented external integrations."
    );

    renderReferenceTable(
      document.querySelector("[data-docs-placeholders]"),
      documentation.placeholders,
      [
        { key: "placeholder", label: "Placeholder", code: true },
        { key: "description", label: "Description" }
      ],
      "No PlaceholderAPI values have been published yet."
    );

    renderTroubleshooting(
      document.querySelector("[data-docs-troubleshooting]"),
      documentation.troubleshooting
    );

    renderCards(
      document.querySelector("[data-docs-api-hooks]"),
      documentation.apiHooks,
      "name",
      "description",
      "No public API or hook documentation has been published yet."
    );

    renderChangelog(
      document.querySelector("[data-docs-changelog]"),
      documentation.changelog
    );

    const navLinks =
      [...document.querySelectorAll(".docs-section-nav a")];
    const sections =
      [...document.querySelectorAll(".docs-section")];

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((left, right) =>
            right.intersectionRatio - left.intersectionRatio
          )[0];

        if (!visible) return;

        navLinks.forEach(link => {
          link.classList.toggle(
            "active",
            link.getAttribute("href") === `#${visible.target.id}`
          );
        });
      }, {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0, .2, .5]
      });

      sections.forEach(section => observer.observe(section));
    }
  }

  loadData()
    .then(async ({ plugins, docs }) => {
      if (hub) {
        renderHub(plugins, docs);
        return;
      }

      const plugin = plugins.find(entry => entry.id === pluginId);
      if (!plugin) throw new Error("Plugin not found.");

      let documentation = docsFor(plugin, docs);

      let platformState = {
        attempted: false,
        sources: [],
        added: 0,
        error: ""
      };

      if (window.MythicDocsPlatform) {
        platformState.attempted = true;

        try {
          const result = await window.MythicDocsPlatform.enrich(
            plugin,
            documentation,
            { replace: false }
          );
          documentation = result.documentation;
          platformState.sources = result.platforms;
          platformState.added = result.added;

          if (result.added > 0) {
            documentation.lastUpdated =
              `${documentation.lastUpdated || "Stored guide"} · live platform data`;
          }
        } catch (error) {
          platformState.error = error?.message || "Platform lookup failed";
        }
      }

      renderDetail(plugin, documentation);

      const commandsMissing =
        !(documentation.commands || []).length;
      const permissionsMissing =
        !(documentation.permissions || []).length;

      if (commandsMissing || permissionsMissing || platformState.error) {
        const note = document.createElement("div");
        note.className = platformState.error
          ? "docs-platform-state is-error"
          : "docs-platform-state";

        if (platformState.error) {
          note.textContent =
            `Live platform documentation could not be read: ${platformState.error}`;
        } else if (!platformState.sources.length) {
          note.textContent =
            "No readable SpigotMC or Modrinth long description was returned for this plugin.";
        } else {
          note.textContent =
            `Checked ${platformState.sources.join(" and ")}, but no additional command or permission entries were detected.`;
        }

        document.querySelector(".docs-detail-hero")?.after(note);
      }
    })
    .catch(error => {
      const target = hub
        ? document.querySelector("[data-docs-result-summary]")
        : document.querySelector("[data-docs-overview]");

      if (target) {
        target.textContent =
          `Documentation could not be loaded: ${error.message}`;
      }
    });
})();
