/* Test 44 – stabile laufende Analoguhr + Benutzername im Namensschild */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  function st(){
    try{
      if(window.__kngStateRef && typeof window.__kngStateRef==='object') return window.__kngStateRef;
      if(window.state && typeof window.state==='object') return window.state;
      return (0,eval)('typeof state!=="undefined" ? state : {}') || {};
    }catch(_e){ return {}; }
  }
  function sessionName(){
    const s=st();
    const sess=s.session || {};
    const vals=[sess.displayName,sess.fullName,sess.name,sess.userName,sess.userKey,sess.role]
      .map(v=>String(v||'').trim()).filter(Boolean);
    let name=vals.find(v=>v && !/^gast$/i.test(v) && !/^guest$/i.test(v));
    if(!name && sess.isLoggedIn) name='Benutzer';
    if(!name) name='Gast';
    return name;
  }
  function clockEnabled(){
    const s=st();
    if(s.settings && s.settings.secretariatClock===false) return false;
    try{
      const p=(typeof window.getUserPrefsObject==='function') ? window.getUserPrefsObject() : null;
      if(p && p.clockEnabled===false) return false;
    }catch(_e){}
    return true;
  }
  function ensureClock(){
    const office=$('.secretary-office');
    if(!office) return null;
    let c=$('.secretary-clock-live',office);
    if(!c){
      c=document.createElement('div');
      c.className='secretary-clock-live';
      c.setAttribute('aria-label','laufende Uhr');
      c.innerHTML='<i class="h"></i><i class="m"></i><i class="s"></i>';
      office.appendChild(c);
    }
    c.style.display=clockEnabled()?'':'none';
    return c;
  }
  function updateClock(){
    const c=ensureClock();
    if(!c) return;
    const d=new Date();
    const sec=d.getSeconds();
    const min=d.getMinutes()+sec/60;
    const hr=(d.getHours()%12)+min/60;
    const h=$('.h',c), m=$('.m',c), s=$('.s',c);
    if(h) h.style.setProperty('--rot',(hr*30)+'deg');
    if(m) m.style.setProperty('--rot',(min*6)+'deg');
    if(s) s.style.setProperty('--rot',(sec*6)+'deg');
  }
  function ensureNameplate(){
    const office=$('.secretary-office');
    if(!office) return null;
    let p=$('.secretary-nameplate-live',office);
    if(!p){
      p=document.createElement('div');
      p.className='secretary-nameplate-live';
      p.setAttribute('aria-label','Angemeldeter Benutzer');
      p.innerHTML='<strong id="secretaryLiveUserName"></strong>';
      office.appendChild(p);
    }
    let n=$('#secretaryLiveUserName',p);
    if(!n){ p.innerHTML='<strong id="secretaryLiveUserName"></strong>'; n=$('#secretaryLiveUserName',p); }
    return n;
  }
  function updateName(){
    const n=ensureNameplate();
    const name=sessionName();
    if(n && n.textContent!==name) n.textContent=name; // 54.8.20 Startfix: nur bei Änderung schreiben (Beobachter-Schleife)
  }
  function tick(){
    updateClock();
    updateName();
  }
  function patchLoginHooks(){
    ['doLogin','logout','applySession','renderSession','saveState'].forEach(fn=>{
      const old=window[fn];
      if(typeof old!=='function' || old.__kng44ClockNameFix) return;
      const patched=function(){
        const r=old.apply(this,arguments);
        setTimeout(tick,0); setTimeout(tick,150); setTimeout(tick,500);
        return r;
      };
      patched.__kng44ClockNameFix=true;
      window[fn]=patched;
    });
  }
  function init(){
    patchLoginHooks();
    tick();
    if(!window.__kng44ClockNameFixTimer){
      window.__kng44ClockNameFixTimer=setInterval(tick,1000);
    }
    const office=$('.secretary-office');
    if(office && !office.__kng44Observer){
      office.__kng44Observer=new MutationObserver(()=>setTimeout(tick,0));
      office.__kng44Observer.observe(office,{childList:true,subtree:false,attributes:true});
    }
  }
  if(window.App && typeof App.registerInit==='function'){
    App.registerInit('secretariat-clock-name-fix-44',init);
    if(App._started) setTimeout(init,0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else setTimeout(init,0);
  window.KNGSecretariatClockNameFix44={init,tick,updateClock,updateName};
})();
