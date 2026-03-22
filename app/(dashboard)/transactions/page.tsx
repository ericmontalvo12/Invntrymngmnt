import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
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
import { TransactionTypeBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { InventoryTransaction } from "@/types";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("inventory_transactions")
    .select("*, item:inventory_items(id, name, sku), user:profiles(id, email, full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const transactions = (data ?? []) as InventoryTransaction[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Log"
        description={`${transactions.length} recent transactions`}
      />

      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Stock changes will appear here once you start receiving or dispatching."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
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
                    <TableCell>
                      {tx.item ? (
                        <Link
                          href={`/inventory/${tx.item.id}`}
                          className="font-medium hover:underline"
                        >
                          {tx.item.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Deleted item</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tx.item?.sku ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        tx.quantity_change > 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {tx.quantity_change > 0 ? "+" : ""}
                      {tx.quantity_change}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tx.quantity_before}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {tx.quantity_after}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tx.reason ?? "—"}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
