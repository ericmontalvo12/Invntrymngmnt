-- ============================================================
-- Purchase Orders Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
create type po_status as enum ('draft', 'ordered', 'partially_received', 'received', 'voided');

-- ============================================================
-- PROJECTS
-- ============================================================
create table projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- ============================================================
-- BUILDINGS
-- ============================================================
create table buildings (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  address     text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_buildings_updated_at
  before update on buildings
  for each row execute function update_updated_at();

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
create table purchase_orders (
  id                   uuid primary key default uuid_generate_v4(),
  po_number            text not null unique,
  vendor_id            uuid references suppliers(id) on delete set null,
  project_id           uuid references projects(id) on delete set null,
  building_id          uuid references buildings(id) on delete set null,
  apartment_unit       text,
  expected_delivery    date,
  special_instructions text,
  status               po_status not null default 'draft',
  created_by           uuid references profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_purchase_orders_updated_at
  before update on purchase_orders
  for each row execute function update_updated_at();

create index idx_purchase_orders_vendor    on purchase_orders(vendor_id);
create index idx_purchase_orders_project   on purchase_orders(project_id);
create index idx_purchase_orders_building  on purchase_orders(building_id);
create index idx_purchase_orders_status    on purchase_orders(status);
create index idx_purchase_orders_created   on purchase_orders(created_at desc);

-- ============================================================
-- PURCHASE ORDER ITEMS
-- ============================================================
create table purchase_order_items (
  id                uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  item_id           uuid references inventory_items(id) on delete set null,
  item_name         text not null,
  item_sku          text not null,
  quantity_ordered  integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost         numeric(10,2),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_purchase_order_items_updated_at
  before update on purchase_order_items
  for each row execute function update_updated_at();

create index idx_po_items_po_id   on purchase_order_items(purchase_order_id);
create index idx_po_items_item_id on purchase_order_items(item_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ---------- PROJECTS ----------
alter table projects enable row level security;

create policy "Authenticated users can view projects"
  on projects for select to authenticated using (true);

create policy "Admins can insert projects"
  on projects for insert to authenticated
  with check (get_current_user_role() = 'admin');

create policy "Admins can update projects"
  on projects for update to authenticated
  using (get_current_user_role() = 'admin');

create policy "Admins can delete projects"
  on projects for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- BUILDINGS ----------
alter table buildings enable row level security;

create policy "Authenticated users can view buildings"
  on buildings for select to authenticated using (true);

create policy "Admins can insert buildings"
  on buildings for insert to authenticated
  with check (get_current_user_role() = 'admin');

create policy "Admins can update buildings"
  on buildings for update to authenticated
  using (get_current_user_role() = 'admin');

create policy "Admins can delete buildings"
  on buildings for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- PURCHASE ORDERS ----------
alter table purchase_orders enable row level security;

create policy "Authenticated users can view purchase orders"
  on purchase_orders for select to authenticated using (true);

create policy "Staff and admins can insert purchase orders"
  on purchase_orders for insert to authenticated
  with check (get_current_user_role() in ('admin', 'staff'));

create policy "Staff and admins can update purchase orders"
  on purchase_orders for update to authenticated
  using (get_current_user_role() in ('admin', 'staff'));

create policy "Admins can delete purchase orders"
  on purchase_orders for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- PURCHASE ORDER ITEMS ----------
alter table purchase_order_items enable row level security;

create policy "Authenticated users can view po items"
  on purchase_order_items for select to authenticated using (true);

create policy "Staff and admins can insert po items"
  on purchase_order_items for insert to authenticated
  with check (get_current_user_role() in ('admin', 'staff'));

create policy "Staff and admins can update po items"
  on purchase_order_items for update to authenticated
  using (get_current_user_role() in ('admin', 'staff'));

create policy "Admins can delete po items"
  on purchase_order_items for delete to authenticated
  using (get_current_user_role() = 'admin');
