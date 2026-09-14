/* رأس القسم الديناميكي + بطاقة الباقة في القائمة الجانبية */
(function(){
  var META = {
    inbox:     ['المحادثات','كل محادثات عملائك من واتساب وتيليجرام في مكان واحد.'],
    orders:    ['الطلبات','طلبات متجرك المربوط في جدول موحّد ومحدّث.'],
    support:   ['الدعم الفني','تذاكر الدعم والتواصل المباشر مع فريق نبضة.'],
    analytics: ['التحليلات','أداء البوت وأثره على مبيعاتك وخدمة عملائك.'],
    broadcast: ['الرسائل الجماعية','أرسل حملات واتساب بقوالب معتمدة لقاعدة عملائك.'],
    templates: ['قوالب الرسائل','أنشئ قوالب واتساب معتمدة بالذكاء الاصطناعي.'],
    channels:  ['قنوات الربط','اربط متجرك وقنوات التواصل ببوت نبضة.'],
    addons:    ['الإضافات','قدرات إضافية تفعّلها برسوم لمرة واحدة.'],
    settings:  ['إعدادات البوت','شخصية البوت وتعليماته وصلاحيات فريق العمل.']
  };
  var PANEL2TAB = {
    panelInbox:'inbox', panelOrders:'orders', panelSupport:'support', panelAnalytics:'analytics',
    panelBroadcast:'broadcast', panelTemplates:'templates', panelChannels:'channels',
    panelAddons:'addons', panelSettings:'settings'
  };
  var head, title, sub, lastKey = null;
  function sync(){
    head  = head  || document.getElementById('pageHead');
    title = title || document.getElementById('pageHeadTitle');
    sub   = sub   || document.getElementById('pageHeadSub');
    if(!head || !title || !sub){ return; }
    var panel = document.querySelector('.panel.active');
    if(!panel){ return; }
    var key = PANEL2TAB[panel.id];
    if(!key || key === lastKey){ return; }
    lastKey = key;
    title.textContent = (window.PT ? window.PT(META[key][0]) : META[key][0]);
    sub.textContent   = (window.PT ? window.PT(META[key][1]) : META[key][1]);
    if(panel.firstChild !== head){ panel.insertBefore(head, panel.firstChild); }
  }
  function syncPlan(){
    var el = document.getElementById('navFootPlan');
    var src = document.getElementById('statPlan');
    if(el && src){ el.textContent = src.textContent || '–'; }
  }
  function boot(){
    sync(); syncPlan();
    var panels = document.querySelectorAll('.panel');
    if(window.MutationObserver && panels.length){
      var obs = new MutationObserver(function(){ sync(); });
      panels.forEach(function(p){ obs.observe(p, { attributes:true, attributeFilter:['class'] }); });
      var plan = document.getElementById('statPlan');
      if(plan){ new MutationObserver(syncPlan).observe(plan, { childList:true, characterData:true, subtree:true }); }
    }
    document.addEventListener('click', function(e){
      if(e.target && e.target.closest && e.target.closest('.tab-btn')){ setTimeout(sync, 0); }
    });
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', boot); }
  else{ boot(); }
})();
