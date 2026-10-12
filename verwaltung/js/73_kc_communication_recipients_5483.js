/* KC Verwaltung 54.8.3 – übersichtliche Empfängerquellen + sicherer Communicator-Versand */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const TOKEN_KEY='kc_manager_access_token';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  let directory=null,external=[],addressDialog=null,cloudDialog=null,checking=false,lastResolved={members:[],missing:[]};

  function token(){return sessionStorage.getItem(TOKEN_KEY)||'';}
  function toastMsg(text,type='info'){if(typeof window.toast==='function')window.toast(text,type);else alert(text);}
  async function invoke(path,body){
    const t=token();if(!t)throw new Error('Cloud-Verbindung noch nicht angemeldet.');
    const r=await fetch(SUPA+'/functions/v1/'+path,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+t},body:JSON.stringify(body)});
    const out=await r.json().catch(()=>({}));if(!r.ok||out?.error)throw new Error(out?.error||('HTTP '+r.status));return out;
  }
  function activeMembers(){return (window.state?.members||[]).filter(m=>String(m.exitDate||'').trim()===''&&String(m.exitReason||'').toLowerCase()!=='verstorben'&&String(m.memberType||'').toLowerCase()!=='ausgeschieden');}
  function memberName(m){return ((m.firstName||'')+' '+(m.lastName||'')).trim()||m.memberNo||m.id||'Mitglied';}
  function selectedMemberRows(){
    const type=$('commRecipientType')?.value||'members',group=$('commGroupSelect')?.value||'';
    if(type==='all')return activeMembers();
    if(type==='group')return activeMembers().filter(m=>String(m.memberType||'')===group);
    if(type==='committee')return activeMembers().filter(m=>(m.committees||[]).includes(group));
    const ids=new Set(Array.from(document.querySelectorAll('#commMemberList input[type="checkbox"]:checked')).map(x=>x.value).filter(x=>x!=='__admin__'));
    return activeMembers().filter(m=>ids.has(m.id));
  }
  async function getDirectory(force=false){if(force)directory=null;if(directory)return directory;directory=await invoke('kc-communication-inbox',{action:'directory'});return directory;}
  function mapMembers(locals,people){
    const used=new Set(),mapped=[],missing=[];
    for(const m of locals){
      const email=norm(m.email),name=norm(memberName(m));let hits=email?people.filter(p=>norm(p.email)===email):[];
      if(hits.length!==1&&name)hits=people.filter(p=>norm(p.display_name)===name);
      if(hits.length===1&&!used.has(hits[0].person_id)){used.add(hits[0].person_id);mapped.push({personId:hits[0].person_id,name:memberName(m),email:hits[0].email||m.email||'',source:'Mitglied'});}else if(hits.length!==1)missing.push(memberName(m));
    }
    return{mapped,missing};
  }
  function addExternal(item){
    const email=String(item.email||'').trim().toLowerCase();if(!validEmail(email))return false;
    if(external.some(x=>norm(x.email)===norm(email)))return true;
    external.push({email,displayName:String(item.displayName||email).trim(),source:item.source==='address'?'address':'manual',sourceRef:String(item.sourceRef||'')});return true;
  }
  function removeExternal(email){external=external.filter(x=>norm(x.email)!==norm(email));renderRecipientSummary();}

  function injectUi(){
    if($('kcRecipientTools'))return;
    const picker=document.querySelector('#communication .communication-member-picker');if(!picker)return;
    const box=document.createElement('section');box.id='kcRecipientTools';box.style.cssText='margin:12px 0;padding:12px;border:1px solid #d8dee6;border-radius:12px;background:#fbfcfd';
    box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><strong>Weitere Empfänger</strong><div style="font-size:12px;color:#667085">Adressmodul oder einzelne E-Mail-Adresse</div></div><button id="kcAddressPick" type="button" class="secondary">📒 Aus Adressmodul wählen</button></div><div style="display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:8px;margin-top:10px"><input id="kcManualEmail" type="email" placeholder="E-Mail-Adresse manuell eingeben"><button id="kcManualAdd" type="button" class="secondary">＋ Hinzufügen</button></div><div id="kcRecipientSummary" style="margin-top:12px"></div><div id="kcCommCloudState" style="margin-top:10px"></div>';
    picker.insertAdjacentElement('afterend',box);
    $('kcAddressPick').onclick=openAddressDialog;$('kcManualAdd').onclick=addManual;$('kcManualEmail').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addManual();}});
  }
  function addManual(){const input=$('kcManualEmail'),email=input?.value.trim()||'';if(!validEmail(email))return toastMsg('Bitte eine gültige E-Mail-Adresse eingeben.','warn');addExternal({email,displayName:email,source:'manual'});if(input)input.value='';renderRecipientSummary();}

  function addressRows(){return Array.isArray(window.state?.addresses)?state.addresses:[];}
  function addressLabel(a){return String(a.company||'').trim()||[a.firstName,a.lastName].filter(Boolean).join(' ').trim()||String(a.contactPerson||'').trim()||a.no||'Adresse';}
  function ensureAddressDialog(){
    if(addressDialog)return addressDialog;
    addressDialog=document.createElement('dialog');addressDialog.id='kcCommAddressDialog';addressDialog.style.cssText='width:min(920px,94vw);max-height:88vh;border:1px solid #8994a3;border-radius:14px;padding:0;background:#f8fafb;color:#1f2937';
    addressDialog.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #d8dee6"><div><strong>Adressmodul · E-Mail auswählen</strong><div style="font-size:12px;color:#667085">Live-Suche und Filter</div></div><button id="kcAddrClose" type="button">×</button></div><div style="padding:14px 16px"><div style="display:grid;grid-template-columns:minmax(240px,2fr) minmax(150px,1fr) auto;gap:8px"><input id="kcAddrSearch" placeholder="Firma, Name, Ansprechpartner, Ort, Straße, E-Mail …"><select id="kcAddrCategory"><option value="">Alle Kategorien</option></select><label style="display:flex;align-items:center;gap:6px;white-space:nowrap"><input id="kcAddrOnlyMail" type="checkbox" checked> nur mit E-Mail</label></div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:10px 0"><span id="kcAddrCount" style="font-size:12px;color:#667085"></span><button id="kcAddrSelectFiltered" type="button" class="secondary">Alle gefilterten auswählen</button></div><div style="max-height:50vh;overflow:auto;border:1px solid #d8dee6;border-radius:10px;background:#fff"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:8px"></th><th style="text-align:left;padding:8px">Name / Firma</th><th style="text-align:left;padding:8px">Kategorie</th><th style="text-align:left;padding:8px">Ort</th><th style="text-align:left;padding:8px">E-Mail</th></tr></thead><tbody id="kcAddrRows"></tbody></table></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button id="kcAddrCancel" type="button" class="secondary">Abbrechen</button><button id="kcAddrTake" type="button" class="primary">Auswahl übernehmen</button></div></div>';
    document.body.appendChild(addressDialog);$('kcAddrClose').onclick=$('kcAddrCancel').onclick=()=>addressDialog.close();
    ['kcAddrSearch','kcAddrCategory','kcAddrOnlyMail'].forEach(id=>$(id).addEventListener(id==='kcAddrSearch'?'input':'change',renderAddressRows));
    $('kcAddrSelectFiltered').onclick=()=>{document.querySelectorAll('#kcAddrRows input[data-addr-check]').forEach(x=>x.checked=true);};$('kcAddrTake').onclick=takeAddresses;return addressDialog;
  }
  function openAddressDialog(){const d=ensureAddressDialog(),cats=[...new Set(addressRows().map(a=>String(a.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));$('kcAddrCategory').innerHTML='<option value="">Alle Kategorien</option>'+cats.map(c=>'<option>'+esc(c)+'</option>').join('');$('kcAddrSearch').value='';renderAddressRows();d.showModal();setTimeout(()=>$('kcAddrSearch')?.focus(),50);}
  function filteredAddresses(){const q=norm($('kcAddrSearch')?.value),cat=$('kcAddrCategory')?.value||'',only=$('kcAddrOnlyMail')?.checked;return addressRows().filter(a=>{const mails=[a.email1,a.email2].filter(validEmail);if(only&&!mails.length)return false;if(cat&&String(a.category||'')!==cat)return false;const hay=norm([a.company,a.firstName,a.lastName,a.contactPerson,a.city,a.street,a.zip,a.category,a.email1,a.email2].filter(Boolean).join(' '));return !q||hay.includes(q);});}
  function renderAddressRows(){const rows=filteredAddresses(),host=$('kcAddrRows');if(!host)return;$('kcAddrCount').textContent=rows.length+' von '+addressRows().length+' Adressen';host.innerHTML=rows.map(a=>{const mails=[a.email1,a.email2].filter(validEmail),disabled=!mails.length;return '<tr style="border-top:1px solid #edf0f3"><td style="padding:8px"><input data-addr-check="'+esc(a.id||a.no||'')+'" type="checkbox" '+(disabled?'disabled':'')+'></td><td style="padding:8px"><strong>'+esc(addressLabel(a))+'</strong>'+(a.contactPerson?'<br><small>'+esc(a.contactPerson)+'</small>':'')+'</td><td style="padding:8px">'+esc(a.category||'')+'</td><td style="padding:8px">'+esc(a.city||'')+'</td><td style="padding:8px">'+(mails.length?'<select data-addr-email="'+esc(a.id||a.no||'')+'">'+mails.map(m=>'<option value="'+esc(m)+'">'+esc(m)+'</option>').join('')+'</select>':'<span style="color:#a33">keine E-Mail</span>')+'</td></tr>';}).join('');}
  function takeAddresses(){const byKey=new Map(addressRows().map(a=>[String(a.id||a.no||''),a]));document.querySelectorAll('#kcAddrRows input[data-addr-check]:checked').forEach(ch=>{const key=String(ch.dataset.addrCheck||''),a=byKey.get(key),sel=document.querySelector('#kcAddrRows select[data-addr-email="'+CSS.escape(key)+'"]'),email=sel?.value||a?.email1||a?.email2||'';if(a&&validEmail(email))addExternal({email,displayName:addressLabel(a),source:'address',sourceRef:key});});addressDialog.close();renderRecipientSummary();}

  function localLoginEmail(){const key=norm(state?.session?.userKey||state?.session?.userName||'');const ra=(state?.roleAssignments||[]).find(x=>norm(x.userName)===key),m=ra?(state?.members||[]).find(x=>x.id===ra.memberId):null;return String(m?.email||'');}
  async function ensureSharedCloudSession(){
    if(token()) return true;
    try{
      const ready=await window.KCCloudSession?.ready?.();
      if(ready){await window.KNGCloudSync?.adoptSession?.();return !!token();}
    }catch(_e){}
    return false;
  }
  async function openCloud(){
    const ok=await ensureSharedCloudSession();
    if(!ok) toastMsg('Supabase-Sitzung ist nicht verfügbar. Die Cloud-Verbindung wird normalerweise automatisch mit der KC-Anmeldung hergestellt.','warn');
    renderCloudState();
  }
  async function connectCloud(){return await ensureSharedCloudSession();}
  function renderCloudState(){
    const host=$('kcCommCloudState');if(!host)return;
    if(token()) host.innerHTML='<div style="padding:8px 10px;border-radius:9px;background:#eef9f0;color:#245c34">● KC Communicator automatisch verbunden</div>';
    else host.innerHTML='<div style="padding:8px 10px;border-radius:9px;background:#fff6df;color:#795b13">● Cloud-Sitzung derzeit nicht verfügbar · keine separate Anmeldung erforderlich</div>';
  }

  async function renderRecipientSummary(){
    injectUi();renderCloudState();const host=$('kcRecipientSummary');if(!host)return;const locals=selectedMemberRows();let mapped=[],missing=[];
    if(token()&&!checking){checking=true;try{const d=await getDirectory();const m=mapMembers(locals,d.people||[]);mapped=m.mapped;missing=m.missing;lastResolved={members:mapped,missing};}catch(_){mapped=[];missing=locals.map(memberName);lastResolved={members:[],missing};}finally{checking=false;}}
    else if(!token()){lastResolved={members:[],missing:locals.map(memberName)};}
    else{mapped=lastResolved.members;missing=lastResolved.missing;}
    const memberView=token()?mapped:locals.map(m=>({name:memberName(m),email:m.email||'',source:'Mitglied'}));
    const all=[...memberView,...external.map(x=>({name:x.displayName,email:x.email,source:x.source==='address'?'Adressmodul':'Manuell',external:true}))];
    host.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong>Tatsächliche Empfänger · '+all.length+'</strong><small style="color:#667085">Name · E-Mail · Quelle</small></div>'+(all.length?'<div style="display:grid;gap:6px;margin-top:8px">'+all.map(x=>'<div style="display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(180px,1.4fr) 100px auto;gap:8px;align-items:center;padding:7px 9px;border:1px solid #e1e6eb;border-radius:8px;background:#fff"><span>'+esc(x.name)+'</span><span style="overflow-wrap:anywhere">'+esc(x.email||'–')+'</span><small>'+esc(x.source)+'</small>'+(x.external?'<button type="button" data-kc-remove="'+esc(x.email)+'" title="Empfänger entfernen">×</button>':'<span></span>')+'</div>').join('')+'</div>':'<p style="margin:8px 0 0;color:#667085">Noch keinen Empfänger ausgewählt.</p>')+(missing.length&&token()?'<div style="margin-top:8px;color:#9a3412">Nicht eindeutig im Communicator: '+esc(missing.join(', '))+'</div>':'');host.querySelectorAll('[data-kc-remove]').forEach(b=>b.onclick=()=>removeExternal(b.dataset.kcRemove));updateSendButton();
  }
  function updateSendButton(){const b=$('commSave');if(!b)return;const memberCount=token()?lastResolved.members.length:selectedMemberRows().length,total=memberCount+external.length,ready=!!token()&&total>0&&!lastResolved.missing.length&&!!(($('commSubject')?.value||'').trim()||($('commBody')?.value||'').trim());b.disabled=!ready;b.textContent=total?'Nachricht an '+total+' Empfänger senden':'Nachricht senden';b.title=!token()?'Cloud-Sitzung wird über die KC-Anmeldung hergestellt':lastResolved.missing.length?'Empfängerprüfung enthält Fehler':!total?'Mindestens einen Empfänger wählen':'';}

  async function send(ev){
    ev.preventDefault();ev.stopImmediatePropagation();if(!token()){const ok=await ensureSharedCloudSession();if(!ok){toastMsg('Cloud-Sitzung nicht verfügbar. Bitte Netzwerk prüfen.','warn');return;}}const subject=$('commSubject')?.value.trim()||'',message=$('commBody')?.value.trim()||'',locals=selectedMemberRows();if(!subject&&!message)return toastMsg('Bitte Betreff oder Nachricht eingeben.','warn');
    try{const d=await getDirectory(true),m=mapMembers(locals,d.people||[]);if(m.missing.length)throw new Error('Nicht eindeutig im KC Communicator gefunden: '+m.missing.join(', '));const list=[...m.mapped.map(x=>x.name+(x.email?' <'+x.email+'>':'')),...external.map(x=>x.displayName+' <'+x.email+'>')];if(!list.length)throw new Error('Bitte mindestens einen Empfänger auswählen.');if(!confirm('Nachricht wirklich über KC Communicator senden an:\n\n'+list.map(x=>'• '+x).join('\n')))return;const btn=$('commSave');btn.disabled=true;btn.textContent='Wird übergeben …';await invoke('kc-communication-send-v2',{subject:subject||'(ohne Betreff)',message,recipientPersonIds:m.mapped.map(x=>x.personId),externalRecipients:external});toastMsg('Nachricht erfolgreich an den KC Communicator übergeben.','success');const notice=$('kcCommTransferNotice');if(notice){notice.innerHTML='✓ Ihre Nachricht an <strong>'+esc(list.length===1?list[0]:(list.length+' Empfänger'))+'</strong> wurde erfolgreich an den KC Communicator übergeben.<br><small style="font-weight:400">'+esc(new Date().toLocaleString('de-DE'))+' · Versand wird zentral protokolliert.</small>';notice.hidden=false;}if($('commSubject'))$('commSubject').value='';if($('commBody'))$('commBody').value='';document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(x=>x.checked=false);external=[];const all=$('commSelectAll');if(all){all.checked=false;all.indeterminate=false;}await window.KCCentralInbox?.refresh?.(true);await renderRecipientSummary();}catch(e){toastMsg('KC Communicator: '+(e.message||e),'error');await renderRecipientSummary();}
  }
  function replaceButton(id,handler){const old=$(id);if(!old)return null;const fresh=old.cloneNode(true);old.replaceWith(fresh);fresh.addEventListener('click',handler,true);return fresh;}
  function replaceSelectAll(){const old=$('commSelectAll');if(!old)return;const fresh=old.cloneNode(true);old.replaceWith(fresh);fresh.addEventListener('change',()=>{const on=fresh.checked;document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(cb=>cb.checked=on);renderRecipientSummary();},true);}
  function bind(){
    injectUi();replaceButton('commSave',send);replaceSelectAll();
    const list=$('commMemberList');list?.addEventListener('change',()=>{const boxes=[...list.querySelectorAll('input[type="checkbox"]')],checked=boxes.filter(x=>x.checked).length,all=$('commSelectAll');if(all){all.checked=boxes.length>0&&checked===boxes.length;all.indeterminate=checked>0&&checked<boxes.length;}renderRecipientSummary();});
    ['commRecipientType','commGroupSelect','commDistributionSelect'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(renderRecipientSummary,0)));
    ['commSubject','commBody'].forEach(id=>$(id)?.addEventListener('input',updateSendButton));
    window.addEventListener('storage',e=>{if(e.key===TOKEN_KEY)renderRecipientSummary();});
    const nativeSet=sessionStorage.setItem.bind(sessionStorage);if(!window.__kc5483SessionHook){window.__kc5483SessionHook=true;sessionStorage.setItem=function(k,v){nativeSet(k,v);if(k===TOKEN_KEY)setTimeout(()=>renderRecipientSummary(),0);};}
    renderRecipientSummary();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,250),{once:true});else setTimeout(bind,250);
})();
