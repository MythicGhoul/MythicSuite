
(() => {
  const panel = document.getElementById("docsAdminPanel");
  if (!panel) return;

  const fields = {
    status: document.getElementById("docsStatus"),
    overview: document.getElementById("docsOverview"),
    installation: document.getElementById("docsInstallation"),
    commands: document.getElementById("docsCommands"),
    permissions: document.getElementById("docsPermissions"),
    configuration: document.getElementById("docsConfiguration"),
    integrations: document.getElementById("docsIntegrations"),
    placeholders: document.getElementById("docsPlaceholders"),
    troubleshooting: document.getElementById("docsTroubleshooting"),
    apiHooks: document.getElementById("docsApiHooks"),
    changelog: document.getElementById("docsChangelog"),
    apply: document.getElementById("applyDocsButton"),
    publish: document.getElementById("publishDocsButton"),
    state: document.getElementById("docsSaveState"),
    publicLink: document.getElementById("publicDocsLink"),
    token: document.getElementById("githubToken"),
    owner: document.getElementById("repoOwner"),
    repo: document.getElementById("repoName"),
    branch: document.getElementById("repoBranch"),
    layout: document.getElementById("editorLayout")
  };

  let docs = [];
  let selectedPlugin = null;
  let loaded = false;
  let dirty = false;

  const headers = () => ({
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${fields.token.value.trim()}`,
    "X-GitHub-Api-Version": "2022-11-28"
  });

  const apiUrl = includeRef => {
    const owner = encodeURIComponent(fields.owner.value.trim());
    const repo = encodeURIComponent(fields.repo.value.trim());
    const branch = encodeURIComponent(fields.branch.value.trim() || "main");
    const base =
      `https://api.github.com/repos/${owner}/${repo}/contents/assets/docs.json`;
    return includeRef ? `${base}?ref=${branch}` : base;
  };

  function decodeBase64(value) {
    const binary = atob(String(value || "").replace(/\n/g, ""));
    const bytes = Uint8Array.from(
      binary,
      character => character.charCodeAt(0)
    );
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function setState(message, className = "") {
    fields.state.textContent = message;
    fields.state.className =
      `save-state ${className}`.trim();
  }

  function splitParagraphs(value) {
    return String(value || "")
      .split(/\n\s*\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function parseRows(value, keys) {
    return splitLines(value).map(line => {
      const parts = line.split("|").map(part => part.trim());
      return Object.fromEntries(
        keys.map((key, index) => [key, parts[index] || ""])
      );
    });
  }

  function formatRows(rows, keys) {
    if (!Array.isArray(rows)) return "";
    return rows
      .map(row => keys.map(key => row[key] || "").join(" | "))
      .join("\n");
  }

  function starter(plugin) {
    const long = plugin.longDescription || {};
    return {
      pluginId: plugin.id,
      status: "starter",
      lastUpdated: "Not yet published",
      overview:
        Array.isArray(long.intro) && long.intro.length
          ? long.intro
          : [plugin.description || plugin.tagline || ""],
      installation:
        Array.isArray(long.setup) ? long.setup : [],
      commands: [],
      permissions: [],
      configuration: [],
      integrations: (plugin.integrations || []).map(name => ({
        name,
        description: `Optional or supported integration used by ${plugin.name}.`
      })),
      placeholders: [],
      troubleshooting: [],
      apiHooks: [],
      changelog: [
        {
          version: plugin.version || "Current",
          date: "Current release",
          notes: "Current release tracked by MythicSuite."
        }
      ]
    };
  }

  function currentEntry() {
    if (!selectedPlugin) return null;
    let entry = docs.find(
      value => value.pluginId === selectedPlugin.id
    );

    if (!entry) {
      entry = starter(selectedPlugin);
      docs.push(entry);
    }
    return entry;
  }

  function populate() {
    const entry = currentEntry();
    if (!entry || !selectedPlugin) return;

    fields.status.value = entry.status || "starter";
    fields.overview.value =
      (entry.overview || []).join("\n\n");
    fields.installation.value =
      (entry.installation || []).join("\n");
    fields.commands.value =
      formatRows(
        entry.commands,
        ["command", "permission", "description"]
      );
    fields.permissions.value =
      formatRows(
        entry.permissions,
        ["permission", "description"]
      );
    fields.configuration.value =
      formatRows(
        entry.configuration,
        ["section", "description"]
      );
    fields.integrations.value =
      formatRows(
        entry.integrations,
        ["name", "description"]
      );
    fields.placeholders.value =
      formatRows(
        entry.placeholders,
        ["placeholder", "description"]
      );
    fields.troubleshooting.value =
      formatRows(
        entry.troubleshooting,
        ["problem", "solution"]
      );
    fields.apiHooks.value =
      formatRows(
        entry.apiHooks,
        ["name", "description"]
      );
    fields.changelog.value =
      formatRows(
        entry.changelog,
        ["version", "date", "notes"]
      );
    fields.publicLink.href =
      `../docs/${selectedPlugin.id}/`;
    dirty = false;
    setState("Documentation loaded");
  }

  function apply() {
    const entry = currentEntry();
    if (!entry) return false;

    entry.status = fields.status.value;
    entry.overview = splitParagraphs(fields.overview.value);
    entry.installation = splitLines(fields.installation.value);
    entry.commands = parseRows(
      fields.commands.value,
      ["command", "permission", "description"]
    );
    entry.permissions = parseRows(
      fields.permissions.value,
      ["permission", "description"]
    );
    entry.configuration = parseRows(
      fields.configuration.value,
      ["section", "description"]
    );
    entry.integrations = parseRows(
      fields.integrations.value,
      ["name", "description"]
    );
    entry.placeholders = parseRows(
      fields.placeholders.value,
      ["placeholder", "description"]
    );
    entry.troubleshooting = parseRows(
      fields.troubleshooting.value,
      ["problem", "solution"]
    );
    entry.apiHooks = parseRows(
      fields.apiHooks.value,
      ["name", "description"]
    );
    entry.changelog = parseRows(
      fields.changelog.value,
      ["version", "date", "notes"]
    );
    entry.lastUpdated = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date());

    dirty = true;
    setState("Unpublished documentation changes", "dirty");
    return true;
  }

  async function loadDocs() {
    if (!fields.token.value.trim()) return;

    const response = await fetch(apiUrl(true), {
      headers: headers(),
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Could not load assets/docs.json."
      );
    }

    docs = JSON.parse(decodeBase64(data.content));
    if (!Array.isArray(docs)) docs = [];
    loaded = true;
    populate();
  }

  async function publish() {
    if (!selectedPlugin || !apply()) return;
    if (!fields.token.value.trim()) {
      setState("GitHub token is missing", "dirty");
      return;
    }

    fields.publish.disabled = true;
    setState("Publishing documentation…", "dirty");

    try {
      const latestResponse = await fetch(apiUrl(true), {
        headers: headers(),
        cache: "no-store"
      });
      const latest = await latestResponse.json();

      if (!latestResponse.ok) {
        throw new Error(
          latest.message || "Could not refresh assets/docs.json."
        );
      }

      const latestDocs = JSON.parse(
        decodeBase64(latest.content)
      );
      const entry = currentEntry();
      const index = latestDocs.findIndex(
        value => value.pluginId === entry.pluginId
      );

      if (index >= 0) {
        latestDocs[index] = entry;
      } else {
        latestDocs.push(entry);
      }

      latestDocs.sort((left, right) =>
        left.pluginId.localeCompare(right.pluginId)
      );

      const response = await fetch(apiUrl(false), {
        method: "PUT",
        headers: {
          ...headers(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message:
            `Update ${selectedPlugin.name} documentation`,
          content: encodeBase64(
            JSON.stringify(latestDocs, null, 2) + "\n"
          ),
          sha: latest.sha,
          branch: fields.branch.value.trim() || "main"
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `GitHub returned ${response.status}`
        );
      }

      docs = latestDocs;
      dirty = false;
      setState("Documentation published", "saved");
    } catch (error) {
      setState(error.message, "dirty");
    } finally {
      fields.publish.disabled = false;
    }
  }

  document.addEventListener(
    "mythicsuite:admin-plugin-selected",
    event => {
      selectedPlugin = event.detail.plugin;
      if (loaded) populate();
    }
  );

  const observer = new MutationObserver(() => {
    if (fields.layout.hidden || loaded) return;
    loadDocs().catch(error => {
      setState(error.message, "dirty");
    });
  });

  observer.observe(fields.layout, {
    attributes: true,
    attributeFilter: ["hidden"]
  });

  fields.apply.addEventListener("click", apply);
  fields.publish.addEventListener("click", publish);

  [
    fields.status,
    fields.overview,
    fields.installation,
    fields.commands,
    fields.permissions,
    fields.configuration,
    fields.integrations,
    fields.placeholders,
    fields.troubleshooting,
    fields.apiHooks,
    fields.changelog
  ].forEach(field => {
    field.addEventListener("input", () => {
      dirty = true;
      setState("Unpublished documentation changes", "dirty");
    });
  });

  window.addEventListener("beforeunload", event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
})();
