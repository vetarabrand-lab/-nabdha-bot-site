const SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Wplf-GMXzJ-SXzNFvahGUQ_KHqjFTz3';
  const FUNCTIONS_BASE = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const loginScreen = document.getElementById('loginScreen');
  const forgotScreen = document.getElementById('forgotScreen');
  const resetScreen = document.getElementById('resetScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  const logoutBtn = document.getElementById('logoutBtn');
  const statusLabels = {
    trial: 'تجريبي',
    active: 'نشط',
    expired: 'منتهي',
    past_due: 'متأخر بالدفع',
    canceled: 'ملغى'
  };
  const ticketStatusLabels = {
    open: 'مفتوحة',
    in_progress: 'قيد المعالجة',
    closed: 'تم الحل'
  };
  const affiliateStatusLabels = {
    pending: 'قيد المراجعة',
    active: 'مفعّل',
    suspended: 'موقوف'
  };
  let allClients = [];
  let plansMap = {};
  let planLimitMap = {};
  let plansList = []; // ميزة 7: قائمة الباقات الكاملة (تشمل باقات الدفع المسبق) لمحرر "تفعيل باقة" بالجدول
  let modalClient = null;
  let allTickets = [];
  let activeAdminTicketId = null;
  let allSiteChatSessions = [];
  let activeSiteChatId = null;
  const siteChatStatusLabels = { bot: 'بوت (تلقائي)', escalated: 'محوّلة لفريقنا', human_active: 'قيد الرد اليدوي', closed: 'مغلقة' };
  let allConvMsgs = [];
  let activeConvKey = null;
  let convFilterPopulated = false;
  let allAddons = [];
  let allClientAddons = [];
  let addonCreditsMap = {};
  let addonModalClient = null;
  let allAddonRequests = [];
  const addonRequestStatusLabels = { pending: 'قيد المراجعة', contacted: 'تم التواصل', activated: 'مُفعّلة', declined: 'مرفوض' };
  let allTestimonials = [];
  const testimonialStatusLabels = { pending: 'قيد المراجعة', approved: 'منشور', rejected: 'مرفوض' };
  // بيانات النشاط/البريد/الرسائل تجي أصلاً من نماذج عامة (تسجيل مشتركين جدد، رسائل واتساب)
  // ومو موثوقة — لازم تتنضف قبل إدراجها كـ HTML عشان نمنع ثغرات XSS في لوحة الإدارة
  function escapeHtml(str){
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function showScreen(name){
    loginScreen.style.display = 'none';
    forgotScreen.style.display = 'none';
    resetScreen.style.display = 'none';
    dashboardScreen.style.display = 'none';
    logoutBtn.style.display = 'none';
    if(name === 'login'){ loginScreen.style.display = 'flex'; }
    else if(name === 'forgot'){ forgotScreen.style.display = 'flex'; }
    else if(name === 'reset'){ resetScreen.style.display = 'flex'; }
    else if(name === 'dashboard'){
      dashboardScreen.style.display = 'block';
      logoutBtn.style.display = 'inline-block';
      loadDashboard();
    }
  }
  // يتعامل مع حالة "استعادة كلمة المرور" لما المستخدم يضغط الرابط اللي وصله بالإيميل
  supabaseClient.auth.onAuthStateChange(function(event, session){
    if(event === 'PASSWORD_RECOVERY'){
      showScreen('reset');
    }
  });
  supabaseClient.auth.getSession().then(function(res){
    // لو الرابط فيه type=recovery بيتكفل onAuthStateChange بعرض شاشة التعيين، وإلا نكمل عادي
    const isRecovery = window.location.hash.includes('type=recovery');
    if(isRecovery){ return; }
    if(res.data.session){ showScreen('dashboard'); } else { showScreen('login'); }
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
    showScreen('dashboard');
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
    showScreen('dashboard');
  });
  logoutBtn.addEventListener('click', async function(){
    await supabaseClient.auth.signOut();
    showScreen('login');
  });
  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      const map = { clients: 'panelClients', tickets: 'panelTickets', sitechat: 'panelSiteChat', topups: 'panelTopups', affiliates: 'panelAffiliates', leads: 'panelLeads', conversations: 'panelConversations', addons: 'panelAddons', testimonials: 'panelTestimonials' };
      document.getElementById(map[btn.dataset.tab]).classList.add('active');
      if(btn.dataset.tab === 'tickets'){ loadTickets(); }
      if(btn.dataset.tab === 'sitechat'){ loadSiteChatSessions(); document.getElementById('siteChatBadge').style.display = 'none'; }
      if(btn.dataset.tab === 'topups'){ loadTopupsPanel(); }
      if(btn.dataset.tab === 'affiliates'){ loadAffiliatesTab(); }
      if(btn.dataset.tab === 'leads'){ loadLeadsPanel(); }
      if(btn.dataset.tab === 'conversations'){ loadConversationsPanel(); }
      if(btn.dataset.tab === 'addons'){ loadAddonsPanel(); }
      if(btn.dataset.tab === 'testimonials'){ loadTestimonialsPanel(); }
    });
  });
  async function loadDashboard(){
    checkTestimonialsPending();
    const { data: plans } = await supabaseClient.from('subscription_plans').select('id, name_ar, monthly_message_limit, monthly_price_sar, is_active, is_prepaid, prepaid_credits, prepaid_validity_months').order('sort_order');
    plansMap = {};
    planLimitMap = {};
    plansList = plans || [];
    plansList.forEach(function(p){ plansMap[p.id] = p.name_ar; planLimitMap[p.id] = p.monthly_message_limit; });
    const { data: clients, error } = await supabaseClient
      .from('clients')
      .select('id, business_name, business_name_ar, owner_email, owner_phone, plan_id, subscription_status, trial_ends_at, is_paid, user_id, created_at, extra_message_credits, whatsapp_connection_status, whatsapp_connection_checked_at, whatsapp_connection_error, cart_coupon_addon_enabled')
      .order('created_at', { ascending: false });
    if(error){
      document.getElementById('clientsTbody').innerHTML = '<tr class="empty-row"><td colspan="10">تعذّر تحميل البيانات، حدّث الصفحة.</td></tr>';
      return;
    }
    allClients = clients || [];
    const todayStr = new Date().toISOString().slice(0,10);
    const { count: msgsToday } = await supabaseClient
      .from('whatsapp_messages_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStr + 'T00:00:00Z');
    document.getElementById('statTotal').textContent = allClients.length;
    document.getElementById('statTrial').textContent = allClients.filter(function(c){ return c.subscription_status === 'trial'; }).length;
    document.getElementById('statActive').textContent = allClients.filter(function(c){ return c.subscription_status === 'active'; }).length;
    document.getElementById('statMsgsToday').textContent = (msgsToday || 0);
    renderTable();
  }
  // يبني badge لحالة اتصال رقم واتساب بالعميل (يتحدث تلقائياً كل 3 ساعات عبر فحص دوري)
  function renderWaHealth(c){
    const status = c.whatsapp_connection_status || 'unknown';
    const checkedAt = c.whatsapp_connection_checked_at
      ? new Date(c.whatsapp_connection_checked_at).toLocaleString('ar-SA', { hour:'2-digit', minute:'2-digit', day:'numeric', month:'short' })
      : '';
    if(status === 'connected'){
      return '<span class="badge wa-connected" title="آخر فحص: ' + checkedAt + '">🟢 متصل</span>';
    }
    if(status === 'disconnected'){
      const errSafe = escapeHtml(c.whatsapp_connection_error || 'خطأ غير معروف');
      return '<span class="badge wa-disconnected" title="' + errSafe + ' — آخر فحص: ' + checkedAt + '">🔴 منقطع</span>';
    }
    return '<span class="badge wa-unknown" title="ما فيه رقم مربوط أو ما تفحّص بعد">⚪ غير معروف</span>';
  }
  // يبني badge توضيحي لعدد الأيام المتبقية من التجربة المجانية (7 أيام) لكل عميل
  function renderDaysRemaining(c){
    if(c.subscription_status === 'active' && c.is_paid){
      return '<span class="badge permanent">مدفوع دائم</span>';
    }
    if(c.subscription_status === 'expired'){
      return '<span class="badge expired">انتهت التجربة</span>';
    }
    if(c.subscription_status === 'active' && c.trial_ends_at){
      const msLeft = new Date(c.trial_ends_at).getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      if(daysLeft <= 0){
        return '<span class="badge expired">ينتهي اليوم</span>';
      }
      return '<span class="badge trialdays">' + daysLeft + ' يوم متبقي</span>';
    }
    return '<span class="biz-sub">—</span>';
  }
  function renderTable(){
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const statusF = document.getElementById('statusFilter').value;
    const tbody = document.getElementById('clientsTbody');
    let rows = allClients.filter(function(c){
      const hay = [c.business_name_ar, c.business_name, c.owner_email, c.owner_phone].join(' ').toLowerCase();
      const matchesSearch = !search || hay.includes(search);
      const matchesStatus = !statusF || c.subscription_status === statusF;
      return matchesSearch && matchesStatus;
    });
    if(rows.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="10">ما فيه نتائج مطابقة</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    rows.forEach(function(c){
      const tr = document.createElement('tr');
      const dateStr = new Date(c.created_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
      const bizNameSafe = escapeHtml(c.business_name_ar || c.business_name || '—');
      const bizNameEnSafe = escapeHtml(c.business_name || '');
      const emailSafe = escapeHtml(c.owner_email || '—');
      const phoneSafe = escapeHtml(c.owner_phone || '—');
      tr.innerHTML =
        '<td><div class="biz-name">' + bizNameSafe + '</div>' +
          (c.business_name && c.business_name !== c.business_name_ar ? '<div class="biz-sub">' + bizNameEnSafe + '</div>' : '') + '</td>' +
        '<td><div>' + emailSafe + '</div><div class="biz-sub">' + phoneSafe + '</div></td>' +
        '<td></td>' +
        '<td>' + renderWaHealth(c) + '</td>' +
        '<td></td>' +
        '<td></td>' +
        '<td></td>' +
        '<td></td>' +
        '<td></td>' +
        '<td>' + dateStr + '</td>';
      const planTd = tr.children[2];
      const statusTd = tr.children[4];
      const daysTd = tr.children[5];
      const linkTd = tr.children[6];
      const couponTd = tr.children[7];
      const reportTd = tr.children[8];
      const select = document.createElement('select');
      select.className = 'status-select';
      ['trial','active','expired','past_due','canceled'].forEach(function(s){
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = statusLabels[s];
        if(s === c.subscription_status){ opt.selected = true; }
        select.appendChild(opt);
      });
      const hint = document.createElement('span');
      hint.className = 'save-hint';
      hint.textContent = '✓ تم الحفظ';
      select.addEventListener('change', async function(){
        const newStatus = select.value;
        const { data: updated, error } = await supabaseClient
          .from('clients')
          .update({ subscription_status: newStatus })
          .eq('id', c.id)
          .select('subscription_status, trial_ends_at, is_paid')
          .single();
        if(!error && updated){
          c.subscription_status = updated.subscription_status;
          c.trial_ends_at = updated.trial_ends_at;
          c.is_paid = updated.is_paid;
          daysTd.innerHTML = renderDaysRemaining(c);
          hint.classList.add('show');
          setTimeout(function(){ hint.classList.remove('show'); }, 1800);
          document.getElementById('statTrial').textContent = allClients.filter(function(x){ return x.subscription_status === 'trial'; }).length;
          document.getElementById('statActive').textContent = allClients.filter(function(x){ return x.subscription_status === 'active'; }).length;
        }
      });
      statusTd.appendChild(select);
      statusTd.appendChild(hint);
      daysTd.innerHTML = renderDaysRemaining(c);
      if(c.user_id){
        const badge = document.createElement('span');
        badge.className = 'badge linked';
        badge.textContent = '✓ مرتبط';
        linkTd.appendChild(badge);
      } else {
        const btn = document.createElement('button');
        btn.className = 'link-btn';
        btn.textContent = 'إنشاء حساب دخول';
        btn.addEventListener('click', function(){ openLinkModal(c); });
        linkTd.appendChild(btn);
      }
      // زر تفعيل/إيقاف إضافة "كوبونات السلة المتروكة" (خدمة إضافية مدفوعة شهرياً) لكل عميل
      const couponBtn = document.createElement('button');
      couponBtn.className = 'link-btn';
      function renderCouponBtn(){
        if(c.cart_coupon_addon_enabled){
          couponBtn.textContent = '✓ مفعّلة';
          couponBtn.classList.add('active-addon');
        } else {
          couponBtn.textContent = 'تفعيل';
          couponBtn.classList.remove('active-addon');
        }
      }
      renderCouponBtn();
      couponBtn.addEventListener('click', async function(){
        const newVal = !c.cart_coupon_addon_enabled;
        couponBtn.disabled = true;
        const { error: couponErr } = await supabaseClient
          .from('clients')
          .update({ cart_coupon_addon_enabled: newVal })
          .eq('id', c.id);
        couponBtn.disabled = false;
        if(!couponErr){
          c.cart_coupon_addon_enabled = newVal;
          renderCouponBtn();
        } else {
          alert('تعذّر تحديث الإضافة، حاول مرة ثانية.');
        }
      });
      couponTd.appendChild(couponBtn);
      // خانة "التقرير الأسبوعي" — الميزة تعتمد فقط على وجود owner_phone؛ لو موجود التقرير يوصل تلقائياً كل أحد،
      // فهذي الخانة تعرض حالة الجاهزية وتتيح إضافة/تعديل رقم صاحب النشاط مباشرة من نفس اللوحة.
      function renderReportCell(){
        reportTd.innerHTML = '';
        const hasPhone = !!(c.owner_phone && c.owner_phone.trim());
        const badge = document.createElement('span');
        badge.className = 'badge ' + (hasPhone ? 'active' : 'trial');
        badge.textContent = hasPhone ? '✓ مفعّل' : 'بحاجة رقم';
        reportTd.appendChild(badge);
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'link-btn';
        editBtn.style.marginRight = '6px';
        editBtn.textContent = hasPhone ? 'تعديل' : 'إضافة رقم';
        editBtn.addEventListener('click', function(){ openReportPhoneEditor(); });
        reportTd.appendChild(editBtn);
      }
      function openReportPhoneEditor(){
        reportTd.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'tel';
        input.className = 'report-phone-input';
        input.placeholder = '05xxxxxxxx';
        input.value = c.owner_phone || '';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'link-btn';
        saveBtn.textContent = 'حفظ';
        saveBtn.addEventListener('click', async function(){
          saveBtn.disabled = true;
          saveBtn.textContent = '...';
          const newPhone = input.value.trim();
          const { error: phoneErr } = await supabaseClient
            .from('clients')
            .update({ owner_phone: newPhone || null })
            .eq('id', c.id);
          if(!phoneErr){
            c.owner_phone = newPhone || null;
            renderReportCell();
          } else {
            alert('تعذّر حفظ الرقم، حاول مرة ثانية.');
            saveBtn.disabled = false;
            saveBtn.textContent = 'حفظ';
          }
        });
        reportTd.appendChild(input);
        reportTd.appendChild(saveBtn);
      }
      renderReportCell();
      // خانة "الباقة" — ميزة 7 (باقات الرسائل المسبقة الدفع): الدفع الإلكتروني معطّل مؤقتاً بالموقع،
      // فالطريقة الحالية لتفعيل أي باقة (شهرية أو مسبقة الدفع) لعميل دفع يدوياً (تحويل بنكي، STC Pay، إلخ)
      // هي من هنا مباشرة. "تفعيل باقة" يمدد current_period_ends_at بالمدة الصحيحة حسب نوع الباقة
      // (30 يوم للاشتراك الشهري، أو عدد أشهر صلاحية الباقة لو كانت مسبقة الدفع)، ولو كانت مسبقة الدفع
      // يضيف رصيد الرسائل المتفق عليه دفعة وحدة — نفس المنطق بالضبط المطبّق تلقائياً بـ tap-webhook
      // وقت ما يشتغل الدفع الإلكتروني لاحقاً.
      function renderPlanCell(){
        planTd.innerHTML = '';
        const nameSpan = document.createElement('div');
        nameSpan.className = 'biz-name';
        nameSpan.textContent = plansMap[c.plan_id] || '—';
        planTd.appendChild(nameSpan);
        const currentPlan = plansList.find(function(p){ return p.id === c.plan_id; });
        if(currentPlan && currentPlan.is_prepaid){
          const sub = document.createElement('div');
          sub.className = 'biz-sub';
          sub.textContent = 'مسبقة الدفع — تنتهي ' + (c.current_period_ends_at ? new Date(c.current_period_ends_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' }) : '—');
          planTd.appendChild(sub);
        }
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'link-btn';
        editBtn.textContent = 'تفعيل باقة';
        editBtn.addEventListener('click', function(){ openPlanEditor(); });
        planTd.appendChild(editBtn);
      }
      function openPlanEditor(){
        planTd.innerHTML = '';
        const select = document.createElement('select');
        select.className = 'status-select';
        plansList.filter(function(p){ return p.is_active; }).forEach(function(p){
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name_ar + ' — ' + Number(p.monthly_price_sar).toLocaleString('en') + ' ريال' + (p.is_prepaid ? ' (دفعة وحدة)' : '/شهر');
          if(p.id === c.plan_id){ opt.selected = true; }
          select.appendChild(opt);
        });
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'link-btn';
        confirmBtn.textContent = 'تفعيل';
        confirmBtn.addEventListener('click', async function(){
          const plan = plansList.find(function(p){ return p.id === select.value; });
          if(!plan){ return; }
          confirmBtn.disabled = true;
          confirmBtn.textContent = '...';
          const validityDays = plan.is_prepaid ? (Number(plan.prepaid_validity_months) || 12) * 30 : 30;
          const now = new Date();
          const base = (c.current_period_ends_at && new Date(c.current_period_ends_at) > now) ? new Date(c.current_period_ends_at) : now;
          const newPeriodEnd = new Date(base.getTime() + validityDays * 24 * 60 * 60 * 1000);
          const updatePayload = {
            plan_id: plan.id,
            subscription_status: 'active',
            is_paid: true,
            current_period_ends_at: newPeriodEnd.toISOString()
          };
          if(plan.is_prepaid && plan.prepaid_credits){
            updatePayload.extra_message_credits = (c.extra_message_credits || 0) + Number(plan.prepaid_credits);
          }
          const { data: updated, error: planErr } = await supabaseClient
            .from('clients')
            .update(updatePayload)
            .eq('id', c.id)
            .select('plan_id, subscription_status, is_paid, current_period_ends_at, extra_message_credits')
            .single();
          if(!planErr && updated){
            c.plan_id = updated.plan_id;
            c.subscription_status = updated.subscription_status;
            c.is_paid = updated.is_paid;
            c.current_period_ends_at = updated.current_period_ends_at;
            c.extra_message_credits = updated.extra_message_credits;
            renderPlanCell();
            daysTd.innerHTML = renderDaysRemaining(c);
            document.getElementById('statActive').textContent = allClients.filter(function(x){ return x.subscription_status === 'active'; }).length;
            document.getElementById('statTrial').textContent = allClients.filter(function(x){ return x.subscription_status === 'trial'; }).length;
          } else {
            alert('تعذّر تفعيل الباقة، حاول مرة ثانية.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'تفعيل';
          }
        });
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'link-btn';
        cancelBtn.textContent = 'إلغاء';
        cancelBtn.addEventListener('click', function(){ renderPlanCell(); });
        planTd.appendChild(select);
        planTd.appendChild(confirmBtn);
        planTd.appendChild(cancelBtn);
      }
      renderPlanCell();
      tbody.appendChild(tr);
    });
  }
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);
  /* ---------- support tickets (admin side) ---------- */
  async function loadTickets(){
    const list = document.getElementById('adminTicketList');
    const { data, error } = await supabaseClient
      .from('support_tickets')
      .select('id, subject, status, created_at, updated_at, client_id, clients(business_name_ar, business_name)')
      .order('updated_at', { ascending: false });
    if(error){
      list.innerHTML = '<div class="conv-empty">تعذّر تحميل التذاكر، حدّث الصفحة.</div>';
      return;
    }
    allTickets = data || [];
    renderTicketList();
  }
  function renderTicketList(){
    const list = document.getElementById('adminTicketList');
    if(allTickets.length === 0){
      list.innerHTML = '<div class="conv-empty">ما فيه تذاكر دعم بعد.</div>';
      return;
    }
    list.innerHTML = '';
    allTickets.forEach(function(t){
      const bizName = escapeHtml(t.clients ? (t.clients.business_name_ar || t.clients.business_name || '—') : '—');
      const subjectSafe = escapeHtml(t.subject);
      const dateStr = new Date(t.updated_at).toLocaleDateString('ar-SA', { month:'short', day:'numeric' });
      const div = document.createElement('div');
      div.className = 'ticket-item' + (t.id === activeAdminTicketId ? ' active' : '');
      div.innerHTML =
        '<div class="tsubject">' + subjectSafe + '</div>' +
        '<div class="biz-sub">' + bizName + '</div>' +
        '<div class="tmeta"><span class="badge ' + t.status + '">' + ticketStatusLabels[t.status] + '</span><span class="biz-sub">' + dateStr + '</span></div>';
      div.addEventListener('click', function(){
        activeAdminTicketId = t.id;
        renderTicketList();
        openAdminTicketThread(t.id);
      });
      list.appendChild(div);
    });
  }
  async function openAdminTicketThread(ticketId){
    const head = document.getElementById('adminTicketThreadHead');
    const body = document.getElementById('adminTicketBody');
    const composerWrap = document.getElementById('adminTicketComposerWrap');
    const ticket = allTickets.find(function(t){ return t.id === ticketId; });
    if(!ticket){ return; }
    head.style.display = 'flex';
    document.getElementById('adminTicketSubject').textContent = ticket.subject;
    document.getElementById('adminTicketStatusSelect').value = ticket.status;
    composerWrap.style.display = 'block';
    body.innerHTML = '<div class="chat-placeholder">جاري التحميل...</div>';
    const { data: msgs } = await supabaseClient
      .from('support_ticket_messages')
      .select('sender_type, message, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    body.innerHTML = '';
    (msgs || []).forEach(function(m){
      const b = document.createElement('div');
      b.className = 'bubble ' + (m.sender_type === 'admin' ? 'out' : 'in');
      const time = new Date(m.created_at).toLocaleString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      b.innerHTML = escapeHtml(m.message) + '<span class="t">' + time + '</span>';
      body.appendChild(b);
    });
    body.scrollTop = body.scrollHeight;
  }
  document.getElementById('adminTicketStatusSelect').addEventListener('change', async function(){
    if(!activeAdminTicketId){ return; }
    const newStatus = this.value;
    const { error } = await supabaseClient
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', activeAdminTicketId);
    if(!error){
      const t = allTickets.find(function(x){ return x.id === activeAdminTicketId; });
      if(t){ t.status = newStatus; }
      renderTicketList();
    }
  });
  document.getElementById('adminTicketSendBtn').addEventListener('click', async function(){
    const textarea = document.getElementById('adminTicketReplyText');
    const text = textarea.value.trim();
    if(!text || !activeAdminTicketId){ return; }
    const btn = document.getElementById('adminTicketSendBtn');
    btn.disabled = true;
    const { error } = await supabaseClient
      .from('support_ticket_messages')
      .insert({ ticket_id: activeAdminTicketId, sender_type: 'admin', message: text });
    btn.disabled = false;
    if(!error){
      textarea.value = '';
      await loadTickets();
      await openAdminTicketThread(activeAdminTicketId);
    }
  });
  /* ---------- محادثة الموقع المباشرة (بوت أولاً، تحويل لفريق عند الحاجة) ---------- */
  async function loadSiteChatSessions(){
    const list = document.getElementById('adminSiteChatList');
    const { data, error } = await supabaseClient
      .from('site_chat_sessions')
      .select('id, status, last_message_at, created_at')
      .order('last_message_at', { ascending: false })
      .limit(100);
    if(error){
      list.innerHTML = '<div class="conv-empty">تعذّر تحميل المحادثات، حدّث الصفحة.</div>';
      return;
    }
    allSiteChatSessions = data || [];
    renderSiteChatList();
  }
  function renderSiteChatList(){
    const list = document.getElementById('adminSiteChatList');
    if(allSiteChatSessions.length === 0){
      list.innerHTML = '<div class="conv-empty">ما فيه محادثات من الموقع بعد.</div>';
      return;
    }
    list.innerHTML = '';
    allSiteChatSessions.forEach(function(s){
      const dateStr = new Date(s.last_message_at).toLocaleDateString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const div = document.createElement('div');
      div.className = 'ticket-item' + (s.id === activeSiteChatId ? ' active' : '');
      div.innerHTML =
        '<div class="tsubject">زائر ' + s.id.slice(0, 8) + '</div>' +
        '<div class="tmeta"><span class="badge ' + s.status + '">' + siteChatStatusLabels[s.status] + '</span><span class="biz-sub">' + dateStr + '</span></div>';
      div.addEventListener('click', function(){
        activeSiteChatId = s.id;
        renderSiteChatList();
        openSiteChatThread(s.id);
      });
      list.appendChild(div);
    });
  }
  async function openSiteChatThread(sessionId){
    const head = document.getElementById('adminSiteChatThreadHead');
    const body = document.getElementById('adminSiteChatBody');
    const composerWrap = document.getElementById('adminSiteChatComposerWrap');
    const session = allSiteChatSessions.find(function(s){ return s.id === sessionId; });
    if(!session){ return; }
    head.style.display = 'flex';
    document.getElementById('adminSiteChatStatusSelect').value = session.status;
    composerWrap.style.display = 'block';
    body.innerHTML = '<div class="chat-placeholder">جاري التحميل...</div>';
    const { data: msgs } = await supabaseClient
      .from('site_chat_messages')
      .select('sender_type, message, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    body.innerHTML = '';
    (msgs || []).forEach(function(m){
      const b = document.createElement('div');
      b.className = 'bubble ' + (m.sender_type === 'visitor' ? 'in' : 'out');
      const time = new Date(m.created_at).toLocaleString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      b.innerHTML = escapeHtml(m.message) + '<span class="t">' + time + '</span>';
      body.appendChild(b);
    });
    body.scrollTop = body.scrollHeight;
  }
  document.getElementById('adminSiteChatStatusSelect').addEventListener('change', async function(){
    if(!activeSiteChatId){ return; }
    const newStatus = this.value;
    const { error } = await supabaseClient
      .from('site_chat_sessions')
      .update({ status: newStatus })
      .eq('id', activeSiteChatId);
    if(!error){
      const s = allSiteChatSessions.find(function(x){ return x.id === activeSiteChatId; });
      if(s){ s.status = newStatus; }
      renderSiteChatList();
    }
  });
  document.getElementById('adminSiteChatSendBtn').addEventListener('click', async function(){
    const textarea = document.getElementById('adminSiteChatReplyText');
    const text = textarea.value.trim();
    if(!text || !activeSiteChatId){ return; }
    const btn = document.getElementById('adminSiteChatSendBtn');
    btn.disabled = true;
    const { error } = await supabaseClient
      .from('site_chat_messages')
      .insert({ session_id: activeSiteChatId, sender_type: 'staff', message: text });
    if(!error){
      // أول رد يدوي يحوّل الحالة تلقائياً من "محوّلة" لـ "قيد الرد اليدوي" — إلا لو الموظف غيّرها يدوياً لشي ثاني
      const s = allSiteChatSessions.find(function(x){ return x.id === activeSiteChatId; });
      if(s && s.status === 'escalated'){
        await supabaseClient.from('site_chat_sessions').update({ status: 'human_active' }).eq('id', activeSiteChatId);
      }
    }
    btn.disabled = false;
    if(!error){
      textarea.value = '';
      await loadSiteChatSessions();
      await openSiteChatThread(activeSiteChatId);
    }
  });
  // فحص دوري خفيف كل 20 ثانية لتحديث القائمة وتنبيه بوجود محادثة محوّلة جديدة تحتاج رد،
  // حتى لو الموظف فاتح تبويب ثاني حالياً
  setInterval(async function(){
    if(!supabaseClient || document.getElementById('loginScreen').style.display === 'flex'){ return; }
    const { data } = await supabaseClient
      .from('site_chat_sessions')
      .select('id, status, last_message_at, created_at')
      .order('last_message_at', { ascending: false })
      .limit(100);
    if(!data) return;
    const hadEscalated = data.some(function(s){ return s.status === 'escalated'; });
    document.getElementById('siteChatBadge').style.display = hadEscalated ? 'inline-block' : 'none';
    if(document.getElementById('panelSiteChat').classList.contains('active')){
      allSiteChatSessions = data;
      renderSiteChatList();
      if(activeSiteChatId){ openSiteChatThread(activeSiteChatId); }
    }
  }, 20000);
  /* ---------- محادثات واتساب (كل حساباتنا — بما فيها حساب بوت نبضة نفسه) ---------- */
  function populateConvClientFilter(){
    const sel = document.getElementById('convClientFilter');
    if(convFilterPopulated){ return; }
    allClients.forEach(function(c){
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.business_name_ar || c.business_name || c.id;
      sel.appendChild(opt);
    });
    convFilterPopulated = true;
  }
  async function loadConversationsPanel(){
    populateConvClientFilter();
    const list = document.getElementById('convList');
    const { data, error } = await supabaseClient
      .from('whatsapp_messages_log')
      .select('id, client_id, customer_phone, customer_name, inbound_message, outbound_message, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if(error){
      list.innerHTML = '<div class="conv-empty">تعذّر تحميل المحادثات، حدّث الصفحة.</div>';
      return;
    }
    allConvMsgs = data || [];
    renderConvList();
  }
  function convClientName(clientId){
    const c = allClients.find(function(x){ return x.id === clientId; });
    return c ? (c.business_name_ar || c.business_name || '') : 'حساب محذوف';
  }
  function renderConvList(){
    const list = document.getElementById('convList');
    const filterClientId = document.getElementById('convClientFilter').value;
    const filtered = filterClientId ? allConvMsgs.filter(function(m){ return m.client_id === filterClientId; }) : allConvMsgs;
    // نجمع الرسائل حسب (العميل + رقم جوال الزبون) عشان نبني قائمة محادثات، مو رسائل مفردة
    const groups = {};
    filtered.forEach(function(m){
      const key = m.client_id + '|' + m.customer_phone;
      if(!groups[key] || new Date(m.created_at) > new Date(groups[key].created_at)){
        groups[key] = m;
      }
    });
    const summaries = Object.keys(groups).map(function(key){ return { key: key, msg: groups[key] }; });
    summaries.sort(function(a, b){ return new Date(b.msg.created_at) - new Date(a.msg.created_at); });
    if(summaries.length === 0){
      list.innerHTML = '<div class="conv-empty">ما فيه محادثات واتساب بعد.</div>';
      return;
    }
    list.innerHTML = '';
    summaries.forEach(function(s){
      const m = s.msg;
      const dateStr = new Date(m.created_at).toLocaleDateString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const lastText = m.inbound_message || m.outbound_message || '';
      const div = document.createElement('div');
      div.className = 'ticket-item' + (s.key === activeConvKey ? ' active' : '');
      div.innerHTML =
        '<div class="tsubject">' + escapeHtml(m.customer_name || m.customer_phone) + '</div>' +
        '<div class="biz-sub">' + escapeHtml(convClientName(m.client_id)) + '</div>' +
        '<div class="tmeta"><span class="biz-sub">' + escapeHtml(lastText.slice(0, 40)) + '</span><span class="biz-sub">' + dateStr + '</span></div>';
      div.addEventListener('click', function(){
        activeConvKey = s.key;
        renderConvList();
        openConvThread(s.key);
      });
      list.appendChild(div);
    });
  }
  function openConvThread(key){
    const head = document.getElementById('convThreadHead');
    const title = document.getElementById('convThreadTitle');
    const body = document.getElementById('convBody');
    const parts = key.split('|');
    const clientId = parts[0];
    const phone = parts[1];
    const thread = allConvMsgs
      .filter(function(m){ return m.client_id === clientId && m.customer_phone === phone; })
      .sort(function(a, b){ return new Date(a.created_at) - new Date(b.created_at); });
    if(thread.length === 0){ return; }
    head.style.display = 'flex';
    title.textContent = (thread[0].customer_name || phone) + ' — ' + convClientName(clientId);
    body.innerHTML = '';
    thread.forEach(function(m){
      const time = new Date(m.created_at).toLocaleString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      if(m.inbound_message){
        const bin = document.createElement('div');
        bin.className = 'bubble in';
        bin.innerHTML = escapeHtml(m.inbound_message) + '<span class="t">' + time + '</span>';
        body.appendChild(bin);
      }
      if(m.outbound_message){
        const bout = document.createElement('div');
        bout.className = 'bubble out';
        bout.innerHTML = escapeHtml(m.outbound_message) + '<span class="t">' + time + '</span>';
        body.appendChild(bout);
      }
    });
    body.scrollTop = body.scrollHeight;
  }
  document.getElementById('convClientFilter').addEventListener('change', function(){
    activeConvKey = null;
    document.getElementById('convThreadHead').style.display = 'none';
    document.getElementById('convBody').innerHTML = '<div class="chat-placeholder">اختر محادثة من القائمة لعرضها</div>';
    renderConvList();
  });
  /* ---------- الإضافات المدفوعة ---------- */
  async function loadAddonsPanel(){
    const grid = document.getElementById('addonGrid');
    const tbody = document.getElementById('addonClientsTbody');

    const [{ data: addons }, { data: activations }, { data: requests }] = await Promise.all([
      supabaseClient.from('addons').select('*').eq('is_active', true).order('sort_order'),
      supabaseClient.from('client_addons').select('*'),
      supabaseClient.from('addon_requests').select('*').order('created_at', { ascending: false }).limit(200)
    ]);
    allAddons = addons || [];
    allClientAddons = activations || [];
    allAddonRequests = requests || [];
    renderAddonRequests();

    // رصيد كل تاجر — نجيبه من نفس الدالة اللي يستخدمها الخادم عشان الرقم يكون واحد بالضبط
    addonCreditsMap = {};
    await Promise.all(allClients.map(async function(c){
      const { data } = await supabaseClient.rpc('client_remaining_credits', { p_client_id: c.id });
      addonCreditsMap[c.id] = Number(data || 0);
    }));

    // كتالوج الإضافات + كم تاجر مفعّلها
    grid.innerHTML = '';
    allAddons.forEach(function(a){
      const count = allClientAddons.filter(function(ca){ return ca.addon_id === a.id && ca.enabled; }).length;
      const card = document.createElement('div');
      card.className = 'addon-card';
      card.innerHTML =
        '<h3>' + escapeHtml(a.name_ar) + '</h3>' +
        (a.has_ongoing_cost ? '<span class="addon-cost-tag">⚠ تكلفة مستمرة — الاستهلاك من الرصيد</span>' : '') +
        '<div class="addon-desc">' + escapeHtml(a.description_ar || '') + '</div>' +
        '<div class="addon-foot">' +
          '<div class="addon-price">' + Number(a.price_sar).toLocaleString('ar') + ' <span>ريال دفعة وحدة</span></div>' +
          '<span class="addon-count">' + count + ' متجر</span>' +
        '</div>';
      grid.appendChild(card);
    });

    // جدول التجار
    if(allClients.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="4">ما فيه مشتركين بعد.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    allClients.forEach(function(c){
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.innerHTML = '<div style="font-weight:800;">' + escapeHtml(c.business_name_ar || c.business_name || '') + '</div>' +
                         '<div class="biz-sub">' + escapeHtml(c.owner_email || '') + '</div>';

      const creditsTd = document.createElement('td');
      const remaining = addonCreditsMap[c.id] || 0;
      creditsTd.innerHTML = '<span class="credits-cell' + (remaining <= 0 ? ' low' : '') + '">' +
                            remaining.toLocaleString('ar') + ' رسالة</span>';

      const activeTd = document.createElement('td');
      const mine = allClientAddons.filter(function(ca){ return ca.client_id === c.id && ca.enabled; });
      if(mine.length === 0){
        activeTd.innerHTML = '<span class="biz-sub">لا يوجد</span>';
      } else {
        activeTd.innerHTML = mine.map(function(ca){
          const a = allAddons.find(function(x){ return x.id === ca.addon_id; });
          return '<span class="badge linked" style="margin:2px;">' + escapeHtml(a ? a.name_ar : ca.addon_id) + '</span>';
        }).join('');
      }

      const actionTd = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = 'link-btn';
      btn.textContent = 'إدارة الإضافات';
      btn.addEventListener('click', function(){ openAddonModal(c); });
      actionTd.appendChild(btn);

      tr.appendChild(nameTd);
      tr.appendChild(creditsTd);
      tr.appendChild(activeTd);
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
  }

  function renderAddonRequests(){
    const tbody = document.getElementById('addonRequestsTbody');
    const countBadge = document.getElementById('pendingRequestsCount');
    const pendingCount = allAddonRequests.filter(function(r){ return r.status === 'pending'; }).length;
    countBadge.textContent = pendingCount > 0 ? pendingCount + ' جديد' : '';

    if(allAddonRequests.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">ما فيه طلبات تفعيل بعد.</td></tr>';
      return;
    }

    const sourceLabels = { homepage: 'الصفحة الرئيسية', addons_page: 'صفحة الإضافات', portal: 'لوحة التاجر' };

    tbody.innerHTML = '';
    allAddonRequests.forEach(function(r){
      const addon = allAddons.find(function(a){ return a.id === r.addon_id; });
      const client = r.client_id ? allClients.find(function(c){ return c.id === r.client_id; }) : null;
      const dateStr = new Date(r.created_at).toLocaleDateString('ar-SA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(addon ? addon.name_ar : r.addon_id) + '</td>' +
        '<td>' + escapeHtml(r.contact_name || (client ? (client.business_name_ar || client.business_name) : '') || '-') + '</td>' +
        '<td dir="ltr" style="text-align:left;">' + escapeHtml(r.contact_phone || '-') + '</td>' +
        '<td><span class="biz-sub">' + escapeHtml(sourceLabels[r.source] || r.source) + '</span></td>' +
        '<td><span class="biz-sub">' + dateStr + '</span></td>' +
        '<td><span class="badge ' + (r.status === 'pending' ? 'escalated' : (r.status === 'activated' ? 'linked' : '')) + '">' + escapeHtml(addonRequestStatusLabels[r.status] || r.status) + '</span></td>';

      const actionTd = document.createElement('td');
      if(r.status === 'pending' || r.status === 'contacted'){
        if(r.contact_phone){
          const waBtn = document.createElement('a');
          const waPhone = String(r.contact_phone).replace(/[^0-9]/g, '');
          waBtn.href = 'https://wa.me/' + waPhone;
          waBtn.target = '_blank';
          waBtn.rel = 'noopener';
          waBtn.className = 'link-btn';
          waBtn.style.marginLeft = '4px';
          waBtn.textContent = 'واتساب';
          actionTd.appendChild(waBtn);
        }
        if(client){
          const activateBtn = document.createElement('button');
          activateBtn.className = 'link-btn active-addon';
          activateBtn.style.marginLeft = '4px';
          activateBtn.textContent = 'تفعيل';
          activateBtn.addEventListener('click', function(){ openAddonModal(client); });
          actionTd.appendChild(activateBtn);
        }
        if(r.status === 'pending'){
          const contactedBtn = document.createElement('button');
          contactedBtn.className = 'link-btn';
          contactedBtn.style.marginLeft = '4px';
          contactedBtn.textContent = 'تم التواصل';
          contactedBtn.addEventListener('click', function(){ updateAddonRequestStatus(r.id, 'contacted'); });
          actionTd.appendChild(contactedBtn);
        }
        const declineBtn = document.createElement('button');
        declineBtn.className = 'link-btn';
        declineBtn.textContent = 'تجاهل';
        declineBtn.addEventListener('click', function(){ updateAddonRequestStatus(r.id, 'declined'); });
        actionTd.appendChild(declineBtn);
      } else {
        actionTd.innerHTML = '<span class="biz-sub">—</span>';
      }
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
  }

  async function updateAddonRequestStatus(requestId, newStatus){
    const { data: sess } = await supabaseClient.auth.getSession();
    const adminEmail = sess && sess.session && sess.session.user ? sess.session.user.email : null;
    const { error } = await supabaseClient.from('addon_requests')
      .update({ status: newStatus, handled_at: new Date().toISOString(), handled_by: adminEmail })
      .eq('id', requestId);
    if(!error){
      const r = allAddonRequests.find(function(x){ return x.id === requestId; });
      if(r){ r.status = newStatus; }
      renderAddonRequests();
    }
  }

  /* ---------- آراء العملاء ---------- */
  async function checkTestimonialsPending(){
    const { count } = await supabaseClient.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    const badge = document.getElementById('testiPendingBadge');
    if(count && count > 0){ badge.textContent = count + ' جديد'; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
  }

  async function loadTestimonialsPanel(){
    const tbody = document.getElementById('testimonialsTbody');
    const { data, error } = await supabaseClient.from('testimonials').select('*').order('created_at', { ascending: false }).limit(300);
    if(error){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">تعذّر تحميل البيانات، حدّث الصفحة.</td></tr>';
      return;
    }
    allTestimonials = data || [];
    renderTestimonials();
    checkTestimonialsPending();
  }

  function renderTestimonials(){
    const tbody = document.getElementById('testimonialsTbody');
    if(allTestimonials.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">ما فيه تعليقات بعد.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    allTestimonials.forEach(function(t){
      const tr = document.createElement('tr');
      const dateStr = new Date(t.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const stars = '★★★★★'.slice(0, t.rating) + '☆☆☆☆☆'.slice(0, 5 - t.rating);
      tr.innerHTML =
        '<td>' + escapeHtml(t.customer_name) + '</td>' +
        '<td><span class="testi-stars-cell">' + stars + '</span></td>' +
        '<td><div class="testi-comment-cell">' + escapeHtml(t.comment) + '</div></td>' +
        '<td><span class="biz-sub">' + dateStr + '</span></td>' +
        '<td><span class="badge ' + escapeHtml(t.status) + '">' + escapeHtml(testimonialStatusLabels[t.status] || t.status) + '</span></td>';

      const actionTd = document.createElement('td');
      if(t.status !== 'approved'){
        const approveBtn = document.createElement('button');
        approveBtn.className = 'link-btn active-addon';
        approveBtn.style.marginLeft = '4px';
        approveBtn.textContent = 'نشر';
        approveBtn.addEventListener('click', function(){ updateTestimonialStatus(t.id, 'approved'); });
        actionTd.appendChild(approveBtn);
      }
      if(t.status !== 'rejected'){
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'link-btn';
        rejectBtn.style.marginLeft = '4px';
        rejectBtn.textContent = 'رفض';
        rejectBtn.addEventListener('click', function(){ updateTestimonialStatus(t.id, 'rejected'); });
        actionTd.appendChild(rejectBtn);
      }
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'link-btn';
      deleteBtn.textContent = 'حذف';
      deleteBtn.addEventListener('click', function(){ deleteTestimonial(t.id); });
      actionTd.appendChild(deleteBtn);

      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
  }

  async function updateTestimonialStatus(id, newStatus){
    const patch = { status: newStatus };
    if(newStatus === 'approved'){ patch.approved_at = new Date().toISOString(); }
    const { error } = await supabaseClient.from('testimonials').update(patch).eq('id', id);
    if(!error){
      const t = allTestimonials.find(function(x){ return x.id === id; });
      if(t){ t.status = newStatus; }
      renderTestimonials();
      checkTestimonialsPending();
    }
  }

  async function deleteTestimonial(id){
    if(!confirm('حذف هذا التعليق نهائياً؟')) return;
    const { error } = await supabaseClient.from('testimonials').delete().eq('id', id);
    if(!error){
      allTestimonials = allTestimonials.filter(function(x){ return x.id !== id; });
      renderTestimonials();
      checkTestimonialsPending();
    }
  }

  const addonModal = document.getElementById('addonModal');
  function openAddonModal(client){
    addonModalClient = client;
    document.getElementById('addonModalBiz').textContent = client.business_name_ar || client.business_name || '';
    document.getElementById('addonModalError').style.display = 'none';
    renderAddonModalList();
    addonModal.classList.add('show');
  }
  function closeAddonModal(){
    addonModal.classList.remove('show');
    addonModalClient = null;
  }
  document.getElementById('addonModalCloseBtn').addEventListener('click', closeAddonModal);
  addonModal.addEventListener('click', function(e){ if(e.target === addonModal){ closeAddonModal(); } });

  function renderAddonModalList(){
    const wrap = document.getElementById('addonModalList');
    wrap.innerHTML = '';
    if(!addonModalClient){ return; }
    allAddons.forEach(function(a){
      const existing = allClientAddons.find(function(ca){
        return ca.client_id === addonModalClient.id && ca.addon_id === a.id;
      });
      const isOn = !!(existing && existing.enabled);

      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:10px; padding:11px 13px; border:1px solid var(--border); border-radius:12px;';
      const info = document.createElement('div');
      info.innerHTML = '<div style="font-weight:800; font-size:13.5px;">' + escapeHtml(a.name_ar) + '</div>' +
                       '<div class="biz-sub">' + Number(a.price_sar).toLocaleString('ar') + ' ريال دفعة وحدة</div>';

      const toggle = document.createElement('button');
      toggle.className = 'link-btn' + (isOn ? ' active-addon' : '');
      toggle.textContent = isOn ? '✓ مفعّلة — إيقاف' : 'تفعيل';
      toggle.addEventListener('click', async function(){
        toggle.disabled = true;
        const errBox = document.getElementById('addonModalError');
        errBox.style.display = 'none';
        let error;
        if(existing){
          const res = await supabaseClient.from('client_addons')
            .update({ enabled: !isOn }).eq('id', existing.id);
          error = res.error;
          if(!error){ existing.enabled = !isOn; }
        } else {
          const { data: sess } = await supabaseClient.auth.getSession();
          const adminEmail = sess && sess.session && sess.session.user ? sess.session.user.email : null;
          const res = await supabaseClient.from('client_addons').insert({
            client_id: addonModalClient.id,
            addon_id: a.id,
            enabled: true,
            price_paid_sar: a.price_sar,
            activated_by: adminEmail
          }).select('*').single();
          error = res.error;
          if(!error && res.data){ allClientAddons.push(res.data); }
        }
        toggle.disabled = false;
        if(error){
          errBox.textContent = 'تعذّر حفظ التغيير: ' + error.message;
          errBox.style.display = 'block';
          return;
        }
        // لو التفعيل صار بسبب طلب وارد لنفس التاجر ونفس الإضافة، نعلّمه "مُفعّلة" تلقائياً
        if(!isOn){
          await supabaseClient.from('addon_requests')
            .update({ status: 'activated', handled_at: new Date().toISOString() })
            .eq('client_id', addonModalClient.id)
            .eq('addon_id', a.id)
            .in('status', ['pending', 'contacted']);
        }
        renderAddonModalList();
        loadAddonsPanel();
      });

      row.appendChild(info);
      row.appendChild(toggle);
      wrap.appendChild(row);
    });
  }
  /* ---------- link account modal ---------- */
  const linkModal = document.getElementById('linkModal');
  const modalBizName = document.getElementById('modalBizName');
  const modalEmail = document.getElementById('modalEmail');
  const modalPassword = document.getElementById('modalPassword');
  const modalError = document.getElementById('modalError');
  const modalSuccess = document.getElementById('modalSuccess');
  const modalConfirmBtn = document.getElementById('modalConfirmBtn');
  function openLinkModal(client){
    modalClient = client;
    modalBizName.textContent = client.business_name_ar || client.business_name || '';
    modalEmail.value = client.owner_email || '';
    modalPassword.value = '';
    modalError.style.display = 'none';
    modalSuccess.style.display = 'none';
    modalConfirmBtn.disabled = false;
    modalConfirmBtn.textContent = 'إنشاء الحساب';
    linkModal.classList.add('show');
  }
  function closeLinkModal(){
    linkModal.classList.remove('show');
    modalClient = null;
  }
  document.getElementById('modalCancelBtn').addEventListener('click', closeLinkModal);
  linkModal.addEventListener('click', function(e){ if(e.target === linkModal){ closeLinkModal(); } });
  document.getElementById('genPasswordBtn').addEventListener('click', function(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pass = '';
    for(let i = 0; i < 12; i++){ pass += chars[Math.floor(Math.random() * chars.length)]; }
    modalPassword.value = pass;
  });
  modalConfirmBtn.addEventListener('click', async function(){
    if(!modalClient){ return; }
    modalError.style.display = 'none';
    modalSuccess.style.display = 'none';
    const email = modalEmail.value.trim();
    const password = modalPassword.value;
    if(!email || !password){
      modalError.textContent = 'الرجاء تعبئة البريد الإلكتروني وكلمة المرور.';
      modalError.style.display = 'block';
      return;
    }
    if(password.length < 8){
      modalError.textContent = 'كلمة المرور لازم تكون 8 أحرف فأكثر.';
      modalError.style.display = 'block';
      return;
    }
    modalConfirmBtn.disabled = true;
    modalConfirmBtn.textContent = 'جاري الإنشاء...';
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session.access_token;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/admin-create-client-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ client_id: modalClient.id, email: email, password: password })
      });
      const json = await res.json();
      if(!res.ok){
        modalError.textContent = json.error || 'تعذّر إنشاء الحساب.';
        modalError.style.display = 'block';
        modalConfirmBtn.disabled = false;
        modalConfirmBtn.textContent = 'إنشاء الحساب';
        return;
      }
      modalClient.user_id = json.user_id;
      modalSuccess.textContent = '✓ تم الإنشاء بنجاح. أرسل للعميل: ' + email + ' / ' + password;
      modalSuccess.style.display = 'block';
      modalConfirmBtn.textContent = 'تم';
      renderTable();
      setTimeout(function(){ closeLinkModal(); }, 3500);
    } catch(e){
      modalError.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
      modalError.style.display = 'block';
      modalConfirmBtn.disabled = false;
      modalConfirmBtn.textContent = 'إنشاء الحساب';
    }
  });
  /* ---------- إضافة عميل جديد كامل (بيانات النشاط + حساب الدخول) ---------- */
  const newClientModal = document.getElementById('newClientModal');
  const ncError = document.getElementById('newClientError');
  const ncSuccess = document.getElementById('newClientSuccess');
  const ncConfirmBtn = document.getElementById('newClientConfirmBtn');
  function openNewClientModal(){
    ['ncBizNameAr','ncBizNameEn','ncOwnerEmail','ncOwnerPhone','ncWaDisplay','ncPrompt','ncWelcome','ncLoginEmail','ncLoginPassword'].forEach(function(id){
      document.getElementById(id).value = '';
    });
    document.getElementById('ncActivate').value = 'trial';
    const planSel = document.getElementById('ncPlan');
    planSel.innerHTML = '<option value="">بدون باقة (يُحدَّد لاحقاً)</option>';
    (plansList || []).forEach(function(p){
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name_ar + (p.monthly_price_sar != null ? ' (' + Number(p.monthly_price_sar).toLocaleString('ar') + ' ريال/شهر)' : '');
      planSel.appendChild(opt);
    });
    ncError.style.display = 'none';
    ncSuccess.style.display = 'none';
    ncConfirmBtn.disabled = false;
    ncConfirmBtn.textContent = 'إنشاء العميل';
    newClientModal.classList.add('show');
  }
  function closeNewClientModal(){
    newClientModal.classList.remove('show');
  }
  document.getElementById('openNewClientBtn').addEventListener('click', openNewClientModal);
  document.getElementById('newClientCancelBtn').addEventListener('click', closeNewClientModal);
  newClientModal.addEventListener('click', function(e){ if(e.target === newClientModal){ closeNewClientModal(); } });
  document.getElementById('ncGenPasswordBtn').addEventListener('click', function(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pass = '';
    for(let i = 0; i < 12; i++){ pass += chars[Math.floor(Math.random() * chars.length)]; }
    document.getElementById('ncLoginPassword').value = pass;
  });
  ncConfirmBtn.addEventListener('click', async function(){
    ncError.style.display = 'none';
    ncSuccess.style.display = 'none';

    const payload = {
      business_name_ar: document.getElementById('ncBizNameAr').value.trim(),
      business_name: document.getElementById('ncBizNameEn').value.trim(),
      owner_email: document.getElementById('ncOwnerEmail').value.trim(),
      owner_phone: document.getElementById('ncOwnerPhone').value.trim(),
      whatsapp_display_number: document.getElementById('ncWaDisplay').value.trim(),
      plan_id: document.getElementById('ncPlan').value || null,
      activate_paid: document.getElementById('ncActivate').value === 'paid',
      system_prompt: document.getElementById('ncPrompt').value.trim(),
      welcome_message: document.getElementById('ncWelcome').value.trim(),
      login_email: document.getElementById('ncLoginEmail').value.trim(),
      login_password: document.getElementById('ncLoginPassword').value
    };

    if(!payload.business_name_ar || !payload.owner_email || !payload.owner_phone || !payload.system_prompt || !payload.login_email || !payload.login_password){
      ncError.textContent = 'عبّئ كل الحقول المطلوبة (المعلّمة بـ *) أولاً.';
      ncError.style.display = 'block';
      return;
    }
    if(payload.login_password.length < 8){
      ncError.textContent = 'كلمة مرور الدخول لازم تكون 8 أحرف فأكثر.';
      ncError.style.display = 'block';
      return;
    }

    ncConfirmBtn.disabled = true;
    ncConfirmBtn.textContent = 'جاري الإنشاء...';
    try{
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session.access_token;
      const res = await fetch(FUNCTIONS_BASE + '/admin-create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if(!res.ok || json.error){
        ncError.textContent = json.error || 'تعذّر إنشاء العميل، حاول مرة ثانية.';
        ncError.style.display = 'block';
        ncConfirmBtn.disabled = false;
        ncConfirmBtn.textContent = 'إنشاء العميل';
        return;
      }
      ncSuccess.innerHTML = '✓ تم إنشاء العميل بنجاح.<br>أرسل للعميل بيانات الدخول: ' + escapeHtml(payload.login_email) + ' / ' + escapeHtml(payload.login_password);
      ncSuccess.style.display = 'block';
      ncConfirmBtn.textContent = 'تم';
      await loadDashboard();
      setTimeout(closeNewClientModal, 4000);
    } catch(e){
      ncError.textContent = 'حصل خطأ بالاتصال، حاول مرة ثانية.';
      ncError.style.display = 'block';
      ncConfirmBtn.disabled = false;
      ncConfirmBtn.textContent = 'إنشاء العميل';
    }
  });
  /* ---------- طلبات الرصيد الإضافي + العملاء القريبين من الحد ---------- */
  function loadTopupsPanel(){
    loadTopupRequestsTable();
    loadNearLimitTable();
  }
  function clientLabelById(clientId){
    const c = allClients.find(function(x){ return x.id === clientId; });
    if(!c){ return '—'; }
    return escapeHtml(c.business_name_ar || c.business_name || '—');
  }
  async function loadTopupRequestsTable(){
    const tbody = document.getElementById('topupRequestsTbody');
    const { data, error } = await supabaseClient
      .from('message_credit_topup_requests')
      .select('id, client_id, credits, price_sar, requested_at')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });
    if(error){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">تعذّر تحميل الطلبات.</td></tr>';
      return;
    }
    if(!data || data.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">ما فيه طلبات معلّقة حالياً.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    data.forEach(function(r){
      const dateStr = new Date(r.requested_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + clientLabelById(r.client_id) + '</td>' +
        '<td>' + r.credits.toLocaleString('en-US') + ' رسالة</td>' +
        '<td>' + r.price_sar + ' ريال</td>' +
        '<td>' + dateStr + '</td>' +
        '<td><button class="gen-btn fulfill-topup-btn" data-id="' + r.id + '" data-client="' + r.client_id + '" data-credits="' + r.credits + '">تم الدفع — إضافة الرصيد</button></td>';
      tbody.appendChild(tr);
    });
    document.querySelectorAll('.fulfill-topup-btn').forEach(function(btn){
      btn.addEventListener('click', async function(){
        if(!confirm('تأكيد استلام الدفع وإضافة ' + this.dataset.credits + ' رسالة لرصيد العميل؟')){ return; }
        this.disabled = true;
        this.textContent = 'جاري الإضافة...';
        const clientId = this.dataset.client;
        const requestId = this.dataset.id;
        const credits = parseInt(this.dataset.credits, 10);
        const { data: clientRow } = await supabaseClient
          .from('clients')
          .select('extra_message_credits')
          .eq('id', clientId)
          .single();
        const newBalance = (clientRow ? clientRow.extra_message_credits : 0) + credits;
        const { error: updateErr } = await supabaseClient
          .from('clients')
          .update({ extra_message_credits: newBalance })
          .eq('id', clientId);
        if(updateErr){
          this.disabled = false;
          this.textContent = 'تم الدفع — إضافة الرصيد';
          alert('تعذّر إضافة الرصيد، حاول مرة ثانية.');
          return;
        }
        await supabaseClient
          .from('message_credit_topup_requests')
          .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
          .eq('id', requestId);
        await loadTopupRequestsTable();
      });
    });
  }
  async function loadNearLimitTable(){
    const tbody = document.getElementById('nearLimitTbody');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: msgs, error } = await supabaseClient
      .from('whatsapp_messages_log')
      .select('client_id')
      .gte('created_at', monthStart);
    if(error){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="4">تعذّر تحميل بيانات الاستهلاك.</td></tr>';
      return;
    }
    const countByClient = {};
    (msgs || []).forEach(function(m){
      countByClient[m.client_id] = (countByClient[m.client_id] || 0) + 1;
    });
    const nearLimit = [];
    allClients.forEach(function(c){
      if(c.subscription_status !== 'active' && c.subscription_status !== 'trial'){ return; }
      // خطط الدفع المسبق (ميزة 7) تخزّن حدها بـ monthly_message_limit=0 بقصد (رصيدها الحقيقي
      // بعمود extra_message_credits) — لازم ما نتجاهلها هنا وإلا ما تظهر أبداً بتنبيه "قارب على الحد"
      const plan = plansList.find(function(p){ return p.id === c.plan_id; });
      if(!plan){ return; }
      const limit = plan.monthly_message_limit || 0;
      if(!plan.is_prepaid && !limit){ return; }
      const totalAllowance = limit + (c.extra_message_credits || 0);
      if(totalAllowance <= 0){ return; }
      const used = countByClient[c.id] || 0;
      const pct = Math.round((used / totalAllowance) * 100);
      if(pct >= 80){
        nearLimit.push({ client: c, used: used, total: totalAllowance, pct: pct });
      }
    });
    if(nearLimit.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="4">ما فيه عملاء قاربوا على الحد حالياً.</td></tr>';
      return;
    }
    nearLimit.sort(function(a,b){ return b.pct - a.pct; });
    tbody.innerHTML = '';
    nearLimit.forEach(function(item){
      const tr = document.createElement('tr');
      const badgeClass = item.pct >= 100 ? 'expired' : 'trialdays';
      tr.innerHTML =
        '<td>' + clientLabelById(item.client.id) + '</td>' +
        '<td>' + escapeHtml(plansMap[item.client.plan_id] || '—') + '</td>' +
        '<td>' + item.used.toLocaleString('en-US') + ' / ' + item.total.toLocaleString('en-US') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + item.pct + '%</span></td>';
      tbody.appendChild(tr);
    });
  }
  /* ---------- الشركاء بالعمولة ---------- */
  async function loadAffiliatesTab(){
    const tbody = document.getElementById('affiliatesTbody');
    const { data: affiliates, error } = await supabaseClient
      .from('affiliates')
      .select('id, full_name, email, phone, referral_code, commission_rate, status, created_at')
      .order('created_at', { ascending: false });
    if(error){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">تعذّر تحميل البيانات.</td></tr>';
      return;
    }
    if(!affiliates || affiliates.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">ما فيه طلبات شراكة بعد.</td></tr>';
      return;
    }
    // نحسب العمولة الشهرية التقديرية بشكل حي: 10% (أو نسبة كل شريك) من قيمة باقة كل عميل نشط ومدفوع أحاله هذا الشريك
    const { data: plans } = await supabaseClient.from('subscription_plans').select('id, monthly_price_sar');
    const priceMap = {};
    (plans || []).forEach(function(p){ priceMap[p.id] = p.monthly_price_sar; });
    const { data: referredClients } = await supabaseClient
      .from('clients')
      .select('id, affiliate_id, plan_id, is_paid, subscription_status')
      .not('affiliate_id', 'is', null);
    tbody.innerHTML = '';
    affiliates.forEach(function(a){
      const mine = (referredClients || []).filter(function(c){ return c.affiliate_id === a.id; });
      const activePaid = mine.filter(function(c){ return c.is_paid && c.subscription_status === 'active'; });
      const monthlyCommission = activePaid.reduce(function(sum, c){
        const price = priceMap[c.plan_id] || 0;
        return sum + (price * (a.commission_rate / 100));
      }, 0);
      const tr = document.createElement('tr');
      const dateStr = new Date(a.created_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
      tr.innerHTML =
        '<td><div class="biz-name">' + escapeHtml(a.full_name) + '</div><div class="biz-sub">' + escapeHtml(a.email) + ' • ' + escapeHtml(a.phone) + '</div></td>' +
        '<td><span class="ref-code">' + escapeHtml(a.referral_code) + '</span></td>' +
        '<td></td>' +
        '<td>' + mine.length + ' (' + activePaid.length + ' نشط ومدفوع)</td>' +
        '<td>' + monthlyCommission.toLocaleString('ar-SA') + ' ريال/شهر</td>' +
        '<td>' + dateStr + '</td>';
      const statusTd = tr.children[2];
      const select = document.createElement('select');
      select.className = 'status-select';
      ['pending','active','suspended'].forEach(function(s){
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = affiliateStatusLabels[s];
        if(s === a.status){ opt.selected = true; }
        select.appendChild(opt);
      });
      select.addEventListener('change', async function(){
        const newStatus = select.value;
        const { error: updErr } = await supabaseClient.from('affiliates').update({ status: newStatus }).eq('id', a.id);
        if(!updErr){ a.status = newStatus; }
      });
      statusTd.appendChild(select);
      tbody.appendChild(tr);
    });
  }
  /* ---------- العملاء المحتملون (ليدز بوت نبضة نفسه) ---------- */
  const leadStatusLabels = { new: 'جديد', contacted: 'تم التواصل', converted: 'تحول لعميل' };
  let allLeads = [];
  async function loadLeadsPanel(){
    const tbody = document.getElementById('leadsTbody');
    const { data, error } = await supabaseClient
      .from('nabda_leads')
      .select('id, name, phone, source, status, last_sent_template, last_sent_at')
      .order('created_at', { ascending: false });
    if(error){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">تعذّر تحميل الليدز، حدّث الصفحة.</td></tr>';
      return;
    }
    allLeads = data || [];
    renderLeadsTable();
  }
  function renderLeadsTable(){
    const tbody = document.getElementById('leadsTbody');
    if(allLeads.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">ما فيه ليدز مضافين بعد.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    allLeads.forEach(function(lead){
      const tr = document.createElement('tr');
      const nameSafe = escapeHtml(lead.name || '—');
      const phoneSafe = escapeHtml(lead.phone);
      const sourceSafe = escapeHtml(lead.source || '—');
      const lastSentStr = lead.last_sent_at
        ? new Date(lead.last_sent_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' })
        : '—';
      tr.innerHTML =
        '<td class="biz-name">' + nameSafe + '</td>' +
        '<td dir="ltr">' + phoneSafe + '</td>' +
        '<td>' + sourceSafe + '</td>' +
        '<td></td>' +
        '<td>' + lastSentStr + (lead.last_sent_template ? '<div class="biz-sub">' + escapeHtml(lead.last_sent_template) + '</div>' : '') + '</td>' +
        '<td></td>';
      const statusTd = tr.children[3];
      const actionTd = tr.children[5];
      const statusSelect = document.createElement('select');
      statusSelect.className = 'status-select';
      ['new','contacted','converted'].forEach(function(s){
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = leadStatusLabels[s];
        if(s === lead.status){ opt.selected = true; }
        statusSelect.appendChild(opt);
      });
      statusSelect.addEventListener('change', async function(){
        const newStatus = statusSelect.value;
        const { error: statusErr } = await supabaseClient
          .from('nabda_leads')
          .update({ status: newStatus })
          .eq('id', lead.id);
        if(!statusErr){ lead.status = newStatus; }
      });
      statusTd.appendChild(statusSelect);
      // منع الإرسال قبل ما تمر 14 يوم من آخر إرسال — حماية للحساب من الحظر، ونفس القيد مطبّق بالباك إند برضه
      const daysSinceLastSend = lead.last_sent_at ? (Date.now() - new Date(lead.last_sent_at).getTime()) / (1000 * 60 * 60 * 24) : Infinity;
      const canSend = daysSinceLastSend >= 14;
      [
        { key: 'free_trial_invite', label: 'قالب التجربة المجانية' },
        { key: 'new_business_intro', label: 'قالب التعريف بالمنصة' }
      ].forEach(function(t){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'link-btn lead-send-btn';
        btn.textContent = t.label;
        btn.disabled = !canSend;
        btn.title = canSend ? '' : 'لازم تمر 14 يوم من آخر إرسال لنفس الليد';
        btn.addEventListener('click', async function(){
          btn.disabled = true;
          btn.textContent = 'جاري الإرسال...';
          const { data: sessionData } = await supabaseClient.auth.getSession();
          const token = sessionData.session.access_token;
          try{
            const res = await fetch(FUNCTIONS_BASE + '/send-lead-outreach', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ lead_id: lead.id, template: t.key })
            });
            const resJson = await res.json();
            if(!res.ok){
              alert(resJson.error || 'تعذّر الإرسال.');
              btn.disabled = false;
              btn.textContent = t.label;
              return;
            }
            await loadLeadsPanel();
          } catch(e){
            alert('حصل خطأ بالاتصال، حاول مرة ثانية.');
            btn.disabled = false;
            btn.textContent = t.label;
          }
        });
        actionTd.appendChild(btn);
      });
      tbody.appendChild(tr);
    });
  }
  // يفكّك نص فيه أرقام متعددة (كل رقم بسطر أو مفصول بفاصلة/فاصلة منقوطة) إلى مصفوفة أرقام
  // منظّفة (أرقام + علامة + فقط)، مع إزالة التكرار داخل نفس الدفعة
  function parseLeadPhones(raw){
    const parts = raw.split(/[\n,;]+/).map(function(s){ return s.trim(); }).filter(Boolean);
    const cleaned = parts.map(function(p){ return p.replace(/[^\d+]/g, ''); }).filter(function(p){ return p.length >= 8; });
    const seen = new Set();
    const unique = [];
    cleaned.forEach(function(p){ if(!seen.has(p)){ seen.add(p); unique.push(p); } });
    return unique;
  }
  function updateLeadAddHint(){
    const phoneInput = document.getElementById('leadPhone');
    const hint = document.getElementById('leadAddHint');
    const submitBtn = document.getElementById('leadAddSubmitBtn');
    const phones = parseLeadPhones(phoneInput.value);
    hint.className = 'lead-add-hint';
    if(phones.length === 0){
      hint.textContent = '';
      submitBtn.textContent = '+ إضافة ليد';
      return;
    }
    const existingPhones = new Set((allLeads || []).map(function(l){ return l.phone; }));
    const alreadyExists = phones.filter(function(p){ return existingPhones.has(p); }).length;
    if(phones.length === 1){
      submitBtn.textContent = '+ إضافة ليد';
      hint.textContent = alreadyExists ? 'الرقم موجود مسبقاً بالقائمة — بيتم تجاهله.' : '';
      hint.classList.toggle('warn', alreadyExists > 0);
    } else {
      submitBtn.textContent = '+ إضافة ' + phones.length + ' ليدز';
      hint.textContent = 'سيتم إضافة ' + phones.length + ' ليد' + (alreadyExists ? '، وتجاهل ' + alreadyExists + ' رقم موجود مسبقاً' : '') + '. اسم الليد يُتجاهل عند إضافة أكثر من رقم.';
      hint.classList.add('ok');
    }
  }
  document.getElementById('leadPhone').addEventListener('input', updateLeadAddHint);
  document.getElementById('leadAddForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const nameInput = document.getElementById('leadName');
    const phoneInput = document.getElementById('leadPhone');
    const sourceInput = document.getElementById('leadSource');
    const hint = document.getElementById('leadAddHint');
    const phones = parseLeadPhones(phoneInput.value);
    if(phones.length === 0){
      hint.className = 'lead-add-hint warn';
      hint.textContent = 'ما فيه أرقام صالحة — تأكد من كتابة رقم واحد على الأقل.';
      return;
    }
    const existingPhones = new Set((allLeads || []).map(function(l){ return l.phone; }));
    const newPhones = phones.filter(function(p){ return !existingPhones.has(p); });
    const skippedDup = phones.length - newPhones.length;
    if(newPhones.length === 0){
      hint.className = 'lead-add-hint warn';
      hint.textContent = 'كل الأرقام اللي كتبتها موجودة مسبقاً بالقائمة.';
      return;
    }
    const source = sourceInput.value.trim() || null;
    const name = nameInput.value.trim() || null;
    const rows = newPhones.map(function(p, i){
      return { name: (newPhones.length === 1 && i === 0) ? name : null, phone: p, source: source };
    });
    const submitBtn = document.getElementById('leadAddSubmitBtn');
    submitBtn.disabled = true;
    const { error } = await supabaseClient.from('nabda_leads').insert(rows);
    submitBtn.disabled = false;
    if(error){
      hint.className = 'lead-add-hint warn';
      hint.textContent = 'تعذّر إضافة الليدز، حاول مرة ثانية.';
      return;
    }
    nameInput.value = ''; phoneInput.value = ''; sourceInput.value = '';
    await loadLeadsPanel();
    hint.className = 'lead-add-hint ok';
    hint.textContent = 'تمت إضافة ' + newPhones.length + ' ليد' + (skippedDup ? '، وتجاهل ' + skippedDup + ' رقم مكرر' : '') + '.';
    submitBtn.textContent = '+ إضافة ليد';
  });
