const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const toast=(msg)=>{const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),2400)};

// ---------- routing ----------
function route(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#view-'+name)?.classList.add('active');
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.route===name));
  history.replaceState(null,'','#'+name);
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='client') refreshClientCabinet();
  if(name==='astrologer'){renderClients();refreshAstrologerMaterials();}
  if(name==='ephemeris') renderEphem();
}
$$('[data-route]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();route(el.dataset.route)}));
const initial=(location.hash||'#home').slice(1); if($('#view-'+initial)) route(initial);

// ---------- client data ----------
const CLIENTS_KEY='viktoria-clients';
const ACTIVE_KEY='viktoria-active-client';
const NOTES_KEY='viktoria-notes';

function loadClients(){
  let rows=[];
  try{rows=JSON.parse(localStorage.getItem(CLIENTS_KEY)||'[]')}catch{}
  if(!rows.length){
    rows=[{id:'demo-1',name:'Демо-клієнт',birth:'',created:Date.now()}];
    localStorage.setItem(CLIENTS_KEY,JSON.stringify(rows));
  }
  return rows;
}
function saveClients(rows){localStorage.setItem(CLIENTS_KEY,JSON.stringify(rows))}
function getActiveClientId(){
  const rows=loadClients();
  let id=localStorage.getItem(ACTIVE_KEY);
  if(!id||!rows.some(x=>x.id===id)){id=rows[0].id;localStorage.setItem(ACTIVE_KEY,id)}
  return id;
}
function getActiveClient(){return loadClients().find(x=>x.id===getActiveClientId())||loadClients()[0]}
function setActiveClient(id){
  localStorage.setItem(ACTIVE_KEY,id);
  renderClients();
  refreshClientCabinet();
  refreshAstrologerMaterials();
  const c=getActiveClient(); toast('Активний клієнт: '+c.name);
}
window.setActiveClient=setActiveClient;

function renderClients(){
  const box=$('#clientList'); if(!box)return;
  const active=getActiveClientId();
  box.innerHTML=loadClients().map(c=>`
    <button class="client-row ${c.id===active?'active':''}" onclick="setActiveClient('${c.id}')">
      <span class="avatar">${escapeHtml((c.name||'?').slice(0,1).toUpperCase())}</span>
      <span><b>${escapeHtml(c.name)}</b><small>${c.birth?formatDate(c.birth):'клієнт'}</small></span>
    </button>`).join('');
}

$('#addClient')?.addEventListener('click',()=>{
  const form=$('#newClientForm'); if(!form)return;
  form.hidden=!form.hidden;
  if(!form.hidden) $('#newClientName')?.focus();
});
$('#saveNewClient')?.addEventListener('click',()=>{
  const name=$('#newClientName')?.value.trim();
  const birth=$('#newClientBirth')?.value||'';
  if(!name){toast('Вкажіть ім’я клієнта');return}
  const rows=loadClients();
  const id='c-'+Date.now();
  rows.push({id,name,birth,created:Date.now()});
  saveClients(rows); localStorage.setItem(ACTIVE_KEY,id);
  $('#newClientName').value=''; $('#newClientBirth').value=''; $('#newClientForm').hidden=true;
  renderClients(); refreshClientCabinet(); refreshAstrologerMaterials(); refreshAstrologerMaterials(); toast('Клієнта додано');
});

// ---------- IndexedDB materials ----------
const DB='viktoria-astrostar-db', STORE='materials';
function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,2);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function addMaterial(file,type,clientId){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).add({name:file.name,type,clientId,blob:file,size:file.size,created:Date.now()});tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function allMaterials(){const db=await openDB();return new Promise((res,rej)=>{const q=db.transaction(STORE).objectStore(STORE).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)})}
async function getMaterial(id){const db=await openDB();return new Promise((res,rej)=>{const q=db.transaction(STORE).objectStore(STORE).get(id);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function downloadMaterial(id){const m=await getMaterial(id);if(!m)return;const u=URL.createObjectURL(m.blob);const a=document.createElement('a');a.href=u;a.download=m.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200)}
window.downloadMaterial=downloadMaterial;
function fmtSize(n){return n<1024?`${n} B`:n<1024**2?`${(n/1024).toFixed(1)} KB`:`${(n/1024**2).toFixed(1)} MB`}
function labelType(t){return ({natal:'Натальна карта',forecast:'Прогноз',consultation:'Консультація',general:'Матеріал'})[t]||'Матеріал'}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatDate(v){try{return new Date(v+'T00:00:00').toLocaleDateString('uk-UA')}catch{return v}}

async function refreshClientCabinet(){
  const client=getActiveClient();
  if($('#clientCabinetName')) $('#clientCabinetName').textContent=client.name;
  let rows=[];try{rows=(await allMaterials()).filter(x=>!x.clientId||x.clientId===client.id)}catch{}
  const grid=$('#clientFileGrid');
  if(grid){
    grid.innerHTML=rows.length?rows.sort((a,b)=>b.created-a.created).map(m=>`
      <article class="file-card"><div><small>${labelType(m.type)}</small><b title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</b><small>${fmtSize(m.size)}</small></div><button class="btn ghost small" onclick="downloadMaterial(${m.id})">↓</button></article>`).join('')
      :'<div class="empty-soft">Поки що тут порожньо. Астролог додасть матеріали у ваш кабінет.</div>';
  }
  const natal=rows.filter(x=>x.type==='natal').sort((a,b)=>b.created-a.created)[0];
  const fore=rows.filter(x=>x.type==='forecast').sort((a,b)=>b.created-a.created)[0];
  bindFeatured(natal,'natal');bindFeatured(fore,'forecast');
  const cons=rows.filter(x=>x.type==='consultation').sort((a,b)=>b.created-a.created);
  if($('#clientArchive')) $('#clientArchive').innerHTML=cons.length?cons.map(m=>`
    <div class="file-card"><b>${escapeHtml(m.name)}</b><small>${new Date(m.created).toLocaleDateString('uk-UA')} • ${fmtSize(m.size)}</small><button class="btn ghost small" onclick="downloadMaterial(${m.id})">Завантажити</button></div>`).join('')
    :'<div class="empty-soft">Після консультацій тут з\'являться матеріали та нотатки.</div>';
  loadActiveNote();
}

async function refreshAstrologerMaterials(){
  const client=getActiveClient();
  if($('#uploadClientName')) $('#uploadClientName').textContent=client.name;
  const list=$('#astrologerMaterialList');
  if(!list)return;
  let rows=[];
  try{rows=(await allMaterials()).filter(x=>x.clientId===client.id)}catch{}
  rows.sort((a,b)=>b.created-a.created);
  if($('#astrologerMaterialCount')) $('#astrologerMaterialCount').textContent=rows.length+' '+(rows.length===1?'файл':'файлів');
  list.innerHTML=rows.length?rows.map(m=>`
    <article class="astrologer-material-row">
      <div class="material-file-icon">${fileIcon(m.name)}</div>
      <div class="material-main">
        <b title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</b>
        <small>${labelType(m.type)} • ${fmtSize(m.size)} • ${new Date(m.created).toLocaleDateString('uk-UA')}</small>
      </div>
      <button class="btn ghost small" onclick="downloadMaterial(${m.id})" title="Завантажити">↓</button>
    </article>`).join('')
    :'<div class="empty-soft">Для цього клієнта файлів ще немає.</div>';
}
function fileIcon(name=''){
  const ext=String(name).split('.').pop().toLowerCase();
  if(ext==='pdf')return 'PDF';
  if(['jpg','jpeg','png','webp'].includes(ext))return 'IMG';
  if(['mp3','wav','m4a'].includes(ext))return 'AUD';
  if(['mp4','mov','webm'].includes(ext))return 'VID';
  return 'FILE';
}

let __natalPreviewUrl=null;
async function renderNatalPreview(m){
  const box=$('#natalPreview'); if(!box)return;
  if(__natalPreviewUrl){URL.revokeObjectURL(__natalPreviewUrl);__natalPreviewUrl=null}
  if(!m){
    box.innerHTML='<div class="natal-placeholder"><div class="mini-wheel big"></div><small>Після завантаження натальної карти тут зʼявиться її превʼю</small></div>';
    return;
  }
  const full=await getMaterial(m.id);
  if(!full?.blob)return;
  const type=(full.blob.type||'').toLowerCase();
  const ext=String(full.name||'').split('.').pop().toLowerCase();
  __natalPreviewUrl=URL.createObjectURL(full.blob);
  if(type.startsWith('image/')||['png','jpg','jpeg','webp'].includes(ext)){
    box.innerHTML=`<img class="natal-preview-image" src="${__natalPreviewUrl}" alt="Натальна карта">`;
  }else if(type==='application/pdf'||ext==='pdf'){
    box.innerHTML=`<div class="natal-pdf-preview">
      <iframe src="${__natalPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0" title="Превʼю натальної карти"></iframe>
      <div class="pdf-preview-fallback"><b>Натальна карта PDF</b><small>${escapeHtml(full.name)}</small><button class="btn ghost small" onclick="downloadMaterial(${full.id})">Відкрити / завантажити</button></div>
    </div>`;
  }else{
    box.innerHTML=`<div class="natal-placeholder"><div class="mini-wheel big"></div><small>${escapeHtml(full.name)}</small></div>`;
  }
}
function bindFeatured(m,kind){
  const isNatal=kind==='natal';
  const status=$(isNatal?'#clientNatalStatus':'#clientForecastStatus');
  const btn=$(isNatal?'#downloadNatal':'#downloadForecast');
  if(!status||!btn)return;
  if(m){
    status.textContent=`${m.name} • ${fmtSize(m.size)}`;
    btn.disabled=false;btn.onclick=()=>downloadMaterial(m.id);
    if(isNatal) renderNatalPreview(m);
  }else{
    status.textContent=isNatal?'Файл ще не завантажений':'Очікує на завантаження';
    btn.disabled=true;btn.onclick=null;
    if(isNatal) renderNatalPreview(null);
  }
}

const upload=$('#materialUpload'),dz=$('.dropzone');
if(upload&&dz){
  upload.addEventListener('change',()=>handleFiles(upload.files));
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));
  dz.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));
}
async function handleFiles(files){
  const type=$('#materialType')?.value||'general';
  const clientId=getActiveClientId();
  for(const f of files) await addMaterial(f,type,clientId);
  toast('Додано файлів: '+files.length);
  if(upload) upload.value='';
  refreshClientCabinet();
  refreshAstrologerMaterials();
}

// ---------- per-client notes ----------
function loadNotes(){try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'{}')}catch{return {}}}
function loadActiveNote(){
  const notes=$('#clientNotes'); if(!notes)return;
  const all=loadNotes(); notes.value=all[getActiveClientId()]||'';
}
$('#saveNotes')?.addEventListener('click',()=>{
  const notes=$('#clientNotes'); if(!notes)return;
  const all=loadNotes(); all[getActiveClientId()]=notes.value;
  localStorage.setItem(NOTES_KEY,JSON.stringify(all));
  if($('#saveNoteStatus')) $('#saveNoteStatus').textContent='Збережено щойно';
  toast('Нотатку збережено');
});

// ---------- PDF ----------
$('#makePdf')?.addEventListener('click',()=>{
  const client=getActiveClient();
  const title=$('#reportTitle')?.value.trim()||'Персональний прогноз';
  const period=$('#reportPeriod')?.value.trim()||'';
  const txt=$('#reportText')?.value.trim()||'Додайте текст прогнозу перед створенням PDF.';
  if($('#printTitle')) $('#printTitle').textContent=title+' — '+client.name;
  if($('#printPeriod')) $('#printPeriod').textContent=period;
  if($('#printText')) $('#printText').textContent=txt;
  if($('#printDate')) $('#printDate').textContent=new Date().toLocaleDateString('uk-UA');
  setTimeout(()=>window.print(),80);
});

// ---------- ephemerides ----------
let ephem=[];
const required=['planet','event','start_date','end_date','sign','notes'];
function normalize(o){const x={};required.forEach(k=>x[k]=String(o[k]??'').trim());return x}
$('#ephemerisImport')?.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const txt=await f.text();let rows;
    if(f.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(txt);rows=Array.isArray(parsed)?parsed:(parsed.rows||[])}
    else rows=parseCSV(txt);
    ephem=rows.map(normalize).filter(r=>r.planet||r.event||r.start_date);
    localStorage.setItem('viktoria-ephem',JSON.stringify(ephem));
    populateFilters();renderEphem();toast('Імпортовано '+ephem.length+' записів');
  }catch(err){toast('Не вдалося прочитати файл. Перевірте формат.')}
});
function parseCSV(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(!lines.length)return[];
  const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out};
  const head=parseLine(lines[0]).map(x=>x.trim());
  return lines.slice(1).map(l=>{const vals=parseLine(l),o={};head.forEach((h,i)=>o[h]=vals[i]??'');return o})
}
function populateFilters(){
  const p=$('#ephemPlanet'),y=$('#ephemYear'); if(!p||!y)return;
  const planets=[...new Set(ephem.map(x=>x.planet).filter(Boolean))].sort();
  p.innerHTML='<option value="">Усі планети</option>'+planets.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  const years=[...new Set(ephem.flatMap(x=>[x.start_date?.slice(0,4),x.end_date?.slice(0,4)]).filter(v=>/^20\d\d$/.test(v)))].sort();
  y.innerHTML='<option value="">Усі роки</option>'+years.map(v=>`<option>${v}</option>`).join('');
}
function renderEphem(){
  const body=$('#ephemBody'); if(!body)return;
  const q=($('#ephemSearch')?.value||'').toLowerCase(),p=$('#ephemPlanet')?.value||'',y=$('#ephemYear')?.value||'';
  const rows=ephem.filter(r=>{const hay=Object.values(r).join(' ').toLowerCase();return(!q||hay.includes(q))&&(!p||r.planet===p)&&(!y||r.start_date.startsWith(y)||r.end_date.startsWith(y))});
  if($('#ephemCount')) $('#ephemCount').textContent=rows.length+' записів';
  body.innerHTML=rows.length?rows.map(r=>`<tr><td><b>${escapeHtml(r.planet)}</b></td><td>${escapeHtml(r.event)}</td><td>${escapeHtml(r.start_date)}</td><td>${escapeHtml(r.end_date)}</td><td>${escapeHtml(r.sign)}</td><td>${escapeHtml(r.notes)}</td></tr>`).join('')
  :`<tr><td colspan="6"><div class="empty-state"><span>✦</span><b>${ephem.length?'Нічого не знайдено':'База ще не імпортована'}</b><p>${ephem.length?'Змініть пошук або фільтри.':'Завантажте CSV або JSON з перевіреними ефемеридами — пошук і фільтри запрацюють одразу.'}</p></div></td></tr>`;
}
['#ephemSearch','#ephemPlanet','#ephemYear'].forEach(s=>$(s)?.addEventListener(s==='#ephemSearch'?'input':'change',renderEphem));
try{ephem=JSON.parse(localStorage.getItem('viktoria-ephem')||'[]')}catch{ephem=[]}
populateFilters();renderEphem();
$('#downloadTemplate')?.addEventListener('click',()=>{
  const csv='planet,event,start_date,end_date,sign,notes\n';
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ephemerides_template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);
});

renderClients(); refreshClientCabinet();
