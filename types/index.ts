export type UserRole = "admin" | "staff" | "viewer";
export type ItemStatus = "active" | "inactive" | "discontinued";
export type TransactionType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "received"
  | "dispatch";
export type ReorderStatus = "needs_reorder" | "ordered" | "received";
export type POStatus =
  | "draft"
  | "ordered"
  | "partially_received"
  | "received"
  | "voided";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  upc: string | null;
  category_id: string | null;
  location_id: string | null;
  building_id: string | null;
  supplier_id: string | null;
  quantity_on_hand: number;
  minimum_threshold: number;
  reorder_quantity: number;
  unit_type: string;
  cost_per_unit: number | null;
  notes: string | null;
  status: ItemStatus;
  reorder_status: ReorderStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category | null;
  building?: Building | null;
  supplier?: Supplier | null;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  user_id: string;
  transaction_type: TransactionType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  note: string | null;
  created_at: string;
  // Joined fields
  item?: Pick<InventoryItem, "id" | "name" | "sku"> | null;
  user?: Pick<Profile, "id" | "email" | "full_name"> | null;
}

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentTransactions: InventoryTransaction[];
  reorderItems: InventoryItem[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string | null;
  item_name: string;
  item_sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string | null;
  project_id: string | null;
  building_id: string | null;
  apartment_unit: string | null;
  expected_delivery: string | null;
  special_instructions: string | null;
  status: POStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  vendor?: Supplier | null;
  project?: Project | null;
  building?: Building | null;
  items?: PurchaseOrderItem[];
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";
export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

export interface InspectionType {
  id: string;
  name: string;
  created_at: string;
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  item_id: string | null;
  item_name: string;
  item_sku: string;
  quantity_needed: number;
  quantity_used: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  building_id: string | null;
  apartment_unit: string | null;
  inspection_type_id: string | null;
  requested_by: string | null;
  assigned_to: string | null;
  inspection_date: string | null;
  due_date: string | null;
  extended_due_date: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  building?: Building | null;
  inspection_type?: InspectionType | null;
  requester?: Pick<Profile, "id" | "full_name" | "email"> | null;
  assignee?: Pick<Profile, "id" | "full_name" | "email"> | null;
  completer?: Pick<Profile, "id" | "full_name" | "email"> | null;
  items?: WorkOrderItem[];
}
