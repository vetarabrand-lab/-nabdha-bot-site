  const FUNCTIONS_BASE = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1';

  function qs(name){
    return new URLSearchParams(window.location.search).get(name);
  }

  function show(id){
    ['loadingState','successState','failState','unknownState'].forEach(function(s){
      document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
  }

  // أي حالة غير نهائية (نجاح/فشل) نعتبرها معلّقة ونعيد الفحص
  function isPendingStatus(status){
    const FINAL = ['CAPTURED','FAILED','DECLINED','CANCELLED','CANCELED'];
    return FINAL.indexOf(status) === -1;
  }

  async function confirmPayment(){
    // مزود الدفع الوحيد: Geidea — يرجّع provider=geidea + mor (مرجعنا الخاص) في رابط الرجوع.
    const provider = qs('provider');
    const mor = qs('mor');

    let endpoint = null;
    if(provider === 'geidea' && mor){
      endpoint = FUNCTIONS_BASE + '/geidea-webhook?mor=' + encodeURIComponent(mor);
    }

    if(!endpoint){
      show('unknownState');
      return;
    }
    try{
      // Geidea أحياناً يرجّع العميل قبل ما يوصلنا تأكيد الدفع — لو الحالة لسا معلّقة نعيد الفحص
      // كل 3 ثواني لمدة ~30 ثانية قبل ما نعرض رسالة "قيد المعالجة"
      const POLL_INTERVAL_MS = 3000;
      const MAX_ATTEMPTS = 10;
      let res = null, json = {}, status = '';
      for(let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++){
        if(attempt > 0){ await new Promise(function(r){ setTimeout(r, POLL_INTERVAL_MS); }); }
        res = await fetch(endpoint, { cache: 'no-store' });
        json = await res.json().catch(function(){ return {}; });
        if(!res.ok){
          show('unknownState');
          return;
        }
        status = (json.status || '').toUpperCase();
        if(!isPendingStatus(status)) break;
      }

      const purpose = json.purpose || null;

      if(status === 'CAPTURED'){
        const title = document.getElementById('successTitle');
        const desc = document.getElementById('successDesc');
        const details = document.getElementById('successDetails');
        if(purpose === 'subscription'){
          title.textContent = 'تم تجديد اشتراكك بنجاح 🎉';
          desc.textContent = 'تم تأكيد الدفع وتمديد اشتراكك تلقائياً.';
        } else if(purpose === 'topup'){
          title.textContent = 'تم تفعيل رصيدك بنجاح 🎉';
          desc.textContent = 'تمت إضافة الرصيد الإضافي لحسابك تلقائياً.';
        } else {
          title.textContent = 'تم الدفع بنجاح';
          desc.textContent = 'شكراً لك، تم تأكيد عمليتك بنجاح.';
        }
        if(json.amount){
          details.style.display = 'block';
          details.textContent = 'المبلغ المدفوع: ';
          const amountEl = document.createElement('b');
          amountEl.textContent = String(json.amount) + ' ' + String(json.currency || 'SAR');
          details.appendChild(amountEl);
        }
        show('successState');
      } else if(status === 'FAILED' || status === 'DECLINED' || status === 'CANCELLED' || status === 'CANCELED'){
        show('failState');
      } else {
        // pending / initiated / أي حالة انتقالية — نعطي المستخدم رسالة مطمئنة بدل الخطأ
        show('unknownState');
      }
    } catch(e){
      show('unknownState');
    }
  }

  confirmPayment();
