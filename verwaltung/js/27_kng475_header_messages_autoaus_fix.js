/* Version 47.5 – Kopfzeilenmeldungen und Auto-Aus endgültig stabilisiert
   - Systemmeldungen erscheinen direkt neben "Guten Tag ..." im Begrüßungsbereich
   - Meldungen verschwinden automatisch nach wenigen Sekunden
   - Auto-Aus wird oben bei der Uhr angezeigt, zählt sichtbar herunter und startet manuell per Klick
   - Automatischer Auto-Logout zählt ebenfalls herunter und ruft die vorhandene Sicherheitsabfrage auf
*/
(function(){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  const STORE_MANUAL = 'kng475_manual_autoaus_deadline';
  const STORE_AUTO = 'kng475_auto_logout_deadline';
  let manualDeadline = Number(sessionStorage.getItem(STORE_MANUAL)||0)||0;
  let autoDeadline = Number(sessionStorage.getItem(STORE_AUTO)||0)||0;
  let loop = null;
  let lastLoggedIn = null;
  let lastActivity = 0;
  let suppressResetUntil = 0;

  function loggedIn(){ return !!window.state?.session?.isLoggedIn; }
  function getAutoMinutes(){
    const v = Math.floor(Number(window.state?.settings?.autoLogoutMinutes || 0) || 0);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  function two(n){ return String(n).padStart(2,'0'); }
  function fmt(ms){
    const sec = Math.max(0, Math.ceil(ms/1000));
    const h = Math.floor(sec/3600);
    const m = Math.floor((sec%3600)/60);
    const s = sec%60;
    return h>0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
  }
  function save(){
    if(manualDeadline>0) sessionStorage.setItem(STORE_MANUAL,String(manualDeadline)); else sessionStorage.removeItem(STORE_MANUAL);
    if(autoDeadline>0) sessionStorage.setItem(STORE_AUTO,String(autoDeadline)); else sessionStorage.removeItem(STORE_AUTO);
  }

  function ensureToastPosition(){
    const row = $('.greeting-row');
    const greeting = $('#greeting');
    let area = $('#toastArea');
    if(!row || !greeting) return area;
    if(!area){
      area = document.createElement('div');
      area.id = 'toastArea';
    }
    area.className = 'toast-area kng475-header-toast-area';
    if(area.parentElement !== row) row.appendChild(area);
    return area;
  }
  function clearForeignToasts(){
    document.querySelectorAll('#toastContainer,.toast-container,.kng473-toast-container,#kngSessionToastArea').forEach(el=>el.remove());
  }
  function headerToast(message,type='info'){
    const level = (typeof window.getSessionMessageLevel === 'function') ? window.getSessionMessageLevel() : 3;
    if(loggedIn()){
      if(level===1 && type!=='error') return;
      if(level===2 && !['error','warn'].includes(type)) return;
    }
    clearForeignToasts();
    const area = ensureToastPosition();
    if(!area) return;
    while(area.children.length >= 3) area.firstElementChild?.remove();
    const el = document.createElement('div');
    el.className = `toast kng475-header-toast ${String(type||'info')}`;
    el.textContent = String(message||'');
    area.appendChild(el);
    const remove = ()=>{ el.classList.add('is-hiding'); setTimeout(()=>el.remove(),260); };
    const ms = type==='error' ? 6200 : type==='warn' ? 5000 : 3400;
    const t = setTimeout(remove, ms);
    el.addEventListener('click',()=>{ clearTimeout(t); remove(); });
  }

  function installToastOverride(){
    ensureToastPosition();
    clearForeignToasts();
    window.toast = headerToast;
  }

  function ensureTimerInTopbar(){
    let el = $('#autoLogoutCountdown');
    const topActions = $('.top-actions');
    const clock = $('#clock');
    if(!el || !topActions) return null;
    if(el.parentElement !== topActions){
      topActions.insertBefore(el, clock ? clock.nextSibling : topActions.firstChild);
    }
    el.title = 'Auto-Aus / Auto-Logout manuell starten';
    el.classList.add('kng475-autoaus-display');
    el.style.display = 'inline-flex';
    el.style.visibility = 'visible';
    return el;
  }
  function setTimer(text, msLeft=null){
    const el = ensureTimerInTopbar(); if(!el) return;
    el.textContent = text;
    el.classList.remove('kng475-active','kng475-warning');
    if(msLeft !== null){
      el.classList.add(msLeft <= 30000 ? 'kng475-warning' : 'kng475-active');
    }
  }
  function startAuto(reset){
    if(!loggedIn()){ autoDeadline = 0; save(); return; }
    const minutes = getAutoMinutes();
    if(minutes <= 0){ autoDeadline = 0; save(); return; }
    if(reset || !autoDeadline || autoDeadline <= Date.now()){
      autoDeadline = Date.now() + minutes*60000;
      save();
    }
  }
  function callLogout(kind){
    manualDeadline = 0; autoDeadline = 0; save();
    setTimer('Auto: 00:00',0);
    headerToast(kind==='manual' ? 'Auto-Aus-Zeit erreicht.' : 'Automatische Abmeldezeit erreicht.','warn');
    setTimeout(()=>{
      let ok = true;
      try{
        if(typeof window.logout === 'function') ok = window.logout();
        else if(typeof window.showGuestHome === 'function') { window.showGuestHome(); ok = true; }
      }catch(e){ ok = false; }
      if(ok === false){
        suppressResetUntil = Date.now()+1500;
        startAuto(true);
        paint();
      }
    },120);
  }
  function paint(){
    installToastOverride();
    const was = lastLoggedIn;
    const nowLogged = loggedIn();
    if(was !== nowLogged){
      lastLoggedIn = nowLogged;
      manualDeadline = 0;
      autoDeadline = 0;
      save();
      if(nowLogged) startAuto(true);
    }
    if(!nowLogged){ setTimer('Auto: aus'); return; }
    manualDeadline = Number(sessionStorage.getItem(STORE_MANUAL)||manualDeadline||0)||0;
    autoDeadline = Number(sessionStorage.getItem(STORE_AUTO)||autoDeadline||0)||0;
    const now = Date.now();
    if(manualDeadline > now){
      setTimer('Auto: '+fmt(manualDeadline-now), manualDeadline-now);
      return;
    }
    if(manualDeadline > 0 && manualDeadline <= now){ callLogout('manual'); return; }
    startAuto(false);
    if(autoDeadline > now){
      setTimer('Auto: '+fmt(autoDeadline-now), autoDeadline-now);
      return;
    }
    if(autoDeadline > 0 && autoDeadline <= now){ callLogout('auto'); return; }
    setTimer('Auto: aus');
  }
  function bindTimerClick(){
    const el = ensureTimerInTopbar(); if(!el || el.dataset.kng475Bound==='1') return;
    el.dataset.kng475Bound = '1';
    el.addEventListener('click',(ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      const current = manualDeadline>Date.now() ? Math.ceil((manualDeadline-Date.now())/60000) : '';
      const input = prompt('Auto-Aus-Timer in Minuten eingeben. 0 = manuellen Timer ausschalten.', current);
      if(input === null) return;
      const min = Math.max(0, Math.floor(Number(String(input).replace(',','.'))||0));
      if(min <= 0){
        manualDeadline = 0; save(); headerToast('Manueller Auto-Aus-Timer ausgeschaltet.','info'); paint(); return;
      }
      manualDeadline = Date.now() + min*60000;
      save();
      headerToast('Manueller Auto-Aus-Timer gestartet.','success');
      paint();
    }, true);
  }
  function bindActivity(){
    if(document.documentElement.dataset.kng475ActivityBound==='1') return;
    document.documentElement.dataset.kng475ActivityBound='1';
    ['click','keydown','touchstart','mousemove','scroll'].forEach(evt=>{
      window.addEventListener(evt,()=>{
        if(Date.now() < suppressResetUntil) return;
        if(manualDeadline > Date.now()) return;
        const now = Date.now();
        if(now-lastActivity < 1200) return;
        lastActivity = now;
        if(loggedIn() && getAutoMinutes()>0){ startAuto(true); paint(); }
      }, {passive:true});
    });
  }
  function wrapExisting(){
    if(!window.__kng475ApplySessionWrapped && typeof window.applySession === 'function'){
      const old = window.applySession;
      window.applySession = function(){
        const r = old.apply(this,arguments);
        setTimeout(()=>{ installToastOverride(); bindTimerClick(); startAuto(true); paint(); },60);
        return r;
      };
      window.__kng475ApplySessionWrapped = true;
    }
    if(!window.__kng475SaveSettingsWrapped && typeof window.saveSettings === 'function'){
      const old = window.saveSettings;
      window.saveSettings = function(){
        const input = $('#autoLogoutMinutes');
        if(input && window.state?.settings){
          window.state.settings.autoLogoutMinutes = Math.max(0, Math.floor(Number(input.value||0)||0));
        }
        const r = old.apply(this,arguments);
        autoDeadline = 0;
        startAuto(true);
        paint();
        return r;
      };
      window.__kng475SaveSettingsWrapped = true;
    }
    window.resetAutoLogoutTimer = function(){ startAuto(true); paint(); };
    window.updateAutoLogoutDisplay = paint;
  }
  function init(){
    installToastOverride();
    ensureTimerInTopbar();
    bindTimerClick();
    bindActivity();
    wrapExisting();
    if(!loop){ loop = setInterval(paint,500); }
    paint();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,500);
  setTimeout(init,1500);
})();
