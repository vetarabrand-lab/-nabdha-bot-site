const SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Wplf-GMXzJ-SXzNFvahGUQ_KHqjFTz3';
  const FUNCTIONS_BASE = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const loginScreen = document.getElementById('loginScreen');
  const forgotScreen = document.getElementById('forgotScreen');
  const resetScreen = document.getElementById('resetScreen');
  const appScreen = document.getElementById('appScreen');
  const logoutBtn = document.getElementById('logoutBtn');
  const ticketStatusLabels = {
    open: 'مفتوحة',
    in_progress: 'قيد المعالجة',
    closed: 'تم الحل'
  };
  const campaignStatusLabels = {
    sending: 'جاري الإرسال',
    completed: 'مكتملة',
    failed: 'فشلت'
  };
  const templateStatusLabels = {
    draft: 'مسودة',
    pending: 'قيد المراجعة من واتساب',
    approved: 'معتمد ✅',
    rejected: 'مرفوض',
    paused: 'موقوف'
  };
  let myClient = null;
  let myPlan = null;
  let myUserId = null;
  let isOwner = false;
  let conversations = {};
  let activePhone = null;
  let myTickets = [];
  let activeTicketId = null;
  let myCampaigns = [];
  let myTemplates = [];
  let currentDraftTemplateId = null;
  let allMessages = [];
  let simHistory = [];
  let staffList = [];
  let myStaffPermissions = {};
  const PERMISSION_DEFS = [
    { key: 'analytics', label: 'التحليلات' },
    { key: 'templates', label: 'قوالب الرسائل' },
    { key: 'addons', label: 'الإضافات' },
    { key: 'channels', label: 'قنوات الربط' },
    { key: 'settings', label: 'إعدادات البوت' }
  ];
  let staffMap = {};
  let filterMineOnly = false;
  // اسم العميل النهائي ونص رسائل واتساب تجي من WhatsApp API (يتحكم فيها الطرف الآخر بالمحادثة)
  // ومو موثوقة — لازم تتنضف قبل إدراجها كـ HTML عشان نمنع ثغرات XSS في بوابة صاحب النشاط
  function escapeHtml(str){
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  // إخفاء رقم العميل عن الموظفين (غير صاحب الحساب) — تُطبَّق فقط على العرض، الإرسال الفعلي يستمر يستخدم الرقم الحقيقي
  function phoneHidingActive(){
    return !isOwner && !!(myClient && myClient.hide_customer_phone_from_staff);
  }
  function maskPhone(phone){
    const digits = String(phone || '').replace(/[^0-9]/g, '');
    return digits.length > 4 ? '•••• ' + digits.slice(-4) : '••••';
  }
  function displayPhone(phone){
    return phoneHidingActive() ? maskPhone(phone) : phone;
  }
  function displayConvName(conv, phone){
    if(phoneHidingActive() && conv.name === phone){
      return PT('عميل') + ' ' + maskPhone(phone);
    }
    return conv.name;
  }
  /* ---------- قوالب بوت جاهزة حسب نوع النشاط ---------- */
  // تعبئة سريعة لخانة "تعليمات البوت" و"رسالة الترحيب" — بدل ما التاجر يواجه خانة فاضية ويعلّق،
  // يختار نوع نشاطه فتتعبى القوالب تلقائياً، ويعدّل بعدين على التفاصيل بين الأقواس [ ].
  var BOT_TEMPLATES = {
    perfume: {
      emoji: '🌸', label: 'متجر عطور',
      prompt: 'أنت مساعد ذكي لمتجر عطور اسمه [اسم المتجر]. أسلوبك دافئ وراقي يعكس فخامة العطور. لما يسأل العميل عن عطر معيّن، اسأله عن نوع الرائحة اللي يفضلها (شرقية، فرنسية، صيفية، شتوية) لتساعده يختار. جاوب بثقة عن مكونات العطر وثباته إذا كانت المعلومة متوفرة عندك، وإذا ما كانت متوفرة وضّح للعميل إنك بتتأكد وترد عليه. وضّح سياسة الإرجاع: [اكتب هنا مدة وشروط الإرجاع الفعلية عندك]. اذكر طرق الدفع المتاحة: [اكتب طرق الدفع عندك]. لمعرفة حالة الشحن أو التوصيل استخدم بيانات الطلب المتوفرة لك. إذا العميل يبي يتكلم مع شخص حقيقي أو عنده شكوى، حوّل المحادثة فوراً لفريق الدعم.',
      welcome: 'أهلاً بك في [اسم المتجر] 🌸 وش تحب تعرف عن عطورنا اليوم؟'
    },
    fashion: {
      emoji: '👗', label: 'أزياء وملابس',
      prompt: 'أنت مساعد ذكي لمتجر أزياء وملابس اسمه [اسم المتجر]. أسلوبك ودود وعصري. ساعد العميل يختار المقاس المناسب باسأله عن طوله ووزنه أو مقاسه المعتاد إذا احتاج، واعرض له جدول المقاسات إذا كان متوفر عندك. جاوب عن الألوان والمقاسات المتوفرة إذا كانت المعلومة عندك. وضّح سياسة الاستبدال والإرجاع: [اكتب هنا مدة وشروط الاستبدال/الإرجاع عندك]. اذكر مدة التوصيل المتوقعة: [اكتب مدة التوصيل]. إذا العميل يبي يتأكد من حالة طلبه استخدم بيانات الطلب المتوفرة لك. حوّل أي شكوى أو طلب خاص لفريق الدعم البشري.',
      welcome: 'هلا فيك في [اسم المتجر] 👗 تحب أساعدك تلقى القطعة المناسبة؟'
    },
    beauty: {
      emoji: '💄', label: 'مستحضرات تجميل',
      prompt: 'أنت مساعد ذكي لمتجر مستحضرات تجميل وعناية بالبشرة اسمه [اسم المتجر]. أسلوبك ودود ومطمئن، واحرص إنك ما تعطي أي نصيحة طبية أو تشخيص لحالة جلدية — وجّه أي سؤال طبي لاستشارة مختص. جاوب عن مكونات المنتج ونوع البشرة المناسبة له إذا كانت المعلومة متوفرة عندك. وضّح سياسة الإرجاع: [اكتب هنا شروط الإرجاع عندك، خصوصاً للمنتجات المفتوحة]. اذكر طرق الدفع والتوصيل المتاحة: [التفاصيل]. حوّل أي استفسار طبي أو شكوى لفريق الدعم البشري فوراً.',
      welcome: 'أهلاً بك في [اسم المتجر] 💄 كيف أقدر أساعدك تعتني ببشرتك اليوم؟'
    },
    electronics: {
      emoji: '📱', label: 'إلكترونيات وجوالات',
      prompt: 'أنت مساعد ذكي لمتجر إلكترونيات وجوالات اسمه [اسم المتجر]. أسلوبك واضح ومباشر ومتخصص. جاوب عن المواصفات التقنية للمنتجات إذا كانت متوفرة عندك (المعالج، الذاكرة، البطارية، إلخ)، ووضّح مدة الضمان: [اكتب هنا مدة الضمان]. وضّح سياسة الإرجاع والاستبدال: [اكتب هنا الشروط]. اذكر طرق الدفع المتاحة وخيارات التقسيط إذا وجدت: [التفاصيل]. إذا كان سؤال العميل تقني معقد وما عندك معلومة أكيدة عنه، وضّح إنك بتتأكد من الفريق المختص وترجع له. حوّل أي مشكلة بالمنتج بعد الاستلام لفريق الدعم الفني.',
      welcome: 'هلا بك في [اسم المتجر] 📱 أي جهاز أو منتج تدور عليه اليوم؟'
    },
    food: {
      emoji: '☕', label: 'مطاعم وكافيهات',
      prompt: 'أنت مساعد ذكي لمطعم أو كافيه اسمه [اسم المتجر]. أسلوبك حيوي ومضياف. جاوب عن المكونات والحساسيات الغذائية بدقة إذا كانت المعلومة متوفرة عندك، وإذا ما كنت متأكد وضّح للعميل إنك بتتأكد قبل ما يطلب — خصوصاً لو ذكر حساسية أو نظام غذائي معيّن. اذكر أوقات الدوام: [اكتب هنا أوقات الدوام]. وضّح مناطق التوصيل ومدته المتوقعة: [التفاصيل]. اذكر طرق الدفع المتاحة: [التفاصيل]. إذا صار عنده شكوى عن طلب أو جودة، حوّل المحادثة فوراً لفريق الدعم البشري.',
      welcome: 'أهلاً بك في [اسم المتجر] ☕ وش يشهيك تطلب اليوم؟'
    },
    jewelry: {
      emoji: '💍', label: 'إكسسوارات ومجوهرات',
      prompt: 'أنت مساعد ذكي لمتجر إكسسوارات ومجوهرات اسمه [اسم المتجر]. أسلوبك أنيق وراقي. جاوب عن نوع المعدن والخامة المستخدمة في القطعة إذا كانت المعلومة متوفرة عندك (فضة، ستانلس ستيل، مطلي ذهب، إلخ)، ووضّح للعميل إذا كانت القطعة مقاومة للماء أو تحتاج عناية خاصة. وضّح سياسة الإرجاع والضمان: [اكتب هنا الشروط]. اذكر مدة التوصيل وخيارات التغليف الخاص للهدايا إذا متوفرة: [التفاصيل]. حوّل أي شكوى عن جودة القطعة لفريق الدعم البشري.',
      welcome: 'هلا فيك في [اسم المتجر] 💍 تحب تشوف تشكيلتنا الجديدة؟'
    },
    home: {
      emoji: '🛋️', label: 'أثاث ومنزل',
      prompt: 'أنت مساعد ذكي لمتجر أثاث ومستلزمات منزلية اسمه [اسم المتجر]. أسلوبك عملي ومريح. جاوب عن أبعاد ومقاسات القطع والخامات المستخدمة إذا كانت المعلومة متوفرة عندك، ووضّح للعميل تفاصيل التركيب إذا كانت القطعة تحتاج تركيب ذاتي أو خدمة تركيب من طرفكم. اذكر مدة التوصيل المتوقعة (خصوصاً للقطع الكبيرة): [اكتب هنا التفاصيل]. وضّح سياسة الإرجاع والاستبدال: [اكتب هنا الشروط]. حوّل أي استفسار عن التوصيل لمناطق بعيدة أو شكوى لفريق الدعم البشري.',
      welcome: 'أهلاً بك في [اسم المتجر] 🛋️ تحب تجهز ركن جديد في بيتك؟'
    },
    general: {
      emoji: '🏬', label: 'نشاط عام',
      prompt: 'أنت مساعد ذكي لنشاط [اسم المتجر]. أسلوبك ودود واحترافي، ويعكس هوية نشاطك. جاوب عن أسئلة العملاء المتكررة بخصوص المنتجات أو الخدمات، مواعيد التوصيل، وطرق الدفع المتاحة: [اكتب هنا التفاصيل]. وضّح سياسة الإرجاع أو الاستبدال إذا وجدت: [اكتب هنا الشروط]. لو ما كنت متأكد من إجابة سؤال معيّن، وضّح للعميل إنك بتتأكد وترجع له بدل ما تخمّن. حوّل أي محادثة تحتاج تدخل بشري أو فيها شكوى مباشرة لفريق الدعم.',
      welcome: 'أهلاً بك في [اسم المتجر] 👋 كيف أقدر أساعدك اليوم؟'
    }
  };
  function renderTemplateChips(){
    var wrap = document.getElementById('templateChips');
    if(!wrap) return;
    var html = '';
    Object.keys(BOT_TEMPLATES).forEach(function(key){
      var t = BOT_TEMPLATES[key];
      html += '<button type="button" class="template-chip" data-key="' + key + '">' + t.emoji + ' ' + escapeHtml(PT(t.label)) + '</button>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('.template-chip').forEach(function(btn){
      btn.addEventListener('click', function(){ applyBotTemplate(btn.getAttribute('data-key')); });
    });
  }
  function applyBotTemplate(key){
    var t = BOT_TEMPLATES[key];
    if(!t) return;
    var promptEl = document.getElementById('settingPrompt');
    var welcomeEl = document.getElementById('settingWelcome');
    if(!promptEl || promptEl.disabled) return;
    var hasExisting = (promptEl.value || '').trim().length > 0;
    if(hasExisting){
      var ok = window.confirm(PT('بيستبدل هذا القالب تعليمات البوت الحالية بالكامل. متأكد تبي تكمل؟'));
      if(!ok) return;
    }
    var bizNameEl = document.getElementById('settingBizName');
    var bizName = (bizNameEl && bizNameEl.value ? bizNameEl.value : 'نشاطك').trim() || 'نشاطك';
    promptEl.value = t.prompt.split('[اسم المتجر]').join(bizName);
    welcomeEl.value = t.welcome.split('[اسم المتجر]').join(bizName);
    var note = document.getElementById('templateAppliedNote');
    if(note) note.style.display = 'block';
    promptEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    promptEl.focus();
  }
  /* ---------- شريط تقدّم الإعداد ---------- */
  // التاجر اللي ما يكمل إعداد بوته ما يشوف قيمة حقيقية، واللي ما يشوف قيمة ما يجدد اشتراكه —
  // هذا الشريط يوريه بالضبط وين وصل، وينقله بضغطة وحدة للخطوة الناقصة.
  var SETUP_STEPS = [
    { key: 'wa', label: 'ربط رقم واتساب', tab: null },
    { key: 'prompt', label: 'تخصيص تعليمات البوت', tab: 'settings', focusId: 'settingPrompt' },
    { key: 'welcome', label: 'رسالة الترحيب', tab: 'settings', focusId: 'settingWelcome' },
    { key: 'store', label: 'ربط متجرك (اختياري)', tab: 'channels' },
    { key: 'convo', label: 'أول محادثة حقيقية', tab: 'inbox' }
  ];
  function renderSetupProgress(clientRow, convCount){
    var card = document.getElementById('setupProgressCard');
    if(!card) return;
    if(!isOwner){ card.style.display = 'none'; return; } // الإعداد مسؤولية صاحب الحساب فقط
    var done = {
      wa: !!clientRow.whatsapp_phone_number_id,
      prompt: (clientRow.system_prompt || '').trim().length > 15,
      welcome: (clientRow.welcome_message || '').trim().length > 3,
      store: !!(clientRow.zid_integration_enabled || clientRow.zid_store_id || clientRow.salla_store_id),
      convo: convCount > 0
    };
    var doneCount = Object.keys(done).filter(function(k){ return done[k]; }).length;
    var dismissKey = 'nabda_setup_dismissed_' + clientRow.id;

    if(doneCount >= SETUP_STEPS.length){
      if(localStorage.getItem(dismissKey) === '1'){ card.style.display = 'none'; return; }
      card.style.display = 'block';
      card.innerHTML = '<div class="setup-complete-banner">' + PT('🎉 اكتمل إعداد بوتك بالكامل! جاهز يشتغل بكامل طاقته.') + '<button type="button" id="setupDismissBtn">✕</button></div>';
      var dismissBtn = document.getElementById('setupDismissBtn');
      if(dismissBtn){
        dismissBtn.addEventListener('click', function(){
          localStorage.setItem(dismissKey, '1');
          card.style.display = 'none';
        });
      }
      return;
    }

    card.style.display = 'block';
    var pct = Math.round((doneCount / SETUP_STEPS.length) * 100);
    card.innerHTML =
      '<div class="setup-progress-head"><div class="setup-progress-title">' + PT('بوتك جاهز') + ' ' + doneCount + '/' + SETUP_STEPS.length + '</div></div>' +
      '<div class="setup-progress-track"><div class="setup-progress-fill" style="width:' + pct + '%;"></div></div>' +
      '<div class="setup-progress-list" id="setupProgressList"></div>';

    var list = document.getElementById('setupProgressList');
    SETUP_STEPS.forEach(function(step){
      var isDone = done[step.key];
      var el = document.createElement('span');
      el.className = 'setup-step' + (isDone ? ' done' : '');
      el.innerHTML = '<span class="dot">' + (isDone ? '✓' : '') + '</span>' + escapeHtml(PT(step.label));
      if(!isDone && step.tab){
        el.addEventListener('click', function(){
          var tabBtn = document.querySelector('.tab-btn[data-tab="' + step.tab + '"]');
          if(tabBtn) tabBtn.click();
          if(step.focusId){
            setTimeout(function(){
              var target = document.getElementById(step.focusId);
              if(target){ target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.focus(); }
            }, 50);
          }
        });
      }
      list.appendChild(el);
    });
  }
  function showScreen(name){
    loginScreen.style.display = 'none';
    forgotScreen.style.display = 'none';
    resetScreen.style.display = 'none';
    appScreen.style.display = 'none';
    logoutBtn.style.display = 'none';
    document.body.classList.toggle('v2-in-app', name === 'app');
    if(name === 'login'){ loginScreen.style.display = 'flex'; }
    else if(name === 'forgot'){ forgotScreen.style.display = 'flex'; }
    else if(name === 'reset'){ resetScreen.style.display = 'flex'; }
    else if(name === 'app'){
      appScreen.style.display = 'block';
      logoutBtn.style.display = 'inline-block';
      afterLoginSetup();
    }
  }
  supabaseClient.auth.onAuthStateChange(function(event, session){
    if(event === 'PASSWORD_RECOVERY'){
      showScreen('reset');
    }
  });
  // رجوع من صفحة ربط زد أو سلة (نجاح أو فشل) — نعرض رسالة مرة واحدة وننضّف الرابط من المعاملات
  (function handleStoreOAuthRedirect(){
    const params = new URLSearchParams(window.location.search);
    const zidState = params.get('zid');
    const sallaState = params.get('salla');
    if(zidState === 'connected'){
      window.addEventListener('load', function(){
        setTimeout(function(){ alert(PT('✅ تم ربط متجر زد بنجاح! البوت الآن يقدر يجاوب تلقائياً عن حالة الطلبات والمخزون.')); }, 400);
      });
    } else if(zidState === 'error'){
      const msg = params.get('msg') || '';
      window.addEventListener('load', function(){
        setTimeout(function(){ alert((window.PORTAL_LANG === 'en' ? '⚠️ Could not connect Zid store' : '⚠️ تعذّر ربط متجر زد') + (msg ? ': ' + decodeURIComponent(msg) : '') + (window.PORTAL_LANG === 'en' ? '. Please try again or contact support.' : '. حاول مرة ثانية أو تواصل مع الدعم.')); }, 400);
      });
    }
    if(sallaState === 'connected'){
      window.addEventListener('load', function(){
        setTimeout(function(){ alert(PT('✅ تم ربط متجر سلة بنجاح! البوت الآن يقدر يجاوب تلقائياً عن حالة الطلبات والمخزون.')); }, 400);
      });
    } else if(sallaState === 'error'){
      const msg = params.get('msg') || '';
      window.addEventListener('load', function(){
        setTimeout(function(){ alert((window.PORTAL_LANG === 'en' ? '⚠️ Could not connect Salla store' : '⚠️ تعذّر ربط متجر سلة') + (msg ? ': ' + decodeURIComponent(msg) : '') + (window.PORTAL_LANG === 'en' ? '. Please try again or contact support.' : '. حاول مرة ثانية أو تواصل مع الدعم.')); }, 400);
      });
    }
    if(zidState || sallaState){
      params.delete('zid'); params.delete('salla'); params.delete('msg');
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  })();
  supabaseClient.auth.getSession().then(function(res){
    const hash = window.location.hash;
    const isRecovery = hash.includes('type=recovery');
    const isInvite = hash.includes('type=invite');
    if(isRecovery || isInvite){
      if(res.data.session){ showScreen('reset'); }
      return;
    }
    if(res.data.session){ showScreen('app'); } else { showScreen('login'); }
  });
  document.getElementById('loginForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errBox = document.getElementById('loginError');
    errBox.style.display = 'none';
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = PT('جاري الدخول...');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = PT('تسجيل الدخول');
    if(error){
      errBox.textContent = PT('بيانات الدخول غير صحيحة.');
      errBox.style.display = 'block';
      return;
    }
    showScreen('app');
  });
  document.getElementById('googleLoginBtn').addEventListener('click', async function(){
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
  });
  document.getElementById('showForgotBtn').addEventListener('click', function(){ showScreen('forgot'); });
  document.getElementById('backToLoginBtn').addEventListener('click', function(){ showScreen('login'); });
  document.getElementById('forgotForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errBox = document.getElementById('forgotError');
    const okBox = document.getElementById('forgotSuccess');
    errBox.style.display = 'none';
    okBox.style.display = 'none';
    const btn = document.getElementById('forgotBtn');
    btn.disabled = true; btn.textContent = PT('جاري الإرسال...');
    const email = document.getElementById('forgotEmail').value.trim();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    btn.disabled = false; btn.textContent = PT('إرسال رابط الاستعادة');
    if(error){
      errBox.textContent = PT('تعذّر إرسال الرابط، حاول مرة ثانية.');
      errBox.style.display = 'block';
      return;
    }
    okBox.textContent = PT('✓ تم إرسال رابط الاستعادة، افتح بريدك الإلكتروني.');
    okBox.style.display = 'block';
  });
  document.getElementById('resetForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errBox = document.getElementById('resetError');
    errBox.style.display = 'none';
    const btn = document.getElementById('resetBtn');
    btn.disabled = true; btn.textContent = PT('جاري الحفظ...');
    const newPassword = document.getElementById('resetPassword').value;
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    btn.disabled = false; btn.textContent = PT('حفظ كلمة المرور');
    if(error){
      errBox.textContent = PT('تعذّر حفظ كلمة المرور، حاول مرة ثانية.');
      errBox.style.display = 'block';
      return;
    }
    showScreen('app');
  });
  logoutBtn.addEventListener('click', async function(){
    await supabaseClient.auth.signOut();
    showScreen('login');
  });
  // بعد أي نوع دخول (كلمة مرور أو جوجل)، نحاول نربط الحساب تلقائياً لو دخل أول مرة بجوجل
  async function afterLoginSetup(){
    await supabaseClient.functions.invoke('link-client-by-email', { method: 'POST', body: {} }).catch(function(){});
    loadEverything();
  }
  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      const map = { home: 'panelHome', inbox: 'panelInbox', settings: 'panelSettings', support: 'panelSupport', broadcast: 'panelBroadcast', analytics: 'panelAnalytics', templates: 'panelTemplates', orders: 'panelOrders', addons: 'panelAddons', channels: 'panelChannels' };
      document.getElementById(map[btn.dataset.tab]).classList.add('active');
      if(btn.dataset.tab === 'orders'){ loadOrdersTab(); }
      if(btn.dataset.tab === 'addons'){ loadPortalAddonsTab(); }
      if(btn.dataset.tab === 'home'){ renderHome(); }
      v2AfterTabChange(btn.dataset.tab);
    });
  });
  /* ---------- الإضافات المدفوعة ---------- */
  async function loadPortalAddonsTab(){
    const grid = document.getElementById('portalAddonGrid');
    if(!myClient){ return; }

    const [{ data: addons }, { data: myAddons }, { data: myRequests }] = await Promise.all([
      supabaseClient.from('addons').select('*').eq('is_active', true).order('sort_order'),
      supabaseClient.from('client_addons').select('addon_id, enabled').eq('client_id', myClient.id),
      supabaseClient.from('addon_requests').select('addon_id, status').eq('client_id', myClient.id).eq('status', 'pending')
    ]);

    if(!addons || addons.length === 0){
      grid.innerHTML = '<div class="conv-empty">' + PT('ما فيه إضافات متاحة حالياً.') + '</div>';
      return;
    }

    grid.innerHTML = '';
    addons.forEach(function(a){
      const activeRow = (myAddons || []).find(function(ca){ return ca.addon_id === a.id && ca.enabled; });
      const pendingRow = (myRequests || []).find(function(r){ return r.addon_id === a.id; });

      const card = document.createElement('div');
      card.className = 'addon-card';

      let statusHtml = '';
      let actionHtml = '';
      if(activeRow){
        statusHtml = '<span class="addon-status active">' + PT('✓ مفعّلة') + '</span>';
      } else if(pendingRow){
        statusHtml = '<span class="addon-status pending">' + PT('قيد المراجعة (إضافة)') + '</span>';
      } else {
        actionHtml = '<button type="button" class="addon-request-btn" data-id="' + a.id + '">' + PT('اطلب التفعيل') + '</button>';
      }

      card.innerHTML =
        '<h3>' + escapeHtml(PT(a.name_ar)) + '</h3>' +
        '<div class="addon-desc">' + escapeHtml(PT(a.description_ar || '')) + '</div>' +
        '<div class="addon-foot">' +
          '<div class="addon-price">' + Number(a.price_sar).toLocaleString('ar') + '<span>' + PT('ريال دفعة وحدة') + '</span></div>' +
          (statusHtml || actionHtml) +
        '</div>';
      grid.appendChild(card);
    });

    grid.querySelectorAll('.addon-request-btn').forEach(function(btn){
      btn.addEventListener('click', async function(){
        btn.disabled = true;
        btn.textContent = PT('جاري الإرسال...');
        try{
          const { data, error } = await supabaseClient.functions.invoke('request-addon', {
            method: 'POST',
            body: {
              addon_id: btn.dataset.id,
              contact_name: myClient.business_name_ar || myClient.business_name || '',
              contact_phone: myClient.owner_phone || '',
              contact_email: myClient.owner_email || '',
              source: 'portal'
            }
          });
          if(error){ throw error; }
        } catch(e){
          btn.disabled = false;
          btn.textContent = PT('اطلب التفعيل');
          alert(PT('تعذّر إرسال طلبك، حاول مرة ثانية.'));
          return;
        }
        await loadPortalAddonsTab();
      });
    });
  }
  renderTemplateChips();
  /* ---------- تثبيت البوابة كتطبيق (PWA) ---------- */
  (function setupPwaInstall(){
    var DISMISS_KEY = 'nabda_pwa_banner_dismissed';
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').catch(function(){});
    }
    if(localStorage.getItem(DISMISS_KEY) === '1') return;

    var banner = document.getElementById('pwaInstallBanner');
    var installBtn = document.getElementById('pwaInstallBtn');
    var closeBtn = document.getElementById('pwaInstallClose');
    var subText = document.getElementById('pwaInstallSub');
    if(!banner) return;

    function dismiss(){
      localStorage.setItem(DISMISS_KEY, '1');
      banner.style.display = 'none';
    }
    if(closeBtn) closeBtn.addEventListener('click', dismiss);

    // إذا كانت مثبّتة أصلاً (تفتح كـ standalone)، ما نعرض شي
    var alreadyInstalled = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if(alreadyInstalled || window.navigator.standalone === true) return;

    var ua = window.navigator.userAgent || '';
    var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    var isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);

    if(isSafari){
      // آيفون: ما فيه استدعاء برمجي للتثبيت — نوريه التعليمات فقط
      if(subText) subText.textContent = PT('اضغط زر المشاركة 🔗 بالأسفل، ثم اختر "إضافة إلى الشاشة الرئيسية"');
      banner.style.display = 'flex';
      return;
    }

    // أندرويد/كروم: نستخدم حدث beforeinstallprompt للتثبيت الفعلي بضغطة وحدة
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function(e){
      e.preventDefault();
      deferredPrompt = e;
      if(installBtn) installBtn.style.display = 'inline-block';
      banner.style.display = 'flex';
    });
    if(installBtn){
      installBtn.addEventListener('click', function(){
        if(!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function(){
          deferredPrompt = null;
          banner.style.display = 'none';
        });
      });
    }
    window.addEventListener('appinstalled', dismiss);
  })();
  async function loadEverything(){
    const { data: { user } } = await supabaseClient.auth.getUser();
    myUserId = user.id;
    // نحاول أولاً كصاحب حساب، ولو ما لقينا نحاول كموظف مرتبط بحساب نشاط
    let clientRow = null;
    const ownerRes = await supabaseClient
      .from('clients')
      .select('id, user_id, business_name_ar, business_name, plan_id, system_prompt, welcome_message, owner_phone, owner_email, zid_integration_enabled, extra_message_credits, current_period_ends_at, trial_ends_at, subscription_status, whatsapp_phone_number_id, zid_store_id, salla_store_id, telegram_connection_status, telegram_bot_username, coexistence_status, coexistence_activated_at, coexistence_disconnected_at, whatsapp_business_account_id, whatsapp_display_number, zapier_webhook_url, hide_customer_phone_from_staff')
      .eq('user_id', user.id)
      .maybeSingle();
    if(ownerRes.data){
      clientRow = ownerRes.data;
      isOwner = true;
    } else {
      const { data: staffRow } = await supabaseClient
        .from('client_staff')
        .select('client_id, permissions')
        .eq('user_id', user.id)
        .maybeSingle();
      if(staffRow){
        const { data: cr } = await supabaseClient
          .from('clients')
          .select('id, user_id, business_name_ar, business_name, plan_id, system_prompt, welcome_message, owner_phone, owner_email, zid_integration_enabled, extra_message_credits, current_period_ends_at, trial_ends_at, subscription_status, whatsapp_phone_number_id, zid_store_id, salla_store_id, telegram_connection_status, telegram_bot_username, coexistence_status, coexistence_activated_at, coexistence_disconnected_at, whatsapp_business_account_id, whatsapp_display_number, zapier_webhook_url, hide_customer_phone_from_staff')
          .eq('id', staffRow.client_id)
          .maybeSingle();
        clientRow = cr;
        isOwner = false;
        myStaffPermissions = staffRow.permissions || {};
      }
    }
    if(!clientRow){
      document.getElementById('convList').innerHTML = '<div class="conv-empty">' + PT('تعذّر العثور على حساب مرتبط بهذا الدخول. تواصل مع فريق نبضة.') + '</div>';
      return;
    }
    myClient = clientRow;
    document.getElementById('bizTag').textContent = (clientRow.business_name_ar || clientRow.business_name || '') + (isOwner ? '' : ' — ' + PT('عضو فريق'));
    document.getElementById('settingBizName').value = clientRow.business_name_ar || clientRow.business_name || '';
    document.getElementById('settingPrompt').value = clientRow.system_prompt || '';
    document.getElementById('settingWelcome').value = clientRow.welcome_message || '';
    document.getElementById('settingOwnerPhone').value = clientRow.owner_phone || '';
    document.getElementById('settingWebhookUrl').value = clientRow.zapier_webhook_url || '';
    document.getElementById('settingPrompt').disabled = !isOwner;
    document.getElementById('settingWelcome').disabled = !isOwner;
    document.getElementById('settingOwnerPhone').disabled = !isOwner;
    document.getElementById('settingWebhookUrl').disabled = !isOwner;
    document.getElementById('saveSettingsBtn').style.display = isOwner ? 'inline-block' : 'none';
    // إخفاء رقم العميل عن الموظفين — يظهر التحكم لصاحب الحساب فقط، ويُطبَّق فوراً على الموظفين حسب قيمة الحقل بقاعدة البيانات
    const hidePhoneToggle = document.getElementById('hideCustomerPhoneToggle');
    hidePhoneToggle.checked = !!clientRow.hide_customer_phone_from_staff;
    document.getElementById('hidePhoneField').style.display = isOwner ? 'block' : 'none';
    hidePhoneToggle.disabled = !isOwner;
    document.getElementById('templatePickerField').style.display = isOwner ? 'block' : 'none';
    // أرقام واتساب الرسمية المرتبطة بالحساب (قد يكون أكثر من رقم حسب الباقة) — عرض فقط
    (async function loadWaNumbersList(){
      const listEl = document.getElementById('waNumbersList');
      const { data: numbers, error: waNumErr } = await supabaseClient
        .from('client_whatsapp_numbers')
        .select('whatsapp_display_number, phone_number_id, label, is_primary, status')
        .eq('client_id', clientRow.id)
        .eq('status', 'active')
        .order('is_primary', { ascending: false });
      if(waNumErr || !numbers || numbers.length === 0){
        listEl.innerHTML = '<div class="biz-sub">' + PT('لا يوجد رقم مسجّل بعد.') + '</div>';
        return;
      }
      listEl.innerHTML = numbers.map(function(n){
        const display = escapeHtml(n.whatsapp_display_number || n.phone_number_id || '—');
        const label = escapeHtml(n.label || (n.is_primary ? PT('الرقم الرئيسي') : ''));
        return '<div style="display:flex; align-items:center; gap:8px; padding:9px 12px; border:1px solid var(--border); border-radius:10px; font-size:13.5px;">' +
          '<span>📱 ' + display + '</span>' +
          (label ? '<span class="biz-sub">— ' + label + '</span>' : '') +
          '</div>';
      }).join('');
    })();
    // الرسائل الجماعية إجراء تسويقي/مالي — نتركه لصاحب الحساب فقط لتفادي فتح تبويب يفشل بصمت للموظفين
    document.querySelector('.tab-btn[data-tab="broadcast"]').style.display = isOwner ? 'inline-block' : 'none';
    // تبويبات اختيارية للموظفين — صاحب الحساب يشوفها دايماً، والموظف حسب الصلاحيات اللي منحها له صاحب الحساب
    PERMISSION_DEFS.forEach(function(p){
      const tabEl = document.querySelector('.tab-btn[data-tab="' + p.key + '"]');
      if(!tabEl) return;
      tabEl.style.display = (isOwner || !!myStaffPermissions[p.key]) ? 'inline-block' : 'none';
    });
    let planLabel = '—';
    if(clientRow.plan_id){
      const { data: plan } = await supabaseClient.from('subscription_plans').select('id, name_ar, code, monthly_message_limit, store_integration_included, store_integration_addon_price_sar, order_table_included, monthly_price_sar, is_prepaid, prepaid_credits, prepaid_validity_months, billing_cycle').eq('id', clientRow.plan_id).single();
      if(plan){ planLabel = plan.name_ar; myPlan = plan; }
    }
    document.getElementById('statPlan').textContent = PT(planLabel);
    // فريق العمل — نجيبه قبل عرض المحادثات عشان نبني قائمة "معيّن إلى"
    const { data: staffRows } = await supabaseClient
      .from('client_staff')
      .select('id, user_id, full_name, email, permissions')
      .eq('client_id', clientRow.id);
    staffList = staffRows || [];
    staffMap = {};
    staffMap[clientRow.user_id] = PT('صاحب الحساب');
    staffList.forEach(function(s){ if(s.user_id){ staffMap[s.user_id] = s.full_name; } });
    renderTeam();
    const { data: msgsDesc } = await supabaseClient
      .from('whatsapp_messages_log')
      .select('customer_phone, customer_name, inbound_message, outbound_message, created_at, received_at, category')
      .eq('client_id', clientRow.id)
      .order('created_at', { ascending: false })
      .limit(1500);
    // نجلب الأحدث أولاً (بحد صريح) حتى لا يقصّها الخادم من طرف الأقدم عند تجاوز السقف الافتراضي،
    // ثم نعيد ترتيبها تصاعدياً محلياً لأن بقية الكود (المحادثات، التحليلات) يتوقع هذا الترتيب
    const msgs = (msgsDesc || []).slice().reverse();
    allMessages = msgs || [];
    conversations = {};
    const now = new Date();
    let monthCount = 0;
    allMessages.forEach(function(row){
      const phone = row.customer_phone;
            if(!conversations[phone]){
        conversations[phone] = { name: row.customer_name || phone, messages: [], lastAt: row.created_at, category: null };

      }
      if(row.customer_name){ conversations[phone].name = row.customer_name; }
      if(row.inbound_message){
        conversations[phone].messages.push({ dir: 'in', text: row.inbound_message, at: row.created_at });
      }
            if(row.outbound_message){
        conversations[phone].messages.push({ dir: 'out', text: row.outbound_message, at: row.created_at });
      }
           if(row.category){ conversations[phone].category = row.category; }
      conversations[phone].lastAt = row.created_at;

      const rowDate = new Date(row.created_at);
      if(rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear()){
        monthCount++;
      }
    });
    // حالة "الرد اليدوي" والتعيين لكل محادثة
    const { data: states } = await supabaseClient
      .from('whatsapp_conversation_state')
      .select('customer_phone, bot_paused, assigned_to')
      .eq('client_id', clientRow.id);
    (states || []).forEach(function(s){
      if(conversations[s.customer_phone]){
        conversations[s.customer_phone].botPaused = !!s.bot_paused;
        conversations[s.customer_phone].assignedTo = s.assigned_to || null;
      }
    });
    document.getElementById('statConvs').textContent = Object.keys(conversations).length;
    renderSetupProgress(clientRow, Object.keys(conversations).length);
    renderUsageStat(monthCount);
    renderConvList();
    loadTickets();
    loadCampaigns();
    renderAnalytics();
    loadStoreAnalytics();
    renderRoiDashboard();
    initSimChat();
    loadZidStatus();
    loadSallaStatus();
    loadWooCommerceStatus();
    loadShopifyStatus();
    loadTelegramStatus();
    loadWaAppStatus();
    loadTemplates();
    loadTopupInfo();
    renderSubscriptionBanner();
    renderPlanCard();
    renderHome();
  }
  /* ════════ v2: الهيكل الجديد (القائمة الجوال + الشريط العلوي) والصفحة الرئيسية ════════ */
  function V2L(ar, en){ return (window.PORTAL_LANG === 'en') ? en : ar; }
  var V2_TITLES = {
    home: ['الرئيسية','Home'], inbox: ['المحادثات','Conversations'], orders: ['الطلبات','Orders'],
    support: ['الدعم الفني','Support'], analytics: ['التحليلات','Analytics'], broadcast: ['الرسائل الجماعية','Broadcasts'],
    templates: ['قوالب الرسائل','Message templates'], channels: ['قنوات الربط','Channels'], addons: ['الإضافات','Add-ons'],
    settings: ['إعدادات البوت','Bot settings']
  };
  function v2AfterTabChange(tab){
    var t = V2_TITLES[tab];
    var titleEl = document.getElementById('v2Title');
    if(titleEl && t){ titleEl.textContent = V2L(t[0], t[1]); }
    document.querySelectorAll('#v2Tabbar [data-go]').forEach(function(b){ b.classList.toggle('on', b.dataset.go === tab); });
    document.body.classList.remove('v2-menu-open');
    window.scrollTo(0, 0);
  }
  function v2Go(tab){
    if(tab === '__menu'){ document.body.classList.add('v2-menu-open'); return; }
    var btn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
    if(btn && btn.style.display !== 'none'){ btn.click(); }
  }
  (function v2BindShell(){
    document.addEventListener('click', function(e){
      var go = e.target.closest ? e.target.closest('[data-go]') : null;
      if(go && document.body.classList.contains('v2-in-app')){ e.preventDefault(); v2Go(go.dataset.go); }
    });
    var menuBtn = document.getElementById('v2MenuBtn');
    if(menuBtn){ menuBtn.addEventListener('click', function(){ document.body.classList.add('v2-menu-open'); }); }
    ['v2SideClose','v2Backdrop'].forEach(function(id){
      var el = document.getElementById(id);
      if(el){ el.addEventListener('click', function(){ document.body.classList.remove('v2-menu-open'); }); }
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ document.body.classList.remove('v2-menu-open'); } });
    var lang = document.getElementById('v2LangBtn');
    if(lang){
      lang.textContent = (window.PORTAL_LANG === 'en') ? 'العربية' : 'English';
      lang.addEventListener('click', function(){ var b = document.getElementById('langBtn'); if(b){ b.click(); } });
    }
    var out = document.getElementById('v2LogoutBtn');
    if(out){ out.addEventListener('click', function(){ var b = document.getElementById('logoutBtn'); if(b){ b.click(); } }); }
    var manage = document.getElementById('v2ManagePlan');
    if(manage){ manage.addEventListener('click', v2OpenPlanCard); }
    var range = document.getElementById('homeRange');
    if(range){
      range.addEventListener('click', function(e){
        var b = e.target.closest('button[data-days]'); if(!b){ return; }
        range.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x === b); });
        v2HomeDays = Number(b.dataset.days) || 7;
        renderHome();
      });
    }
    var resizeTimer = null;
    window.addEventListener('resize', function(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function(){ if(document.getElementById('panelHome').classList.contains('active')){ v2DrawChart(); } }, 150);
    });
    v2AfterTabChange('home');
  })();
  function v2OpenPlanCard(){
    v2Go('settings');
    setTimeout(function(){
      var card = document.getElementById('planCard');
      if(card){ card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 120);
  }

  var v2HomeDays = 7;
  var V2_AV_COLORS = ['#0B7A6B','#A35A1B','#2F5FB3','#7B3F98','#B23A2E','#4C7A1E','#0E6E8C'];
  function v2AvColor(key){ var h = 0; key = String(key || ''); for(var i = 0; i < key.length; i++){ h = (h * 31 + key.charCodeAt(i)) >>> 0; } return V2_AV_COLORS[h % V2_AV_COLORS.length]; }
  function v2Initial(name){ var n = String(name || '').trim().replace(/^\+/, ''); return n ? n.charAt(0).toUpperCase() : '؟'; }
  function v2Fmt(n){ return Number(n || 0).toLocaleString('en-US'); }
  function v2DayKey(d){ return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function v2Ago(iso){
    var diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if(diff < 1){ return V2L('الآن', 'now'); }
    if(diff < 60){ return V2L('قبل ' + Math.round(diff) + ' د', Math.round(diff) + 'm ago'); }
    if(diff < 1440){ return V2L('قبل ' + Math.round(diff / 60) + ' س', Math.round(diff / 60) + 'h ago'); }
    var days = Math.round(diff / 1440);
    if(days < 30){ return V2L('قبل ' + days + ' يوم', days + 'd ago'); }
    return new Date(iso).toLocaleDateString(window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn', { month: 'short', day: 'numeric' });
  }
  // سلسلة يومية: لكل يوم من آخر N يوم → [رسائل العملاء، ردود البوت، محادثات فريدة]
  function v2DailySeries(days, offsetDays){
    var start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1) - (offsetDays || 0));
    var end = new Date(start); end.setDate(end.getDate() + days);
    var idx = {}, out = [];
    for(var i = 0; i < days; i++){
      var d = new Date(start); d.setDate(start.getDate() + i);
      idx[v2DayKey(d)] = i; out.push({ date: d, inMsgs: 0, outMsgs: 0, phones: {} });
    }
    allMessages.forEach(function(r){
      var t = new Date(r.created_at);
      if(t < start || t >= end){ return; }
      var slot = out[idx[v2DayKey(t)]]; if(!slot){ return; }
      if(r.inbound_message){ slot.inMsgs++; slot.phones[r.customer_phone] = 1; }
      if(r.outbound_message){ slot.outMsgs++; }
    });
    return out;
  }
  function v2Sum(series, key){ return series.reduce(function(a, d){ return a + d[key]; }, 0); }
  function v2UniquePhones(series){ var all = {}; series.forEach(function(d){ Object.keys(d.phones).forEach(function(p){ all[p] = 1; }); }); return Object.keys(all).length; }
  function v2Spark(values){
    var w = 200, h = 34;
    if(!values.length){ return ''; }
    var rtl = window.PORTAL_LANG !== 'en';
    if(rtl){ values = values.slice().reverse(); } // الأحدث على اليسار بالعربي، مثل الرسم الرئيسي
    var mx = Math.max.apply(null, values), mn = Math.min.apply(null, values), rg = (mx - mn) || 1;
    var step = values.length > 1 ? w / (values.length - 1) : w;
    var pts = values.map(function(v, i){ return [i * step, h - 4 - ((v - mn) / rg) * (h - 10)]; });
    var d = pts.map(function(p, i){ return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var last = rtl ? pts[0] : pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + ' L' + w + ' ' + h + ' L0 ' + h + 'Z" fill="rgba(18,163,140,.12)"/>' +
      '<path d="' + d + '" fill="none" stroke="#0B7A6B" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3" fill="#0B7A6B"/></svg>';
  }
  function v2Delta(cur, prev, unit){
    if(!prev && !cur){ return '<span class="d">' + V2L('لا يوجد نشاط بعد', 'No activity yet') + '</span>'; }
    if(!prev){ return '<span class="d">' + V2L('أول نشاط في هذه الفترة', 'First activity this period') + '</span>'; }
    var pct = Math.round(((cur - prev) / prev) * 100);
    var cls = pct >= 0 ? 'up' : 'down';
    var sign = pct > 0 ? '+' : '';
    return '<span class="d"><b class="' + cls + '">' + sign + pct + '%</b> ' + V2L('عن الفترة السابقة', 'vs previous period') + '</span>';
  }
  function v2Kpi(label, value, unit, deltaHtml, spark){
    return '<div class="v2-kpi"><span class="l">' + label + '</span><span class="v">' + value + (unit ? '<small>' + unit + '</small>' : '') + '</span>' + deltaHtml + spark + '</div>';
  }
  function renderHome(){
    var panel = document.getElementById('panelHome');
    if(!panel || !myClient){ return; }
    var days = v2HomeDays;
    var cur = v2DailySeries(days, 0), prev = v2DailySeries(days, days);
    var convNow = v2UniquePhones(cur), convPrev = v2UniquePhones(prev);
    var inNow = v2Sum(cur, 'inMsgs'), outNow = v2Sum(cur, 'outMsgs'), outPrev = v2Sum(prev, 'outMsgs');
    var hoursNow = outNow * 3 / 60, hoursPrev = outPrev * 3 / 60;

    // محادثات تولّاها الفريق = محادثات موقوف فيها البوت ونشطة في الفترة
    var phonesNow = {}; cur.forEach(function(d){ Object.keys(d.phones).forEach(function(p){ phonesNow[p] = 1; }); });
    var activePhones = Object.keys(phonesNow);
    var humanCount = activePhones.filter(function(p){ return conversations[p] && conversations[p].botPaused; }).length;
    var autoPct = activePhones.length ? Math.round(((activePhones.length - humanCount) / activePhones.length) * 100) : 0;

    // الترحيب
    var hr = new Date().getHours();
    var greet = hr < 12 ? V2L('صباح الخير', 'Good morning') : V2L('مساء الخير', 'Good evening');
    var biz = myClient.business_name_ar || myClient.business_name || '';
    document.getElementById('homeHello').textContent = greet + (biz ? V2L('، ', ', ') + biz : '');
    var periodTxt = days === 7 ? V2L('آخر 7 أيام', 'the last 7 days') : V2L('آخر 30 يوم', 'the last 30 days');
    document.getElementById('homeSummary').textContent = outNow
      ? V2L('خلال ' + periodTxt + ' رد بوتك على ' + v2Fmt(outNow) + ' رسالة، ووفّر عليك تقريباً ' + (hoursNow >= 10 ? Math.round(hoursNow) : hoursNow.toFixed(1)) + ' ساعة من الرد اليدوي.',
            'In ' + periodTxt + ' your bot sent ' + v2Fmt(outNow) + ' replies and saved you about ' + (hoursNow >= 10 ? Math.round(hoursNow) : hoursNow.toFixed(1)) + ' hours of manual replies.')
      : V2L('ما فيه نشاط خلال ' + periodTxt + '. أول ما يراسلك عميل، تظهر الأرقام هنا.', 'No activity in ' + periodTxt + '. Numbers appear here once customers message you.');

    // المؤشرات
    var convSpark = cur.map(function(d){ return Object.keys(d.phones).length; });
    var outSpark = cur.map(function(d){ return d.outMsgs; });
    var inSpark = cur.map(function(d){ return d.inMsgs; });
    document.getElementById('homeKpis').innerHTML =
      v2Kpi(V2L('محادثات', 'Conversations'), v2Fmt(convNow), '', v2Delta(convNow, convPrev), v2Spark(convSpark)) +
      v2Kpi(V2L('ردود البوت', 'Bot replies'), v2Fmt(outNow), '', v2Delta(outNow, outPrev), v2Spark(outSpark)) +
      v2Kpi(V2L('محادثات أنهاها البوت وحده', 'Handled fully by the bot'), activePhones.length ? autoPct : '–', activePhones.length ? '%' : '',
        '<span class="d">' + (activePhones.length ? V2L(humanCount + ' محادثة تولّاها فريقك', humanCount + ' taken over by your team') : V2L('لا يوجد نشاط بعد', 'No activity yet')) + '</span>', v2Spark(inSpark)) +
      v2Kpi(V2L('وقت وفّره البوت', 'Time saved'), hoursNow >= 10 ? v2Fmt(Math.round(hoursNow)) : hoursNow.toFixed(1), V2L('ساعة', 'hrs'), v2Delta(hoursNow, hoursPrev), v2Spark(outSpark));

    v2HomeSeries = cur;
    v2DrawChart();
    v2RenderAttention();
    v2RenderRecent();
    v2RenderUsage();
    v2RenderTopState();
    document.querySelectorAll('.v2-owner-only').forEach(function(el){ el.style.display = isOwner ? '' : 'none'; });
  }
  var v2HomeSeries = [];
  function v2DrawChart(){
    var svg = document.getElementById('homeChart');
    if(!svg){ return; }
    var data = v2HomeSeries;
    var W = Math.max(280, svg.clientWidth || 600), H = svg.clientHeight || 230;
    var rtl = window.PORTAL_LANG !== 'en';
    var pl = rtl ? 6 : 34, pr = rtl ? 34 : 6, pt = 10, pb = 26;
    var mx = 0; data.forEach(function(d){ mx = Math.max(mx, d.inMsgs, d.outMsgs); });
    var top = mx <= 4 ? 4 : Math.ceil(mx / 4) * 4;
    var plotH = H - pt - pb, plotW = W - pl - pr, slot = plotW / Math.max(1, data.length);
    var out = '';
    for(var g = 0; g <= 4; g++){
      var y = pt + plotH * (g / 4), val = Math.round(top * (1 - g / 4));
      out += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#E2EAE7"' + (g === 4 ? '' : ' stroke-dasharray="3 4"') + '/>';
      out += '<text x="' + (rtl ? W - 4 : 4) + '" y="' + (y + 4).toFixed(1) + '" font-size="10.5" fill="#5F716C" text-anchor="' + (rtl ? 'end' : 'start') + '">' + val + '</text>';
    }
    var labelEvery = data.length > 14 ? 5 : (data.length > 7 ? 2 : 1);
    data.forEach(function(d, i){
      // أحدث يوم على اليسار في العربي (اتجاه القراءة)، وعلى اليمين في الإنجليزي
      var pos = rtl ? (data.length - 1 - i) : i;
      var x0 = pl + pos * slot, bw = Math.max(2, Math.min(14, slot * 0.32)), gap = Math.max(1, bw * 0.25);
      var cx = x0 + slot / 2;
      var hIn = (d.inMsgs / top) * plotH, hOut = (d.outMsgs / top) * plotH, base = pt + plotH;
      var tip = d.date.toLocaleDateString(window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn', { weekday: 'short', month: 'short', day: 'numeric' }) + ' — ' + V2L('رسائل العملاء ', 'Customer messages ') + d.inMsgs + ' · ' + V2L('ردود البوت ', 'Bot replies ') + d.outMsgs;
      out += '<g><title>' + escapeHtml(tip) + '</title>';
      out += '<rect x="' + (cx - bw - gap / 2).toFixed(1) + '" y="' + (base - hIn).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, hIn).toFixed(1) + '" rx="2" fill="#B9DDD5"/>';
      out += '<rect x="' + (cx + gap / 2).toFixed(1) + '" y="' + (base - hOut).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, hOut).toFixed(1) + '" rx="2" fill="#0B7A6B"/>';
      out += '<rect x="' + x0.toFixed(1) + '" y="' + pt + '" width="' + slot.toFixed(1) + '" height="' + plotH + '" fill="transparent"/></g>';
      var isLast = i === data.length - 1;
      if(isLast || (data.length - 1 - i) % labelEvery === 0){
        var lbl = isLast ? V2L('اليوم', 'Today') : d.date.toLocaleDateString(window.PORTAL_LANG === 'en' ? 'en-US' : 'en-GB', { day: 'numeric', month: 'numeric' });
        out += '<text x="' + cx.toFixed(1) + '" y="' + (H - 7) + '" font-size="10.5" fill="#5F716C" text-anchor="middle">' + lbl + '</text>';
      }
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = out;
  }
  function v2OpenConversation(phone){
    v2Go('inbox');
    activePhone = phone;
    renderConvList();
    renderChat(phone);
    var chat = document.querySelector('.chat-panel');
    if(chat && window.innerWidth < 1000){ setTimeout(function(){ chat.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); }
  }
  function v2RenderAttention(){
    var box = document.getElementById('homeAttn');
    var now = Date.now(), items = [], seen = {};
    Object.keys(conversations).forEach(function(phone){
      var c = conversations[phone];
      var last = c.messages[c.messages.length - 1];
      var age = (now - new Date(c.lastAt).getTime()) / 3600000;
      var reason = null;
      if(c.botPaused && last && last.dir === 'in'){ reason = { sev: '#C0362C', pill: ['v2-p-bad', V2L('بانتظار ردك', 'Awaiting your reply')], rank: 0 }; }
      else if(c.category === 'complaint' && age < 72){ reason = { sev: '#C0362C', pill: ['v2-p-bad', V2L('شكوى', 'Complaint')], rank: 1 }; }
      else if(c.category === 'return_refund' && age < 72){ reason = { sev: '#B07800', pill: ['v2-p-warn', V2L('طلب استرجاع', 'Return request')], rank: 2 }; }
      else if(c.category === 'purchase_intent' && age < 48){ reason = { sev: '#2F5FB3', pill: ['v2-p-info', V2L('جاهز للشراء', 'Ready to buy')], rank: 3 }; }
      if(reason && !seen[phone]){ seen[phone] = 1; items.push({ phone: phone, conv: c, last: last, r: reason }); }
    });
    items.sort(function(a, b){ return a.r.rank - b.r.rank || new Date(b.conv.lastAt) - new Date(a.conv.lastAt); });
    var countEl = document.getElementById('homeAttnCount');
    var cnt = document.getElementById('v2TabCnt');
    var waiting = items.filter(function(x){ return x.r.rank === 0; }).length;
    if(countEl){ countEl.hidden = !items.length; countEl.textContent = items.length; }
    if(cnt){ cnt.hidden = !waiting; cnt.textContent = waiting; }
    if(!items.length){
      box.innerHTML = '<div class="v2-empty"><span class="v2-empty-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span><b>' +
        V2L('كل شيء تحت السيطرة', 'All caught up') + '</b>' + V2L('ما فيه محادثات تنتظر ردك أو شكاوى جديدة.', 'No conversations are waiting for you and no new complaints.') + '</span></div>';
      return;
    }
    box.innerHTML = items.slice(0, 6).map(function(x){
      return '<button type="button" class="v2-row" data-phone="' + escapeHtml(x.phone) + '"><span class="v2-sev" style="background:' + x.r.sev + '"></span>' +
        '<span class="v2-row-mid"><b>' + escapeHtml(displayConvName(x.conv, x.phone)) + '</b><span>' + escapeHtml(x.last ? x.last.text : '') + '</span></span>' +
        '<span class="v2-row-end"><span class="v2-pill ' + x.r.pill[0] + '">' + x.r.pill[1] + '</span>' + v2Ago(x.conv.lastAt) + '</span></button>';
    }).join('');
    box.querySelectorAll('.v2-row').forEach(function(b){ b.addEventListener('click', function(){ v2OpenConversation(b.dataset.phone); }); });
  }
  function v2RenderRecent(){
    var box = document.getElementById('homeRecent');
    var phones = Object.keys(conversations).sort(function(a, b){ return new Date(conversations[b].lastAt) - new Date(conversations[a].lastAt); }).slice(0, 6);
    if(!phones.length){
      box.innerHTML = '<div class="v2-empty"><span><b>' + V2L('ما فيه محادثات بعد', 'No conversations yet') + '</b>' +
        V2L('أول ما يراسل عميل رقم واتساب نشاطك، تظهر المحادثة هنا.', 'Once a customer messages your WhatsApp number, the conversation shows up here.') + '</span></div>';
      return;
    }
    box.innerHTML = phones.map(function(phone){
      var c = conversations[phone], last = c.messages[c.messages.length - 1];
      var name = displayConvName(c, phone);
      var state = c.botPaused ? '<span class="v2-pill v2-p-warn">' + V2L('فريقك يرد', 'Team replying') + '</span>' : '<span class="v2-pill v2-p-ok">' + V2L('البوت يرد', 'Bot replying') + '</span>';
      return '<button type="button" class="v2-row" data-phone="' + escapeHtml(phone) + '"><span class="v2-av" style="background:' + v2AvColor(phone) + '">' + escapeHtml(v2Initial(name)) + '</span>' +
        '<span class="v2-row-mid"><b>' + escapeHtml(name) + '</b><span>' + (last && last.dir === 'out' ? V2L('البوت: ', 'Bot: ') : '') + escapeHtml(last ? last.text : '') + '</span></span>' +
        '<span class="v2-row-end">' + state + v2Ago(c.lastAt) + '</span></button>';
    }).join('');
    box.querySelectorAll('.v2-row').forEach(function(b){ b.addEventListener('click', function(){ v2OpenConversation(b.dataset.phone); }); });
  }
  function v2MonthCount(){
    var now = new Date(), n = 0;
    allMessages.forEach(function(r){ var d = new Date(r.created_at); if(d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()){ n++; } });
    return n;
  }
  function v2FmtDate(iso){ return new Date(iso).toLocaleDateString(window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' }); }
  function v2RenderUsage(){
    var box = document.getElementById('homeUsage');
    var used = v2MonthCount();
    var limit = (myPlan && myPlan.monthly_message_limit) || 0;
    var extra = (myClient && myClient.extra_message_credits) || 0;
    var allowance = limit ? limit + extra : 0;
    var qKind = 'monthly';
    if(v2Quota){ used = Number(v2Quota.used) || 0; allowance = Number(v2Quota.allowance) || 0; qKind = v2Quota.kind; if(qKind !== 'monthly'){ extra = 0; } }
    var pct = allowance ? Math.min(100, Math.round((used / allowance) * 100)) : 0;
    var meterCls = pct >= 100 ? 'full' : (pct >= 80 ? 'warn' : '');
    var planName = myPlan ? PT(myPlan.name_ar || '') : V2L('بدون باقة', 'No plan');
    var st = myClient.subscription_status;
    var stateEl = document.getElementById('homeSubState');
    var stMap = { active: ['v2-p-ok', V2L('فعّال', 'Active')], trial: ['v2-p-info', V2L('فترة تجريبية', 'Trial')], past_due: ['v2-p-warn', V2L('متأخر الدفع', 'Past due')], expired: ['v2-p-bad', V2L('منتهي', 'Expired')], canceled: ['v2-p-bad', V2L('ملغي', 'Canceled')] };
    var s = stMap[st] || stMap.expired;
    if(stateEl){ stateEl.hidden = false; stateEl.className = 'v2-pill ' + s[0]; stateEl.textContent = s[1]; }
    var endIso = st === 'trial' ? myClient.trial_ends_at : myClient.current_period_ends_at;
    var html = '<div class="v2-usage">' +
      '<div class="r"><span>' + V2L('الباقة', 'Plan') + '</span><b>' + escapeHtml(planName) + '</b></div>';
    if(allowance){
      var usageLbl = qKind === 'trial' ? V2L('ردود الفترة التجريبية', 'Trial replies') : (qKind === 'prepaid' ? V2L('الرصيد المسبق', 'Prepaid credit') : V2L('ردود هذا الشهر', 'Replies this month'));
      html += '<div><div class="r"><span>' + usageLbl + '</span><b>' + pct + '%</b></div>' +
        '<span class="v2-meter ' + meterCls + '"><i style="width:' + pct + '%"></i></span>' +
        '<div class="r"><span class="big">' + v2Fmt(used) + '</span><span>' + V2L('من ', 'of ') + v2Fmt(allowance) + (extra ? V2L(' (منها ' + v2Fmt(extra) + ' رصيد إضافي)', ' (incl. ' + v2Fmt(extra) + ' extra)') : '') + '</span></div></div>';
    } else {
      html += '<div class="r"><span>' + V2L('رسائل هذا الشهر', 'Messages this month') + '</span><b>' + v2Fmt(used) + '</b></div>';
    }
    if(endIso){ html += '<div class="r"><span>' + (st === 'trial' ? V2L('تنتهي التجربة', 'Trial ends') : V2L('يتجدد / ينتهي', 'Renews / ends')) + '</span><b>' + v2FmtDate(endIso) + '</b></div>'; }
    if(isOwner){ html += '<button type="button" class="v2-link" id="homeManagePlan" style="align-self:flex-start">' + (st === 'active' ? V2L('إدارة الاشتراك والترقية', 'Manage or upgrade plan') : V2L('اختر باقتك وفعّل اشتراكك', 'Choose a plan and activate')) + '</button>'; }
    html += '</div>';
    box.innerHTML = html;
    var mp = document.getElementById('homeManagePlan'); if(mp){ mp.addEventListener('click', v2OpenPlanCard); }
    // القائمة الجانبية
    var nm = document.getElementById('v2NavMeter'), nu = document.getElementById('v2NavUsage');
    if(nm){ nm.style.width = pct + '%'; nm.parentNode.className = 'v2-meter ' + meterCls; nm.parentNode.style.display = allowance ? '' : 'none'; }
    if(nu){ nu.textContent = allowance ? (v2Fmt(used) + ' / ' + v2Fmt(allowance) + V2L(' رسالة', ' msgs')) : ''; }
    var mg = document.getElementById('v2ManagePlan'); if(mg){ mg.style.display = isOwner ? '' : 'none'; }
  }
  function v2RenderTopState(){
    var name = myClient.business_name_ar || myClient.business_name || '';
    var nameEl = document.getElementById('v2StoreName'), avEl = document.getElementById('v2StoreAv'), subEl = document.getElementById('v2StoreSub');
    if(nameEl){ nameEl.textContent = name || '–'; }
    if(avEl){ avEl.textContent = v2Initial(name); }
    var links = [];
    if(myClient.salla_store_id){ links.push(V2L('سلة', 'Salla')); }
    if(myClient.zid_store_id || myClient.zid_integration_enabled){ links.push(V2L('زد', 'Zid')); }
    if(subEl){ subEl.textContent = (isOwner ? V2L('صاحب الحساب', 'Owner') : V2L('عضو فريق', 'Team member')) + (links.length ? ' · ' + links.join(V2L('، ', ', ')) : ''); }
    var wa = document.getElementById('v2WaState');
    if(wa){
      var ok = !!myClient.whatsapp_phone_number_id;
      wa.hidden = false;
      wa.className = 'v2-wa ' + (ok ? 'ok' : 'off');
      wa.textContent = ok ? V2L('واتساب متصل', 'WhatsApp connected') : V2L('واتساب غير مربوط', 'WhatsApp not connected');
      wa.title = ok ? '' : V2L('افتح خطوات الإعداد في الرئيسية لربط رقمك', 'Open the setup steps on Home to connect your number');
      wa.onclick = ok ? null : function(){ v2Go('home'); };
    }
  }

  /* ---------- استهلاك الرسائل + تنبيه الاقتراب من الحد ---------- */
  // الرصيد الفعلي اللي يطبّقه البوت (my_reply_quota) — نفس الحساب بالضبط: سقف الباقة الشهري،
  // أو الرصيد المسبق، أو 300 رد للفترة التجريبية. عند 100% البوت يوقف الرد الآلي فعلياً.
  var v2Quota = null;
  function renderUsageStat(monthCount){
    const EN = (window.PORTAL_LANG === 'en');
    function paint(used, allowance, kind){
      document.getElementById('statUsage').textContent = allowance ? (used + ' / ' + allowance) : used;
      const banner = document.getElementById('usageWarningBanner');
      if(!allowance){ banner.style.display = 'none'; return; }
      const pct = Math.round((used / allowance) * 100);
      const scope = kind === 'trial' ? (EN ? 'your free trial' : 'الفترة التجريبية') : (kind === 'prepaid' ? (EN ? 'your prepaid credit' : 'رصيدك المسبق') : (EN ? 'this month' : 'هذا الشهر'));
      const fix = kind === 'trial' ? (EN ? 'Choose a plan' : 'اختر باقتك') : (EN ? 'Top up credit or upgrade your plan' : 'اشحن رصيد رسائل أو رقّ باقتك');
      if(pct >= 100){
        banner.className = 'alert-box error';
        banner.style.display = 'block';
        banner.innerHTML = EN
          ? ('🚫 Auto-replies are paused: your bot used all ' + allowance + ' replies of ' + scope + '. New customer messages still arrive in Conversations so you can reply manually. ')
          : ('🚫 توقف الرد الآلي: استخدم بوتك كامل الـ ' + allowance + ' رد المتاحة في ' + scope + '. رسائل العملاء الجديدة تصلك في المحادثات وتقدر ترد يدوياً. ');
      } else if(pct >= 80){
        banner.className = 'cost-note';
        banner.style.display = 'block';
        banner.innerHTML = EN
          ? ('⚠️ Your bot used ' + pct + '% of ' + scope + ' (' + used + ' / ' + allowance + '). Auto-replies pause at 100%. ')
          : ('⚠️ استخدم بوتك ' + pct + '% من ردود ' + scope + ' (' + used + ' / ' + allowance + '). الرد الآلي يتوقف عند 100%. ');
      } else {
        banner.style.display = 'none';
        return;
      }
      if(isOwner){
        const a = document.createElement('a');
        a.href = '#'; a.style.cssText = 'color:inherit; text-decoration:underline; font-weight:800;';
        a.textContent = fix;
        a.addEventListener('click', function(e){ e.preventDefault(); if(typeof v2OpenPlanCard === 'function'){ v2OpenPlanCard(); } });
        banner.appendChild(a);
      }
    }
    // عرض مبدئي فوري من البيانات المحلية، ثم الرقم الدقيق من الخادم
    const limit = (myPlan && myPlan.monthly_message_limit) || null;
    const extraCredits = (myClient && myClient.extra_message_credits) || 0;
    paint(monthCount, limit ? (limit + extraCredits) : null, 'monthly');
    supabaseClient.rpc('my_reply_quota').then(function(res){
      if(res.error || !res.data){ return; }
      v2Quota = res.data;
      paint(Number(res.data.used) || 0, Number(res.data.allowance) || 0, res.data.kind);
      if(typeof v2RenderUsage === 'function' && myClient){ v2RenderUsage(); }
    });
  }
  function formatDateAr(iso){
    return new Date(iso).toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* ---------- الدفع الإلكتروني عبر Geidea (Checkout v2 - Hosted Payment Page) ----------
     نستدعي create-geidea-order وننقل العميل لرابط الدفع. لو نظام الدفع لسه ما تفعّل
     (الأسرار ما انضافت بعد)، الدالة ترجع payment_not_configured فنوجّه العميل لتبويب الدعم. */
  async function startGeideaCheckout(purpose, extra, title){
    if(!myClient){ return; }
    try{
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const authToken = sessionData.session.access_token;
      const res = await fetch(FUNCTIONS_BASE + '/create-geidea-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify(Object.assign({ purpose: purpose }, extra || {}))
      });
      const resJson = await res.json().catch(function(){ return {}; });

      if(resJson.error === 'payment_not_configured'){
        document.querySelector('.tab-btn[data-tab="support"]').click();
        return;
      }
      if(!res.ok || !resJson.payment_url){
        alert(resJson.error || PT('تعذّر إتمام عملية الدفع، حاول مرة ثانية أو تواصل مع الدعم.'));
        return;
      }
      window.location.href = resJson.payment_url;
    } catch(e){
      document.querySelector('.tab-btn[data-tab="support"]').click();
    }
  }
  function renderSubscriptionBanner(){
    const banner = document.getElementById('subscriptionBanner');
    if(!myClient || !isOwner){ banner.style.display = 'none'; return; }
    const endsAt = myClient.current_period_ends_at ? new Date(myClient.current_period_ends_at) : null;
    const now = new Date();
    const daysLeft = endsAt ? Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24)) : null;
    const BEN = (window.PORTAL_LANG === 'en');
    const trialEnds = myClient.trial_ends_at ? new Date(myClient.trial_ends_at) : null;
    const trialDaysLeft = trialEnds ? Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)) : null;
    if(myClient.subscription_status === 'trial' && (trialDaysLeft === null || trialDaysLeft >= 0)){
      // الفترة التجريبية: تنبيه ودّي بدل رسالة "غير فعّال"
      banner.className = 'cost-note';
      banner.style.display = 'block';
      banner.innerHTML = (trialDaysLeft !== null
        ? (BEN ? ('🕐 You are on the free trial — ' + trialDaysLeft + ' day(s) left. ') : ('🕐 أنت في الفترة التجريبية — باقي ' + trialDaysLeft + ' يوم. '))
        : (BEN ? '🕐 You are on the free trial. ' : '🕐 أنت في الفترة التجريبية. ')) +
        '<a href="#" id="bannerRenewLink" style="color:inherit; text-decoration:underline; font-weight:800;">' + (BEN ? 'Choose your plan' : 'اختر باقتك الآن') + '</a>';
    } else if(myClient.subscription_status !== 'active' || !endsAt || daysLeft < 0){
      banner.className = 'alert-box error';
      banner.style.display = 'block';
      banner.innerHTML = PT('🚫 اشتراكك غير فعّال حالياً. ') + '<a href="#" id="bannerRenewLink" style="color:inherit; text-decoration:underline; font-weight:800;">' + PT('ادفع الآن لتفعيل البوت') + '</a>';
    } else if(daysLeft <= 5){
      banner.className = 'cost-note';
      banner.style.display = 'block';
      banner.innerHTML = (window.PORTAL_LANG === 'en' ? ('⏳ Your subscription ends in ' + daysLeft + ' day(s). ') : ('⏳ اشتراكك ينتهي خلال ' + daysLeft + ' يوم. ')) + '<a href="#" id="bannerRenewLink" style="color:inherit; text-decoration:underline; font-weight:800;">' + PT('جدّده الآن') + '</a>';
    } else {
      banner.style.display = 'none';
      return;
    }
    const link = document.getElementById('bannerRenewLink');
    if(link){
      link.addEventListener('click', function(e){
        e.preventDefault();
        document.querySelector('.tab-btn[data-tab="settings"]').click();
        const card = document.getElementById('planCard');
        if(card){ card.scrollIntoView({ behavior: 'smooth' }); }
      });
    }
  }
  function renderPlanCard(){
    const box = document.getElementById('planInfoBox');
    const btn = document.getElementById('renewPlanBtn');
    const nonOwnerHint = document.getElementById('planHelperNonOwner');
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    if(!myClient){ return; }
    const planName = myPlan ? PT(myPlan.name_ar) : PT('لم تُحدد بعد');
    const price = myPlan ? myPlan.monthly_price_sar : null;
    const isPrepaid = !!(myPlan && myPlan.is_prepaid);
    const isAnnual = !!(myPlan && myPlan.billing_cycle === 'annual');
    const LANG_EN = (window.PORTAL_LANG === 'en');
    const priceLabel = price !== null ? (' — ' + price + (isPrepaid ? (LANG_EN ? ' SAR (one-time)' : ' ريال (دفعة وحدة)') : (isAnnual ? (LANG_EN ? ' SAR/year' : ' ريال/سنة') : (LANG_EN ? ' SAR/month' : ' ريال/شهر')))) : '';
    const endsAtLabel = myClient.current_period_ends_at ? formatDateAr(myClient.current_period_ends_at) : (LANG_EN ? 'Not active yet' : 'غير مفعّل بعد');
    const endsAtWord = isPrepaid ? (LANG_EN ? 'Credit valid until: ' : 'صلاحية الرصيد حتى: ') : (isAnnual ? (LANG_EN ? 'Annual subscription ends on: ' : 'ينتهي الاشتراك السنوي بتاريخ: ') : (LANG_EN ? 'Ends on: ' : 'ينتهي بتاريخ: '));
    const statusLabel = myClient.subscription_status === 'active' ? (LANG_EN ? '✅ Active' : '✅ فعّال') : (myClient.subscription_status === 'trial' ? (LANG_EN ? '🕐 Trial period' : '🕐 فترة تجريبية') : (LANG_EN ? '🚫 Inactive' : '🚫 غير فعّال'));
    box.innerHTML = (LANG_EN ? 'Plan: ' : 'الباقة: ') + '<b>' + escapeHtml(planName) + '</b>' + priceLabel +
      (isPrepaid && myPlan.prepaid_credits ? '<br>' + (LANG_EN ? 'Prepaid message credit: ' : 'رصيد الرسائل المسبق: ') + Number(myPlan.prepaid_credits).toLocaleString('en') + (LANG_EN ? ' messages' : ' رسالة') : '') +
      '<br>' + (LANG_EN ? 'Status: ' : 'الحالة: ') + statusLabel + '<br>' + endsAtWord + endsAtLabel;
    btn.style.display = 'none';
    if(isOwner){ loadPlanOptions(); }
  }

  /* ---------- اختيار/تغيير الباقة + عرض الافتتاح (خصم 50% سنوي) ----------
     التاجر يختار المدة (سنوي/شهري/رصيد مسبق) والباقة، ثم يدفع عبر Geidea.
     الخصم الفعلي يحسبه الخادم (create-geidea-order) — هنا للعرض فقط. */
  let planOptions = null;      // الباقات المفعّلة
  let promoState = null;       // حالة عرض الافتتاح من get-launch-promo-status
  let selectedCycle = null;    // annual | monthly | prepaid
  let selectedPlanId = null;
  let planOptionsLoading = false;

  function planCycleOf(p){ return p.is_prepaid ? 'prepaid' : (p.billing_cycle === 'annual' ? 'annual' : 'monthly'); }
  function planTierOf(p){ return String(p.code || '').replace(/_annual$/, ''); }
  function fmtSar(n){ return Number(n).toLocaleString('en', { maximumFractionDigits: 2 }); }
  function planFinalPrice(p){
    const price = Number(p.monthly_price_sar);
    return (planCycleOf(p) === 'annual' && promoState) ? price * 0.5 : price;
  }
  function planDisplayName(p){
    const EN = (window.PORTAL_LANG === 'en');
    const base = String(p.name_ar || '').replace(/\s*\(سنوي\)\s*/, '');
    return EN ? PT(base) : base;
  }

  async function loadPlanOptions(){
    if(planOptions){ renderPlanPicker(); return; }
    if(planOptionsLoading){ return; }
    planOptionsLoading = true;
    try{
      const results = await Promise.all([
        supabaseClient.from('subscription_plans')
          .select('id, code, name_ar, billing_cycle, monthly_price_sar, monthly_message_limit, is_prepaid, prepaid_credits, prepaid_validity_months, sort_order')
          .eq('is_active', true).order('sort_order'),
        fetch(FUNCTIONS_BASE + '/get-launch-promo-status').then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; })
      ]);
      planOptions = (results[0] && results[0].data) || [];
      const promo = results[1];
      promoState = (promo && promo.active) ? promo : null;
    } catch(e){
      planOptions = [];
    }
    planOptionsLoading = false;
    // الاختيار الافتراضي: نفس باقة العميل، ومع العرض نقترح السنوي من نفس المستوى
    const current = myClient && planOptions.find(function(p){ return p.id === myClient.plan_id; });
    if(current){
      selectedCycle = (promoState && planCycleOf(current) === 'monthly') ? 'annual' : planCycleOf(current);
    } else {
      selectedCycle = promoState ? 'annual' : 'monthly';
    }
    pickDefaultPlanInCycle(current ? planTierOf(current) : 'growth');
    renderPlanPicker();
  }

  function pickDefaultPlanInCycle(tier){
    const inCycle = (planOptions || []).filter(function(p){ return planCycleOf(p) === selectedCycle; });
    const current = inCycle.find(function(p){ return myClient && p.id === myClient.plan_id; });
    const sameTier = inCycle.find(function(p){ return planTierOf(p) === tier; });
    const pick = current || sameTier || inCycle[0] || null;
    selectedPlanId = pick ? pick.id : null;
  }

  function renderPlanPicker(){
    const wrap = document.getElementById('planPicker');
    const btn = document.getElementById('renewPlanBtn');
    if(!wrap || !planOptions || !planOptions.length || !isOwner){ if(wrap){ wrap.style.display = 'none'; } return; }
    const EN = (window.PORTAL_LANG === 'en');
    wrap.style.display = 'block';

    // شريط عرض الافتتاح
    const promoEl = document.getElementById('planPromoNote');
    if(promoState){
      const ends = promoState.endsAt ? formatDateAr(promoState.endsAt) : '';
      const setup = (promoState.freeSetup && promoState.freeSetup.active)
        ? (EN ? ' + free full setup (first 20 customers)' : ' + إعداد كامل مجاني (لأول 20 عميل)') : '';
      promoEl.innerHTML = '<b>' + (EN ? '🎉 Launch offer: ' : '🎉 عرض الافتتاح: ') + '</b>' +
        (EN ? '50% off every annual plan + 5 add-ons free for one year (worth 1,395 SAR)' : 'خصم 50% على كل الباقات السنوية + 5 إضافات مجانية لمدة سنة (قيمتها 1,395 ريال)') +
        escapeHtml(setup) + (ends ? (EN ? ' — until ' : ' — حتى ') + escapeHtml(ends) : '');
      promoEl.style.display = 'block';
    } else {
      promoEl.style.display = 'none';
    }

    // أزرار المدة
    const cycles = [
      { key: 'annual', label: EN ? 'Annual' : 'سنوي', badge: promoState ? '-50%' : '' },
      { key: 'monthly', label: EN ? 'Monthly' : 'شهري', badge: '' },
      { key: 'prepaid', label: EN ? 'Prepaid credit' : 'رصيد مسبق', badge: '' }
    ].filter(function(c){ return planOptions.some(function(p){ return planCycleOf(p) === c.key; }); });
    const cycleBox = document.getElementById('planCycle');
    cycleBox.innerHTML = cycles.map(function(c){
      const on = c.key === selectedCycle;
      return '<button type="button" class="cycle-btn' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-cycle="' + c.key + '">' +
        escapeHtml(c.label) + (c.badge ? ' <span class="cycle-badge">' + escapeHtml(c.badge) + '</span>' : '') + '</button>';
    }).join('');

    // بطاقات الباقات
    const list = planOptions.filter(function(p){ return planCycleOf(p) === selectedCycle; });
    const optBox = document.getElementById('planOptions');
    optBox.innerHTML = list.map(function(p){
      const cyc = planCycleOf(p);
      const price = Number(p.monthly_price_sar);
      const final = planFinalPrice(p);
      const on = p.id === selectedPlanId;
      const isCurrent = myClient && p.id === myClient.plan_id;
      let priceHtml;
      if(cyc === 'annual'){
        priceHtml = (final < price ? '<s>' + fmtSar(price) + '</s> ' : '') + '<b>' + fmtSar(final) + '</b> ' + (EN ? 'SAR/year' : 'ريال/سنة') +
          '<span class="plan-sub">' + (EN ? '≈ ' + fmtSar(Math.round(final / 12)) + ' SAR/month' : '≈ ' + fmtSar(Math.round(final / 12)) + ' ريال/شهر') + '</span>';
      } else if(cyc === 'prepaid'){
        priceHtml = '<b>' + fmtSar(final) + '</b> ' + (EN ? 'SAR one-time' : 'ريال دفعة واحدة');
      } else {
        priceHtml = '<b>' + fmtSar(final) + '</b> ' + (EN ? 'SAR/month' : 'ريال/شهر');
      }
      const limit = cyc === 'prepaid'
        ? (fmtSar(p.prepaid_credits || 0) + (EN ? ' messages' : ' رسالة'))
        : (fmtSar(p.monthly_message_limit || 0) + (EN ? ' messages/month' : ' رسالة/شهر'));
      return '<button type="button" class="plan-opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-plan="' + escapeHtml(p.id) + '">' +
        '<span class="plan-opt-head"><span class="plan-opt-name">' + escapeHtml(planDisplayName(p)) + '</span>' +
        (isCurrent ? '<span class="plan-cur">' + (EN ? 'Current' : 'باقتك الحالية') + '</span>' : '') + '</span>' +
        '<span class="plan-opt-price">' + priceHtml + '</span>' +
        '<span class="plan-opt-limit">' + escapeHtml(limit) + '</span></button>';
    }).join('');

    // زر الدفع + ملاحظة التغيير
    const sel = planOptions.find(function(p){ return p.id === selectedPlanId; });
    const note = document.getElementById('planChangeNote');
    if(sel){
      const final = planFinalPrice(sel);
      const isRenew = myClient && sel.id === myClient.plan_id;
      btn.textContent = (EN ? (isRenew ? '💳 Renew — ' : '💳 Pay ') : (isRenew ? '💳 جدّد باقتك — ' : '💳 ادفع ')) + fmtSar(final) + (EN ? ' SAR' : ' ريال') +
        (isRenew ? '' : (EN ? ' — ' : ' — ') + planDisplayName(sel));
      btn.style.display = 'inline-block';
      const activeNow = myClient && myClient.subscription_status === 'active' && myClient.current_period_ends_at && new Date(myClient.current_period_ends_at) > new Date();
      note.textContent = activeNow
        ? (EN ? 'Your new plan applies right after payment, and its period is added on top of the time left in your current subscription.' : 'الباقة تتفعّل فور الدفع، ومدتها تُضاف على المتبقي من اشتراكك الحالي.')
        : (EN ? 'Your bot is activated automatically right after payment.' : 'يتفعّل البوت تلقائياً فور إتمام الدفع.');
    } else {
      btn.style.display = 'none';
      note.textContent = '';
    }
  }

  document.getElementById('planCycle').addEventListener('click', function(e){
    const b = e.target.closest('.cycle-btn');
    if(!b){ return; }
    const prev = planOptions && planOptions.find(function(p){ return p.id === selectedPlanId; });
    selectedCycle = b.getAttribute('data-cycle');
    pickDefaultPlanInCycle(prev ? planTierOf(prev) : 'growth');
    renderPlanPicker();
  });
  document.getElementById('planOptions').addEventListener('click', function(e){
    const b = e.target.closest('.plan-opt');
    if(!b){ return; }
    selectedPlanId = b.getAttribute('data-plan');
    renderPlanPicker();
  });
  document.getElementById('planPromoNote').addEventListener('click', function(){
    if(selectedCycle === 'annual'){ return; }
    const prev = planOptions && planOptions.find(function(p){ return p.id === selectedPlanId; });
    selectedCycle = 'annual';
    pickDefaultPlanInCycle(prev ? planTierOf(prev) : 'growth');
    renderPlanPicker();
  });
  document.getElementById('renewPlanBtn').addEventListener('click', function(){
    if(!myClient || !isOwner || !selectedPlanId){ return; }
    const btnEl = this;
    btnEl.disabled = true;
    startGeideaCheckout('subscription', { plan_id: selectedPlanId }, 'الاشتراك').finally(function(){ btnEl.disabled = false; });
  });
  // اختبار الدفع الحقيقي بمبلغ ريال واحد — يظهر لحساب الإدارة فقط، والدالة ترفض أي حساب آخر من جهة الخادم
  (function(){
    const btn = document.getElementById('liveTestPayBtn');
    if(!btn) return;
    setInterval(function(){
      const show = !!(myClient && isOwner && String(myClient.owner_email || '').toLowerCase().trim() === 'vetarabrand@gmail.com');
      btn.style.display = show ? 'inline-block' : 'none';
    }, 1000);
    btn.addEventListener('click', function(){
      if(!myClient){ return; }
      btn.disabled = true;
      startGeideaCheckout('live_test_1sar', {}, 'اختبار').finally(function(){ btn.disabled = false; });
    });
  })();
  /* ---------- ربط متجر زد ---------- */
  function storeAddonLockedHtml(suffix){
    const price = (myPlan && myPlan.store_integration_addon_price_sar) || 25;
    return '<div class="alert-box error" style="display:block; margin-top:10px;">'
      + (window.PORTAL_LANG === 'en'
        ? ('Store connection isn\'t enabled on your current plan (' + escapeHtml(PT((myPlan && myPlan.name_ar) || 'الأساسية')) + '). Enable it for an extra ' + price + ' SAR/month, or upgrade to the Growth plan or higher to get it for free.')
        : ('ربط المتجر غير مفعّل في باقتك الحالية (' + escapeHtml((myPlan && myPlan.name_ar) || 'الأساسية') + '). فعّله مقابل ' + price + ' ريال/شهر إضافية، أو رقّي لباقة نمو وما فوق ليكون مجانياً.'))
      + '</div>'
      + '<button class="modal-cancel" id="storeAddonSupportBtn_' + suffix + '" style="margin-top:8px;">' + PT('تواصل مع الدعم للتفعيل') + '</button>';
  }
  /* ---------- لوحة الطلبات الموحّدة ---------- */
  let ordersLoaded = false;
  async function loadOrdersTab(){
    if(ordersLoaded){ return; }
    const container = document.getElementById('ordersContent');
    if(!myPlan){ return; }
    if(!myPlan.order_table_included){
      container.innerHTML = '<div class="alert-box error" style="display:block;">'
        + (window.PORTAL_LANG === 'en'
          ? ('The unified orders dashboard is available from the Growth plan and up. Your current plan: ' + escapeHtml(PT(myPlan.name_ar || 'الأساسية')) + '. Upgrade your plan or contact support to enable it.')
          : ('لوحة الطلبات الموحّدة متاحة من باقة نمو وما فوق. باقتك الحالية: ' + escapeHtml(myPlan.name_ar || 'الأساسية') + '. رقّ باقتك أو تواصل مع الدعم للتفعيل.'))
        + '</div>'
        + '<button class="modal-cancel" id="ordersUpgradeBtn" style="margin-top:8px;">' + PT('تواصل مع الدعم') + '</button>';
      const upgradeBtn = document.getElementById('ordersUpgradeBtn');
      if(upgradeBtn){
        upgradeBtn.addEventListener('click', function(){
          document.querySelector('.tab-btn[data-tab="support"]').click();
        });
      }
      return;
    }
    ordersLoaded = true;
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/list-store-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ client_id: myClient.id })
      });
      const json = await res.json();
      if(!res.ok || json.error){
        ordersLoaded = false;
        container.innerHTML = '<div class="conv-empty">' + escapeHtml(PT(json.message) || PT('تعذّر تحميل الطلبات، حاول مرة ثانية.')) + '</div>';
        return;
      }
      const orders = json.orders || [];
      if(orders.length === 0){
        container.innerHTML = '<div class="conv-empty">' + PT('لا توجد طلبات بعد.') + '</div>';
        return;
      }
      let tableHtml = '<div class="table-wrap"><table style="width:100%; border-collapse:collapse;">'
        + '<thead><tr style="text-align:right; border-bottom:1.5px solid var(--border);">'
        + '<th style="padding:10px 8px;">' + PT('رقم الطلب') + '</th>'
        + '<th style="padding:10px 8px;">' + PT('العميل') + '</th>'
        + '<th style="padding:10px 8px;">' + PT('الحالة') + '</th>'
        + '<th style="padding:10px 8px;">' + PT('القيمة') + '</th>'
        + '<th style="padding:10px 8px;">' + PT('التاريخ') + '</th>'
        + '</tr></thead><tbody>';
      orders.forEach(function(o){
        tableHtml += '<tr style="border-bottom:1px solid var(--border);">'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.order_code || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.customer_name || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.status || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.total || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.created_at ? new Date(o.created_at).toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn')) : '—') + '</td>'
          + '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      container.innerHTML = tableHtml;
    } catch(e){
      ordersLoaded = false;
      container.innerHTML = '<div class="conv-empty">' + PT('تعذّر تحميل الطلبات، حاول مرة ثانية.') + '</div>';
    }
  }
  function bindStoreAddonSupportBtn(suffix){
    const el = document.getElementById('storeAddonSupportBtn_' + suffix);
    if(el){
      el.addEventListener('click', function(){
        document.querySelector('.tab-btn[data-tab="support"]').click();
      });
    }
  }
  async function loadZidStatus(){
    // ربط زد الجديد متوقف مؤقتاً (قريباً) — لكن التجار المربوطين فعلاً قبل التوقف يستمر عرض اتصالهم الحقيقي.
    const statusBox = document.getElementById('zidStatus');
    const btn = document.getElementById('connectZidBtn');
    const nonOwnerHint = document.getElementById('zidHelperNonOwner');
    nonOwnerHint.style.display = 'none';
    btn.style.display = 'none';
    if(!myClient){ return; }
    const { data } = await supabaseClient
      .from('client_zid_credentials')
      .select('store_name, connected_at')
      .eq('client_id', myClient.id)
      .maybeSingle();
    if(data){
      const dateStr = data.connected_at ? new Date(data.connected_at).toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge zid-connected">' + PT('✅ متصل') + (data.store_name ? ' — ' + escapeHtml(data.store_name) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">' + PT('تم الربط بتاريخ') + ' ' + dateStr + '</div>' : '');
    } else {
      statusBox.innerHTML = '<span class="status-badge zid-disconnected">🔜 ' + PT('قريباً — ربط متاجر جديدة متوقف مؤقتاً') + '</span>';
    }
  }
  document.getElementById('connectZidBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const btn = this;
    btn.disabled = true; btn.textContent = PT('جاري التحضير...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/zid-oauth-authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ client_id: myClient.id })
      });
      const json = await res.json();
      if(!res.ok || !json.url){
        btn.disabled = false; btn.textContent = PT('ربط مع زد');
        alert(json.error || PT('تعذّر بدء الربط مع زد، حاول مرة ثانية.'));
        return;
      }
      window.location.href = json.url;
    } catch(e){
      btn.disabled = false; btn.textContent = PT('ربط مع زد');
      alert(PT('حصل خطأ بالاتصال، حاول مرة ثانية.'));
    }
  });
  /* ---------- ربط متجر سلة ---------- */
  async function loadSallaStatus(){
    const statusBox = document.getElementById('sallaStatus');
    const btn = document.getElementById('connectSallaBtn');
    const nonOwnerHint = document.getElementById('sallaHelperNonOwner');
    nonOwnerHint.style.display = 'none';
    btn.style.display = 'none';
    if(!myClient){ return; }
    const { data } = await supabaseClient
      .from('client_salla_credentials')
      .select('store_name, connected_at')
      .eq('client_id', myClient.id)
      .maybeSingle();
    if(data){
      const dateStr = data.connected_at ? new Date(data.connected_at).toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge salla-connected">' + PT('✅ متصل') + (data.store_name ? ' — ' + escapeHtml(data.store_name) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">' + PT('تم الربط بتاريخ') + ' ' + dateStr + '</div>' : '');
    } else {
      statusBox.innerHTML = '<span class="status-badge salla-disconnected">' + PT('⛔ غير متصل') + '</span>';
      if(isOwner){ btn.style.display = 'inline-block'; } else { nonOwnerHint.style.display = 'block'; }
    }
  }
  document.getElementById('connectSallaBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const btn = this;
    btn.disabled = true; btn.textContent = PT('جاري التحضير...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/salla-oauth-authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ client_id: myClient.id })
      });
      const json = await res.json();
      if(!res.ok || !json.url){
        btn.disabled = false; btn.textContent = PT('ربط مع سلة');
        alert(json.error || PT('تعذّر بدء الربط مع سلة، حاول مرة ثانية.'));
        return;
      }
      window.location.href = json.url;
    } catch(e){
      btn.disabled = false; btn.textContent = PT('ربط مع سلة');
      alert(PT('حصل خطأ بالاتصال، حاول مرة ثانية.'));
    }
  });
  /* ---------- ربط متجر ووكومرس (ووردبريس) ---------- */
  async function loadWooCommerceStatus(){
    const statusBox = document.getElementById('wooStatus');
    const form = document.getElementById('wooConnectForm');
    const nonOwnerHint = document.getElementById('wooHelperNonOwner');
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    if(!myClient){ return; }
    const { data } = await supabaseClient
      .from('client_woocommerce_credentials')
      .select('store_url, created_at')
      .eq('client_id', myClient.id)
      .maybeSingle();
    const addonLocked = myPlan && !myPlan.store_integration_included && !myClient.zid_integration_enabled;
    if(data){
      const dateStr = data.created_at ? new Date(data.created_at).toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge woo-connected">' + PT('✅ متصل') + (data.store_url ? ' — ' + escapeHtml(data.store_url) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">' + PT('تم الربط بتاريخ') + ' ' + dateStr + '</div>' : '');
      form.style.display = 'none';
    } else if(addonLocked){
      statusBox.innerHTML = '<span class="status-badge woo-disconnected">⚪ ' + PT('غير متصل بعد') + '</span>' + (isOwner ? storeAddonLockedHtml('woo') : '');
      form.style.display = 'none';
      bindStoreAddonSupportBtn('woo');
    } else {
      statusBox.innerHTML = '<span class="status-badge woo-disconnected">⚪ ' + PT('غير متصل بعد') + '</span>';
      form.style.display = isOwner ? 'flex' : 'none';
    }
  }
  document.getElementById('connectWooBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const btn = this;
    const errBox = document.getElementById('wooConnectError');
    errBox.style.display = 'none';
    const storeUrl = document.getElementById('wooStoreUrl').value.trim();
    const consumerKey = document.getElementById('wooConsumerKey').value.trim();
    const consumerSecret = document.getElementById('wooConsumerSecret').value.trim();
    if(!storeUrl || !consumerKey || !consumerSecret){
      errBox.textContent = PT('عبّي رابط المتجر ومفتاحي الـ API كاملة.');
      errBox.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = PT('جاري الربط...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/connect-woocommerce-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ client_id: myClient.id, store_url: storeUrl, consumer_key: consumerKey, consumer_secret: consumerSecret })
      });
      const json = await res.json();
      if(!res.ok || json.error){
        btn.disabled = false; btn.textContent = PT('ربط مع ووكومرس');
        errBox.textContent = json.message || PT('تعذّر الربط، تأكد من صحة البيانات.');
        errBox.style.display = 'block';
        return;
      }
      await loadWooCommerceStatus();
    } catch(e){
      btn.disabled = false; btn.textContent = PT('ربط مع ووكومرس');
      errBox.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
      errBox.style.display = 'block';
    }
  });
  /* ---------- ربط بوت تليجرام ---------- */
  async function loadTelegramStatus(){
    const statusBox = document.getElementById('telegramStatus');
    const form = document.getElementById('telegramConnectForm');
    const nonOwnerHint = document.getElementById('telegramHelperNonOwner');
    const lockedHint = document.getElementById('telegramLockedHint');
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    if(!myClient){ return; }

    if(myClient.telegram_connection_status === 'connected' && myClient.telegram_bot_username){
      statusBox.innerHTML = '<span class="status-badge telegram-connected">' + PT('✅ متصل') + ' — @' + escapeHtml(myClient.telegram_bot_username) + '</span>';
      form.style.display = 'none';
      lockedHint.style.display = 'none';
      return;
    }

    const { data: addonRow } = await supabaseClient
      .from('client_addons')
      .select('enabled')
      .eq('client_id', myClient.id)
      .eq('addon_id', 'telegram_dm')
      .maybeSingle();
    const addonEnabled = !!(addonRow && addonRow.enabled);

    statusBox.innerHTML = '<span class="status-badge telegram-disconnected">⚪ ' + PT('غير متصل بعد') + '</span>';

    if(!addonEnabled){
      form.style.display = 'none';
      if(isOwner){
        lockedHint.style.display = 'block';
        lockedHint.innerHTML = PT('إضافة قناة تليجرام غير مفعّلة في حسابك بعد. فعّلها من تبويب "الإضافات" (399 ريال دفعة وحدة، بدون اشتراك شهري إضافي).');
      } else {
        lockedHint.style.display = 'none';
      }
      return;
    }

    lockedHint.style.display = 'none';
    form.style.display = isOwner ? 'flex' : 'none';
  }
  document.getElementById('connectTelegramBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const btn = this;
    const errBox = document.getElementById('telegramConnectError');
    errBox.style.display = 'none';
    const botToken = document.getElementById('telegramBotToken').value.trim();
    if(!botToken){
      errBox.textContent = PT('الرجاء لصق توكن البوت.');
      errBox.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = PT('جاري الربط...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/connect-telegram-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ client_id: myClient.id, bot_token: botToken })
      });
      const json = await res.json();
      if(!res.ok || json.error){
        btn.disabled = false; btn.textContent = PT('ربط مع تليجرام');
        errBox.textContent = json.message || PT('تعذّر الربط، تأكد من صحة التوكن.');
        errBox.style.display = 'block';
        return;
      }
      myClient.telegram_connection_status = 'connected';
      myClient.telegram_bot_username = json.bot_username;
      await loadTelegramStatus();
    } catch(e){
      btn.disabled = false; btn.textContent = PT('ربط مع تليجرام');
      errBox.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
      errBox.style.display = 'block';
    }
  });

  /* ---------- ربط رقم واتساب ذاتياً (Embedded Signup من ميتا) ---------- */
  // التاجر يربط رقمه بنفسه من نافذة ميتا الرسمية — بدون تدخل من فريق نبضة.
  //   "رقم جديد": رقم غير مستخدم في تطبيق واتساب، يصير رقم بوت (WhatsApp Cloud API).
  //   "تطبيق واتساب للأعمال على جوالي": تشغيل مزدوج (Coexistence) — التاجر يكمل يستخدم التطبيق
  //   على جواله والبوت يرد معه على نفس الرقم.
  // ميتا ترجع code (من FB.login) و waba_id + phone_number_id (من رسالة WA_EMBEDDED_SIGNUP)،
  // نجمعهم ونرسلهم لدالة whatsapp-embedded-signup اللي تكمل الربط من طرف الخادم.
  const WA_COEXIST_APP_ID = '2188934378330642';
  const WA_COEXIST_CONFIG_ID = '945220261304734';
  let fbSdkLoadPromise = null;
  function loadFacebookSdk(){
    if(fbSdkLoadPromise) return fbSdkLoadPromise;
    fbSdkLoadPromise = new Promise(function(resolve){
      if(window.FB){ resolve(window.FB); return; }
      window.fbAsyncInit = function(){
        window.FB.init({ appId: WA_COEXIST_APP_ID, autoLogAppEvents: true, xfbml: false, version: 'v21.0' });
        resolve(window.FB);
      };
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/ar_AR/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    });
    return fbSdkLoadPromise;
  }

  // حالة جلسة الربط الحالية (code و المعرّفات توصل بشكل منفصل وبأي ترتيب)
  let waSignup = null;

  function setWaButtonsBusy(busy, label){
    const newBtn = document.getElementById('connectWaNewBtn');
    const appBtn = document.getElementById('connectWaAppBtn');
    [newBtn, appBtn].forEach(function(b){ if(b){ b.disabled = !!busy; } });
    const msg = document.getElementById('waConnectMsg');
    if(msg){
      msg.style.display = label ? 'block' : 'none';
      msg.className = 'alert-box';
      msg.textContent = label || '';
    }
  }
  function showWaConnectError(text){
    const msg = document.getElementById('waConnectMsg');
    if(msg){
      msg.style.display = 'block';
      msg.className = 'alert-box error';
      msg.textContent = text;
    }
  }

  function renderWaAppStatus(){
    const statusBox = document.getElementById('waAppStatus');
    const newBtn = document.getElementById('connectWaNewBtn');
    const appBtn = document.getElementById('connectWaAppBtn');
    const nonOwnerHint = document.getElementById('waAppHelperNonOwner');
    const disconnectedHint = document.getElementById('waAppDisconnectedHint');
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    disconnectedHint.style.display = 'none';
    const canAct = !!isOwner;

    if(!myClient || !myClient.whatsapp_phone_number_id){
      statusBox.innerHTML = '<span class="status-badge shopify-disconnected">⚪ ' + PT('لا يوجد رقم واتساب مربوط بعد') + '</span>';
      newBtn.style.display = canAct ? 'inline-block' : 'none';
      appBtn.style.display = canAct ? 'inline-block' : 'none';
      newBtn.textContent = PT('ربط رقم جديد');
      appBtn.textContent = PT('ربط تطبيق واتساب للأعمال على جوالي');
      return;
    }

    const num = myClient.whatsapp_display_number ? ' — <span dir="ltr">' + escapeHtml(myClient.whatsapp_display_number) + '</span>' : '';
    const coex = myClient.coexistence_status || 'not_connected';
    let html = '<span class="status-badge shopify-connected">✅ ' + PT('رقم واتساب مربوط') + num + '</span>';
    if(coex === 'active') html += '<div class="helper-text" style="margin-top:8px;">' + PT('التشغيل المزدوج مفعّل: البوت يرد، وتقدر ترد بنفسك من تطبيق واتساب للأعمال.') + '</div>';
    else if(coex === 'pending_sync') html += '<div class="helper-text" style="margin-top:8px;">' + PT('جاري إتمام مزامنة المحادثات...') + '</div>';
    statusBox.innerHTML = html;
    if(coex === 'disconnected'){
      disconnectedHint.style.display = canAct ? 'block' : 'none';
    }
    // بعد الربط: زر واحد لإعادة الربط (نفس النوع اللي استخدمه التاجر)
    newBtn.style.display = 'none';
    appBtn.style.display = canAct ? 'inline-block' : 'none';
    appBtn.textContent = (coex === 'active' || coex === 'pending_sync' || coex === 'disconnected') ? PT('إعادة ربط تطبيق واتساب للأعمال') : PT('ربط تطبيق واتساب للأعمال على جوالي');
  }
  async function loadWaAppStatus(){
    renderWaAppStatus();
  }

  async function finishWaSignupIfReady(){
    if(!waSignup || waSignup.sent || !waSignup.code || !waSignup.phone_number_id || !waSignup.waba_id) return;
    waSignup.sent = true;
    setWaButtonsBusy(true, PT('جاري إكمال الربط مع واتساب...'));
    try{
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session.access_token;
      const res = await fetch(FUNCTIONS_BASE + '/whatsapp-embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          client_id: myClient.id,
          code: waSignup.code,
          waba_id: waSignup.waba_id,
          phone_number_id: waSignup.phone_number_id,
          mode: waSignup.mode
        })
      });
      const json = await res.json().catch(function(){ return {}; });
      setWaButtonsBusy(false, '');
      if(!res.ok || json.error){
        showWaConnectError(json.error || PT('تعذّر إتمام الربط، حاول مرة أخرى.'));
        waSignup = null;
        return;
      }
      myClient.whatsapp_phone_number_id = waSignup.phone_number_id;
      myClient.whatsapp_business_account_id = waSignup.waba_id;
      myClient.whatsapp_display_number = json.display_phone_number || myClient.whatsapp_display_number;
      if(json.coexistence_status) myClient.coexistence_status = json.coexistence_status;
      waSignup = null;
      renderWaAppStatus();
      const msg = document.getElementById('waConnectMsg');
      if(msg){
        msg.style.display = 'block';
        msg.className = 'alert-box ok';
        msg.textContent = json.message || PT('تم الربط بنجاح.');
      }
    } catch(e){
      setWaButtonsBusy(false, '');
      showWaConnectError(PT('حصل خطأ بالاتصال، حاول مرة ثانية.'));
      waSignup = null;
    }
  }

  window.addEventListener('message', function(event){
    if(!event.origin || !/^https:\/\/([a-z]+\.)?facebook\.com$/.test(event.origin)) return;
    let data;
    try{ data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch(e){ return; }
    if(!data || data.type !== 'WA_EMBEDDED_SIGNUP' || !waSignup) return;
    if(data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'){
      const d = data.data || {};
      if(d.waba_id) waSignup.waba_id = String(d.waba_id);
      if(d.phone_number_id) waSignup.phone_number_id = String(d.phone_number_id);
      if(data.event === 'FINISH_ONLY_WABA' && !d.phone_number_id){
        setWaButtonsBusy(false, '');
        showWaConnectError(PT('تم إنشاء حساب واتساب للأعمال لكن بدون رقم. أعد الربط واختر أو أضف رقم الهاتف.'));
        waSignup = null;
        return;
      }
      finishWaSignupIfReady();
    } else if(data.event === 'CANCEL'){
      setWaButtonsBusy(false, '');
      const step = data.data && data.data.current_step ? ' (' + data.data.current_step + ')' : '';
      showWaConnectError(PT('تم إلغاء الربط قبل اكتماله.') + step);
      waSignup = null;
    } else if(data.event === 'ERROR'){
      setWaButtonsBusy(false, '');
      const em = data.data && data.data.error_message ? ': ' + data.data.error_message : '';
      showWaConnectError(PT('ميتا أرجعت خطأ أثناء الربط') + em);
      waSignup = null;
    }
  });

  async function startWaSignup(mode){
    if(!myClient || !isOwner) return;
    waSignup = { mode: mode, code: null, waba_id: null, phone_number_id: null, sent: false };
    setWaButtonsBusy(true, PT('أكمل الخطوات في نافذة ميتا...'));
    const FB = await loadFacebookSdk();
    const extras = { setup: {}, sessionInfoVersion: '3' };
    if(mode === 'coexistence') extras.featureType = 'whatsapp_business_app_onboarding';
    FB.login(function(response){
      if(response && response.authResponse && response.authResponse.code){
        if(waSignup){ waSignup.code = response.authResponse.code; finishWaSignupIfReady(); }
      } else if(waSignup && !waSignup.sent){
        setWaButtonsBusy(false, '');
        showWaConnectError(PT('لم يكتمل تسجيل الدخول في نافذة ميتا. حاول مرة ثانية.'));
        waSignup = null;
      }
    }, {
      config_id: WA_COEXIST_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: extras
    });
  }
  document.getElementById('connectWaNewBtn').addEventListener('click', function(){ startWaSignup('cloud'); });
  document.getElementById('connectWaAppBtn').addEventListener('click', function(){ startWaSignup('coexistence'); });

  /* ---------- ربط متجر شوبيفاي ---------- */
  async function loadShopifyStatus(){
    const statusBox = document.getElementById('shopifyStatus');
    const form = document.getElementById('shopifyConnectForm');
    const nonOwnerHint = document.getElementById('shopifyHelperNonOwner');
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    if(!myClient){ return; }
    const { data } = await supabaseClient
      .from('client_shopify_credentials')
      .select('shop_domain, created_at')
      .eq('client_id', myClient.id)
      .maybeSingle();
    const addonLocked = myPlan && !myPlan.store_integration_included && !myClient.zid_integration_enabled;
    if(data){
      const dateStr = data.created_at ? new Date(data.created_at).toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge shopify-connected">' + PT('✅ متصل') + (data.shop_domain ? ' — ' + escapeHtml(data.shop_domain) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">' + PT('تم الربط بتاريخ') + ' ' + dateStr + '</div>' : '');
      form.style.display = 'none';
    } else if(addonLocked){
      statusBox.innerHTML = '<span class="status-badge shopify-disconnected">⚪ ' + PT('غير متصل بعد') + '</span>' + (isOwner ? storeAddonLockedHtml('shopify') : '');
      form.style.display = 'none';
      bindStoreAddonSupportBtn('shopify');
    } else {
      statusBox.innerHTML = '<span class="status-badge shopify-disconnected">⚪ ' + PT('غير متصل بعد') + '</span>';
      form.style.display = isOwner ? 'flex' : 'none';
    }
  }
  document.getElementById('connectShopifyBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const btn = this;
    const errBox = document.getElementById('shopifyConnectError');
    errBox.style.display = 'none';
    const shopDomain = document.getElementById('shopifyDomain').value.trim();
    const accessToken = document.getElementById('shopifyAccessToken').value.trim();
    if(!shopDomain || !accessToken){
      errBox.textContent = PT('عبّي نطاق المتجر والتوكن كاملة.');
      errBox.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = PT('جاري الربط...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/connect-shopify-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ client_id: myClient.id, shop_domain: shopDomain, access_token: accessToken })
      });
      const json = await res.json();
      if(!res.ok || json.error){
        btn.disabled = false; btn.textContent = PT('ربط مع شوبيفاي');
        errBox.textContent = json.message || PT('تعذّر الربط، تأكد من صحة البيانات.');
        errBox.style.display = 'block';
        return;
      }
      await loadShopifyStatus();
    } catch(e){
      btn.disabled = false; btn.textContent = PT('ربط مع شوبيفاي');
      errBox.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
      errBox.style.display = 'block';
    }
  });
  function renderTeam(){
    const list = document.getElementById('staffList');
    const addBtn = document.getElementById('addStaffBtn');
    const nonOwnerHint = document.getElementById('teamHelperNonOwner');
    addBtn.style.display = isOwner ? 'inline-block' : 'none';
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    if(staffList.length === 0){
      list.innerHTML = '<div class="conv-empty">' + PT('ما فيه موظفين مضافين بعد.') + '</div>';
      return;
    }
    list.innerHTML = '';
    staffList.forEach(function(s){
      const perms = s.permissions || {};
      const div = document.createElement('div');
      div.className = 'staff-item';
      var permsHtml = '';
      if(isOwner){
        permsHtml = '<div class="staff-perms">' + PERMISSION_DEFS.map(function(p){
          var checked = perms[p.key] ? ' checked' : '';
          return '<label class="staff-perm-chip"><input type="checkbox" class="staff-perm-cb" data-staff="' + s.id + '" data-perm="' + p.key + '"' + checked + '> ' + escapeHtml(PT(p.label)) + '</label>';
        }).join('') + '</div>';
      } else if(Object.keys(perms).some(function(k){ return perms[k]; })){
        permsHtml = '<div class="staff-perms staff-perms-readonly">' + PERMISSION_DEFS.filter(function(p){ return perms[p.key]; }).map(function(p){
          return '<span class="staff-perm-chip readonly">' + escapeHtml(PT(p.label)) + '</span>';
        }).join('') + '</div>';
      }
      div.innerHTML =
        '<div class="staff-item-row"><div><div class="sname">' + escapeHtml(s.full_name) + '</div><div class="semail">' + escapeHtml(s.email) + '</div></div>' +
        (isOwner ? '<button class="staff-remove-btn" data-id="' + s.id + '">' + PT('إزالة') + '</button>' : '') + '</div>' +
        permsHtml;
      list.appendChild(div);
    });
    if(isOwner){
      list.querySelectorAll('.staff-remove-btn').forEach(function(btn){
        btn.addEventListener('click', async function(){
          if(!confirm(PT('تأكيد إزالة هذا الموظف من الفريق؟'))){ return; }
          const id = btn.dataset.id;
          const { error } = await supabaseClient.from('client_staff').delete().eq('id', id);
          if(!error){
            staffList = staffList.filter(function(s){ return s.id !== id; });
            renderTeam();
          }
        });
      });
      list.querySelectorAll('.staff-perm-cb').forEach(function(cb){
        cb.addEventListener('change', async function(){
          const staffId = cb.dataset.staff;
          const permKey = cb.dataset.perm;
          const staffRow = staffList.find(function(s){ return s.id === staffId; });
          if(!staffRow) return;
          const newPerms = Object.assign({}, staffRow.permissions || {});
          newPerms[permKey] = cb.checked;
          cb.disabled = true;
          const { error } = await supabaseClient.from('client_staff').update({ permissions: newPerms }).eq('id', staffId);
          cb.disabled = false;
          if(error){
            cb.checked = !cb.checked;
            alert(PT('تعذّر حفظ الصلاحية، حاول مرة ثانية.'));
            return;
          }
          staffRow.permissions = newPerms;
        });
      });
    }
  }
  const CATEGORY_LABELS = {
    general_inquiry: { label: 'استفسار عام', color: '#5B6B67', bg: '#EEF2F1' },
    product_inquiry: { label: 'استفسار منتج', color: '#075E54', bg: 'rgba(37,211,102,.12)' },
    order_tracking:  { label: 'متابعة طلب', color: '#0B6E99', bg: '#E7F3FA' },
    complaint:       { label: 'شكوى', color: '#D14343', bg: '#FDEDEC' },
    return_refund:   { label: 'استرجاع', color: '#B8860B', bg: '#FCF3DC' },
    purchase_intent: { label: 'نية شراء', color: '#1DA851', bg: 'rgba(37,211,102,.18)' },
    other:           { label: 'أخرى', color: '#5B6B67', bg: '#EEF2F1' }
  };
  function categoryBadgeHtml(category){
    const info = CATEGORY_LABELS[category];
    if(!info){ return ''; }
    return '<span class="cat-badge" style="background:' + info.bg + '; color:' + info.color + ';">' + PT(info.label) + '</span>';
  }
  function renderConvList(){
    const list = document.getElementById('convList');
    let phones = Object.keys(conversations).sort(function(a,b){
      return new Date(conversations[b].lastAt) - new Date(conversations[a].lastAt);
    });
    if(filterMineOnly){
      phones = phones.filter(function(p){ return conversations[p].assignedTo === myUserId; });
    }
    if(phones.length === 0){
      list.innerHTML = '<div class="conv-empty">' + (filterMineOnly ? PT('ما فيه محادثات معيّنة لك حالياً.') : PT('ما فيه محادثات بعد. أول ما يراسل عميل بوتك، تظهر المحادثة هنا.')) + '</div>';
      return;
    }
    list.innerHTML = '';
    phones.forEach(function(phone){
      const conv = conversations[phone];
      const lastMsg = conv.messages[conv.messages.length - 1];
      const humanBadge = conv.botPaused ? '<span class="human-badge">' + PT('👤 يدوي') + '</span>' : '';
      const assigneeName = conv.assignedTo && staffMap[conv.assignedTo] ? staffMap[conv.assignedTo] : null;
      const assigneeBadge = assigneeName ? '<span class="assignee-badge">🏷️ ' + escapeHtml(assigneeName) + '</span>' : '';
      const div = document.createElement('div');
      div.className = 'conv-item' + (phone === activePhone ? ' active' : '');
           div.innerHTML =
        '<div class="cname">' + escapeHtml(displayConvName(conv, phone)) + categoryBadgeHtml(conv.category) + '</div>' +
        '<div class="cphone">' + escapeHtml(displayPhone(phone)) + '</div>' +
        '<div class="cpreview">' + escapeHtml(lastMsg ? lastMsg.text : '') + '</div>';
      div.addEventListener('click', function(){
        activePhone = phone;
        renderConvList();
        renderChat(phone);
      });
      list.appendChild(div);
    });
  }
  document.getElementById('filterMineOnly').addEventListener('change', function(){
    filterMineOnly = this.checked;
    renderConvList();
  });
  function renderChat(phone){
    const conv = conversations[phone];
    const head = document.getElementById('chatHead');
    const body = document.getElementById('chatBody');
    const composerWrap = document.getElementById('composerWrap');
    const bar = document.getElementById('takeoverBar');
    const status = document.getElementById('takeoverStatus');
    const btn = document.getElementById('takeoverBtn');
    const assignSelect = document.getElementById('assignSelect');
    head.style.display = 'block';
    head.textContent = displayConvName(conv, phone) + ' — ' + displayPhone(phone);
    composerWrap.style.display = 'block';
    bar.style.display = 'flex';
    if(conv.botPaused){
      bar.classList.add('paused');
      status.textContent = PT('🔴 الرد يدوي الآن');
      btn.textContent = PT('إرجاع الرد للبوت تلقائياً');
      btn.className = 'takeover-btn to-resume';
    } else {
      bar.classList.remove('paused');
      status.textContent = PT('🤖 البوت يرد تلقائياً');
      btn.textContent = PT('تولّي الرد يدوياً');
      btn.className = 'takeover-btn to-pause';
    }
    assignSelect.innerHTML = '<option value="">' + PT('غير معيّن') + '</option>';
    Object.keys(staffMap).forEach(function(uid){
      const opt = document.createElement('option');
      opt.value = uid;
      opt.textContent = staffMap[uid];
      if(conv.assignedTo === uid){ opt.selected = true; }
      assignSelect.appendChild(opt);
    });
    if(!conv.assignedTo){ assignSelect.value = ''; }
    body.innerHTML = '';
    conv.messages.forEach(function(m){
      const b = document.createElement('div');
      b.className = 'bubble ' + m.dir;
      const time = new Date(m.at).toLocaleTimeString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { hour:'2-digit', minute:'2-digit' });
      b.innerHTML = escapeHtml(m.text) + '<span class="t">' + time + '</span>';
      body.appendChild(b);
    });
    body.scrollTop = body.scrollHeight;
  }
  document.getElementById('assignSelect').addEventListener('change', async function(){
    if(!activePhone || !myClient){ return; }
    const val = this.value || null;
    const { error } = await supabaseClient
      .from('whatsapp_conversation_state')
      .upsert({
        client_id: myClient.id,
        customer_phone: activePhone,
        assigned_to: val
      }, { onConflict: 'client_id,customer_phone' });
    if(error){
      alert(PT('تعذّر تحديث التعيين، حاول مرة ثانية.'));
      return;
    }
    conversations[activePhone].assignedTo = val;
    renderConvList();
  });
  document.getElementById('takeoverBtn').addEventListener('click', async function(){
    if(!activePhone || !myClient){ return; }
    const conv = conversations[activePhone];
    const newPaused = !conv.botPaused;
    const btn = document.getElementById('takeoverBtn');
    btn.disabled = true;
    const payload = {
      client_id: myClient.id,
      customer_phone: activePhone,
      bot_paused: newPaused,
      paused_at: newPaused ? new Date().toISOString() : null
    };
    if(newPaused && !conv.assignedTo){ payload.assigned_to = myUserId; }
    const { error } = await supabaseClient
      .from('whatsapp_conversation_state')
      .upsert(payload, { onConflict: 'client_id,customer_phone' });
    btn.disabled = false;
    if(error){
      alert(PT('تعذّر تحديث حالة المحادثة، حاول مرة ثانية.'));
      return;
    }
    conv.botPaused = newPaused;
    if(newPaused && !conv.assignedTo){ conv.assignedTo = myUserId; }
    renderChat(activePhone);
    renderConvList();
  });
  document.getElementById('sendBtn').addEventListener('click', async function(){
    const textarea = document.getElementById('replyText');
    const text = textarea.value.trim();
    const hint = document.getElementById('sendHint');
    if(!text || !activePhone || !myClient){ return; }
    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    hint.textContent = '';
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/send-whatsapp-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ client_id: myClient.id, customer_phone: activePhone, message: text })
      });
      const json = await res.json();
      if(!res.ok){
        hint.style.color = 'var(--danger)';
        hint.textContent = json.error || PT('تعذّر إرسال الرسالة.');
      } else {
        // إرسال رد يدوي معناه صاحب النشاط أو الموظف تولى المحادثة — نوقف رد البوت التلقائي ونعيّنها له تلقائياً
        conversations[activePhone].messages.push({ dir: 'out', text: text, at: new Date().toISOString() });
        conversations[activePhone].lastAt = new Date().toISOString();
        conversations[activePhone].botPaused = true;
        if(!conversations[activePhone].assignedTo){ conversations[activePhone].assignedTo = myUserId; }
        textarea.value = '';
        renderChat(activePhone);
        renderConvList();
        hint.style.color = 'var(--wa-green-dark)';
        hint.textContent = PT('✓ تم الإرسال');
      }
    } catch(e){
      hint.style.color = 'var(--danger)';
      hint.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
    }
    btn.disabled = false;
  });
  document.getElementById('saveSettingsBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const prompt = document.getElementById('settingPrompt').value.trim();
    const welcome = document.getElementById('settingWelcome').value.trim();
    const ownerPhoneRaw = document.getElementById('settingOwnerPhone').value.trim();
    const ownerPhoneError = document.getElementById('ownerPhoneError');
    // تحقق بسيط فقط (مو حظر صارم) — رقم جوال سعودي بأي صيغة شائعة: 05xxxxxxxx / 5xxxxxxxx / 9665xxxxxxxx / +9665xxxxxxxx
    const phoneLooksValid = ownerPhoneRaw === '' || /^(\+?966|0)?5\d{8}$/.test(ownerPhoneRaw.replace(/[\s-]/g, ''));
    if(!phoneLooksValid){
      ownerPhoneError.style.display = 'block';
      return;
    }
    ownerPhoneError.style.display = 'none';
    const webhookUrlRaw = document.getElementById('settingWebhookUrl').value.trim();
    const status = document.getElementById('saveStatus');
    const { error } = await supabaseClient
      .from('clients')
      .update({ system_prompt: prompt, welcome_message: welcome, owner_phone: ownerPhoneRaw || null, zapier_webhook_url: webhookUrlRaw || null })
      .eq('id', myClient.id);
    if(!error){
      status.classList.add('show');
      setTimeout(function(){ status.classList.remove('show'); }, 2000);
    }
  });
  // إخفاء رقم العميل عن الموظفين — يُحفظ فوراً عند التبديل (بدون انتظار زر "حفظ التعديلات")
  document.getElementById('hideCustomerPhoneToggle').addEventListener('change', async function(){
    if(!myClient || !isOwner){ return; }
    const checked = this.checked;
    const { error } = await supabaseClient
      .from('clients')
      .update({ hide_customer_phone_from_staff: checked })
      .eq('id', myClient.id);
    if(!error){
      myClient.hide_customer_phone_from_staff = checked;
      renderConvList();
      if(activePhone){ renderChat(activePhone); }
    } else {
      this.checked = !checked;
    }
  });
  /* ---------- team management (owner only) ---------- */
  const newStaffModal = document.getElementById('newStaffModal');
  document.getElementById('addStaffBtn').addEventListener('click', function(){
    document.getElementById('staffFullName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('newStaffError').style.display = 'none';
    document.querySelectorAll('.invite-perm-cb').forEach(function(cb){ cb.checked = false; });
    newStaffModal.classList.add('show');
  });
  document.getElementById('newStaffCancelBtn').addEventListener('click', function(){
    newStaffModal.classList.remove('show');
  });
  newStaffModal.addEventListener('click', function(e){
    if(e.target === newStaffModal){ newStaffModal.classList.remove('show'); }
  });
  document.getElementById('newStaffConfirmBtn').addEventListener('click', async function(){
    const fullName = document.getElementById('staffFullName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const errBox = document.getElementById('newStaffError');
    errBox.style.display = 'none';
    if(!fullName || !email){
      errBox.textContent = PT('الرجاء تعبئة الاسم والبريد الإلكتروني.');
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    const invitePermissions = {};
    document.querySelectorAll('.invite-perm-cb').forEach(function(cb){ invitePermissions[cb.dataset.perm] = cb.checked; });
    const btn = document.getElementById('newStaffConfirmBtn');
    btn.disabled = true; btn.textContent = PT('جاري الإرسال...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/invite-client-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ client_id: myClient.id, email: email, full_name: fullName, permissions: invitePermissions })
      });
      const json = await res.json();
      btn.disabled = false; btn.textContent = PT('إرسال الدعوة');
      if(!res.ok){
        errBox.textContent = json.error || PT('تعذّر إرسال الدعوة.');
        errBox.style.display = 'block';
        return;
      }
      newStaffModal.classList.remove('show');
      alert(PT('تم إرسال دعوة للموظف عبر البريد الإلكتروني.'));
      const { data: staffRows } = await supabaseClient
        .from('client_staff')
        .select('id, user_id, full_name, email, permissions')
        .eq('client_id', myClient.id);
      staffList = staffRows || [];
      staffMap = {};
      staffMap[myClient.user_id] = PT('صاحب الحساب');
      staffList.forEach(function(s){ if(s.user_id){ staffMap[s.user_id] = s.full_name; } });
      renderTeam();
    } catch(e){
      btn.disabled = false; btn.textContent = PT('إرسال الدعوة');
      errBox.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
      errBox.style.display = 'block';
    }
  });
  /* ---------- analytics (client side) ---------- */
  function renderAnalytics(){
    document.getElementById('analyticsTotalMsgs').textContent = allMessages.length;
    // متوسط زمن الرد — نحسبه فقط من الصفوف اللي فيها وقت استلام مسجل (received_at) ورد فعلي من البوت
    const responseTimes = [];
    allMessages.forEach(function(m){
      if(m.received_at && m.outbound_message && m.inbound_message){
        const diffSec = (new Date(m.created_at) - new Date(m.received_at)) / 1000;
        if(diffSec >= 0 && diffSec < 3600){ responseTimes.push(diffSec); }
      }
    });
    const avgEl = document.getElementById('analyticsAvgResponse');
    const avgHint = document.getElementById('analyticsAvgResponseHint');
    if(responseTimes.length === 0){
      avgEl.textContent = '–';
      avgHint.textContent = PT('بيانات زمن الرد بتظهر تدريجياً مع الرسائل الجديدة.');
    } else {
      const avgSec = responseTimes.reduce(function(a,b){ return a+b; }, 0) / responseTimes.length;
      if(avgSec < 60){
        avgEl.textContent = Math.round(avgSec) + (window.PORTAL_LANG === 'en' ? 's' : ' ث');
      } else {
        const mins = Math.floor(avgSec / 60);
        const secs = Math.round(avgSec % 60);
        avgEl.textContent = (window.PORTAL_LANG === 'en') ? (mins + 'm ' + secs + 's') : (mins + 'د ' + secs + 'ث');
      }
      avgHint.textContent = (window.PORTAL_LANG === 'en') ? ('Based on ' + responseTimes.length + ' automated replies.') : ('بناءً على ' + responseTimes.length + ' رد آلي.');
    }
    // آخر 7 أيام
    const chart = document.getElementById('analyticsBarChart');
    const days = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const counts = days.map(function(d){
      return allMessages.filter(function(m){
        const md = new Date(m.created_at);
        return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth() && md.getDate() === d.getDate();
      }).length;
    });
    const realMax = Math.max.apply(null, counts);
    // إصلاح: بدل رسم 7 أعمدة شبه فارغة (4% ارتفاع لكل يوم) بلا أي توضيح
    // لما ما توجد رسائل إطلاقاً هذا الأسبوع، نعرض حالة فارغة مفهومة.
    // (بدون return مبكر — بقية الدالة تكمل تطبيع أقسام التحليلات الأخرى تحتها)
    if(realMax === 0){
      chart.innerHTML = '<div class="conv-empty" style="width:100%; text-align:center;">' +
        PT('لسه ما وصلت رسائل هذا الأسبوع. بمجرد ما توصل رسائل، يبدأ الرسم البياني يتحرك تلقائياً.') +
        '</div>';
    } else {
    const maxCount = Math.max.apply(null, counts.concat([1]));
    chart.innerHTML = '';
    days.forEach(function(d, i){
      const heightPct = Math.max(4, Math.round((counts[i] / maxCount) * 100));
      const col = document.createElement('div');
      col.className = 'bar-col';
      const label = d.toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { weekday: 'short' });
      col.innerHTML =
        '<span class="bcount">' + counts[i] + '</span>' +
        '<div class="bar" style="height:' + heightPct + '%;"></div>' +
        '<span class="blabel">' + label + '</span>';
      chart.appendChild(col);
    });
    }
    // أكثر الأسئلة تكراراً — تجميع نصوص الرسائل الواردة المتطابقة (بعد تنضيف بسيط)
    const freq = {};
    allMessages.forEach(function(m){
      if(!m.inbound_message){ return; }
      const norm = m.inbound_message.trim().replace(/\s+/g, ' ');
      if(!norm){ return; }
      freq[norm] = (freq[norm] || 0) + 1;
    });
    const sorted = Object.keys(freq).sort(function(a,b){ return freq[b] - freq[a]; }).slice(0, 8);
    const qList = document.getElementById('analyticsTopQuestions');
    if(sorted.length === 0){
      qList.innerHTML = '<div class="conv-empty">' + PT('ما فيه أسئلة كافية بعد لعرض الأكثر تكراراً — تظهر تلقائياً بمجرد وصول عدد أكبر من الرسائل.') + '</div>';
    } else {
            qList.innerHTML = '';
      sorted.forEach(function(q){
        const div = document.createElement('div');
        div.className = 'qa-item';
        div.innerHTML = '<span class="qtext">' + escapeHtml(q) + '</span><span class="qcount">' + freq[q] + '×</span>';
        qList.appendChild(div);
      });
    }
    const catCounts = {};
    allMessages.forEach(function(m){
      if(m.category){ catCounts[m.category] = (catCounts[m.category] || 0) + 1; }
    });
    const catWrap = document.getElementById('analyticsCategoryBreakdown');
    const catKeys = Object.keys(catCounts).sort(function(a,b){ return catCounts[b] - catCounts[a]; });
    if(catKeys.length === 0){
      catWrap.innerHTML = '<div class="conv-empty">' + PT('ما فيه تصنيف كافٍ للمحادثات بعد — تُحسب الفئات تلقائياً كل ما تصنّفت محادثات جديدة.') + '</div>';
    } else {
      catWrap.innerHTML = '';
      catKeys.forEach(function(key){
        const info = CATEGORY_LABELS[key] || CATEGORY_LABELS.other;
        const div = document.createElement('div');
        div.className = 'qa-item';
        div.innerHTML = '<span class="qtext">' + PT(info.label) + '</span><span class="qcount" style="background:' + info.color + ';">' + catCounts[key] + '</span>';
        catWrap.appendChild(div);
      });
    }
  }
  async function loadStoreAnalytics(){
    const wrap = document.getElementById('analyticsStoreWrap');
    const { data: events, error } = await supabaseClient
      .from('store_order_events')
      .select('event_type, status')
      .eq('client_id', myClient.id);
    if(error || !events || events.length === 0){
      wrap.innerHTML = '<div class="conv-empty">' + PT('لا يوجد متجر مربوط بعد، أو ما وصل أي طلب لسه. اربط متجرك من «قنوات الربط» — وبمجرد وصول أول طلب، تظهر هنا مؤشرات الطلبات والسلات المستردة تلقائياً.') + '</div>';
      return;
    }
    const ordersConfirmed = events.filter(function(e){ return e.event_type === 'order_create' && (e.status === 'confirmation_sent' || e.status === 'confirmed'); }).length;
    const cartsDetected = events.filter(function(e){ return e.event_type === 'abandoned_cart'; }).length;
    const cartsRecovered = events.filter(function(e){ return e.event_type === 'abandoned_cart' && e.status === 'recovered'; }).length;
    const recoveryRate = cartsDetected > 0 ? Math.round((cartsRecovered / cartsDetected) * 100) : 0;
    wrap.innerHTML =
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-teal-dark);">' + ordersConfirmed + '</div><div class="helper-text">' + PT('طلبات تم تأكيدها تلقائياً') + '</div></div>' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-teal-dark);">' + cartsDetected + '</div><div class="helper-text">' + PT('سلة متروكة تم رصدها') + '</div></div>' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-green-dark);">' + cartsRecovered + '</div><div class="helper-text">' + PT('سلة تم استردادها') + '</div></div>' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-green-dark);">' + recoveryRate + '%</div><div class="helper-text">' + PT('نسبة استرداد السلال') + '</div></div>' +
      '</div>';
  }
  /* ---------- ROI dashboard (قيمة البوت) ---------- */
  async function renderRoiDashboard(){
    if(!myClient){ return; }
    const botReplies = allMessages.filter(function(m){ return m.outbound_message; }).length;
    const minutesSaved = botReplies * 3;
    const hoursSaved = minutesSaved / 60;
    const hoursEl = document.getElementById('roiHoursSaved');
    const hoursSubEl = document.getElementById('roiHoursSavedSub');
    if(hoursEl){
      hoursEl.textContent = hoursSaved >= 10 ? Math.round(hoursSaved).toLocaleString('en-US') : hoursSaved.toFixed(1);
      hoursSubEl.textContent = (window.PORTAL_LANG === 'en')
        ? (botReplies > 0 ? ('Based on ' + botReplies.toLocaleString('en-US') + ' automated replies, saving about 3 minutes per manual reply') : 'Will appear gradually as the bot starts replying')
        : (botReplies > 0 ? ('بناءً على ' + botReplies.toLocaleString('en-US') + ' رد آلي، بمعدّل 3 دقائق تقريباً لكل رد يدوي') : 'بتظهر تدريجياً مع أول ردود البوت');
    }
    const sarEl = document.getElementById('roiSarRecovered');
    const sarSubEl = document.getElementById('roiSarRecoveredSub');
    if(sarEl){
      const { data: events, error } = await supabaseClient
        .from('store_order_events')
        .select('status, order_total, resolved_at, created_at')
        .eq('client_id', myClient.id)
        .eq('event_type', 'abandoned_cart')
        .eq('status', 'recovered');
      if(error || !events || events.length === 0){
        sarEl.textContent = '0';
        sarSubEl.textContent = PT('لا توجد سلات مستردة بعد');
      } else {
        const now = new Date();
        let monthTotal = 0, allTimeTotal = 0;
        events.forEach(function(e){
          const amount = parseFloat(e.order_total) || 0;
          allTimeTotal += amount;
          const refDate = new Date(e.resolved_at || e.created_at);
          if(refDate.getFullYear() === now.getFullYear() && refDate.getMonth() === now.getMonth()){
            monthTotal += amount;
          }
        });
        sarEl.textContent = Math.round(monthTotal).toLocaleString('en-US');
        sarSubEl.textContent = (window.PORTAL_LANG === 'en')
          ? ('Total all-time: ' + Math.round(allTimeTotal).toLocaleString('en-US') + ' SAR from ' + events.length + ' recovered cart(s)')
          : ('إجمالي كل الفترة: ' + Math.round(allTimeTotal).toLocaleString('en-US') + ' ريال من ' + events.length + ' سلة مستردة');
      }
    }
    const hotEl = document.getElementById('roiHotLeads');
    const hotItem = document.getElementById('roiHotLeadsItem');
    if(hotEl){
      const { data: leads } = await supabaseClient
        .from('hot_lead_alerts')
        .select('id, created_at')
        .eq('client_id', myClient.id);
      if(leads && leads.length > 0){
        const now2 = new Date();
        const thisMonthLeads = leads.filter(function(l){
          const d = new Date(l.created_at);
          return d.getFullYear() === now2.getFullYear() && d.getMonth() === now2.getMonth();
        }).length;
        if(thisMonthLeads > 0){
          hotEl.textContent = thisMonthLeads.toLocaleString('en-US');
          hotItem.style.display = 'block';
        }
      }
    }
  }
  /* ---------- محاكي شخصية البوت (bot personality simulator) ---------- */
  function simBubbleHtml(text, dir){
    const time = new Date().toLocaleTimeString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { hour:'2-digit', minute:'2-digit' });
    return '<div class="bubble ' + dir + '">' + escapeHtml(text) + '<span class="t">' + time + '</span></div>';
  }
  function resetSimChat(){
    simHistory = [];
    const body = document.getElementById('simChatBody');
    if(!body){ return; }
    const welcomeField = document.getElementById('settingWelcome');
    const welcome = (welcomeField && welcomeField.value ? welcomeField.value.trim() : '') || ((window.PORTAL_LANG === 'en') ? 'Welcome! How can I help you?' : 'أهلاً بك! كيف أقدر أساعدك؟');
    body.innerHTML = simBubbleHtml(welcome, 'in');
    const statusEl = document.getElementById('simStatus');
    if(statusEl){ statusEl.textContent = ''; }
  }
  function initSimChat(){
    if(!document.getElementById('simChatBody')){ return; }
    resetSimChat();
  }
  async function sendSimMessage(){
    const textEl = document.getElementById('simText');
    const text = textEl.value.trim();
    const statusEl = document.getElementById('simStatus');
    statusEl.textContent = '';
    if(!text || !myClient){ return; }
    const body = document.getElementById('simChatBody');
    body.insertAdjacentHTML('beforeend', simBubbleHtml(text, 'out'));
    body.scrollTop = body.scrollHeight;
    textEl.value = '';
    const btn = document.getElementById('simSendBtn');
    btn.disabled = true; btn.textContent = '...';
    const typingId = 'simTyping_' + Date.now();
    body.insertAdjacentHTML('beforeend', '<div class="bubble in" id="' + typingId + '" style="opacity:.6;">' + PT('يكتب الآن...') + '</div>');
    body.scrollTop = body.scrollHeight;
    try{
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session.access_token;
      const res = await fetch(FUNCTIONS_BASE + '/simulate-bot-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          client_id: myClient.id,
          system_prompt: document.getElementById('settingPrompt').value,
          welcome_message: document.getElementById('settingWelcome').value,
          history: simHistory,
          user_message: text
        })
      });
      const json = await res.json();
      const typingEl = document.getElementById(typingId);
      if(typingEl){ typingEl.remove(); }
      btn.disabled = false; btn.textContent = PT('إرسال');
      if(!res.ok){
        statusEl.textContent = json.error || PT('تعذّر توليد الرد، حاول مرة ثانية.');
        return;
      }
      simHistory.push({ role: 'user', text: text });
      simHistory.push({ role: 'assistant', text: json.reply });
      body.insertAdjacentHTML('beforeend', simBubbleHtml(json.reply, 'in'));
      body.scrollTop = body.scrollHeight;
    } catch(e){
      const typingEl = document.getElementById(typingId);
      if(typingEl){ typingEl.remove(); }
      btn.disabled = false; btn.textContent = PT('إرسال');
      statusEl.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
    }
  }
  const simSendBtnEl = document.getElementById('simSendBtn');
  if(simSendBtnEl){ simSendBtnEl.addEventListener('click', sendSimMessage); }
  const simTextEl = document.getElementById('simText');
  if(simTextEl){
    simTextEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendSimMessage(); }
    });
  }
  const simResetBtnEl = document.getElementById('simResetBtn');
  if(simResetBtnEl){ simResetBtnEl.addEventListener('click', resetSimChat); }
  /* ---------- support tickets (client side) ---------- */
  async function loadTickets(){
    if(!myClient){ return; }
    const { data, error } = await supabaseClient
      .from('support_tickets')
      .select('id, subject, status, created_at, updated_at')
      .eq('client_id', myClient.id)
      .order('updated_at', { ascending: false });
    if(error){
      document.getElementById('ticketList').innerHTML = '<div class="conv-empty">' + PT('تعذّر تحميل التذاكر، حدّث الصفحة.') + '</div>';
      return;
    }
    myTickets = data || [];
    renderTicketList();
  }
  function renderTicketList(){
    const list = document.getElementById('ticketList');
    if(myTickets.length === 0){
      list.innerHTML = '<div class="conv-empty">' + PT('ما فيه تذاكر دعم بعد. اضغط "فتح تذكرة جديدة" لإرسال استفسارك.') + '</div>';
      return;
    }
    list.innerHTML = '';
    myTickets.forEach(function(t){
      const div = document.createElement('div');
      div.className = 'ticket-item' + (t.id === activeTicketId ? ' active' : '');
      const dateStr = new Date(t.updated_at).toLocaleDateString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { month:'short', day:'numeric' });
      div.innerHTML =
        '<div class="tsubject">' + escapeHtml(t.subject) + '</div>' +
        '<div class="tmeta"><span class="status-badge ' + t.status + '">' + PT(ticketStatusLabels[t.status]) + '</span><span class="tdate">' + dateStr + '</span></div>';
      div.addEventListener('click', function(){
        activeTicketId = t.id;
        renderTicketList();
        openTicketThread(t.id);
      });
      list.appendChild(div);
    });
  }
  async function openTicketThread(ticketId){
    const head = document.getElementById('ticketThreadHead');
    const body = document.getElementById('ticketBody');
    const composerWrap = document.getElementById('ticketComposerWrap');
    const hint = document.getElementById('ticketSendHint');
    const ticket = myTickets.find(function(t){ return t.id === ticketId; });
    if(!ticket){ return; }
    head.style.display = 'flex';
    document.getElementById('ticketThreadSubject').textContent = ticket.subject;
    const statusEl = document.getElementById('ticketThreadStatus');
    statusEl.className = 'status-badge ' + ticket.status;
    statusEl.textContent = PT(ticketStatusLabels[ticket.status]);
    composerWrap.style.display = 'block';
    hint.style.color = 'var(--muted)';
    hint.textContent = ticket.status === 'closed' ? PT('ملاحظة: الرد سيعيد فتح هذي التذكرة تلقائياً.') : '';
    body.innerHTML = '<div class="chat-placeholder">' + PT('جاري التحميل...') + '</div>';
    const { data: msgs } = await supabaseClient
      .from('support_ticket_messages')
      .select('sender_type, message, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    body.innerHTML = '';
    (msgs || []).forEach(function(m){
      const b = document.createElement('div');
      b.className = 'bubble ' + (m.sender_type === 'client' ? 'out' : 'in');
      const time = new Date(m.created_at).toLocaleString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      b.innerHTML = escapeHtml(m.message) + '<span class="t">' + time + '</span>';
      body.appendChild(b);
    });
    body.scrollTop = body.scrollHeight;
  }
  document.getElementById('ticketSendBtn').addEventListener('click', async function(){
    const textarea = document.getElementById('ticketReplyText');
    const text = textarea.value.trim();
    const hint = document.getElementById('ticketSendHint');
    if(!text || !activeTicketId){ return; }
    const btn = document.getElementById('ticketSendBtn');
    btn.disabled = true;
    const { error } = await supabaseClient
      .from('support_ticket_messages')
      .insert({ ticket_id: activeTicketId, sender_type: 'client', message: text });
    btn.disabled = false;
    if(error){
      hint.style.color = 'var(--danger)';
      hint.textContent = PT('تعذّر إرسال الرد، حاول مرة ثانية.');
      return;
    }
    textarea.value = '';
    await loadTickets();
    await openTicketThread(activeTicketId);
    hint.style.color = 'var(--wa-green-dark)';
    hint.textContent = PT('✓ تم الإرسال');
  });
  const newTicketModal = document.getElementById('newTicketModal');
  document.getElementById('newTicketBtn').addEventListener('click', function(){
    document.getElementById('newTicketSubject').value = '';
    document.getElementById('newTicketMessage').value = '';
    document.getElementById('newTicketError').style.display = 'none';
    newTicketModal.classList.add('show');
  });
  document.getElementById('newTicketCancelBtn').addEventListener('click', function(){
    newTicketModal.classList.remove('show');
  });
  newTicketModal.addEventListener('click', function(e){
    if(e.target === newTicketModal){ newTicketModal.classList.remove('show'); }
  });
  document.getElementById('newTicketConfirmBtn').addEventListener('click', async function(){
    const subject = document.getElementById('newTicketSubject').value.trim();
    const message = document.getElementById('newTicketMessage').value.trim();
    const errBox = document.getElementById('newTicketError');
    errBox.style.display = 'none';
    if(!subject || !message){
      errBox.textContent = PT('الرجاء تعبئة الموضوع وتفاصيل المشكلة.');
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    const btn = document.getElementById('newTicketConfirmBtn');
    btn.disabled = true; btn.textContent = PT('جاري الإرسال...');
    const { data: ticket, error: ticketErr } = await supabaseClient
      .from('support_tickets')
      .insert({ client_id: myClient.id, subject: subject })
      .select('id')
      .single();
    if(ticketErr || !ticket){
      errBox.textContent = PT('تعذّر إنشاء التذكرة، حاول مرة ثانية.');
      errBox.style.display = 'block';
      btn.disabled = false; btn.textContent = PT('إرسال');
      return;
    }
    await supabaseClient.from('support_ticket_messages').insert({ ticket_id: ticket.id, sender_type: 'client', message: message });
    btn.disabled = false; btn.textContent = PT('إرسال');
    newTicketModal.classList.remove('show');
    activeTicketId = ticket.id;
    await loadTickets();
    await openTicketThread(ticket.id);
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
    document.querySelector('.tab-btn[data-tab="support"]').classList.add('active');
    document.getElementById('panelSupport').classList.add('active');
    v2AfterTabChange('support');
  });
  /* ---------- broadcast campaigns (client side) ---------- */
  async function loadCampaigns(){
    if(!myClient){ return; }
    const { data, error } = await supabaseClient
      .from('broadcast_campaigns')
      .select('id, template_name, template_language, status, total_recipients, sent_count, failed_count, created_at')
      .eq('client_id', myClient.id)
      .order('created_at', { ascending: false });
    if(error){
      document.getElementById('campaignList').innerHTML = '<div class="conv-empty">' + PT('تعذّر تحميل الحملات، حدّث الصفحة.') + '</div>';
      return;
    }
    myCampaigns = data || [];
    renderCampaignList();
  }
  function renderCampaignList(){
    const list = document.getElementById('campaignList');
    if(myCampaigns.length === 0){
      list.innerHTML = '<div class="conv-empty">' + PT('ما فيه حملات بعد. اضغط "+ حملة جديدة" لإرسال أول رسالة جماعية.') + '</div>';
      return;
    }
    list.innerHTML = '';
    myCampaigns.forEach(function(c){
      const dateStr = new Date(c.created_at).toLocaleString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const div = document.createElement('div');
      div.className = 'campaign-card';
      div.innerHTML =
        '<div class="ctop"><span class="cname">' + escapeHtml(c.template_name) + '</span><span class="status-badge ' + c.status + '">' + PT(campaignStatusLabels[c.status]) + '</span></div>' +
        '<div class="cmeta">' +
          '<span>📅 ' + dateStr + '</span>' +
          '<span>👥 <b>' + c.total_recipients + '</b> ' + PT('مستلم') + '</span>' +
          '<span>✅ <b>' + c.sent_count + '</b> ' + PT('تم الإرسال') + '</span>' +
          '<span>❌ <b>' + c.failed_count + '</b> ' + PT('فشل') + '</span>' +
        '</div>';
      list.appendChild(div);
    });
  }
  const newBroadcastModal = document.getElementById('newBroadcastModal');
  document.getElementById('newBroadcastBtn').addEventListener('click', function(){
    document.getElementById('bcTemplateName').value = '';
    document.getElementById('bcTemplateLang').value = 'ar';
    document.getElementById('bcVariable1').value = '';
    document.getElementById('bcCustomNumbers').value = '';
    document.querySelector('input[name="bcRecipients"][value="all"]').checked = true;
    document.getElementById('bcCustomNumbers').style.display = 'none';
    document.getElementById('newBroadcastError').style.display = 'none';
    newBroadcastModal.classList.add('show');
  });
  document.getElementById('newBroadcastCancelBtn').addEventListener('click', function(){
    newBroadcastModal.classList.remove('show');
  });
  newBroadcastModal.addEventListener('click', function(e){
    if(e.target === newBroadcastModal){ newBroadcastModal.classList.remove('show'); }
  });
  document.querySelectorAll('input[name="bcRecipients"]').forEach(function(radio){
    radio.addEventListener('change', function(){
      document.getElementById('bcCustomNumbers').style.display = (this.value === 'custom') ? 'block' : 'none';
    });
  });
  document.getElementById('newBroadcastConfirmBtn').addEventListener('click', async function(){
    const templateName = document.getElementById('bcTemplateName').value.trim();
    const templateLang = document.getElementById('bcTemplateLang').value.trim() || 'ar';
    const variable1 = document.getElementById('bcVariable1').value.trim();
    const recipientsMode = document.querySelector('input[name="bcRecipients"]:checked').value;
    const errBox = document.getElementById('newBroadcastError');
    errBox.style.display = 'none';
    if(!templateName){
      errBox.textContent = PT('الرجاء كتابة اسم القالب المعتمد.');
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    let recipients = 'all';
    if(recipientsMode === 'custom'){
      const raw = document.getElementById('bcCustomNumbers').value.trim();
      recipients = raw.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });
      if(recipients.length === 0){
        errBox.textContent = PT('الرجاء كتابة رقم واحد على الأقل.');
        errBox.style.display = 'block';
        return;
      }
    }
    const btn = document.getElementById('newBroadcastConfirmBtn');
    btn.disabled = true; btn.textContent = PT('جاري الإرسال...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/send-whatsapp-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          client_id: myClient.id,
          template_name: templateName,
          template_language: templateLang,
          variable_1: variable1,
          recipients: recipients
        })
      });
      const json = await res.json();
      btn.disabled = false; btn.textContent = PT('إرسال الحملة');
      if(!res.ok){
        errBox.textContent = json.error || PT('تعذّر إرسال الحملة.');
        errBox.style.display = 'block';
        return;
      }
      newBroadcastModal.classList.remove('show');
      await loadCampaigns();
      alert((window.PORTAL_LANG === 'en')
        ? ('Campaign sent: ' + json.sent + ' succeeded, ' + json.failed + ' failed, out of ' + json.total + ' total.')
        : ('تم إرسال الحملة: ' + json.sent + ' نجح، ' + json.failed + ' فشل، من أصل ' + json.total + '.'));
    } catch(e){
      btn.disabled = false; btn.textContent = PT('إرسال الحملة');
      errBox.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
      errBox.style.display = 'block';
    }
  });
  /* ---------- قوالب الرسائل بالذكاء الاصطناعي ---------- */
  async function loadTemplates(){
    if(!myClient){ return; }
    document.getElementById('newTemplateBtn').style.display = isOwner ? 'inline-block' : 'none';
    const { data, error } = await supabaseClient
      .from('whatsapp_message_templates')
      .select('id, name, category, body_text, status, rejected_reason, created_at')
      .eq('client_id', myClient.id)
      .order('created_at', { ascending: false });
    if(error){
      document.getElementById('templateList').innerHTML = '<div class="conv-empty">' + PT('تعذّر تحميل القوالب، حدّث الصفحة.') + '</div>';
      return;
    }
    myTemplates = data || [];
    renderTemplateList();
  }
  const templateCategoryLabels = { MARKETING: 'تسويقي', UTILITY: 'تنبيهي' };
  function renderTemplateList(){
    const list = document.getElementById('templateList');
    if(myTemplates.length === 0){
      list.innerHTML = '<div class="conv-empty">' + PT('ما فيه قوالب بعد. اضغط "+ قالب جديد" لإنشاء أول قالب بمساعدة الذكاء الاصطناعي.') + '</div>';
      return;
    }
    list.innerHTML = '';
    myTemplates.forEach(function(t){
      const dateStr = new Date(t.created_at).toLocaleString((window.PORTAL_LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn'), { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const div = document.createElement('div');
      div.className = 'campaign-card';
      div.innerHTML =
        '<div class="ctop"><span class="cname">' + escapeHtml(t.name) + '</span><span class="status-badge ' + t.status + '">' + PT(templateStatusLabels[t.status]) + '</span></div>' +
        '<div class="cmeta">' +
          '<span>🏷️ ' + PT(templateCategoryLabels[t.category] || t.category) + '</span>' +
          '<span>📅 ' + dateStr + '</span>' +
        '</div>' +
        '<div class="helper-text" style="margin-top:8px; white-space:pre-wrap;">' + escapeHtml(t.body_text) + '</div>' +
        (t.status === 'rejected' && t.rejected_reason ? '<div class="helper-text" style="margin-top:6px; color:var(--danger);">' + PT('سبب الرفض من واتساب') + ': ' + escapeHtml(t.rejected_reason) + '</div>' : '');
      list.appendChild(div);
    });
  }
  const newTemplateModal = document.getElementById('newTemplateModal');
  document.getElementById('newTemplateBtn').addEventListener('click', function(){
    document.getElementById('tplRequestText').value = '';
    document.getElementById('newTemplateError').style.display = 'none';
    document.getElementById('tplStep1').style.display = 'block';
    document.getElementById('tplStep2').style.display = 'none';
    document.getElementById('tplGenerateBtn').disabled = false;
    document.getElementById('tplGenerateBtn').textContent = PT('توليد بالذكاء الاصطناعي');
    currentDraftTemplateId = null;
    newTemplateModal.classList.add('show');
  });
  document.getElementById('newTemplateCancelBtn').addEventListener('click', function(){
    newTemplateModal.classList.remove('show');
  });
  newTemplateModal.addEventListener('click', function(e){
    if(e.target === newTemplateModal){ newTemplateModal.classList.remove('show'); }
  });
  document.getElementById('tplBackBtn').addEventListener('click', function(){
    document.getElementById('tplStep1').style.display = 'block';
    document.getElementById('tplStep2').style.display = 'none';
  });
  document.getElementById('tplGenerateBtn').addEventListener('click', async function(){
    const requestText = document.getElementById('tplRequestText').value.trim();
    const errBox = document.getElementById('newTemplateError');
    errBox.style.display = 'none';
    if(!requestText){
      errBox.textContent = PT('الرجاء كتابة وصف للرسالة اللي تبيها.');
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    const btn = this;
    btn.disabled = true; btn.textContent = PT('جاري التوليد...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/generate-whatsapp-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ client_id: myClient.id, request_text: requestText })
      });
      const json = await res.json();
      btn.disabled = false; btn.textContent = PT('توليد بالذكاء الاصطناعي');
      if(!res.ok){
        errBox.textContent = json.error || PT('تعذّر توليد القالب، حاول صياغة الطلب بشكل مختلف.');
        errBox.style.display = 'block';
        return;
      }
      const tpl = json.template;
      currentDraftTemplateId = tpl.id;
      document.getElementById('tplName').value = tpl.name;
      document.getElementById('tplCategory').value = tpl.category;
      document.getElementById('tplBodyText').value = tpl.body_text;
      const hasVar = Array.isArray(tpl.variable_examples) && tpl.variable_examples.length > 0;
      document.getElementById('tplVariableExample').value = hasVar ? tpl.variable_examples[0] : '';
      document.getElementById('tplVariableField').style.display = hasVar ? 'block' : 'none';
      document.getElementById('tplStep1').style.display = 'none';
      document.getElementById('tplStep2').style.display = 'block';
    } catch(e){
      btn.disabled = false; btn.textContent = PT('توليد بالذكاء الاصطناعي');
      errBox.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
      errBox.style.display = 'block';
    }
  });
  document.getElementById('tplSubmitBtn').addEventListener('click', async function(){
    const errBox = document.getElementById('newTemplateError');
    errBox.style.display = 'none';
    if(!currentDraftTemplateId || !myClient){ return; }
    const name = document.getElementById('tplName').value.trim();
    const category = document.getElementById('tplCategory').value;
    const bodyText = document.getElementById('tplBodyText').value.trim();
    const variableExample = document.getElementById('tplVariableExample').value.trim();
    if(!name || !bodyText){
      errBox.textContent = PT('الرجاء تعبئة اسم القالب ونص الرسالة.');
      errBox.style.display = 'block';
      return;
    }
    if(bodyText.indexOf('{{1}}') !== -1 && !variableExample){
      errBox.textContent = PT('الرسالة فيها {{1}} — لازم تكتب مثال على القيمة اللي بتحل محله (مطلوب من واتساب للمراجعة).');
      errBox.style.display = 'block';
      return;
    }
    const btn = this;
    btn.disabled = true; btn.textContent = PT('جاري الإرسال...');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/submit-whatsapp-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          client_id: myClient.id,
          template_id: currentDraftTemplateId,
          name: name,
          category: category,
          body_text: bodyText,
          variable_example: variableExample || null,
          language: 'ar'
        })
      });
      const json = await res.json();
      btn.disabled = false; btn.textContent = PT('إرسال للمراجعة في واتساب');
      if(!res.ok){
        errBox.textContent = json.error || PT('تعذّر إرسال القالب لواتساب.');
        errBox.style.display = 'block';
        return;
      }
      newTemplateModal.classList.remove('show');
      await loadTemplates();
      alert(PT('تم إرسال القالب لمراجعة واتساب. راح تشوف حالته تتحدث تلقائياً هنا بمجرد ما ميتا يراجعه.'));
    } catch(e){
      btn.disabled = false; btn.textContent = PT('إرسال للمراجعة في واتساب');
      errBox.textContent = PT('حصل خطأ بالاتصال، حاول مرة ثانية.');
      errBox.style.display = 'block';
    }
  });
  /* ---------- رصيد الرسائل الإضافي (Top-up) ---------- */
  async function loadTopupInfo(){
    const nonOwnerHint = document.getElementById('topupHelperNonOwner');
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    if(!myClient){ return; }
    const balance = myClient.extra_message_credits || 0;
    document.getElementById('topupCurrentBalance').textContent = (window.PORTAL_LANG === 'en')
      ? ('Your current extra credit: ' + balance + ' message(s).')
      : ('رصيدك الإضافي الحالي: ' + balance + ' رسالة.');
    const { data: pending } = await supabaseClient
      .from('message_credit_topup_requests')
      .select('credits, price_sar, status, requested_at')
      .eq('client_id', myClient.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });
    const pendingBox = document.getElementById('topupPendingNotice');
    if(pending && pending.length > 0){
      pendingBox.innerHTML = pending.map(function(r){
        return (window.PORTAL_LANG === 'en')
          ? ('<div class="cost-note">⏳ Pending request: ' + r.credits + ' message(s) for ' + r.price_sar + ' SAR — awaiting payment confirmation.</div>')
          : ('<div class="cost-note">⏳ طلب معلّق: ' + r.credits + ' رسالة مقابل ' + r.price_sar + ' ريال — بانتظار تأكيد الدفع.</div>');
      }).join('');
    } else {
      pendingBox.innerHTML = '';
    }
    if(!isOwner){
      document.getElementById('topupPackages').innerHTML = '';
      return;
    }
    const { data: packages } = await supabaseClient
      .from('message_topup_packages')
      .select('id, credits, price_sar')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    const box = document.getElementById('topupPackages');
    if(!packages || packages.length === 0){
      box.innerHTML = '';
      return;
    }
    box.innerHTML = '';
    packages.forEach(function(p){
      const row = document.createElement('div');
      row.className = 'topup-row';
      row.innerHTML = (window.PORTAL_LANG === 'en')
        ? ('<span class="topup-info">' + p.credits.toLocaleString('en-US') + ' extra messages — <b>' + p.price_sar + ' SAR</b> (one-time)</span>' +
           '<button class="topup-request-btn" data-id="' + p.id + '" data-credits="' + p.credits + '" data-price="' + p.price_sar + '">📞 Contact Us</button>')
        : ('<span class="topup-info">' + p.credits.toLocaleString('en-US') + ' رسالة إضافية — <b>' + p.price_sar + ' ريال</b> (لمرة واحدة)</span>' +
           '<button class="topup-request-btn" data-id="' + p.id + '" data-credits="' + p.credits + '" data-price="' + p.price_sar + '">📞 تواصل معنا</button>');
      box.appendChild(row);
    });
    document.querySelectorAll('.topup-request-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(!myClient || !isOwner){ return; }
        document.querySelector('.tab-btn[data-tab="support"]').click();
      });
    });
  }
