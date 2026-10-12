/* KNG 53.1c – Systemcheck-Übersicht vereinheitlicht
   Ziel: Nur noch die aussagekräftige Kachelübersicht verwenden.
   Entfernt die dunkle 53.1a-Zusammenfassungsbox und ersetzt sie dauerhaft durch klickbare Status-Kacheln.
   Keine Prüflogik wird verändert. */
(function(){
  'use strict';
  const REPORT_KEY='kng49_last_system_check_report';
  const GROUPS=['browser','files','data','runtime','performance','diagnose'];
  const LABELS={
    browser:'Browser & Anzeige',
    files:'Dateien & Ressourcen',
    data:'Speicher & Daten',
    runtime:'Timer & Meldungen',
    performance:'Leistung',
    diagnose:'Diagnose / Export'
  };
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function readReport(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'null');}catch(_){return null;}}
  function levelFor(arr){const e=arr.filter(c=>c.level==='error').length; const w=arr.filter(c=>c.level==='warn').length; return e?'error':(w?'warn':'ok');}
  function statusText(level){return level==='error'?'FEHLER':(level==='warn'?'WARNUNG':'OK');}
  function statusIcon(level){return level==='error'?'✖':(level==='warn'?'⚠':'✔');}
  function selectTab(group){
    const tab=group||'overview';
    $$('#systemCheckTabs button').forEach(b=>b.classList.toggle('active',(b.dataset.checkTab||'overview')===tab));
    const overview=$('#systemCheckOverview'), details=$('#systemCheckDetails');
    if(overview) overview.classList.toggle('active',tab==='overview');
    if(details) details.classList.toggle('active',tab!=='overview');
    // Detailtabelle aus vorhandenem Report neu füllen, falls das vorherige Patchmodul nicht reagiert.
    const tbody=$('#systemCheckTable'); const report=readReport();
    if(tbody && report && tab!=='overview'){
      const rows=(report.checks||[]).filter(c=>c.group===tab);
      tbody.innerHTML=rows.map(c=>`<tr class="check-row ${esc(c.level)}"><td>${esc(LABELS[c.group]||c.group)}</td><td>${esc(c.check)}</td><td>${c.level==='error'?'🔴 FEHLER':(c.level==='warn'?'🟡 WARNUNG':'✅ OK')}</td><td>${esc(c.details||'')}${c.help?`<br><small>${esc(c.help)}</small>`:''}</td></tr>`).join('');
    }
  }
  function groupDuration(report, group){
    // Aktuell liegen Einzelzeiten nicht sauber vor; deshalb nur Gesamtdauer unten ausweisen.
    return '';
  }
  function renderUnifiedOverview(report){
    const box=$('#systemCheckOverview');
    if(!box) return;
    if(box.dataset.kng531cRendering==='1') return;
    box.dataset.kng531cRendering='1';
    try{
      report=report||readReport();
      if(!report){
        box.innerHTML=`<div class="kng531c-summary-line"><b>Systemcheck-Übersicht</b><span>Noch kein Systemcheck geladen. Bitte Systemcheck starten.</span></div>`;
        return;
      }
      const checks=Array.isArray(report.checks)?report.checks:[];
      const cards=GROUPS.map(g=>{
        const arr=checks.filter(c=>c.group===g);
        const errors=arr.filter(c=>c.level==='error').length;
        const warnings=arr.filter(c=>c.level==='warn').length;
        const level=levelFor(arr);
        const dur=groupDuration(report,g);
        return `<button type="button" class="kng531c-check-card ${level}" data-kng531c-tab="${esc(g)}" title="Zur Registerkarte ${esc(LABELS[g])} wechseln">
          <span class="kng531c-led ${level}">${statusIcon(level)}</span>
          <strong>${esc(LABELS[g])}</strong>
          <em>${statusText(level)}</em>
          <small>${arr.length} Prüfungen · ${errors} Fehler · ${warnings} Warnungen${dur?` · ${esc(dur)}`:''}</small>
        </button>`;
      }).join('');
      const total=checks.length || ((report.summary?.ok||0)+(report.summary?.warnings||0)+(report.summary?.errors||0));
      box.innerHTML=`
        <div class="kng531c-overview-grid">${cards}</div>
        <div class="kng531c-system-env">
          <b>${esc(total)}</b> Prüfungen · <b>${esc(report.summary?.errors||0)}</b> Fehler · <b>${esc(report.summary?.warnings||0)}</b> Warnungen ·
          <b>Gesamtdauer:</b> ${esc(report.environment?.durationText||'–')} ·
          <b>Zeitpunkt:</b> ${esc(report.environment?.createdAtLocal||'–')} ·
          <b>Benutzer:</b> ${esc(report.environment?.user||'–')}<br>
          <b>Rechner/Browser:</b> ${esc(report.environment?.browserName||'–')} · ${esc(report.environment?.viewport||'–')} · ${esc(report.environment?.protocol||'–')}
        </div>`;
      $$('.kng531c-check-card',box).forEach(card=>card.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();selectTab(card.dataset.kng531cTab);},true));
    } finally {
      box.dataset.kng531cRendering='0';
    }
  }
  function installCss(){
    if($('#kng531cStyle')) return;
    const st=document.createElement('style'); st.id='kng531cStyle';
    st.textContent=`
      #systemCheckOverview.active{display:block!important}
      #systemCheckOverview .kng531-overview-empty{display:none!important}
      .kng531c-overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:10px 0 12px}
      .kng531c-check-card{appearance:none;text-align:left;border:1px solid rgba(148,163,184,.28);border-radius:14px;padding:11px 12px 10px 13px;background:linear-gradient(145deg,#ffffff,#f6f8f6);box-shadow:0 8px 18px rgba(15,23,42,.08),inset 0 1px 0 rgba(255,255,255,.9);cursor:pointer;min-height:76px;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;position:relative;overflow:hidden}
      .kng531c-check-card:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:#16a34a;opacity:.95}
      .kng531c-check-card.warn:before{background:#d99b20}.kng531c-check-card.error:before{background:#c62828}
      .kng531c-check-card:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(15,23,42,.14),inset 0 1px 0 rgba(255,255,255,.95)}
      .kng531c-check-card.ok{border-left:4px solid #16a34a}.kng531c-check-card.warn{border-left:4px solid #d99b20}.kng531c-check-card.error{border-left:4px solid #c62828}
      .kng531c-led{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:12px;font-weight:900;margin-right:7px;color:white;box-shadow:inset 0 2px 3px rgba(255,255,255,.45),inset 0 -3px 5px rgba(0,0,0,.35),0 0 10px rgba(22,163,74,.45);vertical-align:middle}
      .kng531c-led.ok{background:radial-gradient(circle at 35% 28%,#d9ffd9,#22c55e 42%,#087c2e 75%,#043f18)}
      .kng531c-led.warn{background:radial-gradient(circle at 35% 28%,#fff7cc,#fbbf24 42%,#b56b00 75%,#573000);box-shadow:inset 0 2px 3px rgba(255,255,255,.45),inset 0 -3px 5px rgba(0,0,0,.35),0 0 10px rgba(251,191,36,.48)}
      .kng531c-led.error{background:radial-gradient(circle at 35% 28%,#ffd4d4,#ef4444 42%,#991b1b 75%,#450a0a);box-shadow:inset 0 2px 3px rgba(255,255,255,.45),inset 0 -3px 5px rgba(0,0,0,.35),0 0 10px rgba(239,68,68,.48)}
      .kng531c-check-card strong{font-size:.96rem;color:#0b1220}.kng531c-check-card em{display:block;font-style:normal;font-weight:800;margin:4px 0 3px;color:#166534}.kng531c-check-card.warn em{color:#a16207}.kng531c-check-card.error em{color:#991b1b}
      .kng531c-check-card small{display:block;color:#334155;font-size:.78rem;line-height:1.35}
      .kng531c-system-env,.kng531c-summary-line{border-radius:12px;background:#f3f4f6;border:1px solid rgba(148,163,184,.24);padding:10px 12px;color:#1f2937;font-size:.9rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.65)}
    `;
    document.head.appendChild(st);
  }
  function patchRunSystemCheck(){
    if(window.__KNG531C_RUN_PATCHED__) return; if(typeof window.runSystemCheck!=='function') return;
    window.__KNG531C_RUN_PATCHED__=true;
    const old=window.runSystemCheck;
    window.runSystemCheck=function(){
      const p=old.apply(this,arguments);
      if(p && typeof p.then==='function'){
        return p.then(r=>{setTimeout(()=>renderUnifiedOverview(r),40);return r;});
      }
      setTimeout(()=>renderUnifiedOverview(),80); return p;
    };
  }
  function init(){
    installCss(); patchRunSystemCheck();
    const report=readReport(); if(report) renderUnifiedOverview(report);
    const box=$('#systemCheckOverview');
    if(box && !box.__kng531cObserver){
      box.__kng531cObserver=new MutationObserver(()=>{
        const dark=box.querySelector('.kng531-overview-empty');
        // 54.8.20 Startfix: auch der eigene Leer-Hinweis („Noch kein Systemcheck geladen“) zählt als fertig gezeichnet –
        // sonst zeichnete der Beobachter ihn ohne Bericht (frisch entpackte Version) endlos neu und der Start hing.
        if(dark || !box.querySelector('.kng531c-overview-grid, .kng531c-summary-line')) setTimeout(()=>renderUnifiedOverview(),20);
      });
      box.__kng531cObserver.observe(box,{childList:true,subtree:false});
    }
    $$('#systemCheckTabs button').forEach(btn=>{
      if(btn.dataset.kng531cBound==='1') return; btn.dataset.kng531cBound='1';
      btn.addEventListener('click',()=>{ if((btn.dataset.checkTab||'overview')==='overview') setTimeout(()=>renderUnifiedOverview(),30); },true);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(init,200));
  document.addEventListener('click',()=>setTimeout(init,80),true);
  window.KNG531C_renderSystemcheckOverview=renderUnifiedOverview;
})();
