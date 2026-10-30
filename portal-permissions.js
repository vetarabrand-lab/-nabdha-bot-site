(function(root){
  'use strict';
  var groups = [
    {key:'daily', ar:'التشغيل اليومي', en:'Daily operations'},
    {key:'growth', ar:'النمو والتحليل', en:'Growth and analytics'},
    {key:'settings', ar:'إعدادات المنصة', en:'Platform settings'}
  ];
  var definitions = [
    {key:'orders', group:'daily', ar:'الطلبات', en:'Orders', detail:'عرض طلبات المتجر وحالتها', detailEn:'View store orders and status', legacy:true},
    {key:'contacts', group:'daily', ar:'الأرقام', en:'Contacts', detail:'عرض الأرقام والبحث فيها؛ المزامنة لصاحب الحساب', detailEn:'View and search contacts; only the owner can sync'},
    {key:'carts', group:'growth', ar:'السلات المتروكة', en:'Abandoned carts', detail:'عرض السلات ومراحل التذكير', detailEn:'View carts and reminder stages'},
    {key:'analytics', group:'growth', ar:'التحليلات', en:'Analytics', detail:'عرض تقارير المحادثات والأداء', detailEn:'View conversation and performance reports'},
    {key:'templates', group:'growth', ar:'قوالب الرسائل', en:'Message templates', detail:'عرض القوالب وحالة اعتمادها', detailEn:'View templates and approval status'},
    {key:'channels', group:'settings', ar:'قنوات الربط', en:'Channels', detail:'عرض حالة القنوات المرتبطة', detailEn:'View connected channel status'},
    {key:'addons', group:'settings', ar:'الإضافات', en:'Add-ons', detail:'عرض الإضافات المتاحة', detailEn:'View available add-ons'},
    {key:'settings', group:'settings', ar:'إعدادات البوت', en:'Bot settings', detail:'عرض إعدادات البوت', detailEn:'View bot settings'}
  ];
  function allowed(permissions,key){
    var def=definitions.find(function(p){return p.key===key;});
    if(!def)return false;
    if(Object.prototype.hasOwnProperty.call(permissions||{},key))return permissions[key]===true;
    return def.legacy===true;
  }
  function canOpen(owner,permissions,key){
    if(owner)return true;
    if(['home','inbox','support'].indexOf(key)!==-1)return true;
    return allowed(permissions,key);
  }
  root.NabdhPermissions={definitions:definitions,groups:groups,allowed:allowed,canOpen:canOpen};
  if(typeof module!=='undefined')module.exports=root.NabdhPermissions;
})(typeof window!=='undefined'?window:globalThis);
