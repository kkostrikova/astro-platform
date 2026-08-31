const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const toast=(msg)=>{const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),2600)};

// routing
function route(name){$$('.view').forEach(v=>v.classList.remove('active'));$(`#view-${name}`)?.classList.add('active');$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.route===name));history.replaceState(null,'',`#${name}`);window.scrollTo({top:0,behavior:'smooth'});if(name==='client')refreshClientFiles();}
$$('[data-route]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();route(el.dataset.route)}));
const initial=(location.hash||'#home').slice(1); if($('#view-'+initial)) route(initial);

// parallax & tilt
window.addEventListener('mousemove',e=>{const x=(e.clientX/innerWidth-.5),y=(e.clientY/innerHeight-.5);$$('[data-parallax]').forEach(el=>{const m=Number(el.dataset.parallax||.3);el.style.transform=`translate3d(${x*34*m}px,${y*24*m}px,${m*20}px)`});const zw=$('.zodiac-wrap');if(zw)zw.style.transform=`translate(-50%,-50%) rotateX(${8-y*7}deg) rotateY(${x*8}deg)`;});
$$('.tilt-card').forEach(card=>{card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(700px) rotateX(${-y*4}deg) rotateY(${x*6}deg) translateY(-3px)`});card.addEventListener('mouseleave',()=>card.style.transform='')});

// IndexedDB file store
const DB='astra-surprise-db', STORE='materials';
function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function addMaterial(file,type){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).add({name:file.name,type,blob:file,size:file.size,created:Date.now()});tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function allMaterials(){const db=await openDB();return new Promise((res,rej)=>{const q=db.transaction(STORE).objectStore(STORE).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)})}
async function getMaterial(id){const db=await openDB();return new Promise((res,rej)=>{const q=db.transaction(STORE).objectStore(STORE).get(id);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function fmtSize(n){return n<1024?`${n} B`:n<1024**2?`${(n/1024).toFixed(1)} KB`:`${(n/1024**2).toFixed(1)} MB`}
async function downloadMaterial(id){const m=await getMaterial(id);if(!m)return;const u=URL.createObjectURL(m.blob);const a=document.createElement('a');a.href=u;a.download=m.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
window.downloadMaterial=downloadMaterial;

async function refreshClientFiles(){let rows=[];try{rows=await allMaterials()}catch(e){console.warn(e)}const grid=$('#clientFileGrid');if(!grid)return;if(!rows.length){grid.innerHTML='<div class="empty-soft">Поки що тут порожньо. Астролог додасть матеріали у ваш кабінет.</div>'}else{grid.innerHTML=rows.sort((a,b)=>b.created-a.created).map(m=>`<article class="file-card"><div><small>${labelType(m.type)}</small><b title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</b><small>${fmtSize(m.size)}</small></div><button class="btn ghost small" onclick="downloadMaterial(${m.id})">↓</button></article>`).join('')}
 const natal=rows.filter(x=>x.type==='natal').sort((a,b)=>b.created-a.created)[0];const fore=rows.filter(x=>x.type==='forecast').sort((a,b)=>b.created-a.created)[0];bindFeatured(natal,'natal');bindFeatured(fore,'forecast');
 const cons=rows.filter(x=>x.type==='consultation').sort((a,b)=>b.created-a.created);$('#clientArchive').innerHTML=cons.length?cons.map(m=>`<div class="file-card"><b>${escapeHtml(m.name)}</b><small>${new Date(m.created).toLocaleDateString('uk-UA')} • ${fmtSize(m.size)}</small><button class="btn ghost small" onclick="downloadMaterial(${m.id})">Завантажити</button></div>`).join(''):'<div class="empty-soft">Після консультацій тут з\'являться матеріали та нотатки.</div>';
}
function bindFeatured(m,kind){const isNatal=kind==='natal';const status=$(isNatal?'#clientNatalStatus':'#clientForecastStatus'),btn=$(isNatal?'#downloadNatal':'#downloadForecast');if(m){status.textContent=`${m.name} • ${fmtSize(m.size)}`;btn.disabled=false;btn.onclick=()=>downloadMaterial(m.id)}else{status.textContent=isNatal?'Файл ще не завантажений':'Очікує на завантаження';btn.disabled=true;btn.onclick=null}}
function labelType(t){return ({natal:'Натальна карта',forecast:'Прогноз',consultation:'Консультація',general:'Матеріал'})[t]||'Матеріал'}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

const upload=$('#materialUpload'),dz=$('.dropzone');
if(upload){upload.addEventListener('change',()=>handleFiles(upload.files));['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));}
async function handleFiles(files){const type=$('#materialType').value;for(const f of files){await addMaterial(f,type)}toast(`Додано файлів: ${files.length}`);refreshClientFiles()}

// notes
const notes=$('#clientNotes'); if(notes){notes.value=localStorage.getItem('astra-notes')||'';$('#saveNotes').onclick=()=>{localStorage.setItem('astra-notes',notes.value);$('#saveNoteStatus').textContent='Збережено щойно';toast('Нотатку збережено')}}
$('#addClient')?.addEventListener('click',()=>toast('У повній версії тут створюється новий клієнт'));

// pretty print/PDF
$('#makePdf')?.addEventListener('click',()=>{const title=$('#reportTitle').value.trim()||'Персональний прогноз';const period=$('#reportPeriod').value.trim();const txt=$('#reportText').value.trim()||'Додайте текст прогнозу перед створенням PDF.';$('#printTitle').textContent=title;$('#printPeriod').textContent=period;$('#printText').textContent=txt;$('#printDate').textContent=new Date().toLocaleDateString('uk-UA');setTimeout(()=>window.print(),80)});

// Ephemeris import/search — no invented astro data
let ephem=[];
const required=['planet','event','start_date','end_date','sign','notes'];
function normalize(o){const x={};required.forEach(k=>x[k]=String(o[k]??'').trim());return x}
$('#ephemerisImport')?.addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const txt=await f.text();let rows;if(f.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(txt);rows=Array.isArray(parsed)?parsed:(parsed.rows||[])}else rows=parseCSV(txt);ephem=rows.map(normalize).filter(r=>r.planet||r.event||r.start_date);localStorage.setItem('astra-ephem',JSON.stringify(ephem));populateFilters();renderEphem();toast(`Імпортовано ${ephem.length} записів`)}catch(err){toast('Не вдалося прочитати файл. Перевірте формат.')}});
function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(!lines.length)return[];const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out};const head=parseLine(lines[0]).map(x=>x.trim());return lines.slice(1).map(l=>{const vals=parseLine(l),o={};head.forEach((h,i)=>o[h]=vals[i]??'');return o})}
function populateFilters(){const p=$('#ephemPlanet'),y=$('#ephemYear');const planets=[...new Set(ephem.map(x=>x.planet).filter(Boolean))].sort();p.innerHTML='<option value="">Усі планети</option>'+planets.map(v=>`<option>${escapeHtml(v)}</option>`).join('');const years=[...new Set(ephem.flatMap(x=>[x.start_date?.slice(0,4),x.end_date?.slice(0,4)]).filter(v=>/^20\d\d$/.test(v)))].sort();y.innerHTML='<option value="">Усі роки</option>'+years.map(v=>`<option>${v}</option>`).join('')}
function renderEphem(){const q=($('#ephemSearch').value||'').toLowerCase(),p=$('#ephemPlanet').value,y=$('#ephemYear').value;const rows=ephem.filter(r=>{const hay=Object.values(r).join(' ').toLowerCase();return (!q||hay.includes(q))&&(!p||r.planet===p)&&(!y||r.start_date.startsWith(y)||r.end_date.startsWith(y))});$('#ephemCount').textContent=`${rows.length} записів`;$('#ephemBody').innerHTML=rows.length?rows.map(r=>`<tr><td><b>${escapeHtml(r.planet)}</b></td><td>${escapeHtml(r.event)}</td><td>${escapeHtml(r.start_date)}</td><td>${escapeHtml(r.end_date)}</td><td>${escapeHtml(r.sign)}</td><td>${escapeHtml(r.notes)}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty-state"><span>✦</span><b>${ephem.length?'Нічого не знайдено':'База ще не імпортована'}</b><p>${ephem.length?'Змініть пошук або фільтри.':'Завантажте CSV або JSON з перевіреними ефемеридами — пошук і фільтри запрацюють одразу.'}</p></div></td></tr>`}
['#ephemSearch','#ephemPlanet','#ephemYear'].forEach(s=>$(s)?.addEventListener(s==='#ephemSearch'?'input':'change',renderEphem));
try{ephem=JSON.parse(localStorage.getItem('astra-ephem')||'[]');populateFilters();renderEphem()}catch{}
$('#downloadTemplate')?.addEventListener('click',()=>{const csv='planet,event,start_date,end_date,sign,notes\n';const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ephemerides_template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});

refreshClientFiles();
