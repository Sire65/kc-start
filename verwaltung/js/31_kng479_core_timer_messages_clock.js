/* Version 47.9 – autoritativer Kernfix für Meldungen, Digitaluhr und Auto-Aus
   WICHTIG: Dieses Modul ersetzt die Patch-Module 26–30. Es wird zuletzt geladen.
   - Meldungen erscheinen neben der Begrüßung und verschwinden automatisch.
   - Auto-Aus steht nur im Navigations-/Benutzerbereich und zählt sekundengenau herunter.
   - Digitaluhr läuft unabhängig von älteren Timer-Patches.
*/
(function(){
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const STORE_MSG_SECONDS = 'kng_message_display_seconds';
  const STORE_MANUAL_DEADLINE = 'kng479_manual_autoaus_deadline';
  const STORE_AUTO_DEADLINE = 'kng479_auto_logout_deadline';
  const LEGACY_DEADLINE_KEYS = [
    'kngManualAutoLogoutDeadlineFinal934','kngManualAutoLogoutDeadline',
    'kng474ManualLogoutDeadline','kng475_manual_autoaus_deadline','kng476_manual_deadline','kng477_manualAutoAusDeadline','kng478_manual_autoaus_deadline',
    'kng474AutoLogoutDeadline','kng475_auto_logout_deadline','kng476_auto_deadline','kng477_autoLogoutDeadline','kng478_auto_logout_deadline'
  ];

  let manualDeadline = readNumber(sessionStorage.getItem(STORE_MANUAL_DEADLINE), 0);
  let autoDeadline = readNumber(sessionStorage.getItem(STORE_AUTO_DEADLINE), 0);
  let autoMinutesSnapshot = null;
  let lastActivity = 0;
  let logoutInProgress = false;
  let loopId = null;
  let reassertId = null;

  function readNumber(value, fallback){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function loggedIn(){
    return !!window.state?.session?.isLoggedIn;
  }

  function userName(){
    return loggedIn() ? (window.state?.session?.userName || 'Benutzer') : 'Gast';
  }

  function two(n){ return String(n).padStart(2, '0'); }

  function formatTime(ms){
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
  }

  function getMessageSeconds(){
    const fromState = readNumber(window.state?.settings?.messageDisplaySeconds, 0);
    const fromLocal = readNumber(localStorage.getItem(STORE_MSG_SECONDS), 0);
    const fromInput = readNumber($('#messageDisplaySeconds')?.value, 0);
    const v = fromInput || fromState || fromLocal || 4;
    return Math.max(1, Math.min(60, Math.floor(v)));
  }

  function setMessageSeconds(value){
    const n = Math.max(1, Math.min(60, Math.floor(readNumber(value, 4))));
    window.state = window.state || {};
    state.settings = state.settings || {};
    state.settings.messageDisplaySeconds = n;
    try{ localStorage.setItem(STORE_MSG_SECONDS, String(n)); }catch(_){ }
    const input = $('#messageDisplaySeconds');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    return n;
  }

  function getAutoMinutes(){
    const fromInput = readNumber($('#autoLogoutMinutes')?.value, NaN);
    const fromState = readNumber(window.state?.settings?.autoLogoutMinutes, 0);
    const value = Number.isFinite(fromInput) ? fromInput : fromState;
    return Math.max(0, Math.floor(value || 0));
  }

  function setAutoMinutes(value){
    const n = Math.max(0, Math.floor(readNumber(value, 0)));
    window.state = window.state || {};
    state.settings = state.settings || {};
    state.settings.autoLogoutMinutes = n;
    const input = $('#autoLogoutMinutes');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    return n;
  }

  function clearLegacyDeadlineKeys(){
    LEGACY_DEADLINE_KEYS.forEach(k=>{ try{ sessionStorage.removeItem(k); }catch(_){ } });
  }

  function saveDeadlines(){
    clearLegacyDeadlineKeys();
    try{
      if(manualDeadline > 0) sessionStorage.setItem(STORE_MANUAL_DEADLINE, String(manualDeadline));
      else sessionStorage.removeItem(STORE_MANUAL_DEADLINE);
      if(autoDeadline > 0) sessionStorage.setItem(STORE_AUTO_DEADLINE, String(autoDeadline));
      else sessionStorage.removeItem(STORE_AUTO_DEADLINE);
    }catch(_){ }
  }

  function ensureMessageSettingControl(){
    const grid = $('#settingsSecurity .form-grid');
    if(grid && !$('#messageDisplaySeconds')){
      const label = document.createElement('label');
      label.className = 'kng479-message-duration-label';
      label.innerHTML = 'Meldungsfenster anzeigen (Sekunden)<input id="messageDisplaySeconds" type="number" min="1" max="60" step="1">';
      grid.appendChild(label);
    }
    setMessageSeconds(getMessageSeconds());
    const input = $('#messageDisplaySeconds');
    if(input && input.dataset.kng479Bound !== '1'){
      input.dataset.kng479Bound = '1';
      input.addEventListener('input', ev=>{
        setMessageSeconds(ev.target.value);
        try{ window.markSettingsDirty?.(); }catch(_){ }
      });
    }
  }

  function ensureToastArea(){
    const row = $('.greeting-row');
    if(!row) return null;
    let area = $('#toastArea');
    if(!area){
      area = document.createElement('div');
      area.id = 'toastArea';
    }
    if(area.parentElement !== row) row.appendChild(area);
    area.className = 'toast-area kng479-toast-area';
    area.style.display = 'inline-flex';
    area.style.position = 'static';
    return area;
  }

  function removeOldToastContainers(){
    $$('#toastContainer,.toast-container,.kng473-toast-container,#kngSessionToastArea,.kng-session-toast-area').forEach(el=>{
      if(el.id !== 'toastArea') el.remove();
    });
  }

  function showToast(message, type='info'){
    const area = ensureToastArea();
    if(!area) return;
    removeOldToastContainers();
    while(area.children.length >= 3) area.firstElementChild?.remove();

    const item = document.createElement('div');
    item.className = `toast kng479-toast ${String(type || 'info')}`;
    item.textContent = String(message || '');
    area.appendChild(item);

    let done = false;
    const remove = () => {
      if(done || !item.isConnected) return;
      done = true;
      item.classList.add('is-hiding');
      setTimeout(()=>item.remove(), 180);
    };
    const timeout = setTimeout(remove, getMessageSeconds() * 1000);
    item.addEventListener('click', ()=>{ clearTimeout(timeout); remove(); });
  }

  function authoritativeToast(){
    window.toast = showToast;
    window.showToast = showToast;
  }

  function ensureTimerElement(){
    const sessionMain = $('.session-main');
    if(!sessionMain) return null;

    // Nur ein Timer-Element erlauben, und nur im Benutzer-/Navigationsbereich.
    const all = $$('#autoLogoutCountdown');
    let timer = all[0] || null;
    all.slice(1).forEach(el=>el.remove());
    if(!timer){
      timer = document.createElement('span');
      timer.id = 'autoLogoutCountdown';
      timer.textContent = 'Auto: aus';
    }
    if(timer.parentElement !== sessionMain) sessionMain.appendChild(timer);

    // Alten Eventhandler-Müll aus früheren Patches einmal entfernen.
    if(timer.dataset.kng479Fresh !== '1'){
      const clone = timer.cloneNode(false);
      clone.id = 'autoLogoutCountdown';
      clone.dataset.kng479Fresh = '1';
      clone.textContent = timer.textContent || 'Auto: aus';
      timer.replaceWith(clone);
      timer = clone;
    }

    timer.className = 'auto-logout-countdown kng479-autoaus';
    timer.title = 'Auto-Aus / Auto-Logout manuell starten';
    timer.style.display = 'inline-flex';
    timer.style.visibility = 'visible';
    return timer;
  }

  function paintTimerText(text, msLeft=null){
    const el = ensureTimerElement();
    if(!el) return;
    el.textContent = text;
    el.classList.remove('kng479-active','kng479-warning','kng934-timer-active','kng934-timer-warning','kng474-active','kng475-active','kng476-active','kng477-active','kng478-active','warning','danger');
    if(typeof msLeft === 'number') el.classList.add(msLeft <= 30000 ? 'kng479-warning' : 'kng479-active');
  }

  function startAutoTimer(reset=false){
    if(!loggedIn()){
      autoDeadline = 0;
      saveDeadlines();
      return;
    }
    const minutes = getAutoMinutes();
    if(minutes <= 0){
      autoDeadline = 0;
      saveDeadlines();
      return;
    }
    if(reset || !autoDeadline || autoDeadline <= Date.now()){
      autoDeadline = Date.now() + minutes * 60000;
      saveDeadlines();
    }
  }

  function resetAutoTimerFromActivity(){
    if(!loggedIn() || getAutoMinutes() <= 0 || manualDeadline > Date.now() || logoutInProgress) return;
    const now = Date.now();
    if(now - lastActivity < 1200) return;
    lastActivity = now;
    startAutoTimer(true);
    paintAutoLogout();
  }

  function triggerTimedLogout(){
    if(logoutInProgress) return;
    logoutInProgress = true;
    manualDeadline = 0;
    autoDeadline = 0;
    saveDeadlines();
    paintTimerText('Auto: 00:00', 0);
    showToast('Auto-Aus-Zeit erreicht.', 'warn');
    setTimeout(()=>{
      try{
        if(typeof window.logout === 'function') window.logout();
      }catch(_){ }
      logoutInProgress = false;
      if(loggedIn()) startAutoTimer(true);
    }, 80);
  }

  function paintAutoLogout(){
    const el = ensureTimerElement();
    if(!el) return;

    if(!loggedIn()){
      manualDeadline = 0;
      autoDeadline = 0;
      saveDeadlines();
      paintTimerText('Auto: aus');
      return;
    }

    manualDeadline = readNumber(sessionStorage.getItem(STORE_MANUAL_DEADLINE), manualDeadline);
    autoDeadline = readNumber(sessionStorage.getItem(STORE_AUTO_DEADLINE), autoDeadline);
    const now = Date.now();

    if(manualDeadline > now){
      paintTimerText('Auto: ' + formatTime(manualDeadline - now), manualDeadline - now);
      return;
    }
    if(manualDeadline > 0 && manualDeadline <= now){
      triggerTimedLogout();
      return;
    }

    const minutes = getAutoMinutes();
    if(minutes > 0){
      if(autoMinutesSnapshot !== minutes){
        autoMinutesSnapshot = minutes;
        startAutoTimer(true);
      }else{
        startAutoTimer(false);
      }
      if(autoDeadline > now){
        paintTimerText('Auto: ' + formatTime(autoDeadline - now), autoDeadline - now);
        return;
      }
      if(autoDeadline > 0 && autoDeadline <= now){
        triggerTimedLogout();
        return;
      }
    }else{
      autoDeadline = 0;
      autoMinutesSnapshot = 0;
      saveDeadlines();
    }
    paintTimerText('Auto: aus');
  }

  function bindTimerClick(){
    const el = ensureTimerElement();
    if(!el || el.dataset.kng479Bound === '1') return;
    el.dataset.kng479Bound = '1';
    el.addEventListener('click', ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      const current = manualDeadline > Date.now() ? Math.ceil((manualDeadline - Date.now()) / 60000) : '';
      const input = prompt('Auto-Aus-Timer in Minuten eingeben. 0 = manuellen Timer ausschalten.', current);
      if(input === null) return;
      const minutes = Math.max(0, Math.floor(Number(String(input).replace(',','.')) || 0));
      if(minutes <= 0){
        manualDeadline = 0;
        saveDeadlines();
        showToast('Manueller Auto-Aus-Timer ausgeschaltet.', 'info');
        paintAutoLogout();
        return;
      }
      manualDeadline = Date.now() + minutes * 60000;
      saveDeadlines();
      showToast('Manueller Auto-Aus-Timer gestartet.', 'success');
      paintAutoLogout();
    }, true);
  }

  function bindAutoMinuteInput(){
    const input = $('#autoLogoutMinutes');
    if(input && input.dataset.kng479Bound !== '1'){
      input.dataset.kng479Bound = '1';
      input.addEventListener('input', ev=>{
        setAutoMinutes(ev.target.value);
        autoDeadline = 0;
        startAutoTimer(true);
        paintAutoLogout();
        try{ window.markSettingsDirty?.(); }catch(_){ }
      });
    }
  }

  function bindActivity(){
    if(document.documentElement.dataset.kng479ActivityBound === '1') return;
    document.documentElement.dataset.kng479ActivityBound = '1';
    ['click','keydown','touchstart','scroll'].forEach(type=>{
      window.addEventListener(type, resetAutoTimerFromActivity, {capture:true, passive:true});
    });
  }

  function updateDigitalClock(){
    const now = new Date();
    const clock = $('#clock');
    if(clock) clock.textContent = now.toLocaleTimeString('de-DE');
    const today = $('#todayLine');
    if(today) today.textContent = 'Heute ist ' + now.toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'});
    const greeting = $('#greeting');
    if(greeting) greeting.textContent = 'Guten Tag ' + userName();
    try{ if(typeof window.updateStatusBar === 'function') window.updateStatusBar(); }catch(_){ }
  }

  function wrapCoreSaves(){
    if(!window.__kng479SaveSettingsWrapped && typeof window.saveSettings === 'function'){
      const old = window.saveSettings;
      window.saveSettings = function(){
        setMessageSeconds($('#messageDisplaySeconds')?.value || getMessageSeconds());
        setAutoMinutes($('#autoLogoutMinutes')?.value || getAutoMinutes());
        const result = old.apply(this, arguments);
        autoDeadline = 0;
        startAutoTimer(true);
        paintAutoLogout();
        return result;
      };
      window.__kng479SaveSettingsWrapped = true;
    }
    if(!window.__kng479ApplySessionWrapped && typeof window.applySession === 'function'){
      const oldApply = window.applySession;
      window.applySession = function(){
        const result = oldApply.apply(this, arguments);
        setTimeout(()=>{
          updateDigitalClock();
          ensureToastArea();
          ensureTimerElement();
          bindTimerClick();
          startAutoTimer(true);
          paintAutoLogout();
        }, 0);
        return result;
      };
      window.__kng479ApplySessionWrapped = true;
    }
    window.updateClock = updateDigitalClock;
    window.resetAutoLogoutTimer = function(){ startAutoTimer(true); paintAutoLogout(); };
    window.updateAutoLogoutDisplay = paintAutoLogout;
  }

  function injectCss(){
    if($('#kng479-style')) return;
    const style = document.createElement('style');
    style.id = 'kng479-style';
    style.textContent = `
      .greeting-row{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}
      #toastArea.kng479-toast-area{position:static!important;display:inline-flex!important;flex-direction:row!important;gap:6px!important;align-items:center!important;max-width:780px!important;z-index:auto!important;pointer-events:auto!important;}
      .kng479-toast{display:inline-flex!important;align-items:center!important;min-height:24px!important;padding:4px 10px!important;border-radius:999px!important;font-size:12px!important;font-weight:800!important;line-height:1.15!important;white-space:nowrap!important;border:1px solid #c9ddfb!important;background:#e7f0ff!important;color:#1e4676!important;box-shadow:0 2px 8px rgba(0,0,0,.12)!important;transition:opacity .18s ease, transform .18s ease!important;}
      .kng479-toast.success{background:#166534!important;color:#fff!important;border-color:#166534!important;}
      .kng479-toast.warn{background:#92400e!important;color:#fff!important;border-color:#92400e!important;}
      .kng479-toast.error{background:#991b1b!important;color:#fff!important;border-color:#991b1b!important;}
      .kng479-toast.is-hiding{opacity:0!important;transform:translateY(-3px)!important;}
      .session-main{display:flex!important;align-items:flex-start!important;gap:8px!important;flex-wrap:wrap!important;}
      #autoLogoutCountdown.kng479-autoaus{display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;min-width:96px!important;border-radius:999px!important;padding:4px 9px!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important;user-select:none!important;background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.22)!important;}
      #autoLogoutCountdown.kng479-active{background:#c96f00!important;color:#fff8e8!important;border-color:#9a5400!important;}
      #autoLogoutCountdown.kng479-warning{background:#b00020!important;color:#fff!important;border-color:#7f0017!important;}
      .topbar #autoLogoutCountdown{display:none!important;}
      .kng479-message-duration-label input{max-width:120px!important;}
    `;
    document.head.appendChild(style);
  }

  function tick(){
    authoritativeToast();
    removeOldToastContainers();
    ensureToastArea();
    ensureMessageSettingControl();
    bindAutoMinuteInput();
    updateDigitalClock();
    paintAutoLogout();
  }

  function init(){
    injectCss();
    authoritativeToast();
    ensureToastArea();
    ensureMessageSettingControl();
    ensureTimerElement();
    bindTimerClick();
    bindAutoMinuteInput();
    bindActivity();
    wrapCoreSaves();
    updateDigitalClock();
    if(loggedIn() && getAutoMinutes() > 0 && !autoDeadline) startAutoTimer(true);
    paintAutoLogout();
    if(loopId) clearInterval(loopId);
    loopId = setInterval(tick, 1000);
    // Für die ersten Sekunden alte Patches überstimmen, falls sie durch delayed init nochmals window.toast ändern.
    if(reassertId) clearInterval(reassertId);
    const end = Date.now() + 6000;
    reassertId = setInterval(()=>{
      authoritativeToast();
      if(Date.now() > end){ clearInterval(reassertId); reassertId = null; }
    }, 150);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 250);
  setTimeout(init, 1200);
})();
