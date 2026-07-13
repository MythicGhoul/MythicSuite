
(()=>{
 const menu=document.querySelector('.menu-button'), nav=document.querySelector('.nav-links');
 if(menu&&nav) menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
 const search=document.querySelector('[data-resource-search]'); const buttons=[...document.querySelectorAll('[data-filter]')]; const cards=[...document.querySelectorAll('.resource-card-item')]; const count=document.querySelector('[data-results-count]'); const empty=document.querySelector('.empty-state'); let filter='all';
 function apply(){if(!cards.length)return;const q=(search?.value||'').trim().toLowerCase();let visible=0;cards.forEach(card=>{const matchText=!q||(card.dataset.name+' '+card.dataset.tags).includes(q);const matchFilter=filter==='all'||card.dataset.status===filter;const show=matchText&&matchFilter;card.hidden=!show;if(show)visible++;});if(count)count.textContent=visible;if(empty)empty.style.display=visible?'none':'block';}
 search?.addEventListener('input',apply); buttons.forEach(b=>b.addEventListener('click',()=>{buttons.forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;apply();})); apply();
 const format=n=>new Intl.NumberFormat('en-GB').format(n);
 const spigotCache=new Map(), modCache=new Map();
 async function getSpigot(id){if(!id)return null;if(!spigotCache.has(id))spigotCache.set(id,fetch('https://api.spiget.org/v2/resources/'+id).then(r=>r.ok?r.json():null).catch(()=>null));return spigotCache.get(id)}
 async function getMod(id){if(!id)return null;if(!modCache.has(id))modCache.set(id,fetch('https://api.modrinth.com/v2/project/'+id).then(r=>r.ok?r.json():null).catch(()=>null));return modCache.get(id)}
 document.querySelectorAll('[data-live-platform]').forEach(async el=>{const platform=el.dataset.livePlatform,id=el.dataset.resourceId,kind=el.dataset.statKind;const data=platform==='spigot'?await getSpigot(id):await getMod(id);if(!data)return;let value=null;if(platform==='spigot'){if(kind==='downloads')value=data.downloads;if(kind==='rating')value=data.rating?.average?Number(data.rating.average).toFixed(1)+'/5':null;if(kind==='ratings')value=data.rating?.count;}else{if(kind==='downloads')value=data.downloads;if(kind==='followers')value=data.followers;}if(value!==null&&value!==undefined)el.textContent=typeof value==='number'?format(value):value;});

 const reviewCache=new Map();
 async function getSpigotReviews(id){
   if(!id)return null;
   if(!reviewCache.has(id)){
     const url='https://api.spiget.org/v2/resources/'+encodeURIComponent(id)+'/reviews?size=6&page=1&sort=-date';
     reviewCache.set(id,fetch(url).then(r=>r.ok?r.json():null).catch(()=>null));
   }
   return reviewCache.get(id);
 }
 function decodeReview(value){
   if(!value)return '';
   try{
     const binary=atob(value);
     const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
     return new TextDecoder('utf-8').decode(bytes).trim();
   }catch(_){
     return String(value).trim();
   }
 }
 function reviewScore(review){
   const raw=typeof review?.rating==='number'
     ?review.rating
     :(review?.rating?.average??review?.rating?.rating??review?.stars??0);
   const number=Number(raw);
   return Number.isFinite(number)?Math.max(0,Math.min(5,number)):0;
 }
 function starsFor(score){
   const rounded=Math.round(score);
   return '★'.repeat(rounded)+'☆'.repeat(Math.max(0,5-rounded));
 }
 function reviewDate(value){
   const n=Number(value);
   if(!Number.isFinite(n)||n<=0)return '';
   const d=new Date(n<1e12?n*1000:n);
   return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(d);
 }
 function makeEl(tag,className,text){
   const el=document.createElement(tag);
   if(className)el.className=className;
   if(text!==undefined&&text!==null)el.textContent=text;
   return el;
 }
 function renderReview(review){
   const article=makeEl('article','review-card');
   const head=makeEl('div','review-card-head');
   const reviewer=makeEl('div','reviewer');
   const authorName=review?.author?.name||review?.author?.username||'Spigot user';
   const avatar=makeEl('span','reviewer-avatar',(authorName.trim()[0]||'?').toUpperCase());
   const authorText=makeEl('div');
   authorText.append(makeEl('b','',authorName));
   const meta=[review?.version?('Version '+review.version):'',reviewDate(review?.date)].filter(Boolean).join(' · ');
   authorText.append(makeEl('small','',meta));
   reviewer.append(avatar,authorText);
   const score=reviewScore(review);
   const rating=makeEl('span','review-rating',starsFor(score)+' '+(score?score.toFixed(1)+'/5':''));
   rating.setAttribute('aria-label',score?score.toFixed(1)+' out of 5':'Rating unavailable');
   head.append(reviewer,rating);
   article.append(head);
   article.append(makeEl('div','review-message',decodeReview(review?.message)||'No written review was provided.'));
   const response=decodeReview(review?.responseMessage);
   if(response){
     const box=makeEl('div','developer-response');
     box.append(makeEl('b','','Developer response'),makeEl('span','',response));
     article.append(box);
   }
   return article;
 }
 document.querySelectorAll('[data-live-stars]').forEach(async el=>{
   const data=await getSpigot(el.dataset.resourceId);
   if(!data)return;
   const score=Number(data.rating?.average||0);
   el.textContent=starsFor(score);
   el.setAttribute('aria-label',score?score.toFixed(1)+' out of 5':'Not yet rated');
 });
 document.querySelectorAll('[data-spigot-reviews]').forEach(async section=>{
   const id=section.dataset.resourceId;
   const list=section.querySelector('[data-review-list]');
   if(!list||!id)return;
   const reviews=await getSpigotReviews(id);
   list.textContent='';
   if(!Array.isArray(reviews)){
     const unavailable=makeEl('article','review-card review-empty');
     unavailable.append(makeEl('b','','Reviews could not be loaded right now.'),makeEl('p','','Use the SpigotMC button to read them directly.'));
     list.append(unavailable);
     return;
   }
   if(!reviews.length){
     const emptyReview=makeEl('article','review-card review-empty');
     emptyReview.append(makeEl('b','','No Spigot reviews yet.'),makeEl('p','','The rating panel will update automatically when reviews are posted.'));
     list.append(emptyReview);
     return;
   }
   reviews.forEach(review=>list.append(renderReview(review)));
 });

})();


// Vibrant preview micro-interactions.
document.addEventListener('DOMContentLoaded', () => {
  const art = document.querySelector('.hero-art');
  if (art && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    art.addEventListener('pointermove', event => {
      const box = art.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      art.style.setProperty('--studio-x', `${x * 10}px`);
      art.style.setProperty('--studio-y', `${y * 8}px`);
      const sigil = art.querySelector('.forge-sigil');
      if (sigil) sigil.style.translate = `calc(-50% + ${x * 8}px) calc(-50% + ${y * 7}px)`;
    });
    art.addEventListener('pointerleave', () => {
      const sigil = art.querySelector('.forge-sigil');
      if (sigil) sigil.style.translate = '-50% -50%';
    });
  }
});


// =========================================================
// LIVE CLICK TRACKING
// =========================================================
// Page views are counted by the visible Hits.sh badges in the HTML.
// This records navigation, platform and download clicks as anonymous
// counter requests without cookies or user profiles.
document.addEventListener("click", event => {
  const link = event.target.closest("a[href]");
  if (!link || link.hasAttribute("data-no-click-track")) return;

  const rawHref = link.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
    return;
  }

  let target;
  try {
    target = new URL(link.href, window.location.href);
  } catch (_) {
    return;
  }

  const host = target.hostname.toLowerCase();
  const path = target.pathname.toLowerCase();
  const currentPlugin = document.body.dataset.pluginId || "";

  let bucket = "internal";
  if (link.hasAttribute("download") || /\.(zip|jar|pdf|yml|yaml|json)$/i.test(path)) {
    bucket = "download";
  } else if (host.includes("spigotmc.org")) {
    bucket = "spigot";
  } else if (host.includes("modrinth.com")) {
    bucket = "modrinth";
  } else if (host.includes("github.com")) {
    bucket = "github";
  } else if (host.includes("discord.com") || host.includes("discord.gg")) {
    bucket = "discord";
  } else if (target.origin !== window.location.origin) {
    bucket = "external";
  } else if (path.includes("/plugins/")) {
    bucket = "plugin-page";
  } else if (path.includes("/resources/")) {
    bucket = "resources";
  } else if (path.includes("/statistics/")) {
    bucket = "statistics";
  } else if (path.includes("/about/")) {
    bucket = "about";
  }

  const timestamp = Date.now();
  const aggregateUrl =
    "https://hits.sh/mythicsuite.co.uk/clicks/all.svg?ts=" + timestamp;
  const bucketUrl =
    "https://hits.sh/mythicsuite.co.uk/clicks/" +
    encodeURIComponent(bucket) +
    ".svg?ts=" +
    timestamp;

  fetch(aggregateUrl, {
    mode: "no-cors",
    cache: "no-store",
    keepalive: true
  }).catch(() => {});

  fetch(bucketUrl, {
    mode: "no-cors",
    cache: "no-store",
    keepalive: true
  }).catch(() => {});

  if (currentPlugin) {
    const pluginUrl =
      "https://hits.sh/mythicsuite.co.uk/clicks/plugins/" +
      encodeURIComponent(currentPlugin) +
      "/" +
      encodeURIComponent(bucket) +
      ".svg?ts=" +
      timestamp;

    fetch(pluginUrl, {
      mode: "no-cors",
      cache: "no-store",
      keepalive: true
    }).catch(() => {});
  }
});


// =========================================================
// HOMEPAGE DOWNLOAD TOTALS
// =========================================================
// Values come from assets/plugins.json, so the hero stays in sync with the
// catalogue snapshot without duplicating totals in the HTML.
document.addEventListener("DOMContentLoaded", async () => {
  const counters = [...document.querySelectorAll("[data-download-total]")];
  if (!counters.length) return;

  try {
    const response = await fetch("assets/plugins.json", { cache: "no-store" });
    if (!response.ok) return;

    const plugins = await response.json();
    const totals = plugins.reduce(
      (result, plugin) => {
        result.spigot += Number(plugin?.spigot?.downloads || 0);
        result.modrinth += Number(plugin?.modrinth?.downloads || 0);
        return result;
      },
      { spigot: 0, modrinth: 0 }
    );

    const compact = new Intl.NumberFormat("en-GB", {
      notation: "compact",
      maximumFractionDigits: 1
    });

    const exact = new Intl.NumberFormat("en-GB");

    counters.forEach(counter => {
      const platform = counter.dataset.downloadTotal;
      const value = totals[platform];

      if (!Number.isFinite(value)) return;

      counter.textContent = compact.format(value);
      counter.title = exact.format(value) + " " + platform + " downloads";
    });
  } catch (_) {
    // The visible HTML totals remain as reliable fallbacks.
  }
});


// =========================================================
// AUTOMATIC RELEASE RADAR
// =========================================================
(() => {
  const radar = document.querySelector("[data-release-radar]");
  if (!radar) return;

  const status = document.querySelector("[data-release-status]");
  const note = document.querySelector("[data-release-note]");
  const CACHE_KEY = "mythicsuite-release-radar-v1";
  const CACHE_MAX_AGE = 20 * 60 * 1000;
  const API_TIMEOUT = 10000;
  const MAX_RELEASES = 3;

  function normaliseTimestamp(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number < 1e12 ? number * 1000 : number;
  }

  function decodeBase64Utf8(value) {
    if (!value) return "";
    try {
      const binary = atob(value);
      const bytes = Uint8Array.from(binary, character =>
        character.charCodeAt(0)
      );
      return new TextDecoder("utf-8").decode(bytes);
    } catch (_) {
      return String(value);
    }
  }

  function plainText(value) {
    if (!value) return "";

    const parser = new DOMParser();
    const documentValue = parser.parseFromString(
      String(value),
      "text/html"
    );

    let text = documentValue.body.textContent || String(value);

    text = text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_>#~-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text;
  }

  function shorten(value, maximum = 145) {
    const text = plainText(value);
    if (!text) return "";
    if (text.length <= maximum) return text;

    const shortened = text.slice(0, maximum - 1);
    const breakPoint = shortened.lastIndexOf(" ");
    return (breakPoint > 80 ? shortened.slice(0, breakPoint) : shortened) + "…";
  }

  function parseSavedDate(value) {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatRelativeDate(timestamp) {
    const date = new Date(timestamp);
    const difference = Date.now() - timestamp;
    const days = Math.max(0, Math.floor(difference / 86400000));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 35) return `${Math.floor(days / 7)}w ago`;

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric"
    }).format(date);
  }

  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function runLimited(tasks, limit = 6) {
    const results = [];
    let index = 0;

    async function worker() {
      while (index < tasks.length) {
        const taskIndex = index++;
        try {
          const result = await tasks[taskIndex]();
          if (result) results.push(result);
        } catch (_) {
          // One failed platform request must not remove the saved feed.
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(limit, tasks.length) }, worker)
    );

    return results;
  }

  function buildSpigotTask(plugin) {
    return async () => {
      const resourceId = plugin?.spigot?.id;
      if (!resourceId) return null;

      const [version, update] = await Promise.all([
        fetchJSON(
          `https://api.spiget.org/v2/resources/${encodeURIComponent(resourceId)}/versions/latest`
        ).catch(() => null),
        fetchJSON(
          `https://api.spiget.org/v2/resources/${encodeURIComponent(resourceId)}/updates/latest`
        ).catch(() => null)
      ]);

      if (!version && !update) return null;

      const versionDate = normaliseTimestamp(version?.releaseDate);
      const updateDate = normaliseTimestamp(update?.date);
      const savedDate = parseSavedDate(plugin?.spigot?.updated);
      const date = Math.max(versionDate, updateDate, savedDate);

      const versionName =
        version?.name ||
        plugin?.spigot?.version ||
        plugin?.version ||
        "";

      const updateTitle = plainText(update?.title);
      const updateDescription = shorten(
        decodeBase64Utf8(update?.description)
      );

      let description = updateDescription || updateTitle;

      if (
        updateTitle &&
        description &&
        !description.toLowerCase().startsWith(updateTitle.toLowerCase())
      ) {
        description = shorten(`${updateTitle} — ${description}`);
      }

      if (!description) {
        description = `${plugin.name} ${versionName} is now available on SpigotMC.`;
      }

      return {
        pluginId: plugin.id,
        name: plugin.name,
        version: versionName,
        description,
        timestamp: date || Date.now(),
        platform: "SpigotMC",
        url: plugin.spigot_url,
        icon: `assets/icons/${plugin.id}.png`
      };
    };
  }

  function buildModrinthTask(plugin) {
    return async () => {
      const projectId = plugin?.modrinth?.id;
      if (!projectId) return null;

      const versions = await fetchJSON(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?include_changelog=true`
      );

      if (!Array.isArray(versions) || !versions.length) return null;

      const latest = versions
        .filter(version => version?.date_published)
        .sort(
          (left, right) =>
            Date.parse(right.date_published) -
            Date.parse(left.date_published)
        )[0];

      if (!latest) return null;

      const versionName =
        latest.version_number ||
        latest.name ||
        plugin.version ||
        "";

      const description =
        shorten(latest.changelog) ||
        `${plugin.name} ${versionName} is now available on Modrinth.`;

      return {
        pluginId: plugin.id,
        name: plugin.name,
        version: versionName,
        description,
        timestamp: Date.parse(latest.date_published),
        platform: "Modrinth",
        url: plugin.modrinth_url,
        icon: `assets/icons/${plugin.id}.png`
      };
    };
  }

  function deduplicate(records) {
    const newestByPlugin = new Map();

    records.forEach(record => {
      if (!record?.pluginId || !record?.timestamp) return;

      const current = newestByPlugin.get(record.pluginId);
      if (!current || record.timestamp > current.timestamp) {
        newestByPlugin.set(record.pluginId, record);
      }
    });

    return [...newestByPlugin.values()]
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, MAX_RELEASES);
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) {
      element.textContent = text;
    }
    return element;
  }

  function renderRelease(record) {
    const article = makeElement(
      "article",
      "release-card release-card-live"
    );

    const iconWrap = makeElement("div", "release-icon");
    const icon = document.createElement("img");
    icon.src = record.icon;
    icon.alt = "";
    icon.loading = "lazy";
    iconWrap.append(icon);

    const copy = makeElement("div", "release-copy");
    const source = makeElement(
      "span",
      "release-source",
      "Latest release"
    );
    source.append(
      makeElement(
        "small",
        "release-platform-pill",
        record.platform
      )
    );

    const heading = makeElement("h3");
    heading.append(
      document.createTextNode(record.name + " "),
      makeElement("small", "release-version", record.version)
    );

    const description = makeElement(
      "p",
      "",
      record.description
    );

    const link = makeElement(
      "a",
      "release-link",
      `View on ${record.platform} ↗`
    );
    link.href = record.url || `plugins/${record.pluginId}/`;
    link.target = "_blank";
    link.rel = "noopener";

    copy.append(source, heading, description, link);

    const time = makeElement(
      "time",
      "",
      formatRelativeDate(record.timestamp)
    );
    time.dateTime = new Date(record.timestamp).toISOString();
    time.title = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long"
    }).format(new Date(record.timestamp));

    article.append(iconWrap, copy, time);
    return article;
  }

  function render(records, sourceLabel = "Live") {
    if (!records.length) return false;

    radar.textContent = "";
    records.forEach(record => radar.append(renderRelease(record)));

    status.classList.remove("is-fallback");
    status.classList.add("is-live");
    status.lastChild.textContent = ` ${sourceLabel} from Spigot & Modrinth`;

    if (note) {
      note.textContent =
        "The feed refreshes automatically and keeps a saved copy in this browser for faster loading.";
    }

    return true;
  }

  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (!value || !Array.isArray(value.records)) return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function saveCache(records) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          records
        })
      );
    } catch (_) {
      // Private browsing or disabled storage should not break the feed.
    }
  }

  async function loadLiveFeed() {
    const cache = readCache();
    const cacheAge = cache ? Date.now() - cache.savedAt : Infinity;

    if (cache?.records?.length) {
      render(
        cache.records,
        cacheAge < CACHE_MAX_AGE ? "Live" : "Saved"
      );
    }

    if (cacheAge < CACHE_MAX_AGE) return;

    radar.classList.add("release-radar-loading");

    try {
      const pluginResponse = await fetch("assets/plugins.json", {
        cache: "no-store"
      });

      if (!pluginResponse.ok) {
        throw new Error("Plugin catalogue could not be loaded.");
      }

      const plugins = await pluginResponse.json();
      const tasks = [];

      plugins.forEach(plugin => {
        if (plugin?.spigot?.id) {
          tasks.push(buildSpigotTask(plugin));
        }

        if (plugin?.modrinth?.id) {
          tasks.push(buildModrinthTask(plugin));
        }
      });

      const records = deduplicate(
        await runLimited(tasks, 6)
      );

      if (!records.length) {
        throw new Error("No current platform releases were returned.");
      }

      saveCache(records);
      render(records, "Live");
    } catch (_) {
      status.classList.remove("is-live");
      status.classList.add("is-fallback");
      status.lastChild.textContent = cache?.records?.length
        ? " Saved release feed"
        : " Saved releases";

      if (note) {
        note.textContent =
          "A platform API could not be reached, so the last saved or built-in releases are being shown.";
      }
    } finally {
      radar.classList.remove("release-radar-loading");
    }
  }

  loadLiveFeed();
})();


// =========================================================
// ADMIN-MANAGED PUBLIC METADATA
// =========================================================
(() => {
  const catalogueUrl = (() => {
    const depth = location.pathname.split("/").filter(Boolean).length;
    if (location.pathname.includes("/plugins/")) return "../../assets/plugins.json";
    if (location.pathname.includes("/resources/") ||
        location.pathname.includes("/statistics/") ||
        location.pathname.includes("/about/")) return "../assets/plugins.json";
    return "assets/plugins.json";
  })();

  const lifecycleClass = lifecycle => {
    const value = String(lifecycle || "current").toLowerCase();
    if (["current", "exclusive", "development", "planned", "legacy"].includes(value)) {
      return `status-${value}`;
    }
    return "status-current";
  };

  const availabilityText = plugin => {
    const lifecycle = String(plugin.lifecycle || "current").toLowerCase();
    if (lifecycle === "current") return "Public resource";
    if (lifecycle === "legacy") return "Legacy resource";
    return plugin.statusLabel || lifecycle;
  };

  const replaceStatusClass = (element, lifecycle) => {
    [...element.classList]
      .filter(name => name.startsWith("status-"))
      .forEach(name => element.classList.remove(name));

    element.classList.add("status-chip", lifecycleClass(lifecycle));
    element.dataset.dynamicStatus = "true";
  };

  const renderTags = (container, tags) => {
    if (!container || !Array.isArray(tags)) return;
    container.textContent = "";
    tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      container.append(span);
    });
  };

  const updateInfoRow = (root, label, value) => {
    if (!value) return;
    const rows = root.querySelectorAll(".info-row");
    const row = [...rows].find(candidate =>
      candidate.querySelector("small")?.textContent.trim().toLowerCase() ===
      label.toLowerCase()
    );
    if (!row) return;

    const target = [...row.children].find(child =>
      child.tagName !== "SMALL"
    );
    if (target) target.textContent = value;
  };

  const applyCardMetadata = (card, plugin) => {
    card.dataset.status = plugin.lifecycle || "current";
    card.dataset.tags = (plugin.tags || []).join(" ").toLowerCase();

    const status = card.querySelector(".status-chip");
    if (status) {
      status.textContent = plugin.statusLabel || "Public Plugin";
      replaceStatusClass(status, plugin.lifecycle);
    }

    const category = card.querySelector(".card-category");
    if (category && plugin.category) category.textContent = plugin.category;

    renderTags(card.querySelector(".tag-row"), plugin.tags || []);
  };

  const applyDetailMetadata = plugin => {
    const status = document.querySelector(".detail-title .status-chip");
    if (status) {
      status.textContent = plugin.statusLabel || "Public Plugin";
      replaceStatusClass(status, plugin.lifecycle);
    }

    const details = document.querySelector(".info-list");
    if (details) {
      updateInfoRow(details, "Category", plugin.category);
      updateInfoRow(details, "Availability", availabilityText(plugin));
      updateInfoRow(details, "Compatibility", plugin.compatibility);
      updateInfoRow(
        details,
        "Integrations",
        Array.isArray(plugin.integrations)
          ? plugin.integrations.join(", ")
          : plugin.integrations
      );

      const tagRow = [...details.querySelectorAll(".info-row")]
        .find(row =>
          row.querySelector("small")?.textContent.trim().toLowerCase() === "tags"
        )
        ?.querySelector(".tag-row");

      renderTags(tagRow, plugin.tags || []);
    }

    document.body.dataset.lifecycle = plugin.lifecycle || "current";
  };

  async function loadCatalogue() {
    try {
      const response = await fetch(
        `${catalogueUrl}?adminMetadata=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Catalogue unavailable");

      const plugins = await response.json();
      const byId = new Map(plugins.map(plugin => [plugin.id, plugin]));

      document.querySelectorAll("[data-plugin-id]").forEach(element => {
        const plugin = byId.get(element.dataset.pluginId);
        if (!plugin) return;

        if (element.matches(".plugin-card")) {
          applyCardMetadata(element, plugin);
        }
      });

      const currentId = document.body.dataset.pluginId;
      if (currentId && byId.has(currentId)) {
        const plugin = byId.get(currentId);
        applyDetailMetadata(plugin);
        document.dispatchEvent(
          new CustomEvent("mythicsuite:plugin-metadata", {
            detail: { plugin }
          })
        );
      }

      document.dispatchEvent(
        new CustomEvent("mythicsuite:catalogue-loaded", {
          detail: { plugins }
        })
      );
    } catch (_) {
      // Static page content remains as a reliable fallback.
    }
  }

  loadCatalogue();
})();

// =========================================================
// INDIVIDUAL PLUGIN LIVE RELEASE DETAILS
// =========================================================
(() => {
  const pluginId = document.body.dataset.pluginId;
  if (!pluginId) return;

  const panel = document.querySelector("[data-live-plugin-release]");
  const versionElement = document.querySelector("[data-live-release-version]");
  const dateElement = document.querySelector("[data-live-release-date]");
  if (!panel && !versionElement && !dateElement) return;

  const CACHE_PREFIX = "mythicsuite-plugin-release-v2:";
  const CACHE_AGE = 15 * 60 * 1000;
  const TIMEOUT = 10000;

  function normaliseTimestamp(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number < 1e12 ? number * 1000 : number;
  }

  function parseDate(value) {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function decodeBase64Utf8(value) {
    if (!value) return "";
    try {
      const binary = atob(value);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
    } catch (_) {
      return String(value);
    }
  }

  function plainText(value) {
    if (!value) return "";
    const documentValue = new DOMParser().parseFromString(
      String(value),
      "text/html"
    );

    return (documentValue.body.textContent || String(value))
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_>#~-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shorten(value, maximum = 420) {
    const text = plainText(value);
    if (!text) return "";
    if (text.length <= maximum) return text;
    const sliced = text.slice(0, maximum - 1);
    const split = sliced.lastIndexOf(" ");
    return (split > 220 ? sliced.slice(0, split) : sliced) + "…";
  }

  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function spigotRelease(plugin) {
    const id = plugin?.spigot?.id;
    if (!id) return null;

    const [version, update] = await Promise.all([
      fetchJSON(
        `https://api.spiget.org/v2/resources/${encodeURIComponent(id)}/versions/latest`
      ).catch(() => null),
      fetchJSON(
        `https://api.spiget.org/v2/resources/${encodeURIComponent(id)}/updates/latest`
      ).catch(() => null)
    ]);

    if (!version && !update) return null;

    const versionName =
      version?.name || plugin?.spigot?.version || plugin?.version || "";
    const timestamp = Math.max(
      normaliseTimestamp(version?.releaseDate),
      normaliseTimestamp(update?.date),
      parseDate(plugin?.spigot?.updated)
    );

    const title = plainText(update?.title);
    const details = shorten(decodeBase64Utf8(update?.description));
    const changelog = details || title ||
      `${plugin.name} ${versionName} is available on SpigotMC.`;

    return {
      version: versionName,
      timestamp,
      platform: "SpigotMC",
      changelog,
      url: plugin.spigot_url
    };
  }

  async function modrinthRelease(plugin) {
    const id = plugin?.modrinth?.id;
    if (!id) return null;

    const versions = await fetchJSON(
      `https://api.modrinth.com/v2/project/${encodeURIComponent(id)}/version`
    );

    if (!Array.isArray(versions) || !versions.length) return null;

    const latest = versions
      .filter(version => version?.date_published)
      .sort(
        (left, right) =>
          Date.parse(right.date_published) -
          Date.parse(left.date_published)
      )[0];

    if (!latest) return null;

    return {
      version: latest.version_number || latest.name || plugin.version || "",
      timestamp: Date.parse(latest.date_published),
      platform: "Modrinth",
      changelog:
        shorten(latest.changelog) ||
        `${plugin.name} ${latest.version_number || ""} is available on Modrinth.`,
      url: plugin.modrinth_url
    };
  }

  function formatDate(timestamp) {
    if (!timestamp) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(timestamp));
  }

  function render(release, pluginName) {
    if (!release) return;

    if (versionElement && release.version) {
      versionElement.textContent = release.version;
    }

    if (dateElement && release.timestamp) {
      dateElement.textContent = formatDate(release.timestamp);
    }

    if (!panel) return;

    panel.hidden = false;
    panel.querySelector("[data-live-release-title]").textContent =
      `${pluginName} ${release.version || ""}`.trim();
    panel.querySelector("[data-live-release-platform]").textContent =
      release.platform;
    panel.querySelector("[data-live-release-copy]").textContent =
      release.changelog;
    panel.querySelector("[data-live-release-time]").textContent =
      release.timestamp ? `Published ${formatDate(release.timestamp)}` : "";

    const link = panel.querySelector("[data-live-release-link]");
    link.href = release.url || "#";
    link.textContent = `Open on ${release.platform} ↗`;
  }

  function readCache() {
    try {
      const value = JSON.parse(
        localStorage.getItem(CACHE_PREFIX + pluginId)
      );
      if (!value?.release) return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function saveCache(release) {
    try {
      localStorage.setItem(
        CACHE_PREFIX + pluginId,
        JSON.stringify({ savedAt: Date.now(), release })
      );
    } catch (_) {}
  }

  async function update(plugin) {
    const cached = readCache();
    if (cached?.release) render(cached.release, plugin.name);

    if (cached && Date.now() - cached.savedAt < CACHE_AGE) return;

    const releases = (
      await Promise.all([
        spigotRelease(plugin).catch(() => null),
        modrinthRelease(plugin).catch(() => null)
      ])
    ).filter(Boolean);

    if (!releases.length) return;

    const newest = releases.sort(
      (left, right) => right.timestamp - left.timestamp
    )[0];

    saveCache(newest);
    render(newest, plugin.name);
  }

  document.addEventListener(
    "mythicsuite:plugin-metadata",
    event => update(event.detail.plugin),
    { once: true }
  );
})();
