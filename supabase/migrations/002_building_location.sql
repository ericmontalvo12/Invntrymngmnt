-- Migration: Add building_id to inventory_items
-- Buildings are now the primary location concept for inventory items.
-- When items are received via a Purchase Order, building_id is set from the PO.

ALTER TABLE inventory_items
  ADD COLUMN building_id uuid references buildings(id) on delete set null;

CREATE INDEX idx_inventory_items_building ON inventory_items(building_id);
