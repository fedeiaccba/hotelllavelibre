-- LlaveLibre — schema idempotente y AUTO-REPARABLE.
-- Se puede correr varias veces. Si ya existían tablas viejas (de otra versión),
-- este script les agrega las columnas que falten en vez de fallar.
-- Pegar TODO en Supabase → SQL Editor → Run.

create extension if not exists "pgcrypto";

-- ===========================================================================
-- TABLAS (create if not exists) + asegurar columnas faltantes (add if not exists)
-- Las columnas se agregan como nullable / con default para no romper si la tabla
-- ya tiene filas.
-- ===========================================================================

-- admin_users -------------------------------------------------------------
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
alter table public.admin_users add column if not exists name text;
alter table public.admin_users add column if not exists email text;
alter table public.admin_users add column if not exists password text;
alter table public.admin_users add column if not exists role text default 'hotel_admin';
alter table public.admin_users add column if not exists hotel_id uuid;
alter table public.admin_users add column if not exists status text default 'Activo';
alter table public.admin_users add column if not exists created_at timestamptz default now();
alter table public.admin_users add column if not exists updated_at timestamptz default now();

-- hotels ------------------------------------------------------------------
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
alter table public.hotels add column if not exists name text;
alter table public.hotels add column if not exists slug text;
alter table public.hotels add column if not exists location text;
alter table public.hotels add column if not exists plan text default 'Standard';
alter table public.hotels add column if not exists status text default 'Activo';
alter table public.hotels add column if not exists admin_name text;
alter table public.hotels add column if not exists public_url text;
alter table public.hotels add column if not exists qr_scans integer default 0;
alter table public.hotels add column if not exists auto_charge boolean default false;
alter table public.hotels add column if not exists created_at timestamptz default now();
alter table public.hotels add column if not exists updated_at timestamptz default now();

-- Aseguramos slug único (necesario para upsert por slug). Si hubiera slugs
-- duplicados en datos viejos, no aborta el script.
do $$ begin
  create unique index if not exists hotels_slug_uidx on public.hotels (slug);
exception when others then null; end $$;

-- FK admin_users.hotel_id -> hotels.id
alter table public.admin_users drop constraint if exists admin_users_hotel_id_fkey;
alter table public.admin_users
  add constraint admin_users_hotel_id_fkey
  foreign key (hotel_id) references public.hotels(id) on delete set null;

-- recommendations (servicios) --------------------------------------------
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  title text not null,
  subtitle text,
  category text not null,
  short_description text,
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
  bookable boolean not null default false,
  price numeric not null default 0,
  commission numeric not null default 0,
  provider text,
  payment_url text,
  tips text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.recommendations add column if not exists hotel_id uuid;
alter table public.recommendations add column if not exists title text;
alter table public.recommendations add column if not exists subtitle text;
alter table public.recommendations add column if not exists category text;
alter table public.recommendations add column if not exists short_description text;
alter table public.recommendations add column if not exists full_description text;
alter table public.recommendations add column if not exists image text;
alter table public.recommendations add column if not exists distance text;
alter table public.recommendations add column if not exists duration text;
alter table public.recommendations add column if not exists difficulty text;
alter table public.recommendations add column if not exists location text;
alter table public.recommendations add column if not exists hours text;
alter table public.recommendations add column if not exists map_url text;
alter table public.recommendations add column if not exists status text default 'Publicado';
alter table public.recommendations add column if not exists featured boolean default false;
alter table public.recommendations add column if not exists bookable boolean default false;
alter table public.recommendations add column if not exists price numeric default 0;
alter table public.recommendations add column if not exists commission numeric default 0;
alter table public.recommendations add column if not exists provider text;
alter table public.recommendations add column if not exists payment_url text;
alter table public.recommendations add column if not exists tips text[] default '{}';
alter table public.recommendations add column if not exists created_at timestamptz default now();
alter table public.recommendations add column if not exists updated_at timestamptz default now();

-- events ------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  title text not null,
  date text not null,
  category text,
  status text not null default 'Publicado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events add column if not exists hotel_id uuid;
alter table public.events add column if not exists title text;
alter table public.events add column if not exists date text;
alter table public.events add column if not exists category text;
alter table public.events add column if not exists status text default 'Publicado';
alter table public.events add column if not exists created_at timestamptz default now();
alter table public.events add column if not exists updated_at timestamptz default now();

-- sales (cobros y comisiones) --------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  recommendation_title text,
  receptionist_id uuid references public.admin_users(id) on delete set null,
  receptionist_name text,
  guest_name text,
  guest_room text,
  quantity integer not null default 1,
  amount numeric not null default 0,
  commission numeric not null default 0,
  status text not null default 'Cobrado',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sales add column if not exists hotel_id uuid;
alter table public.sales add column if not exists recommendation_id uuid;
alter table public.sales add column if not exists recommendation_title text;
alter table public.sales add column if not exists receptionist_id uuid;
alter table public.sales add column if not exists receptionist_name text;
alter table public.sales add column if not exists guest_name text;
alter table public.sales add column if not exists guest_room text;
alter table public.sales add column if not exists quantity integer default 1;
alter table public.sales add column if not exists amount numeric default 0;
alter table public.sales add column if not exists commission numeric default 0;
alter table public.sales add column if not exists status text default 'Cobrado';
alter table public.sales add column if not exists note text;
alter table public.sales add column if not exists created_at timestamptz default now();
alter table public.sales add column if not exists updated_at timestamptz default now();

-- ===========================================================================
-- ÍNDICES
-- ===========================================================================
create index if not exists recommendations_hotel_id_idx on public.recommendations (hotel_id);
create index if not exists recommendations_category_idx on public.recommendations (category);
create index if not exists recommendations_status_idx on public.recommendations (status);
create index if not exists admin_users_email_idx on public.admin_users (email);
create index if not exists admin_users_role_idx on public.admin_users (role);
create index if not exists events_hotel_id_idx on public.events (hotel_id);
create index if not exists events_status_idx on public.events (status);
create index if not exists sales_hotel_id_idx on public.sales (hotel_id);
create index if not exists sales_receptionist_id_idx on public.sales (receptionist_id);
create index if not exists sales_status_idx on public.sales (status);
create index if not exists sales_created_at_idx on public.sales (created_at);

-- ===========================================================================
-- TRIGGERS updated_at
-- ===========================================================================
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

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

-- ===========================================================================
-- RLS — políticas demo (abiertas, para desarrollo). Cerrar para producción.
-- ===========================================================================
alter table public.admin_users enable row level security;
alter table public.hotels enable row level security;
alter table public.recommendations enable row level security;
alter table public.events enable row level security;
alter table public.sales enable row level security;

drop policy if exists "demo read admin_users" on public.admin_users;
create policy "demo read admin_users" on public.admin_users for select using (true);
drop policy if exists "demo write admin_users" on public.admin_users;
create policy "demo write admin_users" on public.admin_users for all using (true) with check (true);

drop policy if exists "demo read hotels" on public.hotels;
create policy "demo read hotels" on public.hotels for select using (true);
drop policy if exists "demo write hotels" on public.hotels;
create policy "demo write hotels" on public.hotels for all using (true) with check (true);

drop policy if exists "demo read recommendations" on public.recommendations;
create policy "demo read recommendations" on public.recommendations for select using (true);
drop policy if exists "demo write recommendations" on public.recommendations;
create policy "demo write recommendations" on public.recommendations for all using (true) with check (true);

drop policy if exists "demo read events" on public.events;
create policy "demo read events" on public.events for select using (true);
drop policy if exists "demo write events" on public.events;
create policy "demo write events" on public.events for all using (true) with check (true);

drop policy if exists "demo read sales" on public.sales;
create policy "demo read sales" on public.sales for select using (true);
drop policy if exists "demo write sales" on public.sales;
create policy "demo write sales" on public.sales for all using (true) with check (true);

-- ===========================================================================
-- DATOS INICIALES (bootstrap). Usan WHERE NOT EXISTS, así no dependen de
-- constraints y no duplican si ya existen.
-- ===========================================================================
insert into public.hotels (name, slug, location, plan, status, admin_name, public_url, qr_scans, auto_charge)
select
  'Hotel Atlântico Albufeira',
  'hotel-atlantico-albufeira',
  'Albufeira, Algarve, Portugal',
  'Premium',
  'Activo',
  'Recepción Atlântico',
  '/h/hotel-atlantico-albufeira',
  1842,
  true
where not exists (select 1 from public.hotels where slug = 'hotel-atlantico-albufeira');

insert into public.admin_users (name, email, password, role, hotel_id, status)
select 'Admin General', 'admin@demo.com', '123456', 'super_admin', null, 'Activo'
where not exists (select 1 from public.admin_users where email = 'admin@demo.com');

insert into public.admin_users (name, email, password, role, hotel_id, status)
select 'Recepcion Atlantico', 'hotel@demo.com', '123456', 'hotel_admin', hotels.id, 'Activo'
from public.hotels
where hotels.slug = 'hotel-atlantico-albufeira'
  and not exists (select 1 from public.admin_users where email = 'hotel@demo.com');

insert into public.events (hotel_id, title, date, category, status)
select id, 'FIESA Sand City', 'Temporada verano', 'Cultura', 'Publicado'
from public.hotels
where slug = 'hotel-atlantico-albufeira'
  and not exists (select 1 from public.events where title = 'FIESA Sand City');
