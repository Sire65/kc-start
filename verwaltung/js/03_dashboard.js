/* Dashboard, Statistik, Auswertungen, Farbenbasis */
const CITY_ROUTE_DISTANCE_KM={
  "werne|clausthal-zellerfeld":281
};
function normalizeCityName(value){
  return String(value||"")
    .trim()
    .toLowerCase()
    .replace(/ü/g,"u").replace(/ö/g,"o").replace(/ä/g,"a").replace(/ß/g,"ss");
}

function cityLookupKey(value){
  const normalized=normalizeCityName(value);
  const aliases={
    "lunen":"lünen",
    "luenen":"lünen",
    "munster":"münster",
    "muenster":"münster",
    "bonen":"bönen",
    "boenen":"bönen",
    "koln":"köln",
    "koeln":"köln",
    "dusseldorf":"düsseldorf",
    "duesseldorf":"düsseldorf"
  };
  const alias=aliases[normalized] || normalized;
  return Object.keys(CITY_COORDS).find(k=>normalizeCityName(k)===alias) || alias;
}

function splitCityParts(value){
  return String(value||"")
    .split(/[\/;,]+/)
    .map(part=>part.trim())
    .filter(Boolean);
}

function haversineKm(a,b){
  const R=6371;
  const toRad=deg=>deg*Math.PI/180;
  const dLat=toRad(b.lat-a.lat);
  const dLon=toRad(b.lon-a.lon);
  const lat1=toRad(a.lat);
  const lat2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h)));
}

function approximateDistanceFromClubCity(cityLabel){
  const clubCity=(state.settings.clubCity || "").trim();
  if(!clubCity) return {text:"--", known:false, reason:"Clubort fehlt"};
  const clubParts=splitCityParts(clubCity);
  const clubKey=cityLookupKey(clubParts[0] || clubCity);
  const clubCoords=CITY_COORDS[clubKey];
  if(!clubCoords) return {text:"--", known:false, reason:"Clubort unbekannt"};

  const parts=splitCityParts(cityLabel);
  if(!parts.length) return {text:"--", known:false, reason:"Wohnort fehlt"};
  const values=parts.map(part=>{
    const key=cityLookupKey(part);
    const fixedDistance=CITY_ROUTE_DISTANCE_KM[clubKey+"|"+key];
    if(Number.isFinite(fixedDistance)) return {part,text:`${fixedDistance} km`,known:true,fixed:true};
    const coords=CITY_COORDS[key];
    if(!coords) return {part, text:"--", known:false};
    return {part, text:`ca. ${haversineKm(clubCoords,coords)} km`, known:true};
  });
  if(values.length===1) return {text:values[0].text, known:values[0].known, reason:values[0].known?"":"Wohnort unbekannt"};
  return {text:values.map(v=>`${v.part}: ${v.text}`).join(" / "), known:values.some(v=>v.known), reason:""};
}

function renderCityDistanceRows(targetId, rows){
  const target=document.getElementById(targetId);
  if(!target) return;
  if(!rows.length){
    target.innerHTML='<tr><td colspan="3">Keine Wohnorte vorhanden.</td></tr>';
    return;
  }
  target.innerHTML=rows.map(([city,count],i)=>{
    const distance=approximateDistanceFromClubCity(city);
    const distanceText=distance.known ? distance.text : `${distance.text} <span class="muted">(${escapeHtml(distance.reason || "nicht hinterlegt")})</span>`;
    return `<tr ${tableRowStyle(chartColor(i))}><td>${escapeHtml(city||"ohne Ort")}</td><td>${count}</td><td>${distanceText}</td></tr>`;
  }).join("");
  const note=document.getElementById("dashboardCityDistanceNote");
  if(note){
    const clubCity=(state.settings.clubCity || "").trim() || "nicht eingetragen";
    note.textContent=`Ausgangspunkt: ${clubCity}. Bestätigte Straßenentfernungen werden fest angezeigt; übrige Werte sind ca.-Luftlinienwerte.`;
  }
}

function renderDashboard(){
  if(!state.session.isLoggedIn){
    updateGuestHome();
    return;
  }
  document.getElementById("cardProtocol").textContent=state.protocol.length;
  document.getElementById("cardSystem").textContent="OK";
  const cardMembers=document.getElementById("cardMembers");
  if(cardMembers) cardMembers.textContent=String(getMemberCount());
  document.getElementById("cardUser").textContent=state.session.userName || "Gast";
  document.getElementById("cardRole").textContent=state.session.role || "Gast";
  applyClubBranding();
  updateGuestHome();
  setupDashboardChartPins();
  applyPinnedDashboardCharts();
  renderAgeStructure("dashboardAgeNumbers","dashboardAgeChart",!document.getElementById("dashboardAgeChart")?.classList.contains("hidden"));
  renderDurationStatistics();
  renderBirthdayDashboard();
  renderCockpitStats();
  renderProfessionStats();
  renderFinanceDashboard();
  if(typeof renderDonationDashboard==="function") renderDonationDashboard();
}

function availableStartViews(){
  return [
    ["secretariat","Sekretariat"],
    ["dashboard","Dashboard"],
    ["members","Mitglieder"],
    ["activities","Aktivitäten / Ausflüge"],
    ["assistant","Vereins-Assistent"],
    ["finance","Finanzen"],
    ["donations","Spenden"],
    ["systemCheck","Systemcheck"],
    ["backup","Datensicherung"],
    ["protocol","Protokoll"],
    ["users","Benutzer / Rechte"],
    ["settings","Einstellungen / Stammdaten"],
    ["documents","Dokumentenmanagement"],
    ["memberCards","Mitgliedsausweis"],
    ["addresses","Adressverwaltung"],
    ["communication","Kommunikation"]
  ];
}

function viewExists(viewId){
  return !!document.getElementById(viewId);
}

function showRoleStartView(role){
  const configured=state.roles?.[role]?.startView || "secretariat";
  const target=(typeof firstAccessibleStartView === "function") ? firstAccessibleStartView(role) : (viewExists(configured) ? configured : "dashboard");
  showView(target);
  if(target!==configured) toast(`Startseite '${configured}' ist nicht verfügbar oder nicht berechtigt. '${target}' wurde geöffnet.`, "info");
}


function rightLabel(right){
  const map={
    "*":"Alle Rechte",
    "members.read":"Mitglieder ansehen",
    "members.write":"Mitglieder bearbeiten",
    "finance.read":"Finanzen ansehen",
    "finance.write":"Finanzen bearbeiten",
    "shifts.read":"Dienstplan ansehen",
    "shifts.write":"Dienstplan bearbeiten",
    "shopping.read":"Einkauf ansehen",
    "shopping.write":"Einkauf bearbeiten",
    "protocol.read":"Protokoll ansehen",
    "own.read":"Eigene Daten ansehen",
    "secretariat.view":"Sekretariat öffnen",
    "members.card":"Mitgliedsausweise erstellen",
    "addresses.read":"Adressen ansehen",
    "addresses.write":"Adressen bearbeiten",
    "documents.read":"Dokumente ansehen",
    "documents.write":"Dokumente bearbeiten",
    "communication.read":"Kommunikation ansehen",
    "communication.write":"Kommunikation bearbeiten",
    "activities.read":"Aktivitäten ansehen",
    "activities.write":"Aktivitäten bearbeiten",
    "inventory.read":"Inventar ansehen",
    "inventory.write":"Inventar bearbeiten",
    "questionnaire.read":"Fragebogen ansehen",
    "questionnaire.write":"Fragebogen bearbeiten"
  };
  return map[right] || right;
}

function rightsLabel(rights){
  const list=Array.isArray(rights) ? rights : [];
  if(list.includes("*")) return "Alle Rechte";
  return list.map(rightLabel).join(", ");
}

function renderRoles(){
  if(!state.session.isLoggedIn) return;
  const body=document.getElementById("rolesTable");
  if(!body) return;
  const options=availableStartViews();
  body.innerHTML=Object.entries(state.roles).filter(([role])=>role!=="Systeminhaber").map(([role,data])=>`
    <tr>
      <td>${escapeHtml(role)}</td>
      <td>
        <select class="role-start-select" data-role="${escapeHtml(role)}">
          ${options.map(([value,label])=>`<option value="${escapeHtml(value)}" ${data.startView===value?"selected":""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </td>
      <td>${escapeHtml(rightsLabel(data.rights||[]))}</td>
    </tr>
  `).join("");
}

function uniqueSorted(values){
  return [...new Set((values||[]).map(v=>String(v||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
}

function fillSelectOptions(id,values,allLabel){
  const el=document.getElementById(id);
  if(!el) return;
  const current=el.value || "";
  const options=uniqueSorted(values);
  el.innerHTML=`<option value="">${escapeHtml(allLabel)}</option>` + options.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if(options.includes(current)) el.value=current;
}

function renderProtocolFilterOptions(){
  const rows=Array.isArray(state.protocol) ? state.protocol : [];
  fillSelectOptions("protocolFilterUser",rows.map(p=>p.user),"Alle Benutzer");
  fillSelectOptions("protocolFilterModule",rows.map(p=>p.module),"Alle Module");
  fillSelectOptions("protocolFilterAction",rows.map(p=>p.action),"Alle Aktionen");
}

function protocolMatchesFilters(p){
  const dateFilter=(document.getElementById("protocolFilterDate")?.value||"").trim();
  const userFilter=(document.getElementById("protocolFilterUser")?.value||"").trim().toLowerCase();
  const moduleFilter=(document.getElementById("protocolFilterModule")?.value||"").trim().toLowerCase();
  const actionFilter=(document.getElementById("protocolFilterAction")?.value||"").trim().toLowerCase();
  if(dateFilter){
    const iso=String(p.iso||"").slice(0,10);
    if(iso!==dateFilter) return false;
  }
  if(userFilter && !String(p.user||"").toLowerCase().includes(userFilter)) return false;
  if(moduleFilter && !String(p.module||"").toLowerCase().includes(moduleFilter)) return false;
  if(actionFilter && !String(p.action||"").toLowerCase().includes(actionFilter)) return false;
  return true;
}

function renderProtocol(){
  if(!state.session.isLoggedIn) return;
  renderProtocolFilterOptions();
  const body=document.getElementById("protocolTable");
  if(!body) return;
  const entries=(state.protocol||[]).filter(protocolMatchesFilters);
  body.innerHTML=entries.length ? entries.map(p=>`
    <tr>
      <td>${escapeHtml(p.time)}</td>
      <td>${escapeHtml(p.user)}</td>
      <td>${escapeHtml(p.module)}</td>
      <td>${escapeHtml(p.action)}</td>
      <td>${escapeHtml(p.details)}</td>
    </tr>
  `).join("") : `<tr><td colspan="5">Keine Protokolleinträge für diese Filter.</td></tr>`;
}

function renderBackupProtocol(){
  const body=document.getElementById("backupProtocolTable");
  if(!body)return;
  const entries=Array.isArray(state.backupProtocol) ? state.backupProtocol : [];
  body.innerHTML=entries.length ? entries.map(p=>`
    <tr>
      <td>${escapeHtml(p.date || "")}</td>
      <td>${escapeHtml(p.time || "")}</td>
      <td>${escapeHtml(p.action || "")}</td>
      <td>${escapeHtml(p.details || "")}</td>
      <td>${escapeHtml(p.user || "")}</td>
    </tr>
  `).join("") : `<tr><td colspan="5">Noch keine Einträge vorhanden.</td></tr>`;
}

function renderSystemCheckProtocol(){
  const body=document.getElementById("systemCheckProtocolTable");
  if(!body)return;
  const entries=Array.isArray(state.systemCheckProtocol) ? state.systemCheckProtocol : [];
  body.innerHTML=entries.length ? entries.map(p=>`
    <tr>
      <td>${escapeHtml(p.date || "")}</td>
      <td>${escapeHtml(p.time || "")}</td>
      <td>${escapeHtml(p.result || "")}</td>
      <td>${escapeHtml(p.details || "")}</td>
      <td>${escapeHtml(p.user || "")}</td>
    </tr>
  `).join("") : `<tr><td colspan="5">Noch keine Einträge vorhanden.</td></tr>`;
}

function runSystemCheck(){
  const checks=[];
  const add=(area,name,ok,msg="")=>checks.push({area,name,ok,msg});

  ["loginBtn","logoutBtn","mainNav","toastArea"].forEach(id=>{
    add("Basis",`Element #${id}`,!!document.getElementById(id),document.getElementById(id)?"vorhanden":"fehlt");
  });
  add("Daten","State vorhanden",!!state,"");
  add("Daten","Protokoll ist Array",Array.isArray(state.protocol),`${state.protocol.length} Einträge`);
  add("Sicherheit","Adminpasswort vorhanden",!!state.settings.adminPassword,"");
  add("Navigation","Dashboard vorhanden",!!document.getElementById("dashboard"),"");
  add("Version","App-Version",true,APP_VERSION);

  const fail=checks.filter(c=>!c.ok).length;
  const summary=document.getElementById("systemCheckSummary");
  summary.className=fail?"check-summary warn":"check-summary ok";
  summary.textContent=fail?`${fail} Hinweise gefunden.`:"Systemcheck ohne kritische Hinweise.";

  document.getElementById("systemCheckTable").innerHTML=checks.map(c=>`
    <tr>
      <td>${escapeHtml(c.area)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${c.ok?"✅ OK":"⚠️ Prüfen"}</td>
      <td>${escapeHtml(c.msg)}</td>
    </tr>
  `).join("");

  const details=fail?`${fail} Hinweise gefunden` : "Ohne kritische Hinweise";
  logAction("Systemcheck","Systemcheck ausgeführt",fail?`${fail} Hinweise`:"OK");
  logSystemCheck(fail?"Prüfen":"OK",details);
}

function downloadTextFile(filename,content,type="text/plain;charset=utf-8"){
  const blob=new Blob([content],{type});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function exportData(){
  const filename=`kng-backup-${new Date().toISOString().slice(0,10)}.json`;
  downloadTextFile(filename,JSON.stringify(state,null,2),"application/json;charset=utf-8");
  logAction("Datensicherung","Datensicherung exportiert",filename);
  logBackup("Datensicherung erfolgreich",`Datei: ${filename}`);
  toast("Datensicherung erfolgreich erstellt.","success");
}

function importData(file){
  if(!confirm("Rücksicherung wirklich durchführen? Der aktuelle Datenbestand wird ersetzt.")) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      state=migrateState(JSON.parse(r.result));
      const filename=file?.name || "JSON-Datei";
      saveState();
      renderAll();
      logAction("Datensicherung","Rücksicherung importiert",filename);
      logBackup("Rücksicherung erfolgreich",`Datei: ${filename}`);
      toast("Rücksicherung erfolgreich durchgeführt.","success");
    }catch(err){
      console.error(err);
      logBackup("Rücksicherung fehlgeschlagen",err.message);
      toast("Rücksicherung fehlgeschlagen: "+err.message,"error");
    }
  };
  r.readAsText(file);
}

function csvEscape(value){
  const txt=String(value ?? "");
  return /[";\n\r]/.test(txt) ? '"'+txt.replace(/"/g,'""')+'"' : txt;
}

function csvValue(row,keys){
  for(const key of keys){
    if(Object.prototype.hasOwnProperty.call(row,key)) return row[key];
  }
  return "";
}

function parseCsv(text){
  const rows=[];
  let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"' && q && next==='"'){cell+='"';i++;continue;}
    if(ch==='"'){q=!q;continue;}
    if((ch===';' || ch===',') && !q){row.push(cell.trim());cell="";continue;}
    if((ch==='\n' || ch==='\r') && !q){
      if(ch==='\r' && next==='\n') i++;
      row.push(cell.trim());
      if(row.some(v=>v!=="")) rows.push(row);
      row=[];cell="";continue;
    }
    cell+=ch;
  }
  row.push(cell.trim());
  if(row.some(v=>v!=="")) rows.push(row);
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>h.trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i] ?? ""])));
}

function memberCsvHeaders(){
  return ["Mitglieds-Nr","Anrede","Vorname","Nachname","Geburtsdatum","Eintritt","Austritt","Austrittsgrund","Straße","PLZ","Ort","Telefon","Mobil","E-Mail","Mitgliedsart","Funktion","Verfügbarkeit","Schichtpräferenz","Bevorzugter Einsatz","Allergien / Hinweise","Bemerkungen"];
}

function memberToCsvRow(m){
  return [m.memberNo,m.salutation,m.firstName,m.lastName,m.birthDate,m.joinedAt,m.exitDate,m.exitReason,m.street,m.postalCode,m.city,m.phone,m.mobile,m.email,m.memberType,m.clubFunction,m.availability,m.shiftPreference,m.preferredDeployment,m.allergies,m.memberNotes];
}

function exportMembersCsv(){
  const headers=memberCsvHeaders();
  const lines=[headers.map(csvEscape).join(";")];
  state.members.forEach(m=>lines.push(memberToCsvRow(m).map(csvEscape).join(";")));
  const filename=`kng-mitglieder-${new Date().toISOString().slice(0,10)}.csv`;
  downloadTextFile(filename,"\ufeff"+lines.join("\n"),"text/csv;charset=utf-8");
  logAction("Datensicherung","Mitglieder als CSV exportiert",`${state.members.length} Datensätze`);
  logBackup("Mitglieder exportiert",`CSV: ${state.members.length} Datensätze`);
  toast("Mitglieder erfolgreich als CSV exportiert.","success");
}

function exportMembersPdf(){
  const club=escapeHtml(state.settings.clubName || "Köcheclub");
  const rows=state.members.map(m=>`<tr><td>${escapeHtml(m.memberNo||"")}</td><td>${escapeHtml(m.lastName||"")}</td><td>${escapeHtml(m.firstName||"")}</td><td>${escapeHtml(m.city||"")}</td><td>${escapeHtml(m.email||"")}</td><td>${escapeHtml(memberStatus(m))}</td></tr>`).join("");
  const w=window.open("","_blank");
  if(!w){toast("PDF-Ausgabe konnte nicht geöffnet werden. Bitte Popups erlauben.","error");return;}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Mitgliederliste</title><style>body{font-family:Arial,sans-serif;margin:24px}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#eee}.meta{color:#555;margin-bottom:18px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Als PDF drucken / speichern</button><h1>${club}</h1><div class="meta">Mitgliederliste · ${new Date().toLocaleString("de-DE")} · ${getMemberCount()} Mitglieder, ${getMemberStats().guests} Gäste/Aushilfen</div><table><thead><tr><th>Nr.</th><th>Nachname</th><th>Vorname</th><th>Ort</th><th>E-Mail</th><th>Status</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Keine Mitglieder vorhanden.</td></tr>`}</tbody></table></body></html>`);
  w.document.close();
  logAction("Datensicherung","Mitglieder als PDF ausgegeben",`${state.members.length} Datensätze`);
  logBackup("Mitglieder exportiert",`PDF-Ausgabe: ${state.members.length} Datensätze`);
  toast("PDF-Ausgabe wurde geöffnet.","success");
}

function exportMembers(){
  const choice=prompt("Mitglieder exportieren als:\n\nCSV = CSV-Datei\nPDF = PDF-Ausgabe", "CSV");
  if(choice===null) return;
  const normalized=choice.trim().toUpperCase();
  if(normalized==="CSV") return exportMembersCsv();
  if(normalized==="PDF") return exportMembersPdf();
  toast("Bitte CSV oder PDF eingeben.","error");
}

function memberFromCsvRow(row){
  const m={
    id:uid(),
    memberNo:csvValue(row,["Mitglieds-Nr","Mitglieds-Nr.","Mitgliedsnummer","memberNo","Nr"]),
    salutation:csvValue(row,["Anrede","salutation"]),
    firstName:csvValue(row,["Vorname","firstName"]),
    lastName:csvValue(row,["Nachname","lastName"]),
    birthDate:csvValue(row,["Geburtsdatum","birthDate"]),
    joinedAt:csvValue(row,["Eintritt","Eintrittsdatum","joinedAt"]),
    exitDate:csvValue(row,["Austritt","Austrittsdatum","exitDate"]),
    exitReason:csvValue(row,["Austrittsgrund","exitReason"]),
    street:csvValue(row,["Straße","Strasse","street"]),
    postalCode:csvValue(row,["PLZ","postalCode"]),
    city:csvValue(row,["Ort","city"]),
    phone:csvValue(row,["Telefon","phone"]),
    mobile:csvValue(row,["Mobil","Mobil-Nr.","mobile"]),
    email:csvValue(row,["E-Mail","E-Mail-Adresse","Email","email"]),
    /* Beim Einlesen die Schreibweise vereinheitlichen: "gast", "GUEST", "aushilfskraft"
       werden zu den Werten der Auswahlliste. Sonst kaeme ein Gast als eigener, unbekannter
       Status zurueck und wuerde spaeter wieder als Mitglied gezaehlt. */
    memberType:normalizeStatusValue(csvValue(row,["Mitgliedsart","memberType"])),
    clubFunction:csvValue(row,["Funktion","clubFunction"]),
    availability:csvValue(row,["Verfügbarkeit","availability"]),
    shiftPreference:csvValue(row,["Schichtpräferenz","shiftPreference"]),
    preferredDeployment:csvValue(row,["Bevorzugter Einsatz","preferredDeployment"]),
    allergies:csvValue(row,["Allergien / Hinweise","Allergien","Hinweise","allergies"]),
    memberNotes:csvValue(row,["Bemerkungen","Notizen","memberNotes"]),
    committees:[],
    claims:defaultClaims(),
    updatedAt:new Date().toISOString()
  };
  if(!m.memberNo) m.memberNo=nextMemberNo();
  if(!m.joinedAt) m.joinedAt=new Date().toISOString().slice(0,10);
  return m;
}


function normalizeImportedMember(raw){
  const source = raw || {};
  const now = new Date().toISOString();
  return {
    id: source.id || uid(),
    memberNo: source.memberNo || source.memberId || source["Mitglieds-Nr"] || source["Mitgliedsnummer"] || "",
    salutation: source.salutation || source["Anrede"] || "",
    firstName: source.firstName || source["Vorname"] || "",
    lastName: source.lastName || source["Nachname"] || "",
    birthDate: source.birthDate || source["Geburtsdatum"] || "",
    joinedAt: source.joinedAt || source.joinedDate || source["Eintritt"] || source["Eintrittsdatum"] || "",
    exitDate: source.exitDate || source["Austritt"] || source["Austrittsdatum"] || "",
    exitReason: source.exitReason || source["Austrittsgrund"] || "",
    street: source.street || source["Straße"] || source["Strasse"] || "",
    postalCode: source.postalCode || source.zip || source["PLZ"] || "",
    city: source.city || source["Ort"] || "",
    phone: source.phone || source["Telefon"] || "",
    mobile: source.mobile || source["Mobil"] || "",
    email: source.email || source["E-Mail"] || source["Email"] || "",
    memberType: normalizeStatusValue(source.memberType || source["Mitgliedsart"] || "") || "Aktiv",
    clubFunction: source.clubFunction || source["Funktion"] || "Mitglied",
    availability: source.availability || source["Verfügbarkeit"] || "Flexibel",
    preferredDeployment: source.preferredDeployment || source["Bevorzugter Einsatz"] || "Beides",
    shiftPreference: source.shiftPreference || source["Schichtpräferenz"] || "Keine Präferenz",
    allergies: source.allergies || source["Allergien"] || source["Allergien / Hinweise"] || "",
    memberNotes: source.memberNotes || source.notes || source["Bemerkungen"] || source["Notizen"] || "",
    committees: Array.isArray(source.committees) ? source.committees : [],
    claims: source.claims && typeof source.claims === "object" ? {...defaultClaims(),...source.claims,assetScale:normalizeAssetScale(source.claims.assetScale)} : defaultClaims(),
    photo: source.photo || "",
    createdAt: source.createdAt || now,
    updatedAt: now
  };
}

function findExistingMemberIndex(m){
  const no = String(m.memberNo || "").trim().toLowerCase();
  if(no){
    const byNo = state.members.findIndex(x => String(x.memberNo || "").trim().toLowerCase() === no);
    if(byNo >= 0) return byNo;
  }
  const email = String(m.email || "").trim().toLowerCase();
  if(email){
    const byMail = state.members.findIndex(x => String(x.email || "").trim().toLowerCase() === email);
    if(byMail >= 0) return byMail;
  }
  const key = [m.firstName,m.lastName,m.birthDate].map(v => String(v || "").trim().toLowerCase()).join("|");
  if(key !== "||"){
    return state.members.findIndex(x => [x.firstName,x.lastName,x.birthDate].map(v => String(v || "").trim().toLowerCase()).join("|") === key);
  }
  return -1;
}

function importMemberObjects(importedMembers,label="JSON"){
  if(!Array.isArray(importedMembers) || !importedMembers.length) throw new Error("Keine Mitglieder im Import gefunden.");
  let created=0,updated=0,skipped=0;
  importedMembers.forEach(raw=>{
    const m=normalizeImportedMember(raw);
    if(!m.firstName || !m.lastName){skipped++;return;}
    if(!m.memberNo) m.memberNo=nextMemberNo();
    const idx=findExistingMemberIndex(m);
    if(idx>=0){
      state.members[idx]={...state.members[idx],...m,id:state.members[idx].id,createdAt:state.members[idx].createdAt || m.createdAt};
      updated++;
    }else{
      state.members.push(m);
      created++;
    }
  });
  saveState();
  renderMembers();
  renderDashboard();
  renderSettings();
  const details=`${label}: ${created} neu, ${updated} aktualisiert, ${skipped} übersprungen`;
  logAction("Datensicherung","Mitglieder importiert",details);
  logBackup("Mitglieder erfolgreich importiert",details);
  toast("Mitglieder erfolgreich importiert: "+details,"success");
}

function importMembersJsonText(text,filename="JSON-Datei"){
  const data=JSON.parse(text);
  const members=Array.isArray(data) ? data : data.members;
  if(!Array.isArray(members)) throw new Error("JSON enthält keine Mitgliederliste. Erwartet wird ein Feld 'members'.");
  importMemberObjects(members, filename);
}

function importMembersFile(file){
  if(!file){
    toast("Keine Importdatei ausgewählt.","error");
    return;
  }
  const name = String(file.name || "");
  const lower = name.toLowerCase();
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const text = String(reader.result || "").replace(/^\ufeff/,"");
      const trimmed = text.trim();
      if(!trimmed) throw new Error("Die Importdatei ist leer.");

      // Alte und neue Exporte können JSON sein. CSV bleibt weiterhin möglich.
      const looksLikeJson = lower.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[");
      if(looksLikeJson){
        importMembersJsonText(trimmed, name || "JSON-Datei");
      }else{
        importMembersCsvText(trimmed, name || "CSV-Datei");
      }
    }catch(err){
      console.error(err);
      logBackup("Mitgliederimport fehlgeschlagen", err.message || String(err));
      toast("Mitgliederimport fehlgeschlagen: " + (err.message || err), "error");
    }
  };
  reader.onerror = () => {
    const msg = "Datei konnte nicht gelesen werden.";
    logBackup("Mitgliederimport fehlgeschlagen", msg);
    toast(msg,"error");
  };
  reader.readAsText(file);
}

function importMembersCsvText(text,label="CSV-Datei"){
  const rows=parseCsv(String(text||"").replace(/^\ufeff/,""));
  if(!rows.length) throw new Error("CSV-Datei enthält keine Datensätze.");
  let created=0,updated=0,skipped=0;
  rows.forEach(row=>{
    const m=memberFromCsvRow(row);
    if(!m.firstName || !m.lastName){skipped++;return;}
    const idx=findExistingMemberIndex(m);
    if(idx>=0){
      state.members[idx]={...state.members[idx],...m,id:state.members[idx].id,createdAt:state.members[idx].createdAt || m.createdAt};
      updated++;
    }else{
      if(!m.createdAt) m.createdAt=new Date().toISOString();
      state.members.push(m);
      created++;
    }
  });
  saveState();
  renderMembers();
  renderDashboard();
  renderSettings();
  const details=`${label}: ${created} neu, ${updated} aktualisiert, ${skipped} übersprungen`;
  logAction("Datensicherung","Mitglieder importiert",details);
  logBackup("Mitglieder erfolgreich importiert",details);
  toast("Mitglieder erfolgreich importiert: "+details,"success");
}

function importMembersCsv(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const rows=parseCsv(String(r.result||"").replace(/^\ufeff/,""));
      if(!rows.length) throw new Error("CSV-Datei enthält keine Datensätze.");
      let created=0,updated=0,skipped=0;
      rows.forEach(row=>{
        const m=memberFromCsvRow(row);
        if(!m.firstName || !m.lastName){skipped++;return;}
        const idx=state.members.findIndex(x=>String(x.memberNo||"").toLowerCase()===String(m.memberNo||"").toLowerCase());
        if(idx>=0){
          state.members[idx]={...state.members[idx],...m,id:state.members[idx].id,createdAt:state.members[idx].createdAt};
          updated++;
        }else{
          m.createdAt=new Date().toISOString();
          state.members.push(m);
          created++;
        }
      });
      saveState();
      renderMembers();
      renderDashboard();
      renderSettings();
      const details=`${created} neu, ${updated} aktualisiert, ${skipped} übersprungen`;
      logAction("Datensicherung","Mitglieder importiert",details);
      logBackup("Mitglieder erfolgreich importiert",details);
      toast("Mitglieder erfolgreich importiert: "+details,"success");
    }catch(err){
      console.error(err);
      logBackup("Mitgliederimport fehlgeschlagen",err.message);
      toast("Mitgliederimport fehlgeschlagen: "+err.message,"error");
    }
  };
  r.readAsText(file);
}

function settingValue(id){
  const el=document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setInputValue(id,value){
  const el=document.getElementById(id);
  if(el) el.value=value || "";
}

/* Anzahl der MITGLIEDER - ohne Gaeste und Aushilfen. Wer die Zahl aller erfassten Personen
   braucht (einschliesslich Gaeste), nimmt getPersonCount(). */
function getMemberCount(){
  return Array.isArray(state.members) ? vereinsmitglieder().length : 0;
}

/* Anzahl aller erfassten Personen, Gaeste und Aushilfen eingeschlossen. */
function getPersonCount(){
  return Array.isArray(state.members) ? state.members.length : 0;
}

/* total  = Mitglieder (ohne Gaeste/Aushilfen) - so ist "Anzahl Mitglieder gesamt" gemeint
   guests = Gaeste und Aushilfen
   persons= alle Datensaetze zusammen; total + guests ergibt persons */
function getMemberStats(){
  const persons=state.members.length;
  let passive=0;
  let exited=0;
  let guests=0;
  state.members.forEach(m=>{
    const status=memberStatus(m);
    if(STATUS_OHNE_MITGLIEDSCHAFT.includes(status)) guests++;
    else if(status==="Ausgeschieden") exited++;
    else if(status==="Passiv") passive++;
  });
  const total=persons-guests;
  const active=Math.max(0,total-passive-exited);
  return {total,active,passive,exited,guests,persons};
}

function ageFromBirthDate(value){
  if(!value) return null;
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return null;
  const today=new Date();
  let age=today.getFullYear()-d.getFullYear();
  const beforeBirthday=today.getMonth()<d.getMonth() || (today.getMonth()===d.getMonth() && today.getDate()<d.getDate());
  if(beforeBirthday) age--;
  return age>=0 && age<130 ? age : null;
}

function getAgeStructure(){
  const groups=[
    {key:"15_30",label:"15 bis 30",min:15,max:30,count:0},
    {key:"31_40",label:"31 bis 40",min:31,max:40,count:0},
    {key:"41_50",label:"41 bis 50",min:41,max:50,count:0},
    {key:"51_60",label:"51 bis 60",min:51,max:60,count:0},
    {key:"61_70",label:"61 bis 70",min:61,max:70,count:0},
    {key:"from71",label:"ab 71",min:71,max:999,count:0}
  ];
  let unknown=0;
  vereinsmitglieder().forEach(m=>{
    const age=ageFromBirthDate(m.birthDate);
    if(age===null){ unknown++; return; }
    const group=groups.find(g=>age>=g.min && age<=g.max);
    if(group) group.count++;
    else unknown++;
  });
  return {groups,unknown,total:getMemberCount()};
}

function renderAgeStructure(numbersId,chartId,showChart=true){
  const target=document.getElementById(numbersId);
  const chart=document.getElementById(chartId);
  if(!target && !chart) return;
  const data=getAgeStructure();
  const max=Math.max(1,...data.groups.map(g=>g.count));
  if(target){
    target.innerHTML=data.groups.map((g,i)=>`<div class="age-number color-linked" ${coloredStyleIfCount(chartColor(i),g.count)}><span>${g.label}</span><strong>${g.count}</strong></div>`).join("") +
      (data.unknown ? `<div class="age-number muted"><span>ohne/ungültiges Geburtsdatum</span><strong>${data.unknown}</strong></div>` : "");
  }
  if(chart){
    renderModernBarChart(chart, data.groups.map(g=>({label:g.label,count:g.count})));
    chart.classList.toggle("hidden",!showChart);
  }
}

function renderAgeStatistics(){
  renderAgeStructure("masterAgeNumbers","masterAgeChart",!document.getElementById("masterAgeChart")?.classList.contains("hidden"));
  renderAgeStructure("dashboardAgeNumbers","dashboardAgeChart",!document.getElementById("dashboardAgeChart")?.classList.contains("hidden"));
}


function parseDate(value){
  if(!value) return null;
  const d=new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function yearsBetween(startValue,endDate=new Date()){
  const d=parseDate(startValue);
  if(!d) return null;
  let years=endDate.getFullYear()-d.getFullYear();
  const before=endDate.getMonth()<d.getMonth() || (endDate.getMonth()===d.getMonth() && endDate.getDate()<d.getDate());
  if(before) years--;
  return years>=0 && years<100 ? years : null;
}

function getMembershipDurationStructure(){
  const groups=Array.from({length:60},(_,i)=>({years:i+1,label:(i+1)+" Jahr"+((i+1)===1?"":"e"),count:0}));
  let unknown=0;
  vereinsmitglieder().forEach(m=>{
    const years=yearsBetween(m.joinedAt);
    if(years===null){ unknown++; return; }
    const bucket=Math.min(60,Math.max(1,years));
    groups[bucket-1].count++;
  });
  return {groups,unknown,total:getMemberCount()};
}

function renderDurationChart(chartId,showChart=true){
  const chart=document.getElementById(chartId);
  if(!chart) return;
  const data=getMembershipDurationStructure();
  const used=data.groups.filter(g=>g.count>0);
  const shown=used.length ? used : data.groups.slice(0,10);
  const max=Math.max(1,...shown.map(g=>g.count));
  renderModernColumnChart(chart, shown.map(g=>({label:g.label.replace(" Jahre","").replace(" Jahr",""),count:g.count})));
  if(data.unknown){ chart.insertAdjacentHTML("beforeend", `<div class="muted small-note">${data.unknown} Mitglied(er) ohne Eintrittsdatum.</div>`); }
  chart.classList.toggle("hidden",!showChart);
}

function renderDurationNumbers(numbersId){
  const target=document.getElementById(numbersId);
  if(!target) return;
  const data=getMembershipDurationStructure();
  const used=data.groups.filter(g=>g.count>0);
  target.innerHTML=used.length
    ? used.slice(0,12).map((g,i)=>`<div class="age-number color-linked" ${coloredStyleIfCount(chartColor(i),g.count)}><span>${g.label}</span><strong>${g.count}</strong></div>`).join("")
    : `<div class="age-number muted"><span>keine Eintrittsdaten</span><strong>0</strong></div>`;
}

function renderDurationTable(tableId){
  const body=document.getElementById(tableId);
  if(!body) return;
  const data=getMembershipDurationStructure();
  const rows=data.groups.filter(g=>g.count>0);
  body.innerHTML=rows.length
    ? rows.map((g,i)=>`<tr ${tableRowStyle(chartColor(i))}><td>${g.label}</td><td>${g.count}</td></tr>`).join("") + (data.unknown ? `<tr><td>ohne Eintrittsdatum</td><td>${data.unknown}</td></tr>` : "")
    : `<tr><td colspan="2">Keine Eintrittsdaten vorhanden.</td></tr>`;
}

function renderDurationStatistics(){
  renderDurationNumbers("dashboardDurationNumbers");
  renderDurationNumbers("masterDurationNumbers");
  renderDurationChart("dashboardDurationChart",!document.getElementById("dashboardDurationChart")?.classList.contains("hidden"));
  renderDurationChart("masterDurationChart",!document.getElementById("masterDurationChart")?.classList.contains("hidden"));
  renderDurationTable("dashboardDurationTable");
  renderDurationTable("masterDurationTable");
}

function fullMemberName(m){
  return `${m.firstName||""} ${m.lastName||""}`.trim() || m.memberNo || "--";
}

function average(values){
  const arr=values.filter(v=>typeof v==="number" && Number.isFinite(v));
  if(!arr.length) return null;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function countBy(items,keyFn){
  const map=new Map();
  items.forEach(item=>{
    const key=keyFn(item) || "--";
    map.set(key,(map.get(key)||0)+1);
  });
  return [...map.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],"de"));
}

const DASHBOARD_CHART_CONFIG=[
  {id:"dashboardAgeChart",title:"Altersstruktur",toggleId:"toggleDashboardAgeChart"},
  {id:"dashboardDurationChart",title:"Mitgliedsdauer",toggleId:"toggleDashboardDurationChart"},
  {id:"dashboardProfessionChart",title:"Berufe",toggleId:"toggleDashboardProfessionChart"},
  {id:"dashboardGenderChart",title:"Geschlecht / Anrede",toggleId:"toggleDashboardGenderChart"},
  {id:"dashboardStatusChart",title:"Austritte / Status",toggleId:"toggleDashboardStatusChart"},
  {id:"dashboardCityChart",title:"Wohnorte",toggleId:"toggleDashboardCityChart"},
  {id:"dashboardGrowthChart",title:"Mitgliederentwicklung",toggleId:"toggleDashboardGrowthChart"},
  {id:"dashboardDonationChart",title:"Geleistete Spenden",toggleId:"toggleDashboardDonationChart"}
];

function dashboardChartPrefs(){
  const prefs=(typeof getUserPrefsObject==="function") ? getUserPrefsObject() : (state.userPrefs[state.session.userName||"Gast"] ||= {});
  if(!prefs.dashboardCharts || typeof prefs.dashboardCharts!=="object") prefs.dashboardCharts={};
  if(!Array.isArray(prefs.dashboardCharts.pinned)) prefs.dashboardCharts.pinned=[];
  return prefs.dashboardCharts;
}

function isDashboardChartPinned(chartId){
  return dashboardChartPrefs().pinned.includes(chartId);
}

function setDashboardChartPinned(chartId,pinned){
  const prefs=dashboardChartPrefs();
  const set=new Set(prefs.pinned||[]);
  if(pinned) set.add(chartId); else set.delete(chartId);
  prefs.pinned=[...set];
  saveState();
  updateDashboardChartPinButtons();
}

function setDashboardChartVisible(chartId,visible){
  const chart=document.getElementById(chartId);
  if(!chart) return;
  chart.classList.toggle("hidden",!visible);
  const cfg=DASHBOARD_CHART_CONFIG.find(c=>c.id===chartId);
  if(cfg?.toggleId){
    const btn=document.getElementById(cfg.toggleId);
    if(btn){
      if(typeof setDashboardToggleLabel==="function") setDashboardToggleLabel(btn,visible,"Diagramm ausblenden","Diagramm anzeigen"); else btn.textContent=visible ? "Diagramm ausblenden" : "Diagramm anzeigen";
    }
  }
}

function applyPinnedDashboardCharts(){
  DASHBOARD_CHART_CONFIG.forEach(cfg=>{
    if(isDashboardChartPinned(cfg.id)) setDashboardChartVisible(cfg.id,true);
  });
}

function updateDashboardChartPinButtons(){
  document.querySelectorAll("[data-dashboard-chart-pin]").forEach(btn=>{
    const id=btn.dataset.dashboardChartPin;
    const pinned=isDashboardChartPinned(id);
    btn.textContent=pinned?"📌":"📍";
    btn.classList.toggle("chart-pin-pinned",pinned);
    btn.classList.toggle("chart-pin-unpinned",!pinned);
    btn.title=pinned?"Diagramm ist angepinnt und wird beim Start automatisch angezeigt":"Diagramm anpinnen und beim Start automatisch anzeigen";
    btn.setAttribute("aria-pressed",pinned?"true":"false");
  });
}

function setupDashboardChartPins(){
  DASHBOARD_CHART_CONFIG.forEach(cfg=>{
    const chart=document.getElementById(cfg.id);
    if(!chart) return;
    const panel=chart.closest(".panel") || chart.closest(".mini-card") || chart.parentElement;
    if(!panel || panel.querySelector(`[data-dashboard-chart-pin="${cfg.id}"]`)) return;
    const h3=panel.querySelector("h3");
    if(!h3) return;
    let headline=h3.closest(".table-headline");
    if(!headline){
      headline=document.createElement("div");
      headline.className="table-headline chart-title-line";
      h3.parentNode.insertBefore(headline,h3);
      headline.appendChild(h3);
    }
    let actions=headline.querySelector(".inline-actions");
    if(!actions){
      actions=document.createElement("div");
      actions.className="inline-actions";
      headline.appendChild(actions);
    }
    const pin=document.createElement("button");
    pin.type="button";
    pin.className="chart-pin-button";
    pin.dataset.dashboardChartPin=cfg.id;
    pin.addEventListener("click",()=>{
      const nowPinned=!isDashboardChartPinned(cfg.id);
      setDashboardChartPinned(cfg.id,nowPinned);
      if(nowPinned){
        setDashboardChartVisible(cfg.id,true);
        if(cfg.id==="dashboardAgeChart") renderAgeStructure("dashboardAgeNumbers","dashboardAgeChart",true);
        if(cfg.id==="dashboardDurationChart") renderDurationStatistics();
        if(cfg.id==="dashboardProfessionChart") renderProfessionStats();
        toast(`Diagramm '${cfg.title}' angepinnt.`, "success");
      }else{
        toast(`Diagramm '${cfg.title}' gelöst.`, "info");
      }
    });
    actions.appendChild(pin);
  });
  updateDashboardChartPinButtons();
}


function dashboardUseChartColors(){
  return state.colors?.dashboardChartColors !== false;
}

function dashboardUseTableColors(){
  return state.colors?.dashboardTableColors !== false;
}

function dashboardPalette(){
  const c={...DEFAULT_STATE.colors,...(state.colors||{})};
  if(!dashboardUseChartColors()){
    return ["#64748b","#94a3b8","#475569","#cbd5e1","#334155","#e2e8f0","#6b7280","#9ca3af","#4b5563","#d1d5db","#374151","#f3f4f6"];
  }
  return Array.from({length:12},(_,i)=>c[`chart${i+1}`] || DEFAULT_STATE.colors[`chart${i+1}`]);
}

function chartColor(i){
  const palette=dashboardPalette();
  return palette[i % palette.length];
}

function colorAlpha(hex,alpha){
  const raw=String(hex||'').replace('#','').trim();
  if(!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(47,107,63,${alpha})`;
  const r=parseInt(raw.slice(0,2),16), g=parseInt(raw.slice(2,4),16), b=parseInt(raw.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function coloredStyle(color){
  if(!dashboardUseTableColors()) return ``;
  return `style="background:${colorAlpha(color,.16)};border-color:${colorAlpha(color,.55)};box-shadow:inset 5px 0 0 ${color};"`;
}

function coloredStyleIfCount(color,count){
  return Number(count)>0 ? coloredStyle(color) : ``;
}

function tableRowStyle(color){
  if(!dashboardUseTableColors()) return ``;
  return `style="background:${colorAlpha(color,.10)};box-shadow:inset 5px 0 0 ${color};"`;
}

function renderModernBarChart(el, rows, options={}){
  if(!el) return;
  const data=(rows||[]).map((r,i)=>({
    label: String(r.label ?? r[0] ?? "--"),
    count: Number(r.count ?? r[1] ?? 0),
    color: r.color || chartColor(i)
  })).filter(r=>r.count>0);
  if(!data.length){ el.innerHTML='<p class="muted small">Keine Daten vorhanden.</p>'; return; }
  const max=Math.max(1,...data.map(r=>r.count));
  el.classList.add('modern-chart','modern-bar-chart');
  el.innerHTML=data.map((r,i)=>{
    const pct=Math.max(3,Math.round((r.count/max)*100));
    return `<div class="modern-bar-row"><span class="chart-label" title="${escapeHtml(r.label)}">${escapeHtml(r.label)}</span><div class="modern-bar-track"><div class="modern-bar-fill" style="width:${pct}%;background:${r.color}"></div></div><strong>${r.count}</strong></div>`;
  }).join("");
}

function renderModernColumnChart(el, rows, options={}){
  if(!el) return;
  const data=(rows||[]).map((r,i)=>({
    label: String(r.label ?? r[0] ?? "--"),
    count: Number(r.count ?? r[1] ?? 0),
    color: r.color || chartColor(i)
  })).filter(r=>r.count>0);
  if(!data.length){ el.innerHTML='<p class="muted small">Keine Daten vorhanden.</p>'; return; }
  const max=Math.max(1,...data.map(r=>r.count));
  el.classList.add('modern-chart','modern-column-chart');
  el.innerHTML=data.map((r,i)=>{
    const pct=Math.max(6,Math.round((r.count/max)*100));
    return `<div class="modern-column"><div class="modern-column-value">${r.count}</div><div class="modern-column-track"><div class="modern-column-fill" style="height:${pct}%;background:${r.color}"></div></div><span title="${escapeHtml(r.label)}">${escapeHtml(r.label)}</span></div>`;
  }).join("");
}

function renderModernDonutChart(el, rows, options={}){
  if(!el) return;
  const data=(rows||[]).map((r,i)=>({
    label: String(r.label ?? r[0] ?? "--"),
    count: Number(r.count ?? r[1] ?? 0),
    color: r.color || chartColor(i)
  })).filter(r=>r.count>0);
  if(!data.length){ el.innerHTML='<p class="muted small">Keine Daten vorhanden.</p>'; return; }
  const total=data.reduce((sum,r)=>sum+r.count,0) || 1;
  let start=0;
  const stops=data.map(r=>{
    const deg=(r.count/total)*360;
    const part=`${r.color} ${start.toFixed(2)}deg ${(start+deg).toFixed(2)}deg`;
    start+=deg;
    return part;
  }).join(',');
  const center=options.centerText || String(total);
  el.classList.add('modern-chart','modern-donut-wrap');
  el.innerHTML=`<div class="modern-donut" style="background:conic-gradient(${stops})"><div class="modern-donut-hole"><strong>${escapeHtml(center)}</strong><span>${escapeHtml(options.centerLabel||'gesamt')}</span></div></div><div class="modern-legend">${data.map((r,i)=>`<div><i style="background:${r.color}"></i><span>${escapeHtml(r.label)}</span><strong>${r.count}</strong></div>`).join('')}</div>`;
}

function normalizeStatusValue(value){
  const raw=String(value||"").trim();
  const key=raw.toLowerCase().replace(/\s+/g," ");
  if(!key) return "";
  if(["aktiv","actif","active","aktives mitglied"].includes(key)) return "Aktiv";
  if(["passiv","passives mitglied"].includes(key)) return "Passiv";
  if(["ehrenmitglied","ehren mitglied","ehre"].includes(key)) return "Ehrenmitglied";
  if(["ausgeschieden","ausgetreten","ehemalig","inaktiv"].includes(key)) return "Ausgeschieden";
  if(["gast","gastmitglied","gaeste","gäste","guest"].includes(key)) return "Gast";
  if(["aushilfe","aushilfen","aushilfskraft","employee"].includes(key)) return "Aushilfe";
  return raw.charAt(0).toUpperCase()+raw.slice(1);
}

/* Gast und Aushilfe sind Personen ohne Mitgliedschaft. Sie stehen mit in der Personenliste,
   duerfen aber in keiner Mitgliederauswertung als Mitglied mitgezaehlt werden - sonst stimmt
   weder die Mitgliederzahl im Verein noch das, was an die anderen Programme weitergegeben
   wird. Wer ausgeschieden ist, war einmal Mitglied und bleibt deshalb hier drin; er wird wie
   bisher ueber memberStatus(...)==="Ausgeschieden" getrennt behandelt. */
const STATUS_OHNE_MITGLIEDSCHAFT=["Gast","Aushilfe"];

function memberStatus(m){
  const type=normalizeStatusValue(m.memberType);
  if(String(m.exitDate||"").trim() || String(m.exitReason||"").trim() || type==="Ausgeschieden") return "Ausgeschieden";
  if(type==="Passiv") return "Passiv";
  if(type==="Ehrenmitglied") return "Ehrenmitglied";
  if(type==="Gast") return "Gast";
  if(type==="Aushilfe") return "Aushilfe";
  return "Aktiv";
}

/* true = zaehlt als Vereinsmitglied. false = Gast oder Aushilfe. */
function istVereinsmitglied(m){
  return !STATUS_OHNE_MITGLIEDSCHAFT.includes(memberStatus(m));
}

/* Alle Vereinsmitglieder - Grundmenge fuer jede Auswertung, die "Mitglieder" heisst. */
function vereinsmitglieder(){
  return (state.members||[]).filter(istVereinsmitglied);
}

/* Gaeste und Aushilfen - Personen im Datenbestand, aber keine Mitglieder. */
function gaesteUndAushilfen(){
  return (state.members||[]).filter(m=>!istVereinsmitglied(m));
}

function isExitedMember(m){
  return memberStatus(m)==="Ausgeschieden";
}

function currentMembers(){
  return vereinsmitglieder().filter(m=>!isExitedMember(m));
}

function markExitFields(){
  const m=formToMember();
  const exited=isExitedMember(m);
  ["exitDateLabel","exitReasonLabel"].forEach(id=>document.getElementById(id)?.classList.toggle("exit-highlight",exited));
}

function genderGroup(m){
  const s=String(m.salutation||"").toLowerCase();
  if(s.includes("herr")) return "Männlich / Herr";
  if(s.includes("frau")) return "Weiblich / Frau";
  if(s.includes("div")) return "Divers";
  return "ohne Angabe";
}

function renderSimpleRows(id,rows,emptyText="Keine Daten vorhanden.", colored=true){
  const body=document.getElementById(id);
  if(!body) return;
  body.innerHTML=rows.length ? rows.map((r,i)=>`<tr ${colored?tableRowStyle(r[2] || chartColor(i)):""}><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join("") : `<tr><td colspan="2">${escapeHtml(emptyText)}</td></tr>`;
}

function renderCommitteeDashboardRows(rows){
  const body=document.getElementById("dashboardCommitteeTable");
  if(!body) return;
  if(!rows.length){
    body.innerHTML='<tr><td colspan="3">Keine Ausschüsse angelegt.</td></tr>';
    return;
  }
  body.innerHTML=rows.map((r,i)=>`
    <tr ${tableRowStyle(chartColor(i))}>
      <td>${escapeHtml(r.label)}</td>
      <td>${r.count}</td>
      <td class="cell-members-inline" title="${escapeHtml(r.names.join(', '))}">${r.names.length ? r.names.map(n=>`<span class="member-chip">${escapeHtml(n)}</span>`).join(' ') : '--'}</td>
    </tr>`).join("");
}

function normalizeCommitteeValue(value){
  return String(value||"").trim();
}

function getMemberCommittees(member){
  const raw=Array.isArray(member.committees) ? member.committees : [];
  return [...new Set(raw.map(normalizeCommitteeValue).filter(Boolean))];
}

function getBirthdaysThisMonthCount(){
  const now=new Date();
  return currentMembers().filter(m=>{
    const d=parseDate(m.birthDate);
    return d && d.getMonth()===now.getMonth();
  }).length;
}

function getGrowthDeclineRows(){
  const now=new Date();
  const startYear=now.getFullYear()-9;
  const rows=[];
  for(let y=startYear;y<=now.getFullYear();y++){
    rows.push({year:String(y), joined:0, exited:0, saldo:0});
  }
  const byYear=new Map(rows.map(r=>[r.year,r]));
  vereinsmitglieder().forEach(m=>{
    const joined=parseDate(m.joinedAt);
    if(joined){
      const y=String(joined.getFullYear());
      if(byYear.has(y)) byYear.get(y).joined++;
    }
    const exited=parseDate(m.exitDate);
    if(exited){
      const y=String(exited.getFullYear());
      if(byYear.has(y)) byYear.get(y).exited++;
    }
  });
  rows.forEach(r=>r.saldo=r.joined-r.exited);
  return rows;
}

function renderGrowthComboChart(el, rows){
  if(!el) return;
  const data=(rows||[]).filter(r=>r.joined>0 || r.exited>0 || r.saldo!==0);
  if(!data.length){ el.innerHTML='<p class="muted small">Keine Eintritts- oder Austrittsdaten vorhanden.</p>'; return; }
  const max=Math.max(1,...data.map(r=>Math.max(r.joined,r.exited,Math.abs(r.saldo))));
  const green=chartColor(1);
  const red=chartColor(3);
  const blue=chartColor(4);
  el.classList.add('modern-chart','growth-combo-chart');
  el.innerHTML=data.map(r=>{
    const joinedPct=Math.max(4,Math.round((r.joined/max)*100));
    const exitedPct=Math.max(4,Math.round((r.exited/max)*100));
    const saldoPct=Math.max(4,Math.round((Math.abs(r.saldo)/max)*100));
    return `<div class="growth-year" title="${escapeHtml(r.year)}: Zuwachs ${r.joined}, Schwund ${r.exited}, Saldo ${r.saldo}">
      <div class="growth-bars">
        <div class="growth-bar positive" style="height:${joinedPct}%;background:${green}"><span>${r.joined}</span></div>
        <div class="growth-bar negative" style="height:${exitedPct}%;background:${red}"><span>${r.exited}</span></div>
        <div class="growth-bar saldo" style="height:${saldoPct}%;background:${blue}"><span>${r.saldo}</span></div>
      </div>
      <strong>${escapeHtml(r.year)}</strong>
    </div>`;
  }).join('') + `<div class="modern-legend growth-legend"><div><i style="background:${green}"></i><span>Zuwachs</span></div><div><i style="background:${red}"></i><span>Schwund</span></div><div><i style="background:${blue}"></i><span>Saldo</span></div></div>`;
}

function renderGrowthStats(){
  const rows=getGrowthDeclineRows();
  const body=document.getElementById("dashboardGrowthTable");
  if(body){
    body.innerHTML=rows.length ? rows.map((r,i)=>{
      const color=r.saldo<0 ? chartColor(3) : (r.saldo>0 ? chartColor(1) : chartColor(0));
      return `<tr ${r.joined||r.exited?tableRowStyle(color):''}><td>${escapeHtml(r.year)}</td><td>${r.joined}</td><td>${r.exited}</td><td>${r.saldo}</td></tr>`;
    }).join("") : `<tr><td colspan="4">Keine Eintritts- oder Austrittsdaten vorhanden.</td></tr>`;
  }
  const chart=document.getElementById("dashboardGrowthChart");
  if(chart) renderGrowthComboChart(chart, rows);
}
function renderProfessionStats(){
  const body=document.getElementById("dashboardProfessionTable");
  const chart=document.getElementById("dashboardProfessionChart");
  const rows=countBy(vereinsmitglieder(),m=>String(m.profession||"").trim() || "ohne Angabe");
  if(body){
    body.innerHTML=rows.length
      ? rows.map(([profession,count],i)=>`<tr ${tableRowStyle(chartColor(i))}><td>${escapeHtml(profession)}</td><td>${count}</td></tr>`).join("")
      : `<tr><td colspan="2">Keine Berufe hinterlegt.</td></tr>`;
  }
  if(chart){
    renderModernDonutChart(chart, rows.map(([profession,count])=>({label:profession,count})), {centerText:String(getMemberCount()), centerLabel:"Mitglieder"});
  }
}


function renderCockpitStats(){
  /* "members" sind hier ausschliesslich Vereinsmitglieder - Gaeste und Aushilfen wuerden
     Durchschnittsalter, Zugehoerigkeit, Geschlechter- und Berufsverteilung verfaelschen.
     Einzige Ausnahme weiter unten: die Statusverteilung, die alle Personen zeigt, weil
     sonst gerade die Gaeste unsichtbar blieben. */
  const members=vereinsmitglieder();
  const alle=state.members||[];
  const ages=members.map(m=>({m,age:ageFromBirthDate(m.birthDate)})).filter(x=>x.age!==null);
  const durations=members.map(m=>yearsBetween(m.joinedAt)).filter(v=>v!==null);
  const avgAge=average(ages.map(x=>x.age));
  const avgDur=average(durations);
  const youngest=ages.length ? ages.reduce((a,b)=>a.age<b.age?a:b) : null;
  const oldest=ages.length ? ages.reduce((a,b)=>a.age>b.age?a:b) : null;
  setText("cockpitAverageAge",avgAge===null?"--":avgAge.toFixed(1)+" Jahre");
  setText("cockpitAverageDuration",avgDur===null?"--":avgDur.toFixed(1)+" Jahre");
  setText("cockpitYoungest",youngest?`${fullMemberName(youngest.m)} (${youngest.age})`:"--");
  setText("cockpitOldest",oldest?`${fullMemberName(oldest.m)} (${oldest.age})`:"--");
  setText("cockpitBirthdaysMonth",String(getBirthdaysThisMonthCount()));
  setText("cockpitHonorary",String(members.filter(m=>memberStatus(m)==="Ehrenmitglied").length));

  const genderRows=countBy(members,genderGroup);
  renderSimpleRows("dashboardGenderTable",genderRows);
  renderModernDonutChart(document.getElementById("dashboardGenderChart"), genderRows.map(([label,count])=>({label,count})), {centerText:String(members.length), centerLabel:"Mitglieder"});
  const statusRows=countBy(alle,memberStatus);
  const exitReasons=countBy(alle.filter(m=>memberStatus(m)==="Ausgeschieden"),m=>m.exitReason||"Austritt ohne Grund");
  renderSimpleRows("dashboardStatusTable",statusRows.concat(exitReasons.map(([k,v])=>[`Austrittsgrund: ${k}`,v])));
  renderModernDonutChart(document.getElementById("dashboardStatusChart"), statusRows.map(([label,count])=>({label,count})), {centerText:String(alle.length), centerLabel:"Personen"});
  const cityRows=countBy(members,m=>(m.city||"").trim()).slice(0,12);
  renderCityDistanceRows("dashboardCityTable",cityRows);
  renderModernBarChart(document.getElementById("dashboardCityChart"), cityRows.map(([label,count])=>({label,count})));

  const committeeOptions=[...new Set((state.combos?.committees||[]).map(normalizeCommitteeValue).filter(Boolean))];
  const committeeRows=[];
  const assignedPersonIds=new Set();
  committeeOptions.forEach(c=>{
    const assignedMembers=members.filter(m=>getMemberCommittees(m).includes(c));
    const uniqueMembers=[...new Map(assignedMembers.map(m=>[m.id || fullMemberName(m),m])).values()];
    uniqueMembers.forEach(m=>assignedPersonIds.add(m.id || fullMemberName(m)));
    committeeRows.push({label:c, count:uniqueMembers.length, names:uniqueMembers.map(fullMemberName)});
  });
  const visibleCommitteeRows=committeeRows;
  const committeeChartRows=committeeRows.filter(r=>r.count>0).map(r=>({label:r.label,count:r.count}));
  renderCommitteeDashboardRows(visibleCommitteeRows);
  renderModernDonutChart(document.getElementById("dashboardCommitteeChart"), committeeChartRows, {centerText:String(assignedPersonIds.size), centerLabel:"Personen"});
  renderGrowthStats();
}

function formatEuro(value){
  const n=Number(value || 0);
  return n.toLocaleString("de-DE",{style:"currency",currency:"EUR"});
}

function getFinanceSummary(){
  const income=Array.isArray(state.finance) ? state.finance.filter(x=>String(x.type||x.kind||"").toLowerCase().includes("ein")).reduce((sum,x)=>sum+Number(x.amount||x.value||0),0) : 0;
  const expense=Array.isArray(state.finance) ? state.finance.filter(x=>String(x.type||x.kind||"").toLowerCase().includes("aus")).reduce((sum,x)=>sum+Number(x.amount||x.value||0),0) : 0;
  const payments=Array.isArray(state.payments) ? state.payments : [];
  const paymentIncome=payments.filter(x=>String(x.direction||x.type||"").toLowerCase().includes("ein")).reduce((sum,x)=>sum+Number(x.amount||x.value||0),0);
  const paymentExpense=payments.filter(x=>String(x.direction||x.type||"").toLowerCase().includes("aus")).reduce((sum,x)=>sum+Number(x.amount||x.value||0),0);
  const balances=Array.isArray(state.bankBalances) ? state.bankBalances : [];
  const lastBalance=balances.length ? Number(balances[balances.length-1].balance || balances[balances.length-1].amount || 0) : 0;
  const totalIncome=income+paymentIncome;
  const totalExpense=expense+paymentExpense;
  const result=totalIncome-totalExpense;
  const balance=lastBalance || result;
  return {balance,totalIncome,totalExpense,result,bookingCount:(state.finance?.length||0)+payments.length};
}

function renderFinanceDashboard(){
  const f=getFinanceSummary();
  setText("financeCardBalance",formatEuro(f.balance));
  setText("financeCardIncome",formatEuro(f.totalIncome));
  setText("financeCardExpense",formatEuro(f.totalExpense));
  setText("financeCardResult",formatEuro(f.result));
  const body=document.getElementById("dashboardFinanceTable");
  if(!body) return;
  body.innerHTML=`
    <tr><td>Aktueller Kontostand</td><td>${formatEuro(f.balance)}</td><td>aus gespeicherten Finanzdaten, derzeit Grundwert</td></tr>
    <tr><td>Einnahmen gesamt</td><td>${formatEuro(f.totalIncome)}</td><td>Beiträge, Spenden, Verkaufserlöse usw.</td></tr>
    <tr><td>Ausgaben gesamt</td><td>${formatEuro(f.totalExpense)}</td><td>Einkauf, Erstattungen, Gebühren usw.</td></tr>
    <tr><td>Jahresergebnis</td><td>${formatEuro(f.result)}</td><td>Einnahmen minus Ausgaben</td></tr>
    <tr><td>Buchungen</td><td>${f.bookingCount}</td><td>Finanzmodul wird später erweitert</td></tr>
  `;
}

function birthdayThisYear(dateStr){
  const d=new Date(dateStr);
  if(Number.isNaN(d.getTime())) return null;
  const today=new Date();
  let next=new Date(today.getFullYear(),d.getMonth(),d.getDate());
  if(next < new Date(today.getFullYear(),today.getMonth(),today.getDate())) next=new Date(today.getFullYear()+1,d.getMonth(),d.getDate());
  return next;
}

function getBirthdayItems(limit=30){
  const today=new Date();
  const today0=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  return currentMembers()
    .map(m=>{
      const next=birthdayThisYear(m.birthDate);
      if(!next) return null;
      const days=Math.round((next-today0)/86400000);
      const nextAge=ageFromBirthDate(m.birthDate) + (days===0 ? 0 : (next.getFullYear() > today.getFullYear() ? 1 : 0));
      return {member:m,next,days,nextAge};
    })
    .filter(Boolean)
    .sort((a,b)=>a.days-b.days)
    .slice(0,limit);
}

function renderBirthdayDashboard(){
  const items=getBirthdayItems(30).filter(x=>x.days<=30);
  const summary=document.getElementById("dashboardBirthdaySummary");
  const body=document.getElementById("dashboardBirthdaysTable");
  if(summary){
    const next30=items.filter(x=>x.days<=30).length;
    summary.textContent=items.length ? `${next30} Geburtstag(e) in den nächsten 30 Tagen.` : "Keine Geburtstagsdaten vorhanden.";
  }
  if(body){
    body.innerHTML=items.length ? items.map(x=>{
      const m=x.member;
      const name=`${m.firstName||""} ${m.lastName||""}`.trim();
      const when=x.days===0 ? "heute" : x.days===1 ? "morgen" : `in ${x.days} Tagen`;
      return `<tr><td>${escapeHtml(name)}</td><td>${x.next.toLocaleDateString("de-DE")}</td><td>${x.nextAge || "--"}</td><td>${when}</td></tr>`;
    }).join("") : `<tr><td colspan="4">Keine Geburtstagsdaten vorhanden.</td></tr>`;
  }
}

function setText(id,value){
  const el=document.getElementById(id);
  if(el) el.textContent=value;
}
