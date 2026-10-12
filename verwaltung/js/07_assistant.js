/* Interner Vereins-Assistent */
function currentUserAssistantEnabled(){
  if(!state.session?.isLoggedIn) return false;
  if(state.settings.assistantGlobalEnabled===false) return false;
  if(isSystemOwner()) return true;
  const account=getCurrentAccount();
  return account ? account.assistantEnabled!==false : true;
}

function memberFullName(m){
  return `${m.firstName||""} ${m.lastName||""}`.trim() || m.memberNo || "unbekannt";
}

const ASSISTANT_CLAIMS=[
  {key:"christmasDinner",label:"Weihnachtsessen"},
  {key:"expensePayout",label:"Auslagen / Erstattung"},
  {key:"travelReimbursement",label:"Fahrtkostenerstattung"},
  {key:"gratification",label:"Gratifikation"},
  {key:"trips",label:"Ausflüge"},
  {key:"parkingTicket",label:"Parkticket"},
  {key:"christmasMarketParkingTicket",label:"Parkticket Weihnachtsmarkt"}
];

const ASSISTANT_SKILLS=[
  {key:"skillElectrician",label:"Elektriker",area:"Handwerk"},{key:"skillPlumber",label:"Installateur",area:"Handwerk"},{key:"skillMetal",label:"Schlosser",area:"Handwerk"},{key:"skillCarpenter",label:"Tischler",area:"Handwerk"},{key:"skillPainter",label:"Maler",area:"Handwerk"},{key:"skillGardener",label:"Gärtner",area:"Handwerk"},
  {key:"skillPc",label:"PC-Kenntnisse",area:"EDV"},{key:"skillExcel",label:"Excel",area:"EDV"},{key:"skillWord",label:"Word",area:"EDV"},{key:"skillInternet",label:"Internet",area:"EDV"},{key:"skillPrinter",label:"Drucker",area:"EDV"},{key:"skillProgramming",label:"Programmierung",area:"EDV"},
  {key:"skillGrill",label:"Grillmeister",area:"Küche"},{key:"skillSoup",label:"Suppenküche",area:"Küche"},{key:"skillFryer",label:"Fritteuse",area:"Küche"},{key:"skillDrinks",label:"Getränke",area:"Küche"},{key:"skillHygiene",label:"Hygiene",area:"Küche"},{key:"skillHaccp",label:"HACCP",area:"Küche"},
  {key:"skillShopping",label:"Einkauf",area:"Organisation"},{key:"skillLogistics",label:"Logistik",area:"Organisation"},{key:"skillDecoration",label:"Dekoration",area:"Organisation"},{key:"skillEvents",label:"Veranstaltungsplanung",area:"Organisation"},{key:"skillCash",label:"Kassenführung",area:"Organisation"},
  {key:"skillCarLicense",label:"PKW",area:"Führerscheine"},{key:"skillTrailer",label:"Anhänger",area:"Führerscheine"},{key:"skillTruck",label:"LKW",area:"Führerscheine"},{key:"skillForklift",label:"Staplerschein",area:"Führerscheine"},
  {key:"skillFirstAid",label:"Erste Hilfe",area:"Bescheinigungen"},{key:"skillHealthCertificate",label:"Gesundheitszeugnis",area:"Bescheinigungen"},{key:"skillHygieneTraining",label:"Hygieneschulung",area:"Bescheinigungen"},{key:"skillFireSafety",label:"Brandschutzhelfer",area:"Bescheinigungen"}
];

const ASSISTANT_MISSING_FIELDS={
  email:"E-Mail", joinedAt:"Eintritt", memberType:"Status", birthDate:"Geburtsdatum", phone:"Telefon", mobile:"Mobil", street:"Straße", city:"Ort"
};

function assistantTable(headers, rows){
  if(!rows.length) return '<p>Keine passenden Daten gefunden.</p>';
  return `<div class="table-wrap compact-table"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${escapeHtml(String(c??""))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function assistantAnswer(question){
  const q=String(question||"").toLowerCase();
  const activeMembers=(state.members||[]).filter(m=>!isExitedMember(m));
  if(q.includes("parkticket") && q.includes("weihnachtsmarkt")){
    const rows=activeMembers.filter(m=>m.claims?.christmasMarketParkingTicket).map(m=>[m.memberNo||"", m.lastName||"", m.firstName||"", m.claims?.christmasMarketParkingPlate||"", m.mobile||m.phone||""]);
    return `<h4>Parkticket Weihnachtsmarkt</h4>${assistantTable(["Nr.","Name","Vorname","Kennzeichen","Telefon/Mobil"],rows)}`;
  }
  if(q.includes("geburtstag")){
    const now=new Date();
    const rows=activeMembers.map(m=>({m,next:nextBirthdayDate(m.birthDate,now)})).filter(x=>x.next && ((x.next-now)/(1000*60*60*24))<=30).sort((a,b)=>a.next-b.next).map(x=>[x.m.memberNo||"", x.m.lastName||"", x.m.firstName||"", x.next.toLocaleDateString("de-DE")]);
    return `<h4>Geburtstage in den nächsten 30 Tagen</h4>${assistantTable(["Nr.","Name","Vorname","Datum"],rows)}`;
  }
  if(q.includes("werne") && q.includes("aktiv")){
    const rows=activeMembers.filter(m=>memberStatus(m)==="Aktiv" && String(m.city||"").toLowerCase().includes("werne")).map(m=>[m.memberNo||"",m.lastName||"",m.firstName||"",m.city||"",m.email||""]);
    return `<h4>Aktive Mitglieder aus Werne</h4>${assistantTable(["Nr.","Name","Vorname","Ort","E-Mail"],rows)}`;
  }
  if(q.includes("keine e-mail") || q.includes("ohne e-mail") || q.includes("fehlt") && q.includes("mail")){
    const rows=activeMembers.filter(m=>!String(m.email||"").trim()).map(m=>[m.memberNo||"",m.lastName||"",m.firstName||"",m.phone||"",m.mobile||""]);
    return `<h4>Mitglieder ohne E-Mail-Adresse</h4>${assistantTable(["Nr.","Name","Vorname","Telefon","Mobil"],rows)}`;
  }
  if(q.includes("ausfl") && q.includes("anspruch")){
    const rows=activeMembers.map(m=>({m,check:checkTripClaim(m)})).filter(x=>!x.check.eligible).map(x=>[x.m.memberNo||"",x.m.lastName||"",x.m.firstName||"",`${x.check.months||0} Monate`,x.check.reason==="claimNotSet"?"Anspruch nicht gesetzt":"Zugehörigkeit zu kurz"]);
    return `<h4>Kein Anspruch auf Ausflüge</h4>${assistantTable(["Nr.","Name","Vorname","Zugehörigkeit","Grund"],rows)}`;
  }
  const skillTerms=["elektriker","excel","hygiene","edv","anhänger","stapler","erste hilfe","grill","fritteuse"];
  const term=skillTerms.find(t=>q.includes(t));
  if(term){
    const rows=activeMembers.filter(m=>JSON.stringify(m.skills||{}).toLowerCase().includes(term)).map(m=>[m.memberNo||"",m.lastName||"",m.firstName||"",m.mobile||m.phone||"",m.email||""]);
    return `<h4>Mitglieder mit Fähigkeit: ${escapeHtml(term)}</h4>${assistantTable(["Nr.","Name","Vorname","Telefon/Mobil","E-Mail"],rows)}`;
  }
  return `<p>Diese Frage kann der interne Assistent noch nicht sicher beantworten.</p><p class="hint">Vorbereitet sind aktuell: Parkticket Weihnachtsmarkt, Geburtstage, aktive Mitglieder aus Werne, Ausflugsanspruch, fehlende E-Mail und einfache Fähigkeitsfragen.</p>`;
}

function setSelectOptions(selectId, items, valueKey="value", labelKey="label", emptyLabel=""){
  const el=document.getElementById(selectId);
  if(!el) return;
  const current=el.value;
  const rows=[];
  if(emptyLabel) rows.push({value:"",label:emptyLabel});
  (items||[]).forEach(item=>{
    if(typeof item==="string") rows.push({value:item,label:item});
    else rows.push({value:item[valueKey]??"",label:item[labelKey]??item[valueKey]??""});
  });
  el.innerHTML=rows.map(r=>`<option value="${escapeHtml(String(r.value))}">${escapeHtml(String(r.label))}</option>`).join("");
  if([...el.options].some(o=>o.value===current)) el.value=current;
}

function activeAssistantMembers(){
  return (state.members||[]).filter(m=>!isExitedMember(m));
}

function renderAssistantSelectors(){
  setSelectOptions("assistantClaimSelect",ASSISTANT_CLAIMS,"key","label");
  const cities=[...new Set(activeAssistantMembers().map(m=>String(m.city||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
  setSelectOptions("assistantCitySelect",cities,"value","label","Alle Orte");
  const acts=(state.activities||[]).slice().sort((a,b)=>(b.dateFrom||"").localeCompare(a.dateFrom||"")).map(a=>({value:a.id,label:`${a.activityNo||""} ${a.activity||"Aktivität"} ${a.dateFrom?"("+formatDate(a.dateFrom)+")":""}`.trim()}));
  setSelectOptions("assistantActivitySelect",acts,"value","label","Alle gespeicherten Aktivitäten");
  setSelectOptions("assistantSkillSelect",ASSISTANT_SKILLS,"key","label");
}

function assistantClaimEvaluation(claimKey){
  const claim=ASSISTANT_CLAIMS.find(c=>c.key===claimKey)||ASSISTANT_CLAIMS[0];
  const rows=activeAssistantMembers().map(m=>{
    const c=checkMemberClaimEligibility(m,claim.key,new Date());
    return [m.memberNo||"",m.lastName||"",m.firstName||"",m.memberType||"",c.eligible?"Ja":"Nein",`${c.months||0}/${c.minMonths||0} Monate`,c.reason==="claimMissing"?"Anspruch nicht gesetzt":(c.reason==="monthsMissing"?"Zugehörigkeit zu kurz":(c.reason==="noMonthCheck"?"keine Monatsprüfung":"erfüllt"))];
  });
  return `<h4>Anspruch: ${escapeHtml(claim.label)}</h4>${assistantTable(["Nr.","Name","Vorname","Status","Anspruch","Zugehörigkeit","Hinweis"],rows)}`;
}

function assistantBirthdays(days){
  const d=Number(days||30);
  const now=new Date();
  const rows=activeAssistantMembers().map(m=>({m,next:nextBirthdayDate(m.birthDate,now)})).filter(x=>x.next && ((x.next-now)/(1000*60*60*24))<=d).sort((a,b)=>a.next-b.next).map(x=>[x.m.memberNo||"",x.m.lastName||"",x.m.firstName||"",x.next.toLocaleDateString("de-DE"),x.m.memberType||""]);
  return `<h4>Geburtstage in den nächsten ${d} Tagen</h4>${assistantTable(["Nr.","Name","Vorname","Datum","Status"],rows)}`;
}

function assistantActiveByCity(city){
  const selected=String(city||"").trim().toLowerCase();
  const rows=activeAssistantMembers().filter(m=>memberStatus(m)==="Aktiv" && (!selected || String(m.city||"").trim().toLowerCase()===selected)).map(m=>[m.memberNo||"",m.lastName||"",m.firstName||"",m.city||"",m.email||"",m.mobile||m.phone||""]);
  return `<h4>Aktive Mitglieder${selected?" aus "+escapeHtml(city):" nach Ort"}</h4>${assistantTable(["Nr.","Name","Vorname","Ort","E-Mail","Telefon/Mobil"],rows)}`;
}

function assistantMissingData(fieldKey){
  const label=ASSISTANT_MISSING_FIELDS[fieldKey]||fieldKey;
  const rows=activeAssistantMembers().filter(m=>!String(m[fieldKey]||"").trim()).map(m=>[m.memberNo||"",m.lastName||"",m.firstName||"",m.memberType||"",m.email||""]);
  return `<h4>Fehlende Mitgliedsdaten: ${escapeHtml(label)}</h4>${assistantTable(["Nr.","Name","Vorname","Status","E-Mail"],rows)}`;
}

function assistantSkillMembers(skillKey){
  const skill=ASSISTANT_SKILLS.find(s=>s.key===skillKey)||ASSISTANT_SKILLS[0];
  const rows=activeAssistantMembers().filter(m=>m.skills?.[skill.key]).map(m=>[m.memberNo||"",m.lastName||"",m.firstName||"",skill.area,skill.label,m.skills?.levels?.[skill.key]||"",m.mobile||m.phone||"",m.email||""]);
  return `<h4>Fähigkeit: ${escapeHtml(skill.label)}</h4>${assistantTable(["Nr.","Name","Vorname","Bereich","Fähigkeit","Stufe","Telefon/Mobil","E-Mail"],rows)}`;
}

function assistantAllSkills(){
  const rows=[];
  activeAssistantMembers().forEach(m=>{
    ASSISTANT_SKILLS.forEach(skill=>{
      if(m.skills?.[skill.key]) rows.push([m.memberNo||"",m.lastName||"",m.firstName||"",skill.area,skill.label,m.skills?.levels?.[skill.key]||""]);
    });
  });
  return `<h4>Alle erfassten Fähigkeiten</h4>${assistantTable(["Nr.","Name","Vorname","Bereich","Fähigkeit","Stufe"],rows)}`;
}

function assistantActivityClaim(activityId){
  const activities=(state.activities||[]).filter(a=>!activityId || a.id===activityId);
  if(!activities.length) return `<h4>Aktivitätsanspruch</h4><p>Keine Aktivität gespeichert.</p>`;
  const rows=[];
  activities.forEach(a=>{
    const date=a.dateFrom?new Date(a.dateFrom):new Date();
    const participantIds=(a.participants||[]).map(p=>p.memberId);
    const members=participantIds.length ? activeAssistantMembers().filter(m=>participantIds.includes(m.id)) : activeAssistantMembers();
    members.forEach(m=>{
      const c=checkMemberClaimEligibility(m,"trips",date);
      if(!c.eligible) rows.push([a.activityNo||"",a.activity||"",formatDate(a.dateFrom),m.memberNo||"",m.lastName||"",m.firstName||"",`${c.months||0}/${c.minMonths||0} Monate`,c.reason==="claimMissing"?"Anspruch nicht gesetzt":"Zugehörigkeit zu kurz"]);
    });
  });
  return `<h4>Anspruchsprüfung Aktivitäten / Ausflüge</h4>${assistantTable(["Akt.-Nr.","Aktivität","Datum","Mitgl.-Nr.","Name","Vorname","Zugehörigkeit","Grund"],rows)}`;
}


function selectAssistantMode(mode){
  const titles={
    birthdays:["Geburtstage","Zeitraum wählen und Geburtstagsliste anzeigen."],
    claim:["Ansprüche","Anspruch auswählen und Mitglieder prüfen."],
    city:["Mitglieder nach Ort","Ort auswählen und aktive Mitglieder anzeigen."],
    activity:["Aktivität / Ausflug prüfen","Aktivität auswählen und Anspruch der Teilnehmer prüfen."],
    missing:["Fehlende Mitgliedsdaten","Datenfeld auswählen und unvollständige Mitglieder anzeigen."],
    skill:["Fähigkeiten","Fähigkeit auswählen oder alle Fähigkeiten auflisten."]
  };
  document.querySelectorAll(".assistant-mode-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.assistantMode===mode));
  document.querySelectorAll(".assistant-mode-panel").forEach(panel=>panel.classList.add("hidden"));
  const panelMap={birthdays:"assistantModeBirthdays",claim:"assistantModeClaim",city:"assistantModeCity",activity:"assistantModeActivity",missing:"assistantModeMissing",skill:"assistantModeSkill"};
  const panel=document.getElementById(panelMap[mode]||"");
  if(panel) panel.classList.remove("hidden");
  const t=titles[mode]||["Bitte eine Schnellfrage auswählen","Der Assistent zeigt danach nur die passenden Felder."];
  const title=document.getElementById("assistantStepTitle");
  const hint=document.getElementById("assistantStepHint");
  if(title) title.textContent=t[0];
  if(hint) hint.textContent=t[1];
}

function renderAssistant(){
  const box=document.getElementById("assistantAnswer");
  if(!box) return;
  renderAssistantSelectors();
  if(!currentUserAssistantEnabled()){
    box.innerHTML='<p class="warn-text">Der Vereins-Assistent ist für diesen Benutzer deaktiviert.</p>';
    return;
  }
  if(!document.querySelector(".assistant-mode-btn.active")){
    selectAssistantMode("birthdays");
  }
}

function setAssistantAnswer(html, action="Auswertung"){
  const target=document.getElementById("assistantAnswer");
  if(target) target.innerHTML=html;
  logAction("Vereins-Assistent",action,"Filterauswertung");
}

function askAssistant(){
  if(!currentUserAssistantEnabled()){
    toast("Der Vereins-Assistent ist für diesen Benutzer deaktiviert.","error");
    return;
  }
  const q=document.getElementById("assistantQuestion")?.value || "";
  const target=document.getElementById("assistantAnswer");
  if(!q.trim()){
    toast("Bitte eine Frage eingeben.","error");
    return;
  }
  if(target) target.innerHTML=assistantAnswer(q);
  logAction("Vereins-Assistent","Frage beantwortet",q.slice(0,120));
}

function saveAssistantSettings(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Assistent-Einstellungen speichern.","error");
    return false;
  }
  state.settings.assistantGlobalEnabled=document.getElementById("assistantGlobalEnabled")?.value!=="no";
  state.settings.assistantExternalPrepared=document.getElementById("assistantExternalPrepared")?.value==="prepared";
  state.settings.assistantExternalEndpoint=document.getElementById("assistantExternalEndpoint")?.value || "";
  saveState();
  logAction("Einstellungen","Vereins-Assistent gespeichert",state.settings.assistantGlobalEnabled?"aktiv":"deaktiviert");
  toast("Assistent-Einstellungen gespeichert.","success");
  return true;
}

