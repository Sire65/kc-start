/* KC Verwaltung 54.8.16 – Fibu: Investitionsplanung + Rücklagenplanung
 * Interne Finanzplanung. Rücklagen verändern den Bankkontostand nicht.
 * Nur als "Gebildet" erfasste Beträge gelten im Cockpit als gebundene Mittel.
 */
(function(){
  'use strict';
  const INVEST_VIEW='investmentPlan';
  const RESERVE_VIEW='reservePlan';
  const INVEST_CATEGORIES=['Neuanschaffung / Investition','Ersatzbeschaffung','Reparatur / Instandhaltung','IT / Kasse / Technik','Ausstattung / Inventar','Energie / Infrastruktur','Transport / Logistik','Sonstiges'];
  const RESERVE_CATEGORIES=['Wareneinkauf Weihnachtsmarkt','Reparatur / Instandhaltung','Mieten / Pachten / Nebenkosten','Neuanschaffung / Ersatzbeschaffung','Ausflüge / Reisen','Geselligkeit / Veranstaltungen','Versicherungen / Gebühren','IT / Kasse / Software','Dienstkleidung / Ausstattung','Energie / Betriebskosten','Spenden / soziale Projekte','Notfallreserve / Unvorhergesehenes','Sonstiges'];
  const STATUSES=['Idee','Planung','Beantragt','Geprüft','Beschlossen','Gebildet','Teilweise verwendet','Zurückgestellt','Abgeschlossen'];
  const PRIORITIES=['Muss','Soll','Kann'];
  let currentInvestmentId='';
  let currentReserveId='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  const uuid=p=>crypto.randomUUID?.()||`${p}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today=()=>new Date().toISOString().slice(0,10);
  function ensureState(){
    if(!window.state)return;
    if(!Array.isArray(state.investmentPlanning))state.investmentPlanning=[];
    if(!Array.isArray(state.reservePlanning))state.reservePlanning=[];
    if(!state.reservePlanning.some(x=>x?.id==='reserve-wm-2027-purchase')){
      state.reservePlanning.unshift({
        id:'reserve-wm-2027-purchase',
        title:'Einkauf Weihnachtsmarkt 2027',
        category:'Wareneinkauf Weihnachtsmarkt',
        year:2027,
        targetAmount:13000,
        reservedAmount:0,
        status:'Planung',
        purpose:'Material- und Wareneinkauf für den Weihnachtsmarkt 2027',
        decisionDate:'',
        dueDate:'',
        financing:'Überschuss / freie Mittel',
        notes:'Planbetrag für den Einkauf des Folgejahres. Noch keine Auswirkung auf den Bankkontostand.',
        createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),seeded:true
      });
    }
  }
  function injectStyle(){
    if(document.getElementById('kcFibuPlanningStyle'))return;
    const s=document.createElement('style');s.id='kcFibuPlanningStyle';s.textContent=`
      .kc-plan-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px}.kc-plan-grid .wide{grid-column:span 2}.kc-plan-grid .full{grid-column:1/-1}
      .kc-plan-summary{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px;margin:10px 0}.kc-plan-kpi{padding:12px;border:1px solid var(--line,#d9dfdc);border-radius:10px;background:var(--panel,#fff)}.kc-plan-kpi span{display:block;font-size:.85rem;opacity:.75}.kc-plan-kpi strong{display:block;font-size:1.25rem;margin-top:4px}
      .kc-plan-note{padding:10px;border-left:4px solid #b68a22;background:rgba(182,138,34,.08);margin:10px 0}.kc-plan-table tr[data-id]{cursor:pointer}.kc-plan-table tr.selected{outline:2px solid #b68a22;outline-offset:-2px}
      @media(max-width:1000px){.kc-plan-grid,.kc-plan-summary{grid-template-columns:repeat(2,minmax(140px,1fr))}}@media(max-width:650px){.kc-plan-grid,.kc-plan-summary{grid-template-columns:1fr}.kc-plan-grid .wide{grid-column:auto}}
    `;document.head.appendChild(s);
  }
  function options(list,selected){return list.map(x=>`<option ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}
  function injectNavigation(){
    const sub=document.getElementById('financeSubmenu');if(!sub)return;
    if(!document.getElementById('investmentPlanNav')){
      const b=document.createElement('button');b.id='investmentPlanNav';b.type='button';b.className='nav nav-child';b.dataset.view=INVEST_VIEW;b.textContent='Investitionsplanung';b.addEventListener('click',e=>{e.preventDefault();openInvestment()});sub.appendChild(b);
    }
    if(!document.getElementById('reservePlanNav')){
      const b=document.createElement('button');b.id='reservePlanNav';b.type='button';b.className='nav nav-child';b.dataset.view=RESERVE_VIEW;b.textContent='Rücklagenplanung';b.addEventListener('click',e=>{e.preventDefault();openReserve()});sub.appendChild(b);
    }
  }
  function injectViews(){
    const main=document.querySelector('main');if(!main)return;
    if(!document.getElementById(INVEST_VIEW)){
      const sec=document.createElement('section');sec.id=INVEST_VIEW;sec.className='view';sec.innerHTML=`
        <h3>Fibu – Investitionsplanung</h3>
        <div class="kc-plan-note"><strong>Planung, nicht Buchung:</strong> Hier werden größere Anschaffungen und Investitionsvorhaben vorbereitet. Erst nach Beschluss/Bestellung/Zahlung erfolgt die Übernahme in die Finanzbuchhaltung.</div>
        <div class="kc-plan-summary"><div class="kc-plan-kpi"><span>Planvolumen</span><strong id="kcInvTotal">0,00 €</strong></div><div class="kc-plan-kpi"><span>Beschlossen</span><strong id="kcInvApproved">0,00 €</strong></div><div class="kc-plan-kpi"><span>Offene Vorhaben</span><strong id="kcInvOpen">0</strong></div><div class="kc-plan-kpi"><span>Planjahr</span><strong id="kcInvYear">–</strong></div></div>
        <div class="panel"><div class="kc-plan-grid">
          <label>Vorhaben<input id="kcInvTitle" placeholder="z. B. neuer Kühlschrank"></label>
          <label>Kategorie<select id="kcInvCategory">${options(INVEST_CATEGORIES,'Neuanschaffung / Investition')}</select></label>
          <label>Planjahr<input id="kcInvPlanYear" type="number" min="2026" max="2100" value="2027"></label>
          <label>Planbetrag €<input id="kcInvAmount" type="number" min="0" step="0.01" value="0"></label>
          <label>Priorität<select id="kcInvPriority">${options(PRIORITIES,'Soll')}</select></label>
          <label>Status<select id="kcInvStatus">${options(STATUSES,'Planung')}</select></label>
          <label>Gewünschter Termin<input id="kcInvDueDate" type="date"></label>
          <label>Beschlossen am<input id="kcInvDecisionDate" type="date"></label>
          <label class="wide">Anbieter / Lieferant<input id="kcInvSupplier"></label>
          <label class="wide">Finanzierung<input id="kcInvFinancing" placeholder="z. B. freie Mittel, Rücklage, Zuschuss"></label>
          <label class="full">Begründung / Nutzen<textarea id="kcInvPurpose" rows="2"></textarea></label>
          <label class="full">Notizen<textarea id="kcInvNotes" rows="2"></textarea></label>
        </div><div class="button-row"><button id="kcInvNew" class="secondary" type="button">Neu</button><button id="kcInvSave" class="primary" type="button">Speichern</button><button id="kcInvDelete" class="danger" type="button">Löschen</button></div></div>
        <div class="panel"><div class="table-headline"><h3>Investitionsvorhaben</h3><strong id="kcInvCount">0 Einträge</strong></div><div class="table-wrap"><table class="kc-plan-table"><thead><tr><th>Jahr</th><th>Vorhaben</th><th>Kategorie</th><th>Priorität</th><th>Status</th><th>Planbetrag</th><th>Beschluss</th></tr></thead><tbody id="kcInvTable"></tbody></table></div></div>`;
      main.appendChild(sec);
    }
    if(!document.getElementById(RESERVE_VIEW)){
      const sec=document.createElement('section');sec.id=RESERVE_VIEW;sec.className='view';sec.innerHTML=`
        <h3>Fibu – Rücklagenplanung / Mittelbindung</h3>
        <div class="kc-plan-note"><strong>Wichtig:</strong> Eine geplante Rücklage verändert den Bankkontostand nicht. Im Cockpit werden nur ausdrücklich als <em>Gebildet</em> bzw. <em>Teilweise verwendet</em> erfasste Beträge als gebundene Mittel vom frei verfügbaren Betrag abgezogen.</div>
        <div class="kc-plan-summary"><div class="kc-plan-kpi"><span>Rücklagen geplant</span><strong id="kcResTarget">0,00 €</strong></div><div class="kc-plan-kpi"><span>Davon gebunden</span><strong id="kcResBound">0,00 €</strong></div><div class="kc-plan-kpi"><span>Noch aufzubauen</span><strong id="kcResGap">0,00 €</strong></div><div class="kc-plan-kpi"><span>Positionen</span><strong id="kcResCountKpi">0</strong></div></div>
        <div class="panel"><div class="kc-plan-grid">
          <label>Rücklage / Zweck<input id="kcResTitle" placeholder="z. B. Einkauf Weihnachtsmarkt 2027"></label>
          <label>Kategorie<select id="kcResCategory">${options(RESERVE_CATEGORIES,'Wareneinkauf Weihnachtsmarkt')}</select></label>
          <label>Planjahr<input id="kcResYear" type="number" min="2026" max="2100" value="2027"></label>
          <label>Zielbetrag €<input id="kcResTargetAmount" type="number" min="0" step="0.01" value="0"></label>
          <label>Bereits gebunden €<input id="kcResReservedAmount" type="number" min="0" step="0.01" value="0"></label>
          <label>Status<select id="kcResStatus">${options(STATUSES,'Planung')}</select></label>
          <label>Beschlossen am<input id="kcResDecisionDate" type="date"></label>
          <label>Benötigt bis<input id="kcResDueDate" type="date"></label>
          <label class="wide">Finanzierungsquelle<input id="kcResFinancing" placeholder="z. B. Überschuss Weihnachtsmarkt 2026"></label>
          <label class="wide">Zweck / Verwendung<input id="kcResPurpose"></label>
          <label class="full">Notizen<textarea id="kcResNotes" rows="2"></textarea></label>
        </div><div class="button-row"><button id="kcResNew" class="secondary" type="button">Neu</button><button id="kcResSave" class="primary" type="button">Speichern</button><button id="kcResDelete" class="danger" type="button">Löschen</button></div></div>
        <div class="panel"><div class="table-headline"><h3>Rücklagen und gebundene Mittel</h3><strong id="kcResCount">0 Einträge</strong></div><div class="table-wrap"><table class="kc-plan-table"><thead><tr><th>Jahr</th><th>Zweck</th><th>Kategorie</th><th>Status</th><th>Zielbetrag</th><th>Gebunden</th><th>Noch offen</th></tr></thead><tbody id="kcResTable"></tbody></table></div></div>`;
      main.appendChild(sec);
    }
  }
  function val(id){return document.getElementById(id)?.value?.trim?.()||''}
  function num(id){const n=Number(document.getElementById(id)?.value||0);return Number.isFinite(n)?n:0}
  function set(id,v){const e=document.getElementById(id);if(e)e.value=v??''}
  function investments(){return (state.investmentPlanning||[]).filter(x=>x?.planType==='investment')}
  function saveInvestment(){
    const title=val('kcInvTitle');if(!title){alert('Bitte ein Investitionsvorhaben eintragen.');return}
    const old=(state.investmentPlanning||[]).find(x=>x.id===currentInvestmentId);
    const item={...(old||{}),id:currentInvestmentId||uuid('inv'),planType:'investment',date:today(),source:'Investitionsplanung',description:title,title,category:val('kcInvCategory'),year:Number(val('kcInvPlanYear'))||new Date().getFullYear(),amount:num('kcInvAmount'),priority:val('kcInvPriority'),status:val('kcInvStatus')||'Planung',dueDate:val('kcInvDueDate'),decisionDate:val('kcInvDecisionDate'),supplier:val('kcInvSupplier'),financing:val('kcInvFinancing'),purpose:val('kcInvPurpose'),notes:val('kcInvNotes'),updatedAt:new Date().toISOString(),createdAt:old?.createdAt||new Date().toISOString()};
    const i=state.investmentPlanning.findIndex(x=>x.id===item.id);if(i>=0)state.investmentPlanning[i]=item;else state.investmentPlanning.unshift(item);currentInvestmentId=item.id;saveState?.();renderDashboardPlanning();logAction?.('Fibu/Investition',i>=0?'Investition geändert':'Investition angelegt',`${title} · ${money(item.amount)}`);renderInvestment();window.renderFinanceDashboard?.();toast?.('Investitionsplanung gespeichert.','success');
  }
  function newInvestment(){currentInvestmentId='';set('kcInvTitle','');set('kcInvCategory',INVEST_CATEGORIES[0]);set('kcInvPlanYear',new Date().getFullYear()+1);set('kcInvAmount',0);set('kcInvPriority','Soll');set('kcInvStatus','Planung');set('kcInvDueDate','');set('kcInvDecisionDate','');set('kcInvSupplier','');set('kcInvFinancing','');set('kcInvPurpose','');set('kcInvNotes','');renderInvestment()}
  function loadInvestment(id){const x=investments().find(i=>i.id===id);if(!x)return;currentInvestmentId=id;set('kcInvTitle',x.title||x.description);set('kcInvCategory',x.category);set('kcInvPlanYear',x.year);set('kcInvAmount',x.amount);set('kcInvPriority',x.priority);set('kcInvStatus',x.status);set('kcInvDueDate',x.dueDate);set('kcInvDecisionDate',x.decisionDate);set('kcInvSupplier',x.supplier);set('kcInvFinancing',x.financing);set('kcInvPurpose',x.purpose);set('kcInvNotes',x.notes);renderInvestment()}
  function deleteInvestment(){if(!currentInvestmentId)return;if(!confirm('Dieses Investitionsvorhaben wirklich löschen?'))return;state.investmentPlanning=state.investmentPlanning.filter(x=>x.id!==currentInvestmentId);currentInvestmentId='';saveState?.();renderInvestment();newInvestment();renderDashboardPlanning();window.renderFinanceDashboard?.()}
  function renderInvestment(){
    ensureState();const rows=[...investments()].sort((a,b)=>Number(a.year||0)-Number(b.year||0)||String(a.title||'').localeCompare(String(b.title||''),'de'));
    const total=rows.filter(x=>!['Abgeschlossen'].includes(x.status)).reduce((s,x)=>s+Number(x.amount||0),0);const approved=rows.filter(x=>['Beschlossen','Gebildet','Teilweise verwendet'].includes(x.status)).reduce((s,x)=>s+Number(x.amount||0),0);
    document.getElementById('kcInvTotal').textContent=money(total);document.getElementById('kcInvApproved').textContent=money(approved);document.getElementById('kcInvOpen').textContent=String(rows.filter(x=>x.status!=='Abgeschlossen').length);document.getElementById('kcInvYear').textContent=rows.length?String(Math.min(...rows.map(x=>Number(x.year)||9999))):'–';document.getElementById('kcInvCount').textContent=`${rows.length} Einträge`;
    const b=document.getElementById('kcInvTable');b.innerHTML=rows.length?rows.map(x=>`<tr data-id="${esc(x.id)}" class="${x.id===currentInvestmentId?'selected':''}"><td>${esc(x.year)}</td><td>${esc(x.title||x.description)}</td><td>${esc(x.category)}</td><td>${esc(x.priority||'')}</td><td>${esc(x.status||'Planung')}</td><td>${money(x.amount)}</td><td>${esc(x.decisionDate||'–')}</td></tr>`).join(''):'<tr><td colspan="7">Noch keine Investitionsvorhaben angelegt.</td></tr>';b.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>loadInvestment(r.dataset.id));
  }
  function reserves(){return state.reservePlanning||[]}
  function saveReserve(){
    const title=val('kcResTitle');if(!title){alert('Bitte einen Rücklagenzweck eintragen.');return}
    const old=reserves().find(x=>x.id===currentReserveId);const item={...(old||{}),id:currentReserveId||uuid('reserve'),title,category:val('kcResCategory'),year:Number(val('kcResYear'))||new Date().getFullYear(),targetAmount:num('kcResTargetAmount'),reservedAmount:num('kcResReservedAmount'),status:val('kcResStatus')||'Planung',decisionDate:val('kcResDecisionDate'),dueDate:val('kcResDueDate'),financing:val('kcResFinancing'),purpose:val('kcResPurpose'),notes:val('kcResNotes'),updatedAt:new Date().toISOString(),createdAt:old?.createdAt||new Date().toISOString()};
    if(item.reservedAmount>item.targetAmount && item.targetAmount>0 && !confirm('Der gebundene Betrag ist höher als der Zielbetrag. Trotzdem speichern?'))return;
    const i=state.reservePlanning.findIndex(x=>x.id===item.id);if(i>=0)state.reservePlanning[i]=item;else state.reservePlanning.unshift(item);currentReserveId=item.id;saveState?.();renderDashboardPlanning();logAction?.('Fibu/Rücklagen',i>=0?'Rücklage geändert':'Rücklage angelegt',`${title} · Ziel ${money(item.targetAmount)}`);renderReserve();window.renderFinanceDashboard?.();toast?.('Rücklagenplanung gespeichert.','success');
  }
  function newReserve(){currentReserveId='';set('kcResTitle','');set('kcResCategory',RESERVE_CATEGORIES[0]);set('kcResYear',new Date().getFullYear()+1);set('kcResTargetAmount',0);set('kcResReservedAmount',0);set('kcResStatus','Planung');set('kcResDecisionDate','');set('kcResDueDate','');set('kcResFinancing','');set('kcResPurpose','');set('kcResNotes','');renderReserve()}
  function loadReserve(id){const x=reserves().find(i=>i.id===id);if(!x)return;currentReserveId=id;set('kcResTitle',x.title);set('kcResCategory',x.category);set('kcResYear',x.year);set('kcResTargetAmount',x.targetAmount);set('kcResReservedAmount',x.reservedAmount);set('kcResStatus',x.status);set('kcResDecisionDate',x.decisionDate);set('kcResDueDate',x.dueDate);set('kcResFinancing',x.financing);set('kcResPurpose',x.purpose);set('kcResNotes',x.notes);renderReserve()}
  function deleteReserve(){if(!currentReserveId)return;if(currentReserveId==='reserve-wm-2027-purchase'&&!confirm('Auch die vorbereitete Rücklage „Einkauf Weihnachtsmarkt 2027“ löschen?'))return;else if(currentReserveId!=='reserve-wm-2027-purchase'&&!confirm('Diese Rücklagenposition wirklich löschen?'))return;state.reservePlanning=state.reservePlanning.filter(x=>x.id!==currentReserveId);currentReserveId='';saveState?.();renderReserve();newReserve();renderDashboardPlanning();window.renderFinanceDashboard?.()}
  function renderReserve(){
    ensureState();const rows=[...reserves()].sort((a,b)=>Number(a.year||0)-Number(b.year||0)||String(a.title||'').localeCompare(String(b.title||''),'de'));const target=rows.reduce((s,x)=>s+Number(x.targetAmount||0),0);const bound=rows.filter(x=>['Gebildet','Teilweise verwendet'].includes(x.status)).reduce((s,x)=>s+Number(x.reservedAmount||0),0);const gap=Math.max(0,target-rows.reduce((s,x)=>s+Number(x.reservedAmount||0),0));
    document.getElementById('kcResTarget').textContent=money(target);document.getElementById('kcResBound').textContent=money(bound);document.getElementById('kcResGap').textContent=money(gap);document.getElementById('kcResCountKpi').textContent=String(rows.length);document.getElementById('kcResCount').textContent=`${rows.length} Einträge`;
    const b=document.getElementById('kcResTable');b.innerHTML=rows.length?rows.map(x=>`<tr data-id="${esc(x.id)}" class="${x.id===currentReserveId?'selected':''}"><td>${esc(x.year)}</td><td>${esc(x.title)}</td><td>${esc(x.category)}</td><td>${esc(x.status||'Planung')}</td><td>${money(x.targetAmount)}</td><td>${money(x.reservedAmount)}</td><td>${money(Math.max(0,Number(x.targetAmount||0)-Number(x.reservedAmount||0)))}</td></tr>`).join(''):'<tr><td colspan="7">Noch keine Rücklagenpositionen angelegt.</td></tr>';b.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>loadReserve(r.dataset.id));
  }
  function planningSummary(){
    const reserves=Array.isArray(state?.reservePlanning)?state.reservePlanning:[];
    const inv=(Array.isArray(state?.investmentPlanning)?state.investmentPlanning:[]).filter(x=>x?.planType==='investment'&&String(x.status||'')!=='Abgeschlossen');
    const target=reserves.reduce((sum,x)=>sum+Number(x.targetAmount||0),0);
    const bound=reserves.filter(x=>['Gebildet','Teilweise verwendet'].includes(String(x.status||''))).reduce((sum,x)=>sum+Number(x.reservedAmount||0),0);
    const invTotal=inv.reduce((sum,x)=>sum+Number(x.amount||0),0);
    const accounts=Array.isArray(state?.bankAccounts)?state.bankAccounts.filter(x=>x?.active!==false&&Number.isFinite(Number(x?.currentBalance))):[];
    const bankBalance=accounts.length?accounts.reduce((sum,x)=>sum+Number(x.currentBalance||0),0):null;
    const wm=reserves.find(x=>x?.id==='reserve-wm-2027-purchase'||/weihnachtsmarkt 2027/i.test(String(x?.title||'')));
    return {target,bound,invTotal,bankBalance,free:bankBalance==null?null:bankBalance-bound,wm,reserveCount:reserves.length,investmentCount:inv.length};
  }
  function injectDashboard(){
    const host=document.getElementById('dashboardFinanceStats');if(!host||document.getElementById('kcFinancePlanDashboardPanel'))return;
    const p=document.createElement('div');p.id='kcFinancePlanDashboardPanel';p.className='panel';p.innerHTML=`
      <div class="table-headline"><h3>Investitionen & Rücklagen</h3><span>Planung / Mittelbindung</span></div>
      <div class="kc-plan-summary">
        <div class="kc-plan-kpi"><span>Rücklagen geplant</span><strong id="kcDashReserveTarget">0,00 €</strong></div>
        <div class="kc-plan-kpi"><span>Gebundene Mittel</span><strong id="kcDashReserveBound">0,00 €</strong></div>
        <div class="kc-plan-kpi"><span>Investitionen geplant</span><strong id="kcDashInvestmentTotal">0,00 €</strong></div>
        <div class="kc-plan-kpi"><span>Frei verfügbar*</span><strong id="kcDashFree">–</strong></div>
      </div>
      <div class="table-wrap compact-table"><table><thead><tr><th>Position</th><th>Planbetrag</th><th>Status</th><th>Hinweis</th></tr></thead><tbody id="kcDashPlanningTable"></tbody></table></div>
      <p class="muted">* Frei verfügbar = gespeicherter Bankkontostand minus tatsächlich gebundene Mittel. Reine Planbeträge vermindern den Kontostand nicht.</p>
      <div class="button-row"><button id="kcDashOpenInvest" class="secondary" type="button">Investitionsplanung</button><button id="kcDashOpenReserve" class="primary" type="button">Rücklagenplanung</button></div>`;
    const firstPanel=host.querySelector('.panel');if(firstPanel)host.insertBefore(p,firstPanel);else host.appendChild(p);
    p.querySelector('#kcDashOpenInvest').onclick=openInvestment;p.querySelector('#kcDashOpenReserve').onclick=openReserve;
  }
  function renderDashboardPlanning(){
    injectDashboard();const x=planningSummary();
    const setText=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    setText('kcDashReserveTarget',money(x.target));setText('kcDashReserveBound',money(x.bound));setText('kcDashInvestmentTotal',money(x.invTotal));setText('kcDashFree',x.free==null?'–':money(x.free));
    const b=document.getElementById('kcDashPlanningTable');if(!b)return;
    const rows=[];
    if(x.wm)rows.push(`<tr><td>${esc(x.wm.title||'Einkauf Weihnachtsmarkt 2027')}</td><td>${money(x.wm.targetAmount)}</td><td>${esc(x.wm.status||'Planung')}</td><td>Material-/Wareneinkauf Folgejahr</td></tr>`);
    rows.push(`<tr><td>Rücklagen gesamt</td><td>${money(x.target)}</td><td>${x.reserveCount} Position(en)</td><td>davon ${money(x.bound)} tatsächlich gebunden</td></tr>`);
    rows.push(`<tr><td>Investitionen gesamt</td><td>${money(x.invTotal)}</td><td>${x.investmentCount} offen</td><td>größere Anschaffungen / Ersatzbeschaffung</td></tr>`);
    b.innerHTML=rows.join('');
  }
  function bind(){
    document.getElementById('kcInvNew').onclick=newInvestment;document.getElementById('kcInvSave').onclick=saveInvestment;document.getElementById('kcInvDelete').onclick=deleteInvestment;
    document.getElementById('kcResNew').onclick=newReserve;document.getElementById('kcResSave').onclick=saveReserve;document.getElementById('kcResDelete').onclick=deleteReserve;
  }
  function openInvestment(){showView?.(INVEST_VIEW);renderInvestment()}
  function openReserve(){showView?.(RESERVE_VIEW);renderReserve();if(!currentReserveId){const seed=reserves().find(x=>x.id==='reserve-wm-2027-purchase');if(seed)loadReserve(seed.id)}}
  function init(){ensureState();injectStyle();injectNavigation();injectViews();injectDashboard();bind();renderInvestment();renderReserve();renderDashboardPlanning();window.KCFibuPlanning={version:'1.0.0',renderInvestment,renderReserve,openInvestment,openReserve,investmentCategories:INVEST_CATEGORIES,reserveCategories:RESERVE_CATEGORIES,renderDashboardPlanning};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
