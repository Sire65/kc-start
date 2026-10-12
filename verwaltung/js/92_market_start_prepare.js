/* KC Verwaltung – Marktstart 2026 Vorbereitung */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const ACCESS_KEY='kc_manager_access_token';
  const ORG='KC_WERNE';
  const CONFIRM_TEXT='MARKTSTART 2026';
  let previewReady=false;
  const $=id=>document.getElementById(id);
  const num=v=>Number(v||0).toLocaleString('de-DE');

  async function token(){
    if(window.KCCloudSession?.ready)await window.KCCloudSession.ready();
    return sessionStorage.getItem(ACCESS_KEY)||'';
  }
  async function call(action,extra={}){
    const t=await token();
    if(!t)throw new Error('Keine aktive KC-Anmeldung');
    const r=await fetch(SUPA+'/functions/v1/kc-finance-bridge',{
      method:'POST',
      headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json','x-client-info':'kc-verwaltung-market-start/1.0'},
      body:JSON.stringify({action,orgId:ORG,...extra})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d?.detail||d?.error||('HTTP '+r.status));
    return d;
  }
  function stateButton(){
    const btn=$('marketStartExecute');
    if(btn)btn.disabled=!(previewReady&&String($('marketStartConfirm')?.value||'')===CONFIRM_TEXT);
  }
  function status(text,kind='info'){
    const el=$('marketStartResetStatus');
    if(!el)return;
    el.className='market-reset-status '+kind;
    el.textContent=text;
  }
  async function preview(){
    const btn=$('marketStartPreview');
    if(btn)btn.disabled=true;
    status('Löschvorschau wird geprüft …','info');
    try{
      const d=await call('market_start_preview');
      const del=d.deleted||{},keep=d.preserved||{};
      if($('marketResetTransfers'))$('marketResetTransfers').textContent=num(del.cashTransfers||0);
      if($('marketResetCounts'))$('marketResetCounts').textContent=num(del.cashCounts||0);
      if($('marketResetClosings'))$('marketResetClosings').textContent=num(del.closingReports||0);
      if($('marketResetSettings'))$('marketResetSettings').textContent=num(keep.cashMeasureSettings||0);
      const total=Number(del.cashTransfers||0)+Number(del.cashCounts||0)+Number(del.closingReports||0);
      previewReady=true;
      status(total?('Vorschau geladen: '+num(total)+' Finance-Bewegungsdatensätze sind für die Bereinigung vorgemerkt.'):'Vorschau geladen: keine zentralen Finance-Bewegungsdaten vorhanden.',total?'warn':'ok');
    }catch(e){
      previewReady=false;
      status('Vorschau fehlgeschlagen: '+String(e?.message||e),'error');
    }finally{
      if(btn)btn.disabled=false;
      stateButton();
    }
  }
  async function execute(){
    if(!previewReady||String($('marketStartConfirm')?.value||'')!==CONFIRM_TEXT)return;
    const btn=$('marketStartExecute');
    if(btn)btn.disabled=true;
    status('Marktstart-Vorbereitung wird ausgeführt …','warn');
    try{
      const d=await call('market_start_reset',{confirm:CONFIRM_TEXT});
      const done=d?.result?.deleted||{};
      if($('marketStartConfirm'))$('marketStartConfirm').value='';
      previewReady=false;
      status('Vorbereitung abgeschlossen · Übergaben '+num(done.cash_transfers||0)+' · Zählungen '+num(done.cash_counts||0)+' · Tagesabschlüsse '+num(done.closing_reports||0)+' · Audit-ID '+String(d?.result?.resetId||'–'),'ok');
      await preview();
      if(window.KCMarketDashboard?.load)await window.KCMarketDashboard.load(true);
      if(window.toast)window.toast('Marktstart 2026 vorbereitet. Stammdaten und Gewichtstabellen blieben erhalten.','success');
    }catch(e){
      status('Vorbereitung fehlgeschlagen: '+String(e?.message||e),'error');
    }finally{
      stateButton();
    }
  }
  function bind(){
    $('marketStartPreview')?.addEventListener('click',preview);
    $('marketStartConfirm')?.addEventListener('input',stateButton);
    $('marketStartExecute')?.addEventListener('click',execute);
    document.querySelector('[data-dashboard-tab="dashboardMarketStats"]')?.addEventListener('click',preview);
    stateButton();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.KCMarketStart={preview,execute};
})();