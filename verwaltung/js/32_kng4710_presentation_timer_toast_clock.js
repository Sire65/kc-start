/* Version 47.10 – Präsentations-Kernfix für Meldungen, Digitaluhr und Auto-Aus
   Ziel: Eine einzige autoritative Laufzeit-Schleife per requestAnimationFrame.
   Keine konkurrierenden setInterval-/setTimeout-Abhängigkeiten für Uhr, Meldungen und Auto-Aus.
*/
(function(){
  'use strict';
  if(window.__KNG4710_PRESENTATION_CORE__) return;
  window.__KNG4710_PRESENTATION_CORE__ = true;

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const LS_MSG_SECONDS = 'kng4710_message_seconds';
  const SS_MANUAL_DEADLINE = 'kng4710_manual_deadline';
  const SS_AUTO_DEADLINE = 'kng4710_auto_deadline';

  let manualDeadline = Number(sessionStorage.getItem(SS_MANUAL_DEADLINE) || 0) || 0;
  let autoDeadline = Number(sessionStorage.getItem(SS_AUTO_DEADLINE) || 0) || 0;
  let currentAutoMinutes = null;
  let frameRunning = false;
  let lastClockText = '';
  let lastTimerText = '';
  let logoutRunning = false;
  const liveToasts = [];

  const legacyDeadlineKeys = [
    'kng479_manual_autoaus_deadline','kng479_auto_logout_deadline',
    'kng478_manual_autoaus_deadline','kng478_auto_logout_deadline',
    'kng477_manualAutoAusDeadline','kng477_autoLogoutDeadline',
    'kng476_manual_deadline','kng476_auto_deadline',
    'kng475_manual_autoaus_deadline','kng475_auto_logout_deadline',
    'kng474ManualLogoutDeadline','kng474AutoLogoutDeadline',
    'kngManualAutoLogoutDeadlineFinal934','kngManualAutoLogoutDeadline'
  ];

  function loggedIn(){ return !!window.state?.session?.isLoggedIn; }
  function sessionUser(){ return loggedIn() ? (state.session.userName || 'Benutzer') : 'Gast'; }
  function nval(v, fallback=0){ const n = Number(String(v ?? '').replace(',','.')); return Number.isFinite(n) ? n : fallback; }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function fmt(ms){
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
  }
  function nowMs(){ return Date.now(); }

  function cleanLegacyDeadlines(){
    legacyDeadlineKeys.forEach(k=>{ try{ sessionStorage.removeItem(k); }catch(_){} });
  }
  function persistDeadlines(){
    cleanLegacyDeadlines();
    try{
      if(manualDeadline > 0) sessionStorage.setItem(SS_MANUAL_DEADLINE, String(manualDeadline));
      else sessionStorage.removeItem(SS_MANUAL_DEADLINE);
      if(autoDeadline > 0) sessionStorage.setItem(SS_AUTO_DEADLINE, String(autoDeadline));
      else sessionStorage.removeItem(SS_AUTO_DEADLINE);
    }catch(_){}
  }

  function getMessageSeconds(){
    const fromInput = nval($('#messageDisplaySeconds')?.value, 0);
    const fromState = nval(window.state?.settings?.messageDisplaySeconds, 0);
    const fromLocal = nval(localStorage.getItem(LS_MSG_SECONDS), 0);
    const val = fromInput || fromState || fromLocal || 4;
    return Math.max(1, Math.min(60, Math.floor(val)));
  }
  function setMessageSeconds(value){
    const n = Math.max(1, Math.min(60, Math.floor(nval(value, 4))));
    window.state = window.state || {};
    state.settings = state.settings || {};
    state.settings.messageDisplaySeconds = n;
    try{ localStorage.setItem(LS_MSG_SECONDS, String(n)); }catch(_){}
    const input = $('#messageDisplaySeconds');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    return n;
  }

  function getAutoMinutes(){
    const fromInput = nval($('#autoLogoutMinutes')?.value, NaN);
    const fromState = nval(window.state?.settings?.autoLogoutMinutes, 0);
    const val = Number.isFinite(fromInput) ? fromInput : fromState;
    return Math.max(0, Math.floor(val || 0));
  }
  function setAutoMinutes(value, reset=true){
    const n = Math.max(0, Math.floor(nval(value, 0)));
    window.state = window.state || {};
    state.settings = state.settings || {};
    state.settings.autoLogoutMinutes = n;
    const input = $('#autoLogoutMinutes');
    if(input && String(input.value) !== String(n)) input.value = String(n);
    if(reset){ currentAutoMinutes = n; autoDeadline = n > 0 && loggedIn() ? nowMs() + n * 60000 : 0; persistDeadlines(); }
    return n;
  }

  function ensureMessageSettingControl(){
    const grid = $('#settingsSecurity .form-grid');
    if(grid && !$('#messageDisplaySeconds')){
      const label = document.createElement('label');
      label.className = 'kng4710-message-duration-label';
      label.innerHTML = 'Meldungsfenster anzeigen (Sekunden)<input id="messageDisplaySeconds" type="number" min="1" max="60" step="1">';
      grid.appendChild(label);
    }
    setMessageSeconds(getMessageSeconds());
    const input = $('#messageDisplaySeconds');
    if(input && input.dataset.kng4710Bound !== '1'){
      input.dataset.kng4710Bound = '1';
      input.addEventListener('input', ev=>{
        setMessageSeconds(ev.target.value);
        try{ window.markSettingsDirty?.(); }catch(_){}
      });
      input.addEventListener('change', ev=>setMessageSeconds(ev.target.value));
    }
  }

  function ensureToastArea(){
    const row = $('.greeting-row');
    if(!row) return null;
    let area = $('#toastArea');
    if(!area){ area = document.createElement('div'); area.id = 'toastArea'; }
    if(area.parentElement !== row) row.appendChild(area);
    area.className = 'toast-area kng4710-toast-area';
    area.style.position = 'static';
    area.style.display = 'inline-flex';
    area.style.flexDirection = 'row';
    return area;
  }
  function removeLegacyToastAreas(){
    $$('#toastContainer,.toast-container,.kng473-toast-container,#kngSessionToastArea,.kng-session-toast-area').forEach(el=>{ if(el.id !== 'toastArea') el.remove(); });
  }
  function showToast(message, type='info'){
    const area = ensureToastArea();
    if(!area) return;
    removeLegacyToastAreas();
    while(area.children.length >= 3) area.firstElementChild?.remove();
    const item = document.createElement('div');
    item.className = `toast kng4710-toast ${String(type || 'info')}`;
    item.textContent = String(message || '');
    const rec = {item, expires: nowMs() + getMessageSeconds() * 1000};
    liveToasts.push(rec);
    area.appendChild(item);
    item.addEventListener('click', ()=>expireToast(rec, true));
  }
  function expireToast(rec, immediate=false){
    if(!rec || !rec.item || !rec.item.isConnected) return;
    rec.expires = 0;
    rec.item.classList.add('is-hiding');
    if(immediate){ setTimeout(()=>rec.item?.remove(), 120); }
  }
  function cleanupToasts(){
    const t = nowMs();
    for(let i=liveToasts.length-1;i>=0;i--){
      const rec = liveToasts[i];
      if(!rec.item || !rec.item.isConnected){ liveToasts.splice(i,1); continue; }
      if(rec.expires && t >= rec.expires){
        rec.item.classList.add('is-hiding');
        setTimeout(()=>rec.item?.remove(), 150);
        liveToasts.splice(i,1);
      }
    }
  }
  function installToast(){ window.toast = showToast; window.showToast = showToast; }

  function ensureTimerElement(){
    const sessionMain = $('.session-main');
    if(!sessionMain) return null;
    let timer = $('#autoLogoutCountdown');
    const all = $$('#autoLogoutCountdown');
    all.slice(1).forEach(el=>el.remove());
    if(!timer){ timer = document.createElement('span'); timer.id = 'autoLogoutCountdown'; }
    if(timer.parentElement !== sessionMain) sessionMain.appendChild(timer);
    if(timer.dataset.kng4710Fresh !== '1'){
      const clone = timer.cloneNode(false);
      clone.id = 'autoLogoutCountdown';
      clone.dataset.kng4710Fresh = '1';
      clone.textContent = timer.textContent || 'Auto: aus';
      timer.replaceWith(clone);
      timer = clone;
    }
    timer.className = 'auto-logout-countdown kng4710-autoaus';
    timer.title = 'Auto-Aus-Timer manuell starten';
    if(timer.dataset.kng4710Click !== '1'){
      timer.dataset.kng4710Click = '1';
      timer.addEventListener('click', ev=>{
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        const current = manualDeadline > nowMs() ? Math.ceil((manualDeadline - nowMs())/60000) : '';
        const value = prompt('Auto-Aus-Timer in Minuten eingeben. 0 = manuellen Timer ausschalten.', current);
        if(value === null) return;
        const mins = Math.max(0, Math.floor(nval(value, 0)));
        if(mins <= 0){ manualDeadline = 0; persistDeadlines(); showToast('Manueller Auto-Aus-Timer ausgeschaltet.','info'); }
        else { manualDeadline = nowMs() + mins * 60000; persistDeadlines(); showToast('Manueller Auto-Aus-Timer gestartet.','success'); }
        paintTimer(true);
      }, true);
    }
    return timer;
  }

  function paintTimer(force=false){
    const el = ensureTimerElement();
    if(!el) return;
    if(!loggedIn()){
      manualDeadline = 0; autoDeadline = 0; persistDeadlines();
      setTimerText(el, 'Auto: aus', null, force);
      return;
    }
    const t = nowMs();
    manualDeadline = Number(sessionStorage.getItem(SS_MANUAL_DEADLINE) || manualDeadline || 0) || 0;
    autoDeadline = Number(sessionStorage.getItem(SS_AUTO_DEADLINE) || autoDeadline || 0) || 0;
    const mins = getAutoMinutes();
    if(currentAutoMinutes !== mins){
      currentAutoMinutes = mins;
      autoDeadline = mins > 0 ? t + mins * 60000 : 0;
      persistDeadlines();
    }
    if(manualDeadline > t){ setTimerText(el, 'Auto: ' + fmt(manualDeadline - t), manualDeadline - t, force); return; }
    if(manualDeadline > 0 && manualDeadline <= t){ manualDeadline = 0; persistDeadlines(); doTimedLogout(); return; }
    if(mins > 0){
      if(!autoDeadline || autoDeadline <= 0){ autoDeadline = t + mins * 60000; persistDeadlines(); }
      if(autoDeadline > t){ setTimerText(el, 'Auto: ' + fmt(autoDeadline - t), autoDeadline - t, force); return; }
      doTimedLogout(); return;
    }
    autoDeadline = 0; persistDeadlines();
    setTimerText(el, 'Auto: aus', null, force);
  }
  function setTimerText(el, text, msLeft, force=false){
    if(!force && text === lastTimerText) return;
    lastTimerText = text;
    el.textContent = text;
    el.classList.remove('kng4710-active','kng4710-warning','kng479-active','kng479-warning','kng478-active','kng478-warning','kng477-active','kng477-warning','kng934-timer-active','kng934-timer-warning','warning','danger');
    if(typeof msLeft === 'number') el.classList.add(msLeft <= 30000 ? 'kng4710-warning' : 'kng4710-active');
  }
  function doTimedLogout(){
    if(logoutRunning) return;
    logoutRunning = true;
    manualDeadline = 0; autoDeadline = 0; persistDeadlines();
    const el = ensureTimerElement(); if(el) setTimerText(el, 'Auto: 00:00', 0, true);
    showToast('Auto-Aus-Zeit erreicht.','warn');
    try{ if(typeof window.logout === 'function') window.logout(); }catch(err){ console.error('Auto-Aus Logout Fehler',err); }
    setTimeout(()=>{ logoutRunning = false; }, 300);
  }

  function updateClockAndGreeting(force=false){
    const d = new Date();
    const time = d.toLocaleTimeString('de-DE');
    if(force || time !== lastClockText){
      lastClockText = time;
      const clock = $('#clock'); if(clock) clock.textContent = time;
      const today = $('#todayLine'); if(today) today.textContent = 'Heute ist ' + d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
      const greeting = $('#greeting'); if(greeting) greeting.textContent = 'Guten Tag ' + sessionUser();
    }
  }

  function bindInputs(){
    const auto = $('#autoLogoutMinutes');
    if(auto && auto.dataset.kng4710Bound !== '1'){
      auto.dataset.kng4710Bound = '1';
      auto.addEventListener('input', ev=>{ setAutoMinutes(ev.target.value, true); try{ window.markSettingsDirty?.(); }catch(_){}; paintTimer(true); });
      auto.addEventListener('change', ev=>{ setAutoMinutes(ev.target.value, true); paintTimer(true); });
    }
  }

  function wrapSaveAndSession(){
    if(!window.__kng4710SaveWrapped && typeof window.saveSettings === 'function'){
      const oldSave = window.saveSettings;
      window.saveSettings = function(){
        setMessageSeconds($('#messageDisplaySeconds')?.value || getMessageSeconds());
        setAutoMinutes($('#autoLogoutMinutes')?.value || getAutoMinutes(), true);
        const r = oldSave.apply(this, arguments);
        setMessageSeconds($('#messageDisplaySeconds')?.value || getMessageSeconds());
        setAutoMinutes($('#autoLogoutMinutes')?.value || getAutoMinutes(), true);
        paintTimer(true);
        return r;
      };
      window.__kng4710SaveWrapped = true;
    }
    if(!window.__kng4710LoginWrapped && typeof window.applySession === 'function'){
      const oldApply = window.applySession;
      window.applySession = function(){
        const r = oldApply.apply(this, arguments);
        setTimeout(()=>{
          ensureToastArea(); ensureTimerElement(); updateClockAndGreeting(true);
          currentAutoMinutes = null; paintTimer(true);
        },0);
        return r;
      };
      window.__kng4710LoginWrapped = true;
    }
    window.updateClock = function(){ updateClockAndGreeting(true); paintTimer(true); };
    window.updateAutoLogoutDisplay = function(){ paintTimer(true); };
    window.resetAutoLogoutTimer = function(){ const mins=getAutoMinutes(); currentAutoMinutes=null; if(mins>0){ autoDeadline=nowMs()+mins*60000; persistDeadlines(); } paintTimer(true); };
  }

  function injectCss(){
    if($('#kng4710-style')) return;
    const style = document.createElement('style');
    style.id = 'kng4710-style';
    style.textContent = `
      .greeting-row{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}
      #toastArea.kng4710-toast-area{position:static!important;display:inline-flex!important;flex-direction:row!important;gap:6px!important;align-items:center!important;max-width:780px!important;z-index:auto!important;pointer-events:auto!important;}
      .kng4710-toast{display:inline-flex!important;align-items:center!important;min-height:24px!important;padding:4px 10px!important;border-radius:999px!important;font-size:12px!important;font-weight:800!important;line-height:1.15!important;white-space:nowrap!important;border:1px solid #c9ddfb!important;background:#e7f0ff!important;color:#1e4676!important;box-shadow:0 2px 8px rgba(0,0,0,.12)!important;transition:opacity .15s ease, transform .15s ease!important;}
      .kng4710-toast.success{background:#166534!important;color:#fff!important;border-color:#166534!important;}.kng4710-toast.warn{background:#92400e!important;color:#fff!important;border-color:#92400e!important;}.kng4710-toast.error{background:#991b1b!important;color:#fff!important;border-color:#991b1b!important;}.kng4710-toast.is-hiding{opacity:0!important;transform:translateY(-3px)!important;}
      .session-main{display:flex!important;align-items:flex-start!important;gap:8px!important;flex-wrap:wrap!important;}
      #autoLogoutCountdown.kng4710-autoaus{display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;min-width:96px!important;border-radius:999px!important;padding:4px 9px!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important;user-select:none!important;background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.22)!important;}
      #autoLogoutCountdown.kng4710-active{background:#c96f00!important;color:#fff8e8!important;border-color:#9a5400!important;}#autoLogoutCountdown.kng4710-warning{background:#b00020!important;color:#fff!important;border-color:#7f0017!important;}
      .topbar #autoLogoutCountdown{display:none!important;}.kng4710-message-duration-label input{max-width:120px!important;}
    `;
    document.head.appendChild(style);
  }

  function tick(){
    installToast();
    removeLegacyToastAreas();
    ensureToastArea();
    ensureMessageSettingControl();
    bindInputs();
    updateClockAndGreeting(false);
    paintTimer(false);
    cleanupToasts();
  }
  function loop(){
    tick();
    requestAnimationFrame(loop);
  }
  function startLoop(){
    if(frameRunning) return;
    frameRunning = true;
    requestAnimationFrame(loop);
    // Fallback, falls requestAnimationFrame wegen Browserzustand kurz aussetzt.
    setInterval(tick, 500);
  }
  function init(){
    injectCss(); installToast(); ensureToastArea(); ensureMessageSettingControl(); ensureTimerElement(); bindInputs(); wrapSaveAndSession(); updateClockAndGreeting(true); paintTimer(true); startLoop();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  setTimeout(init, 250);
  setTimeout(init, 1000);
})();
