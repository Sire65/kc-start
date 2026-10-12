/* Dokumentenmanagement – Kernmodul Test 23
   Eigenes Modul mit Mehrfachzuordnung, Wiedervorlage, Versand/Druck und Protokoll.
   Keine Patchlogik: alle Funktionen sind idempotent und werden über App/EventManager eingebunden. */
(function(){
  'use strict';

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let currentId = null;

  function ensureDocumentState(){
    if(!window.state) return;
    if(!Array.isArray(state.documents)) state.documents = [];
    if(!Array.isArray(state.documentAssignments)) state.documentAssignments = [];
    if(!Array.isArray(state.documentReminders)) state.documentReminders = [];
    if(!Array.isArray(state.documentLog)) state.documentLog = [];
    state.combos = state.combos || {};
    const defaults = {
      documentCategories:['','Rechnung','Lieferschein','Vertrag','Satzung','Protokoll','Presseartikel','Pressefoto','Mitgliederunterlage','Gesundheitszeugnis','Dienstplan','Inventarunterlage','Bedienungsanleitung','Versicherung','Behördenunterlage','Sonstiges'],
      documentStatus:['','offen','geprüft','erledigt','archiviert','abgelaufen','gelöscht'],
      documentConfidentiality:['öffentlich','intern','Vorstand','Admin','vertraulich'],
      documentReminderReasons:['','prüfen','verlängern','beantworten','bezahlen','unterschreiben','erneuern','archivieren'],
      documentTypes:['','Satzung erhalten','Datenschutzerklärung','Fotoerlaubnis','Homepage-Einwilligung','Hygienebelehrung','Führerschein-Kopie','Bescheinigung','Bedienungsanleitung','Vertrag','Rechnung','Pressefoto','Presseartikel','Sonstiges']
    };
    Object.entries(defaults).forEach(([k,arr])=>{
      if(!Array.isArray(state.combos[k]) || !state.combos[k].length) state.combos[k] = arr.slice();
      else arr.forEach(v=>{ if(!state.combos[k].includes(v)) state.combos[k].push(v); });
    });
    if(Array.isArray(state.settings?.navIcons) && !state.settings.navIcons.includes('documents')){
      const pos = state.settings.navIcons.indexOf('communication');
      state.settings.navIcons.splice(pos>=0?pos+1:state.settings.navIcons.length-1,0,'documents');
    }
  }

  function save(){ if(typeof window.saveState === 'function') saveState(); }
  function toastMsg(text,type='info'){ if(typeof window.toast === 'function') toast(text,type); else console.log(text); }
  function logDoc(action, doc, details=''){
    ensureDocumentState();
    const entry = {
      time:new Date().toLocaleString('de-DE'),
      iso:new Date().toISOString(),
      user:state.session?.userName || 'Gast',
      action,
      documentId:doc?.id || currentId || '',
      documentTitle:doc?.title || '',
      details
    };
    state.documentLog.unshift(entry);
    if(typeof window.logAction === 'function') logAction('Dokumentenmanagement',action,details);
  }

  function combo(id, key, keepFirst=''){
    const el = $('#'+id); if(!el) return;
    const vals = Array.isArray(state.combos?.[key]) ? state.combos[key] : [];
    el.innerHTML = vals.map(v=>`<option value="${esc(v)}">${esc(v || keepFirst)}</option>`).join('');
  }
  function setVal(id,v){ const el=$('#'+id); if(el) el.value = v ?? ''; }
  function getVal(id){ return $('#'+id)?.value?.trim?.() || ''; }

  function memberName(m){ return `${m.memberNo||''} ${m.firstName||''} ${m.lastName||''}`.trim(); }
  function addressName(a){ return `${a.company||''} ${a.firstName||''} ${a.lastName||''} ${a.name||''}`.trim() || a.email1 || a.email || a.id; }
  function inventoryName(i){ return `${i.no||i.inventoryNo||''} ${i.name||i.title||i.item||i.bezeichnung||''}`.trim() || i.id; }

  function fillReferenceCombos(){
    const mem=$('#docAssignMember'); if(mem){ mem.innerHTML='<option value="">keine Mitgliedszuordnung</option>'+(state.members||[]).map(m=>`<option value="${esc(m.id)}">${esc(memberName(m))}</option>`).join(''); }
    const rem=$('#docReminderPerson'); if(rem){ rem.innerHTML='<option value="">nicht zugeordnet</option>'+(state.members||[]).map(m=>`<option value="${esc(m.id)}">${esc(memberName(m))}</option>`).join(''); }
    const adr=$('#docAssignAddress'); if(adr){ adr.innerHTML='<option value="">keine Adresszuordnung</option>'+(state.addresses||[]).map(a=>`<option value="${esc(a.id)}">${esc(addressName(a))}</option>`).join(''); }
    const inv=$('#docAssignInventory'); if(inv){ inv.innerHTML='<option value="">keine Inventarzuordnung</option>'+(state.inventory||state.inventoryItems||[]).map(i=>`<option value="${esc(i.id)}">${esc(inventoryName(i))}</option>`).join(''); }
  }

  function fillCombos(){
    ensureDocumentState();
    combo('docFilterCategory','documentCategories','Alle Kategorien');
    combo('docFilterStatus','documentStatus','Alle Status');
    combo('docFilterConfidentiality','documentConfidentiality','Alle Stufen');
    combo('docCategory','documentCategories');
    combo('docType','documentTypes');
    combo('docStatus','documentStatus');
    combo('docConfidentiality','documentConfidentiality');
    combo('docReminderReason','documentReminderReasons');
    fillReferenceCombos();
  }

  function selectedDoc(){ return state.documents.find(d=>d.id===currentId) || null; }
  function nextNo(){ return 'DOK-'+String((state.documents||[]).length+1).padStart(4,'0'); }
  function newDoc(){
    currentId = null;
    ['docNo','docTitle','docDate','docYear','docStorage','docFileName','docDescription','docNote','docMailTo','docMailSubject','docMailBody'].forEach(id=>setVal(id,''));
    setVal('docNo',nextNo());
    setVal('docConfidentiality','intern');
    setVal('docStatus','offen');
    const info=$('#docCurrentInfo'); if(info) info.textContent='Neues Dokument';
    clearAssignmentForm();
    clearReminderForm();
    activateTab('docCardTab');
  }

  function docFromForm(existing){
    const date=getVal('docDate');
    const year=getVal('docYear') || (date ? String(new Date(date).getFullYear()) : '');
    return {
      ...(existing||{}),
      id: existing?.id || ('doc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)),
      no: getVal('docNo') || nextNo(),
      title: getVal('docTitle'),
      category: getVal('docCategory'),
      type: getVal('docType'),
      date,
      year,
      status: getVal('docStatus'),
      confidentiality: getVal('docConfidentiality') || 'intern',
      storage: getVal('docStorage'),
      fileName: getVal('docFileName'),
      description: getVal('docDescription'),
      note: getVal('docNote'),
      updatedAt: new Date().toISOString(),
      updatedBy: state.session?.userName || 'Gast',
      createdAt: existing?.createdAt || new Date().toISOString()
    };
  }

  function saveDoc(){
    ensureDocumentState();
    const existing = selectedDoc();
    const doc = docFromForm(existing);
    if(!doc.title){ toastMsg('Bitte einen Dokumenttitel eingeben.','warning'); $('#docTitle')?.focus(); return; }
    if(existing){ const idx=state.documents.findIndex(d=>d.id===existing.id); state.documents[idx]=doc; logDoc('Dokument geändert',doc); }
    else { state.documents.unshift(doc); currentId=doc.id; logDoc('Dokument angelegt',doc); }
    save(); renderAll(); toastMsg('Dokument gespeichert.','success');
  }

  function archiveDoc(){
    const doc=selectedDoc(); if(!doc){ toastMsg('Kein Dokument ausgewählt.','info'); return; }
    if(!confirm('Dokument löschen/archivieren? Es wird aus Nachvollziehbarkeit auf Status „gelöscht“ gesetzt.')) return;
    doc.status='gelöscht'; doc.deletedAt=new Date().toISOString(); doc.deletedBy=state.session?.userName||'Gast';
    logDoc('Dokument gelöscht/archiviert',doc); save(); renderAll();
  }

  function loadDoc(id){
    const doc=state.documents.find(d=>d.id===id); if(!doc) return;
    currentId=id;
    setVal('docNo',doc.no); setVal('docTitle',doc.title); setVal('docCategory',doc.category); setVal('docType',doc.type); setVal('docDate',doc.date); setVal('docYear',doc.year); setVal('docStatus',doc.status); setVal('docConfidentiality',doc.confidentiality); setVal('docStorage',doc.storage); setVal('docFileName',doc.fileName); setVal('docDescription',doc.description); setVal('docNote',doc.note);
    const info=$('#docCurrentInfo'); if(info) info.textContent=`${doc.no||''} – ${doc.title||''}`;
    loadAssignments(); loadReminder(); renderAll(); activateTab('docCardTab');
  }

  function docAssignmentText(docId){
    const items=(state.documentAssignments||[]).filter(a=>a.documentId===docId);
    if(!items.length) return '—';
    return items.map(a=>{
      if(a.targetType==='club') return 'Verein';
      if(a.targetType==='member') return 'Mitglied: '+(memberName((state.members||[]).find(m=>m.id===a.targetId)||{})||a.targetId);
      if(a.targetType==='address') return 'Adresse: '+(addressName((state.addresses||[]).find(x=>x.id===a.targetId)||{})||a.targetId);
      if(a.targetType==='inventory') return 'Inventar: '+(inventoryName((state.inventory||state.inventoryItems||[]).find(x=>x.id===a.targetId)||{})||a.targetId);
      return a.targetType||'';
    }).filter(Boolean).join(', ');
  }
  function docReminderText(docId){
    const r=(state.documentReminders||[]).find(x=>x.documentId===docId && !x.done);
    return r ? `${r.date||''} ${r.reason||''}` : '—';
  }

  function filteredDocs(){
    const q=getVal('docSearch').toLowerCase();
    const cat=getVal('docFilterCategory');
    const st=getVal('docFilterStatus');
    const yr=getVal('docFilterYear');
    const conf=getVal('docFilterConfidentiality');
    const rem=getVal('docFilterReminder');
    const today=new Date().toISOString().slice(0,10);
    return (state.documents||[]).filter(d=>{
      if(cat && d.category!==cat) return false;
      if(st && d.status!==st) return false;
      if(yr && String(d.year||'')!==yr) return false;
      if(conf && d.confidentiality!==conf) return false;
      const reminder=(state.documentReminders||[]).find(r=>r.documentId===d.id);
      if(rem==='open' && (!reminder || reminder.done)) return false;
      if(rem==='overdue' && (!reminder || reminder.done || !reminder.date || reminder.date>=today)) return false;
      if(rem==='done' && (!reminder || !reminder.done)) return false;
      if(q){
        const hay=[d.no,d.title,d.category,d.type,d.fileName,d.storage,d.description,d.note,docAssignmentText(d.id)].join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderTable(){
    const body=$('#docTableBody'); if(!body) return;
    const list=filteredDocs();
    const counter=$('#documentCounter'); if(counter) counter.textContent=`${list.length} Dokument(e)`;
    body.innerHTML = list.length ? list.map(d=>`<tr data-doc-id="${esc(d.id)}" class="${d.id===currentId?'selected-row':''}"><td>${esc(d.no)}</td><td>${esc(d.title)}</td><td>${esc(d.category)}</td><td>${esc(formatDateSafe(d.date))}</td><td>${esc(d.year)}</td><td>${esc(docAssignmentText(d.id))}</td><td>${esc(d.status)}</td><td>${esc(docReminderText(d.id))}</td><td>${esc(d.fileName)}</td></tr>`).join('') : '<tr><td colspan="9" class="muted">Keine Dokumente gefunden.</td></tr>';
  }

  function formatDateSafe(v){ try{ return v && typeof formatDate==='function' ? formatDate(v) : (v||''); }catch{ return v||''; } }

  function clearAssignmentForm(){ ['docAssignMember','docAssignAddress','docAssignInventory','docAssignArea','docAssignNote'].forEach(id=>setVal(id,'')); const cb=$('#docAssignClub'); if(cb) cb.checked=false; renderAssignments(); }
  function loadAssignments(){
    clearAssignmentForm();
    const doc=selectedDoc(); if(!doc) return;
    const a=(state.documentAssignments||[]).filter(x=>x.documentId===doc.id);
    const club=$('#docAssignClub'); if(club) club.checked=a.some(x=>x.targetType==='club');
    const m=a.find(x=>x.targetType==='member'); if(m) setVal('docAssignMember',m.targetId);
    const ad=a.find(x=>x.targetType==='address'); if(ad) setVal('docAssignAddress',ad.targetId);
    const inv=a.find(x=>x.targetType==='inventory'); if(inv) setVal('docAssignInventory',inv.targetId);
    const area=a.find(x=>x.targetType==='area'); if(area) setVal('docAssignArea',area.targetId);
    const any=a.find(x=>x.note); if(any) setVal('docAssignNote',any.note);
    renderAssignments();
  }
  function saveAssignments(){
    const doc=selectedDoc(); if(!doc){ toastMsg('Bitte zuerst ein Dokument speichern oder auswählen.','info'); return; }
    state.documentAssignments = (state.documentAssignments||[]).filter(a=>a.documentId!==doc.id);
    const note=getVal('docAssignNote');
    function add(type,id){ if(id || type==='club') state.documentAssignments.push({id:'asg_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), documentId:doc.id, targetType:type, targetId:id||'club', note}); }
    if($('#docAssignClub')?.checked) add('club','club');
    add('member',getVal('docAssignMember'));
    add('address',getVal('docAssignAddress'));
    add('inventory',getVal('docAssignInventory'));
    add('area',getVal('docAssignArea'));
    logDoc('Zuordnung geändert',doc,docAssignmentText(doc.id)); save(); renderAll(); toastMsg('Zuordnung gespeichert.','success');
  }
  function renderAssignments(){
    const box=$('#docAssignmentList'); if(!box) return;
    const doc=selectedDoc();
    const items=doc ? (state.documentAssignments||[]).filter(a=>a.documentId===doc.id) : [];
    box.innerHTML = items.length ? items.map(a=>`<span class="assignment-chip">${esc(a.targetType)}: ${esc(a.targetId)} ${a.note?(' – '+esc(a.note)):''}</span>`).join('') : '<p class="muted">Noch keine Zuordnung gespeichert.</p>';
  }

  function clearReminderForm(){ ['docReminderDate','docReminderPerson','docReminderReason','docReminderDone','docReminderNote'].forEach(id=>setVal(id,'')); setVal('docReminderDone','false'); }
  function loadReminder(){
    clearReminderForm();
    const doc=selectedDoc(); if(!doc) return;
    const r=(state.documentReminders||[]).find(x=>x.documentId===doc.id);
    if(r){ setVal('docReminderDate',r.date); setVal('docReminderPerson',r.personId); setVal('docReminderReason',r.reason); setVal('docReminderDone',String(!!r.done)); setVal('docReminderNote',r.note); }
    renderReminders();
  }
  function saveReminder(){
    const doc=selectedDoc(); if(!doc){ toastMsg('Bitte zuerst ein Dokument speichern oder auswählen.','info'); return; }
    state.documentReminders = (state.documentReminders||[]).filter(r=>r.documentId!==doc.id);
    const date=getVal('docReminderDate'), personId=getVal('docReminderPerson'), reason=getVal('docReminderReason'), done=getVal('docReminderDone')==='true', note=getVal('docReminderNote');
    if(date || personId || reason || note){ state.documentReminders.push({id:'rem_'+Date.now().toString(36), documentId:doc.id, date, personId, reason, done, note}); }
    logDoc('Wiedervorlage gespeichert',doc,`${date} ${reason}`); save(); renderAll(); toastMsg('Wiedervorlage gespeichert.','success');
  }
  function renderReminders(){
    const body=$('#docReminderTable'); if(!body) return;
    const items=(state.documentReminders||[]).filter(r=>!currentId || r.documentId===currentId);
    body.innerHTML=items.length?items.map(r=>`<tr><td>${esc(formatDateSafe(r.date))}</td><td>${esc(memberName((state.members||[]).find(m=>m.id===r.personId)||{})||r.personId||'')}</td><td>${esc(r.reason)}</td><td>${r.done?'erledigt':'offen'}</td><td>${esc(r.note)}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">Keine Wiedervorlagen.</td></tr>';
  }
  function renderHistory(){
    const body=$('#docHistoryTable'); if(!body) return;
    const items=(state.documentLog||[]).filter(l=>!currentId || l.documentId===currentId).slice(0,200);
    body.innerHTML=items.length?items.map(l=>`<tr><td>${esc(l.time)}</td><td>${esc(l.user)}</td><td>${esc(l.action)}</td><td>${esc(l.documentTitle||l.documentId)}</td><td>${esc(l.details)}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">Keine Protokolleinträge.</td></tr>';
  }

  function renderMemberDocuments(){
    const body=$('#memberDocumentsTable'); if(!body) return;
    const m=(typeof window.getCurrentMember==='function') ? window.getCurrentMember() : (state.members||[])[state.currentMemberIndex||0];
    if(!m){ body.innerHTML='<tr><td colspan="4" class="muted">Kein Mitglied ausgewählt.</td></tr>'; return; }
    const assigned=(state.documentAssignments||[]).filter(a=>a.targetType==='member' && a.targetId===m.id).map(a=>state.documents.find(d=>d.id===a.documentId)).filter(Boolean);
    const legacy=Array.isArray(m.documents)?m.documents.map(d=>({date:d.date||'', title:d.title||d.name||'', type:d.type||'', note:d.note||''})):[];
    const rows=[...assigned.map(d=>({date:d.date,title:d.title,type:d.category||d.type,note:d.note||d.fileName})),...legacy];
    body.innerHTML=rows.length?rows.map(d=>`<tr><td>${esc(formatDateSafe(d.date))}</td><td>${esc(d.title)}</td><td>${esc(d.type)}</td><td>${esc(d.note)}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">Noch keine Dokumente hinterlegt.</td></tr>';
  }

  function renderAll(){ fillCombos(); ensureDocumentNavIconSetting(); renderTable(); renderAssignments(); renderReminders(); renderHistory(); renderMemberDocuments(); }

  function forceDocumentTabWiring(){
    const tabBox = $('.document-tabs');
    if(tabBox){
      tabBox.dataset.sortableReady = '1';
      tabBox.dataset.tabGroup = 'documents';
      tabBox.classList.remove('sortable-tabs');
    }
    $$('.document-tabs [data-doc-tab]').forEach(tab=>{
      tab.type = 'button';
      tab.draggable = false;
      tab.classList.add('tab','doc-tab');
      tab.classList.remove('tab-sortable','tab-locked','tab-dragging','tab-drop-target');
      tab.querySelectorAll(':scope > .tab-drag-icon').forEach(x=>x.remove());
    });
  }

  function activateTab(id){
    forceDocumentTabWiring();
    // Dokumenten-Registerkarten werden bewusst komplett im Dokumenten-Kernmodul gesteuert.
    // Dadurch können allgemeine Tab-/Sortierfunktionen die Dokumenten-Reiter nicht blockieren.
    const tabs = $$('.document-tabs [data-doc-tab]');
    const panels = $$('.documents-view .doc-tab-panel');
    const targetId = panels.some(p=>p.id===id) ? id : 'docListTab';
    tabs.forEach(b=>{
      const active = b.dataset.docTab === targetId;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach(p=>{
      const active = p.id === targetId;
      p.classList.toggle('active', active);
      p.hidden = !active;
      p.style.display = active ? 'block' : 'none';
    });
  }
  function resetFilters(){ ['docSearch','docFilterCategory','docFilterStatus','docFilterYear','docFilterConfidentiality','docFilterReminder'].forEach(id=>setVal(id,'')); renderTable(); }
  function printDocumentList(){ window.print(); logDoc('Dokumentenliste gedruckt',selectedDoc()||{}); }
  function printDoc(){ window.print(); logDoc('Dokument gedruckt',selectedDoc()||{}); }
  function exportCsv(){
    const rows=[['Nr','Titel','Kategorie','Datum','Jahr','Zuordnung','Status','Datei'],...filteredDocs().map(d=>[d.no,d.title,d.category,d.date,d.year,docAssignmentText(d.id),d.status,d.fileName])];
    const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='dokumentenliste.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function mailDoc(){
    const doc=selectedDoc(); if(!doc){ toastMsg('Kein Dokument ausgewählt.','info'); return; }
    const to=getVal('docMailTo'), subject=getVal('docMailSubject') || ('Dokument: '+doc.title), body=getVal('docMailBody') || `Hallo,\n\nanbei/folgend die Informationen zum Dokument:\n${doc.title}\n${doc.fileName||''}\n\nViele Grüße`;
    window.location.href=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    logDoc('Dokument per E-Mail vorbereitet',doc,to); save(); renderHistory();
  }
  function copyInfo(){
    const doc=selectedDoc(); if(!doc) return;
    const txt=`${doc.no} – ${doc.title}\nKategorie: ${doc.category}\nDatei: ${doc.fileName}\nZuordnung: ${docAssignmentText(doc.id)}`;
    navigator.clipboard?.writeText(txt).then(()=>toastMsg('Dokumentdaten kopiert.','success')).catch(()=>prompt('Dokumentdaten kopieren:',txt));
  }
  function openFile(){ const doc=selectedDoc(); if(!doc?.fileUrl){ toastMsg('Die Datei wurde nicht als Browser-Objekt gespeichert. Bitte über den Pfad öffnen.','info'); return; } window.open(doc.fileUrl,'_blank'); }

  function addMemberDocument(){
    const m=(typeof window.getCurrentMember==='function') ? window.getCurrentMember() : (state.members||[])[state.currentMemberIndex||0];
    newDoc();
    if(m){ setVal('docCategory','Mitgliederunterlage'); setVal('docType','Gesundheitszeugnis'); setVal('docTitle',`Dokument ${m.firstName||''} ${m.lastName||''}`.trim()); setVal('docAssignMember',m.id); }
    if(typeof window.showView==='function') window.showView('documents');
  }

  function ensureDocumentNavIconSetting(){
    const box=$('#navIconSettings');
    if(!box) return;
    ensureDocumentState();
    if(box.querySelector('input[data-nav-icon="documents"]')) return;
    const label=document.createElement('label');
    label.className='nav-icon-option';
    label.innerHTML='<input type="checkbox" data-nav-icon="documents"> <span>📁</span> Dokumentenmanagement';
    const input=label.querySelector('input');
    input.checked=(state.settings.navIcons||[]).includes('documents');
    input.addEventListener('change',()=>{
      const set=new Set(state.settings.navIcons||[]);
      if(input.checked) set.add('documents'); else set.delete('documents');
      set.add('logout');
      state.settings.navIcons=Array.from(set);
      save();
      if(typeof window.renderQuickIcons==='function') window.renderQuickIcons();
      else document.querySelector('.quick-icons button[data-view="documents"]')?.classList.toggle('kng-hidden-by-setting', !input.checked);
    });
    const logout=box.querySelector('input[data-nav-icon="logout"]')?.closest('label');
    if(logout) box.insertBefore(label, logout); else box.appendChild(label);
  }

  function bind(){
    forceDocumentTabWiring();
    if(window.__kngDocumentsBound) return; window.__kngDocumentsBound=true;

    // Harte Reiterbindung im Capture-Modus: Dokumentenregister dürfen nicht von der
    // allgemeinen verschiebbaren Tab-Logik blockiert werden. Der Klick auf die
    // Registerkarte selbst aktiviert immer das passende Dokumentenpanel.
    document.addEventListener('click', ev=>{
      const tab = ev.target.closest?.('.documents-view .document-tabs [data-doc-tab]');
      if(!tab) return;
      // Hamburger-Menü-Icon nicht als Tabwechsel behandeln; dort bleibt das Kontextmenü zuständig.
      if(ev.target.closest?.('.tab-menu-icon')) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      activateTab(tab.dataset.docTab);
    }, true);

    document.addEventListener('keydown', ev=>{
      const tab = ev.target.closest?.('.documents-view .document-tabs [data-doc-tab]');
      if(!tab || (ev.key !== 'Enter' && ev.key !== ' ')) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      activateTab(tab.dataset.docTab);
    }, true);

    // Direkte, robuste Reiterbindung für Dokumentenmanagement.
    // Dokumenten-Tabs werden bewusst NICHT sortierbar/draggable gemacht.
    // Dadurch blockieren Drag-Icons/Sortierhandler keine normalen Klicks mehr.
    function wireDocumentTabs(){
      forceDocumentTabWiring();
      const tabBox = $('.document-tabs');
      if(tabBox){ tabBox.dataset.sortableReady = '1'; tabBox.classList.remove('sortable-tabs'); }
      $$('.document-tabs [data-doc-tab]').forEach(tab=>{
        tab.draggable = false;
        tab.classList.remove('tab-sortable','tab-locked','tab-dragging','tab-drop-target');
        tab.querySelectorAll(':scope > .tab-drag-icon').forEach(x=>x.remove());
        // Hamburger-Menü bleibt erlaubt; nur der eigentliche Tabklick wechselt die Ansicht.
        tab.onclick = ev=>{
          if(ev.target.closest('.tab-menu-icon')) return;
          ev.preventDefault();
          ev.stopPropagation();
          activateTab(tab.dataset.docTab);
        };
        tab.onkeydown = ev=>{
          if(ev.key !== 'Enter' && ev.key !== ' ') return;
          ev.preventDefault();
          ev.stopPropagation();
          activateTab(tab.dataset.docTab);
        };
        tab.onpointerup = ev=>{
          if(ev.target.closest('.tab-menu-icon')) return;
          ev.preventDefault();
          ev.stopPropagation();
          activateTab(tab.dataset.docTab);
        };
      });
    }
    wireDocumentTabs();
    setTimeout(wireDocumentTabs,50);
    setTimeout(wireDocumentTabs,300);

    document.addEventListener('click', ev=>{
      const row=ev.target.closest('#docTableBody tr[data-doc-id]'); if(row){ loadDoc(row.dataset.docId); return; }
    });
    $('#docNew')?.addEventListener('click',newDoc);
    $('#docSave')?.addEventListener('click',saveDoc);
    $('#docDelete')?.addEventListener('click',archiveDoc);
    $('#docOpen')?.addEventListener('click',openFile);
    $('#docPrint')?.addEventListener('click',printDoc);
    $('#docPrintList')?.addEventListener('click',printDocumentList);
    $('#docExportCsv')?.addEventListener('click',exportCsv);
    $('#docResetFilter')?.addEventListener('click',resetFilters);
    $('#docSaveAssignments')?.addEventListener('click',saveAssignments);
    $('#docSaveReminder')?.addEventListener('click',saveReminder);
    $('#docMailSelected')?.addEventListener('click',mailDoc);
    $('#docPrintSelected')?.addEventListener('click',printDoc);
    $('#docCopyInfo')?.addEventListener('click',copyInfo);
    $('#docClearHistory')?.addEventListener('click',renderHistory);
    $('#memberAddDocument')?.addEventListener('click',addMemberDocument);
    $('#memberLinkDocument')?.addEventListener('click',()=>{ if(typeof window.showView==='function') window.showView('documents'); activateTab('docAssignTab'); });
    $('#memberPrintDocuments')?.addEventListener('click',()=>window.print());
    ['docSearch','docFilterCategory','docFilterStatus','docFilterYear','docFilterConfidentiality','docFilterReminder'].forEach(id=>$('#'+id)?.addEventListener('input',renderTable));
    $('#docDate')?.addEventListener('change',()=>{ const d=getVal('docDate'); if(d && !getVal('docYear')) setVal('docYear',String(new Date(d).getFullYear())); });
    $('#docFileInput')?.addEventListener('change',e=>{
      const f=e.target.files?.[0]; if(!f) return;
      setVal('docFileName',f.name);
      const doc=selectedDoc();
      if(doc){ doc.fileName=f.name; try{ doc.fileUrl=URL.createObjectURL(f); }catch{} save(); }
    });
    document.addEventListener('click', e=>{ if(e.target.closest('[data-member-tab="memberDocuments"]')) setTimeout(renderMemberDocuments,0); });
  }

  function init(){ ensureDocumentState(); fillCombos(); bind(); renderAll(); ensureDocumentNavIconSetting(); activateTab($('.document-tabs [data-doc-tab].active')?.dataset?.docTab || 'docListTab'); }
  window.DocumentsCore = { init, render:renderAll, newDoc, loadDoc, saveDoc, renderMemberDocuments };
  if(window.App && typeof App.registerInit==='function'){
    App.registerInit('documents-core', init);
    if(App._started) setTimeout(init, 0);
  } else document.addEventListener('DOMContentLoaded',init,{once:true});
})();
