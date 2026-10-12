/* Test 41 – Interaktives Büro: dynamische kleine Icons, freie Pinnwand und stabile Rückkehr */
(function(){
  'use strict';
  if(window.SecretariatMemberCardsCore && window.SecretariatMemberCardsCore.__test41) return;

  const $ = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = ()=>new Date().toISOString().slice(0,10);
  const year = ()=>new Date().getFullYear();
  const toast=(m,t='info')=>{ try{ (window.toast||console.log)(m,t); }catch(_e){} };

  function appState(){
    try{
      if(window.__kngStateRef && typeof window.__kngStateRef === 'object') return window.__kngStateRef;
      if(window.state && typeof window.state === 'object') return window.state;
      const s = (0,eval)('typeof state !== "undefined" ? state : undefined');
      if(s && typeof s === 'object') return s;
    }catch(_e){}
    return {};
  }
  function defaultMembers(){
    try{
      const d = window.DEFAULT_STATE || (0,eval)('typeof DEFAULT_STATE !== "undefined" ? DEFAULT_STATE : undefined');
      return Array.isArray(d?.members) ? d.members : [];
    }catch(_e){ return []; }
  }
  function memberList(){
    const s=appState();
    let list = [];
    if(Array.isArray(s.members) && s.members.length) list = s.members;
    if(!list.length && Array.isArray(window.members) && window.members.length) list = window.members;
    if(!list.length){
      const keys=['kng_v1_clean_master_test31_membercards','kng_v1_clean_master_test30_membercards','kng_v1_clean_master','kngState','kng_clean_master_state'];
      for(const key of keys){
        try{
          const raw=localStorage.getItem(key) || '';
          if(raw){ const parsed=JSON.parse(raw); if(Array.isArray(parsed.members) && parsed.members.length){ list = parsed.members; break; } }
        }catch(_e){}
      }
    }
    if(!list.length) list = defaultMembers();
    return list.map((m,i)=>{ if(!m.id) m.id = m.memberNo || m.memberNr || ('member_'+(i+1)); return m; });
  }
  function ensureArray(obj,key){ obj[key]=Array.isArray(obj[key])?obj[key]:[]; return obj[key]; }
  const chosenMemberIds = new Set();

  function showViewSafe(id){
    if(typeof window.showView==='function') return window.showView(id);
    const v=document.getElementById(id); if(!v) return false;
    $$('.view').forEach(x=>x.classList.remove('active'));
    v.classList.add('active');
    return true;
  }

  function ensureState(){
    const s=appState();
    ensureArray(s,'documents'); ensureArray(s,'documentAssignments'); ensureArray(s,'documentLog');
    s.settings = s.settings || {};
    s.settings.navIcons = Array.isArray(s.settings.navIcons) ? s.settings.navIcons : [];
    if(!s.settings.navIcons.includes('secretariat')) s.settings.navIcons.push('secretariat');
  }

  function ensureNav(){
    const nav=document.getElementById('mainNav');
    if(nav && !nav.querySelector('[data-view="secretariat"]')){
      const btn=document.createElement('button');
      btn.className='nav'; btn.dataset.view='secretariat'; btn.textContent='Sekretariat';
      const dashboard=nav.querySelector('[data-view="dashboard"]');
      dashboard?.insertAdjacentElement('afterend', btn) || nav.prepend(btn);
    }
    const membersSub=document.getElementById('membersSubmenu');
    if(membersSub && !membersSub.querySelector('[data-view="memberCards"]')){
      const btn=document.createElement('button');
      btn.className='nav nav-child'; btn.dataset.view='memberCards'; btn.textContent='Mitgliedsausweis';
      const membersBtn=membersSub.querySelector('[data-view="members"]');
      membersBtn?.insertAdjacentElement('afterend',btn) || membersSub.prepend(btn);
    }
  }

  function normalizeName(m){
    const full=[m?.title,m?.firstName||m?.vorname,m?.lastName||m?.nachname].filter(Boolean).join(' ').trim();
    return full || m?.name || 'Unbekannt';
  }
  function memberNo(m){ return m?.memberNo || m?.memberNr || m?.nr || m?.id || ''; }
  function addressLine(m){ return [m?.street||m?.strasse, [m?.postalCode||m?.plz,m?.city||m?.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
  function cityLine(m){ return [m?.postalCode||m?.plz,m?.city||m?.ort].filter(Boolean).join(' '); }
  function currentMember(){
    try{ if(typeof window.getCurrentMember==='function'){ const m=window.getCurrentMember(); if(m) return m; } }catch(_e){}
    const s=appState();
    const idx=Number(s.currentMemberIndex ?? s.ui?.currentMemberIndex ?? 0);
    return memberList()[idx] || memberList()[0] || null;
  }
  function markedMembers(){
    const ids=$$('#membersTable input[type="checkbox"][data-id]:checked, #membersTable input[type="checkbox"][data-member-id]:checked, .member-row input[type="checkbox"][data-id]:checked')
      .map(cb=>String(cb.dataset.id || cb.dataset.memberId));
    return ids.length ? memberList().filter(m=>ids.includes(String(m.id))) : [];
  }
  function chosenMembers(){
    if(!chosenMemberIds.size){
      const sel=document.getElementById('memberCardMemberSelect');
      if(sel) Array.from(sel.selectedOptions||[]).forEach(opt=>chosenMemberIds.add(String(opt.value)));
    }
    return memberList().filter(m=>chosenMemberIds.has(String(m.id)));
  }
  function selectedByMode(){
    const mode=$('#memberCardSelectionMode')?.value || 'current';
    if(mode==='all') return memberList().slice();
    if(mode==='selected') return markedMembers();
    if(mode==='choose') return chosenMembers();
    const m=currentMember(); return m ? [m] : [];
  }
  function memberSearchText(m){ return [memberNo(m),m.firstName,m.lastName,m.rufname,m.city,m.clubFunction,m.function,m.memberType,m.email,m.phone,m.mobile].filter(Boolean).join(' ').toLowerCase(); }

  function ensureMemberCardMarkup(){
    const view=$('#memberCards'); if(!view) return;
    const form=view.querySelector('.card.form-grid') || view.querySelector('.card');
    if(form && !$('#memberCardOpenChooserBtn')){
      const wrap=document.createElement('div');
      wrap.className='button-row compact member-card-selection-help';
      wrap.innerHTML='<button id="memberCardOpenChooserBtn" class="secondary" type="button">Mitglied auswählen…</button><span id="memberCardSelectionInfo" class="muted">Aktuelles Mitglied wird verwendet.</span>';
      const sel=$('#memberCardSelectionMode');
      sel?.closest('label')?.insertAdjacentElement('afterend', wrap) || form.prepend(wrap);
    }
    let picker=$('#memberCardPicker');
    if(!picker){
      picker=document.createElement('div');
      picker.id='memberCardPicker'; picker.className='member-card-picker';
      picker.innerHTML=`
        <div class="picker-head"><strong>Mitglieder auswählen</strong><span id="memberCardPickerCount" class="pill">0 ausgewählt</span></div>
        <input id="memberCardPickerSearch" type="search" placeholder="Name, Nr., Ort suchen …">
        <select id="memberCardMemberSelect" class="member-card-member-select" multiple size="7" aria-label="Mitglieder auswählen"></select>
        <div class="button-row compact"><button id="memberCardPickerAll" class="secondary" type="button">Alle markieren</button><button id="memberCardPickerNone" class="secondary" type="button">Keine</button></div>
        <div id="memberCardPickerList" class="member-card-picker-list"></div>`;
      form?.insertAdjacentElement('afterend', picker);
    }
    picker.hidden=false;
    if(!$('#memberCardPreview')){
      const preview=document.createElement('div'); preview.id='memberCardPreview'; preview.className='member-card-preview muted'; preview.textContent='Noch keine Vorschau erstellt.';
      picker.insertAdjacentElement('afterend',preview);
    }
  }

  function updateSelectionInfo(){
    const info=$('#memberCardSelectionInfo'); if(!info) return;
    const mode=$('#memberCardSelectionMode')?.value || 'current';
    const list=selectedByMode();
    const text={current:'Aktuelles Mitglied', selected:'Markierte Mitglieder aus der Mitgliedersuche', all:'Alle Mitglieder', choose:'Manuell ausgewählte Mitglieder'}[mode] || 'Auswahl';
    info.textContent=`${text}: ${list.length} Mitglied(er)`;
  }

  function updatePickerCount(){
    const el=$('#memberCardPickerCount');
    if(el) el.textContent=`${chosenMemberIds.size} ausgewählt`;
    updateSelectionInfo();
  }

  function renderPicker(){
    ensureMemberCardMarkup();
    const picker=$('#memberCardPicker'); if(!picker) return;
    const mode=$('#memberCardSelectionMode')?.value || 'current';
    picker.style.display = (mode==='choose') ? '' : 'none';
    const list=$('#memberCardPickerList'); if(!list) return;
    if(mode!=='choose'){ updateSelectionInfo(); return; }
    const all=memberList();
    const q=($('#memberCardPickerSearch')?.value||'').trim().toLowerCase();
    const rows=all.filter(m=>!q || memberSearchText(m).includes(q));
    const sel=$('#memberCardMemberSelect');
    if(sel){
      sel.innerHTML = rows.map(m=>`<option value="${esc(m.id)}" ${chosenMemberIds.has(String(m.id))?'selected':''}>${esc(normalizeName(m))} – ${esc(memberNo(m)||'ohne Nr.')} – ${esc(cityLine(m)||'')}</option>`).join('');
    }
    list.innerHTML = rows.map(m=>`
      <label class="member-card-picker-row">
        <input type="checkbox" data-card-member-id="${esc(m.id)}" ${chosenMemberIds.has(String(m.id))?'checked':''}>
        <span><strong>${esc(normalizeName(m))}</strong><small>${esc(memberNo(m))} · ${esc(addressLine(m)||'ohne Adresse')}</small></span>
      </label>`).join('') || `<p class="muted">${all.length ? 'Keine Mitglieder zu diesem Suchbegriff gefunden.' : 'Keine Mitglieder geladen.'}</p>`;
    updatePickerCount();
  }

  function logo(){ return (appState().settings?.clubLogoSmallPath || appState().settings?.clubLogoPath || '').trim(); }
  function clubName(){ return (appState().settings?.clubName || 'Köcheclub Werne').trim() || 'Köcheclub Werne'; }
  function clubSince(){ return String(appState().settings?.clubFoundedAt || appState().settings?.clubSince || '').slice(0,4); }
  function photoOf(m){ return m?.photoData || m?.photo || m?.photoUrl || m?.image || m?.foto || m?.fotoUrl || ''; }

  function qrSvgData(text){
    // kleiner deterministischer Ident-QR-Ersatz als SVG-Matrix, ohne externe Bibliothek/Internet.
    const size=21; let seed=0; const s=String(text||'');
    for(let i=0;i<s.length;i++) seed=(seed*31+s.charCodeAt(i))>>>0;
    const isFinder=(x,y)=> (x<7&&y<7) || (x>=14&&y<7) || (x<7&&y>=14);
    let rects='<rect width="21" height="21" fill="white"/>';
    function bit(x,y){ seed=(seed*1664525+1013904223)>>>0; return ((seed>>>((x+y)%16))&1)===1; }
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        let on=false;
        if(isFinder(x,y)){
          const lx=x<7?x:(x>=14?x-14:x), ly=y<7?y:(y>=14?y-14:y);
          on = lx===0||ly===0||lx===6||ly===6||(lx>=2&&lx<=4&&ly>=2&&ly<=4);
        }else on=bit(x,y);
        if(on) rects+=`<rect x="${x}" y="${y}" width="1" height="1" fill="#111"/>`;
      }
    }
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges">${rects}</svg>`)}`;
  }

  function cardFrontHtml(m, variant){
    const lg=logo(), photo=photoOf(m), valid=$('#memberCardValidUntil')?.value || '';
    const qr=qrSvgData(`KNG|${clubName()}|${memberNo(m)}|${m?.id||''}`);
    return `<article class="member-id-card ${esc(variant)} member-id-card-front">
      <div class="card-head">${lg?`<img class="club-logo" src="${esc(lg)}" alt="Logo">`:`<span class="club-logo" aria-hidden="true">👨‍🍳</span>`}<div><div class="club-name">${esc(clubName())}</div><small>Mitgliedsausweis · Vorderseite</small></div></div>
      <div class="photo">${photo?`<img src="${esc(photo)}" alt="Foto ${esc(normalizeName(m))}">`:'👤'}</div>
      <img class="member-card-qr" src="${esc(qr)}" alt="QR Mitglied ${esc(memberNo(m))}">
      <div class="card-data">
        <div class="member-name">${esc(normalizeName(m))}</div>
        <div><strong>Mitglieds-Nr.:</strong> ${esc(memberNo(m)||'-')}</div>
        <div><strong>Adresse:</strong> ${esc(addressLine(m)||'-')}</div>
        <div><strong>Mitgliedsart:</strong> ${esc(m?.memberType||'-')}</div>
        <div><strong>Funktion:</strong> ${esc(m?.clubFunction||m?.function||'-')}</div>
      </div>
      <div class="valid">${valid?`Gültig bis: ${esc(valid)} · `:''}Erstellt am: ${esc(today())}</div>
    </article>`;
  }

  function cardBackHtml(m, variant){
    const valid=$('#memberCardValidUntil')?.value || '';
    const lg=logo();
    const qr=qrSvgData(`KNG|${clubName()}|${memberNo(m)}|${m?.id||''}`);
    return `<article class="member-id-card ${esc(variant)} member-id-card-back">
      <div class="card-head">${lg?`<img class="club-logo" src="${esc(lg)}" alt="Logo">`:`<span class="club-logo" aria-hidden="true">👨‍🍳</span>`}<div><div class="club-name">${esc(clubName())}</div><small>Mitgliedsausweis · Rückseite</small></div></div>
      <div class="card-data back-data">
        <div><strong>Name:</strong> ${esc(normalizeName(m))}</div>
        <div><strong>Mitglieds-Nr.:</strong> ${esc(memberNo(m)||'-')}</div>
        <div><strong>Ort:</strong> ${esc(cityLine(m)||'-')}</div>
        <div><strong>Eintritt:</strong> ${esc(m?.joinedAt||m?.entryDate||'-')}</div>
        <div><strong>Kontakt:</strong> ${esc(m?.phone||m?.mobile||m?.email||'-')}</div>
        <p class="card-note">Dieser Ausweis dient der internen Identifikation im Verein. Bei Verlust bitte den Vorstand informieren.</p>
      </div>
      <img class="member-card-qr back" src="${esc(qr)}" alt="QR Mitglied ${esc(memberNo(m))}">
      <div class="valid">${clubSince()?`since ${esc(clubSince())} · `:''}${valid?`Gültig bis: ${esc(valid)}`:'Interner Vereinsausweis'}</div>
    </article>`;
  }

  function renderPreview(){
    ensureMemberCardMarkup();
    const box=$('#memberCardPreview'); if(!box) return;
    const variant=$('#memberCardVariant')?.value || 'credit';
    const list=selectedByMode();
    box.classList.remove('muted');
    if(!list.length){
      box.innerHTML='<p class="muted">Keine Mitglieder ausgewählt. Bitte Auswahl oben einstellen oder „Mitglied auswählen…“ verwenden.</p>';
      updateSelectionInfo(); return;
    }
    box.innerHTML = list.map(m=>`<section class="member-card-preview-set">${cardFrontHtml(m,variant)}${cardBackHtml(m,variant)}</section>`).join('');
    updateSelectionInfo();
  }

  function ensureDocForCard(m, variant){
    const s=appState(); if(!m) return null;
    ensureArray(s,'documents'); ensureArray(s,'documentAssignments'); ensureArray(s,'documentLog');
    const stamp=new Date().toISOString();
    const docId=`doc_member_card_${String(m.id||memberNo(m)||Date.now()).replace(/[^a-z0-9_-]/gi,'_')}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const doc={
      id:docId,title:`Mitgliedsausweis ${normalizeName(m)}`,category:'Mitgliederunterlage',documentType:'Mitgliedsausweis',type:'Mitgliedsausweis',
      date:today(),year:year(),fileName:`Mitgliedsausweis_${String(memberNo(m)||m.id||'mitglied').replace(/[^a-z0-9_-]/gi,'_')}.html`,
      status:'erstellt',confidentiality:'intern',description:`${variant==='large'?'Große Variante':'Scheckkartenformat'} für ${normalizeName(m)} mit Vorder-/Rückseite und QR`,createdAt:stamp,createdBy:s.session?.userName||'System'
    };
    s.documents.push(doc);
    s.documentAssignments.push({id:`as_${docId}`,docId,targetType:'member',targetId:m.id,targetName:normalizeName(m),createdAt:stamp});
    s.documentLog.push({date:stamp,module:'Mitgliedsausweis',action:'erstellt',docId,details:doc.description,user:s.session?.userName||'System'});
    m.documents=Array.isArray(m.documents)?m.documents:[];
    m.documents.push({id:docId,name:doc.title,type:'Mitgliedsausweis',date:today(),note:doc.description});
    m.history=Array.isArray(m.history)?m.history:[];
    m.history.push({date:today(),area:'Mitgliedsausweis',type:'Mitgliedsausweis',text:`Mitgliedsausweis erstellt (${variant==='large'?'große Variante':'Scheckkartenformat'}, Vorder-/Rückseite, QR)`,user:s.session?.userName||'System'});
    return doc;
  }

  function createCards(){
    const variant=$('#memberCardVariant')?.value || 'credit';
    const list=selectedByMode();
    if(!list.length){ toast('Keine Mitglieder ausgewählt.','warn'); renderPreview(); return; }
    list.forEach(m=>ensureDocForCard(m, variant));
    try{ if(typeof window.saveState==='function') window.saveState(); }catch(_e){}
    try{ if(typeof window.logAction==='function') window.logAction('Mitgliedsausweis','Ausweise erstellt',`${list.length} Ausweis(e), Variante: ${variant}`); }catch(_e){}
    renderPreview();
    if(typeof window.DocumentsCore?.render==='function') window.DocumentsCore.render();
    toast(`${list.length} Mitgliedsausweis(e) erstellt und in der Dokumentenverwaltung abgelegt.`,'success');
  }

  function printCards(){
    renderPreview();
    document.body.classList.add('print-member-cards');
    setTimeout(()=>{ window.print(); setTimeout(()=>document.body.classList.remove('print-member-cards'),250); },50);
  }


  function secretaryConfirmExit42(){
    const office=document.querySelector('.secretary-office');
    if(office) office.classList.add('secretary-lights-out');
    let modal=document.getElementById('secretaryExitModal42');
    if(!modal){
      modal=document.createElement('div');
      modal.id='secretaryExitModal42';
      modal.className='secretary-exit-modal42';
      modal.innerHTML='<h3>Programm schließen</h3><p>Wollen Sie das Programm wirklich schließen?</p><div class="secretary-exit-actions"><button class="primary" type="button" data-secretary-exit-yes>Ja</button><button class="secondary" type="button" data-secretary-exit-no>Nein</button></div>';
      (office||document.body).appendChild(modal);
      modal.querySelector('[data-secretary-exit-yes]')?.addEventListener('click',()=>{ try{ if(typeof window.logout==='function') window.logout(); else if(typeof window.showGuestHome==='function') window.showGuestHome(); }catch(_e){} });
      modal.querySelector('[data-secretary-exit-no]')?.addEventListener('click',()=>{ modal.remove(); if(office) office.classList.remove('secretary-lights-out'); });
    }
    return false;
  }

  function secretaryAction(action){
    if(action==='logoutCup'){
      try{
        if(typeof window.logout==='function') window.logout();
        else if(typeof window.showGuestHome==='function') window.showGuestHome();
      }catch(_e){ try{ if(typeof window.showGuestHome==='function') window.showGuestHome(); }catch(_e2){} }
      return false;
    }
    if(action==='photos'){
      toast('Fotosammlung ist als späteres Modul vorgesehen.','info');
      return false;
    }
    if(action==='internet'){
      try{ window.open('https://www.google.de','_blank','noopener'); }catch(_e){ toast('Internetaufruf konnte nicht geöffnet werden.','error'); }
      return false;
    }
    if(action==='inbox') action='documents';
    if(action==='notes'){
      toast('Kurznotizen werden in einer späteren Version angebunden.','info');
      return false;
    }
    if(action==='pinboard'){
      toast('Pinnwand wird in der nächsten Phase dynamisch angebunden.','info');
      return false;
    }
    if(typeof window.canUseSecretaryAction === 'function' && !window.canUseSecretaryAction(action)){
      toast('Keine Berechtigung für diese Sekretariatsfunktion.','error');
      if(typeof window.applyPermissionVisibility === 'function') window.applyPermissionVisibility();
      return false;
    }
    const map={
      members:'members',
      memberCards:'memberCards',
      email:'communication',
      communication:'communication',
      documents:'documents',
      activities:'activities',
      questionnaire:'questionnaire',
      finance:'finance',
      inventory:'inventoryV2',
      addresses:'addresses',
      reports:'protocol',
      assistant:'assistant',
      workwear:'workwear',
      orders:'orders',
      calculator:'finance',
      statutes:'documents'
    };
    window.__kngLastOpenSource = 'secretariat';
    ensureSecretaryCloseButtons();
    const targetId = action==='phone' ? 'members' : map[action];
    if(targetId){
      const ok = showViewSafe(targetId);
      const target = document.getElementById(targetId);
      if(target){ target.dataset.returnTo = 'secretariat'; target.dataset.openedFromSecretary = '1'; }
      ensureSecretaryCloseButtons();
      return ok;
    }
  }


  function returnToSecretaryFromView(view){
    if(!view || view.id==='secretariat') return false;
    const id=view.id;
    const secSource = view.dataset.returnTo === 'secretariat' || view.dataset.openedFromSecretary === '1' || window.__kngLastOpenSource === 'secretariat';
    if(!secSource) return false;
    delete view.dataset.returnTo; delete view.dataset.openedFromSecretary;
    document.querySelectorAll('.view.active').forEach(v=>v.classList.remove('active'));
    showViewSafe('secretariat');
    window.__kngLastOpenSource='navigation';
    setTimeout(()=>{ try{ renderSecretary(); }catch(_e){} },30);
    return true;
  }

  function bind(){
    if(document.__memberCardsCore32Bound) return;
    document.__memberCardsCore32Bound=true;
    document.addEventListener('click',ev=>{
      const sec=ev.target.closest('[data-secretary-action]');
      if(sec){ ev.preventDefault(); secretaryAction(sec.dataset.secretaryAction); return; }
      if(ev.target.closest('#memberCardOpenChooserBtn')){ ev.preventDefault(); const sel=$('#memberCardSelectionMode'); if(sel) sel.value='choose'; renderPicker(); renderPreview(); return; }
      if(ev.target.closest('#memberCardPreviewBtn')){ ev.preventDefault(); renderPreview(); return; }
      if(ev.target.closest('#memberCardCreateBtn')){ ev.preventDefault(); createCards(); return; }
      if(ev.target.closest('#memberCardPrintBtn')){ ev.preventDefault(); printCards(); return; }
      if(ev.target.closest('#memberCardPickerAll')){ ev.preventDefault(); memberList().forEach(m=>chosenMemberIds.add(String(m.id))); renderPicker(); renderPreview(); return; }
      if(ev.target.closest('#memberCardPickerNone')){ ev.preventDefault(); chosenMemberIds.clear(); renderPicker(); renderPreview(); return; }
    }, true);
    document.addEventListener('change',ev=>{
      if(ev.target?.matches('[data-card-member-id]')){
        const id=String(ev.target.dataset.cardMemberId);
        ev.target.checked ? chosenMemberIds.add(id) : chosenMemberIds.delete(id);
        updatePickerCount(); renderPicker(); renderPreview(); return;
      }
      if(ev.target?.id==='memberCardMemberSelect'){
        chosenMemberIds.clear();
        Array.from(ev.target.selectedOptions||[]).forEach(opt=>chosenMemberIds.add(String(opt.value)));
        updatePickerCount(); renderPicker(); renderPreview(); return;
      }
      if(ev.target && ['memberCardSelectionMode','memberCardVariant','memberCardValidUntil'].includes(ev.target.id)){
        renderPicker(); renderPreview();
      }
    }, true);
    document.addEventListener('input',ev=>{ if(ev.target?.id==='memberCardPickerSearch') renderPicker(); }, true);
    document.addEventListener('click',ev=>{
      const close=ev.target.closest('[data-close-view], .view-close-button, .window-close');
      if(!close) return;
      const view = close.dataset.closeView ? document.getElementById(close.dataset.closeView) : close.closest('.view');
      if(!view) return;
      const id=view.id;
      if(!id || !['members','memberCards','documents','communication','activities','questionnaire','addresses','finance','inventoryV2','donations','protocol','assistant','workwear','orders','secretariat','workwear','orders','calculator','statutes'].includes(id)) return;
      if(returnToSecretaryFromView(view)){
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        return;
      }
      if(close.matches('[data-close-view], .window-close')){
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        window.__kngLastOpenSource='navigation';
        document.querySelectorAll('.view.active').forEach(v=>v.classList.remove('active'));
        document.querySelectorAll('.nav.active').forEach(n=>n.classList.remove('active'));
        const empty=document.getElementById('emptyDesktop'); if(empty) empty.classList.remove('hidden');
        try{ if(typeof window.applyClubBranding==='function') window.applyClubBranding(); }catch(_e){}
      }
    }, true);
  }

  function buildRealisticSecretaryOffice(){
    const office=$('.secretary-office');
    if(!office) return;
    const s=appState();
    const requestedTheme=s.settings?.secretariatTheme || s.ui?.secretariatTheme || 'classic';
    const theme=['classic','modern','kuechenchef'].includes(requestedTheme) ? requestedTheme : 'classic';
    office.classList.add('realistic','interactive-icons','secretary-test42');
    office.classList.toggle('secretary-theme-modern', theme==='modern');
    office.classList.toggle('secretary-theme-classic', theme==='classic');
    office.classList.toggle('secretary-theme-kuechenchef', theme==='kuechenchef');
    const wantRealistic = !office.querySelector('.secretary-hotspot');
    if(!wantRealistic) return;
    office.innerHTML = `
      <div class="secretary-clock-live" aria-label="laufende Uhr"><i class="h"></i><i class="m"></i><i class="s"></i></div>
      <div class="secretary-live-pinboard" aria-label="Programminterne Pinnwand"><div id="secretaryPinboardLiveText" class="secretary-live-pinboard-text"></div></div>
      <div class="secretary-club-poster" aria-label="Vereinsbild"><div class="secretary-club-hat" id="secretaryClubPosterLogo">👨‍🍳</div><div id="secretaryClubPosterName" class="secretary-club-name"></div><div class="secretary-club-line"></div><div id="secretaryClubPosterSmall" class="secretary-club-small"></div></div>
      <div class="secretary-cup-brand" aria-hidden="true"><span class="hat">👨‍🍳</span><span id="secretaryCupClubName"></span></div>
      <div class="secretary-nameplate-live" aria-label="Angemeldeter Benutzer"><strong id="secretaryLiveUserName"></strong></div>
      <button class="secretary-hotspot secretary-hotspot-logout-cup" type="button" data-secretary-action="logoutCup" title="Programm schließen"><span class="secretary-icon-only">↪</span></button>
      <button class="secretary-hotspot secretary-hotspot-members" type="button" data-secretary-action="members" data-module-key="members" title="Mitglieder"><span class="secretary-icon-only">👥</span></button>
      <button class="secretary-hotspot secretary-hotspot-documents" type="button" data-secretary-action="documents" data-module-key="documents" title="Dokumente"><span class="secretary-icon-only">📁</span></button>
      <button class="secretary-hotspot secretary-hotspot-photos" type="button" data-secretary-action="photos" title="Fotosammlung (späteres Modul)"><span class="secretary-icon-only">📷</span></button>
      <button class="secretary-hotspot secretary-hotspot-workwear" type="button" data-secretary-action="workwear" data-module-key="workwear" title="Dienstkleidung"><span class="secretary-icon-only secretary-chef-jacket" aria-hidden="true"><svg viewBox="0 0 64 64" role="img"><path d="M22 8c3 4 6 6 10 6s7-2 10-6l12 8-6 14-5-3v29H21V27l-5 3-6-14 12-8z" fill="#fff" stroke="#111" stroke-width="3" stroke-linejoin="round"/><path d="M32 15v39" stroke="#111" stroke-width="2.5"/><circle cx="36" cy="24" r="2" fill="#111"/><circle cx="36" cy="32" r="2" fill="#111"/><circle cx="36" cy="40" r="2" fill="#111"/></svg></span></button>
      <button class="secretary-hotspot secretary-hotspot-finance" type="button" data-secretary-action="finance" data-module-key="donations" title="Finanzen"><span class="secretary-icon-only">€</span></button>
      <button class="secretary-hotspot secretary-hotspot-tasks" type="button" data-secretary-action="questionnaire" data-module-key="questionnaire" title="Fragebogen"><span class="secretary-icon-only">📋</span></button>
      <button class="secretary-hotspot secretary-hotspot-orders" type="button" data-secretary-action="orders" data-module-key="orders" title="Bestellungen"><span class="secretary-icon-only">🛒</span></button>
      <button class="secretary-hotspot secretary-hotspot-inventory" type="button" data-secretary-action="inventory" data-module-key="inventoryOpen" title="Inventarverwaltung"><span class="secretary-icon-only">📦</span></button>
      <button class="secretary-hotspot secretary-hotspot-phone" type="button" data-secretary-action="phone" data-module-key="phone" title="Telefonverzeichnis / Adressen"><span class="secretary-icon-only">☎️</span></button>
      <button class="secretary-hotspot secretary-hotspot-addresses" type="button" data-secretary-action="addresses" data-module-key="addresses" title="Adressverwaltung"><span class="secretary-icon-only">📇</span></button>
      <button class="secretary-hotspot secretary-hotspot-calculator" type="button" data-secretary-action="calculator" data-module-key="finance" title="Taschenrechner"><span class="secretary-icon-only">🧮</span></button>
      <button class="secretary-hotspot secretary-hotspot-mail" type="button" data-secretary-action="email" data-module-key="communication" title="E-Mail schreiben"><span class="secretary-icon-only">✉️</span><em id="secretaryMailBadge">0</em></button>
      <button class="secretary-hotspot secretary-hotspot-statutes" type="button" data-secretary-action="statutes" data-module-key="documents" title="Satzung"><span class="secretary-icon-only">📖</span></button>
      <button class="secretary-hotspot secretary-hotspot-calendar" type="button" data-secretary-action="activities" data-module-key="activities" title="Termine"><span class="secretary-icon-only">📅</span></button>
      <button class="secretary-hotspot secretary-hotspot-internet" type="button" data-secretary-action="internet" title="Internet"><span class="secretary-icon-only">🌐</span></button>
      <button class="secretary-hotspot secretary-hotspot-inbox" type="button" data-secretary-action="inbox" data-module-key="documents" title="Dokumenteneingang"><span class="secretary-icon-only">📥</span></button>
      <button class="secretary-hotspot secretary-hotspot-notes" type="button" data-secretary-action="notes" title="Kurznotizen"><span class="secretary-icon-only">📝</span></button>
      <button class="secretary-hotspot secretary-hotspot-pinboard" type="button" data-secretary-action="pinboard" title="Pinnwand"><span class="secretary-icon-only">📌</span></button>
    `;
  }

  function secretaryModuleEnabled(key){
    if(!key) return true;
    const s=appState();
    const icons=Array.isArray(s.settings?.navIcons) ? s.settings.navIcons : [];
    const aliases={
      phone:['phone','telefon','members','communication','addresses'],
      memberCards:['memberCards','members'],
      questionnaire:['questionnaire','members','fragebogen'],
      addresses:['addresses','phone','members'],
      finance:['finance','donations','calculator'],
      reports:['reports','protocol'],
      assistant:['assistant','secretariat','workwear','orders','calculator','statutes'], orders:['orders','shopping','inventoryOpen'], calculator:['calculator','finance','donations'], statutes:['statutes','documents'], workwear:['workwear','members'], inventoryOpen:['inventoryOpen','inventory'], documents:['documents','statutes'], members:['members','memberCards']
    };
    const test=[key].concat(aliases[key]||[]);
    return !icons.length || test.some(k=>icons.includes(k));
  }

  function updateSecretaryIconVisibility(){
    $$('.secretary-office [data-module-key]').forEach(btn=>{
      const visible=secretaryModuleEnabled(btn.dataset.moduleKey);
      btn.hidden=!visible;
      btn.classList.toggle('permission-hidden', !visible);
    });
  }


  function secretaryDisplayUser(){
    const s=appState();
    const sess=s.session || window.__kngStateRef?.session || window.state?.session || {};
    const logged = sess.isLoggedIn !== false && (sess.userName || sess.displayName || sess.userKey || sess.role);
    if(!logged) return 'Gast';
    const candidates=[sess.displayName, sess.fullName, sess.name, sess.userName, sess.userKey, sess.role]
      .map(v=>String(v||'').trim()).filter(Boolean);
    const found=candidates.find(v=>v && !/^gast$/i.test(v));
    if(found) return found;
    if(String(sess.role||'').toLowerCase().includes('admin')) return 'Admin';
    return 'Benutzer';
  }

  function currentPinboardText(){
    const s=appState();
    const sess=s.session || {};
    const prefs = (()=>{
      try{
        if(typeof window.getUserPrefsObject==='function') return window.getUserPrefsObject() || {};
        const keys=[sess.userName, sess.userKey, 'Admin', 'Gast'].map(v=>String(v||'').trim()).filter(Boolean);
        for(const k of keys){ if(s.userPrefs?.[k]) return s.userPrefs[k]; }
      }catch(_e){}
      return {};
    })();
    const personal = prefs && prefs.pinboard && typeof prefs.pinboard === 'object' ? prefs.pinboard : null;
    const widgetText = String(document.getElementById('pinboardText')?.value || '').trim();
    const personalText = String(personal?.text || '').trim();
    const sharedText = String(s.ui?.pinboardText || '').trim();
    return widgetText || personalText || sharedText || 'Keine Pinnwandnotiz gespeichert.';
  }

  function pinboardLines(){
    const raw=currentPinboardText();
    const lines=raw.split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
    return (lines.length ? lines : ['Keine Pinnwandnotiz gespeichert.']).slice(0,6);
  }

  function ensureSecretaryCloseButtons(){
    const ids=['members','memberCards','documents','communication','activities','questionnaire','addresses','finance','donations','inventoryV2','protocol','assistant'];
    ids.forEach(id=>{
      const view=document.getElementById(id); if(!view) return;
      if(view.querySelector(':scope > .view-header .window-close,[data-kng-secretary-close="'+id+'"]')) return;
      let header=view.querySelector(':scope > .view-header') || view.querySelector(':scope > h3')?.parentElement;
      if(!header || header===view){
        header=document.createElement('div'); header.className='view-header kng-auto-view-header';
        const title=view.querySelector(':scope > h3, :scope > h2');
        if(title){ header.appendChild(title); view.prepend(header); }
        else {
          /* Frueher stand hier der rohe Bezeichner der Ansicht ("inventoryV2") als Ueberschrift
             auf dem Bildschirm. Jetzt derselbe Weg wie in der Statuszeile - siehe
             kngBereichsname() in 09_tabs_sidebar_events.js. */
          const name=(typeof window.kngBereichsname==='function') ? window.kngBereichsname(id) : id;
          header.innerHTML='<div><h2>'+esc(name)+'</h2></div>'; view.prepend(header);
        }
      }
      header.classList.add('has-window-close');
      const btn=document.createElement('button');
      btn.className='window-close'; btn.type='button'; btn.title='Fenster schließen'; btn.textContent='×';
      btn.dataset.closeView=id; btn.dataset.kngSecretaryClose=id;
      header.appendChild(btn);
    });
  }


  function setSecretaryClockHands42(){
    const c=document.querySelector('.secretary-clock-live');
    if(!c) return;
    const d=new Date();
    const sec=d.getSeconds(), min=d.getMinutes()+sec/60, hr=(d.getHours()%12)+min/60;
    c.querySelector('.h')?.style.setProperty('--rot', (hr*30)+'deg');
    c.querySelector('.m')?.style.setProperty('--rot', (min*6)+'deg');
    c.querySelector('.s')?.style.setProperty('--rot', (sec*6)+'deg');
  }

  function updateSecretaryLiveDetails(){
    setSecretaryClockHands42();
    const nameEl=$('#secretaryLiveUserName');
    if(nameEl) nameEl.textContent=secretaryDisplayUser();
    const club=clubName();
    const stt=appState().settings||{};
    const motto=String(stt.clubMotto || document.getElementById('clubMotto')?.value || 'Verwaltung · Gemeinschaft · Genuss').trim();
    const lg=logo();
    const clubMain=$('#secretaryClubPosterName'); if(clubMain) clubMain.textContent=club;
    const clubSmall=$('#secretaryClubPosterSmall'); if(clubSmall) clubSmall.textContent=motto;
    const cup=$('#secretaryCupClubName'); if(cup) cup.textContent=club;
    const logoEl=$('#secretaryClubPosterLogo'); if(logoEl){ if(lg){ logoEl.innerHTML='<img src="'+esc(lg)+'" alt="Logo">'; } else { logoEl.textContent='👨‍🍳'; } }
    const cupBrand=document.querySelector('.secretary-cup-brand .hat'); if(cupBrand){ if(lg){ cupBrand.innerHTML='<img src="'+esc(lg)+'" alt="Logo">'; } else { cupBrand.textContent='👨‍🍳'; } }
    const note=$('#secretaryPinboardLiveText');
    if(note){
      const lines=pinboardLines();
      note.innerHTML=lines.map(x=>{ const empty=/^Keine Pinnwandnotiz gespeichert\.?$/i.test(x); return '<div class="secretary-pin-note'+(empty?' secretary-empty-note':'')+'">'+esc(x)+'</div>'; }).join('');
    }
  }

  function renderSecretary(){
    buildRealisticSecretaryOffice();
    ensureSecretaryCloseButtons();
    updateSecretaryLiveDetails();
    if(typeof window.applyPermissionVisibility === 'function') window.applyPermissionVisibility();
    updateSecretaryIconVisibility();
    const badge=$('#secretaryMailBadge');
    if(badge){
      const comm=Array.isArray(appState().communications)?appState().communications:[];
      badge.textContent=String(comm.filter(m=>!m.read).length || 0);
    }
  }

  function patchSessionRefresh(){
    if(window.__kngSecretaryTest39SessionPatch) return;
    window.__kngSecretaryTest39SessionPatch=true;
    ['doLogin','logout','applySession','saveState'].forEach(fn=>{
      const old=window[fn];
      if(typeof old!=='function' || old.__kngSecretaryTest39) return;
      const patched=function(){
        const r=old.apply(this,arguments);
        setTimeout(()=>{ try{ renderSecretary(); }catch(_e){} },80);
        setTimeout(()=>{ try{ updateSecretaryLiveDetails(); }catch(_e){} },300);
        return r;
      };
      patched.__kngSecretaryTest39=true;
      window[fn]=patched;
    });
    setInterval(()=>{ try{ if(document.getElementById('secretariat')?.classList.contains('active')) updateSecretaryLiveDetails(); }catch(_e){} },1200);
  }



  function syncMemberPreferencesTab(){
    const m=(typeof currentMemberId!=='undefined' && appState().members||[]).find(x=>String(x.id)===String(currentMemberId||''));
    const prefs=m && (m.preferences=m.preferences||{});
    const map={memberPrefSecretariatTheme:'secretariatTheme',memberPrefStartView:'startView',memberPrefNotes:'notes'};
    Object.entries(map).forEach(([id,key])=>{ const el=document.getElementById(id); if(el && prefs) el.value=prefs[key]||el.value||''; });
    ['memberPrefRememberOffice','memberPrefClock','memberPrefLightsOut'].forEach(id=>{ const el=document.getElementById(id); if(el && prefs) el.checked=!!prefs[id.replace('memberPref','').replace(/^./,c=>c.toLowerCase())]; });
  }
  function bindMemberPreferencesTab(){
    if(window.__kngMemberPref43Bound) return; window.__kngMemberPref43Bound=true;
    document.addEventListener('click',ev=>{ if(ev.target?.matches?.('[data-member-tab="memberPreferences"]')) setTimeout(syncMemberPreferencesTab,50); },true);
    document.addEventListener('change',ev=>{
      const ids=['memberPrefSecretariatTheme','memberPrefStartView','memberPrefRememberOffice','memberPrefClock','memberPrefLightsOut','memberPrefNotes'];
      if(!ids.includes(ev.target?.id)) return;
      const m=(appState().members||[]).find(x=>String(x.id)===String(currentMemberId||'')); if(!m) return;
      const p=m.preferences=m.preferences||{};
      p.secretariatTheme=document.getElementById('memberPrefSecretariatTheme')?.value||'global';
      p.startView=document.getElementById('memberPrefStartView')?.value||'secretariat';
      p.rememberOffice=!!document.getElementById('memberPrefRememberOffice')?.checked;
      p.clock=!!document.getElementById('memberPrefClock')?.checked;
      p.lightsOut=!!document.getElementById('memberPrefLightsOut')?.checked;
      p.notes=document.getElementById('memberPrefNotes')?.value||'';
      try{ if(typeof window.saveState==='function') window.saveState(); }catch(_e){}
    },true);
  }

  function init(){
    ensureState(); ensureNav(); bind(); patchSessionRefresh(); ensureMemberCardMarkup(); bindMemberPreferencesTab(); renderSecretary(); renderPicker(); renderPreview();
  }

  window.SecretariatMemberCardsCore={__test42:true, init, renderSecretary, renderPreview, createCards, renderPicker};
  window.MemberCardsCore = window.SecretariatMemberCardsCore;
  if(window.App && typeof App.registerInit==='function'){
    App.registerInit('secretariat-membercards-core-v42', init);
    if(App._started) setTimeout(init,0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else setTimeout(init,0);
})();
