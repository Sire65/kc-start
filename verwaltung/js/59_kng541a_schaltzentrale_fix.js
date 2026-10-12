/* KNG 54.1a – Schaltzentrale Pro Fix: Logik, Klicks, Aktualisierung */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function st(){return window.state||{};}
  function count(v){return Array.isArray(v)?v.length:0;}
  function latest(list,rx){rx=rx instanceof RegExp?rx:new RegExp(String(rx),'i'); return (Array.isArray(list)?list:[]).find(e=>rx.test([e.action,e.details,e.module,e.result,e.status].join(' ')));}
  function entryDate(e){return e?String((e.date||'')+' '+(e.time||'')).trim()||e.createdAt||e.iso||'--':'--';}
  function pct(value,max){value=Number(value)||0; max=Math.max(1,Number(max)||1); return Math.max(0,Math.min(100,Math.round(value/max*100)));}
  function go(view){
    try{ sessionStorage.setItem('kng.adminLeitstand.returnWanted','1'); }catch(_){ }
    if(typeof window.showView==='function') window.showView(view);
  }
  function setMeter(el,value,max,view,title){
    if(!el) return;
    const p=pct(value,max);
    el.style.setProperty('--pct',String(p));
    el.classList.toggle('zero',Number(value)===0);
    el.classList.toggle('warn',p>=75 && p<95);
    el.classList.toggle('error',p>=95);
    if(view){ el.dataset.kngTarget=view; el.title=title||('Öffnen: '+view); }
  }
  function applyStatMeters(){
    const meters=$$('#adminControl .pro-stat-grid .round-meter');
    if(meters.length<4) return;
    const members=count(st().members);
    const docs=count(st().documents);
    const backups=count(st().backupProtocol);
    const logs=count(st().protocol);
    setMeter(meters[0],members,100,'members','Mitgliederverwaltung öffnen');
    setMeter(meters[1],docs,500,'documents','Dokumentenverwaltung öffnen');
    setMeter(meters[2],backups,50,'backup','Datensicherung öffnen');
    setMeter(meters[3],logs,Number(st().settings?.protocolLimit||1000),'protocol','Hauptprotokoll öffnen');
  }
  function applySemiInstrumentClicks(){
    const cards=$$('#adminControl .instrument-card');
    const defs=[
      ['systemCheck','Systemcheck öffnen'],
      ['backup','Datensicherung öffnen'],
      ['systemCheck','Leistung/Systemcheck öffnen']
    ];
    cards.forEach((c,i)=>{ if(defs[i]){ c.dataset.kngTarget=defs[i][0]; c.title=defs[i][1]; }});
  }
  function refreshBackupDates(){
    const b=latest(st().backupProtocol,/Datensicherung|Sicherung|Backup/i);
    const r=latest(st().backupProtocol,/Rück|Rueck|Restore/i);
    const lb=$('#adminCtlLastBackupDate')||$('#adminCtlLastBackup');
    const lr=$('#adminCtlLastRestoreDate')||$('#adminCtlLastRestore');
    if(lb) lb.textContent=entryDate(b);
    if(lr) lr.textContent=entryDate(r);
    const bv=$('#adminCtlBackupValue');
    if(bv) bv.textContent=b && !/fehl|error|abbruch/i.test([b.action,b.details].join(' '))?'OK':'--';
    const bs=$('#adminCtlBackupStatus');
    if(bs) bs.textContent=b?'OK':'KEINE DATEN';
  }
  function render541a(){
    const root=$('#adminControl'); if(!root) return;
    root.classList.add('admin-leitstand-541a');
    const title=$('#adminControl .admin-control-header h3');
    if(title) title.textContent='Schaltzentrale – Admin Leitstand';
    const kicker=$('#adminControl .admin-kicker');
    if(kicker) kicker.textContent='KÖCHECLUB WERNE · SCHALTZENTRALE PRO · VERSION 54.1a';
    applyStatMeters();
    applySemiInstrumentClicks();
    refreshBackupDates();
  }
  document.addEventListener('click',ev=>{
    const el=ev.target.closest?.('#adminControl [data-kng-target]');
    if(!el) return;
    ev.preventDefault(); ev.stopPropagation();
    go(el.dataset.kngTarget);
  },true);
  const oldLogBackup=window.logBackup;
  if(typeof oldLogBackup==='function' && oldLogBackup.__kng541aWrapped!=='1'){
    const wrapped=function(){ const ret=oldLogBackup.apply(this,arguments); try{ setTimeout(()=>{refreshBackupDates(); window.renderAdminControl?.();},0); }catch(_){ } return ret; };
    wrapped.__kng541aWrapped='1'; window.logBackup=wrapped;
  }
  const old=window.renderAdminControl;
  if(typeof old==='function' && old.__kng541aWrapped!=='1'){
    const wrapped=function(){ const ret=old.apply(this,arguments); try{setTimeout(render541a,0);}catch(e){console.warn('KNG 54.1a render failed',e);} return ret; };
    wrapped.__kng541aWrapped='1'; window.renderAdminControl=wrapped;
  }
  window.renderAdminControl541a=render541a;
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(render541a,800);
    setInterval(()=>{ if($('#adminControl')?.classList.contains('active')) render541a(); },1500);
  });
})();
