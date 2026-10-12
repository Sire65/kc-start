
/* KNG 53.0 – Konsolidierungsseite + Koordinaten-Hilfe
   Nicht-destruktiv: bestehende Kernfunktionen werden nicht überschrieben. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const LS_COORD='kngOfficeIconCoordinates47_3';
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function getJson(key, fallback){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; }catch(_){ return fallback; } }
  function addSettingsTab(){
    const tabs=$('.settings-tabs');
    if(tabs && !$('[data-settings-tab="settingsConsolidation"]')){
      const b=document.createElement('button');
      b.className='tab'; b.type='button'; b.dataset.settingsTab='settingsConsolidation'; b.textContent='Konsolidierung';
      tabs.appendChild(b);
    }
    const settings=$('#settings');
    if(settings && !$('#settingsConsolidation')){
      const panel=document.createElement('div');
      panel.id='settingsConsolidation'; panel.className='settings-tab';
      panel.innerHTML=renderConsolidationPanel();
      settings.appendChild(panel);
    }
  }
  function renderConsolidationPanel(){
    const scripts=$$('script[src]').map(s=>s.getAttribute('src')).filter(Boolean);
    const styles=$$('link[rel="stylesheet"]').map(s=>s.getAttribute('href')).filter(Boolean);
    const coords=getJson(LS_COORD, []);
    const state=window.state || {};
    const members=Array.isArray(state.members)?state.members.length:(Array.isArray(window.members)?window.members.length:0);
    return `
      <div class="kng530-consolidation-panel">
        <h4>Version 53.0 – Konsolidierung / Stabilitätsbasis</h4>
        <p class="hint">Diese Seite fasst den technischen Zustand zusammen. Die Konsolidierung wurde bewusst nicht-destruktiv durchgeführt, damit keine funktionierenden Bereiche zurückfallen.</p>
        <div class="kng530-status-grid">
          <div class="kng530-status-tile"><strong>${scripts.length}</strong><span>JavaScript-Dateien geladen</span></div>
          <div class="kng530-status-tile"><strong>${styles.length}</strong><span>CSS-Dateien geladen</span></div>
          <div class="kng530-status-tile"><strong>${members}</strong><span>Mitglieder im aktuellen Zustand</span></div>
          <div class="kng530-status-tile"><strong>${Array.isArray(coords)?coords.length:0}</strong><span>eigene Koordinateneinträge</span></div>
        </div>
        <p><span class="kng530-badge">● Stabilitätsmodus aktiv</span> <span class="kng530-badge kng530-warn">Patches nicht riskant zusammengeführt</span></p>
        <h5>Geprüfte Kernbereiche</h5>
        <ul>
          <li>Timer, Uhr und Meldungen bleiben unverändert.</li>
          <li>Systemcheck bleibt unverändert.</li>
          <li>Datensicherung und Rücksicherung bleiben unverändert.</li>
          <li>Admin-Leitstand und Datenbankmonitor bleiben unverändert.</li>
          <li>Koordinatenhilfe wurde ergänzt.</li>
        </ul>
        <h5>Geladene Skripte</h5>
        <div class="kng530-code-list">${scripts.map(s=>`<div>${esc(s)}</div>`).join('')}</div>
        <div class="button-row compact" style="margin-top:12px">
          <button type="button" class="secondary" id="kng530OpenSystemcheck">Systemcheck öffnen</button>
          <button type="button" class="secondary" id="kng530OpenCoordinates">Koordinaten öffnen</button>
        </div>
      </div>`;
  }
  function bindButtons(){
    document.addEventListener('click', ev=>{
      const sys=ev.target.closest('#kng530OpenSystemcheck');
      if(sys){ ev.preventDefault(); document.querySelector('[data-settings-tab="settingsSystemCheck"], [data-view="systemCheck"]')?.click(); }
      const co=ev.target.closest('#kng530OpenCoordinates');
      if(co){ ev.preventDefault(); document.querySelector('[data-settings-tab="settingsCoordinates"]')?.click(); }
    }, true);
  }
  function injectCoordinateHelp(){
    const panel=$('#settingsCoordinates');
    if(!panel || $('#kng530CoordinateHelp')) return;
    const help=document.createElement('details');
    help.id='kng530CoordinateHelp';
    help.className='kng530-help-card';
    help.open=true;
    help.innerHTML=`
      <summary>❓ Hilfe: Koordinaten X/Y richtig benutzen</summary>
      <div class="kng530-help-grid">
        <div>
          <p>Mit den Koordinaten verschiebst du die kleinen Symbole im Büro-Design. Die Werte sind <strong>Prozentwerte</strong> bezogen auf das Bürobild.</p>
          <ul>
            <li><strong>X</strong> = Position von links nach rechts. Kleiner = weiter links, größer = weiter rechts.</li>
            <li><strong>Y</strong> = Position von oben nach unten. Kleiner = weiter oben, größer = weiter unten.</li>
            <li><strong>Größe</strong> = Symbolgröße in Pixeln.</li>
          </ul>
          <table class="kng530-mini-table">
            <thead><tr><th>Beispiel</th><th>X</th><th>Y</th><th>Ergebnis</th></tr></thead>
            <tbody>
              <tr><td>Mitte</td><td>50</td><td>50</td><td>Symbol sitzt ungefähr in der Mitte</td></tr>
              <tr><td>weiter rechts</td><td>80</td><td>50</td><td>Symbol wandert nach rechts</td></tr>
              <tr><td>weiter unten</td><td>50</td><td>80</td><td>Symbol wandert nach unten</td></tr>
              <tr><td>rechts unten</td><td>80</td><td>80</td><td>Symbol wandert nach rechts unten</td></tr>
            </tbody>
          </table>
          <p><strong>Arbeitsweise:</strong> Wert ändern → <em>Speichern</em> oder <em>Vorschau aktualisieren</em> klicken → Bürobild prüfen.</p>
        </div>
        <div class="kng530-axis-box" aria-label="Koordinaten Beispielgrafik">
          <svg viewBox="0 0 320 250" role="img">
            <defs>
              <filter id="glow530"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <marker id="arrow530" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#93c5fd"/></marker>
            </defs>
            <rect x="0" y="0" width="320" height="250" rx="14" fill="#0f172a"/>
            <line x1="38" y1="210" x2="288" y2="210" stroke="#93c5fd" stroke-width="2" marker-end="url(#arrow530)"/>
            <line x1="38" y1="210" x2="38" y2="28" stroke="#93c5fd" stroke-width="2" marker-end="url(#arrow530)"/>
            <text x="292" y="216" fill="#bfdbfe" font-size="16" font-weight="700">X</text>
            <text x="30" y="22" fill="#bfdbfe" font-size="16" font-weight="700">Y</text>
            <g stroke="#334155" stroke-width="1">
              <line x1="90" y1="35" x2="90" y2="210"/><line x1="160" y1="35" x2="160" y2="210"/><line x1="230" y1="35" x2="230" y2="210"/>
              <line x1="38" y1="165" x2="288" y2="165"/><line x1="38" y1="115" x2="288" y2="115"/><line x1="38" y1="65" x2="288" y2="65"/>
            </g>
            <circle cx="160" cy="115" r="10" fill="#22c55e" filter="url(#glow530)"/><text x="176" y="120" fill="#e2e8f0" font-size="13">X 50 / Y 50</text>
            <circle cx="250" cy="115" r="10" fill="#facc15" filter="url(#glow530)"/><text x="190" y="101" fill="#fde68a" font-size="13">X 80 / Y 50</text>
            <circle cx="160" cy="178" r="10" fill="#38bdf8" filter="url(#glow530)"/><text x="176" y="183" fill="#bae6fd" font-size="13">X 50 / Y 80</text>
            <circle cx="250" cy="178" r="10" fill="#fb7185" filter="url(#glow530)"/><text x="177" y="200" fill="#fecdd3" font-size="13">X 80 / Y 80</text>
            <text x="44" y="228" fill="#94a3b8" font-size="12">links oben = kleine Werte</text>
            <text x="165" y="228" fill="#94a3b8" font-size="12">rechts unten = große Werte</text>
          </svg>
        </div>
      </div>`;
    const actions=panel.querySelector('.kng473-coordinate-actions') || panel.children[1];
    panel.insertBefore(help, actions || panel.firstChild.nextSibling);
  }
  function patchSettingsTabClick(){
    document.addEventListener('click', ev=>{
      const b=ev.target.closest('[data-settings-tab]');
      if(!b) return;
      const section=b.closest('#settings'); if(!section) return;
      const id=b.dataset.settingsTab;
      section.querySelectorAll('[data-settings-tab]').forEach(x=>x.classList.toggle('active', x===b));
      section.querySelectorAll('.settings-tab').forEach(p=>p.classList.toggle('active', p.id===id));
      if(id==='settingsCoordinates') setTimeout(injectCoordinateHelp, 0);
    }, true);
  }
  function updateTitle(){
    const t=document.querySelector('title'); if(t) t.textContent='Köcheclub Verwaltung 1.0 – Version 53.0 Konsolidierung';
  }
  function init(){
    updateTitle(); addSettingsTab(); injectCoordinateHelp(); bindButtons();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,500); setTimeout(init,1500);
  patchSettingsTabClick();
})();
