begin;

alter table public.supplier_conversations
  add column if not exists status_before_close text;

-- Closing is now reversible through the couple-only function below.
drop trigger if exists keep_supplier_conversation_closed
  on public.supplier_conversations;

create or replace function wedsparks_private.close_supplier_conversation(p_conversation_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid(); v_owner uuid;
begin
  if v_user is null then raise exception 'Please sign in.' using errcode='42501'; end if;
  select couple_user_id into v_owner from public.supplier_conversations
    where id = p_conversation_id for update;
  if not found or v_owner <> v_user then
    raise exception 'Conversation unavailable.' using errcode='42501';
  end if;
  update public.supplier_conversations
    set status_before_close = enquiry_status,
        enquiry_status = 'closed', updated_at = clock_timestamp()
    where id = p_conversation_id and enquiry_status <> 'closed';
  return true;
end;
$function$;

create or replace function wedsparks_private.reopen_supplier_conversation(p_conversation_id uuid)
returns text language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_chat public.supplier_conversations%rowtype;
  v_status text;
begin
  if v_user is null then raise exception 'Please sign in.' using errcode='42501'; end if;
  select * into v_chat from public.supplier_conversations
    where id = p_conversation_id for update;
  if not found or v_chat.couple_user_id <> v_user then
    raise exception 'Conversation unavailable.' using errcode='42501';
  end if;
  if v_chat.enquiry_status <> 'closed' then return v_chat.enquiry_status; end if;

  v_status := case when v_chat.status_before_close in ('new','in_discussion','booked')
    then v_chat.status_before_close
    when exists (
      select 1 from public.supplier_messages m
      where m.conversation_id = p_conversation_id
        and m.sender_user_id <> v_chat.couple_user_id
    ) then 'in_discussion'
    else 'new' end;

  update public.supplier_conversations
    set enquiry_status = v_status, status_before_close = null,
        updated_at = clock_timestamp()
    where id = p_conversation_id;
  return v_status;
end;
$function$;

create or replace function public.reopen_supplier_conversation(p_conversation_id uuid)
returns text language sql security invoker set search_path = ''
as $function$
  select wedsparks_private.reopen_supplier_conversation(p_conversation_id);
$function$;

revoke all on function wedsparks_private.close_supplier_conversation(uuid) from public,anon;
revoke all on function wedsparks_private.reopen_supplier_conversation(uuid) from public,anon;
revoke all on function public.reopen_supplier_conversation(uuid) from public,anon;
grant execute on function wedsparks_private.close_supplier_conversation(uuid) to authenticated;
grant execute on function wedsparks_private.reopen_supplier_conversation(uuid) to authenticated;
grant execute on function public.reopen_supplier_conversation(uuid) to authenticated;

-- Test on one existing chat, then roll back every test write.
do $behavior$
declare
  v_chat uuid; v_couple uuid; v_supplier uuid; v_status text; v_expected text;
begin
  select c.id,c.couple_user_id,a.user_id into v_chat,v_couple,v_supplier
    from public.supplier_conversations c
    join public.supplier_vendor_accounts a on a.vendor_id=c.vendor_id
    where a.user_id <> c.couple_user_id
    order by c.created_at limit 1;
  if v_chat is null then
    raise notice 'No test chat exists. Test close and reopen after installation.';
    return;
  end if;

  begin
    perform set_config('request.jwt.claim.sub',v_couple::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',v_couple,'role','authenticated')::text,true);
    perform public.close_supplier_conversation(v_chat);
    select status_before_close into v_expected from public.supplier_conversations where id=v_chat;
    begin
      perform public.send_supplier_message(v_chat,'Closed chat verification',gen_random_uuid());
      raise exception 'Sending to a closed chat was accepted.';
    exception when others then
      if sqlerrm <> 'This conversation is closed.' then raise; end if;
    end;

    perform set_config('request.jwt.claim.sub',v_supplier::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',v_supplier,'role','authenticated')::text,true);
    begin
      perform public.reopen_supplier_conversation(v_chat);
      raise exception 'A supplier was allowed to reopen the couple''s chat.';
    exception when insufficient_privilege then null;
    end;

    perform set_config('request.jwt.claim.sub',v_couple::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',v_couple,'role','authenticated')::text,true);
    v_status := public.reopen_supplier_conversation(v_chat);
    if v_status not in ('new','in_discussion','booked') then
      raise exception 'Reopening did not restore an open status.';
    end if;
    if v_expected in ('new','in_discussion','booked') and v_status <> v_expected then
      raise exception 'Reopening did not preserve the previous status.';
    end if;
    if public.reopen_supplier_conversation(v_chat) is distinct from v_status then
      raise exception 'Repeated reopen changed the status.';
    end if;
    perform public.send_supplier_message(v_chat,'Reopened chat verification',gen_random_uuid());

    raise exception using errcode='P9001',message='Rollback successful behavioral checks';
  exception when sqlstate 'P9001' then null;
  end;
end;
$behavior$;

do $verify$
begin
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.reopen_supplier_conversation(gen_random_uuid());
    raise exception 'Unsigned reopen was accepted.';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

commit;

select
  has_function_privilege('authenticated','public.reopen_supplier_conversation(uuid)','EXECUTE')
    as reopen_ready,
  not has_function_privilege('anon','public.reopen_supplier_conversation(uuid)','EXECUTE')
    as anonymous_blocked,
  not exists (select 1 from pg_trigger
    where tgrelid='public.supplier_conversations'::regclass
      and tgname='keep_supplier_conversation_closed' and not tgisinternal)
    as permanent_lock_removed;
