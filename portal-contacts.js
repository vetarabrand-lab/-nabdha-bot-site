(function(){
  'use strict';
  var context, page=0, query='', generation=0, timer, debounce, busy=false;
  var size=50, filtered=0;
  function L(ar,en){return context && context.lang==='en' ? en : ar;}
  function el(id){return document.getElementById(id);}
  function text(id,value){var node=el(id);if(node)node.textContent=value;}
  function fmt(value){return Number(value||0).toLocaleString(context.lang==='en'?'en-US':'ar-SA');}
  function date(value){return value?new Date(value).toLocaleString(context.lang==='en'?'en-GB':'ar-SA',{dateStyle:'medium',timeStyle:'short'}):'—';}
  function active(){return context && (context.isOwner || context.canRead) && el('panelContacts').classList.contains('active') && document.getElementById('appScreen').style.display!=='none' && !document.hidden;}
  function base(){return context.db.from('whatsapp_contacts').select('phone_number,full_name,received_at',{count:'exact'}).eq('client_id',context.client.id).eq('source_phone_number_id',context.client.whatsapp_phone_number_id).eq('is_deleted',false);}
  function renderRows(rows){
    var body=el('contactsRows');body.replaceChildren();
    rows.forEach(function(row){
      var tr=document.createElement('tr'),name=document.createElement('td'),wrap=document.createElement('div'),avatar=document.createElement('span'),label=document.createElement('span');
      wrap.className='contact-name';avatar.className='contact-avatar';
      avatar.textContent=Array.from(row.full_name||'#')[0];label.textContent=row.full_name||L('بدون اسم','Unnamed');
      wrap.append(avatar,label);name.append(wrap);tr.append(name);
      var phone=document.createElement('td'),number=document.createElement('bdi');number.dir='ltr';number.textContent='+'+row.phone_number;phone.append(number);tr.append(phone);
      var updated=document.createElement('td');updated.textContent=date(row.received_at);tr.append(updated);body.append(tr);
    });
    el('contactsEmpty').hidden=rows.length>0;
    text('contactsEmpty',!query && !context.isOwner ? L('لا توجد أرقام محفوظة. اطلب من صاحب الحساب مزامنة الأرقام.','No saved contacts. Ask the owner to sync contacts.') : query?L('لا توجد أرقام مطابقة للبحث.','No matching contacts.'):L('اضغط «مزامنة جهات الاتصال» لإضافة الأرقام المتاحة من واتساب أعمال.','Select Sync contacts to import available WhatsApp Business contacts.'));
  }
  async function refresh(quiet){
    if(!context||!(context.isOwner || context.canRead)||!context.client.whatsapp_phone_number_id)return;
    var ticket=++generation;busy=true;el('contactsRefresh').disabled=true;text('contactsError','');el('contactsError').hidden=true;
    if(!quiet){el('contactsRows').replaceChildren();el('contactsEmpty').hidden=false;text('contactsEmpty',L('جارٍ تحميل الأرقام…','Loading contacts…'));}
    try{
      var q=base();
      // Keep PostgREST filter grammar out of user input; Arabic and English names/numbers remain searchable.
      var term=query.replace(/[^\p{L}\p{N}\s+@._-]/gu,' ').trim().slice(0,100).replace(/[%_]/g,' ');
      var digits=term.replace(/[٠-٩]/g,function(c){return String(c.charCodeAt(0)-1632);});
      if(term)q=q.or('full_name.ilike.%'+term+'%,phone_number.ilike.%'+digits.replace(/^\+/,'')+'%');
      var results=await Promise.all([
        q.order('full_name').order('phone_number').range(page*size,page*size+size-1),
        context.db.from('whatsapp_contacts').select('phone_number',{count:'exact',head:true}).eq('client_id',context.client.id).eq('source_phone_number_id',context.client.whatsapp_phone_number_id).eq('is_deleted',false),
        context.db.from('whatsapp_contacts').select('received_at').eq('client_id',context.client.id).eq('source_phone_number_id',context.client.whatsapp_phone_number_id).order('received_at',{ascending:false}).limit(1)
      ]);
      if(ticket!==generation)return;
      if(results.some(function(r){return r.error;}))throw new Error('load_failed');
      filtered=results[0].count||0;
      if(page>0 && page*size>=filtered){page=Math.max(0,Math.ceil(filtered/size)-1);return refresh(false);}
      renderRows(results[0].data||[]);text('contactsTotal',fmt(results[1].count));text('contactsLast',date(results[2].data[0]?.received_at));
      text('contactsPage',filtered ? fmt(page*size+1)+'–'+fmt(Math.min((page+1)*size,filtered))+L(' من ',' of ')+fmt(filtered):L('لا توجد نتائج','No results'));
      el('contactsPrev').disabled=page===0;el('contactsNext').disabled=(page+1)*size>=filtered;
    }catch(e){if(ticket!==generation)return;el('contactsError').hidden=false;text('contactsError',L('تعذّر تحميل الأرقام. أعد فتح القسم للمحاولة مجدداً.','Could not load contacts. Reopen this section to retry.'));if(!quiet){el('contactsRows').replaceChildren();el('contactsEmpty').hidden=true;}}
    finally{if(ticket===generation){busy=false;el('contactsRefresh').disabled=false;}}
  }
  function load(options){
    generation++;clearInterval(timer);clearTimeout(debounce);context=options;busy=false;page=0;query='';
    var root=el('contactsRoot');root.replaceChildren();
    if(!(context.isOwner || context.canRead)){root.textContent=L('هذا القسم متاح لصاحب الحساب فقط.','This section is available to the account owner only.');return;}
    root.innerHTML='<div class="contacts-head"><div><h2 id="contactsTitle"></h2><p class="contacts-sub" id="contactsDescription"></p></div><button type="button" id="contactsRefresh"></button></div><div class="contacts-notice" id="contactsStatus"></div><div class="contacts-notice contacts-error" id="contactsError" role="alert" hidden></div><div class="contacts-stats"><div class="contacts-stat"><span id="contactsTotalLabel"></span><b id="contactsTotal">—</b></div><div class="contacts-stat"><span id="contactsNumberLabel"></span><bdi id="contactsSource" dir="ltr">—</bdi></div><div class="contacts-stat"><span id="contactsLastLabel"></span><b id="contactsLast">—</b></div></div><div class="contacts-card"><div class="contacts-tools"><label for="contactsSearch" id="contactsSearchLabel"></label><input type="search" id="contactsSearch" maxlength="100" autocomplete="off"></div><div class="contacts-scroll"><table><thead><tr><th id="contactsNameHeading" scope="col"></th><th id="contactsPhoneHeading" scope="col"></th><th id="contactsDateHeading" scope="col"></th></tr></thead><tbody id="contactsRows"></tbody></table></div><div id="contactsEmpty" class="contacts-empty" role="status"></div><div class="contacts-foot"><span id="contactsPage" aria-live="polite"></span><div><button id="contactsPrev" type="button" disabled></button> <button id="contactsNext" type="button" disabled></button></div></div></div>';
    text('contactsTitle',L('الأرقام','Contacts'));text('contactsDescription',L('جهات اتصال واتساب أعمال، مجمّعة في مكان واحد.','Your WhatsApp Business contacts, all in one place.'));
    text('contactsRefresh',L('مزامنة جهات الاتصال','Sync contacts'));text('contactsTotalLabel',L('جهات الاتصال','Contacts'));text('contactsNumberLabel',L('رقم واتساب المرتبط','Connected WhatsApp number'));text('contactsLastLabel',L('آخر تحديث مستلم','Last received update'));text('contactsSource',context.client.whatsapp_display_number||'—');
    text('contactsSearchLabel',L('البحث','Search'));el('contactsSearch').placeholder=L('ابحث بالاسم أو رقم الهاتف','Search by name or phone number');
    text('contactsNameHeading',L('الاسم','Name'));text('contactsPhoneHeading',L('رقم الهاتف','Phone number'));text('contactsDateHeading',L('آخر تحديث','Last updated'));text('contactsPrev',L('السابق','Previous'));text('contactsNext',L('التالي','Next'));
    var connected=context.client.whatsapp_phone_number_id;
    text('contactsStatus',!connected?L('اربط تطبيق واتساب أعمال من «قنوات الربط» لعرض جهات اتصاله.','Connect WhatsApp Business in Channels to see its contacts.'):context.client.coexistence_status==='active'?L('لن تُضاف الأرقام أو تحديثاتها تلقائياً. اضغط «مزامنة جهات الاتصال» لاستيراد أحدث البيانات المتاحة من واتساب أعمال.','Contacts and changes are imported only when you select Sync contacts.'):L('ربط واتساب أعمال غير نشط حالياً. تظهر البيانات المحفوظة سابقاً لهذا الرقم إن وجدت.','WhatsApp Business coexistence is not active. Previously received contacts for this number remain visible.'));
    el('contactsRefresh').hidden=!context.isOwner;
    if(!context.isOwner)text('contactsStatus',L('يمكنك عرض الأرقام المحفوظة والبحث فيها. مزامنة الأرقام متاحة لصاحب الحساب فقط.','You can view and search saved contacts. Only the owner can sync contacts.'));
    el('contactsRefresh').onclick=async function(){
      if(busy || !context.isOwner)return;
      var syncContext=context;var ticket=++generation;busy=true;this.disabled=true;el('contactsSearch').disabled=true;el('contactsPrev').disabled=true;el('contactsNext').disabled=true;text('contactsRefresh',L('جارٍ المزامنة…','Syncing…'));el('contactsError').hidden=true;
      try{
        var result=await context.db.rpc('sync_whatsapp_contacts',{p_client_id:context.client.id});
        if(ticket!==generation)return;
        if(result.error)throw new Error('sync_failed');
        page=0;query='';el('contactsSearch').value='';await refresh(false);
      }catch(e){if(ticket===generation){el('contactsError').hidden=false;text('contactsError',L('تعذّرت المزامنة. حاول مرة أخرى.','Sync failed. Please try again.'));}}
      finally{if(context===syncContext&&el('contactsRefresh')){el('contactsSearch').disabled=false;busy=false;el('contactsRefresh').disabled=false;text('contactsRefresh',L('مزامنة جهات الاتصال','Sync contacts'));}}
    };
    el('contactsPrev').onclick=function(){if(page>0){page--;refresh(false);}};
    el('contactsNext').onclick=function(){if((page+1)*size<filtered){page++;refresh(false);}};
    el('contactsSearch').oninput=function(){generation++;query=this.value;page=0;clearTimeout(debounce);debounce=setTimeout(function(){refresh(false);},300);};
    if(!connected){el('contactsRefresh').disabled=true;el('contactsSearch').disabled=true;text('contactsEmpty',L('لا يوجد رقم واتساب مرتبط.','No WhatsApp number connected.'));return;}
    refresh(false);
  }
  function reset(){generation++;clearInterval(timer);clearTimeout(debounce);context=null;busy=false;var root=el('contactsRoot');if(root)root.replaceChildren();}
  window.NabdhContacts={load:load,reset:reset};
})();
