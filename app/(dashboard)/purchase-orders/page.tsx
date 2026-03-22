"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { PurchaseOrder, POStatus } from "@/types";

const STATUS_LABELS: Record<POStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially Received",
  received: "Received",
  voided: "Voided",
};

const STATUS_CLASSES: Record<POStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  partially_received: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  received: "bg-emerald-600 text-white dark:bg-emerald-900/30 dark:text-emerald-400",
  voided: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: orders },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase
          .from("purchase_orders")
          .select(
            "*, vendor:suppliers(id, name), project:projects(id, name), building:buildings(id, name)"
          )
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);

      setPos((orders ?? []) as PurchaseOrder[]);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsStaff(
          profile?.role === "admin" || profile?.role === "staff"
        );
      }
    }
    load();
  }, []);

  const filtered =
    statusFilter === "all"
      ? pos
      : pos.filter((p) => p.status === statusFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description={`${filtered.length} order${filtered.length !== 1 ? "s" : ""}`}
      >
        {isStaff && (
          <Link href="/purchase-orders/new">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              New PO
            </Button>
          </Link>
        )}
      </PageHeader>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as POStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No purchase orders"
          description={
            statusFilter === "all"
              ? "Create your first purchase order to get started."
              : "No orders match the selected filter."
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono font-medium">
                      {po.po_number}
                    </TableCell>
                    <TableCell>{po.vendor?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {po.project?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {po.building?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {po.expected_delivery
                        ? new Date(po.expected_delivery).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_CLASSES[po.status]}
                        variant="secondary"
                      >
                        {STATUS_LABELS[po.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/purchase-orders/${po.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
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
