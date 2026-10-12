/* KNG 51.2 Admin-Leitstand: 3D-Feinschliff, Sitzungsmonitor und zusätzliche Steuer-Schalter */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  function st(){return window.state||{};}
  function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function toast(msg,type='info'){try{window.toast?.(msg,type);}catch(_){console.log(msg);}}
  function save(){try{window.saveState?.();}catch(_){}}
  function log(action,details){try{window.logAction?.('Admin-Leitstand',action,details||'');}catch(_){}}
  function currentUser(){const s=st().session||{}; return s.userName||s.user||'Gast';}
  function currentRole(){return st().session?.role||'Gast';}
  function lastActivityByUser(){
    const out=[]; const seen=new Set();
    const list=Array.isArray(st().protocol)?st().protocol:[];
    // aktuelle Sitzung zuerst
    out.push({user:currentUser(), role:currentRole(), time:st().session?.loginSince||'jetzt', action:'aktuelle Sitzung', online:true});
    seen.add(String(currentUser()).toLowerCase());
    for(const e of list){
      const u=String(e.user||e.userName||'').trim(); if(!u || seen.has(u.toLowerCase())) continue;
      seen.add(u.toLowerCase());
      out.push({user:u, role:'', time:e.time||e.date||'', action:(e.module?e.module+' · ':'')+(e.action||e.details||'Aktivität'), online:false});
      if(out.length>=8) break;
    }
    return out;
  }
  function renderSessions(){
    const box=$('#adminCtlSessionList'); if(!box) return;
    const rows=lastActivityByUser();
    box.innerHTML=rows.map(r=>`<div class="admin-session-row"><span class="led ${r.online?'led-green':''}"></span><div><strong>${esc(r.user)}</strong><br><span>${esc(r.action)}</span></div><em>${esc(r.online?'online':r.time||'--')}</em></div>`).join('') || '<div class="admin-session-row"><span class="led"></span><div><strong>Keine Daten</strong><br><span>Noch keine Aktivitäten.</span></div><em>--</em></div>';
  }
  function getSettingBool(keys, fallback=false){
    const settings=st().settings||{};
    for(const k of keys){ if(typeof settings[k]==='boolean') return settings[k]; }
    for(const k of keys){ const v=localStorage.getItem(k); if(v==='1'||v==='true'||v==='yes') return true; if(v==='0'||v==='false'||v==='no') return false; }
    return fallback;
  }
  function setSettingBool(keys, val){
    st().settings=st().settings||{}; st().settings[keys[0]]=!!val;
    for(const k of keys) localStorage.setItem(k,val?'1':'0');
    save();
  }
  function syncSwitches(){
    const map=[
      ['adminCtlAutoLogoutSwitch',['autoLogoutEnabled','kng.autoLogout.enabled'], false],
      ['adminCtlPinboardSwitch',['pinboardEnabled','showPinboard','kng.pinboard.enabled'], true],
      ['adminCtlToastSwitch',['toastEnabled','showMessages','kng.toast.enabled'], true],
      ['adminCtlClockSwitch',['clockEnabled','userClockEnabled','kng.clock.enabled'], true],
      ['adminCtlBackupWarnSwitch',['backupWarningEnabled','kng.backup.warn.enabled'], true]
    ];
    map.forEach(([id,keys,fb])=>{const el=$('#'+id); if(el) el.checked=getSettingBool(keys,fb);});
  }
  function bindExtraSwitches(){
    if(document.__kng512SwitchBound) return; document.__kng512SwitchBound=true;
    const bind=(id,keys,label)=>{
      const el=$('#'+id); if(!el) return;
      el.addEventListener('change',()=>{setSettingBool(keys,el.checked); toast(label+(el.checked?' eingeschaltet.':' ausgeschaltet.'),'info'); log('Schalter geändert',label+': '+(el.checked?'Ein':'Aus'));});
    };
    bind('adminCtlAutoLogoutSwitch',['autoLogoutEnabled','kng.autoLogout.enabled'],'Auto-Aus');
    bind('adminCtlPinboardSwitch',['pinboardEnabled','showPinboard','kng.pinboard.enabled'],'Pinnwand');
    bind('adminCtlToastSwitch',['toastEnabled','showMessages','kng.toast.enabled'],'Meldungen');
    bind('adminCtlClockSwitch',['clockEnabled','userClockEnabled','kng.clock.enabled'],'Uhr');
    bind('adminCtlBackupWarnSwitch',['backupWarningEnabled','kng.backup.warn.enabled'],'Backup-Warnung');
  }
  function patchConsoleNote(){
    const c=$('#adminCtlConsole'); if(c && !c.textContent.includes('Sitzungsmonitor')) c.textContent += '\n> Sitzungsmonitor: lokale Sitzung + letzte Benutzeraktionen aktiv.';
  }
  function render512(){
    if(!$('#adminControl')?.classList.contains('active')) return;
    renderSessions(); syncSwitches(); patchConsoleNote();
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__kng512Wrapped!=='1'){
    const wrapped=function(){const ret=old.apply(this,arguments); try{render512();}catch(e){console.warn('KNG 51.2 render failed',e);} return ret;};
    wrapped.__kng512Wrapped='1'; window.renderAdminControl=wrapped;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{bindExtraSwitches(); render512();},900);
    setInterval(render512,1600);
  });
})();
