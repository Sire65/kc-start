(function(){
  "use strict";

  const storageKey = "kng_layout_sizes_v1";
  const defaults = { sidebarWidth: 260, memberSearchWidth: 340, memberSearchHeight: 560, addressSearchHeight: 560 };
  const state = { active: null };

  function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }

  function loadSizes(){
    try{ return Object.assign({}, defaults, JSON.parse(localStorage.getItem(storageKey) || "{}")); }
    catch(_){ return Object.assign({}, defaults); }
  }
  function saveSizes(sizes){ try{ localStorage.setItem(storageKey, JSON.stringify(sizes)); }catch(_){} }

  function setCssVar(name, value){ document.documentElement.style.setProperty(name, `${value}px`); }

  function syncLayoutClasses(){
    const sizes = loadSizes();
    const sidebarWidth = clamp(Number(sizes.sidebarWidth)||defaults.sidebarWidth, 190, 420);
    const searchWidth = clamp(Number(sizes.memberSearchWidth)||defaults.memberSearchWidth, 250, 680);
    document.body.classList.toggle("sidebar-narrow", sidebarWidth < 245);
    document.body.classList.toggle("member-search-medium", searchWidth >= 420);
    document.body.classList.toggle("member-search-wide", searchWidth >= 520);
  }

  function applySizes(){
    const sizes = loadSizes();
    setCssVar("--sidebar-width", clamp(Number(sizes.sidebarWidth)||defaults.sidebarWidth, 190, 420));
    setCssVar("--member-search-width", clamp(Number(sizes.memberSearchWidth)||defaults.memberSearchWidth, 250, 680));
    setCssVar("--member-search-height", clamp(Number(sizes.memberSearchHeight)||defaults.memberSearchHeight, 260, 900));
    setCssVar("--address-search-height", clamp(Number(sizes.addressSearchHeight)||defaults.addressSearchHeight, 260, 900));
    syncLayoutClasses();
  }

  function beginResize(kind, ev){
    if(kind === "sidebar" && document.body.classList.contains("sidebar-collapsed")) return;
    const sizes = loadSizes();
    state.active = {
      kind,
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      startSidebar: Number(sizes.sidebarWidth)||defaults.sidebarWidth,
      startMemberWidth: Number(sizes.memberSearchWidth)||defaults.memberSearchWidth,
      startMemberHeight: Number(sizes.memberSearchHeight)||defaults.memberSearchHeight,
      startAddressHeight: Number(sizes.addressSearchHeight)||defaults.addressSearchHeight,
      handle: ev.currentTarget
    };
    state.active.handle?.classList.add("is-dragging");
    document.body.classList.add("is-resizing");
    try{ ev.currentTarget.setPointerCapture?.(ev.pointerId); }catch(_e){}
    ev.preventDefault();
  }

  function onPointerMove(ev){
    const a = state.active;
    if(!a) return;
    const sizes = loadSizes();
    if(a.kind === "sidebar"){
      const next = clamp(a.startSidebar + (ev.clientX - a.startX), 190, 420);
      sizes.sidebarWidth = next;
      setCssVar("--sidebar-width", next);
    }else if(a.kind === "memberWidth"){
      const next = clamp(a.startMemberWidth - (ev.clientX - a.startX), 250, 680);
      sizes.memberSearchWidth = next;
      setCssVar("--member-search-width", next);
    }else if(a.kind === "memberHeight"){
      const next = clamp(a.startMemberHeight + (ev.clientY - a.startY), 260, 900);
      sizes.memberSearchHeight = next;
      setCssVar("--member-search-height", next);
    }else if(a.kind === "addressHeight"){
      const next = clamp(a.startAddressHeight + (ev.clientY - a.startY), 260, 900);
      sizes.addressSearchHeight = next;
      setCssVar("--address-search-height", next);
    }
    saveSizes(sizes);
    syncLayoutClasses();
  }

  function endResize(ev){
    const a = state.active;
    if(!a) return;
    a.handle?.classList.remove("is-dragging");
    document.body.classList.remove("is-resizing");
    try{ a.handle?.releasePointerCapture?.(a.pointerId); }catch(_e){}
    state.active = null;
    applySizes();
  }

  function bindHandle(id, kind){
    const el = document.getElementById(id);
    if(!el || el.dataset.kngResizeBound === "1") return;
    el.dataset.kngResizeBound = "1";
    el.addEventListener("pointerdown", (ev)=>beginResize(kind, ev));
  }

  function bindAll(){
    applySizes();
    bindHandle("sidebarResizer", "sidebar");
    bindHandle("memberSearchResizer", "memberWidth");
    bindHandle("memberSearchHeightResizer", "memberHeight");
    bindHandle("addressSearchHeightResizer", "addressHeight");
  }

  function init(){
    bindAll();
    window.addEventListener("pointermove", onPointerMove, {passive:false});
    window.addEventListener("pointerup", endResize, {passive:true});
    window.addEventListener("pointercancel", endResize, {passive:true});
    window.addEventListener("blur", endResize, {passive:true});
    document.addEventListener("click", ()=>setTimeout(bindAll, 0), true);
    if(window.MutationObserver){
      const mo = new MutationObserver(()=>bindAll());
      mo.observe(document.body, {childList:true, subtree:true});
    }
    if("ResizeObserver" in window){
      const memberList = document.querySelector(".member-list");
      if(memberList){ new ResizeObserver(()=>syncLayoutClasses()).observe(memberList); }
    }
  }

  window.KNGLayoutSizes = { applySizes, syncLayoutClasses, bindAll };
  document.addEventListener("DOMContentLoaded", init, {once:true});
})();
