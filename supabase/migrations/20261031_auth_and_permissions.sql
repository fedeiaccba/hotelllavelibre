-- Apply AFTER the booking schema. Create confirmed Auth accounts first.
-- At least one existing active super_admin must have the same email as an Auth user.
begin;

alter table public.admin_users add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists admin_users_auth_uidx on public.admin_users(auth_user_id);
update public.admin_users p set auth_user_id = u.id
from auth.users u where lower(p.email) = lower(u.email) and p.auth_user_id is null
  and u.email_confirmed_at is not null;
do $$ begin
  if not exists (
    select 1 from public.admin_users p join auth.users u on u.id = p.auth_user_id
    where p.role = 'super_admin' and p.status = 'Activo' and u.email_confirmed_at is not null
  ) then
    raise exception 'Primero crea una cuenta confirmada en Authentication con el email de un super_admin activo. No se aplicaron cambios.';
  end if;
end $$;

-- Passwords belong exclusively to Auth. Legacy profile IDs and sales remain intact.
alter table public.admin_users drop column if exists password;
alter table public.hotels add column if not exists time_zone text not null default 'Europe/Lisbon';
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where auth_user_id = (select auth.uid())
    and role = 'super_admin' and status = 'Activo');
$$;
create or replace function app_private.can_manage_hotel(p_hotel_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where auth_user_id = (select auth.uid())
    and status = 'Activo' and (role = 'super_admin' or (role = 'hotel_admin' and hotel_id = p_hotel_id)));
$$;
revoke all on function app_private.is_super_admin(), app_private.can_manage_hotel(uuid) from public, anon, authenticated;
grant execute on function app_private.is_super_admin(), app_private.can_manage_hotel(uuid) to authenticated;

-- Remove the old permissive policies, including any earlier copies under other names.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('admin_users','hotels','recommendations','events','sales')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;
revoke all on public.admin_users, public.hotels, public.recommendations, public.events, public.sales from public, anon, authenticated;
alter table public.admin_users enable row level security;
alter table public.hotels enable row level security;
alter table public.recommendations enable row level security;
alter table public.events enable row level security;
alter table public.sales enable row level security;
grant select on public.admin_users, public.sales to authenticated;
grant select, insert, update, delete on public.hotels, public.recommendations, public.events to authenticated;

create policy profiles_read on public.admin_users for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select app_private.is_super_admin()));
create policy hotels_read on public.hotels for select to authenticated
  using (app_private.can_manage_hotel(id));
create policy hotels_insert on public.hotels for insert to authenticated
  with check ((select app_private.is_super_admin()));
create policy hotels_update on public.hotels for update to authenticated
  using ((select app_private.is_super_admin())) with check ((select app_private.is_super_admin()));
create policy hotels_delete on public.hotels for delete to authenticated
  using ((select app_private.is_super_admin()) and not exists (select 1 from public.sales s where s.hotel_id = hotels.id));
create policy recommendations_read on public.recommendations for select to authenticated
  using (app_private.can_manage_hotel(hotel_id));
create policy recommendations_insert on public.recommendations for insert to authenticated
  with check (app_private.can_manage_hotel(hotel_id));
create policy recommendations_update on public.recommendations for update to authenticated
  using (app_private.can_manage_hotel(hotel_id)) with check (app_private.can_manage_hotel(hotel_id));
create policy recommendations_delete on public.recommendations for delete to authenticated
  using (app_private.can_manage_hotel(hotel_id));
create policy events_read on public.events for select to authenticated using (app_private.can_manage_hotel(hotel_id));
create policy events_insert on public.events for insert to authenticated with check (app_private.can_manage_hotel(hotel_id));
create policy events_update on public.events for update to authenticated
  using (app_private.can_manage_hotel(hotel_id)) with check (app_private.can_manage_hotel(hotel_id));
create policy events_delete on public.events for delete to authenticated using (app_private.can_manage_hotel(hotel_id));
create policy sales_read on public.sales for select to authenticated using (app_private.can_manage_hotel(hotel_id));

-- New tariffs must reconcile. Old rows are preserved and are checked again at booking.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'recommendations_valid_split' and conrelid = 'public.recommendations'::regclass) then
    alter table public.recommendations add constraint recommendations_valid_split check (
      not bookable or (price > 0 and price <= 1000000 and provider_cost between 0 and 1000000
        and receptionist_commission between 0 and 1000000 and system_commission between 0 and 1000000
        and price = round(price, 2) and provider_cost = round(provider_cost, 2)
        and receptionist_commission = round(receptionist_commission, 2) and system_commission = round(system_commission, 2)
        and price = provider_cost + receptionist_commission + system_commission)
    ) not valid;
  end if;
end $$;

create table if not exists app_private.booking_audit (
  id bigint generated always as identity primary key, sale_id uuid not null,
  actor_id uuid, action text not null, created_at timestamptz not null default now()
);
revoke all on app_private.booking_audit from public, anon, authenticated;

create or replace function app_private.guest_receipt(s public.sales) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',s.id,'hotel_id',s.hotel_id,'recommendation_title',s.recommendation_title,
    'booking_code',s.booking_code,'booking_status',s.booking_status,'status',s.status,
    'guest_name',s.guest_name,'guest_room',s.guest_room,'quantity',s.quantity,'amount',s.amount,
    'service_date',s.service_date,'service_time',s.service_time,'end_date',s.end_date,'end_time',s.end_time,
    'payment_method',s.payment_method,'expires_at',s.expires_at);
$$;
revoke all on function app_private.guest_receipt(public.sales) from public, anon, authenticated;

create or replace function public.get_public_catalog(p_slug text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare h public.hotels; products jsonb;
begin
  select * into h from public.hotels where status = 'Activo' and (p_slug is null or slug = p_slug)
    order by created_at, id limit 1;
  if not found then return jsonb_build_object('hotel',null,'recommendations','[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'hotel_id',r.hotel_id,'title',r.title,'subtitle',r.subtitle,'category',r.category,
    'short_description',r.short_description,'full_description',r.full_description,'image',r.image,
    'duration',r.duration,'distance',r.distance,'difficulty',r.difficulty,'location',r.location,
    'hours',r.hours,'map_url',r.map_url,'featured',r.featured,'bookable',r.bookable,
    'status',r.status,'price',r.price,'provider',r.provider,'tips',r.tips
  ) order by r.featured desc, r.title), '[]'::jsonb) into products
  from public.recommendations r where r.hotel_id = h.id and r.status = 'Publicado';
  return jsonb_build_object('hotel',jsonb_build_object('id',h.id,'name',h.name,'slug',h.slug,
    'location',h.location,'public_url',h.public_url,'time_zone',h.time_zone), 'recommendations', products);
end $$;

create or replace function public.create_guest_booking(
  p_request_id uuid, p_recommendation_id uuid, p_hotel_id uuid, p_guest_name text,
  p_guest_room text, p_guest_contact text, p_quantity integer, p_service_date date,
  p_service_time time, p_end_date date default null, p_end_time time default null,
  p_pickup_location text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recommendations; h public.hotels; s public.sales;
  starts timestamptz; days integer := 1; units integer; rental boolean;
begin
  if p_request_id is null or p_quantity is null or p_quantity not between 1 and 50
    or length(trim(coalesce(p_guest_name,''))) not between 1 and 120
    or length(trim(coalesce(p_guest_contact,''))) not between 3 and 200
    or length(coalesce(p_guest_room,'')) > 30 or length(coalesce(p_pickup_location,'')) > 300
    or p_service_date is null or p_service_time is null then
    raise exception 'Revisa los datos de la solicitud.' using errcode = '22023';
  end if;
  -- The request ID acts as an unguessable retry key. Never expose a list of receipts.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into s from public.sales where id = p_request_id;
  if found then
    if s.booking_code is not null and s.recommendation_id = p_recommendation_id and s.hotel_id = p_hotel_id
      and s.guest_name = trim(p_guest_name) and s.guest_contact = trim(p_guest_contact)
      and s.guest_room = trim(coalesce(p_guest_room,'')) and s.quantity = p_quantity
      and s.service_date = p_service_date and s.service_time = p_service_time
      and s.end_date is not distinct from p_end_date and s.end_time is not distinct from p_end_time
      and s.pickup_location = trim(coalesce(p_pickup_location,'')) then
      return app_private.guest_receipt(s);
    end if;
    raise exception 'La solicitud ya existe con otros datos.' using errcode = '22023';
  end if;
  select * into h from public.hotels where id = p_hotel_id and status = 'Activo';
  if not found then raise exception 'Hotel no disponible.' using errcode = '22023'; end if;
  select * into r from public.recommendations where id = p_recommendation_id and hotel_id = h.id
    and status = 'Publicado' and bookable for share;
  if not found then raise exception 'Servicio no disponible.' using errcode = '22023'; end if;
  if r.price is null or r.provider_cost is null or r.receptionist_commission is null or r.system_commission is null
    or r.price not between 0.01 and 1000000 or r.provider_cost not between 0 and 1000000
    or r.receptionist_commission not between 0 and 1000000 or r.system_commission not between 0 and 1000000
    or r.price <> round(r.price,2) or r.provider_cost <> round(r.provider_cost,2)
    or r.receptionist_commission <> round(r.receptionist_commission,2) or r.system_commission <> round(r.system_commission,2)
    or r.price <> r.provider_cost + r.receptionist_commission + r.system_commission then
    raise exception 'La tarifa necesita revision de la empresa.' using errcode = '22023';
  end if;
  starts := (p_service_date + p_service_time) at time zone h.time_zone;
  if starts <= now() or starts > now() + interval '2 years' then
    raise exception 'Elegi una fecha futura dentro de los proximos dos anos.' using errcode = '22023';
  end if;
  rental := r.category in ('alquiler-auto','alquiler-moto');
  if rental then
    if p_end_date is null or p_end_time is null or (p_end_date + p_end_time) <= (p_service_date + p_service_time) then
      raise exception 'La devolucion debe ser posterior a la entrega.' using errcode = '22023';
    end if;
    days := ceil(extract(epoch from ((p_end_date + p_end_time) - (p_service_date + p_service_time))) / 86400)::integer;
    if days > 365 then raise exception 'El periodo de alquiler supera 365 dias.' using errcode = '22023'; end if;
  elsif p_end_date is not null or p_end_time is not null then
    raise exception 'Este servicio no admite periodo de devolucion.' using errcode = '22023';
  end if;
  units := p_quantity * days;
  insert into public.sales (id,hotel_id,recommendation_id,recommendation_title,receptionist_name,
    guest_name,guest_room,guest_contact,quantity,amount,provider_amount,receptionist_commission,
    system_commission,commission,status,booking_code,booking_status,payment_method,
    service_date,service_time,end_date,end_time,pickup_location,expires_at,note)
  values (p_request_id,h.id,r.id,r.title,'Reserva web',trim(p_guest_name),trim(coalesce(p_guest_room,'')),
    trim(p_guest_contact),p_quantity,r.price*units,r.provider_cost*units,r.receptionist_commission*units,
    r.system_commission*units,(r.receptionist_commission+r.system_commission)*units,'Reservado',
    'LL-'||upper(replace(p_request_id::text,'-','')),'Solicitada','cash',p_service_date,p_service_time,
    p_end_date,p_end_time,trim(coalesce(p_pickup_location,'')),least(now()+interval '24 hours',starts),
    'Disponibilidad pendiente de confirmacion del proveedor.') returning * into s;
  insert into app_private.booking_audit(sale_id,action) values (s.id,'requested');
  return app_private.guest_receipt(s);
end $$;

create or replace function public.process_booking(p_sale_id uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.sales; actor public.admin_users;
begin
  select * into actor from public.admin_users where auth_user_id = (select auth.uid()) and status = 'Activo' for share;
  if not found then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  select * into s from public.sales where id = p_sale_id for update;
  if not found or not app_private.can_manage_hotel(s.hotel_id) then
    raise exception 'Reserva no disponible para tu cuenta.' using errcode = '42501';
  end if;
  if s.status <> 'Reservado' or s.payment_method is distinct from 'cash' or s.booking_status is null
    or s.booking_status = 'Cancelada' then raise exception 'La reserva ya fue procesada.' using errcode = '22023'; end if;
  if p_action = 'collect' and (s.amount is null or s.provider_amount is null or s.receptionist_commission is null
    or s.system_commission is null or s.amount not between 0.01 and 18250000000
    or s.provider_amount < 0 or s.receptionist_commission < 0 or s.system_commission < 0
    or s.amount <> s.provider_amount+s.receptionist_commission+s.system_commission) then
    raise exception 'El reparto de esta reserva necesita revision.' using errcode = '22023';
  end if;
  if p_action in ('confirm','collect') and (s.expires_at is null or s.expires_at <= now()
    or ((s.service_date+s.service_time) at time zone (select time_zone from public.hotels where id=s.hotel_id)) <= now()) then
    raise exception 'El cupon vencio. Se debe solicitar nuevamente.' using errcode = '22023';
  end if;
  if p_action = 'confirm' and s.booking_status = 'Solicitada' then
    update public.sales set booking_status = 'Confirmada' where id = s.id returning * into s;
  elsif p_action = 'collect' and s.booking_status = 'Confirmada' then
    update public.sales set status = 'Cobrado', paid_at = now(), collected_by = actor.name
      where id = s.id returning * into s;
  elsif p_action = 'cancel' then
    update public.sales set booking_status = 'Cancelada', status = 'Anulado' where id = s.id returning * into s;
  else raise exception 'Accion no permitida para esta reserva.' using errcode = '22023'; end if;
  insert into app_private.booking_audit(sale_id,actor_id,action) values (s.id,actor.auth_user_id,p_action);
  return to_jsonb(s);
end $$;

create or replace function public.manage_admin_user(p_id uuid, p_name text, p_email text,
  p_role text, p_hotel_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare account_id uuid; profile public.admin_users;
begin
  lock table public.admin_users in share row exclusive mode;
  if not app_private.is_super_admin() then raise exception 'Solo el administrador general puede asignar accesos.' using errcode = '42501'; end if;
  if p_role not in ('super_admin','hotel_admin') or p_status not in ('Activo','Borrador')
    or p_role is null or p_status is null or length(trim(coalesce(p_name,''))) not between 1 and 120 then
    raise exception 'Perfil no valido.' using errcode = '22023'; end if;
  if p_role = 'hotel_admin' and not exists (select 1 from public.hotels where id = p_hotel_id) then
    raise exception 'Selecciona un hotel valido.' using errcode = '22023'; end if;
  select id into account_id from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null;
  if account_id is null then raise exception 'Primero crea y confirma esta cuenta en Supabase Auth.' using errcode = '22023'; end if;
  if p_id is not null then
    select * into profile from public.admin_users where id = p_id;
    if not found then raise exception 'Perfil no encontrado.' using errcode = '22023'; end if;
    if profile.auth_user_id = (select auth.uid()) and (account_id <> profile.auth_user_id or p_role <> 'super_admin' or p_status <> 'Activo') then
      raise exception 'No podes quitar tu propio acceso de administrador.' using errcode = '22023'; end if;
    if profile.role = 'super_admin' and profile.status = 'Activo' and (p_role <> 'super_admin' or p_status <> 'Activo')
      and (select count(*) from public.admin_users where role='super_admin' and status='Activo' and auth_user_id is not null) <= 1 then
      raise exception 'Debe quedar un administrador general activo.' using errcode = '22023'; end if;
    update public.admin_users set name=trim(p_name), email=lower(trim(p_email)), auth_user_id=account_id,
      role=p_role, hotel_id=case when p_role='hotel_admin' then p_hotel_id else null end, status=p_status
      where id=p_id returning * into profile;
  else
    insert into public.admin_users(name,email,auth_user_id,role,hotel_id,status)
    values(trim(p_name),lower(trim(p_email)),account_id,p_role,case when p_role='hotel_admin' then p_hotel_id else null end,p_status)
    returning * into profile;
  end if;
  return to_jsonb(profile);
end $$;

create or replace function public.delete_admin_access(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  lock table public.admin_users in share row exclusive mode;
  if not app_private.is_super_admin() then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  if exists(select 1 from public.admin_users where id=p_id and auth_user_id=(select auth.uid())) then
    raise exception 'No podes eliminar tu propio acceso.' using errcode = '22023'; end if;
  delete from public.admin_users where id=p_id;
end $$;

revoke all on function public.get_public_catalog(text),
  public.create_guest_booking(uuid,uuid,uuid,text,text,text,integer,date,time,date,time,text),
  public.process_booking(uuid,text), public.manage_admin_user(uuid,text,text,text,uuid,text),
  public.delete_admin_access(uuid) from public, anon, authenticated;
grant execute on function public.get_public_catalog(text),
  public.create_guest_booking(uuid,uuid,uuid,text,text,text,integer,date,time,date,time,text) to anon, authenticated;
grant execute on function public.process_booking(uuid,text),
  public.manage_admin_user(uuid,text,text,text,uuid,text), public.delete_admin_access(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
