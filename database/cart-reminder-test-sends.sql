create table public.cart_reminder_test_sends (
cart_id uuid primary key references public.store_order_events(id) on delete cascade,
client_id uuid not null references public.clients(id) on delete cascade,
state text not null check(state in ('sending','sent','failed','unknown')),
created_at timestamptz not null default now(),
message_id text
);
alter table public.cart_reminder_test_sends enable row level security;
revoke all on public.cart_reminder_test_sends from public,anon,authenticated;
grant all on public.cart_reminder_test_sends to service_role;
