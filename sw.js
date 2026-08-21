// Service Worker لبوابة بوت نبضة (PWA)
// الهدف: قابلية التثبيت على الشاشة الرئيسية + فتح أسرع لهيكل الصفحة.
// ملاحظة مهمة بالتصميم: هذا العامل ما يخزّن أبداً بيانات Supabase (المحادثات، الإعدادات، إلخ) —
// فقط ملفات الواجهة الثابتة (portal.html نفسه، الأيقونات، الـ manifest). كل طلبات البيانات
// الحية تروح للشبكة مباشرة، عشان التاجر يشوف دايماً أحدث محادثاته ولا يشوف بيانات قديمة مخزّنة.

const CACHE_NAME = 'nabda-portal-shell-v1';
const SHELL_FILES = [
  '/portal.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event){
  const req = event.request;
  const url = new URL(req.url);

  // نتدخل بس بطلبات نفس الأصل (same-origin) لملفات الواجهة الثابتة.
  // أي شي ثاني (Supabase API، خطوط جوجل، سكربتات خارجية) يروح للشبكة مباشرة بدون تدخل.
  const isShellFile = url.origin === self.location.origin && SHELL_FILES.indexOf(url.pathname) !== -1;
  if(!isShellFile) return;

  if(req.mode === 'navigate' || url.pathname === '/portal.html'){
    // شبكة أولاً (نفس النسخة الحية)، ولو ما فيه إنترنت نرجع آخر نسخة محفوظة
    event.respondWith(
      fetch(req).then(function(res){
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, res.clone()); });
        return res;
      }).catch(function(){
        return caches.match(req);
      })
    );
    return;
  }

  // أيقونات وmanifest: من الكاش أولاً (ثابتة وما تتغيّر كثير)، وتحديث بالخلفية
  event.respondWith(
    caches.match(req).then(function(cached){
      const network = fetch(req).then(function(res){
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, res.clone()); });
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
