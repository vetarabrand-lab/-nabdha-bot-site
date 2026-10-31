-- معالج الإعداد + قياس مكان توقف التاجر + رسائل التجربة (2026-10-31)
-- مطبّق مسبقاً على الإنتاج. هذا سجل للتغيير فقط.
--
-- 1) migration: onboarding_funnel_tracking (مطبّقة)
--    - جدول onboarding_events (client_id, step, created_at) لكل خطوة يمر بها التاجر
--    - triggers تسجّل تلقائياً: wa_connected, store_connected, first_reply
--      (على clients وعلى whatsapp_messages_log: رد = inbound + outbound معاً)
--    - RPC log_onboarding_event(p_step) بقائمة مسموحة للبوابة:
--      wizard_viewed, wizard_opened_wa, wizard_opened_store, store_skipped,
--      preview_used, test_link_copied, wizard_dismissed
--    - admin_onboarding_funnel() للأدمن فقط (is_platform_admin) ويرجّع stuck_at
--
-- 2) migration: trial_journey_emails (مطبّقة)
create table if not exists public.trial_journey_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  milestone text not null check (milestone in ('day1','day3','day6')),
  sent_at timestamptz not null default now(),
  unique (client_id, milestone)
);
alter table public.trial_journey_emails enable row level security;

-- 3) pg_cron: nabda-trial-journey كل ساعة عند الدقيقة 17
--    يستدعي edge function send-trial-journey بنفس سر الكرون للدوال الأخرى (لا يُكتب هنا).
--    الرسائل تُرسل فقط لمن سجّل بعد 2026-11-01 (متغير TRIAL_JOURNEY_FROM).
