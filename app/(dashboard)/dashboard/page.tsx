import Link from "next/link";
import { Package, AlertTriangle, XCircle, ArrowLeftRight, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { TransactionTypeBadge, StockStatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { InventoryItem, InventoryTransaction } from "@/types";

async function getDashboardData() {
  const supabase = await createClient();

  const [
    { count: totalItems },
    { data: allItems },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase.from("inventory_items").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("inventory_items")
      .select("id, name, sku, quantity_on_hand, minimum_threshold, reorder_status, supplier:suppliers(name)")
      .eq("status", "active"),
    supabase
      .from("inventory_transactions")
      .select("*, item:inventory_items(id, name, sku), user:profiles(id, email, full_name)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items = (allItems ?? []) as unknown as InventoryItem[];
  const lowStock = items.filter((i) => i.quantity_on_hand > 0 && i.quantity_on_hand <= i.minimum_threshold);
  const outOfStock = items.filter((i) => i.quantity_on_hand === 0);
  const reorderNeeded = items.filter((i) => i.quantity_on_hand <= i.minimum_threshold && i.reorder_status === "needs_reorder");

  return {
    totalItems: totalItems ?? 0,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    recentTransactions: (recentTransactions ?? []) as InventoryTransaction[],
    reorderItems: reorderNeeded.slice(0, 5) as InventoryItem[],
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your inventory status"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Items"
          value={data.totalItems}
          icon={<Package className="h-5 w-5 text-blue-500" />}
          href="/inventory"
          color="blue"
        />
        <StatCard
          title="Low Stock"
          value={data.lowStockCount}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          href="/reorder"
          color="amber"
        />
        <StatCard
          title="Out of Stock"
          value={data.outOfStockCount}
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          href="/inventory?stock=out"
          color="red"
        />
        <StatCard
          title="Needs Reorder"
          value={data.reorderItems.length}
          icon={<RefreshCw className="h-5 w-5 text-purple-500" />}
          href="/reorder"
          color="purple"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/transactions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent transactions</p>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TransactionTypeBadge type={tx.transaction_type} />
                        <span className="truncate font-medium">
                          {tx.item?.name ?? "Unknown Item"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tx.user?.full_name || tx.user?.email} · {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <span
                      className={
                        tx.quantity_change > 0
                          ? "shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white"
                          : "shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
                      }
                    >
                      {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reorder Needed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Reorder Needed</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reorder">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.reorderItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                All items are sufficiently stocked
              </p>
            ) : (
              <div className="space-y-3">
                {data.reorderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StockStatusBadge qty={item.quantity_on_hand} threshold={item.minimum_threshold} />
                      <span className="text-xs text-muted-foreground">
                        {item.quantity_on_hand} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  color: "blue" | "amber" | "red" | "purple";
}) {
  const bgMap = {
    blue: "bg-blue-50 dark:bg-blue-950/30",
    amber: "bg-amber-50 dark:bg-amber-950/30",
    red: "bg-red-50 dark:bg-red-950/30",
    purple: "bg-purple-50 dark:bg-purple-950/30",
  };

  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="mt-1 text-3xl font-bold">{value}</p>
            </div>
            <div className={`rounded-xl p-3 ${bgMap[color]}`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
