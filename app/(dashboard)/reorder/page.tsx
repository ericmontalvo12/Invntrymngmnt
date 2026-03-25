import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StockStatusBadge } from "@/components/shared/StatusBadge";
import { ReorderStatusSelect } from "@/components/reorder/ReorderStatusSelect";
import type { InventoryItem } from "@/types";

export default async function ReorderPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("inventory_items")
    .select("*, supplier:suppliers(name)")
    .eq("status", "active")
    .order("quantity_on_hand");

  const items = ((data ?? []) as (InventoryItem & { supplier: { name: string } | null })[])
    .filter((item) => item.quantity_on_hand <= item.minimum_threshold);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reorder List"
        description={`${items.length} item${items.length !== 1 ? "s" : ""} at or below minimum threshold`}
      />

      {items.length === 0 ? (
        <EmptyState
          title="All caught up!"
          description="No items are currently below their minimum stock threshold."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>UPC</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Min Threshold</TableHead>
                  <TableHead className="text-right">Reorder Qty</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
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
                    <TableCell className="text-right font-medium">
                      {item.quantity_on_hand}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.minimum_threshold}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.reorder_quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.supplier?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StockStatusBadge
                        qty={item.quantity_on_hand}
                        threshold={item.minimum_threshold}
                      />
                    </TableCell>
                    <TableCell>
                      <ReorderStatusSelect
                        itemId={item.id}
                        currentStatus={item.reorder_status}
                      />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/purchase-orders/new?item_id=${item.id}&qty=${item.reorder_quantity}`}
                        >
                          Create PO
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
