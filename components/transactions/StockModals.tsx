"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addStock, removeStock, adjustStock } from "@/lib/actions/inventory";
import { toast } from "@/lib/hooks/useToast";
import { Plus, Minus, RefreshCw } from "lucide-react";

interface StockModalProps {
  itemId: string;
  itemName: string;
  currentQty: number;
}

export function AddStockModal({ itemId, itemName, currentQty }: StockModalProps) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await addStock({ item_id: itemId, quantity: qty, note, reason: "Stock added" });
    setLoading(false);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Stock added", description: `+${qty} added to ${itemName}`, variant: "default" });
    setOpen(false);
    setQty(1);
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Stock</DialogTitle>
          <DialogDescription>
            Add stock to <strong>{itemName}</strong>. Current: {currentQty}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-qty">Quantity *</Label>
            <Input
              id="add-qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-note">Note</Label>
            <Textarea
              id="add-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveStockModal({ itemId, itemName, currentQty }: StockModalProps) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await removeStock({ item_id: itemId, quantity: qty, note, reason: "Stock removed" });
    setLoading(false);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Stock removed", description: `-${qty} removed from ${itemName}` });
    setOpen(false);
    setQty(1);
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Minus className="mr-1 h-4 w-4" />
          Remove Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Stock</DialogTitle>
          <DialogDescription>
            Remove stock from <strong>{itemName}</strong>. Current: {currentQty}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rm-qty">Quantity *</Label>
            <Input
              id="rm-qty"
              type="number"
              min={1}
              max={currentQty}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rm-note">Note</Label>
            <Textarea
              id="rm-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "Saving..." : "Remove Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustStockModal({ itemId, itemName, currentQty }: StockModalProps) {
  const [open, setOpen] = useState(false);
  const [newQty, setNewQty] = useState(currentQty);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) setNewQty(currentQty);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await adjustStock({ item_id: itemId, new_quantity: newQty, note });
    setLoading(false);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Stock adjusted", description: `${itemName} set to ${newQty}` });
    setOpen(false);
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RefreshCw className="mr-1 h-4 w-4" />
          Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manual Adjustment</DialogTitle>
          <DialogDescription>
            Set exact quantity for <strong>{itemName}</strong>. Current: {currentQty}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adj-qty">New Quantity *</Label>
            <Input
              id="adj-qty"
              type="number"
              min={0}
              value={newQty}
              onChange={(e) => setNewQty(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-note">Reason / Note *</Label>
            <Textarea
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Required for manual adjustments..."
              rows={2}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
