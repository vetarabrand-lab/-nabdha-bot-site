const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=fs.readFileSync('portal.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
 await page.setContent(html);
 await page.addStyleTag({path:path.resolve('portal-contacts.css')});
 await page.addScriptTag({path:path.resolve('portal-contacts.js')});
 await page.evaluate(()=>{
  document.querySelectorAll('.login-wrap,#forgotScreen,#resetScreen,body>header').forEach(e=>e.style.display='none');
  document.getElementById('appScreen').style.display='block';document.body.classList.add('v2-in-app');
  document.querySelectorAll('.panel,.tab-btn').forEach(e=>e.classList.remove('active'));
  document.getElementById('panelContacts').classList.add('active');
  const btn=document.querySelector('[data-tab="contacts"]');btn.style.display='inline-block';btn.classList.add('active');
  document.getElementById('v2Title').textContent='الأرقام';
  window.mockRows=Array.from({length:1508},(_,i)=>({full_name:'عميل '+String(i).padStart(4,'0'),phone_number:'9665'+String(i).padStart(8,'0'),received_at:'2026-10-29T17:20:48Z'}));
  window.mockRows[0].full_name='<img src=x onerror=alert(1)>';
  window.synced=false;window.syncCalls=0;
  window.db={async rpc(){window.syncCalls++;if(window.mockError)return {error:{message:'test'}};window.synced=true;return {data:1508,error:null}},from(){let head=false,count=false,term='',lo=0,hi=999,limit=null;return {
   select(s,o){head=!!o?.head;count=!!o?.count;return this},eq(){return this},or(s){term=s.split('full_name.ilike.%')[1].split('%')[0];return this},order(){return this},range(a,b){lo=a;hi=b;return this},limit(n){limit=n;return this},
   then(resolve){let rows=(window.synced?window.mockRows:[]).filter(r=>!term||r.full_name.includes(term)||r.phone_number.includes(term));resolve(window.mockError?{error:{message:'test'}}:{data:head?null:rows.slice(lo,limit===null?hi+1:limit),count:count?rows.length:null,error:null})}
  }}};
  window.options={db:window.db,client:{id:'test',whatsapp_phone_number_id:'test-number',whatsapp_display_number:'+966547300317',coexistence_status:'active'},isOwner:true,lang:'ar'};
  window.NabdhContacts.load(window.options);
 });
 await page.waitForFunction(()=>document.querySelector('#contactsEmpty').textContent.includes('اضغط'));
 assert.equal(await page.evaluate(()=>window.syncCalls),0);
 assert.equal(await page.locator('#contactsRows tr').count(),0);
 await page.locator('#contactsRefresh').click();
 await page.waitForFunction(()=>document.querySelectorAll('#contactsRows tr').length===50);
 assert.equal(await page.locator('#contactsRows img').count(),0);
 await page.locator('#contactsNext').click();await page.waitForFunction(()=>document.querySelector('#contactsRows').textContent.includes('عميل 0050'));
 await page.locator('#contactsSearch').fill('عميل 1507');await page.waitForFunction(()=>document.querySelectorAll('#contactsRows tr').length===1);
 await page.locator('#contactsSearch').fill('غير موجود');await page.waitForFunction(()=>document.querySelector('#contactsEmpty').textContent.includes('مطابقة'));
 await page.locator('#contactsSearch').fill('');await page.waitForFunction(()=>document.querySelectorAll('#contactsRows tr').length===50);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'../contacts-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.body.classList.remove('v2-menu-open');window.scrollTo(0,0)});
 await page.waitForFunction(()=>document.querySelector('.v2-side').getBoundingClientRect().left>=window.innerWidth-1);
 await page.screenshot({path:'../contacts-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Page must not overflow horizontally');
 await page.evaluate(()=>{window.mockError=true});await page.locator('#contactsRefresh').click();await page.waitForFunction(()=>!document.querySelector('#contactsError').hidden);
 await page.evaluate(()=>{window.mockError=false});await page.locator('#contactsRefresh').click();await page.waitForFunction(()=>document.querySelectorAll('#contactsRows tr').length===50);
 await page.evaluate(()=>window.NabdhContacts.load({...window.options,isOwner:false}));assert.match(await page.locator('#contactsRoot').textContent(),/صاحب الحساب/);
 await page.evaluate(()=>window.NabdhContacts.load({...window.options,client:{id:'none'}}));assert.match(await page.locator('#contactsEmpty').textContent(),/لا يوجد رقم/);
 assert.deepEqual(errors,[]);console.log('PASS: paging beyond 1000, search/empty/error/retry, safe text rendering, owner guard, disconnected state, mobile overflow.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
