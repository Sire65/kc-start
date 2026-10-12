/* KC Verwaltung 54.8.20 – Bootstrap für dauerhafte Supabase-Hauptdatenbank */
(function(){
  'use strict';
  const VERSION='54.8.20';
  const dbLedState={idx:'working',sup:'working',idxDetail:'IndexedDB wird geprüft',supDetail:'Supabase wird vorbereitet'};
  // NIC/Switch-Prinzip: ein echtes I/O-Ereignis = ein kurzer Lichtimpuls.
  // Keine Queue und kein Nachlauf. Dauerverkehr bleibt sichtbar flackernd, nie dauerhaft gelb.
  const traffic={idx:{on:false,cooldown:false,offTimer:0,coolTimer:0},sup:{on:false,cooldown:false,offTimer:0,coolTimer:0}};
  function ledClass(state){return ['ready','error','working','warn'].includes(state)?state:'error';}
  function setDbLed(kind,state,detail){
    if(kind!=='idx'&&kind!=='sup')return;
    dbLedState[kind]=state;if(detail)dbLedState[kind+'Detail']=detail;
    const el=document.getElementById(kind==='idx'?'kngIdxState':'kngSupState');
    if(el){el.className='kng-db-led '+ledClass(state);el.title=dbLedState[kind+'Detail']||'';}
  }
  function trafficElement(kind){return document.getElementById(kind==='idx'?'kngIdxTraffic':'kngSupTraffic');}
  function setTrafficVisual(kind,on){
    const el=trafficElement(kind);if(!el)return;
    el.classList.toggle('traffic-active',!!on);
    el.setAttribute('aria-label',(kind==='idx'?'IndexedDB':'Supabase')+' Datenverkehr: '+(on?'aktiv':'Ruhe'));
  }
  function forceTrafficIdle(kind){
    const ch=traffic[kind];if(!ch)return;
    clearTimeout(ch.offTimer);clearTimeout(ch.coolTimer);ch.offTimer=0;ch.coolTimer=0;ch.on=false;ch.cooldown=false;setTrafficVisual(kind,false);
  }
  function trafficPulse(kind){
    if(kind!=='idx'&&kind!=='sup')return;
    const ch=traffic[kind];if(ch.on||ch.cooldown)return;
    ch.on=true;setTrafficVisual(kind,true);
    ch.offTimer=setTimeout(()=>{
      ch.on=false;setTrafficVisual(kind,false);ch.cooldown=true;
      ch.coolTimer=setTimeout(()=>{ch.cooldown=false;},85);
    },95);
  }
  window.KNGDbLedBridge={setState:setDbLed,traffic:trafficPulse,getState:()=>({...dbLedState})};

  // Wahrheitsquelle für den zentralen KC-System-Check:
  // Es zählen ausschließlich ERFOLGREICHE echte Supabase-Aufrufe der Anwendung.
  // Die Telemetrie-Aufrufe selbst werden ausdrücklich ausgeschlossen, damit kein
  // selbst erzeugter Scheinverkehr entsteht.
  const realFlow=window.KNG_REAL_FLOW_TELEMETRY=window.KNG_REAL_FLOW_TELEMETRY||{supabaseTx:0,lastSuccessAt:null,lastUrl:null};
  function isTelemetryUrl(url){return /\/functions\/v1\/(?:kicc-program-heartbeat|kicc-program-flow)(?:[/?#]|$)/i.test(url||'');}
  if(!window.__KNG_SUPABASE_FETCH_TRAFFIC_RC23){
    window.__KNG_SUPABASE_FETCH_TRAFFIC_RC23=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      let u='';try{u=typeof input==='string'?input:String(input?.url||'');}catch(_e){}
      const isSb=/^https:\/\/[^/]*supabase\.co\//i.test(u),isTelemetry=isTelemetryUrl(u);
      if(isSb&&!isTelemetry)trafficPulse('sup');
      try{
        const response=await nativeFetch(input,init);
        if(isSb&&!isTelemetry&&response?.ok){
          realFlow.supabaseTx=Math.max(0,Number(realFlow.supabaseTx||0))+1;
          realFlow.lastSuccessAt=new Date().toISOString();
          realFlow.lastUrl=u.slice(0,240);
          try{window.dispatchEvent(new CustomEvent('kc-verwaltung:real-supabase-flow',{detail:{at:realFlow.lastSuccessAt,count:realFlow.supabaseTx}}));}catch(_e){}
        }
        return response;
      }finally{if(isSb&&!isTelemetry)trafficPulse('sup');}
    };
  }

  const files=[
    'js/74_kc_cloud_session_5484.js?v='+VERSION,
    'js/72_kc_communication_bridge.js?v='+VERSION,
    'js/73_kc_communication_recipients_5483.js?v='+VERSION,
    'js/74_kc_communication_layout_5484.js?v='+VERSION,
    'js/75_kc_communication_5485_patch.js?v='+VERSION,
    'js/76_kc_communication_cc_bcc_5486.js?v='+VERSION,
    'js/77_kc_communication_5489_delivery_fix.js?v='+VERSION,
    'js/80_kc_cloud_primary_5412.js?v='+VERSION,
    'js/81_kc_cloud_recovery_sync_5413.js?v='+VERSION,
    'js/71_fibu_konto.js?v='+VERSION,
    'js/72_activity_decision_fields.js?v='+VERSION,
    'js/82_fibu_investition_ruecklagen.js?v='+VERSION,
    'js/83_fibu_kontenplan_workflow.js?v='+VERSION,
    'js/84_push_self_heal.js?v='+VERSION,
    'js/71_kicc_remote_heartbeat.js?v='+VERSION
  ];
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(src);s.onerror=()=>reject(new Error('Konnte '+src+' nicht laden'));document.head.appendChild(s);});}
  function statusText(){const s=window.KNGCloudSync?.status;if(!s)return 'Cloud wird vorbereitet';if(s.pending)return s.pending+' Änderungen warten';if(s.sup==='ready')return 'Supabase aktuell';if(s.sup==='working')return 'Synchronisiert …';if(s.sup==='error')return 'Cloud-Fehler';return 'lokal gesichert';}
  function ensureUi(){
    if(document.getElementById('kngDbMonitor54816'))return;
    const host=document.querySelector('.top-actions')||document.querySelector('header')||document.body;
    const b=document.createElement('button');b.id='kngDbMonitor54816';b.type='button';b.className='kng-db-monitor';b.title='Datenbankstatus · oben Zustand, unten echter Datenverkehr';
    b.innerHTML='<span class="kng-db-unit"><b>IDX</b><i id="kngIdxState" class="kng-db-led working" title="IndexedDB wird geprüft"></i><i id="kngIdxTraffic" class="kng-db-traffic" title="Echter IndexedDB-Datenverkehr"></i></span><span class="kng-db-unit"><b>SB</b><i id="kngSupState" class="kng-db-led working" title="Supabase wird vorbereitet"></i><i id="kngSupTraffic" class="kng-db-traffic" title="Echter Supabase-Datenverkehr"></i></span><small id="kngDbCompactText">Start …</small>';
    host.prepend(b);
    forceTrafficIdle('idx');forceTrafficIdle('sup');
    setDbLed('idx',typeof indexedDB==='undefined'?'error':'ready',typeof indexedDB==='undefined'?'IndexedDB nicht verfügbar':'IndexedDB lokal verfügbar');
    const d=document.createElement('dialog');d.id='kngDbDialog54816';d.innerHTML='<h3>Datenbank · KC Verwaltung '+VERSION+'</h3><p id="kngDbDetail54816">Supabase wird vorbereitet.</p><p><strong id="kngDbPending54816">0</strong> offene Änderungen</p><p id="kngDbAutoConnected54816"><strong>✓ Supabase gehört zur KC-Anmeldung</strong><br><small>Keine zweite Cloud-Anmeldung erforderlich. Sitzung und Datenabgleich laufen automatisch.</small></p><div class="button-row"><button id="kngDbSync54816" class="secondary" type="button">Datenstand prüfen</button><button id="kngDbClose54816" class="secondary" type="button">Schließen</button></div>';
    document.body.appendChild(d);b.onclick=()=>{paint();d.showModal();};
    d.querySelector('#kngDbClose54816').onclick=()=>d.close();
    d.querySelector('#kngDbSync54816').onclick=async()=>{await window.KNGCloudSync?.flush?.();paint();};
    setInterval(paint,1000);paint();
  }
  function paint(){const s=window.KNGCloudSync?.status||{};const compact=document.getElementById('kngDbCompactText');if(compact)compact.textContent=s.pending?String(s.pending)+' offen':statusText().replace('Supabase ','SB ');const detail=document.getElementById('kngDbDetail54816');if(detail)detail.textContent=s.detail||'Lokaler Speicher aktiv.';const p=document.getElementById('kngDbPending54816');if(p)p.textContent=String(s.pending||0);const auto=document.getElementById('kngDbAutoConnected54816');if(auto)auto.hidden=false;const supState=s.sup==='ready'?'ready':s.sup==='working'?'working':s.sup==='error'||s.sup==='offline'?'error':'warn';setDbLed('sup',supState,s.detail||'Supabase-Status');}
  async function boot(){
    try{document.title='Köcheclub Verwaltung 1.0 – Version '+VERSION;}catch(_e){}
    for(const f of files){try{await load(f);}catch(e){console.error(e);window.toast?.('Datenmodul konnte nicht geladen werden: '+f,'error');}}
    ensureUi();
    try{await window.KCCloudSession?.ready?.();await window.KNGCloudSync?.adoptSession?.();}catch(_e){}
    paint();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
