/* Version 47.7 – Kernkorrektur Meldungen + Auto-Aus
   Ziel:
   1) Systemmeldungen stehen ausschließlich neben der Begrüßung.
   2) Meldungen verschwinden automatisch nach der in Stammdaten/Sicherheit gesetzten Dauer.
   3) Auto-Aus steht ausschließlich im Navigations-/Benutzerbereich neben Benutzer/Rolle.
   4) Manuell und automatisch gestarteter Timer zählt sichtbar herunter.
   5) Ablauf ruft die zentrale logout()-Sicherheitsabfrage auf.
*/
(function(){
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const STORE_MANUAL = 'kng477_manualAutoAusDeadline';
  const STORE_AUTO = 'kng477_autoLogoutDeadline';
  const STORE_MSG_SECONDS = 'kng_message_display_seconds';

  let manualDeadline = Number(sessionStorage.getItem(STORE_MANUAL) || 0) || 0;
  let autoDeadline = Number(sessionStorage.getItem(STORE_AUTO) || 0) || 0;
  let lastActivity = 0;
  let lastSessionState = null;
  let timerLoop = null;
  let logoutInProgress = false;

  function loggedIn(){
    return !!window.state?.session?.isLoggedIn;
  }

  function msgLevel(){
    try{ return typeof window.getSessionMessageLevel === 'function' ? window.getSessionMessageLevel() : 3; }
    catch(_){ return 3; }
  }

  function allowMessage(type){
    const level = msgLevel();
    if(loggedIn()){
      if(level === 1 && type !== 'error') return false;
      if(level === 2 && !['error','warn'].includes(type)) return false;
    }
    return true;
  }

  function getMessageSeconds(){
    const fromState = Number(window.state?.settings?.messageDisplaySeconds || 0);
    const fromLocal = Number(localStorage.getItem(STORE_MSG_SECONDS) || 0);
    const value = fromState || fromLocal || 4;
    return Math.max(1, Math.min(60, Math.floor(value)));
  }

  function setMessageSeconds(value){
    const n = Math.max(1, Math.min(60, Math.floor(Number(value) || 4)));
    if(window.state?.settings) window.state.settings.messageDisplaySeconds = n;
    try{ localStorage.setItem(STORE_MSG_SECONDS, String(n)); }catch(_){ }
    const input = $('#messageDisplaySeconds');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    return n;
  }

  function getAutoMinutes(){
    const input = $('#autoLogoutMinutes');
    const raw = window.state?.settings?.autoLogoutMinutes ?? input?.value ?? 0;
    const value = Math.floor(Number(raw) || 0);
    return value > 0 ? value : 0;
  }

  function setAutoMinutes(value){
    const n = Math.max(0, Math.floor(Number(value) || 0));
    if(window.state?.settings) window.state.settings.autoLogoutMinutes = n;
    const input = $('#autoLogoutMinutes');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    return n;
  }

  function two(n){ return String(n).padStart(2,'0'); }
  function formatMs(ms){
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
  }

  function saveDeadlines(){
    if(manualDeadline > 0) sessionStorage.setItem(STORE_MANUAL, String(manualDeadline));
    else sessionStorage.removeItem(STORE_MANUAL);

    if(autoDeadline > 0) sessionStorage.setItem(STORE_AUTO, String(autoDeadline));
    else sessionStorage.removeItem(STORE_AUTO);

    // alte Schlüssel leeren, damit ältere Module nicht wieder übernehmen
    ['kngManualAutoLogoutDeadlineFinal934','kngManualAutoLogoutDeadline','kng474ManualLogoutDeadline','kng475_manual_autoaus_deadline','kng476_manual_deadline','kng474AutoLogoutDeadline','kng475_auto_logout_deadline','kng476_auto_deadline'].forEach(k=>{
      try{ sessionStorage.removeItem(k); }catch(_){ }
    });
  }

  function ensureToastArea(){
    const row = $('.greeting-row');
    if(!row) return $('#toastArea');
    let area = $('#toastArea');
    if(!area){
      area = document.createElement('div');
      area.id = 'toastArea';
    }
    if(area.parentElement !== row) row.appendChild(area);
    area.className = 'toast-area kng477-toast-area';
    return area;
  }

  function removeForeignToastAreas(){
    $$('#toastContainer,.toast-container,.kng473-toast-container,#kngSessionToastArea,.kng-session-toast-area').forEach(el=>el.remove());
  }

  function showToast(message, type='info'){
    type = String(type || 'info');
    if(!allowMessage(type)) return;
    const area = ensureToastArea();
    if(!area) return;
    removeForeignToastAreas();
    while(area.children.length >= 3) area.firstElementChild?.remove();

    const el = document.createElement('div');
    el.className = `toast kng477-toast ${type}`;
    el.textContent = String(message || '');
    area.appendChild(el);

    const remove = () => {
      if(!el.isConnected) return;
      el.classList.add('is-hiding');
      setTimeout(()=>el.remove(), 220);
    };
    const id = setTimeout(remove, getMessageSeconds() * 1000);
    el.addEventListener('click', () => { clearTimeout(id); remove(); });
  }

  function ensureTimerInNavigation(){
    const sessionMain = $('.session-main');
    let timer = $('#autoLogoutCountdown');
    if(!sessionMain || !timer) return timer;

    // Falls irgendein älteres Skript den Timer in die Begrüßungszeile verschoben hat: zurückholen.
    if(timer.parentElement !== sessionMain) sessionMain.appendChild(timer);

    timer.className = 'auto-logout-countdown kng477-auto-timer';
    timer.title = 'Auto-Aus / Auto-Logout manuell starten';
    timer.style.display = 'inline-flex';
    timer.style.visibility = 'visible';
    return timer;
  }

  function setTimerText(text, msLeft=null){
    const timer = ensureTimerInNavigation();
    if(!timer) return;
    timer.textContent = text;
    timer.classList.remove('kng477-active','kng477-warning','kng934-timer-active','kng934-timer-warning','kng474-active','kng474-warning','kng475-active','kng475-warning','kng476-active','kng476-warning','warning','danger');
    if(typeof msLeft === 'number'){
      timer.classList.add(msLeft <= 30000 ? 'kng477-warning' : 'kng477-active');
    }
  }

  function stopTimers(){
    manualDeadline = 0;
    autoDeadline = 0;
    saveDeadlines();
    setTimerText('Auto: aus');
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

  function performTimedLogout(){
    if(logoutInProgress) return;
    logoutInProgress = true;
    manualDeadline = 0;
    autoDeadline = 0;
    saveDeadlines();
    setTimerText('Auto: 00:00', 0);
    showToast('Auto-Aus-Zeit erreicht.', 'warn');

    setTimeout(()=>{
      let result = false;
      try{
        if(typeof window.logout === 'function') result = window.logout();
      }catch(_){ result = false; }
      logoutInProgress = false;

      // Bei Abbruch der Sicherheitsabfrage wieder automatisch neu starten.
      if(result === false && loggedIn()){
        startAutoTimer(true);
        paintTimer();
      }
    }, 120);
  }

  function paintTimer(){
    ensureToastArea();
    removeForeignToastAreas();
    ensureTimerInNavigation();
    window.toast = showToast;

    const nowLogged = loggedIn();
    if(lastSessionState !== nowLogged){
      lastSessionState = nowLogged;
      manualDeadline = 0;
      autoDeadline = 0;
      saveDeadlines();
      if(nowLogged) startAutoTimer(true);
    }

    if(!nowLogged){
      stopTimers();
      return;
    }

    // Nur 47.7-Schlüssel auswerten. Alte Deadlines werden absichtlich ignoriert.
    manualDeadline = Number(sessionStorage.getItem(STORE_MANUAL) || manualDeadline || 0) || 0;
    autoDeadline = Number(sessionStorage.getItem(STORE_AUTO) || autoDeadline || 0) || 0;

    const now = Date.now();
    if(manualDeadline > now){
      setTimerText('Auto: ' + formatMs(manualDeadline - now), manualDeadline - now);
      return;
    }
    if(manualDeadline > 0 && manualDeadline <= now){
      performTimedLogout();
      return;
    }

    if(getAutoMinutes() > 0){
      startAutoTimer(false);
      if(autoDeadline > now){
        setTimerText('Auto: ' + formatMs(autoDeadline - now), autoDeadline - now);
        return;
      }
      if(autoDeadline > 0 && autoDeadline <= now){
        performTimedLogout();
        return;
      }
    }

    setTimerText('Auto: aus');
  }

  function bindManualTimer(){
    const timer = ensureTimerInNavigation();
    if(!timer || timer.dataset.kng477Bound === '1') return;
    timer.dataset.kng477Bound = '1';
    timer.addEventListener('click', ev=>{
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
        showToast('Manueller Auto-Aus-Timer ausgeschaltet.', 'info');
        paintTimer();
        return;
      }
      manualDeadline = Date.now() + minutes * 60000;
      saveDeadlines();
      showToast('Manueller Auto-Aus-Timer gestartet.', 'success');
      paintTimer();
    }, true);
  }

  function bindActivityReset(){
    if(document.documentElement.dataset.kng477ActivityBound === '1') return;
    document.documentElement.dataset.kng477ActivityBound = '1';
    ['click','keydown','mousemove','touchstart','scroll'].forEach(evt=>{
      window.addEventListener(evt, ()=>{
        if(logoutInProgress) return;
        if(manualDeadline > Date.now()) return; // manueller Timer läuft unabhängig
        const now = Date.now();
        if(now - lastActivity < 1200) return;
        lastActivity = now;
        if(loggedIn() && getAutoMinutes() > 0){
          startAutoTimer(true);
          paintTimer();
        }
      }, {passive:true, capture:true});
    });
  }

  function ensureSettingsControls(){
    const grid = $('#settingsSecurity .form-grid');
    if(grid && !$('#messageDisplaySeconds')){
      const label = document.createElement('label');
      label.className = 'kng477-message-duration-label';
      label.innerHTML = 'Meldungsfenster anzeigen (Sekunden)<input id="messageDisplaySeconds" type="number" min="1" max="60" step="1">';
      grid.appendChild(label);
    }
    setMessageSeconds(getMessageSeconds());
    setAutoMinutes(getAutoMinutes());

    $('#messageDisplaySeconds')?.addEventListener('input', ev=>{
      setMessageSeconds(ev.target.value);
      try{ window.markSettingsDirty?.(); }catch(_){ }
    });
    $('#autoLogoutMinutes')?.addEventListener('input', ev=>{
      setAutoMinutes(ev.target.value);
      autoDeadline = 0;
      startAutoTimer(true);
      paintTimer();
      try{ window.markSettingsDirty?.(); }catch(_){ }
    });
  }

  function wrapCoreFunctions(){
    if(!window.__kng477SaveSettingsWrapped && typeof window.saveSettings === 'function'){
      const old = window.saveSettings;
      window.saveSettings = function(){
        setMessageSeconds($('#messageDisplaySeconds')?.value || getMessageSeconds());
        setAutoMinutes($('#autoLogoutMinutes')?.value || getAutoMinutes());
        const result = old.apply(this, arguments);
        autoDeadline = 0;
        startAutoTimer(true);
        paintTimer();
        return result;
      };
      window.__kng477SaveSettingsWrapped = true;
    }

    if(!window.__kng477RenderSettingsWrapped && typeof window.renderSettings === 'function'){
      const old = window.renderSettings;
      window.renderSettings = function(){
        const result = old.apply(this, arguments);
        setTimeout(()=>{ ensureSettingsControls(); paintTimer(); }, 0);
        return result;
      };
      window.__kng477RenderSettingsWrapped = true;
    }

    if(!window.__kng477ApplySessionWrapped && typeof window.applySession === 'function'){
      const old = window.applySession;
      window.applySession = function(){
        const result = old.apply(this, arguments);
        setTimeout(()=>{ ensureToastArea(); ensureTimerInNavigation(); bindManualTimer(); paintTimer(); }, 0);
        return result;
      };
      window.__kng477ApplySessionWrapped = true;
    }

    // Öffentliche Funktionen bewusst auf 47.7-Kern setzen.
    window.toast = showToast;
    window.resetAutoLogoutTimer = function(){ startAutoTimer(true); paintTimer(); };
    window.updateAutoLogoutDisplay = paintTimer;
  }

  function injectCss(){
    if($('#kng477-style')) return;
    const style = document.createElement('style');
    style.id = 'kng477-style';
    style.textContent = `
      .greeting-row{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}
      .kng477-toast-area{position:static!important;display:inline-flex!important;flex-direction:row!important;gap:6px!important;align-items:center!important;z-index:auto!important;max-width:none!important;}
      .kng477-toast{display:inline-flex!important;align-items:center!important;min-height:25px!important;padding:4px 10px!important;border-radius:999px!important;font-size:12px!important;font-weight:800!important;line-height:1.15!important;white-space:nowrap!important;border:1px solid #c9ddfb!important;background:#e7f0ff!important;color:#1e4676!important;box-shadow:0 2px 8px rgba(0,0,0,.12)!important;transition:opacity .22s ease, transform .22s ease!important;}
      .kng477-toast.success{background:#166534!important;color:#fff!important;border-color:#166534!important;}
      .kng477-toast.warn{background:#92400e!important;color:#fff!important;border-color:#92400e!important;}
      .kng477-toast.error{background:#991b1b!important;color:#fff!important;border-color:#991b1b!important;}
      .kng477-toast.is-hiding{opacity:0!important;transform:translateY(-3px)!important;}
      .session-main{display:flex!important;align-items:flex-start!important;gap:8px!important;flex-wrap:wrap!important;}
      #autoLogoutCountdown.kng477-auto-timer{display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;min-width:96px!important;border-radius:999px!important;padding:4px 9px!important;font-weight:900!important;font-size:12px!important;cursor:pointer!important;user-select:none!important;background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.22)!important;}
      #autoLogoutCountdown.kng477-active{background:#c96f00!important;color:#fff8e8!important;border-color:#9a5400!important;}
      #autoLogoutCountdown.kng477-warning{background:#b00020!important;color:#fff!important;border-color:#7f0017!important;}
      .kng477-message-duration-label input{max-width:120px!important;}
    `;
    document.head.appendChild(style);
  }

  function init(){
    injectCss();
    removeForeignToastAreas();
    ensureToastArea();
    ensureTimerInNavigation();
    ensureSettingsControls();
    bindManualTimer();
    bindActivityReset();
    wrapCoreFunctions();
    window.toast = showToast;
    if(timerLoop) clearInterval(timerLoop);
    timerLoop = setInterval(paintTimer, 250);
    paintTimer();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 500);
  setTimeout(init, 1500);
  setTimeout(init, 3000);
})();
