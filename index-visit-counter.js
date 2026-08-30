// عداد زوار حقيقي: كل تحميل فعلي للصفحة الرئيسية يزيد الرقم بمقدار 1 عبر دالة
  // Supabase آمنة (increment_site_visits) — الجدول نفسه محمي بـ RLS وما فيه أي
  // policy مباشرة، فما يقدر أحد من المتصفح يعدّل الرقم غير عن طريق هالدالة اللي
  // تزيد بمقدار 1 بس وترجع القيمة الجديدة.
  (function(){
    var SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucHR1d2NmdmZjanF0cXFuaXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1Mjc2NzEsImV4cCI6MjEwMjEwMzY3MX0.Pn0ltBNfxU302bYCzTLo6wRyH8TiyKQ33qtRI98sf28';
    var valueEl = document.getElementById('visitorCountValue');
    if(!valueEl) return;

    function renderDigits(n){
      var str = String(Math.max(0, Math.round(n))).padStart(6, '0');
      var html = '';
      for(var i = 0; i < str.length; i++){
        html += '<span class="vc-digit">' + str[i] + '</span>';
      }
      valueEl.innerHTML = html;
      valueEl.setAttribute('aria-label', str.replace(/^0+(?=\d)/, ''));
    }

    function animateCount(to){
      var from = 0;
      var duration = 900;
      var start = null;
      function step(ts){
        if(start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var current = Math.round(from + (to - from) * (1 - Math.pow(1 - progress, 3)));
        renderDigits(current);
        if(progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    fetch(SUPABASE_URL + '/rest/v1/rpc/increment_site_visits', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: '{}'
    })
      .then(function(res){ return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function(count){
        if(typeof count === 'number' && isFinite(count)){
          animateCount(count);
        } else {
          var wrap = document.querySelector('.visitor-counter-wrap');
          if(wrap) wrap.style.display = 'none';
        }
      })
      .catch(function(){
        // فشل الاتصال ما يكسر الصفحة — نخفي الإطار كامل بهدوء بدل ما نطلع رقم غلط
        var wrap = document.querySelector('.visitor-counter-wrap');
        if(wrap) wrap.style.display = 'none';
      });
  })();
