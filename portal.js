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
      html += '<button type="button" class="template-chip" data-key="' + key + '">' + t.emoji + ' ' + escapeHtml(t.label) + '</button>';
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
      var ok = window.confirm('بيستبدل هذا القالب تعليمات البوت الحالية بالكامل. متأكد تبي تكمل؟');
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
      card.innerHTML = '<div class="setup-complete-banner">🎉 اكتمل إعداد بوتك بالكامل! جاهز يشتغل بكامل طاقته.<button type="button" id="setupDismissBtn">✕</button></div>';
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
      '<div class="setup-progress-head"><div class="setup-progress-title">بوتك جاهز ' + doneCount + '/' + SETUP_STEPS.length + '</div></div>' +
      '<div class="setup-progress-track"><div class="setup-progress-fill" style="width:' + pct + '%;"></div></div>' +
      '<div class="setup-progress-list" id="setupProgressList"></div>';

    var list = document.getElementById('setupProgressList');
    SETUP_STEPS.forEach(function(step){
      var isDone = done[step.key];
      var el = document.createElement('span');
      el.className = 'setup-step' + (isDone ? ' done' : '');
      el.innerHTML = '<span class="dot">' + (isDone ? '✓' : '') + '</span>' + escapeHtml(step.label);
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
        setTimeout(function(){ alert('✅ تم ربط متجر زد بنجاح! البوت الآن يقدر يجاوب تلقائياً عن حالة الطلبات والمخزون.'); }, 400);
      });
    } else if(zidState === 'error'){
      const msg = params.get('msg') || '';
      window.addEventListener('load', function(){
        setTimeout(function(){ alert('⚠️ تعذّر ربط متجر زد' + (msg ? ': ' + decodeURIComponent(msg) : '') + '. حاول مرة ثانية أو تواصل مع الدعم.'); }, 400);
      });
    }
    if(sallaState === 'connected'){
      window.addEventListener('load', function(){
        setTimeout(function(){ alert('✅ تم ربط متجر سلة بنجاح! البوت الآن يقدر يجاوب تلقائياً عن حالة الطلبات والمخزون.'); }, 400);
      });
    } else if(sallaState === 'error'){
      const msg = params.get('msg') || '';
      window.addEventListener('load', function(){
        setTimeout(function(){ alert('⚠️ تعذّر ربط متجر سلة' + (msg ? ': ' + decodeURIComponent(msg) : '') + '. حاول مرة ثانية أو تواصل مع الدعم.'); }, 400);
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
    btn.disabled = true; btn.textContent = 'جاري الدخول...';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'تسجيل الدخول';
    if(error){
      errBox.textContent = 'بيانات الدخول غير صحيحة.';
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
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const email = document.getElementById('forgotEmail').value.trim();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    btn.disabled = false; btn.textContent = 'إرسال رابط الاستعادة';
    if(error){
      errBox.textContent = 'تعذّر إرسال الرابط، حاول مرة ثانية.';
      errBox.style.display = 'block';
      return;
    }
    okBox.textContent = '✓ تم إرسال رابط الاستعادة، افتح بريدك الإلكتروني.';
    okBox.style.display = 'block';
  });
  document.getElementById('resetForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errBox = document.getElementById('resetError');
    errBox.style.display = 'none';
    const btn = document.getElementById('resetBtn');
    btn.disabled = true; btn.textContent = 'جاري الحفظ...';
    const newPassword = document.getElementById('resetPassword').value;
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    btn.disabled = false; btn.textContent = 'حفظ كلمة المرور';
    if(error){
      errBox.textContent = 'تعذّر حفظ كلمة المرور، حاول مرة ثانية.';
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
      const map = { inbox: 'panelInbox', settings: 'panelSettings', support: 'panelSupport', broadcast: 'panelBroadcast', analytics: 'panelAnalytics', templates: 'panelTemplates', orders: 'panelOrders', addons: 'panelAddons', channels: 'panelChannels' };
      document.getElementById(map[btn.dataset.tab]).classList.add('active');
      if(btn.dataset.tab === 'orders'){ loadOrdersTab(); }
      if(btn.dataset.tab === 'addons'){ loadPortalAddonsTab(); }
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
      grid.innerHTML = '<div class="conv-empty">ما فيه إضافات متاحة حالياً.</div>';
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
        statusHtml = '<span class="addon-status active">✓ مفعّلة</span>';
      } else if(pendingRow){
        statusHtml = '<span class="addon-status pending">قيد المراجعة</span>';
      } else {
        actionHtml = '<button type="button" class="addon-request-btn" data-id="' + a.id + '">اطلب التفعيل</button>';
      }

      card.innerHTML =
        '<h3>' + escapeHtml(a.name_ar) + '</h3>' +
        '<div class="addon-desc">' + escapeHtml(a.description_ar || '') + '</div>' +
        '<div class="addon-foot">' +
          '<div class="addon-price">' + Number(a.price_sar).toLocaleString('ar') + '<span>ريال دفعة وحدة</span></div>' +
          (statusHtml || actionHtml) +
        '</div>';
      grid.appendChild(card);
    });

    grid.querySelectorAll('.addon-request-btn').forEach(function(btn){
      btn.addEventListener('click', async function(){
        btn.disabled = true;
        btn.textContent = 'جاري الإرسال...';
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
          btn.textContent = 'اطلب التفعيل';
          alert('تعذّر إرسال طلبك، حاول مرة ثانية.');
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
      if(subText) subText.textContent = 'اضغط زر المشاركة 🔗 بالأسفل، ثم اختر "إضافة إلى الشاشة الرئيسية"';
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
      .select('id, user_id, business_name_ar, business_name, plan_id, system_prompt, welcome_message, owner_phone, owner_email, zid_integration_enabled, extra_message_credits, current_period_ends_at, subscription_status, whatsapp_phone_number_id, zid_store_id, salla_store_id, telegram_connection_status, telegram_bot_username')
      .eq('user_id', user.id)
      .maybeSingle();
    if(ownerRes.data){
      clientRow = ownerRes.data;
      isOwner = true;
    } else {
      const { data: staffRow } = await supabaseClient
        .from('client_staff')
        .select('client_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if(staffRow){
        const { data: cr } = await supabaseClient
          .from('clients')
          .select('id, user_id, business_name_ar, business_name, plan_id, system_prompt, welcome_message, owner_phone, owner_email, zid_integration_enabled, extra_message_credits, current_period_ends_at, subscription_status, whatsapp_phone_number_id, zid_store_id, salla_store_id, telegram_connection_status, telegram_bot_username')
          .eq('id', staffRow.client_id)
          .maybeSingle();
        clientRow = cr;
        isOwner = false;
      }
    }
    if(!clientRow){
      document.getElementById('convList').innerHTML = '<div class="conv-empty">تعذّر العثور على حساب مرتبط بهذا الدخول. تواصل مع فريق نبضة.</div>';
      return;
    }
    myClient = clientRow;
    document.getElementById('bizTag').textContent = (clientRow.business_name_ar || clientRow.business_name || '') + (isOwner ? '' : ' — عضو فريق');
    document.getElementById('settingBizName').value = clientRow.business_name_ar || clientRow.business_name || '';
    document.getElementById('settingPrompt').value = clientRow.system_prompt || '';
    document.getElementById('settingWelcome').value = clientRow.welcome_message || '';
    document.getElementById('settingOwnerPhone').value = clientRow.owner_phone || '';
    document.getElementById('settingPrompt').disabled = !isOwner;
    document.getElementById('settingWelcome').disabled = !isOwner;
    document.getElementById('settingOwnerPhone').disabled = !isOwner;
    document.getElementById('saveSettingsBtn').style.display = isOwner ? 'inline-block' : 'none';
    document.getElementById('templatePickerField').style.display = isOwner ? 'block' : 'none';
    // الرسائل الجماعية إجراء تسويقي/مالي — نتركه لصاحب الحساب فقط لتفادي فتح تبويب يفشل بصمت للموظفين
    document.querySelector('.tab-btn[data-tab="broadcast"]').style.display = isOwner ? 'inline-block' : 'none';
    let planLabel = '—';
    if(clientRow.plan_id){
      const { data: plan } = await supabaseClient.from('subscription_plans').select('id, name_ar, code, monthly_message_limit, store_integration_included, store_integration_addon_price_sar, order_table_included, monthly_price_sar, is_prepaid, prepaid_credits, prepaid_validity_months, billing_cycle').eq('id', clientRow.plan_id).single();
      if(plan){ planLabel = plan.name_ar; myPlan = plan; }
    }
    document.getElementById('statPlan').textContent = planLabel;
    // فريق العمل — نجيبه قبل عرض المحادثات عشان نبني قائمة "معيّن إلى"
    const { data: staffRows } = await supabaseClient
      .from('client_staff')
      .select('id, user_id, full_name, email')
      .eq('client_id', clientRow.id);
    staffList = staffRows || [];
    staffMap = {};
    staffMap[clientRow.user_id] = 'صاحب الحساب';
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
    loadTemplates();
    loadTopupInfo();
    renderSubscriptionBanner();
    renderPlanCard();
  }
  /* ---------- استهلاك الرسائل + تنبيه الاقتراب من الحد ---------- */
  function renderUsageStat(monthCount){
    const limit = (myPlan && myPlan.monthly_message_limit) || null;
    const extraCredits = (myClient && myClient.extra_message_credits) || 0;
    const totalAllowance = limit ? (limit + extraCredits) : null;
    document.getElementById('statUsage').textContent = totalAllowance ? (monthCount + ' / ' + totalAllowance) : monthCount;
    const banner = document.getElementById('usageWarningBanner');
    if(!totalAllowance){ banner.style.display = 'none'; return; }
    const pct = Math.round((monthCount / totalAllowance) * 100);
    if(pct >= 100){
      banner.className = 'alert-box error';
      banner.style.display = 'block';
      banner.textContent = '🚫 وصلت لحد رسائلك هذا الشهر (' + monthCount + ' / ' + totalAllowance + '). البوت ممكن يتوقف عن الرد حتى تضيف رصيد إضافي أو تنتهي الدورة الشهرية. افتح تبويب "إعدادات البوت" لطلب رصيد إضافي.';
    } else if(pct >= 80){
      banner.className = 'cost-note';
      banner.style.display = 'block';
      banner.textContent = '⚠️ استهلكت ' + pct + '% من رسائل هذا الشهر (' + monthCount + ' / ' + totalAllowance + '). فكّر بإضافة رصيد إضافي من تبويب "إعدادات البوت" قبل ما تنتهي رسائلك.';
    } else {
      banner.style.display = 'none';
    }
  }
  function formatDateAr(iso){
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* ---------- الدفع الإلكتروني عبر Network International (N-Genius) ----------
     صفحة دفع مستضافة (Hosted Payment Page) — بخلاف Tap ما فيه نموذج بطاقة مدمج بالصفحة،
     ننشئ عملية الدفع عبر create-ngenius-order ونحوّل العميل مباشرة لرابط N-Genius.
     لو نظام الدفع لسه ما تفعّل (الأسرار ما انضافت بعد بمشروع Supabase)، الدالة ترجع
     payment_not_configured فنرجع نفس السلوك الحالي بالضبط: نوجّه العميل لتبويب الدعم. */
  async function startNgeniusCheckout(purpose, extra, title){
    if(!myClient){ return; }
    try{
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const authToken = sessionData.session.access_token;
      const res = await fetch(FUNCTIONS_BASE + '/create-ngenius-order', {
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
        alert(resJson.error || 'تعذّر إتمام عملية الدفع، حاول مرة ثانية أو تواصل مع الدعم.');
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
    if(myClient.subscription_status !== 'active' || !endsAt || daysLeft < 0){
      banner.className = 'alert-box error';
      banner.style.display = 'block';
      banner.innerHTML = '🚫 اشتراكك غير فعّال حالياً. <a href="#" id="bannerRenewLink" style="color:inherit; text-decoration:underline; font-weight:800;">ادفع الآن لتفعيل البوت</a>';
    } else if(daysLeft <= 5){
      banner.className = 'cost-note';
      banner.style.display = 'block';
      banner.innerHTML = '⏳ اشتراكك ينتهي خلال ' + daysLeft + ' يوم. <a href="#" id="bannerRenewLink" style="color:inherit; text-decoration:underline; font-weight:800;">جدّده الآن</a>';
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
    const planName = myPlan ? myPlan.name_ar : 'لم تُحدد بعد';
    const price = myPlan ? myPlan.monthly_price_sar : null;
    const isPrepaid = !!(myPlan && myPlan.is_prepaid);
    const isAnnual = !!(myPlan && myPlan.billing_cycle === 'annual');
    const priceLabel = price !== null ? (' — ' + price + (isPrepaid ? ' ريال (دفعة وحدة)' : (isAnnual ? ' ريال/سنة' : ' ريال/شهر'))) : '';
    const endsAtLabel = myClient.current_period_ends_at ? formatDateAr(myClient.current_period_ends_at) : 'غير مفعّل بعد';
    const endsAtWord = isPrepaid ? 'صلاحية الرصيد حتى: ' : (isAnnual ? 'ينتهي الاشتراك السنوي بتاريخ: ' : 'ينتهي بتاريخ: ');
    const statusLabel = myClient.subscription_status === 'active' ? '✅ فعّال' : (myClient.subscription_status === 'trial' ? '🕐 فترة تجريبية' : '🚫 غير فعّال');
    box.innerHTML = 'الباقة: <b>' + escapeHtml(planName) + '</b>' + priceLabel +
      (isPrepaid && myPlan.prepaid_credits ? '<br>رصيد الرسائل المسبق: ' + Number(myPlan.prepaid_credits).toLocaleString('en') + ' رسالة' : '') +
      '<br>الحالة: ' + statusLabel + '<br>' + endsAtWord + endsAtLabel;
    if(isOwner && myPlan){
      btn.style.display = 'inline-block';
    } else {
      btn.style.display = 'none';
    }
  }
  document.getElementById('renewPlanBtn').addEventListener('click', function(){
    if(!myClient || !myPlan){ return; }
    startNgeniusCheckout('subscription', { plan_id: myPlan.id }, 'تجديد الاشتراك');
  });
  /* ---------- ربط متجر زد ---------- */
  function storeAddonLockedHtml(suffix){
    const price = (myPlan && myPlan.store_integration_addon_price_sar) || 25;
    return '<div class="alert-box error" style="display:block; margin-top:10px;">'
      + 'ربط المتجر غير مفعّل في باقتك الحالية (' + escapeHtml((myPlan && myPlan.name_ar) || 'الأساسية') + '). '
      + 'فعّله مقابل ' + price + ' ريال/شهر إضافية، أو رقّي لباقة نمو وما فوق ليكون مجانياً.'
      + '</div>'
      + '<button class="modal-cancel" id="storeAddonSupportBtn_' + suffix + '" style="margin-top:8px;">تواصل مع الدعم للتفعيل</button>';
  }
  /* ---------- لوحة الطلبات الموحّدة ---------- */
  let ordersLoaded = false;
  async function loadOrdersTab(){
    if(ordersLoaded){ return; }
    const container = document.getElementById('ordersContent');
    if(!myPlan){ return; }
    if(!myPlan.order_table_included){
      container.innerHTML = '<div class="alert-box error" style="display:block;">'
        + 'لوحة الطلبات الموحّدة متاحة من باقة نمو وما فوق. باقتك الحالية: ' + escapeHtml(myPlan.name_ar || 'الأساسية') + '. '
        + 'رقّ باقتك أو تواصل مع الدعم للتفعيل.'
        + '</div>'
        + '<button class="modal-cancel" id="ordersUpgradeBtn" style="margin-top:8px;">تواصل مع الدعم</button>';
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
        container.innerHTML = '<div class="conv-empty">' + escapeHtml(json.message || 'تعذّر تحميل الطلبات، حاول مرة ثانية.') + '</div>';
        return;
      }
      const orders = json.orders || [];
      if(orders.length === 0){
        container.innerHTML = '<div class="conv-empty">لا توجد طلبات بعد.</div>';
        return;
      }
      let tableHtml = '<div class="table-wrap"><table style="width:100%; border-collapse:collapse;">'
        + '<thead><tr style="text-align:right; border-bottom:1.5px solid var(--border);">'
        + '<th style="padding:10px 8px;">رقم الطلب</th>'
        + '<th style="padding:10px 8px;">العميل</th>'
        + '<th style="padding:10px 8px;">الحالة</th>'
        + '<th style="padding:10px 8px;">القيمة</th>'
        + '<th style="padding:10px 8px;">التاريخ</th>'
        + '</tr></thead><tbody>';
      orders.forEach(function(o){
        tableHtml += '<tr style="border-bottom:1px solid var(--border);">'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.order_code || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.customer_name || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.status || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.total || '—') + '</td>'
          + '<td style="padding:10px 8px;">' + escapeHtml(o.created_at ? new Date(o.created_at).toLocaleDateString('ar-SA') : '—') + '</td>'
          + '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      container.innerHTML = tableHtml;
    } catch(e){
      ordersLoaded = false;
      container.innerHTML = '<div class="conv-empty">تعذّر تحميل الطلبات، حاول مرة ثانية.</div>';
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
      const dateStr = data.connected_at ? new Date(data.connected_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge zid-connected">✅ متصل' + (data.store_name ? ' — ' + escapeHtml(data.store_name) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">تم الربط بتاريخ ' + dateStr + '</div>' : '');
    } else {
      statusBox.innerHTML = '<span class="status-badge zid-disconnected">🔜 قريباً — ربط متاجر جديدة متوقف مؤقتاً</span>';
    }
  }
  document.getElementById('connectZidBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const btn = this;
    btn.disabled = true; btn.textContent = 'جاري التحضير...';
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
        btn.disabled = false; btn.textContent = 'ربط مع زد';
        alert(json.error || 'تعذّر بدء الربط مع زد، حاول مرة ثانية.');
        return;
      }
      window.location.href = json.url;
    } catch(e){
      btn.disabled = false; btn.textContent = 'ربط مع زد';
      alert('حصل خطأ بالاتصال، حاول مرة ثانية.');
    }
  });
  /* ---------- ربط متجر سلة ---------- */
  async function loadSallaStatus(){
    // ربط سلة الجديد متوقف مؤقتاً (قريباً) — لكن التجار المربوطين فعلاً قبل التوقف يستمر عرض اتصالهم الحقيقي.
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
      const dateStr = data.connected_at ? new Date(data.connected_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge salla-connected">✅ متصل' + (data.store_name ? ' — ' + escapeHtml(data.store_name) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">تم الربط بتاريخ ' + dateStr + '</div>' : '');
    } else {
      statusBox.innerHTML = '<span class="status-badge salla-disconnected">🔜 قريباً — ربط متاجر جديدة متوقف مؤقتاً</span>';
    }
  }
  document.getElementById('connectSallaBtn').addEventListener('click', async function(){
    if(!myClient || !isOwner){ return; }
    const btn = this;
    btn.disabled = true; btn.textContent = 'جاري التحضير...';
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
        btn.disabled = false; btn.textContent = 'ربط مع سلة';
        alert(json.error || 'تعذّر بدء الربط مع سلة، حاول مرة ثانية.');
        return;
      }
      window.location.href = json.url;
    } catch(e){
      btn.disabled = false; btn.textContent = 'ربط مع سلة';
      alert('حصل خطأ بالاتصال، حاول مرة ثانية.');
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
      const dateStr = data.created_at ? new Date(data.created_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge woo-connected">✅ متصل' + (data.store_url ? ' — ' + escapeHtml(data.store_url) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">تم الربط بتاريخ ' + dateStr + '</div>' : '');
      form.style.display = 'none';
    } else if(addonLocked){
      statusBox.innerHTML = '<span class="status-badge woo-disconnected">⚪ غير متصل بعد</span>' + (isOwner ? storeAddonLockedHtml('woo') : '');
      form.style.display = 'none';
      bindStoreAddonSupportBtn('woo');
    } else {
      statusBox.innerHTML = '<span class="status-badge woo-disconnected">⚪ غير متصل بعد</span>';
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
      errBox.textContent = 'عبّي رابط المتجر ومفتاحي الـ API كاملة.';
      errBox.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = 'جاري الربط...';
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
        btn.disabled = false; btn.textContent = 'ربط مع ووكومرس';
        errBox.textContent = json.message || 'تعذّر الربط، تأكد من صحة البيانات.';
        errBox.style.display = 'block';
        return;
      }
      await loadWooCommerceStatus();
    } catch(e){
      btn.disabled = false; btn.textContent = 'ربط مع ووكومرس';
      errBox.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
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
      statusBox.innerHTML = '<span class="status-badge telegram-connected">✅ متصل — @' + escapeHtml(myClient.telegram_bot_username) + '</span>';
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

    statusBox.innerHTML = '<span class="status-badge telegram-disconnected">⚪ غير متصل بعد</span>';

    if(!addonEnabled){
      form.style.display = 'none';
      if(isOwner){
        lockedHint.style.display = 'block';
        lockedHint.innerHTML = 'إضافة قناة تليجرام غير مفعّلة في حسابك بعد. فعّلها من تبويب "الإضافات" (399 ريال دفعة وحدة، بدون اشتراك شهري إضافي).';
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
      errBox.textContent = 'الرجاء لصق توكن البوت.';
      errBox.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = 'جاري الربط...';
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
        btn.disabled = false; btn.textContent = 'ربط مع تليجرام';
        errBox.textContent = json.message || 'تعذّر الربط، تأكد من صحة التوكن.';
        errBox.style.display = 'block';
        return;
      }
      myClient.telegram_connection_status = 'connected';
      myClient.telegram_bot_username = json.bot_username;
      await loadTelegramStatus();
    } catch(e){
      btn.disabled = false; btn.textContent = 'ربط مع تليجرام';
      errBox.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
      errBox.style.display = 'block';
    }
  });

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
      const dateStr = data.created_at ? new Date(data.created_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' }) : '';
      statusBox.innerHTML =
        '<span class="status-badge shopify-connected">✅ متصل' + (data.shop_domain ? ' — ' + escapeHtml(data.shop_domain) : '') + '</span>' +
        (dateStr ? '<div class="helper-text" style="margin-top:8px;">تم الربط بتاريخ ' + dateStr + '</div>' : '');
      form.style.display = 'none';
    } else if(addonLocked){
      statusBox.innerHTML = '<span class="status-badge shopify-disconnected">⚪ غير متصل بعد</span>' + (isOwner ? storeAddonLockedHtml('shopify') : '');
      form.style.display = 'none';
      bindStoreAddonSupportBtn('shopify');
    } else {
      statusBox.innerHTML = '<span class="status-badge shopify-disconnected">⚪ غير متصل بعد</span>';
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
      errBox.textContent = 'عبّي نطاق المتجر والتوكن كاملة.';
      errBox.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = 'جاري الربط...';
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
        btn.disabled = false; btn.textContent = 'ربط مع شوبيفاي';
        errBox.textContent = json.message || 'تعذّر الربط، تأكد من صحة البيانات.';
        errBox.style.display = 'block';
        return;
      }
      await loadShopifyStatus();
    } catch(e){
      btn.disabled = false; btn.textContent = 'ربط مع شوبيفاي';
      errBox.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
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
      list.innerHTML = '<div class="conv-empty">ما فيه موظفين مضافين بعد.</div>';
      return;
    }
    list.innerHTML = '';
    staffList.forEach(function(s){
      const div = document.createElement('div');
      div.className = 'staff-item';
      div.innerHTML =
        '<div><div class="sname">' + escapeHtml(s.full_name) + '</div><div class="semail">' + escapeHtml(s.email) + '</div></div>' +
        (isOwner ? '<button class="staff-remove-btn" data-id="' + s.id + '">إزالة</button>' : '');
      list.appendChild(div);
    });
    if(isOwner){
      list.querySelectorAll('.staff-remove-btn').forEach(function(btn){
        btn.addEventListener('click', async function(){
          if(!confirm('تأكيد إزالة هذا الموظف من الفريق؟')){ return; }
          const id = btn.dataset.id;
          const { error } = await supabaseClient.from('client_staff').delete().eq('id', id);
          if(!error){
            staffList = staffList.filter(function(s){ return s.id !== id; });
            renderTeam();
          }
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
    return '<span class="cat-badge" style="background:' + info.bg + '; color:' + info.color + ';">' + info.label + '</span>';
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
      list.innerHTML = '<div class="conv-empty">' + (filterMineOnly ? 'ما فيه محادثات معيّنة لك حالياً.' : 'ما فيه محادثات بعد. أول ما يراسل عميل بوتك، تظهر المحادثة هنا.') + '</div>';
      return;
    }
    list.innerHTML = '';
    phones.forEach(function(phone){
      const conv = conversations[phone];
      const lastMsg = conv.messages[conv.messages.length - 1];
      const humanBadge = conv.botPaused ? '<span class="human-badge">👤 يدوي</span>' : '';
      const assigneeName = conv.assignedTo && staffMap[conv.assignedTo] ? staffMap[conv.assignedTo] : null;
      const assigneeBadge = assigneeName ? '<span class="assignee-badge">🏷️ ' + escapeHtml(assigneeName) + '</span>' : '';
      const div = document.createElement('div');
      div.className = 'conv-item' + (phone === activePhone ? ' active' : '');
           div.innerHTML =
        '<div class="cname">' + escapeHtml(conv.name) + categoryBadgeHtml(conv.category) + '</div>' +
        '<div class="cphone">' + phone + '</div>' +
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
    head.textContent = conv.name + ' — ' + phone;
    composerWrap.style.display = 'block';
    bar.style.display = 'flex';
    if(conv.botPaused){
      bar.classList.add('paused');
      status.textContent = '🔴 الرد يدوي الآن';
      btn.textContent = 'إرجاع الرد للبوت تلقائياً';
      btn.className = 'takeover-btn to-resume';
    } else {
      bar.classList.remove('paused');
      status.textContent = '🤖 البوت يرد تلقائياً';
      btn.textContent = 'تولّي الرد يدوياً';
      btn.className = 'takeover-btn to-pause';
    }
    assignSelect.innerHTML = '<option value="">غير معيّن</option>';
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
      const time = new Date(m.at).toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
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
      alert('تعذّر تحديث التعيين، حاول مرة ثانية.');
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
      alert('تعذّر تحديث حالة المحادثة، حاول مرة ثانية.');
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
        hint.textContent = json.error || 'تعذّر إرسال الرسالة.';
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
        hint.textContent = '✓ تم الإرسال';
      }
    } catch(e){
      hint.style.color = 'var(--danger)';
      hint.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
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
    const status = document.getElementById('saveStatus');
    const { error } = await supabaseClient
      .from('clients')
      .update({ system_prompt: prompt, welcome_message: welcome, owner_phone: ownerPhoneRaw || null })
      .eq('id', myClient.id);
    if(!error){
      status.classList.add('show');
      setTimeout(function(){ status.classList.remove('show'); }, 2000);
    }
  });
  /* ---------- team management (owner only) ---------- */
  const newStaffModal = document.getElementById('newStaffModal');
  document.getElementById('addStaffBtn').addEventListener('click', function(){
    document.getElementById('staffFullName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('newStaffError').style.display = 'none';
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
      errBox.textContent = 'الرجاء تعبئة الاسم والبريد الإلكتروني.';
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    const btn = document.getElementById('newStaffConfirmBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/invite-client-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ client_id: myClient.id, email: email, full_name: fullName })
      });
      const json = await res.json();
      btn.disabled = false; btn.textContent = 'إرسال الدعوة';
      if(!res.ok){
        errBox.textContent = json.error || 'تعذّر إرسال الدعوة.';
        errBox.style.display = 'block';
        return;
      }
      newStaffModal.classList.remove('show');
      alert('تم إرسال دعوة للموظف عبر البريد الإلكتروني.');
      const { data: staffRows } = await supabaseClient
        .from('client_staff')
        .select('id, user_id, full_name, email')
        .eq('client_id', myClient.id);
      staffList = staffRows || [];
      staffMap = {};
      staffMap[myClient.user_id] = 'صاحب الحساب';
      staffList.forEach(function(s){ if(s.user_id){ staffMap[s.user_id] = s.full_name; } });
      renderTeam();
    } catch(e){
      btn.disabled = false; btn.textContent = 'إرسال الدعوة';
      errBox.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
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
      avgHint.textContent = 'بيانات زمن الرد بتظهر تدريجياً مع الرسائل الجديدة.';
    } else {
      const avgSec = responseTimes.reduce(function(a,b){ return a+b; }, 0) / responseTimes.length;
      if(avgSec < 60){
        avgEl.textContent = Math.round(avgSec) + ' ث';
      } else {
        const mins = Math.floor(avgSec / 60);
        const secs = Math.round(avgSec % 60);
        avgEl.textContent = mins + 'د ' + secs + 'ث';
      }
      avgHint.textContent = 'بناءً على ' + responseTimes.length + ' رد آلي.';
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
    const maxCount = Math.max.apply(null, counts.concat([1]));
    chart.innerHTML = '';
    days.forEach(function(d, i){
      const heightPct = Math.max(4, Math.round((counts[i] / maxCount) * 100));
      const col = document.createElement('div');
      col.className = 'bar-col';
      const label = d.toLocaleDateString('ar-SA', { weekday: 'short' });
      col.innerHTML =
        '<span class="bcount">' + counts[i] + '</span>' +
        '<div class="bar" style="height:' + heightPct + '%;"></div>' +
        '<span class="blabel">' + label + '</span>';
      chart.appendChild(col);
    });
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
      qList.innerHTML = '<div class="conv-empty">لا توجد بيانات كافية بعد.</div>';
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
      catWrap.innerHTML = '<div class="conv-empty">لا توجد بيانات كافية بعد.</div>';
    } else {
      catWrap.innerHTML = '';
      catKeys.forEach(function(key){
        const info = CATEGORY_LABELS[key] || CATEGORY_LABELS.other;
        const div = document.createElement('div');
        div.className = 'qa-item';
        div.innerHTML = '<span class="qtext">' + info.label + '</span><span class="qcount" style="background:' + info.color + ';">' + catCounts[key] + '</span>';
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
      wrap.innerHTML = '<div class="conv-empty">لا يوجد متجر مربوط بعد أو ما فيه طلبات مسجّلة.</div>';
      return;
    }
    const ordersConfirmed = events.filter(function(e){ return e.event_type === 'order_create' && (e.status === 'confirmation_sent' || e.status === 'confirmed'); }).length;
    const cartsDetected = events.filter(function(e){ return e.event_type === 'abandoned_cart'; }).length;
    const cartsRecovered = events.filter(function(e){ return e.event_type === 'abandoned_cart' && e.status === 'recovered'; }).length;
    const recoveryRate = cartsDetected > 0 ? Math.round((cartsRecovered / cartsDetected) * 100) : 0;
    wrap.innerHTML =
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-teal-dark);">' + ordersConfirmed + '</div><div class="helper-text">طلبات تم تأكيدها تلقائياً</div></div>' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-teal-dark);">' + cartsDetected + '</div><div class="helper-text">سلة متروكة تم رصدها</div></div>' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-green-dark);">' + cartsRecovered + '</div><div class="helper-text">سلة تم استردادها</div></div>' +
        '<div><div class="n" style="font-size:22px;font-weight:900;color:var(--wa-green-dark);">' + recoveryRate + '%</div><div class="helper-text">نسبة استرداد السلال</div></div>' +
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
      hoursSubEl.textContent = botReplies > 0 ? ('بناءً على ' + botReplies.toLocaleString('en-US') + ' رد آلي، بمعدّل 3 دقائق تقريباً لكل رد يدوي') : 'بتظهر تدريجياً مع أول ردود البوت';
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
        sarSubEl.textContent = 'لا توجد سلات مستردة بعد';
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
        sarSubEl.textContent = 'إجمالي كل الفترة: ' + Math.round(allTimeTotal).toLocaleString('en-US') + ' ريال من ' + events.length + ' سلة مستردة';
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
    const time = new Date().toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
    return '<div class="bubble ' + dir + '">' + escapeHtml(text) + '<span class="t">' + time + '</span></div>';
  }
  function resetSimChat(){
    simHistory = [];
    const body = document.getElementById('simChatBody');
    if(!body){ return; }
    const welcomeField = document.getElementById('settingWelcome');
    const welcome = (welcomeField && welcomeField.value ? welcomeField.value.trim() : '') || 'أهلاً بك! كيف أقدر أساعدك؟';
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
    body.insertAdjacentHTML('beforeend', '<div class="bubble in" id="' + typingId + '" style="opacity:.6;">يكتب الآن...</div>');
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
      btn.disabled = false; btn.textContent = 'إرسال';
      if(!res.ok){
        statusEl.textContent = json.error || 'تعذّر توليد الرد، حاول مرة ثانية.';
        return;
      }
      simHistory.push({ role: 'user', text: text });
      simHistory.push({ role: 'assistant', text: json.reply });
      body.insertAdjacentHTML('beforeend', simBubbleHtml(json.reply, 'in'));
      body.scrollTop = body.scrollHeight;
    } catch(e){
      const typingEl = document.getElementById(typingId);
      if(typingEl){ typingEl.remove(); }
      btn.disabled = false; btn.textContent = 'إرسال';
      statusEl.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
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
      document.getElementById('ticketList').innerHTML = '<div class="conv-empty">تعذّر تحميل التذاكر، حدّث الصفحة.</div>';
      return;
    }
    myTickets = data || [];
    renderTicketList();
  }
  function renderTicketList(){
    const list = document.getElementById('ticketList');
    if(myTickets.length === 0){
      list.innerHTML = '<div class="conv-empty">ما فيه تذاكر دعم بعد. اضغط "فتح تذكرة جديدة" لإرسال استفسارك.</div>';
      return;
    }
    list.innerHTML = '';
    myTickets.forEach(function(t){
      const div = document.createElement('div');
      div.className = 'ticket-item' + (t.id === activeTicketId ? ' active' : '');
      const dateStr = new Date(t.updated_at).toLocaleDateString('ar-SA', { month:'short', day:'numeric' });
      div.innerHTML =
        '<div class="tsubject">' + escapeHtml(t.subject) + '</div>' +
        '<div class="tmeta"><span class="status-badge ' + t.status + '">' + ticketStatusLabels[t.status] + '</span><span class="tdate">' + dateStr + '</span></div>';
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
    statusEl.textContent = ticketStatusLabels[ticket.status];
    composerWrap.style.display = 'block';
    hint.style.color = 'var(--muted)';
    hint.textContent = ticket.status === 'closed' ? 'ملاحظة: الرد سيعيد فتح هذي التذكرة تلقائياً.' : '';
    body.innerHTML = '<div class="chat-placeholder">جاري التحميل...</div>';
    const { data: msgs } = await supabaseClient
      .from('support_ticket_messages')
      .select('sender_type, message, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    body.innerHTML = '';
    (msgs || []).forEach(function(m){
      const b = document.createElement('div');
      b.className = 'bubble ' + (m.sender_type === 'client' ? 'out' : 'in');
      const time = new Date(m.created_at).toLocaleString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
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
      hint.textContent = 'تعذّر إرسال الرد، حاول مرة ثانية.';
      return;
    }
    textarea.value = '';
    await loadTickets();
    await openTicketThread(activeTicketId);
    hint.style.color = 'var(--wa-green-dark)';
    hint.textContent = '✓ تم الإرسال';
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
      errBox.textContent = 'الرجاء تعبئة الموضوع وتفاصيل المشكلة.';
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    const btn = document.getElementById('newTicketConfirmBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const { data: ticket, error: ticketErr } = await supabaseClient
      .from('support_tickets')
      .insert({ client_id: myClient.id, subject: subject })
      .select('id')
      .single();
    if(ticketErr || !ticket){
      errBox.textContent = 'تعذّر إنشاء التذكرة، حاول مرة ثانية.';
      errBox.style.display = 'block';
      btn.disabled = false; btn.textContent = 'إرسال';
      return;
    }
    await supabaseClient.from('support_ticket_messages').insert({ ticket_id: ticket.id, sender_type: 'client', message: message });
    btn.disabled = false; btn.textContent = 'إرسال';
    newTicketModal.classList.remove('show');
    activeTicketId = ticket.id;
    await loadTickets();
    await openTicketThread(ticket.id);
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
    document.querySelector('.tab-btn[data-tab="support"]').classList.add('active');
    document.getElementById('panelSupport').classList.add('active');
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
      document.getElementById('campaignList').innerHTML = '<div class="conv-empty">تعذّر تحميل الحملات، حدّث الصفحة.</div>';
      return;
    }
    myCampaigns = data || [];
    renderCampaignList();
  }
  function renderCampaignList(){
    const list = document.getElementById('campaignList');
    if(myCampaigns.length === 0){
      list.innerHTML = '<div class="conv-empty">ما فيه حملات بعد. اضغط "+ حملة جديدة" لإرسال أول رسالة جماعية.</div>';
      return;
    }
    list.innerHTML = '';
    myCampaigns.forEach(function(c){
      const dateStr = new Date(c.created_at).toLocaleString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const div = document.createElement('div');
      div.className = 'campaign-card';
      div.innerHTML =
        '<div class="ctop"><span class="cname">' + escapeHtml(c.template_name) + '</span><span class="status-badge ' + c.status + '">' + campaignStatusLabels[c.status] + '</span></div>' +
        '<div class="cmeta">' +
          '<span>📅 ' + dateStr + '</span>' +
          '<span>👥 <b>' + c.total_recipients + '</b> مستلم</span>' +
          '<span>✅ <b>' + c.sent_count + '</b> تم الإرسال</span>' +
          '<span>❌ <b>' + c.failed_count + '</b> فشل</span>' +
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
      errBox.textContent = 'الرجاء كتابة اسم القالب المعتمد.';
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    let recipients = 'all';
    if(recipientsMode === 'custom'){
      const raw = document.getElementById('bcCustomNumbers').value.trim();
      recipients = raw.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });
      if(recipients.length === 0){
        errBox.textContent = 'الرجاء كتابة رقم واحد على الأقل.';
        errBox.style.display = 'block';
        return;
      }
    }
    const btn = document.getElementById('newBroadcastConfirmBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
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
      btn.disabled = false; btn.textContent = 'إرسال الحملة';
      if(!res.ok){
        errBox.textContent = json.error || 'تعذّر إرسال الحملة.';
        errBox.style.display = 'block';
        return;
      }
      newBroadcastModal.classList.remove('show');
      await loadCampaigns();
      alert('تم إرسال الحملة: ' + json.sent + ' نجح، ' + json.failed + ' فشل، من أصل ' + json.total + '.');
    } catch(e){
      btn.disabled = false; btn.textContent = 'إرسال الحملة';
      errBox.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
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
      document.getElementById('templateList').innerHTML = '<div class="conv-empty">تعذّر تحميل القوالب، حدّث الصفحة.</div>';
      return;
    }
    myTemplates = data || [];
    renderTemplateList();
  }
  const templateCategoryLabels = { MARKETING: 'تسويقي', UTILITY: 'تنبيهي' };
  function renderTemplateList(){
    const list = document.getElementById('templateList');
    if(myTemplates.length === 0){
      list.innerHTML = '<div class="conv-empty">ما فيه قوالب بعد. اضغط "+ قالب جديد" لإنشاء أول قالب بمساعدة الذكاء الاصطناعي.</div>';
      return;
    }
    list.innerHTML = '';
    myTemplates.forEach(function(t){
      const dateStr = new Date(t.created_at).toLocaleString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const div = document.createElement('div');
      div.className = 'campaign-card';
      div.innerHTML =
        '<div class="ctop"><span class="cname">' + escapeHtml(t.name) + '</span><span class="status-badge ' + t.status + '">' + templateStatusLabels[t.status] + '</span></div>' +
        '<div class="cmeta">' +
          '<span>🏷️ ' + (templateCategoryLabels[t.category] || t.category) + '</span>' +
          '<span>📅 ' + dateStr + '</span>' +
        '</div>' +
        '<div class="helper-text" style="margin-top:8px; white-space:pre-wrap;">' + escapeHtml(t.body_text) + '</div>' +
        (t.status === 'rejected' && t.rejected_reason ? '<div class="helper-text" style="margin-top:6px; color:var(--danger);">سبب الرفض من واتساب: ' + escapeHtml(t.rejected_reason) + '</div>' : '');
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
    document.getElementById('tplGenerateBtn').textContent = 'توليد بالذكاء الاصطناعي';
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
      errBox.textContent = 'الرجاء كتابة وصف للرسالة اللي تبيها.';
      errBox.style.display = 'block';
      return;
    }
    if(!myClient){ return; }
    const btn = this;
    btn.disabled = true; btn.textContent = 'جاري التوليد...';
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
      btn.disabled = false; btn.textContent = 'توليد بالذكاء الاصطناعي';
      if(!res.ok){
        errBox.textContent = json.error || 'تعذّر توليد القالب، حاول صياغة الطلب بشكل مختلف.';
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
      btn.disabled = false; btn.textContent = 'توليد بالذكاء الاصطناعي';
      errBox.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
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
      errBox.textContent = 'الرجاء تعبئة اسم القالب ونص الرسالة.';
      errBox.style.display = 'block';
      return;
    }
    if(bodyText.indexOf('{{1}}') !== -1 && !variableExample){
      errBox.textContent = 'الرسالة فيها {{1}} — لازم تكتب مثال على القيمة اللي بتحل محله (مطلوب من واتساب للمراجعة).';
      errBox.style.display = 'block';
      return;
    }
    const btn = this;
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
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
      btn.disabled = false; btn.textContent = 'إرسال للمراجعة في واتساب';
      if(!res.ok){
        errBox.textContent = json.error || 'تعذّر إرسال القالب لواتساب.';
        errBox.style.display = 'block';
        return;
      }
      newTemplateModal.classList.remove('show');
      await loadTemplates();
      alert('تم إرسال القالب لمراجعة واتساب. راح تشوف حالته تتحدث تلقائياً هنا بمجرد ما ميتا يراجعه.');
    } catch(e){
      btn.disabled = false; btn.textContent = 'إرسال للمراجعة في واتساب';
      errBox.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
      errBox.style.display = 'block';
    }
  });
  /* ---------- رصيد الرسائل الإضافي (Top-up) ---------- */
  async function loadTopupInfo(){
    const nonOwnerHint = document.getElementById('topupHelperNonOwner');
    nonOwnerHint.style.display = isOwner ? 'none' : 'block';
    if(!myClient){ return; }
    const balance = myClient.extra_message_credits || 0;
    document.getElementById('topupCurrentBalance').textContent = 'رصيدك الإضافي الحالي: ' + balance + ' رسالة.';
    const { data: pending } = await supabaseClient
      .from('message_credit_topup_requests')
      .select('credits, price_sar, status, requested_at')
      .eq('client_id', myClient.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });
    const pendingBox = document.getElementById('topupPendingNotice');
    if(pending && pending.length > 0){
      pendingBox.innerHTML = pending.map(function(r){
        return '<div class="cost-note">⏳ طلب معلّق: ' + r.credits + ' رسالة مقابل ' + r.price_sar + ' ريال — بانتظار تأكيد الدفع.</div>';
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
      row.innerHTML =
        '<span class="topup-info">' + p.credits.toLocaleString('en-US') + ' رسالة إضافية — <b>' + p.price_sar + ' ريال</b> (لمرة واحدة)</span>' +
        '<button class="topup-request-btn" data-id="' + p.id + '" data-credits="' + p.credits + '" data-price="' + p.price_sar + '">📞 تواصل معنا</button>';
      box.appendChild(row);
    });
    document.querySelectorAll('.topup-request-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(!myClient || !isOwner){ return; }
        document.querySelector('.tab-btn[data-tab="support"]').click();
      });
    });
  }
