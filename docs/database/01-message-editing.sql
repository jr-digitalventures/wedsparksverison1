begin;

alter table public.supplier_messages
  add column if not exists edited_at timestamp with time zone;

-- Messages remain read-only through the table API.
-- Edits go through the checked function below.
revoke update on public.supplier_messages from public, anon, authenticated;
do $block$
declare
  v_column text;
begin
  for v_column in
    select attname from pg_attribute
    where attrelid = 'public.supplier_messages'::regclass
      and attnum > 0 and not attisdropped
  loop
    execute format(
      'revoke update (%I) on public.supplier_messages from public, anon, authenticated',
      v_column
    );
  end loop;
end;
$block$;

create or replace function wedsparks_private.edit_supplier_message(
  p_message_id uuid,
  p_body text,
  p_expected_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_conversation uuid;
  v_message public.supplier_messages%rowtype;
  v_body text := btrim(p_body);
  v_now timestamp with time zone;
begin
  if v_user is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  if p_message_id is null or v_body is null
     or char_length(v_body) < 1 or char_length(v_body) > 4000
     or v_body !~ '[^[:space:]]' or p_expected_body is null then
    raise exception 'Enter a message of 1 to 4,000 characters.';
  end if;

  select m.conversation_id into v_conversation
  from public.supplier_messages m
  where m.id = p_message_id and m.sender_user_id = v_user;

  if v_conversation is null
     or not wedsparks_private.can_access_supplier_conversation(v_conversation) then
    raise exception 'Message unavailable.' using errcode = '42501';
  end if;

  -- Match the send function's locking order: conversation, then message.
  perform 1 from public.supplier_conversations c
    where c.id = v_conversation for update;

  select m.* into v_message from public.supplier_messages m
    where m.id = p_message_id for update;

  if not found or v_message.sender_user_id <> v_user
     or not wedsparks_private.can_access_supplier_conversation(v_conversation) then
    raise exception 'Message unavailable.' using errcode = '42501';
  end if;

  -- clock_timestamp() is checked after waiting for locks.
  v_now := clock_timestamp();
  if v_now >= v_message.created_at + interval '5 minutes'
     or v_message.created_at > v_now then
    raise exception 'The five-minute editing window has ended.';
  end if;
  if v_message.body is distinct from p_expected_body then
    raise exception 'This message has changed. Close and reopen the editor.';
  end if;

  if v_message.body is distinct from v_body then
    update public.supplier_messages
      set body = v_body, edited_at = v_now
      where id = p_message_id
      returning * into v_message;

    update public.supplier_conversations
      set updated_at = greatest(updated_at, v_now)
      where id = v_conversation;
  end if;

  return to_jsonb(v_message);
end;
$function$;

create or replace function public.edit_supplier_message(
  p_message_id uuid,
  p_body text,
  p_expected_body text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select wedsparks_private.edit_supplier_message(
    p_message_id, p_body, p_expected_body
  );
$function$;

revoke all on function wedsparks_private.edit_supplier_message(uuid,text,text)
  from public, anon;
revoke all on function public.edit_supplier_message(uuid,text,text)
  from public, anon;
grant execute on function wedsparks_private.edit_supplier_message(uuid,text,text)
  to authenticated;
grant execute on function public.edit_supplier_message(uuid,text,text)
  to authenticated;

-- Verify that unauthenticated calls are refused without changing messages.
do $verify$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform wedsparks_private.edit_supplier_message(
      gen_random_uuid(), 'Access test', 'Access test'
    );
    raise exception 'Verification failed: unauthenticated edit was accepted.';
  exception
    when insufficient_privilege then null;
  end;
end;
$verify$;

commit;

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'supplier_messages'
      and column_name = 'edited_at'
  ) as edited_at_ready,
  has_function_privilege(
    'authenticated', 'public.edit_supplier_message(uuid,text,text)', 'EXECUTE'
  ) as signed_in_can_call,
  not has_function_privilege(
    'anon', 'public.edit_supplier_message(uuid,text,text)', 'EXECUTE'
  ) as anonymous_blocked,
  not has_column_privilege(
    'authenticated', 'public.supplier_messages', 'body', 'UPDATE'
  ) as direct_edits_blocked;
