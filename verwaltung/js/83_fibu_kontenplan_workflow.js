/* KC Verwaltung 54.8.16 – kleiner Vereins-Kontenplan + nachvollziehbarer Fibu-Workflow
 * Planung -> Beschluss -> Durchführung -> Fibu-Buchung -> optional Inventar.
 * Bewusst vereinfachter interner Kontenplan, kein DATEV-Ersatz.
 */
(function(){
  'use strict';
  const VIEW='fibuChartAccounts';
  const euro=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=p=>crypto.randomUUID?.()||`${p}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today=()=>new Date().toISOString().slice(0,10);
  const DEFAULT_ACCOUNTS=[
    ['1000','Barkasse','Zahlungsmittel'],['1200','Girokonto','Zahlungsmittel'],['1210','Rücklagenkonto / Sparkonto','Zahlungsmittel'],
    ['3000','Wareneinkauf Weihnachtsmarkt / PC Manager','Ausgabe'],['3010','Getränkeeinkauf / Kasse','Ausgabe'],['3020','Verbrauchsmaterial Lebensmittel','Ausgabe'],
    ['3030','Servietten, Senf, Kekse und Beigaben','Ausgabe'],['3040','Gasflaschen / Brennstoffe','Ausgabe'],['3050','Kleinmaterial Marktstand','Ausgabe'],
    ['4100','Standgebühren / Marktgebühren','Ausgabe'],['4110','Mieten / Pachten','Ausgabe'],['4120','Strom / Energie','Ausgabe'],['4130','Internet / Kommunikation','Ausgabe'],
    ['4200','Transportkosten','Ausgabe'],['4210','LKW- / Fahrzeugmiete','Ausgabe'],['4220','Fahrtkostenerstattung Mitglieder','Ausgabe'],['4230','Parkausweise / Parkgebühren','Ausgabe'],
    ['4300','Reparaturen / Instandhaltung','Ausgabe'],['4310','Neuanschaffungen / Inventar','Ausgabe'],['4320','IT / Kasse / Software / Technik','Ausgabe'],['4330','Dienstkleidung / Ausstattung','Ausgabe'],
    ['4400','Büromaterial / Papier / Druckertinte','Ausgabe'],['4410','Laminierfolie / Druck- und Präsentationsmaterial','Ausgabe'],['4420','Sonstiges Kleinmaterial','Ausgabe'],
    ['4430','Reinigungsmittel','Ausgabe'],['4440','Hygienebedarf / Einmalartikel','Ausgabe'],
    ['4500','Ausflüge / Reisen','Ausgabe'],['4510','Geselligkeit / Veranstaltungen','Ausgabe'],['4520','Bewirtung / Sitzungen','Ausgabe'],
    ['4600','Versicherungen / Beiträge / Gebühren','Ausgabe'],['4700','Spenden / soziale Projekte','Ausgabe'],['4800','Sonstige Ausgaben','Ausgabe'],
    ['8000','Verkaufserlöse Weihnachtsmarkt','Einnahme'],['8100','Mitgliedsbeiträge','Einnahme'],['8200','Spenden / Zuschüsse erhalten','Einnahme'],['8300','Erstattungen / sonstige Einnahmen','Einnahme']
  ];
  const RESERVE_TEMPLATES=[
    ['reserve-repairs','Reparaturen / Instandhaltung','Reparatur / Instandhaltung','4300'],
    ['reserve-rent','Mieten, Standgebühren und Nebenkosten','Mieten / Pachten / Nebenkosten','4100'],
    ['reserve-replacement','Neu- und Ersatzanschaffungen','Neuanschaffung / Ersatzbeschaffung','4310'],
    ['reserve-travel','Ausflüge / Reisen','Ausflüge / Reisen','4500'],
    ['reserve-social','Geselligkeit / Veranstaltungen','Geselligkeit / Veranstaltungen','4510'],
    ['reserve-energy','Strom / Energie / Betriebskosten','Energie / Betriebskosten','4120'],
    ['reserve-transport','Transport / LKW / Fahrtkosten','Sonstiges','4200'],
    ['reserve-gas','Gasflaschen / Brennstoffe','Sonstiges','3040'],
    ['reserve-it','IT / Kasse / Internet','IT / Kasse / Software','4320'],
    ['reserve-office','Büro- und Kleinmaterial','Sonstiges','4400'],
    ['reserve-cleaning','Reinigungsmittel','Reinigung / Hygiene','4430'],
    ['reserve-hygiene','Hygienebedarf / Einmalartikel','Reinigung / Hygiene','4440'],
    ['reserve-emergency','Notfallreserve / Unvorhergesehenes','Notfallreserve / Unvorhergesehenes','4800']
  ];
  function ensureState(){
    if(!window.state)return;
    if(!Array.isArray(state.fibuAccounts))state.fibuAccounts=[];
    if(!state.fibuPlanningSettings || typeof state.fibuPlanningSettings!=='object' || Array.isArray(state.fibuPlanningSettings)){
      state.fibuPlanningSettings={planBalance:33000,planBalanceNote:'Manueller Plankontostand für die Vorplanung – später an den echten Kontostand anpassen.',updatedAt:new Date().toISOString()};
    } else {
      if(!Number.isFinite(Number(state.fibuPlanningSettings.planBalance)))state.fibuPlanningSettings.planBalance=33000;
      if(!state.fibuPlanningSettings.planBalanceNote)state.fibuPlanningSettings.planBalanceNote='Manueller Plankontostand für die Vorplanung – später an den echten Kontostand anpassen.';
    }
    const existing=new Set(state.fibuAccounts.map(x=>String(x.no||'')));
    DEFAULT_ACCOUNTS.forEach(([no,name,type])=>{if(!existing.has(no))state.fibuAccounts.push({id:'acct-'+no,no,name,type,active:true,systemSeed:true,createdAt:new Date().toISOString()})});
    if(!Array.isArray(state.reservePlanning))state.reservePlanning=[];
    RESERVE_TEMPLATES.forEach(([id,title,category,accountNo])=>{
      if(!state.reservePlanning.some(x=>x.id===id))state.reservePlanning.push({id,title,category,year:2027,targetAmount:0,reservedAmount:0,status:'Planung',purpose:'Vorsorgeposition für planbare Vereinsausgaben',decisionDate:'',dueDate:'',financing:'freie Mittel / Überschuss',accountNo,notes:'Vorlage – Zielbetrag bei Bedarf festlegen.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),seeded:true});
    });
    const wm=state.reservePlanning.find(x=>x.id==='reserve-wm-2027-purchase');if(wm&&!wm.accountNo)wm.accountNo='3000';
  }
  function accountByNo(no){return (state.fibuAccounts||[]).find(x=>String(x.no)===String(no))}
  function expenseOptions(selected='4310'){return (state.fibuAccounts||[]).filter(x=>x.active!==false&&x.type==='Ausgabe').map(a=>`<option value="${esc(a.no)}" ${String(a.no)===String(selected)?'selected':''}>${esc(a.no)} · ${esc(a.name)}</option>`).join('')}
  function paymentOptions(selected='1200'){return (state.fibuAccounts||[]).filter(x=>x.active!==false&&x.type==='Zahlungsmittel').map(a=>`<option value="${esc(a.no)}" ${String(a.no)===String(selected)?'selected':''}>${esc(a.no)} · ${esc(a.name)}</option>`).join('')}
  function injectNav(){
    const sub=document.getElementById('financeSubmenu');if(!sub||document.getElementById('fibuChartAccountsNav'))return;
    const b=document.createElement('button');b.id='fibuChartAccountsNav';b.type='button';b.className='nav nav-child';b.dataset.view=VIEW;b.textContent='Kontenplan';b.onclick=e=>{e.preventDefault();window.showView?.(VIEW);renderAccounts()};
    const inv=document.getElementById('investmentPlanNav');if(inv)sub.insertBefore(b,inv);else sub.appendChild(b);
  }
  function injectView(){
    if(document.getElementById(VIEW))return;const main=document.querySelector('main');if(!main)return;
    const s=document.createElement('section');s.id=VIEW;s.className='view';s.innerHTML=`
      <h3>Fibu – Kontenplan</h3>
      <div class="kc-plan-note"><strong>Einfacher Vereins-Kontenplan:</strong> Die Konten sorgen dafür, dass jede Ausgabe und Einnahme nachvollziehbar zugeordnet ist. Bereits verwendete Konten werden nicht gelöscht, sondern bei Bedarf nur deaktiviert.</div>
      <div class="panel"><div class="kc-plan-grid">
        <label>Kontonummer<input id="kcAcctNo" inputmode="numeric" placeholder="z. B. 4350"></label>
        <label>Bezeichnung<input id="kcAcctName" placeholder="Bezeichnung"></label>
        <label>Art<select id="kcAcctType"><option>Zahlungsmittel</option><option>Ausgabe</option><option>Einnahme</option></select></label>
        <label>Aktiv<select id="kcAcctActive"><option value="true">Ja</option><option value="false">Nein</option></select></label>
      </div><div class="button-row"><button id="kcAcctNew" class="secondary" type="button">Neu</button><button id="kcAcctSave" class="primary" type="button">Speichern</button></div></div>
      <div class="panel"><div class="table-headline"><h3>Konten</h3><strong id="kcAcctCount"></strong></div><div class="table-wrap"><table><thead><tr><th>Konto</th><th>Bezeichnung</th><th>Art</th><th>Status</th></tr></thead><tbody id="kcAcctTable"></tbody></table></div></div>`;
    main.appendChild(s);bindAccounts();
  }
  let currentAccountId='';
  function bindAccounts(){
    document.getElementById('kcAcctNew').onclick=()=>{currentAccountId='';['kcAcctNo','kcAcctName'].forEach(id=>document.getElementById(id).value='');document.getElementById('kcAcctType').value='Ausgabe';document.getElementById('kcAcctActive').value='true'};
    document.getElementById('kcAcctSave').onclick=()=>{const no=document.getElementById('kcAcctNo').value.trim(),name=document.getElementById('kcAcctName').value.trim();if(!no||!name){window.toast?.('Kontonummer und Bezeichnung eingeben.','warn');return}const duplicate=(state.fibuAccounts||[]).find(x=>x.no===no&&x.id!==currentAccountId);if(duplicate){window.toast?.('Diese Kontonummer ist bereits vorhanden.','warn');return}const old=(state.fibuAccounts||[]).find(x=>x.id===currentAccountId);const a={...(old||{}),id:currentAccountId||uid('acct'),no,name,type:document.getElementById('kcAcctType').value,active:document.getElementById('kcAcctActive').value==='true',updatedAt:new Date().toISOString(),createdAt:old?.createdAt||new Date().toISOString()};const i=state.fibuAccounts.findIndex(x=>x.id===a.id);if(i>=0)state.fibuAccounts[i]=a;else state.fibuAccounts.push(a);currentAccountId=a.id;window.saveState?.();window.logAction?.('Fibu/Kontenplan',i>=0?'Konto geändert':'Konto angelegt',`${no} · ${name}`);renderAccounts();refreshWorkflowSelects();window.toast?.('Kontenplan gespeichert.','success')};
  }
  function renderAccounts(){
    const rows=[...(state.fibuAccounts||[])].sort((a,b)=>String(a.no).localeCompare(String(b.no)));const b=document.getElementById('kcAcctTable');if(!b)return;document.getElementById('kcAcctCount').textContent=`${rows.length} Konten`;
    b.innerHTML=rows.map(a=>`<tr data-id="${esc(a.id)}"><td><strong>${esc(a.no)}</strong></td><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${a.active!==false?'Aktiv':'Inaktiv'}</td></tr>`).join('');
    b.querySelectorAll('tr[data-id]').forEach(r=>r.ondblclick=()=>{const a=state.fibuAccounts.find(x=>x.id===r.dataset.id);if(!a)return;currentAccountId=a.id;document.getElementById('kcAcctNo').value=a.no;document.getElementById('kcAcctName').value=a.name;document.getElementById('kcAcctType').value=a.type;document.getElementById('kcAcctActive').value=String(a.active!==false)});
  }
  function injectInvestmentWorkflow(){
    const notes=document.getElementById('kcInvNotes');if(!notes||document.getElementById('kcInvExpenseAccount'))return;const grid=notes.closest('.kc-plan-grid');
    const holder=document.createElement('div');holder.className='full';holder.id='kcInvFibuWorkflow';holder.innerHTML=`<div class="kc-plan-note"><strong>Durchführung → Fibu:</strong> Nach dem Kauf Beleg und Ist-Betrag ergänzen. Mit „In Fibu übernehmen“ wird genau eine verknüpfte Ausgabe erzeugt.</div><div class="kc-plan-grid">
      <label>Fibu-Ausgabenkonto<select id="kcInvExpenseAccount">${expenseOptions()}</select></label><label>Bezahlt über<select id="kcInvPaymentAccount">${paymentOptions()}</select></label>
      <label>Ist-Betrag €<input id="kcInvActualAmount" type="number" min="0" step="0.01"></label><label>Bezahlt / durchgeführt am<input id="kcInvExecutedDate" type="date"></label>
      <label>Beleg-/Rechnungs-Nr.<input id="kcInvReceiptNo"></label><label>Fibu-Buchung<input id="kcInvBookingNo" readonly placeholder="noch nicht gebucht"></label>
      </div><div class="button-row"><button id="kcInvPostToFibu" class="primary" type="button">In Fibu übernehmen</button><button id="kcInvOpenFibu" class="secondary" type="button">Fibu-Buchung anzeigen</button></div>`;
    grid.appendChild(holder);document.getElementById('kcInvPostToFibu').onclick=postInvestment;document.getElementById('kcInvOpenFibu').onclick=()=>{window.showView?.('finance');window.toast?.('Die verknüpfte Buchungsnummer steht in der Investition.','info')};
    patchInvestmentLoadSave();
  }
  function currentInvestment(){const title=document.getElementById('kcInvTitle')?.value||'';return (state.investmentPlanning||[]).find(x=>x.planType==='investment'&&x.title===title) || null}
  function nextBookingNo(){const y=new Date().getFullYear();const nums=(state.finance||[]).map(x=>String(x.bookingNo||'')).filter(x=>x.startsWith(`F${y}-`)).map(x=>Number(x.split('-')[1])||0);return `F${y}-${String((Math.max(0,...nums)+1)).padStart(4,'0')}`}
  function postInvestment(){
    const inv=currentInvestment();if(!inv){window.toast?.('Investition zuerst speichern.','warn');return}if(inv.financeBookingId){window.toast?.(`Bereits gebucht: ${inv.financeBookingNo||'Fibu-Buchung vorhanden'}.`,'warn');return}
    const accountNo=document.getElementById('kcInvExpenseAccount').value,paymentNo=document.getElementById('kcInvPaymentAccount').value,actual=Number(document.getElementById('kcInvActualAmount').value||inv.amount||0);if(!(actual>0)){window.toast?.('Ist-Betrag eingeben.','warn');return}
    if(!confirm(`${inv.title}\n${euro(actual)} auf Konto ${accountNo} buchen?`))return;
    if(!Array.isArray(state.finance))state.finance=[];const bookingNo=nextBookingNo(),id=uid('fin');const exp=accountByNo(accountNo),pay=accountByNo(paymentNo),date=document.getElementById('kcInvExecutedDate').value||today(),receiptNo=document.getElementById('kcInvReceiptNo').value.trim();
    state.finance.unshift({id,bookingNo,type:'Ausgabe',category:exp?.name||'Investition',subCategory:inv.category||'',accountNo,paymentAccountNo:paymentNo,date,year:Number(date.slice(0,4)),text:inv.title,amount:actual,receiptNo,sourceModule:'investmentPlanning',sourceId:inv.id,sourceTitle:inv.title,createdAt:new Date().toISOString()});
    Object.assign(inv,{actualAmount:actual,expenseAccountNo:accountNo,paymentAccountNo:paymentNo,executedDate:date,receiptNo,financeBookingId:id,financeBookingNo:bookingNo,status:'Abgeschlossen',updatedAt:new Date().toISOString()});
    window.saveState?.();window.logAction?.('Fibu/Investition','Investition in Fibu übernommen',`${bookingNo} · ${inv.title} · ${euro(actual)} · ${exp?.name||accountNo} / ${pay?.name||paymentNo}`);document.getElementById('kcInvBookingNo').value=bookingNo;document.getElementById('kcInvStatus').value='Abgeschlossen';window.KCFibuPlanning?.renderInvestment?.();window.KCFibuPlanning?.renderDashboardPlanning?.();window.renderFinanceDashboard?.();window.toast?.(`Gebucht: ${bookingNo}`,'success');
  }
  function patchInvestmentLoadSave(){
    const tbody=document.getElementById('kcInvTable');if(tbody){tbody.addEventListener('click',()=>setTimeout(fillWorkflowFromSelected,0));tbody.addEventListener('dblclick',()=>setTimeout(fillWorkflowFromSelected,0))}
    document.getElementById('kcInvSave')?.addEventListener('click',()=>setTimeout(()=>{const inv=currentInvestment();if(!inv)return;inv.expenseAccountNo=document.getElementById('kcInvExpenseAccount').value;inv.paymentAccountNo=document.getElementById('kcInvPaymentAccount').value;inv.actualAmount=Number(document.getElementById('kcInvActualAmount').value||0);inv.executedDate=document.getElementById('kcInvExecutedDate').value;inv.receiptNo=document.getElementById('kcInvReceiptNo').value;window.saveState?.()},0));
    document.getElementById('kcInvNew')?.addEventListener('click',()=>setTimeout(()=>{document.getElementById('kcInvExpenseAccount').value='4310';document.getElementById('kcInvPaymentAccount').value='1200';['kcInvActualAmount','kcInvExecutedDate','kcInvReceiptNo','kcInvBookingNo'].forEach(id=>document.getElementById(id).value='')},0));
  }
  function fillWorkflowFromSelected(){const inv=currentInvestment();if(!inv)return;const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??''};set('kcInvExpenseAccount',inv.expenseAccountNo||'4310');set('kcInvPaymentAccount',inv.paymentAccountNo||'1200');set('kcInvActualAmount',inv.actualAmount||'');set('kcInvExecutedDate',inv.executedDate||'');set('kcInvReceiptNo',inv.receiptNo||'');set('kcInvBookingNo',inv.financeBookingNo||'')}
  function refreshWorkflowSelects(){const e=document.getElementById('kcInvExpenseAccount'),p=document.getElementById('kcInvPaymentAccount');if(e){const v=e.value;e.innerHTML=expenseOptions(v)}if(p){const v=p.value;p.innerHTML=paymentOptions(v)}}
  function addFinanceOverview(){
    const sec=document.getElementById('finance');if(!sec||document.getElementById('kcSimpleFibuBookings'))return;const panel=document.createElement('div');panel.className='panel';panel.id='kcSimpleFibuBookings';panel.innerHTML=`<div class="table-headline"><h3>Fibu-Buchungen</h3><strong>nachvollziehbarer Buchungsweg</strong></div><div class="table-wrap compact-table"><table><thead><tr><th>Buchung</th><th>Datum</th><th>Konto</th><th>Text / Herkunft</th><th>Zahlweg</th><th>Betrag</th></tr></thead><tbody id="kcSimpleFibuBookingsBody"></tbody></table></div>`;sec.appendChild(panel);
    const original=window.renderFinanceDashboard;window.renderFinanceDashboard=function(){try{original?.apply(this,arguments)}finally{renderBookings()}};renderBookings();
  }
  function renderBookings(){const b=document.getElementById('kcSimpleFibuBookingsBody');if(!b)return;const rows=[...(state.finance||[])].sort((a,z)=>String(z.date||'').localeCompare(String(a.date||''))).slice(0,100);b.innerHTML=rows.length?rows.map(x=>`<tr><td>${esc(x.bookingNo||x.id||'')}</td><td>${esc(x.date||'')}</td><td>${esc(x.accountNo||'')} ${esc(accountByNo(x.accountNo)?.name||x.category||'')}</td><td>${esc(x.text||'')}<br><small>${esc(x.sourceModule||'manuell')}</small></td><td>${esc(x.paymentAccountNo||'')}</td><td>${euro(x.amount)}</td></tr>`).join(''):`<tr><td colspan="6" class="muted">Noch keine Fibu-Buchungen vorhanden.</td></tr>`}
  function addPlanBalanceCard(){
    const sec=document.getElementById('finance');if(!sec||document.getElementById('kcPlanBalancePanel'))return;
    const panel=document.createElement('div');panel.className='panel';panel.id='kcPlanBalancePanel';
    panel.innerHTML=`<div class="table-headline"><h3>Plan-Liquidität</h3><strong>Vorplanung · kein Bankkontostand</strong></div>
      <div class="cards">
        <article class="card"><span>Manueller Plankontostand</span><strong id="kcPlanBalanceValue">${euro(state.fibuPlanningSettings?.planBalance||0)}</strong></article>
        <article class="card"><span>Gebundene Rücklagen</span><strong id="kcPlanReservedValue">0,00 €</strong></article>
        <article class="card"><span>Planmäßig frei verfügbar</span><strong id="kcPlanAvailableValue">0,00 €</strong></article>
      </div>
      <div class="kc-plan-note"><strong>Hinweis:</strong> <span id="kcPlanBalanceNote">${esc(state.fibuPlanningSettings?.planBalanceNote||'')}</span></div>
      <div class="button-row"><label style="max-width:240px">Plankontostand €<input id="kcPlanBalanceInput" type="number" min="0" step="0.01" value="${Number(state.fibuPlanningSettings?.planBalance||0)}"></label><button id="kcPlanBalanceSave" type="button" class="secondary">Plankontostand ändern</button></div>`;
    const anchor=sec.querySelector('.panel'); if(anchor)sec.insertBefore(panel,anchor);else sec.appendChild(panel);
    document.getElementById('kcPlanBalanceSave').onclick=()=>{
      const v=Number(document.getElementById('kcPlanBalanceInput').value||0);
      if(v<0||!Number.isFinite(v)){window.toast?.('Gültigen Plankontostand eingeben.','warn');return;}
      state.fibuPlanningSettings={...(state.fibuPlanningSettings||{}),planBalance:v,planBalanceNote:'Manueller Plankontostand für die Vorplanung – später an den echten Kontostand anpassen.',updatedAt:new Date().toISOString()};
      window.saveState?.();window.logAction?.('Fibu/Planung','Plankontostand geändert',euro(v));renderPlanBalance();window.toast?.('Plankontostand gespeichert.','success');
    };
    renderPlanBalance();
  }
  function renderPlanBalance(){
    const base=Number(state.fibuPlanningSettings?.planBalance||0);
    const reserved=(state.reservePlanning||[]).reduce((sum,r)=>sum+Number(r.reservedAmount||0),0);
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=euro(v)};
    set('kcPlanBalanceValue',base);set('kcPlanReservedValue',reserved);set('kcPlanAvailableValue',base-reserved);
    const inp=document.getElementById('kcPlanBalanceInput');if(inp&&document.activeElement!==inp)inp.value=String(base);
  }
  function init(){ensureState();injectNav();injectView();renderAccounts();injectInvestmentWorkflow();addFinanceOverview();addPlanBalanceCard();refreshWorkflowSelects();window.KCFibuAccounts={version:'1.0.0',accounts:()=>state.fibuAccounts,renderAccounts,renderBookings,renderPlanBalance};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
