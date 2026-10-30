import { createClient } from "jsr:@supabase/supabase-js@2";

// يُرجع قائمة موحّدة بآخر الطلبات من متجر العميل (زد/سلة/ووكومرس/شوبيفاي) — ميزة محصورة على باقة نمو وما فوق.
// يتطلب جلسة مستخدم صالحة (verify_jwt=true) ويتحقق من أن المستخدم مالك أو موظف في الحساب.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pick(obj: any, paths: string[]): any {
  for (const p of paths) {
    const val = p.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
}

async function fetchZidOrders(creds: any) {
  const headers = {
    "Authorization": creds.authorization_token,
    "X-Manager-Token": creds.manager_token,
    "Access-Token": creds.manager_token,
    "Accept-Language": "ar",
  };
  const res = await fetch("https://api.zid.sa/v1/managers/store/orders/?page=1&page_size=20", { headers });
  if (!res.ok) return { error: `zid_orders_failed_${res.status}` };
  const data = await res.json();
  const list = Array.isArray(data?.orders) ? data.orders : (Array.isArray(data?.results) ? data.results : []);
  return {
    orders: list.map((o: any) => ({
      order_code: pick(o, ["code", "order_code", "id"]),
      customer_name: pick(o, ["customer.name", "customer_name", "customer.first_name"]),
      status: pick(o, ["order_status.name", "status.name", "order_status"]),
      total: pick(o, ["order_total_string", "order_total", "total"]),
      created_at: pick(o, ["created_at", "date"]),
    })),
  };
}

async function fetchSallaOrders(creds: any) {
  const headers = { "Authorization": `Bearer ${creds.access_token}` };
  const res = await fetch("https://api.salla.dev/admin/v2/orders?per_page=20", { headers });
  if (!res.ok) return { error: `salla_orders_failed_${res.status}` };
  const data = await res.json();
  const list = Array.isArray(data?.data) ? data.data : [];
  return {
    orders: list.map((o: any) => ({
      order_code: pick(o, ["reference_id", "id"]),
      customer_name: pick(o, ["customer.name", "customer.first_name"]),
      status: pick(o, ["status.name", "status"]),
      total: (() => {
        const amt = pick(o, ["amounts.total", "total"]);
        return amt && typeof amt === "object" ? `${amt.amount ?? ""} ${amt.currency || ""}`.trim() : amt;
      })(),
      created_at: pick(o, ["date.date", "created_at"]),
    })),
  };
}

async function fetchWooCommerceOrders(creds: any) {
  const headers = { "Authorization": `Basic ${btoa(`${creds.consumer_key}:${creds.consumer_secret}`)}` };
  const res = await fetch(`${creds.store_url}/wp-json/wc/v3/orders?per_page=20&orderby=date&order=desc`, { headers });
  if (!res.ok) return { error: `woocommerce_orders_failed_${res.status}` };
  const list = await res.json().catch(() => []);
  return {
    orders: (Array.isArray(list) ? list : []).map((o: any) => ({
      order_code: o?.number || o?.id,
      customer_name: pick(o, ["billing.first_name"]),
      status: o?.status,
      total: o?.total ? `${o.total} ${o.currency || ""}`.trim() : null,
      created_at: o?.date_created,
    })),
  };
}

async function fetchShopifyOrders(creds: any) {
  const headers = { "X-Shopify-Access-Token": creds.access_token };
  const res = await fetch(`https://${creds.shop_domain}/admin/api/2024-01/orders.json?status=any&limit=20&order=created_at+desc`, { headers });
  if (!res.ok) return { error: `shopify_orders_failed_${res.status}` };
  const data = await res.json().catch(() => ({}));
  const list = Array.isArray(data?.orders) ? data.orders : [];
  return {
    orders: list.map((o: any) => ({
      order_code: o?.name || o?.order_number,
      customer_name: pick(o, ["customer.first_name"]),
      status: o?.cancelled_at ? "cancelled" : (o?.fulfillment_status || o?.financial_status || "pending"),
      total: o?.total_price ? `${o.total_price} ${o.currency || ""}`.trim() : null,
      created_at: o?.created_at,
    })),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const clientId = body.client_id;
    if (!clientId) return json({ error: "missing client_id" }, 400);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("id, user_id, plan_id")
      .eq("id", clientId)
      .maybeSingle();

    if (!clientRow) return json({ error: "not found" }, 404);

    let authorized = clientRow.user_id === userId;
    if (!authorized) {
      const { data: staffRow } = await supabaseAdmin
        .from("client_staff")
        .select("id, permissions")
        .eq("client_id", clientId)
        .eq("user_id", userId)
        .maybeSingle();
      authorized = !!staffRow && (staffRow.permissions?.orders === undefined || staffRow.permissions.orders === true);
    }
    if (!authorized) return json({ error: "forbidden" }, 403);

    if (clientRow.plan_id) {
      const { data: plan } = await supabaseAdmin
        .from("subscription_plans")
        .select("order_table_included")
        .eq("id", clientRow.plan_id)
        .maybeSingle();
      if (!plan?.order_table_included) {
        return json({ error: "plan_upgrade_required", message: "لوحة الطلبات الموحّدة متاحة من باقة نمو وما فوق." }, 402);
      }
    } else {
      return json({ error: "plan_upgrade_required", message: "لوحة الطلبات الموحّدة متاحة من باقة نمو وما فوق." }, 402);
    }

    const { data: zidCreds } = await supabaseAdmin
      .from("client_zid_credentials")
      .select("authorization_token, manager_token")
      .eq("client_id", clientId)
      .maybeSingle();

    if (zidCreds) {
      const result = await fetchZidOrders(zidCreds);
      return json(result);
    }

    const { data: sallaCreds } = await supabaseAdmin
      .from("client_salla_credentials")
      .select("access_token")
      .eq("client_id", clientId)
      .maybeSingle();

    if (sallaCreds) {
      const result = await fetchSallaOrders(sallaCreds);
      return json(result);
    }

    const { data: wooCreds } = await supabaseAdmin
      .from("client_woocommerce_credentials")
      .select("store_url, consumer_key, consumer_secret")
      .eq("client_id", clientId)
      .maybeSingle();

    if (wooCreds) {
      const result = await fetchWooCommerceOrders(wooCreds);
      return json(result);
    }

    const { data: shopifyCreds } = await supabaseAdmin
      .from("client_shopify_credentials")
      .select("shop_domain, access_token")
      .eq("client_id", clientId)
      .maybeSingle();

    if (shopifyCreds) {
      const result = await fetchShopifyOrders(shopifyCreds);
      return json(result);
    }

    return json({ orders: [], message: "لا يوجد متجر مربوط بهذا الحساب بعد." });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

