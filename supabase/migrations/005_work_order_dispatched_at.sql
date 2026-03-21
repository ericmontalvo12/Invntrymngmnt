-- Track when inventory was dispatched from a work order
alter table work_orders
  add column dispatched_at timestamptz null;
