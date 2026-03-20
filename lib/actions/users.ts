"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ActionResult, Profile, UserRole } from "@/types";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "staff", "viewer"]),
});

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

export async function updateUserRole(
  userId: string,
  formData: unknown
): Promise<ActionResult<Profile>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const parsed = updateRoleSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/users");
  return { success: true, data: data as Profile };
}

export async function updateUserProfile(
  userId: string,
  formData: { full_name: string }
): Promise<ActionResult<Profile>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: formData.full_name })
    .eq("id", userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/users");
  return { success: true, data: data as Profile };
}

export async function inviteUser(email: string, role: UserRole): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const supabase = await createServiceClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role },
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/users");
  return { success: true, data: undefined };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const supabase = await createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/users");
  return { success: true, data: undefined };
}
