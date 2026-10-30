const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 async function mount(file){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith('https://commerce.test/')?route.fulfill({contentType:'text/html',body:fs.readFileSync(file+'.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'')}):route.abort());
  await page.goto('https://commerce.test/'+file+'.html');
  await page.evaluate(()=>{
   window.PORTAL_LANG='ar';window.PT=x=>x;
   window.mockPlans=[{id:'monthly',code:'growth',name_ar:'نمو',billing_cycle:'monthly',monthly_price_sar:199,monthly_message_limit:2500},{id:'annual',code:'growth_annual',name_ar:'نمو (سنوي)',billing_cycle:'annual',monthly_price_sar:1990,monthly_message_limit:2500}];
   window.supabase={createClient:()=>({auth:{onAuthStateChange(){},getSession:()=>new Promise(()=>{})},from(table){return new Proxy({},{get(_,key){if(key==='then')return resolve=>resolve({data:table==='subscription_plans'?window.mockPlans:table==='addons'?[{id:'service',name_ar:'خدمة تجريبية',price_sar:399}]:[],error:null});return function(){return this;};}});}})};
  });
  await page.addScriptTag({path:path.resolve('currency.js')});
  if(file==='portal')await page.addScriptTag({path:path.resolve('portal-permissions.js')});
  await page.addScriptTag({path:path.resolve(file+'.js')});
  return {page,errors};
 }
 const signup=await mount('signup');
 await signup.page.waitForSelector('.plan-card');
 await signup.page.evaluate(()=>{planTab='monthly';renderPlans();NabdhCurrency.set('USD');});
 await signup.page.waitForFunction(()=>document.querySelector('.p-price b').textContent==='53.07');
 assert.match(await signup.page.locator('.p-limit').first().textContent(),/2,500/);
 await signup.page.evaluate(()=>{planTab='annual';renderPlans();});
 await signup.page.waitForFunction(()=>document.querySelector('.p-note').textContent.includes('530.67'));
 assert.equal(await signup.page.locator('.p-price b').first().textContent(),'44.22');
 assert.deepEqual(signup.errors,[]);await signup.page.close();
 const addon=await mount('addons');
 await addon.page.waitForSelector('.addon-price');await addon.page.evaluate(()=>NabdhCurrency.set('USD'));
 await addon.page.waitForFunction(()=>document.querySelector('.addon-price').textContent.includes('106.40'));
 assert.deepEqual(addon.errors,[]);await addon.page.close();
 const portal=await mount('portal');
 await portal.page.evaluate(()=>{isOwner=true;myClient={id:'test',plan_id:'monthly'};planOptions=window.mockPlans;selectedCycle='monthly';selectedPlanId='monthly';renderPlanPicker();NabdhCurrency.set('USD');});
 await portal.page.waitForFunction(()=>document.querySelector('.plan-opt-price').textContent.includes('53.07'));
 assert.match(await portal.page.locator('.plan-opt-limit').first().textContent(),/2,500/);
 assert.match(await portal.page.locator('#renewPlanBtn').textContent(),/53.07/);
 assert.equal(await portal.page.evaluate(()=>planFinalPrice(planOptions[0])),199,'Billing base remains SAR');
 await portal.page.evaluate(()=>{selectedCycle='annual';selectedPlanId='annual';renderPlanPicker();});
 await portal.page.waitForFunction(()=>document.querySelector('.plan-opt-price').textContent.includes('530.67'));
 await portal.page.evaluate(()=>{myClient.salla_store_id='salla';myClient.salla_integration_enabled=true;myPlan=window.mockPlans[0];renderPlanCard();});
 assert.equal(await portal.page.locator('#planPicker').evaluate(e=>e.style.display),'none');
 assert.deepEqual(portal.errors,[]);await portal.page.close();
 await browser.close();console.log('PASS: signup, dynamic add-ons, portal monthly/annual prices, reply counts unchanged, SAR billing amount unchanged, Salla purchase restriction preserved.');
})().catch(e=>{console.error(e);process.exit(1)});
