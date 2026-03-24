"use client";

import { useState, useTransition } from "react";
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
import { ReceivePOModal } from "@/components/purchase-orders/ReceivePOModal";
import { toast } from "@/lib/hooks/useToast";
import { printPurchaseOrder } from "@/lib/po-print";
import {
  completePurchaseOrder,
  voidPurchaseOrder,
} from "@/lib/actions/purchase-orders";
import type { PurchaseOrder, PurchaseOrderItem, POStatus } from "@/types";

function POStatusBadge({ status }: { status: POStatus }) {
  const variants: Record<
    POStatus,
    { label: string; className: string }
  > = {
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    ordered: { label: "Open", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    partially_received: { label: "Partial", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    received: { label: "Received", className: "bg-emerald-600 text-white dark:bg-emerald-900/30 dark:text-emerald-400" },
    voided: { label: "Voided", className: "bg-red-600 text-white dark:bg-red-900/30 dark:text-red-400" },
  };
  const v = variants[status];
  return (
    <Badge className={v.className} variant="secondary">
      {v.label}
    </Badge>
  );
}

interface PODetailClientProps {
  po: PurchaseOrder & { items: PurchaseOrderItem[] };
  isAdmin: boolean;
  isStaff: boolean;
  orderedByName: string;
}

export function PODetailClient({ po, isAdmin, isStaff, orderedByName }: PODetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canAct = isAdmin || isStaff;

  function handleComplete() {
    startTransition(async () => {
      const result = await completePurchaseOrder(po.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "PO marked as ordered" });
      router.refresh();
    });
  }

  function handleVoid() {
    startTransition(async () => {
      const result = await voidPurchaseOrder(po.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "PO voided" });
      router.refresh();
    });
  }

  const grandTotal = po.items.reduce((sum, item) => {
    return item.unit_cost ? sum + item.quantity_ordered * item.unit_cost : sum;
  }, 0);

  const canEdit = po.status === "draft" && canAct;
  const canComplete = po.status === "draft" && canAct;
  const canReceive =
    (po.status === "ordered" || po.status === "partially_received") && canAct;
  const canVoid =
    po.status !== "received" && po.status !== "voided" && isAdmin;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Link href={`/purchase-orders/${po.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
        )}
        {canComplete && (
          <ConfirmDialog
            trigger={
              <Button size="sm" disabled={isPending}>
                Complete PO
              </Button>
            }
            title="Complete this PO?"
            description="This will mark the PO as ordered and send it to the vendor. You can still receive items afterward."
            confirmLabel="Complete PO"
            onConfirm={handleComplete}
          />
        )}
        {canReceive && (
          <ReceivePOModal po={po} onReceived={() => router.refresh()} />
        )}
        {canVoid && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm" disabled={isPending}>
                Void PO
              </Button>
            }
            title="Void this PO?"
            description="This will permanently void the PO. This action cannot be undone."
            confirmLabel="Void PO"
            onConfirm={handleVoid}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (po.status === "draft") {
              startTransition(async () => {
                const result = await completePurchaseOrder(po.id);
                if (!result.success) {
                  toast({ title: "Error", description: result.error, variant: "destructive" });
                  return;
                }
                router.refresh();
                printPurchaseOrder({ po, orderedByName });
              });
            } else {
              printPurchaseOrder({ po, orderedByName });
            }
          }}
        >
          <Printer className="mr-1 h-3.5 w-3.5" />
          Print PO
        </Button>
      </div>

      {/* PO Info */}
      <Card className="print-section">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Purchase Order — {po.po_number}
            </CardTitle>
            <POStatusBadge status={po.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Vendor</span>
              <p className="font-medium">{po.vendor?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ship To Building</span>
              <p className="font-medium">{po.building?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Apartment / Unit</span>
              <p className="font-medium">{po.apartment_unit ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Delivery Date</span>
              <p className="font-medium">
                {po.expected_delivery
                  ? new Date(po.expected_delivery).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            {po.special_instructions && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Special Instructions</span>
                <p className="font-medium">{po.special_instructions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item #</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.item_sku}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        item.quantity_received >= item.quantity_ordered
                          ? "text-green-600"
                          : item.quantity_received > 0
                          ? "text-yellow-600"
                          : ""
                      }
                    >
                      {item.quantity_received}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.unit_cost != null ? `$${item.unit_cost.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.unit_cost != null
                      ? `$${(item.quantity_ordered * item.unit_cost).toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {grandTotal > 0 && (
            <div className="flex justify-end border-t px-6 py-3">
              <span className="text-sm font-semibold">
                Total:{" "}
                <span className="text-foreground">${grandTotal.toFixed(2)}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
