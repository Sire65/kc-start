/* KNG 51.4 – Admin-Leitstand: aktive Icons + zuverlässige Startseite
   Greift nur ergänzend ein: keine Änderungen am Timer/Uhr/Meldungskern.
*/
(function(){
  'use strict';
  const START_KEY='kng.adminLeitstand.startPage';
  const ACCESS_KEY='kng.adminLeitstand.unlocked';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function st(){return window.state||{};}
  function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function toast(msg,type='info'){try{window.toast?.(msg,type);}catch(_){console.log(msg);}}
  function logged(){return !!st().session?.isLoggedIn;}
  function isSuperAdmin(){
    if(typeof window.openAdminControl==='function'){
      const sess=st().session||{};
      const u=String(sess.userName||sess.user||'').trim().toLowerCase();
      const r=String(sess.role||'').trim().toLowerCase();
      const configured=String(st().settings?.superAdminUserName || localStorage.getItem('kng.superadmin.user') || 'Admin').trim().toLowerCase();
      return (r==='admin'||r==='systeminhaber') && (u===configured || u==='admin' || u==='hans' || u==='hans-joachim koch' || u==='ha-joko@web.de');
    }
    return false;
  }
  function adminStartEnabled(){
    return st().settings?.adminControlStartPage===true || localStorage.getItem(START_KEY)==='1' || localStorage.getItem('kng.adminLeitstand.startPage.superadmin')==='1';
  }
  function setAdminStartEnabled(val){
    st().settings=st().settings||{};
    st().settings.adminControlStartPage=!!val;
    localStorage.setItem(START_KEY,val?'1':'0');
    localStorage.setItem('kng.adminLeitstand.startPage.superadmin',val?'1':'0');
    try{window.saveState?.();}catch(_){}
  }
  const ICONS={
    dashboard:{label:'Dashboard',icon:'🏠',view:'dashboard'},
    members:{label:'Mitglieder',icon:'👥',view:'members'},
    memberCards:{label:'Mitgliedsausweis',icon:'🪪',view:'memberCards'},
    workwear:{label:'Dienstkleidung',icon:'🥼',view:'workwear'},
    activities:{label:'Aktivitäten',icon:'🚌',view:'activities'},
    donations:{label:'Spenden',icon:'💝',view:'donations'},
    finance:{label:'Finanzen',icon:'💶',view:'finance'},
    communication:{label:'Kommunikation',icon:'✉️',view:'communication'},
    documents:{label:'Dokumente',icon:'📁',view:'documents'},
    secretariat:{label:'Büro-Design',icon:'🏢',view:'secretariat'},
    inventoryOpen:{label:'Inventar',icon:'📦',action:'inventoryOpen'},
    orders:{label:'Bestellungen',icon:'🛒',view:'orders'},
    questionnaire:{label:'Fragebogen',icon:'📝',view:'questionnaire'},
    addresses:{label:'Adressen',icon:'📇',view:'addresses'},
    phone:{label:'Telefon',icon:'☎️',view:'addresses'},
    calculator:{label:'Rechner',icon:'🧮',action:'calculator'},
    statutes:{label:'Satzung',icon:'📚',view:'documents'},
    systemCheck:{label:'Systemcheck',icon:'✅',view:'systemCheck'},
    backup:{label:'Datensicherung',icon:'💾',view:'backup'},
    protocol:{label:'Protokoll',icon:'📋',view:'protocol'},
    users:{label:'Benutzer',icon:'🔐',view:'users'},
    settings:{label:'Stammdaten',icon:'⚙️',view:'settings'},
    logout:{label:'Abmelden',icon:'🚪',action:'logout'}
  };
  function activeIconKeys(){
    const arr=Array.isArray(st().settings?.navIcons)?st().settings.navIcons:[];
    const fallback=['dashboard','members','memberCards','workwear','orders','activities','donations','communication','documents','inventoryOpen','systemCheck','protocol','questionnaire','addresses','logout'];
    const keys=(arr.length?arr:fallback).filter(k=>ICONS[k]);
    // Doppelte entfernen, Reihenfolge behalten. Ziel: aktivierte Bedienicons, typischerweise 15.
    return Array.from(new Set(keys)).slice(0,18);
  }
  function runIcon(item){
    if(!item) return;
    if(item.action==='logout'){
      document.getElementById('logoutBtn')?.click();
      return;
    }
    if(item.action==='inventoryOpen'){
      if(typeof window.openInventory==='function') window.openInventory();
      else window.showView?.('inventory');
      return;
    }
    if(item.action==='calculator'){
      try{ window.open?.('calculator:'); }catch(_){}
      toast('Taschenrechner-Platzhalter: Modul wird später angeschlossen.','info');
      return;
    }
    if(item.view){ window.showView?.(item.view); }
  }
  function ensureIconPanel(){
    const root=$('.admin-pro-bottom') || $('#adminControl .admin-control-shell');
    if(!root || $('#adminCtlActiveIconsPanel')) return;
    const panel=document.createElement('article');
    panel.id='adminCtlActiveIconsPanel';
    panel.className='admin-panel admin-active-icons-panel';
    panel.innerHTML=`<div class="panel-title"><span class="led led-green"></span><strong>Aktivierte Bedien-Icons</strong><em id="adminCtlActiveIconCount">0 aktiv</em></div><div id="adminCtlActiveIcons" class="admin-active-icons-grid"></div><p class="admin-session-note">Direktbedienung der freigegebenen Programmsymbole aus der Schaltzentrale.</p>`;
    root.appendChild(panel);
  }
  function renderActiveIcons(){
    if(!$('#adminControl')?.classList.contains('active')) return;
    ensureIconPanel();
    const box=$('#adminCtlActiveIcons'); if(!box) return;
    const keys=activeIconKeys();
    const count=$('#adminCtlActiveIconCount'); if(count) count.textContent=keys.length+' aktiv';
    box.innerHTML=keys.map(k=>{const it=ICONS[k]; return `<button type="button" class="admin-active-icon" data-admin-icon="${esc(k)}" title="${esc(it.label)}"><span>${esc(it.icon)}</span><small>${esc(it.label)}</small></button>`;}).join('') || '<div class="admin-empty-note">Keine aktivierten Symbole gefunden.</div>';
  }
  function bindIconClicks(){
    if(document.__kng514IconClickBound) return; document.__kng514IconClickBound=true;
    document.addEventListener('click',ev=>{
      const btn=ev.target.closest?.('[data-admin-icon]');
      if(!btn) return;
      const item=ICONS[btn.dataset.adminIcon];
      try{ sessionStorage.setItem('kng.adminLeitstand.returnWanted','1'); }catch(_){}
      runIcon(item);
    },true);
  }
  function forceOpenAdminStart(reason){
    if(!logged() || !isSuperAdmin() || !adminStartEnabled()) return false;
    const active=document.querySelector('.view.active')?.id;
    if(active==='adminControl') return true;
    try{ sessionStorage.setItem(ACCESS_KEY,'1'); }catch(_){}
    if(typeof window.openAdminControl==='function'){
      window.openAdminControl(reason||'Startseite');
      setTimeout(renderActiveIcons,200);
      return true;
    }
    return false;
  }
  function installStartFix(){
    // Rollen-Startseite darf den Superadmin nicht mehr ins Büro zurückziehen.
    if(typeof window.showRoleStartView==='function' && window.showRoleStartView.__kng514Wrapped!=='1'){
      const orig=window.showRoleStartView;
      const wrapped=function(role){
        if(adminStartEnabled() && isSuperAdmin() && logged()){
          setTimeout(()=>forceOpenAdminStart('Startseite'),80);
          return true;
        }
        return orig.apply(this,arguments);
      };
      wrapped.__kng514Wrapped='1'; window.showRoleStartView=wrapped;
    }
    if(typeof window.doLogin==='function' && window.doLogin.__kng514Wrapped!=='1'){
      const orig=window.doLogin;
      const wrapped=function(){
        const ret=orig.apply(this,arguments);
        [250,900,1800,3200].forEach(ms=>setTimeout(()=>forceOpenAdminStart('Startseite'),ms));
        return ret;
      };
      wrapped.__kng514Wrapped='1'; window.doLogin=wrapped;
    }
  }
  function syncStartSwitches(){
    const on=adminStartEnabled();
    ['adminCtlStartPage','settingsAdminControlStart'].forEach(id=>{const el=$('#'+id); if(el) el.checked=on;});
  }
  function bindStartSwitchMirror(){
    if(document.__kng514StartMirrorBound) return; document.__kng514StartMirrorBound=true;
    document.addEventListener('change',ev=>{
      if(ev.target?.id==='adminCtlStartPage' || ev.target?.id==='settingsAdminControlStart'){
        setAdminStartEnabled(!!ev.target.checked);
        syncStartSwitches();
        if(ev.target.checked) setTimeout(()=>forceOpenAdminStart('Startseite'),100);
      }
    },true);
  }
  function patchRender(){
    const old=window.renderAdminControl;
    if(typeof old==='function' && old.__kng514Wrapped!=='1'){
      const wrapped=function(){const ret=old.apply(this,arguments); try{syncStartSwitches(); renderActiveIcons();}catch(e){console.warn('KNG 51.4 render icons failed',e);} return ret;};
      wrapped.__kng514Wrapped='1'; window.renderAdminControl=wrapped;
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    bindIconClicks(); bindStartSwitchMirror(); installStartFix(); patchRender();
    [500,1400,2600,4200].forEach(ms=>setTimeout(()=>{installStartFix(); syncStartSwitches(); forceOpenAdminStart('Startseite'); renderActiveIcons();},ms));
    setInterval(()=>{ if($('#adminControl')?.classList.contains('active')){syncStartSwitches(); renderActiveIcons();} },2500);
  });
})();
