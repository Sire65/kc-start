const CACHE_NAME='kng-verwaltung-54.8.22-abgleich-ruhig';
const APP_SHELL=['./','index.html','version.json','css/style.css','css/65_startup_update.css','js/19_app_boot.js','js/65_startup_update.js','js/66_durable_storage.js','js/67_supabase_sync.js','js/68_member_card_updates.js','js/72_kc_communication_bridge.js','js/73_kc_communication_recipients_5483.js','js/74_kc_cloud_session_5484.js','js/74_kc_communication_layout_5484.js','js/75_kc_communication_5485_patch.js','js/76_kc_communication_cc_bcc_5486.js','js/77_kc_communication_5489_delivery_fix.js','js/78_kc_address_to_communicator_5410.js','js/79_kc_global_email_to_communicator_5411.js','js/80_kc_cloud_primary_5412.js','js/81_kc_cloud_recovery_sync_5413.js','js/84_push_self_heal.js','js/85_communication_health_rc21.js','css/67_data_connection.css'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kng-verwaltung-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==location.origin||url.pathname.includes('/database/'))return;
  if(request.mode==='navigate'||url.pathname.endsWith('/version.json')){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match(request).then(hit=>hit||caches.match('index.html'))));return;
  }
  event.respondWith(caches.match(request).then(hit=>{const fresh=fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>hit);return hit||fresh}));
});

function readPushPayload(event){
  if(!event.data)return{};
  try{return event.data.json()||{};}catch(_e){
    try{return{body:event.data.text()};}catch(_e2){return{};}
  }
}
self.addEventListener('push',event=>{
  const data=readPushPayload(event);
  const title=String(data.title||data.subject||'Köcheclub Werne');
  const body=String(data.body||data.message||data.text||'Neue Nachricht im KC Communicator.');
  const target=String(data.url||data.clickUrl||data.link||'./');
  event.waitUntil(Promise.all([
    self.registration.showNotification(title,{
    body,
    icon:'assets/kochmuetze-koecheclub.png',
    badge:'assets/kochmuetze-koecheclub-weiss.png',
    tag:String(data.tag||data.requestId||data.id||'kc-communication'),
    renotify:true,
    data:{url:target,raw:data}
    }),
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>Promise.all(list.map(c=>c.postMessage({type:'kc:push-received',at:Date.now()}))))
  ]));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification?.data?.url||'./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){try{client.navigate(target);}catch(_e){} return client.focus();}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
