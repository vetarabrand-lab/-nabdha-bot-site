(function(){
  'use strict';
  var selected='SAR', dialog, opener;
  try{if(localStorage.getItem('nabda_currency')==='USD')selected='USD';}catch(e){}
  function en(){return document.documentElement.lang==='en';}
  function number(sar){return (Number(sar)/(selected==='USD'?3.75:1)).toLocaleString('en-US',{minimumFractionDigits:selected==='USD'?2:0,maximumFractionDigits:2});}
  function unit(){return selected==='USD'?(en()?'USD':'دولار'):(en()?'SAR':'ريال');}
  function html(sar,withUnit){
    var n=Number(sar);if(!Number.isFinite(n))return '—';
    return '<span data-nabdh-sar="'+n+'"'+(withUnit?' data-money-unit="true"':'')+'>'+number(n)+(withUnit?' '+unit():'')+'</span>';
  }
  function render(){
    document.querySelectorAll('[data-nabdh-sar]').forEach(function(el){
      var value=number(el.dataset.nabdhSar)+(el.dataset.moneyUnit==='true'?' '+unit():'');
      if(el.textContent!==value)el.textContent=value;
    });
    document.querySelectorAll('[data-currency-unit]').forEach(function(el){if(el.textContent!==unit())el.textContent=unit();});
    document.querySelectorAll('.currency-trigger').forEach(function(btn){
      if(btn.querySelector('span').textContent!==selected)btn.querySelector('span').textContent=selected;
      btn.setAttribute('aria-label',en()?'Choose currency':'اختيار العملة');
    });
    document.querySelectorAll('[data-currency-disclaimer]').forEach(function(el){
      el.hidden=selected!=='USD';
      var text=en()?'Prices shown in USD at 1 USD = 3.75 SAR. Payment is charged in Saudi riyals.':'الأسعار بالدولار على أساس 1 دولار = 3.75 ريال. يتم الدفع بالريال السعودي.';
      if(el.textContent!==text)el.textContent=text;
    });
  }
  function set(value){
    if(value!=='SAR'&&value!=='USD')return;
    selected=value;try{localStorage.setItem('nabda_currency',value);}catch(e){}
    render();window.dispatchEvent(new CustomEvent('nabdh:currencychange',{detail:{currency:value}}));
  }
  function open(button){
    opener=button;
    dialog.querySelector('h2').textContent=en()?'Choose display currency':'اختر عملة عرض الأسعار';
    dialog.querySelector('[data-value="SAR"]').textContent=en()?'Saudi riyal — SAR':'الريال السعودي — SAR';
    dialog.querySelector('[data-value="USD"]').textContent=en()?'US dollar — USD':'الدولار الأمريكي — USD';
    dialog.querySelectorAll('[data-value]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.value===selected));});
    dialog.querySelector('p').textContent=en()?'1 USD = 3.75 SAR. Payment is charged in Saudi riyals.':'1 دولار = 3.75 ريال. يتم الدفع بالريال السعودي.';
    dialog.querySelector('.currency-close').setAttribute('aria-label',en()?'Close':'إغلاق');
    dialog.showModal();dialog.querySelector('[data-value="'+selected+'"]').focus();
  }
  function trigger(){
    var btn=document.createElement('button');btn.type='button';btn.className='currency-trigger';btn.setAttribute('aria-haspopup','dialog');
    btn.innerHTML='<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="9" r="6"/><path d="M15 9a6 6 0 1 1-6 6M9 5v8m2-6H8a1 1 0 0 0 0 2h2a1 1 0 0 1 0 2H7"/></svg><span>SAR</span>';
    btn.onclick=function(){open(btn);};return btn;
  }
  function boot(){
    dialog=document.createElement('dialog');dialog.className='currency-dialog';dialog.setAttribute('aria-labelledby','currencyTitle');
    dialog.innerHTML='<button type="button" class="currency-close">×</button><h2 id="currencyTitle"></h2><div class="currency-options"><button type="button" data-value="SAR"></button><button type="button" data-value="USD"></button></div><p></p>';
    document.body.append(dialog);
    dialog.querySelector('.currency-close').onclick=function(){dialog.close();};
    dialog.querySelectorAll('[data-value]').forEach(function(b){b.onclick=function(){set(b.dataset.value);dialog.close();};});
    dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',function(){if(opener)opener.focus();});
    document.querySelectorAll('#langBtn,#langBtnMobile,#v2LangBtn').forEach(function(b){b.before(trigger());});
    document.querySelectorAll('[data-currency-slot]').forEach(function(slot){slot.append(trigger());});
    render();
    var queued=false;
    new MutationObserver(function(){if(queued)return;queued=true;queueMicrotask(function(){queued=false;render();});}).observe(document.body,{childList:true,subtree:true});
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }
  window.NabdhCurrency={number:number,unit:unit,html:html,set:set,get:function(){return selected;},render:render};
  window.addEventListener('storage',function(e){if(e.key==='nabda_currency'){selected=e.newValue==='USD'?'USD':'SAR';render();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
