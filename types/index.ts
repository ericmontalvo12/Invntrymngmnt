export type UserRole = "admin" | "staff" | "viewer";
export type ItemStatus = "active" | "inactive" | "discontinued";
export type TransactionType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "received"
  | "dispatch";
export type ReorderStatus = "needs_reorder" | "ordered" | "received";

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
  location?: Location | null;
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

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
