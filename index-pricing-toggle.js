(function(){
  var toggleBtn = document.getElementById('billingToggleBtn');
  var labelMonthly = document.getElementById('billingLabelMonthly');
  var labelAnnual = document.getElementById('billingLabelAnnual');
  if(!toggleBtn) return;

  var priceCards = document.querySelectorAll('#pricing .price-card');
  var isAnnual = false;

  // الريال مربوط بالدولار بسعر ثابت 3.75، فالتحويل مستقر ولا يحتاج تحديثاً.
  var SAR_PER_USD = 3.75;
  var currency = 'SAR';
  try{ var saved = localStorage.getItem('nabda_currency'); if(saved === 'USD' || saved === 'SAR') currency = saved; }catch(e){}

  function toDisplay(sarValue){
    var n = Number(sarValue) || 0;
    return currency === 'USD' ? Math.round(n / SAR_PER_USD) : n;
  }
  function unitLabel(){
    var en = currentLang() === 'en';
    if(currency === 'USD') return en ? 'USD / month' : 'دولار / شهرياً';
    return en ? 'SAR / month' : 'ريال / شهرياً';
  }

  function currentLang(){
    var root = document.getElementById('htmlRoot');
    return (root && root.getAttribute('lang') === 'en') ? 'en' : 'ar';
  }

  function fmt(n){
    return Number(n).toLocaleString('en-US');
  }

  function annualNoteText(totalSar){
    var v = fmt(toDisplay(totalSar));
    var en = currentLang() === 'en';
    if(currency === 'USD') return en ? ('Billed ' + v + ' USD/year') : ('يُدفع ' + v + ' دولار سنوياً');
    return en ? ('Billed ' + v + ' SAR/year') : ('يُدفع ' + v + ' ريال سنوياً');
  }

  function render(){
    priceCards.forEach(function(card){
      var numEl = card.querySelector('.price-num');
      var noteEl = card.querySelector('.price-annual-note');
      var ctaEl = card.querySelector('a[data-plan-monthly]');

      if(numEl && noteEl){
        var monthly = numEl.dataset.baseline || numEl.textContent.replace(/,/g, '');
        // نخزّن القيمة الشهرية الأصلية أول مرة عشان نرجع لها عند إلغاء التفعيل
        if(!numEl.dataset.baseline){ numEl.dataset.baseline = monthly; }

        if(isAnnual){
          var annualTotal = Number(noteEl.dataset.annualTotal);
          var annualMonthly = Number(noteEl.dataset.annualMonthly);

          numEl.textContent = fmt(toDisplay(annualMonthly));
          noteEl.textContent = annualNoteText(annualTotal);
        } else {
          numEl.textContent = fmt(toDisplay(numEl.dataset.baseline));
          noteEl.textContent = '';
        }
      }

      var unitEl = card.querySelector('.price-value span');
      if(unitEl) unitEl.textContent = unitLabel();

      if(ctaEl){
        var plan = isAnnual ? ctaEl.dataset.planAnnual : ctaEl.dataset.planMonthly;
        var href = ctaEl.getAttribute('href') || '';
        ctaEl.setAttribute('href', href.replace(/([?&]plan=)[^&]*/, '$1' + plan));
      }
    });

    toggleBtn.setAttribute('aria-checked', String(isAnnual));
    if(labelMonthly) labelMonthly.classList.toggle('is-active', !isAnnual);
    if(labelAnnual) labelAnnual.classList.toggle('is-active', isAnnual);

    document.querySelectorAll('.currency-opt').forEach(function(b){
      b.classList.toggle('is-active', b.getAttribute('data-currency') === currency);
    });

    // الرصيد المسبق (دفعة واحدة)
    var prepaidNum = document.querySelector('.prepaid-num');
    if(prepaidNum){
      var baseSar = Number(prepaidNum.dataset.sar) || 0;
      prepaidNum.textContent = fmt(toDisplay(baseSar));
      var prepaidUnit = prepaidNum.parentElement && prepaidNum.parentElement.querySelector('span');
      if(prepaidUnit){
        var en = currentLang() === 'en';
        prepaidUnit.textContent = currency === 'USD'
          ? (en ? 'USD one-time - 5,000 replies' : 'دولار دفعة وحدة · 5,000 رد')
          : (en ? 'SAR one-time - 5,000 replies' : 'ريال دفعة وحدة · 5,000 رد');
      }
    }
  }

  toggleBtn.addEventListener('click', function(){
    isAnnual = !isAnnual;
    render();
  });

  document.querySelectorAll('.currency-opt').forEach(function(b){
    b.addEventListener('click', function(){
      currency = b.getAttribute('data-currency') === 'USD' ? 'USD' : 'SAR';
      try{ localStorage.setItem('nabda_currency', currency); }catch(e){}
      render();
      document.dispatchEvent(new CustomEvent('nabda:currency', { detail: { currency: currency } }));
    });
  });

  // تغيير العملة من مبدّل الهيدر ينعكس على الأسعار فوراً
  document.addEventListener('nabda:currency', function(e){
    var code = e && e.detail && e.detail.currency;
    if(code !== 'USD' && code !== 'SAR') return;
    if(code === currency) return;
    currency = code;
    render();
  });

  var langBtn = document.getElementById('langBtn');
  var langBtnMobile = document.getElementById('langBtnMobile');
  if(langBtn) langBtn.addEventListener('click', function(){ setTimeout(render, 0); });
  if(langBtnMobile) langBtnMobile.addEventListener('click', function(){ setTimeout(render, 0); });

  render();
})();
