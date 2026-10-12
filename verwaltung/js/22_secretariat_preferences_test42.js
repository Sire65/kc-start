
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  function st(){ return window.__kngStateRef || window.state || {}; }
  function save(){ try{ if(typeof window.saveState==='function') window.saveState(); }catch(_e){} }
  function ensureDefaults(){ const s=st(); s.settings=s.settings||{}; if(!s.settings.secretariatTheme) s.settings.secretariatTheme='classic'; if(s.settings.secretariatRememberLast===undefined) s.settings.secretariatRememberLast=true; if(s.settings.secretariatLightsOut===undefined) s.settings.secretariatLightsOut=true; if(s.settings.secretariatClock===undefined) s.settings.secretariatClock=true; }
  function applyTheme(){ ensureDefaults(); const office=$('.secretary-office'); if(!office) return; const theme=st().settings.secretariatTheme||'classic'; office.classList.toggle('secretary-theme-modern',theme==='modern'); office.classList.toggle('secretary-theme-classic',theme==='classic'); office.classList.toggle('secretary-theme-kuechenchef',theme==='kuechenchef'); }
  function addSettings(){
    const tabs=$('.settings-tabs'); const settings=$('#settings .panel') || $('#settings'); if(!tabs||!settings||$('#settingsSecretariatPrefs')) return;
    const btn=document.createElement('button'); btn.className='tab'; btn.dataset.settingsTab='settingsSecretariatPrefs'; btn.textContent='Voreinstellungen'; tabs.appendChild(btn);
    const panel=document.createElement('div'); panel.id='settingsSecretariatPrefs'; panel.className='settings-tab';
    panel.innerHTML='<h3>Sekretariat beim Programmstart</h3><p class="muted">Hier legt der Benutzer fest, welche Bürovariante beim Start verwendet wird.</p><div class="settings-secretariat-choices"><div class="settings-secretariat-choice"><img src="assets/secretariat-office-classic.png" alt="Klassisches Büro"><label><input type="radio" name="secretariatTheme42" value="classic"> Klassisches Büro</label></div><div class="settings-secretariat-choice"><img src="assets/secretariat-office-modern.png" alt="Modernes Büro"><label><input type="radio" name="secretariatTheme42" value="modern"> Modernes Büro</label></div><div class="settings-secretariat-choice"><img src="assets/secretariat-office-kuechenchef.png" alt="Küchenchef-Büro"><label><input type="radio" name="secretariatTheme42" value="kuechenchef"> Küchenchef-Büro</label></div></div><div class="settings-switch-row"><label><input id="secretariatRememberLast42" type="checkbox"> Letztes Sekretariat beim Beenden speichern</label></div><div class="settings-switch-row"><label><input id="secretariatClock42" type="checkbox"> Laufende Uhr im Sekretariat anzeigen</label></div><div class="settings-switch-row"><label><input id="secretariatLightsOut42" type="checkbox"> Lichter beim Programmende ausschalten</label></div><div class="button-row settings-actions"><button id="saveSecretariatPrefs42" class="primary" type="button">Voreinstellungen speichern</button></div>';
    settings.appendChild(panel);
    function sync(){ ensureDefaults(); const s=st().settings; document.querySelectorAll('[name="secretariatTheme42"]').forEach(r=>r.checked=r.value===s.secretariatTheme); if($('#secretariatRememberLast42')) $('#secretariatRememberLast42').checked=!!s.secretariatRememberLast; if($('#secretariatClock42')) $('#secretariatClock42').checked=!!s.secretariatClock; if($('#secretariatLightsOut42')) $('#secretariatLightsOut42').checked=!!s.secretariatLightsOut; if($('#clubMotto')) $('#clubMotto').value=s.clubMotto||'Verwaltung · Gemeinschaft · Genuss'; }
    panel.addEventListener('change',()=>{ const s=st().settings; const r=panel.querySelector('[name="secretariatTheme42"]:checked'); if(r) s.secretariatTheme=r.value; s.secretariatRememberLast=$('#secretariatRememberLast42').checked; s.secretariatClock=$('#secretariatClock42').checked; s.secretariatLightsOut=!!$('#secretariatLightsOut42')?.checked; s.clubMotto=$('#clubMotto')?.value||'Verwaltung · Gemeinschaft · Genuss'; save(); try{ window.SecretariatMemberCardsCore?.renderSecretary?.(); }catch(_e){} applyTheme(); });
    $('#saveSecretariatPrefs42')?.addEventListener('click',()=>{ save(); if(typeof window.toast==='function') window.toast('Sekretariat-Voreinstellungen gespeichert.','success'); });
    sync();
  }

  function bindExistingPrefs43(){
    ensureDefaults();
    const panel=$('#settingsSecretariatPrefs'); if(!panel || panel.dataset.bound43) return;
    panel.dataset.bound43='1';
    function sync(){ const s=st().settings; document.querySelectorAll('[name="secretariatTheme42"]').forEach(r=>r.checked=r.value===s.secretariatTheme); if($('#secretariatRememberLast42')) $('#secretariatRememberLast42').checked=!!s.secretariatRememberLast; if($('#secretariatClock42')) $('#secretariatClock42').checked=!!s.secretariatClock; if($('#secretariatLightsOut42')) $('#secretariatLightsOut42').checked=!!s.secretariatLightsOut; if($('#clubMotto')) $('#clubMotto').value=s.clubMotto||'Verwaltung · Gemeinschaft · Genuss'; }
    panel.addEventListener('change',()=>{ const s=st().settings; const r=panel.querySelector('[name="secretariatTheme42"]:checked'); if(r) s.secretariatTheme=r.value; s.secretariatRememberLast=!!$('#secretariatRememberLast42')?.checked; s.secretariatClock=!!$('#secretariatClock42')?.checked; s.secretariatLightsOut=!!$('#secretariatLightsOut42')?.checked; s.clubMotto=$('#clubMotto')?.value||'Verwaltung · Gemeinschaft · Genuss'; save(); try{ window.SecretariatMemberCardsCore?.renderSecretary?.(); }catch(_e){} applyTheme(); });
    $('#saveSecretariatPrefs42')?.addEventListener('click',()=>{ panel.dispatchEvent(new Event('change')); if(typeof window.toast==='function') window.toast('Voreinstellungen gespeichert.','success'); });
    sync();
  }

  function init(){ ensureDefaults(); addSettings(); bindExistingPrefs43(); applyTheme(); }
  if(window.App && typeof App.registerInit==='function'){ App.registerInit('secretariat-preferences-test42',init); if(App._started) setTimeout(init,0); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else setTimeout(init,0);
})();
