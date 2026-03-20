"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validations/suppliers";
import type { ActionResult, Supplier, UserRole } from "@/types";

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

  if (!profile || profile.role !== "admin") return { error: "Admin access required" };
  return { userId: user.id, role: profile.role as UserRole };
}

export async function createSupplier(
  formData: unknown
): Promise<ActionResult<Supplier>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const parsed = supplierSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  // Convert empty email string to null
  const data = {
    ...parsed.data,
    email: parsed.data.email || null,
  };

  const supabase = await createServiceClient();
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: "Supplier name already exists" };
    return { success: false, error: error.message };
  }

  revalidatePath("/suppliers");
  return { success: true, data: supplier as Supplier };
}

export async function updateSupplier(
  id: string,
  formData: unknown
): Promise<ActionResult<Supplier>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const parsed = supplierSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const data = {
    ...parsed.data,
    email: parsed.data.email || null,
  };

  const supabase = await createServiceClient();
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  return { success: true, data: supplier as Supplier };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/suppliers");
  return { success: true, data: undefined };
}
