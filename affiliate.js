const FUNCTIONS_BASE = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1';

  const form = document.getElementById('affiliateForm');
  const errorAlert = document.getElementById('errorAlert');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    errorAlert.style.display = 'none';

    const websiteHp = document.getElementById('websiteHp').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('affEmail').value.trim();
    const phone = document.getElementById('affPhone').value.trim();
    const promotionMethod = document.getElementById('promotionMethod').value || null;

    if(!fullName || !email || !phone){
      errorAlert.textContent = 'الرجاء تعبئة كل الحقول المطلوبة (المعلّمة بـ *).';
      errorAlert.style.display = 'block';
      return;
    }

    const recaptchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
    if(!recaptchaToken){
      errorAlert.textContent = 'الرجاء تأكيد أنك لست روبوتاً قبل الإرسال.';
      errorAlert.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإرسال...';

    let result = null;
    try {
      const res = await fetch(FUNCTIONS_BASE + '/submit-affiliate-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          phone: phone,
          promotion_method: promotionMethod,
          recaptcha_token: recaptchaToken,
          website_hp: websiteHp
        })
      });
      const body = await res.json();
      if(res.ok && body && body.success){ result = body; }
    } catch(err){
      console.error(err);
    }

    if(!result){
      submitBtn.disabled = false;
      submitBtn.textContent = 'احصل على رابط الإحالة';
      errorAlert.textContent = 'حصل خطأ أثناء إرسال طلبك، حاول مرة ثانية أو تواصل معنا مباشرة.';
      errorAlert.style.display = 'block';
      if(typeof grecaptcha !== 'undefined'){ grecaptcha.reset(); }
      return;
    }

    const referralLink = 'https://nabdh.online/signup.html?ref=' + result.referral_code;
    document.getElementById('referralLinkInput').value = referralLink;

    form.style.display = 'none';
    document.getElementById('successCard').style.display = 'block';
  });

  document.getElementById('copyLinkBtn').addEventListener('click', function(){
    const input = document.getElementById('referralLinkInput');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(function(){
      const btn = document.getElementById('copyLinkBtn');
      const original = btn.textContent;
      btn.textContent = '✓ تم النسخ';
      setTimeout(function(){ btn.textContent = original; }, 1500);
    });
  });
