/* KC Verwaltung 54.8.6 – einklappbare CC/BCC-Empfänger */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  const lists={cc:[],bcc:[]};
  let picker=null,pickerTarget='cc';

  function activeMembers(){return (window.state?.members||[]).filter(m=>{
    const dead=norm([m.exitReason,m.memberStatus,m.status,m.memberNotes].filter(Boolean).join(' ')).includes('verstorben');
    return !dead && !String(m.exitDate||'').trim() && norm(m.memberType)!=='ausgeschieden';
  });}
  function memberName(m){return ((m.firstName||'')+' '+(m.lastName||'')).trim()||m.memberNo||m.id||'Mitglied';}
  function addressRows(){return Array.isArray(window.state?.addresses)?state.addresses:[];}
  function addressName(a){return String(a.company||'').trim()||[a.firstName,a.lastName].filter(Boolean).join(' ').trim()||String(a.contactPerson||'').trim()||a.no||'Adresse';}
  function dedupe(role){const seen=new Set();lists[role]=lists[role].filter(x=>{const e=norm(x.email);if(!e||seen.has(e))return false;seen.add(e);return true;});}
  function add(role,item){const email=String(item.email||'').trim().toLowerCase();if(!validEmail(email))return false;lists[role].push({email,displayName:String(item.displayName||email).trim(),source:String(item.source||'manual')});dedupe(role);render(role);return true;}
  function remove(role,email){lists[role]=lists[role].filter(x=>norm(x.email)!==norm(email));render(role);}

  function render(role){const box=$('kc'+role.toUpperCase()+'List'),summary=$('kc'+role.toUpperCase()+'Summary');if(summary)summary.textContent=role.toUpperCase()+' · '+lists[role].length;if(!box)return;box.innerHTML=lists[role].length?lists[role].map(x=>'<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid #d8dee6;border-radius:999px;padding:5px 8px;background:#fff;margin:3px 4px 3px 0"><span>'+esc(x.displayName)+'</span><small style="color:#667085">&lt;'+esc(x.email)+'&gt;</small><button type="button" data-role="'+role+'" data-email="'+esc(x.email)+'" style="border:0;background:transparent;cursor:pointer">×</button></span>').join(''):'<small style="color:#667085">Keine '+role.toUpperCase()+'-Empfänger.</small>';box.querySelectorAll('button[data-email]').forEach(b=>b.onclick=()=>remove(b.dataset.role,b.dataset.email));}

  function inject(){if($('kcCcBccBlocks'))return;const tools=$('kcRecipientTools');if(!tools)return;const wrap=document.createElement('div');wrap.id='kcCcBccBlocks';wrap.style.cssText='margin-top:10px;display:grid;gap:8px';wrap.innerHTML=['cc','bcc'].map(role=>'<details id="kc'+role.toUpperCase()+'Details" style="border:1px solid #d8dee6;border-radius:9px;background:#fff"><summary id="kc'+role.toUpperCase()+'Summary" style="cursor:pointer;padding:8px 10px;font-weight:700">'+role.toUpperCase()+' · 0</summary><div style="padding:0 10px 10px"><div style="display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:7px"><input id="kc'+role.toUpperCase()+'Email" type="email" placeholder="'+role.toUpperCase()+'-E-Mail-Adresse"><button id="kc'+role.toUpperCase()+'Add" type="button" class="secondary">＋ Hinzufügen</button><button id="kc'+role.toUpperCase()+'Pick" type="button" class="secondary">📒 Aus Mitgliedern / Adressen</button></div><div id="kc'+role.toUpperCase()+'List" style="margin-top:8px"></div></div></details>').join('');
    const cloud=$('kcCommCloudState');if(cloud)cloud.insertAdjacentElement('beforebegin',wrap);else tools.appendChild(wrap);
    ['cc','bcc'].forEach(role=>{
      const up=role.toUpperCase(),input=$('kc'+up+'Email');$('kc'+up+'Add').onclick=()=>{if(!add(role,{email:input.value,displayName:input.value,source:'manual'}))return window.toast?.('Bitte gültige E-Mail-Adresse eingeben.','warn');input.value='';};
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('kc'+up+'Add').click();}});
      $('kc'+up+'Pick').onclick=()=>openPicker(role);
      render(role);
    });
  }

  function pickerRows(){const members=activeMembers().filter(m=>validEmail(m.email)).map(m=>({key:'m:'+m.id,name:memberName(m),email:m.email,source:'Mitglied',hay:[m.memberNo,m.firstName,m.lastName,m.city,m.email].join(' ')}));const adds=[];for(const a of addressRows()){for(const email of [a.email1,a.email2].filter(validEmail))adds.push({key:'a:'+(a.id||a.no||email)+':'+email,name:addressName(a),email,source:'Adressmodul',hay:[a.company,a.firstName,a.lastName,a.contactPerson,a.city,a.category,email].join(' ')})}return [...members,...adds];}
  function ensurePicker(){if(picker)return picker;picker=document.createElement('dialog');picker.style.cssText='width:min(820px,94vw);max-height:86vh;border:1px solid #8994a3;border-radius:14px;padding:0;background:#f8fafb';picker.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #d8dee6"><div><strong id="kcCopyPickerTitle">Empfänger wählen</strong><div style="font-size:12px;color:#667085">Mitglieder und Adressmodul · Live-Suche</div></div><button id="kcCopyPickerClose" type="button">×</button></div><div style="padding:14px 16px"><input id="kcCopyPickerSearch" placeholder="Name, Firma, Ort oder E-Mail suchen …" style="width:100%"><div id="kcCopyPickerCount" style="font-size:12px;color:#667085;margin:8px 0"></div><div id="kcCopyPickerRows" style="max-height:50vh;overflow:auto;border:1px solid #d8dee6;border-radius:10px;background:#fff"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button id="kcCopyPickerCancel" type="button" class="secondary">Abbrechen</button><button id="kcCopyPickerTake" type="button" class="primary">Auswahl übernehmen</button></div></div>';document.body.appendChild(picker);$('kcCopyPickerClose').onclick=$('kcCopyPickerCancel').onclick=()=>picker.close();$('kcCopyPickerSearch').addEventListener('input',renderPicker);$('kcCopyPickerTake').onclick=takePicker;return picker;}
  function openPicker(role){pickerTarget=role;const d=ensurePicker();$('kcCopyPickerTitle').textContent=role.toUpperCase()+'-Empfänger wählen';$('kcCopyPickerSearch').value='';renderPicker();d.showModal();setTimeout(()=>$('kcCopyPickerSearch').focus(),40);}
  function renderPicker(){const q=norm($('kcCopyPickerSearch')?.value),rows=pickerRows().filter(x=>!q||norm(x.hay).includes(q));$('kcCopyPickerCount').textContent=rows.length+' Treffer';$('kcCopyPickerRows').innerHTML=rows.map(x=>'<label style="display:grid;grid-template-columns:auto minmax(160px,1fr) minmax(200px,1.2fr) 100px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid #edf0f3"><input type="checkbox" data-copy-key="'+esc(x.key)+'" data-copy-email="'+esc(x.email)+'" data-copy-name="'+esc(x.name)+'" data-copy-source="'+esc(x.source)+'"><strong>'+esc(x.name)+'</strong><span style="overflow-wrap:anywhere">'+esc(x.email)+'</span><small>'+esc(x.source)+'</small></label>').join('');}
  function takePicker(){document.querySelectorAll('#kcCopyPickerRows input[data-copy-email]:checked').forEach(ch=>add(pickerTarget,{email:ch.dataset.copyEmail,displayName:ch.dataset.copyName,source:ch.dataset.copySource}));picker.close();}

  function wrapFetch(){if(window.__kc5486FetchWrapped)return;window.__kc5486FetchWrapped=true;const native=window.fetch.bind(window);window.fetch=async function(input,init){try{const url=typeof input==='string'?input:(input?.url||'');if(String(url).includes('/functions/v1/kc-communication-send-v2')&&init?.body){const body=typeof init.body==='string'?JSON.parse(init.body):null;if(body&&typeof body==='object'){body.ccRecipients=lists.cc;body.bccRecipients=lists.bcc;init={...init,body:JSON.stringify(body)};}}}catch(_e){}return native(input,init);};}
  function clearAfterSend(){const oldToast=window.toast;if(typeof oldToast!=='function'||window.__kc5486ToastWrapped)return;window.__kc5486ToastWrapped=true;window.toast=function(msg,type){const r=oldToast.apply(this,arguments);if(type==='success'&&/Communicator übergeben/i.test(String(msg||''))){lists.cc=[];lists.bcc=[];render('cc');render('bcc');}return r;};}
  function init(){inject();wrapFetch();clearAfterSend();const mo=new MutationObserver(inject);const comm=$('communication');if(comm)mo.observe(comm,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,650),{once:true});else setTimeout(init,650);
})();
