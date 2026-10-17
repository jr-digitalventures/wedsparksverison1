begin;

create or replace function wedsparks_private.message_inbox_rows()
returns setof jsonb
language plpgsql stable security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  return query
  select jsonb_build_object(
    'id', c.id, 'vendor_id', c.vendor_id, 'couple_user_id', c.couple_user_id,
    'subject', c.subject, 'enquiry_status', c.enquiry_status,
    'created_at', c.created_at, 'updated_at', c.updated_at,
    'business_name', v."Name of Wedding Vendor",
    'business_category', btrim(v."Wedding Vendor Type"),
    'business_image', v."Image #1",
    'couple_name', nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'last_message', latest.body, 'last_sender_user_id', latest.sender_user_id,
    'last_message_at', latest.created_at, 'unread_count', unread.total
  )
  from public.supplier_conversations c
  join public."Vendor Public Profiles" v on v.vendor_id = c.vendor_id
  left join public.profiles p on p.user_id = c.couple_user_id
  left join public.supplier_conversation_reads r
    on r.conversation_id = c.id and r.user_id = v_user
  left join lateral (
    select m.body, m.sender_user_id, m.created_at
    from public.supplier_messages m where m.conversation_id = c.id
    order by m.created_at desc, m.id desc limit 1
  ) latest on true
  cross join lateral (
    select count(*) as total from public.supplier_messages m
    where m.conversation_id = c.id and m.sender_user_id <> v_user
      and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  ) unread
  where c.couple_user_id = v_user or exists (
    select 1 from public.supplier_vendor_accounts a
    where a.vendor_id = c.vendor_id and a.user_id = v_user
  );
end;
$function$;

create or replace function wedsparks_private.get_message_inbox(
  p_status text default 'open', p_category text default '',
  p_limit integer default 51, p_offset integer default 0
)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $function$
declare v_result jsonb;
begin
  if p_status is null or p_status not in ('open','closed','all')
     or p_limit is null or p_limit < 1 or p_limit > 100
     or p_offset is null or p_offset < 0 or p_offset > 10000
     or char_length(coalesce(p_category,'')) > 200 then
    raise exception 'Invalid conversation filters.';
  end if;
  with source as materialized (
    select value from wedsparks_private.message_inbox_rows() value
  ), filtered as (
    select value from source
    where (p_status = 'all'
      or (p_status = 'closed' and value->>'enquiry_status' = 'closed')
      or (p_status = 'open' and value->>'enquiry_status' <> 'closed'))
      and (coalesce(p_category,'') = '' or value->>'business_category' = p_category)
  ), page as (
    select value from filtered
    order by (value->>'updated_at')::timestamptz desc, value->>'id' desc
    limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(value order by
      (value->>'updated_at')::timestamptz desc, value->>'id' desc) from page),'[]'::jsonb),
    'total', (select count(*) from filtered),
    'all_total', (select count(*) from source),
    'unread_total', (select coalesce(sum((value->>'unread_count')::bigint),0)
      from source where value->>'enquiry_status' <> 'closed'),
    'categories', coalesce((select jsonb_agg(category order by category)
      from (select distinct nullif(value->>'business_category','') as category
        from source) categories where category is not null),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;

create or replace function public.get_message_inbox(
  p_status text default 'open', p_category text default '',
  p_limit integer default 51, p_offset integer default 0
)
returns jsonb language sql stable security invoker set search_path = ''
as $function$
  select wedsparks_private.get_message_inbox(p_status,p_category,p_limit,p_offset);
$function$;

create or replace function public.get_message_thread(p_conversation_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $function$
  select value from wedsparks_private.message_inbox_rows() value
    where value->>'id' = p_conversation_id::text;
$function$;

create or replace function wedsparks_private.mark_supplier_conversation_read(
  p_conversation_id uuid, p_through_message_id uuid
)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_through timestamptz;
begin
  if v_user is null or not wedsparks_private.can_access_supplier_conversation(p_conversation_id) then
    raise exception 'Conversation unavailable.' using errcode = '42501';
  end if;
  select created_at into v_through from public.supplier_messages
    where id = p_through_message_id and conversation_id = p_conversation_id;
  if not found then raise exception 'Message unavailable.'; end if;

  insert into public.supplier_conversation_reads
    (conversation_id,user_id,last_read_at,updated_at)
  values (p_conversation_id,v_user,v_through,clock_timestamp())
  on conflict (conversation_id,user_id) do update
    set last_read_at = greatest(
      public.supplier_conversation_reads.last_read_at, excluded.last_read_at
    ), updated_at = clock_timestamp();
  return true;
end;
$function$;

create or replace function public.mark_supplier_conversation_read(
  p_conversation_id uuid, p_through_message_id uuid
)
returns boolean language sql security invoker set search_path = ''
as $function$
  select wedsparks_private.mark_supplier_conversation_read(p_conversation_id,p_through_message_id);
$function$;

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
    set enquiry_status = 'closed', updated_at = clock_timestamp()
    where id = p_conversation_id and enquiry_status <> 'closed';
  return true;
end;
$function$;

create or replace function public.close_supplier_conversation(p_conversation_id uuid)
returns boolean language sql security invoker set search_path = ''
as $function$
  select wedsparks_private.close_supplier_conversation(p_conversation_id);
$function$;

-- Enforce closing even for old clients and direct RPC calls.
create or replace function wedsparks_private.guard_closed_supplier_messages()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_status text;
begin
  select enquiry_status into v_status from public.supplier_conversations
    where id = new.conversation_id for update;
  if v_status = 'closed' then
    raise exception 'This conversation is closed.';
  end if;
  return new;
end;
$function$;

create or replace function wedsparks_private.keep_supplier_conversation_closed()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if old.enquiry_status = 'closed' and new.enquiry_status <> 'closed' then
    raise exception 'This conversation is permanently closed.';
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_closed_supplier_messages on public.supplier_messages;
create trigger guard_closed_supplier_messages
  before insert or update of body on public.supplier_messages
  for each row execute function wedsparks_private.guard_closed_supplier_messages();
drop trigger if exists keep_supplier_conversation_closed on public.supplier_conversations;
create trigger keep_supplier_conversation_closed
  before update of enquiry_status on public.supplier_conversations
  for each row execute function wedsparks_private.keep_supplier_conversation_closed();

-- Scope privileges to these functions; preserve other private-schema access.
revoke all on function wedsparks_private.message_inbox_rows() from public,anon;
revoke all on function wedsparks_private.get_message_inbox(text,text,integer,integer) from public,anon;
revoke all on function public.get_message_inbox(text,text,integer,integer) from public,anon;
revoke all on function public.get_message_thread(uuid) from public,anon;
revoke all on function wedsparks_private.mark_supplier_conversation_read(uuid,uuid) from public,anon;
revoke all on function public.mark_supplier_conversation_read(uuid,uuid) from public,anon;
revoke all on function wedsparks_private.close_supplier_conversation(uuid) from public,anon;
revoke all on function public.close_supplier_conversation(uuid) from public,anon;
revoke all on function wedsparks_private.guard_closed_supplier_messages() from public,anon,authenticated;
revoke all on function wedsparks_private.keep_supplier_conversation_closed() from public,anon,authenticated;
grant execute on function wedsparks_private.message_inbox_rows() to authenticated;
grant execute on function wedsparks_private.get_message_inbox(text,text,integer,integer) to authenticated;
grant execute on function public.get_message_inbox(text,text,integer,integer) to authenticated;
grant execute on function public.get_message_thread(uuid) to authenticated;
grant execute on function wedsparks_private.mark_supplier_conversation_read(uuid,uuid) to authenticated;
grant execute on function public.mark_supplier_conversation_read(uuid,uuid) to authenticated;
grant execute on function wedsparks_private.close_supplier_conversation(uuid) to authenticated;
grant execute on function public.close_supplier_conversation(uuid) to authenticated;

do $publication$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables where pubname='supabase_realtime'
         and schemaname='public' and tablename='supplier_conversation_reads'
     ) then
    alter publication supabase_realtime add table public.supplier_conversation_reads;
  end if;
end;
$publication$;

do $verify$
begin
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.get_message_inbox();
    raise exception 'Unsigned inbox access was accepted.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.close_supplier_conversation(gen_random_uuid());
    raise exception 'Unsigned close was accepted.';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

-- Exercise closing/read access on one existing chat, then roll back all test writes.
-- No history is deleted and the selected chat remains in its original state.
do $behavior$
declare
  v_chat uuid; v_couple uuid; v_supplier uuid; v_message uuid;
  v_result jsonb; v_role uuid;
begin
  select c.id,c.couple_user_id,a.user_id into v_chat,v_couple,v_supplier
    from public.supplier_conversations c
    join public.supplier_vendor_accounts a on a.vendor_id=c.vendor_id
    where c.enquiry_status <> 'closed' and a.user_id <> c.couple_user_id
    order by c.created_at limit 1;
  if v_chat is null then
    raise notice 'No open test chat exists; run the UI closing test after installation.';
    return;
  end if;

  begin
    perform set_config('request.jwt.claim.sub',v_couple::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',v_couple,'role','authenticated')::text,true);
    select id into v_message from public.supplier_messages where conversation_id=v_chat
      order by created_at desc,id desc limit 1;
    if v_message is not null then
      if public.mark_supplier_conversation_read(v_chat,v_message) is distinct from true then
        raise exception 'Read tracking verification failed.';
      end if;
    end if;
    if public.close_supplier_conversation(v_chat) is distinct from true then
      raise exception 'Closing verification failed.';
    end if;
    v_result := public.get_message_thread(v_chat);
    if v_result->>'enquiry_status' is distinct from 'closed' then
      raise exception 'Closed chat was not readable.';
    end if;

    foreach v_role in array array[v_couple,v_supplier] loop
      perform set_config('request.jwt.claim.sub',v_role::text,true);
      perform set_config('request.jwt.claims',jsonb_build_object('sub',v_role,'role','authenticated')::text,true);
      begin
        perform public.send_supplier_message(v_chat,'Closed chat verification',gen_random_uuid());
        raise exception 'Sending to a closed chat was accepted.';
      exception when others then
        if sqlerrm <> 'This conversation is closed.' then raise; end if;
      end;
    end loop;

    begin
      update public.supplier_conversations set enquiry_status='new' where id=v_chat;
      raise exception 'Reopening a permanently closed chat was accepted.';
    exception when others then
      if sqlerrm <> 'This conversation is permanently closed.' then raise; end if;
    end;

    perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
    perform set_config('request.jwt.claims','{}',true);
    begin
      perform public.close_supplier_conversation(v_chat);
      raise exception 'A different account was allowed to close a chat.';
    exception when insufficient_privilege then null;
    end;

    -- Roll back the read receipt and close above, while retaining the new functions.
    raise exception using errcode='P9001',message='Rollback successful behavioral checks';
  exception when sqlstate 'P9001' then null;
  end;
end;
$behavior$;


commit;

select
  has_function_privilege('authenticated','public.get_message_inbox(text,text,integer,integer)','EXECUTE')
    as filters_ready,
  has_function_privilege('authenticated','public.close_supplier_conversation(uuid)','EXECUTE')
    as close_ready,
  has_function_privilege('authenticated','public.mark_supplier_conversation_read(uuid,uuid)','EXECUTE')
    as unread_tracking_ready,
  not has_function_privilege('anon','public.get_message_inbox(text,text,integer,integer)','EXECUTE')
    as anonymous_blocked;
