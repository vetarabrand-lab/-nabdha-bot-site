(function(){
  var header = document.querySelector('header');
  if(!header) return;
  var ticking = false;
  function upd(){ header.classList.toggle('is-stuck', (window.scrollY||0) > 8); ticking = false; }
  window.addEventListener('scroll', function(){
    if(!ticking){ ticking = true; requestAnimationFrame(upd); }
  }, { passive:true });
  upd();
})();
