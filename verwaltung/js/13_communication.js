/* Phase 9.9 – Kommunikationsmodul */
(function(){
  function ensureComm(){ if(!Array.isArray(state.communications)) state.communications=[]; }
  function activeMembers(){ return (state.members||[]).filter(m=>String(m.exitDate||"").trim()==="" && memberStatus(m)!=="Ausgeschieden"); }
  const ADMIN_RECIPIENT_ID="__admin__";
  function adminRecipient(){
    return {id:ADMIN_RECIPIENT_ID, memberNo:"ADMIN", firstName:"", lastName:"Admin", city:"", memberType:"Admin", isAdminRecipient:true, email:state.settings.systemOwnerEmail||""};
  }
  function communicationRecipients(){
    return [adminRecipient(), ...activeMembers()];
  }
  function recipientNameById(id){
    if(id===ADMIN_RECIPIENT_ID) return "Admin";
    const m=(state.members||[]).find(x=>x.id===id);
    return m ? memberName(m) : (id||"");
  }
  function memberName(m){ return m?.isAdminRecipient ? "Admin" : `${m.lastName||""}, ${m.firstName||""}`.trim().replace(/^,\s*/,""); }
  function selectedIds(){ return Array.from(document.querySelectorAll('#commMemberList input[type="checkbox"]:checked')).map(cb=>cb.value); }
  function escape(s){ return typeof escapeHtml==="function" ? escapeHtml(s) : String(s??"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  const TEMPLATE_TEXTS={
    "Einladung":{subject:"Einladung",body:`Liebe Mitglieder,\n\nhiermit laden wir euch herzlich ein.\n\nMit kulinarischen Grüßen`},
    "Rundschreiben":{subject:"Rundschreiben Köcheclub",body:`Liebe Mitglieder,\n\nfolgende Informationen möchten wir euch mitteilen:\n\n`},
    "Geburtstagsgruß":{subject:"Herzlichen Glückwunsch",body:`Liebe/r ...,\n\nwir gratulieren herzlich zum Geburtstag und wünschen alles Gute.\n\nDer Köcheclub`},
    "Erinnerung":{subject:"Erinnerung",body:`Liebe Mitglieder,\n\nkurze Erinnerung an den anstehenden Termin.\n\n`},
    "Jubiläum":{subject:"Jubiläum",body:`Liebe/r ...,\n\nherzlichen Glückwunsch zum Jubiläum.\n\n`},
    "Dienstplan-Info":{subject:"Information zum Dienstplan",body:`Liebe Mitglieder,\n\nhier kommen wichtige Informationen zum Dienstplan:\n\n`},
    "Bitte um Rückmeldung":{subject:"Bitte um Rückmeldung",body:`Liebe Mitglieder,\n\nbitte gebt uns hierzu eine kurze Rückmeldung.\n\n`}
  };
  function renderCommTemplates(){
    const sel=document.getElementById('commTemplateSelect');
    if(!sel) return;
    const cur=sel.value||'';
    const items=(state.combos?.communicationTemplates||[]).filter(Boolean);
    sel.innerHTML='<option value="">Freier Text</option>'+items.map(v=>`<option value="${escape(v)}">${escape(v)}</option>`).join('');
    sel.value=items.includes(cur)?cur:'';
  }
  function applyCommTemplate(name){
    const tpl=TEMPLATE_TEXTS[name]; if(!tpl) return;
    const subject=document.getElementById('commSubject');
    const body=document.getElementById('commBody');
    if(subject && !subject.value.trim()) subject.value=tpl.subject;
    if(body && !body.value.trim()) body.value=tpl.body;
  }
  function applyDistribution(value){
    const type=document.getElementById('commRecipientType');
    const search=document.getElementById('commMemberSearch');
    if(!type) return;
    if(value==='all'){ type.value='all'; }
    else if(value==='board'){
      type.value='members';
      if(search) search.value='Vorstand';
    } else if(value==='special'){
      type.value='members';
      if(search) search.value='Meister';
    } else if(value==='birthday'){
      type.value='members';
      if(search) search.value='';
      toast?.('Geburtstagsfilter ist vorbereitet; bitte Mitglieder in der Liste auswählen.','info');
    } else type.value='members';
    renderCommGroups(); renderCommMembers();
  }
  window.renderCommunication=function(){
    ensureComm();
    renderCommTemplates();
    renderCommGroups();
    renderCommMembers();
    renderCommMessages();
  };
  function renderCommGroups(){
    const type=document.getElementById("commRecipientType")?.value||"members";
    const sel=document.getElementById("commGroupSelect"); if(!sel) return;
    let opts=[""];
    /* Gast und Aushilfe sind eigene Verteilergruppen. Ohne sie steckten beide unsichtbar
       in der Gruppe "Aktiv" und bekaemen jede Mitgliederpost mit. */
    if(type==="group") opts=["Aktiv","Passiv","Ehrenmitglied","Gast","Aushilfe"];
    if(type==="committee"){
      const set=new Set();
      (state.members||[]).forEach(m=>(m.committees||[]).forEach(c=>c&&set.add(c)));
      opts=["",...Array.from(set).sort()];
    }
    sel.innerHTML=opts.map(o=>`<option>${escape(o)}</option>`).join("");
    sel.parentElement.style.display=["group","committee"].includes(type)?"block":"none";
  }
  function recipientsByRule(){
    const type=document.getElementById("commRecipientType")?.value||"members";
    const group=document.getElementById("commGroupSelect")?.value||"";
    let arr=activeMembers();
    if(type==="all") return [ADMIN_RECIPIENT_ID, ...arr.map(m=>m.id)];
    if(type==="group") return arr.filter(m=>memberStatus(m)===group).map(m=>m.id);
    if(type==="committee") return arr.filter(m=>(m.committees||[]).includes(group)).map(m=>m.id);
    return selectedIds();
  }
  function renderCommMembers(){
    const box=document.getElementById("commMemberList"); if(!box) return;
    const q=(document.getElementById("commMemberSearch")?.value||"").toLowerCase();
    const type=document.getElementById("commRecipientType")?.value||"members";
    const ids=new Set(selectedIds());
    box.parentElement.style.display=type==="members"?"block":"none";
    const rows=communicationRecipients().filter(m=>!q || `${m.memberNo} ${m.firstName} ${m.lastName} ${m.city} ${m.memberType||""}`.toLowerCase().includes(q));
    box.innerHTML=rows.map(m=>`<label class="comm-member-row ${m.isAdminRecipient?"comm-admin-row":""}"><input type="checkbox" value="${escape(m.id)}" ${ids.has(m.id)?"checked":""}> <span>${escape(m.memberNo||"")}</span><strong>${escape(memberName(m))}</strong><small>${escape(m.isAdminRecipient?"Admin":memberStatus(m))}</small></label>`).join("");
  }
  function renderCommMessages(){
    const box=document.getElementById("commMessageList"); if(!box) return;
    ensureComm();
    if(!state.communications.length){ box.innerHTML='<p class="hint">Noch keine Nachrichten vorhanden.</p>'; return; }
    box.innerHTML=state.communications.slice().reverse().map(msg=>{
      const rec=(msg.recipients||[]).map(r=>{
        const m=(state.members||[]).find(x=>x.id===r.id);
        return `<tr><td>${escape(r.id===ADMIN_RECIPIENT_ID?"Admin":(m?memberName(m):r.name||r.id))}</td><td>${r.readAt?escape(formatDateTime(r.readAt)):"nicht gelesen"}</td><td><button class="secondary comm-read" data-msg="${escape(msg.id)}" data-member="${escape(r.id)}" type="button">als gelesen markieren</button></td></tr>`;
      }).join("");
      return `<article class="comm-message"><h4>${escape(msg.subject||"(ohne Betreff)")} <span class="badge">${escape(msg.priority||"Normal")}</span></h4><p>${escape(msg.body||"").replace(/\n/g,"<br>")}</p><small>${escape(msg.type||"Allgemein")} · ${escape(formatDateTime(msg.createdAt))}</small><table><thead><tr><th>Empfänger</th><th>Gelesen</th><th></th></tr></thead><tbody>${rec}</tbody></table></article>`;
    }).join("");
    box.querySelectorAll(".comm-read").forEach(btn=>btn.addEventListener("click",()=>{
      const msg=state.communications.find(x=>x.id===btn.dataset.msg); const r=msg?.recipients?.find(x=>x.id===btn.dataset.member);
      if(r){ r.readAt=new Date().toISOString(); saveState(); renderCommMessages(); }
    }));
  }
  function newComm(){
    ["commSubject","commBody","commMemberSearch"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
    document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(cb=>cb.checked=false);
  }
  function saveComm(){
    ensureComm();
    const ids=recipientsByRule();
    const subject=document.getElementById("commSubject")?.value||"";
    const body=document.getElementById("commBody")?.value||"";
    if(!ids.length){ toast?.("Bitte mindestens einen Empfänger auswählen.","warn"); return; }
    if(!subject.trim() && !body.trim()){ toast?.("Bitte Betreff oder Nachricht eingeben.","warn"); return; }
    const msg={id:"comm_"+Date.now(),createdAt:new Date().toISOString(),createdBy:state.session.userName,priority:document.getElementById("commPriority")?.value||"Normal",type:document.getElementById("commType")?.value||"Allgemein",subject,body,recipients:ids.map(id=>({id,readAt:""}))};
    state.communications.push(msg); saveState(); renderCommMessages(); toast?.("Nachricht gespeichert.","success");
  }
  function pinComm(){
    const subject=document.getElementById("commSubject")?.value||"";
    const body=document.getElementById("commBody")?.value||"";
    state.ui=state.ui||{}; state.ui.pinboardEnabled=true; state.ui.pinboardText=[subject,body].filter(Boolean).join("\n\n"); saveState();
    document.getElementById("pinboardToggle") && (document.getElementById("pinboardToggle").checked=true);
    if(typeof toast==="function") toast("Nachricht an Pinnwand angeheftet.","success");
    document.getElementById("pinboardText") && (document.getElementById("pinboardText").value=state.ui.pinboardText);
    document.getElementById("pinboardWidget")?.classList.remove("hidden");
  }
  function printComm(){ const subject=document.getElementById("commSubject")?.value||"Nachricht"; const body=document.getElementById("commBody")?.value||""; printHtml?.(subject,`<h1>${escape(subject)}</h1><p>${escape(body).replace(/\n/g,"<br>")}</p>`); }
  function bind(){
    document.getElementById("commTemplateSelect")?.addEventListener("change",e=>applyCommTemplate(e.target.value));
    document.getElementById("commDistributionSelect")?.addEventListener("change",e=>applyDistribution(e.target.value));
    document.getElementById("commRecipientType")?.addEventListener("change",()=>{renderCommGroups();renderCommMembers();});
    document.getElementById("commGroupSelect")?.addEventListener("change",renderCommMembers);
    document.getElementById("commMemberSearch")?.addEventListener("input",renderCommMembers);
    document.getElementById("commSelectAll")?.addEventListener("change",e=>{ document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(cb=>cb.checked=e.target.checked); });
    document.getElementById("commNew")?.addEventListener("click",newComm);
    document.getElementById("commSave")?.addEventListener("click",saveComm);
    document.getElementById("commPin")?.addEventListener("click",pinComm);
    document.getElementById("commPrint")?.addEventListener("click",printComm);
    document.getElementById("commRefresh")?.addEventListener("click",renderCommunication);
  }
  kngReadyOnce('communication-bind-render', ()=>{bind(); renderCommunication();});
})();

/* Phase 9.9 – Nachrichtenhinweis nach Login / Postfach */
(function(){
  function ensureComm(){ if(!Array.isArray(state.communications)) state.communications=[]; }
  function esc(s){ return typeof escapeHtml==='function' ? escapeHtml(s) : String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function currentMemberId(){
    const key=String(state.session?.userKey||'').trim().toLowerCase();
    if(!key) return '';
    if(key==='admin' || state.session?.role==='Admin' || state.session?.role==='Systeminhaber') return '__admin__';
    const a=(state.roleAssignments||[]).find(x=>String(x.userName||'').trim().toLowerCase()===key);
    return a?.memberId || '';
  }
  function memberNameById(id){
    if(id==='__admin__') return 'Admin';
    const m=(state.members||[]).find(x=>x.id===id);
    if(!m) return id || '';
    return `${m.firstName||''} ${m.lastName||''}`.trim() || m.memberNo || id;
  }
  function myMessages(){
    ensureComm();
    const mid=currentMemberId();
    if(!mid) return [];
    return state.communications.filter(msg=>(msg.recipients||[]).some(r=>r.id===mid));
  }
  function unreadCount(){
    const mid=currentMemberId();
    if(!mid) return 0;
    return myMessages().filter(msg=>{
      const r=(msg.recipients||[]).find(x=>x.id===mid);
      return r && !r.readAt;
    }).length;
  }
  window.updateInboxIndicator=function(showNotice){
    const btn=document.getElementById('mailInboxBtn');
    const badge=document.getElementById('mailInboxBadge');
    const count=state.session?.isLoggedIn ? unreadCount() : 0;
    if(btn) btn.classList.toggle('hidden',!state.session?.isLoggedIn || !currentMemberId());
    if(badge){ badge.textContent=String(count); badge.classList.toggle('hidden',count<=0); }
    if(count>0 && showNotice && typeof toast==='function') toast('Sie haben Post. Bitte Briefsymbol öffnen.','warn');
  };
  function markRead(msg){
    const mid=currentMemberId(); if(!mid || !msg) return;
    const r=(msg.recipients||[]).find(x=>x.id===mid);
    if(r && !r.readAt){ r.readAt=new Date().toISOString(); saveState(); }
  }
  function renderInbox(){
    const box=document.getElementById('mailInboxList'); if(!box) return;
    if(!state.session?.isLoggedIn){ box.innerHTML='<p class="hint">Bitte zuerst anmelden.</p>'; return; }
    const msgs=myMessages().slice().reverse();
    if(!msgs.length){ box.innerHTML='<p class="hint">Keine Nachrichten vorhanden.</p>'; return; }
    const mid=currentMemberId();
    box.innerHTML=msgs.map(msg=>{
      const r=(msg.recipients||[]).find(x=>x.id===mid) || {};
      const unread=!r.readAt;
      const replies=(msg.replies||[]).map(rep=>`<div class="mail-reply"><strong>${esc(rep.from||'Antwort')}:</strong> ${esc(rep.text||'').replace(/\n/g,'<br>')}<br><small>${esc(typeof formatDateTime==='function'?formatDateTime(rep.createdAt):rep.createdAt)}</small></div>`).join('');
      return `<article class="mail-card ${unread?'unread':''}" data-id="${esc(msg.id)}">
        <div class="mail-card-head"><h4>${unread?'📩':'✉️'} ${esc(msg.subject||'(ohne Betreff)')}</h4><span>${esc(msg.priority||'Normal')}</span></div>
        <p>${esc(msg.body||'').replace(/\n/g,'<br>')}</p>
        <small>Von: ${esc(msg.createdBy||'')} · ${esc(typeof formatDateTime==='function'?formatDateTime(msg.createdAt):msg.createdAt)} · ${r.readAt?'gelesen am '+esc(typeof formatDateTime==='function'?formatDateTime(r.readAt):r.readAt):'ungelesen'}</small>
        ${replies?`<div class="mail-replies">${replies}</div>`:''}
        <div class="button-row compact-actions">
          <button class="secondary mail-mark-read" type="button" data-id="${esc(msg.id)}">Als gelesen</button>
          <button class="primary mail-reply-btn" type="button" data-id="${esc(msg.id)}">Antworten</button>
          <button class="danger mail-delete-btn" type="button" data-id="${esc(msg.id)}">Löschen</button>
        </div>
      </article>`;
    }).join('');
    box.querySelectorAll('.mail-mark-read').forEach(b=>b.addEventListener('click',()=>{ const msg=state.communications.find(x=>x.id===b.dataset.id); markRead(msg); renderInbox(); window.updateInboxIndicator?.(false); }));
    box.querySelectorAll('.mail-delete-btn').forEach(b=>b.addEventListener('click',()=>{
      if(!confirm('Diese Nachricht aus Ihrem Postfach löschen?')) return;
      const mid=currentMemberId(); const msg=state.communications.find(x=>x.id===b.dataset.id); if(!msg) return;
      msg.recipients=(msg.recipients||[]).filter(r=>r.id!==mid);
      if(!(msg.recipients||[]).length && !isAdminLike?.()) state.communications=state.communications.filter(x=>x.id!==msg.id);
      saveState(); renderInbox(); window.updateInboxIndicator?.(false);
    }));
    box.querySelectorAll('.mail-reply-btn').forEach(b=>b.addEventListener('click',()=>openReply(b.dataset.id)));
  }
  let replyMsgId='';
  function openReply(id){
    replyMsgId=id;
    const msg=state.communications.find(x=>x.id===id);
    markRead(msg);
    const info=document.getElementById('mailReplyInfo'); if(info) info.textContent=`Antwort auf: ${msg?.subject||'(ohne Betreff)'}`;
    const txt=document.getElementById('mailReplyText'); if(txt) txt.value='';
    const dlg=document.getElementById('mailReplyDialog'); if(dlg?.showModal) dlg.showModal();
    renderInbox(); window.updateInboxIndicator?.(false);
  }
  function sendReply(){
    const msg=state.communications.find(x=>x.id===replyMsgId);
    const txt=document.getElementById('mailReplyText');
    const text=String(txt?.value||'').trim();
    if(!msg || !text){ toast?.('Bitte Antworttext eingeben.','warn'); return; }
    msg.replies=Array.isArray(msg.replies)?msg.replies:[];
    msg.replies.push({from:state.session.userName||memberNameById(currentMemberId()),fromId:currentMemberId(),text,createdAt:new Date().toISOString()});
    saveState(); document.getElementById('mailReplyDialog')?.close(); renderInbox(); toast?.('Antwort gespeichert.','success');
  }
  function openInbox(){
    const msgs=myMessages();
    msgs.forEach(markRead);
    saveState();
    window.updateInboxIndicator?.(false);
    if(typeof window.showView === 'function'){
      window.showView('communication');
      if(typeof renderCommunication === 'function') renderCommunication();
      toast?.('Kommunikationsmodul geöffnet.','info');
      return;
    }
    renderInbox();
    document.getElementById('mailInboxDialog')?.showModal?.();
  }
  function bindInbox(){
    const btn=document.getElementById('mailInboxBtn'); if(btn && !btn.dataset.bound){ btn.dataset.bound='1'; btn.addEventListener('click',openInbox); }
    const ref=document.getElementById('mailInboxRefresh'); if(ref && !ref.dataset.bound){ ref.dataset.bound='1'; ref.addEventListener('click',renderInbox); }
    const send=document.getElementById('mailReplySend'); if(send && !send.dataset.bound){ send.dataset.bound='1'; send.addEventListener('click',sendReply); }
  }
  const oldApply=window.applySession;
  if(typeof oldApply==='function') window.applySession=function(){ const r=oldApply.apply(this,arguments); window.updateInboxIndicator?.(false); return r; };
  const oldDo=window.doLogin;
  if(typeof oldDo==='function') window.doLogin=function(){ const before=!!state.session?.isLoggedIn; const r=oldDo.apply(this,arguments); if(!before && state.session?.isLoggedIn){ setTimeout(()=>window.updateInboxIndicator?.(true),250); } return r; };
  kngReadyOnce('communication-inbox-bind', ()=>{ bindInbox(); window.updateInboxIndicator?.(false); });
  bindInbox();
})();
