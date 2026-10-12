/* KC Verwaltung 54.8.16 – Recovery delegiert vollständig an den zentralen Cloud-Sync */
(function(){
  'use strict';
  let hooked=false;
  function installSaveHook(){
    if(hooked||typeof window.saveState!=='function')return;
    hooked=true;
    const native=window.saveState;
    window.saveState=function(){
      const ok=native.apply(this,arguments);
      if(ok!==false)setTimeout(()=>window.KNGCloudSync?.syncNow?.().catch?.(()=>{}),80);
      return ok;
    };
  }
  async function recover(){
    installSaveHook();
    try{return await window.KNGCloudSync?.adoptSession?.()||false;}
    catch(error){console.warn('KC Cloud-Recovery:',error?.message||error);return false;}
  }
  window.addEventListener('kc:cloud-session',e=>{if(e.detail?.connected)setTimeout(recover,10);});
  window.addEventListener('online',()=>setTimeout(recover,10));
  window.KCCloudRecoverySync={version:'54.8.16',recover};
  const start=()=>{installSaveHook();setTimeout(recover,20);setTimeout(recover,500);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
