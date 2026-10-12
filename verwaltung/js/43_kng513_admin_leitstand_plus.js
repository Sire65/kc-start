/* KNG 51.3 Admin-Leitstand Plus: besser lesbare Schalter, Monitorrotation, Alarm-/Performanceoptimierung */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function st(){return window.state||{};}
  function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function toast(msg,type='info'){try{window.toast?.(msg,type);}catch(_){console.log(msg);}}
  function save(){try{window.saveState?.();}catch(_){} }
  function getLastCheck(){return st().lastSystemCheck || {};}
  function getOverall(){
    const l=getLastCheck();
    const overall=String(l.overall || l.status || 'OK').toUpperCase();
    const warnings=Number(l.warnings || l.summary?.warnings || 0);
    const errors=Number(l.errors || l.summary?.errors || 0);
    if(errors>0 || overall.includes('FEHL')) return {word:'FEHLER',cls:'error',txt:`${errors} Fehler · ${warnings} Warnungen`};
    if(warnings>0 || overall.includes('WARN')) return {word:'WARNUNG',cls:'warn',txt:`0 Fehler · ${warnings} Warnungen`};
    return {word:'OK',cls:'',txt:'0 Fehler · 0 Warnungen'};
  }
  function latest(list, rx){
    const arr=Array.isArray(list)?list:[];
    for(let i=arr.length-1;i>=0;i--){ const e=arr[i]; const s=[e.action,e.details,e.module,e.result,e.text].join(' '); if(!rx || rx.test(s)) return e; }
    return null;
  }
  function count(list){return Array.isArray(list)?list.length:0;}
  function monitorSlides(){
    const sys=getOverall();
    const b=latest(st().backupProtocol,/Sicherung|Datensicherung|Backup/i);
    const r=latest(st().backupProtocol,/Rücksicherung|Restore/i);
    const prot=count(st().protocol);
    const sc=count(st().systemCheckProtocol);
    const docs=count(st().documents);
    const members=count(st().members);
    return [
      {title:'SYSTEMSTATUS',word:sys.word,cls:sys.cls,text:sys.txt,items:[['Mitglieder',members],['Dokumente',docs],['Checks',sc],['Protokoll',prot]]},
      {title:'DATENSICHERUNG',word:b?'AKTIV':'OFFEN',cls:b?'':'warn',text:b?`${b.date||''} ${b.time||''}`:'Noch keine Sicherung gefunden',items:[['Sicherungen',count(st().backupProtocol)],['Rücksich.',r?'OK':'--'],['Größe',b?.size||'--'],['Dauer',b?.duration||'--']]},
      {title:'MITGLIEDER / DATEN',word:String(members),cls:'',text:'aktive Mitglieder-Datensätze im lokalen Bestand',items:[['Adressen',count(st().addresses)],['Inventar',count(st().inventory)],['Kleidung',count(st().workwearArticles)],['Dokumente',docs]]},
      {title:'AKTIVITÄTEN',word:String(prot),cls:prot>200?'warn':'',text:'Einträge im Hauptprotokoll',items:[['Systemchecks',sc],['Backups',count(st().backupProtocol)],['Zahlungen',count(st().payments)],['Spenden',count(st().donations)]]}
    ];
  }
  function renderMonitor(){
    const monitor=$('.admin-central-monitor'); if(!monitor) return;
    const body=$('.monitor-body',monitor); if(!body) return;
    const slides=monitorSlides();
    const idx=Math.floor(Date.now()/12000)%slides.length;
    const s=slides[idx];
    const stamp=$('#adminCtlMonitorStamp'); if(stamp) stamp.textContent=new Date().toLocaleTimeString('de-DE');
    body.innerHTML=`
      <div class="monitor-slide-title">${esc(s.title)}</div>
      <div class="monitor-status-word ${esc(s.cls)}">${esc(s.word)}</div>
      <div class="monitor-status-text">${esc(s.text)}</div>
      <div class="monitor-grid">${s.items.map(([a,b])=>`<div><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('')}</div>
      <div class="monitor-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>`;
  }
  function renderAlarmCenter(){
    const box=$('#adminCtlAlarms'); if(!box) return;
    const sys=getOverall(); const alarms=[];
    if(sys.cls==='') alarms.push({ok:true,text:'Alle Hauptsysteme melden Normalbetrieb.'});
    if(sys.cls==='warn') alarms.push({ok:false,text:'Systemcheck meldet Warnung. Bitte Systemcheck öffnen.'});
    if(sys.cls==='error') alarms.push({ok:false,text:'Systemcheck meldet Fehler. Sofort prüfen.'});
    if(count(st().protocol)>500) alarms.push({ok:false,text:'Hauptprotokoll sehr groß – Bereinigung empfohlen.'});
    if(count(st().systemCheckProtocol)>100) alarms.push({ok:false,text:'Systemcheck-Protokoll groß – Archivierung empfohlen.'});
    if(!latest(st().backupProtocol,/Sicherung|Backup|Datensicherung/i)) alarms.push({ok:false,text:'Noch keine Datensicherung im Protokoll gefunden.'});
    box.innerHTML=alarms.slice(0,5).map(a=>`<div class="alarm-item ${a.ok?'ok':''}">${a.ok?'🟢':'🟡'} ${esc(a.text)}</div>`).join('');
  }
  function enhanceSwitches(){
    $$('.admin-switch').forEach(label=>{
      if(label.dataset.kng513Enhanced==='1') return;
      label.dataset.kng513Enhanced='1';
      label.title='';
      if(!label.querySelector('small')){
        const txt=Array.from(label.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
        if(txt){ Array.from(label.childNodes).filter(n=>n.nodeType===3).forEach(n=>n.textContent=''); label.insertAdjacentHTML('beforeend',`<small>${esc(txt)}</small>`); }
      }
    });
  }
  function updateGauges(){
    const protocolCount=count(st().protocol), memberCount=count(st().members), docCount=count(st().documents);
    const gauges=$$('.semi-gauge');
    const vals=[Math.min(100,Math.round(memberCount/50*100)), Math.min(100,Math.round(protocolCount/500*100)), Math.min(100,Math.round(docCount/100*100))];
    gauges.forEach((g,i)=>{ const b=$('b',g); const span=$('span',g); const v=vals[i]??50; if(b) b.style.transform=`rotate(${(-70+v*1.4).toFixed(1)}deg)`; if(span) span.textContent=(i===0?memberCount:v+'%'); });
  }
  function applyEnergyMode(){
    const enabled=!!(st().settings?.adminControlEnergyMode || localStorage.getItem('kng.adminLeitstand.energyMode')==='1');
    document.body.classList.toggle('admin-energy-mode',enabled);
    const cb=$('#adminCtlEnergyMode'); if(cb) cb.checked=enabled;
  }
  function addEnergySwitch(){
    const panel=$('.admin-switch-grid-compact'); if(!panel || $('#adminCtlEnergyMode')) return;
    panel.insertAdjacentHTML('beforeend',`<label class="admin-switch"><input id="adminCtlEnergyMode" type="checkbox"><span></span><small>Energiesparmodus</small></label>`);
    const el=$('#adminCtlEnergyMode');
    el.addEventListener('change',()=>{ st().settings=st().settings||{}; st().settings.adminControlEnergyMode=el.checked; localStorage.setItem('kng.adminLeitstand.energyMode',el.checked?'1':'0'); save(); applyEnergyMode(); toast('Energiesparmodus '+(el.checked?'aktiviert.':'deaktiviert.'),'info'); });
  }
  function addLazyPanels(){
    const target=$('.admin-pro-bottom'); if(!target || $('#adminCtlDetailDrawer')) return;
    target.insertAdjacentHTML('afterend',`
      <div id="adminCtlDetailDrawer" class="admin-detail-drawer collapsed">
        <button id="adminCtlToggleDetails" class="admin-control-btn" type="button">Maschinenraum / Details anzeigen</button>
        <div class="admin-detail-content">
          <div><strong>Browser</strong><span id="adminCtlDetailBrowser">--</span></div>
          <div><strong>Bildschirm</strong><span>${screen.width}×${screen.height}</span></div>
          <div><strong>DOM</strong><span>${document.querySelectorAll('*').length} Elemente</span></div>
          <div><strong>Speicher</strong><span>${localStorage?'localStorage OK':'nicht verfügbar'}</span></div>
        </div>
      </div>`);
    const btn=$('#adminCtlToggleDetails');
    btn.addEventListener('click',()=>{ const d=$('#adminCtlDetailDrawer'); d.classList.toggle('collapsed'); btn.textContent=d.classList.contains('collapsed')?'Maschinenraum / Details anzeigen':'Maschinenraum / Details ausblenden'; const br=$('#adminCtlDetailBrowser'); if(br) br.textContent=navigator.userAgent.match(/(Edg|Chrome|Firefox)\/[^\s]+/)?.[0]||'Browser'; });
  }
  function render513(){
    const view=$('#adminControl'); if(!view || !view.classList.contains('active')) return;
    document.body.classList.add('admin-leitstand-plus');
    addEnergySwitch(); enhanceSwitches(); renderMonitor(); renderAlarmCenter(); updateGauges(); applyEnergyMode(); addLazyPanels();
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__kng513Wrapped!=='1'){
    const wrapped=function(){const ret=old.apply(this,arguments); setTimeout(render513,0); return ret;};
    wrapped.__kng513Wrapped='1'; window.renderAdminControl=wrapped;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(render513,1000);
    setInterval(render513,4000);
  });
})();
