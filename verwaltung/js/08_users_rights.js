/* Benutzer, Rollen, Rechte, Startseiten */
function renderUsersRights(){
  if(!state.session.isLoggedIn) return;
  renderRoles();
  renderMemberRoleAssignments();
}

function renderMemberRoleAssignments(){
  ensureRoleAssignments();
  const body=document.getElementById("memberRolesTable");
  if(!body) return;
  const roleNames=getVisibleRoleNames();
  const assignmentsByMember=new Map(state.roleAssignments.map(a=>[a.memberId,a]));
  body.innerHTML=sortedMembers().map(m=>{
    const a=assignmentsByMember.get(m.id) || {memberId:m.id,userName:"",password:"",roles:["Mitglied"],messageLevel:3,active:true};
    const name=`${m.lastName||""}, ${m.firstName||""}`.replace(/^, /,"");
    const ownerProtected=accountIsOwner(a);
    const activeChecked=ownerProtected || a.active!==false;
    return `<tr data-member-id="${escapeHtml(m.id)}" class="${ownerProtected?"owner-protected-row":""}">
      <td>${escapeHtml(m.memberNo||"")}</td>
      <td>${escapeHtml(name)}${ownerProtected?` <span class="small-muted">geschützt</span>`:""}</td>
      <td><input class="role-user-name" value="${escapeHtml(a.userName||"")}" placeholder="E-Mail-Adresse" ${ownerProtected?"readonly":""}></td>
      <td><span class="password-status ${hasPassword(a)?"ok":"missing"}">${hasPassword(a)?"vorhanden":"nicht vergeben"}</span><button class="secondary small reset-user-password" type="button" data-member-id="${escapeHtml(m.id)}">Zurücksetzen</button></td>
      <td><select class="role-message-level">${[1,2,3].map(level=>`<option value="${level}" ${Number(a.messageLevel||3)===level?"selected":""}>${messageLevelLabel(level)}</option>`).join("")}</select></td>
      <td><input type="checkbox" class="role-assistant-enabled" ${a.assistantEnabled!==false?"checked":""} ${ownerProtected?"disabled":""}></td>
      <td class="role-checks">${roleNames.map(role=>`<label class="inline-check"><input type="checkbox" class="role-assignment-check" value="${escapeHtml(role)}" ${(a.roles||[]).includes(role)?"checked":""} ${ownerProtected && role==="Admin"?"checked disabled":""}> ${escapeHtml(role)}</label>`).join("")}</td>
      <td>${escapeHtml(formatDateTime(a.lastLoginAt))}</td>
      <td>${escapeHtml(formatDateTime(a.passwordChangedAt))}</td>
      <td><input type="checkbox" class="role-user-active" ${activeChecked?"checked":""} ${ownerProtected?"disabled":""}></td>
    </tr>`;
  }).join("");
}

function saveMemberRoleAssignments(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Rollen zuordnen.","error");
    return false;
  }
  const rows=[...document.querySelectorAll("#memberRolesTable tr[data-member-id]")];
  const seen=new Set();
  const next=[];
  for(const row of rows){
    const memberId=row.dataset.memberId;
    const userName=row.querySelector(".role-user-name")?.value.trim() || "";
    const oldAccount=(state.roleAssignments||[]).find(a=>a.memberId===memberId) || {};
    const password=oldAccount.password || "";
    const passwordChangedAt=oldAccount.passwordChangedAt || "";
    const passwordResetAt=oldAccount.passwordResetAt || "";
    const lastLoginAt=oldAccount.lastLoginAt || "";
    const roles=[...row.querySelectorAll(".role-assignment-check:checked")].map(cb=>cb.value);
    const messageLevel=Number(row.querySelector(".role-message-level")?.value || oldAccount.messageLevel || 3);
    const active=!!row.querySelector(".role-user-active")?.checked;
    const assistantEnabled=!!row.querySelector(".role-assistant-enabled")?.checked;
    if(userName){
      const key=userName.toLowerCase();
      if(seen.has(key)){
        toast(`Benutzername doppelt: ${userName}`,"error");
        return false;
      }
      seen.add(key);
    }
    const owner=getOwnerEmail();
    const isOwner=owner && userName.toLowerCase()===owner;
    let finalRoles=roles.filter(r=>r!=="Systeminhaber");
    if(!finalRoles.length) finalRoles=["Mitglied"];
    if(isOwner){
      if(!finalRoles.includes("Admin")) finalRoles.push("Admin");
      finalRoles=["Systeminhaber",...finalRoles.filter(r=>r!=="Systeminhaber")];
    }
    next.push({memberId,userName,password,passwordChangedAt,passwordResetAt,lastLoginAt,messageLevel:[1,2,3].includes(messageLevel)?messageLevel:3,roles:finalRoles,active:isOwner?true:active,assistantEnabled:isOwner?true:assistantEnabled});
  }
  state.roleAssignments=next;
  saveState();
  logAction("Benutzer / Rechte","Rollen gespeichert","Mitglieder-Rollen aktualisiert");
  toast("Rollen erfolgreich gespeichert.","success");
  renderMemberRoleAssignments();
  return true;
}

function resetMemberRoleAssignments(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Rollenzuordnungen zurücksetzen.","error");
    return false;
  }
  if(!confirm("Rollenzuordnungen wirklich aus Mitgliederdaten neu erzeugen?")) return false;
  state.roleAssignments=[];
  ensureRoleAssignments();
  saveState();
  renderMemberRoleAssignments();
  logAction("Benutzer / Rechte","Rollen zurückgesetzt","");
  toast("Rollenzuordnungen wurden neu erzeugt.","success");
  return true;
}

function saveRoleStarts(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Rollen-Startseiten speichern.","error");
    return false;
  }
  document.querySelectorAll(".role-start-select[data-role]").forEach(sel=>{
    const role=sel.dataset.role;
    if(state.roles[role]) state.roles[role].startView=sel.value;
  });
  saveState();
  renderRoles();
  logAction("Benutzer / Rechte","Startseiten gespeichert","Rollen-Startseiten aktualisiert");
  toast("Startseiten erfolgreich gespeichert.","success");
  return true;
}

function resetRoleStarts(){
  if(!isAdminLike()){
    toast("Nur Admin/Systeminhaber darf Rollen-Startseiten zurücksetzen.","error");
    return false;
  }
  if(!confirm("Startseiten der Rollen wirklich auf Standard zurücksetzen?")) return false;
  Object.entries(DEFAULT_STATE.roles).forEach(([role,data])=>{
    if(state.roles[role]) state.roles[role].startView=data.startView;
  });
  saveState();
  renderRoles();
  logAction("Benutzer / Rechte","Startseiten zurückgesetzt","");
  toast("Startseiten wurden auf Standard zurückgesetzt.","success");
  return true;
}


/* Phase 5.4: Standard-Aktionsmenü direkt links neben jedem Registerkartennamen.
   Die Menüs sind bewusst als Platzhalter angelegt. Die einzelnen Funktionen
   werden später je Modul/Registerkarte gezielt freigeschaltet. */
