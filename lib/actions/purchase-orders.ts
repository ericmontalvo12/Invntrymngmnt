"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { purchaseOrderSchema } from "@/lib/validations/purchase-orders";
import type { ActionResult, PurchaseOrder, UserRole } from "@/types";

async function requireAdminOrStaff(): Promise<
  { userId: string; role: UserRole; organizationId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer")
    return { error: "Staff access required" };
  if (!profile.organization_id) return { error: "No organization assigned. Please set up your organization in Settings." };
  return { userId: user.id, role: profile.role as UserRole, organizationId: profile.organization_id as string };
}

async function requireAdmin(): Promise<
  { userId: string; role: UserRole; organizationId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin")
    return { error: "Admin access required" };
  if (!profile.organization_id) return { error: "No organization assigned. Please set up your organization in Settings." };
  return { userId: user.id, role: profile.role as UserRole, organizationId: profile.organization_id as string };
}

export async function createPurchaseOrder(
  formData: unknown
): Promise<ActionResult<PurchaseOrder>> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const parsed = purchaseOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation error",
    };
  }

  const supabase = await createServiceClient();

  // Generate PO number
  const { count } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organizationId);

  const nextNum = (count ?? 0) + 1;
  const poNumber = `PO-${String(nextNum).padStart(5, "0")}`;

  const { items, ...headerData } = parsed.data;

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      ...headerData,
      vendor_id: headerData.vendor_id || null,
      project_id: headerData.project_id || null,
      building_id: headerData.building_id || null,
      po_number: poNumber,
      status: "draft",
      created_by: auth.userId,
      organization_id: auth.organizationId,
    })
    .select()
    .single();

  if (poError) return { success: false, error: poError.message };

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(
      items.map((item) => ({
        purchase_order_id: po.id,
        item_id: item.item_id || null,
        item_name: item.item_name,
        item_sku: item.item_sku,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost ?? null,
        notes: item.notes || null,
      }))
    );

  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return { success: false, error: itemsError.message };
  }

  revalidatePath("/purchase-orders");
  return { success: true, data: po as PurchaseOrder };
}

export async function updatePurchaseOrder(
  id: string,
  formData: unknown
): Promise<ActionResult<PurchaseOrder>> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  // Only draft POs can be edited
  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!existing) return { success: false, error: "PO not found" };
  if (existing.status !== "draft")
    return { success: false, error: "Only draft POs can be edited" };

  const parsed = purchaseOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation error",
    };
  }

  const { items, ...headerData } = parsed.data;

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .update({
      ...headerData,
      vendor_id: headerData.vendor_id || null,
      project_id: headerData.project_id || null,
      building_id: headerData.building_id || null,
    })
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .select()
    .single();

  if (poError) return { success: false, error: poError.message };

  // Replace all line items
  await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(
      items.map((item) => ({
        purchase_order_id: id,
        item_id: item.item_id || null,
        item_name: item.item_name,
        item_sku: item.item_sku,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost ?? null,
        notes: item.notes || null,
      }))
    );

  if (itemsError) return { success: false, error: itemsError.message };

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  return { success: true, data: po as PurchaseOrder };
}

export async function completePurchaseOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!po) return { success: false, error: "PO not found" };
  if (po.status !== "draft")
    return { success: false, error: "Only draft POs can be completed" };

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "ordered" })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { success: false, error: error.message };

  // Update reorder_status on all linked inventory items
  const { data: poItems } = await supabase
    .from("purchase_order_items")
    .select("item_id")
    .eq("purchase_order_id", id)
    .not("item_id", "is", null);

  const itemIds = (poItems ?? []).map((i) => i.item_id).filter(Boolean) as string[];
  if (itemIds.length > 0) {
    await supabase
      .from("inventory_items")
      .update({ reorder_status: "ordered" })
      .in("id", itemIds);
  }

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/reorder");
  return { success: true, data: undefined };
}

export async function confirmPurchaseOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!po) return { success: false, error: "PO not found" };
  if (po.status !== "ordered")
    return { success: false, error: "Only open POs can be marked as ordered" };

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  return { success: true, data: undefined };
}

export async function voidPurchaseOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!po) return { success: false, error: "PO not found" };
  if (po.status === "received" || po.status === "voided")
    return { success: false, error: "Cannot void this PO" };

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "voided" })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  return { success: true, data: undefined };
}

export async function receivePurchaseOrderItems(
  poId: string,
  receivedItems: { poItemId: string; quantityReceived: number }[]
): Promise<ActionResult> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("*, items:purchase_order_items(*)")
    .eq("id", poId)
    .eq("organization_id", auth.organizationId)
    .single();

  if (poError || !po) return { success: false, error: "PO not found" };
  if (po.status === "draft" || po.status === "received" || po.status === "voided")
    return { success: false, error: "Cannot receive items on this PO" };

  for (const received of receivedItems) {
    if (received.quantityReceived <= 0) continue;

    const poItem = (po.items as { id: string; item_id: string | null; quantity_ordered: number; quantity_received: number }[])
      .find((i) => i.id === received.poItemId);
    if (!poItem) continue;

    const newQtyReceived = poItem.quantity_received + received.quantityReceived;

    await supabase
      .from("purchase_order_items")
      .update({ quantity_received: newQtyReceived })
      .eq("id", received.poItemId);

    if (poItem.item_id) {
      const { data: item } = await supabase
        .from("inventory_items")
        .select("quantity_on_hand")
        .eq("id", poItem.item_id)
        .single();

      if (item) {
        const quantityBefore = item.quantity_on_hand;
        const quantityAfter = quantityBefore + received.quantityReceived;

        // Set building_id from PO so item's location reflects where it was received
        const locationUpdate = po.building_id ? { building_id: po.building_id } : {};

        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: quantityAfter, reorder_status: "received", ...locationUpdate })
          .eq("id", poItem.item_id);

        await supabase.from("inventory_transactions").insert({
          item_id: poItem.item_id,
          user_id: auth.userId,
          transaction_type: "received",
          quantity_change: received.quantityReceived,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          reason: `Received from ${po.po_number}`,
          note: null,
          organization_id: auth.organizationId,
        });
      }
    }
  }

  // Refresh PO items and update status
  const { data: updatedItems } = await supabase
    .from("purchase_order_items")
    .select("quantity_ordered, quantity_received")
    .eq("purchase_order_id", poId);

  const allReceived = updatedItems?.every(
    (i) => i.quantity_received >= i.quantity_ordered
  );
  const anyReceived = updatedItems?.some((i) => i.quantity_received > 0);

  const newStatus = allReceived
    ? "received"
    : anyReceived
    ? "partially_received"
    : po.status;

  await supabase
    .from("purchase_orders")
    .update({ status: newStatus })
    .eq("id", poId);

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/inventory");
  revalidatePath("/transactions");
  return { success: true, data: undefined };
}

export async function deletePurchaseOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!po) return { success: false, error: "PO not found" };
  if (po.status !== "draft")
    return { success: false, error: "Only draft POs can be deleted" };

  const { error } = await supabase
    .from("purchase_orders")
    .delete()
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/purchase-orders");
  return { success: true, data: undefined };
}
