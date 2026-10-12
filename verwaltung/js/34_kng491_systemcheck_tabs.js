/* KNG 49.3 – Erweiterter Systemcheck mit Registerkarten, Fortschritt, Startoption und Protokoll-Dauer
   Greift nicht in Auto-Aus/Uhr/Meldungskern ein. Nur Diagnose-/Systemcheck-Modul.
*/
(function(){
  'use strict';
  if(window.__KNG493_SYSTEMCHECK_TABS__) return;
  window.__KNG493_SYSTEMCHECK_TABS__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const REPORT_KEY = 'kng49_last_system_check_report';
  const PROTOCOL_KEY = 'kng_system_check_protocol_v491';
  const COORD_KEY = 'kngOfficeIconCoordinates47_3';
  const START_CHECK_KEY = 'kng49_systemcheck_on_start';
  const PROTOCOL_LIMIT_KEY = 'kng49_systemcheck_protocol_limit';
  const PROTOCOL_KEEP_DEFAULT = 10;

  function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function two(n){ return String(n).padStart(2,'0'); }
  function ts(d=new Date()){ return `${two(d.getDate())}.${two(d.getMonth()+1)}.${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`; }
  function currentUser(){ return window.state?.session?.userName || window.state?.currentUser?.name || 'Gast'; }
  function statusLabel(level){ return level === 'ok' ? '✅ OK' : (level === 'warn' ? '⚠️ Warnung' : '❌ Fehler'); }
  function add(list, group, check, level, details, help=''){
    list.push({group, check, level, details:String(details ?? ''), help:String(help ?? '')});
  }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  function setProgress(percent, text, elapsedText=''){
    const summary = $('#systemCheckSummary');
    if(!summary) return;
    const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
    summary.className = 'check-summary running';
    const extra = elapsedText ? ` · ${esc(elapsedText)}` : '';
    summary.innerHTML = `<div class="kng-progress-wrap"><div class="kng-progress-info"><span>${esc(text || 'Systemcheck läuft…')}${extra}</span><strong>${p}%</strong></div><div class="kng-progress-bar"><span style="width:${p}%"></span></div></div>`;
  }
  function canStorage(name){
    try{
      const s = window[name];
      const k = '__kng_check_' + Math.random().toString(36).slice(2);
      s.setItem(k,'1'); const ok = s.getItem(k) === '1'; s.removeItem(k); return ok;
    }catch(_){ return false; }
  }
  function browserName(){
    const ua = navigator.userAgent || '';
    if(/Edg\//.test(ua)) return 'Microsoft Edge';
    if(/OPR\//.test(ua)) return 'Opera';
    if(/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Google Chrome';
    if(/Firefox\//.test(ua)) return 'Firefox';
    if(/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    if(/Trident|MSIE/.test(ua)) return 'Internet Explorer';
    return 'Unbekannt';
  }
  function getCssInfo(){
    const links = $$('link[rel="stylesheet"]').map(l => l.getAttribute('href') || '');
    let readable = 0, blocked = 0;
    try{ Array.from(document.styleSheets || []).forEach(s => { try{ void s.cssRules; readable++; }catch(_){ blocked++; } }); }
    catch(_){ blocked++; }
    return {links, readable, blocked};
  }
  function imageProbe(url, timeout=1800){
    return new Promise(resolve => {
      const img = new Image(); let done=false;
      const finish = ok => { if(done) return; done=true; resolve({url, ok, w: img.naturalWidth || 0, h: img.naturalHeight || 0}); };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      setTimeout(() => finish(false), timeout);
      img.src = url + (url.includes('?') ? '&' : '?') + 'check=' + Date.now();
    });
  }
  async function timerProbe(samples=1){
    const values=[];
    for(let i=0;i<samples;i++){
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve,1000));
      values.push(Math.round(performance.now()-start));
    }
    const avg = Math.round(values.reduce((a,b)=>a+b,0)/values.length);
    const max = Math.max(...values), min = Math.min(...values);
    return {values, avg, min, max, ok: avg >= 850 && avg <= 1600};
  }
  async function rafProbe(){
    if(typeof requestAnimationFrame !== 'function') return {ok:false, details:'requestAnimationFrame nicht verfügbar'};
    const start = performance.now();
    let frames = 0;
    await new Promise(resolve => {
      function step(){ frames++; if(frames>=20) resolve(); else requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
    const diff = Math.max(1, performance.now()-start);
    const fps = Math.round((frames/diff)*1000);
    return {ok: fps >= 25, details:`ca. ${fps} FPS (${frames} Frames in ${Math.round(diff)}ms)`};
  }
  function quickClockInfo(){
    const candidates = ['#clock','#topClock','#digitalClock','#headerClock','.clock'];
    const el = candidates.map(s => $(s)).find(Boolean);
    return {present: !!el, text: el ? (el.textContent || '').trim() : ''};
  }
  function getProtocol(){
    try{
      const fromState = window.state?.systemCheckProtocol;
      if(Array.isArray(fromState)) return fromState;
      return JSON.parse(localStorage.getItem(PROTOCOL_KEY) || '[]');
    }catch(_){ return []; }
  }
  function getProtocolLimit(){
    const fromState = Number(window.state?.settings?.systemCheckProtocolLimit || 0);
    const fromLocal = Number(localStorage.getItem(PROTOCOL_LIMIT_KEY) || 0);
    return Math.max(10, fromState || fromLocal || 50);
  }
  function saveProtocol(entry){
    try{
      window.state = window.state || {};
      window.state.settings = window.state.settings || {};
      const limit = getProtocolLimit();
      let list = Array.isArray(window.state.systemCheckProtocol) ? window.state.systemCheckProtocol : getProtocol();
      list.unshift(entry);
      if(list.length > limit){
        try{ window.toast?.(`Systemcheck-Protokoll über ${limit} Einträge – auf die letzten ${PROTOCOL_KEEP_DEFAULT} gekürzt.`, 'info'); }catch(_){ }
        list = list.slice(0, PROTOCOL_KEEP_DEFAULT);
      }
      window.state.systemCheckProtocol = list;
      localStorage.setItem(PROTOCOL_KEY, JSON.stringify(list));
      if(typeof window.saveState === 'function') window.saveState();
    }catch(_){
      try{ const limit=getProtocolLimit(); let p = getProtocol(); p.unshift(entry); if(p.length>limit) p=p.slice(0,PROTOCOL_KEEP_DEFAULT); localStorage.setItem(PROTOCOL_KEY, JSON.stringify(p)); }catch(__){}
    }
  }
  function coordStorageCheck(){
    const result = {read:false, write:false, restore:false, apply:false, count:0, detail:''};
    try{
      const old = localStorage.getItem(COORD_KEY);
      const parsed = old ? JSON.parse(old) : [];
      result.read = true;
      result.count = Array.isArray(parsed) ? parsed.length : 0;
      const marker = '__systemcheck_marker_' + Date.now();
      const testRows = Array.isArray(parsed) ? parsed.slice() : [];
      testRows.push({id:marker, office:'test', object:'Systemcheck', function:'Speichertest', icon:'check', x:12.3, y:45.6, size:24});
      localStorage.setItem(COORD_KEY, JSON.stringify(testRows));
      const reread = JSON.parse(localStorage.getItem(COORD_KEY) || '[]');
      result.write = Array.isArray(reread) && reread.some(r => r.id === marker && Number(r.x) === 12.3 && Number(r.y) === 45.6);
      if(old === null) localStorage.removeItem(COORD_KEY); else localStorage.setItem(COORD_KEY, old);
      result.restore = true;
      try{
        if(typeof window.KNG_APPLY_OFFICE_COORDINATES === 'function'){
          window.KNG_APPLY_OFFICE_COORDINATES();
          result.apply = true;
        }else if(window.KNG_OFFICE_ICON_COORDINATES_473 || localStorage.getItem(COORD_KEY)){
          result.apply = true;
        }
      }catch(_){ result.apply = false; }
      result.detail = `lesen ${result.read?'OK':'Nein'}, schreiben ${result.write?'OK':'Nein'}, wiederherstellen ${result.restore?'OK':'Nein'}, anwenden ${result.apply?'OK':'nicht direkt prüfbar'}, Einträge ${result.count}`;
    }catch(e){ result.detail = 'Koordinaten-Test fehlgeschlagen: ' + (e && e.message ? e.message : e); }
    return result;
  }

  async function buildReport(progress){
    const checks = [];
    const bName = browserName();
    const ua = navigator.userAgent || '';
    progress?.(5,'Browser und Anzeige prüfen…');
    const css = getCssInfo();
    const env = {
      createdAt: new Date().toISOString(),
      createdAtLocal: ts(),
      user: currentUser(),
      browserName: bName,
      userAgent: ua,
      language: navigator.language || '',
      platform: navigator.platform || '',
      protocol: location.protocol,
      href: location.href,
      viewport: `${innerWidth} x ${innerHeight}`,
      screen: `${screen.width} x ${screen.height}`,
      devicePixelRatio: window.devicePixelRatio || 1,
      online: navigator.onLine,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      localStorage: canStorage('localStorage'),
      sessionStorage: canStorage('sessionStorage')
    };

    add(checks,'browser','Browser', bName === 'Internet Explorer' ? 'error' : (['Microsoft Edge','Google Chrome'].includes(bName) ? 'ok':'warn'), `${bName} – ${ua}`, 'Edge oder Chrome empfohlen.');
    add(checks,'browser','JavaScript', 'ok', 'JavaScript wird ausgeführt.');
    add(checks,'browser','Protokoll / Startart', location.protocol === 'file:' ? 'ok':'warn', `${location.protocol} – lokal gestartet`, 'Bei E-Mail-Versand ZIP vollständig entpacken, nicht direkt aus ZIP öffnen.');
    add(checks,'browser','Fenstergröße', (innerWidth >= 1200 && innerHeight >= 700) ? 'ok':'warn', `${innerWidth} x ${innerHeight}`, 'Für Präsentation möglichst maximieren.');
    add(checks,'browser','Bildschirmauflösung', screen.width >= 1280 ? 'ok':'warn', `${screen.width} x ${screen.height}`, 'Ab 1280px Breite empfohlen.');
    add(checks,'browser','Zoom / Skalierung', (window.devicePixelRatio >= .9 && window.devicePixelRatio <= 2.25) ? 'ok':'warn', `DPR ${env.devicePixelRatio}`, 'Bei falscher Darstellung Browser-Zoom auf 100 %.');

    progress?.(18,'CSS, JavaScript und Dateien prüfen…');
    add(checks,'files','CSS style.css eingebunden', css.links.some(x=>/css\/style\.css/i.test(x)) ? 'ok':'error', css.links.join(', ') || 'keine CSS-Dateien gefunden', 'Wenn Fehler: Ordnerstruktur prüfen.');
    add(checks,'files','CSS lesbar', css.readable > 0 ? 'ok':'warn', `${css.readable} Stylesheets lesbar, ${css.blocked} blockiert`, 'Blockiert kann bei lokalen Browser-Sicherheitsregeln vorkommen; kritisch ist, ob style.css geladen ist.');
    const scripts = $$('script[src]').map(s => s.getAttribute('src') || '');
    ['js/01_state.js','js/03_dashboard.js','js/09_tabs_sidebar_events.js','js/32_kng4710_presentation_timer_toast_clock.js','js/33_kng49_systemcheck_diagnostics.js','js/34_kng491_systemcheck_tabs.js'].forEach(src=>{
      add(checks,'files',src, scripts.some(x=>x.split('?')[0]===src) ? 'ok':'error', scripts.some(x=>x.split('?')[0]===src) ? 'eingebunden' : 'fehlt');
    });
    const assetList = ['assets/secretariat-office-classic.png','assets/secretariat-office-modern.png','assets/secretariat-office.png','assets/kochmuetze-koecheclub.png','Zusatz/OIP(1).webp','Zusatz/Passbild Herr Koch_2.jpg'];
    progress?.(30,'Bilder und Zusatzdateien prüfen…');
    const probes = await Promise.all(assetList.map(x=>imageProbe(x)));
    probes.forEach(p => add(checks,'files',p.url, p.ok ? 'ok':'error', p.ok ? `geladen (${p.w} x ${p.h})` : 'nicht gefunden / blockiert'));

    progress?.(48,'Speicher und Programmdaten prüfen…');
    add(checks,'data','localStorage', env.localStorage ? 'ok':'error', env.localStorage ? 'verfügbar' : 'blockiert', 'Wichtig für Einstellungen und Koordinaten.');
    add(checks,'data','sessionStorage', env.sessionStorage ? 'ok':'warn', env.sessionStorage ? 'verfügbar' : 'blockiert');
    add(checks,'data','Programm-State', window.state ? 'ok':'error', window.state ? 'window.state vorhanden' : 'nicht vorhanden');
    add(checks,'data','Mitglieder-Daten', Array.isArray(window.state?.members) ? 'ok':'warn', Array.isArray(window.state?.members) ? `${window.state.members.length} Einträge` : 'keine Mitgliederliste erkannt');
    const coord = coordStorageCheck();
    add(checks,'data','Koordinaten-Daten', (coord.read && coord.write && coord.restore) ? 'ok':'warn', coord.detail, 'Prüft Schreiben/Lesen/Wiederherstellen des Koordinatenspeichers.');
    add(checks,'data','Benutzer/Rolle', window.state?.session ? 'ok':'warn', `${window.state?.session?.userName || 'Gast'} / ${window.state?.session?.role || 'Gast'}`);

    progress?.(64,'Timer, Meldungen und Uhr prüfen…');
    const timer = await timerProbe(1);
    const clock = quickClockInfo();
    add(checks,'runtime','System-Timer 1 Sekunde', timer.ok ? 'ok':'warn', `Messungen: ${timer.values.join('ms, ')}ms; Mittelwert ${timer.avg}ms`, 'Einzelne Abweichungen sind normal. Dauerhafte Abweichungen deuten auf Browser-Drosselung oder hohe Last hin.');
    add(checks,'runtime','Präsentationskern 47.10', window.__KNG4710_PRESENTATION_CORE__ ? 'ok':'warn', window.__KNG4710_PRESENTATION_CORE__ ? 'aktiv' : 'nicht erkannt');
    add(checks,'runtime','Digitaluhr Element', clock.present ? 'ok':'warn', clock.present ? `vorhanden: ${clock.text}` : 'nicht gefunden');
    add(checks,'runtime','Auto-Aus Anzeige', $('#autoLogoutCountdown') ? 'ok':'warn', $('#autoLogoutCountdown') ? ($('#autoLogoutCountdown').textContent || '').trim() : 'Element fehlt');
    add(checks,'runtime','Meldungsbereich', $('#toastArea') ? 'ok':'warn', $('#toastArea') ? 'Element #toastArea vorhanden' : 'nicht gefunden');

    progress?.(82,'Leistung messen…');
    const raf = await rafProbe();
    add(checks,'performance','Oberflächen-Refresh', raf.ok ? 'ok':'warn', raf.details, 'Wichtig für flüssige Uhr, Countdown und Animationen.');
    const perfNav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if(perfNav){ add(checks,'performance','Ladezeit DOM', perfNav.domContentLoadedEventEnd ? 'ok':'warn', `${Math.round(perfNav.domContentLoadedEventEnd)}ms bis DOMContentLoaded`); }
    else { add(checks,'performance','Performance API', performance ? 'ok':'warn', 'Basis-Performance-API verfügbar'); }
    if(performance && performance.memory){
      const used = Math.round(performance.memory.usedJSHeapSize/1024/1024);
      const total = Math.round(performance.memory.totalJSHeapSize/1024/1024);
      add(checks,'performance','JS-Speicher', used < 180 ? 'ok':'warn', `${used} MB von ${total} MB`);
    }else{
      add(checks,'performance','JS-Speicher', 'ok', 'Nicht verfügbar in diesem Browser – unkritisch');
    }
    add(checks,'performance','Sichtbarkeit Browser-Tab', document.hidden ? 'warn':'ok', document.hidden ? 'Tab ist im Hintergrund – Timer können gedrosselt werden.' : 'Tab ist sichtbar.');

    progress?.(94,'Diagnosefähigkeit prüfen…');
    add(checks,'diagnose','Diagnose-Export', (typeof Blob !== 'undefined' && typeof URL !== 'undefined') ? 'ok':'error', 'Browser kann JSON-Datei erzeugen.');
    add(checks,'diagnose','Online-Status', navigator.onLine ? 'ok':'warn', navigator.onLine ? 'online' : 'offline');

    const errors = checks.filter(c => c.level === 'error').length;
    const warnings = checks.filter(c => c.level === 'warn').length;
    const ok = checks.filter(c => c.level === 'ok').length;
    const overall = errors ? 'FEHLER' : (warnings ? 'WARNUNG' : 'OK');
    progress?.(100,'Systemcheck abgeschlossen.');
    return {version:'KNG-Systemcheck-49.3', environment:env, summary:{overall, errors, warnings, ok}, checks};
  }

  function ensureUi(){
    const section = $('#systemCheck');
    if(!section) return;
    if($('#systemCheckTabs')) return;
    section.innerHTML = `
      <h3>Systemcheck</h3>
      <div class="panel systemcheck-panel">
        <div class="button-row systemcheck-actions">
          <button id="runSystemCheck" class="primary" type="button">Systemcheck starten</button>
          <button id="exportSystemCheckReport" class="secondary" type="button">Diagnosedatei erzeugen</button>
        </div>
        <div id="systemCheckSummary" class="check-summary">Noch keine Prüfung durchgeführt.</div>
        <div class="systemcheck-options form-grid" style="grid-template-columns:repeat(2,minmax(220px,1fr));margin:.65rem 0;">
          <label class="toggle-switch"><input id="systemCheckOnStart" type="checkbox"><span class="switch-slider"></span><span>Systemcheck beim Start ausführen (dauert etwas)</span></label>
          <label>Protokollgrenze<input id="systemCheckProtocolLimit" type="number" min="10" step="1" value="50"></label>
        </div>
        <div id="systemCheckDashboardHint" class="hint">Der Status wird auch im Dashboard bei „Systemstatus“ angezeigt.</div>
        <div id="systemCheckTabs" class="systemcheck-tabs">
          <button class="active" data-check-tab="overview" type="button">Übersicht</button>
          <button data-check-tab="browser" type="button">Browser & Anzeige</button>
          <button data-check-tab="files" type="button">Dateien & Ressourcen</button>
          <button data-check-tab="data" type="button">Speicher & Daten</button>
          <button data-check-tab="runtime" type="button">Timer & Meldungen</button>
          <button data-check-tab="performance" type="button">Leistung</button>
          <button data-check-tab="diagnose" type="button">Diagnose / Export</button>
        </div>
        <div id="systemCheckOverview" class="systemcheck-tab-panel active"></div>
        <div id="systemCheckDetails" class="systemcheck-tab-panel">
          <table class="systemcheck-compact-table">
            <thead><tr><th>Bereich</th><th>Prüfung</th><th>Status</th><th>Hinweis</th></tr></thead>
            <tbody id="systemCheckTable"></tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="backup-log-head">
          <h4>Protokoll Systemcheck</h4>
          <button id="clearSystemCheckProtocol" class="danger admin-only" type="button">Systemcheck-Protokoll löschen</button>
        </div>
        <table class="systemcheck-compact-table">
          <thead><tr><th>Datum</th><th>Ergebnis</th><th>Fehler</th><th>Warnungen</th><th>Dauer</th><th>Benutzer</th></tr></thead>
          <tbody id="systemCheckProtocolTable"></tbody>
        </table>
      </div>`;
  }

  let currentTab = 'overview';
  let lastReport = null;
  function groupName(g){ return ({browser:'Browser & Anzeige', files:'Dateien & Ressourcen', data:'Speicher & Daten', runtime:'Timer & Meldungen', performance:'Leistung', diagnose:'Diagnose / Export'}[g] || g); }
  function renderProtocol(){
    const tbody = $('#systemCheckProtocolTable');
    if(!tbody) return;
    tbody.innerHTML = getProtocol().slice(0,30).map(p => `<tr><td>${esc(p.date || p.createdAt || '')}</td><td>${esc(p.status || p.result || '')}</td><td>${esc(p.errors ?? '')}</td><td>${esc(p.warnings ?? '')}</td><td>${esc(p.duration || p.durationText || '')}</td><td>${esc(p.user || '')}</td></tr>`).join('');
  }
  function updateDashboard(report){
    const el = $('#cardSystem');
    if(!el || !report) return;
    el.textContent = report.summary.overall === 'OK' ? 'OK' : (report.summary.errors ? 'Fehler' : 'Warnung');
    el.title = `Systemcheck ${report.summary.overall}: ${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen – ${report.environment.createdAtLocal}`;
    el.classList.toggle('system-warn', report.summary.overall !== 'OK');
  }
  function renderOverview(report){
    const box = $('#systemCheckOverview');
    if(!box || !report) return;
    const groups = ['browser','files','data','runtime','performance','diagnose'];
    const labels = {browser:'Browser & Anzeige', files:'Dateien & Ressourcen', data:'Speicher & Daten', runtime:'Timer & Meldungen', performance:'Leistung', diagnose:'Diagnose / Export'};
    const cards = groups.map(g => {
      const arr = report.checks.filter(c => c.group === g);
      const e = arr.filter(c=>c.level==='error').length;
      const w = arr.filter(c=>c.level==='warn').length;
      const level = e ? 'error' : (w ? 'warn' : 'ok');
      return `<article class="systemcheck-mini ${level}"><strong>${esc(labels[g])}</strong><span>${statusLabel(level)}</span><small>${arr.length} Prüfungen · ${e} Fehler · ${w} Warnungen</small></article>`;
    }).join('');
    box.innerHTML = `<div class="systemcheck-overview-grid">${cards}</div>
      <div class="systemcheck-env">
        <b>Rechner/Browser:</b> ${esc(report.environment.browserName)} · ${esc(report.environment.viewport)} · ${esc(report.environment.protocol)}<br>
        <b>Benutzer:</b> ${esc(report.environment.user)} · <b>Prüfung:</b> ${esc(report.environment.createdAtLocal)}${report.environment.durationText ? ` · <b>Dauer:</b> ${esc(report.environment.durationText)}` : ''}
      </div>`;
  }
  function renderDetails(report){
    const tbody = $('#systemCheckTable');
    if(!tbody || !report) return;
    const rows = report.checks.filter(c => currentTab === 'overview' ? true : c.group === currentTab);
    tbody.innerHTML = rows.map(c => `<tr class="check-row ${esc(c.level)}"><td>${esc(groupName(c.group))}</td><td>${esc(c.check)}</td><td>${statusLabel(c.level)}</td><td>${esc(c.details)}${c.help ? `<br><small>${esc(c.help)}</small>`:''}</td></tr>`).join('');
  }
  function renderReport(report){
    lastReport = report;
    const summary = $('#systemCheckSummary');
    if(summary){
      summary.className = 'check-summary ' + (report.summary.errors ? 'warn' : 'ok');
      summary.textContent = report.summary.overall === 'OK'
        ? `Systemcheck OK – ${report.summary.ok} Prüfungen bestanden.`
        : `Systemcheck ${report.summary.overall}: ${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen.`;
    }
    renderOverview(report); renderDetails(report); updateDashboard(report); renderProtocol();
  }
  async function runCheck(writeProtocol=true){
    ensureUi();
    const startMs = performance.now();
    let lastPercent = 0, lastText = 'Systemcheck startet…';
    let elapsedTimer = setInterval(() => {
      const sec = Math.floor((performance.now() - startMs) / 1000);
      setProgress(lastPercent, lastText, `Dauer ${sec}s`);
    }, 250);
    const progress = (p,t) => { lastPercent = p; lastText = t || lastText; const sec = Math.floor((performance.now() - startMs) / 1000); setProgress(p,t,`Dauer ${sec}s`); };
    progress(0,'Systemcheck startet…');
    let report;
    try{
      report = await buildReport(progress);
    }finally{
      clearInterval(elapsedTimer);
    }
    const durationMs = Math.round(performance.now() - startMs);
    const durationText = (durationMs/1000).toFixed(1).replace('.', ',') + ' s';
    report.environment.durationMs = durationMs;
    report.environment.durationText = durationText;
    try{ localStorage.setItem(REPORT_KEY, JSON.stringify(report)); }catch(_){ }
    try{
      window.state = window.state || {};
      window.state.lastSystemCheck = {iso:report.environment.createdAt, status:report.summary.overall, errors:report.summary.errors, warnings:report.summary.warnings, user:report.environment.user, duration:durationText};
      if(typeof window.saveState === 'function') window.saveState();
    }catch(_){ }
    if(writeProtocol){ saveProtocol({date:report.environment.createdAtLocal, status:report.summary.overall, errors:report.summary.errors, warnings:report.summary.warnings, duration:durationText, durationMs, user:report.environment.user}); }
    renderReport(report);
    try{ window.toast?.(`Systemcheck abgeschlossen (${durationText}).`,'success'); }catch(_){ }
    return report;
  }
  function downloadReport(report){
    const r = report || lastReport;
    if(!r) return runCheck(true).then(downloadReport);
    const stamp = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19);
    const blob = new Blob([JSON.stringify(r,null,2)], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `KNG-Systemcheck-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    try{ window.toast?.('Diagnosedatei erzeugt.','success'); }catch(_){ }
  }
  function safeLoadReport(){ try{ return JSON.parse(localStorage.getItem(REPORT_KEY) || 'null'); }catch(_){ return null; } }
  function bind(){
    ensureUi();
    $$('#systemCheckTabs button').forEach(btn => {
      if(btn.dataset.bound492 === '1') return;
      btn.dataset.bound492 = '1';
      btn.addEventListener('click', ev => {
        ev.preventDefault();
        currentTab = btn.dataset.checkTab || 'overview';
        $$('#systemCheckTabs button').forEach(b => b.classList.toggle('active', b === btn));
        const overview = $('#systemCheckOverview'), details = $('#systemCheckDetails');
        if(overview) overview.classList.toggle('active', currentTab === 'overview');
        if(details) details.classList.toggle('active', currentTab !== 'overview');
        renderDetails(lastReport || safeLoadReport());
      });
    });

    const startCb = $('#systemCheckOnStart');
    if(startCb && startCb.dataset.bound493 !== '1'){
      startCb.dataset.bound493 = '1';
      const val = (window.state?.settings?.systemCheckOnStart ?? localStorage.getItem(START_CHECK_KEY) === '1');
      startCb.checked = !!val;
      startCb.addEventListener('change', () => {
        window.state = window.state || {}; window.state.settings = window.state.settings || {};
        window.state.settings.systemCheckOnStart = !!startCb.checked;
        localStorage.setItem(START_CHECK_KEY, startCb.checked ? '1' : '0');
        if(typeof window.saveState === 'function') window.saveState();
        try{ window.toast?.('Systemcheck-Startoption gespeichert.','success'); }catch(_){ }
      });
    }
    const limitInput = $('#systemCheckProtocolLimit');
    if(limitInput && limitInput.dataset.bound493 !== '1'){
      limitInput.dataset.bound493 = '1';
      limitInput.value = String(getProtocolLimit());
      limitInput.addEventListener('change', () => {
        const n = Math.max(10, Number(limitInput.value || 50));
        limitInput.value = String(n);
        window.state = window.state || {}; window.state.settings = window.state.settings || {};
        window.state.settings.systemCheckProtocolLimit = n;
        localStorage.setItem(PROTOCOL_LIMIT_KEY, String(n));
        if(typeof window.saveState === 'function') window.saveState();
      });
    }
    const run = $('#runSystemCheck');
    if(run && run.dataset.bound492 !== '1'){
      run.dataset.bound492 = '1';
      run.addEventListener('click', ev => { ev.preventDefault(); ev.stopImmediatePropagation(); runCheck(true); }, true);
    }
    const exp = $('#exportSystemCheckReport');
    if(exp && exp.dataset.bound492 !== '1'){
      exp.dataset.bound492 = '1';
      exp.addEventListener('click', ev => { ev.preventDefault(); ev.stopImmediatePropagation(); downloadReport(lastReport || safeLoadReport()); }, true);
    }
    const clr = $('#clearSystemCheckProtocol');
    if(clr && clr.dataset.bound492 !== '1'){
      clr.dataset.bound492 = '1';
      clr.addEventListener('click', ev => {
        ev.preventDefault();
        if(!confirm('Systemcheck-Protokoll wirklich löschen?')) return;
        try{ localStorage.removeItem(PROTOCOL_KEY); if(window.state) window.state.systemCheckProtocol = []; if(typeof window.saveState === 'function') window.saveState(); }catch(_){ }
        renderProtocol();
      });
    }
  }
  window.runSystemCheck = runCheck;
  window.exportSystemCheckReport = () => downloadReport(lastReport || safeLoadReport());
  document.addEventListener('DOMContentLoaded', () => { bind(); const r = safeLoadReport(); if(r){ renderReport(r); } /* Auto-Start ab 49.6 zentral in 35_kng494_systemcheck_feinschliff.js, damit auch der erste Check sicher protokolliert wird. */ });
  document.addEventListener('click', () => setTimeout(bind, 30), true);
})();
