(function(){
    var toggle = document.getElementById('nabdaWaToggle');
    var panel = document.getElementById('nabdaWaPanel');
    var closeBtn = document.getElementById('nabdaWaClose');
    if(!toggle || !panel) return;
    toggle.addEventListener('click', function(e){ e.stopPropagation(); panel.classList.toggle('open'); });
    if(closeBtn){ closeBtn.addEventListener('click', function(e){ e.stopPropagation(); panel.classList.remove('open'); }); }
    document.addEventListener('click', function(e){
      if(!panel.contains(e.target) && !toggle.contains(e.target)){ panel.classList.remove('open'); }
    });
  })();
