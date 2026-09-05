const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const toast=(msg)=>{const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),2800)};

const SUPABASE_URL='https://xaxfzrddkdlhlpycggzu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_geMS1yXwmkyf6cD3zhWRpQ_wwixPJ9T';
const SUPABASE_JS_VERSION='2.112.2';
const STORAGE_BUCKET='client-materials';
const ACTIVE_KEY='viktoria-active-client';

let sb=null;
let currentUser=null;
let isAstrologer=false;
let clientsCache=[];
let activeClientId=null;
let clientMaterialFilter='all';
let authReady=false;

function escapeHtml(s=''){return String(s).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
function formatDate(v){if(!v)return'';try{return new Date(v+'T00:00:00').toLocaleDateString('uk-UA')}catch{return v}}
function fmtSize(n){n=Number(n)||0;return n<1024?`${n} B`:n<1024**2?`${(n/1024).toFixed(1)} KB`:`${(n/1024**2).toFixed(1)} MB`}
function labelType(t){return ({natal:'Натальна карта',forecast:'Прогноз',consultation:'Консультація',general:'Матеріал'})[t]||'Матеріал'}
function fileIcon(name=''){const ext=String(name).split('.').pop().toLowerCase();if(ext==='pdf')return'PDF';if(['jpg','jpeg','png','webp'].includes(ext))return'IMG';if(ext==='mp3')return'AUD';if(ext==='mp4')return'VID';return'FILE'}
function friendlyError(err,fallback='Не вдалося виконати дію'){console.error(err);const m=String(err?.message||'');if(/invalid login credentials/i.test(m))return'Невірний email або пароль';if(/email not confirmed/i.test(m))return'Спочатку підтвердіть email';if(/user already registered/i.test(m))return'Акаунт з таким email уже існує';if(/duplicate key|unique constraint/i.test(m))return'Такий запис уже існує';if(/row-level security|permission denied/i.test(m))return'Немає доступу до цієї дії';return m||fallback}

// ---------- routing ----------
function route(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#view-'+name)?.classList.add('active');
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.route===name));
  history.replaceState(null,'','#'+name);
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='client') refreshClientCabinet();
  if(name==='astrologer'){renderClients();refreshAstrologerMaterials();loadActiveNote()}
  if(name==='ephemeris') refreshEphemerides();
  closeMobileMenu();
}
window.addEventListener('hashchange',()=>{const name=(location.hash||'#home').slice(1);if($('#view-'+name)&&!$('#view-'+name).classList.contains('active'))route(name)});
const menuToggle=$('#menuToggle'), mobileNav=$('#mobileNav');
function closeMobileMenu(){mobileNav?.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false');if(menuToggle)menuToggle.setAttribute('aria-label','Відкрити меню')}
menuToggle?.addEventListener('click',()=>{const open=mobileNav?.classList.toggle('open')||false;menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Закрити меню':'Відкрити меню')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileMenu()});
$$('[data-route]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();route(el.dataset.route)}));

// ---------- Supabase + auth UI ----------
function injectAuthUI(){
  if($('#supabase-auth-style'))return;
  const style=document.createElement('style');
  style.id='supabase-auth-style';
  style.textContent=`
    .auth-gate-wrap{padding-top:1.2rem;padding-bottom:1.2rem}.auth-gate-card{max-width:720px;margin:0 auto;padding:clamp(22px,4vw,42px);text-align:left}.auth-gate-card h3{margin:.25rem 0 .55rem;font-family:'Cormorant Garamond',serif;font-size:clamp(28px,4vw,42px);font-weight:500}.auth-gate-card>p{max-width:620px;color:var(--muted,#736f69);line-height:1.65}.auth-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}.auth-form-grid label{display:grid;gap:7px;font-size:13px}.auth-form-grid input{width:100%}.auth-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.auth-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;font-size:12px;color:var(--muted,#736f69)}.auth-dot{width:7px;height:7px;border-radius:999px;background:currentColor;opacity:.5}.auth-status-good{color:#476a52}.auth-status-wait{color:#8a6a32}.supabase-private[hidden]{display:none!important}#logoutBtn[hidden]{display:none!important}@media(max-width:680px){.auth-form-grid{grid-template-columns:1fr}.auth-gate-card{padding:20px}.auth-actions .btn{flex:1 1 auto}}
  `;
  document.head.appendChild(style);

  const client=$('#view-client'), astro=$('#view-astrologer');
  if(client){
    const gate=document.createElement('div');gate.id='clientAuthGate';gate.className='shell auth-gate-wrap';gate.innerHTML=authGateHtml('client','Кабінет клієнта','Увійдіть, щоб бачити свої карти, прогнози та архів матеріалів.');client.prepend(gate);
    [...client.children].filter(x=>x!==gate).forEach(x=>{x.classList.add('supabase-private');x.hidden=true});
  }
  if(astro){
    const gate=document.createElement('div');gate.id='astroAuthGate';gate.className='shell auth-gate-wrap';gate.innerHTML=authGateHtml('astro','Кабінет Вікторії','Увійдіть в акаунт астролога, щоб керувати клієнтами, нотатками та файлами.');astro.prepend(gate);
    [...astro.children].filter(x=>x!==gate).forEach(x=>{x.classList.add('supabase-private');x.hidden=true});
  }

  const top=$('.top-actions');
  if(top&&!$('#logoutBtn')){const b=document.createElement('button');b.id='logoutBtn';b.className='btn ghost small';b.textContent='Вийти';b.hidden=true;top.prepend(b);b.addEventListener('click',signOut)}

  const newClientForm=$('#newClientForm');
  if(newClientForm&&!$('#newClientEmail')){
    const birthLabel=$('#newClientBirth')?.closest('label');
    const label=document.createElement('label');label.innerHTML='Email<input id="newClientEmail" type="email" autocomplete="email" placeholder="client@example.com">';
    birthLabel?.before(label);
  }
  $('#materialUpload')?.setAttribute('accept','.pdf,.png,.jpg,.jpeg,.webp,.mp3,.mp4');
  const dzSmall=$('.dropzone small');if(dzSmall)dzSmall.textContent='PDF, PNG, JPG, WEBP, MP3, MP4 • до 50 MB';
  const archiveNote=$('.cabinet-summary-note small');if(archiveNote)archiveNote.textContent='Захищено персональним входом';
  if($('#saveNoteStatus'))$('#saveNoteStatus').textContent='Зберігається у захищеній базі';
  const footer=$('.footer');if(footer){const spans=$$('span',footer);if(spans[1])spans[1].textContent='Матеріали клієнтів зберігаються у приватному сховищі Supabase.'}

  $$('[data-auth-login]').forEach(b=>b.addEventListener('click',()=>authLogin(b.dataset.authLogin)));
  $$('[data-auth-signup]').forEach(b=>b.addEventListener('click',()=>authSignup(b.dataset.authSignup)));
  ['client','astro'].forEach(kind=>{const pass=$('#'+kind+'AuthPassword');pass?.addEventListener('keydown',e=>{if(e.key==='Enter')authLogin(kind)})});
}
function authGateHtml(kind,title,text){return `<section class="glass panel auth-gate-card"><div class="eyebrow">ПРИВАТНИЙ ДОСТУП</div><h3 id="${kind}AuthTitle">${title}</h3><p id="${kind}AuthText">${text}</p><div class="auth-form-grid" id="${kind}AuthForm"><label>Email<input id="${kind}AuthEmail" type="email" autocomplete="email" placeholder="name@example.com"></label><label>Пароль<input id="${kind}AuthPassword" type="password" autocomplete="current-password" placeholder="Ваш пароль"></label></div><div class="auth-actions" id="${kind}AuthActions"><button class="btn primary" data-auth-login="${kind}">Увійти</button><button class="btn ghost" data-auth-signup="${kind}">Створити акаунт</button></div><div class="auth-meta"><span class="auth-dot"></span><span id="${kind}AuthStatus">Supabase Auth • приватна сесія</span></div></section>`}
function setPrivate(kind,visible){const view=$('#view-'+(kind==='astro'?'astrologer':'client'));if(!view)return;$$('.supabase-private',view).forEach(x=>x.hidden=!visible);const gate=$('#'+kind+'AuthGate');if(gate)gate.hidden=visible}
function setGate(kind,{title,text,status='Supabase Auth • приватна сесія',showForm=true,statusClass=''}){const gate=$('#'+kind+'AuthGate');if(!gate)return;gate.hidden=false;$('#'+kind+'AuthTitle').textContent=title;$('#'+kind+'AuthText').textContent=text;$('#'+kind+'AuthForm').hidden=!showForm;$('#'+kind+'AuthActions').hidden=!showForm;const s=$('#'+kind+'AuthStatus');if(s){s.textContent=status;s.className=statusClass}}
function updateAccessUI(){
  const logout=$('#logoutBtn');if(logout)logout.hidden=!currentUser;
  const pill=$('.profile-pill');if(pill){pill.title=currentUser?`Увійшли як ${currentUser.email||''}`:'Увійти в кабінет'}
  if(!authReady){setPrivate('client',false);setPrivate('astro',false);return}
  if(!currentUser){
    setPrivate('client',false);setGate('client',{title:'Кабінет клієнта',text:'Увійдіть, щоб бачити свої карти, прогнози та архів матеріалів.'});
    setPrivate('astro',false);setGate('astro',{title:'Кабінет Вікторії',text:'Увійдіть в акаунт астролога, щоб керувати клієнтами, нотатками та файлами.'});
    return;
  }
  if(isAstrologer){
    setPrivate('astro',true);
    if(clientsCache.length)setPrivate('client',true);else{setPrivate('client',false);setGate('client',{title:'Поки немає клієнтів',text:'Додайте першого клієнта у кабінеті астролога — після цього тут можна буде перевірити його кабінет.',status:'Акаунт астролога активний',showForm:false,statusClass:'auth-status-good'})}
  }else{
    setPrivate('astro',false);setGate('astro',{title:'Кабінет астролога не активований',text:'Цей акаунт створено, але він не має прав астролога. Кабінет Вікторії відкриється тільки після окремої активації.',status:`Увійшли як ${currentUser.email||''}`,showForm:false,statusClass:'auth-status-wait'});
    if(clientsCache.length)setPrivate('client',true);else{setPrivate('client',false);setGate('client',{title:'Акаунт створено',text:'Вхід працює. Ваш email ще не прив’язаний до картки клієнта. Після того як Вікторія додасть вас до своєї бази з цим самим email, матеріали з’являться тут автоматично.',status:`Увійшли як ${currentUser.email||''}`,showForm:false,statusClass:'auth-status-good'})}
  }
}
async function loadSupabaseSdk(){if(window.supabase?.createClient)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_JS_VERSION}/dist/umd/supabase.min.js`;s.async=true;s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(new Error('Не вдалося завантажити Supabase JS'));document.head.appendChild(s)})}
async function initSupabase(){
  try{
    await loadSupabaseSdk();
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session},error}=await sb.auth.getSession();if(error)throw error;
    await applySession(session);
    sb.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>applySession(session),0)});
  }catch(err){authReady=true;updateAccessUI();toast(friendlyError(err,'Не вдалося підключитися до Supabase'))}
}
async function applySession(session){
  currentUser=session?.user||null;isAstrologer=false;clientsCache=[];activeClientId=null;
  if(currentUser&&sb){
    const {data:astro,error:astroErr}=await sb.from('astrologers').select('user_id').eq('user_id',currentUser.id).maybeSingle();
    if(astroErr)console.error(astroErr);isAstrologer=!!astro;
    if(isAstrologer)await loadAllClients();else await loadCurrentClient();
  }
  authReady=true;updateAccessUI();
  const current=(location.hash||'#home').slice(1);
  if(current==='client')await refreshClientCabinet();
  if(current==='astrologer'){renderClients();await refreshAstrologerMaterials();await loadActiveNote()}
  if(current==='ephemeris')await refreshEphemerides();
}
async function authLogin(kind){if(!sb)return toast('Підключення ще ініціалізується');const email=$('#'+kind+'AuthEmail')?.value.trim().toLowerCase(),password=$('#'+kind+'AuthPassword')?.value||'';if(!email||!password)return toast('Вкажіть email і пароль');const {error}=await sb.auth.signInWithPassword({email,password});if(error)return toast(friendlyError(error));toast('Вхід виконано')}
async function authSignup(kind){if(!sb)return toast('Підключення ще ініціалізується');const email=$('#'+kind+'AuthEmail')?.value.trim().toLowerCase(),password=$('#'+kind+'AuthPassword')?.value||'';if(!email||!password)return toast('Вкажіть email і пароль');if(password.length<8)return toast('Пароль має містити щонайменше 8 символів');const {data,error}=await sb.auth.signUp({email,password});if(error)return toast(friendlyError(error));if(data.session)toast('Акаунт створено і вхід виконано');else toast('Акаунт створено. Підтвердіть email і поверніться на платформу')}
async function signOut(){if(!sb)return;const {error}=await sb.auth.signOut();if(error)return toast(friendlyError(error));toast('Ви вийшли з акаунта');route('home')}

// ---------- clients ----------
async function loadAllClients(){if(!sb||!currentUser||!isAstrologer)return;const {data,error}=await sb.from('clients').select('*').order('created_at',{ascending:true});if(error){console.error(error);clientsCache=[];return}clientsCache=data||[];const stored=localStorage.getItem(ACTIVE_KEY);activeClientId=clientsCache.some(c=>c.id===stored)?stored:(clientsCache[0]?.id||null);if(activeClientId)localStorage.setItem(ACTIVE_KEY,activeClientId)}
async function loadCurrentClient(){if(!sb||!currentUser)return;const {data,error}=await sb.from('clients').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle();if(error){console.error(error);clientsCache=[];return}clientsCache=data?[data]:[];activeClientId=data?.id||null}
function getActiveClientId(){return activeClientId||clientsCache[0]?.id||null}
function getActiveClient(){return clientsCache.find(x=>x.id===getActiveClientId())||clientsCache[0]||null}
async function setActiveClient(id){if(!isAstrologer||!clientsCache.some(c=>c.id===id))return;activeClientId=id;localStorage.setItem(ACTIVE_KEY,id);renderClients();await refreshClientCabinet();await refreshAstrologerMaterials();await loadActiveNote();const c=getActiveClient();if(c)toast('Активний клієнт: '+c.name)}
window.setActiveClient=setActiveClient;
function renderClients(){const box=$('#clientList');if(!box)return;if(!currentUser||!isAstrologer){box.innerHTML='';return}const active=getActiveClientId();box.innerHTML=clientsCache.length?clientsCache.map(c=>`<button class="client-row ${c.id===active?'active':''}" onclick="setActiveClient('${c.id}')"><span class="avatar">${escapeHtml((c.name||'?').slice(0,1).toUpperCase())}</span><span><b>${escapeHtml(c.name)}</b><small>${c.birth?formatDate(c.birth):escapeHtml(c.email)}</small></span></button>`).join(''):'<div class="empty-soft">Клієнтів ще немає. Додайте першого.</div>';if($('#astroClientCount'))$('#astroClientCount').textContent=clientsCache.length}
$('#addClient')?.addEventListener('click',()=>{if(!isAstrologer)return toast('Потрібен доступ астролога');const form=$('#newClientForm');if(!form)return;form.hidden=!form.hidden;$('#addClient')?.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)$('#newClientName')?.focus()});
$('#saveNewClient')?.addEventListener('click',async()=>{if(!sb||!isAstrologer)return toast('Потрібен доступ астролога');const name=$('#newClientName')?.value.trim(),email=$('#newClientEmail')?.value.trim().toLowerCase(),birth=$('#newClientBirth')?.value||null;if(!name)return toast('Вкажіть ім’я клієнта');if(!email||!email.includes('@'))return toast('Вкажіть email клієнта');const {data,error}=await sb.from('clients').insert({name,email,birth}).select().single();if(error)return toast(friendlyError(error,'Не вдалося додати клієнта'));await loadAllClients();activeClientId=data.id;localStorage.setItem(ACTIVE_KEY,data.id);$('#newClientName').value='';$('#newClientEmail').value='';$('#newClientBirth').value='';$('#newClientForm').hidden=true;$('#addClient')?.setAttribute('aria-expanded','false');updateAccessUI();renderClients();await refreshClientCabinet();await refreshAstrologerMaterials();await loadActiveNote();toast('Клієнта додано')});

// ---------- materials ----------
async function materialsForActiveClient(){const clientId=getActiveClientId();if(!sb||!currentUser||!clientId)return[];const {data,error}=await sb.from('materials').select('*').eq('client_id',clientId).order('created_at',{ascending:false});if(error){console.error(error);toast(friendlyError(error,'Не вдалося завантажити матеріали'));return[]}return data||[]}
async function getMaterial(id){if(!sb||!currentUser)return null;const {data,error}=await sb.from('materials').select('*').eq('id',id).maybeSingle();if(error){console.error(error);return null}return data}
async function removeMaterial(id){if(!isAstrologer)return toast('Видаляти файли може лише астролог');const m=await getMaterial(id);if(!m)return;const ok=confirm('Видалити файл «'+m.name+'»?');if(!ok)return;const {error:storageError}=await sb.storage.from(STORAGE_BUCKET).remove([m.storage_path]);if(storageError)return toast(friendlyError(storageError,'Не вдалося видалити файл зі сховища'));const {error:dbError}=await sb.from('materials').delete().eq('id',m.id);if(dbError)return toast(friendlyError(dbError,'Файл видалено зі сховища, але запис у базі не видалено'));toast('Файл видалено');await refreshClientCabinet();await refreshAstrologerMaterials()}
window.removeMaterial=removeMaterial;
async function downloadMaterial(id){const m=await getMaterial(id);if(!m)return toast('Файл не знайдено');const {data,error}=await sb.storage.from(STORAGE_BUCKET).download(m.storage_path);if(error)return toast(friendlyError(error,'Не вдалося завантажити файл'));const u=URL.createObjectURL(data),a=document.createElement('a');a.href=u;a.download=m.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
window.downloadMaterial=downloadMaterial;
async function signedUrl(m,expires=600){if(!m)return null;const {data,error}=await sb.storage.from(STORAGE_BUCKET).createSignedUrl(m.storage_path,expires);if(error){console.error(error);return null}return data?.signedUrl||null}

async function refreshClientCabinet(){
  updateAccessUI();const client=getActiveClient();if(!currentUser||!client){if($('#clientMaterialCount'))$('#clientMaterialCount').textContent='0';return}
  if($('#clientCabinetName'))$('#clientCabinetName').textContent=client.name;
  const rows=await materialsForActiveClient();if($('#clientMaterialCount'))$('#clientMaterialCount').textContent=rows.length;
  const grid=$('#clientFileGrid');if(grid){const visibleRows=clientMaterialFilter==='all'?rows:rows.filter(x=>x.type===clientMaterialFilter);grid.innerHTML=visibleRows.length?visibleRows.map(m=>`<article class="file-card"><div><small>${labelType(m.type)}</small><b title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</b><small>${fmtSize(m.size)}</small></div><div class="material-actions"><button class="btn ghost small icon-action" onclick="downloadMaterial('${m.id}')" aria-label="Завантажити ${escapeHtml(m.name)}"><span class="material-symbols-rounded" aria-hidden="true">download</span></button></div></article>`).join(''):`<div class="empty-soft">${rows.length?'У цій категорії матеріалів поки немає.':'Поки що тут порожньо. Астролог додасть матеріали у ваш кабінет.'}</div>`}
  const natal=rows.find(x=>x.type==='natal'),fore=rows.find(x=>x.type==='forecast');bindFeatured(natal,'natal');bindFeatured(fore,'forecast');
  const cons=rows.filter(x=>x.type==='consultation');if($('#clientConsultationCount'))$('#clientConsultationCount').textContent=cons.length;if($('#clientArchive'))$('#clientArchive').innerHTML=cons.length?cons.map(m=>`<div class="file-card"><b>${escapeHtml(m.name)}</b><small>${new Date(m.created_at).toLocaleDateString('uk-UA')} • ${fmtSize(m.size)}</small><div class="material-actions"><button class="btn ghost small" onclick="downloadMaterial('${m.id}')"><span class="material-symbols-rounded" aria-hidden="true">download</span> Завантажити</button></div></div>`).join(''):'<div class="empty-soft">Після консультацій тут з\'являться матеріали.</div>';
}
async function refreshAstrologerMaterials(){const list=$('#astrologerMaterialList');if(!list)return;if(!currentUser||!isAstrologer){list.innerHTML='';return}const client=getActiveClient();if($('#uploadClientName'))$('#uploadClientName').textContent=client?.name||'—';if(!client){list.innerHTML='<div class="empty-soft">Спочатку додайте клієнта.</div>';if($('#astrologerMaterialCount'))$('#astrologerMaterialCount').textContent='0 файлів';if($('#astroFileCount'))$('#astroFileCount').textContent='0';return}const rows=await materialsForActiveClient();if($('#astrologerMaterialCount'))$('#astrologerMaterialCount').textContent=rows.length+' '+(rows.length===1?'файл':'файлів');if($('#astroFileCount'))$('#astroFileCount').textContent=rows.length;list.innerHTML=rows.length?rows.map(m=>`<article class="astrologer-material-row"><div class="material-file-icon">${fileIcon(m.name)}</div><div class="material-main"><b title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</b><small>${labelType(m.type)} • ${fmtSize(m.size)} • ${new Date(m.created_at).toLocaleDateString('uk-UA')}</small></div><div class="material-actions"><button class="btn ghost small icon-action" onclick="downloadMaterial('${m.id}')" title="Завантажити" aria-label="Завантажити ${escapeHtml(m.name)}"><span class="material-symbols-rounded" aria-hidden="true">download</span></button><button class="btn danger small delete-file-btn" onclick="removeMaterial('${m.id}')" title="Видалити файл">Видалити</button></div></article>`).join(''):'<div class="empty-soft">Для цього клієнта файлів ще немає.</div>'}
$$('[data-material-filter]').forEach(btn=>btn.addEventListener('click',()=>{clientMaterialFilter=btn.dataset.materialFilter;$$('[data-material-filter]').forEach(x=>x.classList.toggle('active',x===btn));refreshClientCabinet()}));
async function renderNatalPreview(m){const box=$('#natalPreview');if(!box)return;if(!m){box.innerHTML='<div class="natal-placeholder"><div class="mini-wheel big"></div><small>Після завантаження натальної карти тут зʼявиться її превʼю</small></div>';return}const url=await signedUrl(m,600);if(!url){box.innerHTML=`<div class="natal-placeholder"><div class="mini-wheel big"></div><small>${escapeHtml(m.name)}</small></div>`;return}const type=(m.mime_type||'').toLowerCase(),ext=String(m.name||'').split('.').pop().toLowerCase();if(type.startsWith('image/')||['png','jpg','jpeg','webp'].includes(ext))box.innerHTML=`<img class="natal-preview-image" src="${escapeHtml(url)}" alt="Натальна карта">`;else if(type==='application/pdf'||ext==='pdf')box.innerHTML=`<div class="natal-pdf-preview"><iframe src="${escapeHtml(url)}#toolbar=0&navpanes=0&scrollbar=0" title="Превʼю натальної карти"></iframe><div class="pdf-preview-fallback"><b>Натальна карта PDF</b><small>${escapeHtml(m.name)}</small><button class="btn ghost small" onclick="downloadMaterial('${m.id}')">Відкрити / завантажити</button></div></div>`;else box.innerHTML=`<div class="natal-placeholder"><div class="mini-wheel big"></div><small>${escapeHtml(m.name)}</small></div>`}
function bindFeatured(m,kind){const isNatal=kind==='natal',status=$(isNatal?'#clientNatalStatus':'#clientForecastStatus'),btn=$(isNatal?'#downloadNatal':'#downloadForecast');if(!status||!btn)return;if(m){status.textContent=`${m.name} • ${fmtSize(m.size)}`;btn.disabled=false;btn.onclick=()=>downloadMaterial(m.id);if(isNatal)renderNatalPreview(m)}else{status.textContent=isNatal?'Файл ще не завантажений':'Очікує на завантаження';btn.disabled=true;btn.onclick=null;if(isNatal)renderNatalPreview(null)}}
const upload=$('#materialUpload'),dz=$('.dropzone');if(upload&&dz){upload.addEventListener('change',()=>handleFiles(upload.files));['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>handleFiles(e.dataTransfer.files))}
function mimeFromName(name=''){const ext=name.toLowerCase().split('.').pop();return({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp3:'audio/mpeg',mp4:'video/mp4'})[ext]||''}
function safeFileName(name='file'){return String(name).normalize('NFKC').replace(/[\\/\0]/g,'-').replace(/[^\p{L}\p{N}._()\- ]/gu,'_').replace(/\s+/g,' ').trim().slice(0,180)||'file'}
async function handleFiles(files){if(!sb||!isAstrologer)return toast('Завантажувати файли може лише астролог');const client=getActiveClient();if(!client)return toast('Спочатку додайте клієнта');const type=$('#materialType')?.value||'general';let ok=0,failed=0;for(const f of files){try{if(f.size<=0||f.size>50*1024*1024)throw new Error('Файл має бути не більшим за 50 MB');const mime=f.type||mimeFromName(f.name);if(!mime)throw new Error('Непідтримуваний формат файлу');const uuid=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;const path=`${client.id}/${uuid}-${safeFileName(f.name)}`;const {error:upErr}=await sb.storage.from(STORAGE_BUCKET).upload(path,f,{cacheControl:'3600',upsert:false,contentType:mime});if(upErr)throw upErr;const {error:dbErr}=await sb.from('materials').insert({client_id:client.id,name:f.name,type,storage_path:path,mime_type:mime,size:f.size});if(dbErr){await sb.storage.from(STORAGE_BUCKET).remove([path]);throw dbErr}ok++}catch(err){failed++;console.error(err)}}if(upload)upload.value='';await refreshClientCabinet();await refreshAstrologerMaterials();toast(failed?`Завантажено: ${ok}. Не вдалося: ${failed}`:`Додано файлів: ${ok}`)}

// ---------- per-client notes ----------
async function loadActiveNote(){const notes=$('#clientNotes');if(!notes)return;if(!sb||!isAstrologer||!getActiveClientId()){notes.value='';return}const {data,error}=await sb.from('client_notes').select('content,updated_at').eq('client_id',getActiveClientId()).maybeSingle();if(error){console.error(error);return}notes.value=data?.content||'';if($('#saveNoteStatus'))$('#saveNoteStatus').textContent=data?.updated_at?'Збережено '+new Date(data.updated_at).toLocaleString('uk-UA'):'Нотаток ще немає'}
$('#saveNotes')?.addEventListener('click',async()=>{const notes=$('#clientNotes');if(!notes||!sb||!isAstrologer)return toast('Потрібен доступ астролога');const clientId=getActiveClientId();if(!clientId)return toast('Спочатку додайте клієнта');const updated_at=new Date().toISOString();const {error}=await sb.from('client_notes').upsert({client_id:clientId,content:notes.value,updated_at},{onConflict:'client_id'});if(error)return toast(friendlyError(error,'Не вдалося зберегти нотатку'));if($('#saveNoteStatus'))$('#saveNoteStatus').textContent='Збережено щойно';toast('Нотатку збережено')});

// ---------- PDF ----------
$('#makePdf')?.addEventListener('click',()=>{const client=getActiveClient();if(!client)return toast('Спочатку оберіть клієнта');const title=$('#reportTitle')?.value.trim()||'Персональний прогноз',period=$('#reportPeriod')?.value.trim()||'',txt=$('#reportText')?.value.trim()||'Додайте текст прогнозу перед створенням PDF.';if($('#printTitle'))$('#printTitle').textContent=title+' — '+client.name;if($('#printPeriod'))$('#printPeriod').textContent=period;if($('#printText'))$('#printText').textContent=txt;if($('#printDate'))$('#printDate').textContent=new Date().toLocaleDateString('uk-UA');setTimeout(()=>window.print(),80)});

// ---------- ephemerides ----------
let ephem=[];
const required=['planet','event','start_date','end_date','sign','notes'];
function normalize(o){const x={};required.forEach(k=>x[k]=String(o[k]??'').trim());return x}
function toDbEphem(r){return {planet:r.planet,event:r.event||'',start_date:r.start_date||null,end_date:r.end_date||null,sign:r.sign||'',notes:r.notes||''}}
function validateEphemerisRows(rows){
  if(!rows.length)throw new Error('Файл не містить записів');
  for(const [i,r] of rows.entries()){
    if(!r.planet)throw new Error(`Рядок ${i+2}: не вказано planet`);
    for(const key of ['start_date','end_date']){
      if(!r[key])continue;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(r[key]))throw new Error(`Рядок ${i+2}: ${key} має бути у форматі YYYY-MM-DD`);
      const year=Number(r[key].slice(0,4));
      if(year>2050)throw new Error(`Рядок ${i+2}: дата пізніше 2050 року`);
    }
    if(r.start_date&&r.end_date&&r.end_date<r.start_date)throw new Error(`Рядок ${i+2}: end_date раніше start_date`);
  }
}
async function refreshEphemerides(){
  const input=$('#ephemerisImport');if(input)input.disabled=!isAstrologer;
  if(!sb||!currentUser||!isAstrologer){ephem=[];populateFilters();renderEphem(true);return}
  const {data,error}=await sb.from('ephemerides').select('id,planet,event,start_date,end_date,sign,notes').order('start_date',{ascending:true});
  if(error){console.error(error);ephem=[];populateFilters();renderEphem(false,'Не вдалося завантажити базу ефемерид');return}
  ephem=(data||[]).map(normalize);populateFilters();renderEphem();
}
async function deleteEphemerisIds(ids){for(let i=0;i<ids.length;i+=300){const {error}=await sb.from('ephemerides').delete().in('id',ids.slice(i,i+300));if(error)throw error}}
async function replaceEphemerides(rows){
  const {data:old,error:oldError}=await sb.from('ephemerides').select('id');if(oldError)throw oldError;
  const oldIds=(old||[]).map(x=>x.id),newIds=[];
  try{
    for(let i=0;i<rows.length;i+=300){const chunk=rows.slice(i,i+300).map(toDbEphem);const {data,error}=await sb.from('ephemerides').insert(chunk).select('id');if(error)throw error;newIds.push(...(data||[]).map(x=>x.id))}
  }catch(err){try{if(newIds.length)await deleteEphemerisIds(newIds)}catch{}throw err}
  try{if(oldIds.length)await deleteEphemerisIds(oldIds)}catch(err){console.error('Old ephemerides cleanup failed',err);toast('Нову базу імпортовано, але старі записи не вдалося повністю очистити')}
}
$('#ephemerisImport')?.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  if(!sb||!currentUser||!isAstrologer){e.target.value='';return toast('Імпортувати ефемериди може лише Вікторія')}
  try{
    const txt=await f.text();let rows;
    if(f.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(txt);rows=Array.isArray(parsed)?parsed:(parsed.rows||[])}else rows=parseCSV(txt);
    rows=rows.map(normalize).filter(r=>r.planet||r.event||r.start_date||r.end_date||r.sign||r.notes);
    validateEphemerisRows(rows);
    await replaceEphemerides(rows);
    await refreshEphemerides();
    toast('Імпортовано '+rows.length+' записів у Supabase');
  }catch(err){console.error(err);toast(friendlyError(err,'Не вдалося імпортувати ефемериди'))}
  finally{e.target.value=''}
});
function parseCSV(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(!lines.length)return[];
  const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='\"'){if(q&&line[i+1]==='\"'){cur+='\"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out};
  const head=parseLine(lines[0]).map(x=>x.trim());
  return lines.slice(1).map(l=>{const vals=parseLine(l),o={};head.forEach((h,i)=>o[h]=vals[i]??'');return o})
}
function populateFilters(){
  const p=$('#ephemPlanet'),y=$('#ephemYear');if(!p||!y)return;
  const planets=[...new Set(ephem.map(x=>x.planet).filter(Boolean))].sort();
  p.innerHTML='<option value="">Усі планети</option>'+planets.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  const years=[...new Set(ephem.flatMap(x=>[x.start_date?.slice(0,4),x.end_date?.slice(0,4)]).filter(v=>/^20\d\d$/.test(v)))].sort();
  y.innerHTML='<option value="">Усі роки</option>'+years.map(v=>`<option>${v}</option>`).join('')
}
function renderEphem(locked=false,errorText=''){
  const body=$('#ephemBody');if(!body)return;
  const q=($('#ephemSearch')?.value||'').toLowerCase(),p=$('#ephemPlanet')?.value||'',y=$('#ephemYear')?.value||'';
  const rows=ephem.filter(r=>{const hay=Object.values(r).join(' ').toLowerCase();return(!q||hay.includes(q))&&(!p||r.planet===p)&&(!y||r.start_date.startsWith(y)||r.end_date.startsWith(y))});
  if($('#ephemCount'))$('#ephemCount').textContent=locked?'Приватний розділ':rows.length+' записів';
  if(locked){body.innerHTML='<tr><td colspan="6"><div class="empty-state"><span>✦</span><b>Робочий інструмент астролога</b><p>Ефемериди доступні після входу в кабінет Вікторії.</p></div></td></tr>';return}
  if(errorText){body.innerHTML=`<tr><td colspan="6"><div class="empty-state"><span>✦</span><b>Помилка завантаження</b><p>${escapeHtml(errorText)}</p></div></td></tr>`;return}
  body.innerHTML=rows.length?rows.map(r=>`<tr><td><b>${escapeHtml(r.planet)}</b></td><td>${escapeHtml(r.event)}</td><td>${escapeHtml(r.start_date)}</td><td>${escapeHtml(r.end_date)}</td><td>${escapeHtml(r.sign)}</td><td>${escapeHtml(r.notes)}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty-state"><span>✦</span><b>${ephem.length?'Нічого не знайдено':'База ще не імпортована'}</b><p>${ephem.length?'Змініть пошук або фільтри.':'Вікторія може один раз імпортувати перевірений CSV або JSON — база збережеться у Supabase і буде доступна з різних пристроїв.'}</p></div></td></tr>`
}
['#ephemSearch','#ephemPlanet','#ephemYear'].forEach(s=>$(s)?.addEventListener(s==='#ephemSearch'?'input':'change',()=>renderEphem(!isAstrologer)));
populateFilters();renderEphem(true);
$('#downloadTemplate')?.addEventListener('click',()=>{const csv='planet,event,start_date,end_date,sign,notes\n',blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ephemerides_template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)});

injectAuthUI();
const initial=(location.hash||'#home').slice(1);if($('#view-'+initial))route(initial);
initSupabase();
