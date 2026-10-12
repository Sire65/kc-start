/* Mitglieder, Ansprüche, Fähigkeiten, Mitgliedsformular */
let currentMemberId="";
let memberSnapshot="";
let selectedMemberIds = new Set();
let memberSearchSort = { key:"memberNo", dir:"asc" };

function uid(){
  return crypto?.randomUUID ? crypto.randomUUID() : "id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
}

function fillSelect(id,values,selected=""){
  const el=document.getElementById(id);
  if(!el)return;
  const clean=["",...(values||[]).filter(v=>String(v).trim() && v!=="")];
  el.innerHTML=clean.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  el.value=clean.includes(selected)?selected:"";
}

function initMemberCombos(){
  fillSelect("salutation",state.combos.salutation);
  fillSelect("title",state.combos.titles);
  fillSelect("exitReason",state.combos.exitReasons);
  fillSelect("memberType",state.combos.memberType);
  fillSelect("clubFunction",state.combos.clubFunction);
  fillSelect("specialQualification",state.combos.specialQualifications);
  fillSelect("profession",state.combos.professions);
  fillSelect("availability",state.combos.availability);
  fillSelect("shiftPreference",state.combos.shiftPreference);
  fillSelect("preferredDeployment",state.combos.preferredDeployment);
  renderSkillSearchDatalist();
  renderCommitteeBox([]);
}

function renderSkillSearchDatalist(){
  const list=document.getElementById("skillSearchOptions");
  if(!list) return;
  const values=normalizeComboValues(state.combos?.skillSearchTerms||DEFAULT_STATE.combos.skillSearchTerms).filter(Boolean);
  list.innerHTML=values.map(v=>`<option value="${escapeHtml(v)}"></option>`).join("");
}

function renderCommitteeBox(selected=[]){
  const box=document.getElementById("committeeBox");
  if(!box)return;
  const aliases={service:"Service (Vorne)",nachschub:"Nachschub (Hinten)",vorber:"Vorbereitung",vorbereitung:"Vorbereitung",admin:"Admin",finanzen:"Finanzen",wartung:"Wartung",planung:"Planung",technik:"Technik",innovation:"Innovation"};
  const canonical=value=>{const clean=String(value||"").trim();return aliases[clean.toLowerCase().replace(/[.]/g,"")]||clean;};
  const selectedValues=[...new Set((Array.isArray(selected)?selected:[]).map(canonical).filter(Boolean))];
  const configured=(state.combos.committees||[]).map(canonical).filter(Boolean);
  const values=[...new Set([...configured,...selectedValues])];
  box.innerHTML=values.map(v=>`
    <label class="check-item"><input type="checkbox" name="committee" value="${escapeHtml(v)}" ${selectedValues.includes(v)?"checked":""}><span>${escapeHtml(v)}</span></label>
  `).join("");
}
function getSelectedCommittees(){
  return Array.from(document.querySelectorAll('input[name="committee"]:checked')).map(x=>x.value);
}

function defaultAssetScale(){
  return Array.from({length:50},(_,i)=>({fromYears:i,toYears:i+1,percent:0}));
}

function normalizeAssetScale(scale){
  const defaults=defaultAssetScale();
  if(!Array.isArray(scale)) return defaults;
  return defaults.map((d,i)=>{
    const item=scale[i]||{};
    return {
      fromYears:Number.isFinite(Number(item.fromYears))?Number(item.fromYears):d.fromYears,
      toYears:Number.isFinite(Number(item.toYears))?Number(item.toYears):d.toYears,
      percent:Number.isFinite(Number(item.percent))?Number(item.percent):0
    };
  });
}

function getAssetScaleFromForm(){
  return Array.from(document.querySelectorAll('.asset-scale-percent')).map(input=>({
    fromYears:Number(input.dataset.from||0),
    toYears:Number(input.dataset.to||0),
    percent:Number(input.value||0)
  }));
}

function renderAssetScale(scale){
  const body=document.getElementById('assetScaleBody');
  if(!body) return;
  const rows=normalizeAssetScale(scale);
  body.innerHTML=rows.map(r=>`<tr><td>${r.fromYears} - ${r.toYears} ${r.toYears===1?'Jahr':'Jahre'}</td><td><input class="asset-scale-percent" type="number" min="0" max="100" step="1" data-from="${r.fromYears}" data-to="${r.toYears}" value="${Number(r.percent||0)}"> %</td></tr>`).join('');
}

function setAllClaims(checked){
  document.querySelectorAll('.claim-check').forEach(cb=>{ cb.checked=checked; });
  syncClaimToggleAll();
}

function syncClaimToggleAll(){
  const master=document.getElementById('claimToggleAll');
  if(!master) return;
  const checks=Array.from(document.querySelectorAll('.claim-check'));
  master.checked=checks.length>0 && checks.every(cb=>cb.checked);
  master.indeterminate=checks.some(cb=>cb.checked) && !master.checked;
}

function membershipMonths(member,asOf=new Date()){
  if(!member || !member.joinedAt) return 0;
  const start=new Date(member.joinedAt);
  if(Number.isNaN(start.getTime())) return 0;
  return Math.max(0,(asOf.getFullYear()-start.getFullYear())*12 + (asOf.getMonth()-start.getMonth()) - (asOf.getDate()<start.getDate()?1:0));
}

function checkMemberClaimEligibility(member,claimKey,asOf=new Date()){
  const claims={...defaultClaims(),...(member?.claims||{})};
  const hasClaim=!!claims[claimKey];
  const minMonths=Number(claims[claimKey+'Months']||0);
  const months=membershipMonths(member,asOf);
  /* Wer ausgeschieden oder verstorben ist, hat keine Ansprueche mehr. Geprueft wird ueber
     memberStatus, nicht ueber die Mitgliedsart: bei einem Verstorbenen steht dort oft noch
     "Aktiv", und der Austritt haengt am Austrittsgrund. */
  if(typeof memberStatus==="function" && member && memberStatus(member)==="Ausgeschieden"){
    return {
      required:true, eligible:false, reason:"ausgeschieden", months, minMonths,
      message:`${member?.firstName||''} ${member?.lastName||''} ist ausgeschieden - kein Anspruch.`
    };
  }
  /* Ansprueche (Weihnachtsessen, Gratifikation, Fahrten ...) haengen an der Mitgliedschaft.
     Ein Gast oder eine Aushilfe hat sie nicht - auch dann nicht, wenn im Datensatz
     versehentlich ein Haken gesetzt wurde. */
  if(typeof istVereinsmitglied==="function" && member && !istVereinsmitglied(member)){
    return {
      required:true,
      eligible:false,
      reason:"keinMitglied",
      months,
      minMonths,
      message:`${member?.firstName||''} ${member?.lastName||''} ist ${memberStatus(member)} und damit kein Mitglied - kein Anspruch.`
    };
  }
  if(!hasClaim){
    return {
      required:true,
      eligible:false,
      reason:"claimMissing",
      months,
      minMonths,
      message:`${member?.firstName||''} ${member?.lastName||''} hat keinen Anspruch, weil der Anspruch nicht gesetzt ist.`
    };
  }
  if(minMonths<=0) return {required:false,eligible:true,reason:"noMonthCheck",months,minMonths,message:'Anspruch gesetzt, keine Monatsprüfung erforderlich.'};
  return {
    required:true,
    eligible:months>=minMonths,
    reason:months>=minMonths ? "ok" : "monthsMissing",
    months,
    minMonths,
    message: months>=minMonths ? 'Anspruch erfüllt.' : `${member.firstName||''} ${member.lastName||''} hat keinen Anspruch (${months}/${minMonths} Monate). Trotzdem einplanen?`
  };
}

function defaultClaims(){
  return {
    christmasDinner:false,christmasDinnerMonths:0,
    expensePayout:false,expensePayoutMonths:0,
    travelReimbursement:false,travelReimbursementMonths:0,
    gratification:false,gratificationMonths:0,
    trips:false,tripsMonths:0,
    parkingTicket:false,parkingTicketMonths:0,
    christmasMarketParkingTicket:false,christmasMarketParkingTicketMonths:0,
    workwear:false,workwearMonths:0,
    christmasMarketCarPlate:"",
    carPlate:"",
    assetScale:defaultAssetScale(),
    notes:""
  };
}

function claimsFromForm(){
  return {
    christmasDinner:claimChristmasDinner.checked,
    christmasDinnerMonths:Number(claimChristmasDinnerMonths.value||0),
    expensePayout:claimExpensePayout.checked,
    expensePayoutMonths:Number(claimExpensePayoutMonths.value||0),
    travelReimbursement:claimTravelReimbursement.checked,
    travelReimbursementMonths:Number(claimTravelReimbursementMonths.value||0),
    gratification:claimGratification.checked,
    gratificationMonths:Number(claimGratificationMonths.value||0),
    trips:claimTrips.checked,
    tripsMonths:Number(claimTripsMonths.value||0),
    parkingTicket:claimParkingTicket.checked,
    parkingTicketMonths:Number(claimParkingTicketMonths.value||0),
    christmasMarketParkingTicket:claimChristmasMarketParkingTicket.checked,
    christmasMarketParkingTicketMonths:Number(claimChristmasMarketParkingTicketMonths.value||0),
    workwear:!!document.getElementById("claimWorkwear")?.checked,
    workwearMonths:Number(document.getElementById("claimWorkwearMonths")?.value||0),
    christmasMarketCarPlate:christmasMarketCarPlate.value||"",
    carPlate:christmasMarketCarPlate.value||"",
    assetScale:getAssetScaleFromForm(),
    notes:claimNotes.value||""
  };
}

const skillFieldIds=[
  "skillElectrician","skillPlumber","skillMetal","skillCarpenter","skillPainter","skillGardener",
  "skillPc","skillExcel","skillWord","skillInternet","skillPrinter","skillProgramming",
  "skillGrill","skillSoup","skillFryer","skillDrinks","skillHygiene","skillHaccp",
  "skillShopping","skillLogistics","skillDecoration","skillEvents","skillCash",
  "skillCarLicense","skillTrailer","skillTruck","skillForklift",
  "skillFirstAid","skillHealthCertificate","skillHygieneTraining","skillFireSafety"
];

function defaultSkills(){
  const obj={levels:{},notes:""};
  skillFieldIds.forEach(id=>{ obj[id]=false; obj.levels[id]=""; });
  return obj;
}

function skillsFromForm(){
  const obj=defaultSkills();
  skillFieldIds.forEach(id=>{
    const el=document.getElementById(id);
    const levelEl=document.getElementById(id+"Level");
    obj[id]=!!el?.checked;
    obj.levels[id]=levelEl?.value||"";
  });
  obj.notes=document.getElementById("skillNotes")?.value||"";
  return obj;
}

function skillsToForm(skills={}){
  const obj={...defaultSkills(),...(skills||{})};
  if(!obj.levels) obj.levels={};
  // Kompatibilität zu früheren Versionen: alte globale Stufe auf aktivierte Fähigkeiten übertragen
  if(obj.level && !Object.values(obj.levels).some(Boolean)){
    skillFieldIds.forEach(id=>{ if(obj[id]) obj.levels[id]=obj.level; });
  }
  skillFieldIds.forEach(id=>{
    const el=document.getElementById(id);
    const levelEl=document.getElementById(id+"Level");
    if(el) el.checked=!!obj[id];
    if(levelEl) levelEl.value=obj.levels?.[id]||"";
  });
  const notes=document.getElementById("skillNotes"); if(notes) notes.value=obj.notes||"";
}

function claimsToForm(c={}){
  c={...defaultClaims(),...c};
  claimChristmasDinner.checked=!!c.christmasDinner;
  claimChristmasDinnerMonths.value=c.christmasDinnerMonths||0;
  claimExpensePayout.checked=!!c.expensePayout;
  claimExpensePayoutMonths.value=c.expensePayoutMonths||0;
  claimTravelReimbursement.checked=!!c.travelReimbursement;
  claimTravelReimbursementMonths.value=c.travelReimbursementMonths||0;
  claimGratification.checked=!!c.gratification;
  claimGratificationMonths.value=c.gratificationMonths||0;
  claimTrips.checked=!!c.trips;
  claimTripsMonths.value=c.tripsMonths||0;
  claimParkingTicket.checked=!!c.parkingTicket;
  claimParkingTicketMonths.value=c.parkingTicketMonths||0;
  claimChristmasMarketParkingTicket.checked=!!c.christmasMarketParkingTicket;
  claimChristmasMarketParkingTicketMonths.value=c.christmasMarketParkingTicketMonths||0;
  if(document.getElementById("claimWorkwear")) claimWorkwear.checked=!!c.workwear;
  if(document.getElementById("claimWorkwearMonths")) claimWorkwearMonths.value=c.workwearMonths||0;
  christmasMarketCarPlate.value=c.christmasMarketCarPlate||c.carPlate||"";
  renderAssetScale(c.assetScale);
  claimNotes.value=c.notes||"";
  syncClaimToggleAll();
}

function nextMemberNo(){
  let max=0;
  state.members.forEach(m=>{
    const n=String(m.memberNo||"").match(/(\d+)/);
    if(n)max=Math.max(max,Number(n[1]));
  });
  return "KC-"+String(max+1).padStart(4,"0");
}

function formToMember(){
  // Bestehenden Datensatz als Basis verwenden. Dadurch gehen Felder, die nicht
  // auf der aktuellen Maske liegen (z. B. distanceKm oder künftige DB-Felder),
  // beim Speichern niemals verloren.
  const existing=state.members.find(x=>String(x.id)===String(currentMemberId));
  const m={...(existing||{}),id:currentMemberId||uid()};
  memberFields.forEach(f=>m[f]=document.getElementById(f)?.value||"");
  m.committees=getSelectedCommittees();
  m.claims=claimsFromForm();
  m.skills=skillsFromForm();
  m.clothing={
    jacketSize:document.getElementById("memberJacketSize")?.value||"",
    poloSize:document.getElementById("memberPoloSize")?.value||"",
    pantsSize:document.getElementById("memberPantsSize")?.value||"",
    shoeSize:document.getElementById("memberShoeSize")?.value||""
  };
  const existingPhoto=state.members.find(x=>String(x.id)===String(m.id));
  m.photoData=window.KNGMemberPhoto?.getData?.() || existingPhoto?.photoData || existingPhoto?.photo || "";
  if(document.getElementById("memberWorkwearClaim")){
    m.claims.workwear=document.getElementById("memberWorkwearClaim").value==="yes";
    m.claims.workwearMonths=Number(document.getElementById("memberWorkwearMonths")?.value||0);
  }
  m.updatedAt=new Date().toISOString();
  return m;
}

function memberToForm(m){
  currentMemberId=m.id;
  memberFields.forEach(f=>{
    const field=document.getElementById(f);
    if(field){
      const storedValue=m[f]||"";
      // Freie bzw. ältere Werte dürfen bei Auswahlfeldern nicht unsichtbar werden.
      // Sonst würde eine spätere automatische Speicherung den Wert mit leer überschreiben.
      if(field.tagName==="SELECT" && storedValue && ![...field.options].some(option=>option.value===String(storedValue))){
        field.add(new Option(String(storedValue),String(storedValue)));
      }
      field.value=storedValue;
    }
  });
  window.KNGMemberPhoto?.load?.(m);
  renderCommitteeBox(m.committees||[]);
  claimsToForm(m.claims||defaultClaims());
  skillsToForm(m.skills||defaultSkills());
  if(typeof clothingToForm==="function") clothingToForm(m);
  if(typeof renderMemberWorkwearIssues==="function") renderMemberWorkwearIssues(m.id);
  renderMemberDocumentsAndHistory(m);
  updateMemberDerived();
  markExitFields();
  markMemberClean();
  if(typeof renderMembers === "function") setTimeout(renderMembers,0);
}

function memberSignature(){
  const data={};
  memberFields.forEach(f=>{
    const field=document.getElementById(f);
    data[f]=field?field.value||"":"";
  });
  data.committees=getSelectedCommittees();
  data.claims=claimsFromForm();
  data.skills=skillsFromForm();
  data.clothing={
    jacketSize:document.getElementById("memberJacketSize")?.value||"",
    poloSize:document.getElementById("memberPoloSize")?.value||"",
    pantsSize:document.getElementById("memberPantsSize")?.value||"",
    shoeSize:document.getElementById("memberShoeSize")?.value||"",
    workwearClaim:document.getElementById("memberWorkwearClaim")?.value||"",
    workwearMonths:document.getElementById("memberWorkwearMonths")?.value||"0"
  };
  return JSON.stringify(data);
}

function markMemberClean(){
  memberSnapshot=memberSignature();
}

function memberIsDirty(){
  if(!state.session.isLoggedIn) return false;
  if(!memberSnapshot) return false;
  return memberSignature()!==memberSnapshot;
}

function confirmLeaveMember(){
  if(!state.session.isLoggedIn) return true;
  if(!memberIsDirty())return true;
  const save=confirm("Möchten Sie die Änderungen speichern oder verwerfen?\n\nOK = speichern\nAbbrechen = verwerfen");
  if(save)return saveMember();
  markMemberClean();
  toast("Änderungen verworfen.","info");
  return true;
}


function resetMemberForm(){
  currentMemberId=uid();
  window.KNGMemberPhoto?.clear?.();
  memberFields.forEach(f=>{
    const field=document.getElementById(f);
    if(field)field.value="";
  });
  memberNo.value=nextMemberNo();
  joinedAt.value=new Date().toISOString().slice(0,10);
  renderCommitteeBox([]);
  claimsToForm(defaultClaims());
  skillsToForm(defaultSkills());
  if(typeof clothingToForm==="function") clothingToForm({clothing:{},claims:defaultClaims()});
  if(typeof renderMemberWorkwearIssues==="function") renderMemberWorkwearIssues(currentMemberId);
  renderMemberDocumentsAndHistory({id:currentMemberId});
  updateMemberDerived();
  markExitFields();
  markMemberClean();
}

function clearMemberForm(){
  if(!confirmLeaveMember())return;
  resetMemberForm();
  toast("Neues Mitglied wird erfasst.","info");
}

function validateMember(m){
  if(!m.firstName.trim())return "Bitte Vorname eingeben.";
  if(!m.lastName.trim())return "Bitte Nachname eingeben.";
  if(!m.joinedAt.trim())return "Bitte Eintrittsdatum eingeben.";
  if(!m.email.trim())return "Bitte E-Mail eingeben.";
  const dup=state.members.find(x=>x.id!==m.id && x.firstName?.trim().toLowerCase()===m.firstName.trim().toLowerCase() && x.lastName?.trim().toLowerCase()===m.lastName.trim().toLowerCase());
  if(dup)return "Mitglied existiert bereits !";
  return "";
}

function memberPersistenceSignature(member){
  const fields={};
  memberFields.forEach(field=>fields[field]=String(member?.[field]??""));
  return JSON.stringify({
    fields,
    committees:[...(member?.committees||[])].map(String).sort(),
    clothing:member?.clothing||{},
    photoData:String(member?.photoData||member?.photo||"")
  });
}

function memberWasPersisted(member){
  const persisted=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
  const check=(persisted.members||[]).find(x=>String(x.id)===String(member.id));
  return !!check && memberPersistenceSignature(check)===memberPersistenceSignature(member);
}
function saveMember(){
  const m=formToMember();
  const err=validateMember(m);
  if(err){
    toast(err,"error");
    logAction("Mitglieder","Speichern abgebrochen",err);
    return false;
  }

  const now=new Date().toISOString();
  const idx=state.members.findIndex(x=>String(x.id)===String(m.id));
  let savedMember;

  if(idx>=0){
    savedMember={
      ...state.members[idx],
      ...m,
      id:state.members[idx].id,
      createdAt:state.members[idx].createdAt || m.createdAt || now,
      updatedAt:now
    };
    state.members.splice(idx,1,savedMember);
    logAction("Mitglieder","Mitglied geändert",`${savedMember.firstName||""} ${savedMember.lastName||""}`.trim());
  }else{
    savedMember={
      ...m,
      id:m.id || uid(),
      createdAt:m.createdAt || now,
      updatedAt:now
    };
    state.members.unshift(savedMember);
    logAction("Mitglieder","Mitglied angelegt",`${savedMember.firstName||""} ${savedMember.lastName||""}`.trim());
  }

  const persistedOk=saveState();
  if(persistedOk===false){
    toast("Speichern fehlgeschlagen. Eingaben bleiben sichtbar – bitte nicht neu laden.","error");
    return false;
  }
  try{
    if(!memberWasPersisted(savedMember)) throw new Error("Rückleseprüfung der Mitgliedsdaten fehlgeschlagen.");
  }catch(error){
    console.error(error);
    toast("Speichern nicht bestätigt. Eingaben bleiben sichtbar – bitte nicht neu laden.","error");
    return false;
  }

  // Nach dem Speichern immer den tatsächlich gespeicherten Datensatz zurück ins Formular laden.
  // Dadurch stimmen Formular, Tabelle, LocalStorage und Dirty-Snapshot sicher überein.
  memberToForm(savedMember);
  markMemberClean();

  renderMembers();
  renderDashboard();
  renderSettings();

  const check=state.members.find(x=>String(x.id)===String(savedMember.id));
  if(!check){
    toast("Speichern fehlgeschlagen: Datensatz wurde nicht wiedergefunden.","error");
    logAction("Mitglieder","Speichern fehlgeschlagen","Datensatz nach saveState nicht auffindbar");
    return false;
  }

  toast("Mitglied erfolgreich gespeichert.","success");
  return true;
}

function handleDeleteMember(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Mitglieder löschen.","error");
    return;
  }
  const m=state.members.find(x=>x.id===currentMemberId);
  if(!m)return toast("Kein Mitglied ausgewählt.","error");
  if(!confirm(`Mitglied ${m.firstName} ${m.lastName} wirklich löschen?`))return;
  state.members=state.members.filter(x=>x.id!==currentMemberId);
  logAction("Mitglieder","Mitglied gelöscht",m.firstName+" "+m.lastName);
  saveState();
  renderMembers();
  renderDashboard();
  renderSettings();
  resetMemberForm();
  toast("Mitglied erfolgreich gelöscht.","success");
}

function sortedMembers(){
  return [...state.members].sort((a,b)=>String(a.memberNo||"").localeCompare(String(b.memberNo||""),"de",{numeric:true,sensitivity:"base"}));
}

function navigateMember(position){
  if(!state.session.isLoggedIn) return false;
  const before=sortedMembers();
  if(!before.length){
    resetMemberForm();
    toast("Keine Mitglieder vorhanden.","info");
    return false;
  }

  const baseId=String(currentMemberId||"");
  let currentIndex=before.findIndex(m=>String(m.id)===baseId);
  if(currentIndex<0) currentIndex=0;

  let targetIndex=currentIndex;
  if(position==="first") targetIndex=0;
  else if(position==="last") targetIndex=before.length-1;
  else if(position==="next") targetIndex=Math.min(before.length-1,currentIndex+1);
  else if(position==="prev") targetIndex=Math.max(0,currentIndex-1);

  const plannedTargetId=String(before[targetIndex]?.id||"");
  if(!plannedTargetId) return false;

  if(memberIsDirty()){
    const save=confirm("Ungespeicherte Änderungen vorhanden.\n\nOK = speichern und weiterblättern\nAbbrechen = verwerfen und weiterblättern");
    if(save){
      const ok=saveMember();
      if(!ok) return false;
    }else{
      const original=before.find(m=>String(m.id)===baseId);
      if(original) memberToForm(original);
      markMemberClean();
      toast("Änderungen verworfen.","info");
    }
  }

  const after=sortedMembers();
  const target=after.find(m=>String(m.id)===plannedTargetId)
    || after[Math.min(after.length-1, targetIndex)]
    || null;
  if(target){
    memberToForm(target);
    markMemberClean();
    renderMembers();
    return true;
  }
  return false;
}


function memberSortValue(member,key){
  const status=memberStatus(member);
  const contact=String(member.mobile||member.phone||member.email||"").trim();
  const map={
    memberNo: member.memberNo||"",
    name: `${member.lastName||""}, ${member.firstName||""}`,
    status,
    city: member.city||"",
    profession: member.profession||"",
    contact,
    joinedAt: member.joinedAt||""
  };
  return map[key] ?? "";
}

function compareMemberRows(a,b){
  const key=memberSearchSort?.key||"memberNo";
  const dir=memberSearchSort?.dir==="desc" ? -1 : 1;
  const av=memberSortValue(a,key);
  const bv=memberSortValue(b,key);
  if(key==="joinedAt"){
    const ad=av ? new Date(av).getTime() : 0;
    const bd=bv ? new Date(bv).getTime() : 0;
    return (ad-bd)*dir || String(a.memberNo||"").localeCompare(String(b.memberNo||""),"de",{numeric:true});
  }
  return String(av).localeCompare(String(bv),"de",{numeric:true,sensitivity:"base"})*dir || String(a.memberNo||"").localeCompare(String(b.memberNo||""),"de",{numeric:true});
}

function setMemberSort(key){
  if(!key) return;
  if(memberSearchSort.key!==key){
    memberSearchSort={key,dir:"asc"};
  }else if(memberSearchSort.dir==="asc"){
    memberSearchSort.dir="desc";
  }else{
    memberSearchSort={key:"memberNo",dir:"asc"};
  }
  renderMembers();
}

function updateMemberSortIndicators(){
  document.querySelectorAll('[data-member-sort]').forEach(btn=>{
    const icon=btn.querySelector('.sort-indicator');
    const active=btn.dataset.memberSort===memberSearchSort.key;
    btn.classList.toggle('active-sort',active);
    if(icon) icon.textContent=active ? (memberSearchSort.dir==="asc" ? "▲" : "▼") : "↕";
    btn.title=active ? `Sortiert ${memberSearchSort.dir==="asc" ? "aufsteigend" : "absteigend"}` : "Sortieren";
  });
}

/* Eine Stelle für die Zeilenfarbe der Mitgliederliste. Vorher stand dieselbe Kette in drei
   Modulen, und die Ersatzdarstellung in js/14 hatte gar keine - dort war jede Zeile farblos,
   ein Gast also von einem aktiven Mitglied nicht zu unterscheiden. */
function memberRowClass(status){
  if(status==="Ausgeschieden") return "member-row-exited";
  if(status==="Passiv") return "member-row-passive";
  if(status==="Ehrenmitglied") return "member-row-honorary";
  if(status==="Gast") return "member-row-guest";
  if(status==="Aushilfe") return "member-row-temp";
  return "member-row-active";
}
window.memberRowClass=memberRowClass;

function renderMembers(){
  if(!state.session.isLoggedIn) return;
  const memberCountInfo=document.getElementById("memberCountInfo");
  if(memberCountInfo){
    const memberStats=getMemberStats();
    memberCountInfo.value=String(memberStats.total);
    setInputValue("memberCountActiveInfo",String(memberStats.active));
    setInputValue("memberCountPassiveInfo",String(memberStats.passive));
    setInputValue("memberCountExitedInfo",String(memberStats.exited));
    setInputValue("memberCountGuestInfo",String(memberStats.guests));
    setInputValue("memberCountPersonInfo",String(memberStats.persons));
    renderAgeStatistics();
  }
  const cardMembers=document.getElementById("cardMembers");
  if(cardMembers) cardMembers.textContent=String(getMemberCount());
  const q=(document.getElementById("memberSearch")?.value||"").toLowerCase();
  const body=document.getElementById("membersTable");
  if(!body)return;
  const visibleMembers=sortedMembers()
    .filter(m=>!q || `${m.memberNo} ${m.firstName} ${m.lastName} ${m.city} ${m.profession||""} ${m.email||""}`.toLowerCase().includes(q))
    .sort(compareMemberRows);
  updateMemberSortIndicators();
  body.innerHTML=visibleMembers
    .map(m=>{
      const status=memberStatus(m);
      const rowClasses=["clickable"];
      rowClasses.push(memberRowClass(status));
      if(!String(m.email||"").trim() || !String(m.birthDate||"").trim()) rowClasses.push("member-row-missing");
      const contact = String(m.mobile||m.phone||m.email||"").trim();
      const checked=selectedMemberIds.has(m.id) ? "checked" : "";
      const isCurrent=m.id===currentMemberId;
      if(isCurrent) rowClasses.push("member-row-current");
      return `
      <tr class="${rowClasses.join(" ")}" data-id="${m.id}">
        <td class="member-select-col"><input type="checkbox" class="member-row-select" data-id="${m.id}" ${checked}><span class="member-current-marker">${isCurrent?"▶":""}</span></td>
        <td>${escapeHtml(m.memberNo||"")}</td>
        <td>${escapeHtml((m.lastName||"") + ", " + (m.firstName||""))}</td>
        <td>${escapeHtml(status)}</td>
        <td class="member-extra member-extra-medium">${escapeHtml(m.city||"")}</td>
        <td class="member-extra member-extra-wide">${escapeHtml(m.profession||"")}</td>
        <td class="member-extra member-extra-wide">${escapeHtml(contact)}</td>
        <td class="member-extra member-extra-wide">${formatDate(m.joinedAt)||""}</td>
      </tr>`;
    }).join("");
  body.querySelectorAll("input.member-row-select").forEach(cb=>{
    cb.addEventListener("click",e=>{
      e.stopPropagation();
      if(cb.checked) selectedMemberIds.add(cb.dataset.id);
      else selectedMemberIds.delete(cb.dataset.id);
      updateMemberSelectAllState(visibleMembers);
    });
  });
  body.querySelectorAll("tr[data-id]").forEach(tr=>{
    tr.addEventListener("click",e=>{
      if(e.target.closest("input.member-row-select")) return;
      if(confirmLeaveMember()){
        const m=state.members.find(x=>x.id===tr.dataset.id);
        if(m)memberToForm(m);
      }
    });
  });
  updateMemberSelectAllState(visibleMembers);
  renderClaimsMembershipOverview();
}


function updateMemberSelectAllState(visibleMembers){
  const allBox=document.getElementById("memberSelectAllVisible");
  if(!allBox) return;
  const ids=(visibleMembers||[]).map(m=>m.id);
  const selectedCount=ids.filter(id=>selectedMemberIds.has(id)).length;
  allBox.indeterminate=selectedCount>0 && selectedCount<ids.length;
  allBox.checked=ids.length>0 && selectedCount===ids.length;
}

function getVisibleMemberIds(){
  const body=document.getElementById("membersTable");
  return Array.from(body?.querySelectorAll("tr[data-id]")||[]).map(tr=>tr.dataset.id);
}

function getSelectedMembers(){
  return sortedMembers().filter(m=>selectedMemberIds.has(m.id));
}

function requireSelectedMembers(){
  const selected=getSelectedMembers();
  if(!selected.length){
    toast("Bitte zuerst mindestens ein Mitglied auswählen.","warn");
    return [];
  }
  return selected;
}

function printSelectedMembersList(){
  const selected=requireSelectedMembers();
  if(!selected.length) return;
  const rows=selected.map(m=>`<tr><td>${escapeHtml(m.memberNo||"")}</td><td>${escapeHtml(m.lastName||"")}</td><td>${escapeHtml(m.firstName||"")}</td><td>${escapeHtml(m.street||"")}</td><td>${escapeHtml(m.postalCode||"")}</td><td>${escapeHtml(m.city||"")}</td><td>${escapeHtml(m.phone||"")}</td><td>${escapeHtml(m.mobile||"")}</td><td>${escapeHtml(m.email||"")}</td></tr>`).join("");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Mitgliederliste</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;font-size:11px}h2{margin:0 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px;text-align:left}th{background:#e9f2ea}</style></head><body><h2>Mitgliederliste – ${escapeHtml(state.settings.clubName||"Köcheclub")}</h2><table><thead><tr><th>Nr.</th><th>Name</th><th>Vorname</th><th>Straße</th><th>PLZ</th><th>Ort</th><th>Telefon</th><th>Mobil</th><th>E-Mail</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const win=window.open("","_blank");
  if(!win){ toast("Druckfenster konnte nicht geöffnet werden.","error"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),300);
}

function openMemberEmailDialog(){
  const selected=requireSelectedMembers();
  if(!selected.length) return;
  const mails=selected.map(m=>String(m.email||"").trim()).filter(Boolean);
  setInputValue("memberEmailRecipients",mails.join("; "));
  setInputValue("memberEmailSubject",`Nachricht vom ${state.settings.clubName||"Köcheclub"}`);
  setInputValue("memberEmailBody","");
  document.getElementById("memberEmailDialog")?.showModal();
}

function printMemberEmailText(){
  const recipients=settingValue("memberEmailRecipients");
  const subject=settingValue("memberEmailSubject");
  const body=settingValue("memberEmailBody");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>E-Mail-Text</title><style>body{font-family:Arial,sans-serif;margin:24px;line-height:1.35}.box{border:1px solid #aaa;padding:10px;margin-bottom:12px;white-space:pre-wrap}</style></head><body><h2>E-Mail an Mitglieder</h2><p><strong>Empfänger:</strong> ${escapeHtml(recipients)}</p><p><strong>Betreff:</strong> ${escapeHtml(subject)}</p><div class="box">${escapeHtml(body)}</div></body></html>`;
  const win=window.open("","_blank");
  if(!win){ toast("Druckfenster konnte nicht geöffnet werden.","error"); return; }
  win.document.write(html); win.document.close(); win.focus(); setTimeout(()=>win.print(),300);
}

function openMemberMailProgram(){
  const recipients=settingValue("memberEmailRecipients").replace(/;\s*/g,",");
  const subject=encodeURIComponent(settingValue("memberEmailSubject"));
  const body=encodeURIComponent(settingValue("memberEmailBody"));
  if(!recipients){ toast("Keine E-Mail-Adressen vorhanden.","warn"); return; }
  window.location.href=`mailto:${recipients}?subject=${subject}&body=${body}`;
}

function selectedMemberPhoneRows(){
  const selected=getSelectedMembers();
  return selected.map(m=>`<tr><td>${escapeHtml(m.memberNo||"")}</td><td>${escapeHtml(m.lastName||"")}</td><td>${escapeHtml(m.firstName||"")}</td><td>${escapeHtml(m.phone||"")}</td><td>${escapeHtml(m.mobile||"")}</td></tr>`).join("");
}

function showSelectedMemberPhones(){
  const selected=requireSelectedMembers();
  if(!selected.length) return;
  const html=`<table><thead><tr><th>Nr.</th><th>Name</th><th>Vorname</th><th>Telefon</th><th>Mobil</th></tr></thead><tbody>${selectedMemberPhoneRows()}</tbody></table>`;
  const box=document.getElementById("memberPhoneContent");
  if(box) box.innerHTML=html;
  document.getElementById("memberPhoneDialog")?.showModal();
}

function printSelectedMemberPhoneList(){
  const selected=requireSelectedMembers();
  if(!selected.length) return;
  const rows=selectedMemberPhoneRows();
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Telefonliste</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:Arial,sans-serif;font-size:12px}h2{margin:0 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px;text-align:left}th{background:#e9f2ea}</style></head><body><h2>Telefonliste – ${escapeHtml(state.settings.clubName||"Köcheclub")}</h2><table><thead><tr><th>Nr.</th><th>Name</th><th>Vorname</th><th>Telefon</th><th>Mobil</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const win=window.open("","_blank");
  if(!win){ toast("Druckfenster konnte nicht geöffnet werden.","error"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),300);
}

function selectedMemberAddressRows(){
  const selected=getSelectedMembers();
  return selected.map(m=>`<tr><td>${escapeHtml(m.memberNo||"")}</td><td>${escapeHtml(m.lastName||"")}</td><td>${escapeHtml(m.firstName||"")}</td><td>${escapeHtml(m.street||"")}</td><td>${escapeHtml(m.postalCode||"")}</td><td>${escapeHtml(m.city||"")}</td></tr>`).join("");
}

function showSelectedMemberAddresses(){
  const selected=requireSelectedMembers();
  if(!selected.length) return;
  const html=`<table><thead><tr><th>Nr.</th><th>Name</th><th>Vorname</th><th>Straße</th><th>PLZ</th><th>Ort</th></tr></thead><tbody>${selectedMemberAddressRows()}</tbody></table>`;
  const box=document.getElementById("memberAddressContent");
  if(box) box.innerHTML=html;
  document.getElementById("memberAddressDialog")?.showModal();
}

function printSelectedMemberAddressList(){
  const selected=requireSelectedMembers();
  if(!selected.length) return;
  const rows=selectedMemberAddressRows();
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Adressliste</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:Arial,sans-serif;font-size:12px}h2{margin:0 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px;text-align:left}th{background:#e9f2ea}</style></head><body><h2>Adressliste – ${escapeHtml(state.settings.clubName||"Köcheclub")}</h2><table><thead><tr><th>Nr.</th><th>Name</th><th>Vorname</th><th>Straße</th><th>PLZ</th><th>Ort</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const win=window.open("","_blank");
  if(!win){ toast("Druckfenster konnte nicht geöffnet werden.","error"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),300);
}

function yearsSince(dateStr){
  if(!dateStr)return "";
  const d=new Date(dateStr),n=new Date();
  if(isNaN(d))return "";
  let y=n.getFullYear()-d.getFullYear();
  if(n.getMonth()<d.getMonth() || (n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))y--;
  return Math.max(0,y);
}

function membershipDurationParts(member){
  const start=new Date(member?.joinedAt||"");
  if(isNaN(start)) return {days:"",months:"",years:""};
  const end=member?.exitDate ? new Date(member.exitDate) : new Date();
  if(isNaN(end) || end<start) return {days:"",months:"",years:""};
  const days=Math.floor((end-start)/(1000*60*60*24));
  let months=(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
  if(end.getDate()<start.getDate()) months--;
  months=Math.max(0,months);
  const years=Math.floor(months/12);
  return {days,months,years};
}

function renderClaimsMembershipOverview(){
  const body=document.getElementById("claimsMembershipOverviewBody");
  if(!body) return;
  body.innerHTML=sortedMembers().map(m=>{
    const d=membershipDurationParts(m);
    return `<tr>
      <td>${escapeHtml(m.memberNo||"")}</td>
      <td>${escapeHtml(m.lastName||"")}</td>
      <td>${escapeHtml(m.firstName||"")}</td>
      <td>${escapeHtml(memberStatus(m))}</td>
      <td>${formatDate(m.joinedAt)}</td>
      <td>${formatDate(m.exitDate)}</td>
      <td>${d.days===""?"":escapeHtml(String(d.days))}</td>
      <td>${d.months===""?"":escapeHtml(String(d.months))}</td>
      <td>${d.years===""?"":escapeHtml(String(d.years))}</td>
    </tr>`;
  }).join("");
}

function renderMemberDocumentsAndHistory(member){
  const docBody=document.getElementById("memberDocumentsTable");
  if(docBody){
    const docs=Array.isArray(member?.documents)?member.documents:[];
    docBody.innerHTML=docs.length?docs.map(d=>`<tr><td>${escapeHtml(d.name||"")}</td><td>${escapeHtml(d.type||"")}</td><td>${escapeHtml(d.date||"")}</td><td>${escapeHtml(d.note||"")}</td></tr>`).join(""):'<tr><td colspan="4" class="muted">Noch keine Dokumente hinterlegt.</td></tr>';
  }
  const histBody=document.getElementById("memberHistoryTable");
  if(histBody){
    const hist=Array.isArray(member?.history)?member.history:[];
    histBody.innerHTML=hist.length?hist.map(h=>`<tr><td>${escapeHtml(h.date||"")}</td><td>${escapeHtml(h.area||"")}</td><td>${escapeHtml(h.text||"")}</td><td>${escapeHtml(h.user||"")}</td></tr>`).join(""):'<tr><td colspan="4" class="muted">Noch keine Historieneinträge vorhanden.</td></tr>';
  }
}

function updateMemberDerived(){
  ageInfo.value=birthDate.value?yearsSince(birthDate.value)+" Jahre":"";
  memberYearsInfo.value=joinedAt.value?yearsSince(joinedAt.value)+" Jahre":"";
  const name=`${firstName.value||""} ${lastName.value||""}`.trim()||"--";
  activeMemberNameMore.textContent="Aktuelles Mitglied: "+name;
  activeMemberNameClaims.textContent="Aktuelles Mitglied: "+name;
  const skillName=document.getElementById("activeMemberNameSkills");
  if(skillName) skillName.textContent="Aktuelles Mitglied: "+name;
  const docName=document.getElementById("activeMemberNameDocuments");
  if(docName) docName.textContent="Aktuelles Mitglied: "+name;
  const histName=document.getElementById("activeMemberNameHistory");
  if(histName) histName.textContent="Aktuelles Mitglied: "+name;
}


function activeMembersForActivities(){
  return sortedMembers().filter(m=>memberStatus(m)!=="Ausgeschieden");
}



function autoSaveCurrentMemberFromForm(){
  const idx=state.members.findIndex(x=>String(x.id)===String(currentMemberId));
  if(idx<0) return false;
  const now=new Date().toISOString();
  const formMember=formToMember();
  const savedMember={
    ...state.members[idx],
    ...formMember,
    id:state.members[idx].id,
    createdAt:state.members[idx].createdAt || formMember.createdAt || now,
    updatedAt:now
  };
  state.members.splice(idx,1,savedMember);
  const saved=saveState();
  if(saved===false) return false;
  try{
    if(!memberWasPersisted(savedMember)){
      throw new Error('Gespeicherter Mitgliedsdatensatz stimmt nicht mit dem Formular überein.');
    }
  }catch(error){
    console.error(error);
    toast('Automatisches Speichern fehlgeschlagen. Bitte die Seite nicht neu laden.','error');
    return false;
  }
  markMemberClean();
  renderMembers();
  renderDashboard();
  return true;
}

// Phase 9.10.19: stabile globale Referenzen für spätere Kernmodule
try{
  window.navigateMember=navigateMember;
  window.memberIsDirty=memberIsDirty;
  window.saveMember=saveMember;
  window.autoSaveCurrentMemberFromForm=autoSaveCurrentMemberFromForm;
  window.memberToForm=memberToForm;
  window.markMemberClean=markMemberClean;
  window.sortedMembers=sortedMembers;
  window.getCurrentMember=function(){ return state.members.find(x=>x.id===currentMemberId) || null; };
}catch(_e){}
