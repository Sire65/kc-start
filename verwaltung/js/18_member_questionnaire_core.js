/* Mitglieder-Fragebogen Kernmodul – Test 19 */
(function(){
  "use strict";
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
  function esc(v){ return String(v ?? "").replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m])); }
  function memberLabel(m){ return [m.memberNo, m.lastName, m.firstName].filter(Boolean).join(" · "); }
  function fillQuestionnaireSelect(){
    const sel = $("#questionnaireMemberSelect");
    if(!sel || !window.state) return;
    const rows = (state.members||[]).slice().sort((a,b)=>String(a.memberNo||"").localeCompare(String(b.memberNo||""),"de",{numeric:true}));
    sel.innerHTML = `<option value="">Blanko-Fragebogen</option>` + rows.map(m=>`<option value="${esc(m.id)}">${esc(memberLabel(m))}</option>`).join("");
  }
  function renderRatingTable(tableKey, items){
    const body = document.querySelector(`[data-q-table="${tableKey}"] tbody`);
    if(!body) return;
    const levels = ["Grundkenntnisse","Gut","Sehr gut","Experte"];
    body.innerHTML = (items||[]).filter(Boolean).map(item=>{
      const safeArea = esc(tableKey);
      const safeItem = esc(item);
      return `<tr><td>${safeItem}</td>${levels.map(level=>`<td class="center"><input type="checkbox" data-q-rating="1" data-q-area="${safeArea}" data-q-item="${safeItem}" data-q-level="${esc(level)}"></td>`).join("")}</tr>`;
    }).join("");
  }
  function renderQuestionnaireSkillTables(){
    if(!window.state) return;
    renderRatingTable("kitchen", state.combos?.kitchenCompetencies || []);
    renderRatingTable("craft", state.combos?.craftSkills || []);
    renderRatingTable("it", state.combos?.itSkills || []);
    renderRatingTable("organization", state.combos?.organizationSkills || []);
  }
  function setQ(name,value){
    const el = document.querySelector(`[data-q="${name}"]`);
    if(el) el.value = value || "";
  }
  function setRating(area,item,level){
    document.querySelectorAll('[data-q-rating]').forEach(cb=>{
      if(cb.dataset.qArea===area && cb.dataset.qItem===item) cb.checked = cb.dataset.qLevel===level;
    });
  }
  function clearRatings(){ document.querySelectorAll('[data-q-rating]').forEach(cb=>{ cb.checked=false; }); }
  function ratingsText(){
    const rows=[];
    document.querySelectorAll('[data-q-rating]:checked').forEach(cb=>rows.push(`${cb.dataset.qArea}: ${cb.dataset.qItem} = ${cb.dataset.qLevel}`));
    return rows.join("\n");
  }
  function prefillQuestionnaire(memberId){
    renderQuestionnaireSkillTables();
    const m = (state.members||[]).find(x=>String(x.id)===String(memberId));
    $$("#questionnairePrintable [data-q]").forEach(el=>el.value="");
    clearRatings();
    if(!m) return;
    setQ("salutationTitle",[m.salutation,m.title].filter(Boolean).join(" "));
    setQ("firstName",m.firstName);
    setQ("rufname",m.rufname || m.preferredName || m.firstName);
    setQ("lastName",m.lastName);
    setQ("birthDate",m.birthDate);
    setQ("profession",m.profession);
    setQ("specialQualification",m.specialQualification);
    setQ("specialQualificationOther",m.specialQualificationOther);
    setQ("street",m.street);
    setQ("postalCity",[m.postalCode,m.city].filter(Boolean).join(" "));
    setQ("phone",m.phone);
    setQ("mobile",m.mobile);
    setQ("email",m.email);
    setQ("emergencyContact",m.emergencyContact);
    setQ("emergencyPhone",m.emergencyPhone);
    setQ("allergies",m.allergies);
    setQ("joinedAt",m.joinedAt);
    setQ("memberType",m.memberType);
    setQ("clubFunction",m.clubFunction);
    setQ("availability",m.availability);
    setQ("shiftPreference",m.shiftPreference);
    setQ("preferredDeployment",m.preferredDeployment);
    setQ("carPlate",m.claims?.christmasMarketCarPlate || "");
    setQ("jacketSize",m.workwear?.jacketSize || m.clothing?.jacketSize || "");
    setQ("poloSize",m.workwear?.poloSize || m.clothing?.poloSize || "");
    setQ("pantsSize",m.workwear?.pantsSize || m.clothing?.pantsSize || "");
    setQ("shoeSize",m.workwear?.shoeSize || m.clothing?.shoeSize || "");
    setQ("workwearNotes",m.workwear?.notes || "");
    setQ("notes",m.memberNotes || "");
    setQ("skillsNotes",m.skills?.notes || "");
    setQ("licenses",(m.skills?.licenses||[]).join(", "));
    setQ("certificates",(m.skills?.certificates||[]).join(", "));
    setQ("documents",(m.documents||[]).map(d=>d.title||d.type||d.name||"").filter(Boolean).join(", "));
    setQ("history",(m.history||[]).map(h=>[h.date,h.type,h.text].filter(Boolean).join(" · ")).join("\n"));
    setQ("interestsHobbies",[...(m.interests||[]),...(m.hobbies||[])].join(", "));
    const skillMap={kitchen:state.combos?.kitchenCompetencies||[], craft:state.combos?.craftSkills||[], it:state.combos?.itSkills||[], organization:state.combos?.organizationSkills||[]};
    Object.entries(skillMap).forEach(([area,items])=>items.forEach(item=>{
      const level = m.skills?.levels?.[item] || m.skills?.levels?.[item.toLowerCase()] || "";
      if(level) setRating(area,item,level);
    }));
  }
  function questionnaireText(){
    const lines = ["Mitglieder-Stammdatenblatt Köcheclub Werne", ""];
    $$("#questionnairePrintable section").forEach(sec=>{
      const title = $("h4",sec)?.textContent || "";
      if(title) lines.push(title);
      $$("label",sec).forEach(label=>{
        const text = Array.from(label.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(" ").trim();
        const field = $("input,textarea",label);
        if(text) lines.push(`${text}: ${field?.value || ""}`);
      });
      const tableText = $$('[data-q-rating]:checked',sec).map(cb=>`${cb.dataset.qItem}: ${cb.dataset.qLevel}`).join('; ');
      if(tableText) lines.push(`Bewertungen: ${tableText}`);
      lines.push("");
    });
    const extra = ratingsText();
    if(extra) lines.push("Bewertungen Detail", extra);
    return lines.join("\n");
  }
  function printQuestionnaire(){
    const el = $("#questionnairePrintable");
    if(!el) return;
    const w = window.open("", "_blank");
    if(!w) { alert("Druckfenster konnte nicht geöffnet werden."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Mitglieder-Fragebogen</title><style>
      body{font-family:Arial,sans-serif;color:#111;margin:14mm;font-size:10pt}
      h2{margin:0 0 4mm;color:#234d2e} h4{margin:5mm 0 2mm;border-bottom:1px solid #999}
      label{display:block;margin:2mm 0}.questionnaire-grid{display:block}
      input,textarea{border:0;border-bottom:1px solid #999;width:100%;font:inherit;min-height:18px}
      textarea{height:32px;border:1px solid #999}.button-row,.hint{display:none}
      table{width:100%;border-collapse:collapse;margin:3mm 0}th,td{border:1px solid #aaa;padding:3px;text-align:left}th{text-align:center;background:#f1f5f1}.center{text-align:center}
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print();
  }
  function bindRatingExclusive(){
    document.addEventListener('change',ev=>{
      const cb=ev.target.closest('[data-q-rating]');
      if(!cb || !cb.checked) return;
      document.querySelectorAll('[data-q-rating]').forEach(other=>{
        if(other!==cb && other.dataset.qArea===cb.dataset.qArea && other.dataset.qItem===cb.dataset.qItem) other.checked=false;
      });
    });
  }
  function bindQuestionnaire(){
    renderQuestionnaireSkillTables();
    fillQuestionnaireSelect();
    $("#questionnaireMemberSelect")?.addEventListener("change",e=>prefillQuestionnaire(e.target.value));
    $("#printQuestionnaireBtn")?.addEventListener("click",printQuestionnaire);
    $("#clearQuestionnaireBtn")?.addEventListener("click",()=>prefillQuestionnaire(""));
    $("#copyQuestionnaireTextBtn")?.addEventListener("click",()=>{
      navigator.clipboard?.writeText(questionnaireText()).then(()=>toast?.("Fragebogentext kopiert.","success")).catch(()=>alert(questionnaireText()));
    });
  }
  const oldShow = window.showView;
  window.showView = function(id){
    const result = oldShow ? oldShow.apply(this,arguments) : undefined;
    if(id === "questionnaire") setTimeout(bindQuestionnaire,0);
    return result;
  };
  document.addEventListener("DOMContentLoaded",()=>{
    bindQuestionnaire(); bindRatingExclusive();
    document.addEventListener("click",ev=>{
      const close = ev.target.closest("[data-close-view]");
      if(close && close.dataset.closeView==="questionnaire") window.showView?.("dashboard");
    });
  },{once:true});
})();
