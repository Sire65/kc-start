/*
  Clean Master Test 07 - Adresse/Inventar Kernmodul
  Konsolidiert Adressverwaltung, Synchronisation und vorhandene Inventar-/Modulergänzungen.
*/

/* ===== 60_phase910_38_addresses_module_fix.js ===== */
/* Phase 9.10.38 – Clubzugehörigkeit einklappbar + Adressverwaltung */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=(v)=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toastSafe=(m,t='info')=>{try{ if(typeof toast==='function') toast(m,t); }catch(_){ console.log(m); }};
  const saveSafe=()=>{try{ if(typeof saveState==='function') saveState(); }catch(_){}};

  let currentAddressId='';

  function injectCss(){
    if($('#kng938Style')) return;
    const st=document.createElement('style'); st.id='kng938Style';
    st.textContent=`
      .address-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(285px,var(--member-search-width,360px));gap:1rem;align-items:start;}
      .address-search-panel{grid-column:2;grid-row:1;max-height:var(--address-search-height,560px);overflow:auto;}
      .address-layout>section.panel{grid-column:1;grid-row:1;}
      .address-search-panel{position:relative;}
      .address-search-grid{display:grid;gap:.45rem;margin-bottom:.7rem;}
      .address-search-grid label{font-weight:700;display:flex;flex-direction:column;gap:.25rem;}
      .address-actions-icons{display:flex;gap:.45rem;flex-wrap:wrap;margin:.55rem 0;}
      .address-actions-icons .icon-button{width:38px;height:38px;border-radius:10px;}
      .address-form-grid{display:grid;grid-template-columns:repeat(2,minmax(160px,1fr));gap:.65rem .85rem;}
      .address-form-grid label{display:flex;flex-direction:column;gap:.25rem;font-weight:700;}
      .address-form-grid label.full{grid-column:1/-1;}
      .address-nav-actions{justify-content:center;gap:.45rem;flex-wrap:wrap;margin-top:.8rem;}
      .address-nav-actions .member-nav-icon{min-width:42px;}
      .address-table tr.current{outline:2px solid var(--green,#2b6f3e);outline-offset:-2px;background:rgba(43,111,62,.08);}
      .address-filter-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:.55rem;align-items:end;margin:.75rem 0;}
      .address-filter-row label{display:flex;flex-direction:column;gap:.25rem;font-weight:700;}
      .address-email-box{display:grid;gap:.55rem;}
      .address-email-box input,.address-email-box textarea{width:100%;}
      .address-email-box textarea{min-height:170px;}
      @media(max-width:1050px){.address-layout{grid-template-columns:1fr}.address-filter-row{grid-template-columns:1fr 1fr}.address-form-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function normalizeState(){
    window.state=window.state||{};
    state.addresses=Array.isArray(state.addresses)?state.addresses:[];
    state.combos=state.combos||{};
    const defaults={
      addressCategories:['','Lieferant','Mitarbeiter','Spender','Sponsor','Stadtmarketing','Presse','Behörde','Verein','Partner','Sonstiges'],
      addressCities:['','Werne','Hamm','Lünen','Dortmund','Münster'],
      addressStatus:['','Aktiv','Inaktiv','Prüfen','Gesperrt'],
      addressSalutations:['','Herr','Frau','Firma','Familie','Verein']
    };
    Object.keys(defaults).forEach(k=>{
      if(!Array.isArray(state.combos[k]) || !state.combos[k].length) state.combos[k]=defaults[k].slice();
      if(state.combos[k][0]!== '') state.combos[k].unshift('');
    });
    try{
      if(typeof COMBO_GROUPS!=='undefined' && Array.isArray(COMBO_GROUPS) && !COMBO_GROUPS.some(g=>g&&g.title==='Adressverwaltung')){
        COMBO_GROUPS.push({title:'Adressverwaltung',items:[
          {key:'addressCategories',label:'Adresskategorien'},
          {key:'addressCities',label:'Orte'},
          {key:'addressStatus',label:'Adressstatus'},
          {key:'addressSalutations',label:'Anrede'}
        ]});
      }
    }catch(_){ }
  }

  function ensureAddressNav(){
    const quick=$('.quick-icons');
    if(quick && !quick.querySelector('[data-view="addresses"]')){
      const b=document.createElement('button');
      b.dataset.view='addresses'; b.title='Adressverwaltung'; b.textContent='📇';
      const members=quick.querySelector('[data-view="members"]');
      if(members&&members.nextSibling) members.insertAdjacentElement('afterend',b); else quick.appendChild(b);
    }
    const nav=$('#mainNav');
    if(nav && !nav.querySelector('[data-view="addresses"].nav-address-main')){
      const b=document.createElement('button');
      b.className='nav nav-address-main'; b.dataset.view='addresses'; b.textContent='Adressverwaltung';
      const membersSub=$('#membersSubmenu');
      if(membersSub) membersSub.insertAdjacentElement('afterend',b); else nav.insertBefore(b,nav.querySelector('.nav-spacer'));
    }
  }

  function addressViewHtml(){
    return `<section id="addresses" class="view">
      <h3>Adressverwaltung</h3>
      <div class="address-layout">
        <aside class="panel address-search-panel">
          <h4>Adresssuche</h4>
          <div class="address-search-grid">
            <label>Suche<input id="addrSearchText" placeholder="Name, Firma, Ansprechpartner, Ort..."></label>
            <label>Kategorie<select id="addrSearchCategory"></select></label>
            <label>Status<select id="addrSearchStatus"></select></label>
            <label>Ort<input id="addrSearchCity" list="addrCityList" placeholder="Alle Orte"></label>
          </div>
          <div class="address-actions-icons">
            <button id="addrIconPrint" class="icon-button" title="Drucken" type="button">🖨️</button>
            <button id="addrIconEmail" class="icon-button" title="E-Mail" type="button">✉️</button>
            <button id="addrIconCopy" class="icon-button" title="Kopieren" type="button">📋</button>
            <button id="addrIconReset" class="icon-button" title="Filter zurücksetzen" type="button">↺</button>
          </div>
          <div class="table-wrap">
            <table class="data-table address-table"><thead><tr><th>Name/Firma</th><th>Kategorie</th><th>Ort</th></tr></thead><tbody id="addrSearchTable"></tbody></table>
          </div>
          <div id="addressSearchHeightResizer" class="search-height-resizer" title="Adress-Suchmaske höher/tiefer ziehen"></div>
        </aside>
        <section class="panel">
          <div class="tabs">
            <button class="tab active" data-address-tab="addrBasic">Grunddaten</button>
            <button class="tab" data-address-tab="addrContact">Kommunikation</button>
            <button class="tab" data-address-tab="addrList">Filter / Liste / Druck</button>
            <button class="tab" data-address-tab="addrNotes">Notizen</button>
          </div>
          <form id="addressForm" autocomplete="off">
            <div id="addrBasic" class="member-tab address-tab active">
              <div class="address-form-grid">
                <label>Adress-Nr.<input id="addrNo" readonly></label>
                <label>Anrede<input id="addrSalutation" list="addrSalutationList"></label>
                <label>Name<input id="addrLastName"></label>
                <label>Vorname<input id="addrFirstName"></label>
                <label>Firma<input id="addrCompany"></label>
                <label>Ansprechpartner<input id="addrContactPerson"></label>
                <label>Kategorie<input id="addrCategory" list="addrCategoryList"></label>
                <label>Status<input id="addrStatus" list="addrStatusList"></label>
                <label>Straße<input id="addrStreet"></label>
                <label>PLZ<input id="addrZip"></label>
                <label>Ort<input id="addrCity" list="addrCityList"></label>
                <label>Land<input id="addrCountry" value="Deutschland"></label>
              </div>
            </div>
            <div id="addrContact" class="member-tab address-tab">
              <div class="address-form-grid">
                <label>Telefon 1<input id="addrPhone1"></label>
                <label>Telefon 2<input id="addrPhone2"></label>
                <label>Fax<input id="addrFax"></label>
                <label>Internetseite<input id="addrWebsite" placeholder="https://..."></label>
                <label>E-Mail 1<input id="addrEmail1" type="email"></label>
                <label>E-Mail 2<input id="addrEmail2" type="email"></label>
              </div>
            </div>
            <div id="addrList" class="member-tab address-tab">
              <div class="address-filter-row">
                <label>Text<input id="addrListText" placeholder="Suchen..."></label>
                <label>Kategorie<select id="addrListCategory"></select></label>
                <label>Status<select id="addrListStatus"></select></label>
                <label>Ort<input id="addrListCity" list="addrCityList" placeholder="Alle"></label>
              </div>
              <div class="button-row"><button id="addrPrintList" class="secondary" type="button">Liste drucken</button><button id="addrMailFiltered" class="secondary" type="button">E-Mail an gefilterte Auswahl</button><button id="addrResetList" class="secondary" type="button">Filter zurücksetzen</button></div>
              <div class="table-wrap"><table class="data-table address-table"><thead><tr><th>Nr.</th><th>Name</th><th>Vorname</th><th>Firma</th><th>Kategorie</th><th>Telefon</th><th>E-Mail</th><th>Ort</th><th>Status</th></tr></thead><tbody id="addrListTable"></tbody></table></div>
            </div>
            <div id="addrNotes" class="member-tab address-tab">
              <label class="full">Bemerkungen<textarea id="addrNotesText" rows="8"></textarea></label>
            </div>
          </form>
          <datalist id="addrCategoryList"></datalist><datalist id="addrStatusList"></datalist><datalist id="addrCityList"></datalist><datalist id="addrSalutationList"></datalist>
          <div class="button-row address-nav-actions">
            <button id="addrNew" class="secondary" type="button">Neu</button>
            <button id="addrSave" class="primary" type="button">Speichern</button>
            <button id="addrDelete" class="danger" type="button">Löschen</button>
            <button id="addrFirst" class="secondary member-nav-icon" type="button" title="Erster">⏮</button>
            <button id="addrPrev" class="secondary member-nav-icon" type="button" title="Vorheriger">◀</button>
            <button id="addrNext" class="secondary member-nav-icon" type="button" title="Nächster">▶</button>
            <button id="addrLast" class="secondary member-nav-icon" type="button" title="Letzter">⏭</button>
            <button id="addrPrint" class="secondary" type="button">Drucken</button>
            <button id="addrEmail" class="secondary" type="button">E-Mail</button>
          </div>
        </section>
      </div>
      <dialog id="addressEmailDialog" class="wide-dialog">
        <h3>E-Mail vorbereiten</h3>
        <div class="address-email-box">
          <label>Empfänger<input id="addrEmailTo"></label>
          <label>Betreff<input id="addrEmailSubject" value="Nachricht vom Köcheclub"></label>
          <label>Text<textarea id="addrEmailBody">Guten Tag,\n\n</textarea></label>
        </div>
        <div class="button-row"><button id="addrSendMailto" class="primary" type="button">E-Mail-Programm öffnen</button><form method="dialog"><button class="secondary">Schließen</button></form></div>
      </dialog>
    </section>`;
  }

  function ensureAddressView(){
    if($('#addresses')) return;
    const tmp=document.createElement('div'); tmp.innerHTML=addressViewHtml().trim();
    const main=$('main.app')||$('main')||document.body;
    const before=$('#infoDialog')||main.querySelector('dialog')||null;
    main.insertBefore(tmp.firstElementChild,before);
  }

  function comboOptions(key,allText=''){
    const arr=Array.isArray(state.combos?.[key])?state.combos[key]:[''];
    const clean=[...new Set(arr.map(x=>String(x||'').trim()))];
    return (allText!==null?`<option value="">${esc(allText)}</option>`:'') + clean.filter(Boolean).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  }
  function fillDatalist(id,key){ const el=$('#'+id); if(el) el.innerHTML=(state.combos[key]||[]).filter(Boolean).map(v=>`<option value="${esc(v)}"></option>`).join(''); }
  function fillSelect(id,key,all='Alle'){ const el=$('#'+id); if(el) el.innerHTML=comboOptions(key,all); }

  function nextAddressNo(){
    const max=(state.addresses||[]).reduce((a,x)=>{ const m=String(x.no||'').match(/(\d+)/); return Math.max(a,m?+m[1]:0); },0);
    return 'ADR-'+String(max+1).padStart(4,'0');
  }
  const ids=['addrNo','addrSalutation','addrLastName','addrFirstName','addrCompany','addrContactPerson','addrCategory','addrStatus','addrStreet','addrZip','addrCity','addrCountry','addrPhone1','addrPhone2','addrFax','addrWebsite','addrEmail1','addrEmail2','addrNotesText'];
  function getVal(id){ return $('#'+id)?.value||''; }
  function setVal(id,v){ const el=$('#'+id); if(el) el.value=v??''; }
  function formToAddress(){
    return {id:currentAddressId||('addr_'+Date.now()),no:getVal('addrNo')||nextAddressNo(),salutation:getVal('addrSalutation'),lastName:getVal('addrLastName'),firstName:getVal('addrFirstName'),company:getVal('addrCompany'),contactPerson:getVal('addrContactPerson'),category:getVal('addrCategory'),status:getVal('addrStatus')||'Aktiv',street:getVal('addrStreet'),zip:getVal('addrZip'),city:getVal('addrCity'),country:getVal('addrCountry')||'Deutschland',phone1:getVal('addrPhone1'),phone2:getVal('addrPhone2'),fax:getVal('addrFax'),website:getVal('addrWebsite'),email1:getVal('addrEmail1'),email2:getVal('addrEmail2'),notes:getVal('addrNotesText'),updatedAt:new Date().toISOString()};
  }
  function addressToForm(o){
    currentAddressId=o?.id||'';
    setVal('addrNo',o?.no||nextAddressNo()); setVal('addrSalutation',o?.salutation); setVal('addrLastName',o?.lastName); setVal('addrFirstName',o?.firstName); setVal('addrCompany',o?.company); setVal('addrContactPerson',o?.contactPerson); setVal('addrCategory',o?.category); setVal('addrStatus',o?.status||'Aktiv'); setVal('addrStreet',o?.street); setVal('addrZip',o?.zip); setVal('addrCity',o?.city); setVal('addrCountry',o?.country||'Deutschland'); setVal('addrPhone1',o?.phone1); setVal('addrPhone2',o?.phone2); setVal('addrFax',o?.fax); setVal('addrWebsite',o?.website); setVal('addrEmail1',o?.email1); setVal('addrEmail2',o?.email2); setVal('addrNotesText',o?.notes);
    markAddressRow();
  }
  function newAddress(){ currentAddressId=''; ids.forEach(id=>setVal(id,'')); setVal('addrNo',nextAddressNo()); setVal('addrCountry','Deutschland'); setVal('addrStatus','Aktiv'); markAddressRow(); }
  function saveAddress(){
    const o=formToAddress();
    if(!o.lastName && !o.company && !o.firstName){ toastSafe('Bitte Name, Vorname oder Firma eintragen.','warn'); return; }
    ['addressCategories','addressCities','addressStatus','addressSalutations'].forEach(()=>{});
    addCombo('addressCategories',o.category); addCombo('addressCities',o.city); addCombo('addressStatus',o.status); addCombo('addressSalutations',o.salutation);
    const idx=state.addresses.findIndex(x=>x.id===o.id);
    if(idx>=0) state.addresses[idx]={...state.addresses[idx],...o}; else state.addresses.unshift({...o,createdAt:new Date().toISOString()});
    currentAddressId=o.id; saveSafe(); renderAddressLists(); addressToForm(o); toastSafe('Adresse gespeichert.','success');
  }
  function addCombo(key,value){ const v=String(value||'').trim(); if(!v) return; state.combos[key]=Array.isArray(state.combos[key])?state.combos[key]:['']; if(!state.combos[key].includes(v)) state.combos[key].push(v); }
  function deleteAddress(){ if(!currentAddressId) return; if(!confirm('Adresse wirklich löschen?')) return; state.addresses=state.addresses.filter(x=>x.id!==currentAddressId); saveSafe(); renderAddressLists(); const first=filteredAddresses()[0]||null; first?addressToForm(first):newAddress(); }
  function addressLabel(o){ return (o.company || [o.lastName,o.firstName].filter(Boolean).join(', ') || o.contactPerson || o.no || '').trim(); }
  function filteredAddresses(prefix='addrSearch'){
    const text=String($('#'+prefix+'Text')?.value||'').toLowerCase();
    const cat=$('#'+prefix+'Category')?.value||'';
    const stat=$('#'+prefix+'Status')?.value||'';
    const city=$('#'+prefix+'City')?.value||'';
    return (state.addresses||[]).filter(o=>{
      const hay=[o.no,o.lastName,o.firstName,o.company,o.contactPerson,o.category,o.status,o.city,o.email1,o.phone1].join(' ').toLowerCase();
      return (!text||hay.includes(text)) && (!cat||o.category===cat) && (!stat||o.status===stat) && (!city||String(o.city||'').toLowerCase().includes(city.toLowerCase()));
    }).sort((a,b)=>addressLabel(a).localeCompare(addressLabel(b),'de',{numeric:true}));
  }
  function renderAddressLists(){
    normalizeState();
    fillDatalist('addrCategoryList','addressCategories'); fillDatalist('addrStatusList','addressStatus'); fillDatalist('addrCityList','addressCities'); fillDatalist('addrSalutationList','addressSalutations');
    fillSelect('addrSearchCategory','addressCategories','Alle'); fillSelect('addrSearchStatus','addressStatus','Alle'); fillSelect('addrListCategory','addressCategories','Alle'); fillSelect('addrListStatus','addressStatus','Alle');
    const sbody=$('#addrSearchTable'); if(sbody){ const rows=filteredAddresses('addrSearch'); sbody.innerHTML=rows.length?rows.map(o=>`<tr data-id="${esc(o.id)}"><td>${esc(addressLabel(o))}</td><td>${esc(o.category||'')}</td><td>${esc(o.city||'')}</td></tr>`).join(''):'<tr><td colspan="3" class="muted">Keine Adressen gefunden.</td></tr>'; $$('tr[data-id]',sbody).forEach(tr=>tr.addEventListener('click',()=>{ const o=state.addresses.find(x=>x.id===tr.dataset.id); if(o) addressToForm(o); })); }
    const lbody=$('#addrListTable'); if(lbody){ const rows=filteredAddresses('addrList'); lbody.innerHTML=rows.length?rows.map(o=>`<tr data-id="${esc(o.id)}"><td>${esc(o.no||'')}</td><td>${esc(o.lastName||'')}</td><td>${esc(o.firstName||'')}</td><td>${esc(o.company||'')}</td><td>${esc(o.category||'')}</td><td>${esc(o.phone1||'')}</td><td>${esc(o.email1||'')}</td><td>${esc(o.city||'')}</td><td>${esc(o.status||'')}</td></tr>`).join(''):'<tr><td colspan="9" class="muted">Keine Adressen gefunden.</td></tr>'; $$('tr[data-id]',lbody).forEach(tr=>tr.addEventListener('dblclick',()=>{ const o=state.addresses.find(x=>x.id===tr.dataset.id); if(o){ addressToForm(o); switchAddressTab('addrBasic'); } })); }
    markAddressRow();
  }
  function markAddressRow(){ $$('.address-table tr[data-id]').forEach(tr=>tr.classList.toggle('current',tr.dataset.id===currentAddressId)); }
  function addressIndex(){ return (state.addresses||[]).slice().sort((a,b)=>String(a.no||'').localeCompare(String(b.no||''),'de',{numeric:true})); }
  function navAddress(pos){ const arr=addressIndex(); if(!arr.length) return; let i=arr.findIndex(x=>x.id===currentAddressId); if(pos==='first') i=0; else if(pos==='last') i=arr.length-1; else if(pos==='prev') i=Math.max(0,(i<0?0:i-1)); else if(pos==='next') i=Math.min(arr.length-1,(i<0?0:i+1)); addressToForm(arr[i]); }
  function switchAddressTab(id){ $$('.address-tab').forEach(p=>p.classList.toggle('active',p.id===id)); $$('[data-address-tab]').forEach(b=>b.classList.toggle('active',b.dataset.addressTab===id)); }
  function printAddresses(){ const oldTitle=document.title; document.title='Adressliste'; window.print(); setTimeout(()=>document.title=oldTitle,500); }
  function openAddressEmail(filtered=false){
    const rows=filtered?filteredAddresses('addrList'):[state.addresses.find(x=>x.id===currentAddressId)].filter(Boolean);
    const mails=[...new Set(rows.flatMap(o=>[o.email1,o.email2]).filter(Boolean))];
    $('#addrEmailTo').value=mails.join('; ');
    $('#addrEmailSubject').value='Nachricht vom Köcheclub';
    $('#addrEmailBody').value='Guten Tag,\n\n';
    $('#addressEmailDialog')?.showModal();
  }
  function sendMailto(){ const to=$('#addrEmailTo')?.value||''; const sub=$('#addrEmailSubject')?.value||''; const body=$('#addrEmailBody')?.value||''; location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body); }
  function copyAddress(){ const o=state.addresses.find(x=>x.id===currentAddressId); if(!o) return; navigator.clipboard?.writeText([addressLabel(o),o.street,[o.zip,o.city].filter(Boolean).join(' '),o.phone1,o.email1].filter(Boolean).join('\n')).then(()=>toastSafe('Adresse kopiert.','success')).catch(()=>toastSafe('Kopieren nicht möglich.','warn')); }

  function bindAddress(){
    ensureAddressView(); normalizeState();
    ['addrSearchText','addrSearchCategory','addrSearchStatus','addrSearchCity','addrListText','addrListCategory','addrListStatus','addrListCity'].forEach(id=>{ const el=$('#'+id); if(el&&!el.dataset.kng938Bound){el.dataset.kng938Bound='1'; el.addEventListener('input',renderAddressLists); el.addEventListener('change',renderAddressLists);}});
    $$('[data-address-tab]').forEach(b=>{ if(!b.dataset.kng938Bound){ b.dataset.kng938Bound='1'; b.addEventListener('click',()=>switchAddressTab(b.dataset.addressTab)); }});
    const bind=(id,fn)=>{ const el=$('#'+id); if(el&&!el.dataset.kng938Bound){ el.dataset.kng938Bound='1'; el.addEventListener('click',fn); }};
    bind('addrNew',newAddress); bind('addrSave',saveAddress); bind('addrDelete',deleteAddress); bind('addrFirst',()=>navAddress('first')); bind('addrPrev',()=>navAddress('prev')); bind('addrNext',()=>navAddress('next')); bind('addrLast',()=>navAddress('last'));
    bind('addrPrint',printAddresses); bind('addrPrintList',printAddresses); bind('addrIconPrint',printAddresses); bind('addrEmail',()=>openAddressEmail(false)); bind('addrIconEmail',()=>openAddressEmail(false)); bind('addrMailFiltered',()=>openAddressEmail(true)); bind('addrSendMailto',sendMailto); bind('addrIconCopy',copyAddress); bind('addrIconReset',()=>{ ['addrSearchText','addrSearchCategory','addrSearchStatus','addrSearchCity'].forEach(id=>setVal(id,'')); renderAddressLists(); }); bind('addrResetList',()=>{ ['addrListText','addrListCategory','addrListStatus','addrListCity'].forEach(id=>setVal(id,'')); renderAddressLists(); });
    renderAddressLists();
    if(currentAddressId){ const o=state.addresses.find(x=>x.id===currentAddressId); if(o) addressToForm(o); }
    else if(state.addresses.length) addressToForm(addressIndex()[0]); else newAddress();
  }

  function patchShowView(){
    if(window.showView && !window.showView.kng938){
      const old=window.showView;
      window.showView=function(id){ const r=old.apply(this,arguments); if(id==='addresses') setTimeout(bindAddress,20); return r; };
      window.showView.kng938=true;
    }
  }

  function bindGlobalAddressNav(){
    document.addEventListener('click',ev=>{
      const btn=ev.target.closest('[data-view="addresses"]'); if(!btn) return;
      setTimeout(bindAddress,30);
    },true);
  }

  function makeClubMembershipCollapsible(){
    const details=$('.membership-claims-overview'); if(!details) return;
    details.style.display='';
    if(details.dataset.kng938Collapsible) return;
    details.dataset.kng938Collapsible='1';
    let wanted=details.open;
    details.querySelector('summary')?.addEventListener('click',()=>{
      wanted=!details.open;
      setTimeout(()=>{ details.open=wanted; },150);
      setTimeout(()=>{ details.open=wanted; },350);
    },true);
    // Alte Module füllen die Tabelle bei jedem Klick neu und öffnen <details>. Hier wird nur der gewünschte Zustand wiederhergestellt.
    document.addEventListener('click',()=>setTimeout(()=>{ if(details.dataset.kng938UserToggled==='1') details.open=wanted; },220),true);
  }

  function init(){
    injectCss(); normalizeState(); ensureAddressNav(); ensureAddressView(); patchShowView(); bindGlobalAddressNav(); makeClubMembershipCollapsible();
    if((document.querySelector('.view.active')||{}).id==='addresses') bindAddress();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('load',()=>setTimeout(init,100));
  window.KNG938={bindAddress,renderAddressLists,makeClubMembershipCollapsible};
})();

/* ===== 63_phase910_41_address_member_sync_fix.js ===== */
/* Phase 9.10.41 – Adressverwaltung rechts + Mitgliedersynchronisierung */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const toastSafe=(m,t='info')=>{try{ if(typeof window.toast==='function') window.toast(m,t); }catch(_){}};
  const saveSafe=()=>{try{ if(typeof window.saveState==='function') window.saveState(); }catch(_){}};

  function ensureState(){
    window.state=window.state||{};
    state.members=Array.isArray(state.members)?state.members:[];
    state.addresses=Array.isArray(state.addresses)?state.addresses:[];
    state.combos=state.combos||{};
    if(!Array.isArray(state.combos.addressCategories)) state.combos.addressCategories=['','Lieferant','Mitarbeiter','Spender','Sponsor','Stadtmarketing','Presse','Behörde','Verein','Partner','Sonstiges'];
    if(!state.combos.addressCategories.includes('Mitarbeiter')) state.combos.addressCategories.push('Mitarbeiter');
    if(!state.combos.addressCategories.includes('Mitglied')) state.combos.addressCategories.push('Mitglied');
  }

  function injectCss(){
    if($('#kng941Css')) return;
    const st=document.createElement('style'); st.id='kng941Css';
    st.textContent=`
      #addresses .address-layout{grid-template-columns:1fr minmax(300px,370px)!important;align-items:start!important;}
      #addresses .address-search-panel{order:2!important;}
      #addresses .address-layout>section.panel{order:1!important;}
      #addresses .address-search-panel h4::after{content:' rechts';font-weight:400;color:#6b7280;font-size:.85em;}
      @media(max-width:1050px){#addresses .address-layout{grid-template-columns:1fr!important;}#addresses .address-search-panel{order:1!important;}#addresses .address-layout>section.panel{order:2!important;}}
    `;
    document.head.appendChild(st);
  }

  function clean(v){return String(v??'').trim();}
  function activeStatus(m){ return m && m.exitDate ? 'Inaktiv' : 'Aktiv'; }
  function memberFullName(m){ return [m?.firstName,m?.lastName].map(clean).filter(Boolean).join(' '); }
  function findAddressForMember(m){
    if(!m) return null;
    return state.addresses.find(a=>a.sourceType==='member' && String(a.sourceMemberId)===String(m.id))
      || state.addresses.find(a=>clean(a.email1).toLowerCase() && clean(a.email1).toLowerCase()===clean(m.email).toLowerCase())
      || state.addresses.find(a=>clean(a.lastName).toLowerCase()===clean(m.lastName).toLowerCase() && clean(a.firstName).toLowerCase()===clean(m.firstName).toLowerCase());
  }
  function nextAddressNo(){
    const max=(state.addresses||[]).reduce((a,x)=>{const m=String(x.no||'').match(/(\d+)/); return Math.max(a,m?+m[1]:0);},0);
    return 'ADR-'+String(max+1).padStart(4,'0');
  }
  function addressFromMember(m, old){
    const now=new Date().toISOString();
    return {
      ...(old||{}),
      id: old?.id || ('addr_member_'+String(m.id||Date.now()).replace(/[^a-zA-Z0-9_-]/g,'')),
      no: old?.no || nextAddressNo(),
      sourceType:'member',
      sourceMemberId:m.id,
      salutation:m.salutation||old?.salutation||'',
      firstName:m.firstName||'',
      lastName:m.lastName||'',
      company:old?.company||'',
      contactPerson:old?.contactPerson||memberFullName(m),
      category:old?.category || 'Mitarbeiter',
      status:activeStatus(m),
      street:m.street||'',
      zip:m.postalCode||'',
      city:m.city||'',
      country:old?.country||'Deutschland',
      phone1:m.phone||'',
      phone2:m.mobile||'',
      fax:old?.fax||'',
      website:old?.website||'',
      email1:m.email||'',
      email2:old?.email2||'',
      notes:old?.notes||'',
      createdAt:old?.createdAt||now,
      updatedAt:now,
      syncedAt:now
    };
  }
  function memberFromAddress(a, old){
    if(!a || !old) return old;
    return {
      ...old,
      salutation:a.salutation ?? old.salutation,
      firstName:a.firstName ?? old.firstName,
      lastName:a.lastName ?? old.lastName,
      street:a.street ?? old.street,
      postalCode:a.zip ?? old.postalCode,
      city:a.city ?? old.city,
      phone:a.phone1 ?? old.phone,
      mobile:a.phone2 ?? old.mobile,
      email:a.email1 ?? old.email,
      updatedAt:new Date().toISOString()
    };
  }

  function syncOneMemberToAddress(member, force=false){
    ensureState();
    if(!member || !member.id) return null;
    let addr=findAddressForMember(member);
    const idx=addr?state.addresses.findIndex(a=>a.id===addr.id):-1;
    if(addr && !force){
      const mt=Date.parse(member.updatedAt||member.createdAt||0)||0;
      const at=Date.parse(addr.updatedAt||addr.createdAt||0)||0;
      if(at>mt && addr.sourceMemberId) return addr; // Adresse wurde vermutlich neuer geändert.
    }
    const next=addressFromMember(member,addr);
    if(idx>=0) state.addresses[idx]=next; else state.addresses.unshift(next);
    return next;
  }

  function syncAllMembersToAddresses(){
    ensureState();
    let changed=false;
    state.members.forEach(m=>{
      const before=state.addresses.length;
      const old=findAddressForMember(m);
      const a=syncOneMemberToAddress(m,false);
      if(!old || before!==state.addresses.length || (a && old && JSON.stringify(a)!==JSON.stringify(old))) changed=true;
    });
    if(changed) saveSafe();
    refreshAddressUi();
  }

  function syncCurrentAddressToMember(){
    ensureState();
    const no=$('#addrNo')?.value;
    const addr=(state.addresses||[]).find(a=>String(a.no)===String(no)) || null;
    if(!addr || addr.sourceType!=='member' || !addr.sourceMemberId) return false;
    const idx=state.members.findIndex(m=>String(m.id)===String(addr.sourceMemberId));
    if(idx<0) return false;
    state.members[idx]=memberFromAddress(addr,state.members[idx]);
    saveSafe();
    try{ if(typeof window.renderMembers==='function') window.renderMembers(); }catch(_){}
    try{ if(typeof window.renderDashboard==='function') window.renderDashboard(); }catch(_){}
    try{ if(typeof window.renderSettings==='function') window.renderSettings(); }catch(_){}
    return true;
  }

  function patchSaveMember(){
    if(typeof window.saveMember!=='function' || window.saveMember.__kng941Sync) return;
    const old=window.saveMember;
    window.saveMember=function(){
      const result=old.apply(this,arguments);
      if(result!==false){
        setTimeout(()=>{
          const m=state.members.find(x=>String(x.id)===String(window.currentMemberId)) || state.members.find(x=>x.updatedAt===Math.max(...state.members.map(y=>y.updatedAt||'')));
          // Sicherer: Formularwerte über memberNo wiederfinden.
          const memberNo=$('#memberNo')?.value;
          const mf=state.members.find(x=>String(x.memberNo)===String(memberNo)) || m;
          if(mf){ syncOneMemberToAddress(mf,true); saveSafe(); refreshAddressUi(); }
        },0);
      }
      return result;
    };
    window.saveMember.__kng941Sync=true;
  }

  function patchAddressSave(){
    document.addEventListener('click',ev=>{
      const btn=ev.target.closest('#addrSave');
      if(!btn) return;
      setTimeout(()=>{
        syncCurrentAddressToMember();
        refreshAddressUi();
        toastSafe('Adress-/Mitgliedsdaten synchronisiert.','success');
      },120);
    },false);
  }

  function refreshAddressUi(){
    try{ window.KNG938?.renderAddressLists?.(); }catch(_){}
    try{ window.KNG938?.bindAddress?.(); }catch(_){}
  }

  function patchShowView(){
    if(typeof window.showView==='function' && !window.showView.__kng941){
      const old=window.showView;
      window.showView=function(id){
        if(id==='addresses') { ensureState(); syncAllMembersToAddresses(); }
        const r=old.apply(this,arguments);
        if(id==='addresses') setTimeout(()=>{injectCss(); syncAllMembersToAddresses(); refreshAddressUi();},60);
        return r;
      };
      window.showView.__kng941=true;
    }
  }

  function init(){
    ensureState(); injectCss(); patchSaveMember(); patchAddressSave(); patchShowView();
    // Initial nur fehlende Mitglieder-Adressen ergänzen, damit die Adressverwaltung sofort vollständig ist.
    setTimeout(syncAllMembersToAddresses,250);
    if((document.querySelector('.view.active')||{}).id==='addresses') setTimeout(()=>{syncAllMembersToAddresses(); refreshAddressUi();},80);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('load',()=>setTimeout(init,200));
  window.KNG941={syncAllMembersToAddresses,syncOneMemberToAddress,syncCurrentAddressToMember};
})();
