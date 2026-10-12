/* KC Verwaltung – Kleininventar / Verbrauchsmaterial für Weihnachtsmarkt
   Rezept- und Ausgabegefäß-Zuordnungen werden NICHT hier gepflegt; führend ist der PC Manager. */
(function(){
  'use strict';
  const MATERIAL_ID='CONSUMABLE-BOWL-BAGASSE-500-WM';
  const NAME='Einwegschale Bagasse, weiß, 500 ml';
  const PHOTO='assets/inventory/einwegschale_bagasse_500ml.jpg';

  function save(){try{if(typeof window.saveState==='function')window.saveState()}catch(e){console.warn(e)}}
  function nextNumber(){
    const inv=Array.isArray(window.state?.inventory)?state.inventory:[];
    const nums=inv.map(x=>Number((String(x.no||'').match(/^KC-(\d+)/)||[])[1])||0);
    return 'KC-'+String(Math.max(0,...nums)+1).padStart(4,'0');
  }
  function ensure(){
    window.state=window.state||{};
    state.inventory=Array.isArray(state.inventory)?state.inventory:[];
    state.combos=state.combos||{};
    state.combos.inventoryCategories=Array.isArray(state.combos.inventoryCategories)?state.combos.inventoryCategories:[];
    if(!state.combos.inventoryCategories.includes('Kleininventar / Verbrauchsmaterial'))state.combos.inventoryCategories.push('Kleininventar / Verbrauchsmaterial');
    let item=state.inventory.find(x=>x.consumableId===MATERIAL_ID)||state.inventory.find(x=>/einwegschale/i.test(String(x.name||''))&&/500\s*ml/i.test(String(x.name||'')));
    if(!item){
      item={
        no:nextNumber(),name:NAME,category:'Kleininventar / Verbrauchsmaterial',assetType:'Umlaufvermögen',location:'Hütte',
        manufacturer:'',supplier:'',condition:'neu',status:'aktiv',purchaseDate:'',approvedAt:'',price:14.99,depYears:0,
        repairedAt:'',disposedAt:'',disposedBy:'',disposalType:'',linear:false,progressive:false,gwg:false,
        inventoryClass:'Kleininventar',consumable:true,consumableId:MATERIAL_ID,usageType:'Ausgabegefäß',servingKind:'Schale',
        material:'Zuckerrohr/Bagasse',capacityMl:500,packSize:100,packUnit:'Stück',packPriceGross:14.99,unitCostGross:0.1499,
        currency:'EUR',taxIncluded:true,color:'weiß',disposable:true,plasticFree:true,biodegradable:true,compostable:true,
        waterResistant:true,greaseResistant:true,odorNeutral:true,tasteNeutral:true,refrigeratorSuitable:true,microwaveSuitable:true,maxTemperatureC:100,
        recipeAssignmentSource:'PC Manager',recipeRefs:[],
        photos:[{id:'bagasse-500-main',label:'Einwegschale Bagasse 500 ml – Muster',src:PHOTO,kind:'reference'}],
        notes:'Kleininventar/Verbrauchsmaterial für den Weihnachtsmarkt. Ausgabegefäß für Speisen. Packung 100 Stück zu 14,99 € brutto = 0,1499 € je Schale. Rezept-/Artikelzuordnung und Kalkulation erfolgen ausschließlich im PC Manager. Produktangaben laut Betreiber-Screenshot vom 12.09.2026.',
        source:'Produkt-/Preisnachweis Betreiber 12.09.2026'
      };
      state.inventory.push(item);save();
    }else{
      Object.assign(item,{category:'Kleininventar / Verbrauchsmaterial',inventoryClass:'Kleininventar',consumable:true,consumableId:MATERIAL_ID,usageType:'Ausgabegefäß',servingKind:'Schale',material:'Zuckerrohr/Bagasse',capacityMl:500,packSize:100,packUnit:'Stück',packPriceGross:14.99,unitCostGross:0.1499,currency:'EUR',taxIncluded:true,recipeAssignmentSource:'PC Manager'});
      item.photos=Array.isArray(item.photos)?item.photos:[];
      if(!item.photos.some(p=>p.src===PHOTO))item.photos.unshift({id:'bagasse-500-main',label:'Einwegschale Bagasse 500 ml – Muster',src:PHOTO,kind:'reference'});
      save();
    }
    return item;
  }
  const RECIPE_OWNERSHIP_HTML='<div class="panel" data-kc-rezept-hinweis="1" style="margin-top:12px"><strong>Rezeptzuordnung</strong><p class="hint small">Die Zuordnung von Ausgabegefäßen zu Getränken und Speisen wird zentral im PC Manager unter „Rezeptur & Kalkulation“ gepflegt. KC Verwaltung zeigt das Inventar/Verbrauchsmaterial, führt aber keine zweite Rezeptzuordnung.</p></div>';
  function clarifyRecipeOwnership(){
    const tab=document.querySelector('[data-inv934-tab="usage"] span:last-child');
    if(tab && tab.textContent!=='Verwendung')tab.textContent='Verwendung';
    const box=document.getElementById('kcRecipeAssignment');
    // 54.8.20 Startfix: nicht mit innerHTML vergleichen – der Browser gibt „&“ als „&amp;“ zurueck, der Vergleich war nie gleich,
    // jedes Schreiben weckte den MutationObserver erneut -> Endlosschleife, Start blieb bei 22 % stehen. Merkmal statt Textvergleich.
    if(box && !box.querySelector('[data-kc-rezept-hinweis]'))box.innerHTML=RECIPE_OWNERSHIP_HTML;
  }
  ensure();
  const obs=new MutationObserver(()=>clarifyRecipeOwnership());obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clarifyRecipeOwnership);else setTimeout(clarifyRecipeOwnership,0);
  window.KCKleininventarVerbrauchsmaterial=Object.freeze({VERSION:'0.1.2-startup-loop-fix',MATERIAL_ID,ensure});
})();

/* Weitere Verpackungen / Ausgabegefäße separat nachladen. */
(function(){
  if(window.KCThermobecher750||document.querySelector('script[data-kc-thermobecher-750="1"]'))return;
  const s=document.createElement('script');s.src='js/90_thermobecher_750ml.js?v=54.8.21';s.async=false;s.dataset.kcThermobecher750='1';document.body.appendChild(s);
})();
