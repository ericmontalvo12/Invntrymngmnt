"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { locationSchema } from "@/lib/validations/locations";
import type { ActionResult, Location } from "@/types";

async function requireAdmin() {
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
  return { userId: user.id };
}

export async function createLocation(
  formData: unknown
): Promise<ActionResult<Location>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const parsed = locationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("locations")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: "Location name already exists" };
    return { success: false, error: error.message };
  }

  revalidatePath("/locations");
  return { success: true, data: data as Location };
}

export async function updateLocation(
  id: string,
  formData: unknown
): Promise<ActionResult<Location>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const parsed = locationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("locations")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/locations");
  revalidatePath("/inventory");
  return { success: true, data: data as Location };
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("locations").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/locations");
  return { success: true, data: undefined };
}
