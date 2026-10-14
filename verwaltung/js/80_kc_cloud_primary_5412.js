/* KC Verwaltung 54.8.16 – Supabase als Hauptdatenbank, vollständiger fachlicher State */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const ORG='KC_WERNE';
  const TOKEN_KEY='kc_manager_access_token';
  const REFRESH_KEY='kc_manager_refresh_token';
  const DB_NAME='kng_kc_cloud_sync',DB_VERSION=1,OUTBOX='outbox';
  const NEVER_SYNC=new Set(['persistenceMeta','session']);
  const SENSITIVE_KEY=/(password|passwort|secret|token|credential|apikey|api_key|privatekey|private_key)/i;
  const old=window.KNGCloudSync||{};
  const status=old.status||{idx:'ready',sup:'offline',detail:'',lastSyncAt:'',pending:0,userId:'',score:25,tests:[]};
  let token='',membership=null,applyingRemote=false,syncing=false,hydrated=false,timer=0,syncTimer=0,resyncRequested=false,queueChain=Promise.resolve(),connectInProgress=false;
  let nachholFehler=0,letzterNotversuch=0; // 54.8.22
  const lastSynced=new Map();
  const remoteVersions=new Map();
  function userIdFromToken(t){try{const part=String(t||'').split('.')[1];if(!part)return '';const json=atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='));return String(JSON.parse(json)?.sub||'');}catch(_e){return '';}}
  const clone=v=>JSON.parse(JSON.stringify(v));
  const revOf=v=>Math.max(0,Number(v?.payload?.revision??v?.revision??0));
  const savedOf=v=>String(v?.payload?.savedAt||v?.updated_at||v?.queuedAt||'');
  const timeOf=v=>Date.parse(savedOf(v))||0;
  const led=(kind,state,detail)=>{try{window.KNGDbLedBridge?.setState?.(kind,state,detail);}catch(_e){}};
  const traffic=(kind,units=1)=>{try{window.KNGDbLedBridge?.traffic?.(kind,units);}catch(_e){}};

  function isPersistentTopKey(k){return typeof k==='string'&&/^[a-z][a-zA-Z0-9_]{1,79}$/.test(k)&&!NEVER_SYNC.has(k)&&!SENSITIVE_KEY.test(k);}
  function persistentKeys(snapshot){return Object.keys(snapshot||{}).filter(isPersistentTopKey);}
  function captureSyncBaseline(snapshot){for(const k of persistentKeys(snapshot||{}))lastSynced.set(k,JSON.stringify(sanitize(snapshot[k]??null)));}
  function sanitize(value){
    if(Array.isArray(value))return value.map(sanitize);
    if(!value||typeof value!=='object')return value;
    const out={};
    for(const [k,v] of Object.entries(value)){
      if(SENSITIVE_KEY.test(k))continue;
      out[k]=sanitize(v);
    }
    return out;
  }
  function memberUpdatedTime(m){
    const t=Date.parse(String(m?.updatedAt||m?.updated_at||''));
    return Number.isFinite(t)?t:0;
  }
  function mergeMembersByNewest(localMembers,remoteMembers){
    const local=Array.isArray(localMembers)?localMembers:[];
    const remote=Array.isArray(remoteMembers)?remoteMembers:[];
    const localById=new Map(local.map(m=>[String(m?.id||''),m]).filter(([id])=>id));
    return remote.map(r=>{
      const id=String(r?.id||'');
      const l=localById.get(id);
      if(!l)return clone(r);
      // Nach der Erstsynchronisation gewinnt pro Mitglied der neuere Datensatz.
      // Bei Gleichstand bleibt Supabase autoritativ.
      return memberUpdatedTime(l)>memberUpdatedTime(r)?clone(l):clone(r);
    });
  }
  function mergeRemote(local,remote){
    if(Array.isArray(remote))return clone(remote);
    if(!remote||typeof remote!=='object')return clone(remote);
    const base=(local&&typeof local==='object'&&!Array.isArray(local))?clone(local):{};
    for(const [k,v] of Object.entries(remote)){
      if(SENSITIVE_KEY.test(k))continue;
      base[k]=(v&&typeof v==='object'&&!Array.isArray(v))?mergeRemote(base[k],v):clone(v);
    }
    return base;
  }
  function paint(detail,stateName){status.sup=stateName||status.sup;if(detail)status.detail=detail;const visual=status.sup==='ready'?'ready':status.sup==='working'?'working':status.sup==='error'||status.sup==='offline'?'error':'warn';led('sup',visual,status.detail);try{const el=document.getElementById('kngSupState');if(el)el.className='kng-db-led '+visual;const t=document.getElementById('kngDbCompactText');if(t)t.textContent=status.pending?status.pending+' offen':status.sup==='ready'?'online':status.sup==='working'?'arbeitet':'lokal';const d=document.getElementById('kngDbOverviewDetail');if(d)d.textContent=status.detail;const l=document.getElementById('kngDbLastSync');if(l)l.textContent=status.lastSyncAt?new Date(status.lastSyncAt).toLocaleString('de-DE'):'noch nicht';const p=document.getElementById('kngDbPending');if(p)p.textContent=String(status.pending||0);}catch(_e){}}
  function openDb(){traffic('idx',.7);return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){led('idx','error','IndexedDB ist in diesem Browser nicht verfügbar');reject(new Error('IndexedDB nicht verfügbar'));return;}const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(OUTBOX))d.createObjectStore(OUTBOX,{keyPath:'sectionKey'});if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'key'});};q.onsuccess=()=>{led('idx','ready','IndexedDB verbunden');traffic('idx',.8);resolve(q.result);};q.onerror=()=>{led('idx','error','IndexedDB-Fehler: '+String(q.error?.message||q.error||'unbekannt'));reject(q.error);};});}
  async function allOutbox(){const db=await openDb();try{return await new Promise((res,rej)=>{const q=db.transaction(OUTBOX,'readonly').objectStore(OUTBOX).getAll();q.onsuccess=()=>{traffic('idx',Math.max(1,(q.result||[]).length/4));led('idx','ready','IndexedDB bereit');res(q.result||[]);};q.onerror=()=>rej(q.error);});}finally{db.close();}}
  async function putOutbox(v){const db=await openDb();try{return await new Promise((res,rej)=>{const tx=db.transaction(OUTBOX,'readwrite');tx.objectStore(OUTBOX).put(v);tx.oncomplete=()=>{traffic('idx',2);led('idx','ready','IndexedDB bereit');res(v);};tx.onerror=()=>rej(tx.error);});}finally{db.close();}}
  async function delOutbox(k){const db=await openDb();try{return await new Promise((res,rej)=>{const tx=db.transaction(OUTBOX,'readwrite');tx.objectStore(OUTBOX).delete(k);tx.oncomplete=()=>{traffic('idx',1.4);led('idx','ready','IndexedDB bereit');res();};tx.onerror=()=>rej(tx.error);});}finally{db.close();}}
  async function clearOutbox(){const db=await openDb();try{return await new Promise((res,rej)=>{const tx=db.transaction(OUTBOX,'readwrite');tx.objectStore(OUTBOX).clear();tx.oncomplete=()=>{traffic('idx',2.2);led('idx','ready','IndexedDB bereit');res();};tx.onerror=()=>rej(tx.error);});}finally{db.close();}}
  async function api(path,opt={},allowRefresh=true){
    const reqBytes=typeof opt.body==='string'?opt.body.length:0;traffic('sup',Math.max(1,Math.min(8,reqBytes/1800+1)));
    const headers={apikey:KEY,'Content-Type':'application/json',Accept:'application/json',...(opt.headers||{})};
    if(token)headers.Authorization='Bearer '+token;
    const r=await fetch(SUPA+path,{...opt,headers,cache:'no-store'});
    const text=await r.text();traffic('sup',Math.max(1,Math.min(10,text.length/2200+1)));let data=null;try{data=text?JSON.parse(text):null;}catch(_){data=text;}
    if(!r.ok){
      const msg=String(data?.message||data?.error_description||data?.error||data?.hint||('HTTP '+r.status));
      const authExpired=r.status===401||/jwt\s*expired|token.*expired|invalid.*jwt/i.test(msg);
      if(allowRefresh&&authExpired&&window.KCCloudSession?.refresh){
        const ok=await window.KCCloudSession.refresh();
        if(ok){
          token=sessionStorage.getItem(TOKEN_KEY)||'';
          status.userId=userIdFromToken(token)||status.userId;
          return api(path,opt,false);
        }
      }
      throw new Error(msg);
    }
    return data;
  }
  async function membershipCheck(){const data=await api('/rest/v1/rpc/kc_manager_current_membership',{method:'POST',body:JSON.stringify({p_org_id:ORG})});const row=Array.isArray(data)?data[0]:data;if(!row?.active)throw new Error('Keine aktive Berechtigung für KC Verwaltung.');membership=row;return row;}
  async function pull(){const data=await api('/rest/v1/kc_manager_state_sections?select=section_key,payload,version,updated_at&org_id=eq.'+encodeURIComponent(ORG)+'&order=section_key.asc',{method:'GET'});return Array.isArray(data)?data:[];}
  async function pushRow(row,remoteMap){if(!status.userId)status.userId=userIdFromToken(token);if(!status.userId)throw new Error('Cloud-Sitzung ohne Benutzer-ID. Automatische Neuanmeldung/Token-Erneuerung erforderlich.');const remote=remoteMap.get(row.sectionKey),body={org_id:ORG,section_key:row.sectionKey,payload:row.payload,version:Math.max(0,Number(remote?.version||0))+1,updated_at:new Date().toISOString(),updated_by:status.userId};await api('/rest/v1/kc_manager_state_sections?on_conflict=org_id,section_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});lastSynced.set(row.sectionKey,JSON.stringify(sanitize(row.payload?.data)));await delOutbox(row.sectionKey);}

  async function queueSnapshotInternal(snapshot){
    if(applyingRemote||!snapshot)return false;
    // WICHTIG: Vor dem ersten erfolgreichen Cloud-Abgleich darf ein frischer/alter
    // lokaler Startzustand niemals Supabase überschreiben. Lokal speichert weiterhin
    // die Durable-Storage-Schicht; die Cloud-Outbox startet erst nach Hydration.
    if(!hydrated){status.pending=(await allOutbox()).length;paint('Lokaler Cache aktiv · Supabase-Erstabgleich steht noch aus.',token?'working':'offline');return false;}
    const queuedAt=new Date().toISOString(),revision=Math.max(0,Number(snapshot?.persistenceMeta?.revision||0)),savedAt=snapshot?.persistenceMeta?.updatedAt||queuedAt;
    for(const k of persistentKeys(snapshot)){
      const data=sanitize(snapshot[k]??null),signature=JSON.stringify(data);
      if(lastSynced.get(k)===signature)continue;
      await putOutbox({sectionKey:k,safeOrigin:'post-hydration-v2',baseVersion:remoteVersions.has(k)?Number(remoteVersions.get(k)):null,payload:{schema:'KC_MANAGER_SECTION_V2',savedAt,revision,data},queuedAt});
    }
    status.pending=(await allOutbox()).length;paint();
    if(token && navigator.onLine) requestSync(80);
    return true;
  }
  function queueSnapshot(snapshot){
    const snap=clone(snapshot);
    queueChain=queueChain.then(()=>queueSnapshotInternal(snap)).catch(e=>{console.warn('KC Cloud Outbox',e);return false;});
    return queueChain;
  }

  function requestSync(delay=80){
    resyncRequested=true;
    if(syncing)return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(async()=>{
      syncTimer=0;
      if(!navigator.onLine)return;
      resyncRequested=false;
      try{await syncNow();}catch(_e){}
    },Math.max(0,Number(delay)||0));
  }

  async function applyRemote(rows,initial=false){
    if(!rows.length)return false;
    const usable=rows.filter(r=>isPersistentTopKey(r.section_key)&&/^KC_MANAGER_SECTION_V[12]$/.test(String(r.payload?.schema||'')));
    if(!usable.length)return false;
    const remoteRev=Math.max(0,...usable.map(revOf));
    applyingRemote=true;
    try{
      for(const r of usable){
        const key=r.section_key;
        remoteVersions.set(key,Math.max(0,Number(r.version||0)));
        if(key==='members' && !initial){
          window.state[key]=mergeMembersByNewest(window.state?.[key],r.payload.data);
        }else{
          window.state[key]=mergeRemote(window.state?.[key],r.payload.data);
        }
        lastSynced.set(key,JSON.stringify(sanitize(r.payload.data)));
      }
      const latest=usable.map(savedOf).filter(Boolean).sort().pop()||new Date().toISOString();
      window.state.persistenceMeta={...(window.state.persistenceMeta||{}),updatedAt:latest,revision:Math.max(remoteRev,Number(window.state?.persistenceMeta?.revision||0)),storage:'Supabase-Hauptdatenbank + lokaler Offline-Cache'};
      if(typeof window.migrateState==='function'){const m=window.migrateState(window.state);Object.keys(window.state).forEach(k=>delete window.state[k]);Object.assign(window.state,m);}
      // Der geladene und migrierte Cloud-Stand ist jetzt die verbindliche Basis.
      // Dadurch erzeugt die anschließende KC-Anmeldung keine Phantom-Outbox aus
      // rein lokalen Migrations-/Darstellungsanpassungen.
      captureSyncBaseline(window.state);
      if(typeof window.saveState==='function')window.saveState();
      if(typeof window.renderAll==='function'){
        const memberDirty=typeof window.memberIsDirty==='function' && window.memberIsDirty();
        if(!memberDirty)window.renderAll();
      }
      return true;
    }finally{applyingRemote=false;}
  }

  async function holdPending(row,reason,remoteRow=null){
    const held={...row,held:true,holdReason:String(reason||'conflict'),heldAt:new Date().toISOString(),remoteVersion:remoteRow?Math.max(0,Number(remoteRow.version||0)):null};
    await putOutbox(held);
    return held;
  }

  async function reconcilePending(remote){
    const map=new Map(remote.map(r=>[r.section_key,r]));
    const pending=await allOutbox();
    for(const row of pending){
      if(!isPersistentTopKey(row.sectionKey)){await holdPending(row,'unknown-section');continue;}
      if(row.held)continue;
      const rr=map.get(row.sectionKey);
      if(!rr){
        // Ein neuer Bereich darf nur dann automatisch angelegt werden, wenn er
        // nach erfolgreicher Hydration entstanden ist.
        if(row.safeOrigin==='post-hydration-v2')await pushRow(row,map);
        else await holdPending(row,'legacy-before-cloud');
        continue;
      }
      const remoteVersion=Math.max(0,Number(rr.version||0));
      const baseVersion=row.baseVersion==null?null:Math.max(0,Number(row.baseVersion));
      if(row.safeOrigin!=='post-hydration-v2'){
        await holdPending(row,'legacy-before-cloud',rr);
        continue;
      }
      if(baseVersion===null||remoteVersion!==baseVersion){
        // Supabase hat sich seit dem lokalen Änderungsbeginn verändert.
        // Niemals automatisch überschreiben und niemals die lokale Änderung löschen.
        await holdPending(row,'remote-changed',rr);
        continue;
      }
      await pushRow(row,map);
    }
    return true;
  }

  async function syncNow(){
    if(syncing){resyncRequested=true;return false;}
    if(window.KCCloudSession?.ready) await window.KCCloudSession.ready();
    token=sessionStorage.getItem(TOKEN_KEY)||token;
    if(!token){paint('Supabase nicht authentifiziert · Anmeldung erfolgt gemeinsam mit KC Verwaltung.','offline');return false;}
    status.userId=userIdFromToken(token)||status.userId;
    syncing=true;paint('Supabase-Hauptdatenbank wird abgeglichen.','working');
    try{
      await queueChain;
      await membershipCheck();
      let remote=await pull();
      // Erster Abgleich jeder Programmsitzung: Supabase ist Master. Nur Outbox-
      // Eintraege, die nach einer bereits erfolgreichen Hydration dieser sicheren
      // Sync-Version entstanden sind, duerfen spaeter wieder hochgeladen werden.
      if(!hydrated){
        const pending=await allOutbox();
        for(const row of pending){
          // Alles, was aus einer früheren Sitzung stammt, bleibt vollständig erhalten,
          // wird aber vor der neuen Cloud-Hydration auf HOLD gesetzt.
          await holdPending(row,'startup-before-cloud',new Map(remote.map(r=>[r.section_key,r])).get(row.sectionKey)||null);
        }
        await applyRemote(remote,true);
        hydrated=true;
        await reconcilePending(remote);
        remote=await pull();
        await applyRemote(remote);
      }else{
        await reconcilePending(remote);
        remote=await pull();
        await applyRemote(remote);
      }
      const remaining=await allOutbox(),heldCount=remaining.filter(x=>x.held).length;
      status.pending=remaining.length;
      status.lastSyncAt=new Date().toISOString();status.score=100;
      paint(heldCount
        ? `Supabase zuerst geladen · ${heldCount} lokale Änderung${heldCount===1?'':'en'} sicher zurückgehalten und nicht automatisch überschrieben.`
        : status.pending
          ? 'Supabase verbunden · '+status.pending+' lokale Änderungen warten noch.'
          : 'Supabase ist aktuell · alle fachlichen Daten sind abgeglichen.','ready');
      return status.pending===0;
    }catch(e){letzterNotversuch=Date.now();nachholFehler=Math.min(nachholFehler+1,7);paint('Cloud-Sync fehlgeschlagen: '+e.message,'error');throw e;}finally{
      syncing=false;
      const pending=await allOutbox().catch(()=>[]);
      status.pending=pending.length;
      // 54.8.22 (14.10.2026, Datenbank-Stau): zurückgehaltene Änderungen (held) werden nie automatisch hochgeladen –
      // sie dürfen also auch keinen neuen Abgleich auslösen (vorher Endlosschleife alle ~0,1 s + Antwortzeit).
      // Bleibt etwas offen, das nicht hochging: wachsender Abstand 5 s … 5 Min. statt sofort erneut.
      status.offen=pending.filter(x=>!x.held).length;
      if(status.offen>0&&!resyncRequested)nachholFehler=Math.min(nachholFehler+1,7);else if(status.offen===0&&status.sup!=='error')nachholFehler=0;
      if(navigator.onLine && token && (resyncRequested||status.offen>0))requestSync(resyncRequested?120:Math.min(300000,5000*Math.pow(2,Math.max(0,nachholFehler-1))));
    }
  }

  function startBackstop(){clearInterval(timer);timer=setInterval(()=>{if(!navigator.onLine||!token||syncTimer)return;if(Number(status.offen||0)>0||resyncRequested||((status.sup==='error'||status.sup==='offline')&&Date.now()-letzterNotversuch>Math.min(300000,10000*Math.pow(2,nachholFehler))))requestSync(0);},10000);} // 54.8.22: held zählt nicht, kein Doppelstart, Fehler mit Abstand
  async function adoptSession(){const t=sessionStorage.getItem(TOKEN_KEY)||'';if(!t)return false;token=t;status.userId=userIdFromToken(t)||status.userId;try{await syncNow();startBackstop();return true;}catch(_e){return false;}}
  async function connect(email,password,options={}){
    if(!String(email||'').includes('@')||!password)throw new Error('E-Mail-Adresse und Passwort erforderlich.');
    paint('KC-Anmeldung authentifiziert Supabase.','working');
    connectInProgress=true;
    try{
      if(!window.KCCloudSession?.signIn)throw new Error('Supabase-Authentifizierung ist noch nicht bereit.');
      const data=await window.KCCloudSession.signIn(String(email).trim(),String(password));
      token=sessionStorage.getItem(TOKEN_KEY)||String(data?.access_token||'');
      status.userId=data?.user?.id||userIdFromToken(token)||'';
      if(!token)throw new Error('Supabase hat keine gültige Sitzung zurückgegeben.');
      const ok=await syncNow();
      if(!hydrated)throw new Error('Supabase-Daten konnten nicht vollständig geladen werden.');
      startBackstop();
      if(!options?.silent)window.toast?.('Supabase verbunden. Der neueste Datenbestand ist geladen.','success');
      return ok || status.sup==='ready';
    }catch(e){
      token='';membership=null;hydrated=false;
      try{window.KCCloudSession?.clear?.();}catch(_e){}
      paint('Supabase-Anmeldung fehlgeschlagen: '+String(e?.message||e),'error');
      throw e;
    }finally{ connectInProgress=false; }
  }
  async function flush(){try{if(typeof window.saveState==='function')window.saveState();return await syncNow();}catch(_e){return false;}}
  async function signOut(){try{await flush();}catch(_e){}try{if(token)await api('/auth/v1/logout',{method:'POST'});}catch(_e){}token='';membership=null;hydrated=false;clearInterval(timer);sessionStorage.removeItem(TOKEN_KEY);localStorage.removeItem(REFRESH_KEY);paint('IndexedDB aktiv · Supabase abgemeldet','offline');return true;}
  async function roundtrip(){const nonce='kc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),data=await api('/rest/v1/rpc/kc_manager_diagnostic_roundtrip',{method:'POST',body:JSON.stringify({p_org_id:ORG,p_project_id:'KC_MANAGER',p_nonce:nonce})}),row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error(row?.message||'Cloud-Rundlauf nicht bestätigt.');return row;}

  async function heldChanges(){return (await allOutbox()).filter(x=>x.held).map(clone)}
  async function approveHeld(sectionKey){
    const rows=await allOutbox(),row=rows.find(x=>x.sectionKey===sectionKey&&x.held);
    if(!row)throw new Error('Zurückgehaltene Änderung nicht gefunden.');
    const remote=await pull(),rr=new Map(remote.map(r=>[r.section_key,r])).get(sectionKey);
    // Explizite Freigabe setzt bewusst den aktuell gelesenen Remote-Stand als Basis.
    await putOutbox({...row,held:false,holdReason:null,baseVersion:rr?Math.max(0,Number(rr.version||0)):null,safeOrigin:'post-hydration-v2-approved',approvedAt:new Date().toISOString()});
    return true;
  }
  window.KNGCloudSync={...old,version:'1.11.0-cloud-first-safe-pending',status,queueSnapshot,connect,syncNow,flush,signOut,roundtrip,adoptSession,isHydrated:()=>hydrated,persistentKeys,currentMembership:()=>membership?{...membership}:null,heldChanges,approveHeld};
  window.addEventListener('kc:cloud-session',e=>{if(e.detail?.connected&&!connectInProgress)setTimeout(adoptSession,20);});
  window.addEventListener('online',()=>{paint('Internet wieder verfügbar · Offline-Queue wird abgeglichen.','working');adoptSession().then(()=>requestSync(0)).catch(()=>{});});
  window.addEventListener('offline',()=>paint('Offline · IndexedDB puffert Änderungen bis Supabase wieder erreichbar ist.','offline'));
  window.addEventListener('pagehide',()=>{try{window.saveState?.();window.KNGCloudSync?.syncNow?.().catch(()=>{});}catch(_e){}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){try{window.saveState?.();if(Number(window.KNGCloudSync?.status?.offen||0)>0)window.KNGCloudSync?.syncNow?.().catch(()=>{});}catch(_e){}}}); // 54.8.22: nur wenn wirklich etwas offen ist
  const start=()=>setTimeout(async()=>{try{if(window.KCCloudSession?.ready)await window.KCCloudSession.ready();await adoptSession();}catch(_e){}},120);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
