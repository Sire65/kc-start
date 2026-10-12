/* KNG 53.1d – Systemcheck Übersicht endgültig vereinheitlicht + Protokoll-Löschschutz
   - verhindert, dass die alte dunkle 53.1a-Übersicht erneut angezeigt wird
   - löscht beim Systemcheck-Protokoll nicht blind alles, sondern behält die eingestellte Anzahl
*/
(function(){
  'use strict';
  const PROTOCOL_KEY='kng_system_check_protocol_v491';
  const KEEP_KEY='kng_system_check_protocol_keep';
  const $=(s,r=document)=>r.querySelector(s);
  function readJson(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch(_){return f;}}
  function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(_){return false;}}
  function getKeep(){
    const st=window.state||{};
    const n=Number(st.settings?.systemCheckProtocolKeep || localStorage.getItem(KEEP_KEY) || 10);
    return Math.max(0, Number.isFinite(n)?n:10);
  }
  function getProtocol(){
    const st=window.state||{};
    if(Array.isArray(st.systemCheckProtocol) && st.systemCheckProtocol.length) return st.systemCheckProtocol.slice();
    const fromStore=readJson(PROTOCOL_KEY,[]);
    return Array.isArray(fromStore)?fromStore:[];
  }
  function setProtocol(list){
    const out=Array.isArray(list)?list:[];
    writeJson(PROTOCOL_KEY,out);
    window.state=window.state||{};
    window.state.systemCheckProtocol=out;
    try{window.saveState?.();}catch(_){}
    try{window.KNG_RENDER_SYSTEMCHECK_PROTOCOL_NOW?.();}catch(_){}
    try{window.renderSystemCheckProtocol?.();}catch(_){}
  }
  function forceUnifiedOverview(){
    const box=$('#systemCheckOverview');
    if(!box) return;
    const old=box.querySelector('.kng531-overview-empty');
    if(old) old.remove();
    if(typeof window.KNG531C_renderSystemcheckOverview==='function'){
      try{ window.KNG531C_renderSystemcheckOverview(); }catch(_){}
    }
  }
  function installObserver(){
    const box=$('#systemCheckOverview');
    if(!box || box.__kng531dObserver) return;
    box.__kng531dObserver=new MutationObserver(()=>{
      // 54.8.20 Startfix: der Leer-Hinweis ohne Bericht gilt als fertig (sonst Endlosschleife bei frischer Version)
      if(box.querySelector('.kng531-overview-empty') || !box.querySelector('.kng531c-overview-grid, .kng531c-summary-line')){
        requestAnimationFrame(forceUnifiedOverview);
      }
    });
    box.__kng531dObserver.observe(box,{childList:true,subtree:true});
  }
  function installCss(){
    if($('#kng531dStyle')) return;
    const st=document.createElement('style'); st.id='kng531dStyle';
    st.textContent='#systemCheckOverview .kng531-overview-empty{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important}';
    document.head.appendChild(st);
  }
  function bindClearProtection(){
    if(document.__kng531dClearBound) return; document.__kng531dClearBound=true;
    document.addEventListener('click',function(ev){
      const btn=ev.target && ev.target.closest && ev.target.closest('#clearSystemCheckProtocol');
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      const keep=getKeep();
      const list=getProtocol();
      if(!confirm('Systemcheck-Protokoll bereinigen? Die letzten '+keep+' Einträge bleiben erhalten.')) return;
      const kept=keep>0 ? list.slice(0,keep) : [];
      setProtocol(kept);
      try{window.toast?.('Systemcheck-Protokoll bereinigt. Erhalten: '+kept.length+' Einträge.','success');}catch(_){}
    },true);
  }
  function init(){
    installCss(); bindClearProtection(); installObserver(); forceUnifiedOverview();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,50)); else setTimeout(init,50);
  document.addEventListener('click',()=>setTimeout(init,20),true);
  window.KNG531D_forceUnifiedOverview=forceUnifiedOverview;
})();
