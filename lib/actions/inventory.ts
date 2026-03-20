"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  inventoryItemSchema,
  stockTransactionSchema,
  adjustmentSchema,
} from "@/lib/validations/inventory";
import type { ActionResult, InventoryItem, UserRole } from "@/types";

async function getSessionAndRole(): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { userId: user.id, role: profile.role as UserRole };
}

export async function createInventoryItem(
  formData: unknown
): Promise<ActionResult<InventoryItem>> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role !== "admin")
    return { success: false, error: "Admin access required" };

  const parsed = inventoryItemSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ ...parsed.data, created_by: session.userId })
    .select(`*, category:categories(*), building:buildings(*), supplier:suppliers(*)`)
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "An item with this SKU or UPC already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true, data: data as InventoryItem };
}

export async function updateInventoryItem(
  id: string,
  formData: unknown
): Promise<ActionResult<InventoryItem>> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role !== "admin")
    return { success: false, error: "Admin access required" };

  const parsed = inventoryItemSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .update(parsed.data)
    .eq("id", id)
    .select(`*, category:categories(*), building:buildings(*), supplier:suppliers(*)`)
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "An item with this SKU or UPC already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/dashboard");
  return { success: true, data: data as InventoryItem };
}

export async function deleteInventoryItem(id: string): Promise<ActionResult> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role !== "admin")
    return { success: false, error: "Admin access required" };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function addStock(formData: unknown): Promise<ActionResult> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role === "viewer")
    return { success: false, error: "Insufficient permissions" };

  const parsed = stockTransactionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();

  // Get current quantity
  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("quantity_on_hand")
    .eq("id", parsed.data.item_id)
    .single();

  if (fetchError || !item) return { success: false, error: "Item not found" };

  const quantityBefore = item.quantity_on_hand;
  const quantityAfter = quantityBefore + parsed.data.quantity;

  // Update quantity
  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({ quantity_on_hand: quantityAfter })
    .eq("id", parsed.data.item_id);

  if (updateError) return { success: false, error: updateError.message };

  // Log transaction
  const { error: txError } = await supabase
    .from("inventory_transactions")
    .insert({
      item_id: parsed.data.item_id,
      user_id: session.userId,
      transaction_type: "stock_in",
      quantity_change: parsed.data.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: parsed.data.reason || "Stock added",
      note: parsed.data.note,
    });

  if (txError) return { success: false, error: txError.message };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.item_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true, data: undefined };
}

export async function removeStock(formData: unknown): Promise<ActionResult> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role === "viewer")
    return { success: false, error: "Insufficient permissions" };

  const parsed = stockTransactionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();

  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("quantity_on_hand, minimum_threshold")
    .eq("id", parsed.data.item_id)
    .single();

  if (fetchError || !item) return { success: false, error: "Item not found" };

  const quantityBefore = item.quantity_on_hand;
  const quantityAfter = quantityBefore - parsed.data.quantity;

  // Only admins can go below zero
  if (quantityAfter < 0 && session.role !== "admin") {
    return {
      success: false,
      error: `Insufficient stock. Available: ${quantityBefore}`,
    };
  }

  const finalQty = Math.max(0, quantityAfter);
  const autoReorder = finalQty <= item.minimum_threshold ? { reorder_status: "needs_reorder" } : {};

  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({ quantity_on_hand: finalQty, ...autoReorder })
    .eq("id", parsed.data.item_id);

  if (updateError) return { success: false, error: updateError.message };

  const { error: txError } = await supabase
    .from("inventory_transactions")
    .insert({
      item_id: parsed.data.item_id,
      user_id: session.userId,
      transaction_type: "stock_out",
      quantity_change: -parsed.data.quantity,
      quantity_before: quantityBefore,
      quantity_after: finalQty,
      reason: parsed.data.reason || "Stock removed",
      note: parsed.data.note,
    });

  if (txError) return { success: false, error: txError.message };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.item_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true, data: undefined };
}

export async function adjustStock(formData: unknown): Promise<ActionResult> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role === "viewer")
    return { success: false, error: "Insufficient permissions" };

  const parsed = adjustmentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();

  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("quantity_on_hand, minimum_threshold")
    .eq("id", parsed.data.item_id)
    .single();

  if (fetchError || !item) return { success: false, error: "Item not found" };

  const quantityBefore = item.quantity_on_hand;
  const quantityAfter = parsed.data.new_quantity;
  const quantityChange = quantityAfter - quantityBefore;
  const autoReorder = quantityAfter <= item.minimum_threshold ? { reorder_status: "needs_reorder" } : {};

  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({ quantity_on_hand: quantityAfter, ...autoReorder })
    .eq("id", parsed.data.item_id);

  if (updateError) return { success: false, error: updateError.message };

  const { error: txError } = await supabase
    .from("inventory_transactions")
    .insert({
      item_id: parsed.data.item_id,
      user_id: session.userId,
      transaction_type: "adjustment",
      quantity_change: quantityChange,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: "Manual adjustment",
      note: parsed.data.note,
    });

  if (txError) return { success: false, error: txError.message };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.item_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true, data: undefined };
}

export async function receiveStock(formData: unknown): Promise<ActionResult> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role === "viewer")
    return { success: false, error: "Insufficient permissions" };

  const parsed = stockTransactionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();

  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("quantity_on_hand")
    .eq("id", parsed.data.item_id)
    .single();

  if (fetchError || !item) return { success: false, error: "Item not found" };

  const quantityBefore = item.quantity_on_hand;
  const quantityAfter = quantityBefore + parsed.data.quantity;

  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({
      quantity_on_hand: quantityAfter,
      reorder_status: "received",
    })
    .eq("id", parsed.data.item_id);

  if (updateError) return { success: false, error: updateError.message };

  const { error: txError } = await supabase
    .from("inventory_transactions")
    .insert({
      item_id: parsed.data.item_id,
      user_id: session.userId,
      transaction_type: "received",
      quantity_change: parsed.data.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: "Received",
      note: parsed.data.note,
    });

  if (txError) return { success: false, error: txError.message };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.item_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/receiving");
  return { success: true, data: undefined };
}

export async function dispatchStock(formData: unknown): Promise<ActionResult> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role === "viewer")
    return { success: false, error: "Insufficient permissions" };

  const parsed = stockTransactionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();

  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("quantity_on_hand, minimum_threshold")
    .eq("id", parsed.data.item_id)
    .single();

  if (fetchError || !item) return { success: false, error: "Item not found" };

  const quantityBefore = item.quantity_on_hand;
  const quantityAfter = quantityBefore - parsed.data.quantity;

  if (quantityAfter < 0 && session.role !== "admin") {
    return {
      success: false,
      error: `Insufficient stock. Available: ${quantityBefore}`,
    };
  }

  const finalQty = Math.max(0, quantityAfter);
  const autoReorder = finalQty <= item.minimum_threshold ? { reorder_status: "needs_reorder" } : {};

  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({ quantity_on_hand: finalQty, ...autoReorder })
    .eq("id", parsed.data.item_id);

  if (updateError) return { success: false, error: updateError.message };

  const { error: txError } = await supabase
    .from("inventory_transactions")
    .insert({
      item_id: parsed.data.item_id,
      user_id: session.userId,
      transaction_type: "dispatch",
      quantity_change: -parsed.data.quantity,
      quantity_before: quantityBefore,
      quantity_after: finalQty,
      reason: "Dispatch",
      note: parsed.data.note,
    });

  if (txError) return { success: false, error: txError.message };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.item_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/dispatch");
  return { success: true, data: undefined };
}

export async function updateReorderStatus(
  itemId: string,
  status: "needs_reorder" | "ordered" | "received"
): Promise<ActionResult> {
  const session = await getSessionAndRole();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.role === "viewer")
    return { success: false, error: "Insufficient permissions" };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ reorder_status: status })
    .eq("id", itemId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/reorder");
  revalidatePath("/inventory");
  return { success: true, data: undefined };
}
