(function(){
  // شارة عرض الافتتاح أكتوبر 2026 — بانر الصورة أعلى الصفحة + شريط النص فوق جدول الباقات.
  // تُخفى تلقائياً لو انتهى العرض (زمنياً أو باكتمال العدد) أو لو فشل الجلب، فما يحتاج أي
  // تعديل يدوي لاحق عند انتهاء الحملة.
  var STATUS_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/get-launch-promo-status';
  var topBanner = document.getElementById('topLaunchBanner');
  var banner = document.getElementById('launchPromoBanner');
  var titleEl = document.getElementById('launchPromoTitle');
  var subEl = document.getElementById('launchPromoSub');

  var lastData = null;

  function currentLang(){
    var root = document.getElementById('htmlRoot');
    return (root && root.getAttribute('lang') === 'en') ? 'en' : 'ar';
  }

  function renderBanner(data){
    var active = !!(data && data.active);

    if(topBanner) topBanner.style.display = active ? 'block' : 'none';

    if(!banner) return;
    if(!active){ banner.style.display = 'none'; return; }

    var lang = currentLang();
    var freeSetupActive = !!(data.freeSetup && data.freeSetup.active);
    if(lang === 'en'){
      titleEl.textContent = '🎉 Launch Offer: 50% off annual plans + 5 free add-ons worth 1,395 SAR';
      subEl.textContent = freeSetupActive
        ? 'Plus free full setup (999 SAR) for the first 20 customers 🎁 — ends Oct 31, 2026 or when seats run out'
        : 'Ends Oct 31, 2026 or when seats run out';
    } else {
      titleEl.textContent = '🎉 عرض الافتتاح: خصم 50% على الاشتراك السنوي + هدية 5 إضافات مجاناً بقيمة 1,395 ريال';
      subEl.textContent = freeSetupActive
        ? 'ولأول 20 عميل فقط: إعداد كامل مجاني (999 ريال) 🎁 — العرض حتى 31 أكتوبر 2026 أو حتى اكتمال العدد'
        : 'العرض حتى 31 أكتوبر 2026 أو حتى اكتمال العدد';
    }
    banner.style.display = 'block';
  }

  fetch(STATUS_URL)
    .then(function(r){ return r.json(); })
    .then(function(data){ lastData = data; renderBanner(data); })
    .catch(function(){ if(topBanner) topBanner.style.display = 'none'; if(banner) banner.style.display = 'none'; });

  var langBtn = document.getElementById('langBtn');
  var langBtnMobile = document.getElementById('langBtnMobile');
  function rerender(){ if(lastData) renderBanner(lastData); }
  if(langBtn) langBtn.addEventListener('click', function(){ setTimeout(rerender, 0); });
  if(langBtnMobile) langBtnMobile.addEventListener('click', function(){ setTimeout(rerender, 0); });
})();
