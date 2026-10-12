
/* Clean Master Test 17: zentrale App-/Manager-Schicht
   Ziel: ein definierter Startpunkt, zentrale Event-/Observer-/Timer-Verwaltung
   und keine weiteren freien Patch-Bootstraps. */
(function(){
  if(window.KNG_MANAGERS_READY) return;
  window.KNG_MANAGERS_READY = true;

  const initRegistry = [];
  const initKeys = new Set();

  window.EventManager = {
    bind(el, type, key, handler, options){
      if(!el || typeof handler !== 'function') return false;
      const attr = 'kngEvt_' + String(type).replace(/[^a-z0-9]/gi,'_') + '_' + String(key||handler.name||'handler').replace(/[^a-z0-9]/gi,'_');
      if(el.dataset && el.dataset[attr]) return false;
      if(el.dataset) el.dataset[attr] = '1';
      handler.__kngListenerKey = String(key || handler.name || 'handler');
      el.addEventListener(type, handler, options);
      return true;
    },
    delegate(root, type, selector, key, handler, options){
      return this.bind(root, type, 'delegate_'+selector+'_'+key, function(ev){
        const target = ev.target && ev.target.closest ? ev.target.closest(selector) : null;
        if(target && root.contains(target)) handler.call(target, ev, target);
      }, options);
    }
  };

  window.ObserverManager = {
    _items: new Map(),
    observe(key, target, options, callback){
      if(!target || typeof MutationObserver === 'undefined' || typeof callback !== 'function') return null;
      this.disconnect(key);
      const obs = new MutationObserver(callback);
      obs.observe(target, options || {childList:true, subtree:true});
      this._items.set(key, obs);
      return obs;
    },
    disconnect(key){
      const obs=this._items.get(key);
      if(obs){ try{ obs.disconnect(); }catch(_){} this._items.delete(key); }
    },
    disconnectAll(){
      Array.from(this._items.keys()).forEach(k=>this.disconnect(k));
    }
  };

  window.TimerManager = {
    _items: new Map(),
    interval(key, fn, ms){
      this.clear(key);
      if(typeof fn !== 'function') return null;
      const id = setInterval(fn, ms);
      this._items.set(key, id);
      return id;
    },
    timeout(key, fn, ms){
      this.clear(key);
      if(typeof fn !== 'function') return null;
      const id = setTimeout(()=>{ this._items.delete(key); fn(); }, ms);
      this._items.set(key, id);
      return id;
    },
    clear(key){
      const id=this._items.get(key);
      if(id){ clearInterval(id); clearTimeout(id); this._items.delete(key); }
    },
    clearAll(){ Array.from(this._items.keys()).forEach(k=>this.clear(k)); }
  };

  window.SearchManager = {
    updateMemberCounter(){
      const counter=document.getElementById('memberSearchCounter');
      if(!counter) return;
      const rows=Array.from(document.querySelectorAll('#membersTable tr[data-id]'));
      let visible=rows.length;
      let selected=rows.filter(r=>r.querySelector('input.member-row-select:checked')).length;
      if(visible===0 && window.state && Array.isArray(state.members)){
        const q=(document.getElementById('memberSearch')?.value||'').trim().toLowerCase();
        const list=state.members.filter(m=>!q || `${m.memberNo||''} ${m.firstName||''} ${m.lastName||''} ${m.city||''} ${m.profession||''} ${m.email||''}`.toLowerCase().includes(q));
        visible=list.length;
        if(window.selectedMemberIds && typeof window.selectedMemberIds.forEach==='function'){
          const ids=new Set(list.map(m=>String(m.id)));
          selected=0; window.selectedMemberIds.forEach(id=>{ if(ids.has(String(id))) selected++; });
        }
      }
      counter.textContent=`${selected}/${visible}`;
      counter.title=`${selected} markiert von ${visible} sichtbaren Mitgliedern`;
    },
    init(){
      const schedule=()=>Promise.resolve().then(()=>SearchManager.updateMemberCounter());
      EventManager.bind(document,'change','search-member-counter-change',ev=>{
        if(ev.target.closest && (ev.target.closest('#membersTable') || ev.target.id==='memberSelectAllVisible')) schedule();
      },true);
      EventManager.bind(document,'input','search-member-counter-input',ev=>{
        if(ev.target.id==='memberSearch') schedule();
      },true);
      const table=document.getElementById('membersTable');
      if(table) ObserverManager.observe('members-table-counter',table,{childList:true,subtree:true},schedule);
      schedule();
    }
  };

  window.LayoutManager = {
    init(){
      document.body.classList.add('kng-layout-managed');
      if(typeof window.applyNavIconVisibility==='function') window.applyNavIconVisibility();
      if(typeof window.updateMemberSearchCounterV14==='function') window.updateMemberSearchCounterV14();
    }
  };

  window.App = {
    registerInit(key, fn){
      if(!key || typeof fn !== 'function' || initKeys.has(key)) return;
      initKeys.add(key);
      initRegistry.push({key, fn});
    },
    init(){
      if(this._started) return;
      this._started = true;
      initRegistry.forEach(item=>{
        try{ item.fn(); }catch(err){ console.error('App.init Fehler:', item.key, err); }
      });
      try{ SearchManager.init(); }catch(err){ console.error('SearchManager.init',err); }
      try{ LayoutManager.init(); }catch(err){ console.error('LayoutManager.init',err); }
    },
    ready(fn){
      const run=()=>{ try{ fn(); }catch(err){ console.error('App.ready Fehler',err); } };
      if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
    }
  };

  window.kngBindOnce = window.kngBindOnce || ((el,type,key,handler,options)=>EventManager.bind(el,type,key,handler,options));
  window.kngReadyOnce = window.kngReadyOnce || function(key, fn){
    window.__kngReadyKeys = window.__kngReadyKeys || new Set();
    if(window.__kngReadyKeys.has(key)) return;
    window.__kngReadyKeys.add(key);
    App.ready(fn);
  };
})();


/* Zentrales Event-Management: verhindert doppelte Handler nach der Konsolidierung. */
(function(){
  if(window.__KNG_EVENT_CORE__) return;
  window.__KNG_EVENT_CORE__ = true;
  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  const registry = new WeakMap();
  function stableListenerKey(listener){
    if(!listener) return 'null';
    if(listener.__kngListenerKey) return listener.__kngListenerKey;
    if(typeof listener === 'function'){
      const name = listener.name || 'anonymous';
      const text = Function.prototype.toString.call(listener).replace(/\s+/g,' ').slice(0,220);
      return name + ':' + text;
    }
    if(listener && typeof listener.handleEvent === 'function'){
      return 'handleEvent:' + Function.prototype.toString.call(listener.handleEvent).replace(/\s+/g,' ').slice(0,220);
    }
    return String(listener);
  }
  function optionsKey(options){
    if(options === true) return 'capture';
    if(!options) return 'bubble';
    return [options.capture?'capture':'bubble', options.once?'once':'multi', options.passive?'passive':'active'].join(':');
  }
  EventTarget.prototype.addEventListener = function(type, listener, options){
    if(!listener) return originalAdd.call(this,type,listener,options);
    const key = String(type)+'|'+optionsKey(options)+'|'+stableListenerKey(listener);
    let set = registry.get(this);
    if(!set){ set = new Set(); registry.set(this,set); }
    if(set.has(key)) return;
    set.add(key);
    return originalAdd.call(this,type,listener,options);
  };
  EventTarget.prototype.removeEventListener = function(type, listener, options){
    return originalRemove.call(this,type,listener,options);
  };
  window.kngBindOnce = function(element, type, key, handler, options){
    if(!element || !handler) return false;
    const attr = 'kngBound_' + String(type).replace(/[^a-z0-9]/gi,'_') + '_' + String(key||handler.name||'handler').replace(/[^a-z0-9]/gi,'_');
    if(element.dataset && element.dataset[attr]) return false;
    if(element.dataset) element.dataset[attr] = '1';
    handler.__kngListenerKey = String(key || handler.name || 'handler');
    element.addEventListener(type, handler, options);
    return true;
  };
  window.kngReadyOnce = function(key, fn){
    window.__kngReadyKeys = window.__kngReadyKeys || new Set();
    if(window.__kngReadyKeys.has(key)) return;
    window.__kngReadyKeys.add(key);
    const run = () => { try{ fn(); }catch(err){ console.error('KNG Init Fehler:', key, err); } };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
    else run();
  };
})();

/* Grundlegende Oberfläche, Ansichten, Login-Dialogumgebung, Uhr, Ortsdaten */
function toast(message,type="info"){
  const level=getSessionMessageLevel();
  // Meldungsstufe 1: nur Fehler; Stufe 2: Fehler/Warnungen; Stufe 3: alle Meldungen.
  if(state.session?.isLoggedIn){
    if(level===1 && type!=="error") return;
    if(level===2 && !["error","warn"].includes(type)) return;
  }
  const area=document.getElementById("toastArea");
  if(!area) return;
  const el=document.createElement("div");
  el.className=`toast ${type}`;
  el.textContent=String(message||"");
  area.appendChild(el);
  const sec=Number(state?.settings?.messageDisplaySeconds||localStorage.getItem('kng_message_display_seconds')||4)||4;
  const ms=Math.max(1,Math.min(60,Math.floor(sec)))*1000;
  const remove=()=>{ el.classList.add('is-hiding'); setTimeout(()=>el.remove(),220); };
  const id=setTimeout(remove,ms);
  el.addEventListener('click',()=>{ clearTimeout(id); remove(); });
}



/* Test 34: Zentrale Berechtigungslogik für Navigation, Sekretariat und direkte Modulaufrufe */
const KNG_VIEW_RIGHTS = {
  dashboard:null,
  guestHome:null,
  secretariat:"secretariat.view",
  members:"members.read",
  memberCards:"members.card",
  workwear:"members.read",
  communication:"communication.read",
  documents:"documents.read",
  activities:"activities.read",
  donations:"finance.read",
  finance:"finance.read",
  inventory:"inventory.read",
  inventoryV2:"inventory.read",
  keys:"inventory.read",
  addresses:"addresses.read",
  orders:"shopping.read",
  questionnaire:"questionnaire.read",
  assistant:"secretariat.view",
  settings:"settings.view",
  users:"settings.view",
  backup:"settings.view",
  systemCheck:"settings.view",
  protocol:"protocol.read"
};
const KNG_SECRETARY_ACTION_RIGHTS = {
  members:"members.read",
  memberCards:"members.card",
  email:"communication.read",
  documents:"documents.read",
  activities:"activities.read",
  questionnaire:"questionnaire.read",
  addresses:"addresses.read",
  inventory:"inventory.read",
  finance:"finance.read",
  phone:"addresses.read",
  reports:"protocol.read",
  communication:"communication.read"
};
function getCurrentRoleNames(){
  if(!state.session?.isLoggedIn) return ["Gast"];
  const key=String(state.session.userKey||"").trim().toLowerCase();
  const account=(state.roleAssignments||[]).find(a=>String(a.userName||"").trim().toLowerCase()===key);
  const roles=Array.isArray(account?.roles) && account.roles.length ? account.roles : [state.session.role||"Mitglied"];
  return [...new Set(roles.filter(Boolean))];
}
function getCurrentRights(){
  const rights=new Set();
  getCurrentRoleNames().forEach(role=>{
    (state.roles?.[role]?.rights||[]).forEach(r=>rights.add(r));
  });
  return rights;
}
function hasRight(right){
  if(!right) return true;
  if(isSystemOwner?.() || state.session?.role==="Systeminhaber") return true;
  const rights=getCurrentRights();
  return rights.has("*") || rights.has(right);
}
function requiredRightForView(viewId){ return KNG_VIEW_RIGHTS[viewId] || null; }
function canAccessView(viewId){
  if(!state.session?.isLoggedIn) return viewId==="guestHome";
  return hasRight(requiredRightForView(viewId));
}
function requiredRightForSecretaryAction(action){ return KNG_SECRETARY_ACTION_RIGHTS[action] || null; }
function canUseSecretaryAction(action){ return hasRight(requiredRightForSecretaryAction(action)); }
function applyPermissionVisibility(){
  const logged=!!state.session?.isLoggedIn;
  document.querySelectorAll('[data-view]').forEach(el=>{
    const view=el.dataset.view;
    if(!view) return;
    const allowed=logged && canAccessView(view);
    el.classList.toggle('permission-hidden', !allowed && view!=="guestHome");
    el.toggleAttribute('aria-hidden', !allowed && view!=="guestHome");
    if(el.tagName==='BUTTON') el.disabled = (!allowed && view!=="guestHome");
  });
  document.querySelectorAll('[data-secretary-action]').forEach(el=>{
    const action=el.dataset.secretaryAction;
    const allowed=logged && canUseSecretaryAction(action);
    el.classList.toggle('permission-hidden', !allowed);
    el.toggleAttribute('aria-hidden', !allowed);
    if(el.tagName==='BUTTON') el.disabled=!allowed;
  });
}
function firstAccessibleStartView(role){
  const configured=state.roles?.[role]?.startView || "secretariat";
  if(viewExists?.(configured) && canAccessView(configured)) return configured;
  const fallbacks=["secretariat","dashboard","members","communication","documents","activities"];
  return fallbacks.find(v=>viewExists?.(v) && canAccessView(v)) || "dashboard";
}

function showView(id){
  if(!state.session.isLoggedIn && id!=="guestHome"){
    showGuestHome();
    toast("Bitte zuerst anmelden. Daten werden im Gastmodus nicht angezeigt.","info");
    return false;
  }
  if(state.session.isLoggedIn && id==="guestHome") id="dashboard";
  if(!canAccessView(id)){
    toast("Keine Berechtigung für diese Funktion.","error");
    applyPermissionVisibility();
    return false;
  }
  if(!canLeaveCurrentView(id)) return false;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const target=document.getElementById(id);
  if(target) target.classList.add("active");
  if(id==="settings") renderSettings();
  if(id==="activities") renderActivities();
  if(id==="workwear" && typeof renderWorkwear === "function") renderWorkwear();
  if(id==="donations") renderDonations();
  if(id==="communication" && typeof renderCommunication === "function") renderCommunication();
  if(id==="documents" && window.DocumentsCore?.render) window.DocumentsCore.render();
  if(id==="assistant") renderAssistant();
  if(id==="users") renderUsersRights();
  if(id==="protocol") renderProtocol();
  document.querySelectorAll(".nav[data-view]").forEach(n=>n.classList.toggle("active",n.dataset.view===id));
  applyPermissionVisibility();
  updateStatusBar();
  return true;
}

function showGuestHome(){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById("guestHome")?.classList.add("active");
  document.querySelectorAll(".nav[data-view]").forEach(n=>n.classList.remove("active"));
  updateGuestHome();
  updateStatusBar();
}

function updateGuestHome(){
  const name=(state.settings.clubName || "Köcheclub").trim() || "Köcheclub";
  const title=document.getElementById("guestGreetingTitle");
  const intro=document.getElementById("guestIntroText");
  const copy=document.getElementById("guestCopyright");
  if(title) title.textContent="Guten Tag Gast";
  if(intro) intro.textContent=`Du befindest dich auf der Startseite des ${name}. Bitte melde dich mit deiner E-Mail-Adresse und deinem Passwort an.`;
  renderGuestPasswordRules();
  if(copy) copy.textContent=`Copyright 1991 - 2026, ${name}, Alle Rechte reserviert.`;
}

function activeViewId(){
  return document.querySelector(".view.active")?.id || "dashboard";
}

function canLeaveCurrentView(nextViewId){
  if(!state.session.isLoggedIn) return true;
  const current=activeViewId();
  if(current===nextViewId) return true;
  if(current==="guestHome") return true;
  if(current==="members" && !confirmLeaveMember()) return false;
  if(current==="settings" && !confirmLeaveSettings()) return false;
  return true;
}

function login(){
  const dlg=document.getElementById("loginDialog");
  const userInput=document.getElementById("loginUserName");
  const passInput=document.getElementById("loginPassword");
  if(!dlg || !passInput){
    const user=prompt("Benutzername eingeben:") || "";
    const pass=prompt("Passwort eingeben:");
    if(pass!==null) doLogin(user,pass);
    return;
  }
  if(userInput) userInput.value="";
  passInput.value="";
  passInput.type="password";
  const eye=document.getElementById("toggleLoginPassword");
  if(eye){
    eye.textContent="👁️‍🗨️";
    eye.title="Passwort anzeigen";
  }
  dlg.showModal();
  setTimeout(()=>userInput ? userInput.focus() : passInput.focus(),50);
}


function getPasswordRulesHtml(){
  return `<ul class="password-rules">
    <li>mindestens 8 Zeichen</li>
    <li>erster Buchstabe groß</li>
    <li>mindestens 1 Zahl</li>
    <li>mindestens 1 Sonderzeichen</li>
  </ul>`;
}

function renderGuestPasswordRules(){
  const box=document.getElementById("guestPasswordRules");
  if(box){
    box.innerHTML=`<strong>Passwortregeln bei der ersten Anmeldung:</strong>${getPasswordRulesHtml()}<p class="hint">Wenn noch kein Passwort vergeben wurde, wirst du bei der ersten Anmeldung automatisch zur Passwortvergabe aufgefordert.</p>`;
  }
}

function validatePasswordRules(password){
  const text=String(password||"");
  if(text.length<8) return "Das Passwort muss mindestens 8 Zeichen haben.";
  if(!/^[A-ZÄÖÜ]/.test(text)) return "Der erste Buchstabe muss groß sein.";
  if(!/[0-9]/.test(text)) return "Das Passwort muss mindestens eine Zahl enthalten.";
  if(!/[^A-Za-zÄÖÜäöüß0-9]/.test(text)) return "Das Passwort muss mindestens ein Sonderzeichen enthalten.";
  return "";
}

function openPasswordSetup(userName){
  pendingPasswordSetupUser=String(userName||"").trim().toLowerCase();
  const dlg=document.getElementById("passwordSetupDialog");
  const rules=document.getElementById("passwordSetupRules");
  const mail=document.getElementById("passwordSetupUserMail");
  const p1=document.getElementById("newUserPassword");
  const p2=document.getElementById("newUserPasswordRepeat");
  if(mail) mail.textContent=pendingPasswordSetupUser;
  if(rules) rules.innerHTML=getPasswordRulesHtml();
  if(p1){p1.value="";p1.type="password";}
  if(p2){p2.value="";p2.type="password";}
  if(dlg && typeof dlg.showModal==="function"){
    dlg.showModal();
    setTimeout(()=>p1?.focus(),50);
  }else{
    const password=prompt("Bitte neues Passwort vergeben.\nMindestens 8 Zeichen, erster Buchstabe groß, mindestens 1 Zahl, mindestens 1 Sonderzeichen.");
    if(password===null) return;
    const repeat=prompt("Passwort wiederholen:");
    if(repeat===null) return;
    finishPasswordSetup(password,repeat);
  }
}

function finishPasswordSetup(password,repeat){
  const validation=validatePasswordRules(password);
  if(validation){toast(validation,"error");return false;}
  if(password!==repeat){toast("Die Passwörter stimmen nicht überein.","error");return false;}
  const account=getAssignmentByUserName(pendingPasswordSetupUser);
  if(!account || account.active===false){toast("Benutzerkonto nicht gefunden oder gesperrt.","error");return false;}
  account.password=password;
  account.passwordChangedAt=new Date().toISOString();
  saveState();
  logAction("Sicherheit","Passwort vergeben",`Erstanmeldung: ${pendingPasswordSetupUser}`);
  toast("Passwort erfolgreich vergeben. Du kannst dich jetzt anmelden.","success");
  document.getElementById("passwordSetupDialog")?.close();
  pendingPasswordSetupUser="";
  login();
  return true;
}

function hasPassword(account){
  return !!String(account?.password||"");
}

function formatDateTime(value){
  if(!value) return "--";
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("de-DE")+" "+d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
}

function formatDate(value){
  if(!value) return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("de-DE");
}

function messageLevelLabel(level){
  const n=Number(level||3);
  if(n===1) return "Stufe 1 – Anfänger";
  if(n===2) return "Stufe 2 – Fortgeschritten";
  return "Stufe 3 – Experte";
}

function getVisibleRoleNames(){
  return Object.keys(state.roles).filter(r=>r!=="Gast" && r!=="Systeminhaber");
}

function getOwnerEmail(){
  return String(state.settings.systemOwnerEmail||"").trim().toLowerCase();
}

function accountIsOwner(account){
  const owner=getOwnerEmail();
  return !!(owner && String(account?.userName||"").trim().toLowerCase()===owner);
}

function getSessionMessageLevel(){
  if(!state.session?.isLoggedIn) return 3;
  const key=String(state.session.userKey||"").toLowerCase();
  const account=(state.roleAssignments||[]).find(a=>String(a.userName||"").toLowerCase()===key);
  const level=Number(account?.messageLevel || state.session.messageLevel || 3);
  return [1,2,3].includes(level) ? level : 3;
}

function isSystemOwner(){
  const owner=getOwnerEmail();
  const current=String(state.session.userKey||"").trim().toLowerCase();
  return state.session.role==="Systeminhaber" || (owner && current===owner);
}

function isAdminLike(){
  return state.session.role==="Admin" || isSystemOwner();
}

function resetUserPassword(memberId){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Passwörter zurücksetzen.","error");
    return false;
  }
  const account=(state.roleAssignments||[]).find(a=>a.memberId===memberId);
  if(!account){toast("Benutzerkonto nicht gefunden.","error");return false;}
  const user=account.userName || getMemberDisplayNameById(memberId) || "Benutzer";
  if(!confirm(`Passwort für ${user} zurücksetzen?\nDer Benutzer muss bei der nächsten Anmeldung ein neues Passwort vergeben.`)) return false;
  account.password="";
  account.passwordChangedAt="";
  account.passwordResetAt=new Date().toISOString();
  saveState();
  logAction("Benutzer / Rechte","Passwort zurückgesetzt",user);
  toast("Passwort wurde zurückgesetzt. Benutzer muss es neu vergeben.","success");
  renderMemberRoleAssignments();
  return true;
}

function getMemberDisplayNameById(memberId){
  const m=state.members.find(x=>x.id===memberId);
  if(!m) return "";
  return `${m.firstName||""} ${m.lastName||""}`.trim() || m.memberNo || "Mitglied";
}

function getAssignmentByUserName(userName){
  const wanted=String(userName||"").trim().toLowerCase();
  if(!wanted) return null;
  return (state.roleAssignments||[]).find(a=>String(a.userName||"").trim().toLowerCase()===wanted) || null;
}

function loginClientDetails(){
  const browser=(typeof detectBrowser==="function") ? detectBrowser() : (navigator.userAgent || "unbekannt");
  const platform=navigator.platform || "unbekannt";
  const online=navigator.onLine ? "online" : "offline";
  return `Browser: ${browser}; Plattform: ${platform}; Netzwerk: ${online}`;
}

async function doLogin(userName,pass){
  const cleanUser=String(userName||"").trim();
  const password=String(pass||"");
  if(!cleanUser){
    toast("Bitte E-Mail-Adresse / Benutzer eingeben.","error");
    return false;
  }

  const online=typeof navigator==='undefined' ? true : navigator.onLine!==false;
  const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanUser);

  // Normalbetrieb wie DP2: eine Anmeldung. Supabase Auth prueft die KC-Zugangsdaten,
  // danach wird der aktuelle Cloud-Bestand geladen und erst dann die KC-Sitzung gesetzt.
  if(isEmail && online){
    try{
      window.KNGDbLedBridge?.setState?.('sup','working','KC-Anmeldung und Supabase-Abgleich laufen');
      if(!window.KNGCloudSync?.connect) throw new Error('Supabase-Modul ist noch nicht bereit. Bitte erneut auf Anmelden klicken.');
      await window.KNGCloudSync.connect(cleanUser,password,{silent:true,source:'kc-login'});

      const membership=window.KNGCloudSync?.currentMembership?.()||null;
      if(!membership || membership.active===false){
        await window.KNGCloudSync?.signOut?.().catch(()=>{});
        throw new Error('Für diese E-Mail-Adresse ist kein aktiver KC-Verwaltungszugang freigeschaltet.');
      }
      const account=getAssignmentByUserName(cleanUser);
      const member=(state.members||[]).find(m=>String(m?.email||'').trim().toLowerCase()===cleanUser.toLowerCase()) || (account?state.members.find(m=>m.id===account.memberId):null);
      const roles=Array.isArray(account?.roles)?account.roles.filter(Boolean):[];
      const cloudRole=String(membership.role||'').trim().toLowerCase();
      const primaryRole=roles.includes("Systeminhaber") ? "Systeminhaber" : (roles.includes("Admin")||cloudRole==='admin' ? "Admin" : (cloudRole==='manager' ? "Admin" : (roles[0] || "Mitglied")));
      const display=member ? (`${member.firstName||''} ${member.lastName||''}`.trim() || cleanUser) : (account?.userName || cleanUser);
      const level=Number(account?.messageLevel || 3);
      if(account) account.lastLoginAt=new Date().toISOString();
      state.session={isLoggedIn:true,userName:display,userKey:cleanUser.toLowerCase(),role:primaryRole,messageLevel:[1,2,3].includes(level)?level:3,loginSince:new Date().toLocaleTimeString("de-DE")};
      try{sessionStorage.setItem('kc_manager_runtime_login','1');}catch(_e){}
      saveState();
      applySession();
      markSettingsClean();
      markMemberClean();
      logAction("Sicherheit","Anmeldung",`${display} angemeldet als ${primaryRole}; Supabase automatisch verbunden; ${loginClientDetails()}`);
      toast(`Benutzer angemeldet: ${display} · Daten aktuell`,"success");
      showRoleStartView(primaryRole);
      setTimeout(()=>window.updateInboxIndicator?.(true),250);
      setTimeout(()=>{ if(typeof checkProtocolThreshold==="function") checkProtocolThreshold(); },500);
      setTimeout(()=>window.KNGCloudSync?.flush?.().catch(()=>{}),180);
      return true;
    }catch(error){
      window.KNGDbLedBridge?.setState?.('sup','error',error?.message||'Supabase-Anmeldung fehlgeschlagen');
      logAction("Sicherheit","Anmeldung abgelehnt",`Benutzer: ${cleanUser}; Cloud: ${error?.message||error}; ${loginClientDetails()}`);
      toast(error?.message||"E-Mail-Adresse oder Passwort falsch.","error");
      return false;
    }
  }

  // Offline-Fallback: vorhandene lokale Zugangsdaten duerfen weiter benutzt werden.
  if(isEmail && !online){
    const account=getAssignmentByUserName(cleanUser);
    if(account && account.active!==false && hasPassword(account) && String(account.password||"")===password){
      const roles=Array.isArray(account.roles)?account.roles.filter(Boolean):[];
      const primaryRole=roles.includes("Systeminhaber") ? "Systeminhaber" : (roles.includes("Admin") ? "Admin" : (roles[0] || "Mitglied"));
      const display=getMemberDisplayNameById(account.memberId) || account.userName;
      const level=Number(account.messageLevel || 3);
      account.lastLoginAt=new Date().toISOString();
      state.session={isLoggedIn:true,userName:display,userKey:String(account.userName||cleanUser).toLowerCase(),role:primaryRole,messageLevel:[1,2,3].includes(level)?level:3,loginSince:new Date().toLocaleTimeString("de-DE")};
      try{sessionStorage.setItem('kc_manager_runtime_login','1');}catch(_e){}
      saveState();applySession();markSettingsClean();markMemberClean();
      logAction("Sicherheit","Offline-Anmeldung",`${display} lokal angemeldet; ${loginClientDetails()}`);
      toast(`Offline angemeldet: ${display} · Synchronisation folgt automatisch`,"info");
      showRoleStartView(primaryRole);
      return true;
    }
    toast("Offline-Anmeldung nicht möglich: Für diesen Benutzer liegen keine gültigen lokalen Zugangsdaten vor.","error");
    return false;
  }

  // Admin bleibt ein KC-Verwaltungszugang. Das lokale Adminpasswort wird zuerst
  // geprüft. Supabase läuft danach automatisch über eine vorhandene Refresh-Sitzung
  // oder – falls möglich – über dieselben Zugangsdaten. Ein Cloud-Fehler darf den
  // gültigen KC-Adminzugang nicht mehr blockieren.
  if(cleanUser.toLowerCase()==="admin"){
    if(password!==String(state.settings?.adminPassword||"")){
      logAction("Sicherheit","Anmeldung abgelehnt",`Admin-Passwort falsch; ${loginClientDetails()}`);
      toast("Admin-Benutzer oder Passwort falsch.","error");
      return false;
    }

    let cloudReady=false;
    if(online){
      try{
        window.KNGDbLedBridge?.setState?.('sup','working','Supabase-Sitzung wird automatisch hergestellt');
        if(window.KCCloudSession?.ready && await window.KCCloudSession.ready()){
          cloudReady=!!(await window.KNGCloudSync?.adoptSession?.());
        }
        if(!cloudReady){
          const cloudEmail=getOwnerEmail();
          if(cloudEmail && window.KNGCloudSync?.connect){
            try{ cloudReady=!!(await window.KNGCloudSync.connect(cloudEmail,password,{silent:true,source:'kc-admin-auto'})); }
            catch(_cloudPasswordMismatch){ cloudReady=false; }
          }
        }
      }catch(_cloudError){ cloudReady=false; }
    }

    state.session={isLoggedIn:true,userName:"Admin",userKey:"admin",role:"Admin",messageLevel:3,loginSince:new Date().toLocaleTimeString("de-DE")};
    try{sessionStorage.setItem('kc_manager_runtime_login','1');}catch(_e){}
    saveState();applySession();markSettingsClean();markMemberClean();
    logAction("Sicherheit","Anmeldung",`Admin angemeldet; Supabase: ${cloudReady?'verbunden':'lokal/offline'}; ${loginClientDetails()}`);
    toast(cloudReady?"Admin angemeldet · Supabase-Daten aktuell":"Admin angemeldet · lokale Daten aktiv, Supabase verbindet automatisch sobald eine gültige Sitzung verfügbar ist",cloudReady?"success":"info");
    showRoleStartView("Admin");
    setTimeout(()=>window.updateInboxIndicator?.(true),250);
    setTimeout(()=>{ if(typeof checkProtocolThreshold==="function") checkProtocolThreshold(); },500);
    // Login-/Protokolländerungen sofort nachschieben, damit die Queue nicht bei 1 offen stehen bleibt.
    if(cloudReady) setTimeout(()=>window.KNGCloudSync?.flush?.().catch(()=>{}),180);
    return true;
  }

  // Erstanmeldung fuer bestehende lokale Konten bleibt als Kompatibilitaetsweg erhalten.
  const account=getAssignmentByUserName(cleanUser);
  if(account && account.active!==false && !hasPassword(account)){
    logAction("Sicherheit","Erstanmeldung gestartet",`Benutzer: ${cleanUser}; ${loginClientDetails()}`);
    toast("Für diese E-Mail-Adresse ist noch kein Passwort vergeben.","info");
    openPasswordSetup(cleanUser);
    return false;
  }

  logAction("Sicherheit","Anmeldung abgelehnt",`Benutzer: ${cleanUser}; ${loginClientDetails()}`);
  toast("E-Mail-Adresse oder Passwort falsch.","error");
  return false;
}

function logout(){
  try{sessionStorage.removeItem('kc_manager_runtime_login');}catch(_e){}
  if(state.session?.isLoggedIn){
    if(!confirm("Wollen Sie wirklich das Programm verlassen?")) return false;
  }
  const oldUser=state.session.userName || "Gast";
  if(window.KNGCloudSync?.signOut) window.KNGCloudSync.signOut().catch(()=>{});
  logAction("Sicherheit","Abmeldung",oldUser+" abgemeldet",oldUser);
  state.session=clone(DEFAULT_STATE.session);
  saveState();
  applySession();
  toast("Benutzer abgemeldet","info");
  showGuestHome();
  return true;
}

function applySession(){
  const logged=state.session.isLoggedIn;
  document.body.classList.toggle("admin",isAdminLike());
  document.body.classList.toggle("system-owner",isSystemOwner());
  document.body.classList.toggle("guest",!logged);
  document.body.classList.toggle("logged-in",logged);
  document.getElementById("sessionName").textContent=logged ? `Benutzer: ${state.session.userName}` : "Gastmodus";
  document.getElementById("sessionRole").textContent=logged ? `Rolle: ${state.session.role}` : "nicht angemeldet";
  document.getElementById("loginBtn").classList.toggle("hidden",logged);
  document.getElementById("logoutBtn").classList.toggle("hidden",!logged);
  document.getElementById("cardUser").textContent=state.session.userName || "Gast";
  document.getElementById("cardRole").textContent=state.session.role || "Gast";
  applyClubBranding();
  updateGuestHome();
  updateStatusBar();
  window.renderPinboard?.();
  window.updateInboxIndicator?.(false);
  applyPermissionVisibility();
}

function updateClock(){
  const now=new Date();
  const clockEl=document.getElementById("clock");
  if(clockEl) clockEl.textContent=now.toLocaleTimeString("de-DE");
  document.getElementById("todayLine").textContent="Heute ist "+now.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
  const name=state.session.isLoggedIn ? state.session.userName : "Gast";
  document.getElementById("greeting").textContent=`Guten Tag ${name}`;
  try{
    const prefs=(typeof getUserPrefsObject==="function") ? getUserPrefsObject() : {};
    const visible=prefs.clockEnabled !== false;
    document.body.classList.toggle("clock-hidden",!visible);
  }catch(e){ document.body.classList.remove("clock-hidden"); }
  updateStatusBar();
}


const CITY_COORDS = {
  "werne": {lat:51.6643, lon:7.6350},
  "kamen": {lat:51.5923, lon:7.6638},
  "bergkamen": {lat:51.6167, lon:7.6333},
  "ascheberg": {lat:51.7906, lon:7.6172},
  "hamm": {lat:51.6739, lon:7.8150},
  "lünen": {lat:51.6163, lon:7.5287},
  "dortmund": {lat:51.5136, lon:7.4653},
  "unna": {lat:51.5347, lon:7.6897},
  "selm": {lat:51.6969, lon:7.4686},
  "nordkirchen": {lat:51.7386, lon:7.5222},
  "drensteinfurt": {lat:51.7950, lon:7.7380},
  "münster": {lat:51.9607, lon:7.6261},
  "bönen": {lat:51.5982, lon:7.7606},
  "ahlen": {lat:51.7634, lon:7.8887},
  "herbern": {lat:51.7448, lon:7.6656},
  "capelle": {lat:51.7333, lon:7.5833},
  "waltrop": {lat:51.6214, lon:7.3973},
  "olfen": {lat:51.7085, lon:7.3782},
  "lüdinghausen": {lat:51.7683, lon:7.4438},
  "simmerath": {lat:50.6066, lon:6.2993},
  "hannover": {lat:52.3759, lon:9.7320},
  "köln": {lat:50.9375, lon:6.9603},
  "düsseldorf": {lat:51.2277, lon:6.7735},
  "essen": {lat:51.4556, lon:7.0116},
  "bochum": {lat:51.4818, lon:7.2162}
};


const NAV_ICON_OPTIONS = [
  {key:"dashboard",label:"Dashboard",icon:"🏠"},
  {key:"members",label:"Mitglieder",icon:"👥"},
  {key:"workwear",label:"Dienstkleidung",icon:"🧥"},
  {key:"activities",label:"Aktivitäten / Ausflüge",icon:"🚌"},
  {key:"donations",label:"Finanzen / Spenden",icon:"💝"},
  {key:"inventoryOpen",label:"Inventarverwaltung",icon:"📦"},
  {key:"communication",label:"Kommunikation",icon:"✉️"},
  {key:"systemCheck",label:"Systemcheck",icon:"✅"},
  {key:"protocol",label:"Protokoll",icon:"📋"},
  {key:"logout",label:"Abmelden",icon:"🚪"}
];
function renderNavIconSettings(){
  const box=document.getElementById("navIconSettings");
  if(!box) return;
  const selected=new Set(Array.isArray(state.settings.navIcons)?state.settings.navIcons:DEFAULT_STATE.settings.navIcons);
  box.innerHTML=NAV_ICON_OPTIONS.map(opt=>`<label class="nav-icon-option"><input type="checkbox" data-nav-icon="${escapeHtml(opt.key)}" ${selected.has(opt.key)?"checked":""}> <span>${opt.icon}</span> ${escapeHtml(opt.label)}</label>`).join("");
}
function applyNavIconVisibility(){
  const selected=new Set(Array.isArray(state.settings.navIcons)?state.settings.navIcons:DEFAULT_STATE.settings.navIcons);
  document.querySelectorAll(".quick-icons [data-view], .quick-icons [data-action='logout'], .quick-icons [data-action='inventoryOpen']").forEach(btn=>{
    const key=btn.dataset.action==="logout"?"logout":(btn.dataset.action==="inventoryOpen"?"inventoryOpen":btn.dataset.view);
    btn.classList.toggle("hidden",!selected.has(key));
  });
}
