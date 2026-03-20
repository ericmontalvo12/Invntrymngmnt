import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ItemStatusBadge, StockStatusBadge } from "@/components/shared/StatusBadge";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { formatCurrency } from "@/lib/utils";
import type { Building, Category, InventoryItem, Supplier } from "@/types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    building?: string;
    supplier?: string;
    stock?: string;
    status?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch filters data
  const [{ data: categories }, { data: buildings }, { data: suppliers }] =
    await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("buildings").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
    ]);

  // Build query
  let query = supabase
    .from("inventory_items")
    .select("*, category:categories(id,name), building:buildings(id,name), supplier:suppliers(id,name)")
    .order("name");

  if (params.q) {
    query = query.or(
      `name.ilike.%${params.q}%,sku.ilike.%${params.q}%,upc.ilike.%${params.q}%`
    );
  }
  if (params.category) query = query.eq("category_id", params.category);
  if (params.building) query = query.eq("building_id", params.building);
  if (params.supplier) query = query.eq("supplier_id", params.supplier);
  if (params.status) query = query.eq("status", params.status);

  const { data: allItems } = await query;
  const items = (allItems ?? []) as InventoryItem[];

  // Client-side stock filter (can't easily do in SQL with dynamic threshold)
  const filtered = params.stock
    ? items.filter((i) => {
        if (params.stock === "out") return i.quantity_on_hand === 0;
        if (params.stock === "low")
          return i.quantity_on_hand > 0 && i.quantity_on_hand <= i.minimum_threshold;
        if (params.stock === "ok") return i.quantity_on_hand > i.minimum_threshold;
        return true;
      })
    : items;

  // Get current user role
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description={`${filtered.length} items`}>
        {isAdmin && (
          <Button asChild>
            <Link href="/inventory/new">
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Link>
          </Button>
        )}
      </PageHeader>

      <InventoryFilters
        categories={(categories ?? []) as Category[]}
        buildings={(buildings ?? []) as Building[]}
        suppliers={(suppliers ?? []) as Supplier[]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No items found"
          description="Try adjusting your filters or add a new item."
        >
          {isAdmin && (
            <Button asChild>
              <Link href="/inventory/new">Add Item</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>UPC</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Building</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/inventory/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                  <TableCell className="text-muted-foreground">{item.upc ?? "—"}</TableCell>
                  <TableCell>{item.category?.name ?? "—"}</TableCell>
                  <TableCell>{item.building?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {item.quantity_on_hand}
                    <span className="ml-1 text-xs text-muted-foreground">{item.unit_type}</span>
                  </TableCell>
                  <TableCell>
                    <StockStatusBadge
                      qty={item.quantity_on_hand}
                      threshold={item.minimum_threshold}
                    />
                  </TableCell>
                  <TableCell>
                    <ItemStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.cost_per_unit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
