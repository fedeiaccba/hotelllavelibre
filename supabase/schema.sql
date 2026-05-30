create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'hotel_admin',
  hotel_id uuid,
  status text not null default 'Activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text not null,
  plan text not null default 'Standard',
  status text not null default 'Activo',
  admin_name text,
  public_url text,
  qr_scans integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users
drop constraint if exists admin_users_hotel_id_fkey;

alter table public.admin_users
add constraint admin_users_hotel_id_fkey
foreign key (hotel_id) references public.hotels(id) on delete set null;

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null,
  subtitle text,
  category text not null,
  short_description text not null,
  full_description text,
  image text,
  distance text,
  duration text,
  difficulty text,
  location text,
  hours text,
  map_url text,
  status text not null default 'Publicado',
  featured boolean not null default false,
  tips text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null,
  date text not null,
  category text,
  status text not null default 'Publicado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendations_hotel_id_idx on public.recommendations (hotel_id);
create index if not exists recommendations_category_idx on public.recommendations (category);
create index if not exists recommendations_status_idx on public.recommendations (status);
create index if not exists admin_users_email_idx on public.admin_users (email);
create index if not exists admin_users_role_idx on public.admin_users (role);
create index if not exists events_hotel_id_idx on public.events (hotel_id);
create index if not exists events_status_idx on public.events (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hotels_set_updated_at on public.hotels;
create trigger hotels_set_updated_at
before update on public.hotels
for each row execute function public.set_updated_at();

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

drop trigger if exists recommendations_set_updated_at on public.recommendations;
create trigger recommendations_set_updated_at
before update on public.recommendations
for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.hotels enable row level security;
alter table public.recommendations enable row level security;
alter table public.events enable row level security;

-- Demo policies for anon/publishable-key CRUD from the current Vite app.
-- Tighten these before production, ideally using Supabase Auth roles/claims.
drop policy if exists "demo read admin_users" on public.admin_users;
create policy "demo read admin_users" on public.admin_users
for select using (true);

drop policy if exists "demo write admin_users" on public.admin_users;
create policy "demo write admin_users" on public.admin_users
for all using (true) with check (true);

drop policy if exists "demo read hotels" on public.hotels;
create policy "demo read hotels" on public.hotels
for select using (true);

drop policy if exists "demo write hotels" on public.hotels;
create policy "demo write hotels" on public.hotels
for all using (true) with check (true);

drop policy if exists "demo read recommendations" on public.recommendations;
create policy "demo read recommendations" on public.recommendations
for select using (true);

drop policy if exists "demo write recommendations" on public.recommendations;
create policy "demo write recommendations" on public.recommendations
for all using (true) with check (true);

drop policy if exists "demo read events" on public.events;
create policy "demo read events" on public.events
for select using (true);

drop policy if exists "demo write events" on public.events;
create policy "demo write events" on public.events
for all using (true) with check (true);

insert into public.hotels (name, slug, location, plan, status, admin_name, public_url, qr_scans)
values
  (
    'Hotel Atlântico Albufeira',
    'hotel-atlantico-albufeira',
    'Albufeira, Algarve, Portugal',
    'Premium',
    'Activo',
    'Recepción Atlântico',
    '/h/hotel-atlantico-albufeira',
    1842
  )
on conflict (slug) do nothing;

insert into public.admin_users (name, email, password, role, hotel_id, status)
select
  'Admin General',
  'admin@demo.com',
  '123456',
  'super_admin',
  null,
  'Activo'
where not exists (select 1 from public.admin_users where email = 'admin@demo.com');

insert into public.admin_users (name, email, password, role, hotel_id, status)
select
  'Recepcion Atlantico',
  'hotel@demo.com',
  '123456',
  'hotel_admin',
  hotels.id,
  'Activo'
from public.hotels
where hotels.slug = 'hotel-atlantico-albufeira'
  and not exists (select 1 from public.admin_users where email = 'hotel@demo.com');

insert into public.events (hotel_id, title, date, category, status)
select id, 'FIESA Sand City', 'Temporada verano', 'Cultura', 'Publicado'
from public.hotels
where slug = 'hotel-atlantico-albufeira'
  and not exists (select 1 from public.events where title = 'FIESA Sand City');
