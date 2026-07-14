
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
    elements.previewIcon.src = plugin.icon ? `../${plugin.icon}` : `../assets/icons/${plugin.id}.png`;
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
    elements.previewIcon.src = plugin.icon ? `../${plugin.icon}` : `../assets/icons/${plugin.id}.png`;
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
    document.dispatchEvent(
      new CustomEvent("mythicsuite:admin-plugin-selected", {
        detail: { plugin }
      })
    );
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
      icon.src = plugin.icon ? `../${plugin.icon}` : `../assets/icons/${plugin.id}.png`;
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


// =========================================================
// SPIGOT + MODRINTH PROJECT DISCOVERY AND ONE-CLICK IMPORT
// =========================================================
(() => {
  const panel = document.getElementById("importPanel");
  if (!panel) return;

  const elements = {
    editorLayout: document.getElementById("editorLayout"),
    token: document.getElementById("githubToken"),
    owner: document.getElementById("repoOwner"),
    repo: document.getElementById("repoName"),
    branch: document.getElementById("repoBranch"),
    modrinthUser: document.getElementById("modrinthUsername"),
    spigotAuthor: document.getElementById("spigotAuthorId"),
    manualUrl: document.getElementById("manualPluginUrl"),
    inspect: document.getElementById("inspectPluginButton"),
    scan: document.getElementById("scanProfilesButton"),
    status: document.getElementById("importStatus"),
    results: document.getElementById("importResults"),
    count: document.getElementById("importResultCount"),
    list: document.getElementById("importCandidateList")
  };

  let candidates = [];
  let automaticScanStarted = false;
  let scanning = false;

  const GITHUB_API = "https://api.github.com";
  const MODRINTH_API = "https://api.modrinth.com/v2";
  const SPIGET_API = "https://api.spiget.org/v2";

  function headers() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${elements.token.value.trim()}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function repoInfo() {
    return {
      owner: elements.owner.value.trim(),
      repo: elements.repo.value.trim(),
      branch: elements.branch.value.trim() || "main"
    };
  }

  function setStatus(message, className = "") {
    elements.status.textContent = message;
    elements.status.className = `import-status ${className}`.trim();
  }

  function pathUrl(path, includeRef = true) {
    const { owner, repo, branch } = repoInfo();
    const encodedPath = path
      .split("/")
      .map(segment => encodeURIComponent(segment))
      .join("/");

    const base =
      `${GITHUB_API}/repos/${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/contents/${encodedPath}`;

    return includeRef ? `${base}?ref=${encodeURIComponent(branch)}` : base;
  }

  function decodeUtf8Base64(value) {
    const binary = atob(String(value || "").replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, character =>
      character.charCodeAt(0)
    );
    return new TextDecoder().decode(bytes);
  }

  function encodeUtf8Base64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  async function fetchJSON(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        ...options
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Request failed with ${response.status}`
        );
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function getRepositoryFile(path) {
    const response = await fetch(pathUrl(path), {
      headers: headers(),
      cache: "no-store"
    });

    const data = await response.json().catch(() => null);

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(
        data?.message || `Could not read ${path} from GitHub.`
      );
    }

    return {
      sha: data.sha,
      text: decodeUtf8Base64(data.content || ""),
      content: data.content || ""
    };
  }

  async function putRepositoryFile(path, base64Content, message) {
    const existing = await getRepositoryFile(path);
    const { branch } = repoInfo();

    const body = {
      message,
      content: base64Content,
      branch
    };

    if (existing?.sha) body.sha = existing.sha;

    const response = await fetch(pathUrl(path, false), {
      method: "PUT",
      headers: {
        ...headers(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.message || `GitHub could not write ${path}.`
      );
    }

    return data;
  }


  /**
   * Publish every generated import file in one Git commit.
   *
   * The previous importer used the repository-contents endpoint once per file.
   * Each request created its own commit, so the SHA for plugins.json could be
   * stale while GitHub was still exposing the previous commit. This uses the
   * Git database API instead:
   *
   *   current branch ref -> base commit/tree -> blobs -> tree -> commit -> ref
   *
   * The branch moves only after every blob and the new commit exist.
   */
  async function commitFilesAtomically(changes, message, attempts = 3) {
    if (!Array.isArray(changes) || !changes.length) {
      throw new Error("There are no files to publish.");
    }

    const { owner, repo, branch } = repoInfo();
    const repository =
      `${GITHUB_API}/repos/${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}`;

    async function githubRequest(url, options = {}) {
      const response = await fetch(url, {
        cache: "no-store",
        ...options,
        headers: {
          ...headers(),
          ...(options.headers || {})
        }
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(
          data?.message ||
          `GitHub returned ${response.status} while creating the commit.`
        );
        error.status = response.status;
        error.details = data;
        throw error;
      }

      return data;
    }

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const reference = await githubRequest(
          `${repository}/git/ref/heads/${encodeURIComponent(branch)}`
        );

        const parentCommitSha = reference.object.sha;

        const parentCommit = await githubRequest(
          `${repository}/git/commits/${encodeURIComponent(parentCommitSha)}`
        );

        const blobs = await Promise.all(
          changes.map(async change => {
            const blob = await githubRequest(
              `${repository}/git/blobs`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: change.content,
                  encoding: change.encoding || "base64"
                })
              }
            );

            return {
              path: change.path,
              mode: change.mode || "100644",
              type: "blob",
              sha: blob.sha
            };
          })
        );

        const tree = await githubRequest(
          `${repository}/git/trees`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base_tree: parentCommit.tree.sha,
              tree: blobs
            })
          }
        );

        const commit = await githubRequest(
          `${repository}/git/commits`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              tree: tree.sha,
              parents: [parentCommitSha]
            })
          }
        );

        await githubRequest(
          `${repository}/git/refs/heads/${encodeURIComponent(branch)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sha: commit.sha,
              force: false
            })
          }
        );

        return commit;
      } catch (error) {
        const retryable =
          attempt < attempts &&
          [409, 422].includes(Number(error.status));

        if (!retryable) throw error;

        setStatus(
          `The branch changed during publishing. Retrying the single commit (${attempt + 1}/${attempts})…`,
          "busy"
        );

        await new Promise(resolve =>
          window.setTimeout(resolve, 700 * attempt)
        );
      }
    }

    throw new Error("The bulk commit could not be completed.");
  }

  async function buildUpdatedSitemap(plugin) {
    const current = await getRepositoryFile("sitemap.txt");
    const urls = [
      `https://mythicsuite.co.uk/plugins/${plugin.id}/`,
      `https://mythicsuite.co.uk/docs/${plugin.id}/`
    ];

    const lines = current
      ? current.text
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)
      : [];

    urls.forEach(url => {
      if (!lines.includes(url)) lines.push(url);
    });

    return lines.join("\n") + "\n";
  }

  async function loadExistingPlugins() {
    const file = await getRepositoryFile("assets/plugins.json");
    if (!file) throw new Error("assets/plugins.json was not found.");

    const plugins = JSON.parse(file.text);
    if (!Array.isArray(plugins)) {
      throw new Error("assets/plugins.json is not a plugin array.");
    }
    return plugins;
  }

  function plainTextFromHtml(value) {
    if (!value) return "";
    const doc = new DOMParser().parseFromString(
      String(value),
      "text/html"
    );
    return (doc.body.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function decodeSpigetText(value) {
    if (!value) return "";
    try {
      return decodeUtf8Base64(value);
    } catch (_) {
      return String(value);
    }
  }

  function stripMarkdown(value) {
    return String(value || "")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/[*_~>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shorten(value, maximum = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maximum) return text;
    const sliced = text.slice(0, maximum - 1);
    const split = sliced.lastIndexOf(" ");
    return (split > maximum * .55 ? sliced.slice(0, split) : sliced) + "…";
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, character => character.toUpperCase())
      .trim();
  }

  function cleanSpigotName(value) {
    return String(value || "")
      .replace(/\[[^\]]*]/g, " ")
      .replace(/[✨⭐🌟⚡🔥💎🎉🚀]+/g, " ")
      .split(/\s+-\s+/)[0]
      .replace(/\s+/g, " ")
      .trim();
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 56) || "new-plugin";
  }

  function canonicalName(value) {
    return cleanSpigotName(value)
      .toLowerCase()
      .replace(/^mythic(?=[a-z0-9])/i, "mythic")
      .replace(/[^a-z0-9]+/g, "");
  }

  function platformPreview(candidate) {
    return (
      candidate.modrinth?.icon_url ||
      (
        candidate.spigot?.icon?.data
          ? `data:image/png;base64,${candidate.spigot.icon.data}`
          : "../assets/favicon.svg"
      )
    );
  }

  function existingSets(plugins) {
    return {
      spigot: new Set(
        plugins
          .map(plugin => String(plugin?.spigot?.id || ""))
          .filter(Boolean)
      ),
      modrinth: new Set(
        plugins
          .map(plugin => String(plugin?.modrinth?.id || ""))
          .filter(Boolean)
      ),
      names: new Set(
        plugins.map(plugin => canonicalName(plugin.name))
      )
    };
  }

  function groupCandidates(rawCandidates) {
    const grouped = new Map();

    rawCandidates.forEach(candidate => {
      const key = canonicalName(candidate.name) ||
        `${candidate.platform}-${candidate.platformId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          name: candidate.name,
          description: candidate.description || "",
          modrinth: null,
          spigot: null
        });
      }

      const groupedCandidate = grouped.get(key);
      groupedCandidate[candidate.platform] = candidate.data;

      if (
        candidate.platform === "modrinth" ||
        !groupedCandidate.description
      ) {
        groupedCandidate.name = candidate.name;
        groupedCandidate.description = candidate.description || "";
      }
    });

    return [...grouped.values()];
  }

  function isModrinthPlugin(project) {
    return String(project?.project_type || "")
      .trim()
      .toLowerCase() === "plugin";
  }

  async function scanModrinth(existing) {
    const username = elements.modrinthUser.value.trim();
    if (!username) return [];

    const projects = await fetchJSON(
      `${MODRINTH_API}/user/${encodeURIComponent(username)}/projects`
    );

    return projects
      .filter(project =>
        isModrinthPlugin(project) &&
        !existing.modrinth.has(String(project.id)) &&
        !existing.names.has(canonicalName(project.title)) &&
        ["approved", "unlisted", "archived"].includes(project.status)
      )
      .map(project => ({
        platform: "modrinth",
        platformId: project.id,
        name: project.title,
        description: project.description,
        data: project
      }));
  }

  async function scanSpigot(existing) {
    const authorId = elements.spigotAuthor.value.trim();
    if (!authorId) return [];

    const resources = await fetchJSON(
      `${SPIGET_API}/authors/${encodeURIComponent(authorId)}` +
      `/resources?size=100&page=1&sort=-updateDate`
    );

    return resources
      .filter(resource =>
        !existing.spigot.has(String(resource.id)) &&
        !existing.names.has(canonicalName(resource.name))
      )
      .map(resource => ({
        platform: "spigot",
        platformId: resource.id,
        name: cleanSpigotName(resource.name),
        description: resource.tag || "",
        data: resource
      }));
  }

  function renderCandidates() {
    elements.list.textContent = "";
    elements.count.textContent = String(candidates.length);
    elements.results.hidden = false;

    if (!candidates.length) {
      const empty = document.createElement("div");
      empty.className = "import-empty";
      empty.textContent =
        "No unlisted public plugin projects were found. Modrinth server listings, mods, modpacks, resource packs and shaders are ignored.";
      elements.list.append(empty);
      return;
    }

    candidates.forEach(candidate => {
      const article = document.createElement("article");
      article.className = "import-candidate";
      article.dataset.candidateKey = candidate.key;

      const icon = document.createElement("img");
      icon.src = platformPreview(candidate);
      icon.alt = "";

      const copy = document.createElement("div");
      copy.className = "import-candidate-copy";

      const head = document.createElement("div");
      head.className = "import-candidate-head";

      const name = document.createElement("h4");
      name.textContent = candidate.name;

      const platforms = document.createElement("div");
      platforms.className = "import-platforms";

      if (candidate.spigot) {
        const badge = document.createElement("span");
        badge.textContent = "SpigotMC";
        platforms.append(badge);
      }

      if (candidate.modrinth) {
        const badge = document.createElement("span");
        badge.textContent = "Modrinth";
        platforms.append(badge);
      }

      head.append(name, platforms);

      const description = document.createElement("p");
      description.textContent =
        shorten(candidate.description, 230) ||
        "Public Minecraft plugin discovered on your profile.";

      const meta = document.createElement("div");
      meta.className = "import-candidate-meta";

      if (candidate.spigot?.downloads !== undefined) {
        const item = document.createElement("span");
        item.textContent =
          `${new Intl.NumberFormat("en-GB").format(candidate.spigot.downloads)} Spigot downloads`;
        meta.append(item);
      }

      if (candidate.modrinth?.downloads !== undefined) {
        const item = document.createElement("span");
        item.textContent =
          `${new Intl.NumberFormat("en-GB").format(candidate.modrinth.downloads)} Modrinth downloads`;
        meta.append(item);
      }

      copy.append(head, description, meta);

      const actions = document.createElement("div");
      actions.className = "import-candidate-actions";

      const importButton = document.createElement("button");
      importButton.type = "button";
      importButton.className = "button primary";
      importButton.textContent = "Approve and publish";
      importButton.addEventListener("click", () =>
        importCandidate(candidate, article)
      );

      actions.append(importButton);
      article.append(icon, copy, actions);
      elements.list.append(article);
    });
  }

  async function scanProfiles() {
    if (scanning) return;
    if (!elements.token.value.trim()) {
      setStatus("Connect to GitHub before scanning.", "error");
      return;
    }

    scanning = true;
    elements.scan.disabled = true;
    setStatus("Checking SpigotMC and Modrinth profiles…", "busy");

    try {
      const plugins = await loadExistingPlugins();
      const existing = existingSets(plugins);

      const results = await Promise.allSettled([
        scanModrinth(existing),
        scanSpigot(existing)
      ]);

      const rawCandidates = results.flatMap(result =>
        result.status === "fulfilled" ? result.value : []
      );

      candidates = groupCandidates(rawCandidates);
      renderCandidates();

      const failures = results.filter(result => result.status === "rejected");
      if (failures.length && candidates.length) {
        setStatus(
          `Found ${candidates.length} new project(s); one platform could not be reached.`,
          "success"
        );
      } else if (failures.length === results.length) {
        throw new Error("Neither profile service could be reached.");
      } else {
        setStatus(
          candidates.length
            ? `Found ${candidates.length} project(s) awaiting approval.`
            : "Profiles are fully synchronised with MythicSuite.",
          "success"
        );
      }
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      scanning = false;
      elements.scan.disabled = false;
    }
  }

  function parseManualUrl(value) {
    const url = String(value || "").trim();

    const spigot = url.match(
      /spigotmc\.org\/resources\/(?:[^/?#]*\.)?(\d+)(?:[/?#]|$)/i
    );
    if (spigot) return { platform: "spigot", id: spigot[1] };

    const modrinth = url.match(
      /modrinth\.com\/(?:plugin|project|mod)\/([^/?#]+)/i
    );
    if (modrinth) {
      return {
        platform: "modrinth",
        id: decodeURIComponent(modrinth[1])
      };
    }

    return null;
  }

  async function inspectManualUrl() {
    const parsed = parseManualUrl(elements.manualUrl.value);

    if (!parsed) {
      setStatus(
        "That does not look like a SpigotMC or Modrinth project URL.",
        "error"
      );
      return;
    }

    setStatus("Inspecting the supplied project…", "busy");
    elements.inspect.disabled = true;

    try {
      const plugins = await loadExistingPlugins();
      const existing = existingSets(plugins);
      let raw;

      if (parsed.platform === "spigot") {
        if (existing.spigot.has(String(parsed.id))) {
          throw new Error("That Spigot resource is already listed.");
        }

        const resource = await fetchJSON(
          `${SPIGET_API}/resources/${encodeURIComponent(parsed.id)}`
        );

        raw = {
          platform: "spigot",
          platformId: resource.id,
          name: cleanSpigotName(resource.name),
          description: resource.tag || "",
          data: resource
        };
      } else {
        const project = await fetchJSON(
          `${MODRINTH_API}/project/${encodeURIComponent(parsed.id)}`
        );

        if (!isModrinthPlugin(project)) {
          throw new Error(
            `Only Modrinth projects with project type "plugin" can be imported. ` +
            `This project is "${project.project_type || "unknown"}".`
          );
        }

        if (existing.modrinth.has(String(project.id))) {
          throw new Error("That Modrinth project is already listed.");
        }

        raw = {
          platform: "modrinth",
          platformId: project.id,
          name: project.title,
          description: project.description,
          data: project
        };
      }

      candidates = groupCandidates([raw]);
      renderCandidates();
      setStatus("Project ready for approval.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      elements.inspect.disabled = false;
    }
  }

  function extractParagraphs(value) {
    const raw = String(value || "");
    if (!raw) return [];

    if (/<[a-z][\s\S]*>/i.test(raw)) {
      const documentValue = new DOMParser().parseFromString(raw, "text/html");
      return [...documentValue.querySelectorAll("p")]
        .map(paragraph =>
          paragraph.textContent.replace(/\s+/g, " ").trim()
        )
        .filter(paragraph => paragraph.length > 35)
        .slice(0, 4);
    }

    return raw
      .split(/\n\s*\n/)
      .map(paragraph => stripMarkdown(paragraph))
      .filter(paragraph => paragraph.length > 35)
      .slice(0, 4);
  }

  function extractFeatures(value, fallback = []) {
    const raw = String(value || "");
    const features = [];

    if (/<[a-z][\s\S]*>/i.test(raw)) {
      const documentValue = new DOMParser().parseFromString(raw, "text/html");
      documentValue.querySelectorAll("li").forEach(item => {
        const text = item.textContent.replace(/\s+/g, " ").trim();
        if (text.length >= 4 && text.length <= 110) features.push(text);
      });
    } else {
      raw.split(/\r?\n/).forEach(line => {
        const match = line.match(
          /^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/
        );
        if (!match) return;
        const text = stripMarkdown(match[1]);
        if (text.length >= 4 && text.length <= 110) features.push(text);
      });
    }

    fallback.forEach(value => {
      const text = titleCase(value);
      if (text) features.push(text);
    });

    return [...new Set(features)].slice(0, 6);
  }

  async function fullSpigot(resource) {
    if (!resource) return null;

    const id = resource.id;
    const details = resource.description
      ? resource
      : await fetchJSON(`${SPIGET_API}/resources/${encodeURIComponent(id)}`);

    const [version, category] = await Promise.all([
      fetchJSON(
        `${SPIGET_API}/resources/${encodeURIComponent(id)}/versions/latest`
      ).catch(() => null),
      details.category?.id
        ? fetchJSON(
            `${SPIGET_API}/categories/${encodeURIComponent(details.category.id)}`
          ).catch(() => null)
        : null
    ]);

    return { details, version, category };
  }

  async function fullModrinth(project) {
    if (!project) return null;

    const details = project.body
      ? project
      : await fetchJSON(
          `${MODRINTH_API}/project/${encodeURIComponent(project.id || project.slug)}`
        );

    if (!isModrinthPlugin(details)) {
      throw new Error(
        `Only Modrinth plugin projects can be imported. ` +
        `${details.title || "This project"} is type "${details.project_type || "unknown"}".`
      );
    }

    const versions = await fetchJSON(
      `${MODRINTH_API}/project/${encodeURIComponent(details.id)}/version`
    ).catch(() => []);

    const latest = Array.isArray(versions)
      ? versions
          .filter(version => version.date_published)
          .sort(
            (left, right) =>
              Date.parse(right.date_published) -
              Date.parse(left.date_published)
          )[0] || null
      : null;

    return { details, latest };
  }

  function versionCompatibility(modrinth, spigot) {
    const modVersions =
      modrinth?.latest?.game_versions ||
      modrinth?.details?.game_versions ||
      [];

    if (modVersions.length) {
      const values = [...new Set(modVersions)].slice(-6);
      return `Paper/Spigot ${values.join(", ")}`;
    }

    const tested = spigot?.details?.testedVersions || [];
    if (tested.length) {
      return `Paper/Spigot ${tested.slice(-6).join(", ")}`;
    }

    return "Paper/Spigot — see the public release page";
  }

  function friendlyCategory(modrinth, spigot) {
    if (spigot?.category?.name) return spigot.category.name;

    const categories = modrinth?.details?.categories || [];
    const ignored = new Set([
      "paper", "spigot", "bukkit", "folia", "purpur",
      "minecraft", "server-side", "game-mechanics"
    ]);

    const category = categories.find(value => !ignored.has(value));
    return category ? titleCase(category) : "Minecraft Server Plugin";
  }

  function importedTags(modrinth, spigot) {
    const values = [];

    if (modrinth?.details?.categories) {
      values.push(...modrinth.details.categories);
    }

    if (modrinth?.details?.loaders) {
      values.push(...modrinth.details.loaders);
    }

    if (spigot?.category?.name) {
      values.push(spigot.category.name);
    }

    return [...new Set(
      values
        .map(titleCase)
        .filter(Boolean)
    )].slice(0, 4);
  }

  function createLongDescription(plugin, bodyText, paragraphs, features) {
    const intro = paragraphs.length
      ? paragraphs.slice(0, 2)
      : [
          plugin.description,
          `${plugin.name} is published as a public Minecraft server resource and is tracked automatically by MythicSuite.`
        ];

    const workflow = paragraphs.length > 2
      ? paragraphs.slice(2, 4)
      : [
          `Install ${plugin.name}, review its public documentation and configure the system for the way your community plays.`,
          `Future public releases, platform statistics and changelog information are refreshed automatically on this page.`
        ];

    const safeFeatures = features.length
      ? features
      : [
          "Public release tracking",
          "Automatic version updates",
          "Minecraft server integration"
        ];

    return {
      intro,
      workflowTitle: `Bring ${plugin.name} into a live server`,
      workflow,
      benefits: safeFeatures.slice(0, 4),
      administration:
        `Configuration and operational details are imported from the public project listing. ` +
        `Server owners should review the original platform documentation before deploying a new release to production.`,
      featureDetails: Object.fromEntries(
        safeFeatures.map(feature => [
          feature,
          `${feature} is included in the public project listing. Open the platform page for exact configuration and release-specific behaviour.`
        ])
      ),
      bestFor:
        `Minecraft communities looking for ${plugin.description.toLowerCase()}`,
      setup: [
        "Download the latest compatible release from SpigotMC or Modrinth.",
        "Stop the server, place the plugin JAR in the plugins folder and restart.",
        "Review the generated configuration and public documentation.",
        "Test permissions, integrations and upgrade behaviour before wider rollout."
      ]
    };
  }

  async function buildPlugin(candidate) {
    const [spigot, modrinth] = await Promise.all([
      fullSpigot(candidate.spigot).catch(() => null),
      fullModrinth(candidate.modrinth).catch(() => null)
    ]);

    if (!spigot && !modrinth) {
      throw new Error("The project details could not be loaded.");
    }

    const name =
      modrinth?.details?.title ||
      cleanSpigotName(spigot?.details?.name) ||
      candidate.name;

    const platformBody =
      modrinth?.details?.body ||
      decodeSpigetText(spigot?.details?.description) ||
      "";

    const plainBody = /<[a-z][\s\S]*>/i.test(platformBody)
      ? plainTextFromHtml(platformBody)
      : stripMarkdown(platformBody);

    const shortDescription =
      modrinth?.details?.description ||
      spigot?.details?.tag ||
      shorten(plainBody, 210) ||
      `${name} is a public Minecraft server plugin.`;

    const paragraphs = extractParagraphs(platformBody);
    const tags = importedTags(modrinth, spigot);
    const features = extractFeatures(platformBody, tags);

    const idBase = slugify(
      modrinth?.details?.slug ||
      name
    );

    const version =
      modrinth?.latest?.version_number ||
      spigot?.version?.name ||
      spigot?.details?.version?.name ||
      "New";

    const plugin = {
      id: idBase,
      name,
      icon: "assets/favicon.svg",
      category: friendlyCategory(modrinth, spigot),
      statusLabel: "Public Plugin",
      lifecycle: "current",
      listed: true,
      tagline: shortDescription,
      description: shortDescription,
      features,
      tags,
      integrations: [],
      compatibility: versionCompatibility(modrinth, spigot),
      version,
      spigot_url: spigot
        ? `https://www.spigotmc.org/resources/${spigot.details.id}/`
        : null,
      modrinth_url: modrinth
        ? `https://modrinth.com/project/${modrinth.details.slug || modrinth.details.id}`
        : null,
      spigot: spigot
        ? {
            id: String(spigot.details.id),
            downloads: Number(spigot.details.downloads || 0),
            rating: Number(spigot.details.rating?.average || 0),
            ratings: Number(spigot.details.rating?.count || 0),
            version,
            updated: spigot.details.updateDate
              ? new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                }).format(
                  new Date(
                    Number(spigot.details.updateDate) < 1e12
                      ? Number(spigot.details.updateDate) * 1000
                      : Number(spigot.details.updateDate)
                  )
                )
              : ""
          }
        : null,
      modrinth: modrinth
        ? {
            id: String(modrinth.details.id),
            downloads: Number(modrinth.details.downloads || 0),
            followers: Number(modrinth.details.followers || 0)
          }
        : null
    };

    plugin.longDescription = createLongDescription(
      plugin,
      plainBody,
      paragraphs,
      features
    );

    return { plugin, spigot, modrinth };
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;

    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(
        ...bytes.subarray(index, index + chunk)
      );
    }

    return btoa(binary);
  }

  function extensionFor(contentType, bytes) {
    const type = String(contentType || "").toLowerCase();

    if (type.includes("webp")) return "webp";
    if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
    if (type.includes("gif")) return "gif";
    if (type.includes("svg")) return "svg";
    if (type.includes("png")) return "png";

    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) return "png";

    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";

    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46
    ) return "webp";

    return "png";
  }

  async function downloadIcon(id, spigot, modrinth) {
    const modrinthUrl = modrinth?.details?.icon_url;

    if (modrinthUrl) {
      try {
        const response = await fetch(modrinthUrl, { cache: "no-store" });
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          const extension = extensionFor(
            response.headers.get("content-type"),
            bytes
          );
          return {
            path: `assets/icons/${id}.${extension}`,
            base64: bytesToBase64(bytes)
          };
        }
      } catch (_) {}
    }

    const data = spigot?.details?.icon?.data;
    if (data) {
      try {
        const clean = String(data).replace(/^data:[^,]+,/, "");
        const binary = atob(clean.replace(/\s+/g, ""));
        const bytes = Uint8Array.from(binary, character =>
          character.charCodeAt(0)
        );
        const extension = extensionFor("", bytes);

        return {
          path: `assets/icons/${id}.${extension}`,
          base64: bytesToBase64(bytes)
        };
      } catch (_) {}
    }

    return null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function statusClass(lifecycle) {
    const classes = {
      current: "status-public",
      exclusive: "status-exclusive",
      development: "status-dev",
      planned: "status-planned",
      legacy: "status-legacy"
    };
    return classes[lifecycle] || "status-public";
  }

  function accentFor(id) {
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
  }

  function platformButtons(plugin) {
    const buttons = [];

    if (plugin.spigot_url) {
      buttons.push(
        `<a class="button button-primary" href="${escapeHtml(plugin.spigot_url)}" ` +
        `rel="noopener" target="_blank">View on SpigotMC ↗</a>`
      );
    }

    if (plugin.modrinth_url) {
      buttons.push(
        `<a class="button button-secondary" href="${escapeHtml(plugin.modrinth_url)}" ` +
        `rel="noopener" target="_blank">View on Modrinth ↗</a>`
      );
    }

    return buttons.join("");
  }

  function metricsHtml(plugin) {
    const spigotId = plugin.spigot?.id || "";
    const modrinthId = plugin.modrinth?.id || "";

    const spigotDownloads = spigotId
      ? `<strong data-live-platform="spigot" data-resource-id="${escapeHtml(spigotId)}" data-stat-kind="downloads">${plugin.spigot.downloads || 0}</strong>`
      : "<strong>—</strong>";

    const modrinthDownloads = modrinthId
      ? `<strong data-live-platform="modrinth" data-resource-id="${escapeHtml(modrinthId)}" data-stat-kind="downloads">${plugin.modrinth.downloads || 0}</strong>`
      : "<strong>—</strong>";

    const rating = spigotId
      ? `<strong data-live-platform="spigot" data-resource-id="${escapeHtml(spigotId)}" data-stat-kind="rating">${plugin.spigot.rating ? `${plugin.spigot.rating.toFixed(1)}/5` : "Not rated"}</strong>`
      : "<strong>Not available</strong>";

    const ratingsLabel = spigotId
      ? `<span data-live-platform="spigot" data-resource-id="${escapeHtml(spigotId)}" data-stat-kind="ratings">${plugin.spigot.ratings || 0}</span> Spigot ratings`
      : "Spigot rating";

    return `
      <div class="metric view-metric">
        <strong>
          <a class="plugin-view-counter"
             href="https://hits.sh/mythicsuite.co.uk/plugins/${escapeHtml(plugin.id)}/"
             target="_blank" rel="noopener" data-no-click-track>
            <img src="https://hits.sh/mythicsuite.co.uk/plugins/${escapeHtml(plugin.id)}.svg?style=flat-square&label=PAGE%20VIEWS&color=a855f7&labelColor=10121d"
                 alt="${escapeHtml(plugin.name)} page views" loading="eager">
          </a>
        </strong>
        <span>Live plugin page views</span>
      </div>
      <div class="metric">${spigotDownloads}<span>Spigot downloads</span></div>
      <div class="metric">${modrinthDownloads}<span>Modrinth downloads</span></div>
      <div class="metric">${rating}<span>${ratingsLabel}</span></div>
      <div class="metric live-version-metric">
        <strong data-live-release-version>${escapeHtml(plugin.version)}</strong>
        <span>Current version</span>
      </div>
      <div class="metric live-update-metric">
        <strong data-live-release-date>${escapeHtml(plugin.spigot?.updated || "Live")}</strong>
        <span>Last public update</span>
      </div>
    `;
  }

  function reviewsSection(plugin) {
    if (!plugin.spigot?.id || !plugin.spigot_url) return "";

    const id = escapeHtml(plugin.spigot.id);
    const reviewUrl = `${plugin.spigot_url.replace(/\/?$/, "/")}reviews`;

    return `
      <section class="reviews-section"
               data-resource-id="${id}" data-spigot-reviews>
        <div class="section-head">
          <div>
            <p class="eyebrow">Community feedback</p>
            <h2>Latest SpigotMC reviews</h2>
            <p>Live ratings and recent written reviews from the public resource page.</p>
          </div>
        </div>
        <div class="review-summary">
          <div class="review-score">
            <strong data-live-platform="spigot"
                    data-resource-id="${id}"
                    data-stat-kind="rating">Not rated</strong>
            <span class="review-stars"
                  data-live-stars
                  data-resource-id="${id}">☆☆☆☆☆</span>
            <span>
              <b data-live-platform="spigot"
                 data-resource-id="${id}"
                 data-stat-kind="ratings">0</b>
              community ratings
            </span>
          </div>
          <a class="button button-secondary"
             href="${escapeHtml(reviewUrl)}"
             rel="noopener" target="_blank">
            Read all reviews on SpigotMC ↗
          </a>
        </div>
        <div class="review-grid" data-review-list>
          <article class="review-card review-loading">
            Loading the latest Spigot reviews…
          </article>
        </div>
        <p class="review-note">
          Review data is loaded through Spiget. Static fallbacks remain visible
          if the service is unavailable.
        </p>
      </section>
    `;
  }

  async function renderPluginPage(plugin) {
    const response = await fetch(
      `../assets/plugin-page-template.html?template=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("The plugin-page template could not be loaded.");
    }

    let template = await response.text();
    const long = plugin.longDescription || {};
    const featureDetails = long.featureDetails || {};

    const replacements = {
      PLUGIN_ID: escapeHtml(plugin.id),
      NAME: escapeHtml(plugin.name),
      META_DESCRIPTION: escapeHtml(plugin.description),
      ICON_PATH: escapeHtml(plugin.icon || `assets/icons/${plugin.id}.png`),
      ACCENT: escapeHtml(plugin.accent || accentFor(plugin.id)),
      STATUS_CLASS: statusClass(plugin.lifecycle),
      STATUS_LABEL: escapeHtml(plugin.statusLabel),
      TAGLINE: escapeHtml(plugin.tagline || plugin.description),
      PRIMARY_BUTTONS: platformButtons(plugin),
      METRICS: metricsHtml(plugin),
      INTRO_HTML: (long.intro || [plugin.description])
        .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
        .join(""),
      BEST_FOR: escapeHtml(long.bestFor || plugin.description),
      WORKFLOW_TITLE: escapeHtml(
        long.workflowTitle || `Using ${plugin.name} on a live server`
      ),
      WORKFLOW_HTML: (long.workflow || [])
        .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
        .join(""),
      BENEFITS_HTML: (long.benefits || plugin.features || [])
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join(""),
      ADMINISTRATION: escapeHtml(long.administration || plugin.description),
      COMPATIBILITY: escapeHtml(plugin.compatibility),
      INTEGRATIONS: escapeHtml(
        plugin.integrations?.length
          ? plugin.integrations.join(", ")
          : "No required integrations listed"
      ),
      VERSION: escapeHtml(plugin.version),
      CATEGORY: escapeHtml(plugin.category),
      AVAILABILITY: escapeHtml(plugin.statusLabel),
      TAGS_HTML: (plugin.tags || [])
        .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join(""),
      DOWNLOAD_OPTIONS: escapeHtml(
        plugin.spigot_url && plugin.modrinth_url
          ? "Choose SpigotMC or Modrinth above to view releases and downloads."
          : "Use the public platform button above to view releases and downloads."
      ),
      FEATURE_DETAILS_HTML: Object.entries(featureDetails)
        .map(([feature, description]) =>
          `<article class="feature-detail">` +
          `<div class="feature-check">✓</div>` +
          `<div><h3>${escapeHtml(feature)}</h3>` +
          `<p>${escapeHtml(description)}</p></div>` +
          `</article>`
        )
        .join(""),
      SETUP_STEPS_HTML: (long.setup || [])
        .map((step, index) =>
          `<li><span>${index + 1}</span><p>${escapeHtml(step)}</p></li>`
        )
        .join(""),
      REVIEWS_SECTION: reviewsSection(plugin)
    };

    Object.entries(replacements).forEach(([key, value]) => {
      template = template.replaceAll(`{{${key}}}`, value);
    });

    return template;
  }

  function starterDocumentation(plugin) {
    const long = plugin.longDescription || {};
    return {
      pluginId: plugin.id,
      status: "starter",
      lastUpdated: new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }).format(new Date()),
      overview:
        Array.isArray(long.intro) && long.intro.length
          ? long.intro
          : [plugin.description || plugin.tagline],
      installation:
        Array.isArray(long.setup) && long.setup.length
          ? long.setup
          : [
              "Download the latest compatible release.",
              "Stop the server and place the JAR inside the plugins folder.",
              "Start the server once to generate configuration files.",
              "Review permissions and integrations before production use."
            ],
      commands: [],
      permissions: [],
      configuration: [
        {
          section: "Core settings",
          description:
            `Review the generated configuration for ${plugin.name} and adjust feature toggles, messages and limits.`
        },
        {
          section: "Compatibility",
          description:
            plugin.compatibility || "See the public release page."
        }
      ],
      placeholders: [],
      integrations: (plugin.integrations || []).map(name => ({
        name,
        description:
          `Optional or supported integration used by ${plugin.name}.`
      })),
      troubleshooting: [
        {
          problem: "The plugin does not enable",
          solution:
            "Confirm the server version is supported, required dependencies are installed and the first console error has been resolved."
        },
        {
          problem: "Configuration changes are not applied",
          solution:
            "Validate YAML formatting and restart the server instead of using a broad reload command."
        }
      ],
      apiHooks: [],
      changelog: [
        {
          version: plugin.version || "Current",
          date: "Current release",
          notes: "Current release imported into MythicSuite."
        }
      ]
    };
  }

  async function renderDocumentationPage(plugin) {
    const response = await fetch(
      `../assets/docs-page-template.html?template=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("The documentation-page template could not be loaded.");
    }

    let template = await response.text();
    const replacements = {
      DESCRIPTION:
        `Installation, commands, permissions, configuration and troubleshooting for ${plugin.name}.`,
      NAME: plugin.name,
      PLUGIN_ID: plugin.id,
      ACCENT: plugin.accent || accentFor(plugin.id),
      ICON: plugin.icon || `assets/icons/${plugin.id}.png`,
      STATUS_CLASS: statusClass(plugin.lifecycle),
      STATUS_LABEL: plugin.statusLabel || "Public Plugin",
      TAGLINE: plugin.tagline || plugin.description || "",
      VERSION: plugin.version || "Current",
      COMPATIBILITY:
        plugin.compatibility || "See the public release page",
      CATEGORY: plugin.category || "Minecraft Plugin"
    };

    Object.entries(replacements).forEach(([key, value]) => {
      template = template.replaceAll(
        `{{${key}}}`,
        escapeHtml(value)
      );
    });

    return template;
  }

  async function loadExistingDocumentation() {
    const file = await getRepositoryFile("assets/docs.json");
    if (!file) return [];

    const entries = JSON.parse(file.text);
    return Array.isArray(entries) ? entries : [];
  }

  async function ensureUniqueId(plugin, existingPlugins) {
    const ids = new Set(existingPlugins.map(entry => entry.id));
    if (!ids.has(plugin.id)) return plugin.id;

    const suffix =
      plugin.modrinth?.id ||
      plugin.spigot?.id ||
      Date.now().toString(36);

    return `${plugin.id}-${String(suffix).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  async function importCandidate(candidate, article) {
    if (!elements.token.value.trim()) {
      setStatus("Connect to GitHub before importing.", "error");
      return;
    }

    const approved = window.confirm(
      `Import ${candidate.name} and publish its new MythicSuite page?`
    );
    if (!approved) return;

    article.classList.add("is-importing");
    setStatus(`Preparing ${candidate.name}…`, "busy");

    try {
      const existingPlugins = await loadExistingPlugins();
      const built = await buildPlugin(candidate);
      const plugin = built.plugin;

      plugin.id = await ensureUniqueId(plugin, existingPlugins);
      plugin.accent = accentFor(plugin.id);

      setStatus(`Preparing ${plugin.name} files for one commit…`, "busy");

      const [
        icon,
        pageHtml,
        documentationPageHtml,
        sitemapText
      ] = await Promise.all([
        downloadIcon(
          plugin.id,
          built.spigot,
          built.modrinth
        ),
        renderPluginPage(plugin),
        renderDocumentationPage(plugin),
        buildUpdatedSitemap(plugin)
      ]);

      if (icon) {
        plugin.icon = icon.path;
      }

      // Refresh the catalogue immediately before composing the one commit.
      const latestPlugins = await loadExistingPlugins();
      const identifiers = existingSets(latestPlugins);

      if (
        (plugin.spigot?.id &&
          identifiers.spigot.has(String(plugin.spigot.id))) ||
        (plugin.modrinth?.id &&
          identifiers.modrinth.has(String(plugin.modrinth.id)))
      ) {
        throw new Error(
          "This project is already present in the latest catalogue."
        );
      }

      latestPlugins.push(plugin);
      latestPlugins.sort((left, right) =>
        left.name.localeCompare(right.name, "en", { sensitivity: "base" })
      );

      const latestDocumentation = await loadExistingDocumentation();
      if (!latestDocumentation.some(entry => entry.pluginId === plugin.id)) {
        let importedDocumentation = starterDocumentation(plugin);

        if (window.MythicDocsPlatform) {
          try {
            const enrichment = await window.MythicDocsPlatform.enrich(
              plugin,
              importedDocumentation,
              { replace: false }
            );
            importedDocumentation = enrichment.documentation;
            importedDocumentation.platformSources =
              enrichment.platforms;
          } catch (_) {
            // The starter guide is still committed if a platform is unavailable.
          }
        }

        latestDocumentation.push(importedDocumentation);
      }
      latestDocumentation.sort((left, right) =>
        left.pluginId.localeCompare(right.pluginId)
      );

      const changes = [
        {
          path: `plugins/${plugin.id}/index.html`,
          content: encodeUtf8Base64(pageHtml),
          encoding: "base64"
        },
        {
          path: `docs/${plugin.id}/index.html`,
          content: encodeUtf8Base64(documentationPageHtml),
          encoding: "base64"
        },
        {
          path: "assets/docs.json",
          content: encodeUtf8Base64(
            JSON.stringify(latestDocumentation, null, 2) + "\n"
          ),
          encoding: "base64"
        },
        {
          path: "sitemap.txt",
          content: encodeUtf8Base64(sitemapText),
          encoding: "base64"
        },
        {
          path: "assets/plugins.json",
          content: encodeUtf8Base64(
            JSON.stringify(latestPlugins, null, 2) + "\n"
          ),
          encoding: "base64"
        }
      ];

      if (icon) {
        changes.unshift({
          path: icon.path,
          content: icon.base64,
          encoding: "base64"
        });
      }

      setStatus(
        `Publishing ${changes.length} files in one Git commit…`,
        "busy"
      );

      await commitFilesAtomically(
        changes,
        `Import ${plugin.name} into MythicSuite`
      );

      setStatus(
        `${plugin.name} imported in one commit. GitHub Pages will publish it shortly.`,
        "success"
      );

      candidates = candidates.filter(item => item.key !== candidate.key);
      renderCandidates();

      window.setTimeout(() => window.location.reload(), 1800);
    } catch (error) {
      article.classList.remove("is-importing");
      setStatus(error.message, "error");
    }
  }

  elements.scan.addEventListener("click", scanProfiles);
  elements.inspect.addEventListener("click", inspectManualUrl);

  elements.manualUrl.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    inspectManualUrl();
  });

  const observer = new MutationObserver(() => {
    if (elements.editorLayout.hidden || automaticScanStarted) return;

    automaticScanStarted = true;
    panel.hidden = false;
    scanProfiles();

    window.setInterval(() => {
      if (!document.hidden) scanProfiles();
    }, 10 * 60 * 1000);
  });

  observer.observe(elements.editorLayout, {
    attributes: true,
    attributeFilter: ["hidden"]
  });

  if (!elements.editorLayout.hidden) {
    automaticScanStarted = true;
    panel.hidden = false;
    scanProfiles();
  }
})();
