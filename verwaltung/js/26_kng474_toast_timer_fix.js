/* Test 47.4 – Kopfzeilen-Meldungen und Auto-Aus/Auto-Logout stabilisiert
   - Meldungen wieder neben dem angemeldeten Benutzer in der Kopfzeile/Session-Box
   - Meldungen verschwinden zuverlässig automatisch
   - manueller Auto-Timer zeigt Sekunden und zählt sichtbar herunter
   - automatischer Auto-Logout zählt herunter und ruft beim Ablauf die vorhandene Logout-Sicherheitsabfrage auf
*/
(function(){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  const LS_AUTO = 'kng474AutoLogoutDeadline';
  const LS_MANUAL = 'kng474ManualLogoutDeadline';
  let autoDeadline = Number(sessionStorage.getItem(LS_AUTO)||0)||0;
  let manualDeadline = Number(sessionStorage.getItem(LS_MANUAL)||sessionStorage.getItem('kngManualAutoLogoutDeadlineFinal934')||sessionStorage.getItem('kngManualAutoLogoutDeadline')||0)||0;
  let timerLoop = null;
  let lastActivity = 0;
  let suppressActivityUntil = 0;

  function isLoggedIn(){ return !!window.state?.session?.isLoggedIn; }
  function getAutoMinutes(){
    const n = Number(window.state?.settings?.autoLogoutMinutes || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  function fmt(ms){
    const s = Math.max(0, Math.ceil(ms/1000));
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), r = s%60;
    if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  }
  function saveDeadlines(){
    if(autoDeadline>0) sessionStorage.setItem(LS_AUTO,String(autoDeadline)); else sessionStorage.removeItem(LS_AUTO);
    if(manualDeadline>0){
      sessionStorage.setItem(LS_MANUAL,String(manualDeadline));
      sessionStorage.setItem('kngManualAutoLogoutDeadlineFinal934',String(manualDeadline));
      sessionStorage.setItem('kngManualAutoLogoutDeadline',String(manualDeadline));
    }else{
      sessionStorage.removeItem(LS_MANUAL);
      sessionStorage.removeItem('kngManualAutoLogoutDeadlineFinal934');
      sessionStorage.removeItem('kngManualAutoLogoutDeadline');
    }
  }
  function ensureToastArea(){
    const sessionMain = $('.session-main');
    if(!sessionMain) return $('#toastArea');
    let area = $('#kngSessionToastArea');
    if(!area){
      area = document.createElement('div');
      area.id = 'kngSessionToastArea';
      area.className = 'kng-session-toast-area';
      const timer = $('#autoLogoutCountdown');
      sessionMain.insertBefore(area, timer || null);
    }
    return area;
  }
  function toastHeader(message,type='info'){
    const level = (typeof window.getSessionMessageLevel==='function') ? window.getSessionMessageLevel() : 3;
    if(isLoggedIn()){
      if(level===1 && type!=='error') return;
      if(level===2 && !['error','warn'].includes(type)) return;
    }
    const area = ensureToastArea();
    if(!area) return;
    while(area.children.length >= 3) area.firstElementChild?.remove();
    const el = document.createElement('div');
    el.className = `kng-head-toast ${String(type||'info')}`;
    el.textContent = String(message||'');
    area.appendChild(el);
    const remove = ()=>{ el.classList.add('is-hiding'); setTimeout(()=>el.remove(),220); };
    const ms = type==='error' ? 6500 : type==='warn' ? 5200 : 3600;
    const id = setTimeout(remove, ms);
    el.addEventListener('click',()=>{ clearTimeout(id); remove(); });
  }
  function overrideToast(){
    window.toast = toastHeader;
    const oldArea = $('#toastArea');
    if(oldArea) oldArea.innerHTML = '';
    document.querySelectorAll('#toastContainer,.toast-container.kng473-toast-container').forEach(e=>e.remove());
    ensureToastArea();
  }
  function replaceTimerElement(){
    const el = $('#autoLogoutCountdown');
    if(!el || el.dataset.kng474Clean === '1') return $('#autoLogoutCountdown');
    const clone = el.cloneNode(true);
    clone.dataset.kng474Clean = '1';
    clone.className = el.className;
    clone.id = 'autoLogoutCountdown';
    clone.title = 'Auto-Aus / Auto-Logout manuell starten';
    el.parentNode.replaceChild(clone, el);
    return clone;
  }
  function setTimerText(text, msLeft){
    const el = $('#autoLogoutCountdown'); if(!el) return;
    el.textContent = text;
    el.style.display = 'inline-flex';
    el.style.visibility = 'visible';
    el.classList.remove('kng934-timer-active','kng934-timer-warning','warning','danger','kng474-active','kng474-warning');
    if(msLeft !== undefined && msLeft !== null){
      if(msLeft <= 30000) el.classList.add('kng934-timer-warning','kng474-warning');
      else el.classList.add('kng934-timer-active','kng474-active');
    }
  }
  function startAutomaticDeadline(forceReset=false){
    if(!isLoggedIn()){ autoDeadline = 0; saveDeadlines(); return; }
    const min = getAutoMinutes();
    if(min <= 0){ autoDeadline = 0; saveDeadlines(); return; }
    if(forceReset || !autoDeadline || autoDeadline <= Date.now()){
      autoDeadline = Date.now() + min * 60000;
      saveDeadlines();
    }
  }
  function performLogoutByTimer(kind){
    manualDeadline = 0;
    autoDeadline = 0;
    saveDeadlines();
    setTimerText('Auto: 00:00',0);
    try{ toastHeader(kind==='manual'?'Manueller Auto-Timer abgelaufen.':'Auto-Logout abgelaufen.','warn'); }catch(_){ }
    setTimeout(()=>{
      let ok = true;
      try{
        if(typeof window.logout === 'function') ok = window.logout();
        else if(typeof window.showGuestHome === 'function') window.showGuestHome();
      }catch(_e){ ok = false; }
      if(ok === false){
        // Benutzer hat Sicherheitsabfrage abgebrochen: Timer neu starten, damit Anzeige nicht stehenbleibt.
        suppressActivityUntil = Date.now() + 1500;
        startAutomaticDeadline(true);
      }
    },80);
  }
  function paintTimer(){
    // alte Timer-Skripte können das Element überschreiben; diese Routine setzt die Anzeige zuverlässig zurück.
    if(!isLoggedIn()){
      manualDeadline = 0; autoDeadline = 0; saveDeadlines(); setTimerText('Auto: aus'); return;
    }
    manualDeadline = Number(sessionStorage.getItem(LS_MANUAL)||sessionStorage.getItem('kngManualAutoLogoutDeadlineFinal934')||manualDeadline||0)||0;
    const now = Date.now();
    if(manualDeadline && manualDeadline > 0){
      const left = manualDeadline - now;
      if(left <= 0){ performLogoutByTimer('manual'); return; }
      setTimerText('Auto: '+fmt(left), left);
      return;
    }
    startAutomaticDeadline(false);
    if(autoDeadline && autoDeadline > 0){
      const left = autoDeadline - now;
      if(left <= 0){ performLogoutByTimer('auto'); return; }
      setTimerText('Auto: '+fmt(left), left);
      return;
    }
    setTimerText('Auto: aus');
  }
  function bindTimerClick(){
    const el = replaceTimerElement(); if(!el || el.dataset.kng474Bound==='1') return;
    el.dataset.kng474Bound = '1';
    el.addEventListener('click', ev=>{
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      const cur = manualDeadline > Date.now() ? Math.ceil((manualDeadline-Date.now())/60000) : '';
      const v = prompt('Auto-Aus-Timer in Minuten eingeben. 0 = manuellen Timer ausschalten.', cur);
      if(v === null) return;
      const n = Math.max(0, Math.floor(Number(String(v).replace(',','.')) || 0));
      if(n <= 0){
        manualDeadline = 0; saveDeadlines(); toastHeader('Manueller Auto-Timer ausgeschaltet.','info'); paintTimer(); return;
      }
      manualDeadline = Date.now() + n * 60000;
      saveDeadlines();
      toastHeader('Manueller Auto-Timer gestartet.','success');
      paintTimer();
    }, true);
  }
  function bindActivity(){
    if(document.documentElement.dataset.kng474ActivityBound === '1') return;
    document.documentElement.dataset.kng474ActivityBound = '1';
    ['click','keydown','touchstart','scroll'].forEach(evt=>{
      window.addEventListener(evt, ()=>{
        if(Date.now() < suppressActivityUntil) return;
        if(manualDeadline && manualDeadline > Date.now()) return; // manueller Timer läuft unabhängig weiter
        const now = Date.now();
        if(now-lastActivity < 1200) return;
        lastActivity = now;
        if(isLoggedIn() && getAutoMinutes()>0){ startAutomaticDeadline(true); paintTimer(); }
      }, {passive:true});
    });
  }
  function wrapSessionAndSettings(){
    if(!window.__kng474ApplyWrapped && typeof window.applySession === 'function'){
      const old = window.applySession;
      window.applySession = function(){
        const r = old.apply(this, arguments);
        setTimeout(()=>{ overrideToast(); bindTimerClick(); startAutomaticDeadline(true); paintTimer(); },50);
        return r;
      };
      window.__kng474ApplyWrapped = true;
    }
    if(!window.__kng474SaveSettingsWrapped && typeof window.saveSettings === 'function'){
      const old = window.saveSettings;
      window.saveSettings = function(){
        const input = $('#autoLogoutMinutes');
        if(input && window.state?.settings) state.settings.autoLogoutMinutes = Math.max(0, Math.floor(Number(input.value||0)||0));
        const r = old.apply(this, arguments);
        autoDeadline = 0; startAutomaticDeadline(true); paintTimer();
        return r;
      };
      window.__kng474SaveSettingsWrapped = true;
    }
    window.resetAutoLogoutTimer = function(){ startAutomaticDeadline(true); paintTimer(); };
    window.updateAutoLogoutDisplay = paintTimer;
  }
  function init(){
    overrideToast();
    bindTimerClick();
    bindActivity();
    wrapSessionAndSettings();
    startAutomaticDeadline(false);
    paintTimer();
    if(timerLoop) clearInterval(timerLoop);
    timerLoop = setInterval(paintTimer, 250);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(init,500);
  setTimeout(init,1500);
})();
