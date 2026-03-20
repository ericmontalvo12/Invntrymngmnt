"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInventoryItem, updateInventoryItem } from "@/lib/actions/inventory";
import { toast } from "@/lib/hooks/useToast";
import { CameraScanner } from "@/components/scan/CameraScanner";
import { Camera } from "lucide-react";
import type { Building, Category, InventoryItem, Supplier } from "@/types";

interface ItemFormProps {
  item?: InventoryItem;
  categories: Category[];
  buildings: Building[];
  suppliers: Supplier[];
}

const NONE_VALUE = "__none__";

export function ItemForm({ item, categories, buildings, suppliers }: ItemFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    name: item?.name ?? "",
    sku: item?.sku ?? "",
    upc: item?.upc ?? "",
    category_id: item?.category_id ?? "",
    building_id: item?.building_id ?? "",
    supplier_id: item?.supplier_id ?? "",
    quantity_on_hand: item?.quantity_on_hand ?? 0,
    minimum_threshold: item?.minimum_threshold ?? 0,
    reorder_quantity: item?.reorder_quantity ?? 0,
    unit_type: item?.unit_type ?? "unit",
    cost_per_unit: item?.cost_per_unit ?? "",
    notes: item?.notes ?? "",
    status: item?.status ?? "active",
    reorder_status: item?.reorder_status ?? "needs_reorder",
  });

  function set(field: string, value: string | number) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      upc: formData.upc || null,
      category_id: formData.category_id || null,
      building_id: formData.building_id || null,
      supplier_id: formData.supplier_id || null,
      cost_per_unit: formData.cost_per_unit === "" ? null : Number(formData.cost_per_unit),
      notes: formData.notes || null,
    };

    const result = item
      ? await updateInventoryItem(item.id, payload)
      : await createInventoryItem(payload);

    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({
      title: item ? "Item updated" : "Item created",
      variant: "success" as "default",
    });
    router.push(item ? `/inventory/${item.id}` : "/inventory");
  }

  return (
    <>
      {showCamera && (
        <CameraScanner
          onScan={(value) => { set("upc", value); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Widget A"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="WGT-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upc">UPC / Barcode</Label>
          <div className="flex gap-2">
            <Input
              id="upc"
              value={formData.upc}
              onChange={(e) => set("upc", e.target.value)}
              placeholder="012345678905"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowCamera(true)}
              aria-label="Scan barcode with camera"
              title="Scan with camera"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit_type">Unit Type</Label>
          <Input
            id="unit_type"
            value={formData.unit_type}
            onChange={(e) => set("unit_type", e.target.value)}
            placeholder="unit, box, kg, litre..."
          />
        </div>
      </div>

      {/* Classification */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={formData.category_id || NONE_VALUE}
            onValueChange={(v) => set("category_id", v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Building (Location)</Label>
          <Select
            value={formData.building_id || NONE_VALUE}
            onValueChange={(v) => set("building_id", v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Select
            value={formData.supplier_id || NONE_VALUE}
            onValueChange={(v) => set("supplier_id", v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stock */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="qty">Quantity on Hand</Label>
          <Input
            id="qty"
            type="number"
            min={0}
            value={formData.quantity_on_hand}
            onChange={(e) => set("quantity_on_hand", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="threshold">Min Threshold</Label>
          <Input
            id="threshold"
            type="number"
            min={0}
            value={formData.minimum_threshold}
            onChange={(e) => set("minimum_threshold", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorder_qty">Reorder Quantity</Label>
          <Input
            id="reorder_qty"
            type="number"
            min={0}
            value={formData.reorder_quantity}
            onChange={(e) => set("reorder_quantity", e.target.value)}
          />
        </div>
      </div>

      {/* Pricing & Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cost">Cost per Unit ($)</Label>
          <Input
            id="cost"
            type="number"
            min={0}
            step="0.01"
            value={formData.cost_per_unit}
            onChange={(e) => set("cost_per_unit", e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => set("status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Reorder Status</Label>
          <Select
            value={formData.reorder_status}
            onValueChange={(v) => set("reorder_status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="needs_reorder">Needs Reorder</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional notes about this item..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : item ? "Update Item" : "Create Item"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
    </>
  );
}
