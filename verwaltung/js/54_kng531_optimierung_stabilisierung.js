/* KNG 53.1a – Optimierung/Stabilisierung (nicht-destruktiv)
   Ziel: Sofortanzeige im Systemcheck/Admin-Leitstand, nie leere Übersicht,
   Rückkehr zur Schaltzentrale vorbereiten, Backup-Vollständigkeit sichtbar machen.
   Bestehende Kernmodule werden NICHT ersetzt. */
(function(){
  'use strict';
  const REPORT_KEY='kng49_last_system_check_report';
  const PROTOCOL_KEY='kng_system_check_protocol_v491';
  const BACKUP_PROTOCOL_KEY='kng_backup_protocol';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function readJson(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch(_){return f;}}
  function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(_){return false;}}
  function nowLocal(){try{return new Date().toLocaleString('de-DE');}catch(_){return String(new Date());}}
  function ensureCss(){
    if($('#kng531aStyle')) return;
    const st=document.createElement('style'); st.id='kng531aStyle';
    st.textContent=`
      .kng531-overview-empty{padding:14px;border:1px solid rgba(59,130,246,.35);border-radius:14px;background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(30,41,59,.82));color:#e5eefc;box-shadow:inset 0 0 18px rgba(56,189,248,.08)}
      .kng531-overview-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:10px 0}
      .kng531-overview-metrics>div{border-radius:12px;padding:10px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.24)}
      .kng531-overview-metrics strong{display:block;font-size:1.35rem;color:#dbeafe}.kng531-overview-metrics span{font-size:.78rem;color:#9fb4cc;text-transform:uppercase;letter-spacing:.06em}
      .kng531-fast-note{margin:.55rem 0 0;color:#a7f3d0;font-size:.85rem}.kng531-return-btn{position:fixed;right:18px;bottom:18px;z-index:80;border:1px solid rgba(56,189,248,.45);background:linear-gradient(135deg,#0f172a,#164e63);color:#e0f2fe;border-radius:999px;padding:9px 14px;box-shadow:0 14px 30px rgba(0,0,0,.35),0 0 18px rgba(56,189,248,.22);font-weight:700;cursor:pointer}.kng531-return-btn:hover{filter:brightness(1.15)}
      .kng531-backup-completeness{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:10px}.kng531-pill{padding:8px 10px;border-radius:12px;background:rgba(15,23,42,.65);border:1px solid rgba(148,163,184,.18);font-size:.86rem}.kng531-pill b{color:#bfdbfe}.kng531-pill.ok b{color:#86efac}.kng531-pill.warn b{color:#fde68a}
    `;
    document.head.appendChild(st);
  }
  function getLastReport(){return readJson(REPORT_KEY,null);}
  function getProtocol(){let p=readJson(PROTOCOL_KEY,[]); if(!Array.isArray(p)) p=[]; return p;}
  function setProtocol(p){writeJson(PROTOCOL_KEY,Array.isArray(p)?p:[]); if(window.state){window.state.systemCheckProtocol=Array.isArray(p)?p:[]; try{window.saveState?.();}catch(_){}}}
  function ensureProtocolEntry(report){
    if(!report||!report.environment||!report.summary) return;
    const created=report.environment.createdAtLocal||report.environment.createdAt||nowLocal();
    let p=getProtocol();
    const exists=p.some(x=>(x.date||x.createdAt)==created && String(x.status||x.result)==String(report.summary.overall));
    if(!exists){
      p.unshift({date:created,status:report.summary.overall,errors:report.summary.errors||0,warnings:report.summary.warnings||0,duration:report.environment.durationText||'',durationMs:report.environment.durationMs||'',user:report.environment.user||''});
      p=p.slice(0,Math.max(10,Number(window.state?.settings?.systemCheckProtocolLimit||50)));
      setProtocol(p);
      try{window.logAction?.('Systemcheck','Systemcheck durchgeführt',`${report.summary.overall} · ${report.summary.errors||0} Fehler · ${report.summary.warnings||0} Warnungen`);}catch(_){ }
    }
  }
  function renderProtocolNow(){
    const tbody=$('#systemCheckProtocolTable'); if(!tbody) return;
    const rows=getProtocol().slice(0,30);
    tbody.innerHTML=rows.map(p=>`<tr><td>${esc(p.date||p.createdAt||'')}</td><td>${esc(p.status||p.result||'')}</td><td>${esc(p.errors??'')}</td><td>${esc(p.warnings??'')}</td><td>${esc(p.duration||p.durationText||'')}</td><td>${esc(p.user||'')}</td></tr>`).join('');
  }
  function statusClass(report){return !report?'warn':(report.summary?.errors?'error':(report.summary?.warnings?'warn':'ok'));}
  function renderOverviewAlways(report){
    // KNG 53.1d: alte dunkle Übersicht deaktiviert.
    // Die einheitliche Kachelansicht wird ausschließlich durch 56/57 gerendert.
    try{
      if(typeof window.KNG531C_renderSystemcheckOverview === 'function') window.KNG531C_renderSystemcheckOverview(report || getLastReport());
    }catch(_){}
  }
  function updateDashboardNow(report){
    if(!report) return;
    const el=$('#cardSystem');
    if(el){
      el.textContent=report.summary?.overall==='OK'?'OK':(report.summary?.errors?'Fehler':'Warnung');
      el.title=`Systemcheck ${report.summary?.overall}: ${report.summary?.errors||0} Fehler, ${report.summary?.warnings||0} Warnungen – ${report.environment?.createdAtLocal||''}`;
      el.classList.toggle('system-warn', report.summary?.overall!=='OK');
    }
    // Admin-Leitstand Statusfelder sanft aktualisieren, falls vorhanden
    $$('.admin-led,.kng-led,.kng515-status-led').forEach(led=>{
      const txt=(led.textContent||led.title||'').toLowerCase();
      if(txt.includes('system')) led.classList.toggle('warn', report.summary?.overall!=='OK');
    });
  }
  function enhanceBackupCompleteness(){
    const panel=$('#backup,#settingsBackup,.backup-panel');
    const target=panel || $('#settingsBackup') || $('#settings');
    if(!target || $('#kng531BackupCompleteness')) return;
    const members=Array.isArray(window.state?.members)?window.state.members:[];
    const photos=members.filter(m=>m&&(m.photoData||m.photo)).length;
    const docs=Array.isArray(window.state?.documents)?window.state.documents.length:0;
    const inv=Array.isArray(window.state?.inventory)?window.state.inventory.length:0;
    const p=readJson(BACKUP_PROTOCOL_KEY, window.state?.backupProtocol||[]); const last=Array.isArray(p)&&p[0]?p[0]:null;
    const box=document.createElement('div'); box.id='kng531BackupCompleteness'; box.className='panel';
    box.innerHTML=`<h4>Datensicherung – Vollständigkeitsprüfung</h4><div class="hint">Kontrolliert, ob wichtige Datenarten im aktuellen Zustand vorhanden sind. Fotos werden nur gesichert, wenn sie als Bilddaten im Mitglied gespeichert sind.</div><div class="kng531-backup-completeness"><div class="kng531-pill ok"><b>${members.length}</b><br>Mitglieder</div><div class="kng531-pill ${photos?'ok':'warn'}"><b>${photos}</b><br>Passbilder/Bilddaten</div><div class="kng531-pill ${docs?'ok':'warn'}"><b>${docs}</b><br>Dokumenteinträge</div><div class="kng531-pill ${inv?'ok':'warn'}"><b>${inv}</b><br>Inventar</div><div class="kng531-pill"><b>${esc(last?.date||last?.createdAt||'–')}</b><br>Letzte Sicherung</div></div>`;
    target.appendChild(box);
  }
  function installReturnButton(){
    if($('#kng531ReturnLeitstand')) return;
    const b=document.createElement('button'); b.type='button'; b.id='kng531ReturnLeitstand'; b.className='kng531-return-btn'; b.textContent='↩ Schaltzentrale';
    b.style.display='none';
    b.addEventListener('click',()=>{try{window.openAdminLeitstand?.();}catch(_){ } const el=$('#adminLeitstand,#adminControlCenter,.admin-leitstand'); if(el){$$('.view,.screen,main section').forEach(v=>v.classList.remove('active')); el.classList.add('active'); el.scrollIntoView({block:'start'});} b.style.display='none';});
    document.body.appendChild(b);
    document.addEventListener('click',()=>{
      const active=$('#adminLeitstand.active,#adminControlCenter.active,.admin-leitstand.active');
      b.style.display=active?'none':(sessionStorage.getItem('kng_from_admin_leitstand')==='1'?'block':'none');
    },true);
  }
  function rememberLeitstandOrigin(){
    document.addEventListener('click',ev=>{
      const active=$('#adminLeitstand.active,#adminControlCenter.active,.admin-leitstand.active');
      if(active && ev.target.closest('button,a,[data-view],[data-open-view],[data-nav]')) sessionStorage.setItem('kng_from_admin_leitstand','1');
    },true);
  }
  function wrapRunSystemCheck(){
    const original=window.runSystemCheck;
    if(typeof original!=='function' || original.__kng531Wrapped) return;
    const wrapped=function(){
      const ret=original.apply(this,arguments);
      return Promise.resolve(ret).then(report=>{
        const r=report||getLastReport();
        ensureProtocolEntry(r); renderOverviewAlways(r); renderProtocolNow(); updateDashboardNow(r);
        return report;
      }).catch(err=>{throw err;});
    };
    wrapped.__kng531Wrapped=true; window.runSystemCheck=wrapped;
  }
  function init(){
    ensureCss(); wrapRunSystemCheck(); renderOverviewAlways(getLastReport()); renderProtocolNow(); updateDashboardNow(getLastReport()); enhanceBackupCompleteness(); installReturnButton(); rememberLeitstandOrigin();
    const t=document.querySelector('title'); if(t) t.textContent='Köcheclub Verwaltung 1.0 – Version 53.1a Stabil';
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,600); setTimeout(init,1600); setInterval(()=>{renderProtocolNow(); renderOverviewAlways(getLastReport());},5000);
})();
