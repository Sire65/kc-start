/* Test 47.3 – Konsolidierung: Koordinaten, Mitglieder-Voreinstellungen, Büro-Design, Toast und Auto-Timer */
(function(){
  'use strict';
  const LS_COORD='kngOfficeIconCoordinates47_3';
  const LS_MEMBER_PREF='kngMemberOfficePreferences47_3';
  const LS_GLOBAL_PREF='kngOfficeGlobalPreferences47_3';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const DEFAULT_COORDS=[
    ['classic','Tasse','Logout','logout',13.8,59.0,28],
    ['classic','Ordner 1','Inventar','inventory',14.3,46.0,24],
    ['classic','Ordner 2','Finanzen','finance',17.0,46.0,24],
    ['classic','Ordner 3','Bestellungen','orders',19.6,46.0,24],
    ['classic','Ordner 4','Dienstkleidung','workwear',22.3,46.0,24],
    ['classic','Ordner 5','Fragebogen','questionnaire',25.0,46.0,24],
    ['classic','Ordner 6','Satzung','statutes',27.7,46.0,24],
    ['classic','Box 1','Mitgliederverwaltung','members',40.0,50.0,30],
    ['classic','Box 2','Dokumentenverwaltung','documents',48.0,50.0,30],
    ['classic','Box 3','Fotosammlung','photos',56.0,50.0,30],
    ['classic','Pinnwand','Programm-Pinnwand','pinboard',50.5,37.5,28],
    ['classic','Weltkugel','Internet / Webbrowser','internet',67.2,40.5,26],
    ['classic','Telefon','Telefonverzeichnis','phone',79.2,47.5,28],
    ['classic','Drehkartei','Adressverwaltung','addresses',59.0,63.0,26],
    ['classic','Tischrechner','Taschenrechner','calculator',69.5,76.0,26],
    ['classic','Handy','E-Mail','email',63.5,78.0,26],
    ['classic','Briefablage','Dokumenteneingang','inbox',89.0,50.0,28],
    ['classic','Notizblock','Kurznotizen','notes',82.0,77.0,26],
    ['modern','Tasse','Logout','logout',13.8,59.0,28],
    ['modern','Ordner 1','Inventar','inventory',14.3,46.0,24],
    ['modern','Ordner 2','Finanzen','finance',17.0,46.0,24],
    ['modern','Ordner 3','Bestellungen','orders',19.6,46.0,24],
    ['modern','Ordner 4','Dienstkleidung','workwear',22.3,46.0,24],
    ['modern','Ordner 5','Fragebogen','questionnaire',25.0,46.0,24],
    ['modern','Ordner 6','Satzung','statutes',27.7,46.0,24],
    ['modern','Box 1','Mitgliederverwaltung','members',40.0,50.0,30],
    ['modern','Box 2','Dokumentenverwaltung','documents',48.0,50.0,30],
    ['modern','Box 3','Fotosammlung','photos',56.0,50.0,30],
    ['modern','Pinnwand','Programm-Pinnwand','pinboard',50.5,37.5,28],
    ['modern','Weltkugel','Internet / Webbrowser','internet',67.2,40.5,26],
    ['modern','Telefon','Telefonverzeichnis','phone',79.2,47.5,28],
    ['modern','Drehkartei','Adressverwaltung','addresses',59.0,63.0,26],
    ['modern','Tischrechner','Taschenrechner','calculator',69.5,76.0,26],
    ['modern','Handy','E-Mail','email',63.5,78.0,26],
    ['modern','Briefablage','Dokumenteneingang','inbox',89.0,50.0,28],
    ['modern','Notizblock','Kurznotizen','notes',82.0,77.0,26]
  ].map((r,i)=>({id:i+1, office:r[0], object:r[1], function:r[2], icon:r[3], x:r[4], y:r[5], size:r[6]}));
  function safeJsonGet(key,fallback){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; }catch(_){ return fallback; } }
  function safeJsonSet(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch(_){} }
  function toastInternal(msg,type='info'){
    let wrap=$('#toastContainer') || $('.toast-container');
    if(!wrap){ wrap=document.createElement('div'); wrap.id='toastContainer'; wrap.className='toast-container kng473-toast-container'; document.body.appendChild(wrap); }
    const max=3;
    while(wrap.children.length>=max) wrap.removeChild(wrap.firstElementChild);
    const t=document.createElement('div');
    t.className='toast kng473-toast '+String(type||'info');
    t.textContent=msg;
    wrap.appendChild(t);
    const remove=()=>{ t.classList.add('hide'); setTimeout(()=>t.remove(),240); };
    setTimeout(remove, type==='error'?6500:3800);
    t.addEventListener('click',remove);
  }
  function overrideToast(){ /* ab 47.9: globale Meldungen werden zentral in js/31 gesteuert */ }
  function renameSecretariat(){
    $$('button, a, span, h2, h3').forEach(el=>{
      if(el.childNodes.length===1 && el.textContent && el.textContent.trim()==='Sekretariat') el.textContent='Büro-Design';
      if(el.textContent && el.textContent.trim()==='Sekretariatsmodus') el.textContent='Büro-Design';
    });
    const nav=$$('button.nav[data-view="secretariat"],button[data-view="secretariat"]');
    nav.forEach(b=>{ if(b.textContent.includes('Sekretariat')) b.textContent=b.textContent.replace('Sekretariat','Büro-Design'); });
    const header=$('#secretariat .view-header h2'); if(header) header.textContent='Büro-Design';
    const p=$('#secretariat .view-header .muted'); if(p) p.textContent='Grafische Bürooberfläche mit klassischem und modernem Büro-Design.';
  }
  function ensureSettingsCoordinatesTab(){
    const tabs=$('.settings-tabs');
    const assistantBtn=$('[data-settings-tab="settingsAssistant"]');
    if(tabs && !$('[data-settings-tab="settingsCoordinates"]')){
      const b=document.createElement('button'); b.className='tab'; b.type='button'; b.dataset.settingsTab='settingsCoordinates'; b.textContent='Koordinaten';
      tabs.insertBefore(b, assistantBtn || null);
    }
    const anchor=$('#settingsAssistant') || $('#settingsSecretariatPrefs');
    if(anchor && !$('#settingsCoordinates')){
      const panel=document.createElement('div'); panel.id='settingsCoordinates'; panel.className='settings-tab';
      panel.innerHTML=`
        <h4>Koordinaten Büro-Icons</h4>
        <p class="hint">Kompakte Tabelle für die Positionen der Icons im Büro-Design. X/Y sind Prozentwerte, damit die Positionen bei anderer Fenstergröße erhalten bleiben.</p>
        <div class="kng473-coordinate-actions button-row compact">
          <button id="coordSave473" class="primary" type="button">Speichern</button>
          <button id="coordPreview473" class="secondary" type="button">Vorschau aktualisieren</button>
          <button id="coordReset473" class="secondary" type="button">Standard wiederherstellen</button>
          <button id="coordExport473" class="secondary" type="button">Export</button>
          <button id="coordImport473" class="secondary" type="button">Import</button>
        </div>
        <div class="table-wrap compact-table kng473-coord-wrap"><table class="kng473-coord-table"><thead><tr><th>Büro</th><th>Objekt</th><th>Funktion</th><th>Icon</th><th>X %</th><th>Y %</th><th>Größe</th></tr></thead><tbody id="coordBody473"></tbody></table></div>`;
      anchor.parentNode.insertBefore(panel, anchor);
    }
    bindSettingsTabClicks();
    renderCoordTable();
  }
  function getCoords(){ return safeJsonGet(LS_COORD, DEFAULT_COORDS); }
  function renderCoordTable(){
    const body=$('#coordBody473'); if(!body) return;
    const rows=getCoords();
    body.innerHTML=rows.map((r,i)=>`<tr data-i="${i}"><td>${r.office}</td><td>${r.object}</td><td>${r.function}</td><td><input data-k="icon" value="${r.icon||''}"></td><td><input data-k="x" type="number" step="0.1" value="${Number(r.x).toFixed(1)}"></td><td><input data-k="y" type="number" step="0.1" value="${Number(r.y).toFixed(1)}"></td><td><input data-k="size" type="number" step="1" value="${r.size||24}"></td></tr>`).join('');
  }
  function readCoordTable(){
    const rows=getCoords().map(x=>Object.assign({},x));
    $$('#coordBody473 tr').forEach(tr=>{
      const i=Number(tr.dataset.i); if(!rows[i]) return;
      $$('input',tr).forEach(inp=>{ const k=inp.dataset.k; rows[i][k]=(k==='x'||k==='y'||k==='size')?Number(inp.value||0):inp.value; });
    });
    return rows;
  }
  function bindCoordActions(){
    $('#coordSave473')?.addEventListener('click',()=>{ safeJsonSet(LS_COORD, readCoordTable()); (window.toast||toastInternal)('Koordinaten gespeichert.','success'); applyOfficeCoordinates(); });
    $('#coordPreview473')?.addEventListener('click',()=>{ safeJsonSet(LS_COORD, readCoordTable()); applyOfficeCoordinates(); (window.toast||toastInternal)('Vorschau aktualisiert.','info'); });
    $('#coordReset473')?.addEventListener('click',()=>{ if(confirm('Standard-Koordinaten wirklich wiederherstellen?')){ safeJsonSet(LS_COORD, DEFAULT_COORDS); renderCoordTable(); applyOfficeCoordinates(); (window.toast||toastInternal)('Standard-Koordinaten wiederhergestellt.','success'); } });
    $('#coordExport473')?.addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(readCoordTable(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kng_koordinaten_buero_icons.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); });
    $('#coordImport473')?.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{ const rows=JSON.parse(fr.result); if(Array.isArray(rows)){ safeJsonSet(LS_COORD, rows); renderCoordTable(); applyOfficeCoordinates(); (window.toast||toastInternal)('Koordinaten importiert.','success'); } }catch(e){ (window.toast||toastInternal)('Import fehlgeschlagen.','error'); } }; fr.readAsText(f); }; inp.click(); });
  }
  function ensureMemberPreferencesPanel(){
    const tabs=$('.tabs');
    if(!$('#memberPreferences') && $('#memberHistory')){
      const panel=document.createElement('div'); panel.id='memberPreferences'; panel.className='member-tab';
      panel.innerHTML=`
        <h4>Voreinstellungen</h4>
        <p class="hint small">Benutzerbezogene Voreinstellungen für dieses Mitglied. Weitere Voreinstellungen werden später ergänzt.</p>
        <div class="table-wrap compact-table"><table class="kng473-member-pref-table"><thead><tr><th>Einstellung</th><th>Wert</th></tr></thead><tbody>
          <tr><td>Standard verwenden</td><td><label class="toggle-switch compact"><input id="memberPrefUseDefault473" type="checkbox"><span class="switch-slider"></span><span>Ja</span></label></td></tr>
          <tr><td>Klassisches Büro-Design</td><td><label><input name="memberOfficeDesign473" id="memberPrefClassic473" type="radio" value="classic"> Klassisch</label></td></tr>
          <tr><td>Modernes Büro-Design</td><td><label><input name="memberOfficeDesign473" id="memberPrefModern473" type="radio" value="modern"> Modern</label></td></tr>
          <tr><td>Letztes Design merken</td><td><label class="toggle-switch compact"><input id="memberPrefRemember473" type="checkbox"><span class="switch-slider"></span><span>Ja</span></label></td></tr>
        </tbody></table></div>
        <div class="button-row"><button id="saveMemberPrefs473" type="button" class="primary">Voreinstellungen speichern</button></div>`;
      $('#memberHistory').after(panel);
    }
    if(!$('[data-member-tab="memberPreferences"]')){
      const bar=$('#members .tabs');
      if(bar){ const b=document.createElement('button'); b.className='tab'; b.type='button'; b.dataset.memberTab='memberPreferences'; b.textContent='Voreinstellungen'; bar.appendChild(b); }
    }
    bindMemberPrefs();
  }
  function currentMemberKey(){ return ($('#memberNo')?.value || $('#email')?.value || 'global').trim() || 'global'; }
  function loadMemberPref(){
    const map=safeJsonGet(LS_MEMBER_PREF,{}); const p=map[currentMemberKey()] || {useDefault:true, office:'classic', remember:true};
    $('#memberPrefUseDefault473') && ($('#memberPrefUseDefault473').checked=!!p.useDefault);
    $('#memberPrefClassic473') && ($('#memberPrefClassic473').checked=(p.office!=='modern'));
    $('#memberPrefModern473') && ($('#memberPrefModern473').checked=(p.office==='modern'));
    $('#memberPrefRemember473') && ($('#memberPrefRemember473').checked=p.remember!==false);
  }
  function saveMemberPref(){
    const map=safeJsonGet(LS_MEMBER_PREF,{});
    map[currentMemberKey()]={
      useDefault:!!$('#memberPrefUseDefault473')?.checked,
      office:$('#memberPrefModern473')?.checked?'modern':'classic',
      remember:!!$('#memberPrefRemember473')?.checked
    };
    safeJsonSet(LS_MEMBER_PREF,map); (window.toast||toastInternal)('Mitglieds-Voreinstellungen gespeichert.','success');
  }
  function bindMemberPrefs(){
    $('#saveMemberPrefs473')?.addEventListener('click',saveMemberPref);
    $('#memberNo')?.addEventListener('change',loadMemberPref);
    setTimeout(loadMemberPref,300);
  }
  function bindMemberTabClicks(){
    document.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-member-tab]'); if(!b) return;
      const id=b.dataset.memberTab;
      $$('#members [data-member-tab]').forEach(x=>x.classList.toggle('active',x===b));
      $$('#members .member-tab').forEach(p=>p.classList.toggle('active',p.id===id));
      if(id==='memberPreferences') setTimeout(loadMemberPref,0);
    }, true);
  }
  function bindSettingsTabClicks(){
    document.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-settings-tab]'); if(!b) return;
      const section=b.closest('#settings'); if(!section) return;
      const id=b.dataset.settingsTab;
      $$('[data-settings-tab]',section).forEach(x=>x.classList.toggle('active',x===b));
      $$('.settings-tab',section).forEach(p=>p.classList.toggle('active',p.id===id));
    }, true);
  }
  function fixAutoTimer(){
    // Deaktiviert ab Version 47.7: Auto-Aus/Countdown wird zentral in js/29_kng477_core_message_auto_logout.js gesteuert.
  }
  function applyOfficeCoordinates(){
    // Vorbereitung für kommende Versionen: Koordinaten stehen zentral zur Verfügung.
    window.KNG_OFFICE_ICON_COORDINATES_473=getCoords();
  }
  function init(){
    overrideToast();
    renameSecretariat();
    ensureSettingsCoordinatesTab();
    bindCoordActions();
    ensureMemberPreferencesPanel();
    bindMemberTabClicks();
    fixAutoTimer();
    applyOfficeCoordinates();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,500);
  setTimeout(init,1500);
})();
