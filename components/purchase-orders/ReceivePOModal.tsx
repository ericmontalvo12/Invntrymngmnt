"use client";

import { useState, useTransition } from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/hooks/useToast";
import { receivePurchaseOrderItems } from "@/lib/actions/purchase-orders";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

interface ReceivePOModalProps {
  po: PurchaseOrder & { items: PurchaseOrderItem[] };
  onReceived?: () => void;
}

export function ReceivePOModal({ po, onReceived }: ReceivePOModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pendingItems = po.items.filter(
    (i) => i.quantity_received < i.quantity_ordered
  );

  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(
      pendingItems.map((i) => [i.id, i.quantity_ordered - i.quantity_received])
    )
  );

  function handleReceive() {
    const payload = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([poItemId, quantityReceived]) => ({ poItemId, quantityReceived }));

    if (payload.length === 0) {
      toast({
        title: "Error",
        description: "Enter a quantity for at least one item",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await receivePurchaseOrderItems(po.id, payload);
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Items received and inventory updated" });
      setOpen(false);
      onReceived?.();
    });
  }

  if (pendingItems.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PackageCheck className="mr-1 h-4 w-4" />
          Receive Items
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive Items — {po.po_number}</DialogTitle>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-[80px] text-right">Ordered</TableHead>
              <TableHead className="w-[80px] text-right">Received</TableHead>
              <TableHead className="w-[100px] text-right">Remaining</TableHead>
              <TableHead className="w-[110px] text-right">Receive Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingItems.map((item) => {
              const remaining = item.quantity_ordered - item.quantity_received;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{item.item_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.item_sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                  <TableCell className="text-right">{item.quantity_received}</TableCell>
                  <TableCell className="text-right">{remaining}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      value={quantities[item.id] ?? 0}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: Math.min(
                            parseInt(e.target.value) || 0,
                            remaining
                          ),
                        }))
                      }
                      className="h-8 w-20 text-right text-xs ml-auto"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleReceive} disabled={isPending}>
            {isPending ? "Receiving..." : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
