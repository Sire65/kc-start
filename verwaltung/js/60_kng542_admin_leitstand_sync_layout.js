/* KNG 54.2 – Admin-Leitstand: einheitlicher Datenstand, Refresh, 6 Instrumente, Protokollfüllstand */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const arr=x=>Array.isArray(x)?x:[];
  function st(){return window.state||{};}
  function settings(){return st().settings||{};}
  function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function txt(id,v){const e=$('#'+id); if(e) e.textContent=String(v??'--');}
  function protocolLimit(){return Math.max(1,Number(settings().protocolLimit||50));}
  function protocolKeep(){return Math.max(0,Number(settings().protocolKeep||10));}
  function entryText(e){return [e?.action,e?.details,e?.module,e?.result,e?.status,e?.text,e?.message,e?.file,e?.name].filter(Boolean).join(' ');}
  function entryDate(e){
    if(!e) return '--';
    const direct=e.createdAtLocal||e.localTime||e.dateTime||e.timestampLocal||e.timeStampLocal;
    if(direct) return String(direct);
    if(e.date && e.time) return String(e.date)+' '+String(e.time);
    if(e.date) return String(e.date);
    if(e.time) return String(e.time);
    const raw=e.createdAt||e.timestamp||e.iso;
    if(raw){const d=new Date(raw); if(!Number.isNaN(d.getTime())) return d.toLocaleString('de-DE');}
    return '--';
  }
  function latest(list,rx){
    const a=arr(list); rx=rx instanceof RegExp?rx:new RegExp(String(rx||'.'),'i');
    for(let i=a.length-1;i>=0;i--){ if(rx.test(entryText(a[i]))) return a[i]; }
    return null;
  }
  function isBad(e){return /fehl|fehler|error|abbruch|failed|nicht/i.test(entryText(e));}
  function levelByCount(n,limit){const p=n/Math.max(1,limit)*100; return p>=100?'red':p>=80?'yellow':'green';}
  function pct(value,max){return Math.max(0,Math.min(100,Math.round((Number(value)||0)/Math.max(1,Number(max)||1)*100)));}
  function systemModel(){
    const last=st().lastSystemCheck||{};
    const errors=Number(last.summary?.errors??last.errors??0);
    const warnings=Number(last.summary?.warnings??last.warnings??0);
    const overall=String(last.summary?.overall||last.overall||last.status||'OK').toUpperCase();
    const level=(errors>0||overall.includes('FEHL'))?'red':((warnings>0||overall.includes('WARN'))?'yellow':'green');
    return {level,text:level==='green'?'OK':(level==='yellow'?'WARNUNG':'FEHLER'),errors,warnings,date:last.environment?.createdAtLocal||last.createdAtLocal||entryDate(latest(st().systemCheckProtocol,/systemcheck|check/i))};
  }
  function backupModel(){
    const backup=latest(st().backupProtocol,/Datensicherung|Komplettsicherung|Backup|Sicherung erstellt|Sicherung erfolgreich/i);
    const restore=latest(st().backupProtocol,/Rück|Rueck|Restore|Wiederherstellung/i);
    const bLevel=!backup?'yellow':(isBad(backup)?'red':'green');
    const rLevel=!restore?'yellow':(isBad(restore)?'red':'green');
    return {backup,restore,bLevel,rLevel,bText:!backup?'OFFEN':(bLevel==='green'?'OK':'FEHLER'),rText:!restore?'--':(rLevel==='green'?'OK':'FEHLER')};
  }
  function dataModel(){
    const sys=systemModel(); const b=backupModel(); const lim=protocolLimit();
    const mainLogs=arr(st().protocol).length;
    const backupLogs=arr(st().backupProtocol).length;
    const checkLogs=arr(st().systemCheckProtocol).length;
    const docs=arr(st().documents).length;
    const members=arr(st().members).length;
    const failedLogins=arr(st().protocol).filter(e=>/fehlanmeldung|login fehl|anmeldung fehl|falsches passwort/i.test(entryText(e))).length;
    const checkCount=checkLogs || (st().lastSystemCheck?1:0);
    return {
      sys,b,lim,keep:protocolKeep(),members,docs,backups:backupLogs,mainLogs,checkLogs,failedLogins,checkCount,
      protocolMainLevel:levelByCount(mainLogs,lim),
      protocolBackupLevel:levelByCount(backupLogs,lim),
      protocolCheckLevel:levelByCount(checkLogs,lim),
      online:navigator.onLine
    };
  }
  function setLedCell(key,level,text,label,target){
    const cell=$(`#adminCtlTopLedStrip [data-admin-led-key="${key}"]`); if(!cell) return;
    cell.classList.add('synced');
    cell.classList.remove('sync-red','sync-yellow','sync-green'); cell.classList.add('sync-'+level);
    const led=cell.querySelector('.led');
    if(led){led.className='led '+(level==='red'?'led-red':level==='yellow'?'led-yellow':'led-green');}
    const em=cell.querySelector('em'); if(em) em.textContent=String(text??'--');
    const stg=cell.querySelector('strong'); if(stg && label) stg.textContent=label;
    if(target) cell.dataset.adminLedTarget=target;
  }
  function syncTopLeds(m){
    setLedCell('system',m.sys.level,m.sys.text,'System','systemCheck');
    setLedCell('check',m.sys.level,m.sys.text,'Systemcheck','systemCheck');
    setLedCell('backup',m.b.bLevel,m.b.bText,'Datensicherung','backup');
    setLedCell('restore',m.b.rLevel,m.b.rText,'Rücksicherung','backup');
    setLedCell('documents',m.docs>0?'green':'yellow',String(m.docs),'Dokumente','documents');
    setLedCell('members',m.members>0?'green':'yellow',String(m.members),'Mitglieder','members');
    setLedCell('protocol',m.protocolMainLevel,String(m.mainLogs),'Protokoll','protocol');
    setLedCell('online',m.online?'green':'yellow',m.online?'ONLINE':'OFFLINE','Internet','systemCheck');
  }
  function setMeter(el,value,max,view,title){
    if(!el) return;
    const p=pct(value,max); el.style.setProperty('--pct',String(p));
    el.classList.toggle('zero',Number(value)===0);
    el.classList.toggle('warn',p>=80 && p<100);
    el.classList.toggle('error',p>=100);
    if(view){el.dataset.kngTarget=view;el.title=title||view;}
  }
  function ensureSixMeters(){
    const grid=$('#adminControl .pro-stat-grid'); if(!grid) return;
    const specs=[['adminCtlMembersCount','Mitglieder'],['adminCtlDocsCount','Dokumente'],['adminCtlBackupCount','Backups'],['adminCtlProtocolShort','Hauptlogs'],['adminCtlSystemCheckCount','Checks'],['adminCtlFailedLoginCount','Fehl-Login']];
    specs.forEach(([id,label])=>{
      if(!$('#'+id,grid)){
        const d=document.createElement('div'); d.className='round-meter'; d.innerHTML=`<strong id="${id}">0</strong><span>${label}</span>`; grid.appendChild(d);
      }else{
        const span=$('#'+id,grid)?.parentElement?.querySelector('span'); if(span) span.textContent=label;
      }
    });
  }
  function renderMeters(m){
    ensureSixMeters();
    txt('adminCtlMembersCount',m.members); txt('adminCtlDocsCount',m.docs); txt('adminCtlBackupCount',m.backups); txt('adminCtlProtocolShort',m.mainLogs); txt('adminCtlSystemCheckCount',m.checkCount); txt('adminCtlFailedLoginCount',m.failedLogins);
    const meters=$$('#adminControl .pro-stat-grid .round-meter');
    setMeter(meters[0],m.members,100,'members','Mitgliederverwaltung öffnen');
    setMeter(meters[1],m.docs,500,'documents','Dokumentenverwaltung öffnen');
    setMeter(meters[2],m.backups,m.lim,'backup','Datensicherung öffnen');
    setMeter(meters[3],m.mainLogs,m.lim,'protocol','Hauptprotokoll öffnen');
    setMeter(meters[4],m.checkCount,m.lim,'systemCheck','Systemcheck-Protokoll öffnen');
    setMeter(meters[5],m.failedLogins,10,'users','Fehlanmeldungen/Benutzer prüfen');
  }
  function ensureRefreshButton(){
    const head=$('#adminControl .admin-control-header'); if(!head || $('#adminCtlRefreshData')) return;
    const box=document.createElement('div'); box.className='admin-refresh-box';
    box.innerHTML='<button id="adminCtlRefreshData" class="admin-refresh-btn" type="button">↻ Daten aktualisieren</button><span id="adminCtlRefreshStamp" class="admin-refresh-stamp">--</span>';
    head.appendChild(box);
  }
  function ensureLiveLayout(){
    const center=$('#adminControl .admin-pro-center'); const live=$('#adminControl .live-panel');
    if(!center || !live || live.closest('.admin-live-row-542')) return;
    const row=document.createElement('div'); row.className='admin-live-row-542';
    live.parentNode.insertBefore(row,live); row.appendChild(live);
    const p=document.createElement('article'); p.className='admin-panel admin-protocol-capacity-panel';
    p.innerHTML='<div class="panel-title"><span class="led led-green"></span><strong>Protokoll-Füllstand</strong></div><div id="adminCtlProtocolCapacity" class="protocol-capacity-list"></div>';
    row.appendChild(p);
  }
  function renderProtocolCapacity(m){
    const root=$('#adminCtlProtocolCapacity'); if(!root) return;
    const rows=[
      ['Hauptprotokoll',m.mainLogs,m.lim,m.protocolMainLevel,'protocol'],
      ['Datensicherung',m.backups,m.lim,m.protocolBackupLevel,'backup'],
      ['Systemcheck',m.checkLogs,m.lim,m.protocolCheckLevel,'systemCheck']
    ];
    root.innerHTML=rows.map(([label,n,lim,level,target])=>{
      const p=pct(n,lim); const cls=level==='red'?'error':level==='yellow'?'warn':'';
      return `<button type="button" class="protocol-capacity-row ${cls}" data-kng-target="${esc(target)}" title="${esc(label)} öffnen"><span>${esc(label)}</span><strong>${n}/${lim}</strong><span class="protocol-bar"><i style="--pct:${p}%"></i></span></button>`;
    }).join('')+`<div class="admin-session-note">Schwelle: ${m.lim} · Beim Löschen bleiben ${m.keep} Einträge erhalten.</div>`;
  }
  function renderBackupDates(m){
    txt('adminCtlLastBackupDate',entryDate(m.b.backup)); txt('adminCtlLastRestoreDate',entryDate(m.b.restore)); txt('adminCtlLastSystemCheckDate',m.sys.date||'--');
    txt('adminCtlBackupStatus',m.b.bText); txt('adminCtlBackupValue',m.b.bText);
    const led=$('#adminCtlBackupLed'); if(led) led.className='led '+(m.b.bLevel==='red'?'led-red':m.b.bLevel==='yellow'?'led-yellow':'led-green');
  }
  function renderMonitor(m){
    txt('adminCtlErrCount',m.sys.errors); txt('adminCtlWarnCount',m.sys.warnings); txt('adminCtlSystemChecks',m.checkCount); txt('adminCtlActivities',m.mainLogs);
    const status=$('#adminCtlMonitorStatus'); if(status){status.textContent=m.sys.level==='green'?'SYSTEM OK':(m.sys.level==='yellow'?'WARNUNG':'FEHLER'); status.className='monitor-status-word '+m.sys.level;}
    const text=$('#adminCtlMonitorText'); if(text){
      text.textContent=`System ${m.sys.text} · Sicherung: ${m.b.bText} (${entryDate(m.b.backup)}) · Rücksicherung: ${m.b.rText} (${entryDate(m.b.restore)}) · Protokolle: ${m.mainLogs}/${m.lim}`;
    }
  }
  function refreshAll(source){
    if(!$('#adminControl')) return;
    ensureRefreshButton(); ensureLiveLayout(); ensureSixMeters();
    const m=dataModel();
    syncTopLeds(m); renderMeters(m); renderProtocolCapacity(m); renderBackupDates(m); renderMonitor(m);
    const stamp=new Date().toLocaleTimeString('de-DE'); txt('adminCtlRefreshStamp','aktualisiert '+stamp+(source?' · '+source:''));
    const c=$('#adminCtlConsole'); if(c){c.textContent=`> Daten aktualisiert ${stamp}\n> System: ${m.sys.text}\n> Datensicherung: ${m.b.bText} · ${entryDate(m.b.backup)}\n> Rücksicherung: ${m.b.rText} · ${entryDate(m.b.restore)}\n> Protokolle: Haupt ${m.mainLogs}/${m.lim}, Backup ${m.backups}/${m.lim}, Check ${m.checkLogs}/${m.lim}\n> Instrumente und LEDs aus gleicher Datenquelle synchronisiert.`;}
  }
  function bind(){
    if(document.__kng542Bound) return; document.__kng542Bound=true;
    document.addEventListener('click',ev=>{
      if(ev.target.closest?.('#adminCtlRefreshData')){ev.preventDefault(); refreshAll('manuell'); return;}
    },true);
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__kng542Wrapped!=='1'){
    const wrapped=function(){const ret=old.apply(this,arguments); setTimeout(()=>refreshAll('Render'),0); return ret;};
    wrapped.__kng542Wrapped='1'; window.renderAdminControl=wrapped;
  }
  ['logBackup','logProtocol','logSystemCheck'].forEach(name=>{
    const fn=window[name];
    if(typeof fn==='function' && fn.__kng542Wrapped!=='1'){
      const wrapped=function(){const ret=fn.apply(this,arguments); setTimeout(()=>refreshAll(name),0); return ret;};
      wrapped.__kng542Wrapped='1'; window[name]=wrapped;
    }
  });
  window.refreshAdminControlData=()=>refreshAll('API');
  document.addEventListener('DOMContentLoaded',()=>{bind(); setTimeout(()=>refreshAll('Start'),1000); setInterval(()=>{if($('#adminControl')?.classList.contains('active')) refreshAll('Auto');},2000);});
})();
