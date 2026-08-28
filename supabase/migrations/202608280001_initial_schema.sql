create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year integer,
  fuel_type text not null check (fuel_type in ('petrol95', 'petrol93', 'diesel')),
  engine_size_l numeric(4,1),
  base_consumption_l_100km numeric(5,2) not null check (base_consumption_l_100km > 0),
  tank_capacity_l numeric(5,1),
  created_at timestamptz not null default now()
);

create table if not exists public.fuel_prices (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  petrol95_inland numeric(6,2),
  petrol95_coastal numeric(6,2),
  petrol93_inland numeric(6,2),
  diesel_inland numeric(6,2),
  diesel_coastal numeric(6,2),
  source text not null default 'SA Fuel Price API / DMRE data',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  origin text not null,
  destination text not null,
  distance_km numeric(10,2) not null,
  duration_minutes numeric(10,2),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  fuel_type text not null,
  region text not null check (region in ('coastal', 'inland')),
  average_speed_kmh numeric(6,2) not null,
  fuel_required_l numeric(10,2),
  fuel_cost_zar numeric(10,2),
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;
alter table public.fuel_prices enable row level security;
alter table public.trips enable row level security;

create policy "vehicles are publicly readable"
  on public.vehicles for select
  using (true);

create policy "fuel prices are publicly readable"
  on public.fuel_prices for select
  using (true);

create policy "users can read their own trips"
  on public.trips for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can create their own trips"
  on public.trips for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own trips"
  on public.trips for delete
  to authenticated
  using (auth.uid() = user_id);

insert into public.vehicles (make, model, year, fuel_type, engine_size_l, base_consumption_l_100km, tank_capacity_l)
values
  ('Toyota', 'Corolla Cross 1.8', 2024, 'petrol95', 1.8, 7.00, 47),
  ('Volkswagen', 'Polo 1.0 TSI', 2024, 'petrol95', 1.0, 6.00, 40),
  ('Toyota', 'Fortuner 2.8', 2024, 'diesel', 2.8, 8.60, 80),
  ('Toyota', 'Hilux 2.4 GD-6', 2024, 'diesel', 2.4, 8.30, 80),
  ('Ford', 'Ranger 2.0', 2024, 'diesel', 2.0, 8.50, 80)
on conflict do nothing;
