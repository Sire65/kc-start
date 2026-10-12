/* KC Verwaltung: doppelte, verifizierte lokale Datensicherung */
(function(){
  'use strict';

  const COMM_TOKEN_KEY='kc_manager_access_token';
  if(!window.__kngCommAuthCaptureInstalled){
    window.__kngCommAuthCaptureInstalled=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const response=await nativeFetch(input,init);
      try{
        const url=typeof input==='string'?input:String(input?.url||'');
        if(url.includes('/auth/v1/token')&&response.ok){
          const data=await response.clone().json();
          if(data?.access_token)sessionStorage.setItem(COMM_TOKEN_KEY,String(data.access_token));
        }
        if(url.includes('/auth/v1/logout')&&response.ok)sessionStorage.removeItem(COMM_TOKEN_KEY);
      }catch(_error){}
      return response;
    };
  }

  const DB_NAME='kng_kc_verwaltung_durable';
  const DB_VERSION=1;
  const STORE_NAME='snapshots';
  const SNAPSHOT_KEY=typeof STORAGE_KEY!=='undefined' ? STORAGE_KEY : 'kng_v1_clean_master_test31_membercards';
  let writeQueue=Promise.resolve();

  function signalIdbTraffic(){
    try{ window.dispatchEvent(new CustomEvent('kng:idb-traffic')); }catch(_error){}
    try{ window.KNGCloudSync?.recordIdbTraffic?.(); }catch(_error){}
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)) return reject(new Error('IndexedDB ist nicht verfügbar.'));
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME,{keyPath:'key'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Sicherungsdatenbank konnte nicht geöffnet werden.'));
    });
  }

  async function readSnapshot(){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const request=db.transaction(STORE_NAME,'readonly').objectStore(STORE_NAME).get(SNAPSHOT_KEY);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=()=>reject(request.error||new Error('Sicherung konnte nicht gelesen werden.'));
      });
    }finally{ db.close(); }
  }

  async function writeSnapshot(snapshot){
    signalIdbTraffic();
    const db=await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE_NAME,'readwrite');
        tx.objectStore(STORE_NAME).put({key:SNAPSHOT_KEY,savedAt:snapshot.persistenceMeta.updatedAt,state:snapshot});
        tx.oncomplete=()=>{ signalIdbTraffic(); resolve(); };
        tx.onerror=()=>reject(tx.error||new Error('Sicherung konnte nicht geschrieben werden.'));
        tx.onabort=()=>reject(tx.error||new Error('Sicherung wurde abgebrochen.'));
      });
    }finally{ db.close(); }
  }

  function queueSnapshot(snapshot){
    writeQueue=writeQueue.catch(()=>undefined).then(()=>writeSnapshot(snapshot));
    writeQueue.catch(showSaveError);
    return writeQueue;
  }

  function showSaveError(error){
    console.error('Dauerhafte Speicherung fehlgeschlagen:',error);
    try{
      if(typeof window.toast==='function') window.toast('Speichern fehlgeschlagen. Bitte Datensicherung exportieren und die Seite nicht schließen.','error');
    }catch(_error){}
  }

  function verifiedSave(){
    const now=new Date().toISOString();
    const revision=Math.max(0,Number(state?.persistenceMeta?.revision||0))+1;
    state.persistenceMeta={...(state.persistenceMeta||{}),updatedAt:now,revision,storage:'localStorage+IndexedDB'};
    let serialized;
    try{
      serialized=JSON.stringify(state);
      localStorage.setItem(SNAPSHOT_KEY,serialized);
      if(localStorage.getItem(SNAPSHOT_KEY)!==serialized) throw new Error('Schreibkontrolle des Browser-Speichers fehlgeschlagen.');
      if(typeof window.updateStatusBar==='function') window.updateStatusBar();
    }catch(error){
      showSaveError(error);
      return false;
    }

    const snapshot=JSON.parse(serialized);
    queueSnapshot(snapshot);
    if(window.KNGCloudSync?.queueSnapshot) window.KNGCloudSync.queueSnapshot(snapshot).catch(showSaveError);
    return true;
  }

  window.saveState=verifiedSave;

  window.KNGDurableStorage={
    async restore(){
      let backup=null;
      try{ backup=await readSnapshot(); }
      catch(error){ console.warn('Zweite lokale Sicherung ist derzeit nicht verfügbar:',error); }

      const localTime=Date.parse(state?.persistenceMeta?.updatedAt||'')||0;
      const backupTime=Date.parse(backup?.savedAt||backup?.state?.persistenceMeta?.updatedAt||'')||0;
      const localRevision=Number(state?.persistenceMeta?.revision||0);
      const backupRevision=Number(backup?.state?.persistenceMeta?.revision||0);
      const backupIsNewer=backupRevision>localRevision || (backupRevision===localRevision && backupTime>localTime);
      if(backup?.state && backupIsNewer){
        try{
          const restored=typeof migrateState==='function' ? migrateState(backup.state) : backup.state;
          Object.keys(state).forEach(key=>delete state[key]);
          Object.assign(state,restored);
          const serialized=JSON.stringify(state);
          localStorage.setItem(SNAPSHOT_KEY,serialized);
          console.info('KC-Verwaltung: Neuere Sicherung automatisch wiederhergestellt.');
        }catch(error){ showSaveError(error); }
      }

      if(!state.persistenceMeta?.updatedAt){
        state.persistenceMeta={...(state.persistenceMeta||{}),updatedAt:new Date().toISOString(),revision:1,storage:'localStorage+IndexedDB'};
      }
      try{ await queueSnapshot(JSON.parse(JSON.stringify(state))); }
      catch(error){ console.warn('Anfangssicherung konnte nicht gespiegelt werden:',error); }
      return true;
    },
    saveNow:verifiedSave,
    readSnapshot
  };

  window.addEventListener('pagehide',()=>{ try{ verifiedSave(); }catch(_error){} });
})();