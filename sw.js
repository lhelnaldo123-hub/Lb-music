/* LB Music service worker – works offline. Bump VERSION whenever you change any file. */
const VERSION='lb-v8';
const SHELL=['./','./index.html','./lb-extra.js','./lb-lab.js','./lb-studio.js','./lb-account.js','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||r.headers.has('range'))return;   // online songs, videos, APIs go straight to the network
  if(/admin\.html$/.test(u.pathname))return;
  e.respondWith(
    caches.match(r,{ignoreSearch:true}).then(hit=>{
      const net=fetch(r).then(res=>{if(res&&res.ok){const c=res.clone();caches.open(VERSION).then(x=>x.put(r,c))}return res}).catch(()=>hit);
      return hit||net;     // instant from cache, refreshed in the background
    }).catch(()=>caches.match('./index.html'))
  );
});
