(function(){
  var ordersEl = document.getElementById('calcOrders');
  var aovEl = document.getElementById('calcAov');
  var sentenceEl = document.getElementById('calcSentence');
  if(!ordersEl || !aovEl || !sentenceEl) return;

  var LOSS_RATE = 0.28;      // نسبة الإيراد المقدّرة كخسارة شهرية من السلات المتروكة والردود المتأخرة
  var RECOVERY_RATE = 0.69;  // نسبة الخسارة اللي نبضة تقدر ترجّعها بردودها الفورية

  function fmt(n){
    n = Math.max(0, Math.round(n));
    return n.toLocaleString('en-US');
  }

  function currentLang(){
    var root = document.getElementById('htmlRoot');
    return (root && root.getAttribute('lang') === 'en') ? 'en' : 'ar';
  }

  function render(){
    var orders = parseFloat(ordersEl.value);
    var aov = parseFloat(aovEl.value);
    if(!isFinite(orders) || orders < 0) orders = 0;
    if(!isFinite(aov) || aov < 0) aov = 0;
    orders = Math.min(orders, 1000000);
    aov = Math.min(aov, 1000000);

    var revenue = orders * aov;
    var loss = revenue * LOSS_RATE;
    var recoverable = loss * RECOVERY_RATE;

    var lossStr = fmt(loss);
    var recoverStr = fmt(recoverable);

    if(currentLang() === 'en'){
      sentenceEl.innerHTML = 'Your store loses roughly <b>' + lossStr + ' SAR</b> every month from abandoned carts and slow replies — Nabdha can recover about <b>' + recoverStr + ' SAR</b> of that.';
    } else {
      sentenceEl.innerHTML = 'متجرك يخسر تقريباً <b>' + lossStr + ' ريال</b> شهرياً من السلات المتروكة والردود المتأخرة — نبضة ترجّع منها <b>~' + recoverStr + ' ريال</b>.';
    }
  }

  ['input', 'change'].forEach(function(evt){
    ordersEl.addEventListener(evt, render);
    aovEl.addEventListener(evt, render);
  });

  var langBtn = document.getElementById('langBtn');
  var langBtnMobile = document.getElementById('langBtnMobile');
  if(langBtn) langBtn.addEventListener('click', function(){ setTimeout(render, 0); });
  if(langBtnMobile) langBtnMobile.addEventListener('click', function(){ setTimeout(render, 0); });

  render();
})();
