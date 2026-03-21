"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { workOrderSchema } from "@/lib/validations/work-orders";
import type { ActionResult, WorkOrder, UserRole } from "@/types";

async function requireAdminOrStaff(): Promise<
  { userId: string; role: UserRole } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer")
    return { error: "Staff access required" };
  return { userId: user.id, role: profile.role as UserRole };
}

async function requireAdmin(): Promise<
  { userId: string; role: UserRole } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin")
    return { error: "Admin access required" };
  return { userId: user.id, role: profile.role as UserRole };
}

export async function createWorkOrder(
  formData: unknown
): Promise<ActionResult<WorkOrder>> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const parsed = workOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation error",
    };
  }

  const supabase = await createServiceClient();

  // Generate WO number
  const { count } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true });

  const nextNum = (count ?? 0) + 1;
  const woNumber = `WO-${String(nextNum).padStart(5, "0")}`;

  const { items, ...headerData } = parsed.data;

  const { data: wo, error: woError } = await supabase
    .from("work_orders")
    .insert({
      ...headerData,
      building_id: headerData.building_id || null,
      inspection_type_id: headerData.inspection_type_id || null,
      assigned_to: headerData.assigned_to || null,
      inspection_date: headerData.inspection_date || null,
      due_date: headerData.due_date || null,
      extended_due_date: headerData.extended_due_date || null,
      wo_number: woNumber,
      status: "open",
      created_by: auth.userId,
    })
    .select()
    .single();

  if (woError) return { success: false, error: woError.message };

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("work_order_items")
      .insert(
        items.map((item) => ({
          work_order_id: wo.id,
          item_id: item.item_id || null,
          item_name: item.item_name,
          item_sku: item.item_sku,
          quantity_needed: item.quantity_needed,
          notes: item.notes || null,
        }))
      );

    if (itemsError) {
      await supabase.from("work_orders").delete().eq("id", wo.id);
      return { success: false, error: itemsError.message };
    }
  }

  revalidatePath("/work-orders");
  return { success: true, data: wo as WorkOrder };
}

export async function updateWorkOrder(
  id: string,
  formData: unknown
): Promise<ActionResult<WorkOrder>> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("work_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return { success: false, error: "Work order not found" };
  if (existing.status === "completed" || existing.status === "cancelled")
    return { success: false, error: "Cannot edit a completed or cancelled work order" };

  const parsed = workOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation error",
    };
  }

  const { items, ...headerData } = parsed.data;

  const { data: wo, error: woError } = await supabase
    .from("work_orders")
    .update({
      ...headerData,
      building_id: headerData.building_id || null,
      inspection_type_id: headerData.inspection_type_id || null,
      assigned_to: headerData.assigned_to || null,
      inspection_date: headerData.inspection_date || null,
      due_date: headerData.due_date || null,
      extended_due_date: headerData.extended_due_date || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (woError) return { success: false, error: woError.message };

  // Replace all line items
  await supabase.from("work_order_items").delete().eq("work_order_id", id);

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("work_order_items")
      .insert(
        items.map((item) => ({
          work_order_id: id,
          item_id: item.item_id || null,
          item_name: item.item_name,
          item_sku: item.item_sku,
          quantity_needed: item.quantity_needed,
          notes: item.notes || null,
        }))
      );

    if (itemsError) return { success: false, error: itemsError.message };
  }

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  return { success: true, data: wo as WorkOrder };
}

export async function startWorkOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: wo } = await supabase
    .from("work_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (!wo) return { success: false, error: "Work order not found" };
  if (wo.status !== "open")
    return { success: false, error: "Only open work orders can be started" };

  const { error } = await supabase
    .from("work_orders")
    .update({ status: "in_progress" })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  return { success: true, data: undefined };
}

export async function completeWorkOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdminOrStaff();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: wo } = await supabase
    .from("work_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (!wo) return { success: false, error: "Work order not found" };
  if (wo.status === "completed" || wo.status === "cancelled")
    return { success: false, error: "Work order is already closed" };

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: auth.userId,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  return { success: true, data: undefined };
}

export async function cancelWorkOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: wo } = await supabase
    .from("work_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (!wo) return { success: false, error: "Work order not found" };
  if (wo.status === "completed" || wo.status === "cancelled")
    return { success: false, error: "Cannot cancel this work order" };

  const { error } = await supabase
    .from("work_orders")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  return { success: true, data: undefined };
}

export async function deleteWorkOrder(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();

  const { data: wo } = await supabase
    .from("work_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (!wo) return { success: false, error: "Work order not found" };
  if (wo.status !== "open")
    return { success: false, error: "Only open work orders can be deleted" };

  const { error } = await supabase
    .from("work_orders")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/work-orders");
  return { success: true, data: undefined };
}
