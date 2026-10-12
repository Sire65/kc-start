/* KNG 51.5 – Admin-Leitstand: obere LED-Statusreihe + letzte Aktionen
   Ergänzt nur den Admin-Leitstand. Bestehende Timer/Uhr/Meldungen bleiben unverändert.
*/
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function st(){return window.state||{};}
  function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function arr(x){return Array.isArray(x)?x:[];}
  function latest(list, rx){
    const a=arr(list);
    for(let i=a.length-1;i>=0;i--){
      const e=a[i]||{};
      const s=[e.action,e.details,e.module,e.result,e.text,e.message,e.status,e.file,e.name].join(' ');
      if(!rx || rx.test(s)) return e;
    }
    return null;
  }
  function entryDate(e){
    if(!e) return '--';
    const direct=e.createdAtLocal||e.localTime||e.dateTime||e.timestampLocal||e.timeStampLocal;
    if(direct) return String(direct);
    if(e.date && e.time) return String(e.date)+' '+String(e.time);
    if(e.date) return String(e.date);
    if(e.time) return String(e.time);
    if(e.createdAt||e.timestamp){
      const d=new Date(e.createdAt||e.timestamp);
      if(!Number.isNaN(d.getTime())) return d.toLocaleString('de-DE');
    }
    return '--';
  }
  function getSystem(){
    const last=st().lastSystemCheck||{};
    const overall=String(last.summary?.overall||last.overall||last.status||'OK').toUpperCase();
    const errors=Number(last.summary?.errors??last.errors??0);
    const warnings=Number(last.summary?.warnings??last.warnings??0);
    if(errors>0 || overall.includes('FEHL')) return {level:'red',text:'FEHLER',target:'systemCheck',hint:'Systemcheck öffnen'};
    if(warnings>0 || overall.includes('WARN')) return {level:'yellow',text:'WARNUNG',target:'systemCheck',hint:'Systemcheck öffnen'};
    return {level:'green',text:'OK',target:'systemCheck',hint:'Systemcheck öffnen'};
  }
  function backupStatus(){
    const last=latest(st().backupProtocol,/Sicherung|Backup|Datensicherung/i);
    if(!last) return {level:'yellow',text:'OFFEN',target:'backup',hint:'Datensicherung öffnen'};
    const s=[last.action,last.details,last.result,last.status,last.text].join(' ');
    if(/fehl|error|abbruch/i.test(s)) return {level:'red',text:'FEHLER',target:'backup',hint:'Datensicherung öffnen'};
    return {level:'green',text:'OK',target:'backup',hint:'Datensicherung öffnen'};
  }
  function restoreStatus(){
    const last=latest(st().backupProtocol,/Rück|Restore|Rueck/i);
    if(!last) return {level:'yellow',text:'--',target:'backup',hint:'Rücksicherung öffnen'};
    const s=[last.action,last.details,last.result,last.status,last.text].join(' ');
    if(/fehl|error|abbruch/i.test(s)) return {level:'red',text:'FEHLER',target:'backup',hint:'Rücksicherung öffnen'};
    return {level:'green',text:'OK',target:'backup',hint:'Rücksicherung öffnen'};
  }
  function protocolStatus(){
    const n=arr(st().protocol).length;
    if(n>800) return {level:'red',text:String(n),target:'protocol',hint:'Protokoll öffnen'};
    if(n>400) return {level:'yellow',text:String(n),target:'protocol',hint:'Protokoll öffnen'};
    return {level:'green',text:String(n),target:'protocol',hint:'Protokoll öffnen'};
  }
  function boolStatus(on,target){ return {level:on?'green':'yellow',text:on?'AKTIV':'AUS',target,hint:'Einstellung öffnen'}; }
  function makeStatuses(){
    const settings=st().settings||{};
    const session=st().session||{};
    const online=navigator.onLine;
    const mem=arr(st().members).length;
    const docs=arr(st().documents).length;
    return [
      {key:'system',label:'System',...getSystem()},
      {key:'check',label:'Systemcheck',level:getSystem().level,text:getSystem().text,target:'systemCheck',hint:'Systemcheck öffnen'},
      {key:'backup',label:'Datensicherung',...backupStatus()},
      {key:'restore',label:'Rücksicherung',...restoreStatus()},
      {key:'storage',label:'Speicher',level:(window.localStorage?'green':'red'),text:(window.localStorage?'OK':'FEHLER'),target:'systemCheck',hint:'Speicherdiagnose'},
      {key:'user',label:'Benutzer',level:session.isLoggedIn?'green':'yellow',text:session.userName||session.user||'Gast',target:'users',hint:'Benutzerverwaltung'},
      {key:'members',label:'Mitglieder',level:mem>0?'green':'yellow',text:String(mem),target:'members',hint:'Mitglieder öffnen'},
      {key:'documents',label:'Dokumente',level:docs>0?'green':'yellow',text:String(docs),target:'documents',hint:'Dokumente öffnen'},
      {key:'protocol',label:'Protokoll',...protocolStatus()},
      {key:'clock',label:'Uhr',level:$('#statusClock')?'green':'yellow',text:'OK',target:'settings',hint:'Uhreinstellungen'},
      {key:'autoout',label:'Auto-Aus',...boolStatus(!!(settings.autoLogoutEnabled||settings.autoLogoutMinutes>0),'settings')},
      {key:'toasts',label:'Meldungen',...boolStatus(settings.showToasts!==false,'settings')},
      {key:'pinboard',label:'Pinnwand',...boolStatus(!!settings.showPinboard,'settings')},
      {key:'browser',label:'Browser',level:/Edg|Chrome/i.test(navigator.userAgent)?'green':'yellow',text:/Edg/i.test(navigator.userAgent)?'EDGE':'OK',target:'systemCheck',hint:'Browsercheck'},
      {key:'online',label:'Internet',level:online?'green':'yellow',text:online?'ONLINE':'OFFLINE',target:'systemCheck',hint:'Onlinestatus'}
    ];
  }
  function ensureLedStrip(){
    const shell=$('#adminControl .admin-control-shell');
    const header=$('#adminControl .admin-control-header');
    if(!shell || !header || $('#adminCtlTopLedStrip')) return;
    const strip=document.createElement('div');
    strip.id='adminCtlTopLedStrip';
    strip.className='admin-top-led-strip';
    header.insertAdjacentElement('afterend',strip);
  }
  function ledClass(level){return level==='red'?'led-red':level==='yellow'?'led-yellow':'led-green';}
  function renderLedStrip(){
    const view=$('#adminControl'); if(!view || !view.classList.contains('active')) return;
    ensureLedStrip();
    const strip=$('#adminCtlTopLedStrip'); if(!strip) return;
    const list=makeStatuses();
    strip.innerHTML=list.map(s=>`<button type="button" class="admin-top-led-cell" data-admin-led-target="${esc(s.target||'systemCheck')}" data-admin-led-key="${esc(s.key)}" title="${esc(s.hint||s.label)}"><span class="led ${ledClass(s.level)}"></span><strong>${esc(s.label)}</strong><em>${esc(s.text)}</em></button>`).join('');
  }
  function navigate(target){
    if(!target) return;
    if(target==='systemCheck'){
      if(typeof window.showView==='function') window.showView('settings');
      setTimeout(()=>{
        const btn=[...document.querySelectorAll('button,.tab-button,[data-tab]')].find(b=>/systemcheck/i.test(b.textContent||b.dataset?.tab||''));
        btn?.click?.();
        const el=$('#systemCheckTab')||$('#settingsSystemCheck')||$('[data-tab-panel="systemCheck"]')||document.querySelector('[id*="ystemCheck"]');
        el?.scrollIntoView?.({behavior:'smooth',block:'start'});
      },120);
      return;
    }
    if(target==='backup'){
      if(typeof window.showView==='function') window.showView('settings');
      setTimeout(()=>{
        const btn=[...document.querySelectorAll('button,.tab-button,[data-tab]')].find(b=>/datensicherung|backup|rücksicherung|ruecksicherung/i.test(b.textContent||b.dataset?.tab||''));
        btn?.click?.();
        const el=$('#backupTab')||$('#settingsBackup')||document.querySelector('[id*="Backup"],[id*="backup"],[id*="Datensicherung"]');
        el?.scrollIntoView?.({behavior:'smooth',block:'start'});
      },120);
      return;
    }
    if(typeof window.showView==='function') window.showView(target);
  }
  function bindLedClicks(){
    if(document.__kng515LedClicks) return; document.__kng515LedClicks=true;
    document.addEventListener('click',ev=>{
      const btn=ev.target.closest?.('[data-admin-led-target]');
      if(!btn) return;
      ev.preventDefault();
      try{ sessionStorage.setItem('kng.adminLeitstand.returnWanted','1'); }catch(_){ }
      navigate(btn.dataset.adminLedTarget);
    },true);
  }
  function addLine(containerId,label,value,id){
    const root=$(containerId); if(!root || $('#'+id)) return;
    const div=document.createElement('div');
    div.innerHTML=`<span>${esc(label)}</span><strong id="${esc(id)}">${esc(value)}</strong>`;
    root.appendChild(div);
  }
  function setText(id,value){ const el=$('#'+id); if(el) el.textContent=String(value??'--'); }
  function renderLastActions(){
    if(!$('#adminControl')?.classList.contains('active')) return;
    const b=latest(st().backupProtocol,/Sicherung|Backup|Datensicherung/i);
    const r=latest(st().backupProtocol,/Rück|Restore|Rueck/i);
    const sys=st().lastSystemCheck||{};
    const sysDate=sys.environment?.createdAtLocal || sys.createdAtLocal || sys.date || entryDate(latest(st().systemCheckProtocol));
    const prot=latest(st().protocol);
    const backupPanel=$('#adminCtlBackupStatus')?.closest('.admin-panel')?.querySelector('.admin-data-lines') || $('#adminCtlBackupStatus')?.closest('.admin-panel');
    if(backupPanel && !$('#adminCtlLastBackupDate')){
      const wrap=document.createElement('div');
      wrap.className='admin-last-action-lines';
      wrap.innerHTML=`<div><span>Letzte Sicherung</span><strong id="adminCtlLastBackupDate">--</strong></div><div><span>Letzte Rücksicherung</span><strong id="adminCtlLastRestoreDate">--</strong></div>`;
      backupPanel.appendChild(wrap);
    }
    const systemPanel=$('#adminCtlSystemStatus')?.closest('.admin-panel');
    if(systemPanel && !$('#adminCtlLastSystemCheckDate')){
      const wrap=document.createElement('div');
      wrap.className='admin-last-action-lines';
      wrap.innerHTML=`<div><span>Letzter Check</span><strong id="adminCtlLastSystemCheckDate">--</strong></div></div>`;
      systemPanel.appendChild(wrap);
    }
    addLine('#adminControl .right-rail .admin-data-lines.compact','Letzte Aktion',entryDate(prot),'adminCtlLastMainProtocolDate');
    setText('adminCtlLastBackupDate',entryDate(b));
    setText('adminCtlLastRestoreDate',entryDate(r));
    setText('adminCtlLastSystemCheckDate',sysDate||'--');
  }
  function render515(){
    if(!$('#adminControl')?.classList.contains('active')) return;
    renderLedStrip();
    renderLastActions();
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__kng515Wrapped!=='1'){
    const wrapped=function(){ const ret=old.apply(this,arguments); setTimeout(render515,0); return ret; };
    wrapped.__kng515Wrapped='1'; window.renderAdminControl=wrapped;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    bindLedClicks();
    setTimeout(render515,900);
    setInterval(render515,2500);
  });
})();
