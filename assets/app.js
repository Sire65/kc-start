const box=document.querySelector("#apps"),dialog=document.querySelector("#report-dialog");
const LOCAL=/^(?:127\.0\.0\.1|localhost)$/i.test(location.hostname);
let catalog=null,miniStatus=null;

function ver(m){return m.displayVersion||m.version||m.releaseVersion||m.fassung||m.label||(m.build?"Build "+m.build:"Version verfügbar")}
async function version(p){
  if(!p.manifestUrl)return p.nativeLaunch?"Lokales Windows-Programm":"Direkt nutzbar";
  try{const r=await fetch(p.manifestUrl,{cache:"no-store"});if(!r.ok)throw Error(r.status);return ver(await r.json())}
  catch(e){KCStartReport.error("Versionsprüfung "+p.id,e);return"Version derzeit nicht abrufbar"}
}
async function getMiniStatus(){
  if(!LOCAL)return null;
  try{const r=await fetch("/__kc_status?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error(r.status);return await r.json()}
  catch(e){KCStartReport.error("Mini-PC Status",e);return null}
}
function localInstalled(p){
  if(!LOCAL||!miniStatus)return null;
  if(p.nativeLaunch)return !!miniStatus.native?.[p.nativeLaunch]?.installed;
  if(!p.localUrl)return null;
  const port=Number(new URL(p.localUrl).port);
  const row=miniStatus.apps?.find(x=>Number(x.port)===port);
  return !!row?.installed;
}
async function launchNative(p,button){
  button.disabled=true;const old=button.textContent;button.textContent="Wird gestartet …";
  try{const r=await fetch("/__kc_launch?app="+encodeURIComponent(p.nativeLaunch),{cache:"no-store"}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||"Start fehlgeschlagen");KCStartReport.step("Windows-Programm gestartet","ok",p.id);button.textContent="Gestartet ✓";setTimeout(()=>{button.disabled=false;button.textContent=old},1600)}
  catch(e){button.disabled=false;button.textContent="Nicht gefunden";KCStartReport.error("Programmstart "+p.id,e)}
}
function card(p){
  const a=document.createElement("article");a.className="card";
  const installed=localInstalled(p),localTarget=LOCAL&&installed&&p.localUrl?p.localUrl:null;
  const target=localTarget||p.startUrl||null;
  const status=LOCAL?(installed===true?"● lokal bereit":installed===false?"○ lokal fehlt":"● verfügbar"):(p.available?"● verfügbar":"○ nicht freigegeben");
  a.innerHTML='<div class="card-top"><div class="card-icon">'+p.icon+'</div><span class="local-state '+(installed===false?"missing":"")+'">'+status+'</span></div><h3>'+p.name+'</h3><span class="badge '+(p.available?"":"locked")+'">'+(p.available?p.audience:"🔒 "+p.audience)+'</span><p>'+p.description+'</p><div class="card-version">Version wird geprüft …</div><div class="card-actions"></div>';
  const actions=a.querySelector(".card-actions");
  if(p.nativeLaunch&&LOCAL){
    const b=document.createElement("button");b.className="button";b.textContent=installed===false?"Nicht installiert":"Starten →";b.disabled=installed===false;b.onclick=()=>launchNative(p,b);actions.append(b);
  }else if(target){
    const open=document.createElement("a");open.className="button"+(!p.available?" disabled":"");open.textContent=LOCAL&&localTarget?"Lokal öffnen →":"Öffnen →";open.href=p.available?target:"#";if(localTarget)open.dataset.local="1";actions.append(open);
    if(LOCAL&&p.startUrl&&localTarget){
      const cloud=document.createElement("a");cloud.className="button secondary";cloud.textContent="Online";cloud.href=p.startUrl;cloud.target="_blank";actions.append(cloud);
    }
  }else{
    const b=document.createElement("button");b.className="button disabled";b.textContent="Noch nicht verfügbar";b.disabled=true;actions.append(b);
  }
  version(p).then(v=>a.querySelector(".card-version").textContent=v);
  return a
}
function renderSummary(){
  const host=document.querySelector("#mini-summary");if(!host)return;
  if(!LOCAL){host.hidden=true;return}
  host.hidden=false;
  const apps=miniStatus?.apps||[],native=miniStatus?.native||{};
  const localReady=apps.filter(x=>x.id!=="start"&&x.installed).length;
  const localTotal=apps.filter(x=>x.id!=="start").length;
  const remoteReady=["anydesk","teamviewer"].filter(x=>native[x]?.installed).length;
  host.innerHTML='<strong>KC Markt-Mini-PC</strong><span>'+localReady+' / '+localTotal+' lokale KC-Webprogramme vorhanden</span><span>Fernzugriff: '+remoteReady+' / 2 Wege installiert</span><span>Startserver: aktiv</span>';
}
async function load(){
  catalog=await fetch("programs.json?t="+Date.now(),{cache:"no-store"}).then(r=>r.json());
  miniStatus=await getMiniStatus();
  renderSummary();
  box.innerHTML="";
  const list=[...catalog.programs].sort((a,b)=>(a.priority||99)-(b.priority||99));
  list.forEach(p=>{if(!LOCAL&&p.miniPc&&p.nativeLaunch)return;box.append(card(p))});
  KCStartReport.step("Programmkatalog","ok",list.length+" Programme");
}
document.querySelector("#refresh").onclick=load;
const on=document.querySelector("#online");on.textContent=navigator.onLine?"Online":"Offline";addEventListener("online",()=>on.textContent="Online");addEventListener("offline",()=>on.textContent="Offline");
document.querySelector("#reports").onclick=()=>{const l=KCStartReport.list(),t=document.querySelector("#report-list");t.innerHTML=l.length?l.map(x=>'<div class="report-item"><strong>'+x.app+"</strong> · "+new Date(x.startedAt).toLocaleString("de-DE")+"<br>"+(x.errors.length?x.errors.length+" Fehler":"Start ohne erfassten Fehler")+"</div>").join(""):"<p>Noch keine Startberichte gespeichert.</p>";dialog.showModal()};
load().catch(e=>{box.textContent="Die Programmliste konnte nicht geladen werden.";KCStartReport.error("Programmkatalog",e)});
