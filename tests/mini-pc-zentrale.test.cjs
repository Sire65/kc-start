const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'programs.json'),'utf8'));
assert.equal(catalog.schema,'KC_APP_CATALOG_V2');
for(const id of ['pc-manager','kasse','money-butler','dp2','verwaltung','communication','system-check','leitstand','backup-vault','tv','github','anydesk','teamviewer']){
  assert.ok(catalog.programs.some(x=>x.id===id&&x.miniPc===true),id+' fehlt im Mini-PC-Katalog');
}
const server=fs.readFileSync(path.join(root,'mini-pc','mini-pc-server.cjs'),'utf8');
for(const port of [8700,8765,8766,8767,8768,8769,8770])assert.match(server,new RegExp('port:'+port));
assert.match(server,/127\.0\.0\.1/);
assert.match(server,/__kc_status/);
assert.match(server,/__kc_launch/);
assert.doesNotMatch(server,/0\.0\.0\.0/);
const app=fs.readFileSync(path.join(root,'assets','app.js'),'utf8');
assert.match(app,/__kc_status/);assert.match(app,/__kc_launch/);assert.match(app,/localUrl/);
const setup=fs.readFileSync(path.join(root,'mini-pc','KC_MINI_PC_EINRICHTEN.cmd'),'utf8');
assert.match(setup,/Startup\\KC Mini PC Zentrale\.cmd/i);assert.match(setup,/127\.0\.0\.1:8700/);
console.log('KC Mini-PC Zentrale: Katalog, Loopback-Server, Launcher und Autostart vollständig.');
