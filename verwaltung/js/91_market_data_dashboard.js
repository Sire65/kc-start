/* KC Verwaltung – Weihnachtsmarkt / Datenverkehr Dashboard */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const ACCESS_KEY='kc_manager_access_token';
  const ORG='KC_WERNE';
  const DEFAULT_FROM='2026-12-04',DEFAULT_TO='2026-12-13';
  let allEvents=[],loaded=false,loading=false;

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const euro=v=>Number(v||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  const num=v=>Number(v||0).toLocaleString('de-DE');
  const bytes=v=>{let n=Number(v||0);if(n<1024)return num(n)+' B';if(n<1048576)return (n/1024).toLocaleString('de-DE',{maximumFractionDigits:1})+' KB';return (n/1048576).toLocaleString('de-DE',{maximumFractionDigits:1})+' MB'};
  const date=v=>{if(!v)return '–';try{return new Date(v).toLocaleString('de-DE')}catch{return String(v)}};
  const day=v=>String(v||'').slice(0,10);
  const color=i=>typeof window.chartColor==='function'?window.chartColor(i):['#2f6b3f','#b9904b','#3b82f6','#dc2626','#7c3aed','#0f766e'][i%6];

  async function token(){if(window.KCCloudSession?.ready)await window.KCCloudSession.ready();return sessionStorage.getItem(ACCESS_KEY)||''}
  async function call(body){
    const t=await token();if(!t)throw new Error('Keine aktive KC-Anmeldung');
    const r=await fetch(SUPA+'/functions/v1/kc-finance-bridge',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json','x-client-info':'kc-verwaltung-market-dashboard/1.0'},body:JSON.stringify({...body,orgId:ORG})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.detail||d?.error||('HTTP '+r.status));return d;
  }

  function setDefaults(){
    if($('marketFilterFrom')&&!$('marketFilterFrom').value)$('marketFilterFrom').value=DEFAULT_FROM;
    if($('marketFilterTo')&&!$('marketFilterTo').value)$('marketFilterTo').value=DEFAULT_TO;
  }
  function filters(){
    return {from:$('marketFilterFrom')?.value||'',to:$('marketFilterTo')?.value||'',register:$('marketFilterRegister')?.value||'',kind:$('marketFilterKind')?.value||'',source:$('marketFilterSource')?.value||'',status:$('marketFilterStatus')?.value||'',mode:$('marketFilterMode')?.value||''};
  }
  function inputMode(e){return String(e?.payload?.inputMode||e?.payload?.countInputMode||'')}
  function visibleEvents(){
    const f=filters();
    return allEvents.filter(e=>{
      const d=e.businessDate||day(e.time);
      if(f.from&&d<f.from)return false;if(f.to&&d>f.to)return false;
      if(f.register&&String(e.registerId||'')!==f.register)return false;
      if(f.kind&&e.kind!==f.kind)return false;
      if(f.source&&String(e.source||'')!==f.source)return false;
      if(f.status&&String(e.status||'')!==f.status)return false;
      if(f.mode&&inputMode(e)!==f.mode)return false;
      return true;
    });
  }
  function fillOptions(id,values,label='Alle'){
    const el=$(id);if(!el)return;const cur=el.value;
    el.innerHTML='<option value="">'+label+'</option>'+[...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'de')).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
    if([...el.options].some(o=>o.value===cur))el.value=cur;
  }
  function syncOptions(){
    fillOptions('marketFilterRegister',allEvents.map(x=>x.registerId),'Alle Kassen');
    fillOptions('marketFilterSource',allEvents.map(x=>x.source),'Alle Quellen');
    fillOptions('marketFilterStatus',allEvents.map(x=>x.status),'Alle Status');
  }

  function daily(rows,field,kind='closing'){
    const m=new Map();
    rows.filter(x=>x.kind===kind).forEach(x=>{const d=x.businessDate||day(x.time);if(!d)return;m.set(d,(m.get(d)||0)+Number(x[field]||0))});
    return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([label,value])=>({label:label.slice(5).split('-').reverse().join('.'),value,rawDate:label}));
  }
  function group(rows,key){
    const m=new Map();rows.forEach(x=>{const k=typeof key==='function'?key(x):x[key];if(!k)return;m.set(String(k),(m.get(String(k))||0)+1)});
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
  }
  function renderBars(el,rows,formatter=v=>num(v)){
    if(!el)return;if(!rows.length){el.innerHTML='<p class="muted">Keine Daten.</p>';return}
    const max=Math.max(...rows.map(r=>Math.abs(r.value)),1);
    el.innerHTML=rows.map((r,i)=>'<div class="market-bar-row"><span>'+esc(r.label)+'</span><div><i style="width:'+Math.max(3,Math.abs(r.value)/max*100)+'%;background:'+color(i)+'"></i></div><strong>'+esc(formatter(r.value))+'</strong></div>').join('');
  }
  function renderColumns(el,rows,formatter=v=>euro(v)){
    if(!el)return;if(!rows.length){el.innerHTML='<p class="muted">Keine Daten.</p>';return}
    const max=Math.max(...rows.map(r=>Math.abs(r.value)),1);
    el.innerHTML='<div class="market-columns">'+rows.map((r,i)=>'<div class="market-column"><b>'+esc(formatter(r.value))+'</b><div><i style="height:'+Math.max(4,Math.abs(r.value)/max*100)+'%;background:'+color(i)+'"></i></div><span>'+esc(r.label)+'</span></div>').join('')+'</div>';
  }
  function renderDonut(el,rows){
    if(!el)return;const total=rows.reduce((s,r)=>s+r.value,0);if(!total){el.innerHTML='<p class="muted">Keine Daten.</p>';return}
    let a=0;const stops=rows.map((r,i)=>{const b=a+r.value/total*360,part=color(i)+' '+a+'deg '+b+'deg';a=b;return part});
    el.innerHTML='<div class="market-donut" style="background:conic-gradient('+stops.join(',')+')"><span><strong>'+num(total)+'</strong><small>Vorgänge</small></span></div><div class="market-legend">'+rows.map((r,i)=>'<div><i style="background:'+color(i)+'"></i>'+esc(r.label)+' <strong>'+num(r.value)+'</strong></div>').join('')+'</div>';
  }
  function renderGauge(el,value,label){
    if(!el)return;const v=Math.max(0,Math.min(100,Number(value)||0));
    el.innerHTML='<div class="market-gauge" style="--gauge:'+v+'deg"><div><strong>'+v.toLocaleString('de-DE',{maximumFractionDigits:1})+'%</strong><span>'+esc(label)+'</span></div></div>';
    el.querySelector('.market-gauge')?.style.setProperty('--gauge',String(v*3.6)+'deg');
  }
  function renderLine(el,rows,area=false){
    if(!el)return;if(!rows.length){el.innerHTML='<p class="muted">Keine Daten.</p>';return}
    const w=760,h=230,p=28,max=Math.max(...rows.map(r=>r.value),1),min=Math.min(0,...rows.map(r=>r.value));
    const span=Math.max(1,max-min);
    const pts=rows.map((r,i)=>{const x=p+(rows.length===1?0:(i/(rows.length-1))*(w-p*2));const y=h-p-((r.value-min)/span)*(h-p*2);return {x,y,...r}});
    const poly=pts.map(p=>p.x+','+p.y).join(' ');
    const fill=area?'<polygon points="'+p+','+(h-p)+' '+poly+' '+pts[pts.length-1].x+','+(h-p)+'" fill="rgba(47,107,63,.14)"></polygon>':'';
    el.innerHTML='<svg class="market-line-svg" viewBox="0 0 '+w+' '+h+'" role="img">'+fill+'<polyline points="'+poly+'" fill="none" stroke="'+color(0)+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>'+pts.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="'+color(1)+'"><title>'+esc(p.label)+': '+esc(euro(p.value))+'</title></circle>').join('')+'</svg><div class="market-line-labels">'+rows.map(r=>'<span>'+esc(r.label)+'</span>').join('')+'</div>';
  }

  function details(e){
    if(e.kind==='transfer')return {title:'Geldübergabe',text:e.source+' → '+e.target,amount:e.amount,payload:e.payload};
    if(e.kind==='count')return {title:e.countKind==='late'?'Nachzählung':'Zählung',text:(inputMode(e)==='weigh'?'Gewogen':'Gezählt')+' · '+(e.registerId||'–'),amount:e.amount,payload:e.payload};
    if(e.kind==='closing')return {title:'Tagesabschluss',text:'Soll '+euro(e.expectedCash)+' · Ist '+euro(e.actualCash)+' · Δ '+euro(e.difference),amount:e.actualCash,payload:e.payload};
    return {title:'Datenverkehr',text:(e.source||'–')+' → '+(e.target||'–')+' · '+(e.flowType||''),amount:null,payload:{eventCount:e.eventCount,byteCount:e.byteCount,trust:e.trust}};
  }
  function renderTable(rows){
    const body=$('marketProtocolBody');if(!body)return;
    body.innerHTML=rows.length?rows.slice().reverse().map(e=>{const d=details(e);const p=d.payload||{};return '<tr><td>'+esc(date(e.time))+'</td><td>'+esc(e.businessDate||'–')+'</td><td>'+esc(d.title)+'</td><td>'+esc(e.registerId||'–')+'</td><td>'+esc(e.source||'–')+'</td><td>'+esc(e.target||'–')+'</td><td>'+(d.amount==null?'–':euro(d.amount))+'</td><td>'+esc(e.status||'–')+'</td><td><details><summary>Details</summary><div class="market-detail"><strong>'+esc(d.text)+'</strong><pre>'+esc(JSON.stringify(p,null,2))+'</pre></div></details></td></tr>'}).join(''):'<tr><td colspan="9" class="muted">Keine Vorgänge für diesen Filter.</td></tr>';
  }
  function render(){
    const rows=visibleEvents();
    const transfers=rows.filter(x=>x.kind==='transfer'),closings=rows.filter(x=>x.kind==='closing'),flows=rows.filter(x=>x.kind==='flow');
    const transferAmount=transfers.reduce((s,x)=>s+Number(x.amount||0),0);
    const exp=closings.reduce((s,x)=>s+Number(x.expectedCash||0),0),act=closings.reduce((s,x)=>s+Number(x.actualCash||0),0),diff=closings.reduce((s,x)=>s+Number(x.difference||0),0);
    const traffic=flows.reduce((s,x)=>s+Number(x.byteCount||0),0);
    [['marketCardEvents',num(rows.length)],['marketCardTransfer',euro(transferAmount)],['marketCardExpected',euro(exp)],['marketCardActual',euro(act)],['marketCardDiff',euro(diff)],['marketCardTraffic',bytes(traffic)]].forEach(([id,v])=>{if($(id))$(id).textContent=v});
    const accuracy=exp?Math.max(0,100-(Math.abs(diff)/Math.abs(exp)*100)):100;
    renderGauge($('marketAccuracyGauge'),accuracy,'Soll/Ist-Genauigkeit');
    renderDonut($('marketKindDonut'),group(rows,'kind').map(r=>({...r,label:({transfer:'Übergaben',count:'Zählungen',closing:'Abschlüsse',flow:'Datenverkehr'})[r.label]||r.label})));
    renderBars($('marketRouteBars'),group(rows,x=>(x.source||'–')+' → '+(x.target||'–')));
    const dailyActual=daily(rows,'actualCash');
    renderColumns($('marketDailyColumns'),dailyActual);
    renderLine($('marketDailyLine'),dailyActual,false);
    let running=0;renderLine($('marketCumulativeArea'),dailyActual.map(r=>({...r,value:(running+=r.value)})),true);
    const flowDaily=new Map();flows.forEach(x=>{const d=day(x.time);flowDaily.set(d,(flowDaily.get(d)||0)+Number(x.byteCount||0))});
    renderBars($('marketTrafficBars'),[...flowDaily.entries()].sort().map(([d,v])=>({label:d.slice(5).split('-').reverse().join('.'),value:v})),bytes);
    renderTable(rows);
    const st=$('marketDashboardStatus');if(st)st.textContent=rows.length+' Vorgänge im aktuellen Filter · zuletzt aktualisiert '+new Date().toLocaleTimeString('de-DE');
  }

  async function load(force=false){
    if(loading)return;if(loaded&&!force){render();return}
    loading=true;setDefaults();const st=$('marketDashboardStatus');if(st)st.textContent='Marktdaten werden geladen …';
    try{
      const d=await call({action:'market_protocol_list',from:$('marketFilterFrom')?.value||DEFAULT_FROM,to:$('marketFilterTo')?.value||DEFAULT_TO,limit:3000});
      allEvents=Array.isArray(d.events)?d.events:[];loaded=true;syncOptions();render();
    }catch(e){if(st)st.textContent='Fehler: '+String(e?.message||e);if(window.toast)window.toast('Markt-/Datenverkehrsdaten konnten nicht geladen werden.','error')}
    finally{loading=false}
  }
  function bind(){
    setDefaults();
    $('marketRefresh')?.addEventListener('click',()=>load(true));
    $('marketFilterReset')?.addEventListener('click',()=>{['marketFilterRegister','marketFilterKind','marketFilterSource','marketFilterStatus','marketFilterMode'].forEach(id=>{if($(id))$(id).value=''});if($('marketFilterFrom'))$('marketFilterFrom').value=DEFAULT_FROM;if($('marketFilterTo'))$('marketFilterTo').value=DEFAULT_TO;load(true)});
    ['marketFilterRegister','marketFilterKind','marketFilterSource','marketFilterStatus','marketFilterMode'].forEach(id=>$(id)?.addEventListener('change',render));
    ['marketFilterFrom','marketFilterTo'].forEach(id=>$(id)?.addEventListener('change',()=>load(true)));
    document.querySelector('[data-dashboard-tab="dashboardMarketStats"]')?.addEventListener('click',()=>load(false));
    document.querySelectorAll('[data-market-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const target=$(btn.dataset.marketToggle);if(!target)return;target.classList.toggle('hidden');btn.textContent=(target.classList.contains('hidden')?'▶ ':'▼ ')+(btn.dataset.label||'Bereich')}));
  }
  function init(){bind();window.KCMarketDashboard={load,render};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();