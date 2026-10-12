
/* Phase 9.9 Korrektur: Dashboard-Schalter mit Pfeilen.
   Diese Funktionen müssen vor dem Event-Binding vorhanden sein, sonst bricht die Initialisierung ab. */
function cleanToggleLabel(text){
  return String(text||"").replace(/^[▼▶]\s*/,"").trim();
}
function setDashboardToggleLabel(btn,visible,shownText,hiddenText){
  if(!btn) return;
  const label=visible ? shownText : hiddenText;
  btn.textContent=(visible ? "▼ " : "▶ ") + cleanToggleLabel(label);
}
function refreshDashboardToggleArrows(){
  const mappings=[
    ["toggleDashboardHeaderCards","dashboardHeaderCards","Systemübersicht ausblenden","Systemübersicht anzeigen"],
    ["toggleDashboardCockpitCards","dashboardCockpitCards","Kennzahlen ausblenden","Kennzahlen anzeigen"],
    ["toggleDashboardAgeNumbers","dashboardAgeNumbers","Zahlen ausblenden","Zahlen anzeigen"],
    ["toggleDashboardAgeChart","dashboardAgeChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardDurationNumbers","dashboardDurationNumbers","Zahlen ausblenden","Zahlen anzeigen"],
    ["toggleDashboardDurationChart","dashboardDurationChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardDurationTable","dashboardDurationTableWrap","Tabelle ausblenden","Tabelle anzeigen"],
    ["toggleDashboardBirthdays","dashboardBirthdaysWrap","Liste ausblenden","Liste anzeigen"],
    ["toggleDashboardGenderChart","dashboardGenderChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardGenderTable","dashboardGenderTableWrap","Tabelle ausblenden","Tabelle anzeigen"],
    ["toggleDashboardStatusChart","dashboardStatusChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardStatusTable","dashboardStatusTableWrap","Tabelle ausblenden","Tabelle anzeigen"],
    ["toggleDashboardProfessionStats","dashboardProfessionStats","Liste ausblenden","Liste anzeigen"],
    ["toggleDashboardProfessionChart","dashboardProfessionChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardCityChart","dashboardCityChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardCityTable","dashboardCityTableWrap","Tabelle ausblenden","Tabelle anzeigen"],
    ["toggleDashboardCommitteeChart","dashboardCommitteeChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardCommitteeTable","dashboardCommitteeTableWrap","Tabelle ausblenden","Tabelle anzeigen"],
    ["toggleDashboardGrowthChart","dashboardGrowthChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardGrowthTable","dashboardGrowthTableWrap","Tabelle ausblenden","Tabelle anzeigen"],
    ["toggleDashboardDonationChart","dashboardDonationChart","Diagramm ausblenden","Diagramm anzeigen"],
    ["toggleDashboardDonationTable","dashboardDonationTableWrap","Tabelle ausblenden","Tabelle anzeigen"]
  ];
  mappings.forEach(([btnId,targetId,shownText,hiddenText])=>{
    const btn=document.getElementById(btnId);
    const target=document.getElementById(targetId);
    if(!btn || !target) return;
    setDashboardToggleLabel(btn,!target.classList.contains("hidden"),shownText,hiddenText);
  });
}

/* Registerkarten, Sidebar, Events, Statuszeile, Gesamtrendering */
function setupTabActionMenus(){
  const menuItems=[
    "Drucken",
    "PDF exportieren",
    "CSV exportieren",
    "Kopieren",
    "Aktualisieren",
    "Filter zurücksetzen",
    "Spalten anzeigen",
    "Hilfe anzeigen"
  ];

  let floating=document.getElementById("tabActionFloatingMenu");
  if(!floating){
    floating=document.createElement("div");
    floating.id="tabActionFloatingMenu";
    floating.className="tab-action-menu hidden";
    document.body.appendChild(floating);
  }

  function menuItemsForTab(tab){
    const items=[...menuItems];
    if(tab?.dataset?.activityTab==="activityFormTab") items.unshift("E-Mail-Anfrage");
    if(tab?.dataset?.donationTab==="donationFormTab") items.unshift("Spendenquittung drucken");
    return items;
  }

  function openMenuFor(icon,tab){
    floating.innerHTML="";
    menuItemsForTab(tab).forEach(label=>{
      const item=document.createElement("button");
      item.type="button";
      item.textContent=label;
      item.addEventListener("click",()=>{
        floating.classList.add("hidden");
        if(label==="E-Mail-Anfrage"){ createActivityEmailRequest(); return; }
        if(label==="Spendenquittung drucken"){ printDonationReceipt(); return; }
        toast(`${label}: Funktion wird später für diese Registerkarte belegt.`,"info");
      });
      floating.appendChild(item);
    });
    const rect=icon.getBoundingClientRect();
    floating.style.left=`${Math.max(8,rect.left)}px`;
    floating.style.top=`${rect.bottom+6}px`;
    floating.classList.remove("hidden");
    floating.dataset.forTab=tab.textContent.trim();
  }

  document.querySelectorAll(".tabs > .tab").forEach(tab=>{
    if(tab.querySelector(":scope > .tab-menu-icon")) return;
    const icon=document.createElement("span");
    icon.className="tab-menu-icon";
    icon.title="Menü für " + tab.textContent.trim();
    icon.setAttribute("role","button");
    icon.setAttribute("tabindex","0");
    icon.setAttribute("aria-label","Registerkarten-Menü öffnen");
    icon.textContent="☰";
    icon.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      const isSame=!floating.classList.contains("hidden") && floating.dataset.forTab===tab.textContent.trim();
      if(isSame){
        floating.classList.add("hidden");
      }else{
        openMenuFor(icon,tab);
      }
    });
    icon.addEventListener("keydown",e=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        e.stopPropagation();
        openMenuFor(icon,tab);
      }
    });
    tab.prepend(icon);
  });

  if(!document.body.dataset.tabActionCloseBound){
    document.addEventListener("click",()=>document.querySelectorAll(".tab-action-menu").forEach(m=>m.classList.add("hidden")));
    document.addEventListener("scroll",()=>document.querySelectorAll(".tab-action-menu").forEach(m=>m.classList.add("hidden")),true);
    document.body.dataset.tabActionCloseBound="1";
  }
}


/* Phase 6.4: Registerkarten per Drag & Drop sortieren.
   Die erste Registerkarte bleibt immer fest an Position 1. Die Reihenfolge
   wird benutzerbezogen gespeichert. */
function getTabButtonKey(tab){
  if(!tab) return "";
  const d=tab.dataset||{};
  return d.memberTab || d.settingsTab || d.dashboardTab || d.usersTab || tab.textContent.trim();
}

function getTabGroupType(tab){
  const d=tab?.dataset||{};
  if(d.memberTab) return "member";
  if(d.settingsTab) return "settings";
  if(d.dashboardTab) return "dashboard";
  if(d.usersTab) return "users";
  return "generic";
}

function getTabGroupKey(tabs){
  const first=tabs?.querySelector?.(".tab");
  const section=tabs?.closest?.("section.view")?.id || tabs?.closest?.("section")?.id || "global";
  return `${section}:${getTabGroupType(first)}`;
}

function getUserPrefsObject(){
  const key=currentUserPreferenceKey();
  if(!state.userPrefs || typeof state.userPrefs!=="object") state.userPrefs={};
  if(!state.userPrefs[key] || typeof state.userPrefs[key]!=="object") state.userPrefs[key]={};
  return state.userPrefs[key];
}

function saveTabOrder(tabs){
  const groupKey=getTabGroupKey(tabs);
  const keys=[...tabs.querySelectorAll(".tab")].map(getTabButtonKey);
  const prefs=getUserPrefsObject();
  prefs.tabOrders={...(prefs.tabOrders||{}),[groupKey]:keys};
  saveState();
}

function applySavedTabOrder(tabs){
  const all=[...tabs.querySelectorAll(".tab")];
  if(all.length<3) return;
  const groupKey=getTabGroupKey(tabs);
  const prefs=getUserPrefsObject();
  const saved=Array.isArray(prefs.tabOrders?.[groupKey]) ? prefs.tabOrders[groupKey] : null;
  if(!saved || saved.length<2) return;
  const locked=all[0];
  const byKey=new Map(all.slice(1).map(tab=>[getTabButtonKey(tab),tab]));
  const ordered=[locked];
  saved.slice(1).forEach(key=>{
    const tab=byKey.get(key);
    if(tab){ ordered.push(tab); byKey.delete(key); }
  });
  byKey.forEach(tab=>ordered.push(tab));
  ordered.forEach(tab=>tabs.appendChild(tab));
}

function refreshSortableTabClasses(tabs){
  [...tabs.querySelectorAll(".tab")].forEach((tab,index)=>{
    tab.classList.toggle("tab-locked",index===0);
    tab.classList.toggle("tab-sortable",index>0);
    tab.draggable=index>0;
    if(index===0){
      tab.title="Erste Registerkarte ist fest und kann nicht verschoben werden.";
    }else if(!tab.title || tab.title.includes("Erste Registerkarte")){
      tab.title="Registerkarte ziehen, um die Reihenfolge zu ändern.";
    }
  });
}

function setupSortableTabs(){
  document.querySelectorAll(".tabs").forEach(tabs=>{
    // Dokumentenmanagement hat eigene Kern-Tablogik und wird nicht über die allgemeine Drag-/Sortierlogik gesteuert.
    if(tabs.classList.contains("document-tabs") || tabs.dataset.tabGroup === "documents") return;
    const tabButtons=[...tabs.querySelectorAll(".tab")];
    if(tabButtons.length<3 || tabs.dataset.sortableReady==="1") return;
    tabs.dataset.sortableReady="1";
    tabs.classList.add("sortable-tabs");
    applySavedTabOrder(tabs);
    refreshSortableTabClasses(tabs);

    tabs.querySelectorAll(".tab").forEach(tab=>{
      if(!tab.querySelector(":scope > .tab-drag-icon")){
        const drag=document.createElement("span");
        drag.className="tab-drag-icon";
        drag.textContent="↔";
        drag.title="Registerkarte verschieben";
        tab.appendChild(drag);
      }

      tab.addEventListener("dragstart",e=>{
        const currentTabs=tab.parentElement;
        if(!tab.classList.contains("tab-sortable")){
          e.preventDefault();
          toast("Die erste Registerkarte kann nicht verschoben werden.","info");
          return;
        }
        currentTabs.dataset.draggingTab=getTabButtonKey(tab);
        tab.classList.add("tab-dragging");
        e.dataTransfer.effectAllowed="move";
        e.dataTransfer.setData("text/plain",getTabButtonKey(tab));
      });

      tab.addEventListener("dragend",()=>{
        tab.classList.remove("tab-dragging");
        delete tab.parentElement.dataset.draggingTab;
      });

      tab.addEventListener("dragover",e=>{
        const currentTabs=tab.parentElement;
        const draggingKey=currentTabs.dataset.draggingTab;
        if(!draggingKey || tab.classList.contains("tab-locked")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect="move";
        tab.classList.add("tab-drop-target");
      });

      tab.addEventListener("dragleave",()=>tab.classList.remove("tab-drop-target"));

      tab.addEventListener("drop",e=>{
        e.preventDefault();
        tab.classList.remove("tab-drop-target");
        const currentTabs=tab.parentElement;
        const draggingKey=currentTabs.dataset.draggingTab;
        const source=[...currentTabs.querySelectorAll(".tab")].find(t=>getTabButtonKey(t)===draggingKey);
        if(!source || source===tab || source.classList.contains("tab-locked") || tab.classList.contains("tab-locked")) return;
        const rect=tab.getBoundingClientRect();
        const after=(e.clientX-rect.left)>rect.width/2;
        currentTabs.insertBefore(source,after?tab.nextSibling:tab);
        source.dataset.justDragged="1";
        refreshSortableTabClasses(currentTabs);
        saveTabOrder(currentTabs);
        toast("Registerkarten-Reihenfolge gespeichert.","success");
      });
    });
  });

  if(!document.body.dataset.sortableTabClickGuard){
    document.addEventListener("click",e=>{
      const tab=e.target.closest?.(".tab");
      if(tab?.dataset.justDragged==="1"){
        e.preventDefault();
        e.stopPropagation();
        delete tab.dataset.justDragged;
      }
    },true);
    document.body.dataset.sortableTabClickGuard="1";
  }
}


function currentUserPreferenceKey(){
  return (state.session.userName||state.session.email||"Gast").toLowerCase();
}

function applySidebarState(){
  const key=currentUserPreferenceKey();
  const pref=state.userPrefs?.[key]?.sidebar;
  const collapsed=pref ? !!pref.collapsed : !!state.ui.sidebarCollapsed;
  const pinned=pref ? !!pref.pinned : !!state.ui.sidebarPinned;
  state.ui.sidebarCollapsed=!!collapsed;
  state.ui.sidebarPinned=!!pinned;
  document.body.classList.toggle("sidebar-collapsed",collapsed);
  const pin=document.getElementById("sidebarPin");
  if(pin){
    pin.textContent=pinned?"📌":"📍";
    pin.classList.toggle("pin-pinned",!!pinned);
    pin.classList.toggle("pin-unpinned",!pinned);
    pin.title=pinned?"Navigation dauerhaft sichtbar / angeheftet":"Navigation automatisch ein-/ausblendbar / gelöst";
    pin.setAttribute("aria-label",pin.title);
    pin.setAttribute("aria-pressed",pinned?"true":"false");
  }
}

function saveSidebarPreference(collapsed,pinned){
  const key=currentUserPreferenceKey();
  if(!state.userPrefs || typeof state.userPrefs!=="object") state.userPrefs={};
  state.userPrefs[key]={...(state.userPrefs[key]||{}),sidebar:{collapsed:!!collapsed,pinned:!!pinned}};
  state.ui.sidebarCollapsed=!!collapsed;
  state.ui.sidebarPinned=!!pinned;
  saveState();
}

function bindSidebarControls(){
  document.getElementById("sidebarToggle")?.addEventListener("click",()=>{
    const collapsed=!document.body.classList.contains("sidebar-collapsed");
    const pinned=state.ui.sidebarPinned!==false;
    saveSidebarPreference(collapsed,pinned);
    applySidebarState();
  });
  document.getElementById("sidebarPin")?.addEventListener("click",()=>{
    const collapsed=document.body.classList.contains("sidebar-collapsed");
    const pinned=!(state.ui.sidebarPinned!==false);
    saveSidebarPreference(collapsed,pinned);
    applySidebarState();
    toast(pinned?"Navigation angeheftet.":"Navigation gelöst.","info");
  });
  applySidebarState();
}

function bindSettingsTabs(){
  document.querySelectorAll("[data-settings-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const active=document.querySelector(".settings-tab.active")?.id;
      if(active && active!==btn.dataset.settingsTab && !confirmLeaveSettings()) return;
      document.querySelectorAll("[data-settings-tab]").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".settings-tab").forEach(t=>t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.settingsTab)?.classList.add("active");
      if(btn.dataset.settingsTab==="settingsCombos") renderComboManager();
    });
  });
}


/* Phase 9.9: Spaltenbreiten in Tabellen verschiebbar (Standard für kommende Tabellen). */
function getColumnResizePrefs(){
  if(!state.ui || typeof state.ui!=="object") state.ui={};
  if(!state.ui.tableColumnWidths || typeof state.ui.tableColumnWidths!=="object") state.ui.tableColumnWidths={};
  return state.ui.tableColumnWidths;
}
function tableResizeKey(table){
  return table?.dataset?.resizeKey || table?.id || "table";
}
function applySavedColumnWidths(table){
  if(!table) return;
  const key=tableResizeKey(table);
  const prefs=getColumnResizePrefs()[key] || {};
  Object.entries(prefs).forEach(([idx,width])=>{
    const n=parseInt(idx,10);
    const px=parseInt(width,10);
    if(!Number.isFinite(n) || !Number.isFinite(px)) return;
    if(key==="membersSearch") table.style.setProperty(`--member-col-${n}`,`${px}px`);
    else table.querySelectorAll(`tr > *:nth-child(${n})`).forEach(cell=>{cell.style.width=`${px}px`;cell.style.maxWidth=`${px}px`;});
  });
}
function initResizableTables(){
  document.querySelectorAll("table.resizable-table").forEach(table=>{
    if(table.dataset.resizeReady==="1"){
      applySavedColumnWidths(table);
      return;
    }
    table.dataset.resizeReady="1";
    applySavedColumnWidths(table);
    const headers=Array.from(table.querySelectorAll("thead th"));
    headers.forEach((th,index)=>{
      if(index===0) return; // Auswahlspalte nicht verbreitern
      if(th.querySelector(":scope > .column-resize-handle")) return;
      const handle=document.createElement("span");
      handle.className="column-resize-handle";
      handle.title="Spaltenbreite ziehen";
      handle.setAttribute("aria-hidden","true");
      th.appendChild(handle);
      handle.addEventListener("mousedown",e=>{
        e.preventDefault();
        e.stopPropagation();
        const col=index+1;
        const startX=e.clientX;
        const startWidth=th.getBoundingClientRect().width;
        const minWidth=col===2 ? 44 : (col===3 ? 95 : 56);
        handle.classList.add("is-dragging");
        document.body.classList.add("column-resizing");
        function move(ev){
          const next=Math.max(minWidth,Math.round(startWidth + ev.clientX - startX));
          const key=tableResizeKey(table);
          if(key==="membersSearch") table.style.setProperty(`--member-col-${col}`,`${next}px`);
          else table.querySelectorAll(`tr > *:nth-child(${col})`).forEach(cell=>{cell.style.width=`${next}px`;cell.style.maxWidth=`${next}px`;});
        }
        function up(ev){
          move(ev);
          const key=tableResizeKey(table);
          const width=Math.round(th.getBoundingClientRect().width);
          const prefs=getColumnResizePrefs();
          if(!prefs[key]) prefs[key]={};
          prefs[key][col]=width;
          saveState();
          handle.classList.remove("is-dragging");
          document.body.classList.remove("column-resizing");
          document.removeEventListener("mousemove",move);
          document.removeEventListener("mouseup",up);
        }
        document.addEventListener("mousemove",move);
        document.addEventListener("mouseup",up);
      });
    });
  });
}

function bindEvents(){
  setupTabActionMenus();
  setupSortableTabs();
  bindSettingsTabs();
  initResizableTables();
  document.getElementById("loginBtn").addEventListener("click",login);
  document.getElementById("guestLoginBtn")?.addEventListener("click",login);
  document.getElementById("loginForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const dlg=document.getElementById("loginDialog");
    const form=document.getElementById("loginForm");
    const submit=form?.querySelector('button[type="submit"]');
    const user=document.getElementById("loginUserName")?.value || "";
    const pass=document.getElementById("loginPassword")?.value || "";
    if(submit?.disabled) return;
    if(submit){submit.disabled=true;submit.dataset.oldText=submit.textContent||'Anmelden';submit.textContent='Anmeldung …';}
    try{
      const ok=await doLogin(user,pass);
      if(ok){dlg?.close();const pw=document.getElementById("loginPassword");if(pw)pw.value='';}
    }finally{
      if(submit){submit.disabled=false;submit.textContent=submit.dataset.oldText||'Anmelden';delete submit.dataset.oldText;}
    }
  });
  document.getElementById("cancelLogin")?.addEventListener("click",()=>document.getElementById("loginDialog")?.close());
  document.getElementById("toggleLoginPassword")?.addEventListener("click",()=>{
    const input=document.getElementById("loginPassword");
    const btn=document.getElementById("toggleLoginPassword");
    if(!input || !btn) return;
    const show=input.type==="password";
    input.type=show?"text":"password";
    btn.textContent=show?"👁️":"👁️‍🗨️";
    btn.title=show?"Passwort ausblenden":"Passwort anzeigen";
  });
  document.getElementById("passwordSetupForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const p1=document.getElementById("newUserPassword")?.value || "";
    const p2=document.getElementById("newUserPasswordRepeat")?.value || "";
    finishPasswordSetup(p1,p2);
  });
  document.getElementById("cancelPasswordSetup")?.addEventListener("click",()=>{
    pendingPasswordSetupUser="";
    document.getElementById("passwordSetupDialog")?.close();
  });
  document.getElementById("forgotPassword")?.addEventListener("click",()=>toast("Passwort vergessen? Bitte beim Admin melden. Der Admin kann dein Passwort zurücksetzen.","info"));
  document.getElementById("memberRolesTable")?.addEventListener("click",e=>{
    const btn=e.target.closest(".reset-user-password");
    if(btn) resetUserPassword(btn.dataset.memberId);
  });
  document.getElementById("askAssistant")?.addEventListener("click",askAssistant);
  document.getElementById("clearAssistant")?.addEventListener("click",()=>{setInputValue("assistantQuestion",""); const a=document.getElementById("assistantAnswer"); if(a) a.textContent="Bitte oben eine Auswertung auswählen.";});
  document.querySelectorAll(".assistant-mode-btn").forEach(btn=>btn.addEventListener("click",()=>selectAssistantMode(btn.dataset.assistantMode||"birthdays")));
  document.querySelectorAll(".assistant-question").forEach(btn=>btn.addEventListener("click",()=>{setInputValue("assistantQuestion",btn.dataset.question||""); askAssistant();}));
  document.getElementById("assistantRunClaim")?.addEventListener("click",()=>setAssistantAnswer(assistantClaimEvaluation(document.getElementById("assistantClaimSelect")?.value||"trips"),"Anspruch gefiltert"));
  document.getElementById("assistantRunBirthdays")?.addEventListener("click",()=>setAssistantAnswer(assistantBirthdays(document.getElementById("assistantBirthdayDays")?.value||30),"Geburtstage gefiltert"));
  document.getElementById("assistantRunCity")?.addEventListener("click",()=>setAssistantAnswer(assistantActiveByCity(document.getElementById("assistantCitySelect")?.value||""),"Ort gefiltert"));
  document.getElementById("assistantRunActivityClaim")?.addEventListener("click",()=>setAssistantAnswer(assistantActivityClaim(document.getElementById("assistantActivitySelect")?.value||""),"Aktivitätsanspruch geprüft"));
  document.getElementById("assistantRunMissing")?.addEventListener("click",()=>setAssistantAnswer(assistantMissingData(document.getElementById("assistantMissingField")?.value||"email"),"Fehlende Daten gefiltert"));
  document.getElementById("assistantRunSkill")?.addEventListener("click",()=>setAssistantAnswer(assistantSkillMembers(document.getElementById("assistantSkillSelect")?.value||"skillElectrician"),"Fähigkeit gefiltert"));
  document.getElementById("assistantRunAllSkills")?.addEventListener("click",()=>setAssistantAnswer(assistantAllSkills(),"Alle Fähigkeiten aufgelistet"));
  document.getElementById("saveAssistantSettings")?.addEventListener("click",saveAssistantSettings);
  document.getElementById("logoutBtn").addEventListener("click",logout);
  document.querySelectorAll("[data-action='logout']").forEach(b=>b.addEventListener("click",logout));
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",e=>{
    e.preventDefault();
    showView(b.dataset.view);
  }));
  document.getElementById("settingsMenuToggle").addEventListener("click",toggleSettingsMenu);
  document.querySelectorAll("[data-dashboard-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("[data-dashboard-tab]").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".dashboard-tab-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.dashboardTab)?.classList.add("active");
    });
  });
  document.getElementById("toggleDashboardAgeChart")?.addEventListener("click",()=>{
    const chart=document.getElementById("dashboardAgeChart");
    const btn=document.getElementById("toggleDashboardAgeChart");
    if(!chart || !btn) return;
    chart.classList.toggle("hidden");
    const visible=!chart.classList.contains("hidden");
    setDashboardToggleLabel(btn,visible,"Diagramm ausblenden","Diagramm anzeigen");
    if(visible) renderAgeStructure("dashboardAgeNumbers","dashboardAgeChart",true);
    if(typeof updateDashboardChartPinButtons==="function") updateDashboardChartPinButtons();
  });
  document.getElementById("toggleDashboardBirthdays")?.addEventListener("click",()=>{
    const wrap=document.getElementById("dashboardBirthdaysWrap");
    const btn=document.getElementById("toggleDashboardBirthdays");
    if(!wrap || !btn) return;
    wrap.classList.toggle("hidden");
    setDashboardToggleLabel(btn,!wrap.classList.contains("hidden"),"Liste ausblenden","Liste anzeigen");
  });
  document.getElementById("infoBtn").addEventListener("click",showInfo);
  document.getElementById("printInfoPdf")?.addEventListener("click",printInfoPdf);
  document.getElementById("printBtn").addEventListener("click",printPage);
  document.getElementById("runSystemCheck").addEventListener("click",runSystemCheck);
  document.getElementById("clearSystemCheckProtocol")?.addEventListener("click",()=>{
    if(!isAdminLike()){toast("Nur Admin darf das Systemcheck-Protokoll löschen.","error");return;}
    if(!confirm("Systemcheck-Protokoll wirklich löschen?")) return;
    state.systemCheckProtocol=[];
    saveState();
    renderSystemCheckProtocol();
    toast("Systemcheck-Protokoll gelöscht.","success");
  });
  document.getElementById("exportData").addEventListener("click",exportData);
  document.getElementById("importData").addEventListener("change",e=>{
    const f=e.target.files[0];
    if(f) importData(f);
    e.target.value="";
  });
  document.getElementById("importMembersCsv")?.addEventListener("change",e=>{
    const f=e.target.files[0];
    if(f) importMembersFile(f);
    e.target.value="";
  });
  document.getElementById("exportMembers")?.addEventListener("click",exportMembers);
  document.getElementById("clearBackupProtocol")?.addEventListener("click",()=>{
    if(!isAdminLike()){toast("Nur Admin darf das Datensicherungs-Protokoll löschen.","error");return;}
    if(!confirm("Datensicherungs-Protokoll wirklich löschen?")) return;
    state.backupProtocol=[];
    saveState();
    renderBackupProtocol();
    toast("Datensicherungs-Protokoll gelöscht.","success");
  });
  document.getElementById("saveSettings").addEventListener("click",saveSettings);
  document.getElementById("navIconSettings")?.addEventListener("change",markSettingsDirty);
  document.getElementById("deleteMasterData").addEventListener("click",deleteMasterData);
  document.getElementById("saveColors")?.addEventListener("click",saveColors);
  document.getElementById("resetColors")?.addEventListener("click",resetColors);
  document.getElementById("colorPreset")?.addEventListener("change",e=>applyColorPreset(e.target.value));
  ["colorDashboardCharts","colorDashboardTables"].forEach(id=>{
    document.getElementById(id)?.addEventListener("change",()=>{
      updateDashboardColorPaletteVisibility();
      const previous=state.colors;
      state.colors=readColorFields();
      renderDashboard();
      state.colors=previous;
    });
  });
  document.querySelectorAll("#settingsColors input[type='color']").forEach(el=>el.addEventListener("input",()=>{
    const previous=state.colors;
    state.colors=readColorFields();
    applyColors();
    state.colors=previous;
  }));
  document.getElementById("showAgeChart")?.addEventListener("click",()=>{
    const chart=document.getElementById("masterAgeChart");
    if(!chart) return;
    chart.classList.toggle("hidden");
    const visible=!chart.classList.contains("hidden");
    document.getElementById("showAgeChart").textContent=visible ? "Diagramm ausblenden" : "Diagramm anzeigen";
    if(visible) renderAgeStructure("masterAgeNumbers","masterAgeChart",true);
  });
  document.getElementById("showDurationChart")?.addEventListener("click",()=>{
    const chart=document.getElementById("masterDurationChart");
    if(!chart) return;
    chart.classList.toggle("hidden");
    const visible=!chart.classList.contains("hidden");
    document.getElementById("showDurationChart").textContent=visible ? "Diagramm ausblenden" : "Diagramm anzeigen";
    if(visible) renderDurationStatistics();
  });
  document.getElementById("toggleDashboardDurationChart")?.addEventListener("click",()=>{
    const chart=document.getElementById("dashboardDurationChart");
    const btn=document.getElementById("toggleDashboardDurationChart");
    if(!chart||!btn) return;
    chart.classList.toggle("hidden");
    setDashboardToggleLabel(btn,!chart.classList.contains("hidden"),"Diagramm ausblenden","Diagramm anzeigen");
    if(!chart.classList.contains("hidden")) renderDurationStatistics();
    if(typeof updateDashboardChartPinButtons==="function") updateDashboardChartPinButtons();
  });
  document.getElementById("toggleDashboardProfessionStats")?.addEventListener("click",()=>{
    const wrap=document.getElementById("dashboardProfessionStatsWrap");
    const btn=document.getElementById("toggleDashboardProfessionStats");
    if(!wrap||!btn) return;
    wrap.classList.toggle("hidden");
    setDashboardToggleLabel(btn,!wrap.classList.contains("hidden"),"Liste ausblenden","Liste anzeigen");
  });
  document.getElementById("toggleDashboardProfessionChart")?.addEventListener("click",()=>{
    const chart=document.getElementById("dashboardProfessionChart");
    const btn=document.getElementById("toggleDashboardProfessionChart");
    if(!chart||!btn) return;
    chart.classList.toggle("hidden");
    setDashboardToggleLabel(btn,!chart.classList.contains("hidden"),"Diagramm ausblenden","Diagramm anzeigen");
    if(!chart.classList.contains("hidden")) renderProfessionStats();
    if(typeof updateDashboardChartPinButtons==="function") updateDashboardChartPinButtons();
  });

  function bindSimpleDashboardToggle(buttonId,targetId,shownText,hiddenText,renderFn){
    const btn=document.getElementById(buttonId);
    const target=document.getElementById(targetId);
    if(!btn || !target) return;
    btn.addEventListener("click",()=>{
      target.classList.toggle("hidden");
      const visible=!target.classList.contains("hidden");
      setDashboardToggleLabel(btn,visible,shownText,hiddenText);
      if(visible && typeof renderFn==="function") renderFn();
      if(typeof updateDashboardChartPinButtons==="function") updateDashboardChartPinButtons();
    });
  }

  bindSimpleDashboardToggle("toggleDashboardHeaderCards","dashboardHeaderCards","Systemübersicht ausblenden","Systemübersicht anzeigen",()=>renderDashboard());
  bindSimpleDashboardToggle("toggleDashboardCockpitCards","dashboardCockpitCards","Kennzahlen ausblenden","Kennzahlen anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardAgeNumbers","dashboardAgeNumbers","Zahlen ausblenden","Zahlen anzeigen",()=>renderAgeStatistics());
  bindSimpleDashboardToggle("toggleDashboardDurationNumbers","dashboardDurationNumbers","Zahlen ausblenden","Zahlen anzeigen",()=>renderDurationStatistics());
  bindSimpleDashboardToggle("toggleDashboardDurationTable","dashboardDurationTableWrap","Tabelle ausblenden","Tabelle anzeigen",()=>renderDurationStatistics());
  bindSimpleDashboardToggle("toggleDashboardGenderChart","dashboardGenderChart","Diagramm ausblenden","Diagramm anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardGenderTable","dashboardGenderTableWrap","Tabelle ausblenden","Tabelle anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardStatusChart","dashboardStatusChart","Diagramm ausblenden","Diagramm anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardStatusTable","dashboardStatusTableWrap","Tabelle ausblenden","Tabelle anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardCityChart","dashboardCityChart","Diagramm ausblenden","Diagramm anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardCityTable","dashboardCityTableWrap","Tabelle ausblenden","Tabelle anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardCommitteeChart","dashboardCommitteeChart","Diagramm ausblenden","Diagramm anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardCommitteeTable","dashboardCommitteeTableWrap","Tabelle ausblenden","Tabelle anzeigen",()=>renderCockpitStats());
  bindSimpleDashboardToggle("toggleDashboardGrowthChart","dashboardGrowthChart","Diagramm ausblenden","Diagramm anzeigen",()=>renderGrowthStats());
  bindSimpleDashboardToggle("toggleDashboardGrowthTable","dashboardGrowthTableWrap","Tabelle ausblenden","Tabelle anzeigen",()=>renderGrowthStats());
  bindSimpleDashboardToggle("toggleDashboardDonationChart","dashboardDonationChart","Diagramm ausblenden","Diagramm anzeigen",()=>renderDonationDashboard());
  bindSimpleDashboardToggle("toggleDashboardDonationTable","dashboardDonationTableWrap","Tabelle ausblenden","Tabelle anzeigen",()=>renderDonationDashboard());
  refreshDashboardToggleArrows();

  document.getElementById("clearOfficeProtocol")?.addEventListener("click",clearOfficeProtocol);
  document.getElementById("saveRoleStarts")?.addEventListener("click",saveRoleStarts);
  document.getElementById("resetRoleStarts")?.addEventListener("click",resetRoleStarts);
  document.getElementById("saveMemberRoles")?.addEventListener("click",saveMemberRoleAssignments);
  document.getElementById("resetMemberRoles")?.addEventListener("click",resetMemberRoleAssignments);
  document.querySelectorAll("[data-users-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("[data-users-tab]").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".users-tab-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.usersTab)?.classList.add("active");
      renderUsersRights();
    });
  });
  document.getElementById("comboManager")?.addEventListener("click",e=>{
    const add=e.target.closest("[data-combo-add]");
    const del=e.target.closest("[data-combo-delete]");
    if(add){
      const key=add.dataset.comboAdd;
      const input=document.querySelector(`[data-combo-input="${CSS.escape(key)}"]`);
      addComboValue(key,input?.value||"");
      return;
    }
    if(del){
      deleteComboValue(del.dataset.comboDelete,del.dataset.comboValue);
    }
  });
  document.getElementById("comboManager")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter") return;
    const input=e.target.closest("[data-combo-input]");
    if(!input) return;
    e.preventDefault();
    addComboValue(input.dataset.comboInput,input.value);
  });
  document.querySelectorAll("#settings input,#settings select,#settings textarea").forEach(el=>el.addEventListener("input",markSettingsDirty));
  ["protocolFilterDate","protocolFilterUser","protocolFilterModule","protocolFilterAction"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      el.addEventListener("input",renderProtocol);
      el.addEventListener("change",renderProtocol);
    }
  });
  document.getElementById("resetProtocolFilters")?.addEventListener("click",()=>{
    ["protocolFilterDate","protocolFilterUser","protocolFilterModule","protocolFilterAction"].forEach(id=>setInputValue(id,""));
    renderProtocol();
    toast("Protokollfilter zurückgesetzt.","info");
  });
  document.getElementById("clearProtocol").addEventListener("click",()=>{
    if(!isAdminLike()){toast("Nur Admin darf das Protokoll löschen.","error");return;}
    if(!confirm("Protokoll wirklich löschen?")) return;
    state.protocol=[];
    saveState();
    renderProtocol();
    renderDashboard();
    toast("Protokoll gelöscht","success");
  });
  document.getElementById("cleanupProtocolKeep10")?.addEventListener("click",()=>{
    if(!isAdminLike()){toast("Nur Admin darf das Protokoll bereinigen.","error");return;}
    const keep=Math.max(1, Number(state.settings.protocolKeepEntries || 10));
    if(!confirm(`Protokoll bereinigen?\n\nDie letzten ${keep} Einträge bleiben erhalten.`)) return;
    const result=cleanupProtocolKeepLatest(keep);
    toast(`Protokoll bereinigt: ${result.deleted} Einträge gelöscht, ${result.kept} behalten.`,"success");
  });
  document.getElementById("exportProtocolCsv")?.addEventListener("click",()=>{
    if(!isAdminLike()){toast("Nur Admin darf das Protokoll exportieren.","error");return;}
    exportProtocolCsv();
  });
}


/* BEFUND 02.09.2026 (Betreiber): ueber der Inventarverwaltung stand als Ueberschrift
   "inventoryV2", und unten in der Statuszeile "Bereich: inventoryV2". Das ist der interne
   Name des Bildschirmabschnitts - Entwicklersprache, die auf keinen Bildschirm gehoert, den
   ein Vereinsmitglied sieht.

   URSACHE: es gab eine Namenstabelle, die nur 13 von 24 Ansichten kannte, und als Rueckfall
   stand dort der rohe Bezeichner. Eine Luecke in der Tabelle wurde damit unbemerkt zu einem
   Wort auf dem Bildschirm.

   JETZT wird der Name in dieser Reihenfolge gesucht:
     1. am Menueeintrag, der zu dieser Ansicht gehoert - das Menue ist die einzige Stelle, an
        der die Namen ohnehin gepflegt werden, also laeuft nichts mehr auseinander;
     2. an der Ueberschrift der Ansicht selbst;
     3. an der Tabelle unten, die jetzt alle Ansichten kennt;
     4. und erst ganz zuletzt an einer lesbar gemachten Fassung des Bezeichners
        ("inventoryV2" -> "Inventory"), damit selbst im schlimmsten Fall kein camelCase
        auf dem Schirm steht.
   Verwendet wird das an beiden Stellen: Statuszeile UND automatisch erzeugte Ueberschrift. */
const KNG_BEREICHSNAMEN={
  guestHome:"Startseite",
  dashboard:"Dashboard",
  members:"Mitgliederverwaltung",
  memberCards:"Mitgliedsausweis",
  workwear:"Dienstkleidung",
  communication:"Kommunikation",
  questionnaire:"Mitglieder-Fragebogen",
  addresses:"Adressverwaltung",
  orders:"Bestellung",
  activities:"Aktivitäten / Ausflüge",
  documents:"Dokumentenmanagement",
  keys:"Schlüsselverwaltung",
  finance:"Finanzen",
  donations:"Spenden",
  inventoryV2:"Inventarverwaltung",
  inventory:"Inventarverwaltung",
  secretariat:"Büro-Design",
  assistant:"Vereins-Assistent",
  settings:"Stammdaten",
  listRules:"Listenregeln",
  systemCheck:"Systemcheck",
  backup:"Datensicherung",
  protocol:"Protokoll",
  users:"Benutzer / Rechte",
  adminControl:"Schaltzentrale"
};
function kngLesbarGemacht(id){
  // camelCase auseinanderziehen und Versionsanhaengsel abschneiden: "inventoryV2" -> "Inventory"
  const roh=String(id||"").replace(/V\d+$/,"").replace(/([a-z0-9])([A-Z])/g,"$1 $2").trim();
  return roh ? roh.charAt(0).toUpperCase()+roh.slice(1) : "--";
}
function kngNameSaeubern(text){
  // Bildzeichen, Gruppenvorsatz ("Finanzen - Spenden") und Baumstriche entfernen - auf dem
  // Bildschirm soll der Name stehen, nicht der Weg dorthin.
  return String(text||"")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F\u2500-\u257F]/gu,"")
    .replace(/\s+/g," ")
    .replace(/^[\s\-–—·>|]+/,"")
    .replace(/^.*[–—]\s*/,"")
    .trim();
}
function kngBereichsname(id){
  if(!id) return "--";
  // 1. die gepflegte Tabelle - sie kennt alle Ansichten und liefert immer denselben Wortlaut
  if(KNG_BEREICHSNAMEN[id]) return KNG_BEREICHSNAMEN[id];
  // 2. der Menueeintrag - damit bekommt auch eine SPAETER hinzugekommene Ansicht einen Namen,
  //    ohne dass jemand daran denken muss
  try{
    const knopf=document.querySelector('[data-view="'+id+'"]');
    const text=kngNameSaeubern(knopf?.textContent);
    if(text && text.length>2 && /[A-Za-zÄÖÜäöüß]/.test(text)) return text;
  }catch(e){ /* ohne Menue geht es mit den naechsten Stufen weiter */ }
  // 3. die Ueberschrift der Ansicht
  try{
    const sicht=document.getElementById(id);
    const h=sicht?.querySelector(":scope > h3, :scope > h2, :scope > .view-header h3, :scope > .view-header h2");
    const text=kngNameSaeubern(h?.textContent);
    if(text && !/^[a-z]+[A-Z]/.test(text)) return text;
  }catch(e){ /* weiter mit dem Rueckfall */ }
  // 4. der lesbar gemachte Bezeichner - nie der rohe
  return kngLesbarGemacht(id);
}
if(typeof window!=="undefined") window.kngBereichsname=kngBereichsname;

function getActiveViewTitle(){
  const active=document.querySelector(".view.active");
  if(!active) return "Startseite";
  return kngBereichsname(active.id);
}

function getLastBackupText(){
  const list=Array.isArray(state.backupProtocol) ? state.backupProtocol : [];
  if(!list.length) return "--";
  const item=list[0];
  return `${item.date || ""} ${item.time || ""}`.trim() || "--";
}

function updateStatusBar(){
  const set=(id,text)=>{const el=document.getElementById(id); if(el) el.textContent=text;};
  const logged=!!state.session?.isLoggedIn;
  set("statusUser",`Benutzer: ${logged ? (state.session.userName || "--") : "Gast"}`);
  set("statusRole",`Rolle: ${logged ? (state.session.role || "--") : "Gast"}`);
  set("statusView",`Bereich: ${getActiveViewTitle()}`);
  /* Mitglieder heisst Mitglieder - Gaeste und Aushilfen werden getrennt genannt, sonst
     steht in der Fusszeile eine Zahl, die es im Verein nicht gibt. */
  {
    const g=(typeof getMemberStats==="function") ? getMemberStats() : null;
    set("statusMembers", g
      ? `Mitglieder: ${g.total}${g.guests?` (+${g.guests} Gäste/Aushilfen)`:""}`
      : `Mitglieder: ${(state.members || []).length}`);
  }
  set("statusBackup",`Letzte Sicherung: ${getLastBackupText()}`);
  set("statusClock",new Date().toLocaleTimeString("de-DE"));
}

function renderAll(){
  applyColors();
  applySidebarState();
  applyNavIconVisibility();
  applySession();
  updateClock();
  updateGuestHome();
  if(!state.session.isLoggedIn){
    showGuestHome();
    return;
  }
  renderDashboard();
  renderRoles();
  renderProtocol();
  renderBackupProtocol();
  renderSystemCheckProtocol();
  renderOfficeProtocol();
  renderSettings();
  renderAssistant();
  renderMembers();
  renderActivities();
  if(typeof renderDonations==="function") renderDonations();
  updateStatusBar();
}

window.addEventListener("beforeunload",e=>{
  if(state.session.isLoggedIn && (memberIsDirty() || settingsIsDirty())){
    e.preventDefault();
    e.returnValue="";
  }
});

function kngMainBootstrap(){
  if(window.__KNG_MAIN_BOOTSTRAP_DONE__) return;
  window.__KNG_MAIN_BOOTSTRAP_DONE__ = true;
  bindEvents();
  bindSidebarControls();
  initResizableTables();
  bindMembers();
  bindActivities();
  if(typeof bindDonations==="function") bindDonations();
  renderAll();
  if(window.TimerManager){
    TimerManager.interval('clock', updateClock, 1000);
  }else if(!window.__KNG_CLOCK_INTERVAL__){
    window.__KNG_CLOCK_INTERVAL__ = setInterval(updateClock,1000);
  }
}
if(window.App && typeof App.registerInit==='function') App.registerInit('main-bootstrap', kngMainBootstrap);
else kngReadyOnce('main-bootstrap', kngMainBootstrap);

