/* Finanzen – Spenden */

function nextDonationNo(){
  const max=(state.donations||[]).reduce((n,d)=>Math.max(n,Number(d.donationNo||0)),0);
  return max+1;
}

function currentDonationId(){
  return document.getElementById("donationNo")?.dataset.id || "";
}

function formatDonationAmount(value){
  if(typeof formatEuro==="function") return formatEuro(value);
  return Number(value||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
}

function updateDonationHandoverFields(){
  const type=document.getElementById("donationTransferType")?.value || "";
  const showHandover=type==="Persönliche Übergabe";
  const showBank=type==="Überweisung";
  ["donationHandoverDateLabel","donationHandoverTimeLabel","donationHandoverPlaceLabel"].forEach(id=>document.getElementById(id)?.classList.toggle("hidden",!showHandover));
  ["donationTransferRecipientLabel","donationBankNameLabel","donationIbanLabel","donationBicLabel"].forEach(id=>document.getElementById(id)?.classList.toggle("hidden",!showBank));
  if(!showHandover){
    setInputValue("donationHandoverDate","");
    setInputValue("donationHandoverTime","");
    setInputValue("donationHandoverPlace","");
  }
  if(!showBank){
    setInputValue("donationTransferRecipient","");
    setInputValue("donationBankName","");
    setInputValue("donationIban","");
    setInputValue("donationBic","");
  }
  updateDonationPressFields();
}

function updateDonationPressFields(){
  const show=!!document.getElementById("donationPress")?.checked;
  ["donationPressDetails","donationPressStatus"].forEach(id=>document.getElementById(id)?.classList.toggle("hidden",!show));
  if(!show){
    ["donationPressContact","donationPressMedium","donationPressDate","donationPressLink"].forEach(id=>setInputValue(id,""));
    const article=document.getElementById("donationPressArticle"); if(article) article.checked=false;
    const photo=document.getElementById("donationPressPhoto"); if(photo) photo.checked=false;
  }
}

function resetDonationForm(){
  const no=document.getElementById("donationNo");
  if(no){ no.value=String(nextDonationNo()); no.dataset.id=""; }
  setInputValue("donationDate",new Date().toISOString().slice(0,10));
  ["donationName","donationRecipient","donationDecidedAt","donationTransferRecipient","donationBankName","donationIban","donationBic","donationHandoverDate","donationHandoverTime","donationHandoverPlace","donationPressContact","donationPressMedium","donationPressDate","donationPressLink","donationDescription"].forEach(id=>setInputValue(id,""));
  setInputValue("donationAmount","0");
  fillSelect("donationTransferType",state.combos.donationTransferType||DEFAULT_STATE.combos.donationTransferType,"Überweisung");
  const sug=document.getElementById("donationSuggested"); if(sug) sug.checked=true;
  const done=document.getElementById("donationDone"); if(done) done.checked=false;
  const press=document.getElementById("donationPress"); if(press) press.checked=false;
  const article=document.getElementById("donationPressArticle"); if(article) article.checked=false;
  const photo=document.getElementById("donationPressPhoto"); if(photo) photo.checked=false;
  updateDonationHandoverFields();
}

function donationFromForm(){
  return {
    id:currentDonationId() || crypto.randomUUID(),
    donationNo:Number(document.getElementById("donationNo")?.value||nextDonationNo()),
    date:document.getElementById("donationDate")?.value||"",
    name:document.getElementById("donationName")?.value||"",
    recipient:document.getElementById("donationRecipient")?.value||"",
    amount:Number(document.getElementById("donationAmount")?.value||0),
    decidedAt:document.getElementById("donationDecidedAt")?.value||"",
    transferType:document.getElementById("donationTransferType")?.value||"",
    transferRecipient:document.getElementById("donationTransferRecipient")?.value||"",
    bankName:document.getElementById("donationBankName")?.value||"",
    iban:document.getElementById("donationIban")?.value||"",
    bic:document.getElementById("donationBic")?.value||"",
    handoverDate:document.getElementById("donationHandoverDate")?.value||"",
    handoverTime:document.getElementById("donationHandoverTime")?.value||"",
    handoverPlace:document.getElementById("donationHandoverPlace")?.value||"",
    suggested:!!document.getElementById("donationSuggested")?.checked,
    done:!!document.getElementById("donationDone")?.checked,
    pressInvite:!!document.getElementById("donationPress")?.checked,
    pressContact:document.getElementById("donationPressContact")?.value||"",
    pressMedium:document.getElementById("donationPressMedium")?.value||"",
    pressDate:document.getElementById("donationPressDate")?.value||"",
    pressArticle:!!document.getElementById("donationPressArticle")?.checked,
    pressLink:document.getElementById("donationPressLink")?.value||"",
    pressPhoto:!!document.getElementById("donationPressPhoto")?.checked,
    description:document.getElementById("donationDescription")?.value||"",
    updatedAt:new Date().toISOString()
  };
}

function donationToForm(d){
  if(!d) return resetDonationForm();
  const no=document.getElementById("donationNo");
  if(no){ no.value=String(d.donationNo||""); no.dataset.id=d.id||""; }
  setInputValue("donationDate",d.date||"");
  setInputValue("donationName",d.name||"");
  setInputValue("donationRecipient",d.recipient||"");
  setInputValue("donationAmount",String(d.amount||0));
  setInputValue("donationDecidedAt",d.decidedAt||"");
  fillSelect("donationTransferType",state.combos.donationTransferType||DEFAULT_STATE.combos.donationTransferType,d.transferType||"Überweisung");
  setInputValue("donationTransferRecipient",d.transferRecipient||"");
  setInputValue("donationBankName",d.bankName||"");
  setInputValue("donationIban",d.iban||"");
  setInputValue("donationBic",d.bic||"");
  setInputValue("donationHandoverDate",d.handoverDate||"");
  setInputValue("donationHandoverTime",d.handoverTime||"");
  setInputValue("donationHandoverPlace",d.handoverPlace||"");
  const sug=document.getElementById("donationSuggested"); if(sug) sug.checked=!!d.suggested;
  const done=document.getElementById("donationDone"); if(done) done.checked=!!d.done;
  const press=document.getElementById("donationPress"); if(press) press.checked=!!d.pressInvite;
  setInputValue("donationPressContact",d.pressContact||"");
  setInputValue("donationPressMedium",d.pressMedium||"");
  setInputValue("donationPressDate",d.pressDate||"");
  setInputValue("donationPressLink",d.pressLink||"");
  const article=document.getElementById("donationPressArticle"); if(article) article.checked=!!d.pressArticle;
  const photo=document.getElementById("donationPressPhoto"); if(photo) photo.checked=!!d.pressPhoto;
  setInputValue("donationDescription",d.description||"");
  updateDonationHandoverFields();
  showDonationTab("donationFormTab");
}

function validateDonation(d){
  if(!d.date){ toast("Bitte Datum der Spende eintragen.","error"); return false; }
  if(!String(d.name||"").trim()){ toast("Bitte Spendenname eintragen.","error"); return false; }
  if(!String(d.recipient||"").trim()){ toast("Bitte Spendenempfänger eintragen.","error"); return false; }
  if(Number(d.amount||0)<=0){ toast("Bitte Spendenbetrag größer 0 eintragen.","error"); return false; }
  if(d.transferType==="Persönliche Übergabe" && (!d.handoverDate || !d.handoverPlace)){
    toast("Bei persönlicher Übergabe bitte Datum und Übergabeort eintragen.","error"); return false;
  }
  if(d.transferType==="Überweisung" && (!String(d.transferRecipient||"").trim() || !String(d.iban||"").trim())){
    toast("Bei Überweisung bitte mindestens 'Überweisen an' und IBAN eintragen.","error"); return false;
  }
  return true;
}

function syncDonationWorkflow(d){
  const id=String(d.id||""); if(!id) return;
  state.finance=Array.isArray(state.finance)?state.finance:[];
  state.investmentPlanning=Array.isArray(state.investmentPlanning)?state.investmentPlanning:[];
  state.finance=state.finance.filter(x=>!(x.sourceModule==="donations" && String(x.sourceId||"")===id));
  state.investmentPlanning=state.investmentPlanning.filter(x=>!(x.sourceModule==="donations" && String(x.sourceId||"")===id));
  if(d.done){
    state.finance.unshift({
      id:"fin-"+id,
      type:"Ausgabe",
      category:"Spenden",
      subCategory:"Geleistete Spende",
      date:d.date,
      year:d.date ? new Date(d.date).getFullYear() : new Date().getFullYear(),
      text:`Spende: ${d.name} an ${d.recipient}`,
      amount:Number(d.amount||0),
      sourceModule:"donations",
      sourceId:id,
      createdAt:new Date().toISOString()
    });
  }else{
    state.investmentPlanning.unshift({
      id:"plan-"+id,
      date:d.decidedAt||d.date||new Date().toISOString().slice(0,10),
      source:"Spenden",
      description:`Spende: ${d.name} an ${d.recipient}`,
      amount:Number(d.amount||0),
      status:d.suggested?"Vorschlag":"Planung",
      sourceModule:"donations",
      sourceId:id
    });
  }
}

function saveDonation(){
  const d=donationFromForm();
  if(!validateDonation(d)) return;
  state.donations=Array.isArray(state.donations)?state.donations:[];
  const idx=state.donations.findIndex(x=>x.id===d.id);
  if(idx>=0) state.donations[idx]=d; else state.donations.unshift(d);
  syncDonationWorkflow(d);
  saveState();
  donationToForm(d);
  renderDonations();
  renderDashboard();
  logAction("Finanzen / Spenden",idx>=0?"Spende geändert":"Spende angelegt",`${d.name} – ${formatDonationAmount(d.amount)}; ${d.done?"in Finanzen gebucht":"in Investitionsplanung vorgemerkt"}`);
  toast(d.done?"Spende durchgeführt und in Finanzen gebucht.":"Spende gespeichert und in der Investitionsplanung vorgemerkt.","success");
}

function deleteDonation(){
  const id=currentDonationId();
  if(!id){ toast("Keine Spende zum Löschen ausgewählt.","warn"); return; }
  if(!confirm("Spende wirklich löschen?")) return;
  const d=(state.donations||[]).find(x=>x.id===id);
  state.donations=(state.donations||[]).filter(x=>x.id!==id);
  state.finance=(state.finance||[]).filter(x=>!(x.sourceModule==="donations" && String(x.sourceId||"")===String(id)));
  state.investmentPlanning=(state.investmentPlanning||[]).filter(x=>!(x.sourceModule==="donations" && String(x.sourceId||"")===String(id)));
  saveState();
  resetDonationForm();
  renderDonations();
  renderDashboard();
  logAction("Finanzen / Spenden","Spende gelöscht",d?`${d.name} – ${formatDonationAmount(d.amount)}`:id);
  toast("Spende einschließlich Planung/Buchung gelöscht.","success");
}

function transferDonationToFinance(){
  const d=donationFromForm();
  if(!validateDonation(d)) return;
  if(!currentDonationId()){
    toast("Bitte Spende zuerst speichern.","warn");
    return;
  }
  if(!d.done){
    syncDonationWorkflow(d);
    saveState();
    renderDashboard();
    toast("Noch nicht durchgeführt: Betrag bleibt in der Investitionsplanung.","info");
    return;
  }
  const idx=(state.donations||[]).findIndex(x=>x.id===d.id);
  if(idx>=0) state.donations[idx]=d;
  syncDonationWorkflow(d);
  saveState();
  renderDonations();
  renderDashboard();
  logAction("Finanzen / Spenden","Durchgeführte Spende gebucht",`${d.name}: ${formatDonationAmount(d.amount)}`);
  toast("Durchgeführte Spende wurde in Finanzen gebucht.","success");
}

function donationFilters(){
  return {
    from:document.getElementById("donationFilterFrom")?.value||"",
    to:document.getElementById("donationFilterTo")?.value||"",
    name:(document.getElementById("donationFilterName")?.value||"").toLowerCase(),
    recipient:(document.getElementById("donationFilterRecipient")?.value||"").toLowerCase(),
    status:document.getElementById("donationFilterStatus")?.value||""
  };
}

function filteredDonations(){
  const f=donationFilters();
  return (state.donations||[]).filter(d=>{
    if(f.from && String(d.date||"")<f.from) return false;
    if(f.to && String(d.date||"")>f.to) return false;
    if(f.name && !String(d.name||"").toLowerCase().includes(f.name)) return false;
    if(f.recipient && !String(d.recipient||"").toLowerCase().includes(f.recipient)) return false;
    if(f.status==="suggested" && !d.suggested) return false;
    if(f.status==="done" && !d.done) return false;
    return true;
  }).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")) || Number(b.donationNo||0)-Number(a.donationNo||0));
}

function renderInvestmentPlanning(){
  const rows=[...(Array.isArray(state.investmentPlanning)?state.investmentPlanning:[])].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  const body=document.getElementById("investmentPlanningTable");
  const total=document.getElementById("investmentPlanningTotal");
  if(total) total.textContent=formatDonationAmount(rows.reduce((sum,item)=>sum+Number(item.amount||0),0));
  if(body) body.innerHTML=rows.length?rows.map(item=>{
    const date=item.date?new Date(item.date).toLocaleDateString("de-DE"):"--";
    return `<tr><td>${escapeHtml(date)}</td><td>${escapeHtml(item.source||"")}</td><td>${escapeHtml(item.description||"")}</td><td>${escapeHtml(item.status||"Planung")}</td><td>${formatDonationAmount(item.amount)}</td></tr>`;
  }).join(""):`<tr><td colspan="5" class="muted">Keine geplanten Investitionen vorhanden.</td></tr>`;
}

function renderDonations(){
  fillSelect("donationTransferType",state.combos.donationTransferType||DEFAULT_STATE.combos.donationTransferType,document.getElementById("donationTransferType")?.value||"Überweisung");
  const body=document.getElementById("donationsTable");
  if(body){
    const rows=filteredDonations();
    body.innerHTML=rows.length ? rows.map(d=>{
      const status=[d.suggested?"Vorschlag":"",d.done?"durchgeführt":""].filter(Boolean).join(" / ") || "--";
      const press=d.pressInvite ? "📰 Ja" : "–";
      const date=d.date ? new Date(d.date).toLocaleDateString("de-DE") : "--";
      return `<tr data-donation-id="${escapeHtml(d.id)}"><td>${d.donationNo||""}</td><td>${date}</td><td>${escapeHtml(d.name||"")}</td><td>${escapeHtml(d.recipient||"")}</td><td>${formatDonationAmount(d.amount)}</td><td>${escapeHtml(d.transferType||"")}</td><td>${escapeHtml(status)}</td><td>${press}</td><td>${escapeHtml(d.pressMedium||"")}</td></tr>`;
    }).join("") : `<tr><td colspan="9" class="muted">Keine Spenden vorhanden.</td></tr>`;
    body.querySelectorAll("tr[data-donation-id]").forEach(row=>row.addEventListener("dblclick",()=>{
      const d=(state.donations||[]).find(x=>x.id===row.dataset.donationId);
      if(d) donationToForm(d);
    }));
  }
  updateDonationHandoverFields();
  renderInvestmentPlanning();
}

function showDonationTab(id){
  document.querySelectorAll("[data-donation-tab]").forEach(b=>b.classList.toggle("active",b.dataset.donationTab===id));
  document.querySelectorAll(".donation-tab-panel").forEach(p=>p.classList.toggle("active",p.id===id));
}

function buildDonationReceiptDefaultText(d){
  const club=state.settings.clubName || "Köcheclub";
  const address=[state.settings.clubStreet, [state.settings.clubPostalCode,state.settings.clubCity].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const handover=d.transferType==="Persönliche Übergabe" ? `${d.handoverDate||"--"} ${d.handoverTime||""} in ${d.handoverPlace||"--"}` : `per Überweisung an ${d.transferRecipient||"--"}, ${d.bankName||""}, IBAN ${d.iban||"--"}, BIC ${d.bic||""}`;
  return `Spendenquittung / Spendenbestätigung\n\n${club}\n${address}\n\nDatum: ${d.date||""}\nBeschlossen am: ${d.decidedAt||""}\nSpendenname: ${d.name||""}\nSpendenempfänger: ${d.recipient||""}\nBetrag: ${formatDonationAmount(d.amount)}\nÜbergabeart: ${d.transferType||""}\nÜbergabe: ${handover}\n\nBeschreibung:\n${d.description||""}\n\nWir bedanken uns für die Unterstützung.\n\nUnterschrift / Stempel`;
}

function printDonationReceiptFromText(text){
  const safe=escapeHtml(text||"").replace(/\n/g,"<br>");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Spendenquittung</title><style>body{font-family:Arial,sans-serif;margin:36px;color:#1f2a1f;line-height:1.45}h1{color:#2f6b3f}.box{border:1px solid #ccc;padding:22px;border-radius:10px;white-space:normal}.sig{margin-top:60px;border-top:1px solid #333;width:300px;padding-top:8px}</style></head><body><h1>Spendenquittung / Spendenbestätigung</h1><div class="box">${safe}</div><script>window.print();<\/script></body></html>`;
  const w=window.open("","_blank");
  if(!w){ toast("Druckfenster konnte nicht geöffnet werden.","error"); return; }
  w.document.write(html);
  w.document.close();
}

function printDonationReceipt(){
  const d=donationFromForm();
  if(!validateDonation(d)) return;
  const defaultText=buildDonationReceiptDefaultText(d);
  const w=window.open("","_blank","width=900,height=720");
  if(!w){ toast("Druckfenster konnte nicht geöffnet werden.","error"); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Spendenquittung bearbeiten</title><style>body{font-family:Arial,sans-serif;margin:24px;background:#f5f7f4;color:#1f2a1f}textarea{width:100%;height:480px;box-sizing:border-box;border:1px solid #b7c8b7;border-radius:10px;padding:14px;font-family:Arial,sans-serif;font-size:14px;line-height:1.45}button{margin-top:12px;padding:10px 16px;border:0;border-radius:8px;background:#2f6b3f;color:white;font-weight:700;cursor:pointer}h1{color:#2f6b3f}</style></head><body><h1>Spendenquittung vor dem Druck bearbeiten</h1><textarea id="receiptText">${escapeHtml(defaultText)}</textarea><br><button id="printNow">Drucken</button><script>document.getElementById('printNow').addEventListener('click',()=>{const text=document.getElementById('receiptText').value;const safe=text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\n/g,'<br>');const html='<!doctype html><html><head><meta charset="utf-8"><title>Spendenquittung<\\/title><style>body{font-family:Arial,sans-serif;margin:36px;color:#1f2a1f;line-height:1.45}h1{color:#2f6b3f}.box{border:1px solid #ccc;padding:22px;border-radius:10px}.sig{margin-top:60px;border-top:1px solid #333;width:300px;padding-top:8px}<\\/style><\\/head><body><h1>Spendenquittung / Spendenbestätigung<\\/h1><div class="box">'+safe+'<\\/div><\\/body><\\/html>';document.open();document.write(html);document.close();window.print();});<\/script></body></html>`);
  w.document.close();
  logAction("Finanzen / Spenden","Spendenquittung vorbereitet",`${d.name} – ${formatDonationAmount(d.amount)}`);
}

function getDonationStatsByYear(){
  const map=new Map();
  (state.donations||[]).forEach(d=>{
    const year=d.date ? String(new Date(d.date).getFullYear()) : "ohne Datum";
    const item=map.get(year)||{year,count:0,amount:0};
    item.count += 1;
    item.amount += Number(d.amount||0);
    map.set(year,item);
  });
  return [...map.values()].sort((a,b)=>String(a.year).localeCompare(String(b.year)));
}

function renderDonationDashboard(){
  const rows=getDonationStatsByYear();
  const donations=state.donations||[];
  const totalAmount=donations.reduce((sum,d)=>sum+Number(d.amount||0),0);
  const withPress=donations.filter(d=>d.pressInvite).length;
  const withoutPress=donations.length-withPress;
  const recipients=new Set(donations.map(d=>String(d.recipient||"").trim()).filter(Boolean));
  const kpis=document.getElementById("dashboardDonationKpis");
  if(kpis){
    kpis.innerHTML=`<div class="kpi"><span>Anzahl Spenden</span><strong>${donations.length}</strong></div><div class="kpi"><span>Summe Spenden</span><strong>${formatDonationAmount(totalAmount)}</strong></div><div class="kpi"><span>Empfängergruppen</span><strong>${recipients.size}</strong></div><div class="kpi"><span>Mit Presse</span><strong>${withPress}</strong></div><div class="kpi"><span>Ohne Presse</span><strong>${withoutPress}</strong></div>`;
  }
  const chart=document.getElementById("dashboardDonationChart");
  if(chart){
    renderModernColumnChart(chart, rows.map(r=>({label:String(r.year),count:r.amount}))); 
  }
  const body=document.getElementById("dashboardDonationTable");
  if(body){
    const donationRows=[...(state.donations||[])].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    body.innerHTML=donationRows.length ? donationRows.map((d,i)=>{
      const year=d.date ? String(new Date(d.date).getFullYear()) : "ohne Datum";
      const press=d.pressInvite ? "📰 Ja" : "–";
      return `<tr ${tableRowStyle(chartColor(i))}><td>${escapeHtml(year)}</td><td>${escapeHtml(d.name||"")}</td><td>${formatDonationAmount(d.amount)}</td><td>${press}</td></tr>`;
    }).join("") : `<tr><td colspan="4">Keine Spenden vorhanden.</td></tr>`;
  }
}

function bindDonations(){
  document.querySelectorAll("[data-donation-tab]").forEach(btn=>btn.addEventListener("click",()=>showDonationTab(btn.dataset.donationTab)));
  document.getElementById("newDonation")?.addEventListener("click",resetDonationForm);
  document.getElementById("saveDonation")?.addEventListener("click",saveDonation);
  document.getElementById("deleteDonation")?.addEventListener("click",deleteDonation);
  document.getElementById("printDonationReceipt")?.addEventListener("click",printDonationReceipt);
  document.getElementById("transferDonationFinance")?.addEventListener("click",transferDonationToFinance);
  document.getElementById("donationTransferType")?.addEventListener("change",updateDonationHandoverFields);
  document.getElementById("donationPress")?.addEventListener("change",updateDonationPressFields);
  ["donationFilterFrom","donationFilterTo","donationFilterName","donationFilterRecipient","donationFilterStatus"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input",renderDonations);
    document.getElementById(id)?.addEventListener("change",renderDonations);
  });
  document.getElementById("resetDonationFilters")?.addEventListener("click",()=>{
    ["donationFilterFrom","donationFilterTo","donationFilterName","donationFilterRecipient","donationFilterStatus"].forEach(id=>setInputValue(id,""));
    renderDonations();
  });
  resetDonationForm();
  renderInvestmentPlanning();
}
