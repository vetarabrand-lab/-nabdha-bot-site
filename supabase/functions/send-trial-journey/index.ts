import { createClient } from "jsr:@supabase/supabase-js@2";

// رسائل رحلة التجربة (إيميل) لصاحب النشاط: اليوم 1 ترحيب، اليوم 3 تذكير بالخطوة التالية، اليوم 6 عرض قبل نهاية التجربة.
// الإيميل وليس واتساب: في اليوم الأول ما عند التاجر رقم مربوط فما نقدر نرسل له واتساب من نبضة.
// كل رسالة تُرسل مرة واحدة لكل تاجر (trial_journey_emails). يُستدعى كل ساعة من pg_cron.
// وضع المعاينة: POST {"preview":true,"milestone":"day6","client_id":"..."} يرجّع HTML بدون إرسال.
// الأسعار تُقرأ حيّة من subscription_plans، ولا يوجد أي خصم مخترع.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_INTERNAL_SECRET = Deno.env.get("CRON_INTERNAL_SECRET");
const INTERNAL_FUNCTION_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET");
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://nabdh.online";
// نرسل فقط للتجار اللي سجّلوا بعد هذا التاريخ (حتى ما تصل رسائل قديمة لحسابات تجريبية)
const FROM_DATE = Deno.env.get("TRIAL_JOURNEY_FROM") ?? "2026-11-01T00:00:00Z";

type Milestone = "day1" | "day3" | "day6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function milestoneForDay(day: number): Milestone | null {
  if (day <= 2) return "day1";
  if (day <= 5) return "day3";
  if (day <= 7) return "day6";
  return null;
}

function layout(title: string, bodyHtml: string, ctaText: string, ctaUrl: string): string {
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#F6FAF8;font-family:Tahoma,Arial,sans-serif;color:#0B1A17;">
<div style="max-width:560px;margin:0 auto;padding:20px 16px;">
<div style="background:#fff;border:1px solid #E4ECE9;border-radius:16px;padding:24px 22px;">
<div style="font-size:13px;color:#107D71;font-weight:bold;margin-bottom:6px;">بوت نبضة</div>
<h1 style="font-size:20px;line-height:1.5;margin:0 0 12px;">${title}</h1>
<div style="font-size:15px;line-height:1.9;">${bodyHtml}</div>
<div style="text-align:center;margin:22px 0 6px;"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#107D71;color:#fff;text-decoration:none;font-weight:bold;padding:13px 28px;border-radius:12px;font-size:15px;">${ctaText}</a></div>
</div>
<p style="font-size:12px;color:#5B6B67;text-align:center;margin:14px 0 0;">وصلتك هذه الرسالة لأنك سجّلت في تجربة بوت نبضة. للمساعدة ردّ على هذا الإيميل.</p>
</div></body></html>`;
}

function nextStepOf(c: any, hasReply: boolean, storeConnected: boolean): { text: string; cta: string } {
  const portal = `${SITE_URL}/portal.html#setup`;
  if (!c.whatsapp_phone_number_id) {
    return { text: "الخطوة الجاية: <b>اربط رقم واتساب</b> متجرك. تاخذ حوالي 3 دقائق، وتفتح لك شاشة ميتا الرسمية.", cta: portal };
  }
  if (!hasReply) {
    return { text: "رقمك مربوط. الخطوة الجاية: من <b>جوال ثاني</b> أرسل رسالة لرقم متجرك وشوف البوت يرد عليك. ما تقدر ترسل لنفسك من نفس الجوال.", cta: portal };
  }
  if (!storeConnected) {
    return { text: "شفت البوت يرد. الخطوة الجاية: <b>اربط متجرك</b> عشان يجاوب عن الطلبات والمنتجات (ووكومرس وشوبيفاي متاحان للربط).", cta: `${SITE_URL}/portal.html#setup` };
  }
  return { text: "كل شي مربوط. الخطوة الجاية: <b>خصّص تعليمات البوت</b> ليجاوب بأسلوب متجرك.", cta: `${SITE_URL}/portal.html` };
}

function fmtPlans(plans: any[]): string {
  const monthly = plans.filter((p) => !p.is_prepaid && p.billing_cycle === "monthly" && ["basic", "growth", "pro"].includes(p.code))
    .sort((a, b) => Number(a.monthly_price_sar) - Number(b.monthly_price_sar));
  const prepaid = plans.filter((p) => p.is_prepaid).sort((a, b) => Number(a.monthly_price_sar) - Number(b.monthly_price_sar));
  const row = (name: string, detail: string, price: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #E4ECE9;"><b>${esc(name)}</b><br><span style="font-size:12.5px;color:#5B6B67;">${esc(detail)}</span></td><td style="padding:8px 0;border-bottom:1px solid #E4ECE9;text-align:left;white-space:nowrap;font-weight:bold;">${esc(price)}</td></tr>`;
  const prepaidRows = prepaid.map((p) =>
    row(`${Number(p.prepaid_credits).toLocaleString("en-US")} رد`, `دفعة واحدة، صالحة ${p.prepaid_validity_months} شهر، بدون تجديد تلقائي`, `${Number(p.monthly_price_sar)} ر.س`)).join("");
  const monthlyRows = monthly.map((p) =>
    row(p.name_ar, `${Number(p.monthly_message_limit).toLocaleString("en-US")} رد شهرياً`, `${Number(p.monthly_price_sar)} ر.س / شهر`)).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;"><tr><td colspan="2" style="padding:6px 0;color:#107D71;font-weight:bold;">ادفع مرة وحدة (بدون اشتراك)</td></tr>${prepaidRows}<tr><td colspan="2" style="padding:12px 0 6px;color:#107D71;font-weight:bold;">أو اشتراك شهري</td></tr>${monthlyRows}</table>`;
}

function buildEmail(m: Milestone, c: any, ctx: { replies: number; storeConnected: boolean; plans: any[]; daysLeft: number; viaPlatform: string | null }) {
  const name = esc(c.business_name_ar || c.business_name || "");
  const hasReply = ctx.replies > 0;
  const step = nextStepOf(c, hasReply, ctx.storeConnected);
  if (m === "day1") {
    return {
      subject: "أهلاً بك في نبضة، جرّب أول رد خلال 10 دقائق",
      html: layout(`أهلاً ${name} 👋`,
        `<p>تجربتك المجانية بدأت (7 أيام). الهدف الحين بسيط: <b>تشوف البوت يرد على عميل حقيقي خلال 10 دقائق.</b></p>
         <p>3 خطوات: اربط الرقم، اربط المتجر (اختياري)، جرّب أول رد.</p><p>${step.text}</p>`,
        "كمّل الإعداد", step.cta),
    };
  }
  if (m === "day3") {
    const proof = hasReply ? `<p>البوت رد لحد الحين على <b>${ctx.replies}</b> رسالة. </p>` : "";
    return {
      subject: hasReply ? "نبضة بدأ يرد، باقي لك خطوة صغيرة" : "باقي لك خطوة وتشوف البوت يرد",
      html: layout(`باقي لك القليل يا ${name}`, `${proof}<p>${step.text}</p><p style="font-size:13px;color:#5B6B67;">عندك ${ctx.daysLeft} أيام متبقية من التجربة.</p>`, "كمّل من حيث وقفت", step.cta),
    };
  }
  const proof = hasReply
    ? `<p>خلال التجربة رد البوت على <b>${ctx.replies}</b> رسالة من عملائك، يعني وفّر عليك وقت فعلي.</p>`
    : `<p>لسه ما شفت البوت يرد على عميل حقيقي، وما زال عندك وقت قبل ما تنتهي التجربة.</p>`;
  const how = ctx.viaPlatform
    ? `<p>اشتراكك يُدار من داخل <b>${esc(ctx.viaPlatform)}</b>، فتقدر تختار الباقة من هناك قبل ما تنتهي التجربة.</p>`
    : `<p style="margin-bottom:6px;">اختر اللي يناسبك قبل ما تنتهي التجربة:</p>${fmtPlans(ctx.plans)}`;
  return {
    subject: ctx.daysLeft <= 1 ? "تجربتك في نبضة تنتهي غداً" : `تجربتك في نبضة تنتهي خلال ${ctx.daysLeft} أيام`,
    html: layout(`تجربتك تقترب من نهايتها`, `${proof}${how}<p style="font-size:13px;color:#5B6B67;">إذا ما اشتركت يتوقف البوت عن الرد على عملائك بعد نهاية التجربة، وبياناتك تبقى محفوظة.</p>`,
      ctx.viaPlatform ? "افتح لوحة التحكم" : "اختر باقتك", `${SITE_URL}/portal.html`),
  };
}

async function contextFor(admin: ReturnType<typeof createClient>, c: any, plans: any[]) {
  const { count } = await admin.from("whatsapp_messages_log").select("id", { count: "exact", head: true })
    .eq("client_id", c.id).not("inbound_message", "is", null).not("outbound_message", "is", null);
  const storeConnected = !!(c.zid_integration_enabled || c.zid_store_id || (c.salla_store_id && c.salla_integration_enabled) ||
    c.shopify_integration_enabled || c.woocommerce_integration_enabled);
  const daysLeft = Math.max(0, Math.ceil((new Date(c.trial_ends_at).getTime() - Date.now()) / 86400000));
  // تجار سلة وزد يدفعون من داخل منصتهم فقط
  const viaPlatform = (c.salla_store_id && c.salla_integration_enabled) ? "سلة" : (c.zid_integration_enabled ? "زد" : null);
  return { replies: count ?? 0, storeConnected, plans, daysLeft, viaPlatform };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!CRON_INTERNAL_SECRET || req.headers.get("x-internal-secret") !== CRON_INTERNAL_SECRET) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));

    const { data: plans } = await admin.from("subscription_plans").select("*").eq("is_active", true);
    const cols = "id, business_name_ar, business_name, owner_email, created_at, trial_ends_at, subscription_status, whatsapp_phone_number_id, zid_integration_enabled, zid_store_id, salla_store_id, salla_integration_enabled, shopify_integration_enabled, woocommerce_integration_enabled";

    if (body.preview) {
      const m = (body.milestone ?? "day1") as Milestone;
      let q = admin.from("clients").select(cols).limit(1);
      q = body.client_id ? q.eq("id", body.client_id) : q.eq("subscription_status", "trial");
      const { data } = await q;
      const c = data?.[0];
      if (!c) return json({ error: "no client" }, 404);
      const ctx = await contextFor(admin, c, plans || []);
      if (body.force_platform !== undefined) ctx.viaPlatform = body.force_platform || null;
      return json({ ...buildEmail(m, c, ctx), to: "(معاينة، لم يُرسل)" });
    }

    if (!INTERNAL_FUNCTION_SECRET) return json({ error: "INTERNAL_FUNCTION_SECRET missing" }, 500);
    const { data: trials } = await admin.from("clients").select(cols)
      .eq("subscription_status", "trial").not("owner_email", "is", null).not("trial_ends_at", "is", null)
      .gte("created_at", FROM_DATE);

    let sent = 0, skipped = 0, errored = 0;
    for (const c of trials || []) {
      if (new Date(c.trial_ends_at).getTime() < Date.now()) { skipped++; continue; }
      const day = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000) + 1;
      const m = milestoneForDay(day);
      if (!m) { skipped++; continue; }
      // لا نرسل ترحيب اليوم الأول بعد مرور ساعة من التسجيل بدون أن نكون أرسلناه، لكن نرسله لو فاتنا في اليومين الأولين
      const { data: already } = await admin.from("trial_journey_emails").select("id").eq("client_id", c.id).eq("milestone", m).maybeSingle();
      if (already) { skipped++; continue; }
      // نسجّل أولاً (unique) لمنع الإرسال المزدوج لو تداخل تشغيلان
      const { error: insErr } = await admin.from("trial_journey_emails").insert({ client_id: c.id, milestone: m });
      if (insErr) { skipped++; continue; }
      const ctx = await contextFor(admin, c, plans || []);
      const mail = buildEmail(m, c, ctx);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_FUNCTION_SECRET },
        body: JSON.stringify({ to: c.owner_email, subject: mail.subject, html: mail.html }),
      });
      if (res.ok) sent++;
      else { errored++; await admin.from("trial_journey_emails").delete().eq("client_id", c.id).eq("milestone", m); }
    }
    return json({ success: true, sent, skipped, errored });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
