/* KC Verwaltung 54.8.19 – KC-CLUB-BUERO-ADRESSEN: Meldungen aus der Club-App in der Adressverwaltung
   Die Club-App (Büro der Clubleitung) LIEST die Adressen dieser Verwaltung und schickt Änderungen nur als MELDUNG
   (Tabelle kc_club_adress_meldungen). Hier werden offene Meldungen angezeigt; „Übernehmen“ schreibt die Adresse über den
   normalen Speicherweg der Verwaltung (state.addresses → saveState → Cloud-Abschnitt „addresses“) und quittiert danach.
   Eine Übernahme ist wiederholbar: jede übernommene Adresse merkt sich clubMeldungId – wird die Quittung erneut versucht,
   entsteht keine doppelte Adresse. Die Verwaltung bleibt das Original; die Club-App schreibt nie direkt in Adressen. */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const ORG='KC_WERNE';
  const TOKEN_KEY='kc_manager_access_token';
  const FELDER=[['category','Kategorie'],['company','Firma'],['salutation','Anrede'],['title','Titel'],['firstName','Vorname'],['lastName','Nachname'],['contactPerson','Ansprechpartner'],
    ['street','Straße'],['zip','PLZ'],['city','Ort'],['country','Land'],['phone1','Telefon'],['phone2','Telefon 2'],['fax','Fax'],['email1','E-Mail'],['email2','E-Mail 2'],['website','Internet'],['notes','Notiz']];
  const ART={neu:'➕ Neue Adresse',aendern:'✏️ Änderung',entfernen:'🗑️ Entfernen'};
  let meldungen=[], fehler='', laedt=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=(t,k)=>{try{(window.toast||window.showToast||console.log)(t,k);}catch(_){}};
  const st=()=>(typeof state!=='undefined'?state:window.state)||null; // lexikalischer Zustand zuerst (01_state.js: let state), window.state nur als Rückfall
  async function rpc(name,body,nochmal=true){
    const token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(!token)throw new Error('Nicht mit der Cloud verbunden – bitte zuerst anmelden.');
    const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
    const text=await r.text();let data=null;try{data=text?JSON.parse(text):null;}catch(_){data=text;}
    if(r.status===401&&nochmal&&window.KCCloudSession?.refresh&&await window.KCCloudSession.refresh())return rpc(name,body,false);
    if(!r.ok)throw new Error(String(data?.message||data?.hint||('HTTP '+r.status)));
    return data;
  }
  function label(a){return (a?.company||[a?.lastName,a?.firstName].filter(Boolean).join(', ')||a?.contactPerson||a?.no||'(ohne Namen)').trim();}
  function naechsteNr(liste){let max=0;for(const a of liste){const m=String(a?.no||'').match(/^A-(\d+)$/);if(m)max=Math.max(max,Number(m[1]));}return 'A-'+String(max+1).padStart(4,'0');}
  function panel(){
    const sec=document.getElementById('addresses');if(!sec)return null;
    let p=document.getElementById('clubAdrMeldungen');
    if(!p){p=document.createElement('div');p.id='clubAdrMeldungen';p.className='panel';p.style.cssText='margin:0 0 12px;border-left:4px solid #8b1e2d';const h=sec.querySelector('h3');h?h.after(p):sec.prepend(p);}
    return p;
  }
  function zeichnen(){
    const p=panel();if(!p)return;
    const S=st(),liste=Array.isArray(S?.addresses)?S.addresses:[];
    const kopf=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4 style="margin:0">📥 Meldungen aus der Club-App ${meldungen.length?`(${meldungen.length})`:''}</h4><button type="button" class="secondary" data-ca="laden">↻ Prüfen</button></div>`;
    if(fehler){p.innerHTML=kopf+`<p class="muted">⚠️ ${esc(fehler)}</p>`;return;}
    if(laedt&&!meldungen.length){p.innerHTML=kopf+'<p class="muted">Wird geprüft …</p>';return;}
    if(!meldungen.length){p.innerHTML=kopf+'<p class="muted">Keine offenen Meldungen. Das Büro der Club-App kann neue oder geänderte Adressen hierher melden.</p>';return;}
    p.innerHTML=kopf+meldungen.map(m=>{
      const alt=m.adresse_id?liste.find(a=>a.id===m.adresse_id):null,d=m.daten||{};
      const zeilen=m.art==='entfernen'?'':FELDER.filter(([k])=>(d[k]||'')!==(alt?.[k]||'')&&(d[k]||'')).map(([k,l])=>`<tr><td>${esc(l)}</td><td>${alt?esc(alt[k]||'–'):''}</td><td><b>${esc(d[k])}</b></td></tr>`).join('');
      const fehlt=m.art!=='neu'&&!alt;
      return `<div style="border-top:1px solid #ddd;padding:8px 0"><b>${ART[m.art]||esc(m.art)}: ${esc(label(m.art==='neu'?d:(alt||d)))}</b>
        <div class="muted">von ${esc(m.von)} · ${esc(new Date(m.erstellt_am).toLocaleString('de-DE'))}${m.grund?' · „'+esc(m.grund)+'“':''}</div>
        ${fehlt?'<div class="muted">⚠️ Diese Adresse gibt es hier nicht mehr – nur Ablehnen möglich.</div>':''}
        ${zeilen?`<table class="table" style="margin:6px 0"><thead><tr><th>Feld</th><th>${m.art==='neu'?'':'bisher'}</th><th>neu</th></tr></thead><tbody>${zeilen}</tbody></table>`:''}
        <div style="display:flex;gap:6px;flex-wrap:wrap">${fehlt?'':`<button type="button" class="primary" data-ca="ok" data-id="${esc(m.id)}">✅ Übernehmen</button>`}<button type="button" class="secondary" data-ca="nein" data-id="${esc(m.id)}">❌ Ablehnen</button></div></div>`;
    }).join('');
  }
  async function laden(){
    if(laedt)return;laedt=true;fehler='';zeichnen();
    try{const d=await rpc('kc_club_adress_meldungen_offen',{p_org_id:ORG});meldungen=Array.isArray(d)?d:[];}
    catch(e){fehler=/Berechtigung|42501/.test(String(e.message))?'Nur mit Verwaltungs-Berechtigung sichtbar.':String(e.message||e);meldungen=[];}
    finally{laedt=false;zeichnen();}
  }
  function anwenden(m){
    const S=st();if(!S)throw new Error('Programmzustand nicht bereit.');
    S.addresses=Array.isArray(S.addresses)?S.addresses:[];
    const jetzt=new Date().toISOString(),d={};for(const [k] of FELDER)if(m.daten?.[k])d[k]=String(m.daten[k]);
    if(m.art==='neu'){
      if(S.addresses.some(a=>a.clubMeldungId===m.id))return; // schon übernommen (Quittung war nur nicht angekommen)
      S.addresses.unshift({id:'addr_'+Date.now(),no:naechsteNr(S.addresses),status:'Aktiv',country:'Deutschland',...d,sourceType:'address',clubMeldungId:m.id,createdAt:jetzt,updatedAt:jetzt});
    }else if(m.art==='aendern'){
      const i=S.addresses.findIndex(a=>a.id===m.adresse_id);if(i<0)throw new Error('Adresse nicht mehr vorhanden.');
      S.addresses[i]={...S.addresses[i],...d,clubMeldungId:m.id,updatedAt:jetzt};
    }else if(m.art==='entfernen'){
      S.addresses=S.addresses.filter(a=>a.id!==m.adresse_id);
    }
    if(d.category&&S.combos){S.combos.addressCategories=Array.isArray(S.combos.addressCategories)?S.combos.addressCategories:[''];if(!S.combos.addressCategories.includes(d.category))S.combos.addressCategories.push(d.category);}
    try{(window.saveState||saveState)();}catch(_){}
    try{window.KNG938?.renderAddressLists?.();}catch(_){}
  }
  async function entscheiden(id,ok){
    const m=meldungen.find(x=>x.id===id);if(!m)return;
    let antwort=null;
    if(ok){
      if(m.art==='entfernen'&&!confirm(`„${label(st()?.addresses?.find(a=>a.id===m.adresse_id)||m.daten)}“ wirklich aus der Adressverwaltung entfernen?`))return;
      try{anwenden(m);}catch(e){toast('Übernehmen ging nicht: '+(e.message||e),'warn');return;}
    }else{
      antwort=prompt('Kurzer Grund für die Ablehnung (sieht das Büro in der Club-App):','');if(antwort===null)return;
    }
    try{await rpc('kc_club_adress_meldung_erledigen',{p_id:id,p_status:ok?'uebernommen':'abgelehnt',p_antwort:antwort});
      toast(ok?'Adresse übernommen – das Büro sieht sie in der Club-App.':'Meldung abgelehnt.','success');
      try{window.KNGCloudSync?.syncNow?.();}catch(_){}
    }catch(e){toast((ok?'Übernommen, aber die Quittung an die Club-App ging nicht – bitte später „Prüfen“ (es entsteht nichts doppelt): ':'Ablehnen ging nicht: ')+(e.message||e),'warn');}
    await laden();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-ca]');
    if(b){e.preventDefault();const a=b.dataset.ca;if(a==='laden')laden();else entscheiden(b.dataset.id,a==='ok');return;}
    if(e.target.closest?.('[data-view="addresses"]'))setTimeout(laden,150);
  });
  window.addEventListener('kc:cloud-session',ev=>{if(ev.detail?.connected)setTimeout(laden,1500);});
  setInterval(()=>{const sec=document.getElementById('addresses');if(sec&&sec.offsetParent!==null)laden();},5*60*1000);
  window.KCClubAdressMeldungen={laden,anzahl:()=>meldungen.length,version:'54.8.19',_anwenden:anwenden};
})();
