/* KC Verwaltung – Reisen/Ausflüge: Beschlussdaten */
(function(){
  'use strict';

  function ensureFields(){
    if(document.getElementById('activityDecisionDate') && document.getElementById('activityCostApprovalDate')) return;
    const dateTo=document.getElementById('activityDateTo');
    if(!dateTo) return;
    const dateToLabel=dateTo.closest('label');
    if(!dateToLabel?.parentNode) return;

    if(!document.getElementById('activityDecisionDate')){
      const l=document.createElement('label');
      l.innerHTML='Beschlossen am<input id="activityDecisionDate" type="date">';
      dateToLabel.insertAdjacentElement('afterend',l);
    }
    if(!document.getElementById('activityCostApprovalDate')){
      const decision=document.getElementById('activityDecisionDate')?.closest('label') || dateToLabel;
      const l=document.createElement('label');
      l.innerHTML='Kosten genehmigt / beschlossen am<input id="activityCostApprovalDate" type="date">';
      decision.insertAdjacentElement('afterend',l);
    }
  }

  function wrapFunctions(){
    const oldReset=window.resetActivityForm;
    if(typeof oldReset==='function' && !oldReset.__kcDecisionWrapped){
      const wrapped=function(){
        const r=oldReset.apply(this,arguments);
        ensureFields();
        const d=document.getElementById('activityDecisionDate'); if(d) d.value='';
        const c=document.getElementById('activityCostApprovalDate'); if(c) c.value='';
        return r;
      };
      wrapped.__kcDecisionWrapped=true;
      window.resetActivityForm=wrapped;
    }

    const oldFrom=window.activityFromForm;
    if(typeof oldFrom==='function' && !oldFrom.__kcDecisionWrapped){
      const wrapped=function(){
        ensureFields();
        const data=oldFrom.apply(this,arguments) || {};
        data.decisionDate=document.getElementById('activityDecisionDate')?.value||'';
        data.costApprovalDate=document.getElementById('activityCostApprovalDate')?.value||'';
        return data;
      };
      wrapped.__kcDecisionWrapped=true;
      window.activityFromForm=wrapped;
    }

    const oldTo=window.activityToForm;
    if(typeof oldTo==='function' && !oldTo.__kcDecisionWrapped){
      const wrapped=function(a){
        ensureFields();
        const r=oldTo.apply(this,arguments);
        if(a){
          const d=document.getElementById('activityDecisionDate'); if(d) d.value=a.decisionDate||'';
          const c=document.getElementById('activityCostApprovalDate'); if(c) c.value=a.costApprovalDate||'';
        }
        return r;
      };
      wrapped.__kcDecisionWrapped=true;
      window.activityToForm=wrapped;
    }
  }

  function init(){ ensureFields(); wrapFunctions(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
