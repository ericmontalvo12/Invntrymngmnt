"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "@/lib/hooks/useToast";
import {
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
  deleteWorkOrder,
} from "@/lib/actions/work-orders";
import type { WorkOrder, WorkOrderItem, WorkOrderStatus, WorkOrderPriority } from "@/types";

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

interface WorkOrderDetailClientProps {
  wo: WorkOrder & { items: WorkOrderItem[] };
  isAdmin: boolean;
  isStaff: boolean;
}

export function WorkOrderDetailClient({
  wo,
  isAdmin,
  isStaff,
}: WorkOrderDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canAct = isAdmin || isStaff;

  function handleStart() {
    startTransition(async () => {
      const result = await startWorkOrder(wo.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Work order started" });
      router.refresh();
    });
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeWorkOrder(wo.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Work order completed" });
      router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelWorkOrder(wo.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Work order cancelled" });
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWorkOrder(wo.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Work order deleted" });
      router.push("/work-orders");
    });
  }

  const canEdit =
    (wo.status === "open" || wo.status === "in_progress") && canAct;
  const canStart = wo.status === "open" && canAct;
  const canComplete =
    (wo.status === "open" || wo.status === "in_progress") && canAct;
  const canCancel =
    wo.status !== "completed" && wo.status !== "cancelled" && isAdmin;
  const canDelete = wo.status === "open" && isAdmin;

  const profileName = (p: { full_name: string | null; email: string } | null | undefined) =>
    p?.full_name ?? p?.email ?? "—";

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Link href={`/work-orders/${wo.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
        )}
        {canStart && (
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline" disabled={isPending}>
                Start Work
              </Button>
            }
            title="Start this work order?"
            description="This will mark the work order as in progress."
            confirmLabel="Start"
            onConfirm={handleStart}
          />
        )}
        {canComplete && (
          <ConfirmDialog
            trigger={
              <Button size="sm" disabled={isPending}>
                Mark Complete
              </Button>
            }
            title="Complete this work order?"
            description="This will mark the work order as completed and record the completion time."
            confirmLabel="Complete"
            onConfirm={handleComplete}
          />
        )}
        {canCancel && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm" disabled={isPending}>
                Cancel WO
              </Button>
            }
            title="Cancel this work order?"
            description="This will cancel the work order. This action cannot be undone."
            confirmLabel="Cancel WO"
            onConfirm={handleCancel}
          />
        )}
        {canDelete && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm" disabled={isPending}>
                Delete
              </Button>
            }
            title="Delete this work order?"
            description="This will permanently delete the work order. This action cannot be undone."
            confirmLabel="Delete"
            onConfirm={handleDelete}
          />
        )}
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      {/* WO Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Work Order — {wo.wo_number}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={PRIORITY_CLASSES[wo.priority]} variant="secondary">
                {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
              </Badge>
              <Badge className={STATUS_CLASSES[wo.status]} variant="secondary">
                {STATUS_LABELS[wo.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Requested By</span>
              <p className="font-medium">{profileName(wo.requester)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned To</span>
              <p className="font-medium">{profileName(wo.assignee)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Building</span>
              <p className="font-medium">{wo.building?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Apartment / Unit</span>
              <p className="font-medium">{wo.apartment_unit ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Inspection Type</span>
              <p className="font-medium">{wo.inspection_type?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Inspection Date</span>
              <p className="font-medium">
                {wo.inspection_date
                  ? new Date(wo.inspection_date).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Due By</span>
              <p className="font-medium">
                {wo.due_date
                  ? new Date(wo.due_date).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            {wo.extended_due_date && (
              <div>
                <span className="text-muted-foreground">Extended Due Date</span>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  {new Date(wo.extended_due_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {wo.completed_at && (
              <div>
                <span className="text-muted-foreground">Completed On</span>
                <p className="font-medium text-green-600 dark:text-green-400">
                  {new Date(wo.completed_at).toLocaleDateString()}
                </p>
              </div>
            )}
            {wo.completer && (
              <div>
                <span className="text-muted-foreground">Completed By</span>
                <p className="font-medium">{profileName(wo.completer)}</p>
              </div>
            )}
            {wo.notes && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Notes</span>
                <p className="font-medium whitespace-pre-wrap">{wo.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {wo.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items Needed</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item #</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty Needed</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wo.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.item_sku}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell className="text-right">{item.quantity_needed}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.notes ?? "—"}
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
