import { createClient } from "jsr:@supabase/supabase-js@2";

// 2026-10-26 — فريق العمل (دعوة موظفين) متاح من باقة نمو وفوق (client_plan_allows)، ومفتوح خلال الفترة التجريبية.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_PERMISSION_KEYS = ["orders", "contacts", "carts", "analytics", "templates", "addons", "channels", "settings"];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// يسمح فقط بالمفاتيح المعروفة، وبقيمة boolean صريحة — أي شي ثاني يُتجاهل بصمت
function sanitizePermissions(input: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (input && typeof input === "object") {
    for (const key of ALLOWED_PERMISSION_KEYS) {
      const v = (input as Record<string, unknown>)[key];
      if (typeof v === "boolean") out[key] = v;
    }
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(jwt);

    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "يجب تسجيل الدخول أولاً" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, email, full_name, permissions } = await req.json();
    if (!client_id || !email || !full_name) {
      return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return new Response(JSON.stringify({ error: "البريد الإلكتروني غير صحيح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPermissions = sanitizePermissions(permissions);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // فقط صاحب الحساب الأصلي يقدر يضيف موظفين
    const { data: clientRow, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("id, user_id, business_name_ar, business_name")
      .eq("id", client_id)
      .eq("user_id", userData.user.id)
      .single();

    if (clientErr || !clientRow) {
      return new Response(JSON.stringify({ error: "غير مصرح لك بإضافة موظفين لهذا الحساب" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ميزة الباقة: فريق العمل من باقة نمو وفوق (لو فشل الاستعلام نكمل كالسابق)
    const { data: planAllows } = await supabaseAdmin.rpc("client_plan_allows", { p_client_id: client_id, p_feature: "team" });
    if (planAllows === false) {
      return new Response(JSON.stringify({ error: "إضافة موظفين (فريق العمل) متاحة من باقة نمو وفوق. رقّ باقتك من قسم الاشتراك في لوحة التحكم.", code: "plan_upgrade_required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // تحقق من عدم تكرار نفس البريد لنفس الحساب
    const { data: existingStaff } = await supabaseAdmin
      .from("client_staff")
      .select("id")
      .eq("client_id", client_id)
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingStaff) {
      return new Response(JSON.stringify({ error: "هذا البريد مضاف مسبقاً لفريق هذا الحساب" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectTo = "https://nabdh.online/portal.html";

    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      cleanEmail,
      { redirectTo, data: { full_name: full_name } }
    );

    let staffUserId: string | null = null;

    if (inviteErr) {
      // لو البريد عنده حساب مسبقاً في Supabase Auth (مثلاً صاحب حساب آخر)، نربطه مباشرة بدون إرسال دعوة جديدة
      const msg = String(inviteErr.message || "");
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const found = usersList?.users?.find((u: { email?: string }) => (u.email || "").toLowerCase() === cleanEmail);
        if (found) {
          staffUserId = found.id;
        }
      }
      if (!staffUserId) {
        return new Response(JSON.stringify({ error: "تعذّر إرسال الدعوة: " + msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      staffUserId = inviteData.user.id;
    }

    const { error: insertErr } = await supabaseAdmin.from("client_staff").insert({
      client_id: client_id,
      user_id: staffUserId,
      full_name: full_name,
      email: cleanEmail,
      permissions: cleanPermissions,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: "تعذّر ربط الموظف بالحساب" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

