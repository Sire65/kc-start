/* KNG 52.1 Admin-Leitstand: Datenbank-Monitor
   Ergänzt die Schaltzentrale um Datenbankstatus, Pfad, Modus, Größe/Dateihinweis und Schnellnavigation.
   Greift nur ergänzend ein und verändert bestehende Timer/Uhr/Meldungen nicht.
*/
(function(){
  'use strict';
  const DB_DEFAULT_PATH='database/kng_local.db';
  const $=(s,r=document)=>r.querySelector(s);
  function st(){ return window.state || {}; }
  function esc(x){ return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function getDb(){
    const s=st().settings=st().settings||{};
    s.database=s.database||{};
    const db=s.database;
    db.mode='supabase-indexeddb';
    db.localPath='IndexedDB (Offline-Cache + Outbox)';
    db.enabled=true;
    db.cloudReady=window.KNGCloudSync?.status?.sup==='ready';
    return db;
  }
  function modeLabel(mode){
    return ({
      'supabase-indexeddb':'Supabase + IndexedDB (wie DP2)',
      'local-sqlite':'Lokal SQLite (alt)',
      'local-api':'Lokaler API-Dienst',
      'cloud-postgresql':'Cloud PostgreSQL',
      'cloud-mysql':'Cloud MySQL/MariaDB'
    })[mode] || (mode||'unbekannt');
  }
  function dbStatus(){
    const db=getDb();
    const cloud=window.KNGCloudSync?.status||{};
    const ready=cloud.sup==='ready';
    const working=cloud.sup==='working';
    const pending=Number(cloud.pending||0);
    const level=ready?'green':working?'yellow':cloud.sup==='error'?'red':'yellow';
    const text=ready?(pending?('ONLINE · '+pending+' OFFEN'):'ONLINE'):(working?'ABGLEICH':'OFFLINE-PUFFER');
    const details=ready?'Supabase ist Hauptdatenbank; IndexedDB dient als Offline-Cache/Queue.':(cloud.detail||'IndexedDB puffert lokal bis Supabase wieder erreichbar ist.');
    return {level,text,details,db,path:'IndexedDB Offline-Cache + Outbox',endpoint:'https://ptblnpiroqftcvlsrhac.supabase.co',mode:'supabase-indexeddb'};
  }
  function ledClass(level){ return level==='red'?'led-red':level==='yellow'?'led-yellow':'led-green'; }
  function formatDate(iso){
    if(!iso) return '--';
    const d=new Date(iso); if(Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('de-DE');
  }
  function findDbAction(){
    const list=Array.isArray(st().protocol)?st().protocol:[];
    return list.find(e=>/Datenbank/i.test(String(e.module||'')+' '+String(e.action||'')+' '+String(e.details||'')));
  }
  function entryDate(e){ return e ? [e.date,e.time].filter(Boolean).join(' ') || e.createdAtLocal || e.timestamp || '--' : '--'; }
  function ensureDbLed(){
    const strip=$('#adminCtlTopLedStrip');
    if(!strip) return;
    let cell=$('#adminCtlDatabaseTopLed');
    if(!cell){
      cell=document.createElement('button');
      cell.type='button';
      cell.id='adminCtlDatabaseTopLed';
      cell.className='admin-top-led-cell admin-db-led-cell';
      cell.dataset.adminLedTarget='database';
      cell.dataset.adminLedKey='database';
      strip.appendChild(cell);
    }
    const s=dbStatus();
    cell.title=s.details;
    cell.innerHTML=`<span class="led ${ledClass(s.level)}"></span><strong>Datenbank</strong><em>${esc(s.text)}</em>`;
  }
  function ensureDbPanel(){
    const root=$('#adminControl .admin-control-shell') || $('#adminControl');
    if(!root || $('#adminCtlDatabasePanel')) return;
    const panel=document.createElement('section');
    panel.id='adminCtlDatabasePanel';
    panel.className='admin-panel admin-db-panel admin-3d-panel';
    panel.innerHTML=`
      <div class="admin-panel-title"><span class="led led-yellow" id="adminCtlDbPanelLed"></span><strong>DATENBANK-ANBINDUNG</strong></div>
      <div class="admin-db-grid">
        <div><span>Status</span><strong id="adminCtlDbStatus">--</strong></div>
        <div><span>Modus</span><strong id="adminCtlDbMode">--</strong></div>
        <div><span>Pfad</span><strong id="adminCtlDbPath">--</strong></div>
        <div><span>Cloud/API</span><strong id="adminCtlDbEndpoint">--</strong></div>
        <div><span>Größe</span><strong id="adminCtlDbSize">Browser: nicht direkt lesbar</strong></div>
        <div><span>Letzte Prüfung</span><strong id="adminCtlDbLastCheck">--</strong></div>
        <div><span>Letzte DB-Aktion</span><strong id="adminCtlDbLastAction">--</strong></div>
      </div>
      <div class="admin-db-note" id="adminCtlDbNote">Supabase ist Hauptdatenbank. IndexedDB puffert Änderungen bei Offline-/Verbindungsstörungen und gleicht sie danach kontrolliert ab.</div>
      <div class="admin-db-actions"><button type="button" id="adminCtlOpenDatabaseSettings">Datenbank-Einstellungen öffnen</button><button type="button" id="adminCtlTestDatabaseSettings">DB-Konfiguration prüfen</button></div>`;
    const quick=$('#adminControl .admin-quick-access') || $('#adminControl .admin-control-footer');
    if(quick) quick.insertAdjacentElement('beforebegin',panel); else root.appendChild(panel);
  }
  function setText(id,val){ const el=$('#'+id); if(el) el.textContent=String(val??'--'); }
  function renderDbPanel(){
    if(!$('#adminControl')?.classList.contains('active')) return;
    ensureDbLed(); ensureDbPanel();
    const s=dbStatus();
    const db=s.db;
    const led=$('#adminCtlDbPanelLed'); if(led) led.className='led '+ledClass(s.level);
    setText('adminCtlDbStatus',s.text);
    setText('adminCtlDbMode',modeLabel(s.mode));
    setText('adminCtlDbPath',s.path || '--');
    setText('adminCtlDbEndpoint',s.endpoint || (s.mode.indexOf('cloud')===0 ? 'fehlt' : 'nicht benötigt'));
    setText('adminCtlDbLastCheck',formatDate(db.lastCheckedAt));
    setText('adminCtlDbLastAction',entryDate(findDbAction()));
    const size=$('#adminCtlDbSize');
    if(size){
      const p=s.path||'';
      size.textContent='Browser-IndexedDB · Größe browserabhängig';
    }
    const note=$('#adminCtlDbNote'); if(note) note.textContent=s.details+' '+(db.note||'');
  }
  function openDatabaseSettings(){
    try{ sessionStorage.setItem('kng.adminLeitstand.returnWanted','1'); }catch(_){ }
    if(typeof window.showView==='function') window.showView('settings');
    setTimeout(()=>{
      const btn=document.querySelector('[data-settings-tab="settingsDatabase"]');
      btn?.click?.();
      (document.getElementById('settingsDatabase')||btn)?.scrollIntoView?.({behavior:'smooth',block:'start'});
    },120);
  }
  function bind(){
    if(document.__kng521DbMonitorBound) return; document.__kng521DbMonitorBound=true;
    document.addEventListener('click',ev=>{
      const led=ev.target.closest?.('#adminCtlDatabaseTopLed,[data-admin-led-target="database"]');
      if(led){ ev.preventDefault(); openDatabaseSettings(); return; }
      if(ev.target.closest?.('#adminCtlOpenDatabaseSettings')){ ev.preventDefault(); openDatabaseSettings(); return; }
      if(ev.target.closest?.('#adminCtlTestDatabaseSettings')){ ev.preventDefault(); document.getElementById('testDbSettings')?.click?.(); renderDbPanel(); return; }
    },true);
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__kng521DbWrapped!=='1'){
    const wrapped=function(){ const ret=old.apply(this,arguments); setTimeout(renderDbPanel,0); return ret; };
    wrapped.__kng521DbWrapped='1'; window.renderAdminControl=wrapped;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    bind();
    setTimeout(renderDbPanel,1000);
    setInterval(renderDbPanel,2500);
  });
  window.KNG_ADMIN_DB_MONITOR={renderDbPanel,dbStatus,openDatabaseSettings};
})();
