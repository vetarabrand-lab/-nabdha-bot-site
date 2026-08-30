  const FUNCTIONS_BASE = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1';

  function qs(name){
    return new URLSearchParams(window.location.search).get(name);
  }

  function show(id){
    ['loadingState','successState','failState','unknownState'].forEach(function(s){
      document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
  }

  async function confirmPayment(){
    // نحدد مزود الدفع من رابط الرجوع: N-Genius يرجّع provider=ngenius + mor (مرجعنا الخاص)،
    // Tap (القديم) يرجّع tap_id أو id مباشرة.
    const provider = qs('provider');
    const mor = qs('mor');
    const tapId = qs('tap_id') || qs('id');

    let endpoint = null;
    if(provider === 'ngenius' && mor){
      endpoint = FUNCTIONS_BASE + '/ngenius-webhook?mor=' + encodeURIComponent(mor);
    } else if(tapId){
      endpoint = FUNCTIONS_BASE + '/tap-webhook?tap_id=' + encodeURIComponent(tapId);
    }

    if(!endpoint){
      show('unknownState');
      return;
    }
    try{
      const res = await fetch(endpoint);
      const json = await res.json().catch(function(){ return {}; });

      if(!res.ok){
        show('unknownState');
        return;
      }

      const status = (json.status || '').toUpperCase();
      const purpose = json.purpose || null;

      if(status === 'CAPTURED'){
        const title = document.getElementById('successTitle');
        const desc = document.getElementById('successDesc');
        const details = document.getElementById('successDetails');
        if(purpose === 'subscription'){
          title.textContent = 'تم تجديد اشتراكك بنجاح 🎉';
          desc.textContent = 'تم تفعيل اشتراكك وتمديد دورتك الشهرية تلقائياً.';
        } else if(purpose === 'topup'){
          title.textContent = 'تم تفعيل رصيدك بنجاح 🎉';
          desc.textContent = 'تمت إضافة الرصيد الإضافي لحسابك تلقائياً.';
        } else {
          title.textContent = 'تم الدفع بنجاح';
          desc.textContent = 'شكراً لك، تم تأكيد عمليتك بنجاح.';
        }
        if(json.amount){
          details.style.display = 'block';
          details.innerHTML = 'المبلغ المدفوع: <b>' + json.amount + ' ' + (json.currency || 'SAR') + '</b>';
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
