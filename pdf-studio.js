(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const studio=$('.forecast-builder');
  if(!studio)return;

  // Ephemerides are no longer part of the product UI.
  $$('[data-route="ephemeris"]').forEach(el=>el.remove());
  $('#view-ephemeris')?.remove();
  const astroIntro=$('#view-astrologer .dashboard-intro p');
  if(astroIntro)astroIntro.textContent='Клієнти, нотатки, готові карти, прогнози та красиві PDF-розбори — без зайвої рутини.';
  const oldHeaderAction=$('#view-astrologer .dashboard-contact');
  if(oldHeaderAction){
    oldHeaderAction.removeAttribute('data-route');
    oldHeaderAction.innerHTML='PDF-студія <span class="material-symbols-rounded" aria-hidden="true">arrow_downward</span>';
    oldHeaderAction.addEventListener('click',()=>studio.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  studio.classList.add('pdf-studio-panel');
  studio.innerHTML=`
    <div class="panel-title pdf-studio-title">
      <div><small>ОФОРМЛЕННЯ БЕЗ ВЕРСТКИ</small><h3>PDF-студія Вікторії</h3><p>Вставте готовий розбір, оберіть стиль — платформа сама оформить документ.</p></div>
      <span class="tag"><span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span> PDF</span>
    </div>
    <div class="pdf-studio-grid">
      <div class="pdf-studio-controls">
        <div class="builder-grid pdf-fields">
          <label>Заголовок<input id="pdfStudioTitle" value="Персональний астрологічний розбір" /></label>
          <label>Підзаголовок / період<input id="pdfStudioPeriod" placeholder="Наприклад: Натальна карта • 2026" /></label>
          <label class="full">Текст розбору<textarea id="pdfStudioText" rows="18" placeholder="Вставте сюди готовий текст розбору.\n\nМожна використовувати підзаголовки окремими рядками, маркери • або -, звичайні абзаци."></textarea></label>
        </div>
        <div class="pdf-style-label">Стиль документа</div>
        <div class="pdf-style-picker" role="radiogroup" aria-label="Стиль PDF">
          <button class="pdf-style-option active" type="button" data-pdf-style="ivory"><span class="style-swatch style-ivory"></span><b>Ivory Gold</b><small>світлий • преміальний</small></button>
          <button class="pdf-style-option" type="button" data-pdf-style="cosmic"><span class="style-swatch style-cosmic"></span><b>Cosmic Night</b><small>темний • атмосферний</small></button>
          <button class="pdf-style-option" type="button" data-pdf-style="minimal"><span class="style-swatch style-minimal"></span><b>Minimal</b><small>чистий • редакційний</small></button>
        </div>
        <div class="pdf-studio-actions">
          <button class="btn ghost" id="pdfStudioPreviewBtn" type="button"><span class="material-symbols-rounded" aria-hidden="true">visibility</span> Оновити прев’ю</button>
          <button class="btn primary" id="pdfStudioDownloadBtn" type="button"><span class="material-symbols-rounded" aria-hidden="true">download</span> Завантажити PDF</button>
        </div>
        <div class="pdf-studio-hint">Активний клієнт: <b id="pdfStudioClientName">—</b>. Ім’я автоматично потрапить на титульну сторінку.</div>
      </div>
      <div class="pdf-preview-shell">
        <div class="pdf-preview-toolbar"><span>Живе прев’ю</span><small>A4 • VIKTORIA ASTROSTAR</small></div>
        <div class="pdf-preview-stage"><div id="pdfStudioPreview" class="pdf-doc theme-ivory pdf-preview-doc"></div></div>
      </div>
    </div>`;

  let activeStyle='ivory';
  const titleInput=$('#pdfStudioTitle'), periodInput=$('#pdfStudioPeriod'), textInput=$('#pdfStudioText');
  const preview=$('#pdfStudioPreview'), clientLabel=$('#pdfStudioClientName');

  function activeClient(){
    try{if(typeof getActiveClient==='function')return getActiveClient()}catch{}
    const name=$('#uploadClientName')?.textContent?.trim();
    return name&&name!=='—'?{name}:null;
  }
  function clientName(){return activeClient()?.name?.trim()||'Клієнт'}
  function safeFilePart(v){return String(v||'').normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu,'_').replace(/^_+|_+$/g,'').slice(0,80)||'document'}
  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function richText(raw){
    const lines=String(raw||'').replace(/\r/g,'').split('\n');
    let html='',list=[];
    const flush=()=>{if(list.length){html+='<ul>'+list.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';list=[]}};
    for(const rawLine of lines){
      const line=rawLine.trim();
      if(!line){flush();continue}
      if(/^[-•]\s+/.test(line)){list.push(line.replace(/^[-•]\s+/,''));continue}
      flush();
      if(/^###\s+/.test(line))html+=`<h3>${esc(line.replace(/^###\s+/,''))}</h3>`;
      else if(/^##?\s+/.test(line))html+=`<h2>${esc(line.replace(/^##?\s+/,''))}</h2>`;
      else if(line.length<=72&&/:$/.test(line))html+=`<h3>${esc(line.replace(/:$/,''))}</h3>`;
      else html+=`<p>${esc(line)}</p>`;
    }
    flush();
    return html||'<p class="pdf-empty-copy">Вставте текст розбору — тут з’явиться оформлений документ.</p>';
  }

  function docHtml(){
    const title=titleInput.value.trim()||'Персональний астрологічний розбір';
    const period=periodInput.value.trim();
    const name=clientName();
    const date=new Date().toLocaleDateString('uk-UA');
    return `
      <div class="pdf-cover-mark" aria-hidden="true">✦</div>
      <header class="pdf-brand"><span class="pdf-monogram">VA</span><div><b>VIKTORIA ASTROSTAR</b><small>персональна астрологія</small></div></header>
      <section class="pdf-cover">
        <div class="pdf-kicker">ПЕРСОНАЛЬНО ДЛЯ ВАС</div>
        <h1>${esc(title)}</h1>
        <div class="pdf-client">${esc(name)}</div>
        ${period?`<div class="pdf-period">${esc(period)}</div>`:''}
      </section>
      <div class="pdf-divider"><span>✦</span></div>
      <main class="pdf-content">${richText(textInput.value)}</main>
      <footer class="pdf-footer"><span>VIKTORIA ASTROSTAR</span><span>${esc(date)}</span></footer>`;
  }

  function updatePreview(){
    const name=clientName();if(clientLabel)clientLabel.textContent=name;
    preview.className=`pdf-doc theme-${activeStyle} pdf-preview-doc`;
    preview.innerHTML=docHtml();
  }

  $$('[data-pdf-style]',studio).forEach(btn=>btn.addEventListener('click',()=>{
    activeStyle=btn.dataset.pdfStyle;
    $$('[data-pdf-style]',studio).forEach(x=>x.classList.toggle('active',x===btn));
    updatePreview();
  }));
  $('#pdfStudioPreviewBtn')?.addEventListener('click',updatePreview);
  [titleInput,periodInput,textInput].forEach(el=>el?.addEventListener('input',()=>{clearTimeout(window.__pdfPreviewTimer);window.__pdfPreviewTimer=setTimeout(updatePreview,180)}));

  async function downloadPdf(){
    const text=textInput.value.trim();
    if(!text){if(typeof toast==='function')toast('Вставте текст розбору');else alert('Вставте текст розбору');return}
    if(typeof html2pdf!=='function'){if(typeof toast==='function')toast('PDF-модуль ще завантажується. Спробуйте ще раз за секунду.');return}
    const btn=$('#pdfStudioDownloadBtn');if(btn){btn.disabled=true;btn.dataset.label=btn.innerHTML;btn.innerHTML='<span class="material-symbols-rounded">hourglass_top</span> Створюю PDF…'}
    const exportDoc=document.createElement('article');
    exportDoc.className=`pdf-doc theme-${activeStyle} pdf-export-doc`;
    exportDoc.innerHTML=docHtml();
    document.body.appendChild(exportDoc);
    const filename=`${safeFilePart(clientName())}_${safeFilePart(titleInput.value||'astro')}.pdf`;
    try{
      await html2pdf().set({
        margin:0,
        filename,
        image:{type:'jpeg',quality:.98},
        html2canvas:{scale:2,useCORS:true,backgroundColor:null,letterRendering:true},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
        pagebreak:{mode:['css','legacy'],avoid:['h2','h3','.pdf-brand','.pdf-footer']}
      }).from(exportDoc).save();
      if(typeof toast==='function')toast('PDF готовий');
    }catch(err){console.error(err);if(typeof toast==='function')toast('Не вдалося створити PDF');else alert('Не вдалося створити PDF')}
    finally{exportDoc.remove();if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.label||'Завантажити PDF'}}
  }
  $('#pdfStudioDownloadBtn')?.addEventListener('click',downloadPdf);

  const nameSource=$('#uploadClientName');
  if(nameSource)new MutationObserver(updatePreview).observe(nameSource,{childList:true,characterData:true,subtree:true});
  updatePreview();
})();
