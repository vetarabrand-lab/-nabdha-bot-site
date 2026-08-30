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
