import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ItemStatusBadge,
  StockStatusBadge,
  TransactionTypeBadge,
  ReorderStatusBadge,
} from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddStockModal, RemoveStockModal, AdjustStockModal } from "@/components/transactions/StockModals";
import { DeleteItemButton } from "@/components/inventory/DeleteItemButton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InventoryItem, InventoryTransaction } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [itemResult, txResult, { data: authData }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("*, category:categories(*), location:locations(*), supplier:suppliers(*)")
      .eq("id", id)
      .single(),
    supabase
      .from("inventory_transactions")
      .select("*, user:profiles(id, email, full_name)")
      .eq("item_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.auth.getUser(),
  ]);

  if (itemResult.error || !itemResult.data) notFound();

  const item = itemResult.data as InventoryItem;
  const transactions = (txResult.data ?? []) as InventoryTransaction[];

  const { data: profile } = authData.user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single()
    : { data: null };

  const isAdmin = profile?.role === "admin";
  const canTransact = profile?.role === "admin" || profile?.role === "staff";

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.name}
        description={`SKU: ${item.sku}${item.upc ? ` · UPC: ${item.upc}` : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {canTransact && (
            <>
              <AddStockModal
                itemId={item.id}
                itemName={item.name}
                currentQty={item.quantity_on_hand}
              />
              <RemoveStockModal
                itemId={item.id}
                itemName={item.name}
                currentQty={item.quantity_on_hand}
              />
              <AdjustStockModal
                itemId={item.id}
                itemName={item.name}
                currentQty={item.quantity_on_hand}
              />
            </>
          )}
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/inventory/${item.id}/edit`}>
                  <Edit className="mr-1 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DeleteItemButton itemId={item.id} itemName={item.name} />
            </>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stock Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-4xl font-bold">{item.quantity_on_hand}</p>
              <p className="text-sm text-muted-foreground">{item.unit_type}s on hand</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StockStatusBadge
                qty={item.quantity_on_hand}
                threshold={item.minimum_threshold}
              />
              <ReorderStatusBadge status={item.reorder_status} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Min Threshold</p>
                <p className="font-medium">{item.minimum_threshold}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reorder Qty</p>
                <p className="font-medium">{item.reorder_quantity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Item Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="Status">
                <ItemStatusBadge status={item.status} />
              </InfoRow>
              <InfoRow label="Cost per Unit">{formatCurrency(item.cost_per_unit)}</InfoRow>
              <InfoRow label="Category">{item.category?.name ?? "—"}</InfoRow>
              <InfoRow label="Location">{item.location?.name ?? "—"}</InfoRow>
              <InfoRow label="Supplier">{item.supplier?.name ?? "—"}</InfoRow>
              <InfoRow label="Unit Type">{item.unit_type}</InfoRow>
              <InfoRow label="Created">{formatDate(item.created_at)}</InfoRow>
              <InfoRow label="Last Updated">{formatDate(item.updated_at)}</InfoRow>
            </div>
            {item.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{item.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Stock changes will appear here."
              className="border-0 py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <TransactionTypeBadge type={tx.transaction_type} />
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        tx.quantity_change > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {tx.quantity_change > 0 ? "+" : ""}
                      {tx.quantity_change}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tx.quantity_before}
                    </TableCell>
                    <TableCell className="text-right font-medium">{tx.quantity_after}</TableCell>
                    <TableCell className="text-muted-foreground">{tx.reason ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {tx.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tx.user?.full_name || tx.user?.email || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(tx.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{children}</div>
    </div>
  );
}
