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
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from "@/types";

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<WorkOrderStatus, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
};

const PRIORITY_CLASSES: Record<WorkOrderPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
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
          .from("work_orders")
          .select(
            "*, building:buildings(id, name), inspection_type:inspection_types(id, name)"
          )
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);

      setWorkOrders((orders ?? []) as WorkOrder[]);

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
      ? workOrders
      : workOrders.filter((w) => w.status === statusFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description={`${filtered.length} order${filtered.length !== 1 ? "s" : ""}`}
      >
        {isStaff && (
          <Link href="/work-orders/new">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              New Work Order
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
            {(Object.keys(STATUS_LABELS) as WorkOrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No work orders"
          description={
            statusFilter === "all"
              ? "Create your first work order to get started."
              : "No work orders match the selected filter."
          }
        />
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((wo) => (
              <Link key={wo.id} href={`/work-orders/${wo.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-sm">{wo.wo_number}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge className={PRIORITY_CLASSES[wo.priority]} variant="secondary">
                          {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                        </Badge>
                        <Badge className={STATUS_CLASSES[wo.status]} variant="secondary">
                          {STATUS_LABELS[wo.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {wo.building?.name ?? "—"}
                      {wo.apartment_unit && (
                        <span className="text-muted-foreground font-normal"> · {wo.apartment_unit}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {wo.inspection_type?.name && <span>{wo.inspection_type.name}</span>}
                      {wo.requested_by && <span>Req: {wo.requested_by}</span>}
                      {(wo.extended_due_date || wo.due_date) && (
                        <span>
                          Due:{" "}
                          {wo.extended_due_date
                            ? `${new Date(wo.extended_due_date).toLocaleDateString()} (ext)`
                            : new Date(wo.due_date!).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WO #</TableHead>
                    <TableHead>Building / Unit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-mono font-medium">
                        {wo.wo_number}
                      </TableCell>
                      <TableCell>
                        <span>{wo.building?.name ?? "—"}</span>
                        {wo.apartment_unit && (
                          <span className="text-muted-foreground"> · {wo.apartment_unit}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {wo.inspection_type?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {wo.requested_by ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {wo.extended_due_date
                          ? <span title="Extended">{new Date(wo.extended_due_date).toLocaleDateString()} <span className="text-xs text-orange-500">(ext)</span></span>
                          : wo.due_date
                          ? new Date(wo.due_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={PRIORITY_CLASSES[wo.priority]}
                          variant="secondary"
                        >
                          {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={STATUS_CLASSES[wo.status]}
                          variant="secondary"
                        >
                          {STATUS_LABELS[wo.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/work-orders/${wo.id}`}>
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
        </>
      )}
    </div>
  );
}
