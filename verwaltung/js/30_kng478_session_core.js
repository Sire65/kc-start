/* Version 47.8 – stabiler Kern für Kopfmeldungen, Digitaluhr und Auto-Aus
   Autoritative Version: ersetzt die alten Patch-Module 47.4–47.7.
   Regeln:
   - Meldungen stehen ausschließlich neben der Begrüßung.
   - Meldungen verschwinden automatisch nach state.settings.messageDisplaySeconds.
   - Auto-Aus steht ausschließlich im Navigationsbereich neben Benutzer/Rolle.
   - Manuell und automatisch gestartete Timer zählen sichtbar rückwärts.
   - Ablauf ruft die zentrale logout()-Sicherheitsabfrage auf.
*/
(function(){
  'use strict';

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const LS_MSG_SECONDS = 'kng_message_display_seconds';
  const SS_MANUAL_DEADLINE = 'kng478_manual_autoaus_deadline';
  const SS_AUTO_DEADLINE = 'kng478_auto_logout_deadline';
  const OLD_DEADLINE_KEYS = [
    'kngManualAutoLogoutDeadlineFinal934','kngManualAutoLogoutDeadline',
    'kng474ManualLogoutDeadline','kng475_manual_autoaus_deadline','kng476_manual_deadline','kng477_manualAutoAusDeadline',
    'kng474AutoLogoutDeadline','kng475_auto_logout_deadline','kng476_auto_deadline','kng477_autoLogoutDeadline'
  ];

  let manualDeadline = Number(sessionStorage.getItem(SS_MANUAL_DEADLINE) || 0) || 0;
  let autoDeadline = Number(sessionStorage.getItem(SS_AUTO_DEADLINE) || 0) || 0;
  let lastLoggedIn = null;
  let lastActivityAt = 0;
  let logoutPending = false;
  let intervalId = null;

  function loggedIn(){ return !!window.state?.session?.isLoggedIn; }

  function messageLevel(){
    try{ return typeof window.getSessionMessageLevel === 'function' ? window.getSessionMessageLevel() : 3; }
    catch(_){ return 3; }
  }

  function messageAllowed(type){
    const level = messageLevel();
    if(loggedIn()){
      if(level === 1 && type !== 'error') return false;
      if(level === 2 && !['error','warn'].includes(type)) return false;
    }
    return true;
  }

  function getMessageSeconds(){
    const v = Number(window.state?.settings?.messageDisplaySeconds || localStorage.getItem(LS_MSG_SECONDS) || 4);
    return Math.max(1, Math.min(60, Math.floor(v || 4)));
  }

  function setMessageSeconds(value){
    const n = Math.max(1, Math.min(60, Math.floor(Number(value) || 4)));
    window.state = window.state || {};
    state.settings = state.settings || {};
    state.settings.messageDisplaySeconds = n;
    try{ localStorage.setItem(LS_MSG_SECONDS, String(n)); }catch(_){ }
    const input = $('#messageDisplaySeconds');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    return n;
  }

  function getAutoMinutes(){
    const raw = window.state?.settings?.autoLogoutMinutes ?? $('#autoLogoutMinutes')?.value ?? 0;
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    return n;
  }

  function setAutoMinutes(value){
    const n = Math.max(0, Math.floor(Number(value) || 0));
    window.state = window.state || {};
    state.settings = state.settings || {};
    state.settings.autoLogoutMinutes = n;
    const input = $('#autoLogoutMinutes');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    return n;
  }

  function clearOldDeadlineKeys(){
    OLD_DEADLINE_KEYS.forEach(k=>{ try{ sessionStorage.removeItem(k); }catch(_){ } });
  }

  function saveDeadlines(){
    clearOldDeadlineKeys();
    if(manualDeadline > 0) sessionStorage.setItem(SS_MANUAL_DEADLINE, String(manualDeadline));
    else sessionStorage.removeItem(SS_MANUAL_DEADLINE);
    if(autoDeadline > 0) sessionStorage.setItem(SS_AUTO_DEADLINE, String(autoDeadline));
    else sessionStorage.removeItem(SS_AUTO_DEADLINE);
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
    area.className = 'toast-area kng478-toast-area';
    return area;
  }

  function removeForeignToastAreas(){
    $$('#toastContainer,.toast-container,.kng473-toast-container,#kngSessionToastArea,.kng-session-toast-area').forEach(el=>el.remove());
  }

  function toastCore(message, type='info'){
    type = String(type || 'info');
    if(!messageAllowed(type)) return;
    const area = ensureToastArea();
    if(!area) return;
    removeForeignToastAreas();
    while(area.children.length >= 3) area.firstElementChild?.remove();

    const el = document.createElement('div');
    el.className = `toast kng478-toast ${type}`;
    el.textContent = String(message || '');
    area.appendChild(el);

    let removed = false;
    const remove = () => {
      if(removed || !el.isConnected) return;
      removed = true;
      el.classList.add('is-hiding');
      setTimeout(()=>el.remove(), 180);
    };
    const timeoutId = setTimeout(remove, getMessageSeconds() * 1000);
    el.addEventListener('click', () => { clearTimeout(timeoutId); remove(); });
  }

  function two(n){ return String(n).padStart(2,'0'); }
  function formatRemaining(ms){
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
  }

  function ensureTimerElement(){
    const sessionMain = $('.session-main');
    if(!sessionMain) return null;
    let timer = $('#autoLogoutCountdown');
    if(!timer){
      timer = document.createElement('span');
      timer.id = 'autoLogoutCountdown';
    }
    // Einmalig klonen: entfernt alte, widersprechende Eventhandler aus früheren Patchversionen.
    if(timer.dataset.kng478Fresh !== '1'){
      const clone = timer.cloneNode(false);
      clone.id = 'autoLogoutCountdown';
      clone.dataset.kng478Fresh = '1';
      clone.textContent = timer.textContent || 'Auto: aus';
      timer.replaceWith(clone);
      timer = clone;
    }
    if(timer.parentElement !== sessionMain) sessionMain.appendChild(timer);
    timer.className = 'auto-logout-countdown kng478-autoaus';
    timer.title = 'Auto-Aus / Auto-Logout manuell starten';
    timer.style.display = 'inline-flex';
    timer.style.visibility = 'visible';
    return timer;
  }

  function setTimerDisplay(text, msLeft=null){
    const el = ensureTimerElement();
    if(!el) return;
    el.textContent = text;
    el.classList.remove(
      'kng478-active','kng478-warning',
      'kng477-active','kng477-warning','kng476-active','kng476-warning','kng475-active','kng475-warning','kng474-active','kng474-warning',
      'kng934-timer-active','kng934-timer-warning','warning','danger'
    );
    if(typeof msLeft === 'number') el.classList.add(msLeft <= 30000 ? 'kng478-warning' : 'kng478-active');
  }

  function startAutomaticTimer(reset){
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

  function stopAllTimers(){
    manualDeadline = 0;
    autoDeadline = 0;
    saveDeadlines();
    setTimerDisplay('Auto: aus');
  }

  function timedLogout(){
    if(logoutPending) return;
    logoutPending = true;
    manualDeadline = 0;
    autoDeadline = 0;
    saveDeadlines();
    setTimerDisplay('Auto: 00:00', 0);
    toastCore('Auto-Aus-Zeit erreicht.', 'warn');
    setTimeout(()=>{
      let result = false;
      try{
        if(typeof window.logout === 'function') result = window.logout();
      }catch(_){ result = false; }
      logoutPending = false;
      // Sicherheitsabfrage abgebrochen: automatischen Timer neu starten.
      if(result === false && loggedIn()){
        startAutomaticTimer(true);
        paintTimer();
      }
    }, 80);
  }

  function paintTimer(){
    ensureTimerElement();
    const nowLoggedIn = loggedIn();
    if(lastLoggedIn !== nowLoggedIn){
      lastLoggedIn = nowLoggedIn;
      manualDeadline = 0;
      autoDeadline = 0;
      saveDeadlines();
      if(nowLoggedIn) startAutomaticTimer(true);
    }
    if(!nowLoggedIn){
      stopAllTimers();
      return;
    }

    manualDeadline = Number(sessionStorage.getItem(SS_MANUAL_DEADLINE) || manualDeadline || 0) || 0;
    autoDeadline = Number(sessionStorage.getItem(SS_AUTO_DEADLINE) || autoDeadline || 0) || 0;
    const now = Date.now();

    if(manualDeadline > now){
      setTimerDisplay('Auto: ' + formatRemaining(manualDeadline - now), manualDeadline - now);
      return;
    }
    if(manualDeadline > 0 && manualDeadline <= now){
      timedLogout();
      return;
    }

    if(getAutoMinutes() > 0){
      startAutomaticTimer(false);
      if(autoDeadline > now){
        setTimerDisplay('Auto: ' + formatRemaining(autoDeadline - now), autoDeadline - now);
        return;
      }
      if(autoDeadline > 0 && autoDeadline <= now){
        timedLogout();
        return;
      }
    }

    setTimerDisplay('Auto: aus');
  }

  function bindManualTimer(){
    const el = ensureTimerElement();
    if(!el || el.dataset.kng478Bound === '1') return;
    el.dataset.kng478Bound = '1';
    el.addEventListener('click', ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      const current = manualDeadline > Date.now() ? Math.ceil((manualDeadline - Date.now()) / 60000) : '';
      const answer = prompt('Auto-Aus-Timer in Minuten eingeben. 0 = manuellen Timer ausschalten.', current);
      if(answer === null) return;
      const minutes = Math.max(0, Math.floor(Number(String(answer).replace(',','.')) || 0));
      if(minutes <= 0){
        manualDeadline = 0;
        saveDeadlines();
        toastCore('Manueller Auto-Aus-Timer ausgeschaltet.', 'info');
        paintTimer();
        return;
      }
      manualDeadline = Date.now() + minutes * 60000;
      saveDeadlines();
      toastCore('Manueller Auto-Aus-Timer gestartet.', 'success');
      paintTimer();
    }, true);
  }

  function bindActivityReset(){
    if(document.documentElement.dataset.kng478ActivityBound === '1') return;
    document.documentElement.dataset.kng478ActivityBound = '1';
    ['click','keydown','mousemove','touchstart','scroll'].forEach(evt=>{
      window.addEventListener(evt, ()=>{
        if(logoutPending) return;
        if(manualDeadline > Date.now()) return; // manueller Timer läuft unabhängig von Aktivität
        const now = Date.now();
        if(now - lastActivityAt < 1200) return;
        lastActivityAt = now;
        if(loggedIn() && getAutoMinutes() > 0){
          startAutomaticTimer(true);
          paintTimer();
        }
      }, {passive:true, capture:true});
    });
  }

  function updateDigitalClockCore(){
    const now = new Date();
    const clock = $('#clock');
    if(clock) clock.textContent = now.toLocaleTimeString('de-DE');
    const today = $('#todayLine');
    if(today) today.textContent = 'Heute ist ' + now.toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'});
    const greeting = $('#greeting');
    if(greeting){
      const name = loggedIn() ? (window.state?.session?.userName || 'Benutzer') : 'Gast';
      greeting.textContent = `Guten Tag ${name}`;
    }
    try{ if(typeof window.updateStatusBar === 'function') window.updateStatusBar(); }catch(_){ }
  }

  function ensureSettingsControls(){
    const grid = $('#settingsSecurity .form-grid');
    if(grid && !$('#messageDisplaySeconds')){
      const label = document.createElement('label');
      label.className = 'kng478-message-duration-label';
      label.innerHTML = 'Meldungsfenster anzeigen (Sekunden)<input id="messageDisplaySeconds" type="number" min="1" max="60" step="1">';
      grid.appendChild(label);
    }
    setMessageSeconds(getMessageSeconds());
    setAutoMinutes(getAutoMinutes());

    const msg = $('#messageDisplaySeconds');
    if(msg && msg.dataset.kng478Bound !== '1'){
      msg.dataset.kng478Bound = '1';
      msg.addEventListener('input', ev=>{
        setMessageSeconds(ev.target.value);
        try{ window.markSettingsDirty?.(); }catch(_){ }
      });
    }
    const auto = $('#autoLogoutMinutes');
    if(auto && auto.dataset.kng478Bound !== '1'){
      auto.dataset.kng478Bound = '1';
      auto.addEventListener('input', ev=>{
        setAutoMinutes(ev.target.value);
        autoDeadline = 0;
        startAutomaticTimer(true);
        paintTimer();
        try{ window.markSettingsDirty?.(); }catch(_){ }
      });
    }
  }

  function wrapCoreFunctions(){
    if(!window.__kng478SaveSettingsWrapped && typeof window.saveSettings === 'function'){
      const oldSave = window.saveSettings;
      window.saveSettings = function(){
        setMessageSeconds($('#messageDisplaySeconds')?.value || getMessageSeconds());
        setAutoMinutes($('#autoLogoutMinutes')?.value || getAutoMinutes());
        const result = oldSave.apply(this, arguments);
        autoDeadline = 0;
        startAutomaticTimer(true);
        paintTimer();
        return result;
      };
      window.__kng478SaveSettingsWrapped = true;
    }

    if(!window.__kng478RenderSettingsWrapped && typeof window.renderSettings === 'function'){
      const oldRender = window.renderSettings;
      window.renderSettings = function(){
        const result = oldRender.apply(this, arguments);
        setTimeout(ensureSettingsControls, 0);
        return result;
      };
      window.__kng478RenderSettingsWrapped = true;
    }

    if(!window.__kng478ApplySessionWrapped && typeof window.applySession === 'function'){
      const oldApply = window.applySession;
      window.applySession = function(){
        const result = oldApply.apply(this, arguments);
        setTimeout(()=>{
          ensureToastArea();
          ensureTimerElement();
          bindManualTimer();
          updateDigitalClockCore();
          paintTimer();
        }, 0);
        return result;
      };
      window.__kng478ApplySessionWrapped = true;
    }

    // Autoritative globale Schnittstellen.
    window.toast = toastCore;
    window.updateClock = updateDigitalClockCore;
    window.resetAutoLogoutTimer = function(){ startAutomaticTimer(true); paintTimer(); };
    window.updateAutoLogoutDisplay = paintTimer;
  }

  function injectCss(){
    if($('#kng478-style')) return;
    const style = document.createElement('style');
    style.id = 'kng478-style';
    style.textContent = `
      .greeting-row{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}
      .kng478-toast-area{position:static!important;display:inline-flex!important;flex-direction:row!important;gap:6px!important;align-items:center!important;max-width:none!important;z-index:auto!important;}
      .kng478-toast{display:inline-flex!important;align-items:center!important;min-height:24px!important;padding:4px 10px!important;border-radius:999px!important;font-size:12px!important;font-weight:800!important;line-height:1.15!important;white-space:nowrap!important;border:1px solid #c9ddfb!important;background:#e7f0ff!important;color:#1e4676!important;box-shadow:0 2px 8px rgba(0,0,0,.12)!important;transition:opacity .18s ease, transform .18s ease!important;}
      .kng478-toast.success{background:#166534!important;color:#fff!important;border-color:#166534!important;}
      .kng478-toast.warn{background:#92400e!important;color:#fff!important;border-color:#92400e!important;}
      .kng478-toast.error{background:#991b1b!important;color:#fff!important;border-color:#991b1b!important;}
      .kng478-toast.is-hiding{opacity:0!important;transform:translateY(-3px)!important;}
      .session-main{display:flex!important;align-items:flex-start!important;gap:8px!important;flex-wrap:wrap!important;}
      #autoLogoutCountdown.kng478-autoaus{display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;min-width:96px!important;border-radius:999px!important;padding:4px 9px!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important;user-select:none!important;background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.22)!important;}
      #autoLogoutCountdown.kng478-active{background:#c96f00!important;color:#fff8e8!important;border-color:#9a5400!important;}
      #autoLogoutCountdown.kng478-warning{background:#b00020!important;color:#fff!important;border-color:#7f0017!important;}
      .topbar #autoLogoutCountdown{display:none!important;}
      .kng478-message-duration-label input{max-width:120px!important;}
    `;
    document.head.appendChild(style);
  }

  function init(){
    injectCss();
    removeForeignToastAreas();
    ensureToastArea();
    ensureTimerElement();
    ensureSettingsControls();
    bindManualTimer();
    bindActivityReset();
    wrapCoreFunctions();
    updateDigitalClockCore();
    paintTimer();
    if(intervalId) clearInterval(intervalId);
    intervalId = setInterval(()=>{
      window.toast = toastCore;
      updateDigitalClockCore();
      paintTimer();
    }, 1000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 300);
  setTimeout(init, 1200);
})();
