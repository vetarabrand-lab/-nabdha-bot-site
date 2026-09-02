(function(){
  var toggleBtn = document.getElementById('billingToggleBtn');
  var labelMonthly = document.getElementById('billingLabelMonthly');
  var labelAnnual = document.getElementById('billingLabelAnnual');
  if(!toggleBtn) return;

  var priceCards = document.querySelectorAll('#pricing .price-card');
  var isAnnual = false;

  function currentLang(){
    var root = document.getElementById('htmlRoot');
    return (root && root.getAttribute('lang') === 'en') ? 'en' : 'ar';
  }

  function fmt(n){
    return Number(n).toLocaleString('en-US');
  }

  function annualNoteText(total){
    return currentLang() === 'en'
      ? ('Billed ' + fmt(total) + ' SAR/year')
      : ('يُدفع ' + fmt(total) + ' ريال سنوياً');
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
          numEl.textContent = fmt(noteEl.dataset.annualMonthly);
          noteEl.textContent = annualNoteText(noteEl.dataset.annualTotal);
        } else {
          numEl.textContent = fmt(numEl.dataset.baseline);
          noteEl.textContent = '';
        }
      }

      if(ctaEl){
        var plan = isAnnual ? ctaEl.dataset.planAnnual : ctaEl.dataset.planMonthly;
        var href = ctaEl.getAttribute('href') || '';
        ctaEl.setAttribute('href', href.replace(/([?&]plan=)[^&]*/, '$1' + plan));
      }
    });

    toggleBtn.setAttribute('aria-checked', String(isAnnual));
    if(labelMonthly) labelMonthly.classList.toggle('is-active', !isAnnual);
    if(labelAnnual) labelAnnual.classList.toggle('is-active', isAnnual);
  }

  toggleBtn.addEventListener('click', function(){
    isAnnual = !isAnnual;
    render();
  });

  var langBtn = document.getElementById('langBtn');
  var langBtnMobile = document.getElementById('langBtnMobile');
  if(langBtn) langBtn.addEventListener('click', function(){ setTimeout(render, 0); });
  if(langBtnMobile) langBtnMobile.addEventListener('click', function(){ setTimeout(render, 0); });

  render();
})();
