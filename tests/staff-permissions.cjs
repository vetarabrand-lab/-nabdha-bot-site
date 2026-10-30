const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const permissions=require('../portal-permissions.js');
assert.equal(permissions.allowed({},'orders'),true);
assert.equal(permissions.allowed({orders:false},'orders'),false);
for(const key of ['carts','contacts','templates','analytics','settings','channels','addons']){
  assert.equal(permissions.allowed({},key),false);
  assert.equal(permissions.allowed({[key]:'true'},key),false);
  assert.equal(permissions.allowed({[key]:true},key),true);
}
assert.equal(permissions.canOpen(false,{broadcast:true},'broadcast'),false);
assert.equal(permissions.canOpen(false,{},'inbox'),true);
assert.equal(permissions.canOpen(true,{},'contacts'),true);
const inviteSource=stripTypeScriptTypes(fs.readFileSync('supabase/functions/invite-client-staff/index.ts','utf8')).replace(/^import .*;\r?\n/,'');
const ctx={Deno:{env:{get:()=>''},serve:()=>{}}};vm.createContext(ctx);vm.runInContext(inviteSource,ctx);
assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('sanitizePermissions({carts:true,contacts:true,orders:false,analytics:"true",admin:true})',ctx))),{orders:false,contacts:true,carts:true});
async function orders(owner,staffPerms,anonymous=false){
 let handle,externalCalls=0;
 const db={auth:{getUser:async()=>({data:{user:anonymous?null:{id:owner?'owner':'staff'}}})},from(table){return new Proxy({}, {get(_,key){if(key==='then')return resolve=>resolve({data:table==='clients'?{id:'client',user_id:'owner',plan_id:'plan',salla_integration_enabled:true}:table==='client_staff'?(staffPerms===null?null:{id:'staff',permissions:staffPerms}):table==='subscription_plans'?{order_table_included:true}:table==='client_salla_credentials'?{access_token:'mock'}:null,error:null});return function(){return this;};}});}};
 const context={createClient:()=>db,Deno:{env:{get:()=>''},serve:h=>handle=h},Request,Response,console,fetch:async()=>{externalCalls++;return new Response(JSON.stringify({data:[]}));}};
 vm.createContext(context);vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/list-store-orders/index.ts','utf8')).replace(/^import .*;\r?\n/,''),context);
 const response=await handle(new Request('https://test.local',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({client_id:'client'})}));
 return {status:response.status,externalCalls};
}
(async()=>{
 for(const p of [null,{orders:false},{orders:'true'}]){const result=await orders(false,p);assert.equal(result.status,403);assert.equal(result.externalCalls,0);}
 assert.equal((await orders(false,{},true)).status,401);
 // Allowed requests reach plan/provider lookup; the response depends on store configuration.
 for(const [owner,p] of [[true,{}],[false,{}],[false,{orders:true}]])assert.notEqual((await orders(owner,p)).status,403);
 console.log('PASS: legacy access, explicit denial, strict booleans, owner-only sections, invite allowlist, server-side orders rejection before provider calls.');
})().catch(e=>{console.error(e);process.exit(1)});
