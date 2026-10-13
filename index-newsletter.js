(function(){
    var STORAGE_KEY = 'nabda_nl_state'; // 'dismissed' | 'subscribed'
    var card = document.getElementById('nabdaNlCard');
    var closeBtn = document.getElementById('nabdaNlClose');
    var form = document.getElementById('nabdaNlForm');
    var emailInput = document.getElementById('nabdaNlEmail');
    var consentInput = document.getElementById('nabdaNlConsent');
    var honeypot = document.getElementById('nabdaNlHoneypot');
    var submitBtn = document.getElementById('nabdaNlSubmit');
    var msgBox = document.getElementById('nabdaNlMsg');

    if(!card) return;

    var state = localStorage.getItem(STORAGE_KEY);
    if(state === 'dismissed' || state === 'subscribed'){
      return; // ما نعيد إظهاره لو المستخدم أغلقه أو اشترك قبل
    }

    // نظهر النافذة بعد ما يتصفح الزائر نص الصفحة (بدل مؤقت 8 ثواني) — مرة وحدة لكل زائر كما قبل
    var shown = false;
    function onScroll(){
      if(shown) return;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      if(scrollable <= 0) return;
      if((window.scrollY || doc.scrollTop) / scrollable >= 0.5){
        shown = true;
        window.removeEventListener('scroll', onScroll);
        card.classList.add('show');
        requestAnimationFrame(function(){ card.classList.add('visible'); });
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    closeBtn.addEventListener('click', function(){
      card.classList.remove('visible');
      localStorage.setItem(STORAGE_KEY, 'dismissed');
      setTimeout(function(){ card.classList.remove('show'); }, 300);
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = emailInput.value.trim();
      if(!email || !consentInput.checked) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الإرسال...';
      msgBox.textContent = '';
      msgBox.className = 'nabda-nl-msg';

      fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, source: 'index_popup', website: honeypot.value })
      })
      .then(function(res){ return res.json().then(function(data){ return { ok: res.ok, data: data }; }); })
      .then(function(result){
        if(result.ok && result.data && result.data.success){
          msgBox.textContent = 'تم الاشتراك بنجاح 🎉 راح توصلك عروضنا القادمة.';
          msgBox.className = 'nabda-nl-msg success';
          form.style.display = 'none';
          localStorage.setItem(STORAGE_KEY, 'subscribed');
          setTimeout(function(){
            card.classList.remove('visible');
            setTimeout(function(){ card.classList.remove('show'); }, 300);
          }, 3000);
        } else {
          msgBox.textContent = 'صار خطأ، حاول مرة ثانية بعد شوي.';
          msgBox.className = 'nabda-nl-msg error';
          submitBtn.disabled = false;
          submitBtn.textContent = 'اشترك الآن';
        }
      })
      .catch(function(){
        msgBox.textContent = 'تعذر الاتصال، تأكد من الإنترنت وحاول مرة ثانية.';
        msgBox.className = 'nabda-nl-msg error';
        submitBtn.disabled = false;
        submitBtn.textContent = 'اشترك الآن';
      });
    });
  })();
