/* KC Verwaltung 54.8.4 – persistente Supabase-Sitzung fuer den KC Communicator */
(function(){
  'use strict';
  const SUPA='https://ptblnpiroqftcvlsrhac.supabase.co';
  const KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
  const ACCESS_KEY='kc_manager_access_token';
  const REFRESH_KEY='kc_manager_refresh_token';
  const nativeFetch=window.fetch.bind(window);

  function saveTokens(data){
    try{
      if(data?.access_token) sessionStorage.setItem(ACCESS_KEY,String(data.access_token));
      if(data?.refresh_token) localStorage.setItem(REFRESH_KEY,String(data.refresh_token));
      window.dispatchEvent(new CustomEvent('kc:cloud-session',{detail:{connected:!!data?.access_token}}));
    }catch(_e){}
  }
  function clearTokens(){
    try{sessionStorage.removeItem(ACCESS_KEY);localStorage.removeItem(REFRESH_KEY);window.dispatchEvent(new CustomEvent('kc:cloud-session',{detail:{connected:false}}));}catch(_e){}
  }

  if(!window.__kcPersistentCloudSessionInstalled){
    window.__kcPersistentCloudSessionInstalled=true;
    window.fetch=async function(input,init){
      const response=await nativeFetch(input,init);
      try{
        const url=typeof input==='string'?input:String(input?.url||'');
        if(url.includes('/auth/v1/token')&&response.ok){
          const data=await response.clone().json();
          saveTokens(data);
        }else if(url.includes('/auth/v1/logout')&&response.ok){
          clearTokens();
        }
      }catch(_e){}
      return response;
    };
  }

  async function signIn(email,password){
    const mail=String(email||'').trim();
    const pass=String(password||'');
    if(!mail || !pass) throw new Error('E-Mail-Adresse und Passwort erforderlich.');
    const r=await nativeFetch(SUPA+'/auth/v1/token?grant_type=password',{
      method:'POST',cache:'no-store',
      headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({email:mail,password:pass})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok || !data?.access_token){
      // Ein falscher Password-Grant darf eine bereits vorhandene, noch nutzbare
      // Refresh-Sitzung nicht vernichten. Das ist wichtig für den lokalen KC-Adminzugang.
      sessionStorage.removeItem(ACCESS_KEY);
      throw new Error(String(data?.error_description||data?.msg||data?.message||'E-Mail-Adresse oder Passwort ist ungültig.'));
    }
    saveTokens(data);
    return data;
  }

  async function refresh(){
    const refreshToken=localStorage.getItem(REFRESH_KEY)||'';
    if(!refreshToken)return false;
    try{
      const r=await nativeFetch(SUPA+'/auth/v1/token?grant_type=refresh_token',{method:'POST',cache:'no-store',headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({refresh_token:refreshToken})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data?.access_token){clearTokens();return false;}
      saveTokens(data);
      return true;
    }catch(_e){return false;}
  }

  function accessTokenUsable(){
    const t=sessionStorage.getItem(ACCESS_KEY)||'';if(!t)return false;
    try{const part=t.split('.')[1];const json=atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='));const exp=Number(JSON.parse(json)?.exp||0);return exp>Date.now()/1000+60;}catch(_e){return false;}
  }

  async function ready(){
    if(accessTokenUsable())return true;
    sessionStorage.removeItem(ACCESS_KEY);
    return await refresh();
  }

  window.KCCloudSession={ready,refresh,signIn,clear:clearTokens,isConnected:()=>!!sessionStorage.getItem(ACCESS_KEY)};
  window.__kcCloudSessionReady=ready();
})();