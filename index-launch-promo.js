(function(){
  // شارة عرض الافتتاح أكتوبر 2026 فوق جدول الباقات — تُخفى تلقائياً لو انتهى العرض (زمنياً أو
  // باكتمال العدد) أو لو فشل الجلب، فما يحتاج أي تعديل يدوي لاحق عند انتهاء الحملة.
  var STATUS_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/get-launch-promo-status';
  var banner = document.getElementById('launchPromoBanner');
  var counterEl = document.getElementById('launchPromoCounter');
  var titleEl = document.getElementById('launchPromoTitle');
  var subEl = document.getElementById('launchPromoSub');
  if(!banner) return;

  var lastData = null;

  function currentLang(){
    var root = document.getElementById('htmlRoot');
    return (root && root.getAttribute('lang') === 'en') ? 'en' : 'ar';
  }
  function fmt(n){ return Number(n).toLocaleString('en-US'); }

  function renderBanner(data){
    if(!data || !data.active){ banner.style.display = 'none'; return; }
    var lang = currentLang();
    var freeSetupActive = !!(data.freeSetup && data.freeSetup.active);
    if(lang === 'en'){
      titleEl.textContent = '🎉 Launch Offer: 50% off annual plans + 5 free add-ons worth 1,395 SAR';
      subEl.textContent = freeSetupActive
        ? 'Plus free full setup (999 SAR) for the first 20 customers 🎁 — ends Oct 31, 2026 or when seats run out'
        : 'Ends Oct 31, 2026 or when seats run out';
      counterEl.innerHTML = fmt(data.annual.remaining) + ' <b>/ ' + fmt(data.annual.max) + '</b> seats left';
    } else {
      titleEl.textContent = '🎉 عرض الافتتاح: خصم 50% على الاشتراك السنوي + هدية 5 إضافات مجاناً بقيمة 1,395 ريال';
      subEl.textContent = freeSetupActive
        ? 'ولأول 20 عميل فقط: إعداد كامل مجاني (999 ريال) 🎁 — العرض حتى 31 أكتوبر 2026 أو حتى اكتمال العدد'
        : 'العرض حتى 31 أكتوبر 2026 أو حتى اكتمال العدد';
      counterEl.innerHTML = 'باقي ' + fmt(data.annual.remaining) + ' <b>من ' + fmt(data.annual.max) + '</b> مقعد';
    }
    banner.style.display = 'block';
  }

  fetch(STATUS_URL)
    .then(function(r){ return r.json(); })
    .then(function(data){ lastData = data; renderBanner(data); })
    .catch(function(){ banner.style.display = 'none'; });

  var langBtn = document.getElementById('langBtn');
  var langBtnMobile = document.getElementById('langBtnMobile');
  function rerender(){ if(lastData) renderBanner(lastData); }
  if(langBtn) langBtn.addEventListener('click', function(){ setTimeout(rerender, 0); });
  if(langBtnMobile) langBtnMobile.addEventListener('click', function(){ setTimeout(rerender, 0); });
})();
