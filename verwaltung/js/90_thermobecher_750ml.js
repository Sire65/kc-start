/* KC Verwaltung – brauner Suppen-/Thermobecher 750 ml als Kleininventar/Verbrauchsmaterial.
   Rezeptzuordnung bleibt führend im PC Manager. */
(function(){
  'use strict';
  const VERSION='0.1.1';
  const ID='CONSUMABLE-SOUP-CUP-PAPER-PE-750-WM';
  const PHOTO='assets/inventory/suppenbecher_pappe_pe_750ml.jpg';
  function nextNumber(){const inv=Array.isArray(window.state?.inventory)?state.inventory:[];const nums=inv.map(x=>Number((String(x.no||'').match(/^KC-(\d+)/)||[])[1])||0);return 'KC-'+String(Math.max(0,...nums)+1).padStart(4,'0')}
  function save(){try{if(typeof window.saveState==='function')window.saveState()}catch(e){console.warn(e)}}
  function ensure(){
    window.state=window.state||{};state.inventory=Array.isArray(state.inventory)?state.inventory:[];
    let item=state.inventory.find(x=>x.consumableId===ID);
    const data={name:'Suppenbecher mit Deckel, Pappe/PE, 750 ml',category:'Kleininventar / Verbrauchsmaterial',assetType:'Umlaufvermögen',location:'Hütte',inventoryClass:'Kleininventar',consumable:true,consumableId:ID,usageType:'Ausgabegefäß / Mitnahmegefäß',servingKind:'Thermo-/Suppenbecher',material:'Pappe / PE',capacityMl:750,packSize:50,packUnit:'Stück',packPriceNet:10.32,packPriceGross:12.28,unitCostGross:12.28/50,currency:'EUR',taxIncluded:true,color:'braun',disposable:true,reusable:false,lidIncluded:true,recipeAssignmentSource:'PC Manager',status:'aktiv',price:12.28,depYears:0,gwg:false,source:'Betreiber-Screenshot 12.09.2026',notes:'Brauner Suppenbecher mit Deckel, 750 ml. Packung 50 Stück. 10,32 € netto / 12,28 € brutto. Rechnerisch 0,2456 € je Stück; Shopanzeige 0,25 € je Stück. Als Thermo-/Mitnahme-Ausgabegefäß verfügbar. Rezeptzuordnung erfolgt im PC Manager.'};
    if(!item){item={no:nextNumber(),...data,photos:[{id:'thermocup-750-main',label:'Suppenbecher Pappe/PE 750 ml – Muster',src:PHOTO,kind:'reference'}]};state.inventory.push(item)}else{Object.assign(item,data);item.photos=Array.isArray(item.photos)?item.photos:[];item.photos=item.photos.filter(p=>!/supp(en|enbecher).*750/i.test(String(p.label||''))||p.src===PHOTO);if(!item.photos.some(p=>p.src===PHOTO))item.photos.unshift({id:'thermocup-750-main',label:'Suppenbecher Pappe/PE 750 ml – Muster',src:PHOTO,kind:'reference'})}
    save();return item;
  }
  const item=ensure();window.KCThermobecher750=Object.freeze({VERSION,ID,item,ensure});
})();
