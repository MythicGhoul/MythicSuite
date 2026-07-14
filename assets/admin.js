
(() => {
  const elements = {
    owner: document.getElementById("repoOwner"),
    repo: document.getElementById("repoName"),
    branch: document.getElementById("repoBranch"),
    token: document.getElementById("githubToken"),
    toggleToken: document.getElementById("toggleToken"),
    connect: document.getElementById("connectButton"),
    disconnect: document.getElementById("disconnectButton"),
    status: document.getElementById("connectionStatus"),
    layout: document.getElementById("editorLayout"),
    search: document.getElementById("pluginSearch"),
    list: document.getElementById("pluginList"),
    count: document.getElementById("pluginCount"),
    form: document.getElementById("pluginForm"),
    title: document.getElementById("editorTitle"),
    publicLink: document.getElementById("publicPluginLink"),
    previewIcon: document.getElementById("previewIcon"),
    previewName: document.getElementById("previewName"),
    statusPreview: document.getElementById("statusPreview"),
    tagPreview: document.getElementById("tagPreview"),
    statusLabel: document.getElementById("statusLabel"),
    lifecycle: document.getElementById("lifecycle"),
    tags: document.getElementById("pluginTags"),
    category: document.getElementById("pluginCategory"),
    compatibility: document.getElementById("pluginCompatibility"),
    version: document.getElementById("pluginVersion"),
    bstatsId: document.getElementById("pluginBstatsId"),
    description: document.getElementById("pluginDescription"),
    apply: document.getElementById("applyButton"),
    publish: document.getElementById("publishButton"),
    saveState: document.getElementById("saveState")
  };

  let plugins = [];
  let selectedId = "";
  let fileSha = "";
  let dirty = false;

  const sessionToken = sessionStorage.getItem("mythicsuiteAdminToken");
  if (sessionToken) elements.token.value = sessionToken;

  function githubHeaders() {
    const token = elements.token.value.trim();
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function apiUrl() {
    const owner = encodeURIComponent(elements.owner.value.trim());
    const repo = encodeURIComponent(elements.repo.value.trim());
    const branch = encodeURIComponent(elements.branch.value.trim() || "main");
    return `https://api.github.com/repos/${owner}/${repo}/contents/assets/plugins.json?ref=${branch}`;
  }

  function contentApiUrl() {
    const owner = encodeURIComponent(elements.owner.value.trim());
    const repo = encodeURIComponent(elements.repo.value.trim());
    return `https://api.github.com/repos/${owner}/${repo}/contents/assets/plugins.json`;
  }

  function decodeUtf8Base64(value) {
    const binary = atob(String(value).replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeUtf8Base64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  function setConnection(message, className = "") {
    elements.status.textContent = message;
    elements.status.className = `connection-status ${className}`.trim();
  }

  function setSaveState(message, className = "") {
    elements.saveState.textContent = message;
    elements.saveState.className = `save-state ${className}`.trim();
  }

  function markDirty() {
    dirty = true;
    setSaveState("Unpublished local changes", "dirty");
  }

  function selectedPlugin() {
    return plugins.find(plugin => plugin.id === selectedId);
  }

  function tagsFromInput() {
    return [...new Set(
      elements.tags.value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean)
    )];
  }

  function renderPreview() {
    const plugin = selectedPlugin();
    if (!plugin) return;

    elements.previewName.textContent = plugin.name;
    elements.previewIcon.src = `../assets/icons/${plugin.id}.png`;
    elements.statusPreview.textContent =
      elements.statusLabel.value || plugin.statusLabel || "Status";

    elements.tagPreview.textContent = "";
    tagsFromInput().forEach(tag => {
      const span = document.createElement("span");
      span.textContent = tag;
      elements.tagPreview.append(span);
    });
  }

  function populateForm(plugin) {
    selectedId = plugin.id;
    elements.title.textContent = plugin.name;
    elements.previewName.textContent = plugin.name;
    elements.previewIcon.src = `../assets/icons/${plugin.id}.png`;
    elements.publicLink.href = `../plugins/${plugin.id}/`;

    elements.statusLabel.value = plugin.statusLabel || "";
    elements.lifecycle.value = plugin.lifecycle || "current";
    elements.tags.value = (plugin.tags || []).join(", ");
    elements.category.value = plugin.category || "";
    elements.compatibility.value = plugin.compatibility || "";
    elements.version.value = plugin.version || "";
    elements.bstatsId.value = plugin.bstatsId || plugin.bstats?.id || "";
    elements.description.value = plugin.description || "";

    renderPreview();
    renderPluginList();
  }

  function applyFormToPlugin() {
    const plugin = selectedPlugin();
    if (!plugin) return false;

    plugin.statusLabel = elements.statusLabel.value.trim();
    plugin.lifecycle = elements.lifecycle.value;
    plugin.tags = tagsFromInput();
    plugin.category = elements.category.value.trim();
    plugin.compatibility = elements.compatibility.value.trim();
    plugin.version = elements.version.value.trim();

    const bstatsValue = elements.bstatsId.value.trim();
    const bstatsMatch = bstatsValue.match(/(?:^|\/)(\d+)(?:\/?(?:[?#].*)?)$/);
    const bstatsId = bstatsMatch
      ? Number(bstatsMatch[1])
      : Number(bstatsValue);

    if (Number.isInteger(bstatsId) && bstatsId > 0) {
      plugin.bstatsId = bstatsId;
    } else {
      delete plugin.bstatsId;
      delete plugin.bstats;
    }

    plugin.description = elements.description.value.trim();

    renderPreview();
    renderPluginList();
    markDirty();
    return true;
  }

  function renderPluginList() {
    const query = elements.search.value.trim().toLowerCase();
    const filtered = plugins.filter(plugin =>
      `${plugin.name} ${plugin.category} ${plugin.statusLabel} ${(plugin.tags || []).join(" ")}`
        .toLowerCase()
        .includes(query)
    );

    elements.list.textContent = "";
    elements.count.textContent = String(filtered.length);

    filtered.forEach(plugin => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        `plugin-option ${plugin.id === selectedId ? "active" : ""}`;
      button.dataset.pluginId = plugin.id;

      const icon = document.createElement("img");
      icon.src = `../assets/icons/${plugin.id}.png`;
      icon.alt = "";

      const text = document.createElement("span");
      const name = document.createElement("b");
      name.textContent = plugin.name;
      const status = document.createElement("small");
      status.textContent = plugin.statusLabel;
      text.append(name, status);

      const dot = document.createElement("i");
      dot.title = plugin.lifecycle;

      button.append(icon, text, dot);
      button.addEventListener("click", () => populateForm(plugin));
      elements.list.append(button);
    });
  }

  async function readRepositoryFile() {
    const response = await fetch(apiUrl(), { headers: githubHeaders() });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `GitHub returned ${response.status}`);
    }

    fileSha = data.sha;
    plugins = JSON.parse(decodeUtf8Base64(data.content));
    if (!Array.isArray(plugins)) {
      throw new Error("plugins.json did not contain a plugin array.");
    }
  }

  async function connect() {
    const token = elements.token.value.trim();
    if (!token) {
      setConnection("Paste a GitHub token first.", "error");
      return;
    }

    elements.connect.disabled = true;
    setConnection("Connecting…");

    try {
      sessionStorage.setItem("mythicsuiteAdminToken", token);
      await readRepositoryFile();

      elements.layout.hidden = false;
      dirty = false;
      setSaveState("No unpublished changes");
      setConnection(`Connected · ${plugins.length} plugins loaded`, "connected");

      renderPluginList();
      if (plugins.length) populateForm(plugins[0]);
    } catch (error) {
      elements.layout.hidden = true;
      setConnection(error.message, "error");
    } finally {
      elements.connect.disabled = false;
    }
  }

  async function publish(event) {
    event.preventDefault();

    if (!selectedPlugin()) return;
    applyFormToPlugin();

    const token = elements.token.value.trim();
    if (!token) {
      setConnection("Your token is missing.", "error");
      return;
    }

    elements.publish.disabled = true;
    setSaveState("Publishing commit…", "dirty");

    try {
      // Refresh the SHA immediately before the write to avoid overwriting
      // someone else's newer repository edit.
      const latestResponse = await fetch(apiUrl(), {
        headers: githubHeaders()
      });
      const latest = await latestResponse.json();

      if (!latestResponse.ok) {
        throw new Error(latest.message || "Could not refresh plugins.json.");
      }

      const body = {
        message: `Update MythicSuite plugin metadata (${selectedPlugin().name})`,
        content: encodeUtf8Base64(
          JSON.stringify(plugins, null, 2) + "\n"
        ),
        sha: latest.sha,
        branch: elements.branch.value.trim() || "main"
      };

      const response = await fetch(contentApiUrl(), {
        method: "PUT",
        headers: {
          ...githubHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `GitHub returned ${response.status}`);
      }

      fileSha = result.content?.sha || fileSha;
      dirty = false;
      setSaveState("Published successfully", "saved");
      setConnection(
        "Commit created. GitHub Pages will publish the update shortly.",
        "connected"
      );
    } catch (error) {
      setSaveState("Publish failed", "dirty");
      setConnection(error.message, "error");
    } finally {
      elements.publish.disabled = false;
    }
  }

  elements.toggleToken.addEventListener("click", () => {
    const hidden = elements.token.type === "password";
    elements.token.type = hidden ? "text" : "password";
    elements.toggleToken.textContent = hidden ? "Hide" : "Show";
  });

  elements.connect.addEventListener("click", connect);

  elements.disconnect.addEventListener("click", () => {
    sessionStorage.removeItem("mythicsuiteAdminToken");
    elements.token.value = "";
    plugins = [];
    selectedId = "";
    fileSha = "";
    elements.layout.hidden = true;
    setConnection("Token cleared");
  });

  elements.search.addEventListener("input", renderPluginList);
  elements.apply.addEventListener("click", applyFormToPlugin);
  elements.form.addEventListener("submit", publish);

  [
    elements.statusLabel,
    elements.lifecycle,
    elements.tags,
    elements.category,
    elements.compatibility,
    elements.version,
    elements.bstatsId,
    elements.description
  ].forEach(input => {
    input.addEventListener("input", renderPreview);
    input.addEventListener("change", renderPreview);
  });

  window.addEventListener("beforeunload", event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
})();
