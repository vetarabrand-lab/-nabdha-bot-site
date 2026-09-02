const SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Wplf-GMXzJ-SXzNFvahGUQ_KHqjFTz3';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // نلتقط كود الإحالة من الرابط (?ref=CODE) لو المستخدم جا عن طريق رابط أحد الشركاء
  const refCode = new URLSearchParams(window.location.search).get('ref');

  var translations = {
    ar: {
      pageTitle: "سجّل نشاطك | بوت نبضة",
      pageDesc: "سجّل نشاطك التجاري في بوت نبضة وابدأ تجربتك مع بوت واتساب ذكي مخصص لك.",
      brandBot: "بوت <span style=\"color:var(--wa-teal-dark)\">نبضة</span>",
      backArrow: "→",
      backLink: "الرجوع للرئيسية",
      "hero.eyebrow": "سجّل نشاطك",
      "hero.title": "خلّي بوت نبضة يشتغل لحساب نشاطك",
      "hero.sub": "عبّي البيانات التالية، وفريقنا يتواصل معك خلال 24 ساعة لربط رقم واتساب نشاطك وتفعيل الاشتراك.",
      "form.s1": "بيانات النشاط",
      "form.bizNameAr": "اسم النشاط (بالعربي) *",
      "form.bizNameArPh": "مثال: متجر جُمان للبهارات",
      "form.bizNameEn": "اسم النشاط (بالإنجليزي)",
      "form.bizNameEnPh": "Juman Spices",
      "form.s2": "بيانات التواصل",
      "form.email": "البريد الإلكتروني *",
      "form.phone": "رقم جوالك (للتواصل معك) *",
      "form.waNumber": "رقم واتساب النشاط الذي تريد ربطه بالبوت",
      "form.waNumberHint": "إذا ما عندك رقم جاهز بعد، اتركه فاضي — فريقنا يساعدك تجهزه.",
      "form.s3": "تعليمات البوت",
      "form.prompt": "عرّفنا بنشاطك (وش تبيعون، سياسة الشحن، أهم الأسئلة المتكررة...) *",
      "form.promptPh": "مثال: نبيع بهارات وتوابل أصلية عبر متجرنا الإلكتروني على Zid. الشحن داخل السعودية 3-5 أيام عمل، مجاني فوق 200 ريال...",
      "form.promptHint": "هذا النص هو اللي البوت بيعتمد عليه بالرد على عملائك — كل ما كان أوضح، كانت ردوده أدق.",
      "form.welcome": "رسالة الترحيب الأولى (اختياري)",
      "form.welcomePh": "أهلاً بك في متجر جُمان 🌿 كيف أقدر أساعدك؟",
      "form.s4": "اختر باقتك",
      "form.loadingPlans": "جاري تحميل الباقات...",
      "form.agreeTerms": "أوافق على <a href=\"terms.html\" target=\"_blank\" rel=\"noopener\">الشروط والأحكام</a> وسياسة الخصوصية *",
      "form.marketingConsent": "أحب أستلم عروض وتحديثات بوت نبضة عبر الإيميل (اختياري)",
      "form.submit": "إرسال طلب التسجيل",
      "form.note": "بإرسالك للطلب، فريقنا بيتواصل معك لإكمال الربط والدفع — بدون أي التزام مسبق.",
      "form.errorRequired": "الرجاء تعبئة كل الحقول المطلوبة (المعلّمة بـ *).",
      "form.errorTerms": "الرجاء الموافقة على الشروط والأحكام للمتابعة.",
      "form.errorSubmit": "حصل خطأ أثناء إرسال طلبك، حاول مرة ثانية أو تواصل معنا مباشرة.",
      "form.submitting": "جاري الإرسال...",
      "form.plansError": "تعذّر تحميل الباقات، حدّث الصفحة أو تواصل معنا مباشرة.",
      "form.perMonth": "ريال/شهر",
      "form.oneTime": "ريال (دفعة وحدة)",
      "form.perYear": "ريال/سنة",
      "form.upTo": "حتى",
      "form.msgWord": "رسالة",
      "form.validFor": "صالحة",
      "form.monthsWord": "شهر",
      "success.title": "تم استلام تسجيلك بنجاح!",
      "success.sub": "شكراً لك، حسابك الآن بحالة \"تجريبي\". هذي الخطوات الجاية:",
      "success.s1": "فريقنا يراجع طلبك ويتواصل معك خلال 24 ساعة.",
      "success.s2": "نساعدك تربط رقم واتساب نشاطك عبر Meta.",
      "success.s3": "نفعّل اشتراكك بعد تأكيد الباقة والدفع.",
      "success.s4": "بوتك يبدأ يرد على عملائك تلقائياً 🎉",
      "success.back": "الرجوع للصفحة الرئيسية",
      "footer.copy": "© 2026 بوت نبضة. جميع الحقوق محفوظة."
    },
    en: {
      pageTitle: "Sign Up | Nabda Bot",
      pageDesc: "Sign up your business with Nabda Bot and start your trial with a smart, custom WhatsApp bot.",
      brandBot: "Nabda <span style=\"color:var(--wa-teal-dark)\">Bot</span>",
      backArrow: "←",
      backLink: "Back to Home",
      "hero.eyebrow": "Sign Up Your Business",
      "hero.title": "Get Nabda Bot working for your business",
      "hero.sub": "Fill in the details below, and our team will reach out within 24 hours to connect your WhatsApp number and activate your subscription.",
      "form.s1": "Business Details",
      "form.bizNameAr": "Business Name (Arabic) *",
      "form.bizNameArPh": "e.g. Juman Spices Store",
      "form.bizNameEn": "Business Name (English)",
      "form.bizNameEnPh": "Juman Spices",
      "form.s2": "Contact Details",
      "form.email": "Email Address *",
      "form.phone": "Your Phone Number (for us to reach you) *",
      "form.waNumber": "The business WhatsApp number you want to connect",
      "form.waNumberHint": "If you do not have a number ready yet, leave this blank, our team will help you set one up.",
      "form.s3": "Bot Instructions",
      "form.prompt": "Tell us about your business (what you sell, shipping policy, common questions...) *",
      "form.promptPh": "e.g. We sell authentic spices and herbs through our online store on Zid. Shipping within Saudi Arabia takes 3-5 business days, free over 200 SAR...",
      "form.promptHint": "This is the text the bot relies on to reply to your customers, the clearer it is, the more accurate the replies.",
      "form.welcome": "First welcome message (optional)",
      "form.welcomePh": "Welcome to Juman Store, how can I help you?",
      "form.s4": "Choose Your Plan",
      "form.loadingPlans": "Loading plans...",
      "form.agreeTerms": "I agree to the <a href=\"terms.html\" target=\"_blank\" rel=\"noopener\">Terms & Conditions</a> and Privacy Policy *",
      "form.marketingConsent": "I'd like to receive Nabda Bot offers and updates via email (optional)",
      "form.submit": "Submit Sign-up Request",
      "form.note": "By submitting, our team will reach out to complete setup and payment, no upfront commitment.",
      "form.errorRequired": "Please fill in all required fields (marked with *).",
      "form.errorTerms": "Please agree to the Terms & Conditions to continue.",
      "form.errorSubmit": "Something went wrong while submitting your request. Please try again or contact us directly.",
      "form.submitting": "Submitting...",
      "form.plansError": "Could not load plans. Refresh the page or contact us directly.",
      "form.perMonth": "SAR/month",
      "form.oneTime": "SAR (one-time)",
      "form.perYear": "SAR/year",
      "form.upTo": "Up to",
      "form.msgWord": "messages",
      "form.validFor": "valid for",
      "form.monthsWord": "months",
      "success.title": "Your sign-up was received!",
      "success.sub": "Thank you, your account is now in \"trial\" status. Here is what happens next:",
      "success.s1": "Our team reviews your request and reaches out within 24 hours.",
      "success.s2": "We help you connect your business WhatsApp number via Meta.",
      "success.s3": "We activate your subscription after confirming your plan and payment.",
      "success.s4": "Your bot starts replying to your customers automatically!",
      "success.back": "Back to Home",
      "footer.copy": "© 2026 Nabda Bot. All rights reserved."
    }
  };

  var currentLang = 'ar';

  function applyLanguage(lang){
    currentLang = lang;
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

    if(plansData.length){ renderPlans(); }

    localStorage.setItem('nabda_lang', lang);
  }

  function toggleLanguage(){
    applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
  }
  document.getElementById('langBtn').addEventListener('click', toggleLanguage);

  var savedLang = localStorage.getItem('nabda_lang');
  if(savedLang === 'en'){ applyLanguage('en'); }

  const plansContainer = document.getElementById('plansContainer');
  const selectedPlanIdInput = document.getElementById('selectedPlanId');
  let plansData = [];
  let preselectedIndex = 0;

  function renderPlans(){
    var t = translations[currentLang];
    plansContainer.innerHTML = '';
    plansData.forEach(function(plan, idx){
      const card = document.createElement('div');
      card.className = 'plan-card' + (idx === preselectedIndex ? ' selected' : '');
      card.dataset.planId = plan.id;
      var planName = currentLang === 'en' && plan.name_en ? plan.name_en : plan.name_ar;
      // ميزة 7: باقات الدفع المسبق تخزّن عدد الرسائل بعمود prepaid_credits (مو monthly_message_limit،
      // اللي يفضل 0 لها بقصد)، والسعر دفعة وحدة مو شهري — لازم نميّزها هنا وإلا تطلع "0 رسالة" غلط
      var isPrepaid = !!plan.is_prepaid;
      var isAnnual = !isPrepaid && plan.billing_cycle === 'annual';
      var priceUnitLabel = isPrepaid ? t['form.oneTime'] : (isAnnual ? t['form.perYear'] : t['form.perMonth']);
      var msgCount = isPrepaid ? (plan.prepaid_credits || 0) : (plan.monthly_message_limit || 0);
      var limitLine = t['form.upTo'] + ' ' + Number(msgCount).toLocaleString(currentLang === 'ar' ? 'ar' : 'en') + ' ' + t['form.msgWord'];
      if(isPrepaid && plan.prepaid_validity_months){
        limitLine += ' — ' + t['form.validFor'] + ' ' + plan.prepaid_validity_months + ' ' + t['form.monthsWord'];
      }
      card.innerHTML =
        '<div class="p-name">' + planName + '</div>' +
        '<div class="p-price">' + Number(plan.monthly_price_sar).toLocaleString(currentLang === 'ar' ? 'ar' : 'en') + '<span> ' + priceUnitLabel + '</span></div>' +
        '<div class="p-limit">' + limitLine + '</div>';
      card.addEventListener('click', function(){
        document.querySelectorAll('.plan-card').forEach(function(c){ c.classList.remove('selected'); });
        card.classList.add('selected');
        selectedPlanIdInput.value = plan.id;
        preselectedIndex = idx;
      });
      plansContainer.appendChild(card);
    });
  }

  async function loadPlans(){
    const { data, error } = await supabaseClient
      .from('subscription_plans')
      .select('id, code, name_ar, monthly_price_sar, monthly_message_limit, is_prepaid, prepaid_credits, prepaid_validity_months, billing_cycle')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if(error || !data || data.length === 0){
      plansContainer.innerHTML = '<div class="plans-loading">' + translations[currentLang]['form.plansError'] + '</div>';
      return;
    }
    plansData = data;

    const requestedPlan = new URLSearchParams(window.location.search).get('plan');
    let idx = data.findIndex(function(p){ return p.code === requestedPlan; });
    if(idx === -1){ idx = data.length > 1 ? 1 : 0; }
    preselectedIndex = idx;

    renderPlans();
    selectedPlanIdInput.value = data[preselectedIndex].id;
  }
  loadPlans();

  const form = document.getElementById('signupForm');
  const errorAlert = document.getElementById('errorAlert');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    errorAlert.style.display = 'none';

    if(document.getElementById('websiteHp').value.trim() !== ''){
      return;
    }

    const t = translations[currentLang];
    const businessNameAr = document.getElementById('businessNameAr').value.trim();
    const businessName = document.getElementById('businessName').value.trim() || businessNameAr;
    const ownerEmail = document.getElementById('ownerEmail').value.trim();
    const ownerPhone = document.getElementById('ownerPhone').value.trim();
    const whatsappDisplayNumber = document.getElementById('whatsappDisplayNumber').value.trim() || null;
    const systemPrompt = document.getElementById('systemPrompt').value.trim();
    const welcomeMessage = document.getElementById('welcomeMessage').value.trim() || null;
    const planId = selectedPlanIdInput.value || null;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const marketingConsent = document.getElementById('marketingConsent').checked;

    if(!businessNameAr || !ownerEmail || !ownerPhone || !systemPrompt){
      errorAlert.textContent = t['form.errorRequired'];
      errorAlert.style.display = 'block';
      return;
    }

    if(!agreeTerms){
      errorAlert.textContent = t['form.errorTerms'];
      errorAlert.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t['form.submitting'];

    // لو فيه كود إحالة بالرابط، نتحقق منه عبر دالة آمنة (بدون فتح جدول الشركاء بالكامل)
    let affiliateId = null;
    if(refCode){
      const { data: affId } = await supabaseClient.rpc('lookup_referral_code', { p_code: refCode });
      if(affId){ affiliateId = affId; }
    }

    const { error } = await supabaseClient.from('clients').insert({
      business_name: businessName,
      business_name_ar: businessNameAr,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      whatsapp_display_number: whatsappDisplayNumber,
      system_prompt: systemPrompt,
      welcome_message: welcomeMessage,
      plan_id: planId,
      subscription_status: 'trial',
      affiliate_id: affiliateId
    });

    if(error){
      submitBtn.disabled = false;
      submitBtn.textContent = t['form.submit'];
      errorAlert.textContent = t['form.errorSubmit'];
      errorAlert.style.display = 'block';
      console.error(error);
      return;
    }

    // لو العميل وافق على استلام العروض التسويقية، نسجّله في قائمة النشرة البريدية
    // (طلب منفصل واختياري، ما يوقف نجاح التسجيل حتى لو فشل)
    if(marketingConsent){
      fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, source: 'trial_signup' })
      }).catch(function(){});
    }

    form.style.display = 'none';
    document.getElementById('successCard').style.display = 'block';

    // بكسل ميتا: تسجيل حدث "اكتمال التسجيل" لقياس نتائج الحملات الإعلانية
    if(typeof fbq === 'function'){
      fbq('track', 'CompleteRegistration', { content_name: 'trial_signup', plan_id: planId });
    }
  });
