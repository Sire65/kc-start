/* KNG 49.7 – Systemcheck Protokoll/Autostart Kernfix
   Ziel: Keine Änderung am eigentlichen Check-Inhalt. Nur:
   - jeder manuelle und automatische Systemcheck wird sofort im Systemcheck-Protokoll sichtbar
   - Autostart-Haken wird zuverlässig gespeichert und beim Programmstart berücksichtigt
   - Hauptprotokoll wird nur ergänzt, wenn noch kein passender Eintrag existiert
*/
(function(){
  'use strict';
  if(window.__KNG497_SYSTEMCHECK_PROTOCOL_FIX__) return;
  window.__KNG497_SYSTEMCHECK_PROTOCOL_FIX__ = true;

  const REPORT_KEY = 'kng49_last_system_check_report';
  const PROTOCOL_KEY = 'kng_system_check_protocol_v491';
  const START_KEY = 'kng49_systemcheck_on_start';
  const LIMIT_KEY = 'kng49_systemcheck_protocol_limit';
  const KEEP_KEY = 'kng49_systemcheck_protocol_keep';

  const $ = (s, r=document) => r.querySelector(s);
  function esc(v){return String(v ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));}
  function nowLocal(){try{return new Date().toLocaleString('de-DE');}catch(_){return new Date().toISOString();}}
  function getState(){window.state=window.state||{}; window.state.settings=window.state.settings||{}; return window.state;}
  function saveState(){try{ if(typeof window.saveState==='function') window.saveState(); }catch(_){}}
  function getLimit(){const st=getState(); const n=Number(st.settings.systemCheckProtocolLimit || localStorage.getItem(LIMIT_KEY) || 50); return Math.max(10, Number.isFinite(n)?n:50);}
  function getKeep(){const st=getState(); const n=Number(st.settings.systemCheckProtocolKeep || localStorage.getItem(KEEP_KEY) || 10); return Math.max(1, Number.isFinite(n)?n:10);}
  function readList(){
    const st=getState();
    if(Array.isArray(st.systemCheckProtocol)) return st.systemCheckProtocol.slice();
    try{const a=JSON.parse(localStorage.getItem(PROTOCOL_KEY)||'[]'); return Array.isArray(a)?a:[];}catch(_){return [];}
  }
  function writeList(list){
    const st=getState();
    const limit=getLimit(); const keep=Math.min(getKeep(), limit);
    let out=Array.isArray(list)?list.slice():[];
    if(out.length>limit) out=out.slice(0,keep);
    st.systemCheckProtocol=out;
    try{localStorage.setItem(PROTOCOL_KEY, JSON.stringify(out));}catch(_){ }
    saveState();
    return out;
  }
  function getLastReport(){
    try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'null');}catch(_){return null;}
  }
  function entryFromReport(report, source){
    const env=report?.environment||{}; const sum=report?.summary||{};
    return {
      id: env.createdAt || new Date().toISOString(),
      date: env.createdAtLocal || nowLocal(),
      createdAt: env.createdAt || new Date().toISOString(),
      status: sum.overall || 'UNBEKANNT',
      errors: Number(sum.errors||0),
      warnings: Number(sum.warnings||0),
      ok: Number(sum.ok||0),
      duration: env.durationText || '',
      durationMs: Number(env.durationMs||0),
      user: env.user || getState().session?.userName || 'Gast',
      source: source || 'manual'
    };
  }
  function ensureSystemCheckProtocolEntry(report, source){
    if(!report || !report.summary) return null;
    const entry=entryFromReport(report, source);
    let list=readList();
    const exists=list.some(x => (x.id && x.id===entry.id) || (x.createdAt && x.createdAt===entry.createdAt));
    if(!exists){
      list.unshift(entry);
      list=writeList(list);
    }else{
      // Trotzdem State/localStorage synchronisieren, falls nur eine Quelle aktuell war.
      writeList(list);
    }
    renderSystemCheckProtocolNow();
    return entry;
  }
  function ensureMainProtocolEntry(report, source){
    const st=getState(); if(!Array.isArray(st.protocol)) st.protocol=[];
    const env=report?.environment||{}, sum=report?.summary||{};
    const iso=env.createdAt || '';
    const already=st.protocol.some(p => p && p.module==='Systemcheck' && p.action==='durchgeführt' && String(p.details||'').includes(iso));
    if(already) return;
    const details=`${sum.overall||'UNBEKANNT'}: ${Number(sum.errors||0)} Fehler, ${Number(sum.warnings||0)} Warnungen, Dauer ${env.durationText||''}, ${source==='auto'?'Autostart':'manuell'}, ${iso}`;
    try{
      if(typeof window.logAction==='function') window.logAction('Systemcheck','durchgeführt',details);
      else st.protocol.unshift({time:nowLocal(),user:env.user||st.session?.userName||'Gast',module:'Systemcheck',action:'durchgeführt',details});
    }catch(_){ st.protocol.unshift({time:nowLocal(),user:env.user||st.session?.userName||'Gast',module:'Systemcheck',action:'durchgeführt',details}); }
    saveState();
  }
  function renderSystemCheckProtocolNow(){
    const tbody=$('#systemCheckProtocolTable'); if(!tbody) return;
    const rows=readList().slice(0,30);
    tbody.innerHTML = rows.length ? rows.map(p=>`<tr><td>${esc(p.date||p.createdAt||'')}</td><td>${esc(p.status||p.result||'')}</td><td>${esc(p.errors??'')}</td><td>${esc(p.warnings??'')}</td><td>${esc(p.duration||p.durationText||'')}</td><td>${esc(p.user||'')}</td></tr>`).join('') : '<tr><td colspan="6" class="muted">Keine Systemcheck-Protokolleinträge.</td></tr>';
  }
  function syncAutostartCheckbox(){
    const st=getState();
    const cb=$('#systemCheckOnStart');
    const saved = (st.settings.systemCheckOnStart === true) || localStorage.getItem(START_KEY)==='1';
    if(cb){
      cb.checked=!!saved;
      if(cb.dataset.kng497Bound!=='1'){
        cb.dataset.kng497Bound='1';
        cb.addEventListener('change',()=>{
          const val=!!cb.checked;
          getState().settings.systemCheckOnStart=val;
          try{localStorage.setItem(START_KEY, val?'1':'0');}catch(_){ }
          saveState();
          try{window.toast?.(val?'Systemcheck beim Start aktiviert.':'Systemcheck beim Start deaktiviert.','info');}catch(_){ }
        }, true);
      }
    }
    return saved;
  }

  const originalRun = window.runSystemCheck;
  async function runSystemCheck497(writeProtocol=true, source='manual'){
    const runSource = source || 'manual';
    let report=null;
    if(typeof originalRun === 'function'){
      report = await originalRun(writeProtocol);
    }else{
      throw new Error('Systemcheck-Funktion nicht verfügbar.');
    }
    // Der originale Check speichert den Report. Für Sicherheit aus Rückgabe oder localStorage lesen.
    report = report || getLastReport();
    if(writeProtocol !== false){
      ensureSystemCheckProtocolEntry(report, runSource);
      ensureMainProtocolEntry(report, runSource);
    }
    // Sofortige Aktualisierung nach evtl. async-Rendering älterer Module erneut erzwingen.
    setTimeout(renderSystemCheckProtocolNow, 0);
    setTimeout(renderSystemCheckProtocolNow, 250);
    return report;
  }

  function bindSystemcheckPatch(){
    syncAutostartCheckbox();
    renderSystemCheckProtocolNow();
    const btn=$('#runSystemCheck');
    if(btn && btn.dataset.kng497Bound!=='1'){
      btn.dataset.kng497Bound='1';
      btn.addEventListener('click', ev=>{
        ev.preventDefault(); ev.stopImmediatePropagation();
        runSystemCheck497(true,'manual').catch(err=>{try{window.toast?.('Systemcheck konnte nicht ausgeführt werden: '+(err?.message||err),'error');}catch(_){}});
      }, true);
    }
  }

  window.runSystemCheck = runSystemCheck497;
  window.KNG_RENDER_SYSTEMCHECK_PROTOCOL_NOW = renderSystemCheckProtocolNow;
  window.KNG_SYSTEMCHECK_AUTOSTART_ENABLED = () => syncAutostartCheckbox();

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{
      bindSystemcheckPatch();
      const enabled=syncAutostartCheckbox();
      if(enabled && !window.__KNG497_AUTOSTART_DONE__){
        window.__KNG497_AUTOSTART_DONE__=true;
        setTimeout(()=>runSystemCheck497(true,'auto').catch(()=>{}), 1200);
      }
    }, 550);
  });
  document.addEventListener('click', ()=>setTimeout(bindSystemcheckPatch,50), true);
  document.addEventListener('input', ev=>{ if(ev.target && ev.target.id==='systemCheckOnStart') setTimeout(syncAutostartCheckbox,0); }, true);
})();
