(function(){
  'use strict';

  // مبدّل عملة الزائر في الهيدر بجانب زر اللغة.
  // يخزّن الاختيار في localStorage بنفس مفتاح قسم الباقات (nabda_currency)،
  // ويطلق حدث nabda:currency ليعيد قسم الباقات رسم الأسعار فوراً بلا إعادة تحميل.

  var KEY = 'nabda_currency';

  // التنسيق داخل السكربت ليعمل على كل صفحات الموقع بلا تكرار في كل ملف HTML
  var CSS = ''
    + '.currency-switch{position:relative;display:inline-flex;}'
    + '.currency-switch-btn{display:inline-flex;align-items:center;gap:5px;background:#fff;'
    + 'color:var(--wa-teal-dark,#0f5c4a);border:1.5px solid var(--border,#dfe8e4);font-weight:800;'
    + 'font-size:11.5px;padding:5px 11px;border-radius:100px;cursor:pointer;font-family:inherit;line-height:1;}'
    + '.currency-switch-btn:hover{border-color:var(--wa-teal,#18806a);}'
    + '.currency-switch-code{font-size:11.5px;font-weight:800;}'
    + '.currency-switch-menu{position:absolute;top:calc(100% + 8px);inset-inline-end:0;z-index:200;'
    + 'background:#fff;border:1.5px solid var(--border,#dfe8e4);border-radius:14px;'
    + 'box-shadow:0 14px 36px rgba(16,58,47,.14);padding:6px;min-width:172px;display:flex;'
    + 'flex-direction:column;gap:2px;}'
    + '.currency-switch-opt{display:flex;align-items:center;gap:10px;width:100%;background:transparent;'
    + 'border:0;border-radius:10px;cursor:pointer;padding:9px 11px;font-family:inherit;font-size:13.5px;'
    + 'color:var(--ink,#13241f);text-align:start;}'
    + '.currency-switch-opt b{min-width:28px;font-size:13px;font-weight:900;color:var(--wa-teal-dark,#0f5c4a);}'
    + '.currency-switch-opt:hover{background:#eef7f3;}'
    + '.currency-switch-opt.is-active{background:var(--wa-teal-dark,#0f5c4a);color:#fff;}'
    + '.currency-switch-opt.is-active b{color:#fff;}'
    + '.mobile-lang-row .currency-switch{margin-inline-start:8px;}'
    + '@media (max-width:860px){.nav-cta .currency-switch-holder{display:none;}}';

  function injectStyle(){
    if(document.getElementById('nabdaCurrencyStyle')) return;
    var s = document.createElement('style');
    s.id = 'nabdaCurrencyStyle';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var CURRENCIES = [
    { code: 'SAR', symbol: 'ر.س', ar: 'ريال سعودي', en: 'Saudi Riyal' },
    { code: 'USD', symbol: '$',   ar: 'دولار أمريكي', en: 'US Dollar' }
  ];

  function read(){
    try{
      var v = localStorage.getItem(KEY);
      return (v === 'USD' || v === 'SAR') ? v : 'SAR';
    }catch(e){ return 'SAR'; }
  }

  function write(code){
    try{ localStorage.setItem(KEY, code); }catch(e){}
  }

  function isEnglish(){
    var root = document.getElementById('htmlRoot') || document.documentElement;
    return root && root.getAttribute('lang') === 'en';
  }

  function meta(code){
    for(var i = 0; i < CURRENCIES.length; i++){
      if(CURRENCIES[i].code === code) return CURRENCIES[i];
    }
    return CURRENCIES[0];
  }

  function label(code){
    var m = meta(code);
    return isEnglish() ? m.en : m.ar;
  }

  function build(container, idSuffix){
    var current = read();

    var wrap = document.createElement('div');
    wrap.className = 'currency-switch';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'currency-switch-btn';
    btn.id = 'currencyBtn' + idSuffix;
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', isEnglish() ? 'Choose currency' : 'اختيار العملة');

    // أيقونة عملة محايدة (لا ترمز لعملة بعينها) + رمز العملة المختارة
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"'
      + ' stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="12" r="9"></circle>'
      + '<path d="M9.5 9.2a2.6 2.6 0 0 1 5 .6c0 2.4-3.4 2-3.4 4.2"></path>'
      + '<path d="M12 17.3h.01"></path>'
      + '</svg><span class="currency-switch-code"></span>';

    var list = document.createElement('div');
    list.className = 'currency-switch-menu';
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    CURRENCIES.forEach(function(c){
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'currency-switch-opt';
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-code', c.code);
      opt.innerHTML = '<b>' + c.symbol + '</b><span></span>';
      opt.addEventListener('click', function(){
        write(c.code);
        close();
        sync();
        document.dispatchEvent(new CustomEvent('nabda:currency', { detail: { currency: c.code } }));
      });
      list.appendChild(opt);
    });

    function close(){
      list.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    function open(){
      list.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if(list.hidden) open(); else close();
    });
    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') close();
    });

    wrap.appendChild(btn);
    wrap.appendChild(list);
    container.appendChild(wrap);

    function sync(){
      var code = read();
      var m = meta(code);
      btn.querySelector('.currency-switch-code').textContent = m.symbol;
      btn.setAttribute('title', label(code));
      btn.setAttribute('aria-label', (isEnglish() ? 'Currency: ' : 'العملة: ') + label(code));
      list.querySelectorAll('.currency-switch-opt').forEach(function(o){
        var c = o.getAttribute('data-code');
        o.querySelector('span').textContent = label(c);
        o.classList.toggle('is-active', c === code);
        o.setAttribute('aria-selected', String(c === code));
      });
    }

    sync();
    return sync;
  }

  function init(){
    injectStyle();
    var syncers = [];

    // نضع المبدّل بجانب زر اللغة أياً كانت حاوية الهيدر في الصفحة
    // (.nav-cta في الرئيسية و .nav-right في الصفحات الداخلية).
    var langBtn = document.getElementById('langBtn');
    var desktop = (langBtn && langBtn.parentNode) || document.querySelector('.nav-cta, .nav-right');
    if(desktop){
      var holder = document.createElement('span');
      holder.className = 'currency-switch-holder';
      if(langBtn && langBtn.parentNode === desktop) desktop.insertBefore(holder, langBtn.nextSibling);
      else desktop.insertBefore(holder, desktop.firstChild);
      syncers.push(build(holder, 'Desktop'));
    }

    var mobileRow = document.querySelector('.mobile-lang-row');
    if(mobileRow){ syncers.push(build(mobileRow, 'Mobile')); }

    function syncAll(){ syncers.forEach(function(fn){ fn(); }); }

    // تغيير اللغة يغيّر نص أسماء العملات
    ['langBtn', 'langBtnMobile'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.addEventListener('click', function(){ setTimeout(syncAll, 0); });
    });

    // تغيير العملة من قسم الباقات ينعكس على الهيدر أيضاً
    document.addEventListener('nabda:currency', syncAll);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
