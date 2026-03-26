-- ============================================================
-- StockFlow Inventory Management — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('admin', 'staff', 'viewer');
create type item_status as enum ('active', 'inactive', 'discontinued');
create type transaction_type as enum ('stock_in', 'stock_out', 'adjustment', 'received', 'dispatch');
create type reorder_status as enum ('needs_reorder', 'ordered', 'received');

-- ============================================================
-- PROFILES (extends auth.users 1:1)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        user_role not null default 'viewer',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- LOCATIONS
-- ============================================================
create table locations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
create table suppliers (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null unique,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- INVENTORY ITEMS
-- ============================================================
create table inventory_items (
  id                 uuid primary key default uuid_generate_v4(),
  name               text not null,
  sku                text not null unique,
  upc                text unique,
  category_id        uuid references categories(id) on delete set null,
  location_id        uuid references locations(id) on delete set null,
  supplier_id        uuid references suppliers(id) on delete set null,
  quantity_on_hand   integer not null default 0 check (quantity_on_hand >= 0),
  minimum_threshold  integer not null default 0,
  reorder_quantity   integer not null default 0,
  unit_type          text not null default 'unit',
  cost_per_unit      numeric(10,2),
  notes              text,
  status             item_status not null default 'active',
  reorder_status     reorder_status not null default 'needs_reorder',
  created_by         uuid references profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ============================================================
-- INVENTORY TRANSACTIONS (append-only audit log)
-- ============================================================
create table inventory_transactions (
  id                uuid primary key default uuid_generate_v4(),
  item_id           uuid not null references inventory_items(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete set null,
  transaction_type  transaction_type not null,
  quantity_change   integer not null,
  quantity_before   integer not null,
  quantity_after    integer not null,
  reason            text,
  note              text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_inventory_items_sku        on inventory_items(sku);
create index idx_inventory_items_upc        on inventory_items(upc);
create index idx_inventory_items_status     on inventory_items(status);
create index idx_inventory_items_category   on inventory_items(category_id);
create index idx_inventory_items_location   on inventory_items(location_id);
create index idx_inventory_items_supplier   on inventory_items(supplier_id);
create index idx_inventory_items_reorder    on inventory_items(reorder_status);
create index idx_transactions_item_id       on inventory_transactions(item_id);
create index idx_transactions_user_id       on inventory_transactions(user_id);
create index idx_transactions_created_at    on inventory_transactions(created_at desc);
create index idx_transactions_type          on inventory_transactions(transaction_type);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function update_updated_at();

create trigger trg_locations_updated_at
  before update on locations
  for each row execute function update_updated_at();

create trigger trg_suppliers_updated_at
  before update on suppliers
  for each row execute function update_updated_at();

create trigger trg_inventory_items_updated_at
  before update on inventory_items
  for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when new.raw_user_meta_data->>'role' in ('admin','staff','viewer')
      then (new.raw_user_meta_data->>'role')::user_role
      else 'viewer'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Helper: get current user role
create or replace function get_current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- ---------- PROFILES ----------
alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on profiles for update to authenticated
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on profiles for update to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- CATEGORIES ----------
alter table categories enable row level security;

create policy "Authenticated users can view categories"
  on categories for select to authenticated using (true);

create policy "Admins can insert categories"
  on categories for insert to authenticated
  with check (get_current_user_role() = 'admin');

create policy "Admins can update categories"
  on categories for update to authenticated
  using (get_current_user_role() = 'admin');

create policy "Admins can delete categories"
  on categories for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- LOCATIONS ----------
alter table locations enable row level security;

create policy "Authenticated users can view locations"
  on locations for select to authenticated using (true);

create policy "Admins can insert locations"
  on locations for insert to authenticated
  with check (get_current_user_role() = 'admin');

create policy "Admins can update locations"
  on locations for update to authenticated
  using (get_current_user_role() = 'admin');

create policy "Admins can delete locations"
  on locations for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- SUPPLIERS ----------
alter table suppliers enable row level security;

create policy "Authenticated users can view suppliers"
  on suppliers for select to authenticated using (true);

create policy "Admins can insert suppliers"
  on suppliers for insert to authenticated
  with check (get_current_user_role() = 'admin');

create policy "Admins can update suppliers"
  on suppliers for update to authenticated
  using (get_current_user_role() = 'admin');

create policy "Admins can delete suppliers"
  on suppliers for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- INVENTORY ITEMS ----------
alter table inventory_items enable row level security;

create policy "Authenticated users can view inventory"
  on inventory_items for select to authenticated using (true);

-- Note: quantity updates for staff happen via service role in Server Actions.
-- RLS restricts direct mutations to admins only.
create policy "Admins can insert inventory"
  on inventory_items for insert to authenticated
  with check (get_current_user_role() = 'admin');

create policy "Admins can update inventory"
  on inventory_items for update to authenticated
  using (get_current_user_role() = 'admin');

create policy "Admins can delete inventory"
  on inventory_items for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- TRANSACTIONS ----------
alter table inventory_transactions enable row level security;

create policy "Authenticated users can view transactions"
  on inventory_transactions for select to authenticated using (true);

create policy "Staff and Admins can insert transactions"
  on inventory_transactions for insert to authenticated
  with check (get_current_user_role() in ('admin', 'staff'));

-- No UPDATE or DELETE on transactions — immutable audit log

-- ============================================================
-- SEED DATA (optional — remove in production)
-- ============================================================

-- insert into categories (name, description) values
--   ('Electronics', 'Electronic components and devices'),
--   ('Hardware', 'Physical hardware and tools'),
--   ('Consumables', 'Items that get used up');

-- insert into locations (name, description) values
--   ('Warehouse A', 'Main warehouse'),
--   ('Shelf B2', 'Secondary storage shelf'),
--   ('Receiving Bay', 'Incoming goods area');
