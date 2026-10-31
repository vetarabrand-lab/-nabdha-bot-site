-- Applied to production on 2026-10-31 (migration: count_ai_replies_only).
-- A billable reply = the bot's reply to a customer message (inbound + outbound).
-- Not counted: CSAT surveys, sales summaries, cart reminders, order tracking,
-- the merchant's manual replies, product cards.
-- client_reply_quota is the single source of truth; client_remaining_credits and
-- check_usage_alerts now call it instead of counting rows themselves.

create index if not exists whatsapp_messages_log_billable_idx
  on public.whatsapp_messages_log (client_id, created_at)
  where inbound_message is not null and outbound_message is not null;

-- client_reply_quota: the usage count now filters on
--   inbound_message is not null and outbound_message is not null
-- (previously: outbound_message is not null, which counted every automated message).

CREATE OR REPLACE FUNCTION public.client_remaining_credits(p_client_id uuid)
 RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare q jsonb;
begin
  q := public.client_reply_quota(p_client_id);
  if q ? 'allowance' is not true then return 0; end if;
  return greatest(coalesce((q->>'allowance')::int, 0) - coalesce((q->>'used')::int, 0), 0);
end;
$function$;

-- check_usage_alerts: now reads used/allowance from client_reply_quota(rec.id),
-- so the 80% email matches what the bot enforces (trial, prepaid and monthly).
