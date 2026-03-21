"use client";

import { useState, useTransition } from "react";
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
import { createWorkOrder, updateWorkOrder } from "@/lib/actions/work-orders";
import type {
  Building,
  InspectionType,
  InventoryItem,
  WorkOrder,
  WorkOrderItem,
} from "@/types";

interface LineItemState {
  tempId: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  quantity_needed: number;
  notes: string;
}

interface WorkOrderFormProps {
  buildings: Pick<Building, "id" | "name">[];
  inspectionTypes: Pick<InspectionType, "id" | "name">[];
  inventoryItems: Pick<InventoryItem, "id" | "name" | "sku">[];
  defaultValues?: WorkOrder & { items: WorkOrderItem[] };
  mode?: "create" | "edit";
}

export function WorkOrderForm({
  buildings,
  inspectionTypes,
  inventoryItems,
  defaultValues,
  mode = "create",
}: WorkOrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [header, setHeader] = useState({
    building_id: defaultValues?.building_id ?? "",
    apartment_unit: defaultValues?.apartment_unit ?? "",
    inspection_type_id: defaultValues?.inspection_type_id ?? "",
    requested_by: defaultValues?.requested_by ?? "",
    inspection_date: defaultValues?.inspection_date ?? "",
    due_date: defaultValues?.due_date ?? "",
    extended_due_date: defaultValues?.extended_due_date ?? "",
    priority: defaultValues?.priority ?? "medium",
    notes: defaultValues?.notes ?? "",
  });

  const [lineItems, setLineItems] = useState<LineItemState[]>(
    defaultValues?.items?.map((item) => ({
      tempId: item.id,
      item_id: item.item_id ?? "",
      item_name: item.item_name,
      item_sku: item.item_sku,
      quantity_needed: item.quantity_needed,
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
        quantity_needed: 1,
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
            ? { ...i, item_id: found.id, item_name: found.name, item_sku: found.sku }
            : i
        )
      );
    }
  }

  function handleSave() {
    if (!header.requested_by) {
      toast({
        title: "Error",
        description: "Please enter who requested this work order",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      building_id: header.building_id || null,
      apartment_unit: header.apartment_unit || null,
      inspection_type_id: header.inspection_type_id || null,
      requested_by: header.requested_by,
      assigned_to: null,
      inspection_date: header.inspection_date || null,
      due_date: header.due_date || null,
      extended_due_date: header.extended_due_date || null,
      priority: header.priority as "low" | "medium" | "high" | "urgent",
      notes: header.notes || null,
      items: lineItems.map((item) => ({
        item_id: item.item_id || null,
        item_name: item.item_name,
        item_sku: item.item_sku,
        quantity_needed: item.quantity_needed,
        notes: item.notes || null,
      })),
    };

    startTransition(async () => {
      let result;
      if (mode === "edit" && defaultValues) {
        result = await updateWorkOrder(defaultValues.id, payload);
      } else {
        result = await createWorkOrder(payload);
      }

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: mode === "edit" ? "Work order updated" : "Work order created" });
      router.push(`/work-orders/${result.data!.id}`);
    });
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Requested By */}
            <div className="space-y-2">
              <Label>
                Requested By <span className="text-destructive">*</span>
              </Label>
              <Input
                value={header.requested_by}
                onChange={(e) => setHeaderField("requested_by", e.target.value)}
                placeholder="Name of requester"
              />
            </div>

            {/* Inspection Type */}
            <div className="space-y-2">
              <Label>Inspection Type</Label>
              <Select
                value={header.inspection_type_id}
                onValueChange={(v) => setHeaderField("inspection_type_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {inspectionTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Building */}
            <div className="space-y-2">
              <Label>Building</Label>
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

            {/* Unit */}
            <div className="space-y-2">
              <Label>Apartment / Unit</Label>
              <Input
                value={header.apartment_unit}
                onChange={(e) => setHeaderField("apartment_unit", e.target.value)}
                placeholder="e.g. Apt 4B"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={header.priority}
                onValueChange={(v) => setHeaderField("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inspection Date */}
            <div className="space-y-2">
              <Label>Inspection Date</Label>
              <Input
                type="date"
                value={header.inspection_date}
                onChange={(e) => setHeaderField("inspection_date", e.target.value)}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due By</Label>
              <Input
                type="date"
                value={header.due_date}
                onChange={(e) => setHeaderField("due_date", e.target.value)}
              />
            </div>

            {/* Extended Due Date */}
            <div className="space-y-2">
              <Label>Extended Due Date</Label>
              <Input
                type="date"
                value={header.extended_due_date}
                onChange={(e) => setHeaderField("extended_due_date", e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={header.notes}
                onChange={(e) => setHeaderField("notes", e.target.value)}
                rows={3}
                placeholder="Describe the work to be done..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Needed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Items Needed</CardTitle>
          <Button type="button" size="sm" onClick={addLineItem}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {lineItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No items added. Click &quot;Add Item&quot; if materials are needed.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Item #</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
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
                          const found = inventoryItems.find((i) => i.sku === val);
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
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        list={`name-list-${item.tempId}`}
                        value={item.item_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = inventoryItems.find((i) => i.name === val);
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
                        value={item.quantity_needed}
                        onChange={(e) =>
                          updateLineItemField(
                            item.tempId,
                            "quantity_needed",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="h-8 w-20 text-xs"
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
          )}
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/work-orders")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "edit"
            ? "Save Changes"
            : "Create Work Order"}
        </Button>
      </div>
    </div>
  );
}
