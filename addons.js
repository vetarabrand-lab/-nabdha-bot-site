const SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Wplf-GMXzJ-SXzNFvahGUQ_KHqjFTz3';
  const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function escapeHtml(str){
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  let selectedAddonId = null;
  let selectedAddonName = '';

  async function loadAddons(){
    const grid = document.getElementById('addonGrid');
    const { data, error } = await supabaseClient
      .from('addons')
      .select('id, name_ar, description_ar, price_sar, has_ongoing_cost')
      .eq('is_active', true)
      .order('sort_order');

    if(error || !data || data.length === 0){
      grid.innerHTML = '<div class="empty-msg">تعذّر تحميل الإضافات حالياً، حدّث الصفحة.</div>';
      return;
    }

    grid.innerHTML = '';
    data.forEach(function(a){
      const card = document.createElement('div');
      card.className = 'addon-card';
      card.innerHTML =
        '<h3>' + escapeHtml(a.name_ar) + '</h3>' +
        (a.has_ongoing_cost ? '<span class="cost-tag">تعتمد على استهلاك رصيدك من الرسائل</span>' : '') +
        '<p class="desc">' + escapeHtml(a.description_ar || '') + '</p>' +
        '<div class="addon-foot">' +
          '<div class="addon-price">' + Number(a.price_sar).toLocaleString('ar') + '<span>ريال دفعة وحدة</span></div>' +
          '<button type="button" class="want-btn" data-id="' + escapeHtml(a.id) + '" data-name="' + escapeHtml(a.name_ar) + '">أبي هذي الإضافة</button>' +
        '</div>';
      grid.appendChild(card);
    });

    document.querySelectorAll('.want-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ openRequestModal(btn.dataset.id, btn.dataset.name); });
    });
  }
  loadAddons();

  const requestModal = document.getElementById('requestModal');
  function openRequestModal(addonId, addonName){
    selectedAddonId = addonId;
    selectedAddonName = addonName;
    document.getElementById('modalAddonName').textContent = addonName;
    document.getElementById('modalError').style.display = 'none';
    document.getElementById('requestFormWrap').style.display = 'block';
    document.getElementById('modalSuccess').style.display = 'none';
    document.getElementById('requestForm').reset();
    if(typeof grecaptcha !== 'undefined'){ grecaptcha.reset(); }
    requestModal.classList.add('show');
  }
  function closeRequestModal(){ requestModal.classList.remove('show'); }
  document.getElementById('modalCancelBtn').addEventListener('click', closeRequestModal);
  document.getElementById('modalCloseSuccessBtn').addEventListener('click', closeRequestModal);
  requestModal.addEventListener('click', function(e){ if(e.target === requestModal){ closeRequestModal(); } });

  document.getElementById('requestForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errBox = document.getElementById('modalError');
    errBox.style.display = 'none';

    const websiteHp = document.getElementById('websiteHp').value.trim();
    const name = document.getElementById('reqName').value.trim();
    const phone = document.getElementById('reqPhone').value.trim();
    const email = document.getElementById('reqEmail').value.trim();

    if(!name || !phone){
      errBox.textContent = 'الرجاء تعبئة الاسم ورقم الجوال.';
      errBox.style.display = 'block';
      return;
    }

    const recaptchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
    if(!recaptchaToken){
      errBox.textContent = 'الرجاء تأكيد أنك لست روبوتاً قبل الإرسال.';
      errBox.style.display = 'block';
      return;
    }

    const submitBtn = document.getElementById('modalSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإرسال...';

    let ok = false;
    try{
      const res = await fetch(FUNCTIONS_BASE + '/request-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addon_id: selectedAddonId,
          contact_name: name,
          contact_phone: phone,
          contact_email: email || null,
          source: 'addons_page',
          recaptcha_token: recaptchaToken,
          website_hp: websiteHp
        })
      });
      const body = await res.json();
      if(res.ok && body && body.success){ ok = true; }
      else if(body && body.error){ errBox.textContent = body.error; errBox.style.display = 'block'; }
    } catch(err){
      console.error(err);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'إرسال الطلب';

    if(!ok){
      if(!errBox.textContent || errBox.style.display === 'none'){
        errBox.textContent = 'حصل خطأ أثناء إرسال طلبك، حاول مرة ثانية.';
        errBox.style.display = 'block';
      }
      if(typeof grecaptcha !== 'undefined'){ grecaptcha.reset(); }
      return;
    }

    document.getElementById('requestFormWrap').style.display = 'none';
    document.getElementById('modalSuccess').style.display = 'block';
  });
