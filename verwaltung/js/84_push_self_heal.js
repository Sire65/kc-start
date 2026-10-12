/* KC Verwaltung 54.8.16 RC20 – Push-Selbstheilung via abgesicherter RPC */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const ACCESS_KEY='kc_manager_access_token';
  const VAPID_PUBLIC='BDT3rn184YhCvv19U9Sphu6XVPOexLngMr8xpv1mxKLH640GJXk5f3xCuhuHWIvdWK8YVTj7N3tj3VmDDx656Vg';
  let running=false,lastRun=0;
  function b64urlToBytes(s){const pad='='.repeat((4-s.length%4)%4),raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  function deviceLabel(){const ua=navigator.userAgent||'';if(/Android/i.test(ua))return 'Android-Handy';if(/iPhone|iPad/i.test(ua))return 'iPhone/iPad';if(/Windows/i.test(ua))return 'KC Verwaltung · Windows';return 'KC Verwaltung · '+(navigator.platform||'Gerät');}
  async function authToken(){let t=sessionStorage.getItem(ACCESS_KEY)||'';if(t)return t;try{if(await window.KCCloudSession?.ready?.())t=sessionStorage.getItem(ACCESS_KEY)||'';}catch(_e){}return t;}
  async function registerRemote(sub){
    const token=await authToken();if(!token)throw new Error('Keine Supabase-Sitzung für Push-Registrierung');
    const j=sub.toJSON(),endpoint=String(j.endpoint||sub.endpoint||''),p256dh=String(j.keys?.p256dh||''),auth=String(j.keys?.auth||'');
    if(!endpoint||!p256dh||!auth)throw new Error('Push-Subscription unvollständig');
    const r=await fetch(SUPA+'/rest/v1/rpc/kc_communication_register_push_device',{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_endpoint:endpoint,p_p256dh:p256dh,p_auth_key:auth,p_expiration_time:j.expirationTime??null,p_user_agent:navigator.userAgent||'',p_device_label:deviceLabel()})});
    const text=await r.text(); let data=null; try{data=text?JSON.parse(text):null;}catch(_e){data=null;}
    if(!r.ok)throw new Error('Push-Gerät konnte nicht registriert werden: '+text.slice(0,180));
    return data||{ok:true,renewRequired:false};
  }
  async function freshSubscription(reg){
    const old=await reg.pushManager.getSubscription();
    if(old){try{await old.unsubscribe();}catch(_e){}}
    return await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64urlToBytes(VAPID_PUBLIC)});
  }
  async function heal(force=false){
    if(running)return false;if(!force&&Date.now()-lastRun<30000)return false;
    if(!navigator.onLine||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))return false;
    running=true;lastRun=Date.now();
    try{
      if(!(await authToken()))return false;
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      // Niemals ungefragt einen Browser-Permissiondialog erzeugen. Ist die Berechtigung
      // bereits erteilt, darf eine verlorene Subscription vollautomatisch erneuert werden.
      if(!sub&&Notification.permission==='granted')sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64urlToBytes(VAPID_PUBLIC)});
      if(!sub){window.KCPushSelfHealStatus={ok:false,reason:Notification.permission==='denied'?'permission-denied':'permission-needed',at:new Date().toISOString()};return false;}
      let result=await registerRemote(sub);
      // Ein bereits serverseitig wegen HTTP 410 deaktivierter Endpoint darf nicht
      // wieder aktiviert werden. Browser-Subscription wirklich erneuern.
      if(result?.renewRequired){
        if(Notification.permission!=='granted')throw new Error('Push-Erneuerung benötigt Benachrichtigungsberechtigung');
        sub=await freshSubscription(reg);
        result=await registerRemote(sub);
      }
      if(result?.renewRequired||result?.ok===false)throw new Error('Push-Endpoint konnte nicht erneuert werden');
      window.KCPushSelfHealStatus={ok:true,reason:'registered-fresh',at:new Date().toISOString(),device:deviceLabel(),deviceId:result?.deviceId||null};
      window.dispatchEvent(new CustomEvent('kc:push-self-healed',{detail:{ok:true,device:deviceLabel()}}));
      return true;
    }catch(e){console.warn('KC Push Selbstheilung:',e);window.KCPushSelfHealStatus={ok:false,reason:String(e?.message||e),at:new Date().toISOString()};return false;}
    finally{running=false;}
  }
  window.KCPushSelfHeal={heal,status:()=>window.KCPushSelfHealStatus||null};
  window.addEventListener('kc:cloud-session',e=>{if(e.detail?.connected)setTimeout(()=>heal(true),250);});
  window.addEventListener('online',()=>setTimeout(()=>heal(true),500));
  navigator.serviceWorker?.addEventListener?.('message',e=>{if(e.data?.type==='kc:push-received')setTimeout(()=>heal(true),100);});
  setTimeout(()=>heal(true),1200);
  setInterval(()=>heal(false),15*60*1000);
})();
