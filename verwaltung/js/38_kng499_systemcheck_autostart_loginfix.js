/* KNG 49.9 – Systemcheck Autostart Loginfix
   Zweck: Der Schalter "Systemcheck beim Start" wird zuverlässig berücksichtigt.
   Wichtig: Timer/Uhr/Meldungen werden NICHT verändert.
   Strategie:
   - alte konkurrierende Autostart-Auslöser werden deaktiviert
   - Schalter wird aus state.settings UND localStorage gelesen
   - automatischer Check startet genau einmal nach erfolgreicher Anmeldung
   - wenn eine Sitzung bereits gespeichert ist, startet er kurz nach Programmstart
*/
(function(){
  'use strict';
  if(window.__KNG499_SYSTEMCHECK_AUTOSTART_LOGINFIX__) return;
  window.__KNG499_SYSTEMCHECK_AUTOSTART_LOGINFIX__ = true;

  const START_KEY = 'kng49_systemcheck_on_start';
  const MARK_KEY = 'kng49_systemcheck_autostart_499_last';
  const $ = (s, r=document) => r.querySelector(s);

  // Ältere Autostart-Versuche verhindern. Manuelle Systemchecks bleiben unverändert möglich.
  window.__KNG496_AUTO_SYSTEMCHECK_DONE__ = true;
  window.__KNG497_AUTOSTART_DONE__ = true;
  window.__KNG498_AUTOSTART_DONE__ = true;

  function st(){ window.state = window.state || {}; window.state.settings = window.state.settings || {}; return window.state; }
  function save(){ try{ if(typeof window.saveState === 'function') window.saveState(); }catch(_){ } }
  function toast(msg,type){ try{ window.toast?.(msg,type||'info'); }catch(_){ } }
  function loggedIn(){ return !!st().session?.isLoggedIn; }

  function readEnabled(){
    const s = st();
    const vState = s.settings.systemCheckOnStart;
    let vLocal = null;
    try{ vLocal = localStorage.getItem(START_KEY); }catch(_){ }
    const cb = $('#systemCheckOnStart');
    if(cb && cb.checked) return true;
    return vState === true || vState === 'true' || vState === 1 || vState === '1' || vLocal === '1' || vLocal === 'true';
  }

  function writeEnabled(val){
    const value = !!val;
    st().settings.systemCheckOnStart = value;
    try{ localStorage.setItem(START_KEY, value ? '1' : '0'); }catch(_){ }
    const cb = $('#systemCheckOnStart');
    if(cb) cb.checked = value;
    save();
    return value;
  }

  function bindSwitch(){
    const cb = $('#systemCheckOnStart');
    if(!cb) return;
    cb.checked = readEnabled();
    if(cb.dataset.kng499Bound === '1') return;
    cb.dataset.kng499Bound = '1';
    cb.addEventListener('change', function(){
      writeEnabled(!!cb.checked);
      toast(cb.checked ? 'Systemcheck beim Start aktiviert.' : 'Systemcheck beim Start deaktiviert.', 'info');
    }, true);
  }

  async function runStartCheck(reason){
    if(window.__KNG499_AUTOSTART_DONE__ || window.__KNG499_AUTOSTART_RUNNING__) return;
    bindSwitch();
    if(!readEnabled()) return;
    if(!loggedIn()) return;
    if(typeof window.runSystemCheck !== 'function') return;

    window.__KNG499_AUTOSTART_RUNNING__ = true;
    window.__KNG499_AUTOSTART_DONE__ = true;
    const user = st().session?.userName || 'Benutzer';
    try{ localStorage.setItem(MARK_KEY, new Date().toISOString() + ' · ' + reason + ' · ' + user); }catch(_){ }
    toast('Systemcheck beim Start wird ausgeführt…', 'info');
    try{
      await Promise.resolve(window.runSystemCheck(true, 'auto-start'));
      toast('Automatischer Systemcheck abgeschlossen.', 'success');
    }catch(err){
      window.__KNG499_AUTOSTART_DONE__ = false; // erneuter Versuch bleibt möglich
      toast('Automatischer Systemcheck konnte nicht ausgeführt werden: ' + (err?.message || err), 'error');
    }finally{
      window.__KNG499_AUTOSTART_RUNNING__ = false;
    }
  }

  function schedule(reason, delay){
    setTimeout(function(){
      bindSwitch();
      writeEnabled(readEnabled());
      runStartCheck(reason);
    }, delay || 1000);
  }

  function patchLogin(){
    if(window.__KNG499_LOGIN_PATCHED__) return;
    if(typeof window.doLogin !== 'function') return;
    const old = window.doLogin;
    window.doLogin = function(){
      const result = old.apply(this, arguments);
      setTimeout(function(){
        if(readEnabled() && loggedIn()) schedule('after-login', 350);
      }, 350);
      return result;
    };
    window.__KNG499_LOGIN_PATCHED__ = true;
  }

  function startPolling(){
    const start = Date.now();
    const id = setInterval(function(){
      bindSwitch();
      patchLogin();
      if(readEnabled() && loggedIn()){
        clearInterval(id);
        schedule('login-detected', 250);
      }
      if(Date.now() - start > 120000) clearInterval(id);
    }, 500);
  }

  function boot(){
    bindSwitch();
    writeEnabled(readEnabled());
    patchLogin();
    // Falls eine angemeldete Sitzung gespeichert wurde, direkt nach Programmstart starten.
    schedule('program-start', 1400);
    schedule('program-start-late', 3500);
    // Falls erst danach angemeldet wird.
    startPolling();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  window.addEventListener('load', function(){ bindSwitch(); patchLogin(); schedule('window-load', 1000); });
  document.addEventListener('click', function(){ setTimeout(function(){ bindSwitch(); patchLogin(); }, 80); }, true);
  document.addEventListener('change', function(ev){ if(ev.target && ev.target.id === 'systemCheckOnStart') writeEnabled(!!ev.target.checked); }, true);

  window.KNG_SYSTEMCHECK_AUTOSTART_ENABLED = readEnabled;
  window.KNG_SYSTEMCHECK_AUTOSTART_RUN_NOW = function(){ window.__KNG499_AUTOSTART_DONE__ = false; return runStartCheck('manual-autostart-test'); };
})();
