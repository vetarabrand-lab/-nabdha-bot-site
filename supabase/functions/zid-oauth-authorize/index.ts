import { createClient } from "jsr:@supabase/supabase-js@2";

// يبدأ رحلة ربط متجر زد. محمي بـ verify_jwt + تحقق من ملكية الحساب.
// state موقّع بـ HMAC وله صلاحية زمنية، والـ callback يرفض أي state غير موقّع منّا.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZID_CLIENT_ID = Deno.env.get("ZID_CLIENT_ID");
// 2026-10-26 — طلب زد: الروابط على دومين نبضة (مطابق لرابط الاستدعاء في لوحة شركاء زد)
const ZID_REDIRECT_URI = Deno.env.get("ZID_REDIRECT_URI") || "https://nabdh.online/zid/oauth/callback";

const STATE_SECRET = SUPABASE_SERVICE_ROLE_KEY;
const STATE_TTL_MS = 30 * 60 * 1000;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signState(clientId: string): Promise<string> {
  const exp = Date.now() + STATE_TTL_MS;
  const payload = `${clientId}.${exp}`;
  return `${payload}.${await hmacHex(STATE_SECRET, payload)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ZID_CLIENT_ID) {
      return new Response(JSON.stringify({ error: "ربط زد غير مفعّل بعد من فريق نبضة (ZID_CLIENT_ID غير مضبوط)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: clientRow, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("id, plan_id, zid_integration_enabled")
      .eq("id", client_id)
      .eq("user_id", userData.user.id)
      .single();

    if (clientErr || !clientRow) {
      return new Response(JSON.stringify({ error: "غير مصرح لك بربط هذا الحساب بزد" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["cec96230-388c-4d6e-94e4-2a2f95d228ef", "96b4facc-c9ef-47d7-a5b9-c9ef3afe065f"].includes(clientRow.id)) {
      return new Response(JSON.stringify({ error: "ربط زد قريباً" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (clientRow.plan_id) {
      const { data: planRow } = await supabaseAdmin
        .from("subscription_plans")
        .select("store_integration_included, store_integration_addon_price_sar")
        .eq("id", clientRow.plan_id)
        .single();

      if (planRow && !planRow.store_integration_included && !clientRow.zid_integration_enabled) {
        return new Response(JSON.stringify({
          error: `ربط المتجر غير مُفعّل في باقتك الحالية. فعّله مقابل ${planRow.store_integration_addon_price_sar} ريال/شهر إضافية، أو رقّي لباقة نمو وما فوق ليكون مجانياً — تواصل مع فريق نبضة للتفعيل.`,
          requires_addon: true,
          addon_price_sar: planRow.store_integration_addon_price_sar,
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const signedState = await signState(clientRow.id);

    const redirectUri = ZID_REDIRECT_URI;
    const authUrl =
      `https://oauth.zid.sa/oauth/authorize?client_id=${encodeURIComponent(ZID_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&state=${encodeURIComponent(signedState)}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zid-oauth-authorize error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
