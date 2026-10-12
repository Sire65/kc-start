/*
  Clean Master Test 07 - Stammdaten/Timer/Pinnwand Kernmodul
  Konsolidiert Pinnwand, Symbolbibliothek, AutoTimer und sicherheitsnahe UI-Logik.
*/

/* ===== 16_pinboard_ui_fixes.js ===== */
/* Phase 9.9 – Pinnwand-Schalter, Leernachricht-Prüfung und Icon-Ausrichtung */
(function(){
  'use strict';

  function toastMsg(message, type){
    if(typeof window.toast === 'function') window.toast(message, type || 'info');
    else window.alert(message);
  }

  function saveStateSafe(){
    try{ if(typeof window.saveState === 'function') window.saveState(); }catch(_e){}
  }

  function currentPrefs(){
    try{
      const key = window.state?.session?.userName || 'Gast';
      window.state.userPrefs = window.state.userPrefs || {};
      window.state.userPrefs[key] = window.state.userPrefs[key] || {};
      return window.state.userPrefs[key];
    }catch(_e){ return {}; }
  }

  function isShared(){ return !!window.state?.ui?.pinboardShared; }

  function getPinData(){
    window.state.ui = window.state.ui || {};
    if(isShared()) return window.state.ui;
    const prefs = currentPrefs();
    if(!prefs.pinboard || typeof prefs.pinboard !== 'object'){
      prefs.pinboard = {enabled:false, text:'', x:null, y:null};
    }
    return prefs.pinboard;
  }

  function refreshPinboard(){
    try{
      if(typeof window.renderPinboard === 'function') window.renderPinboard();
      else if(typeof window.renderAll === 'function') window.renderAll();
    }catch(_e){}
  }

  function bindSharedSwitch(){
    const shared = document.getElementById('pinboardShared');
    const scope = shared?.closest('.pinboard-scope');
    if(!shared || !scope) return;

    // Das Post-it selbst ist verschiebbar. Eingaben innerhalb des Schalters dürfen
    // deshalb niemals den Drag-Handler des Post-its auslösen.
    ['pointerdown','mousedown','touchstart'].forEach(type=>{
      if(scope.dataset['stop'+type]) return;
      scope.dataset['stop'+type] = '1';
      scope.addEventListener(type, ev=>ev.stopPropagation(), true);
    });

    shared.disabled = false;
    shared.style.pointerEvents = 'auto';
    scope.style.pointerEvents = 'auto';

    // Frühere Handler werden nicht entfernt; dieser Handler stellt den Zustand
    // nach jedem Klick eindeutig her und verhindert ein Zurückspringen.
    if(!shared.dataset.robustBound){
      shared.dataset.robustBound = '1';
      shared.addEventListener('change', function(ev){
        ev.stopPropagation();
        window.state.ui = window.state.ui || {};
        window.state.ui.pinboardShared = !!shared.checked;
        saveStateSafe();
        setTimeout(refreshPinboard, 0);
        toastMsg(shared.checked ? 'Pinnwand ist jetzt für alle sichtbar.' : 'Pinnwand ist jetzt nur für mich sichtbar.', 'info');
      }, true);
    }
  }

  function bindEmptyNoteGuard(){
    const save = document.getElementById('savePinboardNote');
    const text = document.getElementById('pinboardText');
    if(!save || !text || save.dataset.emptyGuardBound) return;
    save.dataset.emptyGuardBound = '1';

    // Capture-Phase: verhindert, dass der ältere Speicher-Handler eine leere
    // Nachricht dennoch speichert.
    save.addEventListener('click', function(ev){
      if(String(text.value || '').trim()) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      toastMsg('Keine Nachricht vorhanden.', 'warning');
      text.focus();
    }, true);
  }

  function alignCommunicationIcons(){
    const ids = ['memberCommSelected'];
    ids.forEach(id=>{
      const btn = document.getElementById(id);
      if(!btn) return;
      btn.textContent = '✉';
      btn.setAttribute('aria-label','Kommunikation');
    });
    document.querySelectorAll('.quick-icons button[data-view="communication"]').forEach(btn=>{
      btn.textContent = '✉';
      btn.setAttribute('aria-label','Kommunikation');
    });
  }

  function init(){
    bindSharedSwitch();
    bindEmptyNoteGuard();
    alignCommunicationIcons();
  }

  kngReadyOnce('settings-timer-pinboard-init', init);
  setTimeout(init, 0);
  setTimeout(init, 250);

  const oldRenderAll = window.renderAll;
  if(typeof oldRenderAll === 'function' && !oldRenderAll._pinboardUiFix){
    const patched = function(){
      const result = oldRenderAll.apply(this, arguments);
      setTimeout(init, 0);
      return result;
    };
    patched._pinboardUiFix = true;
    window.renderAll = patched;
  }
})();

/* ===== 23_symbol_library.js ===== */
/* Phase 9.10 – globale Symbolbibliothek und Rollensymbole */
(function(){
  const DEFAULT_SYMBOLS={
    admin:{label:'Administrator',icon:'👤'},
    systemOwner:{label:'Systeminhaber',icon:'🔐'},
    clubSpeaker:{label:'Clubsprecher',icon:'🎙️'},
    deputyClubSpeaker:{label:'Stellv. Clubsprecher',icon:'🎙️+'},
    treasurer:{label:'Kassierer / Kassenwart',icon:'💰'},
    cashAuditor:{label:'Kassenprüfer',icon:'🔍'},
    secretary:{label:'Schriftführer',icon:'📝'},
    boardMember:{label:'Beisitzer',icon:'👥'},
    committee:{label:'Ausschussmitglied',icon:'📋'},
    honorary:{label:'Ehrenmitglied',icon:'⭐'},
    member:{label:'Mitglied',icon:'👨'},
    passive:{label:'Passiv',icon:'💤'},
    guest:{label:'Gast (kein Mitglied)',icon:'🤝'},
    temp:{label:'Aushilfe (kein Mitglied)',icon:'🧤'},
    exited:{label:'Ausgeschieden',icon:'⛔'},
    deceased:{label:'Verstorben',icon:'🕯️'},
    chef:{label:'Koch/Köchin',icon:'👨‍🍳'},
    pastry:{label:'Konditor',icon:'🍰'},
    helper:{label:'Helfer',icon:'🛠️'},
    specialist:{label:'Fachkraft',icon:'✅'},
    workwearJacket:{label:'Kochjacke',icon:'🥼'},
    workwearPolo:{label:'Polo-Shirt',icon:'👕'},
    workwearPants:{label:'Hose',icon:'👖'},
    workwearShoes:{label:'Schuhe',icon:'👞'},
    shopping:{label:'Einkauf',icon:'🛒'},
    communication:{label:'Kommunikation',icon:'✉️'}
  };
  function esc(s){ return typeof escapeHtml==='function' ? escapeHtml(s) : String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function ensureSymbolSettings(){
    state.settings=state.settings||{};
    if(typeof state.settings.showGlobalSymbols!=='boolean') state.settings.showGlobalSymbols=true;
    state.settings.symbolLibrary={...DEFAULT_SYMBOLS,...(state.settings.symbolLibrary||{})};
    Object.keys(DEFAULT_SYMBOLS).forEach(k=>{ state.settings.symbolLibrary[k]={...DEFAULT_SYMBOLS[k],...(state.settings.symbolLibrary[k]||{})}; });
  }
  function symbolsOn(){ ensureSymbolSettings(); return state.settings.showGlobalSymbols!==false; }
  function sym(key){ ensureSymbolSettings(); return state.settings.symbolLibrary?.[key]?.icon || DEFAULT_SYMBOLS[key]?.icon || ''; }
  function normalizeName(s){ return String(s||'').trim().toLowerCase(); }
  function memberDisplay(m){ return `${m?.lastName||''}, ${m?.firstName||''}`.replace(/^,\s*/,'').trim(); }
  function isOffice(m,settingKey){
    const label=state.settings?.[settingKey]||'';
    if(!label || !m) return false;
    const val=normalizeName(label);
    return val.includes(normalizeName(m.memberNo)) || val.includes(normalizeName(m.lastName)) && val.includes(normalizeName(m.firstName));
  }
  function memberSymbolKey(m){
    if(!m) return 'member';
    if(m.isAdminRecipient || String(m.memberNo||'').toUpperCase()==='ADMIN') return 'admin';
    const st=String((typeof memberStatus==='function'?memberStatus(m):m.memberType)||'').toLowerCase();
    const fn=String(m.clubFunction||'').toLowerCase();
    const prof=String(m.profession||'').toLowerCase();
    const pref=String(m.preferredDeployment||'').toLowerCase();
    if(st.includes('verstorben')) return 'deceased';
    if(st.includes('ausgeschieden')) return 'exited';
    if(isOffice(m,'treasurer') || fn.includes('kass') || fn.includes('kassenwart')) return 'treasurer';
    if(isOffice(m,'clubSpeaker') || fn.includes('clubsprecher')) return 'clubSpeaker';
    if(isOffice(m,'deputyClubSpeaker') || fn.includes('stellv')) return 'deputyClubSpeaker';
    if(isOffice(m,'cashAuditor') || fn.includes('prüfer')) return 'cashAuditor';
    if(fn.includes('schrift')) return 'secretary';
    if(fn.includes('beisitz')) return 'boardMember';
    if(st.includes('ehren')) return 'honorary';
    if(st.includes('passiv')) return 'passive';
    /* Vor der Funktionsauswertung: ein Gast bleibt ein Gast, auch wenn er als Helfer
       eingetragen ist - sonst erschiene er in der Uebersicht als Mitglied. */
    if(st.includes('gast')) return 'guest';
    if(st.includes('aushilfe')) return 'temp';
    if(prof.includes('konditor')) return 'pastry';
    if(prof.includes('koch') || prof.includes('köchin')) return 'chef';
    if(pref.includes('fach')) return 'specialist';
    if(pref.includes('helf')) return 'helper';
    if((m.committees||[]).length) return 'committee';
    return 'member';
  }
  window.kngSymbolKeyForMember=memberSymbolKey;
  window.kngSymbolForMember=function(m){ return symbolsOn() ? sym(memberSymbolKey(m)) : ''; };
  window.kngSymbolSpan=function(m,title){
    if(!symbolsOn()) return '';
    const key=memberSymbolKey(m);
    return `<span class="role-symbol role-symbol-${esc(key)}" title="${esc(title||state.settings.symbolLibrary?.[key]?.label||key)}">${esc(sym(key))}</span>`;
  };
  window.kngArticleSymbol=function(article){
    if(!symbolsOn()) return '';
    const a=String(article||'').toLowerCase();
    let key='workwearJacket';
    if(a.includes('polo')) key='workwearPolo'; else if(a.includes('hose')) key='workwearPants'; else if(a.includes('schuh')) key='workwearShoes';
    return `<span class="role-symbol" title="${esc(state.settings.symbolLibrary?.[key]?.label||'Artikel')}">${esc(sym(key))}</span>`;
  };

  function renderSymbolSettings(){
    ensureSymbolSettings();
    const master=document.getElementById('globalSymbolsEnabled');
    if(master) master.checked=state.settings.showGlobalSymbols!==false;
    const body=document.getElementById('symbolLibraryBody');
    if(!body) return;
    const q=(document.getElementById('symbolLibrarySearch')?.value||'').toLowerCase();
    body.innerHTML=Object.entries(state.settings.symbolLibrary).filter(([key,item])=>!q || `${key} ${item.label||''} ${item.icon||''}`.toLowerCase().includes(q)).map(([key,item])=>`<tr data-symbol-key="${esc(key)}"><td><input class="symbol-icon-input" value="${esc(item.icon||'')}"></td><td>${esc(item.label||key)}</td><td><code>${esc(key)}</code></td></tr>`).join('');
  }
  function injectSettingsUi(){
    ensureSymbolSettings();
    const tabs=document.querySelector('.settings-tabs');
    if(tabs && !document.querySelector('[data-settings-tab="settingsSymbols"]')){
      const btn=document.createElement('button');
      btn.className='tab'; btn.type='button'; btn.dataset.settingsTab='settingsSymbols'; btn.textContent='Symbolbibliothek';
      tabs.insertBefore(btn, document.querySelector('[data-settings-tab="settingsAssistant"]')||null);
      btn.addEventListener('click',()=>{
        document.querySelectorAll('[data-settings-tab]').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.settings-tab').forEach(p=>p.classList.remove('active'));
        document.getElementById('settingsSymbols')?.classList.add('active');
      });
    }
    const masterData=document.getElementById('settingsMasterData');
    if(masterData && !document.getElementById('globalSymbolsEnabledTop')){
      const label=document.createElement('label');
      label.className='toggle-switch user-symbol-switch';
      label.innerHTML='<input id="globalSymbolsEnabledTop" type="checkbox"><span class="switch-slider"></span><span>Symbole global anzeigen</span>';
      const clock=document.getElementById('userClockEnabled');
      const clockLabel=clock?.closest('label');
      const formGrid=masterData.querySelector('.form-grid') || masterData;
      if(clockLabel && clockLabel.parentElement){ clockLabel.insertAdjacentElement('afterend', label); }
      else { formGrid.appendChild(label); }
      label.querySelector('input').addEventListener('change',e=>{ const main=document.getElementById('globalSymbolsEnabled'); if(main) main.checked=e.target.checked; state.settings.showGlobalSymbols=e.target.checked; saveState(); refreshSymbolsEverywhere(); });
    }
    const settings=document.getElementById('settings');
    if(settings && !document.getElementById('settingsSymbols')){
      const panel=document.createElement('div');
      panel.id='settingsSymbols'; panel.className='settings-tab';
      panel.innerHTML=`<h4>Symbolbibliothek</h4><p class="hint">Hier werden die kleinen Symbole zentral gepflegt. Sie erscheinen in Mitgliederlisten, Kommunikation, Dienstkleidung und später im Dienstplan.</p>
        <div class="settings-switch-row"><label class="toggle-switch"><input id="globalSymbolsEnabled" type="checkbox"><span class="switch-slider"></span><span>Symbole global anzeigen</span></label></div>
        <div class="table-wrap compact-table"><table><thead><tr><th>Symbol</th><th>Bedeutung</th><th>Schlüssel</th></tr></thead><tbody id="symbolLibraryBody"></tbody></table></div>
        <div class="button-row settings-actions"><button id="saveSymbolLibrary" class="primary" type="button">Symbolbibliothek speichern</button><button id="resetSymbolLibrary" class="secondary" type="button">Standardsymbole</button></div>`;
      const assistant=document.getElementById('settingsAssistant');
      settings.querySelector('.card')?.insertBefore(panel, assistant||null);
      panel.querySelector('#globalSymbolsEnabled').addEventListener('change',e=>{ const top=document.getElementById('globalSymbolsEnabledTop'); if(top) top.checked=e.target.checked; state.settings.showGlobalSymbols=e.target.checked; saveState(); refreshSymbolsEverywhere(); });
      panel.querySelector('#saveSymbolLibrary').addEventListener('click',()=>{ saveSymbolLibrary(); });
      panel.querySelector('#resetSymbolLibrary').addEventListener('click',()=>{ if(confirm('Symbolbibliothek auf Standard zurücksetzen?')){ state.settings.symbolLibrary=JSON.parse(JSON.stringify(DEFAULT_SYMBOLS)); saveState(); renderSymbolSettings(); refreshSymbolsEverywhere(); toast?.('Standardsymbole wiederhergestellt.','success'); } });
    }

    const symbolSearch=document.getElementById('symbolLibrarySearch');
    if(symbolSearch && !symbolSearch.dataset.bound){ symbolSearch.dataset.bound='1'; symbolSearch.addEventListener('input',renderSymbolSettings); }
    const symbolMaster=document.getElementById('globalSymbolsEnabled');
    if(symbolMaster && !symbolMaster.dataset.bound){ symbolMaster.dataset.bound='1'; symbolMaster.addEventListener('change',e=>{ const top=document.getElementById('globalSymbolsEnabledTop'); if(top) top.checked=e.target.checked; state.settings.showGlobalSymbols=e.target.checked; saveState(); refreshSymbolsEverywhere(); }); }
    const saveBtn=document.getElementById('saveSymbolLibrary');
    if(saveBtn && !saveBtn.dataset.bound){ saveBtn.dataset.bound='1'; saveBtn.addEventListener('click',()=>saveSymbolLibrary()); }
    const resetBtn=document.getElementById('resetSymbolLibrary');
    if(resetBtn && !resetBtn.dataset.bound){ resetBtn.dataset.bound='1'; resetBtn.addEventListener('click',()=>{ if(confirm('Symbolbibliothek auf Standard zurücksetzen?')){ state.settings.symbolLibrary=JSON.parse(JSON.stringify(DEFAULT_SYMBOLS)); saveState(); renderSymbolSettings(); refreshSymbolsEverywhere(); toast?.('Standardsymbole wiederhergestellt.','success'); } }); }
    const printBtn=document.getElementById('printSymbolLibrary');
    if(printBtn && !printBtn.dataset.bound){ printBtn.dataset.bound='1'; printBtn.addEventListener('click',()=>window.print()); }
    const exportBtn=document.getElementById('exportSymbolLibrary');
    if(exportBtn && !exportBtn.dataset.bound){ exportBtn.dataset.bound='1'; exportBtn.addEventListener('click',()=>{ const rows=Object.entries(state.settings.symbolLibrary).map(([k,v])=>`${v.icon||''};${v.label||''};${k}`).join('\n'); const blob=new Blob(['Symbol;Bedeutung;Schlüssel\n'+rows],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='symbolbibliothek.csv'; a.click(); URL.revokeObjectURL(a.href); }); }
    renderSymbolSettings();
  }
  function saveSymbolLibrary(){
    ensureSymbolSettings();
    document.querySelectorAll('#symbolLibraryBody tr[data-symbol-key]').forEach(tr=>{
      const key=tr.dataset.symbolKey; const inp=tr.querySelector('.symbol-icon-input');
      if(key && inp) state.settings.symbolLibrary[key].icon=inp.value.trim() || DEFAULT_SYMBOLS[key]?.icon || '';
    });
    state.settings.showGlobalSymbols=!!document.getElementById('globalSymbolsEnabled')?.checked;
    saveState(); refreshSymbolsEverywhere(); toast?.('Symbolbibliothek gespeichert.','success');
  }
  function refreshSymbolsEverywhere(){
    try{ renderMembers?.(); }catch(e){}
    try{ renderCommunication?.(); }catch(e){}
    try{ renderWorkwear?.(); }catch(e){}
    try{ renderDashboard?.(); }catch(e){}
  }

  const originalRenderSettings=window.renderSettings;
  if(typeof originalRenderSettings==='function'){
    window.renderSettings=function(){ originalRenderSettings.apply(this,arguments); injectSettingsUi(); const top=document.getElementById('globalSymbolsEnabledTop'); if(top) top.checked=state.settings.showGlobalSymbols!==false; };
  }
  const originalSaveSettings=window.saveSettings;
  if(typeof originalSaveSettings==='function'){
    window.saveSettings=function(){
      ensureSymbolSettings();
      const top=document.getElementById('globalSymbolsEnabledTop');
      const main=document.getElementById('globalSymbolsEnabled');
      if(top) state.settings.showGlobalSymbols=top.checked;
      if(main) state.settings.showGlobalSymbols=main.checked;
      if(document.getElementById('symbolLibraryBody')) saveSymbolLibrary();
      const result=originalSaveSettings.apply(this,arguments);
      refreshSymbolsEverywhere();
      return result;
    };
  }

  /* Mitgliederliste mit Rollensymbol */
  window.renderMembers=function(){
    if(!state.session.isLoggedIn) return;
    const memberCountInfo=document.getElementById('memberCountInfo');
    if(memberCountInfo){
      const memberStats=getMemberStats();
      memberCountInfo.value=String(memberStats.total);
      setInputValue('memberCountActiveInfo',String(memberStats.active));
      setInputValue('memberCountPassiveInfo',String(memberStats.passive));
      setInputValue('memberCountExitedInfo',String(memberStats.exited));
      setInputValue('memberCountGuestInfo',String(memberStats.guests));
      setInputValue('memberCountPersonInfo',String(memberStats.persons));
      renderAgeStatistics?.();
    }
    const cardMembers=document.getElementById('cardMembers');
    if(cardMembers) cardMembers.textContent=String(getMemberCount());
    const q=(document.getElementById('memberSearch')?.value||'').toLowerCase();
    const body=document.getElementById('membersTable'); if(!body)return;
    const visibleMembers=sortedMembers().filter(m=>!q || `${m.memberNo} ${m.firstName} ${m.lastName} ${m.city} ${m.profession||''} ${m.email||''}`.toLowerCase().includes(q)).sort(compareMemberRows);
    updateMemberSortIndicators?.();
    body.innerHTML=visibleMembers.map(m=>{
      const status=memberStatus(m); const rowClasses=['clickable'];
      rowClasses.push(window.memberRowClass ? window.memberRowClass(status) : 'member-row-active');
      if(!String(m.email||'').trim() || !String(m.birthDate||'').trim()) rowClasses.push('member-row-missing');
      const contact=String(m.mobile||m.phone||m.email||'').trim();
      const checked=selectedMemberIds.has(m.id)?'checked':''; const isCurrent=m.id===currentMemberId; if(isCurrent) rowClasses.push('member-row-current');
      const label=(m.lastName||'')+', '+(m.firstName||'');
      return `<tr class="${rowClasses.join(' ')}" data-id="${esc(m.id)}"><td class="member-select-col"><input type="checkbox" class="member-row-select" data-id="${esc(m.id)}" ${checked}><span class="member-current-marker">${isCurrent?'▶':''}</span></td><td>${esc(m.memberNo||'')}</td><td>${window.kngSymbolSpan(m)}${esc(label)}</td><td>${esc(status)}</td><td class="member-extra member-extra-medium">${esc(m.city||'')}</td><td class="member-extra member-extra-wide">${esc(m.profession||'')}</td><td class="member-extra member-extra-wide">${esc(contact)}</td><td class="member-extra member-extra-wide">${formatDate(m.joinedAt)||''}</td></tr>`;
    }).join('');
    body.querySelectorAll('input.member-row-select').forEach(cb=>cb.addEventListener('click',e=>{e.stopPropagation(); if(cb.checked) selectedMemberIds.add(cb.dataset.id); else selectedMemberIds.delete(cb.dataset.id); updateMemberSelectAllState(visibleMembers);}));
    body.querySelectorAll('tr[data-id]').forEach(tr=>tr.addEventListener('click',e=>{ if(e.target.closest('input.member-row-select')) return; if(confirmLeaveMember()){ const m=state.members.find(x=>x.id===tr.dataset.id); if(m) memberToForm(m); }}));
    updateMemberSelectAllState(visibleMembers);
    const count=document.getElementById('memberSearchCount'); if(count) count.textContent=`${visibleMembers.length} angezeigt`;
    renderStatusLegend?.(); renderSearchExtraColumns?.();
  };

  /* Kommunikations-Empfängerliste mit Symbolen */
  function patchCommAfterRender(){
    const rows=document.querySelectorAll('#commMemberList .comm-member-row');
    rows.forEach(row=>{
      if(row.querySelector('.role-symbol')) return;
      const id=row.querySelector('input')?.value;
      let m=null;
      if(id==='__admin__') m={isAdminRecipient:true,memberNo:'ADMIN',memberType:'Admin'}; else m=(state.members||[]).find(x=>x.id===id);
      const strong=row.querySelector('strong');
      if(strong && m) strong.insertAdjacentHTML('afterbegin', window.kngSymbolSpan(m));
    });
  }
  const originalRenderCommunication=window.renderCommunication;
  if(typeof originalRenderCommunication==='function'){
    window.renderCommunication=function(){ originalRenderCommunication.apply(this,arguments); patchCommAfterRender(); };
  }

  /* Dienstkleidung nach Rendern mit Symbolen ergänzen */
  const originalRenderWorkwear=window.renderWorkwear;
  if(typeof originalRenderWorkwear==='function'){
    window.renderWorkwear=function(){ originalRenderWorkwear.apply(this,arguments); setTimeout(()=>{
      document.querySelectorAll('#workwearTableBody tr[data-member-id]').forEach(tr=>{
        const id=tr.dataset.memberId; const m=(state.members||[]).find(x=>x.id===id); const nameCell=tr.children[2];
        if(nameCell && m && !nameCell.querySelector('.role-symbol')) nameCell.insertAdjacentHTML('afterbegin', window.kngSymbolSpan(m));
      });
      document.querySelectorAll('#workwearArticleTable tr').forEach(tr=>{ const cell=tr.children[0]; const input=cell?.querySelector('input'); if(cell && input && !cell.querySelector('.role-symbol')) cell.insertAdjacentHTML('afterbegin', window.kngArticleSymbol(input.value)); });
    },0); };
  }

  /* Dashboard kurze Symbolübersicht */
  const originalRenderDashboard=window.renderDashboard;
  if(typeof originalRenderDashboard==='function'){
    window.renderDashboard=function(){ originalRenderDashboard.apply(this,arguments); renderDashboardSymbolSummary(); };
  }
  function dashboardRoleCount(roleName){
    const wanted=String(roleName||'').trim().toLowerCase();
    const ids=new Set();
    (state.roleAssignments||[]).forEach(a=>{
      if(a?.active===false) return;
      const roles=Array.isArray(a?.roles)?a.roles:[];
      if(roles.some(r=>String(r||'').trim().toLowerCase()===wanted)) ids.add(String(a.memberId||a.userName||''));
    });
    ids.delete('');
    return ids.size;
  }
  function dashboardOfficeCount(settingKey){
    return String(state.settings?.[settingKey]||'').trim()?1:0;
  }
  function dashboardClubMemberCount(){
    return (state.members||[]).filter(m=>{
      const st=String((typeof memberStatus==='function'?memberStatus(m):m?.memberType)||'').toLowerCase();
      return !st.includes('gast') && !st.includes('aushilfe') && !st.includes('helf') && !st.includes('ausgeschieden') && !st.includes('verstorben');
    }).length;
  }
  function dashboardOfficeSummaryHtml(){
    const rows=[
      ['🎙️','Clubsprecher',dashboardOfficeCount('clubSpeaker')],
      ['🎙️+','Stellv. Clubsprecher',dashboardOfficeCount('deputyClubSpeaker')],
      ['💰','Kassenwart',dashboardOfficeCount('treasurer')],
      ['🔍','Kassenprüfer',dashboardOfficeCount('cashAuditor')],
      ['👤','Admin',dashboardRoleCount('Admin')],
      ['📅','Dienstplaner',dashboardRoleCount('Dienstplaner')],
      ['🔐','Systeminhaber',dashboardRoleCount('Systeminhaber')],
      ['👥','Mitglieder',dashboardClubMemberCount()]
    ];
    return rows.map(([icon,label,count])=>`<span class="office-summary-item" style="display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap;margin:0 14px 4px 0"><span class="office-summary-label">${esc(icon)} ${esc(label)}:</span><strong>${count}</strong></span>`).join('');
  }
  function renderDashboardSymbolSummary(){
    if(!symbolsOn()) return;
    const target=document.getElementById('dashboardClubStats'); if(!target || document.getElementById('dashboardSymbolSummary')) return;
    const counts={}; (state.members||[]).forEach(m=>{ const k=memberSymbolKey(m); counts[k]=(counts[k]||0)+1; });
    const html=Object.entries(counts).filter(([k])=>state.settings.symbolLibrary?.[k]).map(([k,n])=>`<span class="symbol-summary-item">${esc(sym(k))} ${esc(state.settings.symbolLibrary[k].label)}: <strong>${n}</strong></span>`).join('');
    const card=document.createElement('section'); card.id='dashboardSymbolSummary'; card.className='card symbol-summary-card';
    const hidden=state.settings.dashboardSymbolsHidden===true;
    card.innerHTML=`<div class="table-headline" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h3 style="margin:0">Symbolübersicht</h3><div class="inline-actions"><button id="toggleDashboardSymbols" class="ghost inline-title-button" type="button">${hidden?'▶':'▼'}</button></div></div><div id="dashboardSymbolSummaryContent" class="symbol-summary-grid" style="display:${hidden?'none':'flex'};flex-wrap:wrap;gap:4px 14px">${html}</div><div class="dashboard-office-side" style="margin-top:6px"><div class="table-headline" style="margin:0 0 2px 0"><h3 style="margin:0">Ämter-Übersicht</h3></div><div class="office-summary-grid" style="display:flex;flex-wrap:wrap;align-items:baseline;gap:0">${dashboardOfficeSummaryHtml()}</div></div>`;
    target.insertBefore(card, target.querySelector('.dashboard-grid')?.nextSibling||target.firstChild);
    card.querySelector('#toggleDashboardSymbols')?.addEventListener('click',()=>{ state.settings.dashboardSymbolsHidden=!state.settings.dashboardSymbolsHidden; saveState(); document.getElementById('dashboardSymbolSummary')?.remove(); renderDashboardSymbolSummary(); });
  }

  function addCss(){
    if(document.getElementById('symbolLibraryCss')) return;
    const st=document.createElement('style'); st.id='symbolLibraryCss'; st.textContent=`
      .role-symbol{display:inline-flex;align-items:center;justify-content:center;min-width:1.45em;margin-right:.35em;font-size:1.05em;line-height:1;vertical-align:-.08em}
      .user-symbol-switch{align-self:end}.settings-tab .table-headline h4 .tab-menu-symbol{margin-right:6px}.settings-tab .table-headline h4 .tab-drag-symbol{margin-left:8px;color:var(--muted);font-weight:700}
      #symbolLibraryBody input.symbol-icon-input{width:58px;text-align:center;font-size:18px;padding:6px 4px}
      .symbol-summary-card{margin-top:14px}.symbol-summary-grid{display:flex;flex-wrap:wrap;gap:4px 14px}.symbol-summary-item{font-size:13px;white-space:nowrap}.office-summary-grid{display:flex;flex-wrap:wrap;align-items:baseline}.office-summary-item{font-size:13px}.office-summary-label{white-space:nowrap}.office-summary-item strong{font-size:1.15em}.dashboard-office-side .table-headline{margin-bottom:2px}
      #commMemberList .role-symbol{margin-right:.25em}.workwear-table .role-symbol{margin-right:.25em}
    `; document.head.appendChild(st);
  }

  kngReadyOnce('settings-symbol-ui', ()=>{ ensureSymbolSettings(); addCss(); injectSettingsUi(); setTimeout(refreshSymbolsEverywhere,50); });
})();

/* ===== 24_phase910_symbol_cleanup.js ===== */
/* Phase 9.10 – Bedien-/Symbolbibliothek-Korrekturen */
(function(){
  function save(){ try{ saveState(); }catch(e){} }
  function ensureClaimPersistence(){
    const ids=['claimWorkwear','claimWorkwearMonths','claimParkingTicket','claimParkingTicketMonths','claimChristmasMarketParkingTicket','claimChristmasMarketParkingTicketMonths','claimTrips','claimTripsMonths'];
    ids.forEach(id=>{
      const el=document.getElementById(id); if(!el || el.dataset.claimPersistBound) return; el.dataset.claimPersistBound='1';
      el.addEventListener('change',()=>{ try{ markMemberDirty?.(); }catch(e){} });
    });
  }
  function patchToggleIcons(){
    const sidebar=document.getElementById('sidebarToggle'); if(sidebar && sidebar.textContent.trim()==='☰') sidebar.textContent='⇔';
    const ms=document.getElementById('memberSearchToggle'); if(ms && ms.textContent.trim()==='☰') ms.textContent='⇔';
  }
  const oldRenderSettings=window.renderSettings;
  if(typeof oldRenderSettings==='function'){
    window.renderSettings=function(){ const r=oldRenderSettings.apply(this,arguments); setTimeout(()=>{ patchToggleIcons(); ensureClaimPersistence(); },0); return r; };
  }
  kngReadyOnce('settings-toggle-claim', ()=>{ patchToggleIcons(); ensureClaimPersistence(); });
})();

/* Anspruch Dienstkleidung in beiden Registerkarten synchron halten */
(function(){
  function bindWorkwearClaimSync(){
    const c=document.getElementById('claimWorkwear');
    const cm=document.getElementById('claimWorkwearMonths');
    const s=document.getElementById('memberWorkwearClaim');
    const sm=document.getElementById('memberWorkwearMonths');
    if(c && s && !c.dataset.workwearSync){ c.dataset.workwearSync='1'; c.addEventListener('change',()=>{ s.value=c.checked?'yes':'no'; try{markMemberDirty?.();}catch(e){} }); }
    if(s && c && !s.dataset.workwearSync){ s.dataset.workwearSync='1'; s.addEventListener('change',()=>{ c.checked=s.value==='yes'; try{markMemberDirty?.();}catch(e){} }); }
    if(cm && sm && !cm.dataset.workwearSync){ cm.dataset.workwearSync='1'; cm.addEventListener('input',()=>{ sm.value=cm.value||0; try{markMemberDirty?.();}catch(e){} }); }
    if(sm && cm && !sm.dataset.workwearSync){ sm.dataset.workwearSync='1'; sm.addEventListener('input',()=>{ cm.value=sm.value||0; try{markMemberDirty?.();}catch(e){} }); }
  }
  const oldMemberToForm=window.memberToForm;
  if(typeof oldMemberToForm==='function'){
    window.memberToForm=function(m){ const r=oldMemberToForm.apply(this,arguments); setTimeout(bindWorkwearClaimSync,0); return r; };
  }
  kngReadyOnce('settings-workwear-sync', ()=>setTimeout(bindWorkwearClaimSync,50));
})();

/* ===== 33_phase910_8_auto_logout.js ===== */
/* Auto-Logout Kernlogik ab Version 47.7 in js/29_kng477_core_message_auto_logout.js.
   Dieser alte Block bleibt absichtlich deaktiviert, damit keine parallelen Timer laufen. */
(function(){
  'use strict';
  window.__kngLegacyAutoLogoutDisabled = true;
})();
