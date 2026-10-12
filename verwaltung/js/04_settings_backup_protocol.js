/* Stammdaten, Einstellungen, Auswahlboxen, Datensicherung, Protokolle */

/* GEAENDERT 01.09.2026: die Zeile begann mit dem englischen "since" und las sich als
   "since 1991 = 35 Jahre". Jetzt deutsch und ohne Gleichheitszeichen. */
function foundedYearInfo(){
  const raw=state.settings.clubFoundedAt;
  if(!raw) return "seit --";
  const year=Number(String(raw).slice(0,4));
  if(!year || Number.isNaN(year)) return "seit --";
  const years=Math.max(0,new Date().getFullYear()-year);
  return `seit ${year} · ${years} Jahre`;
}

function applyClubBranding(){
  const name=(state.settings.clubName || "Köcheclub").trim() || "Köcheclub";
  const brand=document.getElementById("brandClubName");
  const since=document.getElementById("brandSinceLine");
  const emptyName=document.getElementById("emptyClubName");
  const emptySince=document.getElementById("emptySinceLine");
  const brandLogo=document.getElementById("brandLogoBox");
  const empty=document.getElementById("emptyDesktop");
  const emptyHat=empty?.querySelector(".empty-chef-hat");
  if(brand) brand.textContent=name;
  if(since) since.textContent=foundedYearInfo();
  if(emptyName) emptyName.textContent=name;
  if(emptySince) emptySince.textContent=foundedYearInfo();
  const small=(state.settings.clubLogoSmallPath||"").trim();
  const large=(state.settings.clubLogoBackgroundPath||small||"").trim();
  if(brandLogo){
    if(small){ brandLogo.classList.add("has-custom-logo"); brandLogo.innerHTML=`<img src="${escapeHtml(small)}" alt="Vereinslogo">`; }
    else { brandLogo.classList.remove("has-custom-logo"); brandLogo.innerHTML='<span id="brandLogoFallback">🍽️</span>'; }
  }
  if(empty && emptyHat){
    if(large){ empty.classList.add("has-custom-logo"); emptyHat.innerHTML=`<img src="${escapeHtml(large)}" alt="Kochmütze Hintergrund">`; }
    else { empty.classList.remove("has-custom-logo"); emptyHat.textContent='👨‍🍳'; }
  }
  document.title=name + " – Next Generation";
}



function applyColors(){
  const c={...DEFAULT_STATE.colors,...(state.colors||{})};
  const root=document.documentElement;
  root.style.setProperty("--bg",c.bg);
  root.style.setProperty("--panel",c.panel);
  root.style.setProperty("--primary",c.primary);
  root.style.setProperty("--primary-dark",c.primaryDark);
  root.style.setProperty("--text",c.text);
  root.style.setProperty("--line",c.line);
  root.style.setProperty("--status-active",c.statusActive || DEFAULT_STATE.colors.statusActive);
  root.style.setProperty("--status-passive",c.statusPassive || DEFAULT_STATE.colors.statusPassive);
  root.style.setProperty("--status-honorary",c.statusHonorary || DEFAULT_STATE.colors.statusHonorary);
  root.style.setProperty("--status-exited",c.statusExited || DEFAULT_STATE.colors.statusExited);
  root.style.setProperty("--status-guest",c.statusGuest || DEFAULT_STATE.colors.statusGuest);
  root.style.setProperty("--status-temp",c.statusTemp || DEFAULT_STATE.colors.statusTemp);
  root.style.setProperty("--status-missing",c.statusMissing || DEFAULT_STATE.colors.statusMissing);
  root.style.setProperty("--pinboard-note",c.pinboardNote || DEFAULT_STATE.colors.pinboardNote);
  root.style.setProperty("--pinboard-pin",c.pinboardPin || DEFAULT_STATE.colors.pinboardPin);
  root.style.setProperty("--digital-clock",c.digitalClock || DEFAULT_STATE.colors.digitalClock);
  for(let i=1;i<=12;i++){
    root.style.setProperty(`--chart-${i}`, c[`chart${i}`] || DEFAULT_STATE.colors[`chart${i}`]);
  }
}

const COLOR_PRESETS={
  green:{bg:"#f4f7f3",panel:"#ffffff",primary:"#2f6b3f",primaryDark:"#234d2e",text:"#1f2a1f",line:"#dfe6dc"},
  blue:{bg:"#f3f6fb",panel:"#ffffff",primary:"#245f9f",primaryDark:"#173f6b",text:"#172333",line:"#dbe4f0"},
  anthracite:{bg:"#f2f3f3",panel:"#ffffff",primary:"#3a3f44",primaryDark:"#25282c",text:"#202326",line:"#d9dcde"},
  wine:{bg:"#f8f3f4",panel:"#ffffff",primary:"#7a2638",primaryDark:"#501927",text:"#2b1d20",line:"#eadadd"},
  red:{bg:"#fff5f5",panel:"#ffffff",primary:"#b3261e",primaryDark:"#7f1d1d",text:"#2b1b1b",line:"#f0d4d4"},
  yellow:{bg:"#fff9e6",panel:"#ffffff",primary:"#b88700",primaryDark:"#7a5a00",text:"#2a230f",line:"#eadca8"},
  orange:{bg:"#fff3e8",panel:"#ffffff",primary:"#c15a12",primaryDark:"#843b0b",text:"#2b1d12",line:"#efd6c0"},
  purple:{bg:"#f7f2fb",panel:"#ffffff",primary:"#6f3aa8",primaryDark:"#4b2673",text:"#251a33",line:"#dfd0ec"},
  teal:{bg:"#eef8f7",panel:"#ffffff",primary:"#18746d",primaryDark:"#0f4f4a",text:"#142927",line:"#cfe5e2"}
};

function readColorFields(){
  return {
    bg:settingValue("colorBg") || DEFAULT_STATE.colors.bg,
    panel:settingValue("colorPanel") || DEFAULT_STATE.colors.panel,
    primary:settingValue("colorPrimary") || DEFAULT_STATE.colors.primary,
    primaryDark:settingValue("colorPrimaryDark") || DEFAULT_STATE.colors.primaryDark,
    text:settingValue("colorText") || DEFAULT_STATE.colors.text,
    line:settingValue("colorLine") || DEFAULT_STATE.colors.line,
    statusActive:settingValue("colorStatusActive") || DEFAULT_STATE.colors.statusActive,
    statusPassive:settingValue("colorStatusPassive") || DEFAULT_STATE.colors.statusPassive,
    statusHonorary:settingValue("colorStatusHonorary") || DEFAULT_STATE.colors.statusHonorary,
    statusExited:settingValue("colorStatusExited") || DEFAULT_STATE.colors.statusExited,
    statusGuest:settingValue("colorStatusGuest") || DEFAULT_STATE.colors.statusGuest,
    statusTemp:settingValue("colorStatusTemp") || DEFAULT_STATE.colors.statusTemp,
    statusMissing:settingValue("colorStatusMissing") || DEFAULT_STATE.colors.statusMissing,
    chart1:settingValue("colorChart1") || DEFAULT_STATE.colors.chart1,
    chart2:settingValue("colorChart2") || DEFAULT_STATE.colors.chart2,
    chart3:settingValue("colorChart3") || DEFAULT_STATE.colors.chart3,
    chart4:settingValue("colorChart4") || DEFAULT_STATE.colors.chart4,
    chart5:settingValue("colorChart5") || DEFAULT_STATE.colors.chart5,
    chart6:settingValue("colorChart6") || DEFAULT_STATE.colors.chart6,
    chart7:settingValue("colorChart7") || DEFAULT_STATE.colors.chart7,
    chart8:settingValue("colorChart8") || DEFAULT_STATE.colors.chart8,
    chart9:settingValue("colorChart9") || DEFAULT_STATE.colors.chart9,
    chart10:settingValue("colorChart10") || DEFAULT_STATE.colors.chart10,
    chart11:settingValue("colorChart11") || DEFAULT_STATE.colors.chart11,
    chart12:settingValue("colorChart12") || DEFAULT_STATE.colors.chart12,
    dashboardChartColors: !!document.getElementById("colorDashboardCharts")?.checked,
    dashboardTableColors: !!document.getElementById("colorDashboardTables")?.checked,
    pinboardNote:settingValue("colorPinboardNote") || DEFAULT_STATE.colors.pinboardNote,
    pinboardPin:settingValue("colorPinboardPin") || DEFAULT_STATE.colors.pinboardPin,
    digitalClock:settingValue("colorDigitalClock") || DEFAULT_STATE.colors.digitalClock
  };
}

function renderColors(){
  const c={...DEFAULT_STATE.colors,...(state.colors||{})};
  setInputValue("colorBg",c.bg);
  setInputValue("colorPanel",c.panel);
  setInputValue("colorPrimary",c.primary);
  setInputValue("colorPrimaryDark",c.primaryDark);
  setInputValue("colorText",c.text);
  setInputValue("colorLine",c.line);
  setInputValue("colorStatusActive",c.statusActive || DEFAULT_STATE.colors.statusActive);
  setInputValue("colorStatusPassive",c.statusPassive || DEFAULT_STATE.colors.statusPassive);
  setInputValue("colorStatusHonorary",c.statusHonorary || DEFAULT_STATE.colors.statusHonorary);
  setInputValue("colorStatusExited",c.statusExited || DEFAULT_STATE.colors.statusExited);
  setInputValue("colorStatusGuest",c.statusGuest || DEFAULT_STATE.colors.statusGuest);
  setInputValue("colorStatusTemp",c.statusTemp || DEFAULT_STATE.colors.statusTemp);
  setInputValue("colorStatusMissing",c.statusMissing || DEFAULT_STATE.colors.statusMissing);
  for(let i=1;i<=12;i++){ setInputValue(`colorChart${i}`, c[`chart${i}`] || DEFAULT_STATE.colors[`chart${i}`]); }
  setInputValue("colorPinboardNote", c.pinboardNote || DEFAULT_STATE.colors.pinboardNote);
  setInputValue("colorPinboardPin", c.pinboardPin || DEFAULT_STATE.colors.pinboardPin);
  setInputValue("colorDigitalClock", c.digitalClock || DEFAULT_STATE.colors.digitalClock);
  const chartsToggle=document.getElementById("colorDashboardCharts");
  const tablesToggle=document.getElementById("colorDashboardTables");
  if(chartsToggle) chartsToggle.checked = c.dashboardChartColors !== false;
  if(tablesToggle) tablesToggle.checked = c.dashboardTableColors !== false;
  setInputValue("colorPreset","custom");
  updateDashboardColorPaletteVisibility();
}


function updateDashboardColorPaletteVisibility(){
  const chartsToggle=document.getElementById("colorDashboardCharts");
  const tablesToggle=document.getElementById("colorDashboardTables");
  const palette=document.getElementById("dashboardColorPaletteSection");
  if(!palette) return;
  const show=!!chartsToggle?.checked && !!tablesToggle?.checked;
  palette.classList.toggle("hidden",!show);
  palette.setAttribute("aria-hidden",show ? "false" : "true");
}

function saveColors(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Farben speichern.","error");
    return false;
  }
  state.colors=readColorFields();
  saveState();
  applyColors();
  logAction("Einstellungen","Farben gespeichert","");
  toast("Farben erfolgreich gespeichert.","success");
  return true;
}

function resetColors(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Farben zurücksetzen.","error");
    return false;
  }
  if(!confirm("Farben wirklich auf Standard zurücksetzen?")) return false;
  state.colors=clone(DEFAULT_STATE.colors);
  saveState();
  applyColors();
  renderColors();
  logAction("Einstellungen","Farben zurückgesetzt","");
  toast("Standardfarben wiederhergestellt.","success");
  return true;
}

function applyColorPreset(presetKey){
  const preset=COLOR_PRESETS[presetKey];
  if(!preset) return;
  setInputValue("colorBg",preset.bg);
  setInputValue("colorPanel",preset.panel);
  setInputValue("colorPrimary",preset.primary);
  setInputValue("colorPrimaryDark",preset.primaryDark);
  setInputValue("colorText",preset.text);
  setInputValue("colorLine",preset.line);
  setInputValue("colorStatusActive",preset.statusActive || DEFAULT_STATE.colors.statusActive);
  setInputValue("colorStatusPassive",preset.statusPassive || DEFAULT_STATE.colors.statusPassive);
  setInputValue("colorStatusHonorary",preset.statusHonorary || DEFAULT_STATE.colors.statusHonorary);
  setInputValue("colorStatusExited",preset.statusExited || DEFAULT_STATE.colors.statusExited);
  setInputValue("colorStatusGuest",preset.statusGuest || DEFAULT_STATE.colors.statusGuest);
  setInputValue("colorStatusTemp",preset.statusTemp || DEFAULT_STATE.colors.statusTemp);
  setInputValue("colorStatusMissing",preset.statusMissing || DEFAULT_STATE.colors.statusMissing);
  for(let i=1;i<=12;i++){ setInputValue(`colorChart${i}`, preset[`chart${i}`] || DEFAULT_STATE.colors[`chart${i}`]); }
  const chartsToggle=document.getElementById("colorDashboardCharts");
  const tablesToggle=document.getElementById("colorDashboardTables");
  if(chartsToggle) chartsToggle.checked = state.colors?.dashboardChartColors !== false;
  if(tablesToggle) tablesToggle.checked = state.colors?.dashboardTableColors !== false;
  updateDashboardColorPaletteVisibility();
  const previous=state.colors;
  state.colors=readColorFields();
  applyColors();
  state.colors=previous;
}

function settingsSignature(){
  const ids=[
    "clubName","clubFoundedAt","clubSpeaker","deputyClubSpeaker","treasurer","deputyTreasurer","cashAuditor","clubStreet","clubPostalCode","clubCity",
    "clubPhone","clubMobile","clubWebsite","clubEmail","clubLogoSmallPath","clubLogoBackgroundPath","bankName","iban","bic","adminPassword","protocolMaxEntries","protocolKeepEntries"
  ];
  const data={};
  ids.forEach(id=>data[id]=settingValue(id));
  data.navIcons=Array.from(document.querySelectorAll("#navIconSettings input[data-nav-icon]:checked")).map(cb=>cb.dataset.navIcon);
  data.protocolAutoCleanup=!!document.getElementById("protocolAutoCleanup")?.checked;
  data.userClockEnabled=!!document.getElementById("userClockEnabled")?.checked;
  return JSON.stringify(data);
}

function markSettingsClean(){
  settingsSnapshot=settingsSignature();
  document.getElementById("settingsMasterData")?.classList.remove("unsaved-hint");
}

function settingsIsDirty(){
  if(!state.session.isLoggedIn) return false;
  if(!settingsSnapshot) return false;
  return settingsSignature()!==settingsSnapshot;
}

function markSettingsDirty(){
  if(settingsIsDirty()) document.getElementById("settingsMasterData")?.classList.add("unsaved-hint");
}

function confirmLeaveSettings(){
  if(!state.session.isLoggedIn) return true;
  if(!settingsIsDirty()) return true;
  const save=confirm("Möchten Sie die Änderungen speichern oder verwerfen?\n\nOK = speichern\nAbbrechen = verwerfen");
  if(save) return saveSettings();
  renderSettings();
  toast("Änderungen verworfen.","info");
  return true;
}

function saveSettings(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Einstellungen speichern.","error");
    return;
  }
  state.settings.clubName=settingValue("clubName") || "Köcheclub Werne";
  state.settings.clubFoundedAt=settingValue("clubFoundedAt");
  const oldOffices={
    clubSpeaker:state.settings.clubSpeaker || "",
    deputyClubSpeaker:state.settings.deputyClubSpeaker || "",
    treasurer:state.settings.treasurer || "",
    deputyTreasurer:state.settings.deputyTreasurer || "",
    cashAuditor:state.settings.cashAuditor || ""
  };
  state.settings.clubSpeaker=settingValue("clubSpeaker");
  state.settings.deputyClubSpeaker=settingValue("deputyClubSpeaker");
  state.settings.treasurer=settingValue("treasurer");
  state.settings.deputyTreasurer=settingValue("deputyTreasurer");
  state.settings.cashAuditor=settingValue("cashAuditor");
  logOfficeChanges(oldOffices,{
    clubSpeaker:state.settings.clubSpeaker || "",
    deputyClubSpeaker:state.settings.deputyClubSpeaker || "",
    treasurer:state.settings.treasurer || "",
    deputyTreasurer:state.settings.deputyTreasurer || "",
    cashAuditor:state.settings.cashAuditor || ""
  });
  state.settings.clubStreet=settingValue("clubStreet");
  state.settings.clubPostalCode=settingValue("clubPostalCode");
  state.settings.clubCity=settingValue("clubCity");
  state.settings.clubPhone=settingValue("clubPhone");
  state.settings.clubMobile=settingValue("clubMobile");
  state.settings.clubWebsite=settingValue("clubWebsite");
  state.settings.clubEmail=settingValue("clubEmail");
  state.settings.clubLogoSmallPath=settingValue("clubLogoSmallPath");
  state.settings.clubLogoBackgroundPath=settingValue("clubLogoBackgroundPath");
  state.settings.bankName=settingValue("bankName");
  state.settings.iban=settingValue("iban");
  state.settings.bic=settingValue("bic");
  state.settings.adminPassword=settingValue("adminPassword") || "admin123";
  state.settings.protocolMaxEntries=Math.max(0, Number(settingValue("protocolMaxEntries") || 0));
  state.settings.protocolKeepEntries=Math.max(1, Number(settingValue("protocolKeepEntries") || 10));
  state.settings.protocolAutoCleanup=!!document.getElementById("protocolAutoCleanup")?.checked;
  try{ const prefs=(typeof getUserPrefsObject==="function") ? getUserPrefsObject() : (state.userPrefs[state.session.userName] ||= {}); prefs.clockEnabled=!!document.getElementById("userClockEnabled")?.checked; }catch(e){}
  const navIconChecks=Array.from(document.querySelectorAll("#navIconSettings input[data-nav-icon]:checked")).map(cb=>cb.dataset.navIcon);
  state.settings.navIcons=navIconChecks.length ? navIconChecks : clone(DEFAULT_STATE.settings.navIcons);
  applyNavIconVisibility();
  saveState();
  applyClubBranding();
  renderDashboard();
  renderSettings();
  logAction("Einstellungen","Stammdaten gespeichert",state.settings.clubName);
  toast("Stammdaten erfolgreich gespeichert.","success");
  return true;
}

function cleanupProtocolKeepLatest(keepCount){
  if(!Array.isArray(state.protocol)) state.protocol=[];
  const keep=Math.max(1, Number(keepCount || state.settings.protocolKeepEntries || 10));
  const oldCount=state.protocol.length;
  if(oldCount<=keep) return {oldCount,deleted:0,kept:oldCount};
  state.protocol=state.protocol.slice(0,keep);
  const deleted=oldCount-state.protocol.length;
  logAction("Protokoll","Bereinigung",`${deleted} Einträge gelöscht, ${state.protocol.length} Einträge behalten`);
  saveState();
  renderProtocol();
  renderDashboard();
  return {oldCount,deleted,kept:state.protocol.length};
}

function checkProtocolThreshold(){
  if(!isAdminLike || !isAdminLike()) return;
  const limit=Number(state.settings.protocolMaxEntries || 0);
  if(!limit) return;
  const count=Array.isArray(state.protocol)?state.protocol.length:0;
  if(count<=limit) return;
  const keep=Math.max(1, Number(state.settings.protocolKeepEntries || 10));
  if(state.settings.protocolAutoCleanup){
    const result=cleanupProtocolKeepLatest(keep);
    toast(`Protokoll automatisch bereinigt: ${result.deleted} Einträge gelöscht, ${result.kept} behalten.`,"info");
    return;
  }
  const msg=`Im Protokoll befinden sich ${count} Einträge.\n\nDer eingestellte Schwellenwert von ${limit} Einträgen wurde überschritten.\n\nWollen Sie das Protokoll jetzt bereinigen?\n\nDie letzten ${keep} Einträge bleiben erhalten.`;
  if(confirm(msg)){
    const result=cleanupProtocolKeepLatest(keep);
    alert(`Protokoll erfolgreich bereinigt.\n\n${result.kept} Einträge wurden beibehalten.\n${result.deleted} Einträge wurden gelöscht.`);
  }
}

function exportProtocolCsv(){
  const rows=Array.isArray(state.protocol)?state.protocol:[];
  const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const csv=[['Zeit','Benutzer','Modul','Aktion','Details'].map(esc).join(';')]
    .concat(rows.map(p=>[p.time,p.user,p.module,p.action,p.details].map(esc).join(';'))).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='koecheclub_protokoll.csv';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function renderSettings(){
  if(!state.session.isLoggedIn){
    updateGuestHome();
    return;
  }
  setInputValue("clubName",state.settings.clubName);
  setInputValue("clubFoundedAt",state.settings.clubFoundedAt);
  populateOfficeSelects();
  setInputValue("clubSpeaker",state.settings.clubSpeaker);
  setInputValue("deputyClubSpeaker",state.settings.deputyClubSpeaker);
  setInputValue("treasurer",state.settings.treasurer);
  setInputValue("deputyTreasurer",state.settings.deputyTreasurer||"");
  setInputValue("cashAuditor",state.settings.cashAuditor);
  setInputValue("clubStreet",state.settings.clubStreet);
  setInputValue("clubPostalCode",state.settings.clubPostalCode);
  setInputValue("clubCity",state.settings.clubCity);
  setInputValue("clubPhone",state.settings.clubPhone);
  setInputValue("clubMobile",state.settings.clubMobile);
  setInputValue("clubWebsite",state.settings.clubWebsite);
  setInputValue("clubEmail",state.settings.clubEmail);
  setInputValue("clubLogoSmallPath",state.settings.clubLogoSmallPath||"");
  setInputValue("clubLogoBackgroundPath",state.settings.clubLogoBackgroundPath||"");
  setInputValue("bankName",state.settings.bankName);
  setInputValue("iban",state.settings.iban);
  setInputValue("bic",state.settings.bic);
  setInputValue("adminPassword",state.settings.adminPassword);
  setInputValue("protocolMaxEntries", Number(state.settings.protocolMaxEntries || 0));
  setInputValue("protocolKeepEntries", Number(state.settings.protocolKeepEntries || 10));
  const autoCleanup=document.getElementById("protocolAutoCleanup");
  if(autoCleanup) autoCleanup.checked=!!state.settings.protocolAutoCleanup;
  const clockToggle=document.getElementById("userClockEnabled");
  if(clockToggle){ try{ const prefs=(typeof getUserPrefsObject==="function") ? getUserPrefsObject() : {}; clockToggle.checked = prefs.clockEnabled !== false; }catch(e){ clockToggle.checked=true; } }
  setInputValue("assistantGlobalEnabled",state.settings.assistantGlobalEnabled===false?"no":"yes");
  setInputValue("assistantExternalPrepared",state.settings.assistantExternalPrepared?"prepared":"no");
  setInputValue("assistantExternalEndpoint",state.settings.assistantExternalEndpoint||"");
  const memberStats=getMemberStats();
  setInputValue("memberCountInfo",String(memberStats.total));
  setInputValue("memberCountActiveInfo",String(memberStats.active));
  setInputValue("memberCountPassiveInfo",String(memberStats.passive));
  setInputValue("memberCountExitedInfo",String(memberStats.exited));
  setInputValue("memberCountGuestInfo",String(memberStats.guests));
  setInputValue("memberCountPersonInfo",String(memberStats.persons));
  renderAgeStatistics();
  renderDurationStatistics();
  renderNavIconSettings();
  applyNavIconVisibility();
  applyClubBranding();
  renderOfficeProtocol();
  renderColors();
  renderComboManager();
  markSettingsClean();
}

function memberDisplayName(m){
  const name=`${m.lastName || ""}, ${m.firstName || ""}`.replace(/^,\s*/,"").trim();
  return name || m.memberNo || "Unbenannt";
}

function populateOfficeSelects(){
  const ids=["clubSpeaker","deputyClubSpeaker","treasurer","deputyTreasurer","cashAuditor"];
  const members=sortedMembers();
  ids.forEach(id=>{
    const select=document.getElementById(id);
    if(!select) return;
    const current=select.value || state.settings[id] || "";
    select.innerHTML=`<option value="">-- bitte auswählen --</option>` + members.map(m=>{
      const label=`${memberDisplayName(m)}${m.memberNo ? " ("+m.memberNo+")" : ""}`;
      return `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
    }).join("");
    select.value=current;
  });
}

function officeLabel(key){
  return {clubSpeaker:"Clubsprecher",deputyClubSpeaker:"Stellv. Clubsprecher",treasurer:"Kassenwart",deputyTreasurer:"Vertreter Kassenwart",cashAuditor:"Kassenprüfer"}[key] || key;
}

function logOfficeChanges(oldOffices,newOffices){
  state.officeProtocol=Array.isArray(state.officeProtocol) ? state.officeProtocol : [];
  Object.keys(newOffices).forEach(key=>{
    const oldValue=oldOffices[key] || "";
    const newValue=newOffices[key] || "";
    if(oldValue===newValue) return;
    const now=new Date();
    const action=oldValue
      ? `${officeLabel(key)} ersetzt durch ${newValue || "-- nicht besetzt --"}`
      : `${officeLabel(key)} neu vergeben an ${newValue || "-- nicht besetzt --"}`;
    state.officeProtocol.unshift({
      date:now.toLocaleDateString("de-DE"),
      time:now.toLocaleTimeString("de-DE"),
      iso:now.toISOString(),
      office:officeLabel(key),
      previous:oldValue || "--",
      current:newValue || "--",
      action,
      user:state.session.userName || "Gast"
    });
    logAction("Stammdaten",action,oldValue ? `vorher: ${oldValue}` : "vorher: --");
  });
}

function renderOfficeProtocol(){
  const body=document.getElementById("officeProtocolTable");
  if(!body) return;
  const rows=Array.isArray(state.officeProtocol) ? state.officeProtocol : [];
  body.innerHTML=rows.length ? rows.map(r=>`
    <tr>
      <td>${escapeHtml(r.date || "")}</td>
      <td>${escapeHtml(r.time || "")}</td>
      <td>${escapeHtml(r.office || "")}</td>
      <td>${escapeHtml(r.previous || "")}</td>
      <td>${escapeHtml(r.current || "")}</td>
      <td>${escapeHtml(r.user || "")}</td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="muted">Noch keine Ämteränderung protokolliert.</td></tr>`;
}

function clearOfficeProtocol(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf das Ämter-Protokoll löschen.","error");
    return;
  }
  if(!confirm("Ämter-Protokoll wirklich löschen?")) return;
  state.officeProtocol=[];
  saveState();
  renderOfficeProtocol();
  toast("Ämter-Protokoll gelöscht.","success");
}


function renderComboManager(){
  const root=document.getElementById("comboManager");
  if(!root) return;
  state.combos=normalizeCombos({...clone(DEFAULT_STATE.combos),...(state.combos||{})});
  if(!COMBO_GROUPS.length){
    root.innerHTML=`<p class="muted">Keine Auswahlboxen definiert.</p>`;
    return;
  }
  root.innerHTML=COMBO_GROUPS.map(group=>`
    <section class="combo-group">
      <h5>${escapeHtml(group.title)}</h5>
      <div class="combo-card-grid">
        ${group.items.map(item=>renderComboCard(item)).join("")}
      </div>
    </section>
  `).join("");
}

function renderComboCard(item){
  const values=normalizeComboValues(state.combos[item.key]||[]);
  return `
    <article class="combo-card" data-combo-key="${escapeHtml(item.key)}">
      <div class="combo-card-head">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${Math.max(values.length-1,0)} Einträge</span>
      </div>
      <div class="combo-values">
        ${values.map((value,index)=>`
          <div class="combo-value-row ${index===0 ? "fixed-empty" : ""}">
            <span>${index===0 ? "Leerzeile" : escapeHtml(value)}</span>
            ${index===0 ? "<em>fix</em>" : `<button type="button" class="danger tiny" data-combo-delete="${escapeHtml(item.key)}" data-combo-value="${escapeHtml(value)}">Löschen</button>`}
          </div>
        `).join("")}
      </div>
      <div class="combo-add-row">
        <input type="text" data-combo-input="${escapeHtml(item.key)}" placeholder="Neuen Eintrag hinzufügen">
        <button type="button" class="secondary" data-combo-add="${escapeHtml(item.key)}">Hinzufügen</button>
      </div>
    </article>
  `;
}

function saveCombosAndRefresh(actionText){
  state.combos=normalizeCombos(state.combos);
  saveState();
  initMemberCombos();
  populateOfficeSelects();
  renderComboManager();
  renderSettings();
  logAction("Einstellungen","Auswahlboxen geändert",actionText);
}

function addComboValue(key,value){
  if(!isAdminLike()){toast("Nur Admin/Systeminhaber darf Auswahlboxen ändern.","error");return;}
  const text=String(value||"").trim();
  if(!text){toast("Bitte einen Begriff eingeben.","error");return;}
  state.combos=normalizeCombos(state.combos);
  state.combos[key]=normalizeComboValues(state.combos[key]);
  if(state.combos[key].includes(text)){toast("Dieser Eintrag ist bereits vorhanden.","error");return;}
  state.combos[key].push(text);
  saveCombosAndRefresh(`${key}: ${text} hinzugefügt`);
  toast("Eintrag erfolgreich hinzugefügt.","success");
}

function deleteComboValue(key,value){
  if(!isAdminLike()){toast("Nur Admin/Systeminhaber darf Auswahlboxen ändern.","error");return;}
  const text=String(value||"").trim();
  if(!text){toast("Die Leerzeile kann nicht gelöscht werden.","error");return;}
  if(!confirm(`Eintrag "${text}" wirklich löschen?`)) return;
  state.combos=normalizeCombos(state.combos);
  state.combos[key]=(state.combos[key]||[]).filter(v=>v!==text);
  saveCombosAndRefresh(`${key}: ${text} gelöscht`);
  toast("Eintrag erfolgreich gelöscht.","success");
}

function deleteMasterData(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Stammdaten löschen.","error");
    return false;
  }
  if(!confirm("Stammdaten des Clubs wirklich löschen?")) return false;
  const adminPassword=state.settings.adminPassword || DEFAULT_STATE.settings.adminPassword;
  state.settings={...clone(DEFAULT_STATE.settings),adminPassword};
  saveState();
  renderSettings();
  renderDashboard();
  logAction("Einstellungen","Stammdaten gelöscht","");
  toast("Stammdaten erfolgreich gelöscht.","success");
  return true;
}

function toggleSettingsMenu(){
  const submenu=document.getElementById("settingsSubmenu");
  const sign=document.getElementById("settingsMenuSign");
  const toggle=document.getElementById("settingsMenuToggle");
  const open=!submenu.classList.contains("open");
  submenu.classList.toggle("open",open);
  sign.textContent=open?"−":"+";
  toggle.setAttribute("aria-expanded",String(open));
}

function detectWindowsVersion(){
  const ua=navigator.userAgent || "";
  if(ua.includes("Windows NT 10.0")) return "Windows 10 / 11";
  if(ua.includes("Windows NT 6.3")) return "Windows 8.1";
  if(ua.includes("Windows NT 6.2")) return "Windows 8";
  if(ua.includes("Windows NT 6.1")) return "Windows 7";
  return navigator.platform || "unbekannt";
}

function detectBrowser(){
  const ua=navigator.userAgent || "";
  if(ua.includes("Edg/")) return "Microsoft Edge";
  if(ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if(ua.includes("Firefox/")) return "Mozilla Firefox";
  if(ua.includes("Chrome/")) return "Google Chrome / Chromium";
  if(ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "unbekannt";
}

function storageUsageInfo(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY) || "";
    return `${(new Blob([raw]).size/1024).toFixed(1)} KB LocalStorage`;
  }catch(err){
    return "nicht ermittelbar";
  }
}

function getInfoRows(){
  return [
    ["App-Version",APP_VERSION],
    ["Programmautor","Hans-Joachim Koch"],
    ["Benutzer",state.session.userName || "Gast"],
    ["Rolle",state.session.role || "Gast"],
    ["Angemeldet seit",state.session.loginSince || "--"],
    ["Club",state.settings.clubName || "--"],
    ["Mitglieder",String(getMemberCount())],
    ["Windows / Plattform",detectWindowsVersion()],
    ["Browser",detectBrowser()],
    ["Browser-Sprache",navigator.language || "--"],
    ["Online-Status",navigator.onLine ? "online" : "offline"],
    ["Netzwerkumgebung",navigator.onLine ? "Browser meldet Netzwerkverbindung" : "Browser meldet keine Netzwerkverbindung"],
    ["Bildschirm",`${screen.width} × ${screen.height}`],
    ["Fenster",`${window.innerWidth} × ${window.innerHeight}`],
    ["Speicherort","LocalStorage im aktuellen Browserprofil"],
    ["Datenumfang",storageUsageInfo()],
    ["User-Agent",navigator.userAgent || "--"]
  ];
}

function renderInfoHtml(){
  const rows=getInfoRows();
  return `<dl class="info-grid">${rows.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl>`;
}

function showInfo(){
  const info=document.getElementById("infoContent");
  if(info) info.innerHTML=renderInfoHtml();
  document.getElementById("infoDialog").showModal();
}

function printInfoPdf(){
  const rows=getInfoRows();
  const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Systeminfo</title>
    <style>
      body{font-family:Arial,sans-serif;margin:28px;color:#172016}h1{font-size:22px;margin-bottom:16px}
      table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:8px;vertical-align:top}td:first-child{font-weight:bold;background:#f2f5f2;width:220px}
      .meta{font-size:12px;color:#666;margin-top:18px}
    </style></head><body><h1>Systeminfo</h1><table>${rows.map(([k,v])=>`<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("")}</table><p class="meta">Gedruckt am ${new Date().toLocaleString("de-DE")}</p></body></html>`;
  const w=window.open("","_blank");
  if(!w){toast("Druckfenster konnte nicht geöffnet werden. Bitte Pop-up-Blocker prüfen.","error");return;}
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(),250);
}

function printPage(){
  window.print();
}


/* Test 20: Grafikdateien über Dateiauswahl laden und als Daten-URL speichern */
function readImageFileToInput(fileInputId, targetInputId){
  const fileInput=document.getElementById(fileInputId);
  const target=document.getElementById(targetInputId);
  if(!fileInput || !target) return;
  const file=fileInput.files && fileInput.files[0];
  if(!file) return;
  if(!/^image\//i.test(file.type||"")){
    toast("Bitte eine Bilddatei auswählen.","error");
    fileInput.value="";
    return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
    target.value=String(reader.result||"");
    if(targetInputId==="clubLogoSmallPath") state.settings.clubLogoSmallPath=target.value;
    if(targetInputId==="clubLogoBackgroundPath") state.settings.clubLogoBackgroundPath=target.value;
    applyClubBranding();
    markSettingsDirty();
    toast("Grafik übernommen. Bitte Stammdaten speichern.","success");
  };
  reader.onerror=()=>toast("Grafik konnte nicht gelesen werden.","error");
  reader.readAsDataURL(file);
}

function initLogoFilePickers(){
  const smallBtn=document.getElementById("chooseClubLogoSmall");
  const smallFile=document.getElementById("clubLogoSmallFile");
  const bgBtn=document.getElementById("chooseClubLogoBackground");
  const bgFile=document.getElementById("clubLogoBackgroundFile");
  if(smallBtn && smallFile && !smallBtn.__kngLogoPickBound){
    smallBtn.__kngLogoPickBound=true;
    smallBtn.addEventListener("click",()=>smallFile.click());
    smallFile.addEventListener("change",()=>readImageFileToInput("clubLogoSmallFile","clubLogoSmallPath"));
  }
  if(bgBtn && bgFile && !bgBtn.__kngLogoPickBound){
    bgBtn.__kngLogoPickBound=true;
    bgBtn.addEventListener("click",()=>bgFile.click());
    bgFile.addEventListener("change",()=>readImageFileToInput("clubLogoBackgroundFile","clubLogoBackgroundPath"));
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  initLogoFilePickers();
  document.addEventListener("click",()=>setTimeout(initLogoFilePickers,0),true);
});

function escapeHtml(v){
  return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}


const memberFields=[
  "memberNo","salutation","title","preferredName","firstName","officialGivenNames","lastName","birthDate","birthPlace","joinedAt","exitDate","exitReason",
  "street","postalCode","city","phone","mobile","email","emergencyContact","emergencyPhone","memberType","clubFunction","profession","availability",
  "shiftPreference","preferredDeployment","specialQualification","specialQualificationOther","allergies","memberNotes","memberDocumentNotes","memberHistoryNotes"
];

