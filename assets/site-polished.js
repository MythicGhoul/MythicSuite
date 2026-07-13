
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
