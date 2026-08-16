const API = 'https://api.apify.com/v2/store?username=apivault_labs&limit=100';
const CATEGORY_LABELS = {LEAD_GENERATION:'Lead generation',ECOMMERCE:'E-commerce',SOCIAL_MEDIA:'Social media',JOBS:'Jobs',REAL_ESTATE:'Real estate',MARKETING:'Marketing',SEO_TOOLS:'SEO',DEVELOPER_TOOLS:'Developer tools',AI:'AI tools',BUSINESS:'Business',OTHER:'Other'};
const ICONS = {LEAD_GENERATION:'🎯',ECOMMERCE:'🛒',SOCIAL_MEDIA:'📱',JOBS:'💼',REAL_ESTATE:'🏠',MARKETING:'📣',SEO_TOOLS:'⌕',DEVELOPER_TOOLS:'⚙️',AI:'✦',BUSINESS:'◈',OTHER:'↗'};

let actors = [], activeCategory = 'ALL', visible = 12;
const grid = document.querySelector('#actorGrid');
const template = document.querySelector('#cardTemplate');
const filters = document.querySelector('#filters');
const searchInput = document.querySelector('#searchInput');
const sortSelect = document.querySelector('#sortSelect');
const resultCount = document.querySelector('#resultCount');
const loadMore = document.querySelector('#loadMore');
const featuredGrid = document.querySelector('#featuredGrid');

const compact = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n || 0);
const success = a => {
  const s = a.stats?.publicActorRunStats30Days || {};
  return s.TOTAL ? Math.round((s.SUCCEEDED || 0) / s.TOTAL * 100) : 0;
};
const category = a => a.categories?.[0] || 'OTHER';

function buildFilters(){
  const counts = actors.reduce((m,a)=>{(a.categories||['OTHER']).forEach(c=>m[c]=(m[c]||0)+1);return m},{});
  const keys = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  filters.innerHTML = '';
  [['ALL',actors.length],...keys.map(k=>[k,counts[k]])].forEach(([key,count])=>{
    const b=document.createElement('button');b.className=`filter${key===activeCategory?' active':''}`;
    b.textContent=`${key==='ALL'?'All':CATEGORY_LABELS[key]||key.replaceAll('_',' ')} · ${count}`;
    b.onclick=()=>{activeCategory=key;visible=12;buildFilters();render()};filters.appendChild(b);
  });
}

function filtered(){
  const q=searchInput.value.trim().toLowerCase();
  const list=actors.filter(a=>(activeCategory==='ALL'||a.categories?.includes(activeCategory))&&(!q||`${a.title} ${a.description} ${(a.categories||[]).join(' ')}`.toLowerCase().includes(q)));
  return list.sort((a,b)=>{
    if(sortSelect.value==='name') return a.title.localeCompare(b.title);
    if(sortSelect.value==='rating') return (b.stats?.actorReviewRating||0)-(a.stats?.actorReviewRating||0)||(b.stats?.totalUsers||0)-(a.stats?.totalUsers||0);
    if(sortSelect.value==='trending') return (b.stats?.totalUsers30Days||0)-(a.stats?.totalUsers30Days||0);
    return (b.stats?.totalUsers||0)-(a.stats?.totalUsers||0);
  });
}

function render(){
  const list=filtered();grid.innerHTML='';resultCount.textContent=`${list.length} Actor${list.length===1?'':'s'} found`;
  if(!list.length){grid.innerHTML='<div class="empty">No Actors match this search. Try a platform name or a broader category.</div>';loadMore.hidden=true;return}
  list.slice(0,visible).forEach(a=>{
    const card=template.content.firstElementChild.cloneNode(true),cat=category(a),s=a.stats||{};
    card.querySelector('.card-icon').textContent=ICONS[cat]||ICONS.OTHER;
    card.querySelector('.card-category').textContent=CATEGORY_LABELS[cat]||cat.replaceAll('_',' ');
    card.querySelector('h3').textContent=a.title;card.querySelector('p').textContent=a.description;
    const trend=s.totalUsers30Days||0;card.querySelector('.card-trend').textContent=trend?`+${trend} users / 30d`:'';
    card.querySelector('.card-stats').innerHTML=`<span><strong>${compact(s.totalUsers)}</strong> users</span><span><strong>${success(a)||'—'}${success(a)?'%':''}</strong> success</span><span><strong>${s.actorReviewRating||'—'}</strong> rating</span>`;
    const link=card.querySelector('.card-link');link.href=`https://apify.com/${a.username}/${a.name}`;grid.appendChild(card);
  });
  loadMore.hidden=visible>=list.length;
}

function renderFeatured(){
  const top=[...actors].sort((a,b)=>(b.stats?.totalUsers||0)-(a.stats?.totalUsers||0)).slice(0,3);
  featuredGrid.innerHTML='';
  top.forEach((a,index)=>{
    const card=document.createElement('article');card.className='featured-card';card.dataset.rank=String(index+1).padStart(2,'0');
    card.innerHTML=`<span class="featured-label">${index===0?'Most popular':'Featured Actor'}</span><h3></h3><p></p><div class="featured-meta"><span><strong>${compact(a.stats?.totalUsers)}</strong> users</span><span><strong>${success(a)||'—'}${success(a)?'%':''}</strong> success</span></div><a href="https://apify.com/${a.username}/${a.name}" target="_blank" rel="noreferrer">View on Apify ↗</a>`;
    card.querySelector('h3').textContent=a.title;card.querySelector('p').textContent=a.description;featuredGrid.appendChild(card);
  });
}

async function init(){
  try{
    const response=await fetch(API);if(!response.ok)throw new Error('Catalog unavailable');
    actors=(await response.json()).data.items;
    const users=actors.reduce((n,a)=>n+(a.stats?.totalUsers||0),0);
    const totals=actors.reduce((x,a)=>{const s=a.stats?.publicActorRunStats30Days||{};x.ok+=(s.SUCCEEDED||0);x.all+=(s.TOTAL||0);return x},{ok:0,all:0});
    document.querySelector('#actorCount').textContent=actors.length;
    document.querySelector('#userCount').textContent=`${compact(users)}+`;
    if(totals.all)document.querySelector('#successRate').textContent=`${(totals.ok/totals.all*100).toFixed(1)}%`;
    renderFeatured();buildFilters();render();
  }catch(error){resultCount.textContent='Catalog temporarily unavailable';grid.innerHTML='<div class="empty">The live catalog could not load. Browse all Actors directly on <a href="https://apify.com/apivault_labs">Apify Store ↗</a></div>'}
}

searchInput.addEventListener('input',()=>{visible=12;render()});
sortSelect.addEventListener('change',()=>{visible=12;render()});
loadMore.addEventListener('click',()=>{visible+=12;render()});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==searchInput){e.preventDefault();searchInput.focus()}});
init();
