/* KNG 54.4 – Schaltzentrale Final Neuaufbau
   Ein einziger finaler Renderer. Alte Leitstand-Unteransichten bleiben deaktiviert. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const st=()=>window.state||{};
  const arr=a=>Array.isArray(a)?a:[];
  const now=()=>new Date().toLocaleString('de-DE');
  const START_KEY='kng.adminLeitstand.startPage';
  function entryDate(e){ return e ? ([e.date||e.datum||'', e.time||e.uhrzeit||''].join(' ').trim() || e.createdAtLocal || e.createdAt || '--') : '--'; }
  function latest(list,rx){ return arr(list).find(e=>!rx || rx.test(String(e.action||e.aktion||e.module||e.modul||e.details||''))) || null; }
  function pct(v,max){ max=Math.max(1,Number(max)||1); return Math.max(0,Math.min(100,Math.round((Number(v)||0)/max*100))); }
  function levelByCount(v,limit){ v=Number(v)||0; limit=Number(limit)||50; if(v>=limit) return 'red'; if(v>=limit*0.8) return 'yellow'; return 'green'; }
  function ledLevel(level){ return level==='red'?'red':level==='yellow'?'yellow':'green'; }
  function gotoView(view){ try{sessionStorage.setItem('kng.adminLeitstand.returnWanted','1');}catch(_){} if(typeof window.showView==='function') window.showView(view); }
  function collect(){
    const s=st();
    const protocol=arr(s.protocol);
    const backupProtocol=arr(s.backupProtocol);
    const systemCheckProtocol=arr(s.systemCheckProtocol);
    const members=arr(s.members);
    const documents=arr(s.documents);
    const lastSystemCheck=s.lastSystemCheck||{};
    const sum=lastSystemCheck.summary||{};
    const errors=Number(sum.errors||0);
    const warnings=Number(sum.warnings||0);
    const overall=errors>0?'FEHLER':warnings>0?'WARNUNG':'OK';
    const sysLevel=overall==='FEHLER'?'red':overall==='WARNUNG'?'yellow':'green';
    const lastBackup=latest(backupProtocol,/Sicherung|Datensicherung|Backup/i);
    const lastRestore=latest(backupProtocol,/Rück|Restore/i);
    const dbPath=s.settings?.databasePath||s.database?.path||'';
    const protocolLimit=Number(s.settings?.protocolLimit||50)||50;
    return {s,protocol,backupProtocol,systemCheckProtocol,members,documents,lastSystemCheck,sum,errors,warnings,overall,sysLevel,lastBackup,lastRestore,dbPath,protocolLimit};
  }
  function gauge(title,value,sub,level,target,percent){
    const deg=-132+(Math.max(0,Math.min(100,percent))*2.64);
    return `<button type="button" class="kng544-gauge-card" data-kng544-target="${esc(target)}" title="${esc(title)} öffnen">
      <div class="kng544-gauge"><div class="kng544-needle" style="transform:rotate(${deg}deg)"></div><div class="kng544-hub"></div><div class="kng544-gauge-value">${esc(value)}</div></div>
      <strong>${esc(title)}</strong><span>${esc(sub)}</span>
    </button>`;
  }
  function stat(title,value,sub,level,target,percent){
    const p=Math.max(0,Math.min(100,percent));
    return `<button type="button" class="kng544-stat" data-kng544-target="${esc(target)}" title="${esc(title)} öffnen">
      <span class="kng544-ring ${esc(level)}" style="--p:${p}"><em>${esc(value)}</em></span><strong>${esc(title)}</strong><small>${esc(sub)}</small>
    </button>`;
  }
  function ledCell(label,level,value,target){
    return `<button type="button" class="kng544-ledbox" data-kng544-target="${esc(target)}" title="${esc(label)} öffnen"><span class="kng544-led ${ledLevel(level)}"></span><strong>${esc(label)}</strong><em>${esc(value)}</em></button>`;
  }
  function bars(d){
    const rows=[['Hauptprotokoll',d.protocol.length,d.protocolLimit,'protocol'],['Datensicherung',d.backupProtocol.length,d.protocolLimit,'backup'],['Systemcheck',d.systemCheckProtocol.length,d.protocolLimit,'systemCheck']];
    return rows.map(([label,val,max,target])=>{const p=pct(val,max); const lv=levelByCount(val,max); return `<button type="button" class="kng544-barrow" data-kng544-target="${target}" title="${label} öffnen"><span>${label}</span><div class="kng544-barbox"><i class="kng544-column ${lv}" style="height:${Math.max(4,p)}%"></i></div><b>${val}/${max}</b></button>`;}).join('');
  }
  function events(d){
    const list=d.protocol.slice(0,15);
    if(!list.length) return '<div class="kng544-empty">Noch keine Ereignisse vorhanden.</div>';
    return list.map(e=>`<div class="kng544-event"><time>${esc(entryDate(e))}</time><strong>${esc(e.module||e.modul||'System')}</strong><span>${esc(e.action||e.aktion||e.details||'Aktion')}</span></div>`).join('');
  }
  function icons(){
    const list=[['📊','Dashboard','dashboard'],['👥','Mitglieder','members'],['🪪','Ausweise','memberCards'],['🥼','Dienstkleidung','workwear'],['🧾','Bestellungen','orders'],['🎯','Aktivitäten','activities'],['🎁','Spenden','donations'],['✉️','Kommunikation','communication'],['📄','Dokumente','documents'],['📦','Inventar','inventoryOpen'],['🩺','Systemcheck','systemCheck'],['📋','Protokoll','protocol'],['📝','Fragebogen','questionnaire'],['🏢','Adressen','addresses'],['💾','Datensicherung','backup']];
    return list.map(([ic,lab,view])=>`<button type="button" class="kng544-icon" data-kng544-target="${esc(view)}" title="${esc(lab)}"><span>${ic}</span><small>${esc(lab)}</small></button>`).join('');
  }
  function markup(){
    const d=collect();
    /* Mitgliederzahl ohne Gaeste und Aushilfen - dieselbe Zahl wie im Dashboard. */
    const mitgliederZahl=(typeof getMemberCount==='function') ? getMemberCount() : d.members.length;
    const dbLevel=d.dbPath?'green':'yellow';
    const backupLevel=d.lastBackup?'green':'yellow';
    const restoreLevel=d.lastRestore?'green':'yellow';
    const ledRow=[
      ['System',d.sysLevel,d.overall,'systemCheck'],['Datenbank',dbLevel,d.dbPath?'Pfad':'offen','settings'],['Backup',backupLevel,d.lastBackup?'OK':'fehlt','backup'],['Restore',restoreLevel,d.lastRestore?'OK':'fehlt','backup'],['Systemcheck',d.sysLevel,d.systemCheckProtocol.length,'systemCheck'],['Uhr','green','OK','dashboard'],['Timer','green','OK','settings'],['Meldungen','green','OK','settings'],['Mitglieder','green',mitgliederZahl,'members'],['Dokumente',d.documents.length?'green':'yellow',d.documents.length,'documents'],['Protokoll',levelByCount(d.protocol.length,d.protocolLimit),d.protocol.length,'protocol'],['Online',navigator.onLine?'green':'red',navigator.onLine?'online':'offline','dashboard']
    ];
    return `<div class="kng544-control">
      <header class="kng544-head"><div class="kng544-title"><small>Köcheclub Werne · Superadmin</small><h2>Schaltzentrale – Admin-Leitstand</h2></div><button id="kng544Refresh" class="kng544-refresh" type="button" title="Alle Daten aktualisieren">↻</button></header>
      <section class="kng544-leds">${ledRow.map(x=>ledCell(x[0],x[1],x[2],x[3])).join('')}</section>
      <section class="kng544-gauges3">
        ${gauge('Systemstatus',d.overall,`${d.errors} Fehler · ${d.warnings} Warnungen`,d.sysLevel,'systemCheck',d.overall==='OK'?100:d.overall==='WARNUNG'?66:25)}
        ${gauge('Datensicherung',d.lastBackup?'OK':'OFFEN',entryDate(d.lastBackup),backupLevel,'backup',d.lastBackup?100:35)}
        ${gauge('Datenbestand',mitgliederZahl+d.documents.length,`${mitgliederZahl} Mitglieder · ${d.documents.length} Dokumente`,'green','members',pct(d.members.length+d.documents.length,150))}
      </section>
      <section class="kng544-monitor"><div class="kng544-monitor-top"><i></i><i></i><i></i><b>HAUPTMONITOR</b><em>${now()}</em></div><div class="kng544-monitor-body"><h3 class="${d.sysLevel}">${d.overall==='OK'?'SYSTEM OK':d.overall}</h3><p>${d.overall==='OK'?'Alle Hauptparameter im Normalbereich.':'Bitte LED-Leiste oder Systemcheck öffnen.'}</p><div class="kng544-monitor-grid"><div><span>Letzte Datensicherung</span><b>${entryDate(d.lastBackup)}</b></div><div><span>Letzte Rücksicherung</span><b>${entryDate(d.lastRestore)}</b></div><div><span>Letzter Systemcheck</span><b>${esc(d.lastSystemCheck.environment?.createdAtLocal||'--')}</b></div><div><span>Datenbank</span><b>${esc(d.dbPath||'kein Pfad')}</b></div></div></div></section>
      <section class="kng544-middle"><article class="kng544-panel"><div class="kng544-panel-title"><span class="kng544-led green"></span><strong>Live-Ereignismonitor</strong></div><div class="kng544-events">${events(d)}</div></article><article class="kng544-panel"><div class="kng544-panel-title"><span class="kng544-led green"></span><strong>Protokoll-Füllstand</strong></div><div class="kng544-bars">${bars(d)}</div></article></section>
      <section class="kng544-stats">
        ${stat('Mitglieder',mitgliederZahl,'Mitgliederverwaltung','green','members',pct(mitgliederZahl,100))}
        ${stat('Dokumente',d.documents.length,'Dokumente',d.documents.length?'green':'neutral','documents',pct(d.documents.length,100))}
        ${stat('Backups',d.backupProtocol.length,'Datensicherung','green','backup',pct(d.backupProtocol.length,50))}
        ${stat('Protokolle',d.protocol.length,'Hauptprotokoll',levelByCount(d.protocol.length,d.protocolLimit),'protocol',pct(d.protocol.length,d.protocolLimit))}
        ${stat('Benutzer',1,'lokal angemeldet','green','users',100)}
        ${stat('Systemchecks',d.systemCheckProtocol.length,'Check-Protokoll','green','systemCheck',pct(d.systemCheckProtocol.length,50))}
      </section>
      <section class="kng544-lower"><article class="kng544-panel"><div class="kng544-panel-title"><span class="kng544-led green"></span><strong>Aktivierte Bedien-Icons</strong></div><div class="kng544-icons">${icons()}</div></article><article class="kng544-panel"><div class="kng544-panel-title"><span class="kng544-led green"></span><strong>Schalter</strong></div><div class="kng544-switches"><label><input id="kng544Start" type="checkbox"> Startseite</label><label><input id="kng544Check" type="checkbox"> Check Start</label><label><input type="checkbox"> Backup-Warnung</label><label><input type="checkbox"> Monitorrotation</label><label><input type="checkbox"> Uhr</label><label><input type="checkbox"> Meldungen</label></div></article></section>
      <details class="kng544-db"><summary>▶ Datenbank-Anbindung</summary><div><span>Pfad</span><b>${esc(d.dbPath||'Noch kein Datenbankpfad hinterlegt')}</b></div><div><span>Modus</span><b>${esc(d.s.settings?.databaseMode||'Lokal vorbereitet')}</b></div></details>
    </div>`;
  }
  function render(){
    const root=$('#adminControl'); if(!root) return;
    root.classList.add('admin-control-view');
    root.classList.remove('kng544-ready');
    try{
      const content=markup();
      if(!content || !content.includes('kng544-control')) throw new Error('Adminoberfläche konnte nicht erzeugt werden.');
      root.innerHTML=content;
      root.classList.add('kng544-ready');
      const start=$('#kng544Start'); if(start) start.checked=st().settings?.adminControlStartPage===true || localStorage.getItem(START_KEY)==='1';
      const check=$('#kng544Check'); if(check) check.checked=st().settings?.systemCheckOnStart===true || localStorage.getItem('kng.systemcheck.autostart')==='1';
    }catch(error){
      root.classList.remove('kng544-ready');
      console.error('KNG Admin-Leitstand konnte nicht dargestellt werden:',error);
      if(!root.querySelector('.admin-control-shell')){
        root.innerHTML='<div class="kng544-render-error">Der Admin-Leitstand konnte nicht geladen werden. Bitte die Seite mit Strg+F5 neu laden oder den Systemcheck öffnen.</div>';
      }
      window.toast?.('Admin-Leitstand konnte nicht vollständig geladen werden.','error');
    }
  }
  function isAdminActive(){ return $('#adminControl')?.classList.contains('active'); }
  function bind(){
    if(document.__kng544Bound) return; document.__kng544Bound=true;
    document.addEventListener('click',ev=>{
      if(ev.target.closest?.('#kng544Refresh')){ render(); window.toast?.('Schaltzentrale aktualisiert.','success'); return; }
      const b=ev.target.closest?.('[data-kng544-target]');
      if(b && $('#adminControl')?.contains(b)){ gotoView(b.getAttribute('data-kng544-target')); }
    });
    document.addEventListener('change',ev=>{
      if(ev.target?.id==='kng544Start'){ st().settings=st().settings||{}; st().settings.adminControlStartPage=!!ev.target.checked; localStorage.setItem(START_KEY,ev.target.checked?'1':'0'); window.saveState?.(); }
      if(ev.target?.id==='kng544Check'){ st().settings=st().settings||{}; st().settings.systemCheckOnStart=!!ev.target.checked; localStorage.setItem('kng.systemcheck.autostart',ev.target.checked?'1':'0'); window.saveState?.(); }
    });
  }
  const oldShow=window.showView;
  window.showView=function(view){
    const r=oldShow?oldShow.apply(this,arguments):undefined;
    if(view==='adminControl') setTimeout(render,80);
    return r;
  };
  window.renderAdminControl=render;
  window.renderAdminControlPro=render;
  window.renderAdminControlFinal=render;
  window.refreshAdminControl=render;
  window.refreshAdminControlFinal=render;
  document.addEventListener('DOMContentLoaded',()=>{ bind(); setTimeout(()=>{ if(isAdminActive()) render(); },300); });
  setInterval(()=>{ if(isAdminActive()) render(); },5000);
})();
