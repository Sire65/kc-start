/* KC Verwaltung – Weihnachtsmarkt Beschaffung & Logistik
 * Additives Modul: ergänzt das bestehende Bestellwesen, ersetzt es nicht.
 * Fachlicher State wird über saveState()/KNGCloudSync zentral nach Supabase synchronisiert.
 */
(function(){
  'use strict';
  const EVENT='WM2026';
  const DEFAULT={
    eventCode:EVENT,
    eventName:'Weihnachtsmarkt Werne 2026',
    sites:{
      production:{name:'Krankenhaus / Produktionsküche Dortmund',address:'Noch nicht eingetragen'},
      frozenStorage:{name:'Altenheim / Tiefkühllager Hamm',address:'Noch nicht eingetragen'}
    },
    truckRental:{provider:'',vehicle:'LKW mit Hebebühne',liftgate:true,rentalFrom:'',rentalTo:'',plannedCost:0,actualCost:0,reservationNo:'',status:'offen',notes:''},
    stages:[
      {id:'egv_to_dortmund',order:10,title:'Rohwaren durch EGV nach Dortmund liefern',type:'Lieferung',supplier:'EGV',from:'EGV / Unna',to:'Krankenhaus / Produktionsküche Dortmund',status:'offen',plannedDate:'',responsible:'',plannedCost:0,actualCost:0,notes:'Grünkohl und Sauerkraut. Lieferadresse und Zeitfenster noch festlegen.'},
      {id:'cook_dortmund',order:20,title:'Grünkohl und Sauerkraut kochen',type:'Produktion',supplier:'',from:'Krankenhaus / Produktionsküche Dortmund',to:'Krankenhaus / Produktionsküche Dortmund',status:'offen',plannedDate:'',responsible:'',plannedCost:0,actualCost:0,notes:'Produktionsmengen und Chargen dokumentieren.'},
      {id:'freeze_dortmund',order:30,title:'Fertige Speisen einfrieren',type:'Einfrieren',supplier:'',from:'Krankenhaus / Produktionsküche Dortmund',to:'Krankenhaus / Produktionsküche Dortmund',status:'offen',plannedDate:'',responsible:'',plannedCost:0,actualCost:0,notes:'Einfrierdatum und Chargen dokumentieren.'},
      {id:'rent_truck',order:40,title:'LKW mit Hebebühne mieten',type:'Miete',supplier:'',from:'',to:'',status:'offen',plannedDate:'',responsible:'',plannedCost:0,actualCost:0,notes:'Miete, Zeitraum, Kaution und Fahrer einplanen.'},
      {id:'dortmund_to_hamm',order:50,title:'Gefrorene Speisen Dortmund → Hamm transportieren',type:'Transport',supplier:'',from:'Krankenhaus / Produktionsküche Dortmund',to:'Altenheim / Tiefkühllager Hamm',status:'offen',plannedDate:'',responsible:'',plannedCost:0,actualCost:0,notes:'Hebebühne erforderlich. Kühlkette/Temperatur dokumentieren.'},
      {id:'storage_hamm',order:60,title:'Gefrorene Speisen in Hamm einlagern',type:'Tiefkühllager',supplier:'',from:'Altenheim / Tiefkühllager Hamm',to:'Altenheim / Tiefkühllager Hamm',status:'offen',plannedDate:'',responsible:'',plannedCost:0,actualCost:0,notes:'Einlagerdatum, Menge, Lagerplatz und Temperatur dokumentieren.'},
      {id:'hamm_to_market',order:70,title:'Bedarfsgerechter Transport Hamm → Weihnachtsmarkt',type:'Transport',supplier:'',from:'Altenheim / Tiefkühllager Hamm',to:'Weihnachtsmarkt Werne',status:'offen',plannedDate:'',responsible:'',plannedCost:0,actualCost:0,notes:'Termine und Teilmengen später festlegen.'}
    ],
    batches:[]
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  function data(){
    if(!window.state)return clone(DEFAULT);
    if(!state.procurementLogistics||typeof state.procurementLogistics!=='object')state.procurementLogistics=clone(DEFAULT);
    const d=state.procurementLogistics;
    d.sites={...clone(DEFAULT.sites),...(d.sites||{})};
    d.truckRental={...clone(DEFAULT.truckRental),...(d.truckRental||{})};
    const old=new Map((Array.isArray(d.stages)?d.stages:[]).map(x=>[x.id,x]));
    d.stages=DEFAULT.stages.map(x=>({...x,...(old.get(x.id)||{})}));
    if(!Array.isArray(d.batches))d.batches=[];
    return d;
  }
  function persist(msg){
    try{if(typeof window.saveState==='function')window.saveState();window.KNGCloudSync?.flush?.();if(msg)window.toast?.(msg,'success');}catch(e){console.error(e);window.toast?.('Speichern fehlgeschlagen: '+e.message,'error');}
  }
  function money(v){return num(v).toLocaleString('de-DE',{style:'currency',currency:'EUR'});}
  function total(kind){const d=data();const stage=d.stages.reduce((s,x)=>s+num(x[kind]),0);return stage+num(d.truckRental[kind]);}
  function style(){if(document.getElementById('wmProcStyle'))return;const s=document.createElement('style');s.id='wmProcStyle';s.textContent=`
  #wmProcurementPanel{margin-top:18px}.wm-proc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.wm-proc-grid label{display:flex;flex-direction:column;gap:4px}.wm-proc-grid input,.wm-proc-grid select,.wm-proc-grid textarea{width:100%}.wm-proc-summary{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0}.wm-proc-summary strong{font-size:1.05rem}.wm-proc-table input,.wm-proc-table select{min-width:110px}.wm-proc-table input[type=number]{min-width:90px}.wm-proc-badge{display:inline-block;padding:3px 8px;border-radius:999px;background:#eef2f6}.wm-proc-warning{padding:8px 10px;border-left:4px solid #b7791f;background:#fff7e6;margin:8px 0}`;document.head.appendChild(s);}
  function render(){
    const host=document.getElementById('orders');if(!host)return;style();let p=document.getElementById('wmProcurementPanel');if(!p){p=document.createElement('div');p.id='wmProcurementPanel';p.className='panel';host.appendChild(p);}const d=data();
    p.innerHTML=`<div class="view-subheader"><div><h3>Weihnachtsmarkt – Beschaffung & Logistik</h3><p class="hint">Ergänzt das Bestellwesen um Lieferziel, Produktion, Einfrieren, LKW-Miete, Transport und Tiefkühllager.</p></div><button id="wmProcSave" class="primary" type="button">Plan speichern</button></div>
    <div class="wm-proc-warning"><strong>Offene Stammdaten:</strong> genaue Produktionsadresse in Dortmund und genaue Lageradresse in Hamm werden später aus der Adressverwaltung zugeordnet.</div>
    <h4>Produktions- und Lagerorte</h4><div class="wm-proc-grid">
      <label>Produktionsort<input id="wmProdName" value="${esc(d.sites.production.name)}"></label><label>Adresse Dortmund<input id="wmProdAddr" value="${esc(d.sites.production.address)}"></label>
      <label>Tiefkühllager<input id="wmStoreName" value="${esc(d.sites.frozenStorage.name)}"></label><label>Adresse Hamm<input id="wmStoreAddr" value="${esc(d.sites.frozenStorage.address)}"></label>
    </div>
    <h4>LKW-Miete</h4><div class="wm-proc-grid">
      <label>Vermieter<input id="wmTruckProvider" value="${esc(d.truckRental.provider)}" placeholder="noch auswählen"></label><label>Fahrzeug<input id="wmTruckVehicle" value="${esc(d.truckRental.vehicle)}"></label>
      <label>Miete von<input id="wmTruckFrom" type="date" value="${esc(d.truckRental.rentalFrom)}"></label><label>Miete bis<input id="wmTruckTo" type="date" value="${esc(d.truckRental.rentalTo)}"></label>
      <label>Plan-Kosten €<input id="wmTruckPlanCost" type="number" min="0" step="0.01" value="${num(d.truckRental.plannedCost)}"></label><label>Ist-Kosten €<input id="wmTruckActualCost" type="number" min="0" step="0.01" value="${num(d.truckRental.actualCost)}"></label>
      <label>Reservierungsnummer<input id="wmTruckReservation" value="${esc(d.truckRental.reservationNo)}"></label><label>Status<select id="wmTruckStatus">${['offen','angefragt','reserviert','abgeholt','zurückgegeben','storniert'].map(x=>`<option ${x===d.truckRental.status?'selected':''}>${x}</option>`).join('')}</select></label>
    </div><label style="display:block;margin-top:8px">LKW-Bemerkung<textarea id="wmTruckNotes">${esc(d.truckRental.notes)}</textarea></label>
    <div class="wm-proc-summary"><span class="wm-proc-badge">Plan-Kosten gesamt: <strong>${money(total('plannedCost'))}</strong></span><span class="wm-proc-badge">Ist-Kosten gesamt: <strong>${money(total('actualCost'))}</strong></span></div>
    <h4>Ablaufkette</h4><div class="table-wrap compact-table wm-proc-table"><table><thead><tr><th>Nr.</th><th>Schritt</th><th>Von</th><th>Nach</th><th>Termin</th><th>Verantwortlich</th><th>Status</th><th>Plan €</th><th>Ist €</th></tr></thead><tbody>${d.stages.sort((a,b)=>a.order-b.order).map(x=>`<tr data-wm-step="${esc(x.id)}"><td>${x.order}</td><td><strong>${esc(x.title)}</strong><br><small>${esc(x.notes)}</small></td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td><input data-f="plannedDate" type="date" value="${esc(x.plannedDate)}"></td><td><input data-f="responsible" value="${esc(x.responsible)}"></td><td><select data-f="status">${['offen','angefragt','bestellt','bestätigt','in Arbeit','erledigt','storniert'].map(v=>`<option ${v===x.status?'selected':''}>${v}</option>`).join('')}</select></td><td><input data-f="plannedCost" type="number" min="0" step="0.01" value="${num(x.plannedCost)}"></td><td><input data-f="actualCost" type="number" min="0" step="0.01" value="${num(x.actualCost)}"></td></tr>`).join('')}</tbody></table></div>
    <h4>Chargen / eingefrorene Mengen</h4><div class="button-row"><button id="wmAddBatch" class="secondary" type="button">Charge hinzufügen</button></div><div class="table-wrap compact-table"><table><thead><tr><th>Produkt</th><th>Menge</th><th>Einheit</th><th>gekocht</th><th>eingefroren</th><th>eingelagert</th><th>Status</th><th></th></tr></thead><tbody id="wmBatchRows">${d.batches.map((b,i)=>`<tr data-batch="${i}"><td><input data-bf="product" value="${esc(b.product||'')}"></td><td><input data-bf="qty" type="number" step="0.001" value="${num(b.qty)}"></td><td><input data-bf="unit" value="${esc(b.unit||'kg')}"></td><td><input data-bf="cooked" type="date" value="${esc(b.cooked||'')}"></td><td><input data-bf="frozen" type="date" value="${esc(b.frozen||'')}"></td><td><input data-bf="stored" type="date" value="${esc(b.stored||'')}"></td><td><select data-bf="status">${['geplant','gekocht','eingefroren','eingelagert','ausgegeben','verbraucht'].map(v=>`<option ${v===(b.status||'geplant')?'selected':''}>${v}</option>`).join('')}</select></td><td><button data-del-batch="${i}" class="danger" type="button">×</button></td></tr>`).join('')}</tbody></table></div>`;
    bind();
  }
  function read(){const d=data();d.sites.production.name=document.getElementById('wmProdName')?.value.trim()||'';d.sites.production.address=document.getElementById('wmProdAddr')?.value.trim()||'';d.sites.frozenStorage.name=document.getElementById('wmStoreName')?.value.trim()||'';d.sites.frozenStorage.address=document.getElementById('wmStoreAddr')?.value.trim()||'';Object.assign(d.truckRental,{provider:document.getElementById('wmTruckProvider')?.value.trim()||'',vehicle:document.getElementById('wmTruckVehicle')?.value.trim()||'',rentalFrom:document.getElementById('wmTruckFrom')?.value||'',rentalTo:document.getElementById('wmTruckTo')?.value||'',plannedCost:num(document.getElementById('wmTruckPlanCost')?.value),actualCost:num(document.getElementById('wmTruckActualCost')?.value),reservationNo:document.getElementById('wmTruckReservation')?.value.trim()||'',status:document.getElementById('wmTruckStatus')?.value||'offen',notes:document.getElementById('wmTruckNotes')?.value.trim()||''});document.querySelectorAll('[data-wm-step]').forEach(r=>{const x=d.stages.find(s=>s.id===r.dataset.wmStep);if(!x)return;r.querySelectorAll('[data-f]').forEach(n=>{x[n.dataset.f]=n.type==='number'?num(n.value):n.value;});});document.querySelectorAll('[data-batch]').forEach(r=>{const b=d.batches[Number(r.dataset.batch)];if(!b)return;r.querySelectorAll('[data-bf]').forEach(n=>{b[n.dataset.bf]=n.type==='number'?num(n.value):n.value;});});}
  function bind(){document.getElementById('wmProcSave').onclick=()=>{read();persist('Beschaffungs- und Logistikplan gespeichert.');render();};document.getElementById('wmAddBatch').onclick=()=>{read();data().batches.push({product:'',qty:0,unit:'kg',cooked:'',frozen:'',stored:'',status:'geplant'});persist();render();};document.querySelectorAll('[data-del-batch]').forEach(b=>b.onclick=()=>{read();data().batches.splice(Number(b.dataset.delBatch),1);persist();render();});}
  function boot(){render();const mo=new MutationObserver(()=>{if(document.getElementById('orders')&&!document.getElementById('wmProcurementPanel'))render();});mo.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('kc-verwaltung:real-supabase-flow',()=>{});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.KCWMProcurement={render,data,save:()=>{read();persist();}};
})();
