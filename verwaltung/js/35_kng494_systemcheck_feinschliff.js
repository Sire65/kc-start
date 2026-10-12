/* KNG 49.6 – Systemcheck Fortschritt/Autostart-Protokoll
   - Fortschrittsbalken mit laufender Bewegung/Zeitzähler
   - Protokollgrenze + einstellbare Anzahl behalten
   - Dashboard-Systemstatus klickbar: öffnet Systemcheck und springt zur ersten Warnung/Fehler
   - ersetzt nur Systemcheck-Bindings, greift nicht in Uhr/Auto-Aus/Meldungskern ein
*/
(function(){
  'use strict';
  if(window.__KNG496_SYSTEMCHECK_FINE__) return;
  window.__KNG496_SYSTEMCHECK_FINE__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const REPORT_KEY = 'kng49_last_system_check_report';
  const PROTOCOL_KEY = 'kng_system_check_protocol_v491';
  const START_CHECK_KEY = 'kng49_systemcheck_on_start';
  const PROTOCOL_LIMIT_KEY = 'kng49_systemcheck_protocol_limit';
  const PROTOCOL_KEEP_KEY = 'kng49_systemcheck_protocol_keep';
  const COORD_KEY = 'kngOfficeIconCoordinates47_3';
  const GROUP_LABELS = {
    overview:'Übersicht', browser:'Browser & Anzeige', files:'Dateien & Ressourcen',
    data:'Speicher & Daten', runtime:'Timer & Meldungen', performance:'Leistung', diagnose:'Diagnose / Export'
  };
  let lastReport = null;
  let currentTab = 'overview';

  function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c)); }
  function two(n){ return String(n).padStart(2,'0'); }
  function stamp(d=new Date()){ return `${two(d.getDate())}.${two(d.getMonth()+1)}.${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`; }
  function userName(){ return window.state?.session?.userName || window.state?.currentUser?.name || 'Gast'; }
  function saveStateSafe(){ try{ if(typeof window.saveState === 'function') window.saveState(); }catch(_){} }
  function statusLabel(level){ return level === 'ok' ? '✅ OK' : (level === 'warn' ? '⚠️ Warnung' : '❌ Fehler'); }
  function add(list, group, check, level, details, help=''){ list.push({group, check, level, details:String(details ?? ''), help:String(help ?? '')}); }
  function canStorage(name){ try{ const s=window[name]; const k='__kng49_'+Math.random(); s.setItem(k,'1'); const ok=s.getItem(k)==='1'; s.removeItem(k); return ok; }catch(_){ return false; } }
  function browserName(){ const ua=navigator.userAgent||''; if(/Edg\//.test(ua)) return 'Microsoft Edge'; if(/OPR\//.test(ua)) return 'Opera'; if(/Chrome\//.test(ua)) return 'Google Chrome'; if(/Firefox\//.test(ua)) return 'Firefox'; if(/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'; if(/Trident|MSIE/.test(ua)) return 'Internet Explorer'; return 'Unbekannt'; }

  function readProtocol(){
    try{
      const st = window.state?.systemCheckProtocol;
      if(Array.isArray(st)) return st;
      return JSON.parse(localStorage.getItem(PROTOCOL_KEY) || '[]');
    }catch(_){ return []; }
  }
  function getLimit(){
    const v = Number(window.state?.settings?.systemCheckProtocolLimit || localStorage.getItem(PROTOCOL_LIMIT_KEY) || 50);
    return Math.max(10, Number.isFinite(v) ? v : 50);
  }
  function getKeep(){
    const v = Number(window.state?.settings?.systemCheckProtocolKeep || localStorage.getItem(PROTOCOL_KEEP_KEY) || 10);
    return Math.max(1, Number.isFinite(v) ? v : 10);
  }
  function saveProtocol(entry){
    window.state = window.state || {}; window.state.settings = window.state.settings || {};
    const limit = getLimit();
    const keep = Math.min(getKeep(), limit);
    let list = readProtocol();
    list.unshift(entry);
    if(list.length > limit){
      try{ window.toast?.(`Systemcheck-Protokollgrenze ${limit} überschritten. Es bleiben ${keep} Einträge erhalten.`, 'info'); }catch(_){}
      list = list.slice(0, keep);
    }
    window.state.systemCheckProtocol = list;
    try{ localStorage.setItem(PROTOCOL_KEY, JSON.stringify(list)); }catch(_){}
    saveStateSafe();
  }

  function setProgress(percent, text, elapsedMs, pulse){
    const summary = $('#systemCheckSummary'); if(!summary) return;
    const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
    const sec = (Math.max(0, elapsedMs||0)/1000).toFixed(1).replace('.', ',');
    const dots = '.'.repeat((pulse || 0) % 4);
    summary.className = 'check-summary running';
    summary.innerHTML = `<div class="kng-progress-wrap" aria-live="polite">
      <div class="kng-progress-info"><span>${esc(text || 'Systemcheck läuft')}${dots} · Dauer ${sec}s</span><strong>${p}%</strong></div>
      <div class="kng-progress-bar"><span style="width:${p}%"></span></div>
    </div>`;
  }

  function createProgressController(){
    const start = performance.now();
    const estimatedMs = 18000; // bewusst ruhig und gleichmäßig; echter Abschluss setzt sofort 100 %.
    let text = 'Systemcheck startet';
    let pulse = 0;
    let forcedMin = 0;
    const id = setInterval(() => {
      const elapsed = performance.now() - start;
      const linear = Math.min(96, (elapsed / estimatedMs) * 96);
      const display = Math.max(forcedMin, linear);
      pulse = (pulse + 1) % 4;
      setProgress(display, text, elapsed, pulse);
    }, 100);
    setProgress(0, text, 0, 0);
    return {
      step(p,t){
        if(t) text = t;
        // Nur Mindestmarke setzen, damit der Balken sichtbar weiterläuft und nicht sprunghaft stehen bleibt.
        forcedMin = Math.max(forcedMin, Math.min(96, Number(p)||0));
      },
      done(){ clearInterval(id); setProgress(100, 'Systemcheck abgeschlossen', performance.now()-start, 0); },
      stop(){ clearInterval(id); },
      elapsed(){ return performance.now() - start; }
    };
  }

  function imageProbe(url, timeout=1200){
    return new Promise(resolve=>{
      const img = new Image(); let done=false;
      const finish = ok => { if(done) return; done=true; resolve({url, ok, w:img.naturalWidth||0, h:img.naturalHeight||0}); };
      img.onload = () => finish(true); img.onerror = () => finish(false);
      setTimeout(()=>finish(false), timeout);
      img.src = url + (url.includes('?')?'&':'?') + 'sys=' + Date.now();
    });
  }
  function cssInfo(){
    const links = $$('link[rel="stylesheet"]').map(l => l.getAttribute('href') || '');
    let readable=0, blocked=0;
    try{ Array.from(document.styleSheets||[]).forEach(s=>{ try{ void s.cssRules; readable++; }catch(_){ blocked++; } }); }catch(_){ blocked++; }
    return {links, readable, blocked};
  }
  function timerProbe(){
    // Keine blockierende Kurzzeitmessung mehr im Systemcheck: frühere Messungen wurden durch den Check selbst verfälscht.
    return {diff:null, ok:true, details:'separater Kurztest deaktiviert – Präsentationskern 47.10 steuert Uhr und Auto-Aus'};
  }
  async function fpsProbe(){
    if(typeof requestAnimationFrame !== 'function') return {ok:false, details:'requestAnimationFrame nicht verfügbar'};
    const start = performance.now(); let frames=0;
    await new Promise(resolve=>{
      function step(){ frames++; if(frames>=12) resolve(); else requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
    const diff = Math.max(1, performance.now()-start);
    const fps = Math.round(frames/diff*1000);
    return {ok: fps>=25, details:`ca. ${fps} FPS (${frames} Frames in ${Math.round(diff)}ms)`};
  }
  function coordCheck(){
    try{
      const before = localStorage.getItem(COORD_KEY);
      const arr = before ? JSON.parse(before) : [];
      const marker = '__kng494_' + Date.now();
      const test = Array.isArray(arr) ? arr.slice() : [];
      test.push({id:marker, office:'test', object:'Systemcheck', x:77.7, y:22.2, size:24});
      localStorage.setItem(COORD_KEY, JSON.stringify(test));
      const reread = JSON.parse(localStorage.getItem(COORD_KEY) || '[]');
      const ok = Array.isArray(reread) && reread.some(r=>r.id===marker && Number(r.x)===77.7);
      if(before === null) localStorage.removeItem(COORD_KEY); else localStorage.setItem(COORD_KEY, before);
      const apply = typeof window.KNG_APPLY_OFFICE_COORDINATES === 'function';
      return {level: ok ? 'ok' : 'error', details:`Schreiben/Lesen ${ok?'OK':'Fehler'}, Anwenden ${apply?'OK':'über Standardkoordinaten aktiv'}, Einträge ${Array.isArray(arr)?arr.length:0}${Array.isArray(arr)&&arr.length===0?' – Standardkoordinaten aktiv':''}`};
    }catch(e){ return {level:'error', details:'Koordinaten-Test fehlgeschlagen: '+(e?.message||e)}; }
  }

  async function buildReport(progress){
    const checks=[]; const b=browserName(); const ua=navigator.userAgent||''; const css=cssInfo();
    const env = {createdAt:new Date().toISOString(), createdAtLocal:stamp(), user:userName(), browserName:b, userAgent:ua, language:navigator.language||'', platform:navigator.platform||'', protocol:location.protocol, href:location.href, viewport:`${innerWidth} x ${innerHeight}`, screen:`${screen.width} x ${screen.height}`, devicePixelRatio:window.devicePixelRatio||1, online:navigator.onLine, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||''};

    progress.step(6,'Browser und Anzeige prüfen');
    add(checks,'browser','Browser', b==='Internet Explorer'?'error':(['Microsoft Edge','Google Chrome'].includes(b)?'ok':'warn'), `${b} – ${ua}`, 'Edge oder Chrome empfohlen.');
    add(checks,'browser','JavaScript','ok','JavaScript wird ausgeführt.');
    add(checks,'browser','Protokoll / Startart', location.protocol==='file:'?'ok':'warn', `${location.protocol} – lokal gestartet`, 'Bei E-Mail-Versand ZIP vollständig entpacken, nicht direkt aus ZIP öffnen.');
    add(checks,'browser','Fenstergröße', innerWidth>=1200&&innerHeight>=700?'ok':'warn', `${innerWidth} x ${innerHeight}`, 'Für Präsentation möglichst maximieren.');
    add(checks,'browser','Bildschirmauflösung', screen.width>=1280?'ok':'warn', `${screen.width} x ${screen.height}`, 'Ab 1280px Breite empfohlen.');
    add(checks,'browser','Zoom / Skalierung', (env.devicePixelRatio>=.9&&env.devicePixelRatio<=2.25)?'ok':'warn', `DPR ${env.devicePixelRatio}`, 'Bei falscher Darstellung Browser-Zoom auf 100 %.');

    progress.step(22,'Dateien und Ressourcen prüfen');
    add(checks,'files','CSS-Verknüpfungen', css.links.length?'ok':'error', css.links.join(', ')||'keine Stylesheets');
    add(checks,'files','CSS lesbar', css.readable>0?'ok':'warn', `${css.readable} lesbar, ${css.blocked} blockiert`);
    ['js/01_state.js','js/03_dashboard.js','js/09_tabs_sidebar_events.js','js/32_kng4710_presentation_timer_toast_clock.js','js/34_kng491_systemcheck_tabs.js','js/35_kng494_systemcheck_feinschliff.js'].forEach(src=>{
      add(checks,'files',src, $$('script[src]').some(s=>(s.getAttribute('src')||'').split('?')[0]===src)?'ok':'warn', $$('script[src]').some(s=>(s.getAttribute('src')||'').split('?')[0]===src)?'eingebunden':'nicht eingebunden');
    });

    progress.step(38,'Bilder parallel prüfen');
    const assets=['assets/secretariat-office-classic.png','assets/secretariat-office-modern.png','assets/secretariat-office.png','assets/kochmuetze-koecheclub.png','Zusatz/OIP(1).webp','Zusatz/Passbild Herr Koch_2.jpg'];
    (await Promise.all(assets.map(a=>imageProbe(a)))).forEach(p=>add(checks,'files',p.url,p.ok?'ok':'error',p.ok?`geladen (${p.w} x ${p.h})`:'nicht gefunden oder blockiert'));

    progress.step(56,'Speicher und Daten prüfen');
    add(checks,'data','localStorage', canStorage('localStorage')?'ok':'error', canStorage('localStorage')?'verfügbar':'blockiert');
    add(checks,'data','sessionStorage', canStorage('sessionStorage')?'ok':'error', canStorage('sessionStorage')?'verfügbar':'blockiert');
    add(checks,'data','Programm-State', window.state?'ok':'error', window.state?'window.state vorhanden':'nicht vorhanden');
    add(checks,'data','Mitglieder-Daten', Array.isArray(window.state?.members)?'ok':'warn', Array.isArray(window.state?.members)?`${window.state.members.length} Einträge`:'kein Array');
    const cc=coordCheck(); add(checks,'data','Koordinaten-Daten',cc.level,cc.details);
    add(checks,'data','Benutzer/Rolle','ok', `${window.state?.session?.userName||'Gast'} / ${window.state?.session?.role||'Gast'}`);

    progress.step(70,'Timer, Meldungen und Uhr prüfen');
    const t=timerProbe(); add(checks,'runtime','Kurz-Timer','ok',t.details,'Keine Systemcheck-Verzögerung durch künstliche Timer-Wartezeit.');
    add(checks,'runtime','Präsentationskern 47.10', window.__KNG4710_PRESENTATION_CORE__?'ok':'warn', window.__KNG4710_PRESENTATION_CORE__?'aktiv':'nicht erkannt');
    const clock = $('#clock') || $('#topClock') || $('#digitalClock') || $('.clock');
    add(checks,'runtime','Digitaluhr Element', clock?'ok':'warn', clock?(clock.textContent||'vorhanden'):'nicht gefunden');
    add(checks,'runtime','Auto-Aus Anzeige', $('#autoLogoutCountdown')?'ok':'warn', $('#autoLogoutCountdown')?($('#autoLogoutCountdown').textContent||'vorhanden'):'nicht gefunden');
    add(checks,'runtime','Meldungsbereich', $('#toastArea')?'ok':'warn', $('#toastArea')?'Element #toastArea vorhanden':'fehlt');

    progress.step(84,'Leistung messen');
    const fps=await fpsProbe(); add(checks,'performance','Animation / Darstellung', fps.ok?'ok':'warn', fps.details);
    { const domCount=document.querySelectorAll('*').length; add(checks,'performance','DOM-Größe', domCount<8000?'ok':'warn', `${domCount} Elemente`, domCount<8000?'Für diese Vorführversion im erwarteten Bereich.':'Sehr viele Elemente – spätere Optimierung empfohlen.'); }

    progress.step(94,'Diagnosefähigkeit prüfen');
    add(checks,'diagnose','Diagnose-Export','ok','Browser kann JSON-Datei erzeugen.');
    add(checks,'diagnose','Online-Status', navigator.onLine?'ok':'warn', navigator.onLine?'online':'offline');

    const errors=checks.filter(c=>c.level==='error').length, warnings=checks.filter(c=>c.level==='warn').length, ok=checks.filter(c=>c.level==='ok').length;
    env.protocolLimit = getLimit(); env.protocolKeep = getKeep();
    return {version:'KNG-Systemcheck-49.6', environment:env, summary:{overall:errors?'FEHLER':(warnings?'WARNUNG':'OK'), errors, warnings, ok}, checks};
  }

  function ensureUiPatch(){
    const section = $('#systemCheck'); if(!section) return;
    // 49.1/49.3 UI erzeugen lassen, falls noch nicht geschehen.
    if(!$('#systemCheckTabs') && typeof window.runSystemCheck === 'function'){
      try{ /* no-op; existing module builds UI on DOMContentLoaded */ }catch(_){}
    }
    const opts = $('.systemcheck-options', section);
    if(opts){
      opts.style.gridTemplateColumns = 'minmax(260px,1.1fr) 150px 160px';
      const limit = $('#systemCheckProtocolLimit');
      if(limit){ limit.style.maxWidth='80px'; limit.value = String(getLimit()); }
      if(!$('#systemCheckProtocolKeep')){
        const label=document.createElement('label');
        label.innerHTML = 'Einträge behalten<input id="systemCheckProtocolKeep" type="number" min="1" step="1" value="'+esc(getKeep())+'">';
        opts.appendChild(label);
      }
      const keep=$('#systemCheckProtocolKeep'); if(keep) keep.style.maxWidth='80px';
    }
    // Alte Listener sicher entfernen: Buttons ersetzen, dann neu binden.
    ['runSystemCheck','exportSystemCheckReport'].forEach(id=>{
      const old = $('#'+id); if(old && old.dataset.kng494Replaced!=='1'){
        const neu = old.cloneNode(true); neu.dataset.kng494Replaced='1'; old.replaceWith(neu);
      }
    });
  }

  function renderProtocol(){
    const tbody=$('#systemCheckProtocolTable'); if(!tbody) return;
    tbody.innerHTML = readProtocol().slice(0,30).map(p=>`<tr><td>${esc(p.date||p.createdAt||'')}</td><td>${esc(p.status||p.result||'')}</td><td>${esc(p.errors??'')}</td><td>${esc(p.warnings??'')}</td><td>${esc(p.duration||p.durationText||'')}</td><td>${esc(p.user||'')}</td></tr>`).join('');
  }
  function groupName(g){ return GROUP_LABELS[g] || g; }
  function renderDetails(report){
    const tbody=$('#systemCheckTable'); if(!tbody || !report) return;
    const rows = report.checks.filter(c => currentTab === 'overview' ? true : c.group === currentTab);
    tbody.innerHTML = rows.map(c=>`<tr class="check-row ${esc(c.level)}"><td>${esc(groupName(c.group))}</td><td>${esc(c.check)}</td><td>${statusLabel(c.level)}</td><td>${esc(c.details)}${c.help?`<br><small>${esc(c.help)}</small>`:''}</td></tr>`).join('');
  }
  function renderOverview(report){
    const box=$('#systemCheckOverview'); if(!box || !report) return;
    const groups=['browser','files','data','runtime','performance','diagnose'];
    box.innerHTML = `<div class="systemcheck-overview-grid">${groups.map(g=>{
      const arr=report.checks.filter(c=>c.group===g), e=arr.filter(c=>c.level==='error').length, w=arr.filter(c=>c.level==='warn').length, level=e?'error':(w?'warn':'ok');
      return `<article class="systemcheck-mini ${level}" data-sys-group="${esc(g)}"><strong>${esc(groupName(g))}</strong><span>${statusLabel(level)}</span><small>${arr.length} Prüfungen · ${e} Fehler · ${w} Warnungen</small></article>`;
    }).join('')}</div><div class="systemcheck-env"><b>Rechner/Browser:</b> ${esc(report.environment.browserName)} · ${esc(report.environment.viewport)} · ${esc(report.environment.protocol)}<br><b>Benutzer:</b> ${esc(report.environment.user)} · <b>Prüfung:</b> ${esc(report.environment.createdAtLocal)}${report.environment.durationText?` · <b>Dauer:</b> ${esc(report.environment.durationText)}`:''}</div>`;
  }
  function updateDashboard(report){
    const el=$('#cardSystem'); if(!el || !report) return;
    el.textContent = report.summary.overall === 'OK' ? 'OK' : (report.summary.errors ? 'Fehler' : 'Warnung');
    el.title = `Klicken für Systemcheck: ${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen`;
    el.classList.toggle('system-warn', report.summary.overall !== 'OK');
    const card = el.closest('.card') || el;
    card.style.cursor = 'pointer';
    card.title = el.title;
  }
  function renderReport(report){
    lastReport=report;
    const summary=$('#systemCheckSummary');
    if(summary){ summary.className='check-summary '+(report.summary.errors?'warn':'ok'); summary.textContent = report.summary.overall==='OK' ? `Systemcheck OK – ${report.summary.ok} Prüfungen bestanden.` : `Systemcheck ${report.summary.overall}: ${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen.`; }
    renderOverview(report); renderDetails(report); renderProtocol(); updateDashboard(report);
  }
  function selectSystemCheckTab(group){
    currentTab = group || 'overview';
    $$('#systemCheckTabs button').forEach(b=>b.classList.toggle('active', (b.dataset.checkTab||'overview')===currentTab));
    const overview=$('#systemCheckOverview'), details=$('#systemCheckDetails');
    if(overview) overview.classList.toggle('active', currentTab==='overview');
    if(details) details.classList.toggle('active', currentTab!=='overview');
    renderDetails(lastReport || safeLoadReport());
  }
  function jumpToFirstIssue(report){
    const r = report || lastReport || safeLoadReport();
    const issue = r?.checks?.find(c=>c.level==='error') || r?.checks?.find(c=>c.level==='warn');
    selectSystemCheckTab(issue ? issue.group : 'overview');
    setTimeout(()=>{
      const row=$('#systemCheckTable tr.error, #systemCheckTable tr.warn');
      if(row){ row.classList.add('kng-issue-highlight'); row.scrollIntoView({behavior:'smooth', block:'center'}); }
    },120);
  }
  function safeLoadReport(){ try{ return JSON.parse(localStorage.getItem(REPORT_KEY) || 'null'); }catch(_){ return null; } }

  async function runCheck(writeProtocol=true){
    ensureUiPatch();
    const pc=createProgressController();
    let report;
    try{ report=await buildReport(pc); }
    finally{ pc.done(); }
    const durationMs=Math.round(pc.elapsed());
    const durationText=(durationMs/1000).toFixed(1).replace('.', ',')+' s';
    report.environment.durationMs=durationMs; report.environment.durationText=durationText;
    try{ localStorage.setItem(REPORT_KEY, JSON.stringify(report)); }catch(_){}
    window.state = window.state || {}; window.state.settings = window.state.settings || {};
    window.state.lastSystemCheck = {iso:report.environment.createdAt, status:report.summary.overall, errors:report.summary.errors, warnings:report.summary.warnings, user:report.environment.user, duration:durationText};
    saveStateSafe();
    if(writeProtocol){
      saveProtocol({date:report.environment.createdAtLocal,status:report.summary.overall,errors:report.summary.errors,warnings:report.summary.warnings,duration:durationText,durationMs,user:report.environment.user});
      try{
        if(typeof window.logAction === 'function'){
          window.logAction('Systemcheck','durchgeführt',`${report.summary.overall}: ${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen, Dauer ${durationText}`);
        }
      }catch(_){ }
    }
    setTimeout(()=>renderReport(report),250);
    try{ window.toast?.(`Systemcheck abgeschlossen (${durationText}).`,'success'); }catch(_){}
    return report;
  }
  function downloadReport(report){
    const r=report||lastReport||safeLoadReport();
    if(!r) return runCheck(true).then(downloadReport);
    const stamp=new Date().toISOString().replace(/[:T]/g,'-').slice(0,19);
    const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`KNG-Systemcheck-${stamp}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  function bindPatch(){
    ensureUiPatch();
    const run=$('#runSystemCheck'); if(run && run.dataset.kng494Bound!=='1'){ run.dataset.kng494Bound='1'; run.addEventListener('click',ev=>{ev.preventDefault(); ev.stopImmediatePropagation(); runCheck(true);},true); }
    const exp=$('#exportSystemCheckReport'); if(exp && exp.dataset.kng494Bound!=='1'){ exp.dataset.kng494Bound='1'; exp.addEventListener('click',ev=>{ev.preventDefault(); ev.stopImmediatePropagation(); downloadReport();},true); }
    const limit=$('#systemCheckProtocolLimit'); if(limit && limit.dataset.kng494Bound!=='1'){ limit.dataset.kng494Bound='1'; limit.value=String(getLimit()); limit.addEventListener('change',()=>{ const n=Math.max(10,Number(limit.value||50)); limit.value=String(n); window.state=window.state||{}; window.state.settings=window.state.settings||{}; window.state.settings.systemCheckProtocolLimit=n; localStorage.setItem(PROTOCOL_LIMIT_KEY,String(n)); saveStateSafe(); }); }
    const keep=$('#systemCheckProtocolKeep'); if(keep && keep.dataset.kng494Bound!=='1'){ keep.dataset.kng494Bound='1'; keep.value=String(getKeep()); keep.addEventListener('change',()=>{ const n=Math.max(1,Number(keep.value||10)); keep.value=String(n); window.state=window.state||{}; window.state.settings=window.state.settings||{}; window.state.settings.systemCheckProtocolKeep=n; localStorage.setItem(PROTOCOL_KEEP_KEY,String(n)); saveStateSafe(); }); }
    $$('#systemCheckTabs button').forEach(btn=>{ if(btn.dataset.kng494Bound==='1') return; btn.dataset.kng494Bound='1'; btn.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopImmediatePropagation(); selectSystemCheckTab(btn.dataset.checkTab||'overview'); },true); });
    const card=$('#cardSystem')?.closest('.card') || $('#cardSystem');
    if(card && card.dataset.kng494Bound!=='1'){ card.dataset.kng494Bound='1'; card.style.cursor='pointer'; card.addEventListener('click',ev=>{ ev.preventDefault(); if(typeof window.showView==='function') window.showView('systemCheck'); else { document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); $('#systemCheck')?.classList.add('active'); } setTimeout(()=>jumpToFirstIssue(lastReport || safeLoadReport()),120); },true); }
  }

  window.runSystemCheck = runCheck;
  window.exportSystemCheckReport = () => downloadReport();
  document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(()=>{ bindPatch(); const r=safeLoadReport(); if(r){ renderReport(r); } const auto = (window.state?.settings?.systemCheckOnStart === true) || localStorage.getItem(START_CHECK_KEY) === '1'; if(auto && !window.__KNG496_AUTO_SYSTEMCHECK_DONE__){ window.__KNG496_AUTO_SYSTEMCHECK_DONE__ = true; setTimeout(()=>runCheck(true).catch(()=>{}), 900); } }, 80); });
  document.addEventListener('click', ()=>setTimeout(bindPatch,40), true);
})();
