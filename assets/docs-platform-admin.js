
(() => {
  const individualButton =
    document.getElementById("syncPlatformDocsButton");
  const bulkButton =
    document.getElementById("syncAllPlatformDocsButton");

  if (
    !individualButton ||
    !bulkButton ||
    !window.MythicDocsPlatform
  ) return;

  const fields = {
    token: document.getElementById("githubToken"),
    owner: document.getElementById("repoOwner"),
    repo: document.getElementById("repoName"),
    branch: document.getElementById("repoBranch"),
    status: document.getElementById("docsSaveState"),
    overview: document.getElementById("docsOverview"),
    installation: document.getElementById("docsInstallation"),
    commands: document.getElementById("docsCommands"),
    permissions: document.getElementById("docsPermissions"),
    configuration: document.getElementById("docsConfiguration"),
    integrations: document.getElementById("docsIntegrations"),
    placeholders: document.getElementById("docsPlaceholders"),
    troubleshooting: document.getElementById("docsTroubleshooting"),
    apiHooks: document.getElementById("docsApiHooks")
  };

  let selectedPlugin = null;

  function headers() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${fields.token.value.trim()}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function contentUrl(path, includeRef = true) {
    const owner = encodeURIComponent(fields.owner.value.trim());
    const repo = encodeURIComponent(fields.repo.value.trim());
    const branch = encodeURIComponent(
      fields.branch.value.trim() || "main"
    );
    const encodedPath = path
      .split("/")
      .map(segment => encodeURIComponent(segment))
      .join("/");

    const base =
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

    return includeRef ? `${base}?ref=${branch}` : base;
  }

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
    fields.status.textContent = message;
    fields.status.className =
      `save-state ${className}`.trim();
  }

  function formatRows(rows, keys) {
    return (rows || [])
      .map(row =>
        keys.map(key => row[key] || "").join(" | ")
      )
      .join("\n");
  }

  function fillIfEmpty(field, value) {
    if (!field.value.trim() && value.trim()) {
      field.value = value;
      field.dispatchEvent(
        new Event("input", { bubbles: true })
      );
      return true;
    }
    return false;
  }

  async function readGithubJson(path) {
    const response = await fetch(contentUrl(path, true), {
      headers: headers(),
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Could not load ${path}.`
      );
    }

    return {
      sha: data.sha,
      value: JSON.parse(decodeBase64(data.content))
    };
  }

  async function writeGithubJson(path, value, sha, message) {
    const response = await fetch(contentUrl(path, false), {
      method: "PUT",
      headers: {
        ...headers(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        content: encodeBase64(
          JSON.stringify(value, null, 2) + "\n"
        ),
        sha,
        branch: fields.branch.value.trim() || "main"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Could not publish ${path}.`
      );
    }

    return data;
  }

  async function syncSelected() {
    if (!selectedPlugin) {
      setState("Choose a plugin first", "dirty");
      return;
    }

    individualButton.disabled = true;
    setState(
      `Reading ${selectedPlugin.name} descriptions…`,
      "dirty"
    );

    try {
      const result = await window.MythicDocsPlatform.extract(
        selectedPlugin
      );
      const parsed = result.parsed;
      let changed = 0;

      changed += fillIfEmpty(
        fields.installation,
        (parsed.installation || []).join("\n")
      ) ? 1 : 0;

      changed += fillIfEmpty(
        fields.commands,
        formatRows(
          parsed.commands,
          ["command", "permission", "description"]
        )
      ) ? 1 : 0;

      changed += fillIfEmpty(
        fields.permissions,
        formatRows(
          parsed.permissions,
          ["permission", "description"]
        )
      ) ? 1 : 0;

      changed += fillIfEmpty(
        fields.configuration,
        formatRows(
          parsed.configuration,
          ["section", "description"]
        )
      ) ? 1 : 0;

      changed += fillIfEmpty(
        fields.integrations,
        formatRows(
          parsed.integrations,
          ["name", "description"]
        )
      ) ? 1 : 0;

      changed += fillIfEmpty(
        fields.placeholders,
        formatRows(
          parsed.placeholders,
          ["placeholder", "description"]
        )
      ) ? 1 : 0;

      changed += fillIfEmpty(
        fields.troubleshooting,
        formatRows(
          parsed.troubleshooting,
          ["problem", "solution"]
        )
      ) ? 1 : 0;

      changed += fillIfEmpty(
        fields.apiHooks,
        formatRows(
          parsed.apiHooks,
          ["name", "description"]
        )
      ) ? 1 : 0;

      setState(
        changed
          ? `Imported missing sections from ${result.platforms.join(" and ")}. Review, then publish documentation.`
          : "No empty fields could be filled from the platform descriptions.",
        changed ? "dirty" : ""
      );
    } catch (error) {
      setState(error.message, "dirty");
    } finally {
      individualButton.disabled = false;
    }
  }

  async function runLimited(tasks, limit = 4) {
    const results = new Array(tasks.length);
    let index = 0;

    async function worker() {
      while (index < tasks.length) {
        const current = index++;
        try {
          results[current] = await tasks[current]();
        } catch (error) {
          results[current] = { error };
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(limit, tasks.length) },
        worker
      )
    );

    return results;
  }

  async function syncAll() {
    if (!fields.token.value.trim()) {
      setState("Connect to GitHub first", "dirty");
      return;
    }

    const approved = window.confirm(
      "Scan every public plugin description and publish all newly found commands, permissions, placeholders and other missing documentation in one docs.json commit?"
    );
    if (!approved) return;

    bulkButton.disabled = true;
    individualButton.disabled = true;
    setState("Loading plugins and documentation…", "dirty");

    try {
      const [pluginsFile, docsFile] = await Promise.all([
        readGithubJson("assets/plugins.json"),
        readGithubJson("assets/docs.json")
      ]);

      const plugins = pluginsFile.value.filter(plugin =>
        plugin?.spigot?.id || plugin?.modrinth?.id
      );
      const docs = Array.isArray(docsFile.value)
        ? docsFile.value
        : [];

      const byId = new Map(
        docs.map(entry => [entry.pluginId, entry])
      );

      let completed = 0;
      let totalAdded = 0;

      const tasks = plugins.map(plugin => async () => {
        const existing = byId.get(plugin.id) || {
          pluginId: plugin.id,
          status: "starter",
          overview: [
            plugin.description || plugin.tagline || ""
          ],
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

        const result = await window.MythicDocsPlatform.enrich(
          plugin,
          existing,
          { replace: false }
        );

        completed += 1;
        totalAdded += result.added;
        setState(
          `Scanning platform descriptions ${completed}/${plugins.length} · ${totalAdded} entries found`,
          "dirty"
        );

        if (result.added > 0) {
          result.documentation.lastUpdated =
            new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric"
            }).format(new Date());

          result.documentation.platformSources =
            result.platforms;

          byId.set(plugin.id, result.documentation);
        }

        return result;
      });

      await runLimited(tasks, 4);

      if (!totalAdded) {
        setState(
          "No new documentation entries were found.",
          ""
        );
        return;
      }

      const updatedDocs = [...byId.values()].sort(
        (left, right) =>
          left.pluginId.localeCompare(right.pluginId)
      );

      // Refresh the SHA immediately before the one-file commit.
      const latestDocs = await readGithubJson(
        "assets/docs.json"
      );

      await writeGithubJson(
        "assets/docs.json",
        updatedDocs,
        latestDocs.sha,
        `Sync missing documentation from SpigotMC and Modrinth`
      );

      setState(
        `Published ${totalAdded} new documentation entries from platform descriptions.`,
        "saved"
      );

      window.setTimeout(
        () => window.location.reload(),
        1700
      );
    } catch (error) {
      setState(error.message, "dirty");
    } finally {
      bulkButton.disabled = false;
      individualButton.disabled = false;
    }
  }

  document.addEventListener(
    "mythicsuite:admin-plugin-selected",
    event => {
      selectedPlugin = event.detail.plugin;
    }
  );

  individualButton.addEventListener(
    "click",
    syncSelected
  );

  bulkButton.addEventListener(
    "click",
    syncAll
  );
})();
