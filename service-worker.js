const CACHE='ceb-pwa-v8';
const SHELL=['./','./index.html','./estudos-prontos.html','./pregacoes-prontas.html','./biblia.js','./instalador.html','./manifest.webmanifest','./icon-192.svg','./icon-512.svg','./aula-ebd-jose-genesis-50.html','./slides-jose-perdao.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 const isPage=req.mode==='navigate'||/\\.html?$/i.test(url.pathname)||url.pathname.endsWith('/');
 // As páginas com conteúdo e scripts devem sempre vir da versão publicada; não servir HTML antigo do cache.
 if(isPage){
  event.respondWith(fetch(req,{cache:'no-store'}).then(response=>{
   return response;
  }).catch(()=>caches.match(req).then(cached=>cached||caches.match('./index.html'))));
  return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
  if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}
  return response;
 }).catch(()=>cached)));
});
