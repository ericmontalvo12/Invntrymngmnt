import { Badge } from "@/components/ui/badge";
import type { ItemStatus, ReorderStatus, TransactionType } from "@/types";

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
    active: { label: "Active", variant: "success" },
    inactive: { label: "Inactive", variant: "warning" },
    discontinued: { label: "Discontinued", variant: "danger" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function StockStatusBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0) return <Badge variant="danger">Out of Stock</Badge>;
  if (qty <= threshold) return <Badge variant="warning">Low Stock</Badge>;
  return <Badge variant="success">In Stock</Badge>;
}

export function ReorderStatusBadge({ status }: { status: ReorderStatus }) {
  const map: Record<ReorderStatus, { label: string; variant: "danger" | "info" | "success" }> = {
    needs_reorder: { label: "Needs Reorder", variant: "danger" },
    ordered: { label: "Ordered", variant: "info" },
    received: { label: "Received", variant: "success" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const map: Record<
    TransactionType,
    { label: string; variant: "success" | "danger" | "warning" | "info" | "secondary" }
  > = {
    stock_in: { label: "Stock In", variant: "success" },
    stock_out: { label: "Stock Out", variant: "danger" },
    adjustment: { label: "Adjustment", variant: "warning" },
    received: { label: "Received", variant: "success" },
    dispatch: { label: "Dispatch", variant: "danger" },
  };
  const { label, variant } = map[type];
  return <Badge variant={variant}>{label}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    admin: { label: "Admin", variant: "default" },
    staff: { label: "Staff", variant: "secondary" },
    viewer: { label: "Viewer", variant: "outline" },
  };
  const { label, variant } = map[role] ?? { label: role, variant: "outline" };
  return <Badge variant={variant}>{label}</Badge>;
}
