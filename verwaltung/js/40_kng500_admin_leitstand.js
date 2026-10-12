/* KNG 50.0 Admin-Leitstand
   Eigenes verborgenes Admin-Modul. Zugang: 5x auf das Clublogo links klicken, dann PIN (Standard 4711).
*/
(function(){
  'use strict';
  const ACCESS_KEY='kng.adminLeitstand.unlocked';
  const START_KEY='kng.adminLeitstand.startPage';
  const REMEMBER_KEY='kng.adminLeitstand.remember';
  const PIN_KEY='kng.adminLeitstand.pin';
  const DEFAULT_PIN='4711';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function st(){ return window.state || {}; }
  function isSuperAdmin(){
    const sess=st().session||{};
    const r=String(sess.role||'').toLowerCase();
    const u=String(sess.userName||sess.user||'').trim().toLowerCase();
    const configured=String(st().settings?.superAdminUserName || localStorage.getItem('kng.superadmin.user') || 'Admin').trim().toLowerCase();
    return (r==='admin' || r==='systeminhaber') && (u===configured || u==='admin' || u==='hans' || u==='hans-joachim koch' || u==='ha-joko@web.de');
  }
  function isAdmin(){ return isSuperAdmin(); }
  function logged(){ return !!st().session?.isLoggedIn; }
  function esc(x){ return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function nowTime(){ return new Date().toLocaleTimeString('de-DE'); }
  function getPin(){ return String(st().settings?.adminControlPin || localStorage.getItem(PIN_KEY) || DEFAULT_PIN); }
  function setPin(pin){
    const clean=String(pin||'').trim(); if(!clean) return false;
    st().settings = st().settings || {}; st().settings.adminControlPin=clean;
    localStorage.setItem(PIN_KEY,clean);
    try{ window.saveState?.(); }catch(_){ }
    return true;
  }
  function toast(msg,type='info'){ try{ window.toast?.(msg,type); }catch(_){ console.log(msg); } }
  function log(module,action,details){ try{ window.logAction?.(module,action,details||''); }catch(_){ } }
  function setText(id,val){ const el=$('#'+id); if(el) el.textContent=String(val??'--'); }
  function detectBrowser(){
    const ua=navigator.userAgent||'';
    if(/Edg\//.test(ua)) return 'Microsoft Edge';
    if(/Chrome\//.test(ua)) return 'Chrome';
    if(/Firefox\//.test(ua)) return 'Firefox';
    if(/Safari\//.test(ua)) return 'Safari';
    return 'Unbekannt';
  }
  function latestByAction(list, pattern){
    const rx = pattern instanceof RegExp ? pattern : new RegExp(String(pattern),'i');
    return (Array.isArray(list)?list:[]).find(x=>rx.test(String(x.action||x.module||x.details||'')));
  }
  function latestLogout(){
    const e=(Array.isArray(st().protocol)?st().protocol:[]).find(x=>/Abmeldung/i.test(String(x.action||'')));
    if(!e) return '--';
    return `${e.time||''} · ${e.user||''}`.trim();
  }
  function backupStatus(){
    const list=Array.isArray(st().backupProtocol)?st().backupProtocol:[];
    const last=list[0];
    const fail=list.find(x=>/fehl|error|abbruch/i.test(String(x.action+' '+x.details)));
    if(!last) return {label:'KEINE DATEN', cls:'warn', led:'led-yellow', last:'--'};
    const txt=String(last.action+' '+last.details);
    if(/fehl|error|abbruch/i.test(txt)) return {label:'FEHLER', cls:'error', led:'led-red', last:`${last.date||''} ${last.time||''}`};
    return {label:'OK', cls:'ok', led:'led-green', last:`${last.date||''} ${last.time||''}`};
  }
  function systemStatus(){
    const last=st().lastSystemCheck;
    let overall = String(last?.summary?.overall || $('#cardSystem')?.textContent || 'OK').trim().toUpperCase();
    if(!overall) overall='OK';
    const cls = overall.includes('FEHL') ? 'error' : (overall.includes('WARN') ? 'warn' : 'ok');
    return {overall, cls, led: cls==='ok'?'led-green':(cls==='warn'?'led-yellow':'led-red')};
  }
  function renderEvents(){
    const box=$('#adminCtlEventConsole'); if(!box) return;
    const list=(Array.isArray(st().protocol)?st().protocol:[]).slice(0,18);
    box.innerHTML = list.length ? list.map(e=>`<div><strong>${esc(e.time||'')}</strong> · ${esc(e.user||'')} → ${esc(e.module||'')} / ${esc(e.action||'')} <span>${esc(e.details||'')}</span></div>`).join('') : '<div>Keine Protokolleinträge vorhanden.</div>';
  }
  function renderAlarms(sys, backup){
    const box=$('#adminCtlAlarms'); if(!box) return;
    const alarms=[];
    if(sys.cls!=='ok') alarms.push({txt:'Systemcheck meldet '+sys.overall, ok:false});
    if(backup.cls==='error') alarms.push({txt:'Letzte Datensicherung/Rücksicherung fehlerhaft', ok:false});
    if((Array.isArray(st().protocol)?st().protocol.length:0)>Number(st().settings?.protocolLimit||500)) alarms.push({txt:'Protokollgrenze überschritten', ok:false});
    if(!navigator.onLine) alarms.push({txt:'Browser meldet offline', ok:false});
    if(!alarms.length) alarms.push({txt:'Keine aktuellen Alarme. Leitstand im grünen Bereich.', ok:true});
    box.innerHTML=alarms.map(a=>`<div class="alarm-item ${a.ok?'ok':''}">${a.ok?'🟢':'⚠️'} ${esc(a.txt)}</div>`).join('');
    const led=$('#adminCtlAlarmLed'); if(led){ led.className='led '+(alarms.every(a=>a.ok)?'led-green':'led-yellow'); }
  }
  function renderAdminControl(){
    if(!$('#adminControl')) return;
    const session=st().session||{};
    setText('adminCtlUser', session.userName || 'Gast');
    setText('adminCtlCurrentUser', session.userName || 'Gast');
    setText('adminCtlRole', session.role || 'Gast');
    setText('adminCtlLoginSince', session.loginSince || '--');
    setText('adminCtlLastLogout', latestLogout());
    setText('adminCtlClock', nowTime());
    setText('adminCtlSessionTime', session.loginSince || '--');
    const sys=systemStatus();
    const status=$('#adminCtlSystemStatus'); if(status){ status.textContent=sys.overall; status.className='admin-big-status '+(sys.cls==='warn'?'warn':sys.cls==='error'?'error':''); }
    const sysLed=$('#adminCtlSystemLed'); if(sysLed) sysLed.className='led '+sys.led;
    const b=backupStatus();
    setText('adminCtlBackupStatus', b.label);
    const bl=$('#adminCtlBackupLed'); if(bl) bl.className='led '+b.led;
    setText('adminCtlLastBackup', latestByAction(st().backupProtocol,/Sicherung|Datensicherung/i)?.date ? `${latestByAction(st().backupProtocol,/Sicherung|Datensicherung/i).date} ${latestByAction(st().backupProtocol,/Sicherung|Datensicherung/i).time||''}` : '--');
    setText('adminCtlLastRestore', latestByAction(st().backupProtocol,/Rücksicherung/i)?.date ? `${latestByAction(st().backupProtocol,/Rücksicherung/i).date} ${latestByAction(st().backupProtocol,/Rücksicherung/i).time||''}` : '--');
    setText('adminCtlBackupCount', (Array.isArray(st().backupProtocol)?st().backupProtocol.length:0));
    setText('adminCtlBrowser', detectBrowser());
    setText('adminCtlScreen', `${screen.width}×${screen.height}`);
    setText('adminCtlViewport', `${innerWidth}×${innerHeight}`);
    setText('adminCtlDom', document.querySelectorAll('*').length);
    setText('adminCtlProtocolCount', (Array.isArray(st().protocol)?st().protocol.length:0));
    setText('adminCtlMembersCount', (typeof getMemberCount==='function' ? getMemberCount() : (Array.isArray(st().members)?st().members.length:0)));
    setText('adminCtlDocsCount', (Array.isArray(st().documents)?st().documents.length:0));
    setText('adminCtlSystemChecks', (Array.isArray(st().systemCheckProtocol)?st().systemCheckProtocol.length:0));
    setText('adminCtlActivities', (Array.isArray(st().protocol)?st().protocol.length:0));
    const net=$('#adminCtlInternetLed'); if(net) net.className='led '+(navigator.onLine?'led-green':'led-red');
    const c=$('#adminCtlConsole'); if(c){
      c.textContent = `> ADMIN-LEITSTAND\n> Benutzer: ${session.userName||'Gast'} (${session.role||'Gast'})\n> Systemstatus: ${sys.overall}\n> Backupstatus: ${b.label}\n> Protokolleinträge: ${(Array.isArray(st().protocol)?st().protocol.length:0)}\n> Letzter Systemcheck: ${st().lastSystemCheck?.environment?.createdAtLocal || '--'}\n> Bereit.`;
    }
    renderEvents(); renderAlarms(sys,b);
    const cbStart=$('#adminCtlStartPage'); if(cbStart) cbStart.checked = localStorage.getItem(START_KEY)==='1' || st().settings?.adminControlStartPage===true;
    const cbRemember=$('#adminCtlRememberAccess'); if(cbRemember) cbRemember.checked = localStorage.getItem(REMEMBER_KEY)==='1';
    const cbCheck=$('#adminCtlCheckOnStart'); if(cbCheck) cbCheck.checked = st().settings?.systemCheckOnStart===true || localStorage.getItem('kng.systemcheck.autostart')==='1';
  }
  window.renderAdminControl = renderAdminControl;

  function openAdminControl(source='secret'){
    if(!logged()){ toast('Bitte zuerst anmelden.','error'); return false; }
    if(!isSuperAdmin()){ toast('Schaltzentrale nur für Superadmin.','error'); log('Sicherheit','Kleiner Systemcheck abgelehnt','Benutzer/Rolle: '+(st().session?.userName||'Gast')+' / '+(st().session?.role||'Gast')); return false; }
    sessionStorage.setItem(ACCESS_KEY,'1');
    if(localStorage.getItem(REMEMBER_KEY)==='1') localStorage.setItem(ACCESS_KEY,'1');
    renderAdminControl();
    if(typeof window.showView==='function') window.showView('adminControl'); else $('#adminControl')?.classList.add('active');
    log('System','Kleiner Systemcheck durchgeführt', source==='Startseite' ? 'automatischer Start' : 'interne Prüfung');
    return true;
  }
  window.openAdminControl = openAdminControl;

  function requestSecretAccess(){
    if(!logged()){ toast('Bitte zuerst anmelden.','error'); return; }
    if(!isSuperAdmin()){ toast('Nur Superadmin darf die Schaltzentrale öffnen.','error'); log('Sicherheit','Kleiner Systemcheck abgelehnt','Geheimzugang verweigert'); return; }
    const pin=prompt('Admin-Leitstand\nBitte 4-stellige Geheimzahl eingeben:');
    if(pin===null) return;
    if(String(pin)===getPin()){
      toast('Admin-Leitstand freigegeben.','success');
      openAdminControl('Geheimcode');
    }else{
      toast('Falsche Geheimzahl.','error');
      log('Sicherheit','Admin-Leitstand Geheimcode falsch','Benutzer: '+(st().session?.userName||'Gast'));
    }
  }

  function bindSecretClick(){
    const logo=$('#brandLogoBox'); if(!logo || logo.dataset.adminSecretBound==='1') return;
    logo.dataset.adminSecretBound='1';
    let clicks=0, timer=null;
    logo.removeAttribute('title'); logo.dataset.noTooltip='1';
    logo.addEventListener('click',()=>{
      clicks++;
      clearTimeout(timer);
      if(clicks>=5){ clicks=0; requestSecretAccess(); return; }
      timer=setTimeout(()=>{clicks=0;},2500);
    });
  }
  function injectSettings(){
    const tabBar=$('.settings-tabs');
    const pref=$('#settingsSecretariatPrefs');
    if(tabBar && !$('#settingsAdminControlTabBtn')){
      const b=document.createElement('button'); b.className='tab superadmin-only'; b.type='button'; b.id='settingsAdminControlTabBtn'; b.dataset.settingsTab='settingsAdminControl'; b.textContent='Admin-Leitstand'; tabBar.appendChild(b);
    }
    if(pref && !$('#settingsAdminControl')){
      const div=document.createElement('div'); div.id='settingsAdminControl'; div.className='settings-tab';
      div.innerHTML=`<h4>Admin-Leitstand</h4><p class="hint">Geheimes technisches Überwachungsmodul. Zugang über 5× Klick auf das Clublogo links und PIN.</p>
        <div class="data-grid">
          <label class="setting-inline"><input id="settingsAdminControlStart" type="checkbox"> Admin-Leitstand als Startseite für Admin</label>
          <label class="setting-inline"><input id="settingsAdminControlRemember" type="checkbox"> Freigabe auf diesem Rechner merken</label>
          <label>Geheimzahl / PIN<input id="settingsAdminControlPin" type="password" maxlength="8" placeholder="4711"></label>
        </div>
        <div class="button-row settings-actions"><button id="saveAdminControlSettings" class="primary" type="button">Admin-Leitstand speichern</button><button id="openAdminControlSettings" class="secondary" type="button">Leitstand öffnen</button></div>`;
      pref.insertAdjacentElement('afterend',div);
    }
    bindSettingsTabs();
    syncSettings();
  }
  function bindSettingsTabs(){
    $$('.settings-tabs [data-settings-tab]').forEach(btn=>{
      if(btn.dataset.adminCtlBound==='1') return; btn.dataset.adminCtlBound='1';
      btn.addEventListener('click',()=>{
        $$('.settings-tabs .tab').forEach(b=>b.classList.remove('active'));
        $$('.settings-tab').forEach(p=>p.classList.remove('active'));
        btn.classList.add('active'); $('#'+btn.dataset.settingsTab)?.classList.add('active');
      });
    });
  }
  function syncSettings(){
    const s=st().settings||{};
    const start=$('#settingsAdminControlStart'); if(start) start.checked = s.adminControlStartPage===true || localStorage.getItem(START_KEY)==='1';
    const rem=$('#settingsAdminControlRemember'); if(rem) rem.checked = localStorage.getItem(REMEMBER_KEY)==='1';
    const pin=$('#settingsAdminControlPin'); if(pin) pin.value='';
  }
  function saveAdminSettings(){
    const start=!!$('#settingsAdminControlStart')?.checked;
    const rem=!!$('#settingsAdminControlRemember')?.checked;
    const pin=$('#settingsAdminControlPin')?.value || '';
    st().settings=st().settings||{}; st().settings.adminControlStartPage=start;
    localStorage.setItem(START_KEY,start?'1':'0'); localStorage.setItem(REMEMBER_KEY,rem?'1':'0');
    if(pin.trim()) setPin(pin.trim());
    try{ window.saveState?.(); }catch(_){ }
    toast('Admin-Leitstand-Einstellungen gespeichert.','success');
    log('Admin-Leitstand','Einstellungen gespeichert',`Startseite: ${start?'Ja':'Nein'}; Freigabe merken: ${rem?'Ja':'Nein'}`);
  }
  function bindButtons(){
    $('#adminCtlOpenSystemCheck')?.addEventListener('click',()=>window.showView?.('systemCheck'));
    $('#adminCtlOpenBackup')?.addEventListener('click',()=>window.showView?.('backup'));
    $('#adminCtlStartPage')?.addEventListener('change',e=>{ st().settings=st().settings||{}; st().settings.adminControlStartPage=!!e.target.checked; localStorage.setItem(START_KEY,e.target.checked?'1':'0'); window.saveState?.(); toast(e.target.checked?'Leitstand als Startseite aktiviert.':'Leitstand als Startseite deaktiviert.','info'); });
    $('#adminCtlRememberAccess')?.addEventListener('change',e=>{ localStorage.setItem(REMEMBER_KEY,e.target.checked?'1':'0'); if(!e.target.checked) localStorage.removeItem(ACCESS_KEY); });
    $('#adminCtlCheckOnStart')?.addEventListener('change',e=>{ st().settings=st().settings||{}; st().settings.systemCheckOnStart=!!e.target.checked; localStorage.setItem('kng.systemcheck.autostart',e.target.checked?'1':'0'); window.saveState?.(); });
    $('#adminCtlSavePin')?.addEventListener('click',()=>{ const v=$('#adminCtlPin')?.value||''; if(setPin(v)){ $('#adminCtlPin').value=''; toast('PIN gespeichert.','success'); log('Admin-Leitstand','PIN geändert',''); }else toast('Bitte eine PIN eingeben.','error'); });
    document.addEventListener('click',ev=>{ if(ev.target?.id==='saveAdminControlSettings') saveAdminSettings(); if(ev.target?.id==='openAdminControlSettings') openAdminControl('Stammdaten'); }, true);
  }
  function maybeStartPage(){
    const enabled=st().settings?.adminControlStartPage===true || localStorage.getItem(START_KEY)==='1';
    const remembered=localStorage.getItem(ACCESS_KEY)==='1' || sessionStorage.getItem(ACCESS_KEY)==='1';
    if(enabled && logged() && isSuperAdmin()){
      sessionStorage.setItem(ACCESS_KEY,'1');
      setTimeout(()=>openAdminControl('Startseite'),600);
    }
  }
  function wrapLogin(){
    const orig=window.doLogin;
    if(typeof orig==='function' && orig.__adminCtlWrapped!=='1'){
      const wrapped=function(){ const before=logged(); const ret=orig.apply(this,arguments); setTimeout(()=>maybeStartPage(),900); return ret; };
      wrapped.__adminCtlWrapped='1'; window.doLogin=wrapped;
    }
  }
  function wrapShowView(){
    const orig=window.showView;
    if(typeof orig==='function' && orig.__adminCtlWrapped!=='1'){
      const wrapped=function(id){
        if(id==='adminControl' && !isSuperAdmin()){ toast('Schaltzentrale nur für Superadmin.','error'); log('Sicherheit','Kleiner Systemcheck abgelehnt','direkter Aufruf verweigert'); return false; }
        if(id==='adminControl' && (!sessionStorage.getItem(ACCESS_KEY) && !localStorage.getItem(ACCESS_KEY) && !(st().settings?.adminControlStartPage===true))){ requestSecretAccess(); return false; }
        const wasAdmin=document.querySelector('#adminControl.active');
        const ret=orig.apply(this,arguments);
        if(wasAdmin && id!=='adminControl' && isSuperAdmin()){ sessionStorage.setItem('kng.adminLeitstand.returnWanted','1'); }
        if(id==='adminControl'){ sessionStorage.removeItem('kng.adminLeitstand.returnWanted'); setTimeout(renderAdminControl,50); }
        setTimeout(updateReturnButton,80);
        return ret;
      };
      wrapped.__adminCtlWrapped='1'; window.showView=wrapped;
    }
  }

  function ensureReturnButton(){
    if(document.getElementById('adminReturnButton')) return;
    const b=document.createElement('button');
    b.id='adminReturnButton';
    b.type='button';
    b.textContent='↩ Schaltzentrale';
    b.className='admin-return-button';
    b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;padding:10px 14px;border-radius:999px;border:1px solid rgba(77,255,136,.55);background:rgba(7,18,18,.92);color:#dfffee;font-weight:800;box-shadow:0 0 18px rgba(0,255,120,.25);display:none;';
    b.addEventListener('click',()=>{ sessionStorage.setItem(ACCESS_KEY,'1'); sessionStorage.removeItem('kng.adminLeitstand.returnWanted'); openAdminControl('Rückkehr'); });
    document.body.appendChild(b);
  }
  function updateReturnButton(){
    ensureReturnButton();
    const b=document.getElementById('adminReturnButton'); if(!b) return;
    const active=document.querySelector('.view.active')?.id;
    const show=logged() && isSuperAdmin() && sessionStorage.getItem('kng.adminLeitstand.returnWanted')==='1' && active!=='adminControl';
    b.style.display=show?'block':'none';
  }
  function bindReturnToControl(){
    if(document.__adminControlReturnBound) return; document.__adminControlReturnBound=true;
    document.addEventListener('click',ev=>{
      const close=ev.target.closest('[data-close-view], .window-close, .view-close-button');
      if(!close || sessionStorage.getItem('kng.adminLeitstand.returnWanted')!=='1' || !isSuperAdmin()) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      sessionStorage.setItem(ACCESS_KEY,'1'); sessionStorage.removeItem('kng.adminLeitstand.returnWanted');
      setTimeout(()=>openAdminControl('Rückkehr'),20);
    }, true);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{ bindSecretClick(); injectSettings(); bindButtons(); bindReturnToControl(); wrapLogin(); wrapShowView(); maybeStartPage(); renderAdminControl(); updateReturnButton(); },350);
    setInterval(()=>{ updateReturnButton(); },1000); /* 54.4: old admin renderer disabled; final renderer owns view */
  });
})();
