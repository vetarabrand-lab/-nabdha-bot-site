(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* شريط تقدّم القراءة */
  var bar = document.createElement('div');
  bar.className = 'nb-progress';
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  var fill = bar.firstChild;

  /* حالة الهيدر عند التمرير */
  var header = document.querySelector('header');
  var ticking = false;
  function onScroll(){
    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    if(header){ header.classList.toggle('is-stuck', y > 12); }
    ticking = false;
  }
  window.addEventListener('scroll', function(){
    if(!ticking){ ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive:true });
  onScroll();

  /* تمييز رابط القسم الحالي في القائمة */
  var navLinks = Array.prototype.filter.call(
    document.querySelectorAll('.nav-links a[href^="#"]'),
    function(a){ return document.querySelector(a.getAttribute('href')); }
  );
  if(navLinks.length && 'IntersectionObserver' in window){
    var byId = {};
    navLinks.forEach(function(a){ byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          navLinks.forEach(function(a){ a.classList.remove('is-active'); });
          if(byId[e.target.id]) byId[e.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin:'-45% 0px -50% 0px' });
    navLinks.forEach(function(a){ spy.observe(document.querySelector(a.getAttribute('href'))); });
  }

  /* تدرّج زمني لظهور العناصر المتجاورة */
  if(!reduce){
    var seen = new Map();
    document.querySelectorAll('.reveal').forEach(function(el){
      var p = el.parentElement;
      var i = seen.get(p) || 0;
      if(i > 0){ el.style.setProperty('--d', Math.min(i * 75, 450) + 'ms'); }
      seen.set(p, i + 1);
    });
  }
})();
