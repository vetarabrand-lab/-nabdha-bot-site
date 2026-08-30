// قسم آراء العملاء: يجيب التعليقات المعتمدة فقط من Supabase (RLS يحصر anon على
  // status = 'approved')، ويسمح للزائر يرسل تعليق+تقييم جديد يدخل تلقائياً بحالة
  // "قيد المراجعة" (pending) لين يوافق عليه الأدمن من لوحة التحكم.
  (function(){
    var SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucHR1d2NmdmZjanF0cXFuaXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1Mjc2NzEsImV4cCI6MjEwMjEwMzY3MX0.Pn0ltBNfxU302bYCzTLo6wRyH8TiyKQ33qtRI98sf28';

    var grid = document.getElementById('testiGrid');
    var form = document.getElementById('testiForm');
    var starsWrap = document.getElementById('testiStars');
    var msgEl = document.getElementById('testiMsg');

    function currentLang(){
      var root = document.getElementById('htmlRoot');
      return (root && root.getAttribute('lang')) || 'ar';
    }

    function escapeHtml(str){
      return String(str).replace(/[&<>"']/g, function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
      });
    }

    function renderStars(n){
      n = Math.max(0, Math.min(5, parseInt(n, 10) || 0));
      return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
    }

    function loadTestimonials(){
      if(!grid) return;
      fetch(SUPABASE_URL + '/rest/v1/testimonials?select=customer_name,rating,comment&status=eq.approved&order=sort_order.asc,created_at.desc&limit=9', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
      })
        .then(function(res){ return res.ok ? res.json() : []; })
        .then(function(rows){
          if(!rows || !rows.length) return; // يبقى الفريم فاضي فيظهر رسالة "كن أول من يشارك" تلقائياً بالـ CSS
          grid.innerHTML = rows.map(function(r){
            var initial = (r.customer_name || '؟').trim().charAt(0).toUpperCase();
            return '<div class="testi-card">' +
                '<div class="testi-stars-display">' + renderStars(r.rating) + '</div>' +
                '<p class="testi-text">' + escapeHtml(r.comment) + '</p>' +
                '<div class="testi-who">' +
                  '<div class="testi-avatar">' + escapeHtml(initial) + '</div>' +
                  '<div><b>' + escapeHtml(r.customer_name) + '</b></div>' +
                '</div>' +
              '</div>';
          }).join('');
        })
        .catch(function(){ /* فشل الجلب ما يكسر الصفحة — يبقى القسم بحالته الفارغة */ });
    }

    if(starsWrap){
      var starEls = starsWrap.querySelectorAll('.testi-star');
      starsWrap.addEventListener('click', function(e){
        var star = e.target.closest('.testi-star');
        if(!star) return;
        var v = parseInt(star.getAttribute('data-v'), 10);
        starsWrap.setAttribute('data-rating', v);
        starEls.forEach(function(s){
          s.classList.toggle('active', parseInt(s.getAttribute('data-v'), 10) <= v);
        });
      });
    }

    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var nameEl = document.getElementById('testiName');
        var commentEl = document.getElementById('testiComment');
        var name = nameEl.value.trim();
        var comment = commentEl.value.trim();
        var rating = parseInt(starsWrap.getAttribute('data-rating'), 10) || 0;
        var lang = currentLang();

        if(!name || !comment || rating < 1){
          msgEl.textContent = lang === 'ar' ? 'الرجاء كتابة اسمك، تقييمك بالنجوم، وتعليقك.' : 'Please add your name, a star rating, and a comment.';
          msgEl.className = 'testi-msg err';
          return;
        }

        var submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        fetch(SUPABASE_URL + '/rest/v1/testimonials', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ customer_name: name.slice(0, 80), rating: rating, comment: comment.slice(0, 600) })
        })
          .then(function(res){
            submitBtn.disabled = false;
            if(res.ok){
              form.reset();
              starsWrap.setAttribute('data-rating', '0');
              starEls.forEach(function(s){ s.classList.remove('active'); });
              msgEl.textContent = lang === 'ar' ? '🎉 شكراً لك! تعليقك بانتظار المراجعة وبيظهر هنا قريباً.' : '🎉 Thank you! Your review is pending approval and will appear here soon.';
              msgEl.className = 'testi-msg ok';
            } else {
              msgEl.textContent = lang === 'ar' ? 'صار خطأ، حاول مرة ثانية.' : 'Something went wrong, please try again.';
              msgEl.className = 'testi-msg err';
            }
          })
          .catch(function(){
            submitBtn.disabled = false;
            msgEl.textContent = lang === 'ar' ? 'تعذّر الاتصال، تأكد من اتصالك بالإنترنت.' : 'Connection failed, check your internet.';
            msgEl.className = 'testi-msg err';
          });
      });
    }

    loadTestimonials();
  })();
