-- Section permissions: old staff retain Orders unless explicitly disabled.
-- New optional permissions are denied unless the JSON value is boolean true.
create or replace function private.has_staff_permission(p_client_id uuid, p_permission text)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select auth.uid() is not null and p_permission = any(array['orders','contacts','carts','analytics','templates','addons','channels','settings']) and (
    exists(select 1 from public.clients c where c.id=p_client_id and c.user_id=auth.uid())
    or exists(select 1 from public.client_staff s where s.client_id=p_client_id and s.user_id=auth.uid()
      and (s.permissions->p_permission = 'true'::jsonb
        or (p_permission='orders' and not (s.permissions ? 'orders'))))
  );
$$;
revoke all on function private.has_staff_permission(uuid,text) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.has_staff_permission(uuid,text) to authenticated;

alter policy staff_can_select_store_order_events on public.store_order_events
using (private.has_staff_permission(client_id, case when event_type='abandoned_cart' then 'carts' else 'orders' end));

alter policy contact_sync_owner_read on public.whatsapp_contact_syncs
using (private.has_staff_permission(client_id,'contacts'));

alter policy contacts_owner_read on public.whatsapp_contacts
using (private.has_staff_permission(client_id,'contacts')
and exists(select 1 from public.whatsapp_contact_syncs s where s.client_id=whatsapp_contacts.client_id and s.source_phone_number_id=whatsapp_contacts.source_phone_number_id));

alter policy client_can_select_own_templates on public.whatsapp_message_templates
using (private.has_staff_permission(client_id,'templates')
or (purpose like 'cart_reminder%' and private.has_staff_permission(client_id,'carts')));

create or replace function private.authorized_cart_reminder_policy(p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_staff_permission(p_client_id,'carts') then return null; end if;
  return public.client_cart_reminder_policy(p_client_id);
end;
$$;
revoke all on function private.authorized_cart_reminder_policy(uuid) from public,anon;
grant execute on function private.authorized_cart_reminder_policy(uuid) to authenticated;
create or replace function public.my_cart_reminder_policy(p_client_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.authorized_cart_reminder_policy(p_client_id); $$;
