/* Test 45 – robuste Sekretariats-Uhr und Benutzername im Messingschild */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  function getState(){
    try{ if(window.__kngStateRef && typeof window.__kngStateRef==='object') return window.__kngStateRef; }catch(e){}
    try{ if(window.state && typeof window.state==='object') return window.state; }catch(e){}
    try{ return (0,eval)('typeof state !== "undefined" ? state : null') || {}; }catch(e){ return {}; }
  }
  function readStoredState(){
    try{
      const raw=localStorage.getItem('kng_v1_clean_master_test31_membercards');
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function clean(v){ return String(v||'').trim(); }
  function realUserName(){
    const s=getState();
    const stored=readStoredState();
    const sess=(s.session && Object.keys(s.session).length ? s.session : stored?.session) || {};
    const domUser=clean($('#cardUser')?.textContent || '').replace(/^Benutzer:\s*/i,'');
    const topUser=clean($('#sessionName')?.textContent || '').replace(/^Benutzer:\s*/i,'').replace(/^Gastmodus$/i,'');
    const accountKey=clean(sess.userKey || sess.email || '');
    const accounts=Array.isArray(s.users) ? s.users : (Array.isArray(stored?.users) ? stored.users : []);
    const acc=accounts.find(u=>{
      const keys=[u.userName,u.name,u.email,u.userKey,u.id].map(x=>clean(x).toLowerCase());
      return accountKey && keys.includes(accountKey.toLowerCase());
    });
    const candidates=[
      sess.displayName, sess.fullName, sess.name, sess.userName,
      acc?.displayName, acc?.fullName, acc?.name, acc?.userName,
      domUser, topUser
    ].map(clean).filter(Boolean).filter(v=>!/^gast$/i.test(v) && !/^guest$/i.test(v) && !/^nicht angemeldet$/i.test(v));
    return candidates[0] || (sess.isLoggedIn ? 'Benutzer' : 'Gast');
  }
  function clockWanted(){
    const s=getState();
    if(s.settings && s.settings.secretariatClock===false) return false;
    try{ const p=typeof window.getUserPrefsObject==='function' ? window.getUserPrefsObject() : null; if(p && p.clockEnabled===false) return false; }catch(e){}
    return true;
  }
  function ensureOffice(){
    const office=$('.secretary-office');
    if(!office) return null;
    // 54.8.20 Startfix: nur fehlende Klassen setzen – classList.add() meldet auch ohne Änderung eine Attribut-Mutation,
    // die die Beobachter (hier und in 23_) erneut auslöste; zusammen mit dem Namensschild schaukelte sich das zur Endlosschleife auf.
    ['realistic','secretary-test42'].forEach(k=>{ if(!office.classList.contains(k)) office.classList.add(k); });
    return office;
  }
  function ensureClock(){
    const office=ensureOffice(); if(!office) return null;
    let c=$('.secretary-clock-live',office);
    if(!c){ c=document.createElement('div'); c.className='secretary-clock-live'; office.appendChild(c); }
    c.setAttribute('aria-label','laufende Analoguhr');
    if(!c.dataset.kng45){
      c.innerHTML='<span class="num n12">12</span><span class="num n3">3</span><span class="num n6">6</span><span class="num n9">9</span><i class="h"></i><i class="m"></i><i class="s"></i>';
      c.dataset.kng45='1';
    }
    c.style.display=clockWanted() ? 'block' : 'none';
    return c;
  }
  function setHands(){
    const c=ensureClock(); if(!c) return;
    const d=new Date();
    const sec=d.getSeconds()+d.getMilliseconds()/1000;
    const min=d.getMinutes()+sec/60;
    const hr=(d.getHours()%12)+min/60;
    const h=$('.h',c), m=$('.m',c), s=$('.s',c);
    if(h) h.style.setProperty('--rot',(hr*30).toFixed(2)+'deg');
    if(m) m.style.setProperty('--rot',(min*6).toFixed(2)+'deg');
    if(s) s.style.setProperty('--rot',(sec*6).toFixed(2)+'deg');
  }
  function ensureNameplate(){
    const office=ensureOffice(); if(!office) return null;
    let p=$('.secretary-nameplate-live',office);
    if(!p){ p=document.createElement('div'); p.className='secretary-nameplate-live'; office.appendChild(p); }
    p.setAttribute('aria-label','Angemeldeter Benutzer');
    if(!p.querySelector('strong')) p.innerHTML='<strong id="secretaryLiveUserName"></strong>';
    let n=$('#secretaryLiveUserName',p) || p.querySelector('strong');
    if(n && n.id!=='secretaryLiveUserName') n.id='secretaryLiveUserName';
    return n;
  }
  function setName(){
    const n=ensureNameplate(); if(!n) return;
    const name=realUserName();
    if(n.textContent!==name) n.textContent=name; // 54.8.20: nur bei Änderung schreiben (sonst Mutation -> Beobachter -> Schleife)
    if(n.title!==name) n.title=name;
  }
  function update(){ setHands(); setName(); }
  function patch(fn){
    const old=window[fn];
    if(typeof old!=='function' || old.__kng45ClockName) return;
    const wrapped=function(){
      const r=old.apply(this,arguments);
      setTimeout(update,0); setTimeout(update,80); setTimeout(update,250); setTimeout(update,700);
      return r;
    };
    wrapped.__kng45ClockName=true;
    window[fn]=wrapped;
  }
  function init(){
    ['doLogin','logout','applySession','showView','saveState'].forEach(patch);
    update();
    if(!window.__kng45ClockNameTimer){ window.__kng45ClockNameTimer=setInterval(update,500); }
    const sec=document.getElementById('secretariat');
    if(sec && !sec.__kng45Obs){
      sec.__kng45Obs=new MutationObserver(()=>setTimeout(update,0));
      sec.__kng45Obs.observe(sec,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
  }
  if(window.App && typeof App.registerInit==='function'){
    App.registerInit('secretariat-live-clock-user-fix-45',init);
    if(App._started) setTimeout(init,0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else setTimeout(init,0);
  window.KNGSecretariatLiveClockUserFix45={init,update,setHands,setName,realUserName};
})();
