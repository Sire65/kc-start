/* KNG 51.0 Admin-Leitstand Pro – zusätzliche Anzeigen für Zentralmonitor und Instrumente */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  function st(){return window.state||{};}
  function txt(id,val){const el=$('#'+id); if(el) el.textContent=String(val??'--');}
  function clsStatus(el, cls){ if(!el) return; el.classList.remove('warn','error'); if(cls==='warn') el.classList.add('warn'); if(cls==='error') el.classList.add('error'); }
  function getSystem(){
    const last=st().lastSystemCheck||{};
    const overall=String(last.summary?.overall||'OK').toUpperCase();
    const errors=Number(last.summary?.errors||0), warnings=Number(last.summary?.warnings||0);
    const cls=errors>0||overall.includes('FEHL')?'error':(warnings>0||overall.includes('WARN')?'warn':'ok');
    return {overall: cls==='ok'?'SYSTEM OK':cls==='warn'?'WARNUNG':'FEHLER', errors, warnings, cls, last};
  }
  function latestBackupState(){
    const list=Array.isArray(st().backupProtocol)?st().backupProtocol:[];
    const last=list[0];
    if(!last) return {label:'KEINE DATEN', cls:'warn', value:'--'};
    const t=String((last.action||'')+' '+(last.details||''));
    const bad=/fehl|error|abbruch/i.test(t);
    return {label:bad?'FEHLER':'OK', cls:bad?'error':'ok', value:bad?'FEHLER':'OK'};
  }
  function setNeedle(id, percent){
    const el=$('#'+id); if(!el) return;
    const p=Math.max(0,Math.min(100,Number(percent)||0));
    const deg=-70 + (p/100)*140;
    el.style.transform=`rotate(${deg}deg)`;
  }
  function renderPro(){
    if(!$('#adminControl')) return;
    const sys=getSystem(), b=latestBackupState();
    const health=Math.max(0,100-sys.errors*35-sys.warnings*15);
    const dom=document.querySelectorAll('*').length;
    const load=Math.max(5,Math.min(100,Math.round(dom/80)));
    txt('adminCtlMode','ADMIN');
    txt('adminCtlMonitorStamp',new Date().toLocaleString('de-DE'));
    txt('adminCtlMonitorStatus',sys.overall);
    clsStatus($('#adminCtlMonitorStatus'),sys.cls);
    txt('adminCtlMonitorText', sys.cls==='ok'?'Alle Dienste im Normalbetrieb. Keine aktiven Alarme.': sys.cls==='warn'?'Warnungen vorhanden. Bitte Systemcheck prüfen.':'Fehler vorhanden. Sofortige Prüfung empfohlen.');
    txt('adminCtlErrCount',sys.errors);
    txt('adminCtlWarnCount',sys.warnings);
    txt('adminCtlHealthValue',health+'%');
    txt('adminCtlBackupValue',b.value);
    txt('adminCtlLoadValue',load+'%');
    txt('adminCtlProtocolShort',Array.isArray(st().protocol)?st().protocol.length:0);
    setNeedle('adminCtlHealthNeedle',health);
    setNeedle('adminCtlBackupNeedle',b.cls==='ok'?92:b.cls==='warn'?55:18);
    setNeedle('adminCtlLoadNeedle',load);
    // Konsolentext erweitern, ohne Kernfunktion zu stören
    const c=$('#adminCtlConsole');
    if(c){
      const session=st().session||{};
      const sysTime=st().lastSystemCheck?.environment?.createdAtLocal||'--';
      c.textContent=`> KNG ADMIN-LEITSTAND 51.0\n> Bediener: ${session.userName||'Gast'} / ${session.role||'Gast'}\n> System: ${sys.overall} | Fehler ${sys.errors} | Warnungen ${sys.warnings}\n> Datensicherung: ${b.label}\n> Mitglieder: ${(typeof getMemberCount==='function'?getMemberCount():(Array.isArray(st().members)?st().members.length:0))}\n> Dokumente: ${(Array.isArray(st().documents)?st().documents.length:0)}\n> DOM-Elemente: ${dom}\n> Letzter Systemcheck: ${sysTime}\n> Leitstand bereit.`;
    }
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__proWrapped!=='1'){
    const wrapped=function(){ const ret=old.apply(this,arguments); try{renderPro();}catch(e){console.warn('Admin Pro render failed',e);} return ret; };
    wrapped.__proWrapped='1'; window.renderAdminControl=wrapped;
  }
  window.renderAdminControlPro=renderPro;
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(renderPro,800);
    setInterval(()=>{ if($('#adminControl')?.classList.contains('active')) renderPro(); },1500);
  });
})();
