-- Manual snapshots only. Raw signed webhook batches remain private until requested.
drop trigger project_whatsapp_contacts on public.whatsapp_coexistence_events;
create table public.whatsapp_contact_syncs (
 client_id uuid not null references public.clients(id) on delete cascade,
 source_phone_number_id text not null,
 synced_at timestamptz not null,
 primary key(client_id,source_phone_number_id)
);
alter table public.whatsapp_contact_syncs enable row level security;
revoke all on public.whatsapp_contact_syncs from public,anon,authenticated;
grant select on public.whatsapp_contact_syncs to authenticated;
grant all on public.whatsapp_contact_syncs to service_role;
create policy contact_sync_owner_read on public.whatsapp_contact_syncs for select to authenticated
 using (exists(select 1 from public.clients c where c.id=client_id and c.user_id=(select auth.uid())));
alter policy contacts_owner_read on public.whatsapp_contacts using (
 exists(select 1 from public.clients c where c.id=client_id and c.user_id=(select auth.uid()))
 and exists(select 1 from public.whatsapp_contact_syncs s where s.client_id=whatsapp_contacts.client_id and s.source_phone_number_id=whatsapp_contacts.source_phone_number_id)
);
create schema if not exists private;
grant usage on schema private to authenticated;
create function private.sync_whatsapp_contacts(p_client_id uuid) returns bigint
 language plpgsql security definer set search_path='' as $$
declare source_id text; e record; total bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select c.whatsapp_phone_number_id into source_id from public.clients c
 where c.id=p_client_id and c.user_id=auth.uid() for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 if coalesce(source_id,'')='' then raise exception 'No connected number'; end if;
 for e in select payload,created_at from public.whatsapp_coexistence_events
 where client_id=p_client_id and event_type='smb_app_state_sync'
 and payload->>'phone_number_id'=source_id order by created_at,id
 loop perform public.ingest_whatsapp_contact_event(p_client_id,e.payload,e.created_at); end loop;
 insert into public.whatsapp_contact_syncs values(p_client_id,source_id,clock_timestamp())
 on conflict(client_id,source_phone_number_id) do update set synced_at=excluded.synced_at;
 select count(*) into total from public.whatsapp_contacts where client_id=p_client_id and source_phone_number_id=source_id and not is_deleted;
 return total;
end; $$;
revoke all on function private.sync_whatsapp_contacts(uuid) from public,anon,authenticated;
grant execute on function private.sync_whatsapp_contacts(uuid) to authenticated;
create function public.sync_whatsapp_contacts(p_client_id uuid) returns bigint
 language sql security invoker set search_path='' as $$ select private.sync_whatsapp_contacts(p_client_id); $$;
revoke all on function public.sync_whatsapp_contacts(uuid) from public,anon,authenticated;
grant execute on function public.sync_whatsapp_contacts(uuid) to authenticated;
