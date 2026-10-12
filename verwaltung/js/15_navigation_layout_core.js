/*
  Clean Master Test 07 - Navigation/Layout Kernmodul
  Konsolidiert Navigation, Tabs, Schnellicons, Größenlogik und stabile UI-Anpassungen.
*/

/* ===== 22_bedienung_aufraeumen.js ===== */
/* Phase 9.10 – Bedienung aufräumen, Dienstkleidung im Finanzdashboard */
(function(){
  function euro(v){ return (typeof formatCurrency==='function'?formatCurrency(v):Number(v||0).toFixed(2)+' €'); }
  function esc(v){ return (typeof escapeHtml==='function'?escapeHtml(v):String(v||'')); }
  function workwearRows(){
    const issues=Array.isArray(state.workwearIssues)?state.workwearIssues:[];
    return issues.map(i=>{
      const m=(state.members||[]).find(x=>x.id===i.memberId) || {};
      const name=i.memberName || [m.lastName,m.firstName].filter(Boolean).join(', ');
      return {name, article:i.article||'', size:i.size||'', qty:Number(i.qty||1), value:Number(i.value||0), date:i.date||''};
    });
  }
  function renderWorkwearFinanceDashboard(){
    const table=document.getElementById('dashboardWorkwearCostTable');
    const chart=document.getElementById('dashboardWorkwearCostChart');
    if(!table && !chart) return;
    const rows=workwearRows();
    if(table){
      if(!rows.length){ table.innerHTML='<tr><td colspan="6">Noch keine Dienstkleidungsausgaben erfasst.</td></tr>'; }
      else table.innerHTML=rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.article)}</td><td>${esc(r.size)}</td><td>${r.qty}</td><td>${euro(r.value)}</td><td>${typeof formatDate==='function'?formatDate(r.date):esc(r.date)}</td></tr>`).join('');
    }
    if(chart){
      const sums={}; rows.forEach(r=>{ const k=r.article||'Sonstiges'; sums[k]=(sums[k]||0)+Number(r.value||0); });
      const data=Object.entries(sums).sort((a,b)=>b[1]-a[1]);
      if(!data.length){ chart.innerHTML='<p class="hint small">Noch keine Kostendaten für Dienstkleidung vorhanden.</p>'; return; }
      const max=Math.max(...data.map(x=>x[1]),1);
      chart.classList.add('workwear-cost-chart');
      chart.innerHTML=data.map(([name,val])=>`<div class="bar-item" title="${esc(name)}: ${euro(val)}"><div class="bar-value">${euro(val)}</div><div class="bar" style="height:${Math.max(8,Math.round((val/max)*120))}px"></div><div class="bar-label">${esc(name)}</div></div>`).join('');
    }
  }
  function setupWorkwearDashboardToggles(){
    const pairs=[['toggleDashboardWorkwearCostChart','dashboardWorkwearCostChart','Diagramm'],['toggleDashboardWorkwearCostTable','dashboardWorkwearCostTableWrap','Tabelle']];
    pairs.forEach(([btnId,targetId,label])=>{
      const btn=document.getElementById(btnId), target=document.getElementById(targetId);
      if(!btn||!target||btn.dataset.bound==='1') return;
      btn.dataset.bound='1';
      btn.addEventListener('click',()=>{ target.classList.toggle('hidden'); btn.textContent=(target.classList.contains('hidden')?'▶ ':'▼ ')+label+(target.classList.contains('hidden')?' anzeigen':' ausblenden'); });
      btn.textContent=(target.classList.contains('hidden')?'▶ ':'▼ ')+label+' ausblenden';
    });
  }
  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'){
    window.renderDashboard=function(){ oldRender.apply(this,arguments); renderWorkwearFinanceDashboard(); setupWorkwearDashboardToggles(); };
  }
  document.addEventListener('DOMContentLoaded',()=>{
    renderWorkwearFinanceDashboard(); setupWorkwearDashboardToggles();
    document.querySelectorAll('[data-dashboard-tab]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{renderWorkwearFinanceDashboard(); setupWorkwearDashboardToggles();},0)));
  });
  window.renderWorkwearFinanceDashboard=renderWorkwearFinanceDashboard;
})();

/* ===== 25_phase910_ui_persistence_fixes.js ===== */
/* Phase 9.10 – UI-/Persistenzkorrekturen: Pinnwandstart, Symbolraster, Dashboard-Symbole */
(function(){
  function esc(v){ return (typeof escapeHtml==='function') ? escapeHtml(v) : String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function prefs(){
    try{
      const key=state?.session?.userName || 'Gast';
      state.userPrefs=state.userPrefs||{};
      state.userPrefs[key]=state.userPrefs[key]||{};
      return state.userPrefs[key];
    }catch(e){ return {}; }
  }
  function saveSafe(){ try{ saveState?.(); }catch(e){} }
  function symbolsEnabled(){ return state?.settings?.showGlobalSymbols!==false; }

  function ensureSwitchGrid(){
    const master=document.getElementById('settingsMasterData');
    if(!master) return;
    const labels={
      protocol: document.getElementById('protocolAutoCleanup')?.closest('label'),
      clock: document.getElementById('userClockEnabled')?.closest('label'),
      pinboard: document.getElementById('pinboardPersonalVisible')?.closest('label'),
      symbols: document.getElementById('globalSymbolsEnabledTop')?.closest('label') || document.getElementById('globalSymbolsEnabled')?.closest('label')
    };
    const needed=[labels.protocol,labels.clock,labels.pinboard,labels.symbols].filter(Boolean);
    if(needed.length<3) return;
    let wrap=document.getElementById('settingsQuickSwitchGrid');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='settingsQuickSwitchGrid';
      wrap.className='settings-quick-switch-grid';
      const keep=document.getElementById('protocolKeepEntries')?.closest('label');
      if(keep) keep.insertAdjacentElement('afterend',wrap); else master.querySelector('.form-grid')?.appendChild(wrap);
    }
    ['protocol','clock','pinboard','symbols'].forEach(key=>{
      const el=labels[key];
      if(el){ el.classList.add('settings-quick-switch'); el.dataset.switchSlot=key; wrap.appendChild(el); }
    });
  }

  function syncSymbolSwitches(){
    const enabled=symbolsEnabled();
    ['globalSymbolsEnabled','globalSymbolsEnabledTop'].forEach(id=>{ const cb=document.getElementById(id); if(cb) cb.checked=enabled; });
  }
  function bindSymbolPersistence(){
    ['globalSymbolsEnabled','globalSymbolsEnabledTop'].forEach(id=>{
      const cb=document.getElementById(id);
      if(!cb || cb.dataset.phase910PersistBound) return;
      cb.dataset.phase910PersistBound='1';
      cb.addEventListener('change',()=>{
        state.settings=state.settings||{};
        state.settings.showGlobalSymbols=!!cb.checked;
        syncSymbolSwitches();
        saveSafe();
        refreshSymbolDependentViews();
      });
    });
  }
  function bindNavIconPersistence(){
    const box=document.getElementById('navIconSettings');
    if(!box || box.dataset.phase910NavPersistBound) return;
    box.dataset.phase910NavPersistBound='1';
    box.addEventListener('change',()=>{
      state.settings=state.settings||{};
      state.settings.navIcons=Array.from(box.querySelectorAll('input[data-nav-icon]:checked')).map(cb=>cb.dataset.navIcon);
      saveSafe();
      try{ applyNavIconVisibility?.(); }catch(e){}
    });
  }
  function enforceNavIconChecks(){
    const selected=new Set(Array.isArray(state?.settings?.navIcons)?state.settings.navIcons:[]);
    document.querySelectorAll('#navIconSettings input[data-nav-icon]').forEach(cb=>{ cb.checked=selected.has(cb.dataset.navIcon); });
  }

  function applyPinboardFromPrefs(){
    const top=document.querySelector('.topbar-pinboard-switch');
    const toggle=document.getElementById('pinboardToggle');
    const widget=document.getElementById('pinboardWidget');
    const text=document.getElementById('pinboardText');
    const label=document.getElementById('pinboardSwitchLabel');
    const pin=document.getElementById('pinboardPin');
    const logged=!!state?.session?.isLoggedIn;
    const p=prefs();
    if(typeof p.pinboardPersonalVisible==='undefined') p.pinboardPersonalVisible=true;
    const personalVisible=p.pinboardPersonalVisible!==false;
    if(top) top.classList.toggle('hidden',!logged || !personalVisible);
    const personalPin=(p.pinboard && typeof p.pinboard==='object') ? p.pinboard : (p.pinboard={enabled:false,text:'',x:null,y:null});
    const shared=!!state?.ui?.pinboardShared;
    const d=shared ? state.ui : personalPin;
    const enabled=!!d.enabled;
    const hasText=!!String(d.text||'').trim();
    if(toggle) toggle.checked=enabled;
    if(text && text.value!==String(d.text||'')) text.value=String(d.text||'');
    if(label){ label.classList.toggle('pinboard-label-active',hasText); label.title=hasText?'Pinnwand enthält eine Notiz':'Pinnwand ist leer'; }
    if(pin){ pin.classList.toggle('pin-has-text',hasText); pin.title=hasText?'Notiz vorhanden':'Keine Notiz vorhanden'; }
    if(widget){
      widget.classList.toggle('hidden',!logged || !personalVisible || !enabled);
      const x=Number(d.x), y=Number(d.y);
      if(Number.isFinite(x) && Number.isFinite(y)){
        widget.style.left=Math.max(8,Math.min(window.innerWidth-80,x))+'px';
        widget.style.top=Math.max(8,Math.min(window.innerHeight-80,y))+'px';
        widget.style.right='auto';
      }
    }
    const cb=document.getElementById('pinboardPersonalVisible');
    if(cb) cb.checked=personalVisible;
  }
  function bindPinboardPersonalSwitch(){
    const cb=document.getElementById('pinboardPersonalVisible');
    if(!cb || cb.dataset.phase910PinPersonalBound) return;
    cb.dataset.phase910PinPersonalBound='1';
    cb.addEventListener('change',()=>{
      prefs().pinboardPersonalVisible=!!cb.checked;
      saveSafe();
      applyPinboardFromPrefs();
    });
  }

  function updateCollapseArrowIcons(){
    const sidebar=document.getElementById('sidebarToggle');
    if(sidebar){
      const collapsed=document.body.classList.contains('sidebar-collapsed');
      sidebar.textContent=collapsed?'›':'⫷';
      sidebar.title=collapsed?'Navigation ausklappen':'Navigation einklappen';
      sidebar.classList.add('collapse-arrow-button');
    }
    const search=document.getElementById('memberSearchToggle');
    const panel=document.querySelector('.member-list.panel');
    if(search && panel){
      const collapsed=panel.classList.contains('member-search-collapsed') || document.body.classList.contains('member-search-panel-collapsed');
      search.textContent=collapsed?'‹':'⫸';
      search.title=collapsed?'Suchmaske ausklappen':'Suchmaske einklappen';
      search.classList.add('collapse-arrow-button');
    }
  }

  function refreshSymbolDependentViews(){
    const card=document.getElementById('dashboardSymbolSummary');
    if(!symbolsEnabled() && card) card.remove();
    try{ renderMembers?.(); }catch(e){}
    try{ renderCommunication?.(); }catch(e){}
    try{ renderWorkwear?.(); }catch(e){}
    try{ renderDashboard?.(); }catch(e){}
  }
  function fixDashboardSymbolSummary(){
    const card=document.getElementById('dashboardSymbolSummary');
    if(!symbolsEnabled()){
      if(card) card.remove();
      return;
    }
    if(!card) return;
    const headline=card.querySelector('.table-headline');
    const h3=headline?.querySelector('h3');
    const btn=card.querySelector('#toggleDashboardSymbols');
    if(headline && h3 && btn && !headline.dataset.phase910SymbolHeadlineFixed){
      headline.dataset.phase910SymbolHeadlineFixed='1';
      const actions=btn.closest('.inline-actions');
      btn.classList.add('symbol-toggle-left');
      btn.textContent=(state.settings.dashboardSymbolsHidden?'▶':'▼');
      btn.title=state.settings.dashboardSymbolsHidden?'Symbolübersicht einblenden':'Symbolübersicht ausblenden';
      h3.innerHTML='';
      h3.appendChild(btn);
      h3.appendChild(document.createTextNode(' Symbolübersicht'));
      if(actions && !actions.children.length) actions.remove();
    }else if(btn){
      btn.textContent=(state.settings.dashboardSymbolsHidden?'▶':'▼');
    }
  }

  function patchMemberFormSave(){
    if(typeof window.formToMember==='function' && !window.formToMember._phase910ClaimFix){
      const old=window.formToMember;
      window.formToMember=function(){
        const m=old.apply(this,arguments);
        m.claims=m.claims||{};
        const cb=document.getElementById('claimWorkwear');
        const months=document.getElementById('claimWorkwearMonths');
        const sel=document.getElementById('memberWorkwearClaim');
        const selMonths=document.getElementById('memberWorkwearMonths');
        if(cb || sel){
          m.claims.workwear=!!cb?.checked || sel?.value==='yes';
          if(cb && sel) sel.value=m.claims.workwear?'yes':'no';
        }
        const monthValue=Number(months?.value || selMonths?.value || 0);
        if(Number.isFinite(monthValue)){
          m.claims.workwearMonths=monthValue;
          if(months) months.value=String(monthValue);
          if(selMonths) selMonths.value=String(monthValue);
        }
        return m;
      };
      window.formToMember._phase910ClaimFix=true;
    }
  }

  function addCss(){
    if(document.getElementById('phase910UiPersistenceCss')) return;
    const st=document.createElement('style');
    st.id='phase910UiPersistenceCss';
    st.textContent=`
      #settingsQuickSwitchGrid{grid-column:1 / -1;display:grid;grid-template-columns:minmax(280px,1fr) minmax(280px,1fr);gap:12px 56px;align-items:center;margin:6px 0 4px 0;max-width:880px}
      #settingsQuickSwitchGrid .toggle-switch{margin:0;min-width:260px;white-space:nowrap;justify-content:flex-start}
      #settingsQuickSwitchGrid [data-switch-slot="protocol"]{grid-column:1;grid-row:1}
      #settingsQuickSwitchGrid [data-switch-slot="clock"]{grid-column:2;grid-row:1}
      #settingsQuickSwitchGrid [data-switch-slot="pinboard"]{grid-column:1;grid-row:2}
      #settingsQuickSwitchGrid [data-switch-slot="symbols"]{grid-column:2;grid-row:2}
      .collapse-arrow-button{font-size:18px;font-weight:900;line-height:1}
      .symbol-summary-card .table-headline{justify-content:flex-start;gap:8px}
      .symbol-summary-card .table-headline h3{display:flex;align-items:center;gap:6px;margin:0}
      .symbol-toggle-left{min-width:34px;padding:4px 8px;text-align:center}
      @media(max-width:850px){#settingsQuickSwitchGrid{grid-template-columns:1fr;gap:10px}#settingsQuickSwitchGrid [data-switch-slot]{grid-column:1!important;grid-row:auto!important}}
    `;
    document.head.appendChild(st);
  }

  function applyAllFixes(){
    addCss();
    ensureSwitchGrid();
    bindPinboardPersonalSwitch();
    applyPinboardFromPrefs();
    bindSymbolPersistence();
    syncSymbolSwitches();
    bindNavIconPersistence();
    enforceNavIconChecks();
    updateCollapseArrowIcons();
    fixDashboardSymbolSummary();
    patchMemberFormSave();
  }

  function wrap(name,after){
    if(typeof window[name]==='function' && !window[name]['_phase910UiPersist_'+after]){
      const old=window[name];
      window[name]=function(){ const r=old.apply(this,arguments); setTimeout(applyAllFixes,0); return r; };
      window[name]['_phase910UiPersist_'+after]=true;
    }
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(applyAllFixes,0));
  setTimeout(applyAllFixes,50);
  setTimeout(applyAllFixes,300);
  ['renderSettings','renderDashboard','renderAll','applySession','showView','applySidebarState','renderMembers'].forEach((n,i)=>wrap(n,i));
  document.addEventListener('click',e=>{
    if(e.target.closest('#sidebarToggle,#memberSearchToggle,#memberSearchPin,#sidebarPin')) setTimeout(updateCollapseArrowIcons,0);
  },true);
})();

/* ===== 26_phase910_final_quality_fix.js ===== */
/* Phase 9.10 – Abschlusskorrektur UI, Mitglieder-Datensicherheit und Konsistenzprüfung */
(function(){
  'use strict';

  const PHASE = 'Phase 9.10 Abschlusskorrektur';

  function safeCall(fn, fallback){
    try{ return (typeof fn === 'function') ? fn() : fallback; }catch(_err){ return fallback; }
  }
  function saveSafe(){ safeCall(window.saveState); }
  function toastSafe(message,type){ safeCall(()=>window.toast(message,type||'info')); }
  function symbolsEnabled(){ return state?.settings?.showGlobalSymbols !== false; }

  function setButtonText(button, text, title){
    if(!button) return;
    button.textContent = text;
    button.title = title || '';
    button.setAttribute('aria-label', title || text);
    button.classList.add('collapse-arrow-button');
  }

  /*
    Pfeillogik laut Vorgabe:
    - Anzeige ist offen: kleiner Pfeil sichtbar = Aktion „einklappen“
    - Anzeige ist geschlossen: großer Pfeil sichtbar = Aktion „ausklappen“
  */
  function applyCorrectCollapseArrows(){
    const sidebar = document.getElementById('sidebarToggle');
    if(sidebar){
      const collapsed = document.body.classList.contains('sidebar-collapsed');
      setButtonText(
        sidebar,
        collapsed ? '⫸' : '‹',
        collapsed ? 'Navigation ausklappen' : 'Navigation einklappen'
      );
    }

    const searchToggle = document.getElementById('memberSearchToggle');
    const panel = document.querySelector('.member-list.panel');
    if(searchToggle && panel){
      const collapsed = panel.classList.contains('member-search-collapsed') ||
        document.body.classList.contains('member-search-panel-collapsed');
      setButtonText(
        searchToggle,
        collapsed ? '⫸' : '‹',
        collapsed ? 'Suchmaske ausklappen' : 'Suchmaske einklappen'
      );
    }
  }

  /* Dashboard: Button direkt rechts neben dem Wort „Symbolübersicht“. */
  function fixDashboardSymbolHeader(){
    const card = document.getElementById('dashboardSymbolSummary');
    if(!symbolsEnabled()){
      if(card) card.remove();
      return;
    }
    if(!card) return;

    const headline = card.querySelector('.table-headline');
    const h3 = headline?.querySelector('h3');
    const button = card.querySelector('#toggleDashboardSymbols');
    if(!headline || !h3 || !button) return;

    const hidden = !!state?.settings?.dashboardSymbolsHidden;
    button.textContent = hidden ? '▶' : '▼';
    button.title = hidden ? 'Symbolübersicht einblenden' : 'Symbolübersicht ausblenden';
    button.setAttribute('aria-label', button.title);
    button.classList.add('symbol-title-toggle-right');

    h3.innerHTML = '';
    h3.appendChild(document.createTextNode('Symbolübersicht'));
    h3.appendChild(button);

    const actions = headline.querySelector('.inline-actions');
    if(actions && !actions.querySelector('button')) actions.remove();
  }

  function markCleanNow(){
    safeCall(window.markMemberClean);
    setTimeout(()=>safeCall(window.markMemberClean),0);
  }

  /*
    Reparatur für Speichern/Verwerfen beim Blättern:
    Nach erfolgreichem Speichern wird der Snapshot sofort neu gesetzt.
    Dadurch kommt dieselbe Meldung nicht erneut und die Navigation läuft weiter.
  */
  function patchUnsavedMemberHandling(){
    if(typeof window.confirmLeaveMember === 'function' && !window.confirmLeaveMember._phase910FinalPatched){
      window.confirmLeaveMember = function(){
        if(!state?.session?.isLoggedIn) return true;
        if(typeof window.memberIsDirty !== 'function' || !window.memberIsDirty()) return true;

        const shouldSave = confirm('Möchten Sie die Änderungen speichern oder verwerfen?\n\nOK = speichern\nAbbrechen = verwerfen');
        if(shouldSave){
          const saved = (typeof window.saveMember === 'function') ? window.saveMember() : false;
          if(saved){
            markCleanNow();
            return true;
          }
          return false;
        }

        markCleanNow();
        toastSafe('Änderungen verworfen.','info');
        return true;
      };
      window.confirmLeaveMember._phase910FinalPatched = true;
    }

    if(typeof window.saveMember === 'function' && !window.saveMember._phase910FinalPatched){
      const oldSaveMember = window.saveMember;
      window.saveMember = function(){
        const ok = oldSaveMember.apply(this, arguments);
        if(ok) markCleanNow();
        return ok;
      };
      window.saveMember._phase910FinalPatched = true;
    }
  }

  function defaultClaimObject(){
    if(typeof window.defaultClaims === 'function') return window.defaultClaims();
    return {
      christmasDinner:false, christmasDinnerMonths:0,
      expensePayout:false, expensePayoutMonths:0,
      travelReimbursement:false, travelReimbursementMonths:0,
      gratification:false, gratificationMonths:0,
      trips:false, tripsMonths:0,
      parkingTicket:false, parkingTicketMonths:0,
      christmasMarketParkingTicket:false, christmasMarketParkingTicketMonths:0,
      workwear:false, workwearMonths:0,
      christmasMarketCarPlate:'', carPlate:'', assetScale:[], notes:''
    };
  }

  function defaultSkillObject(){
    if(typeof window.defaultSkills === 'function') return window.defaultSkills();
    return {levels:{}, notes:''};
  }

  function normalizeMemberData(member){
    let changed = false;
    const ensureString = key => {
      if(typeof member[key] === 'undefined' || member[key] === null){ member[key] = ''; changed = true; }
      else if(typeof member[key] !== 'string'){ member[key] = String(member[key]); changed = true; }
    };

    ['id','memberNo','salutation','firstName','lastName','birthDate','joinedAt','exitDate','exitReason','street','postalCode','city','phone','mobile','email','memberType','clubFunction','profession','availability','shiftPreference','preferredDeployment','allergies','memberNotes','createdAt','updatedAt'].forEach(ensureString);

    if(!member.id){
      member.id = (crypto?.randomUUID ? crypto.randomUUID() : 'm_'+Date.now()+'_'+Math.random().toString(16).slice(2));
      changed = true;
    }
    if(!Array.isArray(member.committees)){ member.committees = []; changed = true; }

    const claims = {...defaultClaimObject(), ...(member.claims && typeof member.claims === 'object' ? member.claims : {})};
    if(JSON.stringify(claims) !== JSON.stringify(member.claims || {})){ member.claims = claims; changed = true; }

    const skills = {...defaultSkillObject(), ...(member.skills && typeof member.skills === 'object' ? member.skills : {})};
    if(!skills.levels || typeof skills.levels !== 'object'){ skills.levels = {}; changed = true; }
    if(JSON.stringify(skills) !== JSON.stringify(member.skills || {})){ member.skills = skills; changed = true; }

    const clothing = member.clothing && typeof member.clothing === 'object' ? member.clothing : {};
    const normalizedClothing = {
      jacketSize:String(clothing.jacketSize || ''),
      poloSize:String(clothing.poloSize || ''),
      pantsSize:String(clothing.pantsSize || ''),
      shoeSize:String(clothing.shoeSize || '')
    };
    if(JSON.stringify(normalizedClothing) !== JSON.stringify(member.clothing || {})){ member.clothing = normalizedClothing; changed = true; }

    if(!member.createdAt) member.createdAt = new Date().toISOString();
    if(!member.updatedAt) member.updatedAt = member.createdAt;
    return changed;
  }

  function normalizeStateData(){
    if(typeof state === "undefined" || !state || state._phase910FinalNormalized) return;
    let changed = false;

    ['members','communications','workwearArticles','workwearIssues','workwearOrders','finance','donations','activities','payments','bankBalances','protocol','backupProtocol','systemCheckProtocol','officeProtocol','roleAssignments'].forEach(key=>{
      if(!Array.isArray(state[key])){ state[key] = []; changed = true; }
    });

    state.settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
    if(typeof state.settings.showGlobalSymbols === 'undefined'){
      state.settings.showGlobalSymbols = true;
      changed = true;
    }
    if(!Array.isArray(state.settings.navIcons)){
      state.settings.navIcons = ['dashboard','members','workwear','activities','donations','communication','systemCheck','protocol','logout'];
      changed = true;
    }
    if(!state.settings.navIcons.includes('workwear')){
      const memberIndex = state.settings.navIcons.indexOf('members');
      state.settings.navIcons.splice(memberIndex >= 0 ? memberIndex + 1 : 1, 0, 'workwear');
      changed = true;
    }

    state.members.forEach(member=>{ if(normalizeMemberData(member)) changed = true; });

    state._phase910FinalNormalized = true;
    if(changed){
      saveSafe();
      safeCall(()=>window.logAction('System','Datenkonsistenz geprüft','Fehlende Standardfelder wurden ergänzt.'));
    }
  }

  function addFinalCss(){
    if(document.getElementById('phase910FinalQualityCss')) return;
    const style = document.createElement('style');
    style.id = 'phase910FinalQualityCss';
    style.textContent = `
      .symbol-summary-card .table-headline{justify-content:flex-start;gap:8px;align-items:center}
      .symbol-summary-card .table-headline h3{display:inline-flex;align-items:center;gap:6px;margin:0;white-space:nowrap}
      .symbol-title-toggle-right{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:2px 8px;margin-left:6px;line-height:1;font-weight:800}
      .collapse-arrow-button{display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;line-height:1}
    `;
    document.head.appendChild(style);
  }

  function applyPhase910FinalFixes(){
    addFinalCss();
    patchUnsavedMemberHandling();
    normalizeStateData();
    fixDashboardSymbolHeader();
    applyCorrectCollapseArrows();
  }

  function wrapAfterRender(functionName){
    const fn = window[functionName];
    if(typeof fn !== 'function' || fn._phase910FinalWrapped) return;
    window[functionName] = function(){
      const result = fn.apply(this, arguments);
      setTimeout(applyPhase910FinalFixes,0);
      return result;
    };
    window[functionName]._phase910FinalWrapped = true;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    applyPhase910FinalFixes();
    ['renderDashboard','renderMembers','renderSettings','renderAll','showView','applySidebarState'].forEach(wrapAfterRender);
    document.addEventListener('click',event=>{
      if(event.target.closest('#sidebarToggle,#memberSearchToggle,#memberSearchPin,#sidebarPin,#toggleDashboardSymbols')){
        setTimeout(applyPhase910FinalFixes,0);
      }
    },true);
  });

  setTimeout(applyPhase910FinalFixes,50);
  setTimeout(applyPhase910FinalFixes,300);
})();

/* ===== 28_phase910_3_nav_tabs_fix.js ===== */
/* Phase 9.10.3 – Dashboard-Tab-Pfeile und Navigation schnell ein-/wiederherstellen */
(function(){
  'use strict';

  function safe(fn, fallback){ try{ return (typeof fn === 'function') ? fn() : fallback; }catch(_e){ return fallback; } }
  function saveSafe(){ safe(window.saveState); }
  function toastSafe(msg,type){ safe(()=>window.toast(msg,type||'info')); }

  function prefKey(){
    return safe(window.currentUserPreferenceKey, null)
      || window.state?.session?.userId
      || window.state?.session?.userName
      || 'guest';
  }
  function prefs(){
    window.state = window.state || {};
    window.state.userPrefs = (window.state.userPrefs && typeof window.state.userPrefs === 'object') ? window.state.userPrefs : {};
    const key = prefKey();
    window.state.userPrefs[key] = (window.state.userPrefs[key] && typeof window.state.userPrefs[key] === 'object') ? window.state.userPrefs[key] : {};
    return window.state.userPrefs[key];
  }

  function tabKey(tab){ return tab?.dataset?.dashboardTab || ''; }
  function tabContainer(){ return document.querySelector('.dashboard-tabs'); }

  function activateDashboardTab(key, persist){
    const tabs = tabContainer();
    if(!tabs) return;
    const target = key ? tabs.querySelector(`.tab[data-dashboard-tab="${CSS.escape(key)}"]`) : tabs.querySelector('.tab[data-dashboard-tab]');
    if(!target) return;
    const activeKey = tabKey(target);
    tabs.querySelectorAll('.tab[data-dashboard-tab]').forEach(tab=>tab.classList.toggle('active', tabKey(tab) === activeKey));
    document.querySelectorAll('.dashboard-tab-panel').forEach(panel=>panel.classList.toggle('active', panel.id === activeKey));
    if(persist){
      prefs().activeDashboardTab = activeKey;
      saveSafe();
    }
  }

  function saveTabOrder(){
    const tabs = tabContainer();
    if(!tabs) return;
    const p = prefs();
    p.dashboardTabOrder = Array.from(tabs.querySelectorAll('.tab[data-dashboard-tab]')).map(tabKey).filter(Boolean);
    p.activeDashboardTab = tabKey(tabs.querySelector('.tab.active[data-dashboard-tab]')) || p.activeDashboardTab || p.dashboardTabOrder[0];
    saveSafe();
  }

  function applySavedTabOrder(){
    const tabs = tabContainer();
    if(!tabs) return;
    const p = prefs();
    const saved = Array.isArray(p.dashboardTabOrder) ? p.dashboardTabOrder : [];
    const all = Array.from(tabs.querySelectorAll('.tab[data-dashboard-tab]'));
    if(saved.length){
      const byKey = new Map(all.map(tab=>[tabKey(tab), tab]));
      saved.forEach(key=>{ const tab = byKey.get(key); if(tab){ tabs.appendChild(tab); byKey.delete(key); } });
      byKey.forEach(tab=>tabs.appendChild(tab));
    }
    activateDashboardTab(p.activeDashboardTab || tabKey(tabs.querySelector('.tab[data-dashboard-tab]')), false);
  }

  function swapTab(tab){
    const tabs = tabContainer();
    if(!tabs || !tab) return;
    const ordered = Array.from(tabs.querySelectorAll('.tab[data-dashboard-tab]'));
    if(ordered.length < 2) return;
    const idx = ordered.indexOf(tab);
    if(idx < 0) return;
    const target = idx === ordered.length - 1 ? ordered[idx - 1] : ordered[idx + 1];
    if(!target) return;
    if(idx < ordered.indexOf(target)){
      tabs.insertBefore(target, tab);
    }else{
      tabs.insertBefore(tab, target);
    }
    activateDashboardTab(tabKey(tab), true);
    saveTabOrder();
    toastSafe('Dashboard-Registerkarten-Reihenfolge gespeichert.','success');
  }

  function ensureDashboardTabMoveArrows(){
    const tabs = tabContainer();
    if(!tabs) return;
    applySavedTabOrder();
    tabs.classList.add('dashboard-tabs-with-move-arrows');
    tabs.querySelectorAll('.tab[data-dashboard-tab]').forEach(tab=>{
      tab.classList.add('tab-sortable','dashboard-tab-movable');
      let arrow = tab.querySelector(':scope > .dashboard-tab-move-arrow');
      if(!arrow){
        arrow = document.createElement('span');
        arrow.className = 'dashboard-tab-move-arrow';
        arrow.setAttribute('role','button');
        arrow.setAttribute('tabindex','0');
        arrow.setAttribute('aria-label','Registerkarte verschieben');
        arrow.title = 'Registerkarte nach links/rechts verschieben';
        arrow.textContent = '⇄';
        tab.appendChild(arrow);
      }
      if(!arrow.dataset.phase9103Bound){
        arrow.dataset.phase9103Bound = '1';
        arrow.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); swapTab(tab); });
        arrow.addEventListener('keydown',ev=>{
          if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); ev.stopPropagation(); swapTab(tab); }
        });
      }
      if(!tab.dataset.phase9103ClickBound){
        tab.dataset.phase9103ClickBound = '1';
        tab.addEventListener('click',ev=>{
          if(ev.target?.closest?.('.dashboard-tab-move-arrow')) return;
          activateDashboardTab(tabKey(tab), true);
        });
      }
    });
  }

  const navGroups = [
    {toggle:'membersMenuToggle', submenu:'membersSubmenu', sign:'membersMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'shoppingMenuToggle', submenu:'shoppingSubmenu', sign:'shoppingMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'financeMenuToggle', submenu:'financeSubmenu', sign:'financeMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'settingsMenuToggle', submenu:'settingsSubmenu', sign:'settingsMenuSign', openClass:'open', extraClass:null}
  ];

  function isGroupOpen(group){
    const toggle = document.getElementById(group.toggle);
    const submenu = document.getElementById(group.submenu);
    if(!toggle || !submenu) return false;
    return toggle.getAttribute('aria-expanded') === 'true' || submenu.classList.contains(group.openClass) || (!!group.extraClass && submenu.classList.contains(group.extraClass));
  }

  function setGroupOpen(group, open){
    const toggle = document.getElementById(group.toggle);
    const submenu = document.getElementById(group.submenu);
    const sign = document.getElementById(group.sign);
    if(!toggle || !submenu) return;
    submenu.classList.toggle(group.openClass, !!open);
    if(group.extraClass) submenu.classList.toggle(group.extraClass, !!open);
    toggle.setAttribute('aria-expanded', String(!!open));
    if(sign) sign.textContent = open ? '−' : '+';
  }

  function ensureNavCollapseRestoreButton(){
    const quickIcons = document.querySelector('.quick-icons');
    if(!quickIcons) return;
    let btn = document.getElementById('navCollapseRestoreAll');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'navCollapseRestoreAll';
      btn.type = 'button';
      btn.className = 'nav-collapse-restore-all';
      btn.textContent = '±';
      btn.title = 'Alle Menügruppen einklappen / vorherigen Zustand wiederherstellen';
      btn.setAttribute('aria-label','Alle Menügruppen einklappen oder vorherigen Zustand wiederherstellen');
      const logout = quickIcons.querySelector('[data-action="logout"]');
      quickIcons.insertBefore(btn, logout || null);
    }
    updateNavCollapseButton();
    if(!btn.dataset.phase9103Bound){
      btn.dataset.phase9103Bound = '1';
      btn.addEventListener('click',()=>{
        const p = prefs();
        if(p.navAllCollapsedByQuickButton){
          const previous = p.navPreviousOpenState || {};
          navGroups.forEach(group=>setGroupOpen(group, previous[group.toggle] !== false));
          p.navAllCollapsedByQuickButton = false;
          p.navPreviousOpenState = null;
          toastSafe('Vorheriger Navigationszustand wiederhergestellt.','success');
        }else{
          const previous = {};
          navGroups.forEach(group=>{ previous[group.toggle] = isGroupOpen(group); });
          p.navPreviousOpenState = previous;
          navGroups.forEach(group=>setGroupOpen(group, false));
          p.navAllCollapsedByQuickButton = true;
          toastSafe('Alle Menügruppen wurden eingeklappt.','success');
        }
        saveSafe();
        updateNavCollapseButton();
      });
    }
  }

  function updateNavCollapseButton(){
    const btn = document.getElementById('navCollapseRestoreAll');
    if(!btn) return;
    const collapsed = !!prefs().navAllCollapsedByQuickButton;
    btn.textContent = collapsed ? '+' : '±';
    btn.title = collapsed ? 'Vorherigen Navigationszustand wiederherstellen' : 'Alle Menügruppen einklappen';
    btn.setAttribute('aria-pressed', String(collapsed));
  }

  function addCss(){
    if(document.getElementById('phase9103NavTabsCss')) return;
    const st = document.createElement('style');
    st.id = 'phase9103NavTabsCss';
    st.textContent = `
      .dashboard-tabs-with-move-arrows .tab{
        display:inline-flex!important;
        align-items:center!important;
        gap:8px!important;
      }
      .dashboard-tab-move-arrow{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-width:22px!important;
        height:22px!important;
        margin-left:4px!important;
        border-radius:999px!important;
        border:1px solid rgba(0,0,0,.16)!important;
        background:rgba(255,255,255,.7)!important;
        color:inherit!important;
        font-weight:900!important;
        line-height:1!important;
        cursor:pointer!important;
        user-select:none!important;
      }
      .dashboard-tab-move-arrow:hover,
      .dashboard-tab-move-arrow:focus{
        background:#fff!important;
        outline:2px solid rgba(47,111,73,.24)!important;
      }
      .quick-icons #navCollapseRestoreAll{
        font-weight:900!important;
        font-size:17px!important;
      }
    `;
    document.head.appendChild(st);
  }

  function applyFix(){
    addCss();
    ensureDashboardTabMoveArrows();
    ensureNavCollapseRestoreButton();
  }

  function wrapAfter(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn._phase9103Wrapped) return;
    window[name] = function(){
      const result = fn.apply(this, arguments);
      setTimeout(applyFix, 0);
      return result;
    };
    window[name]._phase9103Wrapped = true;
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(applyFix,0));
  setTimeout(applyFix,50);
  setTimeout(applyFix,250);
  setTimeout(applyFix,800);
  ['renderDashboard','renderAll','showView','applySession'].forEach(wrapAfter);
})();

/* ===== 29_phase910_4_nav_symbol_tabs_cleanup.js ===== */
/* Phase 9.10.4 – Navigation-Schnellklappbutton, Symbolübersicht-Text, Dashboard-Tab-Pfeile bereinigen */
(function(){
  'use strict';

  function safe(fn, fallback){ try{ return (typeof fn === 'function') ? fn() : fallback; }catch(_e){ return fallback; } }
  function saveSafe(){ safe(window.saveState); }
  function toastSafe(msg,type){ safe(()=>window.toast(msg,type||'info')); }
  function prefKey(){ return safe(window.currentUserPreferenceKey, null) || window.state?.session?.userId || window.state?.session?.userName || 'guest'; }
  function prefs(){
    window.state = window.state || {};
    window.state.userPrefs = (window.state.userPrefs && typeof window.state.userPrefs === 'object') ? window.state.userPrefs : {};
    const key = prefKey();
    window.state.userPrefs[key] = (window.state.userPrefs[key] && typeof window.state.userPrefs[key] === 'object') ? window.state.userPrefs[key] : {};
    return window.state.userPrefs[key];
  }

  const navGroups = [
    {toggle:'membersMenuToggle', submenu:'membersSubmenu', sign:'membersMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'shoppingMenuToggle', submenu:'shoppingSubmenu', sign:'shoppingMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'financeMenuToggle', submenu:'financeSubmenu', sign:'financeMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'settingsMenuToggle', submenu:'settingsSubmenu', sign:'settingsMenuSign', openClass:'open', extraClass:null}
  ];

  function isGroupOpen(group){
    const toggle = document.getElementById(group.toggle);
    const submenu = document.getElementById(group.submenu);
    if(!toggle || !submenu) return false;
    return toggle.getAttribute('aria-expanded') === 'true' || submenu.classList.contains(group.openClass) || (!!group.extraClass && submenu.classList.contains(group.extraClass));
  }

  function setGroupOpen(group, open){
    const toggle = document.getElementById(group.toggle);
    const submenu = document.getElementById(group.submenu);
    const sign = document.getElementById(group.sign);
    if(!toggle || !submenu) return;

    submenu.classList.toggle(group.openClass, !!open);
    if(group.extraClass) submenu.classList.toggle(group.extraClass, !!open);
    toggle.setAttribute('aria-expanded', String(!!open));
    if(sign) sign.textContent = open ? '−' : '+';

    /* Wichtig: alte Phase-9.10-Fixes setzten inline display:block. Das muss beim Schließen entfernt werden. */
    if(open){
      if(group.openClass === 'open-submenu' || group.extraClass) submenu.style.display = 'block';
      else submenu.style.display = '';
    }else{
      submenu.style.display = 'none';
    }
  }

  function ensureNavQuickButtonInTopRow(){
    const controls = document.querySelector('.sidebar-controls');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if(!controls || !sidebarToggle) return;

    let btn = document.getElementById('navCollapseRestoreAll');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'navCollapseRestoreAll';
      btn.type = 'button';
    }
    btn.className = 'sidebar-control nav-collapse-restore-all';
    btn.setAttribute('aria-label','Alle Menügruppen einklappen oder vorherigen Zustand wiederherstellen');

    /* Genau rechts neben dem Navigation-Ein-/Ausklappen-Button platzieren. */
    if(sidebarToggle.nextSibling !== btn) controls.insertBefore(btn, sidebarToggle.nextSibling);

    updateNavQuickButton();
    if(!btn.dataset.phase9104Bound){
      btn.dataset.phase9104Bound = '1';
      btn.addEventListener('click', ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        const p = prefs();
        if(p.navAllCollapsedByQuickButton){
          const previous = p.navPreviousOpenState || {};
          navGroups.forEach(group=>setGroupOpen(group, previous[group.toggle] === true));
          p.navAllCollapsedByQuickButton = false;
          p.navPreviousOpenState = null;
          toastSafe('Vorheriger Navigationszustand wiederhergestellt.','success');
        }else{
          const previous = {};
          navGroups.forEach(group=>{ previous[group.toggle] = isGroupOpen(group); });
          p.navPreviousOpenState = previous;
          navGroups.forEach(group=>setGroupOpen(group, false));
          p.navAllCollapsedByQuickButton = true;
          toastSafe('Alle Menügruppen wurden eingeklappt.','success');
        }
        saveSafe();
        updateNavQuickButton();
      });
    }
  }

  function updateNavQuickButton(){
    const btn = document.getElementById('navCollapseRestoreAll');
    if(!btn) return;
    const collapsed = !!prefs().navAllCollapsedByQuickButton;
    btn.textContent = collapsed ? '+' : '±';
    btn.title = collapsed ? 'Vorigen Menü-Zustand wiederherstellen' : 'Alle Menügruppen einklappen';
    btn.setAttribute('aria-pressed', String(collapsed));
  }

  function fixSymbolSummaryButtonText(){
    const card = document.getElementById('dashboardSymbolSummary');
    if(!card) return;
    const btn = card.querySelector('#toggleDashboardSymbols');
    if(!btn) return;
    const hidden = !!window.state?.settings?.dashboardSymbolsHidden;
    btn.textContent = hidden ? '▶ Symbolübersicht einblenden' : '▼ Symbolübersicht ausblenden';
    btn.title = hidden ? 'Symbolübersicht einblenden' : 'Symbolübersicht ausblenden';
    btn.classList.add('symbol-title-toggle-wide');
  }

  function cleanupDashboardTabMoveIcons(){
    const tabs = document.querySelector('.dashboard-tabs');
    if(!tabs) return;
    tabs.classList.add('dashboard-tabs-clean-hover-move');

    /* Phase 9.10.3 erzeugte ein zweites ⇄-Symbol. Das wird entfernt; Drag-Symbol aus Phase 9.10.2 bleibt. */
    tabs.querySelectorAll('.dashboard-tab-move-arrow').forEach(el=>el.remove());

    tabs.querySelectorAll('.tab[data-dashboard-tab]').forEach(tab=>{
      tab.classList.add('tab-sortable');
      tab.draggable = true;
      let icon = tab.querySelector(':scope > .tab-drag-icon');
      if(!icon){
        icon = document.createElement('span');
        icon.className = 'tab-drag-icon dashboard-tab-drag-icon';
        icon.textContent = '↔';
        icon.title = 'Registerkarte verschieben';
        tab.appendChild(icon);
      }
    });
  }

  function addCss(){
    if(document.getElementById('phase9104CleanupCss')) return;
    const st = document.createElement('style');
    st.id = 'phase9104CleanupCss';
    st.textContent = `
      .sidebar-controls #navCollapseRestoreAll{
        order:2;
        font-weight:900!important;
        font-size:17px!important;
        line-height:1!important;
      }
      .sidebar-controls #sidebarPin{order:3;}

      /* Untermenüs wirklich verstecken, auch wenn ältere Regeln .always-visible oder .open-submenu gesetzt hatten. */
      .submenu[style*="display: none"]{display:none!important;}
      .shopping-submenu[style*="display: none"],
      .finance-submenu[style*="display: none"],
      .members-submenu[style*="display: none"]{display:none!important;}

      /* Dashboard-Registerkarten: nur ein Verschiebesymbol, erst beim Überfahren sichtbar wie bei Mitglieder. */
      .dashboard-tabs-clean-hover-move .dashboard-tab-move-arrow{display:none!important;}
      .dashboard-tabs-clean-hover-move .tab{
        display:inline-flex!important;
        align-items:center!important;
        gap:8px!important;
      }
      .dashboard-tabs-clean-hover-move .tab .tab-drag-icon{
        opacity:0!important;
        width:0!important;
        margin-left:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
        transition:opacity .12s ease,width .12s ease,margin .12s ease!important;
      }
      .dashboard-tabs-clean-hover-move .tab:hover .tab-drag-icon,
      .dashboard-tabs-clean-hover-move .tab:focus-within .tab-drag-icon{
        opacity:1!important;
        width:22px!important;
        margin-left:4px!important;
        pointer-events:auto!important;
        cursor:grab!important;
      }
      .symbol-title-toggle-wide{
        min-width:auto!important;
        width:auto!important;
        max-width:none!important;
        padding:4px 12px!important;
        white-space:nowrap!important;
      }
    `;
    document.head.appendChild(st);
  }

  function applyFixes(){
    addCss();
    ensureNavQuickButtonInTopRow();
    cleanupDashboardTabMoveIcons();
    fixSymbolSummaryButtonText();
  }

  function wrapAfter(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn._phase9104Wrapped) return;
    window[name] = function(){
      const result = fn.apply(this, arguments);
      setTimeout(applyFixes, 0);
      setTimeout(applyFixes, 80);
      return result;
    };
    window[name]._phase9104Wrapped = true;
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(applyFixes,0));
  document.addEventListener('click',ev=>{
    if(ev.target?.closest?.('#toggleDashboardSymbols,#sidebarToggle,#membersMenuToggle,#shoppingMenuToggle,#financeMenuToggle,#settingsMenuToggle')){
      setTimeout(applyFixes,0);
      setTimeout(applyFixes,80);
    }
  }, true);

  setTimeout(applyFixes,50);
  setTimeout(applyFixes,250);
  setTimeout(applyFixes,800);
  setTimeout(applyFixes,1500);
  ['renderDashboard','renderAll','showView','applySession'].forEach(wrapAfter);
})();

/* ===== 30_phase910_5_nav_symbol_final_fix.js ===== */
/* Phase 9.10.5 – finaler Fix: Navigations-Schnellklappen, Iconposition, Symbolübersicht-Text */
(function(){
  'use strict';

  const NAV_GROUPS = [
    { toggle:'membersMenuToggle', submenu:'membersSubmenu', sign:'membersMenuSign' },
    { toggle:'shoppingMenuToggle', submenu:'shoppingSubmenu', sign:'shoppingMenuSign' },
    { toggle:'financeMenuToggle', submenu:'financeSubmenu', sign:'financeMenuSign' },
    { toggle:'settingsMenuToggle', submenu:'settingsSubmenu', sign:'settingsMenuSign' }
  ];

  function safe(fn, fallback){ try { return fn(); } catch(_e){ return fallback; } }
  function saveSafe(){ safe(function(){ if(typeof window.saveState === 'function') window.saveState(); }); }
  function toastSafe(msg,type){ safe(function(){ if(typeof window.toast === 'function') window.toast(msg,type||'info'); }); }

  function prefKey(){
    return safe(function(){ return (typeof window.currentUserPreferenceKey === 'function') ? window.currentUserPreferenceKey() : null; }, null)
      || window.state?.session?.userId
      || window.state?.session?.userName
      || 'guest';
  }

  function prefs(){
    window.state = window.state || {};
    window.state.userPrefs = (window.state.userPrefs && typeof window.state.userPrefs === 'object') ? window.state.userPrefs : {};
    const key = prefKey();
    window.state.userPrefs[key] = (window.state.userPrefs[key] && typeof window.state.userPrefs[key] === 'object') ? window.state.userPrefs[key] : {};
    window.state.userPrefs[key].navigation = window.state.userPrefs[key].navigation || {};
    return window.state.userPrefs[key].navigation;
  }

  function getGroupElements(group){
    return {
      toggle: document.getElementById(group.toggle),
      submenu: document.getElementById(group.submenu),
      sign: document.getElementById(group.sign)
    };
  }

  function isGroupOpen(group){
    const {toggle, submenu} = getGroupElements(group);
    if(!toggle || !submenu) return false;
    const aria = toggle.getAttribute('aria-expanded');
    if(aria === 'false') return false;
    if(aria === 'true') return true;
    return submenu.classList.contains('open-submenu') || submenu.classList.contains('always-visible') || submenu.classList.contains('open') || submenu.style.display === 'block';
  }

  function setGroupOpen(group, open){
    const {toggle, submenu, sign} = getGroupElements(group);
    if(!toggle || !submenu) return;
    submenu.classList.toggle('open-submenu', !!open);
    submenu.classList.toggle('always-visible', !!open);
    submenu.classList.toggle('open', !!open);
    submenu.hidden = !open;
    submenu.style.display = open ? 'block' : 'none';
    toggle.setAttribute('aria-expanded', String(!!open));
    if(sign) sign.textContent = open ? '−' : '+';
  }

  function installNavQuickButton(){
    const controls = document.querySelector('.sidebar-controls');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if(!controls || !sidebarToggle) return;

    let btn = document.getElementById('navCollapseRestoreAll');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'navCollapseRestoreAll';
      btn.type = 'button';
    }
    btn.className = 'sidebar-control nav-collapse-restore-all';
    btn.setAttribute('aria-label','Alle Navigations-Untermenüs schließen oder vorherigen Zustand wiederherstellen');

    /* Direkt rechts neben dem Navigation-Ein-/Ausklappen-Icon platzieren. */
    if(sidebarToggle.nextElementSibling !== btn){
      sidebarToggle.insertAdjacentElement('afterend', btn);
    }

    if(!btn.dataset.phase9105Bound){
      btn.dataset.phase9105Bound = '1';
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        const p = prefs();
        if(p.allGroupsCollapsed === true){
          const oldState = p.previousGroupOpenState || {};
          NAV_GROUPS.forEach(function(group){ setGroupOpen(group, oldState[group.toggle] === true); });
          p.allGroupsCollapsed = false;
          document.body.classList.remove('nav-all-groups-collapsed');
          toastSafe('Vorheriger Navigationszustand wurde wiederhergestellt.','success');
        }else{
          const oldState = {};
          NAV_GROUPS.forEach(function(group){ oldState[group.toggle] = isGroupOpen(group); });
          p.previousGroupOpenState = oldState;
          NAV_GROUPS.forEach(function(group){ setGroupOpen(group, false); });
          p.allGroupsCollapsed = true;
          document.body.classList.add('nav-all-groups-collapsed');
          toastSafe('Alle Navigations-Untermenüs wurden geschlossen.','success');
        }
        saveSafe();
        updateNavQuickButton();
      }, true);
    }

    updateNavQuickButton();
  }

  function updateNavQuickButton(){
    const btn = document.getElementById('navCollapseRestoreAll');
    if(!btn) return;
    const collapsed = prefs().allGroupsCollapsed === true;
    btn.textContent = collapsed ? '+' : '±';
    btn.title = collapsed ? 'Vorherigen Menü-Zustand wiederherstellen' : 'Alle Untermenüs schließen';
    btn.setAttribute('aria-pressed', String(collapsed));
    document.body.classList.toggle('nav-all-groups-collapsed', collapsed);
  }

  function fixMenuParents(){
    NAV_GROUPS.forEach(function(group){
      const {toggle} = getGroupElements(group);
      if(!toggle || toggle.dataset.phase9105MenuBound) return;
      toggle.dataset.phase9105MenuBound = '1';
      toggle.addEventListener('click', function(){
        const p = prefs();
        p.allGroupsCollapsed = false;
        document.body.classList.remove('nav-all-groups-collapsed');
        setTimeout(function(){
          const open = isGroupOpen(group);
          setGroupOpen(group, open);
          updateNavQuickButton();
        }, 0);
      }, true);
    });
  }

  function isSymbolSummaryHidden(){
    const content = document.getElementById('dashboardSymbolSummaryContent');
    if(content){
      const cs = window.getComputedStyle(content);
      if(content.hidden || cs.display === 'none') return true;
      if(cs.display !== 'none') return false;
    }
    return !!window.state?.settings?.dashboardSymbolsHidden;
  }

  function fixSymbolSummaryButtonText(){
    const btn = document.getElementById('toggleDashboardSymbols');
    if(!btn) return;
    const hidden = isSymbolSummaryHidden();
    btn.textContent = hidden ? '▶ Symbolübersicht anzeigen' : '▼ Symbolübersicht ausblenden';
    btn.title = hidden ? 'Symbolübersicht anzeigen' : 'Symbolübersicht ausblenden';
    btn.classList.add('symbol-title-toggle-wide');
  }

  function addCss(){
    if(document.getElementById('phase9105FinalFixCss')) return;
    const st = document.createElement('style');
    st.id = 'phase9105FinalFixCss';
    st.textContent = `
      .sidebar-controls{
        justify-content:flex-start!important;
        align-items:center!important;
        gap:8px!important;
      }
      .sidebar-controls #sidebarToggle{order:1!important;}
      .sidebar-controls #navCollapseRestoreAll{order:2!important;}
      .sidebar-controls #sidebarPin{order:3!important;margin-left:auto!important;}
      .sidebar-controls #navCollapseRestoreAll{
        min-width:36px!important;
        width:36px!important;
        padding:4px 0!important;
        font-size:17px!important;
        font-weight:900!important;
        line-height:1!important;
        text-align:center!important;
      }
      body.sidebar-collapsed .sidebar-controls{
        flex-direction:column!important;
        align-items:center!important;
      }
      body.sidebar-collapsed .sidebar-controls #sidebarPin{margin-left:0!important;}

      body.nav-all-groups-collapsed #membersSubmenu,
      body.nav-all-groups-collapsed #shoppingSubmenu,
      body.nav-all-groups-collapsed #financeSubmenu,
      body.nav-all-groups-collapsed #settingsSubmenu,
      #membersSubmenu[hidden],
      #shoppingSubmenu[hidden],
      #financeSubmenu[hidden],
      #settingsSubmenu[hidden]{
        display:none!important;
      }

      .symbol-title-toggle-wide{
        width:auto!important;
        min-width:190px!important;
        max-width:none!important;
        padding:5px 12px!important;
        white-space:nowrap!important;
        text-align:left!important;
      }
    `;
    document.head.appendChild(st);
  }

  function apply(){
    addCss();
    installNavQuickButton();
    fixMenuParents();
    updateNavQuickButton();
    fixSymbolSummaryButtonText();
  }

  function wrapAfter(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn._phase9105Wrapped) return;
    window[name] = function(){
      const result = fn.apply(this, arguments);
      setTimeout(apply, 0);
      setTimeout(apply, 80);
      return result;
    };
    window[name]._phase9105Wrapped = true;
  }

  document.addEventListener('DOMContentLoaded', function(){ setTimeout(apply, 0); });
  document.addEventListener('click', function(ev){
    if(ev.target?.closest?.('#toggleDashboardSymbols,#dashboardSymbolSummary,#sidebarToggle,#membersMenuToggle,#shoppingMenuToggle,#financeMenuToggle,#settingsMenuToggle')){
      setTimeout(apply, 0);
      setTimeout(apply, 80);
      setTimeout(apply, 180);
    }
  }, true);

  setTimeout(apply, 30);
  setTimeout(apply, 250);
  setTimeout(apply, 900);
  ['renderDashboard','renderDashboardSymbolSummary','renderAll','showView','applySession'].forEach(wrapAfter);
})();

/* ===== 57_phase910_34_master_stability_rebuild.js ===== */
/* Phase 9.10.34 – Master-Stabilisierung nach Patch-Konflikten
   Ziel: alte Intervall-/Observer-Konflikte umgehen, Navigation/Timer/Inventar zentral und stabil steuern. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const toastSafe=(m,t='info')=>{ try{ if(typeof window.toast==='function') window.toast(m,t); }catch(_){} };
  const saveSafe=()=>{ try{ if(typeof window.saveState==='function') window.saveState(); else localStorage.setItem('kngState',JSON.stringify(window.state||{})); }catch(_){} };

  const ICON_ORDER=[
    {key:'dashboard', type:'view', value:'dashboard', title:'Dashboard', icon:'🏠'},
    {key:'members', type:'view', value:'members', title:'Mitglieder', icon:'👥'},
    {key:'workwear', type:'view', value:'workwear', title:'Dienstkleidung', icon:'🧥'},
    {key:'orders', type:'view', value:'orders', title:'Einkauf / Bestellungen', icon:'🛒'},
    {key:'activities', type:'view', value:'activities', title:'Aktivitäten / Ausflüge', icon:'🚌'},
    {key:'donations', type:'view', value:'donations', title:'Finanzen / Spenden', icon:'💝'},
    {key:'communication', type:'view', value:'communication', title:'Kommunikation', icon:'✉️'},
    {key:'documents', type:'view', value:'documents', title:'Dokumentenmanagement', icon:'📁'},
    {key:'secretariat', type:'view', value:'secretariat', title:'Sekretariat', icon:'🪑'},
    {key:'inventoryOpen', type:'action', value:'inventoryOpen', title:'Inventarverwaltung', icon:'📦'},
    {key:'systemCheck', type:'view', value:'systemCheck', title:'Systemcheck', icon:'✅'},
    {key:'protocol', type:'view', value:'protocol', title:'Protokoll', icon:'📋'},
    {key:'pinboard', type:'view', value:'pinboard', title:'Pinnwand', icon:'📌'},
    {key:'logout', type:'action', value:'logout', title:'Logout', icon:'🚪'}
  ];
  const DEFAULT_NAV=['dashboard','members','workwear','orders','activities','donations','communication','documents','secretariat','inventoryOpen','systemCheck','protocol','logout'];
  /* ERGAENZT 01.09.2026 aus der Papier-Inventarliste: die echten Standorte des Vereins
     (Bahnhof, Huette, kleine Huette), die Kategorie "Sicherheit" fuer die Feuerloescher und
     der Status "zu pruefen" fuer Zeilen, die bei der Aufnahme nicht bestaetigt wurden.
     "Andrea" auf dem Papier ist eine PERSON - der Standort heisst deshalb "bei Mitglied",
     der Name steht in der Bemerkung des Eintrags. */
  const INV_COMBOS=[
    {key:'inventoryCategories',label:'Inventarkategorien',values:['','Küchengeräte','Möbel','Technik','Werkzeug','Dekoration','Sicherheit','Sonstiges']},
    {key:'inventorySuppliers',label:'Lieferanten',values:['','Metro','Selgros','REWE','EDEKA','Amazon','Fachhandel']},
    {key:'inventoryManufacturers',label:'Hersteller',values:['','Bartscher','Rational','MKN','Samsung','Bosch','Sonstige']},
    {key:'inventoryLocations',label:'Standorte',values:['','Vereinsheim','Lager','Küche','Kühlraum','Außenlager','bei Mitglied','Bahnhof','Hütte','kleine Hütte']},
    {key:'inventoryConditions',label:'Zustand',values:['','neu','gut','gebraucht','reparaturbedürftig','defekt']},
    {key:'inventoryStatus',label:'Status',values:['','aktiv','in Reparatur','ausgemustert','verliehen','verloren','zu prüfen']},
    {key:'inventoryAssetTypes',label:'Vermögensart',values:['','Anlagevermögen','Umlaufvermögen','Geringwertiges Wirtschaftsgut']},
    {key:'inventoryDisposalTypes',label:'Ausmusterung/Verbleib',values:['','Schrott','entsorgt','verkauft','verschenkt','verloren']}
  ];

  let manualDeadline=Number(sessionStorage.getItem('kngManualAutoLogoutDeadlineFinal934')||0)||0;
  let manualTimer=null;
  let navRestoreState=null;
  let allCollapsed=false;

  function ensureState(){
    window.state=window.state||{};
    state.settings=state.settings||{};
    state.combos=state.combos||{};
    state.inventory=Array.isArray(state.inventory)?state.inventory:[];
    if(!Array.isArray(state.settings.navIcons)) state.settings.navIcons=DEFAULT_NAV.slice();
    DEFAULT_NAV.forEach(k=>{ if(!state.settings.navIcons.includes(k)) state.settings.navIcons.push(k); });
    if(!state.settings.navIcons.includes('logout')) state.settings.navIcons.push('logout');
    if(state.settings.inventoryPurchaseThreshold===undefined || state.settings.inventoryPurchaseThreshold===null || state.settings.inventoryPurchaseThreshold==='') state.settings.inventoryPurchaseThreshold=200;
    INV_COMBOS.forEach(c=>{ if(!Array.isArray(state.combos[c.key])) state.combos[c.key]=c.values.slice(); });
    ensureComboGroup();
  }

  function ensureComboGroup(){
    try{
      if(typeof COMBO_GROUPS!=='undefined' && Array.isArray(COMBO_GROUPS)){
        let g=COMBO_GROUPS.find(x=>x && x.title==='Inventarverwaltung');
        if(!g){ g={title:'Inventarverwaltung',items:[]}; COMBO_GROUPS.push(g); }
        INV_COMBOS.forEach(c=>{ if(!g.items.some(i=>i.key===c.key)) g.items.push({key:c.key,label:c.label}); });
      }
    }catch(_){ }
  }

  function css(){
    if($('#kng934Css')) return;
    const st=document.createElement('style'); st.id='kng934Css';
    st.textContent=`
      body{overflow-x:hidden!important;}
      .sidebar{overflow-x:hidden!important;}
      .quick-icons{display:flex!important;flex-wrap:wrap!important;gap:8px!important;align-items:center!important;align-content:flex-start!important;justify-content:flex-start!important;width:100%!important;max-width:100%!important;overflow:hidden!important;box-sizing:border-box!important;padding:0!important;}
      .quick-icons button{width:36px!important;height:36px!important;min-width:36px!important;max-width:36px!important;flex:0 0 36px!important;padding:0!important;margin:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:10px!important;font-size:17px!important;line-height:1!important;transition:none!important;transform:none!important;}
      .quick-icons button[data-kng-icon-key="logout"]{order:9999!important;}
      .quick-icons button.kng-hidden-by-setting{display:none!important;}
      body.sidebar-collapsed .quick-icons{flex-direction:column!important;flex-wrap:nowrap!important;align-items:center!important;}
      body.sidebar-collapsed .quick-icons button{width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;flex-basis:42px!important;}
      .sidebar-controls{display:flex!important;gap:8px!important;align-items:center!important;flex-wrap:nowrap!important;}
      .sidebar-control-tool{width:36px!important;height:36px!important;min-width:36px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:17px!important;}
      .quick-icons [data-kng-icon-key='collapseAll'],.quick-icons [data-kng-icon-key='assistantMagic']{display:none!important;}
      #autoLogoutCountdown{display:inline-flex!important;visibility:visible!important;pointer-events:auto!important;min-width:112px!important;justify-content:center!important;align-items:center!important;border-radius:999px!important;padding:4px 10px!important;font-weight:900!important;cursor:pointer!important;user-select:none!important;color:#fff!important;background:rgba(255,255,255,.16)!important;}
      #autoLogoutCountdown.kng934-timer-active{background:#c96f00!important;color:#fff8e8!important;box-shadow:0 0 0 1px rgba(255,255,255,.45) inset!important;}
      #autoLogoutCountdown.kng934-timer-warning{background:#b00020!important;color:#fff!important;box-shadow:0 0 0 2px rgba(255,255,255,.65) inset!important;}
      #inventoryV2 .tabs,#inventory .tabs{display:flex!important;gap:10px!important;align-items:center!important;flex-wrap:wrap!important;margin-bottom:14px!important;}
      #inventoryV2 .tab,#inventory .tab{position:relative!important;display:inline-flex!important;align-items:center!important;gap:8px!important;min-height:42px!important;border-radius:12px!important;padding:8px 14px!important;}
      .kng934-context-menu{position:fixed;z-index:99999;display:none;min-width:240px;background:#fff;border:1px solid #dfe8de;border-radius:0 14px 14px 14px;box-shadow:0 18px 36px rgba(0,0,0,.16);padding:10px 0;}
      .kng934-context-menu.open{display:block;}
      .kng934-context-menu button{display:block;width:100%;border:0;background:transparent;text-align:left;padding:10px 18px;font-weight:700;color:#1f2f23;cursor:pointer;border-radius:0;}
      .kng934-context-menu button:hover{background:#eef6ef;}
      #inventoryPurchaseThresholdMaster934{display:flex!important;flex-direction:column!important;gap:4px!important;min-width:150px!important;align-self:center!important;}
      #inventoryPurchaseThresholdMaster934 input{max-width:130px!important;}
      #inventoryV2 .inventory-compact-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px 12px;}
      #inventoryV2 label{font-size:13px;} #inventoryV2 input,#inventoryV2 select,#inventoryV2 textarea{padding:8px 10px;}
      #inventoryV2 .inventory-check-row{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:10px;}
      #inventoryV2 .inventory-check-row input[type="checkbox"]{width:15px;height:15px;min-width:15px;}
      #inventoryV2 .inventory-footer-buttons{margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;}
      @media(max-width:1100px){#inventoryV2 .inventory-compact-grid{grid-template-columns:repeat(2,minmax(150px,1fr));}}
    `;
    document.head.appendChild(st);
  }

  function gotoView(id){
    try{ if(typeof window.showView==='function') return window.showView(id); }catch(e){ console.warn(e); }
    try{
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
      if(id==='settings' && typeof window.renderSettings==='function') window.renderSettings();
    }catch(e){ console.warn(e); }
    return true;
  }
  function forceLogout(){
    window.__kngForceLogout934=true;
    try{ if(typeof window.logout==='function') window.logout(); else if(typeof window.showGuestHome==='function') window.showGuestHome(); }
    finally{ setTimeout(()=>{window.__kngForceLogout934=false;},0); }
  }
  function toggleAssistant(){
    const a=$('#assistant');
    if(a && a.classList.contains('active')) gotoView('dashboard'); else gotoView('assistant');
  }
  function setGroup(group,open){
    const toggle=$(group.t), sub=$(group.s), sign=$(group.p);
    if(!toggle||!sub) return;
    sub.classList.toggle('open-submenu',!!open);
    sub.classList.toggle('always-visible',!!open);
    toggle.setAttribute('aria-expanded',String(!!open));
    if(sign) sign.textContent=open?'−':'+';
  }
  const NAV_GROUPS=[{t:'#membersMenuToggle',s:'#membersSubmenu',p:'#membersMenuSign'},{t:'#shoppingMenuToggle',s:'#shoppingSubmenu',p:'#shoppingMenuSign'},{t:'#financeMenuToggle',s:'#financeSubmenu',p:'#financeMenuSign'},{t:'#settingsMenuToggle',s:'#settingsSubmenu',p:'#settingsMenuSign'}];
  function isOpen(g){ return $(g.s)?.classList.contains('open-submenu') || $(g.s)?.classList.contains('always-visible'); }
  function toggleAllNav(){
    if(allCollapsed){ NAV_GROUPS.forEach(g=>setGroup(g, navRestoreState?.[g.t]!==false)); allCollapsed=false; }
    else{ navRestoreState={}; NAV_GROUPS.forEach(g=>{navRestoreState[g.t]=isOpen(g); setGroup(g,false);}); allCollapsed=true; }
    renderQuickIcons();
  }
  function doAction(key){
    if(key==='logout') return forceLogout();
    if(key==='inventoryOpen') return openInventory();
    if(key==='assistantMagic') return toggleAssistant();
    if(key==='collapseAll') return toggleAllNav();
  }

  function renderQuickIcons(){
    ensureState();
    let quick=$('.quick-icons'); if(!quick) return;
    // Element austauschen: entfernt alte MutationObserver/Eventhandler von früheren Patchversionen.
    if(!quick.dataset.kng934Fresh){
      const clone=quick.cloneNode(false);
      clone.className=quick.className; clone.dataset.kng934Fresh='1';
      quick.replaceWith(clone); quick=clone;
    }
    let chosen=Array.isArray(state.settings.navIcons)?state.settings.navIcons.slice():[];
    chosen=chosen.filter(k=>k!=='logout').slice(0,14);
    chosen.push('logout');
    state.settings.navIcons=chosen;
    const selected=new Set(chosen);
    quick.innerHTML='';
    ICON_ORDER.forEach((def,idx)=>{
      if(def.key!=='logout' && !selected.has(def.key)) return;
      const b=document.createElement('button');
      b.type='button'; b.title=def.title; b.textContent=def.key==='collapseAll' && allCollapsed?'+':def.icon;
      b.dataset.kngIconKey=def.key; b.style.order=String(def.key==='logout'?9999:idx+1);
      if(def.type==='view') b.dataset.view=def.value; else b.dataset.action=def.value;
      quick.appendChild(b);
    });
  }
  function bindQuickDelegation(){
    if(document.__kng934QuickBound) return; document.__kng934QuickBound=true;
    document.addEventListener('click',ev=>{
      const b=ev.target.closest('.quick-icons button[data-kng-icon-key]'); if(!b) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      const key=b.dataset.kngIconKey;
      const def=ICON_ORDER.find(x=>x.key===key);
      if(!def) return;
      if(def.type==='view') gotoView(def.value); else doAction(key);
    },true);
  }
  function patchNavIconSettings(){
    ensureState(); const box=$('#navIconSettings'); if(!box) return;
    box.innerHTML=ICON_ORDER.filter(d=>d.key!=='logout').map(d=>`<label class="nav-icon-option"><input type="checkbox" data-nav-icon="${esc(d.key)}" ${(state.settings.navIcons||[]).includes(d.key)?'checked':''}> <span>${esc(d.icon)}</span> ${esc(d.title)}</label>`).join('');
    $$('input[data-nav-icon]',box).forEach(cb=>cb.addEventListener('change',()=>{
      let chosen=$$('input[data-nav-icon]:checked',box).map(i=>i.dataset.navIcon).filter(k=>k!=='logout').slice(0,14);
      if(!chosen.includes('logout')) chosen.push('logout');
      state.settings.navIcons=chosen; saveSafe(); renderQuickIcons();
    }));
  }

  function fmt(ms){ const s=Math.max(0,Math.ceil(ms/1000)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
  function paintTimer(){
    const el=$('#autoLogoutCountdown'); if(!el) return;
    el.classList.remove('kng934-timer-active','kng934-timer-warning');
    if(!manualDeadline || manualDeadline<=0){ el.textContent='Auto: aus'; return; }
    const left=manualDeadline-Date.now();
    if(left<=0){ manualDeadline=0; sessionStorage.removeItem('kngManualAutoLogoutDeadlineFinal934'); el.textContent='Auto: 0:00'; el.classList.add('kng934-timer-warning'); forceLogout(); return; }
    el.textContent='Auto: '+fmt(left);
    el.classList.add(left<=30000?'kng934-timer-warning':'kng934-timer-active');
  }
  function bindTimer(){
    const el=$('#autoLogoutCountdown'); if(!el || el.dataset.kng934TimerBound) return;
    el.dataset.kng934TimerBound='1';
    el.addEventListener('click',ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const cur=manualDeadline>Date.now()?Math.ceil((manualDeadline-Date.now())/60000):'';
      const v=prompt('Auto-Logout-Timer in Minuten eingeben. 0 = manuellen Timer ausschalten.',cur);
      if(v===null) return;
      const n=Math.max(0,Math.floor(Number(String(v).replace(',','.'))||0));
      if(manualTimer){ clearInterval(manualTimer); manualTimer=null; }
      if(n<=0){ manualDeadline=0; sessionStorage.removeItem('kngManualAutoLogoutDeadlineFinal934'); sessionStorage.removeItem('kngManualAutoLogoutDeadline'); paintTimer(); toastSafe('Manueller Auto-Timer ausgeschaltet.','info'); return; }
      manualDeadline=Date.now()+n*60000;
      sessionStorage.setItem('kngManualAutoLogoutDeadlineFinal934',String(manualDeadline));
      sessionStorage.setItem('kngManualAutoLogoutDeadline',String(manualDeadline));
      paintTimer(); manualTimer=setInterval(paintTimer,500); toastSafe('Manueller Auto-Timer gestartet.','success');
    },true);
    if(manualDeadline>Date.now() && !manualTimer) manualTimer=setInterval(paintTimer,500);
    paintTimer();
  }

  function ensureInventoryNav(){
    const fs=$('#financeSubmenu'); if(fs){
      let b=fs.querySelector('[data-view="inventoryV2"],.nav-inventory-v2-stable');
      if(!b){ b=document.createElement('button'); b.type='button'; b.className='nav nav-child nav-inventory-v2-stable'; b.dataset.view='inventoryV2'; b.textContent='Inventarverwaltung'; fs.appendChild(b); }
      b.dataset.view='inventoryV2'; b.textContent='Inventarverwaltung'; b.classList.remove('hidden'); b.style.display=''; b.style.visibility='';
    }
  }
  function ensureInventoryView(){
    let view=$('#inventoryV2');
    if(!view){
      view=document.createElement('section'); view.id='inventoryV2'; view.className='view inventory-master';
      const app=$('main.app')||$('main')||document.body; app.appendChild(view);
    }
    if(view.dataset.kng934Built==='1') return;
    view.dataset.kng934Built='1';
    view.innerHTML=`
      <div class="panel-head"><div><h3>Inventarverwaltung</h3><p>Wirtschaftsgüter, Standorte, Werte und Ausmusterungen verwalten.</p></div></div>
      <div class="tabs inventory-tabs">
        <button class="tab active" data-inv934-tab="card"><span class="kng934-inv-menu">☰</span><span>Artikelkarte</span></button>
        <button class="tab" data-inv934-tab="list"><span class="kng934-inv-menu">☰</span><span>Filter / Liste / Druck</span></button>
      </div>
      <div id="inv934Card" class="inventory-tab-panel active">
        <div class="form-grid inventory-compact-grid">
          <label>Inventar-Nr.<input id="inv934No" readonly></label>
          <label>Bezeichnung<input id="inv934Name"></label>
          <label>Kategorie<select id="inv934Category"></select></label>
          <label>Vermögensart<select id="inv934AssetType"></select></label>
          <label>Standort<select id="inv934Location"></select></label>
          <label>Hersteller<select id="inv934Manufacturer"></select></label>
          <label>Lieferant<select id="inv934Supplier"></select></label>
          <label>Zustand<select id="inv934Condition"></select></label>
          <label>Status<select id="inv934Status"></select></label>
          <label>Kaufdatum<input id="inv934PurchaseDate" type="date"></label>
          <label>Alter<input id="inv934Age" readonly></label>
          <label>Beschlossen am<input id="inv934ApprovedAt" type="date"></label>
          <label>Anschaffungspreis (€)<input id="inv934Price" type="number" min="0" step="0.01"></label>
          <label>Abschreibungsdauer (Jahre)<input id="inv934DepYears" type="number" min="0" step="1"></label>
          <label>Restwert (€)<input id="inv934Residual" readonly></label>
          <label>Repariert am<input id="inv934RepairedAt" type="date"></label>
          <label>Ausgemustert am<input id="inv934DisposedAt" type="date"></label>
          <label>Ausgemustert durch<input id="inv934DisposedBy"></label>
          <label>Ausmusterung wie<select id="inv934DisposalType"></select></label>
        </div>
        <div class="inventory-check-row">
          <label><input id="inv934Linear" type="checkbox"> Lineare Abschreibung</label>
          <label><input id="inv934Progressive" type="checkbox"> Progressive Abschreibung</label>
          <label><input id="inv934GWG" type="checkbox"> Geringwertiges Wirtschaftsgut</label>
        </div>
        <label>Bemerkungen<textarea id="inv934Notes" rows="2"></textarea></label>
      </div>
      <div id="inv934List" class="inventory-tab-panel hidden">
        <div class="form-grid">
          <label>Suche<input id="inv934FilterText" placeholder="Bezeichnung, Nummer, Standort..."></label>
          <label>Jahr<input id="inv934FilterYear" type="number" min="1900" max="2100"></label>
          <label>Kategorie<select id="inv934FilterCategory"></select></label>
          <label>Standort<select id="inv934FilterLocation"></select></label>
          <label>Status<select id="inv934FilterStatus"></select></label>
        </div>
        <div class="button-row"><button id="inv934Print" class="secondary" type="button">Drucken</button><button id="inv934ResetFilter" class="secondary" type="button">Filter zurücksetzen</button></div>
        <div class="table-wrap"><table><thead><tr><th>Nr.</th><th>Bezeichnung</th><th>Kategorie</th><th>Standort</th><th>Kaufdatum</th><th>Wert</th><th>Restwert</th><th>Status</th></tr></thead><tbody id="inv934Table"></tbody></table></div>
      </div>
      <div class="inventory-footer-buttons">
        <button id="inv934New" class="primary" type="button">Neu</button><button id="inv934Save" class="primary" type="button">Speichern</button><button id="inv934Delete" class="danger" type="button">Löschen</button>
        <button id="inv934First" class="secondary" type="button">Erster</button><button id="inv934Prev" class="secondary" type="button">Vorher</button><button id="inv934Next" class="secondary" type="button">Nächster</button><button id="inv934Last" class="secondary" type="button">Ende</button>
      </div>`;
    bindInventory();
  }
  function comboOptions(key){ return (state.combos[key]||['']).map(v=>`<option>${esc(v)}</option>`).join(''); }
  function fillInventoryCombos(){
    const map={inv934Category:'inventoryCategories',inv934AssetType:'inventoryAssetTypes',inv934Location:'inventoryLocations',inv934Manufacturer:'inventoryManufacturers',inv934Supplier:'inventorySuppliers',inv934Condition:'inventoryConditions',inv934Status:'inventoryStatus',inv934DisposalType:'inventoryDisposalTypes',inv934FilterCategory:'inventoryCategories',inv934FilterLocation:'inventoryLocations',inv934FilterStatus:'inventoryStatus'};
    Object.entries(map).forEach(([id,key])=>{ const el=$('#'+id); if(el) el.innerHTML=comboOptions(key); });
  }
  function currentInvIndex(){ const n=Number(sessionStorage.getItem('kngInv934Index')||0)||0; return Math.max(0,Math.min(n,(state.inventory||[]).length-1)); }
  function setInvIndex(i){ sessionStorage.setItem('kngInv934Index',String(Math.max(0,i))); }
  /* GEAENDERT beim Einlesen der Papier-Inventarliste (01.09.2026):
     Vorher wurde die naechste Nummer IMMER als 'INV-xxxx' gebildet, und die Ziffern kamen
     aus dem gesamten Nummerntext. Sobald die echten Vereinsnummern (KC-0001 ...) drin sind,
     ergab das zwei Probleme:
       - ein neu angelegter Artikel hiess plotzlich INV-0026, obwohl auf allen Geraeten
         KC-Nummern kleben,
       - bei Stuecknummern wie KC-0026-2 wurden die Ziffern zu "00262" verkettet, die
         naechste Nummer waere INV-0263 gewesen.
     Jetzt: das Praefix der vorhandenen Nummern wird uebernommen (KC-, sonst INV-), und
     gezaehlt wird nur der Hauptteil vor einem eventuellen Stueck-Zusatz. */
  function nextInvNo(){
    const alle=(state.inventory||[]).map(x=>String(x.no||'')).filter(Boolean);
    const praefix=(alle.find(x=>/^[A-Za-z]+-/.test(x))||'INV-').match(/^[A-Za-z]+-/)[0];
    const nums=alle.map(x=>Number((x.match(/(\d+)/)||[0,0])[1])||0);
    return praefix+String((Math.max(0,...nums)+1)).padStart(4,'0');
  }
  function ageText(d){ if(!d) return ''; const dt=new Date(d); if(isNaN(dt)) return ''; const months=(new Date().getFullYear()-dt.getFullYear())*12+(new Date().getMonth()-dt.getMonth()); return `${Math.max(0,Math.floor(months/12))} Jahre ${Math.max(0,months%12)} Monate`; }
  function residual(price,date,years){ price=Number(price)||0; years=Number(years)||0; if(!price||!years||!date) return price.toFixed(2); const m=(new Date().getFullYear()-new Date(date).getFullYear())*12+(new Date().getMonth()-new Date(date).getMonth()); return Math.max(0,price-(price/(years*12))*Math.max(0,m)).toFixed(2); }
  function readInv(){ return {no:$('#inv934No')?.value||nextInvNo(),name:$('#inv934Name')?.value||'',category:$('#inv934Category')?.value||'',assetType:$('#inv934AssetType')?.value||'',location:$('#inv934Location')?.value||'',manufacturer:$('#inv934Manufacturer')?.value||'',supplier:$('#inv934Supplier')?.value||'',condition:$('#inv934Condition')?.value||'',status:$('#inv934Status')?.value||'',purchaseDate:$('#inv934PurchaseDate')?.value||'',approvedAt:$('#inv934ApprovedAt')?.value||'',price:Number($('#inv934Price')?.value||0)||0,depYears:Number($('#inv934DepYears')?.value||0)||0,repairedAt:$('#inv934RepairedAt')?.value||'',disposedAt:$('#inv934DisposedAt')?.value||'',disposedBy:$('#inv934DisposedBy')?.value||'',disposalType:$('#inv934DisposalType')?.value||'',linear:!!$('#inv934Linear')?.checked,progressive:!!$('#inv934Progressive')?.checked,gwg:!!$('#inv934GWG')?.checked,notes:$('#inv934Notes')?.value||''}; }
  function writeInv(x){ x=x||{no:nextInvNo()}; fillInventoryCombos(); const v=(id,val)=>{const e=$('#'+id); if(e) e.value=val??'';}; v('inv934No',x.no||nextInvNo()); v('inv934Name',x.name); v('inv934Category',x.category); v('inv934AssetType',x.assetType); v('inv934Location',x.location); v('inv934Manufacturer',x.manufacturer); v('inv934Supplier',x.supplier); v('inv934Condition',x.condition); v('inv934Status',x.status); v('inv934PurchaseDate',x.purchaseDate); v('inv934ApprovedAt',x.approvedAt); v('inv934Price',x.price||''); v('inv934DepYears',x.depYears||''); v('inv934RepairedAt',x.repairedAt); v('inv934DisposedAt',x.disposedAt); v('inv934DisposedBy',x.disposedBy); v('inv934DisposalType',x.disposalType); v('inv934Notes',x.notes); const c=(id,val)=>{const e=$('#'+id); if(e) e.checked=!!val;}; c('inv934Linear',x.linear); c('inv934Progressive',x.progressive); c('inv934GWG',x.gwg); updateInvCalc(); }
  function updateInvCalc(){ const d=$('#inv934PurchaseDate')?.value||''; const p=$('#inv934Price')?.value||0; const y=$('#inv934DepYears')?.value||0; if($('#inv934Age')) $('#inv934Age').value=ageText(d); if($('#inv934Residual')) $('#inv934Residual').value=residual(p,d,y); }
  function saveInv(){ const item=readInv(); const threshold=Number(state.settings.inventoryPurchaseThreshold||0)||0; if(threshold>0 && item.price>threshold && !confirm(`Anschaffungspreis liegt höher als erlaubt (${threshold.toFixed(2)} €). Trotzdem eintragen?`)) return; const idx=(state.inventory||[]).findIndex(x=>x.no===item.no); if(idx>=0) state.inventory[idx]=item; else { state.inventory.push(item); setInvIndex(state.inventory.length-1); } saveSafe(); renderInvTable(); toastSafe('Inventar gespeichert.','success'); }
  /* GEAENDERT 01.09.2026: Wert und Restwert standen bei jedem Eintrag ohne Preis als
     "0.00" in der Liste. Das behauptet einen Wert von null - richtig waere "nicht erfasst".
     Bei der Papier-Inventarliste ist auf KEINEM Blatt ein Preis eingetragen; die Spalten
     haetten also durchgehend 0,00 angezeigt und den ganzen Vereinsbestand mit 0 bewertet.
     Jetzt steht dort ein Gedankenstrich, solange kein Preis hinterlegt ist. */
  function renderInvTable(){ const body=$('#inv934Table'); if(!body) return; const q=($('#inv934FilterText')?.value||'').toLowerCase(); const yr=$('#inv934FilterYear')?.value||''; const cat=$('#inv934FilterCategory')?.value||''; const loc=$('#inv934FilterLocation')?.value||''; const st=$('#inv934FilterStatus')?.value||''; const rows=(state.inventory||[]).filter(x=>(!q||Object.values(x).join(' ').toLowerCase().includes(q))&&(!yr||String(x.purchaseDate||'').startsWith(String(yr)))&&(!cat||x.category===cat)&&(!loc||x.location===loc)&&(!st||x.status===st)); body.innerHTML=rows.map(x=>`<tr data-inv-no="${esc(x.no)}"><td>${esc(x.no)}</td><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${esc(x.location)}</td><td>${esc(x.purchaseDate)}</td><td>${Number(x.price||0)?Number(x.price).toFixed(2):'—'}</td><td>${Number(x.price||0)?residual(x.price,x.purchaseDate,x.depYears):'—'}</td><td>${esc(x.status)}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">Keine Inventar-Einträge.</td></tr>'; }
  function bindInventory(){ fillInventoryCombos(); writeInv((state.inventory||[])[currentInvIndex()]||null); renderInvTable(); if($('#inventoryV2').dataset.kng934Bound==='1') return; $('#inventoryV2').dataset.kng934Bound='1';
    $('#inventoryV2').addEventListener('click',ev=>{
      const tab=ev.target.closest('[data-inv934-tab]'); if(tab){ $$('#inventoryV2 .tab').forEach(t=>t.classList.toggle('active',t===tab)); $('#inv934Card')?.classList.toggle('hidden',tab.dataset.inv934Tab!=='card'); $('#inv934Card')?.classList.toggle('active',tab.dataset.inv934Tab==='card'); $('#inv934List')?.classList.toggle('hidden',tab.dataset.inv934Tab!=='list'); $('#inv934List')?.classList.toggle('active',tab.dataset.inv934Tab==='list'); return; }
      const menu=ev.target.closest('.kng934-inv-menu'); if(menu){ ev.preventDefault(); ev.stopPropagation(); openInvMenu(menu); return; }
      if(ev.target.closest('#inv934New')){ writeInv({no:nextInvNo()}); return; }
      if(ev.target.closest('#inv934Save')) return saveInv();
      if(ev.target.closest('#inv934Delete')){ const no=$('#inv934No')?.value; if(no && confirm('Inventar-Eintrag löschen?')){ state.inventory=state.inventory.filter(x=>x.no!==no); setInvIndex(0); saveSafe(); writeInv((state.inventory||[])[0]||null); renderInvTable(); } return; }
      if(ev.target.closest('#inv934First')){ setInvIndex(0); writeInv(state.inventory[0]||null); return; }
      if(ev.target.closest('#inv934Prev')){ setInvIndex(currentInvIndex()-1); writeInv(state.inventory[currentInvIndex()]||null); return; }
      if(ev.target.closest('#inv934Next')){ setInvIndex(currentInvIndex()+1); writeInv(state.inventory[currentInvIndex()]||null); return; }
      if(ev.target.closest('#inv934Last')){ setInvIndex((state.inventory||[]).length-1); writeInv(state.inventory[currentInvIndex()]||null); return; }
      if(ev.target.closest('#inv934Print')){ window.print(); return; }
      if(ev.target.closest('#inv934ResetFilter')){ ['inv934FilterText','inv934FilterYear','inv934FilterCategory','inv934FilterLocation','inv934FilterStatus'].forEach(id=>{const e=$('#'+id); if(e) e.value='';}); renderInvTable(); }
      const row=ev.target.closest('tr[data-inv-no]'); if(row){ const idx=state.inventory.findIndex(x=>x.no===row.dataset.invNo); if(idx>=0){ setInvIndex(idx); writeInv(state.inventory[idx]); } }
    });
    ['inv934PurchaseDate','inv934Price','inv934DepYears'].forEach(id=>$('#'+id)?.addEventListener('input',updateInvCalc));
    ['inv934FilterText','inv934FilterYear','inv934FilterCategory','inv934FilterLocation','inv934FilterStatus'].forEach(id=>$('#'+id)?.addEventListener('input',renderInvTable));
    ['inv934FilterCategory','inv934FilterLocation','inv934FilterStatus'].forEach(id=>$('#'+id)?.addEventListener('change',renderInvTable));
  }
  function invMenuEl(){ let m=$('#kng934InventoryMenu'); if(m) return m; m=document.createElement('div'); m.id='kng934InventoryMenu'; m.className='kng934-context-menu'; m.innerHTML='<button data-act="print">Drucken</button><button data-act="pdf">PDF exportieren</button><button data-act="csv">CSV exportieren</button><button data-act="copy">Kopieren</button><button data-act="refresh">Aktualisieren</button><button data-act="reset">Filter zurücksetzen</button><button data-act="columns">Spalten anzeigen</button><button data-act="help">Hilfe anzeigen</button>'; document.body.appendChild(m); m.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]'); if(!b) return; ev.preventDefault(); m.classList.remove('open'); invMenuAction(b.dataset.act);}); return m; }
  function openInvMenu(anchor){ const m=invMenuEl(); const r=anchor.getBoundingClientRect(); m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-260))+'px'; m.style.top=(r.bottom+8)+'px'; m.classList.add('open'); }
  function invMenuAction(a){ if(a==='print'||a==='pdf'){window.print();return;} if(a==='copy'){navigator.clipboard?.writeText(($('#inventoryV2')?.innerText||'')).then(()=>toastSafe('Inventar kopiert.','success')).catch(()=>{});return;} if(a==='csv'){ const rows=$$('#inv934Table tr').map(tr=>$$('td,th',tr).map(td=>'"'+td.innerText.replace(/"/g,'""')+'"').join(';')).join('\n'); const blob=new Blob([rows],{type:'text/csv;charset=utf-8'}); const l=document.createElement('a'); l.href=URL.createObjectURL(blob); l.download='inventar.csv'; l.click(); setTimeout(()=>URL.revokeObjectURL(l.href),500); return;} if(a==='refresh'){renderInvTable();toastSafe('Inventar aktualisiert.');return;} if(a==='reset'){$('#inv934ResetFilter')?.click();return;} toastSafe(a==='help'?'Inventar: Artikelkarte pflegen, Filter/Liste auswerten und drucken.':'Funktion vorgemerkt.'); }
  function openInventory(){ ensureInventoryView(); gotoView('inventoryV2'); fillInventoryCombos(); renderInvTable(); }

  function thresholdBesideClock(){
    ensureState();
    // alle alten/duplizierten Einkaufsschwellenfelder entfernen
    $$('label,section,.combo-card,div').forEach(el=>{
      if(el.id==='inventoryPurchaseThresholdMaster934') return;
      if(/Einkaufsschwelle/i.test(el.textContent||'') && (el.id||el.className||'').toString().match(/inventory|threshold|combo-card|purchase/i)) el.remove();
    });
    const clock=$('.user-clock-switch'); if(!clock) return;
    let box=$('#inventoryPurchaseThresholdMaster934');
    if(!box){ box=document.createElement('label'); box.id='inventoryPurchaseThresholdMaster934'; box.innerHTML='Einkaufsschwelle (€)<input id="inventoryPurchaseThresholdInput934" type="number" min="0" step="0.01">'; clock.insertAdjacentElement('afterend',box); }
    const input=$('#inventoryPurchaseThresholdInput934'); if(input && document.activeElement!==input) input.value=state.settings.inventoryPurchaseThreshold??200;
    if(input && !input.dataset.kng934Bound){ input.dataset.kng934Bound='1'; input.addEventListener('change',()=>{ state.settings.inventoryPurchaseThreshold=Number(String(input.value||0).replace(',','.'))||0; saveSafe(); toastSafe('Einkaufsschwelle gespeichert.','success'); }); }
  }

  function renderSettingsWrapper(){
    ensureState(); ensureComboGroup();
    try{ if(typeof window.renderSettings==='function') window.renderSettings(); }catch(_){ }
    setTimeout(()=>{ ensureComboGroup(); patchNavIconSettings(); thresholdBesideClock(); try{ if($('#settingsCombos.active') && typeof window.renderComboManager==='function') window.renderComboManager(); }catch(_){} },0);
  }
  function patchShowView(){
    if(window.__kng934ShowPatched) return; window.__kng934ShowPatched=true;
    const old=window.showView;
    window.showView=function(id){
      if(id==='inventory' || id==='inventoryV2'){ ensureInventoryView(); id='inventoryV2'; }
      const r=typeof old==='function'?old.apply(this,[id]):true;
      if(id==='settings') setTimeout(()=>{ patchNavIconSettings(); thresholdBesideClock(); ensureComboGroup(); if($('#settingsCombos.active') && typeof window.renderComboManager==='function') window.renderComboManager(); },40);
      if(id==='inventoryV2') setTimeout(()=>{ ensureInventoryView(); fillInventoryCombos(); renderInvTable(); },40);
      return r;
    };
  }
  function patchLogout(){
    if(window.__kng934LogoutPatched) return; window.__kng934LogoutPatched=true;
    const old=window.logout;
    window.logout=function(){
      if(window.__kngSuppressLogout934 && !window.__kngForceLogout934) return false;
      return typeof old==='function'?old.apply(this,arguments):(typeof window.showGuestHome==='function'?window.showGuestHome():false);
    };
  }
  function bindGlobalNav(){
    if(document.__kng934GlobalNav) return; document.__kng934GlobalNav=true;
    document.addEventListener('click',ev=>{
      const inv=ev.target.closest('[data-view="inventory"],[data-view="inventoryV2"],[data-action="inventoryOpen"]');
      if(inv){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); openInventory(); return; }
      const nav=ev.target.closest('#mainNav .nav[data-view], #settingsSubmenu .nav[data-view]');
      if(nav){ setTimeout(()=>{ if(nav.dataset.view==='settings'){ patchNavIconSettings(); thresholdBesideClock(); } },50); }
      if(!ev.target.closest('.kng934-inv-menu,#kng934InventoryMenu')) $('#kng934InventoryMenu')?.classList.remove('open');
    },true);
    document.addEventListener('change',ev=>{ if(ev.target.closest('#settingsCombos')) setTimeout(()=>{ ensureComboGroup(); },0); },true);
  }

  function cleanupLegacyInventoryMenus(){
    // alte Inline-Menüs in Inventar aus früheren Phasen verstecken, damit kein Doppel-Hamburger entsteht
    $$('[class*="inventory-tab-menu"],[class*="kng-inv-menu-trigger"],#kngInventoryContextMenu932,#kngInventoryContextMenu931,#kngInventoryContextMenu930').forEach(el=>{ if(!el.classList.contains('kng934-inv-menu') && el.id!=='kng934InventoryMenu') el.remove(); });
  }



  function ensureTopTools935(){
    const controls=document.querySelector('.sidebar-controls');
    if(!controls) return;
    let collapse=document.getElementById('topCollapseAllMenus935');
    if(!collapse){
      collapse=document.createElement('button');
      collapse.id='topCollapseAllMenus935';
      collapse.className='sidebar-control sidebar-control-tool';
      collapse.type='button';
      collapse.title='Alle Menüs einklappen / wiederherstellen';
      collapse.textContent='±';
      const pin=document.getElementById('sidebarPin');
      (pin && pin.parentNode===controls ? pin : controls.lastElementChild)?.insertAdjacentElement('afterend',collapse);
    }
    let magic=document.getElementById('topAssistantMagic935');
    if(!magic){
      magic=document.createElement('button');
      magic.id='topAssistantMagic935';
      magic.className='sidebar-control sidebar-control-tool';
      magic.type='button';
      magic.title='Vereins-Assistent';
      magic.textContent='🪄';
      collapse.insertAdjacentElement('afterend',magic);
    }
    if(!collapse.dataset.kng935Bound){
      collapse.dataset.kng935Bound='1';
      collapse.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); toggleAllNav(); },true);
    }
    if(!magic.dataset.kng935Bound){
      magic.dataset.kng935Bound='1';
      magic.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); toggleAssistant(); },true);
    }
    // Aus Schnell-Icons entfernen, auch falls ältere Funktionen sie erneut erzeugen.
    document.querySelectorAll('.quick-icons [data-kng-icon-key="collapseAll"],.quick-icons [data-kng-icon-key="assistantMagic"],.quick-icons [data-action="collapseAll"],.quick-icons [data-action="assistantMagic"]').forEach(x=>x.remove());
  }

  function renderClaimsMembershipOverview935(){
    const body=document.getElementById('claimsMembershipOverviewBody');
    if(!body) return;
    const members=Array.isArray(window.state?.members)?window.state.members:[];
    const sorted=members.slice().sort((a,b)=>String(a.memberNo||'').localeCompare(String(b.memberNo||''),'de',{numeric:true}) || String(a.lastName||'').localeCompare(String(b.lastName||''),'de'));
    function fmtDate(v){ if(!v) return ''; try{ const d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString('de-DE'); }catch(_){ return String(v||''); } }
    function status(m){ try{ if(typeof window.memberStatus==='function') return window.memberStatus(m); }catch(_){} return m.status || m.memberStatus || (m.exitDate?'Ausgeschieden':'Aktiv'); }
    function duration(m){
      const start=new Date(m?.joinedAt||m?.entryDate||'');
      if(isNaN(start)) return {days:'',months:'',years:''};
      const end=m?.exitDate?new Date(m.exitDate):new Date();
      if(isNaN(end)||end<start) return {days:'',months:'',years:''};
      const days=Math.floor((end-start)/(1000*60*60*24));
      let months=(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
      if(end.getDate()<start.getDate()) months--;
      months=Math.max(0,months);
      return {days,months,years:Math.floor(months/12)};
    }
    body.innerHTML=sorted.map(m=>{ const d=duration(m); return `<tr><td>${esc(m.memberNo||'')}</td><td>${esc(m.lastName||'')}</td><td>${esc(m.firstName||'')}</td><td>${esc(status(m))}</td><td>${esc(fmtDate(m.joinedAt||m.entryDate))}</td><td>${esc(fmtDate(m.exitDate))}</td><td>${esc(d.days)}</td><td>${esc(d.months)}</td><td>${esc(d.years)}</td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">Keine Mitglieder vorhanden.</td></tr>';
    document.querySelectorAll('.membership-claims-overview').forEach(d=>{ d.open=true; d.style.display=''; });
  }

  function fixMemberSearchArrow935(){
    const btn=document.getElementById('memberSearchToggle');
    if(!btn) return;
    const search=document.querySelector('.member-search-panel,.member-search,.member-search-column,#memberSearchPanel');
    const collapsed=!!(search?.classList.contains('collapsed') || document.body.classList.contains('member-search-collapsed') || btn.getAttribute('aria-expanded')==='false');
    btn.textContent=collapsed?'≪':'›';
    btn.title=collapsed?'Suchmaske ausklappen':'Suchmaske einklappen';
  }

  function init(){
    ensureState(); css(); patchLogout(); patchShowView(); ensureInventoryNav(); ensureInventoryView(); renderQuickIcons(); ensureTopTools935(); bindQuickDelegation(); bindTimer(); bindGlobalNav(); patchNavIconSettings(); thresholdBesideClock(); cleanupLegacyInventoryMenus(); renderClaimsMembershipOverview935(); fixMemberSearchArrow935();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('load',()=>setTimeout(init,100));
  window.KNG934={renderQuickIcons,openInventory,patchNavIconSettings,thresholdBesideClock};
  window.KNG935={ensureTopTools935,renderClaimsMembershipOverview935,fixMemberSearchArrow935};
  document.addEventListener('click',()=>setTimeout(()=>{ensureTopTools935();renderClaimsMembershipOverview935();fixMemberSearchArrow935();},30),true);
  document.addEventListener('change',()=>setTimeout(()=>{renderClaimsMembershipOverview935();fixMemberSearchArrow935();},30),true);
})();

/* ===== 58_phase910_36_navigation_pinboard_inventory_search_fix.js ===== */
/* Phase 9.10.36 – Navigation/Assistent/Pinnwand/Inventar/Suchmaske Korrektur
   Baut auf dem Mastermodul 57 auf und korrigiert nur die genannten Punkte ohne alte Patchmodule wieder zu aktivieren. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const toastSafe=(m,t='info')=>{ try{ if(typeof window.toast==='function') window.toast(m,t); }catch(_){} };
  const saveSafe=()=>{ try{ if(typeof window.saveState==='function') window.saveState(); else localStorage.setItem('kngState',JSON.stringify(window.state||{})); }catch(_){} };

  function addCss(){
    if($('#kng936Css')) return;
    const st=document.createElement('style'); st.id='kng936Css';
    st.textContent=`
      .sidebar-controls{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:nowrap!important;justify-content:flex-start!important;}
      .sidebar-controls #sidebarToggle{order:1!important;margin:0!important;}
      .sidebar-controls #topCollapseAllMenus935,.sidebar-controls #topCollapseAllMenus936{order:2!important;margin:0!important;}
      .sidebar-controls #topAssistantMagic935,.sidebar-controls #topAssistantMagic936{order:3!important;margin:0!important;}
      .sidebar-controls #sidebarPin{order:4!important;margin-left:auto!important;}
      .sidebar-controls .sidebar-control,.sidebar-controls .sidebar-control-tool{width:36px!important;height:36px!important;min-width:36px!important;max-width:36px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;font-size:18px!important;line-height:1!important;border-radius:10px!important;}
      #topAssistantMagic936 .magic-wand-icon,#topAssistantMagic935 .magic-wand-icon{font-size:21px!important;line-height:1!important;display:block!important;}
      #assistant .panel-head{position:relative!important;}
      #assistantClose936{position:absolute!important;top:12px!important;right:12px!important;width:34px!important;height:34px!important;border-radius:10px!important;border:1px solid rgba(0,0,0,.12)!important;background:#fff!important;color:#1f3928!important;font-size:22px!important;font-weight:900!important;line-height:1!important;cursor:pointer!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;}
      #assistantClose936:hover{background:#eef6ef!important;}
      #memberSearchToggle{font-weight:900!important;line-height:1!important;min-width:34px!important;}
      #memberSearchToggle.kng936-big-arrow{font-size:1.45rem!important;}
      #memberSearchToggle.kng936-small-arrow{font-size:1.05rem!important;}
      #inventoryV2 .inventory-footer-buttons #inv934First,
      #inventoryV2 .inventory-footer-buttons #inv934Prev,
      #inventoryV2 .inventory-footer-buttons #inv934Next,
      #inventoryV2 .inventory-footer-buttons #inv934Last{min-width:42px!important;width:42px!important;padding:8px 0!important;text-align:center!important;font-size:18px!important;}
    `;
    document.head.appendChild(st);
  }

  function gotoView(id){
    try{ if(typeof window.showView==='function') return window.showView(id); }catch(e){ console.warn(e); }
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  }

  function toggleAssistant(){
    const a=$('#assistant');
    if(a && a.classList.contains('active')) gotoView('dashboard'); else gotoView('assistant');
  }

  function toggleAllNavFallback(){
    try{ if(window.KNG934 && typeof window.KNG934.renderQuickIcons==='function'){} }catch(_){}
    // Mastermodul-Funktion ist lokal, daher notfalls eigenes Minimalverhalten.
    const groups=[
      ['#membersMenuToggle','#membersSubmenu','#membersMenuSign'],
      ['#shoppingMenuToggle','#shoppingSubmenu','#shoppingMenuSign'],
      ['#financeMenuToggle','#financeSubmenu','#financeMenuSign'],
      ['#settingsMenuToggle','#settingsSubmenu','#settingsMenuSign']
    ];
    const collapsed=document.body.classList.toggle('kng936-nav-groups-collapsed');
    groups.forEach(([t,s,p])=>{
      const sub=$(s), tog=$(t), sign=$(p); if(!sub) return;
      if(collapsed){
        sub.dataset.kng936WasOpen=String(sub.classList.contains('open-submenu')||sub.classList.contains('always-visible'));
        sub.classList.remove('open-submenu','always-visible');
        tog?.setAttribute('aria-expanded','false'); if(sign) sign.textContent='+';
      }else{
        const was=sub.dataset.kng936WasOpen!=='false';
        sub.classList.toggle('open-submenu',was); sub.classList.toggle('always-visible',was);
        tog?.setAttribute('aria-expanded',String(was)); if(sign) sign.textContent=was?'−':'+';
      }
    });
  }

  function normalizeTopTools(){
    const controls=$('.sidebar-controls');
    if(!controls) return;
    const sidebarToggle=$('#sidebarToggle');
    const pin=$('#sidebarPin');

    // Alte/Duplikat-Buttons entfernen, dann definierte Buttons einmalig neu erzeugen.
    $$('#topCollapseAllMenus935,#topCollapseAllMenus936,#navCollapseRestoreAll').forEach(x=>x.remove());
    $$('#topAssistantMagic935,#topAssistantMagic936,#navAssistantWizard').forEach(x=>x.remove());

    const collapse=document.createElement('button');
    collapse.id='topCollapseAllMenus936'; collapse.className='sidebar-control sidebar-control-tool';
    collapse.type='button'; collapse.title='Alle Menüs einklappen / wiederherstellen'; collapse.textContent='±';

    const magic=document.createElement('button');
    magic.id='topAssistantMagic936'; magic.className='sidebar-control sidebar-control-tool';
    magic.type='button'; magic.title='Vereins-Assistent'; magic.innerHTML='<span class="magic-wand-icon" aria-hidden="true">🪄</span>';

    if(sidebarToggle && sidebarToggle.parentNode===controls){
      sidebarToggle.insertAdjacentElement('afterend',collapse);
      collapse.insertAdjacentElement('afterend',magic);
    }else{
      controls.insertBefore(collapse, controls.firstChild);
      collapse.insertAdjacentElement('afterend',magic);
    }
    if(pin && pin.parentNode===controls) controls.appendChild(pin);

    collapse.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      // Erst versuchen, den vorhandenen Masterbutton zu nutzen, sonst Fallback.
      try{ const master=$('#topCollapseAllMenus935'); if(master && master!==collapse){ master.click(); return; } }catch(_){}
      toggleAllNavFallback();
    },true);
    magic.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); toggleAssistant(); },true);

    // Aus Schnell-Icons entfernen, damit dort nur die normalen Bereichsicons bleiben.
    $$('.quick-icons [data-kng-icon-key="collapseAll"],.quick-icons [data-kng-icon-key="assistantMagic"],.quick-icons [data-action="collapseAll"],.quick-icons [data-action="assistantMagic"]').forEach(x=>x.remove());
  }

  function ensureAssistantClose(){
    const assistant=$('#assistant'); if(!assistant) return;
    let head=$('#assistant .panel-head');
    if(!head){
      const panel=$('#assistant .panel')||assistant;
      head=document.createElement('div'); head.className='panel-head';
      panel.insertBefore(head,panel.firstChild);
    }
    if(!$('#assistantClose936')){
      const b=document.createElement('button'); b.id='assistantClose936'; b.type='button'; b.title='Vereins-Assistent schließen'; b.textContent='×';
      head.appendChild(b);
      b.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); gotoView('dashboard'); },true);
    }
  }

  function bindPinboardShared(){
    const sw=$('#pinboardShared'); const scope=sw?.closest('.pinboard-scope');
    if(!sw) return;
    sw.disabled=false; sw.style.pointerEvents='auto'; if(scope) scope.style.pointerEvents='auto';
    if(sw.dataset.kng936Bound==='1') return; sw.dataset.kng936Bound='1';
    const apply=(checked)=>{
      window.state=window.state||{}; state.ui=state.ui||{};
      state.ui.pinboardShared=!!checked;
      try{
        const text=$('#pinboardText')?.value||'';
        if(checked){ state.ui.pinboardText=text; state.ui.pinboardEnabled=true; }
        else{
          const user=(state.currentUserId||state.currentUser||'guest');
          state.userPreferences=state.userPreferences||{};
          state.userPreferences[user]=state.userPreferences[user]||{};
          state.userPreferences[user].pinboard=state.userPreferences[user].pinboard||{};
          state.userPreferences[user].pinboard.text=text;
          state.userPreferences[user].pinboard.enabled=true;
        }
      }catch(_){}
      saveSafe();
      try{ if(typeof window.renderPinboard==='function') window.renderPinboard(); }catch(_){}
      sw.checked=!!checked;
      toastSafe(checked?'Pinnwand ist jetzt für alle sichtbar.':'Pinnwand ist jetzt nur für mich sichtbar.','info');
    };
    sw.addEventListener('click',ev=>{ ev.stopPropagation(); },true);
    sw.addEventListener('change',ev=>{ ev.stopPropagation(); ev.stopImmediatePropagation(); apply(sw.checked); },true);
    scope?.addEventListener('click',ev=>{
      if(ev.target===sw || ev.target.closest('.switch-slider')) return;
      ev.stopPropagation(); sw.checked=!sw.checked; apply(sw.checked);
    },true);
  }

  function setInventoryNavButtons(){
    const ids={inv934First:'⏮',inv934Prev:'◀',inv934Next:'▶',inv934Last:'⏭'};
    Object.entries(ids).forEach(([id,txt])=>{ const b=$('#'+id); if(b){ b.textContent=txt; b.title={inv934First:'Erster Eintrag',inv934Prev:'Vorheriger Eintrag',inv934Next:'Nächster Eintrag',inv934Last:'Letzter Eintrag'}[id]; b.setAttribute('aria-label',b.title); } });
  }

  function getMemberSearchPanel(){
    return $('.member-list') || $('.member-search-panel') || $('#memberSearchPanel');
  }
  function isMemberSearchCollapsed(){
    const p=getMemberSearchPanel();
    return !!(p && (p.classList.contains('member-search-collapsed') || p.classList.contains('collapsed') || document.body.classList.contains('member-search-panel-collapsed') || document.body.classList.contains('member-search-collapsed')));
  }
  function updateMemberSearchArrow(){
    const btn=$('#memberSearchToggle'); if(!btn) return;
    const collapsed=isMemberSearchCollapsed();
    btn.textContent=collapsed?'≫':'›';
    btn.classList.toggle('kng936-big-arrow',collapsed);
    btn.classList.toggle('kng936-small-arrow',!collapsed);
    btn.title=collapsed?'Suchmaske ausklappen':'Suchmaske einklappen';
    btn.setAttribute('aria-expanded',String(!collapsed));
  }
  function bindMemberSearchToggleImmediate(){
    const btn=$('#memberSearchToggle'); if(!btn || btn.dataset.kng936ToggleBound==='1') return;
    btn.dataset.kng936ToggleBound='1';
    btn.addEventListener('click',()=>{
      // Nach den vorhandenen Handlern sofort neu lesen und setzen.
      setTimeout(updateMemberSearchArrow,0);
      setTimeout(updateMemberSearchArrow,35);
    },true);
    updateMemberSearchArrow();
  }

  function ensureCurrentMemberSelectedForCollapsedActions(){
    if(!isMemberSearchCollapsed()) return;
    try{
      if(typeof selectedMemberIds!=='undefined' && selectedMemberIds instanceof Set && selectedMemberIds.size>0) return;
      if(typeof currentMemberId!=='undefined' && currentMemberId){ selectedMemberIds.add(currentMemberId); return; }
      const cur=$('#membersTable tr.member-row-current')?.dataset.id || $('#memberNo')?.dataset?.memberId || '';
      if(cur && typeof selectedMemberIds!=='undefined' && selectedMemberIds instanceof Set) selectedMemberIds.add(cur);
    }catch(_){ }
  }
  function bindCollapsedMemberIconFallback(){
    if(document.__kng936MemberBulkFallback) return; document.__kng936MemberBulkFallback=true;
    document.addEventListener('click',ev=>{
      const b=ev.target.closest('#memberPrintSelected,#memberEmailSelected,#memberPhoneSelected,#memberAddressSelected,#memberCommSelected');
      if(!b) return;
      ensureCurrentMemberSelectedForCollapsedActions();
    },true);
  }

  function observeAndRefresh(){
    const p=getMemberSearchPanel();
    if(p && !p.dataset.kng936Observed){
      p.dataset.kng936Observed='1';
      new MutationObserver(()=>updateMemberSearchArrow()).observe(p,{attributes:true,attributeFilter:['class','style']});
    }
    document.body.dataset.kng936ObservedBody || (document.body.dataset.kng936ObservedBody='1', new MutationObserver(()=>updateMemberSearchArrow()).observe(document.body,{attributes:true,attributeFilter:['class']}));
  }

  function init(){
    addCss();
    normalizeTopTools();
    ensureAssistantClose();
    bindPinboardShared();
    setInventoryNavButtons();
    bindMemberSearchToggleImmediate();
    bindCollapsedMemberIconFallback();
    observeAndRefresh();
    updateMemberSearchArrow();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('load',()=>setTimeout(init,100));
  document.addEventListener('click',()=>setTimeout(()=>{normalizeTopTools();ensureAssistantClose();bindPinboardShared();setInventoryNavButtons();bindMemberSearchToggleImmediate();updateMemberSearchArrow();},40),true);
  document.addEventListener('change',()=>setTimeout(()=>{bindPinboardShared();setInventoryNavButtons();updateMemberSearchArrow();},40),true);
})();

/* ===== 64_vollmigration_test06_core_ui_stable.js ===== */
/* Vollmigration Test 06 – stabile Kernintegration Layout/Schließen/Zähler/Resizer
   Ersetzt Test-05-Observer/Intervall-Logik. Keine DOM-Endlosschleife, keine laufende Neuzeichnung. */
(function(){
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  let refreshScheduled = false;

  function scheduleRefresh(){
    if(refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      ensureViewControls();
      ensureSearchBottomHandles();
      updateMemberCounter();
      updateAddressCounter();
      updateEmptyDesktop();
    });
  }

  function updateEmptyDesktop(){
    const empty = $('#emptyDesktop');
    if(!empty) return;
    const club = (window.state?.settings?.clubName || 'Köcheclub').trim() || 'Köcheclub';
    const nameEl = $('#emptyClubName');
    const sinceEl = $('#emptySinceLine');
    if(nameEl && nameEl.textContent !== club) nameEl.textContent = club;
    /* BEFUND 02.09.2026 (Betreiber): unter der grossen Kochmuetze stand "since --" statt
       "seit 1991 · 35 Jahre" - also englisch UND ohne Jahreszahl. Genau das ist der
       Bildschirm, den der Raum zwischen zwei Fenstern sieht.
       URSACHE: ZWEI Stellen beschrieben dieselbe Zeile. applyClubBranding() setzte sie
       richtig ueber foundedYearInfo(); diese Funktion hier setzte sie danach wieder falsch -
       sie las clubSince/since, zwei Felder, die es in den Stammdaten gar nicht gibt (das
       Gruendungsdatum steht in clubFoundedAt), und schrieb den englischen Vorsatz dazu.
       Sie lief zudem bei jedem Fensterwechsel, also gewann immer die falsche.
       JETZT dieselbe eine Quelle wie oben links in der Seitenleiste. */
    const sinceText = (typeof window.foundedYearInfo === 'function')
      ? window.foundedYearInfo()
      : 'seit --';
    if(sinceEl && sinceEl.textContent !== sinceText) sinceEl.textContent = sinceText;
    const hasActive = !!$('.view.active');
    empty.classList.toggle('hidden', hasActive);
  }

  function closeCurrentView(view){
    if(!view) return;
    if(typeof window.canLeaveCurrentView === 'function' && !window.canLeaveCurrentView('')) return;
    view.classList.remove('active');
    $$('.nav[data-view]').forEach(n => n.classList.remove('active'));
    scheduleRefresh();
  }

  function ensureViewControls(){
    $$('.view').forEach(view => {
      if(view.id === 'guestHome') return;
      if(!view.querySelector(':scope > .view-close-button')){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'view-close-button';
        btn.title = 'Fenster schließen';
        btn.setAttribute('aria-label','Fenster schließen');
        btn.textContent = '×';
        btn.addEventListener('click', ev => {
          ev.preventDefault();
          ev.stopPropagation();
          closeCurrentView(view);
        });
        view.insertBefore(btn, view.firstChild);
      }
      if(!view.querySelector(':scope > .view-resize-handle')){
        const handle = document.createElement('div');
        handle.className = 'view-resize-handle';
        handle.title = 'Fensterhöhe ziehen';
        handle.setAttribute('aria-hidden','true');
        view.appendChild(handle);
      }
    });
  }

  function selectedMemberCount(){ return $$('#membersTable input.member-row-select:checked').length; }
  function visibleMemberCount(){ return $$('#membersTable tr[data-id]').length; }

  function updateMemberCounter(){
    const counter = $('#memberSearchCounter');
    if(!counter) return;
    const selected = selectedMemberCount();
    const total = visibleMemberCount();
    const txt = `${selected}/${total}`;
    if(counter.textContent !== txt) counter.textContent = txt;
    counter.title = `${selected} markiert von ${total} sichtbaren Mitgliedern`;
  }

  function ensureAddressCounter(){
    const panel = $('#addresses .address-search-panel');
    if(!panel || $('#addressSearchCounter')) return;
    const anchor = panel.querySelector('h4, h3, .list-head h4');
    if(anchor){
      const counter = document.createElement('span');
      counter.id = 'addressSearchCounter';
      counter.className = 'search-result-counter';
      counter.textContent = '0/0';
      anchor.insertAdjacentElement('afterend', counter);
      anchor.parentElement?.classList.add('address-search-title-row');
    }
  }

  function updateAddressCounter(){
    ensureAddressCounter();
    const counter = $('#addressSearchCounter');
    if(!counter) return;
    const rows = $$('#addrSearchTable tr[data-id], #addressSearchTable tr[data-id], #addresses tbody tr[data-id]');
    const selected = $$('#addresses input[type="checkbox"]:checked').length;
    const total = rows.length;
    const txt = `${selected}/${total}`;
    if(counter.textContent !== txt) counter.textContent = txt;
    counter.title = `${selected} markiert von ${total} sichtbaren Adressen`;
  }

  function ensureSearchBottomHandles(){
    [$('.member-list.panel'), $('#addresses .address-search-panel')].filter(Boolean).forEach(target => {
      if(!target.querySelector(':scope > .search-bottom-handle')){
        const handle = document.createElement('div');
        handle.className = 'search-bottom-handle';
        handle.title = 'Suchmaske höher/tiefer ziehen';
        handle.setAttribute('aria-hidden','true');
        target.appendChild(handle);
      }
    });
  }

  function installDragResize(){
    if(window.__kngStableResizeInstalled) return;
    window.__kngStableResizeInstalled = true;
    document.addEventListener('pointerdown', ev => {
      const handle = ev.target.closest('.view-resize-handle,.search-bottom-handle');
      if(!handle) return;
      const box = handle.classList.contains('view-resize-handle') ? handle.closest('.view') : handle.parentElement;
      if(!box) return;
      const startY = ev.clientY;
      const startH = box.getBoundingClientRect().height;
      const min = handle.classList.contains('view-resize-handle') ? 220 : 260;
      const max = Math.max(360, window.innerHeight - 80);
      function move(e){
        const h = Math.max(min, Math.min(max, startH + (e.clientY - startY)));
        box.style.height = `${h}px`;
        box.style.maxHeight = `${max}px`;
        box.style.overflow = 'auto';
      }
      function up(){
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.classList.remove('is-resizing');
      }
      document.body.classList.add('is-resizing');
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      ev.preventDefault();
    }, true);
  }

  function enhanceShowView(){
    if(window.__kngTest06ShowViewEnhanced) return;
    window.__kngTest06ShowViewEnhanced = true;
    const oldShow = window.showView;
    if(typeof oldShow === 'function'){
      window.showView = function(){
        const result = oldShow.apply(this, arguments);
        scheduleRefresh();
        return result;
      };
    }
    const oldGuest = window.showGuestHome;
    if(typeof oldGuest === 'function'){
      window.showGuestHome = function(){
        const result = oldGuest.apply(this, arguments);
        scheduleRefresh();
        return result;
      };
    }
  }

  function enhanceRenderers(){
    if(!window.__kngTest06RenderMembersEnhanced && typeof window.renderMembers === 'function'){
      window.__kngTest06RenderMembersEnhanced = true;
      const old = window.renderMembers;
      window.renderMembers = function(){
        const result = old.apply(this, arguments);
        scheduleRefresh();
        return result;
      };
    }
    if(!window.__kngTest06RenderAddressesEnhanced && typeof window.renderAddressSearch === 'function'){
      window.__kngTest06RenderAddressesEnhanced = true;
      const old = window.renderAddressSearch;
      window.renderAddressSearch = function(){
        const result = old.apply(this, arguments);
        scheduleRefresh();
        return result;
      };
    }
  }

  function bindEvents(){
    if(window.__kngTest06EventsBound) return;
    window.__kngTest06EventsBound = true;
    document.addEventListener('change', ev => {
      if(ev.target.closest('#membersTable') || ev.target.id === 'memberSelectAllVisible' || ev.target.closest('#addresses')) scheduleRefresh();
    }, true);
    document.addEventListener('input', ev => {
      if(ev.target.id === 'memberSearch' || ev.target.closest('#addresses')) scheduleRefresh();
    }, true);
    document.addEventListener('click', ev => {
      if(ev.target.closest('.tab, .nav, .menu-item, button')) scheduleRefresh();
    }, true);
  }

  function init(){
    enhanceShowView();
    enhanceRenderers();
    bindEvents();
    installDragResize();
    scheduleRefresh();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

/* ===== Vollmigration Test 09 – integrierte Navigation/Suchmasken-Kernbereinigung ===== */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const save=()=>{ try{ window.saveState?.(); }catch(_){} };
  const toast=(m,t='info')=>{ try{ window.toast?.(m,t); }catch(_){} };

  function currentPrefs(){
    window.state=window.state||{};
    state.userPrefs=state.userPrefs||{};
    const key=(typeof currentUserPreferenceKey==='function'?currentUserPreferenceKey():null) || state.session?.userName || 'guest';
    state.userPrefs[key]=state.userPrefs[key]||{};
    return state.userPrefs[key];
  }
  const groups=[
    {toggle:'membersMenuToggle', submenu:'membersSubmenu', sign:'membersMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'shoppingMenuToggle', submenu:'shoppingSubmenu', sign:'shoppingMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'financeMenuToggle', submenu:'financeSubmenu', sign:'financeMenuSign', openClass:'open-submenu', extraClass:'always-visible'},
    {toggle:'settingsMenuToggle', submenu:'settingsSubmenu', sign:'settingsMenuSign', openClass:'open', extraClass:null}
  ];
  function groupOpen(g){
    const t=$('#'+g.toggle), s=$('#'+g.submenu);
    return !!(t&&s&&(t.getAttribute('aria-expanded')==='true'||s.classList.contains(g.openClass)||g.extraClass&&s.classList.contains(g.extraClass)));
  }
  function setGroup(g,open){
    const t=$('#'+g.toggle), s=$('#'+g.submenu), sign=$('#'+g.sign);
    if(!t||!s) return;
    s.classList.toggle(g.openClass,!!open);
    if(g.extraClass) s.classList.toggle(g.extraClass,!!open);
    s.style.display=open?'block':'none';
    t.setAttribute('aria-expanded',String(!!open));
    if(sign) sign.textContent=open?'−':'+';
  }
  function removeDuplicate(id){
    const nodes=$$('#'+id);
    nodes.slice(1).forEach(n=>n.remove());
    return nodes[0]||null;
  }
  function ensureTopTools(){
    const controls=$('.sidebar-controls');
    const sidebar=$('#sidebarToggle');
    if(!controls||!sidebar) return;
    removeDuplicate('navCollapseRestoreAll');
    removeDuplicate('assistantQuickTop');
    $$('.quick-icons [data-kng-icon-key="collapseAll"],.quick-icons [data-kng-icon-key="assistantMagic"],.quick-icons [data-action="collapseAll"],.quick-icons [data-action="assistantMagic"]').forEach(x=>x.remove());
    let collapse=$('#navCollapseRestoreAll');
    if(!collapse){
      collapse=document.createElement('button');
      collapse.id='navCollapseRestoreAll';
      collapse.type='button';
      collapse.className='sidebar-control nav-collapse-restore-all';
    }
    collapse.textContent=currentPrefs().navAllCollapsedByQuickButton?'+':'±';
    collapse.title=currentPrefs().navAllCollapsedByQuickButton?'Vorigen Menü-Zustand wiederherstellen':'Alle Menügruppen einklappen';
    collapse.setAttribute('aria-label',collapse.title);
    if(collapse.parentNode!==controls) controls.insertBefore(collapse, sidebar.nextSibling);
    else if(sidebar.nextSibling!==collapse) controls.insertBefore(collapse, sidebar.nextSibling);
    if(!collapse.dataset.kng09Bound){
      collapse.dataset.kng09Bound='1';
      collapse.addEventListener('click',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const p=currentPrefs();
        if(p.navAllCollapsedByQuickButton){
          const prev=p.navPreviousOpenState||{};
          groups.forEach(g=>setGroup(g,prev[g.toggle]===true));
          p.navAllCollapsedByQuickButton=false; p.navPreviousOpenState=null;
        }else{
          const prev={}; groups.forEach(g=>prev[g.toggle]=groupOpen(g));
          p.navPreviousOpenState=prev; groups.forEach(g=>setGroup(g,false)); p.navAllCollapsedByQuickButton=true;
        }
        collapse.textContent=p.navAllCollapsedByQuickButton?'+':'±';
        save();
      },true);
    }
    let assistant=$('#assistantQuickTop');
    if(!assistant){
      assistant=document.createElement('button');
      assistant.id='assistantQuickTop';
      assistant.type='button';
      assistant.className='sidebar-control assistant-quick-top';
      assistant.textContent='🪄';
      assistant.title='Vereins-Assistent öffnen/schließen';
    }
    if(assistant.parentNode!==controls) controls.insertBefore(assistant, collapse.nextSibling);
    else if(collapse.nextSibling!==assistant) controls.insertBefore(assistant, collapse.nextSibling);
    if(!assistant.dataset.kng09Bound){
      assistant.dataset.kng09Bound='1';
      assistant.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); if(typeof showView==='function') showView('assistant'); },true);
    }
    const pin=$('#sidebarPin');
    if(pin && pin.parentNode===controls && assistant.nextSibling!==pin) controls.insertBefore(pin, assistant.nextSibling);
  }
  function updateArrowButtons(){
    const sidebar=$('#sidebarToggle');
    if(sidebar){
      const collapsed=document.body.classList.contains('sidebar-collapsed');
      sidebar.textContent=collapsed?'›':'‹';
      sidebar.title=collapsed?'Navigation ausklappen':'Navigation einklappen';
    }
    const search=$('#memberSearchToggle');
    const layout=$('.member-layout');
    if(search && layout){
      const collapsed=layout.classList.contains('search-collapsed')||document.body.classList.contains('member-search-collapsed');
      search.textContent=collapsed?'≪':'›';
      search.title=collapsed?'Suchmaske ausklappen':'Suchmaske einklappen';
    }
  }
  function bindSearchToggle(){
    const btn=$('#memberSearchToggle');
    const layout=$('.member-layout');
    if(!btn||!layout||btn.dataset.kng09CleanBound==='1') return;
    btn.dataset.kng09CleanBound='1';
    btn.addEventListener('click',ev=>{
      ev.preventDefault(); ev.stopPropagation();
      layout.classList.toggle('search-collapsed');
      document.body.classList.toggle('member-search-collapsed', layout.classList.contains('search-collapsed'));
      updateArrowButtons();
    },true);
  }
  function limitQuickIcons(){
    const icons=$$('.quick-icons button:not(.hidden):not(.kng-hidden-by-setting)');
    icons.forEach((b,i)=>b.style.display=(i<15?'inline-flex':'none'));
    const logout=$('.quick-icons button[data-action="logout"]');
    if(logout){ logout.style.display='inline-flex'; logout.style.order='9999'; }
  }
  function updateMemberCounterClean(){
    const c=$('#memberSearchCounter');
    if(!c) return;
    const rows=$$('#membersTable tbody tr');
    const visible=rows.filter(r=>r.offsetParent!==null).length || rows.length;
    const selected=rows.filter(r=>r.querySelector('input[type="checkbox"]:checked')).length;
    c.textContent=`${selected}/${visible}`;
  }
  function ensureMailOpensCommunication(){
    const btn=$('#mailInboxBtn');
    if(!btn || btn.dataset.kng09CommunicationBound==='1') return;
    btn.dataset.kng09CommunicationBound='1';
    btn.addEventListener('click',ev=>{
      ev.preventDefault(); ev.stopPropagation();
      if(typeof showView==='function') showView('communication');
      if(typeof renderCommunication==='function') renderCommunication();
    },true);
  }
  function init(){
    ensureTopTools();
    bindSearchToggle();
    updateArrowButtons();
    limitQuickIcons();
    updateMemberCounterClean();
    ensureMailOpensCommunication();
    try{ applyClubBranding?.(); }catch(_){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  document.addEventListener('click',ev=>{
    if(ev.target.closest('#sidebarToggle,#memberSearchToggle,.quick-icons,#membersTable,#memberSelectAllVisible')) setTimeout(init,0);
  },true);
  document.addEventListener('change',ev=>{ if(ev.target.closest('#membersTable')||ev.target.id==='memberSelectAllVisible') setTimeout(updateMemberCounterClean,0); },true);
  document.addEventListener('input',ev=>{ if(ev.target.id==='memberSearch') setTimeout(updateMemberCounterClean,0); },true);
  ['showView','renderMembers','applySession','renderSettings'].forEach(name=>{
    const old=window[name];
    if(typeof old==='function' && !old.__kng09Integrated){
      window[name]=function(){ const r=old.apply(this,arguments); setTimeout(init,0); return r; };
      window[name].__kng09Integrated=true;
    }
  });
  setTimeout(init,150);
})();


/* Vollmigration Test 11 – zentrale Bereinigung Toptools und Pfeilbutton-Layer */
(function(){
  'use strict';
  const GROUPS=[
    {toggle:'membersMenuToggle',submenu:'membersSubmenu',sign:'membersMenuSign'},
    {toggle:'shoppingMenuToggle',submenu:'shoppingSubmenu',sign:'shoppingMenuSign'},
    {toggle:'financeMenuToggle',submenu:'financeSubmenu',sign:'financeMenuSign'},
    {toggle:'settingsMenuToggle',submenu:'settingsSubmenu',sign:'settingsMenuSign'}
  ];
  function $(id){return document.getElementById(id)}
  function prefs(){
    window.state=window.state||{}; window.state.userPrefs=window.state.userPrefs||{};
    const k=(window.state.session&& (window.state.session.userId||window.state.session.userName)) || 'guest';
    window.state.userPrefs[k]=window.state.userPrefs[k]||{};
    window.state.userPrefs[k].navigation=window.state.userPrefs[k].navigation||{};
    return window.state.userPrefs[k].navigation;
  }
  function isOpen(g){
    const t=$(g.toggle), s=$(g.submenu); if(!t||!s) return false;
    if(t.getAttribute('aria-expanded')==='false') return false;
    return t.getAttribute('aria-expanded')==='true' || s.classList.contains('open') || s.classList.contains('open-submenu') || s.classList.contains('always-visible') || s.style.display==='block';
  }
  function setOpen(g,open){
    const t=$(g.toggle), s=$(g.submenu), sign=$(g.sign); if(!t||!s) return;
    s.classList.toggle('open',!!open); s.classList.toggle('open-submenu',!!open); s.classList.toggle('always-visible',!!open);
    s.hidden=!open; s.style.display=open?'block':'none';
    t.setAttribute('aria-expanded',String(!!open)); if(sign) sign.textContent=open?'−':'+';
  }
  function bindOne(btn){
    if(!btn || btn.dataset.cleanMasterTopToolBound==='1') return;
    btn.dataset.cleanMasterTopToolBound='1';
    btn.addEventListener('click',function(ev){
      ev.preventDefault(); ev.stopPropagation();
      const p=prefs();
      if(p.navAllCollapsedByQuickButton){
        const prev=p.navPreviousOpenState||{};
        GROUPS.forEach(g=>setOpen(g, prev[g.toggle]!==false));
        p.navAllCollapsedByQuickButton=false; p.navPreviousOpenState=null;
      }else{
        const prev={}; GROUPS.forEach(g=>{prev[g.toggle]=isOpen(g); setOpen(g,false);});
        p.navPreviousOpenState=prev; p.navAllCollapsedByQuickButton=true;
      }
      btn.textContent=p.navAllCollapsedByQuickButton?'+':'±';
      try{ if(typeof window.saveState==='function') window.saveState(); }catch(_e){}
    }, true);
  }
  function normalizeTopTools(){
    const controls=document.querySelector('.sidebar-controls');
    const quick=document.querySelector('.quick-icons');
    if(!controls) return;
    let buttons=Array.from(document.querySelectorAll('#navCollapseRestoreAll, .nav-collapse-restore-all'));
    let btn=buttons.find(b=>controls.contains(b)) || buttons[0];
    buttons.forEach(b=>{ if(b!==btn) b.remove(); });
    if(!btn){
      btn=document.createElement('button');
      btn.id='navCollapseRestoreAll';
      btn.className='sidebar-control nav-collapse-restore-all';
      btn.type='button';
      btn.title='Alle Menügruppen einklappen / vorherigen Zustand wiederherstellen';
      btn.textContent='±';
    }
    if(btn.id!=='navCollapseRestoreAll') btn.id='navCollapseRestoreAll';
    btn.classList.add('sidebar-control','nav-collapse-restore-all');
    const toggle=$('sidebarToggle');
    if(toggle && toggle.nextSibling!==btn) controls.insertBefore(btn,toggle.nextSibling); else if(!controls.contains(btn)) controls.appendChild(btn);
    if(quick){
      Array.from(quick.querySelectorAll('#navCollapseRestoreAll,.nav-collapse-restore-all')).forEach(x=>x.remove());
    }
    btn.textContent=prefs().navAllCollapsedByQuickButton?'+':'±';
    bindOne(btn);
    const assist=$('assistantQuickTop'), pin=$('sidebarPin');
    if(toggle) toggle.style.order='1';
    btn.style.order='2';
    if(assist) assist.style.order='3';
    if(pin) pin.style.order='4';
  }
  function liftSearchToggle(){
    const b=$('memberSearchToggle');
    if(!b) return;
    b.style.zIndex='500'; b.style.opacity='1';
    b.style.background='#fff'; b.style.color='#255f3b';
  }
  function init(){
    normalizeTopTools();
    liftSearchToggle();
    [100,350,900,1700].forEach(ms=>setTimeout(()=>{normalizeTopTools(); liftSearchToggle();},ms));
    const controls=document.querySelector('.sidebar-controls');
    const quick=document.querySelector('.quick-icons');
    if(window.MutationObserver && (controls||quick)){
      const mo=new MutationObserver(()=>normalizeTopTools());
      if(controls) mo.observe(controls,{childList:true});
      if(quick) mo.observe(quick,{childList:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();


/* Vollmigration Test 14 – robuster Zähler für Mitgliedersuchmaske (v2: MutationObserver) */
(function(){
  'use strict';
  function $all(sel){return Array.from(document.querySelectorAll(sel));}
  let _scheduled=false;
  function scheduleUpdate(){
    if(_scheduled) return;
    _scheduled=true;
    Promise.resolve().then(()=>{ _scheduled=false; updateMemberSearchCounterV14(); });
  }
  function updateMemberSearchCounterV14(){
    const counter=document.getElementById('memberSearchCounter');
    if(!counter) return;
    const rows=$all('#membersTable tr[data-id]');
    let visible=rows.length;
    let selected=rows.filter(r=>r.querySelector('input.member-row-select:checked')).length;
    /* Fallback: Tabelle noch leer, aber state bereits befüllt */
    if(visible===0 && window.state && Array.isArray(window.state.members)){
      const q=(document.getElementById('memberSearch')?.value||'').trim().toLowerCase();
      const list=window.state.members.filter(m=>!q||`${m.memberNo||''} ${m.firstName||''} ${m.lastName||''} ${m.city||''} ${m.profession||''} ${m.email||''}`.toLowerCase().includes(q));
      visible=list.length;
      if(window.selectedMemberIds && typeof window.selectedMemberIds.forEach==='function'){
        const ids=new Set(list.map(m=>String(m.id)));
        window.selectedMemberIds.forEach(id=>{ if(ids.has(String(id))) selected++; });
      }
    }
    const txt=`${selected}/${visible}`;
    if(counter.textContent!==txt) counter.textContent=txt;
    counter.title=`${selected} markiert von ${visible} sichtbaren Mitgliedern`;
  }
  window.updateMemberSearchCounterV14=updateMemberSearchCounterV14;
  function bindCounterEvents(){
    if(document.body.dataset.kngV14MemberCounterBound==='1') return;
    document.body.dataset.kngV14MemberCounterBound='1';
    document.addEventListener('change',ev=>{
      if(ev.target.closest('#membersTable')||ev.target.id==='memberSelectAllVisible') scheduleUpdate();
    },true);
    document.addEventListener('input',ev=>{
      if(ev.target.id==='memberSearch') scheduleUpdate();
    },true);
    /* MutationObserver: reagiert zuverlässig auf jedes renderMembers()-innerHTML-Update */
    const tableBody=document.getElementById('membersTable');
    if(tableBody){
      new MutationObserver(scheduleUpdate).observe(tableBody,{childList:true,subtree:true});
    } else {
      /* Tabelle noch nicht im DOM: warten und dann beobachten */
      new MutationObserver((_,obs)=>{
        const tb=document.getElementById('membersTable');
        if(!tb) return;
        obs.disconnect();
        new MutationObserver(scheduleUpdate).observe(tb,{childList:true,subtree:true});
        scheduleUpdate();
      }).observe(document.body,{childList:true,subtree:true});
    }
  }
  function hookRenderMembers(){
    if(typeof window.renderMembers==='function' && !window.renderMembers.__kngV14CounterHook){
      const old=window.renderMembers;
      window.renderMembers=function(){ const r=old.apply(this,arguments); scheduleUpdate(); return r; };
      window.renderMembers.__kngV14CounterHook=true;
    }
  }
  function init(){
    bindCounterEvents();
    hookRenderMembers();
    scheduleUpdate();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();


/* Vollmigration Test 21 – finale Top-Tools-Normalisierung im Kernmodul.
   Verhindert dauerhaft doppelte ±-Schaltflächen, ohne Zusatzdatei. */
(function(){
  "use strict";
  function $(id){ return document.getElementById(id); }
  function normalizeTopToolsV21(){
    const controls=document.querySelector('.sidebar-controls');
    if(!controls) return;
    const toggle=$('sidebarToggle');
    let keep=$('navCollapseRestoreAll');
    if(!keep){
      keep=document.createElement('button');
      keep.id='navCollapseRestoreAll';
      keep.type='button';
      keep.title='Menüstruktur ein-/ausklappen';
      keep.textContent='±';
    }
    keep.className='sidebar-control nav-collapse-restore-all';
    keep.dataset.kngTopTool='collapseAll';
    document.querySelectorAll('#topCollapseAllMenus935,#topCollapseAllMenus936,.sidebar-controls .nav-collapse-restore-all,.quick-icons .nav-collapse-restore-all,.quick-icons [data-kng-icon-key="collapseAll"],.quick-icons [data-action="collapseAll"]').forEach(el=>{
      if(el!==keep) el.remove();
    });
    if(toggle && toggle.parentNode===controls){
      if(toggle.nextElementSibling!==keep) toggle.insertAdjacentElement('afterend', keep);
    }else if(!controls.contains(keep)){
      controls.insertBefore(keep, controls.firstChild);
    }
    keep.style.order='2';
    const assist=$('assistantQuickTop'), pin=$('sidebarPin');
    if(toggle) toggle.style.order='1';
    if(assist) assist.style.order='3';
    if(pin) pin.style.order='4';
    if(!keep.dataset.kngV21Bound){
      keep.dataset.kngV21Bound='1';
      keep.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        const parents=Array.from(document.querySelectorAll('#mainNav .nav-parent'));
        const anyOpen=parents.some(b=>b.getAttribute('aria-expanded')==='true');
        parents.forEach(btn=>{
          const id=btn.id||'';
          const submenu = id.includes('members') ? $('membersSubmenu') : id.includes('shopping') ? $('shoppingSubmenu') : id.includes('finance') ? $('financeSubmenu') : id.includes('settings') ? $('settingsSubmenu') : null;
          btn.setAttribute('aria-expanded', anyOpen ? 'false' : 'true');
          const sign=btn.querySelector('span'); if(sign) sign.textContent=anyOpen?'+':'−';
          if(submenu) submenu.classList.toggle('open-submenu', !anyOpen);
        });
        keep.textContent=anyOpen?'+':'±';
      }, true);
    }
  }
  function init(){
    normalizeTopToolsV21();
    [0,80,250,750].forEach(ms=>setTimeout(normalizeTopToolsV21,ms));
    if(window.MutationObserver){
      const target=document.querySelector('.sidebar-controls') || document.body;
      const mo=new MutationObserver(()=>normalizeTopToolsV21());
      mo.observe(target,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
