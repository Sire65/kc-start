
/* Finaler zentraler Startpunkt */
(function(){
  'use strict';
  const withTimeout=async(promise,ms,label)=>{
    let timer;
    try{
      return await Promise.race([
        Promise.resolve(promise),
        new Promise(resolve=>{timer=setTimeout(()=>{console.warn('KC Start-Watchdog: '+label+' nach '+ms+' ms freigegeben.');resolve({__kcTimeout:true,label});},ms);})
      ]);
    }finally{ if(timer) clearTimeout(timer); }
  };
  const startApp=async()=>{
    try{
      if(window.KNGDurableStorage && typeof window.KNGDurableStorage.restore==='function'){
        await withTimeout(window.KNGDurableStorage.restore(),5000,'Lokale Datenwiederherstellung');
      }
    }catch(error){ console.error('KC Start: lokale Datenwiederherstellung fehlgeschlagen:',error); }
    try{
      if(window.App && typeof App.init==='function'){
        await withTimeout(App.init(),7000,'App-Initialisierung');
      }
    }catch(error){ console.error('KC Start: App-Initialisierung fehlgeschlagen:',error); }
    return true;
  };
  const boot=()=>{
    if(window.KNGStartup && typeof window.KNGStartup.run==='function') window.KNGStartup.run(startApp).catch(error=>{
      console.error('KC Startfehler:',error);
      document.documentElement.classList.remove('kng-is-starting');
      const overlay=document.getElementById('kngStartup');
      if(overlay) overlay.remove();
    });
    else startApp();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();

/* Vollmigration Test 22 – Kernintegration: Toptools, Arbeitsplatzreset, Logo-/Leerseitenlogik */
(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
  function safeToast(msg,type){ try{ (window.toast||console.log)(msg,type||'info'); }catch(_e){} }
  /* GEAENDERT 01.09.2026: hier stand "since" - englisch, und mit vollem Datum
     ("since 01.01.1991"). Unter der Kochmuetze soll schlicht "seit 1991" stehen; der
     genaue Gruendungstag ist nicht bekannt und gehoert dort auch nicht hin. */
  function fmtSince(){
    const raw=String(window.state?.settings?.clubFoundedAt||'').trim();
    if(!raw) return 'seit --';
    const jahr=(raw.match(/^(\d{4})/)||[])[1];
    return jahr ? `seit ${jahr}` : `seit ${raw}`;
  }
  function applyEmptyDesktopBrandingV22(){
    try{ if(typeof window.applyClubBranding==='function') window.applyClubBranding(); }catch(_e){}
    const empty=$('emptyDesktop');
    const name=$('emptyClubName');
    const since=$('emptySinceLine');
    const hat=empty?.querySelector('.empty-chef-hat');
    const club=(window.state?.settings?.clubName||'Köcheclub').trim()||'Köcheclub';
    const large=(window.state?.settings?.clubLogoBackgroundPath||window.state?.settings?.clubLogoSmallPath||'').trim();
    if(name) name.textContent=club;
    if(since) since.textContent=fmtSince();
    if(empty && hat){
      if(large){
        empty.classList.add('has-custom-logo');
        if(!hat.querySelector('img') || hat.querySelector('img')?.getAttribute('src')!==large){
          hat.innerHTML=`<img src="${String(large).replace(/"/g,'&quot;')}" alt="Kochmütze">`;
        }
      }else{
        empty.classList.remove('has-custom-logo');
        if(hat.textContent!=='👨‍🍳') hat.textContent='👨‍🍳';
      }
    }
  }
  function closeAllSubmenus(){
    const pairs=[
      ['membersMenuToggle','membersSubmenu','membersMenuSign'],
      ['shoppingMenuToggle','shoppingSubmenu','shoppingMenuSign'],
      ['financeMenuToggle','financeSubmenu','financeMenuSign'],
      ['settingsMenuToggle','settingsSubmenu','settingsMenuSign']
    ];
    pairs.forEach(([btnId,subId,signId])=>{
      const btn=$(btnId), sub=$(subId), sign=$(signId);
      if(btn) btn.setAttribute('aria-expanded','false');
      if(sub) sub.classList.remove('open-submenu');
      if(sign) sign.textContent='+';
    });
    const collapse=$('navCollapseRestoreAll');
    if(collapse) collapse.textContent='+';
  }
  function resetWorkspaceV22(){
    try{
      $all('.view.active').forEach(v=>v.classList.remove('active'));
      $all('.nav.active').forEach(n=>n.classList.remove('active'));
      closeAllSubmenus();
      document.body.classList.remove('sidebar-collapsed','member-search-panel-collapsed');
      const defaultW=260;
      document.documentElement.style.setProperty('--sidebar-width', defaultW+'px');
      const sidebar=document.querySelector('.sidebar');
      if(sidebar) sidebar.style.width='';
      try{ window.state.ui=window.state.ui||{}; window.state.ui.sidebarWidth=defaultW; window.state.ui.sidebarCollapsed=false; }catch(_e){}
      document.documentElement.style.setProperty('--member-search-width','340px');
      document.documentElement.style.setProperty('--address-search-width','340px');
      document.documentElement.style.setProperty('--member-search-height','560px');
      document.documentElement.style.setProperty('--address-search-height','560px');
      const empty=$('emptyDesktop');
      if(empty) empty.classList.remove('hidden');
      applyEmptyDesktopBrandingV22();
      if(typeof window.updateStatusBar==='function') window.updateStatusBar();
      safeToast('Arbeitsplatz zurückgesetzt.','success');
    }catch(e){ console.error(e); safeToast('Arbeitsplatz konnte nicht vollständig zurückgesetzt werden.','error'); }
  }
  function normalizeTopToolsV22(){
    const controls=document.querySelector('.sidebar-controls');
    if(!controls) return;
    const toggle=$('sidebarToggle') || (()=>{const b=document.createElement('button'); b.id='sidebarToggle'; b.type='button'; b.className='sidebar-control'; b.title='Navigation ein-/ausklappen'; b.textContent='‹'; return b;})();
    const pin=$('sidebarPin') || (()=>{const b=document.createElement('button'); b.id='sidebarPin'; b.type='button'; b.className='sidebar-control'; b.title='Navigation anheften/lösen'; b.textContent='📌'; return b;})();
    let collapse=$('navCollapseRestoreAll');
    if(!collapse){ collapse=document.createElement('button'); collapse.id='navCollapseRestoreAll'; collapse.type='button'; }
    collapse.className='sidebar-control nav-collapse-restore-all';
    collapse.title='Menüstruktur ein-/ausklappen';
    collapse.textContent=collapse.textContent && collapse.textContent.trim()==='+' ? '+' : '±';
    let assistant=$('assistantQuickTop');
    if(!assistant){ assistant=document.createElement('button'); assistant.id='assistantQuickTop'; assistant.type='button'; }
    assistant.className='sidebar-control assistant-quick-top';
    assistant.title='Vereins-Assistent';
    assistant.textContent='🪄';
    let reset=$('workspaceResetTop');
    if(!reset){ reset=document.createElement('button'); reset.id='workspaceResetTop'; reset.type='button'; }
    reset.className='sidebar-control workspace-reset-top';
    reset.title='Arbeitsplatz zurücksetzen';
    reset.textContent='▣';
    $all('#topCollapseAllMenus935,#topCollapseAllMenus936,#topAssistantMagic935,#topAssistantMagic936,.quick-icons #navCollapseRestoreAll,.quick-icons .nav-collapse-restore-all,.quick-icons #assistantQuickTop,.quick-icons .assistant-quick-top,.quick-icons [data-kng-icon-key="collapseAll"],.quick-icons [data-action="collapseAll"]').forEach(el=>el.remove());
    $all('#navCollapseRestoreAll').forEach(el=>{ if(el!==collapse) el.remove(); });
    $all('#assistantQuickTop').forEach(el=>{ if(el!==assistant) el.remove(); });
    $all('#workspaceResetTop').forEach(el=>{ if(el!==reset) el.remove(); });
    [collapse,assistant,reset,pin,toggle].forEach(el=>{ if(el && el.parentNode!==controls) controls.appendChild(el); });
    collapse.style.order='1'; assistant.style.order='2'; reset.style.order='3'; pin.style.order='4'; toggle.style.order='5';
    if(!collapse.__kngV22Bound){
      collapse.__kngV22Bound=true;
      collapse.addEventListener('click',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const parents=$all('#mainNav .nav-parent');
        const anyOpen=parents.some(b=>b.getAttribute('aria-expanded')==='true');
        parents.forEach(btn=>{
          const id=btn.id||'';
          const submenu=id.includes('members')?$('membersSubmenu'):id.includes('shopping')?$('shoppingSubmenu'):id.includes('finance')?$('financeSubmenu'):id.includes('settings')?$('settingsSubmenu'):null;
          const sign=btn.querySelector('span');
          btn.setAttribute('aria-expanded', anyOpen?'false':'true');
          if(sign) sign.textContent=anyOpen?'+':'−';
          if(submenu) submenu.classList.toggle('open-submenu', !anyOpen);
        });
        collapse.textContent=anyOpen?'+':'±';
      },true);
    }
    if(!assistant.__kngV22Bound){
      assistant.__kngV22Bound=true;
      assistant.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); if(typeof window.showView==='function') window.showView('assistant'); },true);
    }
    if(!reset.__kngV22Bound){
      reset.__kngV22Bound=true;
      reset.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); resetWorkspaceV22(); },true);
    }
  }
  function initLogoFilePickerMarkupV22(){
    const configs=[
      ['clubLogoSmallPath','chooseClubLogoSmall','clubLogoSmallFile'],
      ['clubLogoBackgroundPath','chooseClubLogoBackground','clubLogoBackgroundFile']
    ];
    configs.forEach(([inputId,btnId,fileId])=>{
      const input=$(inputId);
      if(!input) return;
      let btn=$(btnId), file=$(fileId);
      if(!file){ file=document.createElement('input'); file.id=fileId; file.type='file'; file.accept='image/*'; file.hidden=true; input.insertAdjacentElement('afterend',file); }
      if(!btn){ btn=document.createElement('button'); btn.id=btnId; btn.type='button'; btn.className='mini-file-pick'; btn.title='Grafikdatei auswählen'; btn.textContent='📁'; input.insertAdjacentElement('afterend',btn); }
      if(!input.parentElement?.classList.contains('input-with-button')){
        const wrap=document.createElement('span'); wrap.className='input-with-button';
        input.parentNode.insertBefore(wrap,input); wrap.appendChild(input); wrap.appendChild(btn); wrap.appendChild(file);
      }
      if(!btn.__kngV22FileBound){ btn.__kngV22FileBound=true; btn.addEventListener('click',ev=>{ev.preventDefault(); file.click();}); }
      if(!file.__kngV22FileBound){
        file.__kngV22FileBound=true;
        file.addEventListener('change',()=>{
          if(typeof window.readImageFileToInput==='function') window.readImageFileToInput(fileId,inputId);
        });
      }
    });
  }
  function init(){
    normalizeTopToolsV22();
    initLogoFilePickerMarkupV22();
    applyEmptyDesktopBrandingV22();
    [80,300,900,1600].forEach(ms=>setTimeout(()=>{normalizeTopToolsV22(); initLogoFilePickerMarkupV22(); applyEmptyDesktopBrandingV22();},ms));
  }
  window.resetWorkspaceV22=resetWorkspaceV22;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();

/* KC Finanzen: Tagesabschlussmodul isoliert nachladen. */
(function(){
  'use strict';
  function loadFinanceClosingModule(){
    if(window.KCVerwaltungClosingReports || document.querySelector('script[data-kc-finance-closing]')) return;
    const s=document.createElement('script');
    s.src='js/86_finance_closing_reports.js?v=1';
    s.async=false;
    s.dataset.kcFinanceClosing='1';
    s.onerror=()=>console.error('KC Finanzen: Tagesabschlussmodul konnte nicht geladen werden.');
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadFinanceClosingModule,{once:true});
  else loadFinanceClosingModule();
})();
