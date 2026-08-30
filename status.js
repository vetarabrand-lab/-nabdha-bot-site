const SUPABASE_URL = 'https://anptuwcfvfcjqtqqnirt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Wplf-GMXzJ-SXzNFvahGUQ_KHqjFTz3';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function setStatus(elId, ok){
    const el = document.getElementById(elId);
    el.className = 'comp-status ' + (ok ? 'ok' : 'down');
    el.innerHTML = '<span class="dot"></span> ' + (ok ? 'يعمل' : 'متوقف');
    return ok;
  }

  async function checkDb(){
    try{
      const { error } = await supabaseClient.from('subscription_plans').select('id').limit(1);
      return setStatus('dbStatus', !error);
    }catch(e){
      return setStatus('dbStatus', false);
    }
  }

  async function checkFunctions(){
    try{
      const res = await fetch(SUPABASE_URL + '/functions/v1/health');
      return setStatus('fnStatus', res.ok);
    }catch(e){
      return setStatus('fnStatus', false);
    }
  }

  async function runChecks(){
    const [dbOk, fnOk] = await Promise.all([checkDb(), checkFunctions()]);
    const banner = document.getElementById('overallBanner');
    const text = document.getElementById('overallText');

    if(dbOk && fnOk){
      banner.className = 'overall-banner ok';
      text.textContent = '🟢 جميع الأنظمة تعمل بشكل طبيعي';
    } else if(dbOk || fnOk){
      banner.className = 'overall-banner warn';
      text.textContent = '🟡 بعض المكونات تواجه اضطراباً جزئياً';
    } else {
      banner.className = 'overall-banner down';
      text.textContent = '🔴 هناك انقطاع في الخدمة حالياً';
    }

    document.getElementById('lastUpdated').textContent = 'آخر فحص: ' + new Date().toLocaleString('ar-SA', { hour:'2-digit', minute:'2-digit', day:'numeric', month:'short', year:'numeric' });
  }

  runChecks();
