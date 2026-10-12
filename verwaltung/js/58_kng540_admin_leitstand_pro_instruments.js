/* KNG 54.0 – Schaltzentrale Pro: sichtbare Versionskennzeichnung und stabilisierte Instrumente */
(function(){
  'use strict';
  function $(s,r=document){return r.querySelector(s);}
  function st(){return window.state||{};}
  function setNeedle(id, percent){
    const el=$('#'+id); if(!el) return;
    const p=Math.max(0,Math.min(100,Number(percent)||0));
    const deg=-70 + (p/100)*140;
    el.style.transform='rotate('+deg+'deg)';
  }
  function render540(){
    const root=$('#adminControl'); if(!root) return;
    root.classList.add('admin-leitstand-54-pro');
    const kicker=$('#adminControl .admin-kicker');
    if(kicker) kicker.textContent='KÖCHECLUB WERNE · SCHALTZENTRALE PRO · VERSION 54.0';
    const title=$('#adminControl .admin-control-header h3');
    if(title) title.textContent='Schaltzentrale – Admin Leitstand';
    const last=st().lastSystemCheck||{};
    const errors=Number(last.summary?.errors||0), warnings=Number(last.summary?.warnings||0);
    const health=Math.max(0,100-errors*35-warnings*12);
    const protocol=Array.isArray(st().protocol)?st().protocol.length:0;
    const dom=document.querySelectorAll('*').length;
    const load=Math.max(1,Math.min(100,Math.round(dom/95)));
    setNeedle('adminCtlHealthNeedle',health);
    setNeedle('adminCtlBackupNeedle',(Array.isArray(st().backupProtocol)&&st().backupProtocol.length>0)?88:42);
    setNeedle('adminCtlLoadNeedle',load);
    const hv=$('#adminCtlHealthValue'); if(hv) hv.textContent=health+'%';
    const bv=$('#adminCtlBackupValue'); if(bv) bv.textContent=(Array.isArray(st().backupProtocol)&&st().backupProtocol.length>0)?'OK':'--';
    const lv=$('#adminCtlLoadValue'); if(lv) lv.textContent=load+'%';
    const mon=$('#adminCtlMonitorText');
    if(mon && !mon.dataset.kng540){
      mon.dataset.kng540='1';
      mon.textContent='Leitstand Pro aktiv · System, Datenbank, Datensicherung, Protokolle und Benutzer im Blick.';
    }
    const c=$('#adminCtlConsole');
    if(c && !c.dataset.kng540){
      c.dataset.kng540='1';
      c.textContent='> KNG SCHALTZENTRALE PRO 54.0\n> Pro-Instrumente aktiv\n> Protokolle: '+protocol+'\n> DOM: '+dom+' Elemente\n> Rückkehrlogik: bereit\n> Datenbankmonitor: vorbereitet';
    }
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__kng540Wrapped!=='1'){
    const wrapped=function(){const ret=old.apply(this,arguments); try{setTimeout(render540,0);}catch(e){console.warn('KNG 54 render failed',e);} return ret;};
    wrapped.__kng540Wrapped='1'; window.renderAdminControl=wrapped;
  }
  window.renderAdminControl54=render540;
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(render540,600);setInterval(()=>{if($('#adminControl')?.classList.contains('active')) render540();},1200);});
})();
