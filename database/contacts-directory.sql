-- Materialize signed WhatsApp contact events; browser access is read-only and owner-scoped.
create table public.whatsapp_contacts (
  client_id uuid not null references public.clients(id) on delete cascade,
  source_phone_number_id text not null,
  phone_number text not null,
  full_name text not null default '',
  source_timestamp numeric not null,
  received_at timestamptz not null,
  is_deleted boolean not null default false,
  primary key (client_id, source_phone_number_id, phone_number)
);
create index whatsapp_contacts_directory_idx on public.whatsapp_contacts
  (client_id,source_phone_number_id,is_deleted,full_name,phone_number);
alter table public.whatsapp_contacts enable row level security;
revoke all on public.whatsapp_contacts from anon,authenticated;
grant select on public.whatsapp_contacts to authenticated;
grant all on public.whatsapp_contacts to service_role;
create policy contacts_owner_read on public.whatsapp_contacts for select to authenticated
  using (exists (select 1 from public.clients c where c.id=client_id and c.user_id=(select auth.uid())));

create function public.ingest_whatsapp_contact_event(p_client uuid,p_payload jsonb,p_received timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb; phone text; source_id text; stamp numeric; raw_stamp text; action text; contact_name text;
begin
  if p_client is null then return; end if;
  source_id:=p_payload->>'phone_number_id';
  if coalesce(source_id,'')='' or jsonb_typeof(p_payload->'raw_value'->'state_sync') is distinct from 'array' then return; end if;
  for item in select value from jsonb_array_elements(p_payload->'raw_value'->'state_sync') loop
    action:=item->>'action';
    if item->>'type' is distinct from 'contact' or action is null or action not in ('add','update','remove') then continue; end if;
    phone:=regexp_replace(coalesce(item->'contact'->>'phone_number',''),'[^0-9]','','g');
    if phone !~ '^[1-9][0-9]{4,14}$' then continue; end if;
    contact_name:=left(coalesce(nullif(item->'contact'->>'full_name',''),item->'contact'->>'first_name',''),500);
    raw_stamp:=item->'metadata'->>'timestamp';
    stamp:=case when raw_stamp ~ '^[0-9]{1,13}$' then raw_stamp::numeric else extract(epoch from p_received)*1000 end;
    if stamp>0 and stamp<100000000000 then stamp:=stamp*1000; end if;
    insert into public.whatsapp_contacts(client_id,source_phone_number_id,phone_number,full_name,source_timestamp,received_at,is_deleted)
    values(p_client,source_id,phone,contact_name,stamp,p_received,action='remove')
    on conflict (client_id,source_phone_number_id,phone_number) do update set
      full_name=case when excluded.full_name='' then whatsapp_contacts.full_name else excluded.full_name end,
      source_timestamp=excluded.source_timestamp,received_at=excluded.received_at,is_deleted=excluded.is_deleted
    where (excluded.source_timestamp,excluded.received_at) >= (whatsapp_contacts.source_timestamp,whatsapp_contacts.received_at);
  end loop;
end; $$;
revoke all on function public.ingest_whatsapp_contact_event(uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.ingest_whatsapp_contact_event(uuid,jsonb,timestamptz) to service_role;

create function public.project_whatsapp_contact_event() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.event_type='smb_app_state_sync' then
    perform public.ingest_whatsapp_contact_event(new.client_id,new.payload,new.created_at);
  end if;
  return new;
end; $$;
revoke all on function public.project_whatsapp_contact_event() from public,anon,authenticated;
grant execute on function public.project_whatsapp_contact_event() to service_role;
create trigger project_whatsapp_contacts after insert or update on public.whatsapp_coexistence_events
for each row execute function public.project_whatsapp_contact_event();

-- Replay captured batches, including initial imports received before the UI existed.
do $$ declare e record; begin
  for e in select client_id,payload,created_at from public.whatsapp_coexistence_events
    where event_type='smb_app_state_sync' and client_id is not null order by created_at,id
  loop perform public.ingest_whatsapp_contact_event(e.client_id,e.payload,e.created_at); end loop;
end; $$;
