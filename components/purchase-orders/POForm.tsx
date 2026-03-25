"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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

function UPCSearch({
  inventoryItems,
  onSelect,
}: {
  inventoryItems: Pick<InventoryItem, "id" | "name" | "sku" | "upc" | "cost_per_unit">[];
  onSelect: (item: Pick<InventoryItem, "id" | "name" | "sku" | "upc" | "cost_per_unit">) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        // check if click is inside the portal dropdown
        const portal = document.getElementById("upc-dropdown-portal");
        if (portal && portal.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const results = query.trim()
    ? inventoryItems
        .filter((i) => i.upc && i.upc.includes(query.trim()))
        .slice(0, 8)
    : [];

  function openDropdown() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  const dropdown =
    open && results.length > 0 && rect
      ? createPortal(
          <ul
            id="upc-dropdown-portal"
            style={{
              position: "fixed",
              top: rect.bottom + 4,
              left: rect.left,
              minWidth: rect.width,
              zIndex: 9999,
            }}
            className="max-h-48 w-max overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            {results.map((item) => (
              <li
                key={item.id}
                className="cursor-pointer px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="font-mono">{item.upc}</span>
                <span className="ml-2 text-muted-foreground">{item.name}</span>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="mt-1">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        placeholder="Search UPC…"
        className="h-7 text-xs"
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
}

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

  function handleItemSelect(tempId: string, itemId: string) {
    const found = inventoryItems.find((i) => i.id === itemId);
    if (found) {
      setLineItems((prev) =>
        prev.map((i) =>
          i.tempId === tempId
            ? {
                ...i,
                item_id: found.id,
                item_name: found.name,
                item_sku: found.sku,
                unit_cost: found.cost_per_unit?.toString() ?? "",
              }
            : i
        )
      );
    }
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
                    <TableHead className="w-[160px]">Item #</TableHead>
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
                        <Input
                          list={`sku-list-${item.tempId}`}
                          value={item.item_sku}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = inventoryItems.find(
                              (i) => i.sku === val
                            );
                            if (found) {
                              handleItemSelect(item.tempId, found.id);
                            } else {
                              updateLineItemField(item.tempId, "item_sku", val);
                            }
                          }}
                          placeholder="SKU"
                          className="h-8 text-xs"
                        />
                        <datalist id={`sku-list-${item.tempId}`}>
                          {inventoryItems.map((i) => (
                            <option key={i.id} value={i.sku} />
                          ))}
                        </datalist>
                        <UPCSearch
                          inventoryItems={inventoryItems}
                          onSelect={(found) => handleItemSelect(item.tempId, found.id)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          list={`name-list-${item.tempId}`}
                          value={item.item_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = inventoryItems.find(
                              (i) => i.name === val
                            );
                            if (found) {
                              handleItemSelect(item.tempId, found.id);
                            } else {
                              updateLineItemField(item.tempId, "item_name", val);
                            }
                          }}
                          placeholder="Item name"
                          className="h-8 text-xs"
                        />
                        <datalist id={`name-list-${item.tempId}`}>
                          {inventoryItems.map((i) => (
                            <option key={i.id} value={i.name} />
                          ))}
                        </datalist>
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
                            updateLineItemField(
                              item.tempId,
                              "unit_cost",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                          className="h-8 w-24 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={item.notes}
                          onChange={(e) =>
                            updateLineItemField(
                              item.tempId,
                              "notes",
                              e.target.value
                            )
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
