
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
})();
