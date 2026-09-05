(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PROFILE_KEY='viktoria-client-discovery-profile';

  // Ephemerides are a private astrologer tool, not a client-facing navigation item.
  $$('.topbar [data-route="ephemeris"], #mobileNav [data-route="ephemeris"]').forEach(el=>el.hidden=true);

  const clientView=$('#view-client');
  if(!clientView||$('#clientDiscovery'))return;
  const anchor=$('.cabinet-summary',clientView)||$('.client-grid',clientView);
  if(!anchor)return;

  const section=document.createElement('section');
  section.id='clientDiscovery';
  section.className='shell client-discovery';
  section.hidden=true;
  section.innerHTML=`
    <div class="discovery-grid">
      <article class="discovery-card">
        <div class="discovery-kicker">ТВІЙ АСТРОПОРТРЕТ</div>
        <h3>Почнемо з тебе</h3>
        <p>Введи базові дані — і відкриється перший шар твого астрологічного портрета. Це ще не натальна карта, але вже дещо дуже впізнаване.</p>
        <div class="discovery-form">
          <label>Ім’я<input id="astroFirstName" autocomplete="given-name" placeholder="Як до тебе звертатися"></label>
          <label>Дата народження<input id="astroBirthDate" type="date"></label>
          <label>Час народження<input id="astroBirthTime" type="time"></label>
          <label class="wide">Місто народження<input id="astroBirthPlace" placeholder="Наприклад, Херсон, Україна"></label>
        </div>
        <div class="discovery-form-actions">
          <button class="btn primary small" id="revealAstroProfile">Показати мій портрет</button>
          <span class="discovery-note">Точний час і місце знадобляться Вікторії для повного розбору.</span>
        </div>
        <div class="astro-profile" id="astroProfile"></div>
      </article>

      <div class="discovery-side">
        <article class="discovery-card tarot-card-day">
          <div class="discovery-kicker">КАРТА ТАРО ДНЯ</div>
          <h3 id="tarotTitle">Твоя карта сьогодні</h3>
          <p id="tarotMeaning">Відкрий свій астропортрет — і карта дня налаштується під твою дату.</p>
          <span class="tarot-card-name" id="tarotName">✦ VIKTORIA ASTROSTAR</span>
        </article>
        <article class="discovery-card daily-guidance">
          <div class="guidance-icon">☼</div>
          <div class="discovery-kicker">ПОРАДА ДНЯ</div>
          <h3 id="guidanceTitle">Не поспішай із відповіддю</h3>
          <p id="guidanceText">Сьогодні корисніше помітити власну реакцію, ніж одразу діяти з неї.</p>
        </article>
      </div>

      <article class="discovery-card mystery-cta">
        <div>
          <div class="discovery-kicker">А ЦЕ ЛИШЕ ВЕРХІВКА</div>
          <h3>Твій знак — це не вся ти.</h3>
          <p id="mysteryCopy">Сонце показує важливу частину характеру. Але те, як ти кохаєш, реагуєш на стрес, будуєш стосунки, заробляєш і проходиш зміни, часто читається зовсім в інших точках карти.</p>
          <div class="mystery-list"><span>Місяць — емоційні потреби</span><span>Асцендент — як ти входиш у світ</span><span>Венера — кохання й цінності</span><span>Марс — бажання й спосіб дії</span></div>
        </div>
        <div class="cta-box">
          <small>Повний розбір починається там, де загальний опис закінчується. Вікторія збирає карту цілісно — з точним часом, місцем народження й твоїм реальним запитом.</small>
          <a class="btn primary" href="https://instagram.com/viktoria_astrostar" target="_blank" rel="noopener">Хочу розбір у Вікторії</a>
        </div>
      </article>
    </div>`;
  anchor.before(section);

  const signs=[
    {name:'Козоріг',symbol:'♑',element:'Земля',mode:'Кардинальний',gift:'структура і витримка',shadow:'нести все на собі',text:'Ти схильна серйозно ставитися до того, що для інших може бути просто ідеєю. Твоя сила — перетворювати намір на результат і не розмінюватися на випадкове.'},
    {name:'Водолій',symbol:'♒',element:'Повітря',mode:'Фіксований',gift:'незалежне мислення',shadow:'віддалятися, коли занадто тісно',text:'Тобі важливо мати власний погляд і простір для нього. Ти часто помічаєш те, до чого інші доходять пізніше, але не любиш, коли тебе намагаються втиснути в готову роль.'},
    {name:'Риби',symbol:'♓',element:'Вода',mode:'Мутабельний',gift:'інтуїція й уява',shadow:'розчиняти власні межі',text:'Ти тонко зчитуєш атмосферу, людей і підтексти. У твоїй чутливості багато сили — особливо коли вона поєднана з ясними межами й власним напрямком.'},
    {name:'Овен',symbol:'♈',element:'Вогонь',mode:'Кардинальний',gift:'сміливість починати',shadow:'діяти раніше, ніж відчути',text:'У тобі є природний імпульс рухати ситуацію з місця. Ти оживаєш, коли є виклик, свобода рішення й відчуття, що можна діяти без зайвого дозволу.'},
    {name:'Телець',symbol:'♉',element:'Земля',mode:'Фіксований',gift:'стійкість і відчуття цінності',shadow:'триматися за звичне довше, ніж треба',text:'Ти добре відчуваєш, що справді має вагу — у людях, речах, рішеннях і ресурсах. Твоя сила не в поспіху, а в здатності створити щось надійне й живе.'},
    {name:'Близнюки',symbol:'♊',element:'Повітря',mode:'Мутабельний',gift:'цікавість і швидкість мислення',shadow:'розпорошувати увагу',text:'Ти збираєш світ через інформацію, розмови й нові зв’язки між речами. Тобі важливо, щоб життя не ставало надто передбачуваним — розум має чимось дихати.'},
    {name:'Рак',symbol:'♋',element:'Вода',mode:'Кардинальний',gift:'емоційна пам’ять і турбота',shadow:'захищатися ще до реальної загрози',text:'Ти добре відчуваєш, де твоє, а де чуже, навіть якщо не завжди одразу це формулюєш. Для тебе безпека — не слабкість, а база, з якої можна дуже далеко піти.'},
    {name:'Лев',symbol:'♌',element:'Вогонь',mode:'Фіксований',gift:'тепло, творчість і присутність',shadow:'болісно реагувати на невизнання',text:'Тобі важливо не просто існувати, а вкладати в життя себе. Коли ти дозволяєш собі бути видимою без потреби щось доводити, твоя присутність дуже природно збирає людей навколо.'},
    {name:'Діва',symbol:'♍',element:'Земля',mode:'Мутабельний',gift:'точність і здатність покращувати',shadow:'вимагати від себе неможливої чистоти',text:'Ти бачиш деталі, які інші пропускають, і майже автоматично шукаєш, як зробити краще. Твоя суперсила розкривається тоді, коли аналіз допомагає жити, а не замінює саме життя.'},
    {name:'Терези',symbol:'♎',element:'Повітря',mode:'Кардинальний',gift:'бачити кілька сторін одночасно',shadow:'відкладати вибір заради миру',text:'Ти тонко відчуваєш баланс між людьми, словами й атмосферою. Важливий урок для тебе — не втратити власний голос, поки ти так добре чуєш усіх інших.'},
    {name:'Скорпіон',symbol:'♏',element:'Вода',mode:'Фіксований',gift:'глибина й психологічна витривалість',shadow:'контролювати те, що страшно втратити',text:'Ти рідко задовольняєшся поверхнею. Коли щось для тебе справді важливе, ти йдеш у це глибоко — і саме тому здатна проходити трансформації, які для інших здаються занадто радикальними.'},
    {name:'Стрілець',symbol:'♐',element:'Вогонь',mode:'Мутабельний',gift:'сенс, масштаб і віра в рух',shadow:'тікати від обмежень раніше, ніж вони стали реальними',text:'Тобі потрібне відчуття горизонту — нова ідея, досвід, знання або напрямок. Ти найсильніша там, де свобода не просто втеча, а можливість жити ширше й чесніше.'}
  ];
  const tarot=[
    ['Маг','День про дію з того, що вже є під рукою. Не чекай ідеальних умов — подивись, який ресурс ти недооцінюєш.'],
    ['Верховна Жриця','Не вся відповідь сьогодні приходить словами. Зверни увагу на повторювані відчуття, сни й тихе “я вже знаю”.'],
    ['Імператриця','Підживи те, що хочеш бачити більшим: тіло, творчість, стосунки, гроші або власну самоцінність.'],
    ['Колесо Фортуни','Не все потребує контролю. День може показати поворот, який стане зрозумілим трохи пізніше.'],
    ['Сила','М’якість сьогодні може бути сильнішою за тиск. Не ламай ситуацію — утримай власний центр.'],
    ['Відлюдник','Відповідь може з’явитися не в новій пораді, а в тиші після всіх порад. Дай собі простір почути себе.'],
    ['Закохані','День підсвічує вибір за цінностями. Питай не “що правильно?”, а “з чим я справді хочу бути в згоді?”.'],
    ['Зірка','Повернися до того, що дає відчуття перспективи. Маленька надія сьогодні важливіша за великий план без внутрішнього “так”.'],
    ['Місяць','Не поспішай називати страх фактом. Сьогодні особливо важливо відрізняти інтуїцію від тривожної фантазії.'],
    ['Сонце','День просить простоти й видимості. Покажи те, чим пишаєшся, або дозволь собі радість без пояснень.'],
    ['Суд','Щось старе просить нового рішення. Не обов’язково повертатися назад — можливо, варто нарешті відповісти інакше.'],
    ['Світ','Подивись, що вже завершено, хоча ти ще психологічно тримаєш це відкритим. Завершення теж створює енергію.']
  ];
  const guidance={
    'Козоріг':'Не перетворюй кожну задачу на іспит на витривалість. Обери сьогодні одну річ, яку можна зробити простіше.',
    'Водолій':'Не віддаляйся автоматично лише тому, що хтось підійшов ближче. Перевір: це справді тиск чи просто контакт?',
    'Риби':'Перед тим як допомогти іншому, запитай себе, чи є в тебе на це ресурс. Межа сьогодні збереже більше любові, ніж самопожертва.',
    'Овен':'Дай першому імпульсу десять хвилин. Якщо бажання залишиться — дій сміливо, але вже не реактивно.',
    'Телець':'Перевір, що ти зберігаєш через цінність, а що — лише через звичку. Це різні речі.',
    'Близнюки':'Не відкривай ще п’ять вкладок у житті. Одна завершена думка сьогодні дасть більше, ніж десять цікавих початків.',
    'Рак':'Не вгадуй за інших, що вони відчувають. Одне пряме питання може зняти історію, яку ти вже встигла побудувати в голові.',
    'Лев':'Не чекай зовнішнього підтвердження того, що тобі вже подобається в собі. Сьогодні дозволь собі бути авторкою оцінки.',
    'Діва':'Замість “як зробити ідеально?” запитай “що реально покращить результат?”. Це звільнить багато енергії.',
    'Терези':'Мир, куплений ціною власного “ні”, дорого коштує. Сьогодні одна чесна межа може зробити стосунки чистішими.',
    'Скорпіон':'Не все невідоме є небезпечним. Спробуй сьогодні не добудовувати прихований мотив там, де ще недостатньо фактів.',
    'Стрілець':'Новий горизонт привабливий, але перевір, чи не тікаєш ти від важливої розмови або завершення.'
  };

  function signFromDate(value){
    if(!value)return null;const d=new Date(value+'T12:00:00');if(Number.isNaN(d.getTime()))return null;const m=d.getMonth()+1,day=d.getDate();
    let i;if((m===12&&day>=22)||(m===1&&day<=19))i=0;else if((m===1&&day>=20)||(m===2&&day<=18))i=1;else if((m===2&&day>=19)||(m===3&&day<=20))i=2;else if((m===3&&day>=21)||(m===4&&day<=19))i=3;else if((m===4&&day>=20)||(m===5&&day<=20))i=4;else if((m===5&&day>=21)||(m===6&&day<=20))i=5;else if((m===6&&day>=21)||(m===7&&day<=22))i=6;else if((m===7&&day>=23)||(m===8&&day<=22))i=7;else if((m===8&&day>=23)||(m===9&&day<=22))i=8;else if((m===9&&day>=23)||(m===10&&day<=22))i=9;else if((m===10&&day>=23)||(m===11&&day<=21))i=10;else i=11;return {...signs[i],index:i};
  }
  function dailyTarot(signIndex=0){const n=new Date(),key=Number(`${n.getFullYear()}${String(n.getMonth()+1).padStart(2,'0')}${String(n.getDate()).padStart(2,'0')}`);return tarot[(key+signIndex*7)%tarot.length]}
  function saveProfile(){const p={name:$('#astroFirstName')?.value.trim()||'',birth:$('#astroBirthDate')?.value||'',time:$('#astroBirthTime')?.value||'',place:$('#astroBirthPlace')?.value.trim()||''};localStorage.setItem(PROFILE_KEY,JSON.stringify(p));return p}
  function renderProfile(p,quiet=false){
    const s=signFromDate(p.birth);if(!s){if(!quiet&&window.toast)window.toast('Вкажи дату народження');else if(!quiet)alert('Вкажи дату народження');return}
    const name=p.name?`, ${esc(p.name)}`:'';
    $('#astroProfile').innerHTML=`<div class="astro-sign-row"><div class="astro-sign-symbol">${s.symbol}</div><div><small>ТВОЄ СОНЦЕ</small><b>${s.name}${name}</b><small>${s.element} • ${s.mode}</small></div></div><p>${s.text}</p><div class="astro-profile-points"><div><small>ТВОЯ СИЛА</small><b>${s.gift}</b></div><div><small>ЩО ВАРТО ПОМІЧАТИ</small><b>${s.shadow}</b></div><div><small>ПЕРШИЙ ШАР</small><b>Сонячний знак — не вся натальна карта</b></div></div>`;
    $('#astroProfile').classList.add('show');
    const [card,meaning]=dailyTarot(s.index);$('#tarotTitle').textContent=card;$('#tarotMeaning').textContent=meaning;$('#tarotName').textContent=`${s.symbol} ${s.name} • карта дня`;
    $('#guidanceTitle').textContent=`Для ${s.name} сьогодні`;$('#guidanceText').textContent=guidance[s.name];
    $('#mysteryCopy').textContent=`Твоє Сонце в ${s.name} уже впізнаване. Але Місяць, Асцендент, Венера, Марс і будинки можуть суттєво змінити історію — саме тому люди з одним знаком бувають такими різними.`;
  }
  try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');if(p){$('#astroFirstName').value=p.name||'';$('#astroBirthDate').value=p.birth||'';$('#astroBirthTime').value=p.time||'';$('#astroBirthPlace').value=p.place||'';if(p.birth)renderProfile(p,true)}}catch{}
  $('#revealAstroProfile')?.addEventListener('click',()=>renderProfile(saveProfile()));

  const gate=$('#clientAuthGate');
  const logout=$('#logoutBtn');
  const head=$('.dashboard-head',clientView);
  if(head)head.classList.remove('supabase-private');
  const syncVisibility=()=>{
    const signedIn=!!logout&&!logout.hidden;
    section.hidden=!signedIn;
    if(head)head.hidden=!signedIn;
    if(signedIn&&gate&&!gate.hidden)gate.hidden=true;
  };
  syncVisibility();
  if(logout)new MutationObserver(syncVisibility).observe(logout,{attributes:true,attributeFilter:['hidden']});
  if(gate)new MutationObserver(syncVisibility).observe(gate,{attributes:true,attributeFilter:['hidden']});
})();
