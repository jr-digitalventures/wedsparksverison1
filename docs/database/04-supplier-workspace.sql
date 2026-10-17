-- Run once in Supabase SQL Editor. Safe to rerun; does not publish any business.
-- Based on the project structure supplied on 17 October 2026.
begin;
create schema if not exists wedsparks_private;

create table if not exists public.supplier_workspaces (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  workspace jsonb not null default '{}'::jsonb,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  constraint supplier_workspace_size check (octet_length(workspace::text) <= 500000),
  constraint supplier_workspace_object check (jsonb_typeof(workspace) = 'object')
);
alter table public.supplier_workspaces enable row level security;
revoke all on public.supplier_workspaces from public, anon, authenticated;
-- Access is through ownership-checked RPCs only. No client can reassign ownership.

create table if not exists public.supplier_storefront_publications (
  vendor_id uuid primary key references public."Vendor Public Profiles"(vendor_id) on delete cascade,
  user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  payload jsonb not null,
  visible boolean not null default true,
  published_at timestamptz not null default now()
);
alter table public.supplier_storefront_publications enable row level security;
revoke all on public.supplier_storefront_publications from public, anon, authenticated;

create table if not exists public.supplier_reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public."Vendor Public Profiles"(vendor_id) on delete cascade,
  couple_user_id uuid not null references public.profiles(user_id),
  rating integer not null check (rating between 1 and 5),
  body text not null check (length(body) between 1 and 6000),
  author text not null default 'WedSparks couple' check (length(author) <= 120),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists supplier_reviews_vendor_public on public.supplier_reviews(vendor_id,created_at desc) where published;
alter table public.supplier_reviews enable row level security;
revoke all on public.supplier_reviews from public, anon, authenticated;
-- Review submission/verified booking checks will be connected with the booking flow.
-- Suppliers cannot create, remove or change couple reviews through this workspace.

create or replace function wedsparks_private.require_workspace_supplier()
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare u uuid := auth.uid();
begin
  if u is null or not exists(select 1 from public.user_roles where user_id=u and role='supplier') then
    raise exception 'A supplier account is required.' using errcode='42501';
  end if;
  return u;
end; $$;
revoke all on function wedsparks_private.require_workspace_supplier() from public,anon,authenticated;

create or replace function wedsparks_private.public_storefront_visible(p_vendor_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public."Vendor Public Profiles" v join public.supplier_vendor_accounts a using(vendor_id)
    where v.vendor_id=p_vendor_id and coalesce(v."Profile Active",true)
    and nullif(btrim(v."Name of Wedding Vendor"),'') is not null and nullif(btrim(v."Wedding Vendor Type"),'') is not null
    and nullif(btrim(v."About Paragraph"),'') is not null and nullif(btrim(v."Image #1"),'') is not null
    and nullif(btrim(coalesce(v."Location - Suburb/City",v."Location")),'') is not null);
$$;
create or replace function wedsparks_private.get_supplier_workspace()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare u uuid:=wedsparks_private.require_workspace_supplier(); v public."Vendor Public Profiles"%rowtype;
  w public.supplier_workspaces%rowtype; pub public.supplier_storefront_publications%rowtype;
  seed jsonb; images jsonb;
begin
  select p.* into v from public."Vendor Public Profiles" p join public.supplier_vendor_accounts a using(vendor_id) where a.user_id=u;
  select * into w from public.supplier_workspaces where user_id=u;
  select * into pub from public.supplier_storefront_publications where user_id=u;
  select coalesce(jsonb_agg(jsonb_build_object('url',url) order by ord),'[]'::jsonb) into images
    from unnest(array[v."Image #1",v."Image #2",v."Image #3",v."Image #4",v."Image #5",v."Image #6",v."Image #7",v."Image #8",v."Image #9",v."Image #10"]) with ordinality as photos(url,ord)
    where nullif(btrim(url),'') is not null;
  seed=jsonb_build_object('storefront',jsonb_build_object('name',coalesce(v."Name of Wedding Vendor",''),'category',coalesce(v."Wedding Vendor Type",''),
    'about',coalesce(v."About Paragraph",''),'city',coalesce(v."Location - Suburb/City",v."Location",''),'state',coalesce(v."Location - State",''),
    'startingPrice',coalesce(v."Starting Price",''),'features',concat_ws(E'\n',v."Showcased Feature #1",v."Showcased Feature #2",v."Showcased Feature #3",v."Showcased Feature #4"),'images',images),
    'packages','[]'::jsonb,'availability','[]'::jsonb,'bookings','[]'::jsonb,'quoteDrafts','[]'::jsonb,'capacity',1);
  return jsonb_build_object('workspace',coalesce(w.workspace,seed),'version',coalesce(w.version,0),'vendor_id',v.vendor_id,
    'published',case when pub.visible then jsonb_build_object('published_at',pub.published_at)
      when pub.vendor_id is null and v.vendor_id is not null and wedsparks_private.public_storefront_visible(v.vendor_id)
      then jsonb_build_object('published_at',null) else null end);
end; $$;

create or replace function wedsparks_private.save_supplier_workspace(p_workspace jsonb,p_version integer,p_owner uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare u uuid:=wedsparks_private.require_workspace_supplier(); current_version integer; section text;
begin
  if u is distinct from p_owner then raise exception 'Your session changed.' using errcode='42501'; end if;
  if p_workspace is null or jsonb_typeof(p_workspace)<>'object' or octet_length(p_workspace::text)>500000 or jsonb_typeof(p_workspace->'storefront') is distinct from 'object' then
    raise exception 'Invalid workspace.' using errcode='22023';
  end if;
  foreach section in array array['packages','availability','bookings','quoteDrafts'] loop
    if jsonb_typeof(p_workspace->section) is distinct from 'array' or jsonb_array_length(p_workspace->section)>1500 then
      raise exception 'Invalid workspace section.' using errcode='22023';
    end if;
  end loop;
  if jsonb_typeof(p_workspace#>'{storefront,images}') is distinct from 'array' or jsonb_array_length(p_workspace#>'{storefront,images}')>10 then
    raise exception 'Up to ten photos are allowed.' using errcode='22023';
  end if;
  perform 1 from public.profiles where user_id=u for update;
  select version into current_version from public.supplier_workspaces where user_id=u;
  if coalesce(current_version,0) is distinct from p_version then raise exception 'Workspace changed in another tab.' using errcode='40001'; end if;
  insert into public.supplier_workspaces(user_id,workspace,version) values(u,p_workspace,p_version+1)
    on conflict(user_id) do update set workspace=excluded.workspace,version=excluded.version,updated_at=now();
  return jsonb_build_object('version',p_version+1);
end; $$;

create or replace function wedsparks_private.publish_supplier_storefront(p_version integer,p_images jsonb,p_owner uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare u uuid:=wedsparks_private.require_workspace_supplier(); w public.supplier_workspaces%rowtype;
  v public."Vendor Public Profiles"%rowtype; id uuid; s jsonb; packages_public jsonb; img jsonb; resolved jsonb:='[]'::jsonb;
  photo text; n integer; public_prefix text:='https://vfdtyxcfrqnqdyuimtho.supabase.co/storage/v1/object/public/supplier-storefront-public/';
begin
  if u is distinct from p_owner then raise exception 'Your session changed.' using errcode='42501'; end if;
  perform 1 from public.profiles where user_id=u for update;
  select * into w from public.supplier_workspaces where user_id=u;
  if w.version is null or w.version is distinct from p_version then raise exception 'Save the latest draft before publishing.' using errcode='40001'; end if;
  s=w.workspace->'storefront';
  foreach photo in array array['name','category','about','city','state'] loop
    if nullif(btrim(s->>photo),'') is null or length(s->>photo)>6000 then raise exception 'Complete the storefront essentials before publishing.' using errcode='22023'; end if;
  end loop;
  if length(s->>'name')>250 or length(s->>'category')>120 then raise exception 'Business name or category is too long.' using errcode='22023'; end if;
  if jsonb_typeof(p_images) is distinct from 'array' or jsonb_array_length(p_images) not between 1 and 10 then raise exception 'Add a main photo.' using errcode='22023'; end if;
  if jsonb_array_length(p_images)<>jsonb_array_length(s->'images') then raise exception 'Photos changed. Save and try again.' using errcode='22023'; end if;
  select p.* into v from public."Vendor Public Profiles" p join public.supplier_vendor_accounts a using(vendor_id) where a.user_id=u;
  id=coalesce(v.vendor_id,gen_random_uuid());
  for img in select value from jsonb_array_elements(p_images) loop
    if img ? 'public_path' then
      photo=img->>'public_path';
      if photo is null or photo not like u::text||'/%' or photo like '%..%' or photo !~ '^[a-f0-9-]+/[a-f0-9-]+\.(jpg|png|webp)$' or not exists(select 1 from storage.objects where bucket_id='supplier-storefront-public' and name=photo) then
        raise exception 'Invalid photo ownership.' using errcode='42501';
      end if;
      photo=public_prefix||photo;
    else
      photo=img->>'url';
      if photo is null or photo !~ '^https?://' or not coalesce(photo=any(array[v."Image #1",v."Image #2",v."Image #3",v."Image #4",v."Image #5",v."Image #6",v."Image #7",v."Image #8",v."Image #9",v."Image #10"]),false) then
        raise exception 'Upload a photo to your own storefront.' using errcode='42501';
      end if;
    end if;
    resolved=resolved||jsonb_build_array(photo);
  end loop;
  -- Only public-facing fields enter the snapshot. Booking notes and quote drafts never do.
  s=jsonb_build_object('name',btrim(s->>'name'),'category',btrim(s->>'category'),'about',s->>'about','tagline',s->>'tagline',
    'city',s->>'city','state',s->>'state','serviceAreas',s->>'serviceAreas','startingPrice',s->>'startingPrice','website',s->>'website',
    'features',s->>'features','faq',s->>'faq','cancellation',s->>'cancellation','privacy',s->>'privacy','images',resolved);
  select coalesce(jsonb_agg(jsonb_build_object('name',item->>'name','price',item->'price','basis',item->>'basis',
    'description',item->>'description','inclusions',item->>'inclusions')),'[]'::jsonb) into packages_public
    from jsonb_array_elements(w.workspace->'packages') as entries(item) where coalesce(item->>'visible','true')='true';
  insert into public."Vendor Public Profiles"(vendor_id,"Name of Wedding Vendor","Wedding Vendor Type","About Paragraph","Location - Suburb/City","Location - State","Location","Starting Price","Profile Active","Destination URL")
    values(id,s->>'name',s->>'category',s->>'about',s->>'city',s->>'state',concat_ws(', ',s->>'city',s->>'state'),s->>'startingPrice',true,
      'https://jr-digitalventures.github.io/wedsparksverison1/supplier/?id='||id::text)
    on conflict(vendor_id) do update set "Name of Wedding Vendor"=excluded."Name of Wedding Vendor","Wedding Vendor Type"=excluded."Wedding Vendor Type",
      "About Paragraph"=excluded."About Paragraph","Location - Suburb/City"=excluded."Location - Suburb/City","Location - State"=excluded."Location - State",
      "Location"=excluded."Location","Starting Price"=excluded."Starting Price","Profile Active"=true,"Destination URL"=excluded."Destination URL";
  for n in 1..10 loop execute format('update public."Vendor Public Profiles" set %I=$1 where vendor_id=$2','Image #'||n) using resolved->>(n-1),id; end loop;
  for n in 1..4 loop execute format('update public."Vendor Public Profiles" set %I=$1 where vendor_id=$2','Showcased Feature #'||n) using nullif(split_part(s->>'features',E'\n',n),''),id; end loop;
  insert into public.supplier_vendor_accounts(vendor_id,user_id) values(id,u) on conflict(user_id) do nothing;
  insert into public.supplier_storefront_publications(vendor_id,user_id,payload,visible,published_at)
    values(id,u,jsonb_build_object('storefront',s,'packages',packages_public),true,now())
    on conflict(vendor_id) do update set payload=excluded.payload,visible=true,published_at=now();
  return jsonb_build_object('vendor_id',id,'published',jsonb_build_object('published_at',now()));
end; $$;

create or replace function wedsparks_private.unpublish_supplier_storefront(p_owner uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare u uuid:=wedsparks_private.require_workspace_supplier();
begin
  if u is distinct from p_owner then raise exception 'Your session changed.' using errcode='42501'; end if;
  perform 1 from public.profiles where user_id=u for update;
  update public.supplier_storefront_publications set visible=false where user_id=u;
  update public."Vendor Public Profiles" set "Profile Active"=false where vendor_id in(select vendor_id from public.supplier_vendor_accounts where user_id=u);
  return true;
end; $$;

create or replace function wedsparks_private.can_read_storefront(p_vendor_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select wedsparks_private.public_storefront_visible(p_vendor_id) or exists(select 1 from public.supplier_vendor_accounts where vendor_id=p_vendor_id and user_id=(select auth.uid()));
$$;

create or replace function wedsparks_private.get_supplier_reviews(p_vendor_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when wedsparks_private.can_read_storefront(p_vendor_id) then
    (select coalesce(jsonb_agg(jsonb_build_object('rating',rating,'body',body,'author',author,'created_at',created_at) order by created_at desc),'[]'::jsonb)
      from (select * from public.supplier_reviews where vendor_id=p_vendor_id and published order by created_at desc limit 100) r)
    else '[]'::jsonb end;
$$;
create or replace function wedsparks_private.get_public_supplier_storefront(p_vendor_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare p jsonb; v public."Vendor Public Profiles"%rowtype; images jsonb;
begin
  if not wedsparks_private.public_storefront_visible(p_vendor_id) then return null; end if;
  select payload into p from public.supplier_storefront_publications where vendor_id=p_vendor_id and visible;
  if p is null then
    select * into v from public."Vendor Public Profiles" where vendor_id=p_vendor_id;
    select coalesce(jsonb_agg(url order by ord),'[]'::jsonb) into images from unnest(array[v."Image #1",v."Image #2",v."Image #3",v."Image #4",v."Image #5",v."Image #6",v."Image #7",v."Image #8",v."Image #9",v."Image #10"]) with ordinality as photos(url,ord) where nullif(btrim(url),'') is not null;
    p=jsonb_build_object('storefront',jsonb_build_object('name',v."Name of Wedding Vendor",'category',v."Wedding Vendor Type",'about',v."About Paragraph",'city',coalesce(v."Location - Suburb/City",v."Location"),'state',v."Location - State",'startingPrice',v."Starting Price",'features',concat_ws(E'\n',v."Showcased Feature #1",v."Showcased Feature #2",v."Showcased Feature #3",v."Showcased Feature #4"),'images',images),'packages','[]'::jsonb);
  end if;
  return p||jsonb_build_object('reviews',wedsparks_private.get_supplier_reviews(p_vendor_id));
end; $$;

-- Public wrappers expose only the intended APIs, not the private schema.
create or replace function public.get_supplier_workspace() returns jsonb language sql security invoker set search_path='' as $$select wedsparks_private.get_supplier_workspace();$$;
create or replace function public.save_supplier_workspace(p_workspace jsonb,p_version integer,p_owner uuid) returns jsonb language sql security invoker set search_path='' as $$select wedsparks_private.save_supplier_workspace(p_workspace,p_version,p_owner);$$;
create or replace function public.publish_supplier_storefront(p_version integer,p_images jsonb,p_owner uuid) returns jsonb language sql security invoker set search_path='' as $$select wedsparks_private.publish_supplier_storefront(p_version,p_images,p_owner);$$;
create or replace function public.unpublish_supplier_storefront(p_owner uuid) returns boolean language sql security invoker set search_path='' as $$select wedsparks_private.unpublish_supplier_storefront(p_owner);$$;
create or replace function public.get_public_supplier_storefront(p_vendor_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select wedsparks_private.get_public_supplier_storefront(p_vendor_id);$$;
create or replace function public.get_supplier_reviews(p_vendor_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select wedsparks_private.get_supplier_reviews(p_vendor_id);$$;

do $permissions$
declare name text;
begin
  foreach name in array array['get_supplier_workspace()','save_supplier_workspace(jsonb,integer,uuid)','publish_supplier_storefront(integer,jsonb,uuid)','unpublish_supplier_storefront(uuid)'] loop
    execute 'revoke all on function public.'||name||' from public,anon,authenticated';
    execute 'revoke all on function wedsparks_private.'||name||' from public,anon,authenticated';
    execute 'grant execute on function public.'||name||' to authenticated';
    execute 'grant execute on function wedsparks_private.'||name||' to authenticated';
  end loop;
  foreach name in array array['get_public_supplier_storefront(uuid)','get_supplier_reviews(uuid)','can_read_storefront(uuid)'] loop
    execute 'revoke all on function wedsparks_private.'||name||' from public,anon,authenticated';
    execute 'grant execute on function wedsparks_private.'||name||' to anon,authenticated';
  end loop;
end; $permissions$;
revoke all on function wedsparks_private.public_storefront_visible(uuid) from public,anon,authenticated;
revoke all on function public.get_public_supplier_storefront(uuid),public.get_supplier_reviews(uuid) from public,anon,authenticated;
grant execute on function public.get_public_supplier_storefront(uuid),public.get_supplier_reviews(uuid) to anon,authenticated;
grant usage on schema wedsparks_private to anon,authenticated;

-- Keep existing SELECT policies, but require signed-up/complete/visible businesses.
-- The connected owner can still load their unpublished business.
alter table public."Vendor Public Profiles" enable row level security;
drop policy if exists "Storefront visibility guard" on public."Vendor Public Profiles";
create policy "Storefront visibility guard" on public."Vendor Public Profiles" as restrictive for select to anon,authenticated
  using(wedsparks_private.can_read_storefront(vendor_id));
-- RLS does not protect TRUNCATE. The old export showed broad write grants; remove them.
revoke insert,update,delete,truncate,references,trigger on public."Vendor Public Profiles" from public,anon,authenticated;
do $columns$
declare cols text;
begin
  select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public."Vendor Public Profiles"'::regclass and attnum>0 and not attisdropped;
  execute 'revoke insert ('||cols||'), update ('||cols||'), references ('||cols||') on public."Vendor Public Profiles" from public,anon,authenticated';
end; $columns$;
grant select on public."Vendor Public Profiles" to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('supplier-storefront-drafts','supplier-storefront-drafts',false,5242880,array['image/jpeg','image/png','image/webp']),
  ('supplier-storefront-public','supplier-storefront-public',true,5242880,array['image/jpeg','image/png','image/webp'])
  on conflict(id) do nothing;
drop policy if exists "Supplier storefront photo upload" on storage.objects;
create policy "Supplier storefront photo upload" on storage.objects for insert to authenticated with check
  (bucket_id in ('supplier-storefront-drafts','supplier-storefront-public') and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='supplier'));
drop policy if exists "Suppliers read own storefront photos" on storage.objects;
create policy "Suppliers read own storefront photos" on storage.objects for select to authenticated using
  (bucket_id in ('supplier-storefront-drafts','supplier-storefront-public') and (storage.foldername(name))[1]=(select auth.uid())::text);
-- No client DELETE/UPDATE: removing a draft photo must not break a published page.

notify pgrst,'reload schema';
commit;

-- Setup verification. This does not change business records.
select
  to_regclass('public.supplier_workspaces') is not null as workspace_ready,
  to_regprocedure('public.publish_supplier_storefront(integer,jsonb,uuid)') is not null as publishing_ready,
  (select count(*)=2 from storage.buckets where id in('supplier-storefront-drafts','supplier-storefront-public')) as photo_storage_ready,
  not has_table_privilege('anon','public."Vendor Public Profiles"','TRUNCATE') as public_write_access_removed;
