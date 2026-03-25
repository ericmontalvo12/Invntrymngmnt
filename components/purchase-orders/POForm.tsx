"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Search, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/hooks/useToast";
import { createPurchaseOrder, updatePurchaseOrder } from "@/lib/actions/purchase-orders";
import type { Supplier, Building, InventoryItem, PurchaseOrder, PurchaseOrderItem } from "@/types";

interface LineItemState {
  tempId: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  quantity: number;
  unit_cost: string;
  notes: string;
}

interface POFormProps {
  vendors: Pick<Supplier, "id" | "name">[];
  buildings: Pick<Building, "id" | "name">[];
  inventoryItems: Pick<InventoryItem, "id" | "name" | "sku" | "upc" | "cost_per_unit">[];
  defaultValues?: PurchaseOrder & { items: PurchaseOrderItem[] };
  mode?: "create" | "edit";
}

type ItemOption = Pick<InventoryItem, "id" | "name" | "sku" | "upc" | "cost_per_unit">;

// Inline search dropdown for SKU / UPC lookup
function ItemSearchInput({
  inventoryItems,
  selectedId,
  selectedSku,
  onSelect,
  onClear,
}: {
  inventoryItems: ItemOption[];
  selectedId: string;
  selectedSku: string;
  onSelect: (item: ItemOption) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = query.trim().length > 0
    ? inventoryItems.filter((i) => {
        const q = query.toLowerCase();
        return (
          i.sku.toLowerCase().includes(q) ||
          (i.upc != null && i.upc.toLowerCase().includes(q))
        );
      }).slice(0, 10)
    : [];

  function handleBlur() {
    // Delay so clicks on result buttons register first
    setTimeout(() => setOpen(false), 150);
  }

  if (selectedId) {
    return (
      <div className="flex items-center gap-1 rounded-md border bg-muted px-2 h-8 text-xs min-w-0">
        <span className="truncate font-mono flex-1">{selectedSku}</span>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="SKU or UPC..."
          className="h-8 pl-6 text-xs"
          autoComplete="off"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-[100] mt-1 w-72 rounded-md border bg-popover shadow-lg">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full px-3 py-2 text-left text-xs hover:bg-accent"
              onClick={() => {
                onSelect(item);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-mono font-medium">{item.sku}</span>
              {item.upc && (
                <span className="ml-2 text-muted-foreground">UPC: {item.upc}</span>
              )}
              <div className="truncate text-muted-foreground">{item.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function POForm({
  vendors,
  buildings,
  inventoryItems,
  defaultValues,
  mode = "create",
}: POFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [header, setHeader] = useState({
    vendor_id: defaultValues?.vendor_id ?? "",
    building_id: defaultValues?.building_id ?? "",
    apartment_unit: defaultValues?.apartment_unit ?? "",
    expected_delivery: defaultValues?.expected_delivery ?? "",
    special_instructions: defaultValues?.special_instructions ?? "",
  });

  const [lineItems, setLineItems] = useState<LineItemState[]>(
    defaultValues?.items?.map((item) => ({
      tempId: item.id,
      item_id: item.item_id ?? "",
      item_name: item.item_name,
      item_sku: item.item_sku,
      quantity: item.quantity_ordered,
      unit_cost: item.unit_cost?.toString() ?? "",
      notes: item.notes ?? "",
    })) ?? []
  );

  function setHeaderField(k: keyof typeof header, v: string) {
    setHeader((p) => ({ ...p, [k]: v }));
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        item_id: "",
        item_name: "",
        item_sku: "",
        quantity: 1,
        unit_cost: "",
        notes: "",
      },
    ]);
  }

  function removeLineItem(tempId: string) {
    setLineItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }

  function updateLineItemField(
    tempId: string,
    field: keyof LineItemState,
    value: string | number
  ) {
    setLineItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i))
    );
  }

  function handleItemSelect(
    tempId: string,
    item: Pick<InventoryItem, "id" | "name" | "sku" | "upc" | "cost_per_unit">
  ) {
    setLineItems((prev) =>
      prev.map((i) =>
        i.tempId === tempId
          ? {
              ...i,
              item_id: item.id,
              item_name: item.name,
              item_sku: item.sku,
              unit_cost: item.cost_per_unit?.toString() ?? "",
            }
          : i
      )
    );
  }

  function handleItemClear(tempId: string) {
    setLineItems((prev) =>
      prev.map((i) =>
        i.tempId === tempId
          ? { ...i, item_id: "", item_name: "", item_sku: "" }
          : i
      )
    );
  }

  const lineTotal = (qty: number, cost: string) => {
    const c = parseFloat(cost);
    return isNaN(c) ? null : qty * c;
  };

  const grandTotal = lineItems.reduce((sum, item) => {
    const t = lineTotal(item.quantity, item.unit_cost);
    return t !== null ? sum + t : sum;
  }, 0);

  function handleSave() {
    if (lineItems.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one item to the PO",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      vendor_id: header.vendor_id || null,
      project_id: null,
      building_id: header.building_id || null,
      apartment_unit: header.apartment_unit || null,
      expected_delivery: header.expected_delivery || null,
      special_instructions: header.special_instructions || null,
      items: lineItems.map((item) => ({
        item_id: item.item_id || null,
        item_name: item.item_name,
        item_sku: item.item_sku,
        quantity_ordered: item.quantity,
        unit_cost: item.unit_cost ? parseFloat(item.unit_cost) : null,
        notes: item.notes || null,
      })),
    };

    startTransition(async () => {
      let result;
      if (mode === "edit" && defaultValues) {
        result = await updatePurchaseOrder(defaultValues.id, payload);
      } else {
        result = await createPurchaseOrder(payload);
      }

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: mode === "edit" ? "PO updated" : "PO saved" });
      router.push(`/purchase-orders/${result.data!.id}`);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={header.vendor_id}
                onValueChange={(v) => setHeaderField("vendor_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ship To Building</Label>
              <Select
                value={header.building_id}
                onValueChange={(v) => setHeaderField("building_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building..." />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Apartment / Unit</Label>
              <Input
                value={header.apartment_unit}
                onChange={(e) => setHeaderField("apartment_unit", e.target.value)}
                placeholder="e.g. Apt 4B"
              />
            </div>

            <div className="space-y-2">
              <Label>Delivery Date</Label>
              <Input
                type="date"
                value={header.expected_delivery}
                onChange={(e) => setHeaderField("expected_delivery", e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={header.special_instructions}
                onChange={(e) => setHeaderField("special_instructions", e.target.value)}
                rows={3}
                placeholder="Any special delivery or handling instructions..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Items</CardTitle>
          <Button type="button" size="sm" onClick={addLineItem}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item to PO
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {lineItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No items added yet. Click &quot;Add Item to PO&quot; to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">SKU / UPC</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[110px]">Cost</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.tempId}>
                      <TableCell className="py-2">
                        <ItemSearchInput
                          inventoryItems={inventoryItems}
                          selectedId={item.item_id}
                          selectedSku={item.item_sku}
                          onSelect={(found) => handleItemSelect(item.tempId, found)}
                          onClear={() => handleItemClear(item.tempId)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={item.item_name}
                          onChange={(e) =>
                            updateLineItemField(item.tempId, "item_name", e.target.value)
                          }
                          placeholder="Item name"
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItemField(
                              item.tempId,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="h-8 w-20 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) =>
                            updateLineItemField(item.tempId, "unit_cost", e.target.value)
                          }
                          placeholder="0.00"
                          className="h-8 w-24 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={item.notes}
                          onChange={(e) =>
                            updateLineItemField(item.tempId, "notes", e.target.value)
                          }
                          placeholder="Optional note"
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeLineItem(item.tempId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {grandTotal > 0 && (
                <div className="flex justify-end border-t px-6 py-3">
                  <span className="text-sm font-medium">
                    Estimated Total:{" "}
                    <span className="text-foreground">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/purchase-orders")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "edit"
            ? "Save Changes"
            : "Save & Review"}
        </Button>
      </div>
    </div>
  );
}
