/* KNG 49.8 – Systemcheck Autostart Final
   Zweck: Der Schalter "Systemcheck beim Start" wird unabhängig von der aktuellen Ansicht zuverlässig berücksichtigt.
   - speichert den Schalter redundant in state.settings und localStorage
   - prüft beim Laden der Seite UND nach erfolgreichem Login
   - führt den Start-Systemcheck genau einmal pro Seitenladung aus
   - protokolliert über den bestehenden 49.7-Systemcheck-Kern
   WICHTIG: Timer/Uhr/Meldungskern wird nicht verändert.
*/
(function(){
  'use strict';
  if(window.__KNG498_SYSTEMCHECK_AUTOSTART_FINAL__) return;
  window.__KNG498_SYSTEMCHECK_AUTOSTART_FINAL__ = true;

  const START_KEY = 'kng49_systemcheck_on_start';
  const LAST_KEY = 'kng49_systemcheck_autostart_last';
  const $ = (s, r=document) => r.querySelector(s);

  function state(){ window.state = window.state || {}; window.state.settings = window.state.settings || {}; return window.state; }
  function saveStateSafe(){ try{ if(typeof window.saveState === 'function') window.saveState(); }catch(_){ } }
  function toast(msg,type){ try{ window.toast?.(msg,type||'info'); }catch(_){ } }

  function checkboxValue(){
    const cb = $('#systemCheckOnStart');
    return cb ? !!cb.checked : null;
  }

  function readEnabled(){
    const stVal = state().settings.systemCheckOnStart;
    const lsVal = localStorage.getItem(START_KEY);
    const cbVal = checkboxValue();
    if(cbVal === true || stVal === true || lsVal === '1' || lsVal === 'true' || lsVal === true) return true;
    return false;
  }

  function writeEnabled(value, silent){
    const val = !!value;
    state().settings.systemCheckOnStart = val;
    try{ localStorage.setItem(START_KEY, val ? '1' : '0'); }catch(_){ }
    const cb = $('#systemCheckOnStart');
    if(cb) cb.checked = val;
    saveStateSafe();
    if(!silent) toast(val ? 'Systemcheck beim Start aktiviert.' : 'Systemcheck beim Start deaktiviert.', 'success');
    return val;
  }

  function syncFromStorageToUi(){
    const enabled = readEnabled();
    writeEnabled(enabled, true);
    return enabled;
  }

  function bindSwitch(){
    const cb = $('#systemCheckOnStart');
    if(!cb) return;
    cb.checked = readEnabled();
    if(cb.dataset.kng498Bound === '1') return;
    cb.dataset.kng498Bound = '1';
    ['change','input','click'].forEach(evt => {
      cb.addEventListener(evt, () => setTimeout(() => writeEnabled(!!cb.checked, evt !== 'change'), 0), true);
    });
  }

  function canRunSystemCheck(){ return typeof window.runSystemCheck === 'function'; }

  function runAutostart(reason){
    if(window.__KNG498_AUTOSTART_RUNNING__ || window.__KNG498_AUTOSTART_DONE__) return;
    syncFromStorageToUi();
    if(!readEnabled()) return;
    if(!canRunSystemCheck()){
      setTimeout(() => runAutostart(reason + ':retry'), 600);
      return;
    }
    window.__KNG498_AUTOSTART_RUNNING__ = true;
    window.__KNG498_AUTOSTART_DONE__ = true;
    try{ localStorage.setItem(LAST_KEY, new Date().toISOString() + ' · ' + reason); }catch(_){ }
    toast('Systemcheck beim Start wird ausgeführt…', 'info');
    Promise.resolve(window.runSystemCheck(true, 'auto-start'))
      .catch(err => toast('Automatischer Systemcheck konnte nicht ausgeführt werden: ' + (err?.message || err), 'error'))
      .finally(() => { window.__KNG498_AUTOSTART_RUNNING__ = false; });
  }

  function scheduleAutostart(reason, delay){
    setTimeout(() => {
      bindSwitch();
      syncFromStorageToUi();
      runAutostart(reason);
    }, delay || 1200);
  }

  function patchLogin(){
    if(window.__KNG498_LOGIN_PATCHED__) return;
    if(typeof window.doLogin !== 'function') return;
    const old = window.doLogin;
    window.doLogin = function(){
      const before = !!state().session?.isLoggedIn;
      const result = old.apply(this, arguments);
      setTimeout(() => {
        const after = !!state().session?.isLoggedIn;
        if(!before && after && readEnabled()) scheduleAutostart('after-login', 800);
      }, 250);
      return result;
    };
    window.__KNG498_LOGIN_PATCHED__ = true;
  }

  function boot(){
    bindSwitch();
    syncFromStorageToUi();
    patchLogin();
    // Startprüfung mehrfach defensiv anstoßen; der erste erfolgreiche Lauf setzt DONE und verhindert Duplikate.
    scheduleAutostart('dom-ready', 1800);
    scheduleAutostart('dom-ready-late', 4200);
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', () => { bindSwitch(); patchLogin(); scheduleAutostart('window-load', 1500); });
  document.addEventListener('click', () => { setTimeout(() => { bindSwitch(); patchLogin(); }, 60); }, true);
  document.addEventListener('change', ev => {
    if(ev.target && ev.target.id === 'systemCheckOnStart') writeEnabled(!!ev.target.checked, false);
  }, true);

  window.KNG_SYSTEMCHECK_AUTOSTART_ENABLED = readEnabled;
  window.KNG_SYSTEMCHECK_AUTOSTART_SYNC = syncFromStorageToUi;
})();
