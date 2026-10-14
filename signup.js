const SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Wplf-GMXzJ-SXzNFvahGUQ_KHqjFTz3';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // نلتقط كود الإحالة من الرابط (?ref=CODE) لو المستخدم جا عن طريق رابط أحد الشركاء
  const refCode = new URLSearchParams(window.location.search).get('ref');

// لو التاجر جاي من تثبيت التطبيق مباشرة من متجر تطبيقات سلة، بيوصل هنا برابط فيه
// salla_pending=<id> — نجيب اسم/إيميل متجره لتعبئتها تلقائياً (تبقى قابلة للتعديل)،
// وعند الإرسال نمرّرها لدالة finalize-salla-signup عشان تربط توكنات سلة المحفوظة مؤقتاً
// بالحساب الجديد بدل الإنشاء التلقائي الصامت.
const sallaPendingId = new URLSearchParams(window.location.search).get('salla_pending');

async function prefillFromSallaPending(){
  if(!sallaPendingId) return;
  try{
    const res = await fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/salla-pending-lookup?id=' + encodeURIComponent(sallaPendingId));
    const json = await res.json();
    if(!res.ok || json.error) return; // رابط منتهي أو غير صالح — نسيب النموذج فاضي عادي، التاجر يعبيه يدوياً
    const bannerHtml = '<div class="salla-pending-banner" style="background:#EAF7EF;border:1.5px solid #25D366;border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:14px;font-weight:700;color:#075E54;">✅ ' +
      (currentLang === 'ar' ? 'تم استرجاع بيانات متجرك من سلة — أكمل باقي بيانات التسجيل لإتمام الربط' : 'Your store details were pulled from Salla — complete the rest of the form to finish connecting') + '</div>';
    const form = document.getElementById('signupForm');
    form.insertAdjacentHTML('beforebegin', bannerHtml);
    if(json.store_name){
      document.getElementById('businessNameAr').value = json.store_name;
    }
    if(json.store_email){
      document.getElementById('ownerEmail').value = json.store_email;
    }
  }catch(_e){ /* نتجاهل بهدوء — النموذج يبقى شغال عادي */ }
}
prefillFromSallaPending();

// لو التاجر جاي من تثبيت التطبيق مباشرة من متجر تطبيقات زد، بيوصل هنا برابط فيه
// zid_pending=<id> — نفس النمط بالضبط المستخدم أعلاه لسلة (salla_pending).
const zidPendingId = new URLSearchParams(window.location.search).get('zid_pending');

async function prefillFromZidPending(){
  if(!zidPendingId) return;
  try{
    const res = await fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/zid-pending-lookup?id=' + encodeURIComponent(zidPendingId));
    const json = await res.json();
    if(!res.ok || json.error) return; // رابط منتهي أو غير صالح — نسيب النموذج فاضي عادي، التاجر يعبيه يدوياً
    const bannerHtml = '<div class="zid-pending-banner" style="background:#EAF7EF;border:1.5px solid #25D366;border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:14px;font-weight:700;color:#075E54;">✅ ' +
      (currentLang === 'ar' ? 'تم استرجاع بيانات متجرك من زد — أكمل باقي بيانات التسجيل لإتمام الربط' : 'Your store details were pulled from Zid — complete the rest of the form to finish connecting') + '</div>';
    const form = document.getElementById('signupForm');
    form.insertAdjacentHTML('beforebegin', bannerHtml);
    if(json.store_name){
      document.getElementById('businessNameAr').value = json.store_name;
    }
    if(json.store_email){
      document.getElementById('ownerEmail').value = json.store_email;
    }
  }catch(_e){ /* نتجاهل بهدوء — النموذج يبقى شغال عادي */ }
}
prefillFromZidPending();

// حقل كلمة المرور ظاهر ومطلوب لكل التسجيلات: كل المسارات (العادي عبر submit-signup،
// وسلة/زد عبر finalize-*) تنشئ حساب دخول فعلي فورًا بلوحة التحكم.
// مربع reCAPTCHA مطلوب فقط للتسجيل العادي — نخفيه بمسارات التثبيت المباشر من سلة/زد.
if(sallaPendingId || zidPendingId){
  const rcWrap = document.querySelector('.recaptcha-wrap');
  if(rcWrap){ rcWrap.style.display = 'none'; }
}


  var translations = {
    ar: {
      pageTitle: "سجّل نشاطك | بوت نبضة",
      pageDesc: "سجّل نشاطك التجاري في بوت نبضة وابدأ تجربتك مع بوت واتساب ذكي مخصص لك.",
      brandBot: "بوت <span style=\"color:var(--wa-teal-dark)\">نبضة</span>",
      backArrow: "→",
      backLink: "الرجوع للرئيسية",
      "hero.eyebrow": "سجّل نشاطك",
      "hero.title": "خلّي بوت نبضة يشتغل لحساب نشاطك",
      "hero.sub": "عبّي البيانات التالية وحسابك يُنشأ فورًا، وفريقنا يساعدك تربط رقم واتساب نشاطك وتفعّل الاشتراك.",
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
      "form.password": "كلمة مرور الدخول للوحة التحكم *",
      "form.passwordHint": "حسابك يُنشأ فورًا — اختر كلمة مرور (8 أحرف على الأقل) لدخول لوحة التحكم.",
      "form.errorPassword": "كلمة المرور لازم تكون 8 أحرف على الأقل.",
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
      "form.note": "بعد التسجيل تقدر تدخل لوحة التحكم فورًا، وفريقنا يساعدك تربط رقم واتساب نشاطك — بدون أي التزام مسبق.",
      "form.errorRequired": "الرجاء تعبئة كل الحقول المطلوبة (المعلّمة بـ *).",
      "form.errorTerms": "الرجاء الموافقة على الشروط والأحكام للمتابعة.",
      "form.errorSubmit": "حصل خطأ أثناء إرسال طلبك، حاول مرة ثانية أو تواصل معنا مباشرة.",
      "form.errorRecaptcha": "الرجاء تأكيد أنك لست روبوتاً (مربع التحقق فوق زر الإرسال).",
      "form.errorNetwork": "تعذّر الاتصال بالخادم — تأكد من اتصالك بالإنترنت وحاول مرة ثانية.",
      "form.submitting": "جاري الإرسال...",
      "form.plansError": "تعذّر تحميل الباقات، حدّث الصفحة أو تواصل معنا مباشرة.",
      "form.perMonth": "ريال/شهر",
      "form.oneTime": "ريال (دفعة وحدة)",
      "form.perYear": "ريال/سنة",
      "form.upTo": "حتى",
      "form.msgWord": "رسالة",
      "form.validFor": "صالحة",
      "form.monthsWord": "شهر",
      "success.title": "تم إنشاء حسابك بنجاح!",
      "success.sub": "شكراً لك، حسابك الآن بحالة \"تجريبي\" وتقدر تسجّل دخولك مباشرة بالبريد وكلمة المرور اللي اخترتها. هذي الخطوات الجاية:",
      "success.s1": "ادخل <a href=\"portal.html\">لوحة التحكم</a> بالبريد وكلمة المرور اللي سجّلت فيها.",
      "success.s2": "نساعدك تربط رقم واتساب نشاطك عبر Meta.",
      "success.s3": "نفعّل اشتراكك بعد تأكيد الباقة والدفع.",
      "success.s4": "بوتك يبدأ يرد على عملائك تلقائياً 🎉",
      "success.back": "الرجوع للصفحة الرئيسية",
      "success.login": "تسجيل الدخول للوحة التحكم",
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
      "hero.sub": "Fill in the details below and your account is created instantly, then our team helps you connect your WhatsApp number and activate your subscription.",
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
      "form.password": "Dashboard Login Password *",
      "form.passwordHint": "Your account is created immediately, choose a password (at least 8 characters) to log in to the dashboard.",
      "form.errorPassword": "Password must be at least 8 characters.",
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
      "form.note": "After signing up you can log in to the dashboard right away, and our team helps you connect your WhatsApp number, no upfront commitment.",
      "form.errorRequired": "Please fill in all required fields (marked with *).",
      "form.errorTerms": "Please agree to the Terms & Conditions to continue.",
      "form.errorSubmit": "Something went wrong while submitting your request. Please try again or contact us directly.",
      "form.errorRecaptcha": "Please confirm you are not a robot (the check box above the submit button).",
      "form.errorNetwork": "Could not reach the server. Check your internet connection and try again.",
      "form.submitting": "Submitting...",
      "form.plansError": "Could not load plans. Refresh the page or contact us directly.",
      "form.perMonth": "SAR/month",
      "form.oneTime": "SAR (one-time)",
      "form.perYear": "SAR/year",
      "form.upTo": "Up to",
      "form.msgWord": "messages",
      "form.validFor": "valid for",
      "form.monthsWord": "months",
      "success.title": "Your account has been created!",
      "success.sub": "Thank you, your account is now in \"trial\" status and you can log in right away with the email and password you chose. Here is what happens next:",
      "success.s1": "Log in to the <a href=\"portal.html\">dashboard</a> with the email and password you signed up with.",
      "success.s2": "We help you connect your business WhatsApp number via Meta.",
      "success.s3": "We activate your subscription after confirming your plan and payment.",
      "success.s4": "Your bot starts replying to your customers automatically!",
      "success.back": "Back to Home",
      "success.login": "Log in to the dashboard",
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

  var planTab = null; // monthly | annual | prepaid
  function planCycle(p){ return p.is_prepaid ? 'prepaid' : (p.billing_cycle === 'annual' ? 'annual' : 'monthly'); }
  function fmtN(n){ return Number(n).toLocaleString('en-US'); }

  function renderPlans(){
    var t = translations[currentLang];
    var ar = currentLang === 'ar';
    if(!planTab && plansData.length){ planTab = planCycle(plansData[preselectedIndex] || plansData[0]); }

    // أزرار اختيار المدة (مثل مفتاح الشهري/السنوي بالصفحة الرئيسية)
    var tabsEl = document.getElementById('planTabs');
    if(!tabsEl){
      tabsEl = document.createElement('div');
      tabsEl.id = 'planTabs';
      tabsEl.className = 'plan-tabs';
      plansContainer.parentNode.insertBefore(tabsEl, plansContainer);
    }
    var tabs = [['annual', ar ? 'سنوي' : 'Annual'], ['monthly', ar ? 'شهري' : 'Monthly'], ['prepaid', ar ? 'رصيد مسبق' : 'Prepaid']];
    tabsEl.innerHTML = '';
    tabs.forEach(function(tb){
      if(!plansData.some(function(p){ return planCycle(p) === tb[0]; })) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'plan-tab' + (planTab === tb[0] ? ' active' : '');
      b.textContent = tb[1];
      if(tb[0] === 'annual' && launchPromoOn){
        var sv = document.createElement('em'); sv.textContent = ar ? 'وفّر 50%' : 'Save 50%'; b.appendChild(sv);
      }
      b.addEventListener('click', function(){
        planTab = tb[0];
        var first = plansData.findIndex(function(p){ return planCycle(p) === planTab; });
        var pref = plansData.findIndex(function(p){ return planCycle(p) === planTab && /growth/.test(p.code); });
        preselectedIndex = pref !== -1 ? pref : first;
        selectedPlanIdInput.value = plansData[preselectedIndex].id;
        renderPlans();
      });
      tabsEl.appendChild(b);
    });

    plansContainer.innerHTML = '';
    plansData.forEach(function(plan, idx){
      if(planCycle(plan) !== planTab) return;
      var card = document.createElement('div');
      card.className = 'plan-card' + (idx === preselectedIndex ? ' selected' : '') + (/growth/.test(plan.code) ? ' popular' : '');
      card.dataset.planId = plan.id;
      var planName = currentLang === 'en' && plan.name_en ? plan.name_en : String(plan.name_ar || '').replace(/\s*\(سنوي\)\s*/, '');
      var isPrepaid = !!plan.is_prepaid;
      var isAnnual = planCycle(plan) === 'annual';
      var msgCount = isPrepaid ? (plan.prepaid_credits || 0) : (plan.monthly_message_limit || 0);
      var limitLine = t['form.upTo'] + ' ' + fmtN(msgCount) + ' ' + t['form.msgWord'] + (isPrepaid ? '' : (ar ? ' شهرياً' : '/month'));
      if(isPrepaid && plan.prepaid_validity_months){
        limitLine += ' — ' + t['form.validFor'] + ' ' + plan.prepaid_validity_months + ' ' + t['form.monthsWord'];
      }
      var total = Number(plan.monthly_price_sar);
      var big, unit, strike = '', note = '';
      if(isPrepaid){
        big = fmtN(total); unit = t['form.oneTime'];
      } else if(isAnnual){
        var payTotal = launchPromoOn ? Math.round(total * 0.5) : total;
        big = fmtN(Math.round(payTotal / 12));
        unit = ar ? 'ريال / شهرياً' : 'SAR / month';
        if(launchPromoOn){ strike = '<s class="p-strike">' + fmtN(Math.round(total / 12)) + '</s> '; }
        note = launchPromoOn
          ? (ar ? 'يُدفع ' + fmtN(payTotal) + ' ريال سنوياً (خصم الافتتاح 50%، بدل ' + fmtN(total) + ')' : 'Billed ' + fmtN(payTotal) + ' SAR/year (50% launch discount, was ' + fmtN(total) + ')')
          : (ar ? 'يُدفع ' + fmtN(total) + ' ريال سنوياً' : 'Billed ' + fmtN(total) + ' SAR/year');
      } else {
        big = fmtN(total); unit = ar ? 'ريال / شهرياً' : 'SAR / month';
      }
      card.innerHTML =
        (card.classList.contains('popular') ? '<span class="p-badge">' + (ar ? 'الأكثر طلباً' : 'Most popular') + '</span>' : '') +
        '<div class="p-name">' + planName + '</div>' +
        '<div class="p-price">' + strike + '<b>' + big + '</b><span> ' + unit + '</span></div>' +
        '<div class="p-note">' + note + '</div>' +
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

  var launchPromoOn = false;
  async function loadLaunchPromo(){
    try{
      var r = await fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/get-launch-promo-status');
      var j = await r.json();
      launchPromoOn = !!(j && j.active && j.annual && j.annual.remaining > 0);
    }catch(e){ launchPromoOn = false; }
  }

  async function loadPlans(){
    await loadLaunchPromo();
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

    const pendingPasswordEl = document.getElementById('pendingPassword');
    const pendingPassword = pendingPasswordEl ? pendingPasswordEl.value : '';
    if(pendingPassword.length < 8){
      errorAlert.textContent = t['form.errorPassword'];
      errorAlert.style.display = 'block';
      return;
    }

    // التسجيل العادي يمر عبر دالة submit-signup اللي تشترط reCAPTCHA (مسارات سلة/زد ما تحتاجه)
    const isGenericSignup = !zidPendingId && !sallaPendingId;
    let recaptchaToken = '';
    if(isGenericSignup){
      recaptchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
      if(!recaptchaToken){
        errorAlert.textContent = t['form.errorRecaptcha'];
        errorAlert.style.display = 'block';
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t['form.submitting'];

    let signupFailed = false;

    if(zidPendingId){
      // تدفق زد: نمرّر البيانات لدالة finalize-zid-signup عشان تربط توكنات زد
      // المحفوظة مؤقتاً بالحساب الجديد — ما نقدر نسوي هذا بإدراج مباشر من المتصفح
      try{
        const res = await fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/finalize-zid-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zid_pending: zidPendingId,
            business_name: businessName,
            business_name_ar: businessNameAr,
            owner_email: ownerEmail,
            owner_phone: ownerPhone,
            whatsapp_display_number: whatsappDisplayNumber,
            system_prompt: systemPrompt,
            welcome_message: welcomeMessage,
            plan_id: planId,
            password: pendingPassword,
            website_hp: document.getElementById('websiteHp').value
          })
        });
        const json = await res.json();
        if(!res.ok || json.error){
          signupFailed = true;
          errorAlert.textContent = json.error || t['form.errorSubmit'];
        }
      }catch(err){
        signupFailed = true;
        console.error(err);
      }
    } else if(sallaPendingId){
      // تدفق سلة: نمرّر البيانات لدالة finalize-salla-signup عشان تربط توكنات سلة
      // المحفوظة مؤقتاً بالحساب الجديد — ما نقدر نسوي هذا بإدراج مباشر من المتصفح
      try{
        const res = await fetch('https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1/finalize-salla-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salla_pending: sallaPendingId,
            business_name: businessName,
            business_name_ar: businessNameAr,
            owner_email: ownerEmail,
            owner_phone: ownerPhone,
            whatsapp_display_number: whatsappDisplayNumber,
            system_prompt: systemPrompt,
            welcome_message: welcomeMessage,
            plan_id: planId,
            password: pendingPassword,
            website_hp: document.getElementById('websiteHp').value
          })
        });
        const json = await res.json();
        if(!res.ok || json.error){
          signupFailed = true;
          errorAlert.textContent = json.error || t['form.errorSubmit'];
        }
      }catch(err){
        signupFailed = true;
        console.error(err);
      }
    } else {
      // التسجيل العادي: الإدراج المباشر بجدول clients من المتصفح مرفوض بسياسات RLS،
      // فنمرّر البيانات لدالة submit-signup (تتحقق من reCAPTCHA، تنشئ العميل وحساب الدخول فورًا)
      try{
        const res = await fetch(SUPABASE_URL + '/functions/v1/submit-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          },
          body: JSON.stringify({
            business_name: businessName,
            business_name_ar: businessNameAr,
            owner_email: ownerEmail,
            owner_phone: ownerPhone,
            whatsapp_display_number: whatsappDisplayNumber,
            system_prompt: systemPrompt,
            welcome_message: welcomeMessage,
            plan_id: planId,
            ref_code: refCode || null,
            password: pendingPassword,
            recaptcha_token: recaptchaToken,
            website_hp: document.getElementById('websiteHp').value
          })
        });
        let json = {};
        try{ json = await res.json(); }catch(_e){ json = {}; }
        if(!res.ok || json.error || !json.success){
          signupFailed = true;
          // الدالة ترجع رسائل عربية واضحة (بريد مكرر، باقة غير متاحة، تحقق روبوت...)
          errorAlert.textContent = json.error || t['form.errorSubmit'];
        }
      }catch(err){
        signupFailed = true;
        errorAlert.textContent = t['form.errorNetwork'];
        console.error(err);
      }
      if(signupFailed && typeof grecaptcha !== 'undefined'){
        try{ grecaptcha.reset(); }catch(_e){}
      }
    }

    if(signupFailed){
      submitBtn.disabled = false;
      submitBtn.textContent = t['form.submit'];
      errorAlert.style.display = 'block';
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
