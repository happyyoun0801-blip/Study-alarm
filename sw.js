const CACHE='study-alarm-v2';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./Study_Alarm_Calendar.ics'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function isFreshFirst(req,url){
  return req.mode==='navigate'
    ||url.pathname.endsWith('/')
    ||url.pathname.endsWith('.html')
    ||url.pathname.endsWith('.ics')
    ||(req.headers.get('accept')||'').includes('text/html');
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(isFreshFirst(req,url)){
    // network-first: 새 배포가 있으면 바로 반영하고, 오프라인이면 캐시로 대체
    e.respondWith((async()=>{
      try{
        const res=await fetch(req,{cache:'no-store'});
        if(res&&res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}
        return res;
      }catch(err){
        const cached=await caches.match(req)||await caches.match('./index.html');
        if(cached)return cached;
        throw err;
      }
    })());
    return;
  }

  // 그 외 정적 파일: 캐시 우선, 없으면 네트워크에서 받아 캐시에 저장
  e.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    const res=await fetch(req);
    if(res&&res.ok&&res.type==='basic'){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}
    return res;
  })());
});

self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});
