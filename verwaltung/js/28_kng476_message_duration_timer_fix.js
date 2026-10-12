/* Version 47.6 – Meldungsdauer dynamisch + Auto-Aus wieder im Benutzerbereich
   - Meldungen bleiben neben der Begrüßung, Dauer aus Stammdaten/Sicherheit
   - Auto-Aus/Auto-Logout-Anzeige wieder im Navigationsbereich neben Benutzer/Rolle
   - Countdown zählt sichtbar herunter
   - Ablauf ruft vorhandene Logout-Sicherheitsabfrage auf
*/
(function(){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  const STORE_MANUAL = 'kng476_manual_deadline';
  const STORE_AUTO = 'kng476_auto_deadline';
  const STORE_MSG = 'kng476_message_seconds';
  let manualDeadline = Number(sessionStorage.getItem(STORE_MANUAL)||0)||0;
  let autoDeadline = Number(sessionStorage.getItem(STORE_AUTO)||0)||0;
  let loop = null;
  let lastActivity = 0;
  let lastLoginState = null;
  let applyingLogout = false;

  function loggedIn(){ return !!window.state?.session?.isLoggedIn; }
  function getAutoMinutes(){
    const v = Number(window.state?.settings?.autoLogoutMinutes || $('#autoLogoutMinutes')?.value || 0);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }
  function getMessageSeconds(){
    const fromState = Number(window.state?.settings?.messageDisplaySeconds || 0);
    const fromLocal = Number(localStorage.getItem(STORE_MSG) || 0);
    const v = fromState || fromLocal || 3;
    return Math.max(1, Math.min(60, Math.floor(v)));
  }
  function setMessageSeconds(v){
    const n = Math.max(1, Math.min(60, Math.floor(Number(v)||3)));
    if(window.state?.settings) window.state.settings.messageDisplaySeconds = n;
    try{ localStorage.setItem(STORE_MSG,String(n)); }catch(_){ }
    const inp = $('#messageDisplaySeconds'); if(inp) inp.value = String(n);
  }
  function fmt(ms){
    const sec = Math.max(0, Math.ceil(ms/1000));
    const h = Math.floor(sec/3600);
    const m = Math.floor((sec%3600)/60);
    const s = sec%60;
    const two = n=>String(n).padStart(2,'0');
    return h>0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
  }
  function saveDeadlines(){
    if(manualDeadline>0) sessionStorage.setItem(STORE_MANUAL,String(manualDeadline)); else sessionStorage.removeItem(STORE_MANUAL);
    if(autoDeadline>0) sessionStorage.setItem(STORE_AUTO,String(autoDeadline)); else sessionStorage.removeItem(STORE_AUTO);
  }

  function ensureMessageSetting(){
    const sec = $('#settingsSecurity .form-grid');
    if(!sec || $('#messageDisplaySeconds')) return;
    const label = document.createElement('label');
    label.className = 'kng476-message-duration-label';
    label.innerHTML = 'Meldungsfenster anzeigen (Sekunden)<input id="messageDisplaySeconds" type="number" min="1" max="60" step="1">';
    sec.appendChild(label);
    setMessageSeconds(getMessageSeconds());
    $('#messageDisplaySeconds')?.addEventListener('input', e=>setMessageSeconds(e.target.value));
  }

  function ensureToastArea(){
    const row = $('.greeting-row');
    if(!row) return null;
    let area = $('#toastArea');
    if(!area){
      area = document.createElement('div');
      area.id = 'toastArea';
      row.appendChild(area);
    }
    if(area.parentElement !== row) row.appendChild(area);
    area.className = 'toast-area kng476-header-toast-area';
    return area;
  }
  function clearOtherToasts(){
    document.querySelectorAll('#toastContainer,.toast-container,.kng473-toast-container,#kngSessionToastArea').forEach(el=>el.remove());
  }
  function headerToast(message,type='info'){
    const area = ensureToastArea();
    if(!area) return;
    clearOtherToasts();
    while(area.children.length >= 3) area.firstElementChild?.remove();
    const el = document.createElement('div');
    el.className = `toast kng476-toast ${String(type||'info')}`;
    el.textContent = String(message||'');
    area.appendChild(el);
    const remove = ()=>{ el.classList.add('is-hiding'); setTimeout(()=>el.remove(),200); };
    const ms = getMessageSeconds()*1000;
    const id = setTimeout(remove, ms);
    el.addEventListener('click',()=>{ clearTimeout(id); remove(); });
  }

  function ensureTimerInSession(){
    const sessionMain = $('.session-main');
    if(!sessionMain) return null;
    let el = $('#autoLogoutCountdown');
    if(!el){
      el = document.createElement('span');
      el.id = 'autoLogoutCountdown';
      el.className = 'auto-logout-countdown';
    }
    if(el.parentElement !== sessionMain) sessionMain.appendChild(el);
    el.title = 'Auto-Aus / Auto-Logout manuell starten';
    el.classList.add('kng476-autoaus-display');
    el.style.display = 'inline-flex';
    el.style.visibility = 'visible';
    return el;
  }
  function setTimerText(text, msLeft){
    const el = ensureTimerInSession();
    if(!el) return;
    el.textContent = text;
    el.classList.remove('kng476-active','kng476-warning','kng934-timer-active','kng934-timer-warning','warning','danger','kng475-active','kng475-warning');
    if(typeof msLeft === 'number') el.classList.add(msLeft <= 30000 ? 'kng476-warning' : 'kng476-active');
  }
  function startAuto(reset){
    if(!loggedIn()){ autoDeadline = 0; saveDeadlines(); return; }
    const min = getAutoMinutes();
    if(min <= 0){ autoDeadline = 0; saveDeadlines(); return; }
    if(reset || !autoDeadline || autoDeadline <= Date.now()){
      autoDeadline = Date.now() + min*60000;
      saveDeadlines();
    }
  }
  function stopAll(){
    manualDeadline = 0; autoDeadline = 0; saveDeadlines(); setTimerText('Auto: aus');
  }
  function timerExpired(kind){
    if(applyingLogout) return;
    applyingLogout = true;
    manualDeadline = 0; autoDeadline = 0; saveDeadlines();
    setTimerText('Auto: 00:00',0);
    headerToast(kind==='manual' ? 'Auto-Aus-Zeit erreicht.' : 'Auto-Aus-Zeit erreicht.','warn');
    setTimeout(()=>{
      let ok = false;
      try{
        if(typeof window.logout === 'function') ok = window.logout();
      }catch(_){ ok = false; }
      applyingLogout = false;
      if(ok === false && loggedIn()){
        // Sicherheitsabfrage wurde abgebrochen: Auto-Timer neu starten.
        startAuto(true);
        paint();
      }
    },100);
  }
  function paint(){
    ensureMessageSetting();
    ensureToastArea();
    ensureTimerInSession();
    clearOtherToasts();
    window.toast = headerToast;

    const nowLogged = loggedIn();
    if(lastLoginState !== nowLogged){
      lastLoginState = nowLogged;
      manualDeadline = 0;
      autoDeadline = 0;
      saveDeadlines();
      if(nowLogged) startAuto(true);
    }
    if(!nowLogged){ stopAll(); return; }

    manualDeadline = Number(sessionStorage.getItem(STORE_MANUAL)||manualDeadline||0)||0;
    autoDeadline = Number(sessionStorage.getItem(STORE_AUTO)||autoDeadline||0)||0;
    const now = Date.now();

    if(manualDeadline > now){ setTimerText('Auto: '+fmt(manualDeadline-now), manualDeadline-now); return; }
    if(manualDeadline > 0 && manualDeadline <= now){ timerExpired('manual'); return; }

    if(getAutoMinutes() > 0){
      startAuto(false);
      if(autoDeadline > now){ setTimerText('Auto: '+fmt(autoDeadline-now), autoDeadline-now); return; }
      if(autoDeadline > 0 && autoDeadline <= now){ timerExpired('auto'); return; }
    }
    setTimerText('Auto: aus');
  }
  function bindTimerClick(){
    const el = ensureTimerInSession();
    if(!el || el.dataset.kng476Bound === '1') return;
    el.dataset.kng476Bound = '1';
    el.addEventListener('click', ev=>{
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      const cur = manualDeadline>Date.now() ? Math.ceil((manualDeadline-Date.now())/60000) : '';
      const v = prompt('Auto-Aus-Timer in Minuten eingeben. 0 = manuellen Timer ausschalten.', cur);
      if(v === null) return;
      const min = Math.max(0, Math.floor(Number(String(v).replace(',','.'))||0));
      if(min <= 0){ manualDeadline = 0; saveDeadlines(); headerToast('Manueller Auto-Aus-Timer ausgeschaltet.','info'); paint(); return; }
      manualDeadline = Date.now() + min*60000;
      saveDeadlines();
      headerToast('Manueller Auto-Aus-Timer gestartet.','success');
      paint();
    }, true);
  }
  function bindActivity(){
    if(document.documentElement.dataset.kng476ActivityBound === '1') return;
    document.documentElement.dataset.kng476ActivityBound = '1';
    ['click','keydown','touchstart','scroll'].forEach(evt=>{
      window.addEventListener(evt, ()=>{
        if(applyingLogout) return;
        if(manualDeadline > Date.now()) return;
        const now = Date.now();
        if(now - lastActivity < 1200) return;
        lastActivity = now;
        if(loggedIn() && getAutoMinutes()>0){ startAuto(true); }
      }, {passive:true});
    });
  }
  function wrapSaveSettings(){
    if(!window.__kng476SaveWrapped && typeof window.saveSettings === 'function'){
      const old = window.saveSettings;
      window.saveSettings = function(){
        const inp = $('#messageDisplaySeconds');
        if(inp) setMessageSeconds(inp.value);
        const auto = $('#autoLogoutMinutes');
        if(auto && window.state?.settings) window.state.settings.autoLogoutMinutes = Math.max(0,Math.floor(Number(auto.value)||0));
        const r = old.apply(this,arguments);
        autoDeadline = 0; startAuto(true); paint();
        return r;
      };
      window.__kng476SaveWrapped = true;
    }
    window.resetAutoLogoutTimer = function(){ startAuto(true); paint(); };
    window.updateAutoLogoutDisplay = paint;
  }
  function injectCss(){
    if($('#kng476-style')) return;
    const s = document.createElement('style');
    s.id = 'kng476-style';
    s.textContent = `
      .greeting-row{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}
      .kng476-header-toast-area{position:static!important;display:inline-flex!important;flex-direction:row!important;gap:6px!important;align-items:center!important;max-width:none!important;z-index:auto!important;}
      .kng476-toast{display:inline-flex!important;align-items:center!important;min-height:26px!important;padding:5px 10px!important;border-radius:999px!important;font-size:12px!important;font-weight:800!important;box-shadow:0 3px 10px rgba(0,0,0,.12)!important;transition:opacity .2s ease, transform .2s ease!important;white-space:nowrap!important;background:#e7f0ff!important;color:#1e4676!important;border:1px solid #c9ddfb!important;}
      .kng476-toast.success{background:#166534!important;color:#fff!important;border-color:#166534!important}.kng476-toast.warn{background:#92400e!important;color:#fff!important;border-color:#92400e!important}.kng476-toast.error{background:#991b1b!important;color:#fff!important;border-color:#991b1b!important}.kng476-toast.is-hiding{opacity:0!important;transform:translateY(-3px)!important;}
      .session-main{display:flex!important;align-items:flex-start!important;gap:8px!important;flex-wrap:wrap!important;}
      #autoLogoutCountdown.kng476-autoaus-display{display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;min-width:94px!important;border-radius:999px!important;padding:4px 8px!important;font-weight:900!important;cursor:pointer!important;user-select:none!important;background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.2)!important;}
      #autoLogoutCountdown.kng476-active{background:#c96f00!important;color:#fff8e8!important;border-color:#9a5400!important;}#autoLogoutCountdown.kng476-warning{background:#b00020!important;color:#fff!important;border-color:#7f0017!important;}
      .kng476-message-duration-label input{max-width:120px!important;}
    `;
    document.head.appendChild(s);
  }
  function init(){
    injectCss();
    ensureMessageSetting();
    ensureToastArea();
    ensureTimerInSession();
    bindTimerClick();
    bindActivity();
    wrapSaveSettings();
    window.toast = headerToast;
    if(!loop) loop = setInterval(paint,250);
    paint();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(init,500); setTimeout(init,1500); setTimeout(init,3000);
})();
