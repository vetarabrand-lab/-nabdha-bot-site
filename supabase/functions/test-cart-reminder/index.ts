import { createClient } from "jsr:@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TEST_CLIENT="cec96230-388c-4d6e-94e4-2a2f95d228ef";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});}
type TemplateDef = { name: string; language: string; body: string; examples: string[]; category: "UTILITY" | "MARKETING" };

const TEMPLATES: Record<string, TemplateDef> = {
  order_confirmation: {
    name: "nabda_order_confirmation",
    language: "ar",
    body: "مرحباً {{1}}! تم استلام طلبك رقم {{2}} بنجاح وجاري تجهيزه الآن. راح نوصلك بأي تحديث أول بأول 🌿",
    examples: ["سارة", "10234"],
    category: "UTILITY",
  },
  order_status_update: {
    name: "nabda_order_status_update",
    language: "ar",
    body: "تحديث بخصوص طلبك رقم {{1}}: {{2}} 📦",
    examples: ["10234", "تم شحن طلبك"],
    category: "UTILITY",
  },
  cart_reminder_4h: {
    name: "nabda_cart_reminder_4h",
    language: "ar",
    body: "مرحباً {{1}}! 🌿 لسا سلتك في {{2}} تنتظرك. أكمل طلبك الآن قبل نفاد الكمية.",
    examples: ["سارة", "متجر جُمان"],
    category: "MARKETING",
  },
  cart_reminder_24h: {
    name: "nabda_cart_reminder_24h",
    language: "ar",
    body: "تذكير: طلبك في {{1}} لسا ما اكتمل. تحتاج مساعدة بإكمال الطلب؟ راسلنا وإحنا موجودين 🌿",
    examples: ["متجر جُمان"],
    category: "MARKETING",
  },
  cart_reminder_24h_coupon: {
    name: "nabda_cart_reminder_24h_coupon",
    language: "ar",
    body: "طلبك في {{1}} لسا ينتظرك 🌿 خذ خصم خاص لك: استخدم كود {{2}} خلال الـ 48 ساعة القادمة قبل ما ينتهي.",
    examples: ["متجر جُمان", "NABDA7X2K9Q"],
    category: "MARKETING",
  },
  cart_reminder_48h: {
    name: "nabda_cart_reminder_48h",
    language: "ar",
    body: "مرحباً {{1}} 🛒 منتجاتك في {{2}} لسا محفوظة لك. أكمل طلبك الآن بخطوات بسيطة، وإذا عندك أي سؤال راسلنا هنا.",
    examples: ["سارة", "متجر جُمان"],
    category: "MARKETING",
  },
  cart_reminder_72h: {
    name: "nabda_cart_reminder_72h",
    language: "ar",
    body: "آخر تذكير من {{1}}: سلتك لسا موجودة 🌿 إذا عندك استفسار عن المنتجات أو التوصيل راسلنا هنا ونساعدك فوراً.",
    examples: ["متجر جُمان"],
    category: "MARKETING",
  },
  reorder_reminder: {
    name: "nabda_reorder_reminder",
    language: "ar",
    body: "مرحباً {{1}}! 🌿 مرّ فترة على آخر طلب لك من {{2}}. تحتاج نرسل لك نفس الطلب مرة ثانية؟ راسلنا وبنجهزه لك فوراً.",
    examples: ["سارة", "متجر جُمان"],
    category: "MARKETING",
  },
};

async function ensureTemplate(
  supabaseAdmin: ReturnType<typeof createClient>,
  clientRow: any,
  secretRow: any,
  purpose: keyof typeof TEMPLATES
): Promise<{ state: string; name: string }> {
  const def = TEMPLATES[purpose];

  const { data: existing } = await supabaseAdmin
    .from("whatsapp_message_templates")
    .select("id, status")
    .eq("client_id", clientRow.id)
    .eq("purpose", purpose)
    .maybeSingle();

  if (existing) {
    return { state: existing.status as string, name: def.name };
  }

  let wabaId = clientRow.whatsapp_business_account_id as string | null;

  if (!wabaId) {
    const wabaRes = await fetch(
      `https://graph.facebook.com/v21.0/${clientRow.whatsapp_phone_number_id}?fields=whatsapp_business_account`,
      { headers: { "Authorization": `Bearer ${secretRow.access_token}` } }
    );
    const wabaJson = await wabaRes.json();
    wabaId = wabaJson?.whatsapp_business_account?.id ?? null;
    if (!wabaRes.ok || !wabaId) {
      return { state: "missing", name: def.name };
    }
    await supabaseAdmin.from("clients").update({ whatsapp_business_account_id: wabaId }).eq("id", clientRow.id);
  }

  const { data: newRow } = await supabaseAdmin
    .from("whatsapp_message_templates")
    .insert({
      client_id: clientRow.id,
      name: def.name,
      language: def.language,
      category: def.category,
      body_text: def.body,
      variable_examples: def.examples,
      purpose,
      status: "draft",
    })
    .select("id")
    .single();

  if (!newRow) return { state: "missing", name: def.name };

  const submitRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secretRow.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: def.name,
      language: def.language,
      category: def.category,
      components: [{ type: "BODY", text: def.body, example: { body_text: [def.examples] } }],
    }),
  });
  const submitJson = await submitRes.json().catch(() => ({}));

  if (submitRes.ok) {
    await supabaseAdmin
      .from("whatsapp_message_templates")
      .update({ meta_template_id: submitJson.id, status: "pending" })
      .eq("id", newRow.id);
    return { state: "pending", name: def.name };
  } else {
    const reason = submitJson?.error?.error_user_msg || submitJson?.error?.message || "فشل الإرسال لميتا";
    await supabaseAdmin
      .from("whatsapp_message_templates")
      .update({ status: "rejected", rejected_reason: String(reason).slice(0, 500) })
      .eq("id", newRow.id);
    return { state: "rejected", name: def.name };
  }
}

async function sendTemplateMessage(
  clientRow: any,
  secretRow: any,
  toPhone: string,
  templateName: string,
  language: string,
  variables: string[]
): Promise<{ ok: boolean; json: any }> {
  const components = variables.length
    ? [{ type: "body", parameters: variables.map((v) => ({ type: "text", text: v })) }]
    : [];

  const res = await fetch(`https://graph.facebook.com/v21.0/${clientRow.whatsapp_phone_number_id}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secretRow.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: { name: templateName, language: { code: language }, components },
    }),
  });
  const resJson = await res.json().catch(() => ({}));
  return { ok: res.ok, json: resJson };
}


export async function handle(req:Request){
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({message:"الطلب غير مدعوم"},405);
 let claimed=false;let db:any;let cartId:string|undefined;
 try{
  db=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY);
  const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token)return json({message:"سجل الدخول أولاً"},401);
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth.user)return json({message:"انتهت الجلسة، سجل الدخول مجدداً"},401);
  const {data:client,error:clientError}=await db.from("clients").select("id,user_id,business_name_ar,business_name,whatsapp_phone_number_id,whatsapp_business_account_id").eq("id",TEST_CLIENT).maybeSingle();
  if(clientError||!client||client.user_id!==auth.user.id)return json({message:"هذه التجربة متاحة لصاحب حساب المتجر التجريبي فقط"},403);
  const body=await req.json();cartId=body.cart_id;
  if(typeof cartId!=="string"||! /^[0-9a-f-]{36}$/i.test(cartId))return json({message:"اختر سلة صحيحة"},400);
  const {data:cart,error:cartError}=await db.from("store_order_events").select("*").eq("id",cartId).eq("client_id",TEST_CLIENT).eq("store_type","salla").eq("event_type","abandoned_cart").maybeSingle();
  if(cartError||!cart)return json({message:"السلة غير موجودة في هذا الحساب"},404);
  if(["recovered","expired"].includes(cart.status))return json({message:"لا يمكن تذكير سلة مكتملة أو منتهية"},409);
  const phone=String(cart.customer_phone||"").replace(/[^0-9]/g,"");
  if(!/^[1-9][0-9]{7,14}$/.test(phone))return json({message:"رقم عميل السلة غير صالح للإرسال"},400);
  const {data:secret}=await db.from("client_whatsapp_secrets").select("access_token").eq("client_id",TEST_CLIENT).maybeSingle();
  if(!secret?.access_token||!client.whatsapp_phone_number_id)return json({message:"اربط واتساب أولاً"},409);
  const {data:prior,error:priorError}=await db.from("cart_reminder_test_sends").select("state").eq("cart_id",cartId).maybeSingle();
  if(priorError)return json({message:"تعذّر التحقق من الإرسال السابق"},500);
  if(prior)return json({message:prior.state==="sent"?"أُرسل التذكير التجريبي لهذه السلة بالفعل":"يوجد طلب إرسال سابق لهذه السلة؛ راجع النتيجة قبل إعادة المحاولة",state:prior.state},409);
  const tpl=await ensureTemplate(db,client,secret,"cart_reminder_4h");
  if(tpl.state!=="approved")return json({sent:false,state:tpl.state,message:tpl.state==="pending"?"تم تجهيز القالب وهو بانتظار اعتماد ميتا. أعد المحاولة بعد الاعتماد.":"قالب التذكير غير معتمد. راجع قسم قوالب الرسائل."});
  const {error:claimError}=await db.from("cart_reminder_test_sends").insert({cart_id:cartId,client_id:TEST_CLIENT,state:"sending"});
  if(claimError)return json({message:"هناك محاولة إرسال أخرى لهذه السلة"},409);
  claimed=true;
  const result=await sendTemplateMessage(client,secret,phone,tpl.name,TEMPLATES.cart_reminder_4h.language,[cart.customer_name||"عميلنا",client.business_name_ar||client.business_name||"متجرنا"]);
  if(!result.ok){
   await db.from("cart_reminder_test_sends").delete().eq("cart_id",cartId).eq("state","sending");
   claimed=false;
   return json({sent:false,message:"رفضت ميتا الإرسال: "+String(result.json?.error?.error_user_msg||result.json?.error?.message||"تحقق من القالب وربط واتساب").slice(0,250)});
  }
  const {error:recordError}=await db.from("cart_reminder_test_sends").update({state:"sent",message_id:result.json?.messages?.[0]?.id||null}).eq("cart_id",cartId);
  await db.from("whatsapp_messages_log").insert({client_id:TEST_CLIENT,customer_phone:phone,customer_name:cart.customer_name,outbound_message:"[تذكير سلة متروكة تجريبي فوري]"});
  return json({sent:true,message:recordError?"قبلت ميتا الرسالة، لكن تعذّر حفظ النتيجة؛ لا تعِد الإرسال.":"قبلت ميتا رسالة التذكير للإرسال. تحقق من واتساب العميل."});
 }catch(_e){
  if(claimed&&db&&cartId)await db.from("cart_reminder_test_sends").update({state:"unknown"}).eq("cart_id",cartId);
  return json({message:claimed?"تعذّر تأكيد نتيجة الإرسال. تحقق من واتساب العميل قبل إعادة المحاولة.":"تعذّر تنفيذ الاختبار. حاول مجدداً."},500);
 }
}
Deno.serve(handle);

