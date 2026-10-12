/* KC Verwaltung 54.8.8 – freie E-Mail + Push; Observer-Endlosschleife behoben */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  let autoTimer=0;

  function memberTargetsPresent(){
    const type=$('commRecipientType')?.value||'members';
    if(type==='all'||type==='group'||type==='committee')return true;
    return !!document.querySelector('#commMemberList input[type="checkbox"]:checked');
  }

  function syncPushAvailability(){
    const cb=$('kcSendPushNotice'),note=$('kcPushNoticeHint');
    if(!cb)return;
    const available=memberTargetsPresent();
    const shouldDisable=!available;
    if(cb.disabled!==shouldDisable)cb.disabled=shouldDisable;
    if(!available&&cb.checked)cb.checked=false;
    const text=available
      ?'Zusätzlich erhalten ausgewählte KC-Mitglieder eine kurze Push-Mitteilung, dass eine E-Mail unterwegs ist.'
      :'Push ist nur möglich, wenn mindestens ein KC-Mitglied als Empfänger ausgewählt ist.';
    if(note&&note.textContent!==text)note.textContent=text;
  }

  function injectPushOption(){
    if($('kcPushNoticeBox')){syncPushAvailability();return;}
    const host=$('kcCommCloudState')?.parentElement||$('kcRecipientTools');
    if(!host)return;
    const row=document.createElement('div');
    row.id='kcPushNoticeBox';
    row.style.cssText='margin-top:10px;padding:9px 11px;border:1px solid #d8e2da;border-radius:9px;background:#f7fbf7';
    row.innerHTML='<label style="display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer"><input id="kcSendPushNotice" type="checkbox"> Zusätzlich Push an ausgewählte KC-Mitglieder</label><div id="kcPushNoticeHint" style="margin:4px 0 0 24px;font-size:12px;color:#667085"></div>';
    const cloud=$('kcCommCloudState');
    if(cloud)cloud.insertAdjacentElement('beforebegin',row);else host.appendChild(row);
    syncPushAvailability();
  }

  function autoAddManual(){
    const input=$('kcManualEmail'),button=$('kcManualAdd');
    if(!input||!button)return;
    const email=input.value.trim();
    if(!validEmail(email))return;
    button.click();
  }

  function bindManualAutoAdd(){
    const input=$('kcManualEmail');
    if(!input||input.dataset.kc5485Bound)return;
    input.dataset.kc5485Bound='1';
    input.addEventListener('input',()=>{
      clearTimeout(autoTimer);
      autoTimer=setTimeout(()=>{if(validEmail(input.value))autoAddManual();},650);
    });
    input.addEventListener('blur',()=>{if(validEmail(input.value))autoAddManual();});
  }

  function wrapFetch(){
    if(window.__kc5485FetchWrapped)return;
    window.__kc5485FetchWrapped=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      try{
        const url=typeof input==='string'?input:(input?.url||'');
        if(String(url).includes('/functions/v1/kc-communication-send-v2')&&init?.body){
          const body=typeof init.body==='string'?JSON.parse(init.body):null;
          if(body&&typeof body==='object'){
            body.sendPushNotice=!!$('kcSendPushNotice')?.checked;
            init={...init,body:JSON.stringify(body)};
          }
        }
      }catch(_e){}
      return nativeFetch(input,init);
    };
  }

  function observe(){
    const comm=$('communication');if(!comm||window.__kc5488CommObserver)return;
    window.__kc5488CommObserver=true;
    comm.addEventListener('change',e=>{
      if(e.target?.matches?.('#commMemberList input[type="checkbox"],#commRecipientType,#commGroupSelect,#commSelectAll'))setTimeout(syncPushAvailability,0);
    },true);
    let queued=false;
    const mo=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      setTimeout(()=>{
        queued=false;
        injectPushOption();
        bindManualAutoAdd();
        syncPushAvailability();
      },0);
    });
    mo.observe(comm,{childList:true,subtree:true});
  }

  function init(){wrapFetch();injectPushOption();bindManualAutoAdd();observe();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500),{once:true});else setTimeout(init,500);
})();
