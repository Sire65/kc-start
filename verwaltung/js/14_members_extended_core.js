/*
  Clean Master Test 07 - Mitglieder/Funktionen Kernmodul
  Konsolidiert ehemals einzeln geladene Korrektur-/Patchdateien in ein Kernmodul.
  Reihenfolge bewusst erhalten, damit bestehende Funktionen stabil bleiben.
*/

/* ===== 14_final_corrections.js ===== */

/* Phase 9.9 – Abschlusskorrektur Kommunikationsicon, aktuelle Markierung, Such-X, Druck und Stammdaten-Pfeile */
(function(){
  function esc(s){return typeof escapeHtml==='function'?escapeHtml(s):String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function memberName(m){return `${m.lastName||''}, ${m.firstName||''}`.replace(/^,\s*/,'');}
  function getSelectedMemberIds(){
    const ids=new Set();
    document.querySelectorAll('#membersTable input.member-row-select:checked').forEach(cb=>ids.add(cb.dataset.id));
    if(ids.size===0 && window.selectedMemberIds instanceof Set) window.selectedMemberIds.forEach(id=>ids.add(id));
    return Array.from(ids);
  }
  function openCommunicationForSelected(){
    const ids=getSelectedMemberIds();
    if(!ids.length){ toast?.('Bitte zuerst Mitglieder in der Suchmaske auswählen.','warn'); return; }
    if(typeof showView==='function') showView('communication');
    setTimeout(()=>{
      const type=document.getElementById('commRecipientType'); if(type) type.value='members';
      if(typeof renderCommunication==='function') renderCommunication();
      ids.forEach(id=>{ const cb=document.querySelector(`#commMemberList input[type="checkbox"][value="${CSS.escape(id)}"]`); if(cb) cb.checked=true; });
      const subj=document.getElementById('commSubject'); if(subj && !subj.value) subj.value='Nachricht vom Köcheclub';
    },80);
  }
  function fixMemberSearchClear(){
    const input=document.getElementById('memberSearch'); const clear=document.getElementById('clearMemberSearch');
    if(!input||!clear) return;
    const upd=()=>clear.classList.toggle('hidden',!String(input.value||'').trim());
    if(!clear.dataset.finalBound){
      clear.dataset.finalBound='1';
      input.addEventListener('input',upd);
      clear.addEventListener('click',()=>{input.value=''; upd(); if(typeof renderMembers==='function') renderMembers(); input.focus();});
    }
    upd();
  }
  function fixMemberCommIcon(){
    document.getElementById('memberCommSelected')?.addEventListener('click',openCommunicationForSelected,{once:false});
  }
  function selectedCommMembers(){return Array.from(document.querySelectorAll('#commMemberList input[type="checkbox"]:checked')).map(cb=>cb.value);}
  function forcePrintComm(){
    const subject=document.getElementById('commSubject')?.value||'Nachricht';
    const body=document.getElementById('commBody')?.value||'';
    const ids=selectedCommMembers();
    const rec=ids.map(id=>{const m=(state.members||[]).find(x=>x.id===id);return m?memberName(m):id;}).join(', ');
    const html=`<h1>${esc(subject)}</h1><p><strong>Empfänger:</strong> ${esc(rec||'nicht ausgewählt')}</p><div style="white-space:pre-wrap;border:1px solid #ccc;padding:12px">${esc(body)}</div>`;
    if(typeof printHtml==='function') printHtml('Kommunikation - '+subject,html); else {const w=window.open('','_blank'); if(w){w.document.write('<!doctype html><meta charset="utf-8"><title>'+esc(subject)+'</title>'+html+'<script>window.print()<\/script>');w.document.close();}}
  }
  function patchCommPrint(){
    const btn=document.getElementById('commPrint'); if(!btn||btn.dataset.finalPrintBound) return;
    btn.dataset.finalPrintBound='1';
    btn.addEventListener('click',e=>{e.preventDefault(); e.stopImmediatePropagation(); forcePrintComm();},true);
  }
  function compactCommCheckboxes(){
    document.querySelectorAll('#commMemberList input[type="checkbox"],#commSelectAll').forEach(cb=>{cb.style.width='14px';cb.style.height='14px';cb.style.minWidth='14px';});
  }
  function refreshMasterArrows(){
    const map=[['showAgeChart','masterAgeChart','Diagramm ausblenden','Diagramm anzeigen'],['showDurationChart','masterDurationChart','Diagramm ausblenden','Diagramm anzeigen']];
    map.forEach(([btnId,targetId,on,off])=>{
      const b=document.getElementById(btnId),t=document.getElementById(targetId); if(!b||!t) return;
      const vis=!t.classList.contains('hidden');
      b.textContent=(vis?'▼ ':'▶ ')+(vis?on:off);
    });
  }
  function init(){
    fixMemberSearchClear(); fixMemberCommIcon(); patchCommPrint(); compactCommCheckboxes(); refreshMasterArrows();
    ['showAgeChart','showDurationChart'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(refreshMasterArrows,0)));
    document.getElementById('commMemberList')?.addEventListener('change',compactCommCheckboxes);
  }
  const oldRenderMembers=window.renderMembers;
  if(typeof oldRenderMembers==='function') window.renderMembers=function(){const r=oldRenderMembers.apply(this,arguments); fixMemberSearchClear(); return r;};
  const oldRenderCommunication=window.renderCommunication;
  if(typeof oldRenderCommunication==='function') window.renderCommunication=function(){const r=oldRenderCommunication.apply(this,arguments); setTimeout(()=>{compactCommCheckboxes(); patchCommPrint();},0); return r;};
  document.addEventListener('DOMContentLoaded',init);
  setTimeout(init,100);
})();

/* ===== 15_request_fixes.js ===== */
/* Phase 9.9 – gezielte Korrekturen: Finanzen-Menü, Pinnwand/Uhr, Listenregeln-Register */
(function(){
  function qs(s){return document.querySelector(s)}
  function qsa(s){return Array.from(document.querySelectorAll(s))}
  function prefs(){
    try{
      const key=state?.session?.userName || 'Gast';
      state.userPrefs=state.userPrefs||{};
      state.userPrefs[key]=state.userPrefs[key]||{};
      return state.userPrefs[key];
    }catch(e){return {};}
  }
  function persist(){ try{ if(typeof saveState==='function') saveState(); }catch(e){} }

  function setupFinanceMenu(){
    const parent=qs('#financeMenuToggle');
    const submenu=qs('#financeSubmenu') || qs('.finance-submenu');
    const sign=qs('#financeMenuSign');
    if(!parent || !submenu) return;
    // Finanzen ist nur eine Überschrift/Gruppe, keine eigene Seite.
    const update=()=>{
      const open=submenu.classList.contains('open-submenu') || submenu.classList.contains('always-visible') && parent.getAttribute('aria-expanded')!=='false';
      if(sign) sign.textContent=open?'−':'+';
      else parent.textContent=(open?'−':'+')+' Finanzen';
      parent.setAttribute('aria-expanded',String(open));
    };
    if(!parent.dataset.financeBound){
      parent.dataset.financeBound='1';
      parent.addEventListener('click',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const open=parent.getAttribute('aria-expanded')==='true';
        submenu.classList.toggle('open-submenu',!open);
        submenu.classList.toggle('always-visible',!open);
        parent.setAttribute('aria-expanded',String(!open));
        update();
      });
    }
    update();
  }

  function setupListRulesAsSettingsTab(){
    // Unter Zahnrad ist Listenregeln jetzt Registerkarte in Stammdaten, kein eigener Navigations-Unterpunkt.
    qsa('#settingsSubmenu [data-view="listRules"]').forEach(el=>el.remove());
    const tab=qs('[data-settings-tab="settingsListRules"]');
    const panel=qs('#settingsListRules');
    if(tab && panel && !tab.dataset.extraBound){
      tab.dataset.extraBound='1';
      tab.addEventListener('click',()=>{
        const active=qs('.settings-tab.active')?.id;
        if(active && active!==tab.dataset.settingsTab && typeof confirmLeaveSettings==='function' && !confirmLeaveSettings()) return;
        qsa('[data-settings-tab]').forEach(b=>b.classList.remove('active'));
        qsa('.settings-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        panel.classList.add('active');
      });
    }
  }

  function applyClockVisibility(){
    const p=prefs();
    const clock=qs('#clock');
    const enabled=p.clockEnabled!==false;
    if(clock) clock.classList.toggle('hidden',!enabled);
    const cb=qs('#userClockEnabled');
    if(cb) cb.checked=enabled;
  }

  function applyPinboardPersonalVisibility(){
    const p=prefs();
    if(typeof p.pinboardPersonalVisible==='undefined') p.pinboardPersonalVisible=true;
    const visible=p.pinboardPersonalVisible!==false;
    const topSwitch=qs('.topbar-pinboard-switch');
    if(topSwitch) topSwitch.classList.toggle('hidden',!visible || !state?.session?.isLoggedIn);
    const cb=qs('#pinboardPersonalVisible');
    if(cb) cb.checked=visible;
    if(!visible){
      const widget=qs('#pinboardWidget');
      const toggle=qs('#pinboardToggle');
      if(widget) widget.classList.add('hidden');
      if(toggle) toggle.checked=false;
    }
  }

  function bindPersonalSwitches(){
    const clock=qs('#userClockEnabled');
    if(clock && !clock.dataset.clockVisibleBound){
      clock.dataset.clockVisibleBound='1';
      clock.addEventListener('change',()=>{
        prefs().clockEnabled=!!clock.checked;
        persist(); applyClockVisibility();
      });
    }
    const pin=qs('#pinboardPersonalVisible');
    if(pin && !pin.dataset.pinPersonalBound){
      pin.dataset.pinPersonalBound='1';
      pin.addEventListener('change',()=>{
        prefs().pinboardPersonalVisible=!!pin.checked;
        persist(); applyPinboardPersonalVisibility();
      });
    }
    // Der Schalter im Post-it „Für alle sichtbar“ muss klickbar bleiben.
    const shared=qs('#pinboardShared');
    if(shared){
      shared.disabled=false;
      shared.style.pointerEvents='auto';
    }
  }

  function syncSettingsFields(){
    applyClockVisibility();
    applyPinboardPersonalVisibility();
    bindPersonalSwitches();
  }

  function patchRenderers(){
    if(typeof window.renderSettings==='function' && !window.renderSettings._requestPatched){
      const old=window.renderSettings;
      window.renderSettings=function(){ const r=old.apply(this,arguments); setTimeout(syncSettingsFields,0); return r; };
      window.renderSettings._requestPatched=true;
    }
    if(typeof window.renderAll==='function' && !window.renderAll._requestPatched){
      const old=window.renderAll;
      window.renderAll=function(){ const r=old.apply(this,arguments); setTimeout(()=>{setupFinanceMenu();setupListRulesAsSettingsTab();syncSettingsFields();},0); return r; };
      window.renderAll._requestPatched=true;
    }
    if(typeof window.showView==='function' && !window.showView._financeNoPagePatch){
      const old=window.showView;
      window.showView=function(view){
        if(view==='finance'){
          setupFinanceMenu();
          return;
        }
        return old.apply(this,arguments);
      };
      window.showView._financeNoPagePatch=true;
    }
  }

  function init(){
    patchRenderers();
    setupFinanceMenu();
    setupListRulesAsSettingsTab();
    syncSettingsFields();
  }
  document.addEventListener('DOMContentLoaded',init);
  setTimeout(init,200);
})();

/* ===== 17_final_button_read_roles_fix.js ===== */
/* Phase 9.9 – Korrektur: Gelesen-Button, kleine Rollen-Kästchen und Neu-Buttons */
(function(){
  'use strict';

  function msg(text,type){
    if(typeof window.toast === 'function') window.toast(text,type||'info');
    else if(text) window.alert(text);
  }
  function save(){ try{ if(typeof window.saveState === 'function') window.saveState(); }catch(_e){} }
  function escCss(v){
    try{ return window.CSS && CSS.escape ? CSS.escape(String(v)) : String(v).replace(/"/g,'\\"'); }
    catch(_e){ return String(v); }
  }

  function currentMailRecipientId(){
    const key=String(window.state?.session?.userKey||'').trim().toLowerCase();
    if(!key) return '';
    if(key==='admin' || window.state?.session?.role==='Admin' || window.state?.session?.role==='Systeminhaber') return '__admin__';
    const a=(window.state?.roleAssignments||[]).find(x=>String(x.userName||'').trim().toLowerCase()===key);
    return a?.memberId || '';
  }

  function markMessageForRecipient(msgId, recipientId){
    const msgObj=(window.state?.communications||[]).find(x=>String(x.id)===String(msgId));
    if(!msgObj) return false;
    const wanted=recipientId || currentMailRecipientId();
    if(!wanted) return false;
    const rec=(msgObj.recipients||[]).find(r=>String(r.id)===String(wanted));
    if(!rec) return false;
    rec.readAt=new Date().toISOString();
    save();
    if(typeof window.renderCommunication === 'function') window.renderCommunication();
    if(typeof window.updateInboxIndicator === 'function') window.updateInboxIndicator(false);
    return true;
  }

  function bindGlobalReadButtons(){
    if(document.body?.dataset.readFixBound) return;
    document.body.dataset.readFixBound='1';
    document.body.addEventListener('click',function(ev){
      const btn=ev.target.closest('.comm-read,.mail-mark-read,[data-action="mark-read"]');
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const msgId=btn.dataset.msg || btn.dataset.id || btn.getAttribute('data-message-id');
      const memberId=btn.dataset.member || btn.dataset.recipient || currentMailRecipientId();
      if(markMessageForRecipient(msgId,memberId)) msg('Nachricht wurde als gelesen markiert.','success');
      else msg('Nachricht konnte nicht als gelesen markiert werden.','warn');
    },true);
  }

  function compactRoleCheckboxes(){
    document.querySelectorAll('#memberRolesTable input[type="checkbox"], .role-checks input[type="checkbox"]').forEach(cb=>{
      cb.classList.add('small-check');
      cb.style.width='14px';
      cb.style.height='14px';
      cb.style.minWidth='14px';
      cb.style.margin='0 4px 0 0';
    });
    document.querySelectorAll('#memberRolesTable .inline-check, .role-checks .inline-check').forEach(label=>{
      label.style.display='inline-flex';
      label.style.alignItems='center';
      label.style.gap='3px';
      label.style.marginRight='8px';
      label.style.lineHeight='1.15';
      label.style.whiteSpace='nowrap';
    });
  }

  function forceNewMember(){
    if(typeof window.confirmLeaveMember === 'function' && !window.confirmLeaveMember()) return;
    if(typeof window.resetMemberForm === 'function') window.resetMemberForm();
    else document.querySelectorAll('#members input, #members textarea').forEach(el=>{ if(el.type==='checkbox') el.checked=false; else el.value=''; });
    if(typeof window.renderMembers === 'function') window.renderMembers();
    msg('Neues Mitglied wird erfasst.','info');
  }

  function forceNewActivity(){
    if(typeof window.resetActivityForm === 'function') window.resetActivityForm();
    else {
      const no=document.getElementById('activityNo'); if(no){ no.value=''; no.dataset.id=''; }
      document.querySelectorAll('#activities input, #activities textarea, #activities select').forEach(el=>{
        if(el.type==='checkbox') el.checked=false;
        else if(el.id==='activityCostPerPerson' || el.id==='activityExtraCostPerPerson') el.value='0';
        else el.value='';
      });
    }
    if(typeof window.showActivityTab === 'function') window.showActivityTab('activityFormTab');
    if(typeof window.renderActivityParticipants === 'function') window.renderActivityParticipants([],[],[]);
    if(typeof window.updateActivityTotal === 'function') window.updateActivityTotal();
    msg('Neuer Ausflug wird erfasst.','info');
  }

  function forceNewDonation(){
    if(typeof window.resetDonationForm === 'function') window.resetDonationForm();
    else {
      const no=document.getElementById('donationNo'); if(no){ no.value=''; no.dataset.id=''; }
      document.querySelectorAll('#donations input, #donations textarea, #donations select').forEach(el=>{ if(el.type==='checkbox') el.checked=false; else el.value=''; });
    }
    msg('Neue Spende wird erfasst.','info');
  }

  function forceNewCommunication(){
    ['commSubject','commBody','commMemberSearch'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    document.querySelectorAll('#commMemberList input[type="checkbox"], #commSelectAll').forEach(cb=>{ cb.checked=false; cb.indeterminate=false; });
    if(typeof window.renderCommunication === 'function') window.renderCommunication();
    msg('Neue Nachricht wird erfasst.','info');
  }

  function bindNewButtons(){
    const mappings={
      newMember:forceNewMember,
      newActivity:forceNewActivity,
      newDonation:forceNewDonation,
      commNew:forceNewCommunication
    };
    Object.entries(mappings).forEach(([id,fn])=>{
      const btn=document.getElementById(id);
      if(!btn || btn.dataset.newFixBound) return;
      btn.dataset.newFixBound='1';
      btn.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        fn();
      },true);
    });
  }

  function refreshCurrentMemberMarker(){
    if(typeof window.renderMembers === 'function') window.renderMembers();
  }
  function bindMemberNavMarker(){
    // Konsolidiert in bindMemberNavOverride(): nur eine autoritative Navigation.
  }

  function patchRenderers(){
    if(typeof window.renderMemberRoleAssignments === 'function' && !window.renderMemberRoleAssignments._smallCheckFix){
      const old=window.renderMemberRoleAssignments;
      window.renderMemberRoleAssignments=function(){ const r=old.apply(this,arguments); setTimeout(compactRoleCheckboxes,0); return r; };
      window.renderMemberRoleAssignments._smallCheckFix=true;
    }
    if(typeof window.renderCommunication === 'function' && !window.renderCommunication._readButtonFix){
      const old=window.renderCommunication;
      window.renderCommunication=function(){ const r=old.apply(this,arguments); setTimeout(()=>{ bindGlobalReadButtons(); },0); return r; };
      window.renderCommunication._readButtonFix=true;
    }
  }

  function init(){
    bindGlobalReadButtons();
    compactRoleCheckboxes();
    bindNewButtons();
    bindMemberNavMarker();
    patchRenderers();
  }

  document.addEventListener('DOMContentLoaded',init);
  setTimeout(init,0);
  setTimeout(init,300);
})();

/* ===== 18_workwear.js ===== */
/* Phase 9.10 – Dienstkleidung und allgemeine Bestellvorbereitung */
(function(){
  const ARTICLE_DEFAULTS=[
    {article:"Kochjacke",defaultSize:"",price:0},
    {article:"Polo-Shirt",defaultSize:"",price:0},
    {article:"Hose",defaultSize:"",price:0},
    {article:"Schuhe",defaultSize:"",price:0}
  ];
  function ensureWorkwearState(){
    state.workwearArticles=Array.isArray(state.workwearArticles)&&state.workwearArticles.length?state.workwearArticles:JSON.parse(JSON.stringify(ARTICLE_DEFAULTS));
    state.workwearIssues=Array.isArray(state.workwearIssues)?state.workwearIssues:[];
    state.workwearOrders=Array.isArray(state.workwearOrders)?state.workwearOrders:[];
    state.investmentPlanning=Array.isArray(state.investmentPlanning)?state.investmentPlanning:[];
    state.members=(state.members||[]).map(m=>({
      ...m,
      clothing:{jacketSize:"",poloSize:"",pantsSize:"",shoeSize:"",...(m.clothing||{})},
      claims:{...((typeof defaultClaims==="function")?defaultClaims():{}),...(m.claims||{})}
    }));
  }
  function fillSelect(id,values){ const el=document.getElementById(id); if(!el) return; const cur=el.value; el.innerHTML=(values||[""]).map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v||"Alle")}</option>`).join(""); el.value=cur; }
  function monthsInClub(m){
    const start=m.joinedAt?new Date(m.joinedAt):null; if(!start||Number.isNaN(start.getTime())) return 0;
    const now=new Date(); return Math.max(0,(now.getFullYear()-start.getFullYear())*12 + (now.getMonth()-start.getMonth()) - (now.getDate()<start.getDate()?1:0));
  }
  function membershipText(m){ const months=monthsInClub(m); const y=Math.floor(months/12); const mo=months%12; return `${y} J. ${mo} M.`; }
  function hasWorkwearClaim(m){ const c={...(m.claims||{})}; if(c.workwear===false) return false; const min=Number(c.workwearMonths||0); return min===0 || monthsInClub(m)>=min; }
  function lastIssueText(memberId){
    const rows=(state.workwearIssues||[]).filter(i=>i.memberId===memberId).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    if(!rows.length) return "";
    const r=rows[0]; return `${formatDate(r.date)} – ${r.article||""}`;
  }
  function articlePrice(article){ const a=(state.workwearArticles||[]).find(x=>x.article===article); return Number(a?.price||0); }
  function renderWorkwear(){
    ensureWorkwearState();
    fillSelect("filterJacketSize",state.combos.workwearSizesJacket||[]); fillSelect("filterPoloSize",state.combos.workwearSizesPolo||[]); fillSelect("filterPantsSize",state.combos.workwearSizesPants||[]); fillSelect("filterShoeSize",state.combos.workwearSizesShoes||[]);
    fillSelect("issueArticle",["",...(state.workwearArticles||[]).map(a=>a.article)]); fillSelect("issueMember",["",...(state.members||[]).filter(m=>(typeof memberStatus==='function'?memberStatus(m):m.memberType)!=="Ausgeschieden").map(m=>`${m.memberNo} – ${m.lastName}, ${m.firstName}`)]); fillSelect("orderSupplier",state.combos.suppliers||[]);
    renderWorkwearTable(); renderWorkwearIssues(); renderWorkwearArticles(); renderWorkwearOrders();
  }
  function filteredWorkwearMembers(){
    const q=(document.getElementById("workwearSearch")?.value||"").toLowerCase().trim();
    const fJ=document.getElementById("filterJacketSize")?.value||""; const fP=document.getElementById("filterPoloSize")?.value||""; const fH=document.getElementById("filterPantsSize")?.value||""; const fS=document.getElementById("filterShoeSize")?.value||""; const fC=document.getElementById("filterWorkwearClaim")?.value||"";
    return (state.members||[]).filter(m=>{
      /* Ueber memberStatus pruefen, nicht ueber die Mitgliedsart: bei einem Verstorbenen
         steht dort oft noch "Aktiv", der Austritt haengt am Austrittsgrund. Sonst stuende
         ein Verstorbener in der Dienstkleidungsliste. */
      if((typeof memberStatus==='function'?memberStatus(m):String(m.memberType||""))==="Ausgeschieden") return false;
      if(String(m.memberType||"").toLowerCase().includes("ausgeschieden")) return false;
      if(String(m.status||"").toLowerCase().includes("verstorben")) return false;
      const c=m.clothing||{}; const txt=`${m.memberNo} ${m.firstName} ${m.lastName} ${m.city}`.toLowerCase();
      if(q && !txt.includes(q)) return false; if(fJ && c.jacketSize!==fJ) return false; if(fP && c.poloSize!==fP) return false; if(fH && c.pantsSize!==fH) return false; if(fS && c.shoeSize!==fS) return false;
      if(fC==="yes" && !hasWorkwearClaim(m)) return false; if(fC==="no" && hasWorkwearClaim(m)) return false; return true;
    });
  }
  function sizeOptions(list,cur){
    const current=String(cur||"");
    const values=[...new Set([...(list||[""]).map(v=>String(v||"")),...(current?[current]:[])])];
    return values.map(v=>`<option value="${escapeHtml(v)}" ${v===current?"selected":""}>${escapeHtml(v)}</option>`).join("");
  }
  function renderWorkwearTable(){
    const body=document.getElementById("workwearTableBody"); if(!body) return;
    body.innerHTML=filteredWorkwearMembers().map(m=>{ const c=m.clothing||{}; const ok=hasWorkwearClaim(m);
      return `<tr data-member-id="${m.id}"><td><input class="workwear-select small-check" type="checkbox"></td><td>${escapeHtml(m.memberNo||"")}</td><td>${escapeHtml((m.lastName||"")+", "+(m.firstName||""))}</td><td>${escapeHtml(m.memberType||"")}</td><td>${formatDate(m.joinedAt)}</td><td>${membershipText(m)}</td><td><select data-size="jacketSize">${sizeOptions(state.combos.workwearSizesJacket,c.jacketSize||"")}</select></td><td><select data-size="poloSize">${sizeOptions(state.combos.workwearSizesPolo,c.poloSize||"")}</select></td><td><select data-size="pantsSize">${sizeOptions(state.combos.workwearSizesPants,c.pantsSize||"")}</select></td><td><select data-size="shoeSize">${sizeOptions(state.combos.workwearSizesShoes,c.shoeSize||"")}</select></td><td class="${ok?"ok-cell":"warn-cell"}">${ok?"Ja":"Nein"}</td><td>${escapeHtml(lastIssueText(m.id))}</td></tr>`;
    }).join("");
  }
  function selectedWorkwearMembers(){ return [...document.querySelectorAll("#workwearTableBody tr")].filter(tr=>tr.querySelector(".workwear-select")?.checked).map(tr=>state.members.find(m=>m.id===tr.dataset.memberId)).filter(m=>m && (typeof memberStatus!=='function'||memberStatus(m)!=="Ausgeschieden") && !String(m.memberType||"").toLowerCase().includes("ausgeschieden") && !String(m.status||"").toLowerCase().includes("verstorben")); }
  function saveWorkwearSizes(){
    const changed=[];
    document.querySelectorAll("#workwearTableBody tr").forEach(tr=>{ const m=state.members.find(x=>x.id===tr.dataset.memberId); if(!m) return; m.clothing=m.clothing||{}; tr.querySelectorAll("select[data-size]").forEach(sel=>m.clothing[sel.dataset.size]=sel.value); changed.push(m); });
    const saved=saveState();
    if(saved===false){toast("Größen konnten nicht dauerhaft gespeichert werden. Bitte nicht neu laden.","error");return false;}
    try{if(typeof memberWasPersisted==='function'&&!changed.every(memberWasPersisted))throw new Error('Rückleseprüfung der Dienstkleidungsgrößen fehlgeschlagen.');}
    catch(error){console.error(error);toast("Größen nicht bestätigt. Bitte nicht neu laden.","error");return false;}
    renderWorkwear(); toast("Dienstkleidungsgrößen dauerhaft gespeichert und für Mitgliedskarten sowie Einkauf übernommen.","success"); return true;
  }
  function renderWorkwearArticles(){ const body=document.getElementById("workwearArticleTable"); if(!body) return; body.innerHTML=(state.workwearArticles||[]).map((a,i)=>`<tr data-idx="${i}"><td><input data-field="article" value="${escapeHtml(a.article)}"></td><td><input data-field="defaultSize" value="${escapeHtml(a.defaultSize||"")}"></td><td><input data-field="price" type="number" step="0.01" min="0" value="${Number(a.price||0)}"></td></tr>`).join(""); }
  function saveWorkwearArticles(){ state.workwearArticles=[...document.querySelectorAll("#workwearArticleTable tr")].map(tr=>({article:tr.querySelector('[data-field="article"]')?.value||"",defaultSize:tr.querySelector('[data-field="defaultSize"]')?.value||"",price:Number(tr.querySelector('[data-field="price"]')?.value||0)})).filter(a=>a.article); saveState(); renderWorkwear(); toast("Artikel und Preise gespeichert.","info"); }
  function saveWorkwearIssue(){
    const sel=document.getElementById("issueMember")?.value||""; const memberNo=sel.split("–")[0].trim(); const m=(state.members||[]).find(x=>x.memberNo===memberNo); if(!m){ toast("Bitte Empfänger auswählen.","warn"); return; }
    const article=document.getElementById("issueArticle")?.value||""; if(!article){ toast("Bitte Artikel auswählen.","warn"); return; }
    const qty=Number(document.getElementById("issueQty")?.value||1); const price=articlePrice(article);
    state.workwearIssues.unshift({id:"iss_"+Date.now(),date:document.getElementById("issueDate")?.value||new Date().toISOString().slice(0,10),memberId:m.id,memberName:`${m.lastName}, ${m.firstName}`,article,size:document.getElementById("issueSize")?.value||"",qty,value:qty*price,confirmed:document.getElementById("issueConfirmed")?.value||"no"});
    saveState(); renderWorkwear(); toast("Ausgabe gespeichert.","info");
  }
  function renderWorkwearIssues(){ const body=document.getElementById("workwearIssueTable"); if(!body) return; body.innerHTML=(state.workwearIssues||[]).map(i=>`<tr><td>${formatDate(i.date)}</td><td>${escapeHtml(i.memberName||"")}</td><td>${escapeHtml(i.article||"")}</td><td>${escapeHtml(i.size||"")}</td><td>${i.qty||1}</td><td>${formatCurrency(i.value||0)}</td><td>${escapeHtml(i.confirmed||"")}</td></tr>`).join(""); }
  function orderLinesFromSelection(force=false){
    const selected=selectedWorkwearMembers(); if(!selected.length){ toast("Bitte mindestens ein Mitglied auswählen.","warn"); return null; }
    const noClaim=selected.filter(m=>!hasWorkwearClaim(m));
    if(noClaim.length && !force){ if(!confirm("Bei einigen Mitgliedern besteht noch kein Anspruch auf Dienstkleidung. Trotzdem bestellen?\n\n"+noClaim.map(m=>`${m.lastName}, ${m.firstName} – ${membershipText(m)}`).join("\n"))) return null; }
    const map=new Map(); selected.forEach(m=>{ const c=m.clothing||{}; [["Kochjacke",c.jacketSize],["Polo-Shirt",c.poloSize],["Hose",c.pantsSize],["Schuhe",c.shoeSize]].forEach(([article,size])=>{ if(!size) return; const key=article+"|"+size; const line=map.get(key)||{article,size,qty:0,price:articlePrice(article)}; line.qty++; line.total=line.qty*line.price; map.set(key,line); }); });
    return [...map.values()];
  }
  function createOrder(){ const lines=orderLinesFromSelection(); if(!lines||!lines.length){ toast("Keine Bestellpositionen erzeugt. Bitte Größen prüfen.","warn"); return; } const sum=lines.reduce((n,l)=>n+(l.total||0),0); const order={id:"ord_"+Date.now(),date:new Date().toISOString().slice(0,10),supplier:document.getElementById("orderSupplier")?.value||"",type:document.getElementById("orderType")?.value||"Dienstkleidung",status:document.getElementById("orderStatus")?.value||"Planung",note:document.getElementById("orderNote")?.value||"",lines,sum}; state.workwearOrders.unshift(order); saveState(); renderWorkwear(); showOrderPreview(order); toast("Bestellung erzeugt.","info"); }
  function showOrderPreview(order=(state.workwearOrders||[])[0]){ const box=document.getElementById("workwearOrderPreview"); if(!box) return; if(!order){ box.innerHTML=""; return; } box.innerHTML=`<h4>Bestellvorschau</h4><p><strong>Lieferant:</strong> ${escapeHtml(order.supplier||"-")} &nbsp; <strong>Summe:</strong> ${formatCurrency(order.sum||0)}</p><table><thead><tr><th>Artikel</th><th>Größe</th><th>Menge</th><th>Einzelpreis</th><th>Summe</th></tr></thead><tbody>${(order.lines||[]).map(l=>`<tr><td>${escapeHtml(l.article)}</td><td>${escapeHtml(l.size)}</td><td>${l.qty}</td><td>${formatCurrency(l.price)}</td><td>${formatCurrency(l.total)}</td></tr>`).join("")}</tbody></table>`; }
  function renderWorkwearOrders(){ const body=document.getElementById("workwearOrderTable"); if(!body) return; body.innerHTML=(state.workwearOrders||[]).map(o=>`<tr data-order-id="${o.id}"><td>${formatDate(o.date)}</td><td>${escapeHtml(o.supplier||"")}</td><td>${escapeHtml(o.type||"")}</td><td>${(o.lines||[]).length}</td><td>${formatCurrency(o.sum||0)}</td><td>${escapeHtml(o.status||"")}</td></tr>`).join(""); }
  function printWorkwearList(){ printHtml("Dienstkleidungsliste", document.querySelector("#workwearTable")?.outerHTML||""); }
  function printHtml(title,html){ const w=window.open("","_blank"); if(!w) return; w.document.write(`<html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:5px;font-size:12px}th{background:#eee}</style></head><body><h2>${escapeHtml(title)}</h2>${html}</body></html>`); w.document.close(); w.print(); }
  function printReceipt(){ const selected=selectedWorkwearMembers(); const member=selected[0] || state.members.find(m=>m.memberNo===(document.getElementById("issueMember")?.value||"").split("–")[0].trim()); if(!member){ toast("Bitte ein Mitglied auswählen.","warn"); return; } printHtml("Empfangsquittung Dienstkleidung", `<p>Hiermit bestätige ich, ${escapeHtml(member.firstName||"")} ${escapeHtml(member.lastName||"")}, den Empfang der aufgeführten Dienstkleidung.</p><p>Datum: ____________ &nbsp; Unterschrift: __________________________</p>`); }
  function printOrder(){ const order=(state.workwearOrders||[])[0]; if(!order){ toast("Keine Bestellung vorhanden.","warn"); return; } showOrderPreview(order); printHtml("Bestellung Dienstkleidung", document.getElementById("workwearOrderPreview")?.innerHTML||""); }
  function mailOrder(){ const order=(state.workwearOrders||[])[0]; if(!order){ toast("Keine Bestellung vorhanden.","warn"); return; } const body=`Hiermit bestellen wir bei Ihnen folgende Artikel:%0D%0A%0D%0A`+(order.lines||[]).map(l=>`${l.qty} x ${l.article}, Größe ${l.size}, Einzelpreis ${formatCurrency(l.price)}`).join("%0D%0A")+`%0D%0A%0D%0ASumme: ${formatCurrency(order.sum||0)}`; location.href=`mailto:?subject=${encodeURIComponent("Bestellung Dienstkleidung")}&body=${body}`; }
  function transferInvestment(){ const order=(state.workwearOrders||[])[0]; if(!order){ toast("Keine Bestellung vorhanden.","warn"); return; } state.investmentPlanning.unshift({id:"inv_"+Date.now(),date:new Date().toISOString().slice(0,10),source:"Dienstkleidung",description:`Bestellung ${order.supplier||""}`,amount:order.sum||0,status:"Planung"}); saveState(); toast("An Investitionsplanung übergeben.","info"); }
  window.renderWorkwear=renderWorkwear;
  document.addEventListener("DOMContentLoaded",()=>{
    ["workwearSearch","filterJacketSize","filterPoloSize","filterPantsSize","filterShoeSize","filterWorkwearClaim"].forEach(id=>document.getElementById(id)?.addEventListener("input",renderWorkwearTable));
    document.querySelectorAll("[data-workwear-tab]").forEach(btn=>btn.addEventListener("click",()=>{ document.querySelectorAll("[data-workwear-tab]").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); document.querySelectorAll(".workwear-tab").forEach(t=>t.classList.remove("active")); document.getElementById(btn.dataset.workwearTab)?.classList.add("active"); }));
    document.getElementById("workwearSelectAll")?.addEventListener("click",()=>document.querySelectorAll(".workwear-select").forEach(c=>c.checked=true));
    document.getElementById("workwearSelectNone")?.addEventListener("click",()=>document.querySelectorAll(".workwear-select").forEach(c=>c.checked=false));
    document.getElementById("workwearSaveSizes")?.addEventListener("click",saveWorkwearSizes); document.getElementById("workwearPrint")?.addEventListener("click",printWorkwearList);
    document.getElementById("workwearReceipt")?.addEventListener("click",printReceipt); document.getElementById("printWorkwearReceipt2")?.addEventListener("click",printReceipt);
    document.getElementById("saveWorkwearIssue")?.addEventListener("click",saveWorkwearIssue); document.getElementById("saveWorkwearArticles")?.addEventListener("click",saveWorkwearArticles);
    document.getElementById("createWorkwearOrder")?.addEventListener("click",createOrder); document.getElementById("printWorkwearOrder")?.addEventListener("click",printOrder); document.getElementById("mailWorkwearOrder")?.addEventListener("click",mailOrder); document.getElementById("transferWorkwearInvestment")?.addEventListener("click",transferInvestment);
    document.getElementById("issueArticle")?.addEventListener("change",()=>{ const article=document.getElementById("issueArticle").value; const a=(state.workwearArticles||[]).find(x=>x.article===article); if(a && document.getElementById("issueSize") && !issueSize.value) issueSize.value=a.defaultSize||""; });
  });
})();

/* ===== 19_members_menu_workwear_fix.js ===== */
/* Mitglieder-Untermenü: Mitgliederverwaltung / Dienstkleidung */
document.addEventListener("DOMContentLoaded",()=>{
  const btn=document.getElementById("membersMenuToggle");
  const menu=document.getElementById("membersSubmenu");
  const sign=document.getElementById("membersMenuSign");
  if(btn && menu){
    btn.addEventListener("click",()=>{
      const open=!menu.classList.contains("open-submenu");
      menu.classList.toggle("open-submenu",open);
      btn.setAttribute("aria-expanded",open?"true":"false");
      if(sign) sign.textContent=open?"−":"+";
    });
  }
});

/* ===== 20_member_workwear_orders.js ===== */
/* Phase 9.10 Ergänzung – Mitgliederregister Dienstkleidung + Einkauf/Bestellungen */
(function(){
  function fmtDate(v){ return (typeof formatDate==="function")?formatDate(v):(v||""); }
  function fmtCur(v){ return (typeof formatCurrency==="function")?formatCurrency(v):((Number(v)||0).toFixed(2)+" €"); }
  window.clothingToForm=function(m){
    const c=m?.clothing||{}; const claims=m?.claims||{};
    const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.value=val??""; };
    set("memberJacketSize",c.jacketSize||"");
    set("memberPoloSize",c.poloSize||"");
    set("memberPantsSize",c.pantsSize||"");
    set("memberShoeSize",c.shoeSize||"");
    set("memberWorkwearClaim",claims.workwear===false?"no":"yes");
    set("memberWorkwearMonths",claims.workwearMonths||0);
  };
  window.renderMemberWorkwearIssues=function(memberId){
    const body=document.getElementById("memberWorkwearIssueTable"); if(!body) return;
    const rows=(state.workwearIssues||[]).filter(x=>x.memberId===memberId);
    body.innerHTML=rows.length?rows.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${escapeHtml(x.article||"")}</td><td>${escapeHtml(x.size||"")}</td><td>${x.qty||1}</td><td>${fmtCur(x.value||0)}</td><td>${escapeHtml(x.by||x.issuedBy||"")}</td><td>${escapeHtml(x.note||"")}</td></tr>`).join(""):`<tr><td colspan="7" class="muted">Für diese Person wurde noch keine Dienstkleidung ausgegeben.</td></tr>`;
  };
  function renderOrders(){
    const body=document.getElementById("ordersTable"); if(!body) return;
    const orders=state.workwearOrders||[];
    body.innerHTML=orders.length?orders.map(o=>`<tr><td>${fmtDate(o.date)}</td><td>${escapeHtml(o.supplier||"")}</td><td>${escapeHtml(o.type||"")}</td><td>${(o.lines||[]).length}</td><td>${fmtCur(o.sum||0)}</td><td>${escapeHtml(o.status||"")}</td></tr>`).join(""):`<tr><td colspan="6" class="muted">Noch keine Bestellungen vorhanden.</td></tr>`;
  }
  function printOrders(){
    const html=document.querySelector("#orders table")?.outerHTML||"";
    const w=window.open("","_blank"); if(!w) return;
    w.document.write(`<html><head><title>Bestellungen</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#eee}</style></head><body><h2>Bestellungen</h2>${html}</body></html>`);
    w.document.close(); w.print();
  }
  function mailOrders(){ location.href="mailto:?subject="+encodeURIComponent("Bestellung")+"&body="+encodeURIComponent("Hiermit bestellen wir bei Ihnen folgende Artikel.\n\nDie detaillierte Bestellliste wird als PDF/Anlage vorbereitet."); }
  function toggleShopping(open){
    const sub=document.getElementById("shoppingSubmenu"), sign=document.getElementById("shoppingMenuSign"), btn=document.getElementById("shoppingMenuToggle");
    if(!sub||!sign) return; const stateOpen = open ?? !sub.classList.contains("open-submenu");
    sub.classList.toggle("open-submenu",stateOpen); sub.classList.toggle("always-visible",stateOpen); sign.textContent=stateOpen?"−":"+"; if(btn) btn.setAttribute("aria-expanded",String(stateOpen));
  }
  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("shoppingMenuToggle")?.addEventListener("click",()=>toggleShopping());
    document.getElementById("ordersPrint")?.addEventListener("click",printOrders);
    document.getElementById("ordersMail")?.addEventListener("click",mailOrders);
    document.getElementById("ordersNew")?.addEventListener("click",()=>{["ordersSupplier","ordersNote"].forEach(id=>{const el=document.getElementById(id); if(el) el.value=""}); const d=document.getElementById("ordersDate"); if(d) d.value=new Date().toISOString().slice(0,10); if(typeof toast==="function") toast("Neue Bestellung vorbereitet.","info");});
    const oldShow=window.showView;
    if(typeof oldShow==="function"){
      window.showView=function(view){ const r=oldShow.apply(this,arguments); if(view==="orders") renderOrders(); return r; };
    }
    document.querySelectorAll('[data-member-tab="memberWorkwear"]').forEach(btn=>btn.addEventListener("click",()=>{ if(typeof renderMemberWorkwearIssues==="function") renderMemberWorkwearIssues(window.currentMemberId||currentMemberId||""); }));
  });
})();

/* ===== 21_phase910_requested_fixes.js ===== */
/* Phase 9.10 – Korrekturen: Einkauf-Unterpunkt, Suchmasken-Pin/Hamburger, Pinnwand-Start */
(function(){
  'use strict';

  function toastInfo(msg,type){ try{ if(typeof window.toast==='function') window.toast(msg,type||'info'); }catch(_e){} }
  function saveSafe(){ try{ if(typeof window.saveState==='function') window.saveState(); }catch(_e){} }
  function prefs(){
    try{
      if(typeof window.getUserPrefsObject==='function') return window.getUserPrefsObject();
      const key=window.state?.session?.userName || 'Gast';
      window.state.userPrefs=window.state.userPrefs||{};
      window.state.userPrefs[key]=window.state.userPrefs[key]||{};
      return window.state.userPrefs[key];
    }catch(_e){ return {}; }
  }
  function isLogged(){ return !!window.state?.session?.isLoggedIn; }

  function setupShoppingMenu(){
    const parent=document.getElementById('shoppingMenuToggle');
    const submenu=document.getElementById('shoppingSubmenu');
    const sign=document.getElementById('shoppingMenuSign');
    if(!parent || !submenu) return;
    const child=submenu.querySelector('[data-view="orders"]');
    if(child) child.textContent='Bestellung';
    function setOpen(open){
      submenu.classList.toggle('open-submenu',!!open);
      submenu.classList.toggle('always-visible',!!open);
      submenu.style.display=open?'block':'none';
      parent.setAttribute('aria-expanded',String(!!open));
      if(sign) sign.textContent=open?'−':'+';
    }
    if(!parent.dataset.shopping910Bound){
      parent.dataset.shopping910Bound='1';
      parent.addEventListener('click',function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const open=parent.getAttribute('aria-expanded')==='true';
        setOpen(!open);
      },true);
    }
    if(parent.getAttribute('aria-expanded')!=='false') setOpen(true);
  }

  function setupMemberSearchControls(){
    const panel=document.querySelector('.member-list.panel');
    const pin=document.getElementById('memberSearchPin');
    const toggle=document.getElementById('memberSearchToggle');
    if(!panel || !pin || !toggle) return;
    const p=prefs();
    if(typeof p.memberSearchPinned==='undefined') p.memberSearchPinned=false;
    if(typeof p.memberSearchCollapsed==='undefined') p.memberSearchCollapsed=false;

    function apply(){
      const pp=prefs();
      const pinned=!!pp.memberSearchPinned;
      const collapsed=pinned?false:!!pp.memberSearchCollapsed;
      panel.classList.toggle('member-search-collapsed',collapsed);
      document.body.classList.toggle('member-search-panel-collapsed',collapsed);
      pin.classList.toggle('pinned',pinned);
      pin.textContent=pinned?'📌':'📍';
      pin.title=pinned?'Suchmaske ist angeheftet und bleibt beim Programmstart offen':'Suchmaske anheften und offen halten';
      toggle.textContent=collapsed?'☰':'☰';
      toggle.title=collapsed?'Suchmaske ausklappen':'Suchmaske einklappen';
      if(pinned && pp.memberSearchCollapsed){ pp.memberSearchCollapsed=false; saveSafe(); }
    }
    if(!pin.dataset.memberSearchPinBound){
      pin.dataset.memberSearchPinBound='1';
      pin.addEventListener('click',function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const pp=prefs();
        pp.memberSearchPinned=!pp.memberSearchPinned;
        if(pp.memberSearchPinned) pp.memberSearchCollapsed=false;
        saveSafe(); apply();
        toastInfo(pp.memberSearchPinned?'Suchmaske angeheftet.':'Suchmaske gelöst.','info');
      });
    }
    if(!toggle.dataset.memberSearchToggleBound){
      toggle.dataset.memberSearchToggleBound='1';
      toggle.addEventListener('click',function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const pp=prefs();
        if(pp.memberSearchPinned){
          pp.memberSearchPinned=false;
          pp.memberSearchCollapsed=true;
          toastInfo('Suchmaske gelöst und eingeklappt.','info');
        }else{
          pp.memberSearchCollapsed=!pp.memberSearchCollapsed;
        }
        saveSafe(); apply();
      });
    }
    apply();
  }

  function getPinData(){
    window.state.ui=window.state.ui||{};
    if(window.state.ui.pinboardShared) return window.state.ui;
    const p=prefs();
    if(!p.pinboard || typeof p.pinboard!=='object') p.pinboard={enabled:false,text:'',x:null,y:null};
    return p.pinboard;
  }
  function applyPinboardTopbar(){
    const top=document.querySelector('.topbar-pinboard-switch');
    const toggle=document.getElementById('pinboardToggle');
    const widget=document.getElementById('pinboardWidget');
    const text=document.getElementById('pinboardText');
    const label=document.getElementById('pinboardSwitchLabel');
    const pin=document.getElementById('pinboardPin');
    const p=prefs();
    if(typeof p.pinboardPersonalVisible==='undefined') p.pinboardPersonalVisible=true;
    const visible=isLogged() && p.pinboardPersonalVisible!==false;
    if(top) top.classList.toggle('hidden',!visible);
    if(!isLogged()){
      if(widget) widget.classList.add('hidden');
      if(toggle) toggle.checked=false;
      return;
    }
    const d=getPinData();
    if(toggle) toggle.checked=!!d.enabled;
    if(text && text.value!==String(d.text||'')) text.value=String(d.text||'');
    if(widget){
      widget.classList.toggle('hidden',!visible || !d.enabled);
      const x=Number(d.x), y=Number(d.y);
      if(Number.isFinite(x) && Number.isFinite(y)){
        widget.style.left=Math.max(8,Math.min(window.innerWidth-80,x))+'px';
        widget.style.top=Math.max(8,Math.min(window.innerHeight-80,y))+'px';
        widget.style.right='auto';
      }
    }
    const has=!!String(d.text||'').trim();
    if(label) label.classList.toggle('pinboard-label-active',has);
    if(pin) pin.classList.toggle('pin-has-text',has);
  }

  function setupSearchClear(){
    const input=document.getElementById('memberSearch');
    const clear=document.getElementById('clearMemberSearch');
    if(!input || !clear) return;
    function update(){ clear.classList.toggle('hidden',!String(input.value||'').trim()); }
    if(!clear.dataset.fix910Bound){
      clear.dataset.fix910Bound='1';
      input.addEventListener('input',update);
      clear.addEventListener('click',function(){
        input.value=''; update();
        if(typeof window.renderMembers==='function') window.renderMembers();
        input.focus();
      });
    }
    update();
  }

  function init(){
    setupShoppingMenu();
    setupMemberSearchControls();
    setupSearchClear();
    applyPinboardTopbar();
  }

  document.addEventListener('DOMContentLoaded',init);
  setTimeout(init,0);
  setTimeout(init,250);

  if(typeof window.applySession==='function' && !window.applySession._phase910RequestedFix){
    const old=window.applySession;
    window.applySession=function(){ const r=old.apply(this,arguments); setTimeout(init,0); return r; };
    window.applySession._phase910RequestedFix=true;
  }
  if(typeof window.renderAll==='function' && !window.renderAll._phase910RequestedFix){
    const old=window.renderAll;
    window.renderAll=function(){ const r=old.apply(this,arguments); setTimeout(init,0); return r; };
    window.renderAll._phase910RequestedFix=true;
  }
  if(typeof window.showView==='function' && !window.showView._phase910RequestedFix){
    const old=window.showView;
    window.showView=function(){ const r=old.apply(this,arguments); setTimeout(init,0); return r; };
    window.showView._phase910RequestedFix=true;
  }
})();

/* ===== 27_phase910_2_ui_layout_tabs_fix.js ===== */
/* Phase 9.10.2 – UI-Layout Stammdaten, Dashboard-Symbolbutton, Dashboard-Tabreihenfolge */
(function(){
  'use strict';

  function safe(fn, fallback){
    try{ return (typeof fn === 'function') ? fn() : fallback; }catch(_e){ return fallback; }
  }
  function saveSafe(){ safe(window.saveState); }
  function toastSafe(msg,type){ safe(()=>window.toast(msg,type||'info')); }
  function prefs(){
    const key = safe(window.currentUserPreferenceKey, (window.state?.session?.userId || window.state?.session?.userName || 'guest')) || 'guest';
    window.state.userPrefs = (window.state.userPrefs && typeof window.state.userPrefs === 'object') ? window.state.userPrefs : {};
    window.state.userPrefs[key] = (window.state.userPrefs[key] && typeof window.state.userPrefs[key] === 'object') ? window.state.userPrefs[key] : {};
    return window.state.userPrefs[key];
  }

  function setDashboardSymbolButtonText(){
    const card = document.getElementById('dashboardSymbolSummary');
    if(!card) return;
    const headline = card.querySelector('.table-headline');
    const h3 = headline?.querySelector('h3');
    const btn = card.querySelector('#toggleDashboardSymbols');
    if(!headline || !h3 || !btn) return;

    const hidden = !!window.state?.settings?.dashboardSymbolsHidden;
    btn.textContent = hidden ? '▶ Symbolübersicht einblenden' : '▼ Symbolübersicht ausblenden';
    btn.title = hidden ? 'Symbolübersicht einblenden' : 'Symbolübersicht ausblenden';
    btn.setAttribute('aria-label', btn.title);
    btn.classList.add('symbol-title-toggle-right','symbol-title-toggle-wide');

    if(btn.parentElement !== h3){
      h3.innerHTML = '';
      h3.appendChild(document.createTextNode('Symbolübersicht'));
      h3.appendChild(btn);
    }else if(!String(h3.textContent || '').trim().startsWith('Symbolübersicht')){
      const currentButton = btn;
      h3.innerHTML = '';
      h3.appendChild(document.createTextNode('Symbolübersicht'));
      h3.appendChild(currentButton);
    }

    const actions = headline.querySelector('.inline-actions');
    if(actions && !actions.querySelector('button')) actions.remove();
  }

  function dashboardTabKey(tab){ return tab?.dataset?.dashboardTab || ''; }
  function dashboardPanelByKey(key){ return key ? document.getElementById(key) : null; }

  function activateDashboardTab(key, persist){
    const tabs = document.querySelector('.dashboard-tabs');
    if(!tabs) return;
    const target = tabs.querySelector(`.tab[data-dashboard-tab="${CSS.escape(key)}"]`) || tabs.querySelector('.tab[data-dashboard-tab]');
    if(!target) return;
    const activeKey = dashboardTabKey(target);
    tabs.querySelectorAll('.tab[data-dashboard-tab]').forEach(tab=>tab.classList.toggle('active', dashboardTabKey(tab) === activeKey));
    document.querySelectorAll('.dashboard-tab-panel').forEach(panel=>panel.classList.toggle('active', panel.id === activeKey));
    if(persist){
      const p = prefs();
      p.activeDashboardTab = activeKey;
      saveSafe();
    }
  }

  function saveDashboardTabOrder(tabs){
    const p = prefs();
    p.dashboardTabOrder = Array.from(tabs.querySelectorAll('.tab[data-dashboard-tab]')).map(dashboardTabKey).filter(Boolean);
    p.activeDashboardTab = p.dashboardTabOrder[0] || p.activeDashboardTab || 'dashboardClubStats';
    saveSafe();
  }

  function applyDashboardTabOrder(tabs){
    const p = prefs();
    const saved = Array.isArray(p.dashboardTabOrder) ? p.dashboardTabOrder : null;
    const buttons = Array.from(tabs.querySelectorAll('.tab[data-dashboard-tab]'));
    if(saved && saved.length){
      const byKey = new Map(buttons.map(tab=>[dashboardTabKey(tab), tab]));
      saved.forEach(key=>{ const tab = byKey.get(key); if(tab){ tabs.appendChild(tab); byKey.delete(key); } });
      byKey.forEach(tab=>tabs.appendChild(tab));
    }
    const firstKey = dashboardTabKey(tabs.querySelector('.tab[data-dashboard-tab]'));
    activateDashboardTab(p.activeDashboardTab || firstKey, false);
  }

  function setupDashboardTabSorting(){
    const tabs = document.querySelector('.dashboard-tabs');
    if(!tabs) return;
    const buttons = Array.from(tabs.querySelectorAll('.tab[data-dashboard-tab]'));
    if(buttons.length < 2) return;

    tabs.classList.add('sortable-tabs','dashboard-tabs-sortable');
    applyDashboardTabOrder(tabs);

    Array.from(tabs.querySelectorAll('.tab[data-dashboard-tab]')).forEach(tab=>{
      tab.classList.add('tab-sortable');
      tab.classList.remove('tab-locked');
      tab.draggable = true;
      tab.title = 'Registerkarte ziehen, um die Reihenfolge zu ändern.';
      if(!tab.querySelector(':scope > .tab-drag-icon')){
        const icon = document.createElement('span');
        icon.className = 'tab-drag-icon dashboard-tab-drag-icon';
        icon.textContent = '↔';
        icon.title = 'Registerkarte verschieben';
        tab.appendChild(icon);
      }
      if(!tab.dataset.phase9102ClickBound){
        tab.dataset.phase9102ClickBound = '1';
        tab.addEventListener('click',()=>{
          if(tab.dataset.justDragged === '1') return;
          activateDashboardTab(dashboardTabKey(tab), true);
        });
      }
      if(!tab.dataset.phase9102DragBound){
        tab.dataset.phase9102DragBound = '1';
        tab.addEventListener('dragstart',e=>{
          tabs.dataset.draggingDashboardTab = dashboardTabKey(tab);
          tab.classList.add('tab-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', dashboardTabKey(tab));
        });
        tab.addEventListener('dragend',()=>{
          tab.classList.remove('tab-dragging');
          delete tabs.dataset.draggingDashboardTab;
        });
        tab.addEventListener('dragover',e=>{
          if(!tabs.dataset.draggingDashboardTab) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          tab.classList.add('tab-drop-target');
        });
        tab.addEventListener('dragleave',()=>tab.classList.remove('tab-drop-target'));
        tab.addEventListener('drop',e=>{
          e.preventDefault();
          tab.classList.remove('tab-drop-target');
          const sourceKey = tabs.dataset.draggingDashboardTab;
          const source = tabs.querySelector(`.tab[data-dashboard-tab="${CSS.escape(sourceKey)}"]`);
          if(!source || source === tab) return;
          const rect = tab.getBoundingClientRect();
          const after = (e.clientX - rect.left) > rect.width / 2;
          tabs.insertBefore(source, after ? tab.nextSibling : tab);
          source.dataset.justDragged = '1';
          setTimeout(()=>delete source.dataset.justDragged, 120);
          saveDashboardTabOrder(tabs);
          activateDashboardTab(dashboardTabKey(tabs.querySelector('.tab[data-dashboard-tab]')), false);
          toastSafe('Dashboard-Registerkarten-Reihenfolge gespeichert.','success');
        });
      }
    });
  }

  function addCss(){
    if(document.getElementById('phase9102UiLayoutTabsCss')) return;
    const st = document.createElement('style');
    st.id = 'phase9102UiLayoutTabsCss';
    st.textContent = `
      .symbol-summary-card .table-headline{justify-content:flex-start!important;align-items:center!important;gap:10px!important;}
      .symbol-summary-card .table-headline h3{display:inline-flex!important;align-items:center!important;gap:10px!important;margin:0!important;white-space:nowrap!important;}
      .symbol-title-toggle-wide{min-width:auto!important;width:auto!important;height:30px!important;padding:4px 12px!important;font-size:13px!important;font-weight:800!important;line-height:1.1!important;white-space:nowrap!important;}

      .dashboard-tabs-sortable .tab{display:inline-flex;align-items:center;gap:8px;}
      .dashboard-tabs-sortable .tab .tab-drag-icon{opacity:.82;margin-left:4px;font-weight:900;cursor:grab;}
      .dashboard-tabs-sortable .tab:hover .tab-drag-icon{opacity:1;}

      #settingsQuickSwitchGrid{
        grid-column:1 / -1!important;
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:14px 72px!important;
        align-items:center!important;
        width:100%!important;
        max-width:none!important;
        margin:8px 0 10px!important;
      }
      #settingsQuickSwitchGrid .toggle-switch,
      #settingsQuickSwitchGrid label.toggle-switch,
      #settingsMasterData #settingsQuickSwitchGrid label.toggle-switch{
        min-width:0!important;
        width:100%!important;
        max-width:100%!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:12px!important;
        white-space:normal!important;
        overflow:visible!important;
        line-height:1.25!important;
      }
      #settingsQuickSwitchGrid [data-switch-slot="protocol"]{grid-column:1!important;grid-row:1!important;}
      #settingsQuickSwitchGrid [data-switch-slot="clock"]{grid-column:2!important;grid-row:1!important;}
      #settingsQuickSwitchGrid [data-switch-slot="symbols"]{grid-column:1!important;grid-row:2!important;}
      #settingsQuickSwitchGrid [data-switch-slot="pinboard"]{grid-column:2!important;grid-row:2!important;}
      #settingsQuickSwitchGrid .switch-slider{flex:0 0 46px!important;}
      #settingsQuickSwitchGrid .toggle-switch span:not(.switch-slider){min-width:0!important;}

      .dashboard-color-switches{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:14px 64px!important;
        align-items:center!important;
        width:100%!important;
        box-sizing:border-box!important;
      }
      .dashboard-color-switches label.toggle-switch,
      #settingsMasterData .dashboard-color-switches label.toggle-switch,
      .settings-switch-row.dashboard-color-switches label.toggle-switch{
        min-width:0!important;
        width:100%!important;
        max-width:100%!important;
        margin:0!important;
        white-space:normal!important;
        overflow:visible!important;
        line-height:1.25!important;
        display:flex!important;
        align-items:center!important;
        gap:12px!important;
      }
      .dashboard-color-switches .switch-slider{flex:0 0 46px!important;}
      .dashboard-color-switches .toggle-switch span:not(.switch-slider){min-width:0!important;}

      @media(max-width:900px){
        #settingsQuickSwitchGrid,
        .dashboard-color-switches{grid-template-columns:1fr!important;gap:12px!important;}
        #settingsQuickSwitchGrid [data-switch-slot]{grid-column:1!important;grid-row:auto!important;}
      }
    `;
    document.head.appendChild(st);
  }

  function applyFixes(){
    addCss();
    setDashboardSymbolButtonText();
    setupDashboardTabSorting();
  }

  function wrapAfter(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn._phase9102Wrapped) return;
    window[name] = function(){
      const result = fn.apply(this, arguments);
      setTimeout(applyFixes, 0);
      return result;
    };
    window[name]._phase9102Wrapped = true;
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(applyFixes,0));
  setTimeout(applyFixes,50);
  setTimeout(applyFixes,300);
  ['renderDashboard','renderSettings','renderAll','showView','applySession'].forEach(wrapAfter);
})();

/* ===== 31_phase910_6_members_followup_fix.js ===== */
/* Phase 9.10.6 – Mitglieder-Nachkorrektur: Suchpfeil, Blättern nach Speichern, Dienstkleidung-Name, Ansprüche-Tabelle, Startanzeige */
(function(){
  'use strict';

  function safe(fn){ try{ return fn(); }catch(e){ console.warn('Phase 9.10.6:', e); } }
  function esc(v){ return (typeof escapeHtml==='function') ? escapeHtml(v||'') : String(v||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function fmtDate(v){ return (typeof formatDate==='function') ? formatDate(v) : (v||''); }
  function currentMember(){ return (state.members||[]).find(m=>String(m.id)===String(currentMemberId||'')) || null; }
  function displayName(m){ return `${m?.firstName||''} ${m?.lastName||''}`.trim() || m?.memberNo || '--'; }

  function setMemberSearchArrow(){
    const toggle=document.getElementById('memberSearchToggle');
    const panel=document.querySelector('.member-list.panel');
    if(!toggle || !panel) return;
    const collapsed=panel.classList.contains('member-search-collapsed') || document.body.classList.contains('member-search-panel-collapsed');
    /* Suchmaske sitzt rechts. Wenn eingeklappt, wird sie nach links wieder ausgeklappt. */
    toggle.textContent=collapsed ? '⫷' : '‹';
    toggle.title=collapsed ? 'Suchmaske ausklappen' : 'Suchmaske einklappen';
    toggle.classList.add('collapse-arrow-button');
  }

  function updateActiveMemberLabels(){
    const m=currentMember();
    const name=displayName(m);
    const targets=[
      'activeMemberNameMore',
      'activeMemberNameClaims',
      'activeMemberNameSkills',
      'activeMemberNameWorkwear'
    ];
    targets.forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.textContent='Aktuelles Mitglied: '+name;
    });
  }

  function yearsMonthsDays(member){
    const start=new Date(member?.joinedAt||'');
    if(Number.isNaN(start.getTime())) return {days:'',months:'',years:''};
    const end=member?.exitDate ? new Date(member.exitDate) : new Date();
    if(Number.isNaN(end.getTime()) || end<start) return {days:'',months:'',years:''};
    const days=Math.floor((end-start)/(1000*60*60*24));
    let months=(end.getFullYear()-start.getFullYear())*12 + (end.getMonth()-start.getMonth());
    if(end.getDate()<start.getDate()) months--;
    months=Math.max(0, months);
    return {days,months,years:Math.floor(months/12)};
  }

  function renderClaimsMembershipOverviewFixed(){
    const body=document.getElementById('claimsMembershipOverviewBody');
    if(!body || !Array.isArray(state.members)) return;
    const list=(typeof sortedMembers==='function') ? sortedMembers() : [...state.members];
    body.innerHTML=list.map(m=>{
      const d=yearsMonthsDays(m);
      const status=(typeof memberStatus==='function') ? memberStatus(m) : (m.memberType||'');
      return `<tr>
        <td>${esc(m.memberNo)}</td>
        <td>${esc(m.lastName)}</td>
        <td>${esc(m.firstName)}</td>
        <td>${esc(status)}</td>
        <td>${fmtDate(m.joinedAt)||''}</td>
        <td>${fmtDate(m.exitDate)||''}</td>
        <td>${d.days===''?'':esc(String(d.days))}</td>
        <td>${d.months===''?'':esc(String(d.months))}</td>
        <td>${d.years===''?'':esc(String(d.years))}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="9" class="muted">Keine Mitglieder vorhanden.</td></tr>`;
  }

  function ensureMemberSearchTableFilled(){
    if(!document.getElementById('membersTable')) return;
    safe(()=>renderMembers());
    /* Die Zaehlfelder gehoeren zur Liste. Wenn nur die Ersatzdarstellung greift, blieben sie
       sonst leer und im Kopf staende keine Mitgliederzahl. */
    safe(()=>{
      if(typeof getMemberStats!=='function') return;
      const st=getMemberStats();
      const setz=(id,wert)=>{ const el=document.getElementById(id); if(el && !el.value) el.value=String(wert); };
      setz('memberCountInfo',st.total); setz('memberCountActiveInfo',st.active);
      setz('memberCountPassiveInfo',st.passive); setz('memberCountExitedInfo',st.exited);
      setz('memberCountGuestInfo',st.guests); setz('memberCountPersonInfo',st.persons);
    });
    const body=document.getElementById('membersTable');
    if(body && !body.children.length && Array.isArray(state.members) && state.members.length){
      const rows=[...(state.members||[])].sort((a,b)=>String(a.memberNo||'').localeCompare(String(b.memberNo||''),'de',{numeric:true,sensitivity:'base'}));
      body.innerHTML=rows.map(m=>{
        const status=(typeof memberStatus==='function') ? memberStatus(m) : (m.memberType||'');
        const contact=String(m.mobile||m.phone||m.email||'').trim();
        /* Auch die Ersatzdarstellung braucht die Statusfarbe - sonst sieht ein Gast hier
           aus wie ein aktives Mitglied. */
        const farbe=(typeof window.memberRowClass==='function') ? window.memberRowClass(status) : '';
        return `<tr class="clickable ${farbe}" data-id="${esc(m.id)}">
          <td class="member-select-col"><input type="checkbox" class="member-row-select" data-id="${esc(m.id)}"></td>
          <td>${esc(m.memberNo)}</td><td>${esc((m.lastName||'')+', '+(m.firstName||''))}</td><td>${esc(status)}</td>
          <td class="member-extra member-extra-medium">${esc(m.city)}</td>
          <td class="member-extra member-extra-wide">${esc(m.profession)}</td>
          <td class="member-extra member-extra-wide">${esc(contact)}</td>
          <td class="member-extra member-extra-wide">${fmtDate(m.joinedAt)||''}</td>
        </tr>`;
      }).join('');
      body.querySelectorAll('tr[data-id]').forEach(tr=>tr.addEventListener('click',()=>{
        if(typeof confirmLeaveMember==='function' && !confirmLeaveMember()) return;
        const m=state.members.find(x=>String(x.id)===String(tr.dataset.id));
        if(m && typeof memberToForm==='function') memberToForm(m);
      }));
    }
    safe(()=>updateMemberSelectAllState((typeof sortedMembers==='function')?sortedMembers():state.members));
  }

  function navigateMemberFixed(position){
    if(!state.session?.isLoggedIn) return;
    if(typeof memberIsDirty==='function' && memberIsDirty()){
      const doSave=confirm('Möchten Sie die Änderungen speichern oder verwerfen?\n\nOK = speichern\nAbbrechen = verwerfen');
      if(doSave){
        if(typeof saveMember==='function' && !saveMember()) return;
      }else{
        if(typeof markMemberClean==='function') markMemberClean();
        if(typeof toast==='function') toast('Änderungen verworfen.','info');
      }
    }
    const list=(typeof sortedMembers==='function') ? sortedMembers() : [...(state.members||[])];
    if(!list.length){ if(typeof resetMemberForm==='function') resetMemberForm(); return; }
    let index=list.findIndex(m=>String(m.id)===String(currentMemberId||''));
    if(position==='first') index=0;
    else if(position==='last') index=list.length-1;
    else if(position==='next') index=index<0 ? 0 : Math.min(list.length-1,index+1);
    else if(position==='prev') index=index<0 ? 0 : Math.max(0,index-1);
    const m=list[index];
    if(m && typeof memberToForm==='function') memberToForm(m);
    setTimeout(()=>{ ensureMemberSearchTableFilled(); updateActiveMemberLabels(); renderClaimsMembershipOverviewFixed(); },0);
  }

  function bindMemberNavOverride(){
    [['firstMember','first'],['prevMember','prev'],['nextMember','next'],['lastMember','last']].forEach(([id,pos])=>{
      const btn=document.getElementById(id);
      if(!btn || btn.dataset.phase9106NavBound) return;
      btn.dataset.phase9106NavBound='1';
      btn.addEventListener('click',ev=>{
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        navigateMemberFixed(pos);
      }, true);
    });
  }

  function patchMemberFunctions(){
    if(typeof window.renderClaimsMembershipOverview==='function' && !window.renderClaimsMembershipOverview._phase9106){
      window.renderClaimsMembershipOverview=function(){ return renderClaimsMembershipOverviewFixed(); };
      window.renderClaimsMembershipOverview._phase9106=true;
    }
    if(typeof window.updateMemberDerived==='function' && !window.updateMemberDerived._phase9106){
      const old=window.updateMemberDerived;
      window.updateMemberDerived=function(){ const r=old.apply(this,arguments); updateActiveMemberLabels(); return r; };
      window.updateMemberDerived._phase9106=true;
    }
    if(typeof window.memberToForm==='function' && !window.memberToForm._phase9106){
      const old=window.memberToForm;
      window.memberToForm=function(m){ const r=old.apply(this,arguments); updateActiveMemberLabels(); renderClaimsMembershipOverviewFixed(); setTimeout(ensureMemberSearchTableFilled,0); return r; };
      window.memberToForm._phase9106=true;
    }
    if(typeof window.renderMembers==='function' && !window.renderMembers._phase9106){
      const old=window.renderMembers;
      window.renderMembers=function(){ const r=old.apply(this,arguments); updateActiveMemberLabels(); setMemberSearchArrow(); renderClaimsMembershipOverviewFixed(); return r; };
      window.renderMembers._phase9106=true;
    }
    /* Direkter Ersatz für den Blätterbefehl: nach OK/Speichern sofort weiterblättern. */
    window.navigateMember=navigateMemberFixed;
  }

  function bindTabRefresh(){
    document.querySelectorAll('[data-member-tab]').forEach(btn=>{
      if(btn.dataset.phase9106TabRefresh) return;
      btn.dataset.phase9106TabRefresh='1';
      btn.addEventListener('click',()=>setTimeout(()=>{
        updateActiveMemberLabels();
        renderClaimsMembershipOverviewFixed();
        ensureMemberSearchTableFilled();
      },0));
    });
  }

  function bindSearchToggleRefresh(){
    const toggle=document.getElementById('memberSearchToggle');
    if(toggle && !toggle.dataset.phase9106ArrowRefresh){
      toggle.dataset.phase9106ArrowRefresh='1';
      toggle.addEventListener('click',()=>setTimeout(setMemberSearchArrow,0),true);
    }
  }

  function run(){
    patchMemberFunctions();
    bindMemberNavOverride();
    bindTabRefresh();
    bindSearchToggleRefresh();
    setMemberSearchArrow();
    updateActiveMemberLabels();
    renderClaimsMembershipOverviewFixed();
    ensureMemberSearchTableFilled();
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(run,80));
  document.addEventListener('click',ev=>{
    if(ev.target.closest('#memberSearchToggle,[data-member-tab],#membersTable,#firstMember,#prevMember,#nextMember,#lastMember')){
      setTimeout(run,60);
    }
  }, true);
  window.addEventListener('load',()=>setTimeout(run,120));
})();

/* ===== 32_phase910_7_security_photo_fix.js ===== */
/* Phase 9.10.7: Erstanmelde-Code und Mitgliedsfoto */
(function(){
  'use strict';

  let pendingFirstLoginCode = '';
  let pendingFirstLoginCodeUntil = 0;
  let pendingFirstLoginCodeAttempts = 0;
  let memberPhotoData = '';

  function safeToast(message,type){
    if(typeof toast === 'function') toast(message,type||'info');
    else console.log(message);
  }

  function memberDisplayName(m){
    return `${m?.firstName||''} ${m?.lastName||''}`.trim() || m?.memberNo || 'Mitglied';
  }

  function generateFourDigitCode(){
    try{
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return String(a[0] % 10000).padStart(4,'0');
    }catch(err){
      return String(Math.floor(Math.random()*10000)).padStart(4,'0');
    }
  }

  function ensurePasswordVerificationUi(){
    const form = document.getElementById('passwordSetupForm');
    const firstPasswordLabel = document.getElementById('newUserPassword')?.closest('label');
    if(!form || !firstPasswordLabel || document.getElementById('firstLoginCode')) return;

    const box = document.createElement('div');
    box.className = 'first-login-code-box';
    box.innerHTML = `
      <div class="first-login-code-head">
        <strong>Sicherheitscode</strong>
        <span class="hint small">4-stellig, 10 Minuten gültig</span>
      </div>
      <p class="hint small">Vor der Passwortvergabe muss der Sicherheitscode eingegeben werden. In dieser lokalen Version wird der Code vorbereitet und angezeigt; echter SMS-/E-Mail-Versand benötigt später einen Serverdienst.</p>
      <div class="first-login-code-row">
        <label>Code eingeben<input id="firstLoginCode" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="0000"></label>
        <button id="firstLoginMailButton" class="secondary" type="button">E-Mail vorbereiten</button>
      </div>
      <div id="firstLoginCodeInfo" class="first-login-code-info"></div>
    `;
    form.insertBefore(box, firstPasswordLabel);

    document.getElementById('firstLoginMailButton')?.addEventListener('click',()=>{
      const mail = String(window.pendingPasswordSetupUser || '').trim();
      if(!mail || !pendingFirstLoginCode){ safeToast('Kein Sicherheitscode aktiv.','warn'); return; }
      const subject = encodeURIComponent('Sicherheitscode Köcheclub-Verwaltung');
      const body = encodeURIComponent(`Dein Sicherheitscode für die Erstanmeldung lautet: ${pendingFirstLoginCode}\n\nDer Code ist 10 Minuten gültig.`);
      window.location.href = `mailto:${mail}?subject=${subject}&body=${body}`;
    });
  }

  function setPasswordFieldsEnabled(enabled){
    ['newUserPassword','newUserPasswordRepeat','newUserMessageLevel'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.disabled = !enabled;
    });
  }

  function startFirstLoginVerification(userName){
    pendingFirstLoginCode = generateFourDigitCode();
    pendingFirstLoginCodeUntil = Date.now() + 10*60*1000;
    pendingFirstLoginCodeAttempts = 0;
    const input=document.getElementById('firstLoginCode');
    if(input) input.value='';
    const info=document.getElementById('firstLoginCodeInfo');
    if(info){
      info.innerHTML = `<span class="code-demo">Lokaler Sicherheitscode: <strong>${pendingFirstLoginCode}</strong></span><span class="hint small"> Später wird dieser Code automatisch per E-Mail/SMS versendet.</span>`;
    }
    setPasswordFieldsEnabled(true);
    try{ logAction('Sicherheit','Erstanmeldecode erzeugt',`Benutzer: ${userName}; gültig bis ${new Date(pendingFirstLoginCodeUntil).toLocaleTimeString('de-DE')}`); }catch(err){}
  }

  function verifyFirstLoginCode(){
    const entered = String(document.getElementById('firstLoginCode')?.value || '').trim();
    if(!pendingFirstLoginCode){ safeToast('Es wurde kein Sicherheitscode erzeugt.','error'); return false; }
    if(Date.now() > pendingFirstLoginCodeUntil){ safeToast('Der Sicherheitscode ist abgelaufen. Bitte Anmeldung erneut starten.','error'); return false; }
    pendingFirstLoginCodeAttempts += 1;
    if(pendingFirstLoginCodeAttempts > 5){ safeToast('Zu viele falsche Code-Eingaben. Bitte Anmeldung erneut starten.','error'); return false; }
    if(entered !== pendingFirstLoginCode){ safeToast('Sicherheitscode ist falsch.','error'); return false; }
    return true;
  }

  const oldOpenPasswordSetup = window.openPasswordSetup;
  window.openPasswordSetup = function(userName){
    if(typeof oldOpenPasswordSetup === 'function') oldOpenPasswordSetup.apply(this,arguments);
    setTimeout(()=>{
      ensurePasswordVerificationUi();
      startFirstLoginVerification(userName);
      document.getElementById('firstLoginCode')?.focus();
    },0);
  };

  const oldFinishPasswordSetup = window.finishPasswordSetup;
  window.finishPasswordSetup = function(password,repeat){
    if(!verifyFirstLoginCode()) return false;
    const ok = typeof oldFinishPasswordSetup === 'function' ? oldFinishPasswordSetup.apply(this,arguments) : false;
    if(ok){
      pendingFirstLoginCode='';
      pendingFirstLoginCodeUntil=0;
      pendingFirstLoginCodeAttempts=0;
      try{ logAction('Sicherheit','Erstanmeldecode bestätigt',`Benutzer: ${window.pendingPasswordSetupUser||''}`); }catch(err){}
    }
    return ok;
  };

  function ensureMemberPhotoUi(){
    const basic = document.getElementById('memberBasic');
    const formGrid = basic?.querySelector('.form-grid');
    if(!basic || !formGrid || document.getElementById('memberPhotoInput')) return;

    const box = document.createElement('div');
    box.className = 'member-photo-card';
    box.innerHTML = `
      <div class="member-photo-preview" id="memberPhotoPreview" aria-label="Mitgliedsfoto"><span>Kein Foto</span></div>
      <div class="member-photo-actions">
        <strong>Mitgliedsfoto</strong>
        <input id="memberPhotoInput" type="file" accept="image/*" hidden>
        <div class="button-row compact">
          <button id="memberPhotoChoose" class="secondary" type="button">Foto auswählen</button>
          <button id="memberPhotoDelete" class="secondary" type="button">Foto löschen</button>
        </div>
        <p class="hint small">Das Foto wird lokal im Browser gespeichert. Für sehr große Bilder wird automatisch eine kleinere Kopie verwendet.</p>
      </div>
    `;
    basic.insertBefore(box, formGrid);

    document.getElementById('memberPhotoChoose')?.addEventListener('click',()=>document.getElementById('memberPhotoInput')?.click());
    document.getElementById('memberPhotoDelete')?.addEventListener('click',()=>{
      memberPhotoData='';
      updateMemberPhotoPreview('');
      if(typeof markMemberClean === 'function'){
        // nicht clean setzen; Löschung ist eine Änderung. Snapshot unverändert lassen.
      }
      safeToast('Foto wurde zum Löschen vorgemerkt. Bitte Mitglied speichern.','info');
    });
    document.getElementById('memberPhotoInput')?.addEventListener('change',handleMemberPhotoSelected);
  }

  function updateMemberPhotoPreview(data){
    const preview=document.getElementById('memberPhotoPreview');
    if(!preview) return;
    if(data){
      preview.innerHTML = `<img src="${data}" alt="Mitgliedsfoto">`;
      preview.classList.add('has-photo');
    }else{
      preview.innerHTML = '<span>Kein Foto</span>';
      preview.classList.remove('has-photo');
    }
  }

  function handleMemberPhotoSelected(e){
    const file=e.target.files?.[0];
    if(!file) return;
    if(!file.type.startsWith('image/')){ safeToast('Bitte eine Bilddatei auswählen.','error'); return; }
    const reader=new FileReader();
    reader.onload=()=>resizeImageData(String(reader.result||''),480,480,0.76).then(data=>{
      memberPhotoData=data;
      updateMemberPhotoPreview(memberPhotoData);
      window.autoSaveCurrentMemberFromForm?.();
      safeToast('Foto übernommen und automatisch gespeichert.','success');
    }).catch(()=>{
      memberPhotoData=String(reader.result||'');
      updateMemberPhotoPreview(memberPhotoData);
      window.autoSaveCurrentMemberFromForm?.();
      safeToast('Foto übernommen und automatisch gespeichert.','success');
    });
    reader.readAsDataURL(file);
  }

  function resizeImageData(dataUrl,maxW,maxH,quality){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{
        let w=img.width, h=img.height;
        const ratio=Math.min(1,maxW/w,maxH/h);
        w=Math.round(w*ratio); h=Math.round(h*ratio);
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg',quality));
      };
      img.onerror=reject;
      img.src=dataUrl;
    });
  }

  window.KNGMemberPhoto={
    getData:()=>memberPhotoData||'',
    load:m=>{ memberPhotoData=m?.photoData||m?.photo||''; ensureMemberPhotoUi(); updateMemberPhotoPreview(memberPhotoData); },
    clear:()=>{ memberPhotoData=''; ensureMemberPhotoUi(); updateMemberPhotoPreview(''); }
  };

  const oldFormToMember = window.formToMember;
  window.formToMember = function(){
    const m = typeof oldFormToMember === 'function' ? oldFormToMember.apply(this,arguments) : {};
    m.photoData = memberPhotoData || '';
    return m;
  };

  const oldMemberToForm = window.memberToForm;
  window.memberToForm = function(m){
    const r = typeof oldMemberToForm === 'function' ? oldMemberToForm.apply(this,arguments) : undefined;
    memberPhotoData = m?.photoData || m?.photo || '';
    ensureMemberPhotoUi();
    updateMemberPhotoPreview(memberPhotoData);
    setActiveMemberPhotoNames(m);
    if(typeof markMemberClean === 'function') markMemberClean();
    return r;
  };

  const oldResetMemberForm = window.resetMemberForm;
  window.resetMemberForm = function(){
    const r = typeof oldResetMemberForm === 'function' ? oldResetMemberForm.apply(this,arguments) : undefined;
    memberPhotoData='';
    ensureMemberPhotoUi();
    updateMemberPhotoPreview('');
    if(typeof markMemberClean === 'function') markMemberClean();
    return r;
  };

  const oldMemberSignature = window.memberSignature;
  window.memberSignature = function(){
    let base = '';
    try{ base = typeof oldMemberSignature === 'function' ? oldMemberSignature.apply(this,arguments) : ''; }catch(err){ base=''; }
    return JSON.stringify({base,photoData:memberPhotoData||''});
  };

  function setActiveMemberPhotoNames(m){
    const name = memberDisplayName(m);
    ['activeMemberNameMore','activeMemberNameClaims','activeMemberNameSkills','activeMemberNameWorkwear'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.textContent = `Aktuelles Mitglied: ${name}`;
    });
  }

  function patchExistingMembersPhotoField(){
    if(!Array.isArray(state?.members)) return;
    state.members.forEach(m=>{
      if(typeof m.photoData === 'undefined') m.photoData = m.photo || '';
    });
  }

  function initPhase9107(){
    ensurePasswordVerificationUi();
    ensureMemberPhotoUi();
    patchExistingMembersPhotoField();
    const current = state?.members?.find?.(m=>m.id===window.currentMemberId) || null;
    if(current){
      memberPhotoData = current.photoData || current.photo || '';
      updateMemberPhotoPreview(memberPhotoData);
    }
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(initPhase9107,120));
  setTimeout(initPhase9107,300);
})();

/* ===== 34_phase910_9_security_search_ui_fix.js ===== */
/* Phase 9.10.9 – Sicherheit/Auto-Logout/Suchmaske
   - Auto-Logout-Anzeige tiefer im Benutzerfeld
   - Adminpasswort: Auge nur für Admin/Systeminhaber, Änderung nur Admin
   - Suchmaske: Einklapp-Pfeil nach links
   - Eingeklappte Suchmaske: 5 Aktionsicons untereinander sichtbar
*/
(function(){
  'use strict';

  function safe(fn){ try{ return fn(); }catch(err){ console.warn('Phase 9.10.9:', err); } }
  function adminLike(){ return safe(()=>typeof isAdminLike === 'function' && isAdminLike()) === true; }

  function injectCss(){
    if(document.getElementById('phase9109Style')) return;
    const style=document.createElement('style');
    style.id='phase9109Style';
    style.textContent=`
      /* Auto-Logout nicht mehr in gleicher Zeile wie lange Benutzernamen */
      .session-main{
        flex-direction:column!important;
        align-items:stretch!important;
        justify-content:flex-start!important;
        gap:5px!important;
      }
      .session-main .auto-logout-countdown{
        align-self:flex-end!important;
        margin-top:2px!important;
        max-width:100%!important;
      }

      /* Adminpasswort mit geschütztem Auge */
      .admin-password-field{
        position:relative!important;
      }
      .admin-password-control{
        display:flex!important;
        align-items:center!important;
        gap:8px!important;
      }
      .admin-password-control input{
        flex:1 1 auto!important;
        min-width:0!important;
      }
      .admin-password-eye{
        width:36px!important;
        min-width:36px!important;
        height:34px!important;
        padding:0!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        border-radius:10px!important;
      }
      .admin-password-field.locked .admin-password-control input{
        background:#f3f4f6!important;
        color:#6b7280!important;
      }

      /* Suchmaske eingeklappt: Funktionsicons bleiben untereinander nutzbar */
      .member-list.member-search-collapsed{
        width:62px!important;
        min-width:62px!important;
        padding:8px 6px!important;
        overflow:visible!important;
      }
      body.member-search-panel-collapsed .member-layout{
        grid-template-columns:minmax(520px,1fr) 6px 62px!important;
      }
      .member-list.member-search-collapsed .member-bulk-icons{
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:7px!important;
        width:auto!important;
        margin:6px 0 0 0!important;
        order:3!important;
      }
      .member-list.member-search-collapsed .member-bulk-icons .icon-button{
        width:34px!important;
        height:34px!important;
        min-width:34px!important;
        padding:0!important;
      }
      .member-list.member-search-collapsed .member-search-window-tools{
        order:1!important;
        flex-direction:column!important;
        align-items:center!important;
        gap:7px!important;
        margin:0!important;
      }
      .member-list.member-search-collapsed .member-list-title-row{
        flex-direction:column!important;
        align-items:center!important;
        gap:4px!important;
      }
      .member-list.member-search-collapsed .member-list-title-row h4{
        order:2!important;
        writing-mode:vertical-rl!important;
        transform:rotate(180deg)!important;
        font-size:.78rem!important;
        margin:4px 0!important;
      }
      .member-list.member-search-collapsed .search-clear-wrap,
      .member-list.member-search-collapsed .member-select-all-row,
      .member-list.member-search-collapsed table,
      .member-list.member-search-collapsed .member-search-legend{
        display:none!important;
      }
      @media(max-width:900px){
        .member-list.member-search-collapsed{width:auto!important;min-width:0!important;overflow:hidden!important;}
        body.member-search-panel-collapsed .member-layout{grid-template-columns:1fr!important;}
        .member-list.member-search-collapsed .member-list-title-row h4{writing-mode:horizontal-tb!important;transform:none!important;}
        .member-list.member-search-collapsed .member-bulk-icons{flex-direction:row!important;flex-wrap:wrap!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function updateMemberSearchArrow(){
    const toggle=document.getElementById('memberSearchToggle');
    const panel=document.querySelector('.member-list.panel');
    if(!toggle || !panel) return;
    const collapsed=panel.classList.contains('member-search-collapsed') || document.body.classList.contains('member-search-panel-collapsed');
    // Suchmaske liegt rechts: Zum Einklappen nach links zeigen, zum Ausklappen ebenfalls nach links herausziehen.
    toggle.textContent = collapsed ? '⫷' : '‹';
    toggle.title = collapsed ? 'Suchmaske nach links ausklappen' : 'Suchmaske nach links einklappen';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.classList.add('collapse-arrow-button');
  }

  function installSearchArrowHooks(){
    const toggle=document.getElementById('memberSearchToggle');
    if(toggle && !toggle.dataset.phase9109Bound){
      toggle.dataset.phase9109Bound='1';
      toggle.addEventListener('click',()=>setTimeout(updateMemberSearchArrow,0),true);
    }
    const panel=document.querySelector('.member-list.panel');
    if(panel && !panel.dataset.phase9109Observed){
      panel.dataset.phase9109Observed='1';
      const obs=new MutationObserver(()=>updateMemberSearchArrow());
      obs.observe(panel,{attributes:true,attributeFilter:['class']});
      const bodyObs=new MutationObserver(()=>updateMemberSearchArrow());
      bodyObs.observe(document.body,{attributes:true,attributeFilter:['class']});
    }
    updateMemberSearchArrow();
  }

  function ensureAdminPasswordEye(){
    const input=document.getElementById('adminPassword');
    if(!input) return;
    const label=input.closest('label');
    if(!label) return;
    label.classList.add('admin-password-field');

    let control=label.querySelector('.admin-password-control');
    if(!control){
      control=document.createElement('div');
      control.className='admin-password-control';
      input.insertAdjacentElement('beforebegin',control);
      control.appendChild(input);
    }

    let eye=document.getElementById('adminPasswordEye');
    if(!eye){
      eye=document.createElement('button');
      eye.id='adminPasswordEye';
      eye.type='button';
      eye.className='secondary admin-password-eye';
      eye.textContent='👁️';
      eye.title='Adminpasswort anzeigen';
      eye.setAttribute('aria-label','Adminpasswort anzeigen');
      control.appendChild(eye);
    }

    const allowed=adminLike();
    label.classList.toggle('locked',!allowed);
    eye.hidden=!allowed;
    input.readOnly=!allowed;
    input.autocomplete='new-password';

    if(!allowed){
      input.type='password';
      input.value='********';
      input.title='Nur Admin/Systeminhaber darf das Adminpasswort anzeigen oder ändern.';
    }else{
      input.title='Adminpasswort';
      const real=String(state?.settings?.adminPassword || 'admin123');
      if(input.value==='********') input.value=real;
    }

    if(!eye.dataset.phase9109Bound){
      eye.dataset.phase9109Bound='1';
      eye.addEventListener('click',()=>{
        if(!adminLike()){
          safe(()=>toast('Nur Admin/Systeminhaber darf das Adminpasswort anzeigen.','error'));
          return;
        }
        const show=input.type==='password';
        input.type=show?'text':'password';
        eye.textContent=show?'🙈':'👁️';
        eye.title=show?'Adminpasswort ausblenden':'Adminpasswort anzeigen';
        eye.setAttribute('aria-label',eye.title);
      });
    }
  }

  function installAdminPasswordHooks(){
    const oldRender=window.renderSettings;
    if(typeof oldRender==='function' && !oldRender.__phase9109Wrapped){
      const wrapped=function(){
        const result=oldRender.apply(this,arguments);
        setTimeout(ensureAdminPasswordEye,0);
        return result;
      };
      wrapped.__phase9109Wrapped=true;
      window.renderSettings=wrapped;
    }

    const oldSave=window.saveSettings;
    if(typeof oldSave==='function' && !oldSave.__phase9109Wrapped){
      const wrapped=function(){
        if(!adminLike()){
          const input=document.getElementById('adminPassword');
          if(input) input.value=String(state?.settings?.adminPassword || 'admin123');
        }
        return oldSave.apply(this,arguments);
      };
      wrapped.__phase9109Wrapped=true;
      window.saveSettings=wrapped;
    }

    ensureAdminPasswordEye();
  }

  function refreshAll(){
    injectCss();
    installSearchArrowHooks();
    installAdminPasswordHooks();
    setTimeout(()=>{ updateMemberSearchArrow(); ensureAdminPasswordEye(); },50);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refreshAll);
  }else{
    refreshAll();
  }

  window.KC_Phase9109Refresh = refreshAll;
})();

/* ===== 59_phase910_37_final_member_inventory_assistant_fix.js ===== */
/* Phase 9.10.37 – Suchmaskenpfeil, Clubzugehörigkeit, Inventar-Hamburger, Zauberstab */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const toast=(m,t='info')=>{ try{ if(typeof window.toast==='function') window.toast(m,t); }catch(_){} };

  function addCss(){
    if($('#kng937Css')) return;
    const st=document.createElement('style'); st.id='kng937Css';
    st.textContent=`
      #memberSearchToggle.kng937-small{font-size:1.05rem!important;font-weight:900!important;line-height:1!important;}
      #memberSearchToggle.kng937-big{font-size:1.45rem!important;font-weight:900!important;line-height:1!important;}
      #topAssistantMagic936 svg,#topAssistantMagic935 svg,.kng937-wand svg{width:22px!important;height:22px!important;display:block!important;}
      #topAssistantMagic936 .magic-wand-icon,#topAssistantMagic935 .magic-wand-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;}
      .kng937-inventory-menu{position:fixed;z-index:99999;display:none;min-width:260px;background:#fff;color:#1f2e23;border:1px solid #dce8dc;border-radius:0 12px 12px 12px;box-shadow:0 14px 34px rgba(0,0,0,.16);padding:10px 0;}
      .kng937-inventory-menu.open{display:block!important;}
      .kng937-inventory-menu button{display:block;width:100%;border:0;background:transparent;color:#1f2e23;text-align:left;padding:10px 16px;font-size:14px;font-weight:600;border-radius:0;cursor:pointer;}
      .kng937-inventory-menu button:hover{background:#eef6ef;}
      #inventoryV2 .tab .kng934-inv-menu,#inventory .tab .kng934-inv-menu{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:24px!important;height:24px!important;min-width:24px!important;margin-right:8px!important;border-radius:8px!important;background:rgba(255,255,255,.22)!important;border:1px solid rgba(255,255,255,.28)!important;font-weight:900!important;line-height:1!important;}
      #inventoryV2 .tab:not(.active) .kng934-inv-menu,#inventory .tab:not(.active) .kng934-inv-menu{background:#eef6ef!important;border-color:#dce8dc!important;color:#2b6741!important;}
    `;
    document.head.appendChild(st);
  }

  function wandSvg(){
    return `<span class="kng937-wand" aria-hidden="true"><svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M4 20L17.5 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M15.6 4.2l4.2 4.2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M18 2.4v2.4M21.6 6h-2.4M14.4 3.6l-1.7-1.7M21.9 10.3l-1.7-1.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6.2" cy="17.8" r="1.2" fill="currentColor"/></svg></span>`;
  }
  function ensureAssistantIcon(){
    ['#topAssistantMagic936','#topAssistantMagic935','#navAssistantWizard'].forEach(sel=>{
      const b=$(sel); if(!b) return;
      b.innerHTML=wandSvg(); b.title='Vereins-Assistent'; b.setAttribute('aria-label','Vereins-Assistent');
    });
  }

  function memberSearchPanel(){ return $('.member-list') || $('.member-search-panel') || $('#memberSearchPanel'); }
  function isSearchCollapsed(){
    const p=memberSearchPanel();
    return !!(p && (p.classList.contains('member-search-collapsed') || p.classList.contains('collapsed') || document.body.classList.contains('member-search-panel-collapsed') || document.body.classList.contains('member-search-collapsed')));
  }
  function setSearchArrow(){
    const b=$('#memberSearchToggle'); if(!b) return;
    const collapsed=isSearchCollapsed();
    b.textContent=collapsed?'≪':'›';
    b.classList.toggle('kng937-big',collapsed);
    b.classList.toggle('kng937-small',!collapsed);
    b.classList.remove('kng936-big-arrow','kng936-small-arrow');
    b.title=collapsed?'Suchmaske ausklappen':'Suchmaske einklappen';
    b.setAttribute('aria-expanded',String(!collapsed));
  }
  function bindSearchArrow(){
    const b=$('#memberSearchToggle'); if(!b) return;
    if(b.dataset.kng937Bound!=='1'){
      b.dataset.kng937Bound='1';
      b.addEventListener('click',()=>{ setTimeout(setSearchArrow,0); setTimeout(setSearchArrow,30); setTimeout(setSearchArrow,120); },true);
    }
    const p=memberSearchPanel();
    if(p && p.dataset.kng937Obs!=='1'){
      p.dataset.kng937Obs='1';
      new MutationObserver(setSearchArrow).observe(p,{attributes:true,attributeFilter:['class','style']});
    }
    if(document.body.dataset.kng937Obs!=='1'){
      document.body.dataset.kng937Obs='1';
      new MutationObserver(setSearchArrow).observe(document.body,{attributes:true,attributeFilter:['class']});
    }
    setSearchArrow();
  }

  function fmtDate(v){
    if(!v) return '';
    try{
      if(typeof window.formatDate==='function') return window.formatDate(v);
      const d=new Date(v); if(isNaN(d)) return esc(v);
      return d.toLocaleDateString('de-DE');
    }catch(_){ return esc(v); }
  }
  function statusOf(m){
    try{ if(typeof window.memberStatus==='function') return window.memberStatus(m); }catch(_){}
    if(m?.exitDate) return 'Ausgetreten';
    return m?.active===false?'Inaktiv':'Aktiv';
  }
  function duration(member){
    const start=new Date(member?.joinedAt||member?.entryDate||'');
    if(isNaN(start)) return {days:'',months:'',years:''};
    const end=member?.exitDate ? new Date(member.exitDate) : new Date();
    if(isNaN(end)||end<start) return {days:'',months:'',years:''};
    const days=Math.floor((end-start)/86400000);
    let months=(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
    if(end.getDate()<start.getDate()) months--;
    months=Math.max(0,months);
    return {days,months,years:Math.floor(months/12)};
  }
  function sortedMembersSafe(){
    try{ if(typeof window.sortedMembers==='function') return window.sortedMembers(); }catch(_){}
    const arr=(window.state&&Array.isArray(state.members))?state.members:[];
    return arr.slice().sort((a,b)=>String(a.memberNo||'').localeCompare(String(b.memberNo||''),'de',{numeric:true}));
  }
  function renderClubMembershipOverview(){
    const body=$('#claimsMembershipOverviewBody'); if(!body) return;
    const rows=sortedMembersSafe();
    body.innerHTML=rows.length?rows.map(m=>{
      const d=duration(m);
      return `<tr><td>${esc(m.memberNo||'')}</td><td>${esc(m.lastName||'')}</td><td>${esc(m.firstName||'')}</td><td>${esc(statusOf(m))}</td><td>${fmtDate(m.joinedAt||m.entryDate)}</td><td>${fmtDate(m.exitDate)}</td><td>${esc(d.days)}</td><td>${esc(d.months)}</td><td>${esc(d.years)}</td></tr>`;
    }).join(''):`<tr><td colspan="9" class="muted">Keine Mitglieder vorhanden.</td></tr>`;
    const details=body.closest('details'); if(details) details.open=true;
  }

  function invMenu(){
    let m=$('#kng937InventoryMenu');
    if(m) return m;
    m=document.createElement('div'); m.id='kng937InventoryMenu'; m.className='kng937-inventory-menu';
    m.innerHTML=`<button data-act="print">Drucken</button><button data-act="pdf">PDF exportieren</button><button data-act="csv">CSV exportieren</button><button data-act="copy">Kopieren</button><button data-act="refresh">Aktualisieren</button><button data-act="reset">Filter zurücksetzen</button><button data-act="columns">Spalten anzeigen</button><button data-act="help">Hilfe anzeigen</button>`;
    document.body.appendChild(m);
    m.addEventListener('click',ev=>{
      const b=ev.target.closest('button[data-act]'); if(!b) return;
      ev.preventDefault(); ev.stopPropagation();
      const act=b.dataset.act; m.classList.remove('open');
      if(act==='print'||act==='pdf'){ window.print(); return; }
      if(act==='csv'){
        try{ const rows=$$('#inv934Table tr,#inventoryTable tr').map(tr=>$$('td,th',tr).map(td=>'"'+td.innerText.replace(/"/g,'""')+'"').join(';')).join('\n'); const blob=new Blob([rows],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='inventar.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800); }catch(_){ toast('CSV-Export nicht möglich.','warn'); }
        return;
      }
      if(act==='copy'){ navigator.clipboard?.writeText(($('#inventoryV2')||$('#inventory')||document.body).innerText||'').then(()=>toast('Inventar kopiert.','success')).catch(()=>toast('Kopieren nicht möglich.','warn')); return; }
      if(act==='refresh'){ try{ if(typeof window.renderInventory934==='function') window.renderInventory934(); }catch(_){} try{ if(typeof window.renderInvTable==='function') window.renderInvTable(); }catch(_){} toast('Inventar aktualisiert.'); return; }
      if(act==='reset'){ $('#inv934ResetFilter')?.click(); $('#invFilterText') && ($('#invFilterText').value=''); toast('Filter zurückgesetzt.'); return; }
      toast(act==='help'?'Inventar: Artikelkarte pflegt einzelne Güter; Filter/Liste zeigt Auswertung, Druck und Export.':'Funktion vorgemerkt.');
    });
    return m;
  }
  function openInvMenu(trigger){
    $$('#kngInventoryContextMenu931,#kngInventoryContextMenu932,#kng934InventoryMenu,.inventory-menu-panel930,.inventory-tab-menu929 .menu-panel').forEach(x=>x.classList.remove('open'));
    const m=invMenu();
    const r=trigger.getBoundingClientRect();
    m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-280))+'px';
    m.style.top=(r.bottom+4)+'px';
    m.classList.add('open');
  }
  function bindInventoryHamburgers(){
    document.addEventListener('click',ev=>{
      const trg=ev.target.closest('#inventoryV2 .kng934-inv-menu,#inventory .kng934-inv-menu,.kng934-inv-menu');
      if(!trg){ if(!ev.target.closest('#kng937InventoryMenu')) invMenu().classList.remove('open'); return; }
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      openInvMenu(trg);
    },true);
  }

  function init(){
    addCss();
    ensureAssistantIcon();
    bindSearchArrow();
    renderClubMembershipOverview();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('load',()=>setTimeout(init,150));
  bindInventoryHamburgers();
  document.addEventListener('click',()=>setTimeout(()=>{ensureAssistantIcon();bindSearchArrow();renderClubMembershipOverview();},80),true);
  document.addEventListener('change',()=>setTimeout(renderClubMembershipOverview,80),true);
  window.KNG937={renderClubMembershipOverview,setSearchArrow,ensureAssistantIcon};
})();

/* ===== 61_phase910_39_address_claims_fix.js ===== */
/* Phase 9.10.39 – Adressverwaltung sichtbar + Icon-Schalter + Clubzugehörigkeit einklappbar */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const saveSafe=()=>{try{ if(typeof window.saveState==='function') window.saveState(); else localStorage.setItem('kngState',JSON.stringify(window.state||{})); }catch(_){}};
  const toastSafe=(m,t='info')=>{try{ if(typeof window.toast==='function') window.toast(m,t); }catch(_){}};

  const ADDRESS_ICON={key:'addresses',title:'Adressverwaltung',icon:'📇',view:'addresses'};

  function ensureState(){
    window.state=window.state||{}; state.settings=state.settings||{}; state.combos=state.combos||{};
    if(!Array.isArray(state.settings.navIcons)) state.settings.navIcons=[];
    if(!state.settings.navIcons.includes('addresses')) state.settings.navIcons.push('addresses');
    if(!state.settings.navIcons.includes('logout')) state.settings.navIcons.push('logout');
    if(!Array.isArray(state.combos.addressCategories) || !state.combos.addressCategories.length){
      state.combos.addressCategories=['','Lieferant','Mitarbeiter','Spender','Sponsor','Stadtmarketing','Presse','Behörde','Verein','Partner','Sonstiges'];
    }
  }

  function ensureCss(){
    if($('#kng939Css')) return;
    const st=document.createElement('style'); st.id='kng939Css';
    st.textContent=`
      .quick-icons button[data-view="addresses"]{width:36px!important;height:36px!important;min-width:36px!important;max-width:36px!important;flex:0 0 36px!important;padding:0!important;margin:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:10px!important;font-size:17px!important;line-height:1!important;order:7!important;}
      body.sidebar-collapsed .quick-icons button[data-view="addresses"]{width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;flex-basis:42px!important;}
      .membership-claims-overview summary{cursor:pointer;user-select:none;}
      .nav-icon-option[data-kng-address-setting="1"] span{display:inline-flex;min-width:1.4em;justify-content:center;}
    `;
    document.head.appendChild(st);
  }

  function ensureAddressViewExists(){
    if($('#addresses')) return true;
    try{ if(window.KNG938 && typeof window.KNG938.bindAddress==='function') window.KNG938.bindAddress(); }catch(_){ }
    return !!$('#addresses');
  }

  function openAddresses(){
    ensureAddressViewExists();
    if(!$('#addresses')){ toastSafe('Adressverwaltung konnte nicht geladen werden.','error'); return false; }
    try{
      if(typeof window.showView==='function'){
        const r=window.showView('addresses');
        setTimeout(()=>{ try{ window.KNG938?.bindAddress?.(); }catch(_){} },30);
        return r;
      }
    }catch(e){ console.warn(e); }
    $$('.view').forEach(v=>v.classList.toggle('active',v.id==='addresses'));
    setTimeout(()=>{ try{ window.KNG938?.bindAddress?.(); }catch(_){} },30);
    return true;
  }

  function ensureAddressIcon(){
    ensureState();
    const quick=$('.quick-icons'); if(!quick) return;
    const enabled=(state.settings.navIcons||[]).includes('addresses');
    let btn=quick.querySelector('button[data-view="addresses"]');
    if(!enabled){ btn?.remove(); return; }
    if(!btn){
      btn=document.createElement('button');
      btn.type='button'; btn.dataset.view='addresses'; btn.title=ADDRESS_ICON.title; btn.textContent=ADDRESS_ICON.icon;
      const logout=quick.querySelector('[data-kng-icon-key="logout"],[data-action="logout"]');
      if(logout) quick.insertBefore(btn,logout); else quick.appendChild(btn);
    }else{
      btn.textContent=ADDRESS_ICON.icon; btn.title=ADDRESS_ICON.title;
    }
  }

  function patchAddressQuickClick(){
    if(document.__kng939AddressClick) return; document.__kng939AddressClick=true;
    document.addEventListener('click',ev=>{
      const btn=ev.target.closest('button[data-view="addresses"],.nav-address-main[data-view="addresses"]');
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      openAddresses();
    },true);
  }

  function patchShowView(){
    if(!window.showView || window.showView.__kng939Address) return;
    const old=window.showView;
    window.showView=function(id){
      if(id==='addresses') ensureAddressViewExists();
      const r=old.apply(this,arguments);
      if(id==='addresses') setTimeout(()=>{ try{ window.KNG938?.bindAddress?.(); }catch(_){} },30);
      setTimeout(()=>{ ensureAddressIcon(); patchAddressIconSetting(); },0);
      return r;
    };
    window.showView.__kng939Address=true;
  }

  function patchAddressIconSetting(){
    ensureState();
    const box=$('#navIconSettings'); if(!box) return;
    let label=box.querySelector('[data-kng-address-setting="1"]');
    if(!label){
      label=document.createElement('label');
      label.className='nav-icon-option';
      label.dataset.kngAddressSetting='1';
      label.innerHTML=`<input type="checkbox" data-nav-icon="addresses"> <span>${esc(ADDRESS_ICON.icon)}</span> ${esc(ADDRESS_ICON.title)}`;
      const logout=box.querySelector('input[data-nav-icon="logout"]')?.closest('label');
      if(logout) box.insertBefore(label,logout); else box.appendChild(label);
    }
    const cb=label.querySelector('input[data-nav-icon="addresses"]');
    cb.checked=(state.settings.navIcons||[]).includes('addresses');
    if(!cb.dataset.kng939Bound){
      cb.dataset.kng939Bound='1';
      cb.addEventListener('change',()=>{
        const set=new Set(state.settings.navIcons||[]);
        if(cb.checked) set.add('addresses'); else set.delete('addresses');
        set.add('logout');
        state.settings.navIcons=Array.from(set);
        saveSafe(); ensureAddressIcon();
      });
    }
  }

  function patchSettingsRender(){
    ['renderSettings','renderAll'].forEach(name=>{
      const fn=window[name];
      if(typeof fn==='function' && !fn.__kng939AddressSettings){
        window[name]=function(){ const r=fn.apply(this,arguments); setTimeout(()=>{ patchAddressIconSetting(); ensureAddressIcon(); },30); return r; };
        window[name].__kng939AddressSettings=true;
      }
    });
  }

  function fixClubMembershipDetails(){
    const details=$('.membership-claims-overview'); if(!details) return;
    const summary=details.querySelector('summary'); if(!summary) return;
    if(details.dataset.kng939Fixed) return;
    details.dataset.kng939Fixed='1';
    let wanted=details.open;
    summary.addEventListener('click',ev=>{
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      wanted=!details.open;
      details.open=wanted;
      details.dataset.kng939Wanted=wanted?'1':'0';
    },true);
    const restore=()=>{
      if(details.dataset.kng939Wanted==='0') details.open=false;
      if(details.dataset.kng939Wanted==='1') details.open=true;
    };
    ['click','input','change'].forEach(evt=>document.addEventListener(evt,()=>setTimeout(restore,80),true));
    const obs=new MutationObserver(()=>restore());
    obs.observe(details,{attributes:true,attributeFilter:['open','class','style'],subtree:false});
  }

  function run(){
    ensureState(); ensureCss(); ensureAddressViewExists(); ensureAddressIcon(); patchAddressQuickClick(); patchShowView(); patchSettingsRender(); patchAddressIconSetting(); fixClubMembershipDetails();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  window.addEventListener('load',()=>setTimeout(run,100));
  setTimeout(run,500);
  window.KNG939={run,openAddresses,ensureAddressIcon,patchAddressIconSetting,fixClubMembershipDetails};
})();

/* ===== 62_phase910_40_freeze_address_claims_fix.js ===== */
/* Phase 9.10.40 – Freeze-Fix Clubzugehörigkeit + robuste Adressverwaltung
   Ziel: keine Endlosschleifen/Blockaden mehr, Adressverwaltung vor showView sicher erzeugen. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toastSafe=(m,t='info')=>{try{ if(typeof window.toast==='function') window.toast(m,t); }catch(_){} };
  const saveSafe=()=>{try{ if(typeof window.saveState==='function') window.saveState(); }catch(_){} };

  function ensureState(){
    window.state=window.state||{};
    state.settings=state.settings||{};
    state.combos=state.combos||{};
    if(!Array.isArray(state.addresses)) state.addresses=[];
    if(!Array.isArray(state.settings.navIcons)) state.settings.navIcons=[];
    if(!state.settings.navIcons.includes('addresses')) state.settings.navIcons.push('addresses');
    if(!state.settings.navIcons.includes('logout')) state.settings.navIcons.push('logout');
    if(!Array.isArray(state.combos.addressCategories) || !state.combos.addressCategories.length){
      state.combos.addressCategories=['','Lieferant','Mitarbeiter','Spender','Sponsor','Stadtmarketing','Presse','Behörde','Verein','Partner','Sonstiges'];
    }
    if(!Array.isArray(state.combos.addressStatus) || !state.combos.addressStatus.length){
      state.combos.addressStatus=['','Aktiv','Inaktiv','Gesperrt','Archiv'];
    }
  }

  function injectCss(){
    if($('#kng940Css')) return;
    const st=document.createElement('style');
    st.id='kng940Css';
    st.textContent=`
      .membership-claims-overview summary{cursor:pointer;user-select:none;}
      .quick-icons button[data-view="addresses"]{display:inline-flex!important;align-items:center!important;justify-content:center!important;}
      #addresses .address-layout{display:grid;grid-template-columns:minmax(285px,360px) 1fr;gap:1rem;align-items:start;}
      #addresses .address-search-grid,#addresses .address-form-grid{display:grid;gap:.55rem .8rem;}
      #addresses .address-form-grid{grid-template-columns:repeat(2,minmax(150px,1fr));}
      #addresses label{font-weight:700;display:flex;flex-direction:column;gap:.22rem;}
      #addresses .address-tab:not(.active){display:none;}
      #addresses .address-actions-icons{display:flex;gap:.45rem;flex-wrap:wrap;margin:.55rem 0;}
      #addresses .address-filter-row{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:.5rem;margin-bottom:.6rem;}
      .data-table tr.current{outline:2px solid rgba(39,105,74,.55);background:#eef7f0;}
    `;
    document.head.appendChild(st);
  }

  function addressViewMarkup(){
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
          <div class="table-wrap"><table class="data-table address-table"><thead><tr><th>Name/Firma</th><th>Kategorie</th><th>Ort</th></tr></thead><tbody id="addrSearchTable"></tbody></table></div>
        </aside>
        <section class="panel">
          <div class="tabs">
            <button class="tab active" data-address-tab="addrBasic" type="button">Grunddaten</button>
            <button class="tab" data-address-tab="addrContact" type="button">Kommunikation</button>
            <button class="tab" data-address-tab="addrList" type="button">Filter / Liste / Druck</button>
            <button class="tab" data-address-tab="addrNotes" type="button">Notizen</button>
          </div>
          <form id="addressForm" autocomplete="off">
            <div id="addrBasic" class="member-tab address-tab active"><div class="address-form-grid">
              <label>Adress-Nr.<input id="addrNo" readonly></label><label>Anrede<input id="addrSalutation" list="addrSalutationList"></label>
              <label>Name<input id="addrLastName"></label><label>Vorname<input id="addrFirstName"></label>
              <label>Firma<input id="addrCompany"></label><label>Ansprechpartner<input id="addrContactPerson"></label>
              <label>Kategorie<input id="addrCategory" list="addrCategoryList"></label><label>Status<input id="addrStatus" list="addrStatusList"></label>
              <label>Straße<input id="addrStreet"></label><label>PLZ<input id="addrZip"></label>
              <label>Ort<input id="addrCity" list="addrCityList"></label><label>Land<input id="addrCountry" value="Deutschland"></label>
            </div></div>
            <div id="addrContact" class="member-tab address-tab"><div class="address-form-grid">
              <label>Telefon 1<input id="addrPhone1"></label><label>Telefon 2<input id="addrPhone2"></label>
              <label>Fax<input id="addrFax"></label><label>Internetseite<input id="addrWebsite" placeholder="https://..."></label>
              <label>E-Mail 1<input id="addrEmail1" type="email"></label><label>E-Mail 2<input id="addrEmail2" type="email"></label>
            </div></div>
            <div id="addrList" class="member-tab address-tab"><div class="address-filter-row">
              <label>Text<input id="addrListText" placeholder="Suchen..."></label><label>Kategorie<select id="addrListCategory"></select></label>
              <label>Status<select id="addrListStatus"></select></label><label>Ort<input id="addrListCity" list="addrCityList" placeholder="Alle"></label>
            </div><div class="button-row"><button id="addrPrintList" class="secondary" type="button">Liste drucken</button><button id="addrMailFiltered" class="secondary" type="button">E-Mail an gefilterte Auswahl</button><button id="addrResetList" class="secondary" type="button">Filter zurücksetzen</button></div>
            <div class="table-wrap"><table class="data-table address-table"><thead><tr><th>Nr.</th><th>Name</th><th>Vorname</th><th>Firma</th><th>Kategorie</th><th>Telefon</th><th>E-Mail</th><th>Ort</th><th>Status</th></tr></thead><tbody id="addrListTable"></tbody></table></div></div>
            <div id="addrNotes" class="member-tab address-tab"><label>Bemerkungen<textarea id="addrNotesText" rows="8"></textarea></label></div>
          </form>
          <datalist id="addrCategoryList"></datalist><datalist id="addrStatusList"></datalist><datalist id="addrCityList"></datalist><datalist id="addrSalutationList"></datalist>
          <div class="button-row address-nav-actions">
            <button id="addrNew" class="secondary" type="button">Neu</button><button id="addrSave" class="primary" type="button">Speichern</button><button id="addrDelete" class="danger" type="button">Löschen</button>
            <button id="addrFirst" class="secondary member-nav-icon" type="button" title="Erster">⏮</button><button id="addrPrev" class="secondary member-nav-icon" type="button" title="Vorheriger">◀</button><button id="addrNext" class="secondary member-nav-icon" type="button" title="Nächster">▶</button><button id="addrLast" class="secondary member-nav-icon" type="button" title="Letzter">⏭</button>
            <button id="addrPrint" class="secondary" type="button">Drucken</button><button id="addrEmail" class="secondary" type="button">E-Mail</button>
          </div>
        </section>
      </div>
      <dialog id="addressEmailDialog" class="wide-dialog"><h3>E-Mail vorbereiten</h3><div class="address-email-box"><label>Empfänger<input id="addrEmailTo"></label><label>Betreff<input id="addrEmailSubject" value="Nachricht vom Köcheclub"></label><label>Text<textarea id="addrEmailBody">Guten Tag,\n\n</textarea></label></div><div class="button-row"><button id="addrSendMailto" class="primary" type="button">E-Mail-Programm öffnen</button><form method="dialog"><button class="secondary">Schließen</button></form></div></dialog>
    </section>`;
  }

  function ensureAddressView(){
    if($('#addresses')) return true;
    const main=$('main.app')||$('main')||document.body;
    const tmp=document.createElement('template');
    tmp.innerHTML=addressViewMarkup().trim();
    main.appendChild(tmp.content.firstElementChild);
    return !!$('#addresses');
  }

  function ensureAddressIcon(){
    ensureState();
    const quick=$('.quick-icons'); if(!quick) return;
    let btn=quick.querySelector('button[data-view="addresses"]');
    const enabled=(state.settings.navIcons||[]).includes('addresses');
    if(!enabled){btn?.remove(); return;}
    if(!btn){
      btn=document.createElement('button');
      btn.type='button'; btn.dataset.view='addresses'; btn.title='Adressverwaltung'; btn.textContent='📇';
      const logout=quick.querySelector('[data-kng-icon-key="logout"],[data-action="logout"]');
      if(logout) quick.insertBefore(btn,logout); else quick.appendChild(btn);
    }
    btn.textContent='📇'; btn.title='Adressverwaltung';
  }

  function bindAddressSafely(){
    ensureAddressView();
    try{ window.KNG938?.bindAddress?.(); }catch(e){ console.warn('KNG938.bindAddress Fehler abgefangen',e); }
  }

  function openAddresses(){
    ensureState(); injectCss(); ensureAddressIcon(); bindAddressSafely();
    if(!$('#addresses')){ toastSafe('Adressverwaltung konnte nicht geladen werden.','error'); return false; }
    try{
      const oldCan=window.canLeaveCurrentView;
      if(typeof window.showView==='function'){
        return window.showView('addresses');
      }
    }catch(e){ console.warn(e); }
    $$('.view').forEach(v=>v.classList.toggle('active',v.id==='addresses'));
    return true;
  }

  function patchAddressNavigation(){
    if(document.__kng940AddressNav) return;
    document.__kng940AddressNav=true;
    document.addEventListener('click',ev=>{
      const btn=ev.target.closest('button[data-view="addresses"],.nav-address-main[data-view="addresses"]');
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      openAddresses();
    },true);
    const old=window.showView;
    if(typeof old==='function' && !old.__kng940Address){
      window.showView=function(id){
        if(id==='addresses') bindAddressSafely();
        const r=old.apply(this,arguments);
        if(id==='addresses') setTimeout(bindAddressSafely,40);
        return r;
      };
      window.showView.__kng940Address=true;
    }
  }

  function patchAddressSettings(){
    const box=$('#navIconSettings'); if(!box) return;
    let label=box.querySelector('[data-kng-address-setting="1"]');
    if(!label){
      label=document.createElement('label');
      label.className='nav-icon-option';
      label.dataset.kngAddressSetting='1';
      label.innerHTML='<input type="checkbox" data-nav-icon="addresses"> <span>📇</span> Adressverwaltung';
      const logout=box.querySelector('input[data-nav-icon="logout"]')?.closest('label');
      if(logout) box.insertBefore(label,logout); else box.appendChild(label);
    }
    const cb=label.querySelector('input[data-nav-icon="addresses"]');
    cb.checked=(state.settings.navIcons||[]).includes('addresses');
    if(!cb.dataset.kng940Bound){
      cb.dataset.kng940Bound='1';
      cb.addEventListener('change',()=>{
        const set=new Set(state.settings.navIcons||[]);
        cb.checked?set.add('addresses'):set.delete('addresses');
        set.add('logout');
        state.settings.navIcons=Array.from(set);
        saveSafe(); ensureAddressIcon();
      });
    }
  }

  function renderClubMembershipTable(){
    const body=$('#claimsMembershipOverviewBody'); if(!body) return;
    const members=Array.isArray(state.members)?state.members:[];
    function fmtDate(v){ if(!v) return ''; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString('de-DE'); }
    function status(m){ try{ if(typeof window.memberStatus==='function') return window.memberStatus(m); }catch(_){} return m.exitDate?'Ausgeschieden':'Aktiv'; }
    function dur(m){
      const start=new Date(m?.joinedAt||m?.entryDate||'');
      if(isNaN(start)) return {days:'',months:'',years:''};
      const end=m.exitDate?new Date(m.exitDate):new Date();
      if(isNaN(end)||end<start) return {days:'',months:'',years:''};
      const days=Math.floor((end-start)/86400000);
      let months=(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
      if(end.getDate()<start.getDate()) months--; months=Math.max(0,months);
      return {days,months,years:Math.floor(months/12)};
    }
    const rows=members.slice().sort((a,b)=>String(a.memberNo||'').localeCompare(String(b.memberNo||''),'de',{numeric:true})||String(a.lastName||'').localeCompare(String(b.lastName||''),'de')).map(m=>{const d=dur(m); return `<tr><td>${esc(m.memberNo||'')}</td><td>${esc(m.lastName||'')}</td><td>${esc(m.firstName||'')}</td><td>${esc(status(m))}</td><td>${esc(fmtDate(m.joinedAt||m.entryDate))}</td><td>${esc(fmtDate(m.exitDate))}</td><td>${esc(d.days)}</td><td>${esc(d.months)}</td><td>${esc(d.years)}</td></tr>`;}).join('');
    body.innerHTML=rows || '<tr><td colspan="9" class="muted">Keine Mitglieder vorhanden.</td></tr>';
  }

  function rebuildClubMembershipDetails(){
    const old=$('.membership-claims-overview'); if(!old) return;
    const wanted=old.dataset.kng940Wanted || (old.open?'1':'1');
    if(!old.dataset.kng940Clean){
      const clone=old.cloneNode(true);
      clone.dataset.kng940Clean='1';
      clone.dataset.kng940Wanted=wanted;
      clone.open=wanted!=='0';
      old.replaceWith(clone);
    }
    const details=$('.membership-claims-overview'); if(!details) return;
    details.style.display='';
    if(details.dataset.kng940Bound) return;
    details.dataset.kng940Bound='1';
    details.querySelector('summary')?.addEventListener('click',ev=>{
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      const next=!details.open;
      details.open=next;
      details.dataset.kng940Wanted=next?'1':'0';
      renderClubMembershipTable();
      // Alte globale Klick-Handler öffnen wieder; deshalb nach dem Event-Zyklus gezielt zurücksetzen.
      setTimeout(()=>{ details.open=next; },0);
      setTimeout(()=>{ details.open=next; },80);
      setTimeout(()=>{ details.open=next; },220);
    },true);
  }

  function keepClubMembershipState(){
    const d=$('.membership-claims-overview'); if(!d) return;
    const wanted=d.dataset.kng940Wanted;
    if(wanted==='0') d.open=false;
    if(wanted==='1') d.open=true;
  }

  function patchClubMembership(){
    rebuildClubMembershipDetails();
    renderClubMembershipTable();
    if(!document.__kng940ClaimsRestore){
      document.__kng940ClaimsRestore=true;
      ['click','change','input'].forEach(evt=>document.addEventListener(evt,()=>{
        setTimeout(()=>{ renderClubMembershipTable(); keepClubMembershipState(); },120);
      },true));
    }
  }

  function run(){
    ensureState(); injectCss(); ensureAddressView(); ensureAddressIcon(); patchAddressNavigation(); patchAddressSettings(); patchClubMembership();
    try{ if((document.querySelector('.view.active')||{}).id==='addresses') bindAddressSafely(); }catch(_){}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  window.addEventListener('load',()=>setTimeout(run,100));
  // Alte 9.10.39-Handler laufen verzögert noch einmal; danach erneut bereinigen.
  [300,700,1300,2200].forEach(ms=>setTimeout(run,ms));

  window.KNG940={run,openAddresses,ensureAddressView,patchClubMembership,renderClubMembershipTable};
})();
