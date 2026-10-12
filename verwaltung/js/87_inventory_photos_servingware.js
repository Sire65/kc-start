/* KC Verwaltung – Inventarfotos + Ausgabegeschirr / Getränkerezept-Referenz
   Additiv zur vorhandenen Inventarverwaltung. Bestehende Artikelkarte/Liste bleiben unverändert. */
(function(){
  "use strict";

  const SERVING_ID="SERVING-GLASS-020-WM";
  const NAME="Trinkglas, 0,2 l, Weihnachtsmarkt";
  const DEFAULT_PHOTO="assets/inventory/trinkglas-0_2l-weihnachtsmarkt.jpg";
  const MAX_PHOTOS=6;
  const MAX_PHOTO_BYTES=1200000;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const save=()=>{ try{ if(typeof window.saveState==="function") window.saveState(); }catch(e){ console.warn("Inventar konnte nicht gespeichert werden",e); } };
  const toast=(m,t="success")=>{ try{ if(typeof window.toastSafe==="function") window.toastSafe(m,t); else console.info(m); }catch(_){ console.info(m); } };

  function nextNumber(){
    const inv=Array.isArray(window.state?.inventory)?state.inventory:[];
    const nums=inv.map(x=>Number((String(x.no||"").match(/^KC-(\d+)/)||[])[1])||0);
    return "KC-"+String(Math.max(0,...nums)+1).padStart(4,"0");
  }

  function ensureState(){
    window.state=window.state||{};
    state.inventory=Array.isArray(state.inventory)?state.inventory:[];
    state.combos=state.combos||{};
    state.combos.inventoryCategories=Array.isArray(state.combos.inventoryCategories)?state.combos.inventoryCategories:[];
    if(!state.combos.inventoryCategories.includes("Geschirr / Gläser")) state.combos.inventoryCategories.push("Geschirr / Gläser");
    state.servingWareRecipeLinks=Array.isArray(state.servingWareRecipeLinks)?state.servingWareRecipeLinks:[];

    let item=state.inventory.find(x=>x.servingWareId===SERVING_ID);
    if(!item){
      item=state.inventory.find(x=>/trinkglas/i.test(String(x.name||"")) && /0[,.]2/.test(String(x.name||"")));
    }
    if(!item){
      item={
        no:nextNumber(), name:NAME, category:"Geschirr / Gläser", assetType:"", location:"Hütte",
        manufacturer:"ARC", supplier:"", condition:"gut", status:"aktiv", purchaseDate:"", approvedAt:"",
        price:0, depYears:0, repairedAt:"", disposedAt:"", disposedBy:"", disposalType:"",
        linear:false, progressive:false, gwg:false,
        notes:"Ausgabegeschirr für Getränke am Weihnachtsmarkt. Eichmarke 0,2 l. Verwendung wird über SERVING-GLASS-020-WM mit Getränkerezepten verknüpft.",
        source:"Weihnachtsmarkt – Glasbestand",
        servingWareId:SERVING_ID,
        usageType:"Ausgabegeschirr",
        servingKind:"Glas",
        capacityLiters:0.2,
        deposit:{enabled:true,amount:2,currency:"EUR"},
        photos:[{id:"glass-main",label:"Trinkglas 0,2 l – Original/Muster",src:DEFAULT_PHOTO,kind:"reference"}],
        recipeRefs:[]
      };
      state.inventory.push(item);
      save();
    }else{
      item.servingWareId=SERVING_ID;
      item.usageType=item.usageType||"Ausgabegeschirr";
      item.servingKind=item.servingKind||"Glas";
      item.capacityLiters=Number(item.capacityLiters||0.2);
      item.photos=Array.isArray(item.photos)?item.photos:[];
      if(!item.photos.some(p=>p.src===DEFAULT_PHOTO)) item.photos.unshift({id:"glass-main",label:"Trinkglas 0,2 l – Original/Muster",src:DEFAULT_PHOTO,kind:"reference"});
      item.recipeRefs=Array.isArray(item.recipeRefs)?item.recipeRefs:[];
      item.deposit=item.deposit||{enabled:true,amount:2,currency:"EUR"};
    }
    return item;
  }

  function currentItem(){
    const no=$("#inv934No")?.value;
    const inv=Array.isArray(state.inventory)?state.inventory:[];
    return inv.find(x=>x.no===no)||ensureState();
  }

  function recipeArrays(){
    const candidates=[
      ["beverageRecipes",state.beverageRecipes],
      ["recipes",state.recipes],
      ["getraenkeRezepte",state.getraenkeRezepte],
      ["drinkRecipes",state.drinkRecipes]
    ];
    return candidates.filter(([,a])=>Array.isArray(a));
  }
  function allRecipes(){
    const seen=new Set(), out=[];
    recipeArrays().forEach(([source,arr])=>arr.forEach((r,i)=>{
      const id=String(r.id||r.recipeId||r.no||r.sku||`${source}-${i}`);
      if(seen.has(id)) return; seen.add(id);
      out.push({id,name:String(r.name||r.title||r.bezeichnung||id),source,obj:r});
    }));
    return out;
  }

  function syncRecipeObjects(){
    const links=state.servingWareRecipeLinks||[];
    allRecipes().forEach(r=>{
      const link=links.find(l=>l.recipeId===r.id && l.servingWareId===SERVING_ID);
      if(!link) return;
      r.obj.servingWareId=SERVING_ID;
      r.obj.servingWareInventoryNo=ensureState().no;
      r.obj.servingType="Ausgabegeschirr";
      r.obj.servingKind="Glas";
      r.obj.servingCapacityLiters=0.2;
    });
  }

  function assignRecipe(recipeId,recipeName,source="manual"){
    ensureState();
    recipeId=String(recipeId||"").trim(); recipeName=String(recipeName||recipeId).trim();
    if(!recipeId) throw new Error("Rezept-ID fehlt");
    const exists=state.servingWareRecipeLinks.some(l=>l.recipeId===recipeId && l.servingWareId===SERVING_ID);
    if(!exists) state.servingWareRecipeLinks.push({recipeId,recipeName,source,servingWareId:SERVING_ID,usageType:"Ausgabegeschirr",servingKind:"Glas",capacityLiters:0.2,inventoryNo:ensureState().no});
    const item=ensureState();
    if(!item.recipeRefs.some(r=>r.recipeId===recipeId)) item.recipeRefs.push({recipeId,recipeName,source});
    syncRecipeObjects(); save(); renderUsage();
    return !exists;
  }
  function removeRecipe(recipeId){
    state.servingWareRecipeLinks=(state.servingWareRecipeLinks||[]).filter(l=>!(l.recipeId===recipeId&&l.servingWareId===SERVING_ID));
    const item=ensureState(); item.recipeRefs=(item.recipeRefs||[]).filter(r=>r.recipeId!==recipeId);
    save(); renderUsage();
  }
  function servingWareForRecipe(recipeId){
    const link=(state.servingWareRecipeLinks||[]).find(l=>l.recipeId===String(recipeId)&&l.servingWareId===SERVING_ID);
    return link?{...link,inventory:ensureState()}:null;
  }
  function exportForPCManager(){
    return {schema:"KC_SERVING_WARE_V1",createdAt:new Date().toISOString(),servingWare:[{
      id:SERVING_ID,inventoryNo:ensureState().no,name:NAME,usageType:"Ausgabegeschirr",kind:"Glas",capacityLiters:0.2,
      deposit:ensureState().deposit,recipeLinks:(state.servingWareRecipeLinks||[]).filter(l=>l.servingWareId===SERVING_ID)
    }]};
  }

  function addCss(){
    if($("#kcInventoryPhotoServingCss")) return;
    const st=document.createElement("style"); st.id="kcInventoryPhotoServingCss";
    st.textContent=`
      #inv934Photos,#inv934Usage{padding:4px 0 8px}
      .kc-inv-photo-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin:14px 0}
      .kc-inv-photo{border:1px solid #d9e2da;border-radius:12px;padding:10px;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.06)}
      .kc-inv-photo img{display:block;width:100%;height:190px;object-fit:contain;background:#f3efe7;border-radius:8px}
      .kc-inv-photo small{display:block;margin-top:8px;font-weight:700}
      .kc-serving-card{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px;margin:12px 0}
      .kc-serving-card>div{border:1px solid #dfe8de;border-radius:10px;padding:10px;background:#f8fbf8}
      .kc-serving-card span{display:block;font-size:12px;color:#657067}.kc-serving-card strong{display:block;margin-top:3px}
      .kc-recipe-links{margin-top:14px}.kc-recipe-row{display:flex;gap:10px;align-items:center;border-bottom:1px solid #e5ebe5;padding:8px 0}
      .kc-recipe-row span{flex:1}.kc-photo-actions,.kc-recipe-add{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
      .kc-recipe-add label{min-width:180px;flex:1}
      @media(max-width:900px){.kc-serving-card{grid-template-columns:repeat(2,1fr)}}
    `; document.head.appendChild(st);
  }

  function ensureTabs(){
    const view=$("#inventoryV2"); if(!view) return false;
    const tabs=$(".inventory-tabs",view); if(!tabs) return false;
    if(!$("[data-inv934-tab='photos']",tabs)) tabs.insertAdjacentHTML("beforeend",'<button class="tab" data-inv934-tab="photos"><span class="kng934-inv-menu">☰</span><span>Fotos</span></button>');
    if(!$("[data-inv934-tab='usage']",tabs)) tabs.insertAdjacentHTML("beforeend",'<button class="tab" data-inv934-tab="usage"><span class="kng934-inv-menu">☰</span><span>Verwendung / Rezepte</span></button>');
    const footer=$(".inventory-footer-buttons",view);
    if(!$("#inv934Photos",view)) footer.insertAdjacentHTML("beforebegin",'<div id="inv934Photos" class="inventory-tab-panel hidden"><h4>Fotos zum Inventarartikel</h4><p class="hint small">Fotos gehören zu diesem Inventarartikel und werden nicht zwischen die Stammdatenfelder gemischt.</p><div id="kcInvPhotoGallery" class="kc-inv-photo-gallery"></div><div class="kc-photo-actions"><label>Foto hinzufügen<input id="kcInvPhotoFile" type="file" accept="image/*" capture="environment" multiple></label></div></div>');
    if(!$("#inv934Usage",view)) footer.insertAdjacentHTML("beforebegin",'<div id="inv934Usage" class="inventory-tab-panel hidden"><h4>Verwendung / Getränkerezepte</h4><div id="kcServingSummary"></div><div id="kcRecipeAssignment"></div></div>');
    return true;
  }

  function selectTab(key){
    const view=$("#inventoryV2"); if(!view) return;
    $$(".inventory-tabs .tab",view).forEach(t=>t.classList.toggle("active",t.dataset.inv934Tab===key));
    const panels={card:"inv934Card",list:"inv934List",photos:"inv934Photos",usage:"inv934Usage"};
    Object.entries(panels).forEach(([k,id])=>{ const p=$("#"+id); if(p){ p.classList.toggle("hidden",k!==key); p.classList.toggle("active",k===key); }});
    if(key==="photos") renderPhotos(); if(key==="usage") renderUsage();
  }

  function renderPhotos(){
    const item=currentItem(); const box=$("#kcInvPhotoGallery"); if(!box) return;
    const photos=Array.isArray(item.photos)?item.photos:[];
    box.innerHTML=photos.length?photos.map((p,i)=>`<figure class="kc-inv-photo"><img src="${esc(p.src)}" alt="${esc(p.label||item.name)}"><small>${esc(p.label||`Foto ${i+1}`)}</small>${p.kind==='reference'?'':`<button type="button" class="danger" data-kc-photo-remove="${i}">Foto entfernen</button>`}</figure>`).join(""):'<p class="muted">Noch kein Foto hinterlegt.</p>';
  }

  function fileToPhoto(file){
    return new Promise((resolve,reject)=>{
      if(!file.type.startsWith("image/")) return reject(new Error("Keine Bilddatei"));
      const reader=new FileReader(); reader.onerror=()=>reject(reader.error); reader.onload=()=>{
        const img=new Image(); img.onerror=()=>reject(new Error("Bild konnte nicht gelesen werden")); img.onload=()=>{
          const max=1280, scale=Math.min(1,max/Math.max(img.width,img.height));
          const c=document.createElement("canvas"); c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
          c.getContext("2d").drawImage(img,0,0,c.width,c.height);
          let src=c.toDataURL("image/jpeg",.78);
          if(src.length*0.75>MAX_PHOTO_BYTES) src=c.toDataURL("image/jpeg",.58);
          resolve({id:"photo-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),label:file.name||"Inventarfoto",src,kind:"user"});
        }; img.src=reader.result;
      }; reader.readAsDataURL(file);
    });
  }

  async function addPhotos(files){
    const item=currentItem(); item.photos=Array.isArray(item.photos)?item.photos:[];
    const remaining=Math.max(0,MAX_PHOTOS-item.photos.length); const selected=Array.from(files||[]).slice(0,remaining);
    for(const f of selected){ try{ item.photos.push(await fileToPhoto(f)); }catch(e){ console.warn(e); } }
    save(); renderPhotos(); toast("Inventarfoto(s) gespeichert.");
  }

  function renderUsage(){
    const item=currentItem(); const summary=$("#kcServingSummary"), box=$("#kcRecipeAssignment"); if(!summary||!box) return;
    const isServing=item.servingWareId===SERVING_ID;
    summary.innerHTML=isServing?`<div class="kc-serving-card"><div><span>Benutzung</span><strong>Ausgabegeschirr</strong></div><div><span>Art</span><strong>Glas</strong></div><div><span>Füllmenge</span><strong>0,2 l</strong></div><div><span>Referenz</span><strong>${esc(SERVING_ID)}</strong></div></div>`:'<p class="muted">Für diesen Artikel ist noch keine Ausgabegeschirr-Rolle hinterlegt.</p>';
    const recipes=allRecipes(); const links=(state.servingWareRecipeLinks||[]).filter(l=>l.servingWareId===SERVING_ID);
    const select=recipes.length?`<label>Vorhandenes Getränkerezept<select id="kcRecipeSelect"><option value="">– auswählen –</option>${recipes.map(r=>`<option value="${esc(r.id)}" data-name="${esc(r.name)}" data-source="${esc(r.source)}">${esc(r.name)} (${esc(r.id)})</option>`).join("")}</select></label>`:'';
    box.innerHTML=`<div class="kc-recipe-add">${select}<label>Rezept-ID / Artikel-ID<input id="kcRecipeId" placeholder="z. B. GLUEHWEIN-ROT"></label><label>Getränk / Rezeptname<input id="kcRecipeName" placeholder="z. B. Glühwein rot"></label><button id="kcRecipeAdd" type="button" class="primary">Mit diesem Glas verknüpfen</button></div><div class="kc-recipe-links"><h4>Verknüpfte Getränkerezepte</h4>${links.length?links.map(l=>`<div class="kc-recipe-row"><span><strong>${esc(l.recipeName||l.recipeId)}</strong><br><small>${esc(l.recipeId)} · Ausgabegeschirr: Glas 0,2 l</small></span><button type="button" class="danger" data-kc-recipe-remove="${esc(l.recipeId)}">Lösen</button></div>`).join(""):'<p class="muted">Noch kein Getränkerezept verknüpft.</p>'}</div>`;
  }

  function bind(){
    const view=$("#inventoryV2"); if(!view||view.dataset.kcServingPhotosBound==="1") return;
    view.dataset.kcServingPhotosBound="1";
    view.addEventListener("click",ev=>{
      const tab=ev.target.closest("[data-inv934-tab='photos'],[data-inv934-tab='usage']"); if(tab){ ev.preventDefault(); ev.stopPropagation(); selectTab(tab.dataset.inv934Tab); return; }
      const rm=ev.target.closest("[data-kc-photo-remove]"); if(rm){ const item=currentItem(); item.photos.splice(Number(rm.dataset.kcPhotoRemove),1); save(); renderPhotos(); return; }
      const rr=ev.target.closest("[data-kc-recipe-remove]"); if(rr){ removeRecipe(rr.dataset.kcRecipeRemove); return; }
      if(ev.target.closest("#kcRecipeAdd")){
        const sel=$("#kcRecipeSelect"); let id=$("#kcRecipeId")?.value.trim()||"", name=$("#kcRecipeName")?.value.trim()||"", source="manual";
        if(sel?.value){ id=sel.value; const o=sel.selectedOptions[0]; name=o.dataset.name||o.textContent; source=o.dataset.source||"state"; }
        if(!id){ toast("Bitte Rezept auswählen oder Rezept-ID eintragen.","warning"); return; }
        assignRecipe(id,name||id,source); toast("Getränkerezept mit Ausgabegeschirr verknüpft."); return;
      }
    },true);
    view.addEventListener("change",ev=>{ if(ev.target.id==="kcInvPhotoFile"){ addPhotos(ev.target.files); ev.target.value=""; } if(ev.target.id==="kcRecipeSelect"&&ev.target.value){ const o=ev.target.selectedOptions[0]; if($("#kcRecipeId")) $("#kcRecipeId").value=ev.target.value; if($("#kcRecipeName")) $("#kcRecipeName").value=o.dataset.name||""; }});
  }

  function install(){
    addCss(); ensureState(); syncRecipeObjects();
    if(ensureTabs()){ bind(); }
  }

  const observer=new MutationObserver(()=>install());
  document.addEventListener("DOMContentLoaded",()=>{ install(); observer.observe(document.body,{childList:true,subtree:true}); setTimeout(install,500); });
  if(document.readyState!=="loading") setTimeout(()=>{ install(); observer.observe(document.body,{childList:true,subtree:true}); },0);

  window.KCServingWare={
    id:SERVING_ID, ensure:ensureState, assignRecipe, removeRecipe, servingWareForRecipe,
    exportForPCManager, syncRecipeObjects,
    describe:()=>({id:SERVING_ID,name:NAME,usageType:"Ausgabegeschirr",kind:"Glas",capacityLiters:0.2})
  };
})();
