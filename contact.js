var translations = {
    ar: {
      pageTitle: "تواصل معنا | بوت نبضة",
      pageDesc: "تواصل مع فريق بوت نبضة عبر البريد الإلكتروني وسنرد عليك خلال 24 ساعة.",
      brandBot: "بوت <span style=\"color:var(--wa-teal-dark)\">نبضة</span>",
      backArrow: "→",
      backLink: "الرجوع للرئيسية",
      "hero.eyebrow": "تواصل معنا",
      "hero.title": "نسعد بتواصلك معنا",
      "hero.sub": "عندك سؤال، اقتراح، أو تحتاج مساعدة في ربط بوتك؟ راسلنا وفريقنا يرد عليك خلال 24 ساعة.",
      "lead": "أسهل طريقة تتواصل فيها معنا هي عبر البريد الإلكتروني، وفريق نبضة يتابع كل الرسائل بشكل يومي.",
      "emailLabel": "البريد الإلكتروني",
      "note": "نرد عادة خلال 24 ساعة عمل. للاستفسارات المتعلقة بالاشتراك أو ربط رقم واتساب نشاطك، اذكر اسم نشاطك في الرسالة عشان نساعدك أسرع.",
      "form.title": "أرسل لنا رسالة",
      "form.nameLabel": "الاسم",
      "form.namePh": "ادخل اسمك",
      "form.emailLabel": "البريد الإلكتروني",
      "form.emailPh": "ادخل بريدك الإلكتروني",
      "form.phoneLabel": "رقم جوالك",
      "form.phonePh": "ادخل رقم جوالك",
      "form.messageLabel": "استفسارك أو رسالتك",
      "form.messagePh": "اكتب استفسارك هنا...",
      "form.submit": "إرسال الرسالة",
      "form.sending": "جاري الإرسال...",
      "form.success": "تم إرسال رسالتك بنجاح 🎉 راح يرد عليك فريقنا قريباً.",
      "form.errorMissing": "الرجاء تعبئة الاسم والرسالة.",
      "form.errorMissingContact": "الرجاء إدخال بريدك الإلكتروني أو رقم جوالك عشان نقدر نرد عليك.",
      "form.errorInvalidEmail": "صيغة البريد الإلكتروني غير صحيحة.",
      "form.error": "صار خطأ، حاول مرة ثانية بعد شوي.",
      "link.home": "الرئيسية",
      "link.about": "من نحن",
      "link.contact": "تواصل معنا",
      "link.security": "الأمان والخصوصية",
      "link.privacy": "سياسة الخصوصية",
      "link.terms": "الشروط والأحكام",
      "footer.copy": "© 2026 بوت نبضة. جميع الحقوق محفوظة."
    },
    en: {
      pageTitle: "Contact Us | Nabda Bot",
      pageDesc: "Get in touch with the Nabda Bot team by email and we'll reply within 24 hours.",
      brandBot: "Nabda <span style=\"color:var(--wa-teal-dark)\">Bot</span>",
      backArrow: "←",
      backLink: "Back to Home",
      "hero.eyebrow": "Contact Us",
      "hero.title": "We'd love to hear from you",
      "hero.sub": "Have a question, a suggestion, or need help connecting your bot? Reach out and our team will reply within 24 hours.",
      "lead": "The easiest way to reach us is by email, and the Nabda team checks every message daily.",
      "emailLabel": "Email",
      "note": "We typically reply within 24 business hours. For questions about your subscription or connecting your WhatsApp number, mention your business name in your message so we can help you faster.",
      "form.title": "Send us a message",
      "form.nameLabel": "Name",
      "form.namePh": "Enter your name",
      "form.emailLabel": "Email",
      "form.emailPh": "Enter your email",
      "form.phoneLabel": "Phone number",
      "form.phonePh": "Enter your phone number",
      "form.messageLabel": "Your inquiry or message",
      "form.messagePh": "Write your inquiry here...",
      "form.submit": "Send message",
      "form.sending": "Sending...",
      "form.success": "Your message has been sent successfully! Our team will reply soon.",
      "form.errorMissing": "Please fill in your name and message.",
      "form.errorMissingContact": "Please enter your email or phone number so we can reach you.",
      "form.errorInvalidEmail": "Please enter a valid email address.",
      "form.error": "Something went wrong, please try again shortly.",
      "link.home": "Home",
      "link.about": "About Us",
      "link.contact": "Contact Us",
      "link.security": "Security & Privacy",
      "link.privacy": "Privacy Policy",
      "link.terms": "Terms of Service",
      "footer.copy": "© 2026 Nabda Bot. All rights reserved."
    }
  };

  function applyLanguage(lang){
    var t = translations[lang];
    document.getElementById('htmlRoot').setAttribute('lang', lang);
    document.getElementById('htmlRoot').setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.getElementById('pageTitle').textContent = t.pageTitle;
    document.getElementById('pageDesc').setAttribute('content', t.pageDesc);
    document.title = t.pageTitle;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if(t[key] !== undefined){ el.innerHTML = t[key]; }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
      var key = el.getAttribute('data-i18n-placeholder');
      if(t[key] !== undefined){ el.setAttribute('placeholder', t[key]); }
    });
    document.getElementById('langBtn').textContent = lang === 'ar' ? 'English' : 'العربية';
    localStorage.setItem('nabda_lang', lang);
  }
  function toggleLanguage(){
    var current = document.getElementById('htmlRoot').getAttribute('lang') || 'ar';
    applyLanguage(current === 'ar' ? 'en' : 'ar');
  }
  document.getElementById('langBtn').addEventListener('click', toggleLanguage);
  var savedLang = localStorage.getItem('nabda_lang');
  if(savedLang === 'en'){ applyLanguage('en'); }


  // نموذج التواصل — يرسل لدالة submit-contact-form في Supabase
  (function(){
    var form = document.getElementById('nabdaContactForm');
    if(!form) return;

    var nameInput = document.getElementById('ccName');
    var emailInput = document.getElementById('ccEmail');
    var phoneInput = document.getElementById('ccPhone');
    var messageInput = document.getElementById('ccMessage');
    var honeypot = document.getElementById('ccHoneypot');
    var submitBtn = document.getElementById('ccSubmit');
    var msgBox = document.getElementById('ccMsg');

    function currentLang(){
      return document.getElementById('htmlRoot').getAttribute('lang') || 'ar';
    }
    function t(key){
      return translations[currentLang()][key] || '';
    }
    function isValidEmail(email){
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      var phone = phoneInput.value.trim();
      var message = messageInput.value.trim();

      msgBox.textContent = '';
      msgBox.className = 'form-msg';

      if(!name || !message){
        msgBox.textContent = t('form.errorMissing');
        msgBox.className = 'form-msg error';
        return;
      }
      if(!email && !phone){
        msgBox.textContent = t('form.errorMissingContact');
        msgBox.className = 'form-msg error';
        return;
      }
      if(email && !isValidEmail(email)){
        msgBox.textContent = t('form.errorInvalidEmail');
        msgBox.className = 'form-msg error';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = t('form.sending');

      fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/submit-contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name, email: email, phone: phone, message: message,
          source: 'contact_page', website: honeypot.value
        })
      })
      .then(function(res){ return res.json().then(function(data){ return { ok: res.ok, data: data }; }); })
      .then(function(result){
        if(result.ok && result.data && result.data.success){
          msgBox.textContent = t('form.success');
          msgBox.className = 'form-msg success';
          form.reset();
          submitBtn.disabled = false;
          submitBtn.textContent = t('form.submit');
        } else {
          msgBox.textContent = t('form.error');
          msgBox.className = 'form-msg error';
          submitBtn.disabled = false;
          submitBtn.textContent = t('form.submit');
        }
      })
      .catch(function(){
        msgBox.textContent = t('form.error');
        msgBox.className = 'form-msg error';
        submitBtn.disabled = false;
        submitBtn.textContent = t('form.submit');
      });
    });
  })();
