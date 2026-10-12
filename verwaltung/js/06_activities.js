/* Aktivitäten und Ausflüge, Teilnehmer, Kosten, E-Mail-Anfrage */

function nextActivityNo(){
  const max=(state.activities||[]).reduce((n,a)=>Math.max(n,Number(a.activityNo||0)),0);
  return max+1;
}

function currentActivityId(){
  return document.getElementById("activityNo")?.dataset.id || "";
}

function formatCurrency(value){
  const n=Number(value||0);
  return n.toLocaleString("de-DE",{style:"currency",currency:"EUR"});
}

function activityDateText(a){
  const from=a.dateFrom?new Date(a.dateFrom).toLocaleDateString("de-DE"):"--";
  const to=a.dateTo?new Date(a.dateTo).toLocaleDateString("de-DE"):"";
  return to && to!==from ? `${from} - ${to}` : from;
}

function activityDaysBetween(from,to){
  if(!from) return "";
  const d1=new Date(from);
  const d2=to?new Date(to):new Date(from);
  if(isNaN(d1)||isNaN(d2)) return "";
  const diff=Math.round((d2-d1)/86400000)+1;
  return diff>0 ? diff : "";
}

function updateActivityDays(){
  const out=document.getElementById("activityDays");
  if(out) out.value=activityDaysBetween(document.getElementById("activityDateFrom")?.value||"",document.getElementById("activityDateTo")?.value||"");
}

function currentActivityStatus(){
  if(document.getElementById("activityStatusDone")?.checked) return "stattgefunden";
  if(document.getElementById("activityStatusPlanned")?.checked) return "geplant";
  return "offen";
}

function setActivityStatus(status){
  const normalized=["offen","geplant","stattgefunden"].includes(status)?status:"offen";
  document.querySelectorAll(".activity-status-check").forEach(cb=>cb.checked=cb.dataset.status===normalized);
}

function activityParticipantsFromTable(){
  const rows=[];
  document.querySelectorAll(".activity-participant-check:checked,.activity-confirmed-check:checked").forEach(cb=>{
    const memberId=cb.dataset.memberId;
    if(!rows.some(x=>x.memberId===memberId)){
      const part=document.querySelector(`.activity-participant-check[data-member-id="${CSS.escape(memberId)}"]`);
      const conf=document.querySelector(`.activity-confirmed-check[data-member-id="${CSS.escape(memberId)}"]`);
      rows.push({
        memberId,
        overrideNoClaim:part?.dataset.overrideNoClaim==="true",
        confirmed:!!conf?.checked
      });
    }
  });
  return rows;
}

function selectedActivityParticipantIds(){
  return activityParticipantsFromTable().map(p=>p.memberId);
}

function updateActivityTotal(){
  const baseCost=Number(document.getElementById("activityCostPerPerson")?.value||0);
  const extraCost=Number(document.getElementById("activityExtraCostPerPerson")?.value||0);
  const count=selectedActivityParticipantIds().length;
  const total=document.getElementById("activityTotalCost");
  if(total) total.value=formatCurrency((baseCost+extraCost)*count);
}

function updateActivityBookingFields(){
  const type=document.getElementById("activityBookingType")?.value||"";
  const isAgency=type==="Reisebüro";
  ["activityTravelAgencyLabel","activityTravelAgencyContactLabel","activityTravelAgencyPhoneLabel"].forEach(id=>{
    const label=document.getElementById(id);
    if(label) label.classList.toggle("hidden", !isAgency);
  });
  if(!isAgency){
    setInputValue("activityTravelAgency","");
    setInputValue("activityTravelAgencyContact","");
    setInputValue("activityTravelAgencyPhone","");
  }
}

function renderActivityParticipants(selectedIds=[],overrideIds=[],confirmedIds=[]){
  const body=document.getElementById("activityParticipantsTable");
  if(!body) return;
  const ids=new Set(selectedIds||[]);
  const overrides=new Set(overrideIds||[]);
  const confirmed=new Set(confirmedIds||[]);
  const rows=activeMembersForActivities();
  body.innerHTML=rows.length ? rows.map(m=>{
    const eligibility=checkMemberClaimEligibility(m,"trips",new Date(document.getElementById("activityDateFrom")?.value||new Date()));
    const checked=ids.has(m.id);
    const override=overrides.has(m.id);
    const agreed=confirmed.has(m.id);
    let statusText="keine Prüfung";
    if(eligibility.required){
      statusText = eligibility.eligible
        ? `Ja (${eligibility.months}/${eligibility.minMonths} Monate)`
        : (eligibility.reason==="claimMissing" ? "Nein (Anspruch nicht gesetzt)" : `Nein (${eligibility.months}/${eligibility.minMonths} Monate)`);
    }
    const statusClass=eligibility.required && !eligibility.eligible ? "claim-no" : "claim-ok";
    return `<tr class="${eligibility.required && !eligibility.eligible ? 'activity-no-claim' : ''}">
      <td><input class="activity-participant-check" type="checkbox" data-member-id="${escapeHtml(m.id)}" data-override-no-claim="${override?'true':'false'}" ${checked?'checked':''}></td>
      <td><input class="activity-confirmed-check" type="checkbox" data-member-id="${escapeHtml(m.id)}" ${agreed?'checked':''}></td>
      <td>${escapeHtml((m.lastName||"") + ", " + (m.firstName||""))}</td>
      <td>${escapeHtml(m.city||"")}</td>
      <td>${membershipMonths(m,new Date())} Monate</td>
      <td class="${statusClass}">${escapeHtml(statusText)}${override?' – trotzdem eingeplant':''}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="muted">Keine aktiven Mitglieder vorhanden.</td></tr>`;
  body.querySelectorAll(".activity-participant-check").forEach(cb=>cb.addEventListener("change",()=>{
    syncActivityToggleAll();
    updateActivityTotal();
  }));
  body.querySelectorAll(".activity-confirmed-check").forEach(cb=>cb.addEventListener("change",()=>{
    if(cb.checked){
      const part=document.querySelector(`.activity-participant-check[data-member-id="${CSS.escape(cb.dataset.memberId)}"]`);
      if(part) part.checked=true;
    }
    syncActivityToggleAll();
    syncActivityConfirmedToggleAll();
    updateActivityTotal();
  }));
  syncActivityToggleAll();
  syncActivityConfirmedToggleAll();
  updateActivityTotal();
}

function syncActivityToggleAll(){
  const master=document.getElementById("activityToggleAllMembers");
  if(!master) return;
  const checks=Array.from(document.querySelectorAll(".activity-participant-check"));
  master.checked=checks.length>0 && checks.every(cb=>cb.checked);
  master.indeterminate=checks.some(cb=>cb.checked) && !master.checked;
}

function syncActivityConfirmedToggleAll(){
  const master=document.getElementById("activityToggleAllConfirmed");
  if(!master) return;
  const checks=Array.from(document.querySelectorAll(".activity-confirmed-check"));
  master.checked=checks.length>0 && checks.every(cb=>cb.checked);
  master.indeterminate=checks.some(cb=>cb.checked) && !master.checked;
}

function resetActivityForm(){
  const no=document.getElementById("activityNo");
  if(no){ no.value=String(nextActivityNo()); no.dataset.id=""; }
  ["activityDateFrom","activityDateTo","activityName","activityOrganizer","activityTravelAgency","activityTravelAgencyContact","activityTravelAgencyPhone","activityCostPerPerson","activityExtraCostPerPerson","activityDescription","activityRemarks"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value=(id==="activityCostPerPerson"||id==="activityExtraCostPerPerson")?"0":"";
  });
  const mobility=document.getElementById("activityMobility"); if(mobility) mobility.value="";
  const booking=document.getElementById("activityBookingType"); if(booking) booking.value="selber organisiert";
  updateActivityBookingFields();
  setActivityStatus("offen");
  updateActivityDays();
  renderActivityParticipants([],[],[]);
  updateActivityTotal();
}

function activityFromForm(){
  return {
    id: currentActivityId() || crypto.randomUUID(),
    activityNo:Number(document.getElementById("activityNo")?.value||nextActivityNo()),
    dateFrom:document.getElementById("activityDateFrom")?.value||"",
    dateTo:document.getElementById("activityDateTo")?.value||"",
    activity:document.getElementById("activityName")?.value||"",
    organizer:document.getElementById("activityOrganizer")?.value||"",
    mobility:document.getElementById("activityMobility")?.value||"",
    bookingType:document.getElementById("activityBookingType")?.value||"",
    travelAgency:document.getElementById("activityTravelAgency")?.value||"",
    travelAgencyContact:document.getElementById("activityTravelAgencyContact")?.value||"",
    travelAgencyPhone:document.getElementById("activityTravelAgencyPhone")?.value||"",
    costPerPerson:Number(document.getElementById("activityCostPerPerson")?.value||0),
    extraCostPerPerson:Number(document.getElementById("activityExtraCostPerPerson")?.value||0),
    description:document.getElementById("activityDescription")?.value||"",
    remarks:document.getElementById("activityRemarks")?.value||"",
    status:currentActivityStatus(),
    tookPlace:currentActivityStatus()==="stattgefunden",
    participants:activityParticipantsFromTable(),
    updatedAt:new Date().toISOString()
  };
}

function activityToForm(a){
  if(!a) return resetActivityForm();
  const no=document.getElementById("activityNo"); if(no){no.value=String(a.activityNo||""); no.dataset.id=a.id||"";}
  setInputValue("activityDateFrom",a.dateFrom||"");
  setInputValue("activityDateTo",a.dateTo||"");
  setInputValue("activityName",a.activity||"");
  setInputValue("activityOrganizer",a.organizer||"");
  setInputValue("activityMobility",a.mobility||"");
  setInputValue("activityBookingType",a.bookingType||"selber organisiert");
  setInputValue("activityTravelAgency",a.travelAgency||"");
  setInputValue("activityTravelAgencyContact",a.travelAgencyContact||"");
  setInputValue("activityTravelAgencyPhone",a.travelAgencyPhone||"");
  updateActivityBookingFields();
  setInputValue("activityCostPerPerson",String(a.costPerPerson||0));
  setInputValue("activityExtraCostPerPerson",String(a.extraCostPerPerson||0));
  setInputValue("activityDescription",a.description||"");
  setInputValue("activityRemarks",a.remarks||"");
  setActivityStatus(a.status || (a.tookPlace ? "stattgefunden" : "offen"));
  updateActivityDays();
  const parts=Array.isArray(a.participants)?a.participants:[];
  renderActivityParticipants(parts.map(p=>p.memberId), parts.filter(p=>p.overrideNoClaim).map(p=>p.memberId), parts.filter(p=>p.confirmed).map(p=>p.memberId));
  showActivityTab("activityFormTab");
}

function validateActivityClaims(activity){
  const asOf=new Date(activity.dateFrom || new Date());
  const selected=activity.participants||[];
  const notEligible=[];
  selected.forEach(p=>{
    const m=state.members.find(x=>x.id===p.memberId);
    if(!m) return;
    const eligibility=checkMemberClaimEligibility(m,"trips",asOf);
    if(eligibility.required && !eligibility.eligible && !p.overrideNoClaim){
      notEligible.push({member:m,months:eligibility.months,minMonths:eligibility.minMonths,reason:eligibility.reason});
    }
  });
  if(!notEligible.length) return true;
  alert("Bei folgenden Mitgliedern besteht kein Anspruch:\n\n" + notEligible.map(x=>{
    const name=`${x.member.firstName||""} ${x.member.lastName||""}`.trim();
    return x.reason==="claimMissing" ? `${name}: Anspruch Ausflüge nicht gesetzt` : `${name}: ${x.months}/${x.minMonths} Monate Zugehörigkeit`;
  }).join("\n"));
  notEligible.forEach(x=>{
    const reasonText=x.reason==="claimMissing" ? "der Anspruch Ausflüge nicht gesetzt ist" : `nur ${x.months} von ${x.minMonths} Monaten Zugehörigkeit erfüllt sind`;
    const ok=confirm(`${x.member.firstName||""} ${x.member.lastName||""} hat keinen Anspruch, weil ${reasonText}. Trotzdem teilnehmen lassen?`);
    const row=activity.participants.find(p=>p.memberId===x.member.id);
    if(row) row.overrideNoClaim=ok;
    if(!ok) activity.participants=activity.participants.filter(p=>p.memberId!==x.member.id);
  });
  return true;
}

function saveActivity(){
  const data=activityFromForm();
  if(!data.activity.trim()){toast("Bitte Aktivität eintragen.","error");return;}
  if(!data.dateFrom){toast("Bitte Datum von eintragen.","error");return;}
  if(!validateActivityClaims(data)) return;
  const idx=(state.activities||[]).findIndex(a=>a.id===data.id);
  if(idx>=0) state.activities[idx]=data; else state.activities.push(data);
  saveState();
  renderActivities();
  activityToForm(data);
  logAction("Aktivitäten / Ausflüge",idx>=0?"Ausflug geändert":"Ausflug angelegt",data.activity);
  toast("Ausflug erfolgreich gespeichert.","success");
}

function deleteActivity(){
  const id=currentActivityId();
  if(!id){toast("Kein Ausflug ausgewählt.","info");return;}
  if(!isAdminLike()){toast("Nur Admin/Systeminhaber darf Ausflüge löschen.","error");return;}
  if(!confirm("Ausflug wirklich löschen?")) return;
  const old=state.activities.find(a=>a.id===id);
  state.activities=state.activities.filter(a=>a.id!==id);
  saveState();
  resetActivityForm();
  renderActivities();
  logAction("Aktivitäten / Ausflüge","Ausflug gelöscht",old?.activity||"");
  toast("Ausflug gelöscht.","success");
}

function renderActivities(){
  if(!state.session.isLoggedIn) return;
  state.activities=Array.isArray(state.activities)?state.activities:[];
  fillSelect("activityMobility",state.combos.mobility||DEFAULT_STATE.combos.mobility,document.getElementById("activityMobility")?.value||"");
  fillSelect("activityBookingType",state.combos.bookingType||DEFAULT_STATE.combos.bookingType,document.getElementById("activityBookingType")?.value||"selber organisiert");
  updateActivityBookingFields();
  if(!document.getElementById("activityNo")?.value) resetActivityForm();
  renderActivityList();
}

function renderActivityList(){
  const body=document.getElementById("activitiesTable");
  if(!body) return;
  const from=document.getElementById("activityFilterDateFrom")?.value||"";
  const to=document.getElementById("activityFilterDateTo")?.value||"";
  const name=(document.getElementById("activityFilterName")?.value||"").toLowerCase();
  const org=(document.getElementById("activityFilterOrganizer")?.value||"").toLowerCase();
  const status=document.getElementById("activityFilterStatus")?.value||"";
  const rows=[...(state.activities||[])].sort((a,b)=>Number(a.activityNo||0)-Number(b.activityNo||0)).filter(a=>{
    if(from && (a.dateFrom||"")<from) return false;
    if(to && (a.dateFrom||"")>to) return false;
    if(name && !String(a.activity||"").toLowerCase().includes(name)) return false;
    if(org && !String(a.organizer||"").toLowerCase().includes(org)) return false;
    if(status && (a.status || (a.tookPlace ? "stattgefunden" : "offen"))!==status) return false;
    return true;
  });
  body.innerHTML=rows.length?rows.map(a=>{
    const count=(a.participants||[]).length;
    const confirmed=(a.participants||[]).filter(p=>p.confirmed).length;
    const baseTotal=Number(a.costPerPerson||0)*count;
    const extraTotal=Number(a.extraCostPerPerson||0)*count;
    const total=baseTotal+extraTotal;
    const status=a.status || (a.tookPlace ? "stattgefunden" : "offen");
    return `<tr class="clickable" data-id="${escapeHtml(a.id)}"><td>${a.activityNo||""}</td><td>${escapeHtml(activityDateText(a))}</td><td>${escapeHtml(String(activityDaysBetween(a.dateFrom,a.dateTo)||""))}</td><td>${escapeHtml(a.activity||"")}</td><td>${escapeHtml(a.organizer||"")}</td><td>${escapeHtml(a.mobility||"")}</td><td>${escapeHtml(a.bookingType==="Reisebüro" && a.travelAgency ? "Reisebüro: "+a.travelAgency+(a.travelAgencyContact?" / "+a.travelAgencyContact:"") : (a.bookingType||""))}</td><td>${escapeHtml(status)}</td><td>${count}</td><td>${confirmed}</td><td>${formatCurrency(baseTotal)}</td><td>${formatCurrency(extraTotal)}</td><td>${formatCurrency(total)}</td></tr>`;
  }).join(""):`<tr><td colspan="13" class="muted">Noch keine Ausflüge erfasst.</td></tr>`;
  body.querySelectorAll("tr[data-id]").forEach(tr=>tr.addEventListener("dblclick",()=>{
    const a=state.activities.find(x=>x.id===tr.dataset.id);
    if(a) activityToForm(a);
  }));
}

function showActivityTab(id){
  document.querySelectorAll("[data-activity-tab]").forEach(b=>b.classList.toggle("active",b.dataset.activityTab===id));
  document.querySelectorAll(".activity-tab-panel").forEach(p=>p.classList.toggle("active",p.id===id));
}


function transferActivityCostsToFinance(){
  const id=currentActivityId();
  if(!id){toast("Bitte den Ausflug zuerst speichern, bevor die Kosten übertragen werden.","error");return;}
  const activity=activityFromForm();
  const participants=Array.isArray(activity.participants)?activity.participants:[];
  const count=participants.length;
  const baseAmount=Number(activity.costPerPerson||0)*count;
  const extraAmount=Number(activity.extraCostPerPerson||0)*count;
  const totalAmount=baseAmount+extraAmount;
  if(!totalAmount){
    if(!confirm("Die Gesamtkosten sind 0,00 €. Trotzdem in die Finanzplanung übertragen?")) return;
  }
  const date=activity.dateFrom || new Date().toISOString().slice(0,10);
  const year=(date||"").slice(0,4) || String(new Date().getFullYear());
  state.finance=Array.isArray(state.finance)?state.finance:[];
  const existing=state.finance.filter(x=>x.sourceModule==="activities" && x.sourceId===id);
  if(existing.length && !confirm("Für diesen Ausflug gibt es bereits Einträge in der Finanzplanung. Aktualisieren?")) return;
  state.finance=state.finance.filter(x=>!(x.sourceModule==="activities" && x.sourceId===id));
  const common={date,year,type:"Ausgabe",kind:"Ausgabe",sourceModule:"activities",sourceId:id,participants:count,updatedAt:new Date().toISOString()};
  const entries=[];
  entries.push({
    ...common,
    id:crypto.randomUUID(),
    category:"Ausflugskosten",
    amount:baseAmount,
    value:baseAmount,
    description:`Ausflugskosten ${activity.activity || activity.activityNo || ""}`.trim()
  });
  if(extraAmount>0){
    entries.push({
      ...common,
      id:crypto.randomUUID(),
      category:"Zusatzkosten",
      amount:extraAmount,
      value:extraAmount,
      description:`Zusatzkosten ${activity.activity || activity.activityNo || ""}`.trim()
    });
  }
  state.finance.unshift(...entries);
  saveState();
  renderDashboard();
  logAction("Aktivitäten / Ausflüge","Kosten in Finanzplanung übertragen",`${activity.activity || activity.activityNo || ""}: Ausflug ${formatCurrency(baseAmount)}, Zusatz ${formatCurrency(extraAmount)}, Gesamt ${formatCurrency(totalAmount)} (${year})`);
  toast("Ausflugs- und Zusatzkosten wurden getrennt in die Finanzplanung übertragen.","success");
}

function buildActivityEmailBody(){
  const activity=activityFromForm();
  const days=activityDaysBetween(activity.dateFrom,activity.dateTo);
  return [
    "Liebe Mitglieder,",
    "",
    `wir planen folgende Aktivität: ${activity.activity || "[Aktivität]"}`,
    `Datum: ${activityDateText(activity)}`,
    days ? `Dauer: ${days} Tag(e)` : "",
    activity.organizer ? `Veranstalter: ${activity.organizer}` : "",
    activity.mobility ? `Mobilität: ${activity.mobility}` : "",
    activity.bookingType ? `Gebucht/organisiert über: ${activity.bookingType}${activity.bookingType==="Reisebüro" && activity.travelAgency ? " ("+activity.travelAgency+")" : ""}` : "",
    activity.bookingType==="Reisebüro" && activity.travelAgencyContact ? `Ansprechpartner Reisebüro: ${activity.travelAgencyContact}` : "",
    activity.bookingType==="Reisebüro" && activity.travelAgencyPhone ? `Telefon Reisebüro: ${activity.travelAgencyPhone}` : "",
    activity.description ? `Beschreibung: ${activity.description}` : "",
    activity.costPerPerson ? `Ausflugskosten pro Person: ${formatCurrency(activity.costPerPerson)}` : "",
    activity.extraCostPerPerson ? `Zusatzkosten pro Person: ${formatCurrency(activity.extraCostPerPerson)}` : "",
    "",
    "Bitte gib kurz Rückmeldung, ob du teilnehmen möchtest.",
    "",
    "Viele Grüße",
    state.session.userName || state.settings.clubName || "Köcheclub"
  ].filter(Boolean).join("\n");
}

function createActivityEmailRequest(){
  const emails=activeMembersForActivities().map(m=>String(m.email||"").trim()).filter(Boolean);
  if(!emails.length){toast("Keine E-Mail-Adressen bei aktiven Mitgliedern gefunden.","error");return;}
  const subject=`Anfrage Aktivität/Ausflug: ${document.getElementById("activityName")?.value || state.settings.clubName || "Köcheclub"}`;
  const body=buildActivityEmailBody();
  const url=`mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href=url;
  logAction("Aktivitäten / Ausflüge","E-Mail-Anfrage erstellt",subject);
  toast("E-Mail-Anfrage wurde an das Mailprogramm übergeben.","success");
}

function bindActivities(){
  document.querySelectorAll("[data-activity-tab]").forEach(btn=>btn.addEventListener("click",()=>showActivityTab(btn.dataset.activityTab)));
  document.getElementById("newActivity")?.addEventListener("click",resetActivityForm);
  document.getElementById("saveActivity")?.addEventListener("click",saveActivity);
  document.getElementById("deleteActivity")?.addEventListener("click",deleteActivity);
  document.getElementById("printActivity")?.addEventListener("click",()=>window.print());
  document.getElementById("transferActivityFinance")?.addEventListener("click",transferActivityCostsToFinance);
  document.getElementById("activityCostPerPerson")?.addEventListener("input",updateActivityTotal);
  document.getElementById("activityExtraCostPerPerson")?.addEventListener("input",updateActivityTotal);
  document.getElementById("activityBookingType")?.addEventListener("change",updateActivityBookingFields);
  ["activityDateFrom","activityDateTo"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>{
    updateActivityDays();
    const selected=selectedActivityParticipantIds();
    const parts=activityParticipantsFromTable();
    const overrides=parts.filter(p=>p.overrideNoClaim).map(p=>p.memberId);
    const confirmed=parts.filter(p=>p.confirmed).map(p=>p.memberId);
    renderActivityParticipants(selected,overrides,confirmed);
  }));
  document.querySelectorAll(".activity-status-check").forEach(cb=>cb.addEventListener("change",()=>{
    if(cb.checked) setActivityStatus(cb.dataset.status);
    if(!document.querySelector(".activity-status-check:checked")) setActivityStatus("offen");
  }));
  document.getElementById("activityToggleAllMembers")?.addEventListener("change",e=>{
    document.querySelectorAll(".activity-participant-check").forEach(cb=>cb.checked=e.target.checked);
    syncActivityToggleAll();
    updateActivityTotal();
  });
  document.getElementById("activityToggleAllConfirmed")?.addEventListener("change",e=>{
    document.querySelectorAll(".activity-confirmed-check").forEach(cb=>{
      cb.checked=e.target.checked;
      if(e.target.checked){
        const part=document.querySelector(`.activity-participant-check[data-member-id="${CSS.escape(cb.dataset.memberId)}"]`);
        if(part) part.checked=true;
      }
    });
    syncActivityToggleAll();
    syncActivityConfirmedToggleAll();
    updateActivityTotal();
  });
  ["activityFilterDateFrom","activityFilterDateTo","activityFilterName","activityFilterOrganizer","activityFilterStatus"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input",renderActivityList);
    document.getElementById(id)?.addEventListener("change",renderActivityList);
  });
  document.getElementById("resetActivityFilters")?.addEventListener("click",()=>{
    ["activityFilterDateFrom","activityFilterDateTo","activityFilterName","activityFilterOrganizer"].forEach(id=>setInputValue(id,""));
    setInputValue("activityFilterStatus","");
    renderActivityList();
  });
  renderActivities();
  updateStatusBar();
}

function bindMembers(){
  if(window.__KNG_BIND_MEMBERS_DONE__) return;
  window.__KNG_BIND_MEMBERS_DONE__ = true;
  initMemberCombos();
  document.querySelectorAll("[data-member-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("[data-member-tab]").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".member-tab").forEach(t=>t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.memberTab).classList.add("active");
    });
  });
  const memberFormEl=document.getElementById("memberForm");
  memberFormEl.addEventListener("submit",e=>{e.preventDefault();saveMember();});
  memberFormEl.addEventListener("change",e=>{
    const field=e.target;
    if(!field?.matches?.('input,select,textarea')) return;
    const existing=state.members.some(x=>String(x.id)===String(currentMemberId));
    if(!existing || typeof autoSaveCurrentMemberFromForm!=='function') return;
    const ok=autoSaveCurrentMemberFromForm();
    if(ok && field.id==='profession') toast('Beruf automatisch und dauerhaft gespeichert.','success');
  });
  document.getElementById("newMember").addEventListener("click",clearMemberForm);
  document.getElementById("deleteMember").addEventListener("click",handleDeleteMember);
  document.getElementById("printMember").addEventListener("click",()=>window.print());
  document.getElementById("firstMember")?.addEventListener("click",()=>navigateMember("first"));
  document.getElementById("prevMember")?.addEventListener("click",()=>navigateMember("prev"));
  document.getElementById("nextMember")?.addEventListener("click",()=>navigateMember("next"));
  document.getElementById("lastMember")?.addEventListener("click",()=>navigateMember("last"));
  document.getElementById("memberSearch").addEventListener("input",renderMembers);
  document.querySelectorAll("[data-member-sort]").forEach(btn=>{
    btn.addEventListener("click",()=>setMemberSort(btn.dataset.memberSort));
  });
  document.getElementById("memberSelectAllVisible")?.addEventListener("change",e=>{
    const ids=getVisibleMemberIds();
    ids.forEach(id=>{ if(e.target.checked) selectedMemberIds.add(id); else selectedMemberIds.delete(id); });
    renderMembers();
  });
  document.getElementById("memberPrintSelected")?.addEventListener("click",printSelectedMembersList);
  document.getElementById("memberEmailSelected")?.addEventListener("click",openMemberEmailDialog);
  document.getElementById("memberPhoneSelected")?.addEventListener("click",showSelectedMemberPhones);
  document.getElementById("memberAddressSelected")?.addEventListener("click",showSelectedMemberAddresses);
  document.getElementById("printMemberPhoneList")?.addEventListener("click",printSelectedMemberPhoneList);
  document.getElementById("printMemberAddressList")?.addEventListener("click",printSelectedMemberAddressList);
  document.getElementById("printMemberEmailText")?.addEventListener("click",printMemberEmailText);
  document.getElementById("openMemberMailProgram")?.addEventListener("click",openMemberMailProgram);
  document.getElementById("claimToggleAll")?.addEventListener("change",e=>setAllClaims(e.target.checked));
  document.querySelectorAll(".claim-check").forEach(cb=>cb.addEventListener("change",syncClaimToggleAll));
  ["birthDate","joinedAt","firstName","lastName"].forEach(id=>document.getElementById(id).addEventListener("input",updateMemberDerived));
  ["exitDate","exitReason","memberType"].forEach(id=>document.getElementById(id)?.addEventListener("input",markExitFields));
  ["exitDate","exitReason","memberType"].forEach(id=>document.getElementById(id)?.addEventListener("change",markExitFields));
  // Navigation-Schutz für ungespeicherte Mitglieder läuft zentral über showView().
  renderMembers();
  if(state.members.length) memberToForm(state.members[0]);
  else resetMemberForm();
}


function ensureRoleAssignments(){
  if(!Array.isArray(state.roleAssignments)) state.roleAssignments=[];
  const existingByMember=new Set(state.roleAssignments.map(a=>a.memberId).filter(Boolean));
  state.members.forEach(m=>{
    if(!m.id || existingByMember.has(m.id)) return;
    const defaultUser=(m.email||m.memberNo||`${m.firstName||""}.${m.lastName||""}`).trim().replace(/\s+/g,".").toLowerCase();
    const owner=String(state.settings.systemOwnerEmail||"").trim().toLowerCase();
    const roles=owner && String(defaultUser).toLowerCase()===owner ? ["Systeminhaber","Admin","Mitglied"] : ["Mitglied"];
    state.roleAssignments.push({
      memberId:m.id,
      userName:defaultUser,
      password:"",
      roles,
      messageLevel:3,
      lastLoginAt:"",
      passwordChangedAt:"",
      passwordResetAt:"",
      active:true,
      assistantEnabled:true
    });
  });
  const owner=String(state.settings.systemOwnerEmail||"").trim().toLowerCase();
  state.roleAssignments.forEach(a=>{
    if(!a.messageLevel) a.messageLevel=3;
    if(typeof a.assistantEnabled!=="boolean") a.assistantEnabled=true;
    if(typeof a.lastLoginAt!=="string") a.lastLoginAt="";
    if(typeof a.passwordChangedAt!=="string") a.passwordChangedAt="";
    if(typeof a.passwordResetAt!=="string") a.passwordResetAt="";
    if(owner && String(a.userName||"").trim().toLowerCase()===owner){
      a.roles=Array.isArray(a.roles)?a.roles:[];
      if(!a.roles.includes("Systeminhaber")) a.roles.unshift("Systeminhaber");
      if(!a.roles.includes("Admin")) a.roles.push("Admin");
      a.active=true;
    }
  });
}


function getCurrentAccount(){
  const key=String(state.session.userKey||state.session.userName||"").trim().toLowerCase();
  return (state.roleAssignments||[]).find(a=>String(a.userName||"").trim().toLowerCase()===key) || null;
}

