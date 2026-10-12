/* KC Verwaltung 54.8.10 – Adressmodul -> zentraler KC Communicator */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  const splitEmails=value=>[...new Set(String(value||'').split(/[;,\n]+/).map(x=>x.trim().toLowerCase()).filter(validEmail))];
  let transferPending=false;

  function clearMainRecipients(){
    document.querySelectorAll('#commMemberList input[type="checkbox"]').forEach(cb=>{cb.checked=false;});
    const all=$('commSelectAll');if(all){all.checked=false;all.indeterminate=false;}
    let guard=0;
    while(document.querySelector('#kcRecipientSummary [data-kc-remove]')&&guard++<100){document.querySelector('#kcRecipientSummary [data-kc-remove]').click();}
    for(const role of ['CC','BCC']){
      guard=0;
      while(document.querySelector('#kc'+role+'List button[data-email]')&&guard++<100){document.querySelector('#kc'+role+'List button[data-email]').click();}
    }
  }

  function addMainRecipient(email){
    const input=$('kcManualEmail'),button=$('kcManualAdd');
    if(!input||!button)return false;
    input.value=email;
    button.click();
    return true;
  }

  function transferFromPreparedDialog(){
    if(transferPending)return;
    const dialog=$('addressEmailDialog'),to=$('addrEmailTo');
    if(!dialog||!to)return;
    const emails=splitEmails(to.value);
    if(!emails.length){
      if(dialog.open)dialog.close();
      window.toast?.('Für diese Adresse ist keine gültige E-Mail-Adresse hinterlegt.','warn');
      return;
    }
    transferPending=true;
    const subject=String($('addrEmailSubject')?.value||'Nachricht vom Köcheclub');
    const body=String($('addrEmailBody')?.value||'Guten Tag,\n\n');
    if(dialog.open)dialog.close();
    try{ if(typeof window.showView==='function')window.showView('communication'); }catch(_e){}
    setTimeout(()=>{
      try{
        clearMainRecipients();
        const subjectEl=$('commSubject'),bodyEl=$('commBody');
        if(subjectEl){subjectEl.value=subject;subjectEl.dispatchEvent(new Event('input',{bubbles:true}));}
        if(bodyEl){bodyEl.value=body;bodyEl.dispatchEvent(new Event('input',{bubbles:true}));}
        let added=0;emails.forEach(email=>{if(addMainRecipient(email))added++;});
        window.toast?.(added===1?'Adresse wurde in den KC Communicator übernommen.':added+' Adressen wurden in den KC Communicator übernommen.','success');
        setTimeout(()=>$('commSubject')?.focus(),60);
      }finally{transferPending=false;}
    },120);
  }

  function modernizeDialog(){
    const btn=$('addrSendMailto');
    if(btn){btn.textContent='Im KC Communicator öffnen';btn.title='Adresse und Nachricht in den zentralen KC Communicator übernehmen';}
    const title=$('addressEmailDialog')?.querySelector('h3');if(title)title.textContent='Nachricht für KC Communicator vorbereiten';
  }

  function bind(){
    modernizeDialog();
    document.addEventListener('click',ev=>{
      const id=ev.target?.closest?.('button')?.id||'';
      if(['addrEmail','addrIconEmail','addrMailFiltered'].includes(id)){
        /* Das bestehende Adressmodul bereitet synchron seine Empfängerliste vor. Danach übernehmen wir sie zentral. */
        setTimeout(transferFromPreparedDialog,0);
      }else if(id==='addrSendMailto'){
        ev.preventDefault();ev.stopImmediatePropagation();transferFromPreparedDialog();
      }
    },false);
    const root=$('addresses');
    if(root){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;modernizeDialog();},0);}).observe(root,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,900),{once:true});else setTimeout(bind,900);
})();
