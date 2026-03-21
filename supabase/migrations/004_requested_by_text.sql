-- Change work_orders.requested_by from UUID FK to free-text
alter table work_orders
  drop constraint if exists work_orders_requested_by_fkey;

drop index if exists idx_work_orders_requested;

alter table work_orders
  alter column requested_by type text using null;
