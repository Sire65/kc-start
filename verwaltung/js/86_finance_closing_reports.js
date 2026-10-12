/* KC Verwaltung – Tagesabschlüsse aus KC Bilderrechner */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const ACCESS_KEY='kc_manager_access_token';
  const ORG='KC_WERNE';

  function $(id){return document.getElementById(id)}
  function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function euro(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('de-DE',{style:'currency',currency:'EUR'}):'–'}
  function when(v){if(!v)return '–';try{return new Date(v).toLocaleString('de-DE')}catch{return String(v)}}
  function toast(msg,type){try{(window.toast||console.log)(msg,type||'info')}catch(_e){}}
  async function token(){if(window.KCCloudSession?.ready) await window.KCCloudSession.ready();return sessionStorage.getItem(ACCESS_KEY)||''}
  async function call(body){
    const t=await token();if(!t)throw new Error('Keine aktive KC-Anmeldung');
    const r=await fetch(SUPA+'/functions/v1/kc-finance-bridge',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json','x-client-info':'kc-verwaltung-finance/1.0'},body:JSON.stringify({...body,orgId:ORG})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||('HTTP '+r.status));return d;
  }
  function ensureUi(){
    const sub=$('financeSubmenu');
    if(sub && !$('financeClosingNav')){
      const b=document.createElement('button');b.id='financeClosingNav';b.className='nav nav-child';b.type='button';b.textContent='Tagesabschlüsse';
      b.addEventListener('click',()=>show());sub.appendChild(b);
    }
    const main=document.querySelector('main.app');
    if(main && !$('financeClosingReports')){
      const s=document.createElement('section');s.id='financeClosingReports';s.className='view';
      s.innerHTML=`<div class="panel"><div class="table-headline"><div><h3>Tagesabschlüsse</h3><p>Kassenabschlüsse aus KC Bilderrechner – zentral übernommen</p></div><div class="inline-actions"><button id="financeClosingRefresh" class="secondary" type="button">Aktualisieren</button></div></div><div id="financeClosingStatus" class="muted">Noch nicht geladen.</div><div class="cards" style="margin:12px 0"><article class="card"><span>Offen</span><strong id="financeClosingOpen">0</strong></article><article class="card"><span>Gesamt Soll</span><strong id="financeClosingExpected">0,00 €</strong></article><article class="card"><span>Gesamt Ist</span><strong id="financeClosingActual">0,00 €</strong></article><article class="card"><span>Differenz</span><strong id="financeClosingDiff">0,00 €</strong></article></div><div class="table-wrap"><table><thead><tr><th>Datum</th><th>Kasse</th><th>Soll</th><th>Ist</th><th>Differenz</th><th>Erfassung</th><th>Status</th><th>Aktion</th></tr></thead><tbody id="financeClosingBody"></tbody></table></div></div>`;
      main.appendChild(s);$('financeClosingRefresh')?.addEventListener('click',load);
    }
  }
  function show(){
    ensureUi();document.querySelectorAll('.view.active').forEach(v=>v.classList.remove('active'));document.querySelectorAll('.nav.active').forEach(v=>v.classList.remove('active'));$('financeClosingReports')?.classList.add('active');$('financeClosingNav')?.classList.add('active');$('emptyDesktop')?.classList.add('hidden');load();
  }
  async function load(){
    ensureUi();const st=$('financeClosingStatus'),body=$('financeClosingBody');if(st)st.textContent='Tagesabschlüsse werden geladen …';if(body)body.innerHTML='';
    try{
      const out=await call({action:'closing_report_list',onlyUnimported:false,limit:500});const items=Array.isArray(out?.items)?out.items:[];
      const open=items.filter(x=>!x.verwaltung_imported_at);const exp=items.reduce((s,x)=>s+Number(x.expected_cash||0),0);const act=items.reduce((s,x)=>s+Number(x.actual_cash||0),0);const dif=items.reduce((s,x)=>s+Number(x.difference||0),0);
      if($('financeClosingOpen'))$('financeClosingOpen').textContent=String(open.length);if($('financeClosingExpected'))$('financeClosingExpected').textContent=euro(exp);if($('financeClosingActual'))$('financeClosingActual').textContent=euro(act);if($('financeClosingDiff'))$('financeClosingDiff').textContent=euro(dif);
      if(st)st.textContent=items.length?`${items.length} Tagesabschluss/Tagesabschlüsse geladen.`:'Noch keine Tagesabschlüsse vorhanden.';
      if(body)body.innerHTML=items.map(x=>{const p=x.payload||{},m=p.countInputMode==='weigh'?'Gewogen':p.countInputMode==='count'?'Gezählt':'–',kind=p.countKind==='late'?'Nachzählung · ':'';return `<tr><td>${esc(x.business_date||when(x.created_at))}</td><td>${esc(x.register_id||'–')}</td><td>${euro(x.expected_cash)}</td><td>${euro(x.actual_cash)}</td><td>${euro(x.difference)}</td><td>${esc(kind+m)}</td><td>${x.verwaltung_imported_at?'Übernommen':'Neu'}</td><td>${x.verwaltung_imported_at?'✓':`<button class="secondary finance-closing-import" data-id="${esc(x.id)}" type="button">Übernehmen</button>`}</td></tr>`}).join('');
      document.querySelectorAll('.finance-closing-import').forEach(btn=>btn.addEventListener('click',async()=>{const id=btn.getAttribute('data-id');btn.disabled=true;try{await call({action:'closing_report_mark_imported',id});toast('Tagesabschluss in KC Verwaltung übernommen.','success');await load()}catch(e){btn.disabled=false;toast(String(e?.message||e),'error')}}));
    }catch(e){if(st)st.textContent='Fehler: '+String(e?.message||e);toast('Tagesabschlüsse konnten nicht geladen werden.','error')}
  }
  function init(){ensureUi();window.KCVerwaltungClosingReports={show,load,call};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
