-- ============================================================
-- Work Orders Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
create type work_order_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type work_order_priority as enum ('low', 'medium', 'high', 'urgent');

-- ============================================================
-- INSPECTION TYPES (lookup table)
-- ============================================================
create table inspection_types (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- Seed common inspection types
insert into inspection_types (name) values
  ('Routine'),
  ('Electrical'),
  ('Plumbing'),
  ('HVAC'),
  ('Fire Safety'),
  ('Pest Control'),
  ('Move-In'),
  ('Move-Out'),
  ('Structural'),
  ('General Repair');

alter table inspection_types enable row level security;

create policy "Authenticated users can view inspection types"
  on inspection_types for select to authenticated using (true);

create policy "Admins can insert inspection types"
  on inspection_types for insert to authenticated
  with check (get_current_user_role() = 'admin');

create policy "Admins can update inspection types"
  on inspection_types for update to authenticated
  using (get_current_user_role() = 'admin');

create policy "Admins can delete inspection types"
  on inspection_types for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ============================================================
-- WORK ORDERS
-- ============================================================
create table work_orders (
  id                  uuid primary key default uuid_generate_v4(),
  wo_number           text not null unique,
  building_id         uuid references buildings(id) on delete set null,
  apartment_unit      text,
  inspection_type_id  uuid references inspection_types(id) on delete set null,
  requested_by        uuid references profiles(id) on delete set null,
  assigned_to         uuid references profiles(id) on delete set null,
  inspection_date     date,
  due_date            date,
  extended_due_date   date,
  priority            work_order_priority not null default 'medium',
  status              work_order_status not null default 'open',
  notes               text,
  completed_at        timestamptz,
  completed_by        uuid references profiles(id) on delete set null,
  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_work_orders_updated_at
  before update on work_orders
  for each row execute function update_updated_at();

create index idx_work_orders_building    on work_orders(building_id);
create index idx_work_orders_requested   on work_orders(requested_by);
create index idx_work_orders_assigned    on work_orders(assigned_to);
create index idx_work_orders_status      on work_orders(status);
create index idx_work_orders_priority    on work_orders(priority);
create index idx_work_orders_created     on work_orders(created_at desc);

-- ============================================================
-- WORK ORDER ITEMS
-- ============================================================
create table work_order_items (
  id              uuid primary key default uuid_generate_v4(),
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  item_id         uuid references inventory_items(id) on delete set null,
  item_name       text not null,
  item_sku        text not null,
  quantity_needed integer not null default 1 check (quantity_needed > 0),
  quantity_used   integer check (quantity_used >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_work_order_items_updated_at
  before update on work_order_items
  for each row execute function update_updated_at();

create index idx_wo_items_wo_id   on work_order_items(work_order_id);
create index idx_wo_items_item_id on work_order_items(item_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ---------- WORK ORDERS ----------
alter table work_orders enable row level security;

create policy "Authenticated users can view work orders"
  on work_orders for select to authenticated using (true);

create policy "Staff and admins can insert work orders"
  on work_orders for insert to authenticated
  with check (get_current_user_role() in ('admin', 'staff'));

create policy "Staff and admins can update work orders"
  on work_orders for update to authenticated
  using (get_current_user_role() in ('admin', 'staff'));

create policy "Admins can delete work orders"
  on work_orders for delete to authenticated
  using (get_current_user_role() = 'admin');

-- ---------- WORK ORDER ITEMS ----------
alter table work_order_items enable row level security;

create policy "Authenticated users can view work order items"
  on work_order_items for select to authenticated using (true);

create policy "Staff and admins can insert work order items"
  on work_order_items for insert to authenticated
  with check (get_current_user_role() in ('admin', 'staff'));

create policy "Staff and admins can update work order items"
  on work_order_items for update to authenticated
  using (get_current_user_role() in ('admin', 'staff'));

create policy "Admins can delete work order items"
  on work_order_items for delete to authenticated
  using (get_current_user_role() = 'admin');
