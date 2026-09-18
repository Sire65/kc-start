'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');
const BASE=process.env.KC_PROGRAMME_DIR||'C:\\KC_Programme';
const SELF=path.resolve(__dirname,'..');
const apps=[
  {id:'start',port:8700,root:SELF,index:'index.html'},
  {id:'kasse',port:8765,root:path.join(BASE,'Kasse'),index:'index.html'},
  {id:'verwaltung',port:8766,root:path.join(BASE,'KC-Verwaltung'),index:'index.html'},
  {id:'dp2',port:8767,root:path.join(BASE,'dp3'),index:'index.html'},
  {id:'communication',port:8768,root:path.join(BASE,'KC-Communication'),index:'index.html'},
  {id:'system-check',port:8769,root:path.join(BASE,'KC-System-Check'),index:'index.html'},
  {id:'leitstand',port:8770,root:path.join(BASE,'KC-Leitstand','public'),index:'index.html'}
];
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.cjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.mp4':'video/mp4','.pdf':'application/pdf'};
const native={
  'github-desktop':[path.join(process.env.LOCALAPPDATA||'','GitHubDesktop','GitHubDesktop.exe')],
  'anydesk':[path.join(process.env['ProgramFiles(x86)']||'','AnyDesk','AnyDesk.exe'),path.join(process.env.ProgramFiles||'','AnyDesk','AnyDesk.exe')],
  'teamviewer':[path.join(process.env.ProgramFiles||'','TeamViewer','TeamViewer.exe'),path.join(process.env['ProgramFiles(x86)']||'','TeamViewer','TeamViewer.exe')],
  'backup-vault':[path.join(process.env.LOCALAPPDATA||'','Programs','PC Backup Vault','PC Backup Vault.exe'),path.join(process.env.ProgramFiles||'','PC Backup Vault','PC Backup Vault.exe'),path.join(BASE,'PC-Backup-Vault','dist','PC Backup Vault.exe')]
};
function existing(arr){return (arr||[]).find(p=>p&&fs.existsSync(p))||null}
function safe(root,urlPath){
  let rel=decodeURIComponent((urlPath||'/').split('?')[0]).replace(/^\/+/,'');
  if(!rel)rel='index.html';
  const full=path.resolve(root,rel),rr=path.resolve(root);
  return full===rr||full.startsWith(rr+path.sep)?full:null;
}
function status(){
  return {schema:'KC_MINI_PC_STATUS_V1',at:new Date().toISOString(),host:os.hostname(),base:BASE,
    apps:apps.map(a=>({id:a.id,port:a.port,root:a.root,installed:fs.existsSync(a.root)})),
    native:Object.fromEntries(Object.entries(native).map(([id,c])=>[id,{installed:!!existing(c),path:existing(c)?path.basename(existing(c)):null}]))};
}
function startServer(app){
  const srv=http.createServer((req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
    if(app.id==='start'&&req.url.startsWith('/__kc_status')){res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(status(),null,2))}
    if(app.id==='start'&&req.url.startsWith('/__kc_launch')){
      const u=new URL(req.url,'http://127.0.0.1'),id=u.searchParams.get('app'),exe=existing(native[id]);
      res.setHeader('Content-Type','application/json; charset=utf-8');
      if(!exe){res.statusCode=404;return res.end(JSON.stringify({ok:false,error:'Programm nicht gefunden',app:id}))}
      try{cp.spawn(exe,[],{detached:true,stdio:'ignore'}).unref();return res.end(JSON.stringify({ok:true,app:id}))}
      catch(e){res.statusCode=500;return res.end(JSON.stringify({ok:false,error:e.message,app:id}))}
    }
    if(!fs.existsSync(app.root)){res.statusCode=404;return res.end('KC Programmordner nicht gefunden: '+app.root)}
    let file=safe(app.root,req.url);if(!file){res.statusCode=400;return res.end('Ungültiger Pfad')}
    try{if(fs.statSync(file).isDirectory())file=path.join(file,app.index)}catch{}
    fs.readFile(file,(err,data)=>{
      if(err){res.statusCode=404;return res.end('Nicht gefunden')}
      res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');res.end(data);
    });
  });
  srv.on('error',e=>{if(e.code==='EADDRINUSE')console.log('[KC Mini-PC] Port '+app.port+' bereits belegt – vorhandener Dienst bleibt aktiv.');else console.error('[KC Mini-PC] '+app.id+':',e.message)});
  srv.listen(app.port,'127.0.0.1',()=>console.log('[KC Mini-PC] '+app.id+' bereit: http://127.0.0.1:'+app.port+'/'));
}
apps.forEach(startServer);
console.log('[KC Mini-PC] Zentrale gestartet. Startcenter: http://127.0.0.1:8700/');
