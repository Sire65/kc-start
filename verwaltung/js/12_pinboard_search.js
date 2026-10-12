/* Phase 9.9 – Suchfeld löschen, digitale Uhr und verschiebbare Pinnwand */
(function(){
  function ensureUi(){ if(!state.ui) state.ui={}; }
  function saveUi(){ if(typeof saveState === "function") saveState(); }
  function userPrefs(){ try{ return (typeof getUserPrefsObject==="function") ? getUserPrefsObject() : (state.userPrefs[state.session.userName||"Gast"] ||= {}); }catch(e){ return {}; } }
  function pinIsShared(){ return !!state.ui?.pinboardShared; }
  function pinData(){
    ensureUi();
    if(pinIsShared()) return state.ui;
    const p=userPrefs();
    if(!p.pinboard || typeof p.pinboard!=="object") p.pinboard={enabled:false,text:"",x:null,y:null};
    return p.pinboard;
  }
  function syncGlobalFromCurrent(){
    const d=pinData();
    state.ui.pinboardEnabled=!!d.enabled;
    state.ui.pinboardText=String(d.text||"");
    state.ui.pinboardX=d.x??null;
    state.ui.pinboardY=d.y??null;
  }
  function commitCurrentFromDom(){
    const d=pinData();
    d.enabled=!!document.getElementById("pinboardToggle")?.checked;
    d.text=String(document.getElementById("pinboardText")?.value||"");
    const w=document.getElementById("pinboardWidget");
    if(w){ const r=w.getBoundingClientRect(); d.x=Math.round(r.left); d.y=Math.round(r.top); }
    syncGlobalFromCurrent();
  }
  function hasText(){ return !!String(pinData().text||"").trim(); }
  function renderSearchClear(){
    const input=document.getElementById("memberSearch");
    const clear=document.getElementById("clearMemberSearch");
    if(!input || !clear) return;
    clear.classList.toggle("hidden",!String(input.value||"").trim());
  }
  function bindSearchClear(){
    const input=document.getElementById("memberSearch");
    const clear=document.getElementById("clearMemberSearch");
    if(!input || !clear || clear.dataset.bound) return;
    clear.dataset.bound="1";
    input.addEventListener("input",renderSearchClear);
    clear.addEventListener("click",()=>{
      input.value="";
      renderSearchClear();
      if(typeof renderMembers==="function") renderMembers();
      input.focus();
    });
    renderSearchClear();
  }
  function applyPinboardPosition(){
    const w=document.getElementById("pinboardWidget");
    if(!w) return;
    const d=pinData(); const x=Number(d.x), y=Number(d.y);
    if(Number.isFinite(x) && Number.isFinite(y)){
      w.style.left=Math.max(8,Math.min(window.innerWidth-80,x))+"px";
      w.style.top=Math.max(8,Math.min(window.innerHeight-80,y))+"px";
      w.style.right="auto";
    }
  }
  function renderPinboard(){
    ensureUi(); syncGlobalFromCurrent();
    const toggle=document.getElementById("pinboardToggle");
    const label=document.getElementById("pinboardSwitchLabel");
    const widget=document.getElementById("pinboardWidget");
    const text=document.getElementById("pinboardText");
    const pin=document.getElementById("pinboardPin");
    const d=pinData();
    if(toggle) toggle.checked=!!d.enabled;
    if(label){
      label.classList.toggle("pinboard-label-active",hasText());
      label.title=hasText()?"Pinnwand enthält eine Notiz":"Pinnwand ist leer";
    }
    if(widget){
      widget.classList.toggle("hidden",!d.enabled);
      widget.classList.toggle("pinboard-empty",!hasText());
      applyPinboardPosition();
    }
    if(text && text.value!==String(d.text||"")) text.value=String(d.text||"");
    const shared=document.getElementById("pinboardShared"); if(shared) shared.checked=pinIsShared();
    if(pin){
      pin.classList.toggle("pin-has-text",hasText());
      pin.title=hasText()?"Notiz vorhanden":"Keine Notiz vorhanden";
    }
  }
  function bindPinboard(){
    ensureUi();
    const toggle=document.getElementById("pinboardToggle");
    const close=document.getElementById("closePinboard");
    const save=document.getElementById("savePinboardNote");
    const clear=document.getElementById("clearPinboardNote");
    const text=document.getElementById("pinboardText");
    const widget=document.getElementById("pinboardWidget");
    if(toggle && !toggle.dataset.bound){
      toggle.dataset.bound="1";
      toggle.addEventListener("change",()=>{
        if(!state.session?.isLoggedIn){ toggle.checked=false; toast?.("Bitte zuerst anmelden.","info"); return; }
        const d=pinData(); d.enabled=toggle.checked; syncGlobalFromCurrent(); saveUi(); renderPinboard();
      });
    }
    if(close && !close.dataset.bound){
      close.dataset.bound="1";
      close.addEventListener("click",()=>{ const d=pinData(); d.enabled=false; syncGlobalFromCurrent(); saveUi(); renderPinboard(); });
    }
    if(save && !save.dataset.bound){
      save.dataset.bound="1";
      save.addEventListener("click",()=>{ const d=pinData(); d.text=String(text?.value||""); syncGlobalFromCurrent(); saveUi(); renderPinboard(); toast?.("Pinnwand gespeichert.","success"); });
    }
    if(clear && !clear.dataset.bound){
      clear.dataset.bound="1";
      clear.addEventListener("click",()=>{ const d=pinData(); d.text=""; if(text) text.value=""; syncGlobalFromCurrent(); saveUi(); renderPinboard(); toast?.("Pinnwand gelöscht.","info"); });
    }
    if(text && !text.dataset.bound){
      text.dataset.bound="1";
      text.addEventListener("input",()=>{
        const pin=document.getElementById("pinboardPin");
        if(pin) pin.classList.toggle("pin-has-text",!!String(text.value||"").trim());
      });
    }
    const shared=document.getElementById("pinboardShared");
    if(shared && !shared.dataset.bound){
      shared.dataset.bound="1";
      shared.addEventListener("change",()=>{ state.ui.pinboardShared=!!shared.checked; syncGlobalFromCurrent(); saveUi(); renderPinboard(); toast?.(state.ui.pinboardShared?"Pinnwand ist jetzt für alle sichtbar.":"Pinnwand ist jetzt persönlich.","info"); });
    }
    if(widget && !widget.dataset.dragBound){
      widget.dataset.dragBound="1";
      let dragging=false, sx=0, sy=0, ox=0, oy=0;
      widget.addEventListener("pointerdown",e=>{
        if(e.target.closest("textarea,button")) return;
        dragging=true; sx=e.clientX; sy=e.clientY;
        const r=widget.getBoundingClientRect(); ox=r.left; oy=r.top;
        widget.setPointerCapture?.(e.pointerId);
      });
      widget.addEventListener("pointermove",e=>{
        if(!dragging) return;
        const nx=Math.max(8,Math.min(window.innerWidth-widget.offsetWidth-8,ox+e.clientX-sx));
        const ny=Math.max(8,Math.min(window.innerHeight-widget.offsetHeight-8,oy+e.clientY-sy));
        widget.style.left=nx+"px"; widget.style.top=ny+"px"; widget.style.right="auto";
      });
      widget.addEventListener("pointerup",()=>{
        if(!dragging) return; dragging=false;
        const d=pinData(); const r=widget.getBoundingClientRect(); d.x=Math.round(r.left); d.y=Math.round(r.top); syncGlobalFromCurrent(); saveUi();
      });
    }
    renderPinboard();
  }
  const oldRenderAll=window.renderAll;
  if(typeof oldRenderAll==="function") window.renderAll=function(){ const r=oldRenderAll.apply(this,arguments); bindSearchClear(); bindPinboard(); return r; };
  const oldApplyColors=window.applyColors;
  if(typeof oldApplyColors==="function") window.applyColors=function(){ const r=oldApplyColors.apply(this,arguments); renderPinboard(); return r; };
  kngReadyOnce('pinboard-search-bind', ()=>{ bindSearchClear(); bindPinboard(); });
  bindSearchClear(); bindPinboard();
})();
