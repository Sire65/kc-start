/* KNG 49 – Erweiterter Systemcheck / Diagnoseexport
   Zweck: technische Unterschiede zwischen PCs sichtbar machen und als Datei exportieren.
   Greift nicht in Timer/Uhr/Meldungskern ein.
*/
(function(){
  'use strict';
  if(window.__KNG49_SYSTEMCHECK_DIAGNOSTICS__) return;
  window.__KNG49_SYSTEMCHECK_DIAGNOSTICS__ = true;

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const CHECK_KEY = 'kng49_last_system_check_report';

  function safeText(v){ return String(v ?? ''); }
  function nowIso(){ return new Date().toISOString(); }
  function currentUser(){ return window.state?.session?.userName || 'Gast'; }
  function saveSafe(){ try{ if(typeof window.saveState === 'function') window.saveState(); }catch(_){} }
  function esc(s){ return safeText(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function addResult(list, area, check, level, details){
    const status = level === 'ok' ? 'OK' : (level === 'warn' ? 'Warnung' : 'Fehler');
    list.push({ area, check, level, status, details: safeText(details) });
  }

  function canUseStorage(kind){
    try{
      const store = kind === 'sessionStorage' ? window.sessionStorage : window.localStorage;
      const k = '__kng_test_' + Math.random().toString(36).slice(2);
      store.setItem(k,'1');
      const ok = store.getItem(k) === '1';
      store.removeItem(k);
      return ok;
    }catch(_){ return false; }
  }

  function loadedStyleInfo(){
    const links = $$('link[rel="stylesheet"]').map(l=>({href:l.getAttribute('href')||'', loaded:true}));
    let readable = 0;
    let blocked = 0;
    try{
      Array.from(document.styleSheets || []).forEach(s=>{
        try{ void s.cssRules; readable++; }catch(_){ blocked++; }
      });
    }catch(_){ blocked++; }
    return {links, readableStyleSheets: readable, blockedStyleSheets: blocked};
  }

  function scriptInfo(){
    return $$('script[src]').map(s=>s.getAttribute('src')||'');
  }

  function assetProbe(url, timeoutMs=2500){
    return new Promise(resolve=>{
      const img = new Image();
      let done = false;
      const finish = ok => { if(done) return; done = true; resolve({url, ok}); };
      img.onload = ()=>finish(true);
      img.onerror = ()=>finish(false);
      setTimeout(()=>finish(false), timeoutMs);
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    });
  }

  async function checkAssets(results){
    /* BEFUND 02.09.2026: der Systemcheck meldete "nicht gefunden" fuer die Kochmuetze - und
       zwar zu Recht, aber aus einem Grund, der nichts mit dem Bild zu tun hatte: die Datei
       liegt unter Zusatz/ mit einem VERSTUEMMELTEN Dateinamen ("KochmÃ¼tze"), weil die
       Umlaute beim Uebertragen einmal falsch gelesen wurden. Der Systemcheck fragte nach dem
       richtig geschriebenen Namen - den es dort nicht gibt.
       Das Bild selbst liegt laengst sauber benannt unter assets/. Geprueft wird jetzt dort.
       Wichtig fuer Git: ein verstuemmelter Dateiname macht auf einem anderen Betriebssystem
       weiteren Aerger, deshalb steht der Zusatz-Ordner nicht mehr in dieser Liste. */
    const assets = [
      'assets/secretariat-office-classic.png',
      'assets/secretariat-office-modern.png',
      'assets/secretariat-office.png',
      'assets/kochmuetze-koecheclub.png',
      'assets/kochmuetze-koecheclub-weiss.png'
    ];
    const probes = await Promise.all(assets.map(a=>assetProbe(a)));
    probes.forEach(p=>addResult(results,'Dateien / Bilder',p.url,p.ok?'ok':'error',p.ok?'geladen':'nicht gefunden oder blockiert'));
  }

  function makeEnvironment(){
    return {
      createdAt: nowIso(),
      user: currentUser(),
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '',
      url: location.href,
      protocol: location.protocol,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio || 1 },
      screen: { width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine,
      storage: { localStorage: canUseStorage('localStorage'), sessionStorage: canUseStorage('sessionStorage') },
      styles: loadedStyleInfo(),
      scripts: scriptInfo()
    };
  }

  async function buildSystemReport(){
    const results = [];
    const env = makeEnvironment();

    addResult(results,'Browser','JavaScript aktiv', 'ok', 'Skripte werden ausgeführt');
    addResult(results,'Browser','Browser/Engine', env.userAgent ? 'ok':'warn', env.userAgent);
    addResult(results,'Browser','Dateiprotokoll', location.protocol === 'file:' ? 'ok':'warn', location.protocol + ' – bei Versand immer ZIP vollständig entpacken');
    addResult(results,'Anzeige','Fenstergröße', (window.innerWidth >= 1100 && window.innerHeight >= 650) ? 'ok':'warn', `${window.innerWidth} x ${window.innerHeight}, DPR ${env.viewport.devicePixelRatio}`);
    addResult(results,'Anzeige','Bildschirmauflösung', (screen.width >= 1280) ? 'ok':'warn', `${screen.width} x ${screen.height}`);
    addResult(results,'Speicher','localStorage', env.storage.localStorage ? 'ok':'error', env.storage.localStorage ? 'verfügbar' : 'blockiert');
    addResult(results,'Speicher','sessionStorage', env.storage.sessionStorage ? 'ok':'error', env.storage.sessionStorage ? 'verfügbar' : 'blockiert');

    const requiredIds = ['loginBtn','logoutBtn','mainNav','toastArea','clock','autoLogoutCountdown','dashboard','secretariat','settings','systemCheck','systemCheckTable','systemCheckSummary'];
    requiredIds.forEach(id=> addResult(results,'Programmstruktur',`Element #${id}`, document.getElementById(id) ? 'ok':'error', document.getElementById(id) ? 'vorhanden' : 'fehlt'));

    addResult(results,'Daten','State vorhanden', window.state ? 'ok':'error', window.state ? 'window.state vorhanden' : 'nicht vorhanden');
    addResult(results,'Daten','Mitgliederliste', Array.isArray(window.state?.members) ? 'ok':'warn', Array.isArray(window.state?.members) ? `${window.state.members.length} Einträge` : 'kein Array');
    addResult(results,'Daten','Protokoll', Array.isArray(window.state?.protocol) ? 'ok':'warn', Array.isArray(window.state?.protocol) ? `${window.state.protocol.length} Einträge` : 'kein Array');
    addResult(results,'Daten','Systemcheck-Protokoll', Array.isArray(window.state?.systemCheckProtocol) ? 'ok':'warn', Array.isArray(window.state?.systemCheckProtocol) ? `${window.state.systemCheckProtocol.length} Einträge` : 'kein Array');

    const cssLinks = env.styles.links.map(x=>x.href).join(', ');
    addResult(results,'Design / CSS','CSS-Verknüpfungen', env.styles.links.length ? 'ok':'error', cssLinks || 'keine Stylesheets gefunden');
    addResult(results,'Design / CSS','CSS lesbar', env.styles.readableStyleSheets > 0 ? 'ok':'warn', `${env.styles.readableStyleSheets} lesbar, ${env.styles.blockedStyleSheets} blockiert`);
    addResult(results,'Design / CSS','Hauptdesign style.css', env.styles.links.some(x=>/css\/style\.css/.test(x.href)) ? 'ok':'error', 'css/style.css');

    const scripts = env.scripts;
    ['js/01_state.js','js/03_dashboard.js','js/09_tabs_sidebar_events.js','js/15_navigation_layout_core.js','js/32_kng4710_presentation_timer_toast_clock.js'].forEach(src=>{
      addResult(results,'JavaScript-Dateien',src, scripts.includes(src) ? 'ok':'error', scripts.includes(src) ? 'eingebunden' : 'fehlt');
    });
    addResult(results,'Laufzeit','Präsentationskern 47.10', window.__KNG4710_PRESENTATION_CORE__ ? 'ok':'warn', window.__KNG4710_PRESENTATION_CORE__ ? 'aktiv' : 'nicht erkannt');
    addResult(results,'Laufzeit','Systemcheck 49', window.__KNG49_SYSTEMCHECK_DIAGNOSTICS__ ? 'ok':'error', 'aktives Diagnosemodul');

    await checkAssets(results);

    const fail = results.filter(r=>r.level === 'error').length;
    const warn = results.filter(r=>r.level === 'warn').length;
    const overall = fail ? 'FEHLER' : (warn ? 'WARNUNG' : 'OK');
    return { version:'KNG-Systemdiagnose-49.0', environment: env, summary:{overall, errors:fail, warnings:warn, ok:results.filter(r=>r.level==='ok').length}, checks: results };
  }

  function renderReport(report){
    const summary = $('#systemCheckSummary');
    const table = $('#systemCheckTable');
    if(summary){
      summary.className = report.summary.errors ? 'check-summary warn' : 'check-summary ok';
      summary.textContent = report.summary.overall === 'OK'
        ? 'Systemcheck OK – keine kritischen Hinweise.'
        : `Systemcheck: ${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen.`;
    }
    if(table){
      table.innerHTML = report.checks.map(c=>`<tr>
        <td>${esc(c.area)}</td>
        <td>${esc(c.check)}</td>
        <td>${c.level === 'ok' ? '✅ OK' : (c.level === 'warn' ? '⚠️ Warnung' : '❌ Fehler')}</td>
        <td>${esc(c.details)}</td>
      </tr>`).join('');
    }
    const card = $('#cardSystem');
    if(card){
      card.textContent = report.summary.overall === 'OK' ? 'OK' : (report.summary.errors ? 'Fehler' : 'Warnung');
      card.title = `Systemcheck: ${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen`;
      card.classList.toggle('system-warn', report.summary.overall !== 'OK');
    }
  }

  function storeReport(report, writeProtocol=true){
    window.state = window.state || {};
    window.state.lastSystemCheck = {
      iso: report.environment.createdAt,
      status: report.summary.overall,
      errors: report.summary.errors,
      warnings: report.summary.warnings,
      user: currentUser()
    };
    try{ localStorage.setItem(CHECK_KEY, JSON.stringify(report)); }catch(_){ }
    if(writeProtocol && typeof window.logSystemCheck === 'function'){
      window.logSystemCheck(report.summary.overall, `${report.summary.errors} Fehler, ${report.summary.warnings} Warnungen`);
    } else { saveSafe(); }
  }

  async function runAdvancedSystemCheck(options={}){
    const summary = $('#systemCheckSummary');
    if(summary){ summary.className='check-summary'; summary.textContent='Systemcheck läuft…'; }
    const report = await buildSystemReport();
    renderReport(report);
    storeReport(report, options.writeProtocol !== false);
    try{ window.toast?.('Systemcheck abgeschlossen.','success'); }catch(_){ }
    return report;
  }

  function downloadReport(report){
    const d = new Date();
    const stamp = d.toISOString().replace(/[:T]/g,'-').slice(0,19);
    const filename = `KNG-Systemcheck-${stamp}.json`;
    const blob = new Blob([JSON.stringify(report,null,2)], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function exportCurrentOrNewReport(){
    let report = null;
    try{ report = JSON.parse(localStorage.getItem(CHECK_KEY) || 'null'); }catch(_){ report = null; }
    if(!report) report = await runAdvancedSystemCheck({writeProtocol:true});
    downloadReport(report);
    try{ window.toast?.('Systemcheck-Datei wurde erzeugt.','success'); }catch(_){ }
  }

  function ensureSystemCheckUi(){
    const row = $('#systemCheck .button-row');
    if(row){
      let run = $('#runSystemCheck');
      if(run){ run.textContent = 'Systemcheck starten'; }
      if(!$('#exportSystemCheckReport')){
        const btn = document.createElement('button');
        btn.id = 'exportSystemCheckReport';
        btn.className = 'secondary';
        btn.type = 'button';
        btn.textContent = 'Systemcheck-Datei erzeugen';
        row.appendChild(btn);
      }
    }
  }

  function bindButtons(){
    ensureSystemCheckUi();
    const run = $('#runSystemCheck');
    if(run && run.dataset.kng49Bound !== '1'){
      run.dataset.kng49Bound = '1';
      run.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopImmediatePropagation();
        runAdvancedSystemCheck({writeProtocol:true});
      }, true);
    }
    const exp = $('#exportSystemCheckReport');
    if(exp && exp.dataset.kng49Bound !== '1'){
      exp.dataset.kng49Bound = '1';
      exp.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopImmediatePropagation();
        exportCurrentOrNewReport();
      }, true);
    }
  }

  function restoreDashboardStatus(){
    try{
      const last = window.state?.lastSystemCheck;
      const card = $('#cardSystem');
      if(card && last){
        card.textContent = last.status === 'OK' ? 'OK' : (last.errors ? 'Fehler' : 'Warnung');
        card.title = `Letzter Systemcheck: ${last.status}, ${last.errors||0} Fehler, ${last.warnings||0} Warnungen`;
        card.classList.toggle('system-warn', last.status !== 'OK');
      }
    }catch(_){ }
  }

  window.runSystemCheck = runAdvancedSystemCheck;
  window.exportSystemCheckReport = exportCurrentOrNewReport;

  document.addEventListener('DOMContentLoaded', ()=>{
    bindButtons();
    restoreDashboardStatus();
    // Kurz nach Start einen stillen Schnellcheck fürs Dashboard, aber ohne Protokolleintrag.
    setTimeout(()=>runAdvancedSystemCheck({writeProtocol:false}).catch(()=>{}), 800);
  });
  document.addEventListener('click', ()=>setTimeout(bindButtons,50), true);
})();
