var translations = {
    ar: {
      pageTitle: "من نحن | بوت نبضة",
      pageDesc: "تعرّف على منصة بوت نبضة وقصتنا في بناء بوتات واتساب ذكية لأصحاب الأعمال في الخليج.",
      brandBot: "بوت <span style=\"color:var(--wa-teal-dark)\">نبضة</span>",
      backArrow: "→",
      backLink: "الرجوع للرئيسية",
      "hero.eyebrow": "من نحن",
      "hero.title": "نبني تجربة عملاء أذكى لأصحاب الأعمال في الخليج",
      "hero.sub": "بوت نبضة منصة سعودية تساعد أصحاب الأنشطة التجارية يردون على عملائهم في واتساب تلقائياً، بذكاء وبهوية نشاطهم.",
      "s1.h": "قصتنا",
      "s1.p1": "بدأت فكرة نبضة من ملاحظة بسيطة: أصحاب المتاجر والأنشطة الصغيرة والمتوسطة في الخليج يقضون ساعات طويلة يومياً يردون على نفس الأسئلة المتكررة على واتساب — مواعيد التوصيل، الأسعار، طرق الدفع — بدل ما يركزون على تطوير أعمالهم.",
      "s1.p2": "فبنينا نبضة: بوت واتساب ذكي يفهم نشاطك، يتكلم بلهجتك، ويرد على عملائك فوراً على مدار الساعة، مع تحويل أي محادثة تحتاج تدخل بشري مباشرة لك.",
      "s2.h": "مهمتنا",
      "s2.p1": "نساعد أصحاب الأعمال في السعودية والخليج يقدّمون خدمة عملاء احترافية بدون ما يحتاجون فريق دعم كبير أو ميزانية ضخمة — بحل بسيط، عربي بالكامل، وجاهز خلال دقائق.",
      "s3.h": "ليش نبضة؟",
      "v1.t": "عربي أولاً",
      "v1.d": "مبني من الصفر للعربية ولهجات الخليج، مو ترجمة حرفية من منتج أجنبي.",
      "v2.t": "إعداد سريع",
      "v2.d": "تربط رقم واتساب نشاطك وتخصص تعليمات البوت خلال دقائق، بدون كود.",
      "v3.t": "دعم حقيقي",
      "v3.d": "فريقنا يتابع معك من أول يوم لربط رقمك وتخصيص البوت لنشاطك.",
      "cta": "جرّب نبضة مجاناً",
      "link.home": "الرئيسية",
      "link.about": "من نحن",
      "link.contact": "تواصل معنا",
      "link.security": "الأمان والخصوصية",
      "link.privacy": "سياسة الخصوصية",
      "link.terms": "الشروط والأحكام",
      "footer.copy": "© 2026 بوت نبضة. جميع الحقوق محفوظة."
    },
    en: {
      pageTitle: "About Us | Nabda Bot",
      pageDesc: "Learn about Nabda Bot and our story building smart WhatsApp bots for businesses across the Gulf.",
      brandBot: "Nabda <span style=\"color:var(--wa-teal-dark)\">Bot</span>",
      backArrow: "←",
      backLink: "Back to Home",
      "hero.eyebrow": "About Us",
      "hero.title": "Building a smarter customer experience for Gulf businesses",
      "hero.sub": "Nabda is a Saudi platform that helps businesses reply to their WhatsApp customers automatically, intelligently, and in their own voice.",
      "s1.h": "Our Story",
      "s1.p1": "Nabda started from a simple observation: small and medium business owners across the Gulf spend hours every day answering the same repetitive WhatsApp questions, delivery times, prices, payment methods, instead of focusing on growing their business.",
      "s1.p2": "So we built Nabda: a smart WhatsApp bot that understands your business, speaks your dialect, and replies to your customers instantly around the clock, while handing off any conversation that needs a human touch straight to you.",
      "s2.h": "Our Mission",
      "s2.p1": "We help business owners in Saudi Arabia and the Gulf deliver professional customer service without needing a large support team or a big budget, with a simple, fully Arabic, ready-in-minutes solution.",
      "s3.h": "Why Nabda?",
      "v1.t": "Arabic-first",
      "v1.d": "Built from the ground up for Arabic and Gulf dialects, not a literal translation of a foreign product.",
      "v2.t": "Fast setup",
      "v2.d": "Connect your business WhatsApp number and customize your bot's instructions in minutes, no code needed.",
      "v3.t": "Real support",
      "v3.d": "Our team works with you from day one to connect your number and customize your bot.",
      "cta": "Try Nabda for Free",
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
