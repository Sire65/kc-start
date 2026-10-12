/* KC Verwaltung 54.8.4 – kompakte Kommunikation + Verstorbenenfilter */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim().toLowerCase();

  function isDeceased(m){
    if(!m)return false;
    const flags=[m.exitReason,m.status,m.memberStatus,m.personStatus,m.lifecycleStatus,m.memberNotes]
      .map(norm).join(' ');
    return m.deceased===true||m.isDeceased===true||Boolean(m.deathDate||m.dateOfDeath||m.deceasedAt)||flags.includes('verstorben');
  }
  function deceasedIds(){
    return new Set((window.state?.members||[]).filter(isDeceased).map(m=>String(m.id||'')));
  }
  function cleanRecipientRows(){
    const box=$('commMemberList');if(!box)return;
    const dead=deceasedIds();
    box.querySelectorAll('label.comm-member-row').forEach(row=>{
      const cb=row.querySelector('input[type="checkbox"]');
      if(cb&&dead.has(String(cb.value||''))){cb.checked=false;row.remove();}
    });
    const visible=box.querySelectorAll('input[type="checkbox"]').length;
    const title=box.closest('.communication-member-picker')?.querySelector('.list-head h4');
    if(title)title.textContent='Mitglieder auswählen'+(visible?` · ${visible}`:'');
  }
  function injectStyle(){
    if($('kcComm5484Style'))return;
    const s=document.createElement('style');s.id='kcComm5484Style';s.textContent=`
      #communication .communication-member-picker{padding:14px 16px!important;border-radius:12px!important}
      #communication .communication-member-picker .list-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;margin-bottom:6px!important}
      #communication .communication-member-picker .list-head h4{margin:0!important;white-space:nowrap}
      #communication #commMemberSearch{width:min(320px,42vw)!important;min-width:210px!important}
      #communication .member-select-all-row{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;width:max-content!important;margin:6px 0 8px 2px!important;padding:2px 0!important;font-weight:700!important;text-align:left!important}
      #communication #commMemberList.communication-member-list{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px 12px!important;max-height:300px!important;overflow:auto!important;padding:6px 4px 8px!important;align-content:start!important}
      #communication #commMemberList .comm-member-row{display:grid!important;grid-template-columns:20px 68px minmax(90px,1fr) auto!important;align-items:center!important;column-gap:6px!important;min-height:38px!important;margin:0!important;padding:5px 7px!important;border:1px solid #e7ece8!important;border-radius:8px!important;background:#fff!important;box-sizing:border-box!important}
      #communication #commMemberList .comm-member-row:hover{background:#f5f8f5!important}
      #communication #commMemberList .comm-member-row input{margin:0!important}
      #communication #commMemberList .comm-member-row span{font-size:12px!important;white-space:nowrap!important}
      #communication #commMemberList .comm-member-row strong{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #communication #commMemberList .comm-member-row small{font-size:11px!important;white-space:nowrap!important;text-align:right!important}
      #communication #kcRecipientTools{margin-top:10px!important}
      #communication>h3{margin-bottom:8px!important}
      @media(max-width:1250px){#communication #commMemberList.communication-member-list{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:760px){#communication .communication-member-picker .list-head{align-items:flex-start!important;flex-direction:column!important}#communication #commMemberSearch{width:100%!important;min-width:0!important}#communication #commMemberList.communication-member-list{grid-template-columns:1fr!important;max-height:360px!important}}
    `;document.head.appendChild(s);
  }
  function bindSelectAll(){
    const all=$('commSelectAll');if(!all||all.dataset.kc5484Bound)return;
    all.dataset.kc5484Bound='1';
    all.addEventListener('change',()=>{
      cleanRecipientRows();
      document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(cb=>cb.checked=all.checked);
      setTimeout(()=>window.KCRecipient5483?.refresh?.(),0);
    },true);
  }
  function observe(){
    const box=$('commMemberList');if(!box||box.dataset.kc5484Observed)return;
    box.dataset.kc5484Observed='1';
    let busy=false;
    new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{cleanRecipientRows();busy=false;});}).observe(box,{childList:true,subtree:false});
  }
  function apply(){injectStyle();cleanRecipientRows();bindSelectAll();observe();}
  function start(){apply();setTimeout(apply,150);setTimeout(apply,600);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('kc:communication-rendered',apply);
  window.KCCommLayout5484={apply,isDeceased};
})();