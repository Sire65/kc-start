/* KC Verwaltung – Weihnachtsmarkt Einkaufsartikelstamm
   Ergänzt Beschaffung/Logistik additiv. Preise/Mengen bleiben offen, solange sie nicht sicher bekannt sind. */
(function(){
  'use strict';
  const EVENT='WM2026';
  const POTATO_ID='WM-HH-PEKA-DELIKATESS-38-40-2KG';
  const LEGACY_POTATO_IDS=['WM-HH-KARTOFFEL-KLEIN-VORGEGART','WM-HH-PEKA-PARISER-2200'];
  const ITEMS=[
    {id:'WM-HH-WUERFELZUCKER',name:'Würfelzucker',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'1 kg Packung',price:null,usage:['Getränke / Standbedarf'],freeIssue:false},
    {id:'WM-HH-SENF-EFS-MITTEL-875',name:'EDEKA Foodservice Classic Senf, mittelscharf',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'875 ml Flasche',price:null,usage:['Selbstbedienung für Kunden'],freeIssue:false,gtin:'4311596609093'},
    {id:POTATO_ID,name:'Peka Garkartoffeln Delikatess 38/40 mm, vorgegart',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'ca. 2 kg Vakuumbeutel',price:null,usage:['Kartoffeln mit Hering','Kartoffeln mit Kartoffelcreme'],freeIssue:false,productSize:'38/40 mm'},
    {id:'WM-HH-ZWIEBELN',name:'Zwiebeln',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Gebinde/Menge noch erfassen',price:null,usage:['Heringsstipp','weitere Speisen'],freeIssue:false},
    {id:'WM-HH-APFEL',name:'Äpfel',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Sorte/Gebinde noch erfassen',price:null,usage:['Heringsstipp'],freeIssue:false},
    {id:'WM-HH-HERINGSFILETS',name:'Heringsfilets',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Gebinde/Menge noch erfassen',price:null,usage:['Heringsstipp'],freeIssue:false},
    {id:'WM-HH-SAHNE',name:'Sahne',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Gebinde/Menge noch erfassen',price:null,usage:['Heringsstipp'],freeIssue:false},
    {id:'WM-HH-MAYONNAISE',name:'Mayonnaise',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Gebinde/Menge noch erfassen',price:null,usage:['Heringsstipp'],freeIssue:false},
    {id:'WM-HH-SALZ',name:'Speisesalz',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Gebinde noch erfassen',price:null,usage:['Heringsstipp'],freeIssue:false},
    {id:'WM-HH-PFEFFER',name:'Pfeffer',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Gebinde noch erfassen',price:null,usage:['Heringsstipp'],freeIssue:false},
    {id:'WM-HH-ZUCKER',name:'Zucker',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Gebinde noch erfassen',price:null,usage:['Heringsstipp'],freeIssue:false},
    {id:'WM-HH-POPP-KARTOFFELCREME',name:'Popp Kartoffel Creme',category:'Lebensmittel',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'3 kg Gastrogebinde',price:null,usage:['Kartoffeln mit Kartoffelcreme'],freeIssue:false},
    {id:'WM-ALDI-RUM-54',name:'Rum 54 % vol.',category:'Spirituose',supplier:'Aldi',procurement:'Selbstabholung',packageText:'Flaschengröße/Marke noch erfassen',price:null,usage:['Feuerzangenbowle'],freeIssue:false,alcoholPercent:54},
    {id:'WM-ALDI-GEWUERZSPEKULATIUS',name:'Gewürzspekulatius',category:'Gratiszugabe',supplier:'Aldi',procurement:'Selbstabholung',packageText:'Packungsgröße noch erfassen',price:null,usage:['Gratis für Kunden'],freeIssue:true},
    {id:'WM-HH-PAPIERSERVIETTEN',name:'Papierservietten',category:'Verbrauchsmaterial',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Packungsgröße noch erfassen',price:null,usage:['Ausgabe Speisen/Getränke'],freeIssue:false,consumable:true},
    {id:'WM-HH-ALUFOLIE',name:'Alufolie',category:'Verbrauchsmaterial',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Rollenlänge/Breite noch erfassen',price:null,usage:['Küche / Abdecken / Verpacken'],freeIssue:false,consumable:true},
    {id:'WM-HH-FRISCHHALTEFOLIE',name:'Frischhaltefolie',category:'Verbrauchsmaterial',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Rollenlänge/Breite noch erfassen',price:null,usage:['Küche / Abdecken'],freeIssue:false,consumable:true},
    {id:'WM-HH-HEMDCHENBEUTEL',name:'Hemdchenbeutel / Einkaufstaschen',category:'Verbrauchsmaterial',supplier:'Handelshof',procurement:'Selbstabholung',packageText:'Packungsgröße noch erfassen',price:null,usage:['Mitnahme durch Kunden'],freeIssue:false,consumable:true}
  ];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function ensure(){
    window.state=window.state||{};
    state.procurementLogistics=state.procurementLogistics||{eventCode:EVENT};
    const old=(Array.isArray(state.procurementLogistics.purchaseItems)?state.procurementLogistics.purchaseItems:[]).filter(x=>!LEGACY_POTATO_IDS.includes(x.id));
    const map=new Map(old.map(x=>[x.id,x]));
    ITEMS.forEach(seed=>map.set(seed.id,{...clone(seed),...(map.get(seed.id)||{})}));
    state.procurementLogistics.purchaseItems=[...map.values()];
    if(typeof window.saveState==='function')window.saveState();
    return state.procurementLogistics.purchaseItems;
  }
  function inventoryConsumables(){
    state.inventory=Array.isArray(state.inventory)?state.inventory:[];
    const seeds=ITEMS.filter(x=>x.consumable);
    seeds.forEach(seed=>{
      if(state.inventory.some(x=>x.consumableId===seed.id))return;
      state.inventory.push({
        no:'KC-C-'+seed.id.replace(/^WM-HH-/,'').slice(0,24),name:seed.name,category:'Kleininventar / Verbrauchsmaterial',
        inventoryClass:'Kleininventar',consumable:true,consumableId:seed.id,usageType:'Verbrauchsmaterial',status:'aktiv',location:'Hütte',
        supplier:seed.supplier,procurement:seed.procurement,packDescription:seed.packageText,price:0,depYears:0,gwg:false,
        notes:`Weihnachtsmarkt-Verbrauchsmaterial. ${seed.usage.join(', ')}. Einkauf: ${seed.procurement} ${seed.supplier}. Preis und genaue Packungsgröße noch erfassen.`
      });
    });
    if(typeof window.saveState==='function')window.saveState();
  }
  function render(){
    const host=document.getElementById('wmProcurementPanel');if(!host)return;
    let box=document.getElementById('wmPurchaseCatalog');
    if(!box){box=document.createElement('div');box.id='wmPurchaseCatalog';host.appendChild(box);}
    const rows=ensure();
    box.innerHTML=`<h4>Einkaufsartikel Weihnachtsmarkt</h4><p class="hint">Selbstabholung; unbekannte Preise und Gebinde werden später ergänzt. Gratisartikel sind gesondert gekennzeichnet.</p><div class="table-wrap compact-table"><table><thead><tr><th>Artikel</th><th>Gruppe</th><th>Bezugsquelle</th><th>Gebinde</th><th>Verwendung</th><th>Preis</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong>${x.freeIssue?'<br><small>Gratis für Kunden</small>':''}</td><td>${esc(x.category)}</td><td>${esc(x.procurement)} ${esc(x.supplier)}</td><td>${esc(x.packageText)}</td><td>${esc((x.usage||[]).join(', '))}</td><td>${x.price==null?'noch erfassen':Number(x.price).toLocaleString('de-DE',{style:'currency',currency:'EUR'})}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function boot(){ensure();inventoryConsumables();render();const mo=new MutationObserver(()=>{if(document.getElementById('wmProcurementPanel')&&!document.getElementById('wmPurchaseCatalog'))render()});mo.observe(document.documentElement,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.KCWMEinkauf={ITEMS,ensure,render};
})();
