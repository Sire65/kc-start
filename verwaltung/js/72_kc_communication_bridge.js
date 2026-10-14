/* KC Verwaltung -> zentraler KC Communicator: Versand, Postfach, Antworten und Protokoll */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const TOKEN_KEY='kc_manager_access_token';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
  let directory=null,threads=[],protocol=[],dialog=null,poll=0,previewSeq=0;

  function token(){return sessionStorage.getItem(TOKEN_KEY)||'';}
  async function invoke(body){
    const t=token(); if(!t)throw new Error('KC Cloud ist noch nicht angemeldet. Bitte zuerst die Supabase-Verbindung herstellen.');
    const r=await fetch(SUPA+'/functions/v1/kc-communication-inbox',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+t},body:JSON.stringify(body)});
    const out=await r.json().catch(()=>({}));
    if(!r.ok||out?.error)throw new Error(out?.error||('HTTP '+r.status));
    return out;
  }

  function activeMembers(){return (window.state?.members||[]).filter(m=>String(m.exitDate||'').trim()==='' && String(m.exitReason||'').toLowerCase()!=='verstorben' && String(m.memberType||'').toLowerCase()!=='ausgeschieden');}
  function memberDisplay(m){return ((m.firstName||'')+' '+(m.lastName||'')).trim()||m.memberNo||m.id||'Empfänger';}
  function selectedMemberIds(){return new Set(Array.from(document.querySelectorAll('#commMemberList input[type="checkbox"]:checked')).map(x=>String(x.value||'')).filter(x=>x&&x!=='__admin__'));}
  function localRecipients(){
    const type=$('commRecipientType')?.value||'members',group=$('commGroupSelect')?.value||'';
    if(type==='all')return activeMembers();
    if(type==='group')return activeMembers().filter(m=>norm(m.memberType)===norm(group));
    if(type==='committee')return activeMembers().filter(m=>(m.committees||[]).some(c=>norm(c)===norm(group)));
    const ids=selectedMemberIds();
    return activeMembers().filter(m=>ids.has(String(m.id)));
  }
  async function getDirectory(force=false){if(force)directory=null;if(directory)return directory;directory=await invoke({action:'directory'});return directory;}
  function mapRecipients(locals,people){
    const used=new Set(),mapped=[],resolved=[],missing=[];
    for(const m of locals){
      const email=norm(m.email),name=norm(((m.firstName||'')+' '+(m.lastName||'')).trim());
      let hits=email?people.filter(p=>norm(p.email)===email):[];
      if(hits.length!==1&&name)hits=people.filter(p=>norm(p.display_name)===name);
      if(hits.length===1&&!used.has(String(hits[0].person_id))){
        const p=hits[0];used.add(String(p.person_id));mapped.push(p.person_id);resolved.push({personId:p.person_id,name:p.display_name||memberDisplay(m),email:p.email||'',local:m});
      }else if(hits.length!==1)missing.push(memberDisplay(m));
    }
    return{mapped,resolved,missing};
  }
  function toastMsg(text,type='info'){if(typeof window.toast==='function')window.toast(text,type);else alert(text);}

  function ensureRecipientPreview(){
    let box=$('kcCommRecipientPreview');if(box)return box;
    const picker=document.querySelector('#communication .communication-member-picker');if(!picker)return null;
    box=document.createElement('div');box.id='kcCommRecipientPreview';box.style.cssText='margin:10px 0 0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;font-size:13px;';
    picker.insertAdjacentElement('afterend',box);return box;
  }
  function setSendState(ok,count=0){
    const b=$('commSave');if(!b)return;b.disabled=!ok;b.textContent=ok?(count===1?'Nachricht an 1 Empfänger senden':'Nachricht an '+count+' Empfänger senden'):'Nachricht speichern/senden';
  }
  async function refreshRecipientPreview(){
    const seq=++previewSeq,box=ensureRecipientPreview(),locals=localRecipients();
    if(!box)return;
    if(!locals.length){box.innerHTML='<strong>Empfängerprüfung:</strong> Bitte Empfänger auswählen.';setSendState(false);return;}
    if(!token()){box.innerHTML='<strong>Empfängerprüfung:</strong> Cloud-Verbindung noch nicht angemeldet.';setSendState(false);return;}
    box.innerHTML='<strong>Empfängerprüfung:</strong> wird geprüft …';setSendState(false);
    try{
      const d=await getDirectory(),map=mapRecipients(locals,d.people||[]);if(seq!==previewSeq)return;
      if(map.missing.length){box.innerHTML='<strong style="color:#a33">Nicht eindeutig im KC Communicator:</strong> '+esc(map.missing.join(', '));setSendState(false);return;}
      if(!map.resolved.length){box.innerHTML='<strong>Empfängerprüfung:</strong> kein gültiger Empfänger.';setSendState(false);return;}
      box.innerHTML='<strong>Tatsächliche Empfänger ('+map.resolved.length+'):</strong><div style="margin-top:5px">'+map.resolved.map(p=>'<div>✓ '+esc(p.name)+(p.email?' &lt;'+esc(p.email)+'&gt;':' <span style="color:#a33">(keine E-Mail hinterlegt)</span>')+'</div>').join('')+'</div>';
      const hasText=!!(($('commSubject')?.value||'').trim()||($('commBody')?.value||'').trim());setSendState(hasText,map.resolved.length);
    }catch(e){if(seq!==previewSeq)return;box.innerHTML='<strong style="color:#a33">Empfängerprüfung fehlgeschlagen:</strong> '+esc(e.message||e);setSendState(false);}
  }
  function clearAllSelections(){document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(cb=>{cb.checked=false;});const all=$('commSelectAll');if(all){all.checked=false;all.indeterminate=false;}}
  function selectAllMembers(select){
    const search=$('commMemberSearch');if(search&&search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
    setTimeout(()=>{
      document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(cb=>{if(cb.value!=='__admin__')cb.checked=!!select;});
      const all=$('commSelectAll');if(all){all.checked=!!select;all.indeterminate=false;}
      refreshRecipientPreview();
    },0);
  }
  function syncAllBox(){
    const boxes=Array.from(document.querySelectorAll('#commMemberList input[type="checkbox"]')).filter(x=>x.value!=='__admin__'),all=$('commSelectAll');if(!all)return;
    const checked=boxes.filter(x=>x.checked).length;all.checked=boxes.length>0&&checked===boxes.length;all.indeterminate=checked>0&&checked<boxes.length;
  }
  function handleMemberChange(e){if(!e.target.matches('#commMemberList input[type="checkbox"]'))return;syncAllBox();refreshRecipientPreview();}

  function ensureTransferNotice(){let box=$('kcCommTransferNotice');if(box)return box;const host=$('commMessageList');if(!host?.parentElement)return null;box=document.createElement('div');box.id='kcCommTransferNotice';box.hidden=true;box.style.cssText='margin:12px 0;padding:12px 14px;border:1px solid #68a978;border-radius:10px;background:#eef9f0;color:#1f5130;font-weight:600;';host.parentElement.insertBefore(box,host);return box;}
  function showTransferConfirmation(resolved){
    const box=ensureTransferNotice();if(!box)return;const names=resolved.map(x=>x.name),who=names.length===1?names[0]:(names.length<=3?names.join(', '):names.slice(0,3).join(', ')+' und '+(names.length-3)+' weitere');
    box.innerHTML='✓ Ihre Nachricht an <strong>'+esc(who)+'</strong> wurde erfolgreich an den KC Communicator übergeben.<br><small style="font-weight:400">'+esc(new Date().toLocaleString('de-DE'))+' · Der weitere Versand über Push/E-Mail wird zentral protokolliert.</small>';box.hidden=false;
  }

  async function centralSend(ev){
    ev.preventDefault();ev.stopImmediatePropagation();
    const subject=($('commSubject')?.value||'').trim(),message=($('commBody')?.value||'').trim(),locals=localRecipients();
    if(!locals.length){toastMsg('Bitte mindestens einen Empfänger auswählen.','warn');await refreshRecipientPreview();return;}
    if(!subject&&!message)return toastMsg('Bitte Betreff oder Nachricht eingeben.','warn');
    const btn=$('commSave');if(btn)btn.disabled=true;
    try{
      const d=await getDirectory(true),map=mapRecipients(locals,d.people||[]);
      if(map.missing.length)throw new Error('Nicht eindeutig im KC Communicator gefunden: '+map.missing.join(', '));
      if(!map.mapped.length)throw new Error('Kein gültiger Empfänger ausgewählt.');
      const exact=map.resolved.map(p=>p.name+(p.email?' <'+p.email+'>':''));
      if(!window.confirm('Nachricht jetzt über KC Communicator senden an:\n\n'+exact.join('\n')+'\n\nFortfahren?')){await refreshRecipientPreview();return;}
      const out=await invoke({action:'send',subject:subject||'(ohne Betreff)',message:message||'(ohne Nachrichtentext)',recipientPersonIds:map.mapped});
      showTransferConfirmation(map.resolved);toastMsg('Nachricht erfolgreich an KC Communicator übergeben.','success');
      if($('commSubject'))$('commSubject').value='';if($('commBody'))$('commBody').value='';clearAllSelections();await refreshInbox(true,true);await refreshRecipientPreview();return out;
    }catch(e){toastMsg('KC Communicator: '+(e.message||e),'error');await refreshRecipientPreview();}
    finally{if(btn&&!btn.disabled){}else await refreshRecipientPreview();}
  }

  function ensureDialog(){if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='kcCentralInboxDialog';dialog.style.cssText='width:min(900px,94vw);max-height:88vh;border:1px solid #637080;border-radius:14px;padding:0;background:#f8fafb;color:#1f2937;';dialog.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 18px;border-bottom:1px solid #d6dde4"><div><strong>KC Communicator · Postfach</strong><div id="kcCentralInboxMeta" style="font-size:12px;color:#667085"></div></div><button id="kcCentralInboxClose" type="button" style="font-size:20px">×</button></div><div id="kcCentralInboxBody" style="padding:16px;overflow:auto;max-height:70vh"></div>';document.body.appendChild(dialog);$('kcCentralInboxClose').onclick=()=>dialog.close();return dialog;}
  async function openThread(id){try{const out=await invoke({action:'thread',threadId:id}),d=ensureDialog(),body=$('kcCentralInboxBody');$('kcCentralInboxMeta').textContent=out.thread?.subject||'';body.innerHTML='<div style="display:grid;gap:10px">'+(out.messages||[]).map(m=>'<article style="border:1px solid #d8dee6;border-radius:10px;padding:10px;background:#fff"><strong>'+esc(m.senderName)+'</strong><small style="float:right;color:#667085">'+esc(new Date(m.created_at).toLocaleString('de-DE'))+'</small><p style="white-space:pre-wrap;margin:8px 0 0">'+esc(m.body)+'</p></article>').join('')+'</div><div style="margin-top:16px"><label><strong>Antwort</strong><textarea id="kcCentralReply" rows="4" style="width:100%;box-sizing:border-box;margin-top:6px" placeholder="Antwort schreiben …"></textarea></label><button id="kcCentralReplySend" type="button" class="primary" style="margin-top:8px">Antwort über KC Communicator senden</button></div>';$('kcCentralReplySend').onclick=async()=>{const msg=$('kcCentralReply').value.trim();if(!msg)return;const b=$('kcCentralReplySend');b.disabled=true;try{await invoke({action:'reply',threadId:id,message:msg});await openThread(id);await refreshInbox(true,true);toastMsg('Antwort versendet.','success');}catch(e){toastMsg('Antwort fehlgeschlagen: '+e.message,'error');}finally{b.disabled=false;}};d.showModal();await refreshInbox(true,true);}catch(e){toastMsg('Postfach: '+e.message,'error');}}
  async function deleteProtocolMessage(messageId){if(!window.confirm('Diesen Protokolleintrag aus Ihrer KC-Verwaltung löschen?\n\nDas zentrale Kommunikations-/Auditprotokoll bleibt erhalten.'))return;try{await invoke({action:'hide_message',messageId});await refreshInbox(true,true);toastMsg('Protokolleintrag aus Ihrer Ansicht entfernt.','success');}catch(e){toastMsg('Protokolleintrag konnte nicht entfernt werden: '+e.message,'error');}}
  function renderProtocol(){const host=$('commMessageList');if(!host)return;if(!protocol.length){host.innerHTML='<div class="table-headline"><h4>Kommunikationsprotokoll</h4></div><p class="hint">Noch keine zentral gesendeten oder empfangenen Nachrichten vorhanden.</p>';return;}host.innerHTML='<div class="table-headline"><h4>Kommunikationsprotokoll</h4><span class="hint">Zentrale Ein- und Ausgänge</span></div><div class="table-wrap compact-table"><table><thead><tr><th>Datum / Zeit</th><th>Richtung</th><th>Absender / Empfänger</th><th>Betreff</th><th>Status</th><th></th></tr></thead><tbody>'+protocol.map(p=>'<tr data-kc-thread="'+esc(p.threadId)+'"><td>'+esc(new Date(p.createdAt).toLocaleString('de-DE'))+'</td><td><strong>'+(p.direction==='out'?'↗ Ausgang':'↙ Eingang')+'</strong></td><td>'+esc(p.person||'–')+'</td><td>'+esc(p.subject||'(ohne Betreff)')+'</td><td>'+esc(p.status||'–')+'</td><td><button type="button" class="secondary kc-protocol-delete" data-message-id="'+esc(p.id)+'" title="Nur aus diesem Protokoll löschen">🗑️</button></td></tr>').join('')+'</tbody></table></div>';host.querySelectorAll('tr[data-kc-thread]').forEach(row=>row.addEventListener('dblclick',e=>{if(!e.target.closest('button'))openThread(row.dataset.kcThread);}));host.querySelectorAll('.kc-protocol-delete').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteProtocolMessage(b.dataset.messageId);}));}
  // 54.8.21 (14.10.2026, Notbetrieb der Club-App): refreshInbox wurde bei jedem Neuzeichnen und jeder Postfach-Anzeige
  // aufgerufen – ~25 Abfragen/Min. je offenem Fenster (jede mit ~12 Datenbankabfragen). Jetzt: automatische Abfragen höchstens
  // alle 60 s, nie im Hintergrund, nie zwei gleichzeitig. Antippen „Aktualisieren“/Postfach öffnen und nach Senden/Löschen sofort.
  let inboxLaeuft=null,inboxZuletzt=0;const INBOX_ABSTAND_MS=60000;
  function refreshInbox(silent=false,sofort=false){
    if(silent&&!sofort){if(document.hidden)return Promise.resolve();if(inboxLaeuft)return inboxLaeuft;if(Date.now()-inboxZuletzt<INBOX_ABSTAND_MS)return Promise.resolve();}
    if(inboxLaeuft&&silent)return inboxLaeuft;
    inboxZuletzt=Date.now();
    inboxLaeuft=refreshInboxJetzt(silent).finally(()=>{inboxLaeuft=null;});
    return inboxLaeuft;
  }
  async function refreshInboxJetzt(silent=false){if(!token()){if(!silent)toastMsg('Für das zentrale Postfach bitte zuerst Cloud verbinden.','info');return;}try{const out=await invoke({action:'list'});threads=out.threads||[];protocol=out.protocol||[];renderProtocol();const btn=$('mailInboxBtn'),badge=$('mailInboxBadge'),n=Number(out.unread||0);if(btn)btn.classList.remove('hidden');if(badge){badge.textContent=String(n);badge.classList.toggle('hidden',n<=0);}const office=$('secretaryMailBadge');if(office)office.textContent=String(n);}catch(e){if(!silent)toastMsg('KC Communicator: '+e.message,'error');}}
  function openInbox(ev){ev?.preventDefault();ev?.stopImmediatePropagation();refreshInbox(false).then(()=>{const d=ensureDialog(),body=$('kcCentralInboxBody');$('kcCentralInboxMeta').textContent='Zentrale Unterhaltungen';body.innerHTML=threads.length?threads.map(t=>'<button type="button" data-open-thread="'+esc(t.id)+'" style="display:block;width:100%;text-align:left;padding:12px;margin:0 0 8px;border:1px solid #d8dee6;border-radius:10px;background:#fff"><strong>'+esc(t.subject)+'</strong>'+(t.unread?' <span>'+t.unread+' neu</span>':'')+'<br><small>'+esc(t.latest?.senderName||'')+' · '+esc(t.latest?.body||'').slice(0,140)+'</small></button>').join(''):'<p>Keine Nachrichten.</p>';body.querySelectorAll('[data-open-thread]').forEach(b=>b.onclick=()=>openThread(b.dataset.openThread));d.showModal();});}

  function takeAuthority(){const localRender=window.renderCommunication;if(typeof localRender==='function'&&!localRender.__kcCentralWrapped){const wrapped=function(){const r=localRender.apply(this,arguments);setTimeout(()=>{syncAllBox();refreshRecipientPreview();refreshInbox(true);},0);return r;};wrapped.__kcCentralWrapped=true;window.renderCommunication=wrapped;}const localIndicator=window.updateInboxIndicator;if(typeof localIndicator==='function'&&!localIndicator.__kcCentralWrapped){const wrapped=function(){const r=localIndicator.apply(this,arguments);setTimeout(()=>refreshInbox(true),0);return r;};wrapped.__kcCentralWrapped=true;window.updateInboxIndicator=wrapped;}}
  function bind(){
    takeAuthority();ensureTransferNotice();ensureRecipientPreview();
    const hint=document.querySelector('#communication .table-headline .hint');if(hint)hint.textContent='Zentral über KC Communicator · Push/E-Mail · Antworten im Postfach';
    const save=$('commSave');if(save){save.addEventListener('click',centralSend,true);save.disabled=true;}
    const all=$('commSelectAll');if(all)all.addEventListener('change',e=>{e.preventDefault();e.stopImmediatePropagation();selectAllMembers(e.target.checked);},true);
    const list=$('commMemberList');if(list)list.addEventListener('change',handleMemberChange,true);
    ['commRecipientType','commGroupSelect','commDistributionSelect'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(refreshRecipientPreview,0),true));
    $('commMemberSearch')?.addEventListener('input',()=>setTimeout(()=>{syncAllBox();refreshRecipientPreview();},0));
    ['commSubject','commBody'].forEach(id=>$(id)?.addEventListener('input',refreshRecipientPreview));
    const refresh=$('commRefresh');if(refresh)refresh.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();refreshInbox(false);},true);
    const inbox=$('mailInboxBtn');if(inbox)inbox.addEventListener('click',openInbox,true);
    syncAllBox();refreshRecipientPreview();refreshInbox(true);clearInterval(poll);poll=setInterval(()=>refreshInbox(true),60000);if(!window.__kcInboxSichtbar){window.__kcInboxSichtbar=true;document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshInbox(true);});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
  window.KCCentralInbox={refresh:refreshInbox,open:openInbox,refreshRecipients:refreshRecipientPreview};
})();
