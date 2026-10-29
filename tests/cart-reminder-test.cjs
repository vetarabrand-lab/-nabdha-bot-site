const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/test-cart-reminder/index.ts','utf8')).replace(/^import .*;\n/,'').replace('export async function handle','async function handle').replace('Deno.serve(handle);','globalThis.handle=handle;');
async function run(mode){
 let sends=0,claimed=false;
 const client={id:'cec96230-388c-4d6e-94e4-2a2f95d228ef',user_id:'owner',whatsapp_phone_number_id:'phone'};
 const db={auth:{getUser:async()=>({data:{user:{id:mode==='foreign'?'other':'owner'}}})},from(table){let action='select';return new Proxy({}, {get(_,key){if(key==='then')return resolve=>{
 let data=null,error=null;
 if(table==='clients')data=client;
 if(table==='store_order_events')data={id:'11111111-1111-1111-1111-111111111111',customer_phone:'966500000000',status:mode==='recovered'?'recovered':'received'};
 if(table==='client_whatsapp_secrets')data={access_token:'mock'};
 if(table==='whatsapp_message_templates')data={id:'tpl',status:mode==='pending'?'pending':'approved'};
 if(table==='cart_reminder_test_sends'&&action==='select')data=mode==='duplicate'?{state:'sent'}:null;
 if(table==='cart_reminder_test_sends'&&action==='insert'){claimed=true;if(mode==='race')error={code:'23505'};}
 resolve({data,error});};return function(){if(['insert','update','delete'].includes(key))action=key;return this;};}});}};
 const ctx={createClient:()=>db,Deno:{env:{get:()=>''}},Request,Response,Date,console,fetch:async()=>{sends++;return new Response(JSON.stringify({messages:[{id:'mock-id'}]}),{status:200});}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const response=await ctx.handle(new Request('https://test.local',{method:'POST',headers:mode==='anonymous'?{}:{authorization:'Bearer mock'},body:JSON.stringify({cart_id:'11111111-1111-1111-1111-111111111111'})}));
 return {status:response.status,body:await response.json(),sends,claimed};
}
(async()=>{
 for(const mode of ['anonymous','foreign','recovered','duplicate','race']){const r=await run(mode);assert.ok(r.status>=400,mode);assert.equal(r.sends,0,mode);}
 const pending=await run('pending');assert.equal(pending.body.state,'pending');assert.equal(pending.sends,0);
 const ok=await run('ok');assert.equal(ok.body.sent,true);assert.equal(ok.sends,1);assert.equal(ok.claimed,true);
 console.log('PASS: authentication, test-account restriction, recovered cart, duplicate/concurrent suppression, pending template, approved send (mock only).');
})().catch(e=>{console.error(e);process.exit(1)});
