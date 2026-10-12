/* KC Verwaltung 54.8.16 – Datenbankeinstellungen im DP2-Betriebsmodell
   Supabase = Hauptdatenbank, IndexedDB = lokaler Offline-Puffer/Queue. */
(function(){
  'use strict';
  const SUPABASE_ENDPOINT='https://ptblnpiroqftcvlsrhac.supabase.co';
  const $=id=>document.getElementById(id);
  function ensureDbSettings(){
    if(!window.state)return null;
    state.settings=state.settings||{};
    state.settings.database=state.settings.database||{};
    const db=state.settings.database;
    db.mode='supabase-indexeddb';
    db.enabled=true;
    db.cloudReady=window.KNGCloudSync?.status?.sup==='ready';
    db.cloudEndpoint=SUPABASE_ENDPOINT;
    db.localPath='IndexedDB (Offline-Cache + Outbox)';
    db.note='DP2-Betriebsmodell: Supabase ist die Hauptdatenbank. IndexedDB puffert lokal bei Offline-/Verbindungsstörungen und gleicht nach Wiederverbindung kontrolliert ab.';
    return db;
  }
  function setVal(id,val){const el=$(id);if(el)el.value=val||'';}
  function setChecked(id,val){const el=$(id);if(el)el.checked=!!val;}
  function updateStatus(text,level='info'){const el=$('dbSettingsStatus');if(!el)return;el.className='db-status-box '+level;el.textContent=text;}
  function renderDbSettings(){
    const db=ensureDbSettings();if(!db)return;
    setChecked('dbEnabled',true);setVal('dbMode','supabase-indexeddb');setVal('dbLocalPath',db.localPath);setVal('dbCloudEndpoint',db.cloudEndpoint);setChecked('dbCloudReady',db.cloudReady);setVal('dbNote',db.note);
    ['dbEnabled','dbMode','dbLocalPath','dbCloudEndpoint','dbCloudReady','dbNote','chooseDbFile'].forEach(id=>{const el=$(id);if(el)el.disabled=true;});
    const info=$('dbInfoText');
    if(info)info.innerHTML='<b>Hauptdatenbank:</b> Supabase PostgreSQL (KC_WERNE)<br><b>Offline:</b> IndexedDB mit lokaler Outbox/Queue<br><b>Verhalten:</b> Änderungen werden lokal sofort gesichert und online unmittelbar an Supabase übertragen. Bei Ausfall bleiben sie in der Queue und werden nach Wiederverbindung abgeglichen.';
    const s=window.KNGCloudSync?.status||{};
    const txt=s.sup==='ready'?'Supabase online · IndexedDB-Offlinepuffer bereit · '+String(s.pending||0)+' offene Änderungen':(s.detail||'Supabase wird verbunden · IndexedDB-Offlinepuffer ist bereit.');
    updateStatus(txt,s.sup==='ready'?'ok':s.sup==='error'?'warn':'info');
  }
  async function testDbSettings(){
    const db=ensureDbSettings();
    updateStatus('Prüfe Supabase-Rundlauf …','info');
    try{
      if(window.KCCloudSession?.ready)await window.KCCloudSession.ready();
      if(!window.KNGCloudSync?.roundtrip)throw new Error('Cloud-Rundlauftest ist noch nicht geladen.');
      const row=await window.KNGCloudSync.roundtrip();
      db.cloudReady=true;db.lastCheckedAt=new Date().toISOString();
      updateStatus('OK · Supabase Read/Write-Rundlauf bestätigt · IndexedDB-Offlinepuffer aktiv'+(row?.message?' · '+row.message:''),'ok');
    }catch(e){
      db.cloudReady=false;db.lastCheckedAt=new Date().toISOString();
      updateStatus('Supabase-Test nicht erfolgreich: '+(e?.message||e)+' · Offline-Speicherung über IndexedDB bleibt verfügbar.','warn');
    }
  }
  function saveDbSettings(){ensureDbSettings();window.saveState?.();renderDbSettings();window.toast?.('Datenbankmodus ist fest auf Supabase + IndexedDB eingestellt.','success');}
  function exportDbConfig(){
    const db=ensureDbSettings();const payload={version:'KC-DB-DP2-MODEL-54.8.16',createdAt:new Date().toISOString(),database:db,hinweis:'Keine Zugangsdaten enthalten.'};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='KC_Verwaltung_Datenbankmodell_54_8_16.json';a.click();URL.revokeObjectURL(a.href);
  }
  function bind(){
    ensureDbSettings();$('saveDbSettings')?.addEventListener('click',saveDbSettings);$('testDbSettings')?.addEventListener('click',testDbSettings);$('exportDbConfig')?.addEventListener('click',exportDbConfig);
    const oldRender=window.renderSettings;if(typeof oldRender==='function'&&!window.__kng520RenderSettingsWrapped){window.__kng520RenderSettingsWrapped=true;window.renderSettings=function(){const r=oldRender.apply(this,arguments);renderDbSettings();return r;};}
    const oldSave=window.saveSettings;if(typeof oldSave==='function'&&!window.__kng520SaveSettingsWrapped){window.__kng520SaveSettingsWrapped=true;window.saveSettings=function(){const r=oldSave.apply(this,arguments);ensureDbSettings();window.saveState?.();renderDbSettings();return r;};}
    renderDbSettings();setInterval(renderDbSettings,3000);
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.KNG_DB_SETTINGS={ensureDbSettings,renderDbSettings,saveDbSettings,testDbSettings};
})();
